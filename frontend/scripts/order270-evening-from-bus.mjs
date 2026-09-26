#!/usr/bin/env node
// ORDER 270 — en vinbarskväll med händelser, i spelarens vy.
//
// Vision Owner 2026-09-26: "Stanna när en vinbarskväll med händelser går
// att spela, så att jag kan pröva den."
//
// Produktionsbygget (vite build + preview på port 4174), start på `/` utan
// flaggor, bara spelarens knappar och tangenter, samma väg som etapp 5:s
// vecka från bussen (order267-week-from-bus.mjs) fram till att vinbaren har
// ett namn. Därefter måndagens kväll i 2×:
//   - första händelsen: ett fel svar (så att kvällens lärdom har något),
//   - andra händelsen: inget svar; personalen beslutar själv efter 20 s,
//   - övriga: det bästa svaret.
// Svarens kvalitet läses ur händelsebanken (samma JSON som spelet läser).
// Per händelse skrivs rubrik, fas, svar, raden i rummet och mätarna före och
// efter. Kvällen avslutas med kvällens lärdom.
// Utdata: reports/order270/evening-from-bus.json + skärmdumpar e01–e..

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order270');
mkdirSync(OUT, { recursive: true });
const PORT = 4174;
const URL = `http://localhost:${PORT}`;

