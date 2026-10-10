// figureFace.ts — ansiktena (Designs D11, leverans 2026-10-10, ersätter D1:s från 2026-10-03). ORDER 325.
// D1 tände ansiktena först under 9 m. D11 (Anders 2026-10-09): ansiktena ska synas vid Krogen, så att spelaren
// läser gästerna utan symboler. Huvudet förstoras inte (beslut 2026-10-03). I stället finns två skal med samma
// fem uttryck i samma kantiga form (raka streck, fyrkantiga ögon, inga rundade ändar):
//   near  ögon, bryn och mun på D1:s plats, tunna streck.
//   far   samma uttryck förenklat till tre block och tjocka streck, på en mask i hudens färg som ligger
//         över hårfästet (radie 1,045, utanför kalotten 1,03). Från spelets 50° ser kameran mest hjässan: blickens
//         mitt på huvudet ligger 40° från toppen, inne i håret. D1:s mun låg 70° från blicken och försvann. Masken
//         flyttar ansiktet 26° uppåt, så att ögonen ligger 18° och munnen 43° från blicken.
// Gränserna (när skalen tonas in och ut) står i balance.ts FACE_LOD, satta efter kamerans uppmätta avstånd vid
// Krogen (Z) i vinbaren, bistron och vid vagnen (ORDER 325 §2). Mellan skalen tonar de över i varandra; uttrycket är
// detsamma i båda, så inget hoppar.
// Avvikelser från Designs fil: MoodId kommer ur guestMood.ts (som förut), gränserna ur balance.ts i stället för
// konstanter i FACE_D11, och hyn läses ur huvudsfären med three:s typer.
// Riggen ändras inte utöver huvudets lutning (figureRig.ts PoseHead.roll). Geometrin och texturerna delas.

import * as THREE from 'three';
import { FIGURE, DEFAULT_SKIN } from './figureRig';
import { FACE_LOD } from '../../sim/balance';
import type { MoodId } from './guestMood';

export type FaceLod = 'near' | 'far';

export const FACE_D11 = {
  ink: '#2a1c13',
  /** Avstånd kamera → huvud i meter (balance.ts FACE_LOD). */
  near: FACE_LOD.near,
  far: FACE_LOD.far,
  /** Ett nytt uttryck byts in samtidigt som gesten börjar. */
  swapMs: FACE_LOD.swapMs,
  /** Personalen har alltid nöjd. */
  staffMood: 'content' as MoodId,
  /** Skalens utsnitt av sfären. near: under kalotten (1,15 rad från hjässan), 86° brett, som D1.
   *  far: masken från 0,62 rad, 92° bred, utanför kalotten. */
  patch: { phiLen: 1.5, thetaStart: 1.15, thetaLen: 1.2, lift: 1.012 },
  mask: { phiLen: 1.6, thetaStart: 0.62, thetaLen: 1.2, lift: 1.045, top: 14 },
  canvas: { w: 160, h: 128 }
};

/** Hur synligt varje skal är på ett visst avstånd. */
export function faceLodOpacity(distM: number): { near: number; far: number } {
  const N = FACE_D11.near, F = FACE_D11.far;
  const k = (a: number, b: number, d: number) => Math.max(0, Math.min(1, (d - a) / (b - a)));
  const near = 1 - k(N.fullUntilM, N.goneAtM, distM);
  const far = k(F.fromM, F.fullFromM, distM) * (1 - k(F.fadeFromM, F.goneAtM, distM));
  return { near, far };
}

// ---------- ritningen ---------------------------------------------------
// Duken är 160 × 128 px över 1,5 × 1,2 rad (106,7 px per rad). Rad y ligger på polvinkeln 1,15 + y / 106,7.
// near: ögonen på y 30 (84°), munnen på y 82 (110°), som D1. far (masken, rad y på 0,62 + y / 106,7): hårfästet på
// y 14 (43°), ögonen på y 42 (58°), munnen på y 88 (83°).
const L = 50, R = 110;

