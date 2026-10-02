// vardagManus.js — vardagens koreografi i vinbaren, fem scener för teaterScen.
// Beställd 2026-10-01 efter provspelet: rörelserna kändes inte autentiska och personalen stod
// still i början. Regeln: ingen figur går omkring utan anledning. Varje kapitel har ett syfte
// (evd.why.*), och varje steg i manuset är en uppgift med ett mål i rummet.
// Koordinater i vinbarens lokala XZ (meter), samma som manus/00-gemensamt.md i leverans 3.

const PI = Math.PI;
const TY = 0.725, LY = 0.45, BY = 1.1, PASS = [-4.62, 1.1, 2.75];
const G = (look, hm, pos, steps) => ({ kind: 'guest', look, hm, pos: pos || [0, 0], steps });
const S = (look, pos, yaw, steps) => ({ kind: 'staff', look, pos, yaw, steps });
const sat = (look, hm, seat, clip, lk, until) => G(look, hm, [0, 0], [{ clip: clip || 'guest.seatedIdle', until, seat, look: lk }]);
const standAt = (look, hm, pos, face, lk, until) => G(look, hm, pos, [{ clip: 'guest.standBar', until, face, look: lk }]);
const focus = (t, x, z, dist) => ({ t, at: [x, z], dist: dist || 12 });

// Ett dukat kuvert vid småbordet x0: gaffel, kniv och glas. side 'W' = stolen i väster.
function cover(props, id, x0, side, hidden) {
  const w = side === 'W', dx = w ? -0.25 : 0.25, yaw = w ? PI / 2 : -PI / 2;
  props[id + 'f'] = { type: 'fork', at: [x0 + dx, TY, w ? -4.28 : -4.52], yaw, hidden };
  props[id + 'k'] = { type: 'knife', at: [x0 + dx, TY, w ? -4.52 : -4.28], yaw, hidden };
  props[id + 'g'] = { type: 'wineGlass', at: [x0 + (w ? -0.12 : 0.12), TY, w ? -4.6 : -4.2], hidden };
}
const showCover = (id) => [0, 1, 2].map((n, i) => ({ type: 'show', prop: id + 'fkg'[i], at: 'release', nth: n }));

// ---------- 1 · Mise en place, en kvart före öppning ----------
export function mise() {
  const END = 44;
  const props = {
    stack: { type: 'napkin', hand: ['sara', 'L'] },
    pg: { type: 'wineGlass', hand: ['mira', 'L'] }, cloth: { type: 'napkin', hand: ['mira', 'R'] },
    crate: { type: 'crate', hand: ['elin', 'R'] }
  };
  [0, 1, 2, 3].forEach((i) => { props['r' + i] = { type: 'wineGlass', at: [-1.6 + i * 0.24, BY, -1.36], hidden: true }; });
  cover(props, 'bW', -2.1, 'W', true); cover(props, 'bE', -2.1, 'E', true);
  cover(props, 'cW', 0, 'W', true); cover(props, 'cE', 0, 'E', true);
  const polish = (n, until) => [
    { clip: 'bar.polishGlass', until, face: PI },
    { clip: 'bar.setDown', hand: 'L', face: PI, ev: [{ type: 'hide', prop: 'pg', at: 'release' }, { type: 'show', prop: 'r' + n, at: 'release' }, { type: 'show', prop: 'pg', at: 'end' }] }
  ];
  const actors = {
    per: S('hovmastare', [7.4, -1.75], -PI / 2, [
      { clip: 'staff.writeBoard', until: 16, face: -PI / 2 },
      { clip: 'staff.idle', until: 17.2, face: -PI / 2, look: [6.95, -1.75] },
      { clip: 'staff.walk', path: [[6.1, -1.25], [6.1, -0.55]], until: 19.5 },
      { clip: 'host.checkBook', until: 34.5, face: PI / 2, look: [7.6, 0] },
      { clip: 'staff.walk', path: [[6.5, 0.3], [7.3, 0.45]], until: 36.5 },
      { clip: 'staff.holdDoor', until: END, face: PI / 2 }
    ]),
    mira: S('bartender', [-0.9, -0.74], PI, [...polish(0, 7.5), ...polish(1, 16), ...polish(2, 25), ...polish(3, 34), { clip: 'bar.polishGlass', until: END, face: PI }]),
    sara: S('servitor', [-4.1, 2.7], -PI / 2, [
      { clip: 'staff.idle', until: 1.2, look: 'cook' },
      { clip: 'staff.walk', keep: 'L', path: [[-4.3, 1.2], [-4.3, -1.6], [-3.3, -3.25], [-2.45, -3.85]], until: 7.2 },
      { clip: 'waiter.setTable', face: -2.6, ev: showCover('bW') },
      { clip: 'staff.walk', keep: 'L', path: [[-1.75, -3.85]], until: 12.4 },
      { clip: 'waiter.setTable', face: 2.6, ev: showCover('bE') },
      { clip: 'staff.checkTable', face: PI },
      { clip: 'staff.walk', keep: 'L', path: [[-1.1, -3.6], [-0.35, -3.85]], until: 21.6 },
      { clip: 'waiter.setTable', face: -2.6, ev: showCover('cW') },
      { clip: 'staff.walk', keep: 'L', path: [[0.35, -3.85]], until: 26.8 },
      { clip: 'waiter.setTable', face: 2.6, ev: showCover('cE') },
      { clip: 'staff.checkTable', face: PI },
      { clip: 'staff.walk', keep: 'L', path: [[-1.0, -3.25], [-4.3, -1.6], [-4.3, 1.2], [-4.1, 2.7]], until: 41 },
      { clip: 'staff.idle', until: END, face: -PI / 2, look: 'cook', keep: 'L' }
    ]),
    elin: S('sommelier', [-6.25, -1.9], PI / 2, [
      { clip: 'staff.carryCrate', tempo: 'calm', path: [[-5.3, -1.1], [-4.3, 0.62], [-3.4, 0.74], [1.3, 0.74], [1.55, -0.72]], until: 11.8 },
      { clip: 'bar.stockFridge', until: 30, face: PI / 2, ev: [{ type: 'release', prop: 'crate', at: 0.02, surface: 0, put: [1.62, -1.08] }] },
      { clip: 'staff.carryCrate', tempo: 'calm', path: [[1.3, 0.74], [-3.4, 0.74], [-4.3, 0.62], [-5.3, -1.1], [-6.25, -1.9]], until: 42, ev: [{ type: 'grab', prop: 'crate', hand: 'R', at: 0 }] },
      { clip: 'staff.idle', until: END, face: -PI / 2 }
    ]),
    cook: S('kock', [-6.2, 3.9], -PI / 2, [{ clip: 'cook.station', until: END, face: -PI / 2 }])
  };
  const effects = [{ type: 'chalk', at: [6.995, 0.8, -1.75], t0: 0.6, t1: 15.5, n: 7 }];
  const chapters = [{ t: 0, key: 'mise.board' }, { t: 7.2, key: 'mise.tables' }, { t: 11.5, key: 'mise.fridge' }, { t: 16, key: 'mise.glasses' }, { t: 19.5, key: 'mise.book' }, { t: 36.5, key: 'mise.door' }];
  const near = [focus(0, 7.0, -1.6, 11), focus(7, -2.1, -4.0, 11), focus(11.4, 1.2, -0.5, 11), focus(15.8, -1.0, -1.1, 11), focus(19.4, -0.9, -3.9, 12), focus(34.5, 7.0, 0.2, 11)];
  return { set: 'winebar', roomOpts: { mood: 'tidig' }, tempo: 'normal', end: END, props, actors, effects, beats: { chapters, near } };
}

