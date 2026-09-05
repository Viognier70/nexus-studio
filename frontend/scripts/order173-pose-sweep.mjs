#!/usr/bin/env node
// ORDER 173 §Pose sweep — prova myBusiness-liknande kamera vid olika
// pitch/yaw för att SE var interiören blir synlig i renderingen.
// Alla poser sätts direkt via URL-parametrar (`#focus=x,z&distance=d&
// yaw=r&pitch=r`) som CameraProvider läser via harnessCamera.
//
// Bekräftar/motbevisar hypotes: grannbyggnader vid låg pitch skymer
// ölkrogens footprint från kameran.

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

// Sex poser: två yaw-vinklar × tre pitch-vinklar. Alla samma focus + dist.
const POSES = [
  { name: 'pitch50_yaw0.4', pitchDeg: 50, yaw: 0.4 },   // Nuvarande myBusiness
  { name: 'pitch65_yaw0.4', pitchDeg: 65, yaw: 0.4 },
  { name: 'pitch78_yaw0.4', pitchDeg: 78, yaw: 0.4 },   // Max pitch (top-down)
  { name: 'pitch50_yaw0',   pitchDeg: 50, yaw: 0 },
  { name: 'pitch78_yaw0',   pitchDeg: 78, yaw: 0 },
  { name: 'pitch50_yaw3.14',pitchDeg: 50, yaw: Math.PI }, // Motsatt håll
];

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

async function shootPose(pose) {
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
    await delay(4000);

    const canvasHandle = await page.$('canvas');
    if (canvasHandle) {
      await canvasHandle.screenshot({ path: resolve(REPORT_DIR, `pose-${pose.name}.png`) });
    }
    const measurement = await page.evaluate(() => {
      const fn = window.__nxPlayerBusinessOpacityMeasure;
      return typeof fn === 'function' ? fn() : { error: 'hook-missing' };
    });
    return { pose, measurement };
  } finally {
    await page.close();
  }
}

try {
  const results = [];
  for (const pose of POSES) {
    console.log(`Shooting pose ${pose.name}...`);
    results.push(await shootPose(pose));
  }
  const out = resolve(REPORT_DIR, 'pose-sweep.json');
  writeFileSync(out, JSON.stringify({ focus: [FOCUS_X, FOCUS_Z], distance: DIST, results }, null, 2));
  console.log('\n=== Pose sweep resultat ===\n');
  for (const r of results) {
    console.log(`${r.pose.name.padEnd(22)} cam=${r.measurement.cameraDistanceM}m  roofOpacity=${r.measurement.roofOpacity}  screenshot=pose-${r.pose.name}.png`);
  }
  console.log(`\nRapport: ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
