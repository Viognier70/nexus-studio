// ORDER 291 — skärmarna i provspelet (punkt 4–9), på svenska, 1920 × 1080
// och 1440 × 900, ur produktionsbygget. Från sparfilen måndag i vinbaren
// (reports/order284/save-mandag-vinbaren.json):
//   - startskärmen (ljudknappen, punkt 9);
//   - morgonen (HUD:en och rubriken, punkt 4–5);
//   - hovring över Metodkökets rad (punkt 6);
//   - satsningarna (punkt 7);
//   - rummet och personalen (punkt 8).
// Mätvärden skrivs till reports/<order>/screens.json: rubrikens och HUD:ens
// rektanglar och om de överlappar, och hovrade radens text- och bakgrundsfärg.
//
//   REPORT_ORDER=order291 LABEL=after [SKIP_BUILD=1] node scripts/order291-screens.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4180);
const URL = `http://localhost:${PORT}`;
const LABEL = process.env.LABEL ?? 'after';
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order291');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { label: LABEL, sizes: {} };

const rect = (page, sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, scrollH: e.scrollHeight, clientH: e.clientHeight }; }).catch(() => null);
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

try {
  for (const [w, h] of (process.env.SIZES ?? '1920x1080,1440x900,1366x768,1280x720').split(',').map((x) => x.split('x').map(Number))) {
    const key = `${w}x${h}`;
    const r = (report.sizes[key] = {});
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(([k, v]) => {
      if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
    }, ['nexus.v1.slot1', SAVE]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await delay(1500);
    r.startButtons = await page.$$eval('button', (bs) => bs.map((b) => b.textContent?.trim()).filter(Boolean));
    await page.screenshot({ path: resolve(OUT, `screens-${LABEL}-${key}-01-start.png`) });
    await page.click('[data-testid=continue-saved]');
    await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
    await delay(2500);
    const head = await page.$('[data-testid^=screen-][data-testid$=M0], .nxs-morning .nxs-head');
    r.head = head ? await head.evaluate((e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, text: e.textContent?.slice(0, 80) }; }) : null;
    r.hudBoxes = await page.$$eval('[data-testid=cash-counter], [data-testid=credits-counter], [data-testid=day-badge], .nx-hud, [data-testid=hud]', (els) => els.map((e) => { const b = e.getBoundingClientRect(); return { id: e.getAttribute('data-testid') ?? e.className, x: b.x, y: b.y, w: b.width, h: b.height }; }));
    r.hudOverHead = r.hudBoxes.filter((b) => overlap(b, r.head)).map((b) => b.id);
    // Rubriker som klipps: element vars text är högre än boxen.
    r.clipped = await page.$$eval('h1, h2, h3, .nx-h1, .nx-h2, .nxs-title, .nxs-head *', (els) => els.filter((e) => e.scrollHeight > e.clientHeight + 2 && getComputedStyle(e).overflow !== 'visible').map((e) => ({ text: e.textContent?.slice(0, 60), scrollH: e.scrollHeight, clientH: e.clientHeight })));
    await page.screenshot({ path: resolve(OUT, `screens-${LABEL}-${key}-02-morgon.png`) });
    // Satsningarna.
    r.activities = await page.$$eval('[data-testid^=activity-]', (els) => els.map((e) => e.textContent?.trim().slice(0, 60)));
    // Metodköket: hovra raden.
    const pav = await page.$('[data-testid*=metodkoket]');
    if (pav) {
      await pav.hover();
      await delay(400);
      r.hover = await pav.evaluate((e) => { const cs = getComputedStyle(e); const t = e.querySelector('*') ?? e; return { bg: cs.backgroundColor, color: getComputedStyle(t).color, testid: e.getAttribute('data-testid') }; });
      await page.screenshot({ path: resolve(OUT, `screens-${LABEL}-${key}-03-hover.png`) });
    } else r.hover = 'hittades inte';
    // Rummet och personalen.
    if (await page.$('[data-testid=morning-aside]')) {
      await page.click('[data-testid=morning-aside]');
      await delay(1500);
      const bar = await rect(page, '[data-testid=day-action-bar]');
      r.asideBar = bar;
      r.asidePanels = await page.$$eval('.nx-panel, [data-testid$=-panel]', (els) => els.filter((e) => e.offsetParent !== null).map((e) => { const b = e.getBoundingClientRect(); return { id: e.getAttribute('data-testid') ?? e.className.slice(0, 40), x: b.x, y: b.y, w: b.width, h: b.height }; }));
      r.barOverPanels = r.asidePanels.filter((p) => p.id !== 'day-action-bar' && overlap(p, bar)).map((p) => p.id);
      await page.screenshot({ path: resolve(OUT, `screens-${LABEL}-${key}-04-rummet.png`) });
    }
    r.errors = errors;
    await ctx.close();
  }
} catch (e) {
  report.error = String(e?.message ?? e);
} finally {
  writeFileSync(resolve(OUT, `screens-${LABEL}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report, null, 2).slice(0, 4000));
