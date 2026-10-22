// ORDER 335 D — rummen skiljer sig i planlösning (Anders 2026-10-22: "baren får D15:s placering i varje lokal
// (källaren långbord och bar längs väggen, salongen baren i östra änden som nu, Flygeln baren bort från glaset)", med
// D15:s antal platser: källaren 44, salongen 35, Flygeln 36; Designs D15 d15Manus.js venueLayout och VENUE_SEATS).
//
// Planerna står i vinbarens rum i lokalens hus (premisesInterior.ts, content/premises.ts), i rummets lokala ram:
// +X mot dörren i östra väggen, +Z norrut (i alla tre lokalerna är rummets z lokalens z: −z söder, mot Flygelns glas).
// Som bistron (bistroHouse.ts) är köket i nordväst, förrådet i sydväst, dörren, värdpulten, tavlan och köplatserna
// vinbarens (wineBarHouse.ts); baren, borden, platserna och gångarna är lokalens.
//   - Källaren: två rader långbord om tio (fem per sida) och baren längs östra väggen norr om dörren med fyra pallar.
//   - Flygeln: tolv pallar längs södra glaset, sex bord för fyra i två rader, baren mot norra väggen bort från glaset.
//   - Salongen (ORDER 336 A): åtta runda bord med vit duk i hela rummet, soffgruppen vid kakelugnen, vinbarens bar kvar
//     i östra änden; västra delen nås genom öppningen i mellanväggen (premisesInterior.ts).
// Platsernas mått som bistrons: stolens mitt 0,2 m från bordets kant, pallens mitt 0,45 m från disken.
import type { PremisesId } from '../../sim/districts';

export type Vec2 = [number, number];
type Seg = [Vec2, Vec2];
type Rect = { x0: number; x1: number; z0: number; z1: number };

export type PlanSeatKind = 'chair' | 'stool' | 'sofa';
export interface PlanSeat { id: string; kind: PlanSeatKind; furnitureId: string; local: Vec2; facing: number }
export interface PlanTable { id: string; at: Vec2; w: number; d: number; round?: boolean; cloth?: boolean }
export type PlanLayout = 'kallaren' | 'flygeln' | 'salongen';

export interface TablePlan {
  id: PlanLayout;
  seats: readonly PlanSeat[];
  tables: readonly PlanTable[];
  /** Disken (barens låda) och hyllan bakom den. */
  bar: Rect & { h: number };
  shelf: Rect | null;
  /** ORDER 336 A — vinbarens bar (ön med vinväggen, wineBarRoom.ts) står kvar; bar ovan är dess mått för vägarna. */
  winebarBar?: boolean;
  /** Fönsterbänken längs glaset (Flygeln). */
  ledge: Rect | null;
  /** Personalen: bartendern i gången bakom baren, sommelieren vid barens ände, DJ:ns plats (ingen DJ). */
  bartender: { at: Vec2; facing: number };
  sommelier: { at: Vec2; facing: number };
  djAt: Vec2;
  /** serviceFlow.ts: glaset hämtas, bartendern häller, flaskan står (null: vinbarens). */
  spots: { pickupBar: Vec2; pourSpot: Vec2; bottlePickup: Vec2 } | null;
  /** theatreStage.ts: flaskorna på disken (null: vinbarens). */
  bottles: readonly Vec2[] | null;
  /** Mise en place: nya platser för det som stod vid vinbarens bar. */
  mise: Record<string, { local: Vec2; facing: number }>;
  aisles: readonly Seg[];
  /** Gången bakom baren och dess utgång till gångarna. */
  runway: Rect & { exit: Vec2[] };
  /** ORDER 336 B — en egen dörr (källaren: norra långsidan, rummets −z) och vägen utanför: entrén innanför dörren,
   *  väntplatsen på gatan, köplatserna, trappan ned och golvets höjd under gatan. Saknas: vinbarens dörr i öster. */
  door?: PlanDoor;
}

