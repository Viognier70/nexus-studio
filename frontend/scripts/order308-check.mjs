// ORDER 308 — öppningen (Designs D2, omtag 2026-10-04) i spelarens flöde,
// produktionsbygget (vite build + preview):
//   A. startskärmen → Nytt spel → namn och samtycke → öppningen (hela, 41 s)
//      → första morgonen (regelkortet). Skärmar vid Designs sex tider
//      (skarmar/: oppning-texten, -nalen-din-vinbar, -raden-tom,
//      -raden-det-du-vet, -nalen-ingrid, -raden-stjarnan), på svenska, och
//      oppning-taket-lyfts (rummet tomt när taket lyfts).
//   B. Hoppa över: en tangent före 3 s hoppar inte över; knappen syns från
//      3 s och tar spelaren till regelkortet.
//   C. Minskad rörelse (prefers-reduced-motion): kamerans avstånd står still
//      i flygturen (spelets kamera, body.dataset.camDistance, CameraController).
//   D. Engelska: raderna och nålen på engelska.
// Varje nätverksanrop loggas; allt utom förhandsvisningens egen server räknas
// som fel (öppningen får inte hämta något, t.ex. three.js från ett CDN).
// Tiden läses ur överläggets data-t (öppningens klocka, OpeningSequence.tsx),
// inte ur väggklockan: med långsam rendering går öppningens tid långsammare.
// ORDER 308b: nålen över krogen heter Vinbaren som kan bli din / The wine bar
// that could be yours (summary.pinVenue, summary.english); E. den som har sett
// öppningen ser den igen och kan hoppa över direkt (summary.returning*). Ljuset
// mot Designs skärmar mäts av scripts/order308b-ljus.mjs ur skärmarna här.
// FLOWS=full,skip,reduced,english,returning väljer flödena (förval alla).
// Utdata: reports/<REPORT_ORDER|order308b>/check.json och oppning-*.png.
//
//   [REPORT_ORDER=order308b] [SKIP_BUILD=1] [PORT=4188] [SIZE=1280x720] [FLOWS=…] node scripts/order308-check.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order308b');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4188);
const URL = `http://localhost:${PORT}`;
const FLOWS = new Set((process.env.FLOWS ?? 'full,skip,reduced,english,returning').split(','));
const [W, H] = (process.env.SIZE ?? '1280x720').split('x').map(Number);
// Designs skärmar (LEVERANSNOT §2), och taket som lyfts, och en tid i varje, mitt i radens eller nålens fönster (oppningManus.js).
const SHOTS = [
  { name: 'oppning-texten', t: 9.0 },
  { name: 'oppning-nalen-din-vinbar', t: 14.6 },
  // Ingen av Designs sex skärmar: taket lyfts och rummet är tomt (vinbarens figurer dolda).
  { name: 'oppning-taket-lyfts', t: 16.3 },
  { name: 'oppning-raden-tom', t: 21.0 },
  { name: 'oppning-raden-det-du-vet', t: 28.5 },
  { name: 'oppning-nalen-ingrid', t: 35.6 },
  { name: 'oppning-raden-stjarnan', t: 38.6 }
];

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', size: `${W}×${H}`, errors: [], externalRequests: [], flows: {} };

async function newPage(lang, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...extra });
  await ctx.addInitScript((lang) => { if (!sessionStorage.getItem('o308')) { localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('o308', '1'); } }, lang);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(URL) && !u.startsWith('data:') && !u.startsWith('blob:')) report.externalRequests.push(u); });
  return { ctx, page };
}

/** Startskärmen → Nytt spel → namn och samtycke → Signera; tillbaka när öppningen syns. */
async function toOpening(page) {
  const steps = [];
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  steps.push('start-screen');
  await page.click('[data-testid=new-game]');
  await page.waitForSelector('[data-testid=register-screen]');
  steps.push('register-screen');
  await page.fill('[data-testid=register-name]', 'Anders');
  await page.click('[data-testid=register-sign]');
  await page.waitForSelector('[data-testid=opening]', { timeout: 60000 });
  steps.push('opening');
  return steps;
}

