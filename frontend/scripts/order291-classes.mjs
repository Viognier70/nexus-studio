// ORDER 291 punkt 3 — varje verksamhet i servicen från spelarens höjd:
// graderingen, rekvisitan och gästerna. Sparfilen måndag i vinbaren
// (reports/order284/save-mandag-vinbaren.json) laddas som den är och som
// food truck (economy.businessClass och rummet byts i sparfilen; menyn och
// lagret köps på morgonen). Servicen öppnas, kameran flyger till krogen
// (ServiceCamera), och efter en minut tas en bild. I screens-classes.json:
// klassen, kamerans avstånd (body.dataset.camDistance), graderingen
// (body.dataset.roomGrade) och antalet gäster i simuleringen.
//
// Avvikelse: sparfilen är skriven för vinbaren; food truckens morgon börjar
// från vinbarens lager och personal. Bilden visar rummet och gästerna, inte
// en food truck-vecka.
//
//   REPORT_ORDER=order291 [SKIP_BUILD=1] node scripts/order291-classes.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4181);
const URL = `http://localhost:${PORT}`;
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
const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const CLASSES = [['vinbar', 'vinbaren'], ['foodtruck', 'foodtrucken']];
const report = { classes: {} };

try {
  for (const [cls, room] of CLASSES) {
    const save = JSON.parse(JSON.stringify(base));
    save.sim.economy.businessClass = cls;
    save.sim.businessClass = room;
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await ctx.addInitScript(([k, v]) => {
      if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
    }, ['nexus.v1.slot1', JSON.stringify(save)]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await page.click('[data-testid=continue-saved]');
    await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
    await delay(1500);
    if (await page.$('[data-testid=open-buy-foot]')) {
      await page.click('[data-testid=open-buy-foot]');
      await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
      await page.click('[data-testid=buy-base]').catch(() => {});
      await delay(800);
      await page.click('[data-testid=open-doors]');
    } else {
      await page.click('[data-testid=start-service]').catch(() => {});
    }
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await delay(60000);
    const r = await page.evaluate(() => ({ camDistance: document.body.dataset.camDistance ?? null, roomGrade: document.body.dataset.roomGrade ?? null }));
    await page.screenshot({ path: resolve(OUT, `classes-${cls}-service.png`) });
    report.classes[cls] = { ...r, errors };
    await ctx.close();
  }
} catch (e) {
  report.error = String(e?.message ?? e);
} finally {
  writeFileSync(resolve(OUT, 'screens-classes.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report, null, 2));
