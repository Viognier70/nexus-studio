// ORDER 299 — gästernas gester efter stämningen (Designs D1 §2 och §7).
// ORDER 325 — Designs D11-karta (gestureMap.ts): stämningens egna gester (MOOD_MAP), situationerna
// (SITUATIONS) och reglerna (GESTURE_RULES), med talen i balance.ts GESTURE_BALANCE. En sittande gäst som bara
// sitter (guest.seatedIdle) gör en gest när läget ändras, när en situation gäller och därefter då och då.
// Gester avbryter aldrig beställningen, notan eller samspelen vid bordet; den första tuggan är det enda som tar
// över ett annat klipp (guest.eat), som i kartan (quietWhileServed: firstBite).
// - Situationerna som simuleringen vet om i vinbaren och bistron:
//     wantsOrder / readyToOrder / waitedTooLong  ORDER 326 (D11 (46), GESTURE_RULES.wantLadder): gästen sitter utan att
//         ha beställt (Guest.state 'seated'). Från waitWatchS söker hen personalens blick (guest.seekEye, huvudet mot
//         den närmaste i personalen, annars mot baren: GestureGuestInfo.seekYaw), efter seekEyeS till kommer handen
//         upp (guest.waveStaff) och från waitWaveS den stora vinkningen (guest.waveWaiter). Stegen stannar när
//         personalen kommer till bordet (tillståndet byts). Därefter klockan (waitedLong) var watchEveryS.
//     ORDER 327 B: stegen läser signalen (GestureGuestInfo.want, scene/wantSignals.ts) i stället för Guest.state:
//         gästen är 'seated' bara 4 s i simuleringen (service.ts) och väntar på beställningen i 'ordering', så
//         stegen ur ORDER 326 startade aldrig i spelet. Signalerna är beställningen, mer i glaset och notan; vid
//         blickkontakt nickar gästen (guest.nodApprove) och stegen stannar.
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
// ORDER 332 B — Designs D12 (gestureMap.ts, figureLife.ts): olika personer, olika uttryck.
// - Temperamentet ur gästens nummer och grupp (figureLife.temperamentForGuest, balance.ts FIGURE_LIFE): gesten görs större
//   eller mindre mot vilan (scaleClip, sampleClip → scalePose här, innan WineBarFigures lägger posen).
// - Intensiteten ur trycket (figureLife.intensityOfGuest: hur djupt i stämningen, eller väntan mot waitWaveS): tempot och
//   ansiktets intensitet. Den ersätter MOOD_STRENGTH som tempo (D12 INTENSITY: svag lugnt, tydlig normalt, stark stressat).
// - Varianterna (pickVariantApart): A eller B ur gästens nummer och turen, vänster hand för var femte gäst, och två grannar
//   i samma sällskap gör aldrig samma variant samtidigt. sample() ger klippet som spelas (id) och kartans namn (base).
// - Svaren (REACTIONS, partyPlan): när någon i sällskapet pratar (guest.leanTalk, …B) lyssnar de andra mot hen; berättar
//   hen något roligt (guest.tellJoke, glad i sällskap varannan gång) svarar den närmaste vid poängen med temperamentets
//   svar, leendet sprider sig i platsordning och den som berättade småskrattar tillbaka; skrattar någon (guest.laugh)
//   vänder sig de andra mot hen och ler.

import { sampleClip, CLIPS, type ClipSample, type SeatKind, type TempoId } from './figureClips';
import { CONSEQUENCE } from './guestMood';
import { GESTURE_BALANCE, MOOD_BALANCE } from '../../sim/balance';
import { moodOf, type MoodId } from '../../sim/guestMood';
import { GESTURE_RULES, MOOD_MAP, REACTION_BALANCE, SITUATIONS, TEMPERAMENT, VARIANTS, pickGesture, pickVariantApart, type IntensityId, type TemperamentId } from './gestureMap';
import { ampOf, faceKOf, gestureBusy, guestNumber, intensityOfGuest, scaleClip, temperamentForGuest } from './figureLife';
import { FIGURE_LIFE } from '../../sim/balance';
import type { GuestGroupId } from './guestGroups';
import { WANT_SITUATION, type WantKind, type WantStep } from './wantSignals';
import type { ConsequenceMoment, GuestState } from '../types';
import { hashKey } from '../util/hash';

