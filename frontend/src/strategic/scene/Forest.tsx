import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { createRng } from '../util/rng';
import { VILLAGE_BOUNDS, LANDMARKS } from '../content/grythyttan';

interface Tree {
  x: number;
  z: number;
  s: number;
  r: number;
}

const FOREST_SEED = 0x6752b1;

function inVillage(x: number, z: number, margin = 8): boolean {
  for (const lm of LANDMARKS) {
    const hx = lm.footprint.width / 2 + margin;
    const hz = lm.footprint.depth / 2 + margin;
    if (
      x > lm.position.x - hx &&
      x < lm.position.x + hx &&
      z > lm.position.z - hz &&
      z < lm.position.z + hz
    )
      return true;
  }
  return false;
}

function inCorridor(x: number, z: number): boolean {
  // Keep a wide corridor around the village central area clear.
  return x > -70 && x < 70 && z > -68 && z < 34;
}

function inWater(x: number, z: number): boolean {
  // Rough water half-plane south of the village.
  return z > 34 + (x < 0 ? -x * 0.1 : x * 0.05);
}

// Ring of dark grey conifer stand-ins hugging the village perimeter.
export function Forest() {
  const trees = useMemo<Tree[]>(() => {
    const rng = createRng(FOREST_SEED);
    const list: Tree[] = [];
    const target = 520;
    let attempts = 0;
    while (list.length < target && attempts < target * 30) {
      attempts++;
      const x = rng.range(VILLAGE_BOUNDS.minX - 60, VILLAGE_BOUNDS.maxX + 60);
      const z = rng.range(VILLAGE_BOUNDS.minZ - 60, VILLAGE_BOUNDS.maxZ + 60);
      if (inCorridor(x, z)) continue;
      if (inVillage(x, z)) continue;
      if (inWater(x, z)) continue;
      list.push({
        x,
        z,
        s: rng.range(0.9, 1.9),
        r: rng.range(0, Math.PI)
      });
    }
    return list;
  }, []);

  return (
    <group>
      <Instances limit={trees.length} range={trees.length}>
        <cylinderGeometry args={[0.14, 0.22, 1.4, 6]} />
        <meshStandardMaterial color="#3f382e" roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={`trunk-${i}`}
            position={[t.x, 0.7 * t.s, t.z]}
            scale={t.s}
            rotation={[0, t.r, 0]}
          />
        ))}
      </Instances>
      <Instances limit={trees.length} range={trees.length}>
        <coneGeometry args={[1.1, 3.6, 8]} />
        <meshStandardMaterial color="#4b5148" roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={`canopy-${i}`}
            position={[t.x, 2.4 * t.s, t.z]}
            scale={t.s}
            rotation={[0, t.r, 0]}
          />
        ))}
      </Instances>
    </group>
  );
}
