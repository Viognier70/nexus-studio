// figureLife.ts — D12 (2026-10-11): livet i figurerna, ovanpå klippen. Ingen figur står helt stilla.
// Tre saker, alla rena funktioner av tiden (samma bild för samma t, som teatern):
//   1. Vilan: blinkningar, blickar som flyttar sig (ögonen först, huvudet efter) och huvudets små rörelser. Står figuren
//      flyttar den tyngden ibland. lifeTimeline() gör schemat ur ett frö, lifeAt() ger läget vid t.
//   2. Temperamentet: scalePose() gör gesten större eller mindre mot vilan (gestureMap.TEMPERAMENT.amp × INTENSITY.amp).
//   3. Ansiktets övergångar: faceAt() ger figureFace.FaceState ur en lista med uttryck i tidsordning.
// Ordningen per bildruta: sampleClip → scalePose → applyPose → applyLife (lägger till på leden) → face.show(faceAt(...)).
// Talen kommer ur gestureMap.ts (TEMPERAMENT, LIFE_RULES) och är platshållare för balance.ts.

import { TEMPERAMENT, LIFE_RULES, type TemperamentId } from './gestureMap';

type MoodId = 'delighted' | 'content' | 'waiting' | 'impatient' | 'displeased';

/** Ett frö → en följd av tal 0..1 (mulberry32). */
export function rng(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface Glance { t: number; hold: number; yaw: number; pitch: number }
export interface LifeTimeline { temper: TemperamentId; seed: number; blinks: number[]; glances: Glance[]; shifts: { t: number; side: number }[] }

/** Schemat för en figur från 0 till untilS. Personalen har 'calm'. */
export function lifeTimeline(seed: number, temper: TemperamentId, untilS: number): LifeTimeline {
  const T = TEMPERAMENT[temper], r = rng(seed * 9973 + 17), between = (a: [number, number]) => a[0] + (a[1] - a[0]) * r();
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
  let blink = 0;
  for (const b of tl.blinks) { if (b > t) break; const d = t - b; if (d < 0.05) blink = Math.max(blink, d / 0.05); else if (d < 0.14) blink = Math.max(blink, 1 - (d - 0.05) / 0.09); }
  let gaze = 0, hy = 0, hp = 0;
  for (const g of tl.glances) {
    if (g.t > t) break;
    const d = t - g.t, end = g.hold + R.headFollowS;
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
    for (const sh of tl.shifts) { if (sh.t > t) break; side = sh.side; k = ramp(t - sh.t, 0, 0.7); }
    tr = 0.028 * side * k * damp; lift = -0.006 * k;
  }
  return { blink, gaze: gaze * damp, headYaw: hy, headPitch: hp, headRoll: hr, torsoRoll: tr, lift };
}

/** Lägger livet på leden efter applyPose (samma tecken som figureRig.applyPose). */
export function applyLife(rig: any, L: LifeSample): void {
  const j = rig.joints;
  j.head.rotation.x += -L.headPitch; j.head.rotation.y += L.headYaw; j.head.rotation.z += -L.headRoll;
  j.chest.rotation.z += L.torsoRoll; j.body.position.y += L.lift;
}

/** Gesten större eller mindre: avvikelsen från vilan gånger amp. Benen, sitthöjden och lyftet ur sitsen (hipDrop) skalas inte,
 *  och armarnas sving begränsas till 2,9 rad (armen går inte bakom huvudet). */
export function scalePose(rest: any, pose: any, amp: number): any {
  if (Math.abs(amp - 1) < 1e-3) return pose;
  const n = (a: number | undefined, b: number | undefined) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * amp;
  const grp = (k: string, fields: string[], cap?: Record<string, number>) => {
    const a = rest[k] ?? {}, b = pose[k] ?? {}, o: any = { ...b };
    fields.forEach((f) => { let v = n(a[f], b[f]); if (cap && cap[f] != null) v = Math.min(cap[f], v); o[f] = v; });
    return o;
  };
  return {
    ...pose, lift: n(rest.lift, pose.lift),
    torso: grp('torso', ['pitch', 'yaw', 'roll']), head: grp('head', ['pitch', 'yaw', 'roll']),
    armL: grp('armL', ['swing', 'lift', 'elbow'], { swing: 2.9, elbow: 2.5 }), armR: grp('armR', ['swing', 'lift', 'elbow'], { swing: 2.9, elbow: 2.5 })
  };
}

/** Ett uttryck i tidsordning: från t går ansiktet över till mood med intensiteten k på transS sekunder. */
export interface FaceBeat { t: number; mood: MoodId; k: number; transS?: number }
/** FaceState (figureFace.ts) vid t, ur uttrycken och livet. initial = uttrycket före första beat. */
export function faceAt(beats: FaceBeat[], initial: { mood: MoodId; k: number }, t: number, transS: number, life?: LifeSample) {
  let to = initial, from = initial, start = -1, dur = transS;
  for (const b of beats) { if (b.t > t) break; from = to; to = { mood: b.mood, k: b.k }; start = b.t; dur = b.transS ?? transS; }
  const k = start < 0 ? 1 : clamp01((t - start) / Math.max(0.05, dur));
  return { from, to, t: k, blink: life ? life.blink : 0, gaze: life ? life.gaze : 0 };
}
