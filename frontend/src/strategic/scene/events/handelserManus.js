// handelserManus.js — leverans 3: händelserna i vinbaren som tidslinjer för teaterScen.
// Koordinater i vinbarens lokala XZ (meter), samma som manus/00-gemensamt.md.
// Varje manus ger actors/props/effects för teatern, och beats för kameran, strålkastaren och kortet.
// variant: 'right' (alla tre rätt) eller 'wrong' (felet i det steg manuset visar).

const GAME = { tx: 0.2, ty: 0.4, tz: 0.4, dist: 24, yaw: 0.7, pitch: 0.873 };
const near = (x, z, dist, yaw) => ({ tx: x, ty: 0.6, tz: z, dist: dist || 12, yaw: yaw ?? 0.44, pitch: 0.873 });
// Beslut 2026-09-30: ansiktena i loungen ska synas. 35° mot väster räckte inte (sällskapen sitter med ryggen mot kameran),
// så kameran går runt till södra sidan, 20° mot öster och 55° lutning. Efteråt tillbaka till spelarens vinkel.
const lounge = (x, z, dist) => ({ tx: x, ty: 0.6, tz: z, dist: dist || 12, yaw: Math.PI - 0.35, pitch: 0.96, rate: 1.7 }); // längre inglidning, ungefär 1,8 s

