// stamningManus.js — leverans 2026-10-03 (D1): gästernas stämning som tidslinjer för teaterScen.
// Koordinater i vinbarens lokala XZ (meter), samma som handelserManus.js. Läses, monteras inte.
// beats.cam   nyckelbilder { t, v, ease, arc } som spelas exakt (inte utjämnat), så att tiden går att dra i.
// beats.spot  strålkastaren { t, at, k }. beats.sym  symbolerna { t, anchor, mood }. beats.face  ansiktena { t, who, mood }.
// beats.meter mätaren { t, v } (0..1, platshållare tills balance.ts finns). chapters som förut, med syfte.

export const GAME = { tx: 0.2, ty: 0.4, tz: 0.4, dist: 24, yaw: 0.7, pitch: 0.873, frame: 0.5 };
// Södra vinkeln från handelserManus (lounge): ansiktena på norra sidan (lounger och norra barstolar) vänder sig mot kameran.
const SOUTH = (x, z, dist, frame) => ({ tx: x, ty: 0.6, tz: z, dist, yaw: Math.PI - 0.35, pitch: 0.96, frame: frame ?? 0.62 });
const near = (x, z, dist, yaw, frame) => ({ tx: x, ty: 0.6, tz: z, dist, yaw: yaw ?? 0.44, pitch: 0.873, frame: frame ?? 0.5 });

const seated = (seat, look, hm, lk, steps) => ({ kind: 'guest', look, hm, pos: [0, 0], steps: [{ clip: 'guest.seatedIdle', until: 0.3, seat, look: lk }, ...steps] });
const idleTo = (until, lk) => ({ clip: 'guest.seatedIdle', until, look: lk });

// ---------- konsekvensögonblicket, gemensamt ----------
// A = när svaret låses. Före A står frågan (raketens kamera, strålkastaren, kortet till vänster). Efter A 3,8 s.
const A = 2.5, CQ = 3.8, END = A + CQ + 1.6;
function consequenceCam(R0, right) {
  const N = { ...R0, dist: 7, yaw: R0.yaw + (right ? 0.21 : 0), pitch: right ? 0.62 : 0.7 };
  return [
    { t: 0, v: R0 }, { t: A + (right ? 0.45 : 0.6), v: R0 },
    { t: A + (right ? 1.45 : 1.6), v: N, ease: right ? 'outCubic' : 'inOutSine' },
    // Beslut 2026-10-03: huvudena förstoras inte. Kameran går i stället in till 5,5 m under de sista 1,5 s.
    { t: A + 2.3, v: N }, { t: A + 3.8, v: { ...N, dist: 5.5, ty: 0.75 }, ease: 'inOutSine' },
    { t: A + 4.8, v: GAME, ease: 'inOutSine' }
  ];
}
const consequenceSpot = (at) => [{ t: 0, at, k: 1 }, { t: A + 3.8, at, k: 1 }, { t: A + 4.3, at, k: 0 }];
const consequenceChapters = (p, right) => [
  { t: 0, key: p + '.ask' }, { t: A, key: right ? 'cq.right' : 'cq.wrong' }, { t: A + 0.45, key: right ? 'cq.inRight' : 'cq.inWrong' },
  { t: A + 0.6, key: p + (right ? '.gestRight' : '.gestWrong') }, { t: A + 1.1, key: 'cq.symbol' }, { t: A + 1.25, key: 'cq.meter' },
  { t: A + 2.3, key: 'cq.close' }, { t: A + 3.8, key: 'cq.back' }
];
const g = (k) => A + 0.6 + k * 0.18;   // gästerna börjar en i taget, närmast händelsen först

