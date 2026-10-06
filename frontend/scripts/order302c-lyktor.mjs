// ORDER 302c — kontrasten mellan gästernas kroppar (gatans färger, Designs
// leverans 2026-10-06) och marken under och nära gatlyktorna, i spelets bild.
//
// Produktionsbygget (vite build + preview), spelarens flöde som ORDER 302b
// (scripts/order302b-check.mjs): fredagens sparfil i vinbaren, baspaketet,
// dörrarna öppnas, kvällen i 2×. Vid klockslagen i CHECK_CLOCKS, i 1×, på
// gatans nivå (X, 42 m):
//   - PROBES mätningar med en sekunds mellanrum. Varje mätning ber spelet om
//     en (document.body.dataset.lampProbe = 'req'); spelet läser bildpunkterna
//     i samma bildruta som figurerna ritas (src/strategic/scene/village/lampProbe.ts)
//     och skriver kroppens och markens luminans, kvoten och närmaste lyktas
//     avstånd och tändning till dataset.lampProbeResult;
//   - en bild av skärmen per stopp (lyktor-<w>x<h>-<klockslag>.jpg).
// Zonerna: under lyktan = inom LIGHTS.lamps.poolRadiusM (5 m, villageEvening.ts)
// från en tänd lykta (k ≥ 0,5); nära = 5–10 m; borta = längre eller släckt.
// Bandet är leveransens 1,8–3,6 (guestGroups.ts checkGroupsAgainstStreet).
//
// Utdata: reports/order302c/lyktor-<w>x<h>.json (rows: varje figur och mätning,
// summary: per grupp, källa och zon).
//
//   [SKIP_BUILD=1] [CHECK_CLOCKS=19.15,20.00] [CHECK_SIZES=1440x900] [PROBES=8] node scripts/order302c-lyktor.mjs
//
// ORDER 302d — samma mätning före och efter: REPORT_DIR (förval order302c)
// väljer mappen under reports/, LABEL (t.ex. fore, efter) läggs först i
// filnamnen, DIST pekar på ett annat bygge (då byggs inget). Sammanfattningen
// har också källa och zon (summary["källa|zon"]) och klockslaget (stops[].clock).
//
//   DIST=/sökväg/dist-main REPORT_DIR=order302d LABEL=fore node scripts/order302c-lyktor.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadavg } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4187);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_DIR ?? 'order302c');
const LABEL = process.env.LABEL ? `${process.env.LABEL}-` : '';
const DIST = process.env.DIST ?? null;
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const CLOCKS = (process.env.CHECK_CLOCKS ?? '19.15,20.00,21.00,22.00,22.45').split(',');
const SIZES = (process.env.CHECK_SIZES ?? '1440x900').split(',').map((s) => s.split('x').map(Number));
const PROBES = Number(process.env.PROBES ?? 8);
// villageEvening.ts LIGHTS.lamps.poolRadiusM (replikerat: .mjs kan inte läsa TypeScript; kontrolleras nedan mot källan).
const POOL_M = 5;
const src = readFileSync(resolve(FRONTEND, 'src/strategic/village/villageEvening.ts'), 'utf8');
if (!new RegExp(`poolRadiusM:\\s*${POOL_M}\\b`).test(src)) throw new Error('poolRadiusM i villageEvening.ts är inte 5: uppdatera POOL_M');
const BAND = [1.8, 3.6];

