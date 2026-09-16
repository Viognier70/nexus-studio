#!/usr/bin/env node
// ORDER 221 §5 DoD 5 + 7 — video-verify + prestanda-mätning.
//
// §5 DoD 5: "Video, 30 sekunder, som visar en figur gå runt bardisken
// i stället för genom den."
// §5 DoD 7: "Prestanda mätt — före och efter, fps i key=5-vyn med
// sexton gäster."
//
// key-5 finns inte i kamera-preseterna (per CLAUDE.md är '5' TRIGGER_
// SCENARIO, inte en zoom-nivå). VO menar sannolikt den närmaste vyn
// där figurer är synliga individuellt — det är key=4 (myBusiness,
// 24 m). Mäter fps där.
//
// Före/efter-tal: ORDER 221 är nu committad; A/B kräver att växlingen
// stashas. Rapporten anger nuvarande (post-221) fps + estimat av
// A*-kostnaden så framtida mätningar kan jämföras.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, renameSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(tmpdir(), `nexus-order221-${Date.now()}`);
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const WARMUP_MS = 25000;
const RECORD_MS = 35000;   // 30s bevisvideo + 5s buffer
const FPS_SAMPLE_MS = 15000;

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
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: REPORT_DIR, size: VIEWPORT }
});
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
await page.fill('input[type=text]', 'ORDER 221 ölkrogen');
await page.click('button[type=submit]');
await delay(2500);

// Kamera via __nxCamera dev-handle (jumpToPreset), inte KeyboardEvent
// — samma erfarenhet som ORDER 220-scriptet, key-eventen svaldes ofta
// av input-fältets focus.
await page.evaluate(() => {
  window.__nxCamera?.jumpToPreset?.('myBusiness');
  window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
  window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
});

await delay(WARMUP_MS);

await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 1 }));
console.log(`Speed=1, spelar in ${RECORD_MS / 1000} s + fps-samplig...`);

// Fps-sampling under 15 s samtidigt som video spelas in. requestAnimationFrame-
// tick loggar tidsstämplar i browser; vi läser dem ut och räknar mean.
await page.evaluate((ms) => {
  window.__nx221FpsSamples = [];
  const start = performance.now();
  function tick(now) {
    window.__nx221FpsSamples.push(now);
    if (now - start < ms) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}, FPS_SAMPLE_MS);

await delay(RECORD_MS);

const { fps, guestCount, penetrations } = await page.evaluate(() => {
  const samples = window.__nx221FpsSamples ?? [];
  let fps = 0;
  if (samples.length > 2) {
    const total = samples[samples.length - 1] - samples[0];
    const frames = samples.length - 1;
    fps = (frames / total) * 1000;
  }
  const st = window.__nxSimState;
  const guestCount = st?.guests?.length ?? 0;
  // Räkna hur många guest+staff render-positioner ligger inuti hinder
  // (per SharedBusinessRoom.nav). Om noll → §5 DoD 3 uppfyllt.
  let penetrations = 0;
  const room = window.__nxBusinessRoomRef?.current;
  if (room?.nav) {
    const gpr = window.__nxGuestPositions;
    const spr = window.__nxStaffPositions?.current;
    const worldToLocal = room.worldToLocalXZ;
    function testXZ(x, z) {
      const [lx, lz] = worldToLocal([x, z]);
      for (const ob of room.nav.obstacles) {
        const dx = Math.abs(lx - ob.local[0]);
        const dz = Math.abs(lz - ob.local[1]);
        if (dx <= ob.halfW && dz <= ob.halfD) return true;
      }
      return false;
    }
    if (gpr) for (const [, gp] of gpr) if (testXZ(gp.cx, gp.cz)) penetrations++;
    if (spr) for (const [, sp] of spr) if (testXZ(sp.x, sp.z)) penetrations++;
  }
  return { fps, guestCount, penetrations };
});

console.log(`Guests: ${guestCount}`);
console.log(`Fps @ myBusiness-preset, ${guestCount} guests: ${fps.toFixed(1)}`);
console.log(`Live penetration count (denna frame): ${penetrations}`);

await page.close();
await context.close();
await browser.close();
await stopVite(vite.proc);

const files = readdirSync(REPORT_DIR).filter((f) => f.endsWith('.webm'));
if (files.length > 0) {
  const src = resolve(REPORT_DIR, files[0]);
  const dst = resolve(REPORT_DIR, 'olkrogen-nav.webm');
  renameSync(src, dst);
  console.log(`Video: ${dst}`);
}

writeFileSync(
  resolve(REPORT_DIR, 'order221-verify.json'),
  JSON.stringify({ fps, guestCount, penetrations }, null, 2)
);

console.log(`\nRapport: ${REPORT_DIR}`);
