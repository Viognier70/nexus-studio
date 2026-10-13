// figureFace.ts (D12) — levande ansikten. Leverans 2026-10-11, ersätter D11:s figureFace.ts. Samma två skal och samma
// fem uttryck som D11 (godkända 2026-10-11), men ritade som former som kan glida över i varandra:
//   • Övergång: ett uttryck går över i nästa på 0,3–0,6 s (temperamentet väljer, figureLife.ts). Ögon, bryn och mun är
//     polygoner med lika många hörn i alla uttryck, så att varje hörn har en väg från det ena uttrycket till det andra.
//   • Intensitet: svag, tydlig och stark (FACE_INTENSITY). Formen räknas från ett vilande ansikte (NEUTRAL) mot uttrycket:
//     svag 0,5 av vägen, tydlig hela vägen (D11:s ritning), stark 1,3 (förbi D11, större mun och brantare bryn).
//   • Liv: blinkningar och blicken som flyttar sig (ögonen åt sidan). Huvudets små rörelser ligger i figureLife.ts.
// Duken ritas om bara när formen ändras (övergång, blinkning, blick). API:t är D11:s (attachFace, set, update,
// faceCanvas) plus show(state) för övergångarna. update ger { near, far, distM } som förut.

import * as THREE from 'three';
import { FIGURE } from './figureRig';

export type MoodId = 'delighted' | 'content' | 'waiting' | 'impatient' | 'displeased';
export type FaceLod = 'near' | 'far';
export type IntensityId = 'weak' | 'clear' | 'strong';
type Pt = [number, number];
/** eye: vänster öga, 6 hörn (övre vänster, övre mitt, övre höger, nedre höger, nedre mitt, nedre vänster). Höger öga speglas
 *  kring x 80. brow: vänster bryn, 4 hörn (ett bryn med tjockleken 0 syns inte). mouth: 6 hörn (övre läppen vänster → höger,
 *  nedre läppen höger → vänster). gaze: blickens förskjutning i x (dukens px). */
export interface FaceShape { eye: Pt[]; brow: Pt[]; mouth: Pt[]; gaze: number }

export const FACE_D12 = {
  ink: '#2a1c13',
  near: { fullUntilM: 9, goneAtM: 12 },
  far: { fromM: 9, fullFromM: 12, fadeFromM: 30, goneAtM: 42 },
  /** Övergångens längd. Temperamentet väljer inom ramen (figureLife TEMPERAMENT.faceTransS). */
  transitionS: { min: 0.3, max: 0.6, default: 0.45 },
  /** Blinkningen: stängs på 0,05 s och öppnas på 0,09 s. */
  blinkS: { close: 0.05, open: 0.09 },
  /** Hur långt blicken går åt sidan, i dukens px (near, far), vid gaze ±1. */
  gazePx: { near: 9, far: 14 },
  staffMood: 'content' as MoodId,
  patch: { phiLen: 1.5, thetaStart: 1.15, thetaLen: 1.2, lift: 1.012 },
  mask: { phiLen: 1.6, thetaStart: 0.62, thetaLen: 1.2, lift: 1.045, top: 14 },
  canvas: { w: 160, h: 128 }
};

/** Svag, tydlig, stark: hur långt från det vilande ansiktet. Tydlig = D11:s ritning. Platshållare för balance.ts. */
export const FACE_INTENSITY: Record<IntensityId, number> = { weak: 0.5, clear: 1.0, strong: 1.3 };

export const FACE_LOD_BALANCE = {
  nearFullUntilM: null as number | null, nearGoneAtM: null as number | null,
  farFromM: null as number | null, farFullFromM: null as number | null, farFadeFromM: null as number | null, farGoneAtM: null as number | null
};

