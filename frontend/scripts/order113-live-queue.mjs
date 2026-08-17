#!/usr/bin/env node
// ORDER 113 fel 1 — verifiera att foodtruckens kö faktiskt fylls och
// töms under ett riktigt service-pass.
//
// Startar vite dev, navigerar till `#playtest=1&business=foodtruck
// &dollhouse=1` (INGEN foodtruckSeed — vi vill se organisk arrival
// via reducer.ts:1836), dispatchar OPEN_SERVICE lunch, sedan pumpar
// TICK-actions med high-res sampling och skriver en tidsserie av
// (simTime, waitingIds.length, orderingCount, payingCount, totalGuests)
// till reports/order113/live-queue.json + console-tabell.
//
// Målet: bevisa att fel 1-fixen (findFreeSeat businessClass-guard +
// findTaskTarget FIFO) faktiskt landar gäster i waitingIds under
// service istället för att skicka dem via setGuestSeated-genvägen.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order113');
mkdirSync(REPORT_DIR, { recursive: true });
const OUT_PATH = resolve(REPORT_DIR, 'live-queue.json');

const VIEWPORT = { width: 1920, height: 1080 };

async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) {
      console.log('[vite] reusing existing dev server on 5173');
      return { proc: null, url };
    }
  } catch { /* not up */ }
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', (c) => process.stdout.write(`[vite] ${c}`));
  proc.stderr.on('data', (c) => process.stderr.write(`[vite:err] ${c}`));
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`vite exited early (${proc.exitCode})`);
    try {
      const res = await fetch(url + '/');
      if (res.ok || res.status === 304) return { proc, url };
    } catch { /* not up yet */ }
    await delay(500);
  }
  throw new Error('vite dev did not respond within 300s');
}

async function stopVite(proc) {
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res(undefined));
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(undefined); }, 3000);
  });
}

async function dispatchChunk(page, actions) {
  await page.evaluate((acts) => {
    const w = /** @type {any} */ (window);
    for (const a of acts) w.__nxSimDispatch(a);
  }, actions);
  await delay(10);
}

async function readState(page) {
  return page.evaluate(() => {
    const w = /** @type {any} */ (window);
    const s = w.__nxSimState;
    const guests = s.guests;
    const byState = {};
    for (const g of guests) {
      byState[g.state] = (byState[g.state] ?? 0) + 1;
    }
    return {
      simTime: s.simTime,
      waiting: s.waitingIds.length,
      seated: s.seatedIds.length,
      capacity: s.policies.capacity,
      businessClass: s.businessClass,
      period: s.day.period,
      totalGuests: guests.length,
      byState,
      awaitingScenarioChoice: s.scenario.awaitingChoice
    };
  });
}

