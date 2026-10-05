// foljderManus.js — D5 (2026-10-04): följderna och konceptet som scener för teaterScen. Läses, monteras inte.
// Koordinater i vinbarens lokala XZ (meter). Gästernas utseende ur guestGroups.ts (look 'g_<grupp><variant>').
// status: kvällens läge per person (orken, trivseln, kunskapsområdena, dricksen) för statusläget och korten.
// Talen i status är exempel för prototypen. I spelet kommer de från sim-lagret och balance.ts.

export const GAME = { tx: 0.2, ty: 0.4, tz: 0.4, dist: 24, yaw: 0.7, pitch: 0.873 };
const near = (x, z, dist, yaw, pitch) => ({ tx: x, ty: 0.6, tz: z, dist, yaw: yaw ?? 0.7, pitch: pitch ?? 0.873 });
const PI = Math.PI;

const G = (seat, grp, v, hm, lk, gest, at) => ({ kind: 'guest', look: 'g_' + grp + v, group: grp, variant: v, hm, pos: [0, 0],
  steps: [{ clip: 'guest.seatedIdle', until: at ?? 1.2 + hm, seat, look: lk }, ...(gest ? [{ clip: gest, look: lk }] : []), { clip: 'guest.seatedIdle', until: 40, look: lk }] });

