// ORDER 318 — kontrollen i spelarens flöde (produktionsbygget, 1440 × 900,
// sparfilen måndag vecka 2 i vinbaren):
//   1. Inköpen: varje vara har raden "I lager" med kvällarna och när den går
//      ut; stegräknaren visar dagens inköp; knappen Öppna dörrarna visar samma
//      tid som klockans "Dörrarna öppnar"; bandet Byn i kväll står inte över
//      inköpens rubriker.
//   2. Servicen: bandet är ihopfällt (en rad, "n:e av m efter nöjda
//      gäster"); B fäller ut Byn just nu med alla krogar i placeringens
//      ordning och kolumnerna Gäster och Nöjda; B fäller ihop; klick fäller ut.
//      "Lugn kväll" står inte när krogen har flest gäster.
//   3. Kassan under noll efter ett bokslut: Bankens varning på morgonen.
// Utdata: reports/order318/check-<lang>.json och check-<lang>-*.png.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order318');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4183);
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
const SAVES = {
  service: JSON.stringify(base),
  below: variant((sim) => { sim.cash = -5409; sim.economy = { ...sim.economy, risk: { missedInRow: 0, belowZeroInRow: 1, renegotiated: false, closedWeek: null } }; })
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
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  return { page, ctx };
}
const shot = (page, name) => page.screenshot({ path: resolve(OUT, `check-${LANG}-${name}.png`) });
const has = async (page, sel) => !!(await page.$(sel));

const TIME = /\d{1,2}[.:]\d{2}/;
const visible = (page, sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return getComputedStyle(el).display !== 'none' && r.width > 0 && r.height > 0; }).catch(() => false);

try {
  // 1–2. Inköpen och servicen.
  {
    const { page, ctx } = await open(SAVES.service, 'service');
    if (await has(page, '[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
    if (!(await has(page, '[data-testid=screen-M1]'))) await page.click('[data-testid=open-buy-foot]').catch(() => page.click('[data-testid=open-buy]').catch(() => {}));
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 15000 });
    await delay(600);
    const clockSub = await page.textContent('[data-testid=service-clock-left]').catch(() => '');
    const button = await page.textContent('[data-testid=open-doors]');
    const stockLines = await page.$$eval('[data-testid^=stock-]', (els) => els.map((e) => e.textContent));
    const before = await page.textContent('[data-testid=buy-qty-chicken-plate]').catch(() => null);
    await page.click('[data-testid=buy-more-chicken-plate]');
    await delay(500);
    const after = await page.textContent('[data-testid=buy-qty-chicken-plate]').catch(() => null);
    const chickenLine = await page.textContent('[data-testid=stock-chicken-plate]').catch(() => null);
    report.buy = {
      clockSub, button,
      clockTime: clockSub?.match(TIME)?.[0] ?? null, buttonTime: button?.match(TIME)?.[0] ?? null,
      stockRows: stockLines.length, chickenBefore: before, chickenAfter: after, chickenLine,
      bandVisibleOverBuy: await visible(page, '[data-testid=rival-band]')
    };
    report.buy.sameTime = !!report.buy.clockTime && report.buy.clockTime === report.buy.buttonTime;
    await shot(page, '1-inkopen');
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(800);
    await page.click('[data-testid=open-doors]');
    await delay(500);
    if (await has(page, '[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    // Till gäster i byn (bandet i servicen med en placering).
    const until = Date.now() + 4 * 60000;
    while (Date.now() < until) {
      const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
      if (opt) await opt.click().catch(() => {});
      const rank = await page.getAttribute('[data-testid=rival-band][data-state=service]', 'data-rank').catch(() => null);
      if (rank) break;
      await delay(400);
    }
    await page.keyboard.press('z');
    await delay(1500);
    // Fokusläget (under 14 m) fäller bandets rad; slå av det med H.
    if (!(await visible(page, '[data-testid=rival-toggle]'))) { await page.keyboard.press('h'); await delay(600); }
    const band = async () => ({
      rank: await page.textContent('[data-testid=rival-rank]').catch(() => null),
      open: await page.getAttribute('[data-testid=rival-band]', 'data-open').catch(() => null),
      panel: await has(page, '[data-testid=village-now]'),
      calm: await has(page, '[data-testid=calm-evening]'),
      venues: Number(await page.getAttribute('[data-testid=rival-band]', 'data-venues').catch(() => 0))
    });
    report.folded = await band();
    await shot(page, '2-ihopfalld');
    await page.mouse.click(700, 450).catch(() => {});
    await page.keyboard.press('b');
    await delay(500);
    const rows = await page.$$eval('[data-testid=village-now] tbody tr', (els) => els.map((e) => ({ id: e.getAttribute('data-testid'), guests: Number(e.getAttribute('data-guests')), content: Number(e.getAttribute('data-content')), place: Number(e.getAttribute('data-place')), player: e.getAttribute('data-player') === 'true' })));
    report.open = { ...(await band()), rows, line: await page.textContent('[data-testid=village-now-line]').catch(() => null), head: await page.$$eval('[data-testid=village-now] thead th', (els) => els.map((e) => e.textContent)) };
    report.open.sorted = rows.every((r, i) => i === 0 || rows[i - 1].content >= r.content);
    const me = rows.find((r) => r.player);
    report.open.playerMostGuests = !!me && me.guests > 0 && rows.every((r) => r.player || r.guests < me.guests);
    report.open.calmRule = !(report.open.playerMostGuests && report.open.calm);
    await shot(page, '3-utfalld');
    await page.keyboard.press('b');
    await delay(400);
    report.closedAgain = await band();
    if (!(await visible(page, '[data-testid=rival-toggle]'))) { await page.keyboard.press('h'); await delay(600); }
    await page.click('[data-testid=rival-toggle]');
    await delay(400);
    report.clickOpens = (await band()).panel;
    await ctx.close();
  }
  // 3. Bankens varning.
  {
    const { page, ctx } = await open(SAVES.below, 'below');
    if (await has(page, '[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
    report.bank = { text: await page.textContent('[data-testid=bank-below-zero]').catch(() => null) };
    await shot(page, '4-banken');
    await ctx.close();
  }
  report.ok = report.buy.sameTime && report.buy.stockRows > 0 && report.buy.chickenAfter !== report.buy.chickenBefore && !report.buy.bandVisibleOverBuy
    && /av \d+ efter nöjda gäster|of \d+ by satisfied guests/.test(report.folded.rank ?? '') && !report.folded.panel && report.folded.open === 'false'
    && report.open.panel && report.open.rows.length === report.open.venues && report.open.sorted && report.open.calmRule
    && !report.closedAgain.panel && report.clickOpens
    && /Två bokslut till i rad|Two more settlements/.test(report.bank.text ?? '') && report.errors.length === 0;
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, error: report.error ?? null }));
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
