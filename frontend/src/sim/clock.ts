// Kvällens klocka (flyttad ur sim/incidents.ts i ORDER 292, så att lagret
// och raketerna kan läsa den utan cirkelberoende; incidents.ts exporterar
// den vidare).

import type { SimulationState } from '../strategic/types';
import { GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, SITTING } from './balance';
import { strings } from '../content/strings';

const MINUTES_PER_HOUR = INCIDENTS.minutesPerHour;

// Klockslaget i spelminuter efter midnatt (servicen 18–23, F31).
export function clockMinutes(state: SimulationState): number {
  const since = Math.max(0, state.simTime - state.day.periodStartAt);
  return SITTING.serviceStartHour * MINUTES_PER_HOUR + Math.floor(since * GAME_MINUTES_PER_SIM_SECOND);
}

// Klockslaget som text i det aktuella språket (ORDER 273, Designs §2):
// "18:00" på engelska, "18.00" på svenska (strängtabellen service.clock.hhmm).
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR);
  const m = minutes % MINUTES_PER_HOUR;
  return strings.service.clock.hhmm(String(h), String(m).padStart(INCIDENTS.clockDigits, '0'));
}
