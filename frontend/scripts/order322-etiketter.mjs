// ORDER 322 B.2 (Anders 2026-10-09: "etiketterna får inte ligga på varandra") — kontrollen i produktionsbygget
// (vite preview), på svenska, i 1440 × 900 och 1280 × 720, i spelarens flöde: provspelet i vinbaren (?prov),
// förberedelserna och kvällen, på nivåerna Byn (V), Kvarteret (C) och Gatan (X). Morgonen mäts inte: morgonens
// panel täcker byn.
//
// Etiketterna i byn är tre slag, alla drei-Html i scenen:
//   - krogarnas skyltar (.nx-venue-label, ui/VillageLabels.tsx VenueLabel; VillageVenues.tsx flyttar dem isär);
//   - gatunamnen (.gb-street-label, scene/StreetLabels.tsx);
//   - sällskapen på väg till krogen (.nx-street-tag, ui/VillageLabels.tsx StreetTag, scene/village/StreetArrivals.tsx).
// Mätningen görs i det läge som målas (measure väntar till strax före nästa målning).
// En etikett räknas som synlig om den har en yta, inte är dold (visibility, display) och har opacitet över 0,02
// (StreetLabels tonar med opacity). Två synliga etiketter ligger på varandra om rektanglarna (getBoundingClientRect,
// för de vridna gatunamnen den omslutande rektangeln) skär varandra med mer än OVERLAP_PX åt båda håll.
// Utdata: reports/order322/<tag>/etiketter.json och etiketter-*.png (KARTA_TAG=fore|efter, förvalt efter).
//
// Tillägg efter Anders 2026-10-09 ("de får inte ligga på varandra i någon zoomnivå"):
//   - också nivån Krogen (Z);
//   - ett svep med mushjulet på duken, som spelaren zoomar: från Byn ut till kamerans yttersta avstånd och sedan
//     in i steg om WHEEL_STEP (zoomBy, deltaY · 0,0011 i logaritmen, alltså × 0,80 per steg) ner till det
//     innersta. Varje steg mäts när kameran stått stilla STEP_WAIT_MS. Bild bara av steg med par.
//   - Produktionsbygget lämnar inte ut kamerans avstånd. Med SERVER=dev körs samma flöde mot vite-dev-servern,
//     där CameraContext lägger ut __nxCamera, och varje steg får kamerans verkliga avstånd (actualRef.distance)
//     och målet (targetRef.distance). Utdata då etiketter-dev.json. I bygget står bara stegets nummer.
//   - efter varje nivåbyte mäts också under kamerans flygning: FLIGHT_SAMPLES prov, ett var FLIGHT_SAMPLE_MS
//     (<nivå>-flygning-NN). Där fanns paren i första svepet (1280 × 720, kvällen, 455,8 m → 24 m).
//   - FRONTEND_DIR pekar på en annan frontend (en worktree på commiten före B, för bilderna före); OUT_DIR anger
//     utdatakatalogen.
//
//   node scripts/order322-etiketter.mjs          (bygger först; SKIP_BUILD=1 hoppar över bygget)
//   SERVER=dev node scripts/order322-etiketter.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.FRONTEND_DIR ? resolve(process.env.FRONTEND_DIR) : resolve(HERE, '..');
const TAG = process.env.KARTA_TAG ?? 'efter';
const OUT = process.env.OUT_DIR ? resolve(process.env.OUT_DIR) : resolve(HERE, '..', 'reports', 'order322', TAG);
const DEV = process.env.SERVER === 'dev';
const SUFFIX = DEV ? '-dev' : '';
const WHEEL_STEP = -200;
const STEP_WAIT_MS = 1500;
const MAX_STEPS = 40;
const FLIGHT_SAMPLES = 12;
const FLIGHT_SAMPLE_MS = 300;
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4192);
const URL = `http://localhost:${PORT}`;
const OVERLAP_PX = 1;

