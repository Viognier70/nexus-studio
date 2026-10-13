// d12Manus.js — D12 levande figurer och grillvagnen, tidslinjer för teaterScen. Leverans 2026-10-11.
// Samma format som d11Manus.js. Nytt per aktör: temper (lugn, livlig, reserverad) och group/variant (gästgruppens tecken,
// guestGroups.dressGroup). Nytt per steg: intensity (weak, clear, strong). beats.face har { t, who, mood, k } där k är en
// intensitet; prototypen multiplicerar med temperamentets faceK och låter ansiktet gå över på temperamentets faceTransS.
// Ansiktet följer också gesterna av sig självt (clip.mood) om aktören inte har autoFace: false.
// Vinbaren i vinbarens lokala XZ. Vagnen och torget i vagnens ram från D7 och D10 (grillvagnar.js TRUCK_FRAME).

import { TEMPERAMENT, REACTION_BALANCE } from './gestureMap';

export const GAME = { tx: 0.2, ty: 0.4, tz: 0.4, dist: 24, yaw: 0.7, pitch: 0.873, frame: 0.5 };
export const TRUCK_GAME = { tx: -0.6, ty: 0.6, tz: 1.5, dist: 24, yaw: 0.35, pitch: 0.873, frame: 0.5 };
const near = (x, z, dist, yaw, ty) => ({ tx: x, ty: ty ?? 0.6, tz: z, dist, yaw: yaw ?? 0.7, pitch: 0.873, frame: 0.5 });
const punchU = REACTION_BALANCE.punchU, spreadS = REACTION_BALANCE.spreadS ?? REACTION_BALANCE.spreadSProto;
const STAND = { 'guest.listen': 'guest.listenStand', 'guest.tellJoke': 'guest.tellJokeStand', 'guest.chuckle': 'guest.chuckleStand', 'guest.laugh': 'guest.laughStand', 'guest.laughB': 'guest.laughStandB', 'guest.smileTurn': 'guest.smileTurnStand', 'guest.leanTalk': 'guest.leanTalkStand', 'guest.leanTalkB': 'guest.leanTalkStandB', 'guest.nodApprove': 'guest.nodApproveStand', 'guest.nodApproveB': 'guest.nodApproveStandB', 'guest.seatedIdle': 'staff.idle' };
const fb = (t, who, mood, k, transS) => ({ t, who, mood, k: k ?? 'clear', ...(transS ? { transS } : {}) });

// ---------- samtalen ----------
// Ett sällskap turas om: den som pratar spelar sitt klipp, de andra lyssnar (guest.listen, blicken på den som pratar).
// Ett skämt (tellJoke) följs av svaren i REACTIONS: den närmaste svarar efter sin reactDelayS med temperamentets jokeReply,
// leendet sprider sig till de andra i platsordning (spreadS emellan), och den som berättade småskrattar tillbaka.
// members: [{ id, temper }], turns: [{ who, clip }], standing = vid vagnen. Ger steg per aktör och ansiktena.
export function party(C, members, from, until, turns, o) {
  o = o || {}; const st = !!o.standing, idle = st ? 'staff.idle' : 'guest.seatedIdle', S = (c) => (st ? STAND[c] || c : c);
  const steps = Object.fromEntries(members.map((m) => [m.id, []])), beats = [], marks = [];
  const sec = (c, tempo) => C.CLIPS[S(c)].seconds[tempo || 'normal'];
  const push = (id, s) => steps[id].push(o.face && o.face[id] != null ? { ...s, face: o.face[id] } : s);
  let t = from;
  for (let n = 0; t < until - 1.5; n++) {
    const turn = turns[n % turns.length], sp = members[turn.who], others = members.filter((m, i) => i !== turn.who);
    const dur = sec(turn.clip, turn.tempo), end0 = t + dur;
    push(sp.id, { clip: S(turn.clip), look: others[0].id, tempo: turn.tempo || 'normal', intensity: turn.intensity || 'clear' });
    beats.push(fb(t, sp.id, turn.mood || 'content', 'clear'));
    let turnEnd = end0;
    if (turn.clip === 'guest.tellJoke') {
      const punch = t + punchU * dur; marks.push({ t: punch, who: sp.id, what: 'punch' });
      let firstReply = null;
      others.forEach((m, i) => {
        const T = TEMPERAMENT[m.temper || 'calm'], at = punch + T.reactDelayS + i * spreadS, reply = i === 0 || (m.temper === 'lively') ? T.jokeReply : 'guest.smileTurn';
        push(m.id, { clip: S('guest.listen'), until: at, look: sp.id });
        push(m.id, { clip: S(reply), look: i === 0 ? sp.id : others[0].id });
        beats.push(fb(t + 0.4, m.id, 'content', 'weak')); beats.push(fb(at, m.id, 'delighted', i === 0 ? 'clear' : 'weak'));
        beats.push(fb(at + sec(reply) + 1.6, m.id, 'content', 'clear'));
        if (firstReply == null) firstReply = at;
        turnEnd = Math.max(turnEnd, at + sec(reply));
      });
      const back = Math.max(end0, firstReply + TEMPERAMENT[sp.temper || 'calm'].reactDelayS);
      if (back > end0 + 0.05) push(sp.id, { clip: idle, until: back, look: others[0].id });
      push(sp.id, { clip: S('guest.chuckle'), look: others[0].id });
      beats.push(fb(back, sp.id, 'delighted', 'clear')); beats.push(fb(back + sec('guest.chuckle') + 1.6, sp.id, 'content', 'clear'));
      turnEnd = Math.max(turnEnd, back + sec('guest.chuckle'));
      marks.push({ t: firstReply, who: others[0].id, what: 'reply' });
    } else {
      others.forEach((m) => { push(m.id, { clip: S('guest.listen'), until: end0, look: sp.id }); beats.push(fb(t + TEMPERAMENT[m.temper || 'calm'].reactDelayS, m.id, 'content', 'weak')); });
      if (turn.answer != null) { const m = members[turn.answer]; push(m.id, { clip: S(turn.answer_clip || 'guest.nodApprove'), look: sp.id }); turnEnd = Math.max(turnEnd, end0 + sec(turn.answer_clip || 'guest.nodApprove')); }
    }
    const gap = turn.gap ?? 0.9;
    members.forEach((m) => push(m.id, { clip: idle, until: Math.min(until, turnEnd + gap), look: members[(members.indexOf(m) + 1) % members.length].id }));
    t = turnEnd + gap;
  }
  members.forEach((m) => push(m.id, { clip: idle, until, look: members[(members.indexOf(m) + 1) % members.length].id }));
  return { steps, beats, marks };
}