export function faceLodOpacity(distM: number): { near: number; far: number } {
  const B = FACE_LOD_BALANCE;
  const N = { fullUntilM: B.nearFullUntilM ?? FACE_D12.near.fullUntilM, goneAtM: B.nearGoneAtM ?? FACE_D12.near.goneAtM };
  const F = { fromM: B.farFromM ?? FACE_D12.far.fromM, fullFromM: B.farFullFromM ?? FACE_D12.far.fullFromM, fadeFromM: B.farFadeFromM ?? FACE_D12.far.fadeFromM, goneAtM: B.farGoneAtM ?? FACE_D12.far.goneAtM };
  const k = (a: number, b: number, d: number) => Math.max(0, Math.min(1, (d - a) / (b - a)));
  return { near: 1 - k(N.fullUntilM, N.goneAtM, distM), far: k(F.fromM, F.fullFromM, distM) * (1 - k(F.fadeFromM, F.goneAtM, distM)) };
}

// ---------- formerna ---------------------------------------------------
// Samma ritningar som D11 (drawNear, drawFar), omskrivna till hörn. Ett streck med tjockleken w är en polygon med övre och
// nedre kant w isär. Rektangulära ögon har övre mitt och nedre mitt på kanten; glada ögon (taket) har dem uppdragna.
const rectEye = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [(x0 + x1) / 2, y0], [x1, y0], [x1, y1], [(x0 + x1) / 2, y1], [x0, y1]];
const line3 = (a: Pt, b: Pt, c: Pt, w: number): Pt[] => [[a[0], a[1] - w / 2], [b[0], b[1] - w / 2], [c[0], c[1] - w / 2], [c[0], c[1] + w / 2], [b[0], b[1] + w / 2], [a[0], a[1] + w / 2]];
const brow2 = (a: Pt, b: Pt, w: number): Pt[] => [[a[0], a[1] - w / 2], [b[0], b[1] - w / 2], [b[0], b[1] + w / 2], [a[0], a[1] + w / 2]];
const noBrow = (y: number, x0: number, x1: number): Pt[] => [[x0, y], [x1, y], [x1, y], [x0, y]];

export const FACE_SHAPES: Record<FaceLod, Record<MoodId | 'neutral', FaceShape>> = {
  near: {
    neutral: { eye: rectEye(43, 26, 57, 40), brow: noBrow(20, 38, 62), mouth: line3([62, 82], [80, 82], [98, 82], 8), gaze: 0 },
    delighted: { eye: [[38, 32], [50, 22], [62, 32], [62, 40], [50, 30], [38, 40]], brow: noBrow(18, 38, 62), mouth: [[54, 70], [80, 70], [106, 70], [92, 96], [80, 96], [68, 96]], gaze: 0 },
    content: { eye: rectEye(43, 24, 57, 40), brow: noBrow(20, 38, 62), mouth: line3([56, 76], [80, 88], [104, 76], 8), gaze: 0 },
    waiting: { eye: rectEye(43, 29, 57, 39), brow: noBrow(22, 38, 62), mouth: line3([64, 84], [81, 84], [98, 84], 8), gaze: 9 },
    impatient: { eye: rectEye(43.5, 27.5, 56.5, 40.5), brow: brow2([36, 20], [64, 22], 8), mouth: line3([62, 88], [80, 82], [98, 86], 8), gaze: 0 },
    displeased: { eye: rectEye(43.5, 30, 56.5, 42), brow: brow2([34, 16], [64, 26], 9), mouth: line3([56, 94], [80, 80], [104, 94], 8), gaze: 0 }
  },
  far: {
    neutral: { eye: rectEye(34, 28, 66, 56), brow: noBrow(22, 26, 70), mouth: line3([44, 90], [80, 90], [116, 90], 20), gaze: 0 },
    delighted: { eye: [[28, 43], [50, 23], [72, 43], [72, 61], [50, 41], [28, 61]], brow: noBrow(20, 26, 70), mouth: [[30, 70], [80, 70], [130, 70], [110, 112], [80, 112], [50, 112]], gaze: 0 },
    content: { eye: rectEye(34, 27, 66, 57), brow: noBrow(22, 26, 70), mouth: line3([32, 76], [80, 100], [128, 76], 22), gaze: 0 },
    waiting: { eye: rectEye(34, 38, 66, 56), brow: noBrow(26, 26, 70), mouth: line3([54, 88], [81, 88], [108, 88], 20), gaze: 14 },
    impatient: { eye: rectEye(35, 34, 65, 58), brow: brow2([24, 22], [70, 28], 18), mouth: line3([46, 96], [80, 89], [114, 82], 22), gaze: 0 },
    displeased: { eye: rectEye(35, 37, 65, 59), brow: brow2([24, 16], [72, 36], 20), mouth: line3([32, 106], [80, 80], [128, 106], 22), gaze: 0 }
  }
};

