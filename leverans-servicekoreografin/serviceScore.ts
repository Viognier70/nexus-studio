// serviceScore — servicesekvensen som data, plus de nio poser den kräver.
//
// BRIEF_DESIGN_SERVICEKOREOGRAFIN §6. Ersätter ingenting; kompletterar
// figureRig.ts. Godkänd modell: `Servicekoreografin.dc.html`, som läser
// den här tabellen och renderar den — den har ingen egen koreografi, så
// ändras ett tal här ändras modellen.
//
// Kontrakt:
//   • Ren three.js-miljö. Enda importen är projektets egen figureRig.ts.
//     Inga externa beroenden, inga inlästa modeller, inga binära assets.
//   • Poserna är rena funktioner av tid och framdrift, precis som
//     riggens sju. Ingen av dem håller tillstånd, klocka eller slumptal.
//     Samma indata ger alltid samma pose.
//   • Partituret är data. `t0` står i tabellen därför att ni bad om det,
//     men det är ett HÄRLETT tal — se PROVENANCE. Det som är kontraktet
//     är `after` / `offset` / `endsWith`. Räknar koden ur t0 går
//     partituret sönder första gången köket är sent.
//   • Filen känner inga koordinater. Punkter är ankarroller mot
//     rumskontraktet (businessRoom.ts), så samma partitur gäller i alla
//     sex verksamhetsklasser.
//
// Alla varaktigheter i sekunder, alla avstånd i meter, alla hastigheter
// i m/s, alla vinklar i radianer. Tider författade i REALTID, spelklocka 1×.

import {
  FigurePose,
  PoseArm,
  PoseOptions,
  poseIdle,
  poseSeated,
  poseCarry,
  poseWork,
  blendPose
} from './figureRig';

// #region tempo
//
// Kärnfyndet. En service har inte en takt, den har tre. Skalas de med
// samma tal blir 4× obrukbart: hälsningen blir 0,8 s och läser som ett
// ryck, inte som en hälsning. Det är den enskilda orsaken till att
// provspelet såg ut som personal som irrar.

export type TempoClass =
  /** Handling som bär betydelse. Läsbarheten SITTER i varaktigheten.
   *  Skalas ALDRIG med spelklockan. */
  | 'gest'
  /** Förflyttning. Bär bara riktning och avstånd. Skalas rakt.
   *  Gångfasen kommer ur sträckan, så kadensen följer med av sig själv. */
  | 'move'
  /** Tillstånd utan egen läsbarhet — läsa menyn, laga, äta.
   *  Komprimeras hur hårt spelet vill. */
  | 'dwell'
  /** Fyllnadsarbete vid station. Elastiskt: får sin längd ur
   *  mellanrummet till nästa steg, aldrig ur en varaktighet. */
  | 'fill';

export interface TempoScale { gest: number; move: number; dwell: number; }

/** Rekommenderad avbildning av spelklockan. `gest` står kvar på 1 vid
 *  varje speltempo. Det kräver att gestuppgifter drivs av en
 *  realtidsklocka och inte av spelets deltatid — enda punkten i
 *  leveransen som kostar något i koden. */
export function tempoForGameSpeed(gameSpeed: number): TempoScale {
  const s = gameSpeed > 0 ? 1 / gameSpeed : 1;
  return { gest: 1, move: s, dwell: s };
}

/** Bara för jämförelse i modellen. Använd inte i spelet. */
export function tempoFlat(gameSpeed: number): TempoScale {
  const s = gameSpeed > 0 ? 1 / gameSpeed : 1;
  return { gest: s, move: s, dwell: s };
}

// #endregion tempo

// #region avstånd och hastigheter

export const SERVICE_DISTANCES = {
  /** Värd ↔ gäst vid hälsningen, mellan rötterna. Rättar gissningen 0,8:
   *  med 0,8 m står två kroppar 0,34 m isär sedan axelbredden 0,46
   *  dragits bort, alltså närmare än främlingar står. 1,25 lämnar
   *  0,79 m luft — nära nog att höra, långt nog att båda syns hela. */
  greet: 1.25,
  /** Värdens försprång under eskorten. Verkställs som FÖRDRÖJNING,
   *  inte som avstånd — se escortLagSec(). */
  escortLead: 1.40,
  /** Servitör ↔ sittande gäst vid beställning. */
  order: 0.92,
  /** Vid framställning. Kortare eftersom servitören lutar in. */
  serve: 0.75,
  /** Vid betalning. Följer av order + 0,06. */
  pay: 0.98,
  /** Servitörens vinkel från gästens blickriktning. 22°: rakt framför
   *  en sittande gäst läser som förhör, bakom syns inte, och vinkeln
   *  lägger dessutom servitörens fotavtryck utanför bordsskivan. */
  serverOffsetAngle: 0.388,
  /** Värden står rakt mot gästen. Noll är ett värde, inte ett utebliget. */
  hostOffsetAngle: 0,
  /** Minsta fria luft mellan två kroppar i en hälsning. Kravet som
   *  greet är räknad ur. */
  minPersonalAir: 0.75
} as const;

export const SERVICE_SPEEDS = {
  guestArriving: 0.95,
  /** Sista 0,30 m in i rummet. Gästen stannar inte — hen tvekar. */
  guestHesitant: 0.32,
  /** Värden går FORTARE än eskorten. Avsiktligt och läsbart: att komma
   *  emot någon sker raskt, att leda någon sker i gästens takt. */
  hostToGreet: 1.25,
  escort: 0.85,
  hostReturning: 1.20,
  serverEmpty: 1.15,
  serverCarrying: 0.95,
  serverClearing: 1.00,
  guestLeaving: 1.10,
  chefInKitchen: 0.90
} as const;

export const SERVICE_TIMING = {
  notice: 0.9,
  hostTurn: 0.4,
  greet: 3.2,
  /** Andel av hälsningen där värden anvisar bordet. Ligger INUTI
   *  hälsningen; ett eget steg efteråt läser som två händelser. */
  greetPointFrom: 0.62,
  hostPointAtSeat: 1.1,
  /** Måste vara ≥ 1,1 s. Under det läser det som ett fall — mätt. */
  sitBlend: 1.3,
  standBlend: 1.4,
  hostReturnOverlap: 0.4,
  serverCue: 2.0,
  order: 6.5,
  fileOrder: 1.55,
  cookStartsAfterFile: 0.8,
  cook: 14.0,
  plateUp: 2.2,
  passAnticipation: 1.2,
  pickup: 1.5,
  setDown: 2.4,
  wishWell: 1.2,
  dine: 22.0,
  requestCheck: 1.8,
  answerSignal: 0.7,
  pay: 5.0,
  farewellStep: 1.2,
  farewell: 3.0,
  clearCue: 2.2,
  clearTable: 5.2,
  dropAtPass: 1.4
} as const;

/** Eskorten är en fördröjning, inte ett avstånd. Värd och gäst går
 *  samma polylinje i samma hastighet; gästen startar så här mycket
 *  senare. Då blir försprånget exakt escortLead i VARJE punkt, även i
 *  kurvorna, utan att någon jagar någon. 1,65 s vid 1×. */
export function escortLagSec(scale: TempoScale): number {
  return (SERVICE_DISTANCES.escortLead / SERVICE_SPEEDS.escort) * scale.move;
}

// #endregion avstånd och hastigheter

// #region de nio poserna
//
// Samma form som figureRig.ts: rena funktioner (t, options) → FigurePose,
// satta med applyPose. Ingen kräver nya led, nya mått eller nya buffertar.
//
// `progress` är ny i options: framdriften 0–1 genom det STEG posen hör
// till. Tre av de nio är enveloppade och behöver den (welcome, setDown,
// signal); flyttas poserna in i figureRig.ts hör fältet i PoseOptions.

export interface ChoreoPoseOptions extends PoseOptions {
  /** Stegets framdrift, 0–1. Default 1 = posen i sitt hållna läge. */
  progress?: number;
  /** poseAttend: händerna bakom ryggen i stället för vid sidorna. */
  clasp?: boolean;
}

const LEG_STAND_FRONT = { swing: 0.05, spread: 0.05, knee: 0.08, ankle: 0.06 };
const LEG_STAND_BACK = { swing: -0.03, spread: 0.05, knee: 0.12, ankle: 0.10 };

function bell(u: number, centre: number, width: number): number {
  const x = (u - centre) / width;
  return Math.exp(-x * x);
}

function smooth(u: number): number {
  const k = Math.max(0, Math.min(1, u));
  return k * k * (3 - 2 * k);
}

/**
 * 1 · Mottagande på nära håll. ERSÄTTER poseGreet vid < 1,6 m.
 *
 * poseGreet är en VINKNING — arm i huvudhöjd, 1,6 Hz — och en vinkning
 * är en gest över avstånd. På 1,25 m läser den som att man ropar på
 * någon. Behåll poseGreet: den är rätt för gäst som vinkar åt personal
 * tvärs över rummet. Men mottagandet är en annan pose.
 *
 * Bugningen easas in över första 14 % av steget, och från 62 % blandas
 * posePoint in — så anvisningen av bordet blir en fortsättning på
 * hälsningen och inte en andra händelse.
 */
