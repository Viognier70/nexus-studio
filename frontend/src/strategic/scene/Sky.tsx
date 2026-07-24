import { useMemo } from 'react';
import * as THREE from 'three';

// Large inverted vertex-coloured sphere used as the sky backdrop. Adds
// vertical gradient from cool zenith to warmer horizon, with a slightly
// darker ground-lit lower half so the horizon line reads even when the
// terrain is displaced. One extra draw call, no shader dependency, no
// runtime cost past construction.
//
// Radius sits comfortably inside the fog far-end so the sphere itself
// doesn't need to fight for the far pixel. `fog={false}` on the
// material keeps the sky immune to fog attenuation.

const SKY_RADIUS = 4200;

const COLOUR_ZENITH = new THREE.Color('#a5b0b7');   // cool Nordic zenith
const COLOUR_HORIZON = new THREE.Color('#cdc8ba');  // warmer haze band
const COLOUR_NADIR = new THREE.Color('#7a786d');    // ground-lit lower half

export function Sky() {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(SKY_RADIUS, 32, 20);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // Normalised latitude −1 (nadir) to +1 (zenith).
      const t = Math.max(-1, Math.min(1, y / SKY_RADIUS));
      if (t >= 0) {
        // Above horizon: sharper falloff near the horizon so the warm
        // band stays thin and the cool zenith dominates the upper sky.
        const k = Math.pow(t, 0.55);
        tmp.copy(COLOUR_HORIZON).lerp(COLOUR_ZENITH, k);
      } else {
        // Below horizon: shorter fade to the darker nadir.
        const k = Math.pow(-t, 0.9);
        tmp.copy(COLOUR_HORIZON).lerp(COLOUR_NADIR, k);
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshBasicMaterial
        vertexColors
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
      />
    </mesh>
  );
}