// ---------- Manus 1 · Födelsedagen ----------
// Rätt: alla tre steg. Ett felslut per steg (raketen slutar vid första felet, scenen spelas klart):
// steg 1 — köket får inte veta om nötallergin, Per stoppar tårtan vid luckan och går in till kocken;
// steg 2, *fort* — ljuset faller på loungebordet och Per kväver det;
// steg 3, *höja musiken* — Elin ber DJ:n höja, sällskapet sjunger över musiken och grannarna i lounge B ber om notan.
export function birthday(C, variant) {
  const fs = stepOf(variant), w1 = fs === 0, w2 = fs === 1, w3 = fs === 2, wrong = w2;
  const T = { ask1: 9.5, ans1: 13, ask2: 16, ans2: 19.5, ask3: 32.5, ans3: 36 };
  const END = w1 ? 36.4 : w2 ? 36 : w3 ? 51.6 : 47, BACK = w1 ? 32.8 : w2 ? 32.5 : w3 ? 48.4 : 43.5;
  const tableY = 0.45, passY = 0.99;

  const props = {
    lighter: { type: 'lighter', hand: ['sara', 'R'] },
    cake: { type: 'cake', at: [-4.62, passY, 2.75], hidden: true, fill: false },
    tray: { type: 'tray', hand: ['elin', 'L'] },
    g1: { type: 'wineGlass', on: ['tray', -0.08, 0] }, g2: { type: 'wineGlass', on: ['tray', 0.08, 0.02] },
    napkin: { type: 'apron', hand: ['per', 'R'], hidden: true },
    ...(w3 ? { bill: { type: 'billFolder', hand: ['per', 'R'], hidden: true } } : {})
  };
  const party = (id, seat, look, hm, lk) => ({ kind: 'guest', look, hm, pos: [0, 0], steps: [
    { clip: 'guest.seatedIdle', until: id === 'host' ? 0.1 : (w1 ? END : 30), seat, look: lk },
    ...(id === 'host' ? [
      { clip: 'guest.waveStaff', look: 'per' },
      { clip: 'guest.seatedIdle', until: 6.6, look: 'per' },
      { clip: 'guest.whisper', side: -1, look: 'per' },
      // Steg 1 fel: värden ser tårtan komma ut på luckan och vinkar till Per. Det var han som sa nötallergi.
      ...(w1 ? [{ clip: 'guest.seatedIdle', until: 19.6, look: 'per' }, { clip: 'guest.waveStaff', look: 'per' }, { clip: 'guest.seatedIdle', until: END, look: 'per' }]
        : [{ clip: 'guest.seatedIdle', until: 30, look: 'per' }])
    ] : []),
    ...(w1 ? [] : w2 ? [{ clip: 'guest.seatedIdle', until: END, look: 'per' }] : [
      { clip: 'guest.clap', until: 33 }, { clip: 'guest.seatedIdle', until: w3 ? 36.8 : 36 },
      { clip: 'guest.sing', until: w3 ? 42.8 : 42 }, { clip: 'guest.seatedIdle', until: END, look: 'nb1' }
    ])
  ] });
  const actors = {
    host: party('host', 'loungeA1', 'medel', 1.0, 'karin'),
    karin: { ...party('karin', 'loungeA2', 'social', 0.94, 'friend') },
    friend: party('friend', 'loungeA3', 'medel2', 1.02, 'karin'),
    nb1: { kind: 'guest', look: 'hog', hm: 1.05, pos: [0, 0], steps: w3 ? [
      // Beslut 2026-10-03: musiken går upp direkt, och grannarna reagerar inom konsekvensögonblicket (stamningManus, guestMood.CONSEQUENCE).
      { clip: 'guest.lean', until: 37.1, seat: 'loungeB1', look: 'nb2' },
      { clip: 'guest.armsCrossed', tempo: 'stressed', until: 39.1, look: 'karin' },
      { clip: 'guest.waveStaff', look: 'per' },
      { clip: 'guest.seatedIdle', until: 45.0, look: 'per' },
      { clip: 'guest.pay', look: 'per' },
      { clip: 'guest.seatedIdle', until: END, look: 'nb2' }
    ] : [{ clip: 'guest.lean', until: 40.4, seat: 'loungeB1', look: 'nb2' }, ...(w1 || w2 ? [{ clip: 'guest.seatedIdle', until: END }] : [{ clip: 'guest.toast', look: 'host' }, { clip: 'guest.seatedIdle', until: END, look: 'host' }])] },
    nb2: { kind: 'guest', look: 'medel3', hm: 0.97, pos: [0, 0], steps: w3 ? [
      { clip: 'guest.gesture', until: 37.3, seat: 'loungeB2', look: 'nb1' },
      { clip: 'guest.waveWaiter', tempo: 'stressed', look: 'per' },
      { clip: 'guest.checkWatch', look: 'per' },
      { clip: 'guest.seatedIdle', until: END, look: 'host' }
    ] : [{ clip: 'guest.gesture', until: 40.4, seat: 'loungeB2', look: 'nb1' }, ...(w1 || w2 ? [{ clip: 'guest.seatedIdle', until: END }] : [{ clip: 'guest.toast', look: 'host' }, { clip: 'guest.seatedIdle', until: END, look: 'host' }])] },
    b1: { kind: 'guest', look: 'student', hm: 0.98, pos: [0, 0], steps: [{ clip: 'guest.seatedIdle', until: END, seat: 'bar1', look: 'b2' }] },
    b2: { kind: 'guest', look: 'medel', hm: 1.03, pos: [0, 0], steps: wrong
      ? [{ clip: 'guest.seatedIdle', until: 23.9, seat: 'bar2', look: 'b1' }, { clip: 'guest.leaveStool', side: 1 }, { clip: 'guest.startle', face: 0.3 }, { clip: 'staff.idle', until: END, look: 'sara' }]
      : [{ clip: 'guest.seatedIdle', until: END, seat: 'bar2', look: 'b1' }] },
    b3: { kind: 'guest', look: 'medel2', hm: 0.95, pos: [0, 0], steps: [{ clip: 'guest.gesture', until: END, seat: 'bar3', look: 'b4' }] },
    b4: { kind: 'guest', look: 'social', hm: 0.92, pos: [0, 0], steps: [{ clip: 'guest.lean', until: END, seat: 'bar4', look: 'b3' }] },
    per: { kind: 'staff', look: 'hovmastare', pos: [2.4, 3.1], yaw: -Math.PI / 2, steps: [
      { clip: 'staff.idle', until: 0.4, look: 'host' },
      { clip: 'staff.walk', path: [[-2.9, 3.15], [-3.15, 4.5]], until: 6.4 },
      { clip: 'staff.listen', until: T.ans1 + 0.3, face: Math.PI / 2, look: 'host' },
      { clip: 'staff.walk', path: [[-3.6, 3.5], [-4.0, 3.35]], until: T.ans1 + 2.2 },
      ...(w1 ? [
        // Per säger antal och tid men inte allergin, och går tillbaka ut på golvet.
        { clip: 'staff.idle', until: 16.4, face: -Math.PI / 2, look: 'cook' },
        { clip: 'staff.walk', path: [[-3.4, 3.3], [-2.6, 3.25]], until: 18.3 },
        { clip: 'staff.idle', until: 19.9, face: 0, look: 'host' },
        // Värden vinkar. Per går tillbaka i stressat tempo och stoppar Sara innan hon går med tårtan.
        { clip: 'staff.walk', tempo: 'stressed', path: [[-3.2, 3.2], [-3.5, 3.05]], until: 21.3 },
        { clip: 'staff.halt', face: -1.75, look: 'sara' },
        { clip: 'staff.idle', until: 24.4, face: -1.75, look: 'sara' },
        { clip: 'staff.beckon', face: -1.75, look: 'cook' },
        { clip: 'staff.walk', path: [[-3.9, 2.3], [-4.45, 1.3], [-5.1, 1.25], [-5.1, 2.15]], until: 29.6 },
        { clip: 'staff.listen', until: END, face: -0.59, look: 'cook' }
      ] : w3 ? [
        // Steg 3 fel (beslut 2026-10-03): Per ger DJ:n tecken direkt, och musiken går upp 0,6 s efter svaret. Sedan tar han notan till lounge B.
        { clip: 'staff.idle', until: T.ans3 + 0.2, face: -Math.PI / 2, look: 'cook' },
        { clip: 'host.point', face: 2.24 },
        { clip: 'staff.idle', until: 39.6, face: 1.81, look: 'nb1' },
        { clip: 'staff.walk', path: [[-2.4, 3.15], [1.4, 3.15], [1.7, 3.3]], until: 44.0, ev: [{ type: 'show', prop: 'bill', at: 0 }] },
        { clip: 'waiter.presentBill', face: 0 },
        { clip: 'staff.idle', until: END, face: 0, look: 'nb1' }
      ] : [
        { clip: 'staff.idle', until: wrong ? 25.4 : END, face: -Math.PI / 2, look: 'cook' },
        ...(wrong ? [
          { clip: 'staff.walk', path: [[-2.4, 3.15], [-1.3, 3.2]], until: 27.9 },
          { clip: 'staff.idle', until: 28.3, face: 0, ev: [{ type: 'show', prop: 'napkin', at: 0.1 }] },
          { clip: 'staff.smother', face: 0, ev: [{ type: 'release', hand: 'R', prop: 'napkin', at: 'release', surface: tableY, put: [-1.45, 3.62] }] },
          { clip: 'staff.idle', until: END, face: 0, look: 'karin' }
        ] : [])
      ])
    ] },
    cook: { kind: 'staff', look: 'kock', pos: [-6.2, 3.9], yaw: -Math.PI / 2, steps: w1 ? [
      { clip: 'cook.station', until: T.ans1 + 1.5, face: -Math.PI / 2 },
      { clip: 'staff.idle', until: 16.4, face: Math.PI / 2, look: 'per' },
      { clip: 'staff.walk', path: [[-5.6, 3.1], [-5.2, 2.75]], until: 17.6 },
      { clip: 'cook.toPass', face: Math.PI / 2, ev: [{ type: 'show', prop: 'cake', at: 'release' }] },
      { clip: 'staff.walk', path: [[-5.6, 3.3], [-6.2, 3.9]], until: 20.8 },
      { clip: 'cook.station', until: 25.6, face: -Math.PI / 2 },
      { clip: 'staff.walk', path: [[-5.6, 3.2], [-5.4, 2.6]], until: 27.2 },
      { clip: 'staff.idle', until: 29.8, face: 2.55, look: 'per' },
      { clip: 'staff.listen', until: 31.2, face: 2.55, look: 'per' },
      // Kocken tar tillbaka tårtan från luckan. Den nya kommer senare, utan att kameran följer.
      { clip: 'staff.walk', path: [[-5.2, 2.75]], until: 31.6 },
      { clip: 'cook.toPass', face: Math.PI / 2, ev: [{ type: 'hide', prop: 'cake', at: 'grab' }] },
      { clip: 'staff.walk', path: [[-5.6, 3.3], [-6.2, 3.9]] },
      { clip: 'cook.station', until: END, face: -Math.PI / 2 }
    ] : [
      { clip: 'cook.station', until: T.ans1 + 1.5, face: -Math.PI / 2 },
      { clip: 'staff.idle', until: T.ans2, face: Math.PI / 2, look: 'per' },
      { clip: 'staff.walk', path: [[-5.6, 3.1], [-5.2, 2.75]], until: T.ans2 + 1.4 },
      { clip: 'cook.toPass', face: Math.PI / 2, ev: [{ type: 'show', prop: 'cake', at: 'release' }] },
      { clip: 'staff.walk', path: [[-5.6, 3.3], [-6.2, 3.9]] },
      { clip: 'cook.station', until: END, face: -Math.PI / 2 }
    ] },
    sara: { kind: 'staff', look: 'servitor', pos: [-4.1, 2.7], yaw: -Math.PI / 2, steps: [
      { clip: 'staff.idle', until: w1 ? 18.9 : 21.2, look: 'per' },
      { clip: 'waiter.lightCandles', face: -Math.PI / 2, ev: [{ type: 'fill', prop: 'cake', at: 'light' }, { type: 'hide', prop: 'lighter', at: 'end' }, { type: 'grab', hand: 'R', prop: 'cake', at: 'end' }] },
      ...(w1 ? [
        { clip: 'waiter.carryCake', tempo: 'calm', path: [[-4.05, 2.95]], until: 22.6 },
        { clip: 'waiter.serve', face: -Math.PI / 2, ev: [{ type: 'release', hand: 'R', prop: 'cake', at: 'release', surface: passY, put: [-4.62, 2.85] }] },
        { clip: 'staff.idle', until: END, face: Math.PI / 2, look: 'per' }
      ] : wrong ? [
        { clip: 'waiter.carryCake', tempo: 'stressed', path: [[-4.1, 3.15], [-2.35, 3.15]], until: 24.6 },
        { clip: 'staff.dodge', side: -1, tempo: 'stressed' },
        { clip: 'waiter.carryCake', tempo: 'stressed', path: [[-1.8, 3.2]], until: 26.6 },
        { clip: 'waiter.serve', face: 0, ev: [{ type: 'release', hand: 'R', prop: 'cake', at: 'release', surface: tableY, put: [-1.9, 3.72] }] },
        { clip: 'staff.idle', until: END, face: 0, look: 'per' }
      ] : [
        { clip: 'waiter.carryCake', tempo: 'calm', path: [[-4.1, 3.15], [-2.4, 3.15], [-1.8, 3.2]], until: 27.6 },
        { clip: 'waiter.serve', face: 0, ev: [{ type: 'release', hand: 'R', prop: 'cake', at: 'release', surface: tableY, put: [-1.8, 3.72] }] },
        { clip: 'staff.idle', until: END, face: 0, look: 'karin' }
      ])
    ] },
    elin: { kind: 'staff', look: 'sommelier', pos: [3.3, 1.6], yaw: 0, steps: w1 || w2
      ? [{ clip: 'staff.idle', until: END, look: 'nb1', keep: 'L' }]
      : w3 ? [
        // Elin står kvar med brickan. Glasen till grannarna blir aldrig serverade.
        { clip: 'staff.idle', until: 37.0, look: 'per', keep: 'L' },
        { clip: 'staff.idle', until: END, face: 0, look: 'nb1', keep: 'L' }
      ] : [
        { clip: 'staff.idle', until: T.ans3 + 0.3, look: 'nb1', keep: 'L' },
        { clip: 'waiter.carryTray', path: [[2.0, 2.4], [2.0, 3.2]], until: T.ans3 + 3 },
        { clip: 'waiter.serve', hand: 'L', face: 0, ev: [{ type: 'release', hand: 'L', prop: 'tray', at: 'release', surface: tableY, put: [2.0, 3.72] }] },
        { clip: 'staff.idle', until: END, face: 0, look: 'nb2' }
      ] },
    mira: { kind: 'staff', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: END, face: 0 }] },
    // DJ:n står i sydöstra hörnet i alla varianter (helgkvällen). Inga egna klipp ännu: arbetet vid pulten är cook.station.
    dj: { kind: 'staff', look: 'dj', pos: [6.15, -4.65], yaw: -Math.PI / 4, stand: 0.25, steps: w3 ? [
      { clip: 'cook.station', until: 36.4, face: -Math.PI / 4 },
      { clip: 'staff.listen', until: 37.0, face: -0.75, look: 'per' },
      { clip: 'cook.station', until: END, face: -Math.PI / 4 }
    ] : [{ clip: 'cook.station', until: END, face: -Math.PI / 4 }] }
  };
  const effects = wrong ? [{ type: 'candleDrop', t: 25.25, from: 'cake', to: [-1.45, tableY + 0.004, 3.62], out: 28.95 }]
    : w3 ? [{ type: 'musicUp', t: T.ans3 + 0.6, at: [5.75, 1.45, -4.25] }] : [];
  const cam = w1
    ? [{ t: 0, v: GAME }, { t: 0.2, v: lounge(-1.8, 3.75) }, { t: T.ans1 + 0.3, v: near(-3.0, 3.6) }, { t: 19.6, v: near(-4.0, 3.0, 11, 0.6) }, { t: 25.6, v: near(-4.6, 2.4, 12, 0.8) }, { t: BACK, v: GAME, rate: 1.9 }]
    : wrong
    ? [{ t: 0, v: GAME }, { t: 0.2, v: lounge(-1.8, 3.75) }, { t: 21.5, follow: 'sara', dist: 13 }, { t: 26.8, v: lounge(-1.7, 3.6) }, { t: BACK, v: GAME, rate: 1.9 }]
    : [{ t: 0, v: GAME }, { t: 0.2, v: lounge(-1.8, 3.75) }, { t: T.ans1 + 0.3, v: near(-3.0, 3.6) }, { t: 21.5, follow: 'sara', dist: 13 }, { t: 28, v: lounge(-1.8, 3.75) },
      // Konsekvensögonblicket (guestMood.CONSEQUENCE): in till 7 m, sista 1,5 s till 5,5 m, sedan tillbaka.
      ...(w3 ? [{ t: T.ans3 + 0.6, v: { ...lounge(0.4, 4.2, 7), pitch: 0.7 } }, { t: T.ans3 + 2.3, v: { ...lounge(0.4, 4.3, 5.5), pitch: 0.7, rate: 1.2 } }, { t: T.ans3 + 3.8, v: lounge(0.1, 3.9, 13) }]
        : [{ t: T.ans3 + 0.3, v: lounge(0.1, 3.9, 13) }]), { t: BACK, v: GAME, rate: 1.9 }];
  const spot = w1
    ? [{ t: 0.2, who: 'host' }, { t: 6.4, who: 'per' }, { t: 16.4, who: 'cook' }, { t: 18.9, who: 'sara' }, { t: 19.6, who: 'host' }, { t: 20.4, who: 'per' }, { t: 31.2, who: 'cook' }, { t: BACK, who: null }]
    : wrong
    ? [{ t: 0.2, who: 'host' }, { t: 6.4, who: 'per' }, { t: T.ans1 + 0.3, who: 'per' }, { t: 21.2, who: 'sara' }, { t: 25.4, who: 'per' }, { t: BACK, who: null }]
    : [{ t: 0.2, who: 'host' }, { t: 6.4, who: 'per' }, { t: 17.5, who: 'cook' }, { t: 21.2, who: 'sara' }, { t: 28.6, who: 'karin' },
      ...(w3 ? [{ t: T.ans3 + 0.2, who: 'per' }, { t: T.ans3 + 0.6, who: 'karin' }, { t: 37.1, who: 'nb1' }, { t: 39.6, who: 'per' }]
        : [{ t: T.ans3 + 0.3, who: 'elin' }, { t: 40.4, who: 'nb1' }]), { t: BACK, who: null }];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects, beats: { cam, spot, card: cardOf(T, fs, BACK), chapters: chaptersOf('', T, fs, BACK) } };
}

