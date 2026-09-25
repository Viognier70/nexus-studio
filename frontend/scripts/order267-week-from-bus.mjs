#!/usr/bin/env node
// ORDER 267 (Nexus v1 etapp 5) — DoD: "en hel vecka kan spelas från bussen
// till söndagstidningen i spelarens vy, utan dev-flaggor."
//
// Produktionsbygget (vite build + preview på port 4174), start på `/` utan
// flaggor, bara spelarens knappar och tangenter:
//   startrutan → Nytt spel → titeln och bussen (VS001) → gå fram till den
//   andra sökande (W), prata (E), välj en replik → gå till registreringen
//   (A, W), registrera (E) → Fortsätt → mentorn: öva i Stensöta, provet i
//   Stensöta, banken → Öppna en vinbar → namnet → mentorns avsked →
//   måndag–lördag: Öppna för kvällen, hoppa över quizen, Till nästa
//   morgon → söndag: söndagstidningen.
// Tiden från "Nytt spel" till att verksamheten har ett namn mäts
// (speldesignen: en ny spelare står i sin verksamhet inom 20 minuter).
// Utdata: reports/order267/week-from-bus.json + skärmdumpar.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports/order267');
mkdirSync(OUT, { recursive: true });
const PORT = 4174;
const URL = `http://localhost:${PORT}`;

// Rätt svar per frågetext, på båda språken (spelet visar svenska där
// översättningen finns).
const Q = resolve(FRONTEND, 'src/strategic/content/questions');
const meta = JSON.parse(readFileSync(resolve(Q, 'bank.meta.json'), 'utf8')).questions;
const correctByPrompt = new Map();
for (const file of ['bank.text.en.json', 'bank.text.sv.draft.json']) {
  const texts = JSON.parse(readFileSync(resolve(Q, file), 'utf8')).texts;
  for (const m of meta) if (texts[m.id]) correctByPrompt.set(texts[m.id].prompt.trim(), m.correctIndex);
}

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
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 800)}`));
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', steps: [], days: [], errors };
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
    await delay(250);
    await page.keyboard.up(key);
  }
  return false;
}

async function finishEvening() {
  await page.waitForSelector('[data-testid=evening-bar]', { timeout: 400000 });
  await page.waitForSelector('[data-testid=evening-story]', { timeout: 10000 }).catch(() => {});
  const story = await page.textContent('[data-testid=evening-story]').catch(() => null);
  if (await page.$('[data-testid=skip-quiz]')) await page.click('[data-testid=skip-quiz]');
  await page.click('[data-testid=end-evening]');
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  return story;
}

// Ett scenario som väntar på spelaren stoppar ankomsterna; spelaren svarar.
async function answerScenariosUntilEvening() {
  while (!(await page.$('[data-testid=evening-bar]'))) {
    const b = await page.$('[data-testid=scenario-overlay] button');
    if (b) await b.dispatchEvent('click').catch(() => {});
    await delay(1500);
  }
}

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await shot('w01-startrutan.png');
  await page.click('[data-testid=new-game]');
  const tNewGame = Date.now();
  step('nytt spel');

  // Titeln och bussen går av sig själva.
  await page.waitForSelector('.bus-stage', { timeout: 30000 });
  await delay(4000);
  await shot('w02-bussen.png');
  await page.waitForSelector('.hud', { timeout: 60000 });
  await delay(2000);
  await shot('w03-framme.png');
  step('bussen framme');

  if (!(await walkUntilPrompt('w', 'Prata', 20000))) throw new Error('kom inte fram till den andra sökande');
  await page.keyboard.press('e');
  await page.waitForSelector('.dialogue-panel .choice');
  await page.click('.dialogue-panel .choice');
  await page.waitForSelector('.dialogue-actions .btn');
  await shot('w04-samtalet.png');
  await page.click('.dialogue-actions .btn');
  step('samtalet');

  await page.keyboard.down('a');
  await delay(900);
  await page.keyboard.up('a');
  if (!(await walkUntilPrompt('w', 'Registrera', 30000))) throw new Error('kom inte fram till registreringen');
  await page.keyboard.press('e');
  await page.waitForSelector('.end-stage', { timeout: 10000 });
  await shot('w05-registreringen.png');
  step('registreringen');
  await page.click('.end-buttons .btn.primary');

  // Introduktionen i strategiska spelet.
  await page.waitForSelector('[data-testid=mentor][data-step=practice]', { timeout: 120000 });
  await delay(3000);
  await shot('w06-mentorn-ova.png');
  report.mentor = { practice: await page.textContent('[data-testid=mentor]') };
  report.practice = await visit('practice', 'stensota', 5);
  step('övningsbesöket');
  await page.waitForSelector('[data-testid=mentor][data-step=exam]');
  report.mentor.exam = await page.textContent('[data-testid=mentor]');
  report.exam = await visit('exam', 'stensota', 8, 'w07-brons.png');
  step('provet');
  await page.waitForSelector('[data-testid=mentor][data-step=bank]');
  report.mentor.bank = await page.textContent('[data-testid=mentor]');
  await page.click('[data-testid=open-bank]');
  await page.waitForSelector('[data-testid=bank-dialog]');
  report.bank = await page.textContent('[data-testid=bank-dialog]');
  await shot('w08-banken.png');
  await page.click('[data-testid=choose-vinbar]');
  step('banken');

  await page.waitForSelector('input[type=text]', { timeout: 30000 });
  report.nameBody = await page.textContent('.business-name-card p');
  await page.fill('input[type=text]', 'Vinbaren vid torget');
  await shot('w09-namnet.png');
  await page.click('button[type=submit]');
  report.minutesToBusiness = Math.round(((Date.now() - tNewGame) / 60000) * 10) / 10;
  step('verksamheten har ett namn', { minutesFromNewGame: report.minutesToBusiness });
  await page.waitForSelector('[data-testid=mentor][data-step=farewell]', { timeout: 30000 });
  await delay(4000);
  await shot('w10-mentorns-avsked.png');
  report.mentor.farewell = await page.textContent('[data-testid=mentor]');
  await page.click('[data-testid=mentor-close]');

  // Måndag–lördag.
  await page.click('button[title="Simulering 4× hastighet"]');
  for (let d = 0; d < 6; d++) {
    const bar = await page.textContent('[data-testid=day-action-bar]');
    await page.click('[data-testid=start-service]');
    if (d === 0) {
      await delay(20000);
      await shot('w11-forsta-kvallen.png');
    }
    await answerScenariosUntilEvening();
    const story = await finishEvening();
    report.days.push({ morning: bar.slice(0, 80), evening: story });
    step(`dag ${d + 1}`);
  }

  // Söndag: tidningen öppnas av sig själv.
  await page.waitForSelector('[data-testid=newspaper]', { timeout: 60000 });
  report.newspaper = await page.textContent('[data-testid=newspaper]');
  await shot('w12-sondagstidningen.png');
  step('söndagstidningen');
  await page.click('[data-testid=close-newspaper]');
  await shot('w13-sondag-morgon.png');
} finally {
  writeFileSync(resolve(OUT, 'week-from-bus.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ minutesToBusiness: report.minutesToBusiness, newspaper: report.newspaper?.slice(0, 400), errors }, null, 2));
