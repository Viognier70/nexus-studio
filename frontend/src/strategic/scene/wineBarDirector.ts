// wineBarDirector — kvällens koreografi i vinbaren, driven av simuleringen.
//
// ORDER 271 (Designs paket 1 + 6). Ren TypeScript, inget three.js. Läses
// varje bildruta av WineBarFigures.tsx, som bara översätter proven till
// figureActs-poser på riggarna.
//
// ── Vem bestämmer vad ────────────────────────────────────────────
// Beslut i ordern: SIMULERINGEN är sanningen för vilka gäster som finns,
// var de sitter (seatIndex), deras nöjdhet och deras tålamod (F29). Designs
// koreografi (serviceFlow.ts) och figureActs ger rörelserna och posen.
//
// Kopplingen är den enklaste som håller båda:
//   • Gästernas sim-tillstånd blir akter: arriving/waiting → i kön utanför
//     (väntans tre lägen stående, ur F29-tålamodet), seated → går in längs
//     rummets egen väg (walkPathToSeat) och sätter sig, sedan läser menyn,
//     beställer, får vinet, skålar, äter och pratar. paying → ber om notan,
//     väntar, betalar. leaving → reser sig och går ut (exitPathFromSeat),
//     missnöjd om nöjdheten är under reputation.ts UNHAPPY_THRESHOLD.
//   • Personalens uppgifter kommer ur samma händelser som i serviceFlow.ts:
//     beställning, dryck (tre överlämningar), mat från passet, notan och
//     avdukning. De tas i tidsordning av den i rollen som kan vara framme
//     först (serviceFlow.assign, här i realtid i stället för en förräknad
//     kväll) och går längs staffRoute().
//   • Det som serviceFlow räknar själv — ankomster, sällskapens storlek,
//     när de går — kommer i stället ur simuleringen. createServiceFlow()
//     används inte i spelet; dess vägar, bord och överlämningar gör det.
//
// Tiden är simuleringens (sim-sekunder, anroparen interpolerar mellan
// simuleringens 5 Hz-steg). Allt planeras när en händelse inträffar; varje
// bildruta läser bara planen (sampleGuest/sampleStaff skriver i förallokerade
// prov). Planeringen skapar små listor när en händelse sker, aldrig per
// bildruta, och inget three.js-objekt skapas här.

import type { GuestState, StaffRole } from '../types';
import {
  staffRoute,
  PICKUP_BAR,
  POUR_SPOT,
  WALK_GUEST,
  CORR_X,
  BOTTLE_PICKUP_AT,
  pathLen,
  along,
  type Group,
  type Pose,
  type Vec2
} from './serviceFlow';
import { WINE_BAR_PLAN, doorPath } from './wineBarRoom';
import { staffTempo, waitStateFor, WAIT_THRESHOLDS } from './figureActs';
import { IDLE_RULE } from './serviceScore';
import { QUEUE_MOOD } from '../../sim/balance';
import { clipSeconds, SEAT_KINDS, seatKindFromRoom } from './figureClips';

// #region typer

export type StaffKey = 'server' | 'server2' | 'bartender' | 'sommelier' | 'cook' | 'dish' | 'host';
export type StaffRoleKey = 'server' | 'bartender' | 'sommelier' | 'cook' | 'dish' | 'host';

/** Designs personal i vinbaren (paket 6 §1) plus köket. Ordningen är poolens. */
// ORDER 293 — Per, hovmästaren, sist så att de andras platser i listan står kvar.
export const STAFF_KEYS: readonly StaffKey[] = ['server', 'server2', 'bartender', 'sommelier', 'cook', 'dish', 'host'];

/**
 * Simuleringens fyra roller mot vinbarens personal, för övertagandet (FRAGOR
 * §49, INCIDENTS.takeoverRole). Värden i en vinbar är sommelieren (omdömet i
 * rummet), servitören är servitören, kocken är kocken och lärlingen den andra
 * servitören. Samma mappning som businessRoom.ts STATION_MAP.vinbaren.
 */
// ORDER 293 — värden är Per, hovmästaren (Designs leverans 3: "Per behövs för
// att *Per tog över* … ska stämma"), inte längre sommeliern.
export const SIM_ROLE_TO_STAFF: Record<StaffRole, StaffKey> = {
  servitör: 'server',
  värd: 'host',
  kock: 'cook',
  lärling: 'server2'
};

export type DirectorPose =
  | Pose
  | 'waitLeaving'
  | 'sitDown'
  | 'standUp'
  | 'cook'
  | 'dish'
  | 'handle'
  // ORDER 292 — IDLE_RULE (serviceScore.ts): fyllnadsarbete efter 2 s utan
  // uppgift, och sommeliern som värd i dörren (poseAttend, poseWelcome).
  | 'fillWork'
  | 'attend'
  | 'welcome'
  // ORDER 292 — den som redan sitter reser sig och hälsar när någon i
  // sällskapet kommer till bordet (Designs klipp guest.riseGreet).
  | 'riseGreet'
  // ORDER 293 — vardagens koreografi: värden, ritualerna, mise en place och
  // personalens små stunder (Designs klipp, theatreClips.ts staffClipFor).
  | 'checkBook'
  | 'greetDoor'
  | 'presentMenu'
  | 'setBread'
  | 'pourWater'
  | 'serveAperitif'
  | 'writeBoard'
  | 'setTable'
  | 'stockFridge'
  | 'polishGlass'
  | 'holdDoor'
  | 'checkTable'
  | 'wipeTable'
  | 'chat';

export interface FigureSample {
  visible: boolean;
  x: number;
  z: number;
  /** Riggens rot i rummets lokala Y (sulorna står här när figuren står). */
  y: number;
  facing: number;
  pose: DirectorPose;
  /** Gångcykler för gående poser, sekunder för övriga. */
  phase: number;
  /** 0..1 genom en enveloppad gest. */
  progress: number;
  targetYaw: number;
  /** 0..1, personalens hållning (figureActs `stress`). */
  stress: number;
  /** Sittande variant av väntan och skålen. */
  seated: boolean;
  carrying: 'glass' | 'plate' | 'bottle' | 'dishes' | null;
  /** Sim-gästens id i den här platsen i poolen, annars null. */
  guestId: string | null;
}

export interface DirectorSeat {
  id: string;
  seatIndex: number;
  local: Vec2;
  facing: number;
  seatSurfaceY: number;
  /** Rummets sort (wineBarRoom: 'twotop', 'bar', 'lounge'); ger sittklippet. */
  kind?: string;
}

export interface DirectorRoom {
  seats: readonly DirectorSeat[];
  staffStations: readonly { id: string; local: Vec2; facing: number }[];
  entrance: Vec2;
  waitingSpot: Vec2;
  floorY: number;
  width: number;
  depth: number;
}

export interface DirectorOptions {
  /** Rummets vägar (wineBarRoom.walkPathToSeat / exitPathFromSeat). */
  walkPathToSeat: (seatId: string) => Vec2[];
  exitPathFromSeat: (seatId: string) => Vec2[];
  /** Serviceflödets bord (serviceFlow.groupsFor). */
  groups: readonly Group[];
  /** Kön utanför dörren, i rummets lokala XZ. */
  queueSlots: readonly Vec2[];
  /** Där gäster dyker upp och försvinner, utanför kön. */
  spawn: Vec2;
  /** Hur många gäster som kan synas samtidigt (riggpoolen). */
  poolSize: number;
  /** Höftens höjd över riggens rot i poseSeated (FIGURE.hipY − hipDrop). */
  seatedHipY: number;
  /** ORDER 293 — köplatsernas riktning (samma ordning som queueSlots), och
   *  hur många platser en köplats har (ett sällskap per plats). */
  queueFacings?: readonly number[];
  queueSpotSize?: number;
  /** ORDER 293 — platserna för mise en place (wineBarRoom miseSpots). */
  miseSpots?: readonly { id: string; local: Vec2; facing: number }[];
}

export interface GuestInput {
  id: string;
  state: GuestState;
  seatIndex: number | null;
  stateTime: number;
  satisfaction: number;
  partyId?: string;
}

export interface TakeoverInput {
  /** Unik per utfall (lastOutcome.at), så samma övertagande planeras en gång. */
  key: string;
  role: StaffRole;
  until: number;
  /** Raketens sällskap (händelsens context.guestIds). */
  guestIds: readonly string[];
  /** Raketens bord (context.table), när sällskapet redan gått. */
  table: number;
}

export interface FrameInput {
  t: number;
  guests: readonly GuestInput[];
  /** knowledgeInService.queuePatienceSeconds(state) — F29. */
  patienceSeconds: number;
  /** knowledgeInService.giveUpSatisfaction(state) — F29. */
  giveUpSatisfaction: number;
  /** reputation.ts UNHAPPY_THRESHOLD. */
  unhappyThreshold: number;
  takeover: TakeoverInput | null;
  /** ORDER 293 — före dörrarna: mise en place (LEVERANSNOT §6). */
  prep?: boolean;
}

// #endregion

// #region tal

/** Menyn läses 9–16 s innan servitören kallas (serviceFlow: seatedAll + 9 + hash·7). */
const MENU_MIN_S = 9;
const MENU_SPAN_S = 7;
/** Att sätta sig och resa sig (serviceFlow 'sit', 1,2 s) på en plats utan sort. */
const SIT_S = 1.2;

/**
 * ORDER 287a (Vision Owner 2026-09-30): sittklippen spelas i sin egen längd
 * på alla sitsar — stol, barstol och lounge — i gästens tempo (normalt).
 * Platser utan sort (äldre testrum) behåller serviceFlows 1,2 s.
 */
