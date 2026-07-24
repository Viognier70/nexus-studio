import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { CAR_ROADS, LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Deterministic parcel boundaries — one line of fence, hedge or stone
// edge along each of the four OBB sides of every eligible residential
// building. Each segment is per-instance-scaled, so all fences of a
// given style render as a single drei Instances draw call.
//
// Style selection is driven by the building's wealth tier and a per-
// segment style hash — variety inside a neighbourhood without random
// noise. Segments are rejected if they would cross a road, sit on
// another building, or land in water.

function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function polygonArea(poly: Vec2Tuple[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    sum += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  }
  return Math.abs(sum) / 2;
}

function inside(polygon: Vec2Tuple[], x: number, z: number): boolean {
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

interface OBB {
  centre: [number, number];
  w: number;
  d: number;
  angle: number;
}

function computeOBB(poly: Vec2Tuple[]): OBB {
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
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  cx /= Math.max(1, n);
  cz /= Math.max(1, n);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of poly) {
    const u = (x - cx) * cos - (z - cz) * sin;
    const v = (x - cx) * sin + (z - cz) * cos;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  return { centre: [cx, cz], w: maxU - minU, d: maxV - minV, angle };
}

// Flat list of road segments for fast distance-to-road tests.
interface Segment {
  ax: number; az: number; bx: number; bz: number;
  lenSq: number;
}

function buildRoadSegments(): Segment[] {
  const out: Segment[] = [];
  for (const road of CAR_ROADS) {
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
  return out;
}

function nearAnyRoad(
  x: number,
  z: number,
  segments: Segment[],
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

function nearAnyBuilding(
  x: number,
  z: number,
  excludeId: string,
  dilation: number
): boolean {
  for (const b of WORLD.buildings) {
    if (b.id === excludeId) continue;
    if (b.poly.length < 3) continue;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [bx, bz] of b.poly) {
      if (bx < minX) minX = bx;
      if (bx > maxX) maxX = bx;
      if (bz < minZ) minZ = bz;
      if (bz > maxZ) maxZ = bz;
    }
    if (
      x < minX - dilation ||
      x > maxX + dilation ||
      z < minZ - dilation ||
      z > maxZ + dilation
    ) continue;
    if (inside(b.poly, x, z)) return true;
  }
  return false;
}

function inAnyWater(x: number, z: number): boolean {
  for (const w of WORLD.water) {
    if (w.poly.length < 3) continue;
    if (inside(w.poly, x, z)) return true;
  }
  return false;
}

type BoundaryStyle = 'painted_timber' | 'wire' | 'hedge' | 'stone';

const HOST_KINDS = new Set(['house', 'detached', 'residential']);

// Wealth tier resolved per building. Mirrors the OsmBuildings profile
// (kept local to avoid coupling — the hash bucket is identical).
type WealthTier = 'modest' | 'standard' | 'prosperous';
function wealthFor(id: string): WealthTier {
  const w = idHash(id + ':wealth');
  return w < 0.28 ? 'modest' : w < 0.85 ? 'standard' : 'prosperous';
}

// Per-side style selection. `null` = no boundary on this side, which is
// a legitimate outcome: a modest cottage may have wire on the road
// side and nothing at the back, a prosperous villa a hedge on three
// sides and a stone edge along the driveway.
function chooseStyle(
  wealth: WealthTier,
  buildingHash: number,
  sideHash: number
): BoundaryStyle | null {
  // Modest tier: mostly bare, occasional wire.
  if (wealth === 'modest') {
    if (buildingHash < 0.50) return null;
    return sideHash < 0.6 ? 'wire' : null;
  }
  // Standard tier: mix of painted timber, hedge, some bare.
  if (wealth === 'standard') {
    if (sideHash < 0.24) return null;
    if (sideHash < 0.58) return 'painted_timber';
    return 'hedge';
  }
  // Prosperous tier: mostly hedge / painted timber, some stone.
  if (sideHash < 0.12) return null;
  if (sideHash < 0.55) return 'hedge';
  if (sideHash < 0.85) return 'painted_timber';
  return 'stone';
}

interface Segment3D {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
}
interface CornerPost {
  x: number;
  z: number;
}

export function OsmParcelBoundaries() {
  const { paintedTimber, wire, hedge, stone, cornerPosts } = useMemo(() => {
    const paintedTimber: Segment3D[] = [];
    const wire: Segment3D[] = [];
    const hedge: Segment3D[] = [];
    const stone: Segment3D[] = [];
    const cornerPosts: CornerPost[] = [];
    const segments = buildRoadSegments();

    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;

      const wealth = wealthFor(b.id);
      const buildingHash = idHash(b.id + ':fence');

      const obb = computeOBB(b.poly);
      const margin =
        wealth === 'prosperous' ? 9 : wealth === 'standard' ? 7.5 : 6;
      const halfW = obb.w / 2 + margin;
      const halfD = obb.d / 2 + margin;
      const corners: Array<[number, number]> = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, halfD]
      ];
      const cos = Math.cos(obb.angle);
      const sin = Math.sin(obb.angle);

      // Track which corners are anchored by at least one valid side —
      // corner posts render only there so we don't leave a post
      // dangling in mid-air next to a rejected side.
      const cornerValid = [false, false, false, false];

      for (let s = 0; s < 4; s++) {
        const [ax, az] = corners[s];
        const [bxx, bzz] = corners[(s + 1) % 4];
        const sideHash = idHash(b.id + ':side' + s);
        const style = chooseStyle(wealth, buildingHash, sideHash);
        if (!style) continue;

        // World endpoints of this side.
        const wxA = obb.centre[0] + cos * ax - sin * az;
        const wzA = obb.centre[1] + sin * ax + cos * az;
        const wxB = obb.centre[0] + cos * bxx - sin * bzz;
        const wzB = obb.centre[1] + sin * bxx + cos * bzz;

        const NSAMPLES = 5;
        let valid = true;
        for (let i = 0; i <= NSAMPLES; i++) {
          const t = i / NSAMPLES;
          const px = wxA + t * (wxB - wxA);
          const pz = wzA + t * (wzB - wzA);
          if (nearAnyRoad(px, pz, segments, 2.0)) { valid = false; break; }
          if (nearAnyBuilding(px, pz, b.id, 0.6)) { valid = false; break; }
          if (inAnyWater(px, pz)) { valid = false; break; }
        }
        if (!valid) continue;

        const dx = wxB - wxA;
        const dz = wzB - wzA;
        const length = Math.hypot(dx, dz);
        if (length < 2) continue;
        const midX = (wxA + wxB) / 2;
        const midZ = (wzA + wzB) / 2;
        const angle = Math.atan2(dz, dx);
        const seg: Segment3D = { midX, midZ, length, angle };

        if (style === 'painted_timber') paintedTimber.push(seg);
        else if (style === 'wire') wire.push(seg);
        else if (style === 'hedge') hedge.push(seg);
        else stone.push(seg);

        cornerValid[s] = true;
        cornerValid[(s + 1) % 4] = true;
      }

      // Corner post at each parcel corner adjacent to at least one
      // valid side. Small dark-timber post so the parcel edge reads as
      // an intentional composition rather than four floating slabs.
      for (let c = 0; c < 4; c++) {
        if (!cornerValid[c]) continue;
        const [cx, cz] = corners[c];
        const wx = obb.centre[0] + cos * cx - sin * cz;
        const wz = obb.centre[1] + sin * cx + cos * cz;
        cornerPosts.push({ x: wx, z: wz });
      }
    }
    return { paintedTimber, wire, hedge, stone, cornerPosts };
  }, []);

  return (
    <group>
      {/* Painted timber fence: white board fence, ~1.1 m tall */}
      {paintedTimber.length > 0 && (
        <Instances limit={paintedTimber.length} range={paintedTimber.length}>
          <boxGeometry args={[1, 1.1, 0.08]} />
          <meshStandardMaterial color="#efe6d4" roughness={0.85} />
          {paintedTimber.map((s, i) => (
            <Instance
              key={`pt-${i}`}
              position={[s.midX, 0.55, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Wire fence: dark thin, ~0.9 m tall */}
      {wire.length > 0 && (
        <Instances limit={wire.length} range={wire.length}>
          <boxGeometry args={[1, 0.9, 0.03]} />
          <meshStandardMaterial color="#3f3830" roughness={0.9} />
          {wire.map((s, i) => (
            <Instance
              key={`wf-${i}`}
              position={[s.midX, 0.45, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Hedge: green box, ~0.9 m tall × 0.65 m thick */}
      {hedge.length > 0 && (
        <Instances limit={hedge.length} range={hedge.length}>
          <boxGeometry args={[1, 0.9, 0.65]} />
          <meshStandardMaterial color="#586a4a" roughness={1} />
          {hedge.map((s, i) => (
            <Instance
              key={`hd-${i}`}
              position={[s.midX, 0.45, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Stone edge: low pale-grey box, ~0.35 m tall */}
      {stone.length > 0 && (
        <Instances limit={stone.length} range={stone.length}>
          <boxGeometry args={[1, 0.35, 0.28]} />
          <meshStandardMaterial color="#8a8478" roughness={0.95} />
          {stone.map((s, i) => (
            <Instance
              key={`st-${i}`}
              position={[s.midX, 0.175, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Corner posts — small dark-timber posts at each parcel corner
          adjacent to at least one valid fence / hedge / stone side. */}
      {cornerPosts.length > 0 && (
        <Instances limit={cornerPosts.length} range={cornerPosts.length}>
          <boxGeometry args={[0.16, 1.2, 0.16]} />
          <meshStandardMaterial color="#3f382e" roughness={0.9} />
          {cornerPosts.map((c, i) => (
            <Instance
              key={`cp-${i}`}
              position={[c.x, 0.6, c.z]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