// ---------- Manus 2 · Vasen på pulten ----------
// Rätt: alla tre steg. Fel: steg 1 — en gäst från ståbordet går över vattnet och halkar.
export function vase(C, variant) {
  const w1 = variant === 'wrong1', w2 = variant === 'wrong2', w3 = variant === 'wrong3', wrong = w1, stay = w1 || w2;
  const T = { ask1: 7, ans1: 10.5, ask2: 15, ans2: 18.5, ask3: 31, ans3: 34.5 };
  const END = w1 ? 27 : w2 ? 30 : w3 ? 42 : 45, BACK = w1 ? 24 : w2 ? 27.5 : w3 ? 39.5 : 42.5;
  const props = {
    vase: { type: 'vase', at: [6.6, 1.10, -0.55] },
    chair: { type: 'wheelchair', follow: 'gw', offset: [0, -0.05] },
    broom: { type: 'broom', hand: ['sara', 'R'], hidden: true },
    rag: { type: 'napkin', hand: ['sara', 'L'], hidden: true },
    broom2: { type: 'broom', hand: ['per', 'R'], hidden: true }
  };
  const clean0 = wrong ? 15.5 : 23, wipe0 = wrong ? 19 : 27, wipe1 = wrong ? 22 : 30;
  const cleaning = [
    { clip: 'staff.sweep', until: wipe0, face: -Math.PI / 2, ev: [{ type: 'show', prop: 'broom', at: 0 }, { type: 'hide', prop: 'broom', at: 'end' }] },
    { clip: 'staff.wipeFloor', until: wipe1, face: -Math.PI / 2, ev: [{ type: 'show', prop: 'rag', at: 0 }, { type: 'hide', prop: 'rag', at: 'end' }] }
  ];
  const actors = {
    gw: { kind: 'guest', look: 'medel3', hm: 0.98, pos: [7.7, 0.3], yaw: -Math.PI / 2, steps: [
      { clip: 'guest.wheelRoll', path: [[6.9, 0.3]], until: 2.0 },
      { clip: 'guest.wheel', until: 3.9, look: 'per' },
      { clip: 'guest.wheelTurn', side: 1 },
      { clip: 'guest.wheelRoll', path: [[7.05, 0.8]], until: 5.6 },
      { clip: 'guest.wheel', until: stay ? END : 35.4, look: 'comp' },
      ...(stay ? [] : w3 ? [{ clip: 'guest.wheelTurn', side: -1 }, { clip: 'guest.wheelRoll', path: [[7.4, 0.4], [8.4, 0.4]], until: 39.4 }, { clip: 'guest.wheel', until: END }] : [{ clip: 'guest.wheelRoll', path: [[6.1, 0.6], [4.2, 1.9], [2.9, 2.9]], until: 41.5 }, { clip: 'guest.wheel', until: END, look: 'comp' }])
    ] },
    comp: { kind: 'guest', look: 'social', hm: 0.94, pos: [7.8, 0.6], yaw: -Math.PI / 2, steps: [
      { clip: 'guest.walk', path: [[7.45, 0.1]], until: 2.6 },
      { clip: 'staff.idle', until: 5.9, look: 'per' },
      { clip: 'guest.comfort', until: stay ? END : 35.6, face: -Math.PI / 2, look: 'gw' },
      ...(stay ? [] : w3 ? [{ clip: 'guest.walk', path: [[8.4, 0.9]], until: 39.4 }, { clip: 'staff.idle', until: END }] : [{ clip: 'guest.walk', path: [[6.2, 1.1], [4.4, 2.3], [3.2, 3.3]], until: 41.6 }, { clip: 'staff.idle', until: END, look: 'gw' }])
    ] },
    per: { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [
      { clip: 'staff.idle', until: 1.5, face: Math.PI / 2, look: 'gw' },
      { clip: 'host.welcome', face: Math.PI / 2 },
      { clip: 'staff.idle', until: T.ans1 + 0.4, face: Math.PI / 2, look: 'gw' },
      ...(wrong ? [
        { clip: 'staff.walk', path: [[6.2, 0.7]], until: 14.2 },
        { clip: 'staff.idle', until: END, face: 0.4, look: 'ht' }
      ] : [
        { clip: 'staff.walk', path: [[6.2, 0.3], [7.25, 1.3]], until: 13.4 },
        ...(w2 ? [
          { clip: 'staff.holdDoor', until: T.ans2 + 1.4, face: -Math.PI / 2 },
          { clip: 'staff.walk', path: [[7.6, 0.35]], until: 22.2 },
          { clip: 'staff.sweep', until: 26.5, face: -Math.PI / 2, ev: [{ type: 'show', prop: 'broom2', at: 0 }] },
          { clip: 'staff.idle', until: END, look: 'sara' }
        ] : w3 ? [{ clip: 'staff.holdDoor', until: END, face: -Math.PI / 2 }] : []),
        ...(w2 || w3 ? [] : [
          { clip: 'staff.holdDoor', until: T.ans3 + 0.4, face: -Math.PI / 2 },
          { clip: 'host.point', face: -2.2 },
          { clip: 'staff.escort', path: [[6.0, 1.3], [4.3, 2.4], [3.3, 2.7]], until: 41.2 },
          { clip: 'staff.idle', until: END, look: 'gw' }
        ])
      ])
    ] },
    sara: { kind: 'staff', look: 'servitor', pos: [3.4, 1.2], yaw: Math.PI / 2, steps: wrong ? [
      { clip: 'staff.idle', until: 13.4, look: 'gw' },
      { clip: 'staff.walk', tempo: 'stressed', path: [[6.1, 0.25]], until: 15.3 },
      ...cleaning,
      { clip: 'staff.idle', until: END, look: 'gw' }
    ] : [
      { clip: 'staff.idle', until: T.ans1 + 0.2, look: 'gw' },
      { clip: 'staff.walk', tempo: 'calm', path: [[5.85, 0.2]], until: 13.4 },
      { clip: 'staff.halt', face: Math.PI / 2 },
      { clip: 'staff.idle', until: T.ans2 + 0.2, face: Math.PI / 2, look: 'gw' },
      { clip: 'staff.walk', tempo: 'calm', path: [[6.45, 0.2]], until: 19.4 },
      { clip: 'staff.kneelTalk', face: Math.PI / 2 },
      ...(w2 ? [
        { clip: 'staff.idle', until: T.ans2 + 0.2, face: Math.PI / 2, look: 'gw' },
        { clip: 'staff.walk', path: [[7.55, -0.2]], until: 20.4 },
        { clip: 'rocket.cutHand', face: -Math.PI / 2 },
        { clip: 'rocket.holdHand', until: END, look: 'per' }
      ] : [{ clip: 'staff.walk', path: [[7.55, -0.2]], until: clean0 }]),
      ...cleaning,
      { clip: 'staff.idle', until: END, look: 'gw' }
    ] },
    ht: { kind: 'guest', look: 'hog', hm: 1.05, pos: [5.0, 3.35], yaw: Math.PI, steps: wrong ? [
      { clip: 'guest.standBar', until: 10.7, face: Math.PI, look: 'ht2' },
      { clip: 'guest.walk', path: [[6.2, 1.2], [6.75, 0.3]], until: 13.1 },
      { clip: 'guest.slip' }, { clip: 'guest.balance' },
      { clip: 'staff.idle', until: END, look: 'sara' }
    ] : [{ clip: 'guest.standBar', until: END, face: Math.PI, look: 'ht2' }] },
    ht2: { kind: 'guest', look: 'medel', hm: 0.97, pos: [5.0, 2.45], yaw: 0, steps: [{ clip: 'guest.standBar', until: END, face: 0, look: 'ht' }] }
  };
  const effects = [{ type: 'vaseFall', prop: 'vase', at: [6.6, 1.10, -0.55], dir: [0.7, 0.7], t: 5.6, clean: w2 ? 26.5 : wipe0, dry: w2 ? null : wipe1 }];
  // Kameran står i nordväst och tittar över pulten mot dörrväggen: skärvorna och fläcken ligger fritt mellan pulten och väggen.
  const cam = [{ t: 0, v: GAME }, { t: 0.2, v: { tx: 6.85, ty: 0.3, tz: -0.2, dist: 10, yaw: -0.9, pitch: 1.0 } }, ...(stay || w3 ? [] : [{ t: T.ans3 + 0.5, v: near(4.8, 1.8, 13) }]), { t: BACK, v: GAME, rate: 1.9 }];
  const spot = wrong
    ? [{ t: 0.2, who: 'gw' }, { t: T.ans1 + 0.3, who: 'ht' }, { t: 14.4, who: 'sara' }, { t: BACK, who: null }]
    : w2 ? [{ t: 0.2, who: 'gw' }, { t: T.ans1 + 0.3, who: 'sara' }, { t: 21.4, who: 'per' }, { t: BACK, who: null }]
    : w3 ? [{ t: 0.2, who: 'gw' }, { t: T.ans1 + 0.3, who: 'sara' }, { t: T.ans3 + 0.3, who: 'gw' }, { t: BACK, who: null }]
    : [{ t: 0.2, who: 'gw' }, { t: T.ans1 + 0.3, who: 'sara' }, { t: T.ans3 + 0.5, who: 'per' }, { t: BACK, who: null }];
  const card = [
    { t: T.ask1, step: 0, ph: 'ask' }, { t: T.ans1, step: 0, ph: wrong ? 'wrong' : 'right' },
    ...(w1 ? [] : [{ t: T.ask2, step: 1, ph: 'ask' }, { t: T.ans2, step: 1, ph: w2 ? 'wrong' : 'right' }]),
    ...(w1 || w2 ? [] : [{ t: T.ask3, step: 2, ph: 'ask' }, { t: T.ans3, step: 2, ph: w3 ? 'wrong' : 'right' }]),
    { t: BACK, step: w1 ? 0 : w2 ? 1 : 2, ph: 'off' }
  ];
  const chapters = [{ t: 0, key: 'vbuild' }, { t: T.ask1, key: 'ask' }, ...(w1 ? [{ t: T.ans1, key: 'vfail1' }] : [{ t: T.ans1, key: 'vend1' }, { t: T.ans2, key: w2 ? 'vfail2' : 'vend2' }, ...(w2 ? [] : [{ t: T.ans3, key: w3 ? 'vfail3' : 'vend3' }])]), { t: BACK, key: 'back' }];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects, beats: { cam, spot, card, chapters } };
}