const seatedStart = (seat, until, look) => ({ clip: 'guest.seatedIdle', until, seat, ...(look ? { look } : {}) });
const pickFacing = (seats, ids) => { const cy = Math.sin(GAME.yaw), cz = Math.cos(GAME.yaw); return ids.map((id) => seats[id]).filter(Boolean).sort((a, b) => (Math.sin(b.yaw) * cy + Math.cos(b.yaw) * cz) - (Math.sin(a.yaw) * cy + Math.cos(a.yaw) * cz)); };
const mate = (id) => id.slice(0, -1) + (id.endsWith('1') ? '2' : '1');
const TWO = ['twoA1', 'twoA2', 'twoB1', 'twoB2', 'twoC1', 'twoC2'];

// ---------- 1 · Det de bär: studenterna med ryggsäck ----------
// Tre studenter går tillsammans längs torget (en lugn, en livlig, en reserverad), en sena springer ikapp. En turist med
// kameraremmen och en förälder med barnet hand i hand går åt andra hållet. Alla har gatans färger (guestGroups, where 'street').
export function carry(C) {
  const D = 22, L = 3.6, walk = (clip, to, speed, x) => ({ clip, path: [to], speed, ...(x || {}) });
  const actors = {
    s1: { kind: 'guest', group: 'student', variant: 0, temper: 'lively', look: 'student', hm: 0.97, pos: [-9, L], yaw: Math.PI / 2, steps: [walk('street.walkCalm', [9, L], 0.85, { look: 's2' }), { clip: 'staff.idle', until: D, look: 's2' }] },
    s2: { kind: 'guest', group: 'student', variant: 1, temper: 'calm', look: 'student', hm: 1.02, pos: [-9.4, L + 0.75], yaw: Math.PI / 2, steps: [walk('street.walkCalm', [8.6, L + 0.75], 0.85, { look: 's1' }), { clip: 'staff.idle', until: D, look: 's1' }] },
    s3: { kind: 'guest', group: 'student', variant: 0, temper: 'reserved', look: 'student', hm: 0.93, pos: [-10.2, L + 0.2], yaw: Math.PI / 2, steps: [walk('street.walkCalm', [7.8, L + 0.2], 0.85), { clip: 'staff.idle', until: D }] },
    s4: { kind: 'guest', group: 'student', variant: 1, temper: 'lively', look: 'student', hm: 0.99, pos: [-13.5, L + 0.4], yaw: Math.PI / 2, steps: [walk('street.walkHurried', [7.2, L + 0.5], 1.45), { clip: 'staff.idle', until: D, look: 's3' }] },
    tour: { kind: 'guest', group: 'tourist', variant: 0, temper: 'calm', look: 'medel', hm: 1.0, pos: [9, L + 1.7], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 1.5 }, walk('street.walkCalm', [-9, L + 1.7], 0.85), { clip: 'staff.idle', until: D }] },
    parent: { kind: 'guest', temper: 'calm', look: 'medel2', hm: 1.0, pos: [10, L + 3.4], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 0.5 }, walk('street.walkWithChild', [-8, L + 3.4], 0.7, { until: 20 }), { clip: 'staff.idle', until: D }] },
    child: { kind: 'guest', temper: 'lively', look: 'student', hm: 0.58, pos: [10 - CHILD_AHEAD, L + 3.4 - CHILD_SIDE], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 0.5 }, walk('street.childWalk', [-8 - CHILD_AHEAD, L + 3.4 - CHILD_SIDE], 0.7, { until: 20 }), { clip: 'staff.idle', until: D }] }
  };
  const faces = { s1: 'delighted', s2: 'content', s3: 'content', s4: 'waiting', tour: 'content', parent: 'content', child: 'delighted' };
  return {
    set: 'studio', pieces: [], outdoor: 'torget', tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening', initialFaces: faces,
    follow: { hand: { from: 'parent', to: 'child' } }, gameView: { ...TRUCK_GAME, tx: 0, tz: L + 1.4 },
    beats: {
      cam: [{ t: 0, v: { ...TRUCK_GAME, tx: 0, tz: L + 1.4 } }], face: [fb(6, 's1', 'delighted', 'strong'), fb(6.4, 's2', 'delighted', 'weak'), fb(9, 's4', 'content', 'clear')],
      chapters: [{ key: 'carry.z', focus: 's2', dist: 24, at: 9.5 }, { key: 'carry.10', focus: 's2', dist: 10, at: 9.5 }, { key: 'carry.back', view: { tx: 0, ty: 1.0, tz: L + 0.4, dist: 7, yaw: -1.25, pitch: 0.55, frame: 0.5 }, follow: 's2', at: 9.5 },
        { key: 'carry.child', focus: 'parent', dist: 10, at: 11 }, { key: 'carry.tourist', focus: 'tour', dist: 10, at: 10 }]
    }
  };
}
/** Barnet går på den vuxnas vänstra sida. Mätt i prototypen (D12): den vuxnas vänstra hand ligger 0,31 m ut och 0,16 m fram,
 *  barnets högra hand 0,50 m ut och 0,07 m fram (barnet är 0,58 och lyfter armen 1,0 rad). Kropparna står därför 0,81 m isär
 *  och barnet 0,10 m före. Händerna möts då inom 5 cm (i D11 var de 0,6 m isär). */
