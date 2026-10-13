// ORDER 332 — kontrollen i produktionsbygget och spelarens flöde (sparfilen måndag vecka 2,
// reports/order284/save-mandag-vinbaren.json, gjord till foodtrucken som scripts/order325-check.mjs):
//   G. morgonrutan med platsvalet (data-testid truck-spot), valet av plats med knappen, och vagnen vid Z på platsen
//      efter att servicen öppnats (Öppna vid vagnen, som spelaren);
//   C. regn vid vagnen med och utan markisen (sparfilens equipment), vid Z på Torget;
//   D. kvarterens namn på nivån Byn (V): vilka namn som syns (.nx-district-label, opacitet över 0,5).
// Utdata: reports/order332/kontroll/check.json och bilder <fall>-<w>x<h>.png.
//
//   [SKIP_BUILD=1] [LANG_GAME=sv] [SPOTS=torget,sjon] node scripts/order332-check.mjs
// Under belastning (harnessen samtidigt) är klicken långsamma: 90 s per steg, varje plats för sig.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order332', 'kontroll');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4192);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'sv';

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));

const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const truckSave = ({ weather = 'sun', awning = false } = {}) => {
  const s = JSON.parse(JSON.stringify(base));
  const sim = s.sim;
  sim.economy = { ...sim.economy, businessClass: 'foodtruck', loan: null, truckSpot: 'torget' };
  sim.businessClass = 'foodtrucken';
  sim.ladder = { step: 'foodtruck', reachedOnDay: { foodtruck: 1 }, offer: null };
  if (awning) { sim.equipment = ['queueAwning']; sim.equipmentOpened = ['queueAwning']; }
  sim.day.truck = {
    weather, rainFromE: weather === 'rain' ? 0 : null, litter: { A: 0, B: 0, C: 0 }, errand: null, torchesLit: false, sausagesLeft: 60,
    tonight: { eaters: 0, takeaway: 0, littered: 0, clearedByAssistant: 0, clearedByPlayer: 0, torchStartE: null, torchWaited: false, hatchEmptySimSeconds: 0 }
  };
  return JSON.stringify(s);
};
const report = { build: 'produktion (vite build + preview)', lang: LANG, day: base.sim.day.dayNumber, errors: [], cases: {} };

async function open(save, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([key, value, lang]) => {
    if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('seeded', '1'); }
  }, ['nexus.v1.slot1', save, LANG]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', (e) => report.errors.push(`${w}x${h}: ${e.message}`));
  ctx.on('response', (r) => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`console ${w}x${h}: ${m.text().slice(0, 300)}`); });
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]', { timeout: 120000 });
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 }).catch(() => {});
  await delay(1500);
  if (await page.$('[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
  return { ctx, page };
}

async function landed(page) {
  await page.waitForFunction(() => document.body.dataset.camDistance && document.body.dataset.camDistance === document.body.dataset.camTarget, null, { timeout: 20000 }).catch(() => {});
  await delay(800);
}

async function answerCards(page) {
  const until = Date.now() + 20000;
  while (Date.now() < until) {
    if (!(await page.$('[data-testid^=incident-option-]'))) break;
    const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
    if (opt) await opt.click().catch(() => {});
    else if (await page.$('[data-testid=incident-kvitt-card]')) await page.keyboard.press('2');
    await delay(700);
  }
  const next = await page.$('[data-testid=incident-card] [data-testid=incident-next], [data-testid=incident-continue]');
  if (next) await next.click().catch(() => {});
}

async function morningPanel(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid=truck-spot]');
    if (!el) return { present: false };
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return {
      present: true, spot: el.getAttribute('data-spot'),
      buttons: [...el.querySelectorAll('[data-testid^=truck-spot-]')].filter((b) => b.getAttribute('role') === 'radio').map((b) => ({ id: b.getAttribute('data-testid'), text: b.textContent, disabled: b.disabled, checked: b.getAttribute('aria-checked') })),
      who: document.querySelector('[data-testid=truck-spot-who]')?.textContent ?? null,
      chosen: document.querySelector('[data-testid=truck-spot-chosen]')?.textContent ?? null,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, inViewport: r.left >= 0 && r.right <= innerWidth
    };
  });
}

async function serviceAtZ(page, w, h) {
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
  const until = Date.now() + 30000;
  while (Date.now() < until) { await answerCards(page); await delay(2000); }
  await page.mouse.click(Math.round(w / 2), Math.round(h * 0.55)).catch(() => {});
  await page.keyboard.press('z');
  await landed(page);
  await answerCards(page);
}

