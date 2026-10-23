// figureLife.ts — D12 (2026-10-11): livet i figurerna, ovanpå klippen. Ingen figur står helt stilla. ORDER 332 B.
// Tre saker, alla rena funktioner av tiden (samma bild för samma t, som teatern):
//   1. Vilan: blinkningar, blickar som flyttar sig (ögonen först, huvudet efter) och huvudets små rörelser. Står figuren
//      flyttar den tyngden ibland. lifeTimeline() gör schemat ur ett frö, lifeAt() ger läget vid t.
//   2. Temperamentet: scalePose() gör gesten större eller mindre mot vilan (gestureMap.TEMPERAMENT.amp × INTENSITY.amp).
//   3. Ansiktets övergångar: faceAt() ger figureFace.FaceState ur en lista med uttryck i tidsordning.
// Ordningen per bildruta: sampleClip → scalePose → applyPose → applyLife (lägger till på leden) → face.show(faceAt(...)).
// Talen kommer ur gestureMap.ts (TEMPERAMENT, LIFE_RULES), som läser dem ur balance.ts FIGURE_LIFE.
// Avvikelser från Designs fil: MoodId ur guestMood.ts, three:s och riggens typer i stället för any, och schemat kan
// börja vid t0 (LifeTimeline.t0) så att spelet bygger det i fönster (avsnittet Spelet längst ned). Huvudets drift
// räknas på den hela tiden, så att den inte hoppar mellan fönstren.

import { FIGURE_LIFE, MOOD_BALANCE } from '../../sim/balance';
import { hashKey } from '../util/hash';
import { applyPose, type FigurePose, type FigureRig, type PoseArm, type PoseHead, type PoseTorso } from './figureRig';
import { CLIPS, sampleClip, type ClipSample, type SeatKind } from './figureClips';
import type { FaceHandle, FaceState } from './figureFace';
import { INTENSITY, LIFE_RULES, TEMPERAMENT, TEMPERAMENT_BALANCE, intensityFor, temperamentOf, type IntensityId, type TemperamentId } from './gestureMap';
import type { GuestGroupId } from './guestGroups';
import type { MoodId } from './guestMood';

