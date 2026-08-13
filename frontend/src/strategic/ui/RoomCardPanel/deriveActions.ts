// ORDER 086 §6 step 1 — pure derivation of card action from state.
//
// Two functions, one shape { text, iconKey }, no side effects, no
// random, no Date.now. Every row of both tables traceable to the
// reel state that inspired it (grep audit under ORDER 085 §7).
//
// The staff table has 15 rows, the guest table has 15 rows. First
// matching row wins — this is a switch dressed as a table, not
// choreography. Reel names appear as `reel <NAME>` in comments beside
// the rows that mirror the reel's 8 pose states.

import type {
  DayPeriod,
  DayState,
  Guest,
  GuestState,
  MenuEntry,
  StaffMember,
  StaffRole,
  TaskType
} from '../../types';

export type StaffIconKey =
  | 'plan' | 'pause' | 'chase' | 'prep'
  | 'hail-response' | 'seat' | 'order' | 'drink'
  | 'serve' | 'decant' | 'flambe' | 'clear'
  | 'standby-strain' | 'standby' | 'close';

export type GuestIconKey =
  | 'walk-away' | 'arriving' | 'waiting' | 'waiting-impatient'
  | 'hail' | 'seated' | 'drink' | 'read-menu' | 'ready-to-order'
  | 'eat-good' | 'eat-neutral' | 'pay-good' | 'pay-neutral'
  | 'exit' | 'declined';

export interface StaffCardAction { text: string; iconKey: StaffIconKey }
export interface GuestCardAction { text: string; iconKey: GuestIconKey }

// -------- derived phase --------------------------------------------------
//
// `state.day.period` is coarse (`morning | lunch | afternoon | dinner |
// evening`). The finer inside-a-service phases (opening / prep /
// service) live in `openingEndsAt`, `prepEndsAt`, `doorsOpenedThisService`.
// This helper collapses the two into one logical phase so the derivation
// tables can switch on it directly.

export type LogicalPhase =
  | 'morning' | 'opening' | 'prep' | 'service' | 'afternoon' | 'evening';

export function derivePhase(day: DayState, simTime: number): LogicalPhase {
  const p: DayPeriod = day.period;
  if (p === 'morning') return 'morning';
  if (p === 'afternoon') return 'afternoon';
  if (p === 'evening') return 'evening';
  // Inside a service slot (lunch or dinner).
  if (day.openingEndsAt !== null && simTime < day.openingEndsAt) return 'opening';
  if (day.prepEndsAt !== null && simTime < day.prepEndsAt) return 'prep';
  return 'service';
}

// -------- shared helpers -------------------------------------------------

function seatLabel(seatIndex: number | null): string {
  return seatIndex === null ? 'the door' : `seat ${seatIndex + 1}`;
}

const PREP_ITEM_FOR_ROLE: Record<StaffRole, string> = {
  kock: 'stations',
  servitör: 'cutlery',
  värd: 'napkins',
  lärling: 'garnish'
};

function weakestPrepItem(readiness: Record<string, number>): string | null {
  const keys = Object.keys(readiness);
  if (keys.length === 0) return null;
  let min = Infinity, best: string | null = null;
  for (const k of keys) {
    if (readiness[k] < min) { min = readiness[k]; best = k; }
  }
  return best;
}

function guestForTarget(
  staff: StaffMember,
  guests: readonly Guest[]
): Guest | null {
  if (staff.targetGuestId === null) return null;
  return guests.find((g) => g.id === staff.targetGuestId) ?? null;
}

// Menu lookup for dish name; falls back to 'plate' per ORDER 086 §5.
// No `orderedDishId` field on Guest today, so this only names the dish
// when the staff's serve task carries a dish id via some future extension.
// Until then, the fallback stands.
function dishName(_menu: readonly MenuEntry[]): string {
  return 'plate';
}

// -------- staff action derivation ---------------------------------------
//
// 15 rows, first match wins. Comments cite the reel state where a row
// mirrors one. The order is deliberate — task-specific rules come
// before workload / rhythm fallbacks so a working staff member reads as
// the work, not the pressure.

