import { createRng } from '../util/rng';
import type {
  EnablerKey,
  Policies,
  Register,
  ScenarioChoice,
  ScenarioDifficulty,
  SimAction,
  SimulationState,
  SustainabilityKey
} from '../types';
import { strings } from '../../content/strings.sv';
import { maybeSpawnGuest, scenarioSpawnStep } from './arrivals';
import { revenuePerGuest } from './economics';
import { makeInitialState, makeStaff } from './model';
import { tickGuests, tickStaff } from './service';
import { tickSustainability } from './sustainability';

// Sim-seconds until the walk-in-of-five scenario auto-triggers if the
// player takes no action. Kept short so a one-and-done playtest doesn't
// have to sit through two minutes of ambient sim before the loop
// engages; a manual key-5 trigger from the app shell is also wired for
// the case where the player wants it now.
const AUTO_SCENARIO_AT = 30;

// ORDER 043 §4 wager tuning — cycle-1 defaults, will be tuned against
// play. Report gate at §10 lands with these; scenario integration
// (Phase B+) will exercise them for the first time.
export const WAGER_UNIT_STAKE = 0.10; // fixed magnitude per wager
export const WAGER_WEAK_THRESHOLD = 0.4; // capital ≤ this is "weak"
export const WAGER_WEAK_WIN_MULTIPLIER = 1.5; // extra payout on wins in weak capital
export const CAPITAL_MIN = 0;
export const CAPITAL_MAX = 1;
export const THEME_HISTORY_LIMIT = 6;
// Consequence window per ORDER 042 §3.4: "over 30–45 seconds of
// compressed simulated time, the room changes in a way the player can
// watch". After this many sim-seconds from the RESOLVE_SCENARIO, the
// mentor comment surfaces in the world.
const SCENARIO_SETTLE_AFTER = 35;

// Party size for walk-in-of-five (ORDER 042 §1 rescaled 2026-08-08 to
// the 146 m² café-scale Candidate A footprint). Choice A/B both seat
// the party; choice C turns them away.
const WALK_IN_PARTY_SIZE = 5;

export function reducer(state: SimulationState, action: SimAction): SimulationState {
  switch (action.type) {
    case 'TICK': {
      const next = advanceTick(state);
      return next;
    }
    case 'SET_SPEED':
      return { ...state, speed: action.speed };
    case 'SET_POLICY':
      return applyPolicyPatch(state, action.patch);
    case 'RESOLVE_SCENARIO':
      return resolveScenario(state, action.choice);
    case 'TRIGGER_SCENARIO':
      return triggerScenario(state, /* auto */ false);
    case 'ADVANCE_SCENARIO_TO_DIFFICULTY':
      return advanceToDifficulty(state);
    case 'SET_SCENARIO_DIFFICULTY':
      return setDifficulty(state, action.difficulty);
    case 'PLACE_WAGER':
      return placeWager(state, action.capital);
    case 'CLEAR_WAGER':
      return clearWager(state);
    case 'RECORD_ENABLER_EVENT':
      return recordEnablerEvent(
        state,
        action.enabler,
        action.register,
        action.amount,
        action.scenarioId
      );
    case 'SET_CAPITAL':
      return setCapital(state, action.capital, action.value);
    case 'RESET':
      return makeInitialState(state.seed, state.policies);
    default:
      return state;
  }
}

function setCapital(
  state: SimulationState,
  capital: SustainabilityKey,
  value: number
): SimulationState {
  const clamped = Math.max(0, Math.min(1, value));
  return {
    ...state,
    capitals: {
      ...state.capitals,
      values: { ...state.capitals.values, [capital]: clamped }
    }
  };
}

// ---------- ORDER 043 wager + enabler transitions -------------------------

