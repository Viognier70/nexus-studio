import { createRng } from '../util/rng';
import type {
  DayPeriod,
  DayState,
  EnablerKey,
  Policies,
  Register,
  ScenarioChoice,
  ScenarioDifficulty,
  SimAction,
  SimulationState,
  SustainabilityKey
} from '../types';
import {
  SERVICE_LENGTH_MAX_MINUTES,
  SERVICE_LENGTH_MIN_MINUTES
} from '../types';
import { strings } from '../../content/strings.sv';
import { maybeSpawnGuest, scenarioSpawnStep } from './arrivals';
import { planScenariosForService, scheduleScenarioTriggerTimes } from './day';
import { revenuePerGuest } from './economics';
import { scheduleOutcomes, tickEventStream } from './eventStream';
import { initialDay, makeInitialState, makeStaff } from './model';
import { tickReputationDrift } from './reputation';
import { tickGuests, tickStaff } from './service';
import { tickSustainability } from './sustainability';
import {
  AGENCY_DECLINE_SOCIAL_COST,
  AGENCY_ECONOMIC_COST,
  AGENCY_HIRE_COST,
  AGENCY_OFFER_LOAD_THRESHOLD,
  AGENCY_OFFER_SUSTAINED_SEC,
  AGENCY_OFFER_WINDOW_SEC,
  addAgencyMember,
  chargeStructuralCost,
  removeAgencyMembers,
  teamCapacity
} from './team';
import { drawNextTheme, wagerPayout } from './themeSelection';

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

// ORDER 043 v3 §7 chain — magnitude of the capital movement produced
// by a scenario resolution on its drawn theme. Choice A/B are the
// generous / demanding responses that move the themed capital up;
// choice C is the refusal that moves it down. Cycle-1 default —
// deliberately smaller than the wager stake (0.10) so a scenario
// outcome + wager payout compose without one dominating the other.
export const SCENARIO_CAPITAL_DELTA = 0.06;

// Per-choice signed multiplier on SCENARIO_CAPITAL_DELTA. Chosen so
// that A and B differ only in what they cost — both engage the
// capital, one via the demanding response and one via the generous
// response. C's magnitude is smaller (halved) because the loss is
// already carried by the reputation dip in the walk-in-of-five
// specific handler; letting C also cost a full capital would double-
// count the refusal.
const CHOICE_CAPITAL_SIGN: Record<ScenarioChoice, number> = {
  A: 1,
  B: 1,
  C: -0.5
};

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
    case 'OPEN_SERVICE':
      return openService(state, action.service, action.lengthMinutes);
    case 'SKIP_LUNCH':
      return skipLunch(state);
    case 'ACCEPT_AGENCY':
      return acceptAgency(state);
    case 'DECLINE_AGENCY':
      return declineAgency(state);
    case 'RESET':
      return makeInitialState(state.seed, state.policies);
    default:
      return state;
  }
}

// ---------- ORDER 043 v3 §10 step 1 — day / period transitions ---------------

function clampServiceLength(mins: number): number {
  return Math.max(
    SERVICE_LENGTH_MIN_MINUTES,
    Math.min(SERVICE_LENGTH_MAX_MINUTES, Math.round(mins))
  );
}

function openService(
  state: SimulationState,
  service: 'lunch' | 'dinner',
  lengthMinutes: number
): SimulationState {
  // Guard: lunch can only open from morning, dinner from afternoon.
  // Any other phase → no-op. Prevents the UI from opening dinner
  // during a running lunch service etc.
  const expectedPhase: DayPeriod = service === 'lunch' ? 'morning' : 'afternoon';
  if (state.day.period !== expectedPhase) return state;
  const length = clampServiceLength(lengthMinutes);
  // Deterministic scenario count + schedule from the current rng
  // state — same seed + same open sequence yields the same rhythm.
  const rng = createRng(state.rngState);
  const scenariosPlanned = planScenariosForService(length, rng);
  const scenarioTriggerTimes = scheduleScenarioTriggerTimes(
    scenariosPlanned,
    state.simTime,
    length,
    rng
  );
  const day: DayState = {
    ...state.day,
    period: service,
    periodStartAt: state.simTime,
    currentServiceLengthMinutes: length,
    scenariosPlanned,
    scenariosFiredThisService: 0,
    scenarioTriggerTimes
  };
  return {
    ...state,
    day,
    rngState: rng.state
  };
}

