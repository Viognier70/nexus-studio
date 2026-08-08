// ORDER 046 §1 — service collapse.
//
// A running service may end early from a traceable staffing failure.
// The failure is always something a competent person at the failing
// station would have caught — the runner at the pass, the värd at
// the door, the kock behind the board. Rare, but never random.
//
// Formula (Vision Owner corrected 2026-08-08 — no hard threshold on
// competence, weight by strain):
//
//     weakest  = min over axes { scientific, cultural, practical } of
//                the MAX team competence in that axis
//     strain   = strainMultiplier(loadOf(state))       // eventStream.ts
//     prob/tick = COLLAPSE_FLOOR
//               + (1 − weakest) × strain × COLLAPSE_STRAIN_GAIN
//
// The MAX-per-axis mirrors the prep-floor polarity check: prep and
// collapse are both single-station events. A single competent person
// covers a station; a team without anyone covering the failing axis
// is what fails. Which axis fails is decided by which is weakest at
// the tick the roll lands, so the same team can fail scientifically
// on one evening and culturally on another.
//
// The gain constant is chosen so a mid-strain (~load 1.0) weak team
// (weakest ≈ 0.20, strain 0.3× at load 1.0) sees ~9 % collapse per
// 15-min service; a strong team at rest sees ~1 %. See §1.1 in the
// order document for the full expected-rate table.

import type {
  ConsequenceEvent,
  EventStreamEntry,
  SimulationState,
  SustainabilityKey,
  TeamState
} from '../types';
import { createRng } from '../util/rng';
import { COLLAPSE_TEXTS } from '../../content/collapse.sv';
import { loadOf, strainMultiplier, STREAM_KEEP } from './eventStream';

// Per-tick constants. Sim ticks at 5 Hz (0.2 s / tick, TICK_SECONDS
// in eventStream.ts). A 15-min service is 4500 ticks; the constants
// are chosen against that horizon.
export const COLLAPSE_FLOOR = 0.00003;
export const COLLAPSE_STRAIN_GAIN = 0.00025;

// Reputation dip when a service collapses. Same magnitude as a
// scenario-C refusal on walk-in-of-five × 5 — collapse is worse than
// a single refusal because the whole evening ended early.
export const COLLAPSE_REPUTATION_DROP = 0.15;

export type CompetenceAxis = 'scientific' | 'cultural' | 'practical';

// Which sustainability the collapse's stream line is tagged as.
// Scientific + cultural fail as 'social' (the room's read of the
// team); practical fails as 'economic' (house standard directly
// touches revenue via satisfaction → repeat visits).
const AXIS_SUSTAINABILITY: Record<CompetenceAxis, SustainabilityKey> = {
  scientific: 'social',
  cultural: 'social',
  practical: 'economic'
};

// -------- weakest-axis calculation ---------------------------------------

// The maximum competence across the team in one axis. A single
// competent person covers a station; the average would smear the
// specialist across the whole team, which is not how a single
// moment of failure works. Empty team returns 0 (the extreme case).
export function teamMaxCompetence(team: TeamState, axis: CompetenceAxis): number {
  if (team.members.length === 0) return 0;
  let max = 0;
  for (const m of team.members) {
    const v = m.competence[axis];
    if (v > max) max = v;
  }
  return max;
}

// Weakest axis + its max-competence value. Ties broken in a stable
// order (scientific → cultural → practical) so the same state
// deterministically picks the same axis.
export function weakestAxis(team: TeamState): {
  axis: CompetenceAxis;
  value: number;
} {
  const axes: readonly CompetenceAxis[] = ['scientific', 'cultural', 'practical'];
  let weakestAxisName: CompetenceAxis = axes[0];
  let weakestValue = Infinity;
  for (const a of axes) {
    const v = teamMaxCompetence(team, a);
    if (v < weakestValue) {
      weakestValue = v;
      weakestAxisName = a;
    }
  }
  return { axis: weakestAxisName, value: weakestValue };
}

// -------- per-tick probability ------------------------------------------

export function collapseProbabilityPerTick(state: SimulationState): number {
  const { value } = weakestAxis(state.team);
  const strain = strainMultiplier(loadOf(state));
  const p = COLLAPSE_FLOOR + (1 - value) * strain * COLLAPSE_STRAIN_GAIN;
  // Clamp to [0, 1]; the analytical max at strain 3.0, weakest 0 is
  // 0.00003 + 3 × 0.00025 = 0.00078, well below 1 — clamp is defensive.
  return Math.max(0, Math.min(1, p));
}