const IDLE = 'guest.seatedIdle';
const EAT = 'guest.eat';
const SEEK = 'guest.seekEye';
/** ORDER 327 B — nicken vid blickkontakt (Designs klipp; ingen situation i kartan). */
const NOD = 'guest.nodApprove';
const EYE_CONTACT = 'eyeContact';
/** Stämningens egna gester som kräver någon att prata med (kartans talking och joke). */
const TALK = new Set(['guest.leanTalk', 'guest.laugh']);
/** ORDER 332 B — de som pratar (de andra lyssnar), den som berättar något roligt och skratten (leendet sprider sig). */
const SPEAK = new Set(['guest.leanTalk', 'guest.leanTalkB', 'guest.tellJoke']);
const JOKE = 'guest.tellJoke';
const LAUGHS = new Set(['guest.laugh', 'guest.laughB', 'guest.chuckle']);
const LISTEN = 'guest.listen';
const SMILE = 'guest.smileTurn';
const CHUCKLE = 'guest.chuckle';
const BITE = new Set(['firstBite', 'firstBiteGreat', 'dishBelow']);

/** Det simuleringen vet om gästen, för situationerna. */
export interface GestureGuestInfo {
  state: GuestState;
  /** Simsekunder i tillståndet (Guest.stateTime). */
  stateSinceS: number;
  partyId: string | null;
  partySize: number;
  /** ORDER 326 — vinkeln från gästens blickriktning till den gästen söker (GESTURE_RULES.seekEyeTarget), radianer.
   *  Aldrig mot kameran (GESTURE_RULES.noCameraGaze). */
  seekYaw?: number;
  /** ORDER 327 B — vad gästen vill och steget i stegen (wantSignals.ts), eller null. */
  want?: { kind: WantKind; since: number; step: WantStep | null } | null;
  /** ORDER 332 B — gästgruppen (temperamentets andelar), sällskapet i platsordning (svaren) och vinkeln från gästen
   *  till en annan i sällskapet (den man lyssnar på eller ler mot), i gästens ram. */
  group?: GuestGroupId | null;
  partyIds?: readonly string[];
  yawTo?: (guestId: string) => number | null;
}

/** ORDER 332 B — ett svar i sällskapet: klippet från at (till until för lyssnandet, som loopar), mot lookAt, med ansiktet. */
export interface ReactionStep { reaction: 'listen' | 'jokeLands' | 'smileSpreads' | 'tellerReplies'; clip: string; at: number; until: number; lookAt: string; face: { mood: MoodId; intensity: IntensityId } }

/** ORDER 332 B (D12 d12Manus.party, ett varv) — svaren när en i sällskapet gör speakerClip från at i durS sekunder.
 *  members i platsordning, med temperamentet. Ger stegen per gäst och när sällskapet är klart. Rent, för testerna. */
