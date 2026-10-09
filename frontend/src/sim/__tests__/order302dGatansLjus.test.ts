// ORDER 302d (Anders 2026-10-06) — alla figurer på gatan tar scenens ljus och
// har en lägsta ljushet på kvällen (scene/village/streetFigureLight.ts,
// STREET_FIGURE_LIGHT i village/villageEvening.ts, platshållare tills Design
// levererar värdet).
//
// 1. Golvet i skuggaren: raden före opaque_fragment i standard- och
//    lambertmaterialets fragmentskuggare, uniformerna delade.
// 2. Varje sorts figur på gatan: gästerna (VillageLife makeInstanced), byns
//    fotgängare och cyklister (OsmPedestrians), folket vid landmärkena
//    (LandmarkGatherers) och kön utanför (vinbarens riggar, WineBarFigures)
//    har upplysta material med golvet. Inga oupplysta figurer kvar.
// 3. Riggarna: golvets andel följer bytet vid dörren (1 på gatan, 0 i rummet).
// 4. Kvällsljuset sätter golvet (EveningLighting.tsx), och startvärdet är det
//    som scripts/order302d-startvarde.mjs räknat ut (reports/order302d/startvarde.json).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  FULL_STREET_SHARE,
  hasStreetFloor,
  patchStreetFloor,
  STREET_FLOOR_GLSL,
  streetFigureFloor,
  streetFigureMaterial,
  streetFloorRef,
  streetFloorShareOf,
  withStreetFloor,
  withStreetFloorOnTree
} from '../../strategic/scene/village/streetFigureLight';
import { STREET_FIGURE_LIGHT } from '../../strategic/village/villageEvening';
import { makeInstanced } from '../../strategic/scene/village/VillageLife';
import { streetHeadGeometry, streetSignGeometry, streetTorsoGeometry } from '../../strategic/scene/village/streetLooks';
import { streetLegGeometry } from '../../strategic/scene/village/streetGait';
import { createFigureRig } from '../../strategic/scene/figureRig';
import { attachProps } from '../../strategic/scene/figureProps';
import { applyStreetBlend, dressAllGroups, GROUP_IDS } from '../../strategic/scene/guestLooks';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../..');
const FRONTEND = resolve(SRC, '..');
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8');

/** Kompilerar materialets skuggare som three gör (onBeforeCompile på en kopia av ShaderLib). */
function compile(mat: THREE.Material, lib: 'standard' | 'lambert' = 'standard') {
  const shader = {
    uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib[lib].uniforms) as Record<string, { value: unknown }>,
    vertexShader: THREE.ShaderLib[lib].vertexShader,
    fragmentShader: THREE.ShaderLib[lib].fragmentShader
  };
  mat.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  return shader;
}

describe('ORDER 302d — golvet i skuggaren', () => {
  it('raden ligger före opaque_fragment, med uniformerna, i standard och lambert', () => {
    for (const lib of ['standard', 'lambert'] as const) {
      const fs = patchStreetFloor(THREE.ShaderLib[lib].fragmentShader);
      expect(fs).toContain('uniform float streetFigureFloor;');
      expect(fs).toContain('uniform float streetFigureShare;');
      expect(fs.indexOf(STREET_FLOOR_GLSL)).toBeGreaterThan(fs.indexOf('vec3 outgoingLight'));
      expect(fs.indexOf(STREET_FLOOR_GLSL)).toBeLessThan(fs.indexOf('#include <opaque_fragment>'));
      // Golvet räknas på materialets färg gånger instansens (color_fragment före).
      expect(fs.indexOf('#include <color_fragment>')).toBeLessThan(fs.indexOf(STREET_FLOOR_GLSL));
      // En gång.
      expect(patchStreetFloor(fs)).toBe(fs);
    }
  });

  it('materialet delar kvällens golv och har sin egen andel', () => {
    const a = streetFigureMaterial({ color: '#7f9e6c' });
    const share = { value: 0.25 };
    const b = withStreetFloor(new THREE.MeshLambertMaterial(), share);
    const sa = compile(a);
    const sb = compile(b, 'lambert');
    expect(a).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(sa.uniforms.streetFigureFloor).toBe(streetFigureFloor);
    expect(sb.uniforms.streetFigureFloor).toBe(streetFigureFloor);
    expect((sa.uniforms.streetFigureShare as { value: number }).value).toBe(1);
    expect(sb.uniforms.streetFigureShare).toBe(share);
    expect(sa.fragmentShader).toContain(STREET_FLOOR_GLSL);
    expect(a.customProgramCacheKey()).toContain('streetFigureFloor');
    // Samma material två gånger: en patch.
    withStreetFloor(a, a.userData.streetFigureShare);
    expect(compile(a).fragmentShader.split(STREET_FLOOR_GLSL).length).toBe(2);
    // Ref:en i JSX använder den delade andelen 1.
    const c = new THREE.MeshStandardMaterial();
    streetFloorRef(c);
    expect(streetFloorShareOf(c)).toBe(FULL_STREET_SHARE);
    expect(FULL_STREET_SHARE.value).toBe(1);
  });
});

