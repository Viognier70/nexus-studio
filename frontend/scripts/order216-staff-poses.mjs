#!/usr/bin/env node
// ORDER 216 (C3) — verifiera att renderingens pose-val läser sim:s
// WORK_TASKS-mappning och faktiskt spelar poseWork när en staff står
// stilla i order/flambe/misEnPlace/dish/restock/clean.
//
// Metod: samma pattern som order198-staff-poses.mjs — pollar
// `staffPosesRef.current` under en lunchservice, aggregerar per pose-
// namn. Skillnad: PASS-gate är `poseWork > 0` för klasser med bg-tasks
// (kvarterskrogen/ölkrogen — misEnPlace/dish/restock/clean fyras när
// staff är vid station).
//
// **Pass-kriterium:** poseWork > 0 för både kvarterskrogen och ölkrogen.
// Bevisar att `WORK_TASKS` (order/flambe/misEnPlace/dish/restock/clean)
// mappas till poseWork av InteriorStaff:s ladder (rad 736-744).
//
// Foodtruck testas INTE — dess `BACKGROUND_TASKS_BY_BUSINESS`-lista är
// tom (per ORDER 137 §2.3), så inga bg-tasks fyras och staff hamnar
// aldrig i work-task-poseWork. Menyer flambe/order kan förekomma vid
// full service men de kräver gäster som beställer specifikt — inte
// garanterat inom skriptets tidsfönster.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
// ORDER 195 — script-utdata till os.tmpdir, inte reports/.
const REPORT_DIR = resolve(tmpdir(), `nexus-order216-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const POLL_MS = 250;
const POLL_DURATION_MS = 45000;
const WARMUP_MS = 25000;

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

  await page.fill('input[type=text]', 'ORDER 216 ' + businessArg);
  await page.click('button[type=submit]');
  await delay(3000);

  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });

  await page.waitForFunction(
    () => window.__nxStaffPoses !== undefined,
    null, { timeout: 30000 }
  );

  await delay(WARMUP_MS);

  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
  await delay(500);

  const samples = [];
  const deadline = Date.now() + POLL_DURATION_MS;
  while (Date.now() < deadline) {
    const snap = await page.evaluate(() => {
      const poseRef = window.__nxStaffPoses;
      const posRef = window.__nxStaffPositions;
      if (!poseRef?.current || !posRef?.current) return null;
      const entries = [];
      for (const [id, p] of poseRef.current) {
        const posEntry = posRef.current.get(id) ?? null;
        entries.push({
          id,
          role: posEntry?.role ?? null,
          poseName: p.poseName,
          taskType: p.taskType,
          moving: p.moving
        });
      }
      return {
        simTime: window.__nxSimState?.simTime ?? null,
        staff: entries
      };
    });
    if (snap) samples.push(snap);
    await delay(POLL_MS);
  }

  await page.screenshot({
    path: resolve(REPORT_DIR, `staff-poses-${businessArg}.png`),
    fullPage: false
  });

  const totals = { poseWalk: 0, poseIdle: 0, poseGreet: 0, poseCarry: 0, poseWork: 0 };
  const perTask = {};
  const perStaff = new Map();
  for (const s of samples) {
    for (const m of s.staff) {
      totals[m.poseName] = (totals[m.poseName] ?? 0) + 1;
      const t = m.taskType ?? '(none)';
      perTask[t] = perTask[t] ?? { poseWalk: 0, poseIdle: 0, poseGreet: 0, poseCarry: 0, poseWork: 0 };
      perTask[t][m.poseName] = (perTask[t][m.poseName] ?? 0) + 1;
      const rec = perStaff.get(m.id) ?? { role: m.role, counts: { poseWalk: 0, poseIdle: 0, poseGreet: 0, poseCarry: 0, poseWork: 0 } };
      rec.role = rec.role ?? m.role;
      rec.counts[m.poseName] = (rec.counts[m.poseName] ?? 0) + 1;
      perStaff.set(m.id, rec);
    }
  }

  const workFrames = totals.poseWork;
  const pass = workFrames > 0;

  return {
    business: businessArg,
    samples: samples.length,
    totals,
    perTask,
    perStaff: Object.fromEntries(perStaff.entries()),
    lastSnap: samples[samples.length - 1] ?? null,
    pass,
    passReason: `poseWork=${workFrames} frames (krav >0)`
  };
}

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
console.log(`Rapport → ${REPORT_DIR}`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const report = { runs: [] };
try {
  for (const cls of ['olkrogen', 'kvarterskrogen']) {
    console.log(`\n== ${cls} ==`);
    const r = await measureClass(page, vite.url, cls);
    console.log(`  samples=${r.samples} totals=${JSON.stringify(r.totals)}`);
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'} — ${r.passReason}`);
    report.runs.push(r);
  }
} finally {
  await browser.close();
  await stopVite(vite.proc);
}

writeFileSync(
  resolve(REPORT_DIR, 'order216-report.json'),
  JSON.stringify(report, null, 2)
);

const allPass = report.runs.every((r) => r.pass);
console.log(`\n${allPass ? 'ALL PASS' : 'FAIL'} — ${REPORT_DIR}/order216-report.json`);
process.exit(allPass ? 0 : 1);
