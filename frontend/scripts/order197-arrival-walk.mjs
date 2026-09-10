#!/usr/bin/env node
// ORDER 197 — filma ankomster efter fix så walk-in blir synligt.
//
// Rörelse går inte att bedöma på stillbild (VO 2026-09-10). Skriptet
// spelar in 15 realtidssekunder av spelet efter att första kohorten
// hunnit landa: nya ankomster startar från arrival-arc, promenerar
// via entrance-waypoint till bord, sitter ner (blend + yaw
// interpolerar under sista 0,6 m).
//
// Utdata:
//   frontend/reports/order197/arrival-walk.webm — 15 s @ 1920×1080
//
// Kör:  node frontend/scripts/order197-arrival-walk.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readdirSync, renameSync, existsSync, statSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order197');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const RECORDING_SECONDS = 15;

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
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

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: REPORT_DIR, size: VIEWPORT }
});
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

let videoPath = null;

try {
  // 1) Ladda ölkrogen, lunch.
  const bust = Date.now();
  await page.goto(
    `${vite.url}/?bust=${bust}#playtest=1&business=olkrogen&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  // 2) Namn → Enter → jumpToPreset('myBusiness').
  await page.fill('input[type=text]', 'ORDER 197 arrival walk');
  await page.click('button[type=submit]');
  await delay(3500);

  // 3) Öppna lunch + accelerera till speed=8 för att ta oss förbi
  //    prep-fasen (130 s sim) snabbt.
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });

  // Vänta tills första gäst faktiskt spawnats (guest.length > 0). Vid
  // speed=8 kommer detta ta ~25 real-sek (200 sim-sek).
  await page.waitForFunction(
    () => (window.__nxSimState?.guests?.length ?? 0) > 0,
    null, { timeout: 60000 }
  );
  // Vänta ytterligare tills första kohorten sitter (så vi ser NÄSTA
  // vågs walk-in i inspelningen, inte den första som redan hunnit sätta
  // sig medan vi accelererade).
  await page.waitForFunction(
    () => {
      const s = window.__nxSimState;
      if (!s?.guests) return false;
      return s.guests.filter((g) => g.state === 'seated' || g.state === 'dining' || g.state === 'ordering').length >= 3;
    },
    null, { timeout: 60000 }
  );

  // 4) Sänk speed till 1 så walk-in-rörelsen blir synlig i naturlig
  //    takt under inspelningen.
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 });
  });
  await delay(500);

  // 5) Spela in 15 realtidssekunder — under den perioden anländer
  //    typisk 2-5 gäster till ölkrogen (lunch-arrival-rate ~1/6 sim-sek
  //    vid trafikläge normal, se arrivals.ts). Vi behöver bara se att
  //    varje ny gäst går in från arrival-arc, inte teleporterar sig
  //    till bordet i sittställning.
  console.log(`Spelar in ${RECORDING_SECONDS} s...`);
  await delay(RECORDING_SECONDS * 1000);

} finally {
  await context.close(); // triggar video-write
  await browser.close();
  await stopVite(vite.proc);
}

// Playwright namnger .webm slumpmässigt — döp om till förutsägbart namn.
const files = readdirSync(REPORT_DIR).filter((f) => f.endsWith('.webm'));
if (files.length === 0) {
  throw new Error(`Ingen .webm skrevs till ${REPORT_DIR}`);
}
// Ta den nyaste (senaste playwright-video:n är denna körnings).
files.sort((a, b) =>
  statSync(resolve(REPORT_DIR, b)).mtimeMs - statSync(resolve(REPORT_DIR, a)).mtimeMs
);
const src = resolve(REPORT_DIR, files[0]);
videoPath = resolve(REPORT_DIR, 'arrival-walk.webm');
if (existsSync(videoPath)) {
  const { unlinkSync } = await import('node:fs');
  unlinkSync(videoPath);
}
renameSync(src, videoPath);

const st = statSync(videoPath);
console.log(`\n✔  ${videoPath}`);
console.log(`   ${st.size} bytes (mtime ${st.mtime.toISOString()})`);
if (st.size < 100_000) {
  throw new Error(`Video är misstänkt liten (${st.size} bytes) — troligen tom sista frame`);
}