function placeWager(state: SimulationState, capital: SustainabilityKey): SimulationState {
  // Placing a new wager replaces any prior standing wager. Wagers are
  // only meaningful between scenarios (§4 "after a scenario resolves
  // and before the next arrives"); we permit the action in any phase
  // so the UI is simpler, and Phase B's scenario integration will
  // resolve or discard a standing wager appropriately.
  return {
    ...state,
    wager: {
      capital,
      placedAt: state.simTime,
      amount: WAGER_UNIT_STAKE
    }
  };
}

function clearWager(state: SimulationState): SimulationState {
  return { ...state, wager: null };
}

function recordEnablerEvent(
  state: SimulationState,
  enabler: EnablerKey,
  register: Register,
  amount: number,
  scenarioId: string | null
): SimulationState {
  // Amount clamped to a positive envelope so a scenario cannot silently
  // burn an enabler downward — §3.3 says enabler competence grows from
  // how the player plays; regression via the reducer is out of shape.
  const clean = Math.max(0, Math.min(1, amount));
  if (clean === 0) return state;
  const previous = state.enablers[enabler];
  const updated = {
    ...previous,
    // Derived tally kept in step with the history append (§8: growth
    // never shown as a score; the tally exists only so reads are cheap).
    [register]: previous[register] + clean,
    history: [
      ...previous.history,
      { at: state.simTime, register, amount: clean, scenarioId }
    ]
  };
  return {
    ...state,
    enablers: { ...state.enablers, [enabler]: updated }
  };
}

function advanceTick(state: SimulationState): SimulationState {
  // We mutate a shallow-cloned draft to keep the reducer approachable.
  const draft: SimulationState = {
    ...state,
    staff: state.staff.map((s) => ({ ...s, position: { ...s.position }, targetPosition: { ...s.targetPosition } })),
    guests: state.guests.map((g) => ({ ...g, position: { ...g.position }, targetPosition: { ...g.targetPosition } })),
    waitingIds: [...state.waitingIds],
    seatedIds: [...state.seatedIds],
    rolling: {
      revenue: [...state.rolling.revenue],
      satisfaction: [...state.rolling.satisfaction],
      workload: [...state.rolling.workload],
      waste: [...state.rolling.waste]
    },
    scenario: { ...state.scenario, visibleGuestIds: [...state.scenario.visibleGuestIds] },
    events: state.events,
    village: {
      residents: state.village.residents.map((r) => ({ ...r }))
    },
    district: {
      pedestrians: state.district.pedestrians.map((p) => ({ ...p }))
    },
    delivery: { ...state.delivery },
    eco: {
      econ: { ...state.eco.econ },
      social: { ...state.eco.social },
      ecolog: { ...state.eco.ecolog }
    }
  };

  const rng = createRng(draft.rngState);
  const tickSeconds = 0.2;
  draft.simTime += tickSeconds;
  draft.tick += 1;

  // Village cosmetics.
  for (const r of draft.village.residents) {
    r.progress = (r.progress + r.speed * tickSeconds) % 1;
  }
  for (const p of draft.district.pedestrians) {
    p.progress = (p.progress + p.speed * tickSeconds) % 1;
  }
  if (draft.delivery.active) {
    draft.delivery.progress += 0.08 * tickSeconds;
    if (draft.delivery.progress >= 1) {
      draft.delivery.active = false;
      draft.delivery.progress = 0;
      // ORDER 043 §6 ecological phenomenon: cooldown between deliveries
      // stretches when ecological capital is low. Formula chosen so
      // ecological ≈ 0.55 (initial) reproduces the pre-ORDER-043 60-sec
      // baseline, ecological = 1 halves it to ~36 sec, ecological = 0
      // extends to ~84 sec. The van's absence between arrivals IS the
      // reading; the rhythm of appearance is what the player watches.
      const ecological = draft.capitals.values.ecological;
      const cooldownBase = 60 * (1.4 - 0.8 * ecological);
      draft.delivery.cooldown = cooldownBase + rng.range(0, 30);
    }
  } else {
    draft.delivery.cooldown -= tickSeconds;
    if (draft.delivery.cooldown <= 0) {
      draft.delivery.active = true;
      draft.delivery.progress = 0;
    }
  }

  // Regular arrivals.
  if (!draft.scenario.awaitingChoice) {
    const arrival = maybeSpawnGuest(draft, rng);
    if (arrival) draft.guests.push(arrival);
  }

  // Scenario spawning.
  const scenarioGuest = scenarioSpawnStep(draft);
  if (scenarioGuest) {
    draft.guests.push(scenarioGuest);
    draft.scenario.spawnedRemaining -= 1;
    draft.scenario.nextSpawnAt = draft.simTime + 2.2;
    draft.scenario.visibleGuestIds.push(scenarioGuest.id);
  }

  // Move / advance guests and staff.
  tickGuests(draft);
  tickStaff(draft);

  // Payment triggers revenue.
  for (const guest of draft.guests) {
    if (guest.state === 'paying' && guest.stateTime === draft.simTime) {
      draft.revenue += revenuePerGuest(draft.policies);
    }
  }
  // Accumulate cost.
  draft.cost += (costPerMinuteToTick(draft) * tickSeconds) / 60;

  // Sustainability.
  tickSustainability(draft);

  // Auto-trigger scenario once.
  if (!draft.scenario.hasAutoTriggered && draft.simTime >= AUTO_SCENARIO_AT) {
    return triggerScenario(draft, /* auto */ true);
  }

  // Transition scenario from 'resolving' → 'settled' after the
  // consequence window; surface the mentor comment as an event and on
  // the scenario record so MentorComment can render it in-world.
  if (
    draft.scenario.phase === 'resolving' &&
    draft.scenario.choiceAt !== null &&
    draft.simTime - draft.scenario.choiceAt >= SCENARIO_SETTLE_AFTER
  ) {
    const comment = mentorCommentFor(draft.scenario.choice, draft.scenario.difficulty);
    draft.scenario = {
      ...draft.scenario,
      phase: 'settled',
      mentorComment: comment,
      mentorCommentAt: draft.simTime
    };
    draft.events = [
      ...draft.events,
      { at: draft.simTime, kind: 'scenario', text: `Mentor: ${comment}` }
    ];
  }

  draft.rngState = rng.state;
  return draft;
}