function skipLunch(state: SimulationState): SimulationState {
  if (state.day.period !== 'morning') return state;
  return {
    ...state,
    day: {
      ...state.day,
      period: 'afternoon',
      periodStartAt: state.simTime,
      currentServiceLengthMinutes: null,
      scenariosPlanned: 0,
      scenariosFiredThisService: 0,
      scenarioTriggerTimes: []
    }
  };
}

// Called from advanceTick — handles the automatic transitions that
// don't require a player action:
//   lunch     → afternoon (after chosen length elapses)
//   dinner    → evening   (after chosen length elapses)
//   evening   → morning of next day (after a short close pause)
// morning + afternoon stay put until the player opens a service or
// skips lunch. This satisfies v3 §2's rule that the player, not the
// clock, decides how long each service runs.
const EVENING_TO_MORNING_PAUSE_SEC = 15;

export function tickDayTransitions(state: SimulationState): SimulationState {
  const { day, simTime } = state;
  if (day.period === 'lunch' && day.currentServiceLengthMinutes !== null) {
    const endsAt = day.periodStartAt + day.currentServiceLengthMinutes * 60;
    if (simTime >= endsAt) {
      // Clear agency hires + offer at lunch close, same as dinner.
      return {
        ...state,
        team: removeAgencyMembers(state.team),
        agencyOffer: null,
        day: {
          ...day,
          period: 'afternoon',
          periodStartAt: simTime,
          currentServiceLengthMinutes: null,
          scenariosPlanned: 0,
          scenariosFiredThisService: 0,
          scenarioTriggerTimes: []
        }
      };
    }
  }
  if (day.period === 'dinner' && day.currentServiceLengthMinutes !== null) {
    const endsAt = day.periodStartAt + day.currentServiceLengthMinutes * 60;
    if (simTime >= endsAt) {
      // ORDER 043 v3 §10 step 5 — clear any agency hires + any
      // standing agency offer at service close. Agency members are
      // scoped to the single service; the offer is stale after
      // close and would surface next service if not cleared.
      return {
        ...state,
        team: removeAgencyMembers(state.team),
        agencyOffer: null,
        day: {
          ...day,
          period: 'evening',
          periodStartAt: simTime,
          currentServiceLengthMinutes: null,
          scenariosPlanned: 0,
          scenariosFiredThisService: 0,
          scenarioTriggerTimes: []
        }
      };
    }
  }
  if (day.period === 'evening') {
    if (simTime - day.periodStartAt >= EVENING_TO_MORNING_PAUSE_SEC) {
      // Day advance — charge structural cost for the closing day
      // (every non-agency member pays their dailyCost) and roll to
      // the next morning. §10 "structural cost locked over multiple
      // days" is honoured by the per-day charge continuing for the
      // contract duration.
      return {
        ...state,
        team: chargeStructuralCost(state.team),
        day: {
          ...initialDay(),
          dayNumber: day.dayNumber + 1,
          periodStartAt: simTime
        }
      };
    }
  }
  return state;
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

// ---------- ORDER 043 v3 §10 step 5 — agency-offer machinery ------------

function activeGuestCount(state: SimulationState): number {
  return state.guests.filter(
    (g) =>
      g.state === 'arriving' ||
      g.state === 'waiting' ||
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
  ).length;
}

// Runs inside advanceTick. Mutates draft in place — sets/clears the
// strain tracker, fires an offer, or expires an unanswered offer
// into an implicit decline.
function tickAgencyStrain(draft: SimulationState): void {
  const period = draft.day.period;

  // Outside a service, reset the tracker and drop any orphaned offer.
  if (period !== 'lunch' && period !== 'dinner') {
    if (draft.team.strainSinceSimTime !== null) {
      draft.team = { ...draft.team, strainSinceSimTime: null };
    }
    return;
  }

  const now = draft.simTime;
  const load = activeGuestCount(draft) / teamCapacity(draft.team);
  const tracker = draft.team.strainSinceSimTime;

  // Expire an unanswered offer into an implicit decline. The social
  // cost applies either way — the team read the silence.
  if (draft.agencyOffer && now >= draft.agencyOffer.expiresAt) {
    draft.capitals = {
      ...draft.capitals,
      values: {
        ...draft.capitals.values,
        social: Math.max(0, draft.capitals.values.social - AGENCY_DECLINE_SOCIAL_COST)
      }
    };
    draft.agencyOffer = null;
  }

  if (load >= AGENCY_OFFER_LOAD_THRESHOLD) {
    if (tracker === null) {
      draft.team = { ...draft.team, strainSinceSimTime: now };
    } else if (
      now - tracker >= AGENCY_OFFER_SUSTAINED_SEC &&
      draft.agencyOffer === null
    ) {
      // Fire the offer. Role is the axis the strain has been loudest
      // on — cycle 1 keeps it simple and offers a lärling-shaped
      // hire (generic hand). A future order could pick the role that
      // best relieves the current bottleneck.
      draft.agencyOffer = {
        role: 'lärling',
        moneyCost: AGENCY_HIRE_COST,
        socialCostIfDeclined: AGENCY_DECLINE_SOCIAL_COST,
        offeredAt: now,
        expiresAt: now + AGENCY_OFFER_WINDOW_SEC
      };
      draft.team = { ...draft.team, strainSinceSimTime: null };
    }
  } else if (tracker !== null) {
    // Load dropped below threshold — reset the tracker so a fresh
    // sustained window is required before the next offer.
    draft.team = { ...draft.team, strainSinceSimTime: null };
  }
}

function acceptAgency(state: SimulationState): SimulationState {
  if (state.agencyOffer === null) return state;
  const team = addAgencyMember(state.team, state.day.dayNumber);
  return {
    ...state,
    team,
    agencyOffer: null,
    // Cost is felt both in raw ledger (state.cost) and in the
    // reading layer (economic capital). The capital hit is what
    // the player watches; the ledger accumulates for later reports.
    cost: state.cost + AGENCY_HIRE_COST,
    capitals: {
      ...state.capitals,
      values: {
        ...state.capitals.values,
        economic: Math.max(0, state.capitals.values.economic - AGENCY_ECONOMIC_COST)
      }
    },
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text: 'Hyrpersonal inkallad — laget växer för kvällen.'
      }
    ]
  };
}

