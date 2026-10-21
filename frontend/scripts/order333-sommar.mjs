// ORDER 333 C — byn i sommarskrud: före- och efterbild. Produktionsbygget och spelarens flöde som i
// scripts/order333-klockan.mjs: sparfilen gjord till foodtrucken på Torget, morgonen, Öppna vid vagnen, farten 4×.
// Bilder (1280 × 720) i reports/order333/sommar/<LABEL>-<namn>.png, under servicen (på morgonen täcker morgonrutan byn):
//   start-byn, start-gatan = när dörrarna öppnat (efter 18.10), nivåerna Byn (V) och Gatan (X)
//   mitt-gatan             = efter 19.30, Gatan
//   sen-gatan, sen-byn     = efter 21.00, Gatan och Byn
// Klockan läses ur [data-testid=service-clock-time]. Situationskorten får gå ut av sig själva; bilden tas när inget
// kort är öppet (högst 60 s väntan).
// Utdata: reports/order333/sommar.json under nyckeln LABEL (klockan vid varje bild, antalet gående i byn).
//
//   LABEL=fore [SKIP_BUILD=1] node scripts/order333-sommar.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT_DIR = resolve(FRONTEND, 'reports', 'order333', 'sommar');
mkdirSync(OUT_DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order333', 'sommar.json');
const PORT = Number(process.env.PORT ?? 4195);
const URL = `http://localhost:${PORT}`;
const LABEL = process.env.LABEL ?? 'efter';

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));

const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const truckSave = () => {
  const s = JSON.parse(JSON.stringify(base));
  const sim = s.sim;
  sim.economy = { ...sim.economy, businessClass: 'foodtruck', loan: null, truckSpot: 'torget' };
  sim.businessClass = 'foodtrucken';
  sim.ladder = { step: 'foodtruck', reachedOnDay: { foodtruck: 1 }, offer: null };
  sim.day.truck = {
    weather: 'sun', rainFromE: null, litter: { A: 0, B: 0, C: 0 }, errand: null, torchesLit: false, sausagesLeft: 60,
    tonight: { eaters: 0, takeaway: 0, littered: 0, clearedByAssistant: 0, clearedByPlayer: 0, torchStartE: null, torchWaited: false, hatchEmptySimSeconds: 0 }
  };
  return JSON.stringify(s);
};

const clock = (page) => page.evaluate(() => document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null);
const minutes = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : -1);
async function level(page, key) {
  await page.mouse.click(640, 400).catch(() => {});
  await page.keyboard.press(key);
  await delay(3500);
}
async function noCard(page) {
  const until = Date.now() + 60000;
  while (Date.now() < until && (await page.$('.nx-rocket'))) await delay(1000);
}
async function shot(page, name, result) {
  await noCard(page);
  await page.screenshot({ path: resolve(OUT_DIR, `${LABEL}-${name}.png`) });
  result.shots[name] = { clock: await clock(page), walkers: await page.evaluate(() => document.body.dataset.villageWalkers ?? null) };
}
async function waitClock(page, hhmm, timeoutS = 240) {
  const until = Date.now() + timeoutS * 1000;
  while (Date.now() < until) { if (minutes(await clock(page)) >= minutes(hhmm)) return true; await delay(1000); }
  return false;
}

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)', shots: {} };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(([key, value]) => {
    if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('seeded', '1'); }
  }, ['nexus.v1.slot1', truckSave()]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(90000);
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 }).catch(() => {});
  await delay(2500);
  if (await page.$('[data-testid=morning-review-backdrop]')) await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {});
  await delay(800);
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
  if (await waitClock(page, '18.10')) { await level(page, 'v'); await shot(page, 'start-byn', result); await level(page, 'x'); await shot(page, 'start-gatan', result); }
  if (await waitClock(page, '19.30')) { await level(page, 'x'); await shot(page, 'mitt-gatan', result); }
  if (await waitClock(page, '21.00')) { await level(page, 'x'); await shot(page, 'sen-gatan', result); await level(page, 'v'); await shot(page, 'sen-byn', result); }
  await ctx.close();
} finally {
  let prev = {};
  try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* första körningen */ }
  writeFileSync(OUT, JSON.stringify({
    definition: 'ORDER 333 C. Bilderna i reports/order333/sommar/<etikett>-<namn>.png, foodtrucken på Torget i produktionsbygget. clock = HUD:ens klocka när bilden togs; walkers = body.dataset.villageWalkers (OsmPedestrians: gående i byn), null om sidan inte sätter det.',
    ...prev, [LABEL]: result
  }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(LABEL, Object.keys(result.shots).join(' '));
