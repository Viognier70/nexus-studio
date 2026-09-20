// ORDER 225 (Fas 1) — de fem ankarna: härledning ur befintligt sim-tillstånd.
//
// Kartläggningen i ORDER 224 (`documentation/blueprints/
// ORDER_224_VAD_SOM_UTLOSER_EN_FRAGA.md` §4) identifierade fem starka
// ankarpunkter i Design's `handoff/serviceScore.ts` (38 steg totalt):
//
//   n=6   greet         host + guest möts (dual-actor 1,25 m)
//   n=16  order         servitör tar order vid bord (VO-beslutad)
//   n=26  setDown       servitör serverar mat vid bord
//   n=30  requestCheck  gäst signalerar för notan
//   n=33  pay           transaktion vid bord
//
// Den här modulen läser sim-tillstånd som redan finns och rapporterar
// vilket ankare (om något) en gäst befinner sig vid. Inga nya
// sim-fält, inga nya sim-events — ren derivation. Kopplingen till
// scenarier/frågor byggs i egna ordrar (Fas 2, event-lager per
// ORDER 224 §7).
//
// Mappning: staff-side task-type + guest-side state (grep-verifierat
// mot service.ts:1034-1128 findTaskTarget och service.ts:408-429
// guest-state-transitionerna):
//
//   greet         staff.taskType === 'greet' med targetGuest
//                 (målgästen är arriving/waiting/seated + !hasBeenGreeted
//                 per findTaskTarget)
//   order         staff.taskType === 'order' med targetGuest
//                 (gäst.state === 'ordering' per findTaskTarget)
//   setDown       staff.taskType === 'serve' med targetGuest
//                 (gäst.state === 'seated' && stateTime > 6 s per findTaskTarget)
//   requestCheck  gäst.state === 'paying' de första
//                 REQUEST_CHECK_WINDOW_SEC sekunderna av staten
//   pay           gäst.state === 'paying' efter REQUEST_CHECK_WINDOW_SEC
//
// **Syntetisk split requestCheck/pay:** service.ts idag har ingen
// staff.taskType === 'pay' — hela paying-fönstret (8 s) täcker både
// signal och transaktion. Splitten sker på tid-i-state så att båda
// ankaren har egen fönster; när/om service.ts får en `pay`-task blir
// splitten mer trogen designen och konstanten justeras eller ersätts.
// Det här är dokumenterat som Fas 1-approximation i ORDER 225.

import type {
  Guest,
  SimulationState,
  StaffMember,
  TaskType
} from '../types';

export type AnchorId =
  | 'greet'
  | 'order'
  | 'setDown'
  | 'requestCheck'
  | 'pay';

export const ANCHOR_IDS: readonly AnchorId[] = [
  'greet',
  'order',
  'setDown',
  'requestCheck',
  'pay'
];

// Första REQUEST_CHECK_WINDOW_SEC av paying = signal (requestCheck);
// resterande = transaktion (pay). Halvvägs genom det ~8 s paying-
// fönstret (service.ts:429 släpper gästen efter now-stateTime>8) så
// båda ankaren har cirka 3-5 s synlighet var. Se modul-header för
// motivering.
export const REQUEST_CHECK_WINDOW_SEC = 3;

// Mappning task-type → ankare. Deklarerad som konstant så framtida
// tillägg (t.ex. staff.pay när det införs) blir en enrads-ändring.
const TASK_TO_ANCHOR: Partial<Record<TaskType, AnchorId>> = {
  greet: 'greet',
  order: 'order',
  serve: 'setDown'
};

export interface GuestAnchorInfo {
  readonly guestId: string;
  readonly anchor: AnchorId;
  // Personalens id om ankaret drivs av staff-task; null när det bara
  // är gästens tillstånd som markerar ankaret (requestCheck, pay).
  readonly staffId: string | null;
}

/**
 * Returnerar ankaret för en gäst just nu, eller null om gästen inte
 * befinner sig vid någon av de fem punkterna. Läsning:
 *
 *  1. Staff-drivna ankare (greet/order/setDown) tar företräde när en
 *     personal har `targetGuestId === guest.id` och passande taskType.
 *  2. Gäst-drivna ankare (requestCheck/pay) läses från `guest.state`
 *     när ingen staff-task-match finns.
 */
export function deriveGuestAnchor(
  state: SimulationState,
  guest: Guest
): AnchorId | null {
  // 1. Hitta staff som pekar på den här gästen (typiskt max en; om
  //    flera råkar peka samtidigt vinner första matchen — Fas 1
  //    behöver ingen prioritetsordning här).
  const staff = findEngagingStaff(state.staff, guest.id);
  if (staff && staff.taskType) {
    const fromTask = TASK_TO_ANCHOR[staff.taskType];
    if (fromTask) return fromTask;
  }

  // 2. Gäst-drivna ankare i paying-fönstret. Splitten är syntetisk;
  //    se modul-header.
  if (guest.state === 'paying') {
    const timeInPaying = state.simTime - guest.stateTime;
    return timeInPaying < REQUEST_CHECK_WINDOW_SEC
      ? 'requestCheck'
      : 'pay';
  }

  return null;
}

/** Ren linjär sökning; personallistan är kort (typiskt 3-5). */
function findEngagingStaff(
  staff: readonly StaffMember[],
  guestId: string
): StaffMember | null {
  for (const s of staff) {
    if (s.targetGuestId === guestId) return s;
  }
  return null;
}

/**
 * Alla aktiva ankare i state. Nollställs för gäster som inte matchar
 * något ankare. Ordningen följer `state.guests` (stabil).
 */
export function deriveActiveAnchors(
  state: SimulationState
): readonly GuestAnchorInfo[] {
  const out: GuestAnchorInfo[] = [];
  for (const guest of state.guests) {
    const anchor = deriveGuestAnchor(state, guest);
    if (!anchor) continue;
    const staff = findEngagingStaff(state.staff, guest.id);
    // För requestCheck/pay är ankaret gäst-drivet; staffId är null
    // även om någon staff råkar peka på gästen med en task-type som
    // inte mappas.
    const staffId = anchor === 'requestCheck' || anchor === 'pay'
      ? null
      : (staff?.id ?? null);
    out.push({ guestId: guest.id, anchor, staffId });
  }
  return out;
}

export type AnchorCount = Readonly<Record<AnchorId, number>>;

const EMPTY_COUNT: AnchorCount = Object.freeze({
  greet: 0,
  order: 0,
  setDown: 0,
  requestCheck: 0,
  pay: 0
});

/**
 * Aggregerad räkning per ankare. Motsvarar antalet gäster som just nu
 * befinner sig vid respektive ankare. Används av DevPanel för att
 * visa spelaren om ankaren fyras rimligt ofta.
 */
export function countActiveAnchors(state: SimulationState): AnchorCount {
  const counts = { ...EMPTY_COUNT };
  for (const guest of state.guests) {
    const anchor = deriveGuestAnchor(state, guest);
    if (anchor) counts[anchor] += 1;
  }
  return counts;
}