export interface PlanDoor {
  /** Dörren i rummets södra vägg (−z), x0…x1 längs väggen. */
  x0: number; x1: number;
  /** Innanför dörren (gästens första punkt i rummet) och riktningen in i rummet. */
  entrance: Vec2; inward: Vec2;
  /** Väntplatsen på gatan och köplatserna (innanför på vilplanet vid dörren, utanför längs fasaden på gatan). */
  waitingSpot: Vec2;
  queue: readonly { id: string; side: 'inside' | 'outside'; order: number; local: Vec2 }[];
  /** Golvet under gatan (m) och trappan längs fasaden: från gatan vid x0 ned till x1, vilplanet till xEnd, z0…z1. */
  floorY: number;
  stair: { x0: number; x1: number; xEnd: number; z0: number; z1: number };
  /** Vägen från väntplatsen på gatan nedför trappan till dörren (rummets lokala ram). */
  approach: readonly Vec2[];
  /** ORDER 336 B (Anders 2026-10-22: "Gästerna ska mötas där de kommer in") — värdpulten innanför dörren vid
   *  trappans fot [x0, x1, z0, z1], och värdens plats bakom den, vänd mot dörren. */
  hostDesk: readonly [number, number, number, number];
  host: { at: Vec2; facing: number };
}

// ---------- Gemensamt: rummets fasta delar (wineBarHouse.ts) ----------

const KITCHEN = { x1: -4.6, z0: 1.4 };
const KITCHEN_EXIT: Vec2 = [-5.1, 0.9];
const DOOR_X = 6.485;
const CHAIR_FROM_EDGE = 0.2;
const STOOL_FROM_COUNTER = 0.45;

function chairsAlong(out: PlanSeat[], fid: string, t: PlanTable, perSide: number, sides: ('n' | 's')[]): void {
  for (const side of sides) {
    for (let i = 0; i < perSide; i++) {
      const x = t.at[0] - t.w / 2 + (t.w / perSide) * (i + 0.5);
      const z = side === 'n' ? t.at[1] + t.d / 2 + CHAIR_FROM_EDGE : t.at[1] - t.d / 2 - CHAIR_FROM_EDGE;
      out.push({ id: `${fid}${side}${i + 1}`, kind: 'chair', furnitureId: fid, local: [x, z], facing: side === 'n' ? Math.PI : 0 });
    }
  }
}

// ---------- Källaren (44) ----------

const CELLAR_TABLES: PlanTable[] = [
  { id: 'longNW', at: [-1.9, 2.95], w: 3.8, d: 0.8 },
  { id: 'longNE', at: [2.1, 2.95], w: 3.8, d: 0.8 },
  { id: 'longSW', at: [-1.9, -2.95], w: 3.8, d: 0.8 },
  { id: 'longSE', at: [2.1, -2.95], w: 3.8, d: 0.8 }
];
const CELLAR_BAR = { x0: 5.35, x1: 5.97, z0: 1.55, z1: 4.65, h: 1.05 };
// ORDER 336 B — källardörren i norra långsidan (lokalens −z, rummets södra vägg) med trappan ned längs fasaden
// (D15 kvarterPlatser.js VENUES.kallaren: door x 5,2, w 1,1; stair x −0,6…3,8, xEnd 6,5, 2,7 m ned). Trappan ligger
// utanför murarna (rummets yttervägg vid z −5,205 och muren 0,45 m utanför den), 1,23 m bred som i D15.
const CELLAR_WALL_OUT = 5.205 + 0.45;
const CELLAR_DOOR: PlanDoor = {
  x0: 4.65, x1: 5.75,
  entrance: [5.2, -4.55], inward: [0, 1],
  waitingSpot: [-1.5, -CELLAR_WALL_OUT - 0.75],
  queue: [
    { id: 'queueIn1', side: 'inside', order: 1, local: [5.2, -4.4] },
    { id: 'queueIn2', side: 'inside', order: 2, local: [4.45, -4.3] },
    { id: 'queueOut1', side: 'outside', order: 3, local: [-1.5, -CELLAR_WALL_OUT - 0.45] },
    { id: 'queueOut2', side: 'outside', order: 4, local: [-2.4, -CELLAR_WALL_OUT - 0.45] },
    { id: 'queueOut3', side: 'outside', order: 5, local: [-3.3, -CELLAR_WALL_OUT - 0.45] },
    { id: 'queueOut4', side: 'outside', order: 6, local: [-4.2, -CELLAR_WALL_OUT - 0.45] },
    { id: 'queueOut5', side: 'outside', order: 7, local: [-5.1, -CELLAR_WALL_OUT - 0.45] }
  ],
  floorY: -2.7,
  stair: { x0: -0.6, x1: 3.8, xEnd: 6.5, z0: -CELLAR_WALL_OUT - 1.23, z1: -CELLAR_WALL_OUT },
  hostDesk: [6.3, 6.75, -4.95, -4.45],
  host: { at: [6.98, -4.7], facing: -Math.PI / 2 },
  approach: [[-1.5, -CELLAR_WALL_OUT - 0.6], [-0.6, -CELLAR_WALL_OUT - 0.6], [3.8, -CELLAR_WALL_OUT - 0.6], [5.2, -CELLAR_WALL_OUT - 0.6], [5.2, -5.205], [5.2, -4.55]]
};
function cellarSeats(): PlanSeat[] {
  const out: PlanSeat[] = [];
  for (const t of CELLAR_TABLES) chairsAlong(out, t.id, t, 5, ['s', 'n']);
  [2.0, 2.8, 3.6, 4.4].forEach((z, i) => out.push({ id: `cellarStool${i + 1}`, kind: 'stool', furnitureId: 'bar', local: [CELLAR_BAR.x0 - STOOL_FROM_COUNTER, z], facing: Math.PI / 2 }));
  return out;
}