export function poseWelcome(t: number, options?: Partial<ChoreoPoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const u = o.progress ?? 1;
  const yaw = o.targetYaw ?? 0;
  const bow = Math.min(1, u / 0.14);
  const pose: FigurePose = {
    lift: -0.003,
    hipDrop: 0,
    torso: { pitch: 0.16 * bow, yaw: yaw * 0.35, roll: 0.012 * Math.sin(time * 0.9) },
    head: { pitch: 0.12 * bow, yaw: yaw * 0.55 + 0.04 * Math.sin(time * 0.7) },
    armR: { swing: 0.46 + 0.04 * Math.sin(time * 2), lift: 0.30, elbow: 0.52 },
    armL: { swing: 0.30, lift: 0.20, elbow: 0.44 },
    legL: LEG_STAND_FRONT,
    legR: LEG_STAND_BACK
  };
  const toPoint = Math.max(0, (u - SERVICE_TIMING.greetPointFrom) / (1 - SERVICE_TIMING.greetPointFrom));
  if (toPoint <= 0) return pose;
  return blendPose(pose, posePoint(time, o), smooth(toPoint));
}

/**
 * 2 · Anvisar. Rak arm lågt mot målet, huvudet med, HÅLLS stilla —
 * ingen oscillation, för en anvisning som vaggar läser som en vinkning.
 * Används i hälsningens slut (värden visar bordet innan hen vänder sig
 * om) och vid stolen. Utan den blir eskorten att personalen går iväg
 * och gästen råkar följa efter.
 */
export function posePoint(t: number, options?: Partial<ChoreoPoseOptions>): FigurePose {
  const o = options ?? {};
  const yaw = o.targetYaw ?? 0;
  const side = (o.side ?? 1) < 0 ? -1 : 1;
  const out: PoseArm = { swing: 0.92, lift: 0.34, elbow: 0.14 };
  const rest: PoseArm = { swing: 0.06, lift: 0.06, elbow: 0.20 };
  return {
    lift: 0,
    hipDrop: 0,
    torso: { pitch: 0.05, yaw: 0.10 + yaw * 0.25 },
    head: { pitch: 0.04, yaw: 0.22 + yaw * 0.45 },
    armL: side < 0 ? out : rest,
    armR: side < 0 ? rest : out,
    legL: LEG_STAND_FRONT,
    legR: LEG_STAND_BACK
  };
}

/**
 * 3 · Tar emot en beställning. ERSÄTTER poseWork, som lutar bålen
 * 0,22 fram och läser som hackande, inte lyssnande.
 *
 * Vänster hand håller blocket i brösthöjd, höger skriver på 1,7 Hz, och
 * huvudet pendlar mellan blocket och gästens ansikte tre gånger per
 * steg. Pendlingen är det som gör posen till lyssnande.
 */
export function poseTakeOrder(t: number, options?: Partial<ChoreoPoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const u = o.progress ?? 1;
  const yaw = o.targetYaw ?? 0;
  const write = Math.sin(time * 2 * Math.PI * 1.7) * (o.intensity ?? 1);
  const look = Math.max(0, Math.sin(u * Math.PI * 3));
  return {
    lift: -0.004,
    hipDrop: 0,
    torso: { pitch: 0.12, yaw: 0.06 + yaw * 0.25, roll: 0.015 },
    head: { pitch: 0.30 - 0.26 * look, yaw: (0.10 + yaw * 0.5) * look },
    armL: { swing: 1.02, lift: 0.13, elbow: 1.52 },
    armR: { swing: 0.96, lift: 0.10, elbow: 1.34 + 0.10 * write },
    legL: { swing: 0.04, spread: 0.06, knee: 0.09, ankle: 0.06 },
    legR: { swing: -0.05, spread: 0.06, knee: 0.13, ankle: 0.12 }
  };
}

/**
 * 4 · Ställer fram och hämtar upp. ERSÄTTER poseWork. Den pose som
 * saknas mest: i dag ställs mat fram genom att en bärande figur slutar
 * bära.
 *
 * En ENVELOPP, inte ett läge: poseCarry → sträckning → poseCarry, med
 * sin(π·u) som blandningsfaktor. Samma funktion är upptagningen vid
 * passet, kockens tallrik på passet och lappen över passet — bara
 * `progress` och `reachAt` skiljer.
 */
export function poseSetDown(t: number, options?: Partial<ChoreoPoseOptions & { reachAt: number }>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const u = Math.max(0, Math.min(1, o.progress ?? 1));
  const at = o.reachAt ?? 0.8;
  const k = Math.sin(Math.min(1, u / at) * Math.PI);
  const reach: FigurePose = {
    lift: -0.01,
    hipDrop: 0,
    torso: { pitch: 0.24, yaw: (o.targetYaw ?? 0) * 0.3 },
    head: { pitch: 0.34, yaw: (o.targetYaw ?? 0) * 0.4 },
    armR: { swing: 1.06, lift: 0.20, elbow: 0.42 },
    armL: { swing: 0.62, lift: 0.14, elbow: 1.10 },
    legL: { swing: 0.10, spread: 0.07, knee: 0.14, ankle: 0.10 },
    legR: { swing: -0.10, spread: 0.07, knee: 0.18, ankle: 0.16 }
  };
  return blendPose(poseCarry(time, o), reach, k);
}

/**
 * 5 · Räcker fram och tar emot i utbyte. Betalningen, och lappen över
 * passet. Skiljer sig från poseSetDown genom att ingenting ställs NER:
 * handen går ut i brösthöjd och tillbaka, och bålen bugar en aning i
 * samma rörelse.
 */
export function poseOffer(t: number, options?: Partial<ChoreoPoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const u = o.progress ?? 1;
  const yaw = o.targetYaw ?? 0;
  const b = bell(u, 0.35, 0.24);
  const breathe = Math.sin(time * 2 * Math.PI * 0.22) * 0.01;
  return {
    lift: -0.004 + breathe,
    hipDrop: 0,
    torso: { pitch: 0.10 + 0.06 * b, yaw: yaw * 0.3 },
    head: { pitch: 0.24, yaw: yaw * 0.5 },
    armL: { swing: 0.96, lift: 0.12, elbow: 1.44 },
    armR: { swing: 0.84 + 0.34 * b, lift: 0.12, elbow: 1.20 - 0.42 * b },
    legL: { swing: 0.04, spread: 0.06, knee: 0.09, ankle: 0.06 },
    legR: { swing: -0.05, spread: 0.06, knee: 0.13, ankle: 0.12 }
  };
}

/**
 * 6 · Äter. ERSÄTTER poseSeated, som har händerna på låren och läser
 * som att VÄNTA — en matsal full av väntande gäster är precis det
 * provspelet visade.
 *
 * Sittande bas plus hand-till-mun på 0,28 Hz. Huvudet möter handen
 * halvvägs; gör det inte det ser det ut som att gästen matar sig.
 */
export function poseDine(t: number, options?: Partial<ChoreoPoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const base = poseSeated(time, { targetYaw: (o.targetYaw ?? 0) * 0.2 });
  const bite = Math.max(0, Math.sin(((time * 0.28) % 1) * Math.PI * 2));
  return {
    lift: base.lift,
    hipDrop: base.hipDrop,
    torso: { pitch: 0.12 - 0.04 * bite, yaw: (base.torso ?? {}).yaw ?? 0 },
    head: { pitch: 0.22 - 0.10 * bite, yaw: (base.head ?? {}).yaw ?? 0 },
    armR: { swing: 0.62 + 0.55 * bite, lift: 0.10, elbow: 1.20 + 1.05 * bite },
    armL: { swing: 0.70, lift: 0.08, elbow: 1.40 },
    legL: base.legL,
    legR: base.legR
  };
}

/**
 * 7 · Påkallar. Gästen lyfter handen och ber om notan.
 *
 * Sittande bas, höger arm upp och ut, huvudet upp ur maten, easas in
 * över 25 % av steget. Kräver det nya gästtillståndet (fråga 16) —
 * utan den kan en gäst inte be om någonting, och betalningen blir att
 * gästen blir avhyst.
 */
export function poseSignal(t: number, options?: Partial<ChoreoPoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const u = o.progress ?? 1;
  const yaw = o.targetYaw ?? 0;
  const base = poseSeated(time, { targetYaw: yaw * 0.6 });
  const k = smooth(Math.min(1, u / 0.25));
  return {
    lift: base.lift,
    hipDrop: base.hipDrop,
    torso: base.torso,
    head: { pitch: 0.05 - 0.05 * k, yaw: (base.head ?? {}).yaw ?? 0 },
    armR: { swing: 0.52 + 0.78 * k, lift: 0.26 * k, elbow: 1.14 - 0.18 * k },
    armL: base.armL,
    legL: base.legL,
    legR: base.legR
  };
}

