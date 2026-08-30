#!/usr/bin/env node
// ORDER 144 — skärmdump av full service med sexton kuvert.
//
// Injicerar 16 seated-gäster i sim-state (samma teknik som
// order121-body-visibility.mjs) och tar en skärmdump av strategisk
// scen med kvarterskrogens interiör synlig.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order144');
mkdirSync(REPORT_DIR, { recursive: true });

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
  // preset=business ger interiörsvyn (ORDER 121-mönstret).
  await page.goto(
    'http://localhost:5173/#playtest=1&business=kvarterskrogen&preset=business',
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null,
    { timeout: 60000 }
  );
  await delay(1500);

  // Pausa tickern och injicera 16 seated-gäster.
  await page.evaluate(() => {
    const w = window;
    w.__nxSimState.speed = 0;
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  });
  await delay(200);
  await page.evaluate((count) => {
    const w = window;
    const now = w.__nxSimState.simTime ?? 0;
    const fakeGuests = [];
    const fakeIds = [];
    for (let i = 0; i < count; i++) {
      const id = `order144-gst-${i + 1}`;
      fakeGuests.push({
        id,
        state: 'seated',
        satisfaction: 0.7,
        seatIndex: i,
        arrivalTime: now,
        stateTime: now,
        scenarioSource: false,
        position: { x: 0, z: 0 },
        targetPosition: { x: 0, z: 0 },
        moveProgress: 1,
        hadWelcomeDrink: true,
        lastCheckbackAt: null,
        walkAwayOnArrival: false,
        stayingOvernight: false
      });
      fakeIds.push(id);
    }
    w.__nxSimState.guests = [...(w.__nxSimState.guests ?? []), ...fakeGuests];
    w.__nxSimState.seatedIds = [...(w.__nxSimState.seatedIds ?? []), ...fakeIds];
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  }, 16);
  await delay(1500);

  const out = resolve(REPORT_DIR, 'kvarterskrogen-16-kuvert.png');
  await page.screenshot({ path: out, fullPage: false });
  console.log('saved', out);
  const seatedNow = await page.evaluate(() => (window.__nxSimState.guests || []).filter((g) => g.state === 'seated').length);
  console.log(`seated i state: ${seatedNow}/16`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
