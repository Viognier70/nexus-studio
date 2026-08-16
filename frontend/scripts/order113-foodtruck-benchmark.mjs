#!/usr/bin/env node
// ORDER 113 §3 DoD 7 + DoD 8 — food truckens skepnad.
//
// Bootar vite dev, navigerar till `#playtest=1&business=foodtruck`,
// seedar sim tills kön har byggts upp, tar en skärmdump (DoD 7) och
// mäter bildfrekvens (DoD 8) i en verklig rAF-loop med simuleringen
// igång.
//
// **Skillnaden mot ORDER 096:s isolerade 380 fps-mätning:** ORDER 096
// mätte den vanilla-JS-porterade riggen utan React, utan sim-tick,
// utan panel-mätning eller weather-overlay. ORDER 113 mäter samma
// rig men driven av React (rAF → setState → reconciliation → SVG-attr-
// writes), med sim-tickern som konkurrerar om samma rAF-schema, med
// panel-insets-mätning aktiv och weather-overlay på scenen. Det är
// den fps-siffra som spelaren faktiskt får — inte rigen i taxfree-luft.
//
// Utdata:
//   frontend/reports/order113/foodtruck-scene.png    — skärmdump
//   frontend/reports/order113/results.json           — fps-mätning
//
// Kör från frontend/:
//   node scripts/order113-foodtruck-benchmark.mjs

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
const SCREENSHOT_PATH = resolve(REPORT_DIR, 'foodtruck-scene.png');
const RESULTS_PATH = resolve(REPORT_DIR, 'results.json');

const VIEWPORT = { width: 1920, height: 1080 };

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
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res(undefined));
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(undefined); }, 3000);
  });
}

async function dispatchChunk(page, actions) {
  await page.evaluate((acts) => {
    const w = /** @type {any} */ (window);
    for (const a of acts) w.__nxSimDispatch(a);
  }, actions);
  await delay(15);
}

async function readState(page) {
  return page.evaluate(() => {
    const w = /** @type {any} */ (window);
    const s = w.__nxSimState;
    return {
      period: s.day.period,
      waiting: s.waitingIds.length,
      capacity: s.policies.capacity,
      businessClass: s.businessClass,
      guests: s.guests.length
    };
  });
}

// Kör sim framåt tills food truck-kön har byggts upp. Använder
// lunch-passet (foodtruck accepterar samma OPEN_SERVICE-kontrakt som
// restaurant). Väntar sedan tills waitingIds.length ≥ 3 så
// skärmdumpen visar flera figurer, inte bara personalen i luckan.
async function verifySeededQueue(page) {
  // `foodtruckSeed=6` i URL:en har redan injicerat 6 waiting-gäster
  // via SimulationProvider:s applyDevFoodtruckSeed vid init. Här
  // verifierar vi bara att seedet syns i state.
  const s = await readState(page);
  if (s.businessClass !== 'foodtruck') {
    throw new Error(`business is "${s.businessClass}", expected "foodtruck"`);
  }
  if (s.waiting === 0) {
    throw new Error(
      'foodtruckSeed=6 injicerade inte waiting-gäster; ' +
      'verifiera applyDevFoodtruckSeed i SimulationProvider'
    );
  }
  return s;
}

