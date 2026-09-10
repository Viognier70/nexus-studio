#!/usr/bin/env node
// ORDER 196 — verifiera att personal aldrig lämnar byggnadens footprint.
//
// Metod: pollar `staffPositionsRef.current` (RENDER-lagrets XZ, samma
// data InteriorStaff skriver varje frame) under 60 s vaken sim och
// mäter `distFromCentre` mot `layout.centre` per staff-medlem, per
// tick. Passgräns: `layout.width / 2 * 1.02` (samma marginal som
// clampen använder). ORDER 128:s princip: mäta mot samma källa som
// renderingen — halfW-talet läses via `__nxLayoutBounds`, inte
// duplicerat i skriptet.
//
// Sim.staff.position är i LOKAL building-frame kring origin och kan
// INTE användas — den blandar inte in OBB-transformen.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order196');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const CLAMP_MARGIN = 1.02;
const POLL_MS = 500;
const POLL_DURATION_MS = 60000;

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function stopVite(proc) {
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res());
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(); }, 3000);
  });
}

async function measureClass(page, viteUrl, businessArg) {
  const bust = Date.now();
  await page.goto(
    `${viteUrl}/?bust=${bust}#playtest=1&business=${businessArg}&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  // Namn → Enter (kör NameEntryOverlay.onSubmit → jumpToPreset).
  await page.fill('input[type=text]', 'ORDER 196 ' + businessArg);
  await page.click('button[type=submit]');
  await delay(3000);

  // Öppna lunchservice + accelerera sim.
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });

  // Vänta ut monteringen av InteriorStaff så __nxLayoutBounds finns.
  await page.waitForFunction(
    () => window.__nxLayoutBounds && window.__nxStaffPositions,
    null, { timeout: 30000 }
  );

  const bounds = await page.evaluate(() => ({
    centre: window.__nxLayoutBounds.centre,
    width: window.__nxLayoutBounds.width,
    depth: window.__nxLayoutBounds.depth,
    entrance: window.__nxLayoutBounds.entrance
  }));
  const halfW = bounds.width / 2;
  const boundary = halfW * CLAMP_MARGIN;

  console.log(`  layout: centre=${JSON.stringify(bounds.centre)} width=${bounds.width.toFixed(2)}m halfW=${halfW.toFixed(2)}m boundary=${boundary.toFixed(2)}m`);

  // Polla staffPositionsRef under POLL_DURATION_MS realtid — matchar
  // ~5-8 sim-min vid speed=8. Räcker för att fånga hela greet/order/
  // paying/leaving-cykeln för åtminstone en gäst-kohort.
  const samples = [];
  const deadline = Date.now() + POLL_DURATION_MS;
  while (Date.now() < deadline) {
    const snap = await page.evaluate((c) => {
      const ref = window.__nxStaffPositions;
      if (!ref?.current) return null;
      const entries = [];
      for (const [id, p] of ref.current) {
        const d = Math.hypot(p.x - c.centre[0], p.z - c.centre[1]);
        entries.push({ id, role: p.role, x: p.x, z: p.z, distFromCentre: d });
      }
      return {
        simTime: window.__nxSimState?.simTime ?? null,
        staff: entries
      };
    }, bounds);
    if (snap) samples.push(snap);
    await delay(POLL_MS);
  }

  // Skärmdump för visuell dubbelkontroll.
  await page.screenshot({
    path: resolve(REPORT_DIR, `staff-inside-${businessArg}.png`),
    fullPage: false
  });

  // Analys per roll.
  const perRole = new Map();
  let violations = 0;
  let maxDist = 0;
  let maxViolation = null;
  for (const s of samples) {
    for (const m of s.staff) {
      if (m.distFromCentre > maxDist) maxDist = m.distFromCentre;
      const rec = perRole.get(m.role) ?? { max: 0, samples: 0, violations: 0 };
      rec.max = Math.max(rec.max, m.distFromCentre);
      rec.samples += 1;
      if (m.distFromCentre > boundary) {
        rec.violations += 1;
        violations += 1;
        if (!maxViolation || m.distFromCentre > maxViolation.distFromCentre) {
          maxViolation = { ...m, simTime: s.simTime };
        }
      }
      perRole.set(m.role, rec);
    }
  }

  return {
    business: businessArg,
    samples: samples.length,
    bounds,
    halfW,
    boundary,
    maxDistFromCentre: maxDist,
    marginOverBoundary: maxDist - boundary,
    violations,
    maxViolation,
    perRole: Object.fromEntries(perRole.entries()),
    pass: violations === 0
  };
}

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const report = { runs: [] };
try {
  for (const cls of ['olkrogen', 'kvarterskrogen']) {
    console.log(`\n== ${cls} ==`);
    const r = await measureClass(page, vite.url, cls);
    console.log(`  samples=${r.samples} maxDist=${r.maxDistFromCentre.toFixed(2)}m boundary=${r.boundary.toFixed(2)}m violations=${r.violations} → ${r.pass ? 'PASS' : 'FAIL'}`);
    report.runs.push(r);
  }
} finally {
  await browser.close();
  await stopVite(vite.proc);
}

writeFileSync(
  resolve(REPORT_DIR, 'staff-distance-samples.json'),
  JSON.stringify(report, null, 2)
);
const allPass = report.runs.every((r) => r.pass);
console.log(`\nsammantaget: ${allPass ? 'PASS' : 'FAIL'}`);
console.log('rapport:', resolve(REPORT_DIR, 'staff-distance-samples.json'));
process.exit(allPass ? 0 : 1);
