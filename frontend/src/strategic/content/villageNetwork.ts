// ORDER 288 — byns gatunät för gästerna, bilarna och bussen.
//
// Designs prototyp (Byn och gasterna.html) har ett eget nät med tjugo noder
// på en duk och kortaste vägen med BFS. Här byggs nätet ur byns riktiga
// gator (WORLD.roads, samma OSM-data som Roads ritar): varje vägs punkter är
// noder, grannpunkter är kanter, och punkter som ligger på samma halvmeter
// slås ihop så att korsningarna hänger ihop. Gående går på ritade gångvägar
// och trottoarer (ORDER 312b, walkNetwork); bilarna och bussen på den ritade
// körbanan för bilar (ORDER 312, driveNetwork). Kortaste
// vägen räknas med Dijkstra och sparas.

import { WORLD } from './world';
import { EDGE_WALK_M, carriagewayWaysAt, onWalkSurface, roadRenderPieces, segmentOnCarCarriageway } from './roadSurface';

type Vec2 = [number, number];

export interface RoadGraph {
  nodes: Vec2[];
  adj: Array<Array<{ to: number; d: number }>>;
  // Noderna i den största sammanhängande delen (dit vägar kan hittas).
  main: Uint8Array;
}

const SNAP = 0.5;

function build(
  filter: (r: (typeof WORLD.roads)[number]) => boolean,
  edgeOk: (a: Vec2, b: Vec2) => boolean = () => true
): RoadGraph {
  const lines = WORLD.roads.filter((r) => filter(r) && r.poly.length >= 2).map((r) => r.poly as Vec2[]);
  return buildFrom(lines, (a, b) => edgeOk(a, b));
}

function buildFrom(lines: Vec2[][], edgeOk: (a: Vec2, b: Vec2, line: number, k: number) => boolean): RoadGraph {
  const index = new Map<string, number>();
  const nodes: Vec2[] = [];
  const adj: Array<Array<{ to: number; d: number }>> = [];
  const nodeFor = (p: Vec2): number => {
    const key = `${Math.round(p[0] / SNAP)}:${Math.round(p[1] / SNAP)}`;
    let i = index.get(key);
    if (i === undefined) {
      i = nodes.length;
      index.set(key, i);
      nodes.push([p[0], p[1]]);
      adj.push([]);
    }
    return i;
  };
  lines.forEach((poly, li) => {
    if (poly.length < 2) return;
    let prev = nodeFor(poly[0]);
    for (let k = 1; k < poly.length; k++) {
      const cur = nodeFor(poly[k]);
      if (cur !== prev && edgeOk(nodes[prev], nodes[cur], li, k)) {
        const d = Math.hypot(nodes[cur][0] - nodes[prev][0], nodes[cur][1] - nodes[prev][1]);
        adj[prev].push({ to: cur, d });
        adj[cur].push({ to: prev, d });
      }
      prev = cur;
    }
  });
  // Största sammanhängande delen.
  const comp = new Int32Array(nodes.length).fill(-1);
  const sizes: number[] = [];
  for (let s = 0; s < nodes.length; s++) {
    if (comp[s] >= 0) continue;
    const c = sizes.length;
    let n = 0;
    const stack = [s];
    comp[s] = c;
    while (stack.length) {
      const x = stack.pop()!;
      n++;
      for (const e of adj[x]) if (comp[e.to] < 0) { comp[e.to] = c; stack.push(e.to); }
    }
    sizes.push(n);
  }
  const biggest = sizes.indexOf(Math.max(...sizes));
  const main = new Uint8Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) main[i] = comp[i] === biggest ? 1 : 0;
  return { nodes, adj, main };
}

let walkGraph: RoadGraph | null = null;
let driveGraph: RoadGraph | null = null;