// ---------- 2 · Värden i dörren: välkomnande, menyerna, bröd och vatten, fördrinken ----------
export function welcome() {
  const END = 58;
  const props = {
    m1: { type: 'menu', at: [6.5, BY, -0.45] }, m2: { type: 'menu', at: [6.6, BY + 0.01, -0.5] }, m3: { type: 'menu', at: [6.7, BY + 0.02, -0.55] },
    bread: { type: 'breadBasket', at: PASS, hidden: true },
    carafe: { type: 'carafe', hand: ['sara', 'L'], hidden: true },
    w1: { type: 'waterGlass', at: [1.45, LY, 3.95], fill: false }, w2: { type: 'waterGlass', at: [2.0, LY, 3.98], fill: false }, w3: { type: 'waterGlass', at: [2.55, LY, 3.95], fill: false },
    tray: { type: 'tray', at: [1.3, BY, 1.36] },
    f1: { type: 'flute', on: ['tray', -0.09, 0.03], fill: false }, f2: { type: 'flute', on: ['tray', 0.0, -0.05], fill: false }, f3: { type: 'flute', on: ['tray', 0.09, 0.03], fill: false },
    bottle: { type: 'wineBottle', hand: ['elin', 'R'], hidden: true },
    rag: { type: 'napkin', hand: ['mira', 'R'] }
  };
  const give = (who) => [{ type: 'give', prop: who === 'p3' ? 'm3' : who === 'p1' ? 'm1' : 'm2', to: [who, 'R'], at: 'give' }];
  const grabMenus = ['m1', 'm2', 'm3'].map((m) => ({ type: 'grab', prop: m, hand: 'R', at: 'grab' }));
  const aper = (f, x) => [
    { clip: 'staff.walk', keep: 'trayL', path: [[x + 0.15, 3.3]], until: null },
    { clip: 'waiter.serveAperitif', face: 0, ev: [{ type: 'grab', prop: f, hand: 'R', at: 'grab' }, { type: 'release', prop: f, hand: 'R', at: 'release', surface: LY, put: [x, 3.95] }] }
  ];
  const actors = {
    // Rummet i gång: baren, loungen A och ståbordet.
    a1: sat('student', 0.98, 'bar1', 'guest.seatedIdle', 'a2', END), a2: sat('medel', 1.03, 'bar2', 'guest.gesture', 'a1', END),
    a3: sat('medel3', 0.97, 'bar6', 'guest.seatedIdle', 'mira', END),
    la1: sat('medel2', 1.0, 'loungeA1', 'guest.gesture', 'la2', END), la2: sat('social', 0.94, 'loungeA2', 'guest.lean', 'la1', END), la3: sat('hog', 1.05, 'loungeA3', 'guest.seatedIdle', 'la2', END),
    h1: standAt('stickat', 1.0, [4.45, 2.9], PI / 2, 'h2', END), h2: standAt('medel', 0.96, [5.55, 2.9], -PI / 2, 'h1', END),
    // Sällskapet om tre.
    p1: G('kappa', 1.0, [9.8, 0.5], [
      { clip: 'guest.walk', path: [[8.3, 0.15], [7.2, 0.1]], until: 4.4 },
      { clip: 'guest.queueCalm', until: 11.9, face: -PI / 2, look: 'per' },
      { clip: 'guest.walk', path: [[5.7, 0.9], [4.2, 2.0], [3.6, 3.1], [2.95, 4.45], [2.0, 4.5]], until: 18 },
      { clip: 'guest.sitLounge', seat: 'loungeB2' },
      { clip: 'guest.seatedIdle', until: 24.9, look: 'per' },
      { clip: 'guest.readMenu', until: END, look: 'p2' }
    ]),
    p2: G('rock', 1.04, [10.2, 0.9], [
      { clip: 'guest.walk', path: [[8.5, 0.5], [7.25, 1.45]], until: 5.2 },
      { clip: 'guest.hangCoat', face: PI / 2 },
      { clip: 'guest.queueCalm', until: 12.7, face: -PI / 2, look: 'p1' },
      { clip: 'guest.walk', path: [[5.7, 1.2], [4.2, 2.1], [3.6, 3.1], [2.95, 4.45], [2.8, 4.5]], until: 18.3 },
      { clip: 'guest.sitLounge', seat: 'loungeB3' },
      { clip: 'guest.seatedIdle', until: 21.9, look: 'per' },
      { clip: 'guest.readMenu', until: END, look: 'p1' }
    ]),
    p3: G('jacka', 0.95, [10.5, 0.0], [
      { clip: 'guest.walk', path: [[8.7, -0.2], [7.6, 0.5], [7.25, 2.0]], until: 6.0 },
      { clip: 'guest.hangCoat', face: PI / 2 },
      { clip: 'guest.queueCalm', until: 13.5, face: -PI / 2, look: 'p1' },
      { clip: 'guest.walk', path: [[5.6, 1.4], [4.2, 2.2], [3.6, 3.1], [2.95, 4.45], [1.2, 4.5]], until: 20.2 },
      { clip: 'guest.sitLounge', seat: 'loungeB1' },
      { clip: 'guest.seatedIdle', until: 27.9, look: 'per' },
      { clip: 'guest.readMenu', until: END, look: 'p1' }
    ]),
    per: S('hovmastare', [6.1, -0.55], PI / 2, [
      { clip: 'host.checkBook', until: 3.0, face: PI / 2, look: 'p1' },
      { clip: 'staff.walk', path: [[6.15, 0.05], [6.3, 0.1]], until: 4.4 },
      { clip: 'host.greetDoor', face: PI / 2, look: 'p1' },
      { clip: 'staff.walk', path: [[6.6, 0.05]], until: 8.2 },
      { clip: 'host.takeMenus', face: PI, ev: grabMenus },
      { clip: 'host.point', face: -0.8 },
      { clip: 'staff.escort', path: [[5.4, 0.9], [4.1, 1.9], [3.6, 3.1], [3.35, 3.7]], until: 16.5 },
      { clip: 'staff.idle', until: 19.6, face: -PI / 2, look: 'p2', keep: 'R' },
      { clip: 'staff.walk', keep: 'R', path: [[3.15, 4.25]], until: 20.5 },
      { clip: 'host.presentMenu', face: -0.3, ev: give('p2') },
      { clip: 'staff.walk', keep: 'R', path: [[2.3, 4.25]], until: 23.6 },
      { clip: 'host.presentMenu', face: -0.3, ev: give('p1') },
      { clip: 'staff.walk', keep: 'R', path: [[1.5, 4.25]], until: 26.7 },
      { clip: 'host.presentMenu', face: -0.3, ev: give('p3') },
      { clip: 'staff.walk', path: [[0.9, 3.4], [3.6, 3.1], [5.6, 0.9], [6.1, -0.55]], until: 36 },
      { clip: 'host.checkBook', until: END, face: PI / 2, look: [7.6, 0] }
    ]),
    cook: S('kock', [-6.2, 3.9], -PI / 2, [
      { clip: 'cook.station', until: 18.6, face: -PI / 2 },
      { clip: 'staff.walk', path: [[-5.6, 3.1], [-5.2, 2.75]], until: 20 },
      { clip: 'cook.toPass', face: PI / 2, ev: [{ type: 'show', prop: 'bread', at: 'release' }] },
      { clip: 'staff.walk', path: [[-5.6, 3.3], [-6.2, 3.9]] },
      { clip: 'cook.station', until: END, face: -PI / 2 }
    ]),
    sara: S('servitor', [-4.1, 2.7], -PI / 2, [
      { clip: 'staff.idle', until: 21.6, look: 'cook' },
      { clip: 'waiter.pickUp', face: -PI / 2, ev: [{ type: 'grab', prop: 'bread', hand: 'R', at: 'grab' }, { type: 'show', prop: 'carafe', at: 0 }] },
      { clip: 'waiter.carryTwoPlates', path: [[-4.1, 3.1], [1.0, 3.1], [1.75, 3.25]], until: 28.6 },
      { clip: 'waiter.setBread', face: 0, ev: [{ type: 'release', prop: 'bread', at: 'release', surface: LY, put: [1.75, 3.72] }] },
      { clip: 'staff.walk', path: [[2.3, 3.25]], until: 31.6, ev: [{ type: 'switch', prop: 'carafe', to: 'R', at: 0 }] },
      { clip: 'waiter.pourWater', face: 0, ev: [{ type: 'fill', prop: 'w2', at: 0.3 }, { type: 'fill', prop: 'w3', at: 0.72 }] },
      { clip: 'staff.walk', path: [[1.5, 3.25]], until: 36.2 },
      { clip: 'waiter.pourWater', face: 0, ev: [{ type: 'fill', prop: 'w1', at: 0.72 }] },
      { clip: 'staff.walk', path: [[1.0, 3.1], [-4.1, 3.1], [-4.1, 2.7]], until: 46 },
      { clip: 'staff.idle', until: END, face: -PI / 2, look: 'cook' }
    ]),
    elin: S('sommelier', [1.3, 0.74], 0, [
      { clip: 'staff.idle', until: 24.4, face: 0, look: 'p1' },
      ...['f1', 'f2', 'f3'].map((f, i) => ({ clip: 'bar.pour', face: 0, ev: [...(i ? [] : [{ type: 'show', prop: 'bottle', at: 0 }]), { type: 'fill', prop: f, at: 0.55 }] })),
      { clip: 'bar.setDown', face: 0, ev: [{ type: 'release', prop: 'bottle', at: 'release', surface: BY, put: [1.0, 1.4] }] },
      { clip: 'waiter.carryTray', path: [[2.7, 1.0], [3.4, 2.4], [2.95, 3.3]], until: 37, ev: [{ type: 'grab', prop: 'tray', hand: 'L', at: 0 }] },
      ...aper('f3', 2.55).slice(1), ...aper('f2', 2.0), ...aper('f1', 1.45),
      { clip: 'waiter.carryTray', path: [[3.4, 2.4], [2.7, 1.0], [1.3, 0.74]], until: 53 },
      { clip: 'staff.idle', until: END, face: 0, look: 'p1', keep: 'trayL' }
    ]),
    mira: S('bartender', [-0.9, -0.74], PI, [
      { clip: 'bar.wipe', until: 18, face: PI },
      { clip: 'staff.walk', path: [[-1.8, -0.74]], until: 19.2, keep: 'R' },
      { clip: 'bar.leanIn', until: 26, face: PI, look: 'a3' },
      { clip: 'bar.wipe', until: END, face: PI }
    ])
  };
  // Fördrinksglasen: gångstegen mellan dem får sina tider här, så att varje servering är 2,6 s.
  let t = 37; actors.elin.steps.forEach((s) => { if (s.clip === 'waiter.serveAperitif') t += 2.6; if (s.clip === 'staff.walk' && s.until === null) { t += 0.8; s.until = t; } });
  const chapters = [{ t: 0, key: 'wel.arrive' }, { t: 4.4, key: 'wel.greet' }, { t: 5.2, key: 'wel.coats' }, { t: 8.2, key: 'wel.menus' }, { t: 11.8, key: 'wel.escort' }, { t: 20.5, key: 'wel.present' }, { t: 21.6, key: 'wel.bread' }, { t: 24.4, key: 'wel.pour' }, { t: 31.6, key: 'wel.water' }, { t: 37, key: 'wel.aperitif' }];
  const near = [focus(0, 7.4, 0.3, 11), focus(11.8, 4.6, 1.8, 13), focus(19.5, 2.1, 4.1, 11), { t: 21.6, follow: 'sara', dist: 12 }, focus(28.4, 2.0, 3.9, 11)];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], beats: { chapters, near } };
}