const lerpPts = (a: Pt[], b: Pt[], k: number): Pt[] => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k] as Pt);
export function mixShape(a: FaceShape, b: FaceShape, k: number): FaceShape {
  return { eye: lerpPts(a.eye, b.eye, k), brow: lerpPts(a.brow, b.brow, k), mouth: lerpPts(a.mouth, b.mouth, k), gaze: a.gaze + (b.gaze - a.gaze) * k };
}
/** Uttrycket vid en intensitet: från det vilande ansiktet mot uttrycket, k = FACE_INTENSITY (eller ett tal). */
export function faceShape(lod: FaceLod, mood: MoodId, intensity: IntensityId | number = 'clear'): FaceShape {
  const k = typeof intensity === 'number' ? intensity : FACE_INTENSITY[intensity];
  return mixShape(FACE_SHAPES[lod].neutral, FACE_SHAPES[lod][mood], k);
}

/** Det ett ansikte visar just nu. from → to med k (0..1, före kurvan), blink 0..1, gaze −1..1 (utöver uttryckets egen). */
export interface FaceState { from: { mood: MoodId; k: number }; to: { mood: MoodId; k: number }; t: number; blink: number; gaze: number }
export const ease = (k: number) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, k))) - 1) / 2;
export function shapeOf(lod: FaceLod, s: FaceState): FaceShape {
  const a = faceShape(lod, s.from.mood, s.from.k), b = faceShape(lod, s.to.mood, s.to.k);
  const m = mixShape(a, b, ease(s.t));
  const g = m.gaze + s.gaze * FACE_D12.gazePx[lod];
  const shut = 1 - 0.9 * Math.max(0, Math.min(1, s.blink));
  const cy = (m.eye[0][1] + m.eye[5][1] + m.eye[2][1] + m.eye[3][1]) / 4;
  return { ...m, gaze: g, eye: m.eye.map((p) => [p[0], cy + (p[1] - cy) * shut] as Pt) };
}

// ---------- ritningen ---------------------------------------------------
function poly(x: CanvasRenderingContext2D, pts: Pt[]) { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); x.fill(); }
const mirror = (pts: Pt[]): Pt[] => pts.map((p) => [160 - p[0], p[1]] as Pt);
const shift = (pts: Pt[], dx: number): Pt[] => pts.map((p) => [p[0] + dx, p[1]] as Pt);
function drawShape(x: CanvasRenderingContext2D, lod: FaceLod, f: FaceShape, skin: string) {
  x.clearRect(0, 0, FACE_D12.canvas.w, FACE_D12.canvas.h);
  if (lod === 'far') {
    const T0 = FACE_D12.mask.top;
    x.fillStyle = skin; poly(x, [[30, T0], [130, T0], [150, T0 + 26], [150, 96], [118, 128], [42, 128], [10, 96], [10, T0 + 26]]);
  }
  x.fillStyle = FACE_D12.ink;
  poly(x, shift(f.eye, f.gaze)); poly(x, shift(mirror(f.eye), f.gaze));
  const bw = Math.abs(f.brow[3][1] - f.brow[0][1]) + Math.abs(f.brow[2][1] - f.brow[1][1]);
  if (bw > 0.6) { poly(x, f.brow); poly(x, mirror(f.brow)); }
  poly(x, f.mouth);
}
function canvasOf(): HTMLCanvasElement { const c = document.createElement('canvas'); c.width = FACE_D12.canvas.w; c.height = FACE_D12.canvas.h; return c; }

let geo: THREE.SphereGeometry | null = null, maskGeo: THREE.SphereGeometry | null = null;

