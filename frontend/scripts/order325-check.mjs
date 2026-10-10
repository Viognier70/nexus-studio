// ORDER 325 §2 och §4 (Anders 2026-10-10) — kamerans verkliga avstånd vid Krogen (Z) och kontrollbilderna, i
// produktionsbygget och spelarens flöde (sparfilen måndag vecka 2, reports/order284/save-mandag-vinbaren.json):
//   - vinbaren: sparfilen som den är; bistron: samma sparfil med stegen bistro (som scripts/order315b-2-check.mjs);
//     vagnen: foodtrucken (som scripts/order320-check.mjs);
//   - servicen öppnas som spelaren gör (inköpen och dörrarna, eller Öppna vid vagnen), 4×, kort som kommer besvaras;
//   - tangenten Z, och när kameran har landat (body.dataset.camDistance === camTarget) läses i tre sekunder:
//       camDistance, camTarget, camFov (CameraController.tsx, kameran som ritar bilden) och
//       faceDist / faceDistTruck (faceProbe.ts: avståndet till varje synligt huvud som figureFace.ts update() räknar
//       det, och hur många som visar det nära och det långa skalet);
//   - §4: bilder i vinbaren och vid vagnen vid Z och på 10 m (zooma in med knappen tills kamerans mål är 10 m,
//     balance GRAY_BOX_CAMERA.minDistance), i 1280 × 720 och 1024 × 600. Bistron mäts men får inga bilder.
//   - gatan (§3): på gatans nivå (X) läses vilka gångsätt riggarna spelar (body.dataset.streetGaits, VillageLife.tsx).
// Utdata: reports/order325/kamera.json och kontroll-<plats>-<avstånd>-<w>x<h>.png.
//
//   [SKIP_BUILD=1] [LANG_GAME=sv] node scripts/order325-check.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order325');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4191);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'sv';
const SIZES = [[1280, 720], [1024, 600]];

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));

const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const DAY = base.sim.day.dayNumber;
const variant = (fn) => { const s = JSON.parse(JSON.stringify(base)); fn(s.sim); return JSON.stringify(s); };
const SAVES = {
  vinbaren: variant(() => {}),
  bistron: variant((sim) => { sim.ladder = { step: 'bistro', reachedOnDay: { bistro: DAY - 5 }, offer: null, refit: null }; }),
  vagnen: variant((sim) => {
    sim.economy = { ...sim.economy, businessClass: 'foodtruck', loan: null };
    sim.businessClass = 'foodtrucken';
    sim.ladder = { step: 'foodtruck', reachedOnDay: { foodtruck: 1 }, offer: null };
    sim.day.truck = {
      weather: 'sun', rainFromE: null, litter: { A: 0, B: 0, C: 0 }, errand: null, torchesLit: false, sausagesLeft: 60,
      tonight: { eaters: 0, takeaway: 0, littered: 0, clearedByAssistant: 0, clearedByPlayer: 0, torchStartE: null, torchWaited: false, hatchEmptySimSeconds: 0 }
    };
  })
};
const report = { build: 'produktion (vite build + preview)', lang: LANG, errors: [], places: {}, street: null };

async function open(name, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([key, value, lang]) => {
    if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('seeded', '1'); }
  }, ['nexus.v1.slot1', SAVES[name], LANG]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(`${name} ${w}x${h}: ${e.message}`));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar], [data-testid=evening-bar], [data-testid=open-buy-foot]', { timeout: 60000 }).catch(() => {});
  await delay(1500);
  if (await page.$('[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
  return { ctx, page };
}

async function openService(page, name, fast = true) {
  if (name === 'vagnen') {
    await page.click('[data-testid=start-service]').catch(() => {});
  } else {
    await page.click('[data-testid=open-buy-foot]').catch(() => {});
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 10000 }).catch(() => {});
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
    await page.click('[data-testid=open-doors]').catch(() => {});
  }
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  if (fast) await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
}

async function answerCards(page) {
  // Ett öppet kort (situationen, ett steg i taget, "Välj med 1–4"; svaren är låsta en stund när steget kommer,
  // ORDER 310b): det första svaret i varje steg, tills kortet är borta, högst 40 s.
  const until = Date.now() + 40000;
  while (Date.now() < until) {
    if (!(await page.$('[data-testid^=incident-option-]'))) break;
    const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
    if (opt) await opt.click().catch(() => {});
    else if (await page.$('[data-testid=incident-kvitt-card]')) await page.keyboard.press('2');
    await delay(700);
  }
  const next = await page.$('[data-testid=incident-card] [data-testid=incident-next], [data-testid=incident-continue]');
  if (next) await next.click().catch(() => {});
}

async function landed(page) {
  await page.waitForFunction(() => document.body.dataset.camDistance && document.body.dataset.camDistance === document.body.dataset.camTarget, null, { timeout: 15000 }).catch(() => {});
  await delay(600);
}

