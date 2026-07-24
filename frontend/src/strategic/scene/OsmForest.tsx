import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { createRng } from '../util/rng';
import { WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

type TreeKind = 'coniferous' | 'deciduous';

interface Tree {
  x: number;
  z: number;
  s: number;
  r: number;
  kind: TreeKind;
}

// Point-in-polygon (ray casting).
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

function bounds(polygon: Vec2Tuple[]) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

// Squared distance from point (px, pz) to segment (a → b), then sqrt.
function distanceToSegment(
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

function distanceToPolygon(poly: Vec2Tuple[], x: number, z: number): number {
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

const DENSITY_PER_M2 = 0.032;
const MIN_TREES_PER_POLY = 6;
const MAX_TREES_TOTAL = 1600;

// Fringe: stragglers just outside the polygon so the forest edge feathers
// into the surrounding meadow rather than presenting a hard boundary
// line. Density falls off linearly to zero at FRINGE_M metres out.
const FRINGE_M = 14;
const FRINGE_DENSITY_PER_M2 = DENSITY_PER_M2 * 0.34;

// Ratio of the whole forest that reads as deciduous (broadleaf) vs
// coniferous. Bergslag mixed forest is roughly 30 % broadleaf at the
// village elevation.
const DECIDUOUS_RATIO = 0.32;

export function OsmForest() {
  const trees = useMemo<Tree[]>(() => {
    const rng = createRng(0x9c17a);
    const list: Tree[] = [];
    const pickKind = (): TreeKind =>
      rng.range(0, 1) < DECIDUOUS_RATIO ? 'deciduous' : 'coniferous';

    for (const patch of WORLD.forest) {
      if (patch.poly.length < 3) continue;
      const b = bounds(patch.poly);
      const area = (b.maxX - b.minX) * (b.maxZ - b.minZ);
      const target = Math.max(
        MIN_TREES_PER_POLY,
        Math.floor(area * DENSITY_PER_M2)
      );
      // Interior scatter.
      let added = 0;
      let attempts = 0;
      while (added < target && attempts < target * 8 && list.length < MAX_TREES_TOTAL) {
        attempts++;
        const x = rng.range(b.minX, b.maxX);
        const z = rng.range(b.minZ, b.maxZ);
        if (!inside(patch.poly, x, z)) continue;
        list.push({
          x,
          z,
          s: rng.range(0.9, 1.9),
          r: rng.range(0, Math.PI),
          kind: pickKind()
        });
        added++;
      }
      // Fringe scatter — outside the polygon within FRINGE_M metres,
      // density tapering to zero at the outer edge of the band.
      const fringeArea =
        (b.maxX - b.minX + 2 * FRINGE_M) *
          (b.maxZ - b.minZ + 2 * FRINGE_M) -
        area;
      const fringeTarget = Math.max(
        0,
        Math.floor(fringeArea * FRINGE_DENSITY_PER_M2)
      );
      let fAdded = 0;
      let fAttempts = 0;
      while (
        fAdded < fringeTarget &&
        fAttempts < fringeTarget * 8 &&
        list.length < MAX_TREES_TOTAL
      ) {
        fAttempts++;
        const x = rng.range(b.minX - FRINGE_M, b.maxX + FRINGE_M);
        const z = rng.range(b.minZ - FRINGE_M, b.maxZ + FRINGE_M);
        if (inside(patch.poly, x, z)) continue;
        const d = distanceToPolygon(patch.poly, x, z);
        if (d > FRINGE_M) continue;
        // Falloff: closer to the edge → higher probability of a tree.
        const keep = 1 - d / FRINGE_M;
        if (rng.range(0, 1) > keep) continue;
        list.push({
          x,
          z,
          s: rng.range(0.65, 1.35),        // smaller stragglers
          r: rng.range(0, Math.PI),
          kind: pickKind()
        });
        fAdded++;
      }
      if (list.length >= MAX_TREES_TOTAL) break;
    }
    return list;
  }, []);

  if (trees.length === 0) return null;
  const conifers = trees.filter((t) => t.kind === 'coniferous');
  const deciduous = trees.filter((t) => t.kind === 'deciduous');

  return (
    <group>
      {/* Coniferous trunks */}
      {conifers.length > 0 && (
        <Instances limit={conifers.length} range={conifers.length}>
          <cylinderGeometry args={[0.16, 0.24, 1.4, 6]} />
          <meshStandardMaterial color="#3f382e" roughness={1} />
          {conifers.map((t, i) => (
            <Instance
              key={`ct${i}`}
              position={[t.x, 0.7 * t.s, t.z]}
              scale={t.s}
              rotation={[0, t.r, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Coniferous canopies */}
      {conifers.length > 0 && (
        <Instances limit={conifers.length} range={conifers.length}>
          <coneGeometry args={[1.2, 3.8, 8]} />
          <meshStandardMaterial color="#4a5148" roughness={1} />
          {conifers.map((t, i) => (
            <Instance
              key={`cc${i}`}
              position={[t.x, 2.4 * t.s, t.z]}
              scale={t.s}
              rotation={[0, t.r, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Deciduous trunks — slightly wider base, warmer bark */}
      {deciduous.length > 0 && (
        <Instances limit={deciduous.length} range={deciduous.length}>
          <cylinderGeometry args={[0.2, 0.3, 1.6, 6]} />
          <meshStandardMaterial color="#4a3a2e" roughness={1} />
          {deciduous.map((t, i) => (
            <Instance
              key={`dt${i}`}
              position={[t.x, 0.8 * t.s, t.z]}
              scale={t.s}
              rotation={[0, t.r, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Deciduous canopies — rounder, warmer green */}
      {deciduous.length > 0 && (
        <Instances limit={deciduous.length} range={deciduous.length}>
          <sphereGeometry args={[1.4, 10, 8]} />
          <meshStandardMaterial color="#5a744d" roughness={1} />
          {deciduous.map((t, i) => (
            <Instance
              key={`dc${i}`}
              position={[t.x, 2.7 * t.s, t.z]}
              scale={t.s}
              rotation={[0, t.r, 0]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
