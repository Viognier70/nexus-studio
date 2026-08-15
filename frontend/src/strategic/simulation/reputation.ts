// ORDER 043 v3 §4 — the reputation loop.
//
// The central dynamic named in the order:
//   Reputation raises demand → demand strains the team → understaffing
//   degrades service → degraded service lowers reputation.
//
// **Reputation → demand** lives in arrivals.ts (reputationArrivalMultiplier).
// **Demand → strain → degradation → reputation** is here: per-tick
// pressure and per-transition guest events aggregated as small deltas
// against `state.reputation`.
//
// Signal design (cycle-1 numbers, revisit from playtest):
//
//   * Queue-length strain — a queue longer than QUEUE_STRAIN_THRESHOLD
//     drifts reputation down at QUEUE_STRAIN_RATE per sim-second while
//     it persists. Rationale: from the queue-persistence probe, a
//     visible queue happens only at low social; making it also cost
//     reputation makes "understaffed = compounding decay," which is
//     exactly the loop the order specifies.
//
//   * Team strain — when active guests exceed staff × COVERS_PER_STAFF,
//     reputation drifts at TEAM_STRAIN_RATE. Distinct from queue
//     strain because a full room without a queue can still be
//     understaffed; this is the invisible-strain channel that
//     eventually surfaces as slower turnover / unhappy departures.
//
//   * Give-up-in-queue — a guest who transitions waiting → leaving
//     because their patience ran out (satisfaction drop over 90 s) is
//     the single loudest bad-reputation signal in the model. GIVE_UP_COST
//     applied once per event.
//
//   * Happy / unhappy departure — a guest paying then leaving carries
//     their final satisfaction as a reputation signal. Above
//     HAPPY_THRESHOLD adds HAPPY_GAIN; below UNHAPPY_THRESHOLD subtracts
//     UNHAPPY_COST. Between the thresholds is neutral — a mediocre
//     dinner is not remembered.
//
// All deltas are clamped into [0, 1] by applyReputationDelta.
//
// ORDER 049 §2.1 knowledge-ceiling layer (2026-08-09 Vision Owner
// decision): episteme enablers raise a `reputationCeiling` that the
// live `reputation` drifts toward, and direct writes are allowed to
// briefly overshoot. Techne enablers raise the drift rate; phronesis
// softens amplified downside in scenario resolution (see reducer.ts).
// The chain is: knowledge sets the ceiling, operation moves you
// around inside it. You can't read yourself to a good restaurant.

import type { EnablerKey, SimulationState } from '../types';
import { teamCapacity } from './team';

const TICK_SECONDS = 0.2;

// Queue-strain: reputation loses ~0.005/sec while a queue longer than
// 3 persists. Sustained over the full 10 min of a bad dinner that's
// ~3.0 reputation points — enough to shift the multiplier one band.
export const QUEUE_STRAIN_THRESHOLD = 3;
export const QUEUE_STRAIN_RATE = 0.005;

// Team-strain: reputation loses ~0.001/sec when active guests exceed
// the team's capacity. Rewired from policies.staffCount × 5 to
// teamCapacity(state.team) at ORDER 043 v3 §10 step 5 — a hired
// lärling or an agency hand now visibly changes the strain threshold
// in the reading, not just the labels.
export const TEAM_STRAIN_RATE = 0.001;

// Per-event costs. Give-up dwarfs unhappy-departure because a walkout
// during service is a much stronger negative signal than a quiet
// dissatisfied guest paying and leaving.
export const GIVE_UP_COST = 0.02;
export const HAPPY_THRESHOLD = 0.75;
export const HAPPY_GAIN = 0.006;
export const UNHAPPY_THRESHOLD = 0.35;
export const UNHAPPY_COST = 0.012;

// -------- knowledge-ceiling helpers (shared with quality.ts) -------------

// Base reputation ceiling with no knowledge behind the venture.
// Enough to run a competent lunch; below where a "known" restaurant
// lives. Growth above this comes only from ε EPISTEME tallies.
export const REP_CEILING_BASE = 0.55;

