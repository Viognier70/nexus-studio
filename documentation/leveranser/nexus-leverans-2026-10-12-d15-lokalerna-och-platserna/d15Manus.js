// d15Manus.js — D15 lokalerna och platserna, tidslinjer för teaterScen. Leverans 2026-10-12.
// Platserna: Grillstugan från D13 på foodtruckens fem platser, med kvarterets gäster i kön, vid borden och på gatan.
// Lokalerna: källaren, salongen och glashörnet med möblering, personal och gäster, och kvarterets gäster på gatan.
// Allt i platsens eller lokalens ram (kvarterPlatser.js). Gästerna på gatan går på trottoarerna längs kartans gator.

import { SPOTS, VENUES, STREET_MIX, LAKE_MODES, localMap, toLocal, toWorld, pointInPoly, segDist } from './kvarterPlatser.js';
import { BUILDINGS } from './byKarta.js';
import { party, CHILD_SIDE, CHILD_AHEAD } from './d12Manus.js';
import { stuganScene } from './d13Manus.js';
import { TEMPERAMENT } from './gestureMap';

export const GAME_PITCH = 0.873;
const fb = (t, who, mood, k) => ({ t, who, mood, k: k ?? 'clear' });
const rnd = (seed) => { let s = (seed * 2654435761) >>> 0 || 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const TEMPERS = ['calm', 'lively', 'reserved'];
const LOOKS = ['medel', 'kappa', 'jacka', 'rock', 'social', 'stickat', 'medel2', 'medel3', 'hog'];
const seatedStart = (seat, until, look) => ({ clip: 'guest.seatedIdle', until, seat, ...(look ? { look } : {}) });

/** Grupperna ur kvarterets andelar, i fast ordning (största rest). */
export function pickGroups(mix, n) {
  const e = Object.entries(mix), raw = e.map(([k, v]) => [k, v * n]), out = [];
  raw.forEach(([k, v]) => { for (let i = 0; i < Math.floor(v); i++) out.push(k); });
  raw.slice().sort((a, b) => (b[1] % 1) - (a[1] % 1)).forEach(([k]) => { if (out.length < n) out.push(k); });
  const r = rnd(n * 13 + e.length); for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// ---------- gatorna: trottoarerna som gående går på ----------
function offsetRun(pts, off) {
  return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [p[0] - dz / L * off, p[1] + dx / L * off]; });
}
function resample(poly, step) { const out = [poly[0]]; let acc = 0; for (let i = 0; i < poly.length - 1; i++) { const a = poly[i], b = poly[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = step - acc; while (t <= L) { out.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); t += step; } acc = (acc + L) % step; } return out; }
/** Körbanornas trottoarer och gångvägarna inom R m, delade där de går in i ett hus, i vatten eller i det som ska hållas fritt. */
export function lanes(map, R, avoid) {
  const out = [], bad = (p) => Math.hypot(p[0], p[1]) > R || map.buildings.some((b) => pointInPoly(p, b.poly) || b.poly.some((q, i) => b.poly[i + 1] && segDist(p, q, b.poly[i + 1]) < 0.5)) || map.water.some((w) => pointInPoly(p, w.poly)) || (avoid || []).some((a) => p[0] > a[0] && p[0] < a[1] && p[1] > a[2] && p[1] < a[3]);
  map.roads.forEach((r) => {
    const ped = !r.car || r.kind === 'track', sides = ped ? [0] : [-1, 1];
    sides.forEach((s) => {
      const pts = resample(offsetRun(r.poly, s * (r.w / 2 + 0.95)), 1.0); let cur = [];
      const flush = () => { if (cur.length >= 9) out.push({ road: r.id, name: r.name, side: s, pts: cur }); cur = []; };
      pts.forEach((p) => { if (bad(p)) flush(); else cur.push(p); }); flush();
    });
  });
  return out.sort((a, b) => Math.min(...a.pts.map((p) => Math.hypot(p[0], p[1]))) - Math.min(...b.pts.map((p) => Math.hypot(p[0], p[1]))));
}
/** Gästerna på gatan: n figurer ur kvarterets andelar, i sällskap om en till tre, på trottoarerna. */
export function streetWalkers(C, map, mix, n, o) {
  o = o || {}; const D = o.D || 20, G = o.groundY || 0, r = rnd(o.seed || 3), L = lanes(map, o.R || 30, o.avoid), actors = {}, beats = [], ids = [];
  if (!L.length) return { actors, beats, ids };
  const groups = pickGroups(mix, n); let gi = 0, k = 0;
  while (gi < groups.length) {
    const grp = groups[gi], size = grp === 'family' ? 2 : grp === 'student' ? Math.min(3, groups.length - gi) : grp === 'business' || grp === 'gourmet' ? Math.min(2, groups.length - gi) : 1;
    const nl = Math.min(L.length, o.lanesMax || 4), slot = Math.floor(k / nl), lane = L[(k + (o.laneShift || 0)) % nl], N = lane.pts.length, len = Math.min(N - 1, 14 + Math.floor(r() * 12)), a0 = Math.min(Math.max(0, N - len - 1), Math.floor((slot * 0.5 + r() * 0.15) * Math.max(1, N - len))), fwd = (slot + (o.dirShift || 0)) % 2 === 0;
    let run = lane.pts.slice(a0, a0 + len + 1); if (!fwd) run = run.slice().reverse();
    const path = offsetRun(run.filter((_, i) => i % 3 === 0 || i === run.length - 1), 0.35 + (size > 1 ? 0.36 * (size - 1) : 0)), t0 = 0.3 + slot * 2.5 + r() * (o.stagger ?? 4), mem = [];
    const sp = grp === 'student' ? (r() < 0.25 ? 1.35 : 0.9) : grp === 'family' ? 0.7 : grp === 'tourist' ? 0.72 : 0.85, clip = sp > 1.2 ? 'street.walkHurried' : 'street.walkCalm';
    if (grp === 'family') {
      const pid = 'w' + k + 'p', cid = 'w' + k + 'c', p0 = path[0], p1 = path[path.length - 1], dx = p1[0] - p0[0], dz = p1[1] - p0[1], Lf = Math.hypot(dx, dz) || 1, ux = dx / Lf, uz = dz / Lf, off = (p) => [p[0] - uz * CHILD_SIDE + ux * CHILD_AHEAD, p[1] + ux * CHILD_SIDE + uz * CHILD_AHEAD];
      actors[pid] = { kind: 'guest', group: 'villager', variant: k % 2, temper: 'calm', look: 'medel2', hm: 1.0, stand: G, pos: p0, yaw: Math.atan2(ux, uz), steps: [{ clip: 'staff.idle', until: t0 }, { clip: 'street.walkWithChild', path: [p1], speed: sp }, { clip: 'staff.idle', until: D, look: cid }] };
      actors[cid] = { kind: 'guest', temper: 'lively', look: 'student', hm: 0.58, stand: G, pos: off(p0), yaw: Math.atan2(ux, uz), steps: [{ clip: 'staff.idle', until: t0 }, { clip: 'street.childWalk', path: [off(p1)], speed: sp }, { clip: 'staff.idle', until: D, look: pid }] };
      mem.push(pid, cid); beats.push(fb(0, cid, 'delighted', 'clear'));
    } else {
      for (let m = 0; m < size; m++) {
        const id = 'w' + k + String.fromCharCode(97 + m), lat = (m - (size - 1) / 2) * 0.72, back = m === 2 ? 0.6 : 0, pp = offsetRun(path, lat).map((p, i, arr) => { if (!back || i) return p; const q = arr[1] || p, dx = q[0] - p[0], dz = q[1] - p[1], L2 = Math.hypot(dx, dz) || 1; return [p[0] - dx / L2 * back, p[1] - dz / L2 * back]; });
        const mid = Math.floor(pp.length / 2), steps = [{ clip: 'staff.idle', until: t0 + m * 0.15 }];
        if (grp === 'tourist' && pp.length > 3) steps.push({ clip, path: pp.slice(1, mid + 1), speed: sp }, { clip: 'street.stopLook' }, { clip, path: pp.slice(mid + 1), speed: sp });
        else steps.push({ clip, path: pp.slice(1), speed: sp, ...(size > 1 ? { look: 'w' + k + String.fromCharCode(97 + ((m + 1) % size)) } : {}) });
        steps.push({ clip: size > 1 ? 'guest.leanTalkStand' : 'staff.idle', ...(size > 1 ? { look: 'w' + k + 'a' } : { until: D }) }); if (size > 1) steps.push({ clip: 'staff.idle', until: D, look: 'w' + k + String.fromCharCode(97 + ((m + 1) % size)) });
        actors[id] = { kind: 'guest', group: grp, variant: (k + m) % 2, temper: TEMPERS[(k + m) % 3], look: LOOKS[(k * 3 + m) % LOOKS.length], hm: 0.94 + ((k + m) % 5) * 0.025, stand: G, pos: pp[0], yaw: 0, steps };
        mem.push(id); beats.push(fb(0, id, (k + m) % 4 === 1 ? 'delighted' : 'content', 'weak'));
      }
    }
    ids.push(mem); gi += grp === 'family' ? 1 : size; k++;
  }
  Object.values(actors).forEach((a) => { const s = a.steps.find((x) => x.path); if (s) { const q = s.path[0]; a.yaw = Math.atan2(q[0] - a.pos[0], q[1] - a.pos[1]); } });
  return { actors, beats, ids };
}

