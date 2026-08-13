// ORDER 086 §6 step 1 — deriveActions unit tests.
//
// One assertion per derivation-table row (15 staff + 15 guest) plus
// exhaustiveness across GuestState. Tick-idempotence property test.

import { describe, expect, it } from 'vitest';
import {
  derivePhase,
  deriveGuestAction,
  deriveStaffAction,
  guestAttentionPriority,
  staffAttentionPriority,
  WAIT_HAIL_SEC,
  WAIT_IMPATIENT_SEC
} from '../deriveActions';
import type {
  DayState,
  Guest,
  GuestState,
  MenuEntry,
  StaffMember,
  StaffRole,
  TaskType
} from '../../../types';
import { initialDay } from '../../../simulation/model';

// -------- fixtures ------------------------------------------------------

function makeDay(overrides: Partial<DayState> = {}): DayState {
  return { ...initialDay(), period: 'dinner', ...overrides };
}

function makeStaff(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 's1',
    role: 'kock',
    workload: 0.3,
    taskType: null,
    taskProgress: 0,
    taskDuration: 0,
    targetGuestId: null,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 0,
    ...overrides
  };
}

function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'g1',
    state: 'waiting',
    satisfaction: 0.6,
    seatIndex: 3,
    arrivalTime: 0,
    stateTime: 0,
    scenarioSource: false,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 0,
    hadWelcomeDrink: false,
    walkAwayOnArrival: false,
    ...overrides
  };
}

const NO_MENU: readonly MenuEntry[] = [];

// -------- derivePhase ---------------------------------------------------

describe('derivePhase', () => {
  it('morning → morning', () => {
    expect(derivePhase(makeDay({ period: 'morning' }), 100)).toBe('morning');
  });
  it('afternoon → afternoon', () => {
    expect(derivePhase(makeDay({ period: 'afternoon' }), 100)).toBe('afternoon');
  });
  it('evening → evening', () => {
    expect(derivePhase(makeDay({ period: 'evening' }), 100)).toBe('evening');
  });
  it('dinner + openingEndsAt in future → opening', () => {
    expect(derivePhase(makeDay({ period: 'dinner', openingEndsAt: 200 }), 100)).toBe('opening');
  });
  it('dinner + prepEndsAt in future → prep', () => {
    expect(derivePhase(makeDay({ period: 'dinner', prepEndsAt: 200 }), 100)).toBe('prep');
  });
  it('dinner + prep expired → service', () => {
    expect(derivePhase(makeDay({ period: 'dinner', prepEndsAt: 50 }), 100)).toBe('service');
  });
});

// -------- deriveStaffAction: 15 rows -----------------------------------

describe('deriveStaffAction — every table row', () => {
  it('S1 morning → Preparing today\'s plan / plan', () => {
    const r = deriveStaffAction(makeStaff(), [], makeDay({ period: 'morning' }), 10, NO_MENU);
    expect(r).toEqual({ text: "Preparing today's plan", iconKey: 'plan' });
  });
  it('S1 opening phase → Preparing today\'s plan / plan', () => {
    const r = deriveStaffAction(
      makeStaff(), [],
      makeDay({ period: 'dinner', openingEndsAt: 200 }),
      100, NO_MENU
    );
    expect(r.iconKey).toBe('plan');
  });
  it('S2 prep + idle → On break / pause', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: null }), [],
      makeDay({ period: 'dinner', prepEndsAt: 200, prepReadiness: { ice: 1, napkins: 1, cutlery: 1, stations: 1, garnish: 1 } }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'On break', iconKey: 'pause' });
  });
  it('S3 prep + weakest item < 0.5 → Chasing X / chase', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: 'greet' }), [],
      makeDay({
        period: 'dinner', prepEndsAt: 200,
        prepReadiness: { ice: 0.9, napkins: 0.9, cutlery: 0.3, stations: 0.9, garnish: 0.9 }
      }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Chasing cutlery', iconKey: 'chase' });
  });
  it('S4 prep fallback → Mise en place — <role item> / prep', () => {
    const r = deriveStaffAction(
      makeStaff({ role: 'kock', taskType: 'greet' }), [],
      makeDay({
        period: 'dinner', prepEndsAt: 200,
        prepReadiness: { ice: 1, napkins: 1, cutlery: 1, stations: 1, garnish: 1 }
      }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Mise en place — stations', iconKey: 'prep' });
  });
  it('S5 greet → Greeting seat N / hail-response', () => {
    const guest = makeGuest({ id: 'g1', seatIndex: 3 });
    const r = deriveStaffAction(
      makeStaff({ taskType: 'greet', targetGuestId: 'g1' }),
      [guest],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Greeting seat 4', iconKey: 'hail-response' });
  });
  it('S6 seat', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: 'seat', targetGuestId: null }), [],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Seating a guest', iconKey: 'seat' });
  });
  it('S7 order', () => {
    const g = makeGuest({ id: 'g1', seatIndex: 1 });
    const r = deriveStaffAction(
      makeStaff({ taskType: 'order', targetGuestId: 'g1' }),
      [g],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Taking order at seat 2', iconKey: 'order' });
  });
  it('S8 welcomeDrink', () => {
    const g = makeGuest({ id: 'g1', seatIndex: 4 });
    const r = deriveStaffAction(
      makeStaff({ taskType: 'welcomeDrink', targetGuestId: 'g1' }),
      [g],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Pouring welcome drink for seat 5', iconKey: 'drink' });
  });
  it('S9 serve — dish name falls back to plate per ORDER 086 §5', () => {
    const g = makeGuest({ id: 'g1', seatIndex: 0 });
    const r = deriveStaffAction(
      makeStaff({ taskType: 'serve', targetGuestId: 'g1' }),
      [g],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Serving plate to seat 1', iconKey: 'serve' });
  });
  it('S10 decant', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: 'decant' }), [],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r.iconKey).toBe('decant');
  });
  it('S11 flambe', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: 'flambe' }), [],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r.iconKey).toBe('flambe');
  });
  it('S12 clear', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: 'clear' }), [],
      makeDay({ period: 'dinner' }),
      100, NO_MENU
    );
    expect(r.iconKey).toBe('clear');
  });
  it('S13 service + idle + red rhythm → standby-strain', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: null }), [],
      makeDay({ period: 'dinner', doorsOpenedThisService: true, serviceRhythm: 'red' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Standing by — room chasing itself', iconKey: 'standby-strain' });
  });
  it('S14 service + idle → standby', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: null }), [],
      makeDay({ period: 'dinner', doorsOpenedThisService: true, serviceRhythm: 'green' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Standing by', iconKey: 'standby' });
  });
  it('S15 evening → Closing down', () => {
    const r = deriveStaffAction(
      makeStaff({ taskType: null }), [],
      makeDay({ period: 'evening' }),
      100, NO_MENU
    );
    expect(r).toEqual({ text: 'Closing down', iconKey: 'close' });
  });
});

