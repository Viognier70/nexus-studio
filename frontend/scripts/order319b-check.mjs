// ORDER 319b — kontrollen i spelarens flöde (produktionsbygget, sparfilen måndag vecka 2 som foodtruck,
// som scripts/order319a-check.mjs): servicen startas, Krogen (Z) går till vagnen, och:
//   - varje figur vid vagnen följs bild för bild (window.__nxTruckCrew guests, figurens objekt; en
//     nyfiken som ställer sig i kön behåller sin figur) mot spelets kamera (window.__nxTruckCamera):
//     ingen dyker upp eller försvinner i bild eller närmare än 40 m från vagnen;
//   - de nyfikna: bubblan över huvudet (curious-bubble), pekaren över den, klicket öppnar kortet
//     (curious-card) med en fråga i gästens röst (ORDER 319b del 2; frågan läses ur simuleringen,
//     window.__nxCurious, och det rätta svaret ur de nyfiknas metadata på disk), rätt svar (gästen ställer sig i kön, repliken
//     från luckan, hatch-line), fel svar (gästen går vidare) och en som ingen pratar med (går vidare
//     efter fönstret);
//   - det minsta avståndet mellan två gäster vid vagnen där spelet ritar dem.
// Kontrollbilder i 1440 × 900 (alla tre) och 1280 × 720 (bubblan och kortet).
// Utdata: reports/order319b/check-<lang>.json och check-<lang>-*.png.
//
//   npm run build && SKIP_BUILD=1 node scripts/order319b-check.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order319b');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4187);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'sv';
// Samma gräns som scene/village/truckGuestFlow.ts TRUCK_GUESTS.minSpawnM (skriptet kan inte importera TS).
const MIN_SPAWN_M = 40;
// De nyfiknas frågor: bankens metadata (samma fil som sim/curiousBank.ts läser, ORDER 319b del 2).
const META = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/curious/nyfikna.meta.json'), 'utf8'));
const optionsOf = (questionId) => META.questions.find((q) => q.id === questionId)?.options ?? [];

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
const report = { build: 'produktion (vite build + preview)', lang: LANG, minSpawnM: MIN_SPAWN_M, errors: [], viewports: [], ok: false };

// PlayerTruckCrew.tsx lägger simuleringens day.curious i window.__nxCurious varje bild.
const curious = (page) => page.evaluate(() => {
  const c = window.__nxCurious;
  return c ? { current: c.current, last: c.last, tonight: c.tonight } : null;
});
// Gästen står vid skylten (läser) när så här många sekunder gått sedan hen saktade in (balance.ts
// CURIOUS.phaseSeconds slowDown + toSign, 6,5 s): bubblan står då still under pekaren.
const STANDING_S = 7;

