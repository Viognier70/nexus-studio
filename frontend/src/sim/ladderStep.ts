// ORDER 315a — karriärstegen: steget spelaren står på och stegets egenskaper
// (balance.ts LADDER). Skilt från sim/ladder.ts (erbjudandet och köpet), så
// att ekonomin kan läsa steget utan en cirkel mellan modulerna.

import { LADDER } from './balance';
import type { SimulationState } from '../strategic/types';

export type LadderStepId = (typeof LADDER.order)[number];
export type PlayableStep = (typeof LADDER.playable)[number];

export interface StepRequirement {
  cashSek: number;
  reputationAtLeast: number;
  medalsRequired: readonly { pavilion: string; level: string }[];
}

export interface LadderOffer {
  to: PlayableStep;
  // Insatsen ur kassan och lånet, räknade när erbjudandet kom.
  depositSek: number;
  loanSek: number;
  state: 'offered' | 'declined';
  offeredOnDay: number;
  // ORDER 315b del 2 — Designs D7: erbjudandet kom vid dörren efter stängning.
  atDoor?: boolean;
}

export interface LadderState {
  step: PlayableStep;
  reachedOnDay: Partial<Record<PlayableStep, number>>;
  offer: LadderOffer | null;
  // ORDER 315b del 2 — ombyggnaden: stängt från fromDay till och med untilDay.
  refit?: { fromDay: number; untilDay: number } | null;
  // ORDER 315c — klarade situationer i foodtrucken (halvt grepp 0,5), krav för vinbaren.
  truckSituations?: number;
  // ORDER 315c — kvällar i foodtrucken (FOODTRUCK.offerMinEvenings).
  truckEvenings?: number;
}

export function stepSpec(step: PlayableStep) {
  return LADDER.steps[step];
}

/** Steget spelaren står på; spel från före ORDER 315a läses ur verksamhetens klass. */
export function ladderStep(state: Pick<SimulationState, 'ladder' | 'economy'>): PlayableStep | null {
  if (!state.economy.businessClass) return null;
  if (state.ladder) return state.ladder.step;
  return (LADDER.playable as readonly string[]).includes(state.economy.businessClass) ? state.economy.businessClass as PlayableStep : null;
}

export function ladderOf(state: Pick<SimulationState, 'ladder' | 'economy' | 'day'>): LadderState | null {
  const step = ladderStep(state);
  if (!step) return null;
  return state.ladder ?? { step, reachedOnDay: {}, offer: null };
}

/** Nästa spelbara steg, eller null högst upp. */
export function nextStep(step: PlayableStep | null): PlayableStep | null {
  if (!step) return null;
  const i = LADDER.playable.indexOf(step);
  return i >= 0 && i + 1 < LADDER.playable.length ? LADDER.playable[i + 1] : null;
}

/** Stjärnan kan delas ut i steget (bistron och uppåt). */
export function starsPossible(state: Pick<SimulationState, 'ladder' | 'economy'>): boolean {
  const step = ladderStep(state);
  return step !== null && stepSpec(step).starsPossible;
}

/** Stegets faktorer på notan och lönerna (bistron högre än vinbaren). */
export function ladderBillFactor(state: Pick<SimulationState, 'ladder' | 'economy'>): number {
  const step = ladderStep(state);
  return step ? stepSpec(step).billFactor : 1;
}
export function ladderWageFactor(state: Pick<SimulationState, 'ladder' | 'economy'>): number {
  const step = ladderStep(state);
  return step ? stepSpec(step).wageFactor : 1;
}

/** ORDER 315b del 2 — är krogen stängd i dag för ombyggnaden? (sim/ladder.ts refitProgress) */
export function refitClosedToday(state: Pick<SimulationState, 'ladder'> & { day: Pick<SimulationState['day'], 'dayNumber'> }): boolean {
  const r = state.ladder?.refit;
  return !!r && state.day.dayNumber >= r.fromDay && state.day.dayNumber <= r.untilDay;
}
