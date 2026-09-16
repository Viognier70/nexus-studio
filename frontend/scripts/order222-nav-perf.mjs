#!/usr/bin/env node
// ORDER 222 §1 — perf-verifiering med 16-20 figurer som navigerar
// samtidigt. Kör ölkrogen headless UTAN video-recording (video-encoding
// i browsern förvred fps-mätningen i ORDER 221 §5 DoD 7 — 2.1 fps
// rapporterat, uppenbart en artefakt). Sim-driver rummet till full
// beläggning via lång warmup vid speed=8; sedan mätning vid speed=1.
//
// Rapporterade tal:
//   - guestCount, staffCount, movingFigures (som aktivt går denna
//     sampling-frame).
//   - fps mean över mätfönstret (via requestAnimationFrame-samples).
//   - Nav-perf: computePath-anrop total, straight-line-hits, A*-runs,
//     mean/max A*-ms, cache-miss-rate.
//
// §2 om A* för dyrt: rapportera, förenkla inte. Tröskeln för "för dyrt"
// är per-frame budget: 60 fps = 16.6 ms/frame. Om A*-tid > 5 ms/frame
// (30% av budget) räknas det som fynd som VO ska bestämma.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(tmpdir(), `nexus-order222-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const WARMUP_MS = 60000;    // lång warmup för att fylla rummet (5-8 sim-min)
const SAMPLE_MS = 20000;    // mätfönster

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

// GPU-flaggor för att undvika headless software-rasterizer (som ger
// 2-3 fps oavsett scen). Vi vill mäta REAL user-fps, inte cpu-swrast.
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=default',
    '--enable-webgl',
    '--enable-features=Vulkan',
    '--ignore-gpu-blocklist',
    '--disable-gpu-vsync'
  ]
});
// INGET recordVideo — video-encoding förvred fps i ORDER 221.
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const bust = Date.now();
await page.goto(
  `${vite.url}/?bust=${bust}#playtest=1&business=ölkrogen&period=lunch`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
  null, { timeout: 60000 }
);
await delay(1500);
await page.fill('input[type=text]', 'ORDER 222 perf');
await page.click('button[type=submit]');
await delay(2500);

await page.evaluate(() => {
  window.__nxCamera?.jumpToPreset?.('myBusiness');
  window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 60 });
  window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
});

console.log(`Warmup ${WARMUP_MS/1000}s @ speed=8 (fyller rummet)...`);
// Logga periodiskt hur många gäster finns så vi kan se när det stabiliseras.
let lastLog = Date.now();
const warmupEnd = Date.now() + WARMUP_MS;
while (Date.now() < warmupEnd) {
  if (Date.now() - lastLog > 10000) {
    const c = await page.evaluate(() => ({
      guests: window.__nxSimState?.guests?.length ?? 0,
      seated: window.__nxSimState?.seatedIds?.length ?? 0
    }));
    console.log(`  t+${Math.floor((Date.now() - (warmupEnd - WARMUP_MS))/1000)}s: guests=${c.guests}, seated=${c.seated}`);
    lastLog = Date.now();
  }
  await delay(500);
}

await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
await delay(2000);  // låt sim stabilisera efter speed-byte

// Nolla nav-räknare, samla samples i mätfönstret.
await page.evaluate(() => {
  window.__nxNavPerf?.reset();
  window.__nx222FpsSamples = [];
  const start = performance.now();
  function tick(now) {
    window.__nx222FpsSamples.push(now);
    if (now - start < 20000) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});

console.log(`Mätfönster ${SAMPLE_MS/1000}s @ speed=1...`);
await delay(SAMPLE_MS);

const result = await page.evaluate(() => {
  const samples = window.__nx222FpsSamples ?? [];
  let fps = 0;
  if (samples.length > 2) {
    const total = samples[samples.length - 1] - samples[0];
    const frames = samples.length - 1;
    fps = (frames / total) * 1000;
  }
  const st = window.__nxSimState;
  const guests = st?.guests ?? [];
  const staff = st?.staff ?? [];
  // Räkna aktivt navigerande — gäst med moveProgress < 1 eller staff
  // med aktiv path (targetGuestId ELLER långt från home).
  let movingGuests = 0, movingStaff = 0;
  for (const g of guests) {
    if (g.state === 'arriving' || g.state === 'leaving' || g.state === 'declined') movingGuests++;
    else if (g.moveProgress < 0.999) movingGuests++;
  }
  for (const s of staff) {
    if (s.taskType !== null || s.moveProgress < 0.999) movingStaff++;
  }
  const nav = window.__nxNavPerf?.read() ?? null;
  return {
    fps,
    guestCount: guests.length,
    staffCount: staff.length,
    seatedCount: st?.seatedIds?.length ?? 0,
    movingGuests,
    movingStaff,
    nav
  };
});

await page.close();
await context.close();
await browser.close();
await stopVite(vite.proc);

console.log('\n=== ORDER 222 perf ===');
console.log(`Figurer: ${result.guestCount} gäster (${result.seatedCount} seated), ${result.staffCount} staff`);
console.log(`Rörliga under sampling: ${result.movingGuests} gäster + ${result.movingStaff} staff = ${result.movingGuests + result.movingStaff}`);
console.log(`Fps: ${result.fps.toFixed(1)} @ myBusiness-preset`);
if (result.nav) {
  const n = result.nav;
  const meanMs = n.computePathCalls > 0 ? n.totalMs / n.computePathCalls : 0;
  const astarPerSec = n.astarRuns / (SAMPLE_MS / 1000);
  const pathPerSec = n.computePathCalls / (SAMPLE_MS / 1000);
  const cacheMissRate = n.computePathCalls > 0 ? n.astarRuns / n.computePathCalls : 0;
  console.log(`Nav computePath: ${n.computePathCalls} anrop (${pathPerSec.toFixed(1)}/s)`);
  console.log(`  - Rak-linje-hits: ${n.straightLineHits} (${((n.straightLineHits / Math.max(1, n.computePathCalls)) * 100).toFixed(0)}%)`);
  console.log(`  - A*-runs:        ${n.astarRuns} (${astarPerSec.toFixed(1)}/s)`);
  console.log(`  - Null-resultat:  ${n.nullResults}`);
  console.log(`  - Total tid:      ${n.totalMs.toFixed(2)} ms`);
  console.log(`  - Mean per call:  ${meanMs.toFixed(3)} ms`);
  console.log(`  - Max per call:   ${n.maxMs.toFixed(3)} ms`);
  console.log(`  - Cache-miss:     ${(cacheMissRate * 100).toFixed(1)}%`);
  // Frame-budget: 60 fps = 16.6 ms/frame. A*-tid per frame:
  const framesInWindow = result.fps * (SAMPLE_MS / 1000);
  const astarMsPerFrame = framesInWindow > 0 ? n.totalMs / framesInWindow : 0;
  console.log(`  - Nav-tid/frame:  ${astarMsPerFrame.toFixed(3)} ms (av 16.6 ms budget @ 60 fps)`);
  result._derived = { meanMs, astarPerSec, pathPerSec, cacheMissRate, astarMsPerFrame };
}

writeFileSync(
  resolve(REPORT_DIR, 'order222-perf.json'),
  JSON.stringify(result, null, 2)
);
console.log(`\nRapport: ${REPORT_DIR}/order222-perf.json`);