function costPerMinuteToTick(state: SimulationState): number {
  const base = 9 * state.policies.staffCount;
  const ingredients =
    state.policies.ingredientTier === 'premium'
      ? 12
      : state.policies.ingredientTier === 'utvald'
        ? 7
        : 4;
  const wastePenalty = state.waste * 0.4;
  return base + ingredients + wastePenalty;
}

function applyPolicyPatch(state: SimulationState, patch: Partial<Policies>): SimulationState {
  const policies = { ...state.policies, ...patch };
  const needsStaffRebuild = patch.staffCount && patch.staffCount !== state.policies.staffCount;
  const nextStaff = needsStaffRebuild ? makeStaff(policies.staffCount) : state.staff;
  const event = {
    at: state.simTime,
    kind: 'policy' as const,
    text: describePolicyPatch(patch)
  };
  return {
    ...state,
    policies,
    staff: nextStaff,
    events: [...state.events, event]
  };
}

function describePolicyPatch(patch: Partial<Policies>): string {
  const parts: string[] = [];
  if (patch.staffCount !== undefined) parts.push(`personal ${patch.staffCount}`);
  if (patch.trainingLevel !== undefined) parts.push(`utbildning ${patch.trainingLevel}`);
  if (patch.service) parts.push(`koncept ${patch.service}`);
  if (patch.pricing) parts.push(`pris ${patch.pricing}`);
  if (patch.capacity !== undefined) parts.push(`platser ${patch.capacity}`);
  if (patch.ingredientTier) parts.push(`inköp ${patch.ingredientTier}`);
  if (patch.welcomeDrink !== undefined)
    parts.push(`välkomstdryck ${patch.welcomeDrink ? 'på' : 'av'}`);
  if (patch.localSourcing !== undefined)
    parts.push(`lokala leverantörer ${patch.localSourcing ? 'på' : 'av'}`);
  return `Policy: ${parts.join(', ')}`;
}