// ORDER 312b (Anders 2026-10-06) — folk till fots går bara på ritade
// gångytor och trottoarer, på samma sätt som bilarna. Gångnätet byggs ur
// vägbitarna som OsmRoads ritar (content/roadSurface.ts roadRenderPieces),
// inte ur OSM-linjerna:
//   - gång-, cykel- och skogsvägar (ped) går man på, mitt på vägen;
//   - bilgator med ritad trottoar går man längs, mitt på trottoaren
//     (halva körbanan plus halva trottoaren från mittlinjen);
//   - bilgator utan ritad trottoar går man längs i körbanans kant
//     (roadSurface.ts EDGE_WALK_M), aldrig mitt i gatan;
//   - bitarna OsmRoads klippt bort vid husen ingår inte.
// Linjerna delas i bitar på högst WALK_STEP_M, så att bytet mellan
// gångvägens mitt och trottoaren sker på den sista biten före korsningen.
// En kant finns bara om gångplatsen på båda sidor ligger på gångytan
// (onWalkSurface) längs hela kanten; i korsningarna (noder där flera vägar
// möts eller avståndet byts) går man över gatan.
const WALK_STEP_M = 2;
let walkOffset: Map<string, number> | null = null;

const keyOf = (p: Vec2): string => `${Math.round(p[0] / SNAP)}:${Math.round(p[1] / SNAP)}`;

function densify(poly: Vec2[], step: number): Vec2[] {
  const out: Vec2[] = [poly[0]];
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** Övergångens marginal utanför gångplatsen i en korsning, meter. */
export const CROSSING_MARGIN_M = 1.5;

/** En korsning i gångnätet: där två eller fler ritade vägbitar möts. */
export interface WalkCrossing { p: Vec2; r: number }

let crossings: WalkCrossing[] | null = null;
let crossingGrid: Map<string, WalkCrossing[]> | null = null;
const CROSS_CELL_M = 16;

/** Ligger punkten i en korsning, där man går över gatan? */
export function inWalkCrossing(x: number, z: number): boolean {
  if (!crossingGrid) walkNetwork();
  const ix = Math.floor(x / CROSS_CELL_M);
  const iz = Math.floor(z / CROSS_CELL_M);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    for (const c of crossingGrid!.get(`${ix + dx}:${iz + dz}`) ?? []) if (Math.hypot(c.p[0] - x, c.p[1] - z) <= c.r) return true;
  }
  return false;
}

/** Korsningarna i gångnätet (byggs med det). */
export function walkCrossings(): readonly WalkCrossing[] {
  if (!crossings) walkNetwork();
  return crossings!;
}

/**
 * Var en gående står: på gångytan ('walk'), i en övergång ('crossing') eller
 * där ingen får gå (null). `ways` är OSM-vägarna man går längs. En övergång
 * är en korsning (inWalkCrossing) eller en annan vägs körbana, som man går
 * över där den möter ens egen; den egna gatans körbana, gräs och gårdar är
 * inte gångyta.
 */
export function walkPlace(x: number, z: number, ways: ReadonlySet<string>): 'walk' | 'crossing' | null {
  if (onWalkSurface(x, z)) return 'walk';
  if (inWalkCrossing(x, z)) return 'crossing';
  const cw = carriagewayWaysAt(x, z);
  if (cw.size > 0 && [...cw].every((w) => !ways.has(w))) return 'crossing';
  return null;
}

/** Gångplatsen på var sida om mittlinjens kant a→b, `off` meter ut, i provpunkter. */
function walkEdgeOnSurface(a: Vec2, b: Vec2, off: number, way: string): boolean {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L === 0) return true;
  const nx = (b[1] - a[1]) / L;
  const nz = -(b[0] - a[0]) / L;
  const n = Math.max(1, Math.ceil(L / 0.5));
  const ways = new Set([way]);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    for (const side of off > 0 ? [1, -1] : [0]) {
      if (!walkPlace(x + nx * off * side, z + nz * off * side, ways)) return false;
    }
  }
  return true;
}

