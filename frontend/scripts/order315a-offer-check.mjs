// ORDER 315a — Åsas erbjudande och "Din väg" i spelarens flöde (produktionsbygget).
//
// Sparfilen måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json)
// med kraven för bistron uppfyllda och ett erbjudande i samma form som
// sim/ladder.ts offerAtNight sätter vid dagens slut. Beloppen (insatsen och
// lånet) sätter skriptet; att simuleringen räknar dem prövas i
// order315aStegen.test.tsx. Skriptet prövar kortet och åtgärderna i spelet.
// Morgonen: recensionerna stängs, kortet visas med Åsa, steget, priset och
// "Din väg"; "Inte än" ger raden som öppnar kortet igen; "Ta över" ger bistron.
// LANG_GAME=sv spelar på svenska. Utdata: reports/order315a/offer-<lang>.json
// och offer-<lang>-{kort,avbojt,taget,dinvag}.png.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order315a');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4179);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'en';

async function startPreview() {
  if (!process.env.SKIP_BUILD) {
    await new Promise((res, rej) => {
      const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' });
      b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))));
    });
  }
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(URL); if (r.ok) return proc; } catch { /* väntar */ }
    await delay(500);
  }
  throw new Error('preview timeout');
}

const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const sim = save.sim;
sim.cash = 70000;
sim.reputation = 0.62;
sim.medals = { ...sim.medals, metodkoket: 'silver', stensota: sim.medals.stensota ?? 'brons' };
// Erbjudandet som offerAtNight sätter det; beloppen är kortets (insatsen och lånet).
sim.ladder = { step: 'vinbar', reachedOnDay: {}, offer: { to: 'bistro', depositSek: 12000, loanSek: 105225, state: 'offered', offeredOnDay: sim.day.dayNumber } };
const SAVE = JSON.stringify(save);

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', lang: LANG, errors: [], ok: false };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([key, value, lang]) => {
  if (!sessionStorage.getItem('offer-seeded')) { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('offer-seeded', '1'); }
}, ['nexus.v1.slot1', SAVE, LANG]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));
const has = async (sel) => !!(await page.$(sel));

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  if (await has('[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(600); }
  await page.waitForSelector('[data-testid=ladder-offer]', { timeout: 15000 });
  report.card = {
    to: await page.getAttribute('[data-testid=ladder-offer]', 'data-to'),
    sender: await page.getAttribute('[data-testid=ladder-offer] [data-testid=sender]', 'data-sender'),
    line: await page.textContent('[data-testid=ladder-line]'),
    price: await page.textContent('[data-testid=ladder-price]'),
    dinVagSteps: (await page.$$('[data-testid=ladder-offer] [data-step]')).length,
    comingLater: (await page.$$('[data-testid=ladder-offer] [data-state=later]')).length,
    take: await page.textContent('[data-testid=ladder-take]'),
    notYet: await page.textContent('[data-testid=ladder-not-yet]')
  };
  await page.screenshot({ path: resolve(OUT, `offer-${LANG}-kort.png`) });
  await page.click('[data-testid=ladder-not-yet]');
  await delay(500);
  report.declined = { cardGone: !(await has('[data-testid=ladder-offer]')), standing: await has('[data-testid=ladder-standing]') ? await page.textContent('[data-testid=ladder-standing]') : null };
  await page.screenshot({ path: resolve(OUT, `offer-${LANG}-avbojt.png`) });
  await page.click('[data-testid=din-vag-open]');
  await delay(400);
  report.dinVag = { shown: await has('[data-testid=din-vag-backdrop] [data-testid=din-vag]'), here: await page.getAttribute('[data-testid=din-vag-backdrop] [data-state=here]', 'data-step') };
  await page.screenshot({ path: resolve(OUT, `offer-${LANG}-dinvag.png`) });
  await page.click('[data-testid=din-vag-close]');
  await delay(300);
  await page.click('[data-testid=ladder-standing]');
  await page.waitForSelector('[data-testid=ladder-offer]');
  await page.click('[data-testid=ladder-take]');
  await delay(800);
  report.taken = { cardGone: !(await has('[data-testid=ladder-offer]')), standingGone: !(await has('[data-testid=ladder-standing]')) };
  await page.click('[data-testid=din-vag-open]');
  await delay(400);
  report.taken.here = await page.getAttribute('[data-testid=din-vag-backdrop] [data-state=here]', 'data-step');
  await page.screenshot({ path: resolve(OUT, `offer-${LANG}-taget.png`) });
  report.ok = report.card.to === 'bistro' && report.card.sender === 'asa' && report.card.dinVagSteps === 8 && report.card.comingLater === 5
    && report.declined.cardGone && !!report.declined.standing && report.dinVag.shown && report.dinVag.here === 'vinbar'
    && report.taken.cardGone && report.taken.standingGone && report.taken.here === 'bistro' && report.errors.length === 0;
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
  await page.screenshot({ path: resolve(OUT, `offer-${LANG}-fel.png`) }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, `offer-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
  console.log('OFFER', report.ok ? 'OK' : 'FEL');
}
