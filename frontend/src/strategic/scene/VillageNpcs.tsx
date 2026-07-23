import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { RESIDENT_LOOPS, GRAY_BOX_CAMERA } from '../content/grythyttan';
import { smoothWindow } from '../util/smoothing';
import { sampleLoop } from '../movement/paths';
import { createRng } from '../util/rng';

interface Ambler {
  loopIndex: number;
  progress: number;
  speed: number;
  colour: string;
}

const COUNT = 44;
const SEED = 0x3f2a10;

// Simple grey block ambulants along the resident loops. Motion, not simulation.
export function VillageNpcs() {
  const { actualRef } = useCamera();
  const rootRef = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);

  const ambulants = useMemo<Ambler[]>(() => {
    const rng = createRng(SEED);
    const list: Ambler[] = [];
    for (let i = 0; i < COUNT; i++) {
      list.push({
        loopIndex: i % RESIDENT_LOOPS.length,
        progress: rng.next(),
        speed: rng.range(0.006, 0.02),
        colour: rng.pick(['#8b8578', '#96917f', '#7e786a', '#a29a86'])
      });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    const dist = actualRef.current.distance;
    const visibility = smoothWindow(
      GRAY_BOX_CAMERA.villageDetailFadeMid * 2 - dist,
      GRAY_BOX_CAMERA.villageDetailFadeMid,
      GRAY_BOX_CAMERA.villageDetailFadeHalf
    );
    if (rootRef.current) rootRef.current.visible = visibility > 0.02;
    if (!mesh.current) return;

    for (let i = 0; i < ambulants.length; i++) {
      const a = ambulants[i];
      a.progress = (a.progress + a.speed * delta * 16) % 1;
      const loop = RESIDENT_LOOPS[a.loopIndex];
      const p = sampleLoop(loop, a.progress);
      tempObj.position.set(p.x, 0.6, p.z);
      const scale = 0.6 + Math.min(1, visibility) * 0.4;
      tempObj.scale.set(scale, scale, scale);
      tempObj.updateMatrix();
      mesh.current.setMatrixAt(i, tempObj.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={rootRef}>
      <instancedMesh ref={mesh} args={[undefined, undefined, ambulants.length]}>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial color="#8a8377" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