// -------- deriveGuestAction: 15 rows -----------------------------------

describe('deriveGuestAction — every table row', () => {
  it('G1 walkAwayOnArrival + leaving → turned away at the door', () => {
    const g = makeGuest({ walkAwayOnArrival: true, state: 'leaving' });
    expect(deriveGuestAction(g, 10, NO_MENU)).toEqual(
      { text: 'Turned away at the door', iconKey: 'walk-away' }
    );
  });
  it('G2 arriving → Arriving / arriving', () => {
    const g = makeGuest({ state: 'arriving' });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('arriving');
  });
  it('G3 waiting < impatient threshold → waiting', () => {
    const g = makeGuest({ state: 'waiting', stateTime: 0 });
    expect(deriveGuestAction(g, WAIT_IMPATIENT_SEC - 1, NO_MENU).iconKey).toBe('waiting');
  });
  it('G4 waiting ≥ impatient < hail → waiting-impatient with formatted time', () => {
    const g = makeGuest({ state: 'waiting', stateTime: 0 });
    const r = deriveGuestAction(g, WAIT_IMPATIENT_SEC + 10, NO_MENU);
    expect(r.iconKey).toBe('waiting-impatient');
    expect(r.text).toContain('40 s');
  });
  it('G5 waiting ≥ hail → hail', () => {
    const g = makeGuest({ state: 'waiting', stateTime: 0 });
    expect(deriveGuestAction(g, WAIT_HAIL_SEC + 5, NO_MENU).iconKey).toBe('hail');
  });
  it('G6 seated no welcome drink → seated', () => {
    const g = makeGuest({ state: 'seated', hadWelcomeDrink: false });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('seated');
  });
  it('G7 seated + welcome drink → drink', () => {
    const g = makeGuest({ state: 'seated', hadWelcomeDrink: true });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('drink');
  });
  it('G8 ordering < impatient → read-menu', () => {
    const g = makeGuest({ state: 'ordering', stateTime: 0 });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('read-menu');
  });
  it('G9 ordering ≥ impatient → ready-to-order', () => {
    const g = makeGuest({ state: 'ordering', stateTime: 0 });
    expect(deriveGuestAction(g, WAIT_IMPATIENT_SEC + 5, NO_MENU).iconKey).toBe('ready-to-order');
  });
  it('G10 dining + satisfied → eat-good', () => {
    const g = makeGuest({ state: 'dining', satisfaction: 0.9 });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('eat-good');
  });
  it('G11 dining + neutral → eat-neutral', () => {
    const g = makeGuest({ state: 'dining', satisfaction: 0.5 });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('eat-neutral');
  });
  it('G12 paying + satisfied → pay-good', () => {
    const g = makeGuest({ state: 'paying', satisfaction: 0.9 });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('pay-good');
  });
  it('G13 paying + neutral → pay-neutral', () => {
    const g = makeGuest({ state: 'paying', satisfaction: 0.5 });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('pay-neutral');
  });
  it('G14 leaving (not walk-away) → exit', () => {
    const g = makeGuest({ state: 'leaving', walkAwayOnArrival: false });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('exit');
  });
  it('G15 declined → declined', () => {
    const g = makeGuest({ state: 'declined' });
    expect(deriveGuestAction(g, 10, NO_MENU).iconKey).toBe('declined');
  });
});

