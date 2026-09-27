// figureActs — gästernas, personalens, spelarens och mentorns rörelser.
//
// DESIGN_SPEC_NEXUS_V1 §4 (paket 1). SUPERSEDING_DIRECTIVE_004 §3.
// Formmall: figureRig.ts (poserna) och serviceScore.ts (enveloppade gester).
//
// Kontrakt (samma som riggen):
//   • Rena funktioner (t | phase, options) → FigurePose. Ingen klocka, inget
//     tillstånd, inga slumptal. Samma indata ger samma bildruta.
//   • Inga nya led, inga nya mått, inga nya buffertar. Allt är ledvinklar
//     på riggen som redan finns.
//   • Enda geometrin i filen är insatsringen (§4.3) — en platt ring i
//     golvplanet, byggd en gång, fylld med drawRange.
//
// ── Det som bär läsbarheten ───────────────────────────────────────
// Specen: "Spelaren ska från kamerahöjd kunna se vilken gäst som behöver
// hjälp nu." Från 23 m och 48° lutning är en gäst ungefär 30 pixlar hög.
// Det som syns är tre saker, i den ordningen:
//   1. HÖJD. En stående gäst bland sittande. Därför reser sig "på väg att
//      gå" — det är den starkaste signal riggen har, och den reserveras
//      för den gäst som faktiskt håller på att förloras.
//   2. RIKTNING. Kalotten som vänder sig bort från bordet. "Otålig" vrider
//      huvud och bål mot köket med ryck var 2,2 s — ett huvud som pendlar
//      läses på avstånd, ett huvud som står still gör det inte.
//   3. LUTNING. Bålen fram mot bordet (otålig), bakåt i stolen (lugn).
// Fingertrummandet i specen är för litet för kameran; det blir här hela
// underarmen som slår mot bordet på 3,2 Hz. Det är trummandet sett på 23 m.
//
// ── Stress i tempot, inte i ansiktet ─────────────────────────────
// §4.2: "Stressen ska synas i tempot." Varje personalpose tar `stress`
// 0..1 för HÅLLNINGEN (bålen fram, blicken som rycker upp mot kön), men
// tempot är anroparens: driv posens tid med en integrerad arbetsklocka,
//   workClock += dt * staffTempo(stress).rate
// och gångfasen med staffTempo(stress).walkSpeed. Att multiplicera väggtid
// med en faktor i stället ger ett hopp i fasen varje gång stressen ändras.

import * as THREE from 'three';
import {
  FigurePose, PoseArm, PoseOptions,
  poseIdle, poseSeated, poseWalk, poseCarry, poseGreet, blendPose
} from './figureRig';
import { poseDine, poseTakeOrder, poseOffer, poseNod, posePoint, poseSignal } from './serviceScore';

// #region typer

export interface ActOptions extends PoseOptions {
  /** Framdrift 0..1 genom en enveloppad gest. */
  progress?: number;
  /** 0 = lugn, 1 = stressad. Hållning; tempot är anroparens (staffTempo). */
  stress?: number;
  /** Väntan och skål finns både sittande och stående. Default true för gäster. */
  seated?: boolean;
}

export type Who = 'gäst' | 'personal' | 'spelaren' | 'mentorn';

export interface ActSpec {
  id: string;
  who: Who;
  label: string;
  /** Vad kameran läser. En rad, från 23 m. */
  readsAs: string;
  /** 't' = sekunder, 'phase' = gångcykler, 'progress' = 0..1 genom gesten. */
  drive: 't' | 'phase' | 'progress';
  /** Hur länge en gest tar vid 1× (progress-drivna), sekunder. */
  seconds?: number;
  seated?: boolean;
  /** Personal: har lugnt och stressat läge. */
  stressable?: boolean;
}

// #endregion

// ---------- hjälpare ----------

const LEG_FRONT = { swing: 0.05, spread: 0.05, knee: 0.08, ankle: 0.06 };
const LEG_BACK = { swing: -0.03, spread: 0.05, knee: 0.12, ankle: 0.10 };

function clamp01(u: number): number { return Math.max(0, Math.min(1, u)); }
function smooth(u: number): number { const k = clamp01(u); return k * k * (3 - 2 * k); }
function bell(u: number, c: number, w: number): number { const x = (u - c) / w; return Math.exp(-x * x); }
/** 0→1→0 över [a, b], med mjuka kanter. */
function window01(u: number, a: number, b: number, edge: number): number {
  return smooth((u - a) / edge) * (1 - smooth((u - (b - edge)) / edge));
}
function T(p: FigurePose) { return p.torso ?? {}; }
function Hd(p: FigurePose) { return p.head ?? {}; }

/** Sittande bas med underarmarna på bordet i stället för på låren. */
function seatedAtTable(t: number, yaw: number): FigurePose {
  const b = poseSeated(t, { targetYaw: yaw });
  return {
    ...b,
    armL: { swing: 0.78, lift: 0.10, elbow: 0.95 },
    armR: { swing: 0.78, lift: 0.10, elbow: 0.95 }
  };
}

function withSeatedBase(p: FigurePose, t: number): FigurePose {
  const b = poseSeated(t);
  return { ...p, lift: b.lift, hipDrop: b.hipDrop, legL: b.legL, legR: b.legR };
}

// ---------- tempo ----------

