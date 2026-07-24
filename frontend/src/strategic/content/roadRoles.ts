// Semantic road-role layer, sitting above the raw OSM `highway` tag.
//
// Rendering and simulation should express the village's actual traffic
// hierarchy — principal through-road dominating, residential lanes
// subordinate, footpaths clearly not driveable — rather than the
// verbatim OSM categorisation. This module keeps that mapping in one
// place so `OsmRoads.tsx`, `StreetLabels.tsx` and future signage /
// wayfinding systems all read from the same source.
//
// Rule of thumb (ORDER 017a H1):
//   - Raw OSM data is preserved. We do not mutate `road.kind` or
//     `road.name`.
//   - The role is derived; the raw name (e.g. Lokavägen) is what the
//     player reads on the map.
//
// Grythyttan-specific topology audit, verified against live Overpass
// tags on 2026-07-24 (see APPROXIMATION_REGISTER entry of the same
// date):
//   - The through-road through Grythyttan is TWO different numbered
//     roads meeting at the T-junction at local (413, -7) =
//     (59.70581°N, 14.54460°E):
//       * `Rv 244` heads north-east toward Hällefors — this is what
//         the Vision Owner (and residents) call `Hälleforsvägen`.
//       * `Rv 205` heads south-west toward Loka Brunn / Karlskoga —
//         this is `Lokavägen`.
//   - The current world.json export captures only the OSM `name` tag,
//     not `ref`. Three of the six Rv 205 segments carry the name
//     `Lokavägen` (`w568472820`, `w1006216362`, `w1329020070`) and
//     are labelled correctly; the six Rv 244 segments are all
//     unnamed in the export and therefore render as an asphalt strip
//     with no player-facing name. That gap is why the Vision Owner
//     reported `Hälleforsvägen` as "missing" — the road IS drawn, but
//     unlabelled.
//   - Topology itself is geographically correct: Kärnhuset (408, -90)
//     and Måltidens hus (568, -86) sit north of Rv 244; Ingo
//     (368, -12) sits on it; Pizzans Hus (345, +22) sits south of it.
//     Prästgatan begins at (378.7, 51.5), the west end of the
//     Lokavägen segment `w1329020070`, and chains
//     `w122157689 → w1329020068 → w122157691` westward to within 20 m
//     of Torget's east edge.
//   - `Grythyttan-Hällefors cykelväg` (`w1158870788`) is a parallel
//     cycleway, not the road.
//   - Tertiaries are village collectors — Kyrkogatan, Smedsgatan.
//   - Unclassifieds are named local streets (Sörälgsvägen,
//     Breviksvägen, Kvarnvägen, Gruvgatan, Badvägen, Smalviksvägen,
//     Djupdalshultvägen).
//
// Correction strategy: rather than mutate the raw OSM data, we
// introduce a derived display-name layer (`displayNameFor` below)
// that promotes the six unnamed Rv 244 segments to `Hälleforsvägen`
// and the three unnamed Rv 205 continuations to `Lokavägen`. Raw
// `road.name` and `road.kind` are preserved untouched. A future
// refresh of the world preprocessing that captures `ref` will let us
// generalise this from a hardcoded way-id table to a tag-driven rule.

import type { RawRoad } from './world';

export type RoadRole =
  | 'main'
  | 'secondary_connector'
  | 'local_street'
  | 'residential'
  | 'service'
  | 'track'
  | 'cycleway'
  | 'footpath';

export interface RoadRoleSpec {
  role: RoadRole;
  // Rendered carriageway width in metres. Visual target, tuned against
  // the localhost screenshots — not a legal survey claim.
  width: number;
  // Base carriageway colour. Main + secondary are asphalt (cool grey),
  // local + residential are a quieter warmer asphalt, service is dusty
  // gravel-ish, tracks are warmer gravel, cycleways carry a warmer
  // red-brown tint, footpaths are pedestrian gravel.
  colour: string;
  // Per-side sidewalk width. 0 = no sidewalk. Only main / secondary /
  // local streets get sidewalks; residentials + service + tracks +
  // ped/cycle networks do not.
  sidewalkWidth: number;
  // Painted centreline stripe. Applied only where visually justified.
  centreline: boolean;
  // Painted continuous edge line (both sides). Reserved for the
  // principal through-road only.
  edgeLine: boolean;
  // For labels and legibility: is this pedestrian / cyclist geometry?
  ped: boolean;
}

