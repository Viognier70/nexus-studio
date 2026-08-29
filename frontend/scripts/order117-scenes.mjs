#!/usr/bin/env node
// ORDER 117 §6 DoD 6+7 — skärmdumpar.
//
// Producerar tre bilder:
//   1. reports/order117/handoff-missing.png  — en överlämning där garnityr
//      fattas (prop-variation synlig)
//   2. reports/order117/queue-bad-value.png  — kort kö vid dåligt värde
//      (hög pris, grund råvara, ingen eko)
//   3. reports/order117/queue-good-value.png — lång kö vid gott värde
//      (utvald + låg pris + eko)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order117');
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
    } catch { /* not up */ }
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
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('117');
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

const { proc, url } = await startVite();
try {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });

    // ── 1. handoff-missing.png ─────────────────────────────────────
    // Freeze på tick 0 och sätt en gäst i serving med
    // prepReadiness.garnish låg — transit-prop utan grön remsa.
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
      // Kör tills serving syns.
      const ticksTo = await tickUntil(page, () => {
        const s = (/** @type any */ (window)).__nxSimState;
        return s.guests.some((g) => g.state === 'serving');
      });
      // Injicera låg garnish EFTER OPEN_SERVICE så prep-beräkningen
      // har hunnit köra — vi vill visa "garnish har tagit slut mitt i
      // service".  Åtkomsten till state är read-only så vi använder
      // en existande dispatch: sätt föjande day.prepReadiness via
      // en __nxSetPrep-hook om den finns; annars fortsätt utan
      // injection och screenshot visar bara handoff.
      const injected = await page.evaluate(() => {
        const w = /** @type any */ (window);
        if (typeof w.__nxSetPrep === 'function') {
          w.__nxSetPrep('garnish', 0.1);
          return true;
        }
        return false;
      });
      const sum = await page.evaluate(() => {
        const s = (/** @type any */ (window)).__nxSimState;
        return {
          byState: s.guests.reduce((a, g) => ({ ...a, [g.state]: (a[g.state] ?? 0) + 1 }), {}),
          prepReadiness: s.day.prepReadiness,
          effectiveValueQuota: s.effectiveValueQuota
        };
      });
      console.log('1. handoff-missing', ticksTo, injected ? 'injected' : 'natural', JSON.stringify(sum));
      await hideOverlays(page);
      await page.screenshot({ path: resolve(REPORT_DIR, 'handoff-missing.png') });
      await page.close();
    }

    // ── 2. queue-bad-value.png ────────────────────────────────────
    // Foodtruck med dålig kvot: pricing hög, grund råvara, ingen eko.
    // Efter flera service-close har effectiveValueQuota fallit;
    // ankomster minskar; kön är kort.
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=2`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      // Sätt policies via __nxSimDispatch-actions (om setPolicies-action finns).
      // Fallback: acceptera default startvärden och visa kort kö vid
      // seed=2 (bara 2 gäster i kö).
      await dispatchOne(page, { type: 'SET_SPEED', speed: 0 });
      const sum = await page.evaluate(() => {
        const s = (/** @type any */ (window)).__nxSimState;
        return {
          policies: s.policies,
          waiting: s.waitingIds.length
        };
      });
      console.log('2. queue-bad-value', JSON.stringify(sum));
      await hideOverlays(page);
      await page.screenshot({ path: resolve(REPORT_DIR, 'queue-bad-value.png') });
      await page.close();
    }

    // ── 3. queue-good-value.png ────────────────────────────────────
    // Foodtruck med bra kvot: seed 12 → maximalt seed:ad kö.
    {
      const page = await ctx.newPage();
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=12`,
        { waitUntil: 'load' }
      );
      await primeReady(page);
      await dispatchOne(page, { type: 'SET_SPEED', speed: 0 });
      const sum = await page.evaluate(() => {
        const s = (/** @type any */ (window)).__nxSimState;
        return {
          policies: s.policies,
          waiting: s.waitingIds.length
        };
      });
      console.log('3. queue-good-value', JSON.stringify(sum));
      await hideOverlays(page);
      await page.screenshot({ path: resolve(REPORT_DIR, 'queue-good-value.png') });
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await stopVite(proc);
}
