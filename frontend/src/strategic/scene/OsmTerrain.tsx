import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD_BOUNDS } from '../content/world';

// Segmented terrain plane with gentle Bergslag-hill displacement outside
// the village core. Vertices within the village bounds (plus a safety
// buffer) stay at Y = 0 so buildings, roads, forest scatter and
// pedestrian systems — all of which assume ground Y = 0 — never clip or
// float. Outside the buffer the surface undulates on two octaves of
// sinusoidal noise, deterministic per (x, z) so the shape is stable
// across sessions.
//
// The single-plane / no polygonOffset choice from VS-02B is preserved
// (avoids the previous shimmering ground); we simply move it from a
// hard-coded plane to a low-segment BufferGeometry.
export function OsmTerrain() {
  const geometry = useMemo(() => {
    const cx = (WORLD_BOUNDS.maxX + WORLD_BOUNDS.minX) / 2;
    const cz = (WORLD_BOUNDS.maxZ + WORLD_BOUNDS.minZ) / 2;
    const halfX = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / 2;
    const halfZ = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / 2;

    // Buffer around the village core that stays perfectly flat. Larger
    // than the strict bounds because the plane's segments are 150 m and
    // any half-lifted vertex near the village edge could visibly tilt
    // a road's ground.
    const flatX = halfX + 150;
    const flatZ = halfZ + 150;

    const geo = new THREE.PlaneGeometry(12000, 12000, 80, 80);
    geo.rotateX(-Math.PI / 2);
    geo.translate(cx, 0, cz);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Distance outside the flat rectangle in world metres.
      const overX = Math.max(0, Math.abs(x - cx) - flatX);
      const overZ = Math.max(0, Math.abs(z - cz) - flatZ);
      const over = Math.hypot(overX, overZ);
      if (over === 0) continue;
      const falloff = Math.min(1, over / 800);
      // Two-octave sinusoidal noise. Amplitude ramps from 0 (village
      // edge) to ~5 m (far background). No sharp features.
      const n =
        Math.sin(x * 0.0055) * Math.cos(z * 0.0067) * 2.2 +
        Math.sin(x * 0.0021 + 1.7) * Math.cos(z * 0.0018 - 0.9) * 3.4;
      pos.setY(i, n * falloff);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#79806b" roughness={1} />
    </mesh>
  );
}
