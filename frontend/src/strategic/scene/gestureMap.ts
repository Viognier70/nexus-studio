// gestureMap.ts — D11: vilken gest hör till vilken stämning och vilken situation. Leverans 2026-10-10, ORDER 325.
// Designs fil, med talen i balance.ts (GESTURE_BALANCE) och MoodId ur guestMood.ts. Det som spelar kartan står i
// gestureDirector.ts (vinbaren och bistron) och village/PlayerTruckCrew.tsx (vagnen); gatan i village/.
// Syftet (Anders 2026-10-09): spelaren läser gästerna utan symboler. Det spelaren ser är ansiktet (figureFace.ts, från
// 30 m och närmare) och kroppen (figureClips.ts). Kartan säger vad sim-lagret spelar och när.
// Inga speltal: alla tider och sannolikheter är nycklar i GESTURE_BALANCE, som Code sätter i balance.ts.
// Texterna (situationernas namn och varför) är nycklar i d11Strings: 'gm.sit.<id>' och 'gm.why.<id>'.

import type { MoodId } from './guestMood';
import { GESTURE_BALANCE } from '../../sim/balance';

export type Place = 'winebar' | 'truck' | 'street';
export type Posture = 'seated' | 'standing' | 'walking';

/** Nycklarna i balance.ts (ORDER 325 satte talen). */
export { GESTURE_BALANCE };

/** Tempot är styrkan (figureClips moodK): lugn = antydd, normal, stressad = tydlig från 24 m. */
export const MOOD_STRENGTH: Record<MoodId, 'calm' | 'normal' | 'stressed'> = {
  delighted: 'stressed', content: 'normal', waiting: 'normal', impatient: 'stressed', displeased: 'stressed'
};

/** Stämningens egna gester, när inget särskilt händer. Väljs i tur och ordning per gäst, inte slumpvis.
 *  Ansiktet följer stämningen hela tiden; gesten kommer var {moodGestureEveryS}. */
export const MOOD_MAP: Record<MoodId, { face: MoodId; seated: string[]; standing: string[]; reads24m: string }> = {
  delighted: { face: 'delighted', seated: ['guest.laugh', 'guest.cheers', 'guest.leanTalk'], standing: ['guest.laughStand', 'guest.leanTalkStand'], reads24m: 'gm.read.delighted' },
  content: { face: 'content', seated: ['guest.leanTalk', 'guest.nodApprove', 'guest.leanCurious'], standing: ['guest.leanTalkStand', 'guest.nodApproveStand'], reads24m: 'gm.read.content' },
  waiting: { face: 'waiting', seated: ['guest.checkWatch', 'guest.shrug'], standing: ['guest.checkWatchStand', 'guest.shrugStand'], reads24m: 'gm.read.waiting' },
  impatient: { face: 'impatient', seated: ['guest.waveWaiter', 'guest.checkWatch'], standing: ['guest.waveWaiterStand', 'guest.checkWatchStand'], reads24m: 'gm.read.impatient' },
  displeased: { face: 'displeased', seated: ['guest.armsCrossed', 'guest.pushPlate'], standing: ['guest.armsCrossedStand'], reads24m: 'gm.read.displeased' }
};

export interface Situation {
  id: string;
  places: Place[];
  who: 'guest' | 'staff' | 'passer';
  /** Vad som utlöser gesten. Texten i d11Strings ('gm.sit.<id>'); villkoret för sim-lagret här. */
  when: string;
  clip: string;
  /** Den stående eller gående varianten, om platsen kräver den. */
  standing?: string;
  /** Stämningen gesten visar och sätter ansiktet till. null = ändrar inte ansiktet. */
  mood: MoodId | null;
  /** Högre går före. Raketens manus går alltid före kartan. */
  priority: number;
  repeat?: string;
}

