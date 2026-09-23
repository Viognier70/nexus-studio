#!/usr/bin/env node
// ORDER 220 — screenshot verify.
//
// Skjuter PNG-frames vid ögonblick där värden faktiskt escortar en
// arriving-gäst. Playwright video-inspelning fångar hela flödet men
// escort-fönstret är kort (~1-2 s sim) och 1fps extraktion missar det.
// Här pollas var 100 ms; när villkoret (värd.taskType='greet' AND
// target-guest.state='arriving') är sant skjuts en full-page screenshot
// och distansen värd↔gäst mäts. 20-30 shots räcker för att bevisa
// samma-väg-koreografin visuellt.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(tmpdir(), `nexus-order220-shots-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const WARMUP_MS = 20000;
const RECORD_MS = 60000;   // längre för att fånga fler arriving-events
const MAX_SHOTS = 40;

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
console.log(`Vite: ${vite.url}\nRapport: ${REPORT_DIR}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const bust = Date.now();
await page.goto(
  `${vite.url}/?bust=${bust}#playtest=1&business=kvarterskrogen&period=lunch`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
  null, { timeout: 60000 }
);
await delay(1500);
await page.fill('input[type=text]', 'ORDER 220 shots');
await page.click('button[type=submit]');
await delay(2500);

// Kamera via dev-handle (jumpToPreset) i st f keydown — key-event ignoreras
// när fokus råkar ligga någon annanstans, jumpToPreset är direkt-API.
await page.evaluate(() => {
  window.__nxCamera?.jumpToPreset?.('myBusiness');
  window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
  window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
});

await delay(WARMUP_MS);

await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
console.log(`Speed=1, letar escort-events i ${RECORD_MS / 1000} s...`);

const shots = [];
const deadline = Date.now() + RECORD_MS;
let lastShotAt = 0;
while (Date.now() < deadline && shots.length < MAX_SHOTS) {
  const s = await page.evaluate(() => {
    const st = window.__nxSimState;
    if (!st) return null;
    const värd = st.staff.find((m) => m.role === 'värd');
    if (!värd || värd.taskType !== 'greet' || !värd.targetGuestId) return null;
    const target = st.guests.find((g) => g.id === värd.targetGuestId);
    if (!target) return null;
    // Vi vill se HELA escort-fasen: arriving (går in) + seated-precis-nyss
    // (värd står vid bordet, poseGreet). Filtrera ändå bort waiting-i-kö
    // eftersom det är fallback-fallet — inte det VO efterfrågade.
    if (target.state !== 'arriving' && target.state !== 'seated') return null;
    const gpr = window.__nxGuestPositions;
    const spr = window.__nxStaffPositions?.current;
    let gp = null, sp = null;
    if (gpr) gp = gpr.get(target.id);
    if (spr) { for (const [, v] of spr) if (v?.role === 'värd') { sp = v; break; } }
    const dist = (gp && sp) ? Math.hypot(gp.cx - sp.x, gp.cz - sp.z) : null;
    return {
      simTime: st.simTime,
      guestId: target.id,
      guestState: target.state,
      guestMoveProgress: target.moveProgress,
      dist
    };
  });
  const nowMs = Date.now();
  if (s && (nowMs - lastShotAt) > 200) {
    const idx = shots.length;
    const fname = `escort-${String(idx).padStart(2, '0')}-${s.guestState}-t${s.simTime.toFixed(1)}-d${s.dist?.toFixed(2) ?? 'na'}.png`;
    await page.screenshot({ path: resolve(REPORT_DIR, fname) });
    shots.push({ file: fname, ...s });
    lastShotAt = nowMs;
    console.log(`  #${idx}: ${s.guestState} t=${s.simTime.toFixed(1)}s dist=${s.dist?.toFixed(2) ?? '-'}m mp=${s.guestMoveProgress.toFixed(2)}`);
  }
  await delay(100);
}

await page.close();
await context.close();
await browser.close();
await stopVite(vite.proc);

writeFileSync(resolve(REPORT_DIR, 'shots.json'), JSON.stringify(shots, null, 2));
console.log(`\nAntal escort-frames: ${shots.length}`);
console.log(`Rapport: ${REPORT_DIR}`);