// ---------- kvällen i vinbaren (statusläget, korten, pyramiden, fokusläget) ----------
export function service() {
  const actors = {
    la1: G('loungeA1', 'gourmet', 0, 1.02, 'la2', 'guest.laugh', 2.0), la2: G('loungeA2', 'gourmet', 1, 0.96, 'la1'), la3: G('loungeA3', 'business', 0, 1.04, 'la2', 'guest.laugh', 2.6),
    lb1: G('loungeB1', 'tourist', 0, 0.98, 'lb2', 'guest.nodApprove', 3.0), lb2: G('loungeB2', 'tourist', 1, 1.0, 'lb1'), lb3: G('loungeB3', 'villager', 0, 1.03, 'elin', 'guest.leanCurious', 4.2),
    b1: G('bar1', 'student', 0, 0.97, 'b2', 'guest.laugh', 1.6), b2: G('bar2', 'student', 1, 0.99, 'b1'), b3: G('bar3', 'villager', 1, 1.02, 'b4', 'guest.nodApprove', 3.4), b4: G('bar4', 'villager', 0, 0.95, 'b3'),
    b5: G('bar5', 'business', 1, 1.03, 'mira', 'guest.checkWatch', 2.2), b6: G('bar6', 'business', 0, 0.98, 'b5'),
    tb1: G('twoB1', 'villager', 1, 1.0, 'sara', 'guest.waveWaiter', 1.4), tb2: G('twoB2', 'villager', 0, 0.94, 'tb1', 'guest.checkWatch', 3.2),
    tc1: { ...G('twoC1', 'gourmet', 1, 1.0, 'tc2'), steps: [{ clip: 'guest.seatedIdle', until: 1.0, seat: 'twoC1', look: 'tc2' }, { clip: 'guest.armsCrossed', until: 40, look: 'tc2' }] },
    tc2: G('twoC2', 'gourmet', 0, 0.97, 'tc1', 'guest.pushPlate', 1.8),
    per: { kind: 'staff', look: 'hovmastare', role: 'host', pos: [6.05, -0.55], yaw: PI / 2, steps: [{ clip: 'staff.idle', until: 40, face: PI / 2 }] },
    elin: { kind: 'staff', look: 'sommelier', role: 'sommelier', pos: [2.0, 2.95], yaw: 0, steps: [{ clip: 'staff.listen', until: 40, face: 0, look: 'lb2' }] },
    mira: { kind: 'staff', look: 'bartender', role: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.polishGlass', until: 40, face: 0 }] },
    sara: { kind: 'staff', look: 'servitor', role: 'waiter', pos: [3.4, -3.2], yaw: -PI / 2, steps: [{ clip: 'staff.walk', path: [[1.2, -3.3], [0.0, -3.45]], until: 3.4 }, { clip: 'staff.hesitate', face: PI, look: 'tc1' }, { clip: 'staff.tiredIdle', until: 40, face: PI, look: 'tc1' }] },
    jonas: { kind: 'staff', look: 'kock', role: 'cook', pos: [-5.6, 3.4], yaw: -PI / 2, steps: [{ clip: 'cook.station', until: 40, face: -PI / 2 }] },
    leo: { kind: 'staff', look: 'dj', role: 'dj', pos: [6.15, -4.65], yaw: -PI / 4, stand: 0.25, steps: [{ clip: 'cook.station', until: 40, face: -PI / 4 }] }
  };
  const props = {
    bw1: { type: 'wineGlass', at: [-2.2, 0.45, 3.85] }, bw2: { type: 'wineGlass', at: [-1.4, 0.45, 3.8] }, bw3: { type: 'wineBottle', at: [-1.8, 0.45, 3.7] },
    tw1: { type: 'wineGlass', at: [1.6, 0.45, 3.85] }, tw2: { type: 'wineGlass', at: [2.4, 0.45, 3.82] },
    c1: { type: 'plate', at: [-0.25, 0.72, -4.4] }, c2: { type: 'plate', at: [0.25, 0.72, -4.4] }, cg: { type: 'wineGlass', at: [0.0, 0.72, -4.15] },
    s1: { type: 'wineGlass', at: [-2.7, 1.15, 1.42] }, s2: { type: 'wineGlass', at: [-1.8, 1.15, 1.42] }, s3: { type: 'wineGlass', at: [-0.9, 1.15, 1.42] },
    tray: { type: 'tray', hand: ['sara', 'L'] }, tg1: { type: 'wineGlass', on: ['tray', -0.08, 0] }
  };
  // Stämningen per bord: symbolen står över bordets mitt (statusläget visar alla samtidigt).
  const tables = {
    loungeA: { at: [-1.8, 1.75, 5.0], mood: 'delighted', party: 'party.lindqvist', group: 'gourmet', who: ['la1', 'la2', 'la3'] },
    loungeB: { at: [2.0, 1.75, 5.0], mood: 'content', party: 'party.weber', group: 'tourist', who: ['lb1', 'lb2', 'lb3'] },
    barN: { at: [-1.35, 2.15, 2.3], mood: 'delighted', party: 'party.bar', group: 'student', who: ['b1', 'b2', 'b3', 'b4'] },
    barS: { at: [-2.25, 2.15, -2.3], mood: 'waiting', party: 'party.nyberg', group: 'business', who: ['b5', 'b6'] },
    twoB: { at: [-2.1, 1.6, -4.4], mood: 'impatient', party: 'party.olsson', group: 'villager', who: ['tb1', 'tb2'] },
    twoC: { at: [0.0, 1.6, -4.4], mood: 'displeased', party: 'party.hammar', group: 'gourmet', who: ['tc1', 'tc2'] }
  };
  // Personalen i kväll. stamina och wellbeing 0–1 (staffStatus.staminaOf), topics 0–3, null = saknas.
  const staff = {
    per: { name: 'Per', role: 'host', stamina: 0.82, wellbeing: 0.8, tips: 420, topics: { service: 3, wine: 2, cheese: 1, fish: 1 } },
    elin: { name: 'Elin', role: 'sommelier', stamina: 0.5, wellbeing: 0.55, tips: 610, topics: { wine: 3, cheese: 2, spirits: 2, fish: 1 } },
    mira: { name: 'Mira', role: 'bartender', stamina: 0.74, wellbeing: 0.78, tips: 380, topics: { spirits: 3, wine: 1, service: 2, cigar: null } },
    sara: { name: 'Sara', role: 'waiter', stamina: 0.24, wellbeing: 0.28, tips: 90, topics: { service: 2, wine: 1, fish: null, cheese: null } },
    jonas: { name: 'Jonas', role: 'cook', stamina: 0.46, wellbeing: 0.6, tips: 0, topics: { fish: 2, cheese: 1, kitchen: 3, wine: 0 } },
    leo: { name: 'Leo', role: 'dj', stamina: 0.9, wellbeing: 0.5, tips: 0, topics: { music: 3, service: 1 } }
  };
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: 10, actors, props, effects: [], tables, staff, cam: [{ t: 0, v: GAME }] };
}

