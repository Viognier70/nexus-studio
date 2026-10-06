// ORDER 302d (Anders 2026-10-06) — alla figurer på gatan tar scenens ljus och
// har en lägsta ljushet på kvällen.
//
// ORDER 302c fann att gatans figurer ritades på två sätt: gästerna i
// VillageLife var oupplysta (MeshBasicMaterial) och låg över bandet, byns
// fotgängare och folket vid landmärkena tog ljus och blev mörkare än marken.
// Nu tar alla ljus (MeshStandardMaterial), och kroppen lyser på kvällen minst
// med en andel av sin egen färg:
//
//   outgoingLight = max(outgoingLight, diffuseColor.rgb * golv * andel)
//
//   - golv: streetFigureFloor.value, STREET_FIGURE_LIGHT.minLight
//     (village/villageEvening.ts, platshållare tills Design levererar värdet)
//     medan byns kvällsljus är tänt (EveningLighting.tsx), annars 0;
//   - andel: 1 för gatans figurer; för vinbarens riggar gatans andel i bytet
//     vid dörren (guestLooks.ts applyStreetBlend), så att kön utanför har
//     golvet och gästerna i rummet inte har det.
// Golvet läggs före tonmappningen och dimman, som scenens eget ljus.
// diffuseColor är materialets färg gånger instansens färg och kartan, så att
// varje figur behåller sin kulör. Där ljuset redan är starkare än golvet
// (under en lykta, på dagen) ändras ingenting.

import * as THREE from 'three';

/** Kvällens golv, delat av alla gatans figurer (0 utanför kvällsljuset). */
export const streetFigureFloor = { value: 0 };

/** Raden som läggs in i fragmentskuggaren, före opaque_fragment. */
export const STREET_FLOOR_GLSL = 'outgoingLight = max( outgoingLight, diffuseColor.rgb * streetFigureFloor * streetFigureShare );';

type LitMaterial = THREE.MeshStandardMaterial | THREE.MeshLambertMaterial | THREE.MeshPhongMaterial;

/** Materialets andel av golvet (1 på gatan). */
export interface StreetFloorShare { value: number }

/** Om materialet bär golvet (för testerna och mätningen). */
export function hasStreetFloor(mat: THREE.Material): boolean {
  return !!(mat.userData && mat.userData.streetFigureShare);
}

/** Andelen ett material med golvet har (null utan golvet). */
export function streetFloorShareOf(mat: THREE.Material): StreetFloorShare | null {
  return (mat.userData?.streetFigureShare as StreetFloorShare | undefined) ?? null;
}

/**
 * Lägger kvällens golv på ett upplyst material. share är materialets andel
 * (förval 1); samma objekt kan delas av flera material (en riggs alla delar).
 * Ett material som redan har golvet får den nya andelen.
 */
export function withStreetFloor<T extends LitMaterial>(mat: T, share: StreetFloorShare = { value: 1 }): T {
  if (hasStreetFloor(mat)) {
    if (mat.userData.streetFigureShare !== share) {
      mat.userData.streetFigureShare = share;
      mat.needsUpdate = true;
    }
    return mat;
  }
  mat.userData.streetFigureShare = share;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    shader.uniforms.streetFigureFloor = streetFigureFloor;
    shader.uniforms.streetFigureShare = mat.userData.streetFigureShare as StreetFloorShare;
    shader.fragmentShader = patchStreetFloor(shader.fragmentShader);
  };
  const prevKey = mat.customProgramCacheKey.bind(mat);
  mat.customProgramCacheKey = () => `${prevKey()}|streetFigureFloor`;
  mat.needsUpdate = true;
  return mat;
}

/** Fragmentskuggaren med golvet (uniformerna och raden före opaque_fragment). */
export function patchStreetFloor(fragmentShader: string): string {
  if (fragmentShader.includes('streetFigureFloor')) return fragmentShader;
  return fragmentShader
    .replace('void main() {', 'uniform float streetFigureFloor;\nuniform float streetFigureShare;\nvoid main() {')
    .replace('#include <opaque_fragment>', `${STREET_FLOOR_GLSL}\n\t#include <opaque_fragment>`);
}

/** Ett nytt upplyst material för en figur på gatan, med golvet. */
export function streetFigureMaterial(params: THREE.MeshStandardMaterialParameters = {}, share?: StreetFloorShare): THREE.MeshStandardMaterial {
  return withStreetFloor(new THREE.MeshStandardMaterial({ roughness: 0.85, ...params }), share);
}

/** Hela golvet: andelen för gatans figurer (delas av alla, ändras inte). */
export const FULL_STREET_SHARE: StreetFloorShare = { value: 1 };

/** Ref för ett material i JSX (<meshStandardMaterial ref={streetFloorRef} />): lägger golvet när materialet skapas. */
export function streetFloorRef(mat: LitMaterial | null): void {
  if (mat) withStreetFloor(mat, FULL_STREET_SHARE);
}

/** Lägger golvet på alla upplysta material under en rigg (kroppen, tecknen, frisyren, ansiktet, rekvisitan), med samma andel. */
export function withStreetFloorOnTree(root: THREE.Object3D, share: StreetFloorShare): number {
  let n = 0;
  root.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshPhongMaterial) {
        withStreetFloor(m, share);
        n++;
      }
    }
  });
  return n;
}
