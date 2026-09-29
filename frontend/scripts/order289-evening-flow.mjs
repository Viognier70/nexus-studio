// ORDER 289 — kvällens resultat (R1) visas varje kväll (Vision Owner
// 2026-09-29: "Kvällens resultat visas aldrig … I spelet gick det från
// sopbilen till lärdomen och sedan direkt till onsdagsmorgonen … Skriv ett
// test som spelar en hel kväll i produktionsbygget och kontrollerar att R1
// visas varje kväll, inte bara att skärmen går att rita").
//
// Produktionsbygget (vite build + preview). Laddar sparfilen måndag vecka 2 i
// vinbaren (reports/order284/save-mandag-vinbaren.json), köper baspaketet och
// spelar två hela kvällar som en spelare: raketerna besvaras, sopbilen,
// kvällens resultat, lärdomen, berättelsen och natten. Varje kväll kräver
// att R1 syns mellan sopbilen och lärdomen och står kvar i minst en sekund.
// CLICK=double klickar som en spelare som dubbelklickar på knapparna vidare
// (sopbilens och resultatets knappar ligger på samma plats). LANG=sv spelar
// på svenska. Utdata: reports/<REPORT_ORDER>/evening-flow-<lang>-<click>.json.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order289');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4178);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'en';
const CLICK = process.env.CLICK ?? 'single';
const EVENINGS = Number(process.env.EVENINGS ?? 2);
const DEADLINE = Date.now() + Number(process.env.DEADLINE_MIN ?? 20) * 60000;

async function startPreview() {
  if (!process.env.SKIP_BUILD) {
    await new Promise((res, rej) => {
      const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' });
      b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))));
    });
  }
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(URL); if (r.ok) return proc; } catch { /* väntar */ }
    await delay(500);
  }
  throw new Error('preview timeout');
}

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', lang: LANG, click: CLICK, evenings: [], errors: [], ok: false };
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([key, value, lang]) => {
  if (!sessionStorage.getItem('eve-seeded')) { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('eve-seeded', '1'); }
}, ['nexus.v1.slot1', SAVE, LANG]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));

async function press(sel) {
  if (CLICK === 'double') await page.dblclick(sel);
  else await page.click(sel);
}
const has = async (sel) => !!(await page.$(sel));

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  for (let e = 0; e < EVENINGS; e++) {
    const ev = { evening: e + 1, sequence: [] };
    report.evenings.push(ev);
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
    // Gårdagens rester: svara om kortet finns.
    if (await has('[data-testid=salvage-option-b]:not([disabled])')) { await page.click('[data-testid=salvage-option-b]'); await delay(300); await page.click('[data-testid=salvage-close]').catch(() => {}); }
    await page.click('[data-testid=open-buy]');
    await page.waitForSelector('[data-testid=screen-M1]');
    await page.click('[data-testid=buy-base]');
    await delay(1200);
    await page.click('[data-testid=open-doors]');
    await page.waitForSelector('[data-testid=event-stream]', { timeout: 60000 });
    await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    // Servicen: svara på raketerna (första möjliga svaret) tills kvällen börjar.
    while (!(await has('[data-testid=waste-continue], [data-testid=screen-R1], [data-testid=screen-L1], [data-testid=screen-K1]'))) {
      if (Date.now() > DEADLINE) throw new Error('tidsgränsen för skriptet');
      const card = await page.$('[data-testid=incident-card]');
      if (card && !(await has('[data-testid=incident-band]'))) {
        const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
        if (opt) await opt.click().catch(() => {});
        if ((await card.getAttribute('data-backed')) === 'true') await page.click('[data-testid=back-lock]').catch(() => {});
      }
      await delay(400);
    }
    // Kvällen: registrera varje skärm i tur och ordning.
    // Sopbilens skärm och morgonens schema har båda testid screen-S1; sopbilen
    // känns igen på sin knapp.
    const seen = async () => {
      if (await has('[data-testid=waste-continue]')) return 'S1';
      for (const s of ['R1', 'L1', 'K1']) if (await has(`[data-testid=screen-${s}]`)) return s;
      return (await has('[data-testid=day-action-bar]')) ? 'morning' : null;
    };
    let last = null;
    let r1Since = null;
    for (let i = 0; i < 200; i++) {
      const s = await seen();
      if (s && s !== last) { ev.sequence.push(s); last = s; if (s === 'R1') r1Since = Date.now(); }
      if (s === 'morning') break;
      if (s === 'S1') { await delay(2500); await press('[data-testid=waste-continue]'); }
      else if (s === 'R1') { await delay(1200); ev.r1VisibleMs = Date.now() - r1Since; await page.screenshot({ path: resolve(OUT, `evening-flow-${LANG}-${CLICK}-R1-${e + 1}.png`) }); await press('[data-testid=result-continue]'); }
      else if (s === 'L1') { await delay(900); await press('[data-testid=to-evening-story]'); }
      else if (s === 'K1') { await delay(900); await press('[data-testid=end-evening]'); }
      await delay(250);
    }
    ev.r1Shown = ev.sequence.includes('R1');
    ev.order = ev.sequence.join(' → ');
    console.log(`kväll ${e + 1}: ${ev.order}`);
  }
  report.ok = report.evenings.every((e) => e.r1Shown && (e.r1VisibleMs ?? 0) >= 1000) && report.errors.length === 0;
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
  await page.screenshot({ path: resolve(OUT, `evening-flow-${LANG}-${CLICK}-fel.png`) }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, `evening-flow-${LANG}-${CLICK}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
  console.log('EVENING-FLOW', report.ok ? 'OK' : 'FEL');
}
