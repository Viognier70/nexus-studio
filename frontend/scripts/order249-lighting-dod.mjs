#!/usr/bin/env node
// ORDER 249 DoD — skärmdump middag seed=42 vid t≈130 s + medelluminans
// i matsalens område. Kör i två pass:
//   pass A: efter fixarna (§1 + §2). URL: default (light≠day).
//   pass B: samma sim men med `light=day`. Verifierar §1.
//
// Luminance samplas via en 2D-canvas i browser-context (page.evaluate)
// från screenshot base64 → getImageData över mittens 1/3 → medel RGB.
// Undviker ny Node-dep (pngjs/sharp) per CLAUDE.md §Kommandon.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO_ROOT = resolve(FRONTEND, '..');
const REPORT_DIR = resolve(REPO_ROOT, 'frontend/reports/order249');
mkdirSync(REPORT_DIR, { recursive: true });
const VIEWPORT = { width: 1280, height: 720 };

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function shotAtT130(hashSuffix, label) {
  const vite = await startVite();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  const bust = Date.now();
  // Explicit fokus + tight distance så matsalens interior fyller centrala
  // ROI:n. myBusiness-presetet (24 m, pitch 50°) visar en översikt av
  // hela kvarteret där matsalen bara upptar ~1/9 av bilden — då drunknar
  // ljus/mörker i matsalen i pixel-mängden runt. focus/distance-override
  // via harnessParams-URL (samma mönster som visual-regression harness).
  await page.goto(
    `${vite.url}/?bust=${bust}#playtest=1&seed=42&start=dinner15&business=kvarterskrogen&focus=31.6,-16.7&distance=14&yaw=0.4&pitch=0.6${hashSuffix}`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);
  try {
    await page.fill('input[type=text]', 'ORDER 249');
    await page.click('button[type=submit]');
    await delay(2000);
  } catch {}
  // Kameran är redan på override-fokus via URL (focus=/distance=/yaw=/pitch=).
  // jumpToPreset skulle ha lyft ut oss ur den — hoppar därför inte.
  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }));
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => window.__nxSimState.simTime);
    if (t >= 130) break;
    await delay(300);
  }
  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 0 }));
  await delay(600);
  const shotPath = resolve(REPORT_DIR, `dinner-t130-${label}-1280x720.png`);
  const buf = await page.screenshot({ path: shotPath, fullPage: false });
  const base64 = buf.toString('base64');

  // Mät luminans i browser-context: ladda screenshot som Image → 2D
  // canvas → getImageData över mitten 1/3. Undviker Node PNG-dep.
  const lum = await page.evaluate(async (dataUrl) => {
    return await new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const cnv = document.createElement('canvas');
        cnv.width = img.width;
        cnv.height = img.height;
        const ctx = cnv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const roiW = Math.floor(img.width / 3);
        const roiH = Math.floor(img.height / 3);
        const x0 = Math.floor((img.width - roiW) / 2);
        const y0 = Math.floor((img.height - roiH) / 2);
        const data = ctx.getImageData(x0, y0, roiW, roiH).data;
        let sumR = 0, sumG = 0, sumB = 0;
        const n = roiW * roiH;
        for (let i = 0; i < data.length; i += 4) {
          sumR += data[i]; sumG += data[i+1]; sumB += data[i+2];
        }
        const meanR = sumR / n, meanG = sumG / n, meanB = sumB / n;
        const meanY = 0.2126 * meanR + 0.7152 * meanG + 0.0722 * meanB;
        res({
          meanY, meanR, meanG, meanB,
          roi: { x: x0, y: y0, w: roiW, h: roiH }
        });
      };
      img.src = 'data:image/png;base64,' + dataUrl;
    });
  }, base64);

  console.log(`  [${label}] shot: ${shotPath}`);
  console.log(`  [${label}] ROI ${lum.roi.w}×${lum.roi.h} @ (${lum.roi.x},${lum.roi.y}): meanY=${lum.meanY.toFixed(1)} (R=${lum.meanR.toFixed(1)} G=${lum.meanG.toFixed(1)} B=${lum.meanB.toFixed(1)})`);
  await browser.close();
  if (vite.proc) vite.proc.kill('SIGTERM');
  await delay(1000);
  return { shotPath, lum };
}

console.log('Pass A: default lighting (light≠day) — IndoorLamps aktiva');
const passA = await shotAtT130('', 'lamps-on');

console.log('\nPass B: light=day — dev-override till lunch-timme 12:30');
const passB = await shotAtT130('&light=day', 'light-day');

const summary = {
  passA: { label: 'lamps-on (default lighting, IndoorLamps aktiva under middag)', ...passA.lum },
  passB: { label: 'light=day (dev-override till lunch-timme 12:30)', ...passB.lum }
};
writeFileSync(resolve(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('\nSummary:');
console.log(`  passA meanY = ${passA.lum.meanY.toFixed(1)}  (default lighting med IndoorLamps)`);
console.log(`  passB meanY = ${passB.lum.meanY.toFixed(1)}  (light=day tvingar dagsljus)`);
console.log(`  📁 ${REPORT_DIR}/summary.json`);
