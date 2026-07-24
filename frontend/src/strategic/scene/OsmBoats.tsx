import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { GROUND_Y, WORLD } from '../content/world';
import type { RawPolygon, Vec2Tuple } from '../content/world';
import { createRng } from '../util/rng';
import { readabilityScale, type ReadabilityCurve } from '../util/readability';

// Per-kind readability curves. A sailboat mast is already visible at
// district range so we boost it less than a kayak barely two seats long.
// All ramps start above district range — no boat inflates on kvarteret.
const BOAT_READABILITY: Record<BoatKind, ReadabilityCurve> = {
  kayak: { rampStart: 380, rampEnd: 1500, maxScale: 4.0 },
  rowboat: { rampStart: 400, rampEnd: 1500, maxScale: 3.2 },
  sailboat: { rampStart: 450, rampEnd: 1600, maxScale: 2.2 },
  fishing_boat: { rampStart: 400, rampEnd: 1500, maxScale: 3.2 }
};

type BoatKind = 'rowboat' | 'kayak' | 'sailboat' | 'fishing_boat';

interface Boat {
  kind: BoatKind;
  water: RawPolygon;
  centre: Vec2Tuple;
  radius: number;
  angle: number;
  speed: number;
  bob: number;
  colour: string;
}

// Skip water bodies far from the working village area.
const MAX_DISTANCE = 3200;
// Only spawn boats in water bodies at least this large (m²). Excludes tiny
// mine pits and ponds where a boat would look absurd.
const MIN_WATER_AREA_M2 = 15_000;
// Boats must orbit within this distance of the village core so far-away
// stretches of Torrvarpen / Sör-Älgen don't hide the fleet off-screen.
// Anchor corrected from the historic (200, -40) — that value was 170 m
// east of the real built centroid.
const VILLAGE_ANCHOR: Vec2Tuple = [10, -5];
const MAX_BOAT_CENTRE_DISTANCE = 2500;

function polygonArea(poly: Vec2Tuple[]): number {
  let a = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    a += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  }
  return Math.abs(a) / 2;
}

function polygonBounds(poly: Vec2Tuple[]) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

// Point in polygon.
function inside(poly: Vec2Tuple[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) hit = !hit;
  }
  return hit;
}

// Pick a random inner point and inscribed circle radius for a lake so a
// boat can trace a circular arc entirely on water without ever touching
// the shore. The centre is constrained to sit near the village core so
// boats stay in the framed area.
function pickInscribedPath(
  poly: Vec2Tuple[],
  rng: { range(a: number, b: number): number; next(): number }
): { centre: Vec2Tuple; radius: number } | null {
  const b = polygonBounds(poly);
  // Clip sampling range to the village vicinity so far-flung Torrvarpen
  // stretches don't spawn invisible boats.
  const sx0 = Math.max(b.minX, VILLAGE_ANCHOR[0] - MAX_BOAT_CENTRE_DISTANCE);
  const sx1 = Math.min(b.maxX, VILLAGE_ANCHOR[0] + MAX_BOAT_CENTRE_DISTANCE);
  const sz0 = Math.max(b.minZ, VILLAGE_ANCHOR[1] - MAX_BOAT_CENTRE_DISTANCE);
  const sz1 = Math.min(b.maxZ, VILLAGE_ANCHOR[1] + MAX_BOAT_CENTRE_DISTANCE);
  if (sx0 >= sx1 || sz0 >= sz1) return null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const cx = rng.range(sx0, sx1);
    const cz = rng.range(sz0, sz1);
    if (!inside(poly, cx, cz)) continue;
    let minDist = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const ax = poly[i][0],
        az = poly[i][1];
      const bx = poly[j][0],
        bz = poly[j][1];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz;
      const t =
        l2 === 0
          ? 0
          : Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / l2));
      const px = ax + t * dx;
      const pz = az + t * dz;
      const d = Math.hypot(cx - px, cz - pz);
      if (d < minDist) minDist = d;
    }
    if (minDist < 12) continue;
    return {
      centre: [cx, cz],
      radius: Math.max(6, minDist * 0.6)
    };
  }
  return null;
}