/**
 * 8 · Nickar. Hälsningssvaret, smaklig måltid, farvälet.
 *
 * En gest ovanpå poseIdle, inte ett eget läge: nicken ligger som en
 * klocka kring `nodAt` av steget, så samma funktion bär både gästens
 * svar 28 % in i hälsningen och värdens farväl 34 % in i sitt steg.
 * Utan den lämnar servitören bordet som en maskin.
 */
export function poseNod(
  t: number,
  options?: Partial<ChoreoPoseOptions & { nodAt: number; depth: number }>
): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const u = o.progress ?? 0.28;
  const yaw = o.targetYaw ?? 0;
  const base = poseIdle(time, o);
  const b = bell(u, o.nodAt ?? 0.30, 0.18);
  const depth = o.depth ?? 1;
  return {
    lift: base.lift,
    hipDrop: 0,
    torso: {
      pitch: ((base.torso ?? {}).pitch ?? 0) + 0.10 * b * depth,
      yaw: ((base.torso ?? {}).yaw ?? 0) + yaw * 0.3,
      roll: (base.torso ?? {}).roll ?? 0
    },
    head: {
      pitch: ((base.head ?? {}).pitch ?? 0) + 0.24 * b * depth,
      yaw: ((base.head ?? {}).yaw ?? 0) + yaw * 0.5
    },
    armL: base.armL,
    armR: { swing: 0.10 + 0.14 * b, lift: 0.08, elbow: 0.26 },
    legL: base.legL,
    legR: base.legR
  };
}

/**
 * 9 · Riktad väntan. Väntanregeln som löser irrandet: en figur utan
 * uppgift är FÖRANKRAD vid en station och VÄND mot det den bevakar.
 * Aldrig fri i rummet, aldrig helt stilla.
 *
 * Två lägen. Utan `clasp`: svep ±0,42 rad på 0,55 Hz över det som
 * bevakas — värden vid entrén. Med `clasp`: händerna bakom ryggen och
 * blicken stilla — servitören vid passet de sista 1,2 sekunderna.
 *
 * Detta är enda posen som får användas för overksam väntan, och bara
 * upp till ~2 s i kamerans sikte. Längre väntan ska bytas mot
 * poseWork på låg intensitet vid närmaste station.
 */
export function poseAttend(t: number, options?: Partial<ChoreoPoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const yaw = o.targetYaw ?? 0;
  const base = poseIdle(time, o);
  const sweep = o.clasp ? 0 : 0.42 * Math.sin(time * 0.55);
  const arm: PoseArm = o.clasp
    ? { swing: -0.18, lift: 0.05, elbow: 0.52 }
    : (base.armL as PoseArm);
  return {
    lift: base.lift,
    hipDrop: 0,
    torso: {
      pitch: ((base.torso ?? {}).pitch ?? 0) + 0.05,
      yaw: ((base.torso ?? {}).yaw ?? 0) + yaw * 0.25,
      roll: (base.torso ?? {}).roll ?? 0
    },
    head: { pitch: o.clasp ? 0.06 : -0.02, yaw: yaw * 0.5 + sweep },
    armL: arm,
    armR: o.clasp ? { swing: -0.18, lift: 0.05, elbow: 0.52 } : (base.armR as PoseArm),
    legL: base.legL,
    legR: base.legR
  };
}

/** Att sätta sig och resa sig behöver INGEN ny pose. Golvet 1,1 s är
 *  mätt: under det läser övergången som ett fall. */
export function poseSitTransition(t: number, u: number, standingUp?: boolean): FigurePose {
  const k = smooth(u);
  return standingUp
    ? blendPose(poseSeated(t), poseIdle(t), k)
    : blendPose(poseIdle(t), poseSeated(t), k);
}

/** Fyllnadsarbete är poseWork på låg intensitet med huvudet lyft mot
 *  rummet var ~2,4 s. Arbetet är inte poängen — blicken upp är, och den
 *  är det som gör att gästens signal kan besvaras på 0,7 s. */
export function poseFillWork(t: number, intensity?: number): FigurePose {
  const time = t ?? 0;
  const p = poseWork(time, { intensity: intensity ?? 0.5 });
  const up = Math.max(0, Math.sin(time * 0.42));
  return {
    lift: p.lift,
    hipDrop: 0,
    torso: { pitch: ((p.torso ?? {}).pitch ?? 0) * (1 - up * 0.45), yaw: (p.torso ?? {}).yaw ?? 0 },
    head: {
      pitch: ((p.head ?? {}).pitch ?? 0) * (1 - up * 0.82) - 0.04 * up,
      yaw: ((p.head ?? {}).yaw ?? 0) + 0.35 * up
    },
    armL: p.armL,
    armR: p.armR,
    legL: p.legL,
    legR: p.legR
  };
}

export type ChoreoPoseName =
  | 'poseWelcome' | 'posePoint' | 'poseTakeOrder' | 'poseSetDown' | 'poseOffer'
  | 'poseDine' | 'poseSignal' | 'poseNod' | 'poseAttend';

/** Samma form som POSE_JOINT_NOTES i figureRig.ts. */
export const CHOREO_POSE_NOTES: Record<ChoreoPoseName, string> = {
  poseWelcome:
    'Bål 0,16 fram och huvud 0,12 ner, easat in över 14 % av steget. Båda ' +
    'armar låga och öppna: höger axel 0,46 / lyft 0,30 / armbåge 0,52, ' +
    'vänster 0,30 / 0,20 / 0,44. Från 62 % blandas posePoint in. ' +
    'Ingen vinkning — det är skillnaden mot poseGreet.',
  posePoint:
    'Rak arm lågt mot målet: axel 0,92 / lyft 0,34 / armbåge 0,14. Huvud ' +
    '0,22 mot målet, bål 0,05 fram. INGEN oscillation — en anvisning som ' +
    'vaggar läser som en vinkning. options.side väljer arm.',
  poseTakeOrder:
    'Vänster axel 1,02 / armbåge 1,52 håller blocket i brösthöjd. Höger ' +
    'axel 0,96 / armbåge 1,34 ±0,10 på 1,7 Hz skriver. Huvudet pendlar ' +
    'pitch 0,30 → 0,04 tre gånger per steg, och pendlingen är det som gör ' +
    'posen lyssnande. Bål bara 0,12 fram, mot poseWorks 0,22.',
  poseSetDown:
    'Envelopp, inte läge: blendPose(poseCarry, sträckning, sin(π·u/reachAt)). ' +
    'Sträckningen är axel 1,06 / lyft 0,20 / armbåge 0,42, bål 0,24, huvud ' +
    '0,34. reachAt 0,8 vid framställning, 0,9 vid upptagning.',
  poseOffer:
    'Höger axel 0,84 → 1,18 och armbåge 1,20 → 0,78 i en klocka kring 35 % ' +
    'av steget; vänster axel 0,96 / armbåge 1,44 håller brickan eller ' +
    'terminalen. Bål 0,10 + 0,06 i samma rörelse. Ingenting ställs ner.',
  poseDine:
    'Sittande bas. Höger axel 0,62 → 1,17, armbåge 1,20 → 2,25 på 0,28 Hz. ' +
    'Huvudet möter handen halvvägs (pitch 0,22 → 0,12) — gör det inte det ' +
    'ser det ut som att gästen matar sig. Vänster arm vilar på bordet.',
  poseSignal:
    'Sittande bas. Höger axel 0,52 → 1,30, armbåge 1,14 → 0,96, lyft 0 → 0,26, ' +
    'easat in över 25 % av steget. Huvud pitch 0,05 → 0 (upp ur maten). ' +
    'Hålls till steget slutar — armen går inte ner av sig själv.',
  poseNod:
    'Gest ovanpå poseIdle. Klocka kring options.nodAt med bredd 0,18: huvud ' +
    '+0,24 rad, bål +0,10, höger arm 0,10 → 0,24. options.depth skalar hela ' +
    'nicken, så samma funktion bär gästens svar och värdens farväl.',
  poseAttend:
    'poseIdle plus riktning. Utan clasp: huvud svep ±0,42 rad på 0,55 Hz över ' +
    'targetYaw, bål 0,05 fram, blick en aning upp. Med clasp: båda axlar ' +
    '−0,18 / armbåge 0,52 (händerna bakom ryggen), inget svep, huvud 0,06 ner. ' +
    'Endast för väntan under ~2 s i kamerans sikte.'
};

// #endregion de nio poserna

// #region partituret

export type ServiceActor = 'guest' | 'host' | 'server' | 'chef';

/** Ankarroller, inte meter. Sex av dem finns inte i businessRoom.ts —
 *  se fråga 18: vi förordar att rummet publicerar dem, eftersom rummet
 *  äger möbelns kanter och vet vad som är fritt golv. */
export type Anchor =
  | 'outside' | 'entrance' | 'insideEntrance' | 'greetGuest' | 'greetHost'
  | 'seat' | 'seatApproach' | 'seatSide'
  | 'orderSpot' | 'serveSpot' | 'paySpot'
  | 'hostStation' | 'serverStation' | 'passServerSide' | 'passKitchenSide'
  | 'chefStation' | 'farewellSpot';

