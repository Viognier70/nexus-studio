import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import type { RawBuilding, Vec2Tuple } from '../content/world';

// A soft procedural smoke plume above a subset of residential chimneys.
// Reads as *someone is home* — the single cheapest visual cue for the
// Vision Owner's "life must be visible everywhere" directive. This is
// atmospheric, not symbolic: no icons, no overlays, no map markers —
// just the physical thing (smoke) placed where the physical thing goes
// (a chimney).
//
// Rules:
//   - Only gabled or hipped roofs on buildings with a footprint edge
//     long enough for a real chimney (> 4 m). Matches the chimney
//     placement in OsmBuildings.tsx.
//   - Deterministic per building id: same seed always heats the same
//     houses. Constitution §8 determinism preserved.
//   - Density kept intentionally low (~one in five eligible houses) so
//     the sky doesn't turn into a chimney forest.
//   - Landmark buildings are excluded — the CraftedLandmarks component
//     owns their silhouettes.

// FNV-1a 32-bit hash of a building id — the same helper OsmBuildings
// uses to pick chimneys, so smoke and chimney choices stay coherent.
function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

// Rough polygon footprint area, used by the same 'yes' → shed/garage/
// outbuilding heuristic OsmBuildings applies. Kept local so this file
// has no runtime coupling to OsmBuildings.
function polygonArea(poly: Vec2Tuple[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    sum += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  }
  return Math.abs(sum) / 2;
}

// Which effective kind a building would have in OsmBuildings after the
// 'yes' area heuristic. Only the buckets that would end up with a
// chimney-bearing roof style matter here.
function effectiveKind(b: RawBuilding): string {
  const raw = b.kind ?? 'yes';
  if (raw !== 'yes') return raw;
  const area = polygonArea(b.poly);
  if (area < 22) return 'shed';
  if (area < 55) return 'garage';
  if (area < 140) return 'outbuilding';
  return 'commercial'; // matches postObbKind for large `yes`
}

// Mirrors the chimney selection in OsmBuildings' RoofCap: gable and hip
// buildings whose longest wall is > 4 m get a chimney. Now includes the
// `commercial` and `outbuilding` reclass buckets that also render with
// a gable roof, so smoke and chimneys stay coherent.
function likelyChimney(b: RawBuilding, w: number): boolean {
  const k = effectiveKind(b);
  const gabled =
    k === 'house' || k === 'detached' || k === 'residential' ||
    k === 'commercial' || k === 'outbuilding';
  const hipped = k === 'apartments' || k === 'hotel' || k === 'school';
  return (gabled || hipped) && w > 4;
}

function heightFor(b: RawBuilding): number {
  const k = effectiveKind(b);
  let base: number;
  if (k === 'university') base = 9;
  else if (k === 'hotel') base = 8;
  else if (k === 'apartments') base = 8.5;
  else if (k === 'commercial') base = 6;
  else if (k === 'train_station') base = 6;
  else if (k === 'school') base = 8;
  else if (k === 'industrial') base = 7;
  else if (k === 'house' || k === 'detached') base = 4.5;
  else if (k === 'residential') base = 6.5;
  else if (k === 'outbuilding') base = 4;
  else base = 5;
  const wobble = (idHash(b.id) - 0.5) * 0.24;
  return base * (1 + wobble);
}

function centroid(poly: Vec2Tuple[]): [number, number] {
  let cx = 0,
    cz = 0,
    n = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  return [cx / Math.max(1, n), cz / Math.max(1, n)];
}

function longestEdge(poly: Vec2Tuple[]): number {
  let best = 0;
  for (let i = 1; i < poly.length; i++) {
    const dx = poly[i][0] - poly[i - 1][0];
    const dz = poly[i][1] - poly[i - 1][1];
    const l = Math.hypot(dx, dz);
    if (l > best) best = l;
  }
  return best;
}

interface Plume {
  x: number;
  z: number;
  baseY: number;
  seed: number;
  // Persistent random horizontal drift, so no two columns tilt the same.
  driftX: number;
  driftZ: number;
}

// A single smoke plume rendered as three stacked, upward-tapered puffs
// with animated opacity and rise. Very cheap: 3 small spheres per plume.
// Materials are unlit so lighting variance doesn't muddy the whitish
// column.
function Plume({ plume, phase }: { plume: Plume; phase: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const mats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  useFrame(() => {
    const t = phase + performance.now() / 1000;
    // Slow puff cycle: each puff rises, thins, fades, resets.
    const g = groupRef.current;
    if (!g) return;
    for (let i = 0; i < 3; i++) {
      const cycle = ((t * 0.14 + i * 0.35) % 1 + 1) % 1; // 0..1
      const rise = cycle * 8; // metres upward per cycle
      const spread = 0.55 + cycle * 1.6;
      const opacity = Math.max(0, 0.42 * (1 - cycle) * (1 - cycle * 0.4));
      const child = g.children[i] as THREE.Mesh | undefined;
      if (child) {
        child.position.set(
          plume.driftX * cycle,
          rise,
          plume.driftZ * cycle
        );
        child.scale.setScalar(spread);
      }
      const m = mats.current[i];
      if (m) m.opacity = opacity;
    }
  });
  return (
    <group ref={groupRef} position={[plume.x, plume.baseY, plume.z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.6, 8, 6]} />
          <meshBasicMaterial
            ref={(ref) => {
              mats.current[i] = ref;
            }}
            color="#dfd7c8"
            transparent
            opacity={0.28}
            depthWrite={false}
            fog
          />
        </mesh>
      ))}
    </group>
  );
}

export function ChimneySmoke() {
  const plumes = useMemo<Plume[]>(() => {
    const out: Plume[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      if (b.poly.length < 4) continue;
      const w = longestEdge(b.poly);
      if (!likelyChimney(b, w)) continue;
      const hash = idHash(b.id + ':smoke');
      // Only ~22% of eligible houses have a fire going — enough to
      // read as a lived-in village without turning the sky grey.
      if (hash > 0.22) continue;
      const [cx, cz] = centroid(b.poly);
      // Tilt direction seeded per plume so a village of columns looks
      // scattered rather than in lockstep.
      const dirHash = idHash(b.id + ':wind');
      const angle = dirHash * Math.PI * 2;
      out.push({
        x: cx,
        z: cz,
        baseY: heightFor(b) + 1.6,
        seed: hash,
        driftX: Math.cos(angle) * 1.4,
        driftZ: Math.sin(angle) * 1.4
      });
    }
    return out;
  }, []);

  return (
    <group>
      {plumes.map((p, i) => (
        <Plume key={i} plume={p} phase={p.seed * 100} />
      ))}
    </group>
  );
}