/**
 * Personalens tempo. VAL: vid full stress 1,7× arbetstakt och 1,6 m/s gång
 * mot 1,1 lugnt. Under 1,5× läste stressen som "lite rask" i modellen; över
 * 1,9× blir poseWork:s armar ryckiga vid 60 bildrutor.
 */
export function staffTempo(stress: number): { rate: number; walkSpeed: number; stride: number } {
  const s = clamp01(stress ?? 0);
  return { rate: 1 + 0.7 * s, walkSpeed: 1.1 + 0.5 * s, stride: 1 + 0.3 * s };
}

/**
 * Väntans tre lägen ur tålamodet 0..1. VAL: 0,55 och 0,20. Mellanläget är
 * brett med flit — det är där spelaren hinner göra något. Kräver ett
 * tålamodsvärde per gäst i sim-lagret (FRAGOR §21).
 */
export const WAIT_THRESHOLDS = { impatient: 0.55, leaving: 0.20 };
export type WaitState = 'lugn' | 'otålig' | 'påVägAttGå';
export function waitStateFor(patience: number): WaitState {
  if (patience < WAIT_THRESHOLDS.leaving) return 'påVägAttGå';
  if (patience < WAIT_THRESHOLDS.impatient) return 'otålig';
  return 'lugn';
}

// =====================================================================
// GÄSTER
// =====================================================================

/** Ankomma. Gång med sökande blick — huvudet sveper ±0,35 rad två gånger per
 *  fyra steg. Det är skillnaden mot en gäst som går till sitt bord. */
export function poseArrive(phase: number, o?: ActOptions): FigurePose {
  const w = poseWalk(phase, { intensity: 0.9 });
  const sweep = 0.35 * Math.sin((phase ?? 0) * Math.PI * 0.5);
  return { ...w, torso: { ...T(w), pitch: 0.03 }, head: { pitch: -0.02, yaw: sweep + (o?.targetYaw ?? 0) * 0.5 } };
}

/** Vänta, lugn. Sittande: lutad bakåt, underarmarna på bordet, långsam blick.
 *  Stående (vid entrén): händerna knäppta framför, stilla. */
export function poseWaitCalm(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const drift = 0.25 * Math.sin(time * 2 * Math.PI * 0.12);
  if (o?.seated === false) {
    const b = poseIdle(time);
    return { ...b, armL: { swing: 0.28, lift: -0.02, elbow: 1.05 }, armR: { swing: 0.28, lift: -0.02, elbow: 1.05 },
             head: { pitch: 0.02, yaw: drift } };
  }
  const b = seatedAtTable(time, 0);
  return { ...b, torso: { pitch: -0.04, yaw: 0.04 * Math.sin(time * 0.3) }, head: { pitch: 0.02, yaw: drift } };
}

/** Vänta, otålig. Bålen fram, blicken rycker mot köket (`targetYaw`) var 2,2 s
 *  och hålls där 1 s, underarmen trummar mot bordet på 3,2 Hz. */
export function poseWaitImpatient(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const yaw = o?.targetYaw ?? 1.2;
  const cyc = (time % 2.2) / 2.2;
  const look = window01(cyc, 0.05, 0.55, 0.08);
  const drum = Math.abs(Math.sin(time * 2 * Math.PI * 3.2));
  if (o?.seated === false) {
    const b = poseIdle(time, { intensity: 2.2 });
    const tap = Math.max(0, Math.sin(time * 2 * Math.PI * 2.4));
    return {
      ...b,
      torso: { pitch: 0.04, yaw: yaw * 0.2 * look, roll: T(b).roll },
      head: { pitch: -0.04, yaw: yaw * 0.75 * look },
      // Armarna i kors: axeln fram, underarmen tvärs över bålen.
      armL: { swing: 0.62, lift: -0.16, elbow: 1.95 },
      armR: { swing: 0.66, lift: -0.16, elbow: 1.90 },
      legR: { swing: 0.06, spread: 0.05, knee: 0.10 + 0.18 * tap, ankle: 0.10 + 0.3 * tap }
    };
  }
  const b = seatedAtTable(time, 0);
  return {
    ...b,
    torso: { pitch: 0.16, yaw: yaw * 0.32 * look, roll: 0 },
    head: { pitch: 0.0, yaw: yaw * 0.8 * look },
    armR: { swing: 0.84, lift: 0.14, elbow: 0.9 + 0.16 * drum },
    armL: { swing: 0.78, lift: 0.08, elbow: 1.05 }
  };
}

/**
 * Vänta, på väg att gå. En ENVELOPP över `progress` (≈ 6 s vid 1×):
 *   0,00–0,25  reser sig
 *   0,25–0,55  vrider sig om och tar jackan från stolsryggen
 *   0,55–0,85  drar på jackan — armarna bakåt och upp, en i taget
 *   0,85–1,00  står, blicken mot dörren (`targetYaw`)
 * Den stående gästen är signalen. Efter posen: poseLeaveUnhappy.
 */