// -------- exhaustiveness ------------------------------------------------

describe('exhaustiveness — every GuestState reaches a real row', () => {
  const ALL_STATES: GuestState[] = [
    'arriving', 'waiting', 'seated', 'ordering', 'dining', 'paying', 'leaving', 'declined'
  ];
  for (const state of ALL_STATES) {
    it(`GuestState ${state} produces a non-empty label + iconKey`, () => {
      const g = makeGuest({ state, stateTime: 0 });
      const r = deriveGuestAction(g, 10, NO_MENU);
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.iconKey.length).toBeGreaterThan(0);
    });
  }

  const ALL_TASKS: (TaskType | null)[] = [
    'greet', 'seat', 'order', 'serve', 'decant', 'flambe', 'clear', 'welcomeDrink', null
  ];
  for (const task of ALL_TASKS) {
    it(`TaskType ${task ?? 'null'} produces a non-empty label + iconKey during service`, () => {
      const r = deriveStaffAction(
        makeStaff({ taskType: task }), [],
        makeDay({ period: 'dinner', doorsOpenedThisService: true, serviceRhythm: 'green' }),
        100, NO_MENU
      );
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.iconKey.length).toBeGreaterThan(0);
    });
  }

  const ALL_ROLES: StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];
  for (const role of ALL_ROLES) {
    it(`StaffRole ${role} has a prep-item mapping during prep fallback`, () => {
      const r = deriveStaffAction(
        makeStaff({ role, taskType: 'greet' }), [],
        makeDay({
          period: 'dinner', prepEndsAt: 200,
          prepReadiness: { ice: 1, napkins: 1, cutlery: 1, stations: 1, garnish: 1 }
        }),
        100, NO_MENU
      );
      expect(r.iconKey).toBe('prep');
      expect(r.text.startsWith('Mise en place — ')).toBe(true);
    });
  }
});

// -------- tick-idempotence ---------------------------------------------

describe('tick-idempotence', () => {
  it('two consecutive calls with same input return equal output', () => {
    const g = makeGuest({ state: 'waiting', stateTime: 0 });
    const a = deriveGuestAction(g, 20, NO_MENU);
    const b = deriveGuestAction(g, 20, NO_MENU);
    expect(a).toEqual(b);
  });
  it('staff action stable across identical calls', () => {
    const staff = makeStaff({ taskType: 'serve', targetGuestId: 'g1' });
    const guests = [makeGuest({ id: 'g1', seatIndex: 2 })];
    const day = makeDay({ period: 'dinner', doorsOpenedThisService: true });
    const a = deriveStaffAction(staff, guests, day, 100, NO_MENU);
    const b = deriveStaffAction(staff, guests, day, 100, NO_MENU);
    expect(a).toEqual(b);
  });
});

// -------- attention priority --------------------------------------------

describe('guestAttentionPriority', () => {
  it('hailing guest ranks above impatient ranks above waiting', () => {
    const hail = makeGuest({ state: 'waiting', stateTime: 0 });
    const impatient = makeGuest({ state: 'waiting', stateTime: 0 });
    const fresh = makeGuest({ state: 'waiting', stateTime: 0 });
    const t = WAIT_HAIL_SEC + 5;
    const pHail = guestAttentionPriority(hail, t);
    const pImpatient = guestAttentionPriority(impatient, WAIT_IMPATIENT_SEC + 5);
    const pFresh = guestAttentionPriority(fresh, 5);
    expect(pHail).toBeGreaterThan(pImpatient);
    expect(pImpatient).toBeGreaterThan(pFresh);
  });
  it('dissatisfied diner ranks above content diner', () => {
    const unhappy = makeGuest({ state: 'dining', satisfaction: 0.2 });
    const happy = makeGuest({ state: 'dining', satisfaction: 0.9 });
    expect(guestAttentionPriority(unhappy, 10)).toBeGreaterThan(
      guestAttentionPriority(happy, 10)
    );
  });
});

describe('staffAttentionPriority', () => {
  it('service + red rhythm + high load ranks above idle service staff', () => {
    const heavy = makeStaff({ workload: 0.8 });
    const idle = makeStaff({ workload: 0.2 });
    const day = makeDay({ period: 'dinner', doorsOpenedThisService: true, serviceRhythm: 'red' });
    expect(staffAttentionPriority(heavy, day, 100)).toBeGreaterThan(
      staffAttentionPriority(idle, day, 100)
    );
  });
});