/** Avståndet från punkten till polylinjen, meter. */
function distToPoly(poly: readonly Vec2[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const [ax, az] = poly[i - 1];
    const [bx, bz] = poly[i];
    const dx = bx - ax;
    const dz = bz - az;
    const L2 = dx * dx + dz * dz;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return best;
}

function buildWalk(): RoadGraph {
  // Gångplatsens avstånd per ritad bit, grupperat per OSM-väg.
  const byWay = new Map<string, Array<{ poly: Vec2[]; off: number | null; reach: number }>>();
  for (const piece of roadRenderPieces()) {
    const off = piece.ped ? 0 : piece.sidewalk > 0 ? piece.half + piece.sidewalk / 2 : Math.max(0, piece.half - EDGE_WALK_M / 2);
    const list = byWay.get(piece.wayId);
    const item = { poly: piece.poly as Vec2[], off, reach: piece.half + piece.sidewalk };
    if (list) list.push(item); else byWay.set(piece.wayId, [item]);
  }
  // Varje OSM-vägs linje, delad i bitar på högst WALK_STEP_M; varje kant får
  // avståndet ur den ritade bit den ligger på (null: ingen gångplats).
  const lines: Vec2[][] = [];
  const lineWay: string[] = [];
  const edgeOff: Array<Array<number | null>> = [];
  const touch = new Map<string, { p: Vec2; roads: Set<string>; off: number; reach: number }>();
  for (const road of WORLD.roads) {
    if (road.poly.length < 2) continue;
    const drawn = byWay.get(road.id.split('#')[0]) ?? [];
    const poly = densify(road.poly as Vec2[], WALK_STEP_M);
    const offs: Array<number | null> = [];
    for (let i = 1; i < poly.length; i++) {
      const mx = (poly[i - 1][0] + poly[i][0]) / 2;
      const mz = (poly[i - 1][1] + poly[i][1]) / 2;
      const hit = drawn.find((d) => distToPoly(d.poly, mx, mz) < 0.05);
      offs.push(hit ? hit.off : null);
    }
    lines.push(poly);
    lineWay.push(road.id.split('#')[0]);
    edgeOff.push(offs);
    const roadOff = Math.max(0, ...offs.map((o) => o ?? 0));
    const roadReach = Math.max(0, ...drawn.map((d) => d.reach));
    for (const p of road.poly as Vec2[]) {
      const k = keyOf(p);
      const t = touch.get(k);
      if (t) { t.roads.add(road.id); t.off = Math.max(t.off, roadOff); t.reach = Math.max(t.reach, roadReach); } else touch.set(k, { p, roads: new Set([road.id]), off: roadOff, reach: roadReach });
    }
  }
  // Korsningarna: punkter (på halvmetern) där två eller fler vägar möts. I
  // korsningen går man över tvärgatan; gångplatsen vänder runt hörnet längs
  // mittlinjens nod, så övergången räknas ut till gångplatsens avstånd plus
  // den bredaste remsan (körbana och trottoar) plus marginalen.
  crossings = [...touch.values()].filter((t) => t.roads.size >= 2).map((t) => ({ p: t.p, r: t.off + t.reach + CROSSING_MARGIN_M }));
  crossingGrid = new Map();
  for (const c of crossings) {
    const key = `${Math.floor(c.p[0] / CROSS_CELL_M)}:${Math.floor(c.p[1] / CROSS_CELL_M)}`;
    const list = crossingGrid.get(key);
    if (list) list.push(c); else crossingGrid.set(key, [c]);
  }
  const offsets = new Map<string, number>();
  const g = buildFrom(lines, (a, b, li, k) => {
    const off = edgeOff[li][k - 1];
    if (off === null || !walkEdgeOnSurface(a, b, off, lineWay[li])) return false;
    for (const p of [a, b]) offsets.set(keyOf(p), Math.max(offsets.get(keyOf(p)) ?? 0, off));
    return true;
  });
  walkOffset = offsets;
  return g;
}

export function walkNetwork(): RoadGraph {
  if (!walkGraph) walkGraph = buildWalk();
  return walkGraph;
}

// ORDER 312 — bilarna och bussen kör bara där körbanan är ritad. OsmRoads
// klipper vägen där remsan skulle gå in i ett hus (ORDER 158); en kant i
// bilnätet som inte ligger helt på den ritade körbanan för bilar
// (content/roadSurface.ts) tas bort. Annars körde byns bilar 9–44 m över
// gräs och gårdar där vägen var bortklippt.
export function driveNetwork(): RoadGraph {
  return (driveGraph ??= build((r) => r.car && r.kind !== 'track', (a, b) => segmentOnCarCarriageway(a, b)));
}

export function nearestNode(g: RoadGraph, x: number, z: number): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < g.nodes.length; i++) {
    if (!g.main[i]) continue;
    const d = (g.nodes[i][0] - x) ** 2 + (g.nodes[i][1] - z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

const cache = new WeakMap<RoadGraph, Map<string, Vec2[]>>();

// Kortaste vägen mellan två noder som punkter (Dijkstra med en enkel hög).
export function routeBetween(g: RoadGraph, from: number, to: number): Vec2[] {
  let byGraph = cache.get(g);
  if (!byGraph) { byGraph = new Map(); cache.set(g, byGraph); }
  const key = `${from}>${to}`;
  const hit = byGraph.get(key);
  if (hit) return hit;
  const n = g.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: Array<[number, number]> = [[0, from]];
  dist[from] = 0;
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, x] = pop();
    if (x === to) break;
    if (d > dist[x]) continue;
    for (const e of g.adj[x]) {
      const nd = d + e.d;
      if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = x; push([nd, e.to]); }
    }
  }
  const out: Vec2[] = [];
  if (from !== to && prev[to] < 0) {
    out.push(g.nodes[from], g.nodes[to]);
  } else {
    for (let x = to; x >= 0; x = x === from ? -1 : prev[x]) out.unshift(g.nodes[x]);
  }
  byGraph.set(key, out);
  return out;
}

