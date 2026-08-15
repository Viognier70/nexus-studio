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

  // ORDER 053 Del B — 1.70 m standing (crown to floor). Segments:
  //   legs 0–0.90, torso 0.90–1.40, neck 1.40–1.48, head 1.48–1.70.
  // ORDER 054 Del E — roughness/metalness:
  //   trousers (untreated cotton)  0.90
  //   jacket (painted-wood-like)   0.85
  //   skin (subsurface stand-in)   0.70
  return (
    <group ref={group} position={POSITION.toArray()}>
      <mesh position={[-0.13, 0.45, 0]} castShadow>
        <boxGeometry args={[0.18, 0.9, 0.18]} />
        <meshStandardMaterial color="#302a24" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.13, 0.45, 0]} castShadow>
        <boxGeometry args={[0.18, 0.9, 0.18]} />
        <meshStandardMaterial color="#302a24" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.44, 0.5, 0.26]} />
        <meshStandardMaterial color="#7a6c58" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0, 1.44, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.08, 8]} />
        <meshStandardMaterial color="#d6b79a" roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0, 1.59, 0]} castShadow>
        <sphereGeometry args={[0.11, 16, 12]} />
        <meshStandardMaterial color="#d6b79a" roughness={0.7} metalness={0} />
      </mesh>
    </group>
  );
}
