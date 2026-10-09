// ORDER 312 — vägytan som renderingen ritar den, som data.
//
// OsmRoads.tsx ritade vägarna ur CLIPPED_ROADS, klippte dem mot husen
// (ORDER 158) och byggde körbanan som en remsa med bredden ur
// ROLE_SPECS[roleFor(road)] (roadRoles.ts). Den beräkningen bodde inne i
// komponenten. Här står den som en ren funktion, `roadRenderPieces()`, och
// OsmRoads läser den. Mätningarna i ORDER 312 (hus på vägen, bilarnas väg,
// vagnarnas platser) läser samma funktion, så att de mäter samma yta som
// spelaren ser (CLAUDE.md, "Mätningar mot det de beskriver").
//
// Remsan byggs med samma normal som OsmRoads buildRoadShape: för varje punkt
// medelriktningen mellan grannpunkterna, vänster och höger kant på ±halva
// bredden. Fyrhörningen mellan punkt i och i+1 är en bit av den ritade ytan.
// Enheten är meter.

import { CLIPPED_ROADS, WORLD } from './world';
import type { RawRoad, Vec2Tuple } from './world';
import { specFor, type RoadRole } from './roadRoles';
import { inside, polygonBounds } from '../procgen/geom';

// Ytor där en stenlagd trottoar skulle motsäga vägen själv (OsmRoads).
export const UNPAVED_SURFACES: ReadonlySet<string> = new Set([
  'unpaved', 'compacted', 'gravel', 'fine_gravel',
  'ground', 'dirt', 'grass', 'mud', 'sand'
]);

export interface RoadRenderPiece {
  /** Bitens id: förälderns id för bit 0, annars `#eN` (OsmRoads). */
  id: string;
  /** OSM-vägens id (utan `#p`/`#e`). */
  wayId: string;
  road: RawRoad;
  role: RoadRole;
  /** Gång-, cykel- och skogsväg (ROLE_SPECS.ped). Inte körbana för bilar. */
  ped: boolean;
  /** Halva körbanans bredd, meter (ROLE_SPECS[role].width / 2). */
  half: number;
  /** Trottoarens bredd per sida om den ritas här, annars 0. */
  sidewalk: number;
  poly: Vec2Tuple[];
}

// ORDER 322 B (Anders 2026-10-09: "Vid riktiga hus nära vägen ritas vägen utan trottoar i stället för att tas
// bort"). Förut klipptes hela vägen där remsan med trottoaren (ORDER 158) kom inom räckhåll från ett hus, och en
// bit utan trottoar fick den bara om ingen punkt på biten nådde ett hus. Nu provas mittlinjen var SAMPLE_M meter:
//   - trottoaren ritas där dess kant (halva bredden + trottoaren) är fri från hus. Annars ritas biten utan den;
//   - går också körbanans kant (±halva bredden) in i ett hus, ritas körbanan smalare där, så bred som ryms
//     (steg om NARROW_STEP_M, minst MIN_HALF_M, alltså 1 m körbana). Riktiga uppfarter går i Grythyttan ibland
//     0,6 m från en husvägg;
//   - bara där mittlinjen själv går in i ett hus, eller inte ens MIN_HALF_M ryms, klipps vägen. En väg som går
//     rakt mot en gavel ritas fram till gaveln.
// Vägens egna punkter står kvar, och bitarna delar sin gränspunkt så att de möts utan glipa. En väg som inte
// når något hus lämnas orörd.
const SAMPLE_M = 1.0;
const NARROW_STEP_M = 0.25;
export const MIN_HALF_M = 0.5;

function pointInBuilding(x: number, z: number): boolean {
  for (const b of WORLD.buildings) {
    if (b.poly.length < 3) continue;
    const bb = polygonBounds(b.poly);
    if (x < bb.minX || x > bb.maxX || z < bb.minZ || z > bb.maxZ) continue;
    if (inside(b.poly, x, z)) return true;
  }
  return false;
}

/** Halva körbanan som ryms vid punkten (0: klipps), och om trottoaren ryms. */
interface Sample { p: Vec2Tuple; half: number; sw: boolean }

