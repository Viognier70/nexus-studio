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
// ORDER 319b — de nyfikna (sim/curious.ts, Designs D9): en förbipasserande kommer gående längs
// gångvägen söder om vagnen (truckProps.ts WALKWAY) från byn, utanför bild, saktar in vid skylten och
// står vid den medan spelaren kan prata. Ställer gästen sig i kön blir figuren gästen i kön (samma
// figur, gästens id); annars går den vidare åt samma håll och ut i byn. Trängseln (personalSpace.ts):
// den som går väjer för den framför, håller till höger på gångvägen och vägarna, och ingen kommer
// närmare en annan än PERSONAL_SPACE.radiusM (knuffas isär). `shown` är där figurerna ritas.
//
// Ren logik utan three.js, så att testerna (order319aGaster.test.ts, order319bTrangseln.test.ts) kör
// samma kod som PlayerTruckCrew.tsx ritar.

import { DECK_TOP_M, TRUCK_LAYOUT, onDeck } from '../playerTruck';
import { CURIOUS_SPOTS, EAT_SPOTS, TRUCK_PROPS, WALKWAY, binPath, eatPath, leavePath } from '../truckProps';
import { TRUCK_WEATHER } from '../truckWeather';
import { PersonalSpace, keepRightShare, rightOf, yieldFactor, KEEP_RIGHT, PERSONAL_SPACE, type MassKind } from '../personalSpace';
import { nearestNode, routeBetween, walkNetwork } from '../../content/villageNetwork';
import { villageSources } from '../../content/villagePlaces';
import { CURIOUS } from '../../../sim/balance';
import type { CuriousState } from '../../../sim/curious';
import { CLIPS } from '../figureClips';
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
  searchStepM: 1,
  /** ORDER 319b — den nyfikna går fram till skylten så här fort (Designs guest.walk 0,7 m/s och
   *  guest.slowDown från 1,25 m/s), och fortare eller saktare på vägen in så att hen saktar in i tid. */
  curiousMinMps: 0.8,
  curiousMaxMps: 2.2
} as const;

export interface TruckFrame { x: number; z: number; rotationY: number }
export type SpotPose = 'queue' | 'order' | 'collect' | 'eat';
export interface Spot {
  x: number; z: number; yaw: number; y: number; pose: SpotPose; index: number;
  /** ORDER 319c — ätplatsen (truckProps.ts EAT_SPOTS: 'A-W', 'bench0', 'heat1', 'shelf0'). Bänken: sittande. */
  key?: string;
  seated?: boolean;
}
/** ORDER 319c — gästens plats att äta på och skräpet, ur simuleringen (sim/truckLife.ts). */
export interface FlowGuest { id: string; state: GuestState; truckSpot?: string; truckLitter?: boolean }

/** ORDER 319c — vädret vid vagnen just nu: regnet flyttar kön in under markisen (Designs truckWeather.ts rain.queue). */
export interface FlowWeather { raining: boolean }

/** ORDER 319b — en nyfiken förbipasserande (sim/curious.ts). */
export interface CuriousWalk {
  seq: number;
  side: 'west' | 'east';
  /** På väg in, vid skylten (sakta in, läsa, lukta, tveka) eller på väg vidare. */
  stage: 'approach' | 'act' | 'walkOn';
}

export interface TruckWalker {
  id: string;
  /** ORDER 319b — en nyfiken förbipasserande, eller gästen i kön som var det (seq). */
  curious?: CuriousWalk;
  fromCurious?: number;
  /** ORDER 319b del 2 — kommer med ett barn i handen (sim/curious.ts child); barnet går bredvid. */
  child?: boolean;
  /** Står still så här länge till (vänder sig mot luckan eller skakar på huvudet). */
  holdS: number;
  /** Där den här sträckan av vägen började (hålla till höger). */
  segFrom: Vec2;
  /** Flödets klocka när figuren stod på sin plats, och när utfallet för en nyfiken kom. */
  settledAt: number;
  outcomeAt: number;
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
  /** ORDER 319c — den som har ätit går till sopkorgen ('walk'), slänger servetten och går från bordet ('toss').
   *  Den som lämnade skräpet på bordet går direkt. */
  binning?: 'walk' | 'toss';
  /** ORDER 319c — platsen där gästen åt (för vägen bort). */
  ateAt?: string;
}

