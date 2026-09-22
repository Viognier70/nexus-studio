#!/usr/bin/env node
// ORDER 250 — mätning: hur rör sig personalen under service?
//
// Ren mätning. Kör 15-min middag seed=42 via Playwright + Vite, loggar
// per tick (5 Hz) och per anställd:
//   - position, targetPosition, taskType, targetGuestId, moveProgress
//   - Guest-array för uppslag av gäst-position vid tasks/anchor-fires
//
// Aggregerar sedan:
//   1. Andel tid i rörelse vs stillastående per staff.
//   2. Målbyten per minut, och antal target-byten mitt i pågående task
//      (staff bytte innan moveProgress = 1).
//   3. Uppehållstid vid gästens bord per greet/order/serve.
//   4. Vid varje anchor-fyra: avstånd staff↔gäst, och om staff kommit fram.
//   5. Facing: approximeras som vinkel mellan senaste rörelseriktning
//      och riktningen staff→guest_target. Ingen explicit `heading` finns
//      i state — figuren renderas ur rörelsevektorn.
//
// Ingen ändring av sim eller animation. Rådata skrivs bara när
// WRITE_REPORTS=1 (ORDER 240-mönstret).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO_ROOT = resolve(FRONTEND, '..');
const REPORT_DIR = resolve(REPO_ROOT, 'frontend/reports/order250');
if (process.env.WRITE_REPORTS === '1') mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const TICK_HZ = 5;
const DINNER_SEC = 15 * 60; // 900 sim-sekunder
const SAMPLE_HZ = 2; // varannan halvsekund → 4× per sim-sek vid TICK_HZ=5, alltså varje 3 tick
const CLOCK_STOP_MS = 240_000;

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
console.log(`Vite: ${vite.url}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const bust = Date.now();
await page.goto(
  `${vite.url}/?bust=${bust}#playtest=1&seed=42&start=dinner15&business=kvarterskrogen`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
  null, { timeout: 60000 }
);
await delay(1500);
try {
  await page.fill('input[type=text]', 'ORDER 250');
  await page.click('button[type=submit]');
  await delay(2000);
} catch {}

// Auto-svara anchor-frågor så pickern kan cyklera vidare (annars fastnar
// den vid första fyran). Vi mäter rörelse; frågorna är dock en signal
// vi vill fånga (svarsavstånd), inte blockerare för mätningen.
await page.exposeFunction('__order250Log', (msg) => console.log(`  ${msg}`));

// Speed 8× för att bränna igenom 900 sim-sek på ~113 real-sek.
await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }));

console.log('Väntar på simTime > 130 (första fyra)...');
const startSimTime = await page.evaluate(() => window.__nxSimState.simTime);
console.log(`  init simTime=${startSimTime.toFixed(1)}s`);

// Sampla per tick. Vi håller loopen tills simTime uppnått start+DINNER_SEC.
const samples = []; // { simTime, staff: [{...}, ...], guests: [{...}, ...], anchorFire?: {...} }
const anchorFires = [];
const seenFireIds = new Set();
const deadline = Date.now() + CLOCK_STOP_MS;
let lastSampleSimTime = -1;