// ---------- platserna ----------
const TRUCK_GAME = { tx: -0.6, ty: 0.6, tz: 1.5, dist: 24, yaw: 0.35, pitch: GAME_PITCH, frame: 0.5 };
const TRUCK_AVOID = [[-6.8, 6.8, -2.0, 4.8]];
export function spotScene(C, id, o) {
  o = o || {}; const S = SPOTS[id], F = { C: S.C, th: S.th }, map = localMap(F, 80), mode = id === 'sjon' ? LAKE_MODES[o.lake || 'summerWeekend'] : null;
  const sc = stuganScene(C, { rain: false, awning: false }), D = 22, mix = STREET_MIX[S.quarter], A = sc.actors;
  sc.end = D; sc.truck = 'B'; sc.awning = !!o.awning; sc.spot = id; sc.frame = F; sc.map = map; sc.quarter = S.quarter; sc.groundY = 0;
  sc.season = mode && mode.light === 'summer' ? 'summer' : 'autumn';
  // kön och borden får kvarterets gäster
  const qIds = Object.keys(A).filter((k) => /^q\d$/.test(k)), tIds = ['ta', 'tb', 'tc'], gq = pickGroups(mix.family ? { ...mix, villager: (mix.villager || 0) + mix.family, family: 0 } : mix, qIds.length + 3);
  [...qIds, ...tIds].forEach((k, i) => { const g = gq[i]; if (A[k] && g && g !== 'family') { A[k].group = g; A[k].variant = i % 2; } });
  if (mode) {
    const keepQ = mode.queue;
    qIds.forEach((k, i) => { if (i >= keepQ) delete A[k]; });
    if (keepQ > qIds.length) { const at = [-5.0, 2.3]; A.q5 = { kind: 'guest', temper: 'calm', group: 'villager', variant: 1, look: 'medel', hm: 0.98, pos: at, yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, face: Math.atan2(-4.1 - at[0], 2.3 - at[1]) }] }; }
    if (!mode.tables) tIds.forEach((k) => delete A[k]);
    if (keepQ < 3) { A.helper.pos = [2.4, 2.4]; A.helper.steps = [{ clip: 'staff.idle', until: D, face: 0.4 }]; }
    sc.beats.face = sc.beats.face.filter((b) => A[b.who]);
  }
  // sjöns sommarhelg: familjer vid borden, barnen bredvid
  if (mode && mode.tables > 3) { A.tk = { kind: 'guest', temper: 'lively', look: 'student', hm: 0.6, pos: [4.65, 3.6], yaw: Math.PI, steps: [{ clip: 'staff.idle', until: D, face: Math.PI, look: 'tc' }] }; A.tk2 = { kind: 'guest', temper: 'calm', group: 'tourist', variant: 1, look: 'medel', hm: 1.0, pos: [5.3, 2.9], yaw: -Math.PI / 2, steps: [{ clip: 'guest.nodFirstBiteStand', face: -Math.PI / 2 }, { clip: 'staff.idle', until: D, face: -Math.PI / 2 }] }; }
  // gatan
  const nW = mode ? mode.walkers : id === 'prastgatan' ? 10 : id === 'campus' ? 7 : 8;
  const W = streetWalkers(C, map, mix, nW, { D, seed: id.length * 7 + nW, avoid: TRUCK_AVOID, R: 30, stagger: 5, lanesMax: id === 'sjon' ? 3 : 4 });
  Object.assign(A, W.actors); sc.beats.face.push(...W.beats);
  sc.streetGroups = W.ids;
  const focus = (W.ids.find((g) => g.length > 1) || W.ids[0] || ['q0'])[0];
  const at = 9.0;
  sc.gameView = TRUCK_GAME;
  sc.beats.cam = [{ t: 0, v: TRUCK_GAME }];
  sc.beats.chapters = [
    { key: 'spot.z', game: true, at },
    { key: 'spot.10', view: { tx: -0.6, ty: 1.1, tz: 1.3, dist: 10, yaw: 0.35, pitch: GAME_PITCH, frame: 0.5 }, at },
    { key: 'spot.42', view: { ...TRUCK_GAME, dist: 42, tx: 0.4, tz: 4 }, at },
    { key: 'spot.guests', focus: 'auto', dist: 10, at: 7.5 }
  ];
  // stranden längs vattenlinjen (z ≈ 6,4–15,3 vid x −15…15), bryggan ut i vattnet
  sc.lakeside = id === 'sjon' ? { sand: [4.0, 10.4, 9.5, 2.0, 0.24], jetty: { x: 9.6, z0: 12.0, z1: 20.5, w: 1.6 }, benches: [[-3.2, 6.6, 0.1], [13.4, 10.6, -0.25]] } : null;
  return sc;
}

