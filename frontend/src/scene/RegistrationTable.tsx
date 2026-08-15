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

  // ORDER 053 Del B — table surface at 0.74 m (top of the 0.08 m plate
  // sits at 0.78; legs are 0.70 tall). Lamp + ledger positions ride
  // 0.16 m lower to stay flush with the table top.
  // ORDER 054 Del E — roughness/metalness per reference table:
  //   table top          0.75 (painted / lacquered wood)
  //   legs               0.90 (untreated timber)
  //   ledger paper       0.85 (linen-ish paper)
  //   lamp stand         0.55 + metalness 0.7 (painted metal)
  //   lamp shade         0.60 (fabric with slight emissive)
  return (
    <group position={POSITION.toArray()}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 0.9]} />
        <meshStandardMaterial color="#8a6b48" roughness={0.75} metalness={0} />
      </mesh>
      <mesh position={[-1.0, 0.35, -0.4]} castShadow>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#5b432b" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[1.0, 0.35, -0.4]} castShadow>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#5b432b" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[-1.0, 0.35, 0.4]} castShadow>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#5b432b" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[1.0, 0.35, 0.4]} castShadow>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#5b432b" roughness={0.9} metalness={0} />
      </mesh>
      {/* Registration ledger — open book at the left half of the table,
          slightly rotated as if placed by hand. 40 × 55 × 0.3 cm, paper-
          toned. The player presses E on this table to "register" per
          strings.prompts.register; the ledger is the object the action
          reads against. Naming and comment added under ORDER 054 Del A;
          git blame on the line points at the initial VS-01 commit
          (502f1a0e, 2026-07-19) with no descriptive text, so the name
          is derived from the surrounding evidence — size + colour +
          position + the E-prompt semantic — not from source intent. */}
      <mesh position={[-0.5, 0.80, 0]} rotation={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.4, 0.03, 0.55]} />
        <meshStandardMaterial color="#c4b295" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0.7, 1.03, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.55} metalness={0.7} />
      </mesh>
      <mesh position={[0.7, 1.30, 0]} castShadow>
        <coneGeometry args={[0.12, 0.15, 12]} />
        <meshStandardMaterial
          color="#c9b98a"
          roughness={0.60}
          metalness={0}
          emissive="#f0d9a0"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}