while (Date.now() < deadline) {
  const snap = await page.evaluate(() => {
    const st = window.__nxSimState;
    if (!st) return null;
    const staff = st.staff.map((s) => ({
      id: s.id,
      role: s.role,
      taskType: s.taskType,
      targetGuestId: s.targetGuestId,
      workload: s.workload,
      position: { x: s.position.x, z: s.position.z },
      targetPosition: { x: s.targetPosition.x, z: s.targetPosition.z },
      moveProgress: s.moveProgress
    }));
    const guests = st.guests.map((g) => ({
      id: g.id,
      state: g.state,
      seatIndex: g.seatIndex,
      position: { x: g.position.x, z: g.position.z }
    }));
    const pq = st.scenario?.pendingQuestion;
    const phase = st.scenario?.phase;
    return {
      simTime: st.simTime,
      period: st.day?.period,
      pending: pq ? {
        id: pq.sourceBankId ?? null,
        anchorId: pq.anchorId ?? null,
        askerRole: pq.askerRole ?? null,
        phase
      } : null,
      staff,
      guests
    };
  });
  if (!snap) { await delay(50); continue; }

  // Sampla ~var 0.4 sim-sek (varannan tick vid 5 Hz).
  if (snap.simTime >= lastSampleSimTime + 0.4) {
    samples.push(snap);
    lastSampleSimTime = snap.simTime;
  }

  // Fånga anchor-fyra: pending changed to new id sedan senaste tick.
  if (snap.pending && snap.pending.id && !seenFireIds.has(snap.pending.id)) {
    seenFireIds.add(snap.pending.id);
    // Vem är gästen? Om askerRole = 'gäst': använd targetGuest på pickerns
    // aktuella anchor-info. Om askerRole = värd/servitör: staff-role
    // matchar askerRole. Vi hittar gästen som en staff med den rollen
    // eskorterar / har som target.
    const askerStaff = snap.staff.find((s) => s.role === (
      snap.pending.askerRole === 'gäst' ? null : snap.pending.askerRole
    ));
    const asker = askerStaff ?? snap.staff.find((s) => s.taskType === 'greet' || s.taskType === 'order');
    const guest = asker?.targetGuestId
      ? snap.guests.find((g) => g.id === asker.targetGuestId)
      : null;
    let dist = null, arrived = null;
    if (asker && guest) {
      const dx = asker.position.x - guest.position.x;
      const dz = asker.position.z - guest.position.z;
      dist = Math.hypot(dx, dz);
      const tdx = asker.position.x - asker.targetPosition.x;
      const tdz = asker.position.z - asker.targetPosition.z;
      arrived = Math.hypot(tdx, tdz) < 0.2;
    }
    anchorFires.push({
      simTime: snap.simTime,
      questionId: snap.pending.id,
      anchorId: snap.pending.anchorId,
      askerRole: snap.pending.askerRole,
      askerStaffId: asker?.id ?? null,
      askerTaskType: asker?.taskType ?? null,
      guestId: guest?.id ?? null,
      guestState: guest?.state ?? null,
      staffToGuestDist: dist,
      staffArrivedAtTarget: arrived
    });
    console.log(`  ✓ fire ${anchorFires.length}: t=${snap.simTime.toFixed(1)}s id=${snap.pending.id} dist=${dist?.toFixed(2) ?? 'na'}m arrived=${arrived}`);
    // Auto-svara + ACK så pickern kan cycla vidare.
    await page.evaluate(() => {
      const s = window.__nxSimState;
      const idx = s.scenario.pendingQuestion.options.findIndex((o) => o.correct);
      window.__nxSimDispatch({ type: 'ANSWER_QUESTION', index: idx >= 0 ? idx : 0 });
    });
    await delay(150);
    await page.evaluate(() => window.__nxSimDispatch({ type: 'ACK_QUESTION_EXPLANATION' }));
  }

  if (snap.simTime - startSimTime >= DINNER_SEC) {
    console.log(`  ✓ nådde 900s sim-tid (${snap.simTime.toFixed(1)}s), stoppar.`);
    break;
  }
  await delay(50);
}

console.log(`\nSamlat ${samples.length} sampels över ${(samples[samples.length-1].simTime - samples[0].simTime).toFixed(1)}s sim.`);

// ================= AGGREGERA =================

// Per-staff tidsserie.
const staffIds = [...new Set(samples.flatMap((s) => s.staff.map((x) => x.id)))];

function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

