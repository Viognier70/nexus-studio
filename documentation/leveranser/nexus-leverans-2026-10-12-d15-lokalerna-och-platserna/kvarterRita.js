// kvarterRita.js — D15 (2026-10-12): omgivningen runt en ram ur kartan (localMap) och de tre lokalerna, i three.js.
// Husen ur kartan får väggar, tak och fönster. Taken tonar ut på krogens nivå som i byn (ROOF_BLEND, 40 → 26 m).
// Lokalen: taket tonar ut och väggarna kapas till 1,05 m på samma avstånd, så att rummet syns inifrån. Källaren:
// huset ovanpå tonar ut helt och källarens murar står kvar upp till gatan.
// Höjderna är prototypens (kartan har inga). Ingen text i bilderna.

import { roofOpacity } from './grillstugan.js';
import { pointInPoly, segDist, free } from './kvarterPlatser.js';

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const rnd = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export const FACADES = ['#8a3b2a', '#93432f', '#c9a35e', '#e3d5b8', '#d6c08a', '#7e6a54', '#b88a5a', '#6f7a68'];
export const SEASON = {
  autumn: { ground: '#4d4833', crowns: ['#9a6a2a', '#7a4b22', '#a8823a', '#6a5a2a', '#585c30'], lit: 0.7, water: '#26313a' },
  summer: { ground: '#4e5a33', crowns: ['#3f5a2c', '#4d6a33', '#36502a', '#56703a'], lit: 0.35, water: '#2f4652' }
};
const ROAD_COL = { car: '#3d3833', living: '#6b5842', path: '#857258', track: '#7b6a50' };

