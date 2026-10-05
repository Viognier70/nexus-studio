// equipment.ts — D5 (2026-10-04): utrustningen i vinbaren som modeller i meter, och lågan vid flamberingen.
// Fem saker: vinkylen, flamberingsvagnen, ostvagnen, avecvagnen och humidorn. Alla mått är verklig storlek
// (rekvisitans 1,5 gäller bara tallrikar, glas och bestick, inte möbler). Vagnarnas längdaxel är lokal z,
// handtaget sitter i −z-änden. Vagnen följer den som skjuter: rot + framåt × (HANDLE_REACH + längd / 2).
// Namngivna delar (part.*) så att Code kan byta material eller gömma dem. Inga speltal: pris och krediter
// står i balance.ts (EQUIPMENT_PRICE, EQUIPMENT_UNLOCK) och i butiken som platshållare.

import * as THREE from 'three';

export type EquipmentId = 'wineFridge' | 'flambeCart' | 'cheeseCart' | 'avecCart' | 'humidor';

export interface EquipmentSpec {
  id: EquipmentId;
  kind: 'cabinet' | 'cart';
  /** Bredd (x), djup/längd (z), höjd (y) i meter. */
  size: [number, number, number];
  /** Hemplatsen i vinbarens lokala XZ och vridningen. Ingen av dem står i en stråk (0,98 m hålls fria). */
  home: { at: [number, number]; yaw: number; note: string };
  /** Händelser som saken öppnar (handelserManus / sim-lagret). */
  opens: string[];
  /** Kunskapsområden som frågorna hämtas ur när saken finns på krogen (ORDER 304 §3). */
  topics: string[];
  /** Klassen saken drar krogen mot (ORDER 304 §1). Räknas av Code ur varukorgen. */
  classPull: 'bistro' | 'soigne';
}

export const HANDLE_REACH = 0.34;
export const HANDLE_Y = 0.92;

export const EQUIPMENT: Record<EquipmentId, EquipmentSpec> = {
  wineFridge: { id: 'wineFridge', kind: 'cabinet', size: [0.62, 0.64, 1.86], classPull: 'bistro',
    home: { at: [2.45, -5.36], yaw: 0, note: 'Mot södra väggen mellan tvåan C och DJ-hörnet, dörren mot norr och stråket.' },
    opens: ['wine.servingTemp', 'wine.fridgeRecommend'], topics: ['wine'] },
  humidor: { id: 'humidor', kind: 'cabinet', size: [0.72, 0.5, 1.44], classPull: 'soigne',
    home: { at: [7.3, 3.7], yaw: -Math.PI / 2, note: 'Mot östra väggen norr om klädhängaren, glasdörren mot loungen och ståborden.' },
    opens: ['cigar.offer', 'cigar.cut'], topics: ['cigar'] },
  flambeCart: { id: 'flambeCart', kind: 'cart', size: [0.56, 0.96, 0.88], classPull: 'soigne',
    home: { at: [-6.75, -2.2], yaw: Math.PI / 2, note: 'Parkerad i västra hörnet söder om köket, handtaget mot väggen.' },
    opens: ['tableside.flambe'], topics: ['spirits', 'kitchen'] },
  cheeseCart: { id: 'cheeseCart', kind: 'cart', size: [0.6, 1.02, 0.86], classPull: 'soigne',
    home: { at: [-6.75, -0.9], yaw: Math.PI / 2, note: 'Bredvid flamberingsvagnen. Kupan stängd tills vagnen är vid bordet.' },
    opens: ['cheese.trolley'], topics: ['cheese', 'wine'] },
  avecCart: { id: 'avecCart', kind: 'cart', size: [0.56, 0.92, 0.9], classPull: 'bistro',
    home: { at: [-6.75, 0.4], yaw: Math.PI / 2, note: 'Närmast köksdörren. Rullas till loungen efter kaffet.' },
    opens: ['avec.trolley', 'table.staysForAvec'], topics: ['spirits'] }
};

