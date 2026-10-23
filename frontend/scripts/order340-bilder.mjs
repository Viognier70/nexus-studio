// ORDER 340 i produktionsbygget och spelarens flöde (efter scripts/order338-bilder.mjs och order339-tomt.mjs).
//   A  lokalvalet: sparfilen med Åsas erbjudande om vinbaren (reports/order334/save-erbjudande-vinbar.json); lokalerna med
//      hyran, inredningen (premises-fitout-*, data-fitout) och folket på torget (premises-walkins). Bild lokalvalet.png.
//   P  bistrons meny vid Torget: raden om priserna (buy-bistro-prices) och rätternas priser, bild bistro-meny.png.
//   BC bistron i källaren (40 vid långborden) och i Flygeln (fyra servitörer till): sparfilen måndag i vinbaren
//      (reports/order284/save-mandag-vinbaren.json) med lokalen och karriärsteget bistro, dörrarna öppna, Z kl. 19.30.
//      Bilder bistro-kallaren-z.png, bistro-flygeln-z.png.
//   D  det tomma rummet: samma sparfil med bistron i Flygeln (66 platser; D_LOKAL, D_BISTRO), farten 4×. Stämningsmätaren läses var
//      femte sekund (data-fill, data-mood och data-empty-room = det tomma rummets del, day.emptyRoomLift) från 19.00
//      till stängningen; bilden tomt-z.png när det tomma rummets del är som lägst (gästerna tittar ut), och kvällens
//      resultat (result-empty-room) med bilden tomt-resultat.png.
// Utdata reports/order340/bilder.json.
//
//   [SKIP_BUILD=1] [DELAR=A,P,BC,D] node scripts/order340-bilder.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(FRONTEND, 'reports', 'order340', 'bilder');
mkdirSync(DIR, { recursive: true });
const OUT = resolve(FRONTEND, 'reports', 'order340', 'bilder.json');
const PORT = Number(process.env.PORT ?? 4203);
const URL = `http://localhost:${PORT}`;
const DELAR = (process.env.DELAR ?? 'A,P,BC,D').split(',');

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
const noCard = async (page) => { const t0 = Date.now(); while (Date.now() - t0 < 60000 && (await has(page, '.nx-rocket'))) await delay(1000); };

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

async function openEvening(save) {
  const o = await open(save);
  const { page } = o;
  if (await page.$('[data-testid=open-buy-foot]')) { await page.click('[data-testid=open-buy-foot]'); await page.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {}); await page.click('[data-testid=buy-base]').catch(() => {}); await delay(600); }
  await page.click('[data-testid=open-doors]').catch(() => {});
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
  return o;
}
async function until(page, at) { const stop = Date.now() + 300000; while (Date.now() < stop && minutes(await clock(page)) < minutes(at)) await delay(1000); }
// Raketerna besvaras med det första svaret, som i scripts/order289-evening-flow.mjs.
async function answerCards(page) {
  const card = await page.$('[data-testid=incident-card]');
  if (card && !(await has(page, '[data-testid=incident-band]'))) {
    const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
    if (opt) await opt.click().catch(() => {});
    if ((await card.getAttribute('data-backed')) === 'true') await page.click('[data-testid=back-lock]').catch(() => {});
  }
}
const meter = (page) => page.evaluate(() => { const m = document.querySelector('[data-testid=mood-meter]'); return m ? { fill: Number(m.getAttribute('data-fill')), mood: m.getAttribute('data-mood'), emptyRoom: Number(m.getAttribute('data-empty-room')) } : null; });