export const CELLAR_PLAN: TablePlan = {
  id: 'kallaren',
  seats: cellarSeats(),
  tables: CELLAR_TABLES,
  bar: CELLAR_BAR,
  shelf: { x0: 6.82, x1: 7.0, z0: 2.5, z1: 4.65 },
  ledge: null,
  bartender: { at: [6.4, 3.1], facing: -Math.PI / 2 },
  sommelier: { at: [4.5, 1.15], facing: Math.PI / 2 },
  djAt: [6.5, -3.4],
  spots: { pickupBar: [4.75, 1.3], pourSpot: [6.4, 2.2], bottlePickup: [6.4, 4.2] },
  bottles: [[5.55, 2.0], [5.55, 2.3], [5.55, 3.9], [5.55, 4.2]],
  mise: { fridge: { local: [6.4, 4.2], facing: Math.PI / 2 }, polish: { local: [6.4, 2.6], facing: -Math.PI / 2 }, setTables: { local: [0.1, -1.7], facing: Math.PI } },
  // Mittgången (z 0) från dörren till köksdörren, gångarna längs väggarna bakom de yttre stolarna (z ±4,35) och
  // tvärgångarna vid radernas ändar (x −4,1 vid köket och passet, x 4,4 mellan borden och barpallarna).
  aisles: [
    [[-4.1, 0], [4.4, 0]],
    [[-4.1, 4.35], [4.4, 4.35]], [[-4.1, -4.35], [5.2, -4.35]], [[5.2, -4.35], [5.2, -4.55]],
    [[-4.1, -4.35], [-4.1, 4.35]], [[4.4, -4.35], [4.4, 4.35]],
    [[-4.1, 0.9], [KITCHEN_EXIT[0], KITCHEN_EXIT[1]]]
  ],
  runway: { x0: 5.97, x1: 6.82, z0: 1.3, z1: 4.65, exit: [[6.4, 1.2], [5.0, 0.6]] },
  door: CELLAR_DOOR
};

// ---------- Flygeln (36) ----------