// Maximum ceiling contribution from a single fully-tallied enabler
// register (which is bounded [0, 1] by the reducer). Kept small per
// axis so no single knowledge dimension monopolises the ceiling.
const EPISTEME_LIFT_PER_AXIS = 0.10;
const TECHNE_LIFT_PER_AXIS = 0.35;      // multiplier on drift, so a full tally roughly halves the half-life
const PHRONESIS_MAX_SOFTEN = 0.40;      // full tally removes up to 40% of the pressed-amplifier bite

// Ceiling reads across BOTH scientific and cultural episteme — a
// wine list, a hospitality read, or a technique choice all lift what
// the house can be seen as. Weight is symmetric for cycle 1.
export function epistemeCeilingLift(state: SimulationState): number {
  const s = state.enablers.scientific.episteme;
  const c = state.enablers.cultural.episteme;
  return (s + c) * 0.5 * (2 * EPISTEME_LIFT_PER_AXIS);
}

// Per-axis episteme lift used by quality targets (each quality reads
// from ONE dominant axis rather than both).
export function epistemeLiftForAxis(
  state: SimulationState,
  axis: EnablerKey
): number {
  return state.enablers[axis].episteme * EPISTEME_LIFT_PER_AXIS;
}

// Techne modulator on drift rate. Returns a multiplier ≥ 1.0.
// A full-tally techne roughly doubles how fast the reading approaches
// its target — hantverk gör driften snabbare, but never negative or
// past the target.
export function techneDriftMultiplier(
  state: SimulationState,
  axis: EnablerKey
): number {
  return 1 + state.enablers[axis].techne * TECHNE_LIFT_PER_AXIS;
}

// Phronesis softening. Returns a multiplier in [1 - PHRONESIS_MAX_SOFTEN, 1]
// to be applied to a NEGATIVE delta or amplifier-excess. 1.0 = no
// softening (no phronesis tallied); 0.6 = maximum softening (full
// tally). Kept per-axis so a wine-decision debacle reads different
// phronesis than a kitchen-decision debacle.
export function phronesisSoftening(
  state: SimulationState,
  axis: EnablerKey
): number {
  return 1 - state.enablers[axis].phronesis * PHRONESIS_MAX_SOFTEN;
}

// Cross-axis phronesis softening for pressured moments where the
// relevant axis is not obvious (a scenario resolves badly, a wager
// pays out into a below-threshold capital). Averages both enablers.
export function phronesisSofteningGeneral(state: SimulationState): number {
  const avg = (state.enablers.scientific.phronesis + state.enablers.cultural.phronesis) / 2;
  return 1 - avg * PHRONESIS_MAX_SOFTEN;
}

// Fixed nightly decay on all enabler tallies. Vision Owner
// (2026-08-09): "Per natt, fast procent. Förutsägbart, och det gör
// påfyllning till en rytm snarare än en reaktion." The decay is
// applied to the tallies only; the `history` log is authoritative
// and untouched — decay is a reading-side pull-back, not a rewrite
// of what was earned.
export const NIGHTLY_ENABLER_DECAY = 0.05;

export function decayEnablersOvernight(
  enablers: SimulationState['enablers']
): SimulationState['enablers'] {
  const decay = (v: number) => Math.max(0, v * (1 - NIGHTLY_ENABLER_DECAY));
  const next: SimulationState['enablers'] = { ...enablers };
  for (const key of Object.keys(enablers) as EnablerKey[]) {
    const rec = enablers[key];
    next[key] = {
      ...rec,
      episteme: decay(rec.episteme),
      techne: decay(rec.techne),
      phronesis: decay(rec.phronesis)
    };
  }
  return next;
}

// -------- reputation-ceiling drift ---------------------------------------

// Ceiling drifts toward its computed target more quickly than the
// reputation reading itself — knowledge gains show up sooner as
// "possibility" than as realised reputation.
const REP_CEILING_DRIFT_PER_TICK = 0.003;

