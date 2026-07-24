import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Property-scale decor around every eligible residential building:
//   - Small gravel pad in front of the entrance
//   - Wood pile at the rear corner (~1 in 4 houses)
// Everything deterministic per building id + hash suffix. Rendered
// via drei Instances so 250+ pads and ~60 wood piles cost 3 draw
// calls total.

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

function inAnyWater(x: number, z: number): boolean {
  for (const w of WORLD.water) {
    if (w.poly.length < 3) continue;
    if (inside(w.poly, x, z)) return true;
  }
  return false;
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

const HOST_KINDS = new Set(['house', 'detached', 'residential']);

interface Pad {
  x: number;
  z: number;
  angle: number;
}

interface WoodPile {
  x: number;
  z: number;
  angle: number;
}

export function OsmPropertyDetail() {
  const { pads, woodPiles } = useMemo(() => {
    const p: Pad[] = [];
    const w: WoodPile[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;
      const obb = computeOBB(b.poly);
      // Gravel entrance pad on the +Z side (matching the EntranceMarker
      // convention in OsmBuildings). Positioned just past the wall.
      const cos = Math.cos(obb.angle);
      const sin = Math.sin(obb.angle);
      // +Z-in-OBB-frame vector rotated to world.
      const halfD = obb.d / 2;
      const padOffset = halfD + 1.5;   // 1.5 m clear of the wall
      const px = obb.centre[0] + (-sin) * padOffset;   // rotate (0, padOffset) by obb.angle
      const pz = obb.centre[1] + cos * padOffset;
      if (!inAnyWater(px, pz)) {
        p.push({ x: px, z: pz, angle: obb.angle });
      }
      // Wood pile at the rear corner on ~28 % of eligible houses.
      const wh = idHash(b.id + ':woodpile');
      if (wh < 0.28) {
        // Rear-left corner in OBB frame: (-halfW*0.6, -halfD - 2).
        const cornerX = obb.centre[0] +
          cos * (-obb.w / 2 * 0.6) - sin * (-halfD - 2);
        const cornerZ = obb.centre[1] +
          sin * (-obb.w / 2 * 0.6) + cos * (-halfD - 2);
        if (!inAnyWater(cornerX, cornerZ)) {
          w.push({ x: cornerX, z: cornerZ, angle: obb.angle });
        }
      }
    }
    return { pads: p, woodPiles: w };
  }, []);

  return (
    <group>
      {/* Gravel entrance pads — thin, slightly above the road plane so
          they read as loose gravel over grass. Positioned above the
          landcover so nothing hides them. */}
      {pads.length > 0 && (
        <Instances limit={pads.length} range={pads.length}>
          <boxGeometry args={[3.5, 0.05, 3.0]} />
          <meshStandardMaterial color="#a89e88" roughness={0.95} />
          {pads.map((p, i) => (
            <Instance
              key={`pd-${i}`}
              position={[p.x, 0.12, p.z]}
              rotation={[0, -p.angle, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Wood pile: a stack of three short dark logs. Each pile is one
          Instances group, all logs share the same material. Instanced
          at pile positions so the whole village adds 3 draw calls. */}
      {woodPiles.length > 0 && (
        <>
          <Instances limit={woodPiles.length} range={woodPiles.length}>
            <boxGeometry args={[2.4, 0.4, 0.6]} />
            <meshStandardMaterial color="#5a4632" roughness={0.95} />
            {woodPiles.map((p, i) => (
              <Instance
                key={`wp1-${i}`}
                position={[p.x, 0.2, p.z]}
                rotation={[0, -p.angle, 0]}
              />
            ))}
          </Instances>
          <Instances limit={woodPiles.length} range={woodPiles.length}>
            <boxGeometry args={[2.3, 0.35, 0.55]} />
            <meshStandardMaterial color="#5f4b35" roughness={0.95} />
            {woodPiles.map((p, i) => (
              <Instance
                key={`wp2-${i}`}
                position={[p.x, 0.6, p.z]}
                rotation={[0, -p.angle, 0]}
              />
            ))}
          </Instances>
          <Instances limit={woodPiles.length} range={woodPiles.length}>
            <boxGeometry args={[2.2, 0.3, 0.5]} />
            <meshStandardMaterial color="#645038" roughness={0.95} />
            {woodPiles.map((p, i) => (
              <Instance
                key={`wp3-${i}`}
                position={[p.x, 0.95, p.z]}
                rotation={[0, -p.angle, 0]}
              />
            ))}
          </Instances>
        </>
      )}
    </group>
  );
}