const WING_TABLES: PlanTable[] = [
  { id: 'fourSW', at: [-2.4, -1.9], w: 1.2, d: 0.8 }, { id: 'fourS', at: [0.6, -1.9], w: 1.2, d: 0.8 }, { id: 'fourSE', at: [3.6, -1.9], w: 1.2, d: 0.8 },
  { id: 'fourNW', at: [-2.4, 1.3], w: 1.2, d: 0.8 }, { id: 'fourN', at: [0.6, 1.3], w: 1.2, d: 0.8 }, { id: 'fourNE', at: [3.6, 1.3], w: 1.2, d: 0.8 }
];
const WING_LEDGE = { x0: -5.9, x1: 5.9, z0: -4.95, z1: -4.6 };
const WING_BAR = { x0: -3.4, x1: 1.8, z0: 3.4, z1: 4.02, h: 1.05 };
function wingSeats(): PlanSeat[] {
  const out: PlanSeat[] = [];
  for (const t of WING_TABLES) chairsAlong(out, t.id, t, 2, ['s', 'n']);
  for (let i = 0; i < 12; i++) out.push({ id: `glassStool${i + 1}`, kind: 'stool', furnitureId: `ledge${Math.floor(i / 2) + 1}`, local: [-5.5 + i, WING_LEDGE.z1 + STOOL_FROM_COUNTER - 0.05], facing: Math.PI });
  return out;
}

export const WING_PLAN: TablePlan = {
  id: 'flygeln',
  seats: wingSeats(),
  tables: WING_TABLES,
  bar: WING_BAR,
  shelf: { x0: -3.4, x1: 1.8, z0: 4.72, z1: 4.95 },
  ledge: WING_LEDGE,
  bartender: { at: [-0.8, 4.37], facing: Math.PI },
  sommelier: { at: [2.35, 3.7], facing: -Math.PI / 2 },
  djAt: [6.5, -3.4],
  spots: { pickupBar: [2.3, 3.0], pourSpot: [-2.6, 4.37], bottlePickup: [1.0, 4.37] },
  bottles: [[-3.1, 3.6], [-2.8, 3.6], [1.2, 3.6], [1.5, 3.6]],
  mise: { fridge: { local: [1.0, 4.37], facing: 0 }, polish: { local: [-1.8, 4.37], facing: Math.PI }, setTables: { local: [0.6, -0.3], facing: Math.PI } },
  // Mittgången (z −0,3) mellan raderna, södra gången framför pallarna (z −3,4), norra framför baren (z 2,75),
  // och tvärgångarna mellan borden (x −0,9, 2,1) och i ändarna (x −4,1, 5,3).
  aisles: [
    // Från dörren längs z 0 (norr om värdpulten, wineBarHouse.ts hostDesk z −0,85…−0,25) till mittgången.
    [[-4.1, -0.3], [5.0, -0.3]], [[5.0, -0.3], [5.0, 0]], [[5.0, 0], [DOOR_X, 0]],
    [[-4.1, -3.4], [5.3, -3.4]], [[-4.1, 2.75], [5.3, 2.75]],
    [[-4.1, -3.4], [-4.1, 2.75]], [[5.3, -3.4], [5.3, 2.75]],
    [[-0.9, -3.4], [-0.9, 2.75]], [[2.1, -3.4], [2.1, 2.75]],
    [[-4.1, 0.9], [KITCHEN_EXIT[0], KITCHEN_EXIT[1]]]
  ],
  runway: { x0: -3.4, x1: 1.8, z0: 4.02, z1: 4.72, exit: [[2.35, 4.37], [2.35, 2.75]] }
};

// ---------- Salongen (35): runda bord med vit duk i hela rummet ----------
// ORDER 336 A (Anders 2026-10-22: "En salong med vinbarens bordsrader är ingen salong"): åtta runda bord för fyra med
// vit duk (D15 salongen t1–t8) och soffgruppen vid kakelugnen (tre). Vinbarens bar står kvar i östra änden, utan
// barpallar och utan DJ. Tre bord i vinbarens del (norr om baren och i sydöst) och fem väster om mellanväggen.
// Salongens västra del ligger i rummets lokala ram väster om x −7,4 (lokalens x − content/premises.ts offsetX).

