// ORDER 309 — Designs figureClips.ts ur D5 (2026-10-04), ersätter förra versionen: sju nya klipp (trolley.push, trolley.present, cheese.cut, flambe.pour, flambe.tilt, staff.tiredIdle, staff.hesitate). Två lokala ändringar som förut: EVENT_FLOOR exporteras, och _u i staff.holdDoor (noUnusedParameters).
// figureClips — rummets kroppsspråk: namngivna klipp på den befintliga riggen.
//
// Leverans 2 efter tredje provspelet (teaterns grund), 2026-09-29.
// Bygger på figureRig.ts (applyPose, blendPose, poseWalk, FIGURE) och tableware.ts
// (vad händerna håller). Ersätter inget. figureActs.ts poser gäller som förut; klippen är
// lagret ovanpå, med längd, tempo, början och slut.
//
// Kontrakt (samma som riggen):
//   • Rena funktioner. sampleClip(id, tid, tempo, ctx) ger samma bildruta för samma indata.
//     Ingen klocka, inget tillstånd, inga slumptal.
//   • Inga nya led och inga nya mått. Allt är ledvinklar på riggen som redan finns.
//   • Varje klipp har ett namn, en längd per tempo, loop eller engång, vad händerna håller
//     vid start och slut, händelserna (grepp, släpp, överlämning) och vilka klipp som får följa.
//
// ── Varför klipp ──────────────────────────────────────────────────
// I provspelet stod det i raketen att servitören skar sig i handen, men i rummet syntes
// ingenting. Personalen gick slumpvis och robotaktigt. Med klippen kan en raket börja med
// något spelaren ser: den som ska göra något gör det i rummet först, och frågan kommer sedan.
//
// ── Läsbarhet från 24 m ───────────────────────────────────────────
// Spelets kamera står på 24 m med 50° lutning (SVAR §25). En figur är 55–80 px hög. Det som
// läses är höjd, riktning, armar över axelhöjd och föremål i handen. Därför är gesterna
// förstorade: vinkningen går över huvudet, hällningen tippar flaskan 1,9 rad, skålen möts
// över bordets mitt och den som skär sig viker sig framåt och backar ett steg.
//
// ── Tempo ─────────────────────────────────────────────────────────
// Tre tempon: lugn, normal och stressad. Tempot ändrar tre saker: takten (klippets längd),
// gångfarten och hållningen (bålen fram, blicken som rycker upp). Driv klippets tid med en
// integrerad klocka, clipTime += dt × 1, och byt tempo bara vid klippgräns, annars hoppar
// fasen. Det är samma regel som staffTempo() i figureActs.ts.

import { FIGURE, blendPose, poseWalk } from './figureRig';
import type { FigurePose, PoseArm } from './figureRig';
import type { PropId, HandSide, Tilt, Surface } from './tableware';

// #region types

export type TempoId = 'calm' | 'normal' | 'stressed';
export type Role = 'waiter' | 'bartender' | 'sommelier' | 'cook' | 'dishwasher' | 'guest' | 'staff' | 'host' | 'mentor';
export type ClipGroup = 'staff' | 'waiter' | 'bartender' | 'sommelier' | 'cook' | 'dishwasher' | 'guest' | 'rocket' | 'host' | 'mentor';
/** Kroppens läge vid klippets start och slut. Två klipp kan följa på varandra bara om
 *  slutet på det ena är början på det andra. */
export type Stance = 'stand' | 'seated' | 'walk' | 'hurt';
/** Platsen klippet kräver. 'chair' betyder en stol som följer sittregeln (SEAT_RULE). */
export type Needs = 'floor' | 'chair' | 'stool' | 'lounge' | 'table' | 'bar' | 'pass' | 'station' | 'sink' | 'desk' | 'wheelchair'
  // ORDER 315b del 2 (D7): luckan, stå på vagngolvet med bänken framför.
  | 'hatch'
  // ORDER 319b (D9): stå framför menyskylten.
  | 'sign'
  // ORDER 319c (D9 eatingClips.ts, tillaggClips.ts): ståbordet, sopkorgen, värmaren och marschallen.
  | 'standTable' | 'bin' | 'heater' | 'torch';
/** Sittplatsens sort. Vinbarens 'bar' är 'stool' och 'twotop' är 'chair' (seatKindFromRoom). */
export type SeatKind = 'chair' | 'stool' | 'lounge';
/** Stämningen ett klipp uttrycker (guestMood.ts). Leverans 2026-10-03. */
export type MoodId = 'delighted' | 'content' | 'waiting' | 'impatient' | 'displeased';
export type ClipEventType =
  | 'grab' | 'release' | 'give' | 'switch' | 'stack'
  | 'clink' | 'cork' | 'plated' | 'bell' | 'pay' | 'cut'
  // Leverans 3: tända ett ljus, släppa (ljuset som faller), visa upp något, kvävas (lågan under förklädet)
  | 'light' | 'drop' | 'show' | 'smother'
  // ORDER 317 (D6, Åsas klipp): gesten syns, och repliken eller pratbubblan kan öppnas.
  | 'signal'
  // ORDER 315b del 2 (D7): det som ligger på grillen vänds.
  | 'flip'
  // ORDER 319b (D9 curiousClips.ts, tillaggClips.ts): de nyfikna och blicken på klockan.
  | 'notice' | 'read' | 'sniff' | 'point' | 'decide' | 'queued' | 'glance'
  // ORDER 319c (D9 eatingClips.ts, tillaggClips.ts): tuggan, servetten, sopkorgen och tändaren.
  | 'bite' | 'wipe' | 'toss' | 'spark' | 'ignite' | 'swap';

export interface ClipEvent {
  /** Var i klippet, 0..1. */
  u: number;
  type: ClipEventType;
  hand?: HandSide;
  /** Varifrån (grab) eller vart (release). 'partner' = den andra figuren i samspelet. */
  at?: Surface | 'partner';
  /** ORDER 315b del 2 (D7 fikaClips.ts): föremålet som tas, när det inte står i holds. */
  prop?: PropId;
}

export interface Hands { L?: PropId | 'any'; R?: PropId | 'any' }

export interface ClipCtx {
  /** Sekunder sedan klippet började (sätts av sampleClip). */
  t?: number;
  /** 0..1. Sätts av tempot om den saknas. */
  stress?: number;
  /** Gångfas i cykler, för klipp som går (travel). Från sträckan, inte klockan. */
  phase?: number;
  /** Vridning mot den figuren vänder sig till, radianer i figurens ram. */
  yaw?: number;
  /** 1 eller -1. Vilken sida figuren kliver åt (sitta, resa sig, väja). */
  side?: number;
  /** Vilken hand ett enhandsklipp använder. Default 'R'. Speglar klippet. */
  hand?: HandSide;
  /** Skål och gester finns både sittande och stående. Default: klippets 'from'. */
  seated?: boolean;
  /** ORDER 325 (D11 waiter.wipeTable) — ståbordet på 1,05 m i stället för bordet på 0,74 m. */
  high?: boolean;
  /** Sittplatsen gästen sitter på. Sittande klipp som är författade för stol läggs om till
   *  barstol eller lounge (reseat). Default 'chair'. */
  seatKind?: SeatKind;
  /** Gästens heightMult (figureRig). Behövs för att höften ska landa på en barstol. */
  heightMult?: number;
  /** Armar som håller något från ett tidigare klipp och inte ska röras. */
  keep?: { L?: PoseArm; R?: PoseArm };
  /** Sätts av sampleClip. */
  stride?: number;
  /** ORDER 319b (D9) — de nyfikna: huvudets vridning mot kön och mot gångvägen (radianer i figurens ram),
   *  riktningen mot köns sista plats i figurens ram ([åt höger, framåt], enhetsvektor) och kylan. */
  lookQueue?: number;
  lookPath?: number;
  toQueue?: [number, number];
  cold?: boolean;
}

export interface ClipSpec {
  id: string;
  group: ClipGroup;
  /** Vilka som kan spela klippet. */
  roles: Role[];
  loop: boolean;
  /** Går figuren under klippet? Benen drivs då av ctx.phase och roten av anroparen. */
  travel: boolean;
  /** Längd vid normalt tempo, sekunder. För loopar: en cykel. */
  base: number;
  /** Längd per tempo, sekunder. Fylls i av def(). */
  seconds: Record<TempoId, number>;
  from: Stance;
  to: Stance;
  needs: Needs;
  /** Vad händerna håller vid start och vid slut. */
  holds: Hands;
  ends: Hands;
  events: ClipEvent[];
  next: string[];
  /** Enhandsklipp kan speglas med ctx.hand = 'L'. */
  handed?: boolean;
  pose: (u: number, c: ClipCtx) => FigurePose;
  /** Lutning på det som hålls (flaskan vid hällning, glaset vid klunken). */
  tilt?: (u: number, c: ClipCtx) => { L?: Tilt; R?: Tilt };
  /** Förflyttning under klippet i figurens ram vid start: [x, z, vridning]. x åt höger
   *  hands sida, z framåt. Används av sitta, resa sig, väja och backa. */
  root?: (u: number, c: ClipCtx) => [number, number, number];
  /** Hur långt stolen är utdragen, meter bakåt från sitt läge. */
  chair?: (u: number) => number;
  /** Sittplatsen klippet är författat för. Saknas = stol. Klipp med egen sort läggs inte om. */
  seatKind?: SeatKind;
  /** Stämningsgesterna: vilken stämning klippet visar. Tempot är styrkan: lugn = antydd, stressad = tydlig. */
  mood?: MoodId;
}

export interface ClipSample {
  pose: FigurePose;
  tilt: { L?: Tilt; R?: Tilt };
  root: [number, number, number];
  chair: number;
  u: number;
}

export interface Seat {
  /** Sitsens mitt i världen. */
  x: number;
  z: number;
  /** Vart den som sitter tittar (mot bordet). */
  yaw: number;
  /** Sitshöjd över golvet. */
  seatHeight: number;
  /** Stol, barstol eller lounge. Saknas = stol. */
  kind?: SeatKind;
}

// #endregion types

// ---------- tempo -----------------------------------------------------

export const TEMPO: Record<TempoId, { rate: number; walkSpeed: number; stride: number; stress: number; blendSec: number }> = {
  /** Lugnt: 0,8 × takten, 0,9 m/s. Bålen upprätt, blicken stilla. */
  calm: { rate: 0.8, walkSpeed: 0.9, stride: 0.9, stress: 0, blendSec: 0.4 },
  /** Normalt: 1,2 m/s, som gästernas gång i rummen. */
  normal: { rate: 1.0, walkSpeed: 1.2, stride: 1.0, stress: 0.3, blendSec: 0.3 },
  /** Stressat: 1,5 × takten, 1,6 m/s, längre steg. Bålen fram, blicken rycker upp. Över 1,6
   *  blir hällningen ryckig vid 60 bildrutor. */
  stressed: { rate: 1.5, walkSpeed: 1.6, stride: 1.2, stress: 1, blendSec: 0.18 }
};

/** En gångcykel (två fotisättningar) vid stride 1. */
export const CYCLE_M = 1.25;

// ---------- sittregeln ------------------------------------------------
//
// I provspelet satt en gäst på golvet. Orsaken var att den sittande posen spelades där
// gästen råkade stå, utan stol under. Regeln:
//   1. En sittande pose får bara spelas av en figur som har en stol (Seat) och vars rot står
//      på stolens sitsmitt. canSit() säger nej om stolen saknas eller har fel höjd.
//   2. Man kommer till stolen från sidan, inte bakifrån: sitApproach() ger punkten. Gången
//      ska sluta där, och guest.sit börjar där.
//   3. Höften sänks först när roten är över sitsen. I guest.sit har höften sjunkit 0,1 m
//      först vid u = 0,70, och då står bäckenet 0,04 m från sitsens mitt (uppmätt).
//   4. Stolen dras ut 0,26 m medan gästen kliver in och skjuts in medan hen sätter sig
//      (chair(u)). Rummet ska flytta stolen efter klippet, inte tvärtom.
//   5. checkSeated() mäter efteråt: höftens höjd mot sitsen och avståndet till sitsens mitt.
//      Kör den på varje sittande gäst i provet. Tolerans 2 cm och 12 cm.
// Poserna är författade för sitshöjd 0,45 m (figureRig poseSeated, hipDrop 0,41).
//
// Tillägget (2026-09-29): barstol och lounge, med vinbarens mått (wineBarRoom.ts).
//   Barstol  sits 0,75, fotring 0,30, disken 1,10 och 0,50 m fram. Man kommer bakifrån och
//            snett från sidan, tar stöd mot disken, sätter foten på ringen och glider upp.
//            Stolen står still. guest.sitStool / guest.leaveStool.
//   Lounge   dyna 0,38, 0,72 djup, ryggstöd bakom. Man kommer framifrån, vänder sig om,
//            backar in och sänker sig med bålen framåt som motvikt. Sitter tillbakalutad.
//            guest.sitLounge / guest.leaveLounge.
// Alla sittande loopar (seatedIdle, toast, gesture, lean, pay …) är författade för stol.
// sampleClip lägger om dem till den sits ctx.seatKind säger (reseat): höftens sänkning,
// benen och bålens lutning byts, armarna behålls. På barstolen ligger disken lika högt
// över axeln som bordet på stolen (0,21 m), så underarmarna hamnar på disken utan ändring.
//
// En kort gäst på barstol: riggens sitsankare (applyPose) är byggt för 0,41 m sänkning och
// räcker inte för 0,11. seatLift() ger den lyftning som saknas, så höften landar på sitsen
// för heightMult 0,70–1,12. För stol och lounge är den noll.

export const SEAT_RULE = {
  seatHeight: 0.45,
  seatHeightTolerance: 0.03,
  approachSide: 0.45,
  approachFront: 0.12,
  chairPull: 0.26,
  hipTolerance: 0.02,
  xzTolerance: 0.12
};

/** Lokal punkt i stolens ram (x åt höger hands sida, z framåt) till världen. */
export function seatToWorld(seat: Seat, lx: number, lz: number): [number, number] {
  const s = Math.sin(seat.yaw), c = Math.cos(seat.yaw);
  return [seat.x + lx * c + lz * s, seat.z - lx * s + lz * c];
}

/** Sittplatsernas mått och kroppens läge på dem. drop = hur mycket höften sänks (hipY − sits).
 *  approach = var gången slutar, i sitsens ram [x per sida, z]. */
export const SEAT_KINDS: Record<SeatKind, {
  height: number; drop: number; approach: [number, number];
  legs: { swing: number; spread: number; knee: number; ankle: number };
  torso: number; head: number; sit: string; leave: string; footrest?: number;
}> = {
  chair: { height: 0.45, drop: 0.41, approach: [0.45, 0.12], legs: { swing: 1.46, spread: 0.06, knee: 1.77, ankle: 0.31 }, torso: 0, head: 0, sit: 'guest.sit', leave: 'guest.leave' },
  /** Låret 1,1 rad fram, knät 2,1 — sulan på fotringen 0,30 m, tårna 0,25 m fram. */
  stool: { height: 0.75, drop: 0.11, approach: [0.3, -0.42], legs: { swing: 1.1, spread: 0.08, knee: 2.1, ankle: 1.0 }, torso: 0.04, head: 0, sit: 'guest.sitStool', leave: 'guest.leaveStool', footrest: 0.30 },
  /** Låret 1,55 rad (knät lite över höften), underbenet fram — sulan i golvplanet 0,62 m fram. */
  lounge: { height: 0.38, drop: 0.48, approach: [0, 0.6], legs: { swing: 1.55, spread: 0.08, knee: 1.02, ankle: -0.53 }, torso: -0.18, head: 0.1, sit: 'guest.sitLounge', leave: 'guest.leaveLounge' }
};

/** wineBarRoom.SeatKind → sittregelns sort. */
export function seatKindFromRoom(kind: string): SeatKind {
  if (kind === 'bar') return 'stool';
  if (kind === 'lounge') return 'lounge';
  return 'chair';
}

/** Den lyftning som saknas för att höften ska landa på sitsen för en skalad gäst.
 *  applyPose lägger tillbaka hipY × (1 − mult) × min(1, drop / 0,41); här räknas resten ut. */
export function seatLift(kind: SeatKind, heightMult: number): number {
  const K = SEAT_KINDS[kind];
  const hm = heightMult ?? 1;
  const anchored = FIGURE.hipY * (1 - hm) * Math.min(1, K.drop / FIGURE.seatedHipDrop);
  return K.height - FIGURE.hipY * hm + K.drop - anchored;
}

/** Var gången ska sluta innan sittklippet. side = 1 höger om sitsen, -1 vänster.
 *  Stol: från sidan. Barstol: bakifrån, snett från sidan. Lounge: rakt framifrån. */
export function sitApproach(seat: Seat, side: number): [number, number] {
  const a = SEAT_KINDS[seat.kind ?? 'chair'].approach;
  return seatToWorld(seat, (side ?? 1) * a[0], a[1]);
}

export function canSit(seat: Seat | null | undefined): boolean {
  if (!seat) return false;
  return Math.abs(seat.seatHeight - SEAT_KINDS[seat.kind ?? 'chair'].height) <= SEAT_RULE.seatHeightTolerance;
}

/** Klippet som tar en gäst ned på sitsen, och det som tar hen upp igen. */
export function sitClipFor(seat: Seat): string { return SEAT_KINDS[seat.kind ?? 'chair'].sit; }
export function leaveClipFor(seat: Seat): string { return SEAT_KINDS[seat.kind ?? 'chair'].leave; }

/** Höftens höjd mot sitsen och avståndet till sitsens mitt, efter applyPose. */
export function checkSeated(rig: { joints: { pelvis: { getWorldPosition: (v: any) => any } } }, seat: Seat, V: any) {
  const p = rig.joints.pelvis.getWorldPosition(V);
  const hipError = p.y - seat.seatHeight;
  const xzError = Math.hypot(p.x - seat.x, p.z - seat.z);
  return { hipError: hipError, xzError: xzError, ok: Math.abs(hipError) <= SEAT_RULE.hipTolerance && xzError <= SEAT_RULE.xzTolerance };
}

// ---------- hjälpare --------------------------------------------------

function clamp01(u: number): number { return Math.max(0, Math.min(1, u)); }
function smooth(u: number): number { const k = clamp01(u); return k * k * (3 - 2 * k); }
/** 0 → 1 mellan a och b. */
function ramp(u: number, a: number, b: number): number { return smooth((u - a) / (b - a)); }
/** 0 → 1 → 0 över [a, b] med mjuka kanter. */
function win(u: number, a: number, b: number, e: number): number { return ramp(u, a, a + e) * (1 - ramp(u, b - e, b)); }
function bell(u: number, c: number, w: number): number { const x = (u - c) / w; return Math.exp(-x * x); }
const TAU = Math.PI * 2;

function A(swing: number, lift: number, elbow: number): PoseArm { return { swing: swing, lift: lift, elbow: elbow }; }

const LEG_STAND = { swing: 0.02, spread: 0.035, knee: 0.06, ankle: 0.04 };
const LEG_FRONT = { swing: 0.14, spread: 0.05, knee: 0.12, ankle: 0.1 };
const LEG_BACK = { swing: -0.12, spread: 0.05, knee: 0.16, ankle: 0.02 };
const LEG_SEAT = { swing: 1.46, spread: 0.06, knee: 1.77, ankle: 0.31 };
/** Halvvägs ned: höft 0,8, knä 1,3, fotled 0,5 = knä − höft, så sulan står plan. */
const LEG_CROUCH = { swing: 0.8, spread: 0.06, knee: 1.3, ankle: 0.5 };

const STAND: FigurePose = {
  lift: 0, hipDrop: 0,
  torso: { pitch: 0.02, yaw: 0, roll: 0 }, head: { pitch: 0.04, yaw: 0 },
  armL: A(0.03, 0.06, 0.18), armR: A(0.03, 0.06, 0.18),
  legL: LEG_STAND, legR: LEG_STAND
};
/** Sittande med underarmarna på bordet (bordsskiva 0,75 m, sits 0,45 m). */
const SEAT: FigurePose = {
  lift: 0, hipDrop: FIGURE.seatedHipDrop,
  torso: { pitch: 0.06, yaw: 0, roll: 0 }, head: { pitch: 0.06, yaw: 0 },
  armL: A(0.78, 0.1, 0.95), armR: A(0.78, 0.1, 0.95),
  legL: LEG_SEAT, legR: LEG_SEAT
};
const CROUCH: FigurePose = {
  lift: 0, hipDrop: 0.18,
  torso: { pitch: 0.46, yaw: 0, roll: 0 }, head: { pitch: 0.1, yaw: 0 },
  armL: A(0.45, 0.12, 0.6), armR: A(0.45, 0.12, 0.6),
  legL: LEG_CROUCH, legR: LEG_CROUCH
};

/** Bär-armen: underarmen vågrät framåt, handankaret på 1,12 m. */
export const CARRY_ARM: PoseArm = A(0.35, 0.12, 1.1);
/** Brickarmen: handen i axelhöjd, ut från kroppen. */
export const TRAY_ARM: PoseArm = A(0.25, 0.3, 2.0);
/** Hålla en flaska eller ett kort framför bröstet. */
export const CHEST_ARM: PoseArm = A(0.5, 0.1, 1.3);

/** Ett led djupt: det som anges ersätter basens värden, resten ärvs. */
function P(base: FigurePose, o: any): FigurePose {
  const b: any = base;
  const r: any = { ...b, ...o };
  ['torso', 'head', 'armL', 'armR', 'legL', 'legR'].forEach(function (k) {
    if (o[k]) r[k] = { ...(b[k] ?? {}), ...o[k] };
  });
  return r;
}

/** Nyckelposer längs u, mjukt blandade. Listan ska vara sorterad. */
function keys(u: number, ks: [number, FigurePose][]): FigurePose {
  if (u <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    if (u <= ks[i + 1][0]) {
      const k = (u - ks[i][0]) / (ks[i + 1][0] - ks[i][0]);
      return blendPose(ks[i][1], ks[i + 1][1], smooth(k));
    }
  }
  return ks[ks.length - 1][1];
}

function breathe(p: FigurePose, t: number): FigurePose {
  return { ...p, lift: (p.lift ?? 0) + (Math.sin(t * TAU * 0.22) - 1) * 0.004 };
}

/** Stress i hållningen: bålen fram, huvudet fram. Tempot sköts av längden. */
function strain(p: FigurePose, s: number): FigurePose {
  const t = p.torso ?? {}, h = p.head ?? {};
  return { ...p, torso: { ...t, pitch: (t.pitch ?? 0) + 0.08 * s }, head: { ...h, pitch: (h.pitch ?? 0) + 0.04 * s } };
}

/** Lägger gångens ben, studs och bålsvaj på en pose. `free` = armarna som svänger med. */
function walking(p: FigurePose, phase: number, k: number, free: 'none' | 'L' | 'R' | 'both'): FigurePose {
  const w = poseWalk(phase ?? 0, { intensity: k });
  const t = p.torso ?? {}, wt = w.torso ?? {};
  const r: FigurePose = {
    ...p, lift: w.lift, hipDrop: 0, legL: w.legL, legR: w.legR,
    torso: { pitch: (t.pitch ?? 0) + 0.04, yaw: (t.yaw ?? 0) + (wt.yaw ?? 0) * 0.7, roll: (wt.roll ?? 0) + (t.roll ?? 0) }
  };
  if (free === 'L' || free === 'both') r.armL = w.armL;
  if (free === 'R' || free === 'both') r.armR = w.armR;
  return r;
}

function withYaw(p: FigurePose, torsoYaw: number, headYaw: number): FigurePose {
  const t = p.torso ?? {}, h = p.head ?? {};
  return { ...p, torso: { ...t, yaw: (t.yaw ?? 0) + torsoYaw }, head: { ...h, yaw: (h.yaw ?? 0) + headYaw } };
}

function base(c: ClipCtx, seatedDefault: boolean): FigurePose {
  const seated = c.seated ?? seatedDefault;
  return seated ? SEAT : STAND;
}

function mirrorPose(p: FigurePose): FigurePose {
  const t = p.torso ?? {}, h = p.head ?? {};
  return {
    ...p, armL: p.armR, armR: p.armL, legL: p.legR, legR: p.legL,
    // ORDER 325 — huvudets lutning (D11) speglas som bålens.
    torso: { ...t, yaw: -(t.yaw ?? 0), roll: -(t.roll ?? 0) }, head: { ...h, yaw: -(h.yaw ?? 0), roll: -(h.roll ?? 0) }
  };
}

// ---------- katalogen ------------------------------------------------

function round05(x: number): number { return Math.round(x * 20) / 20; }

function def(c: Omit<ClipSpec, 'seconds'>): ClipSpec {
  const seconds: any = {};
  (['calm', 'normal', 'stressed'] as TempoId[]).forEach(function (k) {
    const T = TEMPO[k];
    seconds[k] = c.travel ? round05((CYCLE_M * T.stride) / T.walkSpeed) : round05(c.base / T.rate);
  });
  return { ...c, seconds: seconds };
}

const STAFF: Role[] = ['waiter', 'bartender', 'sommelier', 'cook', 'dishwasher', 'staff', 'host'];
const FLOOR_STAFF: Role[] = ['waiter', 'bartender', 'sommelier'];

// Kroppens delposer som flera klipp delar.
// Handankaret på 0,81 m och 0,23 m framför roten; med steget in (root) 0,45 m. Tallriken
// släpps där handen är och sjunker högst 7 cm till bordsskivan.
const LEAN_SERVE: FigurePose = P(STAND, { lift: -0.08, torso: { pitch: 0.5 }, head: { pitch: 0.3 }, armR: A(0.3, 0.08, 0.0), armL: A(0.1, 0.1, 0.4), legL: { ...LEG_FRONT, knee: 0.3, ankle: 0.16 }, legR: { ...LEG_BACK, knee: 0.3 } });
const SERVE_BACK: FigurePose = P(STAND, { torso: { pitch: 0.12 }, armR: A(0.12, 0.06, 0.35) });
const HURT: FigurePose = P(STAND, { lift: -0.04, torso: { pitch: 0.36 }, head: { pitch: 0.5 }, armR: A(0.5, 0.05, 1.9), armL: A(0.64, -0.12, 1.65), legL: { ...LEG_FRONT, knee: 0.22, ankle: 0.18 }, legR: { ...LEG_BACK, knee: 0.26 } });

export const CLIPS: Record<string, ClipSpec> = {};
function reg(c: ClipSpec): void { CLIPS[c.id] = c; }

// ===== personal, alla roller ==========================================

reg(def({
  id: 'staff.idle', group: 'staff', roles: STAFF, loop: true, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.walk', 'staff.idle', 'waiter.takeOrder', 'waiter.pickUp', 'waiter.clear', 'bar.pour', 'bar.wipe', 'somm.present', 'cook.station', 'dish.receive'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    const scan = s > 0.5 ? 0.4 * Math.sin(u * TAU * 2) : 0.22 * Math.sin(u * TAU);
    return breathe(P(STAND, { torso: { roll: 0.025 * Math.sin(u * TAU) }, head: { yaw: scan + (c.yaw ?? 0) * 0.5 }, legL: { knee: 0.06 + 0.05 * Math.max(0, Math.sin(u * TAU)) }, legR: { knee: 0.06 + 0.05 * Math.max(0, -Math.sin(u * TAU)) } }), c.t ?? 0);
  }
}));