export function partyPlan(members: readonly { id: string; temper: TemperamentId; number: number }[], speakerId: string, speakerClip: string, at: number, durS: number, clipSeconds: (clip: string) => number): { steps: Map<string, ReactionStep[]>; endS: number } {
  const steps = new Map<string, ReactionStep[]>();
  const push = (id: string, st: ReactionStep) => { const l = steps.get(id) ?? []; l.push(st); steps.set(id, l); };
  const sp = members.find((m) => m.id === speakerId);
  if (!sp) return { steps, endS: at + durS };
  // Platsordningen från den som pratar: närmast först.
  const i0 = members.indexOf(sp);
  const others = members.filter((m) => m.id !== speakerId).sort((a, b) => {
    const d = (m: typeof a) => { const k = Math.abs(members.indexOf(m) - i0); return Math.min(k, members.length - k); };
    return d(a) - d(b);
  });
  const end0 = at + durS;
  let endS = end0;
  const R = REACTION_BALANCE;
  if (speakerClip === JOKE) {
    const punch = at + R.punchU * durS;
    let firstReply: number | null = null;
    const busy: { clip: string; from: number; to: number }[] = [];
    others.forEach((m, i) => {
      const T = TEMPERAMENT[m.temper], replyAt = punch + T.reactDelayS + i * R.spreadS;
      const want = i === 0 || m.temper === 'lively' ? T.jokeReply : SMILE;
      // Grannarna gör inte samma variant samtidigt (VARIANT_RULES.neighboursDiffer).
      const nearby = busy.filter((b) => b.from < replyAt + clipSeconds(want) && b.to > replyAt).map((b) => b.clip);
      const reply = pickVariantApart(want, m.number, 0, nearby).clip;
      push(m.id, { reaction: 'listen', clip: LISTEN, at: at + T.reactDelayS, until: replyAt, lookAt: speakerId, face: { mood: 'content', intensity: 'weak' } });
      push(m.id, { reaction: i === 0 ? 'jokeLands' : 'smileSpreads', clip: reply, at: replyAt, until: replyAt + clipSeconds(reply), lookAt: i === 0 ? speakerId : others[0].id, face: { mood: 'delighted', intensity: i === 0 ? 'clear' : 'weak' } });
      busy.push({ clip: reply, from: replyAt, to: replyAt + clipSeconds(reply) });
      if (firstReply === null) firstReply = replyAt;
      endS = Math.max(endS, replyAt + clipSeconds(reply));
    });
    if (firstReply !== null && others.length) {
      const back = Math.max(end0, firstReply + TEMPERAMENT[sp.temper].reactDelayS);
      push(speakerId, { reaction: 'tellerReplies', clip: CHUCKLE, at: back, until: back + clipSeconds(CHUCKLE), lookAt: others[0].id, face: { mood: 'delighted', intensity: 'clear' } });
      endS = Math.max(endS, back + clipSeconds(CHUCKLE));
    }
  } else if (LAUGHS.has(speakerClip)) {
    // Leendet sprider sig: de andra vänder sig mot den som skrattar, i platsordning.
    others.forEach((m, i) => {
      const T = TEMPERAMENT[m.temper], replyAt = at + T.reactDelayS + i * R.spreadS;
      const reply = m.temper === 'lively' ? pickVariantApart(T.jokeReply, m.number, 0, [speakerClip]).clip : SMILE;
      push(m.id, { reaction: 'smileSpreads', clip: reply, at: replyAt, until: replyAt + clipSeconds(reply), lookAt: speakerId, face: { mood: 'delighted', intensity: 'weak' } });
      endS = Math.max(endS, replyAt + clipSeconds(reply));
    });
  } else {
    for (const m of others) push(m.id, { reaction: 'listen', clip: LISTEN, at: at + TEMPERAMENT[m.temper].reactDelayS, until: end0, lookAt: speakerId, face: { mood: 'content', intensity: 'weak' } });
  }
  return { steps, endS };
}

interface Slot {
  guestId: string; mood: MoodId; clip: string | null; situation: string | null; face: MoodId | null;
  tempo: TempoId; startAt: number; nextAt: number; turn: number;
  /** ORDER 332 B — gästens nummer, temperament, gestens storlek och hand, ansiktets intensitet, och hur många gånger
   *  gästen gjort varje gest (varianterna). */
  number: number; temper: TemperamentId; amp: number; hand: 'L' | 'R'; faceK: number; counts: Map<string, number>;
  /** Kartans namn på gesten som spelas (utan variant). */
  base: string | null;
  lastWatchAt: number; waved: boolean; handUp: boolean; ateAt: number | null; biteDone: boolean; lastEnd: number;
  /** ORDER 327 B — stegen som spelas: när den började, och om nicken är gjord. */
  wantSince: number; nodded: boolean;
}

export class MoodGestures {
  private slots: (Slot | null)[];
  /** Sällskapets gest pågår till (simsekund). */
  private partyBusy = new Map<string, number>();
  /** ORDER 332 B — svaren som väntar eller spelas, per gäst; och det som spelas just nu per figur. */
  private reactions = new Map<string, ReactionStep[]>();
  private partyPlaying = new Map<string, Map<string, { clip: string; until: number }>>();
  private playing: ({ step: ReactionStep | null } | null)[];