/** Ett frö → en följd av tal 0..1 (mulberry32). */
export function rng(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface Glance { t: number; hold: number; yaw: number; pitch: number }
export interface LifeTimeline {
  temper: TemperamentId; seed: number; blinks: number[]; glances: Glance[]; shifts: { t: number; side: number }[];
  /** ORDER 332 B: schemats början i figurens klocka (blinkningar, blickar och tyngdbyten räknas från den). 0 i Designs. */
  t0?: number;
}

/** Schemat för en figur från 0 till untilS. Personalen har 'calm'. */
export function lifeTimeline(seed: number, temper: TemperamentId, untilS: number): LifeTimeline {
  const T = TEMPERAMENT[temper], r = rng(seed * 9973 + 17), between = (a: readonly [number, number]) => a[0] + (a[1] - a[0]) * r();
  const blinks: number[] = [], glances: Glance[] = [], shifts: { t: number; side: number }[] = [];
  let t = r() * T.blinkEveryS[0], n = 0;
  while (t < untilS) { blinks.push(t); n++; if (n % LIFE_RULES.doubleBlinkEvery === 0) blinks.push(t + 0.24); t += between(T.blinkEveryS); }
  t = 0.4 + r() * T.glanceEveryS[0]; n = 0;
  while (t < untilS) {
    const side = r() < 0.5 ? -1 : 1, yaw = side * T.glanceYaw * (0.55 + 0.45 * r()), hold = between(T.glanceHoldS);
    glances.push({ t, hold, yaw, pitch: (r() - 0.6) * 0.12 });
    if (++n % LIFE_RULES.blinkOnGlance === 0) blinks.push(t + 0.02);
    t += hold + between(T.glanceEveryS);
  }
  t = r() * T.shiftEveryS[0]; let side = r() < 0.5 ? -1 : 1;
  while (t < untilS) { shifts.push({ t, side }); side = -side; t += between(T.shiftEveryS); }
  blinks.sort((a, b) => a - b);
  return { temper, seed, blinks, glances, shifts };
}

const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
const sm = (u: number) => { const k = clamp01(u); return k * k * (3 - 2 * k); };
const ramp = (u: number, a: number, b: number) => sm((u - a) / (b - a));

export interface LifeSample { blink: number; gaze: number; headYaw: number; headPitch: number; headRoll: number; torsoRoll: number; lift: number }

/** Läget vid t. busy = 1 under en gest (dämpar blickarna och driften till LIFE_RULES.busyK). standing = tyngdbyten. */
export function lifeAt(tl: LifeTimeline, t: number, busy = 0, standing = false): LifeSample {
  const T = TEMPERAMENT[tl.temper], R = LIFE_RULES, damp = 1 - (1 - R.busyK) * clamp01(busy);
  const lt = t - (tl.t0 ?? 0);
  const B = FIGURE_LIFE.face.blinkS, blinkEnd = B.close + B.open;
  let blink = 0;
  for (const b of tl.blinks) { if (b > lt) break; const d = lt - b; if (d < B.close) blink = Math.max(blink, d / B.close); else if (d < blinkEnd) blink = Math.max(blink, 1 - (d - B.close) / B.open); }
  let gaze = 0, hy = 0, hp = 0;
  for (const g of tl.glances) {
    if (g.t > lt) break;
    const d = lt - g.t, end = g.hold + R.headFollowS;
    if (d > end + 0.4) continue;
    const eyes = ramp(d, 0, R.eyesFirstS) * (1 - ramp(d, end, end + 0.08));
    const head = ramp(d, R.eyesFirstS, R.eyesFirstS + R.headFollowS) * (1 - ramp(d, end, end + 0.35));
    gaze = Math.sign(g.yaw) * (eyes - 0.55 * head); hy = g.yaw * R.headShare * head; hp = g.pitch * head;
  }
  const s = tl.seed * 1.37;
  const drift = T.drift * damp;
  hy = hy * damp + drift * Math.sin(t * 0.37 + s * 3);
  hp = hp * damp + drift * 0.6 * Math.sin(t * 0.83 + s) + drift * 0.3 * Math.sin(t * 1.9 + s * 2);
  const hr = drift * 0.7 * Math.sin(t * 0.53 + s * 2);
  let tr = 0, lift = 0;
  if (standing) {
    let side = 0, k = 0;
    for (const sh of tl.shifts) { if (sh.t > lt) break; side = sh.side; k = ramp(lt - sh.t, 0, 0.7); }
    tr = 0.028 * side * k * damp; lift = -0.006 * k;
  }
  return { blink, gaze: gaze * damp, headYaw: hy, headPitch: hp, headRoll: hr, torsoRoll: tr, lift };
}

/** Lägger livet på leden efter applyPose (samma tecken som figureRig.applyPose). */
export function applyLife(rig: Pick<FigureRig, 'joints'>, L: LifeSample): void {
  const j = rig.joints;
  j.head.rotation.x += -L.headPitch; j.head.rotation.y += L.headYaw; j.head.rotation.z += -L.headRoll;
  j.chest.rotation.z += L.torsoRoll; j.body.position.y += L.lift;
}

/** Gesten större eller mindre: avvikelsen från vilan gånger amp. Benen, sitthöjden och lyftet ur sitsen (hipDrop) skalas inte,
 *  och armarnas sving begränsas till 2,9 rad (armen går inte bakom huvudet). */
export function scalePose(rest: FigurePose, pose: FigurePose, amp: number): FigurePose {
  if (Math.abs(amp - 1) < 1e-3) return pose;
  const n = (a: number | undefined, b: number | undefined) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * amp;
  const capped = (v: number, cap?: number) => (cap != null ? Math.min(cap, v) : v);
  const torso = (a: PoseTorso = {}, b: PoseTorso = {}): PoseTorso => ({ ...b, pitch: n(a.pitch, b.pitch), yaw: n(a.yaw, b.yaw), roll: n(a.roll, b.roll) });
  const head = (a: PoseHead = {}, b: PoseHead = {}): PoseHead => ({ ...b, pitch: n(a.pitch, b.pitch), yaw: n(a.yaw, b.yaw), roll: n(a.roll, b.roll) });
  const arm = (a: PoseArm = {}, b: PoseArm = {}): PoseArm => ({ ...b, swing: capped(n(a.swing, b.swing), 2.9), lift: n(a.lift, b.lift), elbow: capped(n(a.elbow, b.elbow), 2.5) });
  return {
    ...pose, lift: n(rest.lift, pose.lift),
    torso: torso(rest.torso, pose.torso), head: head(rest.head, pose.head),
    armL: arm(rest.armL, pose.armL), armR: arm(rest.armR, pose.armR)
  };
}

/** Ett uttryck i tidsordning: från t går ansiktet över till mood med intensiteten k på transS sekunder. */
export interface FaceBeat { t: number; mood: MoodId; k: number; transS?: number }
/** FaceState (figureFace.ts) vid t, ur uttrycken och livet. initial = uttrycket före första beat. */
export function faceAt(beats: FaceBeat[], initial: { mood: MoodId; k: number }, t: number, transS: number, life?: LifeSample | null): FaceState {
  let to = initial, from = initial, start = -1, dur = transS;
  for (const b of beats) { if (b.t > t) break; from = to; to = { mood: b.mood, k: b.k }; start = b.t; dur = b.transS ?? transS; }
  const k = start < 0 ? 1 : clamp01((t - start) / Math.max(0.05, dur));
  return { from, to, t: k, blink: life ? life.blink : 0, gaze: life ? life.gaze : 0 };
}

// ---------- spelet (ORDER 332 B) ---------------------------------------
// Vinbaren och bistron (WineBarFigures.tsx, moodGestures.ts) och vagnen (village/PlayerTruckCrew.tsx) spelar livet per
// figur ur ett frö (gästens id), så att samma kväll ser likadan ut. Schemat byggs i fönster om FIGURE_LIFE.windowS.

/** Gästens nummer ur id:t (deterministiskt), för temperamentet, varianterna och handen. */
export function guestNumber(id: string): number {
  return Math.floor(hashKey(0x332b, id) * 0x7fffffff);
}

/** Temperamentet för en gäst ur numret, med gruppens andelar (balance.ts FIGURE_LIFE.temperamentShare). */
export function temperamentForGuest(id: string, group: GuestGroupId | null): TemperamentId {
  return temperamentOf(guestNumber(id), group ? TEMPERAMENT_BALANCE.share[group] : null);
}

/** Trycket 0..1 för intensityFor: hur djupt gästen står i sin stämning (glad och nöjd uppåt, väntar, otålig och missnöjd
 *  nedåt, ur MOOD_BALANCE.threshold), eller väntan mot vinkningens gräns om den är större (waitedS / waitWaveS). */
export function pressureOf(value: number, waited?: { s: number; waveS: number } | null): number {
  const th = MOOD_BALANCE.threshold;
  const band = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
  let p: number;
  if (value >= th.delighted) p = band(value, th.delighted, 1);
  else if (value >= th.content) p = band(value, th.content, th.delighted);
  else if (value >= th.waiting) p = band(th.content - value, 0, th.content - th.waiting);
  else if (value >= th.impatient) p = band(th.waiting - value, 0, th.waiting - th.impatient);
  else p = band(th.impatient - value, 0, th.impatient);
  if (waited && waited.waveS > 0) p = Math.max(p, clamp01(waited.s / waited.waveS));
  return p;
}

/** Intensiteten för en gäst: nivån ur trycket. */
export function intensityOfGuest(value: number, waited?: { s: number; waveS: number } | null): IntensityId {
  return intensityFor(pressureOf(value, waited));
}

/** Ansiktets intensitet (figureFace k) för en nivå och ett temperament (INTENSITY.faceK × TEMPERAMENT.faceK). */
export function faceKOf(intensity: IntensityId, temper: TemperamentId): number {
  return INTENSITY[intensity].faceK * TEMPERAMENT[temper].faceK;
}

/** Gestens storlek för en nivå och ett temperament (TEMPERAMENT.amp × INTENSITY.amp). */
export function ampOf(intensity: IntensityId, temper: TemperamentId): number {
  return TEMPERAMENT[temper].amp * INTENSITY[intensity].amp;
}

const restCache = new Map<string, FigurePose>();
/** Vilan som gesten skalas mot: sittande (guest.seatedIdle på sitsen) eller stående (staff.idle), som i prototypen. */
export function restPose(seatKind: SeatKind | null): FigurePose {
  const key = seatKind ?? 'stand';
  let p = restCache.get(key);
  if (!p) {
    p = seatKind ? sampleClip('guest.seatedIdle', 0, 'normal', { seatKind, seated: true, stress: 0 }).pose : sampleClip('staff.idle', 0, 'normal', { stress: 0 }).pose;
    restCache.set(key, p);
  }
  return p;
}

/** Klippet med temperamentets och intensitetens storlek (scalePose mot vilan). Samma ClipSample annars. */
export function scaleClip(clip: ClipSample, amp: number, seatKind: SeatKind | null): ClipSample {
  if (Math.abs(amp - 1) < 1e-3) return clip;
  return { ...clip, pose: scalePose(restPose(seatKind), clip.pose, amp) };
}

/** Hur upptagen figuren är av en gest (0..1, dämpar blickarna): mjukt in och ut över klippets början och slut. Klipp
 *  som loopar räknas som upptagna hela tiden. */
export function gestureBusy(clipId: string | null, u: number): number {
  if (!clipId) return 0;
  const c = CLIPS[clipId];
  if (!c) return 0;
  if (c.loop) return 1;
  return clamp01(Math.min(u, 1 - u) / 0.15);
}

/** Livet för en figur: temperamentet, schemat i det fönster som spelas, och ansiktets uttryck i tidsordning. */
export interface FigureLifeState {
  key: string; seed: number; temper: TemperamentId;
  window: number; tl: LifeTimeline | null;
  beats: FaceBeat[]; initial: { mood: MoodId; k: number }; target: { mood: MoodId; k: number } | null;
  /** Det applyLife lade på leden förra gången, och ledens värden efteråt: har ingen applyPose skrivit över dem sedan dess
   *  tas det förra livet bort först, så att livet aldrig läggs på två gånger (liveFrame). */
  applied: { life: LifeSample; joints: number[] } | null;
}

/** Schemat för fönstret w: Designs lifeTimeline ur ett frö per fönster, förskjutet till fönstrets början. Blickar som inte
 *  hinner klart före fönstrets slut tas bort, och tyngden står kvar på den sida förra fönstret slutade. */
export function lifeWindow(seed: number, temper: TemperamentId, w: number): LifeTimeline {
  const W = FIGURE_LIFE.windowS, R = LIFE_RULES;
  const make = (k: number) => {
    const tl = lifeTimeline(((seed * 131) ^ (k * 2654435761)) >>> 0, temper, W);
    tl.glances = tl.glances.filter((g) => g.t + g.hold + R.headFollowS + 0.45 < W);
    return tl;
  };
  const tl = make(w);
  if (w > 0) {
    const prev = make(w - 1).shifts;
    const last = prev.length ? prev[prev.length - 1].side : 0;
    if (last !== 0) tl.shifts = [{ t: -10, side: last }, ...tl.shifts];
  }
  // Driften räknas på fröet (lifeAt s); samma frö i alla fönster.
  return { ...tl, seed, t0: w * W };
}

/** Livets tillstånd per figur, med nyckeln (gästens id eller personalens nyckel). */
export class FigureLives {
  private readonly map = new Map<string, FigureLifeState>();

  of(key: string, temper: TemperamentId, mood: MoodId = 'content', k = 1): FigureLifeState {
    let s = this.map.get(key);
    if (!s || s.temper !== temper) {
      s = { key, seed: guestNumber(key), temper, window: -1, tl: null, beats: [], initial: { mood, k }, target: { mood, k }, applied: null };
      this.map.set(key, s);
    }
    return s;
  }

  /** Glöm figurerna som inte längre finns. */
  keepOnly(keys: Set<string>): void {
    for (const k of this.map.keys()) if (!keys.has(k)) this.map.delete(k);
  }

  get size(): number { return this.map.size; }
}

/** Livet vid t för en figur, med schemat för rätt fönster. */
export function lifeOf(s: FigureLifeState, t: number, busy: number, standing: boolean): LifeSample {
  const w = Math.max(0, Math.floor(t / FIGURE_LIFE.windowS));
  if (w !== s.window || !s.tl) { s.tl = lifeWindow(s.seed, s.temper, w); s.window = w; }
  return lifeAt(s.tl, t, busy, standing);
}

/** Ansiktet ska visa mood med intensiteten k: ett nytt uttryck i tidsordningen när det ändrats (efter temperamentets
 *  faceTransS). Uttrycket stannar sedan tills något nytt händer (D12 §2). */
export function faceTarget(s: FigureLifeState, t: number, mood: MoodId, k: number): void {
  const cur = s.target;
  if (cur && cur.mood === mood && Math.abs(cur.k - k) < 0.08) return;
  s.target = { mood, k };
  s.beats.push({ t, mood, k, transS: TEMPERAMENT[s.temper].faceTransS });
  // faceAt behöver bara de två senaste: från det förra till det nya.
  if (s.beats.length > 2) s.beats.splice(0, s.beats.length - 2);
}

const jointValues = (rig: Pick<FigureRig, 'joints'>): number[] => { const j = rig.joints; return [j.head.rotation.x, j.head.rotation.y, j.head.rotation.z, j.chest.rotation.z, j.body.position.y]; };
const sameJoints = (rig: Pick<FigureRig, 'joints'>, v: number[]): boolean => { const c = jointValues(rig); return c.every((x, i) => x === v[i]); };
const negate = (L: LifeSample): LifeSample => ({ blink: L.blink, gaze: L.gaze, headYaw: -L.headYaw, headPitch: -L.headPitch, headRoll: -L.headRoll, torsoRoll: -L.torsoRoll, lift: -L.lift });

/** Det spelet vet om figuren i en bildruta. */
export interface LiveFrame {
  /** Figurernas klocka (simtid). */
  t: number;
  /** 0..1 under en gest (gestureBusy). */
  busy: number;
  standing: boolean;
  /** Uttrycket ansiktet ska visa och dess intensitet (faceKOf). null = ansiktet lämnas som det är. */
  mood: MoodId | null;
  k: number;
  /** usePrefersReducedMotion: huvudets drift, blickarna och tyngdbytena står still; blinkningarna och ansiktets
   *  övergångar är kvar. */
  reduced?: boolean;
}

/** ORDER 332 B — det som spelet kör per figur efter applyPose: applyLife och face.show(faceAt(...)). Riggen ska ha fått
 *  sin pose i samma bildruta (applyPose sätter leden, applyLife lägger till). Ger livet och ansiktets läge. */
export function liveFrame(rig: Pick<FigureRig, 'joints'>, face: FaceHandle | null, s: FigureLifeState, f: LiveFrame): { life: LifeSample; face: FaceState | null } {
  const full = lifeOf(s, f.t, f.busy, f.standing);
  const life: LifeSample = f.reduced ? { blink: full.blink, gaze: 0, headYaw: 0, headPitch: 0, headRoll: 0, torsoRoll: 0, lift: 0 } : full;
  // Ingen applyPose sedan förra bildrutan (figuren stod still i spelets kod): ta bort det förra livet först.
  if (s.applied && sameJoints(rig, s.applied.joints)) applyLife(rig, negate(s.applied.life));
  if (!f.reduced) applyLife(rig, life);
  s.applied = f.reduced ? null : { life, joints: jointValues(rig) };
  if (f.mood) faceTarget(s, f.t, f.mood, f.k);
  let state: FaceState | null = null;
  if (face) {
    state = faceAt(s.beats, s.initial, f.t, TEMPERAMENT[s.temper].faceTransS, life);
    face.show(state);
  }
  return { life, face: state };
}

/** Klippets pose med gestens storlek, lagd på riggen (sampleClip → scalePose → applyPose). För de ställen som lägger
 *  posen själva (vagnen). */
export function applyGesture(rig: FigureRig, clip: ClipSample, amp: number, seatKind: SeatKind | null): void {
  applyPose(rig, scaleClip(clip, amp, seatKind).pose);
}

/** ORDER 332 B (D12 REACTIONS.passNod, klippet staff.walkNod) — den närmaste av guests inom
 *  FIGURE_LIFE.reaction.passNodRadiusM framför den som går (x, z och kursen yaw i samma ram), och vinkeln till hen i
 *  den gåendes ram; eller null. */
export function passNodTarget(walker: { x: number; z: number; yaw: number }, guests: readonly { x: number; z: number }[]): { index: number; yaw: number } | null {
  let best: number = FIGURE_LIFE.reaction.passNodRadiusM, out: { index: number; yaw: number } | null = null;
  guests.forEach((g, index) => {
    const dx = g.x - walker.x, dz = g.z - walker.z, d = Math.hypot(dx, dz);
    if (d >= best) return;
    let a = Math.atan2(dx, dz) - walker.yaw;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    // Bara den man går förbi eller mot, inte den bakom.
    if (Math.abs(a) > 1.6) return;
    best = d; out = { index, yaw: a };
  });
  return out;
}

/** Nicken i förbifarten ovanpå gången (samma huvud som staff.walkNod: vänt mot gästen, en nick per steg). Efter applyPose. */
export function applyPassNod(rig: Pick<FigureRig, 'joints'>, yaw: number, phase: number): void {
  const nod = 0.16 * Math.max(0, Math.sin(phase * Math.PI)) ** 4;
  rig.joints.head.rotation.y += yaw * 0.8;
  rig.joints.head.rotation.x += -nod;
  rig.joints.chest.rotation.y += yaw * 0.15;
}

/**
 * ORDER 340 D (Anders 2026-10-23: "gästerna tittar ut över de tomma borden") — en sittande gäst i ett halvtomt rum vänder
 * huvudet och bröstet mot ett tomt bord en stund i taget: lookS av var cycleS sekund, ett nytt tomt bord varje gång
 * (ur fröet), högst ±1,2 rad mot kroppen. Efter applyPose och livet. Ingen effekt utan tomma platser.
 */
export const EMPTY_LOOK = { cycleS: 7, lookS: 3.2, headShare: 0.75, chestShare: 0.3, maxYaw: 1.2, pitch: -0.06 } as const;
export function applyEmptyRoomLook(rig: Pick<FigureRig, 'joints' | 'root'>, empty: readonly { x: number; z: number }[], t: number, seed: number): void {
  if (empty.length === 0) return;
  const L = EMPTY_LOOK;
  const u = t / L.cycleS + (seed % 997) / 997;
  const cycle = Math.floor(u), into = (u - cycle) * L.cycleS;
  const w = ramp(into, 0, 0.6) * (1 - ramp(into, L.lookS - 0.6, L.lookS));
  if (w <= 0) return;
  const target = empty[Math.floor(rng(seed * 31 + cycle)() * empty.length)];
  const p = rig.root.position;
  let a = Math.atan2(target.x - p.x, target.z - p.z) - rig.root.rotation.y;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  const yaw = Math.max(-L.maxYaw, Math.min(L.maxYaw, a)) * w;
  rig.joints.head.rotation.y += yaw * L.headShare;
  rig.joints.head.rotation.x += -L.pitch * w;
  rig.joints.chest.rotation.y += yaw * L.chestShare;
}