/** Fokuslägets kamera: från spelets 24 m in mot lounge A, förbi 14 m vid 2,1 s, och ut igen. */
export const FOCUS_CAM = [
  { t: 0, v: GAME }, { t: 0.6, v: GAME },
  { t: 3.2, v: near(-1.4, 3.6, 10.5, 0.6, 0.8), ease: 'inOutSine' }, { t: 6.4, v: near(-1.4, 3.6, 10.5, 0.6, 0.8) },
  { t: 8.6, v: GAME, ease: 'inOutSine' }, { t: 10, v: GAME }
];

// ---------- kvitt eller dubbelt (tillägg 2026-10-05) ----------
// Elin har serverat Chablisen till familjen Weber i lounge B. Spelaren låser svaret vid LOCK, kameran går in till
// bordet, gästen smakar och reagerar, och avgörandet kommer vid DECIDE när reaktionen syns (3,8 s efter låset).
export const STAKE_T = { lock: 0.6, decide: 4.4, countdown: 8 };
/** ORDER 305 B: potten efter n rätta steg i rad när spelaren går vidare. Rätt ger potten × 2 + stegets kredit (balance.ts). */
export const STEP_CREDIT = 1;
export function potAfter(n) { let p = 0; for (let i = 0; i < n; i++) p = p * 2 + STEP_CREDIT; return p; }
export function stake(outcome) {
  const s = service(), D = STAKE_T.decide, right = outcome !== 'wrong';
  const at = [2.0, 4.55], cam = (d) => near(at[0] + STAKE_FRAME.dx * d / 11, at[1] + STAKE_FRAME.dz * d / 11, d, 0.7, 0.82);
  s.actors.lb1 = { ...s.actors.lb1, steps: [{ clip: 'guest.seatedIdle', until: 2.0, seat: 'loungeB1', look: 'elin' },
    { clip: right ? 'guest.tasteApprove' : 'rocket.smellWine', until: D - 0.3, look: 'elin' },
    { clip: right ? 'guest.nodApprove' : 'guest.pushPlate', until: D + 2.6, look: right ? 'lb2' : 'elin' },
    { clip: right ? 'guest.seatedIdle' : 'guest.armsCrossed', until: 40, look: 'lb2' }] };
  s.actors.lb2 = { ...s.actors.lb2, steps: [{ clip: 'guest.seatedIdle', until: D + 0.4, seat: 'loungeB2', look: 'lb1' }, { clip: right ? 'guest.laugh' : 'guest.seatedIdle', until: D + 2.8, look: 'lb1' }, { clip: 'guest.seatedIdle', until: 40, look: 'lb1' }] };
  s.actors.elin = { ...s.actors.elin, steps: [{ clip: 'staff.listen', until: 40, face: 0, look: 'lb1' }] };
  s.tables.loungeB.mood = 'content';
  s.sym = [{ t: 0, anchor: s.tables.loungeB.at, mood: 'content' }, { t: D + 0.5, anchor: s.tables.loungeB.at, mood: right ? 'delighted' : 'displeased' }];
  s.tables = { ...s.tables }; delete s.tables.loungeB;
  s.end = right ? D + 1.2 + STAKE_T.countdown + 0.8 : 9.6;
  s.cam = right
    ? [{ t: 0, v: GAME }, { t: STAKE_T.lock + 0.2, v: GAME }, { t: STAKE_T.lock + 1.8, v: cam(11), ease: 'inOutSine' }, { t: s.end, v: cam(10.6) }]
    : [{ t: 0, v: GAME }, { t: STAKE_T.lock + 0.2, v: GAME }, { t: STAKE_T.lock + 1.8, v: cam(11), ease: 'inOutSine' }, { t: D + 1.8, v: cam(10.8) }, { t: D + 3.8, v: GAME, ease: 'inOutSine' }, { t: s.end, v: GAME }];
  return s;
}
/** Förskjutningen av kamerans mål i meter vid 11 m, så att bordet hamnar till vänster om kolumnen. */
export const STAKE_FRAME = { dx: 1.7, dz: -1.5 };

