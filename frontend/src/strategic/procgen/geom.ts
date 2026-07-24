import { CAR_ROADS, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Shared deterministic procedural-geometry primitives, used by every
// per-parcel scene component (OsmParcelBoundaries, OsmDriveways,
// OsmProceduralOutbuildings, OsmPropertyDetail, OsmYards). Each of those
// modules used to keep its own copy of these helpers — the copies drifted
// slightly over successive orders and every duplicate risked breaking
// determinism if one branch was patched without the others.
//
// Every function here is pure and deterministic. Do not add stateful
// generators, timers, RNG seeds that depend on Date, or anything else
// that would break session-to-session stability.

// ---------- Deterministic hash ----------
// FNV-1a 32-bit over the id string; result mapped to [0, 1). The exact
// byte layout matches the previous per-file `idHash` implementations
// so no procedural placement, wealth tier, colour wobble or dormer
// count shifts as a side-effect of this refactor.
export function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

// ---------- Polygon primitives ----------

// Unsigned polygon area via the shoelace formula.
export function polygonArea(poly: Vec2Tuple[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    sum += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  }
  return Math.abs(sum) / 2;
}

// Simple vertex-average centroid (matches the previous per-file
// `centroid` / `polygonCentroid` implementations — deliberately
// unweighted so the deterministic outputs don't shift).
export function polygonCentroid(poly: Vec2Tuple[]): [number, number] {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function polygonBounds(poly: Vec2Tuple[]): Bounds {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

// Ray-casting point-in-polygon.
export function inside(polygon: Vec2Tuple[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) hit = !hit;
  }
  return hit;
}

// Distance from point (px, pz) to segment (a → b).
export function distanceToSegment(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  px: number,
  pz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

// Min distance from a point to any segment of a polygon (open path).
export function distanceToPolygon(
  poly: Vec2Tuple[],
  x: number,
  z: number
): number {
  let m = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distanceToSegment(
      poly[i][0], poly[i][1],
      poly[i + 1][0], poly[i + 1][1],
      x, z
    );
    if (d < m) m = d;
  }
  return m;
}

// ---------- Oriented bounding box ----------
// Rotate the polygon so its longest edge lies along local X, then take
// the axis-aligned bbox in that frame. Returns the OBB width (`w`
// along the ridge), depth (`d`), the rotation angle in radians, and
// the unrotated polygon centroid.
export interface OBB {
  centre: [number, number];
  w: number;
  d: number;
  angle: number;
}

export function orientedBbox(poly: Vec2Tuple[]): OBB {
  let bestLen = 0;
  let angle = 0;
  for (let i = 1; i < poly.length; i++) {
    const dx = poly[i][0] - poly[i - 1][0];
    const dz = poly[i][1] - poly[i - 1][1];
    const l = Math.hypot(dx, dz);
    if (l > bestLen) {
      bestLen = l;
      angle = Math.atan2(dz, dx);
    }
  }
  const centre = polygonCentroid(poly);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of poly) {
    const u = (x - centre[0]) * cos - (z - centre[1]) * sin;
    const v = (x - centre[0]) * sin + (z - centre[1]) * cos;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  return { centre, w: maxU - minU, d: maxV - minV, angle };
}

// ---------- Local ↔ world coordinate helpers ----------
// Rotate a local-frame offset (lx, lz) around the OBB's angle and
// translate to the OBB's world centroid.
export function obbLocalToWorld(
  obb: OBB,
  lx: number,
  lz: number
): [number, number] {
  const cos = Math.cos(obb.angle);
  const sin = Math.sin(obb.angle);
  return [
    obb.centre[0] + cos * lx - sin * lz,
    obb.centre[1] + sin * lx + cos * lz
  ];
}

// ---------- Spatial exclusion helpers ----------
// Each of these iterates over WORLD.buildings / .water etc. once and
// short-circuits on a hit. Every module used to keep its own copies of
// these tests with slightly different dilation conventions; the
// consolidated helpers pin the semantics: `dilation` is the outward
// bbox expansion in metres.

export function nearAnyBuilding(
  x: number,
  z: number,
  excludeId: string | null,
  dilation: number
): boolean {
  for (const b of WORLD.buildings) {
    if (excludeId != null && b.id === excludeId) continue;
    if (b.poly.length < 3) continue;
    const bb = polygonBounds(b.poly);
    if (
      x < bb.minX - dilation ||
      x > bb.maxX + dilation ||
      z < bb.minZ - dilation ||
      z > bb.maxZ + dilation
    ) continue;
    if (inside(b.poly, x, z)) return true;
  }
  return false;
}

export function inAnyWater(x: number, z: number): boolean {
  for (const w of WORLD.water) {
    if (w.poly.length < 3) continue;
    if (inside(w.poly, x, z)) return true;
  }
  return false;
}

export function inAnyForest(x: number, z: number): boolean {
  for (const f of WORLD.forest) {
    if (f.poly.length < 3) continue;
    if (inside(f.poly, x, z)) return true;
  }
  return false;
}

export function inAnyResidential(x: number, z: number): boolean {
  for (const r of WORLD.residential) {
    if (r.poly.length < 3) continue;
    if (inside(r.poly, x, z)) return true;
  }
  return false;
}

export function inAnyGrass(x: number, z: number): boolean {
  for (const g of WORLD.grass) {
    if (g.poly.length < 3) continue;
    if (inside(g.poly, x, z)) return true;
  }
  return false;
}

// ---------- Road segments ----------
// Precomputed flat list of car-drivable road segments with squared
// length for fast distance tests. Callers pass this into
// `nearAnyRoadSegment` / `closestRoadPoint`.
export interface RoadSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  lenSq: number;
}

// Build once per module, cached in module state. All callers get the
// same array reference — the road network doesn't change at runtime.
let CACHED_ROAD_SEGMENTS: RoadSegment[] | null = null;

export function carRoadSegments(): RoadSegment[] {
  if (CACHED_ROAD_SEGMENTS) return CACHED_ROAD_SEGMENTS;
  const out: RoadSegment[] = [];
  // Uses the building-clipped car road set (see CLIPPED_ROADS in
  // content/world.ts) so procedural placement — driveways, parcel
  // fences, meadow vegetation exclusion — never respects a phantom
  // road segment that runs through a building wall.
  for (const road of CAR_ROADS) {
    if (road.poly.length < 2) continue;
    for (let i = 1; i < road.poly.length; i++) {
      const ax = road.poly[i - 1][0];
      const az = road.poly[i - 1][1];
      const bx = road.poly[i][0];
      const bz = road.poly[i][1];
      const dx = bx - ax;
      const dz = bz - az;
      out.push({ ax, az, bx, bz, lenSq: dx * dx + dz * dz });
    }
  }
  CACHED_ROAD_SEGMENTS = out;
  return out;
}

export function nearAnyRoadSegment(
  x: number,
  z: number,
  segments: RoadSegment[],
  maxDist: number
): boolean {
  const maxSq = maxDist * maxDist;
  for (const s of segments) {
    if (s.lenSq === 0) {
      const dx = x - s.ax;
      const dz = z - s.az;
      if (dx * dx + dz * dz < maxSq) return true;
      continue;
    }
    let t = ((x - s.ax) * (s.bx - s.ax) + (z - s.az) * (s.bz - s.az)) / s.lenSq;
    t = Math.max(0, Math.min(1, t));
    const qx = s.ax + t * (s.bx - s.ax);
    const qz = s.az + t * (s.bz - s.az);
    const dx = x - qx;
    const dz = z - qz;
    if (dx * dx + dz * dz < maxSq) return true;
  }
  return false;
}

export function closestRoadPoint(
  x: number,
  z: number,
  segments: RoadSegment[]
): { qx: number; qz: number; distSq: number } | null {
  let bestSq = Infinity;
  let bx = 0;
  let bz = 0;
  for (const s of segments) {
    let t = 0;
    if (s.lenSq > 0) {
      t = ((x - s.ax) * (s.bx - s.ax) + (z - s.az) * (s.bz - s.az)) / s.lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const qx = s.ax + t * (s.bx - s.ax);
    const qz = s.az + t * (s.bz - s.az);
    const dx = x - qx;
    const dz = z - qz;
    const d = dx * dx + dz * dz;
    if (d < bestSq) {
      bestSq = d;
      bx = qx;
      bz = qz;
    }
  }
  if (bestSq === Infinity) return null;
  return { qx: bx, qz: bz, distSq: bestSq };
}

// ---------- Line-segment intersection ----------
// Standard 2D segment-segment intersection. Returns the parametric
// position on segment A (0..1) and world coords, or null if the
// segments do not properly cross. Used by fence-gate logic to find
// the driveway crossing point on a parcel boundary.
export function segmentIntersection(
  a1x: number, a1z: number, a2x: number, a2z: number,
  b1x: number, b1z: number, b2x: number, b2z: number
): { tA: number; tB: number; x: number; z: number } | null {
  const denom =
    (a2x - a1x) * (b2z - b1z) - (a2z - a1z) * (b2x - b1x);
  if (Math.abs(denom) < 1e-9) return null;   // parallel or coincident
  const tA =
    ((b1x - a1x) * (b2z - b1z) - (b1z - a1z) * (b2x - b1x)) / denom;
  const tB =
    ((b1x - a1x) * (a2z - a1z) - (b1z - a1z) * (a2x - a1x)) / denom;
  if (tA < 0 || tA > 1 || tB < 0 || tB > 1) return null;
  return {
    tA,
    tB,
    x: a1x + tA * (a2x - a1x),
    z: a1z + tA * (a2z - a1z)
  };
}

// Clip a polyline (road centreline) against every building footprint in
// the world, returning zero or more sub-polylines with the inside-building
// runs removed. Used by the road preprocessor so vehicles never travel
// through walls and the rendered asphalt never disappears under a
// building. Preferred over per-building exceptions: OSM occasionally
// tags a service road that continues into a warehouse loading bay as a
// through-road, and this clip fixes every case with one procedural rule.
//
// Algorithm: for each segment (a, b), collect the parametric positions of
// every intersection with any building polygon edge, sort and dedupe
// them. Between two consecutive crossings the segment cannot enter or
// leave any building, so the whole subinterval is either fully outside
// or fully inside — we classify it by testing its midpoint against
// `inside-any-building`. Outside subintervals are stitched into the
// current output polyline; a transition to inside flushes it. This is
// topology-robust: adjacent buildings that share a wall, or overlapping
// polygons, cannot break parity because each subinterval is classified
// on its own.
export function clipPolylineAgainstBuildings(
  poly: Vec2Tuple[]
): Vec2Tuple[][] {
  if (poly.length < 2) return [];
  const insideAnyBuilding = (x: number, z: number): boolean => {
    for (const b of WORLD.buildings) {
      if (b.poly.length < 3) continue;
      const bb = polygonBounds(b.poly);
      if (x < bb.minX || x > bb.maxX || z < bb.minZ || z > bb.maxZ) continue;
      if (inside(b.poly, x, z)) return true;
    }
    return false;
  };
  const result: Vec2Tuple[][] = [];
  let current: Vec2Tuple[] = [];
  let openOutside = false;
  const flush = () => {
    if (current.length >= 2) result.push(current);
    current = [];
    openOutside = false;
  };
  const pushOutsidePoint = (x: number, z: number) => {
    const last = current[current.length - 1];
    if (
      !last ||
      Math.abs(last[0] - x) > 1e-9 ||
      Math.abs(last[1] - z) > 1e-9
    ) {
      current.push([x, z]);
    }
  };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const minX = Math.min(a[0], b[0]);
    const maxX = Math.max(a[0], b[0]);
    const minZ = Math.min(a[1], b[1]);
    const maxZ = Math.max(a[1], b[1]);
    const ts: number[] = [0, 1];
    for (const bd of WORLD.buildings) {
      if (bd.poly.length < 3) continue;
      const bb = polygonBounds(bd.poly);
      if (maxX < bb.minX || bb.maxX < minX) continue;
      if (maxZ < bb.minZ || bb.maxZ < minZ) continue;
      for (let j = 0; j < bd.poly.length - 1; j++) {
        const p1 = bd.poly[j];
        const p2 = bd.poly[j + 1];
        const hit = segmentIntersection(
          a[0], a[1], b[0], b[1],
          p1[0], p1[1], p2[0], p2[1]
        );
        if (hit) ts.push(hit.tA);
      }
    }
    ts.sort((p, q) => p - q);
    const uniq: number[] = [ts[0]];
    for (let k = 1; k < ts.length; k++) {
      if (ts[k] - uniq[uniq.length - 1] > 1e-6) uniq.push(ts[k]);
    }
    for (let k = 0; k < uniq.length - 1; k++) {
      const t0 = uniq[k];
      const t1 = uniq[k + 1];
      const mt = (t0 + t1) / 2;
      const mx = a[0] + mt * (b[0] - a[0]);
      const mz = a[1] + mt * (b[1] - a[1]);
      if (insideAnyBuilding(mx, mz)) {
        if (openOutside) flush();
        continue;
      }
      const x0 = a[0] + t0 * (b[0] - a[0]);
      const z0 = a[1] + t0 * (b[1] - a[1]);
      const x1 = a[0] + t1 * (b[0] - a[0]);
      const z1 = a[1] + t1 * (b[1] - a[1]);
      if (!openOutside) {
        current.push([x0, z0]);
        openOutside = true;
      } else {
        pushOutsidePoint(x0, z0);
      }
      pushOutsidePoint(x1, z1);
    }
  }
  flush();
  return result;
}

// Exact segment-vs-any-building intersection. Used by parcel-boundary
// logic to reject fence sides that would clip a neighbour building —
// replaces the earlier N-point sampling approach which could miss
// crossings that fall between two adjacent sample points.
//
// Returns true if the segment (a1 → a2) crosses (or enters) any
// building polygon other than `excludeId`. `dilation` expands the
// bbox pre-reject; the actual intersection test is exact.
//
// ORDER 016 PASS 2 finding: an N=5 point-sample check let one real
// fence-through-building slip through at t=0.85 between samples.
// Exact segment-polygon-edge intersection removes that class of
// error entirely.
export function segmentCrossesAnyBuilding(
  a1x: number,
  a1z: number,
  a2x: number,
  a2z: number,
  excludeId: string | null,
  dilation = 0
): boolean {
  const minX = Math.min(a1x, a2x);
  const maxX = Math.max(a1x, a2x);
  const minZ = Math.min(a1z, a2z);
  const maxZ = Math.max(a1z, a2z);
  for (const b of WORLD.buildings) {
    if (excludeId != null && b.id === excludeId) continue;
    if (b.poly.length < 3) continue;
    const bb = polygonBounds(b.poly);
    if (
      maxX < bb.minX - dilation ||
      bb.maxX + dilation < minX ||
      maxZ < bb.minZ - dilation ||
      bb.maxZ + dilation < minZ
    ) continue;
    // Segment endpoint inside the polygon (segment starts / ends in it).
    if (inside(b.poly, a1x, a1z) || inside(b.poly, a2x, a2z)) return true;
    // Segment crosses any polygon edge.
    for (let i = 0; i < b.poly.length - 1; i++) {
      const p1 = b.poly[i];
      const p2 = b.poly[i + 1];
      if (
        segmentIntersection(
          a1x, a1z, a2x, a2z,
          p1[0], p1[1], p2[0], p2[1]
        )
      ) return true;
    }
  }
  return false;
}
