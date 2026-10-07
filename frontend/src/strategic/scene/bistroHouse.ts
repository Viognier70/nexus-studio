// ORDER 315b del 2 — Designs tillägg till D7 (nexus-leverans-2026-10-07-din-vag-tillagg/
// bistroRoom.ts): bistron inom husets mått, 14,47 × 10,05 m, med 31 platser. Rummets
// ram som wineBarHouse.ts: lokal +X mot dörren i östra väggen, lokal +Z norrut, origo i
// rummets mitt. BISTRO står oförändrad nedanför; platserna (SEATS), sällskapens grupper
// och ordningen platserna fylls i räknas ur den.
//
// Köket, förrådet, dörren och köplatserna är vinbarens (wineBarHouse.ts): ombyggnaden
// öppnar väggen mot köket till ett pass, kortar baren och flyttar den söderut, bygger
// bänken längs norra väggen och ställer borden i salen.

export type Vec2 = [number, number];

// ---------- Designs data (bistroRoom.ts), oförändrad ----------

export const BISTRO_ROOM = { w: 14.47, d: 10.05, wall: 0.2, door: { wall: 'east', z0: -0.6, z1: 0.6 }, kitchenWallX: -4.6 };

export const BISTRO = {
  shelf: { x0: -2.85, x1: -2.45, z0: -4.6, z1: -1.8 },
  bar: { x0: -2.125, x1: -1.375, z0: -4.4, z1: -1.8 },
  stools: [-2.2, -3.0, -3.8].map((z) => [-0.95, z] as Vec2),
  pass: { x0: -4.65, x1: -4.15, z0: -0.4, z1: 2.6, heatLamps: [2.1, 1.1, 0.1] },
  kitchen: { range: { x0: -6.9, x1: -6.0, z0: -0.2, z1: 2.4 }, prep: { x0: -5.6, x1: -5.0, z0: 0.0, z1: 2.2 }, door: { z0: -4.425, z1: -3.425 } },
  banquette: { x0: -1.4, x1: 5.6, z0: 4.375, z1: 4.825 },
  banquetteTables: [-0.5, 1.1, 2.7, 4.3].map((x) => ({ at: [x, 3.85] as Vec2, w: 0.7, d: 0.6, seats: 2 })),
  fourTops: [[0.6, 1.25], [3.3, 1.25], [2.1, -2.0]].map((p) => ({ at: p as Vec2, w: 1.0, d: 1.0, seats: 4 })),
  twoTops: [[5.9, 1.25], [1.0, -4.1], [3.0, -4.1], [5.0, -4.1]].map((p) => ({ at: p as Vec2, w: 0.7, d: 0.7, seats: 2 })),
  hostDesk: [6.4, -1.3] as Vec2,
  /** Väntplatsen innanför dörren, två platser. Kön utanför är VENUE_OUTSIDE (kartkontrollen). */
  waitInside: [[5.6, -2.3], [6.3, -2.3]] as Vec2[]
};

export function bistroSeats(): number {
  return BISTRO.banquetteTables.length * 2 + BISTRO.fourTops.length * 4 + BISTRO.twoTops.length * 2 + BISTRO.stools.length; // 31
}

// ---------- Platserna (Code) ----------
//
// facing som wineBarHouse.ts: vinkeln θ tittar mot (sin θ, cos θ) i (x, z); π tittar söderut (−z).
// Stolens mitt står STOOL_FROM_TABLE från bordets kant (vinbarens tvåor: 0,55 m från mitten
// av ett 0,7 m bord, alltså 0,2 m från kanten). Bänkens sits står mitt på bänken.

const CHAIR_FROM_EDGE = 0.2;
// Bänkens sits 0,27 m från väggens insida (husets inZ 4,825), så att en sittande gäst inte står i väggen.
const BENCH_Z = 4.55;

export type BistroSeatKind = 'chair' | 'bench' | 'stool';
export interface BistroSeat { id: string; kind: BistroSeatKind; furnitureId: string; local: Vec2; facing: number }

