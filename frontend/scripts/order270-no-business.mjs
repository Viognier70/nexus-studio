#!/usr/bin/env node
// ORDER 270 (provspel 2026-09-27) — utan verksamhet och utan pengar, i
// spelarens vy.
//
// Vision Owner: "Utan verksamhet och utan pengar: en tydlig ruta mitt på
// skärmen. Den enda vägen vidare är till Måltidens hus för att öva och göra
// prov, så att banken kan ge lån. Inga andra knappar." Och: "Proven på tid:
// 30 sekunder per fråga."
//
// Start: sparfilen reports/order270/save-utan-verksamhet.json på sparplats
// 1 (skriven av order270Incidents.test.ts med WRITE_REPORTS=1). Den svaga
// spelaren har spelat från vinbaren till food trucken och vidare till
// ingen verksamhet, i harnessen. Avvikelse från spelarens flöde: vägen dit
// är spelad i harnessen, inte i webbläsaren (tre veckor i spelet).
// Därefter bara spelarens knappar: Fortsätt ett sparat spel → sparplats 1
// → rutan → Till Måltidens hus → ett prov (en fråga får tiden gå ut) →
// rutan igen → ett övningsbesök → dagen slutar av sig själv.
// Utdata: reports/order270/no-business.json + skärmdumpar n01–n..

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order270');
const PORT = 4174;
const URL = `http://localhost:${PORT}`;
const SLOT_KEY = 'nexus.v1.slot1';
const SAVE = readFileSync(resolve(OUT, 'save-utan-verksamhet.json'), 'utf8').trim();

async function startPreview() {
  try { await fetch(URL + '/'); throw new Error(`port ${PORT} är redan upptagen`); } catch (e) { if (String(e.message).includes('upptagen')) throw e; }
  if (process.env.SKIP_BUILD !== '1') await new Promise((res, rej) => {
    const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' });
    b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))));
  });
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore' });
  for (let i = 0; i < 240; i++) {
    try { const r = await fetch(URL + '/'); if (r.ok) return proc; } catch {}
    await delay(500);
  }
  throw new Error('preview timeout');
}

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('order270-seeded')) {
    localStorage.setItem(key, value);
    sessionStorage.setItem('order270-seeded', '1');
  }
}, [SLOT_KEY, SAVE]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 600)}`));
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', start: 'reports/order270/save-utan-verksamhet.json på sparplats 1', steps: [], errors };
const t0 = Date.now();
const step = (name, extra = {}) => { const e = { name, atSeconds: Math.round((Date.now() - t0) / 1000), ...extra }; report.steps.push(e); console.log(`${e.atSeconds}s ${name}`); };
const shot = (file) => page.screenshot({ path: resolve(OUT, file) });
// Knappar som går att klicka utanför rutan (rutan ska vara den enda vägen).
const clickableOutsideBox = () => page.evaluate(() => {
  const box = document.querySelector('[data-testid=no-business-box]');
  return [...document.querySelectorAll('button')]
    .filter((b) => !box?.contains(b) && b.offsetParent !== null)
    .filter((b) => {
      const r = b.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return top === b || b.contains(top);
    })
    .map((b) => (b.getAttribute('title') || b.textContent || '').trim().slice(0, 40));
});

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=save-menu]');
  await page.click('[data-testid=load-slot-1]');
  await page.waitForSelector('[data-testid=no-business-box]', { timeout: 120000 });
  await delay(2000);
  await shot('n01-rutan.png');
  report.box = await page.textContent('[data-testid=no-business-box]');
  report.boxButtons = await page.$$eval('[data-testid=no-business-box] button', (bs) => bs.map((b) => b.textContent));
  report.dayActionBar = (await page.$('[data-testid=day-action-bar]')) !== null;
  report.clickableOutsideBox = await clickableOutsideBox();
  step('rutan mitt på skärmen');

  await page.click('[data-testid=stranded-open-house]');
  await page.waitForSelector('[data-testid^=exam-]', { timeout: 10000 });
  await shot('n02-maltidens-hus.png');
  const examButton = await page.$('[data-testid^=exam-]:not([disabled])');
  await examButton.click();
  await page.waitForSelector('[data-testid=question-countdown]');
  report.examCountdownAtStart = await page.textContent('[data-testid=question-countdown]');
  await shot('n03-provet-pa-tid.png');
  // Låt tiden gå ut på första frågan.
  const t = Date.now();
  await page.waitForSelector('[data-testid=explanation]', { timeout: 40000 });
  report.secondsUntilTimedOut = Math.round((Date.now() - t) / 100) / 10;
  report.timedOutText = await page.textContent('[data-testid=explanation]');
  await shot('n04-tiden-gick-ut.png');
  step('provet: tiden gick ut');
  // Resten av provet: svara A på allt.
  for (;;) {
    await page.click('[data-testid=next-question]');
    if (await page.$('[data-testid=visit-result]')) break;
    await page.waitForSelector('[data-testid=option-0]');
    await page.click('[data-testid=option-0]');
    await page.waitForSelector('[data-testid=explanation]');
  }
  report.examResult = await page.textContent('[data-testid=visit-result]');
  await page.click('[data-testid=close-visit]');
  if (await page.$('[data-testid=close-house]')) await page.click('[data-testid=close-house]');
  await page.waitForSelector('[data-testid=no-business-box]', { timeout: 10000 });
  report.progressAfterExam = await page.textContent('[data-testid=no-business-progress]').catch(() => null);
  await shot('n05-rutan-efter-provet.png');
  step('rutan igen efter provet');

  // Öva: utan tid.
  await page.click('[data-testid=stranded-open-house]');
  await page.click('[data-testid^=practice-]:not([disabled])');
  await page.waitForSelector('[data-testid=option-0]');
  report.practiceHasCountdown = (await page.$('[data-testid=question-countdown]')) !== null;
  for (;;) {
    await page.click('[data-testid=option-0]');
    await page.waitForSelector('[data-testid=explanation]');
    await page.click('[data-testid=next-question]');
    if (await page.$('[data-testid=visit-result]')) break;
    await page.waitForSelector('[data-testid=option-0]');
  }
  await page.click('[data-testid=close-visit]');
  if (await page.$('[data-testid=close-house]')) await page.click('[data-testid=close-house]');
  await delay(1500);
  report.afterSlotsUsed = {
    box: (await page.$('[data-testid=no-business-box]')) !== null,
    eveningBar: (await page.$('[data-testid=evening-bar]')) !== null,
    dayBadge: await page.textContent('[data-testid=day-badge]').catch(() => null)
  };
  await shot('n06-dagen-slut.png');
  step('schemat fullt: dagen slutade av sig själv');
} finally {
  writeFileSync(resolve(OUT, 'no-business.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ boxButtons: report.boxButtons, clickableOutsideBox: report.clickableOutsideBox, dayActionBar: report.dayActionBar, secondsUntilTimedOut: report.secondsUntilTimedOut, practiceHasCountdown: report.practiceHasCountdown, afterSlotsUsed: report.afterSlotsUsed, errors }, null, 2));
