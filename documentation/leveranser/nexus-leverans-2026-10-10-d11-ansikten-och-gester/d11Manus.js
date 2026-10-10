// d11Manus.js — D11 ansiktsuttryck och gester, tidslinjer för teaterScen. Leverans 2026-10-10.
// Samma format som stamningManus.js: beats.cam, beats.face, beats.sym, chapters (med focus eller t).
// Vinbaren i vinbarens lokala XZ (meter). Vagnen och gatan i en studio med vagnens ram: +x längs vagnen, +z ut från
// luckan mot torget (samma ram som D9 och D10), vagnens front på z = 0.

export const GAME = { tx: 0.2, ty: 0.4, tz: 0.4, dist: 24, yaw: 0.7, pitch: 0.873, frame: 0.5 };
const near = (x, z, dist, yaw, frame) => ({ tx: x, ty: 0.6, tz: z, dist, yaw: yaw ?? 0.7, pitch: 0.873, frame: frame ?? 0.5 });
const MOODS = ['delighted', 'content', 'waiting', 'impatient', 'displeased'];
const LOOKS_G = ['medel', 'social', 'medel2', 'medel3', 'kappa', 'hog', 'student', 'rock', 'stickat', 'jacka'];

// Upprepar en gest till slutet med vila emellan. ev(i) ger händelserna för varv i.
function repeat(C, clip, from, D, look, o) {
  o = o || {};
  const steps = [], c = C.CLIPS[clip], tempo = o.tempo || 'normal', rest = o.rest ?? 1.2, idle = o.idle || 'guest.seatedIdle';
  const len = c.loop ? c.seconds[tempo] * 2 : c.seconds[tempo];
  let t = from, i = 0;
  while (t + len < D - 0.2) {
    steps.push({ clip, tempo, look, ...(c.loop ? { dur: len } : {}), ...(o.seated != null ? { seated: o.seated } : {}), ...(o.ctx ? { ctx: o.ctx } : {}), ...(o.hand ? { hand: o.hand } : {}), ev: o.ev ? o.ev(i) : [] });
    t += len; i++;
    steps.push({ clip: idle, until: Math.min(D, t + rest), look, ...(o.idleFace != null ? { face: o.idleFace } : {}) }); t += rest;
  }
  steps.push({ clip: idle, until: D, look, ...(o.idleFace != null ? { face: o.idleFace } : {}) });
  return steps;
}
const showHide = (p) => () => [{ type: 'show', prop: p, at: 'grab' }, { type: 'hide', prop: p, at: 'release' }];

// ---------- 1 · Ansiktena på krogens nivå ----------
// Tio gäster på de platser som vänder ansiktet mest mot spelets kamera (o.seats), två per stämning. Inga gester:
// bara ansiktet, så att det går att bedöma ensamt. Kameran 24 → 14 → 9 → 7 m och tillbaka.
export function faces24(C, o) {
  const seats = Object.values(o.seats || {}), cy = Math.sin(GAME.yaw), cz = Math.cos(GAME.yaw);
  const pick = seats.map((s) => ({ s, d: Math.sin(s.yaw) * cy + Math.cos(s.yaw) * cz })).sort((a, b) => b.d - a.d).slice(0, 10).map((x) => x.s);
  pick.sort((a, b) => a.x - b.x);
  const D = 22, actors = {}, faces = {};
  pick.forEach((s, i) => {
    const id = 'f' + (i + 1), mood = MOODS[i % 5];
    actors[id] = { kind: 'guest', look: LOOKS_G[i % LOOKS_G.length], hm: 0.94 + (i % 4) * 0.03, pos: [0, 0], steps: [{ clip: 'guest.seatedIdle', until: D, seat: s.id }] };
    faces[id] = mood;
  });
  const cx = pick.reduce((a, s) => a + s.x, 0) / Math.max(1, pick.length), cz2 = pick.reduce((a, s) => a + s.z, 0) / Math.max(1, pick.length);
  const V14 = near(cx, cz2, 14), V9 = near(cx, cz2, 9), V7 = { ...near(cx, cz2, 7), ty: 0.8 };
  actors.mira = { kind: 'staff', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: D, face: 0 }] };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening', lupe: Object.keys(faces),
    anchors: Object.fromEntries(Object.keys(faces).map((id) => [id, { actor: id }])),
    initialFaces: faces,
    beats: {
      cam: [{ t: 0, v: GAME }, { t: 4, v: GAME }, { t: 5.5, v: V14, ease: 'inOutSine' }, { t: 9, v: V14 }, { t: 10.5, v: V9, ease: 'inOutSine' }, { t: 14, v: V9 }, { t: 15.5, v: V7, ease: 'inOutSine' }, { t: 19, v: V7 }, { t: 20.5, v: GAME, ease: 'inOutSine' }],
      spot: [{ t: 0, at: null, k: 0 }],
      sym: Object.entries(faces).map(([anchor, mood]) => ({ t: 0, anchor, mood, always: true })),
      face: [], meter: [{ t: 0, v: 0.5 }],
      chapters: [{ t: 0, key: 'face.24' }, { t: 5.5, key: 'face.14' }, { t: 10.5, key: 'face.9' }, { t: 15.5, key: 'face.7' }]
    }
  };
}

