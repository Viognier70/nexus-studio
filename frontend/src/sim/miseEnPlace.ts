// ORDER 296 (kärnan punkt 5) — mise en place efter inköpen. Talen står i
// balance.ts MISE_EN_PLACE; morgonens skärm (MorningBuyScreen) och harnessen
// (order296Karnan.test.ts) läser samma funktioner.

import type { SimulationState } from '../strategic/types';
import { coverage } from '../strategic/simulation/morningBuy';
import { bookingFor } from '../strategic/simulation/guestTypes';
import { applyCashCost, postLedger } from '../strategic/simulation/cashReading';
import { strings } from '../content/strings';
import { GAME_MINUTES_PER_SIM_SECOND, MISE_EN_PLACE, SHOP } from './balance';
import { abilityActive } from './shop';

export interface MisePlan {
  portions: number;
  booked: number;
  needMin: number;
  capacityMin: number;
  backlogMin: number;
  extraHand: boolean;
}

// Kvällens bokning: låst när dörrarna öppnar (day.booking), annars morgonens.
function bookedTonight(state: SimulationState): number {
  return state.day.booking?.total ?? bookingFor(state).total;
}

export function misePlan(state: SimulationState): MisePlan {
  const booked = bookedTonight(state);
  const portions = Math.min(coverage(state).covers, booked);
  const needMin = portions * MISE_EN_PLACE.perPortionMin + booked * MISE_EN_PLACE.perBookedGuestMin;
  const staff = state.team.members.filter((m) => !m.isAgency).length;
  const extraHand = !!state.day.prepHand;
  // ORDER 296 — mise en place-rutinen (butiken): kocken har allt framme tidigare.
  const routine = abilityActive(state, 'mise') ? SHOP.effects.miseExtraMin : 0;
  const capacityMin = staff * MISE_EN_PLACE.minutesPerStaff + (extraHand ? MISE_EN_PLACE.extraHandMin : 0) + routine;
  return { portions, booked, needMin, capacityMin, backlogMin: Math.max(0, needMin - capacityMin), extraHand };
}

// Morgonen: en extra hand till förberedelsen.
export function hirePrepHand(state: SimulationState): SimulationState {
  if (state.day.prepHand || (state.day.period !== 'morning' && state.day.period !== 'afternoon')) return state;
  const draft: SimulationState = { ...state, ledger: [...state.ledger], day: { ...state.day, prepHand: true } };
  applyCashCost(draft, MISE_EN_PLACE.extraHandCostSek);
  postLedger(draft, { category: 'other', amount: -MISE_EN_PLACE.extraHandCostSek, cause: strings.economy.ledger.prepHand });
  return draft;
}

// När dörrarna öppnar: mise en place räcker i förhållande till det som
// hanns, och resten står som eftersläp.
export function applyMiseAtDoors(draft: SimulationState, readiness: Record<string, number>): Record<string, number> {
  const plan = misePlan(draft);
  draft.day = { ...draft.day, prepBacklogMin: plan.backlogMin, prepNeedMin: plan.needMin, prepCapacityMin: plan.capacityMin };
  if (plan.needMin <= 0 || plan.backlogMin <= 0) return readiness;
  const share = plan.capacityMin / plan.needMin;
  return Object.fromEntries(Object.entries(readiness).map(([k, v]) => [k, v * share]));
}

// Under servicen: personalen arbetar ned eftersläpet.
export function tickPrepBacklog(draft: SimulationState, dt: number): void {
  const left = draft.day.prepBacklogMin ?? 0;
  if (left <= 0 || draft.day.period !== 'dinner') return;
  const staff = draft.team.members.filter((m) => !m.isAgency).length + (draft.day.prepHand ? 1 : 0);
  draft.day = { ...draft.day, prepBacklogMin: Math.max(0, left - staff * dt * GAME_MINUTES_PER_SIM_SECOND) };
}

// Personalens uppgifter vid borden tar längre tid medan eftersläpet finns.
export function backlogTaskTime(state: SimulationState): number {
  return (state.day.prepBacklogMin ?? 0) > 0 ? MISE_EN_PLACE.backlogTaskTime : 1;
}
