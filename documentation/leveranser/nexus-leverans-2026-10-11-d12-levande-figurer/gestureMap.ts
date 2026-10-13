// gestureMap.ts — D11: vilken gest hör till vilken stämning och vilken situation. Leverans 2026-10-10.
// Syftet (Anders 2026-10-09): spelaren läser gästerna utan symboler. Det spelaren ser är ansiktet (figureFace.ts, från
// 30 m och närmare) och kroppen (figureClips.ts). Kartan säger vad sim-lagret spelar och när.
// Inga speltal: alla tider och sannolikheter är nycklar i GESTURE_BALANCE, som Code sätter i balance.ts.
// Texterna (situationernas namn och varför) är nycklar i d11Strings: 'gm.sit.<id>' och 'gm.why.<id>'.
// D12 (2026-10-11): temperament, intensitet, varianter och svaren (REACTIONS) längst ned. Talen där är platshållare för
// balance.ts: prototypens värden står i tabellerna, och Code flyttar dem till balance.ts (TEMPERAMENT_BALANCE).

import type { MoodId } from './figureFace';

export type Place = 'winebar' | 'truck' | 'street';
export type Posture = 'seated' | 'standing' | 'walking';

/** Nycklarna i balance.ts. null tills Code sätter dem. */
export const GESTURE_BALANCE = {
  /** Gästen vill något (beställa, mer, notan): söker blicken i {seekEyeS}, sedan handen upp (wantLadder). Sekunder i spelets tid. */
  seekEyeS: null as number | null,
  /** Väntat utan att någon kommit: först klockan, sedan vinkningen. Sekunder i spelets tid. */
  waitWatchS: null as number | null,
  watchEveryS: null as number | null,
  waitWaveS: null as number | null,
  /** Hur ofta en sittande gäst gör stämningens egen gest när inget annat händer, och spridningen. */
  moodGestureEveryS: null as number | null,
  moodGestureJitter: null as number | null,
  /** Minsta tid mellan två gester för samma gäst. */
  gestureCooldownS: null as number | null,
  /** Under rättens poäng skjuts tallriken undan (0..1, rättens betyg från köket). */
  pushPlateBelow: null as number | null,
  /** Gatan: hur ofta någon stannar vid en skylt eller ett upplyst fönster inom stopLookRadiusM, och hälsar på en bekant. */
  stopLookP: null as number | null, stopLookRadiusM: null as number | null,
  greetP: null as number | null, greetRadiusM: null as number | null,
  /** Gatan: andel par med barn och med hund, per kvällsljus e (dag mot kväll). */
  childShare: { day: null as number | null, evening: null as number | null },
  dogShare: null as number | null
};

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

// ===== D12: temperament, intensitet, varianter och svar (2026-10-11) =====
// Anders 2026-10-11: samma känsla ska se olika ut hos olika personer, varje uttryck ska ha minst tre nivåer, och två gäster
// ska inte vinka exakt likadant. Uttrycket ska vara svar på något.

export type TemperamentId = 'calm' | 'lively' | 'reserved';
export type IntensityId = 'weak' | 'clear' | 'strong';

export interface Temperament {
  /** Gestens storlek: avvikelsen från vilan gånger amp (figureLife.scalePose). Benen och sitthöjden skalas inte. */
  amp: number;
  /** Ansiktets intensitet gånger faceK (ovanpå INTENSITY.faceK). */
  faceK: number;
  /** Hur lång tid ett uttryck tar att gå över i nästa (figureFace, 0,3–0,6 s). */
  faceTransS: number;
  /** Hur fort figuren svarar på något (ett skämt, en vinkning, någon som går förbi). */
  reactDelayS: number;
  /** Svaret på ett skämt: det klipp temperamentet väljer (REACTIONS.jokeLands). */
  jokeReply: string;
  /** Livet i vila (figureLife.lifeTimeline): sekunder mellan blinkningar och blickar, blickens vinkel i radianer,
   *  hur länge den hålls, huvudets drift i radianer, och hur ofta en stående figur flyttar tyngden. */
  blinkEveryS: [number, number]; glanceEveryS: [number, number]; glanceYaw: number; glanceHoldS: [number, number];
  drift: number; shiftEveryS: [number, number];
}

/** Platshållare för balance.ts. Talen är prototypens. */
export const TEMPERAMENT: Record<TemperamentId, Temperament> = {
  calm: { amp: 0.8, faceK: 0.85, faceTransS: 0.5, reactDelayS: 0.45, jokeReply: 'guest.chuckle', blinkEveryS: [3.0, 5.4], glanceEveryS: [3.4, 6.0], glanceYaw: 0.3, glanceHoldS: [1.0, 1.8], drift: 0.035, shiftEveryS: [6, 9] },
  lively: { amp: 1.3, faceK: 1.15, faceTransS: 0.3, reactDelayS: 0.25, jokeReply: 'guest.laugh', blinkEveryS: [2.0, 3.8], glanceEveryS: [1.6, 3.2], glanceYaw: 0.5, glanceHoldS: [0.5, 1.1], drift: 0.06, shiftEveryS: [3, 5] },
  reserved: { amp: 0.6, faceK: 0.7, faceTransS: 0.6, reactDelayS: 0.6, jokeReply: 'guest.smileTurn', blinkEveryS: [3.2, 6.0], glanceEveryS: [4.0, 7.0], glanceYaw: 0.2, glanceHoldS: [0.8, 1.4], drift: 0.022, shiftEveryS: [7, 10] }
};

