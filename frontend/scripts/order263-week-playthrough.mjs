#!/usr/bin/env node
// ORDER 263 (Nexus v1 etapp 1) — en hel vecka i spelarens vy.
//
// Ordern §1.1: verifiering från en normal spelstart, utan dev-flaggor.
// Skriptet öppnar spelet på `/` (ingen hash, inga URL-flaggor), skriver
// in ett namn, och spelar från måndag morgon vecka 1 till måndag morgon
// vecka 2 enbart med knappar spelaren har:
//   - fartknappen 4× (SpeedToggle, samma som spelaren når),
//   - "Öppna för kvällen" på servicedagar, "Avsluta söndagen" på söndagen.
// Skärmdumpar tas varje morgon, mitt i varje service och varje kväll.
//
// Därefter prövas sparandet i spelarens vy: sidan laddas om (ny session),
// spelaren väljer "Fortsätt ett sparat spel" → plats 1 → Ladda, och
// dagsmärket ska visa samma dag som innan omladdningen. Veckokopian för
// vecka 2 ska finnas i sparmenyn.
//
// Avläsning: all text läses ur det renderade gränssnittet (DayBadge,
// DayActionBar, sparmenyn). Därtill läses simuleringens tillstånd via
// DEV-kroken `window.__nxSimState` ENBART som mätning (dagnummer, kassa)
// — ingen åtgärd skickas via kroken. Localstorage läses för att jämföra
// den sparade filen med det laddade tillståndet.
//
// Utdata: reports/order263/week-playthrough.json + skärmdumpar i
// reports/order263/.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports/order263');
mkdirSync(OUT, { recursive: true });
// PREVIEW=1 kör produktionsbygget på en egen port (4173), så att en
// redan körande dev-server på 5173 aldrig råkar besvara körningen.
const PREVIEW = process.env.PREVIEW === '1';
const PORT = PREVIEW ? 4173 : 5173;
const URL = `http://localhost:${PORT}`;

async function ensureVite(url) {
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return null; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return proc; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function badge(page) {
  return page.evaluate(() => ({
    weekday: document.querySelector('[data-testid=day-badge-weekday]')?.textContent ?? null,
    week: document.querySelector('[data-testid=day-badge-week]')?.textContent ?? null,
    phase: document.querySelector('[data-testid=day-badge-phase]')?.textContent ?? null,
    full: document.querySelector('[data-testid=day-badge]')?.textContent ?? null
  }));
}

async function waitBadge(page, pred, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const b = await badge(page);
    if (pred(b)) return b;
    await delay(500);
  }
  throw new Error(`timeout waiting for badge; last=${JSON.stringify(await badge(page))}`);
}

async function simReading(page) {
  return page.evaluate(() => {
    const s = window.__nxSimState;
    return s ? { dayNumber: s.day.dayNumber, period: s.day.period, cash: Math.round(s.cash), simTime: Math.round(s.simTime) } : null;
  });
}

