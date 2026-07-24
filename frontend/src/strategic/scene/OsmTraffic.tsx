import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import {
  LANDMARK_BY_ID,
  MAJOR_ROADS,
  VILLAGE_CAR_ROADS,
  polylineLength,
  samplePolyline
} from '../content/world';
import type { RawRoad } from '../content/world';
import { specFor, type RoadRole } from '../content/roadRoles';
import { createRng } from '../util/rng';
import { readabilityScale, type ReadabilityCurve } from '../util/readability';

// Traffic-density weight per OSM `maxspeed` band. Missing maxspeed
// (Overpass has no value for ~223/327 Grythyttan roads — most are
// service and pedestrian tags) falls back to a low baseline so cars
// concentrate on tagged through-roads. Values are visual targets
// tuned against real Grythyttan flow (Rv 244/205 carry the bulk of
// through-traffic; residential 50 km/h streets carry a bit; service
// roads carry almost none).
function speedWeight(road: RawRoad): number {
  const ms = road.maxspeed;
  if (ms == null) return 0.25;
  if (ms >= 80) return 4.0;
  if (ms >= 70) return 3.0;
  if (ms >= 60) return 2.2;
  if (ms >= 50) return 1.0;
  if (ms >= 40) return 0.7;
  return 0.5;
}

// Additional weight per resolved semantic role. Amplifies the maxspeed
// signal so the primary through-road always wins even when a
// residential lane happens to share its speed limit. Never zeroes a
// road out — kind-level exclusion is still handled by the eligibility
// filter (roads: 'major'), so this stays a pure weight.
const ROLE_WEIGHT: Record<RoadRole, number> = {
  primary: 3.0,
  main: 2.0,
  secondary_connector: 1.3,
  village_street: 0.9,
  local_street: 0.7,
  residential: 0.4,
  service: 0.15,
  track: 0.05,
  cycleway: 0.05,
  footpath: 0.05
};

// Length weight: longer roads carry more traffic proportionally so
// short service stubs don't attract disproportionate spawns from the
// role weight alone. Capped so a very long forest track can't dominate.
function lengthWeight(road: RawRoad): number {
  const l = polylineLength(road.poly);
  if (l < 30) return 0.3;
  if (l > 400) return 3.0;
  return l / 100;
}

function roadTrafficWeight(road: RawRoad): number {
  const role = specFor(road).role;
  return speedWeight(road) * ROLE_WEIGHT[role] * lengthWeight(road);
}

// Weighted pick over a pool, using a caller-supplied rng. Falls back
// to a uniform pick if the total weight is zero.
function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  const r = rng() * total;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r <= acc) return items[i];
  }
  return items[items.length - 1];
}

type VehicleKind =
  | 'car'
  | 'van'
  | 'bus'
  | 'truck'
  | 'taxi'
  | 'motorcycle'
  | 'tourist_bus';

interface Vehicle {
  kind: VehicleKind;
  road: RawRoad;
  t: number;
  speed: number;
  forward: 1 | -1;
  swap: number;
  colour: string;
  // Fade-in used to hide the frame where the vehicle swaps to a new road.
  entering: number;
}

// Per-kind readability curves. Cars grow modestly at village range so they
// remain legible; large vehicles already read at strategic altitude and
// only need a small nudge. Widths are kept comfortably below road width
// (~7 m) even at maximum scale. All ramps start at or above district range
// so no vehicle ever inflates on the kvarteret view.
const KIND_CONFIG: Record<
  VehicleKind,
  {
    count: number;
    speed: [number, number];
    palette: string[];
    minRoad: number;
    roads: 'all' | 'major';
    size: [number, number, number];
    cabinSize: [number, number, number];
    readability: ReadabilityCurve;
  }