// ---------- 1 · Födelsedagen, steg 3 (musiken) ----------
// Frågan: sällskapet i lounge A vill sjunga för Karin. Grannarna i lounge B äter.
// Rätt: Elin tar fördrinken till grannarna och bjuder in dem i skålen. Fel: Per ber DJ:n höja musiken.
export function birthday3(variant) {
  const right = variant === 'right';
  const tableY = 0.45;
  const props = {
    cake: { type: 'cake', at: [-1.8, tableY + 0.004, 3.72] },
    kg: { type: 'wineGlass', hand: ['karin', 'R'], hidden: true },
    hg: { type: 'wineGlass', hand: ['host', 'R'], hidden: true },
    tray: { type: 'tray', hand: ['elin', 'L'] },
    g1: { type: 'wineGlass', on: ['tray', -0.08, 0] }, g2: { type: 'wineGlass', on: ['tray', 0.08, 0.02] }
  };
  const glass = (id) => [{ type: 'show', prop: id, at: 'grab' }, { type: 'hide', prop: id, at: 'release' }];
  const actors = {
    host: seated('loungeA1', 'medel', 1.0, 'karin', right
      ? [idleTo(g(0), 'karin'), { clip: 'guest.cheers', look: 'karin', ev: glass('hg') }, idleTo(END, 'karin')]
      : [idleTo(g(0), 'karin'), { clip: 'guest.laugh', look: 'karin' }, { clip: 'guest.sing', until: END }]),
    karin: seated('loungeA2', 'social', 0.94, 'host', right
      ? [idleTo(g(1), 'host'), { clip: 'guest.laugh', look: 'host' }, idleTo(END, 'nb1')]
      : [idleTo(g(1), 'host'), { clip: 'guest.cheers', look: 'host', ev: glass('kg') }, idleTo(END, 'host')]),
    friend: seated('loungeA3', 'medel2', 1.02, 'karin', right
      ? [idleTo(g(2), 'karin'), { clip: 'guest.laugh', tempo: 'calm', look: 'karin' }, idleTo(END, 'karin')]
      : [idleTo(g(2), 'karin'), { clip: 'guest.sing', until: END }]),
    nb1: seated('loungeB1', 'hog', 1.05, 'nb2', right
      ? [idleTo(g(3), 'elin'), { clip: 'guest.leanCurious', look: 'karin' }, idleTo(END, 'karin')]
      : [idleTo(g(3), 'nb2'), { clip: 'guest.armsCrossed', tempo: 'stressed', until: END, look: 'karin' }]),
    nb2: seated('loungeB2', 'medel3', 0.97, 'nb1', right
      ? [idleTo(g(4), 'elin'), { clip: 'guest.nodApprove', look: 'elin' }, idleTo(END, 'karin')]
      : [idleTo(g(4), 'nb1'), { clip: 'guest.waveWaiter', tempo: 'stressed', look: 'per' }, { clip: 'guest.checkWatch', look: 'per' }, idleTo(END, 'per')]),
    b1: seated('bar1', 'student', 0.98, 'b3', [idleTo(END, 'b3')]),
    b3: seated('bar3', 'medel2', 0.95, 'b4', [{ clip: 'guest.gesture', until: END, look: 'b4' }]),
    b4: seated('bar4', 'social', 0.92, 'b3', right ? [idleTo(END, 'b3')] : [idleTo(g(5), 'b3'), { clip: 'guest.checkWatch', tempo: 'calm', look: 'dj' }, idleTo(END, 'b3')]),
    per: { kind: 'staff', look: 'hovmastare', pos: [-0.6, 3.2], yaw: 0, steps: right
      ? [{ clip: 'staff.idle', until: END, face: 0, look: 'karin' }]
      : [{ clip: 'staff.idle', until: A + 0.2, face: 0, look: 'karin' }, { clip: 'host.point', face: 2.43 }, { clip: 'staff.idle', until: END, face: 1.2, look: 'nb2' }] },
    elin: { kind: 'staff', look: 'sommelier', pos: [3.3, 1.6], yaw: 0, steps: right
      ? [{ clip: 'staff.idle', until: A + 0.3, look: 'nb1', keep: 'L' }, { clip: 'waiter.carryTray', path: [[2.0, 2.4], [2.0, 3.2]], until: A + 3 },
        { clip: 'waiter.serve', hand: 'L', face: 0, ev: [{ type: 'release', hand: 'L', prop: 'tray', at: 'release', surface: tableY, put: [2.0, 3.72] }] }, { clip: 'staff.idle', until: END, face: 0, look: 'nb2' }]
      : [{ clip: 'staff.idle', until: END, look: 'nb1', keep: 'L' }] },
    mira: { kind: 'staff', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: END, face: 0 }] },
    dj: { kind: 'staff', look: 'dj', pos: [6.15, -4.65], yaw: -Math.PI / 4, stand: 0.25, steps: right
      ? [{ clip: 'cook.station', until: END, face: -Math.PI / 4 }]
      : [{ clip: 'cook.station', until: A + 0.3, face: -Math.PI / 4 }, { clip: 'staff.listen', until: A + 0.7, face: -0.75, look: 'per' }, { clip: 'cook.station', until: END, face: -Math.PI / 4 }] }
  };
  const R0 = SOUTH(0.1, 4.0, 13, 0.69);
  const sym = [
    { t: 0, anchor: 'loungeA', mood: 'waiting' }, { t: 0, anchor: 'loungeB', mood: 'content' },
    { t: A + 1.1, anchor: 'loungeA', mood: 'delighted' }, { t: A + 1.1, anchor: 'loungeB', mood: right ? 'content' : 'displeased' },
    ...(right ? [] : [{ t: A + 1.25, anchor: 'bar4', mood: 'impatient' }])
  ];
  const face = [
    ...['host', 'karin', 'friend'].map((who, i) => ({ t: g(i), who, mood: 'delighted' })),
    ...(right ? [{ t: g(3), who: 'nb1', mood: 'content' }, { t: g(4), who: 'nb2', mood: 'content' }]
      : [{ t: g(3), who: 'nb1', mood: 'displeased' }, { t: g(4), who: 'nb2', mood: 'impatient' }, { t: g(5), who: 'b4', mood: 'waiting' }])
  ];
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, light: 'evening',
    effects: right ? [] : [{ type: 'musicUp', t: A + 0.6, at: [5.75, 1.45, -4.25] }],
    anchors: { loungeA: [-1.8, 1.75, 5.0], loungeB: [2.0, 1.75, 5.0], bar4: { actor: 'b4' } },
    beats: { cam: consequenceCam(R0, right), spot: consequenceSpot([0.1, 4.2]), sym, face, meter: [{ t: 0, v: 0.62 }, { t: A + 1.25, v: right ? 0.74 : 0.5 }], chapters: consequenceChapters('bday', right) }
  };
}

