// ORDER 299 (Vision Owner 2026-10-03, "Konsekvensögonblicket. Efter varje
// raketsvar: Spelet går ned till normal hastighet, även om spelaren kör 2×
// eller 4×. Kameran stannar 3–4 sekunder på bordet … Därefter återgår spelet
// till spelarens hastighet.") Tiderna är Designs (D1 guestMood.ts CONSEQUENCE):
// ögonblicket är durationS sekunder, och kameran går tillbaka till spelets
// avstånd fram till camera.backTo. Under ögonblicket går simuleringen i 1×,
// så en simsekund är en sekund.

import type { SimulationState } from '../types';
import { CONSEQUENCE } from '../scene/guestMood';
import { PREP_TIME } from '../../sim/balance';

/** Sekunder sedan svaret, eller null utan pågående konsekvensögonblick. */
export function consequenceElapsed(state: Pick<SimulationState, 'simTime' | 'day'>): number | null {
  const c = state.day.consequence;
  if (!c || state.day.period !== 'dinner') return null;
  const t = state.simTime - c.at;
  return t >= 0 && t < CONSEQUENCE.camera.backTo ? t : null;
}

/** Spelets hastighet just nu: normal (1×) under ögonblicket, återgången och en pågående situation, annars spelarens. */
export function effectiveSpeed(state: Pick<SimulationState, 'simTime' | 'day' | 'speed'> & { incidents?: SimulationState['incidents'] }): number {
  if (consequenceElapsed(state) !== null && state.speed > 1) return 1;
  // ORDER 314 (Anders 2026-10-06) — "Situationen pausar inte spelet men
  // saktar in till 1×, som konsekvensögonblicket."
  if (state.incidents?.active && state.day.period === 'dinner' && state.speed > 1) return 1;
  // ORDER 300 §6 — förberedelserna fram till dörröppningen går fortare.
  const prep = (state.day.period === 'dinner' || state.day.period === 'lunch') && state.day.doorsOpenAt !== null && state.simTime < state.day.doorsOpenAt;
  return prep && state.speed > 0 ? Math.max(state.speed, PREP_TIME.speedAtLeast) : state.speed;
}