// ---------- lokalerna: möbleringen ----------
function T(pieces, id, x, z, w, d, sides) {
  // ett bord med stolar: sides = { n, s, e, w } antal stolar per sida
  pieces.push({ type: 'table', x, z, w, d }); const seats = [];
  const along = (cnt, len) => Array.from({ length: cnt }, (_, i) => (i - (cnt - 1) / 2) * (len / Math.max(cnt, 1)));
  (sides.n ? along(sides.n, w) : []).forEach((dx, i) => { const s = { type: 'chair', id: id + 'n' + i, x: x + dx, z: z - d / 2 - 0.3, yaw: 0, seatHeight: 0.45 }; pieces.push(s); seats.push(s.id); });
  (sides.s ? along(sides.s, w) : []).forEach((dx, i) => { const s = { type: 'chair', id: id + 's' + i, x: x + dx, z: z + d / 2 + 0.3, yaw: Math.PI, seatHeight: 0.45 }; pieces.push(s); seats.push(s.id); });
  (sides.w ? along(sides.w, d) : []).forEach((dz, i) => { const s = { type: 'chair', id: id + 'w' + i, x: x - w / 2 - 0.3, z: z + dz, yaw: Math.PI / 2, seatHeight: 0.45 }; pieces.push(s); seats.push(s.id); });
  (sides.e ? along(sides.e, d) : []).forEach((dz, i) => { const s = { type: 'chair', id: id + 'e' + i, x: x + w / 2 + 0.3, z: z + dz, yaw: -Math.PI / 2, seatHeight: 0.45 }; pieces.push(s); seats.push(s.id); });
  return seats;
}
function stools(pieces, id, pts, yaw) { return pts.map(([x, z], i) => { const s = { type: 'stool', id: id + i, x, z, yaw, seatHeight: 0.75 }; pieces.push(s); return s.id; }); }