  constructor(pool: number) {
    this.slots = Array.from({ length: pool }, () => null);
    this.playing = Array.from({ length: pool }, () => null);
  }

  /** Figuren i sitter inte (eller är någon annan): ingen gest. */
  reset(i: number): void {
    this.slots[i] = null;
    this.playing[i] = null;
  }

  /** Ansiktet medan gesten spelas (situationens stämning), annars null: stämningen gäller. */
  faceFor(i: number): MoodId | null {
    const r = this.playing[i]?.step;
    if (r) return r.face.mood;
    const s = this.slots[i];
    return s && s.clip ? s.face : null;
  }

  /** ORDER 332 B — ansiktets intensitet (figureFace k) medan gesten eller svaret spelas, annars null. */
  faceKFor(i: number): number | null {
    const s = this.slots[i];
    const r = this.playing[i]?.step;
    if (r && s) return faceKOf(r.face.intensity, s.temper);
    return s && s.clip ? s.faceK : null;
  }

  /** ORDER 332 B — temperamentet för figuren i (lugn om ingen gäst sitter där). */
  temperOf(i: number): TemperamentId {
    return this.slots[i]?.temper ?? 'calm';
  }

  /** ORDER 332 B — svaret som spelas för figuren i, för kontrollen och testerna. */
  reactionOf(i: number): ReactionStep['reaction'] | null {
    return this.playing[i]?.step?.reaction ?? null;
  }

  /** Situationen som spelas för figuren i, för kontrollen och testerna. */
  situationOf(i: number): string | null {
    const s = this.slots[i];
    return s && s.clip ? s.situation : null;
  }