// ---------- 2 · Gästen som vinglar, steg 1 ----------
// Frågan: gästen från bar3 står och vinglar mellan baren och loungen och vill ha ett glas till.
// Rätt: Mira lutar sig fram och pratar lugnt med hen. Fel: Mira häller upp ett glas till.
export function drunk1(variant) {
  const right = variant === 'right';
  const barY = 1.15;
  const props = {
    tray: { type: 'tray', hand: ['sara', 'L'] },
    g1: { type: 'wineGlass', on: ['tray', -0.08, 0] }, g2: { type: 'wineGlass', on: ['tray', 0.08, 0.02] },
    bottle: { type: 'wineBottle', hand: ['mira', 'R'], hidden: true },
    wine: { type: 'wineGlass', at: [-0.9, barY, 1.45], hidden: true },
    plate: { type: 'plate', at: [-2.7, barY, 1.62] },
    g4: { type: 'wineGlass', at: [0, barY, 1.4] }, g2b: { type: 'wineGlass', at: [-1.8, barY, 1.4] }
  };
  const actors = {
    g: { kind: 'guest', look: 'medel2', hm: 1.04, pos: [-0.82, 2.92], yaw: Math.PI, steps: right
      ? [{ clip: 'staff.idle', until: A + 0.5, face: Math.PI, look: 'mira' }, { clip: 'guest.balance', face: Math.PI, look: 'mira' }, { clip: 'staff.idle', until: END, face: Math.PI, look: 'mira' }]
      : [{ clip: 'staff.idle', until: A + 0.4, face: Math.PI, look: 'mira' }, { clip: 'guest.gesture', seated: false, until: END, face: Math.PI, look: 'b2' }] },
    b2: seated('bar2', 'medel', 1.0, 'g', right
      ? [idleTo(g(0), 'g'), { clip: 'guest.nodApprove', look: 'mira' }, idleTo(END, 'g')]
      : [idleTo(g(0), 'g'), { clip: 'guest.armsCrossed', tempo: 'stressed', until: END, look: 'g' }]),
    b4: seated('bar4', 'social', 0.93, 'g', right
      ? [idleTo(g(1), 'g'), { clip: 'guest.leanCurious', tempo: 'calm', look: 'mira' }, idleTo(END, 'mira')]
      : [idleTo(g(1), 'g'), { clip: 'guest.checkWatch', look: 'g' }, idleTo(END, 'g')]),
    b1: seated('bar1', 'student', 0.98, 'b2', right
      ? [idleTo(g(2), 'b2'), { clip: 'guest.nodApprove', tempo: 'calm', look: 'mira' }, idleTo(END, 'b2')]
      : [idleTo(g(2), 'g'), { clip: 'guest.pushPlate', ev: [{ type: 'grab', hand: 'R', prop: 'plate', at: 'grab' }, { type: 'release', hand: 'R', prop: 'plate', at: 'release', surface: barY, put: [-2.62, 1.38] }] }, { clip: 'guest.armsCrossed', until: END, look: 'g' }]),
    la1: seated('loungeA1', 'medel3', 1.0, 'la2', right
      ? [idleTo(END, 'la2')]
      : [idleTo(g(4), 'g'), { clip: 'guest.armsCrossed', until: END, look: 'g' }]),
    la2: seated('loungeA2', 'hog', 1.05, 'la1', right
      ? [idleTo(g(3), 'g'), { clip: 'guest.leanCurious', look: 'g' }, idleTo(END, 'la1')]
      : [idleTo(g(3), 'g'), { clip: 'guest.waveWaiter', look: 'sara' }, idleTo(END, 'sara')]),
    lb1: seated('loungeB2', 'medel', 0.97, 'lb2', [idleTo(END, 'lb2')]),
    lb2: seated('loungeB3', 'social', 0.94, 'lb1', [{ clip: 'guest.gesture', until: END, look: 'lb1' }]),
    sara: { kind: 'staff', look: 'servitor', pos: [-0.1, 3.15], yaw: -Math.PI / 2, steps: right
      ? [{ clip: 'staff.idle', until: A + 0.3, face: -Math.PI / 2, look: 'g', keep: 'trayL' }, { clip: 'waiter.carryTray', path: [[-0.7, 3.5], [-1.8, 3.25]] },
        { clip: 'waiter.serve', hand: 'L', face: 0, ev: [{ type: 'release', hand: 'L', prop: 'tray', at: 'release', surface: 0.45, put: [-1.8, 3.72] }] }, { clip: 'staff.idle', until: END, face: 0, look: 'la2' }]
      : [{ clip: 'staff.idle', until: END, face: -Math.PI / 2, look: 'g', keep: 'trayL' }] },
    mira: { kind: 'staff', look: 'bartender', pos: [-0.9, 0.74], yaw: 0, steps: right
      ? [{ clip: 'staff.idle', until: A + 0.3, face: 0, look: 'g' }, { clip: 'bar.leanIn', until: END, face: 0, look: 'g' }]
      : [{ clip: 'staff.idle', until: A + 0.2, face: 0, look: 'g' }, { clip: 'bar.pour', face: 0, ev: [{ type: 'show', prop: 'bottle', at: 0 }, { type: 'show', prop: 'wine', at: 0.3 }, { type: 'hide', prop: 'bottle', at: 'end' }] }, { clip: 'staff.idle', until: END, face: 0, look: 'g' }] },
    per: { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: END, face: Math.PI / 2, look: 'g' }] },
    cook: { kind: 'staff', look: 'kock', pos: [-6.2, 3.9], yaw: -Math.PI / 2, steps: [{ clip: 'cook.station', until: END, face: -Math.PI / 2 }] }
  };
  const R0 = SOUTH(-1.4, 3.6, 12, 0.64);
  const sym = [
    { t: 0, anchor: 'bar', mood: 'waiting' }, { t: 0, anchor: 'loungeA', mood: 'waiting' },
    { t: A + 1.1, anchor: 'bar', mood: right ? 'content' : 'displeased' }, { t: A + 1.1, anchor: 'loungeA', mood: right ? 'content' : 'impatient' }
  ];
  const face = right
    ? [{ t: g(0), who: 'b2', mood: 'content' }, { t: g(1), who: 'b4', mood: 'content' }, { t: g(2), who: 'b1', mood: 'content' }, { t: g(3), who: 'la2', mood: 'content' }]
    : [{ t: g(0), who: 'b2', mood: 'displeased' }, { t: g(1), who: 'b4', mood: 'waiting' }, { t: g(2), who: 'b1', mood: 'displeased' }, { t: g(3), who: 'la2', mood: 'impatient' }, { t: g(4), who: 'la1', mood: 'displeased' }, { t: A + 0.4, who: 'g', mood: 'delighted' }];
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], light: 'evening',
    anchors: { bar: [-1.35, 2.05, 2.3], loungeA: [-1.8, 1.75, 5.0] },
    initialFaces: { g: 'content', b2: 'waiting', b4: 'waiting', b1: 'waiting', la1: 'waiting', la2: 'waiting' },
    beats: { cam: consequenceCam(R0, right), spot: consequenceSpot([-1.2, 2.9]), sym, face, meter: [{ t: 0, v: 0.55 }, { t: A + 1.25, v: right ? 0.63 : 0.42 }], chapters: consequenceChapters('drunk', right) }
  };
}

