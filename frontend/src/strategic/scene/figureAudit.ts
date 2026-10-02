// ORDER 292b — ingen figur ligger ned eller sitter utan sits (provspel av
// e079883: "En figur ligger på golvet nere till höger vid väggen när servicen
// börjar").
//
// Mätningen läser riggarna som ritas (samma Object3D som scenen), inte
// regissörens tal: huvudets och höftens höjd över golvet i världen. En figur
// räknas som
//   - liggande när huvudet är lägre än HEAD_MIN_M över golvet (stående
//     omkring 1,6 m, sittande omkring 1,2 m);
//   - sittande utan sits när höften är lägre än PELVIS_MIN_M över golvet och
//     figuren inte sitter på en sits (regissörens seated och en stol).
// Resultatet skrivs i body.dataset.figuresDown (JSON: antal och figurerna),
// så att produktionsbyggets skript (scripts/order292b-figures.mjs) kan läsa
// det under en hel kväll.

import * as THREE from 'three';
import type { FigureRig } from './figureRig';
import type { FigureSample } from './wineBarDirector';

export const HEAD_MIN_M = 0.9;
export const PELVIS_MIN_M = 0.35;
// ORDER 295 — den som sitter på en sits ligger inte ned förrän huvudet är under
// 0,7 m: en kort gäst i loungen (dynan 0,38 m) har huvudet på 0,90 m.
export const HEAD_MIN_SEATED_M = 0.7;

export interface FigureFault {
  kind: 'guest' | 'staff';
  id: string;
  fault: 'lying' | 'floorSitting';
  pose: string;
  clip: string | null;
  headY: number;
  pelvisY: number;
  seated: boolean;
  hasSeat: boolean;
  x: number;
  z: number;
}

const v = new THREE.Vector3();

export function auditRig(rig: FigureRig, floorY: number, sample: FigureSample, kind: 'guest' | 'staff', id: string, clip: string | null, hasSeat: boolean): FigureFault | null {
  if (!rig.root.visible || !sample.visible) return null;
  rig.joints.head.getWorldPosition(v);
  const headY = v.y - floorY;
  rig.joints.pelvis.getWorldPosition(v);
  const pelvisY = v.y - floorY;
  const x = v.x;
  const z = v.z;
  const onSeat = sample.seated && hasSeat;
  const fault = headY < (onSeat ? HEAD_MIN_SEATED_M : HEAD_MIN_M) ? 'lying' : !onSeat && pelvisY < PELVIS_MIN_M ? 'floorSitting' : null;
  if (!fault) return null;
  const r = (n: number) => Math.round(n * 100) / 100;
  return { kind, id, fault, pose: sample.pose, clip, headY: r(headY), pelvisY: r(pelvisY), seated: sample.seated, hasSeat, x: r(x), z: r(z) };
}

export function publishFaults(faults: FigureFault[]): void {
  if (typeof document === 'undefined') return;
  document.body.dataset.figuresDown = JSON.stringify({ n: faults.length, faults: faults.slice(0, 8) });
}
