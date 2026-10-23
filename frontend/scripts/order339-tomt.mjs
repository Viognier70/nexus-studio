// ORDER 339 C — det halvtomma rummet i produktionsbygget och spelarens flöde: sparfilen måndag i vinbaren
// (reports/order284/save-mandag-vinbaren.json) med lokalen källaren (44 platser; i salongen, 35, var rummet inte halvtomt), dörrarna öppna, farten 4×.
// Kl. 20.00: stämningsmätaren (mood-meter data-mood, data-fill) och bilden tomt-krogen.png (Z). Efter stängningen:
// kvällens resultat med raden "Rummet kändes tomt" (result-empty-room, data-occupancy) och bilden tomt-resultat.png.
// Utdata reports/order339/tomt.json.
//
//   [SKIP_BUILD=1] [LOKAL=salongen] node scripts/order339-tomt.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(FRONTEND, 'reports', 'order339', 'bilder');
mkdirSync(DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order339', 'tomt.json');
const PORT = Number(process.env.PORT ?? 4202);
const URL = `http://localhost:${PORT}`;
const LOKAL = process.env.LOKAL ?? 'kallaren';

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
// Simuleringens egna tal ur sparfilen (localStorage), om spelet sparat under kvällen; annars null.
const saved = (page) => page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem('nexus.v1.slot1') ?? 'null')?.sim?.day; return d ? { period: d.period ?? null, emptyRoomMinutes: d.emptyRoomMinutes ?? null, occupancyMinutes: d.occupancyMinutes ?? null, servedMinutes: d.servedMinutes ?? null, roomMoodLift: d.roomMoodLift ?? null } : null; } catch { return null; } });
async function shot(page, name, key, extra) {
  if (key) { await page.keyboard.press(key); await delay(4500); }
  if (extra) await extra(page);
  await noCard(page);
  await page.screenshot({ path: resolve(DIR, `${name}.png`) });
  return { clock: await clock(page), level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null) };
}

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)', premises: LOKAL };
try {
  const { ctx, page, errors } = await evening({ premises: LOKAL }, '20.00');
  result.krogen = await shot(page, 'tomt-krogen', 'z');
  result.savedAt20 = await saved(page);
  result.mood = { mood: await page.getAttribute('[data-testid=mood-meter]', 'data-mood').catch(() => null), fill: await page.getAttribute('[data-testid=mood-meter]', 'data-fill').catch(() => null) };
  // Kvällen till slut (som scripts/order289-evening-flow.mjs): raketerna besvaras, sopbilen och överföringen klickas
  // förbi, och skriptet stannar vid kvällens resultat (screen-R1). sequence = skärmarna i tur och ordning.
  result.sequence = [];
  const has = async (sel) => !!(await page.$(sel));
  const stop = Date.now() + 600000;
  while (Date.now() < stop) {
    const s = (await has('[data-testid=screen-R1]')) ? 'R1' : (await has('[data-testid=waste-continue]')) ? 'S1' : (await has('[data-testid=screen-T2]')) ? 'transfer' : (await has('[data-testid=morning-review-backdrop]')) ? 'morning' : null;
    if (s && s !== result.sequence.at(-1)) result.sequence.push(s);
    const dialogs = (await page.$$eval('[role=dialog]', (els) => els.map((e) => e.getAttribute('data-testid') ?? e.getAttribute('aria-label')).join(','))).slice(0, 120);
    if (result.sequence.length && dialogs !== (result.dialogs ?? []).at(-1)) (result.dialogs ??= []).push(dialogs);
    if (s === 'R1' || s === 'morning') break;
    if (s === 'S1') { await delay(1200); await page.click('[data-testid=waste-continue]').catch(() => {}); }
    else if (s === 'transfer') { await delay(1200); if (await has('[data-testid=transfer-do]')) { await page.click('[data-testid=transfer-do]').catch(() => {}); await page.waitForSelector('[data-testid=transfer-continue]', { timeout: 15000 }).catch(() => {}); } await page.click('[data-testid=transfer-continue]').catch(() => {}); }
    else {
      const card = await page.$('[data-testid=incident-card]');
      if (card && !(await has('[data-testid=incident-band]'))) {
        const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
        if (opt) await opt.click().catch(() => {});
        if ((await card.getAttribute('data-backed')) === 'true') await page.click('[data-testid=back-lock]').catch(() => {});
      }
    }
    await delay(500);
  }
  await delay(1200);
  await page.locator('[data-testid=result-empty-room]').scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await delay(500);
  await page.screenshot({ path: resolve(DIR, 'tomt-resultat.png') });
  result.emptyRoom = (await page.$('[data-testid=result-empty-room]')) ? { text: await page.textContent('[data-testid=result-empty-room]'), occupancy: await page.getAttribute('[data-testid=result-empty-room]', 'data-occupancy') } : null;
  result.savedAtResult = await saved(page);
  result.resultShown = !!(await page.$('[data-testid=screen-R1]'));
  result.errors = errors;
  await ctx.close();
} finally {
  writeFileSync(OUT, JSON.stringify({ definition: 'ORDER 339 C. krogen = bilden tomt-krogen.png kl. 20 (clock, level), mood = stämningsmätaren (data-mood, data-fill), emptyRoom = raden i kvällens resultat (text, data-occupancy = medelbeläggningen i %), savedAt20/savedAtResult = sparfilens day (emptyRoomMinutes, occupancyMinutes, servedMinutes, roomMoodLift) kl. 20 och vid resultatet, null om spelet inte sparat, sequence = kvällens skärmar i tur och ordning, resultShown = resultatet (screen-R1) visades, errors = sidans fel.', ...result }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify(result).slice(0, 2000));
