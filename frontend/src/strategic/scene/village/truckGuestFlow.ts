// ORDER 319a.1 (Anders 2026-10-07) — "Ingen gäst får uppstå eller försvinna i bild. Gäster kommer
// gående från byns gator och går därifrån till en gata eller ett hus."
//
// Gästerna vid spelarens vagn som figurer, en per gäst i simuleringen (nyckeln är gästens id, så
// figuren och dess kläder följer gästen). En ny gäst börjar på byns gångnät (content/villageNetwork.ts)
// minst TRUCK_GUESTS.minSpawnM från vagnen och utanför kamerans bild, och går till sin plats: kön,
// beställningen, hämtplatsen eller ett ståbord. När gästen går (leaving, declined eller borta ur
// simuleringen) går figuren till ett hus eller en gata minst lika långt bort och försvinner där.
// Flyttas gästen i kön går figuren dit; ingen figur byter plats på en gång.
//
// Ren logik utan three.js, så att testet (order319aGaster.test.ts) kör samma kod som
// PlayerTruckCrew.tsx ritar.

import { TRUCK_LAYOUT } from '../playerTruck';
import { nearestNode, routeBetween, walkNetwork } from '../../content/villageNetwork';
import { villageSources } from '../../content/villagePlaces';
import type { GuestState } from '../../types';

type Vec2 = [number, number];

export const TRUCK_GUESTS = {
  /** Gångfart i meter per verklig sekund; på väg till en plats i kön som redan väntar går de fortare. */
  walkMps: 1.4,
  hurryMps: 2.2,
  /** Ingen gäst börjar eller slutar närmare vagnen än så här (ordern: 40 m). */
  minSpawnM: 40,
  /** Husen och gatorna gästerna kommer från och går till ligger minst så här långt bort. */
  sourceMinM: 70,
  /** Gångens steg per cykel (figureRig poseWalk: fasen i cykler ur tillryggalagd sträcka). */
  strideM: 1.4,
  /** Längre kö än TRUCK_LAYOUT.queue.line fortsätter västerut med samma avstånd. */
  lineStepM: 0.9,
  /** Där gästerna lämnar gångnätet på väg in (väster om kön) och ut (öster om trädäcket), i vagnens ram. */
  approachWest: [-8, 2.3] as Vec2,
  approachEast: [7.5, 2.6] as Vec2,
  /** Sökstegen bakåt längs vägen in, när startpunkten väljs. */
  searchStepM: 1
} as const;

export interface TruckFrame { x: number; z: number; rotationY: number }
export type SpotPose = 'queue' | 'order' | 'collect' | 'eat';
export interface Spot { x: number; z: number; yaw: number; y: number; pose: SpotPose; index: number }
export interface FlowGuest { id: string; state: GuestState }

export interface TruckWalker {
  id: string;
  /** Klädernas index, ur gästens id. */
  look: number;
  x: number;
  z: number;
  yaw: number;
  path: Vec2[];
  spot: Spot | null;
  leaving: boolean;
  walkedM: number;
  /** Står still på sin plats. */
  settled: boolean;
}

export interface FlowEvent { kind: 'spawn' | 'despawn'; id: string; x: number; z: number }

const DECK_Y_M = 0.12;
const LIVE: ReadonlySet<GuestState> = new Set(['arriving', 'waiting', 'ordering', 'serving', 'paying', 'eating']);