function seatList(): BistroSeat[] {
  const out: BistroSeat[] = [];
  BISTRO.banquetteTables.forEach((t, i) => {
    const id = 'bench' + (i + 1);
    out.push({ id: id + 'a', kind: 'bench', furnitureId: id, local: [t.at[0], BENCH_Z], facing: Math.PI });
    out.push({ id: id + 'b', kind: 'chair', furnitureId: id, local: [t.at[0], t.at[1] - t.d / 2 - CHAIR_FROM_EDGE], facing: 0 });
  });
  BISTRO.fourTops.forEach((t, i) => {
    const id = 'four' + (i + 1);
    const r = t.w / 2 + CHAIR_FROM_EDGE;
    out.push({ id: id + 'n', kind: 'chair', furnitureId: id, local: [t.at[0], t.at[1] + r], facing: Math.PI });
    out.push({ id: id + 's', kind: 'chair', furnitureId: id, local: [t.at[0], t.at[1] - r], facing: 0 });
    out.push({ id: id + 'w', kind: 'chair', furnitureId: id, local: [t.at[0] - r, t.at[1]], facing: Math.PI / 2 });
    out.push({ id: id + 'e', kind: 'chair', furnitureId: id, local: [t.at[0] + r, t.at[1]], facing: -Math.PI / 2 });
  });
  BISTRO.twoTops.forEach((t, i) => {
    const id = 'two' + (i + 1);
    const r = t.w / 2 + CHAIR_FROM_EDGE;
    out.push({ id: id + 'w', kind: 'chair', furnitureId: id, local: [t.at[0] - r, t.at[1]], facing: Math.PI / 2 });
    out.push({ id: id + 'e', kind: 'chair', furnitureId: id, local: [t.at[0] + r, t.at[1]], facing: -Math.PI / 2 });
  });
  BISTRO.stools.forEach((p, i) => out.push({ id: 'stool' + (i + 1), kind: 'stool', furnitureId: 'bar', local: [p[0], p[1]], facing: -Math.PI / 2 }));
  return out;
}

/** Platserna i seatIndex-ordning: bänkborden 0–7, fyrorna 8–19, tvåorna 20–27, barstolarna 28–30. */
export const BISTRO_SEATS: readonly BistroSeat[] = seatList();
export const BISTRO_CAPACITY = BISTRO_SEATS.length;

/** Sällskapens grupper: ett bord (eller baren) per grupp, seatIndex. */
export const BISTRO_SEAT_GROUPS: readonly (readonly number[])[] = (() => {
  const byFurniture = new Map<string, number[]>();
  BISTRO_SEATS.forEach((s, i) => byFurniture.set(s.furnitureId, [...(byFurniture.get(s.furnitureId) ?? []), i]));
  return [...byFurniture.values()];
})();

/**
 * Ordningen platserna fylls i: tvåorna och bänkborden först, sedan baren,
 * fyrorna sist så att de hålls lediga för sällskap (som vinbarens loungerna).
 */
export const BISTRO_SEAT_PREFERENCE: readonly number[] = [
  ...BISTRO_SEATS.map((s, i) => (s.furnitureId.startsWith('two') ? i : -1)),
  ...BISTRO_SEATS.map((s, i) => (s.furnitureId.startsWith('bench') ? i : -1)),
  ...BISTRO_SEATS.map((s, i) => (s.kind === 'stool' ? i : -1)),
  ...BISTRO_SEATS.map((s, i) => (s.furnitureId.startsWith('four') ? i : -1))
].filter((i) => i >= 0);

// ---------- Hyllan bakom baren (Code) ----------
//
// Designs hylla (x −2,85 … −2,45) lämnar 0,325 m bakom baren (x −2,125); personalens figur är
// 0,40 m bred (figureRig.ts FIGURE.staffShoulderWidth). Hyllan står 0,1 m längre västerut.
export const BISTRO_SHELF = { x0: BISTRO.shelf.x0 - 0.1, x1: BISTRO.shelf.x1 - 0.1, z0: BISTRO.shelf.z0, z1: BISTRO.shelf.z1 };
/** Mitt i gången bakom baren. */
export const BISTRO_RUNWAY_X = (BISTRO_SHELF.x1 + BISTRO.bar.x0) / 2;

