// ORDER 078 (M5) — mise en place readiness model.
//
// Five concrete inventory items, one per physical station, each
// getting a readiness value in [0, 1] fixed at doors-open per
// M5_MISE_EN_PLACE_AND_RHYTHM_REPORT_ORDER_078.md §2.
//
// The model shape mirrors the collapse formula (weakest-axis min)
// so a Vision Owner reading the collapse code sees the same shape
// here: the room breaks where the weakest station is thinnest.

import type { SimulationState, TeamMember } from '../types';

// Duplicated to avoid a circular reducer ↔ miseEnPlace import. Both
// values live in reducer.ts / constants.ts; if PREP_DURATION_SEC or
// OPENING_DURATION_SEC move, keep these two in sync.
const OPENING_DURATION_SEC_M5 = 10;

// The five items. Order is authoring order — panel + tests may
// iterate on this array directly rather than hardcoding ids.
export const PREP_ITEMS = [
  { id: 'ice',      station: 'bar',        axis: 'cultural'  as const },
  { id: 'napkins',  station: 'floor',      axis: 'practical' as const },
  { id: 'cutlery',  station: 'floor',      axis: 'practical' as const },
  { id: 'stations', station: 'kitchen',    axis: 'scientific' as const },
  { id: 'garnish',  station: 'pass',       axis: 'cultural'  as const }
] as const;

export type PrepItemId = typeof PREP_ITEMS[number]['id'];
export type CompetenceAxis = 'scientific' | 'cultural' | 'practical';

// PREP_DURATION_SEC is authored in reducer.ts (120s). Duplicated as
// a const here to avoid an import cycle; if the reducer's constant
// moves, keep these two in sync.
export const PREP_DURATION_SEC_M5 = 120;

// Per-item weakest ceiling; kept small so the model is legible.
const MORNING_CHANGE_PENALTY_STEP = 0.15;
const MORNING_CHANGE_PENALTY_CAP  = 0.60;
const MORALE_BOOST_MIN = 0.90;
const MORALE_BOOST_MAX = 1.10;
const CAPACITY_LOAD_KNEE_COVERS = 30;
const CAPACITY_LOAD_PENALTY_PER_UNIT = 0.10;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function teamCompetenceMax(members: TeamMember[], axis: CompetenceAxis): number {
  let max = 0;
  for (const m of members) {
    const v = m.competence[axis] ?? 0;
    if (v > max) max = v;
  }
  return max;
}

// Team size fraction: three or more staff = 1.0; two = 0.7; one = 0.4;
// zero = 0. Chosen so a thin team drags every station a little
// even before per-axis competence lands. Mirrors ORDER 052 §2
// "a thin team cannot prepare a full room in the same window."
function teamSizeFraction(members: TeamMember[]): number {
  const n = members.length;
  if (n >= 3) return 1;
  if (n === 2) return 0.7;
  if (n === 1) return 0.4;
  return 0;
}

export interface PrepInputs {
  readonly members: TeamMember[];
  readonly actualPrepSeconds: number;    // clamped to [0, PREP_DURATION_SEC_M5]
  readonly morale: number;               // [0, 1]
  readonly morningChanges: number;       // count of morning policy changes
  readonly coversExpected: number;       // capacity or best estimate
}

// Compute per-item readiness at doors-open. Pure function; called
// once per service open by the reducer.
export function computePrepReadiness(
  inputs: PrepInputs
): Record<string, number> {
  const teamSize = teamSizeFraction(inputs.members);
  const prepFraction = clamp01(inputs.actualPrepSeconds / PREP_DURATION_SEC_M5);
  const moraleBoost = MORALE_BOOST_MIN
    + (MORALE_BOOST_MAX - MORALE_BOOST_MIN) * clamp01(inputs.morale);
  const morningPenaltyRaw = MORNING_CHANGE_PENALTY_STEP * inputs.morningChanges;
  const morningPenalty = Math.min(morningPenaltyRaw, MORNING_CHANGE_PENALTY_CAP);
  const capacityLoad = 1 - CAPACITY_LOAD_PENALTY_PER_UNIT
    * Math.max(0, inputs.coversExpected / CAPACITY_LOAD_KNEE_COVERS - 1);

  const out: Record<string, number> = {};
  for (const item of PREP_ITEMS) {
    const axisComp = teamCompetenceMax(inputs.members, item.axis);
    const base = Math.min(1, teamSize * axisComp);
    const raw = base * prepFraction * moraleBoost * (1 - morningPenalty) * capacityLoad;
    out[item.id] = clamp01(raw);
  }
  return out;
}

// Weakest item — used to pick the after-countdown line's station
// name and to set causeTag on any short_prep events.
export function weakestPrepItem(
  readiness: Record<string, number>
): { id: PrepItemId; readiness: number; station: string } | null {
  let weakest: { id: PrepItemId; readiness: number; station: string } | null = null;
  for (const item of PREP_ITEMS) {
    const r = readiness[item.id] ?? 0;
    if (!weakest || r < weakest.readiness) {
      weakest = { id: item.id, readiness: r, station: item.station };
    }
  }
  return weakest;
}

// Compose the doors-open line per §4 of the report gate.
export function afterCountdownLine(readiness: Record<string, number>): string {
  const weakest = weakestPrepItem(readiness);
  if (!weakest) return 'Doors open — service begins.';
  const allReady = PREP_ITEMS.every((i) => (readiness[i.id] ?? 0) >= 0.7);
  if (allReady) return 'Doors open — the room is ready.';
  if (weakest.readiness < 0.4) {
    return `Doors open — ${weakest.station} is thin (${weakest.id}).`;
  }
  return 'Doors open — service begins.';
}

// ORDER 078 (M5) — service rhythm reading per §3. Recomputed each
// tick; input is the current staff load array (workload in [0, 1]).
// Colour policy: green < 0.4, amber [0.4, 0.7), red ≥ 0.7. The
// service reading is the worst puck this tick (max load → worst
// colour).
export function loadToColour(load: number): 'green' | 'amber' | 'red' {
  if (load < 0.4) return 'green';
  if (load < 0.7) return 'amber';
  return 'red';
}

// Service rhythm uses StaffMember workload — the visible-puck load,
// not TeamMember. StaffMember lives on state.staff (the visual layer),
// TeamMember lives on state.team.members (the economic layer).
export function computeServiceRhythm(
  loads: readonly number[]
): 'green' | 'amber' | 'red' {
  let worst: 'green' | 'amber' | 'red' = 'green';
  for (const load of loads) {
    const c = loadToColour(load);
    if (c === 'red') return 'red';
    if (c === 'amber' && worst === 'green') worst = 'amber';
  }
  return worst;
}

// Convenience for the reducer: compute readiness at doors-open using
// the current draft state.
export function computePrepReadinessFromState(state: SimulationState): Record<string, number> {
  const openingEnd = (state.day.periodStartAt ?? 0) + OPENING_DURATION_SEC_M5;
  const actualPrepSeconds = Math.max(0, state.simTime - openingEnd);
  return computePrepReadiness({
    members: state.team.members,
    actualPrepSeconds,
    morale: state.morale,
    morningChanges: state.day.morningPolicyChanges.length,
    coversExpected: state.policies.capacity
  });
}
