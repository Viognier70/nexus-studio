// Loads and types the preprocessed Grythyttan world data.
//
// Source: OpenStreetMap contributors, ODbL. Fetched via Overpass API
// on the day of Sprint VS-02B/VS-02C. Preprocessing steps:
//  - degrees → local metres (equirectangular around 59.70575°N, 14.53723°E)
//  - +X east, +Z south, y = 0 = local ground
//  - multipolygon water relations resolved into outer rings
//  - Campus / Måltidens hus / Sevillapaviljongen consolidated into a single
//    canonical landmark id `gry-campus` per the design constitution.

import worldRaw from '../data/grythyttan-world.json';

export type LatLon = [number, number];
export type Vec2Tuple = [number, number];

export interface WorldMeta {
  centerLatLon: LatLon;
  mPerDeg: [number, number];
  attribution: string;
  bbox: [number, number, number, number];
  fetched?: string | null;
}

export interface RawBuilding {
  id: string;
  poly: Vec2Tuple[];
  name?: string | null;
  kind?: string | null;
  amenity?: string | null;
  tourism?: string | null;
  religion?: string | null;
  historic?: string | null;
}

export interface RawRoad {
  id: string;
  poly: Vec2Tuple[];
  kind: string;
  name?: string | null;
  car: boolean;
  ped: boolean;
}

export interface RawPolygon {
  id: string;
  poly: Vec2Tuple[];
  name?: string | null;
}

export type LandmarkVerification = 'verified' | 'approximate' | 'placeholder';

export type CommercialStatus =
  | 'open'
  | 'busy'
  | 'quiet'
  | 'closed'
  | 'for_sale'
  | 'for_lease'
  | 'renovation'
  | 'future';

export interface Landmark {
  id: string;
  displayName: string;
  kind: 'institution' | 'commercial' | 'municipal' | 'religious' | 'placeholder';
  position: Vec2Tuple;
  source: { osmType: string | null; osmId: number | null };
  verification: LandmarkVerification;
  note: string;
}

export interface WorldData {
  meta: WorldMeta;
  buildings: RawBuilding[];
  roads: RawRoad[];
  water: RawPolygon[];
  forest: RawPolygon[];
  residential: RawPolygon[];
  grass: RawPolygon[];
  graveyards: RawPolygon[];
  landmarks: Landmark[];
}

export const WORLD: WorldData = worldRaw as unknown as WorldData;

export const LANDMARK_BY_ID: Record<string, Landmark> = Object.fromEntries(
  WORLD.landmarks.map((l) => [l.id, l])
);

// Bounds derived from the built area (buildings, roads, forest, residential
// zones). Water polygons like Torrvarpen and Sör-Älgen extend far beyond the
// village and are excluded here — otherwise the camera clamp would drown in
// a lake.
export function computeBounds(): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  const consider = (pts: Vec2Tuple[]) => {
    for (const [x, z] of pts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  };
  WORLD.buildings.forEach((b) => consider(b.poly));
  WORLD.roads.forEach((r) => consider(r.poly));
  WORLD.forest.forEach((f) => consider(f.poly));
  WORLD.residential.forEach((r) => consider(r.poly));
  if (!isFinite(minX)) return { minX: -500, maxX: 500, minZ: -400, maxZ: 400 };
  return { minX, maxX, minZ, maxZ };
}

export const WORLD_BOUNDS = computeBounds();

// Fixed Y offsets for coplanar ground layers. Prevents z-fighting without
// polygonOffset (which was the source of the flicker observed in VS-02B).
// Separations are large enough to survive depth precision at the far end of
// the zoom range (~1800 m, ~10 cm precision) and small enough that layers
// still visually read as sitting on the ground at close view.
export const GROUND_Y = {
  terrain: 0,
  waterBed: 0.15,
  water: 0.20,
  landcover: 0.28,
  roads: 0.42,
  plaza: 0.55,
  landmarkRing: 0.75,
  statusFlagBase: 0.9
} as const;

// Building OSM ways that already have handcrafted landmark geometry. The
// generic building layer skips these so we don't z-fight our own detail.
//
// Shared-container buildings: these OSM ways don't map to a single
// landmark via the way→osmId lookup above, but they physically HOUSE
// multiple node landmarks (e.g. `w869907962` is the 50.9 × 16.8 m
// Torget long house that contains Guldkringlan, Cornelis and
// Antikvariat as three commercial tenants). Handcrafted landmark
// geometry renders these as proper multi-storey buildings; the
// generic OsmBuildings layer skips them.
const SHARED_CONTAINER_BUILDING_IDS = ['w869907962'];

export const LANDMARK_BUILDING_IDS: Set<string> = new Set([
  ...WORLD.landmarks
    .filter((l) => l.source.osmType === 'way' && l.source.osmId != null)
    .map((l) => `w${l.source.osmId}`),
  ...SHARED_CONTAINER_BUILDING_IDS
]);

// Roads categorised for movement systems.
//
// * `TRACK_KINDS` — forest tracks and industrial spurs. Semantically not
//   general-traffic roads even though OSM tags them as car-permissible.
// * `VILLAGE_CAR_ROADS` — the driveable network general traffic actually
//   uses. Excludes tracks so cars, taxis, motorcycles etc. do not appear
//   in the forest.
// * `MAJOR_ROADS` — carries buses, trucks, tourist buses.
// * `PED_PATHS` — anything a pedestrian can walk on.
// * `CYCLE_PATHS` — pleasant cycling routes.
const TRACK_KINDS = new Set(['track']);

export const CAR_ROADS = WORLD.roads.filter((r) => r.car && r.poly.length >= 2);