  /** Gesten för figuren i, eller null när spelets eget klipp gäller. */
  /** Gesten för figuren i, eller null när spelets eget klipp gäller. id = klippet som spelas (med variant), base = kartans
   *  namn, clip = posen i temperamentets storlek, busy = hur upptagen gästen är av gesten (figureLife.gestureBusy). */
  sample(i: number, guestId: string | null, baseClipId: string | null, value: number, simTime: number, seatKind: SeatKind | null, moment: ConsequenceMoment | null | undefined, seed: number, info?: GestureGuestInfo | null): GestureSample | null {
    if (!guestId || !seatKind) { this.slots[i] = null; this.playing[i] = null; return null; }
    let slot = this.slots[i];
    const mood = moodOf(value);
    if (!slot || slot.guestId !== guestId) {
      const number = guestNumber(guestId), temper = temperamentForGuest(guestId, info?.group ?? null);
      slot = { guestId, mood, clip: null, situation: null, face: null, tempo: 'normal', startAt: 0, nextAt: simTime + this.gap(seed, guestId, 0), turn: 0, lastWatchAt: -Infinity, waved: false, handUp: false, ateAt: null, biteDone: false, lastEnd: -Infinity, wantSince: NaN, nodded: false,
        number, temper, amp: 1, hand: 'R', faceK: faceKOf('clear', temper), counts: new Map(), base: null };
      this.slots[i] = slot;
      this.playing[i] = null;
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
    } else if (!slot.clip && !this.reactionNow(guestId, simTime)) {
      const active: string[] = [];
      const want = info?.want ?? null;
      if (want && want.since !== slot.wantSince) {
        // En ny vilja, eller stegen började om: blicken först igen.
        slot.wantSince = want.since; slot.handUp = false; slot.waved = false; slot.nodded = false; slot.lastWatchAt = -Infinity;
      }
      if (want && want.step) {
        // Stegen: blicken, handen, vinkningen (wantLadder), och nicken vid blickkontakt.
        if (want.step === 'nod') { if (!slot.nodded) active.push(EYE_CONTACT); }
        else if (want.step === 'wave' && !slot.waved) active.push('waitedTooLong');
        else if (want.step === 'hand' && !slot.handUp) active.push('readyToOrder');
        else if (want.step === 'eye') active.push(WANT_SITUATION[want.kind]);
        else if (want.step === 'wave' && simTime - slot.lastWatchAt >= B.watchEveryS) active.push('waitedLong');
      }
      if (eating && !slot.biteDone && slot.ateAt !== null && simTime - slot.ateAt < B.firstBiteWithinS) {
        active.push(value >= MOOD_BALANCE.threshold.delighted ? 'firstBiteGreat' : value < B.pushPlateBelow ? 'dishBelow' : 'firstBite');
      }
      const bite = active.some((a) => BITE.has(a));
      if (active.length && (idle || bite) && partyFree && (simTime >= slot.lastEnd + B.gestureCooldownS || active.includes(EYE_CONTACT))) this.begin(slot, value, simTime, active, info, party);
      else if (simTime >= slot.nextAt && idle && partyFree) this.begin(slot, value, simTime, [], info, party);
    }
    if (slot.clip) {
      const spec = CLIPS[slot.clip];
      const elapsed = simTime - slot.startAt;
      const length = spec ? spec.seconds[slot.tempo] : 0;
      if (elapsed >= length) {
        slot.clip = null;
        slot.base = null;
        slot.situation = null;
        slot.lastEnd = simTime;
        slot.nextAt = simTime + Math.max(B.gestureCooldownS, this.gap(seed, guestId, slot.turn));
      } else {
        // Väntar på sin tur, eller gästen gör något annat än att sitta: spelets klipp gäller (utom första tuggan).
        const biteNow = !!slot.situation && BITE.has(slot.situation) && eating;
        if (elapsed < 0 || !(idle || biteNow)) { this.playing[i] = null; return null; }
        this.playing[i] = { step: null };
        const yaw = slot.clip === SEEK || slot.clip === SEEK + 'B' ? info?.seekYaw ?? 0 : undefined;
        // ORDER 332 B (D12 §2: sampleClip → scalePose) — gesten i temperamentets och intensitetens storlek.
        const raw = sampleClip(slot.clip, elapsed, slot.tempo, { seatKind, seated: true, hand: slot.hand, ...(yaw !== undefined ? { yaw } : {}) });
        return { id: slot.clip, base: slot.base ?? slot.clip, clip: scaleClip(raw, slot.amp, seatKind), amp: slot.amp, busy: gestureBusy(slot.clip, raw.u) };
      }
    }
    // ORDER 332 B — svaren i sällskapet (partyPlan), när gästen bara sitter och inte gör en egen gest.
    const steps = this.reactions.get(guestId);
    if (steps) {
      while (steps.length && steps[0].until <= simTime) steps.shift();
      if (!steps.length) this.reactions.delete(guestId);
    }
    const step = steps && steps.length && steps[0].at <= simTime ? steps[0] : null;
    if (!step || !idle) { this.playing[i] = null; return null; }
    this.playing[i] = { step };
    const spec = CLIPS[step.clip];
    if (!spec) return null;
    const elapsed = simTime - step.at;
    const yaw = info?.yawTo?.(step.lookAt) ?? 0;
    const amp = ampOf('clear', slot.temper);
    const raw = sampleClip(step.clip, spec.loop ? elapsed : Math.min(elapsed, spec.seconds.normal), 'normal', { seatKind, seated: true, yaw, hand: slot.hand });
    return { id: step.clip, base: step.clip, clip: scaleClip(raw, amp, seatKind), amp, busy: gestureBusy(step.clip, raw.u) };
  }