if (process.env.SKIP_BUILD !== '1' && !DIST) {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', ...(DIST ? ['--outDir', DIST] : [])], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += 4;
const toMin = (c) => { const [h, m] = c.split('.').map(Number); return h * 60 + m; };

const zoneOf = (r) => (r.lampM !== null && r.lampK >= 0.5 && r.lampM <= POOL_M ? 'under' : r.lampM !== null && r.lampK >= 0.5 && r.lampM <= 2 * POOL_M ? 'near' : 'away');

async function probe(page) {
  return page.evaluate(() => new Promise((res) => {
    document.body.dataset.lampProbeResult = '';
    document.body.dataset.lampProbe = 'req';
    const t0 = performance.now();
    const tick = () => {
      if (document.body.dataset.lampProbe === 'done' || performance.now() - t0 > 4000) {
        const r = document.body.dataset.lampProbeResult;
        document.body.dataset.lampProbe = '';
        res(r ? JSON.parse(r) : null);
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}

async function run(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('o302c')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o302c', '1'); }
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${width}x${height}`;
  const report = { viewport: tag, label: process.env.LABEL ?? null, dist: DIST ?? 'dist/', save: 'reports/order284/save-mandag-vinbaren.json, dayNumber + 4 (fredag)', band: BAND, poolRadiusM: POOL_M, load1: [], errors, stops: [], rows: [] };
  try {
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await page.click('[data-testid=continue-saved]');
    await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
    await delay(1200);
    await page.click('[data-testid=open-buy-foot]');
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(800);
    await page.click('[data-testid=open-doors]');
    await delay(500);
    if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await page.locator('[data-testid=speed-toggle] button').nth(1).click().catch(() => {});
    for (const stop of CLOCKS) {
      const until = Date.now() + 10 * 60000;
      while (Date.now() < until) {
        const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
        if (opt) await opt.click().catch(() => {});
        const c = await page.$eval('[data-testid=service-clock-time]', (el) => el.textContent).catch(() => null);
        if (c && toMin(c) >= toMin(stop)) break;
        await delay(200);
      }
      for (let i = 0; i < 100; i++) {
        const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
        if (opt) await opt.click().catch(() => {});
        const busy = await page.evaluate(() => !!document.querySelector('[data-testid=incident-card]') || (document.body.dataset.moment ?? '') !== '');
        if (!busy) break;
        await delay(300);
      }
      await page.locator('[data-testid=speed-toggle] button').nth(0).click().catch(() => {});
      await page.keyboard.press('x');
      await delay(3500);
      const info = await page.evaluate(() => ({ level: document.body.dataset.level ?? null, camDistance: document.body.dataset.camDistance ?? document.body.dataset.camDist ?? null, clock: document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null, lampsLit: document.body.dataset.streetLampsLit ?? null }));
      const file = `${LABEL}lyktor-${tag}-${stop.replace('.', '')}.jpg`;
      await page.screenshot({ path: resolve(OUT, file), type: 'jpeg', quality: 80 });
      const probes = [];
      for (let k = 0; k < PROBES; k++) {
        const r = await probe(page);
        probes.push({ k, figures: r?.figures ?? null, rows: r?.rows?.length ?? 0, error: r?.error ?? (r ? undefined : 'ingen mätning') });
        for (const row of r?.rows ?? []) report.rows.push({ stop, probe: k, zone: zoneOf(row), ...row });
        await delay(1000);
      }
      report.load1.push(+loadavg()[0].toFixed(1));
      report.stops.push({ stop, ...info, file, probes });
      await page.locator('[data-testid=speed-toggle] button').nth(1).click().catch(() => {});
    }
  } catch (e) {
    report.error = String(e?.message ?? e);
    await page.screenshot({ path: resolve(OUT, `${LABEL}lyktor-${tag}-fel.jpg`), type: 'jpeg', quality: 80 }).catch(() => {});
  } finally {
    // Sammanfattningen per grupp, källa och zon (och per grupp och zon för alla källor).
    const summary = {};
    const add = (key, r) => {
      const s = (summary[key] ??= { n: 0, ratios: [], below: 0, above: 0, bodyBrighter: 0 });
      s.n++; s.ratios.push(r.ratio);
      if (r.ratio < BAND[0]) s.below++;
      if (r.ratio > BAND[1]) s.above++;
      if (r.bodyBrighter) s.bodyBrighter++;
    };
    for (const r of report.rows) {
      const g = `${r.group ?? '-'}:${r.variant}`;
      add(`${g}|${r.zone}|alla`, r);
      add(`${g}|${r.zone}|${r.src}`, r);
      add(`${r.src}|${r.zone}`, r);
    }
    for (const s of Object.values(summary)) {
      const a = s.ratios.sort((p, q) => p - q);
      s.min = a[0]; s.median = a[a.length >> 1]; s.max = a[a.length - 1];
      delete s.ratios;
    }
    report.summary = summary;
    writeFileSync(resolve(OUT, `${LABEL}lyktor-${tag}.json`), JSON.stringify(report, null, 2) + '\n');
    await ctx.close();
  }
  return report;
}
const results = [];
try { for (const [w, h] of SIZES) results.push(await run(w, h)); } finally {
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
for (const r of results) {
  console.log(r.viewport, 'errors', r.errors.length, r.error ?? '', 'rows', r.rows.length, 'load1', r.load1.join(','));
  for (const s of r.stops) console.log(' ', s.stop, 'clock', s.clock, 'dist', s.camDistance, 'lit', s.lampsLit, 'probes', s.probes.map((p) => p.rows).join(','));
  for (const [k, s] of Object.entries(r.summary).filter(([k]) => k.endsWith('|alla')).sort()) console.log(' ', k, JSON.stringify(s));
}