// ---------- Gångarna (Code) ----------
//
// Mittgången från dörren går västerut längs z 0,05 (fritt mellan fyrornas stolar i norr,
// 0,33, och söder, −1,08, och 0,2 m från värdpulten). Norra gången (z 2,6) går mellan
// fyrornas norra stolar och bänkborden, södra (z −3,35) mellan fyran i söder och tvåorna.
// Tre gångar binder ihop dem i glappen mellan borden: x −0,75, 1,95 och 4,7 norrut, x 0,2
// och 4,2 söderut. En väg går längs gångarna och sist rakt till platsen.

export const AISLE = { mainZ: 0.05, northZ: 2.6, southZ: -3.35, northX: [-0.75, 1.95, 4.7], southX: [0.2, 4.2], westX: -4.1, eastX: 5.6 };

type Seg = [Vec2, Vec2];
function segments(): Seg[] {
  const a = AISLE;
  const out: Seg[] = [];
  const doorX = 6.485;
  out.push([[a.westX, a.mainZ], [doorX, a.mainZ]]);
  out.push([[a.northX[0], a.northZ], [a.eastX - 0.4, a.northZ]]);
  out.push([[a.southX[0], a.southZ], [a.eastX, a.southZ]]);
  for (const x of a.northX) out.push([[x, a.mainZ], [x, a.northZ]]);
  for (const x of a.southX) out.push([[x, a.mainZ], [x, a.southZ]]);
  return out;
}
export const AISLE_SEGMENTS: readonly Seg[] = segments();

function project(p: Vec2, s: Seg): { q: Vec2; d: number } {
  const [a, b] = s;
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L = dx * dx + dz * dz;
  const t = L > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)) : 0;
  const q: Vec2 = [a[0] + t * dx, a[1] + t * dz];
  return { q, d: Math.hypot(p[0] - q[0], p[1] - q[1]) };
}

/** Närmaste punkt i gångarna. */
export function onAisle(p: Vec2): Vec2 {
  let best: { q: Vec2; d: number } | null = null;
  for (const s of AISLE_SEGMENTS) { const r = project(p, s); if (!best || r.d < best.d) best = r; }
  return best!.q;
}

const key = (p: Vec2) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;

