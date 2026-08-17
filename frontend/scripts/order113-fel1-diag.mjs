#!/usr/bin/env node
// ORDER 113 fel 1 diagnos — samla ALLT som händer i browsern under en
// riktig session. Rapportera:
//   1. Alla console errors/warnings (spegelvänd de "12 fel" användaren
//      ser i devtools).
//   2. Är fel 1-koden verkligen laddad? (fetch vite:s modul och grep
//      för businessHasSeats-guarden i findFreeSeat).
//   3. State-snapshot över tid: waitingIds, awaitingChoice, orderingCount,
//      layoutSeats vs capacity, samt vilka gäster som finns i vilken state.
//   4. Log-hooks i browsern — patcha findFreeSeat och friends? Nej,
//      det kan vi inte utan att ändra sim. Istället övervakar vi state
//      efter varje TICK.

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
const OUT_PATH = resolve(REPORT_DIR, 'fel1-diag.json');

async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) return { proc: null, url };
  } catch { /* not up */ }
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND_ROOT, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`vite exited early`);
    try {
      const res = await fetch(url + '/');
      if (res.ok || res.status === 304) return { proc, url };
    } catch { /* not up yet */ }
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function stopVite(proc) {
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res(undefined));
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(undefined); }, 3000);
  });
}

const { proc, url } = await startVite();
try {
  // 1) Verifiera att fel 1-koden är kompilerad in i vad vite serverar
  const serviceSrc = await (await fetch(`${url}/src/strategic/simulation/service.ts`)).text();
  const hasGuard = /if\s*\(\s*!businessHasSeats\s*\(\s*state\.businessClass\s*\)\s*\)\s*return\s+null/.test(serviceSrc);
  const hasFifoGate = /waitingIds\[0\]/.test(serviceSrc);
  console.log('=== 1) Fel 1 källkod i vite dev ===');
  console.log('service.ts har businessHasSeats-guard i findFreeSeat:', hasGuard);
  console.log('service.ts har FIFO-gate (waitingIds[0]) i findTaskTarget:', hasFifoGate);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // 2) Samla ALLA console-events
  const consoleEvents = [];
  page.on('console', (msg) => {
    consoleEvents.push({
      type: msg.type(),
      text: msg.text().slice(0, 500),
      location: msg.location()
    });
  });
  page.on('pageerror', (err) => {
    consoleEvents.push({
      type: 'pageerror',
      text: err.message.slice(0, 500),
      stack: (err.stack ?? '').slice(0, 600)
    });
  });
  page.on('requestfailed', (req) => {
    consoleEvents.push({
      type: 'requestfailed',
      text: `${req.method()} ${req.url()} — ${req.failure()?.errorText}`
    });
  });

  await page.goto(`${url}/#playtest=1&business=foodtruck&dollhouse=1`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function',
    null, { timeout: 60000 }
  );

  // Sätt namn så NameEntryOverlay försvinner
  await page.evaluate(() => {
    const w = /** @type any */ (window);
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('Diag Truck');
  });
  await delay(500);

  // 3) Snapshot av init-state
  const dispatch = async (actions) => {
    await page.evaluate((acts) => {
      const w = /** @type any */ (window);
      for (const a of acts) w.__nxSimDispatch(a);
    }, actions);
    await delay(15);
  };
  const readState = async () => page.evaluate(() => {
    const w = /** @type any */ (window);
    const s = w.__nxSimState;
    const guests = s.guests;
    const byState = {};
    for (const g of guests) byState[g.state] = (byState[g.state] ?? 0) + 1;
    return {
      simTime: +s.simTime.toFixed(1),
      businessClass: s.businessClass,
      capacity: s.policies.capacity,
      period: s.day.period,
      waiting: s.waitingIds.length,
      seated: s.seatedIds.length,
      totalGuests: guests.length,
      byState,
      awaitingScenarioChoice: s.scenario.awaitingChoice,
      scenarioId: s.scenario.scenarioId,
      scenarioPhase: s.scenario.phase,
      doorsOpened: s.day.doorsOpenedThisService,
      waitingAtOpening: s.day.waitingAtOpening,
      openingEndsAt: s.day.openingEndsAt,
      staff: s.staff.map((st) => ({
        id: st.id, role: st.role, taskType: st.taskType, targetGuestId: st.targetGuestId
      }))
    };
  });

  const initial = await readState();
  console.log('\n=== 2) Init state ===');
  console.log(JSON.stringify(initial, null, 2));

  // 4) Öppna lunch, boosta reputation, tick fram och sampla tätt
  console.log('\n=== 3) Dispatching OPEN_SERVICE + boostar ===');
  await dispatch([
    { type: 'SET_CASH', valueSek: 240000 },
    { type: 'SET_CAPITAL', capital: 'social', value: 1.0 },
    { type: 'SET_CAPITAL', capital: 'ecological', value: 1.0 },
    { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 }
  ]);
  const afterOpen = await readState();
  console.log('efter OPEN_SERVICE:', JSON.stringify(afterOpen, null, 2));

  // 5) Kör 200 sim-sek med tät sampling (var 5:e sim-sek).
  // Auto-resolve scenarios med choice A så vi inte fastnar.
  console.log('\n=== 4) Tick-loop 200 sim-sek, sampla var 5:e sim-sek ===');
  const snapshots = [];
  const tick = { type: 'TICK', dt: 0.2 };
  let scenarioAutoResolveLog = [];
  for (let i = 0; i < 40; i++) {  // 40 * 25 * 0.2 = 200 sim-sek
    await dispatch(new Array(25).fill(tick));
    const s = await readState();
    if (s.awaitingScenarioChoice) {
      scenarioAutoResolveLog.push({
        atSimTime: s.simTime,
        scenarioId: s.scenarioId,
        beforeResolve: s
      });
      await dispatch([{ type: 'RESOLVE_SCENARIO', choice: 'A' }]);
    }
    snapshots.push(s);
  }

  const maxWaiting = Math.max(0, ...snapshots.map((s) => s.waiting));
  const maxOrdering = Math.max(0, ...snapshots.map((s) => s.byState.ordering ?? 0));
  const maxWithGuests = snapshots.filter((s) => s.totalGuests > 0).length;
  const summary = {
    simTimeStart: snapshots[0]?.simTime,
    simTimeEnd: snapshots[snapshots.length - 1]?.simTime,
    samples: snapshots.length,
    samplesWithGuestsPresent: maxWithGuests,
    maxWaiting,
    maxOrdering,
    scenariosAutoResolved: scenarioAutoResolveLog.length,
    finalWaiting: snapshots[snapshots.length - 1]?.waiting,
    finalTotalGuests: snapshots[snapshots.length - 1]?.totalGuests
  };
  console.log('\nsammanfattning:', JSON.stringify(summary, null, 2));

  console.log('\n=== 5) Scenario auto-resolves ===');
  console.log(`Antal auto-resolves: ${scenarioAutoResolveLog.length}`);
  for (const ev of scenarioAutoResolveLog.slice(0, 5)) {
    console.log(`  simTime=${ev.atSimTime}, scenarioId=${ev.scenarioId}, waiting=${ev.beforeResolve.waiting}`);
  }

  console.log('\n=== 6) Sista 10 samplen ===');
  for (const s of snapshots.slice(-10)) {
    const st = Object.entries(s.byState).map(([k, v]) => `${k}=${v}`).join(' ');
    console.log(
      `  simT=${String(s.simTime).padStart(5)}  wait=${s.waiting} seat=${s.seated}  ` +
      `awaitingChoice=${s.awaitingScenarioChoice}  states={${st}}`
    );
  }

  console.log(`\n=== 7) Console-events: ${consoleEvents.length} totalt ===`);
  const byType = {};
  for (const e of consoleEvents) byType[e.type] = (byType[e.type] ?? 0) + 1;
  console.log('per typ:', JSON.stringify(byType));
  const errorsAndWarnings = consoleEvents.filter((e) =>
    e.type === 'error' || e.type === 'warning' || e.type === 'pageerror' || e.type === 'requestfailed'
  );
  console.log(`errors + warnings + pageerrors + requestfailed: ${errorsAndWarnings.length}`);
  for (const [i, e] of errorsAndWarnings.entries()) {
    console.log(`\n[${i + 1}/${errorsAndWarnings.length}] ${e.type}`);
    console.log('  text:', e.text);
    if (e.stack) console.log('  stack:', e.stack.split('\n').slice(0, 3).join(' | '));
    if (e.location) console.log('  location:', `${e.location.url}:${e.location.lineNumber}`);
  }

  const out = {
    order: 'ORDER 113 fel 1 diag',
    date: new Date().toISOString().slice(0, 10),
    codeInDevServer: { hasGuard, hasFifoGate },
    initial,
    afterOpen,
    summary,
    scenarioAutoResolves: scenarioAutoResolveLog,
    lastTenSnapshots: snapshots.slice(-10),
    allSnapshots: snapshots,
    consoleEvents,
    errorsAndWarnings
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log('\nwrote', OUT_PATH);

  await browser.close();
} finally {
  await stopVite(proc);
}
