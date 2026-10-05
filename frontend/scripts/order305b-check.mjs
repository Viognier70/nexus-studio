// ORDER 305b — kvitt eller dubbelt i spelarens flöde, produktionsbygget.
// Sparfilen måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json):
// baspaketet, dörrarna öppnas, och under kvällen:
//   - en planerad raket: spelaren svarar (första alternativet) tills ett steg
//     är rätt; då står valet på kortet (data-testid incident-kvitt) med
//     potten, och svarsalternativen är borta. Spelaren stannar
//     (incident-kvitt-stop), och bandet säger vad potten gav;
//   - en egen raket (Stå för ditt svar, back-start): ingen säkerhet att välja
//     (back-confidence finns inte), och valet efter ett rätt steg är detsamma.
// Svaren: det rätta alternativet läses inte ur sidan (finns inte i produktion),
// så kontrollen svarar med första alternativet tills ett steg är rätt.
// Utdata: reports/order305b/check-*.png och check.json.
//
//   [SKIP_BUILD=1] node scripts/order305b-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order305b');
mkdirSync(OUT, { recursive: true });
const PORT = 4179;
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { size: '1440×900', errors: [] };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('o305b')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o305b', '1'); } }, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));
const shot = (n) => page.screenshot({ path: resolve(OUT, `check-${n}.png`) });
const text = async (sel) => (await page.$(sel)) ? (await page.textContent(sel))?.trim() ?? null : null;

// Svarar på raketerna (alternativen i tur och ordning, så att något steg blir
// rätt) och startar egna raketer när det går, tills valet i kvitt eller
// dubbelt står på kortet. Ingen flagga: allt är spelarens egna knappar.
let clicks = 0;
let backs = 0;
async function untilChoice(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await page.$('[data-testid=incident-kvitt]')) return true;
    const opts = await page.$$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]:not([disabled])');
    if (opts.length) { await opts[(clicks++) % opts.length].click().catch(() => {}); }
    else if (await page.$('[data-testid=back-start]:not([disabled])')) { await page.click('[data-testid=back-start]').catch(() => {}); backs++; }
    await delay(250);
  }
  return !!(await page.$('[data-testid=incident-kvitt]'));
}

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1200);
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]');
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(600);
  await page.click('[data-testid=open-doors]');
  await delay(500);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.keyboard.press('z');

  // Första valet: spelaren stannar och tar potten.
  report.first = { choice: await untilChoice(8 * 60000) };
  if (report.first.choice) {
    report.first.backed = await page.getAttribute('[data-testid=incident-card]', 'data-backed');
    report.first.pot = await page.$eval('[data-testid=incident-kvitt] p', (e) => e.textContent).catch(() => null);
    report.first.optionsHidden = (await page.$$('[data-testid=incident-card] [data-testid^=incident-option-]')).length === 0;
    report.first.confidenceUi = !!(await page.$('[data-testid=back-confidence]'));
    report.first.countdown = await page.$eval('[data-testid=incident-countdown]', (e) => e.textContent).catch(() => null);
    await shot('kvitt-valet');
    await page.click('[data-testid=incident-kvitt-stop]');
    await delay(400);
    report.first.band = await page.$eval('[data-testid=incident-band]', (e) => e.textContent).catch(() => null);
    await shot('kvitt-stannade');
  }
  // Andra valet: spelaren går vidare, och nästa steg öppnas.
  await delay(3000);
  report.second = { choice: await untilChoice(8 * 60000) };
  if (report.second.choice) {
    report.second.backed = await page.getAttribute('[data-testid=incident-card]', 'data-backed');
    const before = await page.getAttribute('[data-testid=incident-card]', 'data-step');
    await page.click('[data-testid=incident-kvitt-go]');
    await page.waitForSelector('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]', { timeout: 15000 }).catch(() => {});
    report.second.stepBefore = before;
    report.second.stepAfter = await page.getAttribute('[data-testid=incident-card]', 'data-step').catch(() => null);
    report.second.optionsBack = (await page.$$('[data-testid=incident-card] [data-testid^=incident-option-]')).length;
    await shot('kvitt-gick-vidare');
  }
  report.clicks = clicks;
  report.backsStarted = backs;
} catch (e) {
  report.errors.push(String(e));
  await shot('fel').catch(() => {});
}
writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
await browser.close();
try { process.kill(-proc.pid); } catch { /* redan stängd */ }
process.exit(0);