export const VILLAGE_CAR_ROADS = WORLD.roads.filter(
  (r) => r.car && r.poly.length >= 2 && !TRACK_KINDS.has(r.kind)
);

export const TRACK_ROADS = WORLD.roads.filter(
  (r) => r.car && r.poly.length >= 2 && TRACK_KINDS.has(r.kind)
);

export const PED_PATHS = WORLD.roads.filter((r) => r.ped && r.poly.length >= 2);

export const MAJOR_ROADS = WORLD.roads.filter(
  (r) =>
    r.car &&
    r.poly.length >= 2 &&
    ['secondary', 'tertiary', 'primary', 'unclassified'].includes(r.kind)
);

export const CYCLE_PATHS = WORLD.roads.filter(
  (r) =>
    (r.kind === 'cycleway' ||
      r.kind === 'path' ||
      r.kind === 'tertiary' ||
      r.kind === 'unclassified') &&
    r.poly.length >= 2
);

// Static, curated status per landmark. Not sourced from OSM. These exist so
// the player can immediately read a village of possibilities. A future
// sprint replaces this with simulation state.
//
// Under ORDER 003 the goal is that a player scanning the village at
// district scale can find at least two visible available premises within a
// couple of seconds. Skola and Antik carry that signal here.
export const COMMERCIAL_STATUS: Record<string, CommercialStatus> = {
  'gry-gastgivaregard': 'busy',
  'gry-cornelis': 'open',
  'gry-kringlan': 'busy',
  'gry-pizzanshus': 'open',
  'gry-herrgard': 'quiet',
  'gry-glass': 'quiet',
  // Two curated availabilities so the pink signal has plural presence and
  // doesn't read as a single anomaly.
  'gry-antik': 'for_sale',
  'gry-skola': 'for_lease',
  'gry-jarnvag': 'renovation'
};

// Property status expressed as wall / roof tint on the actual building.
//
// Per ORDER 003 the reserved pink is the "available premise" colour.
// Both for_sale and for_lease carry a pink tint so that the player reads
// "you could take this on" at a glance, with a small saturation difference
// between them (sale ≈ warmer / stronger, lease ≈ softer). All other
// statuses stay muted so the pink survives across a crowded village.
export interface StatusPalette {
  wall: string;
  roof: string;
}

export const STATUS_PALETTE: Record<CommercialStatus, StatusPalette> = {
  open: { wall: '#7fab74', roof: '#3d5a3a' },
  busy: { wall: '#6ea56a', roof: '#354f36' },
  quiet: { wall: '#b8a45a', roof: '#5c5233' },
  closed: { wall: '#8a8478', roof: '#3a3630' },
  for_sale: { wall: '#c86a9c', roof: '#6a3555' },
  for_lease: { wall: '#d99cbd', roof: '#7a4a63' },
  renovation: { wall: '#d99a4a', roof: '#6e4a1e' },
  future: { wall: '#7a94b8', roof: '#3d5271' }
};

// Blend two hex colours (#rrggbb) in linear RGB.
export function tintColour(base: string, tint: string, k: number): string {
  const parse = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16)
  ];
  const [br, bg, bb] = parse(base);
  const [tr, tg, tb] = parse(tint);
  const r = Math.round(br * (1 - k) + tr * k);
  const g = Math.round(bg * (1 - k) + tg * k);
  const b = Math.round(bb * (1 - k) + tb * k);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// OSM building id → status, resolved from COMMERCIAL_STATUS via landmarks.
export const BUILDING_STATUS_BY_OSM_ID: Record<string, CommercialStatus> = (() => {
  const out: Record<string, CommercialStatus> = {};
  for (const lm of WORLD.landmarks) {
    const status = COMMERCIAL_STATUS[lm.id];
    if (!status) continue;
    if (lm.source.osmType === 'way' && lm.source.osmId != null) {
      out[`w${lm.source.osmId}`] = status;
    }
  }
  return out;
})();

// Landmark id (canonical) → status, for the crafted-landmark component.
export function landmarkStatus(id: string): CommercialStatus | null {
  return COMMERCIAL_STATUS[id] ?? null;
}

// Helper: total road length, used to seed movement uniformly.
export function polylineLength(poly: Vec2Tuple[]): number {
  let sum = 0;
  for (let i = 1; i < poly.length; i++) {
    const dx = poly[i][0] - poly[i - 1][0];
    const dz = poly[i][1] - poly[i - 1][1];
    sum += Math.hypot(dx, dz);
  }
  return sum;
}

// Sample a polyline at a normalised t in [0, 1]. Returns the point and
// the segment heading (yaw) at that point.
export function samplePolyline(poly: Vec2Tuple[], t: number): {
  x: number;
  z: number;
  yaw: number;
} {
  if (poly.length === 0) return { x: 0, z: 0, yaw: 0 };
  if (poly.length === 1) return { x: poly[0][0], z: poly[0][1], yaw: 0 };
  const total = polylineLength(poly);
  if (total === 0) return { x: poly[0][0], z: poly[0][1], yaw: 0 };
  const wrapped = ((t % 1) + 1) % 1;
  const target = wrapped * total;
  let acc = 0;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const seg = Math.hypot(dx, dz);
    if (acc + seg >= target || i === poly.length - 1) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      return {
        x: a[0] + dx * f,
        z: a[1] + dz * f,
        yaw: Math.atan2(dx, dz)
      };
    }
    acc += seg;
  }
  const last = poly[poly.length - 1];
  return { x: last[0], z: last[1], yaw: 0 };
}
