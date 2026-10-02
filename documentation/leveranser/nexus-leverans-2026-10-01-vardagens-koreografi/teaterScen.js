// teaterScen — scenen för "Teaterns grund": rummet, figurerna, rekvisitan och en regissör som
// spelar manus (teaterManus.js) bildruta för bildruta. Allt är en ren funktion av tiden t, så
// spolning, kontrollbilder och videon ger samma bild för samma t.
// Modulerna (figureRig, figureClips, tableware) skickas in: de laddas som .ts av tsModule.js.
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
export { THREE };

export const GAME_CAMERA = { fov: 42, pitch: 0.873, dist: 24 };
export const GRADE = { filter: 'saturate(1.1) brightness(.92)', vignette: [[0, 'rgba(255,170,80,.12)'], [0.85, 'rgba(20,10,5,.72)']] };

export const LOOKS = {
  kock: { body: '#efe9dd', limb: '#3a3632', hat: 'toque' },
  servitor: { body: '#1f1a17', limb: '#1b1816', apron: '#efe4d0' },
  servitor2: { body: '#2a211c', limb: '#1b1816', apron: '#e6d8bf' },
  sommelier: { body: '#5b2226', limb: '#2a1c18', chain: true },
  bartender: { body: '#3b2a1f', limb: '#241a14', apron: '#9a6238' },
  diskare: { body: '#56646a', limb: '#2f383c', apron: '#cfd6d4' },
  student: { body: '#3f7390', limb: '#2f3a48' },
  medel: { body: '#8a7457', limb: '#4a4034' },
  medel2: { body: '#6f5a74', limb: '#3c3342' },
  medel3: { body: '#5f7a6a', limb: '#34443a' },
  hog: { body: '#1b1a20', limb: '#141318', scarf: '#c49a5a' },
  social: { body: '#b5485f', limb: '#6a2a38', shawl: '#f3c0ad' },
  hovmastare: { body: '#2e2a2b', limb: '#1b1816', chain: true },
  dj: { body: '#664958', limb: '#2a1f26' },
  // Vardagens koreografi: fler gäster i kön och sällskapen, inom samma kontrastband.
  kappa: { body: '#9b7b55', limb: '#4a3c2c', scarf: '#d8c3a0' },
  rock: { body: '#3d4a5c', limb: '#262d38' },
  jacka: { body: '#7a3b2e', limb: '#3e2420' },
  stickat: { body: '#6b7a4e', limb: '#3a4230' }
};

