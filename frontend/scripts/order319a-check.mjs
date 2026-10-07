// ORDER 319a — kontrollen i spelarens flöde (produktionsbygget, sparfilen måndag vecka 2 som
// foodtruck, som scripts/order315b-2-check.mjs): servicen startas, Krogen (Z) går till vagnen, och
// under CHECK_SECONDS i normal fart följs varje gästfigur vid vagnen bild för bild (window.__nxTruckCrew
// guests, figurens userData.guestId) mot spelets kamera (window.__nxTruckCamera):
//   319a.1 — ingen figur dyker upp eller försvinner inom kamerans bild, och ingen närmare än 40 m
//            från vagnen;
//   319a.4 — kort som öppnas: förvarningen (cue) och om gästen som pekar syns.
// Kontrollbilder i 1440 × 900 och 1280 × 720.
// Utdata: reports/order319a/check-<lang>.json och check-<lang>-*.png.
//
//   npm run build && SKIP_BUILD=1 node scripts/order319a-check.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order319a');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4186);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'sv';
const CHECK_SECONDS = Number(process.env.CHECK_SECONDS ?? 120);
// Samma gräns som scene/village/truckGuestFlow.ts TRUCK_GUESTS.minSpawnM (skriptet kan inte importera TS).
const MIN_SPAWN_M = 40;

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
const truck = JSON.parse(JSON.stringify(base));
truck.sim.economy = { ...truck.sim.economy, businessClass: 'foodtruck', loan: null };
truck.sim.businessClass = 'foodtrucken';
truck.sim.ladder = { step: 'foodtruck', reachedOnDay: { foodtruck: 1 }, offer: null };
const SAVE = JSON.stringify(truck);

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', lang: LANG, checkSeconds: CHECK_SECONDS, minSpawnM: MIN_SPAWN_M, errors: [], viewports: [], ok: false };

async function run(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([key, value, lang]) => {
    if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('seeded', '1'); }
  }, ['nexus.v1.slot1', SAVE, LANG]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(`${width}x${height}: ${e.message}`));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar], [data-testid=evening-bar]', { timeout: 60000 });
  await delay(1500);
  if (await page.$('[data-testid=morning-review-backdrop]')) { await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {}); await delay(500); }
  await page.click('[data-testid=start-service]').catch(() => {});
  await delay(800);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 6000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.mouse.click(Math.round(width / 2), Math.round(height / 2)).catch(() => {});
  await page.keyboard.press('z');
  await delay(3000);
  // Följ figurerna bild för bild i sidan.
  await page.evaluate(([seconds, minM]) => {
    const w = window;
    const out = { frames: 0, seen: 0, spawnInView: [], despawnInView: [], spawnNear: [], despawnNear: [], cues: [], maxFigures: 0 };
    w.__nx319 = out;
    const last = new Map();
    const t0 = performance.now();
    const step = () => {
      const c = w.__nxTruckCrew, cam = w.__nxTruckCamera;
      if (c && cam && c.guests) {
        const V = cam.position.constructor;
        const P = cam.projectionMatrix.constructor;
        const m = new P().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        // Frustum ur matrisen (samma som THREE.Frustum.setFromProjectionMatrix): punkten i klipprummet.
        const inView = (x, y, z) => { const v = new V(x, y, z).applyMatrix4(m); return v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1 && v.z >= -1 && v.z <= 1; };
        const at = c.g.position;
        const now = new Map();
        for (const o of c.guests.children) {
          if (!o.visible || !o.userData.guestId) continue;
          const p = o.position;
          const seenNow = inView(p.x, 0.1, p.z) || inView(p.x, 1.7, p.z);
          now.set(o.userData.guestId, { x: p.x, z: p.z, inView: seenNow, d: Math.hypot(p.x - at.x, p.z - at.z) });
        }
        // Figurer som redan fanns när mätningen började räknas inte som nya.
        if (out.frames === 0) for (const id of now.keys()) out.before = [...(out.before ?? []), id];
        for (const [id, s] of now) if (!last.has(id) && out.frames > 0) { out.seen++; if (s.inView) out.spawnInView.push({ id, ...s }); if (s.d < minM) out.spawnNear.push({ id, ...s }); }
        for (const [id, s] of last) if (!now.has(id)) { if (s.inView) out.despawnInView.push({ id, ...s }); if (s.d < minM) out.despawnNear.push({ id, ...s }); }
        last.clear(); for (const [k, v] of now) last.set(k, v);
        out.maxFigures = Math.max(out.maxFigures, now.size);
        out.frames++;
      }
      if (performance.now() - t0 < seconds * 1000) requestAnimationFrame(step); else out.done = true;
    };
    requestAnimationFrame(step);
  }, [CHECK_SECONDS, MIN_SPAWN_M]);
  const shots = [];
  for (let i = 0; i < 3; i++) {
    await delay((CHECK_SECONDS * 1000) / 4);
    const name = `check-${LANG}-${width}x${height}-${i + 1}.png`;
    await page.screenshot({ path: resolve(OUT, name) });
    shots.push(name);
  }
  await page.waitForFunction(() => window.__nx319?.done === true, null, { timeout: CHECK_SECONDS * 1000 + 60000 });
  const r = await page.evaluate(() => window.__nx319);
  report.viewports.push({ width, height, level: await page.evaluate(() => document.body.dataset.level ?? null), shots, ...r });
  await ctx.close();
}

try {
  await run(1440, 900);
  await run(1280, 720);
  report.ok = report.errors.length === 0 && report.viewports.every((v) => v.level === 'room' && v.seen > 0 && v.spawnInView.length === 0 && v.despawnInView.length === 0 && v.spawnNear.length === 0 && v.despawnNear.length === 0);
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, error: report.error ?? null, viewports: report.viewports.map((v) => ({ w: v.width, seen: v.seen, frames: v.frames, inView: v.spawnInView.length + v.despawnInView.length, near: v.spawnNear.length + v.despawnNear.length, max: v.maxFigures })) }));
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
