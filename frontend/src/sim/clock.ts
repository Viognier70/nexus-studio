// Kvällens klocka (flyttad ur sim/incidents.ts i ORDER 292, så att lagret
// och raketerna kan läsa den utan cirkelberoende; incidents.ts exporterar
// den vidare).

import type { SimulationState } from '../strategic/types';
import { GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, SITTING, VILLAGE_EVENING } from './balance';
import { strings } from '../content/strings';
import { OPENING_DURATION_SEC, PREP_DURATION_SEC } from '../strategic/simulation/constants';
import { businessHasMiseEnPlace } from '../strategic/business/businessClass';

const MINUTES_PER_HOUR = INCIDENTS.minutesPerHour;

// Klockslaget i spelminuter efter midnatt (servicen 18–23, F31).
export function clockMinutes(state: SimulationState): number {
  const since = Math.max(0, state.simTime - state.day.periodStartAt);
  return SITTING.serviceStartHour * MINUTES_PER_HOUR + Math.floor(since * GAME_MINUTES_PER_SIM_SECOND);
}

// ORDER 292b (provspel av e079883: "Raketknappen säger 'Öppnar när dörrarna
// öppnar' klockan 18.10, efter att dörrarna har öppnat") — dörrarna öppnar
// efter öppningen och förberedelserna (reducer.ts openService), alltså inte
// 18.00. Klockslaget när de öppnar, i spelminuter: under servicen ur
// day.doorsOpenAt, annars ur öppningens och förberedelsernas längd för klassen.
export function doorsOpenMinutes(state: SimulationState): number {
  const start = SITTING.serviceStartHour * MINUTES_PER_HOUR;
  const inService = state.day.period === 'dinner' || state.day.period === 'lunch';
  const sinceStart = inService && state.day.doorsOpenAt !== null
    ? state.day.doorsOpenAt - state.day.periodStartAt
    : OPENING_DURATION_SEC + (businessHasMiseEnPlace(state.businessClass) ? PREP_DURATION_SEC : 0);
  return start + Math.round(sinceStart * GAME_MINUTES_PER_SIM_SECOND);
}

// Är dörrarna fortfarande stängda under servicen (öppningen och förberedelserna)?
export function beforeDoors(state: SimulationState): boolean {
  return (state.day.period === 'dinner' || state.day.period === 'lunch') && state.day.doorsOpenAt !== null && state.simTime < state.day.doorsOpenAt;
}

// Klockslaget som text i det aktuella språket (ORDER 273, Designs §2):
// "18:00" på engelska, "18.00" på svenska (strängtabellen service.clock.hhmm).
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR);
  const m = minutes % MINUTES_PER_HOUR;
  return strings.service.clock.hhmm(String(h), String(m).padStart(INCIDENTS.clockDigits, '0'));
}

// ORDER 297 — kvällens gång e (0–1) för byns kvällsljus: från att servicen
// börjar till att den sista krogen har stängt och de sista gått
// (balance.ts VILLAGE_EVENING). Efter servicen är det natt (1); på dagen null.
export function eveningProgress(state: SimulationState): number | null {
  if (state.day.period === 'evening') return 1;
  if (state.day.period !== 'dinner') return null;
  const span = VILLAGE_EVENING.toMinute - VILLAGE_EVENING.fromMinute;
  return Math.max(0, Math.min(1, (clockMinutes(state) - VILLAGE_EVENING.fromMinute) / span));
}
