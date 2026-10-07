// ORDER 317 — kontrollen i spelarens flöde (produktionsbygget, 1440 × 900):
//   1. Första morgonen i introduktionen: Åsas skärm med porträttet (D6), och de
//      låsta satsningarna med lås och streckad kant.
//   2. Åsas pratbubbla när låset släppt (D6, kontrollbild 06).
//   3. Vinbaren under servicen (sparfilen måndag vecka 2): situationskortet säger
//      "Situation n i kväll" och "Går tiden ut tar personalen över", rummet på
//      krogens nivå (Z) med husets möblering, och teckenförklaringen i
//      statusläget (S) med kockens ring #7fa8ff.
// LANG_GAME=sv spelar på svenska. Utdata: reports/order317/check-<lang>.json och
// check-<lang>-*.png.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order317');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4181);
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

const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const variant = (fn) => { const s = JSON.parse(JSON.stringify(base)); fn(s.sim); return JSON.stringify(s); };
const SAVES = {
  // Introduktionens första morgon: inget övat, inget prov, låst.
  intro: variant((sim) => { sim.economy = { ...sim.economy, businessClass: null, loan: null }; sim.introduction = { practiced: false }; sim.startLocked = true; sim.medals = {}; sim.cash = 15000; sim.rulesSeen = true; delete sim.ladder; sim.day = { ...sim.day, morningReview: null }; }),
  // Låset har släppt efter introduktionen; Åsas replik är inte visad.
  unlocked: variant((sim) => { sim.startLocked = true; sim.unlockSaid = false; sim.rulesSeen = true; sim.introduction = null; sim.day = { ...sim.day, morningReview: null }; }),
  service: JSON.stringify(base)
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

try {
  // 1. Introduktionen.
  {
    const { page, ctx } = await open(SAVES.intro, 'intro');
    report.intro = {
      m1: await has(page, '[data-testid=screen-M1]'),
      portrait: await has(page, '[data-testid=portrait-mentor] [data-testid=portrait-asa]'),
      name: await page.textContent('[data-testid=mentor]').catch(() => null)
    };
    await shot(page, '1-asa');
    for (let i = 0; i < 2 && (await has(page, '[data-testid=mentor-next]')); i++) { await page.click('[data-testid=mentor-next]'); await delay(500); }
    report.intro.lockedRows = (await page.$$('[data-locked=true]')).length;
    report.intro.lockIcons = await page.$$eval('[data-locked=true]', (els) => els.filter((e) => e.querySelector('svg')).length);
    await shot(page, '2-last');
    await ctx.close();
  }
  // 2. Åsas pratbubbla när låset släppt.
  {
    const { page, ctx } = await open(SAVES.unlocked, 'unlocked');
    await page.waitForSelector('[data-testid=mentor][data-step=unlocked]', { timeout: 15000 }).catch(() => {});
    report.bubble = {
      shown: await has(page, '.nx-asa-bubble'),
      portrait: await has(page, '.nx-asa-bubble [data-testid=portrait-asa]'),
      name: await page.textContent('.nx-asa-name').catch(() => null),
      line: await page.textContent('[data-testid=asa-line]').catch(() => null)
    };
    await shot(page, '3-pratbubblan');
    await ctx.close();
  }
  // 3. Vinbaren under servicen.
  {
    const { page, ctx } = await open(SAVES.service, 'service');
    if (await has(page, '[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
    if (!(await has(page, '[data-testid=screen-M1]'))) await page.click('[data-testid=open-buy]').catch(() => {});
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 15000 }).catch(() => {});
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(1200);
    await page.click('[data-testid=open-doors]');
    await delay(3000);
    await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    await page.waitForSelector('[data-testid=incident-card]', { timeout: 240000 });
    await delay(1500);
    report.card = { count: await page.textContent('[data-testid=rocket-count]'), text: await page.textContent('[data-testid=incident-card]') };
    report.card.timeoutLine = /tar personalen över|the staff take over/.test(report.card.text);
    report.card.noRocket = !/raket|rocket/i.test(report.card.text);
    await shot(page, '4-situationen');
    await page.click('[data-testid=level-room]').catch(() => page.keyboard.press('z'));
    await delay(4000);
    await page.keyboard.press('s');
    await delay(1200);
    report.legend = {
      shown: await has(page, '[data-testid=status-legend]'),
      cook: await page.getAttribute('[data-testid=legend-role-cook]', 'data-colour').catch(() => null),
      groups: (await page.$$('[data-testid=status-legend] .nx-legend-group')).length
    };
    await shot(page, '5-rummet-statuslaget');
    await ctx.close();
  }
  report.ok = report.intro.portrait && report.intro.lockedRows > 0 && report.intro.lockIcons === report.intro.lockedRows
    && report.bubble.shown && report.bubble.portrait
    && /^Situation \d/.test(report.card.count) && report.card.timeoutLine && report.card.noRocket
    && report.legend.shown && report.legend.cook === '#7fa8ff' && report.legend.groups === 4 && report.errors.length === 0;
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
  console.log('CHECK317', report.ok ? 'OK' : 'FEL');
}
