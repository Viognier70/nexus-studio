// gestureMap.ts — D11: vilken gest hör till vilken stämning och vilken situation. Leverans 2026-10-10, ORDER 325;
// omtaget (46) med att söka personalens blick, ORDER 326.
// Designs fil, med talen i balance.ts (GESTURE_BALANCE) och MoodId ur guestMood.ts. Det som spelar kartan står i
// moodGestures.ts (vinbaren och bistron) och village/PlayerTruckCrew.tsx (vagnen); gatan i village/.
// Syftet (Anders 2026-10-09): spelaren läser gästerna utan symboler. Det spelaren ser är ansiktet (figureFace.ts, från
// 30 m och närmare) och kroppen (figureClips.ts). Kartan säger vad sim-lagret spelar och när.
// Inga speltal: alla tider och sannolikheter är nycklar i GESTURE_BALANCE, som Code sätter i balance.ts.
// Texterna (situationernas namn och varför) är nycklar i d11Strings: 'gm.sit.<id>' och 'gm.why.<id>'.
// ORDER 332 B — Designs D12 (2026-10-11): temperament, intensitet, varianter, svaren (REACTIONS) och livet i vila
// (LIFE_RULES) längst ned, och pickGesture() som ger klipp, variant, hand, tempo, storlek och ansikte. Talen som Design
// lämnade som platshållare står i balance.ts FIGURE_LIFE; här läses de därifrån.

import type { MoodId } from './guestMood';
import { FIGURE_LIFE, GESTURE_BALANCE } from '../../sim/balance';

export type Place = 'winebar' | 'truck' | 'street';
export type Posture = 'seated' | 'standing' | 'walking';

/** Nycklarna i balance.ts (ORDER 325 och 326 satte talen). */
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
  waiting: { face: 'waiting', seated: ['guest.seekEye', 'guest.checkWatch', 'guest.shrug'], standing: ['guest.seekEyeStand', 'guest.checkWatchStand', 'guest.shrugStand'], reads24m: 'gm.read.waiting' },
  impatient: { face: 'impatient', seated: ['guest.waveWaiter', 'guest.seekEye', 'guest.checkWatch'], standing: ['guest.waveWaiterStand', 'guest.seekEyeStand', 'guest.checkWatchStand'], reads24m: 'gm.read.impatient' },
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
  // Gästen vill något: först blicken (seekEye), sedan handen (waveStaff), sedan den stora vinkningen (waveWaiter). wantLadder.
  { id: 'wantsOrder', places: ['winebar'], who: 'guest', when: 'menyn stängd, personalen syns men tittar inte hitåt', clip: 'guest.seekEye', mood: 'waiting', priority: 3, repeat: 'tills blickkontakt eller {seekEyeS}' },
  { id: 'wantsRefill', places: ['winebar'], who: 'guest', when: 'glaset tomt och flaskan slut eller inte vid bordet', clip: 'guest.seekEye', mood: 'waiting', priority: 3 },
  { id: 'wantsBill', places: ['winebar'], who: 'guest', when: 'ätit klart, notan inte kommen', clip: 'guest.seekEye', mood: 'waiting', priority: 3 },
  { id: 'wantsHatch', places: ['truck'], who: 'guest', when: 'vid ståbordet och vill ha något från luckan (servett, sås, en till)', clip: 'guest.seekEyeStand', standing: 'guest.seekEyeStand', mood: 'waiting', priority: 3 },
  { id: 'readyToOrder', places: ['winebar'], who: 'guest', when: 'sökt blicken i {seekEyeS} utan att någon sett det', clip: 'guest.waveStaff', standing: 'guest.waveStand', mood: 'content', priority: 3 },
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
  /** När gästen vill något: blicken först, sedan handen, sedan den stora vinkningen. Ett steg upp efter {seekEyeS} och {waitWaveS}.
   *  Får gästen blickkontakt (personalen vänder sig mot bordet, staff.listenTilt eller ett steg mot bordet) stannar stegen. */
  wantLadder: ['guest.seekEye', 'guest.waveStaff', 'guest.waveWaiter'],
  /** Blicken söks mot den närmaste i personalen som syns från platsen, annars mot baren (bartenderns plats). */
  seekEyeTarget: ['nearestStaffInSight', 'bar'],
  /** Ordningen: raketens manus, sedan situationerna efter priority, sist stämningens egna gester (MOOD_MAP). */
  order: ['rocketScript', 'situation', 'mood'],
  /** Gesterna väljs i tur och ordning per gäst (index = gästens nummer), inte slumpvis, så att samma kväll ser likadan ut. */
  deterministic: true,
  /** Vid vagnen spelas den stående varianten (…Stand). I kön: checkWatchStand och armsCrossedStand (D9:s namn är alias). */
  standingAlias: { 'guest.checkWatch@queue': 'guest.checkWatchStand', 'guest.armsCrossed@queue': 'guest.armsCrossedStand' },
  /** Beslut 2026-10-10: gästerna lyfter aldrig blicken mot kameran. Huvudet vänds bara mot något i rummet. */
  noCameraGaze: true
};