// ORDER 317 — Designs D6 (nexus-leverans-2026-10-07-d6-asa/asaClips.ts), oförändrade:
// Åsas tre klipp, hälsar, pekar och nickar gillande.
reg(def({
  id: 'asa.greet', group: 'mentor', roles: ['mentor'], loop: false, travel: false, handed: true, base: 2.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.3, type: 'signal' }],
  next: ['staff.idle', 'asa.point', 'asa.nodApprove'],
  pose: function (u, c) {
    const touch = P(STAND, { torso: { roll: -0.03 }, armR: A(1.72, 0.16, 2.2), armL: A(0.08, 0.04, 0.2) });
    const bow = P(touch, { torso: { pitch: 0.12 }, head: { pitch: 0.26 } });
    const p = keys(u, [
      [0, STAND],
      [0.26, touch],
      [0.44, bow],
      [0.6, bow],
      [0.74, touch],
      [0.94, STAND],
      [1, STAND]
    ]);
    const toward = (c.yaw ?? 0) * win(u, 0.1, 0.9, 0.15);
    return withYaw(p, toward * 0.3, toward * 0.7);
  }
}));

reg(def({
  id: 'asa.point', group: 'mentor', roles: ['mentor'], loop: false, travel: false, handed: true, base: 2.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.4, type: 'signal' }],
  next: ['staff.idle', 'asa.nodApprove', 'asa.greet'],
  pose: function (u, c) {
    // 0–0,3 vrider sig och lyfter armen, 0,3–0,72 stilla (förlängs med c.holdUntil), 0,72–1 tillbaka.
    const k = win(u, 0.04, 0.96, 0.28), yaw = (c.yaw ?? 0) * k;
    const p = P(STAND, {
      torso: { pitch: 0.03 - 0.03 * k, roll: -0.04 * k }, head: { pitch: 0.04 - 0.06 * k },
      armR: A(0.1 + 1.42 * k, 0.12 + 0.1 * k, 0.15 - 0.1 * k),
      armL: A(0.1 + 0.12 * k, 0.05, 0.35 + 0.5 * k)
    });
    return withYaw(p, yaw * 0.55, yaw * 0.9);
  },
  tilt: function (u) { return { R: { pitch: 0.1 * win(u, 0.04, 0.96, 0.28) } }; } // pekfingret i armens linje
}));

reg(def({
  id: 'asa.nodApprove', group: 'mentor', roles: ['mentor'], loop: false, travel: false, base: 2.2,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'asa.point', 'asa.greet'],
  pose: function (u, c) {
    const clasp = win(u, 0.02, 0.98, 0.18);
    const nod = 0.24 * bell(u, 0.36, 0.07) + 0.24 * bell(u, 0.62, 0.07);
    const back = 0.05 * win(u, 0.7, 0.98, 0.12);
    const p = P(STAND, {
      torso: { pitch: 0.03 - back }, head: { pitch: 0.04 + nod - back },
      armR: A(0.08 + 0.34 * clasp, -0.02 - 0.06 * clasp, 0.2 + 0.95 * clasp),
      armL: A(0.08 + 0.34 * clasp, -0.02 - 0.06 * clasp, 0.2 + 0.95 * clasp)
    });
    const toward = (c.yaw ?? 0) * clasp;
    return withYaw(p, toward * 0.25, toward * 0.7);
  }
}));

reg(def({
  id: 'staff.walk', group: 'staff', roles: STAFF, loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'staff.walk', 'staff.dodge', 'waiter.takeOrder', 'waiter.pickUp', 'waiter.clear', 'waiter.presentBill', 'somm.present', 'somm.pour', 'dish.receive'],
  pose: function (u, c) { return walking(STAND, c.phase ?? u, c.stride ?? 1, 'both'); }
}));

reg(def({
  id: 'staff.dodge', group: 'staff', roles: STAFF, loop: false, travel: false, base: 1.4,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.walk'],
  pose: function (u, c) {
    const side = c.side ?? 1;
    const aside = win(u, 0.05, 1, 0.3);
    const p = walking(P(STAND, { armL: A(0.2, 0.02, 0.9), armR: A(0.2, 0.02, 0.9) }), u * 2, 0.7, 'none');
    return withYaw(p, side * 0.6 * aside, side * 0.3 * aside);
  },
  root: function (u, c) { const side = c.side ?? 1; return [side * 0.4 * (ramp(u, 0.05, 0.35) - ramp(u, 0.7, 1)), 0.25 * u, 0]; }
}));

// ===== servitören =====================================================

reg(def({
  id: 'waiter.carryPlate', group: 'waiter', roles: ['waiter'], loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'plate' }, ends: { R: 'plate' }, events: [],
  next: ['waiter.carryPlate', 'waiter.serve', 'staff.dodge'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    return walking(P(STAND, { torso: { pitch: -0.02 }, head: { pitch: 0.06 }, armR: A(0.35, 0.12, 1.1 + 0.1 * s) }), c.phase ?? u, c.stride ?? 1, 'L');
  }
}));

reg(def({
  id: 'waiter.carryTwoPlates', group: 'waiter', roles: ['waiter'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: { L: 'plate', R: 'plate' }, ends: { L: 'plate', R: 'plate' }, events: [],
  next: ['waiter.carryTwoPlates', 'waiter.serve', 'staff.dodge'],
  pose: function (u, c) {
    return walking(P(STAND, { torso: { pitch: -0.03 }, head: { pitch: 0.06 }, armL: A(0.35, 0.2, 1.1), armR: A(0.35, 0.2, 1.1) }), c.phase ?? u, (c.stride ?? 1) * 0.85, 'none');
  }
}));

reg(def({
  id: 'waiter.carryTray', group: 'waiter', roles: ['waiter', 'bartender'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: { L: 'tray' }, ends: { L: 'tray' }, events: [],
  next: ['waiter.carryTray', 'waiter.serve', 'staff.dodge'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    const tray = s > 0.6 ? A(0.3, 0.28, 1.7) : TRAY_ARM;
    return walking(P(STAND, { torso: { pitch: -0.02, roll: 0.04 }, head: { pitch: 0.04 }, armL: tray }), c.phase ?? u, (c.stride ?? 1) * 0.9, 'R');
  }
}));

reg(def({
  id: 'waiter.pickUp', group: 'waiter', roles: ['waiter'], loop: false, travel: false, base: 1.4, handed: true,
  from: 'stand', to: 'stand', needs: 'pass', holds: {}, ends: { R: 'plate' },
  events: [{ u: 0.5, type: 'grab', hand: 'R', at: 'pass' }],
  next: ['waiter.pickUp', 'waiter.carryPlate', 'waiter.carryTwoPlates', 'waiter.carryTray'],
  pose: function (u) {
    return keys(u, [
      [0, P(STAND, { armR: A(0.12, 0.06, 0.4) })],
      [0.45, P(STAND, { torso: { pitch: 0.3 }, head: { pitch: 0.35 }, armR: A(0.55, 0.08, 0.4), legL: LEG_FRONT, legR: LEG_BACK })],
      [0.55, P(STAND, { torso: { pitch: 0.28 }, head: { pitch: 0.3 }, armR: A(0.5, 0.1, 0.6), legL: LEG_FRONT, legR: LEG_BACK })],
      [1, P(STAND, { torso: { pitch: -0.02 }, armR: CARRY_ARM })]
    ]);
  }
}));

reg(def({
  id: 'waiter.serve', group: 'waiter', roles: ['waiter'], loop: false, travel: false, base: 2.4, handed: true,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'any' }, ends: {},
  events: [{ u: 0.55, type: 'release', hand: 'R', at: 'table' }],
  next: ['staff.idle', 'staff.walk', 'waiter.serve', 'waiter.clear'],
  pose: function (u, c) {
    const toward = (c.yaw ?? 0) * 0.3;
    return withYaw(keys(u, [
      [0, P(STAND, { armR: CARRY_ARM })],
      [0.25, P(STAND, { torso: { pitch: 0.1 }, armR: CARRY_ARM })],
      [0.5, LEAN_SERVE],
      [0.62, LEAN_SERVE],
      [0.8, SERVE_BACK],
      [1, STAND]
    ]), toward * win(u, 0.15, 0.9, 0.2), (c.yaw ?? 0) * 0.6 * win(u, 0.7, 1.01, 0.1));
  },
  root: function (u) { return [0, 0.22 * win(u, 0.2, 0.92, 0.22), 0]; }
}));

reg(def({
  id: 'waiter.clear', group: 'waiter', roles: ['waiter'], loop: false, travel: false, base: 3, handed: true,
  from: 'stand', to: 'stand', needs: 'table', holds: {}, ends: { R: 'plate' },
  events: [{ u: 0.4, type: 'grab', hand: 'R', at: 'table' }, { u: 0.82, type: 'stack', hand: 'R' }],
  next: ['waiter.clear', 'waiter.carryPlate', 'waiter.carryTwoPlates', 'staff.walk'],
  pose: function (u) {
    return keys(u, [
      [0, STAND],
      [0.3, LEAN_SERVE],
      [0.45, P(LEAN_SERVE, { armR: A(0.2, 0.1, 0.5) })],
      [0.7, P(STAND, { torso: { pitch: 0.05 }, armR: CARRY_ARM })],
      [1, P(STAND, { torso: { pitch: -0.02 }, armR: CARRY_ARM })]
    ]);
  },
  root: function (u) { return [0, 0.22 * win(u, 0.15, 0.85, 0.2), 0]; }
}));

reg(def({
  id: 'waiter.takeOrder', group: 'waiter', roles: ['waiter'], loop: true, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'table', holds: { L: 'pad' }, ends: { L: 'pad' }, events: [],
  next: ['waiter.takeOrder', 'staff.walk', 'staff.idle'],
  pose: function (u, c) {
    const t = c.t ?? 0;
    const up = win(u, 0, 0.35, 0.08) + win(u, 0.55, 0.8, 0.08);
    const write = 1 - up;
    const p = P(STAND, {
      torso: { pitch: 0.1 + 0.04 * up },
      head: { pitch: 0.45 - 0.5 * up + 0.08 * bell(u, 0.22, 0.04), yaw: (c.yaw ?? 0) * 0.8 * up },
      armL: A(0.55, 0.08, 1.55),
      armR: A(0.45, 0.02, 1.7 + 0.07 * write * Math.sin(t * TAU * 3)),
      legL: LEG_FRONT, legR: LEG_STAND
    });
    return breathe(withYaw(p, (c.yaw ?? 0) * 0.25, 0), t);
  }
}));

reg(def({
  id: 'waiter.presentBill', group: 'waiter', roles: ['waiter'], loop: false, travel: false, base: 3.2,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'billFolder' }, ends: { R: 'billFolder' },
  events: [{ u: 0.38, type: 'release', hand: 'R', at: 'table' }, { u: 0.9, type: 'grab', hand: 'R', at: 'table' }],
  next: ['staff.walk', 'staff.idle'],
  pose: function (u, c) {
    const wait = P(STAND, { torso: { pitch: 0.06 }, head: { pitch: 0.12 }, armL: A(0.3, -0.05, 1.0), armR: A(0.3, -0.05, 1.0) });
    return withYaw(keys(u, [
      [0, P(STAND, { armR: CHEST_ARM })],
      [0.32, P(STAND, { torso: { pitch: 0.3 }, head: { pitch: 0.25 }, armR: A(0.75, 0.06, 0.4), legL: LEG_FRONT, legR: LEG_BACK })],
      [0.45, wait],
      [0.82, wait],
      [0.9, P(STAND, { torso: { pitch: 0.3 }, armR: A(0.7, 0.06, 0.45), legL: LEG_FRONT, legR: LEG_BACK })],
      [1, P(STAND, { armR: CHEST_ARM })]
    ]), (c.yaw ?? 0) * 0.2, (c.yaw ?? 0) * 0.5);
  }
}));

// ===== bartendern =====================================================

reg(def({
  id: 'bar.pour', group: 'bartender', roles: ['bartender'], loop: false, travel: false, base: 2.6,
  from: 'stand', to: 'stand', needs: 'bar', holds: { R: 'wineBottle' }, ends: { R: 'wineBottle' }, events: [],
  next: ['bar.pour', 'bar.setDown', 'bar.wipe', 'staff.idle'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    const p = keys(u, [
      [0, P(STAND, { armR: CHEST_ARM })],
      [0.25, P(STAND, { torso: { pitch: 0.15 }, head: { pitch: 0.3 }, armR: A(0.95, 0.14, 0.6), armL: A(0.75, 0.05, 0.7) })],
      [0.8, P(STAND, { torso: { pitch: 0.15 }, head: { pitch: 0.3 }, armR: A(0.95, 0.14, 0.6), armL: A(0.75, 0.05, 0.7) })],
      [1, P(STAND, { armR: CHEST_ARM })]
    ]);
    // Stressad: blicken upp mot baren mitt i hällningen.
    return withYaw({ ...p, head: { ...(p.head ?? {}), pitch: (p.head?.pitch ?? 0) - 0.35 * s * win(u, 0.45, 0.65, 0.06) } }, 0, (c.yaw ?? 0) * s * win(u, 0.45, 0.65, 0.06));
  },
  tilt: function (u) { return { R: { pitch: 1.9 * (ramp(u, 0.28, 0.42) - ramp(u, 0.68, 0.82)), roll: 0.5 * win(u, 0.82, 0.95, 0.04) } }; }
}));

reg(def({
  id: 'bar.setDown', group: 'bartender', roles: ['bartender', 'sommelier', 'waiter'], loop: false, travel: false, base: 1.6, handed: true,
  from: 'stand', to: 'stand', needs: 'bar', holds: { R: 'any' }, ends: {},
  events: [{ u: 0.55, type: 'release', hand: 'R', at: 'bar' }],
  next: ['bar.wipe', 'bar.pour', 'staff.idle', 'staff.walk'],
  pose: function (u, c) {
    return withYaw(keys(u, [
      [0, P(STAND, { armR: A(0.45, 0.08, 1.3) })],
      [0.5, P(STAND, { torso: { pitch: 0.18 }, head: { pitch: 0.25 }, armR: A(1.0, 0.05, 0.35), legL: LEG_FRONT, legR: LEG_BACK })],
      [0.6, P(STAND, { torso: { pitch: 0.16 }, armR: A(0.95, 0.06, 0.4), legL: LEG_FRONT, legR: LEG_BACK })],
      [1, P(STAND, { armR: A(0.2, 0.06, 0.5) })]
    ]), 0, (c.yaw ?? 0) * 0.7 * ramp(u, 0.6, 0.9));
  }
}));

reg(def({
  id: 'bar.wipe', group: 'bartender', roles: ['bartender'], loop: true, travel: false, base: 2.2,
  from: 'stand', to: 'stand', needs: 'bar', holds: { R: 'napkin' }, ends: { R: 'napkin' }, events: [],
  next: ['bar.wipe', 'bar.pour', 'staff.idle'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    const w = u * TAU * (s > 0.6 ? 2 : 1);
    return P(STAND, {
      torso: { pitch: 0.22, yaw: 0.06 * Math.sin(w) }, head: { pitch: 0.35 - 0.3 * s * win(u, 0.4, 0.7, 0.08) },
      armR: A(0.85 + 0.12 * Math.sin(w), 0.18 + 0.12 * Math.cos(w), 0.7), armL: A(0.7, 0.1, 0.8)
    });
  }
}));

// ORDER 315b del 2 — Designs D7 (nexus-leverans-2026-10-06-din-vag/truckClips.ts), oförändrade:
// grillaren och den vid luckan i spelarens vagn.

reg(def({
  id: 'truck.grill', group: 'cook', roles: ['cook'], loop: true, travel: false, base: 2.0,
  from: 'stand', to: 'stand', needs: 'station', holds: { R: 'tongs' }, ends: { R: 'tongs' },
  events: [{ u: 0.42, type: 'flip', hand: 'R', at: 'station' }],
  next: ['truck.grill', 'cook.toPass', 'staff.idle'],
  pose: function (u, c) {
    // Armen ut över gallret, ett snabbt vrid med tången, tillbaka. Vänster hand vilar på gallrets kant.
    const s = c.stress ?? 0;
    const reach = win(u, 0.1, 0.62, 0.12), flip = win(u, 0.36, 0.5, 0.05);
    return withYaw(P(STAND, {
      torso: { pitch: 0.14 + 0.1 * reach + 0.06 * s }, head: { pitch: 0.42 + 0.1 * reach },
      armR: A(0.6 + 0.55 * reach, 0.12 + 0.18 * flip, 1.1 - 0.6 * reach),
      armL: A(0.55, 0.05, 1.0)
    }), 0.12 * Math.sin(u * TAU) * (0.5 + s), 0);
  }
}));

reg(def({
  id: 'truck.hatchServe', group: 'waiter', roles: ['waiter', 'staff'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {},
  events: [{ u: 0.28, type: 'grab', hand: 'R', at: 'pass' }, { u: 0.6, type: 'give', hand: 'R', at: 'partner' }],
  next: ['truck.wipeCounter', 'truck.hatchServe', 'staff.idle'],
  pose: function (u) {
    // Vrider sig mot bänken och tar brickan, vänder tillbaka och sträcker armen ut genom luckan,
    // lutar sig fram över hyllan, släpper, rätar upp sig och nickar.
    const yaw = keys(u, [[0, P(STAND, { torso: { yaw: 0 } })], [0.28, P(STAND, { torso: { yaw: 0.55 } })], [0.58, P(STAND, { torso: { yaw: 0.2 } })], [0.9, P(STAND, { torso: { yaw: 0 } })]]).torso?.yaw ?? 0;
    const out = win(u, 0.34, 0.66, 0.1), lean = win(u, 0.38, 0.66, 0.08), nod = win(u, 0.72, 0.9, 0.06);
    return withYaw(P(STAND, {
      torso: { pitch: 0.06 + 0.12 * lean }, head: { pitch: 0.1 + 0.25 * nod },
      armR: A(0.5 + 0.9 * out, 0.15 + 0.2 * out, 0.9 - 0.75 * out),
      armL: A(0.35, 0.05, 1.0)
    }), yaw, yaw * 0.6);
  }
}));

reg(def({
  id: 'truck.wipeCounter', group: 'waiter', roles: ['waiter', 'staff', 'cook'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'hatch', holds: { R: 'napkin' }, ends: { R: 'napkin' }, events: [],
  next: ['truck.wipeCounter', 'truck.hatchServe', 'staff.idle'],
  pose: function (u, c) {
    // Tre cirklar per svep, svepet fram och tillbaka längs bänken. Bålen följer handen. Stressad: blicken upp mot kön.
    const s = c.stress ?? 0, sweep = -Math.cos(TAU * u), w = 3 * TAU * u;
    return withYaw(P(STAND, {
      torso: { pitch: 0.2 }, head: { pitch: 0.35 - 0.3 * s * win(u, 0.4, 0.7, 0.08) },
      armR: A(0.85 + 0.1 * Math.sin(w), 0.16 + 0.1 * Math.cos(w), 0.7),
      armL: A(0.7, 0.08, 0.85)
    }), 0.3 * sweep, 0.2 * sweep);
  }
}));

// ORDER 319b — Designs D9 (nexus-leveranser-2026-10-08-d9/…-livet-vid-luckan/curiousClips.ts) och
// tillägget (…-d9-tillagg/tillaggClips.ts): de nyfikna vid luckan och kroppsspråket utanför. Oförändrade,
// utom att roten är i figurens ram ([x åt höger, z framåt, vridning], som resten av filen) och att
// tilläggets guest.hesitate ersätter D9:s. Tilläggets guest.checkWatch (stående) heter guest.checkWatchStand,
// och guest.armsCrossed heter guest.armsCrossedStand, eftersom de namnen redan är stämningens klipp
// (leverans 2026-10-03). Längderna per tempo
// står i Designs filhuvuden.

/** Armarna i kors: underarmarna över bröstet, händerna vid motsatt armbåge. Axlarna lite upp. */
const ARMS_CROSSED = { lift: 0.02, armL: A(0.95, 0.55, 1.95), armR: A(0.95, 0.55, 1.95) };

reg(def({
  id: 'guest.slowDown', group: 'guest', roles: ['guest'], loop: false, travel: true, base: 1.4,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.2, type: 'notice' }],
  next: ['guest.walk', 'guest.readSign'],
  pose: function (u, c) {
    // Steget kortas från 0,95 till 0,55 och huvudet vrids mot vagnen (c.yaw = vinkeln till röken).
    const ph = c.phase ?? u, stride = 0.95 - 0.4 * ramp(u, 0, 0.8);
    const p = walking(STAND, ph, stride, 'both');
    return withYaw(p, (c.yaw ?? 0) * 0.15 * ramp(u, 0.1, 0.6), (c.yaw ?? 0) * 0.8 * ramp(u, 0.05, 0.5));
  }
}));

reg(def({
  id: 'guest.readSign', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'stand', to: 'stand', needs: 'sign', holds: {}, ends: {}, events: [{ u: 0.5, type: 'read' }],
  next: ['guest.smellPoint', 'guest.hesitate', 'guest.walkOn'],
  pose: function (u) {
    // Huvudet framåt och ned mot tavlan, blicken går rad för rad (två svep), handen till hakan mitt i.
    const chin = win(u, 0.2, 0.85, 0.12);
    return withYaw(P(STAND, {
      torso: { pitch: 0.08 }, head: { pitch: 0.22 },
      armR: A(0.6 + 1.4 * chin, 0.1, 0.4 + 1.9 * chin)
    }), 0, 0.2 * Math.sin(u * TAU * 2));
  }
}));

reg(def({
  id: 'guest.smellPoint', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {},
  events: [{ u: 0.2, type: 'sniff' }, { u: 0.55, type: 'point' }],
  next: ['guest.hesitate', 'guest.joinQueue', 'guest.walkOn', 'guest.checkWatchStand'],
  pose: function (u, c) {
    // 0–0,42 näsan upp: huvudet bakåt och bröstet lyfts i två små andetag. 0,45–0,92 armen rakt ut mot röken.
    const sniff = win(u, 0.05, 0.42, 0.08), point = win(u, 0.45, 0.92, 0.1), breath = 0.04 * Math.sin(u * 46) * sniff;
    return withYaw(P(STAND, {
      torso: { pitch: -0.05 * sniff + breath }, head: { pitch: -0.32 * sniff },
      armR: A(0.6 + 0.95 * point, 0.08, 0.6 - 0.5 * point)
    }), 0, (c.yaw ?? 0) * 0.3 * point);
  }
}));

reg(def({
  id: 'guest.hesitate', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 2.8, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.95, type: 'decide' }],
  next: ['guest.joinQueue', 'guest.walkOn', 'guest.walk', 'guest.checkWatchStand', 'guest.shakeHead', 'guest.turnToHatch'],
  pose: function (u, c) {
    // Som i D9, och starkare: ett halvt steg mot kön och tillbaka (root), blicken mellan kön och gatan.
    // Varmt: vänster hand vid hakan. Kallt (c.cold): armarna i kors i stället.
    const shift = Math.sin(u * TAU), chin = c.cold ? 0 : win(u, 0.12, 0.92, 0.12);
    const toward = 0.5 + 0.5 * Math.sin(u * TAU - Math.PI / 2);
    const yawHead = (c.lookQueue ?? 0.6) * (1 - toward) + (c.lookPath ?? -0.6) * toward;
    let p = P(STAND, { hipDrop: 0.03 * shift, torso: { pitch: 0.03, roll: 0.05 * shift }, armL: A(0.6 + 1.3 * chin, 0.1, 0.4 + 1.9 * chin) });
    if (c.cold) p = P(p, ARMS_CROSSED);
    return withYaw(p, 0.1 * yawHead, yawHead);
  },
  // 0,24 m mot köns sista plats (c.toQueue, enhetsvektor i figurens ram) och tillbaka, plus svajet i sidled.
  root: function (u, c) { const s = 0.24 * win(u, 0.12, 0.55, 0.12), q = c.toQueue ?? [0, 1]; return [q[0] * s + 0.05 * Math.sin(u * TAU), q[1] * s, 0]; }
}));

reg(def({
  id: 'guest.joinQueue', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6,
  from: 'walk', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 1, type: 'queued' }],
  next: ['guest.queueCalm', 'guest.queueImpatient'],
  pose: function (u, c) {
    // Två sista korta steg in på köplatsen, en blick tillbaka mot skylten, sedan händerna ihop framför sig.
    const step = 1 - ramp(u, 0, 0.45), clasp = ramp(u, 0.5, 0.8);
    let p = walking(STAND, u * 2, 0.45 * step, 'both');
    p = P(p, { armL: A(0.35 + 0.35 * clasp, 0.25 * clasp, 0.4 + 0.9 * clasp), armR: A(0.35 + 0.35 * clasp, 0.25 * clasp, 0.4 + 0.9 * clasp) });
    return withYaw(p, 0, (c.yaw ?? 0) * win(u, 0, 0.55, 0.15));
  }
}));

reg(def({
  id: 'guest.walkOn', group: 'guest', roles: ['guest'], loop: false, travel: true, base: 1.6,
  from: 'stand', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Tar upp farten igen, en sista blick mot vagnen som släpps. Ingen axelryckning: det är inget misslyckande.
    const ph = c.phase ?? u, p = walking(STAND, ph, 0.6 + 0.35 * ramp(u, 0, 0.7), 'both');
    return withYaw(p, 0, (c.yaw ?? 0) * (1 - ramp(u, 0, 0.6)));
  }
}));

reg(def({
  id: 'truck.beckon', group: 'waiter', roles: ['waiter', 'staff', 'cook'], loop: false, travel: false, base: 1.8, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [{ u: 0.3, type: 'signal' }],
  next: ['truck.wipeCounter', 'truck.hatchServe', 'staff.idle'],
  pose: function (u, c) {
    // Lutar sig ut över luckans hylla och vänder sig mot gästen (c.yaw), armen ut och handen vinkar in tre gånger.
    const out = win(u, 0.04, 0.96, 0.14), wave = 0.35 * Math.sin(u * TAU * 3.5) * out;
    return withYaw(P(STAND, {
      torso: { pitch: 0.06 + 0.12 * out }, head: { pitch: 0.05 },
      armR: A(0.5 + 1.0 * out, 0.15 + 0.1 * out, 0.9 - 0.5 * out + wave)
    }), (c.yaw ?? 0) * 0.6 * out, (c.yaw ?? 0) * out);
  }
}));

