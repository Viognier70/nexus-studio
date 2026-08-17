#!/usr/bin/env node
// ORDER 114 — tre-uttryck-triptyk för läsbarhets-verifiering.
//
// VO-fråga 2026-08-17 (rev 3): "Munnen bär större delen av skillnaden
// mellan neutral, jäktad och irriterad — utan den är två av tre
// uttryck identiska. Ny skärmdump med tre gäster i olika uttryck
// bredvid varandra, så det går att jämföra."
//
// Renderar tre gäster med SAMMA arketyp (så bara uttrycket varierar)
// vid full CSS-storlek och tar en zoomad skärmdump där huvudena
// dominerar bilden. Bevis för att munnen syns + skiljer sig mellan
// uttryck. Output: reports/order114/expression-triptych.png.

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
const OUT_PATH = resolve(REPORT_DIR, 'expression-triptych.png');
const MEASURE_PATH = resolve(REPORT_DIR, 'triptych-measurements.json');

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

  // Seedar 3 gäster med SAMMA arketyp (via kluster-ids som alla
  // hashar till stamgästen vid period='lunch') så bara uttrycket
  // varierar — arketyp-specifika head-toppings/props inte skiljer.
  //
  // Praktisk begränsning: assignArchetype är deterministisk från id
  // och period, och seed-scriptet använder `gst-bench-N`-ids. Vi kan
  // inte kontrollera vilka arketyper som spawnas via seed-ids alone.
  // Istället: seedar 3 gäster i olika STATES (waiting/waiting/waiting
  // med olika stateTime) → deriveFoodtruckGuestFace ger olika
  // uttryck baserat på kötid.
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
    if (typeof w.__nxSetBusinessName === 'function') w.__nxSetBusinessName('Triptyk');
  });
  await delay(300);

  const dispatch = async (actions) => {
    await page.evaluate((acts) => {
      const w = /** @type any */ (window);
      for (const a of acts) w.__nxSimDispatch(a);
    }, actions);
    await delay(15);
  };

  // Öppna service och kör 30 sim-sek framåt så olika waiting-gäster
  // har olika kötid (och därmed olika deriverade uttryck):
  //   * gst-bench-1: kortast tid → forvantansfull
  //   * gst-bench-2: medellång → nyfiken / uttrakad
  //   * gst-bench-3: längst → otalig
  //
  // Efter seeding sätter vi guests' stateTime manuellt via en dispatch-
  // sekvens som simulerar tid.
  await dispatch([
    { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 },
    { type: 'SET_SPEED', speed: 1 }
  ]);
  // Kör 100 ticks × 0.2s = 20 sim-sek framåt så staff-pipelinen får
  // dra igenom några gäster (ger mix av waiting-tider).
  await dispatch(new Array(100).fill({ type: 'TICK', dt: 0.2 }));
  await dispatch([{ type: 'SET_SPEED', speed: 0 }]);
  await delay(300);

  // Läs vilka guest-figurer som finns och deras face-attribut
  const inventory = await page.evaluate(() => {
    const figures = document.querySelectorAll('[data-figure]');
    const guests = Array.from(figures)
      .filter((el) => el.getAttribute('data-figure') !== 'staff-hatch')
      .map((el) => ({
        id: el.getAttribute('data-figure'),
        archetype: el.getAttribute('data-archetype'),
        face: el.getAttribute('data-face'),
        skinTone: el.getAttribute('data-skin-tone'),
        rect: el.getBoundingClientRect()
      }));
    return guests;
  });

  console.log('=== Guest-figurer på scenen ===');
  for (const g of inventory) {
    console.log(`  ${g.id.padEnd(15)}  ${g.archetype.padEnd(14)}  ${g.face.padEnd(15)}  ${g.skinTone}  ${Math.round(g.rect.width)}×${Math.round(g.rect.height)}`);
  }

  // Välj tre figurer med olika uttryck (om möjligt).
  const uniqueFaces = new Map();
  for (const g of inventory) {
    if (!uniqueFaces.has(g.face)) uniqueFaces.set(g.face, g);
  }
  const selected = [...uniqueFaces.values()].slice(0, 3);
  console.log(`\nValda för triptyk (${selected.length} unika uttryck):`);
  for (const g of selected) console.log(`  ${g.id}  face=${g.face}`);

  if (selected.length < 3) {
    console.log('\n⚠  Färre än 3 unika uttryck i scenen — triptyken visar färre variationer.');
  }

  // Ta en zoomad skärmdump som cropar till huvud-regionen av de valda
  // figurerna. Head-höjd ≈ 40% av figur-höjd. Vi croppar den övre
  // halvan av figur-boundingsen så ansikten dominerar.
  //
  // Enkel version: full scen-skärmdump, användaren kan zooma själv.
  // Bättre version: clip till kombinerad bounding av utvalda figurer.

  if (selected.length > 0) {
    const combined = {
      x: Math.min(...selected.map((s) => s.rect.x)),
      y: Math.min(...selected.map((s) => s.rect.y)),
      right: Math.max(...selected.map((s) => s.rect.x + s.rect.width)),
      bottom: Math.max(...selected.map((s) => s.rect.y + s.rect.height))
    };
    const padding = 40;
    const clipX = Math.max(0, Math.floor(combined.x - padding));
    const clipY = Math.max(0, Math.floor(combined.y - padding));
    const clipW = Math.min(VIEWPORT.width - clipX, Math.ceil(combined.right - combined.x + 2 * padding));
    // Crop bara den övre 55% av figurerna så huvudena dominerar.
    const totalH = combined.bottom - combined.y;
    const clipH = Math.min(VIEWPORT.height - clipY, Math.ceil(totalH * 0.55 + 2 * padding));

    // Dölj dev-overlays inför skärmdump
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

    await page.screenshot({
      path: OUT_PATH,
      clip: { x: clipX, y: clipY, width: clipW, height: clipH }
    });
    console.log(`\nwrote ${OUT_PATH} (${clipW}×${clipH} px, klippt runt ${selected.length} figurer)`);
  } else {
    await page.screenshot({ path: OUT_PATH });
    console.log(`\nwrote ${OUT_PATH} (fallback: full viewport)`);
  }

  writeFileSync(MEASURE_PATH, JSON.stringify({
    inventory,
    selected: selected.map((s) => ({ id: s.id, archetype: s.archetype, face: s.face, skinTone: s.skinTone }))
  }, null, 2) + '\n');
  console.log('wrote', MEASURE_PATH);

  await browser.close();
} finally {
  await stopVite(proc);
}
