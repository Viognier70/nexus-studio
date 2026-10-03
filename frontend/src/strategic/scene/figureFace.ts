// figureFace.ts — ansiktena i närbild. Leverans 2026-10-03 (D1).
// Ett tunt skal framför huvudsfären (figureRig: head:sphere, radie 0,12) med fem uttryck: ögon, bryn och mun
// i bläck på huden. Skalet sitter under kalotten och följer huvudets led, så blicken går dit huvudet vrids.
// Riggen ändras inte. Skalet tonas efter kamerans avstånd (guestMood.FACE): osynligt från 9 m och längre bort,
// fullt vid 7 m. Ett skal per figur, men geometrin och de fem texturerna delas.

import * as THREE from 'three';
import { FIGURE } from './figureRig';
import { FACE, faceOpacity } from './guestMood';
import type { MoodId } from './guestMood';

/** Skalets utsnitt av sfären. Under kalotten (som slutar 1,15 rad från hjässan) och 86° brett. */
const PATCH = { phiLen: 1.5, thetaStart: 1.15, thetaLen: 1.2, lift: 1.012 };
const W = 160, H = 128;   // 106,7 px per radian åt båda hållen

let geo: THREE.SphereGeometry | null = null;
const tex = new Map<MoodId, THREE.CanvasTexture>();

function draw(id: MoodId): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d')!;
  x.fillStyle = FACE.ink; x.strokeStyle = FACE.ink; x.lineCap = 'round'; x.lineJoin = 'round';
  const dot = (cx: number, cy: number, r: number) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
  const line = (a: number, b: number, c: number, d: number, w: number) => { x.lineWidth = w; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, w: number) => { x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); };
  const L = 46, R = 114;
  if (id === 'delighted') {
    // Glada ögon som hopknipna bågar och en öppen mun.
    arc(L, 38, 11, Math.PI * 1.05, Math.PI * 1.95, 10); arc(R, 38, 11, Math.PI * 1.05, Math.PI * 1.95, 9);
    x.beginPath(); x.moveTo(54, 74); x.quadraticCurveTo(80, 112, 106, 74); x.closePath(); x.fill();
  } else if (id === 'content') {
    dot(L, 32, 10); dot(R, 32, 10);
    arc(80, 58, 28, Math.PI * 0.22, Math.PI * 0.78, 9);
  } else if (id === 'waiting') {
    // Blicken åt sidan, mot dörren eller personalen, och munnen rak.
    dot(L + 8, 32, 10); dot(R + 8, 32, 10);
    line(66, 86, 96, 86, 9);
  } else if (id === 'impatient') {
    dot(L, 34, 9.5); dot(R, 34, 9.5);
    line(32, 19, 60, 21, 9); line(100, 21, 128, 19, 9);
    line(64, 88, 96, 82, 9);
  } else {
    // Missnöjd: bryn som sluttar inåt och en mun som går nedåt.
    dot(L, 35, 9.5); dot(R, 35, 9.5);
    line(30, 15, 60, 24, 9); line(100, 24, 130, 15, 9);
    arc(80, 112, 26, Math.PI * 1.25, Math.PI * 1.75, 9);
  }
  return cv;
}

function texture(id: MoodId): THREE.CanvasTexture {
  let t = tex.get(id);
  if (!t) {
    t = new THREE.CanvasTexture(draw(id));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    // SphereGeometry lägger u = 0 på figurens vänstra sida; speglas så att bilden ses rättvänd framifrån.
    t.wrapS = THREE.RepeatWrapping; t.repeat.set(-1, 1); t.offset.set(1, 0);
    tex.set(id, t);
  }
  return t;
}

export interface FaceHandle { mesh: THREE.Mesh; mood: MoodId; set: (m: MoodId) => void; update: (camera: THREE.Camera) => number; dispose: () => void }

/** Sätter ett ansikte på riggens huvud. Anropa update(camera) varje bildruta efter applyPose. */
export function attachFace(rig: { joints: { head: THREE.Object3D } }, mood?: MoodId): FaceHandle {
  const r = FIGURE.headRadius;
  if (!geo) geo = new THREE.SphereGeometry(r * PATCH.lift, 16, 12, Math.PI / 2 - PATCH.phiLen / 2, PATCH.phiLen, PATCH.thetaStart, PATCH.thetaLen);
  const mat = new THREE.MeshStandardMaterial({ map: texture(mood ?? 'content'), transparent: true, opacity: 0, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'face'; mesh.position.y = r; mesh.renderOrder = 2; mesh.visible = false;
  rig.joints.head.add(mesh);
  const V = new THREE.Vector3(), C = new THREE.Vector3();
  const h: FaceHandle = {
    mesh, mood: mood ?? 'content',
    set(m) { if (m === h.mood) return; h.mood = m; mat.map = texture(m); mat.needsUpdate = true; },
    update(camera) {
      mesh.getWorldPosition(V); camera.getWorldPosition(C);
      const k = faceOpacity(V.distanceTo(C));
      mat.opacity = k; mesh.visible = k > 0.01;
      return k;
    },
    dispose() { mesh.removeFromParent(); mat.dispose(); }
  };
  return h;
}

/** Bilden för ett uttryck, för dokumentationen. */
export function faceCanvas(id: MoodId): HTMLCanvasElement { return draw(id); }
