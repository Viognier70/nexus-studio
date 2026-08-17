#!/usr/bin/env node
// ORDER 115 §6 DoD 3 + DoD 8 — skärmdumpar av gästbanan.
//
// Producerar två bilder:
//   * reports/order115/handoff.png — ordering→paying-momentet där
//     staff sträcker fram maten och gästen tar emot; carrying-prop
//     synligt i gästens hand.
//   * reports/order115/uteplats.png — hasUteplats=true, gäster som
//     äter vid ståborden efter hämtning.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order115');
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

async function primeAndTick(page, dispatch, ticks) {
  await page.waitForFunction(
    () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function'
      && document.querySelector('[data-foodtruck-scene]') !== null,
    null, { timeout: 60000 }
  );
  await page.evaluate(() => {
    const w = /** @type any */ (window);
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('115');
  });
  await delay(200);
  await dispatch([
    { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
    { type: 'SET_SPEED', speed: 1 }
  ]);
  await dispatch(new Array(ticks).fill({ type: 'TICK', dt: 0.2 }));
  await dispatch([{ type: 'SET_SPEED', speed: 0 }]);
  await delay(200);
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

    // ── 1. handoff.png ─────────────────────────────────────────────
    // Seedar 6 waiting-gäster. Tick tillräckligt så någon har hunnit
    // paying och bär carrying=foodtruckMeal. Utan uteplats, så gäst
    // går rakt paying → leaving.
    {
      const page = await ctx.newPage();
      const dispatch = async (actions) => {
        await page.evaluate((acts) => {
          const w = /** @type any */ (window);
          for (const a of acts) w.__nxSimDispatch(a);
        }, actions);
        await delay(15);
      };
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6`,
        { waitUntil: 'load' }
      );
      await primeAndTick(page, dispatch, 60);   // 12 sim-sek

      const inv = await page.evaluate(() => {
        const figs = Array.from(document.querySelectorAll('[data-figure]'));
        return figs.map((el) => ({
          id: el.getAttribute('data-figure'),
          carrying: el.getAttribute('data-carrying'),
          archetype: el.getAttribute('data-archetype')
        }));
      });
      console.log('handoff scen-inventering:');
      for (const f of inv) console.log(`  ${f.id?.padEnd(15)}  carrying=${f.carrying}  arketyp=${f.archetype}`);
      const withCarrying = inv.filter((f) => f.carrying);
      console.log(`gäster med carrying: ${withCarrying.length}`);

      await hideOverlays(page);
      const out = resolve(REPORT_DIR, 'handoff.png');
      await page.screenshot({ path: out });
      console.log('wrote', out);
      await page.close();
    }

    // ── 2. uteplats.png ────────────────────────────────────────────
    // hasUteplats=true via URL-param. Seedar 6 waiting-gäster. Tick
    // längre så någon når eating-fasen vid uteplatsen.
    {
      const page = await ctx.newPage();
      const dispatch = async (actions) => {
        await page.evaluate((acts) => {
          const w = /** @type any */ (window);
          for (const a of acts) w.__nxSimDispatch(a);
        }, actions);
        await delay(15);
      };
      await page.goto(
        `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6&uteplats=1`,
        { waitUntil: 'load' }
      );
      await primeAndTick(page, dispatch, 120);   // 24 sim-sek

      const inv = await page.evaluate(() => {
        const w = /** @type any */ (window);
        const state = w.__nxSimState;
        const figs = Array.from(document.querySelectorAll('[data-figure]'));
        const byState = {};
        for (const g of state.guests) byState[g.state] = (byState[g.state] ?? 0) + 1;
        const hasUteplats = state.policies.hasUteplats;
        return {
          hasUteplats,
          byState,
          figures: figs.map((el) => ({
            id: el.getAttribute('data-figure'),
            carrying: el.getAttribute('data-carrying'),
            archetype: el.getAttribute('data-archetype')
          }))
        };
      });
      console.log('\nuteplats scen-inventering:');
      console.log('hasUteplats:', inv.hasUteplats);
      console.log('sim-state per typ:', JSON.stringify(inv.byState));
      for (const f of inv.figures) console.log(`  ${f.id?.padEnd(15)}  carrying=${f.carrying}  arketyp=${f.archetype}`);

      await hideOverlays(page);
      const out = resolve(REPORT_DIR, 'uteplats.png');
      await page.screenshot({ path: out });
      console.log('wrote', out);
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await stopVite(proc);
}