export const CHILD_SIDE = 0.81, CHILD_AHEAD = 0.1;

// ---------- 2 · Ansiktet går över ----------
// En gäst väntar på maten (väntar). Sara kommer med tallriken: väntar → nöjd. Första tuggan: nöjd → glad.
// Ansiktet går över på temperamentets tid (lugn 0,5 s). Kontrollbilderna tas i början, mitten och slutet av den sista övergången.
export const SHIFT_AT = 8.2;
export function faceShift(C, o) {
  const pick = pickFacing(o.seats || {}, ['twoB1', 'twoB2'])[0], seat = pick ? pick.id : 'twoB2', other = mate(seat), s = o.seats[seat], D = 14;
  const plateAt = [s.x + Math.sin(s.yaw) * 0.32, 0.765, s.z + Math.cos(s.yaw) * 0.32];
  const props = { plate: { type: 'plate', at: plateAt, hidden: true }, fork: { type: 'fork', hand: ['g', 'R'], hidden: true }, knife: { type: 'knife', hand: ['g', 'L'], hidden: true } };
  const bite = SHIFT_AT - 0.56 * C.CLIPS['guest.nodFirstBite'].seconds.normal;
  const actors = {
    g: { kind: 'guest', temper: 'calm', autoFace: false, look: 'medel', hm: 0.98, pos: [0, 0], steps: [seatedStart(seat, 1.2, 'sara'), { clip: 'guest.checkWatch', look: 'sara' }, { clip: 'guest.seatedIdle', until: 4.6, look: 'sara' }, { clip: 'guest.nodApprove', look: 'sara' }, { clip: 'guest.seatedIdle', until: bite, look: 'p' }, { clip: 'guest.nodFirstBite', ev: [{ type: 'show', prop: 'fork', at: 0 }, { type: 'show', prop: 'knife', at: 0 }] }, { clip: 'guest.seatedIdle', until: D, look: 'p' }] },
    p: { kind: 'guest', temper: 'lively', look: 'kappa', hm: 1.0, pos: [0, 0], steps: [seatedStart(other, 0.5, 'g'), { clip: 'guest.listen', until: 3.5, look: 'g' }, { clip: 'guest.seatedIdle', until: 9.2, look: 'g' }, { clip: 'guest.smileTurn', look: 'g' }, { clip: 'guest.seatedIdle', until: D, look: 'g' }] },
    sara: { kind: 'staff', temper: 'calm', look: 'servitor', pos: [s.x + 3.2, s.z + 1.2], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 2.2 }, { clip: 'staff.walk', path: [[s.x + Math.sin(s.yaw + 1.2) * 0.75, s.z + Math.cos(s.yaw + 1.2) * 0.75]], ev: [{ type: 'show', prop: 'plate', at: 'end' }] }, { clip: 'staff.listenTilt', until: 6.2, look: 'g' }, { clip: 'staff.walk', path: [[s.x + 3.2, s.z + 1.2]] }, { clip: 'staff.idle', until: D }] }
  };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props, actors, effects: [], light: 'evening', lupe: ['g', 'p'],
    initialFaces: { g: 'waiting', p: 'content' },
    beats: {
      cam: [{ t: 0, v: near(s.x, s.z, 10, 0.7) }],
      face: [fb(0, 'g', 'waiting', 'clear'), fb(1.4, 'g', 'impatient', 'weak'), fb(4.4, 'g', 'content', 'clear'), fb(SHIFT_AT, 'g', 'delighted', 'clear'), fb(SHIFT_AT + 0.5, 'p', 'delighted', 'weak')],
      chapters: [{ key: 'shift.10', focus: 'g', dist: 10, yaw: s.yaw, at: SHIFT_AT }, { key: 'shift.6', focus: 'g', dist: 6, yaw: s.yaw, at: SHIFT_AT }, { key: 'shift.z', game: true, at: SHIFT_AT }]
    },
    shift: { who: 'g', at: SHIFT_AT }
  };
}

