// ORDER 274 — tiden kvar av servicen (Vision Owner 2026-09-28, provspel:
// "Tiden kvar av servicen ska synas hela kvällen").
//
// Servicen går 18–23 i speltid (SITTING, F31). Kvällens längd i
// simsekunder är dagens `currentServiceLengthMinutes`, samma värde som
// reducern stänger servicen på (reducer.ts: periodStartAt +
// currentServiceLengthMinutes × 60). Klockan är incidents.ts
// `clockMinutes`, samma som raketernas klockslag.

import type { SimulationState } from '../strategic/types';
import { GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, SITTING } from './balance';
import { clockMinutes } from './incidents';

export interface ServiceClock {
  // Klockslaget när servicen öppnade, nu och när den stänger, i spelminuter efter midnatt.
  startMinutes: number;
  nowMinutes: number;
  endMinutes: number;
  // Spelminuter kvar, aldrig under noll.
  leftMinutes: number;
  // Andel av servicen som gått, 0..1.
  elapsedShare: number;
  // Sista beställningen: högst SITTING.lastOrdersMinutes kvar (Designs §3).
  lastOrders: boolean;
}

// Samma tidsenheter som klockan i incidents.ts (balance.ts INCIDENTS).
const SECONDS_PER_MINUTE = INCIDENTS.simSecondsPerMinute;
const MINUTES_PER_HOUR = INCIDENTS.minutesPerHour;

// Tiden kvar under en service (lunch eller middag), annars null.
export function serviceClock(state: SimulationState): ServiceClock | null {
  const { period, currentServiceLengthMinutes, periodStartAt } = state.day;
  if ((period !== 'dinner' && period !== 'lunch') || currentServiceLengthMinutes === null) return null;
  const lengthSimSeconds = currentServiceLengthMinutes * SECONDS_PER_MINUTE;
  const start = SITTING.serviceStartHour * MINUTES_PER_HOUR;
  const endMinutes = start + Math.round(lengthSimSeconds * GAME_MINUTES_PER_SIM_SECOND);
  const nowMinutes = Math.min(endMinutes, clockMinutes(state));
  const elapsed = Math.max(0, state.simTime - periodStartAt);
  const leftMinutes = Math.max(0, endMinutes - nowMinutes);
  return {
    startMinutes: start,
    nowMinutes,
    endMinutes,
    leftMinutes,
    elapsedShare: Math.max(0, Math.min(1, elapsed / lengthSimSeconds)),
    lastOrders: leftMinutes <= SITTING.lastOrdersMinutes
  };
}
