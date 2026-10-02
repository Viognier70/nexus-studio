// serviceFlow — kvällens koreografi i Vinbaren som händelser i tid.
import { PLATE_SURFACE } from './wineBarRoom';
// Nexus v1, efter provspel 2026-09-26: servicen är en följd av händelser.
//
// SD-004. Ligger ovanpå wineBarRoom.ts, figureActs.ts och serviceScore.ts
// och rör inte dem. Det här är det som SKER mellan händelserna: sällskap
// kommer in, sätter sig, läser, väntar, beställer, får vin och mat, skålar,
// ber om notan, betalar och går — och personalen som gör det möjligt.
//
// Kontrakt:
//   • Ren data och rena funktioner. createServiceFlow() räknar hela
//     kvällen EN gång till segment per figur; sampleActor(a, t) läser dem.
//     Ingen klocka, inga slumptal (hash på index), inget three.js.
//   • Personalen tilldelas girigt i tidsordning: den som kan vara framme
//     först tar uppgiften. Gästen väntar tills personalen är där — det är
//     väntan som blir otålighet, och otåligheten som blir händelser.
//   • Tre överlämningar bär rummet: bartendern häller → servitören hämtar
//     vid barens västra öppning; köket lägger upp → servitören bär från
//     passet; servitören dukar av → disken. Samma som i serviceScore.
//
// ── Tempo ────────────────────────────────────────────────────────
// Sim-tiden här är MODELLTID: en kväll 18–23 på 480 s. Under ett
// händelsekort går sim-tiden i 0,25× (EVENT_TEMPO) — rummet rör sig
// fortfarande bakom kortet, men beslutet kostar inte servicen. Gesterna
// går på realtidsklockan, som i serviceScore (gestklassen).

// ORDER 271 (montering): pathLen, along, CORR_X, Group och groupsFor är
// exporterade så att WineBarFigures (wineBarDirector.ts) kan lägga
// kvällens uppgifter på samma vägar och bord som modellen. Inget annat är
// ändrat. Obs: sampleActor() visar en personal HEMMA i luckan mellan två
// segment (idle() när t ligger efter segmentets slut och före nästa), så
// en figur som väntar vid ett bord hoppar hem en stund. Direktören har
// därför en egen läsning som står kvar där förra segmentet slutade.

export type Vec2 = [number, number];

export const EVENING_SECONDS = 480;
/** Rummet går i full fart under en raket: kvällen väntar inte på ett beslut. */
export const EVENT_TEMPO = 1;
export const WALK_GUEST = 1.1;
export const WALK_STAFF = 1.35;
/** Väntan innan en gäst går från lugn till otålig. VAL, som WAIT_THRESHOLDS. */
export const IMPATIENT_AFTER = 10;

export type Pose =
  | 'hidden' | 'walk' | 'arrive' | 'leaveHappy' | 'leaveUnhappy' | 'carry' | 'serveWalk'
  | 'sit' | 'readMenu' | 'waitCalm' | 'waitImpatient' | 'order' | 'drink' | 'talk' | 'toast' | 'eat' | 'askBill' | 'pay'
  | 'idle' | 'takeOrder' | 'serve' | 'pour' | 'present' | 'clear' | 'nod';

export interface Segment {
  t0: number; t1: number;
  kind: 'walk' | 'hold';
  path?: Vec2[];
  at?: Vec2;
  facing?: number;
  pose: Pose;
  seated?: boolean;
  /** Sitshöjd för sittande segment (lokal Y-offset från golvet). */
  seatHeight?: number;
  targetYaw?: number;
  /** Gesten har envelopp över segmentet (progress 0..1). */
  envelope?: boolean;
  carrying?: 'glass' | 'plate' | 'bottle' | 'dishes' | null;
  partyId?: string;
}

export interface Actor {
  id: string;
  kind: 'guest' | 'staff';
  role?: string;
  colourIndex: number;
  home?: Vec2;
  homeFacing?: number;
  idlePose?: Pose;
  segments: Segment[];
}

export interface Party {
  id: string;
  group: string;
  label: string;
  seatIds: string[];
  arrive: number;
  seatedAt: number;
  orderedAt: number;
  servedAt: number;
  billAt: number;
  leftAt: number;
  waitOrder: number;
  waitBill: number;
  /** Faser med tider — händelserna letar mål här. */
  phases: { name: string; t0: number; t1: number }[];
}

export interface ServiceFlow { actors: Actor[]; parties: Party[]; length: number; }

export interface Sample {
  visible: boolean; x: number; z: number; facing: number; pose: Pose;
  seated: boolean; seatHeight: number; phase: number; progress: number; targetYaw: number;
  carrying: Segment['carrying']; partyId?: string;
}

// ---------- geometri ----------

function hash(i: number, k: number): number { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }
export function pathLen(p: Vec2[]): number { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }
export function along(p: Vec2[], d: number): { x: number; z: number; facing: number } {
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + seg >= d || i === p.length - 1) {
      const k = seg > 0 ? Math.max(0, Math.min(1, (d - acc) / seg)) : 1;
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, facing: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    }
    acc += seg;
  }
  const q = p[p.length - 1];
  return { x: q[0], z: q[1], facing: 0 };
}

// Personalens vägar. Baren är öppen mot väster; korridoren x −4,1 binder
// ihop passet, barens öppning och gästernas norra och södra gångar.
export const CORR_X = -4.1;
const BAR_OPEN_X = -3.2;
const NORTH_Z = 3.1;
const SOUTH_Z = -3.25;
export const PICKUP_BAR: Vec2 = [CORR_X, 0.2];
export const POUR_SPOT: Vec2 = [-3.0, -0.62];

function inBar(p: Vec2): boolean { return p[0] > -3.6 && p[0] < 2.4 && Math.abs(p[1]) < 1.2; }
function laneFor(p: Vec2): number { return p[1] > 1.2 ? NORTH_Z : SOUTH_Z; }

