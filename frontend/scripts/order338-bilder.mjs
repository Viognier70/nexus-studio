// ORDER 338 — bistron i hela Flygeln i produktionsbygget (efter scripts/order337-bilder.mjs, delen A): sparfilen måndag
// i vinbaren med lokalen Flygeln och karriärsteget bistro, dörrarna öppna; bilderna flygeln-z.png (Krogen) och
// flygeln-hela.png (från Z ett steg ut och vriden mot den norra delen med vridknapparna). Utdata reports/order338/bilder.json.
//
//   [SKIP_BUILD=1] node scripts/order338-bilder.mjs
// (Nedan: ORDER 337:s skript, delen A med bara Flygeln.)
//   C  namnet: sparfilen med vagnen och Åsas erbjudande om vinbaren (reports/order334/save-erbjudande-vinbar.json). För
//      varje lokal: kortet, lokalen, Till banken, ett eget namn, Ta över; sedan rubriken på morgonen
//      (morning-business-name), nivån Gatan (X) och krogens skylt (player-sign och village-venue för spelaren).
//      Bilder namn-<lokal>-{morgon,gatan}.png. Ingen text får innehålla "vid torget" / "on the square".
//   A  bistron: sparfilen måndag i vinbaren (reports/order284/save-mandag-vinbaren.json) med economy.premises och
//      karriärsteget bistro (ladder.step, det LADDER_TAKE skriver när bistron tas över), dörrarna öppna, Z:
//      bistro-<lokal>-z.png och sida vid sida bistro-sida-vid-sida.png.
// Utdata reports/order337/bilder.json.
//
//   [SKIP_BUILD=1] [DELAR=C,A] node scripts/order337-bilder.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(FRONTEND, 'reports', 'order338', 'bilder');
mkdirSync(DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order338', 'bilder.json');
const PORT = Number(process.env.PORT ?? 4201);
const URL = `http://localhost:${PORT}`;
const DELAR = ['A'];
const LOKALER = ['glashornet'];
const NAMN = { kallaren: 'Valvet', salongen: 'Kakelugnen', glashornet: 'Glasrummet' };

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const read = (p) => JSON.parse(readFileSync(resolve(FRONTEND, p), 'utf8'));
const has = async (page, sel) => !!(await page.$(sel));
const clock = (page) => page.evaluate(() => document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null);
const minutes = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : -1);
const TORGET = /vid torget|on the square|by the square/i;

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

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)' };
try {
  if (DELAR.includes('C')) {
    result.C = {};
    for (const p of LOKALER) {
      const save = read('reports/order334/save-erbjudande-vinbar.json');
      save.sim.unlockSaid = true;
      const { ctx, page, errors } = await open(save);
      await page.waitForSelector('[data-testid=ladder-offer]', { timeout: 20000 });
      const offerTitle = await page.textContent('[data-testid=ladder-offer] h2');
      await page.click(`[data-testid=premises-${p}]`);
      await page.click('[data-testid=premises-to-bank]');
      const ask = await page.textContent('[data-testid=premises-bank-ask]');
      await page.fill('[data-testid=premises-name]', NAMN[p]);
      await page.click('[data-testid=ladder-take]');
      await delay(3000);
      await page.screenshot({ path: resolve(DIR, `namn-${p}-morgon.png`) });
      const title = await page.textContent('[data-testid=morning-business-name]').catch(() => null);
      await page.keyboard.press('x');
      await delay(5000);
      await page.screenshot({ path: resolve(DIR, `namn-${p}-gatan.png`) });
      const signs = await page.$$eval('[data-testid=player-sign] .nx-venue-name, [data-testid=village-venue][data-venue=player] .nx-venue-name', (els) => els.map((e) => e.textContent));
      const texts = [offerTitle, ask, title, ...signs];
      result.C[p] = { offerTitle, ask, title, signs, level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null), torgetInText: texts.some((t) => TORGET.test(t ?? '')), nameInSign: signs.some((t) => (t ?? '').includes(NAMN[p])), errors };
      await ctx.close();
    }
  }
  if (DELAR.includes('A')) {
    result.A = {};
    for (const p of LOKALER) {
      const save = read('reports/order284/save-mandag-vinbaren.json');
      save.sim.economy = { ...save.sim.economy, premises: p };
      save.sim.ladder = { ...(save.sim.ladder ?? {}), step: 'bistro', reachedOnDay: { ...(save.sim.ladder?.reachedOnDay ?? {}), bistro: save.sim.day.dayNumber - 3 }, offer: null, refit: null };
      save.businessName = NAMN[p];
      const { ctx, page, errors } = await open(save);
      if (await page.$('[data-testid=open-buy-foot]')) { await page.click('[data-testid=open-buy-foot]'); await page.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {}); await page.click('[data-testid=buy-base]').catch(() => {}); await delay(600); }
      await page.click('[data-testid=open-doors]').catch(() => {});
      await page.click('[data-testid=start-service]').catch(() => {});
      await delay(800);
      if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
      await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
      await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
      const stop = Date.now() + 240000;
      while (Date.now() < stop && minutes(await clock(page)) < minutes('19.00')) await delay(1000);
      await page.keyboard.press('z');
      await delay(4500);
      const t0 = Date.now(); while (Date.now() - t0 < 60000 && (await has(page, '.nx-rocket'))) await delay(1000);
      await page.screenshot({ path: resolve(DIR, 'flygeln-z.png') });
      await page.mouse.move(640, 360);
      await page.mouse.wheel(0, 100);
      for (let i = 0; i < Number(process.env.ROT ?? 4); i++) { await page.click('[data-testid=camera-left]').catch(() => {}); await delay(350); }
      await delay(3000);
      await page.screenshot({ path: resolve(DIR, 'flygeln-hela.png') });
      result.A[p] = { clock: await clock(page), level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null), title: await page.textContent('[data-testid=morning-business-name]').catch(() => null), errors };
      await ctx.close();
    }
  }
} finally {
  writeFileSync(OUT, JSON.stringify({ definition: 'ORDER 338. Bilderna reports/order338/bilder/flygeln-{z,hela}.png. (Fälten som ORDER 337:) C: offerTitle = Åsas kort, ask = bankens fråga, title = morgonens rubrik (morning-business-name), signs = krogens skylt vid gatan (player-sign / village-venue player), torgetInText = någon av texterna säger "vid torget" eller "on the square", nameInSign = bankens namn står på skylten. A: bistrons rum vid Z, bilderna bistro-<lokal>-z.png och bistro-sida-vid-sida.png. errors = sidans fel.', ...result }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify(result).slice(0, 3000));
