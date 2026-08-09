// ORDER 047 §2 — staff morale.
//
// A live scalar in [0, 1] that couples the room's health back into
// the sim's competence layer. Rises when the room is served well;
// falls under strain, on refusals, on collapse. Reads through to
// `effectiveCompetence`, which every consumer of team competence
// (event stream weighting, collapse formula) uses.
//
// The Vision Owner sharpened §2.1 with a specific ask: the meters
// must not just show the outcome of a scenario answer — they must
// drive what happens next. Morale is the connective tissue. A bad
// answer moves morale, morale moves effective competence, effective
// competence moves the ambient stream, the ambient stream moves
// satisfaction and reputation, and satisfaction feeds back into
// morale on the next tick.
//
// Recovery is deliberately tied to the room *working*, not to the
// room being *empty* (Vision Owner correction 2026-08-09: "en kväll
// som går bra ska höja moralen, inte bara en kväll som är tom").
// Per-tick drift pulls morale toward `0.5 + 0.5 × meanSat`, so a
// full room of happy guests targets 0.85–1.0; a full room of
// miserable guests targets 0.65. An empty room applies no drift
// (morale holds).

import type {
  RoleCompetence,
  SimulationState,
  TeamState
} from '../types';
import { teamCompetence } from './team';

// Bounds + baseline.
export const MORALE_MIN = 0;
export const MORALE_MAX = 1;
export const MORALE_INITIAL = 0.85;

// Between-day regression target — morale drifts toward this on the
// evening → morning transition (halfway pull, per reducer). A run of
// good evenings holds morale high; a bad run doesn't spiral because
// the regression pulls it back toward the baseline.
export const MORALE_DAILY_REGRESSION_TARGET = 0.75;

// Per-tick drift toward a satisfaction-derived target when the room
// has active guests. Small enough that a bad tick doesn't jolt the
// meter; large enough that a good service (mean sat ~0.8 for 5 min)
// visibly climbs (~0.6/min recovery share from drift alone at mid-
// morale). See §2 report for the arithmetic.
export const MORALE_DRIFT_RATE = 0.001;

// Per-event bumps. Chosen so a well-served evening (~5 happy
// departures, 3 positives, 2 strain events over 15 min) nets +0.10;
// a poorly-served evening (~2 unhappy departures, 5 strain events)
// nets −0.06. See morale.test.ts.
export const MORALE_POSITIVE_EVENT_BUMP = 0.015;
export const MORALE_STRAIN_EVENT_HIT = 0.006;
export const MORALE_HAPPY_DEPARTURE_BUMP = 0.020;
export const MORALE_UNHAPPY_DEPARTURE_HIT = 0.010;
export const MORALE_GIVE_UP_HIT = 0.030;              // walkout during service — real hit
export const MORALE_SCENARIO_ENGAGE_BUMP = 0.025;    // A/B on a demanding scenario
export const MORALE_SCENARIO_REFUSE_HIT = 0.050;     // C when refusal reads as unsupport
export const MORALE_AGENCY_ACCEPT_BUMP = 0.030;
export const MORALE_AGENCY_DECLINE_HIT = 0.030;
export const MORALE_COLLAPSE_HIT = 0.200;

// -------- effectiveCompetence ------------------------------------------
//
// Every consumer of team competence in the sim reads through here.
// Morale acts as a linear scale: at morale 0 the team operates at
// 65 % of their base competence (they are still competent, just less
// present); at morale 1.0 they operate at 100 %. The floor at 0.65
// keeps a bad-morale service still legible — a specialist kock with
// bad morale is still better than a lärling with good morale.

const MORALE_COMPETENCE_FLOOR = 0.65;
const MORALE_COMPETENCE_SPAN = 0.35;

export function moraleCompetenceMultiplier(morale: number): number {
  const m = Math.max(0, Math.min(1, morale));
  return MORALE_COMPETENCE_FLOOR + MORALE_COMPETENCE_SPAN * m;
}

export function effectiveTeamCompetence(
  team: TeamState,
  axis: keyof RoleCompetence,
  morale: number
): number {
  return teamCompetence(team, axis) * moraleCompetenceMultiplier(morale);
}

export function effectiveTeamMaxCompetence(
  team: TeamState,
  axis: keyof RoleCompetence,
  morale: number
): number {
  if (team.members.length === 0) return 0;
  let max = 0;
  for (const m of team.members) {
    if (m.competence[axis] > max) max = m.competence[axis];
  }
  return max * moraleCompetenceMultiplier(morale);
}

// -------- per-tick drift -----------------------------------------------

function activeSeatedSatisfaction(state: SimulationState): {
  count: number;
  meanSat: number;
} {
  let count = 0;
  let sum = 0;
  for (const g of state.guests) {
    if (
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
    ) {
      count += 1;
      sum += g.satisfaction;
    }
  }
  return { count, meanSat: count > 0 ? sum / count : 0 };
}

// Called from advanceTick during service post-prep. Pulls morale toward
// a target derived from the mean satisfaction of active seated guests.
// If nobody is seated (opening / prep / dead room), no drift applies —
// morale holds where it was.
export function tickMoraleDrift(draft: SimulationState): void {
  const period = draft.day.period;
  if (period !== 'lunch' && period !== 'dinner') return;
  if (draft.day.openingEndsAt !== null) return;
  if (draft.day.prepEndsAt !== null) return;

  const { count, meanSat } = activeSeatedSatisfaction(draft);
  if (count === 0) return;

  const target = 0.5 + 0.5 * meanSat;
  draft.morale = clampMorale(
    draft.morale + MORALE_DRIFT_RATE * (target - draft.morale)
  );
}

// -------- event bumps --------------------------------------------------

export function clampMorale(value: number): number {
  return Math.max(MORALE_MIN, Math.min(MORALE_MAX, value));
}

export function bumpMorale(state: SimulationState, delta: number): void {
  if (delta === 0) return;
  state.morale = clampMorale(state.morale + delta);
}
