// ORDER 334 — i produktionsbygget och spelarens flöde:
//   D  banken: sparfilen med vagnen och Åsas erbjudande om vinbaren (reports/order334/save-erbjudande-vinbar.json,
//      skriven av order334Lokalerna.test.tsx). Kortet: Källaren, Till banken, namnet, Ta över. Bilder banken-*.png;
//      bank.json-delen: frågan, rubriken på morgonen (morning-business-name) och lokalen efter övertagandet.
//   C  rummen: sparfilen måndag i vinbaren (reports/order284/save-mandag-vinbaren.json) med economy.premises satt
//      (det LADDER_TAKE skriver), dörrarna öppna, farten 4×; bilder rum-<lokal>-krogen.png (Z) och -gatan.png (X).
//   A  AW: källarens morgon (måndag) med satsningen i listan; bilden aw-morgon.png, och raden i listan.
//   B  stamgästerna: vagnen på Magasinsgatan efter tio kvällar där (economy.truckNights), dörrarna öppna; bilden
//      magasinsgatan-kon.png och window.__nxTruckRegulars (figurerna med egen kopp och kvällens stamgäster).
// Utdata reports/order334/bilder.json.
//
//   [SKIP_BUILD=1] [DELAR=D,C,A,B] node scripts/order334-bilder.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(FRONTEND, 'reports', 'order334', 'bilder');
mkdirSync(DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order334', 'bilder.json');
const PORT = Number(process.env.PORT ?? 4197);
const URL = `http://localhost:${PORT}`;
const DELAR = (process.env.DELAR ?? 'D,C,A,B').split(',');

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));

const read = (p) => JSON.parse(readFileSync(resolve(FRONTEND, p), 'utf8'));
const clock = (page) => page.evaluate(() => document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null);
const minutes = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : -1);
const has = async (page, sel) => !!(await page.$(sel));
async function noCard(page) { const until = Date.now() + 60000; while (Date.now() < until && (await page.$('.nx-rocket'))) await delay(1000); }
async function level(page, key) { await page.keyboard.press(key); await delay(4000); }

async function open(save) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(([key, value]) => {
    if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('seeded', '1'); }
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 }).catch(() => {});
  await delay(2500);
  if (await page.$('[data-testid=morning-review-backdrop]')) await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {});
  return { ctx, page, errors };
}