/** Vagnens ram (+X längs vagnen, +Z ut från luckan) till byns; samma som gruppens rotation.y. */
export function toWorld(f: TruckFrame, lx: number, lz: number): Vec2 {
  const c = Math.cos(f.rotationY), s = Math.sin(f.rotationY);
  return [f.x + lx * c + lz * s, f.z - lx * s + lz * c];
}

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class TruckGuestFlow {
  readonly walkers = new Map<string, TruckWalker>();
  private readonly frame: TruckFrame;
  private readonly sources: number[];
  private readonly inView: (x: number, z: number) => boolean;
  private readonly looks: number;

  constructor(frame: TruckFrame, inView: (x: number, z: number) => boolean, looks: number) {
    this.frame = frame;
    this.inView = inView;
    this.looks = looks;
    const g = walkNetwork();
    const src = villageSources();
    const all = [...src.homes, src.campus, src.hotel, src.parking, src.busStop];
    this.sources = [...new Set(all)].filter((n) => Math.hypot(g.nodes[n][0] - frame.x, g.nodes[n][1] - frame.z) >= TRUCK_GUESTS.sourceMinM);
  }

  private dist(x: number, z: number): number {
    return Math.hypot(x - this.frame.x, z - this.frame.z);
  }

  /** Platserna i kväll: beställningen, hämtplatsen, kön i ordning och ståborden (de som äter behåller sin). */
  private spots(guests: readonly FlowGuest[], waitingIds: readonly string[]): Map<string, Spot> {
    const f = this.frame;
    const out = new Map<string, Spot>();
    const at = (lx: number, lz: number, yaw: number, y: number, pose: SpotPose, index: number): Spot => {
      const [x, z] = toWorld(f, lx, lz);
      return { x, z, yaw: yaw + f.rotationY, y, pose, index };
    };
    const q = TRUCK_LAYOUT.queue;
    const ordering = guests.filter((g) => g.state === 'ordering');
    const collecting = guests.filter((g) => g.state === 'serving' || g.state === 'paying');
    // Den som beställer står vid luckan; fler än en (sällan) ställer sig först i kön.
    ordering.slice(0, 1).forEach((g) => out.set(g.id, at(q.order[0], q.order[1], Math.PI, 0, 'order', 0)));
    collecting.forEach((g, i) => out.set(g.id, at(q.collect[0] + i * 0.6, q.collect[1] + i * 0.3, Math.PI, 0, 'collect', i)));
    const byId = new Map(guests.map((g) => [g.id, g]));
    const line = [...ordering.slice(1).map((g) => g.id), ...waitingIds.filter((id) => byId.get(id)?.state === 'waiting')];
    const lineAt = (i: number): Vec2 => (i < q.line.length ? q.line[i] : [q.line[q.line.length - 1][0] - (i - q.line.length + 1) * TRUCK_GUESTS.lineStepM, q.line[q.line.length - 1][1]]);
    line.forEach((id, i) => { const p = lineAt(i); out.set(id, at(p[0], p[1], Math.PI / 2, 0, 'queue', i)); });
    // De som kommer går mot köns slut.
    let tail = line.length;
    for (const g of guests) if (g.state === 'arriving') { const p = lineAt(tail++); out.set(g.id, at(p[0], p[1], Math.PI / 2, 0, 'queue', tail - 1)); }
    // Ståborden: väster, öster och söder om varje bord; fler ställer sig en bit ut.
    const eat = [TRUCK_LAYOUT.standTables.A, TRUCK_LAYOUT.standTables.B, TRUCK_LAYOUT.standTables.C]
      .flatMap((t) => TRUCK_LAYOUT.eatOffsets.map((o) => [t[0] + o[0], t[1] + o[1], Math.atan2(-o[0], -o[1])] as [number, number, number]));
    const taken = new Set<number>();
    const eaters = guests.filter((g) => g.state === 'eating');
    for (const g of eaters) { const s = this.walkers.get(g.id)?.spot; if (s?.pose === 'eat' && !taken.has(s.index)) { taken.add(s.index); out.set(g.id, s); } }
    let extra = 0;
    for (const g of eaters) {
      if (out.has(g.id)) continue;
      let i = 0;
      while (taken.has(i)) i++;
      taken.add(i);
      const e = i < eat.length ? eat[i] : [6.8 + 0.6 * (extra % 3), 0.8 + 0.7 * Math.floor(extra++ / 3), -Math.PI / 2] as [number, number, number];
      out.set(g.id, at(e[0], e[1], e[2], i < eat.length ? DECK_Y_M : 0, 'eat', i));
    }
    return out;
  }

  /** Vägen in till platsen, från en punkt minst minSpawnM bort och utanför bilden. */
  private arrivalPath(id: string, spot: Spot): Vec2[] {
    const g = walkNetwork();
    const ap = toWorld(this.frame, TRUCK_GUESTS.approachWest[0], TRUCK_GUESTS.approachWest[1]);
    const src = this.sources.length > 0 ? this.sources[hash(id) % this.sources.length] : nearestNode(g, ap[0] + 80, ap[1]);
    const route: Vec2[] = [...routeBetween(g, src, nearestNode(g, ap[0], ap[1])), ap, [spot.x, spot.z]];
    // Bakåt från platsen: den närmaste punkten på vägen som ligger minst minSpawnM bort och utanför bilden.
    // Finns ingen (hela vägen syns, som från byns höjd) kommer gästen ut ur huset där vägen börjar.
    for (let i = route.length - 1; i > 0; i--) {
      const [ax, az] = route[i - 1], [bx, bz] = route[i];
      const L = Math.hypot(bx - ax, bz - az);
      for (let s = L; s >= 0; s -= TRUCK_GUESTS.searchStepM) {
        const k = L > 0 ? s / L : 0;
        const x = ax + (bx - ax) * k, z = az + (bz - az) * k;
        if (this.dist(x, z) >= TRUCK_GUESTS.minSpawnM && !this.inView(x, z)) return [[x, z], ...route.slice(i)];
      }
    }
    return route;
  }

  /** Vägen bort: till närmaste av vägarna ut och vidare till ett hus eller en gata minst sourceMinM bort. */
  private departurePath(w: TruckWalker): Vec2[] {
    const g = walkNetwork();
    const west = toWorld(this.frame, TRUCK_GUESTS.approachWest[0], TRUCK_GUESTS.approachWest[1]);
    const east = toWorld(this.frame, TRUCK_GUESTS.approachEast[0], TRUCK_GUESTS.approachEast[1]);
    const ap = Math.hypot(w.x - west[0], w.z - west[1]) <= Math.hypot(w.x - east[0], w.z - east[1]) ? west : east;
    const dst = this.sources.length > 0 ? this.sources[(hash(w.id) >>> 7) % this.sources.length] : nearestNode(g, ap[0] - 80, ap[1]);
    return [ap, ...routeBetween(g, nearestNode(g, ap[0], ap[1]), dst)];
  }

  /** Ett steg: nya gäster börjar gå in, de som gått går ut, alla rör sig dt verkliga sekunder. */
  update(guests: readonly FlowGuest[], waitingIds: readonly string[], dt: number): FlowEvent[] {
    const events: FlowEvent[] = [];
    const live = guests.filter((g) => LIVE.has(g.state));
    const spots = this.spots(live, waitingIds);
    for (const g of live) {
      const spot = spots.get(g.id) ?? null;
      let w = this.walkers.get(g.id);
      if (!w) {
        if (!spot) continue;
        const path = this.arrivalPath(g.id, spot);
        const [x, z] = path[0];
        w = { id: g.id, look: hash(g.id) % this.looks, x, z, yaw: 0, path: path.slice(1), spot, leaving: false, walkedM: 0, settled: false };
        this.walkers.set(g.id, w);
        events.push({ kind: 'spawn', id: g.id, x, z });
        continue;
      }
      if (w.leaving) continue;
      const moved = !w.spot || !spot || Math.hypot(w.spot.x - spot.x, w.spot.z - spot.z) > 0.01;
      w.spot = spot;
      // En ny plats: går dit raka vägen när figuren redan är framme vid vagnen.
      if (moved && spot && w.path.length <= 1) { w.path = [[spot.x, spot.z]]; w.settled = false; }
      else if (moved && spot && w.path.length > 1) w.path[w.path.length - 1] = [spot.x, spot.z];
    }
    const liveIds = new Set(live.map((g) => g.id));
    for (const w of this.walkers.values()) {
      if (!w.leaving && !liveIds.has(w.id)) { w.leaving = true; w.spot = null; w.settled = false; w.path = this.departurePath(w); }
    }
    for (const w of [...this.walkers.values()]) {
      // Den som går försvinner där den senast stod (redan ritad där): på gatan när den är minst
      // minSpawnM bort och utanför bilden, annars vid huset där vägen slutar.
      const gone = w.leaving && ((this.dist(w.x, w.z) >= TRUCK_GUESTS.minSpawnM && !this.inView(w.x, w.z)) || w.path.length === 0);
      if (gone) { this.walkers.delete(w.id); events.push({ kind: 'despawn', id: w.id, x: w.x, z: w.z }); continue; }
      const hurry = !w.leaving && (w.spot?.pose === 'order' || w.spot?.pose === 'collect');
      let step = (hurry ? TRUCK_GUESTS.hurryMps : TRUCK_GUESTS.walkMps) * dt;
      while (step > 0 && w.path.length > 0) {
        const [tx, tz] = w.path[0];
        const d = Math.hypot(tx - w.x, tz - w.z);
        if (d > 1e-6) w.yaw = Math.atan2(tx - w.x, tz - w.z);
        if (d <= step) { w.x = tx; w.z = tz; step -= d; w.walkedM += d; w.path.shift(); }
        else { w.x += ((tx - w.x) / d) * step; w.z += ((tz - w.z) / d) * step; w.walkedM += step; step = 0; }
      }
      if (!w.leaving && w.path.length === 0 && w.spot) { w.settled = true; w.yaw = w.spot.yaw; }
    }
    return events;
  }
}
