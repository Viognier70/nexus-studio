// ORDER 043 Addendum A — the service event stream.
//
// Two categories:
//   ambient events — weighted rolls per tick from base rates ×
//                    ignoranceMultiplier × strainMultiplier.
//   outcome events — hand-authored per (scenarioId, choice), fired
//                    deterministically 6 s and 18 s after RESOLVE.
//
// Weighting model (approved by Vision Owner, 2026-08-08):
//   ignoranceMultiplier(c) = 0.10 + 1.5 · (1 − c)
//     c = 1.0 → 0.10× (a competent kitchen has small hiccups but no noise floor)
//     c = 0.0 → 1.60×
//   strainMultiplier(L) =
//     L ≤ 1.0 → 0.30×  (a running kitchen has hiccups even at rest — Vision Owner:
//                       "helt tyst läser som att systemet är avstängt")
//     L > 1.0 → min(3.0, 0.30 + 2.5 · (L − 1))
//   Both floors are DELIBERATELY asymmetric: ignorance drops to
//   0.10 (competence is the "silent when perfect" axis) but strain
//   stays at 0.30 (capacity always leaks a little).
//
// Streams describe, scenarios move capital. Per Vision Owner:
// "En ström som obemärkt flyttar hållbarheterna gör det svårt att
// spåra vad som faktiskt orsakade en förändring." No per-event
// capital nudges here; the stream is read-only against state.

import type {
  EventStreamEntry,
  PendingOutcome,
  SimulationState,
  SustainabilityKey
} from '../types';
import type { Rng } from '../util/rng';
import {
  AMBIENT_TEXTS,
  PREP_TEXTS,
  type AmbientEventKind,
  type PrepEventKind
} from '../../content/eventStream.sv';
import { currentRhythmMultiplier } from './rhythm';
import { teamCapacity, teamCompetence } from './team';

const TICK_SECONDS = 0.2;

// Ring-buffer cap for the visible stream (older entries fall off).
export const STREAM_KEEP = 40;

// Outcome timing per Vision Owner: 6 s and 18 s after choice, inside
// the SCENARIO_SETTLE_AFTER (35 s) window so the sequence reads
// choice → outcome — outcome — mentor.
export const OUTCOME_OFFSETS_SEC: readonly number[] = [6, 18];

// ORDER 043 Addendum A repeat-guard (Vision Owner 2026-08-08):
// "samma mening ska inte komma två gånger på fyra minuter." When
// picking an ambient sentence, filter out any that appeared in the
// stream within this window. If the whole bank is exhausted (all
// eight variants used inside the window), fall back to the full
// bank — a repeat is better than a silent tick.
export const REPEAT_GUARD_SEC = 240;

// ORDER 043 Addendum A prep window (Vision Owner 2026-08-08):
// "Håll den kort — ett par minuter, inte fem." Two minutes reads as
// a busy prep beat without becoming its own act.
export const PREP_DURATION_SEC = 120;

// Carryover trigger: if the prep window fires this many ignorance
// events, a bottleneck line is scheduled ~13 min into service — the
// undone mise en place coming home to roost.
export const PREP_CARRYOVER_THRESHOLD = 2;
export const PREP_CARRYOVER_OFFSET_SEC = 13 * 60;

// ORDER 043 v3 §10 step 5 competence source resolution — replaces
// the trainingLevel stand-in from §A.7. Each competence source name
// now maps to a team-competence axis:
//   'scientific'    → team's average scientific competence (kitchen)
//   'cultural'      → team's average cultural competence (hospitality)
//   'trainingLevel' → team's average practical competence (house standard)
// Reading with the team model in place: a kitchen with a specialist
// kock ticks kitchen_slip events down noticeably; hiring a lärling
// with low cultural drags service_slip events up until an experienced
// värd or servitör balances the average.

export type CompetenceSource = 'scientific' | 'cultural' | 'trainingLevel' | null;

export function competenceFor(
  source: CompetenceSource,
  state: SimulationState
): number {
  if (source === null) return 1; // strain-only events pass through 1×
  if (source === 'trainingLevel') return teamCompetence(state.team, 'practical');
  return teamCompetence(state.team, source);
}

// Load = active guests / teamCapacity(state.team). Reads the same
// denominator as reputation.ts and the agency-offer trigger, so all
// three systems agree on what "strained" means. Rewired from
// policies.staffCount × 5 at ORDER 043 v3 §10 step 5.
export function loadOf(state: SimulationState): number {
  const active = state.guests.filter(
    (g) =>
      g.state === 'arriving' ||
      g.state === 'waiting' ||
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
  ).length;
  return active / teamCapacity(state.team);
}

export function ignoranceMultiplier(competence: number): number {
  const c = Math.max(0, Math.min(1, competence));
  return 0.10 + 1.5 * (1 - c);
}

export function strainMultiplier(load: number): number {
  const L = Math.max(0, load);
  if (L <= 1.0) return 0.30;
  return Math.min(3.0, 0.30 + 2.5 * (L - 1));
}