/** Väg för personal mellan två punkter i rummets lokala XZ. */
export function staffRoute(from: Vec2, to: Vec2): Vec2[] {
  const p: Vec2[] = [from];
  if (inBar(from) && inBar(to)) {
    if (Math.sign(from[1]) !== Math.sign(to[1]) && Math.abs(from[1]) > 0.3) p.push([BAR_OPEN_X, from[1]], [BAR_OPEN_X, to[1]]);
    p.push(to);
    return p;
  }
  let cur = from;
  if (inBar(from)) { p.push([BAR_OPEN_X, from[1]], [CORR_X, from[1]]); cur = [CORR_X, from[1]]; }
  else if (Math.abs(from[0] - CORR_X) > 0.05) { const l = laneFor(from); p.push([from[0], l], [CORR_X, l]); cur = [CORR_X, l]; }
  if (inBar(to)) { p.push([CORR_X, to[1]], [BAR_OPEN_X, to[1]], to); return p; }
  if (Math.abs(to[0] - CORR_X) < 0.05) { p.push(to); return p; }
  const l = laneFor(to);
  if (Math.abs(cur[1] - l) > 0.01) p.push([CORR_X, l]);
  p.push([to[0], l], to);
  return p;
}

// ---------- kvällen ----------

// ORDER 296 — tableAt: där det som serveras står (bordets mitt eller disken framför gästerna).
export interface Group { id: string; label: string; seats: string[]; serveAt: Vec2; serveFacing: number; kind: 'lounge' | 'two' | 'bar'; tableAt?: Vec2; }

export function groupsFor(room: any): Group[] {
  const s = (id: string) => room.seats.find((x: any) => x.id === id);
  const g: Group[] = [];
  [['loungeA', 'Lounge A'], ['loungeB', 'Lounge B']].forEach(function (L) {
    const a = s(L[0] + '2');
    g.push({ id: L[0], label: L[1], seats: [L[0] + '1', L[0] + '2', L[0] + '3'], serveAt: [a.local[0], NORTH_Z], serveFacing: 0, kind: 'lounge', tableAt: [a.local[0], PLATE_SURFACE.loungeTableZ] });
  });
  ['twoA', 'twoB', 'twoC'].forEach(function (id, i) {
    const a = s(id + '1'), b = s(id + '2');
    g.push({ id: id, label: 'Bord ' + (i + 1), seats: [id + '1', id + '2'], serveAt: [(a.local[0] + b.local[0]) / 2, -3.6], serveFacing: Math.PI, kind: 'two', tableAt: [(a.local[0] + b.local[0]) / 2, PLATE_SURFACE.twoTableZ] });
  });
  [[1, 2], [3, 4], [5, 6], [7, 8]].forEach(function (pr, i) {
    const a = s('bar' + pr[0]), b = s('bar' + pr[1]);
    const north = a.local[1] > 0;
    g.push({ id: 'barPair' + i, label: 'Bar ' + pr[0] + '–' + pr[1], seats: ['bar' + pr[0], 'bar' + pr[1]],
             serveAt: [(a.local[0] + b.local[0]) / 2, north ? 0.62 : -0.62], serveFacing: north ? 0 : Math.PI, kind: 'bar',
             tableAt: [(a.local[0] + b.local[0]) / 2, north ? PLATE_SURFACE.barGuestZ : -PLATE_SURFACE.barGuestZ] });
  });
  return g;
}

/**
 * Räknar kvällen. `busy` 0..1 styr hur tätt sällskapen kommer (0,35 =
 * tisdag, 1 = lördag). Deterministiskt: samma rum och samma `busy` ger
 * samma kväll.
 */
