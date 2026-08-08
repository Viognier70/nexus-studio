// ORDER 043 v3 §10 step 1 helpers for the day model.
//
// planScenariosForService — random scenario count for a service window
// of a given length in sim-minutes. Per v3 §2:
//   "Scenario count is random, weighted by service length. Never a
//    fixed cadence. There must be air between scenarios."
//
// Cycle-1 pacing:
//   density ~ 0.1 scenarios per sim-minute, base
//   variance ~ ±60 % via a uniform [0, 1] rng roll
//   so a 10-min service typically has 1–2 scenarios, a 30-min service
//   typically has 3–5, and a 3-min service usually has 0 (some rare
//   ones fire early).
//
// The whole computation is deterministic in the passed rng — same rng
// state + same length yields the same count. Cadence *within* the
// service is decided at fire time (step 5, not this cycle); here we
// only produce the count so the UI + reducer have something to gate on.

import type { Rng } from '../util/rng';

const SCENARIO_DENSITY_PER_MINUTE = 0.1;
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
  return Math.max(0, Math.round(raw));
}
