#!/usr/bin/env node
// ORDER 159 §DoD 3 — verifiera att plinthen renderas och att
// PlayerBusiness möter marken.
//
// Två saker skrivs till `reports/order159/`:
//
//   plinthMeasure.json — output från `window.__nxPlayerBusinessPlinthMeasure()`
//                        (PlayerBusiness dev-hook). Fältet `heightM` är
//                        det verifierande talet för sockelhöjden — läst
//                        ur three.js-scenens Box3.setFromObject(plinthMesh),
//                        inte ur PLINTH_HEIGHT_M-konstanten. Per ORDER 160.
//
//   plinth-{low,mid}-{before,after}.png — fyra skärmdumpar.
//     low  = distans 25 m, pitch 0.35 rad (≈20°) — snedbild som visar
//            var väggens fot möter marken. Samma vinkel som provspel-
//            skärmdumpen 2026-08-31 (låg pitch, byggnads-bas i fokus).
//     mid  = distans 80 m, pitch 0.7 rad (40°) — kontrollvy där hela
//            byggnaden är solid (ovanför restaurantInteriorFadeMid+half
//            = 75 m, så väggen är fullopak och plinthen ska synas som
//            stenbas runt hela huset).
//
// Kör två gånger: en gång på main (`suffix=before`) för före-bilden och
// en gång på order-159 (`suffix=after`) för efter. Före/efter-strategin
// samma som ORDER 158-shots.mjs. Verifikationstalet plinthMeasure.json
// skrivs bara vid 'after' — dev-hooken existerar inte i main-versionen.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order159');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const suffix = process.argv[2] || 'shot';

async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) return { proc: null, url };
  } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}
async function stopVite(proc) {
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res());
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(); }, 3000);
  });
}
async function waitForCanvas(page) {
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);
}
async function dismissChrome(page) {
  await page.evaluate(() => {
    const fn = window.__nxSetBusinessName;
    if (typeof fn === 'function') fn('Provspel');
    const style = document.createElement('style');
    style.textContent = `
      .gb-root > *:not(.gb-canvas-host) { display: none !important; }
      .business-name-overlay { display: none !important; }
    `;
    document.head.appendChild(style);
  });
  await delay(400);
}
async function shot(page, url, hash, out) {
  const bust = Date.now();
  await page.goto(url + '/?bust=' + bust + hash, { waitUntil: 'domcontentloaded' });
  await waitForCanvas(page);
  await dismissChrome(page);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  saved ${out}`);
}
async function measure(page, url, hash) {
  const bust = Date.now();
  await page.goto(url + '/?bust=' + bust + hash, { waitUntil: 'domcontentloaded' });
  await waitForCanvas(page);
  await dismissChrome(page);
  // Vänta ytterligare en frame så plinthMeshRef är monterad + world-matrix uppdaterad.
  await delay(800);
  const result = await page.evaluate(() => {
    const fn = window.__nxPlayerBusinessPlinthMeasure;
    if (typeof fn !== 'function') return { error: 'dev-hook saknas — förmodligen not-DEV eller PlayerBusiness inte monterad' };
    return fn();
  });
  return result;
}

async function main() {
  const vite = await startVite();
  console.log(`Vite på ${vite.url}, suffix="${suffix}"`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    // PLAYER_BUSINESS_CENTROID från viewLevels.ts:40 = (31.6, -16.7).
    // Vinkeln "provspel 2026-08-31" var låg-pitch, byggnads-bas i fokus.
    const F = 'focus=31.6,-16.7';

    // Ground = distans 55 m, pitch 0.35 rad (≈20°). Distansen är precis
    // över roof-fade-bandet (52 m = restaurantRoofFadeMid+half) så väggen
    // är fullopak — vilket är precis den zonen där svävande-låda-felet
    // syns i provspelet. Låg pitch så väggens fot mot marken är i fokus.
    // Detta är vinkeln plinthen ska verifieras vid.
    await shot(page, vite.url,
      `#playtest=1&business=restaurant&period=lunch&${F}&distance=55&yaw=0.4&pitch=0.35`,
      resolve(REPORT_DIR, `plinth-ground-${suffix}.png`)
    );

    // Context = distans 80 m, pitch 0.7 rad (40°). Bredare vy där
    // byggnaden syns i kvarterssammanhang; kompletterar ground-shot
    // med en mätning-oberoende kontrollvy att spelaren inte tappat
    // sig i förhållande till grannarna.
    await shot(page, vite.url,
      `#playtest=1&business=restaurant&period=lunch&${F}&distance=80&yaw=0.4&pitch=0.7`,
      resolve(REPORT_DIR, `plinth-context-${suffix}.png`)
    );

    // Mät plinth-boxen om vi kör efter-versionen (dev-hooken finns
    // bara i order-159; på main returnerar den {error}). Skriv oavsett
    // så after-body syns i git — det är det verifierande talet.
    if (suffix === 'after') {
      // Måste vara nära nog för att PlayerBusiness ska mounta (den
      // renderas alltid i StrategicScene men mätningen fungerar på
      // vilken kamera-pose som helst — vi tar den senaste). Läs
      // ändå från en distans där byggnaden garanterat renderas.
      const meas = await measure(page, vite.url,
        `#playtest=1&business=restaurant&period=lunch&${F}&distance=55&yaw=0.4&pitch=0.35`
      );
      writeFileSync(
        resolve(REPORT_DIR, 'plinthMeasure.json'),
        JSON.stringify(meas, null, 2)
      );
      console.log('  saved plinthMeasure.json:', JSON.stringify(meas));
    }
  } finally {
    await browser.close();
    await stopVite(vite.proc);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
