// ORDER 043 Addendum A service rhythm curve.
//
// Vision Owner (2026-08-08): "Fler händelser är inte svaret — jämnt
// högt tempo blir brus... Ge servicen en rytm: öppning, uppbyggnad,
// rusning, avmattning."
//
// The curve is applied as a multiplier to both arrivalProbability
// (in arrivals.ts) and eventProbabilityPerTick (in eventStream.ts),
// so the room's pace and the stream's cadence rise and fall together.
//
// Reading:
//   Opening  (0–15 %): quiet, doors open, first guests trickle
//   Buildup  (15–40 %): tempo climbs as guests arrive in groups
//   Rush     (40–70 %): peak — the evening at its densest
//   Decline  (70–100 %): tables empty, staff catches up
//
// The rush's peak sits near f = 0.55 as a parabolic apex; opening
// and decline drop to ~0.5 and ~0.4 respectively so contrast is
// felt rather than smoothed out.

import type { SimulationState } from '../types';
import { PREP_DURATION_SEC } from './constants';

export function serviceRhythmMultiplier(fraction: number): number {
  const f = Math.max(0, Math.min(1, fraction));
  if (f < 0.15) {
    // Opening: 0.5 → 0.9
    return 0.5 + (f / 0.15) * 0.4;
  }
  if (f < 0.40) {
    // Buildup: 0.9 → 1.5
    return 0.9 + ((f - 0.15) / 0.25) * 0.6;
  }
  if (f < 0.70) {
    // Rush: 1.5 → 2.0 → 1.5 (parabolic peak near f = 0.55)
    const t = (f - 0.40) / 0.30;
    return 1.5 + Math.sin(t * Math.PI) * 0.5;
  }
  // Decline: 1.5 → 0.4
  return 1.5 - ((f - 0.70) / 0.30) * 1.1;
}

// Fraction of the service window (post-prep) elapsed, in [0, 1].
// Returns null when not in a running service; returns 0 while the
// prep window still stands (rhythm hasn't started).
export function serviceFraction(state: SimulationState): number | null {
  const period = state.day.period;
  if (period !== 'lunch' && period !== 'dinner') return null;
  const len = state.day.currentServiceLengthMinutes;
  if (len === null) return null;
  const serviceStart = state.day.periodStartAt + PREP_DURATION_SEC;
  const serviceEnd = state.day.periodStartAt + len * 60;
  const serviceLen = serviceEnd - serviceStart;
  if (serviceLen <= 0) return null;
  if (state.simTime < serviceStart) return 0;
  return Math.max(0, Math.min(1, (state.simTime - serviceStart) / serviceLen));
}

// Convenience: rhythm multiplier for the current tick, defaulting to
// 1.0 when there's no rhythm to apply (outside service). Callers that
// want the raw fraction should use serviceFraction directly.
export function currentRhythmMultiplier(state: SimulationState): number {
  const f = serviceFraction(state);
  if (f === null) return 1.0;
  return serviceRhythmMultiplier(f);
}