// ---------- 3 · De svarar varandra ----------
// Vid ett bord för två berättar den livliga något roligt och den lugna svarar: lyssnar, ler, småskrattar, och den som
// berättade skrattar tillbaka. I loungen sprider sig ett skämt: den livliga skrattar först, sedan ler de två andra.
export function react(C, o) {
  const D = 20, seats = o.seats || {}, pair = pickFacing(seats, ['twoB1', 'twoB2'])[0], A = pair ? mate(pair.id) : 'twoB1', B = pair ? pair.id : 'twoB2', yb = (seats[B] || { yaw: 0.7 }).yaw, yl = (seats.loungeB2 || { yaw: 0.7 }).yaw;
  const P1 = party(C, [{ id: 'a', temper: 'lively' }, { id: 'b', temper: 'calm' }], 0.6, D, [{ who: 1, clip: 'guest.leanTalk' }, { who: 0, clip: 'guest.tellJoke' }, { who: 1, clip: 'guest.leanTalkB' }, { who: 0, clip: 'guest.leanTalk', answer: 1, answer_clip: 'guest.nodApproveB' }]);
  const P2 = party(C, [{ id: 'l1', temper: 'calm' }, { id: 'l2', temper: 'lively' }, { id: 'l3', temper: 'reserved' }], 1.4, D, [{ who: 0, clip: 'guest.tellJoke' }, { who: 1, clip: 'guest.leanTalkB' }, { who: 2, clip: 'guest.leanTalk' }]);
  const actors = {
    a: { kind: 'guest', temper: 'lively', autoFace: false, look: 'jacka', hm: 1.0, pos: [0, 0], steps: [seatedStart(A, 0.6, 'b'), ...P1.steps.a] },
    b: { kind: 'guest', temper: 'calm', autoFace: false, look: 'medel3', hm: 0.96, pos: [0, 0], steps: [seatedStart(B, 0.6, 'a'), ...P1.steps.b] },
    l1: { kind: 'guest', temper: 'calm', autoFace: false, look: 'hog', hm: 1.02, pos: [0, 0], steps: [seatedStart('loungeB1', 1.4, 'l2'), ...P2.steps.l1] },
    l2: { kind: 'guest', temper: 'lively', autoFace: false, look: 'social', hm: 0.95, pos: [0, 0], steps: [seatedStart('loungeB2', 1.4, 'l1'), ...P2.steps.l2] },
    l3: { kind: 'guest', temper: 'reserved', autoFace: false, look: 'stickat', hm: 0.99, pos: [0, 0], steps: [seatedStart('loungeB3', 1.4, 'l1'), ...P2.steps.l3] },
    mira: { kind: 'staff', temper: 'calm', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: D, face: 0 }] }
  };
  const punch = P1.marks.find((m) => m.what === 'reply'), at = punch ? punch.t + 0.5 : 6, sa = seats[A] || { x: 0, z: 0 };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening', lupe: ['a', 'b', 'l1', 'l2', 'l3'],
    initialFaces: { a: 'content', b: 'content', l1: 'content', l2: 'content', l3: 'content' },
    beats: { cam: [{ t: 0, v: near(sa.x, sa.z, 12) }], face: [...P1.beats, ...P2.beats],
      chapters: [{ key: 'react.10', focus: 'b', dist: 10, yaw: yb, at, lupe: ['b', 'a'] }, { key: 'react.z', game: true, at }, { key: 'react.lounge', focus: 'l2', dist: 10, yaw: yl, lupe: ['l1', 'l2', 'l3'], at: (P2.marks.find((m) => m.what === 'reply') || { t: 5 }).t + 0.9 }] },
    marks: [...P1.marks, ...P2.marks], reactAt: at
  };
}

