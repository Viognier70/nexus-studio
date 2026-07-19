import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  onProximity: (near: boolean) => void;
  reduceMotion: boolean;
  disabled?: boolean;
}

const POSITION = new THREE.Vector3(2.6, 0, 6);
const RADIUS = 3.6;

export function Applicant({ onProximity, reduceMotion, disabled }: Props) {
  const group = useRef<THREE.Group>(null);
  const near = useRef(false);

  useFrame((state) => {
    if (disabled) return;
    const cam = state.camera.position;
    const dx = cam.x - POSITION.x;
    const dz = cam.z - POSITION.z;
    const dist = Math.hypot(dx, dz);
    const isNear = dist < RADIUS;
    if (isNear !== near.current) {
      near.current = isNear;
      onProximity(isNear);
    }
    if (group.current && !reduceMotion) {
      const t = state.clock.getElapsedTime();
      group.current.position.y = Math.sin(t * 1.15) * 0.02;
    }
  });

  useEffect(() => {
    return () => onProximity(false);
  }, [onProximity]);

  return (
    <group ref={group} position={POSITION.toArray()}>
      <mesh position={[-0.14, 0.5, 0]}>
        <boxGeometry args={[0.2, 1, 0.2]} />
        <meshStandardMaterial color="#302a24" roughness={0.9} />
      </mesh>
      <mesh position={[0.14, 0.5, 0]}>
        <boxGeometry args={[0.2, 1, 0.2]} />
        <meshStandardMaterial color="#302a24" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[0.55, 0.75, 0.32]} />
        <meshStandardMaterial color="#7a6c58" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
        <meshStandardMaterial color="#d6b79a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.02, 0]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#d6b79a" roughness={0.7} />
      </mesh>
    </group>
  );
}
