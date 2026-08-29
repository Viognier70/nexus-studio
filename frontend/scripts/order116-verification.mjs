#!/usr/bin/env node
// ORDER 116 — slutverifiering av food truck-skepnaden.
//
// Producerar fyra bilder (DoD 1-4):
//   1. reports/order116/handoff.png    — prop mellan personal och gäst i serving-fas
//   2. reports/order116/leaving.png    — gäst på väg ut ur bild med carrying
//   3. reports/order116/queue.png      — kön på rad ute på gatan, avstånd synligt
//   4. reports/order116/uteplats.png   — gäster ätande vid uteplats (från §3.3)
//
// Alla screenshots hålls vid ett specifikt sim-tillstånd genom att
// tick:a tills ett givet predikat är sant, sedan sätta speed=0.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order116');
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
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('116');
  });
  await delay(150);
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

// Kör tick tills predikat evalueras true; returnera hur många tick.
// Utan träff (efter maxTicks): returnera −1.
async function tickUntil(page, predicateFn, maxTicks = 400) {
  for (let i = 0; i < maxTicks; i++) {
    await dispatchOne(page, { type: 'TICK', dt: 0.2 });
    const hit = await page.evaluate(predicateFn);
    if (hit) return i + 1;
  }
  return -1;
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
  await delay(150);
}

async function stateSummary(page) {
  return page.evaluate(() => {
    const s = (/** @type any */ (window)).__nxSimState;
    const by = {};
    for (const g of s.guests) by[g.state] = (by[g.state] ?? 0) + 1;
    return {
      byState: by,
      hasUteplats: s.policies.hasUteplats,
      happyTotal: s.metrics.happyDeparturesTotal,
      simTime: s.simTime
    };
  });
}

const { proc, url } = await startVite();
try {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });

    // ── 1. handoff.png — pausa vid serving-fas ─────────────────────
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      await dispatchMany(page, [
        { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
        { type: 'SET_SPEED', speed: 0 }
      ]);
      const ticksTo = await tickUntil(page, () => {
        const s = (/** @type any */ (window)).__nxSimState;
        return s.guests.some((g) => g.state === 'serving');
      });
      const sum = await stateSummary(page);
      console.log('1. handoff', ticksTo, JSON.stringify(sum));
      await hideOverlays(page);
      await page.screenshot({ path: resolve(REPORT_DIR, 'handoff.png') });
      await page.close();
    }

    // ── 2. leaving.png — pausa när första gäst är i leaving ───────
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      await dispatchMany(page, [
        { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
        { type: 'SET_SPEED', speed: 0 }
      ]);
      const ticksTo = await tickUntil(page, () => {
        const s = (/** @type any */ (window)).__nxSimState;
        return s.guests.some((g) => g.state === 'leaving' && g.carrying);
      }, 800);
      const sum = await stateSummary(page);
      console.log('2. leaving', ticksTo, JSON.stringify(sum));
      await hideOverlays(page);
      await page.screenshot({ path: resolve(REPORT_DIR, 'leaving.png') });
      await page.close();
    }

    // ── 3. queue.png — pausa när det finns ≥3 waiting-figurer ─────
    // Om sim aldrig når 3 waiting samtidigt (staff-pipelinen snabb):
    // fallback = så många waiting som fanns när servingen inleds.
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      // Freeze på tick 0 så alla 6 seed:ade waiting-gästerna syns
      // innan pipelinen börjar tömma kön.
      await dispatchOne(page, { type: 'SET_SPEED', speed: 0 });
      // Ingen OPEN_SERVICE-dispatch → sim.day.period === 'morning',
      // ingen arrival-spawn, seed:ade waiting-gästerna står kvar.
      const sum = await stateSummary(page);
      console.log('3. queue', 0, JSON.stringify(sum));
      await hideOverlays(page);
      await page.screenshot({ path: resolve(REPORT_DIR, 'queue.png') });
      await page.close();
    }

    // ── 4. uteplats.png — hasUteplats=true, pausa när ≥2 äter ─────
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6&uteplats=1`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      await dispatchMany(page, [
        { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
        { type: 'SET_SPEED', speed: 0 }
      ]);
      const ticksTo = await tickUntil(page, () => {
        const s = (/** @type any */ (window)).__nxSimState;
        return s.guests.filter((g) => g.state === 'eating').length >= 2;
      }, 1500);
      const sum = await stateSummary(page);
      console.log('4. uteplats', ticksTo, JSON.stringify(sum));
      await hideOverlays(page);
      await page.screenshot({ path: resolve(REPORT_DIR, 'uteplats.png') });
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await stopVite(proc);
}
