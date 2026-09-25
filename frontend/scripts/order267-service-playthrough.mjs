#!/usr/bin/env node
// ORDER 267 (Nexus v1 etapp 5) — etapp 4:s DoD 1 i spelarens vy, nu i
// vinbarens rum (20 platser) med marknadens tryck: rycka in för en gäst
// som är på väg att gå, och se det nämnas i strömmen. Kopia av
// order266-service-playthrough.mjs (DoD 1 flyttades hit av Vision Owner
// 2026-09-25) med en skärmdump av rummet vid första servicen.
//
// Produktionsbygget (vite build + preview på port 4173), start på `/`
// utan flaggor, bara spelarens knappar:
//   namnrutan → måndag: prov i Stensöta och Metodköket → tisdag: prov i
//   Kalastorget → måndag–torsdag: Öppna för kvällen (4×), hoppa över
//   quizen, Till nästa morgon → fredag (en tung kväll): farten 2×,
//   "Rycka in" öppnas och skriptet väntar på en gäst markerad "på väg att
//   gå", väljer den, ser rummet skymmas och läser strömmen efteråt.
//   Görs inte fredagen det, försöker skriptet på lördagen.
// Utdata: reports/order267/service-playthrough.json + skärmdumpar.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports/order267');
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

// DEV_DIAG=1: kör mot en redan startad dev-server (5173) för felsökning; då
// loggas simuleringens kö via DEV-kroken. Verifieringen görs utan DEV_DIAG.
const DEV_DIAG = process.env.DEV_DIAG === '1';
const preview = DEV_DIAG ? { kill() {} } : await startPreview();
const BASE = DEV_DIAG ? 'http://localhost:5173' : URL;
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 800)}`));
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', flags: 'inga', days: [], errors };

async function exam(pavilion) {
  await page.click('[data-testid=open-house]');
  await page.click(`[data-testid=exam-${pavilion}]`);
  for (let i = 0; i < 8; i++) await answerCurrent(page, true);
  await page.waitForSelector('[data-testid=visit-result]');
  await page.click('[data-testid=close-visit]');
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

// Under servicen: vänta på en gäst "på väg att gå" och rycka in.
async function tryIntervene(tag) {
  const deadline = Date.now() + 400000;
  while (Date.now() < deadline) {
    if (await page.$('[data-testid=evening-bar]')) return null;
    // Ett scenario som väntar på spelaren stoppar ankomsterna; en spelare
    // svarar. Skriptet väljer första alternativet.
    const scenarioButton = await page.$('[data-testid=scenario-overlay] button');
    if (scenarioButton) await scenarioButton.dispatchEvent('click').catch(() => {});
    if (!(await page.$('[data-testid=action-panel]'))) {
      // Knappen ritas om varje tick; dispatchEvent undviker Playwrights
      // stabilitetsväntan (samma klick som spelarens).
      const btn = await page.$('[data-testid=action-button]');
      if (btn) await btn.dispatchEvent('click').catch(() => {});
    }
    const risk = await page.$('[data-testid=action-panel] button[data-at-risk=true]');
    if (risk) {
      const label = await risk.textContent();
      await page.screenshot({ path: resolve(OUT, `${tag}-1-ko-pa-vag-att-ga.png`) });
      // Panelen ritas om varje tick; klicka på knappen som finns just då
      // (samma klick som spelarens), och försök igen om gästen hann gå.
      let blindShown = false;
      for (let attempt = 0; attempt < 10 && !blindShown; attempt++) {
        await page.evaluate(() => {
          const b = document.querySelector('[data-testid=action-panel] button[data-at-risk=true]') ?? document.querySelector('[data-testid=action-panel] button[data-testid^=task-]');
          if (b) b.click();
        });
        blindShown = await page.waitForSelector('[data-testid=blind-overlay]', { timeout: 1500 }).then(() => true).catch(() => false);
        if (!blindShown && !(await page.$('[data-testid=action-panel]'))) {
          const btn = await page.$('[data-testid=action-button]');
          if (btn) await btn.dispatchEvent('click').catch(() => {});
        }
      }
      if (!blindShown) throw new Error('insatsen startade inte');
      const blind = await page.textContent('[data-testid=blind-overlay]');
      await page.screenshot({ path: resolve(OUT, `${tag}-2-rummet-skymt.png`) });
      await page.waitForSelector('[data-testid=blind-overlay]', { state: 'detached', timeout: 60000 });
      await delay(1000);
      const stream = await page.textContent('[data-testid=event-stream]').catch(() => null);
      await page.screenshot({ path: resolve(OUT, `${tag}-3-strommen.png`) });
      return { label, blind, stream };
    }
    if (DEV_DIAG) {
      const diag = await page.evaluate(() => {
        const s = window.__nxSimState;
        return s ? `t=${s.simTime.toFixed(0)} q=${s.waitingIds.length} sats=${s.guests.filter((g) => g.state === 'waiting').map((g) => g.satisfaction.toFixed(2)).join(',')} collapsed=${s.day.serviceCollapsed} awaiting=${s.scenario.awaitingChoice}` : '';
      });
      console.log('diag', tag, diag, 'panel', !!(await page.$('[data-testid=action-panel]')));
    }
    await delay(700);
  }
  return null;
}

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type=text]', { timeout: 120000 });
  await page.fill('input[type=text]', 'Vinbaren vid torget');
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-testid=open-house]', { timeout: 60000 });
  await delay(4000);
  await page.click('button[title="Simulering 4× hastighet"]');

  for (let d = 0; d < 6 && !report.intervention; d++) {
    const bar = await page.textContent('[data-testid=day-action-bar]');
    const day = { morning: bar };
    if (d === 0) { await exam('stensota'); await exam('metodkoket'); }
    if (d === 1) await exam('kalastorget');
    if (d === 1) await page.screenshot({ path: resolve(OUT, '0-morgon-prognos.png') });
    const busy = d >= 4; // fredag och lördag
    if (busy) await page.click('button[title="Simulering 2× hastighet"]');
    await page.click('[data-testid=start-service]');
    if (d === 0) {
      // Rummet efter att dörrarna öppnat (öppningsbild 10 s + mise en place).
      await delay(45000);
      await page.screenshot({ path: resolve(OUT, '0-vinbarens-rum.png') });
    }
    if (busy) {
      const r = await tryIntervene(d === 4 ? 'fredag' : 'lordag');
      if (r) { report.intervention = { day: d + 1, ...r }; }
    }
    day.evening = await finishEvening();
    if (report.intervention && !report.eveningAfter) {
      report.eveningAfter = day.evening;
    }
    if (busy) await page.click('button[title="Simulering 4× hastighet"]');
    report.days.push(day);
    console.log(`dag ${d + 1}: ${bar.slice(0, 30)}${report.intervention ? ' (ryckt in)' : ''}`);
  }
} finally {
  writeFileSync(resolve(OUT, 'service-playthrough.json'), JSON.stringify(report, null, 2));
  await browser.close();
  preview.kill('SIGTERM');
}
console.log(JSON.stringify({ intervention: report.intervention, eveningAfter: report.eveningAfter?.slice(0, 200), errors }, null, 2));
