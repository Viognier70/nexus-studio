#!/usr/bin/env node
// ORDER 246 — screenshot av picker-status i DEV-raden.
// Två shots: fönster öppet (aq=0/3 open) + fönster stängt av min-gap
// (aq=1/3 closed:min-gap) direkt efter första fyra.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO_ROOT = resolve(FRONTEND, '..');
const REPORT_DIR = resolve(REPO_ROOT, 'frontend/reports/order246');
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
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
console.log(`Vite: ${vite.url}\nRapport: ${REPORT_DIR}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const bust = Date.now();
await page.goto(
  `${vite.url}/?bust=${bust}#playtest=1&seed=42&start=dinner15&business=kvarterskrogen`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
  null, { timeout: 60000 }
);
await delay(1500);
try {
  await page.fill('input[type=text]', 'ORDER 246');
  await page.click('button[type=submit]');
  await delay(2000);
} catch {}

// Snabba upp för att komma in i dinner-period, sedan bromsa och ta shot.
await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }));

// Vänta tills sim är i dinner + buffer-after är över (så fönstret är öppet).
console.log('Väntar på öppet fönster...');
const deadline1 = Date.now() + 90000;
while (Date.now() < deadline1) {
  const info = await page.evaluate(() => {
    const st = window.__nxSimState;
    return {
      simTime: st.simTime,
      period: st.day?.period,
      firedCount: st.day?.anchorQuestionsFiredThisService ?? 0
    };
  });
  if (info.period === 'dinner' && info.firedCount === 0 && info.simTime > 100) {
    console.log(`  ✓ öppet fönster: simTime=${info.simTime.toFixed(1)}s`);
    break;
  }
  await delay(500);
}
await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 0 }));
await delay(400);
await page.screenshot({
  path: resolve(REPORT_DIR, 'picker-status-open-1280x720.png'),
  fullPage: false
});
console.log(`  📷 open-shot: ${REPORT_DIR}/picker-status-open-1280x720.png`);

// Nu låt första fyra komma. Svara + ACK. Bromsa så min-gap ännu är
// aktivt när shot tas.
await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }));
console.log('Väntar på första fyra...');
const deadline2 = Date.now() + 60000;
while (Date.now() < deadline2) {
  const st = await page.evaluate(() => {
    const s = window.__nxSimState;
    return {
      firedCount: s.day?.anchorQuestionsFiredThisService ?? 0,
      phase: s.scenario?.phase,
      hasQ: !!s.scenario?.pendingQuestion
    };
  });
  if (st.phase === 'question' && st.hasQ) {
    // Svara + ACK snabbt.
    await page.evaluate(() => {
      const s = window.__nxSimState;
      const idx = s.scenario.pendingQuestion.options.findIndex((o) => o.correct);
      window.__nxSimDispatch({ type: 'ANSWER_QUESTION', index: idx >= 0 ? idx : 0 });
    });
    await delay(400);
    await page.evaluate(() => window.__nxSimDispatch({ type: 'ACK_QUESTION_EXPLANATION' }));
    console.log('  ✓ svarat + ACK:at');
    break;
  }
  await delay(300);
}
// Vänta 1 sek (sim tid), bromsa och ta shot.
await delay(1500);
await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 0 }));
await delay(400);
await page.screenshot({
  path: resolve(REPORT_DIR, 'picker-status-closed-min-gap-1280x720.png'),
  fullPage: false
});
const final = await page.evaluate(() => {
  const s = window.__nxSimState;
  return {
    firedCount: s.day?.anchorQuestionsFiredThisService ?? 0,
    lastAt: s.day?.lastAnchorQuestionAt,
    simTime: s.simTime
  };
});
console.log(`  📷 closed-min-gap-shot: aq=${final.firedCount}/3, lastAt=${final.lastAt?.toFixed(1)}s, simTime=${final.simTime.toFixed(1)}s`);

await browser.close();
if (vite.proc) vite.proc.kill('SIGTERM');
console.log('Klart.');