const Q = resolve(FRONTEND, 'src/strategic/content/questions');
const meta = JSON.parse(readFileSync(resolve(Q, 'bank.meta.json'), 'utf8')).questions;
const correctByPrompt = new Map();
for (const file of ['bank.text.en.json', 'bank.text.sv.draft.json']) {
  const texts = JSON.parse(readFileSync(resolve(Q, file), 'utf8')).texts;
  for (const m of meta) if (texts[m.id]) correctByPrompt.set(texts[m.id].prompt.trim(), m.correctIndex);
}
// Händelsebanken: svarens kvalitet per händelse.
const incidentMeta = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8')).incidents;
const incidentById = new Map(incidentMeta.map((i) => [i.id, i]));

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
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => {
  if (errors.length === 0) console.log(`FÖRSTA FELET efter steget "${report.steps.at(-1)?.name ?? 'start'}":\n${(e.stack ?? e.message).slice(0, 2500)}`);
  errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 800)}`);
  // DEBUG_STOP=1: stanna vid första felet (felsökning med omminifierat bygge).
  if (process.env.DEBUG_STOP === '1') process.exit(1);
});
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', steps: [], incidents: [], errors };
const t0 = Date.now();
const step = (name, extra = {}) => {
  const entry = { name, atSeconds: Math.round((Date.now() - t0) / 1000), ...extra };
  report.steps.push(entry);
  console.log(`${entry.atSeconds}s ${name}`);
};
const shot = (file) => page.screenshot({ path: resolve(OUT, file) });

async function answerCurrent(wantCorrect) {
  const prompt = await page.textContent('[data-testid=question-prompt]');
  const text = prompt.slice(prompt.indexOf(':') + 1).trim();
  const correct = correctByPrompt.get(text);
  if (correct === undefined) throw new Error(`okänd fråga: ${text}`);
  await page.click(`[data-testid=option-${wantCorrect ? correct : (correct + 1) % 4}]`);
  await page.waitForSelector('[data-testid=explanation]');
  await page.click('[data-testid=next-question]');
}

async function visit(kind, pavilion, questions, resultShot) {
  await page.click('[data-testid=open-house]');
  await page.click(`[data-testid=${kind}-${pavilion}]`);
  for (let i = 0; i < questions; i++) await answerCurrent(true);
  await page.waitForSelector('[data-testid=visit-result]');
  const result = await page.textContent('[data-testid=visit-result]');
  if (resultShot) await shot(resultShot);
  await page.click('[data-testid=close-visit]');
  if (await page.$('[data-testid=close-house]')) await page.click('[data-testid=close-house]');
  return result;
}

// Håll en tangent tills HUD:en visar en uppmaning (eller tiden tar slut).
async function walkUntilPrompt(key, prompt, maxMs) {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    const hud = await page.$eval('.hud-context', (e) => e.textContent).catch(() => '');
    if (hud && hud.includes(prompt)) return true;
    await page.keyboard.down(key);
    await delay(120);
    await page.keyboard.up(key);
  }
  return false;
}

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await shot('e01-startrutan.png');
  await page.click('[data-testid=new-game]');
  const tNewGame = Date.now();
  step('nytt spel');

  // Titeln och bussen går av sig själva.
  await page.waitForSelector('.bus-stage', { timeout: 30000 });
  await delay(4000);
  await shot('e02-bussen.png');
  await page.waitForSelector('.hud', { timeout: 60000 });
  await delay(2000);
  await shot('e03-framme.png');
  step('bussen framme');

  if (!(await walkUntilPrompt('w', 'Prata', 20000))) throw new Error('kom inte fram till den andra sökande');
  await page.keyboard.press('e');
  await page.waitForSelector('.dialogue-panel .choice');
  await page.$eval('.dialogue-panel .choice', (b) => b.click());
  await page.waitForSelector('.dialogue-actions .btn');
  await shot('e04-samtalet.png');
  // Dialogen ritas om medan den visas; Playwrights träffprov landar då på
  // panelen. Samma klick som spelarens, direkt på knappen.
  await page.$eval('.dialogue-actions .btn', (b) => b.click());
  await page.waitForSelector('.dialogue-panel', { state: 'detached', timeout: 10000 });
  step('samtalet');

  if (!(await walkUntilPrompt('w', 'Registrera', 30000))) {
    await shot('e-fel-registreringen.png');
    throw new Error('kom inte fram till registreringen');
  }
  await page.keyboard.press('e');
  await page.waitForSelector('.end-stage', { timeout: 10000 });
  await shot('e05-registreringen.png');
  step('registreringen');
  await page.$eval('.end-buttons .btn.primary', (b) => b.click());

  // Introduktionen i strategiska spelet.
  await page.waitForSelector('[data-testid=mentor][data-step=practice]', { timeout: 120000 });
  await delay(3000);
  await shot('e06-mentorn-ova.png');
  report.mentor = { practice: await page.textContent('[data-testid=mentor]') };
  report.practice = await visit('practice', 'stensota', 5);
  step('övningsbesöket');
  await page.waitForSelector('[data-testid=mentor][data-step=exam]');
  report.mentor.exam = await page.textContent('[data-testid=mentor]');
  report.exam = await visit('exam', 'stensota', 8, 'e07-brons.png');
  step('provet');
  await page.waitForSelector('[data-testid=mentor][data-step=bank]');
  report.mentor.bank = await page.textContent('[data-testid=mentor]');
  await page.click('[data-testid=open-bank]');
  await page.waitForSelector('[data-testid=bank-dialog]');
  report.bank = await page.textContent('[data-testid=bank-dialog]');
  await shot('e08-banken.png');
  await page.click('[data-testid=choose-vinbar]');
  step('banken');

  await page.waitForSelector('input[type=text]', { timeout: 30000 });
  report.nameBody = await page.textContent('.business-name-card p');
  await page.fill('input[type=text]', 'Vinbaren vid torget');
  await shot('e09-namnet.png');
  await page.click('button[type=submit]');
  report.minutesToBusiness = Math.round(((Date.now() - tNewGame) / 60000) * 10) / 10;
  step('verksamheten har ett namn', { minutesFromNewGame: report.minutesToBusiness });
  await page.waitForSelector('[data-testid=mentor][data-step=farewell]', { timeout: 30000 });
  await delay(4000);
  await shot('e10-mentorns-avsked.png');
  report.mentor.farewell = await page.textContent('[data-testid=mentor]');
  await page.click('[data-testid=mentor-close]');

  // Måndagens kväll i 2×.
  await page.click('button[title="Simulering 2× hastighet"]');
  report.morning = (await page.textContent('[data-testid=day-action-bar]')).slice(0, 120);
  await page.click('[data-testid=start-service]');
  step('öppnat för kvällen');
  const meters = async () => ({
    cash: await page.getAttribute('[data-testid=meter-cash]', 'data-value').catch(() => null),
    satisfaction: await page.getAttribute('[data-testid=meter-satisfaction]', 'data-value').catch(() => null),
    stamina: await page.getAttribute('[data-testid=meter-stamina]', 'data-value').catch(() => null)
  });
  let n = 0;
  while (!(await page.$('[data-testid=evening-bar]'))) {
    const card = await page.$('[data-testid=incident-card]');
    if (!card) { await delay(300); continue; }
    n += 1;
    const id = await card.getAttribute('data-incident-id');
    const m = incidentById.get(id);
    const entry = {
      n, id, pavilion: m?.pavilion, arc: m?.arc,
      text: (await card.textContent()).slice(0, 600),
      countdownAtOpen: await page.textContent('[data-testid=incident-countdown]'),
      struck: await page.$$eval('[data-struck=true]', (els) => els.map((e) => e.getAttribute('data-option-id'))),
      metersBefore: await meters()
    };
    await shot(`e11-handelse-${n}.png`);
    if (n === 2) {
      // Inget svar: nedräkningen går ut och personalen beslutar själv.
      entry.answer = null;
      const t = Date.now();
      await page.waitForSelector('[data-testid=incident-card]', { state: 'detached', timeout: 60000 });
      entry.secondsUntilStaffDecided = Math.round((Date.now() - t) / 100) / 10;
    } else {
      const want = n === 1 ? 'wrong' : 'best';
      const option = m.options.find((o) => o.quality === want && !entry.struck.includes(o.id));
      entry.answer = { id: option.id, quality: option.quality };
      await page.click(`[data-testid=incident-option-${option.id}]`);
      await page.waitForSelector('[data-testid=incident-card]', { state: 'detached', timeout: 10000 });
    }
    await delay(600);
    entry.roomLine = await page.textContent('.incident-outcome').catch(() => null);
    entry.metersAfter = await meters();
    await shot(`e12-utfall-${n}.png`);
    report.incidents.push(entry);
    step(`händelse ${n}: ${id}`);
  }
  await page.waitForSelector('[data-testid=evening-lesson]', { timeout: 10000 });
  report.lesson = await page.textContent('[data-testid=evening-lesson]');
  report.lessonItems = Number(await page.getAttribute('[data-testid=evening-lesson]', 'data-items'));
  report.eveningStory = await page.textContent('[data-testid=evening-story]').catch(() => null);
  await shot('e13-kvallens-lardom.png');
  step('kvällens lärdom');
  report.actionButtonGone = (await page.$('[data-testid=action-button]')) === null;
  await page.click('[data-testid=end-evening]');
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  await shot('e14-tisdag-morgon.png');
  step('tisdag morgon');
} finally {
  writeFileSync(resolve(OUT, 'evening-from-bus.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ minutesToBusiness: report.minutesToBusiness, incidents: report.incidents.map((i) => `${i.arc} ${i.id} ${i.answer?.quality ?? 'personalen'}`), lessonItems: report.lessonItems, errors }, null, 2));
