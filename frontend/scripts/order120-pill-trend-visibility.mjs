#!/usr/bin/env node
// ORDER 120 DoD 7 — visuell verifikation att rykte-trend-glyfen faktiskt
// syns i den stängda Cash-pillen (inte bara att attributet finns i DOM).
//
// Ett `data-reputation-trend`-attribut på en nod som renderas med noll
// bredd eller bakom Cash-siffran passerar DoD 1:s grep men löser inte
// problemet ordern adresserar. Detta script verifierar i verklig
// browser-layout att glyfen:
//
//   - har bounding-box width ≥ 6 CSS-px
//   - har bounding-box height ≥ 10 CSS-px
//   - ligger inom pill-knappens bounding-box (inte klippt bort)
//   - har x-position större än Cash-value-spannens x+width (efter siffran)
//   - har getComputedStyle().visibility !== 'hidden'
//   - har getComputedStyle().opacity > 0.5
//
// Körs två gånger — trend=up (effectiveValueQuota=1.5) och trend=down
// (effectiveValueQuota=0.5). Screenshot per körning till reports/order120/.
//
// State tvingas via mutation av window.__nxSimState.effectiveValueQuota,
// sedan dispatch av SET_CASH-no-op. SET_CASH:s reducer-branch spread:ar
// state ({ ...state, cash: action.valueSek }), vilket plockar upp den
// muterade effectiveValueQuota-fältet och triggrar re-render. Ingen ny
// SimAction krävs, ingen ny URL-parameter, ingen kod-ändring utanför
// PlayerPanel.tsx.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(FRONTEND_ROOT, 'reports', 'order120');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) return { proc: null, url };
  } catch { /* not up */ }
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND_ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch(url + '/');
      if (r.ok || r.status === 304) return { proc, url };
    } catch { /* not up */ }
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function stopVite(proc) {
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res(undefined));
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(undefined); }, 3000);
  });
}

async function forceTrend(page, effectiveValueQuota) {
  // Mutera state-objektet React håller (via __nxSimState) och dispatcha
  // SET_CASH med det befintliga cash-värdet. SET_CASH:s reducer gör
  // { ...state, cash: action.valueSek } — spread plockar upp den muterade
  // effectiveValueQuota, React re-renderar med det nya state-objektet.
  await page.evaluate((v) => {
    const w = /** @type any */ (window);
    if (!w.__nxSimState || !w.__nxSimDispatch) {
      throw new Error('__nxSimState/__nxSimDispatch not exposed — check import.meta.env.DEV');
    }
    w.__nxSimState.effectiveValueQuota = v;
    const currentCash = w.__nxSimState.cash;
    w.__nxSimDispatch({ type: 'SET_CASH', valueSek: currentCash });
  }, effectiveValueQuota);
  await delay(80);
}

async function measurePill(page, expectedDirection) {
  return page.evaluate((dir) => {
    const pill = document.querySelector('button[aria-label="Cash on hand"]');
    if (!pill) throw new Error('pill (button[aria-label="Cash on hand"]) not found');
    const pillRect = pill.getBoundingClientRect();

    const glyph = pill.querySelector(`[data-reputation-trend="${dir}"]`);
    if (!glyph) throw new Error(`glyph [data-reputation-trend="${dir}"] not found in pill`);
    const glyphRect = glyph.getBoundingClientRect();
    const glyphStyle = window.getComputedStyle(glyph);

    // Cash-value-spannen är den span som slutar med "kSEK".
    const cashSpan = Array.from(pill.querySelectorAll('span')).find(
      (s) => /kSEK$/.test(s.textContent ?? '')
    );
    if (!cashSpan) throw new Error('cash-value span not found');
    const cashRect = cashSpan.getBoundingClientRect();

    return {
      pill: { x: pillRect.x, y: pillRect.y, w: pillRect.width, h: pillRect.height, right: pillRect.right, bottom: pillRect.bottom },
      glyph: { x: glyphRect.x, y: glyphRect.y, w: glyphRect.width, h: glyphRect.height, right: glyphRect.right, bottom: glyphRect.bottom },
      cash: { x: cashRect.x, y: cashRect.y, w: cashRect.width, h: cashRect.height, right: cashRect.right },
      style: {
        visibility: glyphStyle.visibility,
        opacity: parseFloat(glyphStyle.opacity),
        color: glyphStyle.color,
        fontSize: glyphStyle.fontSize
      },
      textContent: glyph.textContent
    };
  }, expectedDirection);
}