function drawNear(x: CanvasRenderingContext2D, id: MoodId) {
  const rect = (cx: number, cy: number, w: number, h: number) => x.fillRect(cx - w / 2, cy - h / 2, w, h);
  const pl = (pts: number[][], w: number) => { x.lineWidth = w; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); };
  if (id === 'delighted') {
    pl([[L - 12, 36], [L, 26], [L + 12, 36]], 8); pl([[R - 12, 36], [R, 26], [R + 12, 36]], 8);
    x.beginPath(); x.moveTo(54, 70); x.lineTo(106, 70); x.lineTo(92, 96); x.lineTo(68, 96); x.closePath(); x.fill();
  } else if (id === 'content') {
    rect(L, 32, 14, 16); rect(R, 32, 14, 16);
    pl([[56, 76], [80, 88], [104, 76]], 8);
  } else if (id === 'waiting') {
    rect(L + 9, 34, 14, 10); rect(R + 9, 34, 14, 10);
    pl([[64, 84], [98, 84]], 8);
  } else if (id === 'impatient') {
    rect(L, 34, 13, 13); rect(R, 34, 13, 13);
    pl([[L - 14, 20], [L + 14, 22]], 8); pl([[R - 14, 22], [R + 14, 20]], 8);
    pl([[62, 88], [80, 82], [98, 86]], 8);
  } else {
    rect(L, 36, 13, 12); rect(R, 36, 13, 12);
    pl([[L - 16, 16], [L + 14, 26]], 9); pl([[R - 14, 26], [R + 16, 16]], 9);
    pl([[56, 94], [80, 80], [104, 94]], 8);
  }
}

function drawFar(x: CanvasRenderingContext2D, id: MoodId, skin: string) {
  const rect = (cx: number, cy: number, w: number, h: number) => x.fillRect(cx - w / 2, cy - h / 2, w, h);
  const pl = (pts: number[][], w: number) => { x.lineWidth = w; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); };
  // Masken: en sköld i hudens färg, rak överkant (det nya hårfästet), avfasade hörn. Kantig som figurerna.
  const T0 = FACE_D11.mask.top;
  x.fillStyle = skin; x.beginPath(); x.moveTo(30, T0); x.lineTo(130, T0); x.lineTo(150, T0 + 26); x.lineTo(150, 96); x.lineTo(118, 128); x.lineTo(42, 128); x.lineTo(10, 96); x.lineTo(10, T0 + 26); x.closePath(); x.fill();
  x.fillStyle = FACE_D11.ink;
  // Så stort som masken bär: på 24 m är en skärmpixel 23 px på duken (1280 × 720), så ögonen är 32 px och strecken 20–24.
  const L = 50, R = 110, E = 42, M = 88;
  if (id === 'delighted') {
    // Hopknipna ögon som tak och en stor öppen mun: det mörkaste blocket i ansiktet ligger lågt.
    pl([[L - 22, E + 10], [L, E - 10], [L + 22, E + 10]], 18); pl([[R - 22, E + 10], [R, E - 10], [R + 22, E + 10]], 18);
    x.beginPath(); x.moveTo(30, M - 18); x.lineTo(130, M - 18); x.lineTo(110, M + 24); x.lineTo(50, M + 24); x.closePath(); x.fill();
  } else if (id === 'content') {
    rect(L, E, 32, 30); rect(R, E, 32, 30);
    pl([[32, M - 12], [80, M + 12], [128, M - 12]], 22);
  } else if (id === 'waiting') {
    // Blicken åt sidan och halvslutna ögon, munnen ett kort streck.
    rect(L + 14, E + 5, 32, 18); rect(R + 14, E + 5, 32, 18);
    pl([[54, M], [108, M]], 20);
  } else if (id === 'impatient') {
    rect(L, E + 4, 30, 24); rect(R, E + 4, 30, 24);
    pl([[L - 26, E - 20], [L + 20, E - 14]], 18); pl([[R - 20, E - 14], [R + 26, E - 20]], 18);
    pl([[46, M + 8], [114, M - 6]], 22);
  } else {
    // Missnöjd: bryn som sluttar inåt och möts nästan, munnen som ett tak åt fel håll.
    rect(L, E + 6, 30, 22); rect(R, E + 6, 30, 22);
    pl([[L - 26, E - 26], [L + 22, E - 6]], 20); pl([[R - 22, E - 6], [R + 26, E - 26]], 20);
    pl([[32, M + 18], [80, M - 8], [128, M + 18]], 22);
  }
}