// ---------- 2 · Gästernas gester ----------
// De elva i beställningen, en gäst var, i den ordning de står i briefen. Varje gest följs av 1,2 s vila.
export const GUEST_GESTURES = [
  { clip: 'guest.waveStaff', seat: 'loungeB1', lk: 'sara', key: 'wave' },
  { clip: 'guest.checkWatch', seat: 'loungeB3', lk: 'sara', key: 'watch' },
  { clip: 'guest.leanTalk', seat: 'twoA1', lk: 'g4', key: 'leanTalk' },
  { clip: 'guest.laugh', seat: 'twoA2', lk: 'g3', key: 'laugh' },
  { clip: 'guest.cheers', seat: 'twoB1', lk: 'g6', key: 'cheers', glass: true },
  { clip: 'guest.smellWine', seat: 'twoB2', lk: 'g5', key: 'smell', glass: true },
  { clip: 'guest.pointMenu', seat: 'loungeA1', lk: 'per', key: 'menu', menu: true },
  { clip: 'guest.pushPlate', seat: 'twoC1', lk: 'g9', key: 'push', plate: true },
  { clip: 'guest.shrug', seat: 'twoC2', lk: 'g8', key: 'shrug' },
  { clip: 'guest.armsCrossed', seat: 'loungeA3', lk: 'g7', key: 'arms' },
  { clip: 'guest.nodFirstBite', seat: 'loungeB2', lk: 'g1', key: 'bite', cutlery: true }
];
const TWO = { twoA1: -4.78, twoA2: -3.62, twoB1: -2.68, twoB2: -1.52, twoC1: -0.58, twoC2: 0.58 };
export function guests(C, tempo) {
  const D = 26, props = {}, actors = {};
  GUEST_GESTURES.forEach((G, i) => {
    const id = 'g' + (i + 1), start = 0.6 + i * 0.22;
    let ev = null;
    if (G.glass) { props['gl' + id] = { type: 'wineGlass', hand: [id, 'R'], hidden: true }; ev = showHide('gl' + id); }
    if (G.plate) { const sx = TWO[G.seat], dir = sx > -0.01 ? -1 : 1, at = [sx + dir * 0.32, -4.4], to = [sx + dir * 0.56, -4.4]; props['pl' + id] = { type: 'plate', at: [at[0], 0.735, at[1]] }; ev = () => [{ type: 'place', prop: 'pl' + id, pos: [at[0], 0.735, at[1]], at: 0 }, { type: 'grab', hand: 'R', prop: 'pl' + id, at: 'grab' }, { type: 'release', hand: 'R', prop: 'pl' + id, at: 'release', surface: 0.735, put: to }]; }
    if (G.menu) { props['mn' + id] = { type: 'menu', hand: [id, 'R'] }; ev = () => [{ type: 'grab', hand: 'R', prop: 'mn' + id, at: 0 }, { type: 'switch', prop: 'mn' + id, to: 'L', at: 'switch' }]; }
    if (G.cutlery) { props['fk' + id] = { type: 'fork', hand: [id, 'R'] }; props['kn' + id] = { type: 'knife', hand: [id, 'L'] }; }
    const steps = [{ clip: 'guest.seatedIdle', until: start, seat: G.seat, look: G.lk }, ...repeat(C, G.clip, start, D, G.lk, { tempo, ev })];
    actors[id] = { kind: 'guest', look: LOOKS_G[i % LOOKS_G.length], hm: 0.94 + (i % 4) * 0.03, pos: [0, 0], steps };
  });
  actors.sara = { kind: 'staff', look: 'servitor', pos: [2.2, 3.4], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, look: 'g1' }] };
  actors.per = { kind: 'staff', look: 'hovmastare', pos: [-2.5, 3.05], yaw: 0, steps: [{ clip: 'staff.listenTilt', until: D, face: 0, look: 'g7' }] };
  actors.mira = { kind: 'staff', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: D, face: 0 }] };
  const moodOf = (clip) => C.CLIPS[clip].mood || 'content';
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo, end: D, props, actors, effects: [], light: 'evening',
    anchors: Object.fromEntries(GUEST_GESTURES.map((G, i) => ['g' + (i + 1), { actor: 'g' + (i + 1) }])),
    initialFaces: Object.fromEntries(GUEST_GESTURES.map((G, i) => ['g' + (i + 1), moodOf(G.clip)])),
    beats: {
      cam: [{ t: 0, v: near(-1.6, 0.2, 15, 0.7) }], spot: [{ t: 0, at: null, k: 0 }],
      sym: GUEST_GESTURES.map((G, i) => ({ t: 0, anchor: 'g' + (i + 1), mood: moodOf(G.clip), always: true })),
      face: [], meter: [{ t: 0, v: 0.5 }],
      chapters: [{ t: 0, key: 'all.game', game: true }, ...GUEST_GESTURES.map((G, i) => ({ t: 0, key: 'g.' + G.key, focus: 'g' + (i + 1), clip: G.clip }))]
    }
  };
}