function obb(p) {
  let best = null;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], th = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(th), s = Math.sin(th); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; p.forEach((q) => { const u = q[0] * c + q[1] * s, v = -q[0] * s + q[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }); const A = (u1 - u0) * (v1 - v0); if (!best || A < best.A) { const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2; best = { A, th, L: u1 - u0, W: v1 - v0, c: [uc * c - vc * s, uc * s + vc * c] }; } }
  if (best.W > best.L) { best = { ...best, th: best.th + Math.PI / 2, L: best.W, W: best.L }; }
  return best;
}
const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; };
function openPoly(p) { const q = p.slice(); if (q.length > 2 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop(); return q; }

export function buildSurroundings(THREE, map, o) {
  o = o || {};
  const G = o.groundY || 0, S = SEASON[o.season || 'autumn'], g = new THREE.Group(); g.name = 'surroundings';
  const roofs = [], lights = [], cuts = [], R = o.R || 70, cutR = o.cutR ?? 13, cutTo = o.cutTo ?? 1.6;
  const M = (c, r = 0.85, m = 0, e, ei) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); if (e) { x.emissive = new THREE.Color(e); x.emissiveIntensity = ei ?? 1; } return x; };
  const flat = (poly, y, mat, hole) => { const sh = new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], -p[1]))); (hole || []).forEach((h) => sh.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], -p[1]))))); const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.y = y; m.receiveShadow = true; g.add(m); return m; };
  // marken, med hål där lokalen går ned under gatan
  const circle = Array.from({ length: 64 }, (_, i) => [Math.cos(i / 64 * Math.PI * 2) * 190, Math.sin(i / 64 * Math.PI * 2) * 190]);
  const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = S.ground; x.fillRect(0, 0, 128, 128); const r = rnd(5); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,240,200' : '20,16,8'},${0.04 + r() * 0.06})`; x.fillRect(r() * 128, r() * 128, 2, 2); } const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  flat(circle, G + 0.004, groundMat, o.holes);
  // gräs och skog
  map.green.forEach((w) => flat(w.poly, G + 0.006, M(o.season === 'summer' ? '#4a5a30' : '#4a4630', 0.95)));
  // vattnet
  const wm = new THREE.MeshStandardMaterial({ color: S.water, roughness: 0.3, metalness: 0.1, emissive: new THREE.Color('#0c171e'), emissiveIntensity: 1 });
  map.water.forEach((w) => flat(w.poly, G + 0.014, wm));
  // gatorna: band med runda skarvar
  const road = (r) => {
    const col = r.car && r.kind !== 'living_street' ? ROAD_COL.car : r.kind === 'living_street' || r.name === 'Torget' ? ROAD_COL.living : r.kind === 'track' ? ROAD_COL.track : ROAD_COL.path;
    const m = M(col, 0.9); m.polygonOffset = true; m.polygonOffsetFactor = -1 - (r.car ? 0 : 1); const y = G + (r.car ? 0.02 : 0.024);
    for (let i = 0; i < r.poly.length - 1; i++) { const a = r.poly[i], b = r.poly[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.01) continue; const q = new THREE.Mesh(new THREE.PlaneGeometry(L, r.w), m); q.rotation.x = -Math.PI / 2; q.rotation.z = -Math.atan2(b[1] - a[1], b[0] - a[0]); q.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); q.receiveShadow = true; g.add(q); }
    r.poly.forEach((p) => { const d = new THREE.Mesh(new THREE.CircleGeometry(r.w / 2, 16), m); d.rotation.x = -Math.PI / 2; d.position.set(p[0], y - 0.001, p[1]); d.receiveShadow = true; g.add(d); });
    // kantsten längs körbanorna
    if (r.car && r.w >= 4.5) { const km = M('#7d796e', 0.8); for (let i = 0; i < r.poly.length - 1; i++) { const a = r.poly[i], b = r.poly[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), th = Math.atan2(b[1] - a[1], b[0] - a[0]); if (L < 0.5) continue; [-1, 1].forEach((s) => { const k = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.15), km); k.position.set((a[0] + b[0]) / 2 - Math.sin(th) * s * r.w / 2, G + 0.03, (a[1] + b[1]) / 2 + Math.cos(th) * s * r.w / 2); k.rotation.y = -th; g.add(k); }); } }
  };
  map.roads.forEach(road);
  if (o.plaza) { const m = M(ROAD_COL.living, 0.9); m.polygonOffset = true; m.polygonOffsetFactor = -3; flat(o.plaza, G + 0.026, m); }

  // husen
  const winGeo = new THREE.BoxGeometry(0.9, 1.15, 0.06), wins = [];
  // Husen närmast kameran på krogens nivå får väggarna kapade som lokalens, annars skymmer de vagnen och kön.
  const nearO = (poly) => poly.some((q, i) => poly[(i + 1) % poly.length] && segDist([o.cutAt ? o.cutAt[0] : 0, o.cutAt ? o.cutAt[1] : 0], q, poly[(i + 1) % poly.length]) < cutR);
  map.buildings.forEach((b) => {
    const poly = openPoly(b.poly), h = b.h, col = FACADES[Math.floor(hash(b.id) * FACADES.length)], wall = M(col, 0.85);
    const sh = new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], -p[1]))), geo = new THREE.ExtrudeGeometry(sh, { depth: h.eave, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, wall); m.position.y = G; m.castShadow = true; m.receiveShadow = true; g.add(m);
    const isCut = nearO(poly); if (isCut) cuts.push({ o: m, h: h.eave, to: Math.min(cutTo, h.eave) });
    const roofMat = M(b.kind === 'church' ? '#3b3a38' : hash(b.id + 'r') < 0.5 ? '#3d3b38' : '#5a2f24', 0.7, 0.15); roofMat.transparent = true;
    if (h.flat || poly.length > 6) { const cap = new THREE.Mesh(new THREE.ShapeGeometry(sh), roofMat); cap.geometry.rotateX(-Math.PI / 2); cap.position.y = G + h.eave + 0.02; cap.castShadow = true; g.add(cap); roofs.push(cap); }
    else { const B = obb(poly), W = B.W + 0.6, Lr = B.L + 0.5, tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, h.ridge - h.eave)]), rg = new THREE.ExtrudeGeometry(tri, { depth: Lr, bevelEnabled: false }); rg.translate(0, 0, -Lr / 2); const r = new THREE.Mesh(rg, roofMat); r.rotation.y = Math.PI / 2 - B.th; r.position.set(B.c[0], G + h.eave, B.c[1]); r.castShadow = true; g.add(r); roofs.push(r); }
    // fönstren: en eller två rader, några tända
    const ccw = area(poly) > 0, rows = h.eave > 5.5 ? [1.5, 4.3] : h.eave > 3 ? [1.4] : [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], c = poly[(i + 1) % poly.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 2.6) continue;
      const th = Math.atan2(c[1] - a[1], c[0] - a[0]), n = Math.max(1, Math.floor((L - 0.8) / 2.6)), nx = Math.sin(th) * (ccw ? -1 : 1), nz = -Math.cos(th) * (ccw ? -1 : 1);
      rows.forEach((y, ri) => { for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, lit = hash(b.id + i + '/' + k + ri) < S.lit; wins.push({ x: a[0] + (c[0] - a[0]) * t + nx * 0.03, z: a[1] + (c[1] - a[1]) * t + nz * 0.03, y: G + y, yaw: -th, lit, cut: isCut }); } });
    }
  });
  const cutWins = [];
  const mk = (list, mat) => { if (!list.length) return null; const im = new THREE.InstancedMesh(winGeo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); list.forEach((w, i) => { q.setFromEuler(e.set(0, w.yaw, 0)); m4.compose(new THREE.Vector3(w.x, w.y, w.z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); }); g.add(im); return im; };
  const litM = M('#ffd9a0', 0.4, 0, '#ffb45a', 1.15), darkM = M('#2a2c30', 0.2, 0.3);
  mk(wins.filter((w) => w.lit && !w.cut), litM); mk(wins.filter((w) => !w.lit && !w.cut), darkM);
  [mk(wins.filter((w) => w.lit && w.cut), litM), mk(wins.filter((w) => !w.lit && w.cut), darkM)].forEach((x) => x && cutWins.push(x));

  // gatlyktor längs körbanorna och gångfartsgatorna
  const lampPts = [];
  map.roads.filter((r) => r.car || r.kind === 'footway' || r.kind === 'path').forEach((r) => { let acc = 11 + hash(r.id) * 10, side = 1; for (let i = 0; i < r.poly.length - 1; i++) { const a = r.poly[i], b = r.poly[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), th = Math.atan2(b[1] - a[1], b[0] - a[0]); while (acc < L) { const t = acc / L, off = r.w / 2 + 0.7, p = [a[0] + (b[0] - a[0]) * t - Math.sin(th) * off * side, a[1] + (b[1] - a[1]) * t + Math.cos(th) * off * side]; if (Math.hypot(p[0], p[1]) < R && free(map, p, 0.3) && !(o.keepClear || []).some((k) => Math.hypot(p[0] - k[0], p[1] - k[1]) < k[2])) lampPts.push(p); acc += 24; side = -side; } acc -= L; } });
  const pm = M('#2a2421', 0.6, 0.4), hm = M('#ffd58f', 0.6, 0, '#ffb040', 1.4);
  lampPts.forEach((p) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.2, 8), pm); post.position.set(p[0], G + 2.1, p[1]); post.castShadow = true; g.add(post); const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), hm); head.position.set(p[0], G + 4.2, p[1]); g.add(head); });
  lampPts.slice().sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1])).slice(0, o.lampLights ?? 7).forEach((p) => { const L = new THREE.PointLight('#ffcf8a', o.season === 'summer' ? 1.6 : 3.2, 13, 1.4); L.position.set(p[0], G + 4.0, p[1]); g.add(L); lights.push(L); });

  // träden
  const r0 = rnd(Math.floor((o.treeSeed || 1) * 1e6)), trees = [];
  for (let x = -R; x <= R; x += 5.5) for (let z = -R; z <= R; z += 5.5) {
    const p = [x + (r0() - 0.5) * 4, z + (r0() - 0.5) * 4], d = Math.hypot(p[0], p[1]); if (d > R || d < (o.clearR || 11)) continue;
    const inGreen = map.green.some((w) => pointInPoly(p, w.poly)), nearWater = map.water.some((w) => w.poly.some((q, i) => w.poly[i + 1] && segDist(p, q, w.poly[i + 1]) < 9));
    const pr = (o.treeDensity ?? 0.12) + (inGreen ? 0.45 : 0) + (nearWater ? 0.25 : 0); if (r0() > pr) continue;
    if (!free(map, p, 2.2) || map.buildings.some((b) => b.poly.some((q, i) => b.poly[i + 1] && segDist(p, q, b.poly[i + 1]) < 2.4))) continue;
    if ((o.keepClear || []).some((k) => Math.hypot(p[0] - k[0], p[1] - k[1]) < k[2])) continue;
    trees.push({ p, s: 0.6 + r0() * 0.45, c: S.crowns[Math.floor(r0() * S.crowns.length)], pine: r0() < (o.pines ?? 0.35) });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.13, 0.2, 2.4, 6), crownGeo = new THREE.IcosahedronGeometry(1.7, 0), pineGeo = new THREE.ConeGeometry(1.5, 5.2, 7);
  const inst = (geo, list, mat, f) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(); list.forEach((t, i) => { f(m4, t); im.setMatrixAt(i, m4); if (t.c) im.setColorAt(i, new THREE.Color(t.c)); }); im.castShadow = true; g.add(im); };
  inst(trunkGeo, trees, M('#4a3526', 0.9), (m4, t) => m4.compose(new THREE.Vector3(t.p[0], G + 1.2 * t.s, t.p[1]), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s, t.s)));
  inst(crownGeo, trees.filter((t) => !t.pine), M('#ffffff', 0.9), (m4, t) => m4.compose(new THREE.Vector3(t.p[0], G + 3.6 * t.s, t.p[1]), new THREE.Quaternion(), new THREE.Vector3(t.s * 1.1, t.s * 1.25, t.s * 1.1)));
  inst(pineGeo, trees.filter((t) => t.pine).map((t) => ({ ...t, c: '#2f4128' })), M('#ffffff', 0.9), (m4, t) => m4.compose(new THREE.Vector3(t.p[0], G + 4.2 * t.s, t.p[1]), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s, t.s)));
  return { group: g, roofs, lights, groundMat, lamps: lampPts, trees, cuts, cutWins };
}
export function updateSurroundings(S, distM) {
  const k = roofOpacity(distM);
  S.roofs.forEach((r) => { r.material.opacity = k; r.visible = k > 0.02; r.castShadow = k > 0.5; r.material.depthWrite = k > 0.5; });
  S.cuts.forEach((c) => { const hh = c.to + (c.h - c.to) * k; c.o.scale.y = hh / c.h; });
  S.cutWins.forEach((w) => { w.visible = k > 0.6; });
}