reg(def({
  id: 'guest.checkWatchStand', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.5, type: 'glance' }],
  next: ['guest.hesitate', 'guest.queueCalm', 'guest.walkOn'],
  pose: function (u, c) {
    // Vänster underarm upp framför bröstet med handleden vriden uppåt, huvudet ned och vridet mot den. Kort.
    const w = win(u, 0.05, 0.95, 0.2);
    let p = P(STAND, { torso: { pitch: 0.04 + 0.04 * w }, head: { pitch: 0.1 + 0.35 * w }, armL: A(0.6 + 0.9 * w, 0.25 * w, 0.5 + 1.5 * w) });
    if (c.cold) p = P(p, { armR: ARMS_CROSSED.armR });
    return withYaw(p, 0, 0.35 * w);
  },
  tilt: function (u) { return { L: { roll: -1.2 * win(u, 0.05, 0.95, 0.2) } }; }
}));

reg(def({
  id: 'guest.armsCrossedStand', group: 'guest', roles: ['guest', 'waiter', 'staff'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.armsCrossedStand', 'guest.checkWatchStand', 'guest.queueCalm'],
  pose: function (u) {
    // Kallt: armarna i kors, axlarna upp, ett litet guppande från fot till fot.
    const bob = Math.sin(u * TAU * 2);
    return P(STAND, { ...ARMS_CROSSED, hipDrop: 0.015 * bob, torso: { pitch: 0.05, roll: 0.03 * bob }, head: { pitch: 0.12 } });
  },
  root: function (u) { return [0.012 * Math.sin(u * TAU * 2), 0, 0]; }
}));

reg(def({
  id: 'guest.shakeHead', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.9,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walkOn'],
  pose: function (u, c) {
    // Huvudet åt sidorna två och en halv gånger, mjukt. Det är ett nej tack, inte ilska.
    const k = win(u, 0.05, 0.95, 0.15);
    const p = c.cold ? P(STAND, ARMS_CROSSED) : STAND;
    return withYaw(p, 0, 0.42 * Math.sin(u * Math.PI * 5) * k);
  }
}));

reg(def({
  id: 'guest.turnToHatch', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.9,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Vänder huvudet och bålen mot luckan när medhjälparen vinkar (c.yaw = vinkeln till luckan), rätar på sig.
    const k = ramp(u, 0, 0.4);
    return withYaw(P(STAND, { torso: { pitch: -0.02 * k } }), (c.yaw ?? 0) * 0.4 * k, (c.yaw ?? 0) * k);
  }
}));

// ORDER 319c — Designs D9 (…-livet-vid-luckan/eatingClips.ts): de som äter vid vagnen och vädrets klipp,
// och tillägget (…-d9-tillagg/tillaggClips.ts): medhjälparen med tändaren och marschallerna. Oförändrade,
// utom att korvens längd per tugga (Designs propScale) sätts av scenen (PlayerTruckCrew.tsx) och att
// guest.shelter följs av köns guest.queueCalm (Designs queue.step finns inte i spelet).

reg(def({
  id: 'guest.eatBun', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3.2, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: { R: 'hotdog' }, ends: { R: 'hotdog' },
  events: [{ u: 0.42, type: 'bite' }], next: ['guest.eatBun', 'guest.drink', 'guest.wipeNapkin', 'guest.warmHands'],
  pose: function (u, c) {
    // Korven upp till munnen och huvudet möter den (0,22–0,58), tuggar med huvudet lite ned. Vänster hand på bordskanten.
    const bite = win(u, 0.22, 0.58, 0.1), chew = 0.04 * Math.sin(u * TAU * 4) * ramp(u, 0.5, 0.6) * (1 - ramp(u, 0.85, 1));
    return P(base(c, false), {
      torso: { pitch: 0.06 + 0.06 * bite }, head: { pitch: 0.12 + 0.12 * bite + chew },
      armR: A(0.75 + 0.9 * bite, 0.12, 1.2 + 0.8 * bite), armL: A(0.75, 0.1, 0.9)
    });
  }
}));

reg(def({
  id: 'guest.eatPlate', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3.4, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: { R: 'fork' }, ends: { R: 'fork' },
  events: [{ u: 0.3, type: 'grab', hand: 'R', at: 'plate' }, { u: 0.48, type: 'bite' }],
  next: ['guest.eatPlate', 'guest.drink', 'guest.wipeNapkin'],
  pose: function (u, c) {
    // Gaffeln ned i tallriken (0,1–0,3), upp till munnen (0,3–0,62). Vänster hand håller tallrikens kant.
    const up = win(u, 0.3, 0.62, 0.1), down = win(u, 0.08, 0.3, 0.06);
    return P(base(c, false), {
      torso: { pitch: 0.1 + 0.05 * down }, head: { pitch: 0.25 - 0.08 * up },
      armR: A(0.85 + 0.8 * up - 0.1 * down, 0.12, 1.0 + 1.0 * up), armL: A(0.85, 0.1, 0.8)
    });
  }
}));

reg(def({
  id: 'guest.drink', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.4, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: {}, ends: {},
  events: [{ u: 0.15, type: 'grab', hand: 'L', at: 'table', prop: 'drinkCan' }, { u: 0.88, type: 'release', hand: 'L', at: 'table' }],
  next: ['guest.eatBun', 'guest.eatPlate', 'guest.wipeNapkin'],
  pose: function (u, c) {
    // Burken (eller muggen, c.prop) lyfts med vänster hand, en klunk med huvudet bakåt, ned igen.
    const lift = win(u, 0.2, 0.85, 0.12), sip = win(u, 0.4, 0.7, 0.06);
    return P(base(c, false), {
      torso: { pitch: 0.04 - 0.04 * sip }, head: { pitch: 0.1 - 0.4 * sip },
      armL: A(0.8 + 0.9 * lift, 0.1, 0.9 + 1.2 * lift)
    });
  }
}));

reg(def({
  id: 'guest.wipeNapkin', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: {}, ends: { R: 'napkinUsed' },
  events: [{ u: 0.12, type: 'grab', hand: 'R', at: 'holder', prop: 'napkin' }, { u: 0.35, type: 'wipe' }, { u: 0.6, type: 'swap', prop: 'napkinUsed' }],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Drar en servett ur hållaren (0–0,17), små cirklar vid munnen (0,17–0,58), torkar händerna mot varandra (0,58–1).
    const reach = win(u, 0, 0.2, 0.07), mouth = win(u, 0.17, 0.6, 0.06), hands = ramp(u, 0.58, 0.66);
    const w = u * 30;
    return P(base(c, false), {
      torso: { pitch: 0.08 + 0.1 * reach }, head: { pitch: 0.12 },
      armR: A(0.8 + 0.4 * reach + 0.9 * mouth + 0.05 * Math.sin(w) * mouth, 0.12 + 0.04 * Math.cos(w) * mouth, 0.7 + 1.5 * mouth + 0.5 * hands),
      armL: A(0.6 + 0.4 * hands, 0.1 + 0.15 * hands, 0.6 + 0.9 * hands)
    });
  }
}));

reg(def({
  id: 'guest.binNapkin', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.4,
  from: 'stand', to: 'stand', needs: 'bin', holds: { R: 'napkinUsed', L: 'paperTray' }, ends: {},
  events: [{ u: 0.55, type: 'toss', hand: 'R', at: 'bin' }, { u: 0.56, type: 'release', hand: 'L', at: 'bin' }],
  next: ['guest.leaveTable'],
  pose: function (u) {
    // Båda händerna fram över sopkorgens lucka och släpper. Luckan slår upp (truckProps.ts BIN.flap) vid 'toss'.
    const k = win(u, 0.18, 0.75, 0.12);
    return P(STAND, { torso: { pitch: 0.06 + 0.2 * k }, head: { pitch: 0.3 * k }, armR: A(0.6 + 0.9 * k, 0.1, 0.8 - 0.4 * k), armL: A(0.6 + 0.85 * k, 0.1, 0.8 - 0.4 * k) });
  }
}));

reg(def({
  id: 'guest.leaveTable', group: 'guest', roles: ['guest'], loop: false, travel: true, base: 1.2,
  from: 'stand', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Vänder bort från sopkorgen och tar två korta steg. Blicken går ut mot torget.
    const ph = c.phase ?? u;
    return withYaw(walking(STAND, ph, 0.4 + 0.5 * ramp(u, 0.2, 1), 'both'), 0, 0.3 * (1 - ramp(u, 0, 0.8)));
  }
}));

reg(def({
  id: 'guest.warmHands', group: 'guest', roles: ['guest', 'waiter', 'staff', 'cook'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'heater', holds: {}, ends: {}, events: [],
  next: ['guest.warmHands', 'guest.eatBun', 'guest.drink'],
  pose: function (u) {
    // Båda händerna fram mot värmaren med handflatorna ut, gnids mot varandra tre gånger, axlarna upp.
    const rub = 0.12 * Math.sin(u * TAU * 3);
    return P(STAND, { lift: 0.02, torso: { pitch: 0.06 }, head: { pitch: 0.08 }, armL: A(1.15, 0.12 + rub, 0.7), armR: A(1.15, 0.12 - rub, 0.7) });
  },
  tilt: function () { return { L: { pitch: -0.6 }, R: { pitch: -0.6 } }; }
}));

reg(def({
  id: 'guest.shelter', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 2.0,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.shelter', 'guest.queueCalm', 'guest.walk'],
  pose: function (u) {
    // Under markisen i regn: axlarna upp, huvudet ned, ena handen håller ihop kragen. En blick upp mot markisens kant.
    const look = win(u, 0.55, 0.8, 0.08);
    return P(STAND, { lift: 0.03, torso: { pitch: 0.06 }, head: { pitch: 0.2 - 0.45 * look }, armR: A(0.9, 0.3, 2.2), armL: A(0.3, 0.05, 1.3) });
  }
}));

reg(def({
  id: 'guest.grabNapkin', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.9, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.4, type: 'grab', at: 'air' }],
  next: ['guest.eatBun', 'guest.eatPlate', 'guest.drink', 'guest.wipeNapkin'],
  pose: function (u, c) {
    // Blåsten tar servetten: en snabb sträckning åt sidan efter den (c.yaw mot servetten), oftast för sent.
    const k = win(u, 0.1, 0.85, 0.15);
    return withYaw(P(base(c, false), { torso: { pitch: 0.08 * k }, armR: A(0.6 + 1.0 * k, 0.15 + 0.5 * k, 0.4) }), (c.yaw ?? 0.7) * 0.4 * k, (c.yaw ?? 0.7) * 0.9 * k);
  }
}));

reg(def({
  id: 'staff.walkLighter', group: 'staff', roles: STAFF, loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'lighter' }, ends: { R: 'lighter' }, events: [],
  next: ['staff.walkLighter', 'staff.lightTorch', 'staff.walk'],
  pose: function (u, c) {
    // Raskt, tändaren nedåt längs benet.
    const ph = c.phase ?? u;
    return P(walking(STAND, ph, c.stride ?? 1.05, 'L'), { armR: A(0.15, 0.1, 0.35) });
  }
}));

reg(def({
  id: 'staff.lightTorch', group: 'staff', roles: STAFF, loop: false, travel: false, base: 2.4, handed: true,
  from: 'stand', to: 'stand', needs: 'torch', holds: { R: 'lighter' }, ends: { R: 'lighter' },
  events: [{ u: 0.4, type: 'spark', hand: 'R' }, { u: 0.55, type: 'ignite', at: 'torch' }],
  next: ['staff.walkLighter'],
  pose: function (u) {
    // Böjer sig fram mot marschallen, armen ut med tändaren mot veken (0,12–0,88). Lågan på tändaren 0,4–0,72,
    // och marschallen tänds vid 0,55 och tonar upp på 0,8 s (torchLighting.ts).
    const k = win(u, 0.12, 0.88, 0.14);
    return P(STAND, { torso: { pitch: 0.06 + 0.32 * k }, head: { pitch: 0.2 + 0.25 * k }, armR: A(0.6 + 0.75 * k, 0.1, 0.6 - 0.3 * k), armL: A(0.4, 0.08, 0.6) });
  }
}));

// ORDER 320 — Designs D10 (nexus-leverans-2026-10-08-d10-vid-vagnen/d10Clips.ts): klippen vid vagnen i de sex
// situationerna. D10 ger längden och vad klippet gör; poserna är skrivna här med samma hjälpare. Getingarna
// (wasp.fly) och hunden (dog.*) är inga figurer och ritas i TruckLife.tsx; fika.sipCup finns redan.

reg(def({
  id: 'truck.serveLidded', group: 'waiter', roles: ['waiter', 'staff'], loop: false, travel: false, base: 1.9, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [{ u: 0.36, type: 'switch' }, { u: 0.62, type: 'give', hand: 'R', at: 'partner' }],
  next: ['truck.wipeCounter', 'truck.hatchServe', 'staff.idle'],
  pose: function (u) {
    // Som truck.hatchServe, men vänster hand fäller locket över tråget (u 0,2–0,4) innan det räcks ut.
    const lid = win(u, 0.18, 0.42, 0.08), out = win(u, 0.44, 0.8, 0.1);
    return P(STAND, { torso: { pitch: 0.08 + 0.1 * out }, head: { pitch: 0.2 }, armR: A(0.7 + 0.7 * out, 0.15, 1.1 - 0.8 * out), armL: A(0.6 + 0.5 * lid, 0.1, 1.3 - 0.4 * lid) });
  }
}));

reg(def({
  id: 'staff.liftTable', group: 'staff', roles: STAFF, loop: false, travel: false, base: 1.0,
  from: 'stand', to: 'stand', needs: 'standTable', holds: {}, ends: {}, events: [{ u: 0.55, type: 'grab', at: 'table' }],
  next: ['staff.carryTable'],
  pose: function (u) {
    // Böjer sig mot bordet och tar tag med båda händerna; lyfter vid u 0,55.
    const bend = win(u, 0.05, 0.6, 0.15), lift = ramp(u, 0.55, 0.9);
    return P(STAND, { hipDrop: 0.08 * bend, torso: { pitch: 0.35 * bend + 0.05 * lift }, armL: A(0.9 + 0.2 * lift, 0.25, 0.5), armR: A(0.9 + 0.2 * lift, 0.25, 0.5) });
  }
}));

reg(def({
  id: 'staff.carryTable', group: 'staff', roles: STAFF, loop: true, travel: true, base: 3.2,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.carryTable', 'staff.setTable'],
  pose: function (u, c) {
    // Bordet 0,48 m framför, korta steg: båda armarna fram och bålen lite bakåt.
    const ph = c.phase ?? u;
    return P(walking(STAND, ph, 0.6, 'none'), { torso: { pitch: -0.06 }, armL: A(1.1, 0.25, 0.45), armR: A(1.1, 0.25, 0.45) });
  }
}));

reg(def({
  id: 'staff.setTable', group: 'staff', roles: STAFF, loop: false, travel: false, base: 0.9,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.6, type: 'release', at: 'floor' }],
  next: ['staff.walk', 'staff.idle'],
  pose: function (u) {
    const down = win(u, 0, 0.75, 0.2);
    return P(STAND, { hipDrop: 0.06 * down, torso: { pitch: 0.3 * down }, armL: A(1.1 - 0.3 * down, 0.25, 0.45), armR: A(1.1 - 0.3 * down, 0.25, 0.45) });
  }
}));

reg(def({
  id: 'guest.huddle', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 2.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.huddle', 'guest.queueCalm', 'guest.walk'],
  pose: function (u) {
    // Under markisen: armarna in mot kroppen, lätt framåtlutad, ett litet gung.
    const sway = Math.sin(u * TAU);
    return P(STAND, { lift: 0.02, torso: { pitch: 0.1, roll: 0.03 * sway }, head: { pitch: 0.15 }, armL: A(0.5, 0.02, 1.7), armR: A(0.5, 0.02, 1.7) });
  }
}));

reg(def({
  id: 'guest.freeze', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.7,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.backAway'],
  pose: function (u, c) {
    // Armarna in mot kroppen, lutar bakåt, blicken på getingen (c.yaw).
    const k = ramp(u, 0, 0.5);
    return withYaw(P(STAND, { lift: 0.03 * k, torso: { pitch: -0.12 * k }, armL: A(0.6 * k, 0.05, 1.9 * k), armR: A(0.6 * k, 0.05, 1.9 * k) }), 0, (c.yaw ?? 0) * k);
  }
}));

reg(def({
  id: 'guest.backAway', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.9,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.standBar', 'guest.queueCalm'],
  pose: function (u, c) {
    // Baklänges, blicken kvar på getingen.
    return withYaw(P(walking(STAND, u * 2, 0.5, 'none'), { torso: { pitch: -0.1 }, armL: A(0.5, 0.05, 1.8), armR: A(0.5, 0.05, 1.8) }), 0, c.yaw ?? 0);
  },
  // 0,75 m bakåt (Designs dist).
  root: function (u) { return [0, -0.75 * ramp(u, 0, 1), 0]; }
}));

reg(def({
  id: 'staff.capSauces', group: 'staff', roles: STAFF, loop: false, travel: false, base: 2.4, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.2, type: 'release', at: 'shelf' }, { u: 0.53, type: 'release', at: 'shelf' }, { u: 0.86, type: 'release', at: 'shelf' }],
  next: ['staff.walk', 'staff.idle'],
  pose: function (u) {
    // Ett lock var 0,8 s: handen ned över flaskan och tillbaka, tre gånger längs hyllan.
    const tap = Math.max(win(u, 0.05, 0.3, 0.08), win(u, 0.38, 0.63, 0.08), win(u, 0.71, 0.96, 0.08));
    return withYaw(P(STAND, { torso: { pitch: 0.18 + 0.1 * tap }, head: { pitch: 0.35 }, armR: A(0.9 + 0.2 * tap, 0.15, 0.7 - 0.2 * tap), armL: A(0.4, 0.05, 0.8) }), -0.25 + 0.5 * u, -0.2 + 0.4 * u);
  }
}));

reg(def({
  id: 'guest.tapCard', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.5, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [{ u: 0.5, type: 'pay' }],
  next: ['guest.tryAgain', 'guest.queueCalm'],
  pose: function (u) {
    // Kortet fram mot läsaren och stilla medan den väntar.
    const k = win(u, 0.1, 0.95, 0.2);
    return P(STAND, { torso: { pitch: 0.12 * k }, head: { pitch: 0.3 * k }, armR: A(0.6 + 0.6 * k, 0.1, 0.9 - 0.4 * k) });
  }
}));

reg(def({
  id: 'guest.tryAgain', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.7, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [{ u: 0.3, type: 'pay' }, { u: 0.75, type: 'pay' }],
  next: ['guest.checkWatchStand', 'guest.takePhone'],
  pose: function (u) {
    // Två försök till: kortet fram, tillbaka, fram.
    const k = Math.max(win(u, 0.05, 0.42, 0.1), win(u, 0.52, 0.95, 0.1));
    return P(STAND, { torso: { pitch: 0.1 * k }, head: { pitch: 0.3 }, armR: A(0.7 + 0.5 * k, 0.1, 0.9 - 0.4 * k) });
  }
}));

reg(def({
  id: 'staff.checkTerminal', group: 'staff', roles: STAFF, loop: false, travel: false, base: 2.0, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [],
  next: ['staff.pointSwish', 'truck.wipeCounter'],
  pose: function (u) {
    // Lutar sig ut genom luckan och trycker på läsaren.
    const lean = win(u, 0.05, 0.9, 0.2), press = win(u, 0.45, 0.7, 0.05);
    return P(STAND, { torso: { pitch: 0.15 + 0.3 * lean }, head: { pitch: 0.4 * lean }, armR: A(0.7 + 0.6 * lean, 0.1, 0.6 - 0.2 * press), armL: A(0.4, 0.05, 0.9) });
  }
}));

reg(def({
  id: 'staff.pointSwish', group: 'staff', roles: STAFF, loop: false, travel: false, base: 1.3, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [{ u: 0.4, type: 'point' }],
  next: ['truck.wipeCounter', 'staff.idle'],
  pose: function (u) {
    const k = win(u, 0.1, 0.9, 0.2);
    return withYaw(P(STAND, { torso: { pitch: 0.1 * k }, armR: A(0.6 + 0.8 * k, 0.15 + 0.2 * k, 0.2) }), -0.3 * k, -0.4 * k);
  }
}));

reg(def({
  id: 'guest.takePhone', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.2, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.5, type: 'grab', hand: 'R' }],
  next: ['guest.scanSwish'],
  pose: function (u) {
    // Handen ned till fickan och upp med telefonen framför bröstet.
    const pocket = win(u, 0.05, 0.5, 0.1), up = ramp(u, 0.5, 1);
    return P(STAND, { head: { pitch: 0.3 * up }, armR: A(0.1 + 0.8 * up, 0.15 - 0.05 * pocket, 0.3 + 1.2 * up) });
  }
}));

reg(def({
  id: 'guest.scanSwish', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.8, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [{ u: 0.4, type: 'pay' }],
  next: ['guest.putAwayPhone'],
  pose: function (u) {
    // Telefonen över skylten, stilla (skärmen blir guld i scenen).
    const out = win(u, 0.05, 0.95, 0.15);
    return P(STAND, { torso: { pitch: 0.12 * out }, head: { pitch: 0.35 }, armR: A(0.9 + 0.4 * out, 0.1, 1.5 - 0.6 * out) });
  }
}));

reg(def({
  id: 'guest.putAwayPhone', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.8, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.7, type: 'release', hand: 'R' }],
  next: ['guest.queueCalm', 'guest.walk'],
  pose: function (u) {
    const down = ramp(u, 0, 0.8);
    return P(STAND, { armR: A(0.9 - 0.8 * down, 0.1 + 0.05 * down, 1.5 - 1.2 * down) });
  }
}));

reg(def({
  id: 'staff.takeFromBox', group: 'cook', roles: ['cook', 'staff'], loop: false, travel: false, base: 1.4, handed: true,
  from: 'stand', to: 'stand', needs: 'station', holds: {}, ends: {}, events: [{ u: 0.4, type: 'grab', at: 'station' }],
  next: ['truck.grill'],
  pose: function (u) {
    // Vrider sig mot lådan, böjer sig, tar en korv och vänder tillbaka mot grillen.
    const turn = win(u, 0, 0.75, 0.2), dip = win(u, 0.25, 0.55, 0.1);
    return withYaw(P(STAND, { torso: { pitch: 0.15 + 0.25 * dip }, head: { pitch: 0.4 }, armR: A(0.7 + 0.3 * dip, 0.1, 0.6) }), 0.6 * turn, 0.7 * turn);
  }
}));

reg(def({
  id: 'staff.switchTongs', group: 'cook', roles: ['cook', 'staff'], loop: false, travel: false, base: 0.8, handed: true,
  from: 'stand', to: 'stand', needs: 'station', holds: {}, ends: {}, events: [{ u: 0.3, type: 'release', at: 'station' }, { u: 0.7, type: 'grab', at: 'station' }],
  next: ['staff.turnVeg', 'truck.grill'],
  pose: function (u) {
    const down = Math.max(win(u, 0.1, 0.4, 0.08), win(u, 0.55, 0.85, 0.08));
    return withYaw(P(STAND, { torso: { pitch: 0.2 }, head: { pitch: 0.4 }, armR: A(0.6 + 0.2 * down, 0.1, 0.8 - 0.3 * down) }), -0.3 * ramp(u, 0.4, 0.6), -0.3 * ramp(u, 0.4, 0.6));
  }
}));

reg(def({
  id: 'staff.turnVeg', group: 'cook', roles: ['cook', 'staff'], loop: false, travel: false, base: 2.8, handed: true,
  from: 'stand', to: 'stand', needs: 'station', holds: {}, ends: {}, events: [{ u: 0.35, type: 'flip' }, { u: 0.7, type: 'flip' }],
  next: ['staff.switchTongs', 'truck.grill'],
  pose: function (u) {
    // Vänder de två vegokorvarna med vegotången, till vänster om den vanliga delen.
    const flip = Math.max(win(u, 0.2, 0.45, 0.06), win(u, 0.55, 0.8, 0.06));
    return withYaw(P(STAND, { torso: { pitch: 0.22 }, head: { pitch: 0.45 }, armR: A(0.75 + 0.15 * flip, 0.12, 0.7 - 0.2 * flip) }), -0.3, -0.3);
  }
}));

reg(def({
  id: 'guest.toastCup', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.5, type: 'signal' }],
  next: ['guest.standBar', 'guest.queueCalm'],
  pose: function (u) {
    // D10 omtaget: vänd mot Grillvagnens skylt, höger hand med koppen 0,5 m fram mot skylten, och tillbaka.
    const k = win(u, 0.1, 0.9, 0.2);
    return P(STAND, { torso: { pitch: 0.04 * k }, head: { pitch: -0.05 * k }, armR: A(0.6 + 0.9 * k, 0.12, 1.2 - 0.9 * k), armL: A(0.3, 0.05, 0.6) });
  }
}));

reg(def({
  id: 'guest.stepAside', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.0,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.standBar', 'guest.queueCalm'],
  pose: function (u, c) {
    // Ett steg bort från hunden, blicken på hunden (c.yaw).
    return withYaw(walking(STAND, u, 0.4, 'both'), 0, (c.yaw ?? 0) * win(u, 0, 1, 0.3));
  },
  // 0,5 m åt sidan (Designs dist).
  root: function (u) { return [0.5 * ramp(u, 0, 1), 0, 0]; }
}));

// ===== sommeliern =====================================================

reg(def({
  id: 'somm.present', group: 'sommelier', roles: ['sommelier'], loop: false, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'wineBottle' }, ends: { R: 'wineBottle' }, events: [],
  next: ['somm.open'],
  pose: function (u, c) {
    const show = P(STAND, { torso: { pitch: 0.1 }, head: { pitch: 0.15 }, armR: A(0.75, 0.12, 1.05), armL: A(0.7, 0.02, 1.35) });
    return withYaw(keys(u, [
      [0, P(STAND, { armR: CHEST_ARM })],
      [0.2, show],
      [0.45, P(show, { torso: { pitch: 0.3 }, head: { pitch: 0.28 } })],
      [0.7, show],
      [1, P(STAND, { armR: CHEST_ARM })]
    ]), (c.yaw ?? 0) * 0.3, (c.yaw ?? 0) * 0.6);
  },
  tilt: function (u) { return { R: { pitch: 1.2 * win(u, 0.12, 0.9, 0.12) } }; }
}));

reg(def({
  id: 'somm.open', group: 'sommelier', roles: ['sommelier', 'bartender'], loop: false, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'floor', holds: { R: 'wineBottle' }, ends: { R: 'wineBottle' },
  events: [{ u: 0.05, type: 'switch', hand: 'R' }, { u: 0.76, type: 'cork', hand: 'R' }, { u: 0.95, type: 'switch', hand: 'L' }],
  next: ['somm.hostTaste', 'somm.pour', 'bar.pour'],
  pose: function (u) {
    const twist = win(u, 0.15, 0.7, 0.05);
    const r = Math.sin(u * TAU * 5);
    return keys(u, [
      [0, P(STAND, { armR: CHEST_ARM })],
      [0.1, P(STAND, { torso: { pitch: 0.12 }, head: { pitch: 0.4 }, armL: A(0.55, 0.1, 1.45), armR: A(0.62, 0.2, 1.3) })],
      [0.7, P(STAND, { torso: { pitch: 0.12 }, head: { pitch: 0.4 }, armL: A(0.55, 0.1, 1.45), armR: A(0.62, 0.2 + 0.1 * r * twist, 1.3 + 0.08 * r * twist) })],
      [0.78, P(STAND, { torso: { pitch: 0.06 }, head: { pitch: 0.3 }, armL: A(0.55, 0.1, 1.45), armR: A(0.3, 0.38, 1.75) })],
      [0.9, P(STAND, { torso: { pitch: 0.06 }, armL: A(0.55, 0.1, 1.45), armR: A(0.45, 0.1, 1.3) })],
      [1, P(STAND, { armR: CHEST_ARM })]
    ]);
  }
}));

