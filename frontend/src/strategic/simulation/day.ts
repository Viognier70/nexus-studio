// ORDER 043 v3 §10 step 1 helpers for the day model.
//
// planScenariosForService — random scenario count for a service window
// of a given length in sim-minutes. Per v3 §2:
//   "Scenario count is random, weighted by service length. Never a
//    fixed cadence. There must be air between scenarios."
//
// Cycle-1 pacing (retuned at the room-flow projection):
//   density ~ 0.15 scenarios per sim-minute, base
//   variance ~ ±60 % via a uniform [0, 1] rng roll
//   floor  = 1 for any positive-length service — every service window
//            fires at least one scenario, so opening the doors is
//            always a decision surface. Previously Math.max(0, …)
//            allowed 3-minute services (and unlucky rolls at any
//            length) to close with zero scenarios, which the room-flow
//            projection flagged as "the shortest choice can no-op."
//
// The whole computation is deterministic in the passed rng — same rng
// state + same length yields the same count. Cadence *within* the
// service is decided at fire time (step 5, not this cycle); here we
// only produce the count so the UI + reducer have something to gate on.

import type { Rng } from '../util/rng';

const SCENARIO_DENSITY_PER_MINUTE = 0.15;
const SCENARIO_VARIANCE = 0.6; // ±60 % of the density-based expectation

export function planScenariosForService(
  lengthMinutes: number,
  rng: Rng
): number {
  if (lengthMinutes <= 0) return 0;
  const base = lengthMinutes * SCENARIO_DENSITY_PER_MINUTE;
  // Variance: rng.range(-1, 1) * SCENARIO_VARIANCE. Rounded up so a
  // short service can still surprise the player with a single fire.
  const drift = (rng.next() * 2 - 1) * SCENARIO_VARIANCE;
  const raw = base * (1 + drift);
  return Math.max(1, Math.round(raw));
}