// ---------- Rekvisitans fall: vasen och ljuset, var för sig ----------
export function propFalls(C) {
  const props = {
    vase: { type: 'vase', at: [6.6, 1.10, -0.55] },
    cake: { type: 'cake', at: [-1.8, 0.45, 3.72] }
  };
  const actors = {
    per: { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: 3.2, face: Math.PI / 2 }, { clip: 'guest.startle' }, { clip: 'staff.idle', until: 12, face: Math.PI / 2 }] }
  };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, end: 12, props, actors,
    effects: [
      { type: 'vaseFall', prop: 'vase', at: [6.6, 1.10, -0.55], dir: [0.6, -0.8], t: 3, clean: 10, dry: 10.5 },
      { type: 'candleDrop', t: 7, from: 'cake', to: [-1.45, 0.454, 3.62], out: 10.5 }
    ],
    beats: {
      cam: [{ t: 0, v: near(6.6, -0.6, 6, 0.9) }, { t: 5.6, v: near(-1.6, 3.7, 6, 0.44) }],
      spot: [{ t: 0, who: null }], card: [], chapters: [{ t: 0, key: 'vase' }, { t: 5.6, key: 'candle' }]
    }
  };
}

// Gemensamt för manus 3–5: kortet, kapitlen och gästerna som sitter kvar i rummet.
function cardOf(T, failStep, BACK) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    out.push({ t: T['ask' + (i + 1)], step: i, ph: 'ask' }, { t: T['ans' + (i + 1)], step: i, ph: failStep === i ? 'wrong' : 'right' });
    if (failStep === i) break;
  }
  out.push({ t: BACK, step: failStep ?? 2, ph: 'off' });
  return out;
}
function chaptersOf(p, T, failStep, BACK, extra = []) {
  const out = [{ t: 0, key: p + 'build' }, { t: T.ask1, key: 'ask' }];
  for (let i = 0; i < 3; i++) { out.push({ t: T['ans' + (i + 1)], key: p + (failStep === i ? 'fail' : 'end') + (i + 1) }); if (failStep === i) break; }
  return [...out, ...extra, { t: BACK, key: 'back' }].sort((a, b) => a.t - b.t);
}
const sit = (seat, look, hm, END, lk, steps) => ({ kind: 'guest', look, hm, pos: [0, 0], steps: steps || [{ clip: 'guest.seatedIdle', until: END, seat, look: lk }] });
const stepOf = (v) => (v === 'wrong1' ? 0 : v === 'wrong2' ? 1 : /^wrong[A-D]?3$/.test(v || '') ? 2 : null);
// ---------- Manus 3 · Gästen som vinglar ----------
// Tre stamgäster på de norra barstolarna. Gästen på bar3 kliver bakåt in i Saras bricka.
export function drunk(C, variant) {
  const fs = stepOf(variant), w1 = fs === 0, w2 = fs === 1, w3 = fs === 2;
  const T = { ask1: 7, ans1: 10.5, ask2: 14.5, ans2: 18, ask3: 26, ans3: 29.5 };
  const failAt = fs == null ? null : T['ans' + (fs + 1)];
  const END = w1 ? 25 : w2 ? 31 : w3 ? 42 : 39, BACK = w1 ? 22 : w2 ? 28.5 : w3 ? 39 : 36;
  const barY = 1.15;
  const props = {
    tray: { type: 'tray', hand: ['sara', 'L'] },
    g1: { type: 'wineGlass', on: ['tray', -0.08, 0] }, g2: { type: 'wineGlass', on: ['tray', 0.08, 0.02] },
    carafe: { type: 'carafe', hand: ['mira', 'R'], hidden: true },
    bottle: { type: 'wineBottle', hand: ['mira', 'R'], hidden: true },
    water: { type: 'waterGlass', at: [-0.9, barY, 1.45], hidden: true },
    wine: { type: 'wineGlass', at: [w3 ? 0 : -0.9, barY, 1.45], hidden: true },
    pad: { type: 'pad', hand: ['mira', 'L'], hidden: true },
    g4: { type: 'wineGlass', at: [0, barY, 1.4] }, g2b: { type: 'wineGlass', at: [-1.8, barY, 1.4] }
  };
  const back = (from) => [{ clip: 'guest.walk', path: [[-0.9, 2.75]], until: from + 0.7 }, { clip: 'guest.sitStool', seat: 'bar3' }];
  const actors = {
    g: { kind: 'guest', look: 'medel2', hm: 1.04, pos: [0, 0], steps: [
      { clip: 'guest.seatedIdle', until: 1.5, seat: 'bar3', look: 'b4' },
      { clip: 'guest.leaveStool', tempo: 'calm' },
      { clip: 'guest.walk', path: [[-0.85, 3.05]], until: 4.1 },
      { clip: 'guest.balance', face: Math.PI, look: 'sara' },
      { clip: 'guest.stagger', path: [[-0.75, 2.95], [-0.95, 3.02], [-0.82, 2.92]], until: 8.8 },
      { clip: 'staff.idle', until: w1 ? T.ans1 : T.ans2, face: Math.PI, look: 'mira' },
      ...(w1 ? [...back(T.ans1), { clip: 'guest.reachGlass', ev: [{ type: 'grab', hand: 'R', prop: 'wine', at: 'grab' }] }, { clip: 'guest.seatedIdle', until: END, look: 'b2' }]
        : [...back(T.ans2),
          ...(w2 ? [{ clip: 'guest.gesture', tempo: 'stressed', until: 25.5 }, { clip: 'guest.seatedIdle', until: END, look: 'per' }]
            : [{ clip: 'guest.seatedIdle', until: w3 ? 35.2 : END, look: 'mira' }, ...(w3 ? [{ clip: 'guest.seatedIdle', until: END, look: 'b4' }] : [])])])
    ] },
    b2: sit('bar2', 'medel', 1.0, END, 'g', [
      { clip: 'guest.seatedIdle', until: w2 ? T.ans2 : END, seat: 'bar2', look: 'g' },
      ...(w2 ? [{ clip: 'guest.clap', tempo: 'stressed', until: 23 }, { clip: 'guest.lean', until: END, look: 'g' }] : [])
    ]),
    b4: sit('bar4', 'social', 0.93, END, 'g', [
      { clip: 'guest.seatedIdle', until: w2 ? T.ans2 : T.ask3 - 2.6, seat: 'bar4', look: 'g' },
      ...(w2 ? [{ clip: 'guest.clap', tempo: 'stressed', until: 23 }, { clip: 'guest.seatedIdle', until: END, look: 'g' }]
        : [{ clip: 'guest.waveStaff', look: 'mira' }, { clip: 'guest.seatedIdle', until: w3 ? 32.2 : END, look: 'mira' },
          ...(w3 ? [{ clip: 'guest.reachGlass', ev: [{ type: 'grab', hand: 'R', prop: 'wine', at: 'grab' }] }, { clip: 'guest.lean', until: END, look: 'g', ev: [{ type: 'give', prop: 'wine', to: ['g', 'R'], at: 0.35 }] }] : [])])
    ]),
    b1: sit('bar1', 'student', 0.98, END, 'b2'),
    la1: sit('loungeA1', 'medel3', 1.0, END, 'g'), la2: sit('loungeA2', 'hog', 1.05, END, 'g'),
    lb1: sit('loungeB2', 'medel', 0.97, END, 'lb2'), lb2: sit('loungeB3', 'social', 0.94, END, 'lb1'),
    sara: { kind: 'staff', look: 'servitor', pos: [2.6, 2.0], yaw: -Math.PI / 2, steps: [
      { clip: 'waiter.carryTray', path: [[2.0, 3.1], [-0.75, 3.12]], until: 4.1 },
      { clip: 'waiter.trayWobble', face: -Math.PI / 2 },
      { clip: 'staff.idle', until: T.ans1, face: -Math.PI / 2, look: 'g', keep: 'trayL' },
      { clip: 'waiter.carryTray', path: [[-1.8, 3.2]] },
      { clip: 'waiter.serve', hand: 'L', face: 0, ev: [{ type: 'release', hand: 'L', prop: 'tray', at: 'release', surface: 0.45, put: [-1.8, 3.72] }] },
      { clip: 'staff.idle', until: END, face: 0, look: 'la2' }
    ] },
    mira: { kind: 'staff', look: 'bartender', pos: [-0.9, 0.74], yaw: 0, steps: [
      { clip: 'bar.wipe', until: 4.3, face: 0 },
      { clip: 'staff.idle', until: T.ans1, face: 0, look: 'g' },
      ...(w1 ? [
        { clip: 'bar.pour', face: 0, ev: [{ type: 'show', prop: 'bottle', at: 0 }, { type: 'show', prop: 'wine', at: 0.3 }, { type: 'hide', prop: 'bottle', at: 'end' }] },
        { clip: 'staff.idle', until: END, face: 0, look: 'per' }
      ] : [
        { clip: 'bar.leanIn', until: T.ans2, face: 0, look: 'g' },
        ...(w2 ? [{ clip: 'staff.idle', until: END, face: 0, look: 'g' }] : [
          { clip: 'bar.pourWater', face: 0, ev: [{ type: 'show', prop: 'carafe', at: 0 }, { type: 'show', prop: 'water', at: 0.5 }, { type: 'hide', prop: 'carafe', at: 'end' }] },
          { clip: 'bar.leanIn', until: T.ask3 - 2.4, face: 0, look: 'g' },
          { clip: 'staff.idle', until: T.ans3, face: 0, look: 'b4' },
          ...(w3 ? [
            { clip: 'staff.walk', path: [[0, 0.74]], until: T.ans3 + 0.9 },
            { clip: 'bar.pour', face: 0, ev: [{ type: 'show', prop: 'bottle', at: 0 }, { type: 'show', prop: 'wine', at: 0.3 }, { type: 'hide', prop: 'bottle', at: 'end' }] },
            { clip: 'staff.idle', until: END, face: 0, look: 'b4' }
          ] : [
            { clip: 'staff.decline', face: 0, look: 'b4' },
            { clip: 'staff.write', until: 35.2, face: -Math.PI / 2, ev: [{ type: 'show', prop: 'pad', at: 0 }] },
            { clip: 'staff.idle', until: END, face: 0, look: 'g' }
          ])
        ])
      ])
    ] },
    per: failAt == null ? { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: END, face: Math.PI / 2 }] }
      : { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [
        { clip: 'staff.idle', until: failAt + 0.6, face: Math.PI / 2, look: 'g' },
        { clip: 'staff.walk', path: [[5.4, 0.2], [3.6, 1.9], [3.4, 3.1], [0.4, 3.15], [-0.4, 3.12]], until: failAt + 7.4 },
        { clip: 'staff.listen', until: END, face: -Math.PI / 2, look: 'g' }
      ] },
    elin: { kind: 'staff', look: 'sommelier', pos: [1.3, 0.74], yaw: 0, steps: [{ clip: 'staff.idle', until: END, look: 'g' }] },
    cook: { kind: 'staff', look: 'kock', pos: [-6.2, 3.9], yaw: -Math.PI / 2, steps: [{ clip: 'cook.station', until: END, face: -Math.PI / 2 }] }
  };
  // Beslut 2026-10-03: från söder, som i loungen, så att ansiktena vid de norra barstolarna syns när kameran går in.
  const cam = [{ t: 0, v: GAME }, { t: 0.1, v: lounge(-1.4, 3.6, 12) }, ...(failAt ? [{ t: failAt + 3.5, v: lounge(-0.6, 3.4, 13) }] : []), { t: BACK, v: GAME, rate: 1.9 }];
  const spot = [{ t: 0.1, who: 'g' },
    ...(w1 ? [{ t: T.ans1, who: 'mira' }, { t: T.ans1 + 3, who: 'g' }, { t: T.ans1 + 6.5, who: 'per' }]
      : [{ t: T.ans1, who: 'mira' }, ...(w2 ? [{ t: T.ans2, who: 'g' }, { t: T.ans2 + 6.5, who: 'per' }]
        : [{ t: T.ans2, who: 'g' }, { t: T.ans2 + 2.6, who: 'mira' }, { t: T.ask3 - 2.6, who: 'b4' }, { t: T.ans3, who: w3 ? 'b4' : 'mira' }, ...(w3 ? [{ t: T.ans3 + 6.5, who: 'per' }] : [])])]),
    { t: BACK, who: null }];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], beats: { cam, spot, card: cardOf(T, fs, BACK), chapters: chaptersOf('d', T, fs, BACK) } };
}