// ---------- material ----------
const MC = new Map<string, THREE.Material>();
function mat(c: string, r = 0.7, m = 0, o: { e?: string; ei?: number; op?: number } = {}): THREE.MeshStandardMaterial {
  const k = [c, r, m, o.e, o.ei, o.op].join('|'); let x = MC.get(k) as THREE.MeshStandardMaterial;
  if (!x) { x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); if (o.e) { x.emissive = new THREE.Color(o.e); x.emissiveIntensity = o.ei ?? 1; } if (o.op != null) { x.transparent = true; x.opacity = o.op; x.depthWrite = false; } MC.set(k, x); }
  return x;
}
const C = {
  walnut: '#3a2618', oak: '#6a4a2e', cedar: '#8a5634', brass: '#b88a3e', steel: '#9c968c', copper: '#b8673a', black: '#1c1612',
  glass: '#cfe0e0', board: '#a07a4e', linen: '#d9ccb2', bottleG: '#2a4a30', bottleR: '#6d1822', amber: '#a8641e', cream: '#efe1c0'
};
function part(g: THREE.Group, name: string, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const o = new THREE.Mesh(geo, m); o.name = 'part.' + name; o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (a: number, b: number, h: number, s = 16) => new THREE.CylinderGeometry(a, b, h, s);

// ---------- vagnens stomme: fyra stolpar, två hyllor, hjul och handtag i −z ----------
function cartFrame(g: THREE.Group, w: number, L: number, topY: number, frame: string) {
  const fm = mat(frame, 0.35, 0.65), hw = w / 2 - 0.03, hl = L / 2 - 0.03;
  [[-hw, -hl], [hw, -hl], [-hw, hl], [hw, hl]].forEach(([x, z], i) => {
    part(g, 'post' + i, cyl(0.014, 0.014, topY - 0.08, 8), fm, x, 0.08 + (topY - 0.08) / 2, z);
    const wh = part(g, 'wheel' + i, cyl(0.045, 0.045, 0.03, 14), mat(C.black, 0.8), x, 0.045, z); wh.rotation.z = Math.PI / 2;
  });
  part(g, 'shelfLow', box(w - 0.04, 0.025, L - 0.04), mat(C.walnut, 0.6), 0, 0.26, 0);
  part(g, 'top', box(w, 0.035, L), mat(C.walnut, 0.5), 0, topY, 0);
  part(g, 'rimL', box(0.018, 0.04, L), fm, -w / 2, topY + 0.035, 0); part(g, 'rimR', box(0.018, 0.04, L), fm, w / 2, topY + 0.035, 0);
  // Handtaget: en tvärslå på HANDLE_Y, 0,10 m ut från vagnens −z-kant.
  const hz = -L / 2 - 0.1;
  part(g, 'handleArmL', box(0.018, 0.018, 0.12), fm, -hw, HANDLE_Y - 0.02, -L / 2 - 0.05);
  part(g, 'handleArmR', box(0.018, 0.018, 0.12), fm, hw, HANDLE_Y - 0.02, -L / 2 - 0.05);
  const h = part(g, 'handle', cyl(0.016, 0.016, w, 10), fm, 0, HANDLE_Y, hz); h.rotation.z = Math.PI / 2;
}

export interface EquipmentHandle {
  id: EquipmentId; group: THREE.Group; spec: EquipmentSpec;
  /** Kupan på ostvagnen: 0 stängd, 1 lyft och vänd bakåt. */
  setCloche?: (k: number) => void;
  /** Bitar som skärs (ostvagnen): 0–1 av en bit som flyttas till tallriken. */
  setCut?: (k: number) => void;
  /** Lågan på flamberingsvagnen. k 0–1, t sekunder (för fladdret). */
  setFlame?: (k: number, t: number) => void;
  /** Pannans lutning (rad). */
  setPan?: (a: number) => void;
}

export function createEquipment(id: EquipmentId): EquipmentHandle {
  const spec = EQUIPMENT[id], g = new THREE.Group(); g.name = 'equipment.' + id;
  const [w, L, H] = spec.size, out: EquipmentHandle = { id, group: g, spec };
  if (id === 'wineFridge') {
    // Ett högt skåp i valnöt med glasdörr. Inuti: sju hyllor med flaskbottnar och ett varmt ljus i taket.
    part(g, 'body', box(w, H, L), mat(C.walnut, 0.55), 0, H / 2, 0);
    part(g, 'interior', box(w - 0.08, H - 0.2, 0.02), mat('#1a120d', 0.9, 0, { e: '#ffcf8a', ei: 0.16 }), 0, H / 2 + 0.02, L / 2 - 0.1);
    for (let r = 0; r < 7; r++) for (let i = 0; i < 4; i++) part(g, `bottle${r}_${i}`, cyl(0.035, 0.035, 0.02, 10), mat(i % 3 ? C.bottleG : C.bottleR, 0.3), -0.2 + i * 0.13, 0.24 + r * 0.22, L / 2 - 0.08).rotation.x = Math.PI / 2;
    part(g, 'door', box(w - 0.06, H - 0.12, 0.012), mat(C.glass, 0.05, 0.2, { op: 0.22 }), 0, H / 2, L / 2 + 0.006);
    part(g, 'doorFrame', box(w - 0.02, 0.04, 0.02), mat(C.brass, 0.35, 0.65), 0, H - 0.05, L / 2 + 0.01);
    part(g, 'handle', box(0.02, 0.5, 0.03), mat(C.brass, 0.35, 0.65), w / 2 - 0.07, H / 2 + 0.1, L / 2 + 0.03);
    part(g, 'glow', box(w - 0.12, 0.012, 0.3), mat('#ffd9a0', 1, 0, { e: '#ffcf8a', ei: 1.4 }), 0, H - 0.12, L / 2 - 0.2);
    const pl = new THREE.PointLight('#ffcf8a', 0.6, 1.8, 1.8); pl.position.set(0, H - 0.3, L / 2 + 0.2); pl.name = 'part.light'; g.add(pl);
  }
  if (id === 'humidor') {
    // Cederskåp med glasdörr, fyra hyllor med cigarrlådor och en hygrometer i mässing.
    part(g, 'body', box(w, H, L), mat(C.cedar, 0.6), 0, H / 2, 0);
    part(g, 'plinth', box(w + 0.04, 0.08, L + 0.04), mat(C.walnut, 0.6), 0, 0.04, 0);
    for (let r = 0; r < 4; r++) {
      part(g, 'shelf' + r, box(w - 0.08, 0.015, L - 0.08), mat(C.cedar, 0.7), 0, 0.3 + r * 0.28, 0.02);
      for (let i = 0; i < 3; i++) part(g, `box${r}_${i}`, box(0.17, 0.06, 0.22), mat(['#5a3a24', '#7a4a2a', '#4a2e1c'][(r + i) % 3], 0.7), -0.2 + i * 0.2, 0.34 + r * 0.28, 0.04);
    }
    part(g, 'door', box(w - 0.06, H - 0.14, 0.012), mat(C.glass, 0.05, 0.2, { op: 0.2 }), 0, H / 2 + 0.03, L / 2 + 0.006);
    const hy = part(g, 'hygrometer', cyl(0.05, 0.05, 0.015, 20), mat(C.brass, 0.3, 0.7), 0, H - 0.12, L / 2 + 0.02); hy.rotation.x = Math.PI / 2;
    part(g, 'glow', box(w - 0.12, 0.01, 0.2), mat('#ffd9a0', 1, 0, { e: '#ffbf70', ei: 0.9 }), 0, H - 0.06, 0.05);
  }
  if (id === 'flambeCart') {
    // Guéridon i mässing och valnöt. På skivan: réchauden med kopparpannan, flaskan och tallriken. Lågan över pannan.
    cartFrame(g, w, L, H, C.brass);
    const rz = 0.12;
    part(g, 'rechaud', cyl(0.12, 0.13, 0.11, 18), mat(C.steel, 0.3, 0.75), 0, H + 0.07, rz);
    const pan = new THREE.Group(); pan.name = 'part.pan'; pan.position.set(0, H + 0.14, rz); g.add(pan);
    const pm = new THREE.Mesh(cyl(0.15, 0.13, 0.04, 22), mat(C.copper, 0.3, 0.8)); pm.castShadow = true; pan.add(pm);
    const food = new THREE.Mesh(cyl(0.12, 0.12, 0.012, 18), mat('#c98a3e', 0.6)); food.position.y = 0.016; pan.add(food);
    const sk = new THREE.Mesh(box(0.025, 0.02, 0.26), mat(C.copper, 0.35, 0.8)); sk.position.set(0, 0.01, -0.27); pan.add(sk);
    part(g, 'bottle', cyl(0.033, 0.04, 0.22, 12), mat(C.amber, 0.25, 0.1, { op: 0.9 }), 0.17, H + 0.13, -0.2);
    part(g, 'plate', cyl(0.13, 0.11, 0.015, 20), mat(C.cream, 0.4), -0.1, H + 0.03, -0.28);
    part(g, 'pansLow', cyl(0.15, 0.14, 0.05, 18), mat(C.copper, 0.35, 0.8), 0, 0.3, 0.18);
    const fl = createFlame(); fl.group.position.set(0, H + 0.17, rz); g.add(fl.group);
    out.setFlame = (k, t) => fl.update(k, t);
    out.setPan = (a) => { pan.rotation.x = a; };
  }
  if (id === 'cheeseCart') {
    // Ostvagnen: en bräda i ek under en glaskupa, fem ostar i olika former, kniv och tallrikar på hyllan under.
    cartFrame(g, w, L, H, C.brass);
    part(g, 'board', box(w - 0.08, 0.03, L - 0.14), mat(C.board, 0.65), 0, H + 0.035, 0.02);
    const cheeses: [string, number, number, number, number, string][] = [
      ['brie', -0.12, 0.2, 0.11, 0.04, '#efe6cf'], ['munster', 0.13, 0.22, 0.085, 0.05, '#d99a4a'], ['comte', -0.1, -0.12, 0.0, 0.0, '#e8c46a'],
      ['roquefort', 0.12, -0.08, 0.075, 0.06, '#dcd8c6'], ['chevre', 0.0, 0.04, 0.045, 0.1, '#f4f0e4']
    ];
    cheeses.forEach(([n, x, z, r, h, c]) => {
      if (n === 'comte') { const wd = part(g, 'cheese.' + n, new THREE.CylinderGeometry(0.16, 0.16, 0.07, 3, 1, false, 0, Math.PI / 3), mat(c, 0.7), x, H + 0.085, z); wd.rotation.y = 0.4; }
      else part(g, 'cheese.' + n, cyl(r, r, h, 20), mat(c, 0.75), x, H + 0.05 + h / 2, z);
    });
    const piece = part(g, 'cheese.piece', box(0.05, 0.03, 0.035), mat('#e8c46a', 0.7), -0.06, H + 0.1, -0.08);
    part(g, 'knife', box(0.018, 0.006, 0.2), mat(C.steel, 0.25, 0.8), 0.18, H + 0.055, -0.3);
    for (let i = 0; i < 4; i++) part(g, 'plate' + i, cyl(0.1, 0.09, 0.012, 18), mat(C.cream, 0.4), 0, 0.28 + i * 0.014, -0.2);
    const cl = new THREE.Group(); cl.name = 'part.cloche'; cl.position.set(0, H + 0.05, 0.02); g.add(cl);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.glass, 0.04, 0.3, { op: 0.24 }));
    dome.scale.set(1, 0.62, 1.25); cl.add(dome);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat(C.brass, 0.3, 0.7)); knob.position.y = 0.2; cl.add(knob);
    out.setCloche = (k) => { cl.rotation.x = -1.9 * k; cl.position.set(0, H + 0.05 + 0.04 * k, 0.02 - 0.34 * Math.sin(k * Math.PI / 2)); };
    out.setCut = (k) => { piece.position.set(-0.06 - 0.02 * k, H + 0.1 + 0.18 * Math.sin(k * Math.PI), -0.08 - 0.3 * k); };
  }
  if (id === 'avecCart') {
    // Avecvagnen: två våningar, sex flaskor i olika höjd och form på skivan, små glas på hyllan under.
    cartFrame(g, w, L, H, C.brass);
    const bottles: [number, number, number, number, string][] = [
      [-0.14, 0.28, 0.04, 0.26, C.amber], [0.0, 0.3, 0.05, 0.22, '#8a4a1a'], [0.14, 0.27, 0.035, 0.3, '#c9a24a'],
      [-0.14, 0.05, 0.045, 0.24, '#5a2a10'], [0.0, 0.07, 0.03, 0.32, '#d8c89a'], [0.14, 0.04, 0.05, 0.2, '#7a3a14']
    ];
    bottles.forEach(([x, z, r, h, c], i) => { part(g, 'bottle' + i, cyl(r * 0.8, r, h, 12), mat(c, 0.2, 0.1, { op: 0.9 }), x, H + 0.02 + h / 2, z); part(g, 'cork' + i, cyl(r * 0.35, r * 0.35, 0.04, 8), mat(C.oak, 0.7), x, H + 0.04 + h, z); });
    for (let i = 0; i < 6; i++) part(g, 'glass' + i, cyl(0.025, 0.018, 0.06, 10), mat(C.glass, 0.05, 0.1, { op: 0.4 }), -0.15 + (i % 3) * 0.15, 0.3, -0.12 + Math.floor(i / 3) * 0.14);
    part(g, 'rail', box(w, 0.012, 0.012), mat(C.brass, 0.35, 0.65), 0, H + 0.1, L / 2 - 0.02);
  }
  g.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return out;
}

