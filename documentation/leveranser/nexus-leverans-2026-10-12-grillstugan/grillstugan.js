// grillstugan.js — D13 (2026-10-12): grillvagn B, Grillstugan, färdigbyggd. Anders valde B 2026-10-12.
// Samma ram som D7, D10 och D12 (grillvagnar.TRUCK_FRAME): +x längs vagnen mot serveringen, +z ut från luckan mot kön,
// lådan 4,6 × 2,3 m, dragkroken i x −3,4. Stationerna, dörren och medhjälparens väg är D12:s (TRUCKS.B).
// Markisen över kön är ett tillval som spelaren köper (STUGAN.awning.item). Vagnen är färdig utan den: kylen har ett eget
// skåp mot västra gaveln, menyn har ett eget tak, och luckans skiva skyddar den som beställer.
// Taket, kylskåpets tak och markisens duk tonar ut på krogens nivå som husens tak (ROOF_BLEND, 40 → 26 m).
// Vindskivorna, takrännorna, stuprören, luckans festonger och markisens stolpar och festonger står kvar. Ingen text på skyltar och tavlor.

import { TRUCK_FRAME, ROOF_BLEND, roofOpacity, LIV, CREAM, STEEL, INK, TRUCKS } from './grillvagnar.js';

export { TRUCK_FRAME, ROOF_BLEND, roofOpacity };

const B0 = TRUCKS.B;
export const STUGAN = {
  id: 'B', name: 'grillstugan', floorY: B0.floorY, counterY: B0.counterY, hatch: B0.hatch,
  stations: B0.stations, door: B0.door, helper: B0.helper, grill: B0.grill,
  eaveY: 2.55, ridgeY: 3.05, bodyBottomY: 0.36, overhangM: 0.22,
  flap: { lengthM: 1.08, angleDeg: 100 },
  /** Kylen står i ett eget skåp mot västra gaveln, med front mot kön. Förut stod den fritt under markisen. */
  fridge: { x0: -2.92, x1: -2.4, z0: 0.42, z1: 0.92, faces: '+z', outside: true, cabinet: { x0: -3.06, x1: -2.3, z0: 0.24, z1: 1.1, roofY: 2.02 } },
  shelf: { x0: -1.3, x1: 1.3, z0: 1.15, z1: 1.47, y: 1.15 },
  payLedge: { x0: -0.95, x1: -0.25, z0: 1.16, z1: 1.48 }, terminal: [-0.47, 1.33], sauces: [0.62, 1.33], napkins: [0.98, 1.33],
  bin: [1.86, 1.62], menuStand: { p: [-3.35, 1.55], yaw: -0.35 }, gasBox: { x0: -3.02, x1: -2.52, z0: -0.78, z1: -0.28 },
  socket: [-1.6, -2.45], wheels: { x: [-0.38, 0.38], r: 0.27, z: 1.03 }, legs: [[-2.12, -0.98], [2.12, -0.98], [-2.12, 0.98], [2.12, 0.98]],
  sign: { x: 2.34, y: 2.78, z: 0, w: 1.3, h: 0.34 }, window: { x: 2.3, z: -0.5, y0: 1.25, y1: 1.9, w: 0.62 },
  /** Tillvalet. item är förmågan i butiken (Utrustning). x/z är markisens fotavtryck, yIn vid väggen och yOut vid kanten. */
  awning: { item: 'equipment.queueAwning', x0: -4.6, x1: -1.35, z0: 1.19, z1: 2.95, yIn: 2.45, yOut: 2.2, posts: [[-4.6, 2.95], [-1.35, 2.95], [-4.6, 1.24]] }
};

