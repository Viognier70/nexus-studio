// ORDER 315b del 2 — kontrollen i spelarens flöde för Designs D7 med tillägget
// (produktionsbygget, 1440 × 900, sparfilen måndag vecka 2 i vinbaren, med varianter):
//   1. Din väg på morgonen: åtta steg, vinbaren "här", bistron nästa med tre krav.
//   2. Åsas erbjudande vid dörren efter stängning: kortet till höger med fyra rader,
//      Åsa på trottoaren och kameran vid dörren.
//   3. Bistron: rummet med bistrons möblering (31 platser), morgonens rad med steget.
//   4. En morgon under ombyggnaden: rutan med dagen och stegen, rummet tömt.
//   5. Fikat efter stängning: kortet till höger och laget vid bordet.
//   6. Foodtrucken på torget: spelarens släpvagn och rivalen på den nya platsen; under servicen
//      går Krogen (Z) nära vagnen i 3D (ORDER 315b del 3), utan den gamla 2D-scenen.
// Utdata: reports/order315b-2/check-<lang>.json och check-<lang>-*.png.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order315b-2');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4185);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'sv';

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

const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const variant = (fn) => { const s = JSON.parse(JSON.stringify(base)); fn(s.sim); return JSON.stringify(s); };
const DAY = base.sim.day.dayNumber;
const SAVES = {
  morning: JSON.stringify(base),
  offer: variant((sim) => {
    sim.cash = 90000; sim.reputation = 0.7;
    sim.ladder = { step: 'vinbar', reachedOnDay: {}, offer: { to: 'bistro', depositSek: 15000, loanSek: 120000, state: 'offered', offeredOnDay: DAY, atDoor: true } };
    sim.day = { ...sim.day, period: 'evening', eveningStep: 'offer' };
  }),
  bistro: variant((sim) => { sim.ladder = { step: 'bistro', reachedOnDay: { bistro: DAY - 5 }, offer: null, refit: null }; }),
  refit: variant((sim) => { sim.ladder = { step: 'bistro', reachedOnDay: { bistro: DAY - 1 }, offer: null, refit: { fromDay: DAY - 1, untilDay: DAY + 1 } }; }),
  fika: variant((sim) => {
    sim.fika = { tonight: { day: DAY, dilemmaId: 'fika-kylen', answer: null, previous: null }, log: [], loyalty: {} };
    sim.day = { ...sim.day, period: 'evening', eveningStep: 'fika' };
  }),
  truck: variant((sim) => {
    sim.economy = { ...sim.economy, businessClass: 'foodtruck', loan: null };
    sim.businessClass = 'foodtrucken';
    sim.ladder = { step: 'foodtruck', reachedOnDay: { foodtruck: 1 }, offer: null };
  })
};

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', lang: LANG, errors: [], ok: false };

async function open(save, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([key, value, lang, t]) => {
    if (sessionStorage.getItem('seeded') !== t) { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('seeded', t); }
  }, ['nexus.v1.slot1', save, LANG, tag]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(`${tag}: ${e.message}`));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar], [data-testid=evening-bar]', { timeout: 60000 });
  await delay(1500);
  return { page, ctx };
}
const shot = (page, name) => page.screenshot({ path: resolve(OUT, `check-${LANG}-${name}.png`) });
const has = async (page, sel) => !!(await page.$(sel));

