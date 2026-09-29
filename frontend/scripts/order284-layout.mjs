// ORDER 284 — knapparna som behövs för att gå vidare syns alltid, i alla
// skärmstorlekar, och klockan täcker aldrig dagens namn eller rubriken
// (Vision Owner 2026-09-29, tredje provspelet: "'Open for the evening'
// hamnade under skärmen", "Klockan täcker dagens namn och morgonens
// rubrik").
//
// Produktionsbygget (vite build + preview på port 4175). Spelet laddas ur
// en sparfil: måndag morgon vecka 2 i vinbaren, 120 000 kr, inga krediter
// (skapas av src/strategic/testHarness/__tests__/order284Layout.test.ts med
// WRITE_REPORTS=1, reports/order284/save-mandag-vinbaren.json). Sparfilen är
// en genväg till morgonen, inte spelarens flöde från bussen; spelarens flöde
// prövas av veckoskriptet (order271-dod-from-start.mjs) i 1920 × 1080.
//
// För varje skärm (morgonen, inköpen M1, servicen, sopbilen S1, lärdomen L1,
// berättelsen K1) byts fönstrets storlek genom sju storlekar. Varje knapp
// som behövs för att gå vidare mäts: hela rutan inom fönstret utan att
// skrolla, och elementet överst i sin mittpunkt (inte täckt). Klockans ruta
// mäts mot dagsmärket och skärmens rubrik. Under servicen prövas också att
// klockan i Back your knowledge stannar när svaret är valt.
//
// Utdata: reports/order284/layout.json och layout-*.png.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order284');
mkdirSync(OUT, { recursive: true });
const PORT = 4175;
const URL = `http://localhost:${PORT}`;
const SIZES = [
  [1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1024, 768], [844, 390], [390, 844]
];

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
const errors = [];
const report = { url: `${URL}/`, build: 'produktion (vite build + preview)', save: 'reports/order284/save-mandag-vinbaren.json', sizes: SIZES.map(([w, h]) => `${w}×${h}`), screens: {}, backClock: null, story: null, errors };
const SAVE = readFileSync(resolve(OUT, 'save-mandag-vinbaren.json'), 'utf8');
const ctx = await browser.newContext({ viewport: { width: SIZES[0][0], height: SIZES[0][1] } });
await ctx.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('order284-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('order284-seeded', '1'); }
}, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 600)}`));

// Ett element är synligt för spelaren när hela rutan ligger i fönstret och
// elementet (eller något inuti det) är överst i rutans mittpunkt.
async function visible(sel) {
  // "prefix*": alla element vars testid börjar så, och alla ska synas.
  if (sel.endsWith('*]')) {
    const n = await page.$$eval(sel.replace('=', '^=').replace('*]', ']'), (els) => els.length);
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(await visibleNth(sel.replace('=', '^=').replace('*]', ']'), i));
    return { found: n > 0, count: n, ok: n > 0 && parts.every((p) => p.ok), parts };
  }
  return visibleNth(sel, 0);
}
async function visibleNth(sel, nth) {
  return page.evaluate(([s, k]) => {
    const el = document.querySelectorAll(s)[k];
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight;
    const inside = r.width > 0 && r.height > 0 && r.left >= -0.5 && r.top >= -0.5 && r.right <= W + 0.5 && r.bottom <= H + 0.5;
    const top = document.elementFromPoint(Math.min(W - 1, Math.max(0, r.left + r.width / 2)), Math.min(H - 1, Math.max(0, r.top + r.height / 2)));
    const onTop = !!top && (top === el || el.contains(top));
    return { found: true, inside, onTop, ok: inside && onTop, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] };
  }, [sel, nth]);
}

// Överlapp mellan två elements rutor, i px².
async function overlap(a, b) {
  return page.evaluate(([x, y]) => {
    const ea = document.querySelector(x), eb = document.querySelector(y);
    if (!ea || !eb) return null;
    const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
    const l = Math.max(ra.left, rb.left), t = Math.max(ra.top, rb.top);
    const w = Math.max(0, Math.min(ra.right, rb.right) - l);
    const h = Math.max(0, Math.min(ra.bottom, rb.bottom) - t);
    if (w * h === 0) return 0;
    // Bara synligt överlapp räknas: klockan (a) överst mitt i överlappet.
    // Ligger en helskärmsvy över klockan täcker den ingenting.
    const top = document.elementFromPoint(l + w / 2, t + h / 2);
    return top && ea.contains(top) ? Math.round(w * h) : 0;
  }, [a, b]);
}

async function measure(name, buttons, heading) {
  const rows = [];
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await delay(450);
    const row = { size: `${w}×${h}`, buttons: {}, clockOverDay: await overlap('[data-testid=service-clock]', '[data-testid=day-badge]'), clockOverHeading: heading ? await overlap('[data-testid=service-clock]', heading) : null, clockOverCash: (await overlap('[data-testid=service-clock]', '[data-testid=cash-counter]')) || (await overlap('[data-testid=cash-counter]', '[data-testid=service-clock]')) };
    for (const b of buttons) row.buttons[b] = await visible(`[data-testid=${b}]`);
    row.ok = Object.values(row.buttons).every((v) => v.ok) && !row.clockOverDay && !row.clockOverHeading && !row.clockOverCash;
    rows.push(row);
    await page.screenshot({ path: resolve(OUT, `layout-${name}-${w}x${h}.png`) });
  }
  await page.setViewportSize({ width: SIZES[0][0], height: SIZES[0][1] });
  await delay(300);
  report.screens[name] = { ok: rows.every((r) => r.ok), rows };
  console.log(name, rows.map((r) => `${r.size}:${r.ok ? 'ok' : 'FEL'}`).join(' '));
}

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);

  // Morgonen: inköpen och öppna. Utan lager är huvudknappen inköpen.
  await measure('morgonen', ['open-buy-foot'], '[data-testid=day-action-bar] h1');

  // M1: tillbaka och öppna dörrarna.
  await page.click('[data-testid=open-buy]');
  await page.waitForSelector('[data-testid=screen-M1]');
  await delay(600);
  await measure('M1', ['buy-back', 'open-doors'], '[data-testid=screen-M1] h1');
  await page.click('[data-testid=buy-base]');
  await delay(1500);
  await page.click('[data-testid=open-doors]');

  // Servicen: klockan mot dagsmärket, och Back your knowledge.
  await page.waitForSelector('[data-testid=event-stream]', { timeout: 60000 });
  await delay(1500);
  await measure('servicen', ['back-start'], null);

  // Back your knowledge: när svaret är valt står klockan.
  for (let i = 0; i < 240 && !report.backClock; i++) {
    const card = await page.$('[data-testid=incident-card]');
    if (card && (await card.getAttribute('data-backed')) !== 'true') {
      // En vanlig raket: svaren ska synas (mäts en gång), sedan första
      // alternativet som går.
      if (!report.screens.raketkortet && !(await page.$('[data-testid=incident-band]'))) await measure('raketkortet', ['incident-option-*'], null);
      const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
      if (opt) await opt.click().catch(() => {});
      await delay(800);
      continue;
    }
    const btn = await page.$('[data-testid=back-start]:not([disabled])');
    if (!btn) { await delay(1000); continue; }
    await btn.click();
    await page.waitForSelector('[data-testid=incident-card][data-backed=true]', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('[data-testid=incident-band]'), null, { timeout: 30000 }).catch(() => {});
    await delay(2500);
    const t0 = Number(await page.textContent('[data-testid=incident-countdown]'));
    await delay(2500);
    const t1 = Number(await page.textContent('[data-testid=incident-countdown]'));
    await page.click('[data-testid^=incident-option-]:not([disabled])');
    await delay(300);
    const t2 = Number(await page.textContent('[data-testid=incident-countdown]'));
    await delay(6000);
    const t3 = Number(await page.textContent('[data-testid=incident-countdown]'));
    const optionsShownAfterPick = await page.$$eval('[data-testid^=incident-option-]', (els) => els.length);
    const hint = await page.textContent('[data-testid=back-picked-hint]').catch(() => null);
    const earn = await page.textContent('[data-testid=back-earn-card]').catch(() => null);
    await page.screenshot({ path: resolve(OUT, 'layout-back-klockan-star.png') });
    // Med klockan stående: svaren, säkerheten och Stå för svaret ska synas.
    await measure('B1', ['incident-option-*', 'back-level-0', 'back-level-1', 'back-level-2', 'back-lock'], null);
    report.backClock = { beforePick: [t0, t1], afterPick: [t2, t3], runsBeforePick: t1 < t0, stopsAfterPick: t3 === t2, optionsShownAfterPick, hint, earn };
    console.log('backClock', JSON.stringify(report.backClock));
    await page.click('[data-testid=back-level-0]');
    await page.click('[data-testid=back-lock]');
  }

  // Resten av kvällen: svara på raketerna tills sopbilen kommer.
  for (let i = 0; i < 1800 && !(await page.$('[data-testid=screen-S1]')); i++) {
    const card = await page.$('[data-testid=incident-card]');
    if (card && !(await page.$('[data-testid=incident-band]'))) {
      const backed = await card.getAttribute('data-backed');
      if (backed !== 'true' && !report.screens.raketkortet) await measure('raketkortet', ['incident-option-*'], null);
      const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
      if (opt) await opt.click().catch(() => {});
      if (backed === 'true') { await page.click('[data-testid=back-level-0]').catch(() => {}); await page.click('[data-testid=back-lock]').catch(() => {}); }
    }
    await delay(500);
  }
  await page.waitForSelector('[data-testid=screen-S1]', { timeout: 60000 });
  await delay(9000);
  await measure('S1', ['waste-continue'], '[data-testid=screen-S1] h1');
  await page.click('[data-testid=waste-continue]');

  await page.waitForSelector('[data-testid=screen-L1]', { timeout: 30000 });
  await delay(800);
  await measure('L1', ['to-evening-story'], '[data-testid=screen-L1] h1');
  await page.click('[data-testid=to-evening-story]');

  await page.waitForSelector('[data-testid=screen-K1]', { timeout: 30000 });
  await delay(800);
  await measure('K1', ['end-evening'], '[data-testid=screen-K1] h1');
  const paragraph = await page.textContent('[data-testid=evening-story]').catch(() => '');
  const wrong = await page.$$eval('[data-testid=story-wrong] li', (els) => els.length).catch(() => 0);
  report.story = { saysNothingToLearn: /nothing to learn/i.test(paragraph ?? ''), wrongItems: wrong, agrees: !(/nothing to learn/i.test(paragraph ?? '') && wrong > 0) };
  console.log('story', JSON.stringify(report.story));
} catch (e) {
  report.error = String(e?.message ?? e);
  console.log('FEL', report.error);
  await page.screenshot({ path: resolve(OUT, 'layout-99-fel.png') }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'layout.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  // Hela processgruppen (npx och vite), annars blir vite kvar på porten.
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
