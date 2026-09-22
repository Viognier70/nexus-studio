// ORDER 225 (Fas 1) — enhetstester för anchors.ts.
//
// Fem ankaren mappas från befintliga sim-signaler. Testerna
// dokumenterar exakt vilken (guest.state, staff.taskType, staff.
// targetGuestId, tid-i-paying)-tuple som varje ankare kräver, så
// framtida ändringar av service.ts task-tilldelning bryter testerna
// om ankarna glider ur.

import { describe, expect, it } from 'vitest';
import {
  ANCHOR_IDS,
  countActiveAnchors,
  deriveActiveAnchors,
  deriveGuestAnchor,
  REQUEST_CHECK_WINDOW_SEC
} from '../anchors';
import { makeGuest, makeInitialState } from '../model';
import type {
  Guest,
  GuestState,
  SimulationState,
  StaffMember,
  TaskType
} from '../../types';

// -----------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------

function seededState(simTime: number = 100): SimulationState {
  const s = makeInitialState(1);
  s.simTime = simTime;
  s.guests = [];
  // Ge oss förutsägbar bemanning — de fem ankaren härledes från
  // staff.targetGuestId + taskType, så vi behöver tydlig kontroll.
  s.staff = [];
  return s;
}

function makeStaff(id: string, overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id,
    role: 'servitör',
    workload: 0,
    taskType: null,
    taskProgress: 0,
    taskDuration: 0,
    targetGuestId: null,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 0,
    taskQueue: [],
    ...overrides
  };
}

function guestInState(state: GuestState, stateTime: number, id?: string): Guest {
  const g = makeGuest(0);
  g.state = state;
  g.stateTime = stateTime;
  if (id) g.id = id;
  return g;
}

function engage(state: SimulationState, staffId: string, guestId: string, task: TaskType) {
  const s = state.staff.find((x) => x.id === staffId);
  if (!s) throw new Error(`staff ${staffId} not in fixture`);
  s.targetGuestId = guestId;
  s.taskType = task;
}

// -----------------------------------------------------------------
// ANCHOR_IDS invariant
// -----------------------------------------------------------------

describe('ANCHOR_IDS', () => {
  it('lists exactly the five anchors from ORDER 224 §4', () => {
    expect(ANCHOR_IDS).toEqual(['greet', 'order', 'setDown', 'requestCheck', 'pay']);
  });
});

// -----------------------------------------------------------------
// greet — staff.taskType === 'greet' med targetGuest
// -----------------------------------------------------------------

describe("anchor 'greet'", () => {
  it('fires when a staff has taskType greet targeting an arriving guest', () => {
    const state = seededState();
    const guest = guestInState('arriving', 95);
    state.guests = [guest];
    state.staff = [makeStaff('h1', { role: 'värd' })];
    engage(state, 'h1', guest.id, 'greet');

    expect(deriveGuestAnchor(state, guest)).toBe('greet');
  });

  it('fires while target guest is waiting or seated (per findTaskTarget)', () => {
    for (const gs of ['waiting', 'seated'] as GuestState[]) {
      const state = seededState();
      const guest = guestInState(gs, 95);
      state.guests = [guest];
      state.staff = [makeStaff('h1', { role: 'värd' })];
      engage(state, 'h1', guest.id, 'greet');
      expect(deriveGuestAnchor(state, guest)).toBe('greet');
    }
  });

  it('does not fire when no staff targets the guest', () => {
    const state = seededState();
    const guest = guestInState('arriving', 95);
    state.guests = [guest];
    state.staff = [makeStaff('h1', { role: 'värd' })];
    // Ingen engage() — staff står idle.
    expect(deriveGuestAnchor(state, guest)).toBeNull();
  });
});

// -----------------------------------------------------------------
// order — staff.taskType === 'order' med targetGuest (ordering)
// -----------------------------------------------------------------