// ===== D12: temperament, intensitet, varianter och svar (2026-10-11), ORDER 332 B =====
// Anders 2026-10-11: samma känsla ska se olika ut hos olika personer, varje uttryck ska ha minst tre nivåer, och två gäster
// ska inte vinka exakt likadant. Uttrycket ska vara svar på något.

export type TemperamentId = 'calm' | 'lively' | 'reserved';
export type IntensityId = 'weak' | 'clear' | 'strong';
export const TEMPERAMENTS: readonly TemperamentId[] = ['calm', 'lively', 'reserved'];

export interface Temperament {
  /** Gestens storlek: avvikelsen från vilan gånger amp (figureLife.scalePose). Benen och sitthöjden skalas inte. */
  readonly amp: number;
  /** Ansiktets intensitet gånger faceK (ovanpå INTENSITY.faceK). */
  readonly faceK: number;
  /** Hur lång tid ett uttryck tar att gå över i nästa (figureFace, 0,3–0,6 s). */
  readonly faceTransS: number;
  /** Hur fort figuren svarar på något (ett skämt, en vinkning, någon som går förbi). */
  readonly reactDelayS: number;
  /** Svaret på ett skämt: det klipp temperamentet väljer (REACTIONS.jokeLands). */
  readonly jokeReply: string;
  /** Livet i vila (figureLife.lifeTimeline): sekunder mellan blinkningar och blickar, blickens vinkel i radianer,
   *  hur länge den hålls, huvudets drift i radianer, och hur ofta en stående figur flyttar tyngden. */
  readonly blinkEveryS: readonly [number, number]; readonly glanceEveryS: readonly [number, number]; readonly glanceYaw: number;
  readonly glanceHoldS: readonly [number, number]; readonly drift: number; readonly shiftEveryS: readonly [number, number];
}

/** Talen i balance.ts FIGURE_LIFE.temperament (prototypens). */
export const TEMPERAMENT: Record<TemperamentId, Temperament> = FIGURE_LIFE.temperament;

export type TemperamentShare = Record<TemperamentId, number>;
/** Andelen av varje temperament per gästgrupp (guestGroups.ts), balance.ts FIGURE_LIFE.temperamentShare. null = lika många. */
export const TEMPERAMENT_BALANCE = { share: FIGURE_LIFE.temperamentShare };
/** Temperamentet för en gäst, deterministiskt ur gästens nummer (samma kväll ser likadan ut). Personalen är 'calm'. */
export function temperamentOf(index: number, share?: TemperamentShare | null): TemperamentId {
  const s = share ?? { calm: 1, lively: 1, reserved: 1 };
  const tot = TEMPERAMENTS.reduce((a, k) => a + s[k], 0), h = ((index * 2654435761) >>> 0) / 4294967296 * tot;
  let acc = 0; for (const k of TEMPERAMENTS) { acc += s[k]; if (h < acc) return k; } return 'calm';
}

/** Tre nivåer per uttryck. tempo = klippets tempo (och därmed moodK), faceK = ansiktets intensitet (figureFace.FACE_INTENSITY),
 *  amp = gestens storlek ovanpå temperamentet. Måttligt otålig = 'clear', mycket otålig = 'strong'. */
export const INTENSITY: Record<IntensityId, { tempo: 'calm' | 'normal' | 'stressed'; faceK: number; amp: number }> = {
  weak: { ...FIGURE_LIFE.intensity.weak, faceK: FIGURE_LIFE.faceIntensity.weak },
  clear: { ...FIGURE_LIFE.intensity.clear, faceK: FIGURE_LIFE.faceIntensity.clear },
  strong: { ...FIGURE_LIFE.intensity.strong, faceK: FIGURE_LIFE.faceIntensity.strong }
};
/** Nivån ur trycket i det sim-lagret mäter (väntan mot {waitWaveS}, rättens betyg mot förväntan, glädjen i sällskapet), 0..1.
 *  Under weakBelow svag, från strongFrom stark (balance.ts FIGURE_LIFE.intensityBounds). */
export const INTENSITY_BALANCE = FIGURE_LIFE.intensityBounds;
export function intensityFor(pressure: number): IntensityId {
  const lo = INTENSITY_BALANCE.weakBelow, hi = INTENSITY_BALANCE.strongFrom;
  return pressure < lo ? 'weak' : pressure >= hi ? 'strong' : 'clear';
}

