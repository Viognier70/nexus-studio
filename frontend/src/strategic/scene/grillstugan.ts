// ORDER 332 C — Designs D13 (documentation/leveranser/nexus-leverans-2026-10-12-grillstugan/grillstugan.js):
// grillvagn B, Grillstugan, i TypeScript. Ersätter D7:s släpvagn (playerTruck.ts makePlayerTrailer bygger runt den).
// Samma ram som D7, D10 och D12: +x längs vagnen mot serveringen, +z ut från luckan mot kön, lådan 4,6 × 2,3 m,
// dragkroken i x −3,4. Måtten (STUGAN) står oförändrade; det här är ändrat mot leveransen och varför:
//   - Inga PointLight: spelet har inga riktiga ljuskällor vid vagnen (TruckLife.tsx, prestandabudgeten). Lamporna,
//     fönstret, glöden i grillen och kylens front lyser med emissive.
//   - Ingen egen rök (anim): röken ur skorstenen ritas av TruckLife.tsx efter vädret, från TRUCK_LAYOUT.chimney.
//   - Ingen egen sopkorg, inga egna såser eller servetter på hyllan: spelets sopkorg (D9 bin, luckan som slår upp)
//     och D10:s hylla med såserna och locken (TruckSituationsScene.tsx) står kvar, och betalhyllan är hyllan under
//     luckan (playerTruck.ts). Grillens korvar är D10:s (vegodelen och tängerna, playerTruck.ts).
//   - Taket, kylskåpets tak och markisens duk tonar med husens regel i spelet (village/roofBlend.ts roofAt, BLEND.roof
//     26 → 40 m) i stället för grillvagnar.js roofOpacity (samma avstånd, rak linje i stället för smoothstep).
//   - Texturerna ritas på canvas bara när det finns ett dokument (testerna kör utan); annars enfärgat.
// Texten: inga ord i modellen (skylten och menyn är bilder och kritstreck).

import * as THREE from 'three';
import { roofAt } from '../village/roofBlend';

export type Vec2 = [number, number];
export interface Rect { x0: number; x1: number; z0: number; z1: number }
export interface Shelter extends Rect { id: 'roof' | 'flap' | 'fridge' | 'menu' | 'awning'; y: number }

/** D12 grillvagnar.js TRUCK_FRAME (lådan och kroken). */
export const TRUCK_FRAME = { body: { x0: -2.3, x1: 2.3, z0: -1.15, z1: 1.15 }, hitch: [-3.4, 0] as Vec2 };
/** D12 grillvagnar.js färgerna. */
export const STUGAN_COLOURS = { liv: '#2f4b6e', cream: '#efe1bf', steel: '#b8b2a8', ink: '#2a2421' } as const;

/** D13 STUGAN, oförändrad (TRUCKS.B från D12 inläst). */
export const STUGAN = {
  id: 'B', name: 'grillstugan', floorY: 0.38, counterY: 1.2,
  hatch: { x0: -1.3, x1: 1.3, y0: 1.2, y1: 2.4 },
  /** Där de två i vagnen står: yaw 0 = mot luckan. */
  stations: { grill: { pos: [0.8, 0.12] as Vec2, yaw: 0 }, hatch: { pos: [-0.6, 0.55] as Vec2, yaw: 0 } },
  door: [2.75, 0.55] as Vec2,
  /** Medhjälparens väg ute längs kön, från dörren. */
  helper: [[2.75, 1.7], [1.4, 3.05], [-1.6, 3.05], [-5.4, 3.05]] as Vec2[],
  grill: { x0: 0.35, x1: 1.25, z0: 0.58, z1: 1.08 },
  eaveY: 2.55, ridgeY: 3.05, bodyBottomY: 0.36, overhangM: 0.22,
  flap: { lengthM: 1.08, angleDeg: 100 },
  /** Kylen står i ett eget skåp mot västra gaveln, med front mot kön. */
  fridge: { x0: -2.92, x1: -2.4, z0: 0.42, z1: 0.92, cabinet: { x0: -3.06, x1: -2.3, z0: 0.24, z1: 1.1, roofY: 2.02 } },
  shelf: { x0: -1.3, x1: 1.3, z0: 1.15, z1: 1.47, y: 1.15 },
  payLedge: { x0: -0.95, x1: -0.25, z0: 1.16, z1: 1.48 }, terminal: [-0.47, 1.33] as Vec2,
  menuStand: { p: [-3.35, 1.55] as Vec2, yaw: -0.35 },
  gasBox: { x0: -3.02, x1: -2.52, z0: -0.78, z1: -0.28 },
  socket: [-1.6, -2.45] as Vec2,
  wheels: { x: [-0.38, 0.38], r: 0.27, z: 1.03 },
  legs: [[-2.12, -0.98], [2.12, -0.98], [-2.12, 0.98], [2.12, 0.98]] as Vec2[],
  sign: { x: 2.34, y: 2.78, z: 0, w: 1.3, h: 0.34 },
  window: { x: 2.3, z: -0.5, y0: 1.25, y1: 1.9, w: 0.62 },
  /** Tillvalet (butikens Utrustning). x/z är markisens fotavtryck, yIn vid väggen och yOut vid kanten. */
  awning: { item: 'equipment.queueAwning', x0: -4.6, x1: -1.35, z0: 1.19, z1: 2.95, yIn: 2.45, yOut: 2.2, posts: [[-4.6, 2.95], [-1.35, 2.95], [-4.6, 1.24]] as Vec2[] }
} as const;

