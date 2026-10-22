import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { WORLD_BOUNDS } from '../content/world';
import { openingGroundRgb, useOpeningGround } from '../opening/openingGround';
import { SUMMER_GROUND, useVisibleSeason } from '../village/summer';
import { cellarHoleWorld } from './premisesInterior';
import { currentPremises } from '../content/playerPremises';

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
// Höstens mark (förut den enda).
const AUTUMN_GROUND = { base: '#79806b', dry: '#8a7a5e', moss: '#6a7561', peat: '#4f4d3d', gravel: '#a89f88' } as const;

// Markens färg i en punkt (förut inne i OsmTerrain): biomen, fläckarna och gruset ur tre oktaver brus.
type Palette = { base: THREE.Color; dry: THREE.Color; moss: THREE.Color; peat: THREE.Color; gravel: THREE.Color };
function paletteOf(G: { base: string; dry: string; moss: string; peat: string; gravel: string }): Palette {
  return { base: new THREE.Color(G.base), dry: new THREE.Color(G.dry), moss: new THREE.Color(G.moss), peat: new THREE.Color(G.peat), gravel: new THREE.Color(G.gravel) };
}
function groundColour(x: number, z: number, P: Palette, tmp: THREE.Color): THREE.Color {
  const { base, dry, moss, peat, gravel } = P;
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
  return tmp;
}

// ORDER 336 B — hålet för källaren (scene/premisesInterior.ts cellarHoleWorld): rutorna i marken som hålet berör tas bort
// och ersätts av en lapp med hålet, i markens höjd 0 och med samma färger.
function holePatch(geo: THREE.BufferGeometry, hole: [number, number][], cx: number, cz: number, P: Palette): THREE.BufferGeometry {
  const N = 120, CELL = 100, x0 = cx - 6000, z0 = cz - 6000;
  const xs = hole.map((p) => p[0]), zs = hole.map((p) => p[1]);
  const ix0 = Math.floor((Math.min(...xs) - x0) / CELL), ix1 = Math.floor((Math.max(...xs) - x0) / CELL);
  const iz0 = Math.floor((Math.min(...zs) - z0) / CELL), iz1 = Math.floor((Math.max(...zs) - z0) / CELL);
  const index = geo.index!.array as ArrayLike<number>;
  const kept: number[] = [];
  for (let k = 0; k < N * N; k++) {
    const ix = k % N, iz = Math.floor(k / N);
    if (ix >= ix0 && ix <= ix1 && iz >= iz0 && iz <= iz1) continue;
    for (let q = 0; q < 6; q++) kept.push(index[k * 6 + q]);
  }
  geo.setIndex(kept);
  const X0 = x0 + ix0 * CELL, X1 = x0 + (ix1 + 1) * CELL, Z0 = z0 + iz0 * CELL, Z1 = z0 + (iz1 + 1) * CELL;
  const shape = new THREE.Shape([new THREE.Vector2(X0, -Z0), new THREE.Vector2(X1, -Z0), new THREE.Vector2(X1, -Z1), new THREE.Vector2(X0, -Z1)]);
  shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))));
  const patch = new THREE.ShapeGeometry(shape);
  patch.rotateX(-Math.PI / 2);
  const pp = patch.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pp.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < pp.count; i++) { groundColour(pp.getX(i), pp.getZ(i), P, tmp); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b; }
  patch.setAttribute('color', new THREE.BufferAttribute(col, 3));
  patch.computeVertexNormals();
  return patch;
}

export function OsmTerrain() {
  // ORDER 308c — under öppningen markens färg mot Designs (openingGround.ts);
  // spelets färger per hörn sparas och läggs tillbaka när öppningen slutar.
  const opening = useOpeningGround();
  // ORDER 333 C — sommarens mark (village/summer.ts SUMMER_GROUND); hösten bakom DEV-växeln J.
  const season = useVisibleSeason();
  const { geometry, gameColours, patch, patchColours } = useMemo(() => {
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
    const G = season === 'summer' ? SUMMER_GROUND : AUTUMN_GROUND;
    const P = paletteOf(G);
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
      groundColour(x, z, P, tmp);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    // ORDER 336 B — källaren under gatan: hål i marken (scenen monteras om när lokalen byts, StrategicApp key).
    const hole = cellarHoleWorld(currentPremises());
    const patch = hole ? holePatch(geo, hole, cx, cz, P) : null;
    return { geometry: geo, gameColours: colors.slice(), patch, patchColours: patch ? (patch.attributes.color.array as Float32Array).slice() : null };
  }, [season]);

  useEffect(() => () => { geometry.dispose(); patch?.dispose(); }, [geometry, patch]);

  useEffect(() => {
    const attr = geometry.attributes.color as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    arr.set(gameColours);
    if (opening) openingGroundRgb(arr);
    attr.needsUpdate = true;
    if (patch && patchColours) {
      const pa = patch.attributes.color as THREE.BufferAttribute;
      (pa.array as Float32Array).set(patchColours);
      if (opening) openingGroundRgb(pa.array as Float32Array);
      pa.needsUpdate = true;
    }
  }, [opening, geometry, gameColours, patch, patchColours]);

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {patch && (
        <mesh geometry={patch} name="terrainCellarPatch">
          <meshStandardMaterial vertexColors roughness={1} />
        </mesh>
      )}
    </>
  );
}