// ---------- Manus 4 · Tillsynen ----------
// Handläggaren och polisen vid barens östra kortände. Steg 3 i fyra varianter: A den nekade gästen, B ålderskontrollen,
// C egenkontrollen och D kravet på mat. Felen i steg 3 är ritade i variant A, B (wrongB3) och C (wrongC3).
export function inspection(C, variant) {
  const D = variant === 'rightD', B = variant === 'rightB' || variant === 'wrongB3', SC = variant === 'rightC' || variant === 'wrongC3';
  const fs = stepOf(variant), w1 = fs === 0, w2 = fs === 1, w3 = fs === 2, wB = B && w3, wC = SC && w3, wA = w3 && !B && !SC;
  const T = { ask1: 14.5, ans1: 18, ask2: 22, ans2: 25.5, ask3: 38.5, ans3: 42 };
  const exitAt = w1 ? 24 : w2 ? 41 : wB ? 55 : wC ? 55.5 : w3 ? 46.5 : D ? 60 : B ? 50 : SC ? 51 : 47;
  const END = exitAt + 7.5, BACK = exitAt + 3.6;
  const barY = 1.16, toPer = 2.52, out = [[3.7, 1.1], [5.5, 1.35], [6.95, 0.4], [8.4, 0.3]];
  const props = {
    councilId: { type: 'councilId', hand: ['insp', 'R'], hidden: true },
    policeId: { type: 'policeId', hand: ['pol', 'R'], hidden: true },
    carafe: { type: 'carafe', hand: ['elin', 'R'], hidden: true },
    wa: { type: 'waterGlass', at: [2.15, barY, 0.3], hidden: true }, wb: { type: 'waterGlass', at: [2.15, barY, 0.9], hidden: true },
    folder: { type: 'licenceFolder', at: [6.6, 1.1, -0.45] },
    ipad: { type: 'pad', hand: ['insp', 'L'], hidden: true },
    mpad: { type: 'pad', hand: ['mira', 'L'], hidden: true },
    b3glass: { type: D ? 'wineGlass' : 'waterGlass', at: [-0.9, 1.15, 1.45] },
    b2glass: { type: 'wineGlass', at: [-1.8, 1.15, 1.4] },
    dish: { type: 'sidePlate', at: [-4.8, 1.1, 2.75], hidden: true, fill: false },
    spad: { type: 'pad', hand: ['sara', 'L'], hidden: true },
    yid1: { type: 'councilId', hand: ['lb1', 'R'], hidden: true }, yid2: { type: 'councilId', hand: ['lb2', 'R'], hidden: true },
    // Variant B, fel: flaskan Sara hämtar på disken och glasen hon häller i.
    ...(wB ? { sbottle: { type: 'wineBottle', at: [1.55, barY, 1.5] }, yg1: { type: 'wineGlass', at: [1.85, 0.45, 3.62], hidden: true }, yg2: { type: 'wineGlass', at: [2.2, 0.45, 3.66], hidden: true } } : {})
  };
  const look3 = D ? [-4.8, 2.7] : B ? 'lb1' : SC ? [2.2, 0.0] : 'b3';
  const lookEnd = B ? 'sara' : SC ? 'mira' : 'per';
  const standSteps = (path, arrive, show) => {
    const writeAt = w1 ? T.ans1 + 1.6 : w2 ? 37.2 : wB ? 50.4 : wC ? 51.6 : w3 ? T.ans3 + 1.2 : null;
    const mid = w1 || w2 ? [{ clip: 'guest.standBar', until: writeAt, face: -Math.PI / 2, look: 'per' }]
      : [{ clip: 'guest.standBar', until: T.ask3 - 2.4, face: -Math.PI / 2, look: 'per' },
        SC ? { clip: 'host.checkBook', until: T.ans3, face: -Math.PI / 2, look: 'per' } : { clip: 'guest.standBar', until: w3 && !wB ? writeAt : T.ans3, face: -Math.PI / 2, look: look3 },
        // B, fel: handläggaren ser Sara hälla upp. C, fel: handläggaren vänder sig till Mira och frågar henne.
        ...(wB ? [{ clip: 'guest.standBar', until: writeAt, face: -Math.PI / 2, look: 'sara' }] : []),
        ...(wC ? [{ clip: 'guest.standBar', until: 45.0, face: -Math.PI / 2, look: 'per' }, { clip: 'staff.beckon', face: -1.45, look: 'mira' }, { clip: 'guest.standBar', until: writeAt, face: -Math.PI / 2, look: 'mira' }] : [])];
    return [
      { clip: 'guest.walk', path, until: arrive },
      { clip: 'guest.standBar', until: 8, face: -Math.PI / 2, look: 'b3' },
      { clip: 'guest.standBar', until: show, face: -Math.PI / 2, look: 'la1' },
      { clip: 'guest.showId', face: toPer, ev: [{ type: 'show', prop: 'councilId', at: 'show' }, { type: 'hide', prop: 'councilId', at: 'end' }] },
      ...mid,
      writeAt ? { clip: 'staff.write', until: exitAt, face: toPer, ev: [{ type: 'show', prop: 'ipad', at: 0 }, { type: 'hide', prop: 'ipad', at: 'end' }] }
        : { clip: 'guest.standBar', until: exitAt, face: -Math.PI / 2, look: lookEnd },
      { clip: 'guest.walk', path: out, until: exitAt + 6.4 }, { clip: 'staff.idle', until: END }
    ];
  };
  const perSteps = [
    { clip: 'staff.idle', until: 9.2, face: Math.PI / 2, look: 'insp' },
    { clip: 'staff.walk', path: [[5.3, -0.35], [3.4, -0.4]], until: 11.4 },
    { clip: 'staff.idle', until: T.ans1, face: -0.62, look: 'insp' },
    ...(w1 ? [{ clip: 'host.point', face: -1.31 }, { clip: 'host.introduce', face: -0.62 }, { clip: 'staff.listen', until: END, face: -0.62, look: 'insp' }] : [
      { clip: 'host.introduce', face: -0.62 },
      { clip: 'staff.idle', until: T.ans2, face: -0.62, look: 'insp' },
      { clip: 'staff.walk', path: [[5.2, -0.4], [6.05, -0.55]], until: T.ans2 + 2.4 },
      { clip: 'host.fetchFolder', face: Math.PI / 2, ev: [{ type: 'grab', hand: 'R', prop: 'folder', at: 'grab' }] },
      { clip: 'staff.walk', path: [[5.2, -0.4], [3.4, -0.4]], until: T.ans2 + 7.6 },
      { clip: 'staff.openFolder', face: -0.62, ev: [{ type: 'place', prop: 'folder', at: 'end', pos: [2.2, barY, 0.0], yaw: Math.PI / 2 }] },
      ...(SC && !wC ? [{ clip: 'staff.idle', until: T.ans3, face: -0.62, look: 'insp' }, { clip: 'staff.beckon', face: -1.31, look: 'mira' }] : []),
      // C, fel: "Jag skrev den själv." Per visar på sig själv.
      ...(wC ? [{ clip: 'staff.idle', until: T.ans3, face: -0.62, look: 'insp' }, { clip: 'host.introduce', face: -0.62 }] : []),
      ...(wB ? [{ clip: 'staff.idle', until: T.ans3, face: -0.62, look: 'insp' }] : []),
      { clip: 'staff.idle', until: END, face: -0.62, look: SC ? 'mira' : wB ? 'sara' : 'insp' }
    ])
  ];
  const actors = {
    insp: { kind: 'guest', look: 'medel', hm: 1.0, pos: [8.3, 0.2], yaw: -Math.PI / 2, steps: standSteps([[7.0, 0.25], [5.6, 1.2], [3.7, 0.85], [2.85, 0.3]], 5.0, 11.6) },
    pol: { kind: 'guest', look: 'hog', hm: 1.06, pos: [8.7, 0.6], yaw: -Math.PI / 2, steps: [
      { clip: 'guest.walk', path: [[7.3, 0.75], [5.7, 1.7], [3.8, 1.5], [2.85, 0.9]], until: 5.6 },
      { clip: 'guest.standBar', until: 9, face: -Math.PI / 2, look: 'lb1' },
      { clip: 'guest.standBar', until: 13.1, face: -Math.PI / 2, look: 'b3' },
      { clip: 'guest.showId', face: 2.3, ev: [{ type: 'show', prop: 'policeId', at: 'show' }, { type: 'hide', prop: 'policeId', at: 'end' }] },
      ...(w1 || w2 ? [{ clip: 'guest.standBar', until: exitAt, face: -Math.PI / 2, look: 'per' }] : [
        { clip: 'guest.standBar', until: T.ask3 - 2.4, face: -Math.PI / 2, look: 'per' },
        { clip: 'guest.standBar', until: T.ans3, face: -Math.PI / 2, look: look3 },
        ...(wA ? [{ clip: 'staff.decline', face: 2.3, look: 'per' }] : []),
        ...(wB ? [{ clip: 'guest.standBar', until: 50.6, face: -Math.PI / 2, look: 'sara' }, { clip: 'staff.decline', face: 2.3, look: 'per' }] : []),
        ...(wC ? [{ clip: 'guest.standBar', until: 46.6, face: -Math.PI / 2, look: 'per' }, { clip: 'guest.standBar', until: 51.6, face: -Math.PI / 2, look: 'mira' }] : []),
        { clip: 'guest.standBar', until: exitAt, face: -Math.PI / 2, look: 'per' }]),
      { clip: 'guest.walk', path: out.map(([x, z]) => [x + 0.3, z + 0.5]), until: exitAt + 6.8 }, { clip: 'staff.idle', until: END }
    ] },
    per: { kind: 'staff', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: perSteps },
    elin: { kind: 'staff', look: 'sommelier', pos: [1.3, 0.74], yaw: Math.PI / 2, steps: [
      { clip: 'staff.idle', until: 5.2, face: Math.PI / 2, look: 'insp' },
      { clip: 'staff.walk', path: [[1.5, 0.6]], until: 6.0 },
      { clip: 'bar.pourWater', face: Math.PI / 2, ev: [{ type: 'show', prop: 'carafe', at: 0 }, { type: 'show', prop: 'wa', at: 0.4 }, { type: 'show', prop: 'wb', at: 0.75 }, { type: 'hide', prop: 'carafe', at: 'end' }] },
      { clip: 'staff.idle', until: END, face: Math.PI / 2, look: 'insp' }
    ] },
    mira: { kind: 'staff', look: 'bartender', pos: [-0.9, 0.74], yaw: 0, steps: wC ? [
      // C, fel: Mira kommer när handläggaren vinkar, lyssnar och skakar på huvudet. Hon vet inte vad som står i egenkontrollen.
      { clip: 'bar.wipe', until: 46.8, face: 0 },
      { clip: 'staff.walk', path: [[1.0, 0.74], [1.95, 0.6]], until: 48.8 },
      { clip: 'staff.listen', until: 49.2, face: Math.PI / 2, look: 'insp' },
      { clip: 'staff.decline', face: Math.PI / 2, look: 'insp' },
      { clip: 'staff.listen', until: END, face: Math.PI / 2, look: 'insp' }
    ] : SC ? [
      { clip: 'bar.wipe', until: T.ans3 + 1.4, face: 0 },
      { clip: 'staff.walk', path: [[1.0, 0.74], [1.95, 0.6]], until: T.ans3 + 3.6 },
      { clip: 'staff.listen', until: T.ans3 + 5.6, face: Math.PI / 2, look: 'insp' },
      { clip: 'host.point', face: 2.5, ctx: { yaw: 0.4 } },
      { clip: 'staff.listen', until: END, face: Math.PI / 2, look: 'insp' }
    ] : fs == null && !D && !B ? [
      { clip: 'bar.wipe', until: T.ans3, face: 0 },
      { clip: 'staff.walk', path: [[1.45, 0.3]], until: T.ans3 + 2.2 },
      { clip: 'staff.write', until: exitAt, face: Math.PI / 2, ev: [{ type: 'show', prop: 'mpad', at: 0 }] },
      { clip: 'staff.idle', until: END, face: Math.PI / 2, look: 'per' }
    ] : [{ clip: 'bar.wipe', until: END, face: 0 }] },
    sara: { kind: 'staff', look: 'servitor', pos: [-4.1, 2.7], yaw: -Math.PI / 2, steps: [
      { clip: 'staff.idle', until: D ? T.ans3 + 5.2 : B ? 27.5 : END, face: -Math.PI / 2, look: 'cook' },
      ...(B ? [
        { clip: 'staff.walk', path: [[-3.6, 3.12], [1.5, 3.12], [1.75, 3.25]], until: 31.2 },
        { clip: 'waiter.takeOrder', until: T.ask3 - 2.4, face: 0, look: 'lb1', ev: [{ type: 'show', prop: 'spad', at: 0 }, { type: 'hide', prop: 'spad', at: 'end' }] },
        { clip: 'staff.idle', until: T.ans3 + 0.2, face: 0, look: 'lb1' },
        ...(wB ? [
          // B, fel: Sara frågar hur gamla de är, litar på svaret, hämtar flaskan på disken och häller upp.
          { clip: 'staff.listen', until: 44.4, face: 0, look: 'lb1' },
          { clip: 'staff.walk', path: [[1.6, 2.7], [1.5, 2.2]], until: 45.8 },
          { clip: 'staff.idle', until: 46.8, face: Math.PI, ev: [{ type: 'grab', hand: 'R', prop: 'sbottle', at: 0.1 }] },
          { clip: 'staff.walk', path: [[1.75, 3.25]], until: 48.0 },
          { clip: 'somm.pour', face: 0, ev: [{ type: 'show', prop: 'yg1', at: 0.5 }] },
          { clip: 'somm.pour', face: 0.35, ev: [{ type: 'show', prop: 'yg2', at: 0.5 }] },
          { clip: 'staff.idle', until: END, face: 0, look: 'lb2' }
        ] : [
          { clip: 'staff.checkId', face: 0, look: 'lb1' },
          { clip: 'staff.checkId', face: 0.3, look: 'lb2' },
          { clip: 'staff.idle', until: END, face: 0, look: 'lb2' }
        ])
      ] : []),
      ...(D ? [
        { clip: 'waiter.pickUp', face: -Math.PI / 2, ev: [{ type: 'grab', hand: 'R', prop: 'dish', at: 'grab' }] },
        { clip: 'waiter.carryPlate', path: [[-3.6, 3.12], [3.3, 3.12], [3.6, 2.0], [3.5, 0.2]] },
        { clip: 'waiter.serve', face: -Math.PI / 2, ev: [{ type: 'release', hand: 'R', prop: 'dish', at: 'release', surface: barY, put: [2.15, -0.35] }] },
        { clip: 'staff.idle', until: END, face: -Math.PI / 2, look: 'insp' }
      ] : [])
    ] },
    cook: { kind: 'staff', look: 'kock', pos: [-6.2, 3.9], yaw: -Math.PI / 2, steps: D ? [
      { clip: 'cook.station', until: 5.5, face: -Math.PI / 2 },
      { clip: 'staff.walk', path: [[-5.2, 2.8]], until: 7.0 },
      { clip: 'staff.decline', face: Math.PI / 2, look: 'sara' },
      { clip: 'staff.walk', path: [[-6.2, 3.9]], until: 11.0 },
      { clip: 'cook.station', until: T.ans3, face: -Math.PI / 2 },
      { clip: 'staff.walk', path: [[-5.2, 2.8]], until: T.ans3 + 1.4 },
      { clip: 'cook.plate', face: Math.PI / 2, ev: [{ type: 'show', prop: 'dish', at: 0 }, { type: 'fill', prop: 'dish', at: 'plated' }] },
      { clip: 'cook.toPass', face: Math.PI / 2 },
      { clip: 'cook.station', until: END, face: -Math.PI / 2 }
    ] : [{ clip: 'cook.station', until: END, face: -Math.PI / 2 }] },
    b3: sit('bar3', 'medel2', 1.04, END, 'b2'), b2: sit('bar2', 'medel', 1.0, END, 'b3'), b1: sit('bar1', 'student', 0.98, END, 'b2'),
    la1: sit('loungeA1', 'medel3', 1.0, END, 'la2'), la2: sit('loungeA2', 'social', 0.94, END, 'la1'),
    lb1: wB ? sit('loungeB1', 'student', 0.93, END, 'lb2', [
        { clip: 'guest.gesture', until: 31.2, seat: 'loungeB1', look: 'lb2' }, { clip: 'guest.seatedIdle', until: T.ans3 + 0.4, look: 'sara' },
        { clip: 'guest.gesture', until: 44.4, look: 'sara' }, { clip: 'guest.seatedIdle', until: 50.6, look: 'sara' },
        { clip: 'guest.lean', until: END, look: 'lb2' }])
      : B ? sit('loungeB1', 'student', 0.93, END, 'lb2', [
        { clip: 'guest.gesture', until: 31.2, seat: 'loungeB1', look: 'lb2' }, { clip: 'guest.seatedIdle', until: T.ans3 + 0.5, look: 'sara' },
        { clip: 'guest.showIdSeated', ev: [{ type: 'show', prop: 'yid1', at: 'grab' }, { type: 'hide', prop: 'yid1', at: 'end' }] },
        { clip: 'guest.seatedIdle', until: END, look: 'lb2' }])
      : sit('loungeB1', 'hog', 1.05, END, 'lb2'),
    lb2: wB ? sit('loungeB2', 'jacka', 0.95, END, 'lb1', [{ clip: 'guest.seatedIdle', until: END, seat: 'loungeB2', look: 'sara' }])
      : B ? sit('loungeB2', 'jacka', 0.95, END, 'lb1', [
        { clip: 'guest.seatedIdle', until: T.ans3 + 3.4, seat: 'loungeB2', look: 'sara' },
        { clip: 'guest.showIdSeated', ev: [{ type: 'show', prop: 'yid2', at: 'grab' }, { type: 'hide', prop: 'yid2', at: 'end' }] },
        { clip: 'guest.seatedIdle', until: END, look: 'lb1' }])
      : sit('loungeB2', 'medel2', 0.96, END, 'lb1')
  };
  const end = near(3.4, 0.5, 13, 0.62);
  const cam = [{ t: 0, v: GAME }, { t: 4.6, v: end },
    ...(B ? [{ t: 27.5, v: near(2.6, 2.2, 13, 0.62) }, { t: T.ask3 - 2.4, v: near(2.0, 4.0, 11, 0.5), rate: 1.7 }, ...(wB ? [{ t: 44.6, v: near(1.8, 3.0, 11, 0.5) }, { t: 49.6, v: near(2.4, 2.0, 13, 0.62) }] : [{ t: T.ans3 + 7, v: end }])] : []),
    ...(SC ? [{ t: T.ask3 - 2.4, v: near(2.4, 0.2, 11, 0.62), rate: 1.7 }, { t: T.ans3, v: near(2.2, 0.4, 12, 0.62) }, ...(wC ? [{ t: 46.6, v: near(1.4, 0.5, 12, 0.62) }] : [])] : []),
    ...((fs == null || w3) && !B && !SC ? [{ t: T.ask3 - 2.4, v: D ? near(-4.6, 2.8, 12, 0.9) : near(-0.9, 2.2, 12, 0.3), rate: 1.7 }, { t: T.ans3, v: end }] : []),
    ...(D ? [{ t: T.ans3 + 3, v: near(-4.6, 2.8, 12, 0.9) }, { t: T.ans3 + 7.5, follow: 'sara', dist: 13 }, { t: T.ans3 + 15, v: end }] : []),
    { t: BACK, v: GAME, rate: 1.9 }];
  const spot = [{ t: 4.6, who: 'insp' }, { t: 9.2, who: 'per' }, { t: 11.6, who: 'insp' }, { t: 13.1, who: 'pol' }, { t: T.ans1, who: 'per' },
    ...(w1 ? [{ t: T.ans1 + 1.6, who: 'insp' }] : wB ? [{ t: 27.5, who: 'sara' }, { t: T.ask3 - 2.4, who: 'lb1' }, { t: T.ans3, who: 'sara' }, { t: 42.4, who: 'lb1' }, { t: 44.6, who: 'sara' }, { t: 50.4, who: 'insp' }, { t: 50.6, who: 'pol' }]
      : wC ? [{ t: T.ask3 - 2.4, who: 'insp' }, { t: T.ans3, who: 'per' }, { t: 45.0, who: 'insp' }, { t: 46.8, who: 'mira' }, { t: 51.6, who: 'insp' }] : [
      ...(w2 ? [{ t: 37.2, who: 'insp' }] : [
        ...(B ? [{ t: 27.5, who: 'sara' }] : []),
        { t: T.ask3 - 2.4, who: D ? 'cook' : B ? 'lb1' : SC ? 'insp' : 'b3' }, { t: T.ans3, who: D ? 'cook' : B ? 'sara' : w3 ? 'pol' : 'mira' },
        ...(D ? [{ t: T.ans3 + 7.5, who: 'sara' }] : []), ...(w3 ? [{ t: T.ans3 + 1.2, who: 'insp' }] : [])])]),
    { t: exitAt, who: 'insp' }, { t: BACK, who: null }];
  const V = D ? 'D' : B ? 'B' : SC ? 'C' : 'A';
  const extra = [{ t: exitAt, key: 'iexit' }, ...(fs == null || w3 ? [{ t: T.ask3 - 2.4, key: 'iask' + V }] : [])];
  const ch = chaptersOf('i', T, fs, BACK, extra).map((c) => (V !== 'A' && (c.key === 'iend3' || c.key === 'ifail3') ? { ...c, key: c.key.slice(0, -1) + V } : c));
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], beats: { cam, spot, card: cardOf(T, fs, BACK), chapters: ch } };
}