// ---------- 3 · Sällskap som kommer och går, i olika storlek ----------
export function parties() {
  const END = 50;
  const props = {
    ga1: { type: 'wineGlass', at: [-2.25, LY, 3.95] }, ga2: { type: 'wineGlass', at: [-1.8, LY, 3.98] }, ga3: { type: 'wineGlass', at: [-1.35, LY, 3.95] },
    sRag: { type: 'napkin', hand: ['sara', 'L'], hidden: true },
    m1: { type: 'menu', at: [6.55, BY, -0.45] }, m2: { type: 'menu', at: [6.65, BY + 0.01, -0.52] },
    sg: { type: 'wineGlass', at: [0.0, BY, 1.42], fill: false },
    mRag: { type: 'napkin', hand: ['mira', 'R'] }, mBottle: { type: 'wineBottle', hand: ['mira', 'R'], hidden: true },
    eBottle: { type: 'wineBottle', hand: ['elin', 'R'] }, dec: { type: 'decanter', hand: ['elin', 'L'], fill: false },
    bw1: { type: 'waterGlass', at: [1.45, LY, 3.95] }, bw2: { type: 'waterGlass', at: [2.0, LY, 3.98] }, bw3: { type: 'waterGlass', at: [2.55, LY, 3.95] }
  };
  const leave = (id, seat, look, hm, x, sitUntil, coat, exitPath) => G(look, hm, [0, 0], [
    { clip: 'guest.seatedIdle', until: sitUntil, seat, look: id === 'l2' ? 'l1' : 'l2' },
    { clip: 'guest.leaveLounge' },
    { clip: 'guest.walk', path: [[x, 4.5], [-0.95, 4.45], [-0.95, 3.1], [3.6, 3.1], [5.8, 1.7], coat], until: 15.5 },
    coat[1] < 1.8 || id === 'l2' ? { clip: 'guest.takeCoat', face: PI / 2 } : { clip: 'guest.queueCalm', until: 18.3, face: PI / 2, look: 'l1' },
    { clip: 'guest.walk', path: exitPath, until: 27 },
    { clip: 'staff.idle', until: END }
  ]);
  const actors = {
    // Fyra vid ståbordet, och baren.
    h1: standAt('stickat', 1.0, [4.45, 2.9], PI / 2, 'h2', END), h2: standAt('medel', 0.96, [5.55, 2.9], -PI / 2, 'h1', END),
    h3: standAt('social', 0.93, [5.0, 2.35], 0, 'h4', END), h4: standAt('hog', 1.04, [5.0, 3.45], PI, 'h3', END),
    a1: sat('student', 0.98, 'bar1', 'guest.seatedIdle', 'a2', END), a2: sat('medel', 1.03, 'bar2', 'guest.gesture', 'a1', END),
    // Sällskapet om tre i lounge B, från förra scenen. Elin dekanterar deras vin.
    p1: sat('kappa', 1.0, 'loungeB2', 'guest.gesture', 'elin', END), p2: sat('rock', 1.04, 'loungeB3', 'guest.seatedIdle', 'elin', END), p3: sat('jacka', 0.95, 'loungeB1', 'guest.lean', 'p1', END),
    // Tre som går, från lounge A. De går i den långsammastes takt och samlas vid hängaren.
    l1: leave('l1', 'loungeA1', 'medel2', 1.0, -2.6, 1.5, [7.2, 1.45], [[7.55, 0.4], [8.4, 0.1], [8.9, -1.4], [9.1, -6.5]]),
    l2: leave('l2', 'loungeA2', 'social', 0.94, -1.8, 1.8, [7.2, 2.0], [[7.6, 0.25], [8.6, -0.1], [9.2, -1.6], [9.5, -6.5]]),
    l3: leave('l3', 'loungeA3', 'hog', 1.05, -1.0, 2.1, [6.9, 1.75], [[7.5, 0.1], [8.2, -0.3], [8.7, -1.8], [8.8, -6.5]]),
    // En som kommer ensam och går till baren.
    s1: G('rock', 1.02, [10.2, -1.0], [
      { clip: 'guest.walk', path: [[8.4, -0.2], [7.25, 0.05]], until: 5.6 },
      { clip: 'guest.queueCalm', until: 9.4, face: -PI / 2, look: 'per' },
      { clip: 'guest.walk', path: [[5.6, 1.0], [3.9, 2.3], [3.6, 3.1], [-0.3, 3.1], [-0.3, 2.72]], until: 16.6 },
      { clip: 'guest.sitStool', seat: 'bar4', side: 1 },
      { clip: 'guest.seatedIdle', until: END, look: 'mira' }
    ]),
    // Två som kommer, väntar medan de tre går, och får lounge A.
    c1: G('kappa', 0.97, [10.0, 2.5], [
      { clip: 'guest.queueCalm', until: 10.2, face: -2.4, look: 'c2' },
      { clip: 'guest.walk', path: [[8.6, 0.9], [7.0, 0.5]], until: 14.2 },
      { clip: 'guest.queueCalm', until: 25.6, face: -PI / 2, look: 'c2' },
      { clip: 'guest.walk', path: [[5.6, 1.1], [4.1, 2.1], [3.6, 3.1], [-0.95, 3.1], [-0.95, 4.45], [-1.8, 4.5]], until: 34.5 },
      { clip: 'guest.sitLounge', seat: 'loungeA2' },
      { clip: 'guest.seatedIdle', until: 41.4, look: 'per' },
      { clip: 'guest.readMenu', until: END, look: 'c2' }
    ]),
    c2: G('stickat', 1.03, [10.4, 2.2], [
      { clip: 'guest.queueCalm', until: 10.2, face: -2.4, look: 'c1' },
      { clip: 'guest.walk', path: [[8.9, 0.9], [7.05, 0.0]], until: 14.6 },
      { clip: 'guest.queueCalm', until: 26.0, face: -PI / 2, look: 'c1' },
      { clip: 'guest.walk', path: [[5.7, 0.8], [4.2, 1.9], [3.6, 3.05], [-0.9, 3.05], [-0.9, 4.45], [-1.0, 4.5]], until: 33.8 },
      { clip: 'guest.sitLounge', seat: 'loungeA3' },
      { clip: 'guest.seatedIdle', until: 38.4, look: 'per' },
      { clip: 'guest.readMenu', until: END, look: 'c1' }
    ]),
    per: S('hovmastare', [6.1, -0.55], PI / 2, [
      { clip: 'host.checkBook', until: 4.4, face: PI / 2, look: 's1' },
      { clip: 'staff.walk', path: [[6.2, 0.05], [6.4, 0.05]], until: 5.6 },
      { clip: 'host.greetDoor', face: PI / 2, look: 's1' },
      { clip: 'host.point', face: -1.4 },
      { clip: 'staff.walk', path: [[6.1, -0.55]], until: 11.4 },
      { clip: 'host.checkBook', until: 13.4, face: PI / 2, look: 'c1' },
      { clip: 'staff.walk', path: [[6.2, 0.2], [6.3, 0.25]], until: 14.4 },
      { clip: 'host.greetDoor', face: PI / 2, look: 'c1' },
      { clip: 'staff.walk', path: [[7.05, -0.1], [7.35, -0.5]], until: 18.3 },
      { clip: 'staff.holdDoor', until: 23, face: -PI / 2, look: 'l1' },
      { clip: 'staff.walk', path: [[6.6, 0.0]], until: 23.9 },
      { clip: 'host.takeMenus', face: PI, ev: ['m1', 'm2'].map((m) => ({ type: 'grab', prop: m, hand: 'R', at: 'grab' })) },
      { clip: 'host.point', face: -1.2 },
      { clip: 'staff.escort', path: [[5.4, 1.0], [4.0, 2.2], [3.6, 3.1], [-0.4, 3.15], [-0.6, 3.4]], until: 33.2 },
      { clip: 'staff.idle', until: 36.4, face: -0.6, look: 'c1', keep: 'R' },
      { clip: 'staff.walk', keep: 'R', path: [[-0.75, 4.25]], until: 37.2 },
      { clip: 'host.presentMenu', face: -0.3, ev: [{ type: 'give', prop: 'm2', to: ['c2', 'R'], at: 'give' }] },
      { clip: 'staff.walk', keep: 'R', path: [[-1.55, 4.25]], until: 40.2 },
      { clip: 'host.presentMenu', face: -0.3, ev: [{ type: 'give', prop: 'm1', to: ['c1', 'R'], at: 'give' }] },
      { clip: 'staff.walk', path: [[-0.6, 3.3], [3.6, 3.1], [5.6, 0.9], [6.1, -0.55]], until: END }
    ]),
    sara: S('servitor', [-4.1, 2.7], -PI / 2, [
      { clip: 'staff.idle', until: 4.8, look: 'l1' },
      { clip: 'staff.walk', path: [[-3.6, 3.15], [-2.25, 3.25]], until: 8.2 },
      { clip: 'waiter.clear', face: 0, ev: [{ type: 'grab', prop: 'ga1', hand: 'R', at: 'grab' }, { type: 'hide', prop: 'ga2', at: 'stack' }, { type: 'hide', prop: 'ga3', at: 'stack' }] },
      { clip: 'waiter.carryPlate', path: [[-3.6, 3.15], [-4.15, 2.75]], until: 14 },
      { clip: 'bar.setDown', face: -PI / 2, ev: [{ type: 'release', prop: 'ga1', at: 'release', surface: 1.1, put: [-4.6, 2.6] }] },
      { clip: 'staff.walk', path: [[-3.2, 3.15], [-1.8, 3.25]], until: 18, ev: [{ type: 'show', prop: 'sRag', at: 0 }, { type: 'switch', prop: 'sRag', to: 'R', at: 0 }] },
      { clip: 'staff.wipeTable', until: 21.5, face: 0 },
      { clip: 'staff.checkTable', face: 0, ev: [{ type: 'hide', prop: 'sRag', at: 0 }] },
      { clip: 'staff.walk', path: [[-3.2, 3.15], [-4.1, 2.7]], until: 28 },
      { clip: 'staff.idle', until: END, face: -PI / 2, look: 'cook' }
    ]),
    mira: S('bartender', [-0.9, 0.74], 0, [
      { clip: 'bar.wipe', until: 17, face: 0 },
      { clip: 'staff.walk', path: [[0.0, 0.74]], until: 18, keep: 'R' },
      { clip: 'bar.leanIn', until: 24, face: 0, look: 's1' },
      { clip: 'bar.pour', face: 0, ev: [{ type: 'hide', prop: 'mRag', at: 0 }, { type: 'show', prop: 'mBottle', at: 0 }, { type: 'fill', prop: 'sg', at: 0.55 }] },
      { clip: 'bar.wipe', until: END, face: 0, ev: [{ type: 'hide', prop: 'mBottle', at: 0 }, { type: 'show', prop: 'mRag', at: 0 }] }
    ]),
    elin: S('sommelier', [1.3, 0.74], 0, [
      { clip: 'staff.idle', until: 6, face: 0, look: 'p2' },
      { clip: 'staff.walk', path: [[2.7, 1.0], [3.4, 2.4], [2.6, 3.25]], until: 10 },
      { clip: 'somm.present', face: 0, look: 'p1' },
      { clip: 'somm.decant', face: 0, tempo: 'calm', ev: [{ type: 'fill', prop: 'dec', at: 0.5 }] },
      { clip: 'bar.setDown', hand: 'L', face: 0, ev: [{ type: 'release', prop: 'dec', hand: 'L', at: 'release', surface: LY, put: [2.3, 3.72] }] },
      { clip: 'staff.idle', until: 24.2, face: 0, look: 'p1' },
      { clip: 'staff.walk', path: [[3.4, 2.4], [2.7, 1.0], [1.3, 0.74]], until: 29 },
      { clip: 'staff.idle', until: END, face: 0, look: 'p2' }
    ]),
    cook: S('kock', [-6.2, 3.9], -PI / 2, [{ clip: 'cook.station', until: END, face: -PI / 2 }])
  };
  const chapters = [{ t: 0, key: 'par.solo' }, { t: 4.8, key: 'par.leave' }, { t: 8.2, key: 'par.clear' }, { t: 10, key: 'par.decant' }, { t: 14.4, key: 'par.wait' }, { t: 15.5, key: 'par.coats' }, { t: 18, key: 'par.wipe' }, { t: 24, key: 'par.seat' }];
  const near = [focus(0, 7.2, 0.0, 11), focus(4.4, -1.6, 4.0, 12), focus(9.8, 2.2, 3.9, 11), focus(14.2, 7.1, 0.7, 11), { t: 24, follow: 'per', dist: 13 }, focus(33.5, -1.4, 4.1, 11)];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], beats: { chapters, near } };
}

