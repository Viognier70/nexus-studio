#!/usr/bin/env node
// ORDER 220 — video-verify escort samma väg som gästen.
//
// VO 2026-09-14 (uppföljning ORDER 219 §5(b) → 220): "Escorten: värden
// ska gå SAMMA väg som gästen, inte parallellt bredvid. Två figurer på
// olika vägar ser sämre ut än ingen eskort alls."
//
// Fokus: KVARTERSKROGEN eftersom värd-pucken faktiskt renderas där
// (samma skäl som ORDER 219-scriptet — STATION_MAP.kvarterskrogen.värd=
// 'host' finns i geometrin; ölkrogen har 'taps' som är ANTAGANDE-taggat
// och saknar station-puck, egen order när Design bekräftar).
//
// Mätningarna som skrivs till JSON:
//   - escortSightings: antal poll-frames där värd hade taskType='greet'
//     OCH target-gäst var state='arriving' (dvs. escort-fönstret).
//   - escortDistances: distans mellan värd- och gäst-render-position i
//     escort-fönstret. Min/mean/max. Med trail-offseten (0.7 m i ORDER
//     220 §1) ska mean ligga i banden 0.6–1.5 m under stabil eskort
//     (varierar med approach-fas). Utan trail (pre-220) satte staff
//     target = guest position rakt av → distansen böljar mot 0 med
//     korta pauser vid guestens sista waypoint, men PATH-form (rakt
//     bakom vs. parallell diagonal) syns bara i videon.
//   - greetadeMax: max antal greetade gäster under fönstret (bevis att
//     greet fortfarande fyrar per ORDER 219 §B).
//
// Videofilen är bevisbäraren för "samma väg". Data ovan är sekundär.
//
// 40 s realtid @ speed=1 efter 20 s warmup.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, renameSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(tmpdir(), `nexus-order220-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const WARMUP_MS = 20000;
const RECORD_MS = 40000;

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

function stats(arr) {
  if (arr.length === 0) return { n: 0, min: null, mean: null, max: null };
  let min = Infinity, max = -Infinity, sum = 0;
  for (const x of arr) { if (x < min) min = x; if (x > max) max = x; sum += x; }
  return { n: arr.length, min, mean: sum / arr.length, max };
}

async function recordClass(browser, viteUrl, businessArg) {
  const classVideoDir = resolve(REPORT_DIR, businessArg);
  mkdirSync(classVideoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: classVideoDir, size: VIEWPORT }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

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

  await page.fill('input[type=text]', 'ORDER 220 ' + businessArg);
  await page.click('button[type=submit]');
  await delay(2500);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });

  await delay(WARMUP_MS);

  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
  console.log(`  [${businessArg}] speed=1, spelar in ${RECORD_MS / 1000} s...`);

  let escortSightings = 0;
  let greetSightings = 0;
  let maxGreetGuests = 0;
  const escortDistances = [];
  const pollDeadline = Date.now() + RECORD_MS;
  while (Date.now() < pollDeadline) {
    const s = await page.evaluate(() => {
      const st = window.__nxSimState;
      if (!st) return null;
      const värd = st.staff.find((m) => m.role === 'värd');
      const greetActive = värd?.taskType === 'greet';
      const target = greetActive && värd.targetGuestId
        ? st.guests.find((g) => g.id === värd.targetGuestId)
        : null;
      const arrivingEscort = target?.state === 'arriving';
      // Render-positioner läses via de globala refs InteriorGuests/Staff
      // publicerar. Om DEV-hookarna inte finns räknar vi bara sim-state.
      let dist = null;
      try {
        // __nxGuestPositions är Map<id, AnimatedPos {cx, cz}> (rå ref.current).
        // __nxStaffPositions är { current: Map<TeamMember.id, {x, z, role}> }
        // — nyckeln är TeamMember.id, INTE StaffMember.id (bridgen mellan
        // sim och render). Vi räknar därför via role='värd'-lookup i st f
        // id-map: iterera stafmappen och plocka första entry med rätt roll
        // (kvarterskrogen har en (1) värd, så entydigt).
        const gpr = window.__nxGuestPositions;
        const spr = window.__nxStaffPositions?.current;
        if (gpr && spr && värd && target) {
          const gp = gpr.get(target.id);
          let sp = null;
          for (const [, v] of spr) {
            if (v?.role === 'värd') { sp = v; break; }
          }
          if (gp && sp) dist = Math.hypot(gp.cx - sp.x, gp.cz - sp.z);
        }
      } catch {}
      return {
        greetActive,
        arrivingEscort,
        dist,
        greetedCount: st.guests.filter((g) => g.hasBeenGreeted).length
      };
    });
    if (s) {
      if (s.greetActive) greetSightings++;
      if (s.arrivingEscort) {
        escortSightings++;
        if (typeof s.dist === 'number') escortDistances.push(s.dist);
      }
      if (s.greetedCount > maxGreetGuests) maxGreetGuests = s.greetedCount;
    }
    await delay(200);
  }

  await page.close();
  await context.close();

  const files = readdirSync(classVideoDir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) return { business: businessArg, videoPath: null, ok: false };
  const src = resolve(classVideoDir, files[0]);
  const dst = resolve(REPORT_DIR, `${businessArg}.webm`);
  renameSync(src, dst);
  return {
    business: businessArg,
    videoPath: dst,
    greetSightings,
    escortSightings,
    escortDistance: stats(escortDistances),
    maxGreetGuests,
    ok: true
  };
}

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
console.log(`Rapport → ${REPORT_DIR}`);

const browser = await chromium.launch();
const results = [];
try {
  for (const cls of ['kvarterskrogen']) {
    console.log(`\n== ${cls} ==`);
    const r = await recordClass(browser, vite.url, cls);
    results.push(r);
    console.log(`  video: ${r.videoPath ?? '(ingen)'}`);
    console.log(`  greet-frames: ${r.greetSightings ?? '-'}`);
    console.log(`  escort-frames (greet + arriving): ${r.escortSightings ?? '-'}`);
    console.log(`  escort-dist n=${r.escortDistance?.n ?? 0} min=${r.escortDistance?.min?.toFixed(2) ?? '-'} mean=${r.escortDistance?.mean?.toFixed(2) ?? '-'} max=${r.escortDistance?.max?.toFixed(2) ?? '-'}`);
    console.log(`  greetade gäster (max): ${r.maxGreetGuests ?? '-'}`);
  }
} finally {
  await browser.close();
  await stopVite(vite.proc);
}

writeFileSync(
  resolve(REPORT_DIR, 'order220-verify.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n=== ORDER 220 escort — sammanfattning ===');
for (const r of results) {
  console.log(`  ${r.business.padEnd(20)} video=${r.videoPath ?? 'FAIL'} greet=${r.greetSightings} escort=${r.escortSightings} escort-dist-mean=${r.escortDistance?.mean?.toFixed(2) ?? '-'}m`);
}
console.log(`\nRapport-katalog: ${REPORT_DIR}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
