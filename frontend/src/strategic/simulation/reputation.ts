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

import type { SimulationState } from '../types';

const TICK_SECONDS = 0.2;

// Queue-strain: reputation loses ~0.005/sec while a queue longer than
// 3 persists. Sustained over the full 10 min of a bad dinner that's
// ~3.0 reputation points — enough to shift the multiplier one band.
export const QUEUE_STRAIN_THRESHOLD = 3;
export const QUEUE_STRAIN_RATE = 0.005;

// Team-strain: reputation loses ~0.001/sec when active guests exceed
// COVERS_PER_STAFF per staff. At staffCount=3 the threshold is 15 guests.
export const COVERS_PER_STAFF = 5;
export const TEAM_STRAIN_RATE = 0.001;

// Per-event costs. Give-up dwarfs unhappy-departure because a walkout
// during service is a much stronger negative signal than a quiet
// dissatisfied guest paying and leaving.
export const GIVE_UP_COST = 0.02;
export const HAPPY_THRESHOLD = 0.75;
export const HAPPY_GAIN = 0.006;
export const UNHAPPY_THRESHOLD = 0.35;
export const UNHAPPY_COST = 0.012;

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
  const teamCapacity = state.policies.staffCount * COVERS_PER_STAFF;
  if (activeGuests > teamCapacity) {
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