export interface CuriousInput {
  current: CuriousState['current'];
  last: CuriousState['last'];
}

/** ORDER 319c — en kropp utanför flödet (medhjälparen ute på sin runda), i byns ram. */
export interface OtherBody { key: string; x: number; z: number }

/** 'rename': den nyfikna ställde sig i kön, och figuren heter nu gästens id (`from` är det gamla). */
export interface FlowEvent { kind: 'spawn' | 'despawn' | 'rename'; id: string; x: number; z: number; from?: string }

/** ORDER 319c — den som slänger servetten står vänd mot sopkorgen (Designs bin.approachFacing '+Z'). */
const BIN_FACING = 0;

/** ORDER 319c — en ätplats i vagnens ram och vart gästen tittar: mot bordets mitt, västerut på bänken, mot
 *  värmaren eller mot vagnen vid hyllan. */
export function eatSpot(key: string): { at: Vec2; yaw: number; seated: boolean } | null {
  const P = TRUCK_PROPS;
  const face = (from: Vec2, to: Vec2) => Math.atan2(to[0] - from[0], to[1] - from[1]);
  const table = (EAT_SPOTS.table as Record<string, Vec2>)[key];
  if (table) {
    const t = P.standTable.at[key.split('-')[0] as 'A' | 'B' | 'C'];
    return { at: table, yaw: face(table, t), seated: false };
  }
  const m = /^(bench|heat|shelf)(\d+)$/.exec(key);
  if (!m) return null;
  const i = Number(m[2]);
  if (m[1] === 'bench') { const b = EAT_SPOTS.bench[i]; return b ? { at: b, yaw: -Math.PI / 2, seated: true } : null; }
  if (m[1] === 'heat') { const h = EAT_SPOTS.heater[i]; return h ? { at: h, yaw: face(h, P.heater.at), seated: false } : null; }
  const sh = EAT_SPOTS.shelf[i];
  return sh ? { at: sh, yaw: Math.PI, seated: false } : null;
}
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

/** Massan i trängseln för en figur vid vagnen (PERSONAL_SPACE.mass). */
function massOf(w: TruckWalker): MassKind {
  if (w.curious?.stage === 'act' || w.holdS > 0) return 'standingAct';
  if (!w.settled) return 'walking';
  if (w.spot?.pose === 'queue') return 'queued';
  if (w.spot?.pose === 'eat') return 'eatingOrSeated';
  return 'waitingOrCollecting';
}

const curiousKey = (seq: number) => `curious:${seq}`;
/** Barnet bredvid en vuxen i `shown`. */
export const childKey = (id: string) => `${id}:child`;
/** Barnet går så långt till vänster om den vuxna. */
const CHILD_SIDE_M = 0.55;

/** Figuren ritas högst så här långt från sin väg (hålla till höger och knuffas isär): en ny figur börjar
 *  så mycket längre bort än minSpawnM, så att den inte ritas närmare. */
const DISPLAY_MARGIN_M = KEEP_RIGHT.offsetM + PERSONAL_SPACE.maxOffsetM;

export class TruckGuestFlow {
  readonly walkers = new Map<string, TruckWalker>();
  /** Där figurerna ritas: vägens punkt, till höger på gångvägen och isärknuffade (personalSpace.ts). */
  readonly shown = new Map<string, [number, number]>();
  /** Flödets klocka (summan av dt). */
  clock = 0;
  private readonly space = new PersonalSpace(false);
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

  private w(lx: number, lz: number): Vec2 {
    return toWorld(this.frame, lx, lz);
  }

