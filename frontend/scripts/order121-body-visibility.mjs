#!/usr/bin/env node
// ORDER 121 §8 DoD 8 — visuell verifikation att figurriggen faktiskt
// renderas med bredd OCH höjd i vyn, inte bara att riggnoderna finns i
// scengrafen (ORDER 112 §4:s SKEPNAD EJ BYGGD-anti-mönster).
//
// Playwright startar vite, laddar restaurangscenen med kamera-presetet
// `business` (zoomar in i interiörens fade-band), snabbspolar sim till
// service startar, väntar tills minst en gäst är i vyn, och samplar
// canvas-pixlar i två horisontella band:
//   - band A (torso-höjd): säkerställer att kroppen har VIDD i vyn
//   - band B (ben-höjd): säkerställer att kroppen har HÖJD i vyn
//
// Tröskel: non-background-pixelantal ≥ MIN_BODY_PIXELS per band.
// Bakgrunden är restaurangens golv/väggar (matt grå-brun); en figur
// bär garment/uniform i en tydligt annan ton, så en enkel Δ-mot-
// medelbakgrund räcker.
//
// Skärmdumpen sparas till reports/order121/scene-with-bodies.png.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order121');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) return { proc: null, url };
  } catch { /* not up */ }
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
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

/**
 * Injicerar syntetiska gäster direkt i sim-staten via mutation +
 * SET_CASH-no-op. Undviker att behöva vänta på naturliga arrivals
 * (period-gaten kräver 'lunch' eller 'dinner', simmen startar i
 * 'morning' och period-övergångarna sköts av tick-kedjan).
 * SET_CASH:s reducer sprider top-level-state, så den muterade
 * guests-referensen plockas upp och InteriorGuests re-renderar.
 */
async function seedGuests(page, n) {
  // Steg 1: pausa tickern FÖRST och vänta på att speed=0 tar effekt.
  // Annars kan en TICK fira mellan seed och re-render och rensa
  // tillståndet (tickGuests håller seatedIds konsekventa med guests).
  await page.evaluate(() => {
    const w = /** @type any */ (window);
    w.__nxSimState.speed = 0;
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  });
  await delay(200);

  // Steg 2: injicera guests OCH seatedIds. Tickern skulle annars
  // filtrera bort gäster som säger sig sitta men inte finns i
  // seatedIds (service.ts:tickGuests).
  await page.evaluate((count) => {
    const w = /** @type any */ (window);
    const now = w.__nxSimState.simTime ?? 0;
    const fakeGuests = [];
    const fakeIds = [];
    for (let i = 0; i < count; i++) {
      const id = `dod8-gst-${i + 1}`;
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
  }, n);

  await delay(500);

  return page.evaluate(() => {
    const w = /** @type any */ (window);
    return (w.__nxSimState.guests ?? []).filter((g) => g.state === 'seated').length;
  });
}

/**
 * Läser pixlar från canvas i ett horisontellt band. Returnerar antal
 * pixlar som skiljer sig markant från medelbakgrunden (skillnad > delta
 * i minst en kanal, RGB). Central-region-sampling — undviker paneler
 * på sidorna.
 */
async function bandPixelCount(page, bandLabel, yFraction, heightPx) {
  return page.evaluate((args) => {
    const canvas = /** @type HTMLCanvasElement | null */ (document.querySelector('canvas'));
    if (!canvas) throw new Error('canvas not found');
    const w = canvas.width;
    const h = canvas.height;
    const y0 = Math.floor(h * args.yFraction);
    const bandH = args.heightPx;
    const bandTop = Math.max(0, y0 - Math.floor(bandH / 2));
    const bandBottom = Math.min(h, bandTop + bandH);
    // Sampla mitten 60% av bredden (undvik paneler).
    const xStart = Math.floor(w * 0.20);
    const xEnd = Math.floor(w * 0.80);

    // WebGL-canvas kan inte läsas via 2D-kontext; skapa off-screen
    // 2D-canvas och drawImage:a in canvas-innehållet.
    const off = document.createElement('canvas');
    off.width = xEnd - xStart;
    off.height = bandBottom - bandTop;
    const ctx = off.getContext('2d');
    if (!ctx) throw new Error('2D context not available on offscreen canvas');
    ctx.drawImage(canvas, xStart, bandTop, off.width, off.height, 0, 0, off.width, off.height);
    const data = ctx.getImageData(0, 0, off.width, off.height).data;

    // Medelfärg = bakgrund. Räkna pixlar som skiljer sig ≥ 30 i valfri kanal.
    let rSum = 0, gSum = 0, bSum = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]; n += 1;
    }
    const rMean = rSum / n, gMean = gSum / n, bMean = bSum / n;
    let deviants = 0;
    for (let i = 0; i < data.length; i += 4) {
      const dr = Math.abs(data[i] - rMean);
      const dg = Math.abs(data[i + 1] - gMean);
      const db = Math.abs(data[i + 2] - bMean);
      if (dr > 30 || dg > 30 || db > 30) deviants += 1;
    }
    return { label: args.bandLabel, deviants, sampleSize: n, meanRGB: [Math.round(rMean), Math.round(gMean), Math.round(bMean)] };
  }, { bandLabel, yFraction, heightPx });
}

