import { createRng } from '../util/rng';
import type {
  DayPeriod,
  DayState,
  EnablerKey,
  IngredientTier,
  Policies,
  Register,
  ScenarioChoice,
  ScenarioDifficulty,
  SimAction,
  SimulationState,
  StaffRole,
  SustainabilityKey
} from '../types';
import {
  SERVICE_LENGTH_MAX_MINUTES,
  SERVICE_LENGTH_MIN_MINUTES
} from '../types';
import { strings } from '../../content/strings.sv';
import { maybeSpawnGuest, scenarioSpawnStep, walkAwayProbability } from './arrivals';
import { planScenariosForService, scheduleScenarioTriggerTimes } from './day';
import { revenuePerGuest } from './economics';
import {
  PREP_CARRYOVER_OFFSET_SEC,
  PREP_CARRYOVER_THRESHOLD,
  PREP_DURATION_SEC,
  tickEventStream
} from './eventStream';
// ORDER 048 §2.1 — carryover text switched to the plain-voice service
// report per the three-voices split. Observer voice moved out of
// during-service into the evening account only.
import { SERVICE_REPORT_PREP_CARRYOVER } from '../../content/serviceReport.sv';
import { generateWeather, waitingAtOpeningCount } from './weather';
import {
  generateWorldFactors,
  worldFactorDeliveryMultiplier,
  worldFactorRevenueMultiplier,
  worldFactorWaitingMultiplier
} from './worldFactors';

// ORDER 045 — the opening image sits over the room for this long
// after OPEN_SERVICE, before prep begins. Ten seconds reads as an
// anticipation moment — long enough to notice the weather and the
// waiting count, short enough not to become its own act.
export const OPENING_DURATION_SEC = 10;
import {
  SENDER_PREFIX,
  pickScenarioSender,
  pickScenarioSpecFiltered,
  scenarioById
} from './scenarios';
import { fireCollapse, tickCollapseRoll } from './collapse';
import { computeEveningAccount } from './eveningAccount';
import {
  MORALE_AGENCY_ACCEPT_BUMP,
  MORALE_AGENCY_DECLINE_HIT,
  MORALE_DAILY_REGRESSION_TARGET,
  MORALE_SCENARIO_ENGAGE_BUMP,
  MORALE_SCENARIO_REFUSE_HIT,
  bumpMorale,
  tickMoraleDrift
} from './morale';
import { tickQualityDrift } from './quality';
import { ROLLING_WINDOW } from './valuation';
import { initialDay, makeGuest, makeInitialState, makeStaff } from './model';
import {
  decayEnablersOvernight,
  phronesisSofteningGeneral,
  tickReputationCeilingDrift,
  tickReputationDrift
} from './reputation';
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
  makeTeamMember,
  removeAgencyMembers,
  teamCapacity
} from './team';
import { drawNextTheme, wagerPayout } from './themeSelection';

// Wager + capital tuning constants live in ./constants (no imports,
// no cycle). Imported for local use AND re-exported here so callers
// that pull them from the reducer barrel keep working. Introduced
// 2026-08-09 to break the reducer ↔ eveningAccount ↔ themeSelection
// TDZ cycle that crashed the browser bundle (Vitest happened to
// resolve the cycle safely; the browser's entry order did not).
import {
  WAGER_UNIT_STAKE,
  WAGER_WEAK_THRESHOLD,
  WAGER_WEAK_WIN_MULTIPLIER,
  CAPITAL_MIN,
  CAPITAL_MAX,
  THEME_HISTORY_LIMIT,
  SCENARIO_CAPITAL_DELTA
} from './constants';
export {
  WAGER_UNIT_STAKE,
  WAGER_WEAK_THRESHOLD,
  WAGER_WEAK_WIN_MULTIPLIER,
  CAPITAL_MIN,
  CAPITAL_MAX,
  THEME_HISTORY_LIMIT,
  SCENARIO_CAPITAL_DELTA
};

// Consequence window per ORDER 042 §3.4: "over 30–45 seconds of
// compressed simulated time, the room changes in a way the player can
// watch". After this many sim-seconds from the RESOLVE_SCENARIO, the
// mentor comment surfaces in the world.
const SCENARIO_SETTLE_AFTER = 35;

// Party size for walk-in-of-five now lives on the scenario spec
// (scenarios.ts WALK_IN_OF_FIVE.choices.*.spawnedRemaining). Kept
// out of the reducer to keep authoring in one file.

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
    case 'HIRE_TEAM_MEMBER':
      return hireTeamMember(state, action.role);
    case 'FIRE_TEAM_MEMBER':
      return fireTeamMember(state, action.memberId);
    case 'RESET':
      return makeInitialState(state.seed, state.policies);
    case 'FORCE_COLLAPSE':
      return forceCollapseAction(state);
    case 'ANSWER_QUESTION':
      return answerProfessionalQuestion(state, action.index);
    case 'SHORTEN_MENU':
      return shortenMenuAction(state);
    case 'THIN_WINE_LIST':
      return thinWineListAction(state);
    case 'CLOSE_SERVICE':
      return closeServiceAction(state, action.service);
    default:
      return state;
  }
}

// ORDER 047 §8 — dev-only shortcut. Fires fireCollapse if we're in a
// running service post-prep with no collapse already latched. No-op
// otherwise (during morning/afternoon/evening/opening/prep the
// collapse mechanic doesn't apply, so this action does nothing).
function forceCollapseAction(state: SimulationState): SimulationState {
  const period = state.day.period;
  if (period !== 'lunch' && period !== 'dinner') return state;
  if (state.day.openingEndsAt !== null) return state;
  if (state.day.prepEndsAt !== null) return state;
  if (state.day.serviceCollapsed) return state;
  // fireCollapse mutates the draft in place; give it a shallow copy
  // of everything it touches so the reducer stays pure at the outer
  // boundary. Same pattern advanceTick uses.
  const draft: SimulationState = {
    ...state,
    day: { ...state.day },
    team: { ...state.team, members: state.team.members.map((m) => ({ ...m })) },
    eventStream: [...state.eventStream],
    events: [...state.events],
    consequenceEvents: [...state.consequenceEvents]
  };
  fireCollapse(draft);
  return draft;
}