// Meaningful placement, not coverage: a handful of boats each with a
// distinct purpose. Together they read as "someone is out on the water"
// rather than a fleet. The inscribed-path picker keeps them close to
// the village core so they remain in frame at strategic altitude.
const KIND_CONFIG: Record<
  BoatKind,
  {
    count: number;
    hullSize: [number, number, number];
    speed: [number, number];
    palette: string[];
    hasMast: boolean;
    hasFishingRod?: boolean;
  }
> = {
  sailboat: {
    // The signature silhouette — a mast visible from village altitude.
    count: 1,
    hullSize: [1.8, 0.55, 5.2],
    speed: [0.06, 0.15],
    palette: ['#efe7d3', '#d9c9a4', '#c9b28e'],
    hasMast: true
  },
  fishing_boat: {
    // Small tackle boat, thin rod tilted out toward the water. Reads as
    // a fisherman sitting still rather than crossing the lake.
    count: 1,
    hullSize: [1.5, 0.34, 4.0],
    speed: [0.015, 0.03],
    palette: ['#5b5245', '#4a453d', '#3f4552'],
    hasMast: false,
    hasFishingRod: true
  },
  rowboat: {
    count: 1,
    hullSize: [1.4, 0.32, 3.6],
    speed: [0.05, 0.10],
    palette: ['#a06a3a', '#7a4d2a', '#8f5b30'],
    hasMast: false
  },
  kayak: {
    count: 2,
    hullSize: [0.7, 0.22, 3.2],
    speed: [0.08, 0.16],
    palette: ['#c9482f', '#e0b658', '#5c8fa8'],
    hasMast: false
  }
};