  private begin(slot: Slot, value: number, at: number, active: string[], info: GestureGuestInfo | null | undefined, party: string | null): void {
    const solo = (info?.partySize ?? 1) < 2;
    let clip: string | null;
    let situation: string | null = null;
    let face: MoodId | null = null;
    // ORDER 332 B — intensiteten ur trycket: hur djupt i stämningen, eller väntan mot vinkningens gräns.
    const want = info?.want ?? null;
    const intensity = intensityOfGuest(value, want ? { s: at - want.since, waveS: GESTURE_BALANCE.waitWaveS } : null);
    // Grannarnas klipp just nu (VARIANT_RULES.neighboursDiffer).
    const nearby = party ? this.partyClips(party, slot.guestId, at) : [];
    for (const [id, st] of this.reactions) if (!st.length || st[st.length - 1].until < at - 60) this.reactions.delete(id);
    if (active.includes(EYE_CONTACT)) {
      clip = pickVariantApart(NOD, slot.number + slot.turn, 0, nearby).clip;
      situation = EYE_CONTACT;
      face = 'content';
    } else if (active.length) {
      clip = pickGesture({ mood: slot.mood, posture: 'seated', active, index: slot.turn, sinceLastS: Infinity, cooldownS: 0, temperament: slot.temper, intensity, count: slot.number, nearby })?.clip ?? null;
      const sit = SITUATIONS.filter((x) => active.includes(x.id)).sort((a, b) => b.priority - a.priority)[0];
      situation = sit?.id ?? null;
      face = sit?.mood ?? null;
    } else {
      const list = MOOD_MAP[slot.mood].seated.filter((c) => !(solo && TALK.has(c)));
      clip = list.length ? list[slot.turn % list.length] : null;
      // Glad i sällskap: varannan gång berättar gästen något roligt (D12 guest.tellJoke, REACTIONS.jokeLands).
      if (clip === 'guest.leanTalk' && slot.mood === 'delighted' && !solo && (slot.number + slot.turn) % 2 === 0) clip = JOKE;
      if (clip) clip = pickVariantApart(clip, slot.number + slot.turn, 0, nearby).clip;
      face = MOOD_MAP[slot.mood].face;
    }
    if (!clip || !CLIPS[clip]) { slot.clip = null; slot.base = null; return; }
    slot.clip = clip;
    slot.base = baseOf(clip);
    slot.situation = situation;
    slot.face = face;
    slot.turn++;
    slot.counts.set(slot.base, (slot.counts.get(slot.base) ?? 0) + 1);
    // ORDER 332 B (D12 INTENSITY) — tempot ur intensiteten; första tuggan över förväntan alltid stressat.
    slot.tempo = situation === 'firstBiteGreat' ? 'stressed' : this.tempo(intensity);
    slot.amp = ampOf(intensity, slot.temper);
    slot.faceK = faceKOf(intensity, slot.temper);
    slot.hand = handOf(slot.number);
    slot.startAt = at;
    if (situation === 'waitedLong') slot.lastWatchAt = at;
    if (situation === 'waitedTooLong') slot.waved = true;
    if (situation === 'readyToOrder') slot.handUp = true;
    if (situation === EYE_CONTACT) slot.nodded = true;
    if (situation && BITE.has(situation)) slot.biteDone = true;
    const len = CLIPS[clip].seconds[slot.tempo];
    let busyUntil = at + len;
    if (party) this.clipsInParty(party).set(slot.guestId, { clip, until: at + len });
    // ORDER 332 B — svaren: de andra lyssnar, skrattar och ler (partyPlan).
    if (party && !situation && (SPEAK.has(clip) || LAUGHS.has(clip)) && info?.partyIds && info.partyIds.length > 1) {
      const members = info.partyIds.map((id) => ({ id, temper: temperamentForGuest(id, info.group ?? null), number: guestNumber(id) }));
      const plan = partyPlan(members, slot.guestId, clip, at, len, (c) => CLIPS[c]?.seconds.normal ?? 0);
      for (const [id, st] of plan.steps) this.reactions.set(id, st);
      busyUntil = Math.max(busyUntil, plan.endS);
    }
    if (party && GESTURE_RULES.onePerParty) this.partyBusy.set(party, busyUntil + GESTURE_RULES.staggerS);
  }

  /** Ett svar väntar eller spelas för gästen (då gör hen ingen egen gest). */
  private reactionNow(guestId: string, simTime: number): boolean {
    const steps = this.reactions.get(guestId);
    return !!steps && steps.some((s) => s.until > simTime && s.at <= simTime + 0.05);
  }

  private clipsInParty(party: string): Map<string, { clip: string; until: number }> {
    let m = this.partyPlaying.get(party);
    if (!m) { m = new Map(); this.partyPlaying.set(party, m); }
    return m;
  }

