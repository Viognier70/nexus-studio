// ORDER 297b — vad kostar på byns nivå? Produktionsbygget, spelarens flöde
// (fredagens sparfil i vinbaren, som scripts/order297-check.mjs), kl. PROFILE_CLOCK
// (förvalt 19.30), nivån V (660 m). Med localStorage 'nexus.renderProfile'
// (lib/RenderProfileProbe.tsx): bildfrekvensen med allt, sedan med en av
// scenens delar dold i taget, utan skuggor, och en CPU-profil (CDP Profiler)
// med de dyraste funktionerna.
// Utdata: reports/<REPORT_ORDER>/profil-<w>x<h>.json
//
//   REPORT_ORDER=order297b [SKIP_BUILD=1] [PROFILE_LEVEL=v] node scripts/order297b-profile.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4197);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order297b');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const STOP = process.env.PROFILE_CLOCK ?? '19.30';
const LEVEL_KEY = process.env.PROFILE_LEVEL ?? 'v';
const SIZES = (process.env.CHECK_SIZES ?? '1440x900').split(',').map((s) => s.split('x').map(Number));
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

const FPS = (page, ms = 2500) => page.evaluate((ms) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }), ms);

async function run(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
    localStorage.setItem('nexus.renderProfile', '1');
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const report = { viewport: `${width}x${height}`, stop: STOP, levelKey: LEVEL_KEY, errors };
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
    const until = Date.now() + 8 * 60000;
    while (Date.now() < until) {
      const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
      if (opt) await opt.click().catch(() => {});
      const c = await page.$eval('[data-testid=service-clock-time]', (el) => el.textContent).catch(() => null);
      if (c && toMin(c) >= toMin(STOP)) break;
      await delay(200);
    }
    for (let i = 0; i < 100; i++) {
      const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
      if (opt) await opt.click().catch(() => {});
      const busy = await page.evaluate(() => !!document.querySelector('[data-testid=incident-card]') || (document.body.dataset.moment ?? '') !== '');
      if (!busy) break;
      await delay(300);
    }
    // Paus, så att kvällen står still medan delarna mäts.
    await page.evaluate(() => window.__nexusProfile.setSpeed(0));
    await page.keyboard.press(LEVEL_KEY);
    await delay(4000);
    const stats = () => page.evaluate(() => ({ calls: +document.body.dataset.renderCalls, triangles: +document.body.dataset.renderTriangles, camDistance: document.body.dataset.camDistance, clock: document.querySelector('[data-testid=service-clock-time]')?.textContent }));
    report.all = { fps: await FPS(page), ...(await stats()) };
    const parts = await page.evaluate(() => window.__nexusProfile.parts());
    report.parts = [];
    for (const p of parts) {
      await page.evaluate((p) => window.__nexusProfile.setVisible(p, false), p);
      await delay(400);
      const r = { part: p, fps: await FPS(page, 2000), ...(await stats()) };
      await page.evaluate((p) => window.__nexusProfile.setVisible(p, true), p);
      r.callsSaved = report.all.calls - r.calls;
      r.trianglesSaved = report.all.triangles - r.triangles;
      report.parts.push(r);
    }
    report.parts.sort((a, b) => b.fps - a.fps);
    await page.evaluate(() => window.__nexusProfile.shadows(false));
    await delay(600);
    report.noShadows = { fps: await FPS(page), ...(await stats()) };
    await page.evaluate(() => window.__nexusProfile.shadows(true));
    await delay(600);
    report.allAgain = { fps: await FPS(page), ...(await stats()) };
    // Kvällen igång igen (2×, spelets förval): bildfrekvensen och CPU-profilen
    // under tre sekunder, medan simuleringen går.
    await page.evaluate(() => window.__nexusProfile.setSpeed(2));
    // Ett konsekvensögonblick tar kameran: mätningen görs om tills nivån står.
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 60; j++) {
        const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
        if (opt) await opt.click().catch(() => {});
        if (!(await page.evaluate(() => !!document.querySelector('[data-testid=incident-card]') || (document.body.dataset.moment ?? '') !== ''))) break;
        await delay(300);
      }
      await page.keyboard.press(LEVEL_KEY);
      await delay(2500);
      const before = (await stats()).camDistance;
      report.running = { fps: await FPS(page), ...(await stats()), camBefore: before, tries: i + 1 };
      if (report.running.camDistance === before && Math.abs(+before - 660) < 5 === (LEVEL_KEY === 'v')) break;
    }
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
    await delay(3000);
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map();
    const dt = new Map();
    for (let i = 0; i < profile.samples.length; i++) dt.set(profile.samples[i], (dt.get(profile.samples[i]) ?? 0) + (profile.timeDeltas[i] ?? 0));
    for (const n of profile.nodes) {
      const f = n.callFrame;
      const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
      self.set(key, (self.get(key) ?? 0) + (dt.get(n.id) ?? 0));
    }
    const total = [...self.values()].reduce((a, b) => a + b, 0);
    report.cpu = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, us]) => ({ fn: k, share: +(us / total).toFixed(3) }));
    await page.screenshot({ path: resolve(OUT, `profil-${width}x${height}.png`) });
  } catch (e) {
    report.error = String(e?.message ?? e);
  } finally {
    writeFileSync(resolve(OUT, `profil-${width}x${height}.json`), JSON.stringify(report, null, 2) + '\n');
    await ctx.close();
  }
  return report;
}
const results = [];
try { for (const [w, h] of SIZES) results.push(await run(w, h)); } finally {
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
for (const r of results) console.log(r.viewport, 'all', JSON.stringify(r.all), 'noShadows', JSON.stringify(r.noShadows), r.error ?? '');
