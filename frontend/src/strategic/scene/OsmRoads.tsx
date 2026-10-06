import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_Y } from '../content/world';
import type { RawRoad } from '../content/world';
import { specFor, type RoadRole } from '../content/roadRoles';
import { roadRenderPieces } from '../content/roadSurface';

// Y-level for the sidewalk layer — a hair below the road plane so major
// roads still win the middle at intersections, but enough separation to
// avoid z-fighting at strategic-zoom depth precision (~10 cm at 1800 m).
const SIDEWALK_Y = 0.38;
const SIDEWALK_COLOUR = '#b8ac96';    // pale limestone
const KERB_COLOUR = '#4a463f';         // dark granite kerb
const STRIPE_COLOUR = '#d0c7ae';       // muted road-marking cream
const EDGE_LINE_COLOUR = '#c9c0a5';    // slightly cooler edge line

// Vehicle-tier Y offsets. Primary (Rv 244) wins every intersection;
// main (Rv 205 and other secondaries) sit just under; secondary +
// local + base stack below in order.
const TIER_Y: Record<'primary' | 'main' | 'secondary' | 'local' | 'base', number> = {
  base: GROUND_Y.roads,
  local: GROUND_Y.roads + 0.01,
  secondary: GROUND_Y.roads + 0.02,
  main: GROUND_Y.roads + 0.03,
  primary: GROUND_Y.roads + 0.04
};
const MARKING_Y_OFFSET = 0.02;

