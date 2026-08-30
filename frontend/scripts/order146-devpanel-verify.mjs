#!/usr/bin/env node
// ORDER 146 — läs faktisk DevPanel-sträng från renderad DOM vid
// samma tick som ORDER 145 fångade `waiting=4 seatedIds=16
// stateSeated=0`. Rapportera exakt vad panelen visar för spelaren.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order146');
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

try {
  await page.goto('http://localhost:5173/#playtest=1&business=kvarterskrogen', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1000);
  await page.evaluate(() => window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 }));
  await delay(500);
  await page.evaluate(() => { window.__nxSimState.speed = 0; });
  await delay(200);

  // Ticka tills vi ser waitingIds>0 (matchar t~525s enligt ORDER 145-data)
  const observations = [];
  let hit = null;
  for (let b = 0; b < 300; b++) {
    await page.evaluate((n) => {
      for (let i = 0; i < n; i++) window.__nxSimDispatch({ type: 'TICK', dt: 0.2 });
    }, 25);
    // Vänta ett tick på att React ska re-rendera DevPanel
    await delay(100);

    const snap = await page.evaluate(() => {
      const s = window.__nxSimState;
      const guests = s.guests || [];
      const bs = {};
      for (const g of guests) bs[g.state] = (bs[g.state] || 0) + 1;
      // DevPanel-sträng: hitta text-noden med "seated="
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let devPanelText = null;
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent || '';
        if (t.includes('seated=') && t.includes('queue=')) {
          devPanelText = t.replace(/\s+/g, ' ').trim();
          break;
        }
      }
      return {
        simTime: Number(s.simTime ?? 0),
        seatedIds: (s.seatedIds || []).length,
        waitingIds: (s.waitingIds || []).length,
        stateSeated: bs.seated || 0,
        stateOrdering: bs.ordering || 0,
        stateDining: bs.dining || 0,
        devPanelText
      };
    });
    observations.push(snap);
    if (snap.waitingIds > 0 && !hit) hit = snap;
    if (snap.waitingIds > 3) break;
  }

  writeFileSync(
    resolve(REPORT_DIR, 'devpanel-observations.json'),
    JSON.stringify({ hitFirstWaiting: hit, sampleTail: observations.slice(-10) }, null, 2)
  );

  console.log('\n=== ORDER 146 — DevPanel-verifiering ===');
  if (hit) {
    console.log(`Första tick med waitingIds > 0: t=${hit.simTime.toFixed(1)}s`);
    console.log(`  seatedIds (verkligen sittande): ${hit.seatedIds}`);
    console.log(`  waitingIds (verkligen i kö):    ${hit.waitingIds}`);
    console.log(`  state='seated' (transient):     ${hit.stateSeated}`);
    console.log(`  state='ordering':               ${hit.stateOrdering}`);
    console.log(`  state='dining':                 ${hit.stateDining}`);
    console.log(`  DevPanel-text: "${hit.devPanelText ?? '(hittade inte)'}"`);
  } else {
    console.log('Ingen tick med waiting > 0 under 300 batcher.');
  }
  console.log('');
  console.log('Sista tick:');
  const last = observations[observations.length - 1];
  console.log(`  t=${last.simTime.toFixed(1)}s seatedIds=${last.seatedIds} waitingIds=${last.waitingIds} stateSeated=${last.stateSeated}`);
  console.log(`  DevPanel-text: "${last.devPanelText ?? '(hittade inte)'}"`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
