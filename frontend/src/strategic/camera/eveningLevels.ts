// ORDER 297 — byns fyra nivåer ur Designs leverans (village/villageEvening.ts
// LEVELS, andra omtaget): byn 660 m och kvarteret 90 m i byns ram, gatan 42 m
// och krogen 24 m i rummets ram, så att krogens nivå är teaterns kamera och
// kön inte hoppar när teatern tar över. Rummets ram är spelarens rum som
// interiorLayout.ts placerar det (entrén som data, venueEntrance.ts).
// Synfältet går från 34° ute till 42° vid krogen, logaritmiskt på avståndet.

import type { CameraTarget } from '../types';
import { computePlayerBusinessInterior } from '../business/interiorLayout';
import { BLEND, LEVELS, type LevelId, type LevelSpec } from '../village/villageEvening';

const ROOM = computePlayerBusinessInterior();

// ORDER 300 §7 (Anders 2026-10-04): "På gatunivån syns spelarens krog
// tydligt och skylten går att läsa i 1280 × 720." Med rummet vänt mot Torget
// (ORDER 297) låg krogen uppe till vänster under HUD:en med Designs mål
// [9, −2]; målet flyttas till krogen. Designs fil (villageEvening.ts) är
// oförändrad; avvikelsen står här.
const TARGET_OVERRIDE: Partial<Record<LevelId, [number, number]>> = { street: [0, 0] };

/** En nivås mål och vridning i byns ram (Designs byKvall.js toWorld/worldOf). */
export function levelTarget(lv: LevelSpec): CameraTarget {
  if (lv.frame === 'world' || !ROOM) return { focus: { x: lv.target[0], z: lv.target[1] }, distance: lv.dist, yaw: lv.yaw, pitch: lv.pitch };
  const a = ROOM.worldAngle;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const [lx, lz] = TARGET_OVERRIDE[lv.id] ?? lv.target;
  const ox = Math.sin(lv.yaw);
  const oz = Math.cos(lv.yaw);
  return {
    focus: { x: ROOM.centre[0] + c * lx - s * lz, z: ROOM.centre[1] + s * lx + c * lz },
    distance: lv.dist,
    yaw: Math.atan2(c * ox - s * oz, s * ox + c * oz),
    pitch: lv.pitch
  };
}

export function levelById(id: LevelId): LevelSpec {
  return LEVELS.find((l) => l.id === id)!;
}

/** Synfältet på ett avstånd: logaritmiskt mellan nivåerna, utanför dem nivåns eget. */
export function fovForDistance(d: number): number {
  const L = LEVELS;
  if (d >= L[0].dist) return L[0].fov;
  if (d <= L[L.length - 1].dist) return L[L.length - 1].fov;
  let i = 0;
  while (i < L.length - 2 && d < L[i + 1].dist) i++;
  const a = L[i];
  const b = L[i + 1];
  const k = Math.max(0, Math.min(1, Math.log(a.dist / d) / Math.log(a.dist / b.dist)));
  return a.fov + (b.fov - a.fov) * k;
}

/** Nivån närmast ett avstånd (logaritmiskt), för nivåknapparna. */
export function nearestLevel(d: number): LevelId {
  let best = LEVELS[0];
  for (const lv of LEVELS) if (Math.abs(Math.log(d / lv.dist)) < Math.abs(Math.log(d / best.dist))) best = lv;
  return best.id;
}

/** Hjulets yttre gräns (Designs BLEND.zoom). */
export const ZOOM_MAX_M = BLEND.zoom[1];
