// byKvallSim.js — prototypens kväll i byn (byn i kvällsljus, omtag 2026-10-02 på spelets riktiga karta).
// Gästerna, sällskapen, bilarna och food truckarna, styrda av kvällens gång e (0–1).
// Enheten här är decimeter i spelets världsram (map() delar med 10 till meter), så att gångfarterna
// och avstånden i byTruckar.js och varmScen.js gäller oförändrade.
// Talen här (öppettider som e, gångfarter, preferenser) är prototypens och hör hemma i balance.ts och
// sim-lagret. Kön har inga egna tal: gränserna står som platshållare i balance (VILLAGE_QUEUE), och
// prototypen fyller bara i dem för att kunna spelas (PROTO_QUEUE, följer inte med). Slumpen har ett frö.
import { walk, drive, nearestNode, routeNodes, BUILDING, VENUE_BUILDINGS, TRUCK_SPOT_POINTS, PLACES, isHome, doorOf, polygonCentroid, playerVenue, landmark } from './byKvallPlats.js';
import { BUILDINGS } from './byKarta.js';

const U = 10, M = (p) => [p[0] * U, p[1] * U];
export const N = walk.nodes.map(M);
export const REST_DEF = [
  { id: 'var', stars: 2, H: 3.7, own: true },
  { id: 'torg', stars: 3, H: 4.6 },
  { id: 'pizza', stars: 1, H: 3.8 },
  { id: 'sjo', stars: 2, H: 3.6 },
  { id: 'hotell', stars: 4, H: 7.4, hotel: true }
];
// Öppet från–till i e. Spelarens krog styrs i spelet av spelaren.
export const OPEN = { var: [0.04, 0.9], torg: [0, 0.86], pizza: [0, 0.62], sjo: [0.08, 0.76], hotell: [0, 1.01], grill: [0.05, 0.7], taco: [0.12, 0.58] };
export const T = {
  student: { looks: ['student'], speed: 22 },
  medel: { looks: ['medel', 'medel2', 'medel3'], speed: 18 },
  hog: { looks: ['hog'], speed: 17 },
  social: { looks: ['social'], speed: 16 },
  miljardar: { looks: ['miljardar'], speed: 11 }
};
export const PREF = { student: { pizza: 5, sjo: 2, torg: 1, var: 1.2, hotell: 0 }, medel: { torg: 3, sjo: 2.6, var: 2.4, pizza: 1, hotell: 0.6 }, hog: { hotell: 3, var: 2, torg: 1.5, sjo: 1, pizza: 0 }, social: { var: 3, torg: 2, sjo: 1.5, hotell: 1, pizza: 0.3 } };
const SKIN = ['#f0d2b4', '#e2b793', '#c9966f', '#a8724f', '#7d4f34', '#5c3a26'];
const HAIR = ['#2a1a12', '#4a2e1c', '#7a5230', '#c9a36a', '#1a1414', '#9b948c', '#8a3a22'];
const CAR_COLS = ['#2b2f3a', '#5a4a3a', '#1f2a24', '#8a8478', '#3a3f4a'];
// dwellS: hur länge ett sällskap sitter inne (realtid). I spelet sittiden ur balance.ts SITTING.
export const PROTO = { maxGroups: 90, eveningS: 420, nearHomeM: 260, campusReachM: 380, dwellS: [55, 95] };
/** Prototypens ifyllnad av köns platshållare. Följer INTE med till spelet: Code sätter VILLAGE_QUEUE. */
export const PROTO_QUEUE = { seats: 20, patienceS: 45, impatientBelow: 0.4 };

