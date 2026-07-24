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
    // Per-vertex colour tint. Village meadow reads as mixed grass /
    // moss / dry earth instead of one flat sage-green. Deterministic
    // per (x, z) so nothing shifts frame to frame.
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color('#79806b');
    const dry = new THREE.Color('#8a7a5e');   // dry hay / bare-earth patches
    const moss = new THREE.Color('#6a7561');  // damper mossy patches

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Distance outside the flat rectangle in world metres.
      const overX = Math.max(0, Math.abs(x - cx) - flatX);
      const overZ = Math.max(0, Math.abs(z - cz) - flatZ);
      const over = Math.hypot(overX, overZ);
      if (over > 0) {
        const falloff = Math.min(1, over / 800);
        // Two-octave sinusoidal displacement, clamped non-negative so
        // water at Y = 0.20 never floats above a terrain dip.
        const n =
          Math.sin(x * 0.0055) * Math.cos(z * 0.0067) * 2.2 +
          Math.sin(x * 0.0021 + 1.7) * Math.cos(z * 0.0018 - 0.9) * 3.4;
        pos.setY(i, Math.max(0, n) * falloff);
      }
      // Colour noise, independent from displacement noise so the two
      // don't correlate visually.
      const cn =
        Math.sin(x * 0.019) * Math.cos(z * 0.023) * 0.55 +
        Math.sin(x * 0.007 + 2.1) * Math.cos(z * 0.005 - 1.3) * 0.45;
      const tint = cn > 0 ? dry : moss;
      const k = Math.min(0.45, Math.abs(cn) * 0.55);
      const c = base.clone().lerp(tint, k);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}