const openingT = (page) => page.$eval('[data-testid=opening]', (el) => Number(el.getAttribute('data-t'))).catch(() => null);
async function waitT(page, t, timeoutMs = 240000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) { const now = await openingT(page); if (now === null || now >= t) return now; await delay(40); }
  return openingT(page);
}
/** Vad spelaren ser i överlägget: raderna med synlig opacitet, nålarna och om regelkortet syns. */
const visible = (page) => page.evaluate(() => {
  const op = (el) => (el ? Number(getComputedStyle(el).opacity) : 0);
  const txt = (sel) => { const el = document.querySelector(sel); return el && op(el) > 0.05 ? el.textContent.trim() : null; };
  const rules = document.querySelector('[data-testid=rules-card]');
  const ov = document.querySelector('[data-testid=opening]');
  return {
    t: ov ? Number(ov.getAttribute('data-t')) : null,
    shot: ov?.getAttribute('data-shot') ?? null,
    title: [...document.querySelectorAll('[data-testid=opening-title] span')].filter((s) => op(s) > 0.05).map((s) => s.textContent.trim()),
    caption: txt('[data-testid=opening-caption]'),
    pins: [...document.querySelectorAll('[data-testid^=opening-pin-]')].filter((p) => op(p) > 0.05).map((p) => ({ id: p.getAttribute('data-testid'), label: p.textContent.trim(), x: Math.round(parseFloat(p.style.left)), y: Math.round(parseFloat(p.style.top)) })),
    black: Number(getComputedStyle(document.querySelector('.nx-opening-black') ?? document.body).opacity),
    skip: !!document.querySelector('[data-testid=opening-skip]'),
    rulesVisible: !!rules && getComputedStyle(rules).visibility !== 'hidden',
    // Byns etiketter (drei Html i dukens behållare) syns inte under öppningen.
    villageLabelsVisible: [...document.querySelectorAll('.gb-canvas-host div:not(:has(canvas))')].filter((el) => el.textContent.trim() && getComputedStyle(el).visibility !== 'hidden').length,
    // Ingrid (OpeningMentor.tsx), riggens rot i scenen.
    mentor: window.__nxOpeningMentor ? { visible: window.__nxOpeningMentor.visible, x: Math.round(window.__nxOpeningMentor.position.x * 10) / 10, z: Math.round(window.__nxOpeningMentor.position.z * 10) / 10 } : null,
    streetLampsLit: Number(document.body.dataset.streetLampsLit ?? NaN),
    camDistance: Number(document.body.dataset.camDistance ?? NaN)
  };
});