function sampleRoad(poly: Vec2Tuple[], half: number, swReach: number): Sample[] {
  const pts: Vec2Tuple[] = [poly[0]];
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1], b = poly[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / SAMPLE_M));
    for (let k = 1; k <= n; k++) pts.push(k === n ? b : [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0], dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;
    const clear = (r: number) => !pointInBuilding(p[0] + nx * r, p[1] + nz * r) && !pointInBuilding(p[0] - nx * r, p[1] - nz * r);
    if (pointInBuilding(p[0], p[1])) return { p, half: 0, sw: false };
    if (clear(half)) return { p, half, sw: swReach > half && clear(swReach) };
    for (let k = 1; half - k * NARROW_STEP_M >= MIN_HALF_M - 1e-9; k++) {
      const r = Math.round((half - k * NARROW_STEP_M) * 100) / 100;
      if (clear(r)) return { p, half: r, sw: false };
    }
    return { p, half: 0, sw: false };
  });
}

/** Körbanans bitar: delad där trottoaren börjar eller slutar och där körbanan smalnar. */
function splitRoad(poly: Vec2Tuple[], half: number, swReach: number): Array<{ poly: Vec2Tuple[]; half: number; sidewalk: boolean }> {
  const samples = sampleRoad(poly, half, swReach);
  const hasSw = swReach > half;
  if (samples.every((s) => s.half === half && s.sw === hasSw)) return [{ poly, half, sidewalk: hasSw }];
  const out: Array<{ poly: Vec2Tuple[]; half: number; sidewalk: boolean }> = [];
  // Läget per punkt: 'sw' (full bredd med trottoar), 'full' (utan trottoar), 'narrow' (smalare), 'cut'.
  const mode = (s: Sample) => (s.half === 0 ? 'cut' : s.half < half ? 'narrow' : s.sw ? 'sw' : 'full');
  // En gränspunkt hör till den bit som tål minst: trottoaren och den fulla bredden når aldrig huset.
  const rank = { cut: 0, narrow: 1, full: 2, sw: 3 } as const;
  let k = 0;
  while (k < samples.length) {
    const m = mode(samples[k]);
    if (m === 'cut') { k++; continue; }
    let j = k;
    while (j + 1 < samples.length && mode(samples[j + 1]) === m) j++;
    // Gränspunkterna mot grannarna läggs till den bit som tål minst.
    let from = k, to = j;
    if (k > 0 && mode(samples[k - 1]) !== 'cut' && rank[mode(samples[k - 1])] > rank[m]) from = k - 1;
    if (j + 1 < samples.length && mode(samples[j + 1]) !== 'cut' && rank[mode(samples[j + 1])] > rank[m]) to = j + 1;
    const run = samples.slice(from, to + 1);
    if (run.length >= 2) {
      const keep = run.filter((s, i) => i === 0 || i === run.length - 1 || poly.includes(s.p));
      const h = m === 'narrow' ? Math.min(...run.slice(from === k ? 0 : 1, run.length - (to === j ? 0 : 1)).map((s) => s.half)) : half;
      out.push({ poly: keep.map((s) => s.p), half: h, sidewalk: m === 'sw' });
    }
    k = j + 1;
  }
  return out;
}

function computeRoadRenderPieces(): RoadRenderPiece[] {
  const out: RoadRenderPiece[] = [];
  for (const road of CLIPPED_ROADS) {
    if (road.poly.length < 2) continue;
    const spec = specFor(road);
    const half = spec.width / 2;
    const surfaceIsUnpaved = road.surface != null && UNPAVED_SURFACES.has(road.surface);
    const swWidth = spec.sidewalkWidth > 0 && !surfaceIsUnpaved ? spec.sidewalkWidth : 0;
    const pieces = splitRoad(road.poly, half, half + swWidth);
    pieces.forEach((piece, pi) => {
      const id = pi === 0 ? road.id : `${road.id}#e${pi}`;
      out.push({
        id,
        wayId: road.id.split('#')[0],
        road: { ...road, id, poly: piece.poly },
        role: spec.role,
        ped: spec.ped,
        half: piece.half,
        sidewalk: piece.sidewalk ? swWidth : 0,
        poly: piece.poly
      });
    });
  }
  return out;
}