// Beslut 2026-09-30: tallrikar, glas och bestick är 1,5 gånger verklig storlek i spelet (staffRing.ts, PROP_VISUAL_SCALE).
const VIS_SCALE = ['plate', 'sidePlate', 'soupBowl', 'wineGlass', 'waterGlass', 'wineBottle', 'waterBottle', 'carafe', 'fork', 'knife', 'spoon', 'napkin', 'breadBasket', 'decanter', 'flute'];
const G = new Map();
function geo(k, f) { let g = G.get(k); if (!g) { g = f(); G.set(k, g); } return g; }
const MC = new Map();
function mat(c, r = 0.8, m = 0, e) { const k = c + r + m + (e || ''); let x = MC.get(k); if (!x) { x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); if (e) { x.emissive = new THREE.Color(e); x.emissiveIntensity = 1.6; } MC.set(k, x); } return x; }
function mesh(g, m, x = 0, y = 0, z = 0, cast = true) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o; }
const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (a, b, h, s = 16) => geo(`c${a},${b},${h},${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const sph = (r, s = 12) => geo(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s - 4)));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (u) => { const k = clamp(u, 0, 1); return k * k * (3 - 2 * k); };
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const lerpAngle = (a, b, k) => a + wrap(b - a) * k;

let GLOW = null;
function glowSprite(scale, color, opacity = 1) {
  if (!GLOW) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,220,160,1)'); g.addColorStop(0.25, 'rgba(255,180,90,.5)'); g.addColorStop(1, 'rgba(255,150,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); GLOW = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(scale, scale, 1); return s;
}
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t; }

// ---------- möblerna ---------------------------------------------------
const WOOD = '#4a3122', LINEN = '#c4b394', CHAIR = '#2e2016', BRASS = '#b88a3e', STEEL = '#b8b2a8';

function tablePiece(root, x, z, w, d, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
  g.add(mesh(box(w, 0.04, d), mat(WOOD, 0.6), 0, 0.73, 0));
  g.add(mesh(box(w * 0.72, 0.004, d * 0.72), mat(LINEN, 0.95), 0, 0.752, 0, false));
  g.add(mesh(cyl(0.05, 0.07, 0.71, 10), mat('#241810', 0.6), 0, 0.355, 0));
  g.add(mesh(cyl(0.26, 0.28, 0.03, 16), mat('#241810', 0.6), 0, 0.015, 0));
  if (o.candle !== false) {
    g.add(mesh(cyl(0.03, 0.03, 0.02, 10), mat('#c9942a', 0.4, 0.6), 0, 0.76, 0));
    g.add(mesh(cyl(0.014, 0.014, 0.07, 8), mat('#f7efd9', 0.6), 0, 0.805, 0));
    g.add(mesh(sph(0.012, 6), mat('#ffcc66', 1, 0, '#ffb040'), 0, 0.85, 0, false));
    const s = glowSprite(0.5, '#ffc070', 0.45); s.position.set(0, 0.87, 0); g.add(s);
    if (o.light) { const L = new THREE.PointLight('#ffb060', 0.8, 2.6, 1.8); L.position.set(0, 1.15, 0); g.add(L); }
  }
  return g;
}
function chairPiece(root) {
  const g = new THREE.Group(); root.add(g); const m = mat(CHAIR, 0.7);
  g.add(mesh(box(0.42, 0.04, 0.42), m, 0, 0.43, 0));
  g.add(mesh(box(0.42, 0.46, 0.035), m, 0, 0.68, -0.2));
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([a, b]) => g.add(mesh(box(0.03, 0.43, 0.03), m, a, 0.215, b)));
  return g;
}
function stoolPiece(root, s) {
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); root.add(g); const m = mat(CHAIR, 0.6), b = mat(BRASS, 0.4, 0.6);
  g.add(mesh(cyl(0.19, 0.19, 0.05, 16), m, 0, 0.725, 0)); g.add(mesh(cyl(0.045, 0.045, 0.7, 8), m, 0, 0.35, 0));
  g.add(mesh(cyl(0.17, 0.17, 0.03, 16), b, 0, 0.015, 0));
  const ring = mesh(geo('footring', () => new THREE.TorusGeometry(0.2, 0.012, 6, 24)), b, 0, 0.29, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
  return g;
}
function loungePiece(root, s) {
  // En dyna 0,72 × 0,72, överkant 0,38, sockel och ryggstöd bakom (sitsens −z).
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = s.yaw; root.add(g); const m = mat('#7d6f63', 0.95), p = mat('#4a3a2e', 0.8);
  g.add(mesh(box(0.8, 0.22, 0.8), p, 0, 0.11, -0.02)); g.add(mesh(box(0.72, 0.16, 0.72), m, 0, 0.3, 0));
  g.add(mesh(box(0.8, 0.95, 0.18), m, 0, 0.475, -0.45));
  return g;
}
function counterPiece(root, x, z, w, d, h, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); if (o.yaw) g.rotation.y = o.yaw; root.add(g);
  g.add(mesh(box(w, h - 0.04, d), mat(o.body || '#3a281c', 0.7, o.metal || 0), 0, (h - 0.04) / 2, 0));
  g.add(mesh(box(w + 0.04, 0.04, d + 0.04), mat(o.top || BRASS, o.topRough ?? 0.4, o.topMetal ?? 0.5), 0, h - 0.02, 0));
  return g;
}

// ---------- rummet ----------------------------------------------------
// Ett hörn av restaurangen: matsal med fem bord, bar, passet, kockens station och disken.
// Mått i meter. x österut, z söderut (mot kameran). Kamerasidans väggar (S, Ö) är kapade.
export const ROOM = {
  seats: {
    T4W: { x: 0.28, z: 1.3, yaw: Math.PI / 2, seatHeight: 0.45 }, T4E: { x: 1.72, z: 1.3, yaw: -Math.PI / 2, seatHeight: 0.45 },
    T2N: { x: -1.7, z: 1.03, yaw: 0, seatHeight: 0.45 }, T2S: { x: -1.7, z: 2.57, yaw: Math.PI, seatHeight: 0.45 },
    T2W: { x: -2.47, z: 1.8, yaw: Math.PI / 2, seatHeight: 0.45 }, T2E: { x: -0.93, z: 1.8, yaw: -Math.PI / 2, seatHeight: 0.45 },
    T3W: { x: -2.32, z: -0.8, yaw: Math.PI / 2, seatHeight: 0.45 }, T3E: { x: -0.88, z: -0.8, yaw: -Math.PI / 2, seatHeight: 0.45 },
    T5W: { x: 3.48, z: 1.3, yaw: Math.PI / 2, seatHeight: 0.45 }, T5E: { x: 4.92, z: 1.3, yaw: -Math.PI / 2, seatHeight: 0.45 }
  },
  tables: [[1.0, 1.3, 0.8, 0.8, true], [-1.7, 1.8, 0.9, 0.9, true], [-1.6, -0.8, 0.8, 0.8, false], [4.2, 1.3, 0.8, 0.8, true]],
  spots: {
    door: [3.8, 5.2], waiterHome: [2.85, -1.2], sideboard: [3.35, -1.2], passWaiter: [1.2, -1.66], passCook: [1.2, -2.95],
    cookStation: [1.2, -2.95], sommHome: [-2.5, -3.1], barTender: [-4.65, -0.5], dish: [4.1, -2.86], dropWaiter: [4.1, -1.56]
  }
};

function buildRestaurant(root) {
  const planks = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#5e4029'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) { const y = r * 64; x.fillStyle = `rgba(${90 + (r * 37) % 30},${60 + (r * 23) % 20},${36 + (r * 17) % 14},.55)`; x.fillRect(0, y, w, 62); x.fillStyle = 'rgba(20,12,6,.55)'; x.fillRect(0, y + 62, w, 2); const off = (r * 173) % 512; x.fillRect(off, y, 2, 62); x.fillRect((off + 256) % 512, y, 2, 62); }
  }, [3, 3]);
  const floor = mesh(new THREE.PlaneGeometry(11, 8.4), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.8 }), 0, 0, 0, false); floor.rotation.x = -Math.PI / 2; root.add(floor);
  const tiles = canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#8b8273' : '#a39a88'; x.fillRect(i * 32, j * 32, 32, 32); } }, [4, 2]);
  const kf = mesh(new THREE.PlaneGeometry(6.1, 2.2), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.6 }), 2.45, 0.004, -3.1, false); kf.rotation.x = -Math.PI / 2; root.add(kf);
  const wall = mat('#5c4533', 0.9), panel = mat('#2e2016', 0.7);
  root.add(mesh(box(11, 2.7, 0.12), wall, 0, 1.35, -4.26)); root.add(mesh(box(11, 1.0, 0.14), panel, 0, 0.5, -4.2));
  root.add(mesh(box(0.12, 2.7, 8.5), wall, -5.56, 1.35, 0)); root.add(mesh(box(0.14, 1.0, 8.5), panel, -5.5, 0.5, 0));
  root.add(mesh(box(7.2, 0.35, 0.12), panel, -1.9, 0.175, 4.26)); root.add(mesh(box(1.1, 0.35, 0.12), panel, 5.0, 0.175, 4.26));
  root.add(mesh(box(0.12, 0.35, 8.5), panel, 5.56, 0.175, 0));
  // kök
  counterPiece(root, 1.2, -2.3, 2.8, 0.6, 0.95, { body: '#7d776e', top: STEEL, topMetal: 0.7, topRough: 0.3 });
  counterPiece(root, 1.2, -3.6, 2.8, 0.6, 0.9, { body: '#6f6a62', top: '#9c968c', topMetal: 0.6, topRough: 0.35 });
  root.add(mesh(box(0.9, 0.02, 0.5), mat('#1c1a18', 0.5, 0.3), 0.55, 0.91, -3.6));
  [0.4, 1.2, 2.0].forEach((x) => { root.add(mesh(box(0.5, 0.06, 0.14), mat('#3a2a20', 0.6), x, 1.85, -2.3)); root.add(mesh(box(0.42, 0.02, 0.1), mat('#ffb060', 1, 0, '#ff9a40'), x, 1.815, -2.3, false)); const L = new THREE.PointLight('#ffb468', 1.4, 2.6, 1.6); L.position.set(x, 1.7, -2.3); root.add(L); });
  counterPiece(root, 4.1, -3.7, 1.5, 0.6, 0.88, { body: '#8a8a86', top: '#c2c0bb', topMetal: 0.6, topRough: 0.3 });
  root.add(mesh(box(0.6, 0.02, 0.42), mat('#6d7a7e', 0.2, 0.6), 4.1, 0.885, -3.7));
  counterPiece(root, 4.1, -2.1, 1.5, 0.4, 0.9, { body: '#7d776e', top: STEEL, topMetal: 0.7, topRough: 0.3 });
  // bar
  counterPiece(root, -4.0, -0.5, 0.55, 3.0, 1.05, { body: '#3a281c' });
  root.add(mesh(box(0.35, 1.7, 3.0), mat('#2a1c13', 0.8), -5.3, 0.85, -0.5));
  for (let i = 0; i < 14; i++) { const z = -1.85 + i * 0.2; root.add(mesh(cyl(0.035, 0.035, 0.28, 8), mat(i % 3 ? '#2a4a30' : '#6d1822', 0.3, 0.1), -5.25, 1.84, z)); root.add(mesh(cyl(0.035, 0.035, 0.28, 8), mat(i % 2 ? '#3a2a18' : '#2a4a30', 0.3, 0.1), -5.25, 1.24, z)); }
  [-1.4, 0.4].forEach((z) => { const L = new THREE.PointLight('#ffb468', 1.6, 3.5, 1.6); L.position.set(-4.0, 2.1, z); root.add(L); root.add(mesh(cyl(0.12, 0.16, 0.14, 12), mat('#c9942a', 0.4, 0.6, '#7a4a10'), -4.0, 2.25, z)); });
  // vinskåp, avställning
  root.add(mesh(box(1.2, 2.0, 0.45), mat('#2e2016', 0.7), -2.5, 1.0, -3.95));
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) root.add(mesh(cyl(0.03, 0.03, 0.02, 6), mat('#6d1822', 0.4), -2.95 + i * 0.22, 0.5 + j * 0.4, -3.72, false));
  counterPiece(root, 3.35, -1.2, 0.5, 0.9, 0.9, { body: '#3a281c' });
  // bord och stolar
  ROOM.tables.forEach(([x, z, w, d, light]) => tablePiece(root, x, z, w, d, { light }));
  const chairs = {};
  Object.entries(ROOM.seats).forEach(([id, s]) => { const c = chairPiece(root); chairs[id] = c; placeChair(c, s, 0); });
  return { chairs };
}
function placeChair(c, s, pull) { c.position.set(s.x - Math.sin(s.yaw) * pull, 0, s.z - Math.cos(s.yaw) * pull); c.rotation.y = s.yaw; }

function buildStudio(root, pieces) {
  const f = mesh(new THREE.CircleGeometry(7, 48), mat('#4a3424', 0.9), 0, 0, 0, false); f.rotation.x = -Math.PI / 2; root.add(f);
  const chairs = {};
  (pieces || []).forEach((p) => {
    if (p.type === 'table') tablePiece(root, p.x, p.z, p.w || 0.8, p.d || 0.8, { light: false });
    if (p.type === 'chair') { const c = chairPiece(root); chairs[p.id] = c; placeChair(c, p, 0); }
    if (p.type === 'bar') counterPiece(root, p.x, p.z, p.w, p.d, p.h || 1.05, { yaw: p.yaw || 0 });
    if (p.type === 'stool') stoolPiece(root, p);
    if (p.type === 'lounge') loungePiece(root, p);
    if (p.type === 'lowTable') { const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.yaw || 0; root.add(g); g.add(mesh(box(p.w || 1.2, 0.04, p.d || 0.55), mat(WOOD, 0.6), 0, 0.43, 0)); g.add(mesh(box((p.w || 1.2) - 0.1, 0.41, (p.d || 0.55) - 0.1), mat('#241810', 0.7), 0, 0.205, 0)); g.add(mesh(cyl(0.03, 0.03, 0.02, 10), mat('#c9942a', 0.4, 0.6), 0, 0.46, 0)); g.add(mesh(sph(0.012, 6), mat('#ffcc66', 1, 0, '#ffb040'), 0, 0.52, 0, false)); const gl = glowSprite(0.45, '#ffc070', 0.45); gl.position.set(0, 0.53, 0); g.add(gl); }
    if (p.type === 'floorLight') { const L = new THREE.PointLight('#ffb060', p.i || 1.2, p.r || 4, 1.6); L.position.set(p.x, p.y || 1.8, p.z); root.add(L); }
    if (p.type === 'pass') counterPiece(root, p.x, p.z, p.w, p.d, 0.95, { body: '#7d776e', top: STEEL, topMetal: 0.7, topRough: 0.3, yaw: p.yaw || 0 });
    if (p.type === 'station') counterPiece(root, p.x, p.z, p.w, p.d, 0.9, { body: '#6f6a62', top: '#9c968c', topMetal: 0.6, yaw: p.yaw || 0 });
    if (p.type === 'sink') counterPiece(root, p.x, p.z, p.w, p.d, 0.88, { body: '#8a8a86', top: '#c2c0bb', topMetal: 0.6, yaw: p.yaw || 0 });
  });
  return { chairs };
}

// ---------- figurerna -------------------------------------------------
function makeFigure(R, scene, kind, look, hm) {
  const L = LOOKS[look] || LOOKS.medel, staff = kind !== 'guest';
  const rig = R.createFigureRig({ variant: staff ? 'staff' : 'guest', garmentColour: L.body, limbColour: L.limb, heightMult: staff ? 1 : (hm ?? 1) });
  const head = rig.joints.head, chest = rig.joints.chest, depth = rig.shoulderWidth * 0.44;
  const hairM = new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.9 }); rig.materials.push(hairM);
  if (head.children[1] && !staff) head.children[1].material = hairM;
  if (L.hat === 'toque') { head.add(mesh(cyl(0.11, 0.1, 0.16), mat('#ffffff', 0.9), 0, 0.3, 0)); const p = mesh(sph(0.125), mat('#ffffff', 0.9), 0, 0.4, 0); p.scale.y = 0.55; head.add(p); }
  if (L.apron) chest.add(mesh(box(0.3, 0.62, 0.015), mat(L.apron, 0.9), 0, -0.12, depth / 2 + 0.012));
  if (L.scarf) { const s = mesh(geo('scarf', () => new THREE.TorusGeometry(0.1, 0.035, 8, 16)), mat(L.scarf, 0.9), 0, 0.57, 0); s.rotation.x = Math.PI / 2; chest.add(s); }
  if (L.shawl) { const s = mesh(geo('shawl', () => new THREE.TorusGeometry(0.19, 0.045, 8, 20)), mat(L.shawl, 0.9), 0, 0.5, 0); s.rotation.x = Math.PI / 2; s.scale.y = 0.62; chest.add(s); }
  if (L.chain) { const c = mesh(cyl(0.035, 0.035, 0.01), mat('#d7a24c', 0.3, 0.8), 0, 0.45, depth / 2 + 0.01); c.rotation.x = Math.PI / 2; chest.add(c); }
  rig.root.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = false; } });
  scene.add(rig.root);
  return rig;
}

// ---------- scenen ----------------------------------------------------
export function createTheatre(canvas, M, o = {}) {
  const { R, C, W } = M;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#140d09');
  const camera = new THREE.PerspectiveCamera(GAME_CAMERA.fov, 16 / 9, 0.1, 200);
  const cam = { yaw: 0.32, pitch: GAME_CAMERA.pitch, dist: GAME_CAMERA.dist, tx: 0.2, ty: 0.4, tz: 0.4 };
  const goal = { ...cam };
  const lights = new THREE.Group(); scene.add(lights);
  const hemi = new THREE.HemisphereLight('#ffe0b8', '#3a2414', 0.95); lights.add(hemi);
  const key = new THREE.DirectionalLight('#ffd2a0', 1.5); key.position.set(4, 12, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 40 }); key.shadow.camera.updateProjectionMatrix(); key.shadow.bias = -0.0004; lights.add(key);
  const fill = new THREE.DirectionalLight('#9aa4c8', 0.25); fill.position.set(-6, 8, -4); lights.add(fill);
  let setRoot = null, propRoot = null, set = null, figs = {}, props = {}, actors = {}, script = null, events = [], seatMap = {};
  let fxRoot = null, fxs = [], lastT = 0;
  // Strålkastaren: resten av rummet till 45 % ljus, en ljuspöl på 1,2 m i ljuslåga under den som gör något.
  const poolTex = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.MeshBasicMaterial({ color: '#ffd58f', map: poolTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03; pool.renderOrder = 3; scene.add(pool);
  const poolLight = new THREE.PointLight('#ffd58f', 0, 5, 1.4); scene.add(poolLight);
  function spot(p, k) {
    const d = 1 - 0.55 * k; hemi.intensity = 0.95 * d; key.intensity = 1.5 * d; fill.intensity = 0.25 * d;
    if (set && set.room) set.room.group.traverse((o) => { if (o.isLight) { if (o.userData.base == null) o.userData.base = o.intensity; o.intensity = o.userData.base * d; } });
    if (p) { pool.position.set(p[0], 0.03, p[1]); poolLight.position.set(p[0], 2.2, p[1]); }
    pool.material.opacity = 0.5 * k; poolLight.intensity = 5 * k;
  }
  let W_ = 1920, H_ = 1080;

  function size(w, h) { W_ = w; H_ = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  size(o.width || 1920, o.height || 1080);
  function place() { const cp = Math.cos(cam.pitch); camera.fov = cam.fov || GAME_CAMERA.fov; camera.updateProjectionMatrix(); camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist); camera.lookAt(cam.tx, cam.ty, cam.tz); }
  if (o.interactive) {
    let drag = null;
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', (e) => { if (!drag) return; goal.yaw -= (e.clientX - drag.x) * 0.005; goal.pitch = clamp(goal.pitch + (e.clientY - drag.y) * 0.004, 0.3, 1.45); drag = { x: e.clientX, y: e.clientY }; });
    const up = () => { drag = null; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); goal.dist = clamp(goal.dist * (1 + Math.sign(e.deltaY) * 0.08), 3, 40); }, { passive: false });
  }

  function clear() {
    if (setRoot) scene.remove(setRoot); if (propRoot) scene.remove(propRoot); if (fxRoot) scene.remove(fxRoot); fxs = []; spot(null, 0);
    Object.values(figs).forEach((r) => R.disposeFigureRig(r));
    figs = {}; props = {}; actors = {}; events = [];
  }

  function load(sc) {
    clear(); script = sc;
    setRoot = new THREE.Group(); scene.add(setRoot); propRoot = new THREE.Group(); scene.add(propRoot);
    if (sc.set === 'winebar') {
      const room = M.WB.createWineBarRoom(sc.roomOpts || { mood: 'helg' });
      room.group.position.y = -room.floorY; room.parts.roof.visible = false; setRoot.add(room.group);
      room.group.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
      set = { chairs: {}, room };
      seatMap = Object.fromEntries(room.seats.map((s) => [s.id, { id: s.id, x: s.local[0], z: s.local[1], yaw: s.facing, seatHeight: s.seatHeight, kind: C.seatKindFromRoom(s.kind), approach: s.approach }]));
      Object.assign(key.shadow.camera, { left: -10, right: 10, top: 9, bottom: -9, near: 1, far: 50 }); key.shadow.camera.updateProjectionMatrix(); key.position.set(4, 14, 7);
    } else {
      set = sc.set === 'restaurant' ? buildRestaurant(setRoot) : buildStudio(setRoot, sc.pieces);
      seatMap = sc.set === 'restaurant' ? ROOM.seats : Object.fromEntries((sc.pieces || []).filter((p) => p.type === 'chair' || p.type === 'stool' || p.type === 'lounge').map((p) => [p.id, { ...p, kind: p.type === 'chair' ? 'chair' : p.type }]));
    }
    buildFx(sc.effects || []);
    Object.entries(sc.props || {}).forEach(([id, p]) => { const h = W.createProp(p.type); h.group.traverse((x) => { if (x.isMesh) x.castShadow = true; }); propRoot.add(h.group); props[id] = { h, init: p }; if (sc.set === 'winebar' && VIS_SCALE.includes(p.type)) h.group.scale.setScalar(1.5); });
    Object.entries(sc.actors).forEach(([id, a]) => { figs[id] = makeFigure(R, scene, a.kind, a.look, a.hm); actors[id] = { ...a, id }; compileActor(actors[id]); });
    events.sort((a, b) => a.time - b.time);
    if (sc.camera) setView(sc.camera, true);
    return { duration: Math.max(...Object.values(actors).map((a) => a.endTime)) };
  }

  // ----- manus → tidslinje -----
  function pathLen(pts) { let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); } return { L, cum }; }
  function rot(r, yaw) { const s = Math.sin(yaw), c = Math.cos(yaw); return [r[0] * c + r[1] * s, -r[0] * s + r[1] * c]; }
  function compileActor(a) {
    let t = a.start ?? 0, pos = a.pos ? [...a.pos] : [0, 0], yaw = a.yaw ?? 0, phase = 0;
    a.compiled = [];
    a.steps.forEach((st) => {
      const clip = C.CLIPS[st.clip]; if (!clip) throw new Error('okänt klipp ' + st.clip);
      const tempo = st.tempo || script.tempo || 'normal';
      const s = { ...st, clip, tempo, start: t };
      if (!st.seat && a.seat) s.seatCarry = a.seat;
      if (st.seat) { const seat = seatMap[st.seat]; s.seatObj = seat; s.at = [seat.x, seat.z]; s.face = seat.yaw; a.seat = st.seat; }
      if (clip.travel) {
        s.pts = [pos, ...st.path]; const pl = pathLen(s.pts); s.len = pl.L; s.cum = pl.cum;
        const speed = C.TEMPO[tempo].walkSpeed * (st.speed ?? 1) * (a.kind === 'guest' ? 0.85 : 1);
        s.dur = st.until != null ? st.until - t : (st.dur ?? s.len / speed);
        s.phase0 = phase; phase += s.len / (C.CYCLE_M * C.TEMPO[tempo].stride);
        const n = s.pts.length; pos = [...s.pts[n - 1]];
        yaw = n > 1 && s.len > 0.01 ? Math.atan2(s.pts[n - 1][0] - s.pts[n - 2][0], s.pts[n - 1][1] - s.pts[n - 2][1]) : yaw;
        s.face0 = yaw;
      } else {
        s.at = s.at || pos; s.face = s.face ?? yaw;
        s.dur = st.until != null ? Math.max(0.05, st.until - t) : (st.dur ?? clip.seconds[tempo] * (st.times ?? 1));
        const r = clip.root ? C.sampleClip(st.clip, clip.loop ? 0 : s.dur, tempo, ctxOf(s)).root : [0, 0, 0];
        const d = rot(r, s.face); pos = [s.at[0] + d[0], s.at[1] + d[1]]; yaw = s.face + r[2];
      }
      (st.ev || []).forEach((e) => {
        let u = 0;
        if (e.at === 'end') u = null;
        else if (typeof e.at === 'number') u = e.at;
        else if (typeof e.at === 'string') { const ce = clip.events.filter((x) => x.type === e.at); const pick = ce[e.nth || 0]; u = pick ? pick.u : 0; }
        const span = clip.loop ? clip.seconds[tempo] : s.dur;
        events.push({ ...e, actor: a.id, time: (u === null ? t + s.dur - 0.05 : t + u * span) + (e.dt || 0) });
      });
      t += s.dur; s.end = t; a.compiled.push(s);
    });
    a.endTime = t;
  }
  function ctxOf(s) {
    const c = { ...(s.ctx || {}) };
    if (s.hand) c.hand = s.hand; if (s.side != null) c.side = s.side; if (s.seated != null) c.seated = s.seated;
    if (s.keep) { c.keep = {}; if (s.keep === 'L' || s.keep === 'both') c.keep.L = { swing: 0.35, lift: 0.2, elbow: 1.1 }; if (s.keep === 'R' || s.keep === 'both') c.keep.R = { swing: 0.35, lift: 0.2, elbow: 1.1 }; if (s.keep === 'trayL') { c.keep.L = C.TRAY_ARM; c.keep.R = C.CARRY_ARM; } }
    return c;
  }
  function posAt(a, t) {
    const st = a.compiled.find((s) => t < s.end) || a.compiled[a.compiled.length - 1];
    if (st.clip.travel) { const d = clamp((t - st.start) / st.dur, 0, 1) * st.len; return pointAt(st, d); }
    return st.at;
  }
  function pointAt(s, d) {
    const { pts, cum } = s; if (pts.length < 2) return pts[0];
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const seg = cum[i] - cum[i - 1] || 1, k = clamp((d - cum[i - 1]) / seg, 0, 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
  }
  function headingAt(s, d) {
    const a = pointAt(s, Math.max(0, d - 0.25)), b = pointAt(s, Math.min(s.len, d + 0.25));
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-4) return s.face0;
    return Math.atan2(b[0] - a[0], b[1] - a[1]);
  }
  function sampleStep(a, s, lt, t) {
    const c = ctxOf(s);
    c.heightMult = a.kind === 'guest' ? (a.hm ?? 1) : 1;
    const seatNow = s.seat || s.seatCarry;
    if (seatNow && seatMap[seatNow]) c.seatKind = seatMap[seatNow].kind || 'chair';
    let x, z, yaw;
    if (s.clip.travel) {
      const d = clamp(lt / s.dur, 0, 1) * s.len; [x, z] = pointAt(s, d); yaw = headingAt(s, d);
      c.phase = s.phase0 + d / (C.CYCLE_M * C.TEMPO[s.tempo].stride);
    } else { [x, z] = s.at; yaw = s.face; }
    if (s.look) {
      const tp = typeof s.look === 'string' ? posAt(actors[s.look], t) : s.look;
      c.yaw = clamp(wrap(Math.atan2(tp[0] - x, tp[1] - z) - yaw), -1.4, 1.4);
    }
    const S = C.sampleClip(s.clip.id, lt, s.tempo, c);
    if (!s.clip.travel) { const d = rot(S.root, s.face); x += d[0]; z += d[1]; yaw += S.root[2]; }
    return { ...S, x, z, yaw };
  }
  function evalActor(a, t) {
    const steps = a.compiled; let i = steps.findIndex((s) => t < s.end); if (i < 0) i = steps.length - 1;
    const s = steps[i]; const lt = clamp(t - s.start, 0, s.dur);
    let S = sampleStep(a, s, lt, t);
    if (i > 0) {
      const blend = C.TEMPO[s.tempo].blendSec;
      if (lt < Math.max(blend, 0.5)) {
        const p = steps[i - 1]; const P = sampleStep(a, p, p.dur, t);
        if (lt < blend) S = { ...S, pose: R.blendPose(P.pose, S.pose, smooth(lt / blend)) };
        S.yaw = lerpAngle(P.yaw, S.yaw, smooth(lt / 0.5));
      }
    }
    const rig = figs[a.id]; R.applyPose(rig, S.pose);
    rig.root.position.set(S.x, a.stand || 0, S.z); rig.root.rotation.y = S.yaw; rig.root.updateMatrixWorld(true);
    a.cur = S; a.curStep = s;
    return S;
  }

  // ----- rekvisitan -----
  const releaseCache = new Map();
  function resetProps() {
    Object.values(props).forEach(({ h, init }) => {
      h.group.visible = !init.hidden; h.setFill(init.fill !== false);
      if (init.hand) { W.holdProp(h, figs[init.hand[0]], init.hand[1], propRoot); h._holder = init.hand; }
      else if (init.on) { W.setOnProp(h, props[init.on[0]].h, init.on[1], init.on[2], init.yaw || 0); h._holder = null; }
      else { const p = init.at || [0, 0, 0]; W.placeProp(h, propRoot, p[0], p[1], p[2], init.yaw || 0); h._holder = null; }
    });
  }
  function applyEvent(e, idx) {
    const P = e.prop ? props[e.prop] : null; const h = P && P.h;
    if (!h && !['cork', 'bell'].includes(e.type)) return;
    switch (e.type) {
      case 'grab': W.holdProp(h, figs[e.actor], e.hand || 'R', propRoot); h._holder = [e.actor, e.hand || 'R']; break;
      case 'give': W.holdProp(h, figs[e.to[0]], e.to[1], propRoot); h._holder = e.to; break;
      case 'switch': W.holdProp(h, figs[e.actor], e.to || 'L', propRoot); h._holder = [e.actor, e.to || 'L']; break;
      case 'stack': W.setOnProp(h, props[e.onto].h, 0, 0, 0); h._holder = null; break;
      case 'fill': h.setFill(e.on !== false); break;
      case 'hide': h.group.visible = false; break;
      case 'show': h.group.visible = true; break;
      case 'place': W.placeProp(h, propRoot, e.pos[0], e.pos[1], e.pos[2], e.yaw || 0); h._holder = null; break;
      case 'release': {
        let c = releaseCache.get(idx);
        if (!c) {
          const holder = h._holder || [e.actor, e.hand || 'R'];
          const S = evalActor(actors[holder[0]], e.time);
          W.updateHeld(h, S.tilt[holder[1]]);
          c = { x: h.group.position.x, z: h.group.position.z, yaw: h.group.rotation.y };
          if (e.put) { c.x = e.put[0]; c.z = e.put[1]; }
          releaseCache.set(idx, c);
        }
        const y = typeof e.surface === 'number' ? e.surface : W.SURFACE[e.surface || 'table'];
        W.placeProp(h, propRoot, c.x, y, c.z, c.yaw); h._holder = null; break;
      }
    }
  }

  // ----- rekvisitans egna rörelser: vasen som faller och ljuset som faller -----
  function buildFx(list) {
    fxRoot = new THREE.Group(); scene.add(fxRoot);
    fxs = list.map((d) => {
      const o = { d, cache: null };
      if (d.type === 'vaseFall') {
        o.shards = new THREE.Group(); fxRoot.add(o.shards); o.shards.userData.s = 1.5;
        const sm = mat('#2f5d62', 0.3);
        o.bits = Array.from({ length: 7 }, (_, i) => { const m = mesh(box(0.1 + (i % 3) * 0.025, 0.02, 0.06 + (i % 2) * 0.035), mat('#d8ecea', 0.12, 0.2), 0, 0.01, 0); o.shards.add(m); return { m, a: i * 0.9 + 0.3, r: 0.12 + (i * 37 % 20) / 100 }; });
        o.glints = [0, 2, 4, 6].map(() => { const g = glowSprite(0.09, '#ffffff'); o.shards.add(g); return g; });
        o.flowers = [0, 1, 2].map((i) => { const m = mesh(new THREE.SphereGeometry(0.03, 10, 8), mat(i === 1 ? '#efe4d0' : '#e8b93a', 0.7), 0, 0.03, 0); o.shards.add(m); return m; });
        o.puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: '#3a2c20', roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.62, depthWrite: false }));
        o.puddle.rotation.x = -Math.PI / 2; o.puddle.position.y = 0.012; fxRoot.add(o.puddle);
      }
      if (d.type === 'chalk') {
        // Kritstreck på tavlan, ett i taget medan Per skriver. Streck, inte text.
        o.lines = Array.from({ length: d.n || 7 }, (_, i) => { const len = 0.22 + ((i * 37) % 23) / 100; const m = mesh(box(0.004, 0.012, len), mat('#efe9dd', 0.9), d.at[0], d.at[1] + 0.6 - i * 0.085, d.at[2] - 0.22 + len / 2 + ((i * 13) % 7) / 100, false); m.visible = false; fxRoot.add(m); return m; });
      }
      if (d.type === 'candleDrop') {
        o.candle = new THREE.Group(); fxRoot.add(o.candle);
        o.candle.add(mesh(cyl(0.006, 0.006, 0.07, 8), mat('#f7efd9', 0.6), 0, 0.035, 0));
        o.flame = glowSprite(0.16, '#ffc46b'); o.flame.position.y = 0.085; o.candle.add(o.flame); o.candle.scale.setScalar(1.5);
        o.flameLight = new THREE.PointLight('#ffb050', 0, 2.2, 1.6); o.flameLight.position.y = 0.1; o.candle.add(o.flameLight);
        o.mark = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), new THREE.MeshBasicMaterial({ color: '#1a100a', transparent: true, opacity: 0, depthWrite: false }));
        o.mark.rotation.x = -Math.PI / 2; fxRoot.add(o.mark);
      }
      return o;
    });
  }
  function updateFx(t) {
    fxs.forEach((o) => {
      const d = o.d, k = t - d.t;
      if (d.type === 'vaseFall') {
        const P = props[d.prop]; const v = P && P.h.group; const [dx, dz] = d.dir, [x0, y0, z0] = d.at;
        const land = Math.sqrt(2 * y0 / 9.8), tip = 0.28;
        const lx = x0 + dx * (0.12 + 0.55 * land), lz = z0 + dz * (0.12 + 0.55 * land);
        o.shards.visible = k > tip + land && !(d.clean != null && t > d.clean);
        o.puddle.visible = k > tip + land && !(d.dry != null && t > d.dry + 1.2);
        if (!v || k < 0) { o.shards.visible = false; o.puddle.visible = false; return; }
        if (k < tip + land) {
          const a = Math.min(1, k / tip) * 0.9 + Math.max(0, k - tip) * 5, tf = Math.max(0, k - tip);
          v.visible = true; v.position.set(x0 + dx * (0.12 * Math.min(1, k / tip) + 0.55 * tf), Math.max(0, y0 - 4.9 * tf * tf), z0 + dz * (0.12 * Math.min(1, k / tip) + 0.55 * tf));
          v.rotation.set(a * dz, 0, -a * dx);
        } else v.visible = false;
        const ks = Math.min(1, (k - tip - land) / 0.18);
        o.bits.forEach((b, i) => { b.m.position.set(lx + Math.cos(b.a) * b.r * ks + dx * 0.1 * ks, 0.006, lz + Math.sin(b.a) * b.r * ks + dz * 0.1 * ks); b.m.rotation.y = b.a * 2; });
        o.glints.forEach((g, i) => { const b = o.bits[i * 2].m.position; g.position.set(b.x, 0.05, b.z); g.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 6 + i * 1.7)); });
        o.flowers.forEach((m, i) => m.position.set(lx + dx * (0.25 + i * 0.07) - dz * (i - 1) * 0.08, 0.03, lz + dz * (0.25 + i * 0.07) + dx * (i - 1) * 0.08));
        let r = 0.45 * Math.min(1, (k - tip - land) / 0.8);
        if (d.dry != null && t > d.dry) r *= Math.max(0, 1 - (t - d.dry) / 1.2);
        o.puddle.scale.setScalar(Math.max(0.001, r)); o.puddle.position.set(lx + dx * 0.15, 0.012, lz + dz * 0.15);
      }
      if (d.type === 'chalk') o.lines.forEach((m, i) => { m.visible = t >= d.t0 + (i + 1) / o.lines.length * (d.t1 - d.t0); });
      if (d.type === 'candleDrop') {
        if (k < 0) { o.candle.visible = false; o.mark.material.opacity = 0; o.flameLight.intensity = 0; return; }
        if (!o.cache) { const P = props[d.from]; const v = new THREE.Vector3(); if (P) P.h.group.getWorldPosition(v); o.cache = [v.x + 0.05, v.y + 0.22, v.z]; }
        const u = Math.min(1, k / 0.5), [ax, ay, az] = o.cache, [bx, by, bz] = d.to;
        o.candle.visible = true;
        o.candle.position.set(ax + (bx - ax) * u, ay + (by - ay) * u + 0.12 * Math.sin(Math.PI * u), az + (bz - az) * u);
        o.candle.rotation.set(0, 0.4, (Math.PI / 2) * u);
        const out = d.out != null && t > d.out;
        o.flame.visible = !out; o.flameLight.intensity = out ? 0 : 1.6 + 0.3 * Math.sin(t * 17);
        o.mark.position.set(bx, by + 0.002, bz); o.mark.material.opacity = u < 1 ? 0 : Math.min(0.75, (Math.min(t, d.out ?? t) - d.t - 0.5) * 0.5);
        o.mark.scale.setScalar(1 + Math.min(1.5, Math.max(0, Math.min(t, d.out ?? t) - d.t - 0.5)));
      }
    });
  }

  function frame(t) {
    lastT = t;
    resetProps();
    events.forEach((e, i) => { if (e.time <= t) applyEvent(e, i); });
    Object.values(actors).forEach((a) => evalActor(a, t));
    Object.values(props).forEach(({ h }) => { if (h.held && h._holder) { const a = actors[h._holder[0]]; W.updateHeld(h, a.cur ? a.cur.tilt[h._holder[1]] : undefined); } });
    Object.values(actors).forEach((a) => { if (a.seat && set.chairs[a.seat] && (seatMap[a.seat].kind || 'chair') === 'chair') placeChair(set.chairs[a.seat], seatMap[a.seat], a.curStep && a.curStep.clip.chair ? a.cur.chair : 0); });
    Object.values(props).forEach(({ h, init }) => { if (!init.follow || h._holder) return; const r = figs[init.follow]; if (!r) return; const yaw = r.root.rotation.y, o = init.offset || [0, 0]; h.group.position.set(r.root.position.x + Math.sin(yaw) * o[1] + Math.cos(yaw) * o[0], 0, r.root.position.z + Math.cos(yaw) * o[1] - Math.sin(yaw) * o[0]); h.group.rotation.set(0, yaw, 0); });
    updateFx(t);
  }

  function setView(v, snap) { Object.assign(goal, v); if (snap) Object.assign(cam, goal); }
  function step(dt, rate) { const k = Math.min(1, dt * (rate || 3)); ['yaw', 'pitch', 'dist', 'tx', 'ty', 'tz'].forEach((k2) => { cam[k2] += (goal[k2] - cam[k2]) * k; }); cam.fov = goal.fov; place(); }
  function render() {
    place();
    if (set && set.room) { M.WB.updateCutaway(set.room, camera); M.WB.updateWineBarRoom(set.room, lastT * 0.08, lastT); }
    renderer.render(scene, camera);
  }
  /** Den varma graderingen på en 2D-duk: samma filter som WARM.roomGrade.service plus vinjetten. */
  function graded(out) {
    const w = out.width, h = out.height, x = out.getContext('2d');
    x.filter = GRADE.filter; x.drawImage(renderer.domElement, 0, 0, w, h); x.filter = 'none';
    const g = x.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.hypot(w, h) * 0.5);
    g.addColorStop(0, 'rgba(255,170,80,.12)'); g.addColorStop(0.85, 'rgba(20,10,5,.72)'); g.addColorStop(1, 'rgba(20,10,5,.72)');
    x.globalCompositeOperation = 'source-over'; x.fillStyle = g; x.fillRect(0, 0, w, h);
    return out;
  }
  function project(p) { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [(v.x + 1) / 2 * W_, (1 - v.y) / 2 * H_]; }
  function actorWorld(id) { const r = figs[id]; return r ? [r.root.position.x, 1.2, r.root.position.z] : null; }
  function checkSeats() {
    const V = new THREE.Vector3(); const out = [];
    Object.values(actors).forEach((a) => { if (a.cur && a.curStep && a.curStep.clip.from === 'seated' && a.curStep.clip.to === 'seated' && !a.curStep.clip.root && a.seat) out.push({ id: a.id, ...C.checkSeated(figs[a.id], seatMap[a.seat], V) }); });
    return out;
  }
  return { renderer, scene, camera, cam, goal, size, load, frame, render, step, setView, graded, project, actorWorld, checkSeats, spot, get room() { return set && set.room; }, get seats() { return seatMap; }, get actors() { return actors; }, get props() { return props; }, get figs() { return figs; }, dispose() { clear(); renderer.dispose(); } };
}