const perStaff = {};
for (const sid of staffIds) {
  const timeSeries = samples
    .map((s) => ({ simTime: s.simTime, staff: s.staff.find((x) => x.id === sid), guestsMap: new Map(s.guests.map((g) => [g.id, g])) }))
    .filter((r) => r.staff);

  // 1. Andel tid i rörelse vs stillastående.
  const movingSamples = timeSeries.filter((r) => distance(r.staff.position, r.staff.targetPosition) > 0.05);
  const stillSamples = timeSeries.filter((r) => distance(r.staff.position, r.staff.targetPosition) <= 0.05);
  const totalSamples = timeSeries.length;
  const role = timeSeries[0]?.staff?.role ?? '?';

  // 2. Målbyten per minut + andel byten mitt i pågående task.
  let targetChanges = 0;
  let taskChanges = 0;
  let taskChangesMidMove = 0;
  for (let i = 1; i < timeSeries.length; i++) {
    const prev = timeSeries[i-1].staff;
    const cur = timeSeries[i].staff;
    const targetSame = Math.abs(prev.targetPosition.x - cur.targetPosition.x) < 0.01 &&
                       Math.abs(prev.targetPosition.z - cur.targetPosition.z) < 0.01;
    if (!targetSame) targetChanges += 1;
    if (prev.taskType !== cur.taskType) {
      taskChanges += 1;
      // Om taskType byts medan förra positionen inte hade nått target → mid-move byte.
      const prevArrived = distance(prev.position, prev.targetPosition) < 0.2;
      if (!prevArrived) taskChangesMidMove += 1;
    }
  }
  const totalSimSec = (timeSeries[timeSeries.length-1]?.simTime ?? 0) - (timeSeries[0]?.simTime ?? 0);
  const totalMin = totalSimSec / 60;

  // 3. Dwell vid gäst per greet/order/serve.
  const dwells = { greet: [], order: [], serve: [] };
  let curDwell = null;
  for (const r of timeSeries) {
    const s = r.staff;
    const relevantTask = (s.taskType === 'greet' || s.taskType === 'order' || s.taskType === 'serve');
    const guest = s.targetGuestId ? r.guestsMap.get(s.targetGuestId) : null;
    const nearGuest = guest ? distance(s.position, guest.position) < 1.5 : false;
    if (relevantTask && nearGuest) {
      if (!curDwell || curDwell.task !== s.taskType || curDwell.guest !== s.targetGuestId) {
        if (curDwell) dwells[curDwell.task]?.push(r.simTime - curDwell.startAt);
        curDwell = { task: s.taskType, guest: s.targetGuestId, startAt: r.simTime };
      }
    } else {
      if (curDwell) {
        dwells[curDwell.task]?.push(r.simTime - curDwell.startAt);
        curDwell = null;
      }
    }
  }
  if (curDwell) dwells[curDwell.task]?.push(timeSeries[timeSeries.length-1].simTime - curDwell.startAt);

  perStaff[sid] = {
    role,
    totalSamples,
    totalSimSec: Math.round(totalSimSec * 10) / 10,
    movingPct: totalSamples > 0 ? Math.round(movingSamples.length / totalSamples * 1000) / 10 : 0,
    stillPct: totalSamples > 0 ? Math.round(stillSamples.length / totalSamples * 1000) / 10 : 0,
    targetChangesPerMin: totalMin > 0 ? Math.round(targetChanges / totalMin * 10) / 10 : 0,
    taskChanges,
    taskChangesMidMove,
    taskChangesMidMovePct: taskChanges > 0 ? Math.round(taskChangesMidMove / taskChanges * 1000) / 10 : 0,
    dwellGreet: dwellStats(dwells.greet),
    dwellOrder: dwellStats(dwells.order),
    dwellServe: dwellStats(dwells.serve)
  };
}

function dwellStats(arr) {
  if (arr.length === 0) return { count: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    count: arr.length,
    meanSec: Math.round(mean * 10) / 10,
    medianSec: Math.round(median * 10) / 10,
    minSec: Math.round(sorted[0] * 10) / 10,
    maxSec: Math.round(sorted[sorted.length-1] * 10) / 10
  };
}

// ================= UTSKRIFT =================
console.log('\n===== PER STAFF =====');
for (const [sid, m] of Object.entries(perStaff)) {
  console.log(`\n${m.role} (${sid}) — ${m.totalSimSec}s totalt`);
  console.log(`  moving: ${m.movingPct}%   still: ${m.stillPct}%`);
  console.log(`  targetChanges/min: ${m.targetChangesPerMin}`);
  console.log(`  taskChanges total: ${m.taskChanges}   mid-move: ${m.taskChangesMidMove} (${m.taskChangesMidMovePct}%)`);
  for (const key of ['greet', 'order', 'serve']) {
    const dw = m[`dwell${key[0].toUpperCase()+key.slice(1)}`];
    if (dw.count > 0) {
      console.log(`  dwell ${key}: n=${dw.count} mean=${dw.meanSec}s median=${dw.medianSec}s min=${dw.minSec}s max=${dw.maxSec}s`);
    }
  }
}
console.log('\n===== ANCHOR FIRES =====');
for (const f of anchorFires) {
  console.log(`  t=${f.simTime.toFixed(1)}s ${f.questionId} anchor=${f.anchorId} asker=${f.askerRole}(${f.askerStaffId}) task=${f.askerTaskType} dist=${f.staffToGuestDist?.toFixed(2) ?? 'na'}m arrived=${f.staffArrivedAtTarget}`);
}

// ================= WRITE (WRITE_REPORTS=1) =================
if (process.env.WRITE_REPORTS === '1') {
  writeFileSync(
    resolve(REPORT_DIR, 'raw-samples.json'),
    JSON.stringify(samples, null, 2)
  );
  writeFileSync(
    resolve(REPORT_DIR, 'summary.json'),
    JSON.stringify({ perStaff, anchorFires }, null, 2)
  );
  console.log(`\n📁 rådata: ${REPORT_DIR}/`);
} else {
  console.log(`\n(rådata inte skriven — kör med WRITE_REPORTS=1 för att spara)`);
}

await browser.close();
if (vite.proc) vite.proc.kill('SIGTERM');
