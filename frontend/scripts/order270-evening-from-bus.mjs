#!/usr/bin/env node
// ORDER 270 — en vinbarskväll med händelser, i spelarens vy.
//
// Vision Owner 2026-09-26: "Stanna när en vinbarskväll med händelser går
// att spela, så att jag kan pröva den."
//
// Produktionsbygget (vite build + preview på port 4174), start på `/` utan
// flaggor, bara spelarens knappar och tangenter, samma väg som etapp 5:s
// vecka från bussen (order267-week-from-bus.mjs) fram till att vinbaren har
// ett namn. Därefter måndagens kväll i 2×. Varje händelse är en raket i
// tre steg (Vision Owner 2026-09-27):
//   - första raketen: bästa svaret på episteme, ett fel på techne (så att
//     kvällens lärdom har något),
//   - andra raketen: bästa svaret på episteme, inget svar på techne;
//     personalen tar över när stegets nedräkning går ut,
//   - övriga: det bästa svaret i alla tre stegen.
// Svarens kvalitet läses ur händelsebanken (samma JSON som spelet läser).
// Per raket skrivs rubrik, fas, stegen med fråga, nedräkning och svar,
// raden i rummet och mätarna före och efter. Kvällen avslutas med kvällens
// lärdom.
// Utdata: reports/order270/evening-from-bus.json + skärmdumpar e01–e..
//
// ORDER 300b — startar nu i den nya starten (startskärmen → Nytt spel →
// namn och samtycke → regelkortet → första morgonen); bussen är borttagen.

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
// Händelsebanken: svarens kvalitet per raket och steg.
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
// Provspel 2026-09-27: "inga engelska paneler". All synlig text i varje fas
// sparas, så att engelsk text kan hittas (report.visibleText).
const visibleText = async (phase) => {
  report.visibleText ??= {};
  report.visibleText[phase] = await page.evaluate(() => document.body.innerText);
};

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


try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await shot('e01-startrutan.png');
  await page.click('[data-testid=new-game]');
  const tNewGame = Date.now();
  step('nytt spel');
  // ORDER 300b — den nya starten (ORDER 300 §4): startskärmen → Nytt spel →
  // namn och samtycke → regelkortet → första morgonen med mentorn. Bussen
  // (VS001) finns inte längre i starten.
  await page.waitForSelector('[data-testid=register-screen]', { timeout: 30000 });
  await page.fill('[data-testid=register-name]', 'Anders');
  await page.click('[data-testid=register-research-no]');
  await page.click('[data-testid=register-sign]');
  await page.waitForSelector('[data-testid=rules-card]', { timeout: 60000 });
  await page.click('[data-testid=rules-close]');
  step('namn och samtycke');

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

  await visibleText('morgon');
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
  // Vänta tills kortet har gått vidare från steget, eller stängts.
  const leftStep = async (step) => {
    await page.waitForFunction((st) => {
      const c = document.querySelector('[data-testid=incident-card]');
      return !c || c.getAttribute('data-step') !== String(st);
    }, step, { timeout: 60000 });
  };
  while (!(await page.$('[data-testid=evening-bar]'))) {
    const card = await page.$('[data-testid=incident-card]');
    if (!card) { await delay(300); continue; }
    n += 1;
    const id = await card.getAttribute('data-incident-id');
    const m = incidentById.get(id);
    const entry = {
      n, id, track: m?.track, arc: m?.arc,
      text: (await card.textContent()).slice(0, 600),
      steps: [],
      metersBefore: await meters()
    };
    if (n === 1) await visibleText('service');
    for (let step = 0; step < 3; step++) {
      const c = await page.$('[data-testid=incident-card]');
      if (!c || (await c.getAttribute('data-incident-id')) !== id || Number(await c.getAttribute('data-step')) !== step) break;
      const s = {
        step,
        axis: await c.getAttribute('data-step-axis'),
        question: await page.textContent('[data-testid=incident-question]'),
        countdownAtOpen: await page.textContent('[data-testid=incident-countdown]'),
        struck: await page.$$eval('[data-struck=true]', (els) => els.map((e) => e.getAttribute('data-option-id')))
      };
      await shot(`e11-raket-${n}-steg-${step + 1}.png`);
      // Raket 1: bästa svaret på episteme, fel på techne (kvällens lärdom
      // får något). Raket 2: bästa på episteme, inget svar på techne
      // (personalen tar över). Övriga: bästa svaret i alla tre stegen.
      const plan = step === 1 && n === 1 ? 'wrong' : step === 1 && n === 2 ? null : 'best';
      if (plan === null) {
        s.answer = null;
        const t = Date.now();
        await leftStep(step);
        s.secondsUntilStaffDecided = Math.round((Date.now() - t) / 100) / 10;
      } else {
        const option = m.steps[step].options.find((o) => o.quality === plan && !s.struck.includes(o.id));
        s.answer = { id: option.id, quality: option.quality };
        await page.click(`[data-testid=incident-option-${option.id}]`);
        await leftStep(step);
      }
      entry.steps.push(s);
    }
    await page.waitForSelector('[data-testid=incident-card]', { state: 'detached', timeout: 60000 });
    await delay(600);
    entry.roomLine = await page.textContent('.incident-outcome').catch(() => null);
    entry.metersAfter = await meters();
    await shot(`e12-utfall-${n}.png`);
    report.incidents.push(entry);
    step(`raket ${n}: ${id}`);
  }
  await page.waitForSelector('[data-testid=evening-lesson]', { timeout: 10000 });
  report.lesson = await page.textContent('[data-testid=evening-lesson]');
  report.lessonItems = Number(await page.getAttribute('[data-testid=evening-lesson]', 'data-items'));
  report.eveningStory = await page.textContent('[data-testid=evening-story]').catch(() => null);
  await shot('e13-kvallens-lardom.png');
  await visibleText('kvall');
  step('kvällens lärdom');
  report.actionButtonGone = (await page.$('[data-testid=action-button]')) === null;
  await page.click('[data-testid=end-evening]');
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  await shot('e14-tisdag-morgon.png');
  await visibleText('tisdag-morgon');
  step('tisdag morgon');
} finally {
  writeFileSync(resolve(OUT, 'evening-from-bus.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ minutesToBusiness: report.minutesToBusiness, incidents: report.incidents.map((i) => `${i.arc} ${i.id} ${i.steps.map((x) => `${x.axis}:${x.answer?.quality ?? 'personalen'}`).join(' ')}`), lessonItems: report.lessonItems, errors }, null, 2));
