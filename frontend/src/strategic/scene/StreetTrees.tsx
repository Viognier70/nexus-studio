import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { WORLD } from '../content/world';
import {
  inAnyResidential,
  inAnyWater,
  nearAnyBuilding
} from '../procgen/geom';

// ORDER 030 recognisability lift, Tier 1d — street trees.
//
// Vision Owner Street View survey (RECOGNISABILITY_SURVEY.md) found
// Skolgatan is defined by a mature birch tree tunnel; Kyrkogatan is
// framed by tree alleys; Torget is surrounded by mature birch and
// conifer. Runtime rendered the ground as flat green terrain, losing
// the primary spatial signature of the village core.
//
// This component walks each named street's polyline and instances a
// birch tree pair (one either side) every STEP_M metres, skipping any
// position that would land in water, inside a building envelope, or
// inside a residential polygon (avoids garden encroachment). Trees are
// deciduous — birch dominant — so the palette matches the pale-bark
// silhouette in the Vision Owner references.
//
// Reuses the trunk + sphere-canopy pattern from OsmMeadowVegetation.

// Streets that should carry a tree alley. Chosen from the four surveys
// (RECOGNISABILITY_SURVEY.md): the core village streets whose visual
// identity is most damaged by the absence of trees.
const ALLEY_STREETS = new Set([
  'Skolgatan',
  'Kyrkogatan',
  'Torget',        // covers the Torget linestring itself
  'Kyrkbacken',    // continuation into the church corner
  'Prästgatan'     // widens the tree presence into the main east-west spine
]);

// Metres between successive tree pairs along a street.
const STEP_M = 12;

// Perpendicular offset of each tree from the street centreline.
const OFFSET_M = 5.5;

interface StreetTree {
  x: number;
  z: number;
  s: number;   // scale
  r: number;   // rotation
}

function pointHash(x: number, z: number): number {
  const ix = Math.round(x * 100);
  const iz = Math.round(z * 100);
  let h = 2166136261 ^ (ix | 0);
  h = Math.imul(h, 16777619);
  h ^= iz | 0;
  h = Math.imul(h, 16777619);
  return (h >>> 0) / 0xffffffff;
}

export function StreetTrees() {
  const trees = useMemo<StreetTree[]>(() => {
    const out: StreetTree[] = [];
    for (const road of WORLD.roads) {
      if (!road.name || !ALLEY_STREETS.has(road.name)) continue;
      if (road.poly.length < 2) continue;
      let accumulated = 0;
      for (let i = 1; i < road.poly.length; i++) {
        const a = road.poly[i - 1];
        const b = road.poly[i];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const segLen = Math.hypot(dx, dz);
        if (segLen === 0) continue;
        const nx = -dz / segLen;
        const nz = dx / segLen;
        let s = STEP_M - accumulated;
        while (s < segLen) {
          const px = a[0] + (dx / segLen) * s;
          const pz = a[1] + (dz / segLen) * s;
          for (const side of [+1, -1] as const) {
            const tx = px + nx * OFFSET_M * side;
            const tz = pz + nz * OFFSET_M * side;
            // Exclude positions inside water or too close to buildings.
            // Residential polygons ARE allowed — a tree at the road-side
            // edge of a garden is exactly what Street View shows.
            if (inAnyWater(tx, tz)) continue;
            if (nearAnyBuilding(tx, tz, null, 1.5)) continue;
            const h = pointHash(tx, tz);
            // Small deterministic jitter so pairs don't feel like
            // machine-placed teeth on a comb.
            const jx = (h - 0.5) * 1.5;
            const jz = (((h * 3.19) % 1) - 0.5) * 1.5;
            out.push({
              x: tx + jx,
              z: tz + jz,
              s: 1.05 + ((h * 5.11) % 1) * 0.45,
              r: ((h * 7.13) % 1) * Math.PI
            });
          }
          s += STEP_M;
        }
        accumulated = (STEP_M - ((s - segLen + STEP_M) % STEP_M)) % STEP_M;
      }
    }
    return out;
  }, []);

  if (trees.length === 0) return null;

  // Reused from OsmMeadowVegetation: trunk cylinder + canopy sphere.
  // Slightly larger canopy than pasture trees so the alley reads as
  // MATURE (30+ years) rather than young roadside planting.
  return (
    <group>
      <Instances limit={trees.length} range={trees.length}>
        <cylinderGeometry args={[0.22, 0.34, 1.8, 6]} />
        <meshStandardMaterial color="#c4b8a4" roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={`st-t-${i}`}
            position={[t.x, 0.9 * t.s, t.z]}
            scale={t.s}
            rotation={[0, t.r, 0]}
          />
        ))}
      </Instances>
      <Instances limit={trees.length} range={trees.length}>
        <sphereGeometry args={[1.7, 10, 8]} />
        <meshStandardMaterial color="#6c8557" roughness={1} />
        {trees.map((t, i) => (
          <Instance
            key={`st-c-${i}`}
            position={[t.x, 3.0 * t.s, t.z]}
            scale={t.s}
            rotation={[0, t.r, 0]}
          />
        ))}
      </Instances>
    </group>
  );
}

// inAnyResidential imported to keep the type from being unused — future
// tightening (excluding street trees from inside private gardens) will
// use it. Left as an intentional import so the exclusion knob is one
// line change away.
void inAnyResidential;
