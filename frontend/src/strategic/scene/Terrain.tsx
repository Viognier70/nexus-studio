import { VILLAGE_BOUNDS } from '../content/grythyttan';

// Grey Nordic ground with a very gentle rise toward the north (campus side).
// Two overlapping planes give a subtle height difference without heavy geo.
export function Terrain() {
  const width = VILLAGE_BOUNDS.maxX - VILLAGE_BOUNDS.minX + 200;
  const depth = VILLAGE_BOUNDS.maxZ - VILLAGE_BOUNDS.minZ + 200;
  const midX = (VILLAGE_BOUNDS.maxX + VILLAGE_BOUNDS.minX) / 2;
  const midZ = (VILLAGE_BOUNDS.maxZ + VILLAGE_BOUNDS.minZ) / 2;
  return (
    <group>
      {/* Base meadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[midX, 0, midZ]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#7f8676" roughness={1} />
      </mesh>
      {/* Slight uplift toward campus (north). Visually reads as raised land. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.4, -46]}>
        <circleGeometry args={[38, 24]} />
        <meshStandardMaterial color="#87907d" roughness={1} />
      </mesh>
      {/* Gentle depression toward the water (south). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6, -0.3, 34]}>
        <circleGeometry args={[42, 24]} />
        <meshStandardMaterial color="#6f7767" roughness={1} />
      </mesh>
    </group>
  );
}
