import { TOTAL_SEATS } from '../business/interiorLayout';
import { INTERIOR, RESIDENT_SPLINES } from '../content/layout';
import { INITIAL_CASH_SEK } from './constants';
import { MORALE_INITIAL } from './morale';
import { initialTeam } from './team';
import type {
  CapitalState,
  DayState,
  DeliveryVehicle,
  EnablerKey,
  EnablerRecord,
  Guest,
  Pedestrian,
  Policies,
  Resident,
  ScenarioState,
  SimulationState,
  StaffMember,
  StaffRole
} from '../types';

export const DEFAULT_SEED = 20260719;

// capacity derives from the interior layout's TOTAL_SEATS rather than
// being restated here.  Per APPROXIMATION_REGISTER 2026-08-08 §5 (the
// three-way capacity drift) and §6 (AABB-vs-OBB), the reducer's number
// and the visual layer's seat count must have a single source; this
// import is that source.
export const DEFAULT_POLICIES: Policies = {
  staffCount: 3,
  trainingLevel: 2,
  service: 'vardaglig',
  pricing: 'medel',
  capacity: TOTAL_SEATS,
  ingredientTier: 'utvald',
  welcomeDrink: false,
  localSourcing: true
};

const STAFF_ROLE_ORDER: StaffRole[] = ['värd', 'servitör', 'kock', 'servitör'];

export function makeStaff(count: 2 | 3 | 4): StaffMember[] {
  const staff: StaffMember[] = [];
  for (let i = 0; i < count; i++) {
    const role = STAFF_ROLE_ORDER[i];
    const home = INTERIOR.staffHomes[role];
    staff.push({
      id: `staff-${i}`,
      role,
      workload: 0,
      taskType: null,
      taskProgress: 0,
      taskDuration: 0,
      targetGuestId: null,
      position: { ...home },
      targetPosition: { ...home },
      moveProgress: 1
    });
  }
  return staff;
}

const PEDESTRIAN_ROLES: Pedestrian['role'][] = [
  'boende',
  'student',
  'besökare',
  'gäst',
  'leverantör'
];
const PEDESTRIAN_DESTS: Pedestrian['destination'][] = [
  'vinbar',
  'café',
  'bageri',
  'hotell',
  'campus'
];

export function seedResidents(count: number): Resident[] {
  const list: Resident[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: `res-${i}`,
      splineId: i % RESIDENT_SPLINES.length,
      progress: (i / count) % 1,
      speed: 0.02 + (i % 5) * 0.006
    });
  }
  return list;
}

export function seedPedestrians(count: number): Pedestrian[] {
  const list: Pedestrian[] = [];
  for (let i = 0; i < count; i++) {
    const role = PEDESTRIAN_ROLES[i % PEDESTRIAN_ROLES.length];
    const dest = PEDESTRIAN_DESTS[i % PEDESTRIAN_DESTS.length];
    list.push({
      id: `ped-${i}`,
      role,
      intent: '',
      destination: dest,
      splineId: i % RESIDENT_SPLINES.length,
      progress: (i * 0.11) % 1,
      speed: 0.03 + (i % 4) * 0.008
    });
  }
  return list;
}

export function initialDelivery(): DeliveryVehicle {
  return {
    id: 'delivery-01',
    progress: 0,
    active: false,
    cooldown: 60
  };
}

// ORDER 043 outcome-layer defaults (§3.1). Starting values are neutral-
// positive so the room reads as "working" at first contact rather than
// as an emergency; wager+scenario deltas nudge them from there.
export const INITIAL_CAPITAL_VALUE = 0.55;

export function initialCapitals(): CapitalState {
  return {
    values: {
      social: INITIAL_CAPITAL_VALUE,
      ecological: INITIAL_CAPITAL_VALUE
    },
    themeHistory: []
  };
}

// ORDER 043 enabler-layer defaults (§3.2). Both enablers start at zero
// — a first-time player has demonstrated nothing yet. Growth comes
// only from behavioural evidence written by scenario responses.
export function initialEnablerRecord(): EnablerRecord {
  return {
    episteme: 0,
    techne: 0,
    phronesis: 0,
    history: []
  };
}

export function initialEnablers(): Record<EnablerKey, EnablerRecord> {
  return {
    scientific: initialEnablerRecord(),
    cultural: initialEnablerRecord()
  };
}

// ORDER 043 v3 §2 initial day state. Day 1 begins in the morning —
// business closed, player yet to open any service. simTime starts at
// 0 so periodStartAt = 0 for the initial morning.
export function initialDay(): DayState {
  return {
    dayNumber: 1,
    period: 'morning',
    periodStartAt: 0,
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
    reputationAtServiceStart: null,
    morningPolicyChanges: []
  };
}