export const SITUATIONS: Situation[] = [
  // ----- gästerna -----
  { id: 'readyToOrder', places: ['winebar'], who: 'guest', when: 'menyn stängd och ingen personal inom synhåll', clip: 'guest.waveStaff', standing: 'guest.waveStand', mood: 'content', priority: 3 },
  { id: 'ordering', places: ['winebar'], who: 'guest', when: 'servitören tar beställningen vid bordet', clip: 'guest.pointMenu', mood: 'content', priority: 4 },
  { id: 'winePoured', places: ['winebar'], who: 'guest', when: 'vinet är upphällt och inte smakat', clip: 'guest.smellWine', mood: null, priority: 4 },
  { id: 'firstBite', places: ['winebar', 'truck'], who: 'guest', when: 'första tuggan efter att rätten ställts fram, stämningen nöjd eller glad', clip: 'guest.nodFirstBite', standing: 'guest.nodFirstBiteStand', mood: 'content', priority: 4 },
  { id: 'firstBiteGreat', places: ['winebar', 'truck'], who: 'guest', when: 'första tuggan och rätten över gästens förväntan', clip: 'guest.nodFirstBite', standing: 'guest.nodFirstBiteStand', mood: 'delighted', priority: 4 },
  { id: 'dishBelow', places: ['winebar'], who: 'guest', when: 'rättens betyg under {pushPlateBelow}', clip: 'guest.pushPlate', mood: 'displeased', priority: 4 },
  { id: 'waitedLong', places: ['winebar', 'truck'], who: 'guest', when: 'väntat {waitWatchS} utan kontakt', clip: 'guest.checkWatch', standing: 'guest.checkWatchStand', mood: 'waiting', priority: 2, repeat: '{watchEveryS}' },
  { id: 'waitedTooLong', places: ['winebar', 'truck'], who: 'guest', when: 'väntat {waitWaveS} och personalen syns', clip: 'guest.waveWaiter', standing: 'guest.waveWaiterStand', mood: 'impatient', priority: 3 },
  { id: 'talking', places: ['winebar', 'truck'], who: 'guest', when: 'sällskap om två eller fler, ingen personal vid bordet, inte mitt i maten', clip: 'guest.leanTalk', standing: 'guest.leanTalkStand', mood: 'content', priority: 1 },
  { id: 'joke', places: ['winebar', 'truck'], who: 'guest', when: 'glad, sällskap om två eller fler, efter guest.leanTalk', clip: 'guest.laugh', standing: 'guest.laughStand', mood: 'delighted', priority: 1 },
  { id: 'drinksArrive', places: ['winebar'], who: 'guest', when: 'glasen till hela sällskapet har kommit, eller en händelse firas', clip: 'guest.cheers', mood: 'delighted', priority: 3 },
  { id: 'halfGrip', places: ['winebar', 'truck'], who: 'guest', when: 'halvt grepp i en situation (D8), eller nästan på frågekortet vid luckan (D9)', clip: 'guest.shrug', standing: 'guest.shrugStand', mood: 'waiting', priority: 5 },
  { id: 'soldOut', places: ['winebar', 'truck'], who: 'guest', when: 'det gästen ville ha är slut (korven, D10)', clip: 'guest.shrug', standing: 'guest.shrugStand', mood: 'waiting', priority: 4 },
  { id: 'wrongWitnessed', places: ['winebar', 'truck'], who: 'guest', when: 'gästen såg ett fel svar (guestMood.CONSEQUENCE), eller kylan i kön (D9)', clip: 'guest.armsCrossed', standing: 'guest.armsCrossedStand', mood: 'displeased', priority: 5 },
  // ----- personalen -----
  { id: 'twoOrMore', places: ['winebar'], who: 'staff', when: 'två eller fler glas eller tallrikar till samma bord', clip: 'waiter.carryTray', mood: null, priority: 3 },
  { id: 'pour', places: ['winebar'], who: 'staff', when: 'flaskan är vid bordet och glaset är tomt', clip: 'somm.pour', mood: null, priority: 3 },
  { id: 'tableLeft', places: ['winebar', 'truck'], who: 'staff', when: 'sällskapet har gått och bordet är avdukat, före nästa sällskap', clip: 'waiter.wipeTable', mood: null, priority: 2 },
  { id: 'guestSpeaks', places: ['winebar', 'truck'], who: 'staff', when: 'en gäst pratar med personalen (beställning, fråga, klagomål, vinkningen besvarad)', clip: 'staff.listenTilt', mood: null, priority: 4 },
  { id: 'seatParty', places: ['winebar', 'truck'], who: 'staff', when: 'värden visar ett sällskap till bordet, eller medhjälparen visar var man kan stå', clip: 'host.point', mood: null, priority: 3 },
  // ----- gatan -----
  { id: 'stroll', places: ['street'], who: 'passer', when: 'den som går förbi utan ärende, förvalet', clip: 'street.walkCalm', mood: null, priority: 0 },
  { id: 'hurry', places: ['street'], who: 'passer', when: 'regn, sent på kvällen (e över 0,8) eller på väg till bussen', clip: 'street.walkHurried', mood: null, priority: 1 },
  { id: 'withChild', places: ['street'], who: 'passer', when: 'par med barn, andelen {childShare} (fler på dagen)', clip: 'street.walkWithChild', mood: null, priority: 1 },
  { id: 'withDog', places: ['street'], who: 'passer', when: 'med hund, andelen {dogShare}, inte i hårt regn', clip: 'street.walkWithDog', mood: null, priority: 1 },
  { id: 'lookAt', places: ['street'], who: 'passer', when: 'inom {stopLookRadiusM} från en skylt, en meny eller ett upplyst fönster, sannolikheten {stopLookP}', clip: 'street.stopLook', mood: null, priority: 2 },
  { id: 'meetKnown', places: ['street'], who: 'passer', when: 'två ur byn som känner varandra inom {greetRadiusM}, sannolikheten {greetP}', clip: 'street.greet', mood: null, priority: 2 }
];

