// ORDER 322 A och C — kontrollen i produktionsbygget (vite preview), på svenska, i 1440 × 900 och 1280 × 720:
//   1. Provspelet i vinbaren (?prov) med den tvingade situationen vb01-korken: krogens namn (förifyllt Hyttgrillen
//      utan sparat spel), räknaren på kortet (inte "Följd"), och morgonen.
//   2. Kvällen: spelaren svarar rätt (det rätta svaret ur metadata på disk, alternativen är blandade) och når
//      valet i kvitt eller dubbelt. Bilder i väntan, vid valet, i statusläget (S, teckenförklaringen stängd) och
//      med teckenförklaringen öppen (L). "Om rätt" vid valet = potten × 2 + 1 (balance.ts DOUBLE_OR_NOTHING
//      growth 2 och potStep 1, replikerade).
//   3. Mätt ur sidan: att ingen ruta ligger ovanpå en annan (lådornas rektanglar parvis), att ingen pyramid
//      står i rummet utanför raden, att rubriken i teckenförklaringen inte klipps, och "Om rätt".
// Utdata: reports/order322/check.json och check-*.png.
//
//   node scripts/order322-check.mjs          (bygger först; SKIP_BUILD=1 hoppar över bygget)

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order322');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4191);
const URL = `http://localhost:${PORT}`;
const INCIDENT = 'vb01-korken';
// Inget sparat spel i den nya profilen: namnet är exemplet (provStrings.ts prov.businessName, replikerat).
const NAME = 'Hyttgrillen';
const META = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8'));
const BEST = META.incidents.find((i) => i.id === INCIDENT).steps.map((s) => s.options.filter((o) => o.quality === 'best').map((o) => o.id));

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

// I sidan: rutorna som inte får ligga på varandra under valet, och var pyramiderna står.
function measure() {
  const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width && b.height ? { sel, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null; };
  const boxes = [
    '[data-testid=incident-card]', '[data-testid=incident-kvitt]', '[data-testid=pyramid-moment-line]',
    '[data-testid=status-legend]', '[data-testid=status-legend-key]',
    '[data-testid=prov-badge]'
  ].map(r).filter(Boolean);
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const overlaps = [];
  // En ruta inuti en annan (rubriken i teckenförklaringen) ligger inte ovanpå den.
  const nested = (a, b) => { const ea = document.querySelector(a.sel), eb = document.querySelector(b.sel); return ea.contains(eb) || eb.contains(ea); };
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (hit(boxes[i], boxes[j]) && !nested(boxes[i], boxes[j])) overlaps.push([boxes[i].sel, boxes[j].sel]);
  // Pyramiderna i ögonblicket: bara den lilla i raden.
  const pyramids = [...document.querySelectorAll('[data-testid=pyramid-moment] .nx-pyramid')].map((e) => ({ inRow: !!e.closest('[data-testid=pyramid-moment-line]'), h: Math.round(e.getBoundingClientRect().height) }));
  const head = document.querySelector('[data-testid=status-legend-heading]');
  const clipped = head ? head.scrollWidth > head.clientWidth + 1 || head.scrollHeight > head.clientHeight + 1 : null;
  const view = { w: innerWidth, h: innerHeight };
  const outside = boxes.filter((b) => b.x < 0 || b.y < 0 || b.x + b.w > view.w || b.y + b.h > view.h).map((b) => b.sel);
  return {
    boxes, overlaps, outside, pyramids, legendHeadClipped: clipped,
    legendOpen: !!document.querySelector('[data-testid=status-legend]'),
    legendKey: document.querySelector('[data-testid=status-legend-key] kbd')?.textContent ?? null,
    ifRight: document.querySelector('[data-testid=stake-if-right]')?.getAttribute('data-value') ?? null,
    pot: document.querySelector('[data-testid=stake-pot]')?.getAttribute('data-value') ?? null,
    phase: document.querySelector('[data-testid=pyramid-moment]')?.getAttribute('data-phase') ?? null
  };
}

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const result = { ok: true, runs: [], errors: [] };
const fail = (msg) => { result.ok = false; result.errors.push(msg); };