reg(def({
  id: 'somm.hostTaste', group: 'sommelier', roles: ['sommelier'], loop: false, travel: false, base: 4.5,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'wineBottle' }, ends: { R: 'wineBottle' }, events: [],
  next: ['somm.pour', 'staff.walk'],
  pose: function (u, c) {
    const lean = P(STAND, { torso: { pitch: 0.35 }, head: { pitch: 0.35 }, armR: A(0.8, 0.12, 0.55), armL: A(-0.25, 0.1, 1.5), legL: LEG_FRONT, legR: LEG_BACK });
    const wait = P(STAND, { torso: { pitch: 0.05 }, head: { pitch: 0.1 }, armR: A(0.45, 0.08, 1.35), armL: A(0.35, -0.02, 1.2) });
    const p = keys(u, [[0, P(STAND, { armR: CHEST_ARM })], [0.18, lean], [0.38, lean], [0.55, wait], [1, wait]]);
    return withYaw({ ...p, head: { ...(p.head ?? {}), pitch: (p.head?.pitch ?? 0) + 0.22 * bell(u, 0.9, 0.035) } }, (c.yaw ?? 0) * 0.3 * ramp(u, 0.5, 0.6), (c.yaw ?? 0) * 0.7 * ramp(u, 0.5, 0.6));
  },
  tilt: function (u) { return { R: { pitch: 1.7 * (ramp(u, 0.2, 0.27) - ramp(u, 0.33, 0.4)) } }; },
  root: function (u) { return [0, -0.18 * ramp(u, 0.42, 0.6), 0]; }
}));

reg(def({
  id: 'somm.pour', group: 'sommelier', roles: ['sommelier'], loop: false, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'wineBottle' }, ends: { R: 'wineBottle' }, events: [],
  next: ['somm.pour', 'bar.setDown', 'staff.walk'],
  pose: function (u) {
    const lean = P(STAND, { torso: { pitch: 0.34 }, head: { pitch: 0.35 }, armR: A(0.82, 0.12, 0.55), armL: A(-0.25, 0.1, 1.5), legL: LEG_FRONT, legR: LEG_BACK });
    return keys(u, [[0, P(STAND, { armR: CHEST_ARM })], [0.22, lean], [0.72, lean], [1, P(STAND, { armR: CHEST_ARM, armL: A(-0.2, 0.1, 1.4) })]]);
  },
  tilt: function (u) { return { R: { pitch: 1.85 * (ramp(u, 0.28, 0.4) - ramp(u, 0.62, 0.74)), roll: 0.5 * win(u, 0.64, 0.76, 0.04) } }; }
}));

// ===== kocken =========================================================

