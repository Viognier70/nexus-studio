// ORDER 291 — kvällens tal sida vid sida (Vision Owner 2026-09-30: "Innan du
// rättar: kör en kväll i produktionsbygget och skriv ut talen från
// kvällskassan, skärmen efter servicen och kvällens resultat bredvid
// varandra, så att det syns var de skiljer sig").
//
// Från sparfilen måndag i vinbaren (reports/order284/save-mandag-vinbaren.json),
// på svenska, 1920 × 1080. Morgonen: baspaketet, och satsningarna i ACTIVITIES
// (förval: utbildningen och DJ:n, som spelaren i provspelet). Kvällen spelas
// med det bästa svaret. Talen läses ur sidan:
//   - kassan på morgonen före och efter inköpen (cash-counter data-value);
//   - kvällskassan och insatsen vid stängning (till data-value, data-stake);
//   - skärmen efter servicen (transfer-*);
//   - kvällens resultat (result-money data-delta), fem gånger två sekunder isär;
//   - kassan nästa morgon.
//
//   - raketen: knappen Back your knowledge prövas och trycks när den går (punkt 1).
//
//   REPORT_ORDER=order291 LABEL=before [ACTIVITIES=train-service,book-dj] [SKIP_BUILD=1] node scripts/order291-numbers.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4179);
const URL = `http://localhost:${PORT}`;
const LABEL = process.env.LABEL ?? 'before';
const ACTIVITIES = (process.env.ACTIVITIES ?? 'train-service,book-dj').split(',').filter(Boolean);
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order291');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const rocketMeta = new Map(JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8')).incidents.map((i) => [i.id, i]));
for (const i of JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/menu.meta.json'), 'utf8')).incidents) rocketMeta.set(i.id, i);

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
}, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const attr = (sel, a) => page.getAttribute(sel, a).catch(() => null);
const num = async (sel, a = 'data-value') => { const v = await attr(sel, a); return v === null ? null : Number(v); };
const report = { label: LABEL, save: 'reports/order284/save-mandag-vinbaren.json', language: 'sv', activities: ACTIVITIES, errors };
const t0 = Date.now();
const step = (n) => console.log(`${Math.round((Date.now() - t0) / 1000)}s ${n}`);

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  report.cashMorningStart = await num('[data-testid=cash-counter]');
  for (const a of ACTIVITIES) { await page.click(`[data-testid=activity-${a}]`).catch(() => {}); await delay(300); }
  report.cashAfterActivities = await num('[data-testid=cash-counter]');
  if (await page.$('[data-testid=open-buy-foot]')) {
    await page.click('[data-testid=open-buy-foot]');
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(800);
    report.buy = { coverage: await page.textContent('[data-testid=buy-coverage]').catch(() => null), spent: await num('[data-testid=buy-spent]') };
    await page.screenshot({ path: resolve(OUT, `numbers-${LABEL}-00-inkopen.png`) });
    await page.click('[data-testid=open-doors]');
  } else {
    await page.click('[data-testid=start-service]');
  }
  report.cashAtOpen = await num('[data-testid=cash-counter]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  step('servicen');
  // Kvällen med det bästa svaret; kvällskassan noteras varje halvminut.
  report.tillSamples = [];
  // ORDER 291 punkt 1 — spelaren startar en raket under servicen: knappen
  // (back-start) prövas varje halv sekund; när den går att trycka på trycks
  // den, och kortet ska öppnas (incident-card). Varför den är grå noteras.
  report.rocket = { started: false, cardOpened: false, enabledAtSec: null, whyTexts: [] };
  let lastSample = 0;
  const until = Date.now() + 14 * 60000;
  while (Date.now() < until) {
    if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=screen-R1]')) break;
    const card = await page.$('[data-testid=incident-card][data-mode=ask]');
    if (card && !(await page.$('[data-testid=incident-band]'))) {
      const id = await card.getAttribute('data-incident-id');
      const s = Number(await card.getAttribute('data-step'));
      const o = rocketMeta.get(id)?.steps[s]?.options.find((x) => x.quality === 'best');
      if (o) await page.click(`[data-testid=incident-option-${o.id}]`).catch(() => {});
    }
    if (!report.rocket.started && !(await page.$('[data-testid=incident-card]'))) {
      const btn = await page.$('[data-testid=back-start]');
      if (btn) {
        if (await btn.isEnabled()) {
          report.rocket.enabledAtSec = Math.round((Date.now() - t0) / 1000);
          await btn.click().catch(() => {});
          report.rocket.started = true;
          report.rocket.cardOpened = await page.waitForSelector('[data-testid=incident-card]', { timeout: 5000 }).then(() => true).catch(() => false);
          await page.screenshot({ path: resolve(OUT, `numbers-${LABEL}-05-raket.png`) });
        } else {
          const why = await page.textContent('[data-testid=back-why]').catch(() => null);
          if (why && !report.rocket.whyTexts.includes(why)) report.rocket.whyTexts.push(why);
        }
      }
    }
    if (Date.now() - lastSample > 30000) {
      lastSample = Date.now();
      report.tillSamples.push({ till: await num('[data-testid=till]'), stake: await num('[data-testid=till]', 'data-stake') });
    }
    await delay(500);
  }
  step('stängt');
  if (await page.$('[data-testid=waste-continue]')) {
    report.waste = { fee: await num('[data-testid=waste-fee]') };
    await delay(9000);
    await page.click('[data-testid=waste-continue]');
  }
  await page.waitForSelector('[data-testid=screen-T2]', { timeout: 30000 });
  await delay(2500);
  const rest = await page.$$eval('[data-testid^=transfer-rest-]', (els) => els.map((e) => ({ id: e.getAttribute('data-testid'), value: Number(e.getAttribute('data-value')) })));
  report.T2 = {
    sales: await num('[data-testid=transfer-revenue]'),
    produce: null,
    contribution: await num('[data-testid=transfer-contribution]'),
    ratio: await num('[data-testid=transfer-ratio]'),
    rest,
    result: await num('[data-testid=transfer-result]'),
    transfer: await num('[data-testid=transfer-move]'),
    accountAfter: await num('[data-testid=transfer-account]'),
    forecast: await page.textContent('[data-testid=transfer-forecast]').catch(() => null),
    button: await page.textContent('[data-testid=transfer-do]').catch(() => null)
  };
  await page.screenshot({ path: resolve(OUT, `numbers-${LABEL}-10-T2.png`) });
  await delay(900);
  await page.click('[data-testid=transfer-do]');
  await delay(2200);
  await page.click('[data-testid=transfer-continue]');
  await page.waitForSelector('[data-testid=screen-R1]', { timeout: 10000 });
  await delay(2500);
  report.R1 = { money: [], rows: await page.$$eval('[data-result-row]', (els) => els.map((e) => ({ key: e.getAttribute('data-testid'), delta: e.getAttribute('data-delta'), text: e.textContent?.slice(0, 160) }))) };
  for (let i = 0; i < 5; i++) { report.R1.money.push(await num('[data-testid=result-money]', 'data-delta')); await delay(2000); }
  report.cashDuringR1 = await num('[data-testid=cash-counter]');
  await page.screenshot({ path: resolve(OUT, `numbers-${LABEL}-20-R1.png`) });
  // Vidare till nästa morgon.
  for (let i = 0; i < 40 && !(await page.$('[data-testid=day-action-bar]')); i++) {
    for (const b of ['result-continue', 'to-evening-story', 'end-evening']) await page.click(`[data-testid=${b}]`, { timeout: 500 }).catch(() => {});
    await delay(1200);
  }
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  await delay(1500);
  report.cashNextMorning = await num('[data-testid=cash-counter]');
  step('nästa morgon');
} catch (e) {
  report.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, `numbers-${LABEL}-99-fel.png`) }).catch(() => {});
} finally {
  // Sida vid sida.
  const r = report;
  r.sideBySide = {
    'kassan i morse': r.cashMorningStart,
    'kassan vid öppning (efter satsningar och inköp)': r.cashAtOpen,
    'kvällskassan (T2 försäljning)': r.T2?.sales ?? null,
    'T2 kvällens resultat': r.T2?.result ?? null,
    'T2 kontot efter överföringen': r.T2?.accountAfter ?? null,
    'R1 Pengar (första läsningen)': r.R1?.money?.[0] ?? null,
    'R1 Pengar (sista läsningen, 8 s senare)': r.R1?.money?.[4] ?? null,
    'kassan nästa morgon': r.cashNextMorning,
    'kassans förändring över dygnet': r.cashNextMorning != null && r.cashMorningStart != null ? r.cashNextMorning - r.cashMorningStart : null
  };
  writeFileSync(resolve(OUT, `numbers-${LABEL}.json`), JSON.stringify(r, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report.sideBySide, null, 2));
