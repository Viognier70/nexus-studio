// ORDER 322 B (Anders 2026-10-09, "den riktiga kartan gäller") — byn mot den riktiga kartan.
//
//   1. Inga påhittade hus är dolda på en väg (BUILDINGS_ON_ROADS är tom), och inget riktigt hus döljs.
//   2. Industrihusen vid stationen står; genomfarterna genom dem (tunnel=building_passage) ritas inte.
//   3. Vid riktiga hus nära vägen ritas vägen smalare eller utan trottoar, inte bortklippt (roadSurface.ts).
//   4. Inget påhittat hus står på en riktig väg.
//   5. De handbyggda landmärkena står på sin plats på kartan (landmark.position är polygonens mitt).
//   B.3. Vägändar bara där de finns i verkligheten: varje ände av en ritad vägbit i byn är en riktig återvändsgata,
//        genomfartens vägg, eller ligger på en annan ritad vägbit. Undantaget står i KNOWN_ENDS.
//
// Måttet är detsamma som i scripts/order322-karta.mjs (gameEndsNotRealEnds), som ritar bilderna; här läses
// renderingens bitar direkt (roadRenderPieces) och OSM-underlaget med samma projektion som ingesten.

import { describe, expect, it } from 'vitest';
import osmRaw from '../data/grythyttan-osm.json';
import { roadRenderPieces } from '../content/roadSurface';
import { BUILDINGS_ON_ROADS } from '../content/buildingsOnRoads';
import { WORLD, type Vec2Tuple } from '../content/world';

interface OsmWay { type: string; id: number; nodes: number[]; tags?: Record<string, string>; geometry: Array<{ lat: number; lon: number }> }
const OSM = (osmRaw as unknown as { elements: OsmWay[] }).elements.filter((e) => e.type === 'way');
const [LAT0, LON0] = WORLD.meta.centerLatLon;
const [MZ, MX] = WORLD.meta.mPerDeg;
const proj = (lat: number, lon: number): Vec2Tuple => [(lon - LON0) * MX, -(lat - LAT0) * MZ];

// Toleranserna som i order322-karta.mjs.
const END_TOL_M = 1.5, JOIN_TOL_M = 1.0, MARGIN_M = 60;

// Inga undantag. Uppfarten w862853244 gick i OSM 0,34 m från Länsmansgårdens hörn (w1422743880) och bröts; dess
// mittlinje är flyttad 0,5 m från huset (fetch-grythyttan-osm.mjs ROAD_SHIFTS, Anders 2026-10-09).
const KNOWN_ENDS: string[] = [];

const d2 = (a: Vec2Tuple, b: Vec2Tuple) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segDist(p: Vec2Tuple, a: Vec2Tuple, b: Vec2Tuple) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
const polyDist = (p: Vec2Tuple, poly: Vec2Tuple[]) => { let m = Infinity; for (let i = 1; i < poly.length; i++) m = Math.min(m, segDist(p, poly[i - 1], poly[i])); return m; };

function falseEnds() {
  const roads = OSM.filter((w) => w.tags?.highway).map((w) => ({ id: `w${w.id}`, nodes: w.nodes, tunnel: w.tags?.tunnel, poly: w.geometry.map((g) => proj(g.lat, g.lon)) }));
  const realHouses = OSM.filter((w) => w.tags?.building).map((w) => w.geometry.map((g) => proj(g.lat, g.lon)));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const poly of realHouses) for (const [x, z] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  const inArea = ([x, z]: Vec2Tuple) => x >= minX - MARGIN_M && x <= maxX + MARGIN_M && z >= minZ - MARGIN_M && z <= maxZ + MARGIN_M;
  const nodeWays = new Map<number, number>(), nodePos = new Map<number, Vec2Tuple>();
  for (const r of roads) {
    r.nodes.forEach((n, i) => nodePos.set(n, r.poly[i]));
    for (const n of new Set(r.nodes)) nodeWays.set(n, (nodeWays.get(n) ?? 0) + 1);
  }
  const allowed: Vec2Tuple[] = [];
  for (const r of roads) for (const n of [r.nodes[0], r.nodes[r.nodes.length - 1]]) if (nodeWays.get(n) === 1) allowed.push(nodePos.get(n)!);
  for (const r of roads) if (r.tunnel === 'building_passage') allowed.push(r.poly[0], r.poly[r.poly.length - 1]);
  const pieces = roadRenderPieces();
  const out: string[] = [];
  for (const g of pieces) {
    if (d2(g.poly[0], g.poly[g.poly.length - 1]) <= END_TOL_M) continue;
    for (const e of [g.poly[0], g.poly[g.poly.length - 1]]) {
      if (!inArea(e)) continue;
      if (allowed.some((r) => d2(r, e) <= END_TOL_M)) continue;
      if (pieces.some((o) => o !== g && polyDist(e, o.poly) <= o.half + o.sidewalk + JOIN_TOL_M)) continue;
      out.push(g.id);
    }
  }
  return out;
}

function polygonCentre(poly: Vec2Tuple[]): Vec2Tuple {
  let cx = 0, cz = 0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; }
  return [cx / (poly.length - 1), cz / (poly.length - 1)];
}

describe('ORDER 322 B — byn mot den riktiga kartan', () => {
  it('1–2. inget hus är dolt på en väg, och industrihusen vid stationen står', () => {
    expect([...BUILDINGS_ON_ROADS]).toEqual([]);
    const ids = new Set(WORLD.buildings.map((b) => b.id));
    expect(ids.has('w870510826')).toBe(true);
    expect(ids.has('w870510828')).toBe(true);
    // Genomfarterna ritas inte.
    const drawn = new Set(roadRenderPieces().map((p) => p.wayId));
    expect(drawn.has('w1329020075')).toBe(false);
    expect(drawn.has('w1329020076')).toBe(false);
  });

  it('1 och 4. de påhittade husen på vägarna är borttagna', () => {
    const gone = ['vw-kyr-torget-lh', 'vw-pra-18', 'vw-sorgarden', 'vw-mag-warehouse', 'vw-jarn-9', 'vw-kyr-9e-mansard', 'vw-hjv-5', 'vw-pra-8', 'vw-pra-15s', 'vw-forskola'];
    const ids = new Set(WORLD.buildings.map((b) => b.id));
    for (const id of gone) expect(ids.has(id), id).toBe(false);
  });

  it('3. vid riktiga hus nära vägen ritas vägen, smalare eller utan trottoar', () => {
    // Artur Lindqvists gata (w1422743879) förbi w869907963: förut 44 m borta.
    const pieces = roadRenderPieces().filter((p) => p.wayId === 'w1422743879');
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.some((p) => p.sidewalk === 0)).toBe(true);
  });

  it('5. de handbyggda landmärkena står på polygonens mitt', () => {
    for (const lid of ['gry-kyrka', 'gry-campus', 'gry-gastgivaregard', 'gry-pizzanshus', 'gry-herrgard', 'gry-jarnvag']) {
      const l = WORLD.landmarks.find((x) => x.id === lid)!;
      const b = WORLD.buildings.find((x) => x.id === `w${l.source.osmId}`)!;
      expect(d2(l.position, polygonCentre(b.poly)), lid).toBeLessThan(0.01);
    }
  });

  it('B.3. vägändar bara där de finns i verkligheten', () => {
    expect(falseEnds()).toEqual(KNOWN_ENDS);
  }, 120000);
});