function sitSeconds(seat: DirectorSeat | null): number {
  return seat?.kind ? clipSeconds(SEAT_KINDS[seatKindFromRoom(seat.kind)].sit, 'normal') : SIT_S;
}
function standSeconds(seat: DirectorSeat | null): number {
  return seat?.kind ? clipSeconds(SEAT_KINDS[seatKindFromRoom(seat.kind)].leave, 'normal') : SIT_S;
}
/** Be om notan innan väntan börjar (serviceFlow askBill 2,4 s). */
const ASK_BILL_S = 2.4;
/** Skålen (serviceFlow toast 5 s) och tiden mellan servering och skål (4–10 s). */
const TOAST_S = 5;
/** Äta/dricka och prata växlar i block om så här många sekunder efter skålen. */
const ENJOY_BLOCK_S = 14;
/** Poseen 'waitLeaving' är en envelopp på ≈ 6 s (figureActs). */
const LEAVING_ENVELOPE_S = 6;
// ORDER 292 — värden i dörren: hur länge en nyanländ välkomnas, och hur långt
// innanför entrén värden står (meter).
const WELCOME_S = 3;
// ORDER 293 — ritualernas längd i sekunder (klippens längd i normalt tempo,
// figureClips.ts), väntan mellan de små stunderna och dörren vid öppning.
// ORDER 293 — det som ställs ned bärs medan klippet spelas (ägarboken).
const CARRY_WHILE_HOLDING: readonly DirectorPose[] = ['serve', 'setBread', 'serveAperitif'];
const RITUAL_S = { bread: 2.2, water: 2.6, aperitif: 2.5, menus: 2.4, filler: 3.2, fillerGap: 4, door: 4 };
const HOST_IN_M = 1;
/** Passet: servitörens sida (serviceFlow CORR_X) och kockens sida. */
// ORDER 317 — passet, köksdörren och flaskan ur rummets plan (WINE_BAR_PLAN).
export const PASS_FLOOR: Vec2 = [CORR_X, WINE_BAR_PLAN.pass.z];
const PASS_KITCHEN: Vec2 = [WINE_BAR_PLAN.pass.x0 - 0.05, WINE_BAR_PLAN.pass.z];
/** Sommelierens flaska hämtas vid vinväggens östra ände (serviceFlow). */
const BOTTLE_PICKUP: Vec2 = BOTTLE_PICKUP_AT;
/** Gångcykeln: en cykel per 1,3 m (serviceFlow sampleActor). */
const STRIDE_M = 1.3;
/** Köksdörren: kocken går ut ur köket här (wineBarRoom.staffPathKitchenToBar). */
const KITCHEN_DOOR: Vec2[] = [...WINE_BAR_PLAN.kitchenDoor, [CORR_X, WINE_BAR_PLAN.kitchenDoor[1][1]]];

// #endregion

// #region hjälpare

function clamp01(u: number): number { return Math.max(0, Math.min(1, u)); }
function hash(i: number, k: number): number { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 100000;
}

const SEATED_STATES: readonly GuestState[] = ['seated', 'ordering', 'dining', 'paying'];
const GONE_STATES: readonly GuestState[] = ['leaving', 'declined'];

/**
 * Tålamodet 0..1 per gäst, ur simuleringens regel för kön (F29, ORDER 266):
 * en gäst i kön ger upp först när BÅDE väntan passerat queuePatienceSeconds
 * OCH nöjdheten fallit under giveUpSatisfaction (service.ts). Tålamodet är
 * därför det som är kvar av den av de två som räcker längst.
 *
 * Vid bordet har simuleringen ingen regel för att ge upp. Där är tålamodet
 * samma tidsramp över väntan på personalen, men det når bara "på väg att gå"
 * när nöjdheten redan är under simuleringens gräns för att ge upp. Annars
 * stannar det i "otålig" — en gäst som reste sig och sedan satte sig igen
 * vore en händelse som inte finns i simuleringen.
 */
export function guestPatience(
  inQueue: boolean,
  waitSeconds: number,
  satisfaction: number,
  patienceSeconds: number,
  giveUpSatisfaction: number
): number {
  const timeLeft = clamp01(1 - waitSeconds / Math.max(1e-6, patienceSeconds));
  const satLeft = clamp01((satisfaction - giveUpSatisfaction) / Math.max(1e-6, 1 - giveUpSatisfaction));
  if (inQueue) return Math.max(timeLeft, satLeft);
  if (satisfaction < giveUpSatisfaction) return timeLeft;
  return Math.max(timeLeft, WAIT_THRESHOLDS.leaving + 0.01);
}

// #endregion

// #region spår

// ORDER 313 §8 — arbetsplatserna vid ett bord: mitten, sedan åt sidorna.
export const WORK_SPOT_STEP_M = 0.7;
export const WORK_SPOT_CLEAR_M = 0.5;
const WORK_SPOT_OFFSETS = [0, 1, -1, 2, -2] as const;
const WORK_SPOT_MARGIN_S = 0.5;
// Hur länge den som hämtar i passet kan få vänta på tallriken (plate), sekunder.
const PICKUP_WAIT_S = 4;

interface Seg {
  t0: number;
  t1: number;
  kind: 'walk' | 'hold';
  path?: Vec2[];
  len?: number;
  at?: Vec2;
  facing?: number;
  pose: DirectorPose;
  envelope?: boolean;
  targetYaw?: number;
  carrying?: FigureSample['carrying'];
  stressed?: boolean;
  /** Gång hem, som kan avbrytas av nästa uppgift. */
  homeward?: boolean;
  stride?: number;
}

interface Task {
  id: number;
  party: PartyTrack | null;
  roles: StaffRoleKey[];
  target: Vec2;
  facing: number;
  pose: DirectorPose;
  dur: number;
  pickup?: Vec2;
  pickupHold?: number;
  /** Passet: kocken lägger upp först, servitören väntar tills tallriken står där. */
  needsCook?: boolean;
  carry?: FigureSample['carrying'];
  carryBack?: FigureSample['carrying'];
  ready: number;
  state: 'pending' | 'assigned' | 'done' | 'cancelled';
  actor: ActorTrack | null;
  arrive: number;
  done: number;
  onDone?: (t: number) => void;
  /** Segmenten uppgiften lade till, så ett övertagande kan ta bort dem. */
  firstSeg: number;
}

interface ActorTrack {
  key: StaffKey;
  role: StaffRoleKey;
  home: Vec2;
  homeFacing: number;
  idlePose: DirectorPose;
  segs: Seg[];
  cursor: number;
  free: number;
  pos: Vec2;
  tasks: Task[];
  awayUntil: number;
  workClock: number;
  stress: number;
  /** ORDER 292 — sekunder utan uppgift i bild (IDLE_RULE). */
  idleFor: number;
  /** ORDER 293 — hemmet utanför mise en place och dörren (stationen). */
  base?: { home: Vec2; facing: number; pose: DirectorPose };
  /** ORDER 293 — när nästa lilla stund får börja (personalens små stunder). */
  fillerAt?: number;
  fillerIx?: number;
}

type GuestMode = 'queue' | 'toSeat' | 'seated' | 'standing' | 'out' | 'hidden';

interface GuestTrack {
  id: string;
  slot: number;
  mode: GuestMode;
  seat: DirectorSeat | null;
  party: PartyTrack | null;
  pos: Vec2;
  walk: { path: Vec2[]; len: number; t0: number; dur: number; pose: DirectorPose } | null;
  sitT0: number;
  standT0: number;
  queueIx: number;
  lastState: GuestState;
  satisfaction: number;
  unhappy: boolean;
  /** Då väntan i kön eller vid bordet började (render-tid). */
  leavingSince: number;
  inSim: boolean;
  seed: number;
  /** ORDER 292 — hälsningen när någon i sällskapet kommer (riseGreet), från/till. */
  greetFrom: number;
  greetUntil: number;
  /** ORDER 293 — värden har pratat med sällskapet i kön: lugnt till hit. */
  calmUntil: number;
  partyKey: string;
  arrivedAt: number;
}

interface PartyTrack {
  key: string;
  group: Group;
  members: GuestTrack[];
  seatedAt: number;
  menuDoneAt: number;
  orderTask: Task | null;
  drinkDone: boolean;
  servedAt: number;
  toastAt: number;
  foodTask: Task | null;
  billAskAt: number;
  billTask: Task | null;
  cleared: boolean;
  /** Övriga uppgifter vid bordet (dryck, mat), för att lägga posen rätt. */
  visits: Task[];
  hIx: number;
  /** ORDER 293 — bröd och vatten (och fördrinken i loungen) är ställda. */
  ritualsQueued: boolean;
}

// #endregion

// ORDER 286a — ett föremål och dess ägare (propLedger).
interface PropItem {
  id: string;
  item: NonNullable<FigureSample['carrying']>;
  task: Task;
  group: Group | null;
  clearTask: Task | null;
  /** Disken som bärs tillbaka till passet efter avdukningen. */
  back: boolean;
}

export type PropOwner =
  | { kind: 'staff'; key: StaffKey }
  | { kind: 'table'; group: string; groupKind: Group['kind']; at: Vec2; facing: number; slot: number; tableAt?: Vec2 };

export interface LedgerEntry { id: string; item: NonNullable<FigureSample['carrying']>; owner: PropOwner }

/** En anställds uppgift just nu: vad hen bär, varifrån och vart (LEVERANSNOT §8). */
export interface StaffTaskView { pose: DirectorPose; carry: FigureSample['carrying'] | null; from: Vec2 | null; to: Vec2; done: number; /** ORDER 290 — när arbetet på platsen börjar (ringens båge). */ arrive: number }

export class WineBarDirector {
  readonly guestSamples: FigureSample[];
  readonly staffSamples: FigureSample[];
  readonly actors: ActorTrack[];

  private readonly room: DirectorRoom;
  private readonly opts: DirectorOptions;
  private readonly seatByIndex = new Map<number, DirectorSeat>();
  private readonly groupBySeatId = new Map<string, Group>();
  private readonly tracks = new Map<string, GuestTrack>();
  private readonly freeSlots: number[] = [];
  private readonly parties = new Map<string, PartyTrack>();
  private readonly queueTaken: (string | null)[];
  private pending: Task[] = [];
  private taskSeq = 0;
  private lastT = -Infinity;
  private lastTakeoverKey = '';
  private partySeq = 0;
  /** Gäster som inte fick plats i poolen (DEV-diagnos). */
  overflow = 0;
  // ORDER 286a — föremålen som bärs och står på borden (Designs leverans 2,
  // LEVERANSNOT §8: "Ägandet av föremålen … så att en tallrik inte finns på
  // två ställen"). Ett föremål per uppgift som bär något.
  private readonly items: PropItem[] = [];