/** Möbleringen per lokal: bitarna (teaterScen buildStudio), platserna och vad de är till. */
export function venueLayout(id) {
  const P = [], seats = {}, extra = {};
  if (id === 'kallaren') {
    // två rader långbord om 4,0 m på var sida om pelarna, fem stolar per sida; baren mot östra muren med fyra pallar
    seats.nA = T(P, 'nA', -5.2, -2.8, 4.0, 0.8, { n: 5, s: 5 }); seats.nB = T(P, 'nB', -0.4, -2.8, 4.0, 0.8, { n: 5, s: 5 });
    seats.sA = T(P, 'sA', -5.2, 2.9, 4.0, 0.8, { n: 5, s: 5 }); seats.sB = T(P, 'sB', -0.4, 2.9, 4.0, 0.8, { n: 5, s: 5 });
    P.push({ type: 'bar', x: 5.7, z: 2.3, w: 0.62, d: 3.6, h: 1.05 }); seats.bar = stools(P, 'bs', [[5.0, 0.9], [5.0, 1.8], [5.0, 2.7], [5.0, 3.6]], Math.PI / 2);
    P.push({ type: 'station', x: 6.95, z: 3.3, w: 0.7, d: 2.6 }, { type: 'sink', x: 6.95, z: 0.6, w: 0.7, d: 1.4 });
    extra.staff = { bar: [6.3, 2.3], cook: [6.3, 3.9], waiterPath: [[3.6, -1.15], [-6.9, -1.15], [-6.9, 1.25], [3.4, 1.25]] };
  }
  if (id === 'salongen') {
    // runda bord för fyra med vit duk, soffgruppen vid kakelugnen, köket bakom passet i söder
    [['t1', -6.2, -2.6], ['t2', -6.2, 2.4], ['t3', -2.6, -2.6], ['t4', -2.6, 2.4], ['t5', 1.6, 2.6], ['t6', 5.4, -2.6], ['t7', 5.4, 2.4], ['t8', 9.2, -2.6]].forEach(([k, x, z]) => { seats[k] = T(P, k, x, z, 0.95, 0.95, { n: 1, s: 1, e: 1, w: 1 }); });
    P.push({ type: 'lowTable', x: 12.0, z: 2.0, w: 1.1, d: 0.6, yaw: 0 }); seats.lounge = [['lg0', 12.0, 1.1, 0], ['lg1', 11.0, 2.0, Math.PI / 2], ['lg2', 12.0, 2.9, Math.PI]].map(([k, x, z, yaw]) => { P.push({ type: 'lounge', id: k, x, z, yaw, seatHeight: 0.38 }); return k; });
    P.push({ type: 'station', x: -13.8, z: 0, w: 0.7, d: 4.2 }, { type: 'pass', x: -9.2, z: 1.9, w: 0.6, d: 1.8 }, { type: 'sink', x: -11.6, z: 4.75, w: 2.2, d: 0.6 });
    P.push({ type: 'bar', x: 12.9, z: -4.6, w: 2.6, d: 0.55, h: 1.0 });
    extra.cloths = P.filter((p) => p.type === 'table').map((p) => [p.x, p.z]);
    extra.staff = { host: [2.4, -4.4], cook: [-12.9, 0.3], pass: [-9.9, 1.9], waiterPath: [[3.6, -0.1], [-8.0, -0.1], [-8.0, 0.2], [11.0, 0.2]] };
  }
  if (id === 'glashornet') {
    // fönsterbänkar med pallar längs glaset i söder och öster, sex bord för fyra i mitten, baren mot västra väggen, köket mot Kärnhuset
    P.push({ type: 'bar', x: -0.4, z: -8.2, w: 10.4, d: 0.4, h: 1.05 }); seats.south = stools(P, 'ss', [-5.0, -3.4, -1.8, -0.2, 1.4, 3.0, 4.6].map((x) => [x, -7.62]), Math.PI);
    P.push({ type: 'bar', x: 7.8, z: -2.4, w: 0.4, d: 8.0, h: 1.05 }); seats.east = stools(P, 'se', [-5.6, -4.0, -2.4, -0.8, 0.8].map((z) => [7.22, z]), Math.PI / 2);
    [['g1', -3.6, -4.6], ['g2', 0.4, -4.6], ['g3', 4.0, -4.4], ['g4', -3.6, -0.6], ['g5', 0.4, -0.6], ['g6', 3.8, 1.8]].forEach(([k, x, z]) => { seats[k] = T(P, k, x, z, 1.2, 0.8, { n: 2, s: 2 }); });
    P.push({ type: 'bar', x: -6.9, z: -0.6, w: 0.62, d: 4.2, h: 1.05 }, { type: 'station', x: -3.6, z: 7.6, w: 6.6, d: 0.7 }, { type: 'pass', x: -3.6, z: 5.6, w: 4.2, d: 0.6 }, { type: 'sink', x: -7.6, z: 6.2, w: 0.7, d: 1.6 });
    extra.staff = { bar: [-7.6, -0.6], cook: [-3.0, 6.9], waiterPath: [[5.8, -6.4], [-5.2, -6.4], [-5.2, -2.6], [5.6, -2.6]] };
  }
  const n = Object.values(seats).reduce((a, s) => a + s.length, 0);
  return { pieces: P, seats, seatCount: n, extra };
}
export const VENUE_SEATS = Object.fromEntries(['kallaren', 'salongen', 'glashornet'].map((k) => [k, venueLayout(k).seatCount]));