export function poseWaitLeaving(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const u = clamp01(o?.progress ?? (time % 6) / 6);
  const door = o?.targetYaw ?? -1.4;
  const stand = poseIdle(time, { intensity: 1.6 });
  const seated = o?.seated === false ? stand : poseSeated(time);
  let p = blendPose(seated, stand, smooth(u / 0.25));
  const reach = window01(u, 0.25, 0.58, 0.1);
  const onL = window01(u, 0.52, 0.74, 0.08);
  const onR = window01(u, 0.66, 0.88, 0.08);
  const leave = smooth((u - 0.84) / 0.12);
  const reachPose: FigurePose = {
    ...stand,
    torso: { pitch: 0.18, yaw: 1.0, roll: 0.06 },
    head: { pitch: 0.2, yaw: 0.9 },
    armR: { swing: -0.5, lift: 0.28, elbow: 0.5 },
    armL: { swing: 0.2, lift: 0.1, elbow: 0.4 }
  };
  p = blendPose(p, reachPose, reach);
  const armL: PoseArm = onL > 0.01 ? { swing: -0.35 * onL, lift: 0.95 * onL, elbow: 1.5 * onL + 0.3 } : (p.armL as PoseArm);
  const armR: PoseArm = onR > 0.01 ? { swing: -0.35 * onR, lift: 0.95 * onR, elbow: 1.5 * onR + 0.3 } : (p.armR as PoseArm);
  return {
    ...p,
    armL: armL,
    armR: armR,
    torso: { pitch: (T(p).pitch ?? 0) + 0.06 * Math.max(onL, onR), yaw: (T(p).yaw ?? 0) * (1 - leave) + door * 0.3 * leave },
    head: { pitch: (Hd(p).pitch ?? 0) * (1 - leave), yaw: (Hd(p).yaw ?? 0) * (1 - leave) + door * 0.7 * leave }
  };
}

/** Läser menyn. Båda händer håller kortet i brösthöjd, huvudet ner, en
 *  sidvändning var 5 s. */
export function poseReadMenu(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const b = poseSeated(time, { targetYaw: o?.targetYaw });
  const turn = bell((time % 5) / 5, 0.5, 0.06);
  return {
    ...b,
    torso: { pitch: 0.1, yaw: 0 },
    head: { pitch: 0.38 - 0.06 * turn, yaw: 0.04 * Math.sin(time * 0.6) },
    armL: { swing: 0.98, lift: 0.14, elbow: 1.55 },
    armR: { swing: 0.98 + 0.12 * turn, lift: 0.14 + 0.32 * turn, elbow: 1.55 - 0.2 * turn }
  };
}

/** Beställer. Huvudet upp mot servitören (`targetYaw`), handen pekar ner i
 *  kortet och öppnar sig mot hen två gånger över gesten. */
export function poseOrder(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const u = clamp01(o?.progress ?? (time % 4) / 4);
  const yaw = o?.targetYaw ?? 0.9;
  const b = poseSeated(time, { targetYaw: yaw });
  const open = bell(u, 0.3, 0.12) + bell(u, 0.7, 0.12);
  return {
    ...b,
    torso: { pitch: 0.06, yaw: yaw * 0.28 },
    head: { pitch: -0.08 + 0.2 * bell(u, 0.5, 0.1), yaw: yaw * 0.75 },
    armL: { swing: 0.95, lift: 0.12, elbow: 1.5 },
    armR: { swing: 0.8 + 0.3 * open, lift: 0.14 + 0.2 * open, elbow: 1.25 - 0.5 * open }
  };
}

/** Äter — serviceScore.poseDine, oförändrad. */
export function poseEat(t: number, o?: ActOptions): FigurePose { return poseDine(t, o); }

/** Dricker. Glaset till munnen på 0,1 Hz, huvudet bakåt vid klunken. */
export function poseDrink(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const b = seatedAtTable(time, o?.targetYaw ?? 0);
  const sip = window01((time % 10) / 10, 0.2, 0.5, 0.08);
  return {
    ...b,
    torso: { pitch: 0.04 - 0.06 * sip, yaw: T(b).yaw },
    head: { pitch: 0.06 - 0.22 * sip, yaw: Hd(b).yaw },
    armR: { swing: 0.78 + 0.5 * sip, lift: 0.1 + 0.1 * sip, elbow: 0.95 + 1.2 * sip }
  };
}

/** Skålar. Envelopp: glaset upp mot bordets mitt, klink på 0,45, klunk, ner.
 *  Bålen lutar in. Fungerar sittande och stående. */
export function poseToast(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const u = clamp01(o?.progress ?? (time % 5) / 5);
  const b = o?.seated === false ? poseIdle(time) : seatedAtTable(time, 0);
  const up = window01(u, 0.0, 0.55, 0.18);
  const clink = bell(u, 0.45, 0.04);
  const sip = window01(u, 0.55, 0.9, 0.08);
  return {
    ...b,
    torso: { pitch: 0.06 + 0.14 * up - 0.05 * sip, yaw: (o?.targetYaw ?? 0) * 0.3 },
    head: { pitch: 0.02 - 0.2 * sip, yaw: (o?.targetYaw ?? 0) * 0.5 },
    armR: {
      swing: 0.78 + 0.62 * up + 0.08 * clink + 0.4 * sip,
      lift: 0.1 + 0.08 * up,
      elbow: 0.95 - 0.55 * up + 1.25 * sip
    }
  };
}

/** Pratar. Bålen mot sällskapet (`targetYaw`), händerna gestikulerar på
 *  0,7 Hz, ett skratt bakåt var 7 s. */
