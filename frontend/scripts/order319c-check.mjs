// ORDER 319c — kontrollen i spelarens flöde (produktionsbygget, sparfilen måndag vecka 2 som foodtruck, som
// scripts/order319b-check.mjs), en gång per väder vid vagnen (sol, regn, blåst, sval kväll; sparfilens
// day.truck, sim/truckLife.ts). Servicen startas i 1×, Krogen (Z) går till vagnen, sedan 4×, och:
//   - skräpet på borden (sparfilen lägger det där): medhjälparen tar ståbord A först, spelaren klickar bort det på C;
//   - pekaren över skylten visar menyn (truck-menu-card) med vegokorven och senapen;
//   - de som äter står vid sina platser (window.__nxTruckLife eating), i regnet vid hyllan;
//   - medhjälparen går ut och tänder marschallerna (errand torches) och de är tända efteråt;
//   - varje figur vid vagnen följs bild för bild (som 319b): ingen dyker upp eller försvinner i bild eller
//     närmare än 40 m, och det minsta avståndet mellan två gäster där spelet ritar dem.
// Kontrollbilder i 1440 × 900 (alla fyra väder) och 1280 × 720 (sval kväll).
// Utdata: reports/order319c/check-<lang>.json och check-<lang>-*.png.
//
//   npm run build && SKIP_BUILD=1 node scripts/order319c-check.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order319c');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4188);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'sv';
// Samma gräns som scene/village/truckGuestFlow.ts TRUCK_GUESTS.minSpawnM (skriptet kan inte importera TS).
const MIN_SPAWN_M = 40;
// Skylten och ståbord C i vagnens ram (scene/truckProps.ts MENU_BOARD och TRUCK_PROPS.standTable.at.C, D9).
const BOARD = [-2.2, 0.6, 3.5];
const TABLE_C = [4.65, 1.25, 2.9];
// Marschallerna tänds från TORCH.fromE (sim/balance.ts).
const TORCH_FROM_E = 0.55;

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

const base = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
function saveFor(weather) {
  const s = JSON.parse(JSON.stringify(base));
  s.sim.economy = { ...s.sim.economy, businessClass: 'foodtruck', loan: null };
  s.sim.businessClass = 'foodtrucken';
  s.sim.ladder = { step: 'foodtruck', reachedOnDay: { foodtruck: 1 }, offer: null };
  s.sim.speed = 1;
  s.sim.day.truck = {
    weather, rainFromE: weather === 'rain' ? 0 : null, litter: { A: 2, B: 2, C: 2 }, errand: null, torchesLit: false,
    tonight: { eaters: 0, takeaway: 0, littered: 0, clearedByAssistant: 0, clearedByPlayer: 0, torchStartE: null, torchWaited: false, hatchEmptySimSeconds: 0 }
  };
  return JSON.stringify(s);
}

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', lang: LANG, minSpawnM: MIN_SPAWN_M, errors: [], runs: [], ok: false };

const life = (page) => page.evaluate(() => window.__nxTruckLife ?? null);
/** En punkt i vagnens ram på skärmen (vagnens grupp och spelets kamera). */
const screenOf = (page, p) => page.evaluate(([x, y, z]) => {
  const c = window.__nxTruckCrew, cam = window.__nxTruckCamera;
  if (!c || !cam) return null;
  const V = cam.position.constructor;
  const v = c.g.localToWorld(new V(x, y, z)).project(cam);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
}, p);

