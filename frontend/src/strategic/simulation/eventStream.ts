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
// ORDER 048 §2.1 — the plain-voice service report replaces the
// observer-voice ambient banks during service. Observer voice
// (AMBIENT_TEXTS et al.) is now used ONLY in the evening account
// (already there via computeEveningAccount). The plain banks stay
// station-tagged, present-tense, no interpretation.
//
// ORDER 052 §9 step 1 (2026-08-10): the plain banks are cause-aware.
// Each event kind now carries sub-banks per cause + an ambient
// fallback; detectCause() reads state and picks the dominant one.
import {
  CAUSE_PRIORITY,
  type CauseBank,
  type CauseKey,
  SERVICE_REPORT_AMBIENT,
  SERVICE_REPORT_POSITIVE,
  SERVICE_REPORT_PREP,
  SERVICE_REPORT_PREP_POSITIVE
} from '../../content/serviceReport';
import type { AmbientEventKind, PrepEventKind } from '../../content/eventStream.sv';
import { currentRhythmMultiplier } from './rhythm';
import { teamCapacity, teamCompetence } from './team';
import {
  MORALE_POSITIVE_EVENT_BUMP,
  MORALE_STRAIN_EVENT_HIT,
  bumpMorale,
  effectiveTeamCompetence
} from './morale';

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

