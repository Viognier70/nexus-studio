// ORDER 086 §6 step 1 — pure derivation of face expression from state.
// ORDER 087 §3 — mimikförsoning. `exhausted` and `proud` are declared
// personal-exklusiva here so the boundary is explicit, not tacit. See
// STAFF_EXCLUSIVE_FACES below and the guest derivation guard.
//
// Face vocabulary reconciled under ORDER 086 §2.1 amendment of the
// ORDER 085 report — ten expressions, one list. See
// M8_ROOM_CARD_PANEL_REPORT_ORDER_085.md §2.1 for the dropped items
// (`förvirrad`, `förvånad`) and their state-triggerability rationale.

import type {
  DayState,
  Guest,
  GuestState,
  StaffMember,
  TaskType
} from '../../types';
import type { EnablerRecord } from '../../types';
import { WAIT_HAIL_SEC, WAIT_IMPATIENT_SEC } from './deriveActions';

export type FaceKey =
  | 'neutral' | 'focused' | 'smiling' | 'attentive'
  | 'tense' | 'strained' | 'hurried' | 'exhausted'
  | 'proud' | 'irritated';

// The ten reconciled expressions, materialised as a runtime tuple so a
// test can assert the set is exactly these. Ordered to mirror the
// FaceKey union so grep between the two stays honest.
export const ALL_FACE_KEYS: readonly FaceKey[] = [
  'neutral', 'focused', 'smiling', 'attentive',
  'tense', 'strained', 'hurried', 'exhausted',
  'proud', 'irritated'
];

// ORDER 087 §3 — `exhausted` and `proud` are personal-exclusive.
// Rationale (per the order): `exhausted` reads end-of-service or
// post-collapse fatigue that belongs to whoever ran the room, not the
// guest sitting through it. `proud` reads a landed professional
// judgement (a correct answer) which is a staff act, not a guest state.
// Guest satisfaction, however high, is `smiling`; guest closure, however
// serene, is `neutral`. Left as an explicit constant so the guest
// derivation can guard against a silent regression back to `proud`.
export const STAFF_EXCLUSIVE_FACES: readonly FaceKey[] = ['exhausted', 'proud'];

// Window (seconds) after a correct-answer episteme write within which
// the staff face reads `proud`. Same window used by the `irritated`
// counterpart to detect a very recent wrong-answer episteme-write
// absence. Longer than a tick, short enough that pride/irritation
// doesn't overhang into the next task.
export const RECENT_ANSWER_WINDOW_SEC = 5;

// Detect a fresh correct-answer episteme write across every enabler
// register. Pure over state; scans `history` for the newest entry and
// returns true if it lies within the window.
export function recentAnswerHit(
  enablers: Record<string, EnablerRecord>,
  simTime: number
): boolean {
  let newestAt = -Infinity;
  for (const rec of Object.values(enablers)) {
    for (const evt of rec.history) {
      if (evt.at > newestAt) newestAt = evt.at;
    }
  }
  if (newestAt === -Infinity) return false;
  return simTime - newestAt <= RECENT_ANSWER_WINDOW_SEC;
}

// -------- staff face derivation -----------------------------------------

export function deriveStaffFace(args: {
  staff: StaffMember;
  day: DayState;
  simTime: number;
  recentAnswerHitFlag: boolean;
  targetGuestSatisfaction: number | null;   // null if targetGuestId lookup fails
}): FaceKey {
  const { staff, day, recentAnswerHitFlag, targetGuestSatisfaction } = args;

  // SF1 — end of service or post-collapse: exhausted.
  if (day.period === 'evening' || day.serviceCollapsed) return 'exhausted';
  // SF2 — landed correct answer within the window: proud.
  if (recentAnswerHitFlag) return 'proud';
  // SF3 — greeting or pouring welcome drink: smiling.
  const t = staff.taskType as TaskType | null;
  if (t === 'greet' || t === 'welcomeDrink') return 'smiling';
  // SF4 — order-taking: attentive.
  if (t === 'order') return 'attentive';
  // SF5 — dissatisfied target guest OR wrong-answer recency: irritated.
  //   Wrong-answer recency is inverse of `recentAnswerHitFlag`; we only
  //   have positive-write history, so a wrong answer is detected upstream
  //   via a separate flag if wired later. For now, dissatisfaction is
  //   the sole trigger — sufficient for the DoD in report §4.
  if (targetGuestSatisfaction !== null && targetGuestSatisfaction < 0.3) {
    return 'irritated';
  }
  // ORDER 087 §3.4 — bind readers so tense / strained / hurried each
  // have a reachable band. Rules SF6..SF8 read personal load first and
  // room rhythm second, because rhythm is the worst-puck-in-room read
  // (any staff at 0.7+ makes the room red). If we checked room first,
  // hurried (personal band, 0.85+) would be silently shadowed by
  // strained (room red + personal 0.7+) whenever a single staff was
  // over 0.85 — that staff would drag the room red AND fire strained,
  // so hurried would never appear. Reading personal band first gives
  // this staff their own colour when they're the one running.
  //
  // SF6 — very high personal load: hurried.
  //   Reads as "I am the one running." ORDER 088 §2.1 — threshold
  //   moved from 0.85 to 0.95 after workload-percentile measurement.
  //   At 0.85 the band captured ~60 % of all service-ticks (p50=0.92,
  //   p75=1.00 in seed=3 harness), which made hurried the default
  //   read rather than a signal. 0.95 anchors just above the median
  //   under load: hurried now reads "meaningfully above the room."
  //   Placement documented in UNDERLAG_003_MEASUREMENTS.md §0.3
  //   (ORDER 088 amendment).
  if (staff.workload >= 0.95) return 'hurried';
  // SF7 — red rhythm + high personal load (but not personal-hurried):
  //   strained. Reads as "the room is red and I am part of it."
  if (day.serviceRhythm === 'red' && staff.workload >= 0.7) return 'strained';
  // SF8 — amber rhythm: tense.
  //   Reads as "the room is holding under load."
  if (day.serviceRhythm === 'amber') return 'tense';
  // SF9 — task in hand, no other flag: focused.
  if (t !== null) return 'focused';
  // SF10 — fallback: neutral.
  return 'neutral';
}

