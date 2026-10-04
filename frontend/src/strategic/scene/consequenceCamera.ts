// ORDER 299 (Vision Owner 2026-10-03): "Kameran stannar 3–4 sekunder på
// bordet." Designs konsekvensögonblick (D1 §6, guestMood.ts CONSEQUENCE):
//   0–0,45 s    kameran står kvar på raketens avstånd (kortet blir grönt eller rött);
//   0,45–1,45 s in till 7 m och sänks (rätt: en mjuk båge, 35°; fel: rakt in
//               från 0,6 s, 40°);
//   1,45–2,3 s  står still på 7 m, ansiktena syns;
//   2,3–3,8 s   långsamt in till 5,5 m (beslut 2026-10-03: huvudena förstoras inte);
//   därefter    tillbaka: spelets kamera tar över igen (theatreStage eller manuset).
// Bordet ramas på frameX av bredden (62 %), eftersom kortet står till vänster.

import type { MutableRefObject } from 'react';
import type { CameraTarget, ConsequenceMoment } from '../types';
import { CONSEQUENCE } from './guestMood';
import { fovForDistance } from '../camera/eveningLevels';

const SAME_ANSWER_SIM_S = 1;

const easeOutCubic = (u: number) => 1 - Math.pow(1 - u, 3);
const easeInOutSine = (u: number) => -(Math.cos(Math.PI * u) - 1) / 2;
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));

/** Fokus som lägger punkten på frameX av skärmens bredd (0,5 = mitten). */
export function framedFocus(point: { x: number; z: number }, distance: number, yaw: number, aspect: number, frameX: number): { x: number; z: number } {
  // ORDER 297 — synfältet på avståndet (CameraController apply(), eveningLevels.ts).
  const halfWidth = distance * Math.tan((fovForDistance(distance) * Math.PI) / 360) * aspect;
  const w = (frameX - 0.5) * 2 * halfWidth;
  // Skärmens högerriktning i golvplanet för kameran i apply(): (cos yaw, −sin yaw).
  return { x: point.x - Math.cos(yaw) * w, z: point.z + Math.sin(yaw) * w };
}

// Ögonblicket ligger som ett lager över spelets kamera: före spelets egen
// kameralogik varje bildruta läggs målet tillbaka till det spelet hade
// (restore), och efter den sparas det och ögonblicket läggs ovanpå (update).
// När ögonblicket är slut står spelets mål kvar, och kameran glider dit.
export class ConsequenceCamera {
  private key: number | null = null;
  private start: CameraTarget | null = null;
  private under: CameraTarget | null = null;

  restore(target: MutableRefObject<CameraTarget>): void {
    if (this.under) target.current = { ...this.under, focus: { ...this.under.focus } };
    this.under = null;
  }

  /** Sätter kamerans mål under ögonblicket. Returnerar true medan det pågår. */
  update(target: MutableRefObject<CameraTarget>, c: ConsequenceMoment | null | undefined, elapsed: number | null, point: { x: number; z: number } | null, aspect: number, reducedMotion: boolean): boolean {
    if (!c || elapsed === null || elapsed >= CONSEQUENCE.durationS || !point) return false;
    // Samma svar kan komma med två tider (React lägger om uppdateringen på köade
    // TICK när spelet går fort); inom en simsekund är det samma ögonblick.
    if (this.key === null || Math.abs(this.key - c.at) > SAME_ANSWER_SIM_S) { this.start = { ...target.current, focus: { ...target.current.focus } }; }
    this.key = c.at;
    this.under = { ...target.current, focus: { ...target.current.focus } };
    const s0 = this.start!;
    const cam = CONSEQUENCE.camera;
    const right = c.kind === 'right';
    const mode = right ? cam.right : cam.wrong;
    const inFrom = cam.inFrom + (right ? 0 : cam.wrong.delayS);
    const uIn = reducedMotion ? (elapsed >= inFrom ? 1 : 0) : clamp01((elapsed - inFrom) / (cam.inTo - inFrom));
    const kIn = right ? easeOutCubic(uIn) : easeInOutSine(uIn);
    const uClose = reducedMotion ? 0 : clamp01((elapsed - cam.closeFrom) / (cam.closeTo - cam.closeFrom));
    const distance = s0.distance + (cam.nearM - s0.distance) * kIn + (cam.closeM - cam.nearM) * easeInOutSine(uClose);
    const yaw = s0.yaw + mode.arcYawRad * kIn;
    const pitch = s0.pitch + (mode.pitchRad - s0.pitch) * kIn;
    const aimed = framedFocus(point, distance, yaw, aspect, CONSEQUENCE.frameX.oneTable);
    const focus = { x: s0.focus.x + (aimed.x - s0.focus.x) * kIn, z: s0.focus.z + (aimed.z - s0.focus.z) * kIn };
    target.current = { ...target.current, focus, distance, yaw, pitch };
    return true;
  }
}