export type ServiceStepId =
  | 'arrive' | 'seekEye' | 'watchDoor' | 'notice' | 'approach'
  | 'greet' | 'pointSeat' | 'lead' | 'follow' | 'showChair'
  | 'sit' | 'hostReturn' | 'serverIdle' | 'serverToTable' | 'readMenu'
  | 'order' | 'serverToPass' | 'fileOrder' | 'chefPrep' | 'cook'
  | 'plateUp' | 'serverFill' | 'serverAwait' | 'pickup' | 'carryOut'
  | 'setDown' | 'wishWell' | 'awaitFood' | 'dine' | 'requestCheck'
  | 'serverIdle2' | 'answerSignal' | 'pay' | 'stand' | 'leave'
  | 'farewell' | 'clearTable' | 'dropAtPass';

export interface ServiceStep {
  n: number;
  id: ServiceStepId;
  /** Svensk etikett, samma som i modellens partiturtabell. */
  label: string;
  cls: TempoClass;
  /** Utförare. Två namn = steget kräver båda samtidigt. */
  actors: ServiceActor[];
  /** Pose per aktör, i actors-ordning. */
  poses: string[];
  /**
   * Absolut starttid vid spelklocka 1×, sekunder. HÄRLETT — läs
   * PROVENANCE innan detta fält används till något. Koden ska räkna ur
   * `after` / `offset` / `endsWith`; t0 står här för att partituret ska
   * gå att läsa och granska på papper.
   */
  t0: number;
  /** Varaktighet vid 1×. `null` = härleds (förflyttning ur sträcka,
   *  fyllnad och uppehåll ur mellanrummet). */
  dur: number | null;
  /** Vilket steg detta väntar på. `null` = servicens början. */
  after: ServiceStepId | null;
  /** Sekunder efter `after`s slut. Negativt = överlapp. */
  offset: number;
  /** Elastiskt: steget slutar när detta steg BÖRJAR, och längden är
   *  mellanrummet. Enda elastiska mekanismen i partituret. */
  endsWith?: ServiceStepId;
  from?: Anchor;
  to?: Anchor;
  at?: Anchor;
  facing?: Anchor;
  speed?: number;
  /** Vad väntan består i, i ord. Kontraktet, inte prydnad. */
  waitsFor: string;
  note: string;
}

const T = SERVICE_TIMING;
const V = SERVICE_SPEEDS;

/**
 * Trettioåtta steg, fyra aktörer, tre överlämningar, tre överlapp.
 *
 * Fyra av stegen finns INTE i briefens §2 och är våra tillägg:
 * `seekEye`, uppdelningen `readMenu` + `order`, `requestCheck`,
 * `clearTable` + `dropAtPass`. Skälen står i respektive `note`.
 * Två av dem kräver nya gästtillstånd — fråga 16.
 */