async function run(width, height, weather) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([key, value, lang]) => {
    if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('seeded', '1'); }
  }, ['nexus.v1.slot1', saveFor(weather), LANG]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(`${width}x${height} ${weather}: ${e.message}`));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar], [data-testid=evening-bar]', { timeout: 60000 });
  await delay(1500);
  if (await page.$('[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
  const r = { width, height, weather, shots: [] };
  r.forecast = await page.$eval('[data-testid=truck-forecast]', (el) => ({ weather: el.getAttribute('data-weather'), text: el.textContent })).catch(() => null);
  const shot = async (name) => { const f = `check-${LANG}-${width}x${height}-${weather}-${name}.png`; await page.screenshot({ path: resolve(OUT, f) }); r.shots.push(f); };
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.mouse.click(Math.round(width / 2), Math.round(height / 2)).catch(() => {});
  await page.keyboard.press('z');
  await delay(1500);
  // Skräpet på borden (sparfilen lägger det där): medhjälparen städar ståbord A först, spelaren klickar bort det på
  // ståbord C. Sedan 4×.
  const t0 = await life(page);
  r.litterBefore = t0?.truck?.litter ?? null;
  const tA = await screenOf(page, TABLE_C);
  if (tA) { await page.mouse.move(tA.x, tA.y); await delay(300); r.litterCursor = await page.evaluate(() => document.body.style.cursor); await shot('skrapet'); await page.mouse.click(tA.x, tA.y); }
  await delay(600);
  const t1 = await life(page);
  r.litterAfter = t1?.truck?.litter ?? null;
  r.clearedByPlayer = t1?.truck?.tonight?.clearedByPlayer ?? null;
  r.litterClicks = t1?.litterClicks ?? null;
  await page.mouse.move(5, 5);
  await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
  r.speed = (await life(page))?.speed ?? null;
  // Följ figurerna bild för bild (som 319b).
  await page.evaluate(([minM]) => {
    const w = window;
    const out = { frames: 0, seen: 0, spawnInView: [], despawnInView: [], spawnNear: [], despawnNear: [], minGapM: Infinity, maxFigures: 0 };
    w.__nx319c = out;
    const last = new Map();
    const step = () => {
      const c = w.__nxTruckCrew, cam = w.__nxTruckCamera;
      if (c && cam && c.guests) {
        const V = cam.position.constructor;
        const P = cam.projectionMatrix.constructor;
        const m = new P().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        const inView = (x, y, z) => { const v = new V(x, y, z).applyMatrix4(m); return v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1 && v.z >= -1 && v.z <= 1; };
        const at = c.g.position;
        const now = new Map();
        for (const o of c.guests.children) {
          // Bara figurerna (riggarna har gästens id), inte maten, paraplyerna och andedräkten.
          if (!o.visible || !o.userData.guestId) continue;
          const p = o.position;
          now.set(o.uuid, { id: o.userData.guestId, x: p.x, z: p.z, inView: inView(p.x, 0.1, p.z) || inView(p.x, 1.7, p.z), d: Math.hypot(p.x - at.x, p.z - at.z) });
        }
        for (const [k, s] of now) if (!last.has(k) && out.frames > 0) { out.seen++; if (s.inView) out.spawnInView.push(s); if (s.d < minM) out.spawnNear.push(s); }
        for (const [k, s] of last) if (!now.has(k)) { if (s.inView) out.despawnInView.push(s); if (s.d < minM) out.despawnNear.push(s); }
        const ps = [...now.values()].filter((p) => !String(p.id).endsWith(':child'));
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
          const d = Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z);
          if (d < out.minGapM) { out.minGapM = d; out.minPair = [ps[i].id, ps[j].id, +((ps[i].x + ps[j].x) / 2).toFixed(2), +((ps[i].z + ps[j].z) / 2).toFixed(2), out.frames]; }
        }
        last.clear(); for (const [k, v] of now) last.set(k, v);
        out.maxFigures = Math.max(out.maxFigures, now.size);
        out.frames++;
      }
      if (!out.stop) requestAnimationFrame(step); else out.done = true;
    };
    requestAnimationFrame(step);
  }, [MIN_SPAWN_M]);
  // Menyn när pekaren är över skylten.
  const b = await screenOf(page, BOARD);
  if (b) { await page.mouse.move(b.x, b.y); await delay(500); }
  r.menu = await page.$eval('[data-testid=truck-menu-card]', (el) => el.textContent).catch(() => null);
  await shot('menyn');
  await page.mouse.move(5, 5);
  // De som äter.
  await page.waitForFunction(() => (window.__nxTruckLife?.eating ?? 0) >= 2, null, { timeout: 180000 }).catch(() => {});
  await delay(2500);
  const t2 = await life(page);
  r.eating = t2?.eating ?? 0;
  r.raining = t2?.raining ?? null;
  await shot('de-som-ater');
  // Marschallerna: medhjälparen går ut, och de är tända efteråt.
  await page.waitForFunction((e) => (window.__nxTruckLife?.e ?? 0) >= e && window.__nxTruckLife?.truck?.errand?.kind === 'torches', TORCH_FROM_E, { timeout: 300000 }).catch(() => {});
  await page.waitForFunction(() => { const x = window.__nxTruckLife?.truck?.errand; return x?.kind === 'torches' && x.total - x.left > 22; }, null, { timeout: 120000 }).catch(() => {});
  const t3 = await life(page);
  r.torchRound = t3?.truck?.errand ?? null;
  r.assistantAt = await page.evaluate(() => { const h = window.__nxTruckCrew?.hatch?.position; return h ? [+h.x.toFixed(2), +h.z.toFixed(2)] : null; });
  await shot('marschallerna-tands');
  await page.waitForFunction(() => window.__nxTruckLife?.truck?.torchesLit === true, null, { timeout: 120000 }).catch(() => {});
  await delay(1500);
  const t4 = await life(page);
  r.torchesLit = t4?.truck?.torchesLit ?? false;
  r.tonight = t4?.truck?.tonight ?? null;
  await shot('marschallerna-tanda');
  await page.evaluate(() => { window.__nx319c.stop = true; });
  await page.waitForFunction(() => window.__nx319c?.done === true, null, { timeout: 10000 });
  Object.assign(r, await page.evaluate(() => window.__nx319c));
  r.level = await page.evaluate(() => document.body.dataset.level ?? null);
  report.runs.push(r);
  await ctx.close();
}

try {
  const only = process.env.WEATHERS ? process.env.WEATHERS.split(',') : null;
  for (const w of only ?? ['sun', 'rain', 'wind', 'cool']) await run(1440, 900, w);
  if (!only) await run(1280, 720, 'cool');
  const v = report.runs;
  report.ok = report.errors.length === 0 && v.every((x) =>
    x.level === 'room' && x.seen > 0 && x.spawnInView.length === 0 && x.despawnInView.length === 0 && x.spawnNear.length === 0 && x.despawnNear.length === 0 && x.minGapM >= 0.35
    && x.forecast?.weather === x.weather && x.litterBefore?.C > 0 && x.litterAfter?.C === 0 && x.clearedByPlayer === 1
    && /Vegokorv|Veggie/.test(x.menu ?? '') && /mild/.test(x.menu ?? '')
    && x.eating >= (x.weather === 'rain' ? 1 : 2) && x.raining === (x.weather === 'rain') && x.torchRound?.kind === 'torches' && x.torchesLit === true);
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, error: report.error ?? null, errors: report.errors.slice(0, 3), runs: report.runs.map((x) => ({ w: x.width, weather: x.weather, forecast: x.forecast?.weather, seen: x.seen, inView: x.spawnInView.length + x.despawnInView.length, near: x.spawnNear.length + x.despawnNear.length, minGap: x.minGapM, pair: x.minPair, litter: [x.litterBefore?.C, x.litterAfter?.C, x.clearedByPlayer], menu: !!x.menu, eating: x.eating, raining: x.raining, torch: x.torchRound?.kind, lit: x.torchesLit })) }));
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