// Reputation drifts toward the ceiling passively. Small on its own;
// the direct writes (happy/unhappy departures, strain) remain the
// primary movers. This is background pressure toward "what the house
// could be at the current level of knowledge."
const REP_TO_CEILING_DRIFT_PER_TICK = 0.00025;

export function targetReputationCeiling(state: SimulationState): number {
  const lift = epistemeCeilingLift(state);
  return Math.max(0, Math.min(1, REP_CEILING_BASE + lift));
}

// Called from advanceTick every tick, in every period. The ceiling
// itself tracks the current knowledge state in every period — a
// morning of study visibly lifts what tonight *could* be — but the
// live reputation is only pulled toward the ceiling BETWEEN services
// (morning / afternoon / evening). During lunch and dinner the room
// drives reputation via strain + departure events (tickReputationDrift);
// letting a passive ceiling-drift also act during service would
// smear the operational signal the queue-monotonicity invariant
// depends on.
export function tickReputationCeilingDrift(draft: SimulationState): void {
  // Ceiling → target ceiling (all periods)
  const target = targetReputationCeiling(draft);
  draft.reputationCeiling += (target - draft.reputationCeiling) * REP_CEILING_DRIFT_PER_TICK;
  draft.reputationCeiling = Math.max(0, Math.min(1, draft.reputationCeiling));

  const period = draft.day.period;
  if (period === 'lunch' || period === 'dinner') return;

  // Reputation → ceiling, outside service. Applied only when
  // reputation is below the ceiling — the ceiling doesn't *pull
  // down* an overshoot from a great night. Above-ceiling states get
  // a gentler pull-down (half the up-rate) so overshoots do fade.
  const gap = draft.reputationCeiling - draft.reputation;
  const rate = gap >= 0
    ? REP_TO_CEILING_DRIFT_PER_TICK * techneDriftMultiplier(draft, 'cultural')
    : REP_TO_CEILING_DRIFT_PER_TICK * 0.5;
  const move = gap * rate;
  draft.reputation = Math.max(0, Math.min(1, draft.reputation + move));
}

export function applyReputationDelta(
  state: SimulationState,
  delta: number
): void {
  const next = state.reputation + delta;
  state.reputation = Math.max(0, Math.min(1, next));
}

// Per-tick reputation drift from continuous room state. Runs each tick
// but only during a running service — reputation should not drift while
// the doors are closed (morning / afternoon / evening).
export function tickReputationDrift(state: SimulationState): void {
  const period = state.day.period;
  if (period !== 'lunch' && period !== 'dinner') return;

  let delta = 0;

  const queueLen = state.waitingIds.length;
  if (queueLen > QUEUE_STRAIN_THRESHOLD) {
    delta -= QUEUE_STRAIN_RATE * TICK_SECONDS;
  }

  const activeGuests = state.guests.filter(
    (g) =>
      g.state === 'arriving' ||
      g.state === 'waiting' ||
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
  ).length;
  if (activeGuests > teamCapacity(state.team)) {
    delta -= TEAM_STRAIN_RATE * TICK_SECONDS;
  }

  if (delta !== 0) applyReputationDelta(state, delta);
}

// Called from service.ts when a guest gives up waiting. One-shot event
// (per guest), so the caller must ensure it fires at the transition
// only — not every tick the guest is in 'leaving' state.
export function reputationEventGiveUp(state: SimulationState): void {
  applyReputationDelta(state, -GIVE_UP_COST);
}

// Called from service.ts when a paying guest transitions to leaving.
// Reads their final satisfaction and applies the appropriate delta.
export function reputationEventDeparture(
  state: SimulationState,
  satisfaction: number
): void {
  if (satisfaction >= HAPPY_THRESHOLD) {
    applyReputationDelta(state, HAPPY_GAIN);
  } else if (satisfaction <= UNHAPPY_THRESHOLD) {
    applyReputationDelta(state, -UNHAPPY_COST);
  }
  // Otherwise: mediocre departure, no signal.
}
