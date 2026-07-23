import type { Rng } from '../util/rng';
import type { Guest, SimulationState } from '../types';
import { makeGuest } from './model';
import { PRICE_ARRIVAL_MULT, SERVICE_ARRIVAL_MULT } from './economics';

// Very small arrival model. Expected guests per sim-minute is derived from
// pricing and service concept. We sample a small probability each tick.
export function arrivalProbability(state: SimulationState): number {
  const perMinute =
    3.2 *
    SERVICE_ARRIVAL_MULT[state.policies.service] *
    PRICE_ARRIVAL_MULT[state.policies.pricing];
  return perMinute / (60 * 5); // 5 Hz tick.
}

export function maybeSpawnGuest(state: SimulationState, rng: Rng): Guest | null {
  const active = state.guests.length;
  if (active >= 12) return null;
  if (!rng.chance(arrivalProbability(state))) return null;
  return makeGuest(state.simTime, false);
}

// Scenario spawn: independent of the arrival model. Emits `count` guests at a
// steady cadence starting from the trigger tick.
export function scenarioSpawnStep(state: SimulationState): Guest | null {
  if (state.scenario.spawnedRemaining <= 0) return null;
  if (state.simTime < state.scenario.nextSpawnAt) return null;
  return makeGuest(state.simTime, true);
}