/** Det som håller regnet borta: rektanglar med takets höjd. Regnet slutar där, och marken under är torr. */
export function stuganShelters(awningOn) {
  const S = STUGAN, B = TRUCK_FRAME.body, o = S.overhangM, fl = flapEdge(), c = S.fridge.cabinet, a = S.awning;
  const list = [
    { id: 'roof', x0: B.x0 - 0.17, x1: B.x1 + 0.17, z0: B.z0 - o, z1: B.z1 + o, y: S.eaveY },
    { id: 'flap', x0: S.hatch.x0 - 0.1, x1: S.hatch.x1 + 0.1, z0: B.z1, z1: fl.z, y: fl.y },
    { id: 'fridge', x0: c.x0 - 0.04, x1: c.x1, z0: c.z0, z1: c.z1 + 0.06, y: c.roofY },
    { id: 'menu', x0: S.menuStand.p[0] - 0.52, x1: S.menuStand.p[0] + 0.52, z0: S.menuStand.p[1] - 0.16, z1: S.menuStand.p[1] + 0.2, y: 2.08 }
  ];
  if (awningOn) list.push({ id: 'awning', x0: a.x0, x1: a.x1, z0: a.z0, z1: a.z1, y: a.yOut });
  return list;
}
/** Luckans skiva: ytterkanten (z, y) när den är uppfälld. */
export function flapEdge() { const S = STUGAN, phi = S.flap.angleDeg * Math.PI / 180, hy = S.hatch.y1 + 0.06; return { z: TRUCK_FRAME.body.z1 + S.flap.lengthM * Math.sin(phi), y: hy - S.flap.lengthM * Math.cos(phi), hingeY: hy }; }

