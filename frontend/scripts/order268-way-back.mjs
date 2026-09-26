#!/usr/bin/env node
// ORDER 268 — DoD: vägen tillbaka efter nedgradering "går att se i
// spelarens vy".
//
// Produktionsbygget (vite build + preview på port 4175), start på `/` utan
// flaggor. Utgångsläget är veckoharnessens scenario "nedgradering-och-
// tillbaka" på lördagsmorgonen vecka 1 (ingen kassa, inga medaljer, tre
// dagsavslut under noll i rad): sparfilen reports/order268/save-lordag-
// vecka1.json, skriven av order268WayBack.test.ts med WRITE_REPORTS=1.
//
// AVVIKELSE (CLAUDE.md, DoD: flöde som spelaren inte når): sparfilen läggs
// på sparplats 1 i webbläsarens localStorage innan sidan laddas. En
// spelare når samma läge genom att spela en vecka utan kassa, men ett nytt
// spel börjar med 120 000 kr och når inte en nedgradering på en vecka.
// Allt efter laddningen görs med spelarens knappar: startrutan →
// Fortsätt ett sparat spel → Ladda plats 1 → lördagens kväll → söndags-
// tidningen (vinbaren blir food truck) → proven i Stensöta, Metodköket och
// Kalastorget → banken → måndag–lördag i food trucken → söndagstidningen →
// banken → Öppna en vinbar → vinbarens rum.
// Utdata: reports/order268/way-back.json + skärmdumparna b01–b12.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports/order268');
mkdirSync(OUT, { recursive: true });
const PORT = 4175;
const URL = `http://localhost:${PORT}`;
const SAVE = readFileSync(resolve(OUT, 'save-lordag-vecka1.json'), 'utf8').trim();
// Samma nyckel som src/sim/save.ts slotKey(1).
const SLOT_KEY = 'nexus.v1.slot1';

// Rätt svar per frågetext, på båda språken (samma som order267-skriptet).
const Q = resolve(FRONTEND, 'src/strategic/content/questions');
const meta = JSON.parse(readFileSync(resolve(Q, 'bank.meta.json'), 'utf8')).questions;
const correctByPrompt = new Map();
for (const file of ['bank.text.en.json', 'bank.text.sv.draft.json']) {
  const texts = JSON.parse(readFileSync(resolve(Q, file), 'utf8')).texts;
  for (const m of meta) if (texts[m.id]) correctByPrompt.set(texts[m.id].prompt.trim(), m.correctIndex);
}