// ORDER 043 Addendum A prep window — moved to ./constants 2026-08-09
// to break the rhythm ↔ eventStream cycle. Re-exported here so
// existing callers (reducer.ts) keep working via the barrel import.
export { PREP_DURATION_SEC } from './constants';

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
  // ORDER 047 §2 — route through effectiveTeamCompetence so the
  // ambient stream's ignorance weighting is the morale-scaled read of
  // the team, not the raw. A specialist under bad morale reads as
  // partly present; a competent team on a good day reads at full.
  const axis = source === 'trainingLevel' ? 'practical' : source;
  return effectiveTeamCompetence(state.team, axis, state.morale);
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
  { kind: 'prep_kitchen',  competenceSource: 'scientific',    baseRatePerMin: 0.3 },
  { kind: 'prep_room',     competenceSource: 'trainingLevel', baseRatePerMin: 0.3 },
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
    baseRatePerMin: 0.075
  },
  {
    kind: 'service_slip',
    causeTag: 'ignorance',
    competenceSource: 'cultural',
    sustainability: 'social',
    baseRatePerMin: 0.075
  },
  {
    kind: 'delivery_short',
    causeTag: 'ignorance',
    competenceSource: 'cultural',
    sustainability: 'ecological',
    baseRatePerMin: 0.075
  },
  {
    kind: 'bottleneck',
    causeTag: 'strain',
    competenceSource: null,
    sustainability: 'social',
    baseRatePerMin: 0.10
  },
  {
    kind: 'wait_stretched',
    causeTag: 'strain',
    competenceSource: null,
    sustainability: 'social',
    baseRatePerMin: 0.10
  },
  {
    kind: 'turnover_stumble',
    causeTag: 'both',
    competenceSource: 'trainingLevel',
    sustainability: 'economic',
    baseRatePerMin: 0.075
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

// ORDER 052 §9 step 1 (2026-08-10) — cause detection for the plain
// service report. Priority order (Vision Owner-approved 2026-08-10):
// scale_down > morning_change > short_prep > thin_team > low_competence
// > ingredient_tier_grund > poor_morale > ambient. First cause that
// matches wins; the picker then reads that sub-bank if the kind has
// variants for it, otherwise falls back to the kind's `ambient` array.
//
// The `axis` argument names the competence axis the kind reads —
// 'scientific' for kitchen_slip / prep_kitchen; 'cultural' for
// service_slip / delivery_short / wait_stretched / prep_room /
// prep_delivery; 'practical' for turnover_stumble; null for kinds
// that don't cleanly attach to one axis (bottleneck is strain-only,
// but we still gate low_competence on scientific since a bottleneck
// most often lives at the pass).

const THIN_TEAM_THRESHOLD = 2;
const LOW_COMPETENCE_THRESHOLD = 0.35;
const POOR_MORALE_THRESHOLD = 0.4;
const SHORT_PREP_IGNORANCE_THRESHOLD = 2;

function scaleDownActive(state: SimulationState): boolean {
  const s = state.scaleDown;
  return (
    s.menuShortenedFrom !== null ||
    s.wineListReduced ||
    s.closedLunch ||
    s.closedDinner
  );
}

function detectCause(
  state: SimulationState,
  axis: 'scientific' | 'cultural' | 'practical' | null,
  kindReadsIngredient: boolean
): CauseKey {
  if (scaleDownActive(state)) return 'scale_down';
  if (state.day.morningPolicyChanges.length > 0) return 'morning_change';
  if (state.day.prepIgnoranceCount >= SHORT_PREP_IGNORANCE_THRESHOLD) return 'short_prep';
  if (state.team.members.filter((m) => !m.isAgency).length <= THIN_TEAM_THRESHOLD) {
    return 'thin_team';
  }
  if (axis && teamCompetence(state.team, axis) < LOW_COMPETENCE_THRESHOLD) {
    return 'low_competence';
  }
  if (kindReadsIngredient && state.policies.ingredientTier === 'grund') {
    return 'ingredient_tier_grund';
  }
  if (state.morale < POOR_MORALE_THRESHOLD) return 'poor_morale';
  return 'ambient';
}

// Kinds where ingredient tier is a plausible cause (kitchen quality
// + supplier receiving + prep-time supplier check). Other kinds
// skip that priority step and fall through to poor_morale / ambient.
const KIND_READS_INGREDIENT: Record<string, boolean> = {
  kitchen_slip: true,
  delivery_short: true,
  prep_delivery: true
};

// Axis the kind reads for the low_competence check. `null` for kinds
// where no single axis fits; those never trigger low_competence and
// fall through.
const KIND_COMPETENCE_AXIS: Record<
  string,
  'scientific' | 'cultural' | 'practical' | null
> = {
  kitchen_slip: 'scientific',
  service_slip: 'cultural',
  delivery_short: 'cultural',
  bottleneck: 'scientific',
  wait_stretched: 'cultural',
  turnover_stumble: 'practical',
  prep_kitchen: 'scientific',
  prep_room: 'cultural',
  prep_delivery: 'cultural'
};

function pickCausedText(
  bank: CauseBank,
  kind: string,
  state: SimulationState,
  rng: Rng
): string {
  const axis = KIND_COMPETENCE_AXIS[kind] ?? null;
  const readsIngredient = KIND_READS_INGREDIENT[kind] ?? false;
  const cause = detectCause(state, axis, readsIngredient);
  const causeBank = cause === 'ambient' ? undefined : bank[cause];
  const pool = causeBank && causeBank.length > 0 ? causeBank : bank.ambient;
  return pickTextWithRepeatGuard(pool, state, rng);
}

// Re-export for tests that want to exercise the priority ladder.
export { detectCause as detectStreamCause };
export { CAUSE_PRIORITY };

function makeAmbientEntry(
  def: EventDef,
  state: SimulationState,
  rng: Rng
): EventStreamEntry {
  return {
    at: state.simTime,
    text: pickCausedText(SERVICE_REPORT_AMBIENT[def.kind], def.kind, state, rng),
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
    text: pickCausedText(SERVICE_REPORT_PREP[def.kind], def.kind, state, rng),
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
  // Prep rate = base * ignoranceMultiplier(effectiveCompetence).
  // No strain component during prep — the guests aren't in yet.
  // ORDER 047 §2: routes through effectiveTeamCompetence so a bad-
  // morale team preps badly regardless of the roster's competence.
  const source = def.competenceSource;
  const axis: 'scientific' | 'cultural' | 'practical' =
    source === 'trainingLevel' ? 'practical' : source;
  const c = effectiveTeamCompetence(state.team, axis, state.morale);
  const perMinute = def.baseRatePerMin * ignoranceMultiplier(c);
  return Math.min(1, (perMinute * TICK_SECONDS) / 60);
}

// -------- positive events -------------------------------------------------
//
// Verksamhet som går bra. Fires only during service (post-prep) at
// a rate gated by calmness (inverse of load) and team practical
// competence. A weak or strained team gets none of these; a strong
// team at low pressure gets several per service. Absence during a
// calm patch is itself a signal — no need for a badge.

// Base rate chosen so a strong-team + calm dinner produces ~3–4
// positive events over 15 sim-minutes (one every 4–5 min); at
// mid competence and load, ~1–2; at weak+strained, near zero.
export const POSITIVE_BASE_RATE_PER_MIN = 0.15;

// Calmness curve. Load ≤ 0.6 reads as calm (multiplier ~1.4);
// load 1.0 reads as busy but flowing (~0.5); load ≥ 1.4 reads as
// strained (multiplier ~0.05, positives essentially stop).
export function calmnessMultiplier(load: number): number {
  const L = Math.max(0, load);
  return Math.max(0.05, 1.5 - L);
}

export function positiveEventProbabilityPerTick(state: SimulationState): number {
  const load = loadOf(state);
  const competence = teamCompetence(state.team, 'practical');
  const perMinute =
    POSITIVE_BASE_RATE_PER_MIN * calmnessMultiplier(load) * competence;
  return Math.min(1, (perMinute * TICK_SECONDS) / 60);
}

function makePositiveEntry(
  state: SimulationState,
  rng: Rng
): EventStreamEntry {
  return {
    at: state.simTime,
    text: pickTextWithRepeatGuard(SERVICE_REPORT_POSITIVE, state, rng),
    category: 'positive',
    causeTag: null,
    sustainability: 'social',
    kind: 'positive',
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
    // ORDER 043 Addendum B prep floor — fire any scheduled floor
    // slot whose dueAt has passed. Polarity picked from team
    // competence for the kind's axis (>0.5 → positive prep, else
    // ignorance prep). Ignorance floor lines still count toward
    // prepIgnoranceCount; positive floor lines do not.
    let ignoranceFromFloor = 0;
    if (state.day.prepFloorSchedule.length > 0) {
      const stillPendingFloor: typeof state.day.prepFloorSchedule = [];
      for (const slot of state.day.prepFloorSchedule) {
        if (state.simTime >= slot.dueAt) {
          const axis =
            slot.kind === 'prep_kitchen' ? 'scientific' :
            slot.kind === 'prep_delivery' ? 'cultural' : 'practical';
          // Prep is a single-station activity — one competent
          // person at the axis covers it. Read the MAX across the
          // team, not the average (ambient events use the average
          // because the whole team touches each guest). Threshold
          // 0.55 = "is anyone actually qualified for this axis?"
          // ORDER 047 §2 — MAX competence is morale-scaled here too
          // so a specialist under bad morale can trip the polarity
          // down. Same shape as ambient competenceFor.
          let maxComp = 0;
          for (const m of state.team.members) {
            if (m.competence[axis] > maxComp) maxComp = m.competence[axis];
          }
          const moraleScale = 0.65 + 0.35 * state.morale;
          if (maxComp * moraleScale > 0.55) {
            // Positive polarity — prep going well.
            emitted.push({
              at: state.simTime,
              text: pickTextWithRepeatGuard(SERVICE_REPORT_PREP_POSITIVE[slot.kind], state, rng),
              category: 'positive',
              causeTag: null,
              sustainability: 'social',
              kind: slot.kind,
              scenarioId: null
            });
          } else {
            // Ignorance polarity — prep going wrong. Cause-aware
            // picker per ORDER 052 §9 step 1.
            emitted.push({
              at: state.simTime,
              text: pickCausedText(SERVICE_REPORT_PREP[slot.kind], slot.kind, state, rng),
              category: 'ambient',
              causeTag: 'ignorance',
              sustainability: 'social',
              kind: slot.kind,
              scenarioId: null
            });
            ignoranceFromFloor += 1;
          }
        } else {
          stillPendingFloor.push(slot);
        }
      }
      if (stillPendingFloor.length !== state.day.prepFloorSchedule.length) {
        state.day = { ...state.day, prepFloorSchedule: stillPendingFloor };
      }
    }

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
    if (prepFired + ignoranceFromFloor > 0) {
      state.day = {
        ...state.day,
        prepIgnoranceCount:
          state.day.prepIgnoranceCount + prepFired + ignoranceFromFloor
      };
    }
  } else if (inService) {
    // Full service — ambient rolls + positive rolls in parallel.
    // Positives are gated by calmness × competence, so a strained
    // or weak team just doesn't get any — reads correctly without
    // needing a styling difference.
    for (const def of EVENT_DEFS) {
      const p = eventProbabilityPerTick(def, state);
      if (rng.chance(p)) {
        emitted.push(makeAmbientEntry(def, state, rng));
      }
    }
    const positiveP = positiveEventProbabilityPerTick(state);
    if (rng.chance(positiveP)) {
      emitted.push(makePositiveEntry(state, rng));
    }
  }

  if (emitted.length === 0) return;
  state.eventStream = [...state.eventStream, ...emitted].slice(-STREAM_KEEP);

  // ORDER 047 §2 — morale bumps for each newly emitted entry. Strain
  // events drag morale down; positive events lift it. Runs after the
  // slice so the emitted list reflects what actually landed on the
  // panel.
  //
  // ORDER 047 §5 — accumulate per-service streamThemeCounts on ambient
  // + prep entries so drawNextTheme can weight the next scenario toward
  // what the room has been showing. Positive events are excluded (they
  // are the absence of a problem, not a signal about which axis is
  // stressed); outcome events are excluded (the scenario itself sets
  // its own signal).
  const streamCountDelta: Record<SustainabilityKey, number> = {
    economic: 0,
    social: 0,
    ecological: 0
  };
  let moraleAccum = 0;
  for (const entry of emitted) {
    if (entry.category === 'positive') {
      moraleAccum += MORALE_POSITIVE_EVENT_BUMP;
    } else if (entry.category === 'ambient') {
      // Ignorance + strain both drag. 'both' events (turnover_stumble)
      // count as a strain hit — they read to the player as the room
      // failing under pressure, not as a slow technique slip.
      if (entry.causeTag === 'strain' || entry.causeTag === 'both') {
        moraleAccum -= MORALE_STRAIN_EVENT_HIT;
      }
      streamCountDelta[entry.sustainability] += 1;
    }
  }
  if (moraleAccum !== 0) bumpMorale(state, moraleAccum);
  if (
    streamCountDelta.economic > 0 ||
    streamCountDelta.social > 0 ||
    streamCountDelta.ecological > 0
  ) {
    state.streamThemeCounts = {
      economic: state.streamThemeCounts.economic + streamCountDelta.economic,
      social: state.streamThemeCounts.social + streamCountDelta.social,
      ecological:
        state.streamThemeCounts.ecological + streamCountDelta.ecological
    };
  }
}