// ---------- 3 · Personalen ----------
export function staff(C) {
  const D = 18, props = {
    tray: { type: 'tray', hand: ['sara', 'L'] }, tg1: { type: 'wineGlass', on: ['tray', -0.08, 0] }, tg2: { type: 'wineGlass', on: ['tray', 0.08, 0.03] },
    bottle: { type: 'wineBottle', hand: ['elin', 'R'] }, lg1: { type: 'wineGlass', at: [1.75, 0.45, 3.72] }, lg2: { type: 'wineGlass', at: [2.25, 0.45, 3.72] },
    rag: { type: 'napkin', hand: ['mira', 'R'] }
  };
  const seat = (id, s, look, lk, steps) => ({ kind: 'guest', look, hm: 0.97, pos: [0, 0], steps: [{ clip: 'guest.seatedIdle', until: 0.3, seat: s, look: lk }, ...steps] });
  const actors = {
    sara: { kind: 'staff', look: 'servitor', pos: [3.4, -3.25], yaw: -Math.PI / 2, steps: [
      { clip: 'waiter.carryTray', path: [[-2.6, -3.25]], keep: 'trayL' }, { clip: 'staff.idle', dur: 0.8, keep: 'trayL' },
      { clip: 'waiter.carryTray', path: [[3.4, -3.25]], keep: 'trayL' }, { clip: 'staff.idle', dur: 0.8, keep: 'trayL' },
      { clip: 'waiter.carryTray', path: [[-2.6, -3.25]], keep: 'trayL' }, { clip: 'staff.idle', until: D, keep: 'trayL' }] },
    elin: { kind: 'staff', look: 'sommelier', pos: [2.0, 3.05], yaw: 0, steps: repeat(C, 'somm.pour', 0.4, D, 'lb2', { idle: 'staff.idle', rest: 1.4, idleFace: 0 }).map((s) => ({ ...s, face: 0 })) },
    mira: { kind: 'staff', look: 'bartender', pos: [0.0, -3.72], yaw: Math.PI, steps: [{ clip: 'waiter.wipeTable', until: D, face: Math.PI }] },
    per: { kind: 'staff', look: 'hovmastare', pos: [-4.2, -3.55], yaw: Math.PI, steps: [
      { clip: 'staff.listenTilt', until: 7.5, face: Math.PI, look: 'ta1' },
      { clip: 'staff.walk', path: [[-2.6, -2.6], [-1.6, -2.6]], until: 9.6 },
      { clip: 'host.point', face: Math.PI, ctx: { yaw: 0.6 } }, { clip: 'staff.idle', dur: 0.6, face: Math.PI },
      { clip: 'host.point', face: Math.PI, ctx: { yaw: 0.6 } }, { clip: 'staff.idle', until: D, face: Math.PI }] },
    ta1: seat('ta1', 'twoA1', 'medel', 'per', [{ clip: 'guest.pointMenu', look: 'per', ev: [{ type: 'grab', hand: 'R', prop: 'menuA', at: 0 }, { type: 'switch', prop: 'menuA', to: 'L', at: 'switch' }] }, { clip: 'guest.leanTalk', look: 'per' }, { clip: 'guest.seatedIdle', until: D, look: 'ta2' }]),
    ta2: seat('ta2', 'twoA2', 'kappa', 'ta1', [{ clip: 'guest.seatedIdle', until: D, look: 'per' }]),
    lb2: seat('lb2', 'loungeB2', 'hog', 'elin', [{ clip: 'guest.seatedIdle', until: D, look: 'elin' }]),
    lb3: seat('lb3', 'loungeB3', 'social', 'elin', [{ clip: 'guest.seatedIdle', until: D, look: 'lb2' }])
  };
  props.menuA = { type: 'menu', hand: ['ta1', 'R'] };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props, actors, effects: [], light: 'evening',
    anchors: {}, initialFaces: { ta1: 'content', ta2: 'content', lb2: 'content', lb3: 'delighted' },
    beats: {
      cam: [{ t: 0, v: near(-0.4, 0.2, 15, 0.7) }], spot: [{ t: 0, at: null, k: 0 }], sym: [], face: [], meter: [{ t: 0, v: 0.6 }],
      chapters: [{ t: 0, key: 'all.game', game: true }, { t: 0, key: 's.tray', focus: 'sara', clip: 'waiter.carryTray' }, { t: 0, key: 's.pour', focus: 'elin', clip: 'somm.pour' }, { t: 0, key: 's.wipe', focus: 'mira', clip: 'waiter.wipeTable' }, { t: 0, key: 's.listen', focus: 'per', clip: 'staff.listenTilt', at: 3 }, { t: 0, key: 's.point', focus: 'per', clip: 'host.point', at: 10.4 }]
    }
  };
}