// ---------- gästgrupperna ----------
// Fem grupper i två rader på det öppna golvet mellan baren och dörren, två av varje (variant 0 och 1). 14 m.
export function groups() {
  const order = ['student', 'villager', 'tourist', 'gourmet', 'business'], actors = {};
  order.forEach((g, i) => [0, 1].forEach((v) => {
    actors[g + v] = { kind: 'guest', look: 'g_' + g + v, group: g, variant: v, hm: v ? 0.97 : 1.03, pos: [3.3 + i * 0.75, v ? 1.75 : 0.65], yaw: 0.7, steps: [{ clip: 'guest.queueCalm', until: 40, face: 0.7 }] };
  }));
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: 10, actors, props: {}, effects: [], order,
    cam: [{ t: 0, v: near(4.8, 1.2, 14, 0.7, 0.873) }], camSeated: near(0.1, 3.3, 14, 0.7, 0.873) };
}

// ---------- utrustningen ----------
export const EQUIP_IDS = ['wineFridge', 'humidor', 'flambeCart', 'cheeseCart', 'avecCart'];
export function equipment() {
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: 10, effects: [], props: {},
    actors: { per: { kind: 'staff', look: 'hovmastare', role: 'host', pos: [6.05, -0.55], yaw: PI / 2, steps: [{ clip: 'staff.idle', until: 40, face: PI / 2 }] } },
    equipment: EQUIP_IDS.map((id) => ({ id, home: true })),
    cam: [{ t: 0, v: GAME }], camViews: { all: GAME, carts: near(-6.0, -1.0, 11, 1.25, 0.8), cabinets: near(4.8, -0.9, 13, 0.95, 0.8) } };
}

