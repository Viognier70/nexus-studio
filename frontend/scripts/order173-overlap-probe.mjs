#!/usr/bin/env node
// ORDER 173 §Overlap — listar scene-meshes vars bounding-box overlappar
// spelarbyggnadens footprint. Om det finns mesher UTÖVER PlayerBusinesss
// egna wall/roof/plinth, då renderar en annan komponent samma footprint.

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

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch('http://localhost:5173/'); if (r.ok || r.status === 304) return proc; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const consoleLog = [];
page.on('console', (msg) => consoleLog.push(`${msg.type()}: ${msg.text()}`));

try {
  await page.goto(
    `http://localhost:5173/?bust=${Date.now()}#playtest=1&business=brewpub&preset=myBusiness&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await page.waitForFunction(() => typeof window.__nxSetBusinessName === 'function', null, { timeout: 20000 });
  await page.evaluate(() => window.__nxSetBusinessName('Ölkrogen'));
  await delay(5000);

  const overlaps = await page.evaluate(() => {
    const fn = window.__nxSceneMeshesOverPlayerFootprint;
    return typeof fn === 'function' ? fn(8) : { error: 'hook-missing' };
  });

  const opacity = await page.evaluate(() => {
    const fn = window.__nxPlayerBusinessOpacityMeasure;
    return typeof fn === 'function' ? fn() : { error: 'hook-missing' };
  });

  const out = resolve(REPORT_DIR, 'overlap-probe.json');
  writeFileSync(out, JSON.stringify({ overlaps, opacity, order173ConsoleLines: consoleLog.filter((l) => l.includes('order173')).slice(0, 10) }, null, 2));

  console.log('=== ORDER 173 §Overlap probe ===\n');
  console.log('opacity:', JSON.stringify(opacity, null, 2));
  console.log('');
  console.log(`hitCount över spelarbyggnadens footprint: ${overlaps.hitCount}`);
  console.log('Överlappande meshes (path / opacity / visible / bbox):');
  for (const h of overlaps.hits || []) {
    console.log(`  ${h.path.padEnd(60)} opacity=${h.opacity ?? 'null'} visible=${h.visible} ymin=${h.bbox.minY.toFixed(2)} ymax=${h.bbox.maxY.toFixed(2)}`);
  }
  console.log('');
  console.log('order173 console lines:');
  for (const l of consoleLog.filter((l) => l.includes('order173')).slice(0, 10)) console.log('  ' + l);
  console.log(`\nRapport: ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