const { proc, url } = await startVite();
try {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows'
    ]
  });
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.error('[page error]', e.message));

    // INGEN foodtruckSeed — vi vill mäta organisk kö-bildning.
    const target = `${url}/#playtest=1&business=foodtruck&dollhouse=1`;
    console.log('navigating to', target);
    await page.goto(target, { waitUntil: 'load' });

    await page.waitForFunction(
      () => {
        const w = /** @type {any} */ (window);
        return typeof w.__nxSimDispatch === 'function'
          && document.querySelector('[data-foodtruck-scene]') !== null;
      },
      null,
      { timeout: 60000 }
    );

    await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      if (typeof w.__nxSetBusinessName === 'function') {
        w.__nxSetBusinessName('Grythyttans Food Truck');
      }
    });
    await delay(200);

    const initState = await readState(page);
    console.log('initial state:', initState);

    // Boosta reputation + cash så arrival-rate är hög nog att bygga kö.
    // Utan detta ger arrivalProbability ~0.05/tick (spawn ~var 2:a sim-sek
    // vid morning-period med default reputation) — inte tillräckligt för
    // att stressa staff-pipelinen.
    await dispatchChunk(page, [
      { type: 'SET_CASH', valueSek: 240000 },
      { type: 'SET_CAPITAL', capital: 'social', value: 1.0 },
      { type: 'SET_CAPITAL', capital: 'ecological', value: 1.0 },
      { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 }
    ]);

    // Sample-loop: pumpa TICKs och läs state med ~1-sekunders sim-intervall.
    // 30 sim-min service = 1800 sim-sek. Vid dt=0.2 s per tick = 9000 ticks.
    // Sampla var 25:e tick = var 5:e sim-sek. Ger ~360 sampelpunkter.
    const SAMPLES = 200;
    const TICKS_PER_SAMPLE = 25;   // 5 sim-sek per sampel
    const tick = { type: 'TICK', dt: 0.2 };
    const series = [];
    let maxQueue = 0;
    let cumulativeArrivals = 0;
    let prevTotalGuests = initState.totalGuests;
    let scenarioAutoResolveCount = 0;

    for (let i = 0; i < SAMPLES; i++) {
      const batch = new Array(TICKS_PER_SAMPLE).fill(tick);
      await dispatchChunk(page, batch);
      const s = await readState(page);
      // Auto-resolve WALK_IN_OF_FIVE (choice A: seat as-is) om overlay
      // pausat regular arrivals. Utan detta stannar arrivals eftersom
      // awaitingChoice=true blockerar maybeSpawnGuest.
      if (s.awaitingScenarioChoice) {
        await dispatchChunk(page, [{ type: 'RESOLVE_SCENARIO', choice: 'A' }]);
        scenarioAutoResolveCount += 1;
      }
      const delta = s.totalGuests - prevTotalGuests;
      if (delta > 0) cumulativeArrivals += delta;
      prevTotalGuests = s.totalGuests;
      if (s.waiting > maxQueue) maxQueue = s.waiting;
      series.push({
        simTime: +s.simTime.toFixed(1),
        period: s.period,
        waiting: s.waiting,
        seated: s.seated,
        totalGuests: s.totalGuests,
        byState: s.byState
      });
      // Slutar tidigt om service avslutats
      if (s.period !== 'lunch' && s.period !== 'dinner') break;
    }

    // Sammanfatta
    const finalState = await readState(page);
    const waitingSamples = series.map((p) => p.waiting);
    const orderingSamples = series.map((p) => p.byState.ordering ?? 0);
    const payingSamples = series.map((p) => p.byState.paying ?? 0);
    const leavingSamples = series.map((p) => p.byState.leaving ?? 0);
    const maxOrdering = Math.max(0, ...orderingSamples);
    const maxPaying = Math.max(0, ...payingSamples);
    const maxLeaving = Math.max(0, ...leavingSamples);
    const meanWaiting = waitingSamples.reduce((s, v) => s + v, 0) / waitingSamples.length;

    console.log('\n=== SAMMANFATTNING ===');
    console.log(`Samples: ${series.length}, sim-tid: ${series[0].simTime}s → ${series[series.length - 1].simTime}s`);
    console.log(`Max waiting (kö): ${maxQueue} (capacity: ${finalState.capacity})`);
    console.log(`Max ordering:     ${maxOrdering}`);
    console.log(`Max paying:       ${maxPaying}`);
    console.log(`Max leaving:      ${maxLeaving}`);
    console.log(`Mean waiting:     ${meanWaiting.toFixed(2)}`);
    console.log(`Total arrivals:   ${cumulativeArrivals}`);
    console.log(`Auto-resolved scenarios (choice A): ${scenarioAutoResolveCount}`);

    // Kort tidsserie i konsol (var 10:e sampel)
    console.log('\n=== TIDSSERIE (var 10:e sampel = var 50:e sim-sek) ===');
    console.log('simT   period  wait  seat  order  pay  leave  total');
    for (let i = 0; i < series.length; i += 10) {
      const p = series[i];
      console.log(
        `${String(p.simTime).padStart(5)}  ${p.period.padEnd(7)} ` +
        `${String(p.waiting).padStart(4)}  ${String(p.seated).padStart(4)}  ` +
        `${String(p.byState.ordering ?? 0).padStart(5)}  ` +
        `${String(p.byState.paying ?? 0).padStart(3)}  ` +
        `${String(p.byState.leaving ?? 0).padStart(5)}  ` +
        `${String(p.totalGuests).padStart(5)}`
      );
    }

    const result = {
      order: 'ORDER 113 fel 1',
      date: new Date().toISOString().slice(0, 10),
      hypothesis: 'findFreeSeat businessClass-guard + findTaskTarget FIFO ska landa foodtruck-gäster i waitingIds istället för att shortcut:a till ordering',
      summary: {
        samples: series.length,
        simTimeStart: series[0].simTime,
        simTimeEnd: series[series.length - 1].simTime,
        maxWaiting: maxQueue,
        maxOrdering,
        maxPaying,
        maxLeaving,
        meanWaiting: +meanWaiting.toFixed(2),
        capacity: finalState.capacity,
        cumulativeArrivals,
        scenarioAutoResolveCount
      },
      series
    };
    writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + '\n');
    console.log('\nwrote', OUT_PATH);

    // Verdict
    console.log('\n=== VERDICT ===');
    if (maxQueue >= 2) {
      console.log(`✓ Kön fyller (max ${maxQueue}). Fel 1-fixen fungerar — waitingIds populeras under service.`);
    } else if (maxQueue === 1) {
      console.log(`△ Kön nådde bara ${maxQueue} — pipelinen är för snabb för att bygga upp, men kön ÄR aktiv.`);
    } else {
      console.log(`✗ Kön nådde aldrig över 0 (maxQueue=${maxQueue}). Fel 1-fixen har inte effekt eller ARRIVAL_BASE_PER_MINUTE är för låg.`);
    }
    if (maxOrdering >= 1 || maxPaying >= 1 || maxLeaving >= 1) {
      console.log(`✓ Pipelinen drar gäster genom (ordering ${maxOrdering}, paying ${maxPaying}, leaving ${maxLeaving}).`);
    } else {
      console.log(`✗ Ingen gäst nådde ordering/paying/leaving — pipelinen är blockerad.`);
    }
  } finally {
    await browser.close();
  }
} finally {
  await stopVite(proc);
}
