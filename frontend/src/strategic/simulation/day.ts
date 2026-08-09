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

// ORDER 047 §4 — density raised from 0.15 → 0.22 per sim-minute so a
// 15-min dinner carries 3–4 scenarios rather than 1–2. Vision Owner
// observation 2026-08-09: "för få scenarier och alltid samma." Bigger
// count also gives §5's stream-driven weighting more data points to
// work against — the connection between what happened and what came
// next reads better across 3–4 scenarios than across 1–2.
const SCENARIO_DENSITY_PER_MINUTE = 0.22;
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

// ORDER 043 v3 step 5b — schedule N scenario trigger times spread
// across a service window. Head-space (SCHEDULE_HEAD_SEC) and tail-
// space (SCHEDULE_TAIL_SEC) buffer the window so scenarios don't fire
// on the same tick as OPEN_SERVICE or in the final seconds before
// close (either would feel abrupt and leave no room for the
// resolve → settle cadence).
//
// Times are absolute simTime and returned sorted. Deterministic in
// the rng — same seed + same length + same open time yields the same
// schedule, so a service is reproducible per seed.
const SCHEDULE_HEAD_SEC = 12; // grace after open before the first fire
const SCHEDULE_TAIL_SEC = 20; // guard against firing near close
const SCHEDULE_JITTER_FRAC = 0.4; // jitter as fraction of the slot width

export function scheduleScenarioTriggerTimes(
  count: number,
  serviceStartAt: number,
  lengthMinutes: number,
  rng: Rng
): number[] {
  if (count <= 0) return [];
  const serviceLenSec = lengthMinutes * 60;
  // Effective firing window after buffering head and tail.
  const windowStart = serviceStartAt + SCHEDULE_HEAD_SEC;
  const windowEnd =
    serviceStartAt + Math.max(SCHEDULE_HEAD_SEC + 1, serviceLenSec - SCHEDULE_TAIL_SEC);
  const windowLen = windowEnd - windowStart;
  if (windowLen <= 0) {
    // Ultra-short service — single fire at the head.
    return [windowStart];
  }
  const slotWidth = windowLen / count;
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const slotCentre = windowStart + slotWidth * (i + 0.5);
    const jitter = (rng.next() * 2 - 1) * (slotWidth * SCHEDULE_JITTER_FRAC);
    const t = slotCentre + jitter;
    // Clamp inside the effective window so jitter can't push a fire
    // outside head/tail buffers.
    times.push(Math.max(windowStart, Math.min(windowEnd, t)));
  }
  return times.sort((a, b) => a - b);
}