/** ORDER 332 C — elstolpen. D13 STUGAN.socket [−1,6; −2,45] står 1,3 m bakom vagnen: på Prästgatan och vid
 *  Gästgivaregården (D15) är det körbanan och trottoaren (order332Grillstugan.test.ts, layoutkontrollen). Här står den
 *  vid västra gaveln bredvid dragstången, innanför D15:s prövade låda (z ≥ −1,6), och kabeln går till gaveln. */
export const POWER_POST: Vec2 = [-3.7, -0.85];

/** Luckans skiva: ytterkanten (z, y) när den är uppfälld (D13 flapEdge). */
export function flapEdge(): { z: number; y: number; hingeY: number } {
  const S = STUGAN, phi = (S.flap.angleDeg * Math.PI) / 180, hy = S.hatch.y1 + 0.06;
  return { z: TRUCK_FRAME.body.z1 + S.flap.lengthM * Math.sin(phi), y: hy - S.flap.lengthM * Math.cos(phi), hingeY: hy };
}

/** Det som håller regnet borta (D13 stuganShelters): rektanglar med takets höjd. Markisen bara när den är köpt. */
export function stuganShelters(awningOn: boolean): Shelter[] {
  const S = STUGAN, B = TRUCK_FRAME.body, o = S.overhangM, fl = flapEdge(), c = S.fridge.cabinet, a = S.awning;
  const list: Shelter[] = [
    { id: 'roof', x0: B.x0 - 0.17, x1: B.x1 + 0.17, z0: B.z0 - o, z1: B.z1 + o, y: S.eaveY },
    { id: 'flap', x0: S.hatch.x0 - 0.1, x1: S.hatch.x1 + 0.1, z0: B.z1, z1: fl.z, y: fl.y },
    { id: 'fridge', x0: c.x0 - 0.04, x1: c.x1, z0: c.z0, z1: c.z1 + 0.06, y: c.roofY },
    { id: 'menu', x0: S.menuStand.p[0] - 0.52, x1: S.menuStand.p[0] + 0.52, z0: S.menuStand.p[1] - 0.16, z1: S.menuStand.p[1] + 0.2, y: 2.08 }
  ];
  if (awningOn) list.push({ id: 'awning', x0: a.x0, x1: a.x1, z0: a.z0, z1: a.z1, y: a.yOut });
  return list;
}

/** Höjden på skyddet över en punkt i vagnens ram (0 = under bar himmel). D13 truckRain.js shelterTop. */
export function shelterTop(x: number, z: number, list: readonly Shelter[]): number {
  let y = 0;
  for (const r of list) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) y = Math.max(y, r.y);
  return y;
}

interface WetEntry { m: THREE.MeshStandardMaterial; c: THREE.Color; r: number; dk: number }

/** Grillstugan i scenen: gruppen och det som ändras under kvällen. */
export interface Stugan {
  group: THREE.Group;
  /** Tonar ut med husens tak (roofAt): sadeltaket, nockplåten och kylskåpets tak. */
  roof: THREE.Mesh[];
  /** Markisens duk och bakre list: tonar som taket. */
  canopy: THREE.Mesh[];
  /** Allt som hör till markisen (duken, festongerna, stolparna, glödlamporna). */
  awningGroup: THREE.Group;
  awningOn: boolean;
  wetK: number;
  setAwning(on: boolean): void;
  /** Våt: trä, plåt och duk mörknar och glänser. k 0–1. */
  setWet(k: number): void;
}

const hasDocument = () => typeof document !== 'undefined' && typeof document.createElement === 'function';