// ---------- vagnen och gatan: platserna i vagnens ram ----------
export const TRUCK_SET = {
  truck: { x0: -1.8, x1: 1.8, z0: -2.3, z1: 0, h: 2.45, hatch: { x0: -1.0, x1: 1.0, y0: 1.0, y1: 1.95 }, colour: '#2f5d8a' },
  ledge: { z: 0.16, y: 1.05 },
  inside: { grill: [-0.45, -0.5], helper: [0.7, -0.5] },
  hatchSpot: [-0.45, 0.62], queue: [[-1.3, 1.25], [-2.0, 1.45], [-2.7, 1.65]],
  high: { A: [2.7, 1.5], B: [3.9, 2.7], C: [1.5, 3.0] },
  sign: [-2.4, 2.4], lanes: { dog: 3.9, child: 4.6, calm: 5.4, hurry: 6.2, greet: 7.0 }
};
const T = TRUCK_SET;
function studioPieces() {
  return [
    { type: 'bar', id: 'hA', x: T.high.A[0], z: T.high.A[1], w: 0.6, d: 0.6, h: 1.05 },
    { type: 'bar', id: 'hB', x: T.high.B[0], z: T.high.B[1], w: 0.6, d: 0.6, h: 1.05 },
    { type: 'bar', id: 'hC', x: T.high.C[0], z: T.high.C[1], w: 0.6, d: 0.6, h: 1.05 }
  ];
}
const face = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]);
const stand = (look, hm, pos, yaw, steps) => ({ kind: 'guest', look, hm, pos, yaw, steps });