async function run(width, height, encounters) {
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
  // Följ figurerna bild för bild i sidan: ett objekt som kommer in i gruppen är en ny figur, ett som
  // lämnar den har gått. Det minsta avståndet mellan två synliga gäster.
  await page.evaluate(([minM]) => {
    const w = window;
    const out = { frames: 0, seen: 0, spawnInView: [], despawnInView: [], spawnNear: [], despawnNear: [], minGapM: Infinity, maxFigures: 0, curiousFigures: 0 };
    w.__nx319b = out;
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
          if (!o.visible) continue;
          const p = o.position;
          now.set(o.uuid, { id: o.userData.guestId, x: p.x, z: p.z, inView: inView(p.x, 0.1, p.z) || inView(p.x, 1.7, p.z), d: Math.hypot(p.x - at.x, p.z - at.z) });
          if (String(o.userData.guestId).startsWith('curious:') && !last.has(o.uuid) && out.frames > 0) out.curiousFigures++;
        }
        for (const [k, s] of now) if (!last.has(k) && out.frames > 0) { out.seen++; if (s.inView) out.spawnInView.push(s); if (s.d < minM) out.spawnNear.push(s); }
        for (const [k, s] of last) if (!now.has(k)) { if (s.inView) out.despawnInView.push(s); if (s.d < minM) out.despawnNear.push(s); }
        const ps = [...now.values()];
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) out.minGapM = Math.min(out.minGapM, Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z));
        last.clear(); for (const [k, v] of now) last.set(k, v);
        out.maxFigures = Math.max(out.maxFigures, now.size);
        out.frames++;
      }
      if (!out.stop) requestAnimationFrame(step); else out.done = true;
    };
    requestAnimationFrame(step);
  }, [MIN_SPAWN_M]);
  const shots = [];
  const shot = async (name) => { const f = `check-${LANG}-${width}x${height}-${name}.png`; await page.screenshot({ path: resolve(OUT, f) }); shots.push(f); };
  const met = [];
  for (const plan of encounters) {
    // En ny nyfiken som har saktat in (inte den förra, vars bubbla kan stå kvar i guld på väg till kön).
    const prev = met.length > 0 ? met[met.length - 1].seq : null;
    await page.waitForFunction((p) => { const c = window.__nxCurious?.current; return !!c && c.seq !== p && c.approachLeft <= 0 && !c.card && !c.answer; }, prev, { timeout: 180000 });
    const before = await curious(page);
    const seq = before?.current?.seq ?? null;
    // Under en situation vid luckan är bubblan dold och fönstret står still (sim/curious.ts).
    const bubble = await page.waitForSelector('[data-testid=curious-bubble][data-state=idle], [data-testid=curious-bubble][data-state=hover]', { timeout: 120000 });
    const e = { plan, seq, bubble: !!bubble };
    if (plan === 'none') {
      await shot(`${met.length + 1}-ingen-pratar`);
      await page.waitForFunction((s) => window.__nxCurious?.last?.seq === s, seq, { timeout: 90000 });
      e.outcome = (await curious(page))?.last?.outcome ?? null;
      met.push(e);
      continue;
    }
    // Pekaren över bubblan när gästen står vid skylten, sedan klicket.
    await page.waitForFunction((t) => (window.__nxCurious?.current?.real ?? 0) >= t, STANDING_S, { timeout: 30000 });
    const box = await bubble.boundingBox();
    if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await delay(400); }
    e.hoverState = await page.$eval('[data-testid=curious-bubble]', (el) => el.getAttribute('data-state')).catch(() => null);
    await shot(`${met.length + 1}-bubblan`);
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForSelector('[data-testid=curious-card]', { timeout: 8000 });
    // window.__nxCurious skrivs i nästa bild efter att kortet öppnats.
    await page.waitForFunction(() => !!window.__nxCurious?.current?.card, null, { timeout: 5000 }).catch(() => {});
    const card = (await curious(page))?.current?.card ?? null;
    e.card = card ? { questionId: card.questionId, moment: card.moment, order: card.order } : null;
    e.sender = await page.$eval('[data-testid=curious-card] .nx-curious-q', (el) => el.textContent).catch(() => null);
    await shot(`${met.length + 1}-kortet`);
    const opts = card ? optionsOf(card.questionId) : [];
    const pick = plan === 'right' ? opts.find((o) => o.quality === 'right') : opts.find((o) => o.quality === 'wrong');
    if (pick) await page.click(`[data-testid=curious-option-${pick.id}]`);
    await delay(900);
    await shot(`${met.length + 1}-svaret`);
    await delay(1000);
    e.hatchLine = !!(await page.$('[data-testid=hatch-line]'));
    e.hatchSender = await page.$eval('[data-testid=hatch-line] .nx-hatch-line-sender', (el) => el.textContent).catch(() => null);
    await shot(`${met.length + 1}-scenen`);
    const after = await curious(page);
    e.outcome = after?.last?.seq === seq ? after.last.outcome : null;
    e.grade = after?.last?.seq === seq ? after.last.grade : null;
    await delay(3500);
    await shot(`${met.length + 1}-efter`);
    met.push(e);
  }
  await page.evaluate(() => { window.__nx319b.stop = true; });
  await page.waitForFunction(() => window.__nx319b?.done === true, null, { timeout: 10000 });
  const r = await page.evaluate(() => window.__nx319b);
  report.viewports.push({ width, height, level: await page.evaluate(() => document.body.dataset.level ?? null), shots, encounters: met, tonight: (await curious(page))?.tonight ?? null, ...r });
  await ctx.close();
}

try {
  await run(1440, 900, ['right', 'wrong', 'none']);
  await run(1280, 720, ['right']);
  const v = report.viewports;
  const enc = v.flatMap((x) => x.encounters);
  report.ok = report.errors.length === 0
    && v.every((x) => x.level === 'room' && x.seen > 0 && x.spawnInView.length === 0 && x.despawnInView.length === 0 && x.spawnNear.length === 0 && x.despawnNear.length === 0 && x.minGapM >= 0.35)
    && enc.every((e) => e.bubble && (e.plan === 'none' || (e.card && e.hoverState === 'hover')))
    && enc.filter((e) => e.plan === 'right').every((e) => e.outcome === 'join' && e.grade === 'right' && e.hatchLine && /Nils/.test(e.hatchSender ?? ''))
    && enc.filter((e) => e.plan === 'wrong').every((e) => e.outcome === 'walkOn' && e.grade === 'wrong')
    && enc.filter((e) => e.plan === 'none').every((e) => e.outcome === 'walkOn');
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, `check-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, error: report.error ?? null, errors: report.errors.slice(0, 3), viewports: report.viewports.map((v) => ({ w: v.width, seen: v.seen, curious: v.curiousFigures, inView: v.spawnInView.length + v.despawnInView.length, near: v.spawnNear.length + v.despawnNear.length, minGap: v.minGapM, enc: v.encounters })) }));
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
