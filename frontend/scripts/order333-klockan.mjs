// ORDER 333 G — klockan som stod på 19.21 under situationskortet (ORDER 332, Öppet 7). Produktionsbygget och
// spelarens flöde som i scripts/order332-check.mjs (fallet byn): sparfilen gjord till foodtrucken, Öppna vid vagnen,
// farten 4×. Varannan sekund i 120 s läses
//   clock      = [data-testid=service-clock-time], klockan i HUD:en (ServiceClock.tsx);
//   firstMatch = det första hh.mm i sidans text, det ORDER 332:s skript läste (document.body.innerText);
//   countdown  = [data-testid=incident-countdown] (IncidentPanel.tsx): talet och data-frozen;
//   card       = om situationskortet är öppet (.nx-rocket).
// Två körningar: svara = kortets första val klickas när det kommer (som ORDER 332:s skript), vanta = kortet får gå ut.
// Utdata: reports/order333/klockan.json, under nyckeln LABEL.
//
//   LABEL=fore [SKIP_BUILD=1] node scripts/order333-klockan.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT_DIR = resolve(FRONTEND, 'reports', 'order333');
mkdirSync(OUT_DIR, { recursive: true });
const OUT = resolve(OUT_DIR, 'klockan.json');
const PORT = Number(process.env.PORT ?? 4194);
const URL = `http://localhost:${PORT}`;
const LABEL = process.env.LABEL ?? 'efter';
const SECONDS = Number(process.env.SECONDS ?? 120);

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

const sample = (page) => page.evaluate(() => {
  const cd = document.querySelector('[data-testid=incident-countdown]');
  return {
    clock: document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null,
    firstMatch: document.body.innerText.match(/\d{2}\.\d{2}/)?.[0] ?? null,
    countdown: cd ? { n: cd.textContent, frozen: cd.getAttribute('data-frozen') } : null,
    card: !!document.querySelector('.nx-rocket')
  };
});

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)', runs: {} };
try {
  for (const mode of (process.env.MODES ?? 'svara,vanta,tangenter').split(',')) {
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
    await delay(1500);
    if (await page.$('[data-testid=morning-review-backdrop]')) await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {});
    await page.click('[data-testid=start-service]').catch(() => {});
    await delay(800);
    if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    const rows = [];
    let answered = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < SECONDS * 1000) {
      const s = await sample(page);
      if (mode === 'svara' && s.card) {
        const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
        if (opt) { await opt.click().catch(() => {}); answered++; s.answered = true; }
      }
      // ORDER 332:s skript (fallet byn): ett val, tangenten 2 och sedan första knappen Fortsätt/Continue/Vidare/Stäng.
      if (mode === 'tangenter' && s.card) {
        const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
        if (opt) { await opt.click().catch(() => {}); answered++; s.answered = true; }
        await page.keyboard.press('2');
        for (const b of await page.$$('button')) { const t = (await b.textContent().catch(() => '')) ?? ''; if (/^(Fortsätt|Continue|Vidare|Stäng)/.test(t.trim())) { s.clicked = t.trim().slice(0, 40); await b.click().catch(() => {}); break; } }
      }
      rows.push({ t: Math.round((Date.now() - t0) / 1000), ...s });
      await delay(2000);
    }
    // Hur länge klockan stod på samma tid medan kortet var öppet (längsta följden av lika värden).
    let longest = 0, run = 0;
    for (let i = 1; i < rows.length; i++) { run = rows[i].clock === rows[i - 1].clock ? run + (rows[i].t - rows[i - 1].t) : 0; longest = Math.max(longest, run); }
    let longestFirst = 0; run = 0;
    for (let i = 1; i < rows.length; i++) { run = rows[i].firstMatch === rows[i - 1].firstMatch ? run + (rows[i].t - rows[i - 1].t) : 0; longestFirst = Math.max(longestFirst, run); }
    result.runs[mode] = { answered, clockLongestStillSeconds: longest, firstMatchLongestStillSeconds: longestFirst, rows };
    await ctx.close();
  }
} finally {
  let prev = {};
  try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* första körningen */ }
  writeFileSync(OUT, JSON.stringify({
    definition: 'ORDER 333 G. Varannan sekund under servicen vid vagnen (4×): clock = HUD:ens klocka (service-clock-time), firstMatch = första hh.mm i sidans text (det ORDER 332:s skript läste), countdown = situationskortets nedräkning (incident-countdown, n och data-frozen), card = kortet öppet. svara = första valet klickas, vanta = kortet går ut av sig självt. clockLongestStillSeconds/firstMatchLongestStillSeconds = längsta tid värdet stod still (verkliga sekunder).',
    ...prev, [LABEL]: result
  }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
for (const [m, r] of Object.entries(result.runs)) {
  console.log(m, 'svar', r.answered, 'klockan still', r.clockLongestStillSeconds, 's, första hh.mm still', r.firstMatchLongestStillSeconds, 's');
  for (const row of r.rows) console.log(' ', row.t, row.clock, row.firstMatch, row.card ? `kort ${row.countdown?.n}${row.countdown?.frozen === 'true' ? ' (fryst)' : ''}` : '', row.answered ? 'SVAR' : '', row.clicked ?? '');
}