export function poseTalk(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const yaw = o?.targetYaw ?? 0.6;
  const b = seatedAtTable(time, yaw);
  const g = Math.sin(time * 2 * Math.PI * 0.7);
  const laugh = bell((time % 7) / 7, 0.6, 0.05);
  return {
    ...b,
    torso: { pitch: 0.08 - 0.14 * laugh, yaw: yaw * 0.35 },
    head: { pitch: 0.02 + 0.05 * Math.sin(time * 2 * Math.PI * 1.1) - 0.2 * laugh, yaw: yaw * 0.7 },
    armR: { swing: 0.85 + 0.2 * g, lift: 0.18 + 0.14 * Math.max(0, g), elbow: 1.1 - 0.2 * g },
    armL: { swing: 0.8, lift: 0.1 + 0.08 * Math.max(0, -g), elbow: 1.0 }
  };
}

/** Ber om notan — serviceScore.poseSignal. Samma hand upp; en signal, inte
 *  ett väntläge. */
export function poseAskBill(t: number, o?: ActOptions): FigurePose { return poseSignal(t, o); }

/** Betalar. serviceScore.poseOffer på sittande bas: handen ut i brösthöjd
 *  mot servitören, en lätt bugning i samma rörelse. */
export function posePay(t: number, o?: ActOptions): FigurePose {
  return withSeatedBase(poseOffer(t, o), t);
}

/** Går nöjd. Upprätt, huvudet uppe, en vinkning bakåt de första 20 %. */
export function poseLeaveHappy(phase: number, o?: ActOptions): FigurePose {
  const w = poseWalk(phase, { intensity: 0.95 });
  const u = clamp01(o?.progress ?? 1);
  const wave = 1 - smooth(u / 0.2);
  const back = o?.targetYaw ?? 2.2;
  const out: FigurePose = { ...w, torso: { ...T(w), pitch: 0.0 }, head: { pitch: -0.04, yaw: (Hd(w).yaw ?? 0) + back * 0.35 * wave } };
  if (wave <= 0.01) return out;
  const g = poseGreet(phase * 0.8, { side: 1, targetYaw: back });
  return { ...out, armR: blendPose({ armR: w.armR }, { armR: g.armR }, wave).armR };
}

/** Går missnöjd. Snabbt, bålen fram, blicken i golvet, jackan knuten mot
 *  bröstet med vänster arm, höger arm stel. Läses på gånghastigheten först. */
export function poseLeaveUnhappy(phase: number, o?: ActOptions): FigurePose {
  const w = poseWalk(phase, { intensity: 1.3 });
  const s = Math.sin((phase ?? 0) * Math.PI * 2);
  return {
    ...w,
    torso: { pitch: 0.16, yaw: (T(w).yaw ?? 0) * 0.5, roll: 0 },
    head: { pitch: 0.28, yaw: 0 },
    armL: { swing: 0.62, lift: -0.08, elbow: 1.75 },
    armR: { swing: 0.12 * s, lift: 0.03, elbow: 0.32 }
  };
}

// =====================================================================
// PERSONAL — alla tar `stress`
// =====================================================================

function hurry(p: FigurePose, s: number, t: number, lookYaw: number): FigurePose {
  // Stressens hållning: bålen fram, och blicken som rycker upp mot kön/
  // dörren var 1,6 s. Blicken upp är det enda i hållningen som syns ovanifrån.
  const flick = s > 0 ? window01((t % 1.6) / 1.6, 0.1, 0.35, 0.05) * s : 0;
  return {
    ...p,
    torso: { ...T(p), pitch: (T(p).pitch ?? 0) + 0.08 * s },
    head: { pitch: (Hd(p).pitch ?? 0) * (1 - flick) - 0.05 * flick, yaw: (Hd(p).yaw ?? 0) * (1 - flick) + lookYaw * flick }
  };
}

/** Kock vid station. Hackar på 1,3 Hz; var sjätte sekund vänder bålen mot
 *  andra stationen. Stressad: panntag (båda armar upp) var 3 s och blicken
 *  mot passet. */
export function poseCook(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const s = clamp01(o?.stress ?? 0);
  const chop = Math.max(0, Math.sin(time * 2 * Math.PI * 1.3));
  const turn = bell((time % 6) / 6, 0.8, 0.07);
  const toss = s * bell((time % 3) / 3, 0.5, 0.06);
  const p: FigurePose = {
    lift: 0.008 * chop,
    hipDrop: 0,
    torso: { pitch: 0.2, yaw: 0.5 * turn, roll: 0.02 * chop },
    head: { pitch: 0.34, yaw: 0.4 * turn },
    armL: { swing: 0.82 + 0.3 * toss, lift: 0.18, elbow: 1.1 - 0.4 * toss },
    armR: { swing: 0.74 + 0.22 * chop + 0.3 * toss, lift: 0.14, elbow: 1.2 - 0.35 * chop - 0.3 * toss },
    legL: LEG_FRONT,
    legR: LEG_BACK
  };
  return hurry(p, s, time, o?.targetYaw ?? 1.0);
}

/** Servitör som bär ut. poseCarry med gång. Lugn: upprätt, blicken framåt.
 *  Stressad: bålen fram, längre steg (staffTempo.stride), blicken sveper. */
export function poseServe(phase: number, o?: ActOptions): FigurePose {
  const s = clamp01(o?.stress ?? 0);
  const p = poseCarry(0, { phase: phase, intensity: staffTempo(s).stride });
  const sweep = s * 0.4 * Math.sin((phase ?? 0) * Math.PI);
  return { ...p, torso: { ...T(p), pitch: -0.02 + 0.12 * s }, head: { pitch: 0.1 - 0.06 * s, yaw: sweep } };
}