// ---------- 4 · Samma gest, olika personer ----------
// Två gäster vid samma bord vinkar på personalen samtidigt, med samma klipp och samma intensitet: den lugna och den livliga.
// En reserverad vid bordet bredvid gör samma sak. Skillnaden är temperamentet (TEMPERAMENT.amp och faceK).
export const TEMPER_AT = 3.0;
export function temper(C, o) {
  const seats = o.seats || {}, best = pickFacing(seats, ['twoB1', 'twoB2'])[0], s1 = best ? best.id : 'twoB2', s0 = mate(s1), s2 = s1 === 'twoB2' ? 'twoC2' : 'twoC1';
  const D = 10, start = TEMPER_AT - 0.5 * C.CLIPS['guest.waveStaff'].seconds.normal;
  const wave = (seat, tm, lk, other) => ({ kind: 'guest', temper: tm, look: lk, hm: 1.0, pos: [0, 0], steps: [seatedStart(seat, start, other), { clip: 'guest.waveStaff', look: 'sara', intensity: 'clear' }, { clip: 'guest.seatedIdle', until: start + 3.4, look: 'sara' }, { clip: 'guest.waveStaff', look: 'sara', intensity: 'clear' }, { clip: 'guest.seatedIdle', until: D, look: other }] });
  const actors = {
    calm: wave(s0, 'calm', 'medel', 'lively'), lively: wave(s1, 'lively', 'jacka', 'calm'), res: wave(s2, 'reserved', 'rock', 'calm'),
    sara: { kind: 'staff', temper: 'calm', look: 'servitor', pos: [2.2, 3.4], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: D }] }
  };
  const p = seats[s1] || { x: 0, z: 0, yaw: 0.7 }, q = seats[s0] || p;
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening', lupe: ['calm', 'lively', 'res'],
    initialFaces: { calm: 'content', lively: 'content', res: 'content' },
    beats: { cam: [{ t: 0, v: near(p.x, p.z, 10) }], face: [], chapters: [{ key: 'temper.10', view: near((p.x + q.x) / 2, (p.z + q.z) / 2, 10, p.yaw + 0.75), at: TEMPER_AT }, { key: 'temper.z', game: true, at: TEMPER_AT }, { key: 'temper.res', focus: 'res', dist: 10, yaw: (seats[s2] || p).yaw + 0.75, at: TEMPER_AT }] }
  };
}

// ---------- 5 · Tre nivåer ----------
// Otålig i tre nivåer vid tre bord, alla lugna: svag (lugnt tempo, halva ansiktet), tydlig (D11) och stark (stressat tempo, 1,3).
export const LEVEL_AT = 3.2;
export function levels(C, o) {
  const seats = o.seats || {}, D = 10, ids = ['twoA2', 'twoB2', 'twoC2'].map((x) => pickFacing(seats, [x, mate(x)])[0]?.id || x);
  const L = [['weak', 'calm'], ['clear', 'normal'], ['strong', 'stressed']], actors = {}, face = [];
  ids.forEach((seat, i) => {
    const [lev, tempo] = L[i], id = 'i' + (i + 1), start = LEVEL_AT - 0.45 * C.CLIPS['guest.waveWaiter'].seconds[tempo];
    actors[id] = { kind: 'guest', temper: 'calm', autoFace: false, look: ['medel', 'kappa', 'rock'][i], hm: 1.0, pos: [0, 0], steps: [seatedStart(seat, start, 'sara'), { clip: 'guest.waveWaiter', tempo, look: 'sara', intensity: lev }, { clip: 'guest.seatedIdle', until: start + 4.2, look: 'sara' }, { clip: 'guest.waveWaiter', tempo, look: 'sara', intensity: lev }, { clip: 'guest.seatedIdle', until: D, look: 'sara' }] };
    face.push(fb(0, id, 'waiting', lev), fb(start - 0.1, id, 'impatient', lev));
  });
  actors.sara = { kind: 'staff', temper: 'calm', look: 'servitor', pos: [3.6, -1.6], yaw: Math.PI, steps: [{ clip: 'staff.idle', until: D }] };
  const c = seats[ids[1]] || { x: 0, z: 0, yaw: 0.7 };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening', lupe: ['i1', 'i2', 'i3'],
    initialFaces: { i1: 'waiting', i2: 'waiting', i3: 'waiting' },
    beats: { cam: [{ t: 0, v: near(c.x, c.z, 11) }], face, chapters: [{ key: 'levels.10', view: near(c.x, c.z, 11, c.yaw * 0.5 + 0.35), at: LEVEL_AT }, { key: 'levels.z', game: true, at: LEVEL_AT }] }
  };
}

// ---------- 6 · Två varianter ----------
export const VAR_AT = 2.6;
export function variants(C, o) {
  const D = 10, pairs = [['twoA1', 'guest.waveStaff'], ['twoA2', 'guest.waveStaffB'], ['twoC1', 'guest.laugh'], ['twoC2', 'guest.laughB'], ['loungeA1', 'guest.armsCrossed'], ['loungeA3', 'guest.armsCrossedB']];
  const actors = {};
  pairs.forEach(([seat, clip], i) => {
    const id = 'v' + (i + 1), dur = C.CLIPS[clip].seconds.normal, start = Math.max(0.3, VAR_AT - 0.45 * dur);
    actors[id] = { kind: 'guest', temper: 'calm', look: ['medel', 'medel', 'social', 'social', 'stickat', 'stickat'][i], hm: 1.0, pos: [0, 0], steps: [seatedStart(seat, start, 'sara'), C.CLIPS[clip].loop ? { clip, until: D, look: 'sara' } : { clip, look: clip.includes('wave') ? 'sara' : 'v' + (i % 2 ? i : i + 2) }, { clip: 'guest.seatedIdle', until: D }] };
  });
  actors.sara = { kind: 'staff', temper: 'calm', look: 'servitor', pos: [2.2, 3.4], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: D }] };
  return {
    set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening', lupe: Object.keys(actors).filter((x) => x !== 'sara'),
    initialFaces: { v1: 'content', v2: 'content', v3: 'delighted', v4: 'delighted', v5: 'displeased', v6: 'displeased' },
    beats: { cam: [{ t: 0, v: near(-2.4, -2.0, 13) }], face: [], chapters: [{ key: 'var.wave', view: near(-4.2, -4.4, 10, 0.2), at: VAR_AT }, { key: 'var.laugh', view: near(0, -4.4, 10, 0.2), at: VAR_AT }, { key: 'var.arms', view: near(-1.8, 4.6, 10, Math.PI - 0.2), at: VAR_AT }, { key: 'var.z', game: true, at: VAR_AT }] }
  };
}