let piecesCache: RoadRenderPiece[] | null = null;

/** Vägbitarna som OsmRoads ritar, med körbanans halva bredd och trottoaren. */
export function roadRenderPieces(): RoadRenderPiece[] {
  return (piecesCache ??= computeRoadRenderPieces());
}

// ---------- Remsans fyrhörningar ----------

/** Vänster och höger kant på ±half, med samma normal som OsmRoads buildRoadShape. */
export function stripEdges(poly: Vec2Tuple[], half: number): { left: Vec2Tuple[]; right: Vec2Tuple[] } {
  const left: Vec2Tuple[] = [];
  const right: Vec2Tuple[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const prev = poly[Math.max(0, i - 1)];
    const next = poly[Math.min(poly.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    left.push([p[0] + nx * half, p[1] + nz * half]);
    right.push([p[0] - nx * half, p[1] - nz * half]);
  }
  return { left, right };
}

export type RoadSurfaceKind = 'carriageway' | 'sidewalk';

export interface RoadQuad {
  piece: RoadRenderPiece;
  surface: RoadSurfaceKind;
  /** Fyrhörningen: vänster i, vänster i+1, höger i+1, höger i. */
  quad: [Vec2Tuple, Vec2Tuple, Vec2Tuple, Vec2Tuple];
  /** Mittlinjens segment och avståndet till kanten (half eller half + trottoar). */
  a: Vec2Tuple;
  b: Vec2Tuple;
  reach: number;
  minX: number; maxX: number; minZ: number; maxZ: number;
}

const CELL_M = 16;

interface QuadIndex { quads: RoadQuad[]; grid: Map<string, number[]> }
let indexCache: QuadIndex | null = null;

function cellKey(ix: number, iz: number): string { return `${ix}:${iz}`; }

function buildIndex(): QuadIndex {
  const quads: RoadQuad[] = [];
  for (const piece of roadRenderPieces()) {
    const layers: Array<[RoadSurfaceKind, number]> = [['carriageway', piece.half]];
    if (piece.sidewalk > 0) layers.push(['sidewalk', piece.half + piece.sidewalk]);
    for (const [surface, reach] of layers) {
      const { left, right } = stripEdges(piece.poly, reach);
      for (let i = 0; i < piece.poly.length - 1; i++) {
        const quad: RoadQuad['quad'] = [left[i], left[i + 1], right[i + 1], right[i]];
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const [x, z] of quad) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        quads.push({ piece, surface, quad, a: piece.poly[i], b: piece.poly[i + 1], reach, minX, maxX, minZ, maxZ });
      }
    }
  }
  const grid = new Map<string, number[]>();
  quads.forEach((q, k) => {
    for (let ix = Math.floor(q.minX / CELL_M); ix <= Math.floor(q.maxX / CELL_M); ix++) {
      for (let iz = Math.floor(q.minZ / CELL_M); iz <= Math.floor(q.maxZ / CELL_M); iz++) {
        const key = cellKey(ix, iz);
        const list = grid.get(key);
        if (list) list.push(k); else grid.set(key, [k]);
      }
    }
  });
  return { quads, grid };
}

function index(): QuadIndex { return (indexCache ??= buildIndex()); }

function quadsNear(minX: number, maxX: number, minZ: number, maxZ: number): RoadQuad[] {
  const { quads, grid } = index();
  const seen = new Set<number>();
  const out: RoadQuad[] = [];
  for (let ix = Math.floor(minX / CELL_M); ix <= Math.floor(maxX / CELL_M); ix++) {
    for (let iz = Math.floor(minZ / CELL_M); iz <= Math.floor(maxZ / CELL_M); iz++) {
      for (const k of grid.get(cellKey(ix, iz)) ?? []) {
        if (seen.has(k)) continue;
        seen.add(k);
        const q = quads[k];
        if (q.maxX < minX || q.minX > maxX || q.maxZ < minZ || q.minZ > maxZ) continue;
        out.push(q);
      }
    }
  }
  return out;
}

// ---------- Geometri ----------

/** Punkt i polygon (stängd eller öppen ring). */
export function pointInPolygon(poly: readonly Vec2Tuple[], x: number, z: number): boolean {
  return inside(poly as Vec2Tuple[], x, z);
}

function segSegIntersect(p1: Vec2Tuple, p2: Vec2Tuple, p3: Vec2Tuple, p4: Vec2Tuple): boolean {
  const d = (a: Vec2Tuple, b: Vec2Tuple, c: Vec2Tuple) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Ringens kanter, stängd även om sista punkten inte upprepar den första. */
export function ringEdges(poly: readonly Vec2Tuple[]): Array<[Vec2Tuple, Vec2Tuple]> {
  const out: Array<[Vec2Tuple, Vec2Tuple]> = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (a[0] !== b[0] || a[1] !== b[1]) out.push([a, b]);
  }
  return out;
}

/** Skär två polygoner varandra (kant mot kant, eller en punkt inuti den andra)? */
export function polygonsOverlap(p: readonly Vec2Tuple[], q: readonly Vec2Tuple[]): boolean {
  if (p.length < 3 || q.length < 3) return false;
  for (const [a, b] of ringEdges(p)) for (const [c, d] of ringEdges(q)) if (segSegIntersect(a, b, c, d)) return true;
  if (pointInPolygon(q, p[0][0], p[0][1])) return true;
  if (pointInPolygon(p, q[0][0], q[0][1])) return true;
  return false;
}

function distSegSeg(a: Vec2Tuple, b: Vec2Tuple, c: Vec2Tuple, d: Vec2Tuple): number {
  if (segSegIntersect(a, b, c, d)) return 0;
  const ds = (p: Vec2Tuple, s0: Vec2Tuple, s1: Vec2Tuple) => {
    const dx = s1[0] - s0[0], dz = s1[1] - s0[1];
    const L = dx * dx + dz * dz;
    const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - s0[0]) * dx + (p[1] - s0[1]) * dz) / L));
    return Math.hypot(p[0] - (s0[0] + t * dx), p[1] - (s0[1] + t * dz));
  };
  return Math.min(ds(a, c, d), ds(b, c, d), ds(c, a, b), ds(d, a, b));
}