export function OsmBoats() {
  const { actualRef } = useCamera();
  const boats = useMemo<Boat[]>(() => {
    const rng = createRng(0xba0a75);
    const eligible = WORLD.water.filter((w) => {
      const b = polygonBounds(w.poly);
      const closeEnough =
        !(
          b.minX > MAX_DISTANCE ||
          b.maxX < -MAX_DISTANCE ||
          b.minZ > MAX_DISTANCE ||
          b.maxZ < -MAX_DISTANCE
        );
      const bigEnough = polygonArea(w.poly) >= MIN_WATER_AREA_M2;
      return closeEnough && bigEnough && w.poly.length >= 20;
    });
    if (eligible.length === 0) return [];
    const out: Boat[] = [];
    (Object.keys(KIND_CONFIG) as BoatKind[]).forEach((kind) => {
      const cfg = KIND_CONFIG[kind];
      let attempts = 0;
      while (
        out.filter((b) => b.kind === kind).length < cfg.count &&
        attempts < cfg.count * 8
      ) {
        attempts++;
        const water = rng.pick(eligible);
        const path = pickInscribedPath(water.poly, rng);
        if (!path) continue;
        out.push({
          kind,
          water,
          centre: path.centre,
          radius: path.radius,
          angle: rng.range(0, Math.PI * 2),
          speed:
            rng.range(cfg.speed[0], cfg.speed[1]) *
            (rng.chance(0.5) ? 1 : -1),
          bob: rng.range(0, Math.PI * 2),
          colour: rng.pick(cfg.palette)
        });
      }
    });
    return out;
  }, []);

  const refs = useRef<Array<THREE.Group | null>>([]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = performance.now() / 1000;
    // Readability treatment — visual only. Route arcs, water polygons and
    // speeds are unchanged. Position stays on the water surface.
    const camDist = actualRef.current.distance;
    for (let i = 0; i < boats.length; i++) {
      const b = boats[i];
      b.angle += b.speed * dt;
      const px = b.centre[0] + Math.cos(b.angle) * b.radius;
      const pz = b.centre[1] + Math.sin(b.angle) * b.radius;
      const g = refs.current[i];
      if (g) {
        const bob = Math.sin(t * 1.4 + b.bob) * 0.04;
        g.position.set(px, GROUND_Y.water + 0.04 + bob, pz);
        // Face along the tangent direction.
        g.rotation.y = -b.angle + Math.PI / 2 + (b.speed < 0 ? Math.PI : 0);
        g.scale.setScalar(readabilityScale(camDist, BOAT_READABILITY[b.kind]));
      }
    }
  });

  return (
    <group>
      {boats.map((b, i) => {
        const cfg = KIND_CONFIG[b.kind];
        return (
          <group
            key={`boat-${i}`}
            ref={(ref) => {
              refs.current[i] = ref;
            }}
          >
            {/* Hull */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={cfg.hullSize} />
              <meshStandardMaterial color={b.colour} roughness={0.75} />
            </mesh>
            {/* Deck accent */}
            <mesh
              position={[0, cfg.hullSize[1] / 2 + 0.05, 0]}
            >
              <boxGeometry
                args={[cfg.hullSize[0] * 0.6, 0.08, cfg.hullSize[2] * 0.9]}
              />
              <meshStandardMaterial color="#3a2f27" roughness={0.85} />
            </mesh>
            {cfg.hasMast && (
              <>
                <mesh position={[0, 2.6, 0]}>
                  <cylinderGeometry args={[0.06, 0.08, 5.0, 6]} />
                  <meshStandardMaterial color="#3a2f27" roughness={0.85} />
                </mesh>
                {/* Triangular sail as a thin flat box */}
                <mesh position={[0.4, 3.0, 0]} rotation={[0, 0, 0]}>
                  <boxGeometry args={[0.06, 3.6, 1.8]} />
                  <meshStandardMaterial
                    color="#efe7d3"
                    roughness={0.7}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {/* Crew silhouette at the tiller. Reads as "someone's
                    sailing that boat" rather than "empty vessel." */}
                <mesh position={[0, 0.65, -1.6]}>
                  <boxGeometry args={[0.42, 1.0, 0.32]} />
                  <meshStandardMaterial color="#4a4c50" roughness={0.9} />
                </mesh>
                <mesh position={[0, 1.35, -1.6]}>
                  <sphereGeometry args={[0.22, 8, 6]} />
                  <meshStandardMaterial color="#d9b48a" roughness={0.8} />
                </mesh>
              </>
            )}
            {/* Rower / paddler silhouette on non-sail non-fishing boats.
                A rowboat has a person sitting mid-hull; a kayak has a
                seated paddler further forward. */}
            {!cfg.hasMast && !cfg.hasFishingRod && (
              <>
                <mesh
                  position={[0, cfg.hullSize[1] * 0.6, cfg.hullSize[2] * 0.05]}
                >
                  <boxGeometry
                    args={[cfg.hullSize[0] * 0.55, 0.9, cfg.hullSize[0] * 0.55]}
                  />
                  <meshStandardMaterial color="#6f6c65" roughness={0.9} />
                </mesh>
                <mesh
                  position={[0, cfg.hullSize[1] * 0.6 + 0.75, cfg.hullSize[2] * 0.05]}
                >
                  <sphereGeometry args={[0.2, 8, 6]} />
                  <meshStandardMaterial color="#d9b48a" roughness={0.8} />
                </mesh>
              </>
            )}
            {cfg.hasFishingRod && (
              <>
                {/* Fishing rod — thin, angled outward over the stern. */}
                <mesh
                  position={[0.5, 1.0, -1.4]}
                  rotation={[0.3, 0, -0.4]}
                >
                  <cylinderGeometry args={[0.02, 0.03, 3.6, 5]} />
                  <meshStandardMaterial color="#2a2520" roughness={0.85} />
                </mesh>
                {/* Angler (seated silhouette). */}
                <mesh position={[0, 0.6, 0.4]}>
                  <boxGeometry args={[0.5, 0.9, 0.5]} />
                  <meshStandardMaterial color="#5c574d" roughness={0.9} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
