// ORDER 053 Del D — debug scale reference.
//
// Toggle (G) in dev builds only. Renders:
//   - a 1-metre grid over ±50 m, brighter every 10 m
//   - a 1.80 m reference figure the Vision Owner can drop with a click
//
// Never ships to production: the top-level guard on `import.meta.env.DEV`
// is a compile-time constant Vite tree-shakes away in prod, so the
// component collapses to `null` and the geometry buffers are never
// allocated in a shipped build.
//
// Positional convention matches the rest of the game: 1 world unit =
// 1 metre (CLAUDE.md enhetskontrakt). The grid is the ground truth
// for reading whether a mesh is at the size it claims to be.

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

interface Props {
  enabled: boolean;
  // Whole-world grid + figure spread. 50 m half-width covers the
  // first-person walk and the restaurant interior fine; strategic view
  // uses the same size for consistency of reading (the grid isn't the
  // whole village — it is a *ruler* placed on the world).
  halfSize?: number;
  // Where the figure starts before the first click. Default is the
  // world origin.
  initialPos?: [number, number];
  // Ground plane Y — the grid + figure sit at this height. Interior
  // floor in the strategic view is y=0.06, first-person world is y=0.
  groundY?: number;
}

const GRID_STEP_M = 1;
const MAJOR_EVERY = 10;
const FIGURE_HEIGHT_M = 1.80;
const FIGURE_RADIUS_M = 0.16;

export function ScaleReference({
  enabled,
  halfSize = 50,
  initialPos = [0, 0],
  groundY = 0
}: Props) {
  const [figurePos, setFigurePos] = useState<[number, number]>(initialPos);

  // Minor grid — every 1 m, excluding lines that fall on the major
  // grid (those get a brighter, thicker draw below).
  const minorGridGeom = useMemo(() => {
    const positions: number[] = [];
    for (let i = -halfSize; i <= halfSize; i += GRID_STEP_M) {
      if (i % MAJOR_EVERY === 0) continue;
      positions.push(-halfSize, 0, i, halfSize, 0, i);
      positions.push(i, 0, -halfSize, i, 0, halfSize);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [halfSize]);

  // Major grid — every 10 m, plus the origin axes.
  const majorGridGeom = useMemo(() => {
    const positions: number[] = [];
    for (let i = -halfSize; i <= halfSize; i += MAJOR_EVERY) {
      positions.push(-halfSize, 0, i, halfSize, 0, i);
      positions.push(i, 0, -halfSize, i, 0, halfSize);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [halfSize]);

  // Compile-time DEV guard — Vite strips this branch from the prod
  // bundle so the file's geometry is never allocated in production.
  if (!import.meta.env.DEV) return null;
  if (!enabled) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // point is in world space (the plane is at groundY, so we can use
    // x/z directly).
    setFigurePos([e.point.x, e.point.z]);
    e.stopPropagation();
  };

  return (
    <group>
      {/* Click-catch plane a hair above the grid so clicks land on it,
          not on the underlying scene geometry. Invisible material. */}
      <mesh
        position={[0, groundY + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
      >
        <planeGeometry args={[halfSize * 2, halfSize * 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Minor 1 m grid */}
      <lineSegments position={[0, groundY + 0.005, 0]}>
        <primitive object={minorGridGeom} attach="geometry" />
        <lineBasicMaterial
          color="#7a8a9a"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </lineSegments>
      {/* Major 10 m grid — brighter warm tone */}
      <lineSegments position={[0, groundY + 0.01, 0]}>
        <primitive object={majorGridGeom} attach="geometry" />
        <lineBasicMaterial
          color="#f0d080"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </lineSegments>
      {/* Reference figure — 1.80 m column, warm-orange so it never
          reads as a game character. */}
      <group position={[figurePos[0], groundY, figurePos[1]]}>
        <mesh position={[0, FIGURE_HEIGHT_M / 2, 0]}>
          <cylinderGeometry
            args={[FIGURE_RADIUS_M, FIGURE_RADIUS_M, FIGURE_HEIGHT_M, 12]}
          />
          <meshStandardMaterial
            color="#ff8a3a"
            emissive="#ff4a1a"
            emissiveIntensity={0.35}
          />
        </mesh>
        {/* Cap tick at exactly 1.80 m so the eye can register "this is
            where the top is". */}
        <mesh position={[0, FIGURE_HEIGHT_M, 0]}>
          <sphereGeometry args={[FIGURE_RADIUS_M * 1.25, 16, 10]} />
          <meshStandardMaterial color="#ffe0a0" />
        </mesh>
        {/* Base ring to mark the placement point on the ground. */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[FIGURE_RADIUS_M + 0.06, FIGURE_RADIUS_M + 0.14, 24]} />
          <meshBasicMaterial color="#ffe0a0" transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}