  /** Platserna i kväll: beställningen, hämtplatsen, kön i ordning och ståborden (de som äter behåller sin). */
  private spots(guests: readonly FlowGuest[], waitingIds: readonly string[], weather: FlowWeather): Map<string, Spot> {
    const f = this.frame;
    const out = new Map<string, Spot>();
    const at = (lx: number, lz: number, yaw: number, y: number, pose: SpotPose, index: number): Spot => {
      const [x, z] = toWorld(f, lx, lz);
      return { x, z, yaw: yaw + f.rotationY, y, pose, index };
    };
    // ORDER 319c — i regnet står kön under markisen (Designs truckWeather.ts rain.queue); de fyra första står torrt.
    const q = weather.raining ? TRUCK_WEATHER.rain.queue as { order: Vec2; collect: Vec2; line: Vec2[] } : TRUCK_LAYOUT.queue;
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
    // ORDER 319c — de som äter står på sin plats ur simuleringen (Designs D9 EAT_SPOTS): vid ståborden, på
    // bänken, runt värmaren eller vid hyllan på vagnens sida.
    guests.filter((g) => g.state === 'eating' && g.truckSpot).forEach((g, i) => {
      const e = eatSpot(g.truckSpot!);
      if (!e) return;
      const sp = at(e.at[0], e.at[1], e.yaw, onDeck(e.at[0], e.at[1]) ? DECK_TOP_M : 0, 'eat', i);
      out.set(g.id, { ...sp, key: g.truckSpot, seated: e.seated });
    });
    return out;
  }

  /** ORDER 319c — vägen till ätplatsen: upp på däcket vid ingången och runt borden (EAT_SPOTS.entry och via). Till
   *  hyllan i regnet går gästen raka vägen. */
  private eatRoute(key: string): Vec2[] {
    const e = eatSpot(key);
    if (!e) return [];
    return eatPath(key, TRUCK_LAYOUT.queue.collect, e.at).slice(1, -1).map((p) => this.w(p[0], p[1]));
  }

  /** ORDER 319c — vägen bort från uteserveringen: ett steg från sopkorgen ut på gångvägen, åt väster eller öster
   *  (EAT_SPOTS.leave), och vidare till ett hus eller en gata. */
  private leaveRoute(w: TruckWalker): Vec2[] {
    const g = walkNetwork();
    const east = (hash(w.id) >>> 3) % 2 === 1;
    const pts = leavePath(east).map((p) => this.w(p[0], p[1]));
    const end = pts[pts.length - 1];
    return [...pts, ...routeBetween(g, nearestNode(g, end[0], end[1]), this.source(w.id, 7, end))];
  }

  /** Bakåt från vägens slut: den närmaste punkten som ligger minst minSpawnM bort och utanför bilden.
   *  Finns ingen (hela vägen syns, som från byns höjd) börjar figuren där vägen börjar. */
  private fromOutOfView(route: Vec2[]): Vec2[] {
    for (let i = route.length - 1; i > 0; i--) {
      const [ax, az] = route[i - 1], [bx, bz] = route[i];
      const L = Math.hypot(bx - ax, bz - az);
      for (let s = L; s >= 0; s -= TRUCK_GUESTS.searchStepM) {
        const k = L > 0 ? s / L : 0;
        const x = ax + (bx - ax) * k, z = az + (bz - az) * k;
        if (this.dist(x, z) >= TRUCK_GUESTS.minSpawnM + DISPLAY_MARGIN_M && !this.inView(x, z)) return [[x, z], ...route.slice(i)];
      }
    }
    return route;
  }

  private source(id: string, shift: number, near: Vec2): number {
    const g = walkNetwork();
    return this.sources.length > 0 ? this.sources[(hash(id) >>> shift) % this.sources.length] : nearestNode(g, near[0] + 80, near[1]);
  }

  /** Vägen in till platsen, från en punkt minst minSpawnM bort och utanför bilden. */
  private arrivalPath(id: string, spot: Spot): Vec2[] {
    const g = walkNetwork();
    const ap = this.w(TRUCK_GUESTS.approachWest[0], TRUCK_GUESTS.approachWest[1]);
    const route: Vec2[] = [...routeBetween(g, this.source(id, 0, ap), nearestNode(g, ap[0], ap[1])), ap, [spot.x, spot.z]];
    return this.fromOutOfView(route);
  }

