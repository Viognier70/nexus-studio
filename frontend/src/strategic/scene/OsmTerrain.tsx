import { WORLD_BOUNDS } from '../content/world';

// One big flat meadow. We used to render two coplanar planes (outer + inner)
// to give the village a slightly brighter core, but that pair was the main
// source of the shimmering ground observed in VS-02B: even with polygonOffset
// the two planes could tie-break either way frame to frame.
//
// A single plane at the canonical Y = 0 is stable and reads fine when the
// water and roads above it carry the visual contrast.
export function OsmTerrain() {
  const mx = (WORLD_BOUNDS.maxX + WORLD_BOUNDS.minX) / 2;
  const mz = (WORLD_BOUNDS.maxZ + WORLD_BOUNDS.minZ) / 2;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[mx, 0, mz]}>
      <planeGeometry args={[12000, 12000]} />
      <meshStandardMaterial color="#79806b" roughness={1} />
    </mesh>
  );
}