// ---------- 3 · Gesterna ----------
// Åtta gäster vid småborden och i lounge B, en gest var, i det tempo som väljs. Varje gest följs av 1,2 s vila.
export const GESTURES = [
  { clip: 'guest.laugh', seat: 'twoA1', look: 'medel', hm: 1.0, lk: 'twoA2' },
  { clip: 'guest.cheers', seat: 'twoA2', look: 'social', hm: 0.94, lk: 'twoA1', glass: true },
  { clip: 'guest.leanCurious', seat: 'twoB1', look: 'medel3', hm: 1.02, lk: 'twoB2' },
  { clip: 'guest.nodApprove', seat: 'twoB2', look: 'kappa', hm: 0.97, lk: 'twoB1' },
  { clip: 'guest.armsCrossed', seat: 'twoC1', look: 'hog', hm: 1.05, lk: 'twoC2' },
  { clip: 'guest.pushPlate', seat: 'twoC2', look: 'student', hm: 0.96, lk: 'twoC1', plate: true },
  { clip: 'guest.checkWatch', seat: 'loungeB1', look: 'rock', hm: 1.0, lk: 'mira' },
  { clip: 'guest.waveWaiter', seat: 'loungeB3', look: 'stickat', hm: 0.98, lk: 'mira' }
];
export function gestures(C, tempo) {
  const D = 26, props = {}, actors = {};
  const SEATX = { twoA1: -4.78, twoA2: -3.62, twoB1: -2.68, twoB2: -1.52, twoC1: -0.58, twoC2: 0.58 };
  GESTURES.forEach((G, i) => {
    const id = 'q' + (i + 1), steps = [{ clip: 'guest.seatedIdle', until: 0.6 + i * 0.25, seat: G.seat, look: G.lk.startsWith('two') ? 'q' + (GESTURES.findIndex((x) => x.seat === G.lk) + 1) : G.lk }];
    let t = steps[0].until;
    const len = C.CLIPS[G.clip].seconds[tempo], loop = C.CLIPS[G.clip].loop;
    if (G.glass) props['glass' + id] = { type: 'wineGlass', hand: [id, 'R'], hidden: true };
    if (G.plate) { const sx = SEATX[G.seat], dir = sx > 0 ? -1 : 1; props['plate' + id] = { type: 'plate', at: [sx + dir * 0.32, 0.735, -4.4], yaw: 0 }; G.plateAt = [sx + dir * 0.32, -4.4]; G.plateTo = [sx + dir * 0.56, -4.4]; }
    while (t < D - 0.5) {
      const ev = G.glass ? [{ type: 'show', prop: 'glass' + id, at: 'grab' }, { type: 'hide', prop: 'glass' + id, at: 'release' }]
        : G.plate ? [{ type: 'place', prop: 'plate' + id, pos: [G.plateAt[0], 0.735, G.plateAt[1]], at: 0 }, { type: 'grab', hand: 'R', prop: 'plate' + id, at: 'grab' }, { type: 'release', hand: 'R', prop: 'plate' + id, at: 'release', surface: 0.735, put: G.plateTo }] : [];
      const dur = loop ? len * 2 : len;
      steps.push({ clip: G.clip, tempo, look: steps[0].look, ...(loop ? { dur } : {}), ev });
      t += dur;
      steps.push({ clip: 'guest.seatedIdle', until: Math.min(D, t + 1.2), look: steps[0].look }); t += 1.2;
    }
    steps.push({ clip: 'guest.seatedIdle', until: D, look: steps[0].look });
    actors[id] = { kind: 'guest', look: G.look, hm: G.hm, pos: [0, 0], steps };
  });
  actors.mira = { kind: 'staff', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: D, face: 0 }] };
  actors.sara = { kind: 'staff', look: 'servitor', pos: [1.6, -3.25], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, look: 'q8' }] };
  const moodOf = (clip) => C.CLIPS[clip].mood;
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo, end: D, props, actors, effects: [], light: 'evening',
    anchors: Object.fromEntries(GESTURES.map((G, i) => ['q' + (i + 1), { actor: 'q' + (i + 1) }])),
    initialFaces: Object.fromEntries(GESTURES.map((G, i) => ['q' + (i + 1), moodOf(G.clip)])),
    beats: {
      cam: [{ t: 0, v: near(-1.6, -3.4, 12, 0.44) }],
      spot: [{ t: 0, at: null, k: 0 }],
      sym: GESTURES.map((G, i) => ({ t: 0, anchor: 'q' + (i + 1), mood: moodOf(G.clip), always: true })),
      face: [], meter: [{ t: 0, v: 0.5 }],
      chapters: GESTURES.map((G, i) => ({ t: 0, key: 'gest.' + G.clip, focus: 'q' + (i + 1), clip: G.clip }))
    }
  };
}

