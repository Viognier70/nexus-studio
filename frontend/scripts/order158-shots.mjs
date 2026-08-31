#!/usr/bin/env node
// ORDER 158 §DoD 5 — skärmdumpar av de två VO-vyerna + Kyrkogatans stub.
//
// Kör två gånger: en gång på main (BEFORE, ingen guard) och en gång på
// order-158 (AFTER, guarden aktiv). Detta script är checkoutagnostiskt
// och skriver till suffixet i argv[2] så samma poser landar bredvid
// varandra:
//
//   node scripts/order158-shots.mjs before
//   node scripts/order158-shots.mjs after
//
// Poser (Vision Owner:s "två vyer" + user-ask 2026-08-31):
//   1) kyrkogatan-stub.png   — junction Torget SV, Kyrkogatans nordspur
//      genom vw-torget-kyrkbacken-pair. User vill se om stub-en är
//      "inuti en annan väg" — svaret är: Prästgatan, Smedsgatan och
//      w1239628612 Kyrkogatan möts alla vid (-28.9, -31.95) men går
//      olika håll; stub-en är Kyrkogatans egen nordlängd, inte
//      dubbel data.
//   2) torget-east-barn.png  — vw-torget-east-barn @ (65, 15), 3.48m
//      intrusion i living_street. "Den stora röda längan tvärs över
//      gaturummet" ur ORDER 130 §3.1-fyndet.
//   3) hole-in-street.png    — en av de 11 splittade gatorna, valt
//      Smedsgatan (w860753012) som ORDER 158-mätningen visade blir
//      2→3 pieces. Illustrerar "gata med hål mitt i".

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order158');
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
// Dismisser + panel-hider — annars täcker NameEntryOverlay och de
// vänster/höger-panelerna byområdet vi vill se. `__nxSetBusinessName`
// är dev-hooken i BusinessContext.tsx:74; sätter namnet direkt,
// overlayen avmonteras. CSS-injektionen döljer HUD-panelerna vid
// snapshot-tillfället — behåller bara canvas + label.
async function dismissChrome(page) {
  await page.evaluate(() => {
    const fn = (window).__nxSetBusinessName;
    if (typeof fn === 'function') fn('Provspel');
    // Panelerna använder inline `style`, inte klassnamn — CSS-mål via
    // klass funkar inte. Enda stabilen är att gömma alla direkta
    // barn till `.gb-root` utom `.gb-canvas-host`. Overlays som
    // NameEntryOverlay / SelectionChrome monteras också som direkt
    // barn så samma svep tar dem.
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

async function main() {
  const vite = await startVite();
  console.log(`Vite på ${vite.url}, suffix="${suffix}"`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    // 1) Kyrkogatans stub — junctionen vid (-30.7, -38.96) samt
    //    vw-torget-kyrkbacken-pair. Pitch 55° så både byggnad och
    //    gatuomgivning syns tydligt. Distans 45m fångar hela
    //    T-korsningen: Prästgatan NE, Smedsgatan N, Kyrkogatans nordspur
    //    (den som försvinner) SV genom huset, Kyrkogatan södergående.
    await shot(page, vite.url,
      `#playtest=1&business=restaurant&period=lunch&focus=-30.7,-38.96&distance=45&yaw=0.2&pitch=0.96`,
      resolve(REPORT_DIR, `kyrkogatan-stub-${suffix}.png`)
    );
    // 2) vw-pra-19n @ (382.9, 28.6) — värsta envelope-överlapp per
    //    ORDER 135 (4,36 m in i main road envelope). Ersätter
    //    torget-east-barn som föll i skugga. Distans 55 m ger plats för
    //    både byggnad och kolliderande huvudväg; högre pitch (0,95 rad
    //    = 54°) undviker sydvägg-skuggan som drabbade förra vinkeln.
    await shot(page, vite.url,
      `#playtest=1&business=restaurant&period=lunch&focus=382.9,28.6&distance=55&yaw=0.8&pitch=0.95`,
      resolve(REPORT_DIR, `pra-19n-${suffix}.png`)
    );
    // 3) Split-fall — Smedsgatan (w860753012). Segmentet startar
    //    (-19.89, 26.62), går söderut till (-28.9, -31.95). ORDER 158-
    //    mätningen visade 2→3 pieces. Fokus på mitten av polylinjen.
    await shot(page, vite.url,
      `#playtest=1&business=restaurant&period=lunch&focus=-24,-3&distance=60&yaw=0.3&pitch=0.85`,
      resolve(REPORT_DIR, `hole-in-street-${suffix}.png`)
    );
  } finally {
    await browser.close();
    await stopVite(vite.proc);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
