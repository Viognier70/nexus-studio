// ORDER 320 — kontrollen i spelarens flöde (produktionsbygget, sparfilen måndag vecka 2 som foodtruck, som
// scripts/order319c-check.mjs): kvällar i 4× där situationerna kommer som i spelet, en solig torsdag (Grillvagnen
// står då på torget) och en regnkväll (regnet börjar en bit in i kvällen). För var och en av de sex nya
// situationerna som kommer (window.__nxTruckSituations, sim/truckSituations.ts situationTonight):
//   - en kontrollbild under förvarningen (det som syns innan kortet kommer) och en av kortet;
//   - kortet: steg 2 visar gästens replik (incident-guest-line) och ledtråden från steg 1 (incident-clues);
//   - spelaren svarar rätt i varje steg (det rätta svaret ur leveransens metadata på disk, alternativen är
//     blandade) och går vidare; en kontrollbild av utfallet i scenen.
// Utdata: reports/order320/check-<lang>.json och check-<lang>-*.png.
//
//   npm run build && SKIP_BUILD=1 node scripts/order320-check.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order320');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4189);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'sv';
const META = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/foodtruck/situationer320.meta.json'), 'utf8'));
const NEW = Object.fromEntries(META.incidents.map((i) => [i.id, i]));
const SITU = { 'ft08-regnet': 'rain', 'ft09-getingen': 'wasp', 'ft10-kortet': 'card', 'ft11-slut': 'stock', 'ft12-hunden': 'dog', 'ft13-priset': 'rival' };

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
function saveFor(weather, dayShift, seed) {
  const s = JSON.parse(JSON.stringify(base));
  if (seed !== undefined) s.sim.seed = seed;
  s.sim.economy = { ...s.sim.economy, businessClass: 'foodtruck', loan: null };
  s.sim.businessClass = 'foodtrucken';
  s.sim.ladder = { step: 'foodtruck', reachedOnDay: { foodtruck: 1 }, offer: null };
  s.sim.speed = 4;
  s.sim.day.dayNumber += dayShift;
  s.sim.day.truck = {
    weather, rainFromE: weather === 'rain' ? 0.25 : null, litter: { A: 0, B: 0, C: 0 }, errand: null, torchesLit: false, sausagesLeft: 60,
    tonight: { eaters: 0, takeaway: 0, littered: 0, clearedByAssistant: 0, clearedByPlayer: 0, torchStartE: null, torchWaited: false, hatchEmptySimSeconds: 0 }
  };
  return JSON.stringify(s);
}

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', lang: LANG, errors: [], evenings: [], ok: false };