export function createServiceFlow(room: any, opts?: { busy?: number; length?: number }): ServiceFlow {
  const busy = opts?.busy ?? 1;
  const L = opts?.length ?? EVENING_SECONDS;
  const seat = (id: string) => room.seats.find((x: any) => x.id === id);
  const st = (id: string) => room.staffStations.find((x: any) => x.id === id);
  const actors: Actor[] = [];
  const staff: { [role: string]: { actor: Actor; free: number; pos: Vec2 }[] } = {};
  function addStaff(id: string, role: string, idlePose: Pose, home?: Vec2, facing?: number) {
    const s = st(id);
    const h: Vec2 = home ?? [s.local[0], s.local[1]];
    const a: Actor = { id: id + (home ? '2' : ''), kind: 'staff', role: role, colourIndex: 0, home: h, homeFacing: facing ?? s.facing, idlePose: idlePose, segments: [] };
    actors.push(a);
    (staff[role] = staff[role] || []).push({ actor: a, free: 0, pos: h });
  }
  addStaff('server', 'server', 'idle');
  // Andra servitören: södra delen av golvet, hem vid korridoren söder om baren.
  addStaff('server', 'server', 'idle', [CORR_X, -2.0], Math.PI / 2);
  addStaff('bartender', 'bartender', 'pour');
  addStaff('sommelier', 'sommelier', 'idle');

  // Händelsekön: stänger i tidsordning.
  const queue: { t: number; fn: () => void }[] = [];
  const push = (t: number, fn: () => void) => { queue.push({ t: t, fn: fn }); };

  /**
   * Ger uppgiften till den i rollen som kan vara framme först. `pickup`:
   * gå dit först och vänta `pickupHold` (med `carryFrom` i handen efter).
   * Returnerar när personalen är framme och när uppgiften är klar.
   */
  function assign(role: string | string[], ready: number, target: Vec2, facing: number, pose: Pose, dur: number,
                  o?: { pickup?: Vec2; pickupHold?: number; carry?: Segment['carrying']; carryBack?: Segment['carrying']; partyId?: string; targetYaw?: number }) {
    const roles = Array.isArray(role) ? role : [role];
    const list = ([] as any[]).concat(...roles.map(function (x) { return staff[x] || []; }));
    let best: any = null;
    list.forEach(function (s: any) {
      // Hinner personalen hem emellan går hen hem; annars direkt från där hen står.
      const homeTrip = pathLen(staffRoute(s.pos, s.actor.home!)) / WALK_STAFF;
      const goHome = ready - s.free > homeTrip + 3;
      const origin: Vec2 = goHome ? s.actor.home! : s.pos;
      const start = Math.max(ready, s.free + (goHome ? homeTrip : 0));
      const legs: Vec2[][] = [];
      if (o?.pickup) { legs.push(staffRoute(origin, o.pickup), staffRoute(o.pickup, target)); }
      else legs.push(staffRoute(origin, target));
      const travel = legs.reduce(function (a, p) { return a + pathLen(p) / WALK_STAFF; }, 0) + (o?.pickupHold ?? 0);
      if (!best || start + travel < best.arrive) best = { s: s, start: start, legs: legs, arrive: start + travel, goHome: goHome, homeTrip: homeTrip };
    });
    const s = best.s, A = s.actor;
    if (best.goHome && best.homeTrip > 0.05) {
      const back = staffRoute(s.pos, A.home!);
      A.segments.push({ t0: s.free, t1: s.free + best.homeTrip, kind: 'walk', path: back, pose: s.carryBack ? 'serveWalk' : 'walk', carrying: s.carryBack ?? null });
    }
    s.carryBack = null;
    let t = best.start;
    if (o?.pickup) {
      const d0 = pathLen(best.legs[0]) / WALK_STAFF;
      A.segments.push({ t0: t, t1: t + d0, kind: 'walk', path: best.legs[0], pose: 'walk', partyId: o.partyId }); t += d0;
      A.segments.push({ t0: t, t1: t + (o.pickupHold ?? 0), kind: 'hold', at: o.pickup, facing: Math.PI / 2, pose: 'idle', partyId: o.partyId }); t += o.pickupHold ?? 0;
      const d1 = pathLen(best.legs[1]) / WALK_STAFF;
      A.segments.push({ t0: t, t1: t + d1, kind: 'walk', path: best.legs[1], pose: 'serveWalk', carrying: o.carry ?? null, partyId: o.partyId }); t += d1;
    } else {
      const d0 = pathLen(best.legs[0]) / WALK_STAFF;
      A.segments.push({ t0: t, t1: t + d0, kind: 'walk', path: best.legs[0], pose: o?.carry ? 'serveWalk' : 'walk', carrying: o?.carry ?? null, partyId: o?.partyId }); t += d0;
    }
    const arrive = t;
    A.segments.push({ t0: t, t1: t + dur, kind: 'hold', at: target, facing: facing, pose: pose, envelope: true, targetYaw: o?.targetYaw ?? 0, carrying: o?.carry && pose === 'serve' ? o.carry : null, partyId: o?.partyId });
    t += dur;
    // Disken går till passet innan nästa uppgift.
    if (o?.carryBack) {
      const toPass = staffRoute(target, [CORR_X, 2.7]);
      const dp = pathLen(toPass) / WALK_STAFF;
      A.segments.push({ t0: t, t1: t + dp, kind: 'walk', path: toPass, pose: 'serveWalk', carrying: o.carryBack });
      t += dp; s.pos = [CORR_X, 2.7];
    } else s.pos = target;
    s.free = t;
    return { arrive: arrive, done: arrive + dur };
  }

  const groups = groupsFor(room);
  const parties: Party[] = [];
  let guestIx = 0;

  /** Sista ankomst: ett helt varv (≈ 125 s) ska hinnas före stängning. */
  const LAST_ARRIVAL = L - 135;
  function startParty(g: Group, gi: number, n: number, next: number) {
    if (next > LAST_ARRIVAL) return;
    {
      const pid = g.id + '_' + n;
      const size = g.kind === 'lounge' ? (hash(gi, n + 5) < 0.6 ? 3 : 2) : (g.kind === 'bar' && hash(gi, n + 7) < 0.35 ? 1 : 2);
      const seats = g.seats.slice(0, size).map(seat);
      const members: Actor[] = seats.map(function () {
        const a: Actor = { id: 'g' + (guestIx++), kind: 'guest', colourIndex: (guestIx * 3 + gi) % 8, segments: [] };
        actors.push(a); return a;
      });
      const party: Party = { id: pid, group: g.id, label: g.label, seatIds: seats.map(function (s: any) { return s.id; }),
        arrive: next, seatedAt: 0, orderedAt: 0, servedAt: 0, billAt: 0, leftAt: 0, waitOrder: 0, waitBill: 0, phases: [] };
      parties.push(party);
      const hold = function (t0: number, t1: number, pose: Pose, extra?: Partial<Segment>) {
        if (t1 <= t0) return;
        members.forEach(function (m, k) {
          const s = seats[k];
          m.segments.push(Object.assign({ t0: t0, t1: t1, kind: 'hold', at: [s.local[0], s.local[1]], facing: s.facing, pose: pose, seated: true, seatHeight: s.seatHeight, partyId: pid }, extra ?? {}) as Segment);
        });
        party.phases.push({ name: pose, t0: t0, t1: t1 });
      };
      const hIx = gi * 13 + n;
      const t0 = next;
      push(t0, function () {
        // In: från gatan till platsen, en i taget med 0,6 s mellanrum.
        let seatedAll = t0;
        members.forEach(function (m, k) {
          const path: Vec2[] = [[room.waitingSpot[0], room.waitingSpot[1]] as Vec2].concat(room.walkPathToSeat ? room.walkPathToSeat(room, seats[k].id) : []);
          const tw = t0 + k * 0.6, d = pathLen(path) / WALK_GUEST;
          m.segments.push({ t0: tw, t1: tw + d, kind: 'walk', path: path, pose: 'arrive', partyId: pid });
          m.segments.push({ t0: tw + d, t1: tw + d + 1.2, kind: 'hold', at: [seats[k].local[0], seats[k].local[1]], facing: seats[k].facing, pose: 'sit', envelope: true, seatHeight: seats[k].seatHeight, partyId: pid });
          seatedAll = Math.max(seatedAll, tw + d + 1.2);
        });
        // Personerna som satt sig först läser medan de andra kommer.
        members.forEach(function (m, k) {
          const last = m.segments[m.segments.length - 1];
          if (last.t1 < seatedAll) m.segments.push({ t0: last.t1, t1: seatedAll, kind: 'hold', at: last.at, facing: last.facing, pose: 'readMenu', seated: true, seatHeight: seats[k].seatHeight, partyId: pid });
        });
        party.seatedAt = seatedAll;
        const menuEnd = seatedAll + 9 + hash(hIx, 3) * 7;
        hold(seatedAll, menuEnd, 'readMenu');
        push(menuEnd, function () {
          // Beställningen: servitören till bordet, bartendern till barstolarna.
          const role: string[] = g.kind === 'bar' ? ['bartender'] : g.kind === 'lounge' ? ['sommelier', 'server'] : ['server'];
          const r = assign(role, menuEnd, g.serveAt, g.serveFacing, 'takeOrder', 4, { partyId: pid });
          const w = r.arrive - menuEnd;
          party.waitOrder = w;
          hold(menuEnd, Math.min(r.arrive, menuEnd + IMPATIENT_AFTER), 'waitCalm');
          hold(menuEnd + IMPATIENT_AFTER, r.arrive, 'waitImpatient', { targetYaw: 1.1 });
          hold(r.arrive, r.done, 'order', { envelope: true, targetYaw: 0.7 });
          party.orderedAt = r.done;
          push(r.done, function () {
            let served: number;
            if (g.kind === 'bar') {
              const p = assign('bartender', r.done + 1, g.serveAt, g.serveFacing, 'pour', 4, { partyId: pid, carry: 'glass' });
              served = p.done;
              hold(r.done, p.arrive, 'talk', { targetYaw: 0.9 });
            } else if (g.kind === 'lounge') {
              const p = assign('sommelier', r.done, g.serveAt, g.serveFacing, 'present', 5, { partyId: pid, carry: 'bottle', pickup: [1.3, 0.62], pickupHold: 1.5 });
              served = p.done;
              hold(r.done, p.arrive, 'talk', { targetYaw: 0.9 });
              hold(p.arrive, p.done, 'waitCalm', { targetYaw: 0 });
            } else {
              // Överlämningen: bartendern häller, servitören hämtar vid öppningen.
              const pour = assign('bartender', r.done, POUR_SPOT, -Math.PI / 2, 'pour', 3.5, { partyId: pid });
              const p = assign('server', pour.done, g.serveAt, g.serveFacing, 'serve', 2.5, { partyId: pid, carry: 'glass', pickup: PICKUP_BAR, pickupHold: 0.8 });
              served = p.done;
              hold(r.done, p.arrive, 'talk', { targetYaw: 0.9 });
              hold(p.arrive, p.done, 'waitCalm', { targetYaw: 0.6 });
            }
            party.servedAt = served;
            const enjoyEnd = Math.min(served + 34 + hash(hIx, 4) * 30, L - 40);
            // Smårätter från passet, utan att sällskapet väntar på dem.
            if (g.kind !== 'bar') push(served + 8, function () {
              const f = assign('server', served + 8, g.serveAt, g.serveFacing, 'serve', 2.5, { partyId: pid, carry: 'plate' });
              party.phases.push({ name: 'food', t0: f.arrive, t1: f.done });
            });
            const toastAt = served + 4 + hash(hIx, 5) * 6;
            hold(served, toastAt, 'drink');
            hold(toastAt, toastAt + 5, 'toast', { envelope: true });
            const mid = toastAt + 5 + (enjoyEnd - toastAt - 5) * 0.5;
            hold(toastAt + 5, mid, g.kind === 'bar' ? 'drink' : 'eat');
            hold(mid, enjoyEnd, 'talk', { targetYaw: 0.9 });
            push(enjoyEnd, function () {
              const role: string[] = g.kind === 'bar' ? ['bartender'] : g.kind === 'lounge' ? ['sommelier', 'server'] : ['server'];
              const b = assign(role, enjoyEnd + 2.4, g.serveAt, g.serveFacing, 'takeOrder', 3, { partyId: pid });
              party.billAt = enjoyEnd; party.waitBill = b.arrive - enjoyEnd;
              hold(enjoyEnd, enjoyEnd + 2.4, 'askBill', { envelope: true });
              hold(enjoyEnd + 2.4, b.arrive, b.arrive - enjoyEnd > IMPATIENT_AFTER + 2.4 ? 'waitImpatient' : 'waitCalm', { targetYaw: 1.1 });
              hold(b.arrive, b.done, 'pay', { envelope: true, targetYaw: 0.7 });
              push(b.done, function () {
                const unhappy = party.waitOrder > 18 || party.waitBill > 18;
                let out = b.done;
                members.forEach(function (m, k) {
                  const tw = b.done + 1.2 + k * 0.5;
                  m.segments.push({ t0: b.done + k * 0.5, t1: tw, kind: 'hold', at: [seats[k].local[0], seats[k].local[1]], facing: seats[k].facing, pose: 'sit', envelope: true, seatHeight: seats[k].seatHeight, partyId: pid, targetYaw: -1 });
                  const path: Vec2[] = room.exitPathFromSeat ? room.exitPathFromSeat(room, seats[k].id) : [];
                  const d = pathLen(path) / (unhappy ? WALK_GUEST * 1.3 : WALK_GUEST);
                  m.segments.push({ t0: tw, t1: tw + d, kind: 'walk', path: path, pose: unhappy ? 'leaveUnhappy' : 'leaveHappy', partyId: pid });
                  out = Math.max(out, tw + d);
                });
                party.leftAt = out;
                // Duka av, disken tillbaka till passet.
                const c = assign(g.kind === 'bar' ? 'bartender' : 'server', b.done + 2, g.serveAt, g.serveFacing, 'clear', 3, { partyId: pid, carryBack: g.kind === 'bar' ? null : 'dishes' });
                party.phases.push({ name: 'clear', t0: c.arrive, t1: c.done });
                // Nästa sällskap vid bordet först när det här har gått och bordet är avdukat.
                const gap = 6 + (1 - busy) * 140 + hash(gi, n + 11) * 20;
                const nextAt = Math.max(out, c.done) + gap;
                push(nextAt, function () { startParty(g, gi, n + 1, nextAt); });
              });
            });
          });
        });
      });
    }
  }
  // En lugn kväll lämnar bord tomma: 2 + 7·busy bord är i bruk (4 en tisdag,
  // alla 9 en lördag). Första ankomst sprids över kvällens början.
  const inUse = Math.round(2 + 7 * busy);
  const order = groups.map(function (g, gi) { return { g: g, gi: gi, k: hash(gi, 1) }; }).sort(function (a, b) { return a.k - b.k; });
  order.slice(0, inUse).forEach(function (o) {
    const first = 4 + hash(o.gi, 2) * 70 / (0.5 + busy);
    push(first, function () { startParty(o.g, o.gi, 1, first); });
  });

  queue.sort(function (a, b) { return a.t - b.t; });
  while (queue.length) {
    const q = queue.shift()!;
    q.fn();
    queue.sort(function (a, b) { return a.t - b.t; });
  }
  Object.keys(staff).forEach(function (k) {
    staff[k].forEach(function (s: any) {
      const back = staffRoute(s.pos, s.actor.home!);
      const d = pathLen(back) / WALK_STAFF;
      if (d > 0.05) s.actor.segments.push({ t0: s.free, t1: s.free + d, kind: 'walk', path: back, pose: 'walk', carrying: null });
    });
  });
  actors.forEach(function (a) { a.segments.sort(function (x, y) { return x.t0 - y.t0; }); });
  return { actors: actors, parties: parties, length: L };
}

