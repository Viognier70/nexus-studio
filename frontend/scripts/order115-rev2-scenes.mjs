#!/usr/bin/env node
// ORDER 115 rev 2 — skärmdumpar av serving-fas + auto-unlock av uteplats.
//
// Producerar tre bilder:
//   * reports/order115-rev2/serving.png — moment när en gäst är i
//     state='serving' vid counter, staff kör servePose, prop-överlämning
//     synlig i luften.
//   * reports/order115-rev2/truck-shape.png — vagn-silhuett (Citroën HY-
//     familjen) utan gäster, för att verifiera VO-referens.
//   * reports/order115-rev2/auto-unlock.png — foodtruck-scen där
//     hasUteplats är auto-satt (via metrics.happyDeparturesTotal=40).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order115-rev2');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

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
      const r = await fetch(url + '/');
      if (r.ok || r.status === 304) return { proc, url };
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

async function primeReady(page) {
  await page.waitForFunction(
    () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function'
      && document.querySelector('[data-foodtruck-scene]') !== null,
    null, { timeout: 60000 }
  );
  await page.evaluate(() => {
    const w = /** @type any */ (window);
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('115 rev 2');
  });
  await delay(200);
}

async function dispatchOne(page, action) {
  await page.evaluate((a) => (/** @type any */ (window)).__nxSimDispatch(a), action);
  await delay(10);
}

async function dispatchMany(page, actions) {
  await page.evaluate((acts) => {
    const w = /** @type any */ (window);
    for (const a of acts) w.__nxSimDispatch(a);
  }, actions);
  await delay(10);
}

async function hideOverlays(page) {
  await page.evaluate(() => {
    const scene = document.querySelector('[data-foodtruck-scene]');
    if (!scene) return;
    const keep = new Set();
    let node = scene;
    while (node) { keep.add(node); node = node.parentElement; }
    scene.querySelectorAll('*').forEach((el) => keep.add(el));
    document.querySelectorAll('body *').forEach((el) => {
      if (keep.has(el)) return;
      /** @type any */ (el).style.visibility = 'hidden';
    });
  });
  await delay(200);
}

const { proc, url } = await startVite();
try {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });

    // ── 1. truck-shape.png ─────────────────────────────────────────
    // Tom scen, ingen kö — bara vagn-silhuetten. Verifierar att den
    // läser som Citroën HY-familjen (cab + huv fram, rundad kaross bak).
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=0`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      // Ingen tick — bara statisk vagn.
      await hideOverlays(page);
      const out = resolve(REPORT_DIR, 'truck-shape.png');
      await page.screenshot({ path: out });
      console.log('wrote', out);
      await page.close();
    }

    // ── 2. serving.png ─────────────────────────────────────────────
    // Serving-fas är 2.5 sim-sek; svårt att pausa exakt vid rätt tick.
    // Strategi: seed:a med 6 gäster, kör 60 tick (12s), poll:a state
    // varje 2 tick tills någon guest är i 'serving' — där pausar vi.
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      await dispatchMany(page, [
        { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
        { type: 'SET_SPEED', speed: 1 }
      ]);
      // Tick 2 i taget tills serving observerat, upp till 300 tick.
      let found = false;
      for (let i = 0; i < 150 && !found; i++) {
        await dispatchMany(page, [
          { type: 'TICK', dt: 0.2 },
          { type: 'TICK', dt: 0.2 }
        ]);
        const anyServing = await page.evaluate(() => {
          const s = (/** @type any */ (window)).__nxSimState;
          return s.guests.some((g) => g.state === 'serving');
        });
        if (anyServing) found = true;
      }
      await dispatchOne(page, { type: 'SET_SPEED', speed: 0 });
      await delay(200);

      const inv = await page.evaluate(() => {
        const s = (/** @type any */ (window)).__nxSimState;
        const byState = {};
        for (const g of s.guests) byState[g.state] = (byState[g.state] ?? 0) + 1;
        return { found: s.guests.some((g) => g.state === 'serving'), byState };
      });
      console.log('serving-inventering:', JSON.stringify(inv));

      await hideOverlays(page);
      const out = resolve(REPORT_DIR, 'serving.png');
      await page.screenshot({ path: out });
      console.log('wrote', out);
      await page.close();
    }

    // (Auto-unlock verifieras i uteplatsUnlock.test.ts — kräver ingen
    // separat skärmdump. `#playtest=1&uteplats=1` visar samma scen
    // med hasUteplats=true, se order115-scenes.mjs uteplats.png.)
  } finally {
    await browser.close();
  }
} finally {
  await stopVite(proc);
}
