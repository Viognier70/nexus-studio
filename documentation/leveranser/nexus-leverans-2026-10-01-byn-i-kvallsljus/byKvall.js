// byKvall.js — byn i kvällsljus (leverans 2026-10-01, underlag till 288).
// Scenen, kvällens ljus och hur gäster, sällskap, food trucks och krogar ritas på de fyra nivåerna.
// Läser nivåerna och ljusreglerna från villageEvening.ts och läget från sim-lagret (i prototypen
// byKvallSim.js). Figurerna kommer från varmScen.js (figureRig), vagnarna från byTruckar.js.
// Ingen text ritas i scenen: namn och räknare hör till HUD:en.
import * as V from './varmScen.js';
const THREE = V.THREE;
export { THREE, V };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const approach = (v, t, rate, dt) => (v < t ? Math.min(t, v + rate * dt) : Math.max(t, v - rate * dt));

const GC = new Map(); const geo = (k, f) => { let g = GC.get(k); if (!g) { g = f(); GC.set(k, g); } return g; };
const MC = new Map();
function mat(c, r = 0.85, m = 0) { const k = c + r + m; let x = MC.get(k); if (!x) { x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); MC.set(k, x); } return x; }
function mesh(g, m, x = 0, y = 0, z = 0, cast = true) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o; }
const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (a, b, h, s = 12) => geo(`c${a},${b},${h},${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const sph = (r, s = 10) => geo(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s - 4)));
const C1 = new THREE.Color(), C2 = new THREE.Color();

let GLOW = null;
function glowTex() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); GLOW = new THREE.CanvasTexture(c); return GLOW;
}
function sprite(scale, color, opacity = 0) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(scale, scale, 1); return s;
}
/** Ljus som faller på marken: en tillsatt cirkel, billigare än en lampa. */
function pool(w, d, color) {
  const m = new THREE.Mesh(geo('pool', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: glowTex(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.renderOrder = 2; return m;
}
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t; }
/** Fönsterrutan: spröjs och karm. Ljuset kommer från instansens färg. */
function paneTex(cols, rows) {
  return canvasTex(64, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d8d0c4'); g.addColorStop(1, '#ffffff'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#3a2a1e'; x.fillRect(0, 0, w, 5); x.fillRect(0, h - 5, w, 5); x.fillRect(0, 0, 5, h); x.fillRect(w - 5, 0, 5, h);
    for (let i = 1; i < cols; i++) x.fillRect(i * w / cols - 1.5, 0, 3, h);
    for (let i = 1; i < rows; i++) x.fillRect(0, i * h / rows - 1.5, w, 3);
  });
}
function roofGeo(w, d, h) { return geo(`roof${w},${d},${h}`, () => { const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.3, 0); s.lineTo(w / 2 + 0.3, 0); s.lineTo(0, h); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.6, bevelEnabled: false }); g.translate(0, 0, -(d + 0.6) / 2); return g; }); }
function shadeHex(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(1 + k); return '#' + c.getHexString(); }

// ---------- scen och kamera ----------
export function createStage(canvas, o = {}) {
  let W = o.width || 1280, H = o.height || 720;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#171c2b'); scene.fog = new THREE.Fog('#171c2b', 220, 430);
  const camera = new THREE.PerspectiveCamera(o.fov || 34, W / H, 0.5, 1400);
  const cam = { yaw: 0.16, pitch: 1, dist: 190, tx: 0, ty: 0, tz: 0, fov: o.fov || 34 }, goal = { ...cam }; let user = 0, drag = null, pan = { x: 0, z: 0 }, panGoal = { x: 0, z: 0 };
  const place = () => { const cp = Math.cos(cam.pitch); camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist); camera.lookAt(cam.tx, cam.ty, cam.tz); };
  const el = o.input || canvas; el.style.cursor = 'grab';
  // Dra: vrid och luta. Höger knapp eller skift: flytta kameran över byn.
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; user = performance.now(); });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return; const k = W / (el.getBoundingClientRect().width || W), dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
    if (drag.pan) { const m = cam.dist * 0.0016, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw); panGoal.x += (-dx * c - dy * s) * m; panGoal.z += (dx * s - dy * c) * m; }
    else { goal.yaw -= dx * 0.004; goal.pitch = clamp(goal.pitch + dy * 0.003, 0.4, 1.42); user = performance.now(); }
    drag = { ...drag, x: e.clientX, y: e.clientY };
  });
  const up = () => { drag = null; el.style.cursor = 'grab'; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  const v = new THREE.Vector3(); place();
  return {
    renderer, scene, camera, cam, goal,
    userActive: () => performance.now() - user < 7000,
    resetUser() { user = 0; panGoal.x = panGoal.z = 0; },
    get pan() { return panGoal; },
    step(dt, rate = 2.2) { const k = Math.min(1, dt * rate); for (const key of ['yaw', 'pitch', 'tx', 'ty', 'tz', 'fov']) cam[key] += (goal[key] - cam[key]) * k; pan.x += (panGoal.x - pan.x) * k; pan.z += (panGoal.z - pan.z) * k; cam.dist = Math.exp(lerp(Math.log(cam.dist), Math.log(goal.dist), k)); this.apply(); },
    snap() { Object.assign(cam, goal); pan.x = panGoal.x; pan.z = panGoal.z; this.apply(); },
    apply() { const tx = cam.tx, tz = cam.tz; cam.tx += pan.x; cam.tz += pan.z; if (camera.fov !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); } scene.fog.near = cam.dist * 1.3; scene.fog.far = cam.dist * 2.6 + 160; place(); this.focus = [cam.tx, cam.tz]; cam.tx = tx; cam.tz = tz; },
    render() { renderer.render(scene, camera); },
    project(X, Y, Z) { v.set(X, Y, Z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; },
    size(w, h) { W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    get width() { return W; }, get height() { return H; },
    dispose() { renderer.dispose(); }
  };
}

/** Kamerans inramning och sätten att rita, för ett avstånd d. Mellan nivåerna interpoleras allt logaritmiskt. */
export function frameAt(LEVELS, BLEND, d, obb) {
  const L = LEVELS, n = L.length; let i = 0; while (i < n - 2 && d < L[i + 1].dist) i++;
  const a = L[i], b = L[i + 1], k = clamp(Math.log(a.dist / d) / Math.log(a.dist / b.dist), 0, 1);
  const sc = (lv) => lv.figureScale || 2;
  let near = L[0]; L.forEach((lv) => { if (Math.abs(Math.log(d / lv.dist)) < Math.abs(Math.log(d / near.dist))) near = lv; });
  return {
    d, k, level: near.id,
    ...toWorld(obb, lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.yaw, b.yaw, k)),
    ty: lerp(a.targetY || 0, b.targetY || 0, k), pitch: lerp(a.pitch, b.pitch, k), fov: lerp(a.fov || 34, b.fov || 34, k),
    scale: lerp(sc(a), sc(b), k),
    lantern: smooth(BLEND.lantern[0], BLEND.lantern[1], d),
    figures: d < BLEND.figuresUntil,
    patch: smooth(BLEND.patch[0], BLEND.patch[1], d) * (1 - smooth(BLEND.patch[2], BLEND.patch[3], d)),
    truckLights: 1 - smooth(BLEND.truckLights - 20, BLEND.truckLights, d),
    halo: smooth(BLEND.halo[0], BLEND.halo[1], d)
  };
}

/** Mål och vridning ur rummets ram till världen (samma rotation som obbLocalToWorld och room.group.rotation.y = −angle). */
function toWorld(obb, lx, lz, yaw) {
  const c = Math.cos(obb.angle), s = Math.sin(obb.angle), ox = Math.sin(yaw), oz = Math.cos(yaw);
  return { tx: obb.centre[0] + c * lx - s * lz, tz: obb.centre[1] + s * lx + c * lz, yaw: Math.atan2(c * ox - s * oz, s * ox + c * oz) };
}

function skyAt(SKY, e) {
  let i = 0; while (i < SKY.length - 2 && e > SKY[i + 1].e) i++;
  const a = SKY[i], b = SKY[i + 1], k = clamp((e - a.e) / (b.e - a.e), 0, 1);
  const c = (p) => new THREE.Color(a[p]).lerp(new THREE.Color(b[p]), k);
  return { bg: c('bg'), hemiSky: c('hemiSky'), hemiGround: c('hemiGround'), lake: c('lake'), moon: c('moon'), hemi: lerp(a.hemi, b.hemi, k), moonI: lerp(a.moonI, b.moonI, k), exposure: lerp(a.exposure, b.exposure, k) };
}

// ---------- byn ----------
// Byggd ur spelets karta (byKarta.js = WORLD): husen är OSM-polygonerna, gatorna OSM-vägarna. Vår krog är
// rummets skal (wineBarRoom.ts, 15,6 × 11,8 m) placerat som teatern placerar rummet, så att fasaden,
// trottoaren och kön är desamma på krogens nivå och i teatern.
const ROAD_W = { secondary: 7, tertiary: 6, unclassified: 5, residential: 5, living_street: 4.6, service: 3.4, track: 3, path: 1.6, footway: 1.8, cycleway: 2.2, platform: 0 };
const LAMP_KINDS = new Set(['secondary', 'tertiary', 'unclassified', 'residential', 'living_street']);
const WALL_COLS = ['#6a5040', '#735443', '#5d4638', '#7a5a45', '#6e5a48', '#7f6650'];
function bldHeight(b, isHome) {
  if (b.height) return b.height; if (b.levels) return b.levels * 3;
  return ({ church: 8, hotel: 7.4, university: 6.5, school: 6, apartments: 6.4, industrial: 6, outbuilding: 2.6, shed: 2.4, roof: 3.2, train_station: 5 })[b.kind] || (isHome ? 3.3 : 4);
}
/** Ett sammanslaget nät: väggar och tak för alla hus, en färg per hörn. */
function merged() {
  const pos = [], col = [], c = new THREE.Color();
  const tri = (p, q, r, hex) => { c.set(hex); pos.push(...p, ...q, ...r); for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b); };
  return { tri, quad: (p, q, r, s, hex) => { tri(p, q, r, hex); tri(p, r, s, hex); }, mesh(m) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; } };
}
function polyShape(poly) { const s = new THREE.Shape(); poly.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); return s; }
function flatPoly(poly, m, y) { const o = new THREE.Mesh(new THREE.ShapeGeometry(polyShape(poly)), m); o.rotation.x = -Math.PI / 2; o.position.y = y; o.receiveShadow = true; return o; }

export function buildEveningVillage(stage, sim, cfg) {
  const { LIGHTS, COLOURS, SKY, MAP, PL } = cfg, scene = stage.scene, U = 0.1;
  const root = new THREE.Group(); scene.add(root); const add = (x) => { root.add(x); return x; };
  const grass = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#3a4434'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(' + (70 + hash(i, 1) * 26) + ',' + (82 + hash(i, 2) * 30) + ',' + (58 + hash(i, 3) * 20) + ',.35)'; x.fillRect(hash(i, 4) * w, hash(i, 5) * h, 3, 3); } }, [260, 260]);
  const gr = add(mesh(new THREE.PlaneGeometry(2600, 2600), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }), 200, 0, 50, false)); gr.rotation.x = -Math.PI / 2;
  MAP.RESIDENTIAL.forEach((q) => add(flatPoly(q.poly, mat('#3d4536', 1), 0.01)));
  MAP.GRASS.concat(MAP.GRAVEYARDS).forEach((q) => add(flatPoly(q.poly, mat('#36442f', 1), 0.015)));
  MAP.FOREST.forEach((q) => add(flatPoly(q.poly, mat('#28331f', 1), 0.02)));
  const lakeM = new THREE.MeshStandardMaterial({ color: '#16262c', roughness: 0.35, metalness: 0.1 });
  MAP.WATER.forEach((q) => add(flatPoly(q.poly, lakeM, 0.04)));
  // Gatorna: band längs OSM-linjerna, en rund skarv i varje brytpunkt.
  const roadM = mat('#4f4030', 0.95), pathM = mat('#5e4c38', 0.95);
  [[(r) => r.car && r.kind !== 'track', roadM, 0.05], [(r) => !(r.car && r.kind !== 'track'), pathM, 0.045]].forEach(([f, m, y]) => {
    const pos = [], joints = [];
    MAP.ROADS.filter(f).forEach((r) => { const w = (r.width && r.car ? Math.min(r.width, 8) : ROAD_W[r.kind] ?? 3) / 2; if (!w) return;
      for (let i = 1; i < r.poly.length; i++) { const [ax, az] = r.poly[i - 1], [bx, bz] = r.poly[i], L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue; const nx = -(bz - az) / L * w, nz = (bx - ax) / L * w;
        pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz); }
      r.poly.forEach((p) => joints.push([p[0], p[1], w])); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); const o = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.95, side: THREE.DoubleSide }))); o.receiveShadow = true;
    const jm = add(new THREE.InstancedMesh(geo('joint', () => new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2)), m, joints.length)), d = new THREE.Object3D();
    joints.forEach(([x, z, w], i) => { d.position.set(x, y + 0.001, z); d.scale.set(w, 1, w); d.updateMatrix(); jm.setMatrixAt(i, d.matrix); }); jm.receiveShadow = true;
  });
  { const T = PL.landmark('gry-torget'); const pz = add(mesh(box(36, 0.04, 9), mat('#6b5842', 0.9), T[0], 0.07, T[1] + 1.5, false)); pz.rotation.y = 0.12; }

  // Husen.
  const WIN = [], walls = merged(), roofs = merged(), houseById = new Map(sim.houses.map((h) => [h.id, h]));
  const venueIds = new Set(Object.values(PL.VENUE_BUILDINGS)), REST = sim.REST.filter((r) => !r.truck), restById = new Map(REST.filter((r) => !r.own).map((r) => [PL.VENUE_BUILDINGS[r.id], r]));
  const winRow = (e, y, size, kind, owner, role, skip, step = 3) => { const n = Math.floor((e.L - 1) / step); for (let i = 0; i < n; i++) { const s = (i + 0.5) * e.L / n, x = e.a[0] + e.t[0] * s, z = e.a[1] + e.t[1] * s; if (skip && Math.hypot(x - skip[0], z - skip[1]) < 1.5) continue; WIN.push({ x: x + e.n[0] * 0.04, y, z: z + e.n[1] * 0.04, ry: Math.atan2(e.n[0], e.n[1]), w: size[0], h: size[1], kind, owner, role: typeof role === 'function' ? role(i, n) : role, j: WIN.length }); } };
  let church = null;
  MAP.BUILDINGS.forEach((b, bi) => {
    if (b.id === PL.VENUE_BUILDINGS.var) return; // vår krog är rummets skal, nedan
    const rs = restById.get(b.id), h = houseById.get(b.id), isH = !!h, H = rs ? rs.H : bldHeight(b, isH), col = rs ? (rs.hotel ? '#7a6656' : '#6f5140') : WALL_COLS[bi % WALL_COLS.length], rcol = shadeHex(col, -0.42);
    const E = PL.edges(b.poly); E.forEach((e) => walls.quad([e.a[0], 0, e.a[1]], [e.b[0], 0, e.b[1]], [e.b[0], H, e.b[1]], [e.a[0], H, e.a[1]], col));
    const obb = PL.orientedBbox(b.poly), A = Math.abs(PL.signedArea(b.poly)), rect = b.poly.length === 5 && A / (obb.w * obb.d) > 0.9;
    if (rect && b.kind !== 'roof' && !rs) {
      const rh = Math.min(obb.w, obb.d) * 0.42, hw = obb.w / 2 + 0.3, hd = obb.d / 2 + 0.3, L = (x, z, y) => { const p = PL.obbLocalToWorld(obb, x, z); return [p[0], y, p[1]]; };
      roofs.quad(L(-hw, -hd, H), L(hw, -hd, H), L(hw, 0, H + rh), L(-hw, 0, H + rh), rcol); roofs.quad(L(-hw, hd, H), L(hw, hd, H), L(hw, 0, H + rh), L(-hw, 0, H + rh), rcol);
      roofs.tri(L(-hw, -hd, H), L(-hw, hd, H), L(-hw, 0, H + rh), col); roofs.tri(L(hw, -hd, H), L(hw, hd, H), L(hw, 0, H + rh), col);
    } else { const pts = b.poly.slice(0, -1).map((p) => new THREE.Vector2(p[0], p[1])); THREE.ShapeUtils.triangulateShape(pts, []).forEach(([i, j, k]) => roofs.tri([pts[i].x, H, pts[i].y], [pts[j].x, H, pts[j].y], [pts[k].x, H, pts[k].y], rcol)); }
    if (rs) {
      E.filter((e) => e.L > 3.5).forEach((e) => { const fr = e === rs.edge || (Math.abs(e.mid[0] - rs.edge.mid[0]) < 0.01 && Math.abs(e.mid[1] - rs.edge.mid[1]) < 0.01); winRow(e, 1.5, fr ? [1.5, 1.4] : [1.4, 1.2], 'venue', rs, (i, n) => (i === n - 1 ? 'kitchen' : 'dining'), fr ? [rs.door[0] * U, rs.door[1] * U] : null, 2.6); if (rs.hotel) [3.9, 5.7].forEach((y) => winRow(e, y, [0.9, 1.1], 'rooms', rs, null, null, 2.4)); });
    } else if (isH) E.filter((e) => e.L > 3).forEach((e) => { winRow(e, 1.6, [0.8, 1.0], 'home', h); if (H > 5.5) winRow(e, 4.4, [0.8, 1.0], 'home', h); });
    else if (b.kind === 'university' || b.kind === 'school') E.filter((e) => e.L > 3).forEach((e) => [1.5, 3.9].forEach((y) => { if (y < H - 1) winRow(e, y, [1.0, 1.2], 'school', null, null, null, 2.8); }));
    if (b.kind === 'church') church = obb;
  });
  add(walls.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })));
  add(roofs.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide })));
  const tower = new THREE.MeshStandardMaterial({ color: '#8a7a6a', roughness: 0.9, emissive: '#ffcf9a', emissiveIntensity: 0 }), churchPool = add(pool(10, 10, '#ffcf9a'));
  if (church) { const [c, d] = PL.obbLocalToWorld(church, church.w / 2 - 2, 0); add(mesh(box(3.6, 16, 3.6), tower, c, 8, d)); add(mesh(geo('spire', () => new THREE.ConeGeometry(2.6, 8, 4)), mat('#3a2f2a', 0.8), c, 20, d)).rotation.y = Math.PI / 4; churchPool.position.set(c, 0.09, d); }

  // Krogarna: fasaden är kanten med dörren. Vår krog är rummets skal i rummets ram.
  const VEN = [];
  REST.forEach((rs) => {
    const col = rs.own ? COLOURS.ourVenue : COLOURS.venue, g = new THREE.Group(); add(g);
    let door, nrm, Hh = rs.H;
    if (rs.own) {
      const o = rs.obb, hw = 7.8, hd = 5.9; Hh = 3.65; g.position.set(o.centre[0], 0, o.centre[1]); g.rotation.y = -o.angle;
      g.add(mesh(box(hw * 2, Hh, hd * 2), mat('#7a5640', 0.9), 0, Hh / 2, 0)); g.add(mesh(box(hw * 2 + 0.4, 0.3, hd * 2 + 0.4), mat('#4a3426', 0.85), 0, Hh + 0.15, 0));
      const pv = sim.PV; door = [rs.door[0] * U, rs.door[1] * U]; nrm = rs.nrm;
      const toW = (lx, lz) => pv.local(lx, lz), fake = (ax, az, bx, bz) => { const A = toW(ax, az), B = toW(bx, bz), L = Math.hypot(B[0] - A[0], B[1] - A[1]), t2 = [(B[0] - A[0]) / L, (B[1] - A[1]) / L]; return { a: A, b: B, L, t: t2, n: [-t2[1], t2[0]] }; };
      [fake(hw, hd, hw, -hd), fake(hw, -hd, -hw, -hd), fake(-hw, hd, hw, hd), fake(-hw, -hd, -hw, hd)].forEach((e, ei) => winRow(e, 1.5, [1.5, 1.4], 'venue', rs, (i, n) => (i === n - 1 ? 'kitchen' : 'dining'), ei === 0 ? door : null, 2.6));
      const pav = new THREE.Mesh(new THREE.PlaneGeometry(3.4, hd * 2 + 3.2 + 2.8 - hd), mat('#4b433c', 0.95)); pav.rotation.x = -Math.PI / 2; pav.position.set(hw + 1.7, 0.075, (-hd - 3.2 + 2.8) / 2); pav.receiveShadow = true; g.add(pav);
      g.add(mesh(box(0.15, 0.12, 2.8 + hd + 3.2), mat('#7d796e', 0.9), hw + 3.475, 0.06, (-hd - 3.2 + 2.8) / 2, false));
    } else { door = [rs.door[0] * U, rs.door[1] * U]; nrm = rs.nrm; }
    const ry = Math.atan2(nrm[0], nrm[1]), at = (out, y, side = 0) => [door[0] + nrm[0] * out + nrm[1] * side, y, door[1] + nrm[1] * out - nrm[0] * side];
    const doorM = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.6, emissive: col, emissiveIntensity: 0 });
    const dm = add(mesh(geo('door', () => new THREE.PlaneGeometry(1.3, 2.3)), doorM, ...at(0.05, 1.15), false)); dm.rotation.y = ry;
    const signM = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.7, emissive: '#e8a850', emissiveIntensity: 0 });
    add(mesh(box(2.6, 0.55, 0.12), signM, ...at(0.1, Math.min(Hh - 0.5, 3.0)), false)).rotation.y = ry;
    const lanterns = [-1.1, 1.1].map((ox) => { const m = new THREE.MeshBasicMaterial({ color: '#3a342c' }); add(mesh(sph(0.13, 8), m, ...at(0.2, 2.45, ox), false)); const s = add(sprite(1.7, col)); s.position.set(...at(0.3, 2.45, ox)); return { m, s }; });
    if (!rs.own) { const p = add(new THREE.Mesh(new THREE.PlaneGeometry(Math.min(rs.edge.L, 14), 1.4), mat('#6b5d4e', 0.92))); p.position.set(...at(0.7, 0.075)); p.rotation.set(-Math.PI / 2, 0, ry); p.receiveShadow = true; }
    const spill = add(pool(9, 7, col)); spill.position.set(...at(3, 0.09)); spill.rotation.z = ry;
    const back = add(pool(8, 4, col)); back.position.set(...at(-6, 0.09)); back.rotation.z = ry;
    const halo = add(sprite(18, col)); halo.position.set(rs.cx * U, Hh + 5, rs.cy * U);
    const light = new THREE.PointLight(col, 0, 16, 1.6); light.position.set(...at(1.4, 2.8)); add(light);
    VEN.push({ rs, doorM, signM, lanterns, spill, back, halo, light, k: 0, kk: 0, col: new THREE.Color(col) });
  });

  // Skogen: träd i skogspolygonerna inom kartans utsnitt.
  { const [X0, X1, Z0, Z1] = MAP.META.crop, trees = [];
    MAP.FOREST.forEach((q) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; q.poly.forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
      for (let x = Math.max(x0, X0); x < Math.min(x1, X1); x += 7) for (let z = Math.max(z0, Z0); z < Math.min(z1, Z1); z += 7) { const jx = x + (hash(x, z) - 0.5) * 5, jz = z + (hash(z, x) - 0.5) * 5; if (trees.length < 3500 && PL.inside(q.poly, jx, jz)) trees.push([jx, jz, 0.8 + hash(jx, jz) * 0.7]); } });
    const cone = add(new THREE.InstancedMesh(geo('treecone', () => new THREE.ConeGeometry(1, 2.4, 7)), mat('#26341e', 0.9), Math.max(1, trees.length))), d = new THREE.Object3D(); cone.castShadow = true;
    trees.forEach(([x, z, s], i) => { d.position.set(x, 3.4 * s, z); d.scale.set(2.2 * s, 2.6 * s, 2.2 * s); d.updateMatrix(); cone.setMatrixAt(i, d.matrix); }); }

  // Gatlyktorna längs bilgatorna, var 30:e meter, växelvis på var sin sida.
  const LAMPS = [], [CX0, CX1, CZ0, CZ1] = [-260, 680, -220, 380], lampPts = [];
  MAP.ROADS.filter((r) => LAMP_KINDS.has(r.kind)).forEach((r) => { const w = (r.width ? Math.min(r.width, 8) : ROAD_W[r.kind]) / 2 + 0.9; let acc = 12, side = 1;
    for (let i = 1; i < r.poly.length; i++) { const [ax, az] = r.poly[i - 1], [bx, bz] = r.poly[i], L = Math.hypot(bx - ax, bz - az); while (acc < L) { const k = acc / L, x = ax + (bx - ax) * k - (bz - az) / L * w * side, z = az + (bz - az) * k + (bx - ax) / L * w * side; if (x > CX0 && x < CX1 && z > CZ0 && z < CZ1) lampPts.push([x, z]); side = -side; acc += 30; } acc -= L; } });
  const pole = mat('#222', 0.6, 0.3), poles = add(new THREE.InstancedMesh(cyl(0.07, 0.09, 3.6, 6), pole, lampPts.length)), heads = add(new THREE.InstancedMesh(sph(0.22, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), lampPts.length)), dd = new THREE.Object3D();
  const ourDoor = VEN.find((v) => v.rs.own).rs.door, near = lampPts.map((p, i) => [Math.hypot(p[0] - ourDoor[0] * U, p[1] - ourDoor[1] * U), i]).sort((a, b) => a[0] - b[0]).slice(0, 6).map((x) => x[1]);
  lampPts.forEach(([a, b], i) => {
    dd.position.set(a, 1.8, b); dd.updateMatrix(); poles.setMatrixAt(i, dd.matrix); dd.position.set(a, 3.7, b); dd.updateMatrix(); heads.setMatrixAt(i, dd.matrix); heads.setColorAt(i, C1.set('#3a342c'));
    const s = add(sprite(3.2, COLOURS.lamp)); s.position.set(a, 3.6, b);
    const pl = add(pool(LIGHTS.lamps.poolRadiusM * 2, LIGHTS.lamps.poolRadiusM * 2, COLOURS.lamp)); pl.position.set(a, 0.085, b);
    let light = null; if (near.includes(i)) { light = new THREE.PointLight(COLOURS.lamp, 0, 16, 1.6); light.position.set(a, 3.6, b); add(light); }
    LAMPS.push({ s, pl, light, thr: lerp(...LIGHTS.lamps.on, hash(i, 21)), k: 0, i });
  });

  // Fönstren som instanser: ljuset är instansens färg.
  const H = LIGHTS.homes, winMats = { home: new THREE.MeshBasicMaterial({ map: paneTex(2, 2) }), venue: new THREE.MeshBasicMaterial({ map: paneTex(3, 2) }) };
  const groups = { home: WIN.filter((w) => w.kind !== 'venue'), venue: WIN.filter((w) => w.kind === 'venue') }, inst = {}, dummy = new THREE.Object3D();
  Object.entries(groups).forEach(([k, list]) => {
    const im = new THREE.InstancedMesh(geo('win', () => new THREE.PlaneGeometry(1, 1)), winMats[k], Math.max(1, list.length));
    list.forEach((w, i) => { dummy.position.set(w.x, w.y, w.z); dummy.rotation.set(0, w.ry, 0); dummy.scale.set(w.w, w.h, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, C1.set(COLOURS.windowOff)); w.c = 0; });
    im.instanceMatrix.needsUpdate = true; add(im); inst[k] = { im, list };
  });
  WIN.forEach((w, i) => {
    if (w.kind === 'home') { const n = w.owner.i; w.lit = (w.j % 3 === 0) || hash(n * 7 + w.j, 9) > 0.35; w.tone = new THREE.Color(hash(n, 8) < H.tvShare ? COLOURS.tv : COLOURS.home[Math.floor(hash(n, 6) * 3)]); }
    else if (w.kind === 'school') { w.off = lerp(...LIGHTS.school.off, hash(i, 31)); if (hash(i, 32) < 0.12) w.off = LIGHTS.school.lateKitchen; w.tone = new THREE.Color(COLOURS.home[1]); }
    else if (w.kind === 'rooms') { w.on = lerp(...LIGHTS.hotelRooms.on, hash(i, 33)); w.offE = lerp(...LIGHTS.hotelRooms.off, hash(i, 34)); w.lit = hash(i, 35) > 0.3; w.tone = new THREE.Color(COLOURS.home[2]); }
    else w.tone = new THREE.Color(w.owner.own ? COLOURS.ourVenue : COLOURS.venue);
  });
  const offC = new THREE.Color(COLOURS.windowOff);
  const hemi = new THREE.HemisphereLight('#8a94b8', '#4a3624', 1.2); add(hemi);
  const moon = new THREE.DirectionalLight('#c8c4d8', 1); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0004; add(moon); add(moon.target);
  const lampOff = new THREE.Color('#3a342c'), lampOn = new THREE.Color(COLOURS.lampHead).multiplyScalar(2.4);

  return {
    venues: VEN,
    /** st: { e, dt (realtid), t (realtid), f (frameAt), snap } */
    update(st) {
      const { e, f } = st, dt = st.snap ? 1e3 : st.dt, sky = skyAt(SKY, e);
      scene.background.copy(sky.bg); scene.fog.color.copy(sky.bg); hemi.color.copy(sky.hemiSky); hemi.groundColor.copy(sky.hemiGround); hemi.intensity = sky.hemi;
      moon.color.copy(sky.moon); moon.intensity = sky.moonI; lakeM.color.copy(sky.lake); stage.renderer.toneMappingExposure = sky.exposure;
      // Månens skugga följer kameran, så att skuggan är skarp på varje nivå.
      const fc = stage.focus || [0, 0], R = clamp(stage.cam.dist * 0.95, 30, 180);
      moon.target.position.set(fc[0], 0, fc[1]); moon.position.set(fc[0] - 40, 90, fc[1] + 60);
      const sc = moon.shadow.camera; if (sc.right !== R) { Object.assign(sc, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 320 }); sc.updateProjectionMatrix(); }
      LAMPS.forEach((L) => {
        const on = e >= L.thr; L.k = st.snap ? (on ? 1 : 0) : (on ? Math.min(1, L.k + dt / LIGHTS.lamps.flickerS) : Math.max(0, L.k - dt * 2));
        const v = on && L.k < 1 ? L.k * (hash(Math.floor(st.t * 22) + L.i * 13, 3) > 0.45 ? 1 : 0.15) : L.k;
        heads.setColorAt(L.i, C1.copy(lampOff).lerp(lampOn, v)); L.s.material.opacity = 0.55 * v; L.pl.material.opacity = 0.3 * v * (1 - 0.65 * f.lantern); if (L.light) L.light.intensity = 16 * v;
      });
      if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
      const ch = smooth(...LIGHTS.church.on, e); tower.emissiveIntensity = 0.32 * ch; churchPool.material.opacity = 0.35 * ch;
      VEN.forEach((v) => {
        const rs = v.rs, rate = 1 / LIGHTS.venue.rampS;
        v.k = approach(v.k, rs.open ? 1 : 0, rate, dt); v.kk = approach(v.kk, rs.open || rs.prep || rs.cleaning ? 1 : 0, rate, dt);
        const inside = sim.insideTotal(rs.id), fill = clamp(inside / 14, 0, 1);
        v.doorM.emissiveIntensity = 0.45 * v.k; v.signM.emissiveIntensity = 0.75 * v.k;
        v.lanterns.forEach((L) => { L.m.color.copy(lampOff).lerp(C2.copy(v.col).multiplyScalar(2.4), v.k); L.s.material.opacity = 0.8 * v.k; });
        v.spill.material.opacity = 0.34 * v.k * (0.7 + 0.3 * fill); v.back.material.opacity = 0.2 * Math.max(v.k, v.kk * 0.5);
        v.halo.material.opacity = 0.5 * v.k * f.halo * (0.5 + 0.5 * fill); const hs = 14 + LIGHTS.venue.haloPerGuest * Math.sqrt(inside); v.halo.scale.set(hs, hs, 1);
        v.light.intensity = (rs.own ? 30 : 24) * v.k;
      });
      const VK = new Map(VEN.map((v) => [v.rs, v]));
      Object.values(inst).forEach(({ im, list }) => {
        list.forEach((w, i) => {
          let tgt = 0, direct = null;
          if (w.kind === 'home') tgt = w.lit && sim.houseLit(w.owner) ? 1 : 0;
          else if (w.kind === 'school') tgt = e < w.off ? 1 : 0;
          else if (w.kind === 'rooms') tgt = w.lit && e >= w.on && e < w.offE ? 1 : 0;
          else { const v = VK.get(w.owner); direct = w.role === 'kitchen' ? v.kk : v.k; }
          w.c = direct != null ? direct : (st.snap ? tgt : approach(w.c, tgt, 2.2, dt));
          C1.copy(offC).lerp(C2.copy(w.tone).multiplyScalar(w.kind === 'venue' ? 2.8 : 2.2), w.c); im.setColorAt(i, C1);
        });
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      });
    }
  };
}

// ---------- food truckarna ----------
/** Körs efter BYT.draw3d: stängd lucka, ljusslingan på gatans nivå och skenet på byns nivå. */
export function updateTrucks(sim, f, st, COLOURS) {
  if (!sim.truckGfx) return;
  const dt = st.snap ? 1e3 : st.dt;
  sim.REST.forEach((rs) => {
    if (!rs.truck) return; const G = sim.truckGfx.get(rs); if (!G) return;
    if (!G.x) {
      const lights = new THREE.Group(), bulbs = [], halos = [];
      for (let i = 0; i < 7; i++) { const m = new THREE.MeshBasicMaterial({ color: '#3a342c' }); const b = new THREE.Mesh(sph(0.07, 6), m); const x = -2.4 + i * 0.62, y = 2.36 - Math.sin((i / 6) * Math.PI) * 0.12; b.position.set(x, y, 2.38); lights.add(b); bulbs.push(m); const s = sprite(0.9, COLOURS.venue); s.position.set(x, y, 2.45); lights.add(s); halos.push(s); }
      G.g.add(lights); const glow = sprite(16, COLOURS.venue); glow.position.set(-0.4, 3, 1.4); G.g.add(glow);
      G.hatch.material = G.hatch.material.clone(); G.x = { lights, bulbs, halos, glow, k: 0 };
    }
    const X = G.x, open = !rs.shut && !rs.drive; X.k = approach(X.k, open ? 1 : 0, 1.2, dt);
    G.awn.visible = open || X.k > 0.5; G.hatch.visible = true; G.hatch.material.emissiveIntensity = 1.2 * X.k; G.hatch.material.color.set(X.k > 0.5 ? '#ffe2a0' : '#3a2a1c'); G.light.intensity = 6 * X.k;
    X.lights.visible = f.truckLights > 0.01 && X.k > 0.01; X.bulbs.forEach((m) => m.color.set(COLOURS.lampHead).multiplyScalar(0.3 + 2 * X.k)); X.halos.forEach((s) => (s.material.opacity = 0.7 * f.truckLights * X.k));
    X.glow.material.opacity = 0.6 * X.k * f.lantern;
  });
}

// ---------- gästerna och sällskapen ----------
export function createGuests(scene, COLOURS) {
  const gfx = new Map(), patchGeo = new THREE.CircleGeometry(1, 28), flashes = new Map();
  const make = (w) => {
    const col = COLOURS.guest[w.type], lantern = sprite(1, col), core = new THREE.Mesh(patchGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, toneMapped: false })), patch = new THREE.Mesh(patchGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false }));
    patch.rotation.x = -Math.PI / 2; patch.renderOrder = 1; core.rotation.x = -Math.PI / 2; core.renderOrder = 3; scene.add(lantern); scene.add(patch); scene.add(core);
    return { figs: null, lantern, patch, core, ring: null };
  };
  return {
    update(sim, f, t) {
      const seen = new Set(), map = sim.map;
      sim.walkers.forEach((w) => {
        seen.add(w); let G = gfx.get(w); if (!G) { G = make(w); gfx.set(w, G); }
        const n = w.n, ca = Math.cos(w.a), sa = Math.sin(w.a), px = -sa, py = ca, sp = 7.5 * f.scale;
        if (f.figures && !G.figs) G.figs = w.looks.map((look, i) => { const A = { look, skin: w.skins[i], hair: w.hairs[i], long: w.longs[i], seed: w.seed + i, kind: 'guest', x: w.x, y: w.y, a: w.a }; return { A, F: V.makeFigure(scene, A, { scale: f.scale, shadow: false, blob: true }) }; });
        let cx = 0, cy = 0;
        for (let i = 0; i < n; i++) {
          let ox, oy;
          if (w.queued && !w.mv) { const off = n > 1 ? (i - (n - 1) / 2) * Math.min(6, 12 / (n - 1)) : 0; ox = px * off; oy = py * off; }
          else if (w.atDoor) { const off = (i - (n - 1) / 2) * 6 * f.scale; ox = px * off; oy = py * off; }
          else if (w.ate && w.stop > 0) { ox = i ? Math.cos(i * 2.4 + w.seed) * 6 * f.scale : 0; oy = i ? Math.sin(i * 2.4 + w.seed) * 6 * f.scale : 0; }
          else { const back = Math.floor((i + 1) / 2) * sp, side = i === 0 ? 0 : (i % 2 ? -1 : 1) * sp * 0.75, drift = Math.sin(t * 0.5 + w.seed + i * 1.9) * sp * 0.2 * (1 - f.patch); ox = -ca * back + px * (side + drift); oy = -sa * back + py * (side + drift); }
          const X = w.x + ox, Y = w.y + oy; cx += X / n; cy += Y / n;
          if (G.figs) {
            const { A, F } = G.figs[i]; A.x = X; A.y = Y;
            A.a = w.lookAt && w.stop > 0 ? Math.atan2(w.lookAt.y - Y, w.lookAt.x - X) : w.a;
            A.mv = w.mv; A.ph = (w.odo / (1.4 * f.scale) + i * 0.37) * 16.6; A.g = w.wave && w.wave > sim.t && i === 0 ? 'wave' : 'none'; A.hidden = !f.figures; F.scale = f.scale;
            if (f.figures) V.poseFigure(F, A, t); V.placeFigure(F, A, map, t);
          }
        }
        const [wx, wz] = map(cx, cy);
        G.lantern.visible = G.core.visible = f.lantern > 0.01; G.lantern.material.opacity = 0.4 * f.lantern; const kd = clamp(f.d / 150, 0.7, 1.4), ls = (4 + 1.6 * Math.sqrt(n)) * kd; G.lantern.scale.set(ls, ls, 1); G.lantern.position.set(wx, 1.5, wz);
        G.core.material.opacity = f.lantern; G.core.scale.setScalar((0.9 + 0.35 * Math.sqrt(n)) * kd); G.core.position.set(wx, 0.14, wz);
        G.patch.visible = f.figures && f.patch > 0.01; G.patch.material.opacity = 0.16 * f.patch; G.patch.scale.setScalar((0.6 + 0.3 * n) * f.scale); G.patch.position.set(wx, 0.1, wz);
        if (w.ring && !G.ring) G.ring = V.makeRing(scene, w.ring === 'miljardar' ? '#ffcf5a' : COLOURS.guest.social, w.ring === 'follow' ? 1.5 : w.ring === 'miljardar' ? 3.2 : 2.4);
        if (G.ring) { G.ring.position.set(wx, 0.1, wz); G.ring.scale.setScalar(clamp(f.d / 120, 0.45, 1.25) * (1 + Math.sin(t * 4) * 0.06)); }
      });
      for (const [w, G] of gfx) if (!seen.has(w)) { if (G.figs) G.figs.forEach((x) => V.disposeFigure(x.F)); G.lantern.removeFromParent(); G.patch.removeFromParent(); G.core.removeFromParent(); if (G.ring) G.ring.removeFromParent(); gfx.delete(w); }
      // När ett sällskap går in blinkar dörren till, i gästtypens färg (i stället för en räknare i bilden).
      (sim.pops || []).forEach((p) => { if (!flashes.has(p)) { const s = sprite(1, COLOURS.guest[p.type]); scene.add(s); flashes.set(p, s); } const s = flashes.get(p), k = clamp(1 - (p.until - sim.t) / 1.2, 0, 1), [a, b] = map(p.x, p.y), sc = (2 + 3 * k) * clamp(f.d / 60, 0.6, 2.4); s.position.set(a, 1.4, b); s.scale.set(sc, sc, 1); s.material.opacity = 0.8 * (1 - k); });
      for (const [p, s] of flashes) if (!sim.pops.includes(p)) { s.removeFromParent(); flashes.delete(p); }
    }
  };
}

// ---------- bilarna ----------
export function createCars(scene, COLOURS) {
  const gfx = new Map();
  const make = (col) => {
    const g = new THREE.Group(), bodyM = mat(col, 0.4, 0.5);
    g.add(mesh(box(4.2, 0.8, 1.9), bodyM, 0, 0.65, 0)); g.add(mesh(box(2.2, 0.7, 1.7), mat(shadeHex(col, -0.3), 0.2, 0.4), -0.2, 1.35, 0));
    [[-1.3, 0.95], [1.3, 0.95], [-1.3, -0.95], [1.3, -0.95]].forEach(([x, z]) => { const w = mesh(cyl(0.36, 0.36, 0.25, 12), mat('#151515', 0.9), x, 0.36, z); w.rotation.x = Math.PI / 2; g.add(w); });
    const heads = new THREE.Group(); [-0.6, 0.6].forEach((z) => { heads.add(mesh(box(0.05, 0.2, 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(COLOURS.headlight).multiplyScalar(2) }), 2.11, 0.75, z, false)); const s = sprite(2.2, COLOURS.headlight, 0.9); s.position.set(2.4, 0.75, z); heads.add(s); });
    const beam = pool(13, 4.6, COLOURS.headlight); beam.position.set(8.6, 0.1, 0); beam.material.opacity = 0.3; heads.add(beam); g.add(heads);
    [-0.6, 0.6].forEach((z) => g.add(mesh(box(0.05, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: '#6a2a1a' }), -2.11, 0.75, z, false)));
    scene.add(g); return { g, heads };
  };
  return {
    update(sim) {
      const seen = new Set();
      sim.cars.forEach((c) => { seen.add(c); let C = gfx.get(c); if (!C) { C = make(c.col); gfx.set(c, C); } const [a, b] = sim.map(c.x, c.y); C.g.position.set(a, 0, b); C.g.rotation.y = -c.a; C.heads.visible = !c.parked; });
      for (const [c, C] of gfx) if (!seen.has(c)) { C.g.removeFromParent(); gfx.delete(c); }
    }
  };
}

/** Den varma graderingen (WARM.roomGrade.service och vinjetten), bakad i pixlarna, så att bilderna blir lika. */
export function grade(src, out) {
  const w = out.width, h = out.height, x = out.getContext('2d');
  x.filter = 'saturate(1.1) brightness(.92)'; x.drawImage(src, 0, 0, w, h); x.filter = 'none';
  x.save(); x.translate(w * 0.5, h * 0.45); x.scale(w * 0.5 * Math.SQRT2, h * 0.55 * Math.SQRT2);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(255,170,80,.12)'); g.addColorStop(0.85, 'rgba(20,10,5,.72)'); g.addColorStop(1, 'rgba(20,10,5,.72)');
  x.fillStyle = g; x.fillRect(-1.5, -1.5, 3, 3); x.restore();
}