  /** Vägen bort: till närmaste av vägarna ut och vidare till ett hus eller en gata minst sourceMinM bort. */
  private departurePath(w: TruckWalker): Vec2[] {
    const g = walkNetwork();
    const west = this.w(TRUCK_GUESTS.approachWest[0], TRUCK_GUESTS.approachWest[1]);
    const east = this.w(TRUCK_GUESTS.approachEast[0], TRUCK_GUESTS.approachEast[1]);
    const ap = Math.hypot(w.x - west[0], w.z - west[1]) <= Math.hypot(w.x - east[0], w.z - east[1]) ? west : east;
    return [ap, ...routeBetween(g, nearestNode(g, ap[0], ap[1]), this.source(w.id, 7, ap))];
  }

  /** ORDER 319b — gångvägen i världen, i den riktning den nyfikna går (från väster: västra änden först). */
  private walkway(fromWest: boolean): Vec2[] {
    const pts = WALKWAY.map((p) => this.w(p[0], p[1]));
    return fromWest ? pts : pts.reverse();
  }

  /** ORDER 319b — den nyfikna kommer från byn ut på gångvägen och går till platsen där hen saktar in. */
  private curiousArrival(seq: number, side: 'west' | 'east'): Vec2[] {
    const g = walkNetwork();
    const way = this.walkway(side === 'west');
    const trig = CURIOUS_SPOTS.trigger[side];
    const id = curiousKey(seq);
    // Längs gångvägen fram till punkten där hen saktar in: västra änden, eller östra änden och upp förbi däcket.
    const along = side === 'west' ? [way[0]] : way.slice(0, way.length - 1);
    const route: Vec2[] = [...routeBetween(g, this.source(id, 0, way[0]), nearestNode(g, way[0][0], way[0][1])), ...along, this.w(trig[0], trig[1])];
    return this.fromOutOfView(route);
  }

  /** ORDER 319b — den nyfikna går vidare åt samma håll som hen kom, längs gångvägen och ut i byn. */
  private curiousWalkOn(w: TruckWalker): Vec2[] {
    const g = walkNetwork();
    const goingEast = w.curious!.side === 'west';
    const on = goingEast ? CURIOUS_SPOTS.walkOn.east : CURIOUS_SPOTS.walkOn.west;
    // Gångvägens punkter bortom vändpunkten, åt det håll hen går (västra änden, eller österut förbi däcket).
    const ahead = (goingEast ? WALKWAY.slice(1) : WALKWAY.slice(0, 1)).map((p) => this.w(p[0], p[1]));
    const end = ahead[ahead.length - 1] ?? this.w(on[0], on[1]);
    return [this.w(on[0], on[1]), ...ahead, ...routeBetween(g, nearestNode(g, end[0], end[1]), this.source(w.id, 7, end))];
  }

  /** Var den nyfikna står vid skylten, ur simuleringens tid sedan hen saktade in. */
  private curiousTarget(side: 'west' | 'east', real: number): Vec2 {
    const p = CURIOUS.phaseSeconds;
    const k = Math.max(0, Math.min(1, real / (p.slowDown + p.toSign)));
    const e = k * k * (3 - 2 * k);
    const a = CURIOUS_SPOTS.trigger[side], b = CURIOUS_SPOTS.readSpot;
    return this.w(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e);
  }

  private newWalker(id: string, path: Vec2[], spot: Spot | null): TruckWalker {
    const [x, z] = path[0];
    return { id, look: hash(id) % this.looks, x, z, yaw: 0, path: path.slice(1), spot, leaving: false, walkedM: 0, settled: false, holdS: 0, segFrom: [x, z], settledAt: 0, outcomeAt: 0 };
  }

  private setPath(w: TruckWalker, path: Vec2[]): void {
    w.path = path;
    w.segFrom = [w.x, w.z];
  }

