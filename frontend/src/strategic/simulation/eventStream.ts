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
import { AMBIENT_TEXTS, type AmbientEventKind } from '../../content/eventStream.sv';
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
  const perMinute = def.baseRatePerMin * eventMultiplier(def, state);
  // Cap at 1 to keep chance() well-defined even in extreme states.
  return Math.min(1, (perMinute * TICK_SECONDS) / 60);
}

// -------- ambient roll -----------------------------------------------------

function pickAmbientText(
  kind: AmbientEventKind,
  state: SimulationState,
  rng: Rng
): string {
  const bank = AMBIENT_TEXTS[kind];
  // Filter out any sentence that appeared in the last REPEAT_GUARD_SEC
  // of stream. Text-level filter so the guard trips across ambient
  // and outcome layers too (an outcome line is not in a bank, but
  // reading state.eventStream is simpler than distinguishing).
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
    text: pickAmbientText(def.kind, state, rng),
    category: 'ambient',
    causeTag: def.causeTag,
    sustainability: def.sustainability,
    kind: def.kind,
    scenarioId: null
  };
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
//   2. Ambient rolls, but ONLY during a running service (lunch / dinner).
//      Ambient chatter outside service would be nonsense — no one is in
//      the room.
export function tickEventStream(state: SimulationState, rng: Rng): void {
  const emitted: EventStreamEntry[] = [];

  // Emit any due outcomes.
  const stillPending: PendingOutcome[] = [];
  for (const p of state.pendingOutcomes) {
    if (state.simTime >= p.dueAt) {
      emitted.push(outcomeToEntry(p, state.simTime));
    } else {
      stillPending.push(p);
    }
  }
  state.pendingOutcomes = stillPending;

  // Ambient rolls — service-only.
  const period = state.day.period;
  if (period === 'lunch' || period === 'dinner') {
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