async function startPreview() {
  if (!DEV && !process.env.SKIP_BUILD) {
    await new Promise((res, rej) => {
      const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' });
      b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))));
    });
  }
  const proc = spawn('npx', DEV ? ['vite', '--port', String(PORT), '--strictPort'] : ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(URL); if (r.ok) return proc; } catch { /* väntar */ }
    await delay(500);
  }
  throw new Error('preview timeout');
}

// I sidan: de synliga etiketterna och paren som ligger på varandra.
async function measure(overlapPx) {
  // Det läge som målas: strax före nästa målning, inte i ett godtyckligt ögonblick mellan två uppgifter. drei Html
  // ritar skyltarna i en egen React-rot, i en egen uppgift; mellan den och nästa bildruta har skyltarna ny storlek
  // men gammal plats, ett läge som aldrig målas (ORDER 322 B.4, sonden bildruta för bildruta). En ny
  // ResizeObserver får sitt första anrop i nästa bildruta efter alla rAF-anrop (r3f, där skyltarna placeras) och
  // efter de observers som skapats före den (VillageVenues), före målningen.
  await new Promise((r) => { const ro = new ResizeObserver(() => { ro.disconnect(); r(); }); ro.observe(document.body); });
  const kinds = [['venue', '.nx-venue-label'], ['street', '.gb-street-label'], ['group', '.nx-street-tag']];
  const visible = (e) => {
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) <= 0.02) return false;
    }
    return true;
  };
  const labels = [];
  for (const [kind, sel] of kinds) for (const e of document.querySelectorAll(sel)) {
    const b = e.getBoundingClientRect();
    if (!b.width || !b.height || !visible(e)) continue;
    if (b.right < 0 || b.bottom < 0 || b.left > innerWidth || b.top > innerHeight) continue;
    labels.push({ kind, text: e.textContent.trim().slice(0, 40), x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) });
  }
  const overlaps = [];
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > overlapPx && oy > overlapPx) overlaps.push({ a: `${a.kind}: ${a.text}`, b: `${b.kind}: ${b.text}`, px: [ox, oy] });
  }
  return { count: labels.length, byKind: Object.fromEntries(kinds.map(([k]) => [k, labels.filter((l) => l.kind === k).length])), overlaps, labels };
}

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const result = { tag: TAG, server: DEV ? 'dev' : 'preview', overlapPx: OVERLAP_PX, wheelStep: WHEEL_STEP, stepWaitMs: STEP_WAIT_MS, flightSamples: FLIGHT_SAMPLES, flightSampleMs: FLIGHT_SAMPLE_MS, ok: true, runs: [], errors: [] };
const fail = (msg) => { result.ok = false; result.errors.push(msg); };