  private partyClips(party: string, except: string, at: number): string[] {
    const m = this.partyPlaying.get(party);
    if (!m) return [];
    const out: string[] = [];
    for (const [id, p] of m) {
      if (p.until <= at) m.delete(id);
      else if (id !== except) out.push(p.clip);
    }
    if (m.size === 0) this.partyPlaying.delete(party);
    return out;
  }

  private tempo(intensity: IntensityId): TempoId {
    return FIGURE_LIFE.intensity[intensity].tempo;
  }

  private gap(seed: number, guestId: string, turn: number): number {
    const B = GESTURE_BALANCE;
    return B.moodGestureEveryS + B.moodGestureJitter * (2 * hashKey(seed, `${turn}|${guestId}|moodGap`) - 1);
  }
}

/** ORDER 332 B — de stående namnen för svaren och pratet (vagnen), som D12 d12Manus STAND. */
export const STANDING_OF: Record<string, string> = {
  'guest.listen': 'guest.listenStand', 'guest.tellJoke': 'guest.tellJokeStand', 'guest.chuckle': 'guest.chuckleStand',
  'guest.smileTurn': 'guest.smileTurnStand', 'guest.laugh': 'guest.laughStand', 'guest.laughB': 'guest.laughStandB',
  'guest.leanTalk': 'guest.leanTalkStand', 'guest.leanTalkB': 'guest.leanTalkStandB'
};

/** ORDER 332 B — samtalet vid ett ståbord (vagnen), en ren funktion av tiden: varven är FIGURE_LIFE.conversationTurnS
 *  långa och de som står vid bordet turas om i platsordning att prata (guest.leanTalk, …B), eller berätta något roligt
 *  om den som pratar är glad (varannan tur); de andra svarar som i partyPlan. tableSeed 0..1 förskjuter varven per bord.
 *  Ger klippet (stående) och tiden i det för id, vem hen tittar på och ansiktet, eller null (vilar). */
export function conversationAt(members: readonly { id: string; temper: TemperamentId; number: number; glad: boolean }[], id: string, t: number, tableSeed: number): { clip: string; u: number; lookAt: string; face: { mood: MoodId; intensity: IntensityId } } | null {
  const n = members.length;
  if (n < 2 || !members.some((m) => m.id === id)) return null;
  const T = FIGURE_LIFE.conversationTurnS, off = tableSeed * T;
  const k = Math.floor((t + off) / T), start = k * T - off;
  const sp = members[((k % n) + n) % n];
  const said = sp.glad && k % 2 === 0 ? JOKE : pickVariantApart('guest.leanTalk', sp.number + k, 0, []).clip;
  const sec = (c: string) => CLIPS[STANDING_OF[c] ?? c]?.seconds.normal ?? CLIPS[c]?.seconds.normal ?? 0;
  const dur = sec(said);
  const next = members[(members.indexOf(sp) + 1) % n].id;
  if (id === sp.id && t - start < dur) return { clip: STANDING_OF[said] ?? said, u: t - start, lookAt: next, face: { mood: sp.glad ? 'delighted' : 'content', intensity: 'clear' } };
  const plan = partyPlan(members, sp.id, said, start, dur, sec);
  const step = (plan.steps.get(id) ?? []).find((x) => x.at <= t && t < x.until);
  if (!step) return null;
  return { clip: STANDING_OF[step.clip] ?? step.clip, u: t - step.at, lookAt: step.lookAt, face: step.face };
}

/** ORDER 332 B — det sample() ger. */
export interface GestureSample { id: string; base: string; clip: ClipSample; amp: number; busy: number }

/** Kartans namn för en variant (guest.laughB → guest.laugh). */
export function baseOf(clip: string): string {
  for (const k in VARIANTS) if (VARIANTS[k].indexOf(clip) > 0) return k;
  return clip;
}

/** Vänster hand för var femte gäst (balance.ts FIGURE_LIFE.leftHandShare), ur gästens nummer som pickVariant. */
export function handOf(number: number): 'L' | 'R' {
  return pickVariantApart('', number, 0, []).hand;
}