try {
  const [w, h] = [1280, 720];
  // G — morgonrutan och vagnen vid Z på varje plats.
  const CASES = (process.env.CASES ?? 'spots,small,rain,byn').split(',');
  if (CASES.includes('spots')) for (const spot of (process.env.SPOTS ?? 'torget,prastgatan,gastgivaregarden,campus,sjon').split(',')) {
    const { ctx, page } = await open(truckSave(), w, h);
    const row = {};
    try {
    if (spot !== 'torget') { await page.click(`[data-testid=truck-spot-${spot}]`).catch((e) => report.errors.push(`klick ${spot}: ${e.message}`)); await delay(500); }
    row.morning = await morningPanel(page);
    await page.screenshot({ path: resolve(OUT, `morgon-${spot}-${w}x${h}.png`) });
    await serviceAtZ(page, w, h);
    row.atZ = await page.evaluate(() => ({ camDistance: Number(document.body.dataset.camDistance), camTarget: Number(document.body.dataset.camTarget) }));
    await page.screenshot({ path: resolve(OUT, `vagnen-${spot}-Z-${w}x${h}.png`) });
    } catch (e) { report.errors.push(`spot ${spot}: ${e.message.split('\n')[0]}`); }
    report.cases[`spot-${spot}`] = row;
    await ctx.close();
  }
  // Morgonrutan i den minsta storleken.
  if (CASES.includes('small')) {
    const { ctx, page } = await open(truckSave(), 1024, 600);
    report.cases['morgon-1024x600'] = await morningPanel(page);
    await page.screenshot({ path: resolve(OUT, 'morgon-torget-1024x600.png') });
    await ctx.close();
  }
  // C — regn med och utan markisen.
  if (CASES.includes('rain')) for (const awning of [false, true]) {
    const { ctx, page } = await open(truckSave({ weather: 'rain', awning }), w, h);
    await serviceAtZ(page, w, h);
    // Kön bildas efter halv åtta: vänta (4×) tills klockan passerat 20.00, kort som kommer besvaras.
    const until = Date.now() + 120000;
    while (Date.now() < until) { await answerCards(page); await delay(3000); }
    await page.keyboard.press('z');
    await landed(page);
    await page.screenshot({ path: resolve(OUT, `regn-${awning ? 'med' : 'utan'}-markis-Z-${w}x${h}.png`) });
    report.cases[`regn-${awning ? 'med' : 'utan'}-markis`] = await page.evaluate(() => ({ camDistance: Number(document.body.dataset.camDistance) }));
    await ctx.close();
  }
  // D — kvarterens namn på nivån Byn, under servicen (på morgonen täcker morgonrutan byn).
  if (CASES.includes('byn')) {
    const { ctx, page } = await open(truckSave(), w, h);
    await serviceAtZ(page, w, h);
    // Klockan under en minut (fryser spelet?): HUD:ens text var tionde sekund.
    report.clock = [];
    for (let i = 0; i < 6; i++) { report.clock.push(await page.evaluate(() => document.body.innerText.match(/\d{2}\.\d{2}/)?.[0] ?? null)); await delay(10000); }
    // Ett kort kan ligga över knappen: tangenten V och knappen, tills nivån är Byn (högst sex försök).
    for (let i = 0; i < 6; i++) {
      // Under en situation är nivåknapparna borta (scenens kamera tar över): svara tills kortet är stängt, högst 90 s.
      const until = Date.now() + 90000;
      const cardOpen = () => page.evaluate(() => /Välj med 1–4|Choose with 1–4|Fortsätt|Continue/.test(document.body.innerText) || !!document.querySelector('[data-testid=incident-card], [data-testid^=incident-option-]'));
      while (Date.now() < until && (await cardOpen())) {
        await answerCards(page);
        // Situationens steg väljs med 1–4 (kortet säger "Välj med 1–4"); sedan Fortsätt.
        await page.keyboard.press('2'); await delay(1200);
        for (const b of await page.$$('button')) { const t = (await b.textContent().catch(() => '')) ?? ''; if (/^(Fortsätt|Continue|Vidare|Stäng)/.test(t.trim())) { await b.click().catch(() => {}); break; } }
        await delay(800);
      }
      await page.mouse.click(Math.round(w / 2), Math.round(h * 0.55)).catch(() => {});
      await page.keyboard.press('v');
      await delay(800);
      if ((await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null)) === 'village') break;
      await page.click('[data-testid=village-toggle]', { timeout: 5000 }).catch(() => {});
      await delay(800);
      if ((await page.getAttribute('[data-testid=level-bar]', 'data-level').catch(() => null)) === 'village') break;
    }
    await landed(page);
    await delay(1500);
    report.cases.byn = await page.evaluate(() => ({
      level: document.querySelector('[data-testid=level-bar]')?.getAttribute('data-level') ?? null,
      camDistance: Number(document.body.dataset.camDistance),
      districts: [...document.querySelectorAll('.nx-district-label')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-district'), text: e.textContent, opacity: Number(getComputedStyle(e).opacity), visible: getComputedStyle(e).visibility !== 'hidden' && Number(getComputedStyle(e).opacity) > 0.5, // Namnen tar inga klick, så elementFromPoint ger det som ligger under: duken (fritt) eller en panel (täckt).
        free: (() => { const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t.tagName === 'CANVAS' || e.contains(t)); })(), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; }),
      venues: [...document.querySelectorAll('.nx-venue-label')].filter((e) => e.style.visibility !== 'hidden').map((e) => { const r = e.getBoundingClientRect(); return { text: e.textContent.slice(0, 30), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; })
    }));
    await page.screenshot({ path: resolve(OUT, `byn-${w}x${h}.png`) });
    await ctx.close();
  }
} finally {
  // CASES: fallen som inte kördes står kvar ur förra körningen, med sin tid.
  let prev = {};
  try { prev = JSON.parse(readFileSync(resolve(OUT, 'check.json'), 'utf8')); } catch { /* första körningen */ }
  const stamp = new Date().toISOString();
  for (const k of Object.keys(report.cases)) report.cases[k] = { ...report.cases[k], at: stamp };
  writeFileSync(resolve(OUT, 'check.json'), JSON.stringify({ ...report, cases: { ...(prev.cases ?? {}), ...report.cases } }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify({ errors: report.errors, byn: report.cases.byn, spots: Object.fromEntries(Object.entries(report.cases).filter(([k]) => k.startsWith('spot-')).map(([k, v]) => [k, v.morning?.spot])) }, null, 1));