/** Salongens västra del: kakelugnen, soffgruppen, mattan, det låga bordet och öppningen i mellanväggen. */
export const SALON = {
  opening: { z0: -1.4, z1: 1.4 },
  stove: [-20.69, 2.9] as Vec2,
  rug: { at: [-17.84, 2.2] as Vec2, w: 3.2, d: 2.6 },
  lowTable: { at: [-17.84, 2.2] as Vec2, w: 1.1, d: 0.6 },
  sofas: [{ id: 'sofaN', at: [-17.84, 3.45] as Vec2, facing: Math.PI }, { id: 'sofaS', at: [-17.84, 0.95] as Vec2, facing: 0 }],
  armchair: { at: [-16.34, 2.2] as Vec2, facing: -Math.PI / 2 },
  rounds: [[-2.0, 3.6], [1.6, 3.6], [4.6, -3.8], [-18.2, -2.9], [-14.6, -2.9], [-11.0, -2.9], [-12.6, 2.7], [-9.4, 2.7]] as Vec2[],
  roundW: 0.95
};

const SALON_TABLES: PlanTable[] = SALON.rounds.map((at, i) => ({ id: `round${i + 1}`, at, w: SALON.roundW, d: SALON.roundW, round: true, cloth: true }));
function salonSeats(): PlanSeat[] {
  const out: PlanSeat[] = [];
  SALON_TABLES.forEach((t) => {
    const r = SALON.roundW / 2 + CHAIR_FROM_EDGE, [x, z] = t.at;
    out.push({ id: t.id + 'n', kind: 'chair', furnitureId: t.id, local: [x, z + r], facing: Math.PI });
    out.push({ id: t.id + 's', kind: 'chair', furnitureId: t.id, local: [x, z - r], facing: 0 });
    out.push({ id: t.id + 'w', kind: 'chair', furnitureId: t.id, local: [x - r, z], facing: Math.PI / 2 });
    out.push({ id: t.id + 'e', kind: 'chair', furnitureId: t.id, local: [x + r, z], facing: -Math.PI / 2 });
  });
  SALON.sofas.forEach((x) => out.push({ id: x.id, kind: 'sofa', furnitureId: 'sofaGroup', local: [x.at[0], x.at[1]], facing: x.facing }));
  out.push({ id: 'armchair', kind: 'sofa', furnitureId: 'sofaGroup', local: [SALON.armchair.at[0], SALON.armchair.at[1]], facing: SALON.armchair.facing });
  return out;
}

export const SALON_PLAN: TablePlan = {
  id: 'salongen',
  seats: salonSeats(),
  tables: SALON_TABLES,
  // Vinbarens ö (wineBarHouse.ts LAYOUT.bar); personalen går ut genom öns öppna västra ände.
  bar: { x0: -3.4, x1: 1.8, z0: -2.2, z1: 1.4, h: 1.1 },
  shelf: null,
  winebarBar: true,
  ledge: null,
  bartender: { at: [-0.9, -1.11], facing: 0 },
  sommelier: { at: [0.9, 0.31], facing: Math.PI / 2 },
  djAt: [6.5, -3.4],
  spots: null,
  bottles: null,
  mise: {},
  aisles: [
    // Vinbarens del: dörren, ryggraden öster om ön, gångarna norr och söder om ön, korridoren väster om den.
    [[3.0, 0], [DOOR_X, 0]], [[3.0, -2.65], [3.0, 2.2]], [[-4.1, 2.2], [3.0, 2.2]], [[-4.1, -2.65], [5.6, -2.65]],
    [[-4.1, -2.65], [-4.1, 2.2]], [[-4.1, 0.9], [KITCHEN_EXIT[0], KITCHEN_EXIT[1]]],
    // Bakom de norra borden längs väggen, och runt bordet i sydöst.
    [[-3.1, 4.7], [3.0, 4.7]], [[-3.1, 2.2], [-3.1, 4.7]], [[-0.2, 2.2], [-0.2, 4.7]], [[3.0, 2.2], [3.0, 4.7]],
    [[5.6, -2.65], [5.6, -4.7]], [[5.6, -4.7], [3.6, -4.7]],
    // Genom öppningen i mellanväggen till salongens västra del.
    [[-4.1, 0], [-8.2, 0]], [[-8.2, 0], [-8.2, -0.2]],
    [[-8.2, -0.2], [-19.6, -0.2]],
    [[-19.6, -4.4], [-9.2, -4.4]], [[-19.6, -0.2], [-19.6, -4.4]], [[-16.4, -0.2], [-16.4, -4.4]], [[-12.8, -0.2], [-12.8, -4.4]], [[-9.2, -0.2], [-9.2, -4.4]],
    [[-19.6, 4.4], [-8.2, 4.4]], [[-15.4, -0.2], [-15.4, 4.4]], [[-11.0, -0.2], [-11.0, 4.4]], [[-8.2, -0.2], [-8.2, 4.4]]
  ],
  runway: { x0: -3.4, x1: 1.2, z0: -1.6, z1: 0.8, exit: [[-3.0, -0.4], [-4.1, -0.4]] }
};

