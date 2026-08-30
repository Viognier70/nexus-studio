import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import {
  BUILDING_STATUS_BY_OSM_ID,
  LANDMARK_BUILDING_IDS,
  STATUS_PALETTE,
  tintColour,
  WORLD
} from '../content/world';
import type { RawBuilding, Vec2Tuple } from '../content/world';
import { nearestStreetProfile } from '../content/streetProfiles';
import { inside } from '../procgen/geom';
import { SKIP_PROCEDURAL_IDS } from './ProceduralFacades';

type WealthTier = 'modest' | 'standard' | 'prosperous';

interface TypologyProfile {
  wealth: WealthTier;
  pitchMul: number;         // 1.0 = the ridgeHeightFor default; scales ridgeH
  dormerCount: number;      // 0, 1, 2 — only placed on gable roofs
  chimneyCount: number;     // 1 or 2
  hasCornerboards: boolean; // white painted corner boards
  cladding: 'vertical_timber' | 'horizontal_timber' | 'plaster' | 'iron_sheet';
}

interface Extruded {
  id: string;
  geo: THREE.BufferGeometry;
  wallColour: string;
  roofColour: string;
  ridgeCentre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
  height: number;
  roofStyle: 'flat' | 'gable' | 'hip' | 'industrial' | 'shed' | 'barn';
  building: RawBuilding;
  ridgeH: number;         // computed roof height (peak above the eaves)
  effectiveKind: string;  // after any 'yes' → shed/garage/small-commercial reclassify
  trimColour: string;     // per-building ridge cap / fascia / chimney colour
  profile: TypologyProfile;
}

// Base palette per building kind. Subdued Scandinavian tones with enough
// variation for silhouettes to read at village zoom. A small deterministic
// per-building hue/brightness wobble is applied on top of these bases in
// `toExtruded`, so two neighbouring houses no longer share the exact same
// Falu-red — the previous domino effect was reading as a single painted
// wall from village-scale zoom.
const KIND_COLOUR: Record<string, { wall: string; roof: string }> = {
  university: { wall: '#e7dcc7', roof: '#5a5044' },
  hotel: { wall: '#c9b28e', roof: '#3f342a' },
  school: { wall: '#c9b28e', roof: '#7b3f2b' },
  train_station: { wall: '#a5442c', roof: '#382b22' },
  commercial: { wall: '#b8a68a', roof: '#4a4136' },
  // Faluröd for real houses and detached dwellings — softened so it reads
  // as a village of homes, not a wall of tomato red.
  house: { wall: '#a24a3a', roof: '#402d24' },
  detached: { wall: '#a24a3a', roof: '#402d24' },
  // Larger residential blocks: warm ochre plaster, less saturated.
  residential: { wall: '#c9a878', roof: '#4a3a2e' },
  apartments: { wall: '#c2b092', roof: '#3f342a' },
  industrial: { wall: '#6a675e', roof: '#3d3a34' },
  roof: { wall: '#8a8478', roof: '#3a3630' },
  yes: { wall: '#b8ac96', roof: '#4a4136' },
  // Reclassified subtypes of 'yes' based on footprint area, so small
  // outbuildings (156 'yes' polygons in the Grythyttan dataset — many
  // are sheds, garages and outbuildings tagged only as building=yes)
  // pick up the right typology instead of all being ochre boxes.
  shed: { wall: '#7d5b3f', roof: '#3a2b22' },      // creosoted timber
  garage: { wall: '#a24a3a', roof: '#3a2b22' },    // small Falu-red garage
  outbuilding: { wall: '#b8a68a', roof: '#4a4136' }, // generic small building
  // Bergslag barns: long, dark-red vertical-board timber walls with a
  // steep double-pitch iron-sheet roof. Reclassified from `industrial`
  // at build time based on aspect ratio.
  barn: { wall: '#6a3226', roof: '#312622' },
  // ORDER 032 — heritage buildings (Grythytte Qvarn added from Vision
  // Owner archive). Dark red-brown Bergslag timber with darker roof.
  historic: { wall: '#6a3226', roof: '#3a2b22' },
  chapel: { wall: '#efe6d4', roof: '#3a2e20' }
};

const DEFAULT_COLOUR = { wall: '#a89e88', roof: '#4a4136' };

// Polygon area (unsigned) — used to reclassify unknown 'yes' buildings
// into shed / garage / outbuilding sub-types.
function polygonArea(poly: Vec2Tuple[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    sum += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  }
  return Math.abs(sum) / 2;
}

function polygonCentroid(poly: Vec2Tuple[]): [number, number] {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}

// Neighbourhood tints derived from the 12 OSM residential polygons.
// Each polygon takes a deterministic warm-or-cool nudge; buildings
// snap to the nearest neighbourhood centroid and inherit its tint at
// a small magnitude. This turns a village of ~340 individually wobbled
// buildings into ~12 visually coherent neighbourhoods, so a resident
// can read "the ochre street" versus "the Falu-red street" without any
// hand-authored zoning.
const NEIGHBOURHOOD_WARM_TINT = '#c98f5a';    // warmer ochre / burnt orange
const NEIGHBOURHOOD_COOL_TINT = '#7a8a92';    // cool grey-blue

interface NeighbourhoodTint {
  centre: [number, number];
  wallTint: string;
  roofTint: string;
  strength: number;
}

const NEIGHBOURHOOD_TINTS: NeighbourhoodTint[] = WORLD.residential
  .map((r) => {
    const h = idHash(r.id);
    return {
      centre: polygonCentroid(r.poly),
      // Alternate warm/cool per polygon deterministically.
      wallTint: h > 0.5 ? NEIGHBOURHOOD_WARM_TINT : NEIGHBOURHOOD_COOL_TINT,
      roofTint: h > 0.5 ? '#3a2620' : '#2f333a',
      strength: 0.08 + Math.abs(h - 0.5) * 0.12  // 0.08–0.14
    };
  });