const VENUE_GUESTS = {
  kallaren: { mix: { student: 0.85, villager: 0.15 }, parties: [['nA', [0, 1, 5, 6]], ['nB', [1, 2, 6, 7, 8]], ['sA', [0, 5, 1]], ['sB', [2, 3, 7, 8]], ['bar', [1, 2]]] },
  salongen: { mix: { gourmet: 0.55, tourist: 0.45 }, parties: [['t1', [0, 1]], ['t3', [0, 1, 2]], ['t4', [2, 3]], ['t6', [0, 1, 2, 3]], ['t7', [0, 1]], ['lounge', [0, 1]]] },
  glashornet: { mix: { business: 0.7, tourist: 0.15, student: 0.15 }, parties: [['south', [1, 2]], ['south', [4]], ['east', [1, 2, 3]], ['g1', [0, 1, 2, 3]], ['g2', [0, 2]], ['g5', [0, 1, 2]], ['g6', [1, 3]]] }
};
const VENUE_YAW = { kallaren: Math.PI - 0.4, salongen: Math.PI - 0.5, glashornet: 2.36 };

export function venueExtraBuildings(V) {
  const F = { C: V.C, th: V.th };
  if (V.id === 'kallaren') { const L = [[-3.95, 5.32], [4.54, 5.32], [4.54, 7.62], [-3.95, 7.61]]; return [{ id: V.building + '-utbyggnad', kind: 'residential', poly: L.concat([L[0]]), h: { eave: 6.6, ridge: 6.6, flat: true } }]; }
  if (V.id === 'glashornet') { const b = BUILDINGS.find((x) => x.id === V.building), rest = b.poly.slice(3, 26).map((p) => toLocal(F, p)); return [{ id: V.building + '-resten', kind: 'university', poly: rest.concat([rest[0]]), h: { eave: 8.5, ridge: 8.5, flat: true } }]; }
  return [];
}