/** Väg i gångarna mellan två punkter som ligger i dem (korsningarna som noder). */
function aisleRoute(a: Vec2, b: Vec2): Vec2[] {
  // Noderna: gångarnas ändar och korsningar, och a och b.
  const nodes = new Map<string, Vec2>();
  const add = (p: Vec2) => nodes.set(key(p), p);
  for (const s of AISLE_SEGMENTS) { add(s[0]); add(s[1]); }
  add(a); add(b);
  const all = [...nodes.values()];
  const onSeg = (p: Vec2, s: Seg) => project(p, s).d < 1e-6;
  const adj = new Map<string, { to: Vec2; w: number }[]>();
  for (const s of AISLE_SEGMENTS) {
    const pts = all.filter((p) => onSeg(p, s)).sort((u, v) => Math.hypot(u[0] - s[0][0], u[1] - s[0][1]) - Math.hypot(v[0] - s[0][0], v[1] - s[0][1]));
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

function dedupe(p: Vec2[]): Vec2[] {
  return p.filter((q, i) => i === 0 || Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) > 1e-4);
}

// Köket och gången bakom baren har var sin utgång till mittgången: köksdörren i kökets södra
// halvvägg (som vinbarens STAFF_PATH_KITCHEN_TO_BAR, x −5,1) och barens norra ände.
const KITCHEN_EXIT: Vec2[] = [[-5.1, 0.9]];
const KITCHEN = { x1: -4.6, z0: 1.4 };
function inKitchen(p: Vec2): boolean { return p[0] < KITCHEN.x1 && p[1] > KITCHEN.z0; }
function inRunway(p: Vec2): boolean { return p[0] > BISTRO_SHELF.x1 && p[0] < BISTRO.bar.x0 && p[1] >= BISTRO.bar.z0 - 0.3 && p[1] <= BISTRO.bar.z1; }

/** Från en punkt ut till gångarna: köket genom köksdörren, baren norrut längs gången bakom den. */
function exitTo(p: Vec2): Vec2[] {
  if (inKitchen(p)) return [[KITCHEN_EXIT[0][0], p[1]], ...KITCHEN_EXIT, onAisle(KITCHEN_EXIT[0])];
  if (inRunway(p)) return [[BISTRO_RUNWAY_X, p[1]], [BISTRO_RUNWAY_X, AISLE.mainZ]];
  return [onAisle(p)];
}

/** Personalens och gästernas väg mellan två punkter i bistron: ut i närmaste gång, längs gångarna, in till målet. */
export function bistroRoute(from: Vec2, to: Vec2): Vec2[] {
  const out = exitTo(from), back = exitTo(to).slice().reverse();
  const a = out[out.length - 1], b = back[0];
  return dedupe([from, ...out, ...aisleRoute(a, b).slice(1, -1), ...back, to]);
}

/** Sista biten in till platsen från gången (bänken bakom bordet, barstolarna bakom fyran). */
export function seatAccess(seat: BistroSeat): Vec2[] {
  const [x, z] = seat.local;
  if (seat.kind === 'bench') {
    // Genom glappet öster om bordet, längs bänken till platsen.
    const gx = x + 0.8;
    return [[gx, AISLE.northZ], [gx, BENCH_Z - 0.1], [x, BENCH_Z]];
  }
  if (seat.kind === 'stool') {
    // Ned längs gången x 0,2 till södra gången, väster om fyran och tvåorna, in till pallen.
    const lane = Math.max(AISLE.southZ, Math.min(AISLE.mainZ, z));
    const side = -0.45;
    return [[AISLE.southX[0], lane], [side, lane], [side, z], [x, z]];
  }
  // Stolarna: rakt från gången bredvid.
  const ax = onAisle([x, z]);
  return [ax, [x, z]];
}

/** Gästens väg från entrén till platsen (rummets lokala XZ). */
export function bistroWalkPath(entrance: Vec2, seat: BistroSeat): Vec2[] {
  const access = seatAccess(seat);
  return dedupe([entrance, ...bistroRoute(entrance, access[0]).slice(1), ...access.slice(1)]);
}

// ---------- Sällskapen (serviceFlow.ts groupsFor) ----------

export interface BistroGroup { id: string; label: string; seats: string[]; serveAt: Vec2; serveFacing: number; tableAt: Vec2; kind: 'two' | 'bar' }

/** Ett sällskap per bord: personalen serverar från närmaste punkt i gångarna. */
export function bistroGroups(): BistroGroup[] {
  const by = new Map<string, BistroSeat[]>();
  for (const s of BISTRO_SEATS) by.set(s.furnitureId, [...(by.get(s.furnitureId) ?? []), s]);
  const tableOf = (fid: string): Vec2 => {
    const n = Number(fid.replace(/\D/g, '')) - 1;
    if (fid.startsWith('bench')) return BISTRO.banquetteTables[n].at;
    if (fid.startsWith('four')) return BISTRO.fourTops[n].at;
    if (fid.startsWith('two')) return BISTRO.twoTops[n].at;
    return [(BISTRO.bar.x0 + BISTRO.bar.x1) / 2, (BISTRO.bar.z0 + BISTRO.bar.z1) / 2];
  };
  return [...by.entries()].map(([fid, seats], i) => {
    const at = tableOf(fid);
    const serveAt = fid === 'bar' ? [BISTRO_RUNWAY_X, at[1]] as Vec2 : onAisle(at);
    return {
      id: fid, label: fid === 'bar' ? 'Bar' : 'Bord ' + (i + 1), seats: seats.map((s) => s.id),
      serveAt, serveFacing: Math.atan2(at[0] - serveAt[0], at[1] - serveAt[1]), tableAt: at, kind: fid === 'bar' ? 'bar' : 'two'
    };
  });
}
