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
import {
  clipPolylineAgainstBuildings,
  clipPolylineForVehicles,
  polygonArea,
  splitAtBridgeEdges
} from '../procgen/geom';

export type LatLon = [number, number];
export type Vec2Tuple = [number, number];

export interface WorldMeta {
  centerLatLon: LatLon;
  mPerDeg: [number, number];
  attribution: string;
  bbox: [number, number, number, number];
  fetched?: string | null;
}

// Per ORDER 040 §2, every building record must declare where its
// geometry came from — required at compile time so a new record cannot
// be authored without stating it.
//
// - `osm`           — geometry from OpenStreetMap ingest (fetch-grythyttan-osm.mjs).
// - `synthesised`   — handcrafted; makes no claim beyond "a building
//                     stands here". Ordinary-tier synthesis per ADR 002 §2.1.
// - `vision-owner`  — position confirmed by the Vision Owner on a
//                     specific dated sheet. Not set on the basis of a
//                     `resolvedFrom` citation alone (per Vision Owner
//                     correction 2026-07-30 to ORDER 040 §2): citation
//                     ≠ endorsement. See memory
//                     `feedback_citation_is_not_endorsement.md`.
//
// A fourth value may be introduced later (`vision-owner-unconfirmed`
// or similar) if any Category B entry comes back from the §4.1 sheet
// as "unsure"; landed on demand rather than pre-emptively.
export type BuildingProvenance = 'osm' | 'synthesised' | 'vision-owner';

export interface RawBuilding {
  id: string;
  poly: Vec2Tuple[];
  provenance: BuildingProvenance;
  name?: string | null;
  kind?: string | null;
  amenity?: string | null;
  tourism?: string | null;
  religion?: string | null;
  historic?: string | null;
  // Optional structural detail — captured by the fetcher whenever
  // Overpass returns them. See scripts/fetch-grythyttan-osm.mjs
  // extractBuildings() for the source tags. Very sparsely populated
  // for Grythyttan today (roof:shape on ~14/274 buildings, others
  // essentially zero) but the renderer prefers real OSM values when
  // present and falls back to kind-driven inference otherwise, so a
  // future OSM survey improves the render without a code change.
  roofShape?: string | null;
  roofLevels?: number | null;
  buildingLevels?: number | null;
  height?: number | null;
  roofMaterial?: string | null;
  roofColour?: string | null;
  wallMaterial?: string | null;
  wallColour?: string | null;
}

export interface RawRoad {
  id: string;
  poly: Vec2Tuple[];
  kind: string;
  name?: string | null;
  ref?: string | null;         // OSM ref tag (e.g. "244" for Rv 244)
  surface?: string | null;     // asphalt, gravel, etc.
  width?: number | null;       // metres
  maxspeed?: number | null;    // km/h
  lanes?: number | null;
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

const WORLD_RAW: WorldData = worldRaw as unknown as WorldData;

// Split any building polygon whose OSM way has "bridge" edges longer
// than 25 m into its connected sub-polygons. See
// procgen/geom.ts::splitAtBridgeEdges — this is a systemic correction
// for OSM ways that walk multi-wing buildings as one self-touching
// polygon (Kärnhuset w193810921 is the motivating case).
//
// For each split building we keep the LARGEST sub-polygon under the
// original OSM id so any handcrafted lookup (e.g. BUILDING_BY_ID)
// resolves to the main mass. Additional wings become `#p1`, `#p2` …
// and render through the procedural OsmBuildings layer.
//
// Threshold notes:
//   - 25 m is chosen so genuinely-long straight barn / warehouse
//     walls (documented up to ~50 m in the Grythyttan dataset) do
//     NOT trigger the splitter. Buildings with edges 25–50 m but
//     with normal aspect ratio remain a single polygon.
//   - Only polygons with area / bbox_area < 0.6 are considered
//     candidates — a compact simple polygon can have one long side
//     without being multi-wing (a 50×20 m warehouse has one 50 m
//     edge and area / bbox = 1.0, and stays intact).
const SPLIT_MAX_EDGE_M = 25;
const SPLIT_AREA_BBOX_RATIO = 0.6;
const BUILDINGS_SPLIT: RawBuilding[] = (() => {
  const out: RawBuilding[] = [];
  for (const b of WORLD_RAW.buildings) {
    if (b.poly.length < 4) { out.push(b); continue; }
    // Compute bbox area
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of b.poly) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const bboxArea = Math.max(1, (maxX - minX) * (maxZ - minZ));
    const ratio = polygonArea(b.poly) / bboxArea;
    if (ratio >= SPLIT_AREA_BBOX_RATIO) {
      out.push(b);
      continue;
    }
    const parts = splitAtBridgeEdges(b.poly, SPLIT_MAX_EDGE_M);
    if (parts.length <= 1) {
      out.push(b);
      continue;
    }
    // Sort by area descending; keep the largest under the original id.
    const sorted = parts
      .map((poly) => ({ poly, area: polygonArea(poly) }))
      .sort((a, b) => b.area - a.area);
    sorted.forEach((part, idx) => {
      out.push({
        ...b,
        id: idx === 0 ? b.id : `${b.id}#p${idx}`,
        poly: part.poly
      });
    });
  }
  return out;
})();

