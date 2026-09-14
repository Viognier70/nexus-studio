#!/usr/bin/env node
// ORDER 217 (C3 §3.2) — video-verifiering av staff-walkPath-routing.
//
// VO 2026-09-14: "Verifiera med VIDEO, minst 30 sekunder. Det här är
// första gången något ska synas — pixeltal duger inte."
//
// Skriptet spelar in en webm-fil per klass. Sekvens:
//   1. Öppna vite på 5173.
//   2. Playwright context med recordVideo.
//   3. Navigera till #playtest=1&business=<klass>, öppna 20-min lunch,
//      speed=8 tills prep + första gäst-cohorten laddat (25 s realtid).
//   4. Byt till speed=1 och spela in 40 s realtid.
//   5. Stäng — webm sparas i $TMPDIR/nexus-order217-<ts>/<klass>.webm.
//
// Rapporten som skrivs till stdout inkluderar full filsökväg så VO kan
// öppna filen direkt (CLAUDE.md Observation 7 §342 — artefakter ska
// alltid kvalificeras med lokation).
//
// Klasser: ölkrogen + kvarterskrogen. Långborden i ölkrogen är den
// specifika VO-oro; kvarterskrogen har bord i mitten som samma path-
// routing skirtar.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, renameSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(tmpdir(), `nexus-order217-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const WARMUP_MS = 25000;
const RECORD_MS = 40000;

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

async function recordClass(browser, viteUrl, businessArg) {
  const classVideoDir = resolve(REPORT_DIR, businessArg);
  mkdirSync(classVideoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: classVideoDir, size: VIEWPORT }
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  const bust = Date.now();
  await page.goto(
    `${viteUrl}/?bust=${bust}#playtest=1&business=${businessArg}&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  await page.fill('input[type=text]', 'ORDER 217 ' + businessArg);
  await page.click('button[type=submit]');
  await delay(2500);

  await page.evaluate(() => {
    // Kamera till kvarters- eller närkameraläge så staff-rörelserna syns.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
  });

  await delay(WARMUP_MS);

  await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
  console.log(`  [${businessArg}] speed=1, spelar in ${RECORD_MS / 1000} s...`);

  await delay(RECORD_MS);

  await page.close();
  await context.close(); // trigger video-file finalize

  // Playwright ger webm slumpmässigt namn — hitta första .webm i dir och
  // döp om till business.webm.
  const files = readdirSync(classVideoDir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) {
    return { business: businessArg, videoPath: null, ok: false };
  }
  const src = resolve(classVideoDir, files[0]);
  const dst = resolve(REPORT_DIR, `${businessArg}.webm`);
  renameSync(src, dst);
  return { business: businessArg, videoPath: dst, ok: true };
}

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
console.log(`Rapport → ${REPORT_DIR}`);

const browser = await chromium.launch();
const results = [];
try {
  for (const cls of ['olkrogen', 'kvarterskrogen']) {
    console.log(`\n== ${cls} ==`);
    const r = await recordClass(browser, vite.url, cls);
    results.push(r);
    console.log(`  ${r.ok ? 'OK' : 'FAIL'} — ${r.videoPath ?? '(ingen video)'}`);
  }
} finally {
  await browser.close();
  await stopVite(vite.proc);
}

console.log('\n=== ORDER 217 video-verifiering — sammanfattning ===');
for (const r of results) {
  console.log(`  ${r.business.padEnd(20)} ${r.videoPath ?? 'FAIL'}`);
}
console.log(`\nRapport-katalog: ${REPORT_DIR}`);

process.exit(results.every((r) => r.ok) ? 0 : 1);