export function initialScenario(): ScenarioState {
  return {
    hasAutoTriggered: false,
    active: false,
    phase: 'idle',
    difficulty: null,
    awaitingChoice: false,
    choice: null,
    choiceAt: null,
    spawnedRemaining: 0,
    nextSpawnAt: 0,
    visibleGuestIds: [],
    drawnTheme: null,
    scenarioId: null,
    senderRole: null,
    senderMemberId: null,
    pendingQuestion: null,
    mentorComment: null,
    mentorCommentAt: null
  };
}

export function makeInitialState(
  seed: number = DEFAULT_SEED,
  policies: Policies = DEFAULT_POLICIES
): SimulationState {
  const staff = makeStaff(policies.staffCount);
  return {
    seed,
    rngState: seed >>> 0,
    tick: 0,
    simTime: 0,
    // ORDER 047 §7 — default sim speed 2× so a full evening fits
    // in half the real time. Scenario overlays + evening-account
    // fade use wall-clock timing (below), so speed does not
    // shrink the player's reading window.
    speed: 2,
    policies,
    staff,
    guests: [],
    completedGuests: 0,
    waitingIds: [],
    seatedIds: [],
    revenue: 0,
    cost: 0,
    // ORDER 050 §3 (2026-08-10) — literal cash in kronor. Starts at
    // 120 kSEK (T2 grandfather; see loan below) so ~three weeks of
    // runway is on the till on day 1. Cash writes are paired with
    // revenue/cost writes at every mechanic so the invariant
    // `cash = INITIAL_CASH_SEK + revenue − cost + scenario deltas`
    // holds by construction.
    cash: INITIAL_CASH_SEK,
    waste: 0,
    reputation: 0.6,
    // Starts above the base ceiling (0.55) so day-1 shows a small
    // visible gap between "what the house is" (0.6) and "what the
    // house can be" (0.75). Ceiling recomputes each tick from
    // enablers; 0.75 is a benign starting point that lets the drift
    // system settle without forcing an immediate crash.
    reputationCeiling: 0.75,
    eco: {
      econ: {
        value: 0.55,
        direction: 'stabil',
        cause: null,
        consequence: null,
        lastChangeAt: 0
      },
      social: {
        value: 0.65,
        direction: 'stabil',
        cause: null,
        consequence: null,
        lastChangeAt: 0
      },
      ecolog: {
        value: 0.6,
        direction: 'stabil',
        cause: null,
        consequence: null,
        lastChangeAt: 0
      }
    },
    rolling: {
      revenue: [],
      satisfaction: [],
      workload: [],
      waste: []
    },
    scenario: initialScenario(),
    day: initialDay(),
    capitals: initialCapitals(),
    enablers: initialEnablers(),
    consequenceEvents: [],
    eventStream: [],
    pendingOutcomes: [],
    team: initialTeam(),
    agencyOffer: null,
    village: { residents: seedResidents(28) },
    district: { pedestrians: seedPedestrians(14) },
    delivery: initialDelivery(),
    events: [],
    eveningAccount: null,
    // ORDER 047 §2/§4/§5 — fresh morale + empty per-service tallies.
    morale: MORALE_INITIAL,
    streamThemeCounts: { economic: 0, social: 0, ecological: 0 },
    firedScenarioIds: [],
    lastServiceOpenerId: null,
    // ORDER 049 §5.2 — quality readings start at "godtagbar" (0.55),
    // rolling revenue empty (venture just opened), loan grandfathered
    // to a T2-shaped default until §5.1 bank meeting is built,
    // scale-down all off.
    qualityFood: 0.55,
    qualityDrink: 0.55,
    qualityService: 0.55,
    serviceRevenueToday: { lunch: 0, dinner: 0 },
    serviceRevenueRolling: { lunch: [], dinner: [] },
    loan: {
      principal: 2400,               // T2 ceiling grandfather until bank meeting lands
      interestRatePerDay: 0.00025,   // ~9 % APR baseline (post-bankruptcy raises this)
      lastAccrualDay: 1
    },
    scaleDown: {
      menuShortenedFrom: null,
      wineListReduced: false,
      closedLunch: false,
      closedDinner: false
    }
  };
}

let guestCounter = 0;
export function nextGuestId(scenario = false): string {
  guestCounter += 1;
  return `${scenario ? 'grp' : 'gst'}-${guestCounter}`;
}

export function makeGuest(
  simTime: number,
  scenario = false,
  walkAwayOnArrival = false
): Guest {
  return {
    id: nextGuestId(scenario),
    state: 'arriving',
    satisfaction: 0.72,
    seatIndex: null,
    arrivalTime: simTime,
    stateTime: simTime,
    scenarioSource: scenario,
    position: { x: 0, z: 8 },
    targetPosition: { x: INTERIOR.entrance.x, z: INTERIOR.entrance.z },
    moveProgress: 0,
    hadWelcomeDrink: false,
    walkAwayOnArrival
  };
}