// -------- fire ---------------------------------------------------------

// Called from advanceTick after the ambient rolls, before the day-
// transition check. Rolls once per tick during running service.
// Idempotent: if state.day.serviceCollapsed is already true, no-op.
//
// Returns nothing; mutates draft in place. The reducer's tickDay-
// Transitions runs after this and would detect the manual period
// flip, but the manual flip clears currentServiceLengthMinutes so
// the natural close guard fails and only the evening branch runs.
//
// **Uses a tick-derived RNG, not the main rng state.** Adding one
// draw per service tick to the main sequence would shift every
// downstream arrival / walk-away random draw, invalidating pinned
// invariants elsewhere. The tick-derived seed keeps this roll
// deterministic per (seed, tick) without perturbing the main draws.
export function tickCollapseRoll(draft: SimulationState): void {
  const period = draft.day.period;
  if (period !== 'lunch' && period !== 'dinner') return;
  // Must be post-opening + post-prep — no collapse during briefings.
  if (draft.day.openingEndsAt !== null) return;
  if (draft.day.prepEndsAt !== null) return;
  if (draft.day.serviceCollapsed) return;

  const p = collapseProbabilityPerTick(draft);
  // Tick-derived seed. Knuth multiplicative hash of (tick × seed)
  // mixed with the tick — deterministic, well-distributed across
  // tick counts, independent of the main rng cursor.
  const seed = ((draft.tick * 2654435761) ^ (draft.seed * 40503)) >>> 0;
  const rng = createRng(seed);
  if (!rng.chance(p)) return;

  fireCollapse(draft);
}

// Extracted so tests can construct a scripted collapse deterministically
// (without needing to seed the RNG to a specific value that lands the
// probability roll).
export function fireCollapse(draft: SimulationState): void {
  const { axis } = weakestAxis(draft.team);
  const sustainability = AXIS_SUSTAINABILITY[axis];

  // Hand-authored line from the axis's bank. Not repeat-guarded — a
  // collapse line only fires when a service collapses, which is rare
  // enough that a repeat would take multiple bad evenings to surface.
  // Picking round-robin by day + service parity so back-to-back
  // collapses at least differ in wording.
  const bank = COLLAPSE_TEXTS[axis];
  const parity = draft.day.period === 'lunch' ? 0 : 1;
  const idx = (draft.day.dayNumber - 1 + parity) % bank.length;
  const text = bank[idx];

  const entry: EventStreamEntry = {
    at: draft.simTime,
    text,
    category: 'ambient',
    causeTag: 'ignorance',
    sustainability,
    kind: 'collapse',
    scenarioId: null
  };
  draft.eventStream = [...draft.eventStream, entry].slice(-STREAM_KEEP);

  draft.reputation = Math.max(0, draft.reputation - COLLAPSE_REPUTATION_DROP);

  const consequence: ConsequenceEvent = {
    kind: 'staff_resigns',
    capital: 'social',
    firedAt: draft.simTime,
    active: true
  };
  draft.consequenceEvents = [...draft.consequenceEvents, consequence];

  // Force-close the service. Preserves serviceCollapsed + collapseAxis
  // so the evening-account panel can read them; clears the rest as if
  // the natural close ran. Agency members + offer cleared here rather
  // than by tickDayTransitions (whose lunch/dinner guards read the
  // service length, which we're about to null).
  const nextTeam = { ...draft.team, members: draft.team.members.filter((m) => !m.isAgency) };
  draft.team = nextTeam;
  draft.agencyOffer = null;
  draft.day = {
    ...draft.day,
    period: 'evening',
    periodStartAt: draft.simTime,
    currentServiceLengthMinutes: null,
    scenariosPlanned: 0,
    scenariosFiredThisService: 0,
    scenarioTriggerTimes: [],
    openingEndsAt: null,
    prepEndsAt: null,
    prepIgnoranceCount: 0,
    prepFloorSchedule: [],
    weather: null,
    waitingAtOpening: 0,
    doorsOpenedThisService: false,
    worldFactors: [],
    serviceCollapsed: true,
    collapseAxis: axis
  };
  draft.events = [
    ...draft.events,
    {
      at: draft.simTime,
      kind: 'system',
      text: `Kvällen avbröts — ${axis === 'scientific' ? 'köket' : axis === 'cultural' ? 'rummet' : 'huset'} höll inte.`
    }
  ];
}
