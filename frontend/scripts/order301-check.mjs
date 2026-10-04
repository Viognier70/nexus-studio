// ORDER 301 — kunskapsgrunden i spelarens flöde, produktionsbygget: Nytt spel
// → registreringen → regelkortet → mentorn → morgonen → Måltidens hus. Där:
// introduktionen Tre sätt att kunna (tre kort och raden om det dubbla
// greppet), "Läs mer" till sidan Kunskapsgrunden, bibliotekets knapp till
// samma sida, och eftertexterna i menyn. För varje vy: att den finns, att
// sidan inte rullar, och en bild.
// Utdata: reports/<REPORT_ORDER|order301>/check.json och check-*.png.
//
//   [REPORT_ORDER=order301] [SKIP_BUILD=1] [CHECK_SIZES=1280x720,1500x950] node scripts/order301-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order301');
mkdirSync(OUT, { recursive: true });
const PORT = 4177;
const URL = `http://localhost:${PORT}`;
const SIZES = (process.env.CHECK_SIZES ?? '1280x720,1500x950').split(',').map((x) => x.split('x').map(Number));
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion', runs: [], errors: [] };
try {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('o301')) { localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o301', '1'); } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => report.errors.push(e.message));
    const run = { size: `${w}×${h}`, views: {} };
    const shot = async (name, sel) => {
      const found = !!(await page.$(sel));
      const scroll = await page.evaluate((s) => { const el = document.querySelector(s); const pan = el?.querySelector('.nxs-rules-panel') ?? el; const de = document.scrollingElement; return { page: de.scrollHeight > innerHeight + 1, panelOver: pan ? Math.max(0, pan.scrollHeight - pan.clientHeight) : null, text: el?.innerText.slice(0, 2000) ?? null }; }, sel);
      run.views[name] = { found, ...scroll };
      await page.screenshot({ path: resolve(OUT, `check-${name}-${w}x${h}.png`) });
    };
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await page.click('[data-testid=new-game]');
    await page.fill('[data-testid=register-name]', 'Anders');
    await page.click('[data-testid=register-sign]');
    await page.waitForSelector('[data-testid=rules-card]', { timeout: 60000 });
    await page.click('[data-testid=rules-close]');
    await page.waitForSelector('[data-testid=mentor-next]', { timeout: 30000 });
    await page.click('[data-testid=mentor-next]');
    await page.waitForSelector('[data-testid=open-house]', { timeout: 30000 });
    await page.click('[data-testid=open-house]');
    await page.waitForSelector('[data-testid=house-intro]', { timeout: 20000 });
    await delay(500);
    await shot('tre-satt', '[data-testid=house-intro]');
    await page.click('[data-testid=house-intro-read-more]');
    await page.waitForSelector('[data-testid=knowledge-foundation]');
    await delay(400);
    await shot('kunskapsgrunden', '[data-testid=knowledge-foundation]');
    await page.click('[data-testid=kf-close]');
    await page.click('[data-testid=house-intro-continue]');
    await page.waitForSelector('[data-testid=open-knowledge-foundation]', { timeout: 20000 });
    await shot('biblioteket', '[data-testid=maltidens-hus]');
    await page.click('[data-testid=open-knowledge-foundation]');
    await page.waitForSelector('[data-testid=knowledge-foundation]');
    run.views.fromLibrary = { found: true };
    await page.click('[data-testid=kf-close]');
    await page.click('[data-testid=close-house]').catch(() => {});
    await delay(400);
    await page.click('[data-testid=menu-button]');
    await page.click('[data-testid=menu-credits]');
    await page.waitForSelector('[data-testid=credits-page]');
    await delay(300);
    await shot('eftertexter', '[data-testid=credits-page]');
    report.runs.push(run);
    console.log(run.size, Object.entries(run.views).map(([k, v]) => `${k}:${v.found ? 'ok' : 'SAKNAS'}${v.page ? ' rullar' : ''}`).join(' '));
    await ctx.close();
  }
} catch (e) {
  report.error = String(e?.message ?? e);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