/** Bartender som häller. Vänster hand håller glaset på disken, höger lyfter
 *  flaskan och tippar den (underarmen nedåt från en hög axel). Cykel 4 s
 *  i arbetsklockan; stressad hälls två glas per cykel. */
export function posePour(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const s = clamp01(o?.stress ?? 0);
  const u = (time % 4) / 4;
  const pour = window01(u, 0.2, 0.6, 0.1) + (s > 0.5 ? window01(u, 0.65, 0.95, 0.08) : 0);
  const p: FigurePose = {
    lift: -0.004,
    hipDrop: 0,
    torso: { pitch: 0.14, yaw: -0.1 * pour, roll: 0 },
    head: { pitch: 0.36, yaw: -0.1 },
    armL: { swing: 0.92, lift: 0.1, elbow: 1.25 },
    armR: { swing: 0.7 + 0.55 * pour, lift: 0.22 + 0.18 * pour, elbow: 1.2 - 0.7 * pour },
    legL: LEG_FRONT,
    legR: LEG_BACK
  };
  return hurry(p, s, time, o?.targetYaw ?? 1.2);
}

/** Diskare. Händerna nere i hon, skrubbar i cirkel på 1,1 Hz; var femte
 *  sekund lyfter höger hand en tallrik till stället. */
export function poseDish(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const s = clamp01(o?.stress ?? 0);
  const w = time * 2 * Math.PI * 1.1;
  const rack = bell((time % 5) / 5, 0.7, 0.07);
  const p: FigurePose = {
    lift: -0.006,
    hipDrop: 0,
    torso: { pitch: 0.28, yaw: 0.05 * Math.sin(w), roll: 0 },
    head: { pitch: 0.42, yaw: 0 },
    armL: { swing: 0.6 + 0.08 * Math.sin(w), lift: 0.12 + 0.06 * Math.cos(w), elbow: 0.9 },
    armR: { swing: 0.6 - 0.08 * Math.sin(w) + 0.8 * rack, lift: 0.12 - 0.06 * Math.cos(w), elbow: 0.9 - 0.4 * rack },
    legL: { swing: 0.02, spread: 0.08, knee: 0.12, ankle: 0.1 },
    legR: { swing: -0.02, spread: 0.08, knee: 0.12, ankle: 0.1 }
  };
  return hurry(p, s, time, o?.targetYaw ?? -1.4);
}

/** Sommelier som visar en flaska. Flaskan vilar på vänster underarm (vågrät,
 *  etiketten mot gästen), höger hand under halsen, en bugning 30 % in.
 *  Stressad: grundare bugning, kortare hållning — samma gest, mindre tid. */
export function posePresentBottle(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const s = clamp01(o?.stress ?? 0);
  const u = clamp01(o?.progress ?? (time % 5) / 5);
  const yaw = o?.targetYaw ?? 0;
  const bow = bell(u, 0.3, 0.14) * (1 - 0.6 * s);
  const present = window01(u, 0.05, 0.9, 0.12);
  return {
    lift: -0.003,
    hipDrop: 0,
    torso: { pitch: 0.06 + 0.18 * bow, yaw: yaw * 0.35 },
    head: { pitch: 0.1 + 0.16 * bow, yaw: yaw * 0.55 },
    armL: { swing: 0.2 + 0.18 * present, lift: 0.14, elbow: 0.5 + 0.75 * present },
    armR: { swing: 0.3 + 0.28 * present, lift: -0.1 * present, elbow: 0.4 + 0.6 * present },
    legL: LEG_FRONT,
    legR: LEG_BACK
  };
}

/** Vakt vid entrén (nattklubben). Bred stans, armarna i kors, blicken sveper
 *  kön. Stressad: höger arm ut i stopp var 2,5 s, bålen fram. */
export function poseBouncer(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const s = clamp01(o?.stress ?? 0);
  const stop = s * window01((time % 2.5) / 2.5, 0.2, 0.7, 0.1);
  const sweep = 0.5 * Math.sin(time * 2 * Math.PI * (0.12 + 0.2 * s));
  return {
    lift: -0.004,
    hipDrop: 0,
    torso: { pitch: 0.02 + 0.08 * s, yaw: sweep * 0.25 },
    head: { pitch: 0.04, yaw: sweep },
    armL: { swing: 0.62, lift: -0.16, elbow: 1.95 },
    armR: { swing: 0.66 + 0.7 * stop, lift: -0.16 + 0.34 * stop, elbow: 1.9 - 1.75 * stop },
    legL: { swing: 0.04, spread: 0.13, knee: 0.1, ankle: 0.08 },
    legR: { swing: -0.04, spread: 0.13, knee: 0.1, ankle: 0.08 }
  };
}

/** Bryggare vid kärlen (ölkrogen). Rör i mäsken med en lång paddel: båda
 *  händer högt fram, bålen vrider ±0,25 på 0,35 Hz; var åttonde sekund upp
 *  mot mätaren. */
