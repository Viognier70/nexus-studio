import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BY_ID } from '../content/world';
import { createRng } from '../util/rng';

// Distant Bergslag forest ring.
//
// At village zoom the camera sits at ~500 m altitude and looks across
// the flat terrain toward the fog horizon at 3600 m. OSM forest
// polygons only cover the immediate village-scale bbox (~1500 m
// across); between the OSM forest edge and the fog line there is
// nothing but tinted terrain. That reads as "diorama on a table" —
// real Grythyttan sits inside a continuous Bergslag forest that
// stretches to every visible hill.
//
// This layer procedurally scatters simple dark conifer silhouettes in
// an annular ring around Torget (the village centre). The ring lives
// entirely inside the fog envelope so haze softens the silhouettes
// before they reach the horizon line. Distance-only makes the effect
// essentially invisible at district and business zoom, and free
// (two draw calls thanks to drei Instances).
//
// This is a documented derived rendering layer (see APPROXIMATION
// REGISTER). No real OSM data is invented — we do not name individual
// trees or claim species-level accuracy. The layer simply asserts
// that Grythyttan is surrounded by Bergslag forest, which is true.

// Ring is anchored on Torget (village centre) rather than the
// mathematical bbox of all roads: some OSM ways stretch several km
// from the village and would push a bbox-centred ring off-axis.
const RING_INNER = 700;    // just outside the built-up village
const RING_OUTER = 2200;   // well inside the 3600 m fog far-end
const RING_DENSITY = 1 / 6000;   // one silhouette per 6000 m²

interface DistantTree {
  x: number;
  z: number;
  scale: number;
  rot: number;
  // Small warm/cool tint band per tree so the ring reads as
  // biologically mixed rather than a single dark stripe.
  cool: boolean;
}

function ringPointOK(
  x: number,
  z: number,
  cx: number,
  cz: number
): boolean {
  const dx = x - cx;
  const dz = z - cz;
  const r = Math.hypot(dx, dz);
  return r >= RING_INNER && r <= RING_OUTER;
}

export function HorizonForest() {
  const trees = useMemo<DistantTree[]>(() => {
    const torget = LANDMARK_BY_ID['gry-torget']?.position ?? [0, 0];
    const cx = torget[0];
    const cz = torget[1];
    const side = RING_OUTER * 2;
    const ringArea =
      Math.PI * (RING_OUTER * RING_OUTER - RING_INNER * RING_INNER);
    const target = Math.round(ringArea * RING_DENSITY);
    const rng = createRng(0x1f0e57);
    const out: DistantTree[] = [];
    let attempts = 0;
    while (out.length < target && attempts < target * 4) {
      attempts++;
      const x = cx + rng.range(-side / 2, side / 2);
      const z = cz + rng.range(-side / 2, side / 2);
      if (!ringPointOK(x, z, cx, cz)) continue;
      out.push({
        x,
        z,
        // Scale sits between 3–8 so silhouettes read as trees, not
        // shrubs, from ~1500 m away. Bergslag hills carry mature
        // conifers at that distance.
        scale: rng.range(3.2, 7.8),
        rot: rng.range(0, Math.PI),
        cool: rng.range(0, 1) < 0.6
      });
    }
    return out;
  }, []);

  if (trees.length === 0) return null;
  const cool = trees.filter((t) => t.cool);
  const warm = trees.filter((t) => !t.cool);

  return (
    <group>
      {/* Cool distant conifers — dominant, deep Bergslag pine tone. */}
      {cool.length > 0 && (
        <Instances limit={cool.length} range={cool.length}>
          <coneGeometry args={[1.0, 3.6, 6]} />
          <meshStandardMaterial color="#3a4a3f" roughness={1} />
          {cool.map((t, i) => (
            <Instance
              key={`hc${i}`}
              position={[t.x, 1.8 * t.scale, t.z]}
              scale={t.scale}
              rotation={[0, t.rot, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Warm distant broadleaf — sparser, warmer green so the ring
          reads as mixed forest rather than a monoculture stripe. */}
      {warm.length > 0 && (
        <Instances limit={warm.length} range={warm.length}>
          <coneGeometry args={[1.15, 3.2, 6]} />
          <meshStandardMaterial color="#4d5842" roughness={1} />
          {warm.map((t, i) => (
            <Instance
              key={`hw${i}`}
              position={[t.x, 1.6 * t.scale, t.z]}
              scale={t.scale}
              rotation={[0, t.rot, 0]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
