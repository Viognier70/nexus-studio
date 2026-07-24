import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Small secondary structures (garden sheds, small outbuildings) placed
// deterministically alongside larger residential buildings so a farm
// or family plot reads as a full property rather than a single free-
// standing box. Everything renders through drei Instances — 2 shed
// wall instances + 2 shed roof instances for the whole village.

// ---------- Local helpers (duplicated from OsmBuildings for module
// independence — the outbuilding placement code doesn't need to reach
// into OsmBuildings' private module scope). ----------

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

// Bbox-based near-any-building test with a small dilation. Used to
// reject candidate outbuilding positions that would clip another
// building's footprint. Excludes the parent building by id.
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

// ---------- Outbuilding placement ----------

interface Outbuilding {
  x: number;
  z: number;
  angle: number;    // world-space Y rotation
  size: 'small' | 'medium';
  colour: string;
}

// Which OSM kinds can host an outbuilding. Farm-style outbuildings only
// make sense next to a residential-scale parent.
const HOST_KINDS = new Set(['house', 'detached', 'residential']);

const SHED_PALETTE = [
  '#7d5b3f',   // creosoted timber
  '#8b3e2b',   // faded Faluröd
  '#5f4a3a',   // dark stained timber
  '#a89b7d'    // weathered grey
];

export function OsmOutbuildings() {
  const outbuildings = useMemo<Outbuilding[]>(() => {
    const list: Outbuilding[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 90) continue;    // parent must be big enough to warrant an outbuilding

      const hash = idHash(b.id + ':outbuilding');
      // ~50 % of eligible parents get one; ~15 % get a second smaller
      // one on a different side.
      if (hash > 0.55) continue;

      const obb = computeOBB(b.poly);
      const size: Outbuilding['size'] = hash < 0.15 ? 'medium' : 'small';
      const paletteIdx = Math.floor(hash * 100) % SHED_PALETTE.length;
      const colour = SHED_PALETTE[paletteIdx];

      // Candidate offsets in the parent's OBB frame — try rear first,
      // then a side, then the other side. Front is deliberately last so
      // outbuildings don't crowd the entrance side.
      const halfW = obb.w / 2;
      const halfD = obb.d / 2;
      const clearance = size === 'medium' ? 6.5 : 5.0;
      const candidates: Array<{ lx: number; lz: number }> = [
        { lx: 0,           lz: -halfD - clearance },  // rear
        { lx: halfW + clearance, lz: 0 },              // right
        { lx: -halfW - clearance, lz: 0 },             // left
        { lx: 0,           lz: halfD + clearance }     // front (last resort)
      ];

      const cos = Math.cos(obb.angle);
      const sin = Math.sin(obb.angle);
      for (const c of candidates) {
        const wx = obb.centre[0] + cos * c.lx - sin * c.lz;
        const wz = obb.centre[1] + sin * c.lx + cos * c.lz;
        // Reject if the candidate would clip another building or land
        // in water.
        if (nearAnyBuilding(wx, wz, b.id, 1.5)) continue;
        if (inAnyWater(wx, wz)) continue;
        list.push({
          x: wx,
          z: wz,
          angle: obb.angle,
          size,
          colour
        });
        break;
      }
    }
    return list;
  }, []);

  if (outbuildings.length === 0) return null;

  const smalls = outbuildings.filter((o) => o.size === 'small');
  const mediums = outbuildings.filter((o) => o.size === 'medium');

  return (
    <group>
      {/* Small shed walls (3.6 × 2.6 × 3.0 m) */}
      {smalls.length > 0 && (
        <Instances limit={smalls.length} range={smalls.length}>
          <boxGeometry args={[3.6, 2.6, 3.0]} />
          <meshStandardMaterial roughness={0.95} />
          {smalls.map((o, i) => (
            <Instance
              key={`sw-${i}`}
              position={[o.x, 1.3, o.z]}
              rotation={[0, -o.angle, 0]}
              color={o.colour}
            />
          ))}
        </Instances>
      )}
      {/* Small shed roofs (thin dark box, slightly wider than walls) */}
      {smalls.length > 0 && (
        <Instances limit={smalls.length} range={smalls.length}>
          <boxGeometry args={[3.9, 0.3, 3.3]} />
          <meshStandardMaterial color="#2a251f" roughness={0.9} />
          {smalls.map((o, i) => (
            <Instance
              key={`sr-${i}`}
              position={[o.x, 2.75, o.z]}
              rotation={[0, -o.angle, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Medium outbuilding walls (5.6 × 3.2 × 4.2 m) */}
      {mediums.length > 0 && (
        <Instances limit={mediums.length} range={mediums.length}>
          <boxGeometry args={[5.6, 3.2, 4.2]} />
          <meshStandardMaterial roughness={0.95} />
          {mediums.map((o, i) => (
            <Instance
              key={`mw-${i}`}
              position={[o.x, 1.6, o.z]}
              rotation={[0, -o.angle, 0]}
              color={o.colour}
            />
          ))}
        </Instances>
      )}
      {/* Medium outbuilding roofs */}
      {mediums.length > 0 && (
        <Instances limit={mediums.length} range={mediums.length}>
          <boxGeometry args={[5.9, 0.35, 4.5]} />
          <meshStandardMaterial color="#2a251f" roughness={0.9} />
          {mediums.map((o, i) => (
            <Instance
              key={`mr-${i}`}
              position={[o.x, 3.35, o.z]}
              rotation={[0, -o.angle, 0]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