export function poseBrew(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const s = clamp01(o?.stress ?? 0);
  const w = Math.sin(time * 2 * Math.PI * 0.35);
  const gauge = bell((time % 8) / 8, 0.85, 0.05);
  const p: FigurePose = {
    lift: -0.004,
    hipDrop: 0,
    torso: { pitch: 0.12, yaw: 0.25 * w, roll: 0.03 * w },
    head: { pitch: 0.2 - 0.35 * gauge, yaw: 0.1 * w },
    armL: { swing: 1.05 + 0.1 * w, lift: 0.1, elbow: 0.55 },
    armR: { swing: 1.2 - 0.1 * w, lift: 0.14, elbow: 0.75 },
    legL: { swing: 0.1, spread: 0.08, knee: 0.14, ankle: 0.1 },
    legR: { swing: -0.1, spread: 0.08, knee: 0.18, ankle: 0.16 }
  };
  return hurry(p, s, time, 1.2);
}

/** Receptionist (gästgiveriet). Skriver med båda händer, tittar upp och
 *  räcker fram en nyckel var sjätte sekund. Stressad: tittar inte upp —
 *  vilket är just det som ser fel ut. */
export function poseReception(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const s = clamp01(o?.stress ?? 0);
  const type = Math.sin(time * 2 * Math.PI * 2.4);
  const greet = (1 - s) * window01((time % 6) / 6, 0.6, 0.95, 0.08);
  return {
    lift: -0.003,
    hipDrop: 0,
    torso: { pitch: 0.16 - 0.1 * greet, yaw: 0 },
    head: { pitch: 0.34 - 0.36 * greet, yaw: (o?.targetYaw ?? 0) * 0.5 * greet },
    armL: { swing: 0.72, lift: 0.14, elbow: 1.35 + 0.05 * type },
    armR: { swing: 0.72 + 0.35 * greet, lift: 0.14, elbow: 1.35 - 0.05 * type - 0.5 * greet },
    legL: LEG_FRONT,
    legR: LEG_BACK
  };
}

/** DJ. Huvudet nickar på 2 Hz (120 bpm), höger hand på tallriken, vänster
 *  håller lurarna mot örat. `stress` är här kvällens energi, 0..1. */
export function poseDJ(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const e = clamp01(o?.stress ?? 0);
  const beat = Math.sin(time * 2 * Math.PI * 2);
  return {
    lift: -0.01 * (1 + beat) * (0.3 + e),
    hipDrop: 0,
    torso: { pitch: 0.12 + 0.03 * beat * e, yaw: 0.05 * Math.sin(time * 0.5), roll: 0 },
    head: { pitch: 0.24 + (0.06 + 0.1 * e) * beat, yaw: 0 },
    armL: { swing: 0.55, lift: 0.62, elbow: 2.25 },
    armR: { swing: 0.95, lift: 0.12, elbow: 0.95 + 0.06 * beat },
    legL: { swing: 0.04, spread: 0.07, knee: 0.1 + 0.08 * (1 + beat) * e, ankle: 0.06 },
    legR: { swing: -0.04, spread: 0.07, knee: 0.12 + 0.08 * (1 + beat) * e, ankle: 0.1 }
  };
}

// =====================================================================
// SPELAREN — action-knappens tre insatser (§4.3)
// =====================================================================

/** Ta en beställning — serviceScore.poseTakeOrder, något högre intensitet. */
export function playerTakeOrder(t: number, o?: ActOptions): FigurePose {
  return poseTakeOrder(t, { ...(o ?? {}), intensity: 1.2 });
}

/** Bära ut en rätt. poseCarry med längre steg och blicken uppe. */
export function playerCarry(phase: number, o?: ActOptions): FigurePose {
  const p = poseCarry(0, { phase: phase, intensity: 1.15 });
  return { ...p, head: { pitch: 0.02, yaw: (o?.targetYaw ?? 0) * 0.4 } };
}

/**
 * Lugna en gäst. Hon går ner på huk bredvid bordet — 0,14 m lägre, knäna
 * böjda — lutar sig mot gästen och för handen lugnt nedåt på 0,5 Hz.
 * Att gå ner i höjd är det som läses uppifrån: en stående figur som krymper
 * vid ett bord är en personlig insats, inte en servering.
 */
export function playerCalmGuest(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const u = clamp01(o?.progress ?? 1);
  const k = smooth(u / 0.2) * (1 - smooth((u - 0.88) / 0.12));
  const yaw = o?.targetYaw ?? 0;
  const pat = Math.sin(time * 2 * Math.PI * 0.5);
  const crouch: FigurePose = {
    lift: -0.14,
    hipDrop: 0,
    torso: { pitch: 0.34, yaw: yaw * 0.35 },
    head: { pitch: 0.12, yaw: yaw * 0.55 },
    armR: { swing: 0.92 + 0.06 * pat, lift: 0.14, elbow: 0.35 + 0.1 * pat },
    armL: { swing: 0.5, lift: 0.1, elbow: 1.2 },
    legL: { swing: 0.5, spread: 0.06, knee: 0.85, ankle: 0.35 },
    legR: { swing: 0.18, spread: 0.06, knee: 0.7, ankle: 0.52 }
  };
  return blendPose(poseIdle(time), crouch, k);
}

// ---------- insatsringen ----------

export interface ActionRing {
  group: THREE.Group;
  /** Den fyllda bågen. drawRange skrivs av updateActionRing. */
  arc: THREE.Mesh;
  segments: number;
  dispose: () => void;
}

/** Ringens mått. VAL: 0,62 m ytterradie — utanför en sittande gästs knän,
 *  innanför bordsgrannens stol. 0,09 m bred: 3 px vid 23 m. */
export const RING = { inner: 0.53, outer: 0.62, segments: 64, colour: '#ec3013' };