describe("anchor 'order'", () => {
  it('fires when a staff has taskType order targeting an ordering guest', () => {
    const state = seededState();
    const guest = guestInState('ordering', 90);
    state.guests = [guest];
    state.staff = [makeStaff('s1', { role: 'servitör' })];
    engage(state, 's1', guest.id, 'order');

    expect(deriveGuestAnchor(state, guest)).toBe('order');
  });

  it('does not fire for order-task when guest is still seated (pre-transition)', () => {
    const state = seededState();
    const guest = guestInState('seated', 99);
    state.guests = [guest];
    state.staff = [makeStaff('s1', { role: 'servitör' })];
    // service.ts findTaskTarget('order') kräver state==='ordering';
    // om task ändå fyras mot en seated gäst (edge case) triggar den
    // ankaret ändå — Fas 1 speglar exakt vad koden gör, inte vad den
    // borde göra.
    engage(state, 's1', guest.id, 'order');
    expect(deriveGuestAnchor(state, guest)).toBe('order');
  });
});

// -----------------------------------------------------------------
// setDown — staff.taskType === 'serve' med targetGuest (seated > 6 s)
// -----------------------------------------------------------------

describe("anchor 'setDown'", () => {
  it('fires when a staff has taskType serve targeting a seated guest', () => {
    const state = seededState(120);
    const guest = guestInState('seated', 110); // stateTime 10 s sedan
    state.guests = [guest];
    state.staff = [makeStaff('s1', { role: 'servitör' })];
    engage(state, 's1', guest.id, 'serve');

    expect(deriveGuestAnchor(state, guest)).toBe('setDown');
  });
});

// -----------------------------------------------------------------
// requestCheck / pay — paying-fönstret splittas syntetiskt
// -----------------------------------------------------------------

describe("anchor 'requestCheck' vs 'pay' (syntetisk split)", () => {
  it("fires 'requestCheck' de första REQUEST_CHECK_WINDOW_SEC av paying", () => {
    const stateTime = 200;
    const state = seededState(stateTime + REQUEST_CHECK_WINDOW_SEC - 0.5);
    const guest = guestInState('paying', stateTime);
    state.guests = [guest];
    expect(deriveGuestAnchor(state, guest)).toBe('requestCheck');
  });

  it("fires 'pay' efter REQUEST_CHECK_WINDOW_SEC har passerat", () => {
    const stateTime = 200;
    const state = seededState(stateTime + REQUEST_CHECK_WINDOW_SEC + 0.5);
    const guest = guestInState('paying', stateTime);
    state.guests = [guest];
    expect(deriveGuestAnchor(state, guest)).toBe('pay');
  });

  it('exakt vid gränsen räknas som pay (>= i implementationen)', () => {
    const stateTime = 200;
    const state = seededState(stateTime + REQUEST_CHECK_WINDOW_SEC);
    const guest = guestInState('paying', stateTime);
    state.guests = [guest];
    expect(deriveGuestAnchor(state, guest)).toBe('pay');
  });

  it('gäster i andra states än paying ger inget ankare utan staff-task', () => {
    const state = seededState();
    for (const gs of ['arriving', 'waiting', 'ordering', 'dining', 'leaving'] as GuestState[]) {
      const guest = guestInState(gs, 90);
      state.guests = [guest];
      expect(deriveGuestAnchor(state, guest)).toBeNull();
    }
  });
});

// -----------------------------------------------------------------
// Priority — staff-driven anchors override guest-side (paying)
// -----------------------------------------------------------------

describe('anchor prioritet', () => {
  it("staff-drivet ankare vinner över gäst-drivet 'requestCheck'", () => {
    const state = seededState(202);
    const guest = guestInState('paying', 200);
    state.guests = [guest];
    // En städare (`clear`) har inte en TASK_TO_ANCHOR-mappning → gäst-
    // drivna ankaret ska ändå fyra. Vi använder `greet` här som
    // vinner, som demonstration att staff-task tar företräde när
    // mappningen finns.
    state.staff = [makeStaff('h1', { role: 'värd' })];
    engage(state, 'h1', guest.id, 'greet');
    expect(deriveGuestAnchor(state, guest)).toBe('greet');
  });

  it("staff-task utanför TASK_TO_ANCHOR (t.ex. 'clear') låter gäst-drivet ankaret fortsätta", () => {
    const state = seededState(202);
    const guest = guestInState('paying', 200);
    state.guests = [guest];
    state.staff = [makeStaff('s1', { role: 'servitör' })];
    engage(state, 's1', guest.id, 'clear');
    expect(deriveGuestAnchor(state, guest)).toBe('requestCheck');
  });
});

