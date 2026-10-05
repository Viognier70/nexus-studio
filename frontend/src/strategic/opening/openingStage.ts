// ORDER 308 — öppningens läge, delat mellan överlägget (OpeningSequence.tsx,
// som äger klockan) och byns scen (DayLighting läser kvällen och ljusnivån,
// OpeningMentor ritar Ingrid). Ett litet lager utanför React: tiden ändras
// varje bildruta, men bara kvällens e (avrundad, som under servicen) och
// början och slutet ritar om något i React.

import { useSyncExternalStore } from 'react';
import { VILLAGE_LIGHT_LEVEL } from './oppningManus';

export interface OpeningStageState {
  /** Öppningen pågår och byn ritas för den. */
  active: boolean;
  /** Öppningens tid i sekunder. */
  t: number;
  /** Kvällens e (villageEvening.PHASES), avrundad till 1/200. */
  e: number;
  /** Byns ljusnivå under öppningen (manusets VILLAGE_LIGHT_LEVEL). */
  light: number;
}

let state: OpeningStageState = { active: false, t: 0, e: 0, light: VILLAGE_LIGHT_LEVEL };
const listeners = new Set<() => void>();

export function openingStage(): OpeningStageState {
  return state;
}

export function subscribeOpeningStage(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Tiden och kvällen; lyssnarna får veta bara när e (avrundad) eller läget ändras. */
export function setOpeningStage(next: { active: boolean; t: number; e: number }): void {
  const e = Math.round(next.e * 200) / 200;
  const changed = next.active !== state.active || e !== state.e;
  state = { ...state, active: next.active, t: next.t, e };
  if (changed) listeners.forEach((f) => f());
}

// Byns scen har ritat sin första bildruta (Suspense klar), så att klockan
// inte börjar medan byn fortfarande laddas. Sätts av OpeningMentor.
let sceneReady = false;
export function markOpeningSceneReady(): void { sceneReady = true; }
export function openingSceneReady(): boolean { return sceneReady; }

/** Kvällen som byn ska ritas i, eller null när öppningen inte pågår (DayLighting). */
export function openingEvening(): number | null {
  return state.active ? state.e : null;
}

/** Kvällen under öppningen, för byns ljus (DayLighting, gatlyktorna, fönstren); null annars. */
export function useOpeningEvening(): number | null {
  return useSyncExternalStore(subscribeOpeningStage, openingEvening, openingEvening);
}