// Delarna läggs till i den befintliga utdatan (en körning med DELAR=D skriver inte över A och BC).
let prior = {};
try { prior = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* första körningen */ }
const result = { ...prior, at: new Date().toISOString(), build: 'produktion (vite build + preview)' };
delete result.definition;
try {
  if (DELAR.includes('A')) {
    const save = read('reports/order334/save-erbjudande-vinbar.json');
    save.sim.unlockSaid = true;
    const { ctx, page, errors } = await open(save);
    await page.waitForSelector('[data-testid=premises-picker]', { timeout: 20000 }).catch(() => {});
    const premises = {};
    for (const p of ['torget', 'kallaren', 'salongen', 'glashornet']) {
      premises[p] = { rent: await page.getAttribute(`[data-testid=premises-rent-${p}]`, 'data-rent').catch(() => null), fitOut: await page.getAttribute(`[data-testid=premises-fitout-${p}]`, 'data-fitout').catch(() => null), fitOutText: await page.textContent(`[data-testid=premises-fitout-${p}]`).catch(() => null) };
    }
    const walkIns = await page.textContent('[data-testid=premises-walkins]').catch(() => null);
    await page.locator('[data-testid=premises-picker]').scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: resolve(DIR, 'lokalvalet.png') });
    result.A = { premises, walkIns, errors };
    await ctx.close();
  }
  if (DELAR.includes('P')) {
    // Bistrons meny vid Torget om morgonen: raden om priserna (buy-bistro-prices) och rätternas priser.
    const save = read('reports/order284/save-mandag-vinbaren.json');
    save.sim.economy = { ...save.sim.economy, premises: 'torget' };
    save.sim.ladder = { ...(save.sim.ladder ?? {}), step: 'bistro', reachedOnDay: { ...(save.sim.ladder?.reachedOnDay ?? {}), bistro: save.sim.day.dayNumber - 3 }, offer: null, refit: null };
    const { ctx, page, errors } = await open(save);
    await page.click('[data-testid=open-buy-foot]').catch(() => {});
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {});
    await delay(800);
    await page.screenshot({ path: resolve(DIR, 'bistro-meny.png') });
    result.P = {
      line: await page.textContent('[data-testid=buy-bistro-prices]').catch(() => null),
      pct: await page.getAttribute('[data-testid=buy-bistro-prices]', 'data-pct').catch(() => null),
      rows: await page.$$eval('[data-testid=buy-menu] .nxs-row-sub', (els) => els.map((e) => e.textContent)).catch(() => []),
      errors
    };
    await ctx.close();
  }
  if (DELAR.includes('BC')) {
    result.BC = {};
    for (const p of ['kallaren', 'glashornet']) {
      const save = read('reports/order284/save-mandag-vinbaren.json');
      save.sim.economy = { ...save.sim.economy, premises: p };
      save.sim.ladder = { ...(save.sim.ladder ?? {}), step: 'bistro', reachedOnDay: { ...(save.sim.ladder?.reachedOnDay ?? {}), bistro: save.sim.day.dayNumber - 3 }, offer: null, refit: null };
      const { ctx, page, errors } = await openEvening(save);
      await until(page, '19.30');
      await page.keyboard.press('z');
      await delay(4500);
      await noCard(page);
      const name = p === 'kallaren' ? 'bistro-kallaren-z.png' : 'bistro-flygeln-z.png';
      await page.screenshot({ path: resolve(DIR, name) });
      result.BC[p] = { image: name, clock: await clock(page), level: await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null), errors };
      await ctx.close();
    }
  }
  if (DELAR.includes('D')) {
    // D_LOKAL (förvalt glashornet) och D_BISTRO=1 (förvalt): bistron i Flygeln, 66 platser, töms tidigt på kvällen.
    const D_LOKAL = process.env.D_LOKAL ?? 'glashornet', D_BISTRO = (process.env.D_BISTRO ?? '1') === '1';
    const save = read('reports/order284/save-mandag-vinbaren.json');
    save.sim.economy = { ...save.sim.economy, premises: D_LOKAL };
    if (D_BISTRO) save.sim.ladder = { ...(save.sim.ladder ?? {}), step: 'bistro', reachedOnDay: { ...(save.sim.ladder?.reachedOnDay ?? {}), bistro: save.sim.day.dayNumber - 3 }, offer: null, refit: null };
    const { ctx, page, errors } = await openEvening(save);
    await until(page, '19.00');
    await page.keyboard.press('z');
    const series = [];
    let lowest = null, shot = false;
    const stop = Date.now() + 600000;
    while (Date.now() < stop && !(await has(page, '[data-testid=waste-continue]')) && !(await has(page, '[data-testid=screen-R1]'))) {
      await answerCards(page);
      const m = await meter(page), c = await clock(page);
      if (m && c) {
        series.push({ clock: c, ...m });
        if (lowest === null || m.emptyRoom < lowest.emptyRoom) lowest = { clock: c, ...m };
        // Bilden när det tomma rummets del nått golvet: gästerna tittar ut över de tomma borden.
        if (!shot && m.emptyRoom <= -0.19) {
          await delay(800);
          await page.screenshot({ path: resolve(DIR, 'tomt-z.png') });
          // Närmare: gästerna vid borden.
          await page.mouse.move(640, 400);
          for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await delay(250); }
          await delay(2500);
          await page.screenshot({ path: resolve(DIR, 'tomt-nara.png') });
          shot = true;
        }
      }
      await delay(5000);
    }
    // Kvällen till resultatet: sopbilen, överföringen (transfer-do, sedan transfer-continue), resultatet.
    const seq = [];
    const stop2 = Date.now() + 300000;
    while (Date.now() < stop2) {
      const s = (await has(page, '[data-testid=screen-R1]')) ? 'R1' : (await has(page, '[data-testid=waste-continue]')) ? 'S1' : (await has(page, '[data-testid=screen-T2]')) ? 'transfer' : null;
      if (s && s !== seq.at(-1)) seq.push(s);
      if (s === 'R1') break;
      if (s === 'S1') { await delay(1200); await page.click('[data-testid=waste-continue]').catch(() => {}); }
      else if (s === 'transfer') { await delay(1200); if (await has(page, '[data-testid=transfer-do]')) { await page.click('[data-testid=transfer-do]').catch(() => {}); await page.waitForSelector('[data-testid=transfer-continue]', { timeout: 15000 }).catch(() => {}); } await page.click('[data-testid=transfer-continue]').catch(() => {}); }
      else await answerCards(page);
      await delay(500);
    }
    await delay(1200);
    await page.locator('[data-testid=result-empty-room]').scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await delay(500);
    await page.screenshot({ path: resolve(DIR, 'tomt-resultat.png') });
    const firstNeg = series.findIndex((x) => x.emptyRoom < 0);
    const atFloor = series.find((x) => x.emptyRoom <= -0.19) ?? null;
    const beforeEmpty = firstNeg > 0 ? series[firstNeg - 1] : null;
    const fills = series.filter((x) => x.emptyRoom === 0).map((x) => x.fill);
    const emptyFills = series.filter((x) => x.emptyRoom <= -0.19).map((x) => x.fill);
    result.D = {
      premises: D_LOKAL, bistro: D_BISTRO, series, lowest, shot, sequence: seq, beforeEmpty, atFloor,
      meterDrop: beforeEmpty && atFloor ? +(beforeEmpty.fill - atFloor.fill).toFixed(2) : null,
      meanFillNotEmpty: fills.length ? +(fills.reduce((a, b) => a + b, 0) / fills.length).toFixed(2) : null,
      meanFillAtFloor: emptyFills.length ? +(emptyFills.reduce((a, b) => a + b, 0) / emptyFills.length).toFixed(2) : null,
      bistroBill: (await has(page, '[data-testid=result-bistro-bill]')) ? { text: await page.textContent('[data-testid=result-bistro-bill]'), pct: await page.getAttribute('[data-testid=result-bistro-bill]', 'data-pct') } : null,
      emptyRoom: (await has(page, '[data-testid=result-empty-room]')) ? { text: await page.textContent('[data-testid=result-empty-room]'), occupancy: await page.getAttribute('[data-testid=result-empty-room]', 'data-occupancy') } : null,
      errors
    };
    await ctx.close();
  }
} finally {
  writeFileSync(OUT, JSON.stringify({ definition: 'ORDER 340 i produktionsbygget. A: lokalvalet (rent = veckohyran, fitOut = inredningen i kr, data-fitout; walkIns = raden om folket på torget), bild lokalvalet.png. BC: bistron i källaren och Flygeln vid Z kl. 19.30, bilderna bistro-*-z.png. P: bistrons meny vid Torget (line, pct = buy-bistro-prices, rows = radernas text med priserna), bild bistro-meny.png. D: bistron i Flygeln (D_LOKAL, D_BISTRO), bistroBill = raden om bistrons nota i kvällens resultat, stämningsmätaren var femte sekund (fill = fyllningen 0–5, mood, emptyRoom = det tomma rummets del day.emptyRoomLift), lowest = när den delen var lägst, meanFillNotEmpty/meanFillAtFloor = mätarens medel när delen var 0 respektive vid golvet (≤ −0,19), beforeEmpty = sista provet innan delen började sjunka, atFloor = första provet vid golvet, meterDrop = fyllningen före minus vid golvet (steg av fem), sequence = kvällens skärmar, emptyRoom = raden i kvällens resultat; bilderna tomt-z.png, tomt-nara.png och tomt-resultat.png. errors = sidans fel.', ...result }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify({ A: result.A?.premises, BC: result.BC && Object.keys(result.BC), D: result.D && { meterDrop: result.D.meterDrop, beforeEmpty: result.D.beforeEmpty, atFloor: result.D.atFloor, lowest: result.D.lowest, meanFillNotEmpty: result.D.meanFillNotEmpty, meanFillAtFloor: result.D.meanFillAtFloor, emptyRoom: result.D.emptyRoom, shot: result.D.shot, sequence: result.D.sequence } }));