export const SERVICE_SCORE: ServiceStep[] = [
  {
    n: 1, id: 'arrive', label: 'ankomst', cls: 'move',
    actors: ['guest'], poses: ['poseWalk'],
    t0: 0.0, dur: null, after: null, offset: 0,
    from: 'outside', to: 'insideEntrance', speed: V.guestArriving,
    waitsFor: '—',
    note: 'Tröskeln passeras 1,8 s in och är nollpunkten för allt som ' +
      'följer — inte stegets slut.'
  },
  {
    n: 2, id: 'seekEye', label: 'söker blick', cls: 'move',
    actors: ['guest'], poses: ['poseWalk'],
    t0: 3.1, dur: null, after: 'arrive', offset: 0,
    from: 'insideEntrance', to: 'greetGuest', facing: 'hostStation',
    speed: V.guestHesitant,
    waitsFor: 'arrive',
    note: 'TILLÄGG. Sista 0,30 m på 0,32 m/s. Gästen stannar inte — hen ' +
      'tvekar och söker blick. Utan steget hoppar gästen från arriving ' +
      'till escorted och ögonblicket att bli mottagen finns inte.'
  },
  {
    n: 3, id: 'watchDoor', label: 'passar dörren', cls: 'fill',
    actors: ['host'], poses: ['poseAttend'],
    t0: 0.0, dur: null, after: null, offset: 0, endsWith: 'notice',
    at: 'hostStation', facing: 'entrance',
    waitsFor: 'en gäst i dörren',
    note: 'Svep ±0,42 rad på 0,55 Hz. Värden lämnar aldrig stationen utom ' +
      'på uppdrag. En figur som TITTAR mot dörren läser som att någon ' +
      'passar den — det räcker.'
  },
  {
    n: 4, id: 'notice', label: 'märker gästen', cls: 'gest',
    actors: ['host'], poses: ['poseAttend'],
    t0: 2.7, dur: T.hostTurn, after: 'arrive', offset: T.notice,
    at: 'hostStation', facing: 'greetGuest',
    waitsFor: 'tröskeln + 0,9 s (inte arrive:s slut)',
    note: 'Vänder sig mot gästen INNAN hen går. notice + hostTurn = 1,3 s ' +
      'till synlig rörelse, och det är talet som avgör intrycket — tiden ' +
      'till kontakt (4,3 s) gör mindre.'
  },
  {
    n: 5, id: 'approach', label: 'går emot', cls: 'move',
    actors: ['host'], poses: ['poseWalk'],
    t0: 3.1, dur: null, after: 'notice', offset: 0,
    from: 'hostStation', to: 'greetHost', facing: 'greetGuest',
    speed: V.hostToGreet,
    waitsFor: 'notice',
    note: 'Rask. De två konvergerar — gästen väntar 1,2 s, och det är ' +
      'poängen med att lägga notice lågt.'
  },
  {
    n: 6, id: 'greet', label: 'hälsning', cls: 'gest',
    actors: ['host', 'guest'], poses: ['poseWelcome', 'poseNod'],
    t0: 4.3, dur: T.greet, after: 'approach', offset: 0,
    at: 'greetHost', facing: 'greetGuest',
    waitsFor: 'BÅDA: approach och seekEye — den senaste av de två',
    note: '1,25 m isär, rakt mot varandra. Gästen nickar tillbaka vid 28 % ' +
      '(poseNod nodAt 0,28). Steg som kräver två aktörer startar när den ' +
      'senaste är på plats, aldrig på en tid.'
  },
  {
    n: 7, id: 'pointSeat', label: 'anvisar bordet', cls: 'gest',
    actors: ['host'], poses: ['posePoint'],
    t0: 6.3, dur: T.greet * (1 - T.greetPointFrom),
    after: 'greet', offset: -T.greet * (1 - T.greetPointFrom),
    at: 'greetHost', facing: 'seat',
    waitsFor: 'greet, 62 % in',
    note: 'Ligger INUTI hälsningens sista 38 % — poseWelcome blandar själv ' +
      'in posePoint. Eget steg efteråt läser som två händelser.'
  },
  {
    n: 8, id: 'lead', label: 'leder till bordet', cls: 'move',
    actors: ['host'], poses: ['poseWalk'],
    t0: 7.5, dur: null, after: 'greet', offset: 0,
    from: 'greetHost', to: 'seatSide', facing: 'seat', speed: V.escort,
    waitsFor: 'greet',
    note: 'Huvudet vänds bakåt en gång mitt på sträckan. Utan den blicken ' +
      'läser eskorten som att gästen förföljer personalen.'
  },
  {
    n: 9, id: 'follow', label: 'följer', cls: 'move',
    actors: ['guest'], poses: ['poseWalk'],
    t0: 9.2, dur: null, after: 'greet', offset: 0,
    from: 'greetGuest', to: 'seat', facing: 'seat', speed: V.escort,
    waitsFor: 'greet + escortLagSec() = 1,65 s',
    note: 'Samma polylinje och samma hastighet som lead, startad 1,65 s ' +
      'senare. Försprånget blir exakt 1,40 m i varje punkt, även i kurvan.'
  },
  {
    n: 10, id: 'showChair', label: 'visar stolen', cls: 'gest',
    actors: ['host'], poses: ['posePoint'],
    t0: 11.5, dur: T.hostPointAtSeat, after: 'lead', offset: 0,
    at: 'seatSide', facing: 'seat',
    waitsFor: 'lead',
    note: 'Värden står kvar tills gästen är framme. Steget finns för att ' +
      'gästen inte ska anlända till en tom plats.'
  },
  {
    n: 11, id: 'sit', label: 'sätter sig', cls: 'gest',
    actors: ['guest'], poses: ['poseSitTransition'],
    t0: 15.5, dur: T.sitBlend, after: 'follow', offset: 0,
    at: 'seat', facing: 'seat',
    waitsFor: 'follow',
    note: 'blendPose(poseIdle, poseSeated, smooth(u)). Golvet 1,1 s är mätt ' +
      '— under det läser det som ett fall.'
  },
  {
    n: 12, id: 'hostReturn', label: 'går tillbaka', cls: 'move',
    actors: ['host'], poses: ['poseWalk'],
    t0: 15.9, dur: null, after: 'sit', offset: -T.sitBlend + T.hostReturnOverlap,
    from: 'seatSide', to: 'hostStation', facing: 'entrance', speed: V.hostReturning,
    waitsFor: 'sit, 0,4 s in',
    note: 'ÖVERLAPP 1. Väntar värden ut sittandet blir hen en vaktpost.'
  },
  {
    n: 13, id: 'serverIdle', label: 'fyllnadsarbete', cls: 'fill',
    actors: ['server'], poses: ['poseFillWork'],
    t0: 0.0, dur: null, after: null, offset: 0, endsWith: 'serverToTable',
    at: 'serverStation', facing: 'seat',
    waitsFor: 'ett bord som satt sig',
    note: 'poseFillWork på 0,38. Blicken upp mot rummet var 2,4 s.'
  },
  {
    n: 14, id: 'serverToTable', label: 'till bordet', cls: 'move',
    actors: ['server'], poses: ['poseWalk'],
    t0: 18.8, dur: null, after: 'sit', offset: T.serverCue,
    from: 'serverStation', to: 'orderSpot', facing: 'seat', speed: V.serverEmpty,
    waitsFor: 'sit + 2,0 s',
    note: 'Satt → vid bordet blir 5,5 s i en matsal av den här storleken. ' +
      'Talet är skillnaden mellan omhändertagen och påpassad.'
  },
  {
    n: 15, id: 'readMenu', label: 'läser menyn', cls: 'dwell',
    actors: ['guest'], poses: ['poseSeated'],
    t0: 16.8, dur: null, after: 'sit', offset: 0, endsWith: 'order',
    at: 'seat', facing: 'seat',
    waitsFor: 'serverToTable (elastiskt)',
    note: 'TILLÄGG (delning). Uppehåll, inte gest. Slås readMenu och order ' +
      'samman kommer servitören i samma sekund som gästen satt sig — den ' +
      'vanligaste enskilda felkänslan i en restaurangsimulering.'
  },
  {
    n: 16, id: 'order', label: 'beställning', cls: 'gest',
    actors: ['server', 'guest'], poses: ['poseTakeOrder', 'poseSeated'],
    t0: 22.3, dur: T.order, after: 'serverToTable', offset: 0,
    at: 'orderSpot', facing: 'seat',
    waitsFor: 'serverToTable',
    note: '0,92 m, 0,388 rad på gästens framhögra sida. Servitören står ' +
      'inte rakt framför en sittande gäst och inte bakom.'
  },
  {
    n: 17, id: 'serverToPass', label: 'till passet', cls: 'move',
    actors: ['server'], poses: ['poseWalk'],
    t0: 28.8, dur: null, after: 'order', offset: 0,
    from: 'orderSpot', to: 'passServerSide', facing: 'passKitchenSide',
    speed: V.serverEmpty,
    waitsFor: 'order',
    note: 'Vägen får inte korsa köordningen. Rummets sak, inte partiturets.'
  },
  {
    n: 18, id: 'fileOrder', label: 'lämnar ordern', cls: 'gest',
    actors: ['server'], poses: ['poseOffer'],
    t0: 33.3, dur: T.fileOrder, after: 'serverToPass', offset: 0,
    at: 'passServerSide', facing: 'passKitchenSide',
    waitsFor: 'serverToPass',
    note: 'ÖVERLÄMNING 2. Räcker lappen över passet.'
  },
  {
    n: 19, id: 'chefPrep', label: 'förbereder', cls: 'fill',
    actors: ['chef'], poses: ['poseFillWork'],
    t0: 0.0, dur: null, after: null, offset: 0, endsWith: 'cook',
    at: 'chefStation', facing: 'chefStation',
    waitsFor: 'en order på passet',
    note: 'poseFillWork på 0,55. Kocken lämnar aldrig köket och är vänd mot ' +
      'bänken, inte mot rummet.'
  },
  {
    n: 20, id: 'cook', label: 'lagar', cls: 'dwell',
    actors: ['chef'], poses: ['poseWork'],
    t0: 34.1, dur: T.cook, after: 'fileOrder',
    offset: -T.fileOrder + T.cookStartsAfterFile,
    at: 'chefStation', facing: 'chefStation',
    waitsFor: 'fileOrder, 0,8 s in',
    note: 'ÖVERLAPP 2. Köket svarar på pappret, inte på att gången blir tom.'
  },
  {
    n: 21, id: 'plateUp', label: 'ställer på passet', cls: 'gest',
    actors: ['chef'], poses: ['poseSetDown'],
    t0: 48.9, dur: T.plateUp, after: 'cook', offset: 0,
    at: 'passKitchenSide', facing: 'passServerSide',
    waitsFor: 'cook',
    note: 'ÖVERLÄMNING 3. Kocken tar ett steg till passet och går tillbaka.'
  },
  {
    n: 22, id: 'serverFill', label: 'fyllnadsarbete', cls: 'fill',
    actors: ['server'], poses: ['poseFillWork'],
    t0: 34.9, dur: null, after: 'fileOrder', offset: 0, endsWith: 'serverAwait',
    at: 'serverStation', facing: 'seat',
    waitsFor: 'plateUp, via serverAwait (elastiskt)',
    note: 'ÖVERLAPP 3 och ENDA ELASTISKA BLOCKET. Ligger helt inuti ' +
      'kokningen och avslutas av den. Krymper det under 0,6 s ska det utgå ' +
      'helt och servitören stanna vid passet.'
  },
  {
    n: 23, id: 'serverAwait', label: 'väntar på passet', cls: 'fill',
    actors: ['server'], poses: ['poseAttend'],
    t0: 49.9, dur: T.passAnticipation, after: 'plateUp', offset: -T.passAnticipation,
    at: 'passServerSide', facing: 'passKitchenSide',
    waitsFor: 'plateUp',
    note: 'Enda overksamma väntan i partituret. Riktad — poseAttend med ' +
      'clasp, blicken på det hen väntar på — och kort. Över ~2 s ska bytas ' +
      'mot fyllnadsarbete.'
  },
  {
    n: 24, id: 'pickup', label: 'hämtar', cls: 'gest',
    actors: ['server'], poses: ['poseSetDown'],
    t0: 51.1, dur: T.pickup, after: 'plateUp', offset: 0,
    at: 'passServerSide', facing: 'passKitchenSide',
    waitsFor: 'plateUp',
    note: 'poseSetDown med reachAt 0,9. Väntar på plateUp, inte på en tid — ' +
      'det är därför serverFill måste vara elastiskt.'
  },
  {
    n: 25, id: 'carryOut', label: 'bär ut', cls: 'move',
    actors: ['server'], poses: ['poseCarry'],
    t0: 52.6, dur: null, after: 'pickup', offset: 0,
    from: 'passServerSide', to: 'serveSpot', facing: 'seat',
    speed: V.serverCarrying,
    waitsFor: 'pickup',
    note: 'poseCarry med phase ur sträckan — bärande under gång är samma ' +
      'pose, inte en fjärde variant.'
  },
  {
    n: 26, id: 'setDown', label: 'ställer fram', cls: 'gest',
    actors: ['server'], poses: ['poseSetDown'],
    t0: 58.1, dur: T.setDown, after: 'carryOut', offset: 0,
    at: 'serveSpot', facing: 'seat',
    waitsFor: 'carryOut',
    note: '0,75 m från gästen, lutar in. reachAt 0,8.'
  },
  {
    n: 27, id: 'wishWell', label: 'önskar smaklig', cls: 'gest',
    actors: ['server'], poses: ['poseNod'],
    t0: 60.5, dur: T.wishWell, after: 'setDown', offset: 0,
    at: 'serveSpot', facing: 'seat',
    waitsFor: 'setDown',
    note: 'Nick och ett halvt steg bakåt. Utan den lämnar servitören bordet ' +
      'som en maskin.'
  },
  {
    n: 28, id: 'awaitFood', label: 'väntar på maten', cls: 'dwell',
    actors: ['guest'], poses: ['poseSeated'],
    t0: 28.8, dur: null, after: 'order', offset: 0, endsWith: 'setDown',
    at: 'seat', facing: 'seat',
    waitsFor: 'setDown (elastiskt mot köket)',
    note: 'poseSeated med huvudvridning 0,34 Hz. 31,7 s vid 1× — det längsta ' +
      'uppehållet i partituret och det som 4× ska ta ut.'
  },
  {
    n: 29, id: 'dine', label: 'äter', cls: 'dwell',
    actors: ['guest'], poses: ['poseDine'],
    t0: 60.5, dur: T.dine, after: 'setDown', offset: 0,
    at: 'seat', facing: 'seat',
    waitsFor: 'setDown',
    note: 'poseSeated här läser som att gästen väntar. En matsal full av ' +
      'väntande gäster var det provspelet visade.'
  },
  {
    n: 30, id: 'requestCheck', label: 'begär notan', cls: 'gest',
    actors: ['guest'], poses: ['poseSignal'],
    t0: 82.5, dur: T.requestCheck, after: 'dine', offset: 0,
    at: 'seat', facing: 'serverStation',
    waitsFor: 'dine',
    note: 'TILLÄGG — SAKNAS I §2. Utan steget kan gästen inte be om något: ' +
      'kommer servitören av sig själv blir gästen avhyst, kommer ingen ' +
      'sitter gästen kvar i evighet. Kräver gästtillstånd, fråga 16.'
  },
  {
    n: 31, id: 'serverIdle2', label: 'fyllnadsarbete', cls: 'fill',
    actors: ['server'], poses: ['poseFillWork'],
    t0: 65.2, dur: null, after: 'wishWell', offset: 0,
    endsWith: 'answerSignal',
    at: 'serverStation', facing: 'seat',
    waitsFor: 'requestCheck + 0,7 s, via answerSignal (elastiskt)',
    note: 'Blicken mot rummet är det som gör att signalen kan besvaras på ' +
      '0,7 s. Längden är mellanrummet, inte ett val.'
  },
  {
    n: 32, id: 'answerSignal', label: 'svarar', cls: 'move',
    actors: ['server'], poses: ['poseWalk'],
    t0: 83.2, dur: null, after: 'requestCheck',
    offset: -T.requestCheck + T.answerSignal,
    from: 'serverStation', to: 'paySpot', facing: 'seat', speed: V.serverEmpty,
    waitsFor: 'requestCheck + 0,7 s',
    note: '0,7 s till rörelse. Möjligt bara därför att fyllnadsarbetet höll ' +
      'blicken i rummet — samma mekanism som värdens 0,9 s vid dörren.'
  },
  {
    n: 33, id: 'pay', label: 'betalning', cls: 'gest',
    actors: ['server', 'guest'], poses: ['poseOffer', 'poseOffer'],
    t0: 86.6, dur: T.pay, after: 'answerSignal', offset: 0,
    at: 'paySpot', facing: 'seat',
    waitsFor: 'answerSignal',
    note: '0,98 m. Båda räcker fram en gång, i mitten av steget — gästens ' +
      'poseOffer läggs ovanpå poseSeated via targetYaw.'
  },
  {
    n: 34, id: 'stand', label: 'reser sig', cls: 'gest',
    actors: ['guest'], poses: ['poseSitTransition'],
    t0: 91.6, dur: T.standBlend, after: 'pay', offset: 0,
    at: 'seat', facing: 'seatApproach',
    waitsFor: 'pay',
    note: 'Samma blend baklänges. En tiondel längre än att sätta sig.'
  },
  {
    n: 35, id: 'leave', label: 'går ut', cls: 'move',
    actors: ['guest'], poses: ['poseWalk'],
    t0: 93.0, dur: null, after: 'stand', offset: 0,
    from: 'seat', to: 'outside', speed: V.guestLeaving,
    waitsFor: 'stand',
    note: 'Snabbare än in. Passerar värden på ~1,2 m.'
  },
  {
    n: 36, id: 'farewell', label: 'tar farväl', cls: 'gest',
    actors: ['host'], poses: ['poseNod'],
    t0: 94.2, dur: T.farewell, after: 'stand', offset: T.farewellStep,
    at: 'farewellSpot', facing: 'entrance',
    waitsFor: 'stand + 1,2 s',
    note: 'Värden möter gästen på vägen ut i stället för att nicka från sin ' +
      'station. Går dit och tillbaka; t0 och dur inkluderar gången.'
  },
  {
    n: 37, id: 'clearTable', label: 'dukar av', cls: 'dwell',
    actors: ['server'], poses: ['poseFillWork'],
    t0: 95.5, dur: T.clearTable, after: 'stand', offset: T.clearCue,
    at: 'serveSpot', facing: 'seat',
    waitsFor: 'stand + 2,2 s',
    note: 'TILLÄGG — SAKNAS I §2. Servicen slutar när bordet kan tas av ' +
      'nästa gäst, inte när gästen är ute genom dörren. Det är också det ' +
      'som ger servitören något att göra i slutet av kedjan i stället för ' +
      'att teleportera hem till sin station.'
  },
  {
    n: 38, id: 'dropAtPass', label: 'lämnar disken', cls: 'gest',
    actors: ['server'], poses: ['poseSetDown'],
    t0: 105.9, dur: T.dropAtPass, after: 'clearTable', offset: 0,
    at: 'passServerSide', facing: 'passKitchenSide',
    waitsFor: 'clearTable',
    note: 'Sista steget. Först nu är bordet ledigt och reduceraren kan ' +
      'tilldela det igen.'
  }
];