// ---------- sjöns brygga och strand ----------
export function buildLakeside(THREE, o) {
  const g = new THREE.Group(), G = o.groundY || 0, wood = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.85 }), sand = new THREE.MeshStandardMaterial({ color: '#b8a27a', roughness: 0.95 });
  const s = new THREE.Mesh(new THREE.CircleGeometry(1, 28), sand); s.rotation.x = -Math.PI / 2; s.scale.set(o.sand[2], o.sand[3], 1); s.rotation.z = -(o.sand[4] || 0); s.position.set(o.sand[0], G + 0.018, o.sand[1]); s.receiveShadow = true; g.add(s);
  const J = o.jetty, L = J.z1 - J.z0; const deck = new THREE.Mesh(new THREE.BoxGeometry(J.w, 0.08, L), wood); deck.position.set(J.x, G + 0.32, (J.z0 + J.z1) / 2); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  for (let z = J.z0 + 0.4; z < J.z1; z += 2) [-1, 1].forEach((sd) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), wood); p.position.set(J.x + sd * (J.w / 2 - 0.1), G - 0.15, z); g.add(p); });
  (o.benches || []).forEach(([x, z, yaw]) => { const b = new THREE.Group(); b.position.set(x, G, z); b.rotation.y = yaw; g.add(b); const sm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.42), wood); sm.position.y = 0.45; sm.castShadow = true; b.add(sm); const bk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 0.05), wood); bk.position.set(0, 0.72, -0.2); b.add(bk); [-0.7, 0.7].forEach((dx) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.42), wood); l.position.set(dx, 0.225, 0); b.add(l); }); });
  return g;
}

