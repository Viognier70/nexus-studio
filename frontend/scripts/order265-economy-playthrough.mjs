#!/usr/bin/env node
// ORDER 265 (Nexus v1 etapp 3) — ekonomin i spelarens vy: en hel vecka
// till söndagens avräkning och banken.
//
// Produktionsbygget (vite build + preview på port 4173), start på `/`
// utan flaggor, bara spelarens knappar:
//   namnrutan → måndag: prov i Stensöta och Metodköket → tisdag: prov i
//   Kalastorget → varje kväll Öppna för kvällen (4×), kvällsquizen
//   hoppas över, Till nästa morgon → söndag: avräkningen i ord →
//   Banken (diagnosen) → Byt till ölkrog → måndag som ölkrog.
// Skriptet svarar rätt på proven genom att slå upp frågan i frågebanken.
//
// Utdata: reports/order265/economy-playthrough.json + skärmdumpar.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports/order265');
mkdirSync(OUT, { recursive: true });
const PORT = 4173;
const URL = `http://localhost:${PORT}`;

const Q = resolve(FRONTEND, 'src/strategic/content/questions');
const meta = JSON.parse(readFileSync(resolve(Q, 'bank.meta.json'), 'utf8')).questions;
const texts = JSON.parse(readFileSync(resolve(Q, 'bank.text.en.json'), 'utf8')).texts;
const correctByPrompt = new Map(meta.map((m) => [texts[m.id].prompt, m.correctIndex]));

async function startPreview() {
  try { await fetch(URL + '/'); throw new Error(`port ${PORT} är redan upptagen`); } catch (e) { if (String(e.message).includes('upptagen')) throw e; }
  // SKIP_BUILD=1: använd ett redan byggt dist/ (t.ex. utan minifiering för felsökning).
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
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 1500)}`));
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', days: [], errors };

async function exam(pavilion) {
  await page.click('[data-testid=open-house]');
  await page.click(`[data-testid=exam-${pavilion}]`);
  for (let i = 0; i < 8; i++) await answerCurrent(page, true);
  await page.waitForSelector('[data-testid=visit-result]');
  const result = await page.textContent('[data-testid=visit-result]');
  await page.click('[data-testid=close-visit]');
  return result;
}

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type=text]', { timeout: 120000 });
  await page.fill('input[type=text]', 'Vinbaren vid torget');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-testid=open-house]', { timeout: 60000 });
  await delay(4000);
  await page.click('button[title="Simulering 4× hastighet"]');

  for (let d = 0; d < 7; d++) {
    const bar = await page.textContent('[data-testid=day-action-bar]');
    const day = { morning: bar };
    if (d === 0) day.exams = [await exam('stensota'), await exam('metodkoket')];
    if (d === 1) day.exams = [await exam('kalastorget')];
    if (await page.$('[data-testid=start-service]')) {
      await page.click('[data-testid=start-service]');
      await page.waitForSelector('[data-testid=evening-bar]', { timeout: 400000 });
      day.evening = await page.textContent('[data-testid=evening-bar]');
      if (await page.$('[data-testid=skip-quiz]')) await page.click('[data-testid=skip-quiz]');
      await page.click('[data-testid=end-evening]');
    } else {
      // Söndag.
      await page.screenshot({ path: resolve(OUT, '1-sondag-avrakning.png') });
      day.settlement = await page.textContent('[data-testid=settlement]').catch(() => null);
      await page.click('[data-testid=open-bank]');
      await page.waitForSelector('[data-testid=bank-dialog]');
      await page.screenshot({ path: resolve(OUT, '2-banken.png') });
      report.bank = {
        diagnosis: await page.textContent('[data-testid=bank-diagnosis]'),
        classes: Object.fromEntries(await Promise.all(['vinbar', 'foodtruck', 'restaurang', 'olkrog', 'gastgiveri', 'nattklubb'].map(async (c) => [c, await page.textContent(`[data-testid=class-${c}]`)])))
      };
      await page.click('[data-testid=choose-olkrog]');
      await delay(500);
      report.afterChoice = await page.textContent('[data-testid=day-action-bar]');
      await page.screenshot({ path: resolve(OUT, '3-efter-bytet.png') });
      await page.click('[data-testid=close-day]');
    }
    await page.waitForFunction((prev) => {
      const b = document.querySelector('[data-testid=day-action-bar]');
      return b && b.textContent !== prev && !document.querySelector('[data-testid=evening-bar]');
    }, bar, { timeout: 200000 });
    report.days.push(day);
    console.log(`dag ${d + 1}: ${bar.slice(0, 40)}`);
  }
  report.mondayAfter = await page.textContent('[data-testid=day-action-bar]');
  await page.screenshot({ path: resolve(OUT, '4-mandag-olkrog.png') });
} finally {
  writeFileSync(resolve(OUT, 'economy-playthrough.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ settlement: report.days[6]?.settlement, bank: report.bank?.diagnosis, afterChoice: report.afterChoice, mondayAfter: report.mondayAfter, errors }, null, 2));
