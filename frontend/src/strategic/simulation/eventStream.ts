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
  ScenarioChoice,
  SimulationState,
  SustainabilityKey
} from '../types';
import type { Rng } from '../util/rng';
import { AMBIENT_TEXTS, OUTCOME_TEXTS, type AmbientEventKind } from '../../content/eventStream.sv';

const TICK_SECONDS = 0.2;

// Ring-buffer cap for the visible stream (older entries fall off).
export const STREAM_KEEP = 40;

// Outcome timing per Vision Owner: 6 s and 18 s after choice, inside
// the SCENARIO_SETTLE_AFTER (35 s) window so the sequence reads
// choice → outcome — outcome — mentor.
export const OUTCOME_OFFSETS_SEC: readonly number[] = [6, 18];

// ORDER 043 Addendum A §A.7 stand-in note: enablers.scientific /
// .cultural are not yet written to by scenario responses, so they
// carry 0 weight. Until they do, competence is derived entirely
// from policies.trainingLevel / 3. When enablers begin to matter,
// blend as: competence = 0.5 · trainingLevel/3 + 0.5 · enablerLevel.
function trainingCompetence(state: SimulationState): number {
  return state.policies.trainingLevel / 3;
}

export type CompetenceSource = 'scientific' | 'cultural' | 'trainingLevel' | null;

export function competenceFor(
  source: CompetenceSource,
  state: SimulationState
): number {
  // Cycle-1: all sources collapse to trainingLevel/3 per the §A.7
  // stand-in note. Kept as a switch here so a future order can wire
  // enablers in without reshaping the caller.
  if (source === null) return 1; // strain-only events pass through 1×
  return trainingCompetence(state);
}

// Load = active guests / (staffCount · COVERS_PER_STAFF). Reads the
// same denominator the reputation loop uses (reputation.ts) so the
// two systems agree on what "strained" means.
const COVERS_PER_STAFF = 5;

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
  const capacity = Math.max(1, state.policies.staffCount * COVERS_PER_STAFF);
  return active / capacity;
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

function pickAmbientText(kind: AmbientEventKind, rng: Rng): string {
  const bank = AMBIENT_TEXTS[kind];
  return bank[Math.floor(rng.next() * bank.length)];
}

function makeAmbientEntry(
  def: EventDef,
  state: SimulationState,
  rng: Rng
): EventStreamEntry {
  return {
    at: state.simTime,
    text: pickAmbientText(def.kind, rng),
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
export function scheduleOutcomes(
  scenarioId: string,
  choice: ScenarioChoice,
  resolveAt: number,
  themeSustainability: SustainabilityKey
): PendingOutcome[] {
  const bank = OUTCOME_TEXTS[scenarioId as keyof typeof OUTCOME_TEXTS];
  if (!bank) return [];
  const texts = bank[choice];
  if (!texts) return [];
  return texts.map((text, i) => ({
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
