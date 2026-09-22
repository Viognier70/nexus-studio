#!/usr/bin/env node
// ORDER 244 — DoD-screenshot: fyraalternativsfråga syns helt med DEV på.
//
// Startar Vite, öppnar `#playtest=1&seed=42&business=kvarterskrogen`,
// snabbar upp sim till 8×, väntar tills anchor-picker fyrar första
// bronsfråga (per ORDER 238-log: t=130.2s, kalastorget-brons-01, 4 alt).
// När `state.scenario.pendingQuestion.options.length === 4` skjuts
// screenshot. Bevisar att DevPanel (nu top-left) inte överlappar
// ScenarioOverlays sista alternativ (C/D).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO_ROOT = resolve(FRONTEND, '..');
// ORDER 240: reports skrivs bara när VO ber om det. Bild-artefakten
// för DoD sparas dock som referens i frontend/reports/order244/
// eftersom den citeras i registerposten.
const REPORT_DIR = resolve(REPO_ROOT, 'frontend/reports/order244');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 60000;
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
  `${vite.url}/?bust=${bust}#playtest=1&seed=42&business=kvarterskrogen`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
  null, { timeout: 60000 }
);
await delay(1500);

// Fyll businessnamn (NameEntryOverlay blockar annars).
try {
  await page.fill('input[type=text]', 'ORDER 244');
  await page.click('button[type=submit]');
  await delay(2000);
} catch (e) {
  console.log('  (ingen namn-input, hoppar)');
}

// Snabba upp och öppna en dinner-service. Anchor-picker fyrar per
// ORDER 238-log första bronsfrågan vid sim-tid 130.2s.
await page.evaluate(() => {
  window.__nxSimDispatch({ type: 'SKIP_LUNCH' });
  window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 });
  window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 });
});

console.log('Väntar på 4-optionsfråga (~17 s vid 8× speed)...');
const deadline = Date.now() + 90000;
let shotPath = null;
while (Date.now() < deadline) {
  const info = await page.evaluate(() => {
    const st = window.__nxSimState;
    if (!st) return null;
    const pq = st.scenario?.pendingQuestion;
    const phase = st.scenario?.phase;
    return {
      simTime: st.simTime,
      phase,
      optionsCount: pq?.options?.length ?? 0,
      pqId: pq?.sourceBankId ?? null,
      body: pq?.body?.slice(0, 60) ?? null
    };
  });
  if (info?.optionsCount === 4 && info.phase === 'question') {
    console.log(`  ✓ Träff vid simTime=${info.simTime.toFixed(1)}s, id=${info.pqId}`);
    console.log(`     body: "${info.body}..."`);
    // Bromsa så överlayet står stilla och skjut PNG.
    await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 0 }));
    await delay(400);
    shotPath = resolve(REPORT_DIR, `question-4options-with-dev-1280x720.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`  📷 Screenshot: ${shotPath}`);
    break;
  }
  await delay(300);
}

if (!shotPath) {
  console.error('✗ Ingen 4-optionsfråga hittad inom 90 s');
  process.exitCode = 1;
}

await browser.close();
await stopVite(vite.proc);
console.log('Klart.');
