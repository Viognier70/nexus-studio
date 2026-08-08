import { TOTAL_SEATS } from '../business/interiorLayout';
import { INTERIOR, RESIDENT_SPLINES } from '../content/layout';
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
      economic: INITIAL_CAPITAL_VALUE,
      social: INITIAL_CAPITAL_VALUE,
      ecological: INITIAL_CAPITAL_VALUE
    },
    wagerHistory: [],
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
    collapseAxis: null
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
    speed: 1,
    policies,
    staff,
    guests: [],
    completedGuests: 0,
    waitingIds: [],
    seatedIds: [],
    revenue: 0,
    cost: 0,
    waste: 0,
    reputation: 0.6,
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
    wager: null,
    consequenceEvents: [],
    eventStream: [],
    pendingOutcomes: [],
    team: initialTeam(),
    agencyOffer: null,
    village: { residents: seedResidents(28) },
    district: { pedestrians: seedPedestrians(14) },
    delivery: initialDelivery(),
    events: []
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
