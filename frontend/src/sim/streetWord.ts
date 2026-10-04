// ORDER 303 C (Anders 2026-10-04): "Samma kväll: ett fel svar sprids till
// gatan. Senare sällskap väljer något oftare en konkurrent." Ordet på gatan
// är en dragningskraft i kväll, −/+ (balance.ts CONSEQUENCES.street): varje
// fel svar sänker den, varje klarad raket höjer den, och den klingar av mot
// noll med tiden. Ankomsterna läser den (strategic/simulation/arrivals.ts
// arrivalAttraction); byns val i kväll (302) läser samma tal.

import type { SimulationState } from '../strategic/types';
import { CONSEQUENCES, GAME_MINUTES_PER_SIM_SECOND } from './balance';

export function streetWordNow(state: Pick<SimulationState, 'day' | 'simTime'>): number {
  const w = state.day.streetWord ?? 0;
  if (w === 0) return 0;
  const minutes = Math.max(0, (state.simTime - (state.day.streetWordAt ?? state.simTime)) * GAME_MINUTES_PER_SIM_SECOND);
  return w * Math.max(0, 1 - CONSEQUENCES.street.decayPerGameMinute * minutes);
}

export function spreadWord(draft: SimulationState, delta: number): void {
  const next = Math.max(CONSEQUENCES.street.min, Math.min(CONSEQUENCES.street.max, streetWordNow(draft) + delta));
  draft.day = { ...draft.day, streetWord: next, streetWordAt: draft.simTime };
}
