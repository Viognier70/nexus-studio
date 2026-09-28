// ORDER 274 — tiden kvar av servicen (Vision Owner 2026-09-28, provspel:
// "Tiden kvar av servicen ska synas hela kvällen").
//
// Servicen går 18–23 i speltid (SITTING, F31). Kvällens längd i
// simsekunder är dagens `currentServiceLengthMinutes`, samma värde som
// reducern stänger servicen på (reducer.ts: periodStartAt +
// currentServiceLengthMinutes × 60). Klockan är incidents.ts
// `clockMinutes`, samma som raketernas klockslag.

import type { SimulationState } from '../strategic/types';
import { GAME_MINUTES_PER_SIM_SECOND, SITTING } from './balance';
import { clockMinutes } from './incidents';

export interface ServiceClock {
  // Klockslaget nu och när servicen stänger, i spelminuter efter midnatt.
  nowMinutes: number;
  endMinutes: number;
  // Spelminuter kvar, aldrig under noll.
  leftMinutes: number;
  // Andel av servicen som gått, 0..1.
  elapsedShare: number;
}

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

// Tiden kvar under en service (lunch eller middag), annars null.
export function serviceClock(state: SimulationState): ServiceClock | null {
  const { period, currentServiceLengthMinutes, periodStartAt } = state.day;
  if ((period !== 'dinner' && period !== 'lunch') || currentServiceLengthMinutes === null) return null;
  const lengthSimSeconds = currentServiceLengthMinutes * SECONDS_PER_MINUTE;
  const start = SITTING.serviceStartHour * MINUTES_PER_HOUR;
  const endMinutes = start + Math.round(lengthSimSeconds * GAME_MINUTES_PER_SIM_SECOND);
  const nowMinutes = Math.min(endMinutes, clockMinutes(state));
  const elapsed = Math.max(0, state.simTime - periodStartAt);
  return {
    nowMinutes,
    endMinutes,
    leftMinutes: Math.max(0, endMinutes - nowMinutes),
    elapsedShare: Math.max(0, Math.min(1, elapsed / lengthSimSeconds))
  };
}
