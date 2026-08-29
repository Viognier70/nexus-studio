#!/usr/bin/env node
// ORDER 114 Steg 1 DoD 2 + Steg 2 DoD 3 — mät scenbredd, räkna
// figurstorlek, ta skärmdump där ansiktsuttrycken kan urskiljas.
//
// Startar vite dev, navigerar till foodtruck med foodtruckSeed=8 så
// scenen är full (varierade arketyper), döljer dev-overlays via samma
// visibility-vandring som fel2-diag använder, mäter faktisk render-
// bredd på figurerna i CSS-px, tar skärmdump till
// frontend/reports/order114/faces.png.
//
// **Bild är beviset per DoD 3.** JSON-utdata rapporterar mätningen
// men avgörande är att skärmdumpen visuellt visar urskiljbara
// ansiktsuttryck.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order114');
mkdirSync(REPORT_DIR, { recursive: true });
const SCREENSHOT_PATH = resolve(REPORT_DIR, 'faces.png');
const MEASURE_PATH = resolve(REPORT_DIR, 'measurements.json');

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

const { proc, url } = await startVite();
try {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));

  // foodtruckSeed=3 — färre gäster ger tydligare skärmdump utan
  // överlapp. Tidigare version med seed=8 producerade 13 figurer i
  // scenen vilket sprängde slot-budget (2432/400 = 6 slot-positioner
  // synliga; överflöd renderades vid negativ X och överlappade
  // varandra). Med seed=3 + några organiska arrivals landar totalt
  // 4-6 figurer, alla inom synlig scen-yta.
  await page.goto(
    `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=3`,
    { waitUntil: 'load' }
  );
  await page.waitForFunction(
    () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function'
      && document.querySelector('[data-foodtruck-scene]') !== null,
    null, { timeout: 60000 }
  );

  await page.evaluate(() => {
    const w = /** @type any */ (window);
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('Ansiktes-Truck');
  });
  await delay(300);

  // Öppna service + unpause + tick förbi opening så staff hinner ta
  // några gäster till ordering. Ger blandad state-fördelning i bilden.
  const dispatch = async (actions) => {
    await page.evaluate((acts) => {
      const w = /** @type any */ (window);
      for (const a of acts) w.__nxSimDispatch(a);
    }, actions);
    await delay(15);
  };
  await dispatch([
    { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
    { type: 'SET_SPEED', speed: 1 }
  ]);
  // Tick 60 ticks × 0.2s = 12 sim-sek — hinner ta ~3 gäster till ordering.
  const tick = { type: 'TICK', dt: 0.2 };
  await dispatch(new Array(60).fill(tick));
  // Pausa igen inför mätning + skärmdump.
  await dispatch([{ type: 'SET_SPEED', speed: 0 }]);
  await delay(200);

  // Mät figur-bredd i CSS-pixlar för DoD 2. Vi läser
  // getBoundingClientRect på ett gäst-figur-element.
  const measurements = await page.evaluate(() => {
    const scene = document.querySelector('[data-foodtruck-scene]');
    const svg = scene ? scene.querySelector('svg') : null;
    const figures = document.querySelectorAll('[data-figure]');
    const guestFigures = Array.from(figures).filter(
      (el) => el.getAttribute('data-figure') !== 'staff-hatch'
    );
    const scenePxWidth = svg ? svg.getBoundingClientRect().width : 0;
    const scenePxHeight = svg ? svg.getBoundingClientRect().height : 0;
    const figureRects = guestFigures.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute('data-figure'),
        archetype: el.getAttribute('data-archetype'),
        face: el.getAttribute('data-face'),
        skinTone: el.getAttribute('data-skin-tone'),
        widthPx: +r.width.toFixed(1),
        heightPx: +r.height.toFixed(1)
      };
    });
    const widths = figureRects.map((r) => r.widthPx).filter((w) => w > 0);
    return {
      scenePxWidth: +scenePxWidth.toFixed(1),
      scenePxHeight: +scenePxHeight.toFixed(1),
      guestFigureCount: guestFigures.length,
      figureRects,
      figureWidthMin: widths.length ? Math.min(...widths) : 0,
      figureWidthMax: widths.length ? Math.max(...widths) : 0,
      figureWidthMean: widths.length ? +(widths.reduce((s, v) => s + v, 0) / widths.length).toFixed(1) : 0,
      figuresAt140pxThreshold: widths.filter((w) => w >= 140).length,
      figuresAt120pxLenience: widths.filter((w) => w >= 120).length,
      // Räkna hur många 140-px-figurer som skulle rymmas i scenens bredd
      figuresPer140px: scenePxWidth > 0 ? Math.floor(scenePxWidth / 140) : 0
    };
  });

  console.log('=== ORDER 114 MÄTNING ===');
  console.log(`Scen CSS-bredd:              ${measurements.scenePxWidth} px`);
  console.log(`Scen CSS-höjd:               ${measurements.scenePxHeight} px`);
  console.log(`Gäst-figurer på scenen:      ${measurements.guestFigureCount}`);
  console.log(`Figurbredd (min/mean/max):   ${measurements.figureWidthMin} / ${measurements.figureWidthMean} / ${measurements.figureWidthMax} px`);
  console.log(`Antal ≥ 140 px:              ${measurements.figuresAt140pxThreshold}/${measurements.guestFigureCount}`);
  console.log(`Antal ≥ 120 px:              ${measurements.figuresAt120pxLenience}/${measurements.guestFigureCount}`);
  console.log(`Bredd/140-figurer får plats: ${measurements.figuresPer140px}`);
  console.log();
  console.log('Per figur:');
  for (const r of measurements.figureRects) {
    console.log(`  ${(r.id ?? '').padEnd(15)}  ${(r.archetype ?? '').padEnd(14)}  ${(r.face ?? '').padEnd(15)}  ${r.widthPx}×${r.heightPx} px`);
  }

  writeFileSync(MEASURE_PATH, JSON.stringify(measurements, null, 2) + '\n');
  console.log('\nwrote', MEASURE_PATH);

  // Dölj DEV-overlays inför skärmdump — samma teknik som fel2-diag.
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

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  console.log('wrote', SCREENSHOT_PATH);

  // Verdict för DoD 3 — bilden är beviset. JSON-mätningen är komplement.
  console.log('\n=== VERDICT ===');
  if (measurements.figureWidthMean >= 140) {
    console.log(`✓ Figurernas medelbredd (${measurements.figureWidthMean} px) ≥ 140 px-tröskel.`);
  } else if (measurements.figureWidthMean >= 120) {
    console.log(`△ Figurernas medelbredd (${measurements.figureWidthMean} px) under 140 men över 120 — läsbara ansikten möjliga.`);
  } else {
    console.log(`✗ Figurernas medelbredd (${measurements.figureWidthMean} px) för smala för läsbara ansikten.`);
  }
  console.log(`Skärmdump: ${SCREENSHOT_PATH}`);
  console.log('Öppna bilden och verifiera att minst ett gästansikte har urskiljbart uttryck.');

  await browser.close();
} finally {
  await stopVite(proc);
}