// ORDER 268 — spelaren svarar som harnessens spelare (weekHarness.ts
// answerScenario): valen rangordnas efter `capitalSign` i
// src/strategic/simulation/scenarios.ts (samma fil simuleringen läser;
// replikerad här eftersom .mjs inte kan importera TypeScript). Före
// nedgraderingen spelar hon svagt (sämsta svaret), sedan rimligt (bästa).
const SCENARIO_SRC = readFileSync(resolve(FRONTEND, 'src/strategic/simulation/scenarios.ts'), 'utf8');
const choiceGroups = [];
{
  const re = /label: '((?:[^'\\]|\\.)*)'[\s\S]*?capitalSign: (-?[\d.]+)/g;
  const all = [...SCENARIO_SRC.matchAll(re)].map((m) => ({ label: m[1].replace(/\\'/g, "'"), sign: Number(m[2]) }));
  for (let i = 0; i + 2 < all.length; i += 3) choiceGroups.push(all.slice(i, i + 3));
}
let answerMode = 'worst';
function rankedLabel(labels) {
  const group = choiceGroups.find((g) => g.every((c) => labels.includes(c.label)));
  if (!group) return null;
  return group.reduce((pick, c) => (answerMode === 'best' ? c.sign > pick.sign : c.sign < pick.sign) ? c : pick).label;
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
// Sparfilen läggs på plats 1 en gång, före första laddningen.
await ctx.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('order268-seeded')) {
    localStorage.setItem(key, value);
    sessionStorage.setItem('order268-seeded', '1');
  }
}, [SLOT_KEY, SAVE]);
const page = await ctx.newPage();
const errors = [];
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', start: 'reports/order268/save-lordag-vecka1.json på sparplats 1', steps: [], days: [], errors };
page.on('pageerror', (e) => {
  if (errors.length === 0) console.log(`FÖRSTA FELET efter steget "${report.steps.at(-1)?.name ?? 'start'}":\n${(e.stack ?? e.message).slice(0, 2500)}`);
  errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 800)}`);
});
const t0 = Date.now();
const step = (name, extra = {}) => {
  const entry = { name, atSeconds: Math.round((Date.now() - t0) / 1000), ...extra };
  report.steps.push(entry);
  console.log(`${entry.atSeconds}s ${name}`);
};
const shot = (file) => page.screenshot({ path: resolve(OUT, file) });
const text = (sel) => page.textContent(sel).catch(() => null);

async function answerCurrent() {
  const prompt = await page.textContent('[data-testid=question-prompt]');
  const t = prompt.slice(prompt.indexOf(':') + 1).trim();
  const correct = correctByPrompt.get(t);
  if (correct === undefined) throw new Error(`okänd fråga: ${t}`);
  await page.click(`[data-testid=option-${correct}]`);
  await page.waitForSelector('[data-testid=explanation]');
  await page.click('[data-testid=next-question]');
}

async function exam(pavilion, resultShot) {
  await page.click('[data-testid=open-house]');
  await page.click(`[data-testid=exam-${pavilion}]`);
  for (let i = 0; i < 8; i++) await answerCurrent();
  await page.waitForSelector('[data-testid=visit-result]');
  const result = await page.textContent('[data-testid=visit-result]');
  if (resultShot) await shot(resultShot);
  await page.click('[data-testid=close-visit]');
  if (await page.$('[data-testid=close-house]')) await page.click('[data-testid=close-house]');
  return result;
}

async function openBank(file) {
  await page.click('[data-testid=open-bank]');
  await page.waitForSelector('[data-testid=bank-dialog]');
  const body = await page.textContent('[data-testid=bank-dialog]');
  if (file) await shot(file);
  return body;
}

async function answerScenariosUntilEvening() {
  report.scenarioAnswers ??= [];
  while (!(await page.$('[data-testid=evening-bar]'))) {
    const buttons = await page.$$('[data-testid=scenario-overlay] button');
    if (buttons.length > 0) {
      const labels = await Promise.all(buttons.map((b) => b.textContent()));
      const body = (await text('[data-testid=scenario-overlay]')) ?? '';
      let index = 0;
      const ranked = rankedLabel(labels.map((l) => l.trim()));
      if (ranked) {
        index = labels.findIndex((l) => l.trim() === ranked);
        report.scenarioAnswers.push({ mode: answerMode, choice: ranked });
      } else if (buttons.length > 1) {
        // En fråga ur banken: rätt svar för den rimliga, fel för den svaga.
        const prompt = [...correctByPrompt.keys()].find((p) => body.includes(p));
        if (prompt !== undefined) {
          const correct = correctByPrompt.get(prompt);
          index = answerMode === 'best' ? correct : (correct + 1) % buttons.length;
        }
      }
      await buttons[Math.max(0, index)].dispatchEvent('click').catch(() => {});
    }
    await delay(1500);
  }
}

async function finishEvening() {
  await page.waitForSelector('[data-testid=evening-bar]', { timeout: 400000 });
  await page.waitForSelector('[data-testid=evening-story]', { timeout: 10000 }).catch(() => {});
  const story = await text('[data-testid=evening-story]');
  if (await page.$('[data-testid=skip-quiz]')) await page.click('[data-testid=skip-quiz]');
  await page.click('[data-testid=end-evening]');
  await page.waitForSelector('[data-testid=day-action-bar], [data-testid=newspaper]', { timeout: 120000 });
  return story;
}

// En servicedag: öppna för kvällen (eller stäng dagen om det inte går).
async function playDay(serviceShot) {
  const bar = await text('[data-testid=day-action-bar]');
  if (await page.$('[data-testid=start-service]')) {
    await page.click('[data-testid=start-service]');
    if (serviceShot) {
      await delay(15000);
      await shot(serviceShot);
    }
    await answerScenariosUntilEvening();
    const evening = await finishEvening();
    report.days.push({ morning: bar, evening });
  } else {
    await page.click('[data-testid=close-day]');
    const evening = await finishEvening();
    report.days.push({ morning: bar, evening, closed: true });
  }
}

async function readNewspaper(file) {
  await page.waitForSelector('[data-testid=newspaper]', { timeout: 120000 });
  const paper = await page.textContent('[data-testid=newspaper]');
  await shot(file);
  await page.click('[data-testid=close-newspaper]');
  await page.waitForSelector('[data-testid=day-action-bar]');
  return paper;
}

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=save-menu]');
  await shot('b01-sparplatsen.png');
  await page.click('[data-testid=load-slot-1]');
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  await delay(4000);
  await shot('b02-lordag-vinbaren.png');
  report.saturday = await text('[data-testid=day-action-bar]');
  step('sparfilen laddad: lördag vecka 1 i vinbaren');

  await page.click('button[title="Simulering 4× hastighet"]');
  await playDay('b03-lordagens-kvall.png');
  step('lördagens kväll');

  // Söndag: avräkningen, vinbaren blir food truck.
  report.newspaper1 = await readNewspaper('b04-tidningen-nedgraderad.png');
  await delay(3000);
  await shot('b05-sondag-food-trucken.png');
  report.sunday1 = await text('[data-testid=day-action-bar]');
  step('söndagstidningen: nedgraderad');

  // Efter nedgraderingen spelar hon rimligt.
  answerMode = 'best';
  // Paviljongerna är alltid öppna: brons i tre på söndagens schemaplatser.
  report.exams = [];
  report.exams.push(await exam('stensota'));
  report.exams.push(await exam('metodkoket'));
  report.exams.push(await exam('kalastorget', 'b06-brons-i-tre.png'));
  step('brons i tre');
  report.bank1 = await openBank('b07-banken-food-trucken.png');
  await page.click('[data-testid=close-bank]');
  await page.click('[data-testid=close-day]');
  await finishEvening();
  step('söndagen stängd');

  // Måndag–lördag i food trucken.
  for (let d = 0; d < 6; d++) {
    await playDay(d === 0 ? 'b08-food-trucken-service.png' : null);
    step(`food trucken dag ${d + 1}`);
    if (await page.$('[data-testid=newspaper]')) break;
  }

  // Söndag: avräkningen efter veckan i food trucken.
  report.newspaper2 = await readNewspaper('b09-tidningen-vecka2.png');
  report.sunday2 = await text('[data-testid=day-action-bar]');
  report.bank2 = await openBank('b10-banken-vagen-tillbaka.png');
  const back = await page.$('[data-testid=choose-vinbar]');
  report.vinbarAvailable = Boolean(back);
  if (back) {
    await back.click();
    await page.waitForSelector('[data-testid=day-action-bar]');
    await delay(5000);
    await shot('b11-tillbaka-i-vinbaren.png');
    report.back = await text('[data-testid=day-action-bar]');
    step('tillbaka i vinbaren');
    // Måndag: första kvällen i vinbaren igen.
    await page.click('[data-testid=close-day]');
    await finishEvening();
    await playDay('b12-vinbaren-igen-service.png');
    step('första kvällen i vinbaren igen');
  } else {
    await page.click('[data-testid=close-bank]');
    step('banken: vinbaren inte tillgänglig');
  }
} finally {
  writeFileSync(resolve(OUT, 'way-back.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ newspaper1: report.newspaper1?.slice(0, 500), newspaper2: report.newspaper2?.slice(0, 500), vinbarAvailable: report.vinbarAvailable, back: report.back, errors: errors.length }, null, 2));