// ---------- 4 · Vid vagnen ----------
export function truck(C) {
  const D = 22, H = T.hatchSpot, Q = T.queue, A = T.high.A, B = T.high.B, Cc = T.high.C;
  const aW = [A[0] - 0.55, A[1]], aE = [A[0] + 0.55, A[1]], bS = [B[0], B[1] + 0.55], bW = [B[0] - 0.55, B[1]];
  const props = { tongs: { type: 'fork', hand: ['grill', 'R'] }, rag: { type: 'napkin', hand: ['nils', 'R'] } };
  const rep = (clip, start, lk, o) => repeat(C, clip, start, D, lk, { idle: 'staff.idle', seated: false, ...(o || {}) });
  const actors = {
    grill: { kind: 'staff', look: 'kock', pos: T.inside.grill, yaw: 0, stand: 0.15, steps: [{ clip: 'staff.idle', until: 3.2, face: 0, look: 'h1' }, { clip: 'staff.listenTilt', until: D, face: 0, look: 'h1' }] },
    nils: { kind: 'staff', look: 'servitor2', pos: [Cc[0], Cc[1] - 0.5], yaw: 0, steps: [{ clip: 'waiter.wipeTable', until: D, face: 0, ctx: { high: true } }] },
    h1: stand('jacka', 1.0, H, Math.PI, [{ clip: 'staff.idle', until: 0.8, face: Math.PI, look: 'grill' }, { clip: 'guest.waveStand', face: Math.PI, look: 'grill' }, ...rep('guest.leanTalkStand', 3.2, 'grill', { idleFace: Math.PI }).map((s) => ({ ...s, face: Math.PI }))]),
    q1: stand('rock', 1.02, Q[0], face(Q[0], H), rep('guest.checkWatchStand', 1.2, null, { idleFace: face(Q[0], H) }).map((s) => ({ ...s, face: face(Q[0], H) }))),
    q2: stand('stickat', 0.97, Q[1], face(Q[1], Q[0]), [{ clip: 'guest.armsCrossedStand', until: D, face: face(Q[1], Q[0]), tempo: 'stressed' }]),
    q3: stand('student', 0.95, Q[2], face(Q[2], Q[1]), rep('guest.shrugStand', 2.0, 'q2', { idleFace: face(Q[2], Q[1]), rest: 2.4 }).map((s) => ({ ...s, face: face(Q[2], Q[1]) }))),
    a1: stand('medel', 1.0, aW, Math.PI / 2, rep('guest.leanTalkStand', 0.6, 'a2', { idleFace: Math.PI / 2 }).map((s) => ({ ...s, face: Math.PI / 2 }))),
    a2: stand('social', 0.94, aE, -Math.PI / 2, rep('guest.laughStand', 2.4, 'a1', { idleFace: -Math.PI / 2, tempo: 'stressed', rest: 1.8 }).map((s) => ({ ...s, face: -Math.PI / 2 }))),
    b1: stand('kappa', 0.98, bS, Math.PI, rep('guest.nodFirstBiteStand', 0.8, null, { idleFace: Math.PI, rest: 1.6 }).map((s) => ({ ...s, face: Math.PI }))),
    b2: stand('medel3', 1.03, bW, Math.PI / 2, rep('guest.nodApproveStand', 2.6, 'b1', { idleFace: Math.PI / 2, rest: 2 }).map((s) => ({ ...s, face: Math.PI / 2 })))
  };
  const faces = { h1: 'content', q1: 'waiting', q2: 'displeased', q3: 'waiting', a1: 'content', a2: 'delighted', b1: 'content', b2: 'content' };
  return {
    set: 'studio', pieces: studioPieces(), outdoor: 'truck', tempo: 'normal', end: D, props, actors, effects: [], light: 'evening',
    anchors: Object.fromEntries(Object.keys(faces).map((id) => [id, { actor: id }])), initialFaces: faces,
    beats: {
      cam: [{ t: 0, v: { tx: 0.6, ty: 0.5, tz: 1.6, dist: 16, yaw: 0.35, pitch: 0.873, frame: 0.5 } }], spot: [{ t: 0, at: null, k: 0 }],
      sym: Object.entries(faces).map(([anchor, mood]) => ({ t: 0, anchor, mood, always: true })), face: [], meter: [{ t: 0, v: 0.55 }],
      chapters: [{ t: 0, key: 'tr.game', game: true }, { t: 0, key: 'tr.hatch', focus: 'h1', clip: 'guest.waveStand', at: 1.6 }, { t: 0, key: 'tr.listen', focus: 'grill', clip: 'staff.listenTilt', at: 6 },
        { t: 0, key: 'tr.watch', focus: 'q1', clip: 'guest.checkWatchStand', at: 2.2 }, { t: 0, key: 'tr.arms', focus: 'q2', clip: 'guest.armsCrossedStand', at: 4 }, { t: 0, key: 'tr.shrug', focus: 'q3', clip: 'guest.shrugStand', at: 3 },
        { t: 0, key: 'tr.talk', focus: 'a1', clip: 'guest.leanTalkStand', at: 2 }, { t: 0, key: 'tr.laugh', focus: 'a2', clip: 'guest.laughStand', at: 3.4 },
        { t: 0, key: 'tr.bite', focus: 'b1', clip: 'guest.nodFirstBiteStand', at: 3.4 }, { t: 0, key: 'tr.wipe', focus: 'nils', clip: 'waiter.wipeTable', at: 2 }]
    }
  };
}