// Publish the split building set as `WORLD.buildings` so every
// consumer (OsmBuildings, CraftedLandmarksD2 via BUILDING_BY_ID,
// clipPolylineAgainstBuildings, procgen exclusion tests) sees the
// same corrected geometry. Raw OSM buildings remain available via
// `WORLD_RAW_BUILDINGS` for anything that specifically needs the
// original vertex list.
export const WORLD: WorldData = {
  ...WORLD_RAW,
  buildings: BUILDINGS_SPLIT
};
export const WORLD_RAW_BUILDINGS: RawBuilding[] = WORLD_RAW.buildings;

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

// District 2 handcrafted buildings that have no `gry-*` landmark record in
// WORLD.landmarks. Rendered by CraftedLandmarksD2 with their actual OSM
// polygon; the generic OsmBuildings layer must skip them to avoid double
// rendering / z-fighting.
const D2_HANDCRAFTED_BUILDING_IDS = [
  'w193810921',  // Kärnhuset — Campus Grythyttan support building, 1993
  // Old Station corridor (BJ Bergslagsbanan freight yard + food-industry
  // warehousing). See documentation/references/district-2/station-corridor/.
  'w870510842',  // Station-adjacent outbuilding (BJ switching building)
  'w870510839',  // Freight-yard warehouse near platform
  'w870510833',  // Medium modern food-industry warehouse
  'w870510834',  // Large multi-wing modern food-industry complex
  'w870510823',  // Largest single freight-yard warehouse
  // School complex — Grythyttans skola F-6 + Förskolor Björken/Linden.
  // See documentation/references/district-2/school-complex/.
  'w870510877', 'w870510878', 'w870510876',
  'w870510869', 'w870510870', 'w870510866',
  'w870510884', 'w870510872', 'w870510871'
];

// The set of landmark IDs that have a dedicated handcrafted rendering
// component. Only these landmarks' OSM ways are hidden from the
// generic OsmBuildings layer — a landmark record on its own does NOT
// suppress the procedural build, because the procedural build is what
// the render depends on when no handcrafted component exists.
//
// ORDER 021 defect trace: prior to this list, every landmark with an
// OSM way was blanket-skipped by OsmBuildings on the assumption that
// a handcrafted component existed for it. ORDER 019R added `gry-ingo`
// (way w614554207) and `gry-tempo` (way w1250001245) as verified
// landmark records without handcrafted components — the blanket rule
// hid both buildings from the render for the whole 019R session.
// This list makes the "has-handcrafted" contract explicit so a new
// landmark record can only cause invisibility if the developer
// deliberately adds it to this set.
const HANDCRAFTED_LANDMARK_IDS: ReadonlySet<string> = new Set([
  'gry-kyrka',            // ChurchLandmark
  'gry-campus',           // MaltidensHusPass2
  'gry-gastgivaregard',   // GastgivaregardPass2
  'gry-pizzanshus',       // PizzansHusPass2
  'gry-herrgard',         // HerrgardPass2
  'gry-jarnvag',          // OldStationPass2
  'gry-skola',            // SkolaLandmark
  'gry-torget',           // TorgetLandmark (plaza render; w122157681 is not a building anyway)
  'gry-ip',               // IpLandmark (leisure polygon; not a building anyway)
  'gry-ingo'              // ORDER 032 — IngoCanopy in PublicRealm (building=roof + amenity=fuel; canopy not walls)
]);

// Player-owned business — rendered by PlayerBusiness with a roof
// crossfade so the interior becomes visible on zoom, per ORDER 042 §3.1
// and CAMERA_AND_GAMEPLAY_BIBLE.md §4.1. Listed here as a
// "handcrafted-like" building so OsmBuildings, ChimneySmoke,
// OsmParcelBoundaries and OsmYardSurfaces skip it and PlayerBusiness
// has the polygon to itself.
//
// Vision Owner initially picked `w869907963` per ORDER 042 §1 (Candidate
// C, 252 m² historic-centre sit-down). Corrected 2026-07-30 to
// `w869907975` (Candidate A, 146 m² Torget south edge café-scale)
// after the ORDER 041 §6 candidate-filter miss surfaced: `w869907963`
// coincides with the `gry-kringlan` (Guldkringlan) node landmark's
// rendered volume and sits 4.6 m from Gästgivaregård. The filter only
// excluded WAY-based landmarks and ran no landmark-proximity check;
// node landmarks and adjacency slipped through. See the 2026-07-30
// entry in APPROXIMATION_REGISTER.md for the mechanism-note.
export const PLAYER_BUSINESS_BUILDING_IDS: ReadonlySet<string> = new Set([
  'w869907975'   // Candidate A, Torget south edge café-scale
]);

