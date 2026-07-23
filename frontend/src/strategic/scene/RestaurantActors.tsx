import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { RESTAURANT_INTERIOR, GRAY_BOX_CAMERA } from '../content/grythyttan';
import { smoothWindow } from '../util/smoothing';
import { createRng } from '../util/rng';

interface Actor {
  homeIndex: number;
  targetIndex: number;
  progress: number;
  speed: number;
  phase: number;
}

// Three staff cubes and a handful of seated guests. Movement is a simple
// waypoint drift — the goal is life, not simulation. Visibility fades in as
// the camera approaches the restaurant.
export function RestaurantActors() {
  const { actualRef } = useCamera();
  const rootRef = useRef<THREE.Group>(null);
  const staffRefs = useRef<Array<THREE.Group | null>>([]);
  const guestRefs = useRef<Array<THREE.Group | null>>([]);
  const staff = useMemo<Actor[]>(() => {
    const rng = createRng(0x51a4);
    return RESTAURANT_INTERIOR.staffHomes.map((_, i) => ({
      homeIndex: i,
      targetIndex: i,
      progress: rng.next(),
      speed: 0.14 + rng.next() * 0.1,
      phase: rng.next() * Math.PI * 2
    }));
  }, []);
  const guests = useMemo<{ tableIndex: number; phase: number }[]>(() => {
    const rng = createRng(0x8f21);
    const tableCount = Math.min(RESTAURANT_INTERIOR.tables.length, 4);
    return Array.from({ length: tableCount }, (_, i) => ({
      tableIndex: i,
      phase: rng.next() * Math.PI * 2
    }));
  }, []);

  useFrame((_, delta) => {
    const dist = actualRef.current.distance;
    const visibility = smoothWindow(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid * 2 - dist,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid,
      GRAY_BOX_CAMERA.restaurantInteriorFadeHalf
    );
    if (rootRef.current) rootRef.current.visible = visibility > 0.02;

    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      s.progress += delta * s.speed;
      if (s.progress >= 1) {
        s.progress -= 1;
        s.homeIndex = s.targetIndex;
        s.targetIndex = (s.targetIndex + 1) % RESTAURANT_INTERIOR.staffHomes.length;
      }
      const from = RESTAURANT_INTERIOR.staffHomes[s.homeIndex];
      const to = RESTAURANT_INTERIOR.staffHomes[s.targetIndex];
      const x = from.x + (to.x - from.x) * s.progress;
      const z = from.z + (to.z - from.z) * s.progress;
      const g = staffRefs.current[i];
      if (g) {
        g.position.set(x, 0.8 + Math.sin(s.phase + s.progress * 6.28) * 0.02, z);
      }
    }

    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      const t = RESTAURANT_INTERIOR.tables[g.tableIndex];
      const node = guestRefs.current[i];
      if (node) {
        // Slight bob to imply presence at the table.
        node.position.set(
          t.x,
          0.85 + Math.sin(g.phase + performance.now() * 0.001) * 0.015,
          t.z
        );
      }
    }
  });

  return (
    <group ref={rootRef}>
      {staff.map((_, i) => (
        <group
          key={`staff-${i}`}
          ref={(ref) => {
            staffRefs.current[i] = ref;
          }}
        >
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.4, 1.5, 0.4]} />
            <meshStandardMaterial color="#4c4a44" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#c8b39a" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {guests.map((_, i) => (
        <group
          key={`guest-${i}`}
          ref={(ref) => {
            guestRefs.current[i] = ref;
          }}
        >
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.42, 1.2, 0.42]} />
            <meshStandardMaterial color="#7a7168" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <sphereGeometry args={[0.2, 12, 10]} />
            <meshStandardMaterial color="#ceb99f" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