// PREVIEW=1: bygg och kör produktionsbygget (vite preview), samma som
// spelaren får. Då finns inga DEV-paneler och ingen DEV-krok; simReading
// ger null och all avläsning sker ur gränssnittet och sparfilen.
async function ensurePreview() {
  try { await fetch(URL + '/'); throw new Error(`port ${PORT} är redan upptagen`); } catch (e) { if (String(e.message).includes('upptagen')) throw e; }
  await new Promise((res, rej) => {
    const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'inherit' });
    b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))));
  });
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try { const r = await fetch(URL + '/'); if (r.ok) return proc; } catch {}
    await delay(500);
  }
  throw new Error('preview timeout');
}
const vite = PREVIEW ? await ensurePreview() : await ensureVite(URL);
const { chromium } = await import('playwright');
// Playwrights egen Chromium om den finns, annars installerad Chrome.
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const report = { url: `${URL}/`, build: PREVIEW ? 'produktion (vite build + preview)' : 'dev-server', flags: 'inga', days: [], saveLoad: null, errors };
try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type=text]', { timeout: 120000 });
  await page.fill('input[type=text]', 'Vinbaren vid torget');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(4000); // kameraflygningen landar
  await page.click('button[title="Simulering 4× hastighet"]');

  for (let i = 0; i < 7; i++) {
    const morning = await badge(page);
    const day = { morning, shots: [] };
    const tag = `d${i + 1}-${(morning.weekday ?? 'x').toLowerCase()}`;
    await page.screenshot({ path: resolve(OUT, `${tag}-1-morgon.png`) });
    day.shots.push(`${tag}-1-morgon.png`);
    day.simAtMorning = await simReading(page);
    const isSunday = await page.$('[data-testid=close-day]');
    if (isSunday) {
      await page.click('[data-testid=close-day]');
      day.action = 'Avsluta söndagen';
    } else {
      await page.click('[data-testid=start-service]');
      day.action = 'Öppna för kvällen';
      await waitBadge(page, (b) => b.phase === 'Service', 20000);
      await delay(60000); // mitt i servicen (4× → ~4 sim-min in)
      await page.screenshot({ path: resolve(OUT, `${tag}-2-service.png`) });
      day.shots.push(`${tag}-2-service.png`);
      day.service = await badge(page);
    }
    const evening = await waitBadge(page, (b) => b.phase === 'Kväll', 400000);
    await page.screenshot({ path: resolve(OUT, `${tag}-3-kvall.png`) });
    day.shots.push(`${tag}-3-kvall.png`);
    day.evening = evening;
    const next = await waitBadge(page, (b) => b.weekday !== morning.weekday && (b.phase === 'Morgon' || b.phase === 'Stängt'), 120000);
    day.nextMorning = next;
    report.days.push(day);
    console.log(`${morning.weekday} ${morning.week}: ${day.action} → ${next.weekday} ${next.week}`);
    await delay(1500);
  }
  const monday2 = await badge(page);
  await page.screenshot({ path: resolve(OUT, 'd8-mandag-vecka2.png') });
  report.endOfWeek = { badge: monday2, sim: await simReading(page) };

  // Sparmenyn: veckokopian för vecka 2 ska finnas.
  await page.click('[data-testid=menu-button]');
  await page.click('[data-testid=menu-save]');
  await page.waitForSelector('[data-testid=save-menu]');
  await page.screenshot({ path: resolve(OUT, 'sparmeny-vecka2.png') });
  const menuText = await page.textContent('[data-testid=save-menu]');
  report.saveMenu = {
    text: menuText,
    hasWeek1Copy: !!(await page.$('[data-testid=load-week-1-1]')),
    hasWeek2Copy: !!(await page.$('[data-testid=load-week-1-2]'))
  };
  await page.click('[data-testid=save-menu] button');

  // Spara → ladda om sidan → fortsätt sparat spel.
  const before = { badge: await badge(page), sim: await simReading(page) };
  const savedRaw = await page.evaluate(() => window.localStorage.getItem('nexus.v1.slot1'));
  const saved = savedRaw ? JSON.parse(savedRaw) : null;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=continue-saved]', { timeout: 120000 });
  await page.screenshot({ path: resolve(OUT, 'omstart-fortsatt.png') });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]');
  await page.click('[data-testid=load-slot-1]');
  await page.waitForSelector('[data-testid=day-badge]');
  await delay(3000);
  const after = { badge: await badge(page), sim: await simReading(page) };
  await page.screenshot({ path: resolve(OUT, 'efter-laddning.png') });
  report.saveLoad = {
    before,
    savedFile: saved ? { dayNumber: saved.sim.day.dayNumber, cash: Math.round(saved.sim.cash), businessName: saved.businessName, kind: saved.kind } : null,
    after,
    sameDay: before.badge.weekday === after.badge.weekday && before.badge.week === after.badge.week,
    sameDayNumberAsFile: saved && after.sim ? saved.sim.day.dayNumber === after.sim.dayNumber : null,
    // Efter laddning: sparfilen i plats 1 är orörd (ingen dag har passerat).
    fileAfterLoad: await page.evaluate(() => {
      const raw = window.localStorage.getItem('nexus.v1.slot1');
      if (!raw) return null;
      const f = JSON.parse(raw);
      return { dayNumber: f.sim.day.dayNumber, cash: Math.round(f.sim.cash), businessName: f.businessName };
    })
  };

  // Mobil med touch: samma sparade spel laddas via tryck, och morgonens
  // knapp och dagsmärket ska synas inom en telefonskärm.
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: await ctx.storageState() });
  const m = await mctx.newPage();
  await m.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await m.waitForSelector('[data-testid=continue-saved]', { timeout: 120000 });
  await m.tap('[data-testid=continue-saved]');
  await m.waitForSelector('[data-testid=load-slot-1]');
  await m.screenshot({ path: resolve(OUT, 'mobil-sparmeny.png') });
  await m.tap('[data-testid=load-slot-1]');
  await m.waitForSelector('[data-testid=day-badge]');
  await delay(4000);
  await m.screenshot({ path: resolve(OUT, 'mobil-morgon.png') });
  report.mobile = await m.evaluate(() => {
    const r = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom) };
    };
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      badge: r('[data-testid=day-badge]'),
      actionBar: r('[data-testid=day-action-bar]'),
      startButton: r('[data-testid=start-service]') ?? r('[data-testid=close-day]'),
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  await mctx.close();
} finally {
  writeFileSync(resolve(OUT, 'week-playthrough.json'), JSON.stringify(report, null, 2));
  await browser.close();
  if (vite) vite.kill('SIGTERM');
}
console.log(`Rapport: ${resolve(OUT, 'week-playthrough.json')}`);
