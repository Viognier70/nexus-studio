// ORDER 323 §4 (Anders 2026-10-09: "fönstren ska sitta i fasaden, inte sväva framför väggen eller ligga på
// marken. Ta bilder av tio hus i Kvarteret (C), före och efter").
//
// Spelarens flöde: provspelet i vinbaren (?prov), på svenska, förberedelserna och kvällen. Spelaren trycker C
// (Kvarteret, 210 m); den bilden tas först. Sedan tio hus runt Kvarterets mitt, närmast först: fem som
// OsmBuildings ritar (lådan med fönsterraderna) och fem bostadshus (ProceduralFacades). Kameran ställs mot varje
// hus med __nxCamera.focusOn, från husets längsta vägg och utifrån, (finns bara i vite-dev-servern, därför SERVER=dev), på HOUSE_DISTANCE_M, och i
// en lägre vinkel (HOUSE_PITCH) så att fasaderna syns. Avståndet är närmare än Kvarterets 210 m för att fönstren ska synas; det är inte ett läge
// spelaren når med C, men samma rendering (spelaren når det med mushjulet).
// Husen väljs i sidan ur samma moduler som renderingen (OsmBuildings drawnOsmBuildings, ProceduralFacades
// SKIP_PROCEDURAL_IDS), och listan skrivs till reports/order323/fonster/<tag>/hus.json så att efter-körningen tar
// samma hus (HOUSES_FROM=<tag>).
//
//   FONSTER_TAG=fore node scripts/order323-fonster.mjs
//   FONSTER_TAG=efter HOUSES_FROM=fore node scripts/order323-fonster.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const TAG = process.env.FONSTER_TAG ?? 'efter';
const OUT = resolve(FRONTEND, 'reports', 'order323', 'fonster', TAG);
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4196);
const URL = `http://localhost:${PORT}`;
const HOUSE_DISTANCE_M = Number(process.env.HOUSE_DISTANCE_M ?? 45);
// Kameran lägre än Kvarterets (0,95 rad), så att fasaderna syns och inte bara taken.
const HOUSE_PITCH = Number(process.env.HOUSE_PITCH ?? 0.45);
const FROM = process.env.HOUSES_FROM ? resolve(FRONTEND, 'reports', 'order323', 'fonster', process.env.HOUSES_FROM, 'hus.json') : null;

const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 120; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const result = { tag: TAG, server: 'dev', houseDistanceM: HOUSE_DISTANCE_M, housePitch: HOUSE_PITCH, houses: [], errors: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('nexus.lang', 'sv'); } catch { /* ingen lagring */ } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => result.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${URL}/?prov`);
  await p.waitForSelector('[data-testid=prov-start]', { timeout: 120000 });
  await p.click('[data-testid=prov-place-vinbar]');
  await p.click('[data-testid=prov-begin]');
  await p.waitForSelector('[data-testid=prov-badge]', { state: 'attached', timeout: 120000 });
  await delay(3000);
  const vidare = p.getByRole('button', { name: 'Vidare' });
  for (let i = 0; i < 5 && (await vidare.count()) > 0; i++) { await vidare.first().click(); await delay(400); }
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
  await delay(1500);
  await p.keyboard.press('c');
  await delay(6000);
  await p.screenshot({ path: resolve(OUT, 'kvarteret.png') });
  const centre = await p.evaluate(() => { const c = window.__nxCamera.actualRef.current; return { x: c.focus.x, z: c.focus.z, distance: c.distance, yaw: c.yaw, pitch: c.pitch }; });
  result.kvarteret = centre;
  let houses;
  if (FROM && existsSync(FROM)) houses = JSON.parse(readFileSync(FROM, 'utf8')).houses.map((h) => ({ id: h.id, kind: h.kind, renderer: h.renderer, at: h.at }));
  else houses = await p.evaluate(async (c) => {
    const ob = await import('/src/strategic/scene/OsmBuildings.tsx');
    const pf = await import('/src/strategic/scene/ProceduralFacades.tsx');
    const world = await import('/src/strategic/content/world.ts');
    const centroid = (poly) => { let x = 0, z = 0; const n = poly.length - 1; for (let i = 0; i < n; i++) { x += poly[i][0]; z += poly[i][1]; } return [x / n, z / n]; };
    const near = (b) => { const [x, z] = centroid(b.poly); return Math.hypot(x - c.x, z - c.z); };
    const box = ob.drawnOsmBuildings().map((b) => ({ b, d: near(b) })).filter((x) => x.d > 15).sort((a, b) => a.d - b.d).slice(0, 5);
    const fac = world.WORLD.buildings.filter((b) => pf.SKIP_PROCEDURAL_IDS.has(b.id)).map((b) => ({ b, d: near(b) })).filter((x) => x.d > 15).sort((a, b) => a.d - b.d).slice(0, 5);
    return [...box.map((x) => ({ id: x.b.id, kind: x.b.kind, renderer: 'OsmBuildings', at: centroid(x.b.poly), d: Math.round(x.d) })),
            ...fac.map((x) => ({ id: x.b.id, kind: x.b.kind, renderer: 'ProceduralFacades', at: centroid(x.b.poly), d: Math.round(x.d) }))];
  }, centre);
  // Varje hus från sin längsta vägg, utifrån: fokus 2 m framför väggens mitt, kameran på väggens utsida
  // (CameraController: kameran står i fokus + avstånd · (sin yaw, cos yaw)).
  const views = await p.evaluate(async (ids) => {
    const world = await import('/src/strategic/content/world.ts');
    const inside = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
    return ids.map((id) => {
      const poly = world.WORLD.buildings.find((b) => b.id === id).poly;
      let best = null;
      for (let k = 0; k < poly.length - 1; k++) {
        const a = poly[k], b = poly[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!best || L > best.L) best = { a, b, L };
      }
      const t = [(best.b[0] - best.a[0]) / best.L, (best.b[1] - best.a[1]) / best.L];
      const m = [(best.a[0] + best.b[0]) / 2, (best.a[1] + best.b[1]) / 2];
      let n = [t[1], -t[0]];
      if (inside(poly, m[0] + n[0] * 0.05, m[1] + n[1] * 0.05)) n = [-n[0], -n[1]];
      return { focus: [m[0] + n[0] * 2, m[1] + n[1] * 2], yaw: Math.atan2(n[0], n[1]) };
    });
  }, houses.map((h) => h.id));
  for (let i = 0; i < houses.length; i++) {
    const h = houses[i];
    const v = views[i];
    await p.evaluate(([f, yaw, dist, pitch]) => { const c = window.__nxCamera; c.focusOn({ x: f[0], z: f[1] }, dist); c.targetRef.current.yaw = yaw; c.targetRef.current.pitch = pitch; }, [v.focus, v.yaw, HOUSE_DISTANCE_M, HOUSE_PITCH]);
    await delay(4500);
    const name = `hus-${String(i + 1).padStart(2, '0')}-${h.renderer}-${h.id.replace(/[^\w-]/g, '_')}.png`;
    await p.screenshot({ path: resolve(OUT, name) });
    result.houses.push({ ...h, view: v, image: name });
  }
  await ctx.close();
} catch (e) {
  result.errors.push(`FEL ${e.message}`);
} finally {
  await browser.close();
  try { process.kill(-proc.pid); } catch { /* redan stängd */ }
}
writeFileSync(resolve(OUT, 'hus.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 1));