/** Reglerna för sim-lagret. */
export const GESTURE_RULES = {
  /** Gesten och ansiktet byts samtidigt (FACE_D11.swapMs). */
  faceWithGesture: true,
  /** En gest i taget per sällskap. Grannarna i samma sällskap börjar 0,18 s efter varandra (guestMood.CONSEQUENCE). */
  onePerParty: true, staggerS: 0.18,
  /** Medan personalen serverar eller tar beställningen vid bordet: bara de gester som hör till det (ordering, winePoured, firstBite). */
  quietWhileServed: ['ordering', 'winePoured', 'firstBite', 'firstBiteGreat'],
  /** Ordningen: raketens manus, sedan situationerna efter priority, sist stämningens egna gester (MOOD_MAP). */
  order: ['rocketScript', 'situation', 'mood'],
  /** Gesterna väljs i tur och ordning per gäst (index = gästens nummer), inte slumpvis, så att samma kväll ser likadan ut. */
  deterministic: true,
  /** Vid vagnen spelas den stående varianten (…Stand). I kön: checkWatchStand och armsCrossedStand (D9:s namn är alias). */
  standingAlias: { 'guest.checkWatch@queue': 'guest.checkWatchStand', 'guest.armsCrossed@queue': 'guest.armsCrossedStand' }
};

/** Välj gest för en gäst. state = det sim-lagret vet om gästen just nu. Ger klippets namn eller null. */
export function pickGesture(state: { mood: MoodId; posture: Posture; active: string[]; index: number; sinceLastS: number; cooldownS: number }): string | null {
  if (state.sinceLastS < state.cooldownS) return null;
  const cands = SITUATIONS.filter((s) => state.active.indexOf(s.id) >= 0).sort((a, b) => b.priority - a.priority);
  if (cands.length) { const s = cands[0]; return state.posture === 'seated' ? s.clip : (s.standing ?? s.clip); }
  const list = state.posture === 'seated' ? MOOD_MAP[state.mood].seated : MOOD_MAP[state.mood].standing;
  return list.length ? list[state.index % list.length] : null;
}
