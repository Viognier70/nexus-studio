#!/usr/bin/env node
// ORDER 127 §6 DoD 9 — ORDER 125:s uppskjutna DoD 8 körd i båda zoner
// + båda ljus. Följer ORDER 121/123-mönstret: diff-baserad mätning
// isolerar figurernas bidrag från bakgrunden.
//
// Efter ORDER 127 §3.3 (servitör bytt till #454a52) ska figurerna
// läsas mot ölkrogens tre golvzoner (dining/brew/kitchen) i både
// dagsljus (period=lunch) och kvällsljus (period=evening).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order127');
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

async function seedGuests(page, n) {
  await page.evaluate(() => {
    const w = /** @type any */ (window);
    w.__nxSimState.speed = 0;
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  });
  await delay(200);

  await page.evaluate((count) => {
    const w = /** @type any */ (window);
    const now = w.__nxSimState.simTime ?? 0;
    const fakeGuests = [];
    const fakeIds = [];
    for (let i = 0; i < count; i++) {
      const id = `dod9-gst-${i + 1}`;
      fakeGuests.push({
        id, state: 'seated', satisfaction: 0.7, seatIndex: i,
        arrivalTime: now, stateTime: now, scenarioSource: false,
        position: { x: 0, z: 0 }, targetPosition: { x: 0, z: 0 },
        moveProgress: 1, hadWelcomeDrink: true, lastCheckbackAt: null,
        walkAwayOnArrival: false, stayingOvernight: false
      });
      fakeIds.push(id);
    }
    w.__nxSimState.guests = [...(w.__nxSimState.guests ?? []), ...fakeGuests];
    w.__nxSimState.seatedIds = [...(w.__nxSimState.seatedIds ?? []), ...fakeIds];
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
  }, n);
  await delay(500);
}

async function readFigureRegion(page) {
  return page.evaluate(() => {
    const canvas = /** @type HTMLCanvasElement | null */ (document.querySelector('canvas'));
    if (!canvas) throw new Error('canvas not found');
    const cw = canvas.width;
    const ch = canvas.height;
    // Bredare region än ORDER 123 för att fånga figurer i brewpub-rummet
    // som ligger utspridda över byggnadens OBB.
    const xStart = Math.floor(cw * 0.05);
    const xEnd = Math.floor(cw * 0.55);
    const yStart = Math.floor(ch * 0.35);
    const yEnd = Math.floor(ch * 0.80);
    const rw = xEnd - xStart;
    const rh = yEnd - yStart;
    const off = document.createElement('canvas');
    off.width = rw;
    off.height = rh;
    const ctx = off.getContext('2d');
    if (!ctx) throw new Error('2D ctx unavailable');
    ctx.drawImage(canvas, xStart, yStart, rw, rh, 0, 0, rw, rh);
    const data = ctx.getImageData(0, 0, rw, rh).data;
    return { width: rw, height: rh, origin: [xStart, yStart], pixels: Array.from(data) };
  });
}

function diffFigureContribution(baseline, sample, delta) {
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
  return {
    changed,
    bboxW: maxX >= 0 ? (maxX - minX + 1) : 0,
    bboxH: maxY >= 0 ? (maxY - minY + 1) : 0,
    totalPixels: rw * rh
  };
}

async function measurePeriod(browser, url, period, label) {
  console.log(`\n[order127] === ölkrogen ${label} (period=${period}) ===`);
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    await page.goto(`${url}/#playtest=1&business=ölkrogen&preset=business&period=${period}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
      null, { timeout: 60000 }
    );
    await delay(500);

    await page.evaluate(() => {
      const w = /** @type any */ (window);
      w.__nxSimState.speed = 0;
      w.__nxSimDispatch({ type: 'SET_CASH', valueSek: w.__nxSimState.cash });
    });
    await delay(300);

    console.log(`[order127] baseline utan gäster ...`);
    const baseline = await readFigureRegion(page);
    const baselinePath = resolve(REPORT_DIR, `brewpub-baseline-${period}.png`);
    await page.screenshot({ path: baselinePath });

    console.log(`[order127] injicerar 6 gäster ...`);
    await seedGuests(page, 6);
    const sample = await readFigureRegion(page);
    const samplePath = resolve(REPORT_DIR, `brewpub-with-bodies-${period}.png`);
    await page.screenshot({ path: samplePath });

    const diff = diffFigureContribution(baseline, sample, 25);
    console.log(`[order127] ${label} figur-diff: ${diff.changed}/${diff.totalPixels} pixlar, bbox ${diff.bboxW}×${diff.bboxH}`);
    console.log(`[order127] skärmdumpar: ${baselinePath} + ${samplePath}`);

    return diff;
  } finally {
    await page.close();
  }
}

async function main() {
  const { proc, url } = await startVite();
  const browser = await chromium.launch();
  const results = {};
  try {
    results.lunch = await measurePeriod(browser, url, 'lunch', 'DAGSLJUS');
    results.evening = await measurePeriod(browser, url, 'evening', 'KVÄLLSLJUS');
  } finally {
    await browser.close();
    await stopVite(proc);
  }

  console.log('\n[order127] resultat:');
  const MIN_CHANGED = 300;
  const MIN_BBOX_W = 60;
  const MIN_BBOX_H = 40;
  let failed = false;
  for (const [period, diff] of Object.entries(results)) {
    const problems = [];
    if (diff.changed < MIN_CHANGED) problems.push(`ändrade pixlar ${diff.changed} < ${MIN_CHANGED}`);
    if (diff.bboxW < MIN_BBOX_W) problems.push(`bbox bredd ${diff.bboxW} < ${MIN_BBOX_W}`);
    if (diff.bboxH < MIN_BBOX_H) problems.push(`bbox höjd ${diff.bboxH} < ${MIN_BBOX_H}`);
    if (problems.length === 0) {
      console.log(`  ${period}: PASS (${diff.changed} pixlar, ${diff.bboxW}×${diff.bboxH})`);
    } else {
      failed = true;
      console.log(`  ${period}: FAIL`);
      for (const p of problems) console.log(`    - ${p}`);
    }
  }
  if (failed) {
    console.error('\n[order127] DoD 9 misslyckades');
    process.exit(1);
  }
  console.log('\n[order127] DoD 9 OK — ölkrogen läser figurer i både dagsljus och kvällsljus');
}

await main();