/** Kortaste avståndet från mittlinjens segment a→b till polygonens yta (0 om segmentet når in). */
function segmentToPolygon(a: Vec2Tuple, b: Vec2Tuple, poly: readonly Vec2Tuple[]): number {
  if (pointInPolygon(poly, a[0], a[1]) || pointInPolygon(poly, b[0], b[1])) return 0;
  let m = Infinity;
  for (const [c, d] of ringEdges(poly)) m = Math.min(m, distSegSeg(a, b, c, d));
  return m;
}

export interface RoadOverlap {
  pieceId: string;
  wayId: string;
  role: RoadRole;
  name: string | null;
  ped: boolean;
  surface: RoadSurfaceKind;
  /** Hur långt in över kanten polygonen når, meter (kantens avstånd minus avståndet till mittlinjen). */
  depthM: number;
  /** En punkt i överlappet (polygonens punkt närmast mittlinjen). */
  at: Vec2Tuple;
}

function closestPolygonPointToSegment(a: Vec2Tuple, b: Vec2Tuple, poly: readonly Vec2Tuple[]): Vec2Tuple {
  // Polygonens hörn och kantpunkter var 0,25 m: den som ligger närmast segmentet.
  let best: Vec2Tuple = poly[0];
  let bestD = Infinity;
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L = dx * dx + dz * dz;
  const dist = (x: number, z: number) => {
    const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L));
    return Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz));
  };
  for (const [c, d] of ringEdges(poly)) {
    const n = Math.max(1, Math.ceil(Math.hypot(d[0] - c[0], d[1] - c[1]) / 0.25));
    for (let k = 0; k <= n; k++) {
      const x = c[0] + ((d[0] - c[0]) * k) / n;
      const z = c[1] + ((d[1] - c[1]) * k) / n;
      const v = dist(x, z);
      if (v < bestD) { bestD = v; best = [x, z]; }
    }
  }
  return best;
}

