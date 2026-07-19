import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  onProximity: (near: boolean) => void;
  active: boolean;
}

const POSITION = new THREE.Vector3(0, 0, -19);
const RADIUS = 3.6;

export function RegistrationTable({ onProximity, active }: Props) {
  const near = useRef(false);

  useFrame((state) => {
    if (!active) return;
    const cam = state.camera.position;
    const dx = cam.x - POSITION.x;
    const dz = cam.z - POSITION.z;
    const dist = Math.hypot(dx, dz);
    const isNear = dist < RADIUS;
    if (isNear !== near.current) {
      near.current = isNear;
      onProximity(isNear);
    }
  });

  useEffect(() => {
    if (!active && near.current) {
      near.current = false;
      onProximity(false);
    }
  }, [active, onProximity]);

  return (
    <group position={POSITION.toArray()}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.2, 0.08, 0.9]} />
        <meshStandardMaterial color="#8a6b48" roughness={0.6} />
      </mesh>
      <mesh position={[-1.0, 0.45, -0.4]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#5b432b" />
      </mesh>
      <mesh position={[1.0, 0.45, -0.4]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#5b432b" />
      </mesh>
      <mesh position={[-1.0, 0.45, 0.4]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#5b432b" />
      </mesh>
      <mesh position={[1.0, 0.45, 0.4]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#5b432b" />
      </mesh>
      <mesh position={[-0.5, 0.96, 0]} rotation={[0, 0.12, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.55]} />
        <meshStandardMaterial color="#c4b295" roughness={0.7} />
      </mesh>
      <mesh position={[0.7, 1.15, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[0.7, 1.42, 0]}>
        <coneGeometry args={[0.12, 0.15, 12]} />
        <meshStandardMaterial
          color="#c9b98a"
          emissive="#f0d9a0"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}
