// ORDER 043 v3 §10 step 5 — the team (economic + competence layer).
//
// Four roles, three defaults + a junior:
//   värd     — hospitality, high cultural
//   servitör — floor service, mid cultural + mid practical
//   kock     — kitchen technique, high scientific
//   lärling  — apprentice, low across the board, low cost
//
// Runs alongside `state.staff` (visual pucks). One TeamMember can
// correspond to one StaffMember, but the two lifecycles are
// independent — an agency hire adds a TeamMember (economic
// footprint) without a StaffMember (no visual puck for cycle 1).
//
// Structural cost accumulates per operating day (evening → next
// morning transition in reducer). Contracts lock the daily cost for
// CONTRACT_DAYS from hire — cycle-1 mechanic without a fire action,
// so the lock is design-forward not enforced yet.

import type {
  RoleCompetence,
  StaffRole,
  TeamMember,
  TeamState
} from '../types';

// Contract length in days. Vision Owner: "strukturkostnad låst över
// flera dagar." Seven days = one week, a legible pay cycle.
export const CONTRACT_DAYS = 7;

// Per-role default competence and daily cost. Cycle-1 tuning; will
// be revised from playtest. Numbers are round for readability — a
// specialist reads 0.75 in their axis, a generalist ~0.5, a novice
// ~0.2.
export const ROLE_DEFAULTS: Record<
  StaffRole,
  { competence: RoleCompetence; dailyCost: number }
> = {
  värd: {
    competence: { scientific: 0.20, cultural: 0.75, practical: 0.50 },
    dailyCost: 1200
  },
  servitör: {
    competence: { scientific: 0.30, cultural: 0.50, practical: 0.60 },
    dailyCost: 1000
  },
  kock: {
    competence: { scientific: 0.75, cultural: 0.20, practical: 0.60 },
    dailyCost: 1400
  },
  lärling: {
    competence: { scientific: 0.20, cultural: 0.30, practical: 0.30 },
    dailyCost: 500
  }
};

// Agency hires join for a single service. Generic mid-range
// competence — enough to relieve strain without matching a
// specialist. One-time cost paid at hire, no daily accumulation.
export const AGENCY_COMPETENCE: RoleCompetence = {
  scientific: 0.40,
  cultural: 0.40,
  practical: 0.40
};
// ORDER 050 §3 (2026-08-10) — bumped from 800 to 5000 SEK under the
// cash refactor. Absorbs the retired AGENCY_ECONOMIC_COST which used
// to apply an additional 0.04 capital hit alongside the 800-kr wage.
// Post-refactor: one line, real money, ~a Friday-night agency waiter
// in Sweden. Consumed by reducer.acceptAgency via applyCashCost.
export const AGENCY_HIRE_COST = 5000;

// ORDER 043 v3 §10 step 5 — the alternative-cost mechanic. Vision
// Owner: "hyrpersonal under service med socialt kapital som
// alternativkostnad om spelaren avstår." Declining an offer signals
// to the team that management doesn't intervene when they're
// drowning; social capital ticks down. Accepting spends money
// (see AGENCY_HIRE_COST above) and relieves strain.
export const AGENCY_DECLINE_SOCIAL_COST = 0.03;

// Offer trigger. Sustained load above threshold for this many
// continuous sim-seconds fires an offer. Cycle-1 tuning:
//   threshold 1.2 = strain multiplier ≈ 0.8× (the shoulder of the
//   strain curve — team is stressed but not broken)
//   sustained 45 s so a brief spike doesn't fire an offer for a
//   dip the team can absorb on its own
//   window 60 s — offer sits on screen for a minute, then expires
//   as an implicit decline (with the social cost applied)
export const AGENCY_OFFER_LOAD_THRESHOLD = 1.2;
export const AGENCY_OFFER_SUSTAINED_SEC = 45;
export const AGENCY_OFFER_WINDOW_SEC = 60;

// -------- initial team ----------------------------------------------------

// Cycle-1 starting team: one of each of värd, servitör, kock. Not
// including a lärling — the player can hire one later. A future
// order (opening screen) may let the player pick this composition;
// for now the initial three are fixed.
export function makeTeamMember(
  role: StaffRole,
  hiredOnDay: number,
  isAgency = false
): TeamMember {
  const defaults = ROLE_DEFAULTS[role];
  return {
    id: `${role}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    competence: { ...defaults.competence },
    dailyCost: defaults.dailyCost,
    hiredOnDay,
    contractEndsDay: hiredOnDay + CONTRACT_DAYS,
    isAgency
  };
}

export function initialTeam(): TeamState {
  return {
    members: [
      makeTeamMember('värd', 1),
      makeTeamMember('servitör', 1),
      makeTeamMember('kock', 1)
    ],
    paidStructuralCost: 0,
    strainSinceSimTime: null
  };
}

// -------- competence readout ----------------------------------------------
//
// Used by the event stream's ignorance-weighting. Each competence
// source name (scientific / cultural / practical) is answered by an
// average over the team's members in that axis. A team with a low-
// competence member drags the average — reads as the whole team
// carrying that weakness, which is how it should feel from the
// customer's side ("the service was inconsistent tonight").

export function teamCompetence(
  team: TeamState,
  axis: keyof RoleCompetence
): number {
  if (team.members.length === 0) return 0;
  const total = team.members.reduce((s, m) => s + m.competence[axis], 0);
  return total / team.members.length;
}

// Capacity for the reputation loop + agency-offer trigger. Each
// team member absorbs the same COVERS_PER_MEMBER guests. Agency
// hires count too — they add capacity for the service they were
// hired for. Kept as one flat number for cycle 1; a future order
// may split by role (a runner absorbs seats differently than a cook).
export const COVERS_PER_MEMBER = 5;

export function teamCapacity(team: TeamState): number {
  return Math.max(1, team.members.length * COVERS_PER_MEMBER);
}

// -------- day-advance cost accumulation ----------------------------------

// Called from the reducer on evening → morning transition. Charges
// each non-agency member their dailyCost against the running total.
// Agency members are cleaned up at service close (separate wire),
// so they should already be gone by day-advance.
export function chargeStructuralCost(team: TeamState): TeamState {
  const dailyTotal = team.members
    .filter((m) => !m.isAgency)
    .reduce((s, m) => s + m.dailyCost, 0);
  return {
    ...team,
    paidStructuralCost: team.paidStructuralCost + dailyTotal
  };
}

// -------- agency add / remove --------------------------------------------

export function addAgencyMember(team: TeamState, dayNumber: number): TeamState {
  // Cycle-1: agency joins as an all-round mid-competence hand. Role
  // is 'lärling' visually (junior, no leadership presence) but
  // competence is AGENCY_COMPETENCE (higher than a real lärling).
  const member: TeamMember = {
    id: `agency-${Math.random().toString(36).slice(2, 8)}`,
    role: 'lärling',
    competence: { ...AGENCY_COMPETENCE },
    dailyCost: 0,
    hiredOnDay: dayNumber,
    contractEndsDay: dayNumber, // ends at day close
    isAgency: true
  };
  return { ...team, members: [...team.members, member] };
}

export function removeAgencyMembers(team: TeamState): TeamState {
  return {
    ...team,
    members: team.members.filter((m) => !m.isAgency)
  };
}