/**
 * Vägytorna som en polygon (ett hus, en vagn, ett rum) ligger på. En träff
 * per vägbit och yta, den djupaste. `depthM` är hur många meter polygonen når
 * in över ytans kant.
 */
export function roadOverlapsForPolygon(poly: readonly Vec2Tuple[], opts?: { surfaces?: RoadSurfaceKind[] }): RoadOverlap[] {
  if (poly.length < 3) return [];
  const surfaces = opts?.surfaces ?? ['carriageway', 'sidewalk'];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const best = new Map<string, RoadOverlap>();
  for (const q of quadsNear(minX, maxX, minZ, maxZ)) {
    if (!surfaces.includes(q.surface)) continue;
    if (!polygonsOverlap(poly, q.quad)) continue;
    const dist = segmentToPolygon(q.a, q.b, poly);
    const depthM = Math.max(0, q.reach - dist);
    const key = `${q.piece.id}|${q.surface}`;
    const prev = best.get(key);
    if (prev && prev.depthM >= depthM) continue;
    best.set(key, {
      pieceId: q.piece.id,
      wayId: q.piece.wayId,
      role: q.piece.role,
      name: q.piece.road.name ?? null,
      ped: q.piece.ped,
      surface: q.surface,
      depthM,
      at: closestPolygonPointToSegment(q.a, q.b, poly)
    });
  }
  return [...best.values()].sort((x, y) => y.depthM - x.depthM);
}

/** Vägytorna under en punkt (körbana eller trottoar). */
export function roadQuadsAt(x: number, z: number): RoadQuad[] {
  return quadsNear(x, x, z, z).filter((q) => pointInPolygon(q.quad, x, z));
}

/** Rektangeln för en låda med bredd w (lokala x) och längd l (lokala z), placerad som Three:s rotation.y. */
export function boxFootprint(cx: number, cz: number, rotationY: number, w: number, l: number, offsetZ = 0): Vec2Tuple[] {
  const c = Math.cos(rotationY), s = Math.sin(rotationY);
  const pts: Array<[number, number]> = [[-w / 2, -l / 2 + offsetZ], [w / 2, -l / 2 + offsetZ], [w / 2, l / 2 + offsetZ], [-w / 2, l / 2 + offsetZ]];
  // Three: rotation.y = θ ger världen (x cosθ + z sinθ, −x sinθ + z cosθ).
  return pts.map(([x, z]) => [cx + x * c + z * s, cz - x * s + z * c] as Vec2Tuple);
}

// ---------- Bilarnas yta ----------

/** Ligger punkten på en ritad körbana för bilar (inte gång-, cykel- eller skogsväg)? */
export function onCarCarriageway(x: number, z: number): boolean {
  return quadsNear(x, x, z, z).some((q) => q.surface === 'carriageway' && !q.piece.ped && pointInPolygon(q.quad, x, z));
}

/** Ligger hela sträckan a→b (prov var `stepM` meter, ändarna med) på en ritad körbana för bilar? */
export function segmentOnCarCarriageway(a: Vec2Tuple, b: Vec2Tuple, stepM = 1): boolean {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(L / stepM));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    if (!onCarCarriageway(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
  }
  return true;
}

// ---------- Gångytan (ORDER 312b) ----------

/**
 * Ligger punkten på en ritad gångyta: en gång-, cykel- eller skogsväg
 * (ROLE_SPECS.ped), en ritad trottoar som inte ligger på en körbana för
 * bilar, eller kanten av en bilgata utan trottoar (EDGE_WALK_M)? Anders 2026-10-06: folk till fots går bara där, på samma sätt
 * som bilarna bara kör på körbanan.
 */
export function onWalkSurface(x: number, z: number): boolean {
  const qs = quadsNear(x, x, z, z).filter((q) => pointInPolygon(q.quad, x, z));
  if (qs.some((q) => q.piece.ped && q.surface === 'carriageway')) return true;
  const car = qs.filter((q) => !q.piece.ped && q.surface === 'carriageway');
  if (car.length > 0) return car.every((q) => q.piece.sidewalk === 0 && distToSegment(x, z, q.a, q.b) >= q.piece.half - EDGE_WALK_M);
  return qs.some((q) => q.surface === 'sidewalk');
}

