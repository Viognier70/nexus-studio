// ORDER 297 — byn i kvällsljus i produktionsbygget, i spelarens flöde:
// sparfilen måndag i vinbaren flyttad till fredag (SAVE_DAY_OFFSET, förvalt 4),
// på svenska, baspaketet, 2×. Körs i 1440 × 900 och 1280 × 720.
// Vid klockslagen i CHECK_CLOCKS (förvalt 18.20, 19.30, 21.00, 22.50): de fyra
// nivåerna med tangenterna Z X C V, med kamerans avstånd, synfält och mål
// (body.dataset camDistance, camFov, camFocus), nivån (body.dataset.level) och
// det byn skriver ut (body.dataset.village*), och en bild per nivå.
// Utdata: reports/<order>/check-<w>x<h>.json och bilder.
//
//   REPORT_ORDER=order297 [SKIP_BUILD=1] [PORT=4197] [CHECK_CLOCKS=19.30] node scripts/order297-check.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4197);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order297');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const CLOCKS = (process.env.CHECK_CLOCKS ?? '18.20,19.30,21.00,22.50').split(',');
const SIZES = (process.env.CHECK_SIZES ?? '1440x900,1280x720').split(',').map((s) => s.split('x').map(Number));
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += Number(process.env.SAVE_DAY_OFFSET ?? 4);
const toMin = (c) => { const [h, m] = c.split('.').map(Number); return h * 60 + m; };

async function run(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([k, v, scale]) => {
    if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
    // Kalibreringen av kvällsljuset (village/EveningLighting.tsx), bara när den sätts.
    if (scale) localStorage.setItem('nexus.eveningPaletteScale', scale);
  }, ['nexus.v1.slot1', JSON.stringify(save), process.env.CHECK_LIGHT_SCALE ?? '']);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${width}x${height}${process.env.CHECK_LIGHT_SCALE ? '-s' + process.env.CHECK_LIGHT_SCALE : ''}`;
  const report = { viewport: tag, errors, stops: [] };
  const probe = () => page.evaluate(() => ({ ...document.body.dataset, clock: document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null }));
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
    for (const stop of CLOCKS) {
      const until = Date.now() + 8 * 60000;
      while (Date.now() < until) {
        // Raketerna besvaras med första svaret, så att kvällen går vidare.
        const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
        if (opt) await opt.click().catch(() => {});
        const c = await page.$eval('[data-testid=service-clock-time]', (el) => el.textContent).catch(() => null);
        if (c && toMin(c) >= toMin(stop)) break;
        if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=transfer-do]')) break;
        await delay(200);
      }
      // Spelet står still medan nivåerna fotograferas.
      await page.locator('[data-testid=speed-toggle] button').nth(0).click().catch(() => {});
      const levels = [];
      for (const [key, name] of [['v', 'byn'], ['c', 'kvarteret'], ['x', 'gatan'], ['z', 'krogen']]) {
        await page.keyboard.press(key);
        await delay(3500);
        const p = await probe();
        levels.push({ level: name, ...p });
        await page.screenshot({ path: resolve(OUT, `check-${tag}-${stop.replace('.', '')}-${name}.png`) });
      }
      report.stops.push({ stop, levels });
      await page.locator('[data-testid=speed-toggle] button').nth(1).click().catch(() => {});
    }
  } catch (e) {
    report.error = String(e?.message ?? e);
    await page.screenshot({ path: resolve(OUT, `check-${tag}-fel.png`) }).catch(() => {});
  } finally {
    writeFileSync(resolve(OUT, `check-${tag}.json`), JSON.stringify(report, null, 2) + '\n');
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
  console.log(r.viewport, 'errors', r.errors.length, r.error ?? '');
  for (const s of r.stops) for (const l of s.levels) console.log(' ', s.stop, l.level, 'clock', l.clock, 'lvl', l.level === undefined ? '' : l.level, 'dataset.level', l.level, 'dist', l.camDistance, 'fov', l.camFov, 'focus', l.camFocus);
}