// ---------- läsning ----------

export function sampleActor(a: Actor, t: number, cursor?: { i: number }): Sample {
  const segs = a.segments;
  let i = cursor ? cursor.i : 0;
  if (i >= segs.length || (segs[i] && segs[i].t0 > t)) i = 0;
  while (i < segs.length - 1 && segs[i].t1 < t && segs[i + 1].t0 <= t) i++;
  if (cursor) cursor.i = i;
  const s = segs[i];
  const idle = (): Sample => a.kind === 'staff'
    ? { visible: true, x: a.home![0], z: a.home![1], facing: a.homeFacing ?? 0, pose: a.idlePose ?? 'idle', seated: false, seatHeight: 0, phase: t, progress: 0, targetYaw: 0, carrying: null }
    : { visible: false, x: 0, z: 0, facing: 0, pose: 'hidden', seated: false, seatHeight: 0, phase: 0, progress: 0, targetYaw: 0, carrying: null };
  if (!s || t < s.t0 || t > s.t1) return idle();
  const u = s.t1 > s.t0 ? (t - s.t0) / (s.t1 - s.t0) : 1;
  if (s.kind === 'walk' && s.path) {
    const d = u * pathLen(s.path);
    const q = along(s.path, d);
    return { visible: true, x: q.x, z: q.z, facing: q.facing, pose: s.pose, seated: false, seatHeight: 0, phase: d / 1.3, progress: u, targetYaw: 0, carrying: s.carrying ?? null, partyId: s.partyId };
  }
  return { visible: true, x: s.at![0], z: s.at![1], facing: s.facing ?? 0, pose: s.pose, seated: !!s.seated, seatHeight: s.seatHeight ?? 0,
           phase: t - s.t0, progress: s.envelope ? u : 0, targetYaw: s.targetYaw ?? 0, carrying: s.carrying ?? null, partyId: s.partyId };
}

