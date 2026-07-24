import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GROUND_Y, WORLD } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Skip water polygons whose bounding box is entirely far from the village.
// Torrvarpen and Sör-Älgen extend for kilometres; anything outside a broad
// margin around the built village is off-screen for the whole zoom range.
const MAX_DISTANCE = 5500;

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
        const g = new THREE.ShapeGeometry(shape);
        g.rotateX(-Math.PI / 2);
        return { id: w.id, g };
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
      {/* Darker submerged bed sits just under the surface. Reads as depth
          when the surface catches light. */}
      {geometries.map(({ id, g }) => (
        <mesh
          key={`bed-${id}`}
          geometry={g}
          position={[0, GROUND_Y.waterBed, 0]}
        >
          <meshStandardMaterial color="#254452" roughness={0.9} />
        </mesh>
      ))}
      {/* Calm lake surface: matte-ish with a hint of sky reflection.
          Previous revision used metalness=0.65 + a strong emissive tint
          which read as shiny mercury under the strategic-scene lighting;
          Bergslag lakes are still and dark, so metalness is dropped to
          0.25 and the base emissive is removed. The animated shimmer in
          useFrame supplies the "this is water" signal without needing a
          constant self-illumination baseline. */}
      <group ref={surfaceRef}>
        {geometries.map(({ id, g }) => (
          <mesh
            key={`surf-${id}`}
            geometry={g}
            position={[0, GROUND_Y.water, 0]}
          >
            <meshStandardMaterial
              color="#3d6c88"
              emissive="#7fbfd8"
              emissiveIntensity={0.02}
              roughness={0.55}
              metalness={0.25}
              transparent
              opacity={0.94}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
