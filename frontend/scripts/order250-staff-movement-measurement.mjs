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
      stateTime: g.stateTime,
      arrivalTime: g.arrivalTime,
      satisfaction: g.satisfaction ?? null,
      position: { x: g.position.x, z: g.position.z }
    }));
    const pq = st.scenario?.pendingQuestion;
    const phase = st.scenario?.phase;
    return {
      simTime: st.simTime,
      period: st.day?.period,
      // ORDER 251 tillägg — genomsatta gäster + intäkt så före/efter kan
      // jämföras. `completedGuests` är kumulativ räknare per pass; cash
      // + eveningAccount.metrics.revenue läses vid pass-close.
      completedGuests: st.completedGuests ?? 0,
      cash: st.cash,
      // ORDER 253/254 tillägg — separera INTÄKT (revenue) från kassa-delta.
      // state.revenue är kumulativ intäkt (bara guest-payments); cash-delta
      // inkluderar även löner, ingredienser, agentur-avgifter, ränta osv.
      // Snapshots före service läses ur day.revenueAtServiceStart etc.
      revenue: st.revenue ?? 0,
      cost: st.cost ?? 0,
      revenueThisService: (st.revenue ?? 0) - (st.day?.revenueAtServiceStart ?? 0),
      costThisService: (st.cost ?? 0) - (st.day?.costAtServiceStart ?? 0),
      resultThisService: ((st.revenue ?? 0) - (st.day?.revenueAtServiceStart ?? 0)) - ((st.cost ?? 0) - (st.day?.costAtServiceStart ?? 0)),
      // ORDER 256 tillägg — reputation-breakdown (om instrumenteringen finns).
      reputationBreakdown: st.metrics?.reputationBreakdown ?? null,
      // ORDER 256 — ledger-rader dag 1 (dinner-passet). Filtrerar på day===1
      // för att undvika miss efter dygns-rollover. dayNumberFromInit=1 för
      // start=dinner15.
      ledgerDay: (st.ledger ?? []).filter((l) => l.day === 1).map((l) => ({
        category: l.category, amount: l.amount, cause: l.cause, at: l.at
      })),
      reputation: st.reputation ?? 0,
      reputationAtStart: st.day?.reputationAtServiceStart ?? null,
      // metrics per completed service — bara fylld post-service (eveningAccount).
      eveningMetrics: st.eveningAccount?.metrics ?? null,
      // ORDER 254 tillägg — event-räknare för att förklara reputationsdelta.
      // Ledger-raderna innehåller cause-fält. Vi räknar 'walkout'/'substitute'-
      // rader denna service.
      ledgerEventsThisService: (st.ledger ?? []).filter((l) => l.day === st.day?.dayNumber).length,
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

// ================= GUEST-THROUGHPUT + VÄNTETIDER =================
// ORDER 251 tillägg — jämförelse-tal för före/efter arrival guard.
const finalSnap = samples[samples.length-1];
// ORDER 258 — läs dev-only departure-log (från reputationEventDeparture).
// Fångar sat vid EXAKT paying→leaving-tidpunkten, inte sista state.guests-
// snapshot. Löser 72-vs-45-diskrepansen i ORDER 257-mätningen.
const departureLog = await page.evaluate(() =>
  (globalThis.__nxRepDepartureLog ?? []).map((e) => ({
    guestId: e.guestId, satisfaction: e.satisfaction, simTime: e.simTime
  }))
);
console.log(`\ndeparture-log: ${departureLog.length} events`);

// Räkna walkouts/declined/substituted i sista snapshot samt reputation-
// och satisfaction-fördelning.
const finalStates = finalSnap.guests.reduce((acc, g) => {
  acc[g.state] = (acc[g.state] ?? 0) + 1;
  return acc;
}, {});
const walkouts = (finalStates.declined ?? 0) + (finalStates.leaving ?? 0);
// satisfaction över alla gäster som varit med i minst en sampel — läs
// högsta seenade satisfaction per guest.id från alla sampels.
const satPerGuest = new Map();
for (const snap of samples) {
  for (const g of snap.guests) {
    if (g.satisfaction != null) {
      // spara sista uppmätta satisfaction per gäst
      satPerGuest.set(g.id, g.satisfaction);
    }
  }
}
const satValues = [...satPerGuest.values()];
const satMean = satValues.length > 0 ? satValues.reduce((a,b)=>a+b,0) / satValues.length : null;
const satSort = [...satValues].sort((a,b)=>a-b);
const satMedian = satSort.length > 0 ? satSort[Math.floor(satSort.length/2)] : null;
// ORDER 256 tillägg — satisfaction histogram i steg om 0.1.
// Bucket i räknas som [i×0.1, (i+1)×0.1). Bucket 10 = exakt 1.0.
const satHistogram = { '0.0-0.1': 0, '0.1-0.2': 0, '0.2-0.3': 0, '0.3-0.4': 0,
  '0.4-0.5': 0, '0.5-0.6': 0, '0.6-0.7': 0, '0.7-0.8': 0, '0.8-0.9': 0, '0.9-1.0': 0 };
const buckets = Object.keys(satHistogram);
for (const v of satValues) {
  const b = Math.min(9, Math.floor(v * 10));
  satHistogram[buckets[b]] += 1;
}
const satAbove075 = satValues.filter((v) => v >= 0.75).length;
const satBelow035 = satValues.filter((v) => v < 0.35).length;

// ORDER 258 — histogram från departure-log (sat vid REAL paying→leaving).
const depSatValues = departureLog.map((e) => e.satisfaction);
const depSatHistogram = { '0.0-0.1': 0, '0.1-0.2': 0, '0.2-0.3': 0, '0.3-0.4': 0,
  '0.4-0.5': 0, '0.5-0.6': 0, '0.6-0.7': 0, '0.7-0.8': 0, '0.8-0.9': 0, '0.9-1.0': 0 };
for (const v of depSatValues) {
  const b = Math.min(9, Math.floor(v * 10));
  depSatHistogram[buckets[b]] += 1;
}
// Rätta band-checks per ORDER 257 (0.65 / 0.85).
const depHappyCount = depSatValues.filter((v) => v >= 0.85).length;
const depMediocreCount = depSatValues.filter((v) => v >= 0.65 && v < 0.85).length;
const depUnhappyCount = depSatValues.filter((v) => v < 0.65).length;
const depSatMean = depSatValues.length > 0
  ? Math.round((depSatValues.reduce((a, b) => a + b, 0) / depSatValues.length) * 1000) / 1000
  : null;
const depSatMedian = depSatValues.length > 0
  ? (() => { const s = [...depSatValues].sort((a, b) => a - b); return Math.round(s[Math.floor(s.length / 2)] * 1000) / 1000; })()
  : null;

// ORDER 257 — clamp-check: hur ofta bottnade reputation vid 0 under passet?
// Räknar samples där reputation === 0 (eller ≤ 0.001 för float-marginal).
const clampFloorHits = samples.filter((s) => (s.reputation ?? 1) <= 0.001).length;
const reputationMin = samples.length > 0
  ? Math.min(...samples.map((s) => s.reputation ?? 1))
  : null;

// ORDER 256 — cost per kategori ur ledger. En 'revenue'-rad är intäkt
// (positiv för till kassan); övriga är kostnad. Grupperar per category.
const ledger = finalSnap.ledgerDay ?? [];
const perCategory = {};
for (const line of ledger) {
  const cat = line.category ?? 'unknown';
  if (!perCategory[cat]) perCategory[cat] = { count: 0, sumSek: 0 };
  perCategory[cat].count += 1;
  perCategory[cat].sumSek += line.amount;
}
// Runda till heltal.
for (const cat of Object.keys(perCategory)) {
  perCategory[cat].sumSek = Math.round(perCategory[cat].sumSek);
}

const guestThroughput = {
  completedGuests: finalSnap.completedGuests,
  totalArrived: finalSnap.guests.length,
  walkoutsDuringService: walkouts,
  finalStates,
  revenueThisService: finalSnap.revenueThisService,
  costThisService: finalSnap.costThisService,
  resultThisService: finalSnap.resultThisService,
  eveningMetrics: finalSnap.eveningMetrics,
  reputationStart: samples[0]?.reputation ?? null,
  reputationEnd: finalSnap.reputation,
  reputationDelta: (finalSnap.reputation ?? 0) - (samples[0]?.reputation ?? 0),
  satisfactionMean: satMean != null ? Math.round(satMean * 1000) / 1000 : null,
  satisfactionMedian: satMedian != null ? Math.round(satMedian * 1000) / 1000 : null,
  satisfactionN: satValues.length,
  // ORDER 256 tillägg — histogram + trösklar
  satisfactionHistogram: satHistogram,
  satisfactionAbove075: satAbove075,
  satisfactionBelow035: satBelow035,
  // Cost per kategori och reputation-breakdown
  costPerCategory: perCategory,
  reputationBreakdown: finalSnap.reputationBreakdown,
  clampFloorHits, // ORDER 257
  reputationMinObserved: reputationMin != null ? Math.round(reputationMin * 1000) / 1000 : null,
  // ORDER 258 — departure-log histogram
  departureLogN: departureLog.length,
  departureSatHistogram: depSatHistogram,
  departureSatMean: depSatMean,
  departureSatMedian: depSatMedian,
  departureHappyCount: depHappyCount,        // ≥ 0.85 (nya HAPPY_THRESHOLD)
  departureMediocreCount: depMediocreCount,  // 0.65-0.85 (neutral-band)
  departureUnhappyCount: depUnhappyCount     // < 0.65 (nya UNHAPPY_THRESHOLD)
};

// Väntetider: läs gästens första simTime i varje state ur samples,
// aggregera övergångar. En gäst kan förekomma i flera samples med olika
// state — samla första + sista i varje state.
const perGuestTimeline = new Map(); // guestId → { state → [firstSim, lastSim] }
for (const snap of samples) {
  for (const g of snap.guests) {
    if (!perGuestTimeline.has(g.id)) perGuestTimeline.set(g.id, {});
    const tl = perGuestTimeline.get(g.id);
    if (!tl[g.state]) tl[g.state] = { first: snap.simTime, last: snap.simTime };
    else tl[g.state].last = snap.simTime;
  }
}
// Väntetid arriving→seated: (seated.first − arriving.first), för gäster som nådde seated.
// Väntetid seated→ordering: (ordering.first − seated.first), för gäster som nådde ordering.
const waitDurations = { arrivingToSeated: [], seatedToOrdering: [], orderingToPaying: [] };
for (const [, tl] of perGuestTimeline) {
  if (tl.arriving && tl.seated) waitDurations.arrivingToSeated.push(tl.seated.first - tl.arriving.first);
  if (tl.seated && tl.ordering) waitDurations.seatedToOrdering.push(tl.ordering.first - tl.seated.first);
  if (tl.ordering && tl.paying) waitDurations.orderingToPaying.push(tl.paying.first - tl.ordering.first);
}
function statFmt(arr) {
  if (arr.length === 0) return { n: 0 };
  const s = [...arr].sort((a,b) => a-b);
  const mean = arr.reduce((a,b) => a+b, 0) / arr.length;
  return { n: arr.length, meanSec: Math.round(mean*10)/10, medianSec: Math.round(s[Math.floor(s.length/2)]*10)/10 };
}
const waitStats = {
  arrivingToSeated: statFmt(waitDurations.arrivingToSeated),
  seatedToOrdering: statFmt(waitDurations.seatedToOrdering),
  orderingToPaying: statFmt(waitDurations.orderingToPaying)
};

console.log('\n===== GUEST THROUGHPUT =====');
console.log(`  completedGuests: ${guestThroughput.completedGuests}`);
console.log(`  revenue this service: ${(guestThroughput.revenueThisService ?? 0).toFixed(0)} SEK`);
console.log(`  cost this service:    ${(guestThroughput.costThisService ?? 0).toFixed(0)} SEK`);
console.log(`  result this service:  ${(guestThroughput.resultThisService ?? 0).toFixed(0)} SEK`);
console.log(`  reputation: ${(guestThroughput.reputationStart ?? 0).toFixed(3)} → ${(guestThroughput.reputationEnd ?? 0).toFixed(3)} (Δ ${guestThroughput.reputationDelta.toFixed(3)})`);
console.log(`  satisfaction: mean=${guestThroughput.satisfactionMean ?? 'na'}  median=${guestThroughput.satisfactionMedian ?? 'na'}  (n=${guestThroughput.satisfactionN})`);
console.log(`  walkouts+declined during service: ${guestThroughput.walkoutsDuringService}`);
console.log(`  final states:`, guestThroughput.finalStates);
if (guestThroughput.eveningMetrics) {
  console.log(`  evening metrics: revenue=${guestThroughput.eveningMetrics.revenue.toFixed(0)} cost=${guestThroughput.eveningMetrics.cost.toFixed(0)} result=${guestThroughput.eveningMetrics.result.toFixed(0)} repΔ=${guestThroughput.eveningMetrics.reputationDelta.toFixed(3)}`);
}
console.log(`\n===== SATISFACTION HISTOGRAM =====`);
for (const [bucket, n] of Object.entries(guestThroughput.satisfactionHistogram)) {
  const bar = '█'.repeat(n);
  console.log(`  ${bucket}: ${String(n).padStart(3, ' ')} ${bar}`);
}
console.log(`  ≥ 0.75: ${guestThroughput.satisfactionAbove075}   < 0.35: ${guestThroughput.satisfactionBelow035}`);
console.log(`\n===== COST PER CATEGORY (dag=${finalSnap.simTime > 0 ? '?' : '?'} ur ledger) =====`);
for (const [cat, m] of Object.entries(guestThroughput.costPerCategory)) {
  console.log(`  ${cat.padEnd(12, ' ')}: n=${String(m.count).padStart(3, ' ')} sum=${String(m.sumSek).padStart(7, ' ')} SEK`);
}
console.log(`\n===== DEPARTURE-LOG HISTOGRAM (ORDER 258 — sat vid paying→leaving) =====`);
console.log(`  N=${guestThroughput.departureLogN}  mean=${guestThroughput.departureSatMean}  median=${guestThroughput.departureSatMedian}`);
for (const [bucket, n] of Object.entries(guestThroughput.departureSatHistogram)) {
  const bar = '█'.repeat(n);
  console.log(`  ${bucket}: ${String(n).padStart(3, ' ')} ${bar}`);
}
console.log(`  band-check (ORDER 257):  ≥ 0.85 happy: ${guestThroughput.departureHappyCount}   0.65-0.85 mediocre: ${guestThroughput.departureMediocreCount}   < 0.65 unhappy: ${guestThroughput.departureUnhappyCount}`);
console.log(`\n===== CLAMP-CHECK (ORDER 257) =====`);
console.log(`  reputation minObserved: ${guestThroughput.reputationMinObserved ?? 'na'}`);
console.log(`  clampFloorHits (rep ≤ 0.001): ${guestThroughput.clampFloorHits}`);
if (guestThroughput.reputationBreakdown) {
  console.log(`\n===== REPUTATION BREAKDOWN =====`);
  const rb = guestThroughput.reputationBreakdown;
  const sum = Object.values(rb).reduce((a,b)=>a+b, 0);
  for (const [ch, v] of Object.entries(rb)) {
    console.log(`  ${ch.padEnd(14, ' ')}: ${v >= 0 ? '+' : ''}${v.toFixed(3)}`);
  }
  console.log(`  ${'sum'.padEnd(14, ' ')}: ${sum >= 0 ? '+' : ''}${sum.toFixed(3)}`);
}
console.log(`\n===== VÄNTETIDER (sim-sek) =====`);
for (const [k, v] of Object.entries(waitStats)) {
  if (v.n > 0) console.log(`  ${k}: n=${v.n} mean=${v.meanSec}s median=${v.medianSec}s`);
}

// ================= WRITE (WRITE_REPORTS=1) =================
if (process.env.WRITE_REPORTS === '1') {
  writeFileSync(
    resolve(REPORT_DIR, 'raw-samples.json'),
    JSON.stringify(samples, null, 2)
  );
  writeFileSync(
    resolve(REPORT_DIR, 'summary.json'),
    JSON.stringify({ perStaff, anchorFires, guestThroughput, waitStats }, null, 2)
  );
  console.log(`\n📁 rådata: ${REPORT_DIR}/`);
} else {
  console.log(`\n(rådata inte skriven — kör med WRITE_REPORTS=1 för att spara)`);
}

await browser.close();
if (vite.proc) vite.proc.kill('SIGTERM');