// ---------- 4 · Personalens små stunder mellan uppgifterna ----------
export function moments() {
  const END = 38;
  const props = {
    gA: { type: 'wineGlass', hand: ['mira', 'R'] }, mRag: { type: 'napkin', hand: ['mira', 'R'], hidden: true },
    carafe: { type: 'carafe', hand: ['elin', 'R'] }, eGlass: { type: 'wineGlass', hand: ['elin', 'L'], hidden: true }, eCloth: { type: 'napkin', hand: ['elin', 'R'], hidden: true },
    bw1: { type: 'waterGlass', at: [1.45, LY, 3.95] }, bw2: { type: 'waterGlass', at: [2.0, LY, 3.98], fill: false }, bw3: { type: 'waterGlass', at: [2.55, LY, 3.95], fill: false },
    plate: { type: 'plate', at: PASS, hidden: true }
  };
  cover(props, 'cW', 0, 'W', false); cover(props, 'cE', 0, 'E', false);
  props.cWg.at = [-0.05, TY, -4.66];
  const actors = {
    a1: sat('student', 0.98, 'bar1', 'guest.seatedIdle', 'a2', END), a2: sat('medel', 1.03, 'bar2', 'guest.gesture', 'mira', END),
    s1: sat('rock', 1.02, 'bar4', 'guest.seatedIdle', 'mira', END), a6: sat('medel3', 0.97, 'bar6', 'guest.seatedIdle', 'a7', END), a7: sat('jacka', 1.0, 'bar7', 'guest.gesture', 'a6', END),
    c1: sat('kappa', 0.97, 'loungeA2', 'guest.gesture', 'c2', END), c2: sat('stickat', 1.03, 'loungeA3', 'guest.lean', 'c1', END),
    p1: sat('kappa', 1.0, 'loungeB2', 'guest.gesture', 'p2', END), p2: sat('rock', 1.04, 'loungeB3', 'guest.seatedIdle', 'p1', END), p3: sat('jacka', 0.95, 'loungeB1', 'guest.lean', 'p1', END),
    h1: standAt('medel2', 1.0, [4.45, 2.9], PI / 2, 'h2', END), h2: standAt('social', 0.94, [5.55, 2.9], -PI / 2, 'h1', END),
    // Två som byter några ord över disken medan glaset står klart.
    mira: S('bartender', [-0.9, 0.74], 0, [
      { clip: 'staff.walk', path: [[-3.2, 0.74]], until: 2.8 },
      { clip: 'bar.setDown', face: 0, ev: [{ type: 'release', prop: 'gA', at: 'release', surface: BY, put: [-3.3, 1.4] }] },
      { clip: 'staff.chat', until: 10.4, face: 0, look: 'sara' },
      { clip: 'bar.wipe', until: 18, face: 0, ev: [{ type: 'show', prop: 'mRag', at: 0 }] },
      { clip: 'staff.walk', path: [[-0.9, 0.74]], until: 20.2, keep: 'R' },
      { clip: 'bar.leanIn', until: END, face: 0, look: 'a2' }
    ]),
    sara: S('servitor', [-4.1, 2.7], -PI / 2, [
      { clip: 'staff.walk', path: [[-3.45, 2.05]], until: 1.1 },
      { clip: 'staff.idle', until: 3.6, face: PI, look: 'mira' },
      { clip: 'staff.chat', until: 10.4, face: PI, look: 'mira' },
      { clip: 'waiter.pickUp', face: PI, ev: [{ type: 'grab', prop: 'gA', hand: 'R', at: 'grab' }] },
      { clip: 'waiter.carryPlate', path: [[-2.6, 3.1], [-1.75, 3.25]], until: 14 },
      { clip: 'waiter.serve', face: 0, ev: [{ type: 'release', prop: 'gA', at: 'release', surface: LY, put: [-1.75, 3.95] }] },
      { clip: 'staff.walk', path: [[-3.6, 3.15], [-4.1, 2.75]], until: 20.5 },
      { clip: 'staff.idle', until: 25, face: -PI / 2, look: 'cook' },
      { clip: 'waiter.pickUp', face: -PI / 2, ev: [{ type: 'grab', prop: 'plate', hand: 'R', at: 'grab' }] },
      { clip: 'waiter.carryPlate', path: [[-4.1, 3.1], [1.0, 3.1], [2.0, 3.25]], until: 32 },
      { clip: 'waiter.serve', face: 0, ev: [{ type: 'release', prop: 'plate', at: 'release', surface: LY, put: [2.0, 3.72] }] },
      { clip: 'staff.idle', until: END, face: 0, look: 'p2' }
    ]),
    // En som kontrollerar ett bord: småbordet som väntar på nästa sällskap.
    per: S('hovmastare', [6.1, -0.55], PI / 2, [
      { clip: 'host.checkBook', until: 6, face: PI / 2, look: [7.6, 0] },
      { clip: 'staff.walk', path: [[5.0, -2.0], [3.6, -3.25], [0.4, -3.3], [-0.35, -3.85]], until: 13.5 },
      { clip: 'staff.checkTable', face: -2.6 },
      { clip: 'staff.walk', path: [[0.35, -3.85]], until: 17.4 },
      { clip: 'staff.checkTable', face: 2.6 },
      { clip: 'staff.walk', path: [[0.45, -3.25], [3.6, -3.25], [5.0, -2.0], [6.1, -0.55]], until: 29 },
      { clip: 'host.checkBook', until: END, face: PI / 2, look: [7.6, 0] }
    ]),
    // Vatten till lounge B innan de hinner be om det, och sedan glasen.
    elin: S('sommelier', [1.3, 0.74], 0, [
      { clip: 'staff.walk', path: [[2.7, 1.0], [3.4, 2.4], [2.4, 3.25]], until: 6 },
      { clip: 'waiter.pourWater', face: 0, ev: [{ type: 'fill', prop: 'bw3', at: 0.3 }, { type: 'fill', prop: 'bw2', at: 0.72 }] },
      { clip: 'staff.walk', path: [[3.4, 2.4], [2.7, 1.0], [1.3, 0.74]], until: 13.5 },
      { clip: 'bar.setDown', face: 0, ev: [{ type: 'release', prop: 'carafe', at: 'release', surface: BY, put: [1.0, 1.4] }] },
      { clip: 'bar.polishGlass', until: END, face: 0, ev: [{ type: 'show', prop: 'eGlass', at: 0 }, { type: 'show', prop: 'eCloth', at: 0 }] }
    ]),
    cook: S('kock', [-6.2, 3.9], -PI / 2, [
      { clip: 'cook.station', until: 22.4, face: -PI / 2 },
      { clip: 'staff.walk', path: [[-5.6, 3.1], [-5.2, 2.75]], until: 23.6 },
      { clip: 'cook.toPass', face: PI / 2, ev: [{ type: 'show', prop: 'plate', at: 'release' }] },
      { clip: 'staff.walk', path: [[-5.6, 3.3], [-6.2, 3.9]] },
      { clip: 'cook.station', until: END, face: -PI / 2 }
    ])
  };
  const chapters = [{ t: 0, key: 'mom.chat' }, { t: 6, key: 'mom.water' }, { t: 10.4, key: 'mom.wipe' }, { t: 13.5, key: 'mom.check' }, { t: 22.4, key: 'mom.plate' }];
  const near = [focus(0, -3.3, 1.6, 10), focus(10.4, -1.6, 2.4, 12), focus(12.8, 0.0, -3.9, 11), focus(21.5, -4.0, 2.8, 11), { t: 25.2, follow: 'sara', dist: 12 }];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], beats: { chapters, near } };
}