> = {
  car: {
    count: 10,
    speed: [0.010, 0.020],
    palette: ['#6f6c65', '#4a4c50', '#8a877f', '#726a5a', '#3f4552', '#a05236'],
    minRoad: 30,
    roads: 'all',
    size: [1.7, 0.7, 3.6],
    cabinSize: [1.5, 0.55, 1.4],
    readability: { rampStart: 380, rampEnd: 1500, maxScale: 3.0 }
  },
  taxi: {
    count: 2,
    speed: [0.012, 0.022],
    palette: ['#e0b658', '#e0b658'],
    minRoad: 40,
    roads: 'all',
    size: [1.7, 0.7, 3.6],
    cabinSize: [1.5, 0.55, 1.4],
    readability: { rampStart: 380, rampEnd: 1500, maxScale: 3.0 }
  },
  van: {
    count: 3,
    speed: [0.008, 0.016],
    palette: ['#5b5850', '#7a7770', '#9b9789'],
    minRoad: 50,
    roads: 'all',
    size: [2.0, 1.4, 4.6],
    cabinSize: [1.9, 0.6, 1.4],
    readability: { rampStart: 400, rampEnd: 1500, maxScale: 2.5 }
  },
  truck: {
    count: 2,
    speed: [0.007, 0.014],
    palette: ['#4a453d', '#5b5245'],
    minRoad: 80,
    roads: 'major',
    size: [2.4, 1.6, 6.0],
    cabinSize: [2.3, 0.9, 1.8],
    readability: { rampStart: 420, rampEnd: 1600, maxScale: 2.0 }
  },
  bus: {
    count: 2,
    speed: [0.008, 0.014],
    palette: ['#b7ac91', '#a89786'],
    minRoad: 100,
    roads: 'major',
    size: [2.5, 2.0, 9.5],
    cabinSize: [2.4, 0.4, 9.4],
    readability: { rampStart: 450, rampEnd: 1600, maxScale: 1.7 }
  },
  motorcycle: {
    count: 2,
    speed: [0.014, 0.025],
    palette: ['#3f3f3f', '#5c574d'],
    minRoad: 30,
    roads: 'all',
    size: [0.6, 0.7, 1.8],
    cabinSize: [0.4, 0.35, 0.8],
    readability: { rampStart: 340, rampEnd: 1400, maxScale: 4.0 }
  },
  // Tourist buses read as their own class — cream body, brown roof — and
  // spawn only on major roads passing near Campus or Gästgivaregården so
  // the flow of visitors to the two hospitality destinations is legible at
  // village scale.
  tourist_bus: {
    count: 3,
    speed: [0.006, 0.011],
    palette: ['#efe7d3', '#f0d69a'],
    minRoad: 90,
    roads: 'major',
    size: [2.6, 2.2, 10.5],
    cabinSize: [2.5, 0.4, 10.4],
    readability: { rampStart: 450, rampEnd: 1600, maxScale: 1.7 }
  }
};

// Coordinates that tourist buses are drawn towards.
const TOURIST_DESTINATIONS: Array<[number, number]> = [
  LANDMARK_BY_ID['gry-campus']?.position ?? [0, 0],
  LANDMARK_BY_ID['gry-gastgivaregard']?.position ?? [0, 0]
].filter((p) => p[0] !== 0 || p[1] !== 0);

// Restaurants and cafés that a delivery van would visit. This is what makes
// a van feel like a *service* rather than random traffic.
const DELIVERY_DESTINATIONS: Array<[number, number]> = [
  LANDMARK_BY_ID['gry-gastgivaregard']?.position,
  LANDMARK_BY_ID['gry-cornelis']?.position,
  LANDMARK_BY_ID['gry-kringlan']?.position,
  LANDMARK_BY_ID['gry-pizzanshus']?.position,
  LANDMARK_BY_ID['gry-glass']?.position,
  LANDMARK_BY_ID['gry-campus']?.position
].filter((p): p is [number, number] => !!p);

// Transport nodes taxis wait near. Torget is the village hub and the old
// station is the historic transport node.
const TAXI_HUBS: Array<[number, number]> = [
  LANDMARK_BY_ID['gry-torget']?.position,
  LANDMARK_BY_ID['gry-station']?.position,
  LANDMARK_BY_ID['gry-campus']?.position
].filter((p): p is [number, number] => !!p);

function nearestPointDistance(
  road: RawRoad,
  points: Array<[number, number]>
): number {
  if (points.length === 0) return Infinity;
  const mid = road.poly[Math.floor(road.poly.length / 2)];
  let best = Infinity;
  for (const [x, z] of points) {
    const d = Math.hypot(mid[0] - x, mid[1] - z);
    if (d < best) best = d;
  }
  return best;
}