// ---------- ORDER 049 §5.3 — scale-down actions ------------------------
//
// All three are morning-only (per Vision Owner) so the player commits
// to the scale-down as a considered morning decision, not a mid-service
// panic. Reversible — dispatching the same action while active un-scales.
// Cost (quality drift down) is applied continuously via targetQuality*
// in quality.ts reading state.scaleDown flags + policies.

const INGREDIENT_STEP_DOWN: Record<IngredientTier, IngredientTier> = {
  premium: 'utvald',
  utvald:  'grund',
  grund:   'grund'   // already at floor — no-op
};

function shortenMenuAction(state: SimulationState): SimulationState {
  if (state.day.period !== 'morning') return state;
  // If already shortened, restore the pre-shorten tier.
  if (state.scaleDown.menuShortenedFrom !== null) {
    return {
      ...state,
      policies: { ...state.policies, ingredientTier: state.scaleDown.menuShortenedFrom },
      scaleDown: { ...state.scaleDown, menuShortenedFrom: null }
    };
  }
  // Not shortened yet — step down and stash the original.
  const from = state.policies.ingredientTier;
  const to = INGREDIENT_STEP_DOWN[from];
  if (to === from) return state; // already at floor
  return {
    ...state,
    policies: { ...state.policies, ingredientTier: to },
    scaleDown: { ...state.scaleDown, menuShortenedFrom: from }
  };
}

function thinWineListAction(state: SimulationState): SimulationState {
  if (state.day.period !== 'morning') return state;
  const currentlyReduced = state.scaleDown.wineListReduced;
  return {
    ...state,
    policies: {
      ...state.policies,
      // Restoring? Turn welcomeDrink back on. Reducing? Turn it off.
      welcomeDrink: currentlyReduced ? true : false
    },
    scaleDown: { ...state.scaleDown, wineListReduced: !currentlyReduced }
  };
}

function closeServiceAction(
  state: SimulationState,
  service: 'lunch' | 'dinner'
): SimulationState {
  if (state.day.period !== 'morning') return state;
  const key = service === 'lunch' ? 'closedLunch' : 'closedDinner';
  return {
    ...state,
    scaleDown: { ...state.scaleDown, [key]: !state.scaleDown[key] }
  };
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
  // ORDER 049 §5.3 — refuse OPEN_SERVICE when the corresponding
  // scale-down flag is set. The player must restore the service
  // (dispatch CLOSE_SERVICE again with the same key) before opening.
  if (service === 'lunch'  && state.scaleDown.closedLunch)  return state;
  if (service === 'dinner' && state.scaleDown.closedDinner) return state;
  const length = clampServiceLength(lengthMinutes);
  // Deterministic scenario count + schedule from the current rng
  // state — same seed + same open sequence yields the same rhythm.
  // The schedule is shifted by PREP_DURATION_SEC so no scenario
  // fires during the mise en place window; the head-space buffer
  // in scheduleScenarioTriggerTimes then applies on top.
  const rng = createRng(state.rngState);
  // ORDER 045 — generate the evening's weather first so subsequent
  // calculations (waiting count, scenario schedule) see a stable
  // weather record. World factors roll after weather; both feed
  // waitingAtOpening below.
  const weather = generateWeather(rng);
  const worldFactors = generateWorldFactors(rng);
  const scenariosPlanned = planScenariosForService(length, rng);
  // Opening runs first, then prep, then service. Scenario schedule
  // shifted by opening + prep so no scenario fires while the doors
  // are still closed.
  const doorsOpenAt =
    state.simTime + OPENING_DURATION_SEC + PREP_DURATION_SEC;
  const serviceWindowMinutes = Math.max(
    1,
    length - (OPENING_DURATION_SEC + PREP_DURATION_SEC) / 60
  );
  const scenarioTriggerTimes = scheduleScenarioTriggerTimes(
    scenariosPlanned,
    doorsOpenAt,
    serviceWindowMinutes,
    rng
  );
  // Waiting count stacks reputation × weather (in waitingAtOpeningCount)
  // × world-factor waiting mult (here), capped again at the same 6-guest
  // ceiling.
  const waitingCap = 6;
  const baseWaiting = waitingAtOpeningCount(state.reputation, weather);
  const waitingAtOpening = Math.min(
    waitingCap,
    Math.round(baseWaiting * worldFactorWaitingMultiplier(worldFactors))
  );
  const day: DayState = {
    ...state.day,
    period: service,
    periodStartAt: state.simTime,
    currentServiceLengthMinutes: length,
    scenariosPlanned,
    scenariosFiredThisService: 0,
    scenarioTriggerTimes,
    // Opening panel for OPENING_DURATION_SEC, then prep for
    // PREP_DURATION_SEC. Arrivals + scenarios gated until both close
    // (see advanceTick + arrivalProbability).
    openingEndsAt: state.simTime + OPENING_DURATION_SEC,
    prepEndsAt: state.simTime + OPENING_DURATION_SEC + PREP_DURATION_SEC,
    prepIgnoranceCount: 0,
    // ORDER 043 Addendum B prep floor — two guaranteed prep events
    // per service, at ~35 s and ~85 s past prep-start (~45 s and
    // ~95 s past OPEN_SERVICE, which sits before opening). Kinds
    // rotate across services via a coarse dayNumber+service mod so
    // consecutive services don't spotlight the same axis.
    prepFloorSchedule: buildPrepFloorSchedule(
      state.simTime + OPENING_DURATION_SEC,
      state.day.dayNumber,
      service
    ),
    weather,
    waitingAtOpening,
    doorsOpenedThisService: false,
    worldFactors,
    // ORDER 046 §1 — new service opens with a clean collapse slate.
    serviceCollapsed: false,
    collapseAxis: null,
    // ORDER 046 §3 — snapshot the ledger at service start so the
    // evening account can compute this service's net by subtraction
    // without needing to instrument revenue / cost accumulation.
    revenueAtServiceStart: state.revenue,
    costAtServiceStart: state.cost,
    reputationAtServiceStart: state.reputation,
    // ORDER 047 §6 — preserve morningPolicyChanges through the service
    // so the evening account can read them. Cleared on evening→morning
    // transition. Passed through explicitly since {...state.day} would
    // preserve them anyway, but this is the anchor point for the note.
    morningPolicyChanges: state.day.morningPolicyChanges
  };
  // ORDER 047 §5/§4 — reset per-service tallies at service open. The
  // stream-count reading is per-evening; the fired-scenario dedup is
  // per-service. lastServiceOpenerId carries across services (set at
  // first fire in this service, read at the next service's first draw).
  //
  // ORDER 047 §6 — schedule a pendingOutcome per morningPolicyChange
  // to fire ~4 s past doors-open so the stream names the change as it
  // lands. Uses the same pendingOutcome machinery as scenario outcomes.
  const doorsOpenAtAbs = state.simTime + OPENING_DURATION_SEC + PREP_DURATION_SEC;
  const policyOutcomes = state.day.morningPolicyChanges.map((text) => ({
    dueAt: doorsOpenAtAbs + 4,
    text,
    sustainability: 'social' as const,
    scenarioId: 'morning-policy'
  }));
  return {
    ...state,
    day,
    rngState: rng.state,
    streamThemeCounts: { economic: 0, social: 0, ecological: 0 },
    firedScenarioIds: [],
    pendingOutcomes: [...state.pendingOutcomes, ...policyOutcomes]
  };
}