/** Hela servicen vid 1×, sekunder. HÄRLETT: sista stegets slut + 1,2 s. */
export const SERVICE_TOTAL_1X = 108.5;

/**
 * Kedjan är inte en kedja. Den är tre överlämningar, och varje
 * överlämning äger en väntan. Det är den strukturen tillståndsmaskinen
 * ska ha — inte trettioåtta steg i rad.
 */
export const HANDOFFS = [
  { from: 'host', to: 'seat', completedBy: 'sit', waitOwnedBy: 'readMenu' },
  { from: 'server', to: 'pass', completedBy: 'fileOrder', waitOwnedBy: 'serverFill' },
  { from: 'chef', to: 'server', completedBy: 'plateUp', waitOwnedBy: 'awaitFood' }
] as const;

/** Väntanregeln. En figur utan uppgift är förankrad vid en station och
 *  vänd mot det den bevakar. Aldrig fri i rummet, aldrig helt stilla. */
export const IDLE_RULE = {
  host: { at: 'hostStation', facing: 'entrance', pose: 'poseAttend', sweepHz: 0.55, sweepRad: 0.42 },
  server: { at: 'serverStation', facing: 'seat', pose: 'poseFillWork', intensity: 0.38 },
  chef: { at: 'chefStation', facing: 'chefStation', pose: 'poseFillWork', intensity: 0.55 },
  guest: { at: 'seat', facing: 'seat', pose: 'poseSeated', headHz: 0.34 },
  /** Övre gräns för overksam väntan i kamerans sikte. Över den: byt mot
   *  poseFillWork vid närmaste station. */
  maxIdleSecondsInView: 2.0
} as const;

// #endregion partituret

// #region proveniens
//
// Arton fall har handlat om ett tal utan grund. Därför står varje tal i
// partituret nedan med sin härkomst. Fyra kategorier:
//
//   VAL       Vårt beslut. Det finns inget att härleda det ur — någon
//             måste välja, och vi valde. `basis` säger vad vi vägde och
//             vad som går sönder i andra riktningen. Detta är talen ni
//             ska ifrågasätta.
//   FÖLJER    Räknas fram ur andra tal. Ändrar ni källan ändras detta
//             automatiskt. Att sätta ett sådant tal för hand är ett fel.
//   MÄTT      Läst i den godkända modellen eller i riggen. Kan
//             efterprövas; hittar ni ett annat värde är det vårt fel.
//   ÖVERTAGET Kommer från figureRig.ts, briefen eller befintlig kod.
//             Inte vårt att ändra.

export type NumberKind = 'VAL' | 'FÖLJER' | 'MÄTT' | 'ÖVERTAGET';

export interface Provenance {
  name: string;
  value: number | string;
  kind: NumberKind;
  basis: string;
}

