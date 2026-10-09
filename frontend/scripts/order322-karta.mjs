// ORDER 322 B.1 (Anders 2026-10-09) — spelets karta ovanpå den riktiga kartan, och listan över skillnaderna.
//
// Spelets karta: ett utdrag (i systemets tillfälliga katalog) som src/strategic/__tests__/order322Karta.test.ts skriver ur
// renderingens egna moduler (roadRenderPieces, renderedFootprints, CraftedLandmarks-flytten). Skriptet kör testet först.
// Den riktiga kartan: kartunderlaget src/strategic/data/grythyttan-osm.json (Overpass, OSM-läget 2026-07-02) och
// grythyttan-world.json (samma vägar och hus i byns ram, plus relationshuset r17025286 och de syntetiska husen).
// Projektionen är ingestens (scripts/fetch-grythyttan-osm.mjs: x = (lon − 14.53723)·56060, z = −(lat − 59.70575)·111132.9,
// replikerad nedan; worldjson.meta har samma tal och skriptet prövar att de stämmer).
//
// Jämförelsen gäller byn: husens utbredning plus MARGIN_M. Vägarna går ut flera kilometer; ändar utanför byn räknas
// bara.
//   Vägändar: varje ände av en ritad vägbit. Den är en riktig ände om en OSM-väg slutar där i verkligheten (noden
//   finns i en enda väg och är dess första eller sista), inom END_TOL_M. Annars ska den ligga på en annan ritad
//   vägbit (inom dess halva bredd + trottoar + JOIN_TOL_M). Är den varken eller slutar vägen tvärt:
//     - "bryts": vägen är klippt mitt på (änden är inte OSM-vägens ände), vid ett hus;
//     - "saknar anslutning": OSM-vägen slutar där, men i verkligheten möter den en annan väg som inte når fram.
//   Hus: de riktiga husen som inte ritas, de som ritas på en annan plats (de handbyggda landmärkena), och det som
//   ritas men inte finns på kartan (syntetiska hus och uthus).
// Med KARTA_TAG=efter också reports/order322/jamfor/<bild>.png: före till vänster, efter till höger.
// Utdata: reports/order322/karta.json, karta-byn.png, karta-karnan.png, karta-torget.png (hela byn) och karta-<n>.png (utsnitt kring skillnaderna).
//
//   node scripts/order322-karta.mjs          (SKIP_DUMP=1 läser det senaste utdraget)

import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
// ORDER 322 B.2 (Anders 2026-10-09: "Ta nya bilder som i B.1, före och efter"): KARTA_TAG=fore|efter skriver till
// reports/order322/<tag>/. Utsnitten låses i reports/order322/karta-vyer.json vid första körningen med tagg, så att
// före och efter visar samma rutor.
const TAG = process.env.KARTA_TAG ?? '';
const OUT = resolve(FRONTEND, 'reports', 'order322', TAG);
const VIEWS = resolve(FRONTEND, 'reports', 'order322', 'karta-vyer.json');
mkdirSync(OUT, { recursive: true });
// Bilderna från en tidigare körning tas bort, så att inget utsnitt blir kvar med gamla nummer.
for (const f of readdirSync(OUT)) if (/^karta-.*\.(png|svg)$/.test(f)) rmSync(resolve(OUT, f));
// Utdraget är ett mellanled (4 MB) och läggs i systemets tillfälliga katalog; karta.json är resultatet.
const DUMP = resolve(tmpdir(), 'order322-spelets-karta.json');
if (!process.env.SKIP_DUMP) {
  const r = spawnSync('npx', ['vitest', 'run', 'src/strategic/__tests__/order322Karta.test.ts'], { cwd: FRONTEND, env: { ...process.env, ORDER322_OUT: DUMP }, stdio: 'ignore' });
  if (r.status !== 0) throw new Error('utdraget misslyckades');
}
const game = JSON.parse(readFileSync(DUMP, 'utf8'));
const world = JSON.parse(readFileSync(resolve(FRONTEND, 'src/strategic/data/grythyttan-world.json'), 'utf8'));
const osm = JSON.parse(readFileSync(resolve(FRONTEND, 'src/strategic/data/grythyttan-osm.json'), 'utf8'));

