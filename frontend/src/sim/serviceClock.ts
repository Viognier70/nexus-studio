// ORDER 274 — tiden kvar av servicen (Vision Owner 2026-09-28, provspel:
// "Tiden kvar av servicen ska synas hela kvällen").
//
// Servicen går 18–23 i speltid (SITTING, F31). Kvällens längd i
// simsekunder är dagens `currentServiceLengthMinutes`, samma värde som
// reducern stänger servicen på (reducer.ts: periodStartAt +
// currentServiceLengthMinutes × 60). Klockan är incidents.ts
// `clockMinutes`, samma som raketernas klockslag.

import type { SimulationState } from '../strategic/types';
import { CLOCK, GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, OPENING, SITTING } from './balance';
import { roomPressure } from './incidents';
import { clockMinutes } from './clock';

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

// ORDER 280 — klockans etikett och rutor (Designs K1, economy.ts
// serviceClock): Servicen, Rusning (19.30–21.00), Sista beställning och
// Stängt; tio halvtimmesrutor där passerade är fyllda och den aktuella
// fylls från vänster. Den sista rutan har accent hela kvällen.
export type ClockLabel = 'service' | 'rush' | 'lastOrders' | 'closed' | 'calm' | 'waiting';

export function clockLabel(c: ServiceClock): ClockLabel {
  const since = c.nowMinutes - c.startMinutes;
  if (c.leftMinutes === 0) return 'closed';
  if (c.lastOrders) return 'lastOrders';
  if (since >= CLOCK.rushFromMinutes && since < CLOCK.rushToMinutes) return 'rush';
  return 'service';
}

export function clockCells(sinceStartMinutes: number): { fill: number; accent: boolean }[] {
  return Array.from({ length: CLOCK.cells }, (_, i) => ({
    fill: Math.max(0, Math.min(1, (sinceStartMinutes - i * CLOCK.cellMinutes) / CLOCK.cellMinutes)),
    accent: i === CLOCK.cells - 1
  }));
}

// ORDER 298 — etiketten efter det som händer i rummet, inte bara klockan:
// Rusning när trycket i rummet är minst OPENING.rushPressure, Väntar på
// gäster när ingen sitter eller väntar, annars Lugnt. Sista beställning och
// Stängt följer klockan som förut.
export function serviceLabel(state: SimulationState, c: ServiceClock): ClockLabel {
  const l = clockLabel(c);
  if (l === 'lastOrders' || l === 'closed') return l;
  if (state.seatedIds.length + state.waitingIds.length === 0) return 'waiting';
  return roomPressure(state) >= OPENING.rushPressure ? 'rush' : 'calm';
}