const clearReview = async (page) => { if (await has(page, '[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); } };

try {
  // 1. Din väg.
  {
    const { page, ctx } = await open(SAVES.morning, 'morning');
    await clearReview(page);
    await page.click('[data-testid=din-vag-open]');
    await delay(500);
    report.dinVag = {
      steps: await page.$$eval('[data-testid=din-vag] [data-step]', (els) => els.map((e) => [e.getAttribute('data-step'), e.getAttribute('data-state')])),
      req: await page.$$eval('[data-testid^=din-vag-req-]', (els) => els.map((e) => [e.getAttribute('data-kind'), e.getAttribute('data-ok'), e.textContent])),
      line: await page.textContent('[data-testid=screen-S1] .nx-label, .nxs-head .nx-label').catch(() => null)
    };
    await shot(page, '1-din-vag');
    await ctx.close();
  }
  // 2. Erbjudandet vid dörren.
  {
    const { page, ctx } = await open(SAVES.offer, 'offer');
    await page.waitForSelector('[data-testid=screen-owner-offer]', { timeout: 30000 }).catch(() => {});
    await delay(2500);
    report.offer = {
      shown: await has(page, '[data-testid=screen-owner-offer]'),
      rows: await page.$$eval('[data-testid=owner-rows] li', (els) => els.map((e) => e.textContent)),
      line: await page.textContent('[data-testid=owner-line]').catch(() => null)
    };
    await shot(page, '2-erbjudandet');
    await page.click('[data-testid=owner-take]').catch(() => {});
    await delay(600);
    report.offer.reply = await page.textContent('[data-testid=owner-reply]').catch(() => null);
    await shot(page, '2b-ta-over');
    await ctx.close();
  }
  // 3. Bistron.
  {
    const { page, ctx } = await open(SAVES.bistro, 'bistro');
    await clearReview(page);
    report.bistro = { line: await page.textContent('.nxs-head .nx-label').catch(() => null) };
    // Servicen i bistron: inköpen, dörrarna, och krogens nivå.
    await page.click('[data-testid=open-buy-foot]').catch(() => {});
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 10000 }).catch(() => {});
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
    await page.click('[data-testid=open-doors]').catch(() => {});
    await delay(500);
    if (await has(page, '[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    await delay(20000);
    for (let i = 0; i < 3; i++) { const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]'); if (opt) { await opt.click().catch(() => {}); await delay(800); } }
    await page.mouse.click(700, 450).catch(() => {});
    await page.keyboard.press('z');
    await delay(4000);
    await shot(page, '3-bistron');
    await ctx.close();
  }
  // 4. Ombyggnaden.
  {
    const { page, ctx } = await open(SAVES.refit, 'refit');
    await clearReview(page);
    report.refit = {
      box: await page.textContent('[data-testid=refit-box]').catch(() => null),
      day: await page.getAttribute('[data-testid=refit-box]', 'data-day').catch(() => null),
      start: await has(page, '[data-testid=start-service]')
    };
    await shot(page, '4-ombyggnaden');
    await ctx.close();
  }
  // 5. Fikat.
  {
    const { page, ctx } = await open(SAVES.fika, 'fika');
    await page.waitForSelector('[data-testid=screen-fika]', { timeout: 30000 }).catch(() => {});
    await delay(2500);
    report.fika = { overlay: await has(page, '.nx-fika-overlay'), question: await page.textContent('[data-testid=fika-question]').catch(() => null) };
    await shot(page, '5-fikat');
    await page.click('[data-testid=fika-option-A]').catch(() => {});
    await delay(1200);
    report.fika.graded = await page.$$eval('[data-testid^=fika-graded-]', (els) => els.map((e) => [e.getAttribute('data-grade'), e.getAttribute('data-chosen')]));
    await shot(page, '5b-fikat-svar');
    await ctx.close();
  }
  // 6. Foodtrucken på torget, och krogens nivå (Z) som 3D nära vagnen (ORDER 315b del 3).
  {
    const { page, ctx } = await open(SAVES.truck, 'truck');
    await clearReview(page);
    await page.keyboard.press('x');
    await delay(4000);
    await shot(page, '6-vagnen');
    await page.click('[data-testid=start-service]').catch(() => {});
    await delay(800);
    if (await has(page, '[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    await delay(15000);
    await page.mouse.click(700, 450).catch(() => {});
    await page.keyboard.press('z');
    await delay(4000);
    report.truck = {
      overlay2d: await has(page, '[data-testid=truck-room]'),
      level: await page.evaluate(() => document.body.dataset.level ?? null),
      crew: await page.evaluate(() => {
        const c = window.__nxTruckCrew;
        if (!c) return null;
        const w = (o) => { const v = o.getWorldPosition(new o.position.constructor()); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; };
        const shown = (o) => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
        return { grill: w(c.grill), hatch: w(c.hatch), visible: shown(c.grill) && shown(c.hatch), guests: c.g.children.filter((o) => o.visible).length - 2 };
      })
    };
    await shot(page, '6b-vagnen-krogen');
    await ctx.close();
  }
  report.ok = report.dinVag.steps.length === 8 && report.dinVag.steps.some(([id, st]) => id === 'vinbar' && st === 'here') && report.dinVag.steps.some(([id, st]) => id === 'bistro' && st === 'next') && report.dinVag.req.length === 3
    && report.offer.shown && report.offer.rows.length === 4 && !!report.offer.reply
    && /Bistro/.test(report.bistro.line ?? '')
    && !!report.refit.box && !report.refit.start
    && report.fika.overlay && report.fika.graded.length > 0
    && !report.truck.overlay2d && report.truck.level === 'room' && report.truck.crew?.visible === true && report.errors.length === 0;
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, error: report.error ?? null }));
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