const LAT0 = 59.70575, LON0 = 14.53723, MX = 56060, MZ = 111132.9;
if (world.meta.centerLatLon[0] !== LAT0 || world.meta.centerLatLon[1] !== LON0 || world.meta.mPerDeg[0] !== MZ || world.meta.mPerDeg[1] !== MX) throw new Error('projektionen stämmer inte med world.meta');
const proj = (lat, lon) => [(lon - LON0) * MX, -(lat - LAT0) * MZ];
const ROAD_HALF_FALLBACK_M = 1.5, MARGIN_M = 60, END_TOL_M = 1.5, JOIN_TOL_M = 1.0, COVER_TOL_M = 0.75, MIN_GAP_M = 2, TORGET_HALF_M = 9, BUILDING_NEAR_M = 8;

// ---------- Den riktiga kartan ----------
const ways = osm.elements.filter((e) => e.type === 'way');
const realRoads = ways.filter((w) => w.tags?.highway).map((w) => ({ id: `w${w.id}`, kind: w.tags.highway, name: w.tags.name ?? w.tags.ref ?? null, tunnel: w.tags.tunnel ?? null, nodes: w.nodes, poly: w.geometry.map((g) => proj(g.lat, g.lon)) }));
// ORDER 322 B, Anders beslut 2: "Servicevägen ritas fram till husen, inte genom dem." En väg som i OSM går genom ett
// hus (tunnel=building_passage) ritas inte; den räknas som genomfart, inte som lucka, och vägarna som möter den
// får sluta vid husets vägg.
const passages = realRoads.filter((r) => r.tunnel === 'building_passage');
const realBuildings = ways.filter((w) => w.tags?.building).map((w) => ({ id: `w${w.id}`, kind: w.tags.building, name: w.tags.name ?? null, poly: w.geometry.map((g) => proj(g.lat, g.lon)) }));
for (const b of world.buildings) if (b.provenance === 'osm' && !realBuildings.some((r) => r.id === b.id)) realBuildings.push({ id: b.id, kind: b.kind, name: b.name ?? null, poly: b.poly });
// Noderna: i hur många vägar, och om de är en vägs ände.
const nodeWays = new Map(), nodePos = new Map();
for (const r of realRoads) {
  r.nodes.forEach((n, i) => { nodePos.set(n, r.poly[i]); });
  for (const n of new Set(r.nodes)) nodeWays.set(n, (nodeWays.get(n) ?? 0) + 1);
}
const realEnds = [];
for (const r of realRoads) for (const n of [r.nodes[0], r.nodes[r.nodes.length - 1]]) if (nodeWays.get(n) === 1 && r.nodes.indexOf(n) === r.nodes.lastIndexOf(n)) realEnds.push({ node: n, way: r.id, at: nodePos.get(n) });

