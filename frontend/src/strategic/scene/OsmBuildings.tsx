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
  barn: { wall: '#6a3226', roof: '#312622' }
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
// stands at exactly the same height.
function heightFor(b: RawBuilding, kind: string): number {
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
// steeper — a defining Bergslag barn silhouette.
function ridgeHeightFor(style: Extruded['roofStyle'], rd: number): number {
  if (style === 'flat' || style === 'industrial') return 0;
  if (style === 'gable') return Math.min(2.4, rd * 0.32);
  if (style === 'barn') return Math.min(3.6, rd * 0.5);
  if (style === 'hip') return Math.min(1.6, rd * 0.22);
  if (style === 'shed') return Math.min(1.2, rd * 0.18);
  return 0;
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
  const shape = new THREE.Shape();
  shape.moveTo(b.poly[0][0], b.poly[0][1]);
  for (let i = 1; i < b.poly.length; i++)
    shape.lineTo(b.poly[i][0], b.poly[i][1]);
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

  const status = BUILDING_STATUS_BY_OSM_ID[b.id];
  if (status) {
    const pal = STATUS_PALETTE[status];
    wallColour = tintColour(base.wall, pal.wall, 0.55);
    roofColour = tintColour(base.roof, pal.roof, 0.35);
  }
  const style = roofStyleFor(kind);
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
    ridgeH: ridgeHeightFor(style, obb.d),
    effectiveKind: kind,
    trimColour
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
  trimColour
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
}) {
  if (style === 'flat') return null;
  const hash = idHash(id);
  // Deterministic chimney placement per building. A single soot-black
  // stack on gabled/hipped roofs breaks the uniform silhouette that
  // makes procedural residential blocks read as identical boxes. Skipped
  // for very small buildings where a chimney would overpower. Larger
  // buildings (ridgeW > 12 m) get a second symmetric chimney — the
  // manor / long-house typology visible across the region.
  const chimneyOn =
    (style === 'gable' || style === 'hip') && ridgeW > 4 && hash > 0.35;
  const chimneyOffset = (hash - 0.5) * 0.5;
  const twinChimney =
    (style === 'gable' || style === 'hip') && ridgeW > 12 && hash > 0.5;
  // A small inset so the roof cap doesn't hang over the walls.
  const inset = 0.25;
  const rw = Math.max(1.4, ridgeW - inset * 2);
  const rd = Math.max(1.4, ridgeD - inset * 2);

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

// A low stone base band around the wall of residential-scale buildings.
// Rendered as a slightly inset OBB-aligned box so it never pokes out
// beyond the wall on irregular polygons. Wall material overlaps the top
// of the plinth — the visible band is only the small height difference.
function BuildingPlinth({
  centre,
  ridgeW,
  ridgeD,
  ridgeAngle
}: {
  centre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
}) {
  const H = 0.4;
  // Inset slightly so the plinth sits inside the wall footprint even on
  // irregular polygons. The wall extrusion covers the plinth top face.
  const inset = 0.35;
  const pw = Math.max(1.0, ridgeW - inset * 2);
  const pd = Math.max(1.0, ridgeD - inset * 2);
  return (
    <mesh
      geometry={UNIT_PLINTH_GEO}
      position={[centre[0], H / 2, centre[1]]}
      rotation={[0, -ridgeAngle, 0]}
      scale={[pw + inset * 2 + 0.1, H, pd + inset * 2 + 0.1]}
    >
      <meshStandardMaterial color="#8a8478" roughness={0.95} />
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
  const bandColour = tintColour(wallColour, '#000000', 0.35);
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
  const storeyH = 3.0;
  const storeys = Math.max(1, Math.min(4, Math.round(wallH / storeyH)));
  // Storey mid-Y positions from ground upward. First storey a bit lower
  // than mid to sit above the plinth; upper storeys evenly spaced.
  const storeyYs: number[] = [];
  for (let s = 0; s < storeys; s++) {
    storeyYs.push(0.9 + s * (wallH - 1.2) / Math.max(1, storeys - 1) * (storeys > 1 ? 1 : 0) + (storeys === 1 ? wallH * 0.4 : 0));
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

  for (const y of storeyYs) {
    // Long +Z face (outward +Z in local frame → world rotY = angle)
    for (const lx of longXs) {
      out.push({ pos: project(lx, y, halfD), rotY: angle, w: winW, h: winH });
    }
    // Long -Z face
    for (const lx of longXs) {
      out.push({ pos: project(lx, y, -halfD), rotY: angle + Math.PI, w: winW, h: winH });
    }
    // Short +X face
    for (const lz of shortZs) {
      out.push({ pos: project(halfW, y, lz), rotY: angle - Math.PI / 2, w: winW, h: winH });
    }
    // Short -X face
    for (const lz of shortZs) {
      out.push({ pos: project(-halfW, y, lz), rotY: angle + Math.PI / 2, w: winW, h: winH });
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
      if (!WINDOW_KINDS.has(b.effectiveKind)) continue;
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
        return (
          <group key={b.id}>
            {hasPlinth && (
              <BuildingPlinth
                centre={b.ridgeCentre}
                ridgeW={b.ridgeW}
                ridgeD={b.ridgeD}
                ridgeAngle={b.ridgeAngle}
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