export function buildGrillstugan(opts: { awning?: boolean } = {}): Stugan {
  const S = STUGAN, C = STUGAN_COLOURS;
  const g = new THREE.Group();
  g.name = 'grillstugan';
  const awningGroup = new THREE.Group();
  awningGroup.name = 'queueAwning';
  g.add(awningGroup);
  const roof: THREE.Mesh[] = [], canopy: THREE.Mesh[] = [], wet: WetEntry[] = [];
  const W = <T extends THREE.MeshStandardMaterial>(m: T, dk = 0.28): T => { wet.push({ m, c: m.color.clone(), r: m.roughness, dk }); return m; };
  const M = (c: string, r = 0.8, mt = 0, e?: string, ei = 1.2) => {
    const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
    if (e) { x.emissive = new THREE.Color(e); x.emissiveIntensity = ei; }
    return x;
  };
  const tex = (w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => 'alpha' | void, rep?: [number, number]): THREE.Texture | null => {
    if (!hasDocument()) return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (!x) return null;
    const a = draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    if (a === 'alpha') t.userData.alpha = true;
    return t;
  };
  /** Material med textur, eller enfärgat utan dokument. */
  const T = (map: THREE.Texture | null, fallback: string, r = 0.85, e?: number) => {
    if (!map) return M(fallback, r);
    const alpha = !!map.userData.alpha;
    const x = new THREE.MeshStandardMaterial({ map, roughness: r, transparent: alpha, alphaTest: alpha ? 0.4 : 0 });
    if (e) { x.emissive = new THREE.Color('#ffffff'); x.emissiveMap = map; x.emissiveIntensity = e; }
    return x;
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, p: THREE.Object3D = g, name = 'stugan') => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.castShadow = true; o.receiveShadow = true; o.name = name;
    p.add(o);
    return o;
  };
  const cyl = (r: number, h: number, m: THREE.Material, x: number, y: number, z: number, ax: 'x' | 'z' | null = null, p: THREE.Object3D = g, seg = 18) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
    o.position.set(x, y, z);
    if (ax === 'x') o.rotation.z = Math.PI / 2;
    if (ax === 'z') o.rotation.x = Math.PI / 2;
    o.castShadow = true; o.name = 'stugan';
    p.add(o);
    return o;
  };
  const seg = (a: readonly number[], b: readonly number[], r: number, m: THREE.Material, p: THREE.Object3D = g) => {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), m);
    o.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    o.castShadow = true; o.name = 'stugan';
    p.add(o);
    return o;
  };
  const bulbs = (pts: readonly (readonly number[])[], p: THREE.Object3D = g) => {
    const bm = M('#ffd58f', 1, 0, '#ffb040', 1.6);
    pts.forEach((q) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bm); o.position.set(q[0], q[1], q[2]); o.name = 'stuganBulb'; p.add(o); });
  };
  const stripes = (a: string, b: string, n: number) => tex(256, 32, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * w) / n, 0, w / n + 1, h); } });
  const valance = (a: string, b: string, n: number) => tex(512, 64, (x, w, h) => {
    const sw = w / n;
    for (let i = 0; i < n; i++) {
      x.fillStyle = i % 2 ? b : a; x.beginPath(); x.moveTo(i * sw, 0); x.lineTo((i + 1) * sw, 0); x.lineTo((i + 1) * sw, h * 0.45);
      x.arc((i + 0.5) * sw, h * 0.45, sw / 2, 0, Math.PI); x.closePath(); x.fill();
    }
    return 'alpha';
  });
  const sausageIcon = (x: CanvasRenderingContext2D, cx: number, cy: number, s: number, col: string, bun: string | null) => {
    if (bun) { x.fillStyle = bun; x.beginPath(); x.ellipse(cx, cy + s * 0.12, s * 0.62, s * 0.2, 0, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, s * 0.7, s * 0.13, 0, 0, Math.PI * 2); x.fill();
  };
  const cupIcon = (x: CanvasRenderingContext2D, cx: number, cy: number, s: number, col: string) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(cx - s * 0.3, cy - s * 0.35); x.lineTo(cx + s * 0.3, cy - s * 0.35); x.lineTo(cx + s * 0.22, cy + s * 0.35); x.lineTo(cx - s * 0.22, cy + s * 0.35); x.closePath(); x.fill();
  };
  const chalkMenu = (rows: number) => tex(256, 256, (x, w, h) => {
    x.fillStyle = '#5e4b3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#2b2a28'; x.fillRect(14, 14, w - 28, h - 28);
    x.strokeStyle = 'rgba(236,230,214,.85)'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, 44); x.lineTo(150, 44); x.stroke();
    sausageIcon(x, 196, 44, 36, 'rgba(230,187,52,.95)', null);
    for (let i = 0; i < rows; i++) {
      const y = 84 + i * (150 / rows);
      x.lineWidth = 5; x.strokeStyle = 'rgba(236,230,214,.75)';
      if (i % 3 === 2) cupIcon(x, 48, y, 26, 'rgba(236,230,214,.8)'); else sausageIcon(x, 48, y, 26, 'rgba(236,230,214,.8)', i % 3 ? 'rgba(214,164,92,.8)' : null);
      x.beginPath(); x.moveTo(76, y); x.lineTo(150 + (i % 2) * 24, y); x.stroke();
      x.fillStyle = 'rgba(230,187,52,.9)'; x.beginPath(); x.arc(212, y, 7, 0, Math.PI * 2); x.fill();
    }
  });
  const signTex = (bg: string, fg: string) => tex(512, 128, (x, w, h) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20);
    sausageIcon(x, w / 2, h / 2, 150, fg, '#c8a46a');
    [-1, 1].forEach((s) => { x.fillStyle = fg; x.beginPath(); x.arc(w / 2 + s * 180, h / 2, 11, 0, Math.PI * 2); x.fill(); });
  });
  const boards = (c1: string, c2: string, rep: [number, number] = [3, 1]) => tex(256, 256, (x, _w, h) => {
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 3 === 1 ? c2 : c1; x.fillRect(i * 32, 0, 32, h); x.fillStyle = 'rgba(20,10,4,.5)'; x.fillRect(i * 32, 0, 2, h);
      for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(60,30,12,.18)'; x.fillRect(i * 32 + 6 + ((k * 7) % 20), (k * 53 + i * 31) % h, 2, 30); }
    }
  }, rep);
  // Plåttaket med falsar som löper från nock till takfot.
  const seams = () => tex(512, 64, (x, w, h) => {
    x.fillStyle = '#3f3d3a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const sx = (i * w) / 9; x.fillStyle = 'rgba(255,248,236,.13)'; x.fillRect(sx, 0, 4, h); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(sx + 4, 0, 3, h); }
  });
  const tinMat = () => {
    const map = seams();
    const m = map ? new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.35 }) : M('#3f3d3a', 0.55, 0.35);
    m.transparent = true;
    return W(m, 0.18);
  };

  const B = TRUCK_FRAME.body, Lx = B.x1 - B.x0, Wz = B.z1 - B.z0, H = S.hatch, F = S.floorY, eave = S.eaveY, ridge = S.ridgeY, bot = S.bodyBottomY, wall = 0.06;
  const wood = W(T(boards('#a77b4c', '#9a6f43'), '#a77b4c', 0.85), 0.3), blue = W(M(C.liv, 0.6), 0.22), steel = M(C.steel, 0.35, 0.6), dark = M('#1e1c1b', 0.9);
  const darkWood = W(T(boards('#6a4a2e', '#5d4128', [2, 1]), '#6a4a2e', 0.9), 0.25);
  const glass = new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28 });

  // ---------- chassit: tandemaxel bakom en mörk kjol, stödben i hörnen, dragstång med kopplingshuvud och stödhjul ----------
  const wh = S.wheels;
  [-1, 1].forEach((s) => wh.x.forEach((x) => { cyl(wh.r, 0.19, dark, x, wh.r, s * wh.z, 'z'); cyl(wh.r * 0.55, 0.2, M('#77736c', 0.4, 0.5), x, wh.r, s * wh.z, 'z'); }));
  [-1, 1].forEach((s) => {
    const z = s * (Wz / 2 - 0.01);
    ([[B.x0, -0.78], [0.78, B.x1]] as const).forEach(([a, b]) => box(b - a, bot - 0.08, 0.04, darkWood, (a + b) / 2, (0.08 + bot) / 2, z));
    box(1.56, 0.06, 0.06, blue, 0, bot - 0.02, z + s * 0.02);
  });
  [B.x0 + 0.01, B.x1 - 0.01].forEach((x) => box(0.04, bot - 0.08, Wz, darkWood, x, (0.08 + bot) / 2, 0));
  S.legs.forEach(([x, z]) => { cyl(0.028, bot, steel, x, bot / 2, z); box(0.16, 0.02, 0.16, steel, x, 0.01, z); });
  [-0.62, 0.62].forEach((z) => seg([B.x0, 0.42, z], [TRUCK_FRAME.hitch[0] + 0.12, 0.42, 0], 0.035, dark));
  box(0.24, 0.1, 0.12, dark, TRUCK_FRAME.hitch[0] + 0.05, 0.44, 0, g, 'trailerDrawbar');
  cyl(0.04, 0.36, dark, -3.05, 0.24, 0.12); cyl(0.08, 0.05, dark, -3.05, 0.08, 0.12, 'z');
  const gb = S.gasBox;
  box(gb.x1 - gb.x0, 0.62, gb.z1 - gb.z0, wood, (gb.x0 + gb.x1) / 2, 0.47 + 0.31, (gb.z0 + gb.z1) / 2, g, 'gasBox');
  box(gb.x1 - gb.x0 + 0.04, 0.04, gb.z1 - gb.z0 + 0.04, blue, (gb.x0 + gb.x1) / 2, 1.11, (gb.z0 + gb.z1) / 2);

  // ---------- väggarna, golvet och gavlarna ----------
  box(Lx - 0.12, 0.04, Wz - 0.12, M('#d2b88f', 0.8), 0, F - 0.02, 0, g, 'trailerFloor');
  box(Lx, H.y0 - bot, wall, wood, 0, (bot + H.y0) / 2, B.z1 - wall / 2);
  box(Lx, eave - bot, wall, wood, 0, (bot + eave) / 2, B.z0 + wall / 2);
  [B.x0 + wall / 2, B.x1 - wall / 2].forEach((x) => box(wall, eave - bot, Wz, wood, x, (bot + eave) / 2, 0));
  box(H.x0 - B.x0, eave - H.y0, wall, wood, (B.x0 + H.x0) / 2, (H.y0 + eave) / 2, B.z1 - wall / 2);
  box(B.x1 - H.x1, eave - H.y0, wall, wood, (H.x1 + B.x1) / 2, (H.y0 + eave) / 2, B.z1 - wall / 2);
  box(H.x1 - H.x0, eave - H.y1, wall, wood, 0, (H.y1 + eave) / 2, B.z1 - wall / 2);
  [B.x0 + wall / 2, B.x1 - wall / 2].forEach((x) => {
    const sh = new THREE.Shape(); sh.moveTo(-Wz / 2, 0); sh.lineTo(Wz / 2, 0); sh.lineTo(0, ridge - eave); sh.closePath();
    const o = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: wall, bevelEnabled: false }), wood);
    o.rotation.y = Math.PI / 2; o.position.set(x - wall / 2, eave, 0); o.castShadow = true; o.name = 'stuganGable'; g.add(o);
  });
  ([[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]] as const).forEach(([x, z]) => box(0.12, eave - bot, 0.12, blue, x, (bot + eave) / 2, z));
  [B.z0, B.z1].forEach((z) => box(Lx + 0.12, 0.07, 0.07, blue, 0, bot + 0.035, z + Math.sign(z) * 0.01));
  box(H.x1 - H.x0 + 0.16, 0.08, 0.05, blue, 0, H.y0 - 0.02, B.z1 + 0.02);
  [H.x0 - 0.04, H.x1 + 0.04].forEach((x) => box(0.08, H.y1 - H.y0, 0.05, blue, x, (H.y0 + H.y1) / 2, B.z1 + 0.02));

  // ---------- sadeltaket med falsar och nockplåt (tonar), vindskivor, takrännor och stuprör (står kvar) ----------
  const o = S.overhangM, half = Math.hypot(Wz / 2 + o, ridge - eave + 0.05), pitch = Math.atan2(ridge - eave + 0.05, Wz / 2 + o);
  const tin = tinMat();
  [-1, 1].forEach((s) => { const r = box(Lx + 0.34, 0.05, half, tin, 0, (eave + ridge) / 2 - 0.02, s * (Wz / 4 + o / 2), g, 'trailerRoof'); r.rotation.x = s * pitch; roof.push(r); });
  const ridgeMat = M('#2e2c2a', 0.5, 0.4); ridgeMat.transparent = true;
  roof.push(box(Lx + 0.36, 0.06, 0.16, ridgeMat, 0, ridge + 0.03, 0, g, 'trailerRoof'));
  [-1, 1].forEach((s) => box(Lx + 0.34, 0.14, 0.04, blue, 0, eave - 0.05, s * (Wz / 2 + o)));
  [B.x0 - 0.17, B.x1 + 0.17].forEach((x) => [-1, 1].forEach((s) => { const v = box(0.04, 0.14, half, blue, x, (eave + ridge) / 2 - 0.02, s * (Wz / 4 + o / 2)); v.rotation.x = s * pitch; }));
  const gut = M('#5d5a55', 0.35, 0.6), gz = Wz / 2 + o + 0.05;
  [-1, 1].forEach((s) => cyl(0.05, Lx + 0.3, gut, 0, eave - 0.12, s * gz, 'x', g, 10));
  ([[B.x0 - 0.1, gz], [B.x1 + 0.1, gz], [B.x0 - 0.1, -gz]] as const).forEach(([x, z]) => { cyl(0.035, eave - 0.2, gut, x, (eave - 0.12) / 2 + 0.02, z, null, g, 10); box(0.16, 0.05, 0.1, gut, x + Math.sign(x) * 0.05, 0.08, z); });
  // glödlampor under takfoten
  bulbs(Array.from({ length: 9 }, (_, i) => [B.x0 + 0.15 + (i * (Lx - 0.3)) / 8, eave - 0.24 - 0.05 * Math.sin((i * Math.PI) / 2) ** 2, Wz / 2 + o - 0.05]));

  // ---------- skylten på östra gaveln, fönstret och dörren med trappsteg och lykta ----------
  const sg = S.sign;
  const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(sg.w, sg.h), T(signTex(C.cream, C.liv), C.cream, 0.8, 0.45));
  signPlane.position.set(sg.x + 0.03, sg.y, sg.z); signPlane.rotation.y = Math.PI / 2; signPlane.name = 'trailerSign'; g.add(signPlane);
  box(0.04, sg.h + 0.08, sg.w + 0.08, blue, sg.x, sg.y, sg.z, g, 'trailerSignFrame');
  const wn = S.window;
  box(0.05, wn.y1 - wn.y0 + 0.1, wn.w + 0.1, blue, wn.x + 0.02, (wn.y0 + wn.y1) / 2, wn.z);
  box(0.02, wn.y1 - wn.y0, wn.w, M('#ffe2ad', 0.4, 0, '#ffbe6a', 0.7), wn.x + 0.045, (wn.y0 + wn.y1) / 2, wn.z, g, 'stuganWindow');
  box(0.03, wn.y1 - wn.y0, 0.03, blue, wn.x + 0.055, (wn.y0 + wn.y1) / 2, wn.z);
  box(0.03, 0.03, wn.w, blue, wn.x + 0.055, (wn.y0 + wn.y1) / 2, wn.z);
  box(0.04, 1.96, 0.86, blue, B.x1 + 0.02, F + 0.98, 0.4);
  box(0.035, 1.9, 0.78, W(M('#294260', 0.6)), B.x1 + 0.04, F + 0.95, 0.4, g, 'stuganDoor');
  box(0.02, 0.42, 0.42, M('#ffe2ad', 0.3, 0, '#ffbe6a', 0.6), B.x1 + 0.06, F + 1.5, 0.4);
  cyl(0.02, 0.14, steel, B.x1 + 0.09, F + 1.0, 0.72, 'z');
  box(0.62, 0.05, 0.7, darkWood, B.x1 + 0.31, 0.2, 0.4, g, 'stuganStep'); box(0.05, 0.2, 0.7, darkWood, B.x1 + 0.6, 0.1, 0.4); box(0.3, 0.05, 0.7, darkWood, B.x1 + 0.77, 0.1, 0.4);
  box(0.14, 0.2, 0.14, M('#ffd58f', 1, 0, '#ffb040', 1.6), B.x1 + 0.1, F + 2.06, 0.98, g, 'stuganLantern');

  // ---------- disken och showgrillen i luckan, huven och skorstenen ----------
  box(H.x1 - H.x0, 0.05, 0.5, M('#6e5137', 0.6), 0, H.y0, B.z1 - 0.26, g, 'trailerCounter');
  box(H.x1 - H.x0, H.y0 - F, 0.45, wood, 0, (F + H.y0) / 2, B.z1 - 0.27);
  const gr = S.grill, gx = (gr.x0 + gr.x1) / 2, gzc = (gr.z0 + gr.z1) / 2;
  box(gr.x1 - gr.x0, 0.2, gr.z1 - gr.z0, M('#1f1c1a', 0.6, 0.4), gx, H.y0 + 0.1, gzc, g, 'trailerGrill');
  box(gr.x1 - gr.x0 - 0.08, 0.02, gr.z1 - gr.z0 - 0.08, M('#3a1606', 0.9, 0, '#ff6a1a', 1.4), gx, H.y0 + 0.17, gzc, g, 'grillEmbers');
  for (let i = 0; i < 7; i++) box(0.012, 0.012, gr.z1 - gr.z0 - 0.06, steel, gr.x0 + 0.06 + i * 0.13, H.y0 + 0.215, gzc);
  box(0.95, 0.3, 0.55, steel, gx, F + 1.75, gzc - 0.05, g, 'grillHood'); box(0.57, 0.2, 0.33, steel, gx, F + 2.0, gzc - 0.05);
  cyl(0.09, 3.4 - F - 2.0, steel, gx, (F + 2.0 + 3.4) / 2, gzc - 0.05, null, g, 18).name = 'trailerChimney';
  box(0.26, 0.04, 0.26, steel, gx, 3.46, gzc - 0.05);
  // inne: hylla med bröd och en bänk mot bakväggen
  box(1.6, 0.04, 0.32, M('#6e5137', 0.6), -1.2, F + 1.45, B.z0 + 0.22);
  for (let i = 0; i < 6; i++) box(0.16, 0.07, 0.09, M('#c8a46a', 0.8), -1.85 + i * 0.26, F + 1.51, B.z0 + 0.22);
  box(2.6, 0.9, 0.5, M('#b9b3a6', 0.5, 0.3), -0.6, F + 0.45, B.z0 + 0.31, g, 'backBench'); box(2.6, 0.04, 0.54, steel, -0.6, F + 0.92, B.z0 + 0.31);

  // ---------- luckan: träskivan fälld upp på stöttor, festonger längst ut ----------
  const fe = flapEdge(), flapL = S.flap.lengthM;
  const flap = box(H.x1 - H.x0 + 0.2, 0.05, flapL, wood, 0, (fe.hingeY + fe.y) / 2, (B.z1 + fe.z) / 2, g, 'stuganFlap');
  flap.rotation.x = -Math.atan2(fe.y - fe.hingeY, fe.z - B.z1);
  const valancePlane = (x0: number, x1: number, z: number, yTop: number, h: number, map: THREE.Texture | null, p: THREE.Object3D, name: string) => {
    const mat = T(map, C.cream, 0.9);
    mat.side = THREE.DoubleSide;
    const v = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, h), mat);
    v.position.set((x0 + x1) / 2, yTop - h / 2, z); v.name = name;
    p.add(v);
    return v;
  };
  valancePlane(H.x0 - 0.1, H.x1 + 0.1, fe.z + 0.01, fe.y + 0.01, 0.2, valance(C.liv, C.cream, 12), g, 'flapValance');
  [H.x0 + 0.1, H.x1 - 0.1].forEach((x) => seg([x, H.y0, B.z1 + 0.05], [x, fe.y - 0.02, fe.z - 0.04], 0.018, blue));
  // Lyktorna på var sida om luckan (emissive; inga PointLight i spelet).
  [H.x0 - 0.25, H.x1 + 0.25].forEach((x) => box(0.14, 0.2, 0.14, M('#ffd58f', 1, 0, '#ffb040', 1.6), x, 2.05, B.z1 + 0.1, g, 'hatchLantern'));

  // ---------- kylen i eget skåp mot västra gaveln, med pulpettak (tonar) ----------
  const f = S.fridge, cb = f.cabinet, fw = f.x1 - f.x0, fd = f.z1 - f.z0, fh = 1.72, fcx = (f.x0 + f.x1) / 2, fcz = (f.z0 + f.z1) / 2;
  box(fw, fh, fd, M('#e3e0d8', 0.5, 0.1), fcx, fh / 2 + 0.04, fcz, g, 'fridge');
  box(fw - 0.1, fh - 0.2, 0.01, M('#eef6f8', 0.2, 0, '#dff1f6', 0.9), fcx, fh / 2 + 0.09, f.z1 + 0.006);
  const fc = ['#2f5d8a', '#c9a227', '#e9e2cf', '#3f6f4f', '#b98a3c'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cyl(0.03, 0.2, M(fc[(r + c) % 5], 0.4), f.x0 + 0.08 + (c * (fw - 0.16)) / 3, 0.38 + r * 0.34, f.z1 + 0.026, null, g, 8);
  box(fw, fh, 0.02, glass, fcx, fh / 2 + 0.04, f.z1 + 0.045);
  box(0.05, cb.roofY - 0.04, cb.z1 - cb.z0, wood, cb.x0 + 0.025, cb.roofY / 2, (cb.z0 + cb.z1) / 2, g, 'fridgeCabinet');
  box(cb.x1 - cb.x0, 0.06, cb.z1 - cb.z0, wood, (cb.x0 + cb.x1) / 2, 0.03, (cb.z0 + cb.z1) / 2);
  box(cb.x1 - cb.x0, 0.12, 0.05, blue, (cb.x0 + cb.x1) / 2, cb.roofY - 0.1, cb.z1);
  const lr = box(cb.x1 - cb.x0 + 0.12, 0.04, cb.z1 - cb.z0 + 0.14, tinMat(), (cb.x0 + cb.x1) / 2 - 0.06, cb.roofY + 0.02, (cb.z0 + cb.z1) / 2, g, 'fridgeRoof');
  lr.rotation.z = 0.12; roof.push(lr);

  // ---------- menyn på ett ställ, vänd mot kön, med ett eget litet tak ----------
  const ms = S.menuStand, st = new THREE.Group();
  st.position.set(ms.p[0], 0, ms.p[1]); st.rotation.y = ms.yaw; st.name = 'menuStand'; g.add(st);
  box(1.0, 0.85, 0.05, darkWood, 0, 1.55, 0, st);
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.76), T(chalkMenu(4), '#2b2a28', 0.8, 0.12));
  mp.position.set(0, 1.55, 0.03); st.add(mp);
  [-0.42, 0.42].forEach((x) => box(0.05, 1.15, 0.05, darkWood, x, 0.57, 0, st));
  [-1, 1].forEach((s) => { const r = box(1.12, 0.03, 0.22, blue, 0, 2.03, s * 0.08, st); r.rotation.x = -s * 0.5; });

  // ---------- strömmen: kabel från västra gaveln till elstolpen (POWER_POST) ----------
  const sk = POWER_POST, cm = M('#151413', 0.7);
  box(0.24, 0.92, 0.2, M('#4a5a52', 0.6, 0.2), sk[0], 0.46, sk[1], g, 'powerPost'); box(0.04, 0.08, 0.08, M('#c9a227', 0.5), sk[0] + 0.13, 0.7, sk[1]);
  seg([sk[0] + 0.14, 0.7, sk[1]], [sk[0] + 0.4, 0.03, sk[1] + 0.05], 0.014, cm);
  seg([sk[0] + 0.4, 0.03, sk[1] + 0.05], [B.x0 - 0.15, 0.03, sk[1] + 0.05], 0.014, cm);
  seg([B.x0 - 0.15, 0.03, sk[1] + 0.05], [B.x0 - 0.02, 0.6, sk[1] + 0.05], 0.014, cm);

  // ---------- tillvalet: markisen över kön, på stolpar ----------
  const a = S.awning;
  const fabric = W(T(stripes(C.liv, C.cream, 16), C.cream, 0.9), 0.3);
  fabric.transparent = true;
  const len = Math.hypot(a.z1 - a.z0, a.yIn - a.yOut);
  const cloth = box(a.x1 - a.x0, 0.025, len, fabric, (a.x0 + a.x1) / 2, (a.yIn + a.yOut) / 2, (a.z0 + a.z1) / 2, awningGroup, 'awningCloth');
  cloth.rotation.x = Math.atan2(a.yIn - a.yOut, a.z1 - a.z0);
  canopy.push(cloth);
  // Festongerna längs ytterkanten står kvar på krogens nivå, så att det syns från 24 m att markisen är köpt.
  const qv = valancePlane(a.x0, a.x1, a.z1 + 0.01, a.yOut + 0.01, 0.2, valance(C.liv, C.cream, 16), awningGroup, 'awningValance');
  W(qv.material as THREE.MeshStandardMaterial, 0.3);
  a.posts.forEach(([x, z]) => { cyl(0.035, a.yOut, M(C.ink, 0.6, 0.3), x, a.yOut / 2, z, null, awningGroup).name = 'awningPost'; box(0.14, 0.03, 0.14, M(C.ink, 0.6, 0.3), x, 0.015, z, awningGroup); });
  const railMat = M(C.ink, 0.6, 0.3); railMat.transparent = true;
  canopy.push(seg([a.x0, a.yIn, a.z0 + 0.02], [B.x0 - 0.06, a.yIn + 0.02, a.z0 + 0.02], 0.025, railMat, awningGroup));
  bulbs([-4.3, -3.6, -2.9, -2.2, -1.6].map((x) => [x, a.yOut - 0.04, a.z1]), awningGroup);
  canopy.forEach((m) => { const mat = m.material as THREE.MeshStandardMaterial; mat.transparent = true; mat.alphaTest = 0; });

  const api: Stugan = {
    group: g, roof, canopy, awningGroup, awningOn: true, wetK: 0,
    setAwning(on: boolean) { api.awningOn = on; awningGroup.visible = on; },
    setWet(k: number) {
      if (Math.abs(k - api.wetK) < 1e-3) return;
      api.wetK = k;
      wet.forEach((w) => { w.m.color.copy(w.c).multiplyScalar(1 - w.dk * k); w.m.roughness = w.r - (w.r - 0.28) * 0.75 * k; });
    }
  };
  api.setAwning(opts.awning ?? false);
  return api;
}

/** Taket, kylskåpets tak och markisens duk på kamerans avstånd, som husens tak (roofAt: fullt från 40 m, borta vid
 *  26 m). Renderregeln (ORDER 055 Del A): skuggan och djupet följer opaciteten. */
export function updateGrillstugan(s: Stugan, distM: number): number {
  const k = roofAt(distM);
  for (const o of s.roof) { const m = o.material as THREE.MeshStandardMaterial; m.opacity = k; m.depthWrite = k > 0.5; o.visible = k > 0.02; o.castShadow = k > 0.5; }
  for (const o of s.canopy) { const m = o.material as THREE.MeshStandardMaterial; m.opacity = k; m.depthWrite = k > 0.5; o.visible = k > 0.02; o.castShadow = k > 0.5; }
  return k;
}
