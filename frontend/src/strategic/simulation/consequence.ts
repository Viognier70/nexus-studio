// ORDER 299 (Vision Owner 2026-10-03, "Konsekvensögonblicket. Efter varje
// raketsvar: Spelet går ned till normal hastighet, även om spelaren kör 2×
// eller 4×. Kameran stannar 3–4 sekunder på bordet … Därefter återgår spelet
// till spelarens hastighet.") Tiderna är Designs (D1 guestMood.ts CONSEQUENCE):
// ögonblicket är durationS sekunder, och kameran går tillbaka till spelets
// avstånd fram till camera.backTo. Under ögonblicket går simuleringen i 1×,
// så en simsekund är en sekund.

import type { SimulationState } from '../types';
import { CONSEQUENCE } from '../scene/guestMood';

/** Sekunder sedan svaret, eller null utan pågående konsekvensögonblick. */
export function consequenceElapsed(state: Pick<SimulationState, 'simTime' | 'day'>): number | null {
  const c = state.day.consequence;
  if (!c || state.day.period !== 'dinner') return null;
  const t = state.simTime - c.at;
  return t >= 0 && t < CONSEQUENCE.camera.backTo ? t : null;
}

/** Spelets hastighet just nu: normal (1×) under ögonblicket och återgången, annars spelarens. */
export function effectiveSpeed(state: Pick<SimulationState, 'simTime' | 'day' | 'speed'>): number {
  return consequenceElapsed(state) !== null && state.speed > 1 ? 1 : state.speed;
}
