// grillvagnar.js — D12 (2026-10-11): tre förslag på en riktig grillvagn, för Anders att välja. Byggs i three.js, i vagnens ram
// från D7 och D10 (dinVagKarta.L): +x längs vagnen mot serveringen, +z ut från luckan mot kön, vagnens mitt i origo,
// lådan 4,6 × 2,3 m (x −2,3…2,3, z −1,15…1,15), dragkroken i x −3,4. Kön och ståborden står kvar där D10 har dem.
// Alla tre har lucka, markis, meny på tavlan, grill och en kyl som syns, och plats för två i vagnen (grillen och luckan)
// och en medhjälpare ute längs kön (grundregeln: allt spelaren väljer syns i spelet).
// Taket tonar ut på krogens nivå med samma regel som husen (BLEND.roof, 40 → 26 m), men taklisten och skylten står kvar,
// så att man ser in i vagnen från 24 m. Ingen text på skyltar och tavlor: bara bilder och kritstreck.

export const TRUCK_FRAME = { body: { x0: -2.3, x1: 2.3, z0: -1.15, z1: 1.15 }, hitch: [-3.4, 0], queueLine: [[-1.4, 2.3], [-2.3, 2.3], [-3.2, 2.3], [-4.1, 2.3], [-5.0, 2.3], [-5.9, 2.3]], order: [-0.5, 2.15], collect: [0.9, 2.15], tables: { A: [3.9, 1.2], B: [5.4, 1.2], C: [4.65, 2.9] } };
export const ROOF_BLEND = { fullFromM: 40, goneAtM: 26 };
/** Markiserna tonas ned till CANOPY_MIN på krogens nivå, med samma avstånd som taket. Kamerans lutning gör att en markis
 *  över luckan annars döljer den som står i luckan, och B:s markis döljer kön. Stolparna och festongernas kant står kvar. */
export const CANOPY_MIN = 0.3;
export const LIV = '#2f4b6e', CREAM = '#efe1bf', STEEL = '#b8b2a8', INK = '#2a2421';

/** Förslagen som data. stations: där de två i vagnen står (yaw 0 = mot luckan, π = mot bakväggen). helper: medhjälparens väg
 *  ute längs kön, från dörren. floorY: golvet i vagnen över marken. */
export const TRUCKS = {
  A: { id: 'A', name: 'kiosk', floorY: 0.32, counterY: 1.18, hatch: { x0: -1.2, x1: 1.2, y0: 1.18, y1: 2.42 },
    stations: { grill: { pos: [1.4, -0.1], yaw: Math.PI }, hatch: { pos: [0, 0.55], yaw: 0 } },
    door: [2.75, 0.55], helper: [[2.75, 1.7], [1.4, 3.05], [-1.6, 3.05], [-5.4, 3.05]],
    fridge: { x0: -1.2, x1: -0.55, z0: -1.1, z1: -0.58, faces: '+z' }, grill: { x0: 0.85, x1: 1.95, z0: -0.95, z1: -0.35, kind: 'flatTop+roller' } },
  B: { id: 'B', name: 'cabin', floorY: 0.38, counterY: 1.2, hatch: { x0: -1.3, x1: 1.3, y0: 1.2, y1: 2.4 },
    stations: { grill: { pos: [0.8, 0.12], yaw: 0 }, hatch: { pos: [-0.6, 0.55], yaw: 0 } },
    door: [2.75, 0.55], helper: [[2.75, 1.7], [1.4, 3.05], [-1.6, 3.05], [-5.4, 3.05]],
    fridge: { x0: -2.95, x1: -2.38, z0: 1.28, z1: 1.8, faces: '+z', outside: true }, grill: { x0: 0.35, x1: 1.25, z0: 0.58, z1: 1.08, kind: 'charcoal at hatch' } },
  C: { id: 'C', name: 'van', floorY: 0.62, counterY: 1.25, hatch: { x0: -1.3, x1: 1.3, y0: 1.25, y1: 2.45 },
    stations: { grill: { pos: [0.9, 0.18], yaw: 0 }, hatch: { pos: [-0.6, 0.55], yaw: 0 } },
    door: [2.95, 0.0], helper: [[2.95, 1.5], [1.4, 3.05], [-1.6, 3.05], [-5.4, 3.05]],
    fridge: { x0: 1.72, x1: 2.24, z0: -0.75, z1: 0.25, faces: '+x', rearDoors: true }, grill: { x0: 0.45, x1: 1.35, z0: 0.55, z1: 0.95, kind: 'griddle at hatch' } }
};

