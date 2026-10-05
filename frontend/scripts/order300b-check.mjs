// ORDER 300b — samtycket om forskningen i spelarens flöde, produktionsbygget:
// startskärmen → Nytt spel → namn och samtycke (andra stycket, Jag vill delta)
// → öppningen (ORDER 308, hoppas över) → regelkortet (regel 1) → mentorn → menyn, där svaret ändras till Nej tack
// och tillbaka. Svaret läses ur menyns knappar (aria-checked). Varje
// nätverksanrop under körningen loggas; allt utom förhandsvisningens egen
// server räknas som fel (ingen data får skickas).
// Utdata: reports/<REPORT_ORDER|order300b>/check.json och check-*.png.
//
//   [REPORT_ORDER=order300b] [SKIP_BUILD=1] [PORT=4187] node scripts/order300b-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order300b');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4187);
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion', size: '1280×720', errors: [], externalRequests: [] };
const menuState = (page) => page.evaluate(() => ({
  yes: document.querySelector('[data-testid=menu-research-yes]')?.getAttribute('aria-checked') ?? null,
  no: document.querySelector('[data-testid=menu-research-no]')?.getAttribute('aria-checked') ?? null
}));
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('o300b')) { localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o300b', '1'); } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(URL) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) report.externalRequests.push(r.url()); });
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=new-game]');
  await page.waitForSelector('[data-testid=register-screen]');
  await page.fill('[data-testid=register-name]', 'Anders');
  report.researchText = await page.textContent('[data-testid=register-research]');
  await page.click('[data-testid=register-research-yes]');
  report.cardPressed = await page.getAttribute('[data-testid=register-research-yes]', 'aria-pressed');
  report.cardPageScrolls = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 1);
  await page.screenshot({ path: resolve(OUT, 'check-samtycket.png') });
  await page.click('[data-testid=register-sign]');
  // ORDER 308 — öppningen spelas före första morgonen; den hoppas över (knappen syns efter 3 s).
  await page.waitForSelector('[data-testid=opening-skip]', { timeout: 120000 });
  await page.click('[data-testid=opening-skip]');
  await page.waitForSelector('[data-testid=rules-card]', { timeout: 60000 });
  report.rulesText = await page.textContent('[data-testid=rules-card]');
  await page.screenshot({ path: resolve(OUT, 'check-regelkortet.png') });
  await page.click('[data-testid=rules-close]');
  await page.waitForSelector('[data-testid=mentor-next]', { timeout: 30000 });
  await page.click('[data-testid=mentor-next]');
  await delay(500);
  await page.click('[data-testid=menu-button]');
  await page.waitForSelector('[data-testid=menu-research]');
  report.menuAfterYes = await menuState(page);
  await page.screenshot({ path: resolve(OUT, 'check-menyn.png') });
  await page.click('[data-testid=menu-research-no]');
  report.menuAfterNo = await menuState(page);
  await page.click('[data-testid=menu-research-yes]');
  report.menuAfterYesAgain = await menuState(page);
  await ctx.close();
} catch (e) {
  report.error = String(e?.message ?? e);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cardPressed: report.cardPressed, menuAfterYes: report.menuAfterYes, menuAfterNo: report.menuAfterNo, menuAfterYesAgain: report.menuAfterYesAgain, externalRequests: report.externalRequests.length, errors: report.errors.length, rule1: /i rad, och den stänger/.test(report.rulesText ?? '') }));
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