/** Vagnens läge när den skjuts: roten (x, z, yaw) till vagnens mitt och vridning. */
export function cartPose(id: EquipmentId, x: number, z: number, yaw: number): { x: number; z: number; yaw: number } {
  const L = EQUIPMENT[id].size[1], d = HANDLE_REACH + 0.1 + L / 2;
  return { x: x + Math.sin(yaw) * d, z: z + Math.cos(yaw) * d, yaw };
}

// ---------- lågan ----------
// Flamberingen: lågan tar sig på 0,15 s, står högt i 0,8 s (0,55 m), sjunker under 2 s och slocknar. Additiv,
// ljuslåga i kärnan och bärnsten i kanten. Inget rött. En punktljuskälla lyser upp gästernas ansikten (det är det man ser på 10 m).
export const FLAME = { riseS: 0.15, holdS: 0.8, fallS: 2.0, peakM: 0.55, core: '#ffe2a8', edge: '#ffb04a', light: { colour: '#ffb060', intensity: 7, distance: 4 } };

let FLAME_TEX: THREE.Texture | null = null;
function flameTex(): THREE.Texture {
  if (FLAME_TEX) return FLAME_TEX;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 100, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.35, 'rgba(255,190,90,.75)'); g.addColorStop(1, 'rgba(255,150,60,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(58, 50, 62, 96, 32, 126); x.bezierCurveTo(2, 96, 6, 50, 32, 2); x.fill();
  FLAME_TEX = new THREE.CanvasTexture(c); return FLAME_TEX;
}
export function createFlame() {
  const group = new THREE.Group(); group.name = 'part.flame';
  const sprites = [0, 1, 2].map((i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), color: i ? FLAME.edge : FLAME.core, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); group.add(s); return s; });
  const light = new THREE.PointLight(FLAME.light.colour, 0, FLAME.light.distance, 1.6); light.position.y = 0.25; group.add(light);
  return {
    group,
    update(k: number, t: number) {
      const f = 1 + 0.12 * Math.sin(t * 23) + 0.08 * Math.sin(t * 37 + 1);
      sprites.forEach((s, i) => { const h = FLAME.peakM * k * f * (i ? 0.8 + 0.15 * i : 1), wd = h * (i ? 0.55 : 0.42); s.scale.set(Math.max(0.001, wd), Math.max(0.001, h), 1); s.position.set(i === 1 ? 0.03 : i === 2 ? -0.03 : 0, h / 2, 0); s.material.opacity = Math.min(1, k * 1.2) * (i ? 0.6 : 0.95); });
      light.intensity = FLAME.light.intensity * k * f;
    }
  };
}
/** Lågans styrka 0–1, s sekunder efter att den tog sig. */
export function flameK(s: number): number {
  if (s < 0) return 0; if (s < FLAME.riseS) return s / FLAME.riseS; if (s < FLAME.riseS + FLAME.holdS) return 1;
  const u = (s - FLAME.riseS - FLAME.holdS) / FLAME.fallS; return u >= 1 ? 0 : 1 - u * u * (3 - 2 * u);
}
