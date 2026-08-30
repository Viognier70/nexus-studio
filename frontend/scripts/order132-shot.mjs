#!/usr/bin/env node
// ORDER 132 §4-punkt 5 — samma vy som ORDER 130 (w193810921, universitetet
// med 36 m fönsteröverhäng). Kör två gånger: en gång utan guard (guard
// stashad), en gång med. Argv[2] = suffix ('before' | 'after').

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order132');
mkdirSync(REPORT_DIR, { recursive: true });

const suffix = process.argv[2];
if (!suffix || !['before', 'after'].includes(suffix)) {
  console.error('usage: node order132-shot.mjs <before|after>');
  process.exit(1);
}

const VIEWPORT = { width: 1920, height: 1080 };
// Samma koordinater som ORDER 130 worst-window-outside.png
const FOCUS_X = 406.97;
const FOCUS_Z = -89.24;
const DISTANCE = 80;
const YAW = 0.4;
const PITCH = 0.5;

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
  await delay(2000);
  const out = resolve(REPORT_DIR, `worst-window-${suffix}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log('saved', out);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