// ---------- Vilken plan ----------

/** Planen för vinbaren i lokalen (null: vinbarens egen möblering vid Torget). */
export function planForPremises(p: PremisesId | null | undefined): TablePlan | null {
  return p === 'kallaren' ? CELLAR_PLAN : p === 'glashornet' ? WING_PLAN : p === 'salongen' ? SALON_PLAN : null;
}

/** Rummets möblering för vinbaren i lokalen (wineBarRoom.ts RoomLayout). */
export function layoutForPremises(p: PremisesId | null | undefined): 'winebar' | PlanLayout | 'salongen' {
  return p === 'kallaren' ? 'kallaren' : p === 'glashornet' ? 'flygeln' : p === 'salongen' ? 'salongen' : 'winebar';
}

export function planOf(layout: string | undefined): TablePlan | null {
  return layout === 'kallaren' ? CELLAR_PLAN : layout === 'flygeln' ? WING_PLAN : layout === 'salongen' ? SALON_PLAN : null;
}

// ---------- Simuleringens platser (strategic/simulation/service.ts) ----------

/** Sällskapens grupper: ett långbords sida (fem), ett bord, ett par pallar, baren, soffgruppen. seatIndex. */
export function planSeatGroups(seats: readonly PlanSeat[], offset = 0): number[][] {
  const by = new Map<string, number[]>();
  seats.forEach((s, i) => {
    const key = s.furnitureId.startsWith('long') ? s.furnitureId + s.id.charAt(s.furnitureId.length) : s.furnitureId;
    by.set(key, [...(by.get(key) ?? []), i + offset]);
  });
  return [...by.values()];
}

/** Ordningen platserna fylls i: borden och pallarna först, soffgruppen och baren sist (hålls för sällskap). */
export function planSeatPreference(seats: readonly PlanSeat[], offset = 0): number[] {
  const idx = (f: (s: PlanSeat) => boolean) => seats.map((s, i) => (f(s) ? i + offset : -1)).filter((i) => i >= 0);
  return [...idx((s) => s.kind === 'chair'), ...idx((s) => s.kind === 'stool' && s.furnitureId !== 'bar'), ...idx((s) => s.furnitureId === 'bar'), ...idx((s) => s.kind === 'sofa')];
}

// ---------- Gångarna ----------

function project(p: Vec2, s: Seg): { q: Vec2; d: number } {
  const [a, b] = s;
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L = dx * dx + dz * dz;
  const t = L > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)) : 0;
  const q: Vec2 = [a[0] + t * dx, a[1] + t * dz];
  return { q, d: Math.hypot(p[0] - q[0], p[1] - q[1]) };
}

export function onAisles(aisles: readonly Seg[], p: Vec2): Vec2 {
  let best: { q: Vec2; d: number } | null = null;
  for (const s of aisles) { const r = project(p, s); if (!best || r.d < best.d) best = r; }
  return best!.q;
}

const key = (p: Vec2) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;