export function deriveStaffAction(
  staff: StaffMember,
  guests: readonly Guest[],
  day: DayState,
  simTime: number,
  menu: readonly MenuEntry[]
): StaffCardAction {
  const phase = derivePhase(day, simTime);

  // S1 — morning + opening: pre-service, off-reel.
  if (phase === 'morning' || phase === 'opening') {
    return { text: "Preparing today's plan", iconKey: 'plan' };
  }

  // S2 — prep phase, idle staff: on break, off-reel.
  if (phase === 'prep' && staff.taskType === null) {
    return { text: 'On break', iconKey: 'pause' };
  }

  // S3 — prep phase, weakest item below 0.5: short-prep chase.
  // Feeds punch-list row 21 (short prep produces running-about).
  if (phase === 'prep') {
    const weakest = weakestPrepItem(day.prepReadiness);
    if (weakest !== null && day.prepReadiness[weakest] < 0.5) {
      return { text: `Chasing ${weakest}`, iconKey: 'chase' };
    }
    // S4 — prep phase fallback: mise en place per role.
    return {
      text: `Mise en place — ${PREP_ITEM_FOR_ROLE[staff.role]}`,
      iconKey: 'prep'
    };
  }

  // S5..S12 — task-specific during service.
  const target = guestForTarget(staff, guests);
  const targetLabel = target === null ? 'a guest' : seatLabel(target.seatIndex);

  switch (staff.taskType as TaskType | null) {
    case 'greet':
      // reel HAIL (staff response side)
      return { text: `Greeting ${targetLabel}`, iconKey: 'hail-response' };
    case 'seat':
      // reel SIT DOWN (staff shepherding)
      return { text: `Seating ${targetLabel}`, iconKey: 'seat' };
    case 'order':
      // reel READ MENU (staff taking the order)
      return { text: `Taking order at ${targetLabel}`, iconKey: 'order' };
    case 'welcomeDrink':
      return { text: `Pouring welcome drink for ${targetLabel}`, iconKey: 'drink' };
    case 'serve':
      // reel EAT (staff deliver side)
      return { text: `Serving ${dishName(menu)} to ${targetLabel}`, iconKey: 'serve' };
    case 'decant':
      return { text: `Decanting for ${targetLabel}`, iconKey: 'decant' };
    case 'flambe':
      return { text: `Flambéing at ${targetLabel}`, iconKey: 'flambe' };
    case 'clear':
      return { text: `Clearing ${targetLabel}`, iconKey: 'clear' };
    case null:
      break;
  }

  // S13 — service, idle staff, red rhythm: standing by under strain.
  if (phase === 'service' && day.serviceRhythm === 'red') {
    return { text: 'Standing by — room chasing itself', iconKey: 'standby-strain' };
  }
  // S14 — service, idle staff: standing by.
  if (phase === 'service') {
    return { text: 'Standing by', iconKey: 'standby' };
  }
  // S15 — evening/afternoon: closing down.
  return { text: 'Closing down', iconKey: 'close' };
}

// -------- guest action derivation ---------------------------------------
//
// Waiting-time thresholds — the only tunable numbers. Named so tests can
// pin them and future tuning stays here.
export const WAIT_IMPATIENT_SEC = 30;
export const WAIT_HAIL_SEC = 60;

// Formats "n s" or "n m" for time-in-state readouts on the card.
function formatWait(sec: number): string {
  if (sec < 90) return `${Math.round(sec)} s`;
  return `${Math.round(sec / 60)} m`;
}