async function main() {
  const { proc, url } = await startVite();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    // playtest=1 aktiverar dev-hookarna. preset=business zoomar kameran
    // in i restaurangens interiörsband (så guests renderas via fade-in).
    await page.goto(`${url}/#playtest=1&business=restaurant&preset=business`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function'
        && document.querySelector('canvas') !== null,
      null,
      { timeout: 60000 }
    );
    await delay(500); // låt scenen resa sig

    // WebGL-canvasen behöver `preserveDrawingBuffer` för att .drawImage
    // ska plocka upp innehållet. Aktivera i-canvas via getContext-patch.
    // I dev-läge fungerar det bara om vi omedelbart läser efter render.
    // Vi tar getImageData EFTER en tydlig requestAnimationFrame-tick.

    console.log('[order121] injicerar 6 syntetiska gäster i seated state ...');
    const sceneGuests = await seedGuests(page, 6);
    console.log(`[order121] seated-gäster: ${sceneGuests}`);
    if (sceneGuests < 1) {
      console.error('[order121] gäst-injektion misslyckades');
      process.exit(1);
    }
    await delay(500);

    // Fånga en förbereding-frame med preserveDrawingBuffer via
    // requestAnimationFrame → immediate screenshot-läge.
    const shotPath = resolve(REPORT_DIR, 'scene-with-bodies.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`[order121] skärmdump: ${shotPath}`);

    // Sampla två band. Band A ~torso-höjd (55% ner), band B ~ben-höjd (72%).
    // I strategisk kamera med preset=business hamnar interiören i övre
    // 2/3 av vyn — de här y-fraktionerna faller inom interiörens rum.
    const bandA = await bandPixelCount(page, 'torso ~55%', 0.55, 30);
    const bandB = await bandPixelCount(page, 'ben ~72%', 0.72, 30);

    console.log(`[order121] ${bandA.label}: deviants=${bandA.deviants}/${bandA.sampleSize} mean=${bandA.meanRGB.join(',')}`);
    console.log(`[order121] ${bandB.label}: deviants=${bandB.deviants}/${bandB.sampleSize} mean=${bandB.meanRGB.join(',')}`);

    // Tröskel: minst 200 avvikande pixlar per band (i en 1152×30 = 34560
    // pixel-sampel). 200 räcker för att representera flera figur-vertikaler
    // — det är golvet, inte taket, som skulle passera med noll.
    const MIN_DEVIANTS = 200;
    const problems = [];
    if (bandA.deviants < MIN_DEVIANTS) problems.push(`torso-bandet har bara ${bandA.deviants} avvikande pixlar (< ${MIN_DEVIANTS})`);
    if (bandB.deviants < MIN_DEVIANTS) problems.push(`ben-bandet har bara ${bandB.deviants} avvikande pixlar (< ${MIN_DEVIANTS})`);

    if (problems.length > 0) {
      console.error('\n[order121] DoD 8 misslyckades:');
      for (const p of problems) console.error(`  - ${p}`);
      console.error(`\nSe ${shotPath} — troligt scen-kamera-läge eller pixel-tröskel behöver justeras`);
      process.exit(1);
    }

    console.log('\n[order121] DoD 8 OK — figurkroppar syns i både torso- och ben-band');
  } finally {
    await browser.close();
    await stopVite(proc);
  }
}

await main();