async function read(page, key, seconds = 3) {
  const rows = [];
  for (let i = 0; i < seconds * 4; i++) {
    rows.push(await page.evaluate((k) => ({
      camDistance: Number(document.body.dataset.camDistance), camTarget: Number(document.body.dataset.camTarget), camFov: Number(document.body.dataset.camFov),
      level: document.body.dataset.level ?? null, face: document.body.dataset[k] ? JSON.parse(document.body.dataset[k]) : null
    }), key));
    await delay(250);
  }
  const faces = rows.map((r) => r.face).filter((f) => f && f.n > 0);
  const all = (f) => faces.map(f);
  return {
    camDistance: rows[rows.length - 1].camDistance, camTarget: rows[rows.length - 1].camTarget, camFov: rows[rows.length - 1].camFov, level: rows[rows.length - 1].level,
    samples: rows.length, withFaces: faces.length,
    heads: faces.length ? Math.max(...all((f) => f.n)) : 0,
    headMinM: faces.length ? Math.min(...all((f) => f.min)) : null,
    headMedianM: faces.length ? all((f) => f.median).sort((a, b) => a - b)[Math.floor(faces.length / 2)] : null,
    headMaxM: faces.length ? Math.max(...all((f) => f.max)) : null,
    nearShown: faces.length ? Math.max(...all((f) => f.near)) : 0,
    farShown: faces.length ? Math.max(...all((f) => f.far)) : 0
  };
}

try {
  for (const name of (process.env.PLACES ?? 'vinbaren,bistron,vagnen').split(',')) {
    const key = name === 'vagnen' ? 'faceDistTruck' : 'faceDist';
    const sizes = name === 'bistron' ? [SIZES[0]] : SIZES;
    for (const [w, h] of sizes) {
      const { ctx, page } = await open(name, w, h);
      await openService(page, name);
      // Gästerna kommer in och sätter sig (4×), korten som kommer besvaras.
      const until = Date.now() + 40000;
      while (Date.now() < until) { await answerCards(page); await delay(2000); }
      await page.mouse.click(Math.round(w / 2), Math.round(h * 0.55)).catch(() => {});
      await page.keyboard.press('z');
      await landed(page);
      await answerCards(page);
      const atZ = await read(page, key);
      const row = { size: `${w}×${h}`, atZ };
      if (name !== 'bistron') {
        await page.screenshot({ path: resolve(OUT, `kontroll-${name}-Z-${w}x${h}.png`) });
        for (let i = 0; i < 12; i++) {
          const target = await page.evaluate(() => Number(document.body.dataset.camTarget));
          if (target <= 10) break;
          await page.click('[data-testid=camera-in]').catch(() => {});
          await delay(250);
        }
        await landed(page);
        await answerCards(page);
        row.at10 = await read(page, key);
        await page.screenshot({ path: resolve(OUT, `kontroll-${name}-10m-${w}x${h}.png`) });
      }
      report.places[name] = [...(report.places[name] ?? []), row];
      await ctx.close();
    }
  }
  if (process.env.STREET !== '0') // §3 — gatans nivå (X) i vinbarens kväll, direkt när dörrarna har öppnat (1×, före kvällens första situation, då
  // scenens kamera tar över och nivåknapparna inte gäller): gångsätten som riggarna spelar, var 500:e ms i 30 s.
  {
    const [w, h] = SIZES[0];
    const { ctx, page } = await open('vinbaren', w, h);
    await openService(page, 'vinbaren', false);
    await delay(1500);
    await page.click('[data-testid=level-street]').catch(() => page.keyboard.press('x'));
    await landed(page);
    const seen = {};
    let shots = 0;
    const samples = [];
    // Upp till fyra minuter: en bild när riggarna först har figurer och när ett nytt gångsätt syns, högst fyra.
    for (let i = 0; i < 480; i++) {
      await answerCards(page);
      const st = await page.evaluate(() => ({ g: document.body.dataset.streetGaits ?? null, level: document.body.dataset.level ?? null, d: Number(document.body.dataset.camDistance) }));
      if (st.level !== 'street') { await page.click('[data-testid=level-street]').catch(() => {}); await delay(500); continue; }
      const g = st.g ? JSON.parse(st.g) : {};
      const fresh = Object.keys(g).some((k) => !(k in seen));
      for (const [k, v] of Object.entries(g)) seen[k] = Math.max(seen[k] ?? 0, v);
      if (Object.keys(g).length) samples.push({ i, camDistance: st.d, gaits: g });
      if (fresh && shots < 4) await page.screenshot({ path: resolve(OUT, `kontroll-gatan-X-${++shots}-${w}x${h}.png`) });
      if (Object.keys(seen).length >= 6) break;
      await delay(500);
    }
    report.streetSamples = samples.length;
    report.street = { camDistance: await page.evaluate(() => Number(document.body.dataset.camDistance)), level: await page.evaluate(() => document.body.dataset.level ?? null), gaitsSeen: seen };
    await ctx.close();
  }
} finally {
  // PLACES eller STREET=0: de andra platserna och gatan står kvar ur förra körningen.
  let prev = {};
  try { prev = JSON.parse(readFileSync(resolve(OUT, 'kamera.json'), 'utf8')); } catch { /* första körningen */ }
  const merged = { ...prev, ...report, places: { ...(prev.places ?? {}), ...report.places }, street: report.street ?? prev.street ?? null, streetSamples: report.streetSamples ?? prev.streetSamples };
  writeFileSync(resolve(OUT, 'kamera.json'), JSON.stringify(merged, null, 2));
  await browser.close();
  try { process.kill(-proc.pid); } catch { /* redan stängd */ }
}
console.log(JSON.stringify(report, null, 1));