// Flambering vid bordet: Per skjuter vagnen från hörnet till tvåan B, går runt den, visar, häller, lågan tar sig,
// lutar pannan och visar rätten. Gästerna lutar sig fram när lågan står och skrattar efteråt. Grannarna vid tvåan C tittar.
export function flambe() {
  const LIGHT = 6.6 + 0.82 * 2.4;
  const actors = {
    per: { kind: 'staff', look: 'hovmastare', role: 'host', pos: [-5.6, -3.3], yaw: PI / 2, steps: [
      { clip: 'trolley.push', path: [[-2.95, -3.3]], until: 3.4 },
      { clip: 'staff.walk', path: [[-2.95, -2.75], [-2.03, -2.75]], until: 4.6 },
      { clip: 'trolley.present', until: 6.6, face: PI, look: 'tb1' },
      { clip: 'flambe.pour', until: 9.0, face: PI },
      { clip: 'flambe.tilt', until: 12.4, face: PI },
      { clip: 'trolley.present', until: 14.4, face: PI, look: 'tb2' },
      { clip: 'staff.idle', until: 17, face: PI, look: 'tb1' }] },
    tb1: { ...G('twoB1', 'gourmet', 0, 1.02, 'per'), steps: [{ clip: 'guest.seatedIdle', until: LIGHT - 0.1, seat: 'twoB1', look: 'per' }, { clip: 'guest.leanCurious', look: 'per' }, { clip: 'guest.laugh', look: 'tb2' }, { clip: 'guest.seatedIdle', until: 17, look: 'per' }] },
    tb2: { ...G('twoB2', 'business', 1, 0.97, 'per'), steps: [{ clip: 'guest.seatedIdle', until: LIGHT + 0.1, seat: 'twoB2', look: 'per' }, { clip: 'guest.leanCurious', look: 'per' }, { clip: 'guest.nodApprove', look: 'per' }, { clip: 'guest.seatedIdle', until: 17, look: 'tb1' }] },
    tc1: { ...G('twoC1', 'tourist', 0, 1.0, 'per'), steps: [{ clip: 'guest.seatedIdle', until: LIGHT + 0.3, seat: 'twoC1', look: 'per' }, { clip: 'guest.leanCurious', look: 'per' }, { clip: 'guest.seatedIdle', until: 17, look: 'per' }] },
    tc2: G('twoC2', 'tourist', 1, 0.95, 'per', 'guest.nodApprove', LIGHT + 1.2),
    ta1: G('twoA1', 'villager', 0, 1.0, 'ta2'), ta2: G('twoA2', 'villager', 1, 0.96, 'per', 'guest.leanCurious', LIGHT + 0.5)
  };
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: 17, actors, effects: [], props: { p1: { type: 'plate', at: [0.25, 0.72, -4.4] }, g1: { type: 'wineGlass', at: [-1.9, 0.72, -4.2] }, g2: { type: 'wineGlass', at: [-2.3, 0.72, -4.6] } },
    carts: [{ id: 'flambeCart', pusher: 'per', pushes: [[0, 3.4]] }], flame: { cart: 0, lightAt: LIGHT, panTilt: [9.0, 12.4] },
    sym: [{ t: 0, anchor: [-2.1, 1.6, -4.4], mood: 'content' }, { t: LIGHT + 0.9, anchor: [-2.1, 1.6, -4.4], mood: 'delighted' }, { t: 0, anchor: [0.0, 1.6, -4.4], mood: 'content' }],
    cam: [{ t: 0, v: near(-4.3, -3.2, 14, 0.62, 0.86) }, { t: 3.4, v: near(-2.6, -3.4, 12, 0.62, 0.84), ease: 'inOutSine' }, { t: 6.4, v: near(-2.05, -3.55, 9.5, 0.5, 0.78), ease: 'inOutSine' },
      { t: 12.6, v: near(-2.05, -3.55, 9.0, 0.48, 0.76) }, { t: 15.6, v: near(-2.2, -3.0, 14, 0.62, 0.86), ease: 'inOutSine' }, { t: 17, v: near(-2.2, -3.0, 14, 0.62, 0.86) }],
    chapters: [{ t: 0, key: 'push' }, { t: 3.4, key: 'round' }, { t: 4.6, key: 'present' }, { t: 6.6, key: 'pour' }, { t: LIGHT, key: 'flame' }, { t: 12.4, key: 'show' }, { t: 14.4, key: 'back' }] };
}