/** Minst två varianter per vanlig gest. A är klippet från D1/D11, B är nytt i D12. */
export const VARIANTS: Record<string, string[]> = {
  'guest.waveStaff': ['guest.waveStaff', 'guest.waveStaffB'], 'guest.waveWaiter': ['guest.waveWaiter', 'guest.waveWaiterB'],
  'guest.waveStand': ['guest.waveStand', 'guest.waveStandB'], 'guest.waveWaiterStand': ['guest.waveWaiterStand', 'guest.waveWaiterStandB'],
  'guest.laugh': ['guest.laugh', 'guest.laughB'], 'guest.laughStand': ['guest.laughStand', 'guest.laughStandB'],
  'guest.leanTalk': ['guest.leanTalk', 'guest.leanTalkB'], 'guest.leanTalkStand': ['guest.leanTalkStand', 'guest.leanTalkStandB'],
  'guest.nodApprove': ['guest.nodApprove', 'guest.nodApproveB'], 'guest.nodApproveStand': ['guest.nodApproveStand', 'guest.nodApproveStandB'],
  'guest.checkWatch': ['guest.checkWatch', 'guest.checkWatchB'], 'guest.checkWatchStand': ['guest.checkWatchStand', 'guest.checkWatchStandB'],
  'guest.armsCrossed': ['guest.armsCrossed', 'guest.armsCrossedB'], 'guest.armsCrossedStand': ['guest.armsCrossedStand', 'guest.armsCrossedStandB'],
  'guest.shrug': ['guest.shrug', 'guest.shrugB'], 'guest.shrugStand': ['guest.shrugStand', 'guest.shrugStandB'],
  'guest.seekEye': ['guest.seekEye', 'guest.seekEyeB'], 'guest.seekEyeStand': ['guest.seekEyeStand', 'guest.seekEyeStandB'],
  'guest.cheers': ['guest.cheers', 'guest.cheersB']
};
/** Variantregeln: gästens nummer och hur många gånger hen gjort gesten väljer A eller B, och var femte gäst använder
 *  vänster hand i enhandsklippen (balance.ts FIGURE_LIFE.leftHandShare). Två grannar vid samma bord får aldrig samma
 *  variant samtidigt (pickVariantApart). */
export const VARIANT_RULES = { byIndex: true, neighboursDiffer: true, leftHandShare: FIGURE_LIFE.leftHandShare };
export function pickVariant(clip: string, index: number, count: number): { clip: string; hand: 'L' | 'R' } {
  const v = VARIANTS[clip], share = VARIANT_RULES.leftHandShare;
  const hand: 'L' | 'R' = ((((index * 7919) % 100) + 100) % 100) / 100 < share ? 'L' : 'R';
  return { clip: v ? v[(((index + count) % v.length) + v.length) % v.length] : clip, hand };
}
/** ORDER 332 B (VARIANT_RULES.neighboursDiffer) — som pickVariant, men gör grannen redan samma variant (nearby: klippen
 *  grannarna vid bordet spelar just nu) tas nästa variant. Har gesten bara en variant står den kvar. */
export function pickVariantApart(clip: string, index: number, count: number, nearby: readonly string[]): { clip: string; hand: 'L' | 'R' } {
  const p = pickVariant(clip, index, count), v = VARIANTS[clip];
  if (!v || nearby.indexOf(p.clip) < 0) return p;
  for (let k = 1; k < v.length; k++) { const c = v[(v.indexOf(p.clip) + k) % v.length]; if (nearby.indexOf(c) < 0) return { clip: c, hand: p.hand }; }
  return p;
}

/** Svaren. När två figurer möts reagerar de på varandra: den ena gör något, den andra svarar med ansikte och kropp.
 *  delayS = temperamentets reactDelayS om inget annat står. Ansiktet går över på temperamentets faceTransS. */
