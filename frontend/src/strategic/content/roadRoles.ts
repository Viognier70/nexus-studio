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
// Grythyttan-specific finding, verified against the current OSM export:
//   - No road is named `Hälleforsvägen` in the dataset. The route the
//     Vision Owner refers to as Hälleforsvägen is the same physical
//     road that OSM tags as `secondary` and — for the three named
//     segments in the built-up village — labels `Lokavägen`
//     (`w568472820`, `w1006216362`, `w1329020070`). Continuing through
//     the village end-to-end are 9 further unnamed `secondary`
//     segments; together the 12 `secondary` ways form the principal
//     through-road.
//   - `Grythyttan-Hällefors cykelväg` (`w1158870788`) is a cycleway
//     paralleling the road, not the road itself.
//   - Tertiaries are the village collectors — Kyrkogatan, Smedsgatan.
//   - Unclassifieds are the named local streets (Sörälgsvägen,
//     Breviksvägen, Kvarnvägen, Gruvgatan, Badvägen, Smalviksvägen,
//     Djupdalshultvägen).

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