reg(def({
  id: 'cook.station', group: 'cook', roles: ['cook'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'station', holds: {}, ends: {}, events: [],
  next: ['cook.station', 'cook.plate', 'staff.idle'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    const k = Math.sin(u * TAU * 2);
    const look = s * win(u, 0.55, 0.78, 0.06);
    const p = P(STAND, {
      torso: { pitch: 0.25 - 0.1 * look }, head: { pitch: 0.38 - 0.4 * look },
      armL: A(0.8, 0.16, 1.0), armR: A(0.85 + 0.18 * k, 0.12, 0.9 - 0.25 * k),
      legL: { swing: 0.04, spread: 0.07, knee: 0.1, ankle: 0.06 }, legR: { swing: -0.06, spread: 0.07, knee: 0.14, ankle: 0.2 }
    });
    return withYaw(p, (c.yaw ?? 0) * 0.3 * look, (c.yaw ?? 0) * 0.8 * look);
  }
}));

reg(def({
  id: 'cook.plate', group: 'cook', roles: ['cook'], loop: false, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'pass', holds: {}, ends: {},
  events: [{ u: 0.7, type: 'plated' }],
  next: ['cook.plate', 'cook.toPass'],
  pose: function (u) {
    const dab = bell(u, 0.2, 0.04) + bell(u, 0.42, 0.04) + bell(u, 0.64, 0.04);
    const wipe = win(u, 0.78, 0.95, 0.05);
    return P(STAND, {
      torso: { pitch: 0.32 }, head: { pitch: 0.45 },
      armL: A(0.75, 0.22, 0.75),
      armR: A(0.8 + 0.12 * dab - 0.1 * wipe, 0.14 + 0.2 * wipe, 0.8 - 0.25 * dab),
      legL: LEG_FRONT, legR: LEG_STAND
    });
  }
}));

reg(def({
  id: 'cook.toPass', group: 'cook', roles: ['cook'], loop: false, travel: false, base: 2,
  from: 'stand', to: 'stand', needs: 'pass', holds: {}, ends: {},
  events: [{ u: 0.15, type: 'grab', hand: 'R', at: 'pass' }, { u: 0.5, type: 'release', hand: 'R', at: 'pass' }, { u: 0.75, type: 'bell' }],
  next: ['cook.station', 'cook.plate'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    const p = keys(u, [
      [0, P(STAND, { torso: { pitch: 0.28 }, head: { pitch: 0.4 }, armR: A(0.8, 0.1, 0.7) })],
      [0.15, P(STAND, { torso: { pitch: 0.3 }, head: { pitch: 0.4 }, armR: A(0.8, 0.1, 0.55) })],
      [0.48, P(STAND, { torso: { pitch: 0.4 }, head: { pitch: 0.3 }, armR: A(1.05, 0.08, 0.2), legL: LEG_FRONT, legR: LEG_BACK })],
      [0.66, P(STAND, { torso: { pitch: 0.15 }, head: { pitch: 0.1 }, armR: A(0.95, 0.28, 0.7) })],
      [0.76, P(STAND, { torso: { pitch: 0.18 }, head: { pitch: 0.1 }, armR: A(0.9, 0.22, 0.45) })],
      [1, P(STAND, { torso: { pitch: 0.02 }, head: { pitch: -0.05 - 0.15 * s } })]
    ]);
    return p;
  }
}));

// ===== diskaren ========================================================

reg(def({
  id: 'dish.receive', group: 'dishwasher', roles: ['dishwasher'], loop: false, travel: false, base: 1.8,
  from: 'stand', to: 'stand', needs: 'sink', holds: {}, ends: { R: 'plate' },
  events: [{ u: 0.45, type: 'grab', hand: 'R', at: 'partner' }],
  next: ['dish.wash'],
  pose: function (u, c) {
    return withYaw(keys(u, [
      [0, STAND],
      [0.4, P(STAND, { torso: { pitch: 0.2 }, head: { pitch: 0.3 }, armR: A(0.85, 0.1, 0.4), legL: LEG_FRONT, legR: LEG_BACK })],
      [0.8, P(STAND, { torso: { pitch: 0.1 }, armR: A(0.45, 0.1, 1.3) })],
      [1, P(STAND, { armR: A(0.45, 0.1, 1.3) })]
    ]), (c.yaw ?? 0) * 0.4 * ramp(u, 0.6, 1), (c.yaw ?? 0) * 0.6 * ramp(u, 0.55, 0.9));
  }
}));

reg(def({
  id: 'dish.wash', group: 'dishwasher', roles: ['dishwasher'], loop: true, travel: false, base: 2,
  from: 'stand', to: 'stand', needs: 'sink', holds: { R: 'any' }, ends: { R: 'any' }, events: [],
  next: ['dish.wash', 'dish.receive', 'staff.idle'],
  pose: function (u) {
    const w = u * TAU * 2;
    return P(STAND, {
      torso: { pitch: 0.32 }, head: { pitch: 0.45 },
      armL: A(0.62, 0.15, 0.75), armR: A(0.62 + 0.08 * Math.sin(w), 0.12 + 0.08 * Math.cos(w), 0.72),
      legL: LEG_FRONT, legR: LEG_STAND
    });
  },
  tilt: function () { return { R: { pitch: 0.9 } }; }
}));

// ===== gästerna =======================================================

reg(def({
  id: 'guest.walk', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk', 'guest.sit', 'guest.sitStool', 'guest.sitLounge', 'staff.idle'],
  pose: function (u, c) {
    const ph = c.phase ?? u;
    const p = walking(STAND, ph, (c.stride ?? 1) * 0.95, 'both');
    // Den som kommer in letar: huvudet sveper två gånger per fyra steg.
    return withYaw(p, 0, (c.yaw ?? 0) * 0.5 + 0.3 * Math.sin(ph * Math.PI * 0.5));
  }
}));

reg(def({
  id: 'guest.sit', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2,
  from: 'stand', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.readMenu', 'guest.seatedIdle', 'guest.gesture'],
  pose: function (u, c) {
    const side = c.side ?? 1;
    let p = keys(u, [
      [0, STAND],
      [0.3, P(STAND, { armR: A(0.6, 0.15, 0.5) })],
      [0.58, P(STAND, { torso: { pitch: 0.12 } })],
      [0.78, CROUCH],
      [1, SEAT]
    ]);
    // Kliver in från sidan (u 0,25–0,55): två små steg.
    const step = win(u, 0.25, 0.58, 0.06);
    if (step > 0) {
      const w = walking(p, (u - 0.25) / 0.33, 0.45, 'none');
      p = blendPose(p, w, step);
    }
    return withYaw(p, 0, -side * 0.35 * win(u, 0, 0.5, 0.15));
  },
  root: function (u, c) {
    const side = c.side ?? 1;
    const out = ramp(u, 0.05, 0.3) - ramp(u, 0.65, 0.95);
    const x = side * SEAT_RULE.approachSide * (1 - ramp(u, 0.25, 0.55));
    const z = -SEAT_RULE.chairPull * out + SEAT_RULE.approachFront * (1 - ramp(u, 0.55, 0.8));
    return [x, z, 0];
  },
  chair: function (u) { return SEAT_RULE.chairPull * (ramp(u, 0.05, 0.3) - ramp(u, 0.65, 0.95)); }
}));

reg(def({
  id: 'guest.seatedIdle', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 5,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.readMenu', 'guest.gesture', 'guest.lean', 'guest.toast', 'guest.waveStaff', 'guest.eat', 'guest.pay', 'guest.leave', 'guest.leaveStool', 'guest.leaveLounge', 'guest.riseGreet', 'rocket.smellWine', 'rocket.askPointMenu'],
  pose: function (u, c) {
    const look = win(u, 0.3, 0.7, 0.12);
    return breathe(withYaw(P(SEAT, { torso: { pitch: 0.02 }, armL: A(0.52, 0.06, 1.14) }), (c.yaw ?? 0) * 0.2 * look, (c.yaw ?? 0) * 0.7 * look + 0.25 * Math.sin(u * TAU) * (1 - look)), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.readMenu', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 5,
  from: 'seated', to: 'seated', needs: 'chair', holds: { R: 'menu' }, ends: { R: 'menu' }, events: [],
  next: ['guest.readMenu', 'guest.order', 'guest.waveStaff', 'rocket.askPointMenu'],
  pose: function (u, c) {
    const turn = win(u, 0.55, 0.72, 0.05);
    return breathe(P(SEAT, {
      torso: { pitch: 0.14 }, head: { pitch: 0.38, yaw: 0.15 * turn },
      armL: A(0.62, 0.08, 1.55), armR: A(0.62 + 0.1 * turn, 0.08 + 0.25 * turn, 1.55)
    }), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.order', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4,
  from: 'seated', to: 'seated', needs: 'chair', holds: { R: 'menu' }, ends: {},
  events: [{ u: 0.02, type: 'switch', hand: 'R' }, { u: 0.9, type: 'give', hand: 'L', at: 'partner' }],
  next: ['guest.seatedIdle', 'guest.gesture', 'guest.lean'],
  pose: function (u, c) {
    const point = win(u, 0.12, 0.48, 0.06);
    const dip = bell(u, 0.24, 0.03) + bell(u, 0.37, 0.03);
    const palm = win(u, 0.52, 0.78, 0.06);
    const hand = win(u, 0.82, 1.01, 0.06);
    const up = ramp(u, 0.45, 0.55);
    return withYaw(P(SEAT, {
      torso: { pitch: 0.1 },
      head: { pitch: 0.35 - 0.45 * up },
      armL: A(0.62 + 0.3 * hand, 0.12 + 0.12 * hand, 1.4 - 0.7 * hand),
      armR: A(0.78 + point * 0.0 + 0.14 * palm, 0.1 + 0.18 * palm, 0.95 + 0.12 * point + 0.12 * dip - 0.3 * palm)
    }), (c.yaw ?? 0) * 0.25 * up, (c.yaw ?? 0) * 0.75 * up);
  }
}));

reg(def({
  id: 'guest.eat', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3.5,
  from: 'seated', to: 'seated', needs: 'chair', holds: { L: 'knife', R: 'fork' }, ends: { L: 'knife', R: 'fork' }, events: [],
  next: ['guest.eat', 'guest.seatedIdle', 'guest.toast', 'guest.gesture'],
  pose: function (u, c) {
    const cut = win(u, 0, 0.42, 0.06);
    const bite = win(u, 0.45, 0.85, 0.1);
    const saw = Math.sin((c.t ?? 0) * TAU * 3.5);
    return P(SEAT, {
      torso: { pitch: 0.2 + 0.07 * bite }, head: { pitch: 0.35 - 0.2 * bite },
      armL: A(0.7, 0.12, 1.05 + 0.06 * saw * cut),
      armR: A(0.72 - 0.22 * bite, 0.12, 1.05 + 1.1 * bite + 0.04 * saw * cut)
    });
  },
  tilt: function (u) { return { R: { pitch: -1.2 * win(u, 0.45, 0.85, 0.1) } }; }
}));

reg(def({
  id: 'guest.toast', group: 'guest', roles: ['guest'], loop: false, travel: false, handed: true, base: 3,
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.1, type: 'grab', hand: 'R', at: 'table' }, { u: 0.45, type: 'clink' }, { u: 0.9, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.seatedIdle', 'guest.gesture', 'guest.lean', 'guest.eat'],
  pose: function (u, c) {
    const b = base(c, true);
    const toward = (c.yaw ?? 0) * win(u, 0.2, 0.55, 0.1);
    return withYaw(keys(u, [
      [0, b],
      [0.12, P(b, { armR: A(0.8, 0.1, 0.9) })],
      [0.38, P(b, { torso: { pitch: 0.16 }, head: { pitch: -0.05 }, armR: A(1.2, 0.1, 0.72) })],
      [0.5, P(b, { torso: { pitch: 0.16 }, head: { pitch: -0.05 }, armR: A(1.2, 0.1, 0.72) })],
      [0.6, P(b, { torso: { pitch: 0.02 }, head: { pitch: -0.15 }, armR: A(0.55, 0.1, 2.15) })],
      [0.72, P(b, { torso: { pitch: 0.02 }, head: { pitch: -0.12 }, armR: A(0.55, 0.1, 2.15) })],
      [0.88, P(b, { armR: A(0.8, 0.1, 0.92) })],
      [1, b]
    ]), toward * 0.35, toward * 0.6);
  },
  tilt: function (u) { return { R: { pitch: -0.6 * win(u, 0.58, 0.74, 0.04) } }; }
}));

reg(def({
  id: 'guest.tasteApprove', group: 'guest', roles: ['guest'], loop: false, travel: false, handed: true, base: 3,
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.08, type: 'grab', hand: 'R', at: 'table' }, { u: 0.82, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.seatedIdle', 'guest.gesture'],
  pose: function (u, c) {
    const swirl = win(u, 0.15, 0.32, 0.03);
    const sw = Math.sin(u * TAU * 8);
    const p = keys(u, [
      [0, SEAT],
      [0.12, P(SEAT, { armR: A(0.8, 0.12, 1.0) })],
      [0.32, P(SEAT, { armR: A(0.8, 0.12, 1.0) })],
      [0.4, P(SEAT, { torso: { pitch: 0.12 }, head: { pitch: 0.12 }, armR: A(0.6, 0.06, 2.2) })],
      [0.68, P(SEAT, { torso: { pitch: 0.04 }, head: { pitch: -0.12 }, armR: A(0.58, 0.08, 2.2) })],
      [0.8, P(SEAT, { armR: A(0.8, 0.1, 0.95) })],
      [1, SEAT]
    ]);
    const arm = p.armR ?? {};
    const nod = 0.3 * bell(u, 0.9, 0.035);
    return withYaw({ ...p, armR: { ...arm, lift: (arm.lift ?? 0) + 0.05 * sw * swirl }, head: { ...(p.head ?? {}), pitch: (p.head?.pitch ?? 0) + nod } }, 0, (c.yaw ?? 0) * 0.7 * ramp(u, 0.82, 0.9));
  },
  tilt: function (u) { return { R: { pitch: -0.5 * win(u, 0.55, 0.7, 0.04), roll: 0.12 * Math.sin(u * TAU * 8) * win(u, 0.15, 0.32, 0.03) } }; }
}));

reg(def({
  id: 'guest.gesture', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.gesture', 'guest.lean', 'guest.seatedIdle', 'guest.toast', 'guest.eat'],
  pose: function (u, c) {
    const s1 = Math.sin(u * TAU), s2 = Math.sin(u * TAU * 2 + 1);
    const b = base(c, true);
    return breathe(withYaw(P(b, {
      torso: { pitch: 0.1 + 0.04 * s2 },
      head: { pitch: 0.02 + 0.06 * Math.sin(u * TAU * 3) },
      armR: A(0.85 + 0.25 * s1, 0.22 + 0.12 * s2, 1.3 - 0.35 * s1),
      armL: A(0.75 + 0.12 * s2, 0.15, 1.2)
    }), (c.yaw ?? 0) * 0.3, (c.yaw ?? 0) * 0.75), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.lean', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 4,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.lean', 'guest.gesture', 'guest.seatedIdle', 'guest.toast'],
  pose: function (u, c) {
    const side = c.side ?? 1;
    const laugh = bell(u, 0.62, 0.05);
    const b = base(c, true);
    return breathe(withYaw(P(b, {
      torso: { pitch: 0.3 - 0.35 * laugh, roll: side * 0.12 },
      head: { pitch: 0.1 + 0.06 * Math.sin(u * TAU * 2) - 0.2 * laugh },
      armR: A(0.8, 0.05, 1.0), armL: A(0.5, 0.1, 1.15)
    }), (c.yaw ?? 0) * 0.4, (c.yaw ?? 0) * 0.8), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.waveStaff', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, handed: true,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.order', 'guest.pay'],
  pose: function (u, c) {
    const up = win(u, 0.12, 0.85, 0.12);
    const wv = Math.sin(u * TAU * 4) * win(u, 0.25, 0.7, 0.05);
    const b = base(c, true);
    return withYaw(P(b, {
      torso: { pitch: 0.02, roll: 0.06 * up },
      armR: A(0.78 + 1.6 * up, 0.1 + 0.08 * up + 0.1 * wv, 0.95 - 0.6 * up)
    }), (c.yaw ?? 0) * 0.25 * up, (c.yaw ?? 0) * 0.8 * up);
  }
}));

// ORDER 315b del 2 — Designs tillägg till D7 (fikaClips.ts), oförändrade: den som frågar räcker upp
// handen (holdUntil tills kortet öppnas), de andra dricker ur koppen.

reg(def({
  id: 'gesture.raiseHand', group: 'guest', roles: ['guest', 'waiter', 'staff', 'cook', 'host', 'bartender', 'sommelier'], loop: false, travel: false, handed: true, base: 1.8,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [{ u: 0.4, type: 'signal' }],
  next: ['guest.seatedIdle', 'fika.sipCup'],
  pose: function (u, c) {
    // 0–0,4 armen upp, 0,4–0,75 stilla (förlängs med c.holdUntil), 0,75–1 ned. c.seated = false ger samma klipp stående.
    const b = base(c, true);
    const up = win(u, 0.04, 0.96, 0.32);
    return withYaw(P(b, {
      torso: { pitch: 0.02 - 0.06 * up, roll: -0.05 * up }, head: { pitch: 0.04 - 0.12 * up },
      armR: A(0.6 + 2.35 * up, 0.12 + 0.06 * up, 0.9 - 0.75 * up)
    }), (c.yaw ?? 0) * 0.2 * up, (c.yaw ?? 0) * 0.7 * up);
  },
  tilt: function (u) { return { R: { pitch: 0.35 * win(u, 0.04, 0.96, 0.32) } }; } // handflatan framåt
}));

reg(def({
  id: 'fika.sipCup', group: 'guest', roles: ['guest', 'waiter', 'staff', 'cook', 'host', 'bartender', 'sommelier'], loop: false, travel: false, handed: true, base: 3,
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.12, type: 'grab', hand: 'R', at: 'table', prop: 'coffeeCup' }, { u: 0.88, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.seatedIdle', 'fika.sipCup', 'gesture.raiseHand'],
  pose: function (u, c) {
    const b = base(c, true);
    const cup = A(0.9, 0.1, 1.95), saucer = A(0.75, 0.06, 1.2);
    return keys(u, [
      [0, b],
      [0.12, P(b, { armR: A(0.8, 0.1, 0.95) })],
      [0.32, P(b, { torso: { pitch: 0.1 }, head: { pitch: 0.05 }, armR: cup, armL: saucer })],
      [0.5, P(b, { torso: { pitch: 0.04 }, head: { pitch: -0.18 }, armR: A(0.8, 0.1, 2.15), armL: saucer })],
      [0.66, P(b, { torso: { pitch: 0.08 }, head: { pitch: 0.02 }, armR: cup, armL: saucer })],
      [0.88, P(b, { armR: A(0.8, 0.1, 0.95) })],
      [1, b]
    ]);
  },
  tilt: function (u) { return { R: { pitch: -0.5 * win(u, 0.4, 0.6, 0.06) } }; }
}));

reg(def({
  id: 'guest.riseGreet', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4.4,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.gesture', 'guest.readMenu'],
  pose: function (u, c) {
    const shake = win(u, 0.36, 0.62, 0.05);
    const pump = Math.sin(u * TAU * 7) * shake;
    const greet = P(STAND, { torso: { pitch: 0.1 }, head: { pitch: 0.05 + 0.08 * pump }, armR: A(0.9, 0.06, 0.35 + 0.08 * pump) });
    return withYaw(keys(u, [
      [0, SEAT], [0.14, CROUCH], [0.28, STAND], [0.36, greet], [0.62, greet], [0.7, STAND], [0.84, CROUCH], [1, SEAT]
    ]), (c.yaw ?? 0) * 0.5 * win(u, 0.25, 0.72, 0.08), (c.yaw ?? 0) * 0.8 * win(u, 0.2, 0.75, 0.08));
  },
  root: function (u) {
    const out = ramp(u, 0.02, 0.2) - ramp(u, 0.74, 0.95);
    return [0, -SEAT_RULE.chairPull * out + SEAT_RULE.approachFront * win(u, 0.2, 0.78, 0.08), 0];
  },
  chair: function (u) { return SEAT_RULE.chairPull * (ramp(u, 0.02, 0.2) - ramp(u, 0.74, 0.95)); }
}));

reg(def({
  id: 'guest.pay', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {},
  events: [{ u: 0.6, type: 'pay', at: 'partner' }],
  next: ['guest.seatedIdle', 'guest.leave', 'guest.leaveStool', 'guest.leaveLounge'],
  pose: function (u, c) {
    const toward = win(u, 0.4, 0.85, 0.1);
    return withYaw(keys(u, [
      [0, SEAT],
      [0.2, P(SEAT, { torso: { pitch: 0.02, roll: -0.06 }, armR: A(0.35, -0.15, 2.2) })],
      [0.32, P(SEAT, { torso: { pitch: 0.02, roll: -0.06 }, armR: A(0.35, -0.15, 2.2) })],
      [0.5, P(SEAT, { torso: { pitch: 0.14 }, armR: A(1.05, 0.18, 0.35) })],
      [0.7, P(SEAT, { torso: { pitch: 0.14 }, armR: A(1.05, 0.18, 0.35) })],
      [0.9, SEAT],
      [1, SEAT]
    ]), (c.yaw ?? 0) * 0.3 * toward, (c.yaw ?? 0) * 0.7 * ramp(u, 0.3, 0.45));
  }
}));

reg(def({
  id: 'guest.leave', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6,
  from: 'seated', to: 'stand', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u) {
    return keys(u, [
      [0, SEAT], [0.2, CROUCH], [0.4, STAND],
      [0.72, P(STAND, { armR: A(0.2, 0.12, 0.4) })],
      [0.82, P(STAND, { torso: { pitch: 0.12 }, armR: A(0.55, 0.15, 0.45) })],
      [1, STAND]
    ]);
  },
  root: function (u, c) {
    const side = c.side ?? 1;
    const out = ramp(u, 0.05, 0.3);
    const x = side * 0.5 * ramp(u, 0.42, 0.78);
    const z = -SEAT_RULE.chairPull * out + SEAT_RULE.approachFront * ramp(u, 0.3, 0.5);
    return [x, z, (c.yaw ?? 0) * ramp(u, 0.5, 0.95)];
  },
  chair: function (u) { return SEAT_RULE.chairPull * (ramp(u, 0.05, 0.3) - ramp(u, 0.76, 0.98)); }
}));

// ===== barstolen och loungen (tillägget) ==============================

const STOOL: FigurePose = P(SEAT, {
  hipDrop: SEAT_KINDS.stool.drop, torso: { pitch: 0.1 }, head: { pitch: 0.06 },
  legL: SEAT_KINDS.stool.legs, legR: SEAT_KINDS.stool.legs
});
const LOUNGE: FigurePose = P(SEAT, {
  hipDrop: SEAT_KINDS.lounge.drop, torso: { pitch: -0.12 }, head: { pitch: 0.16 },
  legL: SEAT_KINDS.lounge.legs, legR: SEAT_KINDS.lounge.legs
});
/** Djup sänkning mot en låg dyna: bålen fram som motvikt, händerna fram. Fotleden = knä − höft. */
const LOUNGE_CROUCH: FigurePose = P(STAND, {
  hipDrop: 0.3, torso: { pitch: 0.55 }, head: { pitch: -0.05 },
  armL: A(0.65, 0.15, 0.5), armR: A(0.65, 0.15, 0.5),
  legL: { swing: 1.1, spread: 0.08, knee: 1.7, ankle: 0.6 }, legR: { swing: 1.1, spread: 0.08, knee: 1.7, ankle: 0.6 }
});

reg(def({
  id: 'guest.sitStool', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, seatKind: 'stool',
  from: 'stand', to: 'seated', needs: 'stool', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.gesture', 'guest.readMenu', 'guest.lean'],
  pose: function (u, c) {
    const side = c.side ?? 1;
    const reach = P(STAND, { torso: { pitch: 0.12 }, armR: A(1.0, 0.12, 0.7), armL: A(0.25, 0.1, 0.4) });
    // Foten på ringen: det närmaste benet lyfts först.
    const footUp = { swing: 0.95, spread: 0.08, knee: 1.75, ankle: 0.8 };
    const climb: FigurePose = side > 0
      ? P(reach, { hipDrop: 0, torso: { pitch: 0.2 }, legR: footUp })
      : P(reach, { hipDrop: 0, torso: { pitch: 0.2 }, legL: footUp });
    let p = keys(u, [
      [0, STAND],
      [0.35, reach],
      [0.6, climb],
      [0.82, P(STOOL, { armR: A(0.9, 0.12, 0.9) })],
      [1, STOOL]
    ]);
    const step = win(u, 0.08, 0.5, 0.06);
    if (step > 0) p = blendPose(p, walking(p, (u - 0.08) / 0.42, 0.45, 'none'), step);
    return withYaw(p, 0, -side * 0.3 * win(u, 0, 0.45, 0.12));
  },
  root: function (u, c) {
    const side = c.side ?? 1;
    const a = SEAT_KINDS.stool.approach;
    const k = ramp(u, 0.08, 0.72);
    return [side * a[0] * (1 - k), a[1] * (1 - ramp(u, 0.08, 0.8)), 0];
  }
}));

reg(def({
  id: 'guest.leaveStool', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, seatKind: 'stool',
  from: 'seated', to: 'stand', needs: 'stool', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u) {
    return keys(u, [
      [0, STOOL],
      [0.3, P(STOOL, { torso: { pitch: 0.18 }, armR: A(0.95, 0.12, 0.75) })],
      [0.55, P(STAND, { torso: { pitch: 0.12 }, armR: A(0.9, 0.12, 0.7), legL: LEG_FRONT, legR: LEG_BACK })],
      [0.8, P(STAND, { armR: A(0.3, 0.1, 0.4) })],
      [1, STAND]
    ]);
  },
  root: function (u, c) {
    const side = c.side ?? 1;
    const back = ramp(u, 0.3, 0.6);
    const out = ramp(u, 0.55, 0.95);
    return [side * 0.4 * out, -0.3 * back - 0.25 * out, (c.yaw ?? 0) * ramp(u, 0.6, 1)];
  }
}));

reg(def({
  id: 'guest.sitLounge', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.2, seatKind: 'lounge',
  from: 'stand', to: 'seated', needs: 'lounge', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.gesture', 'guest.lean', 'guest.readMenu'],
  pose: function (u) {
    let p = keys(u, [
      [0, STAND],
      [0.5, STAND],
      [0.62, P(STAND, { torso: { pitch: 0.2 }, head: { pitch: 0.1 }, armL: A(0.3, 0.12, 0.4), armR: A(0.3, 0.12, 0.4) })],
      [0.8, LOUNGE_CROUCH],
      [0.9, P(LOUNGE, { torso: { pitch: 0.12 }, head: { pitch: 0.05 } })],
      [1, LOUNGE]
    ]);
    // Vänder sig om på stället (0,05–0,45) och backar två steg (0,4–0,65).
    const step = win(u, 0.05, 0.65, 0.06);
    if (step > 0) p = blendPose(p, walking(p, (u - 0.05) / 0.3, 0.4, 'none'), step);
    return p;
  },
  root: function (u, c) {
    const side = c.side ?? 1;
    const a = SEAT_KINDS.lounge.approach;
    const turn = ramp(u, 0.05, 0.45);
    const z = a[1] * (1 - 0.9 * ramp(u, 0.4, 0.66)) - a[1] * 0.1 * ramp(u, 0.66, 0.86);
    return [0, z, side * Math.PI * (1 - turn)];
  }
}));

reg(def({
  id: 'guest.leaveLounge', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.8, seatKind: 'lounge',
  from: 'seated', to: 'stand', needs: 'lounge', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u) {
    return keys(u, [
      [0, LOUNGE],
      [0.22, P(LOUNGE, { torso: { pitch: 0.35 }, armL: A(0.55, 0.12, 0.6), armR: A(0.55, 0.12, 0.6) })],
      [0.42, LOUNGE_CROUCH],
      [0.66, P(STAND, { torso: { pitch: 0.14 }, legL: LEG_FRONT, legR: LEG_BACK })],
      [1, STAND]
    ]);
  },
  root: function (u, c) {
    const side = c.side ?? 1;
    const out = ramp(u, 0.3, 0.7);
    const away = ramp(u, 0.7, 1);
    return [side * 0.35 * away, 0.45 * out, (c.yaw ?? 0) * away];
  }
}));

// ===== raketerna =====================================================
//
// Klippen till raketerna som finns i dag. Var och en är gjord för att läsas från 24 m
// innan frågan kommer: det ska synas vem det gäller och att något har hänt.

reg(def({
  id: 'rocket.cutHand', group: 'rocket', roles: FLOOR_STAFF, loop: false, travel: false, base: 3.4,
  from: 'stand', to: 'hurt', needs: 'floor', holds: { R: 'wineBottle' }, ends: {},
  events: [{ u: 0.03, type: 'switch', hand: 'R' }, { u: 0.28, type: 'cut' }, { u: 0.42, type: 'release', hand: 'L', at: 'bar' }],
  next: ['rocket.holdHand'],
  pose: function (u) {
    const work = P(STAND, { torso: { pitch: 0.14 }, head: { pitch: 0.42 }, armL: A(0.55, 0.1, 1.45), armR: A(0.62, 0.22, 1.45) });
    const flinch = P(STAND, { lift: -0.02, torso: { pitch: -0.1 }, head: { pitch: 0.5 }, armL: A(0.55, 0.1, 1.45), armR: A(0.25, 0.38, 2.1), legL: LEG_BACK, legR: LEG_FRONT });
    const putDown = P(STAND, { torso: { pitch: 0.25 }, head: { pitch: 0.45 }, armL: A(0.8, 0.1, 0.5), armR: A(0.3, 0.3, 2.0), legL: LEG_FRONT, legR: LEG_BACK });
    const r = Math.sin(u * TAU * 12) * win(u, 0.06, 0.26, 0.03);
    return keys(u, [
      [0, P(STAND, { armR: CHEST_ARM })],
      [0.08, work],
      [0.25, P(work, { armR: A(0.62, 0.22 + 0.04 * r, 1.45) })],
      [0.3, flinch],
      [0.42, putDown],
      [0.55, HURT],
      [1, HURT]
    ]);
  },
  root: function (u) { return [0, -0.25 * ramp(u, 0.28, 0.5), 0]; }
}));

reg(def({
  id: 'rocket.holdHand', group: 'rocket', roles: FLOOR_STAFF, loop: true, travel: false, base: 2,
  from: 'hurt', to: 'hurt', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['rocket.holdHand', 'staff.walk'],
  pose: function (u, c) {
    const look = win(u, 0.6, 0.85, 0.06);
    return withYaw(P(HURT, {
      torso: { pitch: 0.36 + 0.04 * Math.sin(u * TAU) - 0.15 * look },
      head: { pitch: 0.5 - 0.45 * look }
    }), 0, (c.yaw ?? 0) * 0.8 * look);
  }
}));

reg(def({
  id: 'rocket.smellWine', group: 'rocket', roles: ['guest'], loop: false, travel: false, handed: true, base: 4,
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.08, type: 'grab', hand: 'R', at: 'table' }, { u: 0.82, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.waveStaff', 'guest.seatedIdle'],
  pose: function (u, c) {
    const swirl = win(u, 0.15, 0.33, 0.03);
    const sw = Math.sin(u * TAU * 9);
    const nose = P(SEAT, { torso: { pitch: 0.14 }, head: { pitch: 0.14 }, armR: A(0.6, 0.06, 2.2) });
    const p = keys(u, [
      [0, SEAT],
      [0.12, P(SEAT, { armR: A(0.82, 0.12, 1.0) })],
      [0.33, P(SEAT, { armR: A(0.82, 0.12, 1.0) })],
      [0.42, nose],
      [0.6, nose],
      [0.66, P(SEAT, { torso: { pitch: -0.1 }, head: { pitch: -0.28 }, armR: A(0.95, 0.14, 0.95) })],
      [0.8, P(SEAT, { torso: { pitch: 0.02 }, head: { pitch: 0.0 }, armR: A(0.82, 0.1, 0.95) })],
      [0.9, P(SEAT, { torso: { pitch: -0.04 }, armL: A(0.5, 0.06, 1.14) })],
      [1, P(SEAT, { torso: { pitch: -0.04 }, armL: A(0.5, 0.06, 1.14) })]
    ]);
    const arm = p.armR ?? {};
    return withYaw({ ...p, armR: { ...arm, lift: (arm.lift ?? 0) + 0.06 * sw * swirl } }, (c.yaw ?? 0) * 0.3 * ramp(u, 0.85, 1), (c.yaw ?? 0) * 0.85 * ramp(u, 0.84, 0.96));
  },
  tilt: function (u) { return { R: { roll: 0.14 * Math.sin(u * TAU * 9) * win(u, 0.15, 0.33, 0.03), pitch: -0.25 * win(u, 0.42, 0.62, 0.04) } }; }
}));

reg(def({
  id: 'rocket.askPointMenu', group: 'rocket', roles: ['guest'], loop: false, travel: false, base: 4,
  from: 'seated', to: 'seated', needs: 'chair', holds: { R: 'menu' }, ends: { L: 'menu' },
  events: [{ u: 0.02, type: 'switch', hand: 'R' }],
  next: ['guest.order', 'guest.seatedIdle', 'rocket.askPointMenu'],
  pose: function (u, c) {
    const up = win(u, 0.08, 1.01, 0.08) * (1 - 0.8 * (bell(u, 0.33, 0.05) + bell(u, 0.56, 0.05)));
    const dip = bell(u, 0.33, 0.03) + bell(u, 0.56, 0.03);
    const palm = win(u, 0.7, 0.96, 0.06);
    return withYaw(P(SEAT, {
      torso: { pitch: 0.12, roll: 0.1 * palm },
      head: { pitch: 0.35 - 0.5 * up, yaw: 0 },
      armL: A(0.68, 0.1, 1.2),
      armR: A(0.8 + 0.2 * palm, 0.04 + 0.28 * palm, 1.0 + 0.2 * dip - 0.3 * palm)
    }), (c.yaw ?? 0) * 0.3 * up, (c.yaw ?? 0) * 0.8 * up);
  }
}));

reg(def({
  id: 'rocket.walkToKitchen', group: 'rocket', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['rocket.walkToKitchen', 'staff.idle'],
  pose: function (u, c) {
    const p = walking(P(STAND, { torso: { pitch: 0.1 }, head: { pitch: -0.02 }, armR: A(0.4, 0.1, 0.9) }), c.phase ?? u, (c.stride ?? 1) * 1.15, 'L');
    return p;
  }
}));


// ===== leverans 3: händelsernas klipp ==================================
// Samma regler som ovan: u går 0 → 1, posen blandas mellan nyckelposer, tempot sköts av längden.
// Sittande klipp för rullstolen använder SEAT utan armarna på bordet (WHEEL).

const WHEEL: FigurePose = P(SEAT, { torso: { pitch: 0.02 }, armL: A(0.1, 0.18, 0.9), armR: A(0.1, 0.18, 0.9) });
// ORDER 293 — oanvänd i leveransen (vardagens koreografi); kvar som Designs lista.
export const EVENT_FLOOR: Role[] = ['waiter', 'bartender', 'sommelier', 'staff', 'host'];

// ----- gäster -----

reg(def({
  id: 'guest.whisper', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.gesture', 'guest.clap', 'guest.sing'],
  pose: function (u, c) {
    const side = c.side ?? 1, k = win(u, 0.1, 0.9, 0.25);
    const p = P(SEAT, { torso: { pitch: 0.18 * k, roll: side * 0.22 * k }, head: { pitch: 0.1 * k }, armR: A(0.78 + 0.9 * k, 0.1 + 0.2 * k, 0.95 + 1.1 * k) });
    return withYaw(p, side * 0.25 * k, side * 0.55 * k);
  }
}));

reg(def({
  id: 'guest.clap', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 1.2,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.clap', 'guest.sing', 'guest.seatedIdle'],
  pose: function (u, c) {
    const beat = Math.abs(Math.sin(u * TAU * 2));
    return P(base(c, true), { torso: { pitch: 0.04 }, head: { pitch: -0.08 }, armL: A(0.95, 0.35 - 0.2 * beat, 1.6), armR: A(0.95, 0.35 - 0.2 * beat, 1.6) });
  }
}));

reg(def({
  id: 'guest.sing', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.sing', 'guest.clap', 'guest.seatedIdle'],
  pose: function (u, c) {
    const sway = Math.sin(u * TAU);
    return P(base(c, true), { torso: { roll: 0.08 * sway, pitch: -0.02 }, head: { pitch: -0.18, yaw: 0.15 * sway }, armR: A(0.9 + 0.15 * Math.sin(u * TAU * 2), 0.25, 1.2) });
  }
}));

reg(def({
  id: 'guest.reachGlass', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2, handed: true,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: { R: 'wineGlass' },
  events: [{ u: 0.45, type: 'grab', hand: 'R', at: 'table' }],
  next: ['guest.toast', 'guest.seatedIdle'],
  pose: function (u) {
    return keys(u, [[0, SEAT], [0.45, P(SEAT, { torso: { pitch: 0.2 }, armR: A(1.05, 0.12, 0.35) })], [1, P(SEAT, { armR: A(0.78, 0.1, 1.2) })]]);
  }
}));

reg(def({
  id: 'guest.stagger', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.stagger', 'guest.balance', 'guest.walk', 'guest.standBar'],
  pose: function (u, c) {
    const ph = c.phase ?? u, sway = Math.sin(ph * Math.PI);
    const p = walking(P(STAND, { head: { pitch: 0.12 }, armL: A(0.1, 0.25 + 0.15 * sway, 0.5), armR: A(0.1, 0.25 - 0.15 * sway, 0.5) }), ph, (c.stride ?? 1) * 0.8, 'none');
    const t = p.torso ?? {};
    return { ...p, torso: { ...t, roll: (t.roll ?? 0) + 0.14 * sway, pitch: (t.pitch ?? 0) + 0.06 }, head: { ...(p.head ?? {}), yaw: 0.2 * Math.sin(ph * TAU * 0.5) } };
  },
  root: function (u) { return [0.12 * Math.sin(u * TAU), 0, 0]; }
}));

reg(def({
  id: 'guest.balance', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.stagger', 'guest.standBar', 'guest.walk', 'staff.idle'],
  pose: function (u) {
    const s = Math.sin(u * TAU * 1.5) * (1 - u);
    return P(STAND, { lift: -0.02, torso: { roll: 0.18 * s, pitch: 0.08 }, head: { pitch: 0.1, yaw: -0.2 * s }, armL: A(0.2, 0.9 + 0.3 * s, 0.3), armR: A(0.2, 0.9 - 0.3 * s, 0.3), legL: { ...LEG_STAND, spread: 0.12, knee: 0.18 }, legR: { ...LEG_STAND, spread: 0.12, knee: 0.18 } });
  }
}));

reg(def({
  id: 'guest.startle', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.2,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.comfort', 'guest.walk', 'staff.idle'],
  pose: function (u) {
    const k = win(u, 0.02, 0.9, 0.2);
    return P(STAND, { lift: 0.02 * bell(u, 0.12, 0.08), torso: { pitch: -0.14 * k }, head: { pitch: -0.1 * k }, armL: A(0.9 * k, 0.3 * k, 1.8 * k), armR: A(0.9 * k, 0.3 * k, 1.8 * k), legL: { ...LEG_BACK, knee: 0.2 } });
  },
  root: function (u) { return [0, -0.25 * ramp(u, 0.02, 0.2), 0]; }
}));

reg(def({
  id: 'guest.comfort', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.comfort', 'guest.walk', 'staff.idle'],
  pose: function (u, c) {
    const pat = 0.08 * Math.max(0, Math.sin(u * TAU * 2));
    return withYaw(P(STAND, { torso: { pitch: 0.12, roll: -0.05 }, head: { pitch: 0.18 }, armR: A(1.25 + pat, 0.2, 0.6) }), 0.2, 0.3 + (c.yaw ?? 0) * 0.5);
  }
}));

reg(def({
  id: 'guest.slip', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6,
  from: 'walk', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.balance', 'staff.idle', 'guest.walk'],
  pose: function (u) {
    return keys(u, [
      [0, STAND],
      [0.18, P(STAND, { lift: -0.03, torso: { pitch: -0.2, roll: 0.1 }, armL: A(0.6, 1.1, 0.4), armR: A(0.4, 1.3, 0.3), legL: { swing: 0.55, spread: 0.06, knee: 0.05, ankle: -0.2 }, legR: { ...LEG_BACK, knee: 0.5 } })],
      [0.4, P(STAND, { lift: -0.12, hipDrop: 0.08, torso: { pitch: 0.3, roll: -0.12 }, armL: A(0.5, 0.6, 0.6), armR: A(0.9, 0.3, 0.8), legL: { ...LEG_FRONT, knee: 0.6, ankle: 0.3 }, legR: { ...LEG_BACK, knee: 0.9 } })],
      [0.75, P(STAND, { torso: { pitch: 0.12 }, armL: A(0.3, 0.3, 0.5), armR: A(0.3, 0.3, 0.5) })],
      [1, STAND]
    ]);
  },
  root: function (u) { return [0, 0.3 * ramp(u, 0, 0.3), 0]; }
}));

reg(def({
  id: 'guest.peek', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.peek', 'guest.walk', 'staff.idle'],
  pose: function (u, c) {
    const toes = 0.03 * win(u, 0.1, 0.9, 0.2);
    return withYaw(P(STAND, { lift: toes, torso: { pitch: 0.18 }, head: { pitch: -0.1 }, armL: A(0.25, 0.1, 0.5), armR: A(0.25, 0.1, 0.5), legL: { ankle: -0.2 }, legR: { ankle: -0.2 } }), 0, (c.yaw ?? 0) * 0.6 + 0.35 * Math.sin(u * TAU));
  }
}));

reg(def({
  id: 'guest.showId', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.4, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {},
  events: [{ u: 0.3, type: 'show', hand: 'R' }, { u: 0.55, type: 'give', hand: 'R', at: 'partner' }],
  next: ['guest.standBar', 'staff.idle', 'guest.walk'],
  pose: function (u) {
    return keys(u, [[0, STAND], [0.2, P(STAND, { armR: A(0.2, 0.25, 1.9), head: { pitch: 0.3 } })], [0.45, P(STAND, { torso: { pitch: 0.08 }, armR: CHEST_ARM })], [0.6, P(STAND, { armR: A(0.9, 0.1, 0.4) })], [1, STAND]]);
  }
}));

// Leverans 3, tillsynen variant B: den unga gästen visar legitimationen sittande. Kortet ur fickan,
// fram över bordet till servitören, och tillbaka.
reg(def({
  id: 'guest.showIdSeated', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.8, handed: true,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {},
  events: [{ u: 0.15, type: 'grab', hand: 'R' }, { u: 0.45, type: 'show', hand: 'R' }, { u: 0.85, type: 'release', hand: 'R' }],
  next: ['guest.seatedIdle', 'guest.gesture'],
  pose: function (u) {
    const out = P(SEAT, { torso: { pitch: 0.14 }, head: { pitch: 0.12 }, armR: A(1.05, 0.1, 0.45) });
    return keys(u, [[0, SEAT], [0.15, P(SEAT, { armR: A(0.3, 0.25, 1.9), head: { pitch: 0.25 } })], [0.4, out], [0.72, out], [1, SEAT]]);
  }
}));

reg(def({
  id: 'guest.standBar', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 5,
  from: 'stand', to: 'stand', needs: 'bar', holds: {}, ends: {}, events: [],
  next: ['guest.standBar', 'guest.showId', 'guest.stagger', 'guest.walk'],
  pose: function (u, c) {
    const shift = Math.sin(u * TAU);
    return breathe(P(STAND, { torso: { pitch: 0.1, roll: 0.03 * shift }, head: { yaw: (c.yaw ?? 0) * 0.5 }, armL: A(1.0, 0.12, 1.5), armR: A(0.6, 0.05, 1.2), legL: { knee: 0.06 + 0.06 * Math.max(0, shift) }, legR: { knee: 0.06 + 0.06 * Math.max(0, -shift) } }), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.wheel', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 5,
  from: 'seated', to: 'seated', needs: 'wheelchair', holds: {}, ends: {}, events: [],
  next: ['guest.wheel', 'guest.wheelTurn', 'guest.wheelToTable', 'guest.seatedIdle'],
  pose: function (u, c) { return breathe(withYaw(WHEEL, 0, (c.yaw ?? 0) * 0.6 + 0.12 * Math.sin(u * TAU)), c.t ?? 0); }
}));

reg(def({
  id: 'guest.wheelRoll', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'seated', to: 'seated', needs: 'wheelchair', holds: {}, ends: {}, events: [],
  next: ['guest.wheelRoll', 'guest.wheel', 'guest.wheelTurn', 'guest.wheelToTable'],
  pose: function (u, c) {
    const push = Math.max(0, Math.sin((c.phase ?? u) * TAU));
    return P(WHEEL, { torso: { pitch: 0.08 + 0.1 * push }, armL: A(-0.1 + 0.55 * push, 0.2, 0.6), armR: A(-0.1 + 0.55 * push, 0.2, 0.6) });
  }
}));

reg(def({
  id: 'guest.wheelTurn', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6,
  from: 'seated', to: 'seated', needs: 'wheelchair', holds: {}, ends: {}, events: [],
  next: ['guest.wheel', 'guest.wheelToTable'],
  pose: function (u, c) {
    const side = c.side ?? 1, push = Math.sin(u * TAU);
    return P(WHEEL, { torso: { pitch: 0.12 }, armL: A(0.1 - 0.35 * side * push, 0.2, 0.7), armR: A(0.1 + 0.35 * side * push, 0.2, 0.7) });
  },
  root: function (u, c) { return [0, 0, (c.side ?? 1) * (Math.PI / 2) * smooth(u)]; }
}));

reg(def({
  id: 'guest.wheelToTable', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3,
  from: 'seated', to: 'seated', needs: 'wheelchair', holds: {}, ends: {}, events: [],
  next: ['guest.wheel', 'guest.seatedIdle'],
  pose: function (u) {
    const push = Math.max(0, Math.sin(u * TAU * 2)) * (1 - ramp(u, 0.75, 1));
    return keys(u, [[0, WHEEL], [0.8, P(WHEEL, { torso: { pitch: 0.1 + 0.1 * push }, armL: A(-0.1 + 0.6 * push, 0.2, 0.6), armR: A(-0.1 + 0.6 * push, 0.2, 0.6) })], [1, SEAT]]);
  },
  root: function (u) { return [0, 0.6 * ramp(u, 0.05, 0.8), 0]; }
}));

// ----- hovmästaren -----

reg(def({
  id: 'host.welcome', group: 'host', roles: ['host', 'staff'], loop: false, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'desk', holds: {}, ends: {}, events: [],
  next: ['host.point', 'host.introduce', 'staff.escort', 'staff.idle'],
  pose: function (u, c) {
    const bow = win(u, 0.1, 0.6, 0.15), open = win(u, 0.4, 1, 0.2);
    return withYaw(P(STAND, { torso: { pitch: 0.3 * bow }, head: { pitch: 0.25 * bow }, armR: A(0.5 * open, 0.5 * open, 0.4), armL: A(0.1, 0.06, 0.3) }), 0, (c.yaw ?? 0) * 0.5);
  }
}));

reg(def({
  id: 'host.point', group: 'host', roles: ['host', 'staff'], loop: false, travel: false, base: 1.8, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.escort', 'staff.idle', 'staff.walk'],
  pose: function (u, c) {
    const k = win(u, 0.1, 0.95, 0.2), dir = c.yaw ?? 0.6;
    return withYaw(P(STAND, { armR: A(1.2 * k, 0.35 * k + 0.06, 0.15) }), dir * 0.35 * k, dir * 0.7 * k);
  }
}));

reg(def({
  id: 'host.introduce', group: 'host', roles: ['host', 'staff'], loop: false, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.listen', 'staff.idle', 'staff.walk'],
  pose: function (u) {
    const a = win(u, 0.05, 0.55, 0.15), b = win(u, 0.45, 0.98, 0.15);
    return withYaw(P(STAND, { armR: A(0.8 * a, 0.45 * a + 0.06, 0.5), armL: A(0.8 * b, 0.45 * b + 0.06, 0.5) }), 0.3 * a - 0.3 * b, 0.6 * a - 0.6 * b);
  }
}));

reg(def({
  id: 'host.fetchFolder', group: 'host', roles: ['host', 'staff'], loop: false, travel: false, base: 2.8,
  from: 'stand', to: 'stand', needs: 'desk', holds: {}, ends: { R: 'licenceFolder' },
  events: [{ u: 0.5, type: 'grab', hand: 'R', at: 'desk' }],
  next: ['staff.openFolder', 'staff.walk'],
  pose: function (u) {
    return keys(u, [[0, STAND], [0.4, P(CROUCH, { armR: A(0.9, 0.1, 0.3) })], [0.55, P(CROUCH, { armR: A(0.7, 0.1, 1.0) })], [1, P(STAND, { armR: CHEST_ARM })]]);
  }
}));

// ----- all personal -----

reg(def({
  id: 'staff.listen', group: 'staff', roles: STAFF, loop: true, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.listen', 'staff.idle', 'staff.decline', 'staff.write', 'host.point', 'staff.walk'],
  pose: function (u, c) {
    const nod = 0.08 * Math.max(0, Math.sin(u * TAU * 2));
    return breathe(withYaw(P(STAND, { torso: { pitch: 0.1 }, head: { pitch: 0.12 + nod, yaw: 0 }, armL: A(0.35, 0.05, 1.3), armR: A(0.35, 0.05, 1.3) }), 0, (c.yaw ?? 0) * 0.5 + 0.1), c.t ?? 0);
  }
}));

reg(def({
  id: 'staff.beckon', group: 'staff', roles: STAFF, loop: false, travel: false, base: 1.6, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'staff.walk', 'staff.listen'],
  pose: function (u, c) {
    const k = win(u, 0.05, 0.95, 0.2), curl = 0.5 * Math.max(0, Math.sin(u * TAU * 2));
    return withYaw(P(STAND, { armR: A(0.9 * k, 0.15, 0.8 + curl * k) }), 0, (c.yaw ?? 0) * 0.6);
  }
}));

reg(def({
  id: 'staff.halt', group: 'staff', roles: STAFF, loop: false, travel: false, base: 1.2, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'staff.decline', 'staff.listen', 'staff.walk'],
  pose: function (u) {
    const k = win(u, 0.02, 1.01, 0.18);
    return P(STAND, { torso: { pitch: -0.04 * k }, head: { pitch: -0.05 * k }, armR: A(1.35 * k, 0.1, 0.25) });
  }
}));

reg(def({
  id: 'staff.kneelTalk', group: 'staff', roles: STAFF, loop: false, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.push', 'staff.escort', 'staff.idle', 'staff.walk'],
  pose: function (u, c) {
    const talk = 0.15 * Math.sin(u * TAU * 3);
    const low = P(CROUCH, { hipDrop: 0.42, torso: { pitch: 0.2 }, head: { pitch: -0.05, yaw: (c.yaw ?? 0) * 0.5 }, armR: A(0.6 + talk, 0.1, 0.9), armL: A(0.6, 0.1, 1.2), legL: { swing: 1.2, spread: 0.06, knee: 1.9, ankle: 0.7 }, legR: { swing: 0.5, spread: 0.06, knee: 1.6, ankle: 0.3 } });
    return keys(u, [[0, STAND], [0.18, low], [0.82, low], [1, STAND]]);
  }
}));

reg(def({
  id: 'staff.sweep', group: 'staff', roles: STAFF, loop: true, travel: false, base: 1.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: { R: 'broom' }, ends: { R: 'broom' }, events: [],
  next: ['staff.sweep', 'staff.idle', 'staff.wipeFloor'],
  pose: function (u) {
    const s = Math.sin(u * TAU);
    return withYaw(P(STAND, { torso: { pitch: 0.28 }, head: { pitch: 0.35 }, armR: A(0.55, 0.05, 0.4), armL: A(0.75, 0.08, 0.7), legL: LEG_FRONT, legR: LEG_BACK }), 0.3 * s, 0.1 * s);
  },
  tilt: function (u) { return { R: { roll: 0.35 * Math.sin(u * TAU) } }; }
}));

reg(def({
  id: 'staff.wipeFloor', group: 'staff', roles: STAFF, loop: true, travel: false, base: 2,
  from: 'stand', to: 'stand', needs: 'floor', holds: { R: 'napkin' }, ends: { R: 'napkin' }, events: [],
  next: ['staff.wipeFloor', 'staff.idle', 'staff.walk'],
  pose: function (u) {
    const s = Math.sin(u * TAU * 2);
    return P(CROUCH, { hipDrop: 0.4, torso: { pitch: 0.75 }, head: { pitch: 0.2 }, armR: A(0.8 + 0.15 * s, 0.15 + 0.1 * s, 0.2), armL: A(0.5, 0.2, 1.2), legL: { swing: 1.2, spread: 0.06, knee: 1.9, ankle: 0.7 }, legR: { swing: 0.5, spread: 0.08, knee: 1.6, ankle: 0.3 } });
  }
}));

reg(def({
  id: 'staff.push', group: 'staff', roles: STAFF, loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'wheelchair' }, ends: { R: 'wheelchair' }, events: [],
  next: ['staff.push', 'staff.kneelTalk', 'staff.idle'],
  pose: function (u, c) {
    return walking(P(STAND, { torso: { pitch: 0.12 }, head: { pitch: 0.12 }, armL: A(0.55, 0.05, 0.55), armR: A(0.55, 0.05, 0.55) }), c.phase ?? u, (c.stride ?? 1) * 0.75, 'none');
  }
}));

reg(def({
  id: 'staff.escort', group: 'staff', roles: STAFF, loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.escort', 'host.point', 'staff.idle', 'staff.holdDoor'],
  pose: function (u, c) {
    return withYaw(walking(P(STAND, { armR: A(0.5, 0.45, 0.7) }), c.phase ?? u, (c.stride ?? 1) * 0.8, 'L'), 0.12, 0.35);
  }
}));

reg(def({
  id: 'staff.decline', group: 'staff', roles: STAFF, loop: false, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.listen', 'staff.idle', 'staff.escort', 'staff.walk'],
  pose: function (u) {
    const k = win(u, 0.1, 0.95, 0.2), shake = 0.25 * Math.sin(u * TAU * 2.5) * k;
    return P(STAND, { torso: { pitch: 0.08 * k }, head: { pitch: 0.1 * k, yaw: shake }, armL: A(0.6 * k, 0.25 * k, 1.1), armR: A(0.6 * k, 0.25 * k, 1.1) });
  }
}));

reg(def({
  id: 'staff.write', group: 'staff', roles: STAFF, loop: true, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'floor', holds: { L: 'pad' }, ends: { L: 'pad' }, events: [],
  next: ['staff.write', 'staff.listen', 'staff.idle', 'staff.walk'],
  pose: function (u) {
    const w = 0.05 * Math.sin(u * TAU * 6);
    return P(STAND, { torso: { pitch: 0.12 }, head: { pitch: 0.5 }, armL: A(0.6, 0.08, 1.5), armR: A(0.62 + w, 0.1, 1.55) });
  }
}));

reg(def({
  id: 'staff.openFolder', group: 'staff', roles: STAFF, loop: false, travel: false, base: 2.8,
  from: 'stand', to: 'stand', needs: 'floor', holds: { R: 'licenceFolder' }, ends: { R: 'licenceFolder' },
  events: [{ u: 0.7, type: 'show', hand: 'R' }],
  next: ['staff.listen', 'staff.idle', 'staff.walk'],
  pose: function (u) {
    return keys(u, [[0, P(STAND, { armR: CHEST_ARM })], [0.35, P(STAND, { head: { pitch: 0.4 }, armR: CHEST_ARM, armL: A(0.7, 0.2, 1.2) })], [0.75, P(STAND, { torso: { pitch: 0.06 }, armR: A(0.9, 0.12, 0.7), armL: A(0.9, 0.12, 0.7) })], [1, P(STAND, { armR: A(0.9, 0.12, 0.7), armL: A(0.9, 0.12, 0.7) })]]);
  }
}));

reg(def({
  id: 'staff.holdDoor', group: 'staff', roles: STAFF, loop: true, travel: false, base: 4, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.holdDoor', 'staff.idle', 'staff.walk'],
  pose: function (_u, c) {
    return breathe(withYaw(P(STAND, { armR: A(0.4, 1.1, 0.2), torso: { roll: 0.04 } }), -0.35, -0.5 + (c.yaw ?? 0) * 0.4), c.t ?? 0);
  }
}));

reg(def({
  id: 'staff.smother', group: 'staff', roles: STAFF, loop: false, travel: false, base: 1.6,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'apron' }, ends: {},
  events: [{ u: 0.4, type: 'smother', hand: 'R', at: 'table' }, { u: 0.55, type: 'release', hand: 'R', at: 'table' }],
  next: ['staff.idle', 'staff.decline', 'staff.listen'],
  pose: function (u) {
    const press = P(LEAN_SERVE, { torso: { pitch: 0.62 }, armR: A(0.55, 0.05, 0.1), armL: A(0.55, 0.05, 0.1) });
    return keys(u, [[0, P(STAND, { armR: CHEST_ARM })], [0.35, press], [0.65, press], [1, STAND]]);
  },
  root: function (u) { return [0, 0.25 * win(u, 0.15, 0.95, 0.2), 0]; }
}));

reg(def({
  id: 'staff.checkId', group: 'staff', roles: STAFF, loop: false, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {},
  events: [{ u: 0.2, type: 'grab', hand: 'R', at: 'partner' }, { u: 0.85, type: 'give', hand: 'R', at: 'partner' }],
  next: ['staff.listen', 'staff.decline', 'staff.idle', 'bar.pour'],
  pose: function (u) {
    const read = P(STAND, { head: { pitch: 0.45 }, armR: CHEST_ARM, armL: A(0.5, 0.1, 1.3) });
    const look = P(STAND, { head: { pitch: -0.02 }, armR: CHEST_ARM });
    return keys(u, [[0, STAND], [0.2, P(STAND, { armR: A(0.9, 0.1, 0.4) })], [0.35, read], [0.55, read], [0.65, look], [0.75, read], [0.85, P(STAND, { armR: A(0.9, 0.1, 0.4) })], [1, STAND]]);
  }
}));

// ----- servitören och baren -----

reg(def({
  id: 'waiter.lightCandles', group: 'waiter', roles: ['waiter', 'staff'], loop: false, travel: false, base: 3, handed: true,
  from: 'stand', to: 'stand', needs: 'pass', holds: { R: 'lighter' }, ends: { R: 'lighter' },
  events: [{ u: 0.35, type: 'light', hand: 'R' }, { u: 0.5, type: 'light', hand: 'R' }, { u: 0.65, type: 'light', hand: 'R' }],
  next: ['bar.setDown', 'waiter.pickUp'],
  pose: function (u) {
    const k = win(u, 0.15, 0.9, 0.15), dab = 0.08 * Math.sin(u * TAU * 3);
    return P(STAND, { torso: { pitch: 0.3 * k }, head: { pitch: 0.4 * k }, armR: A(0.55 + 0.25 * k + dab * k, 0.1, 0.8 - 0.4 * k), armL: A(0.1, 0.06, 0.3) });
  }
}));

reg(def({
  id: 'waiter.carryCake', group: 'waiter', roles: ['waiter', 'staff'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'cake' }, ends: { R: 'cake' }, events: [],
  next: ['waiter.carryCake', 'waiter.serve', 'waiter.trayWobble', 'staff.dodge'],
  pose: function (u, c) {
    const s = c.stress ?? 0;
    // Lugnt: upprätt, blicken på ljusen, korta steg. Stressat: bålen fram, armarna ut, blicken framåt.
    return walking(P(STAND, { torso: { pitch: -0.02 + 0.12 * s }, head: { pitch: 0.25 - 0.2 * s }, armL: A(0.45 + 0.1 * s, 0.1, 1.2), armR: A(0.45 + 0.1 * s, 0.1, 1.2) }), c.phase ?? u, (c.stride ?? 1) * (0.7 + 0.35 * s), 'none');
  },
  tilt: function (u, c) { const s = c.stress ?? 0; return { R: { roll: 0.05 * s * Math.sin(u * TAU * 2), pitch: 0.04 * s * Math.sin(u * TAU) } }; }
}));

reg(def({
  id: 'waiter.trayWobble', group: 'waiter', roles: ['waiter', 'bartender'], loop: false, travel: false, base: 1.4,
  from: 'walk', to: 'walk', needs: 'floor', holds: { L: 'tray' }, ends: { L: 'tray' }, events: [],
  next: ['waiter.carryTray', 'staff.walk'],
  pose: function (u) {
    const w = Math.sin(u * TAU * 2) * (1 - u), catchK = win(u, 0.15, 0.85, 0.15);
    return P(STAND, { lift: -0.02, torso: { pitch: 0.08, roll: 0.1 * w }, head: { pitch: 0.2, yaw: 0.2 * w }, armL: A(0.25, 0.3 + 0.1 * w, 2.0), armR: A(0.3 + 0.5 * catchK, 0.3 + 0.4 * catchK, 1.2), legL: LEG_FRONT, legR: LEG_BACK });
  },
  tilt: function (u) { const w = Math.sin(u * TAU * 2) * (1 - u); return { L: { roll: 0.22 * w, pitch: 0.1 * w } }; },
  root: function (u) { return [0, 0.15 * u, 0]; }
}));

reg(def({
  id: 'bar.leanIn', group: 'bartender', roles: ['bartender', 'sommelier', 'staff'], loop: true, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'bar', holds: {}, ends: {}, events: [],
  next: ['bar.leanIn', 'bar.pourWater', 'staff.decline', 'staff.idle'],
  pose: function (u, c) {
    const nod = 0.06 * Math.max(0, Math.sin(u * TAU * 2));
    return withYaw(P(STAND, { lift: -0.03, torso: { pitch: 0.42 }, head: { pitch: -0.1 + nod }, armL: A(0.95, 0.12, 1.1), armR: A(0.95, 0.12, 1.1), legL: LEG_FRONT, legR: LEG_BACK }), 0, (c.yaw ?? 0) * 0.5);
  }
}));

reg(def({
  id: 'bar.pourWater', group: 'bartender', roles: ['bartender', 'waiter', 'sommelier'], loop: false, travel: false, base: 2.2, handed: true,
  from: 'stand', to: 'stand', needs: 'bar', holds: { R: 'carafe' }, ends: { R: 'carafe' }, events: [],
  next: ['bar.setDown', 'bar.leanIn', 'staff.idle'],
  pose: function (u) {
    const k = win(u, 0.15, 0.9, 0.2);
    return P(STAND, { torso: { pitch: 0.16 * k }, head: { pitch: 0.35 * k }, armR: A(0.5 + 0.4 * k, 0.1 + 0.1 * k, 1.2 - 0.5 * k), armL: A(0.2, 0.06, 0.4) });
  },
  tilt: function (u) { return { R: { pitch: 1.2 * (ramp(u, 0.3, 0.45) - ramp(u, 0.7, 0.85)) } }; }
}));

// ===== vardagens koreografi (efter leverans 3) ========================
//
// Beställt 2026-10-01 efter provspelet: rörelserna kändes inte autentiska, och personalen
// stod still i början. Klippen nedan ger varje figur något att göra med ett syfte: mise en
// place före öppning, ritualerna som saknades (välkomna i dörren, bröd och vatten,
// fördrinken, duka upp ett bord, dekantera), personalens små stunder mellan uppgifterna
// och kön vid dörren med tålamod som syns. Samma kontrakt som resten av katalogen.

// ----- ritualerna -----

reg(def({
  id: 'host.greetDoor', group: 'host', roles: ['host', 'staff'], loop: false, travel: false, base: 3.2,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['host.takeMenus', 'host.point', 'staff.escort', 'staff.idle'],
  pose: function (u, c) {
    // Ett steg fram mot sällskapet, handen öppen, en kort bugning, sedan armen in mot rummet.
    const open = P(STAND, { torso: { pitch: 0.05 }, armR: A(0.7, 0.35, 0.35), armL: A(0.1, 0.06, 0.4) });
    const bow = P(open, { torso: { pitch: 0.3 }, head: { pitch: 0.28 }, armR: A(0.55, 0.3, 0.45) });
    const invite = withYaw(P(STAND, { armR: A(0.55, 1.0, 0.2), armL: A(0.1, 0.06, 0.4) }), 0.3, 0.2);
    return withYaw(keys(u, [[0, STAND], [0.22, open], [0.42, bow], [0.58, open], [0.82, invite], [1, P(STAND, { armR: A(0.25, 0.25, 0.4) })]]), 0, (c.yaw ?? 0) * 0.6 * (1 - ramp(u, 0.7, 0.85)));
  },
  root: function (u) { return [0, 0.3 * ramp(u, 0.04, 0.3), 0]; }
}));

reg(def({
  id: 'host.takeMenus', group: 'host', roles: ['host', 'staff'], loop: false, travel: false, base: 1.8,
  from: 'stand', to: 'stand', needs: 'desk', holds: {}, ends: { R: 'menu' },
  events: [{ u: 0.5, type: 'grab', hand: 'R', at: 'desk' }],
  next: ['host.point', 'staff.escort', 'host.presentMenu', 'staff.walk'],
  pose: function (u) {
    const reach = P(STAND, { torso: { pitch: 0.24 }, head: { pitch: 0.4 }, armR: A(0.8, 0.08, 0.35), legL: LEG_FRONT, legR: LEG_BACK });
    return keys(u, [[0, STAND], [0.42, reach], [0.56, P(reach, { armR: A(0.75, 0.08, 0.6) })], [1, P(STAND, { armR: CHEST_ARM })]]);
  }
}));

reg(def({
  id: 'host.presentMenu', group: 'host', roles: ['host', 'staff', 'waiter'], loop: false, travel: false, base: 2.2, handed: true,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'menu' }, ends: {},
  events: [{ u: 0.55, type: 'give', hand: 'R', at: 'partner' }],
  next: ['host.presentMenu', 'staff.idle', 'staff.walk'],
  pose: function (u, c) {
    const lean = P(STAND, { torso: { pitch: 0.3 }, head: { pitch: 0.2 }, armR: A(0.95, 0.1, 0.3), armL: A(0.15, 0.06, 0.6), legL: LEG_FRONT, legR: LEG_BACK });
    return withYaw(keys(u, [[0, P(STAND, { armR: CHEST_ARM })], [0.45, lean], [0.6, lean], [0.85, P(STAND, { torso: { pitch: 0.08 }, armR: A(0.25, 0.06, 0.4) })], [1, STAND]]), (c.yaw ?? 0) * 0.2, (c.yaw ?? 0) * 0.6);
  },
  root: function (u) { return [0, 0.18 * win(u, 0.15, 0.9, 0.2), 0]; }
}));

reg(def({
  id: 'host.checkBook', group: 'host', roles: ['host', 'staff'], loop: true, travel: false, base: 5,
  from: 'stand', to: 'stand', needs: 'desk', holds: {}, ends: {}, events: [],
  next: ['host.checkBook', 'host.greetDoor', 'staff.walk', 'staff.idle'],
  pose: function (u, c) {
    // Läser bokningarna på pulten och skriver, och tittar upp mot dörren en gång per varv.
    const w = 0.05 * Math.sin(u * TAU * 6), up = win(u, 0.6, 0.86, 0.06);
    const read = P(STAND, { torso: { pitch: 0.16 }, head: { pitch: 0.5 }, armL: A(0.7, 0.1, 0.6), armR: A(0.72 + w, 0.08, 0.7) });
    const look = P(STAND, { torso: { pitch: 0.05 }, head: { pitch: -0.02, yaw: (c.yaw ?? 0) * 0.8 }, armL: A(0.7, 0.1, 0.6), armR: A(0.6, 0.08, 0.6) });
    return breathe(blendPose(read, look, up), c.t ?? 0);
  }
}));

reg(def({
  id: 'waiter.setBread', group: 'waiter', roles: ['waiter', 'staff'], loop: false, travel: false, base: 2.2, handed: true,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'breadBasket' }, ends: {},
  events: [{ u: 0.55, type: 'release', hand: 'R', at: 'table' }],
  next: ['waiter.pourWater', 'staff.idle', 'staff.walk'],
  pose: function (u) {
    // Korgen mitt på bordet med båda händerna, och en liten knuff så att den står rätt.
    const set = P(LEAN_SERVE, { armL: A(0.4, 0.12, 0.25) });
    return keys(u, [[0, P(STAND, { armR: CARRY_ARM })], [0.45, set], [0.62, P(set, { armR: A(0.36, 0.08, 0.05) })], [0.82, SERVE_BACK], [1, STAND]]);
  },
  root: function (u) { return [0, 0.22 * win(u, 0.2, 0.92, 0.22), 0]; }
}));

