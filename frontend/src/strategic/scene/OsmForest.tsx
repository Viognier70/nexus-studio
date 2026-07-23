import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { createRng } from '../util/rng';
import { WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

interface Tree {
  x: number;
  z: number;
  s: number;
  r: number;
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

const DENSITY_PER_M2 = 0.032;
const MIN_TREES_PER_POLY = 6;
const MAX_TREES_TOTAL = 1400;

export function OsmForest() {
  const trees = useMemo<Tree[]>(() => {
    const rng = createRng(0x9c17a);
    const list: Tree[] = [];
    for (const patch of WORLD.forest) {
      if (patch.poly.length < 3) continue;
      const b = bounds(patch.poly);
      const area = (b.maxX - b.minX) * (b.maxZ - b.minZ);
      const target = Math.max(
        MIN_TREES_PER_POLY,
        Math.floor(area * DENSITY_PER_M2)
      );
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
          r: rng.range(0, Math.PI)
        });
        added++;
      }
      if (list.length >= MAX_TREES_TOTAL) break;
    }
    return list;
  }, []);

  if (trees.length === 0) return null;

  return (
    <group>
      <Instances limit={trees.length} range={trees.length}>
        <cylinderGeometry args={[0.16, 0.24, 1.4, 6]} />
        <meshStandardMaterial color="#3f382e" roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={`t${i}`}
            position={[t.x, 0.7 * t.s, t.z]}
            scale={t.s}
            rotation={[0, t.r, 0]}
          />
        ))}
      </Instances>
      <Instances limit={trees.length} range={trees.length}>
        <coneGeometry args={[1.2, 3.8, 8]} />
        <meshStandardMaterial color="#4a5148" roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={`c${i}`}
            position={[t.x, 2.4 * t.s, t.z]}
            scale={t.s}
            rotation={[0, t.r, 0]}
          />
        ))}
      </Instances>
    </group>
  );
}