async function run(width, height) {
  const tag = `${width}x${height}`;
  const row = { viewport: tag, moments: [] };
  result.runs.push(row);
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => { try { localStorage.setItem('nexus.lang', 'sv'); } catch { /* ingen lagring */ } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => result.errors.push(`${tag} pageerror: ${e.message}`));
  const shot = (n) => p.screenshot({ path: resolve(OUT, `check-${tag}-${n}.png`) });
  await p.goto(`${URL}/?prov`);
  await p.waitForSelector('[data-testid=prov-start]', { timeout: 30000 });
  await p.click('[data-testid=prov-place-vinbar]');
  row.nameDefault = await p.inputValue('[data-testid=prov-name]');
  if (row.nameDefault !== NAME) fail(`${tag}: namnet är förifyllt med "${row.nameDefault}"`);
  await p.selectOption('[data-testid=prov-incident]', INCIDENT);
  await p.click('[data-testid=prov-begin]');
  await p.waitForSelector('[data-testid=prov-badge]', { timeout: 30000 });
  await delay(2500);
  row.name = await p.evaluate(() => document.querySelector('[data-testid=business-name], .nx-business-name')?.textContent ?? null);
  row.bodyHasProvName = await p.evaluate(() => /Provspelet/.test(document.body.innerText));
  row.bodyHasName = await p.evaluate((n) => document.body.innerText.includes(n), NAME);
  if (row.bodyHasProvName) fail(`${tag}: "Provspelet" syns som krogens namn`);
  await shot('morgon');
  // Morgonen: baspaketet och dörrarna (som scripts/order310b-check.mjs).
  const vidare = p.getByRole('button', { name: 'Vidare' });
  for (let i = 0; i < 5 && (await vidare.count()) > 0; i++) { await vidare.first().click(); await delay(400); }
  if (await p.$('[data-testid=open-buy-foot]')) {
    await p.click('[data-testid=open-buy-foot]');
    await p.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {});
    await p.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
  }
  await p.click('[data-testid=open-doors]');
  await delay(500);
  if (await p.$('[data-testid=open-short-open]')) await p.click('[data-testid=open-short-open]');
  await p.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => p.click('[data-testid=mentor-close-service]')).catch(() => {});
  await p.waitForSelector(`[data-testid=incident-card][data-incident-id=${INCIDENT}]`, { timeout: 120000 });
  row.count = await p.locator('[data-testid=rocket-count]').innerText();
  if (/Följd|Follow/i.test(row.count)) fail(`${tag}: kortet säger "${row.count}"`);
  await shot('kortet');
  for (let step = 0; step < BEST.length; step++) {
    await p.waitForSelector(`[data-testid=incident-card][data-mode=ask]:not([data-locked]):not([data-choosing])`, { timeout: 30000 });
    const ids = await p.$$eval('[data-testid=incident-card] [data-testid^=incident-option-]:not([disabled])', (es) => es.map((e) => e.getAttribute('data-option-id')));
    const pick = ids.find((id) => BEST[step].includes(id)) ?? ids[0];
    await p.click(`[data-testid=incident-option-${pick}]`);
    await delay(2000);
    row.moments.push({ step, at: 'wait', ...(await p.evaluate(measure)) });
    if (step === 0) await shot('vantan');
    const choosing = await p.waitForSelector('[data-testid=incident-card][data-choosing=true]', { timeout: 15000 }).then(() => true).catch(() => false);
    if (!choosing) break;
    await delay(900);
    row.moments.push({ step, at: 'choice', ...(await p.evaluate(measure)) });
    await shot(`valet-${step + 1}`);
    // Teckenförklaringen: stängd från början, öppnas med tangenten.
    // Statusläget (S): teckenförklaringen stängd, med tangenten i hörnet; L öppnar den.
    await p.keyboard.press('s');
    await delay(300);
    row.moments.push({ step, at: 'status', ...(await p.evaluate(measure)) });
    await shot(`valet-${step + 1}-status`);
    await p.keyboard.press('l');
    await delay(300);
    row.moments.push({ step, at: 'legend', ...(await p.evaluate(measure)) });
    await shot(`valet-${step + 1}-teckenforklaring`);
    await p.keyboard.press('l');
    await p.keyboard.press('s');
    await p.keyboard.press('2');
    await delay(400);
  }
  for (const m of row.moments) {
    if (m.overlaps.length) fail(`${tag} steg ${m.step + 1} ${m.at}: ${m.overlaps.map((o) => o.join(' / ')).join('; ')}`);
    if (m.outside.length) fail(`${tag} steg ${m.step + 1} ${m.at}: utanför fönstret ${m.outside.join(', ')}`);
    if (m.pyramids.some((y) => !y.inRow)) fail(`${tag} steg ${m.step + 1} ${m.at}: en pyramid står utanför raden`);
    if (m.legendHeadClipped) fail(`${tag} steg ${m.step + 1} ${m.at}: rubriken i teckenförklaringen klipps`);
  }
  const status = row.moments.find((m) => m.at === 'status');
  if (!status || status.legendOpen) fail(`${tag}: teckenförklaringen är öppen från början`);
  if (status?.legendKey !== 'L') fail(`${tag}: tangenten står inte i hörnet (${status?.legendKey})`);
  for (const m of row.moments.filter((x) => x.at === 'choice' || x.at === 'wait')) {
    if (m.ifRight !== null && m.at === 'choice' && Number(m.ifRight) !== Number(m.pot) * 2 + 1) fail(`${tag} steg ${m.step + 1}: Om rätt ${m.ifRight} med potten ${m.pot}`);
  }
  if (!row.moments.some((m) => m.at === 'legend' && m.legendOpen)) fail(`${tag}: teckenförklaringen öppnades inte med tangenten`);
  await ctx.close();
}

try {
  await run(1440, 900);
  await run(1280, 720);
} catch (e) {
  fail(`FEL ${e.message}`);
} finally {
  await browser.close();
  try { process.kill(-preview.pid); } catch { /* redan stängd */ }
}
writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.errors, null, 1), result.ok);
