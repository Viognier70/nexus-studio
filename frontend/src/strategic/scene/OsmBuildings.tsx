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
  roofStyle: 'flat' | 'gable' | 'hip' | 'industrial' | 'shed';
  building: RawBuilding;
  ridgeH: number;         // computed roof height (peak above the eaves)
  effectiveKind: string;  // after any 'yes' → shed/garage/small-commercial reclassify
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
  outbuilding: { wall: '#b8a68a', roof: '#4a4136' } // generic small building
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
// gable; unknown 'yes' still stays flat so we don't fake detail on
// polygons we know nothing about.
function roofStyleFor(kind: string): Extruded['roofStyle'] {
  if (kind === 'house' || kind === 'detached') return 'gable';
  if (kind === 'residential') return 'gable';
  if (kind === 'apartments' || kind === 'hotel' || kind === 'school') return 'hip';
  if (kind === 'industrial') return 'industrial';
  if (kind === 'shed') return 'shed';
  if (kind === 'garage') return 'gable';
  if (kind === 'outbuilding') return 'gable';
  if (kind === 'commercial') return 'gable';
  return 'flat';
}

// Roof pitch (ridge height above the eave) per style. Kept moderate so
// procedural silhouettes read at village zoom without towering over the
// handcrafted District 1 landmarks.
function ridgeHeightFor(style: Extruded['roofStyle'], rd: number): number {
  if (style === 'flat' || style === 'industrial') return 0;
  if (style === 'gable') return Math.min(2.4, rd * 0.32);
  if (style === 'hip') return Math.min(1.6, rd * 0.22);
  if (style === 'shed') return Math.min(1.2, rd * 0.18);
  return 0;
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
  const kind = effectiveKindFor(b);
  const h = heightFor(b, kind);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  const base = KIND_COLOUR[kind] ?? DEFAULT_COLOUR;
  const hash = idHash(b.id);
  // Per-building wobble first, so status tint (if any) still dominates the
  // signal on curated commercial polygons.
  let wallColour = wobbleColour(base.wall, hash, 0.08);
  let roofColour = wobbleColour(base.roof, hash, 0.06);
  const status = BUILDING_STATUS_BY_OSM_ID[b.id];
  if (status) {
    const pal = STATUS_PALETTE[status];
    wallColour = tintColour(base.wall, pal.wall, 0.55);
    roofColour = tintColour(base.roof, pal.roof, 0.35);
  }
  const obb = orientedBbox(b.poly);
  const style = roofStyleFor(kind);
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
    effectiveKind: kind
  };
}

// One shared unit-size gable prism geometry. Every gable-roofed building
// scales it to its own (rw, rd, rh) via the mesh scale — much cheaper
// than building a fresh BufferGeometry per building.
//
// The prism sits with the eave line on Y = 0, ridge along local +X, base
// spanning local Z from -0.5 to +0.5, apex at Y = 1 above the ridge line.
// A scale of (rw, rh, rd) turns it into the right size for a specific
// building.
const UNIT_GABLE_GEO: THREE.BufferGeometry = (() => {
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array([
    // bottom rect
    -0.5, 0, -0.5,   0.5, 0, -0.5,   0.5, 0,  0.5,   -0.5, 0,  0.5,
    // ridge line
    -0.5, 1,  0,     0.5, 1,  0
  ]);
  // Indices, wound CCW when viewed from outside.
  const indices = [
    // Bottom (viewed from below → keep CCW so it also draws with
    // DoubleSide if we ever swap materials)
    0, 2, 1,    0, 3, 2,
    // Front pitch (+Z side): v3, v2, v5, v4 → tris (3,2,5) & (3,5,4)
    3, 2, 5,    3, 5, 4,
    // Back pitch (-Z side): v1, v0, v4, v5 → (1,0,4) & (1,4,5)
    1, 0, 4,    1, 4, 5,
    // -X gable end: v0, v3, v4
    0, 3, 4,
    // +X gable end: v2, v1, v5
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
    // bottom rect
    -0.5, 0, -0.5,   0.5, 0, -0.5,   0.5, 0,  0.5,   -0.5, 0,  0.5,
    // high edge (over the +Z side)
    -0.5, 1,  0.5,   0.5, 1,  0.5
  ]);
  const indices = [
    // bottom
    0, 2, 1,    0, 3, 2,
    // top slope (single face, from v0,v1 up to v4,v5)
    // vertices: 0, 1 at Y=0 (Z=-0.5), 4, 5 at Y=1 (Z=+0.5)
    // slope quad: 0, 1, 5, 4 → tris (0,1,5) & (0,5,4)
    0, 1, 5,    0, 5, 4,
    // -X gable/end: v0, v4, v3
    0, 4, 3,
    // +X gable/end: v1, v2, v5
    1, 2, 5,
    // front high wall (+Z side, closes the shed): v3, v4, v5, v2 → (3,4,5)&(3,5,2)
    3, 4, 5,    3, 5, 2,
    // back wall (-Z, closes it below the eaves) is degenerate — Y=0 on both
    // v0,v1 — no separate face needed.
  ];
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
})();

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
  roofColour
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
}) {
  if (style === 'flat') return null;
  const hash = idHash(id);
  // Deterministic chimney placement per building. A single soot-black
  // stack on gabled/hipped roofs breaks the uniform silhouette that
  // makes procedural residential blocks read as identical boxes. Skipped
  // for very small buildings where a chimney would overpower.
  const chimneyOn =
    (style === 'gable' || style === 'hip') && ridgeW > 4 && hash > 0.35;
  const chimneyOffset = (hash - 0.5) * 0.5;
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
            <meshStandardMaterial color="#2a251f" roughness={0.9} />
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
        <meshStandardMaterial color="#22201c" roughness={0.9} />
      </mesh>
      {chimneyOn && (
        <mesh position={[chimneyOffset * rw, ridgeH + 0.85, 0]}>
          <boxGeometry args={[0.55, 1.7, 0.55]} />
          <meshStandardMaterial color="#2a251f" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
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

  return (
    <group>
      {buildings.map((b) => (
        <group key={b.id}>
          <mesh geometry={b.geo}>
            <meshStandardMaterial color={b.wallColour} roughness={0.9} />
          </mesh>
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
          />
        </group>
      ))}
    </group>
  );
}