/** Kortaste väg i gångarna mellan två punkter som ligger i dem (som bistroHouse.ts aisleRoute). */
export function aisleRoute(aisles: readonly Seg[], a: Vec2, b: Vec2): Vec2[] {
  const nodes = new Map<string, Vec2>();
  const add = (p: Vec2) => nodes.set(key(p), p);
  for (const s of aisles) { add(s[0]); add(s[1]); }
  // Korsningarna mellan gångarna: ändpunkter som ligger på en annan gång.
  for (const s of aisles) for (const t of aisles) for (const e of t) if (project(e, s).d < 1e-6) add(project(e, s).q);
  add(a); add(b);
  const all = [...nodes.values()];
  const adj = new Map<string, { to: Vec2; w: number }[]>();
  for (const s of aisles) {
    const pts = all.filter((p) => project(p, s).d < 1e-6).sort((u, v) => Math.hypot(u[0] - s[0][0], u[1] - s[0][1]) - Math.hypot(v[0] - s[0][0], v[1] - s[0][1]));
    for (let i = 1; i < pts.length; i++) {
      const w = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      adj.set(key(pts[i - 1]), [...(adj.get(key(pts[i - 1])) ?? []), { to: pts[i], w }]);
      adj.set(key(pts[i]), [...(adj.get(key(pts[i])) ?? []), { to: pts[i - 1], w }]);
    }
  }
  const dist = new Map<string, number>([[key(a), 0]]);
  const prev = new Map<string, Vec2>();
  const open = new Set<string>([key(a)]);
  while (open.size > 0) {
    let cur: string | null = null;
    for (const k of open) if (cur === null || (dist.get(k) ?? Infinity) < (dist.get(cur) ?? Infinity)) cur = k;
    open.delete(cur!);
    if (cur === key(b)) break;
    for (const e of adj.get(cur!) ?? []) {
      const nd = (dist.get(cur!) ?? Infinity) + e.w;
      if (nd < (dist.get(key(e.to)) ?? Infinity)) { dist.set(key(e.to), nd); prev.set(key(e.to), nodes.get(cur!)!); open.add(key(e.to)); }
    }
  }
  const path: Vec2[] = [b];
  let k = key(b);
  while (prev.has(k)) { const p = prev.get(k)!; path.unshift(p); k = key(p); }
  return path;
}

const dedupe = (p: Vec2[]) => p.filter((q, i) => i === 0 || Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) > 1e-4);
const inRect = (p: Vec2, r: Rect) => p[0] >= r.x0 - 0.05 && p[0] <= r.x1 + 0.05 && p[1] >= r.z0 - 0.05 && p[1] <= r.z1 + 0.05;
// Köket ligger mellan rummets västra vägg och halvväggen (salongens västra del väster om x −7,4 är inte köket).
function inKitchen(p: Vec2): boolean { return p[0] < KITCHEN.x1 && p[0] > -7.4 && p[1] > KITCHEN.z0; }

/** Från en punkt ut till planens gångar: köket genom köksdörren, gången bakom baren genom sin ände. */
function exitTo(plan: TablePlan, p: Vec2): Vec2[] {
  if (inKitchen(p)) return [[KITCHEN_EXIT[0], p[1]], KITCHEN_EXIT];
  if (inRect(p, plan.runway)) {
    const alongX = plan.runway.x1 - plan.runway.x0 > plan.runway.z1 - plan.runway.z0;
    const first: Vec2 = alongX ? [plan.runway.exit[0][0], p[1]] : [p[0], plan.runway.exit[0][1]];
    return [first, ...plan.runway.exit];
  }
  return [onAisles(plan.aisles, p)];
}

/** Personalens och gästernas väg mellan två punkter i planen: ut i gångarna, längs dem, in till målet. */
export function planRoute(plan: TablePlan, from: Vec2, to: Vec2): Vec2[] {
  const out = exitTo(plan, from), back = exitTo(plan, to).slice().reverse();
  const a = onAisles(plan.aisles, out[out.length - 1]), b = onAisles(plan.aisles, back[0]);
  return dedupe([from, ...out, a, ...aisleRoute(plan.aisles, a, b).slice(1, -1), b, ...back, to]);
}