async function openDoors(page, until = '18.40') {
  if (await page.$('[data-testid=open-buy-foot]')) { await page.click('[data-testid=open-buy-foot]'); await page.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {}); await page.click('[data-testid=buy-base]').catch(() => {}); await delay(600); }
  await page.click('[data-testid=open-doors]').catch(() => {});
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
  const stop = Date.now() + 180000;
  while (Date.now() < stop && minutes(await clock(page)) < minutes(until)) await delay(1000);
}

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)' };
try {
  if (DELAR.includes('D')) {
    const offerSave = read('reports/order334/save-erbjudande-vinbar.json');
    // Inträdesprovets replik är redan sagd (reducer.ts unlockSaid, som scripts/order315b-truck-check.mjs).
    offerSave.sim.unlockSaid = true;
    const { ctx, page, errors } = await open(offerSave);
    // Åsas replik i introduktionens sista steg först (Vidare), sedan erbjudandet.
    for (let i = 0; i < 6 && (await has(page, '[data-testid=mentor-next]')); i++) { await page.click('[data-testid=mentor-next]'); await delay(700); }
    await page.waitForSelector('[data-testid=ladder-offer]', { timeout: 20000 }).catch(async (e) => { await page.screenshot({ path: resolve(DIR, 'banken-fel.png') }); throw e; });
    const before = { title: await page.textContent('[data-testid=morning-business-name]').catch(() => null), nameBox: await has(page, '[data-testid=premises-name]'), take: await has(page, '[data-testid=ladder-take]') };
    await page.click('[data-testid=premises-kallaren]');
    await page.screenshot({ path: resolve(DIR, 'banken-1-lokalen.png') });
    await page.click('[data-testid=premises-to-bank]');
    const ask = await page.textContent('[data-testid=premises-bank-ask]');
    await page.fill('[data-testid=premises-name]', 'Valvet');
    await page.screenshot({ path: resolve(DIR, 'banken-2-namnet.png') });
    await page.click('[data-testid=ladder-take]');
    await delay(2500);
    await page.screenshot({ path: resolve(DIR, 'banken-3-morgonen.png') });
    result.D = { before, ask, after: { title: await page.textContent('[data-testid=morning-business-name]').catch(() => null), offerGone: !(await has(page, '[data-testid=ladder-offer]')) }, errors };
    await ctx.close();
  }
  if (DELAR.includes('C')) {
    result.C = {};
    for (const p of ['kallaren', 'salongen', 'glashornet']) {
      const s = read('reports/order284/save-mandag-vinbaren.json');
      s.sim.economy = { ...s.sim.economy, premises: p };
      const { ctx, page, errors } = await open(s);
      await openDoors(page);
      const shots = {};
      for (const [name, key] of [['krogen', 'z'], ['gatan', 'x']]) {
        await level(page, key);
        await noCard(page);
        await page.screenshot({ path: resolve(DIR, `rum-${p}-${name}.png`) });
        shots[name] = { clock: await clock(page), level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null) };
      }
      // Hela rummet: från Z ett steg ut med mushjulet (taket borta under 26 m, väggarna kapade), så att salongens
      // västra del och Flygelns norra syns.
      await level(page, 'z');
      await page.mouse.move(640, 360);
      await page.mouse.wheel(0, 100);
      for (let i = 0; i < Number(process.env.VRID ?? 2); i++) { await page.keyboard.press('q'); await delay(400); }
      await delay(3000);
      await noCard(page);
      await page.screenshot({ path: resolve(DIR, `rum-${p}-hela.png`) });
      shots.hela = { clock: await clock(page), cam: await page.evaluate(() => document.querySelector('[data-testid=dev-cam]')?.textContent ?? null) };
      result.C[p] = { shots, errors };
      await ctx.close();
    }
  }
  if (DELAR.includes('A')) {
    const s = read('reports/order284/save-mandag-vinbaren.json');
    s.sim.economy = { ...s.sim.economy, premises: 'kallaren' };
    const { ctx, page, errors } = await open(s);
    const row = await has(page, '[data-testid=activity-after-work]');
    if (row) await page.locator('[data-testid=activity-after-work]').scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: resolve(DIR, 'aw-morgon.png') });
    result.A = { awRow: row, text: row ? await page.textContent('[data-testid=activity-after-work]') : null, guests: row ? await page.getAttribute('[data-testid=after-work-guests]', 'data-guests') : null, errors };
    // Samma morgon vid Torget: ingen AW i listan.
    await ctx.close();
    const t = read('reports/order284/save-mandag-vinbaren.json');
    const o = await open(t);
    result.A.torgetAwRow = await has(o.page, '[data-testid=activity-after-work]');
    await o.ctx.close();
  }
  if (DELAR.includes('B')) {
    const s = read('reports/order334/save-erbjudande-vinbar.json');
    s.sim.ladder = { ...s.sim.ladder, offer: null };
    s.sim.unlockSaid = true;
    s.sim.economy = { ...s.sim.economy, truckSpot: 'magasinsgatan', truckNights: { magasinsgatan: 10 } };
    const { ctx, page, errors } = await open(s);
    await openDoors(page, '18.50');
    await level(page, 'x');
    await noCard(page);
    await page.screenshot({ path: resolve(DIR, 'magasinsgatan-gatan.png') });
    await level(page, 'z');
    await noCard(page);
    await page.screenshot({ path: resolve(DIR, 'magasinsgatan-kon.png') });
    result.B = { clock: await clock(page), regulars: await page.evaluate(() => window.__nxTruckRegulars ?? null), errors };
    await ctx.close();
  }
} finally {
  writeFileSync(OUT, JSON.stringify({ definition: 'ORDER 334. D: before = kortet innan banken (rubriken, namnrutan, Ta över), ask = bankens fråga, after.title = morgonens rubrik (morning-business-name) efter övertagandet. C: bilderna rum-<lokal>-<nivå>.png, clock och level vid varje. A: awRow = AW i morgonens lista i källaren, torgetAwRow = vid Torget. B: regulars = window.__nxTruckRegulars (inView = figurerna med egen kopp, tonight = sim day.regularsTonight). errors = sidans fel.', ...result }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify(result, null, 1).slice(0, 3000));