  /** ORDER 319b — de nyfikna: en ny figur på väg in, vid skylten, och utfallet (kön eller vidare). */
  private curious(c: CuriousInput | null | undefined, guestIds: ReadonlySet<string>, spots: Map<string, Spot>, events: FlowEvent[]): void {
    const cur = c?.current ?? null;
    if (cur && !this.walkers.has(curiousKey(cur.seq))) {
      const w = this.newWalker(curiousKey(cur.seq), this.curiousArrival(cur.seq, cur.side), null);
      w.curious = { seq: cur.seq, side: cur.side, stage: 'approach' };
      w.child = cur.child;
      this.walkers.set(w.id, w);
      events.push({ kind: 'spawn', id: w.id, x: w.x, z: w.z });
    }
    for (const w of [...this.walkers.values()]) {
      const cw = w.curious;
      if (!cw || cw.stage === 'walkOn') continue;
      if (cur && cur.seq === cw.seq) {
        if (cur.approachLeft <= 0 && cw.stage === 'approach' && w.path.length <= 1) cw.stage = 'act';
        continue;
      }
      // Utfallet: ställer sig i kön (figuren blir gästen) eller går vidare.
      const last = c?.last?.seq === cw.seq ? c.last : null;
      w.outcomeAt = this.clock;
      const turn = CLIPS['guest.turnToHatch'].seconds.normal, shake = CLIPS['guest.shakeHead'].seconds.normal;
      if (last?.outcome === 'join' && last.guestId && guestIds.has(last.guestId) && !this.walkers.has(last.guestId)) {
        this.walkers.delete(w.id);
        events.push({ kind: 'rename', id: last.guestId, x: w.x, z: w.z, from: w.id });
        const spot = spots.get(last.guestId) ?? null;
        w.id = last.guestId;
        w.curious = undefined;
        w.fromCurious = cw.seq;
        w.spot = spot;
        w.settled = false;
        w.holdS = turn;
        if (spot) {
          const v = CURIOUS_SPOTS.joinVia;
          const c0 = Math.cos(this.frame.rotationY), s0 = Math.sin(this.frame.rotationY);
          this.setPath(w, [[spot.x + v[0] * c0 + v[1] * s0, spot.z - v[0] * s0 + v[1] * c0], [spot.x, spot.z]]);
        }
        this.walkers.set(w.id, w);
        continue;
      }
      if (last?.outcome === 'join' && !(last.guestId && guestIds.has(last.guestId))) continue;
      cw.stage = 'walkOn';
      w.leaving = true;
      w.settled = false;
      w.holdS = last?.grade === 'wrong' ? shake : 0;
      this.setPath(w, this.curiousWalkOn(w));
    }
  }