function nearestNeighbourhood(x: number, z: number): NeighbourhoodTint | null {
  if (NEIGHBOURHOOD_TINTS.length === 0) return null;
  let best: NeighbourhoodTint = NEIGHBOURHOOD_TINTS[0];
  let bestDist = Infinity;
  for (const n of NEIGHBOURHOOD_TINTS) {
    const d = Math.hypot(x - n.centre[0], z - n.centre[1]);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  // Neighbourhood influence tapers past ~180 m — buildings out on the
  // village fringes don't get pulled toward an urban palette.
  if (bestDist > 180) return null;
  return best;
}

// Small per-building colour wobble in linear RGB. Deterministic per id so
// the same building always renders the same colour across sessions. The
// wobble is intentionally subtle — enough to break the "one wall of
// identical houses" effect without producing rainbow chaos.
function wobbleColour(base: string, hash: number, magnitude = 0.07): string {
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  // Brightness component and per-channel jitter, both hashed but from
  // different bits so they aren't correlated.
  const brightness = 1 + (hash - 0.5) * 2 * magnitude;
  const jitterR = 1 + ((hash * 7.19) % 1 - 0.5) * magnitude;
  const jitterG = 1 + ((hash * 13.71) % 1 - 0.5) * magnitude;
  const jitterB = 1 + ((hash * 23.17) % 1 - 0.5) * magnitude;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(clamp(r * brightness * jitterR))}${hex(clamp(g * brightness * jitterG))}${hex(clamp(b * brightness * jitterB))}`;
}

// Reclassify a raw building. Grythyttan's OSM dataset has 156 buildings
// tagged only `building=yes`; many are visibly sheds, garages and
// outbuildings rather than uniform boxes. Footprint area gives a
// defensible split — no unique invention, just a Bergslag typology
// heuristic applied consistently to every ambiguous polygon.
function effectiveKindFor(b: RawBuilding): string {
  const raw = b.kind ?? 'yes';
  if (raw !== 'yes') return raw;
  const area = polygonArea(b.poly);
  if (area < 22) return 'shed';           // < ~22 m² → small shed
  if (area < 55) return 'garage';         // 22–55 m² → single/double garage
  if (area < 140) return 'outbuilding';   // 55–140 m² → small commercial or utility
  return 'yes';                            // larger unknowns keep the generic look
}

// Deterministic 32-bit hash for a building ID. Keeps small per-building
// variations reproducible across sessions (same seed → same silhouette
// noise), which the Constitution's determinism-under-seed rule requires.
function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

// Per-kind base height. Then a ±12% deterministic wobble breaks the
// domino look that appears when every 'yes' or 'industrial' building
// stands at exactly the same height. OSM `height` / `building:levels`
// override the derivation when present so a tagged 5-storey block is
// not squashed into the same ~8 m default as every other apartment.
function heightFor(b: RawBuilding, kind: string): number {
  // Direct OSM height (metres). Tagged on ~0/274 buildings in the
  // current Grythyttan dataset but honoured for the future refetch
  // when it becomes populated.
  if (b.height != null && b.height > 2 && b.height < 60) {
    return b.height;
  }
  // OSM building:levels → 3.0 m per storey (Bergslag civic default).
  // The ±12% wobble is applied on top so a row of 2-storey houses
  // still varies visibly.
  if (b.buildingLevels != null && b.buildingLevels >= 1 && b.buildingLevels < 20) {
    const wobble = (idHash(b.id) - 0.5) * 0.16; // slightly gentler when we know the storey count
    return b.buildingLevels * 3.0 * (1 + wobble);
  }
  let base: number;
  if (kind === 'university') base = 9;
  else if (kind === 'hotel') base = 8;
  else if (kind === 'apartments') base = 8.5;
  else if (kind === 'commercial') base = 6;
  else if (kind === 'train_station') base = 6;
  else if (kind === 'school') base = 8;
  else if (kind === 'industrial') base = 7;
  else if (kind === 'barn') base = 6;
  else if (kind === 'house' || kind === 'detached') base = 4.5;
  else if (kind === 'residential') base = 6.5;
  else if (kind === 'shed') base = 2.6;
  else if (kind === 'garage') base = 3.2;
  else if (kind === 'outbuilding') base = 4.0;
  else base = 5;
  const wobble = (idHash(b.id) - 0.5) * 0.24; // ±12%
  return base * (1 + wobble);
}

// OSM `roof:shape` → internal roof-style mapping. Only the values that
// map unambiguously to our five procedural roof styles are honoured;
// exotic shapes (dome, onion, sawtooth, gambrel) fall through to the
// kind-driven inference so a future asset system can pick them up
// without a code change here.
function roofStyleFromOsm(
  osmShape: string | null | undefined
): Extruded['roofStyle'] | null {
  if (!osmShape) return null;
  const v = osmShape.toLowerCase();
  if (v === 'flat') return 'flat';
  if (v === 'gabled' || v === 'gable' || v === 'pitched') return 'gable';
  if (
    v === 'hipped' ||
    v === 'half-hipped' ||
    v === 'side_hipped' ||
    v === 'pyramidal'
  ) return 'hip';
  if (v === 'skillion' || v === 'mono_pitch' || v === 'monopitch') return 'shed';
  return null;
}

// Which roof style suits which kind. Houses / detached get gables; larger
// residential and civic blocks get hipped roofs; industrial gets a flat
// vented look; sheds get a single-slope shed roof; garages get a low
// monopitch (visually distinct from house gables); barns get a steep
// double-pitch gable; unknown 'yes' still stays flat so we don't fake
// detail on polygons we know nothing about.
function roofStyleFor(kind: string): Extruded['roofStyle'] {
  if (kind === 'house' || kind === 'detached') return 'gable';
  if (kind === 'residential') return 'gable';
  if (kind === 'apartments' || kind === 'hotel' || kind === 'school') return 'hip';
  if (kind === 'industrial') return 'industrial';
  if (kind === 'barn') return 'barn';
  if (kind === 'shed') return 'shed';
  if (kind === 'garage') return 'shed';     // monopitch garage
  if (kind === 'outbuilding') return 'gable';
  if (kind === 'commercial') return 'gable';
  return 'flat';
}

// Roof pitch (ridge height above the eave) per style. Kept moderate so
// procedural silhouettes read at village zoom without towering over the
// handcrafted District 1 landmarks. The barn pitch is intentionally
// steeper — a defining Bergslag barn silhouette. The pitchMul argument
// nudges the pitch up or down per building (modest houses read a bit
// shallower, prosperous villas a bit steeper).
function ridgeHeightFor(
  style: Extruded['roofStyle'],
  rd: number,
  pitchMul = 1
): number {
  if (style === 'flat' || style === 'industrial') return 0;
  if (style === 'gable') return Math.min(2.8, rd * 0.32 * pitchMul);
  if (style === 'barn') return Math.min(3.6, rd * 0.5);
  if (style === 'hip') return Math.min(1.8, rd * 0.22 * pitchMul);
  if (style === 'shed') return Math.min(1.2, rd * 0.18);
  return 0;
}

// Cladding inferred from kind — determines wall-colour family bias in
// facade code and future material tweaks (Block 2 uses this).
function claddingFor(kind: string): TypologyProfile['cladding'] {
  if (kind === 'apartments' || kind === 'hotel' || kind === 'school' ||
      kind === 'university' || kind === 'train_station' || kind === 'commercial')
    return 'plaster';
  if (kind === 'industrial' || kind === 'barn' || kind === 'shed')
    return 'iron_sheet';
  // Timber for house / detached / residential / garage / outbuilding —
  // pick vertical vs horizontal deterministically per building.
  return 'vertical_timber';   // per-building horizontal alternative set in profileFor
}

// Deterministic per-building typology profile. Only residential-scale
// kinds get wealth-driven variation — municipal / commercial / farm
// buildings stay 'standard' so their institutional silhouette holds.
function profileFor(b: RawBuilding, kind: string): TypologyProfile {
  const wealthCan =
    kind === 'house' || kind === 'detached' || kind === 'residential';
  const cladBase = claddingFor(kind);
  const cladHash = idHash(b.id + ':cladding');
  // 50/50 vertical vs horizontal timber inside the timber families.
  const cladding: TypologyProfile['cladding'] =
    cladBase === 'vertical_timber' && cladHash > 0.5
      ? 'horizontal_timber'
      : cladBase;

  if (!wealthCan) {
    return {
      wealth: 'standard',
      pitchMul: 1.0,
      dormerCount: 0,
      chimneyCount: kind === 'apartments' || kind === 'hotel' ? 2 : 1,
      hasCornerboards:
        kind === 'commercial' || kind === 'outbuilding' || kind === 'garage',
      cladding
    };
  }

  const wh = idHash(b.id + ':wealth');
  const wealth: WealthTier =
    wh < 0.28 ? 'modest' : wh < 0.85 ? 'standard' : 'prosperous';
  const pitchMul =
    wealth === 'modest' ? 0.88 :
    wealth === 'standard' ? 1.0 : 1.18;
  // Dormers only on gable roofs. Modest houses skip them, standard
  // houses get one occasionally, prosperous villas get two.
  const dormerCount =
    wealth === 'prosperous' ? 2 :
    wealth === 'standard' && wh > 0.6 ? 1 : 0;
  const chimneyCount = wealth === 'prosperous' ? 2 : 1;
  // Cornerboards on ~70 % of houses. Painted-timber Bergslag houses
  // very commonly have them; leaving 30 % without breaks the "every
  // house has the exact same trim" look.
  const hasCornerboards = idHash(b.id + ':corners') > 0.3;
  return { wealth, pitchMul, dormerCount, chimneyCount, hasCornerboards, cladding };
}

// Post-OBB reclassify pass. Some `industrial` polygons are actually
// long, narrow farmhouse-adjacent barns (aspect ratio > ~2.2, area
// > 150 m²); render them as barns rather than flat-topped factories.
// Some `yes` polygons that dropped through the size heuristic and
// stayed generic ('yes' > 140 m²) are quite likely small commercial or
// utility blocks — a low hip roof reads better than a flat cap.
function postObbKind(kind: string, w: number, d: number): string {
  const aspect = Math.max(w, d) / Math.max(1, Math.min(w, d));
  const area = w * d;
  if (kind === 'industrial' && aspect > 2.2 && area > 150) return 'barn';
  if (kind === 'yes' && area > 140) return 'commercial';
  return kind;
}

// Oriented bounding box: rotate the polygon so the longest edge lies along
// X, then take the axis-aligned bbox in that frame. Returns the oriented
// dimensions (width along the ridge, depth across it) plus the ridge angle.
// This produces a roof cap that fits the building rather than a
// worst-case-inflated cap that spills off the walls.
function orientedBbox(poly: Vec2Tuple[]): {
  w: number;
  d: number;
  angle: number;
  centre: [number, number];
} {
  // Ridge direction from longest edge.
  let bestLen = 0;
  let angle = 0;
  for (let i = 1; i < poly.length; i++) {
    const dx = poly[i][0] - poly[i - 1][0];
    const dz = poly[i][1] - poly[i - 1][1];
    const l = Math.hypot(dx, dz);
    if (l > bestLen) {
      bestLen = l;
      angle = Math.atan2(dz, dx);
    }
  }
  // Centre = polygon centroid (unrotated).
  let cx = 0,
    cz = 0,
    n = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  cx /= Math.max(1, n);
  cz /= Math.max(1, n);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minU = Infinity,
    maxU = -Infinity,
    minV = Infinity,
    maxV = -Infinity;
  for (const [x, z] of poly) {
    const u = (x - cx) * cos - (z - cz) * sin;
    const v = (x - cx) * sin + (z - cz) * cos;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  return {
    w: maxU - minU,
    d: maxV - minV,
    angle,
    centre: [cx, cz]
  };
}

function toExtruded(b: RawBuilding): Extruded | null {
  if (b.poly.length < 4) return null;
  // Y-negation is the ORDER 020 transform-parity fix. `rotateX(-π/2)`
  // below sends shape (x, y, 0) → world (x, 0, -y); negating y at the
  // shape.moveTo call cancels that, so a polygon vertex at OSM (x, z)
  // renders at world Z = +z — the same coordinate frame the shadow
  // map, camera, landmarks and vehicles use. See
  // CraftedLandmarks.useLandmarkWallGeo for the equivalent fix on the
  // handcrafted-landmark path.
  const shape = new THREE.Shape();
  shape.moveTo(b.poly[0][0], -b.poly[0][1]);
  for (let i = 1; i < b.poly.length; i++)
    shape.lineTo(b.poly[i][0], -b.poly[i][1]);
  // First-pass kind from `building=*` tag and area-based sub-classification.
  const preKind = effectiveKindFor(b);
  const obb = orientedBbox(b.poly);
  // Second-pass reclassify using the oriented dimensions — long narrow
  // industrial polygons become barns, larger `yes` polygons become
  // commercial with a hip roof rather than a flat cap.
  const kind = postObbKind(preKind, obb.w, obb.d);
  const h = heightFor(b, kind);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  const base = KIND_COLOUR[kind] ?? DEFAULT_COLOUR;
  const hash = idHash(b.id);
  let wallColour = wobbleColour(base.wall, hash, 0.08);
  let roofColour = wobbleColour(base.roof, hash, 0.06);

  // Neighbourhood coherence: pull each building's palette a small
  // amount toward the local residential polygon's assigned tint.
  // Applied before the status override so curated commercial signals
  // still dominate; skipped for very small kinds (shed / garage) so
  // outbuildings keep their own colour identity.
  if (kind !== 'shed' && kind !== 'garage') {
    const nb = nearestNeighbourhood(obb.centre[0], obb.centre[1]);
    if (nb) {
      wallColour = tintColour(wallColour, nb.wallTint, nb.strength);
      roofColour = tintColour(roofColour, nb.roofTint, nb.strength * 0.6);
    }
  }

  // Roof ageing — a per-building drift toward a weathered grey / green.
  // Older roofs pick up moss and dust; younger roofs stay closer to
  // their paint. Deterministic per building so nothing flickers between
  // frames.
  const ageHash = idHash(b.id + ':age');
  if (ageHash > 0.35) {
    const aged = ageHash > 0.75 ? '#4a5142' : '#5f5748';
    roofColour = tintColour(roofColour, aged, (ageHash - 0.35) * 0.35);
  }

  // Economic character in architectural language only.
  // Modest houses drift a hair toward weathered darker paint; prosperous
  // villas drift toward brighter freshly-painted / plaster tones.
  // Municipal / civic kinds get a small cool nudge so plaster reads as
  // an institutional colour rather than a warm domestic Faluröd.
  if (kind === 'house' || kind === 'detached' || kind === 'residential') {
    if (kind === 'house' || kind === 'detached') {
      // Apply wealth tint only after neighbourhood + ageing so the wealth
      // signal is subtle rather than dominant.
      const w = idHash(b.id + ':wealth');
      const wealth: WealthTier =
        w < 0.28 ? 'modest' : w < 0.85 ? 'standard' : 'prosperous';
      if (wealth === 'modest') {
        wallColour = tintColour(wallColour, '#403830', 0.10);   // slight weathering
      } else if (wealth === 'prosperous') {
        wallColour = tintColour(wallColour, '#f0e8d4', 0.14);   // fresher paint / plaster
        roofColour = tintColour(roofColour, '#3a2d24', 0.06);   // richer roof pigment
      }

      // ORDER 031 replaces the earlier ORDER 030 Tier 1b random palette
      // hash. The prior scheme assigned villa wall colours from a generic
      // Swedish distribution (60/15/10/10/5 across Faluröd / cream / yellow
      // / white / brown) — a "statistical assumption" explicitly forbidden
      // by ORDER 031 Phase 4.
      //
      // The new logic derives colour by evidence in three tiers:
      //   1. If OSM building:colour is set, use it (handled below, after
      //      the wealth block).
      //   2. Otherwise inherit the fronting street's colour_tendency
      //      from streetProfiles.ts (evidence-based per-street palette
      //      derived from the Vision Owner Street View archive).
      //   3. Fall through to the family base palette if the street has
      //      no colour tendency signal.
      // Neighbouring plots on the same street therefore share a coherent
      // colour tendency (Badvägen leans cream-dominant, Kyrkogatan leans
      // Faluröd-dominant, Nygatan leans industrial-brick), and the diversity
      // between individual buildings comes from wobble + wealth + neighbourhood
      // tint — not from a random per-building palette assignment.
      const profile = nearestStreetProfile(obb.centre[0], obb.centre[1]);
      switch (profile.colour_tendency) {
        case 'cream-dominant':
          // Pull walls toward pale cream — Badvägen lakeshore villas.
          wallColour = tintColour(wallColour, '#e8dcb8', 0.45);
          break;
        case 'faluröd-dominant':
          // Keep Faluröd base intact — village historic core.
          // No override; kind base is already Faluröd for houses.
          break;
        case 'mixed-warm':
          // No strong pull — let wobble + wealth speak.
          break;
        case 'weathered-timber':
          // Aged dark red-brown — rural / agricultural periphery.
          wallColour = tintColour(wallColour, '#6a4a38', 0.30);
          break;
        case 'institutional-plaster':
          // Cool plaster — school / care corridor. Applied later for
          // institutional kinds; here it also applies to residential
          // buildings mixed into that district.
          wallColour = tintColour(wallColour, '#d8d0bc', 0.30);
          break;
        case 'industrial-brick':
          // Faluröd brick — Nygatan / Lokavägen industrial corridor.
          // Residential buildings in this zone lean brick-toned.
          wallColour = tintColour(wallColour, '#8a4232', 0.30);
          break;
      }
    }
  } else if (
    kind === 'apartments' || kind === 'hotel' || kind === 'school' ||
    kind === 'university' || kind === 'train_station'
  ) {
    // Institutional plaster leans a hair cooler and lighter than domestic.
    wallColour = tintColour(wallColour, '#e0dccc', 0.10);
  }

  // ORDER 030 recognisability lift, Tier 1b — per-building override.
  // The fetcher already captures OSM `building:colour` and
  // `roof:colour` tags into RawBuilding.wallColour / roofColour, but the
  // renderer previously ignored them. When set, the OSM tag wins over all
  // palette + wobble + tint logic above. This gives the Vision Owner a
  // per-building recognisability lever: paint an OSM tag, re-run the
  // fetcher, the specific building renders in that colour.
  if (b.wallColour) wallColour = b.wallColour;
  if (b.roofColour) roofColour = b.roofColour;

  const status = BUILDING_STATUS_BY_OSM_ID[b.id];
  if (status) {
    const pal = STATUS_PALETTE[status];
    wallColour = tintColour(base.wall, pal.wall, 0.55);
    roofColour = tintColour(base.roof, pal.roof, 0.35);
  }
  // Prefer OSM `roof:shape` when we have one; fall back to the
  // kind-driven inference. Only unambiguous mappings are honoured
  // (see roofStyleFromOsm); exotic shapes still derive from kind.
  const style = roofStyleFromOsm(b.roofShape) ?? roofStyleFor(kind);
  const profile = profileFor(b, kind);
  // Trim colour = deeper wobble around a near-black base, deterministic
  // per building. Breaks the flat "every ridge cap is #22201c" look that
  // reads as machine-perfect at village zoom.
  const trimBase = tintColour(roofColour, '#0a0906', 0.72);
  const trimColour = wobbleColour(trimBase, hash * 3.13 % 1, 0.14);
  return {
    id: b.id,
    geo,
    wallColour,
    roofColour,
    ridgeCentre: obb.centre,
    ridgeW: obb.w,
    ridgeD: obb.d,
    ridgeAngle: obb.angle,
    height: h,
    roofStyle: style,
    building: b,
    ridgeH: ridgeHeightFor(style, obb.d, profile.pitchMul),
    effectiveKind: kind,
    trimColour,
    profile
  };
}

// One shared unit-size gable prism geometry. Every gable-roofed building
// scales it to its own (rw, rd, rh) via the mesh scale — much cheaper
// than building a fresh BufferGeometry per building.
//
// The prism sits with the eave line on Y = 0, ridge along local +X, base
// spanning local Z from -0.5 to +0.5, apex at Y = 1 above the ridge line.
// A scale of (rw, rh, rd) turns it into the right size for a specific
// building. All face indices are wound so the computed normal points
// outward — meshStandardMaterial with default FrontSide culling then
// renders every face correctly from a camera outside the building.
const UNIT_GABLE_GEO: THREE.BufferGeometry = (() => {
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -0.5, 0, -0.5,   0.5, 0, -0.5,   0.5, 0,  0.5,   -0.5, 0,  0.5,
    -0.5, 1,  0,     0.5, 1,  0
  ]);
  const indices = [
    // Bottom (outward normal -Y). Hidden inside the wall extrusion in
    // practice, but wound correctly so vertex-normal averaging stays clean.
    0, 1, 2,   0, 2, 3,
    // Front pitch (+Z side)
    3, 2, 5,   3, 5, 4,
    // Back pitch (-Z side)
    1, 0, 4,   1, 4, 5,
    // -X gable end
    0, 3, 4,
    // +X gable end
    2, 1, 5
  ];
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
})();

// One shared unit shed prism: same footprint as UNIT_GABLE_GEO but the
// ridge collapses onto the +Z eave, giving a single-slope shed roof.
// Scale (rw, rh, rd) applies as for the gable.
const UNIT_SHED_GEO: THREE.BufferGeometry = (() => {
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -0.5, 0, -0.5,   0.5, 0, -0.5,   0.5, 0,  0.5,   -0.5, 0,  0.5,
    -0.5, 1,  0.5,   0.5, 1,  0.5
  ]);
  const indices = [
    // Bottom (outward -Y)
    0, 1, 2,   0, 2, 3,
    // Top slope (outward +Y, -Z direction)
    0, 4, 5,   0, 5, 1,
    // Front high wall (+Z, closes the shed on the high side)
    3, 2, 5,   3, 5, 4,
    // -X end (triangle)
    0, 3, 4,
    // +X end (triangle)
    1, 5, 2
  ];
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
})();

// One shared unit box for the stone plinth used on residential-scale
// buildings. Positioned inside a group at Y = 0..plinthH, scaled to
// (plinthW, plinthH, plinthD). Kept separate from three.js BoxGeometry
// so all plinths share one geometry allocation across ~200 buildings.
const UNIT_PLINTH_GEO: THREE.BufferGeometry = new THREE.BoxGeometry(1, 1, 1);

// Which building kinds get a low stone plinth around the base. Bergslag
// timber houses very commonly sit on a visible stone or concrete base
// band 0.3–0.5 m tall — omitting it makes procedural houses read as
// timber floating on grass. Sheds, garages and industrial sit directly
// on the ground and are excluded.
const PLINTH_KINDS = new Set([
  'house', 'detached', 'residential', 'apartments',
  'hotel', 'school', 'university', 'train_station',
  'commercial', 'outbuilding'
]);

// Kinds that get the alternating storey shadow band on tall walls.
const STOREY_BAND_KINDS = new Set([
  'apartments', 'hotel', 'school', 'university',
  'residential', 'commercial', 'train_station'
]);

// Roof cap placed on top of the extruded box. Uses shared unit gable
// and shed geometries scaled per building — much cheaper than building a
// fresh BufferGeometry per polygon. Not architecturally exact on
// non-rectangular footprints, but enough for a resident to read gable /
// hip / shed / industrial / flat at village zoom.
function RoofCap({
  id,
  centre,
  ridgeW,
  ridgeD,
  ridgeAngle,
  height,
  ridgeH,
  style,
  roofColour,
  trimColour,
  profile
}: {
  id: string;
  centre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
  height: number;
  ridgeH: number;
  style: Extruded['roofStyle'];
  roofColour: string;
  trimColour: string;
  profile: TypologyProfile;
}) {
  if (style === 'flat') return null;
  const hash = idHash(id);
  // Chimney selection driven by the typology profile — prosperous villas
  // and larger civic buildings pick up a symmetric pair, modest houses
  // stay single. Barns and sheds still skip chimneys entirely.
  const chimneyEligible =
    (style === 'gable' || style === 'hip') && ridgeW > 4;
  const chimneyOn = chimneyEligible && profile.chimneyCount >= 1;
  const twinChimney =
    chimneyEligible && (profile.chimneyCount >= 2 || ridgeW > 14);
  const chimneyOffset = (hash - 0.5) * 0.5;
  // ORDER 021A facade-fidelity fix. Prior code applied a 0.18 m
  // INWARD inset so the roof rendered NARROWER than the walls it
  // covered — the opposite of the Bergslag typology target
  // (0.3–0.6 m outward overhang). Every gable/hip roof consequently
  // read as a lid clipped inside the wall footprint instead of a
  // proper eave. Flat/industrial roofs also drew inside the walls.
  //
  // Corrected: 0.35 m eave overhang for gable + hip + shed + barn;
  // 0 for flat/industrial (they render with a parapet band, not an
  // eave). Overhang applied uniformly in both OBB axes; the roof cap
  // still uses the same shared UNIT_GABLE_GEO scaled up by
  // (ridge + 2·overhang).
  // `flat` returns early above; industrial gets a parapet band with
  // no eave (overhang 0); every other style takes the 0.35 m eave.
  const overhang = style === 'industrial' ? 0 : 0.35;
  const rw = Math.max(1.4, ridgeW + overhang * 2);
  const rd = Math.max(1.4, ridgeD + overhang * 2);

  if (style === 'industrial') {
    return (
      <group
        position={[centre[0], height, centre[1]]}
        rotation={[0, -ridgeAngle, 0]}
      >
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[rw, 0.4, rd]} />
          <meshStandardMaterial color={roofColour} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.65, rd * 0.2]}>
          <boxGeometry args={[rw * 0.86, 0.3, 0.45]} />
          <meshStandardMaterial color="#8a8478" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.65, -rd * 0.2]}>
          <boxGeometry args={[rw * 0.86, 0.3, 0.45]} />
          <meshStandardMaterial color="#8a8478" roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (style === 'hip') {
    const rh = Math.min(1.4, Math.min(rw, rd) * 0.2);
    return (
      <group
        position={[centre[0], height + rh / 2, centre[1]]}
        rotation={[0, -ridgeAngle, 0]}
      >
        <mesh>
          <boxGeometry args={[rw, rh, rd]} />
          <meshStandardMaterial color={roofColour} roughness={0.9} />
        </mesh>
        <mesh position={[0, rh / 2 + 0.02, 0]}>
          <boxGeometry args={[rw * 0.55, 0.05, rd * 0.55]} />
          <meshStandardMaterial color={roofColour} roughness={0.9} />
        </mesh>
        {chimneyOn && (
          <mesh position={[chimneyOffset * rw, rh / 2 + 0.75, 0]}>
            <boxGeometry args={[0.6, 1.5, 0.6]} />
            <meshStandardMaterial color={trimColour} roughness={0.9} />
          </mesh>
        )}
        {twinChimney && (
          <mesh position={[-chimneyOffset * rw, rh / 2 + 0.75, 0]}>
            <boxGeometry args={[0.6, 1.5, 0.6]} />
            <meshStandardMaterial color={trimColour} roughness={0.9} />
          </mesh>
        )}
      </group>
    );
  }
  if (style === 'shed') {
    // Single-slope shed roof — one shared UNIT_SHED_GEO scaled per building.
    return (
      <group
        position={[centre[0], height, centre[1]]}
        rotation={[0, -ridgeAngle, 0]}
      >
        <mesh
          geometry={UNIT_SHED_GEO}
          scale={[rw, ridgeH, rd]}
        >
          <meshStandardMaterial color={roofColour} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (style === 'barn') {
    // Steep double-pitch gable. No chimney (barns typically have none),
    // no fascia strip (Bergslag barns show plain rough eaves), and the
    // ridge cap is subtler than on a house — reads as a distinct
    // agricultural silhouette.
    return (
      <group
        position={[centre[0], height, centre[1]]}
        rotation={[0, -ridgeAngle, 0]}
      >
        <mesh
          geometry={UNIT_GABLE_GEO}
          scale={[rw, ridgeH, rd]}
        >
          <meshStandardMaterial color={roofColour} roughness={0.95} />
        </mesh>
        <mesh position={[0, ridgeH + 0.04, 0]}>
          <boxGeometry args={[rw + 0.1, 0.08, 0.18]} />
          <meshStandardMaterial color={trimColour} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  // Gable: true triangular prism using the shared UNIT_GABLE_GEO.
  // Dormer positions along the ridge axis, centred at the mid-pitch
  // height. Dormers face the +Z pitch (street-side by convention for
  // rectangular polygons). Placed at deterministic offsets so a row
  // of prosperous villas doesn't line up dormers in lockstep.
  const dormerXs: number[] = [];
  if (profile.dormerCount === 1) {
    dormerXs.push(((hash * 2.7) % 1 - 0.5) * rw * 0.35);
  } else if (profile.dormerCount === 2) {
    const spread = rw * 0.28;
    dormerXs.push(-spread, spread);
  }
  return (
    <group
      position={[centre[0], height, centre[1]]}
      rotation={[0, -ridgeAngle, 0]}
    >
      <mesh
        geometry={UNIT_GABLE_GEO}
        scale={[rw, ridgeH, rd]}
      >
        <meshStandardMaterial color={roofColour} roughness={0.9} />
      </mesh>
      {/* Dark ridge cap board along the peak. */}
      <mesh position={[0, ridgeH + 0.06, 0]}>
        <boxGeometry args={[rw, 0.1, 0.22]} />
        <meshStandardMaterial color={trimColour} roughness={0.9} />
      </mesh>
      {/* Dark fascia strip along each eave — reads as gutter shadow at
          strategic zoom and gives every gable a defined roof-wall line. */}
      <mesh position={[0, -0.02, rd * 0.5 - 0.02]}>
        <boxGeometry args={[rw + 0.05, 0.14, 0.06]} />
        <meshStandardMaterial color={trimColour} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, -rd * 0.5 + 0.02]}>
        <boxGeometry args={[rw + 0.05, 0.14, 0.06]} />
        <meshStandardMaterial color={trimColour} roughness={0.9} />
      </mesh>
      {/* Dormers on the +Z pitch for houses whose typology profile
          allows them (standard / prosperous). Small gabled boxes
          sitting on the mid-pitch. */}
      {dormerXs.map((dx, di) => {
        const dormerY = ridgeH * 0.45;
        return (
          <group
            key={`dorm-${di}`}
            position={[dx, dormerY, rd * 0.28]}
          >
            <mesh>
              <boxGeometry args={[1.5, 1.4, 1.4]} />
              <meshStandardMaterial color={roofColour} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.9, 0]}>
              <coneGeometry args={[1.05, 0.9, 4]} />
              <meshStandardMaterial color={roofColour} roughness={0.9} />
            </mesh>
            {/* Dormer window — small cream pane. */}
            <mesh position={[0, 0, 0.71]}>
              <boxGeometry args={[0.7, 0.7, 0.05]} />
              <meshStandardMaterial color="#efe6d4" roughness={0.7} />
            </mesh>
          </group>
        );
      })}
      {chimneyOn && (
        <mesh position={[chimneyOffset * rw, ridgeH + 0.85, 0]}>
          <boxGeometry args={[0.55, 1.7, 0.55]} />
          <meshStandardMaterial color={trimColour} roughness={0.9} />
        </mesh>
      )}
      {twinChimney && (
        <mesh position={[-chimneyOffset * rw, ridgeH + 0.85, 0]}>
          <boxGeometry args={[0.55, 1.7, 0.55]} />
          <meshStandardMaterial color={trimColour} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

// Vertical cream corner boards on the four OBB corners of a building.
// One of the most distinctive Bergslag painted-timber house details;
// added per typology profile so only ~70 % of eligible houses get
// them, breaking the "every house has the exact same trim" look.
function Cornerboards({
  centre,
  ridgeW,
  ridgeD,
  ridgeAngle,
  height,
  trimColour
}: {
  centre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
  height: number;
  trimColour: string;
}) {
  const inset = 0.02;
  const halfW = ridgeW / 2 - inset;
  const halfD = ridgeD / 2 - inset;
  const barW = 0.25;
  return (
    <group
      position={[centre[0], height / 2, centre[1]]}
      rotation={[0, -ridgeAngle, 0]}
    >
      {([[-1, -1], [-1, 1], [1, -1], [1, 1]] as const).map(
        ([sx, sz], i) => (
          <mesh
            key={`cb-${i}`}
            position={[sx * halfW, 0, sz * halfD]}
          >
            <boxGeometry args={[barW, height, barW]} />
            <meshStandardMaterial color="#efe6d4" roughness={0.85} />
          </mesh>
        )
      )}
      {/* Trim strip at the wall top → roof line, hides the join. */}
      <mesh position={[0, height / 2 - 0.08, halfD - 0.02]}>
        <boxGeometry args={[ridgeW * 0.98, 0.16, 0.04]} />
        <meshStandardMaterial color={trimColour} roughness={0.9} />
      </mesh>
      <mesh position={[0, height / 2 - 0.08, -halfD + 0.02]}>
        <boxGeometry args={[ridgeW * 0.98, 0.16, 0.04]} />
        <meshStandardMaterial color={trimColour} roughness={0.9} />
      </mesh>
    </group>
  );
}

// Small entrance marker on the +Z facade of residential-scale buildings.
// One dark door box, optional cream lintel — reads as "the front door"
// at close zoom without inventing a full porch. Skipped when the OBB
// short axis is too small (long-thin buildings likely enter on the end).
function EntranceMarker({
  centre,
  ridgeW,
  ridgeD,
  ridgeAngle,
  trimColour,
  hash
}: {
  centre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
  trimColour: string;
  hash: number;
}) {
  if (ridgeW < 4 || ridgeD < 3.5) return null;
  const doorX = ((hash * 4.71) % 1 - 0.5) * ridgeW * 0.4;
  // ORDER 021A facade-fidelity fix. Before this the door mesh sat at
  // Y=1.4 (bottom 0.10 m) which is buried inside the 0.32–0.65 m
  // plinth AND behind the wall face (depth 0.06 m at Z=ridgeD/2−0.02
  // put 5 cm of the door inside the wall). Doors read as "floating or
  // not on ground" per the Vision Owner reference.
  //
  // Corrected geometry:
  //   - Step is 0.30 m tall sitting on the ground beside the plinth,
  //     projecting 0.5 m from the facade so the door has a real
  //     ground-level threshold to stand on.
  //   - Door base sits ON the step top (Y=0.30). Door height 2.05 m,
  //     centre Y = 0.30 + 1.025 = 1.325. Standard Swedish domestic
  //     entrance proportions.
  //   - Door pushed 0.04 m OUT from the wall face so its full depth
  //     (0.08 m) reads as attached, not embedded.
  const STEP_H = 0.30;
  const STEP_DEPTH = 0.5;
  const DOOR_H = 2.05;
  const DOOR_W = 1.0;
  const DOOR_D = 0.08;
  const DOOR_CENTRE_Y = STEP_H + DOOR_H / 2;   // 1.325
  const DOOR_FRONT_Z = ridgeD / 2 + DOOR_D / 2;   // door sits proud of wall
  const LINTEL_H = 0.14;
  const LINTEL_CENTRE_Y = STEP_H + DOOR_H + LINTEL_H / 2;
  return (
    <group
      position={[centre[0], 0, centre[1]]}
      rotation={[0, -ridgeAngle, 0]}
    >
      {/* Grounded step — 30 cm tall, projects 0.5 m from the facade. */}
      <mesh position={[doorX, STEP_H / 2, ridgeD / 2 + STEP_DEPTH / 2]}>
        <boxGeometry args={[1.4, STEP_H, STEP_DEPTH]} />
        <meshStandardMaterial color="#8a8078" roughness={0.95} />
      </mesh>
      {/* Door — bottom on the step top, centre pushed clear of the wall. */}
      <mesh position={[doorX, DOOR_CENTRE_Y, DOOR_FRONT_Z]}>
        <boxGeometry args={[DOOR_W, DOOR_H, DOOR_D]} />
        <meshStandardMaterial color="#3a2b22" roughness={0.85} />
      </mesh>
      {/* Cream lintel immediately above the door. */}
      <mesh position={[doorX, LINTEL_CENTRE_Y, DOOR_FRONT_Z]}>
        <boxGeometry args={[1.2, LINTEL_H, 0.05]} />
        <meshStandardMaterial color="#efe6d4" roughness={0.85} />
      </mesh>
      {/* Small warm door lantern to the right of the door head. */}
      <mesh position={[doorX + 0.75, LINTEL_CENTRE_Y - 0.25, DOOR_FRONT_Z + 0.05]}>
        <boxGeometry args={[0.2, 0.35, 0.2]} />
        <meshStandardMaterial
          color="#f4e6cf"
          emissive="#f4c680"
          emissiveIntensity={0.35}
          roughness={0.55}
        />
      </mesh>
      {/* Trim strip just above the lintel — belongs to the wall/roof
          junction band; kept as a subtle rhythm cue. */}
      <mesh position={[doorX, LINTEL_CENTRE_Y + LINTEL_H / 2 + 0.06, DOOR_FRONT_Z - 0.02]}>
        <boxGeometry args={[1.5, 0.06, 0.03]} />
        <meshStandardMaterial color={trimColour} roughness={0.9} />
      </mesh>
    </group>
  );
}

// A low stone base band around the wall of residential-scale buildings.
// Rendered as a slightly inset OBB-aligned box so it never pokes out
// beyond the wall on irregular polygons. Wall material overlaps the top
// of the plinth — the visible band is only the small height difference.
function BuildingPlinth({
  centre,
  ridgeW,
  ridgeD,
  ridgeAngle,
  wealth
}: {
  centre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
  wealth: WealthTier;
}) {
  // Modest houses sit on a shorter plinth; prosperous villas on a
  // taller, more visible stone base. Civic / commercial kinds default
  // to standard.
  const H = wealth === 'prosperous' ? 0.65 : wealth === 'modest' ? 0.32 : 0.42;
  // Inset slightly so the plinth sits inside the wall footprint even on
  // irregular polygons. The wall extrusion covers the plinth top face.
  const inset = 0.35;
  const pw = Math.max(1.0, ridgeW - inset * 2);
  const pd = Math.max(1.0, ridgeD - inset * 2);
  const colour = wealth === 'prosperous' ? '#948e82' : '#8a8478';
  return (
    <mesh
      geometry={UNIT_PLINTH_GEO}
      position={[centre[0], H / 2, centre[1]]}
      rotation={[0, -ridgeAngle, 0]}
      scale={[pw + inset * 2 + 0.1, H, pd + inset * 2 + 0.1]}
    >
      <meshStandardMaterial color={colour} roughness={0.95} />
    </mesh>
  );
}

// A subtle darker horizontal band around a tall building at the storey
// break, so a five-storey apartment block reads as five storeys rather
// than one tall box. Deterministic placement (~3 m per storey), inset
// slightly so it doesn't overshoot irregular polygons.
function StoreyBands({
  centre,
  ridgeW,
  ridgeD,
  ridgeAngle,
  height,
  wallColour
}: {
  centre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
  height: number;
  wallColour: string;
}) {
  const inset = 0.25;
  const bw = Math.max(1.0, ridgeW - inset * 2 + 0.05);
  const bd = Math.max(1.0, ridgeD - inset * 2 + 0.05);
  // Bands at 3 m, 6 m, 9 m — up to the wall height. Skip if too close
  // to top (< 1.2 m from roof) to leave room for the eave.
  const bandYs: number[] = [];
  for (let y = 3.0; y < height - 1.2; y += 3.0) bandYs.push(y);
  if (bandYs.length === 0) return null;
  // A darker version of the wall colour so the band reads as shadow.
  // ORDER 054 Del D — near-black tint instead of pure #000000 for
  // the tint mix. Nothing in reality is pure black; a deep shadow
  // still carries scene tone.
  const bandColour = tintColour(wallColour, '#141210', 0.35);
  return (
    <>
      {bandYs.map((y, i) => (
        <mesh
          key={`sb-${i}`}
          geometry={UNIT_PLINTH_GEO}
          position={[centre[0], y, centre[1]]}
          rotation={[0, -ridgeAngle, 0]}
          scale={[bw, 0.12, bd]}
        >
          <meshStandardMaterial color={bandColour} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

// Which effective kinds get a rhythmic procedural window grid on the
// OBB faces. Shed / garage / barn / industrial / flat all stay blank —
// their walls read as agricultural / utility surfaces where added
// windows would look wrong at village and district zoom.
const WINDOW_KINDS = new Set([
  'house', 'detached', 'residential', 'apartments',
  'hotel', 'school', 'university', 'train_station',
  'commercial'
]);

// Compute world-space instances of procedural windows on the four OBB
// faces of a building. Windows sit ~0.03 m inside the wall so they
// depth-write above the wall face without z-fighting. Reasonable bay
// and storey counts per OBB extent — no exhaustive per-vertex.
function windowsFor(b: Extruded): Array<{
  pos: [number, number, number];
  rotY: number;
  w: number;
  h: number;
}> {
  const wallH = b.height;
  // ORDER 021A facade-fidelity fix. Prior storey-Y formula placed the
  // ground-floor window at Y=0.90 (below the 0.32–0.65 m plinth) and
  // the top-floor window at Y = wallH − 0.30 (poking through the roof
  // ridge for 2+ storey buildings). Corrected algorithm:
  //   1. Budget the usable wall span as `wallH − plinthH` where
  //      plinthH matches the wealth-tier plinth added by BuildingPlinth.
  //   2. Storey count preferrs OSM `building:levels` if present,
  //      otherwise floor(usable/2.7) — Bergslag domestic storeys are
  //      2.4–2.7 m floor-to-floor, hence the 2.7 default.
  //   3. Storeys evenly divide the usable span (accommodates 4.5 m
  //      one-storey houses through 12 m four-storey apartments).
  //   4. Window centre sits at each storey's midpoint. With winH=1.35
  //      the sill lands at ~0.6 m above each floor — a typical
  //      Bergslag sill height, comfortably above any plinth band.
  const plinthH =
    b.profile.wealth === 'prosperous' ? 0.65 :
    b.profile.wealth === 'modest' ? 0.32 : 0.42;
  const storeyH = 2.7;
  const usableH = Math.max(1.8, wallH - plinthH);
  const wallLevels =
    b.building.buildingLevels != null &&
    b.building.buildingLevels >= 1 &&
    b.building.buildingLevels < 6
      ? b.building.buildingLevels
      : Math.max(1, Math.min(4, Math.floor(usableH / (storeyH * 0.9))));
  const storeys = wallLevels;
  const storeySpan = usableH / storeys;
  const storeyYs: number[] = [];
  for (let s = 0; s < storeys; s++) {
    storeyYs.push(plinthH + (s + 0.5) * storeySpan);
  }
  // Bay counts per side scale with the OBB extent.
  const rw = b.ridgeW;
  const rd = b.ridgeD;
  const longBays = Math.max(2, Math.min(8, Math.round(rw / 3.2)));
  const shortBays = Math.max(1, Math.min(4, Math.round(rd / 3.2)));
  const longSpan = rw - 1.8;
  const shortSpan = rd - 1.8;
  const longXs: number[] = [];
  for (let i = 0; i < longBays; i++) {
    longXs.push(-longSpan / 2 + (i * longSpan) / Math.max(1, longBays - 1));
  }
  const shortZs: number[] = [];
  for (let i = 0; i < shortBays; i++) {
    shortZs.push(-shortSpan / 2 + (i * shortSpan) / Math.max(1, shortBays - 1));
  }
  const angle = -b.ridgeAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = b.ridgeCentre[0];
  const cz = b.ridgeCentre[1];
  const halfD = rd / 2 - 0.03;
  const halfW = rw / 2 - 0.03;
  const out: Array<{ pos: [number, number, number]; rotY: number; w: number; h: number }> = [];
  const winW = 0.95;
  const winH = 1.35;

  const project = (lx: number, ly: number, lz: number): [number, number, number] => {
    const wx = cx + lx * cos - lz * sin;
    const wz = cz + lx * sin + lz * cos;
    return [wx, ly, wz];
  };

  // ORDER 132 — polygon-guard. Fönster-XZ som faller utanför byggnadens
  // faktiska footprint kasseras. ORDER 130 mätte 3 156 fönster som hängde
  // upp till 36 m från fasaden på 297 av 338 hus (88 %) — orsaken var
  // att positionerna beräknas från OBB-facen (`ridgeW`/`ridgeD`), inte
  // från polygonens kanter. Icke-rektangulära hus har OBB-face som
  // sticker ut i luften.
  //
  // `buildFacade` (LOD 0/1) undviker felet strukturellt genom att
  // iterera polygonens kanter direkt (ORDER 058 §1); här (LOD 2)
  // behåller vi OBB-iterationen och drop:ar utfallen efteråt.
  // Projicering till närmaste kant hade varit ett annat val — den
  // vägen väljs inte förrän det finns skäl att inte kassera, och
  // ORDER 132 §2 säger "uppfinn ingen ny strategi".
  const poly = b.building.poly;
  const inFootprint = (pos: [number, number, number]): boolean =>
    inside(poly, pos[0], pos[2]);

  for (const y of storeyYs) {
    // Long +Z face (outward +Z in local frame → world rotY = angle)
    for (const lx of longXs) {
      const p = project(lx, y, halfD);
      if (inFootprint(p)) out.push({ pos: p, rotY: angle, w: winW, h: winH });
    }
    // Long -Z face
    for (const lx of longXs) {
      const p = project(lx, y, -halfD);
      if (inFootprint(p)) out.push({ pos: p, rotY: angle + Math.PI, w: winW, h: winH });
    }
    // Short +X face
    for (const lz of shortZs) {
      const p = project(halfW, y, lz);
      if (inFootprint(p)) out.push({ pos: p, rotY: angle - Math.PI / 2, w: winW, h: winH });
    }
    // Short -X face
    for (const lz of shortZs) {
      const p = project(-halfW, y, lz);
      if (inFootprint(p)) out.push({ pos: p, rotY: angle + Math.PI / 2, w: winW, h: winH });
    }
  }
  return out;
}

export function OsmBuildings() {
  const buildings = useMemo(
    () =>
      WORLD.buildings
        .filter((b) => !LANDMARK_BUILDING_IDS.has(b.id))
        .filter((b) => b.kind !== 'church')
        // ORDER 056 Del F — buildings owned by ProceduralFacades render
        // through the parametric generator (LOD 0/1) or fall through to
        // this box (LOD 2) via visibility switching on the procedural
        // group. Either way the OSM box shouldn't compete for pixels
        // at the same position — skip them here.
        .filter((b) => !SKIP_PROCEDURAL_IDS.has(b.id))
        .map(toExtruded)
        .filter((b): b is Extruded => b !== null),
    []
  );

  // Aggregate every window across every eligible building into one flat
  // list, rendered via a single drei Instances call — one draw call for
  // the entire village window population instead of one mesh per pane.
  const windows = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; rotY: number; w: number; h: number }> = [];
    for (const b of buildings) {
      const kind = b.effectiveKind;
      const inWindowSet = WINDOW_KINDS.has(kind);
      // ORDER 032 — historic red-brick industrial buildings show sparse
      // rectangular windows in Vision Owner Street View shots
      // (Nygatan / Prästgatan 10 / Swedecote area). Include industrial
      // + warehouse when a Vision Owner colour override exists OR the
      // building is tall enough to read as a multi-storey industrial
      // (buildingLevels ≥ 2) rather than a single-storey shed.
      const isMultiStoreyIndustrial =
        (kind === 'industrial' || kind === 'warehouse') &&
        (b.building.wallColour != null || (b.building.buildingLevels ?? 0) >= 2);
      if (!inWindowSet && !isMultiStoreyIndustrial) continue;
      for (const w of windowsFor(b)) out.push(w);
    }
    return out;
  }, [buildings]);

  return (
    <group>
      {buildings.map((b) => {
        const hasPlinth = PLINTH_KINDS.has(b.effectiveKind);
        const hasStoreyBands =
          STOREY_BAND_KINDS.has(b.effectiveKind) && b.height > 6.5;
        const hasCornerboards =
          b.profile.hasCornerboards &&
          (b.effectiveKind === 'house' ||
            b.effectiveKind === 'detached' ||
            b.effectiveKind === 'residential' ||
            b.effectiveKind === 'outbuilding' ||
            b.effectiveKind === 'commercial');
        const hasEntrance =
          b.effectiveKind === 'house' ||
          b.effectiveKind === 'detached' ||
          b.effectiveKind === 'residential' ||
          b.effectiveKind === 'commercial';
        const bhash = idHash(b.id + ':entry');
        return (
          <group key={b.id}>
            {hasPlinth && (
              <BuildingPlinth
                centre={b.ridgeCentre}
                ridgeW={b.ridgeW}
                ridgeD={b.ridgeD}
                ridgeAngle={b.ridgeAngle}
                wealth={b.profile.wealth}
              />
            )}
            <mesh geometry={b.geo}>
              <meshStandardMaterial color={b.wallColour} roughness={0.9} />
            </mesh>
            {hasStoreyBands && (
              <StoreyBands
                centre={b.ridgeCentre}
                ridgeW={b.ridgeW}
                ridgeD={b.ridgeD}
                ridgeAngle={b.ridgeAngle}
                height={b.height}
                wallColour={b.wallColour}
              />
            )}
            {hasCornerboards && (
              <Cornerboards
                centre={b.ridgeCentre}
                ridgeW={b.ridgeW}
                ridgeD={b.ridgeD}
                ridgeAngle={b.ridgeAngle}
                height={b.height}
                trimColour={b.trimColour}
              />
            )}
            {hasEntrance && (
              <EntranceMarker
                centre={b.ridgeCentre}
                ridgeW={b.ridgeW}
                ridgeD={b.ridgeD}
                ridgeAngle={b.ridgeAngle}
                trimColour={b.trimColour}
                hash={bhash}
              />
            )}
            <RoofCap
              id={b.id}
              centre={b.ridgeCentre}
              ridgeW={b.ridgeW}
              ridgeD={b.ridgeD}
              ridgeAngle={b.ridgeAngle}
              height={b.height}
              ridgeH={b.ridgeH}
              style={b.roofStyle}
              roofColour={b.roofColour}
              trimColour={b.trimColour}
              profile={b.profile}
            />
          </group>
        );
      })}
      {/* Procedural window rhythm — one Instances draw call for the
          entire village. Windows are small emissive rectangles pinned
          just proud of the OBB wall face. Legible from village zoom as
          a horizontal band and readable as individual panes at close
          zoom without the earlier blank-slab feel. */}
      {windows.length > 0 && (
        <Instances limit={windows.length} range={windows.length}>
          <boxGeometry args={[0.95, 1.35, 0.06]} />
          <meshStandardMaterial
            color="#efe6d4"
            emissive="#f4c680"
            emissiveIntensity={0.14}
            roughness={0.65}
          />
          {windows.map((w, i) => (
            <Instance
              key={i}
              position={w.pos}
              rotation={[0, w.rotY, 0]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