export function buildGrillTruck(THREE, id) {
  const S = TRUCKS[id], g = new THREE.Group(); g.name = 'grillTruck' + id;
  const roof = [], canopy = [], lights = [], anim = [];
  const M = (c, r = 0.8, m = 0, e, ei) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); if (e) { x.emissive = new THREE.Color(e); x.emissiveIntensity = ei ?? 1.2; } return x; };
  const T = (map, r = 0.85, e) => { const x = new THREE.MeshStandardMaterial({ map, roughness: r, transparent: !!map.userData.alpha, alphaTest: map.userData.alpha ? 0.4 : 0 }); if (e) { x.emissive = new THREE.Color('#ffffff'); x.emissiveMap = map; x.emissiveIntensity = e; } return x; };
  const box = (w, h, d, m, x, y, z, p) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (p || g).add(o); return o; };
  const cyl = (r, h, m, x, y, z, ax, p, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 18), m); o.position.set(x, y, z); if (ax === 'x') o.rotation.z = Math.PI / 2; if (ax === 'z') o.rotation.x = Math.PI / 2; o.castShadow = true; (p || g).add(o); return o; };
  const light = (c, i, d, x, y, z) => { const L = new THREE.PointLight(c, i, d, 1.6); L.position.set(x, y, z); g.add(L); lights.push(L); return L; };
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
      const y = 84 + i * (150 / rows);
      [0, 1, 2].forEach(() => {}); x.lineWidth = 5; x.strokeStyle = 'rgba(236,230,214,.75)';
      if (i % 3 === 2) cupIcon(x, 48, y, 26, 'rgba(236,230,214,.8)'); else sausageIcon(x, 48, y, 26, 'rgba(236,230,214,.8)', i % 3 ? 'rgba(214,164,92,.8)' : null);
      x.beginPath(); x.moveTo(76, y); x.lineTo(150 + (i % 2) * 24, y); x.stroke();
      x.fillStyle = 'rgba(230,187,52,.9)'; x.beginPath(); x.arc(212, y, 7, 0, Math.PI * 2); x.fill();
    }
  });
  const lightMenu = () => tex(128, 224, (x, w, h) => {
    x.fillStyle = '#f6efdc'; x.fillRect(0, 0, w, h); x.strokeStyle = LIV; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8);
    sausageIcon(x, 64, 26, 70, LIV, '#c8a46a'); x.fillStyle = LIV; x.fillRect(14, 46, 100, 3);
    for (let i = 0; i < 5; i++) { const cy = 72 + i * 32; if (i === 4) cupIcon(x, 30, cy, 26, LIV); else sausageIcon(x, 30, cy, 30, LIV, i % 2 ? '#c8a46a' : null); x.fillStyle = 'rgba(47,75,110,.55)'; x.fillRect(52, cy - 3, 40 + (i % 2) * 14, 6); x.fillStyle = '#b98a3c'; x.fillRect(104, cy - 4, 10, 8); }
  });
  const signTex = (bg, fg) => tex(512, 96, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16); sausageIcon(x, w / 2, h / 2, 120, fg, '#c8a46a'); [-1, 1].forEach((s) => { x.fillStyle = fg; x.beginPath(); x.arc(w / 2 + s * 170, h / 2, 9, 0, Math.PI * 2); x.fill(); }); });
  const boards = (c1, c2) => tex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 3 === 1 ? c2 : c1; x.fillRect(i * 32, 0, 32, h); x.fillStyle = 'rgba(20,10,4,.5)'; x.fillRect(i * 32, 0, 2, h); for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(60,30,12,.18)'; x.fillRect(i * 32 + 6 + (k * 7) % 20, (k * 53 + i * 31) % h, 2, 30); } } }, [3, 1]);

  const B = TRUCK_FRAME.body, Lx = B.x1 - B.x0, Wz = B.z1 - B.z0, H = S.hatch, F = S.floorY;
  const steel = M(STEEL, 0.35, 0.6), dark = M('#1e1c1b', 0.9), glass = new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28 });
  const roofMat = (c) => { const m = M(c, 0.7); m.transparent = true; return m; };
  const sausages = (x0, x1, z, y, n, p) => { for (let i = 0; i < n; i++) cyl(0.022, 0.2, M('#9a5a32', 0.55, 0, '#5a2408', 0.25), x0 + (i + 0.5) * (x1 - x0) / n, y, z, 'z', p, 8); };
  const fridge = (f, faces) => {
    const w = f.x1 - f.x0, d = f.z1 - f.z0, h = 1.72, y0 = f.outside ? 0 : F, cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2;
    box(w, h, d, M('#e3e0d8', 0.5, 0.1), cx, y0 + h / 2, cz);
    const front = faces === '+x' ? [f.x1 + 0.006, cz] : [cx, f.z1 + 0.006];
    const glow = M('#eef6f8', 0.2, 0, '#dff1f6', 0.9), ins = faces === '+x' ? box(0.01, h - 0.2, d - 0.1, glow, front[0], y0 + h / 2 + 0.05, front[1]) : box(w - 0.1, h - 0.2, 0.01, glow, front[0], y0 + h / 2 + 0.05, front[1]);
    const cols = ['#2f5d8a', '#c9a227', '#e9e2cf', '#3f6f4f', '#b98a3c'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const u = (c + 0.5) / 5, yy = y0 + 0.34 + r * 0.34, mm = M(cols[(r + c) % 5], 0.4);
      if (faces === '+x') cyl(0.03, 0.2, mm, front[0] + 0.02, yy, f.z0 + 0.05 + u * (d - 0.1), null, null, 8); else cyl(0.03, 0.2, mm, f.x0 + 0.05 + u * (w - 0.1), yy, front[1] + 0.02, null, null, 8);
      if (c === 0) { if (faces === '+x') box(0.012, 0.012, d - 0.1, steel, front[0] + 0.02, yy - 0.11, cz); else box(w - 0.1, 0.012, 0.012, steel, cx, yy - 0.11, front[1] + 0.02); }
    }
    if (faces === '+x') box(0.02, h, d, glass, front[0] + 0.04, y0 + h / 2, cz); else box(w, h, 0.02, glass, cx, y0 + h / 2, front[1] + 0.04);
    light('#e8f4ff', 0.6, 1.6, front[0] + (faces === '+x' ? 0.3 : 0), y0 + 1.1, front[1] + (faces === '+x' ? 0 : 0.3));
    return ins;
  };
  const hoodAndChimney = (x, z, w, d, topY, chimY) => { box(w, 0.3, d, steel, x, F + 1.75, z); box(w * 0.6, 0.2, d * 0.6, steel, x, F + 2.0, z); const c = cyl(0.09, chimY - F - 2.0, steel, x, (F + 2.0 + chimY) / 2, z); box(0.26, 0.04, 0.26, steel, x, chimY + 0.06, z); return c; };
  const smoke = (x, y, z) => { const m = new THREE.SpriteMaterial({ color: '#d9d2c4', transparent: true, opacity: 0.35, depthWrite: false }); for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(m.clone()); s.position.set(x, y, z); g.add(s); anim.push({ kind: 'smoke', s, i, x, y, z }); } };
  const awningSlope = (x0, x1, z0, y0, z1, y1, mat) => { const len = Math.hypot(z1 - z0, y1 - y0), o = box(x1 - x0, 0.025, len, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.rotation.x = Math.atan2(y0 - y1, z1 - z0); return o; };
  const valancePlane = (x0, x1, z, yTop, h, map) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, h), T(map, 0.9)); o.material.side = THREE.DoubleSide; o.position.set((x0 + x1) / 2, yTop - h / 2, z); g.add(o); return o; };
  const plane = (w, h, map, x, y, z, ry, e) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), T(map, 0.8, e)); o.position.set(x, y, z); o.rotation.y = ry || 0; g.add(o); return o; };
  const bulbs = (pts) => { const bm = M('#ffd58f', 1, 0, '#ffb040', 1.6); pts.forEach((p) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bm); o.position.set(p[0], p[1], p[2]); g.add(o); }); };
  const person = (o) => o; // markör: stationerna läses ur TRUCKS

  if (id === 'A') {
    // ===== A · Kiosksläpet: den klassiska korvkiosken på släp. Låda med rundade hörn, dalablå nedtill och gräddvit upptill
    // med en aluminiumlist i diskens höjd. Skjutfönster i luckan, randig markis med festonger, kritmeny på väggen,
    // stekhäll och korvrulle, glasdörrskyl rakt bakom luckan, takskylt med en korv, dragstång med gasol.
    const blue = M(LIV, 0.6), cream = M(CREAM, 0.75), trim = M('#c9c3b6', 0.3, 0.7), wall = 0.06, top = 2.62, bot = 0.28;
    box(Lx - 0.1, 0.2, Wz - 0.1, dark, 0, 0.18, 0);
    // Golvet i vagnen är ljust, så att de två som arbetar där läses mot det uppifrån.
    box(Lx - 0.12, 0.04, Wz - 0.12, M('#cfc6b4', 0.8), 0, F - 0.02, 0);
    // bakvägg, gavlar
    box(Lx, H.y0 - bot, wall, blue, 0, (bot + H.y0) / 2, B.z0 + wall / 2); box(Lx, top - H.y0, wall, cream, 0, (H.y0 + top) / 2, B.z0 + wall / 2);
    [B.x0 + wall / 2, B.x1 - wall / 2].forEach((x) => { box(wall, H.y0 - bot, Wz, blue, x, (bot + H.y0) / 2, 0); box(wall, top - H.y0, Wz, cream, x, (H.y0 + top) / 2, 0); });
    // framsidan med luckan
    box(Lx, H.y0 - bot, wall, blue, 0, (bot + H.y0) / 2, B.z1 - wall / 2);
    box(H.x0 - B.x0, top - H.y0, wall, cream, (B.x0 + H.x0) / 2, (H.y0 + top) / 2, B.z1 - wall / 2);
    box(B.x1 - H.x1, top - H.y0, wall, cream, (H.x1 + B.x1) / 2, (H.y0 + top) / 2, B.z1 - wall / 2);
    box(H.x1 - H.x0, top - H.y1, wall, cream, 0, (H.y1 + top) / 2, B.z1 - wall / 2);
    [[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]].forEach(([x, z]) => { cyl(0.08, H.y0 - bot, blue, x, (bot + H.y0) / 2, z); cyl(0.08, top - H.y0, cream, x, (H.y0 + top) / 2, z); });
    box(Lx + 0.18, 0.035, 0.03, trim, 0, H.y0, B.z1 + 0.01); box(Lx + 0.18, 0.035, 0.03, trim, 0, H.y0, B.z0 - 0.01);
    [B.x0 - 0.01, B.x1 + 0.01].forEach((x) => box(0.03, 0.035, Wz + 0.18, trim, x, H.y0, 0));
    // taket (tonar) och taklisten (står kvar)
    roof.push(box(Lx + 0.12, 0.08, Wz + 0.12, roofMat(CREAM), 0, top + 0.04, 0));
    [[0, B.z0 - 0.03, Lx + 0.2, 0.1], [0, B.z1 + 0.03, Lx + 0.2, 0.1]].forEach(([x, z, w, d]) => box(w, 0.1, d, cream, x, top + 0.02, z));
    [B.x0 - 0.03, B.x1 + 0.03].forEach((x) => box(0.1, 0.1, Wz + 0.2, cream, x, top + 0.02, 0));
    // takskylten
    const sg = signTex(CREAM, LIV); [1, -1].forEach((s) => plane(2.5, 0.42, sg, 0, top + 0.32, B.z0 + 0.12 + s * 0.035, s > 0 ? 0 : Math.PI, 0.5)); box(2.6, 0.5, 0.06, M('#d8cdb2', 0.7), 0, top + 0.32, B.z0 + 0.12);
    // disk, skjutfönster, hylla ute
    box(H.x1 - H.x0 + 0.3, 0.04, 0.42, steel, 0, H.y0 + 0.02, B.z1 - 0.24); box(H.x1 - H.x0 + 0.3, H.y0 - F, 0.38, M('#cbc7be', 0.6, 0.2), 0, (F + H.y0) / 2, B.z1 - 0.25);
    box(0.62, H.y1 - H.y0, 0.02, glass, H.x0 + 0.31, (H.y0 + H.y1) / 2, B.z1 + 0.02); box(0.62, H.y1 - H.y0, 0.02, glass, H.x1 - 0.31, (H.y0 + H.y1) / 2, B.z1 + 0.04);
    box(H.x1 - H.x0, 0.035, 0.3, M('#7d5a3a', 0.6), 0, H.y0 - 0.06, B.z1 + 0.15);
    [-0.9, 0.9].forEach((x) => box(0.03, 0.18, 0.03, trim, x, H.y0 - 0.15, B.z1 + 0.06));
    // markisen och festongerna
    canopy.push(awningSlope(-1.5, 1.5, B.z1 + 0.02, 2.6, 1.8, 2.36, T(stripes(LIV, CREAM, 14), 0.9)), valancePlane(-1.5, 1.5, 1.81, 2.37, 0.18, valance(LIV, CREAM, 14)));
    [-1.45, 1.45].forEach((x) => { const a = box(0.025, 0.025, 0.68, trim, x, 2.47, 1.48); a.rotation.x = 0.3; });
    bulbs([-1.2, -0.6, 0, 0.6, 1.2].map((x) => [x, 2.18, 1.79]));
    // kritmenyn på väggen
    plane(0.8, 0.85, chalkMenu(4), -1.75, 1.72, B.z1 + 0.012, 0, 0.12);
    // stekhällen bak och korvrullen vid luckan
    const gr = S.grill; box(gr.x1 - gr.x0, 0.06, gr.z1 - gr.z0, M('#262220', 0.5, 0.4, '#5a1e08', 0.35), (gr.x0 + gr.x1) / 2, F + 0.9, (gr.z0 + gr.z1) / 2);
    box(gr.x1 - gr.x0, 0.87, gr.z1 - gr.z0, steel, (gr.x0 + gr.x1) / 2, F + 0.435, (gr.z0 + gr.z1) / 2);
    sausages(gr.x0 + 0.1, gr.x1 - 0.1, (gr.z0 + gr.z1) / 2, F + 0.95, 6);
    light('#ff8a3a', 1.2, 2.2, 1.4, F + 1.2, -0.6);
    hoodAndChimney(1.4, -0.65, 1.1, 0.6, top, 3.05);
    box(0.62, 0.14, 0.28, steel, 0.75, H.y0 + 0.11, B.z1 - 0.2); for (let i = 0; i < 6; i++) cyl(0.024, 0.24, M('#a8653a', 0.5, 0.1, '#5a2408', 0.3), 0.5 + i * 0.1, H.y0 + 0.2, B.z1 - 0.2, 'z', null, 8);
    // kylen
    fridge(S.fridge, '+z');
    // chassit: hjul med skärm, dragstång, stödhjul och gasol
    [-1, 1].forEach((s) => { cyl(0.31, 0.2, dark, 0.25, 0.31, s * (Wz / 2 + 0.06), 'z'); box(0.86, 0.04, 0.28, cream, 0.25, 0.68, s * (Wz / 2 + 0.07)); [-0.43, 0.43].forEach((dx) => box(0.04, 0.24, 0.28, cream, 0.25 + dx, 0.57, s * (Wz / 2 + 0.07))); });
    [-0.6, 0.6].forEach((z) => { const d = box(Math.hypot(1.1, z), 0.07, 0.07, dark, (B.x0 + TRUCK_FRAME.hitch[0]) / 2, 0.42, z / 2); d.rotation.y = Math.atan2(z, 1.1); });
    cyl(0.05, 0.4, dark, -3.0, 0.22, 0); cyl(0.1, 0.06, dark, -3.0, 0.1, 0, 'z');
    box(0.5, 0.55, 0.42, cream, -2.72, 0.72, 0); [-0.1, 0.1].forEach((z) => cyl(0.1, 0.42, M('#7d8a92', 0.4, 0.4), -2.72, 0.66, z));
    // dörren bak och steget
    box(0.03, 1.9, 0.78, M('#294260', 0.6), B.x1 + 0.016, F + 0.95, 0.4); box(0.36, 0.06, 0.6, steel, B.x1 + 0.2, 0.22, 0.4);
    light('#ffc070', 2.2, 6, 0, 2.15, 1.55); light('#ffb468', 1.4, 3.6, 0, 2.2, -0.2); light('#ffd090', 0.6, 2.2, -1.75, 2.3, 1.5);
  }

  if (id === 'B') {
    // ===== B · Grillstugan: en vagn klädd i oljad furu med dalablå knutar, sadeltak av plåt och skorsten. Luckan är en
    // stor träskiva som fälls upp och vilar på två stöttor, med festonger längst ut. Grillen står i luckan, så att kön ser
    // glöden och röken. En egen randig markis över kön, med kritmenyn på ett ställ och en glaskyl ute som medhjälparen tar ur.
    const wood = T(boards('#a77b4c', '#9a6f43'), 0.85), blue = M(LIV, 0.6), tin = '#3d3b38', wall = 0.06, eave = 2.55, ridge = 3.05, bot = 0.12;
    box(Lx, H.y0 - bot, wall, wood, 0, (bot + H.y0) / 2, B.z1 - wall / 2);
    box(Lx - 0.12, 0.04, Wz - 0.12, M('#d2b88f', 0.8), 0, F - 0.02, 0);
    box(Lx, eave - bot, wall, wood, 0, (bot + eave) / 2, B.z0 + wall / 2);
    [B.x0 + wall / 2, B.x1 - wall / 2].forEach((x) => box(wall, eave - bot, Wz, wood, x, (bot + eave) / 2, 0));
    box(H.x0 - B.x0, eave - H.y0, wall, wood, (B.x0 + H.x0) / 2, (H.y0 + eave) / 2, B.z1 - wall / 2);
    box(B.x1 - H.x1, eave - H.y0, wall, wood, (H.x1 + B.x1) / 2, (H.y0 + eave) / 2, B.z1 - wall / 2);
    box(H.x1 - H.x0, eave - H.y1, wall, wood, 0, (H.y1 + eave) / 2, B.z1 - wall / 2);
    // gavelspetsarna
    [B.x0 + wall / 2, B.x1 - wall / 2].forEach((x) => { const sh = new THREE.Shape(); sh.moveTo(-Wz / 2, 0); sh.lineTo(Wz / 2, 0); sh.lineTo(0, ridge - eave); sh.closePath(); const o = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: wall, bevelEnabled: false }), wood); o.rotation.y = Math.PI / 2; o.position.set(x - wall / 2, eave, 0); o.castShadow = true; g.add(o); });
    // knutar och luckans ram i dalablått
    [[B.x0, B.z0], [B.x1, B.z0], [B.x0, B.z1], [B.x1, B.z1]].forEach(([x, z]) => box(0.12, eave - bot, 0.12, blue, x, (bot + eave) / 2, z));
    box(H.x1 - H.x0 + 0.16, 0.08, 0.05, blue, 0, H.y0 - 0.02, B.z1 + 0.02); [H.x0 - 0.04, H.x1 + 0.04].forEach((x) => box(0.08, H.y1 - H.y0, 0.05, blue, x, (H.y0 + H.y1) / 2, B.z1 + 0.02));
    // sadeltaket (tonar) och vindskivorna (står kvar)
    const half = Math.hypot(Wz / 2 + 0.22, ridge - eave + 0.05), pitch = Math.atan2(ridge - eave + 0.05, Wz / 2 + 0.22);
    [-1, 1].forEach((s) => { const o = box(Lx + 0.34, 0.05, half, roofMat(tin), 0, (eave + ridge) / 2 - 0.02, s * (Wz / 4 + 0.11)); o.rotation.x = s * pitch; roof.push(o); });
    [-1, 1].forEach((s) => { box(Lx + 0.34, 0.14, 0.04, blue, 0, eave - 0.05, s * (Wz / 2 + 0.22)); });
    [B.x0 - 0.17, B.x1 + 0.17].forEach((x) => [-1, 1].forEach((s) => { const o = box(0.04, 0.14, half, blue, x, (eave + ridge) / 2 - 0.02, s * (Wz / 4 + 0.11)); o.rotation.x = s * pitch; }));
    // disken och showgrillen i luckan
    box(H.x1 - H.x0, 0.05, 0.5, M('#6e5137', 0.6), 0, H.y0, B.z1 - 0.26); box(H.x1 - H.x0, H.y0 - F, 0.45, wood, 0, (F + H.y0) / 2, B.z1 - 0.27);
    const gr = S.grill, gx = (gr.x0 + gr.x1) / 2, gz = (gr.z0 + gr.z1) / 2;
    box(gr.x1 - gr.x0, 0.2, gr.z1 - gr.z0, M('#1f1c1a', 0.6, 0.4), gx, H.y0 + 0.1, gz);
    box(gr.x1 - gr.x0 - 0.08, 0.02, gr.z1 - gr.z0 - 0.08, M('#3a1606', 0.9, 0, '#ff6a1a', 1.4), gx, H.y0 + 0.17, gz);
    for (let i = 0; i < 7; i++) box(0.012, 0.012, gr.z1 - gr.z0 - 0.06, steel, gr.x0 + 0.06 + i * 0.13, H.y0 + 0.215, gz);
    sausages(gr.x0 + 0.08, gr.x1 - 0.08, gz, H.y0 + 0.24, 5);
    light('#ff7a2a', 1.8, 2.6, gx, H.y0 + 0.5, gz + 0.2);
    const chim = hoodAndChimney(gx, gz - 0.05, 0.95, 0.55, eave, 3.4); smoke(gx, 3.5, gz - 0.05);
    // luckan: träskivan fälld upp på stöttor, festonger längst ut
    const flapL = 1.08, phi = 100 * Math.PI / 180, hy = H.y1 + 0.06, ez = B.z1 + flapL * Math.sin(phi), ey = hy - flapL * Math.cos(phi);
    const flap = box(H.x1 - H.x0 + 0.2, 0.05, flapL, wood, 0, (hy + ey) / 2, (B.z1 + ez) / 2); flap.rotation.x = -Math.atan2(ey - hy, ez - B.z1);
    valancePlane(H.x0 - 0.1, H.x1 + 0.1, ez + 0.01, ey + 0.01, 0.2, valance(LIV, CREAM, 12));
    [H.x0 + 0.1, H.x1 - 0.1].forEach((x) => { const len = Math.hypot(ez - B.z1 - 0.05, ey - H.y0), o = box(0.035, len, 0.035, blue, x, (ey + H.y0) / 2, (ez + B.z1 + 0.05) / 2); o.rotation.x = Math.atan2(ez - B.z1 - 0.05, ey - H.y0); });
    // markisen över kön, på stolpar
    const mz0 = B.z1 + 0.04, mz1 = 2.95, mx0 = -4.6, mx1 = -1.35;
    const qa = awningSlope(mx0, mx1, mz0, 2.45, mz1, 2.2, T(stripes(LIV, CREAM, 16), 0.9)), qv = valancePlane(mx0, mx1, mz1 + 0.01, 2.21, 0.2, valance(LIV, CREAM, 16));
    // Markisen täcker kön. På krogens nivå blir den genomskinlig (CANOPY_MIN), annars syns inte de som står i kön.
    canopy.push(qa, qv);
    [[mx0, mz1], [mx1, mz1], [mx0, mz0 + 0.05]].forEach(([x, z]) => cyl(0.035, 2.2, M(INK, 0.6, 0.3), x, 1.1, z));
    bulbs([-4.3, -3.6, -2.9, -2.2, -1.6].map((x) => [x, 2.16, mz1]));
    // kritmenyn på ett ställ, vänd mot kön
    const st = new THREE.Group(); st.position.set(-3.35, 0, 1.55); st.rotation.y = -0.35; g.add(st);
    box(1.0, 0.85, 0.05, M('#5e4b3a', 0.8), 0, 1.55, 0, st); const mp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.76), T(chalkMenu(4), 0.8, 0.12)); mp.position.set(0, 1.55, 0.03); st.add(mp);
    [-0.42, 0.42].forEach((x) => box(0.05, 1.15, 0.05, M('#5e4b3a', 0.8), x, 0.57, 0, st));
    // kylen ute, och dragstången under markisen
    fridge(S.fridge, '+z');
    box(1.1, 0.08, 0.1, dark, (B.x0 + TRUCK_FRAME.hitch[0]) / 2, 0.42, 0); cyl(0.05, 0.4, dark, -3.05, 0.22, 0);
    box(0.03, 1.9, 0.78, M('#294260', 0.6), B.x1 + 0.016, F + 0.95, 0.4); box(0.36, 0.06, 0.6, M('#6e5137', 0.7), B.x1 + 0.2, 0.22, 0.4);
    const lan = M('#ffd58f', 1, 0, '#ffb040', 1.6); [H.x0 - 0.25, H.x1 + 0.25].forEach((x) => { box(0.14, 0.2, 0.14, lan, x, 2.05, B.z1 + 0.1); light('#ffc070', 1.2, 3.5, x, 2.0, B.z1 + 0.35); });
    light('#ffb468', 1.4, 3.6, 0, 2.2, -0.2); light('#ffcf8a', 1.6, 5, -3.0, 2.0, 2.1); light('#ffd090', 0.5, 2, -3.35, 2.1, 2.0);
    person(chim);
  }

  if (id === 'C') {
    // ===== C · Skåpbilen: en ombyggd skåpbil med hytt framåt (där dragstången annars står), räfflad plåt, dalablå med
    // gräddvitt tak och list. Luckans nedre halva fälls ned och blir disk, och en rullmarkis dras ut över kön. Ljusskylt med
    // menyn ovanför luckan, stekbord i luckan med fläkthuv, och bakdörrarna öppna mot serveringen med en hög glasdörrskyl.
    const blue = M(LIV, 0.55, 0.15), cream = M(CREAM, 0.6, 0.1), trim = M('#c9c3b6', 0.3, 0.7), glassD = M('#1b2530', 0.15, 0.4);
    const x0 = -1.9, x1 = B.x1, zw = 1.05, bot = 0.45, top = 2.72, r = 0.18, wall = 0.05;
    box(x1 - x0, H.y0 - bot, wall, blue, (x0 + x1) / 2, (bot + H.y0) / 2, zw - wall / 2);
    box(x1 - x0 - 0.1, 0.04, zw * 2 - 0.1, M('#c9c6c0', 0.6, 0.3), (x0 + x1) / 2, F - 0.02, 0);
    box(x1 - x0, top - r - bot, wall, blue, (x0 + x1) / 2, (bot + top - r) / 2, -zw + wall / 2);
    box(wall, top - r - bot, zw * 2, blue, x0 + wall / 2, (bot + top - r) / 2, 0);
    box(H.x0 - x0, top - r - H.y0, wall, blue, (x0 + H.x0) / 2, (H.y0 + top - r) / 2, zw - wall / 2);
    box(x1 - H.x1, top - r - H.y0, wall, blue, (H.x1 + x1) / 2, (H.y0 + top - r) / 2, zw - wall / 2);
    box(H.x1 - H.x0, top - r - H.y1, wall, blue, 0, (H.y1 + top - r) / 2, zw - wall / 2);
    for (let i = 0; i < 4; i++) { const y = 0.62 + i * 0.16; box(x1 - x0, 0.03, 0.02, M('#3a5a7e', 0.5, 0.2), (x0 + x1) / 2, y, zw + 0.01); box(x1 - x0, 0.03, 0.02, M('#3a5a7e', 0.5, 0.2), (x0 + x1) / 2, y, -zw - 0.01); }
    box(x1 - x0 + 0.04, 0.06, zw * 2 + 0.04, cream, (x0 + x1) / 2, bot + 0.03, 0);
    // taket (tonar), de rundade takkanterna och listen (står kvar)
    roof.push(box(x1 - x0, 0.06, zw * 2 - 2 * r + 0.02, roofMat(CREAM), (x0 + x1) / 2, top - 0.03, 0));
    [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 14, 1, false, s > 0 ? 0 : Math.PI, Math.PI / 2), cream); e.rotation.z = Math.PI / 2; e.position.set((x0 + x1) / 2, top - r, s * (zw - r)); e.castShadow = true; g.add(e); });
    // hytten
    box(0.9, 1.9, zw * 2, blue, -2.35, bot + 0.95, 0); box(0.7, 0.9, zw * 2 - 0.1, blue, -3.15, bot + 0.45, 0); box(0.7, 0.04, zw * 2 - 0.12, cream, -3.15, bot + 0.92, 0);
    const ws = box(0.04, 0.95, zw * 2 - 0.2, glassD, -2.82, bot + 1.38, 0); ws.rotation.z = -0.32;
    [-1, 1].forEach((s) => { box(0.6, 0.55, 0.02, glassD, -2.35, bot + 1.45, s * (zw + 0.005)); box(0.1, 0.12, 0.04, M('#f6efdc', 0.2, 0, '#fff2cc', 1.4), -3.5, bot + 0.55, s * 0.72); box(0.04, 0.16, 0.12, M(INK, 0.5), -2.75, bot + 1.35, s * (zw + 0.12)); });
    box(0.12, 0.2, zw * 2 + 0.06, cream, -3.52, bot + 0.2, 0);
    [-2.95, 1.35].forEach((x) => [-1, 1].forEach((s) => cyl(0.36, 0.24, dark, x, 0.36, s * (zw - 0.06), 'z')));
    // luckan: nedre halvan fälld till disk, rullmarkisen och ljusskylten
    box(H.x1 - H.x0, 0.04, 0.42, steel, 0, H.y0 - 0.02, zw + 0.21);
    [H.x0 + 0.05, H.x1 - 0.05].forEach((x) => { const o = box(0.02, 0.5, 0.02, trim, x, H.y0 - 0.2, zw + 0.2); o.rotation.x = 0.7; });
    box(H.x1 - H.x0 + 0.3, 0.04, 0.4, steel, 0, H.y0 + 0.02, zw - 0.24); box(H.x1 - H.x0 + 0.3, H.y0 - F, 0.36, M('#cbc7be', 0.6, 0.2), 0, (F + H.y0) / 2, zw - 0.25);
    box(0.62, 1.0, 0.06, M('#2a2522', 0.5), -1.62, 1.85, zw + 0.03); plane(0.54, 0.92, lightMenu(), -1.62, 1.85, zw + 0.065, 0, 0.9);
    box(3.9, 0.12, 0.14, M('#d8d2c4', 0.5, 0.3), 0.15, 2.6, zw + 0.07);
    canopy.push(awningSlope(-1.3, 2.05, zw + 0.12, 2.58, 1.95, 2.36, T(stripes(CREAM, LIV, 16), 0.9)));
    box(3.35, 0.05, 0.05, trim, 0.37, 2.34, 1.95); [-1.25, 2.0].forEach((x) => cyl(0.025, 2.32, trim, x, 1.17, 1.95));
    bulbs([-1.0, -0.2, 0.6, 1.4].map((x) => [x, 2.28, 1.94]));
    // stekbordet och fläkthuven med takhuven
    const gr = S.grill, gx = (gr.x0 + gr.x1) / 2, gz = (gr.z0 + gr.z1) / 2;
    box(gr.x1 - gr.x0, 0.05, gr.z1 - gr.z0, M('#2a2522', 0.45, 0.5, '#5a1e08', 0.3), gx, H.y0 + 0.07, gz); sausages(gr.x0 + 0.08, gr.x1 - 0.08, gz, H.y0 + 0.12, 6);
    light('#ff8a3a', 1.2, 2.2, gx, H.y0 + 0.4, gz);
    box(0.9, 0.28, 0.5, steel, gx, F + 1.78, gz - 0.05); cyl(0.12, 0.3, M('#4a4642', 0.5, 0.5), gx, top + 0.12, gz - 0.1); const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), M('#4a4642', 0.5, 0.5)); cap.position.set(gx, top + 0.26, gz - 0.1); g.add(cap);
    // bakdörrarna öppna och kylen
    fridge(S.fridge, '+x');
    [-1, 1].forEach((s) => { const d = new THREE.Group(); d.position.set(x1, 0, s * zw); d.rotation.y = s * -1.75; g.add(d); box(0.03, top - bot - 0.15, zw - 0.02, blue, 0, (bot + top) / 2 - 0.05, -s * (zw - 0.02) / 2, d); box(0.035, 0.5, zw - 0.25, glassD, 0.002, 2.05, -s * (zw - 0.02) / 2, d); });
    box(0.4, 0.06, 1.2, steel, x1 + 0.25, 0.3, 0);
    light('#ffc070', 2.0, 6, 0.1, 2.1, 1.75); light('#ffb468', 1.2, 3.4, 0.2, 2.25, -0.2);
  }
  canopy.forEach((o) => { o.material.transparent = true; o.material.alphaTest = 0; });
  return { group: g, spec: S, roof, canopy, lights, anim };
}

/** Taket på kamerans avstånd: helt synligt från 40 m, borta vid 26 m (husens BLEND.roof). */
export function roofOpacity(distM) { const k = (distM - ROOF_BLEND.goneAtM) / (ROOF_BLEND.fullFromM - ROOF_BLEND.goneAtM); return Math.max(0, Math.min(1, k)); }
export function updateGrillTruck(T, distM, t) {
  const k = roofOpacity(distM);
  T.roof.forEach((o) => { o.material.opacity = k; o.visible = k > 0.02; o.castShadow = k > 0.5; });
  T.canopy.forEach((o) => { o.material.opacity = CANOPY_MIN + (1 - CANOPY_MIN) * k; o.material.depthWrite = k > 0.5; });
  T.anim.forEach((a) => { if (a.kind === 'smoke') { const u = ((t * 0.35 + a.i / 5) % 1); a.s.position.set(a.x + 0.25 * u + 0.05 * Math.sin(t + a.i), a.y + 1.4 * u, a.z - 0.1 * u); a.s.scale.setScalar(0.25 + 0.7 * u); a.s.material.opacity = 0.32 * (1 - u) * Math.min(1, u * 6); } });
}
