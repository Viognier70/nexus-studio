// ORDER 288 — byns gatunät för gästerna, bilarna och bussen.
//
// Designs prototyp (Byn och gasterna.html) har ett eget nät med tjugo noder
// på en duk och kortaste vägen med BFS. Här byggs nätet ur byns riktiga
// gator (WORLD.roads, samma OSM-data som Roads ritar): varje vägs punkter är
// noder, grannpunkter är kanter, och punkter som ligger på samma halvmeter
// slås ihop så att korsningarna hänger ihop. Gående går på alla gator (en
// sammanhängande del); bilarna och bussen på vägarna för bilar. Kortaste
// vägen räknas med Dijkstra och sparas.

import { WORLD } from './world';

type Vec2 = [number, number];

export interface RoadGraph {
  nodes: Vec2[];
  adj: Array<Array<{ to: number; d: number }>>;
  // Noderna i den största sammanhängande delen (dit vägar kan hittas).
  main: Uint8Array;
}

const SNAP = 0.5;

function build(filter: (r: (typeof WORLD.roads)[number]) => boolean): RoadGraph {
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
  for (const road of WORLD.roads) {
    if (!filter(road) || road.poly.length < 2) continue;
    let prev = nodeFor(road.poly[0] as Vec2);
    for (let k = 1; k < road.poly.length; k++) {
      const cur = nodeFor(road.poly[k] as Vec2);
      if (cur !== prev) {
        const d = Math.hypot(nodes[cur][0] - nodes[prev][0], nodes[cur][1] - nodes[prev][1]);
        adj[prev].push({ to: cur, d });
        adj[cur].push({ to: prev, d });
      }
      prev = cur;
    }
  }
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

export function walkNetwork(): RoadGraph {
  return (walkGraph ??= build(() => true));
}

export function driveNetwork(): RoadGraph {
  return (driveGraph ??= build((r) => r.car && r.kind !== 'track'));
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
// i gatan") — hur långt från vägens mittlinje trottoaren ligger vid varje punkt
// i en rutt: halva gatans bredd plus kantstenen. På gångvägar och stigar (inte
// bilväg) går man på vägen själv (0). Bredden som byns lyktor och Designs
// prototyp läser (StreetLamps.tsx ROAD_W, OSM-taggen när den finns, högst 8 m).
const KERB_M = 0.8;
const ROAD_HALF: Record<string, number> = { secondary: 3.5, tertiary: 3, unclassified: 2.5, residential: 2.5, living_street: 2.3, service: 1.7, track: 1.5 };
let sidewalkIndex: Map<string, number> | null = null;
function sidewalkMap(): Map<string, number> {
  if (sidewalkIndex) return sidewalkIndex;
  const m = new Map<string, number>();
  for (const road of WORLD.roads) {
    const half = road.car ? (road.width ? Math.min(road.width, 8) / 2 : ROAD_HALF[road.kind] ?? 0) : 0;
    const off = half > 0 ? half + KERB_M : 0;
    for (const p of road.poly) {
      const key = `${Math.round(p[0] / SNAP)}:${Math.round(p[1] / SNAP)}`;
      m.set(key, Math.max(m.get(key) ?? 0, off));
    }
  }
  return (sidewalkIndex = m);
}

/** Trottoarens avstånd från mittlinjen vid varje punkt i rutten (meter). */
export function sidewalkOffsets(route: Vec2[]): number[] {
  const m = sidewalkMap();
  return route.map((p) => m.get(`${Math.round(p[0] / SNAP)}:${Math.round(p[1] / SNAP)}`) ?? 0);
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
