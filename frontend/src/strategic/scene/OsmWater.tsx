import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GROUND_Y, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Skip water polygons whose bounding box is entirely far from the village.
// Torrvarpen and Sör-Älgen extend for kilometres; anything outside a broad
// margin around the built village is off-screen for the whole zoom range.
const MAX_DISTANCE = 5500;

// Colour palette for the shallow-to-deep gradient. Vertices whose
// distance to the nearest polygon edge is small blend toward the
// shallow tint; deep-interior vertices settle on the deep tint. Values
// tuned for the Bergslag lakes' cool tea-brown character.
const SHALLOW_COLOUR = new THREE.Color('#6c8d99');   // pale sandy shore
const DEEP_COLOUR = new THREE.Color('#365767');      // dark cold deep
// Bed uses the same shallow-to-deep gradient but darker overall so
// depth reads through the semi-transparent surface.
const BED_SHALLOW = new THREE.Color('#3a4c56');
const BED_DEEP = new THREE.Color('#1b2c37');

function outsideRange(poly: Vec2Tuple[]): boolean {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return (
    minX > MAX_DISTANCE ||
    maxX < -MAX_DISTANCE ||
    minZ > MAX_DISTANCE ||
    maxZ < -MAX_DISTANCE
  );
}

// Distance from point (px, pz) to the nearest polygon edge segment.
function distanceToPolygonEdge(
  poly: Vec2Tuple[],
  px: number,
  pz: number
): number {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const ax = poly[i][0], az = poly[i][1];
    const bx = poly[i + 1][0], bz = poly[i + 1][1];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) {
      const d = Math.hypot(px - ax, pz - az);
      if (d < best) best = d;
      continue;
    }
    let t = ((px - ax) * dx + (pz - az) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * dx;
    const qz = az + t * dz;
    const d = Math.hypot(px - qx, pz - qz);
    if (d < best) best = d;
  }
  return best;
}

// Attach a per-vertex depth gradient to a ShapeGeometry. Uses distance
// to the polygon edge as a proxy for water depth — closer to the shore
// reads as shallow (pale), deep-interior as dark. `depthMetres` is the
// distance-to-edge at which the colour reaches the deep tint.
function paintWaterGradient(
  geo: THREE.BufferGeometry,
  poly: Vec2Tuple[],
  shallow: THREE.Color,
  deep: THREE.Color,
  depthMetres: number
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    // Geometry has been rotated so ShapeGeometry X → world X,
    // ShapeGeometry Y → world Z (negated via the rotateX). The polygon
    // is in (X, Z) so we read attributes.position.x and .z for lookup.
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = distanceToPolygonEdge(poly, x, z);
    const t = Math.min(1, d / depthMetres);
    // Ease so shallow band stays thin.
    const eased = t * t * (3 - 2 * t);
    tmp.copy(shallow).lerp(deep, eased);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Grythyttan sits on the north shore of Torrvarpen. The lake has to read as
// one of the strongest orientation landmarks the moment a village-scale view
// resolves. Two-layer treatment: a slightly darker submerged bed under a
// glassy blue surface, plus a subtle animated shimmer so the eye picks up
// the water immediately even when it's still in the corner of the frame.
export function OsmWater() {
  const geometries = useMemo(() => {
    return WORLD.water
      .filter((w) => w.poly.length >= 4 && !outsideRange(w.poly))
      .map((w) => {
        const shape = new THREE.Shape();
        shape.moveTo(w.poly[0][0], w.poly[0][1]);
        for (let i = 1; i < w.poly.length; i++)
          shape.lineTo(w.poly[i][0], w.poly[i][1]);
        shape.closePath();
        // Higher curveSegments so the shore band has enough vertices
        // for the depth gradient to read smoothly. ShapeGeometry
        // triangulates the resulting polygon; more verts on the outer
        // contour give more shading detail near the shore.
        const g = new THREE.ShapeGeometry(shape, 6);
        g.rotateX(-Math.PI / 2);

        // Bed geometry: same shape, painted with the darker bed
        // gradient. Deep shore edge falls off over ~60 m from the
        // shore for a natural fade; extremely large water bodies
        // (Torrvarpen) then read as uniformly deep past that.
        const bedGeo = g.clone();
        paintWaterGradient(bedGeo, w.poly, BED_SHALLOW, BED_DEEP, 60);

        // Surface geometry.
        const surfGeo = g.clone();
        paintWaterGradient(surfGeo, w.poly, SHALLOW_COLOUR, DEEP_COLOUR, 45);

        return { id: w.id, bedGeo, surfGeo };
      });
  }, []);

  const surfaceRef = useRef<THREE.Group>(null);

  // Very slow, very subtle brightness ripple. Enough to signal "water" at a
  // glance without becoming a distraction. Amplitude kept low so the water
  // reads as calm Bergslag lake, not a shimmering pool.
  useFrame(({ clock }) => {
    if (!surfaceRef.current) return;
    const t = clock.getElapsedTime();
    surfaceRef.current.traverse((child) => {
      const mesh = child as THREE.Mesh & { material?: THREE.MeshStandardMaterial };
      if (mesh.isMesh && mesh.material && 'emissiveIntensity' in mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.02 + 0.02 * Math.sin(t * 0.4);
      }
    });
  });

  return (
    <group>
      {/* Bed: painted with a shallow-to-deep vertex gradient. Sits just
          under the surface. Reads as depth when the surface catches
          light — the shallow band near the shore takes a sandy tint. */}
      {geometries.map(({ id, bedGeo }) => (
        <mesh
          key={`bed-${id}`}
          geometry={bedGeo}
          position={[0, GROUND_Y.waterBed, 0]}
        >
          <meshStandardMaterial vertexColors roughness={0.9} />
        </mesh>
      ))}
      {/* Calm lake surface with a vertex-gradient blue (pale sandy
          shore → dark deep interior). Matte roughness (0.55) and low
          metalness (0.25) so lakes read as still Bergslag water rather
          than shiny mercury. The animated shimmer in useFrame supplies
          the "this is water" cue without a constant self-illumination
          baseline. */}
      <group ref={surfaceRef}>
        {geometries.map(({ id, surfGeo }) => (
          <mesh
            key={`surf-${id}`}
            geometry={surfGeo}
            position={[0, GROUND_Y.water, 0]}
          >
            <meshStandardMaterial
              vertexColors
              emissive="#7fbfd8"
              emissiveIntensity={0.02}
              roughness={0.55}
              metalness={0.25}
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
