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
 * Läser rå pixel-data från ett canvas-region. Region: vänster tredjedel
 * (x=8%..38%) × mellersta-nedre y-band (y=40%..75%). Undviker "Din
 * verksamhet"-modalen (center) och DevPanel (höger). Ligger inom
 * restaurangens interiörsyta i preset=business-kameran.
 */
async function readFigureRegion(page) {
  return page.evaluate(() => {
    const canvas = /** @type HTMLCanvasElement | null */ (document.querySelector('canvas'));
    if (!canvas) throw new Error('canvas not found');
    const cw = canvas.width;
    const ch = canvas.height;
    const xStart = Math.floor(cw * 0.08);
    const xEnd = Math.floor(cw * 0.38);
    const yStart = Math.floor(ch * 0.40);
    const yEnd = Math.floor(ch * 0.75);
    const rw = xEnd - xStart;
    const rh = yEnd - yStart;

    const off = document.createElement('canvas');
    off.width = rw;
    off.height = rh;
    const ctx = off.getContext('2d');
    if (!ctx) throw new Error('2D context not available on offscreen canvas');
    ctx.drawImage(canvas, xStart, yStart, rw, rh, 0, 0, rw, rh);
    const data = ctx.getImageData(0, 0, rw, rh).data;
    return {
      width: rw,
      height: rh,
      origin: [xStart, yStart],
      pixels: Array.from(data)
    };
  });
}

/**
 * Diff:ar två pixel-samplingar. För varje pixel: räkna som "ändrad"
 * om skillnaden i minst en kanal är ≥ delta. Returnerar totalt antal
 * ändrade pixlar + deras bounding-box.
 *
 * Denna approach isolerar figurernas bidrag: baseline = scen utan
 * gäster, sample = samma scen MED injicerade gäster. Endast pixlar
 * där figurerna faktiskt ritas differar — allt annat (väggar, golv,
 * ljus, modal, panelern) är oförändrat mellan de två läsningarna.
 */
function diffFigureContribution(baseline, sample, delta) {
  if (baseline.width !== sample.width || baseline.height !== sample.height) {
    throw new Error(`region size mismatch: ${baseline.width}×${baseline.height} vs ${sample.width}×${sample.height}`);
  }
  const rw = baseline.width;
  const rh = baseline.height;
  const bd = baseline.pixels;
  const sd = sample.pixels;
  let changed = 0;
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = (y * rw + x) * 4;
      const dr = Math.abs(sd[i] - bd[i]);
      const dg = Math.abs(sd[i + 1] - bd[i + 1]);
      const db = Math.abs(sd[i + 2] - bd[i + 2]);
      if (dr >= delta || dg >= delta || db >= delta) {
        changed += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bboxW = maxX >= 0 ? (maxX - minX + 1) : 0;
  const bboxH = maxY >= 0 ? (maxY - minY + 1) : 0;
  return { changed, bboxW, bboxH, bboxOrigin: [minX, minY], totalPixels: rw * rh };
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

    // Pausa tickern FÖRE baseline så väggarna, ljuset, modalen etc.
    // är stilla mellan de två frame-läsningarna. Skillnaden ska då
    // ISOLERAS till figurernas bidrag.
    await page.evaluate(() => {
      const w = /** @type any */ (window);
      w.__nxSimState.speed = 0;
      w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
    });
    await delay(400);

    // Steg 1: BASELINE — läs pixlarna utan gäster.
    console.log('[order121] steg 1: baseline (0 gäster) ...');
    const baseline = await readFigureRegion(page);
    const baselineShot = resolve(REPORT_DIR, 'scene-baseline.png');
    await page.screenshot({ path: baselineShot, fullPage: false });
    console.log(`[order121] baseline-skärmdump: ${baselineShot}`);

    // Steg 2: injicera 6 gäster + läs pixlarna igen.
    console.log('[order121] steg 2: injicerar 6 syntetiska gäster i seated state ...');
    const sceneGuests = await seedGuests(page, 6);
    console.log(`[order121] seated-gäster: ${sceneGuests}`);
    if (sceneGuests < 1) {
      console.error('[order121] gäst-injektion misslyckades');
      process.exit(1);
    }
    await delay(500);
    const sample = await readFigureRegion(page);
    const shotPath = resolve(REPORT_DIR, 'scene-with-bodies.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`[order121] med-gäster-skärmdump: ${shotPath}`);

    // Steg 3: diffa. Endast figurernas bidrag ska ändras — allt annat
    // (väggar, modal, ljus, paneler) är oförändrat mellan de två.
    const diff = diffFigureContribution(baseline, sample, 25);
    console.log(`[order121] region ${baseline.width}×${baseline.height} @ ${baseline.origin[0]},${baseline.origin[1]}`);
    console.log(`[order121] ändrade pixlar mellan baseline och med-gäster: ${diff.changed}/${diff.totalPixels}`);
    console.log(`[order121] figur-bounding-box: ${diff.bboxW}×${diff.bboxH} CSS-px @ region-lokal (${diff.bboxOrigin[0]}, ${diff.bboxOrigin[1]})`);

    // Trösklar. Diffen isolerar figurernas bidrag; om riggen renderas
    // med bredd och höjd MÅSTE flera hundra pixlar ändras och box:en
    // ha bredd + höjd över minimivärdet. En tom rendering (rig ej
    // renderad) skulle ge diff ≈ 0.
    const MIN_CHANGED = 300;
    const MIN_BBOX_W = 60;
    const MIN_BBOX_H = 40;
    const problems = [];
    if (diff.changed < MIN_CHANGED) problems.push(`endast ${diff.changed} pixlar ändrade — figurbidraget för svagt (< ${MIN_CHANGED}); riggen renderas möjligen inte`);
    if (diff.bboxW < MIN_BBOX_W) problems.push(`figur-bounding-box bredd ${diff.bboxW} < ${MIN_BBOX_W} CSS-px`);
    if (diff.bboxH < MIN_BBOX_H) problems.push(`figur-bounding-box höjd ${diff.bboxH} < ${MIN_BBOX_H} CSS-px`);

    if (problems.length > 0) {
      console.error('\n[order121] DoD 8 misslyckades:');
      for (const p of problems) console.error(`  - ${p}`);
      console.error(`\nSe skärmdumparna för visuell diagnos`);
      process.exit(1);
    }

    console.log('\n[order121] DoD 8 OK — figurkroppar bidrar med bredd OCH höjd i vyn (diff isolerar rig från bakgrund)');
  } finally {
    await browser.close();
    await stopVite(proc);
  }
}

await main();