// Ostvagnen vid borden: Elin skjuter vagnen till tvåan A, lyfter kupan, berättar och skär. Sedan vidare till tvåan B.
export function cheese() {
  const actors = {
    elin: { kind: 'staff', look: 'sommelier', role: 'sommelier', pos: [-6.4, -3.3], yaw: PI / 2, steps: [
      { clip: 'trolley.push', path: [[-5.2, -3.3]], until: 2.2 },
      { clip: 'staff.walk', path: [[-5.2, -2.75], [-4.25, -2.75]], until: 3.6 },
      { clip: 'trolley.present', until: 6.0, face: PI, look: 'ta1' },
      { clip: 'cheese.cut', until: 9.4, face: PI },
      { clip: 'staff.idle', until: 10.0, face: PI, look: 'ta2' },
      { clip: 'staff.walk', path: [[-5.2, -2.75], [-5.2, -3.3]], until: 11.8 },
      { clip: 'trolley.push', path: [[-3.1, -3.3]], until: 13.8 },
      { clip: 'staff.walk', path: [[-3.1, -2.75], [-2.15, -2.75]], until: 15.2 },
      { clip: 'trolley.present', until: 17.4, face: PI, look: 'tb1' },
      { clip: 'cheese.cut', until: 20.6, face: PI },
      { clip: 'staff.idle', until: 22, face: PI, look: 'tb2' }] },
    ta1: { ...G('twoA1', 'tourist', 0, 1.0, 'elin'), steps: [{ clip: 'guest.seatedIdle', until: 4.2, seat: 'twoA1', look: 'elin' }, { clip: 'guest.leanCurious', look: 'elin' }, { clip: 'guest.seatedIdle', until: 9.3, look: 'elin' }, { clip: 'guest.nodApprove', look: 'ta2' }, { clip: 'guest.seatedIdle', until: 22, look: 'ta2' }] },
    ta2: G('twoA2', 'tourist', 1, 0.96, 'elin', 'guest.laugh', 9.5),
    tb1: { ...G('twoB1', 'gourmet', 1, 1.03, 'tb2'), steps: [{ clip: 'guest.seatedIdle', until: 2.0, seat: 'twoB1', look: 'tb2' }, { clip: 'guest.checkWatch', look: 'elin' }, { clip: 'guest.seatedIdle', until: 15.4, look: 'elin' }, { clip: 'guest.leanCurious', look: 'elin' }, { clip: 'guest.seatedIdle', until: 20.4, look: 'elin' }, { clip: 'guest.nodApprove', look: 'tb2' }, { clip: 'guest.seatedIdle', until: 22, look: 'tb2' }] },
    tb2: G('twoB2', 'gourmet', 0, 0.97, 'elin', 'guest.laugh', 20.7)
  };
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: 22, actors, effects: [], props: { p1: { type: 'plate', at: [-4.5, 0.72, -4.4] }, p2: { type: 'plate', at: [-3.9, 0.72, -4.4] }, g1: { type: 'wineGlass', at: [-1.9, 0.72, -4.2] } },
    carts: [{ id: 'cheeseCart', pusher: 'elin', pushes: [[0, 2.2], [11.8, 13.8]] }],
    cloche: [{ t: 0, k: 0 }, { t: 3.8, k: 0 }, { t: 4.6, k: 1 }, { t: 10.0, k: 1 }, { t: 10.6, k: 0 }, { t: 15.6, k: 0 }, { t: 16.4, k: 1 }],
    cuts: [[7.6, 9.2], [18.8, 20.4]],
    sym: [{ t: 0, anchor: [-4.2, 1.6, -4.4], mood: 'content' }, { t: 9.4, anchor: [-4.2, 1.6, -4.4], mood: 'delighted' }, { t: 0, anchor: [-2.1, 1.6, -4.4], mood: 'waiting' }, { t: 15.5, anchor: [-2.1, 1.6, -4.4], mood: 'content' }, { t: 20.6, anchor: [-2.1, 1.6, -4.4], mood: 'delighted' }],
    cam: [{ t: 0, v: near(-5.0, -3.2, 13, 0.62, 0.86) }, { t: 3.6, v: near(-4.25, -3.6, 10, 0.5, 0.78), ease: 'inOutSine' }, { t: 10.0, v: near(-4.25, -3.6, 10, 0.5, 0.78) },
      { t: 12.4, v: near(-3.2, -3.3, 13, 0.62, 0.86), ease: 'inOutSine' }, { t: 15.2, v: near(-2.15, -3.6, 10, 0.5, 0.78), ease: 'inOutSine' }, { t: 22, v: near(-2.15, -3.6, 10.5, 0.5, 0.78) }],
    chapters: [{ t: 0, key: 'push' }, { t: 3.6, key: 'cloche' }, { t: 6.0, key: 'cut' }, { t: 10.0, key: 'next' }, { t: 15.2, key: 'again' }] };
}

// Morgonen: den tomma vinbaren i dagsljus bakom recensionerna.
export function morning() { return { set: 'winebar', roomOpts: { mood: 'tidig' }, tempo: 'calm', end: 10, actors: {}, props: {}, effects: [], light: 'day', cam: [{ t: 0, v: near(0.2, 0.6, 20, 0.7, 0.9) }] }; }
