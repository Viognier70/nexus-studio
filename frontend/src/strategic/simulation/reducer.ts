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
  scheduleOutcomes,
  tickEventStream
} from './eventStream';
import { PREP_CARRYOVER_TEXT } from '../../content/eventStream.sv';
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
import { pickScenarioSpec, scenarioById } from './scenarios';
import { initialDay, makeGuest, makeInitialState, makeStaff } from './model';
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
  makeTeamMember,
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

// Party size for walk-in-of-five now lives on the scenario spec
// (scenarios.ts WALK_IN_OF_FIVE.choices.*.spawnedRemaining). Kept
// out of the reducer to keep authoring in one file.

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
    case 'HIRE_TEAM_MEMBER':
      return hireTeamMember(state, action.role);
    case 'FIRE_TEAM_MEMBER':
      return fireTeamMember(state, action.memberId);
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
    worldFactors
  };
  return {
    ...state,
    day,
    rngState: rng.state
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
      worldFactors: []
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
          scenarioTriggerTimes: [],
          openingEndsAt: null,
          prepEndsAt: null,
          prepIgnoranceCount: 0,
          prepFloorSchedule: [],
          weather: null,
          waitingAtOpening: 0,
          doorsOpenedThisService: false,
          worldFactors: []
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
          scenarioTriggerTimes: [],
          openingEndsAt: null,
          prepEndsAt: null,
          prepIgnoranceCount: 0,
          prepFloorSchedule: [],
          weather: null,
          waitingAtOpening: 0,
          doorsOpenedThisService: false,
          worldFactors: []
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
  const revenueMult = worldFactorRevenueMultiplier(draft.day.worldFactors);
  for (const guest of draft.guests) {
    if (guest.state === 'paying' && guest.stateTime === draft.simTime) {
      draft.revenue += revenuePerGuest(draft.policies) * revenueMult;
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
          text: PREP_CARRYOVER_TEXT,
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
  // Look up the scenario spec for the drawn theme. Cycle-1: one
  // spec per theme (see scenarios.ts SCENARIO_BY_THEME).
  const scenarioSpec = pickScenarioSpec(drawnTheme);
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
        text: auto
          ? scenarioSpec.subjectBody
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

  // ORDER 043 Addendum A outcome events — 1–2 hand-authored lines
  // from the spec's choice, fired at t+6 s and t+18 s to fill the
  // space between choice and mentor. Empty outcomes list = no
  // stream fill for this choice.
  const outcomeTheme = drawn ?? spec?.sustainability ?? 'social';
  const newOutcomes = choiceSpec
    ? scheduleOutcomes(
        choiceSpec.outcomes,
        state.simTime,
        outcomeTheme,
        spec?.id ?? 'unknown'
      )
    : [];

  return {
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
