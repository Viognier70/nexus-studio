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
// Grythyttan-specific topology, verified against live Overpass tags
// 2026-07-24 (see APPROXIMATION_REGISTER of the same date):
//   - The through-road through Grythyttan is TWO different numbered
//     roads meeting at the T-junction at local (413, -7) =
//     (59.70581°N, 14.54460°E):
//       * `Rv 244` heads north-east toward Hällefors — locally
//         `Hälleforsvägen`.
//       * `Rv 205` heads south-west toward Loka Brunn / Karlskoga —
//         `Lokavägen`.
//   - The regenerated `grythyttan-world.json` (ORDER 018 refetch)
//     captures the full OSM `ref` tag, so Rv 244 / Rv 205 promotion
//     is now driven by `road.ref === '244'` / `'205'` rather than a
//     hardcoded way-id table.
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
  | 'primary'              // national through-road (Rv 244 / Hälleforsvägen)
  | 'main'                 // major continuation (Rv 205 / Lokavägen and other secondaries)
  | 'secondary_connector'  // village collectors — Kyrkogatan, Smedsgatan
  | 'village_street'       // named residentials that carry village wayfinding
  | 'local_street'         // named unclassifieds
  | 'residential'          // ordinary residential lane
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

// Width targets after ORDER 018 hierarchy rebuild. The primary through
// route is 10.0 m so it clearly dominates a 9.0 m main continuation;
// a new `village_street` tier sits between local_street and residential
// so wayfinding named residentials (Prästgatan, Torget) read as real
// village streets rather than driveways.
//
//   primary            9.5–10.5 → 10.0  (Rv 244 / Hälleforsvägen)
//   main               8.5–9.5  → 9.0   (Rv 205 / Lokavägen etc.)
//   secondary          5.5–7.0  → 6.2   (Kyrkogatan / Smedsgatan)
//   local_street       4.5–5.5  → 5.0   (named unclassifieds)
//   village_street     4.2–5.0  → 4.6   (named wayfinding residentials)
//   residential        3.2–4.0  → 3.6   (ordinary residential grid)
//   service            2.5–3.5  → 2.8
//   track              2.0–3.0  → 2.4
//   cycleway           1.8–2.6  → 2.0
//   footpath           1.0–1.8  → 1.3
export const ROLE_SPECS: Record<RoadRole, Omit<RoadRoleSpec, 'role'>> = {
  primary: {
    width: 10.0,
    colour: '#8c8780',           // slightly darker cool asphalt
    sidewalkWidth: 1.6,
    centreline: true,
    edgeLine: true,
    ped: false
  },
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
  village_street: {
    width: 4.6,
    colour: '#7d7870',           // shared with local_street palette
    sidewalkWidth: 0.9,
    centreline: false,
    edgeLine: false,
    ped: false
  },
  residential: {
    width: 3.6,
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

// Wayfinding-critical named residentials. These are village streets
// that a resident would name when giving directions — Prästgatan runs
// from the Rv 205 junction to Torget; Skolgatan reaches the school;
// Stationsgatan reaches the old station; the Bergvägen streets bound
// the village on the north-east; Kolargatan links Torget to the
// campus quarter. Promoted from raw OSM `residential` (3.6 m) to
// `village_street` (4.6 m) so they read as village streets and not
// residential alleys.
const VILLAGE_STREET_NAMES: ReadonlySet<string> = new Set([
  'Prästgatan',
  'Skolgatan',
  'Stationsgatan',
  'Kolargatan',
  'Torget',
  'Norra Bergvägen',
  'Östra Bergvägen',
  'Västra Bergvägen',
  'Hammargatan',
  'Bergslagsgatan'
]);

// OSM ref values that promote a road to `primary` — the national
// through-route that must dominate the render. `244` = the road to
// Hällefors (locally `Hälleforsvägen`). Add other refs here only if
// they carry equivalent through-flow authority.
const PRIMARY_ROAD_REFS: ReadonlySet<string> = new Set(['244']);

// Derive a role from a raw OSM road. Pure and deterministic — safe to
// call from anywhere without side effects. See file header for the
// Grythyttan-specific reasoning behind the primary / main split.
export function roleFor(road: RawRoad): RoadRole {
  // Primary through-road is detected by OSM ref (post-ORDER 018
  // refetch). Rv 244 = Hälleforsvägen: 6 continuous segments carry
  // `ref: "244"` in OSM, some named and some unnamed. Using `ref`
  // lets any future national road pick up the primary treatment
  // without a code change.
  if (road.ref && PRIMARY_ROAD_REFS.has(road.ref)) return 'primary';
  switch (road.kind) {
    case 'motorway':
    case 'trunk':
      return 'primary';
    case 'primary':
    case 'secondary':
      return 'main';
    case 'tertiary':
      return 'secondary_connector';
    case 'unclassified':
      return 'local_street';
    case 'residential':
    case 'living_street':
      // Named wayfinding streets read as village streets; every other
      // residential falls back to the ordinary residential lane.
      if (road.name && VILLAGE_STREET_NAMES.has(road.name)) {
        return 'village_street';
      }
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
// Ref → local display name. Post-ORDER-018 the world export carries
// OSM `ref`, so we can promote every unnamed Rv 244 segment to
// `Hälleforsvägen` and every unnamed Rv 205 segment to `Lokavägen`
// without maintaining a way-id table. Named segments (three of six
// Rv 205 ways carry the OSM `name: "Lokavägen"`) still use their raw
// name — the ref lookup is a fallback for the segments OSM leaves
// unnamed.
const REF_DISPLAY_NAMES: Record<string, string> = {
  '244': 'Hälleforsvägen',
  '205': 'Lokavägen'
};

// Return the label the player should see for this road. Falls back to
// the raw OSM `name`; never mutates the road. Empty string when the
// road has no display name at all.
export function displayNameFor(road: RawRoad): string {
  if (road.name) return road.name;
  if (road.ref && REF_DISPLAY_NAMES[road.ref]) {
    return REF_DISPLAY_NAMES[road.ref];
  }
  return '';
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
