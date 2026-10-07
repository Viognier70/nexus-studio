// ORDER 316 — fikat efter stängning i spelarens flöde (produktionsbygget).
//
// Som scripts/order289-evening-flow.mjs: sparfilen måndag vecka 2 i vinbaren
// (reports/order284/save-mandag-vinbaren.json), baspaketet och hela kvällar
// som en spelare. Efter berättelsen ska fikat komma när kvällen har ett
// dilemma: kortet med frågan och svaren fotograferas, svaret A väljs (kväll 1)
// eller Gå hem (kväll 2), och kortet efter svaret fotograferas. Sedan byn i
// kväll, butiken och morgonen. Kontrollen läser sidan: nivån står ovanför
// förklaringen, och ingen lagtext står på kortet (legalReviewed: false).
// LANG_GAME=sv spelar på svenska. Utdata: reports/order316/fika-flow-<lang>.json
// och fika-<lang>-<kväll>-{fraga,svar}.png.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order316');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4178);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'en';
const CLICK = process.env.CLICK ?? 'single';
const EVENINGS = Number(process.env.EVENINGS ?? 2);
const LOOPS = Number(process.env.LOOPS ?? 200);
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
const report = { build: 'produktion (vite build + preview)', lang: LANG, evenings: [], errors: [], ok: false };
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
    // Morgonens recensioner (från kväll 2): stäng kortet.
    await delay(1500);
    if (await has('[data-testid=morning-review-next]')) { await page.click('[data-testid=morning-review-next]'); await delay(800); }
    if (await has('[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
    // Gårdagens rester: svara om kortet finns.
    if (await has('[data-testid=salvage-option-b]:not([disabled])')) { await page.click('[data-testid=salvage-option-b]'); await delay(300); await page.click('[data-testid=salvage-close]').catch(() => {}); }
    if (!(await has('[data-testid=screen-M1]'))) await page.click('[data-testid=open-buy]');
    await page.waitForSelector('[data-testid=screen-M1]');
    await page.click('[data-testid=buy-base]');
    await delay(1200);
    await page.click('[data-testid=open-doors]');
    await delay(3000);
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
      if (await has('[data-testid=transfer-do], [data-testid=transfer-continue]')) return 'T1';
      for (const s of ['R1', 'L1', 'K1', 'fika', 'J1']) if (await has(`[data-testid=screen-${s}]`)) return s;
      if (await has('[data-testid=shop-done]')) return 'shop';
      return (await has('[data-testid=day-action-bar]')) ? 'morning' : null;
    };
    // Kvällens skärmar står under kvällens tid (EVENING.simSeconds): 1× som spelaren.
    await page.click('[data-testid=speed-toggle] button:nth-child(1)').catch(() => {});
    let last = null;
    for (let i = 0; i < LOOPS; i++) {
      const s = await seen();
      if (s && s !== last) { ev.sequence.push(s); last = s; }
      if (s === 'morning') break;
      if (s === 'S1') { await delay(900); await press('[data-testid=waste-continue]'); }
      else if (s === 'T1') { await delay(900); if (await has('[data-testid=transfer-do]')) { await press('[data-testid=transfer-do]'); await page.waitForSelector('[data-testid=transfer-continue]', { timeout: 15000 }).catch(() => {}); await delay(800); } await press('[data-testid=transfer-continue]').catch(() => {}); }
      else if (s === 'fika') {
        await delay(900);
        const card = await page.$('[data-testid=screen-fika]');
        if ((await card.getAttribute('data-answer')) === '') {
          ev.fika = { dilemma: await card.getAttribute('data-dilemma'), asker: await page.textContent('[data-testid=fika-asker]'), question: await page.textContent('[data-testid=fika-question]'), options: (await page.$$('[data-testid^=fika-option-]')).length, goHome: await has('[data-testid=fika-go-home]') };
          await page.screenshot({ path: resolve(OUT, `fika-${LANG}-${e + 1}-fraga.png`) });
          if (e === 0) await page.click('[data-testid=fika-option-A]'); else await page.click('[data-testid=fika-go-home]');
          await delay(700);
          const grade = await page.$('[data-testid=fika-grade]');
          const expl = await page.$('[data-testid=fika-explanation]');
          ev.fika.answer = await (await page.$('[data-testid=screen-fika]')).getAttribute('data-answer');
          ev.fika.grade = grade ? await grade.textContent() : null;
          ev.fika.gradeAboveExplanation = grade && expl ? await page.evaluate(([g, x]) => !!(g.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING), [grade, expl]) : null;
          ev.fika.effects = await has('[data-testid=fika-effects]') ? await page.textContent('[data-testid=fika-effects]') : null;
          ev.fika.wentHome = await has('[data-testid=fika-went-home]') ? await page.textContent('[data-testid=fika-went-home]') : null;
          ev.fika.legalShown = await has('[data-testid=fika-legal]');
          ev.fika.lawTextOnPage = /\d{4}:\d{3,4}|AFS 20|852\/2004|1169\/2011/.test(await page.textContent('[data-testid=screen-fika]'));
          await page.screenshot({ path: resolve(OUT, `fika-${LANG}-${e + 1}-svar.png`) });
        }
        await press('[data-testid=fika-continue]');
      }
      else if (s === 'J1') { await delay(700); await press('[data-testid=compare-continue]'); }
      else if (s === 'shop') { await delay(700); await press('[data-testid=shop-done]'); }
      else if (s === 'R1') { await delay(900); await press('[data-testid=result-continue]'); }
      else if (s === 'L1') { await delay(900); await press('[data-testid=to-evening-story]'); }
      else if (s === 'K1') { await delay(900); await press('[data-testid=end-evening]'); }
      await delay(250);
    }
    await page.screenshot({ path: resolve(OUT, `fika-${LANG}-${e + 1}-efter-kvallen.png`) });
    ev.order = ev.sequence.join(' → ');
    ev.fikaAfterStory = ev.sequence.includes('fika') ? ev.sequence.indexOf('fika') > ev.sequence.indexOf('K1') : null;
    console.log(`kväll ${e + 1}: ${ev.order}`);
  }
  const fikas = report.evenings.filter((e) => e.fika);
  report.ok = fikas.length > 0 && fikas.every((e) => e.fikaAfterStory !== false && !e.fika.legalShown && !e.fika.lawTextOnPage && (e.fika.answer === 'home' ? !!e.fika.wentHome : !!e.fika.grade && e.fika.gradeAboveExplanation)) && report.errors.length === 0;
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
  await page.screenshot({ path: resolve(OUT, `fika-flow-${LANG}-fel.png`) }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, `fika-flow-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
  console.log('FIKA-FLOW', report.ok ? 'OK' : 'FEL');
}