export function buildGrillstugan(THREE, opts) {
  opts = opts || {};
  const S = STUGAN, g = new THREE.Group(); g.name = 'grillstugan';
  const awningGroup = new THREE.Group(); awningGroup.name = 'queueAwning'; g.add(awningGroup);
  const roof = [], canopy = [], lights = [], anim = [], wet = [];
  const W = (m, dk) => { wet.push({ m, c: m.color.clone(), r: m.roughness, dk: dk ?? 0.28 }); return m; };
  const M = (c, r = 0.8, m = 0, e, ei) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); if (e) { x.emissive = new THREE.Color(e); x.emissiveIntensity = ei ?? 1.2; } return x; };
  const T = (map, r = 0.85, e) => { const x = new THREE.MeshStandardMaterial({ map, roughness: r, transparent: !!map.userData.alpha, alphaTest: map.userData.alpha ? 0.4 : 0 }); if (e) { x.emissive = new THREE.Color('#ffffff'); x.emissiveMap = map; x.emissiveIntensity = e; } return x; };
  const box = (w, h, d, m, x, y, z, p) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (p || g).add(o); return o; };
  const cyl = (r, h, m, x, y, z, ax, p, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 18), m); o.position.set(x, y, z); if (ax === 'x') o.rotation.z = Math.PI / 2; if (ax === 'z') o.rotation.x = Math.PI / 2; o.castShadow = true; (p || g).add(o); return o; };
  const light = (c, i, d, x, y, z, p) => { const L = new THREE.PointLight(c, i, d, 1.6); L.position.set(x, y, z); (p || g).add(L); lights.push(L); return L; };
  const tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const a = draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } if (a === 'alpha') t.userData.alpha = true; return t; };
  const stripes = (a, b, n) => tex(256, 32, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * w / n, 0, w / n + 1, h); } });
  const valance = (a, b, n) => tex(512, 64, (x, w, h) => { const sw = w / n; for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; x.beginPath(); x.moveTo(i * sw, 0); x.lineTo((i + 1) * sw, 0); x.lineTo((i + 1) * sw, h * 0.45); x.arc((i + 0.5) * sw, h * 0.45, sw / 2, 0, Math.PI); x.closePath(); x.fill(); } return 'alpha'; });
  const sausageIcon = (x, cx, cy, s, col, bun) => { if (bun) { x.fillStyle = bun; x.beginPath(); x.ellipse(cx, cy + s * 0.12, s * 0.62, s * 0.2, 0, 0, Math.PI * 2); x.fill(); } x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, s * 0.7, s * 0.13, 0, 0, Math.PI * 2); x.fill(); };
  const cupIcon = (x, cx, cy, s, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(cx - s * 0.3, cy - s * 0.35); x.lineTo(cx + s * 0.3, cy - s * 0.35); x.lineTo(cx + s * 0.22, cy + s * 0.35); x.lineTo(cx - s * 0.22, cy + s * 0.35); x.closePath(); x.fill(); };
  const chalkMenu = (rows) => tex(256, 256, (x, w, h) => {
    x.fillStyle = '#5e4b3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#2b2a28'; x.fillRect(14, 14, w - 28, h - 28);
    x.strokeStyle = 'rgba(236,230,214,.85)'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, 44); x.lineTo(150, 44); x.stroke();
    sausageIcon(x, 196, 44, 36, 'rgba(230,187,52,.95)');
    for (let i = 0; i < rows; i++) {
      const y = 84 + i * (150 / rows); x.lineWidth = 5; x.strokeStyle = 'rgba(236,230,214,.75)';
      if (i % 3 === 2) cupIcon(x, 48, y, 26, 'rgba(236,230,214,.8)'); else sausageIcon(x, 48, y, 26, 'rgba(236,230,214,.8)', i % 3 ? 'rgba(214,164,92,.8)' : null);
      x.beginPath(); x.moveTo(76, y); x.lineTo(150 + (i % 2) * 24, y); x.stroke();
      x.fillStyle = 'rgba(230,187,52,.9)'; x.beginPath(); x.arc(212, y, 7, 0, Math.PI * 2); x.fill();
    }
  });
  const signTex = (bg, fg) => tex(512, 128, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); sausageIcon(x, w / 2, h / 2, 150, fg, '#c8a46a'); [-1, 1].forEach((s) => { x.fillStyle = fg; x.beginPath(); x.arc(w / 2 + s * 180, h / 2, 11, 0, Math.PI * 2); x.fill(); }); });
  const boards = (c1, c2, rep) => tex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 3 === 1 ? c2 : c1; x.fillRect(i * 32, 0, 32, h); x.fillStyle = 'rgba(20,10,4,.5)'; x.fillRect(i * 32, 0, 2, h); for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(60,30,12,.18)'; x.fillRect(i * 32 + 6 + (k * 7) % 20, (k * 53 + i * 31) % h, 2, 30); } } }, rep || [3, 1]);
  // Plåttaket med falsar som löper från nock till takfot.
  const seams = tex(512, 64, (x, w, h) => { x.fillStyle = '#3f3d3a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const sx = i * w / 9; x.fillStyle = 'rgba(255,248,236,.13)'; x.fillRect(sx, 0, 4, h); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(sx + 4, 0, 3, h); } });

  const B = TRUCK_FRAME.body, Lx = B.x1 - B.x0, Wz = B.z1 - B.z0, H = S.hatch, F = S.floorY, eave = S.eaveY, ridge = S.ridgeY, bot = S.bodyBottomY, wall = 0.06;
  const wood = W(T(boards('#a77b4c', '#9a6f43'), 0.85), 0.3), blue = W(M(LIV, 0.6), 0.22), steel = M(STEEL, 0.35, 0.6), dark = M('#1e1c1b', 0.9);
  const darkWood = W(T(boards('#6a4a2e', '#5d4128', [2, 1]), 0.9), 0.25);
  const glass = new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28 });
  const fade = (m) => { m.transparent = true; return m; };
  const sausages = (x0, x1, z, y, n) => { for (let i = 0; i < n; i++) cyl(0.022, 0.2, M('#9a5a32', 0.55, 0, '#5a2408', 0.25), x0 + (i + 0.5) * (x1 - x0) / n, y, z, 'z', null, 8); };
  const awningSlope = (x0, x1, z0, y0, z1, y1, mat, p) => { const len = Math.hypot(z1 - z0, y1 - y0), o = box(x1 - x0, 0.025, len, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, p); o.rotation.x = Math.atan2(y0 - y1, z1 - z0); return o; };
  const valancePlane = (x0, x1, z, yTop, h, map, p) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, h), T(map, 0.9)); o.material.side = THREE.DoubleSide; o.position.set((x0 + x1) / 2, yTop - h / 2, z); (p || g).add(o); return o; };
  const plane = (w, h, map, x, y, z, ry, e, p) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), T(map, 0.8, e)); o.position.set(x, y, z); o.rotation.y = ry || 0; (p || g).add(o); return o; };
  const bulbs = (pts, p) => { const bm = M('#ffd58f', 1, 0, '#ffb040', 1.6); pts.forEach((q) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bm); o.position.set(q[0], q[1], q[2]); (p || g).add(o); }); };
  const seg = (a, b, r, m, p) => { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), m); o.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); o.castShadow = true; (p || g).add(o); return o; };

  // ---------- chassit: tandemaxel bakom en mörk kjol, stödben i hörnen, dragstång med kopplingshuvud och stödhjul ----------
  const wh = S.wheels;
  [-1, 1].forEach((s) => wh.x.forEach((x) => { cyl(wh.r, 0.19, dark, x, wh.r, s * wh.z, 'z'); cyl(wh.r * 0.55, 0.2, M('#77736c', 0.4, 0.5), x, wh.r, s * wh.z, 'z'); }));
  [-1, 1].forEach((s) => { const z = s * (Wz / 2 - 0.01); [[B.x0, -0.78], [0.78, B.x1]].forEach(([a, b]) => box(b - a, bot - 0.08, 0.04, darkWood, (a + b) / 2, (0.08 + bot) / 2, z)); box(1.56, 0.06, 0.06, blue, 0, bot - 0.02, z + s * 0.02); });
  [B.x0 + 0.01, B.x1 - 0.01].forEach((x) => box(0.04, bot - 0.08, Wz, darkWood, x, (0.08 + bot) / 2, 0));
  S.legs.forEach(([x, z]) => { cyl(0.028, bot, steel, x, bot / 2, z); box(0.16, 0.02, 0.16, steel, x, 0.01, z); });
  [-0.62, 0.62].forEach((z) => seg([B.x0, 0.42, z], [TRUCK_FRAME.hitch[0] + 0.12, 0.42, 0], 0.035, dark));
  box(0.24, 0.1, 0.12, dark, TRUCK_FRAME.hitch[0] + 0.05, 0.44, 0); cyl(0.04, 0.36, dark, -3.05, 0.24, 0.12); cyl(0.08, 0.05, dark, -3.05, 0.08, 0.12, 'z');
  const gb = S.gasBox; box(gb.x1 - gb.x0, 0.62, gb.z1 - gb.z0, wood, (gb.x0 + gb.x1) / 2, 0.47 + 0.31, (gb.z0 + gb.z1) / 2); box(gb.x1 - gb.x0 + 0.04, 0.04, gb.z1 - gb.z0 + 0.04, blue, (gb.x0 + gb.x1) / 2, 1.11, (gb.z0 + gb.z1) / 2);

  // ---------- väggarna, golvet och gavlarna ----------
  box(Lx - 0.12, 0.04, Wz - 0.12, M('#d2b88f', 0.8), 0, F - 0.02, 0);
  box(Lx, H.y0 - bot, wall, wood, 0, (bot + H.y0) / 2, B.z1 - wall / 2);
  box(Lx, eave - bot, wall, wood, 0, (bot + eave) / 2, B.z0 + wall / 2);
  [B.x0 + wall / 2, B.x1 - wall / 2].forEach((x) => box(wall, eave - bot, Wz, wood, x, (bot + eave) / 2, 0));
  box(H.x0 - B.x0, eave - H.y0, wall, wood, (B.x0 + H.x0) / 2, (H.y0 + eave) / 2, B.z1 - wall / 2);
  box(B.x1 - H.x1, eave - H.y0, wall, wood, (H.x1 + B.x1) / 2, (H.y0 + eave) / 2, B.z1 - wall / 2);
  box(H.x1 - H.x0, eave - H.y1, wall, wood, 0, (H.y1 + eave) / 2, B.z1 - wall / 2);
  [B.x0 + wall / 2, B.x1 - wall / 2].forEach((x) => { const sh = new THREE.Shape(); sh.moveTo(-Wz / 2, 0); sh.lineTo(Wz / 2, 0); sh.lineTo(0, ridge - eave); sh.closePath(); const o = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: wall, bevelEnabled: false }), wood); o.rotation.y = Math.PI / 2; o.position.set(x - wall / 2, eave, 0); o.castShadow = true; g.add(o); });
  [[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]].forEach(([x, z]) => box(0.12, eave - bot, 0.12, blue, x, (bot + eave) / 2, z));
  [B.z0, B.z1].forEach((z) => box(Lx + 0.12, 0.07, 0.07, blue, 0, bot + 0.035, z + Math.sign(z) * 0.01));
  box(H.x1 - H.x0 + 0.16, 0.08, 0.05, blue, 0, H.y0 - 0.02, B.z1 + 0.02); [H.x0 - 0.04, H.x1 + 0.04].forEach((x) => box(0.08, H.y1 - H.y0, 0.05, blue, x, (H.y0 + H.y1) / 2, B.z1 + 0.02));

  // ---------- sadeltaket med falsar och nockplåt (tonar), vindskivor, takrännor och stuprör (står kvar) ----------
  const o = S.overhangM, half = Math.hypot(Wz / 2 + o, ridge - eave + 0.05), pitch = Math.atan2(ridge - eave + 0.05, Wz / 2 + o);
  const tin = W(fade(new THREE.MeshStandardMaterial({ map: seams, roughness: 0.55, metalness: 0.35 })), 0.18);
  [-1, 1].forEach((s) => { const r = box(Lx + 0.34, 0.05, half, tin, 0, (eave + ridge) / 2 - 0.02, s * (Wz / 4 + o / 2)); r.rotation.x = s * pitch; roof.push(r); });
  roof.push(box(Lx + 0.36, 0.06, 0.16, fade(M('#2e2c2a', 0.5, 0.4)), 0, ridge + 0.03, 0));
  [-1, 1].forEach((s) => box(Lx + 0.34, 0.14, 0.04, blue, 0, eave - 0.05, s * (Wz / 2 + o)));
  [B.x0 - 0.17, B.x1 + 0.17].forEach((x) => [-1, 1].forEach((s) => { const v = box(0.04, 0.14, half, blue, x, (eave + ridge) / 2 - 0.02, s * (Wz / 4 + o / 2)); v.rotation.x = s * pitch; }));
  const gut = M('#5d5a55', 0.35, 0.6), gz = Wz / 2 + o + 0.05;
  [-1, 1].forEach((s) => cyl(0.05, Lx + 0.3, gut, 0, eave - 0.12, s * gz, 'x', null, 10));
  [[B.x0 - 0.1, gz], [B.x1 + 0.1, gz], [B.x0 - 0.1, -gz]].forEach(([x, z]) => { cyl(0.035, eave - 0.2, gut, x, (eave - 0.12) / 2 + 0.02, z, null, null, 10); box(0.16, 0.05, 0.1, gut, x + Math.sign(x) * 0.05, 0.08, z); });
  // glödlampor under takfoten
  bulbs(Array.from({ length: 9 }, (_, i) => [B.x0 + 0.15 + i * (Lx - 0.3) / 8, eave - 0.24 - 0.05 * Math.sin(i * Math.PI / 2) ** 2, Wz / 2 + o - 0.05]));

  // ---------- skylten på östra gaveln, fönstret och dörren med trappsteg och lykta ----------
  const sg = S.sign; plane(sg.w, sg.h, signTex(CREAM, LIV), sg.x + 0.03, sg.y, sg.z, Math.PI / 2, 0.45); box(0.04, sg.h + 0.08, sg.w + 0.08, blue, sg.x, sg.y, sg.z);
  const wn = S.window; box(0.05, wn.y1 - wn.y0 + 0.1, wn.w + 0.1, blue, wn.x + 0.02, (wn.y0 + wn.y1) / 2, wn.z); box(0.02, wn.y1 - wn.y0, wn.w, M('#ffe2ad', 0.4, 0, '#ffbe6a', 0.7), wn.x + 0.045, (wn.y0 + wn.y1) / 2, wn.z); box(0.03, wn.y1 - wn.y0, 0.03, blue, wn.x + 0.055, (wn.y0 + wn.y1) / 2, wn.z); box(0.03, 0.03, wn.w, blue, wn.x + 0.055, (wn.y0 + wn.y1) / 2, wn.z);
  box(0.04, 1.96, 0.86, blue, B.x1 + 0.02, F + 0.98, 0.4); box(0.035, 1.9, 0.78, W(M('#294260', 0.6)), B.x1 + 0.04, F + 0.95, 0.4); box(0.02, 0.42, 0.42, M('#ffe2ad', 0.3, 0, '#ffbe6a', 0.6), B.x1 + 0.06, F + 1.5, 0.4); cyl(0.02, 0.14, steel, B.x1 + 0.09, F + 1.0, 0.72, 'z');
  box(0.62, 0.05, 0.7, darkWood, B.x1 + 0.31, 0.2, 0.4); box(0.05, 0.2, 0.7, darkWood, B.x1 + 0.6, 0.1, 0.4); box(0.3, 0.05, 0.7, darkWood, B.x1 + 0.77, 0.1, 0.4);
  box(0.14, 0.2, 0.14, M('#ffd58f', 1, 0, '#ffb040', 1.6), B.x1 + 0.1, F + 2.06, 0.98); light('#ffc070', 1.1, 3.4, B.x1 + 0.45, F + 2.0, 0.9);

  // ---------- disken, showgrillen i luckan, huven och skorstenen med rök ----------
  box(H.x1 - H.x0, 0.05, 0.5, M('#6e5137', 0.6), 0, H.y0, B.z1 - 0.26); box(H.x1 - H.x0, H.y0 - F, 0.45, wood, 0, (F + H.y0) / 2, B.z1 - 0.27);
  const gr = S.grill, gx = (gr.x0 + gr.x1) / 2, gzc = (gr.z0 + gr.z1) / 2;
  box(gr.x1 - gr.x0, 0.2, gr.z1 - gr.z0, M('#1f1c1a', 0.6, 0.4), gx, H.y0 + 0.1, gzc);
  box(gr.x1 - gr.x0 - 0.08, 0.02, gr.z1 - gr.z0 - 0.08, M('#3a1606', 0.9, 0, '#ff6a1a', 1.4), gx, H.y0 + 0.17, gzc);
  for (let i = 0; i < 7; i++) box(0.012, 0.012, gr.z1 - gr.z0 - 0.06, steel, gr.x0 + 0.06 + i * 0.13, H.y0 + 0.215, gzc);
  sausages(gr.x0 + 0.08, gr.x1 - 0.08, gzc, H.y0 + 0.24, 5);
  light('#ff7a2a', 1.8, 2.6, gx, H.y0 + 0.5, gzc + 0.2);
  box(0.95, 0.3, 0.55, steel, gx, F + 1.75, gzc - 0.05); box(0.57, 0.2, 0.33, steel, gx, F + 2.0, gzc - 0.05); cyl(0.09, 3.4 - F - 2.0, steel, gx, (F + 2.0 + 3.4) / 2, gzc - 0.05); box(0.26, 0.04, 0.26, steel, gx, 3.46, gzc - 0.05);
  const puff = tex(64, 64, (x, w) => { const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  const smokeM = new THREE.SpriteMaterial({ map: puff, color: '#d9d2c4', transparent: true, opacity: 0.35, depthWrite: false });
  for (let i = 0; i < 5; i++) { const sp = new THREE.Sprite(smokeM.clone()); g.add(sp); anim.push({ kind: 'smoke', s: sp, i, x: gx, y: 3.5, z: gzc - 0.05 }); }
  // inne: hylla med bröd och en bänk mot bakväggen
  box(1.6, 0.04, 0.32, M('#6e5137', 0.6), -1.2, F + 1.45, B.z0 + 0.22); for (let i = 0; i < 6; i++) box(0.16, 0.07, 0.09, M('#c8a46a', 0.8), -1.85 + i * 0.26, F + 1.51, B.z0 + 0.22);
  box(2.6, 0.9, 0.5, M('#b9b3a6', 0.5, 0.3), -0.6, F + 0.45, B.z0 + 0.31); box(2.6, 0.04, 0.54, steel, -0.6, F + 0.92, B.z0 + 0.31);

  // ---------- luckan: träskivan fälld upp på stöttor, festonger längst ut ----------
  const fe = flapEdge(), flapL = S.flap.lengthM;
  const flap = box(H.x1 - H.x0 + 0.2, 0.05, flapL, wood, 0, (fe.hingeY + fe.y) / 2, (B.z1 + fe.z) / 2); flap.rotation.x = -Math.atan2(fe.y - fe.hingeY, fe.z - B.z1);
  valancePlane(H.x0 - 0.1, H.x1 + 0.1, fe.z + 0.01, fe.y + 0.01, 0.2, valance(LIV, CREAM, 12));
  [H.x0 + 0.1, H.x1 - 0.1].forEach((x) => seg([x, H.y0, B.z1 + 0.05], [x, fe.y - 0.02, fe.z - 0.04], 0.018, blue));
  // hyllan ute under luckan: betalhyllan med kortläsaren, såserna och servetterna
  const sh = S.shelf; box(sh.x1 - sh.x0, 0.04, sh.z1 - sh.z0, darkWood, (sh.x0 + sh.x1) / 2, sh.y, (sh.z0 + sh.z1) / 2); [sh.x0 + 0.15, sh.x1 - 0.15].forEach((x) => seg([x, sh.y - 0.02, sh.z1 - 0.04], [x, sh.y - 0.3, B.z1 + 0.02], 0.016, blue));
  const tm = new THREE.Group(); tm.position.set(S.terminal[0], sh.y + 0.03, S.terminal[1]); tm.rotation.x = -0.5; g.add(tm); box(0.09, 0.03, 0.16, M('#24221f', 0.4, 0.3), 0, 0.015, 0, tm); box(0.07, 0.005, 0.07, M('#9fc6d8', 0.2, 0, '#7fb6cf', 0.6), 0, 0.032, -0.03, tm);
  [['#8e2c1c', 0], ['#d6a92a', 0.12], ['#efe6d2', 0.24]].forEach(([c, dx]) => { cyl(0.032, 0.19, M(c, 0.4), S.sauces[0] + dx, sh.y + 0.115, S.sauces[1]); cyl(0.012, 0.04, M(c, 0.4), S.sauces[0] + dx, sh.y + 0.23, S.sauces[1]); });
  box(0.12, 0.13, 0.08, steel, S.napkins[0], sh.y + 0.085, S.napkins[1]); box(0.1, 0.1, 0.05, M('#f4efe4', 0.9), S.napkins[0], sh.y + 0.09, S.napkins[1]);
  // sopkorgen klädd i trä, med lock
  cyl(0.22, 0.86, wood, S.bin[0], 0.43, S.bin[1], null, null, 12); cyl(0.235, 0.05, blue, S.bin[0], 0.88, S.bin[1], null, null, 12); cyl(0.09, 0.02, dark, S.bin[0], 0.91, S.bin[1], null, null, 10);
  [H.x0 - 0.25, H.x1 + 0.25].forEach((x) => { box(0.14, 0.2, 0.14, M('#ffd58f', 1, 0, '#ffb040', 1.6), x, 2.05, B.z1 + 0.1); light('#ffc070', 1.2, 3.5, x, 2.0, B.z1 + 0.35); });
  light('#ffb468', 1.4, 3.6, 0, 2.2, -0.2);

  // ---------- kylen i eget skåp mot västra gaveln, med pulpettak (tonar) ----------
  const f = S.fridge, cb = f.cabinet, fw = f.x1 - f.x0, fd = f.z1 - f.z0, fh = 1.72, fcx = (f.x0 + f.x1) / 2, fcz = (f.z0 + f.z1) / 2;
  box(fw, fh, fd, M('#e3e0d8', 0.5, 0.1), fcx, fh / 2 + 0.04, fcz);
  box(fw - 0.1, fh - 0.2, 0.01, M('#eef6f8', 0.2, 0, '#dff1f6', 0.9), fcx, fh / 2 + 0.09, f.z1 + 0.006);
  const fc = ['#2f5d8a', '#c9a227', '#e9e2cf', '#3f6f4f', '#b98a3c'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cyl(0.03, 0.2, M(fc[(r + c) % 5], 0.4), f.x0 + 0.08 + c * (fw - 0.16) / 3, 0.38 + r * 0.34, f.z1 + 0.026, null, null, 8);
  box(fw, fh, 0.02, glass, fcx, fh / 2 + 0.04, f.z1 + 0.045); light('#e8f4ff', 0.6, 1.6, fcx, 1.1, f.z1 + 0.3);
  box(0.05, cb.roofY - 0.04, cb.z1 - cb.z0, wood, cb.x0 + 0.025, cb.roofY / 2, (cb.z0 + cb.z1) / 2); box(cb.x1 - cb.x0, 0.06, cb.z1 - cb.z0, wood, (cb.x0 + cb.x1) / 2, 0.03, (cb.z0 + cb.z1) / 2);
  box(cb.x1 - cb.x0, 0.12, 0.05, blue, (cb.x0 + cb.x1) / 2, cb.roofY - 0.1, cb.z1);
  const lr = box(cb.x1 - cb.x0 + 0.12, 0.04, cb.z1 - cb.z0 + 0.14, W(fade(new THREE.MeshStandardMaterial({ map: seams, roughness: 0.55, metalness: 0.35 })), 0.18), (cb.x0 + cb.x1) / 2 - 0.06, cb.roofY + 0.02, (cb.z0 + cb.z1) / 2); lr.rotation.z = 0.12; roof.push(lr);

  // ---------- menyn på ett ställ, vänd mot kön, med ett eget litet tak ----------
  const ms = S.menuStand, st = new THREE.Group(); st.position.set(ms.p[0], 0, ms.p[1]); st.rotation.y = ms.yaw; g.add(st);
  box(1.0, 0.85, 0.05, darkWood, 0, 1.55, 0, st); const mp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.76), T(chalkMenu(4), 0.8, 0.12)); mp.position.set(0, 1.55, 0.03); st.add(mp);
  [-0.42, 0.42].forEach((x) => box(0.05, 1.15, 0.05, darkWood, x, 0.57, 0, st));
  [-1, 1].forEach((s) => { const r = box(1.12, 0.03, 0.22, blue, 0, 2.03, s * 0.08, st); r.rotation.x = -s * 0.5; });

  // ---------- strömmen: kabel från bakväggen till elstolpen ----------
  const sk = S.socket, cm = M('#151413', 0.7);
  box(0.24, 0.92, 0.2, M('#4a5a52', 0.6, 0.2), sk[0], 0.46, sk[1]); box(0.08, 0.08, 0.04, M('#c9a227', 0.5), sk[0], 0.7, sk[1] + 0.11);
  seg([sk[0], 0.7, sk[1] + 0.12], [sk[0] + 0.1, 0.03, sk[1] + 0.4], 0.014, cm); seg([sk[0] + 0.1, 0.03, sk[1] + 0.4], [sk[0] + 0.05, 0.03, B.z0 - 0.15], 0.014, cm); seg([sk[0] + 0.05, 0.03, B.z0 - 0.15], [sk[0] + 0.05, 0.6, B.z0 - 0.02], 0.014, cm);

  // ---------- tillvalet: markisen över kön, på stolpar ----------
  const a = S.awning, fabric = W(fade(T(stripes(LIV, CREAM, 16), 0.9)), 0.3);
  canopy.push(awningSlope(a.x0, a.x1, a.z0 + 0.0, a.yIn, a.z1, a.yOut, fabric, awningGroup));
  // Festongerna längs ytterkanten står kvar på krogens nivå, så att det syns från 24 m att markisen är köpt.
  const qv = valancePlane(a.x0, a.x1, a.z1 + 0.01, a.yOut + 0.01, 0.2, valance(LIV, CREAM, 16), awningGroup); W(qv.material, 0.3);
  a.posts.forEach(([x, z]) => { cyl(0.035, a.yOut, M(INK, 0.6, 0.3), x, a.yOut / 2, z, null, awningGroup); box(0.14, 0.03, 0.14, M(INK, 0.6, 0.3), x, 0.015, z, awningGroup); });
  canopy.push(seg([a.x0, a.yIn, a.z0 + 0.02], [B.x0 - 0.06, a.yIn + 0.02, a.z0 + 0.02], 0.025, fade(M(INK, 0.6, 0.3)), awningGroup));
  bulbs([-4.3, -3.6, -2.9, -2.2, -1.6].map((x) => [x, a.yOut - 0.04, a.z1]), awningGroup);
  light('#ffcf8a', 1.6, 5, -3.0, 2.0, 2.1, awningGroup);

  canopy.forEach((m) => { m.material.transparent = true; m.material.alphaTest = 0; });
  const api = {
    group: g, spec: S, roof, canopy, lights, anim, wet, awningGroup, awningOn: true,
    setAwning(on) { api.awningOn = !!on; awningGroup.visible = !!on; },
    /** Våt: trä, plåt och duk mörknar och glänser. k 0–1. */
    setWet(k) { wet.forEach((w) => { w.m.color.copy(w.c).multiplyScalar(1 - w.dk * k); w.m.roughness = w.r - (w.r - 0.28) * 0.75 * k; }); }
  };
  api.setAwning(opts.awning ?? true);
  return api;
}

/** Taket, kylskåpets tak och markisens duk på kamerans avstånd: helt synligt från 40 m, borta vid 26 m. */
export function updateGrillstugan(T, distM, t) {
  const k = roofOpacity(distM);
  T.roof.forEach((o) => { o.material.opacity = k; o.visible = k > 0.02; o.castShadow = k > 0.5; });
  T.canopy.forEach((o) => { o.material.opacity = k; o.visible = k > 0.02; o.castShadow = k > 0.5; o.material.depthWrite = k > 0.5; });
  T.anim.forEach((a) => { if (a.kind === 'smoke') { const u = ((t * 0.35 + a.i / 5) % 1); a.s.position.set(a.x + 0.25 * u + 0.05 * Math.sin(t + a.i), a.y + 1.4 * u, a.z - 0.1 * u); a.s.scale.setScalar(0.25 + 0.7 * u); a.s.material.opacity = 0.32 * (1 - u) * Math.min(1, u * 6); } });
}