export interface FaceHandle {
  near: THREE.Mesh; far: THREE.Mesh; mood: MoodId;
  /** Byter uttryck direkt (D11:s API). */
  set: (m: MoodId, intensity?: IntensityId | number) => void;
  /** Visar ett läge i en övergång. Ritar om bara när formen ändrats. */
  show: (s: FaceState) => void;
  update: (camera: THREE.Camera) => { near: number; far: number; distM: number };
  dispose: () => void;
}

export function attachFace(rig: { joints: { head: THREE.Object3D } }, mood?: MoodId): FaceHandle {
  const r = FIGURE.headRadius, P = FACE_D12.patch, K = FACE_D12.mask;
  if (!geo) geo = new THREE.SphereGeometry(r * P.lift, 16, 12, Math.PI / 2 - P.phiLen / 2, P.phiLen, P.thetaStart, P.thetaLen);
  if (!maskGeo) maskGeo = new THREE.SphereGeometry(r * K.lift, 20, 14, Math.PI / 2 - K.phiLen / 2, K.phiLen, K.thetaStart, K.thetaLen);
  const hm: any = rig.joints.head.children[0];
  const skin = hm && hm.material && hm.material.color ? '#' + hm.material.color.getHexString() : '#d8b48a';
  const layer = (lod: FaceLod, order: number) => {
    const cv = canvasOf(), tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(-1, 1); tex.offset.set(1, 0);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 - order });
    const mesh = new THREE.Mesh(lod === 'far' ? maskGeo! : geo!, mat);
    mesh.name = 'face-' + lod; mesh.position.y = r; mesh.renderOrder = 2 + order; mesh.visible = false;
    rig.joints.head.add(mesh);
    return { cv, ctx: cv.getContext('2d')!, tex, mesh, key: '' };
  };
  const N = layer('near', 0), F = layer('far', 1);
  const V = new THREE.Vector3(), C = new THREE.Vector3();
  const paint = (Ly: typeof N, lod: FaceLod, s: FaceState) => {
    const q = (v: number, n: number) => Math.round(v * n);
    const key = [s.from.mood, q(s.from.k, 20), s.to.mood, q(s.to.k, 20), q(ease(s.t), 24), q(s.blink, 8), q(s.gaze, 16)].join(':');
    if (key === Ly.key) return; Ly.key = key;
    drawShape(Ly.ctx, lod, shapeOf(lod, s), skin); Ly.tex.needsUpdate = true;
  };
  const h: FaceHandle = {
    near: N.mesh, far: F.mesh, mood: mood ?? 'content',
    set(m, intensity) { h.mood = m; const k = typeof intensity === 'number' ? intensity : FACE_INTENSITY[intensity ?? 'clear']; h.show({ from: { mood: m, k }, to: { mood: m, k }, t: 1, blink: 0, gaze: 0 }); },
    show(s) { h.mood = s.t < 0.5 ? s.from.mood : s.to.mood; if (N.mesh.visible || !F.mesh.visible) paint(N, 'near', s); if (F.mesh.visible || !N.mesh.visible) paint(F, 'far', s); },
    update(camera) {
      N.mesh.getWorldPosition(V); camera.getWorldPosition(C);
      const d = V.distanceTo(C), o = faceLodOpacity(d);
      (N.mesh.material as any).opacity = o.near; N.mesh.visible = o.near > 0.01;
      (F.mesh.material as any).opacity = o.far; F.mesh.visible = o.far > 0.01;
      return { ...o, distM: d };
    },
    dispose() { [N, F].forEach((L) => { L.mesh.removeFromParent(); (L.mesh.material as any).dispose(); L.tex.dispose(); }); }
  };
  h.set(h.mood);
  return h;
}

/** Bilden för ett uttryck, för dokumentationen och HUD:en. */
export function faceCanvas(id: MoodId, lod?: FaceLod, skin?: string, intensity?: IntensityId | number): HTMLCanvasElement {
  const cv = canvasOf(), L = lod ?? 'near';
  drawShape(cv.getContext('2d')!, L, shapeOf(L, { from: { mood: id, k: 1 }, to: { mood: id, k: typeof intensity === 'number' ? intensity : FACE_INTENSITY[intensity ?? 'clear'] }, t: 1, blink: 0, gaze: 0 }), skin ?? '#d8b48a');
  return cv;
}