// Kind-specific speed floor. Larger heavier vehicles do not appear on
// low-speed residential lanes or unspecified-speed local roads at all
// — a bus on a 30 km/h residential grid would visually contradict the
// hierarchy the road tier system establishes. `null` = no floor.
const KIND_SPEED_FLOOR: Record<VehicleKind, number | null> = {
  car: null,
  taxi: null,
  motorcycle: null,
  van: null,
  bus: 50,
  truck: 50,
  tourist_bus: 50
};

function eligibleRoads(kind: VehicleKind): RawRoad[] {
  const cfg = KIND_CONFIG[kind];
  // Use VILLAGE_CAR_ROADS (excludes forest tracks) as the general pool so no
  // car / taxi / van ever spawns on a hunting track deep in the forest.
  const pool = cfg.roads === 'major' ? MAJOR_ROADS : VILLAGE_CAR_ROADS;
  const filtered = pool.filter((r) => polylineLength(r.poly) >= cfg.minRoad);
  const base = filtered.length > 0 ? filtered : pool;
  const floor = KIND_SPEED_FLOOR[kind];
  // Enforce the per-kind speed floor. Roads with no maxspeed are
  // treated as sub-floor so heavy vehicles stay on tagged through-roads.
  const speedFiltered = floor == null
    ? base
    : base.filter((r) => r.maxspeed != null && r.maxspeed >= floor);
  const workingPool = speedFiltered.length > 0 ? speedFiltered : base;
  // Behavioural composition — each kind biases toward the roads that give
  // it a reason to exist. Tourists arrive at Campus / Gästgivaregården;
  // delivery vans stop at restaurants; taxis wait near transport nodes.
  if (kind === 'tourist_bus' && TOURIST_DESTINATIONS.length > 0) {
    const near = workingPool.filter(
      (r) => nearestPointDistance(r, TOURIST_DESTINATIONS) < 600
    );
    if (near.length) return near;
  }
  if (kind === 'van' && DELIVERY_DESTINATIONS.length > 0) {
    const near = workingPool.filter(
      (r) => nearestPointDistance(r, DELIVERY_DESTINATIONS) < 350
    );
    if (near.length) return near;
  }
  if (kind === 'taxi' && TAXI_HUBS.length > 0) {
    const near = workingPool.filter(
      (r) => nearestPointDistance(r, TAXI_HUBS) < 400
    );
    if (near.length) return near;
  }
  return workingPool;
}

// Precompute weights for a pool. Kept out of the hot path so the swap
// tick doesn't reallocate for every vehicle every frame.
function weightsFor(pool: RawRoad[]): number[] {
  return pool.map(roadTrafficWeight);
}