reg(def({
  id: 'waiter.pourWater', group: 'waiter', roles: ['waiter', 'sommelier', 'staff'], loop: false, travel: false, base: 3.6, handed: true,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'carafe' }, ends: { R: 'carafe' }, events: [],
  next: ['waiter.pourWater', 'staff.idle', 'staff.walk'],
  pose: function (u) {
    // Två glas: vänster hand bakom ryggen, karaffen över glaset, bålen vrids mellan dem.
    const k = win(u, 0.08, 0.95, 0.12), side = 0.22 * (1 - 2 * ramp(u, 0.45, 0.55));
    return withYaw(P(STAND, { lift: -0.06 * k, torso: { pitch: 0.5 * k }, head: { pitch: 0.3 * k }, armR: A(0.45 + 0.05 * k, 0.12, 1.1 - 0.55 * k), armL: A(-0.25, 0.08, 1.2), legL: { ...LEG_FRONT, knee: 0.12 + 0.25 * k }, legR: { ...LEG_BACK, knee: 0.16 + 0.25 * k } }), side * k, side * k);
  },
  tilt: function (u) { return { R: { pitch: 1.1 * (win(u, 0.16, 0.42, 0.07) + win(u, 0.58, 0.84, 0.07)) } }; }
}));

reg(def({
  id: 'waiter.serveAperitif', group: 'waiter', roles: ['waiter', 'sommelier', 'staff'], loop: false, travel: false, base: 2.6,
  from: 'stand', to: 'stand', needs: 'table', holds: { L: 'tray' }, ends: { L: 'tray' },
  events: [{ u: 0.22, type: 'grab', hand: 'R', at: 'table' }, { u: 0.62, type: 'release', hand: 'R', at: 'table' }],
  next: ['waiter.serveAperitif', 'waiter.carryTray', 'staff.walk'],
  pose: function (u, c) {
    // Brickan kvar i axelhöjd. Höger hand tar glaset från brickan och ställer det till höger om gästen.
    const take = P(STAND, { torso: { yaw: 0.25 }, head: { pitch: 0.3 }, armL: TRAY_ARM, armR: A(0.95, -0.25, 1.45) });
    // Loungebordet är lågt (0,45 m): knäna böjs och bålen går långt fram, brickan hålls kvar.
    const place = P(STAND, { lift: -0.1, torso: { pitch: 0.62 }, head: { pitch: 0.25 }, armL: A(0.55, 0.3, 1.75), armR: A(0.2, 0.08, 0.05), legL: { ...LEG_FRONT, knee: 0.5, ankle: 0.28 }, legR: { ...LEG_BACK, knee: 0.5 } });
    return withYaw(keys(u, [[0, P(STAND, { armL: TRAY_ARM, armR: A(0.2, 0.1, 0.5) })], [0.22, take], [0.58, place], [0.68, place], [1, P(STAND, { armL: TRAY_ARM, armR: A(0.2, 0.1, 0.5) })]]), 0, (c.yaw ?? 0) * 0.5 * win(u, 0.5, 1, 0.15));
  },
  root: function (u) { return [0, 0.16 * win(u, 0.3, 0.95, 0.2), 0]; }
}));

reg(def({
  id: 'waiter.setTable', group: 'waiter', roles: ['waiter', 'staff'], loop: false, travel: false, base: 4.2,
  from: 'stand', to: 'stand', needs: 'table', holds: { L: 'any' }, ends: { L: 'any' },
  events: [{ u: 0.3, type: 'release', hand: 'R', at: 'table' }, { u: 0.55, type: 'release', hand: 'R', at: 'table' }, { u: 0.8, type: 'release', hand: 'R', at: 'table' }],
  next: ['waiter.setTable', 'staff.checkTable', 'staff.walk'],
  pose: function (u) {
    // Ett kuvert: gaffeln till vänster, kniven till höger, glaset snett ovanför kniven. Höger hand
    // hämtar ur stapeln i vänster hand varje gång.
    const L = A(0.55, 0.05, 1.3);
    const pick = P(STAND, { torso: { pitch: 0.18 }, head: { pitch: 0.45 }, armL: L, armR: A(0.7, -0.12, 1.4) });
    const lay = function (yaw: number, reach: number) { return withYaw(P(STAND, { lift: -0.03, torso: { pitch: 0.5 }, head: { pitch: 0.35 }, armL: L, armR: A(reach - 0.45, 0.1, 0.1), legL: { ...LEG_FRONT, knee: 0.25, ankle: 0.14 }, legR: { ...LEG_BACK, knee: 0.25 } }), yaw, yaw * 0.5); };
    return keys(u, [[0, P(STAND, { armL: L })], [0.15, pick], [0.3, lay(0.25, 0.8)], [0.42, pick], [0.55, lay(-0.25, 0.8)], [0.67, pick], [0.8, lay(-0.1, 0.95)], [1, P(STAND, { torso: { pitch: 0.06 }, armL: L })]]);
  },
  root: function (u) { return [0, 0.12 * win(u, 0.1, 0.95, 0.1), 0]; }
}));

reg(def({
  id: 'somm.decant', group: 'sommelier', roles: ['sommelier'], loop: false, travel: false, base: 6,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'wineBottle', L: 'decanter' }, ends: { R: 'wineBottle', L: 'decanter' }, events: [],
  next: ['somm.pour', 'staff.walk', 'bar.setDown'],
  pose: function (u) {
    // Långsamt: flaskan högt, karaffen lågt och snett, blicken på flaskans hals över ljuset.
    const k = win(u, 0.05, 0.97, 0.1);
    return P(STAND, { torso: { pitch: 0.12 + 0.08 * k }, head: { pitch: 0.4 + 0.1 * k }, armL: A(0.55 + 0.15 * k, 0.05, 1.0), armR: A(0.6 + 0.2 * k, 0.22, 1.0 - 0.2 * k) });
  },
  tilt: function (u) { return { R: { pitch: 1.6 * (ramp(u, 0.1, 0.85) - ramp(u, 0.88, 0.98)) }, L: { roll: 0.35 * win(u, 0.1, 0.92, 0.1) } }; }
}));

// ----- mise en place -----

reg(def({
  id: 'bar.polishGlass', group: 'bartender', roles: ['bartender', 'sommelier', 'staff'], loop: true, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'bar', holds: { L: 'wineGlass', R: 'napkin' }, ends: { L: 'wineGlass', R: 'napkin' }, events: [],
  next: ['bar.polishGlass', 'bar.setDown', 'staff.idle'],
  pose: function (u, c) {
    // Duken vrids i kupan; en gång per varv lyfts glaset mot ljuset och granskas.
    const up = win(u, 0.55, 0.85, 0.08), tw = 0.06 * Math.sin(u * TAU * 4) * (1 - up);
    return breathe(P(STAND, { torso: { pitch: 0.1 - 0.06 * up }, head: { pitch: 0.4 - 0.55 * up }, armL: A(0.6 + 0.45 * up, 0.08, 1.4 - 0.2 * up), armR: A(0.62 + tw + 0.35 * up, 0.12, 1.45 - 0.15 * up) }), c.t ?? 0);
  },
  tilt: function (u) { const up = win(u, 0.55, 0.85, 0.08); return { L: { roll: 0.3 * Math.sin(u * TAU * 2) * (1 - up), pitch: -0.3 * up } }; }
}));

reg(def({
  id: 'bar.stockFridge', group: 'bartender', roles: ['bartender', 'sommelier', 'staff'], loop: true, travel: false, base: 2.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['bar.stockFridge', 'staff.idle', 'staff.walk'],
  pose: function (u) {
    // En flaska ur backen på golvet till höger, upp på hyllan i kylen framför. Djup bugning
    // mot backen, rak rygg och armen fram mot hyllan.
    const low = P(STAND, { lift: -0.06, torso: { pitch: 0.85 }, head: { pitch: 0.2 }, armR: A(1.1, 0.25, 0.2), armL: A(0.4, 0.1, 0.5), legL: { ...LEG_FRONT, knee: 0.45, ankle: 0.25 }, legR: { ...LEG_BACK, knee: 0.4 } });
    const shelf = P(STAND, { torso: { pitch: 0.12 }, head: { pitch: 0.1 }, armR: A(1.25, 0.1, 0.35), armL: A(0.9, 0.1, 0.6), legL: LEG_FRONT, legR: LEG_BACK });
    const p = keys(u, [[0, shelf], [0.2, withYaw(low, -0.55, -0.3)], [0.42, withYaw(low, -0.55, -0.3)], [0.7, shelf], [0.85, P(shelf, { armR: A(1.15, 0.1, 0.5) })], [1, shelf]]);
    return p;
  }
}));