// ---------- 5 · Kön vid dörren: lugn, otålig och på väg att gå ----------
export function queue() {
  const END = 48;
  const props = { m1: { type: 'menu', at: [6.55, BY, -0.45] }, m2: { type: 'menu', at: [6.65, BY + 0.01, -0.52] }, tg1: { type: 'wineGlass', at: [-2.35, TY, -4.5] }, tg2: { type: 'wineGlass', at: [-1.85, TY, -4.3] }, sRag: { type: 'napkin', hand: ['sara', 'L'], hidden: true } };
  cover(props, 'bW', -2.1, 'W', false); cover(props, 'bE', -2.1, 'E', false);
  const Q = (look, hm, pos, steps) => G(look, hm, pos, steps);
  const actors = {
    // Fullt hus.
    a1: sat('student', 0.98, 'bar1', 'guest.seatedIdle', 'a2', END), a2: sat('medel', 1.03, 'bar2', 'guest.gesture', 'a1', END), a3: sat('medel2', 0.96, 'bar3', 'guest.lean', 'a4', END),
    a4: sat('rock', 1.02, 'bar4', 'guest.seatedIdle', 'a3', END), a6: sat('medel3', 0.97, 'bar6', 'guest.seatedIdle', 'a7', END), a7: sat('jacka', 1.0, 'bar7', 'guest.gesture', 'a6', END),
    la1: sat('hog', 1.05, 'loungeA1', 'guest.gesture', 'la2', END), la2: sat('kappa', 0.97, 'loungeA2', 'guest.lean', 'la1', END), la3: sat('stickat', 1.03, 'loungeA3', 'guest.seatedIdle', 'la2', END),
    lb1: sat('social', 0.94, 'loungeB1', 'guest.gesture', 'lb2', END), lb2: sat('medel', 1.0, 'loungeB2', 'guest.seatedIdle', 'lb1', END),
    ta1: sat('medel2', 1.0, 'twoA1', 'guest.gesture', 'ta2', END), ta2: sat('student', 0.96, 'twoA2', 'guest.seatedIdle', 'ta1', END), tc1: sat('hog', 1.04, 'twoC1', 'guest.seatedIdle', 'per', END),
    h1: standAt('jacka', 0.98, [4.45, 2.9], PI / 2, 'h2', END), h2: standAt('kappa', 1.0, [5.55, 2.9], -PI / 2, 'h1', END),
    // Paret vid småbord B betalar och går. Bordet blir ledigt.
    tb1: G('medel3', 1.0, [0, 0], [{ clip: 'guest.seatedIdle', until: 9.5, seat: 'twoB1', look: 'tb2' }, { clip: 'guest.leave', side: -1 }, { clip: 'guest.walk', path: [[-2.6, -3.25], [3.6, -3.25], [5.8, 0.55], [7.45, 0.75], [8.1, 0.6], [9.0, 1.7], [9.6, 4.5]], until: 30 }, { clip: 'staff.idle', until: END }]),
    tb2: G('social', 0.93, [0, 0], [{ clip: 'guest.seatedIdle', until: 9.9, seat: 'twoB2', look: 'tb1' }, { clip: 'guest.leave', side: 1 }, { clip: 'guest.walk', path: [[-1.6, -3.25], [3.6, -3.3], [5.9, 0.95], [7.45, 1.0], [8.2, 0.9], [9.2, 2.0], [9.9, 4.6]], until: 30.4 }, { clip: 'staff.idle', until: END }]),
    // Kön. q1 på dörrmattan, lugna. q2 tre på trottoaren, lugna. q3 otåliga tills Per kommer ut. q4 går.
    q1a: Q('kappa', 0.98, [7.2, 0.3], [
      { clip: 'guest.queueCalm', until: 30.8, face: -PI / 2, look: 'q1b' },
      { clip: 'guest.walk', path: [[5.8, -1.0], [3.6, -3.3], [-2.56, -3.4], [-2.56, -3.95]], until: 41.2 },
      { clip: 'guest.sit', seat: 'twoB1', side: -1 },
      { clip: 'guest.seatedIdle', until: END, look: 'q1b' }
    ]),
    q1b: Q('rock', 1.04, [7.35, 0.75], [
      { clip: 'guest.queueCalm', until: 31.2, face: -PI / 2, look: 'q1a' },
      { clip: 'guest.walk', path: [[5.9, -0.7], [3.6, -3.2], [-1.64, -3.35], [-1.64, -3.95]], until: 41.6 },
      { clip: 'guest.sit', seat: 'twoB2', side: 1 },
      { clip: 'guest.seatedIdle', until: END, look: 'q1a' }
    ]),
    q2a: Q('student', 0.95, [8.3, 0.15], [{ clip: 'guest.queueCalm', until: 32, face: -1.6, look: 'q2b' }, { clip: 'guest.walk', path: [[7.2, 0.3]], until: 34 }, { clip: 'guest.queueCalm', until: END, face: -PI / 2, look: 'q2b' }]),
    q2b: Q('medel2', 1.0, [8.65, -0.15], [{ clip: 'guest.queueCalm', until: 32.3, face: -1.4, look: 'q2a' }, { clip: 'guest.walk', path: [[7.35, 0.75]], until: 34.6 }, { clip: 'guest.queueCalm', until: END, face: -PI / 2, look: 'q2a' }]),
    q2c: Q('stickat', 0.97, [8.55, 0.5], [{ clip: 'guest.queueCalm', until: 32.6, face: -1.8, look: 'q2a' }, { clip: 'guest.walk', path: [[7.0, 0.85]], until: 35 }, { clip: 'guest.queueCalm', until: END, face: -PI / 2, look: 'q2b' }]),
    q3a: Q('hog', 1.05, [8.4, -1.7], [
      { clip: 'guest.queueImpatient', until: 12.6, face: -0.8, look: [7.6, 0] },
      { clip: 'guest.queueCalm', until: 33, face: -0.8, look: 'per' },
      { clip: 'guest.walk', path: [[8.3, 0.1]], until: 35.0 },
      { clip: 'guest.queueCalm', until: END, face: -1.6, look: 'q3b' }
    ]),
    q3b: Q('medel', 0.98, [8.8, -2.0], [
      { clip: 'guest.queueImpatient', until: 13, face: -0.9, look: [7.6, 0] },
      { clip: 'guest.queueCalm', until: 33.3, face: -0.9, look: 'q3a' },
      { clip: 'guest.walk', path: [[8.65, -0.2]], until: 35.4 },
      { clip: 'guest.queueCalm', until: END, face: -1.4, look: 'q3a' }
    ]),
    q4a: Q('jacka', 1.0, [8.5, -3.6], [
      { clip: 'guest.queueImpatient', until: 11.4, face: -0.7, look: [7.6, 0] },
      { clip: 'guest.queueLeaving', side: -1 },
      { clip: 'guest.walk', path: [[8.9, -4.8], [9.3, -8.6]], until: 22 },
      { clip: 'staff.idle', until: END }
    ]),
    q4b: Q('medel3', 0.96, [8.9, -3.9], [
      { clip: 'guest.queueImpatient', until: 12.2, face: -0.7, look: 'q4a' },
      { clip: 'guest.queueLeaving', side: -1 },
      { clip: 'guest.walk', path: [[9.3, -5.0], [9.7, -8.6]], until: 22.6 },
      { clip: 'staff.idle', until: END }
    ]),
    per: S('hovmastare', [6.1, -0.55], PI / 2, [
      { clip: 'host.checkBook', until: 4.6, face: PI / 2, look: 'q1a' },
      { clip: 'staff.walk', path: [[6.4, 0.2], [6.75, 0.3]], until: 5.8 },
      { clip: 'staff.listen', until: 9.2, face: PI / 2, look: 'q1a' },
      { clip: 'staff.walk', path: [[7.55, -0.2], [7.95, -1.25]], until: 11.2 },
      { clip: 'host.introduce', face: 2.3 },
      { clip: 'staff.listen', until: 16.2, face: 2.3, look: 'q3a' },
      { clip: 'staff.walk', path: [[7.5, -0.15], [6.6, 0.05]], until: 18 },
      { clip: 'host.takeMenus', face: PI, ev: ['m1', 'm2'].map((m) => ({ type: 'grab', prop: m, hand: 'R', at: 'grab' })) },
      { clip: 'staff.walk', path: [[6.1, -0.55]], until: 20.6, keep: 'R' },
      { clip: 'host.checkBook', until: 29.0, face: PI / 2, look: 'sara', keep: 'R' },
      { clip: 'staff.walk', path: [[6.4, 0.2], [6.7, 0.2]], until: 30.2, keep: 'R' },
      { clip: 'host.point', face: -2.4, hand: 'L' },
      { clip: 'staff.escort', path: [[5.8, -1.3], [3.6, -3.3], [-1.3, -3.3], [-2.1, -3.55]], until: 40.6 },
      { clip: 'staff.idle', until: 42.6, face: PI, look: 'q1a', keep: 'R' },
      { clip: 'host.presentMenu', face: -2.2, ev: [{ type: 'give', prop: 'm1', to: ['q1a', 'R'], at: 'give' }] },
      { clip: 'host.presentMenu', face: 2.2, ev: [{ type: 'give', prop: 'm2', to: ['q1b', 'R'], at: 'give' }] },
      { clip: 'staff.idle', until: END, face: PI, look: 'q1b' }
    ]),
    sara: S('servitor', [-4.1, 2.7], -PI / 2, [
      { clip: 'staff.idle', until: 11.5, look: 'tb1' },
      { clip: 'staff.walk', path: [[-4.3, 1.2], [-4.3, -1.6], [-3.3, -3.25], [-2.1, -3.8]], until: 18.6 },
      { clip: 'waiter.clear', face: PI, ev: [{ type: 'grab', prop: 'tg1', hand: 'R', at: 'grab' }, { type: 'hide', prop: 'tg2', at: 'stack' }] },
      { clip: 'staff.wipeTable', until: 25, face: PI, ev: [{ type: 'hide', prop: 'tg1', at: 0 }, { type: 'show', prop: 'sRag', at: 0 }, { type: 'switch', prop: 'sRag', to: 'R', at: 0 }] },
      { clip: 'staff.checkTable', face: PI, ev: [{ type: 'hide', prop: 'sRag', at: 0 }] },
      { clip: 'staff.beckon', face: 1.0, look: 'per' },
      { clip: 'staff.walk', path: [[-3.3, -3.25], [-4.3, -1.6], [-4.3, 1.2], [-4.1, 2.7]], until: 37 },
      { clip: 'staff.idle', until: END, face: -PI / 2, look: 'cook' }
    ]),
    mira: S('bartender', [-0.9, 0.74], 0, [{ clip: 'bar.leanIn', until: 14, face: 0, look: 'a3' }, { clip: 'bar.wipe', until: END, face: 0 }]),
    elin: S('sommelier', [1.3, 0.74], 0, [{ clip: 'bar.polishGlass', until: END, face: 0 }]),
    cook: S('kock', [-6.2, 3.9], -PI / 2, [{ clip: 'cook.station', until: END, face: -PI / 2 }])
  };
  props.mRag = { type: 'napkin', hand: ['mira', 'R'] };
  props.eGlass = { type: 'wineGlass', hand: ['elin', 'L'] }; props.eCloth = { type: 'napkin', hand: ['elin', 'R'] };
  const chapters = [{ t: 0, key: 'que.states' }, { t: 4.6, key: 'que.first' }, { t: 9.5, key: 'que.leaveTable' }, { t: 11.2, key: 'que.impatient' }, { t: 11.4, key: 'que.leaving' }, { t: 18.6, key: 'que.clear' }, { t: 28, key: 'que.sign' }, { t: 30.2, key: 'que.seat' }, { t: 32, key: 'que.move' }];
  const near = [focus(0, 8.0, -1.6, 12.5), focus(18.4, -2.1, -3.9, 11), focus(27.8, 7.4, -0.3, 12), { t: 30.6, follow: 'per', dist: 13 }, focus(32.2, 7.9, -0.4, 12), focus(37, -2.1, -3.9, 12)];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], beats: { chapters, near } };
}

export const SCENES = [
  { id: 'mise', build: mise },
  { id: 'welcome', build: welcome },
  { id: 'parties', build: parties },
  { id: 'moments', build: moments },
  { id: 'queue', build: queue }
];