export function OsmTraffic() {
  const { actualRef } = useCamera();
  // Cache per-kind pool + weights once so spawn and swap both use the
  // same numbers and neither pays the reweight cost per event.
  const pools = useMemo(() => {
    const out: Record<VehicleKind, { pool: RawRoad[]; weights: number[] }> = {
      car: { pool: [], weights: [] },
      van: { pool: [], weights: [] },
      bus: { pool: [], weights: [] },
      truck: { pool: [], weights: [] },
      taxi: { pool: [], weights: [] },
      motorcycle: { pool: [], weights: [] },
      tourist_bus: { pool: [], weights: [] }
    };
    (Object.keys(out) as VehicleKind[]).forEach((k) => {
      const pool = eligibleRoads(k);
      out[k] = { pool, weights: weightsFor(pool) };
    });
    return out;
  }, []);
  const vehicles = useMemo<Vehicle[]>(() => {
    const rng = createRng(0xb2b3);
    const list: Vehicle[] = [];
    (Object.keys(KIND_CONFIG) as VehicleKind[]).forEach((kind) => {
      const cfg = KIND_CONFIG[kind];
      const { pool, weights } = pools[kind];
      if (pool.length === 0) return;
      for (let i = 0; i < cfg.count; i++) {
        list.push({
          kind,
          road: weightedPick(pool, weights, () => rng.next()),
          t: rng.next(),
          speed: rng.range(cfg.speed[0], cfg.speed[1]),
          forward: rng.chance(0.5) ? 1 : -1,
          // Deliberately long swap intervals so the pop-to-new-road event is
          // rare; the fade-in below hides the frame where it happens.
          swap: rng.range(45, 120),
          colour: rng.pick(cfg.palette),
          entering: 1
        });
      }
    });
    return list;
  }, [pools]);
  const refs = useRef<Array<THREE.Group | null>>([]);
  const bodyMatRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const cabinMatRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // Readability treatment — visual only. Physical route geometry and
    // simulation state (speed, position, direction, spawn logic) are
    // unchanged. Per-kind curves keep large vehicles from ballooning.
    const camDist = actualRef.current.distance;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      v.swap -= dt;
      // Bounce off the ends of the current road rather than teleporting
      // every time. Only pick a truly new road when the swap timer expires,
      // and hide the teleport frame behind a short fade.
      v.t += dt * v.speed * v.forward;
      if (v.t > 1) {
        v.t = 1 - (v.t - 1);
        v.forward = -1;
      } else if (v.t < 0) {
        v.t = -v.t;
        v.forward = 1;
      }
      if (v.swap <= 0) {
        const { pool, weights } = pools[v.kind];
        if (pool.length) {
          const rng = createRng(Math.floor(performance.now() * 13 + i * 7));
          v.road = weightedPick(pool, weights, () => rng.next());
          v.forward = rng.chance(0.5) ? 1 : -1;
          v.t = rng.next();
          v.swap = rng.range(45, 120);
          v.entering = 0;
        }
      }
      if (v.entering < 1) {
        v.entering = Math.min(1, v.entering + dt * 2.0);
      }
      const p = samplePolyline(v.road.poly, v.t);
      const g = refs.current[i];
      if (g) {
        const cfg = KIND_CONFIG[v.kind];
        const read = readabilityScale(camDist, cfg.readability);
        // Lane offset — Sweden drives on the right. samplePolyline's
        // yaw is `atan2(dx, dz)`, so the polyline forward direction
        // is `(sin(yaw), cos(yaw))` and the RIGHT side (facing forward)
        // is `(-cos(yaw), sin(yaw))`. Vehicles going against the
        // polyline direction sit on the polyline's LEFT (their own
        // right when facing the reversed heading).
        //
        // Offset scales with road half-width: maxOffset = halfWidth −
        // vehicleHalfWidth − 0.2 m clearance, capped at 1.2 m so
        // vehicles ride the right lane on wide roads without spilling
        // off narrow service tracks. Falls back to 0 (centre) when
        // the road is too narrow to fit a vehicle at any offset.
        const halfW = specFor(v.road).width / 2;
        const vehHalf = cfg.size[0] / 2;
        const maxOffset = Math.max(0, halfW - vehHalf - 0.2);
        const laneOffset = Math.min(1.2, maxOffset);
        const sign = v.forward === 1 ? 1 : -1;
        const offX = -Math.cos(p.yaw) * laneOffset * sign;
        const offZ = Math.sin(p.yaw) * laneOffset * sign;
        g.position.set(
          p.x + offX,
          (cfg.size[1] / 2) * read,
          p.z + offZ
        );
        g.rotation.y = p.yaw + (v.forward === -1 ? Math.PI : 0);
        g.scale.setScalar(read);
      }
      const bMat = bodyMatRefs.current[i];
      const cMat = cabinMatRefs.current[i];
      if (bMat && cMat) {
        bMat.opacity = v.entering;
        cMat.opacity = v.entering;
      }
    }
  });

  return (
    <group>
      {vehicles.map((v, i) => {
        const cfg = KIND_CONFIG[v.kind];
        return (
          <group
            key={`veh-${i}`}
            ref={(ref) => {
              refs.current[i] = ref;
            }}
          >
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={cfg.size} />
              <meshStandardMaterial
                ref={(ref) => {
                  bodyMatRefs.current[i] = ref;
                }}
                color={v.colour}
                roughness={0.85}
                transparent
                opacity={1}
              />
            </mesh>
            <mesh
              position={[0, cfg.size[1] / 2 + cfg.cabinSize[1] / 2, -0.2]}
            >
              <boxGeometry args={cfg.cabinSize} />
              <meshStandardMaterial
                ref={(ref) => {
                  cabinMatRefs.current[i] = ref;
                }}
                color="#a09b91"
                roughness={0.85}
                transparent
                opacity={1}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