  /** Ett steg: nya gäster börjar gå in, de som gått går ut, alla rör sig dt sekunder (spelets fart). */
  update(guests: readonly FlowGuest[], waitingIds: readonly string[], dt: number, curious?: CuriousInput | null, weather: FlowWeather = { raining: false }, others: readonly OtherBody[] = []): FlowEvent[] {
    this.clock += dt;
    const events: FlowEvent[] = [];
    const live = guests.filter((g) => LIVE.has(g.state));
    const byId = new Map(guests.map((g) => [g.id, g]));
    const spots = this.spots(live, waitingIds, weather);
    this.curious(curious, new Set(live.map((g) => g.id)), spots, events);
    for (const g of live) {
      const spot = spots.get(g.id) ?? null;
      let w = this.walkers.get(g.id);
      if (!w) {
        if (!spot) continue;
        w = this.newWalker(g.id, this.arrivalPath(g.id, spot), spot);
        this.walkers.set(g.id, w);
        events.push({ kind: 'spawn', id: g.id, x: w.x, z: w.z });
        continue;
      }
      if (w.leaving) continue;
      const moved = !w.spot || !spot || Math.hypot(w.spot.x - spot.x, w.spot.z - spot.z) > 0.01;
      const toEat = moved && spot?.pose === 'eat' && w.spot?.pose !== 'eat';
      w.spot = spot;
      if (spot?.key) w.ateAt = spot.key;
      // ORDER 319c — till ätplatsen: upp på däcket vid ingången och runt borden (Designs EAT_SPOTS.entry och via).
      if (toEat && spot && w.path.length <= 1) { this.setPath(w, [...this.eatRoute(spot.key!), [spot.x, spot.z]]); w.settled = false; }
      // En ny plats: går dit raka vägen när figuren redan är framme vid vagnen.
      else if (moved && spot && w.path.length <= 1) { this.setPath(w, [[spot.x, spot.z]]); w.settled = false; }
      else if (moved && spot && w.path.length > 1) w.path[w.path.length - 1] = [spot.x, spot.z];
    }
    const liveIds = new Set(live.map((g) => g.id));
    for (const w of this.walkers.values()) {
      if (w.leaving || w.curious || liveIds.has(w.id)) continue;
      const ate = w.spot?.pose === 'eat';
      w.leaving = true; w.spot = null; w.settled = false;
      // ORDER 319c — den som har ätit går till sopkorgen med servetten (Designs EAT_FLOW), utom den som lämnade
      // skräpet på bordet när det var mycket folk; den går från bordet direkt.
      if (ate && !byId.get(w.id)?.truckLitter) {
        w.binning = 'walk';
        const e = w.ateAt ? eatSpot(w.ateAt) : null;
        const path = e ? binPath(w.ateAt!, e.at).slice(1) : [EAT_SPOTS.toBin, TRUCK_PROPS.bin.approach];
        this.setPath(w, path.map((p) => this.w(p[0], p[1])));
      } else this.setPath(w, ate ? this.leaveRoute(w) : this.departurePath(w));
    }
    // Riktningen och farten före steget (väja: den som går saktar in bakom eller framför någon).
    const cur = curious?.current ?? null;
    const view = [...this.walkers.values()].map((w) => {
      const t = w.path[0];
      const d = t ? Math.hypot(t[0] - w.x, t[1] - w.z) : 0;
      const moving = !!t && d > 1e-6 && w.holdS <= 0;
      return { w, x: w.x, z: w.z, dirX: moving ? (t![0] - w.x) / d : 0, dirZ: moving ? (t![1] - w.z) / d : 0, moving };
    });
    for (const v of view) {
      const w = v.w;
      // Den som går försvinner där den senast stod (redan ritad där): på gatan när den är minst
      // minSpawnM bort och utanför bilden, annars vid huset där vägen slutar.
      // Prövas där figuren senast ritades (trängseln flyttar den från vägen).
      // Barnet bredvid prövas också.
      const [sx, sz] = this.shown.get(w.id) ?? [w.x, w.z];
      const [cx, cz] = w.child ? this.shown.get(childKey(w.id)) ?? [sx, sz] : [sx, sz];
      const away = this.dist(sx, sz) >= TRUCK_GUESTS.minSpawnM && !this.inView(sx, sz) && this.dist(cx, cz) >= TRUCK_GUESTS.minSpawnM && !this.inView(cx, cz);
      // ORDER 319c — framme vid sopkorgen: slänger servetten och går från den (binNapkin och leaveTable).
      if (w.binning === 'walk' && w.path.length === 0) {
        w.binning = 'toss';
        w.holdS = CLIPS['guest.binNapkin'].seconds.normal + CLIPS['guest.leaveTable'].seconds.normal;
        w.outcomeAt = this.clock;
        w.yaw = this.frame.rotationY + BIN_FACING;
      }
      const gone = w.leaving && w.holdS <= 0 && !w.binning && (away || w.path.length === 0);
      if (gone) { this.walkers.delete(w.id); events.push({ kind: 'despawn', id: w.id, x: sx, z: sz }); continue; }
      if (w.holdS > 0) {
        w.holdS = Math.max(0, w.holdS - dt);
        if (w.holdS <= 0 && w.binning === 'toss') { w.binning = undefined; this.setPath(w, this.leaveRoute(w)); }
        continue;
      }
      // Den nyfikna vid skylten följer simuleringens tid (sakta in och gå fram, sedan stå).
      if (w.curious?.stage === 'act' && cur?.seq === w.curious.seq) {
        const [tx, tz] = this.curiousTarget(w.curious.side, cur.real);
        const d = Math.hypot(tx - w.x, tz - w.z);
        const step = Math.min(d, TRUCK_GUESTS.hurryMps * dt);
        if (d > 1e-6) { w.x += ((tx - w.x) / d) * step; w.z += ((tz - w.z) / d) * step; w.walkedM += step; if (step > 1e-4) w.yaw = Math.atan2(tx - w.x, tz - w.z); }
        w.path = [];
        w.settled = d < 0.02;
        continue;
      }
      let mps: number = (!w.leaving && (w.spot?.pose === 'order' || w.spot?.pose === 'collect')) ? TRUCK_GUESTS.hurryMps : TRUCK_GUESTS.walkMps;
      // På väg in: fram till platsen där hen saktar in när simuleringen säger det.
      if (w.curious?.stage === 'approach' && cur?.seq === w.curious.seq) {
        const left = w.path.reduce((a, p, i) => a + Math.hypot(p[0] - (i === 0 ? w.x : w.path[i - 1][0]), p[1] - (i === 0 ? w.z : w.path[i - 1][1])), 0);
        mps = Math.max(TRUCK_GUESTS.curiousMinMps, Math.min(TRUCK_GUESTS.curiousMaxMps, left / Math.max(dt, cur.approachLeft)));
      }
      const f = v.moving ? yieldFactor(w.x, w.z, v.dirX, v.dirZ, view.filter((o) => o.w !== w)) : 1;
      let step = mps * dt * f;
      while (step > 0 && w.path.length > 0) {
        const [tx, tz] = w.path[0];
        const d = Math.hypot(tx - w.x, tz - w.z);
        if (d > 1e-6) w.yaw = Math.atan2(tx - w.x, tz - w.z);
        if (d <= step) { w.x = tx; w.z = tz; step -= d; w.walkedM += d; w.path.shift(); w.segFrom = [tx, tz]; }
        else { w.x += ((tx - w.x) / d) * step; w.z += ((tz - w.z) / d) * step; w.walkedM += step; step = 0; }
      }
      if (!w.leaving && w.path.length === 0 && w.spot) {
        if (!w.settled) w.settledAt = this.clock;
        w.settled = true;
        w.yaw = w.spot.yaw;
      }
    }
    this.place(dt, others);
    return events;
  }

