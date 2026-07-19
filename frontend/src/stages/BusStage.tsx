import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { strings } from '../content/strings.sv';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

function BusScene({ reduceMotion }: { reduceMotion: boolean }) {
  const treeGroup = useRef<THREE.Group>(null);

  const trees = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: (i % 2 === 0 ? -1 : 1) * (2.6 + Math.random() * 1.6),
        z: -i * 3.5 - Math.random() * 2,
        scale: 0.85 + Math.random() * 0.7
      })),
    []
  );

  useFrame((_, delta) => {
    if (reduceMotion || !treeGroup.current) return;
    const move = delta * 18;
    treeGroup.current.children.forEach((child) => {
      child.position.z += move;
      if (child.position.z > 6) child.position.z -= 100;
    });
  });

  return (
    <>
      <color attach="background" args={['#dfe6df']} />
      <fog attach="fog" args={['#dfe6df', 5, 55]} />
      <hemisphereLight args={['#fff3e0', '#5a6a5a', 0.95]} />
      <directionalLight position={[3, 6, -2]} intensity={1.1} />
      {/* Bus interior — window frame */}
      <mesh position={[0, 0, 1]}>
        <boxGeometry args={[7, 4.6, 0.1]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {/* Interior seat suggestion */}
      <mesh position={[-2.7, -0.8, 1.6]}>
        <boxGeometry args={[1.2, 1.4, 0.4]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[2.7, -0.8, 1.6]}>
        <boxGeometry args={[1.2, 1.4, 0.4]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, -30]}>
        <planeGeometry args={[80, 140]} />
        <meshStandardMaterial color="#48584a" />
      </mesh>
      {/* Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.79, -30]}>
        <planeGeometry args={[3, 140]} />
        <meshStandardMaterial color="#22201d" />
      </mesh>
      <group ref={treeGroup}>
        {trees.map((tree, i) => (
          <group
            key={i}
            position={[tree.x, -1.8, tree.z]}
            scale={[tree.scale, tree.scale, tree.scale]}
          >
            <mesh position={[0, 0.8, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 1.4, 5]} />
              <meshStandardMaterial color="#3b2f24" />
            </mesh>
            <mesh position={[0, 2.4, 0]}>
              <coneGeometry args={[0.9, 3.4, 7]} />
              <meshStandardMaterial color="#2d3f2b" />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

interface Props {
  onDone: () => void;
}

export function BusStage({ onDone }: Props) {
  const reduce = usePrefersReducedMotion();
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const showTx = window.setTimeout(
      () => setTextVisible(true),
      reduce ? 300 : 2600
    );
    const hideTx = window.setTimeout(
      () => setTextVisible(false),
      reduce ? 1600 : 8200
    );
    const done = window.setTimeout(onDone, reduce ? 2400 : 10600);
    return () => {
      window.clearTimeout(showTx);
      window.clearTimeout(hideTx);
      window.clearTimeout(done);
    };
  }, [onDone, reduce]);

  const lines = strings.busText.split('\n');

  return (
    <div className="stage bus-stage" role="presentation">
      <Canvas
        camera={{ fov: 55, near: 0.1, far: 200, position: [0, 0, 4] }}
        dpr={[1, 2]}
      >
        <BusScene reduceMotion={reduce} />
      </Canvas>
      <div className={`bus-text ${textVisible ? 'visible' : ''}`}>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