// ---------- 7 · Rummet lever ----------
// Hela vinbaren en vanlig kväll. Sällskapen pratar och svarar varandra, ett skämt sprider sig i en lounge, en gäst söker
// Saras blick och Sara nickar i förbifarten. Livet i vila ligger på alla: slå av det i panelen för att se D11.
export function room(C, o) {
  const D = 24, actors = {}, beats = [];
  const looks = ['medel', 'kappa', 'jacka', 'rock', 'social', 'stickat', 'medel2', 'medel3', 'hog', 'student'];
  let li = 0;
  const add = (ps, members, seatsFor, from, turns) => {
    const P = party(C, members, from, D, turns);
    members.forEach((m, i) => { actors[m.id] = { kind: 'guest', temper: m.temper, autoFace: false, look: looks[li++ % looks.length], hm: 0.94 + (li % 5) * 0.03, pos: [0, 0], steps: [seatedStart(seatsFor[i], from, members[(i + 1) % members.length].id), ...P.steps[m.id]] }; });
    beats.push(...P.beats);
  };
  add('A', [{ id: 'ta1', temper: 'lively' }, { id: 'ta2', temper: 'calm' }], ['twoA1', 'twoA2'], 0.4, [{ who: 0, clip: 'guest.leanTalk' }, { who: 1, clip: 'guest.leanTalkB' }, { who: 0, clip: 'guest.tellJoke' }]);
  add('B', [{ id: 'tb1', temper: 'reserved' }, { id: 'tb2', temper: 'lively' }], ['twoB1', 'twoB2'], 1.3, [{ who: 1, clip: 'guest.leanTalkB' }, { who: 0, clip: 'guest.leanTalk', answer: 1, answer_clip: 'guest.nodApprove' }]);
  add('LA', [{ id: 'la1', temper: 'lively' }, { id: 'la2', temper: 'calm' }, { id: 'la3', temper: 'reserved' }], ['loungeA1', 'loungeA2', 'loungeA3'], 0.9, [{ who: 0, clip: 'guest.tellJoke' }, { who: 2, clip: 'guest.leanTalk' }, { who: 1, clip: 'guest.leanTalkB' }]);
  add('LB', [{ id: 'lb1', temper: 'calm' }, { id: 'lb2', temper: 'calm' }, { id: 'lb3', temper: 'lively' }], ['loungeB1', 'loungeB2', 'loungeB3'], 2.0, [{ who: 2, clip: 'guest.leanTalk' }, { who: 0, clip: 'guest.leanTalkB' }, { who: 2, clip: 'guest.tellJoke' }]);
  add('BAR', [{ id: 'br1', temper: 'calm' }, { id: 'br2', temper: 'lively' }], ['bar2', 'bar3'], 0.7, [{ who: 1, clip: 'guest.leanTalk' }, { who: 0, clip: 'guest.leanTalkB' }]);
  // Gästen vid C söker Saras blick (väntar), Sara går förbi och nickar, gästen blir nöjd.
  actors.tc1 = { kind: 'guest', temper: 'calm', autoFace: false, look: 'medel', hm: 1.0, pos: [0, 0], steps: [seatedStart('twoC1', 2.5, 'sara'), { clip: 'guest.seekEye', look: 'sara' }, { clip: 'guest.seekEyeB', look: 'sara' }, { clip: 'guest.seatedIdle', until: 10.2, look: 'sara' }, { clip: 'guest.nodApprove', look: 'sara' }, { clip: 'guest.seatedIdle', until: D, look: 'tc2' }] };
  actors.tc2 = { kind: 'guest', temper: 'reserved', autoFace: false, look: 'kappa', hm: 0.97, pos: [0, 0], steps: [seatedStart('twoC2', 2.5, 'tc1'), { clip: 'guest.seatedIdle', until: D, look: 'tc1' }] };
  beats.push(fb(2.5, 'tc1', 'waiting', 'clear'), fb(6.5, 'tc1', 'impatient', 'weak'), fb(9.7, 'tc1', 'content', 'clear'), fb(0, 'tc2', 'content', 'weak'), fb(6.8, 'tc2', 'waiting', 'weak'), fb(10.2, 'tc2', 'content', 'weak'));
  actors.sara = { kind: 'staff', temper: 'calm', look: 'servitor', pos: [3.6, -3.25], yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 7.6, look: 'mira' }, { clip: 'staff.walkNod', path: [[0.6, -3.3]], look: 'tc1' }, { clip: 'staff.listenTilt', until: 12.6, look: 'tc1' }, { clip: 'staff.walk', path: [[3.6, -3.25]] }, { clip: 'staff.idle', until: D, look: 'tb2' }] };
  actors.mira = { kind: 'staff', temper: 'calm', look: 'bartender', pos: [-0.9, -0.74], yaw: 0, steps: [{ clip: 'bar.wipe', until: 6, face: 0 }, { clip: 'staff.listenTilt', until: 12, face: 0, look: 'br2' }, { clip: 'bar.wipe', until: D, face: 0 }] };
  actors.per = { kind: 'staff', temper: 'calm', look: 'hovmastare', pos: [6.1, -0.55], yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: D, face: Math.PI / 2 }] };
  return { set: 'winebar', roomOpts: { mood: 'helg' }, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening', initialFaces: {}, beats: { cam: [{ t: 0, v: GAME }], face: beats, chapters: [{ key: 'room.z', game: true, at: 6 }, { key: 'room.13', view: near(-1.2, 0.4, 13), at: 6 }, { key: 'room.seek', focus: 'tc1', dist: 10, at: 9.4 }] } };
}

