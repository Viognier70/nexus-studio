import type { Rng } from '../util/rng';
import type { DayPeriod, Guest, SimulationState } from '../types';
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
// away, at capital=0 20% of arrivals refuse entry. Halved from 0.4 at
// the room-flow retune (Vision Owner: "femton per lunch är en ström,
// inte ett undantag") — the previous ceiling flooded lunch with
// vändare at moderate economic. Cycle-1 tuning; revisit from playtest.
const ECONOMIC_WALKAWAY_CEIL = 0.2;

// ORDER 043 v3 §2 period gate. Ambient arrivals only fire during a
// running service; morning / afternoon / evening are closed windows
// (no guests, no queue, no walk-aways). A future order can widen this
// (e.g. a "late-morning stragglers" bonus) but the base rule is: the
// room fills when the doors are open, and only then.
const PERIOD_ARRIVAL_MULTIPLIER: Record<DayPeriod, number> = {
  morning: 0,
  lunch: 0.6,
  afternoon: 0,
  dinner: 1.0,
  evening: 0
};

export function periodArrivalMultiplier(period: DayPeriod): number {
  return PERIOD_ARRIVAL_MULTIPLIER[period];
}

// Base arrival rate in guests per sim-minute, before any of the
// modulators (period gate, service concept, pricing tier, economic
// capital). Tuned at the ORDER 043 v3 room-flow retune from the old
// 3.2/min baseline: at the previous rate a full 30-min dinner service
// averaged ~5 seated at the peak, well under the 16-cover room. 12/min
// combined with period gates (lunch 0.6, dinner 1.0) yields a lunch of
// ~7 covers and a dinner that reliably fills the room, so the queue
// carries a signal.
const ARRIVAL_BASE_PER_MINUTE = 12;

// Maximum concurrent guests (seated + waiting + arriving + declined
// pending removal). Raised from 12 → 24 alongside the base-rate lift so
// the arrival stream can actually reach 16 covers + 4 waiting at peak
// without the cap short-circuiting spawns.
const ACTIVE_GUEST_CAP = 24;

// Very small arrival model. Expected guests per sim-minute is derived from
// pricing and service concept, then modulated by the current economic
// capital so a weak-economy period visibly thins the room.
export function arrivalProbability(state: SimulationState): number {
  const perMinute =
    ARRIVAL_BASE_PER_MINUTE *
    periodArrivalMultiplier(state.day.period) *
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
  if (active >= ACTIVE_GUEST_CAP) return null;
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
