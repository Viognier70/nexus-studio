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

    // Plane resolution bumped from 80 to 120 so the finer noise band
    // registers as discrete patches rather than aliasing into stripes.
    // 14 400 vertices still initialise in a single frame and there's
    // no per-frame cost.
    const geo = new THREE.PlaneGeometry(12000, 12000, 120, 120);
    geo.rotateX(-Math.PI / 2);
    geo.translate(cx, 0, cz);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    // Per-vertex colour tint. Terrain now blends four biome tints on
    // three octaves of sinusoidal noise, deterministic per (x, z).
    //   * base   — the general Bergslag pasture green
    //   * dry    — sun-bleached hay / bare-earth
    //   * moss   — damper north-facing forest floor
    //   * peat   — small dark humid patches
    //   * gravel — pale sand / gravel scatter near paths
    // The low-freq octave controls the biome (moss vs dry / green vs
    // peat), the mid-freq octave adds patch structure, the high-freq
    // octave gives sub-metre grain that reads as tussocks and worn
    // path fringes at close zoom.
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color('#79806b');
    const dry = new THREE.Color('#8a7a5e');
    const moss = new THREE.Color('#6a7561');
    const peat = new THREE.Color('#4f4d3d');
    const gravel = new THREE.Color('#a89f88');
    const tmp = new THREE.Color();

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
      // Low-frequency biome noise — moss vs dry across ~50 m patches.
      const nLow =
        Math.sin(x * 0.019) * Math.cos(z * 0.023) * 0.55 +
        Math.sin(x * 0.007 + 2.1) * Math.cos(z * 0.005 - 1.3) * 0.45;
      // Mid-frequency structure — 5–10 m sub-patches within a biome.
      const nMid =
        Math.sin(x * 0.081 + 3.4) * Math.cos(z * 0.093 + 0.5) * 0.55;
      // High-frequency grain — sub-metre worn tussocks / scuffed dirt.
      const nHigh =
        Math.sin(x * 0.31 + 5.1) * Math.cos(z * 0.34 - 2.2) * 0.28;

      tmp.copy(base);
      const biome = nLow > 0 ? dry : moss;
      tmp.lerp(biome, Math.min(0.42, Math.abs(nLow) * 0.55));

      // Rare small darker peat patches when mid + low agree strongly.
      if (nLow < -0.55 && nMid < -0.2) {
        tmp.lerp(peat, Math.min(0.35, Math.abs(nLow + nMid) * 0.25));
      }
      // Rare pale gravel/dirt scuffs on the high-frequency band.
      if (nHigh > 0.18 && nMid > 0.15) {
        tmp.lerp(gravel, Math.min(0.35, (nHigh + nMid) * 0.35));
      }

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
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
