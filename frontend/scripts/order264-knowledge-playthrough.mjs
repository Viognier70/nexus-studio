#!/usr/bin/env node
// ORDER 264 (Nexus v1 etapp 2) — öva, prov, medalj, omladdning i spelarens vy.
//
// DoD: "i spelarens vy kan en spelare öva, ta ett prov, få en medalj och
// se den finnas kvar efter att ha laddat om spelet."
//
// Produktionsbygget (vite build + preview på port 4173), start på `/`
// utan flaggor. Bara spelarens knappar:
//   namnrutan → Måltidens hus → Öva i Stensöta (5 frågor) → Tillbaka →
//   Prov i Stensöta (8 frågor) → brons → Öppna för kvällen (4×) →
//   kvällens quiz (tre frågor) → Till nästa morgon → omladdning →
//   Fortsätt ett sparat spel → Ladda → medaljen syns.
//
// Skriptet svarar som en spelare som kan svaren: det slår upp frågans
// text i frågebanken (src/strategic/content/questions/) för att hitta
// rätt alternativ. I övningen svarar det fel på en fråga med flit för
// att se förklaringen efter ett fel svar.
//
// Utdata: reports/order264/knowledge-playthrough.json + skärmdumpar.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports/order264');
mkdirSync(OUT, { recursive: true });
const PORT = 4173;
const URL = `http://localhost:${PORT}`;

const Q = resolve(FRONTEND, 'src/strategic/content/questions');
const meta = JSON.parse(readFileSync(resolve(Q, 'bank.meta.json'), 'utf8')).questions;
const texts = JSON.parse(readFileSync(resolve(Q, 'bank.text.en.json'), 'utf8')).texts;
const correctByPrompt = new Map(meta.map((m) => [texts[m.id].prompt, m.correctIndex]));

async function startPreview() {
  try { await fetch(URL + '/'); throw new Error(`port ${PORT} är redan upptagen`); } catch (e) { if (String(e.message).includes('upptagen')) throw e; }
  await new Promise((res, rej) => {
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

async function answerCurrent(page, wantCorrect, shot = null) {
  const prompt = await page.textContent('[data-testid=question-prompt]');
  // Prompten visas som "Frågeställare: text".
  const text = prompt.slice(prompt.indexOf(':') + 1).trim();
  const correct = correctByPrompt.get(text);
  if (correct === undefined) throw new Error(`okänd fråga: ${text}`);
  const pick = wantCorrect ? correct : (correct + 1) % 4;
  await page.click(`[data-testid=option-${pick}]`);
  await page.waitForSelector('[data-testid=explanation]');
  const explanation = await page.textContent('[data-testid=explanation]');
  if (shot) await page.screenshot({ path: resolve(OUT, shot) });
  await page.click('[data-testid=next-question]');
  return { prompt: text, picked: pick, correct, explanation: explanation.slice(0, 120) };
}

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', errors };

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type=text]', { timeout: 120000 });
  await page.fill('input[type=text]', 'Vinbaren vid torget');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-testid=open-house]', { timeout: 60000 });
  await delay(4000);

  // Måltidens hus.
  await page.click('[data-testid=open-house]');
  await page.waitForSelector('[data-testid=maltidens-hus]');
  await page.screenshot({ path: resolve(OUT, '1-maltidens-hus.png') });
  report.house = {
    theatre: await page.textContent('[data-testid=pavilion-gastronomiskateatern]'),
    stensota: await page.textContent('[data-testid=pavilion-stensota]')
  };

  // Öva: fem frågor, en fel med flit.
  await page.click('[data-testid=practice-stensota]');
  await page.waitForSelector('[data-testid=question-card]');
  report.practice = [];
  for (let i = 0; i < 5; i++) {
    // Fråga 2 besvaras fel med flit, och förklaringen fotograferas.
    report.practice.push(await answerCurrent(page, i !== 1, i === 1 ? '2-ova-forklaring.png' : null));
  }
  await page.waitForSelector('[data-testid=visit-result]');
  report.practiceResult = await page.textContent('[data-testid=visit-result]');
  await page.screenshot({ path: resolve(OUT, '3-ova-resultat.png') });
  await page.click('[data-testid=close-visit]');

  // Prov: åtta frågor, alla rätt.
  await page.click('[data-testid=open-house]');
  await page.waitForSelector('[data-testid=exam-stensota]');
  report.examButton = await page.textContent('[data-testid=exam-stensota]');
  await page.click('[data-testid=exam-stensota]');
  report.exam = [];
  for (let i = 0; i < 8; i++) report.exam.push(await answerCurrent(page, true));
  await page.waitForSelector('[data-testid=visit-result]');
  report.examResult = await page.textContent('[data-testid=visit-result]');
  await page.screenshot({ path: resolve(OUT, '4-prov-brons.png') });
  await page.click('[data-testid=close-visit]');
  await delay(500);
  report.shelfAfterExam = await page.textContent('[data-testid=medal-shelf]');
  report.slotsAfter = await page.textContent('[data-testid=day-action-bar]');
  await page.screenshot({ path: resolve(OUT, '5-morgon-med-medalj.png') });

  // Kvällen: service i 4×, sedan quizen.
  await page.click('button[title="Simulering 4× hastighet"]');
  await page.click('[data-testid=start-service]');
  await page.waitForSelector('[data-testid=evening-bar]', { timeout: 400000 });
  await page.screenshot({ path: resolve(OUT, '6-kvall-quiz-erbjuds.png') });
  report.quizOffer = await page.textContent('[data-testid=evening-bar]');
  await page.click('[data-testid=start-quiz]');
  report.quiz = [];
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('[data-testid=question-prompt]');
    report.quiz.push(await answerCurrent(page, i !== 2));
    if (i === 1) await page.screenshot({ path: resolve(OUT, '7-kvallsquiz.png') });
  }
  await page.waitForSelector('[data-testid=quiz-done]');
  report.quizDone = await page.textContent('[data-testid=quiz-done]');
  await page.screenshot({ path: resolve(OUT, '8-quiz-klar.png') });
  await page.click('[data-testid=end-evening]');
  await page.waitForSelector('[data-testid=open-house]', { timeout: 60000 });
  report.nextMorning = await page.textContent('[data-testid=day-badge]');

  // Omladdning och laddning.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=continue-saved]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.click('[data-testid=load-slot-1]');
  await page.waitForSelector('[data-testid=medal-shelf]');
  await delay(3000);
  report.afterReload = {
    badge: await page.textContent('[data-testid=day-badge]'),
    shelf: await page.textContent('[data-testid=medal-shelf]')
  };
  await page.screenshot({ path: resolve(OUT, '9-efter-omladdning.png') });
  await page.click('[data-testid=open-house]');
  await page.waitForSelector('[data-testid=medal-stensota]');
  report.afterReload.house = await page.textContent('[data-testid=medal-stensota]');
  await page.screenshot({ path: resolve(OUT, '10-huset-efter-omladdning.png') });
} finally {
  writeFileSync(resolve(OUT, 'knowledge-playthrough.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ examResult: report.examResult, afterReload: report.afterReload, errors }, null, 2));