reg(def({
  id: 'staff.carryCrate', group: 'staff', roles: STAFF, loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'crate' }, ends: { R: 'crate' }, events: [],
  next: ['staff.carryCrate', 'bar.stockFridge', 'staff.idle'],
  pose: function (u, c) {
    // Tyngden framför magen: bålen lite bakåt, korta steg.
    return walking(P(STAND, { torso: { pitch: -0.07 }, head: { pitch: 0.12 }, armL: A(0.42, 0.14, 0.95), armR: A(0.42, 0.14, 0.95) }), c.phase ?? u, (c.stride ?? 1) * 0.8, 'none');
  }
}));

reg(def({
  id: 'staff.writeBoard', group: 'staff', roles: STAFF, loop: true, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.writeBoard', 'staff.idle', 'staff.walk'],
  pose: function (u, c) {
    // Kritan i axelhöjd, små rörelser åt höger; i slutet av varvet ett halvt steg tillbaka för att se.
    const back = win(u, 0.78, 0.98, 0.06), w = Math.sin(u * TAU * 5) * (1 - back);
    return breathe(P(STAND, { torso: { pitch: 0.04 - 0.08 * back }, head: { pitch: -0.08 + 0.1 * back, yaw: 0.12 * w }, armR: A(1.2 - 0.8 * back + 0.06 * w, 0.18 + 0.05 * u, 1.0 + 0.12 * w), armL: A(0.15, 0.08, 0.5) }), c.t ?? 0);
  }
}));

// ----- personalens små stunder -----

reg(def({
  id: 'staff.chat', group: 'staff', roles: STAFF, loop: true, travel: false, base: 5,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.chat', 'staff.idle', 'staff.walk'],
  pose: function (u, c) {
    // Pratar (0–0,4), lyssnar och nickar (0,4–0,7), skrattar till (0,72–0,86).
    const talk = win(u, 0, 0.4, 0.06), nod = 0.08 * Math.max(0, Math.sin(u * TAU * 4)) * win(u, 0.4, 0.7, 0.05), laugh = win(u, 0.72, 0.86, 0.04);
    const g = Math.sin(u * TAU * 3);
    return breathe(withYaw(P(STAND, {
      torso: { pitch: 0.04 - 0.08 * laugh, roll: 0.03 * Math.sin(u * TAU) }, head: { pitch: 0.06 + nod - 0.2 * laugh },
      armR: A(0.3 + talk * (0.35 + 0.15 * g), 0.12, 0.6 + talk * 0.6), armL: A(0.2 + 0.2 * laugh, 0.08, 0.5 + 0.6 * laugh),
      legL: { knee: 0.06 }, legR: { knee: 0.16 }
    }), (c.yaw ?? 0) * 0.3, (c.yaw ?? 0) * 0.7), c.t ?? 0);
  }
}));

reg(def({
  id: 'staff.checkTable', group: 'staff', roles: STAFF, loop: false, travel: false, base: 3,
  from: 'stand', to: 'stand', needs: 'table', holds: {}, ends: {}, events: [],
  next: ['staff.walk', 'staff.idle', 'staff.checkTable'],
  pose: function (u) {
    // Rättar ett glas, siktar längs bordet, nickar.
    const fix = P(STAND, { lift: -0.03, torso: { pitch: 0.5 }, head: { pitch: 0.35 }, armR: A(0.4 + 0.04 * Math.sin(u * TAU * 6), 0.1, 0.15), armL: A(0.3, 0.08, 0.5), legL: { ...LEG_FRONT, knee: 0.25, ankle: 0.14 }, legR: { ...LEG_BACK, knee: 0.25 } });
    const sight = withYaw(P(STAND, { torso: { pitch: 0.18 }, head: { pitch: 0.3 }, armL: A(0.1, 0.06, 0.3) }), 0.15, 0.55);
    return keys(u, [[0, STAND], [0.2, fix], [0.5, fix], [0.68, sight], [0.82, P(STAND, { head: { pitch: 0.2 } })], [1, STAND]]);
  },
  root: function (u) { return [0, 0.15 * win(u, 0.1, 0.9, 0.15), 0]; }
}));

reg(def({
  id: 'staff.wipeTable', group: 'staff', roles: STAFF, loop: true, travel: false, base: 2,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'napkin' }, ends: { R: 'napkin' }, events: [],
  next: ['staff.wipeTable', 'staff.checkTable', 'staff.walk'],
  pose: function (u) {
    const w = u * TAU * 2;
    return P(STAND, { lift: -0.05, torso: { pitch: 0.6, yaw: 0.08 * Math.sin(w) }, head: { pitch: 0.3 }, armR: A(0.35 + 0.12 * Math.sin(w), 0.12 + 0.12 * Math.cos(w), 0.15), armL: A(0.3, 0.15, 0.2), legL: { ...LEG_FRONT, knee: 0.35, ankle: 0.2 }, legR: { ...LEG_BACK, knee: 0.35 } });
  }
}));

// ----- kön och sällskapen -----

reg(def({
  id: 'guest.queueCalm', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.queueCalm', 'guest.queueImpatient', 'guest.walk'],
  pose: function (u, c) {
    // Lugn: händerna knäppta, pratar med sällskapet, en blick mot dörren ibland.
    const glance = win(u, 0.6, 0.75, 0.05), g = Math.sin(u * TAU * 2);
    return breathe(withYaw(P(STAND, { torso: { roll: 0.03 * g }, head: { pitch: 0.04 }, armL: A(0.25, 0.02, 0.9), armR: A(0.25 + 0.15 * win(u, 0.1, 0.35, 0.05), 0.02, 0.9), legL: { knee: 0.06 + 0.06 * Math.max(0, g) }, legR: { knee: 0.06 + 0.06 * Math.max(0, -g) } }), (c.yaw ?? 0) * 0.2 * (1 - glance), (c.yaw ?? 0) * 0.7 * (1 - glance)), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.queueImpatient', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.queueImpatient', 'guest.queueCalm', 'guest.queueLeaving', 'guest.walk'],
  pose: function (u, c) {
    // Otålig: armarna i kors och foten som slår, en blick på klockan, på tå för att se in.
    const cross = 1 - win(u, 0.28, 0.52, 0.05), watch = win(u, 0.3, 0.5, 0.05), crane = win(u, 0.56, 0.82, 0.06);
    const tap = 0.18 * Math.max(0, Math.sin(u * TAU * 6)) * (1 - crane);
    const armX = A(0.32, -0.28, 1.9);
    return withYaw(P(STAND, {
      lift: 0.04 * crane, torso: { pitch: 0.02 - 0.05 * crane, roll: 0.04 * Math.sin(u * TAU) }, head: { pitch: 0.04 + 0.42 * watch - 0.12 * crane },
      armL: blendArm(armX, A(0.62, 0.0, 1.95), watch), armR: blendArm(A(0.1, 0.06, 0.3), armX, cross),
      legL: { knee: 0.04, ankle: 0.04 + 0.25 * crane }, legR: { knee: 0.06 + tap, ankle: 0.04 + 0.25 * crane }
    }), (c.yaw ?? 0) * 0.15 * crane, (c.yaw ?? 0) * 0.6 * crane);
  }
}));

reg(def({
  id: 'guest.queueLeaving', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.2,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u) {
    // På väg att gå: klockan, en huvudskakning, och sedan vänder hen sig bort från dörren.
    const watch = win(u, 0.02, 0.25, 0.05), shake = 0.3 * Math.sin(u * TAU * 4) * win(u, 0.28, 0.5, 0.04);
    return P(STAND, { torso: { pitch: 0.04 }, head: { pitch: 0.4 * watch, yaw: shake }, armL: A(0.15 + 0.65 * watch, 0.1, 0.3 + 1.4 * watch), armR: A(0.1, 0.06, 0.3) });
  },
  root: function (u, c) { const side = c.side ?? 1; return [0, 0.25 * ramp(u, 0.65, 1), side * 2.4 * ramp(u, 0.5, 0.95)]; }
}));

reg(def({
  id: 'guest.hangCoat', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk', 'guest.queueCalm'],
  pose: function (u) {
    const shrug = P(STAND, { torso: { pitch: 0.05 }, armL: A(-0.5, 0.2, 0.4), armR: A(-0.4, 0.22, 0.5) });
    const up = P(STAND, { lift: 0.02, head: { pitch: -0.35 }, armR: A(1.9, 0.15, 0.4), armL: A(1.7, 0.1, 0.6) });
    return keys(u, [[0, STAND], [0.16, shrug], [0.32, P(STAND, { armL: A(0.5, 0.1, 1.2), armR: A(0.5, 0.1, 1.2) })], [0.52, up], [0.7, P(up, { armL: A(1.6, 0.1, 0.8) })], [1, STAND]]);
  }
}));

reg(def({
  id: 'guest.takeCoat', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.8,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u) {
    const up = P(STAND, { lift: 0.02, head: { pitch: -0.35 }, armR: A(1.9, 0.15, 0.4), armL: A(1.7, 0.1, 0.6) });
    const sleeves = P(STAND, { torso: { pitch: 0.06 }, armL: A(-0.6, 0.3, 0.3), armR: A(-0.55, 0.3, 0.35) });
    return keys(u, [[0, STAND], [0.25, up], [0.42, P(STAND, { armL: A(0.5, 0.1, 1.3), armR: A(0.5, 0.1, 1.3) })], [0.62, sleeves], [0.8, P(STAND, { lift: 0.015, torso: { pitch: -0.04 }, armL: A(0.4, 0.05, 1.4), armR: A(0.4, 0.05, 1.4) })], [1, STAND]]);
  }
}));

// ----- stämningen (leverans 2026-10-03) -----
// Åtta gester för gästens stämning, sittande på stol, barstol och lounge (reseat). Tempot är styrkan:
// c.stress 0 (lugn) ger en antydan, 1 (stressad) en gest som läses från 24 m. Stämningen läses på armarna,
// höjden och bålens lutning. Ansiktet (figureFace.ts) syns först när kameran är närmare än 9 m.

const ARMS_X: PoseArm = A(0.32, -0.28, 1.9);
function moodK(c: ClipCtx): number { return 0.75 + 0.5 * (c.stress ?? 0.3); }

reg(def({
  id: 'guest.leanCurious', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.2, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.nodApprove', 'guest.laugh', 'guest.seatedIdle', 'guest.lean'],
  pose: function (u, c) {
    // Lutar sig fram mot det som händer, underarmarna mot knäna, huvudet upp och lite på sned.
    const k = moodK(c), lean = win(u, 0.1, 0.88, 0.2), tip = bell(u, 0.52, 0.14);
    const b = base(c, true);
    return breathe(withYaw(P(b, {
      torso: { pitch: 0.06 + 0.34 * k * lean },
      head: { pitch: 0.06 - 0.24 * lean },
      armL: blendArm(A(0.78, 0.1, 0.95), A(0.95, 0.16, 1.7), lean), armR: blendArm(A(0.78, 0.1, 0.95), A(0.95, 0.12, 1.7), lean)
    }), (c.yaw ?? 0) * 0.35 * lean, (c.yaw ?? 0) * 0.8 * lean + 0.14 * tip), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.laugh', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.4, mood: 'delighted',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.gesture', 'guest.cheers', 'guest.lean'],
  pose: function (u, c) {
    // Huvudet bakåt, axlarna som studsar, en hand mot bröstet. Sedan framåt, nästan dubbelvikt, och tillbaka.
    const k = moodK(c), a = win(u, 0.05, 0.92, 0.12), back = a * (1 - ramp(u, 0.5, 0.62)), fold = bell(u, 0.66, 0.11);
    const ha = Math.sin(u * TAU * 5) * a;
    const b = base(c, true);
    return withYaw(P(b, {
      lift: 0.012 * k * ha,
      torso: { pitch: 0.06 - 0.2 * k * back + 0.3 * k * fold + 0.03 * ha },
      head: { pitch: 0.06 - 0.42 * k * back + 0.18 * fold },
      armR: A(0.78 + 0.45 * a, 0.1, 0.95 + 1.0 * a),
      armL: A(0.78 + 0.25 * fold, 0.1 + 0.2 * fold, 0.95 - 0.3 * fold)
    }), (c.yaw ?? 0) * 0.3, (c.yaw ?? 0) * 0.7 * (1 - back));
  }
}));

reg(def({
  id: 'guest.cheers', group: 'guest', roles: ['guest'], loop: false, travel: false, handed: true, base: 3.4, mood: 'delighted',
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.1, type: 'grab', hand: 'R', at: 'table' }, { u: 0.48, type: 'clink' }, { u: 0.9, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.seatedIdle', 'guest.laugh', 'guest.gesture'],
  pose: function (u, c) {
    // Skålen med hela bordet: glaset över huvudhöjd, mot bordets mitt, och ingen klunk. guest.toast är skålen och klunken.
    const k = moodK(c), b = base(c, true), hi = 1.9 + 0.45 * (k - 0.75) * 2;
    const jig = 0.05 * Math.sin(u * TAU * 6) * win(u, 0.4, 0.62, 0.04);
    const up = P(b, { torso: { pitch: 0.16 }, head: { pitch: -0.3 }, armR: A(hi, 0.14 + jig, 0.35), armL: A(0.9, 0.18, 1.0) });
    const toward = (c.yaw ?? 0) * win(u, 0.15, 0.8, 0.12);
    return withYaw(keys(u, [
      [0, b],
      [0.14, P(b, { armR: A(0.85, 0.1, 0.9) })],
      [0.38, up], [0.6, up],
      [0.74, P(b, { torso: { pitch: 0.08 }, armR: A(1.3, 0.1, 0.8) })],
      [0.88, P(b, { armR: A(0.8, 0.1, 0.92) })],
      [1, b]
    ]), toward * 0.4, toward * 0.6);
  }
}));

reg(def({
  id: 'guest.nodApprove', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.leanCurious', 'guest.gesture', 'guest.cheers'],
  pose: function (u, c) {
    // Två långsamma nickar mot den som gjorde något, med handflatan öppen åt hen.
    const k = moodK(c), nod = 0.3 * k * (bell(u, 0.3, 0.075) + bell(u, 0.56, 0.075)), palm = win(u, 0.14, 0.82, 0.14);
    const b = base(c, true);
    return breathe(withYaw(P(b, {
      torso: { pitch: 0.06 + 0.06 * palm }, head: { pitch: 0.04 + nod },
      armR: A(0.78 + 0.18 * palm, 0.1 + 0.26 * palm, 0.95 - 0.3 * palm)
    }), (c.yaw ?? 0) * 0.3 * palm, (c.yaw ?? 0) * 0.85), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.armsCrossed', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 4, mood: 'displeased',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.armsCrossed', 'guest.checkWatch', 'guest.waveWaiter', 'guest.seatedIdle', 'guest.pushPlate'],
  pose: function (u, c) {
    // Armarna i kors, bålen tillbaka från bordet och blicken bort från det som stör. En suck per varv.
    const k = moodK(c), sigh = bell(u, 0.62, 0.08), s = Math.sin(u * TAU);
    const b = base(c, true);
    return withYaw(P(b, {
      lift: 0.01 * sigh,
      torso: { pitch: 0.02 - 0.12 * k + 0.03 * s, roll: 0.04 * s },
      head: { pitch: 0.1 + 0.08 * sigh },
      armL: ARMS_X, armR: ARMS_X
    }), -(c.yaw ?? 0) * 0.1, -(c.yaw ?? 0) * 0.45 * k);
  }
}));

reg(def({
  id: 'guest.checkWatch', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, mood: 'waiting',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.armsCrossed', 'guest.waveWaiter', 'guest.checkWatch'],
  pose: function (u, c) {
    // Vänster handled upp, blicken ned på klockan och sedan ut i rummet efter personalen.
    const k = moodK(c), watch = win(u, 0.1, 0.62, 0.12), look = win(u, 0.6, 0.96, 0.1);
    const b = base(c, true);
    return withYaw(P(b, {
      lift: 0.008 * k * look,
      torso: { pitch: 0.06 + 0.06 * watch },
      head: { pitch: 0.06 + 0.44 * watch - 0.06 * look },
      armL: blendArm(A(0.78, 0.1, 0.95), A(0.62, 0.0, 1.95), watch)
    }), (c.yaw ?? 0) * 0.3 * look * k, (c.yaw ?? 0) * 0.9 * look);
  }
}));

reg(def({
  id: 'guest.waveWaiter', group: 'guest', roles: ['guest'], loop: false, travel: false, handed: true, base: 2.8, mood: 'impatient',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.armsCrossed', 'guest.pay', 'guest.waveWaiter'],
  pose: function (u, c) {
    // Inte guest.waveStaff (fingret upp, vi vill beställa): armen rakt upp, halvvägs upp från sitsen, stora svep.
    const k = moodK(c), up = win(u, 0.08, 0.9, 0.1), wv = Math.sin(u * TAU * 5) * win(u, 0.2, 0.8, 0.06);
    const b = base(c, true);
    return withYaw(P(b, {
      lift: 0.05 * k * up,
      torso: { pitch: 0.02 - 0.04 * up, roll: -0.1 * k * up },
      head: { pitch: 0.02 - 0.12 * up },
      armR: A(0.78 + (1.6 + 0.5 * (k - 0.75) * 2) * up, 0.1 + 0.14 * up + 0.24 * k * wv, 0.95 - 0.7 * up),
      armL: A(0.78 + 0.1 * up, 0.12 + 0.06 * up, 0.95 - 0.4 * up)
    }), (c.yaw ?? 0) * 0.35 * up, (c.yaw ?? 0) * 0.9 * up);
  }
}));

reg(def({
  id: 'guest.pushPlate', group: 'guest', roles: ['guest'], loop: false, travel: false, handed: true, base: 3, mood: 'displeased',
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.22, type: 'grab', hand: 'R', at: 'table' }, { u: 0.5, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.armsCrossed', 'guest.seatedIdle', 'guest.waveWaiter'],
  pose: function (u, c) {
    // Handen på tallrikens kant, en raksträckt arm som skjuter den ifrån sig, och sedan armarna i kors.
    const k = moodK(c), b = base(c, true);
    const crossed = P(b, { torso: { pitch: -0.1 * k }, head: { pitch: 0.12 }, armL: ARMS_X, armR: ARMS_X });
    return keys(u, [
      [0, b],
      [0.2, P(b, { torso: { pitch: 0.16 }, head: { pitch: 0.3 }, armR: A(0.78, 0.08, 1.0) })],
      [0.48, P(b, { torso: { pitch: 0.12 + 0.1 * k }, head: { pitch: 0.2 }, armR: A(1.12, 0.08, 0.28) })],
      [0.62, P(b, { torso: { pitch: 0.0 }, armR: A(0.9, 0.1, 0.8) })],
      [0.8, crossed], [1, crossed]
    ]);
  }
}));

// ----- D5 följderna och konceptet (2026-10-04) -----
// Vagnarna (equipment.ts) är inte handrekvisita: vagnen följer figurens rot, handtaget 0,92 m och 0,34 m framför den.
// Händerna ligger på handtaget i trolley.push. Flamberingen och ostvagnen står vid bordets kortsida mot stråket.

const ON_HANDLE: PoseArm = A(0.62, 0.1, 0.62);

reg(def({
  id: 'trolley.push', group: 'waiter', roles: ['waiter', 'host', 'sommelier', 'staff'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['trolley.push', 'trolley.present', 'cheese.cut', 'flambe.pour', 'staff.idle'],
  pose: function (u, c) {
    // Båda händerna på handtaget, bålen lite fram, kortare steg än vanlig gång (vagnen bromsar).
    return walking(P(STAND, { torso: { pitch: 0.14 }, head: { pitch: 0.12 }, armL: ON_HANDLE, armR: ON_HANDLE }), c.phase ?? u, (c.stride ?? 1) * 0.7, 'none');
  }
}));

reg(def({
  id: 'trolley.present', group: 'waiter', roles: ['waiter', 'host', 'sommelier', 'staff'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'stand', to: 'stand', needs: 'table', holds: {}, ends: {}, events: [],
  next: ['cheese.cut', 'flambe.pour', 'trolley.push', 'staff.idle'],
  pose: function (u) {
    // Vänster hand kvar på handtaget. Höger hand öppnas och sveper över vagnen mot gästerna, en kort bugning.
    const open = win(u, 0.12, 0.88, 0.18), bow = win(u, 0.35, 0.7, 0.12);
    return withYaw(P(STAND, { torso: { pitch: 0.06 + 0.16 * bow }, head: { pitch: 0.1 + 0.1 * bow }, armL: ON_HANDLE, armR: A(0.35 + 0.5 * open, 0.12 + 0.4 * open, 0.5 - 0.25 * open) }), 0.25 * open, 0.35 * open);
  }
}));

reg(def({
  id: 'cheese.cut', group: 'waiter', roles: ['waiter', 'host', 'sommelier', 'staff'], loop: false, travel: false, base: 3.6,
  from: 'stand', to: 'stand', needs: 'table', holds: {}, ends: {}, events: [{ u: 0.4, type: 'cut' }, { u: 0.7, type: 'cut' }],
  next: ['trolley.present', 'trolley.push', 'staff.idle'],
  pose: function (u) {
    // Lutad över brädan: vänster hand håller osten, höger skär två gånger med långa drag, sedan en bit upp på kniven.
    const lean = win(u, 0.05, 0.92, 0.12), saw = Math.sin(u * TAU * 4) * win(u, 0.2, 0.8, 0.08), lift = win(u, 0.8, 0.98, 0.06);
    return P(STAND, { lift: -0.02 * lean, torso: { pitch: 0.06 + 0.32 * lean }, head: { pitch: 0.2 + 0.35 * lean }, armL: A(0.7, 0.18, 0.95), armR: A(0.6 + 0.12 * saw + 0.25 * lift, 0.14, 0.8 - 0.1 * saw), legL: LEG_FRONT, legR: LEG_BACK });
  }
}));

reg(def({
  id: 'flambe.pour', group: 'waiter', roles: ['host', 'waiter', 'sommelier', 'staff'], loop: false, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'table', holds: {}, ends: {}, events: [{ u: 0.82, type: 'light' }],
  next: ['flambe.tilt'],
  pose: function (u) {
    // Vänster hand på pannans skaft över réchauden. Höger tar flaskan från vagnen och häller en skvätt, låg, nära pannan.
    const reach = win(u, 0.0, 0.85, 0.15), pour = win(u, 0.42, 0.78, 0.1);
    return P(STAND, { torso: { pitch: 0.16 + 0.08 * reach }, head: { pitch: 0.3 + 0.15 * pour }, armL: A(0.68, 0.14, 0.72), armR: A(0.55 + 0.25 * reach, 0.16 + 0.1 * pour, 1.05 - 0.2 * reach), legL: LEG_FRONT, legR: LEG_BACK });
  },
  tilt: function (u) { return { R: { pitch: 1.4 * win(u, 0.42, 0.78, 0.1) } }; }
}));

reg(def({
  id: 'flambe.tilt', group: 'waiter', roles: ['host', 'waiter', 'sommelier', 'staff'], loop: false, travel: false, base: 3.4,
  from: 'stand', to: 'stand', needs: 'table', holds: {}, ends: {}, events: [{ u: 0.06, type: 'light' }],
  next: ['trolley.present', 'staff.idle', 'trolley.push'],
  pose: function (u) {
    // Pannan lutas mot lågan och den tar sig (u 0,06). Bålen drar sig lugnt bakåt ett ögonblick, inte ett ryck,
    // sedan två mjuka varv med pannan medan lågan sjunker. Höger hand öppen mot gästerna på slutet.
    const back = win(u, 0.05, 0.3, 0.1), swirl = Math.sin(u * TAU * 2) * win(u, 0.3, 0.8, 0.1), show = win(u, 0.78, 1, 0.12);
    return withYaw(P(STAND, { torso: { pitch: 0.16 - 0.14 * back }, head: { pitch: 0.3 - 0.2 * back }, armL: A(0.68 + 0.06 * swirl, 0.14 + 0.05 * swirl, 0.72), armR: A(0.2 + 0.45 * show, 0.1 + 0.35 * show, 0.5), legL: LEG_FRONT, legR: LEG_BACK }), 0.2 * show, 0.3 * show);
  }
}));

reg(def({
  id: 'staff.tiredIdle', group: 'staff', roles: STAFF, loop: true, travel: false, base: 4.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.tiredIdle', 'staff.idle', 'staff.walk'],
  pose: function (u, c) {
    // Låg ork: axlarna ned, tyngden på ett ben, handen mot ländryggen en gång per varv. Ingen puls, bara hållningen.
    const back = win(u, 0.3, 0.75, 0.15);
    return breathe(P(STAND, { lift: -0.015, torso: { pitch: 0.1, roll: 0.05 }, head: { pitch: 0.22 }, armL: A(0.04, 0.02, 0.12), armR: A(-0.35 * back, 0.12 * back, 1.6 * back + 0.1), legL: { ...LEG_STAND, knee: 0.16 }, legR: LEG_STAND }), (c.t ?? 0) * 0.7);
  }
}));

reg(def({
  id: 'staff.hesitate', group: 'staff', roles: STAFF, loop: false, travel: false, base: 2.2,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'staff.walk', 'staff.listen'],
  pose: function (u) {
    // Kunskapen saknas: handen till hakan, en blick åt sidan mot en kollega och tillbaka. Kortare i lugnt tempo.
    const chin = win(u, 0.08, 0.86, 0.14), look = win(u, 0.3, 0.62, 0.1);
    return withYaw(P(STAND, { torso: { pitch: 0.04 }, head: { pitch: 0.12 - 0.06 * chin }, armR: A(0.3 + 0.2 * chin, 0.12, 0.2 + 1.9 * chin), armL: A(0.25 * chin, 0.05, 1.3 * chin + 0.15) }), 0.15 * look, 0.7 * look);
  }
}));

/** Gesterna per stämning, i den ordning sim-lagret väljer dem. Sittande; stående i kön har egna klipp. */
export const MOOD_GESTURES: Record<MoodId, string[]> = {
  delighted: ['guest.laugh', 'guest.cheers'],
  content: ['guest.nodApprove', 'guest.leanCurious'],
  waiting: ['guest.checkWatch'],
  impatient: ['guest.waveWaiter', 'guest.checkWatch'],
  displeased: ['guest.armsCrossed', 'guest.pushPlate']
};

function blendArm(a: PoseArm, b: PoseArm, k: number): PoseArm {
  const m = function (x: number | undefined, y: number | undefined) { return (x ?? 0) + ((y ?? 0) - (x ?? 0)) * k; };
  return { swing: m(a.swing, b.swing), lift: m(a.lift, b.lift), elbow: m(a.elbow, b.elbow) };
}

// ===== D11 ansiktsuttryck och gester (2026-10-10), ORDER 325 ======================
// Designs leverans documentation/leveranser/nexus-leverans-2026-10-10-d11-ansikten-och-gester/d11Clips.ts.
// Anders 2026-10-09: spelaren ska kunna läsa gästerna (phronesis) utan symboler. Det mesta av gesterna finns redan
// (D1 stämningen, D9 och D10). Här är det som saknades: luta sig fram och prata, rycka på axlarna, nicka efter första
// smaken, personalens lutade huvud och avtorkningen vid bordet, gatans gångarter, stanna och titta, och hälsa.
// Gesterna i vinbaren finns också stående (…Stand) för vagnen: samma pose med ctx.seated = false.
// Kartan över vilken gest som hör till vilken stämning och situation ligger i gestureMap.ts.
// Huvudets lutning (head.roll) är ny i riggen (figureRig.ts PoseHead.roll), samma led.

reg(def({
  id: 'guest.leanTalk', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.6, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.laugh', 'guest.leanTalk', 'guest.nodApprove'],
  pose: function (u, c) {
    // Fram över bordet mot den hen pratar med, vänster underarm på bordet, höger hand som ritar i luften.
    const k = moodK(c), b = base(c, true), lean = win(u, 0.08, 0.92, 0.15), talk = Math.sin(u * TAU * 4) * win(u, 0.2, 0.85, 0.08);
    const seated = (b.hipDrop ?? 0) > 0;
    return breathe(withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) + (seated ? 0.3 : 0.22) * k * lean },
      head: { pitch: 0.06 - 0.2 * lean + 0.05 * talk, roll: 0.08 * lean },
      armL: blendArm(b.armL ?? A(0, 0, 0), seated ? A(0.9, 0.14, 1.25) : A(0.55, 0.12, 1.5), lean),
      armR: blendArm(b.armR ?? A(0, 0, 0), A(0.95 + 0.14 * talk, 0.16, 1.25 - 0.2 * talk), lean)
    }), (c.yaw ?? 0) * 0.45 * lean, (c.yaw ?? 0) * 0.85 * lean), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.shrug', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, mood: 'waiting',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.checkWatch', 'guest.leanTalk'],
  pose: function (u, c) {
    // Underarmarna ut med handflatorna upp, kroppen lyfts (axlarna), huvudet på sned och lite bakåt. En gång, sedan ned.
    const k = moodK(c), b = base(c, true), s = win(u, 0.12, 0.8, 0.16), up = bell(u, 0.42, 0.13);
    const palm = A(0.55, 0.5 * k, 1.55);
    return withYaw(P(b, {
      lift: 0.028 * k * up,
      torso: { pitch: (b.torso?.pitch ?? 0) - 0.05 * s },
      head: { pitch: 0.04 - 0.12 * s, roll: 0.26 * k * s },
      armL: blendArm(b.armL ?? A(0, 0, 0), palm, s), armR: blendArm(b.armR ?? A(0, 0, 0), palm, s)
    }), (c.yaw ?? 0) * 0.3 * s, (c.yaw ?? 0) * 0.6 * s);
  }
}));