// ---------- 4 · Ansiktena ----------
// Lounge A från södra sidan. Kameran börjar på raketens 11 m utan ansikten, glider in till 6,5 m (tänds mellan 9 och 7 m)
// och de fem uttrycken spelas i tur och ordning, med en gest var.
export function faces() {
  const order = ['content', 'delighted', 'waiting', 'impatient', 'displeased'];
  const T0 = 5.6, STEP = 3.4, D = T0 + STEP * order.length + 0.6;
  const gestureFor = { content: ['guest.nodApprove', 'guest.leanCurious', 'guest.nodApprove'], delighted: ['guest.laugh', 'guest.laugh', 'guest.cheers'], waiting: ['guest.checkWatch', 'guest.seatedIdle', 'guest.checkWatch'], impatient: ['guest.waveWaiter', 'guest.checkWatch', 'guest.armsCrossed'], displeased: ['guest.armsCrossed', 'guest.armsCrossed', 'guest.armsCrossed'] };
  const ids = ['f1', 'f2', 'f3'], seats = ['loungeA1', 'loungeA2', 'loungeA3'], looks = [['medel', 1.0], ['social', 0.94], ['medel2', 1.02]];
  const props = { fg: { type: 'wineGlass', hand: ['f3', 'R'], hidden: true } };
  const actors = {};
  ids.forEach((id, i) => {
    const steps = [{ clip: 'guest.seatedIdle', until: T0 + i * 0.18, seat: seats[i], look: ids[(i + 1) % 3] }];
    order.forEach((m, k) => {
      const clip = gestureFor[m][i], t1 = T0 + STEP * (k + 1) + i * 0.18;
      const ev = clip === 'guest.cheers' ? [{ type: 'show', prop: 'fg', at: 'grab' }, { type: 'hide', prop: 'fg', at: 'release' }] : [];
      steps.push(clip === 'guest.armsCrossed' || clip === 'guest.seatedIdle' ? { clip, until: t1, look: 'sara' } : { clip, look: m === 'impatient' || m === 'waiting' ? 'sara' : ids[(i + 1) % 3], ev });
      steps.push({ clip: 'guest.seatedIdle', until: t1, look: ids[(i + 1) % 3] });
    });
    steps.push({ clip: 'guest.seatedIdle', until: D });
    actors[id] = { kind: 'guest', look: looks[i][0], hm: looks[i][1], pos: [0, 0], steps };
  });
  actors.sara = { kind: 'staff', look: 'servitor', pos: [1.2, 3.1], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, look: 'f2' }] };
  actors.lb1 = seated('loungeB2', 'hog', 1.05, 'lb2', [idleTo(D, 'lb2')]);
  actors.lb2 = seated('loungeB3', 'kappa', 0.96, 'lb1', [{ clip: 'guest.gesture', until: D, look: 'lb1' }]);
  const V0 = SOUTH(-1.8, 4.3, 11, 0.5), V1 = { ...SOUTH(-1.8, 4.8, 6.5, 0.5), ty: 0.8, pitch: 0.6 };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props, actors, effects: [], light: 'evening',
    anchors: { loungeA: [-1.8, 1.75, 5.0] },
    beats: {
      cam: [{ t: 0, v: V0 }, { t: 1.2, v: V0 }, { t: 5.0, v: V1, ease: 'inOutSine' }],
      spot: [{ t: 0, at: [-1.8, 4.6], k: 0.6 }],
      sym: order.map((m, k) => ({ t: T0 + STEP * k, anchor: 'loungeA', mood: m, always: true })),
      face: order.flatMap((m, k) => ids.map((who, i) => ({ t: T0 + STEP * k + i * 0.18, who, mood: m }))),
      meter: [{ t: 0, v: 0.62 }],
      chapters: [{ t: 0, key: 'face.far' }, { t: 1.2, key: 'face.in' }, ...order.map((m, k) => ({ t: T0 + STEP * k, key: 'face.' + m }))]
    }
  };
}

