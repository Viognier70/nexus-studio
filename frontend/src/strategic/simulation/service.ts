import { INTERIOR } from '../content/layout';
import type { Guest, SimulationState, StaffMember, TaskType, Vec2 } from '../types';
import { taskDurationTicks } from './economics';

const TICK_SECONDS = 0.2;

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function copy(v: Vec2): Vec2 {
  return { x: v.x, z: v.z };
}

export function stepEntityMotion(entity: {
  position: Vec2;
  targetPosition: Vec2;
  moveProgress: number;
}) {
  if (entity.moveProgress >= 1) return;
  const distTotal = Math.max(distance(entity.targetPosition, entity.position), 0.001);
  const step = (TICK_SECONDS * 2.4) / distTotal;
  entity.moveProgress = Math.min(1, entity.moveProgress + step);
  entity.position.x = lerp1(entity.position.x, entity.targetPosition.x, step);
  entity.position.z = lerp1(entity.position.z, entity.targetPosition.z, step);
  if (
    distance(entity.position, entity.targetPosition) < 0.05 ||
    entity.moveProgress >= 1
  ) {
    entity.position = copy(entity.targetPosition);
    entity.moveProgress = 1;
  }
}

function lerp1(current: number, target: number, k: number): number {
  return current + (target - current) * Math.min(1, k);
}

export function isSeatedCapacity(state: SimulationState): number {
  return state.policies.capacity;
}

export function seatSlot(_state: SimulationState, index: number): Vec2 {
  return INTERIOR.seatOrder[index] ?? INTERIOR.seatOrder[0];
}

// Seat preferences per scenario response (ORDER 042 §3.3 walk-in-of-
// five). The visual room reads only when the party actually lands in
// the seats the response promises: choice A combines the 4-top with a
// 2-top; choice B fills the 4-top and puts the fifth at the bar. If a
// preferred seat is already taken (a regular got there first), the
// next preference is tried; only after the whole preference list is
// exhausted does the party fall back to the general seat sequence.
//
// Seat indices are the interiorLayout.ts flat seat order:
//   0–1   Table t0 (2-top)   ← left-most on the west row
//   2–3   Table t1 (2-top)
//   4–7   Table t2 (4-top)   ← centre
//   8–9   Table t3 (2-top)
//   10–11 Table t4 (2-top)   ← right-most
//   12–15 Bar stools
const SEATS_CHOICE_A = [4, 5, 6, 7, 8]; // 4-top + t3 seat 0 (party of 5 split 4+1)
const SEATS_CHOICE_B = [4, 5, 6, 7, 12]; // 4-top + first bar stool
// Regular arrivals + fallback: fill front-to-back leaving the 4-top
// alone so it stays available for future parties. Order puts the outer
// 2-tops first, then bar stools, then the 4-top (least preferred).
const SEATS_DEFAULT = [
  0, 1, 2, 3,      // t0, t1 (left-side 2-tops)
  8, 9, 10, 11,    // t3, t4 (right-side 2-tops)
  12, 13, 14, 15,  // bar stools
  4, 5, 6, 7       // 4-top (avoided unless nothing else free)
];

function scenarioPreferredSeats(state: SimulationState): number[] {
  if (state.scenario.choice === 'A') return SEATS_CHOICE_A;
  if (state.scenario.choice === 'B') return SEATS_CHOICE_B;
  return SEATS_DEFAULT;
}

function seatTaken(state: SimulationState, seat: number): boolean {
  return state.seatedIds.some((gid) => guestSeat(state, gid) === seat);
}

export function findFreeSeat(
  state: SimulationState,
  forScenarioGuest = false
): number | null {
  const cap = isSeatedCapacity(state);
  // Scenario guests walk the response-specific preference list first.
  // A regular arrival got seat 4 before the party arrived? Try seat 5
  // next, then 6, 7, 8; only after the preference list is exhausted
  // fall back to the general sequence.
  if (forScenarioGuest && state.scenario.choice) {
    for (const seat of scenarioPreferredSeats(state)) {
      if (seat < cap && !seatTaken(state, seat)) return seat;
    }
  }
  for (const seat of SEATS_DEFAULT) {
    if (seat < cap && !seatTaken(state, seat)) return seat;
  }
  return null;
}

function guestSeat(state: SimulationState, guestId: string): number | null {
  const g = state.guests.find((x) => x.id === guestId);
  return g?.seatIndex ?? null;
}

export function moveGuest(guest: Guest, target: Vec2) {
  guest.targetPosition = { ...target };
  guest.moveProgress = 0;
}

export function moveStaff(staff: StaffMember, target: Vec2) {
  staff.targetPosition = { ...target };
  staff.moveProgress = 0;
}