// ORDER 043 Addendum B — two guaranteed prep events per service.
// Slot times are fixed at 35 s and 85 s past prep-start (leaving
// 30 s of "quiet" head and tail so the floor doesn't feel metronomic).
// Kinds are rotated across services by (dayNumber + service parity)
// so consecutive services don't foreground the same axis.
const PREP_FLOOR_OFFSETS_SEC = [35, 85] as const;
const PREP_KINDS: readonly ('prep_kitchen' | 'prep_room' | 'prep_delivery')[] = [
  'prep_kitchen',
  'prep_room',
  'prep_delivery'
];
function buildPrepFloorSchedule(
  prepStartAt: number,
  dayNumber: number,
  service: 'lunch' | 'dinner'
): { dueAt: number; kind: 'prep_kitchen' | 'prep_room' | 'prep_delivery' }[] {
  const parity = service === 'lunch' ? 0 : 1;
  const baseIdx = (dayNumber - 1) * 2 + parity;
  return PREP_FLOOR_OFFSETS_SEC.map((offset, i) => ({
    dueAt: prepStartAt + offset,
    kind: PREP_KINDS[(baseIdx + i) % PREP_KINDS.length]
  }));
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
      scenarioTriggerTimes: [],
      openingEndsAt: null,
      prepEndsAt: null,
      prepIgnoranceCount: 0,
      prepFloorSchedule: [],
      weather: null,
      waitingAtOpening: 0,
      doorsOpenedThisService: false,
      worldFactors: [],
      serviceCollapsed: false,
      collapseAxis: null,
      revenueAtServiceStart: null,
      costAtServiceStart: null,
      reputationAtServiceStart: null
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
//
// ORDER 046 §3 — bumped 15 → 30 to hold the evening account panel.
// The account fades in at evening start, holds for ~25 s, fades over
// ~5 s; anything shorter would rush the reading.
const EVENING_TO_MORNING_PAUSE_SEC = 30;

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
          scenarioTriggerTimes: [],
          openingEndsAt: null,
          prepEndsAt: null,
          prepIgnoranceCount: 0,
          prepFloorSchedule: [],
          weather: null,
          waitingAtOpening: 0,
          doorsOpenedThisService: false,
          worldFactors: [],
          serviceCollapsed: false,
          collapseAxis: null,
          revenueAtServiceStart: null,
          costAtServiceStart: null,
          reputationAtServiceStart: null
        }
      };
    }
  }
  if (day.period === 'dinner' && day.currentServiceLengthMinutes !== null) {
    const endsAt = day.periodStartAt + day.currentServiceLengthMinutes * 60;
    if (simTime >= endsAt) {
      // ORDER 046 §3 — snapshot the evening account BEFORE the day
      // fields are cleared. The account reads day.revenueAtServiceStart
      // and friends; if we cleared them first, every account would
      // fall to the mediocre-by-default branch.
      const eveningAccount = computeEveningAccount(state);
      // ORDER 043 v3 §10 step 5 — clear any agency hires + any
      // standing agency offer at service close. Agency members are
      // scoped to the single service; the offer is stale after
      // close and would surface next service if not cleared.
      return {
        ...state,
        team: removeAgencyMembers(state.team),
        agencyOffer: null,
        eveningAccount,
        day: {
          ...day,
          period: 'evening',
          periodStartAt: simTime,
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
          serviceCollapsed: false,
          collapseAxis: null,
          revenueAtServiceStart: null,
          costAtServiceStart: null,
          reputationAtServiceStart: null
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
      // ORDER 047 §2 — half-regression toward the baseline morale.
      // A run of good evenings stays high; a bad run doesn't spiral
      // permanently. Formula: morale = baseline + (morale - baseline)
      // × 0.5. From 1.0 → 0.875; from 0.0 → 0.375; from 0.75 stays.
      const regressed =
        MORALE_DAILY_REGRESSION_TARGET +
        (state.morale - MORALE_DAILY_REGRESSION_TARGET) * 0.5;
      // ORDER 049 §5.2 — flush the day's lunch/dinner buckets into
      // the rolling arrays and reset today. Kept at ROLLING_WINDOW
      // entries so the valuation.monthlyNetRunRate reads a stable
      // 14-day (approx) window regardless of session length.
      const nextRollingLunch = [
        ...state.serviceRevenueRolling.lunch,
        state.serviceRevenueToday.lunch
      ].slice(-ROLLING_WINDOW);
      const nextRollingDinner = [
        ...state.serviceRevenueRolling.dinner,
        state.serviceRevenueToday.dinner
      ].slice(-ROLLING_WINDOW);
      return {
        ...state,
        team: chargeStructuralCost(state.team),
        // ORDER 046 §3 — evening account is scoped to a single evening;
        // clear when the new day begins so the panel doesn't linger
        // into morning where the investment panel needs the room.
        eveningAccount: null,
        morale: regressed,
        // Per-service tallies reset with the day.
        streamThemeCounts: { economic: 0, social: 0, ecological: 0 },
        firedScenarioIds: [],
        // ORDER 049 §5.2 — rolling revenue flush.
        serviceRevenueToday: { lunch: 0, dinner: 0 },
        serviceRevenueRolling: { lunch: nextRollingLunch, dinner: nextRollingDinner },
        // ORDER 049 §2.1 knowledge decay — every enabler tally drops
        // a fixed % per night. Rhythm not reaction: the player must
        // refill via questions to hold the ceiling.
        enablers: decayEnablersOvernight(state.enablers),
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
  // ORDER 047 §2 — accepting help lifts morale; the team registers
  // that management moves when they're drowning.
  const next: SimulationState = {
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
  bumpMorale(next, MORALE_AGENCY_ACCEPT_BUMP);
  return next;
}

function declineAgency(state: SimulationState): SimulationState {
  if (state.agencyOffer === null) return state;
  // ORDER 047 §2 — declining help drops morale, mirroring the
  // existing social-capital cost.
  const next: SimulationState = {
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
  bumpMorale(next, -MORALE_AGENCY_DECLINE_HIT);
  return next;
}

// ---------- ORDER 043 v3 §10 step 5 — morning hire / fire ---------------
//
// §11 point 1's acceptance criterion — "the team decision mattered,
// and its cost was felt during service" — requires a hiring surface.
// This is it. Only fires during the morning phase; hires start with
// their role's default competence and a fresh 7-day contract. Firing
// pays out remaining contract days as a lump-sum buyout so a spam
// hire-then-fire chain isn't free.
//
// No hard team-size cap; economic capital + ongoing dailyCost are
// the natural bounds. A 6-role team is expensive; a lärling-only
// team is cheap but reads badly in the stream (kock competence
// collapses).

const TEAM_MAX_MEMBERS = 6; // guard against absurd hiring

function hireTeamMember(state: SimulationState, role: StaffRole): SimulationState {
  if (state.day.period !== 'morning') return state;
  if (state.team.members.length >= TEAM_MAX_MEMBERS) return state;
  const member = makeTeamMember(role, state.day.dayNumber);
  return {
    ...state,
    team: {
      ...state.team,
      members: [...state.team.members, member]
    },
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text: `Anställde ${role} — kontrakt till dag ${member.contractEndsDay}.`
      }
    ]
  };
}

function fireTeamMember(state: SimulationState, memberId: string): SimulationState {
  if (state.day.period !== 'morning') return state;
  const member = state.team.members.find((m) => m.id === memberId);
  if (!member) return state;
  // Buyout = remaining contract days × dailyCost. Fired the day
  // after the contract ends → buyout 0. Fired mid-contract → the
  // days you promised to pay for are paid up-front.
  const remainingDays = Math.max(0, member.contractEndsDay - state.day.dayNumber);
  const buyout = remainingDays * member.dailyCost;
  return {
    ...state,
    team: {
      ...state.team,
      members: state.team.members.filter((m) => m.id !== memberId),
      paidStructuralCost: state.team.paidStructuralCost + buyout
    },
    cost: state.cost + buyout,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text:
          buyout > 0
            ? `Sa upp ${member.role} — buyout ${buyout} kr (${remainingDays} dagar kvar av kontraktet).`
            : `Sa upp ${member.role} — kontraktet var slut.`
      }
    ]
  };
}

// ---------- ORDER 043 wager + enabler transitions -------------------------

function placeWager(state: SimulationState, capital: SustainabilityKey): SimulationState {
  // ORDER 043 Addendum B — the stake is locked the moment it is
  // placed. No withdrawal, no time window. Once a wager stands,
  // PLACE_WAGER is a no-op; the only way out is the next scenario
  // resolving (which clears the wager as part of payout).
  if (state.wager !== null) return state;
  return {
    ...state,
    wager: {
      capital,
      placedAt: state.simTime,
      amount: WAGER_UNIT_STAKE
    }
  };
}

// CLEAR_WAGER intentionally retired at Addendum B. The stake locks
// at placement; the wager is cleared only by RESOLVE_SCENARIO after
// payout. Kept as a helper for backward compat if a future order
// needs a system-side retract (e.g. a service that ends before a
// scenario fires); currently unused.
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
      // ORDER 043 §6 ecological cadence + ORDER 045 world factor —
      // vägarbeten multiplies the cooldown base by 1.4× (the
      // supplier's route is disrupted).
      const ecological = draft.capitals.values.ecological;
      const cooldownBase =
        60 *
        (1.4 - 0.8 * ecological) *
        worldFactorDeliveryMultiplier(draft.day.worldFactors);
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

  // Payment triggers revenue. ORDER 045 world-factor revenue mult
  // (betalningsvilja): konjunktur uppgång/nedgång shifts +10 / −15 %,
  // festival crowd +5 %, hockey crowd −10 % (casual + price-sensitive).
  //
  // ORDER 049 §5.2 — also accumulate the payment into the day's
  // service-type bucket (lunch or dinner) so the rolling arrays can
  // report the split for the panel + goodwill run-rate. Same event,
  // no extra tick cost.
  const revenueMult = worldFactorRevenueMultiplier(draft.day.worldFactors);
  const inLunch = draft.day.period === 'lunch';
  const inDinner = draft.day.period === 'dinner';
  for (const guest of draft.guests) {
    if (guest.state === 'paying' && guest.stateTime === draft.simTime) {
      const rev = revenuePerGuest(draft.policies) * revenueMult;
      draft.revenue += rev;
      // kSEK-scale conversion for the panel readouts (state.revenue
      // is raw kr; the valuation math and panel operate in kSEK).
      const revKsek = rev / 1000;
      if (inLunch) draft.serviceRevenueToday.lunch += revKsek;
      else if (inDinner) draft.serviceRevenueToday.dinner += revKsek;
    }
  }
  // Accumulate cost.
  draft.cost += (costPerMinuteToTick(draft) * tickSeconds) / 60;

  // ORDER 049 §5.2 — daily loan interest. Accrues once per calendar
  // day (guarded by lastAccrualDay so the same tick can't charge it
  // twice). Interest is added straight to state.cost so the existing
  // valuation.monthlyNetRunRate reads it as part of daily net.
  if (draft.loan.principal > 0 && draft.day.dayNumber > draft.loan.lastAccrualDay) {
    const daysToCharge = draft.day.dayNumber - draft.loan.lastAccrualDay;
    // principal is in kSEK-scale; convert to raw kr for the cost
    // ledger which sits in kr.
    const interestKr =
      draft.loan.principal * draft.loan.interestRatePerDay * daysToCharge * 1000;
    draft.cost += interestKr;
    draft.loan = { ...draft.loan, lastAccrualDay: draft.day.dayNumber };
  }

  // ORDER 049 §5.2 — quality drift. Runs every tick in every period;
  // half-life ~15 sim-min so a bad service dents but doesn't sink,
  // and a good week visibly climbs.
  tickQualityDrift(draft);

  // Sustainability.
  tickSustainability(draft);

  // ORDER 043 v3 §4 reputation loop — continuous per-tick pressure
  // from queue length + team strain. Runs after tickGuests so the
  // waiting queue reflects this tick's arrivals + departures, not the
  // previous tick's state.
  tickReputationDrift(draft);

  // ORDER 049 §2.1 knowledge-ceiling drift — recomputes reputation
  // ceiling from episteme enablers and pulls the live reading toward
  // it. Runs every period so morning study visibly lifts the ceiling
  // before the doors open.
  tickReputationCeilingDrift(draft);

  // ORDER 043 Addendum A service event stream — ambient rolls +
  // pending-outcome emission. Also runs after tickGuests so `loadOf`
  // reads the current active-guest count for the strain multiplier,
  // and after reputation drift so a large queue that just triggered
  // rep drift also feeds this tick's ambient probability.
  tickEventStream(draft, rng);

  // ORDER 045 opening-window end. When the 10-s opening panel expires
  // the day rolls into prep — no visible state change other than the
  // opening panel closing; arrivals + scenarios are still gated by
  // prepEndsAt (see arrivalProbability + the scheduled-scenario
  // check below).
  if (
    draft.day.openingEndsAt !== null &&
    draft.simTime >= draft.day.openingEndsAt
  ) {
    draft.day = { ...draft.day, openingEndsAt: null };
  }

  // ORDER 043 Addendum A prep-window end. Runs after tickEventStream
  // so this tick's prep events are already counted. If prep just
  // ended AND the team fumbled enough during it, schedule a
  // carryover bottleneck ~13 min into service — the mise en place
  // sin coming home to roost.
  //
  // ORDER 045 — doors open at prep-end. The guests who were waiting
  // outside during the opening + prep window spawn now, as arrivals.
  // They start at their arrival slots (the "waiting outside"
  // vocabulary) and the room's normal state machine takes them from
  // there.
  if (
    draft.day.prepEndsAt !== null &&
    draft.simTime >= draft.day.prepEndsAt
  ) {
    if (draft.day.prepIgnoranceCount >= PREP_CARRYOVER_THRESHOLD) {
      draft.pendingOutcomes = [
        ...draft.pendingOutcomes,
        {
          dueAt: draft.simTime + PREP_CARRYOVER_OFFSET_SEC,
          text: SERVICE_REPORT_PREP_CARRYOVER,
          sustainability: 'social',
          scenarioId: 'prep-carryover',
          flavor: 'prep-carryover'
        }
      ];
    }
    // Doors-open guest spawn — fires exactly once per service via
    // the doorsOpenedThisService flag.
    if (!draft.day.doorsOpenedThisService && draft.day.waitingAtOpening > 0) {
      const walkAwayCeil = walkAwayProbability(draft.capitals.values.economic);
      for (let i = 0; i < draft.day.waitingAtOpening; i++) {
        const walkAway = rng.chance(walkAwayCeil);
        draft.guests.push(makeGuest(draft.simTime, false, walkAway));
      }
    }
    draft.day = {
      ...draft.day,
      prepEndsAt: null,
      doorsOpenedThisService: true
    };
  }

  // ORDER 043 v3 §10 step 5 — agency-offer strain tracking and
  // offer expiry. Runs after tickEventStream so this tick's load
  // reflects the current active guests. The offer itself is UI-
  // driven (ACCEPT_AGENCY / DECLINE_AGENCY); this tick fires the
  // offer and expires it into an implicit decline.
  tickAgencyStrain(draft);

  // ORDER 046 §1 — collapse roll. Runs after agency strain (so the
  // same tick that fires an offer can also fire the collapse; the
  // team asking for help mid-strain is not immune from the roll).
  // Guarded internally to post-opening + post-prep service and to
  // once-per-service; on fire, force-transitions period to evening.
  // Uses a tick-derived RNG so downstream random draws aren't shifted.
  tickCollapseRoll(draft);

  // ORDER 047 §2 — morale drift toward mean-satisfaction-derived
  // target. Guarded internally to post-opening + post-prep service
  // with active seated guests; a dead room applies no drift so an
  // empty evening doesn't reset morale to a neutral middle.
  tickMoraleDrift(draft);

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
    const comment = mentorCommentFor(
      draft.scenario.scenarioId,
      draft.scenario.choice,
      draft.scenario.difficulty
    );
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
  // ORDER 047 §6 — if the change lands during morning, remember it
  // as an observer-voice sentence so tonight's stream can name it and
  // the evening account can reference it. Actual policy changes only;
  // no-op patches (setting the same value) are filtered.
  const changeLine =
    state.day.period === 'morning'
      ? observerVoiceForPolicyChange(state.policies, patch)
      : null;
  const morningPolicyChanges = changeLine
    ? [...state.day.morningPolicyChanges, changeLine]
    : state.day.morningPolicyChanges;
  return {
    ...state,
    policies,
    staff: nextStaff,
    events: [...state.events, event],
    day: { ...state.day, morningPolicyChanges }
  };
}

// ORDER 047 §6 — synthesise a one-line observer-voice sentence for a
// meaningful policy change. Returns null when the change is a no-op
// (setting the same value) or when the patch doesn't include a field
// the player recognises as an investment axis.
function observerVoiceForPolicyChange(
  before: Policies,
  patch: Partial<Policies>
): string | null {
  const lines: string[] = [];
  if (patch.trainingLevel !== undefined && patch.trainingLevel !== before.trainingLevel) {
    const direction = patch.trainingLevel > before.trainingLevel ? 'höjde' : 'sänkte';
    lines.push(`Du ${direction} utbildningsnivån inför i dag`);
  }
  if (patch.pricing && patch.pricing !== before.pricing) {
    const to = patch.pricing;
    const map: Record<typeof to, string> = {
      'låg': 'sänkte prislägen',
      'medel': 'la prislägen på medel',
      'hög': 'höjde prislägen'
    };
    lines.push(`Du ${map[to]} inför i dag`);
  }
  if (patch.ingredientTier && patch.ingredientTier !== before.ingredientTier) {
    const to = patch.ingredientTier;
    const map: Record<typeof to, string> = {
      'grund': 'gick ner till grundleverantören',
      'utvald': 'valde utvalda leverantörer',
      'premium': 'gick över till premiumleverans'
    };
    lines.push(`Du ${map[to]} inför i dag`);
  }
  if (lines.length === 0) return null;
  return lines.join(', ') + '.';
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
  // ORDER 047 §5 — pass streamThemeCounts so the theme draw is biased
  // (not forced) toward what the ambient stream has been reporting on
  // during this service. Reset at OPEN_SERVICE (in openService).
  const drawnTheme = drawNextTheme(
    state.capitals.values,
    state.capitals.themeHistory,
    rng,
    state.streamThemeCounts
  );
  // ORDER 047 §4 — dedup within service, avoid the previous service's
  // opener. pickScenarioSpecFiltered falls back to the preferred spec
  // if the pool exhausts (density > pool size), so the wager loop
  // never stalls.
  const scenarioSpec = pickScenarioSpecFiltered(
    drawnTheme,
    state.firedScenarioIds,
    state.lastServiceOpenerId
  );
  // ORDER 048 §4 — pick the sender at trigger time. Uses a DERIVED
  // rng (hashed from state.seed × state.tick × scenario spec id) so
  // downstream arrival randomness is not shifted — the queue-monotonicity
  // regression in day.test.ts is sensitive to a single extra rng draw.
  // Deterministic per (seed, tick, spec).
  const senderSeed =
    ((state.tick + 1) * 2654435761) ^ (state.seed * 2246822519);
  const specIdHash = scenarioSpec.id
    .split('')
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
  const senderRng = createRng((senderSeed ^ specIdHash) >>> 0);
  const sender = pickScenarioSender(scenarioSpec, state.team, senderRng);
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
    scenarioId: scenarioSpec.id,
    senderRole: sender ? sender.role : null,
    senderMemberId: sender ? sender.memberId : null,
    mentorComment: null,
    mentorCommentAt: null
  };
  // First scenario of the service becomes next service's opener-to-avoid.
  const isFirstOfService = state.firedScenarioIds.length === 0;
  return {
    ...state,
    scenario,
    rngState: rng.state,
    firedScenarioIds: [...state.firedScenarioIds, scenarioSpec.id],
    lastServiceOpenerId: isFirstOfService
      ? scenarioSpec.id
      : state.lastServiceOpenerId,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'scenario' as const,
        // ORDER 048 §4 — subject-body prefixed with the sender's role
        // ("Värden: ..."). Non-auto (dev-triggered) replays keep the
        // debug marker so it reads distinctly from a real fire.
        text: auto
          ? sender
            ? `${SENDER_PREFIX[sender.role]}: ${scenarioSpec.subjectBody}`
            : scenarioSpec.subjectBody
          : 'Scenariot replays (utvecklarläge)'
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
  // ORDER 048 §5 — phase decided AFTER we look up the choiceSpec
  // below. If a professionalQuestion is attached, the flow inserts
  // a 'question' phase between 'resolving' and 'settled'.
  scenario.phase = 'resolving';
  scenario.choice = choice;
  scenario.choiceAt = state.simTime;

  // Look up the scenario spec chosen at trigger. Falls back to
  // walk-in-of-five if for some legacy reason scenarioId wasn't
  // set — cycle-1 tests pre-dating the spec pattern rely on this.
  const spec = scenario.scenarioId
    ? scenarioById(scenario.scenarioId)
    : scenarioById('walk-in-of-five');
  const choiceSpec = spec?.choices[choice] ?? null;

  // Spawn effects from spec (party arriving, refusal partial-approach
  // etc). Zero-spawn scenarios (time-pressure, moral-dilemma) leave
  // the room's puck layer untouched.
  scenario.spawnedRemaining = choiceSpec?.spawnedRemaining ?? 0;
  scenario.nextSpawnAt = state.simTime + (choiceSpec?.nextSpawnAtOffset ?? 0);

  // Walk-in-of-five's B flips welcomeDrink on (adds staff task /
  // satisfaction lift). Kept inline as it's a scenario-specific
  // policy nudge — a future order could generalise via a
  // policyPatch field on ScenarioChoiceSpec.
  let policies = state.policies;
  if (spec?.id === 'walk-in-of-five' && choice === 'B') {
    policies = { ...policies, welcomeDrink: true };
  }

  // Reputation nudge for walk-in-of-five's C (refusal in front of
  // the entrance registers publicly). Other scenarios' refusals
  // don't have this specific rep hit — their consequence flows
  // through the capital delta + wager loop instead.
  let reputation = state.reputation;
  if (spec?.id === 'walk-in-of-five' && choice === 'C') {
    reputation = Math.max(0, reputation - 0.03);
  }

  // ORDER 048 §6 — meter-threshold amplifier. Hoisted above the
  // capital-write block so the outcome-scheduling block (below) can
  // also read amplifierFires + amp.extraOutcome. Reads as "you took
  // this shortcut when the capital could least afford it."
  const amp = choiceSpec?.belowThreshold;
  const amplifierFires =
    !!amp && state.capitals.values[amp.capital] < amp.min;
  const rawThemeMult = amplifierFires ? amp!.amplifyThemeDelta : 1;
  const rawSecondaryMult = amplifierFires ? amp!.amplifySecondary : 1;
  // ORDER 049 §2.1: phronesis softens only the amplifier EXCESS
  // (the multiplier over the nominal ×1). "Att döma rätt räddar dig
  // när det brister" — the nominal consequence of the choice stands,
  // but the pressed-below-threshold penalty is what wisdom mitigates.
  const soften = amplifierFires ? phronesisSofteningGeneral(state) : 1;
  const themeMult = 1 + (rawThemeMult - 1) * soften;
  const secondaryMult = 1 + (rawSecondaryMult - 1) * soften;

  // ORDER 043 v3 §7 chain — capital movement on the drawn theme +
  // wager payout. capitalSign now comes from the spec so scenarios
  // can weight A/B/C differently (a moral-dilemma A might read as
  // -1 while walk-in-of-five A reads as +1).
  let capitals = state.capitals;
  let wagerHistory = state.capitals.wagerHistory;
  let themeHistory = state.capitals.themeHistory;
  let wager = state.wager;
  const drawn = scenario.drawnTheme;
  if (drawn) {
    const capitalSign = choiceSpec?.capitalSign ?? CHOICE_CAPITAL_SIGN[choice];
    const themedDelta = SCENARIO_CAPITAL_DELTA * capitalSign;
    const capitalAtPlacement = wager
      ? state.capitals.values[wager.capital]
      : 0;
    const payout = wagerPayout(drawn, wager, capitalAtPlacement);
    const nextValues = { ...state.capitals.values };
    nextValues[drawn] = clampCapital(nextValues[drawn] + themedDelta * themeMult);
    // ORDER 048 §3 — apply secondary sustainability writes. Two-way
    // trades (a choice that lifts one capital while dropping another)
    // land here as separate ± deltas on distinct capitals. Fired
    // AFTER the themed delta and BEFORE the wager payout so a wager
    // on a secondary-write capital reads the pre-payout value.
    if (choiceSpec?.secondaryWrites) {
      for (const w of choiceSpec.secondaryWrites) {
        nextValues[w.capital] = clampCapital(nextValues[w.capital] + w.delta * secondaryMult);
      }
    }
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

  // ORDER 043 v3 §10 step 5 hand-authored register writes per
  // response. Enabler-history evidence is the primary unit of the
  // portfolio (§8); it's what a future scenario will draw from,
  // never a numeric readout. Amounts clamped by the enabler write
  // logic below (mirrors recordEnablerEvent behaviour).
  let enablers = state.enablers;
  if (choiceSpec) {
    enablers = { ...enablers };
    for (const w of choiceSpec.registerWrites) {
      const amount = Math.max(0, Math.min(1, w.amount));
      if (amount === 0) continue;
      const previous = enablers[w.enabler];
      enablers[w.enabler] = {
        ...previous,
        [w.register]: previous[w.register] + amount,
        history: [
          ...previous.history,
          {
            at: state.simTime,
            register: w.register,
            amount,
            scenarioId: spec?.id ?? null
          }
        ]
      };
    }
  }

  // ORDER 048 §2.2 — immediate plain-voice outcome fired ~0.5 s
  // after the player answers. The connection between choice and
  // effect must be visible; the plain sentence names the specific
  // consequence in the room. Observer-voice `outcomes[]` array is
  // no longer scheduled during service (§2.3 relocation).
  const outcomeTheme = drawn ?? spec?.sustainability ?? 'social';
  const newOutcomes: typeof state.pendingOutcomes = [];
  if (choiceSpec?.immediateOutcome) {
    newOutcomes.push({
      dueAt: state.simTime + 0.5,
      text: choiceSpec.immediateOutcome,
      sustainability: outcomeTheme,
      scenarioId: spec?.id ?? 'unknown'
    });
  }
  // ORDER 048 §6 — when the amplifier fires and the spec provided an
  // extraOutcome line, append it at t+12 s. Amplifier lines are still
  // observer voice by design — they read as the proprietor noticing
  // "this particular choice bit harder than usual", which is
  // reflective, not a report. Marginal exception to §2's relocation.
  if (amplifierFires && amp?.extraOutcome) {
    newOutcomes.push({
      dueAt: state.simTime + 12,
      text: amp.extraOutcome,
      sustainability: outcomeTheme,
      scenarioId: spec?.id ?? 'unknown'
    });
  }

  // ORDER 047 §2 — scenario answer moves morale. A/B (engage) lifts;
  // C on a demanding scenario (refuse in a way that costs) drops.
  // capitalSign carries the intent: +1 = engage, −0.5 = refuse. A
  // future scenario spec can override via a per-choice moraleDelta.
  const capitalSign = choiceSpec?.capitalSign ?? 0;
  const moraleDelta =
    capitalSign > 0
      ? MORALE_SCENARIO_ENGAGE_BUMP
      : capitalSign < 0
        ? -MORALE_SCENARIO_REFUSE_HIT
        : 0;

  // ORDER 048 §5 — if the choice attached a professionalQuestion,
  // switch phase to 'question' and stash a PendingQuestion for the
  // overlay to render. The scenario's normal outcome pending events
  // still schedule; the mentor comment (via SCENARIO_SETTLE_AFTER)
  // still fires. The question is a beat on top, not a replacement.
  const pq = choiceSpec?.professionalQuestion ?? null;
  if (pq && spec) {
    scenario.phase = 'question';
    scenario.pendingQuestion = {
      body: pq.body,
      options: pq.options.map((o) => ({
        label: o.label,
        correct: o.correct,
        consequenceLine: o.consequenceLine
      })),
      senderRole: pq.senderRole ?? scenario.senderRole,
      scenarioId: spec.id,
      choice
    };
  }

  const nextState: SimulationState = {
    ...state,
    scenario,
    policies,
    reputation,
    capitals,
    enablers,
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
  bumpMorale(nextState, moraleDelta);
  return nextState;
}

// ORDER 048 §5 — answer to the current professional question. Right
// answer: enabler write (+ optional correctLine at t+4 s). Wrong
// answer: per-option consequenceLine at t+4 s, plus a decay to the
// same enabler tally the correct answer would have paid (ORDER 049
// §2.1, 2026-08-09: knowledge that failed is the knowledge that
// regresses; capital falls indirectly via the ceiling chain).
function answerProfessionalQuestion(
  state: SimulationState,
  index: number
): SimulationState {
  const pq = state.scenario.pendingQuestion;
  if (state.scenario.phase !== 'question' || !pq) return state;
  const opt = pq.options[index];
  if (!opt) return state;

  const spec = scenarioById(pq.scenarioId);
  const questionSpec = spec?.choices[pq.choice]?.professionalQuestion ?? null;

  let capitals = state.capitals;
  let enablers = state.enablers;
  const newOutcomes: typeof state.pendingOutcomes = [];

  if (opt.correct) {
    // Enabler write for the correct answer.
    if (questionSpec?.correctEnablerWrite) {
      const w = questionSpec.correctEnablerWrite;
      const amount = Math.max(0, Math.min(1, w.amount));
      if (amount > 0) {
        const prev = enablers[w.enabler];
        enablers = {
          ...enablers,
          [w.enabler]: {
            ...prev,
            [w.register]: prev[w.register] + amount,
            history: [
              ...prev.history,
              { at: state.simTime, register: w.register, amount, scenarioId: pq.scenarioId }
            ]
          }
        };
      }
    }
    // Positive outcome line for the room, if the spec provided one.
    if (questionSpec?.correctLine) {
      newOutcomes.push({
        dueAt: state.simTime + 4,
        text: questionSpec.correctLine,
        sustainability: spec?.sustainability ?? 'social',
        scenarioId: pq.scenarioId
      });
    }
  } else {
    // Wrong. Per-option consequence line first (specific room
    // consequence of the exact wrong answer), then the choice-level
    // capital hit.
    if (opt.consequenceLine) {
      newOutcomes.push({
        dueAt: state.simTime + 4,
        text: opt.consequenceLine,
        sustainability: spec?.sustainability ?? 'social',
        scenarioId: pq.scenarioId
      });
    }
    // ORDER 049 §2.1 (Vision Owner 2026-08-09): wrong answers now
    // decay the same enabler tally the question was probing, not
    // capital. Capital falls indirectly — the ceiling drops, drift
    // pulls quality and reputation with it, revenue follows. This
    // makes "brister kan inte kompenseras mellan områden" mechanical:
    // knowledge that failed is precisely the knowledge that regresses.
    if (questionSpec?.correctEnablerWrite) {
      const w = questionSpec.correctEnablerWrite;
      // Symmetric magnitude: a wrong answer costs the same tally the
      // right answer would have paid. Kept simple; §5 tuning may
      // later scale wrong-costs to be steeper than right-gains once
      // playtest shows the shape.
      const cost = Math.max(0, Math.min(1, w.amount));
      if (cost > 0) {
        const prev = enablers[w.enabler];
        enablers = {
          ...enablers,
          [w.enabler]: {
            ...prev,
            [w.register]: Math.max(0, prev[w.register] - cost),
            history: [
              ...prev.history,
              { at: state.simTime, register: w.register, amount: -cost, scenarioId: pq.scenarioId }
            ]
          }
        };
      }
    }
  }

  // Phase back to 'resolving' so the standard settle → 'settled'
  // continues. Clear pendingQuestion. `choiceAt` is unchanged so the
  // SCENARIO_SETTLE_AFTER window continues from the original choice
  // — the question is part of the resolve, not a reset.
  const scenario = {
    ...state.scenario,
    phase: 'resolving' as const,
    pendingQuestion: null
  };
  return {
    ...state,
    scenario,
    capitals,
    enablers,
    pendingOutcomes: [...state.pendingOutcomes, ...newOutcomes]
  };
}

function clampCapital(v: number): number {
  return Math.max(CAPITAL_MIN, Math.min(CAPITAL_MAX, v));
}

function mentorCommentFor(
  scenarioId: string | null,
  choice: ScenarioChoice | null,
  difficulty: ScenarioDifficulty | null
): string {
  // Null/unexpected combination falls back to a neutral line rather
  // than throwing — a scenario that resolved with an odd state
  // shouldn't kill the render.
  if (!choice || !difficulty) {
    return 'Kvällen gick vidare — vi tittar på hur den utvecklade sig nästa gång.';
  }
  const spec = scenarioId ? scenarioById(scenarioId) : null;
  if (spec) {
    return spec.choices[choice].mentor[difficulty];
  }
  // Fallback: legacy walk-in-of-five strings for pre-refactor tests
  // that trigger a scenario without a scenarioId.
  const rank = difficulty === 1 ? 'low' : difficulty === 2 ? 'mid' : 'high';
  const key = `${choice}_${rank}` as keyof typeof strings.scenario.mentor;
  return strings.scenario.mentor[key];
}
