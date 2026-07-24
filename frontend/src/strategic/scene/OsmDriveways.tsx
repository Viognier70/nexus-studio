import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { CAR_ROADS, GROUND_Y, LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// One gravel driveway per eligible residential building — a straight
// line from the entrance-pad side of the OBB out to the nearest point
// on the nearest driveable road. Rendered as a single per-instance-
// scaled box in a drei Instances group so the whole village driveway
// network costs one draw call.

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

// Find the closest point across every road segment. Returns the
// closest point and its distance-squared.
function closestRoadPoint(
  x: number,
  z: number,
  segments: Segment[]
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

const HOST_KINDS = new Set(['house', 'detached', 'residential']);

// Skip driveways longer than this — if the nearest road is > 45 m
// away the building is probably a farmhouse deep in the field, and
// a straight-line driveway would run through half a wood.
const MAX_DRIVEWAY_LEN = 45;

interface Driveway {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
}

export function OsmDriveways() {
  const driveways = useMemo<Driveway[]>(() => {
    const segments = buildRoadSegments();
    const out: Driveway[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;

      const obb = computeOBB(b.poly);
      // Start on the +Z-in-OBB side (same convention as EntranceMarker
      // and OsmPropertyDetail's gravel pad). Offset by 2 m past the
      // wall so the driveway begins at the pad's outer edge.
      const cos = Math.cos(obb.angle);
      const sin = Math.sin(obb.angle);
      const startLz = obb.d / 2 + 2.0;
      const sx = obb.centre[0] + (-sin) * startLz;
      const sz = obb.centre[1] + cos * startLz;

      const nearest = closestRoadPoint(sx, sz, segments);
      if (!nearest) continue;
      const distSq = nearest.distSq;
      const dist = Math.sqrt(distSq);
      if (dist > MAX_DRIVEWAY_LEN) continue;
      // Very short: already on the road, skip driveway (property likely
      // fronts the road directly).
      if (dist < 1.8) continue;

      // Sample along the driveway path for collision with other buildings
      // or water. Roads are the target, so we don't reject a driveway
      // for crossing a road — but we do reject the ones that would clip
      // a neighbour.
      const NSAMPLES = 6;
      let valid = true;
      for (let i = 1; i < NSAMPLES; i++) {
        const t = i / NSAMPLES;
        const px = sx + t * (nearest.qx - sx);
        const pz = sz + t * (nearest.qz - sz);
        if (nearAnyBuilding(px, pz, b.id, 0.2)) { valid = false; break; }
        if (inAnyWater(px, pz)) { valid = false; break; }
      }
      if (!valid) continue;

      const angle = Math.atan2(nearest.qz - sz, nearest.qx - sx);
      out.push({
        midX: (sx + nearest.qx) / 2,
        midZ: (sz + nearest.qz) / 2,
        length: dist,
        angle
      });
    }
    return out;
  }, []);

  if (driveways.length === 0) return null;

  return (
    <Instances limit={driveways.length} range={driveways.length}>
      <boxGeometry args={[1, 0.02, 2.6]} />
      <meshStandardMaterial color="#a89e88" roughness={0.95} />
      {driveways.map((d, i) => (
        <Instance
          key={`dw-${i}`}
          position={[d.midX, GROUND_Y.landcover + 0.02, d.midZ]}
          rotation={[0, -d.angle, 0]}
          scale={[d.length, 1, 1]}
        />
      ))}
    </Instances>
  );
}