/** Punkten bakom platsen (BEHIND_M bakom gästens rygg): dit leder gången, och därifrån serverar personalen. */
const BEHIND_M = 0.45;
export function behindSeat(seat: PlanSeat): Vec2 {
  return [seat.local[0] - Math.sin(seat.facing) * BEHIND_M, seat.local[1] - Math.cos(seat.facing) * BEHIND_M];
}

/** Gästens väg från entrén till platsen: längs gångarna till punkten bakom platsen, sist in till platsen. */
export function planWalkPath(plan: TablePlan, entrance: Vec2, seat: PlanSeat): Vec2[] {
  return dedupe([...planRoute(plan, entrance, behindSeat(seat)), seat.local]);
}

/** Varifrån personalen serverar ett sällskap: närmaste punkt i gångarna till bordet (pallarna vid baren: gången bakom). */
export interface PlanGroup { id: string; label: string; seats: string[]; serveAt: Vec2; serveFacing: number; tableAt: Vec2; kind: 'two' | 'bar' }
export function planGroups(plan: TablePlan): PlanGroup[] {
  const groups = planSeatGroups(plan.seats).map((idx) => idx.map((i) => plan.seats[i]));
  return groups.map((ss, i) => {
    const fid = ss[0].furnitureId;
    const t = plan.tables.find((x) => x.id === fid);
    const mid: Vec2 = [ss.reduce((a, s) => a + s.local[0], 0) / ss.length, ss.reduce((a, s) => a + s.local[1], 0) / ss.length];
    const at: Vec2 = t ? [mid[0], t.at[1]] : fid === 'bar' ? [(plan.bar.x0 + plan.bar.x1) / 2, mid[1]] : [mid[0], (plan.ledge ? (plan.ledge.z0 + plan.ledge.z1) / 2 : mid[1])];
    const serveAt: Vec2 = fid === 'bar' ? [plan.bartender.at[0], mid[1]] : serveBehind(plan.aisles, ss);
    return { id: fid + (fid.startsWith('long') ? ss[0].id.charAt(fid.length) : ''), label: fid === 'bar' ? 'Bar' : 'Bord ' + (i + 1), seats: ss.map((s) => s.id), serveAt, serveFacing: Math.atan2(at[0] - serveAt[0], at[1] - serveAt[1]), tableAt: at, kind: fid === 'bar' || fid.startsWith('ledge') ? 'bar' : 'two' };
  });
}

/** Var personalen står vid ett sällskap: långbordets sida och pallarna bakom mitten av platserna, ett bord med stolar
 *  runt om bakom den plats som ligger närmast en gång (aldrig mitt i bordet). */
function serveBehind(aisles: readonly Seg[], ss: readonly PlanSeat[]): Vec2 {
  const back = ss.map(behindSeat);
  const sameSide = ss.every((x) => Math.abs(x.facing - ss[0].facing) < 1e-6);
  if (sameSide) return [back.reduce((a, q) => a + q[0], 0) / back.length, back.reduce((a, q) => a + q[1], 0) / back.length];
  const d = (q: Vec2) => { const a = onAisles(aisles, q); return Math.hypot(a[0] - q[0], a[1] - q[1]); };
  return back.reduce((best, q) => (d(q) < d(best) ? q : best), back[0]);
}


// ---------- ORDER 336 B — höjden i trappan ----------

/** Markens höjd över rummets golv i en punkt (rummets lokala ram): 0 i rummet och på vilplanet, gatans höjd
 *  (−floorY) utanför, och nedför trappan däremellan. Utan egen dörr: 0. */
export function planGroundLift(plan: TablePlan | null, x: number, z: number): number {
  const d = plan?.door;
  if (!d) return 0;
  const st = d.stair, street = -d.floorY;
  if (z > st.z1 - 0.01) return 0;
  if (z >= st.z0 && x >= st.x0 && x <= st.xEnd) return x >= st.x1 ? 0 : street * (st.x1 - x) / (st.x1 - st.x0);
  return street;
}
