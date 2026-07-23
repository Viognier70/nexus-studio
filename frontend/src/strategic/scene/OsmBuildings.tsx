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
  roofStyle: 'flat' | 'gable' | 'hip' | 'industrial';
  building: RawBuilding;
}

// Base palette per building kind. Subdued Scandinavian tones with enough
// variation for silhouettes to read at village zoom.
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
  yes: { wall: '#b8ac96', roof: '#4a4136' }
};

const DEFAULT_COLOUR = { wall: '#a89e88', roof: '#4a4136' };

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
function heightFor(b: RawBuilding): number {
  const k = b.kind ?? 'yes';
  let base: number;
  if (k === 'university') base = 9;
  else if (k === 'hotel') base = 8;
  else if (k === 'apartments') base = 8.5;
  else if (k === 'commercial') base = 6;
  else if (k === 'train_station') base = 6;
  else if (k === 'school') base = 8;
  else if (k === 'industrial') base = 7;
  else if (k === 'house' || k === 'detached') base = 4.5;
  else if (k === 'residential') base = 6.5;
  else base = 5;
  const wobble = (idHash(b.id) - 0.5) * 0.24; // ±12%
  return base * (1 + wobble);
}

// Which roof style suits which kind. Houses / detached get gables; larger
// residential and civic blocks get hipped roofs; industrial gets a flat,
// vented look; unknown 'yes' buildings stay flat so we don't fake detail.
function roofStyleFor(b: RawBuilding): Extruded['roofStyle'] {
  const k = b.kind ?? 'yes';
  if (k === 'house' || k === 'detached') return 'gable';
  if (k === 'residential') return 'gable';
  if (k === 'apartments' || k === 'hotel' || k === 'school') return 'hip';
  if (k === 'industrial') return 'industrial';
  return 'flat';
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
  const h = heightFor(b);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  const kind = b.kind ?? 'yes';
  const base = KIND_COLOUR[kind] ?? DEFAULT_COLOUR;
  let wallColour = base.wall;
  let roofColour = base.roof;
  const status = BUILDING_STATUS_BY_OSM_ID[b.id];
  if (status) {
    const pal = STATUS_PALETTE[status];
    wallColour = tintColour(base.wall, pal.wall, 0.55);
    roofColour = tintColour(base.roof, pal.roof, 0.35);
  }
  const obb = orientedBbox(b.poly);
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
    roofStyle: roofStyleFor(b),
    building: b
  };
}

// Little pitched roof placed on top of the extruded box. Shrunk by a small
// inset so it never fights the extrusion edges. Not architecturally exact
// on non-rectangular footprints, but enough for a resident to read gable
// vs. hipped vs. flat at village zoom.
function RoofCap({
  id,
  centre,
  ridgeW,
  ridgeD,
  ridgeAngle,
  height,
  style,
  roofColour
}: {
  id: string;
  centre: [number, number];
  ridgeW: number;
  ridgeD: number;
  ridgeAngle: number;
  height: number;
  style: Extruded['roofStyle'];
  roofColour: string;
}) {
  if (style === 'flat') return null;
  // Deterministic chimney placement per building. A single soot-black
  // stack on gabled/hipped roofs breaks the uniform silhouette that
  // makes procedural residential blocks read as identical boxes. Skipped
  // for very small buildings where a chimney would overpower.
  const hash = idHash(id);
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
  // Gable: low ridge across the shorter dimension.
  const rh = Math.min(1.6, Math.min(rw, rd) * 0.28);
  return (
    <group
      position={[centre[0], height, centre[1]]}
      rotation={[0, -ridgeAngle, 0]}
    >
      <mesh position={[0, rh / 2, 0]}>
        <boxGeometry args={[rw, rh, rd]} />
        <meshStandardMaterial color={roofColour} roughness={0.9} />
      </mesh>
      <mesh position={[0, rh + 0.06, 0]}>
        <boxGeometry args={[rw, 0.1, 0.22]} />
        <meshStandardMaterial color="#22201c" roughness={0.9} />
      </mesh>
      {chimneyOn && (
        <mesh position={[chimneyOffset * rw, rh + 0.85, 0]}>
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
            style={b.roofStyle}
            roofColour={b.roofColour}
          />
        </group>
      ))}
    </group>
  );
}