function draw(id: MoodId, lod: FaceLod, skin?: string): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = FACE_D11.canvas.w; cv.height = FACE_D11.canvas.h;
  const x = cv.getContext('2d')!;
  x.fillStyle = FACE_D11.ink; x.strokeStyle = FACE_D11.ink; x.lineCap = 'butt'; x.lineJoin = 'miter'; x.miterLimit = 4;
  if (lod === 'far') drawFar(x, id, skin ?? DEFAULT_SKIN); else drawNear(x, id);
  return cv;
}

let geo: THREE.SphereGeometry | null = null, maskGeo: THREE.SphereGeometry | null = null;
const tex = new Map<string, THREE.CanvasTexture>();
function texture(id: MoodId, lod: FaceLod, skin: string): THREE.CanvasTexture {
  const key = lod + ':' + id + (lod === 'far' ? ':' + skin : '');
  let t = tex.get(key);
  if (!t) {
    t = new THREE.CanvasTexture(draw(id, lod, skin));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.wrapS = THREE.RepeatWrapping; t.repeat.set(-1, 1); t.offset.set(1, 0);
    tex.set(key, t);
  }
  return t;
}

export interface FaceHandle {
  near: THREE.Mesh; far: THREE.Mesh; mood: MoodId;
  set: (m: MoodId) => void;
  /** Anropa varje bildruta efter applyPose. Ger { near, far } som de visas. */
  update: (camera: THREE.Camera) => { near: number; far: number; distM: number };
  dispose: () => void;
}

export function attachFace(rig: { joints: { head: THREE.Object3D } }, mood?: MoodId): FaceHandle {
  const r = FIGURE.headRadius, P = FACE_D11.patch, K = FACE_D11.mask;
  if (!geo) geo = new THREE.SphereGeometry(r * P.lift, 16, 12, Math.PI / 2 - P.phiLen / 2, P.phiLen, P.thetaStart, P.thetaLen);
  if (!maskGeo) maskGeo = new THREE.SphereGeometry(r * K.lift, 20, 14, Math.PI / 2 - K.phiLen / 2, K.phiLen, K.thetaStart, K.thetaLen);
  const m0 = mood ?? 'content';
  const hm = rig.joints.head.children[0] as THREE.Mesh | undefined;
  const hmat = hm?.material as THREE.MeshStandardMaterial | undefined;
  const skin = hmat?.color ? '#' + hmat.color.getHexString() : DEFAULT_SKIN;
  const mk = (lod: FaceLod, order: number) => {
    const mat = new THREE.MeshStandardMaterial({ map: texture(m0, lod, skin), transparent: true, opacity: 0, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 - order });
    const mesh = new THREE.Mesh(lod === 'far' ? maskGeo! : geo!, mat);
    mesh.name = 'face-' + lod; mesh.position.y = r; mesh.renderOrder = 2 + order; mesh.visible = false;
    rig.joints.head.add(mesh);
    return mesh;
  };
  const near = mk('near', 0), far = mk('far', 1);
  const V = new THREE.Vector3(), C = new THREE.Vector3();
  const h: FaceHandle = {
    near, far, mood: m0,
    set(m) {
      if (m === h.mood) return; h.mood = m;
      const nm = near.material as THREE.MeshStandardMaterial, fm = far.material as THREE.MeshStandardMaterial;
      nm.map = texture(m, 'near', skin); nm.needsUpdate = true;
      fm.map = texture(m, 'far', skin); fm.needsUpdate = true;
    },
    update(camera) {
      near.getWorldPosition(V); camera.getWorldPosition(C);
      const d = V.distanceTo(C), o = faceLodOpacity(d);
      (near.material as THREE.MeshStandardMaterial).opacity = o.near; near.visible = o.near > 0.01;
      (far.material as THREE.MeshStandardMaterial).opacity = o.far; far.visible = o.far > 0.01;
      return { ...o, distM: d };
    },
    dispose() { near.removeFromParent(); far.removeFromParent(); (near.material as THREE.Material).dispose(); (far.material as THREE.Material).dispose(); }
  };
  return h;
}

/** Bilden för ett uttryck, för dokumentationen och HUD:en. */
export function faceCanvas(id: MoodId, lod?: FaceLod, skin?: string): HTMLCanvasElement { return draw(id, lod ?? 'near', skin); }
