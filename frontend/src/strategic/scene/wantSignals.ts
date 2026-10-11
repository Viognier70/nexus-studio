// ORDER 327 B (Anders 2026-10-11) — signalerna för stegen blick → hand → vinkning (Designs D11 (46),
// GESTURE_RULES.wantLadder) och blickkontakten. Ren TypeScript, inget three.js: vinbarens regissör
// (wineBarDirector.ts) och vagnen (village/PlayerTruckCrew.tsx) säger vad gästen vill och sedan när, och
// läser steget härifrån. Inga nya resurser och ingen ny ekonomi: signalerna styr bara gesterna och
// personalens rutt.
//
//   Vill beställa (wantsOrder)   sällskapet sitter och servitören har inte kommit för beställningen; från
//                                waitWatchS efter att de satt sig, som i ORDER 326.
//   Mer i glaset (wantsRefill)   glaset är tomt (glassEmptyS efter att det fylldes) och gästen sitter kvar.
//   Notan (wantsBill)            gästen har ätit klart (simuleringens dining är slut, 'paying'), eller
//                                tallriken är undan och glaset tomt i mer än billAfterEmptyS.
//   Från luckan (wantsHatch)     gäst vid ståbordet som har ätit klart och har pengar kvar.
//
// Stegen räknas från att viljan började: blicken (guest.seekEye) direkt, handen efter seekEyeS och den stora
// vinkningen från waitWaveS − waitWatchS (för beställningen samma tider som i ORDER 326: 20, 32 och 40 s efter
// att sällskapet satt sig).
//
// Blickkontakt: går någon i personalen förbi inom eyeContactM från bordet, med ansiktet mot det (inom
// eyeContactConeRad), stannar stegen. Gästen nickar (guest.nodApprove), och personalen ska vara framme inom
// eyeContactComeS; annars börjar stegen om.
// ORDER 328 C — en nick per steg (blicken, handen, vinkningen) och högst eyeContactMaxRestarts omstarter per
// sällskap och vilja. Efter den sista omstarten står stegen stilla efter nicken tills personalen är framme.

import { FOODTRUCK, GESTURE_BALANCE, TRUCK_MENU } from '../../sim/balance';
import { CLIPS } from './figureClips';

export type WantKind = 'order' | 'refill' | 'bill' | 'hatch';

/** Kartans situation för blicken (gestureMap.ts SITUATIONS). */
export const WANT_SITUATION: Record<WantKind, 'wantsOrder' | 'wantsRefill' | 'wantsBill' | 'wantsHatch'> = {
  order: 'wantsOrder', refill: 'wantsRefill', bill: 'wantsBill', hatch: 'wantsHatch'
};

/** Steget i stegen: blicken, handen, den stora vinkningen, eller nicken efter blickkontakt. */
export type WantStep = 'eye' | 'hand' | 'wave' | 'nod';

export interface WantTrack {
  kind: WantKind;
  /** Då stegen började (eller började om), i samma tid som anroparen. */
  since: number;
  /** Blickkontakten, eller null. */
  ackAt: number | null;
  /** Vem i personalen gästen fick kontakt med. */
  ackBy: string | null;
  /** ORDER 328 C — stegen gästen redan har nickat i, och omstarterna hittills. */
  nodded: WantStep[];
  restarts: number;
}

/** Ett ögonblick i personalen: var, vart ansiktet pekar (rotation kring y, atan2(dx, dz)) och om den går. */
export interface StaffGlance { key: string; x: number; z: number; facing: number; walking: boolean; visible: boolean }

/** Huvudet och axlarna vrids inte längre än så när gästen söker blicken (radianer, ORDER 326). */
export const SEEK_MAX_YAW = 1.3;

/** Nickens längd (guest.nodApprove i normalt tempo). */
export const NOD_S = CLIPS['guest.nodApprove'].seconds.normal;

function wrap(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Steget vid tiden t, eller null när stegen har stannat (efter nicken, i väntan på personalen). */
export function wantStep(w: WantTrack, t: number): WantStep | null {
  const B = GESTURE_BALANCE;
  if (w.ackAt !== null) return t - w.ackAt < NOD_S ? 'nod' : null;
  const u = t - w.since;
  if (u < 0) return null;
  if (u < B.seekEyeS) return 'eye';
  if (u < B.waitWaveS - B.waitWatchS) return 'hand';
  return 'wave';
}

/** Den i personalen som går förbi inom eyeContactM från `at` med ansiktet mot den, eller null. */
export function eyeContact(staff: readonly StaffGlance[], at: { x: number; z: number }): string | null {
  const B = GESTURE_BALANCE;
  let best: string | null = null, bestD = Infinity;
  for (const s of staff) {
    if (!s.visible || !s.walking) continue;
    const dx = at.x - s.x, dz = at.z - s.z, d = Math.hypot(dx, dz);
    if (d > B.eyeContactM || d >= bestD) continue;
    if (Math.abs(wrap(Math.atan2(dx, dz) - s.facing)) > B.eyeContactConeRad) continue;
    best = s.key; bestD = d;
  }
  return best;
}

/**
 * Ett steg för spåret. `want` är vad gästen vill just nu och sedan när (null: inget, eller personalen är
 * framme); `contact` är blickkontakten den här bildrutan (eyeContact). Ger det nya spåret.
 */
export function stepWant(prev: WantTrack | null, want: { kind: WantKind; since: number } | null, t: number, contact: string | null): WantTrack | null {
  if (!want) return null;
  if (!prev || prev.kind !== want.kind) prev = { kind: want.kind, since: want.since, ackAt: null, ackBy: null, nodded: [], restarts: 0 };
  if (prev.ackAt === null) {
    const step = wantStep(prev, t);
    // En nick per steg: har gästen redan nickat i det här steget går stegen vidare.
    if (contact && step && step !== 'nod' && !prev.nodded.includes(step)) return { ...prev, ackAt: t, ackBy: contact, nodded: [...prev.nodded, step] };
    return prev;
  }
  // Personalen kom inte fram i tid: stegen börjar om med blicken, högst eyeContactMaxRestarts gånger.
  if (t > prev.ackAt + GESTURE_BALANCE.eyeContactComeS && prev.restarts < GESTURE_BALANCE.eyeContactMaxRestarts) {
    return { ...prev, since: t, ackAt: null, ackBy: null, restarts: prev.restarts + 1 };
  }
  return prev;
}

/** Kartans situation för steget (moodGestures.ts): blicken efter viljan, handen och vinkningen gemensamma. */
export function situationFor(kind: WantKind, step: WantStep): string {
  if (step === 'eye') return WANT_SITUATION[kind];
  if (step === 'hand') return 'readyToOrder';
  if (step === 'wave') return 'waitedTooLong';
  return 'eyeContact';
}

/** Det billigaste på vagnens meny (balance.ts TRUCK_MENU, utan inköpet). */
export const TRUCK_CHEAPEST_SEK = Math.min(...Object.entries(TRUCK_MENU).filter(([k, v]) => k !== 'section' && !k.startsWith('goods') && typeof v === 'number').map(([, v]) => v as number));

/** Vill ha något från luckan: vid ståbordet (inte bänken), har ätit klart och har pengar kvar efter notan
 *  (plånboken, guestOrders.ts profileFor och GUESTS.walletSek, minus FOODTRUCK.billSek). */
export function wantsHatch(atStandTable: boolean, ateDone: boolean, walletSek: number): boolean {
  return atStandTable && ateDone && walletSek - FOODTRUCK.billSek >= TRUCK_CHEAPEST_SEK;
}