  constructor(room: DirectorRoom, opts: DirectorOptions) {
    this.room = room;
    this.opts = opts;
    room.seats.forEach((s) => this.seatByIndex.set(s.seatIndex, s));
    opts.groups.forEach((g) => g.seats.forEach((id) => this.groupBySeatId.set(id, g)));
    this.queueTaken = opts.queueSlots.map(() => null);
    this.guestSamples = [];
    for (let i = 0; i < opts.poolSize; i++) {
      this.guestSamples.push(emptySample());
      this.freeSlots.push(opts.poolSize - 1 - i);
    }
    const st = (id: string) => room.staffStations.find((s) => s.id === id);
    const mk = (key: StaffKey, role: StaffRoleKey, stationId: string, idlePose: DirectorPose, home?: Vec2, facing?: number): ActorTrack => {
      const s = st(stationId);
      const h: Vec2 = home ?? (s ? [s.local[0], s.local[1]] : [0, 0]);
      return {
        key, role, home: h, homeFacing: facing ?? s?.facing ?? 0, idlePose,
        segs: [], cursor: 0, free: -Infinity, pos: [h[0], h[1]], tasks: [], awayUntil: -Infinity, workClock: 0, stress: 0, idleFor: 0
      };
    };
    // Serviceflödets fyra (paket 6 §1) och köket (paket 1 §2).
    this.actors = [
      mk('server', 'server', 'server', 'idle'),
      // Andra servitören: södra delen av golvet, som i serviceFlow.
      mk('server2', 'server', 'server', 'idle', [CORR_X, -2.0], Math.PI / 2),
      mk('bartender', 'bartender', 'bartender', 'pour'),
      mk('sommelier', 'sommelier', 'sommelier', 'idle'),
      mk('cook', 'cook', 'cookHot', 'cook'),
      mk('dish', 'dish', 'dish', 'dish'),
      // ORDER 293 — Per bakom värdpulten, vänd mot dörren; läser bokningarna
      // mellan gästerna (host.checkBook).
      mk('host', 'host', 'host', 'checkBook')
    ];
    for (const a of this.actors) a.base = { home: [a.home[0], a.home[1]], facing: a.homeFacing, pose: a.idlePose };
    this.staffSamples = this.actors.map(() => emptySample());
  }

  /** Nollställ allt (ny dag, ny kväll, simuleringen backade). */
  reset(): void {
    this.tracks.clear();
    this.parties.clear();
    this.items.length = 0;
    this.pending = [];
    this.freeSlots.length = 0;
    for (let i = 0; i < this.opts.poolSize; i++) this.freeSlots.push(this.opts.poolSize - 1 - i);
    for (let i = 0; i < this.queueTaken.length; i++) this.queueTaken[i] = null;
    for (const a of this.actors) {
      a.segs.length = 0; a.cursor = 0; a.free = -Infinity; a.pos = [a.home[0], a.home[1]];
      a.tasks.length = 0; a.awayUntil = -Infinity; a.stress = 0;
    }
    for (const s of this.guestSamples) { s.visible = false; s.guestId = null; }
    this.lastTakeoverKey = '';
  }

