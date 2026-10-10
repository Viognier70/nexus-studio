// ORDER 299 — gästernas gester efter stämningen (Designs D1 §2 och §7).
// ORDER 325 — Designs D11-karta (gestureMap.ts): stämningens egna gester (MOOD_MAP), situationerna
// (SITUATIONS) och reglerna (GESTURE_RULES), med talen i balance.ts GESTURE_BALANCE. En sittande gäst som bara
// sitter (guest.seatedIdle) gör en gest när läget ändras, när en situation gäller och därefter då och då.
// Gester avbryter aldrig beställningen, notan eller samspelen vid bordet; den första tuggan är det enda som tar
// över ett annat klipp (guest.eat), som i kartan (quietWhileServed: firstBite).
// - Situationerna som simuleringen vet om i vinbaren och bistron:
//     waitedLong / waitedTooLong  gästen sitter utan att ha beställt (Guest.state 'seated') i waitWatchS / waitWaveS;
//     firstBite / firstBiteGreat / dishBelow  rätten har ställts fram (klippet guest.eat börjar): nick, nick som
//         glad, eller tallriken undan när stämningen är under pushPlateBelow (inget betyg per rätt i simuleringen);
//     wrongWitnessed  gästen satt vid bordet eller såg ett fel svar (konsekvensögonblicket).
//   Prat och skratt (talking, joke) är stämningens egna gester för sällskap om två eller fler; den som sitter
//   ensam lutar sig inte fram och pratar.
// - Tempot är styrkan (MOOD_STRENGTH): glad, otålig och missnöjd stressat, så att de syns från 24 m.
// - En gest i taget per sällskap (onePerParty); i konsekvensögonblicket börjar de som påverkades vid
//   CONSEQUENCE.guests.firstGestureAt, närmast händelsen först, staggerS isär.
// - Ansiktet följer gesten (faceWithGesture): situationens stämning medan gesten spelas (faceFor).
// - Samma kväll ser likadan ut: gesterna väljs i tur och ordning per gäst och luckorna ur fröet.

import { sampleClip, CLIPS, type ClipSample, type SeatKind, type TempoId } from './figureClips';
import { CONSEQUENCE } from './guestMood';
import { GESTURE_BALANCE, MOOD_BALANCE } from '../../sim/balance';
import { moodOf, type MoodId } from '../../sim/guestMood';
import { GESTURE_RULES, MOOD_MAP, MOOD_STRENGTH, SITUATIONS, pickGesture } from './gestureMap';
import type { ConsequenceMoment, GuestState } from '../types';
import { hashKey } from '../util/hash';

const IDLE = 'guest.seatedIdle';
const EAT = 'guest.eat';
/** Stämningens egna gester som kräver någon att prata med (kartans talking och joke). */
const TALK = new Set(['guest.leanTalk', 'guest.laugh']);
const BITE = new Set(['firstBite', 'firstBiteGreat', 'dishBelow']);

/** Det simuleringen vet om gästen, för situationerna. */
export interface GestureGuestInfo {
  state: GuestState;
  /** Simsekunder i tillståndet (Guest.stateTime). */
  stateSinceS: number;
  partyId: string | null;
  partySize: number;
}

interface Slot {
  guestId: string; mood: MoodId; clip: string | null; situation: string | null; face: MoodId | null;
  tempo: TempoId; startAt: number; nextAt: number; turn: number;
  lastWatchAt: number; waved: boolean; ateAt: number | null; biteDone: boolean; lastEnd: number;
}

export class MoodGestures {
  private slots: (Slot | null)[];
  /** Sällskapets gest pågår till (simsekund). */
  private partyBusy = new Map<string, number>();

  constructor(pool: number) {
    this.slots = Array.from({ length: pool }, () => null);
  }

  /** Figuren i sitter inte (eller är någon annan): ingen gest. */
  reset(i: number): void {
    this.slots[i] = null;
  }

  /** Ansiktet medan gesten spelas (situationens stämning), annars null: stämningen gäller. */
  faceFor(i: number): MoodId | null {
    const s = this.slots[i];
    return s && s.clip ? s.face : null;
  }

  /** Situationen som spelas för figuren i, för kontrollen och testerna. */
  situationOf(i: number): string | null {
    const s = this.slots[i];
    return s && s.clip ? s.situation : null;
  }