// Build a two-sided strip of `2 * half` metres centred on the road
// polyline. Used for the carriageway, sidewalk envelope and kerb strips.
function buildRoadShape(road: RawRoad, half: number): THREE.Shape | null {
  if (road.poly.length < 2) return null;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < road.poly.length; i++) {
    const p = road.poly[i];
    const prev = road.poly[Math.max(0, i - 1)];
    const next = road.poly[Math.min(road.poly.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    left.push([p[0] + nx * half, p[1] + nz * half]);
    right.push([p[0] - nx * half, p[1] - nz * half]);
  }
  // ORDER 020 transform-parity fix: negate Y so the road envelope lands
  // at world Z = +OSM Z instead of the mirrored -OSM Z that
  // `rotateX(-π/2)` would otherwise produce. Same fix applied to every
  // shape-based renderer (OsmBuildings, OsmWater, OsmDistricts,
  // CraftedLandmarks.extrudeShape).
  const shape = new THREE.Shape();
  shape.moveTo(left[0][0], -left[0][1]);
  for (let i = 1; i < left.length; i++) shape.lineTo(left[i][0], -left[i][1]);
  for (let i = right.length - 1; i >= 0; i--)
    shape.lineTo(right[i][0], -right[i][1]);
  shape.closePath();
  return shape;
}

// Same as buildRoadShape but the centreline is first offset by
// `centreOffset` along the polyline's left normal. Used to place edge
// lines at ±(road_half - inset) from the centreline.
function buildOffsetLineShape(
  road: RawRoad,
  centreOffset: number,
  halfThickness: number
): THREE.Shape | null {
  if (road.poly.length < 2) return null;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < road.poly.length; i++) {
    const p = road.poly[i];
    const prev = road.poly[Math.max(0, i - 1)];
    const next = road.poly[Math.min(road.poly.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const cx = p[0] + nx * centreOffset;
    const cz = p[1] + nz * centreOffset;
    left.push([cx + nx * halfThickness, cz + nz * halfThickness]);
    right.push([cx - nx * halfThickness, cz - nz * halfThickness]);
  }
  // ORDER 020 transform-parity fix — see buildRoadShape.
  const shape = new THREE.Shape();
  shape.moveTo(left[0][0], -left[0][1]);
  for (let i = 1; i < left.length; i++) shape.lineTo(left[i][0], -left[i][1]);
  for (let i = right.length - 1; i >= 0; i--)
    shape.lineTo(right[i][0], -right[i][1]);
  shape.closePath();
  return shape;
}

interface RoadPiece {
  id: string;
  role: RoadRole;
  colour: string;
  geo: THREE.BufferGeometry;
  sidewalkGeo: THREE.BufferGeometry | null;
  kerbGeo: THREE.BufferGeometry | null;
  centreGeo: THREE.BufferGeometry | null;
  edgeLGeo: THREE.BufferGeometry | null;
  edgeRGeo: THREE.BufferGeometry | null;
}

// Group a role into a rendering tier so intersections stack sensibly.
// village_street sits with local_street so wayfinding named residentials
// visually align with the named unclassifieds.
function tierForRole(
  role: RoadRole
): 'primary' | 'main' | 'secondary' | 'local' | 'base' {
  if (role === 'primary') return 'primary';
  if (role === 'main') return 'main';
  if (role === 'secondary_connector') return 'secondary';
  if (role === 'local_street' || role === 'village_street') return 'local';
  return 'base';
}

// ORDER 158 — polygon-guard. Analog to ORDER 132's `windowsFor` guard
// in OsmBuildings.tsx: after ORDER 132 discovered that windows were
// generated from the OBB face and hung metres outside the polygon,
// the fix was to drop windows whose XZ lay outside the polygon
// footprint. Here the mirror problem is the road envelope (carriageway
// + trottoar) crossing INTO the polygon: ORDER 135 measured 32
// buildings that overlap the rendered envelope, worst 4.36 m.
//
// The strategy is the same shape as ORDER 132's — compute the render
// geometry, then drop the part that falls inside a building — but
// applied to a POLYLINE with WIDTH rather than a point. The whole
// envelope is clipped, not just the centreline (ORDER 135 showed
// that the carriageway alone hits 30 buildings; the full envelope
// including trottoar hits 32 — the 2 extra come from the sidewalk).
//
// Implementation reuses `clipPolylineForVehicles` from procgen/geom,
// which already densely resamples a polyline and emits contiguous
// safe runs. The clearance passed here is the envelope half-width
// (asphalt half + sidewalk per side); a centreline point closer to
// any building than that clearance means the envelope crosses the
// wall, and the piece is dropped there. `stepM = 1.0` gives metre-
// scale resolution — the finest detail that could matter for a
// road-envelope collision. `bufferM = 0.5` shrinks each surviving
// run 0.5 m from the transition so the piece terminates comfortably
// before the wall rather than at the exact envelope-vs-polygon
// intersection.
//
// Roads that ORDER 136 identified as structural (19 of 32 fall in
// this class — polyline goes through the building, no width change
// helps) will emit a hole where the building sits. That's the
// ordens känsligaste punkt per ORDER 158 §DoD 4 — a road with a
// hole reads differently from a road through a wall, and the
// verify-script + report document which outcome each case landed in.
//
// Footpath / cycleway / track are NOT excluded: an envelope through
// a wall reads wrong regardless of tier, and the narrow envelope of
// these roles rarely triggers the guard anyway.
// ORDER 312 — klippet och trottoarens val står nu i content/roadSurface.ts
// (roadRenderPieces), så att mätningarna läser samma vägyta som ritas.

export function OsmRoads() {
  const { ped, base, local, secondary, main, primary } = useMemo(() => {
    const ped: RoadPiece[] = [];
    const base: RoadPiece[] = [];
    const local: RoadPiece[] = [];
    const secondary: RoadPiece[] = [];
    const main: RoadPiece[] = [];
    const primary: RoadPiece[] = [];
    for (const rp of roadRenderPieces()) {
      {
        const pieceRoad = rp.road;
        const spec = specFor(pieceRoad);
        const half = rp.half;
        const shape = buildRoadShape(pieceRoad, half);
        if (!shape) continue;
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(-Math.PI / 2);
        let sidewalkGeo: THREE.BufferGeometry | null = null;
        let kerbGeo: THREE.BufferGeometry | null = null;
        if (rp.sidewalk > 0) {
          const swShape = buildRoadShape(pieceRoad, half + rp.sidewalk);
          if (swShape) {
            sidewalkGeo = new THREE.ShapeGeometry(swShape);
            sidewalkGeo.rotateX(-Math.PI / 2);
          }
          const kbShape = buildRoadShape(pieceRoad, half + 0.18);
          if (kbShape) {
            kerbGeo = new THREE.ShapeGeometry(kbShape);
            kerbGeo.rotateX(-Math.PI / 2);
          }
        }
        let centreGeo: THREE.BufferGeometry | null = null;
        if (spec.centreline) {
          const stripe = buildRoadShape(pieceRoad, 0.14);
          if (stripe) {
            centreGeo = new THREE.ShapeGeometry(stripe);
            centreGeo.rotateX(-Math.PI / 2);
          }
        }
        let edgeLGeo: THREE.BufferGeometry | null = null;
        let edgeRGeo: THREE.BufferGeometry | null = null;
        if (spec.edgeLine) {
          // Edge lines sit inset 0.35 m from the carriageway edge, 0.10 m
          // thick. Only on the principal through-road (main).
          const edgeOff = half - 0.35;
          const eL = buildOffsetLineShape(pieceRoad, edgeOff, 0.10);
          if (eL) {
            edgeLGeo = new THREE.ShapeGeometry(eL);
            edgeLGeo.rotateX(-Math.PI / 2);
          }
          const eR = buildOffsetLineShape(pieceRoad, -edgeOff, 0.10);
          if (eR) {
            edgeRGeo = new THREE.ShapeGeometry(eR);
            edgeRGeo.rotateX(-Math.PI / 2);
          }
        }
        const piece: RoadPiece = {
          id: pieceRoad.id,
          role: spec.role,
          colour: spec.colour,
          geo,
          sidewalkGeo,
          kerbGeo,
          centreGeo,
          edgeLGeo,
          edgeRGeo
        };
        if (spec.ped) ped.push(piece);
        else {
          switch (tierForRole(spec.role)) {
            case 'primary': primary.push(piece); break;
            case 'main': main.push(piece); break;
            case 'secondary': secondary.push(piece); break;
            case 'local': local.push(piece); break;
            default: base.push(piece);
          }
        }
      }
    }
    return { ped, base, local, secondary, main, primary };
  }, []);

  return (
    <group>
      {/* Pedestrian layer — footpaths, cycleways, forest tracks. Sits
          below the vehicle roads so a footpath crossing a road never
          fights for the top pixel. */}
      <group position={[0, GROUND_Y.landcover, 0]}>
        {ped.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial
              color={p.colour}
              roughness={0.95}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {/* Sidewalks — beneath the road plane so the road punches through
          the middle. Every tier that carries a sidewalk contributes:
          primary, main, secondary_connector, local_street,
          village_street. */}
      <group position={[0, SIDEWALK_Y, 0]}>
        {[...base, ...local, ...secondary, ...main, ...primary].map((p) =>
          p.sidewalkGeo ? (
            <mesh key={`sw-${p.id}`} geometry={p.sidewalkGeo}>
              <meshStandardMaterial color={SIDEWALK_COLOUR} roughness={0.95} />
            </mesh>
          ) : null
        )}
      </group>
      {/* Kerb — a narrow dark strip immediately outside the road, above
          the sidewalk and below the road asphalt. */}
      <group position={[0, SIDEWALK_Y + 0.01, 0]}>
        {[...base, ...local, ...secondary, ...main, ...primary].map((p) =>
          p.kerbGeo ? (
            <mesh key={`kerb-${p.id}`} geometry={p.kerbGeo}>
              <meshStandardMaterial color={KERB_COLOUR} roughness={0.9} />
            </mesh>
          ) : null
        )}
      </group>
      {/* Base vehicle layer — service + residential. */}
      <group position={[0, TIER_Y.base, 0]}>
        {base.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial color={p.colour} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Local streets stack over base so they win at driveway junctions. */}
      <group position={[0, TIER_Y.local, 0]}>
        {local.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial color={p.colour} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Secondary connectors — Kyrkogatan, Smedsgatan and the other
          village collectors. */}
      <group position={[0, TIER_Y.secondary, 0]}>
        {secondary.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial color={p.colour} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Main through-road continuation (Rv 205 / Lokavägen etc.) —
          sits under the primary tier but on top of everything else. */}
      <group position={[0, TIER_Y.main, 0]}>
        {main.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial color={p.colour} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Primary through-road (Rv 244 / Hälleforsvägen) — dominates
          every intersection. Rendered on the top vehicle layer so it
          always wins the crossing pixel. */}
      <group position={[0, TIER_Y.primary, 0]}>
        {primary.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial color={p.colour} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Centre stripes on primary + main + secondary. Rendered above
          every carriageway so intersecting stripes never disappear. */}
      <group position={[0, TIER_Y.primary + MARKING_Y_OFFSET, 0]}>
        {[...secondary, ...main, ...primary].map((p) =>
          p.centreGeo ? (
            <mesh key={`ctr-${p.id}`} geometry={p.centreGeo}>
              <meshStandardMaterial color={STRIPE_COLOUR} roughness={0.9} />
            </mesh>
          ) : null
        )}
      </group>
      {/* Edge lines — primary (Rv 244) + main (Rv 205) carry a
          continuous edge line on both sides so the through-route
          reads as a single national artery. */}
      <group position={[0, TIER_Y.primary + MARKING_Y_OFFSET, 0]}>
        {[...main, ...primary].map((p) => (
          <group key={`edge-${p.id}`}>
            {p.edgeLGeo && (
              <mesh geometry={p.edgeLGeo}>
                <meshStandardMaterial color={EDGE_LINE_COLOUR} roughness={0.9} />
              </mesh>
            )}
            {p.edgeRGeo && (
              <mesh geometry={p.edgeRGeo}>
                <meshStandardMaterial color={EDGE_LINE_COLOUR} roughness={0.9} />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