export const PROVENANCE: Provenance[] = [
  // ---- avstånd
  {
    name: 'SERVICE_DISTANCES.greet', value: 1.25, kind: 'VAL',
    basis: 'Räknat ur ÖVERTAGET axelbredd 0,46 (figureRig.guestShoulderWidth) ' +
      'plus VALT krav minPersonalAir 0,75: 0,46 + 0,75 ≈ 1,21, avrundat upp ' +
      'till 1,25. Kravet 0,75 m fri luft är vårt val. Lägre (briefens 0,8 m ' +
      'ger 0,34 m luft) läser som konfrontation eller förtrolighet; högre än ' +
      '~1,6 m gör att posen måste bli poseGreet igen, alltså en vinkning.'
  },
  {
    name: 'SERVICE_DISTANCES.minPersonalAir', value: 0.75, kind: 'VAL',
    basis: 'Ingen grund utöver bedömning i modellen. Detta är det enda talet ' +
      'i hälsningen som är fritt — greet följer av det.'
  },
  {
    name: 'SERVICE_DISTANCES.escortLead', value: 1.40, kind: 'VAL',
    basis: 'Bedömt i modellen. Under ~1,0 m läser gästen som påhängd, över ' +
      '~2,0 m som bortglömd. Ingen härledning finns; talet ska prövas mot ' +
      'Vision Owners öga och inte mot en formel.'
  },
  {
    name: 'SERVICE_DISTANCES.order', value: 0.92, kind: 'VAL',
    basis: 'Räckvidd (axel 0,29 + underarm 0,25 + hand 0,09 = 0,63 ur ' +
      'figureRig) plus marginal, så servitören kan lämna något på bordet ' +
      'utan att luta sig in. Marginalen är vald.'
  },
  {
    name: 'SERVICE_DISTANCES.serve', value: 0.75, kind: 'VAL',
    basis: 'Kortare än order eftersom framställningen SKA innebära en ' +
      'inlutning — posen bär då gesten. Valt, inte räknat.'
  },
  {
    name: 'SERVICE_DISTANCES.pay', value: 0.98, kind: 'FÖLJER',
    basis: 'order + 0,06. Sex centimeter längre därför att ingenting ställs ' +
      'på bordet. Källan är order; ändra den, inte denna.'
  },
  {
    name: 'SERVICE_DISTANCES.serverOffsetAngle', value: 0.388, kind: 'VAL',
    basis: '22°. Vald ur två krav som båda är våra: gästen ska inte behöva ' +
      'vrida sig (under ~35°) och servitörens fotavtryck ska hamna utanför ' +
      'bordsskivan (över ~15° vid 0,92 m från en 0,90 m skiva). Intervallet ' +
      'följer, mittpunkten är vald.'
  },
  {
    name: 'SERVICE_DISTANCES.hostOffsetAngle', value: 0, kind: 'VAL',
    basis: 'Rakt mot. Aktivt valt: en mottagande värd som står snett läser ' +
      'som förbipasserande. Noll är ett värde här, inte ett utebliget.'
  },
  // ---- hastigheter
  {
    name: 'SERVICE_SPEEDS.escort', value: 0.85, kind: 'VAL',
    basis: 'Gästens takt. Vald långsammare än värdens egen gång; det är ' +
      'skillnaden som är läsbar, inte talet.'
  },
  {
    name: 'SERVICE_SPEEDS.hostToGreet', value: 1.25, kind: 'VAL',
    basis: 'Vald HÖGRE än escort, av samma skäl. Att komma emot någon sker ' +
      'raskt, att leda någon sker i gästens takt — samma figur, två ' +
      'hastigheter, elva sekunder emellan.'
  },
  {
    name: 'SERVICE_SPEEDS.guestHesitant', value: 0.32, kind: 'VAL',
    basis: 'Vald så att sista 0,30 m tar ~1,0 s. Talet är en följd av att vi ' +
      'ville ha en sekunds tvekan; sekunden är valet.'
  },
  {
    name: 'SERVICE_SPEEDS.serverCarrying', value: 0.95, kind: 'VAL',
    basis: 'Lägre än serverEmpty 1,15. Ingen fysikalisk grund — bärande ska ' +
      'bara läsa som försiktigare.'
  },
  {
    name: 'övriga hastigheter', value: '0,90–1,20', kind: 'VAL',
    basis: 'Alla valda inom normal gånghastighet. Inget av dem bär betydelse ' +
      'på egen hand; de är vad de behöver vara för att sträckorna ska ta ' +
      'rimlig tid.'
  },
  // ---- tider, val
  {
    name: 'SERVICE_TIMING.notice', value: 0.9, kind: 'VAL',
    basis: 'Prövat 0–3,5 s i modellen. Över ~2,5 s läser rummet som tomt. ' +
      'Talet är valt lågt därför att det inte är kontakttiden som avgör ' +
      'intrycket utan tiden till synlig rörelse — se nedan.'
  },
  {
    name: 'tid till synlig rörelse', value: 1.3, kind: 'FÖLJER',
    basis: 'notice + hostTurn = 0,9 + 0,4. Det tal vi egentligen ställde in; ' +
      'de två källorna delades bara för att vändningen skulle kunna ses.'
  },
  {
    name: 'SERVICE_TIMING.hostTurn', value: 0.4, kind: 'VAL',
    basis: 'Kortaste tid en vändning kan läsas på. Bedömt, inte mätt.'
  },
  {
    name: 'SERVICE_TIMING.greet', value: 3.2, kind: 'VAL',
    basis: 'Vald. Under ~2,2 s hinner bugningen inte läsas när den easas in ' +
      'över 14 %; över ~4,5 s blir mottagandet en ceremoni. Detta är talet ' +
      'som avgör om 4× fungerar, eftersom det är det längsta gest-steget ' +
      'i entrén.'
  },
  {
    name: 'SERVICE_TIMING.greetPointFrom', value: 0.62, kind: 'VAL',
    basis: 'Andel av hälsningen där posePoint börjar blandas in. Vald så att ' +
      'anvisningen får ~1,2 s, vilket är strax över vad en riktad gest ' +
      'behöver. Kan flyttas fritt mellan 0,5 och 0,75.'
  },
  {
    name: 'SERVICE_TIMING.sitBlend', value: 1.3, kind: 'MÄTT',
    basis: 'Golvet 1,1 s är mätt i modellen: under det läser blendPose(idle, ' +
      'seated) som ett fall. 1,3 är golvet plus en marginal, och marginalen ' +
      'är vald.'
  },
  {
    name: 'SERVICE_TIMING.standBlend', value: 1.4, kind: 'VAL',
    basis: 'sitBlend + 0,1. Att resa sig går inte fortare än att sätta sig. ' +
      'Tiondelen är vald.'
  },
  {
    name: 'SERVICE_TIMING.serverCue', value: 2.0, kind: 'VAL',
    basis: 'Fördröjning efter att gästen satt sig innan servitören lämnar ' +
      'stationen. Tillsammans med gångtiden ger den 5,5 s till bordet. Vid 0 ' +
      'blir servitören påpassande, över ~6 s läser bordet som förbisett.'
  },
  {
    name: 'satt → servitör vid bordet', value: 5.5, kind: 'FÖLJER',
    basis: 'serverCue 2,0 + sträckan serverStation → orderSpot delat med ' +
      'serverEmpty 1,15. Ändras rummet ändras talet, och det är rätt.'
  },
  {
    name: 'SERVICE_TIMING.order', value: 6.5, kind: 'VAL',
    basis: 'Vald så att huvudets pendling block ↔ gäst hinner tre varv ' +
      '(poseTakeOrder, sin(u·3π)). Tre varv är valet; 6,5 s följer av att ' +
      'ett varv ska vara läsbart.'
  },
  {
    name: 'SERVICE_TIMING.cook', value: 14.0, kind: 'VAL',
    basis: 'Uppehåll, komprimeras fritt. Enda kravet är att det rymmer ' +
      'servitörens fyllnadsarbete med marginal. Inget i talet är härlett — ' +
      'sätt det till vad matlagningsmodellen säger när den finns.'
  },
  {
    name: 'SERVICE_TIMING.dine', value: 22.0, kind: 'VAL',
    basis: 'Samma sak. Vald som det längsta blocket i partituret så att 4× ' +
      'har något att ta ut. Ersätts av gästens måltidsmodell.'
  },
  {
    name: 'SERVICE_TIMING.answerSignal', value: 0.7, kind: 'VAL',
    basis: 'Svarstid på gästens signal. Vald efter samma resonemang som ' +
      'notice: det är tiden till rörelse som läses. Möjlig bara därför att ' +
      'fyllnadsarbetet håller blicken i rummet.'
  },
  {
    name: 'SERVICE_TIMING.passAnticipation', value: 1.2, kind: 'VAL',
    basis: 'Hur tidigt servitören är vid passet. Vald under IDLE_RULE:s ' +
      'maxIdleSecondsInView 2,0 — taket är vårt val, 1,2 är valt med marginal.'
  },
  {
    name: 'IDLE_RULE.maxIdleSecondsInView', value: 2.0, kind: 'VAL',
    basis: 'Övre gräns för overksam väntan i kamerans sikte. Bedömt i ' +
      'modellen; ingen härledning. Regeln är viktigare än talet.'
  },
  {
    name: 'SERVICE_TIMING.cookStartsAfterFile', value: 0.8, kind: 'VAL',
    basis: 'Överlapp 2. Vald så att köket svarar på pappret och inte på att ' +
      'gången blir tom. Under ~0,4 s börjar kocken innan lappen är framme.'
  },
  {
    name: 'SERVICE_TIMING.hostReturnOverlap', value: 0.4, kind: 'VAL',
    basis: 'Överlapp 1. Vald så kort som möjligt utan att värden vänder innan ' +
      'gästen är i rörelse nedåt.'
  },
  {
    name: 'övriga gest-tider', value: '1,2–5,0', kind: 'VAL',
    basis: 'fileOrder 1,55 · plateUp 2,2 · pickup 1,5 · setDown 2,4 · ' +
      'wishWell 1,2 · requestCheck 1,8 · pay 5,0 · farewell 3,0 · ' +
      'clearTable 5,2 · dropAtPass 1,4 · clearCue 2,2 · farewellStep 1,2 · ' +
      'hostPointAtSeat 1,1. Alla valda, alla bedömda i modellen, ingen ' +
      'härledd. Det är dessa tretton Vision Owner faktiskt godkänner när ' +
      'hen säger att rytmen håller.'
  },
  // ---- följer
  {
    name: 'escortLagSec()', value: 1.65, kind: 'FÖLJER',
    basis: 'escortLead 1,40 / escort 0,85. Att sätta fördröjningen för hand ' +
      'bryter försprånget i kurvorna.'
  },
  {
    name: 'alla move-varaktigheter', value: 'sträcka / hastighet', kind: 'FÖLJER',
    basis: 'Inget move-steg har en författad varaktighet. Sträckan kommer ur ' +
      'rummet, hastigheten ur SERVICE_SPEEDS.'
  },
  {
    name: 'readMenu · awaitFood · serverFill · serverIdle · chefPrep', value: 'mellanrum',
    kind: 'FÖLJER',
    basis: 'Längden är avståndet till det steg de slutar med (endsWith). ' +
      'Ingen av dem har ett eget tal, och ingen får få ett.'
  },
  {
    name: 'greet:s start', value: 4.3, kind: 'FÖLJER',
    basis: 'max(approach.t1, seekEye.t1). Steg med två aktörer startar när ' +
      'den senaste är på plats — aldrig på en tid.'
  },
  {
    name: 'alla t0 i SERVICE_SCORE', value: '0–105,9', kind: 'FÖLJER',
    basis: 'Upplösta ur after/offset/endsWith i den godkända modellen, ' +
      'rummets sträckor inräknade. Står i tabellen för läsbarhet. Räknar ' +
      'koden ur dem går partituret sönder första gången köket är sent.'
  },
  {
    name: 'SERVICE_TOTAL_1X', value: 108.5, kind: 'FÖLJER',
    basis: 'dropAtPass.t1 + 1,2 s eftersläng.'
  },
  // ---- mätt
  {
    name: 'gest-andel vid 1×', value: 0.34, kind: 'MÄTT',
    basis: 'Summa gest-varaktighet / total, läst i modellen.'
  },
  {
    name: 'gest-andel vid 4× på spelklockan', value: 0.67, kind: 'MÄTT',
    basis: 'Samma mätning med tempoForGameSpeed(4). Inverteringen är hela ' +
      'skälet att gest inte får skalas: vid 4× på allt faller andelen ' +
      'tillbaka till 0,34 och varje handling blir för kort att uppfatta.'
  },
  {
    name: 'gästens väntan på värden', value: 1.2, kind: 'MÄTT',
    basis: 'seekEye.t1 → greet.t0 i modellen. Följer av notice, gångtider och ' +
      'rummets mått; inget av talen sattes för att träffa 1,2.'
  },
  {
    name: 'luft mellan kroppar vid greet', value: 0.79, kind: 'MÄTT',
    basis: 'greet 1,25 − axelbredd 0,46. Vid briefens 0,8 m blir samma tal ' +
      '0,34 m.'
  },
  // ---- övertaget
  {
    name: 'axelbredd 0,46 / 0,40', value: '0,46 / 0,40', kind: 'ÖVERTAGET',
    basis: 'figureRig.FIGURE.guestShoulderWidth / staffShoulderWidth.'
  },
  {
    name: 'sitshöjd 0,45 · hjässa 1,70 · räckvidd 0,63', value: '—', kind: 'ÖVERTAGET',
    basis: 'figureRig.FIGURE. Alla avståndsberäkningar här vilar på dem.'
  },
  {
    name: 'sekvensens ordning', value: '13 steg', kind: 'ÖVERTAGET',
    basis: 'Briefens §2. Våra fyra tillägg (seekEye, readMenu/order-delningen, ' +
      'requestCheck, clearTable/dropAtPass) är VAL och märkta som sådana i ' +
      'respektive note.'
  },
  {
    name: 'speltempo 4×', value: 4, kind: 'ÖVERTAGET',
    basis: 'Briefens §2. Tempoklasserna är dimensionerade mot det talet.'
  }
];