// ---------- lokalerna ----------
function venueCore(THREE) {
  const g = new THREE.Group(), cut = [], fadeAll = [], roofs = [], lights = [];
  const M = (c, r = 0.85, m = 0, e, ei) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); if (e) { x.emissive = new THREE.Color(e); x.emissiveIntensity = ei ?? 1; } return x; };
  const tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); return t; };
  const box = (w, h, d, m, x, y, z, p, ry) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; (p || g).add(o); return o; };
  const cyl = (rt, rb, h, m, x, y, z, p, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 18), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (p || g).add(o); return o; };
  const light = (c, i, d, x, y, z) => { const L = new THREE.PointLight(c, i, d, 1.6); L.position.set(x, y, z); g.add(L); lights.push(L); return L; };
  /** En vägg från a till b (lokala xz), höjd h från y0, tjocklek t. cutTo: höjden på krogens nivå. openings: [{ u0, u1, y0, y1, mat }] längs väggen. */
  const wall = (a, b, y0, h, t, mat, o) => {
    o = o || {}; const L = Math.hypot(b[0] - a[0], b[1] - a[1]), th = Math.atan2(b[1] - a[1], b[0] - a[0]), grp = new THREE.Group(); grp.position.set(a[0], y0, a[1]); grp.rotation.y = -th; g.add(grp);
    const ops = (o.openings || []).slice().sort((p, q) => p.u0 - q.u0), pieces = [];
    let u = 0; ops.forEach((op) => { if (op.u0 > u) pieces.push([u, op.u0, 0, h]); if (op.y0 > 0) pieces.push([op.u0, op.u1, 0, op.y0]); if (op.y1 < h) pieces.push([op.u0, op.u1, op.y1, h]); if (op.mat) { const gl = box(op.u1 - op.u0, op.y1 - op.y0, 0.03, op.mat, (op.u0 + op.u1) / 2, (op.y0 + op.y1) / 2, 0, grp); gl.castShadow = false; cut.push({ o: gl, y0: op.y0, h: op.y1 - op.y0, cutTo: o.cutTo, glass: true }); } u = op.u1; });
    if (u < L) pieces.push([u, L, 0, h]);
    pieces.forEach(([u0, u1, v0, v1]) => { const m = box(u1 - u0, v1 - v0, t, mat, (u0 + u1) / 2, (v0 + v1) / 2, 0, grp); if (o.cutTo != null) cut.push({ o: m, y0: v0, h: v1 - v0, cutTo: o.cutTo }); if (o.fade) fadeAll.push(m); });
    return grp;
  };
  return { g, cut, fadeAll, roofs, lights, M, tex, box, cyl, light, wall };
}
/** Krogens nivå: taket tonar ut och väggarna kapas till cutTo. */
export function updateVenue(V, distM) {
  const k = roofOpacity(distM);
  V.roofs.forEach((r) => { r.material.opacity = k; r.visible = k > 0.02; r.castShadow = k > 0.5; r.material.depthWrite = k > 0.5; });
  V.fadeAll.forEach((r) => { r.material.opacity = k; r.visible = k > 0.02; r.castShadow = k > 0.5; r.material.depthWrite = k > 0.5; });
  V.cut.forEach((c) => { if (c.cutTo == null) return; const top = c.cutTo + (c.y0 + c.h - c.cutTo) * k, hh = Math.max(0, Math.min(c.h, top - c.y0)); c.o.visible = hh > 0.01; if (hh > 0.01) { c.o.scale.y = hh / c.h; c.o.position.y = c.y0 + hh / 2; } });
  V.ceil.forEach((c) => { c.visible = k > 0.5; });
}

export function buildVenue(THREE, V, o) {
  if (V.kind === 'cellar') return buildCellar(THREE, V, o);
  if (V.kind === 'salon') return buildSalon(THREE, V, o);
  return buildGlass(THREE, V, o);
}

