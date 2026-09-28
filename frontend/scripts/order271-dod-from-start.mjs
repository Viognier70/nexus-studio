#!/usr/bin/env node
// ORDER 271 — DoD i spelarens vy: Designs paket 1 och 6 från normal start.
//
// Vision Owner 2026-09-27: "skärmdumpar från normal start som visar
// vinbaren, en kväll där figurerna rör sig som i en riktig restaurang, en
// raket genom alla tre stegen, och varje skärm i paket 1 och 6."
//
// Produktionsbygget (vite build + preview på port 4174), start på `/` utan
// flaggor, bara spelarens knappar och tangenter:
//   bussen → samtalet → registreringen → mentorn (M1) → schemat (S1) →
//   Måltidens hus (MD1) → öva med ett fel svar (O1, O2) → prov i
//   Kalastorget (MD2, O2, MD1) → banken (B0a, bara food trucken) → prov i
//   Stensöta → banken (B0b) → vinbaren → namnet → avskedet (M1) →
//   måndagens schema (S1) → servicen (M2) → vinbaren från spelarens kamera
//   → kvällen med figurerna vid två tidpunkter → raket 1 genom alla tre
//   stegen (R1, R2 per steg) → raket 2 fälld på techne (R3) → kvällens
//   lärdom (L1) → kvällsberättelsen (K1) → veckan till söndagen (T1, B1,
//   S2).
// X1 (utan verksamhet och pengar) nås inte från normal start på en vecka;
// den tas i en andra körning med sparfilen reports/order270/save-utan-
// verksamhet.json på sparplats 1 (redovisas i dod.json).
// Utdata: reports/order271/dod-*.png och reports/order271/dod.json.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
// REPORT_ORDER=order273 skriver under en senare orders katalog.
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order271');
mkdirSync(OUT, { recursive: true });
const PORT = 4174;
const URL = `http://localhost:${PORT}`;
const W = 1920;
const H = 1080;

