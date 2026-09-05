#!/usr/bin/env node
// ORDER 173 §Diagnos — läs actual camera distance + material.opacity
// från runtime, med och utan `dollhouse=1`-flagga. Avgör om ORDER 172:s
// hypotes (a) damping eller (b) opacity-loop-glitch stämmer.
//
// **Två URL-varianter körs för jämförelse:**
//   1. `#playtest=1&business=brewpub` — spelarens URL (utan preset).
//      Kameran startar på village (dist=900) tills namn är ifyllt +
//      jumpToPreset körs. Läser opacity efter 10 s damping.
//   2. `#playtest=1&business=brewpub&preset=myBusiness` — samma URL
//      som ORDER 149/150 använde. Kameran startar direkt på myBusiness
//      (dist=24).
//
// Både kör `__nxSetBusinessName('Ölkrogen')` för att skippa NameEntry.
// Vid mätningen läses `window.__nxPlayerBusinessOpacityMeasure()` —
// nya dev-hooken som returnerar actualRef.current.distance +
// material.opacity direkt från three.js runtime.
//
// Skriver `frontend/reports/order173/opacity-diagnose.json` + två
// screenshotar för visuell jämförelse.

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

async function measureUrl(name, url, screenshotName) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const consoleLog = [];
  page.on('console', (msg) => consoleLog.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => consoleLog.push(`pageerror: ${err.message}`));

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
      null, { timeout: 60000 }
    );
    await page.waitForFunction(() => typeof window.__nxSetBusinessName === 'function', null, { timeout: 20000 });
    await page.evaluate(() => window.__nxSetBusinessName('Ölkrogen'));
    // Vänta så kameran damp:as OM den startar från village (fall 1).
    // Preset-varianten (fall 2) startar redan på myBusiness så delay:en
    // är bara försäkring om first-frame-race.
    await delay(10000);

    // Ta screenshot innan mätning så vi ser vad som renderas.
    // HUD-panelerna skymmer det mesta; ta även en canvas-only-screenshot
    // så vi ser vad kameran faktiskt renderar utan overlay-panelerna.
    await page.screenshot({ path: resolve(REPORT_DIR, screenshotName), fullPage: false });
    const canvasHandle = await page.$('canvas');
    if (canvasHandle) {
      const canvasShot = screenshotName.replace('.png', '-canvas.png');
      await canvasHandle.screenshot({ path: resolve(REPORT_DIR, canvasShot) });
    }

    // Läs faktisk opacity + kameradistans via dev-hook.
    const measurement = await page.evaluate(() => {
      const fn = window.__nxPlayerBusinessOpacityMeasure;
      if (typeof fn !== 'function') return { error: 'hook-not-mounted' };
      return fn();
    });

    const simState = await page.evaluate(() => {
      const s = window.__nxSimState;
      return {
        businessClass: s.businessClass,
        simTime: s.simTime,
        period: s.day && s.day.period
      };
    });

    const devPanelText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent || '';
        if (t.includes('day=') && t.includes('cam=')) return t;
      }
      return null;
    });

    return { name, url, measurement, simState, devPanelText, consoleTail: consoleLog.slice(-10) };
  } finally {
    await page.close();
  }
}

try {
  const bust = Date.now();
  const result1 = await measureUrl(
    'spelarens_url_utan_preset',
    `http://localhost:5173/?bust=${bust}#playtest=1&business=brewpub&period=lunch`,
    'view-no-preset.png'
  );
  const result2 = await measureUrl(
    'preset_myBusiness_som_ORDER_149_150',
    `http://localhost:5173/?bust=${bust + 1}#playtest=1&business=brewpub&preset=myBusiness&period=lunch`,
    'view-preset-myBusiness.png'
  );

  const report = {
    order: 173,
    title: '§Diagnos — actual opacity + camera distance i myBusiness-vyn',
    setup: {
      viewport: { width: 1920, height: 1080 },
      businessClassAlias: 'brewpub → ölkrogen (per urlParams.ts:169)',
      nameEntryBypass: '__nxSetBusinessName(\"Ölkrogen\")',
      waitAfterNameMs: 10000
    },
    scenarios: [result1, result2],
    verdict: (() => {
      const m1 = result1.measurement || {};
      const m2 = result2.measurement || {};
      const expectedOpaqueBelow = 28;  // roof-fade band lower edge
      const opacityCorrect = (m) => {
        if (m.error || m.cameraDistanceM == null) return null;
        if (m.cameraDistanceM < expectedOpaqueBelow) {
          // opacity should be 0
          return m.roofOpacity === 0 && m.wallOpacity === 0;
        }
        return null;  // outside test window
      };
      return {
        expectedRoofOpacityAtCamBelow28: 0,
        scenario1: {
          cameraDistanceM: m1.cameraDistanceM,
          roofOpacity: m1.roofOpacity,
          wallOpacity: m1.wallOpacity,
          interiorGroupVisible: m1.interiorGroupVisible,
          opacityMatchesExpectation: opacityCorrect(m1)
        },
        scenario2: {
          cameraDistanceM: m2.cameraDistanceM,
          roofOpacity: m2.roofOpacity,
          wallOpacity: m2.wallOpacity,
          interiorGroupVisible: m2.interiorGroupVisible,
          opacityMatchesExpectation: opacityCorrect(m2)
        }
      };
    })()
  };

  const out = resolve(REPORT_DIR, 'opacity-diagnose.json');
  writeFileSync(out, JSON.stringify(report, null, 2));

  console.log('=== ORDER 173 §Diagnos — opacity + camera distance ===\n');
  for (const s of [result1, result2]) {
    console.log(`Scenario: ${s.name}`);
    console.log(`  URL: ${s.url}`);
    console.log(`  simState.businessClass: ${s.simState.businessClass}`);
    console.log(`  measurement:`, s.measurement);
    console.log('');
  }
  console.log('Verdict:', JSON.stringify(report.verdict, null, 2));
  console.log(`\nRapport: ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