/** Andelen av varje temperament per gästgrupp (guestGroups.ts). Platshållare: null = lika många av varje. */
export const TEMPERAMENT_BALANCE = {
  share: {
    student: null as null | Record<TemperamentId, number>, villager: null as null | Record<TemperamentId, number>, tourist: null as null | Record<TemperamentId, number>,
    gourmet: null as null | Record<TemperamentId, number>, business: null as null | Record<TemperamentId, number>
  }
};
/** Temperamentet för en gäst, deterministiskt ur gästens nummer (samma kväll ser likadan ut). Personalen är 'calm'. */
export function temperamentOf(index: number, share?: Record<TemperamentId, number> | null): TemperamentId {
  const s = share ?? { calm: 1, lively: 1, reserved: 1 }, ids: TemperamentId[] = ['calm', 'lively', 'reserved'];
  const tot = ids.reduce((a, k) => a + s[k], 0), h = ((index * 2654435761) >>> 0) / 4294967296 * tot;
  let acc = 0; for (const k of ids) { acc += s[k]; if (h < acc) return k; } return 'calm';
}

/** Tre nivåer per uttryck. tempo = klippets tempo (och därmed moodK), faceK = ansiktets intensitet (figureFace.FACE_INTENSITY),
 *  amp = gestens storlek ovanpå temperamentet. Måttligt otålig = 'clear', mycket otålig = 'strong'. */
export const INTENSITY: Record<IntensityId, { tempo: 'calm' | 'normal' | 'stressed'; faceK: number; amp: number }> = {
  weak: { tempo: 'calm', faceK: 0.5, amp: 0.8 },
  clear: { tempo: 'normal', faceK: 1.0, amp: 1.0 },
  strong: { tempo: 'stressed', faceK: 1.3, amp: 1.2 }
};
/** Nivån ur trycket i det sim-lagret mäter (väntan mot {waitWaveS}, rättens betyg mot förväntan, glädjen i sällskapet), 0..1.
 *  Platshållare: under weakBelow svag, över strongFrom stark. */
export const INTENSITY_BALANCE = { weakBelow: null as number | null, strongFrom: null as number | null };
export function intensityFor(pressure: number): IntensityId {
  const lo = INTENSITY_BALANCE.weakBelow ?? 0.34, hi = INTENSITY_BALANCE.strongFrom ?? 0.67;
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
 *  vänster hand i enhandsklippen ({leftHandShare}). Två grannar vid samma bord får aldrig samma variant samtidigt. */
export const VARIANT_RULES = { byIndex: true, neighboursDiffer: true, leftHandShare: null as number | null, leftHandShareProto: 0.2 };
export function pickVariant(clip: string, index: number, count: number): { clip: string; hand: 'L' | 'R' } {
  const v = VARIANTS[clip], share = VARIANT_RULES.leftHandShare ?? VARIANT_RULES.leftHandShareProto;
  const hand: 'L' | 'R' = ((index * 7919) % 100) / 100 < share ? 'L' : 'R';
  return { clip: v ? v[(index + count) % v.length] : clip, hand };
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
/** Platshållare för balance.ts. punchU = var i guest.tellJoke poängen kommer (klippets egen tid). */
export const REACTION_BALANCE = { punchU: 0.64, spreadS: null as number | null, spreadSProto: 0.35, passNodRadiusM: null as number | null, passNodRadiusMProto: 1.4 };

/** Livet i vila, för alla figurer (figureLife.ts). Ingen figur står helt still. */
export const LIFE_RULES = {
  /** Under en gest dämpas blickarna och huvudets drift till busyK, blinkningarna fortsätter. */
  busyK: 0.3,
  /** Blicken: ögonen först (0,06 s), sedan huvudet (0,3 s) till headShare av vinkeln. Ögonen går delvis tillbaka när huvudet kommit ikapp. */
  eyesFirstS: 0.06, headFollowS: 0.3, headShare: 0.6,
  /** En blinkning vid var tredje blick, och var sjunde blinkning är dubbel. */
  blinkOnGlance: 3, doubleBlinkEvery: 7,
  /** Blicken mot kameran är förbjuden (GESTURE_RULES.noCameraGaze): blickarna väljs i rummet, inom ±glanceYaw från där kroppen vetter. */
  noCameraGaze: true
};

/** Välj gest för en gäst. state = det sim-lagret vet om gästen just nu. D12: ger klippet med variant, hand, tempo,
 *  gestens storlek och ansiktets intensitet, eller null. */
export interface GesturePick { clip: string; hand: 'L' | 'R'; tempo: 'calm' | 'normal' | 'stressed'; amp: number; face: { mood: MoodId | null; k: number; transS: number } }
export function pickGesture(state: { mood: MoodId; posture: Posture; active: string[]; index: number; sinceLastS: number; cooldownS: number; temperament?: TemperamentId; intensity?: IntensityId; count?: number }): GesturePick | null {
  if (state.sinceLastS < state.cooldownS) return null;
  const T = TEMPERAMENT[state.temperament ?? 'calm'], I = INTENSITY[state.intensity ?? 'clear'];
  const cands = SITUATIONS.filter((s) => state.active.indexOf(s.id) >= 0).sort((a, b) => b.priority - a.priority);
  let clip: string | null = null, mood: MoodId | null = state.mood;
  if (cands.length) { const s = cands[0]; clip = state.posture === 'seated' ? s.clip : (s.standing ?? s.clip); mood = s.mood ?? null; }
  else { const list = state.posture === 'seated' ? MOOD_MAP[state.mood].seated : MOOD_MAP[state.mood].standing; clip = list.length ? list[state.index % list.length] : null; }
  if (!clip) return null;
  const v = pickVariant(clip, state.index, state.count ?? 0);
  return { clip: v.clip, hand: v.hand, tempo: I.tempo, amp: T.amp * I.amp, face: { mood, k: I.faceK * T.faceK, transS: T.faceTransS } };
}
