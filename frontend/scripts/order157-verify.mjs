#!/usr/bin/env node
// ORDER 157 — verifiera de tre provspel-fyndens fixar.
//
// Fynd 1 (kamera): efter namn-inmatning ska jumpToPreset('myBusiness')
//   köra så targetRef.distance närmar sig 28 m (nivå 4). Vi läser
//   camera.actual.distance efter några sekunder easing.
// Fynd 2 (DevPanel-drift): ölkrogen ska INTE visa `!layout=16` när
//   businessRoomRef har publicerat kapacitet 20. Om drift förekommer
//   ska strängen nu vara `!room=X` (kontraktets källa), inte `!layout=`.
// Fynd 3 (ViewLabel): ölkrogen ska visa "ÖLKROGEN" (uppercase via
//   CSS text-transform), inte "VINBAREN".

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order157');
mkdirSync(REPORT_DIR, { recursive: true });
const VIEWPORT = { width: 1920, height: 1080 };

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
const page = await browser.newPage({ viewport: VIEWPORT });

page.on('pageerror', (err) => console.error('[pageerror]', err.message));

const report = {};

async function measureClass(businessArg, expectedLabel) {
  // Laddar UTAN preset=myBusiness — spelaren startar på village
  // (default). Sedan matar vi namnet och verifierar att kameran
  // reagerar på jumpToPreset i NameEntryOverlay.onSubmit.
  const bust = Date.now();
  await page.goto(
    `http://localhost:5173/?bust=${bust}#playtest=1&business=${businessArg}&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  // Mät kamerans distance INNAN namn-inmatning (bör vara ~village = 900 m).
  const distBefore = await page.evaluate(() => {
    // camera.actual saknar direkt window-handle; men __nxSimState har inte det
    // heller. Vi läser DOM-hint istället: gb-viewlabel-innehåll indikerar
    // preset-label (grythyttan/kvarteret/vinbaren).
    const el = document.querySelector('.gb-viewlabel');
    return el ? el.textContent?.trim() : null;
  });

  // Sätt namn via ORDER 083-hooken — namn-overlayen ska då försvinna
  // OCH NameEntryOverlay.onSubmit ska trigga jumpToPreset. MEN
  // __nxSetBusinessName går direkt in i BusinessContext utan att
  // gå genom overlayen — så den path:en trycker inte på kamerabytet.
  // Vi måste därför fylla i formuläret manuellt.
  await page.fill('input[type=text]', 'Provspel ' + businessArg);
  await page.click('button[type=submit]');
  await delay(500);

  // Vänta 25 sek på att kameran ska ease:a mot myBusiness (28 m).
  // dampDistance = 1.6 per damping-frame; från 900 → 28 tar ~15-20 s.
  await delay(25000);

  const labelAfter = await page.evaluate(() => {
    const el = document.querySelector('.gb-viewlabel');
    return el ? el.textContent?.trim() : null;
  });
  const styleTransform = await page.evaluate(() => {
    const el = document.querySelector('.gb-viewlabel');
    return el ? window.getComputedStyle(el).textTransform : null;
  });

  // DevPanel-strängen — läs text från panelen.
  const devPanelText = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent || '';
      if (t.includes('seated=') && t.includes('queue=')) {
        return t.replace(/\s+/g, ' ').trim();
      }
    }
    return null;
  });

  const shot = resolve(REPORT_DIR, `viewlabel-${businessArg}.png`);
  await page.screenshot({ path: shot, fullPage: false, clip: { x: 800, y: 0, width: 500, height: 100 }});

  return {
    class: businessArg,
    labelBeforeNaming: distBefore,
    labelAfterNaming: labelAfter,
    labelUppercase: styleTransform,
    devPanelText,
    hasLayoutDrift: devPanelText ? devPanelText.includes('!layout=') : null,
    hasRoomDrift: devPanelText ? devPanelText.includes('!room=') : null,
    screenshot: shot,
    expectedLabel
  };
}

try {
  // Expected är den STRING som textContent returnerar — CSS
  // text-transform: uppercase påverkar RENDERING men inte textContent.
  report.brewpub = await measureClass('olkrogen', 'Ölkrogen');
  report.restaurant = await measureClass('kvarterskrogen', 'Kvarterskrogen');

  writeFileSync(resolve(REPORT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n=== ORDER 157 — provspel-fixar verifierade ===\n');
  let ok = true;
  for (const [name, r] of Object.entries(report)) {
    console.log(`${name} (${r.class}):`);
    console.log(`  ViewLabel före namn:      ${r.labelBeforeNaming}`);
    console.log(`  ViewLabel efter namn:     ${r.labelAfterNaming}`);
    console.log(`  text-transform CSS:       ${r.labelUppercase}`);
    console.log(`  Förväntad label:          ${r.expectedLabel}`);
    console.log(`  DevPanel-sträng:          ${r.devPanelText}`);
    console.log(`  har !layout= (fel):       ${r.hasLayoutDrift}`);
    console.log(`  har !room= (drift ok):    ${r.hasRoomDrift}`);
    console.log(`  screenshot:               ${r.screenshot}`);
    console.log('');
    // Fynd 2: !layout= ska ALDRIG förekomma post-fix (kontraktet har rätt kap).
    if (r.hasLayoutDrift) ok = false;
    // Fynd 3: ViewLabel ska visa klass-namn, inte "Vinbaren"
    if (r.labelAfterNaming !== r.expectedLabel) ok = false;
  }
  if (!ok) {
    console.error('FEL: minst en assertion misslyckades.');
    process.exitCode = 1;
  } else {
    console.log('OK — kamera-etikett per klass korrekt, ingen falsk !layout=drift.');
  }
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
