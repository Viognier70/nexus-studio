// ORDER 309b — Recensioner i morse i kvällens koncept, i spelarens flöde,
// produktionsbygget (vite build + preview), 1440 × 900.
//
// Sparfilen måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json),
// OFÖRÄNDRAD. Spelarens flöde: inköpen (baspaketet, konceptet bistro), dörrarna
// öppnas, kvällen spelas i 4× (öppna raketkort besvaras med första svaret)
// och nästa morgon kommer. Kortet läses ur DOM:en (data-testid morning-review,
// morning-review-rep: data-scope, data-tier, data-from, data-to och rubriken)
// och simuleringen ur sparfilen i localStorage efter morgonen
// (sim.day.morningReview, sim.reputationByTier, sim.reputation).
//
// Utdata: reports/order309b/check.json och check-recensioner-i-morse.png.
//
//   [SKIP_BUILD=1] node scripts/order309b-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order309b');
mkdirSync(OUT, { recursive: true });
const PORT = 4181;
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { build: 'produktion (vite build + preview)', size: '1440×900', save: 'reports/order284/save-mandag-vinbaren.json (oförändrad)', steps: {}, errors: [] };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('o309b')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o309b', '1'); } }, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));

async function answerOpen() {
  const o = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
  if (o) await o.click().catch(() => {});
  const b = await page.$('[data-testid=incident-kvitt-stop]'); if (b) await b.click().catch(() => {});
}
const savedSim = () => page.evaluate(() => {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('nexus.v1.slot'));
  for (const k of keys) {
    try {
      const s = JSON.parse(localStorage.getItem(k)).sim;
      if (s) return { key: k, dayNumber: s.day?.dayNumber, period: s.day?.period, reputation: s.reputation, reputationByTier: s.reputationByTier ?? null, conceptReputationAtServiceStart: s.day?.conceptReputationAtServiceStart ?? null, booking: s.day?.booking ? { dayNumber: s.day.booking.dayNumber, concept: s.day.booking.concept ?? null } : null, morningReview: s.day?.morningReview ?? null };
    } catch { /* nästa */ }
  }
  return null;
});

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]');
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(600);
  report.steps.concept = await page.$eval('[data-testid=booking-concept]', (e) => e.getAttribute('data-concept')).catch(() => null);
  await page.click('[data-testid=open-doors]');
  await delay(500);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await delay(2000);
  report.steps.opened = await savedSim();
  await page.locator('[data-testid=speed-toggle] button').nth(2).click().catch(() => {});
  const untilMorning = Date.now() + 16 * 60000;
  while (Date.now() < untilMorning) {
    await answerOpen();
    for (const sel of ['[data-testid=waste-continue]', '[data-testid=transfer-do]', '[data-testid=compare-continue]', '[data-testid=result-continue]', '[data-testid=lesson-continue]', '[data-testid=next-day]', '[data-testid=story-continue]']) {
      const b = await page.$(sel); if (b) await b.click().catch(() => {});
    }
    if (await page.$('[data-testid=morning-review]')) break;
    await delay(500);
  }
  await delay(1500);
  report.steps.review = await page.$eval('[data-testid=morning-review]', (e) => ({
    change: e.getAttribute('data-change'),
    rep: (() => { const r = e.querySelector('[data-testid=morning-review-rep]'); return r ? { scope: r.getAttribute('data-scope'), tier: r.getAttribute('data-tier'), from: r.getAttribute('data-from'), to: r.getAttribute('data-to'), heading: r.querySelector('.nx-review-kicker')?.textContent ?? null } : null; })(),
    lines: [...e.querySelectorAll('[data-testid=morning-review-line]')].map((l) => ({ kind: l.getAttribute('data-kind'), delta: +l.getAttribute('data-delta'), voice: l.getAttribute('data-voice'), text: l.innerText }))
  })).catch(() => null);
  await page.screenshot({ path: resolve(OUT, 'check-recensioner-i-morse.png') });
  report.steps.morning = await savedSim();
  const r = report.steps.review;
  const m = report.steps.morning?.morningReview;
  if (r && m) {
    report.steps.consistency = {
      linesSum: r.lines.reduce((a, l) => a + l.delta, 0),
      change: Number(r.change),
      sumIsChange: r.lines.reduce((a, l) => a + l.delta, 0) === Number(r.change),
      fromIsSavedStart: report.steps.opened?.conceptReputationAtServiceStart != null ? Number(r.rep.from) === Math.round(report.steps.opened.conceptReputationAtServiceStart * 100) : null,
      toIsConceptMorning: m.tier && report.steps.morning.reputationByTier ? Number(r.rep.to) === Math.round(report.steps.morning.reputationByTier[m.tier] * 100) : null,
      restaurantMorning: Math.round(report.steps.morning.reputation * 100)
    };
  }
} catch (e) {
  report.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, 'check-fel.png') }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report, null, 1).slice(0, 5000));
