// ORDER 299 (Vision Owner 2026-10-03, "Kamerastyrning … Lägg in gränser så
// att väggarna fortfarande skärs bort"). I krogen (kameran närmare än
// tonbandet där rummet syns) hålls fokus inom rummet och en kant runt det, och
// kameran står minst ROOM_CAMERA.pitchMinRad över golvet. Då står kameran
// alltid utanför eller över väggarna, och kapningen (wineBarRoom.ts
// updateCutaway) tar bort väggen mot kameran. Konsekvensögonblicket och
// händelsernas manus sätter kameran själva och går inte genom gränserna.

import type { CameraTarget } from '../types';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';

export const ROOM_CAMERA = {
  pitchMinRad: (30 * Math.PI) / 180,
  focusMarginM: 2,
  // Gränserna gäller när kameran tittar på krogen (fokus så här nära rummet),
  // inte när spelaren zoomar in över en annan byggnad i byn.
  atRoomWithinM: 30,
  // Rummet syns närmare än tonbandets yttre kant (som WineBarFigures).
  belowM: GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
  // Klick på ett bord: kameran glider dit, och närmare än så här går den inte av sig själv.
  tableDistanceM: 14
} as const;

/** Spelarens krog i världen (centrum och radien runt rummet), satt av HUD:en. */
export const roomCameraBounds: { current: { cx: number; cz: number; radius: number } | null } = { current: null };

/** Tittar kameran på krogen (närmare än tonbandet, fokus vid rummet)? */
export function atRoom(t: CameraTarget): boolean {
  const b = roomCameraBounds.current;
  return !!b && t.distance <= ROOM_CAMERA.belowM && Math.hypot(t.focus.x - b.cx, t.focus.z - b.cz) <= b.radius + ROOM_CAMERA.atRoomWithinM;
}

export function clampToRoom(t: CameraTarget): CameraTarget {
  const b = roomCameraBounds.current;
  if (!b || t.distance > ROOM_CAMERA.belowM) return t;
  const dx = t.focus.x - b.cx;
  const dz = t.focus.z - b.cz;
  const r = Math.hypot(dx, dz);
  if (r > b.radius + ROOM_CAMERA.atRoomWithinM) return t;
  const max = b.radius + ROOM_CAMERA.focusMarginM;
  const focus = r > max ? { x: b.cx + (dx / r) * max, z: b.cz + (dz / r) * max } : t.focus;
  return { ...t, focus, pitch: Math.max(ROOM_CAMERA.pitchMinRad, t.pitch) };
}
