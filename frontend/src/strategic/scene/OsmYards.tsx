import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { GROUND_Y, LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Two restrained yard features on top of the existing property system:
//   - Kitchen garden patch on ~20 % of eligible houses (tilled dark
//     rectangle in a plausible yard corner)
//   - Small yard tree cluster on ~40 % of prosperous houses (two small
//     deciduous trees standing near the property, inside the parcel)
//
// Everything deterministic, everything instanced, no per-frame work.

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

interface Patch {
  x: number;
  z: number;
  angle: number;
}
interface Tree {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

export function OsmYards() {
  const { gardens, yardTrees } = useMemo(() => {
    const g: Patch[] = [];
    const t: Tree[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;
      const obb = computeOBB(b.poly);
      const cos = Math.cos(obb.angle);
      const sin = Math.sin(obb.angle);

      // Wealth (matches the OsmBuildings profile).
      const wh = idHash(b.id + ':wealth');
      const wealth =
        wh < 0.28 ? 'modest' : wh < 0.85 ? 'standard' : 'prosperous';

      // Kitchen garden on ~20 % of standard / prosperous houses. Placed
      // at the left-mid side of the OBB (opposite the wood pile in
      // OsmPropertyDetail which sits at right-mid).
      const gh = idHash(b.id + ':garden');
      if (wealth !== 'modest' && gh < 0.22) {
        const gLx = -(obb.w / 2 + 2.5);
        const gLz = -obb.d * 0.15;
        const gx = obb.centre[0] + cos * gLx - sin * gLz;
        const gz = obb.centre[1] + sin * gLx + cos * gLz;
        if (
          !inAnyWater(gx, gz) &&
          !nearAnyBuilding(gx, gz, b.id, 0.5)
        ) {
          g.push({ x: gx, z: gz, angle: obb.angle });
        }
      }

      // Prosperous villas: two small yard trees on the front-left / front-
      // right of the parcel. Placed clear of the entrance pad and
      // driveway on the front axis.
      if (wealth === 'prosperous') {
        const th = idHash(b.id + ':yardtrees');
        if (th < 0.55) {
          const offsets: Array<[number, number]> = [
            [-obb.w / 2 - 3.0, obb.d / 2 + 4.5],
            [obb.w / 2 + 3.0, obb.d / 2 + 4.5]
          ];
          for (let i = 0; i < offsets.length; i++) {
            const [lx, lz] = offsets[i];
            const wx = obb.centre[0] + cos * lx - sin * lz;
            const wz = obb.centre[1] + sin * lx + cos * lz;
            if (
              !inAnyWater(wx, wz) &&
              !nearAnyBuilding(wx, wz, b.id, 0.5)
            ) {
              t.push({
                x: wx,
                z: wz,
                scale: 0.85 + ((th * (i + 1) * 4.9) % 1) * 0.35,
                rotation: (th * (i + 1) * 7.3) % (Math.PI * 2)
              });
            }
          }
        }
      }
    }
    return { gardens: g, yardTrees: t };
  }, []);

  return (
    <group>
      {/* Kitchen garden — 3.6 × 2.8 m tilled patch, darker peat colour,
          just above landcover so grass shows around it. */}
      {gardens.length > 0 && (
        <Instances limit={gardens.length} range={gardens.length}>
          <boxGeometry args={[3.6, 0.06, 2.8]} />
          <meshStandardMaterial color="#4a4030" roughness={1} />
          {gardens.map((p, i) => (
            <Instance
              key={`kg-${i}`}
              position={[p.x, GROUND_Y.landcover + 0.03, p.z]}
              rotation={[0, -p.angle, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Yard trees — two small deciduous per prosperous property.
          Rendered in two Instances passes (trunk + canopy) so both
          share single geometries. */}
      {yardTrees.length > 0 && (
        <>
          <Instances limit={yardTrees.length} range={yardTrees.length}>
            <cylinderGeometry args={[0.14, 0.2, 1.2, 6]} />
            <meshStandardMaterial color="#4a3a2e" roughness={1} />
            {yardTrees.map((tr, i) => (
              <Instance
                key={`yt-t-${i}`}
                position={[tr.x, 0.6 * tr.scale, tr.z]}
                scale={tr.scale}
                rotation={[0, tr.rotation, 0]}
              />
            ))}
          </Instances>
          <Instances limit={yardTrees.length} range={yardTrees.length}>
            <sphereGeometry args={[1.1, 10, 8]} />
            <meshStandardMaterial color="#5a744d" roughness={1} />
            {yardTrees.map((tr, i) => (
              <Instance
                key={`yt-c-${i}`}
                position={[tr.x, 2.2 * tr.scale, tr.z]}
                scale={tr.scale}
                rotation={[0, tr.rotation, 0]}
              />
            ))}
          </Instances>
        </>
      )}
    </group>
  );
}
