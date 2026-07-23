import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAR_LOOPS, DELIVERY_LOOP } from '../content/grythyttan';
import { sampleLoop, loopHeading } from '../movement/paths';
import { createRng } from '../util/rng';

interface Car {
  loopIndex: number;
  progress: number;
  speed: number;
}

const CAR_COUNT = 3;

export function Traffic() {
  const cars = useMemo<Car[]>(() => {
    const rng = createRng(0x88f0);
    return Array.from({ length: CAR_COUNT }, (_, i) => ({
      loopIndex: i % CAR_LOOPS.length,
      progress: rng.next(),
      speed: rng.range(0.015, 0.03)
    }));
  }, []);
  const carRefs = useRef<Array<THREE.Group | null>>([]);
  const deliveryRef = useRef<THREE.Group>(null);
  const deliveryState = useRef({ progress: 0, speed: 0.02 });

  useFrame((_, delta) => {
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      car.progress = (car.progress + car.speed * delta * 4) % 1;
      const p = sampleLoop(CAR_LOOPS[car.loopIndex], car.progress);
      const yaw = loopHeading(CAR_LOOPS[car.loopIndex], car.progress);
      const group = carRefs.current[i];
      if (group) {
        group.position.set(p.x, 0.35, p.z);
        group.rotation.y = yaw;
      }
    }

    const ds = deliveryState.current;
    ds.progress = (ds.progress + ds.speed * delta * 3) % 1;
    if (deliveryRef.current) {
      const p = sampleLoop(DELIVERY_LOOP, ds.progress);
      const yaw = loopHeading(DELIVERY_LOOP, ds.progress);
      deliveryRef.current.position.set(p.x, 0.45, p.z);
      deliveryRef.current.rotation.y = yaw;
    }
  });

  return (
    <group>
      {cars.map((_, i) => (
        <group
          key={`car-${i}`}
          ref={(ref) => {
            carRefs.current[i] = ref;
          }}
        >
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1.6, 0.7, 3.4]} />
            <meshStandardMaterial color="#6d6a63" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.85, -0.2]}>
            <boxGeometry args={[1.4, 0.5, 1.4]} />
            <meshStandardMaterial color="#8a877f" roughness={0.85} />
          </mesh>
        </group>
      ))}
      <group ref={deliveryRef}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.8, 1.4, 4.4]} />
          <meshStandardMaterial color="#5b5850" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.7, 1.8]}>
          <boxGeometry args={[1.8, 1.1, 0.8]} />
          <meshStandardMaterial color="#9b9789" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}