  /** Där figurerna ritas: till höger på vägen (KEEP_RIGHT) och isärknuffade (PersonalSpace). */
  private place(dt: number, others: readonly OtherBody[]): void {
    const bodies = [...this.walkers.values()].map((w) => {
      let x = w.x, z = w.z;
      const t = w.path[0];
      if (t && !w.settled && w.holdS <= 0) {
        const toEnd = Math.hypot(t[0] - w.x, t[1] - w.z), fromStart = Math.hypot(w.x - w.segFrom[0], w.z - w.segFrom[1]);
        const L = toEnd + fromStart;
        if (L > 1e-6) {
          // Till höger, tonat in efter sträckans början och ut före dess slut (sista sträckan till platsen också).
          const [rx, rz] = rightOf((t[0] - w.segFrom[0]) / L, (t[1] - w.segFrom[1]) / L);
          const k = KEEP_RIGHT.offsetM * keepRightShare(fromStart, toEnd);
          x += rx * k; z += rz * k;
        }
      }
      return { key: w.id, x, z, kind: massOf(w) };
    });
    // Barnet går och står bredvid, till vänster om den vuxna (CHILD_SIDE_M), och räknas i trängseln.
    for (const w of this.walkers.values()) {
      if (!w.child) continue;
      const b = bodies.find((x) => x.key === w.id)!;
      const [rx, rz] = rightOf(Math.sin(w.yaw), Math.cos(w.yaw));
      bodies.push({ key: childKey(w.id), x: b.x - rx * CHILD_SIDE_M, z: b.z - rz * CHILD_SIDE_M, kind: b.kind });
    }
    // ORDER 319c — medhjälparen ute på sin runda räknas i trängseln men flyttas inte av den.
    for (const o of others) bodies.push({ key: o.key, x: o.x, z: o.z, kind: 'eatingOrSeated' });
    const shown = this.space.step(bodies, dt);
    this.shown.clear();
    for (const [k, p] of shown) this.shown.set(k, p);
  }
}
