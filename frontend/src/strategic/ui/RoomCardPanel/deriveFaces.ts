// ORDER 086 §6 step 1 — pure derivation of face expression from state.
//
// Face vocabulary reconciled under ORDER 086 §2.1 amendment of the
// ORDER 085 report — ten expressions, one list. See
// M8_ROOM_CARD_PANEL_REPORT_ORDER_085.md §2.1 for the dropped items
// and their state-triggerability rationale.

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
  // SF5 — red rhythm + high personal load: strained.
  if (day.serviceRhythm === 'red' && staff.workload >= 0.7) return 'strained';
  // SF6 — dissatisfied target guest OR wrong-answer recency: irritated.
  //   Wrong-answer recency is inverse of `recentAnswerHitFlag`; we only
  //   have positive-write history, so a wrong answer is detected upstream
  //   via a separate flag if wired later. For now, dissatisfaction is
  //   the sole trigger — sufficient for the DoD in report §4.
  if (targetGuestSatisfaction !== null && targetGuestSatisfaction < 0.3) {
    return 'irritated';
  }
  // SF7 — amber rhythm: tense.
  if (day.serviceRhythm === 'amber') return 'tense';
  // SF8 — very high personal load regardless of rhythm: hurried.
  if (staff.workload >= 0.85) return 'hurried';
  // SF9 — task in hand, no other flag: focused.
  if (t !== null) return 'focused';
  // SF10 — fallback: neutral.
  return 'neutral';
}

// -------- guest face derivation -----------------------------------------

export function deriveGuestFace(
  guest: Guest,
  simTime: number
): FaceKey {
  const inState = Math.max(0, simTime - guest.stateTime);

  switch (guest.state as GuestState) {
    case 'declined':
      // GF1
      return 'strained';
    case 'leaving':
      if (guest.walkAwayOnArrival) return 'strained';
      // GF2 / GF3 / GF4 — satisfaction split.
      if (guest.satisfaction >= 0.7) return 'proud';
      if (guest.satisfaction < 0.4) return 'irritated';
      return 'neutral';
    case 'paying':
      // GF5 / GF6
      if (guest.satisfaction >= 0.7) return 'smiling';
      return 'neutral';
    case 'dining':
      // GF7 / GF8
      if (guest.satisfaction >= 0.7) return 'proud';
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
      // GF13 fallback
      return 'neutral';
  }
}
