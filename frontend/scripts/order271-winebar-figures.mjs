#!/usr/bin/env node
// ORDER 271 — vinbaren med figurerna, i spelarens vy (Designs paket 1 och 6).
//
// Produktionsbygget, start på `/` utan flaggor, samma väg som
// order270-evening-from-bus.mjs fram till att vinbaren har ett namn. Sedan
// måndagens kväll i 2×: skärmdumpar av vinbaren från spelarens kamera före
// servicen, och av kvällen med figurerna i rörelse vid två tidpunkter, en
// med kameran vriden (q) och, om en raket kommer, ringen på golvet.
// Utdata: reports/order271/winebar-figures.json + w01–w..png.
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
const OUT = resolve(FRONTEND, 'reports', 'order271');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4174);
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
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', steps: [], shots: [], errors };
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
  // ORDER 308 — öppningen före första morgonen hoppas över (knappen syns efter 3 s).
  await page.waitForSelector('[data-testid=opening-skip]', { timeout: 120000 }).then(() => page.click('[data-testid=opening-skip]')).catch(() => {});
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

  await page.click('[data-testid=mentor-close]').catch(() => {});
  await delay(3000);
  const w = async (file, what) => { await shot(file); report.shots.push({ file, what, atSeconds: Math.round((Date.now() - t0) / 1000) }); };
  await w('w01-vinbaren-spelarens-kamera.png', 'vinbaren före servicen, spelarens kamera efter namnet');
  await page.click('button[title="Simulering 2× hastighet"]');
  await page.click('[data-testid=start-service]');
  step('öppnat för kvällen');
  await delay(25000);
  await w('w02-kvallen-tidigt.png', 'kvällen, 25 s efter öppning (2×)');
  await delay(20000);
  await w('w03-kvallen-senare.png', 'kvällen, 45 s efter öppning (2×)');
  // Kameran vriden: väggarna på kamerasidan kapas (updateCutaway).
  await page.focus('canvas').catch(() => {});
  await page.keyboard.press('q');
  await delay(2500);
  await w('w04-kvallen-vriden.png', 'kvällen, kameran vriden ett steg (q)');
  await page.keyboard.press('e');
  // Vänta på en raket och fånga ringen.
  const card = await page.waitForSelector('[data-testid=incident-card]', { timeout: 240000 }).catch(() => null);
  if (card) {
    await delay(3000);
    await w('w05-raket-ringen.png', 'raketkortet öppet, ringen vid sällskapet');
    step('raket öppen');
  }
} finally {
  writeFileSync(resolve(OUT, 'winebar-figures.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ shots: report.shots, errors }, null, 2));
