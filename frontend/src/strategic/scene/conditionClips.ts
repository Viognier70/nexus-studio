// ORDER 309 — personalens läge i klippen (Designs D5 §2 och §7):
//   - staff.tiredIdle när orken är slut och personen står still;
//   - staff.hesitate när en raket kräver ett kunskapsområde som personalen
//     saknar (ORDER 303 E: tvekan), i början av varje steg, hos den som har
//     området som sin roll (vin: sommeliern, mat: kocken, service: servitören).
// Rena funktioner; theatreStage.ts spelar klippet.

import type { StaminaId } from './staffStatus';
import type { StaffKey } from './wineBarDirector';
import { CLIPS } from './figureClips';

/** Poserna där personen står still (regissörens prov). */
const STILL = new Set(['idle', 'nod', 'attend']);
/** Poserna där tvekan inte avbryter (personen går eller bär). */
const MOVING = new Set(['walk', 'serveWalk', 'carry', 'arrive', 'hidden']);

/** Vem i rummet som tvekar när området saknas (spelets områden, balance.ts STAFF_CONDITION). */
export const HESITATOR_OF: Record<string, StaffKey> = { vin: 'sommelier', mat: 'cook', service: 'server' };

export const HESITATE_SECONDS = CLIPS['staff.hesitate'].seconds.normal;

export interface ConditionInput {
  stamina: StaminaId | null;
  /** Sekunder sedan tvekan började (stegets början), eller null. */
  hesitateAt: number | null;
}

/** Klippet personen ska spela i stället för regissörens, eller null när regissörens gäller. */
export function conditionClip(pose: string, carrying: boolean, c: ConditionInput): { id: string; time: number | null } | null {
  if (c.hesitateAt !== null && c.hesitateAt >= 0 && c.hesitateAt < HESITATE_SECONDS && !MOVING.has(pose) && !carrying) {
    return { id: 'staff.hesitate', time: c.hesitateAt };
  }
  if (c.stamina === 'spent' && STILL.has(pose) && !carrying) return { id: 'staff.tiredIdle', time: null };
  return null;
}

/** Sekunder sedan stegets nedräkning började, för den som tvekar (annars null). */
export function hesitationElapsed(
  key: StaffKey,
  rocket: { backed?: boolean; secondsTotal: number; secondsLeft: number; introLeft?: number } | null,
  area: string,
  known: boolean
): number | null {
  if (!rocket || rocket.backed || known) return null;
  if ((rocket.introLeft ?? 0) > 0) return null;
  if (HESITATOR_OF[area] !== key) return null;
  return Math.max(0, rocket.secondsTotal - rocket.secondsLeft);
}