// -------------------------------------------------------------------------
// Guest state transitions driven by time and by staff task completion.
// -------------------------------------------------------------------------

export function tickGuests(state: SimulationState) {
  const now = state.simTime;
  for (const guest of state.guests) {
    stepEntityMotion(guest);

    if (guest.state === 'arriving') {
      if (guest.moveProgress >= 1) {
        // ORDER 043 §6 walk-away: guests whose economic-at-spawn said
        // "refuse entry" turn back without checking for a seat. Visible
        // reading: at low economic, more pucks approach the door and
        // walk out again — "guests leaving without sitting."
        if (guest.walkAwayOnArrival && !guest.scenarioSource) {
          guest.state = 'declined';
          guest.stateTime = now;
          moveGuest(guest, { x: 0, z: 8 });
          continue;
        }
        const seat = findFreeSeat(state, guest.scenarioSource);
        if (seat !== null && !state.scenario.awaitingChoice) {
          setGuestSeated(state, guest, seat);
        } else {
          // Queue at waiting spot.
          const idx = state.waitingIds.length;
          if (idx >= INTERIOR.waitingSpots.length) {
            // No waiting room — leave.
            guest.state = 'declined';
            guest.stateTime = now;
            moveGuest(guest, { x: 0, z: 8 });
          } else {
            state.waitingIds.push(guest.id);
            guest.state = 'waiting';
            guest.stateTime = now;
            moveGuest(guest, INTERIOR.waitingSpots[idx]);
          }
        }
      }
      continue;
    }

    if (guest.state === 'waiting') {
      // Satisfaction decreases while waiting.
      const drop = 0.02 * TICK_SECONDS;
      guest.satisfaction = Math.max(0, guest.satisfaction - drop);
      const seat = findFreeSeat(state, guest.scenarioSource);
      if (seat !== null) {
        state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
        setGuestSeated(state, guest, seat);
      } else if (now - guest.stateTime > 90 && guest.satisfaction < 0.2) {
        // Give up.
        guest.state = 'leaving';
        guest.stateTime = now;
        moveGuest(guest, { x: 0, z: 8 });
      }
      continue;
    }

    if (guest.state === 'seated' && now - guest.stateTime > 4) {
      guest.state = 'ordering';
      guest.stateTime = now;
      continue;
    }

    if (guest.state === 'dining' && now - guest.stateTime > diningDuration(state)) {
      guest.state = 'paying';
      guest.stateTime = now;
      continue;
    }

    if (guest.state === 'paying' && now - guest.stateTime > 8) {
      // Free the seat, count as completed.
      state.completedGuests += 1;
      state.seatedIds = state.seatedIds.filter((id) => id !== guest.id);
      guest.state = 'leaving';
      guest.stateTime = now;
      moveGuest(guest, { x: 0, z: 8 });
      continue;
    }

    if (guest.state === 'leaving' && guest.moveProgress >= 1) {
      guest.state = 'declined';
      guest.stateTime = now;
      continue;
    }

    if (guest.state === 'declined' && now - guest.stateTime > 3) {
      // Removal happens outside this loop.
    }
  }

  // Prune declined guests that have been off-screen long enough.
  state.guests = state.guests.filter(
    (g) => !(g.state === 'declined' && state.simTime - g.stateTime > 3)
  );
  // Refresh waiting list to match state.
  state.waitingIds = state.waitingIds.filter((id) => {
    const g = state.guests.find((x) => x.id === id);
    return g && g.state === 'waiting';
  });
  state.seatedIds = state.seatedIds.filter((id) => {
    const g = state.guests.find((x) => x.id === id);
    return g && ['seated', 'ordering', 'dining', 'paying'].includes(g.state);
  });
}

function setGuestSeated(state: SimulationState, guest: Guest, seat: number) {
  guest.state = 'seated';
  guest.seatIndex = seat;
  guest.stateTime = state.simTime;
  state.seatedIds.push(guest.id);
  moveGuest(guest, seatSlot(state, seat));
}

function diningDuration(state: SimulationState): number {
  return state.policies.service === 'formell' ? 55 : 34;
}

// -------------------------------------------------------------------------
// Staff task assignment. Priority reflects the service philosophy: greet and
// seat first, order and serve next, decant/flambé and clear last.
// -------------------------------------------------------------------------

const PRIORITY: TaskType[] = [
  'greet',
  'seat',
  'welcomeDrink',
  'order',
  'serve',
  'decant',
  'flambe',
  'clear'
];

