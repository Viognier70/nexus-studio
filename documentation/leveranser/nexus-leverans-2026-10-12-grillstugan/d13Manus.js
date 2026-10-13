// d13Manus.js — D13 grillstugan, tidslinjer för teaterScen. Leverans 2026-10-12. Samma format som d12Manus.js.
// En scen per väder och markis: kväll eller regn, med eller utan markisen över kön (tillvalet).
// Livet vid vagnen är D12:s: grillaren vid grillen, en i luckan, och medhjälparen som går längs kön och nickar.
// I regn står kön där RAIN_QUEUE säger. Utan markis har de som står utan skydd paraply (umbrella: färgindex).

import { party } from './d12Manus.js';
import { TEMPERAMENT } from './gestureMap';
import { STUGAN } from './grillstugan.js';
import { RAIN_QUEUE } from './truckRain.js';

export const TRUCK_GAME = { tx: -0.6, ty: 0.6, tz: 1.5, dist: 24, yaw: 0.35, pitch: 0.873, frame: 0.5 };
const fb = (t, who, mood, k) => ({ t, who, mood, k: k ?? 'clear' });
const face = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]);

export function stuganScene(C, o) {
  const rain = !!o.rain, awning = !!o.awning, S = STUGAN, St = S.stations, F = S.floorY, D = 22;
  const RQ = rain ? (awning ? RAIN_QUEUE.withAwning : RAIN_QUEUE.withoutAwning) : RAIN_QUEUE.dry, Q = [RQ.order, ...RQ.line];
  const uFrom = rain && !awning ? RQ.umbrellaFrom : 99, hz = RQ.helperZ;
  const actors = {}, beats = [], tw = C.TEMPO.normal.walkSpeed, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  actors.griller = { kind: 'staff', temper: 'calm', look: 'kock', pos: St.grill.pos, yaw: St.grill.yaw, stand: F, steps: [{ clip: 'cook.station', until: 9, face: St.grill.yaw }, { clip: 'staff.idle', until: 10.5, face: St.grill.yaw, look: 'hatch' }, { clip: 'cook.station', until: D, face: St.grill.yaw }] };
  actors.hatch = { kind: 'staff', temper: 'lively', look: 'servitor2', pos: St.hatch.pos, yaw: 0, stand: F, steps: [{ clip: 'staff.listenTilt', until: 6, face: 0, look: 'q0' }, { clip: 'staff.idle', until: 7.2, face: 0, look: 'griller' }, { clip: 'staff.listenTilt', until: D, face: 0, look: 'q0' }] };
  // medhjälparen: ut genom dörren, längs kön med en nick åt var och en, en beställning längst bak och tillbaka.
  // Utan markis i regn har hen paraply och lyssnar i stället för att skriva (skrivandet tar båda händerna).
  const back = Q[Q.length - 1], hp = [[2.75, 1.7], [1.4, hz]], stop = [back[0] + 0.1, hz], nods = Q.slice(1, -1).filter((_, i) => i % 2 === 0);
  const hSteps = [{ clip: 'staff.idle', until: 0.6 }, { clip: 'staff.walk', path: hp }];
  nods.forEach((p) => hSteps.push({ clip: 'staff.walkNod', path: [[p[0] - 0.1, hz]], look: 'q' + Q.indexOf(p) }));
  hSteps.push({ clip: 'staff.walk', path: [stop] }, { clip: 'staff.listenTilt', dur: rain && !awning ? 4.6 : 3.4, face: Math.PI, look: 'q' + (Q.length - 1) });
  if (!(rain && !awning)) hSteps.push({ clip: 'staff.write', dur: 2.2, face: Math.PI, look: 'q' + (Q.length - 1) });
  hSteps.push({ clip: 'staff.walk', path: [[1.4, hz], hp[0], S.door] }, { clip: 'staff.idle', until: D });
  actors.helper = { kind: 'staff', temper: 'lively', look: 'servitor', pos: S.door, yaw: 0, steps: hSteps, umbrella: rain && !awning ? 3 : undefined };
  const tPass = (x) => 0.6 + (dist(S.door, hp[0]) + dist(hp[0], hp[1]) + Math.abs(hp[1][0] - x)) / tw;
  const tStop = 0.6 + (dist(S.door, hp[0]) + dist(hp[0], hp[1]) + Math.abs(hp[1][0] - stop[0])) / tw;
  const tm = ['calm', 'lively', 'reserved', 'calm', 'lively', 'reserved', 'calm'], looks = ['medel', 'student', 'rock', 'kappa', 'jacka', 'medel3', 'hog'], hm = [1.0, 0.96, 1.03, 0.98, 1.0, 1.02, 0.97];
  const last = Q.length - 1;
  Q.forEach((p, i) => {
    const id = 'q' + i, f = i === 0 ? 0 : face(p, Q[i - 1]), steps = [];
    if (i === 0) steps.push({ clip: 'guest.leanTalkStand', face: Math.PI, look: 'hatch' }, { clip: 'staff.idle', until: 6.4, face: Math.PI, look: 'hatch' }, { clip: 'guest.nodApproveStand', face: Math.PI, look: 'hatch' }, { clip: 'staff.idle', until: D, face: Math.PI, look: 'hatch' });
    else if (i === last) steps.push({ clip: i >= uFrom ? 'staff.idle' : 'guest.checkWatchStandB', ...(i >= uFrom ? { until: 1.4 } : {}), face: f }, { clip: 'staff.idle', until: tStop + 0.3, face: f }, { clip: 'guest.leanTalkStand', face: f, look: 'helper' }, { clip: 'staff.idle', until: tStop + 4.0, face: f, look: 'helper' }, { clip: 'guest.nodApproveStandB', face: f, look: 'helper' }, { clip: 'staff.idle', until: D, face: f });
    else { const at = tPass(p[0]) - 0.2 + TEMPERAMENT[tm[i]].reactDelayS; steps.push({ clip: i === 2 && i < uFrom ? 'guest.armsCrossedStand' : 'staff.idle', until: at, face: f }, { clip: 'guest.glanceNodStand', face: f, look: 'helper' }, { clip: 'staff.idle', until: D, face: f, look: 'q' + (i - 1) }); beats.push(fb(at, id, 'content', 'clear'), fb(0, id, i === 2 ? 'waiting' : 'content', 'weak')); }
    actors[id] = { kind: 'guest', temper: tm[i], look: looks[i], group: i === 1 ? 'student' : undefined, variant: 1, hm: hm[i], pos: p, yaw: i === 0 ? Math.PI : f, steps, umbrella: i >= uFrom ? i % 5 : undefined };
  });
  beats.push(fb(0, 'q' + last, 'waiting', rain && !awning ? 'strong' : 'clear'), fb(tStop + 0.4, 'q' + last, 'content', 'clear'));
  const tables = { A: [3.9, 1.2], B: [5.4, 1.2], C: [4.65, 2.9] };
  if (!rain) {
    const a = tables.A, aW = [a[0] - 0.55, a[1]], aE = [a[0] + 0.55, a[1]];
    const P = party(C, [{ id: 'ta', temper: 'lively' }, { id: 'tb', temper: 'calm' }], 0.8, D, [{ who: 0, clip: 'guest.tellJoke' }, { who: 1, clip: 'guest.leanTalk' }], { standing: true, face: { ta: Math.PI / 2, tb: -Math.PI / 2 } });
    actors.ta = { kind: 'guest', temper: 'lively', autoFace: false, look: 'social', hm: 0.95, pos: aW, yaw: Math.PI / 2, steps: [{ clip: 'staff.idle', until: 0.8, face: Math.PI / 2 }, ...P.steps.ta] };
    actors.tb = { kind: 'guest', temper: 'calm', autoFace: false, look: 'medel3', hm: 1.02, pos: aE, yaw: -Math.PI / 2, steps: [{ clip: 'staff.idle', until: 0.8, face: -Math.PI / 2 }, ...P.steps.tb] };
    beats.push(...P.beats);
    const b = tables.B, bS = [b[0], b[1] + 0.55];
    actors.tc = { kind: 'guest', temper: 'calm', look: 'hog', hm: 1.0, pos: bS, yaw: Math.PI, steps: [{ clip: 'staff.idle', until: 2, face: Math.PI }, { clip: 'guest.nodFirstBiteStand', face: Math.PI }, { clip: 'staff.idle', until: 9, face: Math.PI }, { clip: 'guest.nodFirstBiteStand', face: Math.PI }, { clip: 'staff.idle', until: D, face: Math.PI }] };
  }
  const at = tStop + 1.2, V = (v) => ({ pitch: 0.873, frame: 0.5, ...v });
  const chapters = [
    { key: 'z', game: true, at },
    { key: '10', view: V({ tx: -0.6, ty: 1.1, tz: 1.3, dist: 10, yaw: 0.35 }), at },
    { key: '42', view: V({ ...TRUCK_GAME, dist: 42, tx: 0.4 }), at },
    { key: 'hatch6', view: V({ tx: 0, ty: 1.35, tz: 1.1, dist: 6, yaw: 0.18, pitch: 0.62 }), at },
    { key: 'door8', view: V({ tx: 2.5, ty: 1.2, tz: 0.4, dist: 8, yaw: 1.15, pitch: 0.6 }), at },
    { key: 'fridge8', view: V({ tx: -2.8, ty: 1.0, tz: 0.4, dist: 8, yaw: -0.85, pitch: 0.6 }), at },
    { key: 'helper10', focus: 'helper', dist: 10, at: tStop + 1.0 }
  ];
  if (rain && !awning) chapters.push({ key: 'umbrella8', view: V({ tx: -2.9, ty: 1.3, tz: 2.4, dist: 8, yaw: 0.45, pitch: 0.7 }), at });
  if (rain && awning) chapters.push({ key: 'under8', view: V({ tx: -2.7, ty: 1.2, tz: 2.3, dist: 8, yaw: 0.45, pitch: 0.7 }), at });
  return {
    set: 'studio', pieces: Object.values(tables).map((p, i) => ({ type: 'bar', id: 'h' + i, x: p[0], z: p[1], w: 0.6, d: 0.6, h: 1.05 })),
    outdoor: 'torget', truck: 'B', rain, awning, tempo: 'normal', end: D, props: {}, actors, effects: [], light: 'evening',
    initialFaces: { q0: 'content', ['q' + last]: 'waiting', ta: 'content', tb: 'content', tc: 'content' }, gameView: TRUCK_GAME,
    beats: { cam: [{ t: 0, v: TRUCK_GAME }], face: beats, chapters }
  };
}

export const SCENES = [
  { id: 'dry', build: (C, o) => stuganScene(C, { rain: false, awning: o.awning }) },
  { id: 'rain', build: (C, o) => stuganScene(C, { rain: true, awning: o.awning }) }
];