// -------- event definitions ------------------------------------------------

export interface EventDef {
  kind: AmbientEventKind;
  causeTag: 'ignorance' | 'strain' | 'both';
  sustainability: SustainabilityKey;
  baseRatePerMin: number;
  competenceSource: CompetenceSource;
}

// ORDER 043 Addendum A prep-window event defs. Fire only while
// `state.day.prepEndsAt` is set (prep window open). Rates chosen so
// a 2-min prep produces ~3–4 lines at mid competence — enough to
// read the team from, not enough to become its own act.
export interface PrepEventDef {
  kind: PrepEventKind;
  competenceSource: 'scientific' | 'cultural' | 'trainingLevel';
  baseRatePerMin: number;
}

export const PREP_EVENT_DEFS: readonly PrepEventDef[] = [
  { kind: 'prep_kitchen',  competenceSource: 'scientific',    baseRatePerMin: 0.6 },
  { kind: 'prep_room',     competenceSource: 'trainingLevel', baseRatePerMin: 0.6 },
  { kind: 'prep_delivery', competenceSource: 'cultural',      baseRatePerMin: 0.6 }
];

// Base rates sum to ≈ 1.0 event / sim-minute across all kinds, so
// the multiplier math from the model report applies directly to
// "events per 15-min service" without extra normalisation.
export const EVENT_DEFS: readonly EventDef[] = [
  {
    kind: 'kitchen_slip',
    causeTag: 'ignorance',
    competenceSource: 'scientific',
    sustainability: 'social',
    baseRatePerMin: 0.15
  },
  {
    kind: 'service_slip',
    causeTag: 'ignorance',
    competenceSource: 'cultural',
    sustainability: 'social',
    baseRatePerMin: 0.15
  },
  {
    kind: 'delivery_short',
    causeTag: 'ignorance',
    competenceSource: 'cultural',
    sustainability: 'ecological',
    baseRatePerMin: 0.15
  },
  {
    kind: 'bottleneck',
    causeTag: 'strain',
    competenceSource: null,
    sustainability: 'social',
    baseRatePerMin: 0.20
  },
  {
    kind: 'wait_stretched',
    causeTag: 'strain',
    competenceSource: null,
    sustainability: 'social',
    baseRatePerMin: 0.20
  },
  {
    kind: 'turnover_stumble',
    causeTag: 'both',
    competenceSource: 'trainingLevel',
    sustainability: 'economic',
    baseRatePerMin: 0.15
  }
];

// -------- rate calculation -------------------------------------------------

export function eventMultiplier(def: EventDef, state: SimulationState): number {
  if (def.causeTag === 'ignorance') {
    return ignoranceMultiplier(competenceFor(def.competenceSource, state));
  }
  if (def.causeTag === 'strain') {
    return strainMultiplier(loadOf(state));
  }
  // Both — multiply. A weak team under strain rings loudest.
  return (
    ignoranceMultiplier(competenceFor(def.competenceSource, state)) *
    strainMultiplier(loadOf(state))
  );
}

export function eventProbabilityPerTick(
  def: EventDef,
  state: SimulationState
): number {
  // ORDER 043 Addendum A rhythm — the ambient stream inherits the
  // service curve (opening / buildup / rush / decline) so cadence
  // rises and falls with the room's pace, not as a flat carpet.
  const perMinute =
    def.baseRatePerMin *
    eventMultiplier(def, state) *
    currentRhythmMultiplier(state);
  // Cap at 1 to keep chance() well-defined even in extreme states.
  return Math.min(1, (perMinute * TICK_SECONDS) / 60);
}

// -------- ambient / prep roll --------------------------------------------

function pickTextWithRepeatGuard(
  bank: readonly string[],
  state: SimulationState,
  rng: Rng
): string {
  // Filter out any sentence that appeared in the last REPEAT_GUARD_SEC
  // of stream. Text-level filter so the guard trips across ambient,
  // prep, and outcome layers alike.
  const now = state.simTime;
  const recentTexts = new Set<string>();
  for (const e of state.eventStream) {
    if (now - e.at <= REPEAT_GUARD_SEC) recentTexts.add(e.text);
  }
  const fresh = bank.filter((t) => !recentTexts.has(t));
  const pool = fresh.length > 0 ? fresh : bank;
  return pool[Math.floor(rng.next() * pool.length)];
}

function makeAmbientEntry(
  def: EventDef,
  state: SimulationState,
  rng: Rng
): EventStreamEntry {
  return {
    at: state.simTime,
    text: pickTextWithRepeatGuard(AMBIENT_TEXTS[def.kind], state, rng),
    category: 'ambient',
    causeTag: def.causeTag,
    sustainability: def.sustainability,
    kind: def.kind,
    scenarioId: null
  };
}

