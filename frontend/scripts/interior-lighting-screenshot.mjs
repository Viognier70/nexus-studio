#!/usr/bin/env node
// Vision Owner 2026-08-15 — dinner interior lighting screenshot.
//
// Boots vite dev, pins the camera to the myBusiness preset and the
// lighting to dinner via harnessParams, seeds the sim forward until
// at least one guest is seated AND one is waiting, then screenshots
// the interior. The image is the artefact: sittande and stående
// guests must be distinguishable in the rendered scene (same
// legibility bar as ORDER 090 §2, but for lighting rather than
// projection).
//
// Output: frontend/reports/interior-lighting/dinner-myBusiness.png
//
// Not part of `npm test`. Intended as an on-demand measurement when
// interior lighting changes.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'interior-lighting');
mkdirSync(REPORT_DIR, { recursive: true });
const OUT_PATH = resolve(REPORT_DIR, 'dinner-myBusiness.png');

// myBusiness camera preset values, transcribed from
// frontend/src/strategic/camera/viewLevels.ts so we can pin the
// camera without needing initialPreset() to know about "myBusiness"
// (it doesn't; the entry is developer-only and not URL-exposed).
const MY_BUSINESS = {
  focusX: 31.6,
  focusZ: -16.7,
  distance: 24,           // restaurantRoofFadeMid − Half − 4 = 40 − 12 − 4
  yaw: 0.4,
  pitch: (50 * Math.PI) / 180
};

const VIEWPORT = { width: 1280, height: 720 };

function poseUrl(baseUrl) {
  const hash =
    `#focus=${MY_BUSINESS.focusX},${MY_BUSINESS.focusZ}` +
    `&distance=${MY_BUSINESS.distance}` +
    `&yaw=${MY_BUSINESS.yaw}` +
    `&pitch=${MY_BUSINESS.pitch}` +
    `&period=dinner` +
    `&playtest=1`;
  return baseUrl + '/' + hash;
}

// Reuse an already-running vite on :5173 if one exists (the Vision
// Owner often has `npm run dev` open for the hot-reload workflow —
// killing it would surprise them). Only spawn a fresh vite if 5173
// answers nothing.
async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) {
      console.log('[vite] reusing existing dev server on 5173');
      return { proc: null, url };
    }
  } catch { /* not up — spawn one below */ }

  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', (c) => process.stdout.write(`[vite] ${c}`));
  proc.stderr.on('data', (c) => process.stderr.write(`[vite:err] ${c}`));
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`vite exited early (code ${proc.exitCode}) before ready`);
    }
    try {
      const res = await fetch(url + '/');
      if (res.ok || res.status === 304) return { proc, url };
    } catch { /* not up yet */ }
    await delay(500);
  }
  throw new Error('vite dev did not respond within 300s');
}

async function stopVite(proc) {
  if (!proc) return;  // we're reusing an existing dev server
  return new Promise((res) => {
    proc.on('exit', () => res(undefined));
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(undefined); }, 3000);
  });
}

// Set the business name (dismisses NameEntryOverlay) and confirm
// the sim hooks are available.
async function primeApp(page) {
  return page.evaluate(() => {
    /** @type {any} */
    const w = window;
    if (typeof w.__nxSetBusinessName !== 'function') {
      throw new Error('window.__nxSetBusinessName not available');
    }
    w.__nxSetBusinessName('Testkrogen');
    if (typeof w.__nxSimDispatch !== 'function') {
      throw new Error('window.__nxSimDispatch not available');
    }
  });
}

// Dispatch a chunk of actions. React 18 auto-batching means the
// window.__nxSimState effect only writes after the event handler
// returns — so we call this once per chunk and then await from
// Node so React can commit + effect can fire before we read the
// next state.
async function dispatchChunk(page, actions) {
  await page.evaluate((acts) => {
    /** @type {any} */
    const w = window;
    for (const a of acts) w.__nxSimDispatch(a);
  }, actions);
  // Give React one commit cycle to flush __nxSimState.
  await delay(15);
}

async function readState(page) {
  return page.evaluate(() => {
    /** @type {any} */
    const w = window;
    const s = w.__nxSimState;
    return {
      period: s.day.period,
      waiting: s.waitingIds.length,
      seated: s.seatedIds.length,
      capacity: s.policies.capacity,
      guests: s.guests.length,
      doorsOpened: s.day.doorsOpenedThisService
    };
  });
}

// Drive the sim: skip lunch, open dinner, tick until the room has
// at least one seated + one waiting guest. Each chunk yields back to
// React so the state observation isn't stuck on the pre-batch value.
async function seedInterior(page) {
  await dispatchChunk(page, [
    { type: 'SKIP_LUNCH' },
    { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 30 }
  ]);

  const TICKS_PER_CHUNK = 50;   // 10 sim-seconds per chunk
  const MAX_CHUNKS = 90;        // ≤ 15 sim-minutes total
  const tick = { type: 'TICK', dt: 0.2 };
  for (let ck = 0; ck < MAX_CHUNKS; ck++) {
    const batch = new Array(TICKS_PER_CHUNK).fill(tick);
    await dispatchChunk(page, batch);
    const s = await readState(page);
    if (s.waiting > 0 && s.seated > 0 && s.period === 'dinner') {
      return { reached: true, chunk: ck + 1, ...s };
    }
  }
  const s = await readState(page);
  return { reached: false, chunk: MAX_CHUNKS, ...s };
}

const { proc, url } = await startVite();
try {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error' || t === 'warning') {
        console.log(`[page ${t}]`, msg.text());
      }
    });
    const target = poseUrl(url);
    console.log('navigating to', target);
    await page.goto(target, { waitUntil: 'load' });

    // Wait for the harness pixel probe to tick at least a few times —
    // proof that R3F is running and the scene has committed frames.
    await page.waitForFunction(
      () => /** @type {any} */ (window).__nxHarness &&
            /** @type {any} */ (window).__nxHarness.ticks >= 3,
      null,
      { timeout: 180000 }
    );

    await primeApp(page);
    // Give the app a beat to re-render after the name is set (the
    // NameEntryOverlay unmounts on `hasName`).
    await delay(200);

    const seed = await seedInterior(page);
    console.log('seed result:', seed);
    if (!seed.reached) {
      console.warn(
        'Warning: did not observe (waiting>0 AND seated>0) within chunk cap; ' +
        'screenshot may lack one or both guest states.'
      );
    }

    // Let the scene settle another second so lean/bob and material
    // opacity crossfades complete after the sim-state jump.
    await delay(1500);

    // Hide the DOM overlays (InstrumentsPanel, EventStream,
    // ScenarioOverlay, DevPanel, top menus) via a targeted visibility
    // walk. `visibility: hidden` — not `display: none` — so we don't
    // reflow the canvas (which would force R3F to re-init the WebGL
    // context and stall the frame the screenshot is waiting on).
    // Everything on the canvas's ancestor chain stays untouched;
    // everything else in <body> hides.
    await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return;
      const keep = new Set();
      let node = c;
      while (node) { keep.add(node); node = node.parentElement; }
      document.querySelectorAll('body *').forEach((el) => {
        if (keep.has(el) || el.tagName === 'CANVAS') return;
        /** @type {HTMLElement} */ (el).style.visibility = 'hidden';
      });
    });
    await delay(300);   // let R3F commit one more frame post-hide
    await page.screenshot({ path: OUT_PATH });
    console.log('wrote', OUT_PATH);
  } finally {
    await browser.close();
  }
} finally {
  await stopVite(proc);
}