try {
  // A. Hela öppningen på svenska.
  if (FLOWS.has('full')) {
    const { ctx, page } = await newPage('sv');
    const flow = { steps: await toOpening(page), shots: [] };
    flow.rulesDuringOpening = (await visible(page)).rulesVisible;
    const wallStart = Date.now();
    for (const s of SHOTS) {
      await waitT(page, s.t);
      const v = await visible(page);
      await page.screenshot({ path: resolve(OUT, `${s.name}-${W}x${H}.png`) });
      flow.shots.push({ name: s.name, want: s.t, ...v });
      console.log(s.name, JSON.stringify({ t: v.t, shot: v.shot, title: v.title, caption: v.caption, pins: v.pins.map((p) => p.label) }));
    }
    await page.waitForSelector('[data-testid=rules-card]', { state: 'visible', timeout: 240000 });
    await page.waitForSelector('[data-testid=opening]', { state: 'detached', timeout: 30000 });
    flow.wallSeconds = Math.round((Date.now() - wallStart) / 100) / 10;
    flow.steps.push('rules-card');
    flow.rulesAfter = (await visible(page)).rulesVisible;
    await delay(500);
    await page.screenshot({ path: resolve(OUT, `oppning-morgonen-efter-${W}x${H}.png`) });
    flow.seenFlag = await page.evaluate(() => localStorage.getItem('nexus.openingSeen'));
    report.flows.full = flow;
    await ctx.close();
  }
  // B. Hoppa över.
  if (FLOWS.has('skip')) {
    const { ctx, page } = await newPage('sv');
    const flow = { steps: await toOpening(page) };
    await waitT(page, 1.0);
    flow.skipAt1 = (await visible(page)).skip;
    await page.keyboard.press('Space');
    await delay(300);
    flow.afterEarlyKey = await visible(page);
    flow.earlyKeyIgnored = flow.afterEarlyKey.t !== null && flow.afterEarlyKey.t < 5;
    await waitT(page, 3.3);
    const before = await visible(page);
    flow.skipAt33 = before.skip;
    await page.screenshot({ path: resolve(OUT, `oppning-hoppa-over-${W}x${H}.png`) });
    const t0 = Date.now();
    await page.click('[data-testid=opening-skip]');
    await page.waitForSelector('[data-testid=rules-card]', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('[data-testid=opening]', { state: 'detached', timeout: 30000 });
    flow.skipToRulesMs = Date.now() - t0;
    flow.steps.push('skip', 'rules-card');
    report.flows.skip = flow;
    await ctx.close();
  }
  // C. Minskad rörelse.
  if (FLOWS.has('reduced')) {
    const { ctx, page } = await newPage('sv', { reducedMotion: 'reduce' });
    const flow = { steps: await toOpening(page), samples: [] };
    flow.reducedAttr = await page.$eval('[data-testid=opening]', (el) => el.getAttribute('data-reduced'));
    for (const t of [2, 5, 8, 11, 13, 16]) { await waitT(page, t); flow.samples.push(await visible(page)); }
    const fly = flow.samples.filter((s) => s.shot === 'fly').map((s) => s.camDistance);
    const descend = flow.samples.filter((s) => s.shot === 'descend').map((s) => s.camDistance);
    flow.flyDistances = fly;
    flow.descendDistances = descend;
    flow.cameraStillInFly = fly.length > 1 && Math.max(...fly) - Math.min(...fly) <= 1;
    flow.cameraStillInDescend = descend.length > 1 && Math.max(...descend) - Math.min(...descend) <= 1;
    await page.screenshot({ path: resolve(OUT, `oppning-minskad-rorelse-${W}x${H}.png`) });
    await page.click('[data-testid=opening-skip]');
    await page.waitForSelector('[data-testid=rules-card]', { state: 'visible', timeout: 30000 });
    flow.steps.push('skip', 'rules-card');
    report.flows.reduced = flow;
    await ctx.close();
  }
  // D. Engelska.
  if (FLOWS.has('english')) {
    const { ctx, page } = await newPage('en');
    const flow = { steps: await toOpening(page), shots: [] };
    for (const s of [SHOTS[0], SHOTS[1], SHOTS[3]]) {
      await waitT(page, s.t);
      const v = await visible(page);
      await page.screenshot({ path: resolve(OUT, `${s.name}-en-${W}x${H}.png`) });
      flow.shots.push({ name: s.name, want: s.t, ...v });
    }
    await page.click('[data-testid=opening-skip]');
    await page.waitForSelector('[data-testid=rules-card]', { state: 'visible', timeout: 30000 });
    report.flows.english = flow;
    await ctx.close();
  }
  // E. Den som har sett öppningen (ORDER 308b, Anders 2026-10-05): öppningen
  // spelas igen, och Hoppa över syns och fungerar direkt, före 3 s.
  if (FLOWS.has('returning')) {
    const { ctx, page } = await newPage('sv');
    await ctx.addInitScript(() => localStorage.setItem('nexus.openingSeen', '1'));
    const flow = { steps: await toOpening(page) };
    await waitT(page, 0.3);
    const v = await visible(page);
    flow.openingShown = v.t !== null;
    flow.tAtCheck = v.t;
    flow.skipShownBefore3s = v.skip && v.t < 3;
    await page.screenshot({ path: resolve(OUT, `oppning-sett-forut-${W}x${H}.png`) });
    const t0 = Date.now();
    await page.click('[data-testid=opening-skip]');
    await page.waitForSelector('[data-testid=rules-card]', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('[data-testid=opening]', { state: 'detached', timeout: 30000 });
    flow.skipToRulesMs = Date.now() - t0;
    flow.steps.push('skip', 'rules-card');
    report.flows.returning = flow;
    await ctx.close();
  }
} catch (e) {
  report.error = String(e?.message ?? e);
  console.log('FEL', report.error);
} finally {
  const f = report.flows;
  report.summary = {
    order: f.full?.steps?.join(' → ') ?? null,
    rulesHiddenDuringOpening: f.full ? f.full.rulesDuringOpening === false : null,
    villageLabelsDuringOpening: f.full?.shots?.map((s) => s.villageLabelsVisible) ?? null,
    mentorAtPin: f.full?.shots?.find((s) => s.name === 'oppning-nalen-ingrid')?.mentor ?? null,
    streetLampsLit: f.full?.shots?.map((s) => s.streetLampsLit) ?? null,
    wallSeconds: f.full?.wallSeconds ?? null,
    shotsWithText: f.full?.shots?.map((s) => ({ name: s.name, t: s.t, text: [...s.title, s.caption, ...s.pins.map((p) => p.label)].filter(Boolean) })) ?? null,
    skipHiddenBefore3s: f.skip ? f.skip.skipAt1 === false : null,
    earlyKeyIgnored: f.skip?.earlyKeyIgnored ?? null,
    skipShownAt3s: f.skip?.skipAt33 ?? null,
    skipToRulesMs: f.skip?.skipToRulesMs ?? null,
    reducedAttr: f.reduced?.reducedAttr ?? null,
    reducedCameraStillInFly: f.reduced?.cameraStillInFly ?? null,
    reducedCameraStillInDescend: f.reduced?.cameraStillInDescend ?? null,
    pinVenue: f.full?.shots?.find((s) => s.name === 'oppning-nalen-din-vinbar')?.pins?.map((p) => p.label) ?? null,
    returningOpeningShown: f.returning?.openingShown ?? null,
    returningSkipBefore3s: f.returning?.skipShownBefore3s ?? null,
    returningSkipAtT: f.returning?.tAtCheck ?? null,
    returningSkipToRulesMs: f.returning?.skipToRulesMs ?? null,
    english: f.english?.shots?.map((s) => [...s.title, s.caption, ...s.pins.map((p) => p.label)].filter(Boolean)) ?? null,
    externalRequests: report.externalRequests.length,
    errors: report.errors.length
  };
  writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 1));
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