export function venueScene(C, id) {
  const V = VENUES[id], F = { C: V.C, th: V.th }, map = localMap(F, 80, [V.building]); map.buildings.push(...venueExtraBuildings(V));
  const G = id === 'kallaren' ? -V.floorY : id === 'salongen' ? -0.45 : 0, D = 20, L = venueLayout(id), VG = VENUE_GUESTS[id], actors = {}, beats = [];
  let k = 0;
  const groups = pickGroups(VG.mix, 40);
  VG.parties.forEach(([table, idx], pi) => {
    const seatIds = idx.map((i) => L.seats[table][i]).filter(Boolean), members = seatIds.map((s, j) => ({ id: 'g' + pi + j, temper: TEMPERS[(pi + j) % 3] }));
    const turns = members.length > 1 ? [{ who: 0, clip: pi % 2 ? 'guest.tellJoke' : 'guest.leanTalk' }, { who: 1, clip: 'guest.leanTalkB' }] : [];
    const Pt = members.length > 1 ? party(C, members, 0.8 + pi * 0.6, D, turns) : { steps: { [members[0].id]: [{ clip: 'guest.seatedIdle', until: D }] }, beats: [] };
    members.forEach((m, j) => { const g = groups[k % groups.length]; actors[m.id] = { kind: 'guest', temper: m.temper, autoFace: members.length < 2, group: g, variant: k % 2, look: LOOKS[k % LOOKS.length], hm: 0.94 + (k % 5) * 0.025, pos: [0, 0], steps: [seatedStart(seatIds[j], 0.8 + pi * 0.6, members[(j + 1) % members.length].id), ...(Pt.steps[m.id] || [])] }; k++; });
    beats.push(...Pt.beats);
  });
  const S = L.extra.staff, wp = S.waiterPath;
  if (S.bar) actors.bartender = { kind: 'staff', temper: 'calm', look: 'bartender', pos: S.bar, yaw: -Math.PI / 2, steps: [{ clip: 'bar.wipe', until: D, face: -Math.PI / 2 }] };
  if (S.host) actors.host = { kind: 'staff', temper: 'calm', look: 'servitor2', pos: S.host, yaw: 0, steps: [{ clip: 'staff.idle', until: D, face: 0 }] };
  actors.cook = { kind: 'staff', temper: 'calm', look: 'kock', pos: S.cook, yaw: id === 'kallaren' ? Math.PI / 2 : id === 'salongen' ? -Math.PI / 2 : 0, steps: [{ clip: 'cook.station', until: D, face: id === 'kallaren' ? Math.PI / 2 : id === 'salongen' ? -Math.PI / 2 : 0 }] };
  if (S.pass) actors.pass = { kind: 'staff', temper: 'lively', look: 'servitor', pos: S.pass, yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, face: Math.PI / 2 }] };
  actors.waiter = { kind: 'staff', temper: 'lively', look: 'servitor', pos: wp[0], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 1.0 }, { clip: 'staff.walk', path: [wp[1]] }, { clip: 'staff.listenTilt', dur: 2.4, face: id === 'kallaren' ? Math.PI : 0 }, { clip: 'staff.walk', path: [wp[2], wp[3]] }, { clip: 'staff.idle', until: D }] };
  // gatan utanför
  const R = V.room, avoid = [[R.x0 - 1.2, R.x1 + 1.2, R.z0 - (id === 'kallaren' ? 2.6 : 1.6), R.z1 + 1.2]];
  const W = streetWalkers(C, map, STREET_MIX[V.quarter], id === 'kallaren' ? 9 : 7, { D, groundY: G, seed: id.length * 11, avoid, R: 30, stagger: 4 });
  Object.assign(actors, W.actors); beats.push(...W.beats);
  const cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2, yaw = VENUE_YAW[id], game = { tx: cx, ty: 0.6, tz: cz, dist: 24, yaw, pitch: GAME_PITCH, frame: 0.5 };
  const focus = (W.ids.find((g) => g.length > 1) || W.ids[0] || ['waiter'])[0];
  return {
    set: 'studio', pieces: L.pieces, venue: id, frame: F, map, quarter: V.quarter, groundY: G, season: 'autumn', tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening',
    layout: L, gameView: game, streetGroups: W.ids,
    beats: { cam: [{ t: 0, v: game }], face: beats, chapters: [
      { key: 'venue.z', game: true, at: 8 },
      { key: 'venue.10', view: { ...game, dist: 10, ty: 0.9 }, at: 8 },
      { key: 'venue.42', view: { ...game, dist: 42, ty: G + 2 }, at: 8 },
      { key: 'venue.guests', focus: 'auto', dist: 10, at: 7.5 }
    ] }
  };
}

export const SCENES = [
  { id: 'torget', build: (C, o) => spotScene(C, 'torget', o) },
  { id: 'prastgatan', build: (C, o) => spotScene(C, 'prastgatan', o) },
  { id: 'gastgivaregarden', build: (C, o) => spotScene(C, 'gastgivaregarden', o) },
  { id: 'campus', build: (C, o) => spotScene(C, 'campus', o) },
  { id: 'sjonHost', build: (C, o) => spotScene(C, 'sjon', { ...o, lake: 'autumnWeekday' }) },
  { id: 'sjonSommar', build: (C, o) => spotScene(C, 'sjon', { ...o, lake: 'summerWeekend' }) },
  { id: 'kallaren', build: (C) => venueScene(C, 'kallaren') },
  { id: 'salongen', build: (C) => venueScene(C, 'salongen') },
  { id: 'glashornet', build: (C) => venueScene(C, 'glashornet') }
];
