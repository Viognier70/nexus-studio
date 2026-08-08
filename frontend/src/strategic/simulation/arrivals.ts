import type { Rng } from '../util/rng';
import type { Guest, SimulationState } from '../types';
import { makeGuest } from './model';
import { PRICE_ARRIVAL_MULT, SERVICE_ARRIVAL_MULT } from './economics';

// ORDER 043 §6 phenomena constants.
//
// ECONOMIC_ARRIVAL_FLOOR — at economic = 0, arrivals still fire at this
// fraction of the policy-only baseline. Never zero: people still eat,
// even in a weak establishment. Reading: at capital=0 the arrival rate
// is 40% of what it would be at capital=1; the room is visibly quieter
// but not empty.
const ECONOMIC_ARRIVAL_FLOOR = 0.4;

// ECONOMIC_WALKAWAY_CEIL — maximum probability that an arriving guest
// walks to the entrance and turns back (as opposed to entering and
// sitting). Multiplied by (1 − economic) so at capital=1 nobody walks
// away, at capital=0 40% of arrivals refuse entry. Cycle-1 tuning; a
// future order can revise from playtest evidence.
const ECONOMIC_WALKAWAY_CEIL = 0.4;

// Very small arrival model. Expected guests per sim-minute is derived from
// pricing and service concept, then modulated by the current economic
// capital so a weak-economy period visibly thins the room.
export function arrivalProbability(state: SimulationState): number {
  const perMinute =
    3.2 *
    SERVICE_ARRIVAL_MULT[state.policies.service] *
    PRICE_ARRIVAL_MULT[state.policies.pricing] *
    economicArrivalMultiplier(state.capitals.values.economic);
  return perMinute / (60 * 5); // 5 Hz tick.
}

export function economicArrivalMultiplier(economic: number): number {
  const clamped = Math.max(0, Math.min(1, economic));
  return ECONOMIC_ARRIVAL_FLOOR + (1 - ECONOMIC_ARRIVAL_FLOOR) * clamped;
}

// ORDER 043 §6 walk-away probability at spawn time. Guest's fate to
// refuse entry is decided when they appear, not on arrival — so the
// same-guest outcome is deterministic (a guest whose economic-at-spawn
// said "walk away" walks away, no re-roll on the way).
export function walkAwayProbability(economic: number): number {
  const clamped = Math.max(0, Math.min(1, economic));
  return ECONOMIC_WALKAWAY_CEIL * (1 - clamped);
}

export function maybeSpawnGuest(state: SimulationState, rng: Rng): Guest | null {
  const active = state.guests.length;
  if (active >= 12) return null;
  if (!rng.chance(arrivalProbability(state))) return null;
  const walkAway = rng.chance(walkAwayProbability(state.capitals.values.economic));
  return makeGuest(state.simTime, false, walkAway);
}

// Scenario spawn: independent of the arrival model. Emits `count` guests at a
// steady cadence starting from the trigger tick. Scenario guests never
// walk away — they're the specific arrival the player is responding to.
export function scenarioSpawnStep(state: SimulationState): Guest | null {
  if (state.scenario.spawnedRemaining <= 0) return null;
  if (state.simTime < state.scenario.nextSpawnAt) return null;
  return makeGuest(state.simTime, true, false);
}
