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
// ORDER 284 — PORT=… när 4174 är upptagen av annat.
// ORDER 291 — GAME_LANG=sv spelar på svenska.
const PORT = Number(process.env.PORT ?? 4174);
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
// ORDER 279 — raketerna om kvällens meny.
for (const i of JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/menu.meta.json'), 'utf8')).incidents) rocketMeta.set(i.id, i);

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
  // ORDER 291 — GAME_LANG=sv spelar veckan på svenska (spelarens val i
  // menyn sparas i nexus.lang; här sätts det före första sidladdningen).
  if (process.env.GAME_LANG) await ctx.addInitScript((lang) => { if (!sessionStorage.getItem('n-lang')) { localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('n-lang', '1'); } }, process.env.GAME_LANG);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 600)}`));
  return p;
}
let page = await newPage();
const shot = async (file, what) => { await page.screenshot({ path: resolve(OUT, file) }); report.shots.push({ file, what }); };
// ORDER 292b — ingen figur ligger ned eller sitter utan sits, under hela
// körningen (rummets mätning scene/figureAudit.ts, body.dataset.figuresDown).
// Läses var 250:e millisekund; varje ny avvikelse sparas med klockslaget och en bild.
report.figures = { samples: 0, audited: 0, maxDown: 0, faults: [] };
{
  const seenFaults = new Set();
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      report.figures.samples += 1;
      const raw = await page.evaluate(() => document.body.dataset.figuresDown ?? null);
      if (raw) {
        report.figures.audited += 1;
        const d = JSON.parse(raw);
        report.figures.maxDown = Math.max(report.figures.maxDown, d.n);
        for (const ft of d.faults) {
          const key = `${ft.kind}:${ft.id}:${ft.fault}:${ft.pose}:${ft.clip}`;
          if (seenFaults.has(key)) continue;
          seenFaults.add(key);
          const clock = await page.textContent('[data-testid=service-clock-time]').catch(() => null);
          report.figures.faults.push({ ...ft, clock, step: report.steps.at(-1)?.name ?? null });
          if (report.figures.faults.length <= 4) await page.screenshot({ path: resolve(OUT, `dod-figur-fel-${report.figures.faults.length}.png`) }).catch(() => {});
        }
      }
    } catch { /* sidan byts */ }
    busy = false;
  }, 250).unref();
}

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
  // ORDER 283 — första besöket: introduktionen till de tre kunskapsformerna.
  await page.waitForSelector('[data-testid=screen-MD1], [data-testid=house-intro]');
  if (await page.$('[data-testid=house-intro]')) {
    await delay(400);
    report.houseIntro = { forms: await page.$$eval('[data-testid^=house-intro-] .nx-label:first-child', (els) => els.map((e) => e.textContent)) };
    await shot('dod-05-introduktionen-kunskapsformerna.png', 'första besöket i Måltidens hus: de tre kunskapsformerna');
    await page.click('[data-testid=house-intro-continue]');
  }
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
  if (!(await walkUntilPrompt('w', process.env.GAME_LANG === 'sv' ? 'Prata' : 'Talk', 20000))) throw new Error('prata');
  await page.keyboard.press('e');
  await page.waitForSelector('.dialogue-panel .choice');
  await page.$eval('.dialogue-panel .choice', (b) => b.click());
  await page.waitForSelector('.dialogue-actions .btn');
  await page.$eval('.dialogue-actions .btn', (b) => b.click());
  await page.waitForSelector('.dialogue-panel', { state: 'detached', timeout: 10000 });
  if (!(await walkUntilPrompt('w', process.env.GAME_LANG === 'sv' ? 'Registrera' : 'Register', 30000))) throw new Error('registrera');
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
  // ORDER 287a — bokningsboken måndag morgon (recordBooking definieras längre ned).
  {
    const rows = await page.$$eval('[data-testid^=booking-row-]', (els) => els.map((e) => ({ key: e.getAttribute('data-testid').replace('booking-row-', ''), text: e.textContent }))).catch(() => []);
    report.bookings = [{ morning: 'måndag', total: await page.textContent('[data-testid=booking-guests]').catch(() => null), rows }];
  }
  step('vinbaren öppnad');
  // ORDER 277 — servicen går inte att starta förrän menyn och dryckeslistan
  // har en rätt och en dryck i lager. ORDER 280 — inköpen görs på Designs
  // M1: + köper ett parti och lappen flyger till kassan, som räknas först
  // när lappen landat.
  const counter = async () => ({
    value: await page.getAttribute('[data-testid=cash-counter]', 'data-value').catch(() => null),
    shown: await page.getAttribute('[data-testid=cash-counter-num]', 'data-shown').catch(() => null),
    credits: await page.getAttribute('[data-testid=credits-counter]', 'data-value').catch(() => null),
    creditsShown: await page.getAttribute('[data-testid=credits-counter-num]', 'data-shown').catch(() => null)
  });
  let m1Open = false;
  if (await page.$('[data-testid=open-buy]')) {
    report.stock = { counterBefore: await counter() };
    // ORDER 284 — utan lager är huvudknappen inköpen; öppna finns i M1 och är avstängd där.
    report.stock.buyIsPrimary = !!(await page.$('[data-testid=open-buy-foot]'));
    report.stock.blockedText = await page.textContent('[data-testid=start-blocked]').catch(() => null);
    await shot('dod-26-lagret-spärren.png', 'morgonen: servicen går inte att starta utan meny och dryckeslista');
    await page.click('[data-testid=open-buy]');
    await page.waitForSelector('[data-testid=screen-M1]');
    m1Open = true;
    await delay(400);
    report.stock.startDisabledBefore = await page.$eval('[data-testid=open-doors]', (b) => b.disabled).catch(() => null);
    await shot('dod-26b-M1-morgonen-tom.png', 'M1 morgonens inköp innan något är köpt');
    for (const id of ['chicken-plate', 'pork-plate', 'root-soup', 'lentil-plate', 'dairy-dessert', 'house-wine', 'beer', 'alcohol-free']) {
      await page.click(`[data-testid=buy-more-${id}]`).catch(() => {});
      await delay(320);
    }
    await delay(1400);
    report.stock.beforeBigBuy = await counter();
    await page.click('[data-testid=buy-more-fine-wine]');
    await delay(380);
    report.stock.midFly = await counter();
    await shot('dod-27-M1-lappen-flyger.png', 'M1: lappen flyger till kassan; kassan väntar tills den landat');
    await delay(1700);
    report.stock.afterBigBuy = await counter();
    report.stock.coverage = { covers: await page.getAttribute('[data-testid=buy-coverage]', 'data-covers'), guests: await page.getAttribute('[data-testid=buy-coverage]', 'data-guests') };
    report.stock.spent = await page.getAttribute('[data-testid=buy-spent]', 'data-value');
    report.stock.qty = await page.$$eval('[data-testid^=buy-qty-]', (els) => Object.fromEntries(els.map((e) => [e.getAttribute('data-testid').slice(8), e.textContent])));
    await page.click('[data-testid=buy-less-pork-plate]');
    await delay(1600);
    report.stock.afterReturn = { ...(await counter()), qtyPork: await page.textContent('[data-testid=buy-qty-pork-plate]') };
    report.stock.openDoorsDisabled = await page.$eval('[data-testid=open-doors]', (b) => b.disabled);
    await shot('dod-27-M1-morgonen.png', 'M1 efter inköpen: rätter, dryckeslista, dagens inköp och täckningen');
    step('inköpen på M1');
  }

  await page.click(m1Open ? '[data-testid=open-doors]' : '[data-testid=start-service]');
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
  // ORDER 278 — servicen syns: lagret under servicen och strömmen med
  // beställningar, betalningar, dricks och slumpens händelser.
  report.serviceStock = await page.$$eval('[data-testid^=service-stock-]', (els) => els.map((e) => ({ id: e.getAttribute('data-testid'), left: e.getAttribute('data-left'), text: e.textContent })));
  await shot('dod-33-lagret-under-servicen.png', 'lagret under servicen: portioner, glas och flaskor per artikel');
  report.stream = [];
  const streamSeen = new Set();
  const collectStream = async () => {
    const lines = await page.$$eval('[data-testid=feed-row] .nx-feed-text', (els) => els.map((e) => e.textContent)).catch(() => []);
    for (const l of lines) if (l && !streamSeen.has(l)) { streamSeen.add(l); report.stream.push(l); }
  };
  for (let i = 0; i < 20; i++) { await collectStream(); await delay(500); }
  await shot('dod-34-strommen.png', 'strömmen i stunden: beställningar, betalningar och dricks');
  if (process.env.STOP_AFTER === 'clock') throw new Error('STOP_AFTER=clock');
  await delay(4000);
  await shot('dod-20-vinbaren-spelarens-kamera.png', 'vinbaren från spelarens kamera, under servicen');

  // Kvällen: raket 1 hela vägen (bästa svaret i alla tre steg), raket 2
  // fälld på techne. Mellan raketerna: figurerna vid två tidpunkter.
  let n = 0;
  let movement = 0;
  while (!(await page.$('[data-testid=evening-bar], [data-testid=screen-S1]'))) {
    const card = await page.$('[data-testid=incident-card]');
    await collectStream();
    // ORDER 278 — en slumpens händelse och en rätt som tagit slut, på bild.
    if (!report.chanceShot && report.stream.some((l) => /knocked over|buys the bar a round|birthday|walk in without|neighbour complains|best wine bar/.test(l))) {
      report.chanceShot = report.stream.find((l) => /knocked over|buys the bar a round|birthday|walk in without|neighbour complains|best wine bar/.test(l));
      await shot('dod-35-slumpens-handelse.png', 'strömmen: en slumpens händelse');
    }
    // ORDER 277 — en gäst som inte hittade något för sin kost eller
    // plånbok: raden i strömmen, och kassan överst under servicen.
    if (!report.lostSale) {
      const line = await page.evaluate(() => [...document.querySelectorAll('body *')].map((e) => e.childNodes.length === 1 && e.textContent ? e.textContent : '').find((t) => /left without ordering|only had a drink|nothing alcohol-free/.test(t)) ?? null);
      if (line) {
        report.lostSale = { line, cash: await page.getAttribute('[data-testid=cash-counter]', 'data-value').catch(() => null) };
        await shot('dod-28-gast-utan-alternativ.png', 'servicen: en gäst utan alternativ för sin kost eller plånbok (strömmen), kassan överst');
      }
    }
    // ORDER 279 — en raket där gästen frågar om kvällens meny, på bild.
    if (card && !report.menuRocket) {
      const cid = await card.getAttribute('data-incident-id');
      if (cid && cid.startsWith('mn') && !(await page.$('[data-testid=incident-band]'))) {
        report.menuRocket = { id: cid, question: await page.textContent('[data-testid=incident-question]').catch(() => null) };
        await shot('dod-37-menyraket.png', `raket om kvällens meny (${cid})`);
      }
    }
    // ORDER 280 — Back your knowledge (Designs B1): en raket med rätta svar
    // och hög säkerhet, och en med fel svar. Bara krediterna rör sig.
    if (!card && n >= 1 && !report.backs && await page.$('[data-testid=back-start]')) {
      report.backs = [];
      await shot('dod-38-H1-handelser.png', 'H1 händelserna: beställt, betalt, dricks, i kväll och Back your knowledge');
      for (const want of ['best', 'wrong']) {
        const btn = await page.$('[data-testid=back-start]');
        if (!btn || await btn.isDisabled()) { report.backs.push({ want, skipped: 'knappen avstängd' }); continue; }
        const before = await counter();
        await btn.click();
        await page.waitForSelector('[data-testid=incident-card][data-backed=true]', { timeout: 10000 });
        const bid = await page.getAttribute('[data-testid=incident-card]', 'data-incident-id');
        const entry = { want, id: bid, before, steps: [] };
        const steps = want === 'best' ? [0, 1, 2] : [0];
        for (const st of steps) {
          await page.waitForFunction((x) => { const c = document.querySelector('[data-testid=incident-card]'); return c && c.getAttribute('data-step') === String(x) && !c.querySelector('[data-testid=incident-band]'); }, st, { timeout: 60000 });
          const struck = await page.$$eval('[data-struck=true]', (els) => els.map((e) => e.getAttribute('data-option-id')));
          const opts = rocketMeta.get(bid).steps[st].options.filter((o) => !struck.includes(o.id));
          const pick = (want === 'best' ? opts.find((o) => o.quality === 'best') : opts.find((o) => o.quality === 'wrong')) ?? opts[0];
          await page.click(`[data-testid=incident-option-${pick.id}]`);
          // ORDER 289 — Think so ska vara förvald i varje steg.
          entry.defaults = entry.defaults ?? [];
          entry.defaults.push(await page.getAttribute('[data-testid=back-level-1]', 'data-chosen').catch(() => null));
          const level = want === 'best' ? (st === 0 ? 2 : 1) : 1;
          const levelBtn = await page.$(`[data-testid=back-level-${level}][data-allowed=true]`);
          await page.click(levelBtn ? `[data-testid=back-level-${level}]` : '[data-testid=back-level-0]');
          if (st === 0) await shot(`dod-39-B1-${want === 'best' ? 'ratt' : 'fel'}-fraga.png`, `B1: valt svar och säkerhet, före Stå för svaret (${want})`);
          await page.click('[data-testid=back-lock]');
          await page.waitForSelector('[data-testid=incident-band]', { timeout: 5000 }).catch(() => {});
          await delay(350);
          const mid = await counter();
          if (st === 0 || st === 2) await shot(`dod-40-B1-${want === 'best' ? `ratt-steg-${st + 1}` : 'fel'}.png`, `B1: svaret, krediterna ${want === 'best' ? 'flyger till' : 'faller ur'} HUD:en`);
          entry.steps.push({ step: st, option: pick.id, quality: pick.quality, level: levelBtn ? level : 0, band: await page.textContent('[data-testid=incident-band]').catch(() => null), mid });
        }
        await page.waitForSelector('[data-testid=incident-card]', { state: 'detached', timeout: 30000 });
        await delay(1500);
        entry.after = await counter();
        report.backs.push(entry);
        step(`back your knowledge (${want})`);
      }
      continue;
    }
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
  // ORDER 280 — sopbilen (Designs S1) först på kvällen: avgiften räknas
  // upp och flyger till kassan, som räknas ner först när lappen landat.
  if (await page.waitForSelector('[data-testid=screen-S1]', { timeout: 30000 }).then(() => true).catch(() => false)) {
    report.s1 = { cashAtOpen: await counter() };
    await delay(1600);
    await shot('dod-42-S1-sopbilen-bilen.png', 'S1: bilen rullar in, fraktionerna läggs fram');
    await delay(5200);
    report.s1.beforeFly = await counter();
    report.s1.fee = await page.getAttribute('[data-testid=waste-fee]', 'data-value');
    report.s1.value = await page.getAttribute('[data-testid=waste-value]', 'data-value');
    report.s1.kg = await page.textContent('[data-testid=waste-total-kg]');
    report.s1.fractions = await page.$$eval('[data-fraction]', (els) => els.map((e) => ({ key: e.getAttribute('data-fraction'), kg: e.getAttribute('data-kg') })));
    report.s1.advice = await page.textContent('[data-testid=waste-advice]');
    await delay(3000);
    report.s1.afterFly = await counter();
    await shot('dod-42-S1-sopbilen.png', 'S1 sopbilen: fraktionerna, svinnet, miljöavgiften och rådet');
    await page.click('[data-testid=waste-continue]');
  }
  // ORDER 290 — skärmen efter servicen (T2): överföringen till kontot.
  if (await page.waitForSelector('[data-testid=screen-T2]', { timeout: 8000 }).then(() => true).catch(() => false)) {
    await delay(2000);
    await shot('dod-48-T2-efter-servicen.png', 'T2 efter servicen: täckningsbidrag, täckningsgrad och överföringen');
    await delay(900);
    await page.click('[data-testid=transfer-do]');
    await delay(2200);
    report.t2 = {
      result: await page.getAttribute('[data-testid=transfer-result]', 'data-value'),
      contribution: await page.getAttribute('[data-testid=transfer-contribution]', 'data-value'),
      ratio: await page.getAttribute('[data-testid=transfer-ratio]', 'data-value'),
      forecast: await page.textContent('[data-testid=transfer-forecast]').catch(() => null)
    };
    await shot('dod-49-T2-overfort.png', 'T2 överfört');
    await page.click('[data-testid=transfer-continue]');
  }
  // ORDER 285 — kvällens resultat (R1) efter sopbilen.
  if (await page.waitForSelector('[data-testid=screen-R1]', { timeout: 8000 }).then(() => true).catch(() => false)) {
    await delay(2500);
    report.r1 = await page.$$eval('[data-result-row]', (els) => els.map((e) => ({ key: e.getAttribute('data-testid'), tone: e.getAttribute('data-tone'), delta: e.getAttribute('data-delta') })));
    // ORDER 287a — nivåerna 0–10 och kvällens gäster efter typ.
    report.r1Levels = await page.$$eval('[data-testid=level-dots]', (els) => els.map((e) => ({ level: e.getAttribute('data-level'), previous: e.getAttribute('data-previous') })));
    await recordGuests('mån');
    await shot('dod-43-R1-kvallens-resultat.png', 'R1 kvällens resultat: vad kvällen gav och tog');
    await page.click('[data-testid=result-continue]');
  }
  // ORDER 288 — kvällen i byn (J1): krogarnas gäster, intäkt per gäst och per stol.
  if (await page.waitForSelector('[data-testid=screen-J1]', { timeout: 8000 }).then(() => true).catch(() => false)) {
    await delay(900);
    report.j1 = await page.$$eval('[data-testid=compare-row]', (rows) => rows.map((r) => ({ venue: r.getAttribute('data-venue'), text: r.textContent })));
    await shot('dod-44-J1-kvallen-i-byn.png', 'J1 kvällen i byn: krogarna jämförda');
    await page.click('[data-testid=compare-continue]');
  }
  await page.waitForSelector('[data-testid=screen-L1]', { timeout: 30000 });
  // ORDER 289 — varje skärm tar emot klick först efter 700 ms.
  await delay(900); await shot('dod-40-L1-kvallens-lardom.png', 'L1 kvällens lärdom');
  await page.click('[data-testid=to-evening-story]');
  await page.waitForSelector('[data-testid=evening-story]', { timeout: 10000 });
  await delay(900); await shot('dod-41-K1-kvallsberattelsen.png', 'K1 kvällsberättelsen');
  await page.click('[data-testid=end-evening]');
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  step('tisdag morgon');
  // Veckan till söndagen: det bästa svaret i varje steg.
  // Morgonen som den rimliga spelaren i harnessen: inga ändringar (spelets
  // förvalda meny och lager). En egen meny med tre rätter tömde köket.
  // ORDER 287a — kvällens gäster efter typ i R1 (result-guests-*), gästen med
  // socialt kapital och miljardären.
  async function recordGuests(label) {
    const rows = await page.$$eval('[data-testid^=result-guests-]', (els) => els.map((e) => ({ type: e.getAttribute('data-testid').replace('result-guests-', ''), guests: Number(e.getAttribute('data-guests')), revenueSek: Number(e.getAttribute('data-revenue')) }))).catch(() => []);
    const social = await page.$eval('[data-testid=result-social]', (e) => ({ outcome: e.getAttribute('data-outcome'), text: e.textContent })).catch(() => null);
    const billionaire = await page.textContent('[data-testid=result-billionaire]').catch(() => null);
    report.eveningGuests = report.eveningGuests ?? [];
    report.eveningGuests.push({ evening: label, rows, social, billionaire });
    return { rows, social, billionaire };
  }
  // ORDER 287a — bokningsboken på morgonen (Designs skärm 1).
  async function recordBooking(label, shotName) {
    const rows = await page.$$eval('[data-testid^=booking-row-]', (els) => els.map((e) => ({ key: e.getAttribute('data-testid').replace('booking-row-', ''), text: e.textContent }))).catch(() => []);
    const total = await page.textContent('[data-testid=booking-guests]').catch(() => null);
    const billionaire = await page.textContent('[data-testid=booking-billionaire]').catch(() => null);
    const buzz = await page.textContent('[data-testid=booking-buzz]').catch(() => null);
    report.bookings = report.bookings ?? [];
    report.bookings.push({ morning: label, total, rows, billionaire, buzz });
    if (shotName) {
      await page.$eval('[data-testid=booking-book]', (e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
      await delay(300);
      await shot(shotName, `bokningsboken ${label}: kvällens gäster efter typ`);
    }
  }
  let eveningNo = 0;
  async function playEvening(figures) {
    eveningNo++;
    await recordBooking(`kväll ${eveningNo + 1}`, eveningNo === 1 || figures ? `dod-46-bokningsboken-${eveningNo + 1}.png` : null);
    // ORDER 275/277 — baspaketet varje morgon, som den rimliga spelaren:
    // listan fylls med paketet och köps.
    // ORDER 280 — M1: baspaketet och öppna dörrarna.
    // ORDER 285 — gårdagens rester: kortet besvaras (första alternativet)
    // och utfallet noteras; första gången på bild.
    if (await page.$('[data-testid=salvage-option-a]:not([disabled])')) {
      report.salvage = report.salvage ?? [];
      const title = await page.textContent('[data-testid=salvage-card]').catch(() => null);
      if (report.salvage.length === 0) await shot('dod-44-rester-fragan.png', 'morgonen: gårdagens rester och frågan om tillvaratagande');
      await page.click('[data-testid=salvage-option-a]');
      await delay(500);
      const resolved = await page.getAttribute('[data-testid=salvage-card]', 'data-resolved').catch(() => null);
      if (report.salvage.length === 0) await shot('dod-45-rester-svaret.png', 'morgonen: svaret och förklaringen');
      report.salvage.push({ title: title?.slice(0, 160), resolved });
      await page.click('[data-testid=salvage-close]').catch(() => {});
    }
    const openBuy = await page.$('[data-testid=open-buy]');
    if (openBuy) {
      await openBuy.click().catch(() => {});
      await page.waitForSelector('[data-testid=screen-M1]').catch(() => {});
      await page.click('[data-testid=buy-base]').catch(() => {});
      await delay(400);
      await page.click('[data-testid=open-doors]');
    } else {
      await page.click('[data-testid=start-service]');
    }
    let shotsTaken = 0;
    const openedAt = Date.now();
    const until = Date.now() + 15 * 60000;
    while (Date.now() < until) {
      // ORDER 287a — en kväll som faller ihop går direkt till R1 (ingen sopbil);
      // skriptet väntade förut bara på S1 och kvällen tog slut av sig själv.
      if (await page.$('[data-testid=evening-bar], [data-testid=screen-S1], [data-testid=screen-T2], [data-testid=screen-R1], [data-testid=screen-J1], [data-testid=screen-L1]')) break;
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
    // ORDER 289 — kvällens skärmar i tur och ordning, en i taget; varje kväll
    // noteras vilka som visades, och R1 krävs (report.eveningSequences).
    const seq = [];
    for (let i = 0; i < 40 && !(await page.$('[data-testid=day-action-bar]')); i++) {
      let screen = null;
      // Sopbilen känns igen på sin knapp (morgonens schema har också testid screen-S1).
      if (await page.$('[data-testid=waste-continue]')) screen = 'S1';
      else for (const sc of ['T2', 'R1', 'J1', 'L1', 'K1']) if (await page.$(`[data-testid=screen-${sc}]`)) { screen = sc; break; }
      if (screen && seq[seq.length - 1] !== screen) seq.push(screen);
      await delay(900);
      if (screen === 'S1') await page.click('[data-testid=waste-continue]').catch(() => {});
      else if (screen === 'T2') {
        // ORDER 290 — överföringen: knappen flyttar kvällskassan, sedan vidare.
        if (await page.$('[data-testid=transfer-do]')) { await page.click('[data-testid=transfer-do]').catch(() => {}); await delay(1500); }
        await page.click('[data-testid=transfer-continue]').catch(() => {});
      }
      else if (screen === 'R1') {
        // ORDER 287a — kvällens gäster; en bild första gången miljardären eller
        // gästen med socialt kapital syns.
        const g = await recordGuests(`kväll ${eveningNo + 1}`);
        if ((g.billionaire || g.social) && !report.guestShot) {
          report.guestShot = true;
          await page.$eval('[data-testid=result-guests]', (e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
          await delay(400);
          await shot('dod-47-R1-gasterna.png', 'R1: vilka som kom och vad de betydde');
        }
        await page.click('[data-testid=result-continue]').catch(() => {});
      }
      else if (screen === 'J1') await page.click('[data-testid=compare-continue]').catch(() => {});
      else if (screen === 'L1') await page.click('[data-testid=to-evening-story]').catch(() => {});
      else if (screen === 'K1') await page.click('[data-testid=end-evening]').catch(() => {});
      await delay(400);
    }
    report.eveningSequences = report.eveningSequences ?? [];
    report.eveningSequences.push(seq.join(' → '));
    if (!seq.includes('R1')) throw new Error(`kvällens resultat visades inte: ${seq.join(' → ')}`);
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  }
  for (let d = 0; d < 5; d++) { await playEvening(d === 4); step(`morgon ${d + 3}`); }
  await page.waitForSelector('[data-testid=screen-T1]', { timeout: 60000 });
  await delay(600); await shot('dod-10-T1-sondagstidningen.png', 'T1 söndagstidningen');
  // ORDER 280 — hyran och veckans löner i tidningen.
  report.newspaper = await page.textContent('[data-testid=screen-T1]').catch(() => null);
  // ORDER 287a — Sett på stan och veckans gäster.
  report.newspaperSeen = await page.textContent('[data-testid=newspaper-seen]').catch(() => null);
  report.newspaperMarket = await page.textContent('[data-testid=newspaper-market]').catch(() => null);
  // ORDER 288 — tidningens rankning av byns krogar.
  report.newspaperRanking = await page.$$eval('[data-testid=newspaper-ranking-list] li', (els) => els.map((e) => e.textContent)).catch(() => null);
  report.newspaperRankingText = await page.textContent('[data-testid=newspaper-ranking]').catch(() => null);
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