// ---------- källaren: låg, välvd, tegel, långbord ----------
function buildCellar(THREE, V, o) {
  const K = venueCore(THREE), { g, M, tex, box, cyl, light, wall } = K, R = V.room, up = -V.floorY, t = R.wall, H = V.ceilingM;
  const brick = tex(256, 128, (x, w, h) => { x.fillStyle = '#5a3c2c'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const off = (r % 2) * 16, v = 140 + ((r * 7 + c * 13) % 5) * 9; x.fillStyle = `rgb(${v},${Math.round(v * 0.55)},${Math.round(v * 0.38)})`; x.fillRect(c * 32 + off + 1, r * 16 + 1, 30, 14); } }, [3, 1.2]);
  const stone = tex(256, 256, (x, w, h) => { x.fillStyle = '#4e4a44'; x.fillRect(0, 0, w, h); const r = rnd(9); for (let i = 0; i < 70; i++) { const v = 90 + r() * 50; x.fillStyle = `rgb(${v},${v - 6},${v - 14})`; x.beginPath(); x.ellipse(r() * w, r() * h, 14 + r() * 18, 10 + r() * 12, r() * 3, 0, Math.PI * 2); x.fill(); } }, [2, 1]);
  const floorT = tex(128, 128, (x, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#7a5a42' : '#86644a'; x.fillRect(i * 32, j * 32, 32, 32); x.strokeStyle = 'rgba(30,18,10,.5)'; x.strokeRect(i * 32, j * 32, 32, 32); } }, [7, 5]);
  const W = R.x1 - R.x0, D = R.z1 - R.z0;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.85 })); fl.rotation.x = -Math.PI / 2; fl.position.set((R.x0 + R.x1) / 2, 0.006, (R.z0 + R.z1) / 2); fl.receiveShadow = true; g.add(fl);
  // murarna: sten nedtill, tegel upptill, upp till gatan. Fönsterbrunnarna i norra muren.
  const sm = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.95 }), bm = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }), glow = M('#ffe2ad', 0.4, 0, '#ffbe6a', 0.9);
  const Wn = V.windows, ops = Wn.xs.map((x) => ({ u0: x - R.x0 - Wn.w / 2, u1: x - R.x0 + Wn.w / 2, y0: Wn.y, y1: Wn.y + Wn.h, mat: glow }));
  ops.push({ u0: V.door.x - R.x0 - V.door.w / 2, u1: V.door.x - R.x0 + V.door.w / 2, y0: 0, y1: 2.05 });
  wall([R.x0, R.z0 - t / 2], [R.x1, R.z0 - t / 2], 0, up, t, sm, { openings: ops });
  wall([R.x1 + t / 2, R.z0], [R.x1 + t / 2, R.z1], 0, up, t, sm);
  wall([R.x1, R.z1 + t / 2], [R.x0, R.z1 + t / 2], 0, up, t, sm);
  wall([R.x0 - t / 2, R.z1], [R.x0 - t / 2, R.z0], 0, up, t, sm);
  // tegelvalven: tre tunnor tvärs rummet på två bågar, med pelare i mitten (tonar ut med huset)
  const ceil = [], vm = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9, side: THREE.DoubleSide }); vm.transparent = true;
  [-1, 1].forEach((s) => { const half = D / 4, v = new THREE.Mesh(new THREE.CylinderGeometry(half, half, W, 18, 1, true, Math.PI / 2, Math.PI), vm); v.rotation.z = Math.PI / 2; v.scale.set(1, 1, 0.42); v.position.set((R.x0 + R.x1) / 2, H - 0.35, (R.z0 + R.z1) / 2 + s * half); g.add(v); ceil.push(v); K.roofs.push(v); });
  [-4.2, 0, 4.2].forEach((x) => { box(0.42, H, 0.42, bm, x, H / 2, (R.z0 + R.z1) / 2); });
  // trappan ned från gatan, i en grop längs fasaden
  const st = V.stair, n = 14, run = (st.x1 - st.x0) / n, rise = (st.fromY - st.toY) / n, stm = M('#6d665c', 0.9);
  for (let i = 0; i < n; i++) box(run + 0.02, up - i * rise, st.z1 - st.z0, stm, st.x0 + (i + 0.5) * run, (up - i * rise) / 2, (st.z0 + st.z1) / 2);
  box(st.xEnd - st.x0 + 0.5, up + 1.0, 0.25, sm, (st.x0 + st.xEnd) / 2 + 0.25, up / 2, st.z0 - 0.12);
  box(0.25, up + 1.0, st.z1 - st.z0 + 0.25, sm, st.x0 - 0.12, up / 2, (st.z0 + st.z1) / 2 - 0.12); box(0.25, up + 1.0, st.z1 - st.z0 + 0.25, sm, st.xEnd + 0.37, up / 2, (st.z0 + st.z1) / 2 - 0.12);
  const rail = M('#1f1d1b', 0.5, 0.6); box(st.xEnd - st.x0, 0.04, 0.04, rail, (st.x0 + st.xEnd) / 2, up + 1.45, st.z0 - 0.12); [st.x0, (st.x0 + st.xEnd) / 2, st.xEnd].forEach((x) => box(0.04, 0.95, 0.04, rail, x, up + 0.97, st.z0 - 0.12));
  box(st.xEnd - st.x1, 0.06, st.z1 - st.z0, M('#5a4a3c', 0.85), (st.x1 + st.xEnd) / 2, 0.03, (st.z0 + st.z1) / 2);
  box(V.door.w + 0.2, 2.2, 0.08, M('#2b1f17', 0.7), V.door.x, 1.1, R.z0 - t - 0.04); box(0.4, 0.4, 0.06, glow, V.door.x + 0.9, 2.1, R.z0 - t - 0.08);
  // skylten vid trappan på gatan: ett hängande skåp med en korg (ingen text)
  const sg = new THREE.Group(); sg.position.set(st.x0 - 0.1, up, st.z0 - 0.3); g.add(sg); box(0.06, 2.6, 0.06, rail, 0, 1.3, 0, sg); box(0.7, 0.04, 0.04, rail, 0.35, 2.55, 0, sg); box(0.5, 0.5, 0.05, M('#c9a227', 0.5, 0, '#a07a1a', 0.35), 0.45, 2.2, 0, sg);
  // huset ovanpå: väggar och tak som tonar ut helt på krogens nivå, med ett bjälklag i gatans höjd
  const hc = FACADES[Math.floor(hash(V.building) * FACADES.length)], hm = M(hc, 0.85); hm.transparent = true;
  const slab = box(W + 2 * t, 0.3, D + 2 * t, (() => { const m = M('#3a2f27', 0.9); m.transparent = true; return m; })(), (R.x0 + R.x1) / 2, up + 0.15, (R.z0 + R.z1) / 2); K.fadeAll.push(slab);
  const above = V.aboveM, hw = M('#ffd9a0', 0.4, 0, '#ffb45a', 1.1); hw.transparent = true;
  const sides = [[[R.x0 - t, R.z0 - t], [R.x1 + t, R.z0 - t]], [[R.x1 + t, R.z0 - t], [R.x1 + t, R.z1 + t]], [[R.x1 + t, R.z1 + t], [R.x0 - t, R.z1 + t]], [[R.x0 - t, R.z1 + t], [R.x0 - t, R.z0 - t]]];
  sides.forEach(([a, b], i) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n2 = Math.floor((L - 1) / 2.6), wo = []; for (let k = 0; k < n2; k++) [1.5, 4.3].forEach((y) => wo.push({ u0: (k + 0.5) * L / n2 - 0.45, u1: (k + 0.5) * L / n2 + 0.45, y0: y - 0.6, y1: y + 0.6, mat: hash(V.building + i + k + y) < 0.6 ? hw : M('#2a2c30', 0.2, 0.3) })); const grp = wall(a, b, up + 0.3, above - 0.3, 0.2, hm, { openings: wo, fade: true }); grp.children.forEach((c) => { if (!K.fadeAll.includes(c)) { c.material = c.material.clone(); c.material.transparent = true; K.fadeAll.push(c); } }); });
  const rm = M('#3d3b38', 0.7, 0.15); rm.transparent = true; const Wr = D + 2 * t + 0.6, Lr = W + 2 * t + 0.5, tri = new THREE.Shape([new THREE.Vector2(-Wr / 2, 0), new THREE.Vector2(Wr / 2, 0), new THREE.Vector2(0, 3.0)]), rg = new THREE.ExtrudeGeometry(tri, { depth: Lr, bevelEnabled: false }); rg.translate(0, 0, -Lr / 2); const roof = new THREE.Mesh(rg, rm); roof.rotation.y = Math.PI / 2; roof.position.set((R.x0 + R.x1) / 2, up + above, (R.z0 + R.z1) / 2); roof.castShadow = true; g.add(roof); K.roofs.push(roof);
  // ljuset: lågt och varmt, glödlampor i valven och ljus på borden
  [-5.8, -1.8, 2.2, 6.0].forEach((x) => [-2.4, 2.6].forEach((z) => { cyl(0.05, 0.05, 0.12, M('#ffd58f', 1, 0, '#ffb040', 1.8), x, H - 0.25, z, null, 8); }));
  [-4, 0, 4].forEach((x) => light('#ffb468', 1.5, 6.5, x, H - 0.4, -1.5)); [-4, 0, 4].forEach((x) => light('#ffb468', 1.3, 6, x, H - 0.4, 2.8));
  K.ceil = ceil; K.groundY = up;
  // hålet i marken: rummet med murarna och trappgropen
  const zt = R.z0 - t, pz = st.z0 - 0.25, px0 = st.x0 - 0.25, px1 = st.xEnd + 0.5;
  K.holes = [[[R.x0 - t, zt], [px0, zt], [px0, pz], [px1, pz], [px1, zt], [R.x1 + t, zt], [R.x1 + t, R.z1 + t], [R.x0 - t, R.z1 + t]]];
  return K;
}

