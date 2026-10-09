// ORDER 323 §6 (Anders 2026-10-09: "Bilar kör längs vägarna, saktar in i
// korsningar och stannar vid övergångsställen").
//
// Bilarna i byn (OsmTraffic) följer en OSM-väg var. Här räknas platserna
// längs vägen där de ska sakta in eller stanna, i meter från vägens början:
//   - korsning: där en annan bilväg (VILLAGE_CAR_ROADS, MAJOR_ROADS) skär
//     vägen eller slutar på den;
//   - övergångsställe: där en gångväg som inte är bilväg (PED_PATHS, car =
//     false: gångbana, stig, trappa …) skär vägen eller slutar på den.
// Farten räknas i meter per sekund ur vägens hastighetsgräns
// (cruiseSpeed), och targetSpeed ger farten mot nästa plats framåt.

import { MAJOR_ROADS, PED_PATHS, VILLAGE_CAR_ROADS, type RawRoad } from '../content/world';

type Vec2 = readonly [number, number];
export type StopKind = 'junction' | 'crossing';
export interface RoadStop { s: number; kind: StopKind; x: number; z: number }

/** En väg som slutar så här nära en annan räknas som ansluten (meter). */
const TOUCH_M = 3;
/** Två platser närmare än så slås ihop (meter). */
const MERGE_M = 6;

export const TRAFFIC_STOPS = {
  /** Farten genom en korsning, andel av vägens fart (och minst minMps). */
  junctionShare: 0.35,
  minMps: 2.5,
  /** Inbromsningen börjar så långt före en korsning (meter). */
  junctionSlowM: 28,
  /** Farten förbi ett tomt övergångsställe, andel av vägens fart. */
  crossingShare: 0.5,
  crossingSlowM: 22,
  /** Bilen stannar om en gående står så här nära övergångsstället (meter). */
  crossingWalkerM: 7,
  /** … och stannar så här långt före (meter). */
  stopBeforeM: 3.5,
  /** Längst så här länge innan bilen kör ändå (sekunder). */
  maxWaitS: 8,
  /** Vid vägens ände vänder bilen i den här farten (m/s). */
  turnMps: 2,
  accelMps2: 2.5,
  brakeMps2: 4.5
} as const;

interface Seg { ax: number; az: number; bx: number; bz: number }
interface Indexed { id: string; segs: Seg[]; ends: Vec2[]; minX: number; maxX: number; minZ: number; maxZ: number }

function indexRoad(r: RawRoad): Indexed {
  const segs: Seg[] = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < r.poly.length; i++) {
    const [x, z] = r.poly[i];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    if (i > 0) segs.push({ ax: r.poly[i - 1][0], az: r.poly[i - 1][1], bx: x, bz: z });
  }
  return { id: r.id.split('#')[0], segs, ends: [r.poly[0], r.poly[r.poly.length - 1]], minX, maxX, minZ, maxZ };
}

let carIndex: Indexed[] | null = null;
let pedIndex: Indexed[] | null = null;
function indexes(): { car: Indexed[]; ped: Indexed[] } {
  if (!carIndex) {
    const seen = new Set<string>();
    carIndex = [...VILLAGE_CAR_ROADS, ...MAJOR_ROADS].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).map(indexRoad);
    pedIndex = PED_PATHS.filter((r) => !r.car).map(indexRoad);
  }
  return { car: carIndex, ped: pedIndex! };
}

/** Skärningen mellan sträckorna p→q och a→b: andelen längs p→q, eller null. */
function intersect(px: number, pz: number, qx: number, qz: number, s: Seg): number | null {
  const rx = qx - px, rz = qz - pz, sx = s.bx - s.ax, sz = s.bz - s.az;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((s.ax - px) * sz - (s.az - pz) * sx) / den;
  const u = ((s.ax - px) * rz - (s.az - pz) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/** Närmaste punkt på p→q till c: andelen och avståndet. */
function nearestOn(px: number, pz: number, qx: number, qz: number, c: Vec2): { t: number; d: number } {
  const rx = qx - px, rz = qz - pz;
  const L2 = rx * rx + rz * rz;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((c[0] - px) * rx + (c[1] - pz) * rz) / L2));
  return { t, d: Math.hypot(px + rx * t - c[0], pz + rz * t - c[1]) };
}