// ---------- 5 · Symbolerna ----------
// Hela rummet från spelets kamera, med alla fem lägen på samma gång. light: 'evening' eller 'day'.
export function symbols(light) {
  const D = 14;
  const plan = [
    ['loungeA1', 'medel', 'guest.laugh', 'delighted'], ['loungeA2', 'social', 'guest.gesture', 'delighted'], ['loungeA3', 'medel2', 'guest.lean', 'delighted'],
    ['loungeB1', 'hog', 'guest.nodApprove', 'content'], ['loungeB2', 'medel3', 'guest.seatedIdle', 'content'],
    ['twoA1', 'kappa', 'guest.checkWatch', 'waiting'], ['twoA2', 'rock', 'guest.seatedIdle', 'waiting'],
    ['twoB1', 'stickat', 'guest.waveWaiter', 'impatient'], ['twoB2', 'jacka', 'guest.checkWatch', 'impatient'],
    ['twoC1', 'student', 'guest.armsCrossed', 'displeased'], ['twoC2', 'medel', 'guest.armsCrossed', 'displeased'],
    ['bar1', 'medel3', 'guest.seatedIdle', 'content'], ['bar2', 'social', 'guest.gesture', 'content']
  ];
  const actors = {};
  plan.forEach(([seat, look, clip], i) => {
    const id = 's' + (i + 1), loop = clip === 'guest.armsCrossed' || clip === 'guest.gesture' || clip === 'guest.lean' || clip === 'guest.seatedIdle';
    const steps = [{ clip: 'guest.seatedIdle', until: 0.4 + (i % 4) * 0.5, seat }];
    if (loop) steps.push({ clip, until: D });
    else { for (let t = steps[0].until, n = 0; n < 4; n++) { steps.push({ clip, tempo: 'normal' }); steps.push({ clip: 'guest.seatedIdle', until: (t += 3.4) }); } steps.push({ clip: 'guest.seatedIdle', until: D }); }
    actors[id] = { kind: 'guest', look, hm: 0.94 + (i % 5) * 0.03, pos: [0, 0], steps };
  });
  actors.mira = { kind: 'staff', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: D, face: 0 }] };
  actors.sara = { kind: 'staff', look: 'servitor', pos: [2.6, 2.0], yaw: -Math.PI / 2, steps: [{ clip: 'waiter.carryTray', path: [[2.0, -3.2], [-1.2, -3.25]], until: 8 }, { clip: 'staff.idle', until: D, look: 's8' }] };
  actors.per = { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, face: Math.PI / 2 }] };
  const props = { tray: { type: 'tray', hand: ['sara', 'L'] } };
  return {
    set: 'winebar', roomOpts: { mood: light === 'day' ? 'tidig' : 'helg' }, tempo: 'normal', end: D, props, actors, effects: [], light,
    anchors: { loungeA: [-1.8, 1.75, 5.0], loungeB: [2.0, 1.75, 5.0], twoA: [-4.2, 1.6, -4.4], twoB: [-2.1, 1.6, -4.4], twoC: [0.0, 1.6, -4.4], bar: [-2.25, 2.05, 2.3] },
    initialFaces: Object.fromEntries(plan.map((p, i) => ['s' + (i + 1), p[3]])),
    beats: {
      cam: [{ t: 0, v: GAME }], spot: [{ t: 0, at: null, k: 0 }],
      sym: [['loungeA', 'delighted'], ['loungeB', 'content'], ['twoA', 'waiting'], ['twoB', 'impatient'], ['twoC', 'displeased'], ['bar', 'content']].map(([anchor, mood]) => ({ t: 0, anchor, mood, always: true })),
      face: [], meter: [{ t: 0, v: 0.55 }],
      chapters: [{ t: 0, key: light === 'day' ? 'sym.day' : 'sym.evening' }]
    }
  };
}

export const SCENES = [
  { id: 'bdayRight', build: (C) => birthday3('right') }, { id: 'bdayWrong', build: (C) => birthday3('wrong') },
  { id: 'drunkRight', build: (C) => drunk1('right') }, { id: 'drunkWrong', build: (C) => drunk1('wrong') },
  { id: 'gestures', build: (C, o) => gestures(C, o.tempo || 'normal') },
  { id: 'faces', build: () => faces() },
  { id: 'symEvening', build: () => symbols('evening') }, { id: 'symDay', build: () => symbols('day') }
];