// ---------- salongen: högt i tak, parkett, kakelugn, runda bord ----------
function buildSalon(THREE, V, o) {
  const K = venueCore(THREE), { g, M, tex, box, cyl, light, wall } = K, R = V.room, t = R.wall, H = V.eaveM, sock = 0.45, CUT = 1.05;
  const park = tex(256, 256, (x, w, h) => { x.fillStyle = '#6a4428'; x.fillRect(0, 0, w, h); for (let i = -8; i < 16; i++) for (let j = 0; j < 16; j++) { const v = 120 + ((i * 7 + j * 11) % 6) * 10; x.fillStyle = `rgb(${v},${Math.round(v * 0.68)},${Math.round(v * 0.42)})`; x.save(); x.translate(i * 32 + (j % 2) * 16, j * 16); x.rotate((j % 2 ? 1 : -1) * Math.PI / 4); x.fillRect(0, 0, 30, 8); x.restore(); } }, [6, 3]);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), new THREE.MeshStandardMaterial({ map: park, roughness: 0.6 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.006, 0); fl.receiveShadow = true; g.add(fl);
  const kit = V.kitchen; { const tiles = tex(64, 64, (x) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#8b8273' : '#a39a88'; x.fillRect(i * 16, j * 16, 16, 16); } }, [6, 10]); const kf = new THREE.Mesh(new THREE.PlaneGeometry(kit.x1 - kit.x0, R.z1 - R.z0), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.6 })); kf.rotation.x = -Math.PI / 2; kf.position.set((kit.x0 + kit.x1) / 2, 0.008, 0); g.add(kf); }
  // sockeln och trappan: golvet ligger 0,45 m över gatan
  const sm = M('#6d665c', 0.9); box(R.x1 - R.x0 + 2 * t + 0.1, sock, R.z1 - R.z0 + 2 * t + 0.1, sm, 0, -sock / 2, 0);
  for (let i = 0; i < V.steps.n; i++) box(V.steps.w, sock - i * sock / V.steps.n, 0.32, sm, V.steps.x, -sock + (sock - i * sock / V.steps.n) / 2, R.z0 - t - 0.16 - (V.steps.n - 1 - i) * 0.32);
  // väggarna: gul panel ute, mörkgrön inne, höga fönster med spröjs
  const ext = M('#d2b06a', 0.85), glow = M('#ffe2ad', 0.35, 0, '#ffbe6a', 0.75), Wn = V.windows;
  const winOps = (xs, flip) => xs.map((x) => { const u = flip ? R.x1 - x : x - R.x0; return { u0: u - Wn.w / 2, u1: u + Wn.w / 2, y0: Wn.y, y1: Wn.y + Wn.h, mat: glow }; });
  const westOps = winOps(Wn.xs); westOps.push({ u0: V.door.x - R.x0 - V.door.w / 2, u1: V.door.x - R.x0 + V.door.w / 2, y0: 0, y1: 2.9, mat: M('#ffe2ad', 0.35, 0, '#ffbe6a', 0.5) });
  wall([R.x0, R.z0 - t / 2], [R.x1, R.z0 - t / 2], 0, H, t, ext, { openings: westOps, cutTo: CUT });
  wall([R.x1, R.z1 + t / 2], [R.x0, R.z1 + t / 2], 0, H, t, ext, { openings: winOps(Wn.xs, true), cutTo: CUT });
  wall([R.x1 + t / 2, R.z0], [R.x1 + t / 2, R.z1], 0, H, t, ext, { openings: [{ u0: 2.2, u1: 3.3, y0: 0.75, y1: 3.35, mat: glow }, { u0: 7.5, u1: 8.6, y0: 0.75, y1: 3.35, mat: glow }], cutTo: CUT });
  wall([R.x0 - t / 2, R.z1], [R.x0 - t / 2, R.z0], 0, H, t, ext, { openings: [{ u0: 2.5, u1: 3.5, y0: 1.0, y1: 2.6, mat: glow }], cutTo: CUT });
  // vita knutar och listverk
  const white = M('#efe8da', 0.8); [[R.x0, R.z0], [R.x1, R.z0], [R.x0, R.z1], [R.x1, R.z1]].forEach(([x, z]) => { const k = box(0.22, H, 0.22, white, x + Math.sign(x) * t / 2, H / 2, z + Math.sign(z) * t / 2); K.cut.push({ o: k, y0: 0, h: H, cutTo: CUT }); });
  // innerväggen mot köket med passet
  const inner = M('#3d4a3a', 0.85); wall([kit.x1, R.z0], [kit.x1, R.z1], 0, V.ceilingM, 0.16, inner, { openings: [{ u0: 2.2, u1: 3.2, y0: 0, y1: 2.2 }, { u0: 6.4, u1: 8.2, y0: 1.0, y1: 1.6 }], cutTo: CUT });
  // inne: mörkgröna väggar som en tunn panel innanför ytterväggen
  [[[R.x0 + 0.02, R.z0 + 0.02], [R.x1 - 0.02, R.z0 + 0.02]], [[R.x1 - 0.02, R.z1 - 0.02], [kit.x1, R.z1 - 0.02]]].forEach(([a, b]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const p = wall(a, b, 0, 1.0, 0.03, M('#2f3a2d', 0.8)); p.position.y = 0; });
  // kakelugnen mot norra gaveln, och soffgruppen framför
  const ku = M('#e9e2d2', 0.5); cyl(0.42, 0.48, 2.9, ku, R.x1 - 0.65, 1.45, 3.6, null, 12); cyl(0.5, 0.5, 0.12, M('#c9a227', 0.4, 0.5), R.x1 - 0.65, 2.95, 3.6, null, 12); box(0.32, 0.38, 0.06, M('#1f1d1b', 0.6, 0.4), R.x1 - 1.02, 0.55, 3.6, null, Math.PI / 2); light('#ff9a4a', 0.8, 3, R.x1 - 1.2, 0.6, 3.6);
  // ljuskronorna (tonar ut med taket, så att borden syns från 24 m)
  const ceil = [], cm = M('#f6efd8', 0.3, 0.2, '#ffd58f', 1.2); cm.transparent = true; const brass = M('#b88a3e', 0.4, 0.6); brass.transparent = true;
  [[-2.6, 0], [6.4, 0]].forEach(([x, z]) => { const c = new THREE.Group(); c.position.set(x, V.ceilingM - 1.0, z); g.add(c); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 20), brass); ring.rotation.x = Math.PI / 2; c.add(ring); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), cm); b.position.set(Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45); c.add(b); } const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), brass); st.position.y = 0.5; c.add(st); ceil.push(c); K.roofs.push(ring, st); light('#ffd09a', 1.6, 9, x, V.ceilingM - 1.1, z); });
  // taket: sadeltak i plåt, nock längs huset
  const rm = M('#3d3b38', 0.6, 0.25); rm.transparent = true; const Wr = R.z1 - R.z0 + 2 * t + 0.8, Lr = R.x1 - R.x0 + 2 * t + 0.6, tri = new THREE.Shape([new THREE.Vector2(-Wr / 2, 0), new THREE.Vector2(Wr / 2, 0), new THREE.Vector2(0, V.ridgeM - V.eaveM)]), rg = new THREE.ExtrudeGeometry(tri, { depth: Lr, bevelEnabled: false }); rg.translate(0, 0, -Lr / 2); const roof = new THREE.Mesh(rg, rm); roof.rotation.y = Math.PI / 2; roof.position.set(0, H, 0); roof.castShadow = true; g.add(roof); K.roofs.push(roof);
  const lan = M('#ffd58f', 1, 0, '#ffb040', 1.6); [V.door.x - 1.3, V.door.x + 1.3].forEach((x) => { box(0.16, 0.26, 0.16, lan, x, 2.6, R.z0 - t - 0.12); light('#ffc070', 1.0, 4, x, 2.5, R.z0 - t - 0.6); });
  K.ceil = ceil; K.groundY = -sock; K.holes = null;
  return K;
}