export const LANDMARK_BUILDING_IDS: Set<string> = new Set([
  ...WORLD.landmarks
    .filter((l) =>
      HANDCRAFTED_LANDMARK_IDS.has(l.id) &&
      l.source.osmType === 'way' &&
      l.source.osmId != null
    )
    .map((l) => `w${l.source.osmId}`),
  ...SHARED_CONTAINER_BUILDING_IDS,
  ...D2_HANDCRAFTED_BUILDING_IDS,
  ...PLAYER_BUSINESS_BUILDING_IDS
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

// Building-clipped road set. OSM occasionally tags service roads that
// continue into warehouse loading bays or through factory yards as
// through-roads; if we render those verbatim, asphalt disappears into a
// wall and simulated vehicles walk through it. Preprocessing every road
// once against the building footprints trims those inside-building runs
// procedurally, without per-road exceptions. See ORDER 017a visual audit
// backlog items C1 (buildings clip road space) and C2 (vehicles off-road).
//
// Each split piece keeps its parent road's `id` for piece 0 and gets a
// `#pN` suffix for subsequent pieces, so any existing lookup against the
// canonical OSM way id still resolves to the first (usually main) piece.
export const CLIPPED_ROADS: RawRoad[] = (() => {
  const out: RawRoad[] = [];
  for (const road of WORLD.roads) {
    if (road.poly.length < 2) continue;
    const pieces = clipPolylineAgainstBuildings(road.poly);
    if (pieces.length === 0) continue;
    pieces.forEach((piece, idx) => {
      out.push({
        ...road,
        id: idx === 0 ? road.id : `${road.id}#p${idx}`,
        poly: piece
      });
    });
  }
  return out;
})();

export const CAR_ROADS = CLIPPED_ROADS.filter((r) => r.car && r.poly.length >= 2);

// Vehicle-safe road set. clipPolylineAgainstBuildings clips the raw
// centreline against building polygon EDGES with zero clearance —
// that keeps the rendered asphalt where OSM says it is even when a
// road physically touches a loading-bay wall. Vehicles, however,
// ride at up to 1.2 m right-lane offset plus their own half-width
// (~0.9 m at 1× scale, up to ~1.7 m at village-zoom readability scale)
// so a car whose centre is 1.2 m from a wall still enters the wall.
//
// CLEARANCE_M = 1.2 (lane offset) + 1.7 (max scaled vehicle half)
//             + 0.3 (safety) = 3.2 m
//
// clipPolylineForVehicles densely resamples every polyline and drops
// any run whose sample is within CLEARANCE_M of any building. The
// output is what the traffic navigation graph traverses; road
// rendering keeps using the raw centreline clip.
const VEHICLE_CLEARANCE_M = 3.2;
const CLIPPED_ROADS_VEHICLE: RawRoad[] = (() => {
  const out: RawRoad[] = [];
  for (const road of CLIPPED_ROADS) {
    if (road.poly.length < 2) continue;
    if (!road.car) continue;
    const pieces = clipPolylineForVehicles(road.poly, VEHICLE_CLEARANCE_M);
    pieces.forEach((piece, idx) => {
      out.push({
        ...road,
        id: idx === 0 ? road.id : `${road.id}#v${idx}`,
        poly: piece
      });
    });
  }
  return out;
})();

export const VILLAGE_CAR_ROADS = CLIPPED_ROADS_VEHICLE.filter(
  (r) => r.car && r.poly.length >= 2 && !TRACK_KINDS.has(r.kind)
);

export const TRACK_ROADS = CLIPPED_ROADS_VEHICLE.filter(
  (r) => r.car && r.poly.length >= 2 && TRACK_KINDS.has(r.kind)
);

export const PED_PATHS = CLIPPED_ROADS.filter((r) => r.ped && r.poly.length >= 2);

export const MAJOR_ROADS = CLIPPED_ROADS_VEHICLE.filter(
  (r) =>
    r.car &&
    r.poly.length >= 2 &&
    ['secondary', 'tertiary', 'primary', 'unclassified'].includes(r.kind)
);

export const CYCLE_PATHS = CLIPPED_ROADS.filter(
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