  /** Gesten för figuren i, eller null när spelets eget klipp gäller. */
  sample(i: number, guestId: string | null, baseClipId: string | null, value: number, simTime: number, seatKind: SeatKind | null, moment: ConsequenceMoment | null | undefined, seed: number, info?: GestureGuestInfo | null): { id: string; clip: ClipSample } | null {
    if (!guestId || !seatKind) { this.slots[i] = null; return null; }
    let slot = this.slots[i];
    const mood = moodOf(value);
    if (!slot || slot.guestId !== guestId) {
      slot = { guestId, mood, clip: null, situation: null, face: null, tempo: 'normal', startAt: 0, nextAt: simTime + this.gap(seed, guestId, 0), turn: 0, lastWatchAt: -Infinity, waved: false, ateAt: null, biteDone: false, lastEnd: -Infinity };
      this.slots[i] = slot;
    }
    const idle = baseClipId === IDLE;
    const eating = baseClipId === EAT;
    if (eating && slot.ateAt === null) slot.ateAt = simTime;
    const party = info?.partyId ?? null;
    const partyFree = !party || (this.partyBusy.get(party) ?? -Infinity) <= simTime;
    const B = GESTURE_BALANCE;
    // Läget ändrades: gesten för det nya läget, i konsekvensögonblicket i tur och ordning.
    if (mood !== slot.mood) {
      slot.mood = mood;
      slot.turn = 0;
      let start = simTime;
      let active: string[] = [];
      if (moment && simTime - moment.at < CONSEQUENCE.durationS) {
        const order = [...moment.tableGuestIds, ...moment.witnessIds];
        const rank = Math.max(0, order.indexOf(guestId));
        start = Math.max(simTime, moment.at + CONSEQUENCE.guests.firstGestureAt + rank * CONSEQUENCE.guests.staggerS);
        if (moment.kind === 'wrong' && order.includes(guestId)) active = ['wrongWitnessed'];
      }
      this.begin(slot, value, start, active, info, party);
    } else if (!slot.clip) {
      const active: string[] = [];
      if (info && info.state === 'seated') {
        if (info.stateSinceS >= B.waitWaveS && !slot.waved) active.push('waitedTooLong');
        else if (info.stateSinceS >= B.waitWatchS && simTime - slot.lastWatchAt >= B.watchEveryS) active.push('waitedLong');
      }
      if (eating && !slot.biteDone && slot.ateAt !== null && simTime - slot.ateAt < B.firstBiteWithinS) {
        active.push(value >= MOOD_BALANCE.threshold.delighted ? 'firstBiteGreat' : value < B.pushPlateBelow ? 'dishBelow' : 'firstBite');
      }
      const bite = active.some((a) => BITE.has(a));
      if (active.length && (idle || bite) && partyFree && simTime >= slot.lastEnd + B.gestureCooldownS) this.begin(slot, value, simTime, active, info, party);
      else if (simTime >= slot.nextAt && idle && partyFree) this.begin(slot, value, simTime, [], info, party);
    }
    if (!slot.clip) return null;
    const spec = CLIPS[slot.clip];
    const elapsed = simTime - slot.startAt;
    const length = spec ? spec.seconds[slot.tempo] : 0;
    if (elapsed >= length) {
      slot.clip = null;
      slot.situation = null;
      slot.lastEnd = simTime;
      slot.nextAt = simTime + Math.max(B.gestureCooldownS, this.gap(seed, guestId, slot.turn));
      return null;
    }
    // Väntar på sin tur, eller gästen gör något annat än att sitta: spelets klipp gäller (utom första tuggan).
    const biteNow = !!slot.situation && BITE.has(slot.situation) && eating;
    if (elapsed < 0 || !(idle || biteNow)) return null;
    return { id: slot.clip, clip: sampleClip(slot.clip, elapsed, slot.tempo, { seatKind, seated: true }) };
  }

  private begin(slot: Slot, value: number, at: number, active: string[], info: GestureGuestInfo | null | undefined, party: string | null): void {
    const solo = (info?.partySize ?? 1) < 2;
    let clip: string | null;
    let situation: string | null = null;
    let face: MoodId | null = null;
    if (active.length) {
      clip = pickGesture({ mood: slot.mood, posture: 'seated', active, index: slot.turn, sinceLastS: Infinity, cooldownS: 0 });
      const sit = SITUATIONS.filter((x) => active.includes(x.id)).sort((a, b) => b.priority - a.priority)[0];
      situation = sit?.id ?? null;
      face = sit?.mood ?? null;
    } else {
      const list = MOOD_MAP[slot.mood].seated.filter((c) => !(solo && TALK.has(c)));
      clip = list.length ? list[slot.turn % list.length] : null;
      face = MOOD_MAP[slot.mood].face;
    }
    if (!clip || !CLIPS[clip]) { slot.clip = null; return; }
    slot.clip = clip;
    slot.situation = situation;
    slot.face = face;
    slot.turn++;
    slot.tempo = situation === 'firstBiteGreat' ? 'stressed' : this.tempo(face ?? slot.mood, value);
    slot.startAt = at;
    if (situation === 'waitedLong') slot.lastWatchAt = at;
    if (situation === 'waitedTooLong') slot.waved = true;
    if (situation && BITE.has(situation)) slot.biteDone = true;
    if (party && GESTURE_RULES.onePerParty) this.partyBusy.set(party, at + CLIPS[clip].seconds[slot.tempo] + GESTURE_RULES.staggerS);
  }

  private tempo(mood: MoodId, _value: number): TempoId {
    return MOOD_STRENGTH[mood];
  }

  private gap(seed: number, guestId: string, turn: number): number {
    const B = GESTURE_BALANCE;
    return B.moodGestureEveryS + B.moodGestureJitter * (2 * hashKey(seed, `${turn}|${guestId}|moodGap`) - 1);
  }
}
