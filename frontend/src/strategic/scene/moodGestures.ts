// ORDER 299 — gästernas gester efter stämningen (Designs D1 §2 och §7,
// figureClips.ts MOOD_GESTURES). En sittande gäst som bara sitter
// (guest.seatedIdle) gör en gest ur MOOD_GESTURES[läge] när läget ändras, och
// därefter då och då i luckorna. Gester avbryter aldrig beställningen,
// maten, notan eller samspelen vid bordet.
// - Tempot är styrkan: lugn just över gränsen, normal mitt i läget och stressad
//   långt in; otålig gestikulerar alltid stressat (D1 §2).
// - I konsekvensögonblicket börjar de som påverkades vid
//   CONSEQUENCE.guests.firstGestureAt, närmast händelsen först, staggerS isär.

import { MOOD_GESTURES, sampleClip, CLIPS, type ClipSample, type SeatKind, type TempoId } from './figureClips';
import { CONSEQUENCE } from './guestMood';
import { MOOD_BALANCE } from '../../sim/balance';
import { moodOf, MOODS, type MoodId } from '../../sim/guestMood';
import type { ConsequenceMoment } from '../types';
import { hashKey } from '../util/hash';

/** Simsekunder mellan gesterna i luckorna (dras inom spannet per gäst). */
const GAP_S: [number, number] = [24, 48];
const IDLE = 'guest.seatedIdle';

interface Slot { guestId: string; mood: MoodId; clip: string | null; tempo: TempoId; startAt: number; nextAt: number; turn: number }

function tempoFor(mood: MoodId, value: number): TempoId {
  if (mood === 'impatient') return 'stressed';
  const t = MOOD_BALANCE.threshold;
  const edges: Record<MoodId, [number, number]> = {
    delighted: [t.delighted, 1], content: [t.content, t.delighted], waiting: [t.waiting, t.content],
    impatient: [t.impatient, t.waiting], displeased: [0, t.impatient]
  };
  const [lo, hi] = edges[mood];
  // Hur långt in i läget: mot det bättre hållet för goda lägen, mot det sämre för dåliga.
  const good = MOODS.indexOf(mood) <= MOODS.indexOf('content');
  const depth = hi > lo ? (good ? (value - lo) / (hi - lo) : (hi - value) / (hi - lo)) : 0;
  return depth < 1 / 3 ? 'calm' : depth < 2 / 3 ? 'normal' : 'stressed';
}

export class MoodGestures {
  private slots: (Slot | null)[];

  constructor(pool: number) {
    this.slots = Array.from({ length: pool }, () => null);
  }

  /** Figuren i sitter inte (eller är någon annan): ingen gest. */
  reset(i: number): void {
    this.slots[i] = null;
  }

  /** Gesten för figuren i, eller null när spelets eget klipp gäller. */
  sample(i: number, guestId: string | null, baseClipId: string | null, value: number, simTime: number, seatKind: SeatKind | null, moment: ConsequenceMoment | null | undefined, seed: number): { id: string; clip: ClipSample } | null {
    if (!guestId || !seatKind) { this.slots[i] = null; return null; }
    let slot = this.slots[i];
    const mood = moodOf(value);
    if (!slot || slot.guestId !== guestId) {
      slot = { guestId, mood, clip: null, tempo: 'normal', startAt: 0, nextAt: simTime + this.gap(seed, guestId, 0), turn: 0 };
      this.slots[i] = slot;
    }
    const idle = baseClipId === IDLE;
    // Läget ändrades: gesten för det nya läget, i konsekvensögonblicket i tur och ordning.
    if (mood !== slot.mood) {
      slot.mood = mood;
      slot.turn = 0;
      let start = simTime;
      if (moment && simTime - moment.at < CONSEQUENCE.durationS) {
        const order = [...moment.tableGuestIds, ...moment.witnessIds];
        const rank = Math.max(0, order.indexOf(guestId));
        start = Math.max(simTime, moment.at + CONSEQUENCE.guests.firstGestureAt + rank * CONSEQUENCE.guests.staggerS);
      }
      this.begin(slot, value, start);
    } else if (!slot.clip && simTime >= slot.nextAt && idle) {
      this.begin(slot, value, simTime);
    }
    if (!slot.clip) return null;
    const spec = CLIPS[slot.clip];
    const elapsed = simTime - slot.startAt;
    const length = spec ? spec.seconds[slot.tempo] : 0;
    if (elapsed >= length) {
      slot.clip = null;
      slot.nextAt = simTime + this.gap(seed, guestId, slot.turn);
      return null;
    }
    // Väntar på sin tur, eller gästen gör något annat än att sitta: spelets klipp gäller.
    if (elapsed < 0 || !idle) return null;
    return { id: slot.clip, clip: sampleClip(slot.clip, elapsed, slot.tempo, { seatKind, seated: true }) };
  }

  private begin(slot: Slot, value: number, at: number): void {
    const list = MOOD_GESTURES[slot.mood];
    if (!list || list.length === 0) { slot.clip = null; return; }
    slot.clip = list[slot.turn % list.length];
    slot.turn++;
    slot.tempo = tempoFor(slot.mood, value);
    slot.startAt = at;
  }

  private gap(seed: number, guestId: string, turn: number): number {
    return GAP_S[0] + (GAP_S[1] - GAP_S[0]) * hashKey(seed, `${turn}|${guestId}|moodGap`);
  }
}