export interface Reaction { id: string; places: Place[]; trigger: string; who: string; clip: string; standing?: string; face: { mood: MoodId; intensity: IntensityId } | null; delay: string; then?: string }
export const REACTIONS: Reaction[] = [
  { id: 'listen', places: ['winebar', 'truck'], trigger: 'någon i sällskapet spelar guest.leanTalk, guest.tellJoke eller pratar med personalen', who: 'de andra i sällskapet', clip: 'guest.listen', standing: 'guest.listenStand', face: { mood: 'content', intensity: 'weak' }, delay: 'reactDelayS' },
  { id: 'jokeLands', places: ['winebar', 'truck'], trigger: 'poängen i guest.tellJoke (u = punchU)', who: 'den som lyssnar närmast', clip: 'TEMPERAMENT.jokeReply (livlig skrattar, lugn småskrattar, reserverad ler)', face: { mood: 'delighted', intensity: 'clear' }, delay: 'reactDelayS', then: 'smileSpreads' },
  { id: 'smileSpreads', places: ['winebar', 'truck'], trigger: 'någon i sällskapet skrattar (guest.laugh, guest.laughB, guest.chuckle)', who: 'de andra i sällskapet, i platsordning från den som skrattar', clip: 'guest.smileTurn, eller TEMPERAMENT.jokeReply för den som är livlig', standing: 'guest.smileTurnStand', face: { mood: 'delighted', intensity: 'weak' }, delay: 'reactDelayS + spreadS × platsens ordning' },
  { id: 'tellerReplies', places: ['winebar', 'truck'], trigger: 'den första lyssnaren skrattar', who: 'den som berättade', clip: 'guest.chuckle', standing: 'guest.chuckleStand', face: { mood: 'delighted', intensity: 'clear' }, delay: 'reactDelayS' },
  { id: 'staffSpeaks', places: ['winebar', 'truck'], trigger: 'personalen kommer till bordet eller luckan och lyssnar (staff.listenTilt)', who: 'gästen som pratar', clip: 'guest.leanTalk', standing: 'guest.leanTalkStand', face: { mood: 'content', intensity: 'clear' }, delay: 'reactDelayS' },
  { id: 'badNews', places: ['winebar', 'truck'], trigger: 'något är slut eller dröjer (soldOut, halfGrip)', who: 'gästen som får beskedet, sedan sällskapet', clip: 'guest.shrug eller guest.shrugB', standing: 'guest.shrugStand', face: { mood: 'waiting', intensity: 'clear' }, delay: 'reactDelayS' },
  { id: 'passNod', places: ['winebar', 'truck', 'street'], trigger: 'personalen går förbi en gäst inom {passNodRadiusM} som har blickkontakt eller väntar', who: 'personalen och gästen', clip: 'staff.walkNod och guest.glanceNodStand (sittande: guest.nodApprove)', face: { mood: 'content', intensity: 'weak' }, delay: 'gästen reactDelayS efter personalen' }
];
/** balance.ts FIGURE_LIFE.reaction. punchU = var i guest.tellJoke poängen kommer (klippets egen tid). */
export const REACTION_BALANCE = FIGURE_LIFE.reaction;

/** Livet i vila, för alla figurer (figureLife.ts). Ingen figur står helt still. Talen i balance.ts FIGURE_LIFE.life. */
export const LIFE_RULES = {
  ...FIGURE_LIFE.life,
  /** Blicken mot kameran är förbjuden (GESTURE_RULES.noCameraGaze): blickarna väljs i rummet, inom ±glanceYaw från där kroppen vetter. */
  noCameraGaze: true
};

/** Välj gest för en gäst. state = det sim-lagret vet om gästen just nu. D12: ger klippet med variant, hand, tempo,
 *  gestens storlek och ansiktets intensitet, eller null. ORDER 332 B: nearby = klippen grannarna spelar (pickVariantApart). */
export interface GesturePick { clip: string; hand: 'L' | 'R'; tempo: 'calm' | 'normal' | 'stressed'; amp: number; face: { mood: MoodId | null; k: number; transS: number } }
export function pickGesture(state: { mood: MoodId; posture: Posture; active: string[]; index: number; sinceLastS: number; cooldownS: number; temperament?: TemperamentId; intensity?: IntensityId; count?: number; nearby?: readonly string[] }): GesturePick | null {
  if (state.sinceLastS < state.cooldownS) return null;
  const T = TEMPERAMENT[state.temperament ?? 'calm'], I = INTENSITY[state.intensity ?? 'clear'];
  const cands = SITUATIONS.filter((s) => state.active.indexOf(s.id) >= 0).sort((a, b) => b.priority - a.priority);
  let clip: string | null = null, mood: MoodId | null = state.mood;
  if (cands.length) { const s = cands[0]; clip = state.posture === 'seated' ? s.clip : (s.standing ?? s.clip); mood = s.mood ?? null; }
  else { const list = state.posture === 'seated' ? MOOD_MAP[state.mood].seated : MOOD_MAP[state.mood].standing; clip = list.length ? list[state.index % list.length] : null; }
  if (!clip) return null;
  const v = pickVariantApart(clip, state.index, state.count ?? 0, state.nearby ?? []);
  return { clip: v.clip, hand: v.hand, tempo: I.tempo, amp: T.amp * I.amp, face: { mood, k: I.faceK * T.faceK, transS: T.faceTransS } };
}