/** Sällskap i en viss fas vid tiden t — händelsernas mål. */
export function partiesInPhase(flow: ServiceFlow, t: number, names: string[]): Party[] {
  return flow.parties.filter(function (p) { return p.phases.some(function (ph) { return names.indexOf(ph.name) >= 0 && ph.t0 <= t && ph.t1 >= t; }); });
}

/** Hur belastad personalen är: andel av rollens tid i uppgift runt t (±30 s). */
export function staffLoad(flow: ServiceFlow, role: string, t: number): number {
  const a = flow.actors.filter(function (x) { return x.role === role; });
  let busy = 0;
  a.forEach(function (x) { x.segments.forEach(function (s) { busy += Math.max(0, Math.min(s.t1, t + 30) - Math.max(s.t0, t - 30)); }); });
  return Math.min(1, busy / (60 * Math.max(1, a.length)));
}

// ---------- raketer ----------
//
// Varje händelse är en trestegsraket i samma sammanhang:
//   Episteme  — vad            (15 s): det man måste veta
//   Techne    — hur            (20 s): hur man gör det
//   Phronesis — när och varför (30 s): omdömet i just den här stunden
// Nästa steg nås bara genom att klara det förra. Fel svar, eller att tiden
// går ut, ger en synlig följd i rummet, och personalen tar över. Rummet
// rör sig i full fart hela tiden.

