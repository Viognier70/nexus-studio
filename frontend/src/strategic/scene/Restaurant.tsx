import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { RESTAURANT_INTERIOR, GRAY_BOX_CAMERA } from '../content/grythyttan';
import { smoothWindow } from '../util/smoothing';

// The one restaurant with an interior cutaway. Roof fades out with distance
// so the interior is legible at close range and hidden at village range.
export function Restaurant() {
  const { actualRef } = useCamera();
  const roofRef = useRef<THREE.MeshStandardMaterial>(null);
  const wallsRef = useRef<THREE.MeshStandardMaterial>(null);
  const interiorRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const dist = actualRef.current.distance;
    const roofFade = 1 -
      smoothWindow(
        dist,
        GRAY_BOX_CAMERA.restaurantRoofFadeMid,
        GRAY_BOX_CAMERA.restaurantRoofFadeHalf
      );
    const interior = smoothWindow(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid * 2 - dist,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid,
      GRAY_BOX_CAMERA.restaurantInteriorFadeHalf
    );
    if (roofRef.current) {
      roofRef.current.opacity = Math.max(0.02, roofFade);
      roofRef.current.transparent = true;
      roofRef.current.needsUpdate = true;
    }
    if (wallsRef.current) {
      // Fade walls to a low height silhouette as we approach.
      wallsRef.current.opacity = Math.max(0.3, roofFade * 0.6 + 0.4);
      wallsRef.current.transparent = true;
    }
    if (interiorRef.current) {
      interiorRef.current.visible = interior > 0.01;
      interiorRef.current.traverse((child) => {
        const mesh = child as THREE.Mesh & { material?: THREE.MeshStandardMaterial };
        if (mesh.isMesh && mesh.material && 'opacity' in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).transparent = true;
          (mesh.material as THREE.MeshStandardMaterial).opacity = Math.min(1, interior);
        }
      });
    }
  });

  const { width, depth, interiorHeight, tables } = RESTAURANT_INTERIOR;
  const centre = RESTAURANT_INTERIOR.centre;

  const tableMeshes = useMemo(
    () =>
      tables.map((t, i) => (
        <group key={`table-${i}`} position={[t.x - centre.x, 0, t.z - centre.z]}>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[1.1, 0.06, 1.1]} />
            <meshStandardMaterial color="#8b8477" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.72, 8]} />
            <meshStandardMaterial color="#4a453d" roughness={0.9} />
          </mesh>
        </group>
      )),
    [tables, centre.x, centre.z]
  );

  return (
    <group position={[centre.x, 0, centre.z]}>
      {/* Base slab */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[width + 0.3, 0.1, depth + 0.3]} />
        <meshStandardMaterial color="#6d6a5f" roughness={0.9} />
      </mesh>
      {/* Walls (four sides as separate meshes so we can dim without touching roof) */}
      <mesh position={[0, interiorHeight / 2 + 0.1, -depth / 2 + 0.1]}>
        <boxGeometry args={[width, interiorHeight, 0.2]} />
        <meshStandardMaterial ref={wallsRef} color="#8f8b7f" roughness={0.9} />
      </mesh>
      <mesh position={[0, interiorHeight / 2 + 0.1, depth / 2 - 0.1]}>
        <boxGeometry args={[width, interiorHeight, 0.2]} />
        <meshStandardMaterial color="#8f8b7f" roughness={0.9} />
      </mesh>
      <mesh position={[-width / 2 + 0.1, interiorHeight / 2 + 0.1, 0]}>
        <boxGeometry args={[0.2, interiorHeight, depth]} />
        <meshStandardMaterial color="#8f8b7f" roughness={0.9} />
      </mesh>
      <mesh position={[width / 2 - 0.1, interiorHeight / 2 + 0.1, 0]}>
        <boxGeometry args={[0.2, interiorHeight, depth]} />
        <meshStandardMaterial color="#8f8b7f" roughness={0.9} />
      </mesh>
      {/* Roof — fades based on distance */}
      <mesh position={[0, interiorHeight + 0.25, 0]}>
        <boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} />
        <meshStandardMaterial ref={roofRef} color="#5c5951" roughness={0.9} />
      </mesh>
      {/* Doorway (dark rectangle) at entrance */}
      <mesh position={[0, 1.05, depth / 2 - 0.05]}>
        <planeGeometry args={[1.4, 2.1]} />
        <meshBasicMaterial color="#1a1815" />
      </mesh>
      {/* Sign block above door */}
      <mesh position={[0, interiorHeight + 0.6, depth / 2 + 0.16]}>
        <boxGeometry args={[3.2, 0.6, 0.15]} />
        <meshStandardMaterial color="#a89577" roughness={0.85} />
      </mesh>

      {/* Interior objects (revealed as camera approaches) */}
      <group ref={interiorRef}>
        {/* Floor */}
        <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width - 0.4, depth - 0.4]} />
          <meshStandardMaterial color="#a49b8a" roughness={0.9} />
        </mesh>
        {/* Bar counter (west) */}
        <mesh position={[-width / 2 + 1.4, 0.55, 0]}>
          <boxGeometry args={[1.2, 1.1, depth - 2]} />
          <meshStandardMaterial color="#6b5b47" roughness={0.85} />
        </mesh>
        {/* Kitchen block (NW corner) */}
        <mesh position={[-width / 2 + 1.6, 0.9, -depth / 2 + 1.6]}>
          <boxGeometry args={[2.4, 1.8, 2.4]} />
          <meshStandardMaterial color="#767268" roughness={0.9} />
        </mesh>
        {/* Kitchen ventilation hood hint */}
        <mesh position={[-width / 2 + 1.6, 2.3, -depth / 2 + 1.6]}>
          <boxGeometry args={[2.4, 0.4, 2.4]} />
          <meshStandardMaterial color="#403c36" roughness={0.9} />
        </mesh>
        {/* Tables */}
        {tableMeshes}
      </group>
    </group>
  );
}