function triggerScenario(state: SimulationState, auto: boolean): SimulationState {
  // Enters phase 'subject' — the party is at the door, awaiting the
  // player's difficulty wager (§4.3) and response (§4.2). `auto` is
  // unused now; both manual and auto triggers set hasAutoTriggered
  // to true so the auto-check in advanceTick can't re-fire and reset
  // an in-progress scenario back to `subject`.
  void auto;
  const scenario = {
    ...state.scenario,
    hasAutoTriggered: true,
    active: true,
    phase: 'subject' as const,
    difficulty: null as null,
    awaitingChoice: false,
    choice: null as null,
    choiceAt: null as null,
    spawnedRemaining: 0,
    nextSpawnAt: 0,
    visibleGuestIds: [],
    mentorComment: null,
    mentorCommentAt: null
  };
  return {
    ...state,
    scenario,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'scenario' as const,
        text: auto ? 'Sällskapet står i entrén' : 'Scenariot replays (utvecklarläge)'
      }
    ]
  };
}

function advanceToDifficulty(state: SimulationState): SimulationState {
  if (state.scenario.phase !== 'subject') return state;
  return {
    ...state,
    scenario: { ...state.scenario, phase: 'difficulty' }
  };
}

function setDifficulty(
  state: SimulationState,
  difficulty: ScenarioDifficulty
): SimulationState {
  if (state.scenario.phase !== 'difficulty') return state;
  // Difficulty captured; situation now revealed. awaitingChoice flips
  // to true so the arrivals suspension takes effect while the player
  // decides. Legacy tests check this field, hence the mirror.
  return {
    ...state,
    scenario: {
      ...state.scenario,
      difficulty,
      phase: 'situation',
      awaitingChoice: true
    }
  };
}

function resolveScenario(
  state: SimulationState,
  choice: ScenarioChoice
): SimulationState {
  const scenario = { ...state.scenario };
  scenario.awaitingChoice = false;
  scenario.phase = 'resolving';
  scenario.choice = choice;
  scenario.choiceAt = state.simTime;

  // Walk-in-of-five (ORDER 042 §1 rescaled 2026-08-08). A and B both
  // seat the party; the mechanical difference is B flips welcomeDrink
  // on, which lifts satisfaction but adds staff workload. C turns the
  // party away — a couple visibly walk in and back out, then reputation
  // dips a hair.
  if (choice === 'A' || choice === 'B') {
    scenario.spawnedRemaining = WALK_IN_PARTY_SIZE;
    scenario.nextSpawnAt = state.simTime + 0.4;
  } else {
    // Choice C — a couple of the party still approach the door before
    // being turned away, so the refusal is visible in the room, not
    // just a state change.
    scenario.spawnedRemaining = 2;
    scenario.nextSpawnAt = state.simTime + 0.3;
  }

  // Immediate policy nudge for choice B (welcome drink flips on).
  let policies = state.policies;
  if (choice === 'B') {
    policies = { ...policies, welcomeDrink: true };
  }

  // Reputation nudge on refusal.
  let reputation = state.reputation;
  if (choice === 'C') reputation = Math.max(0, reputation - 0.03);

  return {
    ...state,
    scenario,
    policies,
    reputation,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'scenario' as const,
        text: `Scenario: valde ${choice}`
      }
    ]
  };
}

function mentorCommentFor(
  choice: ScenarioChoice | null,
  difficulty: ScenarioDifficulty | null
): string {
  // Only one bank of comments; a null/unexpected combination falls back
  // to a neutral line rather than throwing.
  if (!choice || !difficulty) {
    return 'Kvällen gick vidare — vi tittar på hur den utvecklade sig nästa gång.';
  }
  const rank = difficulty === 1 ? 'low' : difficulty === 2 ? 'mid' : 'high';
  const key = `${choice}_${rank}` as keyof typeof strings.scenario.mentor;
  return strings.scenario.mentor[key];
}