  update(input: FrameInput): void {
    const t = input.t;
    if (t < this.lastT - 1) this.reset();
    const dt = this.lastT === -Infinity ? 0 : Math.max(0, t - this.lastT);
    this.lastT = t;

    this.readGuests(input);
    this.advanceParties(input);
    this.completeTasks(t);
    this.pruneItems(t);
    this.handleTakeover(input);
    this.assignPending(t);
    this.advanceQueue(t);
    this.miseEnPlace(t, !!input.prep);
    this.hostAtDoor(t, input);
    this.smallMoments(t, !!input.prep);
    this.sendIdleHome(t);

    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      a.stress = a.awayUntil > t ? 1 : clamp01(this.pendingFor(a.role, t) / 3);
      a.workClock += dt * staffTempo(a.stress).rate;
      const out = this.staffSamples[i];
      this.sampleStaff(a, t, out);
      // ORDER 292 — IDLE_RULE: ingen står overksam i bild mer än
      // maxIdleSecondsInView; sedan fyllnadsarbete vid sin station.
      a.idleFor = out.visible && out.pose === 'idle' ? a.idleFor + dt : 0;
      if (a.idleFor > IDLE_RULE.maxIdleSecondsInView) out.pose = 'fillWork';
    }
    for (const g of this.tracks.values()) this.sampleGuest(g, input, this.guestSamples[g.slot]);
  }

  // ---------- gästerna ----------

  private readGuests(input: FrameInput): void {
    const t = input.t;
    for (const tr of this.tracks.values()) tr.inSim = false;
    for (const g of input.guests) {
      let tr = this.tracks.get(g.id);
      if (!tr) {
        if (GONE_STATES.includes(g.state)) continue;
        tr = this.createTrack(g, t) ?? undefined;
        if (!tr) continue;
      }
      tr.inSim = true;
      tr.satisfaction = g.satisfaction;
      const seat = g.seatIndex != null ? this.seatByIndex.get(g.seatIndex) ?? null : null;

      if (SEATED_STATES.includes(g.state) && seat) {
        if (tr.mode === 'queue') this.walkToSeat(tr, seat, t, g);
        else if ((tr.mode === 'toSeat' || tr.mode === 'seated') && tr.seat !== seat) {
          // Simuleringen flyttade gästen. Ovanligt; placera om utan promenad.
          tr.seat = seat; tr.pos = [seat.local[0], seat.local[1]]; tr.walk = null; tr.mode = 'seated'; tr.sitT0 = t - sitSeconds(seat);
          this.joinParty(tr, g, t);
        }
      } else if (GONE_STATES.includes(g.state)) {
        if (tr.mode === 'seated' || tr.mode === 'toSeat') this.standUp(tr, t, g.satisfaction <= input.unhappyThreshold);
        else if (tr.mode === 'queue') this.walkAway(tr, t, true);
      }
      tr.lastState = g.state;
    }
    // Gäster som simuleringen släppt: de som går ut får gå klart.
    for (const tr of Array.from(this.tracks.values())) {
      if (tr.inSim) continue;
      if (tr.mode === 'seated' || tr.mode === 'toSeat') this.standUp(tr, t, tr.satisfaction <= input.unhappyThreshold);
      else if (tr.mode === 'queue') this.walkAway(tr, t, true);
    }
    // Promenader som är klara.
    for (const tr of Array.from(this.tracks.values())) {
      if (tr.mode === 'standing' && t >= tr.standT0 + standSeconds(tr.seat) && !tr.walk) this.walkOut(tr, tr.standT0 + standSeconds(tr.seat));
      if (!tr.walk) continue;
      const end = tr.walk.t0 + tr.walk.dur;
      if (t < end) continue;
      const last = tr.walk.path[tr.walk.path.length - 1];
      tr.pos = [last[0], last[1]];
      tr.walk = null;
      if (tr.mode === 'toSeat') { tr.mode = 'seated'; tr.sitT0 = end; }
      else if (tr.mode === 'out') this.release(tr);
    }
  }

  private createTrack(g: GuestInput, t: number): GuestTrack | null {
    const slot = this.freeSlots.pop();
    if (slot === undefined) { this.overflow++; return null; }
    const tr: GuestTrack = {
      id: g.id, slot, mode: 'queue', seat: null, party: null,
      pos: [this.opts.spawn[0], this.opts.spawn[1]], walk: null,
      sitT0: -Infinity, standT0: -Infinity, queueIx: -1, lastState: g.state,
      satisfaction: g.satisfaction, unhappy: false, leavingSince: -Infinity, inSim: true, seed: hashStr(g.id), greetFrom: -Infinity, greetUntil: -Infinity,
      calmUntil: -Infinity, partyKey: g.partyId ?? g.id, arrivedAt: t
    };
    this.tracks.set(g.id, tr);
    const sample = this.guestSamples[slot];
    sample.guestId = g.id;
    const seat = g.seatIndex != null ? this.seatByIndex.get(g.seatIndex) ?? null : null;
    if (SEATED_STATES.includes(g.state) && seat) {
      // Monterat mitt i kvällen: gästen sitter redan. Sällskapet har
      // beställt och fått in; bara notan och vägen ut spelas.
      tr.mode = 'seated'; tr.seat = seat; tr.pos = [seat.local[0], seat.local[1]]; tr.sitT0 = t - 60;
      const p = this.joinParty(tr, g, t - 60);
      if (p && p.members.length === 1) { p.orderTask = doneTask(); p.drinkDone = true; p.servedAt = t - 40; p.toastAt = t - 36; }
      return tr;
    }
    // Ny gäst: dyker upp ute och går till sin plats i kön.
    tr.queueIx = this.takeQueueSlot(g.id, tr.partyKey);
    const q = this.queueSpot(tr.queueIx);
    tr.walk = this.walkPath([[tr.pos[0], tr.pos[1]], q], t, WALK_GUEST, 'arrive');
    return tr;
  }

  // ORDER 293 — Designs köplatser (wineBarRoom queueSpots): en köplats per
  // sällskap, medlemmarna inom 0,6 m från punkten. Ett sällskap ställer sig
  // där någon i sällskapet redan står, annars på första helt lediga köplats.
  private takeQueueSlot(id: string, partyKey: string): number {
    const size = this.opts.queueSpotSize ?? 1;
    const spots = Math.ceil(this.queueTaken.length / size);
    const take = (spot: number) => {
      for (let k = 0; k < size; k++) {
        const i = spot * size + k;
        if (i < this.queueTaken.length && this.queueTaken[i] === null) { this.queueTaken[i] = id; return i; }
      }
      return -1;
    };
    for (let spot = 0; spot < spots; spot++) {
      const mates = [...this.tracks.values()].some((tr) => tr.partyKey === partyKey && tr.queueIx >= spot * size && tr.queueIx < (spot + 1) * size);
      if (mates) { const i = take(spot); if (i >= 0) return i; }
    }
    for (let spot = 0; spot < spots; spot++) {
      let free = true;
      for (let k = 0; k < size; k++) { const i = spot * size + k; if (i < this.queueTaken.length && this.queueTaken[i] !== null) free = false; }
      if (free) { const i = take(spot); if (i >= 0) return i; }
    }
    for (let i = 0; i < this.queueTaken.length; i++) {
      if (this.queueTaken[i] === null) { this.queueTaken[i] = id; return i; }
    }
    return this.queueTaken.length; // längre kö än platserna: ställ sig sist
  }

  /** ORDER 293 — när kön flyttar fram går varje sällskap till platsen före
   *  (LEVERANSNOT §6: "platsen med order − 1"). */
  private advanceQueue(t: number): void {
    const size = this.opts.queueSpotSize ?? 1;
    if (size <= 1) return;
    const spots = Math.ceil(this.queueTaken.length / size);
    for (let spot = 0; spot < spots - 1; spot++) {
      const empty = Array.from({ length: size }, (_, k) => spot * size + k).every((i) => i >= this.queueTaken.length || this.queueTaken[i] === null);
      if (!empty) continue;
      const movers = [...this.tracks.values()].filter((tr) => tr.mode === 'queue' && !tr.walk && tr.queueIx >= (spot + 1) * size && tr.queueIx < (spot + 2) * size);
      if (movers.length === 0) continue;
      for (const tr of movers) {
        const k = tr.queueIx - (spot + 1) * size;
        this.queueTaken[tr.queueIx] = null;
        tr.queueIx = spot * size + k;
        this.queueTaken[tr.queueIx] = tr.id;
        const to = this.queueSpot(tr.queueIx);
        tr.walk = this.walkPath([[tr.pos[0], tr.pos[1]], to], t, WALK_GUEST * 0.8, 'arrive');
        tr.pos = [to[0], to[1]];
      }
      return; // ett steg i taget
    }
  }

  private queueFacing(ix: number): number {
    const f = this.opts.queueFacings;
    if (!f || f.length === 0) return -Math.PI / 2;
    return f[Math.min(ix, f.length - 1)];
  }

  private queueSpot(ix: number): Vec2 {
    const q = this.opts.queueSlots;
    if (q.length === 0) return [this.room.waitingSpot[0], this.room.waitingSpot[1]];
    if (ix < q.length) return q[ix];
    const last = q[q.length - 1];
    return [last[0] + 0.7 * (ix - q.length + 1), last[1]];
  }

  private freeQueueSlot(tr: GuestTrack): void {
    if (tr.queueIx >= 0 && tr.queueIx < this.queueTaken.length && this.queueTaken[tr.queueIx] === tr.id) this.queueTaken[tr.queueIx] = null;
    tr.queueIx = -1;
  }

  private walkPath(given: Vec2[], t0: number, speed: number, pose: DirectorPose) {
    // ORDER 317 — en väg mellan rummet och trottoaren går genom dörrens mitt (wineBarRoom.ts doorPath).
    const path = doorPath(given, this.room.width);
    const len = pathLen(path);
    return { path, len, t0, dur: len / speed, pose };
  }

  private posAt(tr: GuestTrack, t: number): Vec2 {
    if (!tr.walk) return [tr.pos[0], tr.pos[1]];
    const u = tr.walk.dur > 0 ? clamp01((t - tr.walk.t0) / tr.walk.dur) : 1;
    const q = along(tr.walk.path, u * tr.walk.len);
    return [q.x, q.z];
  }

  private walkToSeat(tr: GuestTrack, seat: DirectorSeat, t: number, g: GuestInput): void {
    const from = this.posAt(tr, t);
    this.freeQueueSlot(tr);
    const route = this.opts.walkPathToSeat(seat.id);
    const path: Vec2[] = [from].concat(route);
    tr.seat = seat;
    tr.mode = 'toSeat';
    tr.walk = this.walkPath(path, t, WALK_GUEST, 'arrive');
    tr.leavingSince = -Infinity;
    // ORDER 287a — sällskapet räknas som sittande när den sista gästen har
    // landat (Vision Owner 2026-09-30): varje gäst som går till bordet
    // flyttar sällskapets tid till sin egen landning, om den är senare.
    this.joinParty(tr, g, t + tr.walk.dur + sitSeconds(seat));
    this.escort(tr, t);
    // ORDER 292 — de i sällskapet som redan sitter reser sig och hälsar när
    // den nya är framme vid bordet.
    const at = t + tr.walk.dur;
    for (const m of tr.party?.members ?? []) {
      if (m === tr || m.mode !== 'seated') continue;
      m.greetFrom = at;
      m.greetUntil = at + clipSeconds('guest.riseGreet', 'normal');
    }
  }

  private standUp(tr: GuestTrack, t: number, unhappy: boolean): void {
    tr.unhappy = unhappy;
    if (tr.mode === 'toSeat') {
      // Hann aldrig sätta sig: vänd direkt.
      tr.pos = this.posAtSafe(tr, t);
      tr.walk = null;
      this.walkOut(tr, t);
      return;
    }
    tr.mode = 'standing';
    tr.standT0 = t;
    this.leaveParty(tr, t);
  }

  private posAtSafe(tr: GuestTrack, t: number): Vec2 { return tr.walk ? this.posAt(tr, t) : [tr.pos[0], tr.pos[1]]; }

  private walkOut(tr: GuestTrack, t: number): void {
    const seat = tr.seat;
    const route = seat ? this.opts.exitPathFromSeat(seat.id) : [];
    const path: Vec2[] = [[tr.pos[0], tr.pos[1]] as Vec2].concat(route.length ? route.slice(1) : [], [this.opts.spawn]);
    tr.mode = 'out';
    tr.walk = this.walkPath(path, t, tr.unhappy ? WALK_GUEST * 1.3 : WALK_GUEST, tr.unhappy ? 'leaveUnhappy' : 'leaveHappy');
    this.leaveParty(tr, t);
  }

  private walkAway(tr: GuestTrack, t: number, unhappy: boolean): void {
    const from = this.posAt(tr, t);
    this.freeQueueSlot(tr);
    tr.unhappy = unhappy;
    tr.mode = 'out';
    const out: Vec2 = [this.opts.spawn[0], this.opts.spawn[1] + (tr.seed % 2 === 0 ? 3 : -3)];
    tr.walk = this.walkPath([from, out], t, WALK_GUEST * 1.3, 'leaveUnhappy');
  }

  private release(tr: GuestTrack): void {
    this.freeQueueSlot(tr);
    this.leaveParty(tr, this.lastT);
    this.tracks.delete(tr.id);
    const s = this.guestSamples[tr.slot];
    s.visible = false;
    s.guestId = null;
    this.freeSlots.push(tr.slot);
  }

  // ---------- sällskapen ----------

  private joinParty(tr: GuestTrack, g: GuestInput, seatedAt: number): PartyTrack | null {
    if (!tr.seat) return null;
    const key = g.partyId ?? g.id;
    let p = this.parties.get(key);
    if (!p) {
      const group = this.groupBySeatId.get(tr.seat.id) ?? this.opts.groups[0];
      const hIx = this.partySeq++;
      p = {
        key, group, members: [], seatedAt, menuDoneAt: seatedAt + MENU_MIN_S + hash(hIx, 3) * MENU_SPAN_S,
        orderTask: null, drinkDone: false, servedAt: -1, toastAt: -1, foodTask: null,
        billAskAt: -1, billTask: null, cleared: false, visits: [], hIx, ritualsQueued: false
      };
      this.parties.set(key, p);
    } else if (!p.orderTask && seatedAt > p.seatedAt) {
      p.seatedAt = seatedAt;
      p.menuDoneAt = seatedAt + MENU_MIN_S + hash(p.hIx, 3) * MENU_SPAN_S;
    }
    if (!p.members.includes(tr)) p.members.push(tr);
    tr.party = p;
    return p;
  }

  private leaveParty(tr: GuestTrack, t: number): void {
    const p = tr.party;
    if (!p) return;
    tr.party = null;
    p.members = p.members.filter((m) => m !== tr);
    if (p.members.length > 0) return;
    // Sista gästen har gått: avbryt det som inte hunnit börja, duka av.
    this.parties.delete(p.key);
    this.pending = this.pending.filter((k) => { if (k.party === p) { k.state = 'cancelled'; return false; } return true; });
    if (!p.cleared && p.orderTask) {
      p.cleared = true;
      const bar = p.group.kind === 'bar';
      const clear = this.addTask({
        party: null, roles: [bar ? 'bartender' : 'server'], target: p.group.serveAt, facing: p.group.serveFacing,
        pose: 'clear', dur: 3, carryBack: bar ? null : 'dishes', ready: t + 2
      });
      // Det som står på bordet tas av avdukningen.
      for (const it of this.items) if (it.group === p.group && !it.back && !it.clearTask) it.clearTask = clear;
    } else {
      for (const it of this.items) if (it.group === p.group && !it.back && !it.clearTask) it.clearTask = { state: 'done', done: t } as Task;
    }
  }

  private advanceParties(input: FrameInput): void {
    const t = input.t;
    for (const p of this.parties.values()) {
      const anyPaying = p.members.some((m) => this.simState(m, input) === 'paying');
      if (anyPaying && p.billAskAt < 0) {
        p.billAskAt = t;
        // Det som ännu inte börjat hinns inte: notan går före.
        this.pending = this.pending.filter((k) => { if (k.party === p) { k.state = 'cancelled'; return false; } return true; });
        const g = p.group;
        p.billTask = this.addTask({
          party: p, roles: rolesFor(g.kind), target: g.serveAt, facing: g.serveFacing, pose: 'takeOrder', dur: 3, ready: t + ASK_BILL_S
        });
        continue;
      }
      if (p.billAskAt >= 0 || p.orderTask) continue;
      // ORDER 287a — alla i sällskapet har landat på sina sitsar.
      const landed = p.members.length > 0 && p.members.every((m) => m.mode === 'seated' && t >= m.sitT0 + sitSeconds(m.seat));
      // ORDER 293 — ritualerna när sällskapet sitter (Designs scen 2): bröd och
      // vatten till borden, fördrinken i loungen. Baren har inget bröd.
      if (landed && !p.ritualsQueued) {
        p.ritualsQueued = true;
        this.queueRituals(p, t);
      }
      if (!landed || t < p.menuDoneAt) continue;
      const g = p.group;
      p.orderTask = this.addTask({
        party: p, roles: rolesFor(g.kind), target: g.serveAt, facing: g.serveFacing, pose: 'takeOrder', dur: 4, ready: p.menuDoneAt,
        onDone: (done) => this.serveDrinks(p, done)
      });
    }
  }

  private queueRituals(p: PartyTrack, t: number): void {
    const g = p.group;
    if (g.kind === 'bar') return;
    p.visits.push(this.addTask({
      party: p, roles: ['server'], target: g.serveAt, facing: g.serveFacing, pose: 'setBread', dur: RITUAL_S.bread,
      carry: 'plate', pickup: PASS_FLOOR, pickupHold: 0.8, ready: t + 0.5,
      onDone: (done) => {
        if (p.billAskAt >= 0 || !this.parties.has(p.key)) return;
        p.visits.push(this.addTask({ party: p, roles: ['server'], target: g.serveAt, facing: g.serveFacing, pose: 'pourWater', dur: RITUAL_S.water, ready: done }));
      }
    }));
    if (g.kind === 'lounge') {
      p.visits.push(this.addTask({
        party: p, roles: ['sommelier'], target: g.serveAt, facing: g.serveFacing, pose: 'serveAperitif', dur: RITUAL_S.aperitif,
        carry: 'glass', pickup: BOTTLE_PICKUP, pickupHold: 0.8, ready: t + 1.5
      }));
    }
  }

  /** ORDER 293 — värden visar vägen och räcker över menyerna (scen 2). */
  private escort(tr: GuestTrack, t: number): void {
    const p = tr.party;
    if (!p || p.members.length > 1) return; // en gång per sällskap, när den första går till bordet
    const g = p.group;
    this.addTask({ party: p, roles: ['host'], target: g.serveAt, facing: g.serveFacing, pose: 'presentMenu', dur: RITUAL_S.menus, ready: t + (tr.walk?.dur ?? 0) * 0.5 });
  }

  private simState(tr: GuestTrack, input: FrameInput): GuestState | null {
    for (const g of input.guests) if (g.id === tr.id) return g.state;
    return null;
  }

  /** Dryck efter beställningen, med serviceFlows tre vägar (paket 6 §1). */
  private serveDrinks(p: PartyTrack, t: number): void {
    if (p.billAskAt >= 0 || !this.parties.has(p.key)) return;
    const g = p.group;
    const served = (done: number) => {
      p.drinkDone = true;
      p.servedAt = done;
      p.toastAt = done + 4 + hash(p.hIx, 5) * 6;
      if (g.kind !== 'bar') {
        // Smårätter från passet: köket lägger upp, servitören bär.
        p.foodTask = this.addTask({
          party: p, roles: ['server'], target: g.serveAt, facing: g.serveFacing, pose: 'serve', dur: 2.5,
          carry: 'plate', pickup: PASS_FLOOR, pickupHold: 1.0, needsCook: true, ready: done + 8
        });
        p.visits.push(p.foodTask);
      }
    };
    if (g.kind === 'bar') {
      p.visits.push(this.addTask({ party: p, roles: ['bartender'], target: g.serveAt, facing: g.serveFacing, pose: 'pour', dur: 4, carry: 'glass', ready: t + 1, onDone: served }));
    } else if (g.kind === 'lounge') {
      p.visits.push(this.addTask({
        party: p, roles: ['sommelier'], target: g.serveAt, facing: g.serveFacing, pose: 'present', dur: 5,
        carry: 'bottle', pickup: BOTTLE_PICKUP, pickupHold: 1.5, ready: t, onDone: served
      }));
    } else {
      // Överlämningen: bartendern häller, servitören hämtar vid barens västra öppning.
      this.addTask({
        party: p, roles: ['bartender'], target: POUR_SPOT, facing: -Math.PI / 2, pose: 'pour', dur: 3.5, ready: t,
        onDone: (poured) => {
          if (p.billAskAt >= 0 || !this.parties.has(p.key)) return;
          p.visits.push(this.addTask({
            party: p, roles: ['server'], target: g.serveAt, facing: g.serveFacing, pose: 'serve', dur: 2.5,
            carry: 'glass', pickup: PICKUP_BAR, pickupHold: 0.8, ready: poured, onDone: served
          }));
        }
      });
    }
  }

  // ---------- personalen ----------

  /** ORDER 286a — vem som har vilket föremål vid tiden t. Ett föremål har
   *  högst en ägare: den som bär det (från att det tas upp tills uppgiften
   *  är klar), sedan bordet tills det dukas av. Föremål som inte har tagits
   *  upp än, eller som är borta, står inte med. */
  propLedger(t: number): LedgerEntry[] {
    const out: LedgerEntry[] = [];
    const perGroup = new Map<string, number>();
    for (const it of this.items) {
      const task = it.task;
      if (task.state === 'cancelled' || !task.actor) continue;
      const a = task.actor;
      if (it.back) {
        // Disken: från avdukningen till passet.
        const last = a.segs.slice(task.firstSeg).filter((s) => s.carrying === it.item).pop();
        if (last && t >= task.done && t < last.t1) out.push({ id: it.id, item: it.item, owner: { kind: 'staff', key: a.key } });
        continue;
      }
      const first = a.segs.slice(task.firstSeg).find((s) => s.carrying === it.item);
      const carryFrom = first ? first.t0 : task.done;
      if (t >= carryFrom && t < task.done) {
        out.push({ id: it.id, item: it.item, owner: { kind: 'staff', key: a.key } });
      } else if (t >= task.done && it.group && !(it.clearTask && t >= it.clearTask.done)) {
        const g = it.group;
        const slot = perGroup.get(g.id) ?? 0;
        perGroup.set(g.id, slot + 1);
        out.push({ id: it.id, item: it.item, owner: { kind: 'table', group: g.id, groupKind: g.kind, at: g.serveAt, facing: g.serveFacing, slot, tableAt: g.tableAt } });
      }
    }
    return out;
  }

  /** ORDER 286a — den anställdas pågående eller nästa uppgift. */
  staffTask(key: StaffKey, t: number): StaffTaskView | null {
    const a = this.actors.find((x) => x.key === key);
    const task = a?.tasks.find((k) => k.state !== 'cancelled' && k.done > t);
    if (!task) return null;
    return { pose: task.pose, carry: task.carry ?? task.carryBack ?? null, from: task.pickup ?? null, to: task.target, done: task.done, arrive: task.arrive };
  }

  /** ORDER 292 — uppgiften med sin art och sällskapet (theatreInteractions.ts). */
  staffTaskDetail(key: StaffKey, t: number): { kind: 'order' | 'bill' | 'wine' | 'other'; arrive: number; done: number; guestIds: string[] } | null {
    const a = this.actors.find((x) => x.key === key);
    const task = a?.tasks.find((k) => k.state !== 'cancelled' && k.done > t);
    if (!task) return null;
    const p = task.party;
    const kind = p && task === p.orderTask ? 'order' : p && task === p.billTask ? 'bill' : task.pose === 'present' ? 'wine' : 'other';
    return { kind, arrive: task.arrive, done: task.done, guestIds: p ? p.members.map((m) => m.id) : [] };
  }

  /** ORDER 292 — segmentet personen står i just nu (start och slut), för samspelen vid passet. */
  staffSegment(key: StaffKey, t: number): { t0: number; t1: number; pose: DirectorPose; kind: string } | null {
    const a = this.actors.find((x) => x.key === key);
    if (!a) return null;
    const s = this.segAt(a, t);
    return s ? { t0: s.t0, t1: s.t1, pose: s.pose, kind: s.kind } : null;
  }

  /** ORDER 292 — sällskapen vid borden (theatreInteractions.ts: skålen och samtalet). */
  partyViews(): Array<{ key: string; memberIds: string[]; seatedAt: number; servedAt: number; toastAt: number; billAskAt: number }> {
    return [...this.parties.values()].map((p) => ({ key: p.key, memberIds: p.members.map((m) => m.id), seatedAt: p.seatedAt, servedAt: p.servedAt, toastAt: p.toastAt, billAskAt: p.billAskAt }));
  }

  /** ORDER 286a — stolen en sittande gäst har (LEVERANSNOT §8: en stol per sittande gäst). */
  guestSeat(guestId: string): DirectorSeat | null {
    return this.tracks.get(guestId)?.seat ?? null;
  }

  /** Föremål som är borta sedan länge tas bort, så att listan inte växer. */
  private pruneItems(t: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const gone = it.task.state === 'cancelled' || (it.clearTask && t > it.clearTask.done + 5) || (it.back && t > it.task.done + 120);
      if (gone) this.items.splice(i, 1);
    }
  }

  private addTask(o: Partial<Task> & { roles: StaffRoleKey[]; target: Vec2; facing: number; pose: DirectorPose; dur: number; ready: number; party: PartyTrack | null }): Task {
    const task: Task = {
      id: this.taskSeq++, state: 'pending', actor: null, arrive: Infinity, done: Infinity, firstSeg: -1,
      ...o
    } as Task;
    this.pending.push(task);
    if (task.carry && task.party) this.items.push({ id: `${task.carry}:${task.id}`, item: task.carry, task, group: task.party.group, clearTask: null, back: false });
    if (task.carryBack) this.items.push({ id: `${task.carryBack}:${task.id}`, item: task.carryBack, task, group: null, clearTask: null, back: true });
    return task;
  }

  private pendingFor(role: StaffRoleKey, t: number): number {
    let n = 0;
    for (const k of this.pending) if (k.ready <= t + 1 && k.roles.includes(role)) n++;
    return n;
  }

  private completeTasks(t: number): void {
    for (const a of this.actors) {
      for (const k of a.tasks) {
        if (k.state !== 'assigned' || k.done > t) continue;
        k.state = 'done';
        k.onDone?.(k.done);
      }
      a.tasks = a.tasks.filter((k) => k.state === 'assigned');
    }
  }

  private assignPending(t: number): void {
    if (this.pending.length === 0) return;
    this.pending.sort((a, b) => a.ready - b.ready);
    const keep: Task[] = [];
    for (const k of this.pending) {
      if (k.ready > t) { keep.push(k); continue; }
      if (!this.assign(k, t)) keep.push(k);
    }
    this.pending = keep;
  }

  /**
   * ORDER 313 §8 — arbetsplatsen vid bordet: `at` (bordets serveAt) eller
   * WORK_SPOT_STEP_M åt sidan längs bordet, den första där ingen annan i
   * personalen har en stående uppgift (hold) inom WORK_SPOT_CLEAR_M under
   * [from, to]. Platser utanför rummets golv prövas inte.
   */
  private workSpot(actor: ActorTrack, at: Vec2, facing: number, from: number, to: number): Vec2 {
    const side: Vec2 = [Math.cos(facing), -Math.sin(facing)];
    const halfW = this.room.width / 2 - 0.5;
    for (const k of WORK_SPOT_OFFSETS) {
      const p: Vec2 = k === 0 ? at : [at[0] + side[0] * k * WORK_SPOT_STEP_M, at[1] + side[1] * k * WORK_SPOT_STEP_M];
      if (Math.abs(p[0]) > halfW) continue;
      const taken = this.actors.some((o) => o !== actor && o.segs.some((sg) =>
        sg.kind === 'hold' && sg.at && sg.t1 > from - WORK_SPOT_MARGIN_S && sg.t0 < to + WORK_SPOT_MARGIN_S &&
        Math.hypot(sg.at[0] - p[0], sg.at[1] - p[1]) < WORK_SPOT_CLEAR_M));
      if (!taken) return p;
    }
    return at;
  }

  /** serviceFlow.assign i realtid: den i rollen som kan vara framme först tar uppgiften. */
  private assign(task: Task, t: number): boolean {
    const cook = this.actors.find((a) => a.key === 'cook')!;
    if (task.needsCook && cook.awayUntil > t) return false; // kocken är vid ett bord (§49)
    let best: { a: ActorTrack; start: number; origin: Vec2; legs: Vec2[][]; arrive: number; speed: number; atPickup: number } | null = null;
    for (const a of this.actors) {
      if (!task.roles.includes(a.role)) continue;
      const interrupt = this.homewardAt(a, t);
      const origin: Vec2 = interrupt ? this.actorPos(a, t) : [a.pos[0], a.pos[1]];
      const freeAt = interrupt ? t : Math.max(a.free, t);
      const start = Math.max(task.ready, freeAt);
      const speed = staffTempo(clamp01(this.pendingFor(a.role, t) / 3)).walkSpeed;
      const legs: Vec2[][] = task.pickup ? [staffRoute(origin, task.pickup), staffRoute(task.pickup, task.target)] : [staffRoute(origin, task.target)];
      const atPickup = task.pickup ? start + pathLen(legs[0]) / speed : start;
      const travel = legs.reduce((s, p) => s + pathLen(p) / speed, 0) + (task.pickupHold ?? 0);
      const arrive = start + travel;
      if (!best || arrive < best.arrive) best = { a, start, origin, legs, arrive, speed, atPickup };
    }
    if (!best) return false;
    const a = best.a;
    // ORDER 313 §8 — varje bord har en arbetsplats per servitör: den första
    // platsen bredvid bordet som ingen annan i personalen står på under
    // samma tid. Vägen räknas om till den platsen.
    // Passet och baren likadant: den som hämtar står bredvid den som redan väntar där.
    const target = this.workSpot(a, task.target, task.facing, best.arrive, best.arrive + task.dur);
    const pickup = task.pickup ? this.workSpot(a, task.pickup, Math.PI / 2, best.atPickup, best.atPickup + (task.pickupHold ?? 0) + PICKUP_WAIT_S) : undefined;
    if (target !== task.target || pickup !== task.pickup) {
      best.legs = pickup ? [staffRoute(best.origin, pickup), staffRoute(pickup, target)] : [staffRoute(best.origin, target)];
    }
    if (this.homewardAt(a, t)) this.truncate(a, t);
    else if (a.free > t) { /* planerar efter det som redan ligger */ }
    task.firstSeg = a.segs.length;
    let tt = best.start;
    const stride = staffTempo(clamp01(this.pendingFor(a.role, t) / 3)).stride;
    if (task.pickup) {
      const d0 = pathLen(best.legs[0]) / best.speed;
      a.segs.push({ t0: tt, t1: tt + d0, kind: 'walk', path: best.legs[0], len: pathLen(best.legs[0]), pose: 'walk', stride });
      tt += d0;
      let hold = task.pickupHold ?? 0;
      if (task.needsCook) {
        // Kocken lägger upp på passet; servitören tar tallriken när den står där.
        const plated = this.plate(cook, t, tt);
        hold = Math.max(hold, plated - tt + 0.3);
      }
      a.segs.push({ t0: tt, t1: tt + hold, kind: 'hold', at: pickup, facing: Math.PI / 2, pose: 'serve', envelope: true });
      tt += hold;
      const d1 = pathLen(best.legs[1]) / best.speed;
      a.segs.push({ t0: tt, t1: tt + d1, kind: 'walk', path: best.legs[1], len: pathLen(best.legs[1]), pose: 'serveWalk', carrying: task.carry ?? null, stride });
      tt += d1;
    } else {
      const d0 = pathLen(best.legs[0]) / best.speed;
      a.segs.push({ t0: tt, t1: tt + d0, kind: 'walk', path: best.legs[0], len: pathLen(best.legs[0]), pose: task.carry ? 'serveWalk' : 'walk', carrying: task.carry ?? null, stride });
      tt += d0;
    }
    task.arrive = tt;
    a.segs.push({ t0: tt, t1: tt + task.dur, kind: 'hold', at: target, facing: task.facing, pose: task.pose, envelope: true, targetYaw: 0, carrying: CARRY_WHILE_HOLDING.includes(task.pose) ? task.carry ?? null : null });
    tt += task.dur;
    task.done = tt;
    if (task.carryBack) {
      const toPass = staffRoute(target, PASS_FLOOR);
      const dp = pathLen(toPass) / best.speed;
      a.segs.push({ t0: tt, t1: tt + dp, kind: 'walk', path: toPass, len: pathLen(toPass), pose: 'serveWalk', carrying: task.carryBack, stride });
      tt += dp;
      a.pos = [PASS_FLOOR[0], PASS_FLOOR[1]];
    } else {
      a.pos = [target[0], target[1]];
    }
    a.free = tt;
    task.state = 'assigned';
    task.actor = a;
    a.tasks.push(task);
    return true;
  }

  /** Kocken går till passet och lägger upp. Returnerar när tallriken står där. */
  private plate(cook: ActorTrack, t: number, wanted: number): number {
    const walk = staffRoute(cook.home, PASS_KITCHEN);
    const d = pathLen(walk) / staffTempo(0).walkSpeed;
    const start = Math.max(t, cook.free, wanted - d - 1.5);
    cook.segs.push({ t0: start, t1: start + d, kind: 'walk', path: [cook.home, PASS_KITCHEN], len: d * staffTempo(0).walkSpeed, pose: 'serveWalk', carrying: 'plate' });
    cook.segs.push({ t0: start + d, t1: start + d + 1.5, kind: 'hold', at: PASS_KITCHEN, facing: Math.PI / 2, pose: 'serve', envelope: true });
    cook.segs.push({ t0: start + d + 1.5, t1: start + 2 * d + 1.5, kind: 'walk', path: [PASS_KITCHEN, cook.home], len: d * staffTempo(0).walkSpeed, pose: 'walk', homeward: true });
    cook.free = start + 2 * d + 1.5;
    cook.pos = [cook.home[0], cook.home[1]];
    return start + d + 1.5;
  }

  /** Går hem när uppgifterna är slut (serviceFlow: hem bara när det finns tid — här avbrytbart). */
  // ORDER 292 (Vision Owner 2026-10-01: "sommeliern som värd vid dörren med
  // poseWelcome och poseAttend, tills Design levererar en egen värd") — när
  // någon står i kön eller just kommit går sommeliern till dörren (entrén,
  // innanför), välkomnar den som kommer och håller kön under uppsikt. Utan kö
  // går hen tillbaka till sin plats.
  hosting = false;
  private prepWas = false;
  private doorHeldUntil = -Infinity;

  // ORDER 293 — mise en place före öppning (LEVERANSNOT §6, scen 1): en uppgift
  // per roll vid sin plats. Per skriver på tavlan, servitören dukar småborden,
  // sommeliern fyller vinkylen och bartendern putsar glas. När dörrarna öppnar
  // håller Per dörren en stund och alla går tillbaka till sina stationer.
  private miseEnPlace(t: number, prep: boolean): void {
    const spots = this.opts.miseSpots ?? [];
    const spot = (id: string) => spots.find((m) => m.id === id);
    const plan: Partial<Record<StaffKey, { id: string; pose: DirectorPose }>> = {
      host: { id: 'board', pose: 'writeBoard' },
      server: { id: 'setTables', pose: 'setTable' },
      server2: { id: 'polish', pose: 'polishGlass' },
      sommelier: { id: 'fridge', pose: 'stockFridge' },
      bartender: { id: 'polish', pose: 'polishGlass' }
    };
    if (prep) {
      for (const a of this.actors) {
        const m = plan[a.key];
        const at = m ? spot(m.id) : undefined;
        if (!m || !at) continue;
        // Två på samma plats står bredvid varandra.
        const side = a.key === 'server2' ? 0.7 : 0;
        a.home = [at.local[0] + side, at.local[1]];
        a.homeFacing = at.facing;
        a.idlePose = m.pose;
      }
    } else if (this.prepWas) {
      for (const a of this.actors) if (a.base) { a.home = [a.base.home[0], a.base.home[1]]; a.homeFacing = a.base.facing; a.idlePose = a.base.pose; }
      this.doorHeldUntil = t + RITUAL_S.door;
    }
    this.prepWas = prep;
  }

  // ORDER 293 — Per i dörren (vardagens koreografi, scen 2 och 5). Han läser
  // bokningarna vid pulten mellan gästerna (host.checkBook). När ett sällskap
  // kommer kliver han fram och hälsar (host.greetDoor). Står någon otålig i
  // kön går han ut och pratar med dem, och de lugnar sig (staff.chat).
  private hostAtDoor(t: number, input: FrameInput): void {
    const a = this.actors.find((x) => x.key === 'host');
    if (!a || !a.base || input.prep) return;
    const queue = [...this.tracks.values()].filter((g) => g.mode === 'queue');
    const door: Vec2 = [this.room.entrance[0] - HOST_IN_M, this.room.entrance[1]];
    if (t < this.doorHeldUntil) {
      a.home = door; a.homeFacing = Math.PI / 2; a.idlePose = 'holdDoor';
    } else if (queue.length > 0) {
      const justCame = queue.find((g) => t - g.arrivedAt < WELCOME_S + 2);
      const impatient = justCame ? undefined : queue.find((g) => {
        const sim = input.guests.find((x) => x.id === g.id);
        const wait = sim && sim.state === 'waiting' ? Math.max(0, t - sim.stateTime) : 0;
        return t >= g.calmUntil && guestPatience(true, wait, g.satisfaction, input.patienceSeconds, input.giveUpSatisfaction) < WAIT_THRESHOLDS.impatient;
      });
      if (impatient && a.tasks.length === 0) {
        // Ställer sig bredvid sällskapet, vänd mot dem.
        const at = impatient.pos;
        a.home = [at[0] - 0.7, at[1]];
        a.homeFacing = -Math.PI / 2 + Math.PI;
        a.idlePose = 'chat';
        if (Math.hypot(a.pos[0] - a.home[0], a.pos[1] - a.home[1]) < 0.3) {
          for (const m of queue) if (m.partyKey === impatient.partyKey) m.calmUntil = t + QUEUE_MOOD.hostCalmSeconds;
        }
      } else {
        a.home = door;
        a.homeFacing = Math.PI / 2;
        a.idlePose = justCame ? 'greetDoor' : 'checkBook';
      }
    } else {
      a.home = [a.base.home[0], a.base.home[1]];
      a.homeFacing = a.base.facing;
      a.idlePose = a.base.pose;
    }
    this.hosting = queue.length > 0;
  }

  // ORDER 293 — personalens små stunder (LEVERANSNOT §6): när en roll inte har
  // någon uppgift väljs en stund med syfte, i ordningen kontrollera ett dukat
  // bord, torka bordet, fylla på vatten, putsa glas och sist byta några ord.
  // staff.idle bara när figuren väntar på något bestämt.
  private smallMoments(t: number, prep: boolean): void {
    if (prep) return;
    for (const a of this.actors) {
      if (a.role !== 'server' && a.role !== 'sommelier') continue;
      if (a.tasks.length > 0 || a.free > t) continue;
      if (this.pending.some((k) => k.roles.includes(a.role) && k.ready <= t + 3)) continue;
      if ((a.fillerAt ?? -Infinity) > t) continue;
      const busy = new Set([...this.parties.values()].map((p) => p.group.id));
      const groups = this.opts.groups.filter((g) => g.kind !== 'bar');
      if (groups.length === 0) continue;
      const ix = (a.fillerIx ?? (a.key === 'server2' ? 2 : 0)) % 4;
      a.fillerIx = ix + 1;
      const free = groups.filter((g) => !busy.has(g.id));
      const taken = groups.filter((g) => busy.has(g.id));
      const pick = <T,>(xs: T[]) => xs[(hashStr(a.key) + (a.fillerIx ?? 0)) % xs.length];
      let target: Group | undefined;
      let pose: DirectorPose;
      if ((ix === 0 || ix === 1) && free.length > 0) { target = pick(free); pose = ix === 0 ? 'checkTable' : 'wipeTable'; }
      else if (ix === 2 && taken.length > 0) { target = pick(taken); pose = 'pourWater'; }
      else { a.fillerAt = t + RITUAL_S.fillerGap; continue; }
      a.fillerAt = t + RITUAL_S.filler + RITUAL_S.fillerGap;
      this.addTask({ party: null, roles: [a.role], target: target.serveAt, facing: target.serveFacing, pose, dur: RITUAL_S.filler, ready: t });
    }
  }

  private sendIdleHome(t: number): void {
    for (const a of this.actors) {
      if (a.free > t || a.tasks.length > 0) continue;
      if (Math.hypot(a.pos[0] - a.home[0], a.pos[1] - a.home[1]) < 0.05) continue;
      if (this.pending.some((k) => k.roles.includes(a.role) && k.ready <= t + 3)) continue;
      const from = a.pos;
      const back = staffRoute(from, a.home);
      const speed = staffTempo(a.stress).walkSpeed;
      const d = pathLen(back) / speed;
      const t0 = Math.max(t, a.free);
      a.segs.push({ t0, t1: t0 + d, kind: 'walk', path: back, len: pathLen(back), pose: 'walk', homeward: true });
      a.free = t0 + d;
      a.pos = [a.home[0], a.home[1]];
    }
  }

  private homewardAt(a: ActorTrack, t: number): boolean {
    if (a.free <= t) return false;
    const last = a.segs[a.segs.length - 1];
    return !!last && !!last.homeward && last.t1 > t && a.tasks.length === 0;
  }

  /** Klipp personalens plan vid t: det som inte börjat tas bort, pågående gång kapas där figuren står. */
  private truncate(a: ActorTrack, t: number): Vec2 {
    const pos = this.actorPos(a, t);
    const keep: Seg[] = [];
    for (const s of a.segs) {
      if (s.t1 <= t) { keep.push(s); continue; }
      if (s.t0 >= t) continue;
      if (s.kind === 'walk' && s.path) {
        keep.push({ ...s, t1: t, path: [s.path[0], pos], len: pathLen([s.path[0], pos]) });
      } else {
        keep.push({ ...s, t1: t });
      }
    }
    a.segs = keep;
    a.cursor = 0;
    a.free = t;
    a.pos = pos;
    return pos;
  }

  /** FRAGOR §49: personen i rollen lämnar sin uppgift, går till raketens bord i stressat tempo, stannar och går tillbaka. */
  private handleTakeover(input: FrameInput): void {
    const to = input.takeover;
    const t = input.t;
    if (!to || to.key === this.lastTakeoverKey || t >= to.until) return;
    this.lastTakeoverKey = to.key;
    const key = SIM_ROLE_TO_STAFF[to.role];
    const a = this.actors.find((x) => x.key === key);
    if (!a) return;
    // Uppgifterna den här personen inte hunnit göra klart läggs tillbaka.
    for (const k of a.tasks) {
      if (k.state !== 'assigned' || k.done <= t) continue;
      k.state = 'pending';
      k.actor = null;
      k.ready = t;
      k.arrive = Infinity;
      k.done = Infinity;
      this.pending.push(k);
    }
    a.tasks = a.tasks.filter((k) => k.state === 'assigned');
    const from = this.truncate(a, t);
    const target = this.takeoverTarget(to);
    const tempo = staffTempo(1);
    const go = this.routeFor(a, from, target.at);
    const d0 = pathLen(go) / tempo.walkSpeed;
    a.segs.push({ t0: t, t1: t + d0, kind: 'walk', path: go, len: pathLen(go), pose: 'walk', stressed: true, stride: tempo.stride });
    const holdEnd = Math.max(t + d0 + 1, to.until);
    a.segs.push({ t0: t + d0, t1: holdEnd, kind: 'hold', at: target.at, facing: target.facing, pose: 'handle', stressed: true });
    const back = this.routeFor(a, target.at, a.home);
    const d1 = pathLen(back) / tempo.walkSpeed;
    a.segs.push({ t0: holdEnd, t1: holdEnd + d1, kind: 'walk', path: back, len: pathLen(back), pose: 'walk', stressed: true, stride: tempo.stride });
    a.free = holdEnd + d1;
    a.pos = [a.home[0], a.home[1]];
    a.awayUntil = a.free;
  }

  /** staffRoute, men kocken och diskaren går ut och in genom köksdörren. */
  private routeFor(a: ActorTrack, from: Vec2, to: Vec2): Vec2[] {
    if (a.role !== 'cook' && a.role !== 'dish') return staffRoute(from, to);
    const inKitchen = (p: Vec2) => p[0] < CORR_X - 0.3 && p[1] > WINE_BAR_PLAN.kitchen.z0;
    if (inKitchen(from) && !inKitchen(to)) {
      return [from as Vec2].concat(KITCHEN_DOOR, staffRoute(KITCHEN_DOOR[2], to).slice(1));
    }
    if (!inKitchen(from) && inKitchen(to)) {
      const tail = KITCHEN_DOOR.slice().reverse();
      return staffRoute(from, tail[0]).concat(tail.slice(1), [to]);
    }
    return staffRoute(from, to);
  }

  private takeoverTarget(to: TakeoverInput): { at: Vec2; facing: number } {
    for (const id of to.guestIds) {
      const tr = this.tracks.get(id);
      if (tr?.party) return { at: tr.party.group.serveAt, facing: tr.party.group.serveFacing };
      if (tr?.seat) { const g = this.groupBySeatId.get(tr.seat.id); if (g) return { at: g.serveAt, facing: g.serveFacing }; }
    }
    // Sällskapet har gått: händelsens bordsnummer (incidents.ts contextFor,
    // INCIDENTS.seatsPerTable platser per bord).
    const seat = this.seatByIndex.get(Math.max(0, (to.table - 1) * 2));
    const g = seat ? this.groupBySeatId.get(seat.id) : undefined;
    if (g) return { at: g.serveAt, facing: g.serveFacing };
    return { at: [this.room.entrance[0] - 1, this.room.entrance[1]], facing: Math.PI / 2 };
  }

  // ---------- läsning ----------

  private actorPos(a: ActorTrack, t: number): Vec2 {
    const s = this.segAt(a, t);
    if (!s) return [a.pos[0], a.pos[1]];
    if (s.kind === 'walk' && s.path) {
      const u = s.t1 > s.t0 ? clamp01((t - s.t0) / (s.t1 - s.t0)) : 1;
      const q = along(s.path, u * (s.len ?? pathLen(s.path)));
      return [q.x, q.z];
    }
    return [s.at![0], s.at![1]];
  }

  /** Segmentet som gäller vid t: det pågående, annars det senast avslutade (figuren står kvar där). */
  private segAt(a: ActorTrack, t: number): Seg | null {
    const segs = a.segs;
    if (segs.length === 0) return null;
    let i = Math.min(a.cursor, segs.length - 1);
    if (segs[i].t0 > t) i = 0;
    while (i < segs.length - 1 && segs[i + 1].t0 <= t) i++;
    a.cursor = i;
    const s = segs[i];
    if (s.t0 > t) return null;
    // Rensa det som ligger långt bakåt (inget växer över en kväll).
    if (i > 64) { a.segs = segs.slice(i - 8); a.cursor = 8; }
    return s;
  }

  private sampleStaff(a: ActorTrack, t: number, out: FigureSample): void {
    out.visible = true;
    out.guestId = null;
    out.seated = false;
    out.targetYaw = 0;
    out.carrying = null;
    out.y = this.room.floorY;
    const s = this.segAt(a, t);
    const stress = a.stress;
    out.stress = stress;
    if (!s) {
      out.x = a.home[0]; out.z = a.home[1]; out.facing = a.homeFacing; out.pose = a.idlePose; out.phase = a.workClock; out.progress = 0;
      return;
    }
    const inSeg = t <= s.t1;
    if (s.kind === 'walk' && s.path) {
      const len = s.len ?? pathLen(s.path);
      const u = s.t1 > s.t0 ? clamp01((t - s.t0) / (s.t1 - s.t0)) : 1;
      const q = along(s.path, u * len);
      out.x = q.x; out.z = q.z;
      if (inSeg) {
        out.facing = q.facing;
        out.pose = s.pose;
        out.phase = (u * len) / (STRIDE_M * (s.stride ?? 1));
        out.progress = u;
        out.carrying = s.carrying ?? null;
        if (s.stressed) out.stress = 1;
        return;
      }
      // Framme och ingen ny uppgift: står kvar, hemma i sin egen pose.
      const home = Math.hypot(q.x - a.home[0], q.z - a.home[1]) < 0.1;
      out.facing = home ? a.homeFacing : q.facing;
      out.pose = home ? a.idlePose : 'idle';
      out.phase = a.workClock;
      out.progress = 0;
      return;
    }
    out.x = s.at![0]; out.z = s.at![1];
    out.facing = s.facing ?? 0;
    if (inSeg) {
      out.pose = s.pose;
      out.phase = s.envelope ? t - s.t0 : a.workClock;
      out.progress = s.envelope && s.t1 > s.t0 ? clamp01((t - s.t0) / (s.t1 - s.t0)) : 0;
      out.targetYaw = s.targetYaw ?? 0;
      out.carrying = s.carrying ?? null;
      if (s.stressed) out.stress = 1;
      return;
    }
    const home = Math.hypot(s.at![0] - a.home[0], s.at![1] - a.home[1]) < 0.1;
    out.pose = home ? a.idlePose : 'idle';
    out.phase = a.workClock;
    out.progress = 0;
  }

  private sampleGuest(tr: GuestTrack, input: FrameInput, out: FigureSample): void {
    const t = input.t;
    out.visible = true;
    out.guestId = tr.id;
    out.stress = 0;
    out.carrying = null;
    out.targetYaw = 0;
    out.progress = 0;
    const halfW = this.room.width / 2;
    const halfD = this.room.depth / 2;
    const floorAt = (x: number, z: number) => (Math.abs(x) <= halfW && Math.abs(z) <= halfD ? this.room.floorY : 0);

    if (tr.walk) {
      const w = tr.walk;
      const u = w.dur > 0 ? clamp01((t - w.t0) / w.dur) : 1;
      const q = along(w.path, u * w.len);
      out.x = q.x; out.z = q.z; out.y = floorAt(q.x, q.z);
      out.facing = q.facing;
      out.seated = false;
      if (u >= 1 && tr.mode === 'queue') {
        this.queuePose(tr, input, out);
        return;
      }
      out.pose = w.pose;
      out.phase = (u * w.len) / STRIDE_M;
      out.progress = u;
      return;
    }

    if (tr.mode === 'queue') {
      out.x = tr.pos[0]; out.z = tr.pos[1]; out.y = floorAt(tr.pos[0], tr.pos[1]);
      out.facing = this.queueFacing(tr.queueIx); // ORDER 293 — köplatsens riktning
      out.seated = false;
      this.queuePose(tr, input, out);
      return;
    }

    const seat = tr.seat;
    if (!seat) { out.visible = false; return; }
    // ORDER 286a: roten står aldrig under golvet. Sittklippen (figureClips) sänker
    // höften från golvet till sitsen själva; höjden här gäller figureActs-poserna.
    const seatedY = Math.max(this.room.floorY, seat.seatSurfaceY - this.opts.seatedHipY);
    out.x = seat.local[0]; out.z = seat.local[1];
    out.facing = seat.facing;
    out.phase = t + (tr.seed % 97) * 0.13;

    if (tr.mode === 'standing') {
      const u = clamp01((t - tr.standT0) / standSeconds(seat));
      out.pose = 'standUp'; out.progress = u; out.seated = false;
      out.y = seatedY + (this.room.floorY - seatedY) * u;
      return;
    }
    // Sitter ner.
    const sitS = sitSeconds(seat);
    if (t < tr.sitT0 + sitS) {
      const u = clamp01((t - tr.sitT0) / sitS);
      out.pose = 'sitDown'; out.progress = u; out.seated = false;
      out.y = this.room.floorY + (seatedY - this.room.floorY) * u;
      return;
    }
    out.y = seatedY;
    out.seated = true;
    this.seatedPose(tr, input, out);
  }

  private queuePose(tr: GuestTrack, input: FrameInput, out: FigureSample): void {
    const t = input.t;
    const g = input.guests.find((x) => x.id === tr.id);
    const wait = g && g.state === 'waiting' ? Math.max(0, t - g.stateTime) : 0;
    const patience = guestPatience(true, wait, tr.satisfaction, input.patienceSeconds, input.giveUpSatisfaction);
    // ORDER 293 — värden har pratat med sällskapet: lugnt en stund (scen 5),
    // så länge simuleringen inte låter dem gå.
    const calmed = t < tr.calmUntil && patience >= WAIT_THRESHOLDS.leaving;
    this.waitPose(tr, calmed ? 1 : patience, t, out);
    out.targetYaw = 0;
  }

  private waitPose(tr: GuestTrack, patience: number, t: number, out: FigureSample): void {
    const w = waitStateFor(patience);
    if (w === 'påVägAttGå') {
      if (tr.leavingSince < 0 || !Number.isFinite(tr.leavingSince)) tr.leavingSince = t;
      out.pose = 'waitLeaving';
      out.progress = clamp01((t - tr.leavingSince) / LEAVING_ENVELOPE_S);
      out.targetYaw = -1.4;
    } else {
      tr.leavingSince = -Infinity;
      out.pose = w === 'otålig' ? 'waitImpatient' : 'waitCalm';
      out.targetYaw = 1.1;
    }
    out.phase = t + (tr.seed % 97) * 0.13;
  }

  private seatedPose(tr: GuestTrack, input: FrameInput, out: FigureSample): void {
    const t = input.t;
    const p = tr.party;
    if (t >= tr.greetFrom && t < tr.greetUntil) {
      out.pose = 'riseGreet';
      out.progress = (t - tr.greetFrom) / Math.max(0.01, tr.greetUntil - tr.greetFrom);
      return;
    }
    if (!p) { out.pose = 'talk'; out.targetYaw = 0.6; return; }
    const atTable = (k: Task | null) => !!k && k.state === 'assigned' && t >= k.arrive && t <= k.done;
    const waitFor = (since: number) => {
      const patience = guestPatience(false, Math.max(0, t - since), tr.satisfaction, input.patienceSeconds, input.giveUpSatisfaction);
      this.waitPose(tr, patience, t, out);
    };

    // Notan.
    if (p.billAskAt >= 0) {
      if (t < p.billAskAt + ASK_BILL_S) { out.pose = 'askBill'; out.progress = clamp01((t - p.billAskAt) / ASK_BILL_S); return; }
      const b = p.billTask;
      if (atTable(b)) { out.pose = 'pay'; out.progress = clamp01((t - b!.arrive) / (b!.done - b!.arrive)); out.targetYaw = 0.7; tr.leavingSince = -Infinity; return; }
      if (b && b.state === 'done') { out.pose = 'talk'; out.targetYaw = 0.9; return; }
      waitFor(p.billAskAt + ASK_BILL_S);
      return;
    }

    // Beställningen.
    const o = p.orderTask;
    if (!o || o.state !== 'done') {
      if (atTable(o)) { out.pose = 'order'; out.progress = clamp01((t - o!.arrive) / (o!.done - o!.arrive)); out.targetYaw = 0.7; tr.leavingSince = -Infinity; return; }
      if (t < p.menuDoneAt) { out.pose = 'readMenu'; return; }
      waitFor(p.menuDoneAt);
      return;
    }
    tr.leavingSince = -Infinity;

    // Personal vid bordet med vin eller mat: gästerna vänder sig mot den.
    for (const v of p.visits) if (atTable(v)) { out.pose = 'waitCalm'; out.targetYaw = 0.6; return; }

    if (!p.drinkDone) { out.pose = 'talk'; out.targetYaw = 0.9; return; }
    if (t < p.toastAt) { out.pose = 'drink'; return; }
    if (t < p.toastAt + TOAST_S) { out.pose = 'toast'; out.progress = clamp01((t - p.toastAt) / TOAST_S); return; }
    const block = Math.floor((t - p.toastAt - TOAST_S + (tr.seed % 5)) / ENJOY_BLOCK_S);
    const bar = p.group.kind === 'bar';
    if (block % 2 === 0) { out.pose = bar ? 'drink' : 'eat'; return; }
    out.pose = 'talk';
    out.targetYaw = (tr.seed % 2 === 0 ? 1 : -1) * 0.9;
  }

  // ---------- för tester och DevPanel ----------

  /** Personalens uppgifter i kö som ännu inte tagits. */
  pendingCount(): number { return this.pending.length; }
  /** Sim-gästen i en viss plats i poolen, eller null. */
  trackOf(id: string): { mode: GuestMode; seatId: string | null } | null {
    const tr = this.tracks.get(id);
    return tr ? { mode: tr.mode, seatId: tr.seat?.id ?? null } : null;
  }
  /** Var en personal står (lokal XZ) och vilken pose, vid senaste update(). */
  staffAt(key: StaffKey): FigureSample { return this.staffSamples[STAFF_KEYS.indexOf(key)]; }
  /** Den i rollen är borta från sin uppgift till (sim-tid). */
  awayUntil(key: StaffKey): number { return this.actors.find((a) => a.key === key)?.awayUntil ?? -Infinity; }
}

function rolesFor(kind: Group['kind']): StaffRoleKey[] {
  return kind === 'bar' ? ['bartender'] : kind === 'lounge' ? ['sommelier', 'server'] : ['server'];
}

function doneTask(): Task {
  return {
    id: -1, party: null, roles: [], target: [0, 0], facing: 0, pose: 'idle', dur: 0, ready: 0,
    state: 'done', actor: null, arrive: -Infinity, done: -Infinity, firstSeg: -1
  };
}

function emptySample(): FigureSample {
  return {
    visible: false, x: 0, z: 0, y: 0, facing: 0, pose: 'hidden', phase: 0, progress: 0, targetYaw: 0,
    stress: 0, seated: false, carrying: null, guestId: null
  };
}