// ---------- 8 · Grillvagnen, tre förslag ----------
// Samma liv vid alla tre: grillaren vid grillen, en i luckan som tar beställningen, och medhjälparen som går ut längs kön,
// nickar åt dem som står där och tar en beställning längst bak (allt spelaren väljer syns). Kön, ståborden och skylten
// står där D10 har dem.
export function truckScene(C, id, spec) {
  const D = 22, St = spec.stations, F = spec.floorY, Q = [[-0.5, 2.15], [-1.4, 2.3], [-2.3, 2.3], [-3.2, 2.3], [-4.1, 2.3]];
  const tables = { A: [3.9, 1.2], B: [5.4, 1.2], C: [4.65, 2.9] }, face = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]);
  const actors = {}, beats = [];
  actors.griller = { kind: 'staff', temper: 'calm', look: 'kock', pos: St.grill.pos, yaw: St.grill.yaw, stand: F, steps: [{ clip: 'cook.station', until: 9, face: St.grill.yaw }, { clip: 'staff.idle', until: 10.5, face: St.grill.yaw, look: 'hatch' }, { clip: 'cook.station', until: D, face: St.grill.yaw }] };
  actors.hatch = { kind: 'staff', temper: 'lively', look: 'servitor2', pos: St.hatch.pos, yaw: 0, stand: F, steps: [{ clip: 'staff.listenTilt', until: 6, face: 0, look: 'q0' }, { clip: 'staff.idle', until: 7.2, face: 0, look: 'griller' }, { clip: 'staff.listenTilt', until: D, face: 0, look: 'q0' }] };
  // medhjälparen: ut genom dörren, längs kön med en nick åt var och en, en beställning längst bak, och tillbaka
  const hp = spec.helper, back = Q[4], stop = [back[0] + 0.1, 3.05];
  actors.helper = { kind: 'staff', temper: 'lively', look: 'servitor', pos: spec.door, yaw: 0, steps: [{ clip: 'staff.idle', until: 0.6 }, { clip: 'staff.walk', path: [hp[0], hp[1]] }, { clip: 'staff.walkNod', path: [[-0.9, 3.05]], look: 'q1' }, { clip: 'staff.walkNod', path: [[-2.7, 3.05]], look: 'q2' }, { clip: 'staff.walk', path: [stop] }, { clip: 'staff.listenTilt', dur: 3.4, face: Math.PI, look: 'q4' }, { clip: 'staff.write', dur: 2.2, face: Math.PI, look: 'q4' }, { clip: 'staff.walkNod', path: [[-2.0, 3.05]], look: 'q3' }, { clip: 'staff.walk', path: [[1.4, 3.05], hp[0]] }, { clip: 'staff.idle', until: D }] };
  const tw = C.TEMPO.normal.walkSpeed, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const tPass = (x) => 0.6 + (dist(spec.door, hp[0]) + dist(hp[0], hp[1]) + Math.abs(hp[1][0] - x)) / tw;
  const tStop = 0.6 + (dist(spec.door, hp[0]) + dist(hp[0], hp[1]) + Math.abs(hp[1][0] - stop[0])) / tw;
  const tm = ['calm', 'lively', 'reserved', 'calm', 'lively'];
  Q.forEach((p, i) => {
    const id = 'q' + i, f = i === 0 ? 0 : face(p, Q[i - 1]), steps = [];
    if (i === 0) steps.push({ clip: 'guest.leanTalkStand', face: Math.PI, look: 'hatch' }, { clip: 'staff.idle', until: 6.4, face: Math.PI, look: 'hatch' }, { clip: 'guest.nodApproveStand', face: Math.PI, look: 'hatch' }, { clip: 'staff.idle', until: D, face: Math.PI, look: 'hatch' });
    else if (i === 4) steps.push({ clip: 'guest.checkWatchStandB', face: f }, { clip: 'staff.idle', until: tStop + 0.3, face: f }, { clip: 'guest.leanTalkStand', face: f, look: 'helper' }, { clip: 'staff.idle', until: tStop + 4.0, face: f, look: 'helper' }, { clip: 'guest.nodApproveStandB', face: f, look: 'helper' }, { clip: 'staff.idle', until: D, face: f });
    else { const at = tPass(p[0]) - 0.2 + TEMPERAMENT[tm[i]].reactDelayS; steps.push({ clip: i === 2 ? 'guest.armsCrossedStand' : 'staff.idle', until: at, face: f }, { clip: 'guest.glanceNodStand', face: f, look: 'helper' }, { clip: 'staff.idle', until: D, face: f, look: i === 1 ? 'q0' : 'q' + (i - 1) }); beats.push(fb(at, id, 'content', 'clear'), fb(0, id, i === 2 ? 'waiting' : 'content', 'weak')); }
    actors[id] = { kind: 'guest', temper: tm[i], look: ['medel', 'student', 'rock', 'kappa', 'jacka'][i], group: i === 1 ? 'student' : undefined, variant: 1, hm: [1.0, 0.96, 1.03, 0.98, 1.0][i], pos: p, yaw: i === 0 ? Math.PI : f, steps };
  });
  beats.push(fb(0, 'q4', 'waiting', 'clear'), fb(tStop + 0.4, 'q4', 'content', 'clear'));
  // ståbord A: två som pratar och skrattar, B: en som äter
  const a = tables.A, aW = [a[0] - 0.55, a[1]], aE = [a[0] + 0.55, a[1]];
  const P = party(C, [{ id: 'ta', temper: 'lively' }, { id: 'tb', temper: 'calm' }], 0.8, D, [{ who: 0, clip: 'guest.tellJoke' }, { who: 1, clip: 'guest.leanTalk' }], { standing: true, face: { ta: Math.PI / 2, tb: -Math.PI / 2 } });
  actors.ta = { kind: 'guest', temper: 'lively', autoFace: false, look: 'social', hm: 0.95, pos: aW, yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: 0.8, face: Math.PI / 2 }, ...P.steps.ta] };
  actors.tb = { kind: 'guest', temper: 'calm', autoFace: false, look: 'medel3', hm: 1.02, pos: aE, yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 0.8, face: -Math.PI / 2 }, ...P.steps.tb] };
  beats.push(...P.beats);
  const b = tables.B, bS = [b[0], b[1] + 0.55];
  actors.tc = { kind: 'guest', temper: 'calm', look: 'hog', hm: 1.0, pos: bS, yaw: Math.PI, steps: [{ clip: 'staff.idle', until: 2, face: Math.PI }, { clip: 'guest.nodFirstBiteStand', face: Math.PI }, { clip: 'staff.idle', until: 9, face: Math.PI }, { clip: 'guest.nodFirstBiteStand', face: Math.PI }, { clip: 'staff.idle', until: D, face: Math.PI }] };
  return {
    set: 'studio', pieces: Object.values(tables).map((p, i) => ({ type: 'bar', id: 'h' + i, x: p[0], z: p[1], w: 0.6, d: 0.6, h: 1.05 })), outdoor: 'torget', truck: id, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening',
    initialFaces: { q0: 'content', q4: 'waiting', ta: 'content', tb: 'content', tc: 'content' }, gameView: TRUCK_GAME,
    beats: { cam: [{ t: 0, v: TRUCK_GAME }], face: beats,
      chapters: [{ key: 'truck.z', game: true, at: tStop + 1.2 }, { key: 'truck.10', view: { tx: 0, ty: 1.1, tz: 1.0, dist: 10, yaw: 0.35, pitch: 0.873, frame: 0.5 }, at: tStop + 1.2 }, { key: 'truck.street', view: { ...TRUCK_GAME, dist: 42, tx: 0.4 }, at: tStop + 1.2 }, { key: 'truck.helper', focus: 'helper', dist: 10, at: tStop + 1.2 }] }
  };
}

export const SCENES = [
  { id: 'room', build: (C, o) => room(C, o) },
  { id: 'carry', build: (C) => carry(C) },
  { id: 'shift', build: (C, o) => faceShift(C, o) },
  { id: 'react', build: (C, o) => react(C, o) },
  { id: 'temper', build: (C, o) => temper(C, o) },
  { id: 'levels', build: (C, o) => levels(C, o) },
  { id: 'variants', build: (C, o) => variants(C, o) },
  { id: 'truckA', build: (C, o) => truckScene(C, 'A', o.trucks.A) },
  { id: 'truckB', build: (C, o) => truckScene(C, 'B', o.trucks.B) },
  { id: 'truckC', build: (C, o) => truckScene(C, 'C', o.trucks.C) }
];
