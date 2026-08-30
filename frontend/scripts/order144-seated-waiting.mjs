#!/usr/bin/env node
// ORDER 144 — mäter waiting/seated per tick under full lunchservice.
//
// Kör före OCH efter monteringen av kvarterskrogen. Om seated går
// från 0/16 (ORDER 124-observationen) till ett tal > 0 är hypotesen
// bekräftad: gäster tilldelades platser i "en annan byggnad"
// (Designs twoLayouts-flagga) och monteringen som normaliserar
// interiorLayout löste det.
//
// Argv[2] = label ('before' | 'after'). Sparar till
// frontend/reports/order144/seated-waiting-{label}.json.
//
// Kör:
//   node frontend/scripts/order144-seated-waiting.mjs before  # på main-state
//   ... gör mount ...
//   node frontend/scripts/order144-seated-waiting.mjs after   # efter

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order144');
mkdirSync(REPORT_DIR, { recursive: true });

const label = process.argv[2];
if (!label || !['before', 'after'].includes(label)) {
  console.error('usage: node order144-seated-waiting.mjs <before|after>');
  process.exit(1);
}

const TICKS = 20 * 60 * 5;   // 20 sim-minuter (full lunchservice) à 5 Hz = 6000 ticks
const BATCH = 25;            // ticks per page.evaluate — undviker per-tick IPC-overhead
const VIEWPORT = { width: 1920, height: 1080 };

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch('http://localhost:5173/');
      if (r.ok || r.status === 304) return proc;
    } catch { /* not up */ }
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });

try {
  // playtest=1 aktiverar dev-hookarna; business=kvarterskrogen är default
  // sedan ORDER 140, men vi sätter explicit.
  await page.goto(
    'http://localhost:5173/#playtest=1&business=kvarterskrogen',
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null,
    { timeout: 60000 }
  );
  await delay(1000);

  // Öppna lunchservice manuellt: OPEN_SERVICE-actionen kräver period=morning.
  // Full svit visar att default state startar i morning + businessClass=kvarterskrogen.
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
  });
  await delay(500);

  // Sätt speed=0 så vi kör TICK själva — deterministisk sample per tick.
  await page.evaluate(() => {
    window.__nxSimState.speed = 0;
  });
  await delay(200);

  const samples = [];
  const batches = Math.ceil(TICKS / BATCH);
  for (let b = 0; b < batches; b++) {
    await page.evaluate((n) => {
      for (let i = 0; i < n; i++) window.__nxSimDispatch({ type: 'TICK', dt: 0.2 });
    }, BATCH);
    const snap = await page.evaluate(() => {
      const s = window.__nxSimState;
      const guests = s.guests || [];
      const bs = {};
      for (const g of guests) bs[g.state] = (bs[g.state] || 0) + 1;
      return {
        simTime: Number(s.simTime ?? 0),
        period: s.day?.period ?? null,
        phase: s.day?.phase ?? null,
        guestsTotal: guests.length,
        seated: bs.seated || 0,
        waiting: bs.waiting || 0,
        arriving: bs.arriving || 0,
        ordering: bs.ordering || 0,
        dining: bs.dining || 0,
        paying: bs.paying || 0,
        leaving: bs.leaving || 0,
        seatedIdsCount: (s.seatedIds || []).length,
        waitingIdsCount: (s.waitingIds || []).length
      };
    });
    samples.push({ tick: (b + 1) * BATCH, ...snap });
  }

  // Sammanfattning
  const seatedAny = samples.filter((s) => s.seated > 0).length;
  const waitingAny = samples.filter((s) => s.waiting > 0).length;
  const maxSeated = Math.max(...samples.map((s) => s.seated));
  const maxWaiting = Math.max(...samples.map((s) => s.waiting));
  const totalArrivals = samples[samples.length - 1].guestsTotal;

  const report = {
    label,
    ticks: TICKS,
    tickDurationSec: 0.2,
    totalSimMinutes: (TICKS * 0.2) / 60,
    summary: {
      ticksWithSeatedGuests: seatedAny,
      ticksWithWaitingGuests: waitingAny,
      maxSeatedAnyTick: maxSeated,
      maxWaitingAnyTick: maxWaiting,
      totalGuestsAtEnd: totalArrivals
    },
    samples
  };
  writeFileSync(
    resolve(REPORT_DIR, `seated-waiting-${label}.json`),
    JSON.stringify(report, null, 2)
  );

  console.log(`\n=== ORDER 144 — seated/waiting ${label} ===`);
  console.log(`Ticks kördes:                 ${TICKS} (${((TICKS * 0.2) / 60).toFixed(1)} sim-min)`);
  console.log(`Ticks med seated > 0:         ${seatedAny}`);
  console.log(`Ticks med waiting > 0:        ${waitingAny}`);
  console.log(`Max seated någon tick:        ${maxSeated}/16`);
  console.log(`Max waiting någon tick:       ${maxWaiting}`);
  console.log(`Gäster totalt vid slut:       ${totalArrivals}`);
  console.log(`Rapport: ${resolve(REPORT_DIR, `seated-waiting-${label}.json`)}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
