// ORDER 297 (Vision Owner 2026-10-04: "Ansiktena på manusfigurerna
// (födelsedagen och gästen som vinglar) kopplas in … gärna i 297") —
// ansiktena på händelsernas manusfigurer (EventTheatre), med Designs
// tidslinjer ur D1 stamningManus.js (beats.face, initialFaces), som leveransen
// säger att vi läser men inte monterar. Tiderna står där från att svaret låses
// (A): gästerna byter uttryck en i taget från 0,6 s, 0,18 s isär.
//   - Födelsedagen, steg 3 (rakets sista svar).
//   - Gästen som vinglar, steg 1 (händelsens första svar).
// Personalen har alltid uttrycket nöjd (FACE.staffMood).

import type { MoodId } from '../../sim/guestMood';
import { CONSEQUENCE, FACE } from './guestMood';

type FaceBeat = { at: number; who: string; mood: MoodId };

const g = (k: number) => CONSEQUENCE.guests.firstGestureAt + k * CONSEQUENCE.guests.staggerS;

/** Uttrycken innan svaret (stamningManus initialFaces; födelsedagens lounge A väntar). */
export const INITIAL_FACES: Record<string, Record<string, MoodId>> = {
  bday: { host: 'waiting', karin: 'waiting', friend: 'waiting', nb1: 'content', nb2: 'content', b4: 'content' },
  drunk: { g: 'content', b2: 'waiting', b4: 'waiting', b1: 'waiting', la1: 'waiting', la2: 'waiting' }
};

/** Tidslinjerna efter svaret, rätt och fel (stamningManus beats.face). */
export const FACE_BEATS: Record<string, { right: FaceBeat[]; wrong: FaceBeat[] }> = {
  bday: {
    right: [
      ...['host', 'karin', 'friend'].map((who, i) => ({ at: g(i), who, mood: 'delighted' as MoodId })),
      { at: g(3), who: 'nb1', mood: 'content' }, { at: g(4), who: 'nb2', mood: 'content' }
    ],
    wrong: [
      ...['host', 'karin', 'friend'].map((who, i) => ({ at: g(i), who, mood: 'delighted' as MoodId })),
      { at: g(3), who: 'nb1', mood: 'displeased' }, { at: g(4), who: 'nb2', mood: 'impatient' }, { at: g(5), who: 'b4', mood: 'waiting' }
    ]
  },
  drunk: {
    right: [{ at: g(0), who: 'b2', mood: 'content' }, { at: g(1), who: 'b4', mood: 'content' }, { at: g(2), who: 'b1', mood: 'content' }, { at: g(3), who: 'la2', mood: 'content' }],
    wrong: [
      { at: g(0), who: 'b2', mood: 'displeased' }, { at: g(1), who: 'b4', mood: 'waiting' }, { at: g(2), who: 'b1', mood: 'displeased' },
      { at: g(3), who: 'la2', mood: 'impatient' }, { at: g(4), who: 'la1', mood: 'displeased' }, { at: 0.4, who: 'g', mood: 'delighted' }
    ]
  }
};

/** Vilket svar i händelsen tidslinjen hör till: födelsedagens sista, gästen som vinglar första. */
export const FACE_STEP: Record<string, 'last' | 'first'> = { bday: 'last', drunk: 'first' };

/**
 * Uttrycket för en manusfigur: personalen nöjd; gästerna sitt första uttryck,
 * och efter det svar tidslinjen hör till, uttrycken som har hunnit komma.
 */
export function scriptFaceMood(event: string, who: string, kind: 'guest' | 'staff', answer: { kind: 'right' | 'wrong'; elapsed: number } | null): MoodId {
  if (kind === 'staff') return FACE.staffMood;
  let mood: MoodId = INITIAL_FACES[event]?.[who] ?? 'content';
  const beats = FACE_BEATS[event];
  if (!beats || !answer) return mood;
  for (const b of beats[answer.kind]) if (b.who === who && answer.elapsed >= b.at) mood = b.mood;
  return mood;
}
