#!/usr/bin/env node
// ORDER 130 §4 — tre skärmdumpar från den procedurella byn.
//
//   1) village-overview.png — hela byn uppifrån
//   2) worst-house-vs-road.png — närbild av värsta hus-vs-väg-fallet
//      per `reports/order130/monster.json.buildingsVsRoads.worstOffenders[0]`
//   3) worst-window-outside.png — närbild av värsta fönster-överhänget
//      per `reports/order130/monster.json.windowFailures.worstOffenders[0]`
//
// Bilderna checkas in i `frontend/reports/order130/` så en läsare kan
// se det mätningen mäter utan att köra dev-servern. Ingen assertion —
// mätningen bevisar felen numeriskt; skärmdumparna är för att jag ska
// kunna se det du mätt.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order130');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) return { proc: null, url };
  } catch { /* not up */ }
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND,
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

async function waitForCanvas(page) {
  // Samma mönster som ORDER 121-scriptet — playtest-hookarna dyker upp
  // först efter att StrategicApp mountats, canvas därefter.
  await page.waitForFunction(
    () =>
      typeof window.__nxSimDispatch === 'function' &&
      document.querySelector('canvas') !== null,
    null,
    { timeout: 60000 }
  );
  // Låt scenen resa sig (byggnaderna + fasaderna renderas i R3F).
  await delay(1500);
}

async function shot(page, url, hash, outPath) {
  await page.goto(url + '/' + hash, { waitUntil: 'domcontentloaded' });
  await waitForCanvas(page);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`  saved ${outPath}`);
}

async function main() {
  const monster = JSON.parse(
    readFileSync(resolve(REPORT_DIR, 'monster.json'), 'utf8')
  );
  const worstRoad = monster.buildingsVsRoads.worstOffenders[0];
  const worstWin = monster.windowFailures.worstOffenders[0];
  console.log('Värsta hus-vs-väg:', worstRoad.buildingId, 'centre=', worstRoad.centre);
  console.log('Värsta fönster:  ', worstWin.buildingId, 'centre=', worstWin.centre, 'outward=', worstWin.worstOutwardM, 'm');

  const vite = await startVite();
  console.log(`Vite körs på ${vite.url}`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  try {
    // 1. Översikt: kamera högt över byn, tittar nästan lodrätt.
    //    focus=0,0, distance=1200 (byn spänner ca −500..+500 i XZ,
    //    behöver plats för perspektiv), yaw=0, pitch=1.35 (78°
    //    är PITCH_MAX i GRAY_BOX_CAMERA — ORDER 068 låser den för
    //    att pose-buggarna 067 avslöjade inte ska tystas bort).
    await shot(
      page,
      vite.url,
      '#playtest=1&business=restaurant&focus=0,0&distance=1200&yaw=0&pitch=1.35',
      resolve(REPORT_DIR, 'village-overview.png')
    );

    // 2. Närbild på värsta hus-vs-väg (vw-torget-east-barn @ ~65,15,
    //    3.48 m intrusion i living_street). Distans 40 m så
    //    både huset och den skärande vägen syns; låg pitch så vi ser
    //    överlappet från snedbild.
    const [rx, rz] = worstRoad.centre;
    await shot(
      page,
      vite.url,
      `#playtest=1&business=restaurant&focus=${rx},${rz}&distance=40&yaw=0.6&pitch=0.7`,
      resolve(REPORT_DIR, 'worst-house-vs-road.png')
    );

    // 3. Närbild på värsta fönster-överhäng (university @ ~407,-89,
    //    36 m outward — en industri- eller L-formad polygon där OBB-
    //    facen ligger 36 m från fasaden). Distans 80 m så vi ser hela
    //    byggnaden + fönsterhänget.
    const [wx, wz] = worstWin.centre;
    await shot(
      page,
      vite.url,
      `#playtest=1&business=restaurant&focus=${wx},${wz}&distance=80&yaw=0.4&pitch=0.5`,
      resolve(REPORT_DIR, 'worst-window-outside.png')
    );
  } finally {
    await browser.close();
    await stopVite(vite.proc);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