// ---------- Geometri ----------
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segDist(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
const polyDist = (p, poly) => { let m = Infinity; for (let i = 1; i < poly.length; i++) m = Math.min(m, segDist(p, poly[i - 1], poly[i])); return m; };
function inside(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
const centre = (poly) => { const n = poly.length - 1 || 1; let x = 0, z = 0; for (let i = 0; i < n; i++) { x += poly[i][0]; z += poly[i][1]; } return [x / n, z / n]; };
const r1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => [r1(p[0]), r1(p[1])];

// Byns område: de riktiga husens utbredning plus marginalen.
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (const b of realBuildings) for (const [x, z] of b.poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
const AREA = { minX: minX - MARGIN_M, maxX: maxX + MARGIN_M, minZ: minZ - MARGIN_M, maxZ: maxZ + MARGIN_M };
const inArea = ([x, z]) => x >= AREA.minX && x <= AREA.maxX && z >= AREA.minZ && z <= AREA.maxZ;

// ---------- Vägarna ----------
// Varje riktig väg i byn provas meter för meter: täcks punkten av spelets vägyta för samma väg (inom halva
// bredden + COVER_TOL_M; ändarna kortas 0,5 m i roadSurface.ts)? En sträcka utan täckning är en lucka. En lucka
// som helt ligger på en annan ritad vägs yta (en korsning) syns inte och räknas inte. Torget ritas som en plan
// ±TORGET_HALF_M kring w122157681 (TorgetPlaza.tsx).
const allBuildings = [...game.buildings.map((b) => ({ id: b.id, poly: b.poly, shown: true, synth: b.provenance === 'synthesised' })), ...game.hidden.map((b) => ({ id: b.id, poly: b.poly, shown: false, synth: b.provenance === 'synthesised' }))];
function nearestBuilding(p) {
  let best = null;
  for (const b of allBuildings) {
    if (b.poly.length < 3) continue;
    const dist = inside(b.poly, p[0], p[1]) ? 0 : polyDist(p, b.poly);
    if (!best || dist < best.dist) best = { id: b.id, dist: r1(dist), shown: b.shown, synthesised: b.synth };
  }
  return best;
}
// Torgets plan (TorgetPlaza.tsx: OSM-linjen w122157681 buffrad ±9 m, replikerat som TORGET_HALF_M) ligger på
// vägarna där; den räknas som vägyta för alla vägar.
const torgetRoad = world.roads.find((r) => r.id === 'w122157681');
const plaza = { id: 'torget-plaza', wayId: 'torget-plaza', role: 'plaza', half: TORGET_HALF_M, sidewalk: 0, poly: torgetRoad.poly };
game.roads.push(plaza);
const halfOf = (g) => g.half;
const piecesByWay = new Map();
for (const g of game.roads) piecesByWay.set(g.wayId, [...(piecesByWay.get(g.wayId) ?? []), g]);
function dense(poly) {
  const out = [];
  for (let i = 1; i < poly.length; i++) { const a = poly[i - 1], c = poly[i], L = d2(a, c); for (let t = 0; t < L; t += 1) out.push([a[0] + ((c[0] - a[0]) * t) / L, a[1] + ((c[1] - a[1]) * t) / L]); }
  out.push(poly[poly.length - 1]);
  return out;
}
const roadIssues = [];
let waysInArea = 0, outsideWays = 0;
for (const way of realRoads) {
  if (!way.poly.some(inArea)) { outsideWays++; continue; }
  waysInArea++;
  if (way.tunnel === 'building_passage') continue;
  const own = [...(piecesByWay.get(way.id) ?? []), plaza];
  const pts = dense(way.poly);
  const covered = pts.map((p) => !inArea(p) || own.some((g) => polyDist(p, g.poly) <= halfOf(g) + COVER_TOL_M));
  for (let i = 0; i < pts.length; ) {
    if (covered[i]) { i++; continue; }
    let j = i; while (j + 1 < pts.length && !covered[j + 1]) j++;
    const run = pts.slice(i, j + 1);
    const len = r1(run.length - 1 + 1);
    const hiddenUnderRoad = run.every((p) => game.roads.some((g) => g.wayId !== way.id && polyDist(p, g.poly) <= halfOf(g) + g.sidewalk + COVER_TOL_M));
    if (len >= MIN_GAP_M && !hiddenUnderRoad) {
      const atStart = i === 0, atEnd = j === pts.length - 1;
      const mid = run[Math.floor(run.length / 2)];
      // Det som står i luckan: huset närmast någon punkt i den.
      let building = null;
      for (const p of run) { const nb = nearestBuilding(p); if (nb && (!building || nb.dist < building.dist)) building = nb; }
      const where = !piecesByWay.has(way.id) ? 'hela vägen' : atStart || atEnd ? 'i änden' : 'mitt på';
      // I änden: möter vägen en annan väg där i verkligheten? Då saknar den anslutning; annars slutar den tidigt.
      const endNode = atStart ? way.nodes[0] : atEnd ? way.nodes[way.nodes.length - 1] : null;
      const meets = endNode ? realRoads.filter((o) => o.id !== way.id && o.nodes.includes(endNode)).map((o) => o.id) : [];
      roadIssues.push({
        kind: where === 'hela vägen' ? 'saknas' : where === 'i änden' ? (meets.length ? 'saknar anslutning' : 'slutar för tidigt') : 'bryts',
        way: way.id, roadKind: way.kind, name: way.name, from: pt(run[0]), to: pt(run[run.length - 1]), at: pt(mid), lengthM: len,
        meets, building: building && building.dist <= BUILDING_NEAR_M ? building : null,
        run: run.filter((_, k) => k % 2 === 0 || k === run.length - 1).map(pt)
      });
    }
    i = j + 1;
  }
}
roadIssues.sort((x, y) => y.lengthM - x.lengthM);

// Vägändarna i spelet som inte är ändar i verkligheten (B.3:s mått): ändarna av de ritade bitarna som varken är
// en riktig återvändsgata (noden finns bara i en väg) eller ligger på en annan ritad yta.
const realEndNodes = new Set();
for (const r of realRoads) for (const n of [r.nodes[0], r.nodes[r.nodes.length - 1]]) if (nodeWays.get(n) === 1) realEndNodes.add(n);
const realEndPts = [...realEndNodes].map((n) => nodePos.get(n));
// Genomfartens ändar ligger på husets vägg: där slutar vägarna som möter den (beslut 2).
const passageEndPts = passages.flatMap((r) => [r.poly[0], r.poly[r.poly.length - 1]]);
let passageEnds = 0;
let gameEnds = 0, falseEnds = 0, outsideEnds = 0;
const falseEndList = [];
for (const g of game.roads) {
  if (g.role === 'plaza') continue;
  if (d2(g.poly[0], g.poly[g.poly.length - 1]) <= END_TOL_M) continue;
  for (const e of [g.poly[0], g.poly[g.poly.length - 1]]) {
    if (!inArea(e)) { outsideEnds++; continue; }
    gameEnds++;
    if (realEndPts.some((r) => d2(r, e) <= END_TOL_M)) continue;
    if (passageEndPts.some((r) => d2(r, e) <= END_TOL_M)) { passageEnds++; continue; }
    if (game.roads.some((o) => o !== g && polyDist(e, o.poly) <= halfOf(o) + o.sidewalk + JOIN_TOL_M)) continue;
    falseEnds++;
    // Varför: den riktiga vägen under änden, och huset närmast.
    const way = realRoads.find((r) => r.id === g.wayId);
    const realEnd = realEndPts.reduce((m, r) => Math.min(m, d2(r, e)), Infinity);
    falseEndList.push({ piece: g.id, way: g.wayId, name: way?.name ?? null, roadKind: way?.kind ?? null, role: g.role, at: pt(e), toRealEndM: r1(realEnd), building: nearestBuilding(e) });
  }
}

// ---------- Husen ----------
const base = (id) => id.split('#')[0].split(':')[0];
const drawn = new Set([...game.buildings.filter((b) => b.source === 'building').map((b) => base(b.id)), ...game.crafted.map((c) => c.id)]);
const missing = realBuildings.filter((b) => !drawn.has(b.id) && b.poly.some(inArea)).map((b) => {
  const hidden = game.hidden.some((h) => h.id === b.id);
  return { id: b.id, kind: b.kind, name: b.name, at: pt(centre(b.poly)), why: hidden ? 'dold: en vägs mittlinje går genom huset (buildingsOnRoads.ts)' : 'ritas inte' };
});
const moved = game.crafted.map((c) => ({ id: c.id, landmark: c.landmark, shiftM: c.shift, distM: r1(Math.hypot(c.shift[0], c.shift[1])), at: pt(centre(c.poly)) }));
// Ett syntetiskt hus står på en riktig väg om vägens mittlinje går in i huset eller närmare än vägens halva
// bredd i spelet (roadRoles.ts via utdraget; en väg som inte ritas alls räknas med ROAD_HALF_FALLBACK_M).
function onRealRoad(poly) {
  let worst = null;
  for (const r of realRoads) {
    const half = Math.max(...(piecesByWay.get(r.id) ?? [{ half: ROAD_HALF_FALLBACK_M }]).map((g) => g.half));
    for (const p of dense(r.poly)) {
      const dist = inside(poly, p[0], p[1]) ? -1 : polyDist(p, poly);
      if (dist <= half && (!worst || dist < worst.dist)) worst = { way: r.id, name: r.name, kind: r.kind, dist: r1(dist), at: pt(p) };
    }
  }
  return worst;
}
const extra = game.buildings.filter((b) => b.source === 'building' && b.provenance === 'synthesised').map((b) => ({ id: b.id, kind: b.kind, at: pt(centre(b.poly)), onRoad: onRealRoad(b.poly) }));
const hiddenSynth = game.hidden.filter((h) => h.provenance === 'synthesised').map((h) => h.id);
const sheds = game.buildings.filter((b) => b.source === 'outbuilding');
// Uthus som står på ett riktigt hus eller på en riktig väg.
const shedConflicts = sheds.flatMap((s) => {
  const c = centre(s.poly);
  const onHouse = realBuildings.find((b) => b.id !== base(s.id) && inside(b.poly, c[0], c[1]));
  const road = onRealRoad(s.poly);
  return onHouse || road ? [{ id: s.id, at: pt(c), onHouse: onHouse?.id ?? null, onRoad: road }] : [];
});

const result = {
  area: Object.fromEntries(Object.entries(AREA).map(([k, v]) => [k, Math.round(v)])),
  tolerances: { END_TOL_M, JOIN_TOL_M, MARGIN_M, COVER_TOL_M, MIN_GAP_M, TORGET_HALF_M, BUILDING_NEAR_M },
  counts: {
    realRoads: realRoads.length, realBuildings: realBuildings.length, realEnds: realEnds.length,
    gamePieces: game.roads.length, gameBuildings: game.buildings.filter((b) => b.source === 'building').length + game.crafted.length,
    waysInArea, waysOutsideArea: outsideWays, roadIssues: roadIssues.length, gapMetres: Math.round(roadIssues.reduce((a, r) => a + r.lengthM, 0)),
    gameEnds, gameEndsNotRealEnds: falseEnds, gameEndsOutsideArea: outsideEnds, gameEndsAtPassage: passageEnds, passages: passages.length,
    missing: missing.length, moved: moved.length, synthesisedShown: extra.length, synthesisedOnRoad: extra.filter((e) => e.onRoad).length, synthesisedHidden: hiddenSynth.length, outbuildings: sheds.length, shedConflicts: shedConflicts.length
  },
  roadIssues: roadIssues.map((r, i) => ({ n: i + 1, ...r })),
  passages: passages.map((r) => ({ way: r.id, kind: r.kind, lengthM: r1(r.poly.slice(1).reduce((a, p, i) => a + d2(p, r.poly[i]), 0)), building: nearestBuilding(centre([...r.poly, r.poly[0]])) })),
  missing, moved, synthesised: extra, synthesisedHidden: hiddenSynth, shedConflicts, falseEnds: falseEndList
};
writeFileSync(resolve(OUT, 'karta.json'), JSON.stringify(result, null, 2) + '\n');

// ---------- Bilderna ----------
function svg(view, scale, title) {
  const W = Math.round((view.maxX - view.minX) * scale), H = Math.round((view.maxZ - view.minZ) * scale);
  const X = (x) => ((x - view.minX) * scale).toFixed(1), Z = (z) => ((z - view.minZ) * scale).toFixed(1);
  const path = (poly) => poly.map(([x, z], i) => `${i ? 'L' : 'M'}${X(x)},${Z(z)}`).join('');
  const s = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 40}" viewBox="0 0 ${W} ${H + 40}" font-family="Helvetica, Arial, sans-serif">`);
  s.push(`<rect width="${W}" height="${H + 40}" fill="#f7f4ec"/>`);
  for (const w of world.water) s.push(`<path d="${path(w.poly)}Z" fill="#cfe3f0"/>`);
  // Spelets vägyta (asfalt + trottoar) under, den riktiga mittlinjen över.
  for (const r of game.roads) s.push(`<path d="${path(r.poly)}" fill="none" stroke="${r.role === 'plaza' ? '#d9b26a' : '#f0a040'}" stroke-opacity=".55" stroke-linecap="butt" stroke-linejoin="round" stroke-width="${Math.max(1.5, 2 * (r.half + r.sidewalk) * scale).toFixed(1)}"/>`);
  for (const r of realRoads) s.push(`<path d="${path(r.poly)}" fill="none" stroke="#1d4f91" stroke-width="${Math.max(0.8, 0.6 * scale).toFixed(1)}"/>`);
  for (const b of realBuildings) s.push(`<path d="${path(b.poly)}Z" fill="none" stroke="#222" stroke-width="${Math.max(0.8, 0.4 * scale).toFixed(1)}"/>`);
  for (const b of game.buildings) s.push(`<path d="${path(b.poly)}Z" fill="${b.source === 'outbuilding' ? '#9b6bd1' : b.provenance === 'synthesised' ? '#2ca25f' : '#d9534f'}" fill-opacity=".35" stroke="none"/>`);
  for (const c of game.crafted) s.push(`<path d="${path(c.poly)}Z" fill="#d9534f" fill-opacity=".35" stroke="#d9534f" stroke-dasharray="3 2"/>`);
  for (const m of missing) { const b = realBuildings.find((x) => x.id === m.id); s.push(`<path d="${path(b.poly)}Z" fill="none" stroke="#e00" stroke-width="${Math.max(2, scale).toFixed(1)}"/>`); }
  const r = Math.max(7, 4 * scale);
  for (const e of result.roadIssues) {
    if (e.at[0] < view.minX || e.at[0] > view.maxX || e.at[1] < view.minZ || e.at[1] > view.maxZ) continue;
    s.push(`<path d="${path(e.run)}" fill="none" stroke="#e00" stroke-width="${Math.max(3, 1.6 * scale).toFixed(1)}" stroke-linecap="round"/>`);
    s.push(`<circle cx="${X(e.at[0])}" cy="${Z(e.at[1])}" r="${r.toFixed(1)}" fill="${e.kind === 'saknar anslutning' ? '#8000c0' : '#c00'}" fill-opacity=".9"/>`);
    s.push(`<text x="${X(e.at[0])}" y="${(Number(Z(e.at[1])) + r * 0.38).toFixed(1)}" font-size="${(r * 1.05).toFixed(1)}" fill="#fff" text-anchor="middle" font-weight="700">${e.n}</text>`);
  }
  for (const e of result.falseEnds) s.push(`<circle cx="${X(e.at[0])}" cy="${Z(e.at[1])}" r="${(r * 0.8).toFixed(1)}" fill="none" stroke="#000" stroke-width="2"/>`);
  s.push(`<text x="10" y="${H + 26}" font-size="15" fill="#222">${title} · svart ring: vägände som inte finns i verkligheten · blå linje: riktig väg · svart kant: riktigt hus · orange: spelets väg · sand: Torgets plan · rött: spelets hus · grönt: syntetiskt hus · lila: uthus · röd linje och ring: vägen saknas i spelet · lila ring: saknar anslutning · röd kant: huset saknas</text>`);
  s.push('</svg>');
  return { svg: s.join('\n'), W, H: H + 40 };
}
const shots = [
  { name: 'karta-byn', view: AREA, scale: Math.min(1.6, 3000 / (AREA.maxX - AREA.minX)), title: 'Byn' },
  // Byns kärna: skillnaderna och landmärkena plus 80 m.
  { name: 'karta-karnan', view: (() => { const ps = [...result.roadIssues.map((e) => e.at), ...moved.map((m) => m.at), ...missing.map((m) => m.at)]; return { minX: Math.min(...ps.map((p) => p[0])) - 80, maxX: Math.max(...ps.map((p) => p[0])) + 80, minZ: Math.min(...ps.map((p) => p[1])) - 80, maxZ: Math.max(...ps.map((p) => p[1])) + 80 }; })(), scale: 2, title: 'Byns kärna' },
  { name: 'karta-torget', view: { minX: -140, maxX: 160, minZ: -130, maxZ: 120 }, scale: 6, title: 'Torget' }
];
// Utsnitt kring skillnaderna: grupperade i rutor om 300 m.
const cells = new Map();
for (const e of result.roadIssues) { const key = `${Math.floor(e.at[0] / 300)}:${Math.floor(e.at[1] / 300)}`; cells.set(key, [...(cells.get(key) ?? []), e]); }
[...cells.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([key, list], i) => {
  const [cx, cz] = key.split(':').map(Number);
  shots.push({ name: `karta-${i + 1}`, view: { minX: cx * 300 - 40, maxX: cx * 300 + 340, minZ: cz * 300 - 40, maxZ: cz * 300 + 340 }, scale: 4, title: `Utsnitt ${i + 1}: punkterna ${list.map((e) => e.n).join(', ')}` });
});
// Före och efter: samma rutor (karta-vyer.json). Rubriken räknar punkterna i rutan i den här körningen.
if (TAG) {
  let frozen;
  try { frozen = JSON.parse(readFileSync(VIEWS, 'utf8')); } catch { frozen = null; }
  if (!frozen) { frozen = shots.map(({ name, view, scale, title }) => ({ name, view, scale, title: title.replace(/: punkterna.*$/, '') })); writeFileSync(VIEWS, JSON.stringify(frozen, null, 2) + '\n'); }
  shots.length = 0;
  for (const f of frozen) {
    const inView = result.roadIssues.filter((e) => e.at[0] >= f.view.minX && e.at[0] <= f.view.maxX && e.at[1] >= f.view.minZ && e.at[1] <= f.view.maxZ).map((e) => e.n);
    const label = TAG === 'fore' ? 'före' : TAG;
    shots.push({ ...f, title: `${f.title} (${label})${f.name.match(/^karta-\d/) ? `: ${inView.length ? `punkterna ${inView.join(', ')}` : 'inga luckor'}` : ''}` });
  }
}
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
for (const sh of shots) {
  const { svg: body, W, H } = svg(sh.view, sh.scale, sh.title);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<html><body style="margin:0">${body}</body></html>`);
  await page.screenshot({ path: resolve(OUT, `${sh.name}.png`) });
  await page.close();
}
// Efter: bilden före (reports/order322/fore/) och efter sida vid sida i reports/order322/jamfor/.
if (TAG === 'efter') {
  const FORE = resolve(FRONTEND, 'reports', 'order322', 'fore');
  const CMP = resolve(FRONTEND, 'reports', 'order322', 'jamfor');
  mkdirSync(CMP, { recursive: true });
  for (const sh of shots) {
    let before;
    try { before = readFileSync(resolve(FORE, `${sh.name}.png`)); } catch { continue; }
    const after = readFileSync(resolve(OUT, `${sh.name}.png`));
    const W = Math.round((sh.view.maxX - sh.view.minX) * sh.scale), H = Math.round((sh.view.maxZ - sh.view.minZ) * sh.scale) + 40;
    const page = await browser.newPage({ viewport: { width: W * 2 + 20, height: H } });
    await page.setContent(`<html><body style="margin:0;background:#222;display:flex;gap:20px"><img src="data:image/png;base64,${before.toString('base64')}"><img src="data:image/png;base64,${after.toString('base64')}"></body></html>`);
    await page.screenshot({ path: resolve(CMP, `${sh.name}.png`) });
    await page.close();
  }
}
await browser.close();
result.images = shots.map((s) => `${s.name}.png`);
writeFileSync(resolve(OUT, 'karta.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.counts));
