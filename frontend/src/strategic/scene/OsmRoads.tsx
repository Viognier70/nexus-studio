import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_Y, WORLD } from '../content/world';
import type { RawRoad } from '../content/world';

// Width and colour by OSM highway kind. Real hierarchy: Lokavägen is the
// through-road (secondary); Kyrkogatan / Smedsgatan are village collectors
// (tertiary); the residential grid (Prästgatan, Skolgatan, Bergvägen etc.)
// is next; service roads are driveways / access; footpath and cycleway
// finish the pedestrian layer.
interface CategoryDef {
  width: number;
  colour: string;
  ped: boolean;
  stripe: boolean;
  sidewalkWidth?: number;   // per-side pavement width, 0 = no sidewalk
  gravel?: boolean;         // dustier warmer material tint
}

// Widths tuned for the Grythyttan hierarchy. Sidewalks are added only on
// the collector network (secondary/tertiary/primary/unclassified) and
// pedestrian streets — residential lanes, service tracks and forest
// tracks don't get one in reality either.
const CATEGORY: Record<string, CategoryDef> = {
  motorway: { width: 9, colour: '#a7a29b', ped: false, stripe: true, sidewalkWidth: 1.6 },
  trunk: { width: 9, colour: '#a7a29b', ped: false, stripe: true, sidewalkWidth: 1.6 },
  primary: { width: 8, colour: '#a09b93', ped: false, stripe: true, sidewalkWidth: 1.6 },
  secondary: { width: 6.8, colour: '#98938b', ped: false, stripe: true, sidewalkWidth: 1.4 },
  tertiary: { width: 5.4, colour: '#8a867d', ped: false, stripe: false, sidewalkWidth: 1.2 },
  unclassified: { width: 4.4, colour: '#7f7c73', ped: false, stripe: false, sidewalkWidth: 1.0 },
  residential: { width: 4, colour: '#7a7770', ped: false, stripe: false },
  living_street: { width: 3.5, colour: '#a89876', ped: false, stripe: false, sidewalkWidth: 0.9 },
  service: { width: 2.6, colour: '#75705f', ped: false, stripe: false, gravel: true },
  track: { width: 2.2, colour: '#7a6a52', ped: true, stripe: false, gravel: true },
  // Cycleways in Sweden are commonly painted in a warmer red-brown asphalt
  // colour to distinguish them from footways. Kept subtle at village zoom.
  cycleway: { width: 1.6, colour: '#8f7362', ped: true, stripe: false },
  footway: { width: 1.1, colour: '#948667', ped: true, stripe: false },
  path: { width: 1.1, colour: '#948667', ped: true, stripe: false, gravel: true },
  steps: { width: 1.1, colour: '#7f7462', ped: true, stripe: false },
  pedestrian: { width: 3, colour: '#a89876', ped: true, stripe: false },
  platform: { width: 2, colour: '#6a675e', ped: true, stripe: false }
};

const DEFAULT_CAT: CategoryDef = {
  width: 3,
  colour: '#7a7770',
  ped: false,
  stripe: false
};

// Y-level for the sidewalk layer — a hair below the road so major roads
// still win the middle at intersections, but enough separation to avoid
// z-fighting at strategic-zoom depth precision (~10 cm at 1800 m).
const SIDEWALK_Y = 0.38;
const SIDEWALK_COLOUR = '#b8ac96';    // pale limestone
const KERB_COLOUR = '#4a463f';         // dark granite kerb

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

interface RoadPiece {
  id: string;
  geo: THREE.BufferGeometry;
  colour: string;
  stripeGeo: THREE.BufferGeometry | null;
  sidewalkGeo: THREE.BufferGeometry | null;
  kerbGeo: THREE.BufferGeometry | null;
  category: 'ped' | 'car' | 'major';
}