/** VAL-talen är de som behöver ett godkännande. Räkna dem i stället för
 *  att lita på en siffra i en kommentar. */
export function choiceCount(): number {
  return PROVENANCE.filter(function (p) { return p.kind === 'VAL'; }).length;
}

// #endregion proveniens

// #region upplösning

export interface ResolvedStep extends ServiceStep { start: number; end: number; }

export interface ResolveInput {
  /** Sträcka i meter per move-steg. Kallaren mäter i sitt rum —
   *  partituret känner inga koordinater. */
  lengths: Partial<Record<ServiceStepId, number>>;
  fallbackLength?: number;
  scale: TempoScale;
  /** Sekunder från arrive:s start till att gästen passerar tröskeln.
   *  `notice` mäts från DEN punkten, inte från arrive:s slut. */
  thresholdAt?: number;
}

/**
 * Räknar fram absoluta tider ur beroendena. Anropa om varje gång en
 * varaktighet visar sig bli annorlunda än författad — det är hela
 * skälet att datat inte bär absoluta tider.
 */
export function resolveScore(input: ResolveInput): ResolvedStep[] {
  const scale = input.scale;
  const fallback = input.fallbackLength ?? 4;
  const steps: ResolvedStep[] = SERVICE_SCORE.map(function (s) {
    return Object.assign({}, s, { start: NaN, end: NaN });
  });
  const byId = new Map<ServiceStepId, ResolvedStep>();
  steps.forEach(function (s) { byId.set(s.id, s); });

  function scaleOf(cls: TempoClass): number {
    if (cls === 'gest') return scale.gest;
    if (cls === 'move') return scale.move;
    return scale.dwell;
  }

  function lengthOf(s: ResolvedStep): number {
    if (s.cls !== 'move') return 0;
    const len = input.lengths[s.id] ?? fallback;
    return (len / (s.speed ?? 1)) * scale.move;
  }

  function duration(s: ResolvedStep): number {
    if (s.cls === 'move') return lengthOf(s);
    if (s.dur === null || s.dur === undefined) return 0;
    return s.dur * scaleOf(s.cls);
  }

  let moved = true;
  let guard = 0;
  while (moved && guard++ < 64) {
    moved = false;
    steps.forEach(function (s) {
      if (!Number.isNaN(s.start)) return;
      if (s.after === null) {
        s.start = 0;
      } else if (s.id === 'notice') {
        s.start = (input.thresholdAt ?? 0) * scale.move + SERVICE_TIMING.notice * scale.gest;
      } else {
        const dep = byId.get(s.after);
        if (!dep || Number.isNaN(dep.end)) return;
        let off = s.offset ?? 0;
        if (s.id === 'follow') off += escortLagSec(scale);
        s.start = dep.end + off * (s.cls === 'gest' ? scale.gest : scale.move);
      }
      s.end = s.start + duration(s);
      moved = true;
    });
  }

  // Steg med två aktörer startar när den senaste är på plats.
  const greet = byId.get('greet');
  const approach = byId.get('approach');
  const seek = byId.get('seekEye');
  if (greet && approach && seek) {
    const d = greet.end - greet.start;
    greet.start = Math.max(approach.end, seek.end);
    greet.end = greet.start + d;
    const point = byId.get('pointSeat');
    if (point) {
      point.start = greet.start + d * SERVICE_TIMING.greetPointFrom;
      point.end = greet.end;
    }
  }

  // Elastiska block: längden är mellanrummet.
  steps.forEach(function (s) {
    if (!s.endsWith) return;
    const target = byId.get(s.endsWith);
    if (!target || Number.isNaN(target.start)) return;
    s.end = Math.max(s.start, target.start);
  });

  steps.sort(function (a, b) { return a.start - b.start; });
  return steps;
}

export function gestShare(resolved: ResolvedStep[]): number {
  let gest = 0;
  let total = 0;
  resolved.forEach(function (s) {
    if (s.cls === 'gest') gest += s.end - s.start;
    if (s.end > total) total = s.end;
  });
  return total > 0 ? gest / total : 0;
}

// #endregion upplösning

// ---------- ÖPPNA FRÅGOR TILL SIMULERINGEN ----------------------------
//
// 1. Två nya gästtillstånd. `requestCheck` kräver en kant
//    `dining → wantsCheck`, och `clearTable` kräver att bordet är
//    upptaget efter att gästen bytt till leaving. I dag frigörs platsen
//    i samma ögonblick gästen reser sig, så reduceraren kan tilldela
//    den till någon som då sätter sig vid ett dukat bord. BLOCKERANDE
//    för de två stegen, inte för resten. Fråga 16.
//
// 2. Gest-klassen kräver en egen klocka. scale.gest === 1 vid varje
//    speltempo betyder att gestuppgifter inte får drivas av spelets
//    deltatid. Enda punkten i leveransen som kostar något i koden.
//    BEKRÄFTA. Fråga 17.
//
// 3. Sex ankarroller finns inte i businessRoom.ts: greetHost, seatSide,
//    orderSpot, serveSpot, paySpot, farewellSpot. Alla härledbara ur
//    seats[i] plus vinkel och avstånd härifrån — men härledningen måste
//    veta var möbelkanten går. Vi förordar att rummet publicerar dem.
//    Fråga 18.
//
// 4. Partituret är skrivet för EN gäst. Ett par ändrar greet (+0,6 s),
//    order (+2,4 s) och clearTable. Säg vilket som är normalfallet.
//    Fråga 19.
//
// 5. De nio poserna ligger här, inte i figureRig.ts. De importerar bara
//    riggens primitiver och kan flyttas in oförändrade; `progress` och
//    `clasp` hör då i PoseOptions. Säg om det ska vara en egen order.
//    Fråga 20.
//
// 6. Ingen navigering. Stegen bär från/till som roller; vägen mellan
//    dem är kollisionslagrets sak, per briefens §5. Går en figur genom
//    bardisken kan partituret inte rätta det.
