import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  reduceMotion: boolean;
}

interface TreeInstance {
  x: number;
  z: number;
  scale: number;
  rot: number;
}

function generateTrees(count: number): TreeInstance[] {
  const trees: TreeInstance[] = [];
  let attempts = 0;
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  while (trees.length < count && attempts < count * 20) {
    attempts++;
    const x = rand(-140, 140);
    const z = rand(-140, 140);
    // Keep the play corridor free of trees.
    if (x > -18 && x < 20 && z > -32 && z < 26) continue;
    trees.push({
      x,
      z,
      scale: rand(0.85, 1.6),
      rot: Math.random() * Math.PI
    });
  }
  return trees;
}

export function Trees({ reduceMotion }: Props) {
  const trees = useMemo(() => generateTrees(420), []);
  const canopyGroup = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (reduceMotion || !canopyGroup.current) return;
    const t = state.clock.getElapsedTime();
    canopyGroup.current.rotation.z = Math.sin(t * 0.35) * 0.012;
  });

  return (
    <group>
      <Instances limit={trees.length} range={trees.length}>
        <cylinderGeometry args={[0.15, 0.22, 1.4, 6]} />
        <meshStandardMaterial color="#3b2f24" roughness={1} />
        {trees.map((tree, index) => (
          <Instance
            key={`trunk-${index}`}
            position={[tree.x, 0.7 * tree.scale, tree.z]}
            scale={tree.scale}
            rotation={[0, tree.rot, 0]}
          />
        ))}
      </Instances>
      <group ref={canopyGroup}>
        <Instances limit={trees.length} range={trees.length}>
          <coneGeometry args={[1.2, 4.2, 8]} />
          <meshStandardMaterial color="#2d3f2b" roughness={1} />
          {trees.map((tree, index) => (
            <Instance
              key={`canopy-${index}`}
              position={[tree.x, 2.6 * tree.scale, tree.z]}
              scale={tree.scale}
              rotation={[0, tree.rot, 0]}
            />
          ))}
        </Instances>
      </group>
    </group>
  );
}
