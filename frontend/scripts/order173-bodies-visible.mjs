#!/usr/bin/env node
// ORDER 173 §Bodies — testar SD-004 §3-kravet: "kroppar i rummet" vid
// myBusiness-vyn. Skickar OPEN_SERVICE lunch, ticker sim till EFTER
// doors-open (så gäster spawnar), tar canvas-screenshot vid två pose:er:
//   1. Nuvarande myBusiness (pitch 50°, yaw 0.4)
//   2. Top-down (pitch 78°, yaw 0)
//
// Läser också InteriorGuests + InteriorStaff visible-flaggan via
// scen-traversal (grupperna har inget namn så vi hittar via mesh-typ).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order173');
mkdirSync(REPORT_DIR, { recursive: true });

const FOCUS_X = 31.6;
const FOCUS_Z = -16.7;
const DIST = 24;

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch('http://localhost:5173/');
      if (r.ok || r.status === 304) return proc;
    } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();

async function shootWithBodies(pose) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    const pitchRad = (pose.pitchDeg * Math.PI) / 180;
    const url = `http://localhost:5173/?bust=${Date.now()}`
      + `#playtest=1&business=brewpub&period=lunch`
      + `&focus=${FOCUS_X},${FOCUS_Z}&distance=${DIST}&yaw=${pose.yaw}&pitch=${pitchRad}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
      null, { timeout: 60000 }
    );
    await page.waitForFunction(() => typeof window.__nxSetBusinessName === 'function', null, { timeout: 20000 });
    await page.evaluate(() => window.__nxSetBusinessName('Ölkrogen'));
    await delay(2500);

    // Öppna service och kör TICK tills gäster spawnat (efter doors-open).
    await page.evaluate(() => {
      window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 15 });
    });
    await delay(300);
    await page.evaluate(() => { window.__nxSimState.speed = 0; });
    // Ticker till elapsed ~= 200s (efter doors-open vid 130s, gäster spawnat).
    for (let i = 0; i < 240; i++) {
      await page.evaluate(() => {
        for (let j = 0; j < 5; j++) window.__nxSimDispatch({ type: 'TICK', dt: 0.2 });
      });
    }
    await delay(500);

    // Snapshot state + hook + screenshot.
    const state = await page.evaluate(() => {
      const s = window.__nxSimState;
      const bs = {};
      for (const g of (s.guests || [])) bs[g.state] = (bs[g.state] || 0) + 1;
      return {
        simTime: s.simTime,
        periodStartAt: s.day && s.day.periodStartAt,
        doorsOpenAt: s.day && s.day.doorsOpenAt,
        doorsOpenedThisService: s.day && s.day.doorsOpenedThisService,
        guestsTotal: (s.guests || []).length,
        guestStateCounts: bs,
        staffCount: (s.staff || []).length,
        staffTasks: (s.staff || []).map((st) => ({ role: st.role, taskType: st.taskType }))
      };
    });
    const opacity = await page.evaluate(() => {
      const fn = window.__nxPlayerBusinessOpacityMeasure;
      return typeof fn === 'function' ? fn() : { error: 'hook-missing' };
    });

    const canvasHandle = await page.$('canvas');
    if (canvasHandle) {
      await canvasHandle.screenshot({ path: resolve(REPORT_DIR, `bodies-${pose.name}.png`) });
    }
    return { pose, state, opacity };
  } finally {
    await page.close();
  }
}

try {
  const results = [];
  for (const pose of [
    { name: 'pitch50_yaw0.4', pitchDeg: 50, yaw: 0.4 },
    { name: 'pitch78_yaw0',   pitchDeg: 78, yaw: 0 }
  ]) {
    console.log(`Shooting bodies ${pose.name}...`);
    results.push(await shootWithBodies(pose));
  }
  const out = resolve(REPORT_DIR, 'bodies-visible.json');
  writeFileSync(out, JSON.stringify({ focus: [FOCUS_X, FOCUS_Z], distance: DIST, results }, null, 2));

  console.log('\n=== ORDER 173 §Bodies ===\n');
  for (const r of results) {
    console.log(`Pose: ${r.pose.name}`);
    console.log(`  elapsed:              ${r.state.simTime - r.state.periodStartAt}s`);
    console.log(`  doorsOpenedThisService:${r.state.doorsOpenedThisService}`);
    console.log(`  guestsTotal:          ${r.state.guestsTotal}`);
    console.log(`  guestStateCounts:     ${JSON.stringify(r.state.guestStateCounts)}`);
    console.log(`  staffTasks:           ${JSON.stringify(r.state.staffTasks)}`);
    console.log(`  cam=${r.opacity.cameraDistanceM}m  roof=${r.opacity.roofOpacity}  interiorMeshesWithOpacityGt0=${r.opacity.interiorMeshesWithOpacityGt0}/${r.opacity.interiorMeshCount}`);
    console.log('');
  }
  console.log(`Rapport: ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