export type Meter = 'kassa' | 'nojdhet' | 'ork';
export type StepId = 'episteme' | 'techne' | 'phronesis';
/** Vad rummet visar direkt efter svaret, hos det sällskap raketen gäller. */
export type RoomEffect = 'calm' | 'toast' | 'impatient' | 'standUp' | 'takeover';

export const STEPS: { id: StepId; label: string; ask: string; seconds: number }[] = [
  { id: 'episteme', label: 'Episteme', ask: 'Vad', seconds: 15 },
  { id: 'techne', label: 'Techne', ask: 'Hur', seconds: 20 },
  { id: 'phronesis', label: 'Phronesis', ask: 'När och varför', seconds: 30 }
];
/** Hur länge svaret står kvar i kortet innan nästa steg eller stängning. */
export const FEEDBACK_SECONDS = 2.4;

export interface Outcome { says: string; delta: Record<Meter, number>; effect: RoomEffect; takeover?: 'sommelier' | 'bartender' | 'server'; }
export interface RocketStep { step: StepId; question: string; answers: { key: string; text: string }[]; correct: string; right: Outcome; wrong: Outcome; why: string; }
export interface Rocket { id: string; at: number; targetPhases: string[]; prefer: string[]; who: string; story: string; steps: RocketStep[]; lesson: { title: string; pavilion: string }; }
export interface RocketResult { rocket: Rocket; answers: (string | null)[]; failedAt: number | null; }

export const METERS: { id: Meter; label: string; start: number; note: string }[] = [
  { id: 'kassa', label: 'Kassa', start: 5, note: 'Kvällens intäkt mot golvet.' },
  { id: 'nojdhet', label: 'Gästerna', start: 6, note: 'Hur nöjda gästerna i rummet är just nu.' },
  { id: 'ork', label: 'Personalen', start: 7, note: 'Hur mycket personalen orkar resten av kvällen.' }
];
export const METER_STEPS = 10;

