// ORDER 302b — bildfrekvensen i byn, grenen mot main, växelvis under samma last.
//
// ORDER 302:s mätning (scripts/order297-check.mjs, REPORT_ORDER=order302b,
// reports/order302b/check-*.json) kördes medan datorn var hårt lastad av andra
// körningar (lastsnittet i os.loadavg() över 40 på 12 kärnor), och alla nivåer
// föll, också rummet. Det här skriptet jämför därför grenens bygge (dist/) och
// main:s bygge (MAIN_DIST, byggt ur main 508822e) växelvis i samma körning,
// med samma flöde och samma mätning som order297-check.mjs:
//   - fredagens sparfil i vinbaren (måndagens + 4 dagar), på svenska,
//     baspaketet, dörrarna öppnas, 2×;
//   - vid klockslagen i CHECK_CLOCKS: 1×, nivån byn (V) och gatan (X), 3,5 s
//     väntan, bildrutor per sekund under 2 s (requestAnimationFrame);
//   - lastsnittet (os.loadavg()[0]) vid varje mätning.
// Ordningen växlar per varv: grenen, main, main, grenen.
//
// Utdata: reports/order302b/fps-ab.json.
//
//   MAIN_DIST=/sökväg/till/dist-main [CHECK_CLOCKS=19.30,22.20] [CHECK_SIZES=1440x900,1280x720] node scripts/order302b-fps.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadavg, cpus } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order302b');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const CLOCKS = (process.env.CHECK_CLOCKS ?? '19.30,22.20').split(',');
const SIZES = (process.env.CHECK_SIZES ?? '1440x900,1280x720').split(',').map((s) => s.split('x').map(Number));
const MAIN_DIST = process.env.MAIN_DIST;
if (!MAIN_DIST) throw new Error('MAIN_DIST saknas');
const BUILDS = { gren: { dir: resolve(FRONTEND, 'dist'), port: 4185 }, main: { dir: MAIN_DIST, port: 4186 } };
const procs = [];
for (const b of Object.values(BUILDS)) {
  procs.push(spawn('npx', ['vite', 'preview', '--port', String(b.port), '--strictPort', '--outDir', b.dir], { cwd: FRONTEND, stdio: 'ignore', detached: true }));
  for (let i = 0; i < 240; i++) { try { const r = await fetch(`http://localhost:${b.port}`); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
}
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += 4;
const toMin = (c) => { const [h, m] = c.split('.').map(Number); return h * 60 + m; };

async function run(build, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('o302bfps')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o302bfps', '1'); }
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const out = { build, viewport: `${width}x${height}`, errors, stops: [] };
  try {
    await page.goto(`http://localhost:${BUILDS[build].port}/`, { waitUntil: 'domcontentloaded' });
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
      const until = Date.now() + 8 * 60000;
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
      const levels = [];
      for (const [key, name] of [['v', 'byn'], ['x', 'gatan']]) {
        await page.keyboard.press(key);
        await delay(3500);
        const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
        const probe = await page.evaluate(() => ({ level: document.body.dataset.level ?? null, camDistance: document.body.dataset.camDistance ?? null, clock: document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null, groups: document.body.dataset.villageGroups ?? null }));
        levels.push({ level: name, fps, load1: +loadavg()[0].toFixed(1), ...probe });
      }
      out.stops.push({ stop, levels });
      await page.locator('[data-testid=speed-toggle] button').nth(1).click().catch(() => {});
    }
  } catch (e) {
    out.error = String(e?.message ?? e);
  } finally {
    await ctx.close();
  }
  return out;
}

const report = { cores: cpus().length, mainDist: 'main 508822e (npm run build), MAIN_DIST', grenDist: 'order-302b dist/', runs: [] };
try {
  for (const [w, h] of SIZES) {
    for (const build of ['gren', 'main', 'main', 'gren']) {
      const r = await run(build, w, h);
      report.runs.push(r);
      console.log(r.viewport, r.build, r.error ?? '', r.stops.map((s) => `${s.stop}:${s.levels.map((l) => `${l.level} ${l.fps} (last ${l.load1})`).join(', ')}`).join(' | '));
    }
  }
} finally {
  // Sammanfattning: lägsta och medel per bygge, storlek och nivå.
  const sum = {};
  for (const r of report.runs) for (const s of r.stops) for (const l of s.levels) {
    const k = `${r.viewport} ${r.build} ${l.level}`;
    (sum[k] ??= []).push(l.fps);
  }
  report.summary = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, { min: Math.min(...v), mean: +(v.reduce((a, x) => a + x, 0) / v.length).toFixed(1), n: v.length }]));
  writeFileSync(resolve(OUT, 'fps-ab.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  for (const p of procs) { try { process.kill(-p.pid, 'SIGTERM'); } catch { p.kill('SIGTERM'); } }
}
console.log(JSON.stringify(report.summary, null, 1));