// ---------- glashörnet: Kärnhusets östra flygel, glasat mot sydost ----------
function buildGlass(THREE, V, o) {
  const K = venueCore(THREE), { g, M, tex, box, light, wall } = K, P = V.poly, Wp = V.outline.map((q, i) => [(q[0] + P[i][0]) / 2, (q[1] + P[i][1]) / 2]), t = 0.3, H = V.eaveM, CUT = 1.05;
  const conc = tex(128, 128, (x, w, h) => { x.fillStyle = '#9c968c'; x.fillRect(0, 0, w, h); const r = rnd(3); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},.05)`; x.fillRect(r() * w, r() * h, 2, 2); } }, [8, 8]);
  const sh = new THREE.Shape(P.map((p) => new THREE.Vector2(p[0], -p[1]))), fg = new THREE.ShapeGeometry(sh); fg.rotateX(-Math.PI / 2);
  const fl = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: conc, roughness: 0.5, metalness: 0.05 })); fl.position.y = 0.006; fl.receiveShadow = true; g.add(fl);
  const brick = M('#8c6a52', 0.85), frame = M('#2a2c2e', 0.4, 0.6), glass = new THREE.MeshStandardMaterial({ color: '#cfe0e6', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22 });
  for (let i = 0; i < Wp.length; i++) {
    const a = Wp[i], b = Wp[(i + 1) % Wp.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (V.glass.edges.includes(i)) {
      // glasväggen: profiler var 1,5 m, en bröstning på 0,1 m och dörren i södra glaset
      const grp = new THREE.Group(), th = Math.atan2(b[1] - a[1], b[0] - a[0]); grp.position.set(a[0], 0, a[1]); grp.rotation.y = -th; g.add(grp);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(L, H - 0.1, 0.03), glass); pane.position.set(L / 2, 0.1 + (H - 0.1) / 2, 0); grp.add(pane); K.cut.push({ o: pane, y0: 0.1, h: H - 0.1, cutTo: CUT, glass: true });
      const n = Math.round(L / V.glass.mullionM); for (let k = 0; k <= n; k++) { const m = box(0.08, H, 0.12, frame, k * L / n, H / 2, 0, grp); K.cut.push({ o: m, y0: 0, h: H, cutTo: CUT }); }
      [0.05, 2.6, H - 0.05].forEach((y) => { const m = box(L, 0.08, 0.12, frame, L / 2, y, 0, grp); if (y > CUT) K.cut.push({ o: m, y0: y - 0.04, h: 0.08, cutTo: CUT }); });
    } else {
      const ops = [];
      if (i === 0) for (let k = 1; k < 5; k++) ops.push({ u0: k * L / 5 - 0.6, u1: k * L / 5 + 0.6, y0: 1.0, y1: 2.6, mat: M('#ffe2ad', 0.35, 0, '#ffbe6a', 0.6) });
      wall(a, b, 0, H, t, i === 4 ? M('#5d4a3c', 0.9) : brick, { openings: ops, cutTo: CUT });
    }
  }
  // dörren i södra glaset (ytterdörr med eget ljus)
  box(V.door.w, 2.3, 0.06, M('#2a2c2e', 0.4, 0.6), V.door.x, 1.15, P[1][1] - 0.04).visible = false;
  light('#ffd09a', 1.2, 4, V.door.x, 2.6, P[1][1] - 0.9);
  // taket: platt, med en takfotslist som står kvar
  const shO = new THREE.Shape(V.outline.map((p) => new THREE.Vector2(p[0], -p[1])));
  const rm = M('#4a4846', 0.7, 0.2); rm.transparent = true; const cap = new THREE.Mesh(new THREE.ShapeGeometry(shO), rm); cap.geometry.rotateX(-Math.PI / 2); cap.position.y = H + 0.05; g.add(cap); K.roofs.push(cap);
  const rest = new THREE.Mesh(new THREE.ExtrudeGeometry(shO, { depth: 0.6, bevelEnabled: false }), rm); rest.geometry.rotateX(-Math.PI / 2); rest.position.y = H; g.add(rest); K.roofs.push(rest);
  // ljuset: ljust och svalt, pendlar över borden
  const ceil = [], pm = M('#f2efe6', 0.3, 0, '#fff2d6', 1.3); pm.transparent = true;
  [[-4, -5], [0, -5], [4, -5], [-4, -1], [0, -1], [4, -1], [4, 3.5]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.16, 12), pm); p.position.set(x, V.ceilingM - 0.6, z); g.add(p); ceil.push(p); K.roofs.push(p); });
  [[-3.5, -4.5], [3.5, -4.5], [-3.5, 1.5], [3.5, 1.5]].forEach(([x, z]) => light('#fff0d8', 1.5, 8, x, V.ceilingM - 0.7, z));
  K.ceil = ceil; K.groundY = 0; K.holes = null;
  return K;
}