async function evening(name, weather, dayShift, seed, seenAll) {
  const width = 1440, height = 900;
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([key, value, lang]) => {
    if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('seeded', '1'); }
  }, ['nexus.v1.slot1', saveFor(weather, dayShift, seed), LANG]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(`${name}: ${e.message}`));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar], [data-testid=evening-bar]', { timeout: 60000 });
  await delay(1500);
  if (await page.$('[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.mouse.click(Math.round(width / 2), Math.round(height / 2)).catch(() => {});
  await page.keyboard.press('z');
  await delay(2000);
  const ev = { name, weather, situations: [] };
  const shot = async (f) => { const file = `check-${LANG}-${name}-${f}.png`; await page.screenshot({ path: resolve(OUT, file) }); return file; };
  const seen = seenAll;
  const until = Date.now() + 9 * 60 * 1000;
  while (Date.now() < until) {
    const st = await page.evaluate(() => ({ sit: window.__nxTruckSituations ?? null, period: document.body.dataset.period ?? null, ended: !!document.querySelector('[data-testid=evening-bar]') }));
    if (st.ended) break;
    const live = st.sit ? Object.entries(SITU).find(([id, k]) => !seen.has(id) && (st.sit[k]?.phase === 'cue' || st.sit[k]?.phase === 'active')) : null;
    if (!live) {
      // Ett kort från en annan situation: svara rätt så att kvällen går vidare.
      await answerAny(page);
      await delay(700);
      continue;
    }
    const [id, k] = live;
    seen.add(id);
    const s = { id, shots: [] };
    if (st.sit[k].phase === 'cue') s.shots.push(await shot(`${id}-1-forvarning`));
    // Kortet och stegen: rätt svar i varje steg, gå vidare i kvitt eller dubbelt.
    for (let step = 0; step < 3; step++) {
      // Steget i simuleringen, och svaren går att välja (inte låsta, ORDER 310b).
      const ready = await page.waitForFunction(([kk, st]) => {
        const x = window.__nxTruckSituations?.[kk];
        if (x?.phase === 'done') return 'done';
        if (document.querySelector('[data-testid=incident-kvitt-card]')) return 'kvitt';
        return x?.phase === 'active' && x.step === st && !!document.querySelector('[data-testid^=incident-option-]:not([disabled])') ? 'ask' : false;
      }, [k, step], { timeout: 90000 }).then((h) => h.jsonValue()).catch(() => null);
      if (ready === 'kvitt') { await page.keyboard.press('2'); step--; await delay(800); continue; }
      if (ready !== 'ask') break;
      await delay(400);
      if (step === 0) s.shots.push(await shot(`${id}-2-kortet`));
      if (step === 1) {
        s.guestLine = await page.$eval('[data-testid=incident-guest-line]', (el) => el.textContent).catch(() => null);
        s.clue = await page.$eval('[data-testid=incident-clues]', (el) => el.textContent).catch(() => null);
        s.shots.push(await shot(`${id}-3-steg2`));
      }
      const best = NEW[id].steps[step].options.find((o) => o.quality === 'best');
      s.order = s.order ?? [];
      s.order.push(await page.$$eval('[data-testid^=incident-option-]', (els) => els.map((e) => e.getAttribute('data-option-id'))));
      await page.click(`[data-testid=incident-option-${best.id}]`).catch(() => {});
      await delay(1000);
    }
    await page.waitForFunction(([kk]) => window.__nxTruckSituations?.[kk]?.phase === 'done', [k], { timeout: 60000 }).catch(() => {});
    const done = await page.evaluate(([kk]) => window.__nxTruckSituations?.[kk] ?? null, [k]);
    s.outcome = done;
    await delay(4000);
    s.shots.push(await shot(`${id}-4-utfallet`));
    s.pins = await page.$$eval('[data-testid^=truck-pin-]', (els) => els.map((e) => e.getAttribute('data-testid')));
    ev.situations.push(s);
  }
  ev.sausagesLeft = await page.evaluate(() => window.__nxTruckSituations?.sausagesLeft ?? null);
  report.evenings.push(ev);
  await ctx.close();
}

/** Svarar rätt på ett kort från bas (de sju äldre situationerna) så att kvällen går vidare: första alternativet. */
async function answerAny(page) {
  if (await page.$('[data-testid=incident-kvitt-card]')) { await page.keyboard.press('1'); return; }
  const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
  if (opt) await opt.click().catch(() => {});
}

try {
  // Kvällar tills alla sex har kommit, högst tolv: väder, veckodag (Grillvagnen på torget torsdag och fredag) och frö.
  const plan = [['sol-torsdag', 'sun', 3, 11], ['regn', 'rain', 1, 12], ['sol-fredag', 'sun', 4, 13], ['blast', 'wind', 2, 14], ['regn-2', 'rain', 3, 15], ['sol-2', 'sun', 0, 16], ['sval', 'cool', 4, 17], ['sol-3', 'sun', 3, 18], ['regn-3', 'rain', 4, 19], ['sol-4', 'sun', 1, 20], ['sol-5', 'sun', 4, 21], ['regn-4', 'rain', 0, 22]];
  const seenAll = new Set();
  for (const [n, w, d, seed] of plan) {
    if (Object.keys(SITU).every((id) => seenAll.has(id))) break;
    await evening(n, w, d, seed, seenAll);
  }
  const all = report.evenings.flatMap((e) => e.situations);
  report.seen = all.map((s) => s.id);
  report.ok = report.errors.length === 0 && Object.keys(SITU).every((id) => report.seen.includes(id))
    && all.every((s) => s.outcome?.phase === 'done' && s.outcome.quality === 'best' && !!s.guestLine && !!s.clue);
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, error: report.error ?? null, errors: report.errors.slice(0, 3), seen: report.seen, evenings: report.evenings.map((e) => ({ n: e.name, s: e.situations.map((s) => [s.id, s.outcome?.quality, !!s.guestLine, !!s.clue, s.pins]) })) }));
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
