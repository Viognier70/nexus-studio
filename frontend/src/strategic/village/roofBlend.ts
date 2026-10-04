// ORDER 297 — krogens nivå: taket försvinner och teatern tar över (Designs
// leverans Byn i kvällsljus, andra omtaget §5, BLEND.roof = [26, 40] m):
//   - över 40 m ligger taket på (byns takfärg, teatern visar det aldrig);
//   - 40 → 26 m lyfts det upp till ROOF_LIFT_M och tonar ut;
//   - under 33 m (taket under halva) kapas väggarna på kamerans sida med
//     updateCutaway, som i teatern;
//   - ett scenljus rakt ovanför rummet, svagare när krogen är stängd och
//     starkare när den har öppet.
// Väggarna förblir opaka (förut tonade hela skalet mellan 28 och 52 m).
// Renderregeln (ORDER 055): taket kastar skugga bara när det skriver djup.

import * as THREE from 'three';
import type { WineBarRoom } from '../scene/wineBarRoom';
import { BLEND } from './villageEvening';

export const ROOF_LIFT_M = 5;
const VILLAGE_ROOF = '#4a3426';
const DEPTH_FROM = 0.95;
/** Under det här värdet på taket kapas väggarna (byKvall.js: rk < 0,5). */
export const CUT_BELOW = 0.5;
export const STAGE_LIGHT = { heightM: 17, intensity: 55, distance: 40, angle: 0.8, penumbra: 0.75, decay: 1.1, closed: 0.15, prep: 0.45, open: 0.4 };

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Takets värde på ett kameraavstånd: 1 = helt på, 0 = borta (teatern). */
export function roofAt(distance: number): number {
  return smooth(BLEND.roof[0], BLEND.roof[1], distance);
}

export function applyWineBarRoof(room: WineBarRoom, rk: number): void {
  const roof = room.parts.roof;
  if (roof.userData.baseY === undefined) {
    roof.userData.baseY = roof.position.y;
    // Eget material i byns takfärg, så att inget annat i rummet tonas med taket.
    roof.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color: VILLAGE_ROOF, roughness: 0.85, transparent: true });
    });
  }
  roof.visible = rk > 0.01;
  roof.position.y = (roof.userData.baseY as number) + (1 - rk) * ROOF_LIFT_M;
  const solid = rk > DEPTH_FROM;
  roof.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.opacity = rk;
    mat.depthWrite = solid;
    m.castShadow = solid;
  });
}

/** Scenljusets styrka: tonar in när taket lyfts, efter krogens läge. */
export function stageLightIntensity(rk: number, open: number, busy: number): number {
  const s = STAGE_LIGHT;
  return s.intensity * Math.pow(1 - rk, 1.5) * (s.closed + s.prep * busy + s.open * open);
}