export function OsmRoads() {
  const { ped, car, major } = useMemo(() => {
    const ped: RoadPiece[] = [];
    const car: RoadPiece[] = [];
    const major: RoadPiece[] = [];
    for (const road of WORLD.roads) {
      if (road.poly.length < 2) continue;
      const cat = CATEGORY[road.kind] ?? DEFAULT_CAT;
      const shape = buildRoadShape(road, cat.width / 2);
      if (!shape) continue;
      const g = new THREE.ShapeGeometry(shape);
      g.rotateX(-Math.PI / 2);
      let stripeGeo: THREE.BufferGeometry | null = null;
      if (cat.stripe) {
        // Thin centreline stripe so the through-road pops from village
        // scale — reads immediately as the main artery.
        const stripe = buildRoadShape(road, 0.18);
        if (stripe) {
          stripeGeo = new THREE.ShapeGeometry(stripe);
          stripeGeo.rotateX(-Math.PI / 2);
        }
      }
      // Sidewalk / kerb for classes that carry pavement. Rendered
      // slightly below the road plane so the road punches through in
      // the middle; the visible sidewalk is the strip outside the road
      // edge on each side.
      let sidewalkGeo: THREE.BufferGeometry | null = null;
      let kerbGeo: THREE.BufferGeometry | null = null;
      if (cat.sidewalkWidth && cat.sidewalkWidth > 0) {
        const sidewalkHalf = cat.width / 2 + cat.sidewalkWidth;
        const swShape = buildRoadShape(road, sidewalkHalf);
        if (swShape) {
          sidewalkGeo = new THREE.ShapeGeometry(swShape);
          sidewalkGeo.rotateX(-Math.PI / 2);
        }
        // Kerb strip: slightly wider than the road edge, thin and dark.
        const kerbShape = buildRoadShape(road, cat.width / 2 + 0.18);
        if (kerbShape) {
          kerbGeo = new THREE.ShapeGeometry(kerbShape);
          kerbGeo.rotateX(-Math.PI / 2);
        }
      }
      const piece: RoadPiece = {
        id: road.id,
        geo: g,
        colour: cat.colour,
        stripeGeo,
        sidewalkGeo,
        kerbGeo,
        category: cat.ped ? 'ped' : cat.stripe ? 'major' : 'car'
      };
      if (cat.ped) ped.push(piece);
      else if (cat.stripe) major.push(piece);
      else car.push(piece);
    }
    return { ped, car, major };
  }, []);

  return (
    <group>
      {/* Foot paths sit slightly below the vehicle roads so a footpath
          crossing a road never fights for the top pixel. */}
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
          the middle. Visible strip on each side of the collectors and
          through-roads. Rendered before all vehicle layers so the road
          asphalt fills the middle. */}
      <group position={[0, SIDEWALK_Y, 0]}>
        {[...car, ...major].map((p) =>
          p.sidewalkGeo ? (
            <mesh key={`sw-${p.id}`} geometry={p.sidewalkGeo}>
              <meshStandardMaterial
                color={SIDEWALK_COLOUR}
                roughness={0.95}
              />
            </mesh>
          ) : null
        )}
      </group>
      {/* Kerb — a narrow dark strip immediately outside the road, above
          the sidewalk and below the road asphalt. Reads as the granite
          kerb between road and pavement. */}
      <group position={[0, SIDEWALK_Y + 0.01, 0]}>
        {[...car, ...major].map((p) =>
          p.kerbGeo ? (
            <mesh key={`kerb-${p.id}`} geometry={p.kerbGeo}>
              <meshStandardMaterial color={KERB_COLOUR} roughness={0.9} />
            </mesh>
          ) : null
        )}
      </group>
      {/* Residential + service roads. */}
      <group position={[0, GROUND_Y.roads, 0]}>
        {car.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial color={p.colour} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Major roads on top of the car layer, so through-routes always win
          intersections visually. */}
      <group position={[0, GROUND_Y.roads + 0.02, 0]}>
        {major.map((p) => (
          <mesh key={p.id} geometry={p.geo}>
            <meshStandardMaterial color={p.colour} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Thin centreline stripe over each major road. */}
      <group position={[0, GROUND_Y.roads + 0.05, 0]}>
        {major.map((p) =>
          p.stripeGeo ? (
            <mesh key={`stripe-${p.id}`} geometry={p.stripeGeo}>
              <meshStandardMaterial color="#c9c1ac" roughness={0.9} />
            </mesh>
          ) : null
        )}
      </group>
    </group>
  );
}