// ---------- 5 · Gatan ----------
// Sex som går förbi vagnen i varsin fil. Hunden och barnets hand ritas av prototypen (follow).
export function street(C) {
  const D = 24, L = T.lanes;
  const walk = (clip, from, to, speed, x) => ({ clip, path: [to], speed, ...(x || {}) });
  const actors = {
    calm: stand('kappa', 1.0, [-10, L.calm], Math.PI / 2, [walk('street.walkCalm', null, [10, L.calm], 0.85), { clip: 'staff.idle', until: D }]),
    hurry: stand('rock', 1.04, [10, L.hurry], -Math.PI / 2, [{ clip: 'staff.idle', until: 1.0 }, walk('street.walkHurried', null, [-10, L.hurry], 1.45), { clip: 'staff.idle', until: D }]),
    parent: stand('medel2', 1.0, [-10, L.child], Math.PI / 2, [{ clip: 'staff.idle', until: 2.0 }, walk('street.walkWithChild', null, [10, L.child], 0.7, { until: 22 }), { clip: 'staff.idle', until: D }]),
    child: stand('student', 0.58, [-10, L.child + 0.5], Math.PI / 2, [{ clip: 'staff.idle', until: 2.0 }, walk('street.childWalk', null, [10, L.child + 0.5], 0.7, { until: 22 }), { clip: 'staff.idle', until: D }]),
    dogOwner: stand('stickat', 0.98, [10, L.dog], -Math.PI / 2, [{ clip: 'staff.idle', until: 0.4 }, walk('street.walkWithDog', null, [-10, L.dog], 0.9), { clip: 'staff.idle', until: D }]),
    looker: stand('jacka', 1.0, [-10, 3.25], Math.PI / 2, [{ clip: 'staff.idle', until: 0.2 }, walk('street.walkCalm', null, [T.sign[0] + 0.1, 3.25], 0.85), { clip: 'street.stopLook', face: Math.PI / 2, look: T.sign }, { clip: 'street.stopLook', face: Math.PI / 2, look: [T.truck.x0 + 1.0, 0] }, walk('street.walkCalm', null, [10, 3.25], 0.85), { clip: 'staff.idle', until: D }]),
    greetA: stand('medel', 1.0, [-9, L.greet], Math.PI / 2, [{ clip: 'staff.idle', until: 0.6 }, walk('street.walkCalm', null, [1.45, L.greet], 0.85), { clip: 'street.greet', face: Math.PI / 2, look: 'greetB' }, { clip: 'staff.idle', dur: 2.2, face: Math.PI / 2, look: 'greetB' }, walk('street.walkCalm', null, [10, L.greet + 0.3], 0.85), { clip: 'staff.idle', until: D }]),
    greetB: stand('social', 0.95, [10, L.greet], -Math.PI / 2, [{ clip: 'staff.idle', until: 0.85 }, walk('street.walkCalm', null, [3.1, L.greet], 0.85), { clip: 'staff.idle', until: 0 }, { clip: 'street.greet', face: -Math.PI / 2, look: 'greetA' }, { clip: 'staff.idle', dur: 2.2, face: -Math.PI / 2, look: 'greetA' }, walk('street.walkCalm', null, [-10, L.greet - 0.3], 0.85), { clip: 'staff.idle', until: D }]),
    grill: { kind: 'staff', look: 'kock', pos: T.inside.grill, yaw: 0, stand: 0.15, steps: [{ clip: 'staff.idle', until: D, face: 0, look: 'looker' }] }
  };
  // Hälsningen: B väntar tills A är framme. Tiden räknas när manuset byggs (A:s väg först).
  const vA = C.TEMPO.normal.walkSpeed * 0.85 * 0.85, tA = 0.6 + (1.45 + 9) / vA, vB = vA, tB = 0.85 + (10 - 3.1) / vB;
  actors.greetB.steps[2].until = Math.max(tB + 0.05, tA + 0.25);
  return {
    set: 'studio', pieces: studioPieces(), outdoor: 'street', tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening',
    follow: { dog: { actor: 'dogOwner', ahead: 0.95, side: 0.3, hand: 'R', leashM: 1.6 }, hand: { from: 'parent', to: 'child' } },
    anchors: {}, initialFaces: { calm: 'content', hurry: 'waiting', parent: 'content', child: 'delighted', dogOwner: 'content', looker: 'content', greetA: 'delighted', greetB: 'delighted' },
    beats: {
      cam: [{ t: 0, v: { tx: 0, ty: 0.5, tz: 4.2, dist: 24, yaw: 0.35, pitch: 0.873, frame: 0.5 } }], spot: [{ t: 0, at: null, k: 0 }], sym: [], face: [], meter: [{ t: 0, v: 0.55 }],
      chapters: [{ t: 0, key: 'st.game', game: true }, { t: 0, key: 'st.street42', view: { tx: 0, ty: 0.5, tz: 4.2, dist: 42, yaw: 0.35, pitch: 0.873, frame: 0.5 }, at: 9 },
        { t: 0, key: 'st.calm', focus: 'calm', clip: 'street.walkCalm', at: 9 }, { t: 0, key: 'st.hurry', focus: 'hurry', clip: 'street.walkHurried', at: 6 },
        { t: 0, key: 'st.child', focus: 'parent', clip: 'street.walkWithChild', at: 12 }, { t: 0, key: 'st.dog', focus: 'dogOwner', clip: 'street.walkWithDog', at: 8 },
        { t: 0, key: 'st.look', focus: 'looker', clip: 'street.stopLook', at: 0 }, { t: 0, key: 'st.greet', focus: 'greetA', clip: 'street.greet', at: 0 }]
    }
  };
}