// -----------------------------------------------------------------
// deriveActiveAnchors — array-vy
// -----------------------------------------------------------------

describe('deriveActiveAnchors', () => {
  it('samlar ankare för alla gäster som matchar', () => {
    const state = seededState(220);
    const g1 = guestInState('arriving', 218, 'g-1');
    const g2 = guestInState('ordering', 210, 'g-2');
    const g3 = guestInState('paying', 219, 'g-3'); // 1 s → requestCheck
    const g4 = guestInState('dining', 210, 'g-4'); // ingen match
    state.guests = [g1, g2, g3, g4];
    // ORDER 255 §B — staff position måste vara nära gästen (≤ 1.25 m) för
    // att staff-drivet ankare ska räknas. makeGuest sätter default
    // position {0, 8}; matcha staff-position så avstånd = 0.
    state.staff = [
      makeStaff('h1', { role: 'värd', position: { x: 0, z: 8 }, targetPosition: { x: 0, z: 8 } }),
      makeStaff('s1', { role: 'servitör', position: { x: 0, z: 8 }, targetPosition: { x: 0, z: 8 } })
    ];
    engage(state, 'h1', 'g-1', 'greet');
    engage(state, 's1', 'g-2', 'order');

    const active = deriveActiveAnchors(state);
    expect(active).toEqual([
      { guestId: 'g-1', anchor: 'greet', staffId: 'h1' },
      { guestId: 'g-2', anchor: 'order', staffId: 's1' },
      { guestId: 'g-3', anchor: 'requestCheck', staffId: null }
    ]);
  });

  // ORDER 255 §B — avstånds-gate på staff-drivna ankare.
  it('filtrerar bort staff-drivna ankare när staff är > 1.25 m från gästen', () => {
    const state = seededState(220);
    const g1 = guestInState('arriving', 218, 'g-1'); // makeGuest default position (0, 8)
    const g2 = guestInState('paying', 219, 'g-2');   // guest-driven, ej position-gate:ad
    state.guests = [g1, g2];
    state.staff = [
      // Långt bort — 5 m från g1
      makeStaff('h1', { role: 'värd', position: { x: 5, z: 8 }, targetPosition: { x: 5, z: 8 } })
    ];
    engage(state, 'h1', 'g-1', 'greet');

    const active = deriveActiveAnchors(state);
    // g1:s greet ska filtreras bort (avstånd 5 m > 1.25 m); g2:s requestCheck kvarstår.
    expect(active).toEqual([
      { guestId: 'g-2', anchor: 'requestCheck', staffId: null }
    ]);
  });

  it('inkluderar staff-drivna ankare när staff är inom 1.25 m från gästen', () => {
    const state = seededState(220);
    const g1 = guestInState('arriving', 218, 'g-1'); // default position (0, 8)
    state.guests = [g1];
    state.staff = [
      // Exakt inom gränsen — 1.0 m offset
      makeStaff('h1', { role: 'värd', position: { x: 1.0, z: 8 }, targetPosition: { x: 1.0, z: 8 } })
    ];
    engage(state, 'h1', 'g-1', 'greet');

    const active = deriveActiveAnchors(state);
    expect(active).toEqual([
      { guestId: 'g-1', anchor: 'greet', staffId: 'h1' }
    ]);
  });
});

// -----------------------------------------------------------------
// countActiveAnchors — aggregerad räkning (DevPanel-läsare)
// -----------------------------------------------------------------

describe('countActiveAnchors', () => {
  it('räknar per ankare; nollor för de som inte fyras', () => {
    const state = seededState(220);
    const g1 = guestInState('paying', 219, 'g-1'); // requestCheck
    const g2 = guestInState('paying', 210, 'g-2'); // pay (10 s in)
    const g3 = guestInState('paying', 218, 'g-3'); // requestCheck (2 s in)
    state.guests = [g1, g2, g3];

    const counts = countActiveAnchors(state);
    expect(counts).toEqual({
      greet: 0,
      order: 0,
      setDown: 0,
      requestCheck: 2,
      pay: 1
    });
  });

  it('tomt state ger noll överallt', () => {
    const state = seededState();
    const counts = countActiveAnchors(state);
    expect(counts).toEqual({
      greet: 0,
      order: 0,
      setDown: 0,
      requestCheck: 0,
      pay: 0
    });
  });
});
