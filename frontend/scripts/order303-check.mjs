// ORDER 303 — följderna i spelarens flöde, produktionsbygget. Sparfilen
// måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json):
// baspaketet, dörrarna öppnas, och under kvällen:
//   - raketkortet och pyramidens ögonblick efter ett rätt steg
//     (data-testid pyramid-moment, raden pyramid-moment-line);
//   - statusläget (S): stämningssymbolerna och personalens kort;
//   - fokusläget (H): body.dataset.focus;
//   - nästa morgon: Recensioner i morse (data-testid morning-review).
// Svaren: det rätta alternativet läses ur raketens data i sidan (window.__nexusAnswer
// finns inte i produktion), så kontrollen svarar med första alternativet och
// noterar om ögonblicket syntes.
// Utdata: reports/<REPORT_ORDER|order303>/check-*.png och check.json.
//
//   [REPORT_ORDER=order303] [SKIP_BUILD=1] [CHECK_PART=moment] [CHECK_OUT=check.json] node scripts/order303-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order303');
mkdirSync(OUT, { recursive: true });
const PORT = 4178;
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { size: '1440×900', steps: {}, errors: [] };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('o303')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o303', '1'); } }, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));
const shot = (n) => page.screenshot({ path: resolve(OUT, `check-${n}.png`) });
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
  // Raketerna: svara med första alternativet och se om ögonblicket syns.
  let moments = 0;
  let tries = 0;
  let lines = [];
  const until = Date.now() + 6 * 60000;
  while (Date.now() < until && moments < 1) {
    // Alternativen prövas i tur och ordning mellan raketerna, så att ett steg klaras någon gång.
    const opts = await page.$$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
    const opt = opts.length > 0 ? opts[(tries++) % opts.length] : null;
    if (opt) {
      if (!report.steps.card) { await shot('raketkortet'); report.steps.card = true; }
      await opt.click().catch(() => {});
      const m = await page.waitForSelector('[data-testid=pyramid-moment]', { timeout: 2500 }).catch(() => null);
      if (m) {
        moments++;
        lines.push(await page.$eval('[data-testid=pyramid-moment-line]', (e) => e.textContent).catch(() => null));
        if (moments === 1) await shot('pyramidens-ogonblick');
        const gone = await page.waitForSelector('[data-testid=pyramid-moment]', { state: 'detached', timeout: 4000 }).then(() => true).catch(() => false);
        report.steps.momentGone = gone;
      }
    }
    await delay(250);
  }
  report.steps.moments = moments;
  report.steps.momentLines = lines;
  // Statusläget.
  for (let i = 0; i < 40 && await page.$('[data-testid=incident-card]'); i++) { const o = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]'); if (o) await o.click().catch(() => {}); await delay(300); }
  await page.keyboard.press('z');
  await delay(2500);
  await page.keyboard.press('s');
  await delay(800);
  report.steps.status = await page.evaluate(() => ({ pressed: document.querySelector('[data-testid=status-mode]')?.getAttribute('aria-pressed') }));
  await shot('statuslaget');
  await page.keyboard.press('s');
  // Fokusläget.
  await page.keyboard.press('h');
  await delay(600);
  report.steps.focus = await page.evaluate(() => document.body.dataset.focus ?? null);
  await shot('fokuslaget');
  await page.keyboard.press('h');
  if (process.env.CHECK_PART === 'moment') throw Object.assign(new Error('stop'), { stop: true });
  // Till nästa morgon i 4×.
  await page.locator('[data-testid=speed-toggle] button').nth(2).click().catch(() => {});
  const untilMorning = Date.now() + 12 * 60000;
  while (Date.now() < untilMorning) {
    const o = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
    if (o) await o.click().catch(() => {});
    for (const sel of ['[data-testid=waste-continue]', '[data-testid=transfer-do]', '[data-testid=compare-continue]', '[data-testid=result-continue]', '[data-testid=lesson-continue]', '[data-testid=next-day]', '[data-testid=story-continue]']) {
      const b = await page.$(sel); if (b) await b.click().catch(() => {});
    }
    if (await page.$('[data-testid=morning-review]')) break;
    await delay(500);
  }
  report.steps.review = await page.$eval('[data-testid=morning-review]', (e) => ({ text: e.textContent, change: e.getAttribute('data-change') })).catch(() => null);
  await shot('recensioner-i-morse');
} catch (e) {
  if (!e?.stop) report.error = String(e?.message ?? e);
  await shot('fel').catch(() => {});
} finally {
  writeFileSync(resolve(OUT, process.env.CHECK_OUT ?? 'check.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report, null, 1));