export function tickStaff(state: SimulationState) {
  const now = state.simTime;
  for (const staff of state.staff) {
    stepEntityMotion(staff);

    if (staff.taskType) {
      staff.taskProgress += 1;
      if (staff.taskProgress >= staff.taskDuration) {
        completeStaffTask(state, staff);
      }
      continue;
    }

    // Look for the next task.
    for (const type of PRIORITY) {
      const targetGuestId = findTaskTarget(state, type);
      if (targetGuestId) {
        beginStaffTask(state, staff, type, targetGuestId);
        break;
      }
    }

    // Idle drift toward home if nothing to do.
    if (!staff.taskType) {
      const home = INTERIOR.staffHomes[staff.role];
      if (
        Math.abs(staff.position.x - home.x) > 0.1 ||
        Math.abs(staff.position.z - home.z) > 0.1
      ) {
        moveStaff(staff, home);
      }
    }

    // Workload decays when idle.
    staff.workload = Math.max(0, staff.workload - 0.03 * TICK_SECONDS);
  }

  // Recompute an average workload signal.
  for (const staff of state.staff) {
    if (staff.taskType) staff.workload = Math.min(1, staff.workload + 0.05 * TICK_SECONDS);
  }
  void now;
}

function findTaskTarget(state: SimulationState, type: TaskType): string | null {
  switch (type) {
    case 'greet':
    case 'seat': {
      const arriving = state.guests.find((g) => g.state === 'arriving' && g.moveProgress >= 1);
      return arriving?.id ?? null;
    }
    case 'welcomeDrink': {
      if (!state.policies.welcomeDrink) return null;
      const guest = state.guests.find(
        (g) => g.state === 'waiting' && !g.hadWelcomeDrink
      );
      return guest?.id ?? null;
    }
    case 'order': {
      const guest = state.guests.find((g) => g.state === 'ordering');
      return guest?.id ?? null;
    }
    case 'serve': {
      const guest = state.guests.find(
        (g) => g.state === 'seated' && state.simTime - g.stateTime > 6
      );
      return guest?.id ?? null;
    }
    case 'decant':
    case 'flambe': {
      if (state.policies.service !== 'formell') return null;
      const guest = state.guests.find(
        (g) => g.state === 'dining' && state.simTime - g.stateTime < 4
      );
      return guest?.id ?? null;
    }
    case 'clear': {
      const guest = state.guests.find((g) => g.state === 'leaving');
      return guest?.id ?? null;
    }
    default:
      return null;
  }
}

function beginStaffTask(
  state: SimulationState,
  staff: StaffMember,
  type: TaskType,
  targetGuestId: string
) {
  staff.taskType = type;
  staff.taskProgress = 0;
  staff.taskDuration = taskDurationTicks(
    state.policies,
    type,
    state.capitals.values.social
  );
  staff.targetGuestId = targetGuestId;
  const guest = state.guests.find((g) => g.id === targetGuestId);
  if (guest) {
    moveStaff(staff, guest.position);
  }
}

function completeStaffTask(state: SimulationState, staff: StaffMember) {
  const guest = staff.targetGuestId
    ? state.guests.find((g) => g.id === staff.targetGuestId)
    : null;
  const type = staff.taskType;
  staff.taskType = null;
  staff.taskProgress = 0;
  staff.taskDuration = 0;
  staff.targetGuestId = null;

  if (!guest) return;

  const now = state.simTime;
  switch (type) {
    case 'greet':
    case 'seat': {
      // A guest sitting in the waiting queue is served here too.
      if (guest.state === 'arriving' || guest.state === 'waiting') {
        const seat = findFreeSeat(state, guest.scenarioSource);
        if (seat !== null) {
          state.waitingIds = state.waitingIds.filter((id) => id !== guest.id);
          guest.state = 'seated';
          guest.seatIndex = seat;
          guest.stateTime = now;
          state.seatedIds.push(guest.id);
          moveGuest(guest, seatSlot(state, seat));
        }
      }
      break;
    }
    case 'welcomeDrink': {
      guest.hadWelcomeDrink = true;
      guest.satisfaction = Math.min(1, guest.satisfaction + 0.12);
      state.waste += 0.6;
      break;
    }
    case 'order': {
      if (guest.state === 'ordering') {
        guest.state = 'dining';
        guest.stateTime = now;
      }
      break;
    }
    case 'serve': {
      if (guest.state === 'seated') {
        guest.state = 'ordering';
        guest.stateTime = now;
      }
      guest.satisfaction = Math.min(1, guest.satisfaction + 0.08);
      break;
    }
    case 'decant':
    case 'flambe': {
      guest.satisfaction = Math.min(1, guest.satisfaction + 0.14);
      break;
    }
    case 'clear': {
      // Free the seat by removing the guest from seatedIds if still there.
      state.seatedIds = state.seatedIds.filter((id) => id !== guest.id);
      break;
    }
    default:
      break;
  }
}