export const hash = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const zero = () => ({ student: 0, medel: 0, hog: 0, social: 0, miljardar: 0 });
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export class VillageSim {
  /** room = createWineBarRoom() (wineBarRoom.ts). queue = VILLAGE_QUEUE ur balance (platshållare, null = ej satt). */
  constructor({ BYT, LIGHTS, room, queue = {}, seed = 288 }) {
    this.BYT = BYT; this.L = LIGHTS; this.r = rng(seed); this.N = N; this.T = T; this.PREF = JSON.parse(JSON.stringify(PREF));
    this.Q = { seats: queue.seats ?? PROTO_QUEUE.seats, patienceS: queue.patienceSimSeconds ?? PROTO_QUEUE.patienceS, impatientBelow: queue.impatientBelow ?? PROTO_QUEUE.impatientBelow, placeholders: Object.keys(PROTO_QUEUE).filter((k) => queue[k === 'patienceS' ? 'patienceSimSeconds' : k] == null) };
    this.PV = playerVenue(room);
    this.REST = REST_DEF.map((d) => {
      const rs = { ...d };
      if (d.own) { rs.poly = this.PV.shell; rs.door = M(this.PV.door); rs.nrm = this.PV.nrm; rs.wait = M(this.PV.local(room.width / 2 + 2.5, 0)); rs.cap = this.Q.seats; rs.obb = this.PV.obb; }
      else { rs.poly = BUILDING.get(VENUE_BUILDINGS[d.id]).poly; const e = doorOf(rs.poly); rs.door = M(e.mid); rs.nrm = e.n; rs.edge = e; }
      const c = polygonCentroid(rs.poly); rs.cx = c[0] * U; rs.cy = c[1] * U;
      rs.node = nearestNode(walk, rs.door[0] / U + rs.nrm[0] * 2.5, rs.door[1] / U + rs.nrm[1] * 2.5);
      return rs;
    });
    this.queueSpots = this.PV.queue.map((q) => ({ ...q, at: M(q.at) }));
    this.walkers = []; this.cars = []; this.pops = []; this.queue = []; this.pending = []; this.seated = []; this.t = 0; this.e = 0; this.over = {}; this.holdUntil = -1;
    this.nextSpawn = 0.5; this.nextCar = 4; this.nextSoc = 20; this.nextM = 40;
    this.installTrucks(BYT);
    this.counts = {}; this.inside = {}; this.REST.forEach((r) => { this.counts[r.id] = zero(); this.inside[r.id] = zero(); });
    const H = LIGHTS.homes;
    const venueIds = new Set(Object.values(VENUE_BUILDINGS));
    this.houses = BUILDINGS.filter((b) => isHome(b) && !venueIds.has(b.id)).map((b, i) => {
      const e = doorOf(b.poly), front = [e.mid[0] + e.n[0] * 1.2, e.mid[1] + e.n[1] * 1.2];
      return { i, id: b.id, poly: b.poly, front: M(front), node: nearestNode(walk, front[0], front[1]), on: lerp(...H.on, hash(i, 1)), goesOut: hash(i, 2) < H.goesOutShare, out: lerp(...H.out, hash(i, 3)), back: lerp(...H.back, hash(i, 4)), bed: lerp(...H.bed, hash(i, 5)), waiting: null };
    });
    const camp = BUILDING.get('w193810975'), ce = doorOf(camp.poly);
    this.campus = { front: M([ce.mid[0] + ce.n[0] * 1.5, ce.mid[1] + ce.n[1] * 1.5]), node: nearestNode(walk, PLACES.campus[0], PLACES.campus[1]) };
    const hot = this.REST.find((r) => r.hotel); this.hotel = { front: this.gp(hot), node: hot.node };
    this.church = nearestNode(walk, ...landmark('gry-kyrka')); this.torget = nearestNode(walk, ...PLACES.torget);
    this.setupCars();
  }
  map = (x, y) => [x / U, y / U];
  pick(a) { return a[Math.floor(this.r() * a.length)]; }
  bfs(a, b) { return routeNodes(walk, a, b); }
  /** Food truckarnas tre platser (paket 2) på kartan: villagePlaces.ts TRUCK_SPOT_POINTS. */
  installTrucks(BYT) {
    Object.entries(TRUCK_SPOT_POINTS).forEach(([id, p]) => {
      const k = nearestNode(walk, p[0], p[1]), q = walk.nodes[k], nb = walk.adj[k][0] ? walk.nodes[walk.adj[k][0].to] : [q[0] + 1, q[1]];
      const t = [nb[0] - q[0], nb[1] - q[1]], tl = Math.hypot(...t) || 1; let n = [q[0] - p[0], q[1] - p[1]], nl = Math.hypot(...n);
      if (nl < 1.5) { n = [-t[1] / tl, t[0] / tl]; nl = 1; } else n = [n[0] / nl, n[1] / nl];
      const pos = nl < 4 ? [q[0] - n[0] * 4, q[1] - n[1] * 4] : p;
      Object.assign(BYT.SPOTS[id], { pos: M(pos), a: Math.atan2(t[1], t[0]), node: k, door: M([pos[0] + n[0] * 2.6, pos[1] + n[1] * 2.6]) });
    });
    BYT.install(this, 0);
  }
  setupCars() {
    const P = PLACES.parking, pk = nearestNode(drive, P[0], P[1]), q = drive.nodes[pk], nb = drive.nodes[drive.adj[pk][0].to], L = Math.hypot(nb[0] - q[0], nb[1] - q[1]) || 1, t = [(nb[0] - q[0]) / L, (nb[1] - q[1]) / L], n = [-t[1], t[0]];
    this.park = { node: pk, slots: [-9, -4.5, 0, 4.5, 9].map((s) => ({ kerb: [q[0] + t[0] * s, q[1] + t[1] * s], at: [q[0] + t[0] * s + n[0] * 3.4, q[1] + t[1] * s + n[1] * 3.4] })), a: Math.atan2(t[1], t[0]) };
    const T0 = PLACES.torget, ends = [];
    drive.nodes.forEach((p, i) => { const r = dist(p, T0); if (drive.main[i] && r > 300 && r < 430) ends.push({ i, p, r }); });
    ends.sort((a, b) => b.r - a.r); this.carEntries = [];
    for (const e of ends) { if (this.carEntries.every((k) => dist(drive.nodes[k], e.p) > 300)) this.carEntries.push(e.i); if (this.carEntries.length >= 3) break; }
    if (!this.carEntries.length) this.carEntries.push(pk);
  }
  /** Där sällskapet samlas: på trottoaren framför dörren (vår krog: rummets waitingSpot). */
  gp(rs) { if (rs.truck) return rs.door.slice(); if (rs.wait) return rs.wait.slice(); return [rs.door[0] + rs.nrm[0] * 12, rs.door[1] + rs.nrm[1] * 12]; }
  outOf(rs) { return [rs.door[0] + rs.nrm[0] * 8, rs.door[1] + rs.nrm[1] * 8]; }
  isOpen(rs) { const o = this.over[rs.id]; if (o != null) return o; const [a, b] = OPEN[rs.id]; return this.e >= a && this.e < b; }
  houseLit(h) {
    const e = this.e; if (e < h.on || e >= h.bed) return false;
    if (h.goesOut && e >= h.out && (e < h.back || (h.waiting && !h.waiting.gone))) return false;
    return true;
  }
  arrivalRate(e) { return 0.15 + 0.85 * smooth(0, 0.12, e) * (1 - smooth(0.5, 0.82, e)); }
  leaveRate(e) { return smooth(0.3, 0.6, e); }
  choose(type, not) {
    const P = this.PREF[type]; if (!P) return null; let tot = 0;
    const w = this.REST.map((r) => { const v = (r.closed || r.shut || r === not ? 0 : (P[r.id] || 0)) * (type === 'student' ? 1 : 0.4 + 0.35 * r.stars); tot += v; return v; });
    if (tot <= 0) return null;
    let x = this.r() * tot; for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0 && w[i] > 0) return this.REST[i]; } return null;
  }
  /** Ett bostadshus nära platsen, så att paren inte går genom halva byn. */
  nearHome(p) { const R = PROTO.nearHomeM * U, near = this.houses.filter((h) => dist(h.front, p) < R); if (near.length) return this.pick(near); return this.houses.slice().sort((a, b) => dist(a.front, p) - dist(b.front, p))[0]; }
  group(type, pts, o = {}) {
    const n = o.n || 1, looks = Array.from({ length: n }, () => this.pick(T[type].looks));
    const a = pts[1] ? Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) : 0;
    const w = { type, n, looks, skins: looks.map(() => this.pick(SKIN)), hairs: looks.map(() => this.pick(HAIR)), longs: looks.map(() => this.r() < 0.5), x: pts[0][0], y: pts[0][1], a, pts, nodes: o.nodes || [], off: o.off ?? 1, seg: 0, rest: o.rest || null, speed: T[type].speed * (0.9 + this.r() * 0.2), stop: 0, lookAt: null, ring: o.ring || null, seed: this.r() * 9, odo: 0, mv: 0 };
    this.walkers.push(w); return w;
  }
  toVenue(type, fromNode, start, rs, o = {}) {
    if (!rs) return null; const nodes = this.bfs(fromNode, rs.node);
    const pts = (start ? [start] : []).concat(nodes.map((k) => N[k].slice()), [this.gp(rs)]);
    return this.group(type, pts, { ...o, rest: rs, nodes, off: start ? 1 : 0 });
  }
  spawnRandom() {
    const x = this.r();
    if (x < 0.34) {
      const rs = this.choose('student'); if (!rs) return;
      if (dist(this.campus.front, rs.door) < PROTO.campusReachM * U) this.toVenue('student', this.campus.node, this.campus.front, rs, { n: 2 + Math.floor(this.r() * 3) });
      else { const h = this.nearHome(rs.door); this.toVenue('student', h.node, h.front, rs, { n: 2 + Math.floor(this.r() * 2) }); }
    } else if (x < 0.64) { const rs = this.choose('medel'); if (rs) { const h = this.nearHome(rs.door); this.toVenue('medel', h.node, h.front, rs, { n: this.r() < 0.75 ? 2 : 3 }); } }
    else if (x < 0.78) this.toVenue('hog', this.hotel.node, this.hotel.front, this.choose('hog'), { n: 2 });
    else this.spawnCar();
  }
  spawnCar() {
    if (this.cars.filter((c) => !c.gone).length > 4) return;
    const used = new Set(this.cars.map((c) => c.slotI)); let slotI = 0; while (used.has(slotI) && slotI < 5) slotI++; if (slotI >= 5) return;
    const slot = this.park.slots[slotI], entry = this.pick(this.carEntries), route = routeNodes(drive, entry, this.park.node).map((k) => M(drive.nodes[k]));
    const pts = route.concat([M(slot.kerb), M(slot.at)]);
    this.cars.push({ slotI, pts, back: pts.slice().reverse(), seg: 0, x: pts[0][0], y: pts[0][1], a: pts[1] ? Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) : 0, col: this.pick(CAR_COLS), type: this.r() < 0.6 ? 'hog' : 'medel', n: 2, parked: 0, slot: M(slot.at) });
  }
  departCar(c) { if (!c || c.leaving) return; c.leaving = true; c.parked = 0; c.pts = [[c.x, c.y]].concat(c.back.slice(1)); c.seg = 0; }
  homeFor(type, w) {
    const parked = this.cars.filter((c) => c.parked && !c.reserved && !c.leaving);
    if ((type === 'hog' || type === 'medel') && parked.length && this.r() < (type === 'hog' ? 0.6 : 0.4)) { const c = parked[0]; c.reserved = true; return { node: nearestNode(walk, c.slot[0] / U, c.slot[1] / U), end: c.slot.slice(), car: c }; }
    if (type === 'student') { if (dist(this.campus.front, [w.x, w.y]) < PROTO.campusReachM * U) return { node: this.campus.node, end: this.campus.front.slice() }; }
    if (type === 'hog' || type === 'miljardar') return { node: this.hotel.node, end: this.hotel.front.slice() };
    const h = this.nearHome([w.x, w.y]); return { node: h.node, end: h.front.slice() };
  }
  goHome(w, fromNode) {
    const h = this.homeFor(w.type, w), nodes = this.bfs(fromNode ?? (w.rest && w.rest.node) ?? this.torget, h.node);
    w.pts = [[w.x, w.y]].concat(nodes.map((k) => N[k].slice()), [h.end]); w.seg = 0; w.nodes = nodes; w.off = 1;
    w.rest = null; w.leaving = true; w.car = h.car || null; w.gathered = false; w.atDoor = false; w.queued = false; w.stop = 0; w.lookAt = null;
  }
  /** Ett sällskap som har suttit klart går ut genom dörren och hem. */
  spawnLeave(s) {
    const i = this.seated.indexOf(s); if (i >= 0) this.seated.splice(i, 1);
    const rs = s.rs, ins = this.inside[rs.id]; ins[s.type] = Math.max(0, ins[s.type] - s.n);
    const out = this.outOf(rs), w = this.group(s.type, [out], { n: s.n }); this.goHome(w, rs.node); w.pts[0] = out; return w;
  }
  sit(rs, type, n, dwell) { if (type === 'miljardar') return; this.seated.push({ rs, type, n, at: this.t + (dwell ?? lerp(...PROTO.dwellS, this.r())) }); }
  spawnFromHouse(h) {
    const rs = this.choose('medel'); if (!rs) return;
    const nodes = this.bfs(h.node, rs.node);
    this.group('medel', [h.front.slice()].concat(nodes.map((k) => N[k].slice()), [this.gp(rs)]), { n: 2, rest: rs, nodes, off: 1 });
  }
  spawnHome(h) {
    const src = this.seated.filter((s) => s.type === 'medel'); if (!src.length) return;
    const s = src.sort((a, b) => dist(a.rs.door, h.front) - dist(b.rs.door, h.front))[0], rs = s.rs, k = s.n; this.seated.splice(this.seated.indexOf(s), 1); this.inside[rs.id].medel = Math.max(0, this.inside[rs.id].medel - k);
    const out = this.outOf(rs), nodes = this.bfs(rs.node, h.node), w = this.group('medel', [out].concat(nodes.map((n) => N[n].slice()), [h.front.slice()]), { n: k, nodes, off: 1 });
    w.leaving = true; w.house = h; h.waiting = w;
  }
  spawnSocial() {
    if (this.walkers.some((w) => w.type === 'social')) return;
    const rs = this.choose('social'); if (!rs) return; const h = this.nearHome(rs.door);
    const w = this.toVenue('social', h.node, h.front, rs, { ring: 'social' }); if (w) w.followers = 0;
  }
  spawnMiljardar() {
    if (this.walkers.some((w) => w.type === 'miljardar')) return;
    const best = this.REST.filter((r) => !r.shut).sort((a, b) => b.stars - a.stars)[0]; if (!best) return;
    const our = this.REST.find((r) => r.own), stops = [this.hotel.node, this.torget, this.church, our.node, best.node]; let nodes = [stops[0]];
    for (let i = 1; i < stops.length; i++) nodes = nodes.concat(this.bfs(stops[i - 1], stops[i]).slice(1));
    this.group('miljardar', [this.hotel.front.slice()].concat(nodes.map((k) => N[k].slice()), [this.gp(best)]), { rest: best, nodes, off: 1, ring: 'miljardar' });
  }
  closeOut(rs) {
    if (rs.truck) return;
    // Sällskapen som var kvar går ut i grupper, ett i taget.
    let d = 0.4; this.seated.filter((s) => s.rs === rs).forEach((s) => { s.at = Infinity; this.pending.push({ at: this.t + d, s }); d += 0.8 + this.r() * 1.6; });
    if (rs.own) this.queue.slice().forEach((w) => { this.queue.splice(this.queue.indexOf(w), 1); this.goHome(w, rs.node); });
  }
  /** Köplats i: rummets queueSpots i ordning (dörrmattan först, sedan trottoaren), i byns enhet. */
  queueSpot(i) { return this.queueSpots[Math.min(i, this.queueSpots.length - 1)]; }
  advance(w, dt) {
    w.mv = 0;
    if (w.queued) {
      const i = this.queue.indexOf(w), q = this.queueSpot(Math.max(0, i)), [qx, qy] = q.at, dx = qx - w.x, dy = qy - w.y, d = Math.hypot(dx, dy), sp = w.speed * 0.7 * dt;
      if (d > 0.5) { const m = Math.min(d, sp); w.x += dx / d * m; w.y += dy / d * m; w.odo += m / 10; w.mv = 1; w.a = Math.atan2(dy, dx); } else w.a = q.a;
      w.patience -= dt; w.impatient = w.patience / w.patience0 < this.Q.impatientBelow;
      if (w.patience < 0 && i > 0) { this.queue.splice(i, 1); w.gaveUp = true; this.goHome(w, this.REST.find((r) => r.own).node); }
      return;
    }
    if (w.stop > 0) { w.stop -= dt; return; }
    const p = w.pts[w.seg + 1]; if (!p) { this.arrive(w); return; }
    const dx = p[0] - w.x, dy = p[1] - w.y, d = Math.hypot(dx, dy), sp = w.speed * dt;
    if (d <= sp) { w.x = p[0]; w.y = p[1]; w.seg++; w.odo += d / 10; } else { w.x += dx / d * sp; w.y += dy / d * sp; w.odo += sp / 10; const ta = Math.atan2(dy, dx); w.a += Math.atan2(Math.sin(ta - w.a), Math.cos(ta - w.a)) * Math.min(1, dt * 6); }
    w.mv = 1;
  }
  redirect(w, rs) {
    const alt = this.choose(w.type === 'miljardar' ? 'hog' : w.type, rs);
    if (alt) { const nodes = this.bfs(rs.node, alt.node); w.pts = [[w.x, w.y]].concat(nodes.map((k) => N[k].slice()), [this.gp(alt)]); w.seg = 0; w.nodes = nodes; w.off = 1; w.rest = alt; } else this.goHome(w, rs.node);
  }
  arrive(w) {
    const rs = w.rest;
    if (rs && rs.truck) { if (!w.ate) { if (rs.shut || rs.drive) { this.goHome(w, rs.node); return; } this.BYT.eat(this, w); return; } this.goHome(w, rs.node); return; }
    if (rs) {
      if (!w.gathered) {
        if (rs.shut) { this.redirect(w, rs); return; }
        if (rs.cap && !w.admitted && sum(this.inside[rs.id]) + w.n > rs.cap && w.type !== 'miljardar') {
          // Kön är lika lång som rummets köplatser. Är alla tagna väljer sällskapet en annan krog.
          if (this.queue.length >= this.queueSpots.length) { w.turnedAway = true; this.redirect(w, rs); return; }
          w.queued = true; w.patience0 = w.patience = this.Q.patienceS * (0.7 + this.r() * 0.6); this.queue.push(w); return;
        }
        // Sällskapet samlas vid dörren innan det går in.
        w.a = Math.atan2(-rs.nrm[1], -rs.nrm[0]); w.gathered = true; w.atDoor = true; w.stop = 1.8; return;
      }
      w.gone = true; this.inside[rs.id][w.type] += w.n; this.counts[rs.id][w.type] += w.n; this.sit(rs, w.type, w.n);
      this.pops.push({ x: w.x, y: w.y, until: this.t + 1.2, type: w.type, n: w.n });
      return;
    }
    w.gone = true;
    if (w.car) this.departCar(w.car);
  }
  /** dt = 0 betyder pausat: då räknas bara läget om (öppet/stängt, husen) för det e som visas. */
  update(dt, e) {
    const pe = this.e; this.e = e; const fwd = dt > 0 && e >= pe && e - pe < 0.03;
    this.t += dt;
    const VL = this.L.venue;
    this.REST.forEach((rs) => {
      const op = this.isOpen(rs);
      if (rs.open === undefined) { rs.open = op; rs.changedAt = -99; }
      else if (op !== rs.open) { rs.open = op; rs.changedAt = this.t; rs.changedReal = performance.now(); if (!op) this.closeOut(rs); }
      rs.shut = !op; rs.prep = !op && e < OPEN[rs.id][0] && this.over[rs.id] == null;
      rs.cleaning = !op && !rs.prep && (performance.now() - (rs.changedReal || -1e9)) / 1000 < VL.cleaningS;
    });
    if (fwd) this.houses.forEach((h) => { if (!h.goesOut) return; if (pe < h.out && e >= h.out) this.spawnFromHouse(h); if (pe < h.back && e >= h.back) this.spawnHome(h); });
    if (dt <= 0) return;
    const A = this.arrivalRate(e), Lv = this.leaveRate(e), groups = this.walkers.length;
    this.nextSpawn -= dt * A; if (this.nextSpawn <= 0) { if (groups < PROTO.maxGroups) this.spawnRandom(); this.nextSpawn = 1.4 + this.r() * 1.2; }
    // Sällskapen som har suttit klart går, tidigare när kvällen lider (leaveRate).
    this.seated.slice().forEach((s) => { if (s.at - Lv * 25 <= this.t && !(s.rs.own && this.t < this.holdUntil)) this.spawnLeave(s); });
    this.nextCar -= dt * A; if (this.nextCar <= 0) { this.spawnCar(); this.nextCar = 12 + this.r() * 8; }
    if (A > 0.5) { this.nextSoc -= dt; if (this.nextSoc <= 0) { this.spawnSocial(); this.nextSoc = 40; } this.nextM -= dt; if (this.nextM <= 0) { this.spawnMiljardar(); this.nextM = 90; } }
    this.pending = this.pending.filter((p) => { if (p.at > this.t) return true; this.spawnLeave(p.s); return false; });
    // Kön: nästa sällskap går in när det finns plats.
    const our = this.REST.find((r) => r.own);
    while (this.queue[0] && !our.shut && sum(this.inside[our.id]) + this.queue[0].n <= our.cap) { const w = this.queue.shift(); w.queued = false; w.admitted = true; w.pts = [[w.x, w.y], this.gp(our)]; w.seg = 0; }
    this.BYT.update(this, dt);
    this.walkers.forEach((w) => this.advance(w, dt));
    this.meet(dt);
    this.walkers = this.walkers.filter((w) => !w.gone);
    this.cars.forEach((c) => {
      if (c.parked) { c.parked += dt; if (c.parked > 200 && !c.reserved) this.departCar(c); return; }
      const p = c.pts[c.seg + 1];
      if (!p) { if (c.leaving) { c.gone = true; return; } c.parked = 0.001; c.a = this.park.a; const dest = this.choose(c.type); if (dest) this.toVenue(c.type, nearestNode(walk, c.slot[0] / U, c.slot[1] / U), c.slot.slice(), dest, { n: c.n }); return; }
      const dx = p[0] - c.x, dy = p[1] - c.y, d = Math.hypot(dx, dy), slow = c.leaving ? c.seg < 2 : c.seg >= c.pts.length - 4, sp = (slow ? 40 : 110) * dt;
      if (d <= sp) { c.x = p[0]; c.y = p[1]; c.seg++; } else { c.x += dx / d * sp; c.y += dy / d * sp; const ta = Math.atan2(dy, dx); c.a += Math.atan2(Math.sin(ta - c.a), Math.cos(ta - c.a)) * Math.min(1, dt * 5); }
    });
    this.cars = this.cars.filter((c) => !c.gone);
    this.pops = this.pops.filter((p) => p.until > this.t);
  }
  /** Lova och miljardären: folk stannar, vinkar, och några följer Lova. */
  meet() {
    const stars = this.walkers.filter((w) => w.type === 'social' || w.type === 'miljardar');
    stars.forEach((s) => this.walkers.forEach((o) => {
      if (o === s || o.type === 'social' || o.type === 'miljardar' || o.gone || o.queued || o.met) return;
      const d = Math.hypot(o.x - s.x, o.y - s.y), R = s.type === 'miljardar' ? 90 : 60; if (d >= R) return;
      o.met = s; o.lookAt = s;
      if (s.type === 'miljardar') { o.stop = 1.6; return; }
      o.stop = 1; o.wave = this.t + 1;
      if (this.r() < 0.4 && o.type !== 'student' && s.rest && !o.leaving && !o.ate) {
        const from = o.nodes[Math.max(0, Math.min(o.seg + 1 - o.off, o.nodes.length - 1))] ?? this.torget, nodes = this.bfs(from, s.rest.node);
        o.pts = [[o.x, o.y]].concat(nodes.map((k) => N[k].slice()), [this.gp(s.rest)]); o.nodes = nodes; o.off = 1; o.seg = 0; o.rest = s.rest; o.ring = 'follow'; o.speed = Math.max(o.speed, s.speed);
        s.followers = (s.followers || 0) + o.n;
      }
    }));
  }
  /**
   * Fullt hus, som scen 5 i vardagens koreografi: rummet är fullt (alla platser sålda) och sällskap står
   * på köplatserna. Kapaciteten och tålamodet ändras inte; det är ett läge, inte andra tal.
   */
  fullHouse(parties = 6) {
    const our = this.REST.find((r) => r.own), ins = this.inside[our.id];
    Object.keys(ins).forEach((k) => (ins[k] = 0)); this.seated = this.seated.filter((s) => s.rs !== our);
    [['medel', 2], ['medel', 3], ['medel', 2], ['hog', 2], ['medel', 2], ['social', 2], ['medel', 3], ['hog', 2], ['medel', 2]].forEach(([type, n]) => { ins[type] += n; this.sit(our, type, n, 60 + this.r() * 40); });
    this.queue.forEach((w) => (w.gone = true)); this.queue = []; this.walkers = this.walkers.filter((w) => !w.gone);
    for (let i = 0; i < Math.min(parties, this.queueSpots.length); i++) {
      const q = this.queueSpot(i), type = i % 3 === 2 ? 'hog' : 'medel', w = this.group(type, [q.at.slice()], { n: 2 + (i % 2), rest: our });
      w.queued = true; w.a = q.a; w.patience0 = this.Q.patienceS * 1.3; w.patience = w.patience0 * (1 - i * 0.12); this.queue.push(w);
    }
    this.holdUntil = this.t + 90;
  }
  /** Sällskap som sitter inne på en krog (för kontrollbilderna: en krog som stänger med gäster kvar). */
  seatParties(id, k) { const rs = this.REST.find((r) => r.id === id); for (let i = 0; i < k; i++) { const type = i % 3 === 2 ? 'medel' : 'student', n = 2 + (i % 2); this.inside[id][type] += n; this.sit(rs, type, n, 400); } }
  /** Kör sim-lagret en stund, för kontrollbilder och för att starta mitt i kvällen. e går från e0 till e. */
  warm(e, seconds, step = 0.1, e0 = e) { this.update(0, e0); const n = Math.max(1, Math.round(seconds / step)); for (let i = 1; i <= n; i++) this.update(step, lerp(e0, e, i / n)); }
  insideTotal(id) { return sum(this.inside[id]); }
}