const Q = resolve(FRONTEND, 'src/strategic/content/questions');
const qmeta = JSON.parse(readFileSync(resolve(Q, 'bank.meta.json'), 'utf8')).questions;
const correctByPrompt = new Map();
for (const file of ['bank.text.en.json', 'bank.text.sv.draft.json']) {
  const texts = JSON.parse(readFileSync(resolve(Q, file), 'utf8')).texts;
  for (const m of qmeta) if (texts[m.id]) correctByPrompt.set(texts[m.id].prompt.trim(), m.correctIndex);
}
// Raketbanken: svarens kvalitet per raket och steg (samma JSON som spelet).
const rocketMeta = new Map(JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8')).incidents.map((i) => [i.id, i]));

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
const errors = [];
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', viewport: `${W}×${H}`, steps: [], shots: [], rockets: [], errors };
const t0 = Date.now();
const step = (name, extra = {}) => { const e = { name, atSeconds: Math.round((Date.now() - t0) / 1000), ...extra }; report.steps.push(e); console.log(`${e.atSeconds}s ${name}`); };

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 600)}`));
  return p;
}
let page = await newPage();
const shot = async (file, what) => { await page.screenshot({ path: resolve(OUT, file) }); report.shots.push({ file, what }); };

// Simuleringens klocka ur kortets och dagens etiketter (fps och speltid).
const fps = () => page.evaluate(() => new Promise((res) => {
  let n = 0; const start = performance.now();
  const f = () => { n++; if (performance.now() - start < 1000) requestAnimationFrame(f); else res(n); };
  requestAnimationFrame(f);
}));

async function walkUntilPrompt(key, prompt, maxMs) {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    const hud = await page.$eval('.hud-context', (e) => e.textContent).catch(() => '');
    if (hud && hud.includes(prompt)) return true;
    await page.keyboard.down(key); await delay(120); await page.keyboard.up(key);
  }
  return false;
}
async function answerQuestion(wantCorrect) {
  const prompt = await page.textContent('[data-testid=question-prompt]');
  const text = prompt.slice(prompt.indexOf(':') + 1).trim();
  const correct = correctByPrompt.get(text);
  if (correct === undefined) throw new Error(`okänd fråga: ${text}`);
  await page.click(`[data-testid=option-${wantCorrect ? correct : (correct + 1) % 4}]`);
  await page.waitForSelector('[data-testid=explanation]');
}
async function visit(kind, pavilion, n, opts = {}) {
  await page.click('[data-testid=open-house]');
  await page.waitForSelector('[data-testid=screen-MD1]');
  if (opts.md1) await shot(opts.md1, 'MD1 medaljerna');
  await page.click(`[data-testid=${kind}-${pavilion}]`);
  for (let i = 0; i < n; i++) {
    const wrong = opts.wrong?.includes(i);
    await answerQuestion(!wrong);
    if (opts.o1 && i === opts.wrong?.[0]) await shot(opts.o1, 'O1 öva, förklaringen efter fel svar');
    await page.click('[data-testid=next-question]');
  }
  if (kind === 'exam') {
    await page.waitForSelector('[data-testid=screen-MD2]');
    if (opts.md2) { await delay(1500); await shot(opts.md2, 'MD2 ny medalj (efter 1,2 s)'); }
    await page.click('[data-testid=medal-continue]');
  }
  await page.waitForSelector('[data-testid=visit-result]');
  if (opts.o2) await shot(opts.o2, `O2 resultatet (${kind})`);
  if (opts.toMedals) {
    await page.click('[data-testid=visit-to-medals]');
    await page.waitForSelector('[data-testid=screen-MD1]');
    await shot(opts.toMedals, 'MD1 med dagens medalj');
    await page.click('[data-testid=close-house]');
  } else {
    await page.click('[data-testid=close-visit]');
  }
}
async function mentorNext(stepId, file) {
  await page.waitForSelector(`[data-testid=mentor][data-step=${stepId}]`, { timeout: 120000 });
  await delay(600);
  if (file) await shot(file, `M1 mentorn (${stepId})`);
  await page.click('[data-testid=mentor-next]');
}


// Ett steg i raketen: vänta tills kortet visar steget, ta bild, svara.
async function answerStep(id, stepIdx, want, file) {
  await page.waitForFunction((s) => {
    const c = document.querySelector('[data-testid=incident-card]');
    return c && c.getAttribute('data-step') === String(s) && !c.querySelector('[data-testid=incident-band]');
  }, stepIdx, { timeout: 60000 });
  const s = { step: stepIdx, axis: await page.getAttribute('[data-testid=incident-card]', 'data-step-axis'), question: await page.textContent('[data-testid=incident-question]'), countdown: await page.textContent('[data-testid=incident-countdown]') };
  if (file) await shot(`${file}-fraga.png`, `R1 raketkortet, steg ${stepIdx + 1} (${s.axis})`);
  const option = rocketMeta.get(id).steps[stepIdx].options.find((o) => o.quality === want);
  const struck = await page.$$eval('[data-struck=true]', (els) => els.map((e) => e.getAttribute('data-option-id')));
  const pick = struck.includes(option.id) ? rocketMeta.get(id).steps[stepIdx].options.find((o) => o.quality === want && !struck.includes(o.id)) : option;
  await page.click(`[data-testid=incident-option-${pick.id}]`);
  s.answer = { id: pick.id, quality: pick.quality };
  await page.waitForSelector('[data-testid=incident-band]', { timeout: 5000 }).catch(() => {});
  await delay(300);
  if (file) await shot(`${file}-svar.png`, `${want === 'wrong' ? 'R3 fel svar' : 'R2 rätt svar'}, steg ${stepIdx + 1}`);
  s.band = await page.textContent('[data-testid=incident-band]').catch(() => null);
  return s;
}

// ONLY_X1=1 kör bara X1-steget (sparfilen), utan veckan från start.
const ONLY_X1 = process.env.ONLY_X1 === '1';
try {
  if (!ONLY_X1) {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await shot('dod-00-startrutan.png', 'normal start');
  await page.click('[data-testid=new-game]');
  await page.waitForSelector('.hud', { timeout: 90000 });
  await delay(2000);
  if (!(await walkUntilPrompt('w', 'Talk', 20000))) throw new Error('prata');
  await page.keyboard.press('e');
  await page.waitForSelector('.dialogue-panel .choice');
  await page.$eval('.dialogue-panel .choice', (b) => b.click());
  await page.waitForSelector('.dialogue-actions .btn');
  await page.$eval('.dialogue-actions .btn', (b) => b.click());
  await page.waitForSelector('.dialogue-panel', { state: 'detached', timeout: 10000 });
  if (!(await walkUntilPrompt('w', 'Register', 30000))) throw new Error('registrera');
  await page.keyboard.press('e');
  await page.waitForSelector('.end-stage', { timeout: 10000 });
  await page.$eval('.end-buttons .btn.primary', (b) => b.click());
  step('framme i Grythyttan');

  await mentorNext('practice', 'dod-01-M1-mentorn-dag-1.png');
  await delay(500); await shot('dod-02-S1-schema-introduktionen.png', 'S1 schemat i introduktionen');
  await visit('practice', 'stensota', 5, { md1: 'dod-14-MD1-medaljerna.png', wrong: [1], o1: 'dod-12-O1-ova-forklaring.png', o2: 'dod-13-O2-ova-resultat.png' });
  await mentorNext('exam', null);
  await visit('exam', 'kalastorget', 8, { wrong: [2], md2: 'dod-15-MD2-ny-medalj.png', o2: 'dod-13-O2-prov-resultat.png', toMedals: 'dod-14-MD1-ny-medalj.png' });
  await mentorNext('bank', null);
  await page.click('[data-testid=open-bank]');
  await page.waitForSelector('[data-testid=screen-B0a]');
  await shot('dod-01b-B0a-forsta-bankmotet-foodtruck.png', 'B0a första bankmötet, food trucken');
  await page.click('[data-testid=close-bank]');
  await visit('exam', 'stensota', 8, {});
  await page.click('[data-testid=open-bank]');
  await page.waitForSelector('[data-testid=screen-B0b]');
  await shot('dod-01c-B0b-forsta-bankmotet-vinbaren.png', 'B0b första bankmötet, vinbaren');
  await page.click('[data-testid=choose-vinbar]');
  await page.waitForSelector('input[type=text]', { timeout: 30000 });
  await page.fill('input[type=text]', 'Vinbaren vid torget');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-testid=mentor][data-step=farewell]', { timeout: 30000 });
  await delay(600);
  await page.click('[data-testid=mentor-close]');
  await delay(800);
  // Playwright skrollar knappen den klickar på in i vyn; skärmen mäts och
  // visas uppifrån, som spelaren ser den.
  report.s1ScrollTopBeforeShot = await page.evaluate(() => document.querySelector('[data-testid=day-action-bar]')?.scrollTop ?? null);
  await page.evaluate(() => document.querySelector('[data-testid=day-action-bar]')?.scrollTo(0, 0));
  await delay(200); await shot('dod-02-S1-schema-mandag.png', 'S1 morgonens schema, måndag');
  step('vinbaren öppnad');
  // ORDER 275 — lagret är insatsen: spelaren köper baspaketet och ser
  // kassan sjunka direkt.
  if (await page.$('[data-testid=stock-packages]')) {
    const cashText = () => page.textContent('[aria-label="Cash"]').catch(() => null);
    report.stock = { before: await cashText() };
    await page.$eval('[data-testid=stock-packages]', (e) => e.scrollIntoView({ block: 'start' }));
    await shot('dod-26-lagret-fore-kop.png', 'lagret före köpet (paketen)');
    await page.click('[data-testid=buy-package-vinbar-base]');
    await delay(400);
    report.stock.after = await cashText();
    report.stock.inStock = await page.getAttribute('[data-testid=stock-in-stock]', 'data-covers');
    await page.$eval('[data-testid=stock-in-stock]', (e) => e.scrollIntoView({ block: 'center' }));
    await shot('dod-27-lagret-efter-kop.png', 'lagret efter köpet: i lager nu, kassan lägre');
    await page.evaluate(() => document.querySelector('[data-testid=day-action-bar]')?.scrollTo(0, 0));
    step('baspaketet köpt');
  }

  await page.click('[data-testid=start-service]');
  await page.waitForSelector('[data-testid=mentor][data-step=service]', { timeout: 60000 });
  await delay(3000); await shot('dod-04-M2-mentorn-service.png', 'M2 mentorn första servicen');
  await page.click('[data-testid=mentor-close-service]');
  step('servicen öppnad');
  report.fpsService = await fps();
  // ORDER 274 — tiden kvar av servicen, vid två tidpunkter. STOP_AFTER=clock
  // avslutar körningen här (utan veckan).
  for (const [i, wait] of [[1, 2000], [2, 60000]]) {
    await delay(wait);
    report.clock = report.clock ?? [];
    report.clock.push({ text: await page.textContent('[data-testid=service-clock]').catch(() => null), leftMinutes: await page.getAttribute('[data-testid=service-clock]', 'data-left-minutes').catch(() => null) });
    await shot(`dod-25-tiden-kvar-${i}.png`, `tiden kvar av servicen (tidpunkt ${i})`);
  }
  if (process.env.STOP_AFTER === 'clock') throw new Error('STOP_AFTER=clock');
  await delay(4000);
  await shot('dod-20-vinbaren-spelarens-kamera.png', 'vinbaren från spelarens kamera, under servicen');

  // Kvällen: raket 1 hela vägen (bästa svaret i alla tre steg), raket 2
  // fälld på techne. Mellan raketerna: figurerna vid två tidpunkter.
  let n = 0;
  let movement = 0;
  while (!(await page.$('[data-testid=evening-bar]'))) {
    const card = await page.$('[data-testid=incident-card]');
    if (!card) {
      if (movement < 2 && n >= 1) {
        await shot(`dod-21-kvallen-figurerna-${movement + 1}.png`, `kvällen, figurerna i rörelse (tidpunkt ${movement + 1})`);
        movement++;
        await delay(3000);
        continue;
      }
      await delay(300);
      continue;
    }
    const id = await card.getAttribute('data-incident-id');
    if (await card.getAttribute('data-step') !== '0') { await delay(200); continue; }
    n += 1;
    const entry = { n, id, steps: [] };
    if (n === 1) {
      for (let s = 0; s < 3; s++) entry.steps.push(await answerStep(id, s, 'best', `dod-30-raket-1-steg-${s + 1}`));
    } else if (n === 2) {
      entry.steps.push(await answerStep(id, 0, 'best', null));
      entry.steps.push(await answerStep(id, 1, 'wrong', 'dod-31-raket-2-fel'));
    } else {
      for (let s = 0; s < 3; s++) entry.steps.push(await answerStep(id, s, 'best', null));
    }
    await page.waitForSelector('[data-testid=incident-card]', { state: 'detached', timeout: 30000 });
    await delay(500);
    if (n <= 2) await shot(`dod-32-raket-${n}-utfallet.png`, `efter raket ${n}: raden i rummet och mätarna`);
    report.rockets.push(entry);
    step(`raket ${n}: ${id}`);
  }
  await page.waitForSelector('[data-testid=screen-L1]', { timeout: 30000 });
  await delay(600); await shot('dod-40-L1-kvallens-lardom.png', 'L1 kvällens lärdom');
  await page.click('[data-testid=to-evening-story]');
  await page.waitForSelector('[data-testid=evening-story]', { timeout: 10000 });
  await delay(400); await shot('dod-41-K1-kvallsberattelsen.png', 'K1 kvällsberättelsen');
  await page.click('[data-testid=end-evening]');
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  step('tisdag morgon');

  // Veckan till söndagen: det bästa svaret i varje steg.
  // Morgonen som den rimliga spelaren i harnessen: inga ändringar (spelets
  // förvalda meny och lager). En egen meny med tre rätter tömde köket.
  async function playEvening(figures) {
    // ORDER 275 — baspaketet varje morgon, som den rimliga spelaren.
    const buyBase = await page.$('[data-testid=buy-package-vinbar-base]');
    if (buyBase) { await buyBase.click().catch(() => {}); await delay(200); }
    await page.click('[data-testid=start-service]');
    let shotsTaken = 0;
    const openedAt = Date.now();
    const until = Date.now() + 15 * 60000;
    while (Date.now() < until) {
      if (await page.$('[data-testid=evening-bar]')) break;
      const card = await page.$('[data-testid=incident-card]');
      // Lördagen: figurerna vid två tidpunkter mitt i kvällen (130 och 142 s
      // efter öppning i 2×, när rummet har fyllts), utan kort.
      if (figures && !card && shotsTaken < 2 && Date.now() - openedAt > 130000 + shotsTaken * 12000) {
        shotsTaken++;
        await shot(`dod-22-lordag-figurerna-${shotsTaken}.png`, `lördagskvällen, figurerna i rörelse (tidpunkt ${shotsTaken})`);
        report.saturdayGuests = report.saturdayGuests ?? [];
        report.saturdayGuests.push(await page.textContent('[data-testid=service-meters]').catch(() => null));
      }
      if (card && !(await page.$('[data-testid=incident-band]'))) {
        const id = await card.getAttribute('data-incident-id');
        const s = Number(await card.getAttribute('data-step'));
        const o = rocketMeta.get(id)?.steps[s]?.options.find((x) => x.quality === 'best');
        if (o) await page.click(`[data-testid=incident-option-${o.id}]`).catch(() => {});
      }
      await delay(500);
    }
    for (let i = 0; i < 4 && !(await page.$('[data-testid=day-action-bar]')); i++) {
      const story = await page.$('[data-testid=to-evening-story]');
      if (story) { await story.click().catch(() => {}); await delay(500); }
      const end = await page.$('[data-testid=end-evening]');
      if (end) await end.click().catch(() => {});
      await delay(1500);
    }
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  }
  for (let d = 0; d < 5; d++) { await playEvening(d === 4); step(`morgon ${d + 3}`); }
  await page.waitForSelector('[data-testid=screen-T1]', { timeout: 60000 });
  await delay(600); await shot('dod-10-T1-sondagstidningen.png', 'T1 söndagstidningen');
  await page.click('[data-testid=newspaper-to-bank]');
  await page.waitForSelector('[data-testid=screen-B1]');
  await delay(400); await shot('dod-11-B1-bankmotet.png', 'B1 bankmötet');
  await page.click('[data-testid=close-bank]');
  await delay(600); await shot('dod-03-S2-schema-sondag.png', 'S2 morgonens schema, söndag');
  step('söndag');
  }

  // X1: en andra körning med sparfilen utan verksamhet och pengar.
  // Sparfilen har kassan kvar från food trucken (ca 30 000 kr), över minsta
  // insatsen (FRAGOR §50), och då visas rutan inte. Kassan sätts till 0 i
  // kopian som laddas, och det redovisas i rapporten.
  const saveFile = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order270/save-utan-verksamhet.json'), 'utf8'));
  report.x1 = { save: 'reports/order270/save-utan-verksamhet.json', cashInSave: saveFile.sim.cash, cashLoaded: 0 };
  saveFile.sim.cash = 0;
  const SAVE = JSON.stringify(saveFile);
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript(([key, value]) => {
    if (!sessionStorage.getItem('order271-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('order271-seeded', '1'); }
  }, ['nexus.v1.slot1', SAVE]);
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 600)}`));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]').catch(async () => { await page.click('text=Fortsätt'); });
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  // Sparfilen är en söndag: tidningen öppnas först, rutan efter den.
  for (let i = 0; i < 60 && (!(await page.$('[data-testid=screen-X1]')) || (await page.$('[data-testid=close-newspaper]'))); i++) {
    const close = await page.$('[data-testid=close-newspaper]');
    if (close) await close.click().catch(() => {});
    await delay(1000);
  }
  await page.waitForSelector('[data-testid=screen-X1]', { timeout: 120000 });
  await delay(800); await shot('dod-50-X1-utan-verksamhet-och-pengar.png', 'X1 utan verksamhet och pengar (sparfil)');
  step('X1');
} catch (e) {
  step('FEL', { error: String(e?.message ?? e) });
  await shot('dod-99-fel.png', 'läget vid felet').catch(() => {});
} finally {
  writeFileSync(resolve(OUT, ONLY_X1 ? 'dod-x1.json' : 'dod.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ steps: report.steps.map((s) => `${s.atSeconds}s ${s.name}${s.error ? ' ' + s.error : ''}`), fps: report.fpsService, errors: errors.length }, null, 2));