function checkVisibility(m, dir) {
  const problems = [];
  if (m.glyph.w < 6) problems.push(`glyph width ${m.glyph.w.toFixed(2)} < 6 CSS-px`);
  if (m.glyph.h < 10) problems.push(`glyph height ${m.glyph.h.toFixed(2)} < 10 CSS-px`);
  // Innanför pill: glyf-rektangeln ska ligga inom pill-rektangeln.
  if (m.glyph.x < m.pill.x || m.glyph.right > m.pill.right) {
    problems.push(`glyph x-range [${m.glyph.x.toFixed(2)}, ${m.glyph.right.toFixed(2)}] utanför pill x-range [${m.pill.x.toFixed(2)}, ${m.pill.right.toFixed(2)}]`);
  }
  if (m.glyph.y < m.pill.y || m.glyph.bottom > m.pill.bottom) {
    problems.push(`glyph y-range [${m.glyph.y.toFixed(2)}, ${m.glyph.bottom.toFixed(2)}] utanför pill y-range [${m.pill.y.toFixed(2)}, ${m.pill.bottom.toFixed(2)}]`);
  }
  // Efter Cash-siffran: glyf-x ska vara ≥ cash.right (dvs. till höger, inte gömd bakom).
  if (m.glyph.x < m.cash.right) {
    problems.push(`glyph x ${m.glyph.x.toFixed(2)} < cash.right ${m.cash.right.toFixed(2)} — glyf ligger bakom eller överlappar Cash-siffran`);
  }
  if (m.style.visibility === 'hidden') problems.push(`visibility=hidden`);
  if (m.style.opacity <= 0.5) problems.push(`opacity=${m.style.opacity} ≤ 0.5`);
  // Verifiera glyf-texten
  const expected = dir === 'up' ? '▲' : '▼';
  if (m.textContent !== expected) problems.push(`textContent="${m.textContent}", förväntade "${expected}"`);

  return problems;
}

async function runCase(page, direction, effectiveValueQuota) {
  console.log(`\n[order120] trend=${direction} (effectiveValueQuota=${effectiveValueQuota})`);
  await forceTrend(page, effectiveValueQuota);
  const m = await measurePill(page, direction);
  console.log(`  pill:  ${m.pill.w.toFixed(0)}×${m.pill.h.toFixed(0)} @ (${m.pill.x.toFixed(0)}, ${m.pill.y.toFixed(0)})`);
  console.log(`  glyph: ${m.glyph.w.toFixed(0)}×${m.glyph.h.toFixed(0)} @ (${m.glyph.x.toFixed(0)}, ${m.glyph.y.toFixed(0)})  text="${m.textContent}" color=${m.style.color} fontSize=${m.style.fontSize} opacity=${m.style.opacity} visibility=${m.style.visibility}`);
  console.log(`  cash.right = ${m.cash.right.toFixed(0)}`);

  const problems = checkVisibility(m, direction);
  const shotPath = resolve(REPORT_DIR, `pill-trend-${direction}.png`);
  await page.screenshot({
    path: shotPath,
    clip: {
      x: Math.max(0, m.pill.x - 8),
      y: Math.max(0, m.pill.y - 8),
      width: Math.min(VIEWPORT.width - m.pill.x + 8, m.pill.w + 40),
      height: Math.min(VIEWPORT.height - m.pill.y + 8, m.pill.h + 16)
    }
  });
  console.log(`  screenshot: ${shotPath}`);
  return { direction, measurements: m, problems };
}

async function main() {
  const { proc, url } = await startVite();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  const results = [];
  try {
    // playtest=1 så DevPanel visas i övre högra hörnet (bl.a. PlayerPanel).
    // business=foodtruck så food truck-scenen renderas — irrelevant för
    // pillen men behöver ett giltigt scenläge.
    await page.goto(`${url}/#playtest=1&business=foodtruck`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => typeof (/** @type any */ (window)).__nxSimDispatch === 'function'
        && document.querySelector('button[aria-label="Cash on hand"]') !== null,
      null,
      { timeout: 60000 }
    );

    results.push(await runCase(page, 'up', 1.5));
    results.push(await runCase(page, 'down', 0.5));
  } finally {
    await browser.close();
    await stopVite(proc);
  }

  console.log('\n[order120] resultat:');
  let anyFailed = false;
  for (const r of results) {
    if (r.problems.length === 0) {
      console.log(`  ${r.direction}: PASS`);
    } else {
      anyFailed = true;
      console.log(`  ${r.direction}: FAIL`);
      for (const p of r.problems) console.log(`    - ${p}`);
    }
  }
  if (anyFailed) {
    console.error('\n[order120] DoD 7 misslyckades — se problems ovan');
    process.exit(1);
  }
  console.log('\n[order120] DoD 7 OK — glyfen syns i pillen i båda trend-lägen');
}

await main();