/**
 * Platt ring i golvplanet, 5 mm upp. En svag hel ring (25 %) + bågen som
 * fylls medurs med insatsens framdrift. Byggs en gång; montera under
 * spelarfiguren eller vid den gäst insatsen gäller.
 */
export function createActionRing(): ActionRing {
  const group = new THREE.Group();
  group.name = 'actionRing';
  const baseMat = new THREE.MeshBasicMaterial({ color: RING.colour, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  const arcMat = new THREE.MeshBasicMaterial({ color: RING.colour, depthWrite: false, side: THREE.DoubleSide });
  const base = new THREE.Mesh(new THREE.RingGeometry(RING.inner, RING.outer, RING.segments, 1), baseMat);
  const arcGeo = new THREE.RingGeometry(RING.inner - 0.01, RING.outer + 0.01, RING.segments, 1, Math.PI / 2, -Math.PI * 2);
  const arc = new THREE.Mesh(arcGeo, arcMat);
  [base, arc].forEach(function (m) { m.rotation.x = -Math.PI / 2; m.position.y = 0.005; m.renderOrder = 2; group.add(m); });
  arcGeo.setDrawRange(0, 0);
  return {
    group: group, arc: arc, segments: RING.segments,
    dispose: function () { base.geometry.dispose(); arcGeo.dispose(); baseMat.dispose(); arcMat.dispose(); group.removeFromParent(); }
  };
}

/** progress 0..1. Allokerar inget. */
export function updateActionRing(ring: ActionRing, progress: number): void {
  const n = Math.round(ring.segments * clamp01(progress));
  ring.arc.geometry.setDrawRange(0, n * 6);
}

// =====================================================================
// MENTORN — från Campus, första dagen
// =====================================================================

/** Förklarar. Pärmen i vänster arm mot bröstet, höger hand öppen mot det hon
 *  talar om (`targetYaw`), blicken växlar mellan spelaren och saken. */
export function poseMentorExplain(t: number, o?: ActOptions): FigurePose {
  const time = t ?? 0;
  const yaw = o?.targetYaw ?? 0.8;
  const g = Math.sin(time * 2 * Math.PI * 0.5);
  const lookAt = window01((time % 4) / 4, 0.1, 0.6, 0.1);
  const b = poseIdle(time);
  return {
    ...b,
    torso: { pitch: 0.05, yaw: yaw * 0.2 * lookAt },
    head: { pitch: 0.04, yaw: yaw * 0.65 * lookAt },
    armL: { swing: 0.72, lift: 0.04, elbow: 1.62 },
    armR: { swing: 0.95 + 0.22 * g, lift: 0.42 + 0.12 * Math.max(0, g), elbow: 0.45 - 0.12 * g }
  };
}

/** Visar. serviceScore.posePoint — anvisningen hålls stilla. */
export function poseMentorPoint(t: number, o?: ActOptions): FigurePose {
  const p = posePoint(t, o);
  return { ...p, armL: { swing: 0.72, lift: 0.04, elbow: 1.62 } };
}

/** Godkänner. En djup nick och händerna knäppta — dagens slut. */
export function poseMentorApprove(t: number, o?: ActOptions): FigurePose {
  const p = poseNod(t, { progress: o?.progress ?? ((t ?? 0) % 3) / 3, nodAt: 0.35, depth: 1.5, targetYaw: o?.targetYaw });
  return { ...p, armL: { swing: 0.34, lift: -0.04, elbow: 1.2 }, armR: { swing: 0.34, lift: -0.04, elbow: 1.2 } };
}

// =====================================================================
// KATALOGEN — det modellen spelar och det Claude Code mappar mot tillstånd
// =====================================================================

export const ACTS: ActSpec[] = [
  { id: 'poseArrive', who: 'gäst', label: 'Ankomma', drive: 'phase', readsAs: 'Går in, huvudet sveper — letar efter någon.' },
  { id: 'poseWaitCalm', who: 'gäst', label: 'Vänta, lugn', drive: 't', seated: true, readsAs: 'Lutad bakåt, stilla. Ingen brådska.' },
  { id: 'poseWaitImpatient', who: 'gäst', label: 'Vänta, otålig', drive: 't', seated: true, readsAs: 'Framåtlutad, huvudet rycker mot köket, armen slår mot bordet.' },
  { id: 'poseWaitLeaving', who: 'gäst', label: 'På väg att gå', drive: 'progress', seconds: 6, seated: true, readsAs: 'Står upp bland sittande. Tar jackan.' },
  { id: 'poseSitTransition', who: 'gäst', label: 'Sätta sig', drive: 'progress', seconds: 1.1, readsAs: 'Sjunker ner på platsen. (serviceScore)' },
  { id: 'poseReadMenu', who: 'gäst', label: 'Läsa menyn', drive: 't', seated: true, readsAs: 'Huvudet ner, händerna framför bröstet.' },
  { id: 'poseOrder', who: 'gäst', label: 'Beställa', drive: 'progress', seconds: 4, seated: true, readsAs: 'Huvudet upp mot servitören, handen öppnas.' },
  { id: 'poseEat', who: 'gäst', label: 'Äta', drive: 't', seated: true, readsAs: 'Hand till mun, huvudet möter den. (poseDine)' },
  { id: 'poseDrink', who: 'gäst', label: 'Dricka', drive: 't', seated: true, readsAs: 'Glaset upp, huvudet bakåt — långsammare än att äta.' },
  { id: 'poseToast', who: 'gäst', label: 'Skåla', drive: 'progress', seconds: 5, seated: true, readsAs: 'Armarna möts över bordets mitt.' },
  { id: 'poseTalk', who: 'gäst', label: 'Prata', drive: 't', seated: true, readsAs: 'Vänd mot sällskapet, händerna i rörelse, skratt bakåt.' },
  { id: 'poseAskBill', who: 'gäst', label: 'Be om notan', drive: 'progress', seconds: 2.4, seated: true, readsAs: 'Handen upp. (poseSignal)' },
  { id: 'posePay', who: 'gäst', label: 'Betala', drive: 'progress', seconds: 3, seated: true, readsAs: 'Handen ut mot servitören.' },
  { id: 'poseLeaveHappy', who: 'gäst', label: 'Gå nöjd', drive: 'phase', readsAs: 'Upprätt, lugn takt, vinkar bakåt.' },
  { id: 'poseLeaveUnhappy', who: 'gäst', label: 'Gå missnöjd', drive: 'phase', readsAs: 'Snabbt, framåtlutad, blicken i golvet.' },
  { id: 'poseCook', who: 'personal', label: 'Kock vid station', drive: 't', stressable: true, readsAs: 'Hackar. Stressad: panntag och blicken mot passet.' },
  { id: 'poseServe', who: 'personal', label: 'Servitör som bär ut', drive: 'phase', stressable: true, readsAs: 'Bär framför sig. Stressad: framåtlutad, längre steg.' },
  { id: 'posePour', who: 'personal', label: 'Bartender som häller', drive: 't', stressable: true, readsAs: 'Armen högt, flaskan tippar. Stressad: två glas per cykel.' },
  { id: 'poseDish', who: 'personal', label: 'Diskare', drive: 't', stressable: true, readsAs: 'Böjd över hon, lyfter tallrikar till stället.' },
  { id: 'posePresentBottle', who: 'personal', label: 'Sommelier visar flaska', drive: 'progress', seconds: 5, stressable: true, readsAs: 'Flaskan på underarmen, bugning.' },
  { id: 'poseBouncer', who: 'personal', label: 'Vakt vid entrén', drive: 't', stressable: true, readsAs: 'Bred stans, armar i kors. Stressad: armen ut, stopp.' },
  { id: 'poseBrew', who: 'personal', label: 'Bryggare', drive: 't', stressable: true, readsAs: 'Rör med paddel, vrider bålen.' },
  { id: 'poseReception', who: 'personal', label: 'Receptionist', drive: 't', stressable: true, readsAs: 'Skriver, tittar upp, räcker nyckel. Stressad: tittar aldrig upp.' },
  { id: 'poseDJ', who: 'personal', label: 'DJ', drive: 't', stressable: true, readsAs: 'Nickar i takt, lurar mot örat. stress = kvällens energi.' },
  { id: 'playerTakeOrder', who: 'spelaren', label: 'Ta en beställning', drive: 'progress', seconds: 3.2, readsAs: 'Blocket i handen, huvudet pendlar. Ring runt.' },
  { id: 'playerCarry', who: 'spelaren', label: 'Bära ut en rätt', drive: 'phase', readsAs: 'Bär, raskt. Ring följer med.' },
  { id: 'playerCalmGuest', who: 'spelaren', label: 'Lugna en gäst', drive: 'progress', seconds: 4, readsAs: 'Går ner på huk vid bordet, handen lugnt nedåt.' },
  { id: 'poseMentorExplain', who: 'mentorn', label: 'Förklarar', drive: 't', readsAs: 'Pärm mot bröstet, öppen hand mot saken.' },
  { id: 'poseMentorPoint', who: 'mentorn', label: 'Visar', drive: 't', readsAs: 'Rak arm, stilla.' },
  { id: 'poseMentorApprove', who: 'mentorn', label: 'Godkänner', drive: 'progress', seconds: 3, readsAs: 'Djup nick, händerna knäppta.' }
];

export const FLAGS = {
  patience:
    'Väntans tre lägen kräver ett tålamodsvärde 0..1 per gäst. waitStateFor() ' +
    'mappar det; trösklarna är VAL. Utan värdet kan bara "lugn" visas. BLOCKERANDE för §4.1.',
  staffStress:
    'Personalens stress 0..1 per roll. Rimligen kö/beläggning per station, ' +
    'men den mappningen är sim-lagrets. staffTempo() ger klockfaktorn.',
  playerAction:
    'Spelarens tre insatser behöver ett insatstillstånd med framdrift 0..1 ' +
    '(progress) och ett mål (gäst eller bord) för ringens placering.',
  jacket:
    'Jackan i poseWaitLeaving är en gest utan föremål. figureProps har ingen ' +
    'jacka; armarna läses som "tar på sig" utan den. En jacka på stolsryggen ' +
    'är nästa rekvisita, om ni vill ha den.',
  serviceScore:
    'Sex av gesterna återanvänds ur serviceScore.ts (poseDine, poseTakeOrder, ' +
    'poseOffer, poseNod, posePoint, poseSignal). Flyttas de till figureRig.ts ' +
    'byts importen — inget annat ändras.',
  mentorProp:
    'Mentorns pärm är en gest. En portfölj finns i figureProps (arketyp ' +
    '"affärsresenär"); vill ni att mentorn bär den, montera den i handAnchorL.'
};