// ---------- Manus 5 · Gästen vid passet ----------
// Matskribenten i lounge A går till passluckan mitt i rusningen.
export function kitchen(C, variant) {
  const fs = stepOf(variant), w1 = fs === 0, w2 = fs === 1, w3 = fs === 2;
  const T = { ask1: 7.2, ans1: 10.7, ask2: 14.5, ans2: 18, ask3: 27.5, ans3: 31 };
  const END = w1 ? 28 : w2 ? 33 : w3 ? 47 : 46, BACK = w1 ? 25 : w2 ? 30 : w3 ? 44 : 40.2;
  const props = {
    apron: { type: 'apron', hand: ['cook', 'L'], hidden: true },
    dish: { type: 'sidePlate', at: [-4.8, 1.1, 2.75], hidden: true, fill: false },
    p1: { type: 'sidePlate', at: [-2.3, 0.45, 3.62] }, p2: { type: 'sidePlate', at: [-2.05, 0.45, 3.82] }, wg: { type: 'wineGlass', at: [-2.5, 0.45, 3.8] },
    bill: { type: 'billFolder', hand: ['per', 'R'], hidden: true }
  };
  const round = [[-4.3, 2.3], [-4.45, 1.3], [-5.1, 1.25]];
  const home = [[-4.45, 1.3], [-4.3, 2.3], [-3.9, 3.4], [-2.6, 4.45]];
  const wSteps = [
    { clip: 'guest.seatedIdle', until: 0.3, seat: 'loungeA1', look: 'la' },
    { clip: 'guest.leaveLounge' },
    { clip: 'rocket.walkToKitchen', path: [[-3.4, 4.2], [-4.0, 3.4], [-4.3, 2.95]], until: 6.2 },
    { clip: 'guest.peek', until: T.ans1, face: -Math.PI / 2 },
    ...(w1 ? [
      { clip: 'guest.walk', path: [...round, [-5.1, 2.2], [-5.5, 2.7]], until: 15.6 },
      { clip: 'staff.idle', until: 16.6, look: 'cook' },
      { clip: 'guest.walk', tempo: 'calm', path: [[-5.1, 2.0], [-5.1, 1.15], [-4.3, 1.05]], until: 21.5 },
      { clip: 'staff.idle', until: END, look: 'per' }
    ] : [
      { clip: 'staff.idle', until: T.ans2, look: 'cook' },
      ...(w2 ? [
        { clip: 'guest.walk', path: [...round, [-5.2, 2.4], [-5.8, 3.0]], until: 23 },
        { clip: 'staff.idle', until: 25.2, look: 'cook' },
        { clip: 'guest.walk', tempo: 'calm', path: [[-5.1, 1.9], [-5.1, 1.1], [-4.2, 1.0]], until: 29.2 },
        { clip: 'staff.idle', until: END, look: 'per' }
      ] : [
        { clip: 'guest.walk', path: round, until: 21.2 },
        { clip: 'staff.idle', until: 22.4, face: 0, look: 'cook' },
        { clip: 'guest.peek', until: 26.4, face: 0 },
        { clip: 'staff.idle', until: T.ans3, face: 0, look: 'cook' },
        { clip: 'guest.walk', path: home, until: 36.5, ev: [{ type: 'hide', prop: 'apron', at: 0 }] },
        { clip: 'guest.sitLounge', seat: 'loungeA1' },
        ...(w3 ? [{ clip: 'guest.seatedIdle', until: 40.5, look: 'per' }, { clip: 'guest.pay' }] : []),
        { clip: 'guest.seatedIdle', until: END, look: w3 ? 'per' : 'sara' }
      ])
    ])
  ];
  const cookSteps = [
    { clip: 'cook.station', tempo: 'stressed', until: 5.8, face: -Math.PI / 2 },
    { clip: 'cook.station', tempo: 'stressed', until: T.ans1, face: -Math.PI / 2, look: 'w' },
    ...(w1 ? [
      { clip: 'staff.walk', path: [[-5.6, 3.2]], until: 15.4 },
      { clip: 'staff.halt', face: Math.PI, look: 'w' },
      { clip: 'staff.escort', path: [[-5.2, 2.2], [-5.1, 1.5]], until: 20.5 },
      { clip: 'staff.idle', until: END, face: Math.PI, look: 'w' }
    ] : [
      { clip: 'staff.walk', path: [[-5.2, 2.95]], until: T.ans1 + 1.4 },
      { clip: 'staff.halt', face: Math.PI / 2, look: 'w' },
      { clip: 'staff.idle', until: T.ans2, face: Math.PI / 2, look: 'w' },
      ...(w2 ? [
        { clip: 'staff.walk', path: [[-5.9, 3.5]], until: 21.5 },
        { clip: 'staff.dodge', path: [[-6.3, 3.9]], side: 1 },
        { clip: 'staff.idle', until: END, face: Math.PI / 2, look: 'w' }
      ] : [
        { clip: 'staff.walk', path: [[-5.3, 2.3], [-5.1, 1.95]], until: 19.4, ev: [{ type: 'show', prop: 'apron', at: 0 }] },
        { clip: 'staff.holdDoor', until: 26.4, face: Math.PI, ev: [{ type: 'give', prop: 'apron', to: ['w', 'L'], at: 0.45 }] },
        { clip: 'staff.walk', path: [[-5.2, 2.95]], until: 27.6 },
        { clip: 'staff.idle', until: T.ans3, face: Math.PI / 2, look: 'w' },
        ...(w3 ? [{ clip: 'cook.station', until: END, face: -Math.PI / 2 }] : [
          { clip: 'cook.plate', face: Math.PI / 2, ev: [{ type: 'show', prop: 'dish', at: 0 }, { type: 'fill', prop: 'dish', at: 'plated' }] },
          { clip: 'cook.toPass', face: Math.PI / 2 },
          { clip: 'cook.station', until: END, face: -Math.PI / 2 }
        ])
      ])
    ])
  ];
  const saraSteps = [
    { clip: 'staff.idle', until: 5.0, face: -Math.PI / 2, look: 'w' },
    { clip: 'staff.dodge', path: [[-4.0, 2.1]], side: 1 },
    { clip: 'staff.idle', until: fs == null ? 36.6 : END, face: -Math.PI / 2, look: 'w' },
    ...(fs == null ? [
      { clip: 'staff.walk', path: [[-4.2, 2.75]], until: 37.3 },
      { clip: 'waiter.pickUp', face: -Math.PI / 2, ev: [{ type: 'grab', hand: 'R', prop: 'dish', at: 'grab' }] },
      { clip: 'waiter.carryPlate', path: [[-3.6, 3.15], [-2.4, 3.2]] },
      { clip: 'waiter.serve', face: 0, ev: [{ type: 'release', hand: 'R', prop: 'dish', at: 'release', surface: 0.45, put: [-2.25, 3.62] }] },
      { clip: 'staff.idle', until: END, face: 0, look: 'w' }
    ] : [])
  ];
  const failAt = fs == null ? null : T['ans' + (fs + 1)];
  const per = failAt == null ? { kind: 'staff', look: 'hovmastare', pos: [1.0, 3.1], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: END, look: 'w' }] }
    : { kind: 'staff', look: 'hovmastare', pos: [1.0, 3.1], yaw: -Math.PI / 2, steps: [
      { clip: 'staff.idle', until: failAt + 0.6, look: 'w' },
      ...(w3 ? [
        { clip: 'staff.walk', path: [[-1.2, 3.15], [-2.9, 4.0]], until: 39.6, ev: [{ type: 'show', prop: 'bill', at: 0 }] },
        { clip: 'waiter.presentBill', face: 0.2 },
        { clip: 'staff.listen', until: END, face: 0.2, look: 'w' }
      ] : [
        { clip: 'staff.walk', path: [[-2.4, 3.1], [-3.8, 1.8], [-4.4, 1.25]], until: failAt + 5.8 },
        { clip: 'staff.listen', until: END, face: -Math.PI / 2, look: 'w' }
      ])
    ] };
  const actors = {
    w: { kind: 'guest', look: 'hog', hm: 0.97, pos: [0, 0], steps: wSteps },
    cook: { kind: 'staff', look: 'kock', pos: [-6.2, 3.9], yaw: -Math.PI / 2, steps: cookSteps },
    sara: { kind: 'staff', look: 'servitor', pos: [-4.1, 2.7], yaw: -Math.PI / 2, steps: saraSteps },
    per,
    elin: { kind: 'staff', look: 'sommelier', pos: [1.3, 0.74], yaw: 0, steps: [{ clip: 'staff.idle', until: END, look: 'lb1' }] },
    mira: { kind: 'staff', look: 'bartender', pos: [-0.9, 0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: END, face: 0 }] },
    dish1: { kind: 'staff', look: 'diskare', pos: [-6.4, 2.75], yaw: Math.PI, steps: [{ clip: 'dish.wash', until: END, face: Math.PI }] },
    la: sit('loungeA3', 'medel', 1.0, END, 'w'),
    lb1: sit('loungeB1', 'social', 0.94, END, 'lb2'), lb2: sit('loungeB2', 'medel3', 1.02, END, 'lb1'),
    b1: sit('bar1', 'medel2', 1.0, END, 'b2'), b2: sit('bar2', 'student', 0.97, END, 'b1'), b4: sit('bar4', 'medel', 1.03, END, 'mira')
  };
  const pass = near(-4.7, 2.7, 12, 1.0), door = near(-4.9, 1.4, 12, 1.0);
  const cam = [{ t: 0, v: GAME }, { t: 0.2, v: pass },
    ...(w1 ? [{ t: T.ans1 + 3, v: door }] : w2 ? [{ t: T.ans2 + 1.5, v: door }] : [{ t: T.ans2 + 1.2, v: door }, { t: T.ans3, v: pass }]),
    { t: BACK, v: GAME, rate: 1.9 }];
  const spot = [{ t: 0.2, who: 'w' }, { t: 5.8, who: 'cook' }, { t: 6.4, who: 'w' }, { t: T.ans1, who: 'cook' },
    ...(w1 ? [{ t: T.ans1 + 1, who: 'w' }, { t: 17, who: 'cook' }] : [
      { t: T.ans2, who: 'cook' }, { t: T.ans2 + 1.4, who: 'w' },
      ...(w2 ? [{ t: 23, who: 'cook' }, { t: 24.5, who: 'per' }] : [{ t: T.ans3, who: w3 ? 'w' : 'cook' }, ...(w3 ? [{ t: 38, who: 'per' }] : [{ t: 36.6, who: 'sara' }])])]),
    { t: BACK, who: null }];
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: END, props, actors, effects: [], beats: { cam, spot, card: cardOf(T, fs, BACK), chapters: chaptersOf('k', T, fs, BACK) } };
}

export const EVENTS = [
  { id: 'bday', build: birthday, variants: ['right', 'wrong1', 'wrong2', 'wrong3'] },
  { id: 'vase', build: vase, variants: ['right', 'wrong1', 'wrong2', 'wrong3'] },
  { id: 'drunk', build: drunk, variants: ['right', 'wrong1', 'wrong2', 'wrong3'] },
  { id: 'inspection', build: inspection, variants: ['right', 'rightB', 'rightC', 'rightD', 'wrong1', 'wrong2', 'wrong3', 'wrongB3', 'wrongC3'] },
  { id: 'kitchen', build: kitchen, variants: ['right', 'wrong1', 'wrong2', 'wrong3'] },
  { id: 'falls', build: propFalls, variants: ['right'] }
];