/**
 * På en bilgata utan ritad trottoar går man i körbanans kant: inom
 * EDGE_WALK_M (1,0 m) från kanten, aldrig mitt i gatan (ORDER 302). ORDER 312b,
 * Claude Codes val: utan det når ingen Sjöboden (servicevägen w860753013)
 * eller de andra 140 servicegatorna; frågan står i ORDER_312B_RAPPORT.md.
 */
export const EDGE_WALK_M = 1.0;

function distToSegment(x: number, z: number, a: Vec2Tuple, b: Vec2Tuple): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const L2 = dx * dx + dz * dz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
}

/** OSM-vägarna (wayId) vars ritade körbana för bilar täcker punkten. */
export function carriagewayWaysAt(x: number, z: number): Set<string> {
  const out = new Set<string>();
  for (const q of quadsNear(x, x, z, z)) {
    if (q.surface === 'carriageway' && !q.piece.ped && pointInPolygon(q.quad, x, z)) out.add(q.piece.wayId);
  }
  return out;
}

/** OSM-vägarna (wayId) vars ritade mittlinje-remsa (körbana eller gångväg) täcker punkten. */
export function roadWaysAt(x: number, z: number): Set<string> {
  const out = new Set<string>();
  for (const q of quadsNear(x, x, z, z)) {
    if (q.surface === 'carriageway' && pointInPolygon(q.quad, x, z)) out.add(q.piece.wayId);
  }
  return out;
}

/**
 * ORDER 312 — en bils linje klipps till den ritade körbanan för bilar. Linjen
 * provas var `stepM` meter: mittlinjen, ± `lateralM` åt sidorna och
 * ± `longitudinalM` framåt och bakåt (bilens nos och bakdel vid en vägs
 * slut). Bitarna där alla ligger på körbanan blir kvar (minst två punkter).
 */
export function trimPolylineToCarSurface(poly: Vec2Tuple[], lateralM: number, longitudinalM = 0, stepM = 1): Vec2Tuple[][] {
  const out: Vec2Tuple[][] = [];
  if (poly.length < 2) return out;
  let run: Vec2Tuple[] = [];
  const flush = () => { if (run.length >= 2) out.push(run); run = []; };
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L === 0) continue;
    const nx = -(b[1] - a[1]) / L;
    const nz = (b[0] - a[0]) / L;
    const n = Math.max(1, Math.ceil(L / stepM));
    for (let k = run.length === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      const fx = (b[0] - a[0]) / L;
      const fz = (b[1] - a[1]) / L;
      const ok = onCarCarriageway(x, z) &&
        onCarCarriageway(x + nx * lateralM, z + nz * lateralM) &&
        onCarCarriageway(x - nx * lateralM, z - nz * lateralM) &&
        onCarCarriageway(x + fx * longitudinalM, z + fz * longitudinalM) &&
        onCarCarriageway(x - fx * longitudinalM, z - fz * longitudinalM);
      if (ok) run.push([x, z]);
      else flush();
    }
  }
  flush();
  return out;
}

/**
 * ORDER 312 — når polygonen inom `gapM` från en vägs körbana i kartan
 * (CLIPPED_ROADS, bredden ur ROLE_SPECS), också där OsmRoads har klippt bort
 * remsan nära ett hus? För det som placeras av spelet (uthusen): det ska inte
 * stå i vägens lucka.
 */
export function polygonNearMapRoad(poly: readonly Vec2Tuple[], gapM: number): boolean {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  for (const road of CLIPPED_ROADS) {
    const reach = specFor(road).width / 2 + gapM;
    for (let i = 1; i < road.poly.length; i++) {
      const a = road.poly[i - 1];
      const b = road.poly[i];
      if (Math.max(a[0], b[0]) < minX - reach || Math.min(a[0], b[0]) > maxX + reach ||
          Math.max(a[1], b[1]) < minZ - reach || Math.min(a[1], b[1]) > maxZ + reach) continue;
      if (segmentToPolygon(a, b, poly) < reach) return true;
    }
  }
  return false;
}