const cache = new Map<string, RoadStop[]>();

/** Platserna längs vägen där bilen saktar in eller stannar, sorterade efter s. */
export function stopsAlong(road: RawRoad): RoadStop[] {
  const key = `${road.id}:${road.poly.length}:${road.poly[0][0]},${road.poly[0][1]}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const self = indexRoad(road);
  const { car, ped } = indexes();
  const found: RoadStop[] = [];
  const scan = (others: Indexed[], kind: StopKind) => {
    for (const o of others) {
      if (o.id === self.id) continue;
      if (o.maxX < self.minX - TOUCH_M || o.minX > self.maxX + TOUCH_M || o.maxZ < self.minZ - TOUCH_M || o.minZ > self.maxZ + TOUCH_M) continue;
      let s0 = 0;
      for (const sg of self.segs) {
        const len = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az);
        for (const os of o.segs) {
          const t = intersect(sg.ax, sg.az, sg.bx, sg.bz, os);
          if (t !== null) found.push({ s: s0 + t * len, kind, x: sg.ax + (sg.bx - sg.ax) * t, z: sg.az + (sg.bz - sg.az) * t });
        }
        for (const e of o.ends) {
          const n = nearestOn(sg.ax, sg.az, sg.bx, sg.bz, e);
          if (n.d <= TOUCH_M) found.push({ s: s0 + n.t * len, kind, x: sg.ax + (sg.bx - sg.ax) * n.t, z: sg.az + (sg.bz - sg.az) * n.t });
        }
        s0 += len;
      }
    }
  };
  scan(car, 'junction');
  scan(ped, 'crossing');
  found.sort((a, b) => a.s - b.s);
  // Slå ihop platser som ligger tätt; en korsning går före ett övergångsställe på samma plats.
  const out: RoadStop[] = [];
  for (const f of found) {
    const last = out[out.length - 1];
    if (last && f.s - last.s < MERGE_M) {
      if (f.kind === 'junction' && last.kind === 'crossing') out[out.length - 1] = { ...f, s: last.s };
      continue;
    }
    out.push(f);
  }
  // Vägens egna ändar är inga platser att sakta in vid (där vänder bilen).
  const total = self.segs.reduce((a, sg) => a + Math.hypot(sg.bx - sg.ax, sg.bz - sg.az), 0);
  const res = out.filter((f) => f.s > 1 && f.s < total - 1);
  cache.set(key, res);
  return res;
}

/** Vägens fart för fordonet (m/s): hastighetsgränsen (40 km/h om den saknas), högst 50 km/h i byn, gånger fordonets andel. */
export function cruiseSpeed(road: RawRoad, kindShare: number): number {
  const kmh = Math.min(50, road.maxspeed ?? 40);
  return (kmh / 3.6) * kindShare;
}

/**
 * Farten bilen ska ha nu: `s` meter längs vägen, `dir` 1 framåt och −1 bakåt,
 * `total` vägens längd, `cruise` vägens fart. `blocked(stop)` säger om en
 * gående står vid ett övergångsställe. Returnerar farten och om bilen står
 * för ett övergångsställe.
 */
export function targetSpeed(stops: readonly RoadStop[], s: number, dir: 1 | -1, total: number, cruise: number, blocked: (stop: RoadStop) => boolean): { v: number; waiting: RoadStop | null } {
  const T = TRAFFIC_STOPS;
  let v = cruise;
  const brakeTo = (vEnd: number, d: number) => Math.sqrt(vEnd * vEnd + 2 * T.brakeMps2 * Math.max(0, d));
  // Vägens ände: bilen vänder där, sakta.
  const toEnd = dir === 1 ? total - s : s;
  v = Math.min(v, brakeTo(T.turnMps, toEnd));
  let waiting: RoadStop | null = null;
  for (const st of stops) {
    const d = (st.s - s) * dir;
    if (d < -4) continue;
    if (st.kind === 'junction') {
      if (d > T.junctionSlowM) continue;
      const slow = Math.max(T.minMps, cruise * T.junctionShare);
      v = Math.min(v, d <= 0 ? slow : brakeTo(slow, d));
    } else {
      if (d > T.crossingSlowM) continue;
      if (d > 0 && blocked(st)) {
        const stopD = d - T.stopBeforeM;
        v = Math.min(v, stopD <= 0.3 ? 0 : brakeTo(0, stopD));
        if (stopD <= 0.3) waiting = st;
      } else {
        const slow = Math.max(T.minMps, cruise * T.crossingShare);
        v = Math.min(v, d <= 0 ? slow : brakeTo(slow, d));
      }
    }
  }
  return { v, waiting };
}

// ----- Kvällens bilar (VillageLife) -----
// De kör en rutt i bilnätet (driveNetwork) i spelminuter, inte i meter per
// sekund. Här ges en andel av farten (0–1) längs rutten: in i en sväng eller
// korsning (en hörnpunkt där rutten vrider sig mer än TURN_RAD) saktar bilen
// in, vid ett övergångsställe i gångnätet (walkCrossings) där någon står
// stannar den, och mot parkeringen saktar den in.

const TURN_RAD = (35 * Math.PI) / 180;
export const ROUTE_PACE = { slowShare: 0.3, slowM: 30, afterM: 6, endM: 40, crossingNearM: 3 } as const;
export interface RouteStop { s: number; kind: StopKind; x: number; z: number }

/** Svängarna och övergångsställena längs en rutt, i meter från början. */
export function routeStops(route: readonly Vec2[], crossings: readonly { p: Vec2; r: number }[]): RouteStop[] {
  const out: RouteStop[] = [];
  let s = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (i + 1 < route.length) {
      const c = route[i + 1];
      const h0 = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const h1 = Math.atan2(c[0] - b[0], c[1] - b[1]);
      let d = Math.abs(h1 - h0);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d > TURN_RAD) out.push({ s: s + len, kind: 'junction', x: b[0], z: b[1] });
    }
    for (const cr of crossings) {
      const n = nearestOn(a[0], a[1], b[0], b[1], cr.p);
      if (n.d <= cr.r + ROUTE_PACE.crossingNearM) out.push({ s: s + n.t * len, kind: 'crossing', x: cr.p[0], z: cr.p[1] });
    }
    s += len;
  }
  out.sort((x, y) => x.s - y.s);
  return out.filter((f, i) => i === 0 || f.s - out[i - 1].s >= MERGE_M || f.kind !== out[i - 1].kind);
}

/** Andelen av farten vid `s` meter (0 = står). `blocked` säger om en gående står vid övergångsstället. */
export function routePace(stops: readonly RouteStop[], s: number, length: number, blocked: (st: RouteStop) => boolean): number {
  const P = ROUTE_PACE;
  const ramp = (d: number, over: number) => P.slowShare + (1 - P.slowShare) * Math.max(0, Math.min(1, d / over));
  let f = ramp(length - s, P.endM);
  for (const st of stops) {
    const d = st.s - s;
    if (d < -P.afterM || d > P.slowM) continue;
    if (st.kind === 'crossing' && d > TRAFFIC_STOPS.stopBeforeM * 0.5 && d < P.slowM && blocked(st)) {
      if (d <= TRAFFIC_STOPS.stopBeforeM + 1) return 0;
    }
    f = Math.min(f, ramp(Math.max(0, d), P.slowM));
  }
  return f;
}