// -------- guest face derivation -----------------------------------------
//
// ORDER 087 §3 — `exhausted` and `proud` are STAFF_EXCLUSIVE_FACES and
// intentionally absent from the guest branches below. A happy guest
// reads as `smiling`; a satisfied diner reads as `smiling`. The
// eight faces reachable from a guest are:
//   neutral, focused, smiling, attentive, tense, strained, hurried,
//   irritated.
//
// One reader per expression (ORDER 087 §6.4): each branch below is
// a single, non-overlapping arm of the switch so no two expressions
// are reachable from the same tuple of (state, satisfaction,
// stateTime, walkAwayOnArrival). See test
// `deriveGuestFace determinism — one reader per (state × affect × wait)`.

export function deriveGuestFace(
  guest: Guest,
  simTime: number
): FaceKey {
  const inState = Math.max(0, simTime - guest.stateTime);

  // ORDER 088 §2.2 — `smiling` is a single reader across leaving /
  // paying / dining: condition is `positive-outcome state + satisfaction
  // >= 0.7 + not walk-away`. The walk-away guard is added on every
  // branch (not only `leaving`) so the pure function cannot yield
  // smiling for a walk-away guest even in unreachable tuples — the
  // reader stays semantically singular ("satisfied in a fulfilling
  // phase") rather than acquiring a hidden second condition through
  // an unguarded state.
  switch (guest.state as GuestState) {
    case 'declined':
      // GF1
      return 'strained';
    case 'leaving':
      if (guest.walkAwayOnArrival) return 'strained';
      // GF2 / GF3 / GF4 — satisfaction split.
      // GF2 was `proud` pre-ORDER 087; a guest cannot be proud (that is
      // a staff-side judgement), a satisfied departing guest is
      // `smiling`.
      if (guest.satisfaction >= 0.7) return 'smiling';
      if (guest.satisfaction < 0.4) return 'irritated';
      return 'neutral';
    case 'paying':
      // GF5 / GF6 — walk-away guard added ORDER 088 §2.2.
      if (guest.walkAwayOnArrival) return 'neutral';
      if (guest.satisfaction >= 0.7) return 'smiling';
      return 'neutral';
    case 'dining':
      // GF7 / GF8 — dining split. Walk-away guard added ORDER 088 §2.2.
      // GF7 was `proud` pre-ORDER 087; a diner cannot be proud, a
      // satisfied diner is `smiling`.
      if (guest.walkAwayOnArrival) return 'focused';
      if (guest.satisfaction >= 0.7) return 'smiling';
      return 'focused';
    case 'ordering':
      // GF9
      return 'attentive';
    case 'waiting':
      // GF10 / GF11 / GF12
      if (inState >= WAIT_HAIL_SEC) return 'hurried';
      if (inState >= WAIT_IMPATIENT_SEC) return 'tense';
      return 'neutral';
    case 'arriving':
    case 'seated':
    // ORDER 111 §4 — sleeping-gäst (värdshus) läses som neutral;
    // ingen aktiv service pågår, inget uttryck att förmedla.
    case 'sleeping':
    // ORDER 115 §4.5 — eating-gäst (foodtruck-uteplats). Foodtruck
    // renderar sitt eget uttryck via guestFaces.ts; deriveFaces
    // (staff-vokabulär) rörs inte per §7-avgränsning. Neutral fallback
    // så typen täcker alla GuestState.
    case 'eating':
    // ORDER 115 rev 2 — serving-gäst (foodtruck-överlämning). Samma
    // fallback.
    case 'serving':
      // GF13 fallback
      return 'neutral';
  }
}
