// ORDER 335 D — de tre rummen sida vid sida vid Z (Anders 2026-10-22), i produktionsbygget och spelarens flöde efter
// övertagandet: sparfilen måndag i vinbaren (reports/order284/save-mandag-vinbaren.json) med economy.premises satt
// (det LADDER_TAKE skriver), dörrarna öppna, farten 4×, nivån Krogen (Z) när kvällen är i gång (KLOCKAN, 19.30).
// Varje rum: reports/order335/rum/<lokal>-z.png. Sida vid sida: reports/order335/sida-vid-sida.png (de tre bilderna
// i en sida i samma webbläsare, utan skalning mellan dem). Utdata reports/order335/sida-vid-sida.json: klockan, nivån
// och sidans fel vid varje bild.
//
//   [SKIP_BUILD=1] [KLOCKAN=19.30] node scripts/order335-sida-vid-sida.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(FRONTEND, 'reports', 'order335', 'rum');
mkdirSync(DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order335', 'sida-vid-sida.json');
const PNG = resolve(FRONTEND, 'reports', 'order335', 'sida-vid-sida.png');
const PORT = Number(process.env.PORT ?? 4198);
const URL = `http://localhost:${PORT}`;
const KLOCKAN = process.env.KLOCKAN ?? '19.30';
const LOKALER = ['kallaren', 'salongen', 'glashornet'];
const NAMN = { kallaren: 'Källaren', salongen: 'Salongen', glashornet: 'Flygeln' };

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

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)', klockan: KLOCKAN, rooms: {} };
try {
  for (const p of LOKALER) {
    const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
    save.sim.economy = { ...save.sim.economy, premises: p };
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
    while (Date.now() < stop && minutes(await clock(page)) < minutes(KLOCKAN)) await delay(1000);
    await page.keyboard.press('z');
    await delay(4500);
    await noCard(page);
    await page.screenshot({ path: resolve(DIR, `${p}-z.png`) });
    result.rooms[p] = { clock: await clock(page), level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null), errors };
    await ctx.close();
  }
  // Sida vid sida: de tre bilderna i en sida, samma bredd var, med lokalens namn under.
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 420 } });
  const page = await ctx.newPage();
  const img = (p) => `data:image/png;base64,${readFileSync(resolve(DIR, `${p}-z.png`)).toString('base64')}`;
  await page.setContent(`<html><body style="margin:0;background:#1a1410;display:flex;gap:6px;font:600 18px system-ui;color:#f3e6cf">${LOKALER.map((p) => `<figure style="margin:0;flex:1"><img src="${img(p)}" style="width:100%;display:block"><figcaption style="padding:6px 8px">${NAMN[p]} · ${result.rooms[p].clock ?? ''}</figcaption></figure>`).join('')}</body></html>`);
  await delay(500);
  await page.screenshot({ path: PNG, fullPage: true });
  await ctx.close();
} finally {
  writeFileSync(OUT, JSON.stringify({ definition: 'ORDER 335 D. Bilderna reports/order335/rum/<lokal>-z.png och sida-vid-sida.png. clock = HUD:ens klocka, level = nivåknapparnas data-level (room = Krogen, Z), errors = sidans fel (pageerror).', ...result }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify(result.rooms));
