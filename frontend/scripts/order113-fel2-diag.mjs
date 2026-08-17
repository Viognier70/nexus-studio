#!/usr/bin/env node
// ORDER 113 fel 2 diagnostik — bevis i browsern att FoodtruckScene
// ritar gäster i ordering/paying/leaving/arriving, inte bara waitingIds.
//
// Metod: seedar 4 waiting-gäster (via foodtruckSeed=4), unpause:ar sim
// via SET_SPEED, låter staff-pipelinen dra gäster genom waiting→ordering
// →paying→leaving. Under körningen sampla DOM:s [data-figure]-noder och
// jämför mot state.guests-fördelningen. Om fel 2 fungerar: DOM-räknaren
// följer state.guests, inte bara sim.waitingIds.

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
const OUT_PATH = resolve(REPORT_DIR, 'fel2-diag.json');

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
    if (proc.exitCode !== null) throw new Error('vite exited early');
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
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // foodtruckSeed=4 seedar 4 waiting-gäster + sätter speed=0 (per
  // SimulationProvider:s applyDevFoodtruckSeed). Vi unpause:ar strax
  // efter så staff-pipelinen börjar dra gäster genom pipelinen.
  await page.goto(
    `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=4`,
    { waitUntil: 'load' }
  );
  await page.waitForFunction(
    () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function'
      && document.querySelector('[data-foodtruck-scene]') !== null,
    null, { timeout: 60000 }
  );

  await page.evaluate(() => {
    const w = /** @type any */ (window);
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('Fel2 Truck');
  });
  await delay(300);

  const dispatch = async (actions) => {
    await page.evaluate((acts) => {
      const w = /** @type any */ (window);
      for (const a of acts) w.__nxSimDispatch(a);
    }, actions);
    await delay(15);
  };

  const sample = async () => page.evaluate(() => {
    const w = /** @type any */ (window);
    const s = w.__nxSimState;
    const byState = {};
    for (const g of s.guests) byState[g.state] = (byState[g.state] ?? 0) + 1;
    const figures = document.querySelectorAll('[data-figure]');
    const figureIds = Array.from(figures).map((el) => el.getAttribute('data-figure'));
    return {
      simTime: +s.simTime.toFixed(1),
      waitingIds: [...s.waitingIds],
      guestsByState: byState,
      totalGuestsInSim: s.guests.length,
      figuresInDom: figures.length,
      figureIds,
      // Räkna figurer som INTE är personalen ('staff-hatch' är fast).
      guestFiguresInDom: figureIds.filter((id) => id !== 'staff-hatch').length
    };
  });

  const initial = await sample();
  console.log('=== 1) Initial (foodtruckSeed=4, speed=0) ===');
  console.log(JSON.stringify(initial, null, 2));

  // Öppna service + unpause:a
  await dispatch([
    { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
    { type: 'SET_SPEED', speed: 1 }
  ]);
  const afterOpen = await sample();
  console.log('\n=== 2) Efter OPEN_SERVICE + SET_SPEED 1 ===');
  console.log(JSON.stringify(afterOpen, null, 2));

  // Tickar framåt manuellt (vi har tagit över — ingen ticker på headless).
  // Sampla per 5 sim-sek. Vi förväntar oss se pipeline-gäster passera
  // genom waiting → ordering → paying → leaving.
  const snapshots = [];
  const tick = { type: 'TICK', dt: 0.2 };
  for (let i = 0; i < 30; i++) {
    await dispatch(new Array(25).fill(tick));  // 5 sim-sek per steg
    const snap = await sample();
    if (snap.waitingIds) delete snap.waitingIds;  // korta ned för sample-serien
    snapshots.push(snap);
  }

  // Aggregera: vilka states har vi sett i sim vs i DOM?
  const seenSimStates = new Set();
  const seenDomStates = new Set();
  const nonWaitingFigureIds = new Set();
  for (const s of snapshots) {
    for (const [state, count] of Object.entries(s.guestsByState)) {
      if (count > 0) seenSimStates.add(state);
    }
    // För DOM: räkna figurer som INTE var i waitingIds (approximation
    // för "figurer i andra states än waiting"). Vi lyfter ut det via
    // en direct-koll: om guest-figuren finns i DOM men INTE i simsen
    // waitingIds, ligger den i en annan state. Vi räknar helt enkelt
    // om guestFiguresInDom > waiting-count.
  }

  console.log('\n=== 3) Sample-serie (var 5:e sim-sek) ===');
  console.log('simT  wait ord pay lev arr dec  totSim  figDom  guestFig');
  for (const s of snapshots) {
    const by = s.guestsByState;
    console.log(
      `${String(s.simTime).padStart(4)}  ` +
      `${String(by.waiting ?? 0).padStart(4)} ` +
      `${String(by.ordering ?? 0).padStart(3)} ` +
      `${String(by.paying ?? 0).padStart(3)} ` +
      `${String(by.leaving ?? 0).padStart(3)} ` +
      `${String(by.arriving ?? 0).padStart(3)} ` +
      `${String(by.declined ?? 0).padStart(3)}  ` +
      `${String(s.totalGuestsInSim).padStart(6)}  ` +
      `${String(s.figuresInDom).padStart(6)}  ` +
      `${String(s.guestFiguresInDom).padStart(8)}`
    );
  }

  // Aggregera slut-stats
  const maxSimGuests = Math.max(...snapshots.map((s) => s.totalGuestsInSim));
  const maxDomGuestFig = Math.max(...snapshots.map((s) => s.guestFiguresInDom));
  const totalSimStates = new Set();
  const anyMismatch = [];
  for (const s of snapshots) {
    for (const [state, count] of Object.entries(s.guestsByState)) {
      if (count > 0 && state !== 'seated' && state !== 'dining' && state !== 'sleeping') {
        totalSimStates.add(state);
      }
    }
    // Sim-gäster minus (seated+dining+sleeping) = förväntad DOM-räkning
    const expectedDom =
      (s.guestsByState.waiting ?? 0) +
      (s.guestsByState.ordering ?? 0) +
      (s.guestsByState.paying ?? 0) +
      (s.guestsByState.leaving ?? 0) +
      (s.guestsByState.arriving ?? 0) +
      (s.guestsByState.declined ?? 0);
    if (s.guestFiguresInDom !== expectedDom) {
      anyMismatch.push({
        simTime: s.simTime,
        expectedDom,
        actualDom: s.guestFiguresInDom,
        byState: s.guestsByState
      });
    }
  }

  console.log('\n=== 4) VERDICT ===');
  console.log(`Max gäster i sim samtidigt: ${maxSimGuests}`);
  console.log(`Max guest-figurer i DOM samtidigt: ${maxDomGuestFig}`);
  console.log(`States observerade i sim (utom seated/dining/sleeping): ${[...totalSimStates].sort().join(', ')}`);
  if (anyMismatch.length === 0) {
    console.log(`✓ DOM följer sim exakt — inga mismatch mellan förväntad och faktisk figur-räkning.`);
  } else {
    console.log(`✗ ${anyMismatch.length} sample:er visar DOM ≠ sim:`);
    for (const m of anyMismatch.slice(0, 5)) {
      console.log(`  simT=${m.simTime}  expected=${m.expectedDom}  actual=${m.actualDom}  states=${JSON.stringify(m.byState)}`);
    }
  }

  const result = {
    order: 'ORDER 113 fel 2 diag',
    date: new Date().toISOString().slice(0, 10),
    initial,
    afterOpen,
    snapshots,
    maxSimGuests,
    maxDomGuestFig,
    seenStates: [...totalSimStates].sort(),
    mismatches: anyMismatch
  };
  writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + '\n');
  console.log('\nwrote', OUT_PATH);

  await browser.close();
} finally {
  await stopVite(proc);
}