export function routeLength(pts: Vec2[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

// Punkten och riktningen efter `s` meter längs vägen.
export function pointAlong(pts: Vec2[], s: number): { x: number; z: number; heading: number; done: boolean } {
  let left = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const seg = Math.hypot(bx - ax, bz - az);
    if (left <= seg || i === pts.length - 1) {
      const t = seg > 0 ? Math.min(1, left / seg) : 1;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, heading: Math.atan2(bx - ax, bz - az), done: left >= seg && i === pts.length - 1 };
    }
    left -= seg;
  }
  const p = pts[pts.length - 1] ?? [0, 0];
  return { x: p[0], z: p[1], heading: 0, done: true };
}

// ORDER 302 (Anders 2026-10-04: "Båda trottoarerna används, och ingen går mitt
// i gatan") — hur långt från vägens mittlinje gångplatsen ligger vid varje
// punkt i en rutt. ORDER 312b: avståndet kommer ur gångnätets bygge (mitten
// av den ritade trottoaren, halva körbanan plus halva trottoaren ur
// ROLE_SPECS); på gång-, cykel- och skogsvägar 0. Där flera vägar möts gäller
// den bredaste.

/** Gångplatsens avstånd från mittlinjen vid varje punkt i rutten (meter). */
export function sidewalkOffsets(route: Vec2[]): number[] {
  if (!walkOffset) walkNetwork();
  const m = walkOffset!;
  return route.map((p) => m.get(keyOf(p)) ?? 0);
}

/** Punkten längs rutten med segmentet och andelen (för trottoarens avstånd). */
export function pointAlongSeg(pts: Vec2[], s: number): { x: number; z: number; heading: number; seg: number; t: number } {
  let left = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const seg = Math.hypot(bx - ax, bz - az);
    if (left <= seg || i === pts.length - 1) {
      const t = seg > 0 ? Math.min(1, left / seg) : 1;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, heading: Math.atan2(bx - ax, bz - az), seg: i - 1, t };
    }
    left -= seg;
  }
  const p = pts[pts.length - 1] ?? [0, 0];
  return { x: p[0], z: p[1], heading: 0, seg: Math.max(0, pts.length - 2), t: 1 };
}

/**
 * Var en gående står efter `s` meter längs rutten: mittlinjens punkt,
 * `side` (±1) gånger gångplatsens avstånd (offsets, interpolerat längs
 * biten) åt sidan. VillageLife ritar sällskapen här; testet
 * order312bTillFots läser samma funktion.
 */
export function walkerPoint(route: Vec2[], offsets: number[] | undefined, s: number, side: number): { x: number; z: number; heading: number } {
  const a = pointAlongSeg(route, s);
  const off = offsets ? offsets[a.seg] * (1 - a.t) + (offsets[a.seg + 1] ?? offsets[a.seg]) * a.t : 0;
  return { x: a.x + Math.cos(a.heading) * off * side, z: a.z - Math.sin(a.heading) * off * side, heading: a.heading };
}
