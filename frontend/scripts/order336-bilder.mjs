// ORDER 336 — i produktionsbygget och spelarens flöde efter övertagandet: sparfilen måndag i vinbaren
// (reports/order284/save-mandag-vinbaren.json) med economy.premises satt (det LADDER_TAKE skriver) och, för C,
// economy.followingRegulars (det LADDER_TAKE skriver efter Magasinsgatan). Dörrarna öppna, farten 4×.
//   A salongen: reports/order336/bilder/salongen-{krogen,hela}.png
//   B källaren: kallaren-{krogen,gatan,byn,trappan}.png (trappan: Z-nivån vriden mot norra fasaden när kön står där)
//   C stamgästerna: stamgaster-krogen.png och window.__nxRoomRegulars (figurerna med kopp i rummet)
// Utdata reports/order336/bilder.json: klockan, nivån och sidans fel vid varje bild.
//
//   [SKIP_BUILD=1] [DELAR=A,B,C] node scripts/order336-bilder.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(FRONTEND, 'reports', 'order336', 'bilder');
mkdirSync(DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order336', 'bilder.json');
const PORT = Number(process.env.PORT ?? 4199);
const URL = `http://localhost:${PORT}`;
const DELAR = (process.env.DELAR ?? 'A,B,C').split(',');

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const clock = (page) => page.evaluate(() => document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null);
const minutes = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : -1);
async function noCard(page) { const until = Date.now() + 60000; while (Date.now() < until && (await page.$('.nx-rocket'))) await delay(1000); }

async function evening(economy, until) {
  const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
  save.sim.economy = { ...save.sim.economy, ...economy };
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
  if (await page.$('[data-testid=open-buy-foot]')) { await page.click('[data-testid=open-buy-foot]'); await page.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {}); await page.click('[data-testid=buy-base]').catch(() => {}); await delay(600); }
  await page.click('[data-testid=open-doors]').catch(() => {});
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
  const stop = Date.now() + 240000;
  while (Date.now() < stop && minutes(await clock(page)) < minutes(until)) await delay(1000);
  return { ctx, page, errors };
}
async function shot(page, name, key, extra) {
  if (key) { await page.keyboard.press(key); await delay(4500); }
  if (extra) await extra(page);
  await noCard(page);
  await page.screenshot({ path: resolve(DIR, `${name}.png`) });
  return { clock: await clock(page), level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null) };
}

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)' };
try {
  if (DELAR.includes('A')) {
    const { ctx, page, errors } = await evening({ premises: 'salongen' }, '19.00');
    const krogen = await shot(page, 'salongen-krogen', 'z');
    const hela = await shot(page, 'salongen-hela', null, async (p) => { await p.mouse.move(640, 360); await p.mouse.wheel(0, 100); for (let i = 0; i < 2; i++) { await p.keyboard.press('q'); await delay(400); } await delay(3000); });
    result.A = { krogen, hela, errors };
    await ctx.close();
  }
  if (DELAR.includes('B')) {
    const { ctx, page, errors } = await evening({ premises: 'kallaren' }, '18.30');
    const trappan = await shot(page, 'kallaren-trappan', 'z', async (p) => { for (let i = 0; i < 4; i++) { await p.keyboard.press('e'); await delay(400); } await delay(2500); });
    const krogen = await shot(page, 'kallaren-krogen', 'z');
    const gatan = await shot(page, 'kallaren-gatan', 'x');
    const byn = await shot(page, 'kallaren-byn', 'v');
    result.B = { trappan, krogen, gatan, byn, errors };
    await ctx.close();
  }
  if (DELAR.includes('T')) {
    // Trappan när de första gästerna kommer: Z, kameran vriden ROT steg (q) mot norra fasaden.
    const { ctx, page, errors } = await evening({ premises: 'kallaren' }, process.env.KLOCKAN ?? '18.12');
    const rot = Number(process.env.ROT ?? 3);
    const trappan = await shot(page, `kallaren-trappan-${process.env.KEY ?? 'z'}${rot}`, process.env.KEY ?? 'z', async (p) => { for (let i = 0; i < rot; i++) { await p.click('[data-testid=camera-left]').catch(() => {}); await delay(350); } await delay(2500); });
    result.T = { trappan, errors };
    await ctx.close();
  }
  if (DELAR.includes('C')) {
    const { ctx, page, errors } = await evening({ premises: 'torget', followingRegulars: 8, truckNights: { magasinsgatan: 5 } }, '19.30');
    const krogen = await shot(page, 'stamgaster-krogen', 'z');
    result.C = { krogen, regulars: await page.evaluate(() => window.__nxRoomRegulars ?? null), errors };
    await ctx.close();
  }
} finally {
  writeFileSync(OUT, JSON.stringify({ definition: 'ORDER 336. Bilderna reports/order336/bilder/*.png. clock = HUD:ens klocka, level = nivåknapparnas data-level, errors = sidans fel (pageerror). C.regulars = window.__nxRoomRegulars (withCup = figurerna i rummet med Magasinsgatans kopp, tonight = sim day.regularsTonight).', ...result }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify(result).slice(0, 2000));