describe('ORDER 302d — varje sorts figur på gatan tar ljus och har golvet', () => {
  it('gatans gäster (VillageLife): kroppen, benen, huvudet och tecknen', () => {
    const meshes = [
      makeInstanced(streetTorsoGeometry()),
      // ORDER 323 §6 — benen som två instanser (streetGait.ts), samma material.
      makeInstanced(streetLegGeometry(0.095, 0.51)),
      makeInstanced(streetHeadGeometry(), '#d9b48a'),
      ...GROUP_IDS.map((g) => makeInstanced(streetSignGeometry(g)))
    ];
    for (const m of meshes) {
      const mat = m.material as THREE.Material;
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(hasStreetFloor(mat)).toBe(true);
      expect(streetFloorShareOf(mat)!.value).toBe(1);
      // Upplyst kräver normaler.
      expect(m.geometry.attributes.normal).toBeDefined();
      const n = m.geometry.attributes.normal.array as Float32Array;
      let zero = 0;
      for (let i = 0; i < n.length; i += 3) if (Math.hypot(n[i], n[i + 1], n[i + 2]) < 0.5) zero++;
      expect(zero).toBe(0);
    }
    // Undantaget för de oupplysta gästerna är borta.
    const src = read('strategic/scene/village/VillageLife.tsx');
    const fn = src.slice(src.indexOf('export function makeInstanced'), src.indexOf('export function VillageLife'));
    expect(fn).toContain('streetFigureMaterial(');
    expect(fn).not.toMatch(/MeshBasicMaterial/);
  });

  it('fotgängarna, cyklisterna och folket vid landmärkena: varje material har golvet', () => {
    for (const file of ['strategic/scene/OsmPedestrians.tsx', 'strategic/scene/LandmarkGatherers.tsx']) {
      const src = read(file);
      expect(src).not.toMatch(/MeshBasicMaterial|meshBasicMaterial/);
      // Inga upplysta material utan golvet.
      expect(src).not.toMatch(/new THREE\.MeshStandardMaterial\(/);
      const jsx = src.match(/<meshStandardMaterial[\s\S]*?\/>/g) ?? [];
      expect(jsx.length).toBeGreaterThan(0);
      for (const m of jsx) expect(m).toMatch(/ref=\{streetFloorRef\}|streetFloorRef\(ref\)/);
    }
    // Cyklisterna: kroppen och huvudet.
    const peds = read('strategic/scene/OsmPedestrians.tsx');
    const cyc = peds.slice(peds.indexOf('{cyclists.map('));
    expect((cyc.match(/streetFloorRef/g) ?? []).length).toBe(2);
  });

  it('kön utanför (vinbarens riggar): alla upplysta material har golvet, andelen följer bytet vid dörren', () => {
    const rig = createFigureRig({ variant: 'guest', garmentColour: '#7a6a5a' });
    attachProps(rig, { headTopping: 'workCap' });
    const dressed = dressAllGroups(rig, 0);
    const n = withStreetFloorOnTree(rig.root, dressed.lightShare);
    expect(n).toBeGreaterThanOrEqual(rig.materials.length);
    rig.root.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (mat instanceof THREE.MeshStandardMaterial) expect(streetFloorShareOf(mat)).toBe(dressed.lightShare);
    });
    applyStreetBlend(rig, dressed, 1);
    expect(dressed.lightShare.value).toBe(1);
    applyStreetBlend(rig, dressed, 0.5);
    expect(dressed.lightShare.value).toBe(0.5);
    applyStreetBlend(rig, dressed, 0);
    expect(dressed.lightShare.value).toBe(0);
    // I WineBarFigures läggs golvet på varje gästrigg.
    const src = read('strategic/scene/WineBarFigures.tsx');
    expect(src).toMatch(/withStreetFloorOnTree\(rig\.root, guestDressed\[i\]\.lightShare\)/);
  });
});

describe('ORDER 302d — kvällen och startvärdet', () => {
  it('kvällsljuset sätter golvet och släcker det när det tas bort', () => {
    const src = read('strategic/village/EveningLighting.tsx');
    expect(src).toMatch(/streetFigureFloor\.value = STREET_FIGURE_LIGHT\.minLight/);
    expect(src).toMatch(/streetFigureFloor\.value = 0/);
    expect(streetFigureFloor.value).toBe(0);
  });

  it('platshållaren är namngiven, märkt och lika med skriptets startvärde', () => {
    const src = read('strategic/village/villageEvening.ts');
    const at = src.indexOf('export const STREET_FIGURE_LIGHT');
    expect(src.slice(Math.max(0, at - 700), at)).toContain('värdet levereras av Design');
    expect(STREET_FIGURE_LIGHT.minLight).toBeGreaterThan(0);
    expect(STREET_FIGURE_LIGHT.minLight).toBeLessThanOrEqual(1);
    const file = resolve(FRONTEND, 'reports/order302d/startvarde.json');
    expect(existsSync(file)).toBe(true);
    const r = JSON.parse(readFileSync(file, 'utf8')) as { best: number; replicaCheck: Record<string, number> };
    expect(r.best).toBe(STREET_FIGURE_LIGHT.minLight);
    // Repliken av tonmappningen stämmer med de oupplysta gästerna i 302c (minLight 1).
    expect(Math.abs(r.replicaCheck['1.45'] - r.replicaCheck.measuredLifeBodyLMedian)).toBeLessThan(0.01);
  });
});
