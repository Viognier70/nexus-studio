#!/usr/bin/env node
// ORDER 136 §2.4 — skärmdump av samma vy vid CURRENT/ALT_A/ALT_B.
// Argv[2] = etikett (används som filnamnssuffix).
//
// Roadrolls patchas i arbetsträdet mellan körningar (inte committat).
// Vy: värsta-fallet-vy från ORDER 135 (Prästgatan-området) i medium-
// avstånd så flera fall syns samtidigt.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order136');
mkdirSync(REPORT_DIR, { recursive: true });

const suffix = process.argv[2];
if (!suffix) { console.error('usage: node order136-shot.mjs <label>'); process.exit(1); }

const VIEWPORT = { width: 1920, height: 1080 };
// Prästgatan / Lokavägen-området — där worst-fallet vw-pra-19n sitter.
// Distans 150m, pitch 1.0 (~57°), yaw 0 så man ser Lokavägen dra
// diagonalt genom kvartershjärtat.
const FOCUS_X = 380;
const FOCUS_Z = 15;
const DISTANCE = 150;
const YAW = 0.3;
const PITCH = 1.0;

async function startVite() {
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
      const r = await fetch('http://localhost:5173/');
      if (r.ok || r.status === 304) return proc;
    } catch { /* not up */ }
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
try {
  const url = `http://localhost:5173/#playtest=1&business=restaurant&focus=${FOCUS_X},${FOCUS_Z}&distance=${DISTANCE}&yaw=${YAW}&pitch=${PITCH}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null,
    { timeout: 60000 }
  );
  await delay(2500);
  const out = resolve(REPORT_DIR, `roads-${suffix}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log('saved', out);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
