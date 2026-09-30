// ORDER 286a — servicen som teater (Designs leverans 2, teaterns grund).
// Vilket klipp en figur spelar, ur regissörens prov (wineBarDirector.ts
// FigureSample): läget, det den bär och rollen. Klippen sköter kroppen
// (figureClips.ts sampleClip); regissören sköter var figuren är.
//
// Vision Owner 2026-09-29:
// - Tillägget till leverans 2 (Vision Owner 2026-09-29): "Undantaget för
//   barstolar och loungesoffor tas bort: alla platser i vinbaren följer nu
//   sittregeln." Sittklippet väljs efter sitsen (SEAT_KINDS[sort].sit/leave),
//   och de sittande looparna läggs om till sitsen (ctx.seatKind, reseat).
// - "Tempot följer trycket i rummet: lugnt, normalt eller stressat per anställd."

import { THEATRE } from '../../sim/balance';
import { clipSeconds, sampleClip, SEAT_KINDS, type ClipSample, type SeatKind, type TempoId } from './figureClips';
import type { FigureSample, StaffKey } from './wineBarDirector';

export function tempoFor(stress: number): TempoId {
  if (stress >= THEATRE.tempo.stressedFrom) return 'stressed';
  if (stress < THEATRE.tempo.calmBelow) return 'calm';
  return 'normal';
}

function carryClip(carrying: FigureSample['carrying']): string {
  if (carrying === 'plate') return 'waiter.carryPlate';
  if (carrying === 'dishes') return 'waiter.carryTwoPlates';
  if (carrying === 'glass' || carrying === 'bottle') return 'waiter.carryTray';
  return 'staff.walk';
}

/** Personalens klipp för provet, eller null när ingen motsvarighet finns. */
export function staffClipFor(s: FigureSample, key: StaffKey): string | null {
  switch (s.pose) {
    case 'walk': return s.carrying ? carryClip(s.carrying) : 'staff.walk';
    case 'serveWalk':
    case 'carry': return carryClip(s.carrying);
    case 'idle':
    case 'nod': return 'staff.idle';
    case 'takeOrder':
    case 'handle': return 'waiter.takeOrder';
    case 'serve':
      if (key === 'cook') return 'cook.plate';
      // Vid passet eller baren (inget i handen än): tar upp. Vid bordet: serverar.
      return s.carrying ? 'waiter.serve' : 'waiter.pickUp';
    case 'clear': return 'waiter.clear';
    case 'pour': return key === 'sommelier' ? 'somm.pour' : 'bar.pour';
    case 'present': return 'somm.present';
    case 'cook': return 'cook.station';
    case 'dish': return 'dish.wash';
    default: return null;
  }
}

/** Gästens klipp för provet. Sittande klipp efter sitsens sort (null utan sits). */
export function guestClipFor(s: FigureSample, seat: SeatKind | null): string | null {
  switch (s.pose) {
    case 'walk':
    case 'arrive':
    case 'leaveHappy':
    case 'leaveUnhappy': return 'guest.walk';
    default: break;
  }
  if (!seat) return null;
  switch (s.pose) {
    case 'sitDown':
    case 'sit': return SEAT_KINDS[seat].sit;
    case 'standUp': return SEAT_KINDS[seat].leave;
    case 'readMenu': return 'guest.readMenu';
    case 'order': return 'guest.order';
    case 'eat': return 'guest.eat';
    case 'toast': return 'guest.toast';
    case 'talk': return 'guest.gesture';
    case 'askBill': return 'guest.waveStaff';
    case 'pay': return 'guest.pay';
    case 'drink':
    case 'waitCalm':
    case 'waitImpatient':
    case 'waitLeaving': return 'guest.seatedIdle';
    default: return null;
  }
}

// Klipp som går tar fasen ur sträckan; engångsklipp tar sin plats ur
// regissörens progress (0..1 genom gesten); loopar tar tiden ur fasen, som
// regissören räknar i sekunder för icke-gående poser.
export function sampleForFigure(id: string, s: FigureSample, tempo: TempoId, seatKind?: SeatKind): ClipSample {
  const travel = id.endsWith('walk') || id.startsWith('waiter.carry') || id === 'rocket.walkToKitchen';
  if (travel) return sampleClip(id, 0, tempo, { phase: s.phase, stress: s.stress });
  const oneShot = ['guest.sit', 'guest.leave', 'guest.sitStool', 'guest.leaveStool', 'guest.sitLounge', 'guest.leaveLounge', 'guest.order', 'guest.toast', 'guest.waveStaff', 'guest.pay', 'waiter.serve', 'waiter.pickUp', 'waiter.clear', 'bar.pour', 'somm.pour', 'somm.present', 'cook.plate'].includes(id);
  // ORDER 287a — att sätta sig och resa sig börjar alltid i klippets början
  // (progress 0 är första bildrutan, inte slutposen).
  const seatMove = ['guest.sit', 'guest.leave', 'guest.sitStool', 'guest.leaveStool', 'guest.sitLounge', 'guest.leaveLounge'].includes(id);
  const time = oneShot && (s.progress > 0 || seatMove) ? s.progress * clipSeconds(id, tempo) : s.phase;
  return sampleClip(id, time, tempo, { yaw: s.targetYaw, stress: s.stress, seated: s.seated, seatKind });
}
