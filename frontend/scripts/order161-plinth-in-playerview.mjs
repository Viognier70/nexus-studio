#!/usr/bin/env node
// ORDER 161 §DoD 5 — syns ORDER 159:s sockel från spelarens myBusiness-preset?
//
// myBusiness-preset landar kameran på dist 24 m / pitch 50° / yaw 0,4 /
// focus (31.6, -16.7) — se `frontend/src/strategic/camera/viewLevels.ts:105`.
// Vid dist 24 m är `restaurantRoofFadeMid − restaurantRoofFadeHalf − 4`, dvs
// klart under roof-fade-bandet. wallOpacity smoothstep:as till 0 där. ORDER
// 159 kopplade plinth-opacity till wallOpacity (§DoD 2), så förväntningen är
// att plinthen också fejdar till 0 i just den här vyn. Skriptet frågar den
// faktiska renderade opaciteten via `window.__nxPlayerBusinessPlinthMeasure()`
// (ORDER 161 utökade hooken med `plinthOpacity` + `wallOpacity`-fält) och
// skriver svaret till JSON — inget tal citeras i registerraden eller order-
// texten, per ORDER 160.
//
// Tröskeln VISIBILITY_THRESHOLD = 0,05 är dokumenterad här (inte i order-
// texten): under 5 % opacitet renderas materialet så genomskinligt att en
// spelare inte kan se det som en distinkt yta mot bakgrunden. Tröskeln är
// författad, inte kalibrerad — om Vision Owner senare bedömer att gränsen
// ska ligga annanstans är det en enda konstant att flytta.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order161');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const VISIBILITY_THRESHOLD = 0.05;

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

async function main() {
  const vite = await startVite();
  console.log(`Vite på ${vite.url}`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    // Ladda med preset=myBusiness i URL:en så CameraProvider startar kameran
    // exakt vid samma pose som spelaren landar på efter namn-inmatning
    // (NameEntryOverlay → jumpToPreset('myBusiness') per ORDER 157).
    // Ingen harness-camera override — vi mäter faktiska preset-poseringen.
    const bust = Date.now();
    await page.goto(
      `http://localhost:5173/?bust=${bust}#preset=myBusiness&playtest=1&business=restaurant&period=lunch`,
      { waitUntil: 'domcontentloaded' }
    );
    await waitForCanvas(page);
    // Sätt business-name via dev-hook så NameEntryOverlay avmonteras
    // (annars täcker den scenen och useFrame-uppdateringarna nödvändiga
    // för opacity-mätningen kan sakna varning).
    await page.evaluate(() => {
      const fn = window.__nxSetBusinessName;
      if (typeof fn === 'function') fn('Provspel');
    });
    // Låt kameran ease:a in på preset-target (dist 24 m). dampDistance
    // 1.6/sek från preset-start är trivial när starten redan ÄR preseten
    // — men vi väntar ändå några frames så useFrame har hunnit skriva
    // material-opacity minst en gång.
    await delay(1500);

    const measure = await page.evaluate(() => {
      const fn = window.__nxPlayerBusinessPlinthMeasure;
      if (typeof fn !== 'function') return { error: 'dev-hook saknas' };
      return fn();
    });

    const cameraState = await page.evaluate(() => {
      // Läs faktisk kameradistans så vi kan bevisa att preseten landade
      // där ORDER 157 fixen ska ta oss. Kameran är R3F-intern; vi når
      // den inte utan en dev-hook — men CameraContext.actualRef.current
      // finns i minnet. Utan ny hook approximerar vi via document.title
      // eller ViewLabel-badgen.
      const label = document.querySelector('.gb-viewlabel')?.textContent?.trim() ?? null;
      return { viewLabel: label };
    });

    const visibleFromMyBusiness =
      typeof measure.plinthOpacity === 'number' &&
      measure.plinthOpacity > VISIBILITY_THRESHOLD;

    const out = {
      cameraPreset: 'myBusiness',
      cameraPresetTargetDistanceM: 24,
      cameraPresetPitchRad: (50 * Math.PI) / 180,
      viewLabel: cameraState.viewLabel,
      plinthMeasure: measure,
      visibilityThreshold: VISIBILITY_THRESHOLD,
      visibleFromMyBusiness,
      finding:
        typeof measure.plinthOpacity !== 'number'
          ? 'plinthOpacity kunde inte läsas — dev-hook otillgänglig eller mesh omonterad'
          : visibleFromMyBusiness
            ? `plinth-opacity ${measure.plinthOpacity.toFixed(3)} > ${VISIBILITY_THRESHOLD} — sockeln syns från myBusiness-preset`
            : `plinth-opacity ${measure.plinthOpacity.toFixed(3)} ≤ ${VISIBILITY_THRESHOLD} — sockeln syns INTE från myBusiness-preset (kopplad till wall-fade per ORDER 159 §DoD 2). Detta är ett fynd, inte en bugg — se ORDER 161 §5.`
    };

    writeFileSync(
      resolve(REPORT_DIR, 'plinthInPlayerView.json'),
      JSON.stringify(out, null, 2)
    );
    console.log('  saved plinthInPlayerView.json');
    console.log('  finding:', out.finding);

    // Skärmdump för att kunna öga-verifiera situationen bredvid talet.
    await page.screenshot({
      path: resolve(REPORT_DIR, 'myBusiness-view.png'),
      fullPage: false
    });
  } finally {
    await browser.close();
    await stopVite(vite.proc);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