// ---------- 6 · Kartan i rummet ----------
// Hela rummet i en stämning, från spelets kamera och utan symboler: så ser stämningen ut när gesterna och ansiktena
// följer gestureMap.MOOD_MAP. Gesterna väljs i tur och ordning per gäst (index), inte slumpvis.
export const MAP_PLAN = [
  ['twoA1', 'twoA2'], ['twoB1', 'twoB2'], ['twoC1', 'twoC2'], ['loungeA1', 'loungeA2', 'loungeA3'], ['loungeB1', 'loungeB2', 'loungeB3'], ['bar1', 'bar2'], ['bar5', 'bar6']
];
export function moodRoom(C, mood, mapMoods) {
  const D = 16, actors = {}, props = {}, faces = {}, list = mapMoods[mood].seated;
  let n = 0;
  MAP_PLAN.forEach((party, pi) => party.forEach((seat, k) => {
    const id = 'm' + (++n), clip = list[(pi + k) % list.length], partner = 'm' + (k === 0 ? n + 1 : n - k);
    let ev = null;
    if (clip === 'guest.cheers') { props['gl' + id] = { type: 'wineGlass', hand: [id, 'R'], hidden: true }; ev = showHide('gl' + id); }
    if (clip === 'guest.pushPlate' && TWO[seat] != null) { const sx = TWO[seat], dir = sx > -0.01 ? -1 : 1, at = [sx + dir * 0.32, -4.4]; props['pl' + id] = { type: 'plate', at: [at[0], 0.735, at[1]] }; ev = () => [{ type: 'place', prop: 'pl' + id, pos: [at[0], 0.735, at[1]], at: 0 }, { type: 'grab', hand: 'R', prop: 'pl' + id, at: 'grab' }, { type: 'release', hand: 'R', prop: 'pl' + id, at: 'release', surface: 0.735, put: [sx + dir * 0.56, -4.4] }]; }
    const use = clip === 'guest.pushPlate' && TWO[seat] == null ? 'guest.armsCrossed' : clip;
    const start = 0.4 + ((pi * 3 + k) % 7) * 0.45;
    const tempo = mood === 'content' ? 'normal' : mood === 'waiting' ? 'normal' : 'stressed';
    actors[id] = { kind: 'guest', look: LOOKS_G[(n - 1) % LOOKS_G.length], hm: 0.94 + (n % 5) * 0.03, pos: [0, 0], steps: [{ clip: 'guest.seatedIdle', until: start, seat }, ...repeat(C, use, start, D, party.length > 1 ? partner : 'sara', { tempo, ev, rest: mood === 'displeased' ? 0.6 : 2.0 })] };
    faces[id] = mood;
  }));
  actors.sara = { kind: 'staff', look: 'servitor', pos: [3.6, -3.25], yaw: -Math.PI / 2, steps: [{ clip: 'staff.walk', path: [[-2.6, -3.25]] }, { clip: 'staff.idle', until: D, look: 'm1' }] };
  actors.mira = { kind: 'staff', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: D, face: 0 }] };
  actors.per = { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, face: Math.PI / 2 }] };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props, actors, effects: [], light: 'evening',
    anchors: { twoA: [-4.2, 1.6, -4.4], twoB: [-2.1, 1.6, -4.4], twoC: [0.0, 1.6, -4.4], loungeA: [-1.8, 1.75, 5.0], loungeB: [2.0, 1.75, 5.0] },
    initialFaces: faces,
    beats: {
      cam: [{ t: 0, v: GAME }], spot: [{ t: 0, at: null, k: 0 }],
      sym: ['twoA', 'twoB', 'twoC', 'loungeA', 'loungeB'].map((anchor) => ({ t: 0, anchor, mood, always: true })), face: [], meter: [{ t: 0, v: [0.9, 0.7, 0.5, 0.3, 0.1][MOODS.indexOf(mood)] }],
      chapters: MOODS.map((m) => ({ t: 0, key: 'map.' + m, mood: m }))
    }
  };
}

export const SCENES = [
  { id: 'faces', build: (C, o) => faces24(C, o) },
  { id: 'guests', build: (C, o) => guests(C, o.tempo || 'normal') },
  { id: 'staff', build: (C) => staff(C) },
  { id: 'truck', build: (C) => truck(C) },
  { id: 'street', build: (C) => street(C) },
  { id: 'map', build: (C, o) => moodRoom(C, o.mood || 'content', o.map) }
];