reg(def({
  id: 'guest.nodFirstBite', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4.2, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: { L: 'knife', R: 'fork' }, ends: { L: 'knife', R: 'fork' }, events: [],
  next: ['guest.eat', 'guest.leanTalk', 'guest.seatedIdle'],
  pose: function (u, c) {
    // Gaffeln till munnen, tuggar med huvudet stilla, och sedan två nickar med gaffeln lyft mot tallriken: det här var gott.
    // Nöjd ger två nickar, glad (tempo stressat) tre och ett lyft i bålen.
    const k = moodK(c), b = base(c, true);
    const mouth = win(u, 0.1, 0.36, 0.1), chew = win(u, 0.34, 0.56, 0.05), nods = win(u, 0.56, 0.95, 0.06);
    const n = (c.stress ?? 0.3) > 0.7 ? 3 : 2, nod = 0.28 * k * Math.max(0, Math.sin((u - 0.56) / 0.39 * Math.PI * n)) * nods;
    return withYaw(P(b, {
      lift: 0.012 * k * nods * ((c.stress ?? 0.3) > 0.7 ? 1 : 0),
      torso: { pitch: (b.torso?.pitch ?? 0) + 0.08 * mouth - 0.06 * nods },
      head: { pitch: 0.1 - 0.06 * mouth + 0.04 * Math.sin(u * TAU * 9) * chew + nod },
      armR: blendArm(A(0.78, 0.1, 0.95), A(1.05, 0.08, 2.15), mouth),
      armL: A(0.78, 0.1, 0.95)
    }), (c.yaw ?? 0) * 0.2 * nods, (c.yaw ?? 0) * 0.6 * nods);
  }
}));

// Rekvisitans gester från raketerna, nu som gästens egna (stämningen nöjd). Samma pose, samma händelser.
reg({ ...CLIPS['rocket.smellWine'], id: 'guest.smellWine', group: 'guest', mood: 'content', next: ['guest.nodApprove', 'guest.seatedIdle', 'guest.leanTalk'] });
reg({ ...CLIPS['rocket.askPointMenu'], id: 'guest.pointMenu', group: 'guest', mood: 'content', next: ['guest.seatedIdle', 'guest.leanTalk'] });

// ----- stående, för vagnen -----
// D9:s tillaggClips.ts har stående klipp med namnen guest.checkWatch och guest.armsCrossed, samma namn som D1:s sittande.
// D11 ger de stående ett eget namn (…Stand). ORDER 325: i spelet heter D9:s stående klipp redan guest.checkWatchStand och
// guest.armsCrossedStand (ORDER 319b, ovan), så D11:s två med samma namn läggs inte in; D9:s gäller i kön som förut.
function standing(src: string, id: string, x?: Partial<ClipSpec>): void {
  const s = CLIPS[src];
  reg({ ...s, id: id, from: 'stand', to: 'stand', needs: 'floor', seatKind: undefined, holds: x?.holds ?? {}, ends: x?.ends ?? {}, events: x?.events ?? [],
    next: x?.next ?? ['staff.idle', 'guest.walk'], pose: function (u, c) { return s.pose(u, { ...c, seated: false }); } });
}
standing('guest.laugh', 'guest.laughStand');
standing('guest.leanTalk', 'guest.leanTalkStand');
standing('guest.shrug', 'guest.shrugStand');
standing('guest.nodApprove', 'guest.nodApproveStand');
standing('guest.waveWaiter', 'guest.waveWaiterStand');

reg(def({
  id: 'guest.nodFirstBiteStand', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4.2, mood: 'content', handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: { R: 'any' }, ends: { R: 'any' }, events: [],
  next: ['staff.idle', 'guest.leanTalkStand', 'guest.walk'],
  pose: function (u, c) {
    // Vid ståbordet: korven eller tråget till munnen med höger hand, tugga, och nicka med blicken på det man äter.
    const k = moodK(c), mouth = win(u, 0.1, 0.36, 0.1), chew = win(u, 0.34, 0.56, 0.05), nods = win(u, 0.56, 0.95, 0.06);
    const nod = 0.28 * k * Math.max(0, Math.sin((u - 0.56) / 0.39 * Math.PI * 2)) * nods;
    return withYaw(P(STAND, {
      torso: { pitch: 0.06 + 0.08 * mouth },
      head: { pitch: 0.12 - 0.08 * mouth + 0.04 * Math.sin(u * TAU * 9) * chew + nod },
      armR: blendArm(CHEST_ARM, A(1.15, 0.1, 2.2), mouth), armL: A(0.25, 0.08, 0.9)
    }), 0, (c.yaw ?? 0) * 0.5 * nods);
  }
}));

reg(def({
  id: 'guest.waveStand', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, handed: true, mood: 'content',
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'guest.walk'],
  pose: function (u, c) {
    // Vid luckan eller vid bordet: handen upp över huvudet, två korta vinkningar. Lugnare än guest.waveWaiter.
    const up = win(u, 0.1, 0.86, 0.14), wv = Math.sin(u * TAU * 4) * win(u, 0.25, 0.72, 0.06);
    return withYaw(P(STAND, { torso: { pitch: -0.02, roll: 0.05 * up }, head: { pitch: -0.06 * up }, armR: A(0.1 + 2.5 * up, 0.12 + 0.16 * wv, 0.2 + 0.4 * up) }), (c.yaw ?? 0) * 0.3 * up, (c.yaw ?? 0) * 0.8 * up);
  }
}));

// ----- personalen -----

reg(def({
  id: 'staff.listenTilt', group: 'staff', roles: STAFF, loop: true, travel: false, base: 4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.listenTilt', 'staff.idle', 'staff.write', 'host.point', 'staff.walk', 'waiter.takeOrder'],
  pose: function (u, c) {
    // Lyssnar på en gäst: huvudet på sned mot gästen, lite framåt, händerna samlade framför. En nick per halvt varv.
    // Skillnaden mot staff.listen syns från 24 m: huvudets lutning och bålen som går mot gästen.
    const nod = 0.09 * Math.max(0, Math.sin(u * TAU * 2)), side = (c.yaw ?? 0) >= 0 ? 1 : -1;
    return breathe(withYaw(P(STAND, { torso: { pitch: 0.16, roll: 0.03 * side }, head: { pitch: 0.14 + nod, roll: 0.28 * side }, armL: A(0.4, 0.04, 1.35), armR: A(0.4, 0.04, 1.35) }), (c.yaw ?? 0) * 0.2, (c.yaw ?? 0) * 0.55), c.t ?? 0);
  }
}));

reg(def({
  id: 'waiter.wipeTable', group: 'waiter', roles: ['waiter', 'bartender', 'staff', 'host'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'table', holds: { R: 'napkin' }, ends: { R: 'napkin' }, events: [],
  next: ['waiter.wipeTable', 'staff.walk', 'staff.idle'],
  pose: function (u, c) {
    // Fram över bordet, vänster hand på kanten, höger med trasan i två breda svep per varv. Ståbordet (1,05 m) med ctx.high.
    const s = Math.sin(u * TAU * 2), hi = c.high ? 1 : 0;
    return P(STAND, {
      lift: -0.04 * (1 - hi), torso: { pitch: 0.46 - 0.26 * hi, yaw: 0.14 * s }, head: { pitch: 0.34 - 0.1 * hi },
      armR: A(0.85 - 0.2 * hi + 0.05 * s, 0.14 + 0.24 * s, 0.35 + 0.25 * hi), armL: A(0.55 - 0.1 * hi, -0.04, 0.45),
      legL: { ...LEG_FRONT, knee: 0.22 * (1 - hi) + 0.08, ankle: 0.12 }, legR: { ...LEG_BACK, knee: 0.24 * (1 - hi) + 0.08 }
    });
  }
}));

// ----- gatan -----
// Gångarterna drivs av sträckan (ctx.phase) som guest.walk. Farten sätts av den som spelar dem (speed i manuset):
// lugn 0,85 × gästens gång, brådskande 1,45 ×, med barn 0,7 ×, med hund 0,9 ×.

reg(def({
  id: 'street.walkCalm', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkCalm', 'street.stopLook', 'street.greet', 'staff.idle', 'guest.walk'],
  pose: function (u, c) {
    // Promenaden: upprätt, korta armsvängar, blicken som går från sida till sida över fasaderna.
    const ph = c.phase ?? u, p = walking(P(STAND, { torso: { pitch: -0.03 } }), ph, (c.stride ?? 1) * 0.72, 'both');
    return withYaw({ ...p, head: { ...(p.head ?? {}), pitch: -0.02 } }, 0, 0.42 * Math.sin(ph * Math.PI * 0.35));
  }
}));

reg(def({
  id: 'street.walkHurried', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkHurried', 'street.walkCalm', 'staff.idle', 'guest.walk'],
  pose: function (u, c) {
    // Brådskande: bålen fram, huvudet ned, armarna böjda och pumpande, inga blickar åt sidan.
    const ph = c.phase ?? u, p = walking(P(STAND, { torso: { pitch: 0.16 } }), ph, (c.stride ?? 1) * 1.3, 'both');
    const s = Math.sin(ph * TAU);
    return { ...p, head: { pitch: 0.18, yaw: 0 }, armL: A(-0.55 * s, 0.1, 1.25), armR: A(0.55 * s, 0.1, 1.25) };
  }
}));

reg(def({
  id: 'street.walkWithChild', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkWithChild', 'street.stopLook', 'staff.idle'],
  pose: function (u, c) {
    // Den vuxna håller barnets hand med vänster hand (handed: höger med ctx.hand = 'L'): armen ned och ut, axeln sänkt
    // mot barnet, korta steg, blicken ned mot barnet var fjärde steg.
    const ph = c.phase ?? u, p = walking(STAND, ph, (c.stride ?? 1) * 0.7, 'R');
    const look = Math.max(0, Math.sin(ph * Math.PI * 0.5));
    return { ...p, torso: { ...(p.torso ?? {}), roll: -0.07 }, head: { pitch: 0.1 + 0.22 * look, yaw: -0.5 * look }, armL: A(0.14, 0.42, 0.12) };
  }
}));

reg(def({
  id: 'street.childWalk', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.childWalk', 'staff.idle'],
  pose: function (u, c) {
    // Barnet (heightMult 0,58) bredvid den vuxnas vänstra sida: höger arm upp till handen, studsande steg, blicken runt.
    const ph = c.phase ?? u, p = walking(STAND, ph, (c.stride ?? 1) * 1.15, 'L');
    return withYaw({ ...p, lift: (p.lift ?? 0) + 0.025 * Math.abs(Math.sin(ph * TAU)), armR: A(0.22, 1.05, 0.2) }, 0, 0.5 * Math.sin(ph * Math.PI * 0.6));
  }
}));

reg(def({
  id: 'street.walkWithDog', group: 'guest', roles: ['guest'], loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'any' }, ends: { R: 'any' }, events: [],
  next: ['street.walkWithDog', 'street.stopLook', 'staff.idle'],
  pose: function (u, c) {
    // Kopplet i höger hand, armen fram och ned mot hunden som går 0,9 m snett framför. Ett ryck i kopplet var tredje cykel.
    const ph = c.phase ?? u, p = walking(STAND, ph, (c.stride ?? 1) * 0.85, 'L');
    const tug = Math.max(0, Math.sin(ph * TAU / 3)) ** 6;
    return withYaw({ ...p, torso: { ...(p.torso ?? {}), pitch: (p.torso?.pitch ?? 0) + 0.03 * tug }, armR: A(0.55 + 0.12 * tug, 0.16, 0.42 - 0.1 * tug), head: { pitch: 0.16, yaw: 0 } }, 0.08, 0.25);
  }
}));

reg(def({
  id: 'street.stopLook', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 4.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['street.walkCalm', 'guest.walk', 'staff.idle'],
  pose: function (u, c) {
    // Stannar, vänder bålen och huvudet mot det som syns (ctx.yaw: skylten, ett upplyst fönster), lutar sig fram,
    // handen till hakan, en kort pekning med höger hand och tillbaka.
    const turn = win(u, 0.04, 0.94, 0.14), lean = win(u, 0.2, 0.8, 0.12), chin = win(u, 0.24, 0.56, 0.08), point = win(u, 0.58, 0.82, 0.06);
    return withYaw(P(STAND, {
      torso: { pitch: 0.04 + 0.1 * lean }, head: { pitch: 0.02 - 0.08 * lean },
      armR: blendArm(A(0.3 + 0.2 * chin, 0.12, 0.2 + 1.95 * chin), A(1.15, 0.28, 0.12), point / Math.max(0.001, point + chin)),
      armL: A(0.1 + 0.4 * chin, 0.06, 0.3 + 1.2 * chin)
    }), (c.yaw ?? 0) * 0.45 * turn, (c.yaw ?? 0) * 0.55 * turn);
  }
}));

reg(def({
  id: 'street.greet', group: 'guest', roles: ['guest', 'staff', 'host'], loop: false, travel: false, base: 3.8, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.62, type: 'give', hand: 'R', at: 'partner' }],
  next: ['street.walkCalm', 'staff.idle', 'guest.leanTalkStand'],
  pose: function (u, c) {
    // Ser någon man känner: handen högt och två vinkningar på håll, ett steg fram (root), handslag med nick, och tillbaka.
    // Båda spelar klippet mot varandra, den ena 0,25 s efter.
    const wave = win(u, 0.04, 0.38, 0.08), wv = Math.sin(u * TAU * 7) * win(u, 0.1, 0.34, 0.04);
    const shake = win(u, 0.5, 0.86, 0.06), pump = Math.sin(u * TAU * 8) * shake;
    return withYaw(P(STAND, {
      lift: 0.015 * wave, torso: { pitch: 0.02 + 0.1 * shake }, head: { pitch: -0.04 * wave + 0.12 * shake + 0.05 * pump },
      armR: blendArm(A(0.1 + 2.5 * wave, 0.18 + 0.16 * wv, 0.25 + 0.3 * wave), A(0.82, 0.06, 0.32 + 0.08 * pump), shake / Math.max(0.001, shake + wave))
    }), (c.yaw ?? 0) * 0.4, (c.yaw ?? 0) * 0.8);
  },
  root: function (u) { return [0, 0.32 * ramp(u, 0.36, 0.52), 0]; }
}));

// ---------- uppspelning -----------------------------------------------

export function clipSeconds(id: string, tempo: TempoId): number {
  return CLIPS[id].seconds[tempo];
}

/** Sekunder från klippets start till första händelsen av en typ (och hand, om angiven). */
export function eventTime(id: string, type: ClipEventType, tempo: TempoId, hand?: HandSide): number {
  const c = CLIPS[id];
  const e = c.events.find(function (x) { return x.type === type && (hand === undefined || x.hand === hand); });
  if (!e) return -1;
  return e.u * c.seconds[tempo];
}

/**
 * Ett klipp vid tiden `time` sekunder sedan klippet började. Loopar tar fasen modulo en
 * cykel. Klipp som går (travel) tar ctx.phase från sträckan och bryr sig inte om tiden.
 */
export function sampleClip(id: string, time: number, tempo: TempoId, ctx?: ClipCtx): ClipSample {
  const c = CLIPS[id];
  const T = TEMPO[tempo];
  const sec = c.seconds[tempo];
  const t = Math.max(0, time);
  let u = c.loop ? (t / sec) % 1 : clamp01(t / sec);
  const cx: ClipCtx = { ...(ctx ?? {}), t: t, stress: ctx?.stress ?? T.stress, stride: T.stride };
  if (c.travel) { cx.phase = ctx?.phase ?? t / sec; u = ((cx.phase % 1) + 1) % 1; }
  const mirror = c.handed === true && cx.hand === 'L';
  if (mirror) cx.yaw = -(cx.yaw ?? 0);
  let pose = c.pose(u, cx);
  let tilt = c.tilt ? c.tilt(u, cx) : {};
  let root: [number, number, number] = c.root ? c.root(u, cx) : [0, 0, 0];
  if (mirror) {
    pose = mirrorPose(pose);
    tilt = { L: tilt.R, R: tilt.L };
    root = [-root[0], root[1], -root[2]];
  }
  if (c.roles.indexOf('guest') < 0 && c.group !== 'rocket') pose = strain(pose, (cx.stress ?? 0) * 0.6);
  let chairPull = c.chair ? c.chair(u) : 0;
  if ((pose.hipDrop ?? 0) > 0 && c.roles.indexOf('guest') >= 0) {
    const authored: SeatKind = c.seatKind ?? 'chair';
    const target: SeatKind = c.seatKind ?? cx.seatKind ?? 'chair';
    pose = reseat(pose, authored, target, cx.heightMult ?? 1);
    if (target !== 'chair') chairPull = 0;
    // Resa sig från loungen går framåt, inte bakåt in i ryggstödet.
    if (authored === 'chair' && target === 'lounge' && c.root) root = [root[0], Math.abs(root[1]) * 1.2, root[2]];
  }
  // Sittande och på väg ned eller upp: ingen fot under golvet. Lyfter kroppen det som saknas.
  if (c.roles.indexOf('guest') >= 0 && (c.from === 'seated' || c.to === 'seated') && !c.travel) {
    const sole = soleHeight(pose, cx.heightMult ?? 1);
    if (sole < 0) pose = { ...pose, lift: (pose.lift ?? 0) - sole };
  }
  const keep = ctx?.keep;
  if (keep) pose = { ...pose, armL: keep.L ?? pose.armL, armR: keep.R ?? pose.armR };
  return { pose: pose, tilt: tilt, root: root, chair: chairPull, u: u };
}

/**
 * Lägger om en sittande pose från den sits den är författad för till en annan. Hur sittande
 * posen är (k) läses ur höftens sänkning, så övergångar (resa sig, sätta sig) läggs om lika
 * mycket som de sitter. Därefter läggs seatLift till, så att höften landar på sitsen även
 * för en skalad gäst.
 */
export function reseat(p: FigurePose, from: SeatKind, to: SeatKind, heightMult: number): FigurePose {
  const F = SEAT_KINDS[from], T = SEAT_KINDS[to];
  const k = clamp01((p.hipDrop ?? 0) / F.drop);
  let r = p;
  if (from !== to) {
    const leg = function (l: any) {
      const a = l ?? {};
      const m = function (x: number | undefined, y: number) { return (x ?? 0) + (y - (x ?? 0)) * k; };
      return { swing: m(a.swing, T.legs.swing), spread: m(a.spread, T.legs.spread), knee: m(a.knee, T.legs.knee), ankle: m(a.ankle, T.legs.ankle) };
    };
    const t = p.torso ?? {}, h = p.head ?? {};
    r = {
      ...p, hipDrop: k * T.drop, legL: leg(p.legL), legR: leg(p.legR),
      torso: { ...t, pitch: (t.pitch ?? 0) + k * (T.torso - F.torso) },
      head: { ...h, pitch: (h.pitch ?? 0) + k * (T.head - F.head) }
    };
  }
  const kt = clamp01((r.hipDrop ?? 0) / T.drop);
  r = { ...r, lift: (r.lift ?? 0) + kt * seatLift(to, heightMult) };
  return plantFeet(r, to, heightMult, kt);
}

/** Sulans lägsta punkt över golvet, räknad i figurens sidoplan (höft → knä → fotled → fotens
 *  fyra hörn). Samma led och mått som figureRig. Räcker för att hålla fötterna ovan golvet
 *  när någon sätter sig eller reser sig. */
export function soleHeight(p: FigurePose, heightMult: number): number {
  const hm = heightMult ?? 1;
  const h = p.hipDrop ?? 0;
  const body = (p.lift ?? 0) - h + FIGURE.hipY * (1 - hm) * Math.min(1, h / FIGURE.seatedHipDrop);
  const hipY = body + FIGURE.hipY * hm;
  let low = 9;
  [p.legL, p.legR].forEach(function (l: any) {
    const L = l ?? {};
    const t1 = -(L.swing ?? 0), t2 = t1 + (L.knee ?? 0), t3 = t2 - (L.ankle ?? 0);
    const ankleY = hipY - FIGURE.thigh * hm * Math.cos(t1) - FIGURE.shin * hm * Math.cos(t2);
    const back = -0.055, front = FIGURE.footLength - 0.055;
    [[0, back], [0, front], [-FIGURE.footHeight, back], [-FIGURE.footHeight, front]].forEach(function (q) {
      low = Math.min(low, ankleY + hm * (q[0] * Math.cos(t3) - q[1] * Math.sin(t3)));
    });
  });
  return low;
}

/**
 * Sätter fötterna i golvet (stol, lounge) eller på fotringen (barstol) när figuren sitter
 * eller är på väg ned. Höftens vinkel behålls; knät och fotleden räknas ut så att fotleden
 * hamnar på rätt höjd och sulan står plan. Riktningen (fötterna bakom eller framför knät)
 * tas från posen. Når benet inte ned hänger foten, som för en kort gäst på en hög sits.
 * Det här är den enkla ben-IK som figureRig FRÅGOR §3 och §5 efterfrågade, för sittande.
 */
export function plantFeet(p: FigurePose, kind: SeatKind, heightMult: number, k: number): FigurePose {
  const hm = heightMult ?? 1;
  const h = p.hipDrop ?? 0;
  if (kind === 'stool' ? k < 0.9 : h < 0.05) return p;
  const body = (p.lift ?? 0) - h + FIGURE.hipY * (1 - hm) * Math.min(1, h / FIGURE.seatedHipDrop);
  const pelvisY = body + FIGURE.hipY * hm;
  const target = (kind === 'stool' ? (SEAT_KINDS.stool.footrest ?? 0.3) : 0) + FIGURE.ankleY * hm;
  const w = kind === 'stool' ? ramp(k, 0.9, 1) : 1;
  const leg = function (l: any) {
    const L = l ?? {};
    const sw = L.swing ?? 0;
    const sgn = (L.knee ?? 0) - sw >= 0 ? 1 : -1;
    const c = (pelvisY - target - FIGURE.thigh * hm * Math.cos(sw)) / (FIGURE.shin * hm);
    const ang = Math.acos(Math.max(-1, Math.min(1, c)));
    const knee = sw + sgn * ang, ankle = sgn * ang;
    return { ...L, knee: (L.knee ?? 0) + (knee - (L.knee ?? 0)) * w, ankle: (L.ankle ?? 0) + (ankle - (L.ankle ?? 0)) * w };
  };
  return { ...p, legL: leg(p.legL), legR: leg(p.legR) };
}

/** Övergång mellan två klipp: blanda från föregående klipps sista pose under TEMPO.blendSec. */
export function crossfade(prev: ClipSample, next: ClipSample, sinceStart: number, tempo: TempoId): ClipSample {
  const k = clamp01(sinceStart / TEMPO[tempo].blendSec);
  if (k >= 1) return next;
  return { ...next, pose: blendPose(prev.pose, next.pose, smooth(k)) };
}

// ---------- prov ------------------------------------------------------

/** Kontrollerar katalogen: att varje efterföljare finns, att läget i slutet av ett klipp är
 *  läget i början av efterföljaren, och att det ett klipp håller i slutet är det nästa
 *  klipp börjar med. Returnerar en lista med fel; tom lista = godkänt. */
export function validateClips(): string[] {
  const errors: string[] = [];
  const compatible = function (a: Stance, b: Stance): boolean {
    if (a === b) return true;
    return (a === 'walk' && b === 'stand') || (a === 'stand' && b === 'walk') || (a === 'hurt' && b === 'walk');
  };
  Object.keys(CLIPS).forEach(function (id) {
    const c = CLIPS[id];
    c.next.forEach(function (n) {
      const d = CLIPS[n];
      if (!d) { errors.push(id + ' → ' + n + ': finns inte'); return; }
      if (!compatible(c.to, d.from)) errors.push(id + ' → ' + n + ': slutar ' + c.to + ', nästa börjar ' + d.from);
    });
    c.events.forEach(function (e) { if (e.u < 0 || e.u > 1) errors.push(id + ': händelse utanför 0..1'); });
    if (c.seatKind && c.needs !== c.seatKind && !(c.seatKind === 'chair' && c.needs === 'chair')) errors.push(id + ': seatKind ' + c.seatKind + ' men needs ' + c.needs);
  });
  return errors;
}

/** Tabellen i LEVERANSNOT byggs ur den här. */
export function clipTable() {
  return Object.keys(CLIPS).map(function (id) {
    const c = CLIPS[id];
    return { id: id, group: c.group, loop: c.loop, travel: c.travel, seconds: c.seconds, from: c.from, to: c.to, needs: c.needs, seatKind: c.seatKind, holds: c.holds, ends: c.ends, events: c.events, next: c.next };
  });
}