function declineAgency(state: SimulationState): SimulationState {
  if (state.agencyOffer === null) return state;
  return {
    ...state,
    agencyOffer: null,
    capitals: {
      ...state.capitals,
      values: {
        ...state.capitals.values,
        social: Math.max(0, state.capitals.values.social - AGENCY_DECLINE_SOCIAL_COST)
      }
    },
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text: 'Avstod hyrpersonal — laget märker att det inte kom hjälp.'
      }
    ]
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
    eventStream: [...state.eventStream],
    pendingOutcomes: [...state.pendingOutcomes],
    team: { ...state.team, members: state.team.members.map((m) => ({ ...m })) },
    agencyOffer: state.agencyOffer ? { ...state.agencyOffer } : null,
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

  // ORDER 043 v3 §4 reputation loop — continuous per-tick pressure
  // from queue length + team strain. Runs after tickGuests so the
  // waiting queue reflects this tick's arrivals + departures, not the
  // previous tick's state.
  tickReputationDrift(draft);

  // ORDER 043 Addendum A service event stream — ambient rolls +
  // pending-outcome emission. Also runs after tickGuests so `loadOf`
  // reads the current active-guest count for the strain multiplier,
  // and after reputation drift so a large queue that just triggered
  // rep drift also feeds this tick's ambient probability.
  tickEventStream(draft, rng);

  // ORDER 043 v3 §10 step 5 — agency-offer strain tracking and
  // offer expiry. Runs after tickEventStream so this tick's load
  // reflects the current active guests. The offer itself is UI-
  // driven (ACCEPT_AGENCY / DECLINE_AGENCY); this tick fires the
  // offer and expires it into an implicit decline.
  tickAgencyStrain(draft);

  // ORDER 043 v3 step 5b — scheduled scenario firing.
  //
  // Fires when: service is running (lunch / dinner), there are still
  // fires remaining in the schedule, the head fire time is due, and
  // the previous scenario has settled (or none has ever fired). The
  // last gate means resolve → settle → next-trigger is serialised;
  // scenarios never overlap the response window.
  //
  // hasAutoTriggered is retained for backward compat with tests but
  // no longer gates: the schedule is the authority now.
  const scheduled = draft.day.scenarioTriggerTimes;
  const period = draft.day.period;
  const canFire = period === 'lunch' || period === 'dinner';
  const scenarioIdle =
    draft.scenario.phase === 'idle' || draft.scenario.phase === 'settled';
  if (
    canFire &&
    scenarioIdle &&
    scheduled.length > 0 &&
    draft.simTime >= scheduled[0]
  ) {
    const nextDraft = triggerScenario(draft, /* auto */ true);
    nextDraft.day = {
      ...nextDraft.day,
      scenarioTriggerTimes: scheduled.slice(1),
      scenariosFiredThisService: draft.day.scenariosFiredThisService + 1
    };
    return nextDraft;
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
  // ORDER 043 v3 step 1 — auto-transition day periods based on
  // elapsed sim-time in a running service. Runs last so scenario /
  // sustainability side-effects for the tick have already landed.
  return tickDayTransitions(draft);
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
  // ORDER 043 v3 §7 chain — draw the theme *before* the player sees
  // the scenario. Weakness-weighted with damping (see themeSelection.ts).
  // Consumes rng state so the same seed + same open sequence yields
  // the same chain.
  const rng = createRng(state.rngState);
  const drawnTheme = drawNextTheme(
    state.capitals.values,
    state.capitals.themeHistory,
    rng
  );
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
    drawnTheme,
    mentorComment: null,
    mentorCommentAt: null
  };
  return {
    ...state,
    scenario,
    rngState: rng.state,
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

  // ORDER 043 v3 §7 chain — capital movement on the drawn theme +
  // wager payout. Requires the theme was drawn at triggerScenario;
  // if not (older-flow test paths), skip the capital layer.
  let capitals = state.capitals;
  let wagerHistory = state.capitals.wagerHistory;
  let themeHistory = state.capitals.themeHistory;
  let wager = state.wager;
  const drawn = scenario.drawnTheme;
  if (drawn) {
    const themedDelta =
      SCENARIO_CAPITAL_DELTA * CHOICE_CAPITAL_SIGN[choice];
    const capitalAtPlacement = wager
      ? state.capitals.values[wager.capital]
      : 0;
    const payout = wagerPayout(drawn, wager, capitalAtPlacement);
    const nextValues = { ...state.capitals.values };
    nextValues[drawn] = clampCapital(nextValues[drawn] + themedDelta);
    if (payout.targetCapital) {
      nextValues[payout.targetCapital] = clampCapital(
        nextValues[payout.targetCapital] + payout.delta
      );
    }
    themeHistory = [...themeHistory, drawn].slice(-THEME_HISTORY_LIMIT);
    if (payout.outcome !== 'no_wager') {
      wagerHistory = [
        ...wagerHistory,
        {
          at: state.simTime,
          staked: wager!.capital,
          drew: drawn,
          outcome: payout.outcome,
          delta: payout.delta
        }
      ];
      // Wager is spent on resolution — cleared regardless of outcome.
      wager = null;
    }
    capitals = {
      ...state.capitals,
      values: nextValues,
      themeHistory,
      wagerHistory
    };
  }

  // ORDER 043 Addendum A outcome events. Fill the space that was
  // empty in ORDER 042 — between choice and mentor comment — with 1–2
  // authored lines describing what the choice did in the room. The
  // scenario id is currently hard-coded to 'walk-in-of-five' because
  // it is the only scenario shape wired; a future order that adds new
  // scenarios must carry the id on ScenarioState so this lookup
  // generalises.
  const outcomeTheme = drawn ?? 'social';
  const newOutcomes = scheduleOutcomes(
    'walk-in-of-five',
    choice,
    state.simTime,
    outcomeTheme
  );

  return {
    ...state,
    scenario,
    policies,
    reputation,
    capitals,
    wager,
    pendingOutcomes: [...state.pendingOutcomes, ...newOutcomes],
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

function clampCapital(v: number): number {
  return Math.max(CAPITAL_MIN, Math.min(CAPITAL_MAX, v));
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
