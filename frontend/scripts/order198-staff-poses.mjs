#!/usr/bin/env node
// ORDER 198 — verifiera att renderingens pose-val läser sim:s task-
// pipeline, inte bara movedThisFrame.
//
// Metod: pollar `staffPosesRef.current` (RENDER-lagrets pose-val,
// samma data InteriorStaff skriver varje frame) för ölkrogen +
// kvarterskrogen. Snabbspolar prep + första gäst-cohorten vid
// speed=8, sänker till speed=1 och samplar 60 s realtid.
//
// **Pass-kriterium:** minst en frame av poseCarry per klass. poseCarry
// är beviset att mappningen `taskType ∈ CARRY_TASKS → poseCarry`
// faktiskt fyras vid t.ex. `clear`- eller `serve`-tasks.
//
// **poseGreet observeras men är inte pass-kriterium.** ORDER 198:s
// §1 utredning (kod-audit av service.ts:761-775 + tickGuests-flödet)
// visade att `findTaskTarget('greet')` för with-seats-businesses
// kräver `state='arriving' && moveProgress>=1`, och tickGuests
// transitionerar arriving→seated/waiting i **samma** sim-tick som
// moveProgress når 1 (service.ts:323-364). Det finns därför inget
// tillfälle mellan ticks där en with-seats-guest är arriving med
// moveProgress=1 — greet-tasken har inget mål och sätts aldrig.
// poseGreet är korrekt wired i InteriorStaff men fyras aldrig i
// ölkrogen/kvarterskrogen förrän en sim-order öppnar greetable-holdet.
// Se ORDER 198 §5 för deferral.
//
// Sim.staff.taskType är källan; pose-selektet i InteriorStaff läser
// via bridgeTeamToStaff — det är den slutliga slutsatsen skriptet
// bevisar. Rapporten skriver också det senaste snap:et per klass så
// VO kan läsa vad staff faktiskt gör vid inspelningstidpunkten.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order198');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const POLL_MS = 250;
// Realtidsvarraktighet vid speed=1 för själva pose-samplingen. Vid
// speed=8 tar en greet-task 100 ms realtid vilket är kortare än
// poll-intervallet (250 ms), och greet-fönstret hoppas då ofta över.
// Vid speed=1 tar samma task 800 ms → ~3 samples per greet-event.
const POLL_DURATION_MS = 60000;
// Realtidsvarraktighet vid speed=8 för att snabbspola prep + första
// gäst-cohorten. Slut på detta fönster: sim är i tidig service med
// gäster som anländer.
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

  await page.fill('input[type=text]', 'ORDER 198 ' + businessArg);
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

  // Snabbspola prep + första gäst-cohorten vid speed=8.
  await delay(WARMUP_MS);

  // Sänk till realtid för själva samplingen — greet-tasken (0,8 sim-sek)
  // hinner då spänna över flera poll-intervall.
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
          targetGuestId: p.targetGuestId,
          moving: p.moving,
          yaw: p.yaw
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

  // Aggregera.
  const totals = { poseWalk: 0, poseIdle: 0, poseGreet: 0, poseCarry: 0 };
  const perTask = {};
  const perStaff = new Map();
  for (const s of samples) {
    for (const m of s.staff) {
      totals[m.poseName] = (totals[m.poseName] ?? 0) + 1;
      const t = m.taskType ?? '(none)';
      perTask[t] = perTask[t] ?? { poseWalk: 0, poseIdle: 0, poseGreet: 0, poseCarry: 0 };
      perTask[t][m.poseName] = (perTask[t][m.poseName] ?? 0) + 1;
      const rec = perStaff.get(m.id) ?? { role: m.role, counts: { poseWalk: 0, poseIdle: 0, poseGreet: 0, poseCarry: 0 } };
      rec.role = rec.role ?? m.role;
      rec.counts[m.poseName] = (rec.counts[m.poseName] ?? 0) + 1;
      perStaff.set(m.id, rec);
    }
  }

  const greetFrames = totals.poseGreet;
  const carryFrames = totals.poseCarry;
  // Pass-kriterium: poseCarry > 0. poseGreet observeras men gate:as
  // inte (se header-kommentar §1 om sim-flödet).
  const pass = carryFrames > 0;

  return {
    business: businessArg,
    samples: samples.length,
    totals,
    perTask,
    perStaff: Object.fromEntries(perStaff.entries()),
    lastSnap: samples[samples.length - 1] ?? null,
    pass,
    passReason: `poseCarry=${carryFrames} (krav >0); poseGreet=${greetFrames} (endast observation, se header §1)`
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
    console.log(`  samples=${r.samples} totals=${JSON.stringify(r.totals)}`);
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'} — ${r.passReason}`);
    report.runs.push(r);
  }
} finally {
  await browser.close();
  await stopVite(vite.proc);
}

writeFileSync(
  resolve(REPORT_DIR, 'staff-poses-samples.json'),
  JSON.stringify(report, null, 2)
);
const allPass = report.runs.every((r) => r.pass);
console.log(`\nsammantaget: ${allPass ? 'PASS' : 'FAIL'}`);
console.log('rapport:', resolve(REPORT_DIR, 'staff-poses-samples.json'));
process.exit(allPass ? 0 : 1);