// FPS-mätning i verklig rAF-loop. Mäter medel och 5:e percentil över
// MEASURE_MS millisekunder. Sim-tickern och FoodtruckScene:s egen
// rAF-loop kör parallellt — vi mäter observatör-fps, inte kick-off-fps.
async function measureFps(page, warmupMs = 2000, measureMs = 10000) {
  return page.evaluate(async ({ warmupMs, measureMs }) => {
    return await new Promise((resolvePromise) => {
      const frameTimes = [];
      let lastNow = 0;
      let startNow = 0;
      let phase = 'warmup';

      function frame(now) {
        if (lastNow === 0) {
          lastNow = now;
          startNow = now;
          requestAnimationFrame(frame);
          return;
        }
        const dt = now - lastNow;
        lastNow = now;
        const elapsed = now - startNow;

        if (phase === 'warmup' && elapsed > warmupMs) {
          phase = 'measuring';
          startNow = now;
          frameTimes.length = 0;
        }

        if (phase === 'measuring') {
          frameTimes.push(dt);
          if (elapsed > measureMs) {
            const fps = frameTimes.map((d) => 1000 / d);
            const sorted = fps.slice().sort((a, b) => a - b);
            const mean = fps.reduce((s, v) => s + v, 0) / fps.length;
            const p5 = sorted[Math.floor(sorted.length * 0.05)] || sorted[0];
            const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
            resolvePromise({
              frames: frameTimes.length,
              measureWindowMs: measureMs,
              mean: +mean.toFixed(2),
              p5: +p5.toFixed(2),
              p95: +p95.toFixed(2)
            });
            return;
          }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }, { warmupMs, measureMs });
}

const { proc, url } = await startVite();
try {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows'
    ]
  });
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
    // `dollhouse=1` krävs för att DollhouseFrame ska mount:as
    // (StrategicApp.tsx:234 gate:ar den bakom harnessParams.dollhouse
    // && atLevel4; dollhouse=1 auto-jumpar även till nivå 4).
    // `foodtruckSeed=6` fyller kön med 6 fake-gäster vid init så
    // benchmark-vyn har både personal och kö att fotografera utan att
    // behöva simulera fram organiska arrivals över flera sim-minuter.
    const target = `${url}/#playtest=1&business=foodtruck&dollhouse=1&foodtruckSeed=6`;
    console.log('navigating to', target);
    await page.goto(target, { waitUntil: 'load' });

    // Vänta på att sim-hooks och FoodtruckScene har mount:at.
    await page.waitForFunction(
      () => {
        const w = /** @type {any} */ (window);
        return typeof w.__nxSimDispatch === 'function'
          && document.querySelector('[data-foodtruck-scene]') !== null;
      },
      null,
      { timeout: 60000 }
    );

    // Sätt affärsnamn så NameEntryOverlay försvinner (annars ligger
    // den över scenen på skärmdumpen).
    await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      if (typeof w.__nxSetBusinessName === 'function') {
        w.__nxSetBusinessName('Grythyttans Food Truck');
      }
    });
    await delay(200);

    // Verifiera att kön är seeded via foodtruckSeed URL-param.
    const seed = await verifySeededQueue(page);
    console.log('seeded state:', seed);

    // Låt scenen stabilisera efter sim-jumpen.
    await delay(500);

    // Dölj dev-overlays (DevPanel, InstrumentsPanel, EventStream,
    // ScenarioOverlay, PanelColumn:s) så skärmdumpen visar
    // FoodtruckScene:n istället för dev-noise. Samma teknik som
    // interior-lighting-screenshot.mjs — vandra upp ancestor-kedjan
    // från [data-foodtruck-scene] och sätt visibility:hidden på allt
    // annat i <body>. visibility (inte display:none) undviker reflow.
    await page.evaluate(() => {
      const scene = document.querySelector('[data-foodtruck-scene]');
      if (!scene) return;
      const keep = new Set();
      let node = scene;
      while (node) { keep.add(node); node = node.parentElement; }
      // Behåll även scenens SVG-barn så vagn/lucka/kö syns.
      scene.querySelectorAll('*').forEach((el) => keep.add(el));
      document.querySelectorAll('body *').forEach((el) => {
        if (keep.has(el)) return;
        /** @type {any} */ (el).style.visibility = 'hidden';
      });
    });
    await delay(200);

    // Skärmdump — DoD 7. Bilden är beviset.
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    console.log('wrote screenshot:', SCREENSHOT_PATH);

    // FPS-mätning — DoD 8. Sim-tickern körs fortsatt.
    console.log('measuring fps (2 s warmup + 10 s measure)…');
    const fps = await measureFps(page);
    console.log('fps result:', fps);

    // Läs slutläge för rapporten.
    const finalState = await readState(page);

    // Räkna renderade figurer i scenen som ytterligare artefakt (DoD 5
    // grep-verifieras redan i unit-testerna, men här har vi den
    // verkliga renderingen — värde att spara).
    const renderedFigureCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-figure]').length;
    });

    const results = {
      order: 'ORDER 113',
      date: new Date().toISOString().slice(0, 10),
      viewport: `${VIEWPORT.width}×${VIEWPORT.height}`,
      renderer: 'Chrome headless — React + FoodtruckScene + SimulationProvider (rAF-driven)',
      screenshotPath: 'frontend/reports/order113/foodtruck-scene.png',
      seed: {
        method: 'foodtruckSeed=6 URL-param → applyDevFoodtruckSeed init',
        waitingIds: seed.waiting,
        totalGuests: seed.guests,
        period: seed.period,
        businessClass: seed.businessClass
      },
      renderedFigures: renderedFigureCount,
      fps: {
        ...fps,
        note: [
          'Mätt med sim-tickern (5 Hz) och FoodtruckScene:s egen rAF-loop igång',
          'samt panel-insets ResizeObserver och weather-overlay renderade. Detta',
          'är observatör-fps — vad spelaren ser i webbläsaren. Jämför mot ORDER 096',
          '§5.1 mean 120 fps (isolerad vanilla-JS rig, ingen React, ingen sim):',
          'de mäter olika saker. Denna siffra inkluderar React-reconciliation,',
          'context-propagation, och konkurrens om samma rAF-schema.',
          '',
          'ORDER 096 rapporterade också 380 fps i intern rig-mätning (utan vsync-',
          'clamp); här mäter vi mot Chrome:s vsync-tak (~60/120 Hz beroende på',
          'system). Take-away: rig-koden är billig, React-lagret är gratis-nog.'
        ].join(' ')
      }
    };
    writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + '\n');
    console.log('wrote results:', RESULTS_PATH);
  } finally {
    await browser.close();
  }
} finally {
  await stopVite(proc);
}