async function run(width, height) {
  const tag = `${width}x${height}`;
  const row = { viewport: tag, moments: [] };
  result.runs.push(row);
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => { try { localStorage.setItem('nexus.lang', 'sv'); } catch { /* ingen lagring */ } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => result.errors.push(`${tag} pageerror: ${e.message}`));
  await p.goto(`${URL}/?prov`);
  await p.waitForSelector('[data-testid=prov-start]', { timeout: 30000 });
  await p.click('[data-testid=prov-place-vinbar]');
  await p.click('[data-testid=prov-begin]');
  await p.waitForSelector('[data-testid=prov-badge]', { state: 'attached', timeout: 60000 });
  await delay(2500);
  const vidare = p.getByRole('button', { name: 'Vidare' });
  for (let i = 0; i < 5 && (await vidare.count()) > 0; i++) { await vidare.first().click(); await delay(400); }
  const cam = () => p.evaluate(() => {
    const c = window.__nxCamera;
    return c ? { actual: Math.round(c.actualRef.current.distance * 10) / 10, target: Math.round(c.targetRef.current.distance * 10) / 10 } : null;
  });
  const levels = async (when) => {
    for (const [key, name] of [['v', 'byn'], ['c', 'kvarteret'], ['x', 'gatan'], ['z', 'krogen']]) {
      await p.keyboard.press(key);
      // Under flygningen: ett prov var FLIGHT_SAMPLE_MS, FLIGHT_SAMPLES gånger. Par räknas som i det landade läget.
      for (let i = 0; i < FLIGHT_SAMPLES; i++) {
        await delay(FLIGHT_SAMPLE_MS);
        const f = await p.evaluate(measure, OVERLAP_PX);
        const c = await cam();
        row.moments.push({ when, level: `${name}-flygning-${String(i).padStart(2, '0')}`, cam: c, count: f.count, byKind: f.byKind, overlaps: f.overlaps });
        if (f.overlaps.length) await p.screenshot({ path: resolve(OUT, `etiketter${SUFFIX}-${tag}-${when}-${name}-flygning-${String(i).padStart(2, '0')}.png`) });
      }
      await delay(6000 - FLIGHT_SAMPLES * FLIGHT_SAMPLE_MS > 0 ? 6000 - FLIGHT_SAMPLES * FLIGHT_SAMPLE_MS : 1000);
      const m = await p.evaluate(measure, OVERLAP_PX);
      row.moments.push({ when, level: name, cam: await cam(), ...m });
      await p.screenshot({ path: resolve(OUT, `etiketter${SUFFIX}-${tag}-${when}-${name}.png`) });
    }
  };
  // Svepet: Byn, ut till det yttersta, sedan in steg för steg. Hjulet på dukens mitt, som spelarens mus.
  const sweep = async (when) => {
    await p.keyboard.press('v');
    await delay(6000);
    await p.mouse.move(width / 2, height / 2);
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 600); await delay(150); }
    await delay(4000);
    let last = null;
    for (let step = 0; step < MAX_STEPS; step++) {
      const m = await p.evaluate(measure, OVERLAP_PX);
      const c = await cam();
      row.moments.push({ when, level: `svep-${String(step).padStart(2, '0')}`, cam: c, ...m });
      if (m.overlaps.length) await p.screenshot({ path: resolve(OUT, `etiketter${SUFFIX}-${tag}-${when}-svep-${String(step).padStart(2, '0')}.png`) });
      // Innerst: målet ändras inte längre (dev), eller samma etiketter tre steg i rad efter 25 steg (bygget).
      if (c && last && c.target === last.target && step > 2) break;
      if (!c && step >= 25) break;
      last = c;
      await p.mouse.wheel(0, WHEEL_STEP);
      await delay(STEP_WAIT_MS);
    }
  };
  // Kvällen: dörrarna öppnas, gästerna går på gatan.
  if (await p.$('[data-testid=open-buy-foot]')) {
    await p.click('[data-testid=open-buy-foot]');
    await p.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {});
    await p.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
  }
  await p.click('[data-testid=open-doors]').catch(() => {});
  await delay(500);
  if (await p.$('[data-testid=open-short-open]')) await p.click('[data-testid=open-short-open]');
  await p.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => p.click('[data-testid=mentor-close-service]')).catch(() => {});
  // Förberedelserna (byn syns, klockan går 4× till 19.05), sedan kvällen med sällskapen på gatan.
  await delay(2000);
  await levels('forberedelser');
  await sweep('forberedelser');
  await delay(5000);
  await levels('kvall');
  await sweep('kvall');
  for (const m of row.moments) if (m.overlaps.length) fail(`${tag} ${m.when} ${m.level}: ${m.overlaps.length} par (${m.overlaps.slice(0, 3).map((o) => `${o.a} / ${o.b}`).join('; ')})`);
  for (const m of row.moments) delete m.labels;
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
writeFileSync(resolve(OUT, `etiketter${SUFFIX}.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.runs.map((r) => r.moments.map((m) => `${r.viewport} ${m.when} ${m.level}${m.cam ? ` ${m.cam.actual}m→${m.cam.target}m` : ''}: ${m.count} etiketter ${JSON.stringify(m.byKind)}, ${m.overlaps.length} par`)), null, 1));
console.log(JSON.stringify(result.errors.filter((e) => !/par \(/.test(e)), null, 1), result.ok);