// Width targets from ORDER 017a H1 (mid of each range):
//   main               8.5–10.0 → 9.0
//   secondary          5.5–7.0  → 6.2
//   local_street       4.5–5.5  → 5.0
//   residential        3.2–4.5  → 3.8
//   service            2.5–3.5  → 2.8
//   track              2.0–3.0  → 2.4
//   cycleway           1.8–2.6  → 2.0
//   footpath           1.0–1.8  → 1.3
export const ROLE_SPECS: Record<RoadRole, Omit<RoadRoleSpec, 'role'>> = {
  main: {
    width: 9.0,
    colour: '#8f8a82',           // cool asphalt
    sidewalkWidth: 1.5,
    centreline: true,
    edgeLine: true,
    ped: false
  },
  secondary_connector: {
    width: 6.2,
    colour: '#8a857d',
    sidewalkWidth: 1.2,
    centreline: true,
    edgeLine: false,
    ped: false
  },
  local_street: {
    width: 5.0,
    colour: '#807b73',           // quieter warmer asphalt
    sidewalkWidth: 1.0,
    centreline: false,
    edgeLine: false,
    ped: false
  },
  residential: {
    width: 3.8,
    colour: '#7a756d',
    sidewalkWidth: 0,
    centreline: false,
    edgeLine: false,
    ped: false
  },
  service: {
    width: 2.8,
    colour: '#736e60',           // dusty muted service surface
    sidewalkWidth: 0,
    centreline: false,
    edgeLine: false,
    ped: false
  },
  track: {
    width: 2.4,
    colour: '#7a6a52',           // warm gravel
    sidewalkWidth: 0,
    centreline: false,
    edgeLine: false,
    ped: true
  },
  cycleway: {
    width: 2.0,
    colour: '#8f7362',           // red-brown asphalt, restrained
    sidewalkWidth: 0,
    centreline: false,
    edgeLine: false,
    ped: true
  },
  footpath: {
    width: 1.3,
    colour: '#948667',           // pale pedestrian gravel
    sidewalkWidth: 0,
    centreline: false,
    edgeLine: false,
    ped: true
  }
};

// Roads that OSM labels with names that traditionally denote the
// through-road even when OSM tagged them below `secondary`. Empty for
// Grythyttan — all Lokavägen segments are already `secondary`. Kept for
// future promotion if a specific named road needs to be lifted to
// `main` regardless of its OSM class.
const PRINCIPAL_ROAD_NAMES: ReadonlySet<string> = new Set<string>();

// Derive a role from a raw OSM road. Pure and deterministic — safe to
// call from anywhere without side effects.
export function roleFor(road: RawRoad): RoadRole {
  if (road.name && PRINCIPAL_ROAD_NAMES.has(road.name)) return 'main';
  switch (road.kind) {
    case 'motorway':
    case 'trunk':
    case 'primary':
    case 'secondary':
      return 'main';
    case 'tertiary':
      return 'secondary_connector';
    case 'unclassified':
      return 'local_street';
    case 'residential':
    case 'living_street':
      return 'residential';
    case 'service':
      return 'service';
    case 'track':
      return 'track';
    case 'cycleway':
      return 'cycleway';
    case 'footway':
    case 'path':
    case 'steps':
    case 'pedestrian':
    case 'platform':
      return 'footpath';
    default:
      return 'local_street';
  }
}

export function specFor(road: RawRoad): RoadRoleSpec {
  const role = roleFor(road);
  return { role, ...ROLE_SPECS[role] };
}

// ---------- Derived display-name layer ----------
//
// Hardcoded OSM way-id sets for the six unnamed Rv 244 segments (the
// road to Hällefors — locally `Hälleforsvägen`) and the three unnamed
// Rv 205 continuations (`Lokavägen`). Verified 2026-07-24 by fetching
// live Overpass tags for every OSM secondary in the world bbox.
//
// These are the ONLY promotions needed for Grythyttan's principal
// through-route. Every other named road already carries its OSM
// `name` and needs no derivation.
const HALLEFORSVAGEN_WAY_IDS: ReadonlySet<string> = new Set([
  'w1006222227',   // enters village from north (curving down to junction)
  'w8122751',      // junction → E/SE
  'w287145821',    // continues E
  'w287145822',    // continues SE (out of village bbox to E)
  'w1006216361',   // continues N (out of village bbox to NE)
  'w25514870'      // continues to Hällefors
]);
const LOKAVAGEN_UNNAMED_WAY_IDS: ReadonlySet<string> = new Set([
  'w568472821',    // Lokavägen continuation SW (unnamed in OSM)
  'w614988987',    // Lokavägen continuation further SW
  'w1083999822'    // Lokavägen continuation into Loka
]);

// Return the label the player should see for this road. Falls back to
// the raw OSM `name`; never mutates the road. Empty string when the
// road has no display name at all.
export function displayNameFor(road: RawRoad): string {
  if (HALLEFORSVAGEN_WAY_IDS.has(road.id)) return 'Hälleforsvägen';
  if (LOKAVAGEN_UNNAMED_WAY_IDS.has(road.id)) return 'Lokavägen';
  return road.name ?? '';
}

// Wayfinding streets deserve a broader label-visibility envelope than
// their OSM road class would give them, because they are how the
// player mentally connects the village. Kept small and defensible —
// each entry needs a real wayfinding function, not just a name.
export const WAYFINDING_ROAD_NAMES: ReadonlySet<string> = new Set([
  'Hälleforsvägen',    // principal through-road (north branch)
  'Lokavägen',         // principal through-road (south-west branch)
  'Prästgatan',        // begins at Lokavägen junction, ends at Torget
  'Skolgatan',         // reaches Grythyttans skola
  'Stationsgatan',     // reaches old station area
  'Kyrkogatan',        // village collector past the church
  'Smedsgatan',        // village collector
  'Sörälgsvägen'       // spur to Campus (Måltidens hus / Kärnhuset)
]);
