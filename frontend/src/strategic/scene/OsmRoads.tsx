import { useMemo } from 'react';
import * as THREE from 'three';
import { CLIPPED_ROADS, GROUND_Y, WORLD } from '../content/world';
import type { RawRoad, Vec2Tuple } from '../content/world';
import { specFor, type RoadRole } from '../content/roadRoles';
import { inside, polygonBounds } from '../procgen/geom';

// Surfaces where a paved sidewalk would visually contradict the road
// itself. A compacted gravel local_street receives no paved kerb + walk
// even though its role tier normally carries one — real gravel roads
// don't have concrete kerbs.
const UNPAVED_SURFACES: ReadonlySet<string> = new Set([
  'unpaved', 'compacted', 'gravel', 'fine_gravel',
  'ground', 'dirt', 'grass', 'mud', 'sand'
]);

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
  const shape = new THREE.Shape();
  shape.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) shape.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--)
    shape.lineTo(right[i][0], right[i][1]);
  shape.closePath();
  return shape;
}

// Sample the sidewalk envelope of a road piece and return true if any
// corner would sit inside a building polygon. Sidewalks widen the
// effective envelope beyond the CLIPPED_ROADS geometry; where the road
// terminates at a wall, the sidewalk cap can still project into a
// neighbouring building. Skipping the sidewalk on those pieces (not
// the road itself) is a pure procedural rule — no per-road exceptions.
function sidewalkClearsBuildings(poly: Vec2Tuple[], envHalf: number): boolean {
  if (poly.length < 2) return true;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const prev = poly[Math.max(0, i - 1)];
    const next = poly[Math.min(poly.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    for (const sign of [1, -1]) {
      const ex = p[0] + nx * envHalf * sign;
      const ez = p[1] + nz * envHalf * sign;
      for (const b of WORLD.buildings) {
        if (b.poly.length < 3) continue;
        const bb = polygonBounds(b.poly);
        if (ex < bb.minX || ex > bb.maxX || ez < bb.minZ || ez > bb.maxZ) continue;
        if (inside(b.poly, ex, ez)) return false;
      }
    }
  }
  return true;
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
  const shape = new THREE.Shape();
  shape.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) shape.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--)
    shape.lineTo(right[i][0], right[i][1]);
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

export function OsmRoads() {
  const { ped, base, local, secondary, main, primary } = useMemo(() => {
    const ped: RoadPiece[] = [];
    const base: RoadPiece[] = [];
    const local: RoadPiece[] = [];
    const secondary: RoadPiece[] = [];
    const main: RoadPiece[] = [];
    const primary: RoadPiece[] = [];
    for (const road of CLIPPED_ROADS) {
      if (road.poly.length < 2) continue;
      const spec = specFor(road);
      const half = spec.width / 2;
      const shape = buildRoadShape(road, half);
      if (!shape) continue;
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      let sidewalkGeo: THREE.BufferGeometry | null = null;
      let kerbGeo: THREE.BufferGeometry | null = null;
      const surfaceIsUnpaved =
        road.surface != null && UNPAVED_SURFACES.has(road.surface);
      if (
        spec.sidewalkWidth > 0 &&
        !surfaceIsUnpaved &&
        sidewalkClearsBuildings(road.poly, half + spec.sidewalkWidth)
      ) {
        const swShape = buildRoadShape(road, half + spec.sidewalkWidth);
        if (swShape) {
          sidewalkGeo = new THREE.ShapeGeometry(swShape);
          sidewalkGeo.rotateX(-Math.PI / 2);
        }
        const kbShape = buildRoadShape(road, half + 0.18);
        if (kbShape) {
          kerbGeo = new THREE.ShapeGeometry(kbShape);
          kerbGeo.rotateX(-Math.PI / 2);
        }
      }
      let centreGeo: THREE.BufferGeometry | null = null;
      if (spec.centreline) {
        const stripe = buildRoadShape(road, 0.14);
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
        const eL = buildOffsetLineShape(road, edgeOff, 0.10);
        if (eL) {
          edgeLGeo = new THREE.ShapeGeometry(eL);
          edgeLGeo.rotateX(-Math.PI / 2);
        }
        const eR = buildOffsetLineShape(road, -edgeOff, 0.10);
        if (eR) {
          edgeRGeo = new THREE.ShapeGeometry(eR);
          edgeRGeo.rotateX(-Math.PI / 2);
        }
      }
      const piece: RoadPiece = {
        id: road.id,
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