/** Fyra raketer för Vinbaren, lördag. Innehållet är vårt, formen står sig. */
export const ROCKETS: Rocket[] = [
  { id: 'kork', at: 60, targetPhases: ['drink', 'toast', 'talk', 'eat'], prefer: ['lounge'], who: 'Sommeliern',
    story: 'Värden luktar på vinet och ställer ner glaset. ”Det här är korkat.”',
    lesson: { title: 'Korken är inte gästens fel', pavilion: 'Stensöta' },
    steps: [
      { step: 'episteme', question: 'Vad luktar ett korkat vin?', answers: [{ key: '1', text: 'Vått papper och källare' }, { key: '2', text: 'Vinäger och nagellack' }, { key: '3', text: 'Tändsticka och svavel' }, { key: '4', text: 'Kokt frukt och russin' }], correct: '1',
        right: { says: 'Sommeliern nickar. Det är korken.', delta: { kassa: 0, nojdhet: 0, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Sommeliern tar över. Hon luktar, bekräftar och byter.', delta: { kassa: 0, nojdhet: -1, ork: -1 }, effect: 'takeover', takeover: 'sommelier' },
        why: 'Korkdoften är vått papper och källare. Vinäger är ett annat fel, och svavel vädras bort. Den som inte känner igen korken kan inte stå för beskedet.' },
      { step: 'techne', question: 'Hur tar du hand om det vid bordet?', answers: [{ key: '1', text: 'Luktar själv, bekräftar och byter flaskan' }, { key: '2', text: 'Dekanterar, så att vinet får luft' }, { key: '3', text: 'Ber värden smaka igen om en stund' }, { key: '4', text: 'Häller ett nytt glas ur samma flaska' }], correct: '1',
        right: { says: 'Ny flaska inom en minut. Värden skålar mot dig.', delta: { kassa: 0, nojdhet: 1, ork: 0 }, effect: 'toast' },
        wrong: { says: 'Luft hjälper inte mot kork. Sommeliern får byta ändå, och loungen väntar.', delta: { kassa: 0, nojdhet: -2, ork: -1 }, effect: 'takeover', takeover: 'sommelier' },
        why: 'Ett korkat vin blir inte bättre av luft eller tid. Bekräfta, ta bort flaskan och kom tillbaka med en ny. Gästen ska aldrig behöva argumentera.' },
      { step: 'phronesis', question: 'Bordet bredvid har just beställt samma vin och sett allt. Vad gör du nu?', answers: [{ key: '1', text: 'Öppnar deras flaska vid bordet och låter dem lukta först' }, { key: '2', text: 'Serverar som vanligt, de har inte klagat' }, { key: '3', text: 'Säger att vinet är slut och föreslår ett annat' }, { key: '4', text: 'Bjuder dem på husets rött' }], correct: '1',
        right: { says: 'Grannbordet luktar, ler och beställer en flaska till senare.', delta: { kassa: 1, nojdhet: 1, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Grannbordet rör inte sina glas. Tvivlet sprider sig i loungen.', delta: { kassa: -1, nojdhet: -1, ork: 0 }, effect: 'impatient' },
        why: 'Förtroendet för ett vin delas av hela rummet. Den som sett en korkad flaska vill se att nästa är frisk, och att få lukta först ger dem det.' }
    ] },
  { id: 'roding', at: 170, targetPhases: ['drink', 'talk', 'waitCalm', 'eat'], prefer: ['two'], who: 'Köket',
    story: 'Kocken lutar sig ut genom passet: rödingen är slut, och två bord har just beställt den.',
    lesson: { title: 'Dåliga besked tidigt', pavilion: 'Metodköket' },
    steps: [
      { step: 'episteme', question: 'Borden valde riesling till rödingen. Vad på menyn ligger närmast?', answers: [{ key: '1', text: 'Västerbottenpajen' }, { key: '2', text: 'Osten med honung' }, { key: '3', text: 'Charken från Bergslagen' }], correct: '1',
        right: { says: 'Kocken nickar: pajen finns, sex portioner.', delta: { kassa: 0, nojdhet: 0, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Servitören tar över och föreslår pajen själv.', delta: { kassa: 0, nojdhet: -1, ork: -1 }, effect: 'takeover', takeover: 'server' },
        why: 'Rieslingens syra bär salt och fett, och pajen har båda. Honungen gör vinet surt, och charkens rök tar över det.' },
      { step: 'techne', question: 'Hur säger du det?', answers: [{ key: '1', text: 'Går till borden innan maten borde komma och erbjuder pajen' }, { key: '2', text: 'Låter servitören säga det när hon bär ut' }, { key: '3', text: 'Byter tyst och hoppas att ingen märker' }], correct: '1',
        right: { says: 'Båda borden tar pajen. Ett av dem tackar för att du kom själv.', delta: { kassa: 0, nojdhet: 1, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Beskedet kommer när maten borde ha kommit. En gäst reser sig.', delta: { kassa: 0, nojdhet: -2, ork: 0 }, effect: 'standUp' },
        why: 'Ett besked innan gästen har väntat är information. Samma besked efter tjugo minuter är ett svek.' },
      { step: 'phronesis', question: 'Det ena bordet firar och valde rödingen för att den stod i recensionen. Vad gör du?', answers: [{ key: '1', text: 'Erbjuder pajen, bjuder på ett glas och berättar när rödingen kommer tillbaka' }, { key: '2', text: 'Samma erbjudande som det andra bordet' }, { key: '3', text: 'Ber köket göra något av rökt sik' }, { key: '4', text: 'Drar av rödingen på notan' }], correct: '1',
        right: { says: 'De skålar. ”Då kommer vi tillbaka för rödingen.”', delta: { kassa: -1, nojdhet: 2, ork: 0 }, effect: 'toast' },
        wrong: { says: 'De tar pajen, men kvällen blev något annat än de kom för.', delta: { kassa: 0, nojdhet: -1, ork: 0 }, effect: 'impatient' },
        why: 'Samma besked betyder olika saker vid olika bord. Det här bordet kom för en berättelse, så ge dem en annan i stället för en rabatt.' }
    ] },
  { id: 'bar', at: 280, targetPhases: ['waitImpatient', 'waitCalm', 'order', 'talk', 'drink'], prefer: ['barPair'], who: 'Bartendern',
    story: 'Kön vid baren växer, och bartendern hinner inte. Sex beställningar väntar.',
    lesson: { title: 'Rusningen är din', pavilion: 'Måltidsbiblioteket' },
    steps: [
      { step: 'episteme', question: 'Hur många glas à 15 cl ger en flaska vin?', answers: [{ key: '1', text: 'Fyra' }, { key: '2', text: 'Fem' }, { key: '3', text: 'Sju' }], correct: '2',
        right: { says: 'Du räknar två flaskor till kön.', delta: { kassa: 0, nojdhet: 0, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Bartendern tar över räkningen och öppnar en flaska för mycket.', delta: { kassa: -1, nojdhet: 0, ork: -1 }, effect: 'takeover', takeover: 'bartender' },
        why: 'En flaska på 75 cl räcker till fem glas. Den som räknar rätt öppnar rätt antal flaskor och häller dem i ett svep.' },
      { step: 'techne', question: 'Hur tar du dig igenom kön?', answers: [{ key: '1', text: 'Samlar beställningarna och häller alla glas av samma flaska i ett svep' }, { key: '2', text: 'En gäst i taget, klart innan nästa' }, { key: '3', text: 'Tar dem som ropar högst först' }], correct: '1',
        right: { says: 'Kön är borta på fem minuter. Bartendern andas ut.', delta: { kassa: 1, nojdhet: 1, ork: 1 }, effect: 'toast' },
        wrong: { says: 'Kön står still. En gäst vid baren reser sig och tittar mot dörren.', delta: { kassa: 0, nojdhet: -2, ork: -1 }, effect: 'standUp' },
        why: 'I en rusning är flaskan enheten, inte gästen. Samla beställningarna, häll i svep och servera i ordning.' },
      { step: 'phronesis', question: 'Loungen väntar på sin andra flaska, och sommeliern står i baren och hjälper dig. Vem skickar du?', answers: [{ key: '1', text: 'Sommeliern till loungen, du stannar i baren' }, { key: '2', text: 'Ingen, loungen får vänta tills kön är borta' }, { key: '3', text: 'Du går själv och lämnar baren till sommeliern' }], correct: '1',
        right: { says: 'Loungen får sin flaska i tid. Baren håller.', delta: { kassa: 1, nojdhet: 1, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Loungen har väntat för länge. Värden reser sig för att fråga själv.', delta: { kassa: 0, nojdhet: -2, ork: -1 }, effect: 'standUp' },
        why: 'Varje station har den som kan den bäst. Den som leder skickar folk dit de gör mest nytta och kliver själv in där det brinner.' }
    ] },
  { id: 'notan', at: 380, targetPhases: ['askBill', 'talk', 'waitImpatient', 'waitCalm'], prefer: ['lounge', 'two'], who: 'Loungen',
    story: 'Ett sällskap har bett om notan två gånger. Servitören är i andra änden av rummet.',
    lesson: { title: 'Sista minuten är den de minns', pavilion: 'Kalastorget' },
    steps: [
      { step: 'episteme', question: 'Vad minns en gäst tydligast av en kväll?', answers: [{ key: '1', text: 'Den första rätten' }, { key: '2', text: 'Det bästa ögonblicket och slutet' }, { key: '3', text: 'Priset' }], correct: '2',
        right: { says: 'Du vet vad som står på spel.', delta: { kassa: 0, nojdhet: 0, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Servitören tar över notan när hon hinner.', delta: { kassa: 0, nojdhet: -1, ork: -1 }, effect: 'takeover', takeover: 'server' },
        why: 'Minnet av en kväll byggs av toppen och slutet. En bra kväll som slutar i väntan blir en kväll som slutade i väntan.' },
      { step: 'techne', question: 'Hur tar du notan när servitören är upptagen?', answers: [{ key: '1', text: 'Hämtar kortterminalen och tar den vid bordet' }, { key: '2', text: 'Vinkar till servitören' }, { key: '3', text: 'Ber dem betala i baren' }], correct: '1',
        right: { says: 'De betalar och lämnar dricks. ”Vi kommer tillbaka.”', delta: { kassa: 1, nojdhet: 1, ork: 1 }, effect: 'calm' },
        wrong: { says: 'Servitören springer över rummet. Bordet bredvid får vänta.', delta: { kassa: 0, nojdhet: -1, ork: -2 }, effect: 'takeover', takeover: 'server' },
        why: 'Den som står närmast tar det. Notan är lika mycket service som vinet, och den väntar inte på rätt titel.' },
      { step: 'phronesis', question: 'De vill dela notan i fyra, och bordet bakom väntar på sin mat. Vad gör du först?', answers: [{ key: '1', text: 'Säger till köket att du bär ut om två minuter, och delar notan nu' }, { key: '2', text: 'Bär maten först, notan får vänta' }, { key: '3', text: 'Ber dem betala allt på ett kort' }], correct: '1',
        right: { says: 'Båda borden är klara inom tre minuter.', delta: { kassa: 1, nojdhet: 1, ork: 0 }, effect: 'calm' },
        wrong: { says: 'Sällskapet reser sig och väntar stående vid bordet.', delta: { kassa: 0, nojdhet: -2, ork: 0 }, effect: 'standUp' },
        why: 'Två bord som väntar är två löften. Säg till köket, så väntar maten på dig i stället för tvärtom.' }
    ] }
];

/** 2–4 raketer per kväll: en tisdag två, en lördag fyra. */
export function rocketsForEvening(busy: number): Rocket[] {
  const n = Math.max(2, Math.min(4, Math.floor(2 + 2.2 * busy)));
  if (n >= 4) return ROCKETS.slice();
  return n === 3 ? [ROCKETS[0], ROCKETS[2], ROCKETS[3]] : [ROCKETS[0], ROCKETS[2]];
}

/** Mätarna efter ett utfall, klampade till 0..METER_STEPS. */
export function applyOutcome(meters: Record<Meter, number>, o: Outcome): Record<Meter, number> {
  const out = { ...meters };
  (Object.keys(o.delta) as Meter[]).forEach(function (m) { out[m] = Math.max(0, Math.min(METER_STEPS, out[m] + o.delta[m])); });
  return out;
}

/** Kvällens lärdom: raketen som föll tidigast (episteme väger tyngst). Null = alla steg klarade. */
export function pickLesson(results: RocketResult[]): { result: RocketResult; step: RocketStep } | null {
  const failed = results.filter(function (r) { return r.failedAt !== null; });
  if (!failed.length) return null;
  failed.sort(function (a, b) { return (a.failedAt as number) - (b.failedAt as number); });
  const r = failed[0];
  return { result: r, step: r.rocket.steps[r.failedAt as number] };
}

/** Tillståndet när spelaren saknar både verksamhet och pengar: enda vägen är Måltidens hus. */
export function isStranded(state: { businessClass: string | null; cash: number; minimumStake: number }): boolean {
  return !state.businessClass && state.cash < state.minimumStake;
}

export const FLAGS = {
  eventBank:
    'ROCKETS är fyra raketer för Vinbaren, lördag, skrivna av oss. Speldesignen behöver en raketbank per klass och kväll: berättelse, tre steg (episteme, techne, phronesis) med 3–4 svar, ett rätt svar, ett utfall för rätt och ett för fel, och ett varför per steg.',
  meters:
    'Kassa, gästerna och personalen är tio steg var. Hur de räknas mot ' +
    'sim-lagrets ekonomi, efterfrågan och ork är sim-lagrets beslut. Mätarna ' +
    'visar riktning, inte belopp.',
  tempo:
    'Rummet går i full fart under raketen (EVENT_TEMPO 1). Stegen har 15, 20 och 30 s realtid. Går tiden ut räknas det som fel svar, och personalen tar över.',
  flow:
    'createServiceFlow är en presentationsmodell av kvällen: girig tilldelning, ' +
    'deterministisk. Sim-lagret äger vilka sällskap som kommer och när; ' +
    'modellen visar hur rörelsen ska se ut när de gör det.',
  quizReplaced:
    'Action-knappen och quizen utgår. Raketerna ersätter båda, och kvällens lärdom visar vilka steg som klarades, vad som gick fel och varför.'
};

/** Kvällens mått — det provet i LEVERANSNOT §5 läser. */
export function flowStats(flow: ServiceFlow) {
  const p = flow.parties;
  const avg = (f: (x: Party) => number) => p.length ? p.reduce(function (a, x) { return a + f(x); }, 0) / p.length : 0;
  const staffEnd = Math.max.apply(null, flow.actors.filter(function (a) { return a.kind === 'staff'; }).map(function (a) { return a.segments.length ? a.segments[a.segments.length - 1].t1 : 0; }));
  const guestEnd = Math.max.apply(null, p.map(function (x) { return x.leftAt; }).concat([0]));
  return {
    parties: p.length,
    avgOrderWait: avg(function (x) { return x.waitOrder; }),
    avgBillWait: avg(function (x) { return x.waitBill; }),
    over18: p.filter(function (x) { return x.waitOrder > 18 || x.waitBill > 18; }).length,
    lastGuestOut: guestEnd,
    staffDone: staffEnd,
    unfinished: p.filter(function (x) { return !x.leftAt || x.leftAt > flow.length; }).length
  };
}
