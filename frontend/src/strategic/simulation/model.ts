import { TOTAL_SEATS } from '../business/interiorLayout';
import { INTERIOR, RESIDENT_SPLINES } from '../content/layout';
import type {
  DeliveryVehicle,
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

export function makeGuest(simTime: number, scenario = false): Guest {
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
    hadWelcomeDrink: false
  };
}
