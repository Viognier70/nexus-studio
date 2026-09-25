#!/usr/bin/env node
// ORDER 170 uppföljning — dispositiv panel-läsning.
//
// **Fråga:** när DevPanel-strängen visar `service=12:51/15min` respektive
// `14:40/15min` (exakt de strängar ordertexten observerade), vad är
// `state.simTime - state.day.periodStartAt` (elapsed) vid samma tick?
//
// **Om elapsed ≈ 129s (för 12:51) och ≈ 20s (för 14:40)** — panelen är
// remaining (visar kvarvarande tid). Min utredning i ORDER 169/170 rätt.
//
// **Om elapsed ≈ 771s (för 12:51) och ≈ 880s (för 14:40)** — panelen är
// elapsed (visar förfluten tid). Ordertextens läsning rätt. Prep-fasen
// pågår sent i passet → grinden är verkligen bruten.
//
// Skriptet tickar sim tills panelen matchar target-strängen, snappar
// state, fortsätter till nästa target. Alla tal skrivs till
// `frontend/reports/order170/panel-elapsed-probe.json`.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order170');
mkdirSync(REPORT_DIR, { recursive: true });

const TARGET_STRINGS = ['14:40', '12:51', '0:20'];  // ordertextens två + motsatsen

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch('http://localhost:5173/');
      if (r.ok || r.status === 304) return proc;
    } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

try {
  await page.goto(
    'http://localhost:5173/#playtest=1&business=brewpub&period=lunch',
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 15 });
  });
  await delay(500);
  await page.evaluate(() => { window.__nxSimState.speed = 0; });
  await delay(200);

  async function readPanel() {
    return page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent || '';
        if (t.includes('service=') && t.includes('day=')) {
          const m = t.match(/service=(\S+)/);
          return m ? m[1] : null;
        }
      }
      return null;
    });
  }

  async function snap() {
    return page.evaluate(() => {
      const s = window.__nxSimState;
      const d = s.day || {};
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let devPanelText = null;
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent || '';
        if (t.includes('service=') && t.includes('day=')) { devPanelText = t; break; }
      }
      const m = devPanelText ? devPanelText.match(/service=(\S+)/) : null;
      const staff = (s.staff || []).map((st) => ({ role: st.role, taskType: st.taskType }));
      return {
        simTime: Number(s.simTime ?? 0),
        periodStartAt: Number(d.periodStartAt ?? 0),
        prepEndsAt: d.prepEndsAt,
        openingEndsAt: d.openingEndsAt,
        currentServiceLengthMinutes: d.currentServiceLengthMinutes,
        elapsedSinceServiceStart: Number(s.simTime ?? 0) - Number(d.periodStartAt ?? 0),
        remainingSec: Math.max(0, (d.currentServiceLengthMinutes ?? 0) * 60
          - (Number(s.simTime ?? 0) - Number(d.periodStartAt ?? 0))),
        waitingAtOpening: d.waitingAtOpening,
        waitingIdsCount: (s.waitingIds || []).length,
        guestsTotal: (s.guests || []).length,
        seatedIdsCount: (s.seatedIds || []).length,
        devPanelServiceField: m ? m[1] : null,
        devPanelIncludesOnBreak: /On break/.test(devPanelText || ''),
        staff,
        allThreeIdle: staff.filter((s) => s.taskType == null).length >= 3,
        businessClass: s.businessClass,
        period: d.period
      };
    });
  }

  const hits = {};
  let ticks = 0;
  const MAX_TICKS = 5000;             // 5000 × 0.2 = 1000s > 15 min

  // Ticka en åt gången och kolla efter varje panel-uppdatering (React
  // re-render varje ~250 ms i praktiken; vi ticker 5 sim-sek per burst
  // och kollar strängen).
  while (Object.keys(hits).length < TARGET_STRINGS.length && ticks < MAX_TICKS) {
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) window.__nxSimDispatch({ type: 'TICK', dt: 0.2 });
    });
    ticks += 5;
    // Vänta ett kort tag så React hinner re-rendera.
    await delay(80);
    const panelField = await readPanel();
    if (panelField && TARGET_STRINGS.includes(panelField.replace(/\s.*/, ''))) {
      const key = panelField.replace(/\s.*/, '');
      if (!hits[key]) {
        hits[key] = await snap();
      }
    }
  }

  const report = {
    order: 170,
    subtitle: 'Dispositiv panel-läsning — elapsed vid exakt strängmatch',
    setup: {
      business: 'ölkrogen (via brewpub-alias)',
      service: 'lunch',
      lengthMinutes: 15,
      tickCount: ticks,
      tickDtSec: 0.2
    },
    targetStrings: TARGET_STRINGS,
    hits,
    verdict: (() => {
      const h1251 = hits['12:51'];
      const h1440 = hits['14:40'];
      const h020  = hits['0:20'];
      const remainingHypothesis = {
        h1251_expected: 'elapsed ~129s',
        h1440_expected: 'elapsed ~20s',
        h020_expected:  'elapsed ~880s',
        h1251_actual: h1251 ? Math.round(h1251.elapsedSinceServiceStart) : null,
        h1440_actual: h1440 ? Math.round(h1440.elapsedSinceServiceStart) : null,
        h020_actual:  h020  ? Math.round(h020.elapsedSinceServiceStart)  : null
      };
      const elapsedHypothesis = {
        h1251_expected: 'elapsed ~771s',
        h1440_expected: 'elapsed ~880s',
        h020_expected:  'elapsed ~20s',
        h1251_actual: h1251 ? Math.round(h1251.elapsedSinceServiceStart) : null,
        h1440_actual: h1440 ? Math.round(h1440.elapsedSinceServiceStart) : null,
        h020_actual:  h020  ? Math.round(h020.elapsedSinceServiceStart)  : null
      };
      return {
        panelIsRemainingIf:  remainingHypothesis,
        panelIsElapsedIf:    elapsedHypothesis
      };
    })()
  };

  const out = resolve(REPORT_DIR, 'panel-elapsed-probe.json');
  writeFileSync(out, JSON.stringify(report, null, 2));

  console.log('=== ORDER 170 uppföljning — dispositiv panel-läsning ===\n');
  for (const target of TARGET_STRINGS) {
    const h = hits[target];
    if (!h) {
      console.log(`  target service=${target}  → INTE observerad inom ${ticks} ticks`);
      continue;
    }
    console.log(`  target service=${target.padEnd(6)} → elapsed=${h.elapsedSinceServiceStart.toFixed(1).padStart(6)}s  remaining=${h.remainingSec.toFixed(1).padStart(6)}s  phase=${h.period}  prepEndsAt=${h.prepEndsAt}  waitingIdsCount=${h.waitingIdsCount}  guestsTotal=${h.guestsTotal}  staff=${h.staff.map((s) => s.role + ':' + (s.taskType ?? 'null')).join(' ')}`);
  }
  console.log('');
  console.log(`Rapport: ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