function makePrepEntry(
  def: PrepEventDef,
  state: SimulationState,
  rng: Rng
): EventStreamEntry {
  // Prep events all carry causeTag: 'ignorance' — a competent team
  // barely leaks them; an incompetent one does. Sustainability is
  // 'social' as a stand-in (the team's readiness is a social
  // reading), matching the ambient convention for team-strain events.
  return {
    at: state.simTime,
    text: pickTextWithRepeatGuard(PREP_TEXTS[def.kind], state, rng),
    category: 'ambient',
    causeTag: 'ignorance',
    sustainability: 'social',
    kind: def.kind,
    scenarioId: null
  };
}

function prepEventProbabilityPerTick(
  def: PrepEventDef,
  state: SimulationState
): number {
  // Prep rate = base * ignoranceMultiplier(competenceForAxis).
  // No strain component during prep — the guests aren't in yet.
  const source = def.competenceSource;
  const axis: 'scientific' | 'cultural' | 'practical' =
    source === 'trainingLevel' ? 'practical' : source;
  const c = teamCompetence(state.team, axis);
  const perMinute = def.baseRatePerMin * ignoranceMultiplier(c);
  return Math.min(1, (perMinute * TICK_SECONDS) / 60);
}

// -------- outcome scheduling ----------------------------------------------

// Called from resolveScenario. Returns the PendingOutcome list to
// splice onto the existing state.pendingOutcomes.
//
// Post-ORDER-043 §10 step 5 refactor: outcomes are supplied by the
// caller (from ScenarioSpec) rather than looked up from a name-
// keyed table here. Keeps the scenarios file authoritative for its
// own text.
export function scheduleOutcomes(
  outcomes: readonly string[],
  resolveAt: number,
  themeSustainability: SustainabilityKey,
  scenarioId: string
): PendingOutcome[] {
  if (outcomes.length === 0) return [];
  return outcomes.map((text, i) => ({
    dueAt: resolveAt + OUTCOME_OFFSETS_SEC[Math.min(i, OUTCOME_OFFSETS_SEC.length - 1)],
    text,
    sustainability: themeSustainability,
    scenarioId
  }));
}


function outcomeToEntry(p: PendingOutcome, at: number): EventStreamEntry {
  // Prep-carryover emits as an ambient bottleneck line (not an
  // outcome), so vocabulary/cadence read correctly — the player sees
  // a "kitchen bottleneck" event mid-service, not a scenario echo.
  if (p.flavor === 'prep-carryover') {
    return {
      at,
      text: p.text,
      category: 'ambient',
      causeTag: 'strain',
      sustainability: p.sustainability,
      kind: 'bottleneck',
      scenarioId: p.scenarioId
    };
  }
  return {
    at,
    text: p.text,
    category: 'outcome',
    causeTag: null,
    sustainability: p.sustainability,
    kind: 'outcome',
    scenarioId: p.scenarioId
  };
}

// -------- per-tick driver --------------------------------------------------

// Called from advanceTick. Fires:
//   1. Any pending outcomes whose dueAt has arrived (regardless of period —
//      an outcome scheduled by a scenario that resolved just before service
//      end must still fire; the choice was real).
//   2. Prep-window events during the mise en place window (prepEndsAt
//      set and simTime < prepEndsAt). Weighted by team competence, no
//      strain component — the room is empty.
//   3. Ambient rolls, during service after the prep window closes
//      (period lunch/dinner AND prepEndsAt === null).
export function tickEventStream(state: SimulationState, rng: Rng): void {
  const emitted: EventStreamEntry[] = [];

  // Emit any due outcomes / carryovers.
  const stillPending: PendingOutcome[] = [];
  for (const p of state.pendingOutcomes) {
    if (state.simTime >= p.dueAt) {
      emitted.push(outcomeToEntry(p, state.simTime));
    } else {
      stillPending.push(p);
    }
  }
  state.pendingOutcomes = stillPending;

  const period = state.day.period;
  const inService = period === 'lunch' || period === 'dinner';
  const inPrep = inService && state.day.prepEndsAt !== null && state.simTime < state.day.prepEndsAt;

  if (inPrep) {
    // Prep rolls — competence-weighted, no strain. Bump the day's
    // prepIgnoranceCount for each fired event so the carryover
    // decision at prep-end can read a running total.
    let prepFired = 0;
    for (const def of PREP_EVENT_DEFS) {
      const p = prepEventProbabilityPerTick(def, state);
      if (rng.chance(p)) {
        emitted.push(makePrepEntry(def, state, rng));
        prepFired += 1;
      }
    }
    if (prepFired > 0) {
      state.day = {
        ...state.day,
        prepIgnoranceCount: state.day.prepIgnoranceCount + prepFired
      };
    }
  } else if (inService) {
    // Full service — ambient rolls.
    for (const def of EVENT_DEFS) {
      const p = eventProbabilityPerTick(def, state);
      if (rng.chance(p)) {
        emitted.push(makeAmbientEntry(def, state, rng));
      }
    }
  }

  if (emitted.length === 0) return;
  state.eventStream = [...state.eventStream, ...emitted].slice(-STREAM_KEEP);
}