export function deriveGuestAction(
  guest: Guest,
  simTime: number,
  menu: readonly MenuEntry[]
): GuestCardAction {
  const inState = Math.max(0, simTime - guest.stateTime);

  // G1 — turned away at the door.
  // reel EXIT (walk-away variant)
  if (guest.walkAwayOnArrival && guest.state === 'leaving') {
    return { text: 'Turned away at the door', iconKey: 'walk-away' };
  }

  switch (guest.state as GuestState) {
    case 'arriving':
      // reel IDLE (doorway)
      return { text: 'Arriving', iconKey: 'arriving' };
    case 'waiting':
      // G3 / G4 / G5 — waiting rows escalate with time.
      if (inState >= WAIT_HAIL_SEC) {
        // reel HAIL
        return { text: "Trying to catch someone's eye", iconKey: 'hail' };
      }
      if (inState >= WAIT_IMPATIENT_SEC) {
        // reel IMPATIENT (foot-tap)
        return { text: `Waiting — ${formatWait(inState)}`, iconKey: 'waiting-impatient' };
      }
      // reel IDLE (door) → WALK (in)
      return { text: 'Waiting to be seated', iconKey: 'waiting' };
    case 'seated':
      // G6 / G7 — welcome drink split.
      if (guest.hadWelcomeDrink) {
        return { text: 'Sipping welcome drink', iconKey: 'drink' };
      }
      // reel SIT DOWN completed
      return { text: 'Just seated', iconKey: 'seated' };
    case 'ordering':
      if (inState >= WAIT_IMPATIENT_SEC) {
        return { text: 'Ready to order', iconKey: 'ready-to-order' };
      }
      // reel READ MENU
      return { text: 'Reading the menu', iconKey: 'read-menu' };
    case 'dining':
      // reel EAT
      if (guest.satisfaction >= 0.7) {
        return { text: `Enjoying the ${dishName(menu)}`, iconKey: 'eat-good' };
      }
      return { text: 'Eating quietly', iconKey: 'eat-neutral' };
    case 'paying':
      if (guest.satisfaction >= 0.7) {
        return { text: 'Paying — happy', iconKey: 'pay-good' };
      }
      return { text: 'Paying — quietly', iconKey: 'pay-neutral' };
    case 'leaving':
      // reel EXIT
      return { text: 'Leaving', iconKey: 'exit' };
    case 'declined':
      return { text: 'Left before being seated', iconKey: 'declined' };
  }
}

// -------- attention priority (ORDER 086 §2) -----------------------------
//
// The panel sorts cards by attention priority so what needs a look sits
// at top. Seat index is the tiebreak so cards don't shuffle every tick
// when two guests share the same priority. Higher score = needs
// attention sooner. Pure — safe under memoisation.

export function guestAttentionPriority(
  guest: Guest,
  simTime: number
): number {
  const inState = Math.max(0, simTime - guest.stateTime);
  // Hardest-hitting first: hailing, running out of patience, dissatisfied.
  if (guest.state === 'waiting' && inState >= WAIT_HAIL_SEC) return 100;
  if (guest.state === 'ordering' && inState >= WAIT_IMPATIENT_SEC) return 95;
  if (guest.state === 'waiting' && inState >= WAIT_IMPATIENT_SEC) return 90;
  if (guest.state === 'dining' && guest.satisfaction < 0.3) return 85;
  if (guest.state === 'paying') return 60;
  if (guest.state === 'ordering') return 55;
  if (guest.state === 'dining' && guest.satisfaction < 0.7) return 50;
  if (guest.state === 'waiting') return 45;
  if (guest.state === 'seated') return 30;
  if (guest.state === 'arriving') return 20;
  // 'leaving' and 'declined' — closing out, low priority.
  return 5;
}

export function staffAttentionPriority(
  staff: StaffMember,
  day: DayState,
  simTime: number
): number {
  const phase = derivePhase(day, simTime);
  // In-service staff sort by workload — heavier-load first, so the
  // player sees who's under it. Off-service, group by phase.
  if (phase === 'service') {
    if (day.serviceRhythm === 'red' && staff.workload >= 0.7) return 92;
    if (staff.workload >= 0.85) return 88;
    if (staff.taskType !== null) return 70;
    return 40;
  }
  if (phase === 'prep') return 60;
  if (phase === 'opening') return 50;
  return 30;
}
