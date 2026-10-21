// ORDER 333 D — vinbaren i lokalens hus, i produktionsbygget och spelarens flöde efter övertagandet: sparfilen
// reports/order284/save-mandag-vinbaren.json med economy.premises satt till lokalen (det LADDER_TAKE skriver),
// Öppna, farten 4×. För varje lokal (LOKALER, kommaskilt) när dörrarna öppnat:
//   reports/order333/lokal/<lokal>-krogen.png (Z), -gatan.png (X) och -byn.png (V).
// Utdata reports/order333/lokal.json: klockan och nivån (level-bar data-level) vid varje bild.
//
//   [SKIP_BUILD=1] [LOKALER=torget,kallaren,salongen,glashornet] node scripts/order333-lokal.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(FRONTEND, 'reports', 'order333', 'lokal');
mkdirSync(OUT_DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order333', 'lokal.json');
const PORT = Number(process.env.PORT ?? 4196);
const URL = `http://localhost:${PORT}`;
const LOKALER = (process.env.LOKALER ?? 'torget,kallaren,salongen,glashornet').split(',');

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));

const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const saveAt = (premises) => { const s = JSON.parse(JSON.stringify(base)); s.sim.economy = { ...s.sim.economy, premises }; return JSON.stringify(s); };
const clock = (page) => page.evaluate(() => document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null);
const minutes = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : -1);
async function noCard(page) { const until = Date.now() + 60000; while (Date.now() < until && (await page.$('.nx-rocket'))) await delay(1000); }
// Nivåknapparna lyssnar på fönstret; inget klick i scenen (det kan öppna en figurs kort).
async function level(page, key) { await page.keyboard.press(key); await delay(4000); }

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)', premises: {} };
try {
  for (const p of LOKALER) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript(([key, value]) => {
      if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('seeded', '1'); }
    }, ['nexus.v1.slot1', saveAt(p)]);
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
    // Vinbarens morgon: köp in grundpaketet (M1) och öppna dörrarna (som scripts/order323-gatan.mjs).
    if (await page.$('[data-testid=open-buy-foot]')) { await page.click('[data-testid=open-buy-foot]'); await page.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {}); await page.click('[data-testid=buy-base]').catch(() => {}); await delay(600); }
    await page.click('[data-testid=open-doors]').catch(() => {});
    await page.click('[data-testid=start-service]').catch(() => {});
    await delay(800);
    if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    const until = Date.now() + 180000;
    while (Date.now() < until && minutes(await clock(page)) < minutes('18.40')) await delay(1000);
    const shots = {};
    for (const [name, key] of [['krogen', 'z'], ['gatan', 'x'], ['byn', 'v']]) {
      await level(page, key);
      await noCard(page);
      await page.screenshot({ path: resolve(OUT_DIR, `${p}-${name}.png`) });
      shots[name] = { clock: await clock(page), level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null) };
    }
    result.premises[p] = { shots, errors };
    await ctx.close();
  }
} finally {
  writeFileSync(OUT, JSON.stringify({ definition: 'ORDER 333 D. Bilderna i reports/order333/lokal/<lokal>-<nivå>.png. clock = HUD:ens klocka, level = nivåknapparnas data-level, errors = sidans fel (pageerror).', ...result }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
for (const [p, r] of Object.entries(result.premises)) console.log(p, JSON.stringify(r.shots), r.errors.length ? 'FEL ' + r.errors.join(' | ') : '');
