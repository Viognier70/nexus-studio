// byKvallPlats.js — byns platser ur spelets riktiga karta (byKarta.js = WORLD ur grythyttan-world.json).
// Samma regler som spelet: gatunätet som content/villageNetwork.ts (vägarnas punkter är noder, 0,5 m
// sammanslagning, största sammanhängande delen, Dijkstra), krogarnas byggnader som content/villagePlaces.ts
// (VENUE_BUILDINGS) och vår krog i rummets ram som business/interiorLayout.ts (orientedBbox + obbLocalToWorld).
// Allt i meter, +x österut, +z söderut.
import { BUILDINGS, ROADS, LANDMARKS } from './byKarta.js';

/** content/villagePlaces.ts VENUE_BUILDINGS, med prototypens id:n. */
export const VENUE_BUILDINGS = { var: 'w869907975', torg: 'w869907973', pizza: 'w598989255', sjo: 'w241105722', hotell: 'w869907964' };
const TORGET = [12.49, -27.59], CAMPUS = [568.05, -85.84];
/** content/villagePlaces.ts TRUCK_SPOT_POINTS. */
export const TRUCK_SPOT_POINTS = { torget: [TORGET[0] - 6, TORGET[1] + 6], maltid: [CAMPUS[0] - 22, CAMPUS[1] + 18], sjon: [376, 236] };
export const PLACES = { torget: TORGET, campus: CAMPUS, parking: [TORGET[0] + 58, TORGET[1] - 22] };

// ---------- geometri (procgen/geom.ts) ----------
export function polygonCentroid(poly) { let x = 0, z = 0, n = 0; for (let i = 0; i < poly.length - 1; i++) { x += poly[i][0]; z += poly[i][1]; n++; } return n ? [x / n, z / n] : [0, 0]; }
export function orientedBbox(poly) {
  let best = 0, angle = 0;
  for (let i = 1; i < poly.length; i++) { const dx = poly[i][0] - poly[i - 1][0], dz = poly[i][1] - poly[i - 1][1], l = Math.hypot(dx, dz); if (l > best) { best = l; angle = Math.atan2(dz, dx); } }
  const centre = polygonCentroid(poly), c = Math.cos(-angle), s = Math.sin(-angle); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const [x, z] of poly) { const u = (x - centre[0]) * c - (z - centre[1]) * s, v = (x - centre[0]) * s + (z - centre[1]) * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  return { centre, w: u1 - u0, d: v1 - v0, angle };
}
export function obbLocalToWorld(obb, lx, lz) { const c = Math.cos(obb.angle), s = Math.sin(obb.angle); return [obb.centre[0] + c * lx - s * lz, obb.centre[1] + s * lx + c * lz]; }
export function signedArea(poly) { let a = 0; for (let i = 0; i < poly.length - 1; i++) a += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1]; return a / 2; }
export function inside(poly, x, z) { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit; } return hit; }
/** Kanterna med utåtriktad normal (oavsett polygonens varvriktning). */
export function edges(poly) {
  const sg = signedArea(poly) > 0 ? 1 : -1, out = [];
  for (let i = 0; i < poly.length - 1; i++) { const a = poly[i], b = poly[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.3) continue; out.push({ a, b, L, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], t: [dx / L, dz / L], n: [-dz / L * sg * -1, dx / L * sg * -1] }); }
  return out;
}

// ---------- gatunätet (content/villageNetwork.ts) ----------
function build(filter) {
  const index = new Map(), nodes = [], adj = [], SNAP = 0.5;
  const nodeFor = (p) => { const k = Math.round(p[0] / SNAP) + ':' + Math.round(p[1] / SNAP); let i = index.get(k); if (i === undefined) { i = nodes.length; index.set(k, i); nodes.push([p[0], p[1]]); adj.push([]); } return i; };
  for (const r of ROADS) { if (!filter(r) || r.poly.length < 2) continue; let prev = nodeFor(r.poly[0]); for (let k = 1; k < r.poly.length; k++) { const cur = nodeFor(r.poly[k]); if (cur !== prev) { const d = Math.hypot(nodes[cur][0] - nodes[prev][0], nodes[cur][1] - nodes[prev][1]); adj[prev].push({ to: cur, d }); adj[cur].push({ to: prev, d }); } prev = cur; } }
  const comp = new Int32Array(nodes.length).fill(-1), sizes = [];
  for (let s = 0; s < nodes.length; s++) { if (comp[s] >= 0) continue; const c = sizes.length; let n = 0; const st = [s]; comp[s] = c; while (st.length) { const x = st.pop(); n++; for (const e of adj[x]) if (comp[e.to] < 0) { comp[e.to] = c; st.push(e.to); } } sizes.push(n); }
  const big = sizes.indexOf(Math.max(...sizes)), main = new Uint8Array(nodes.length); for (let i = 0; i < nodes.length; i++) main[i] = comp[i] === big ? 1 : 0;
  return { nodes, adj, main, cache: new Map() };
}
export const walk = build(() => true);
export const drive = build((r) => r.car && r.kind !== 'track');
export function nearestNode(g, x, z) { let b = -1, bd = Infinity; for (let i = 0; i < g.nodes.length; i++) { if (!g.main[i]) continue; const d = (g.nodes[i][0] - x) ** 2 + (g.nodes[i][1] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
/** Kortaste vägen som nod-id:n (Dijkstra), sparad. */
export function routeNodes(g, from, to) {
  const key = from + '>' + to, hit = g.cache.get(key); if (hit) return hit;
  const n = g.nodes.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), heap = [[0, from]]; dist[from] = 0;
  while (heap.length) { let m = 0; for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[m][0]) m = i; const [d, x] = heap.splice(m, 1)[0]; if (x === to) break; if (d > dist[x]) continue; for (const e of g.adj[x]) { const nd = d + e.d; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = x; heap.push([nd, e.to]); } } }
  const out = []; if (from !== to && prev[to] < 0) out.push(from, to); else for (let x = to; x >= 0; x = x === from ? -1 : prev[x]) out.unshift(x);
  g.cache.set(key, out); return out;
}

// ---------- byggnaderna ----------
export const BUILDING = new Map(BUILDINGS.map((b) => [b.id, b]));
const HOME_KINDS = new Set(['house', 'residential', 'apartments', 'detached', 'terrace']);
export function isHome(b) { const A = Math.abs(signedArea(b.poly)); return HOME_KINDS.has(b.kind) || (b.kind === 'yes' && A > 40 && A < 320); }
/** Dörren: kanten som vetter mot närmaste gata (mitten + 3 m ut, närmast en nod i gatunätet). */
export function doorOf(poly) {
  let best = null, bd = Infinity;
  for (const e of edges(poly)) { if (e.L < 3) continue; const p = [e.mid[0] + e.n[0] * 3, e.mid[1] + e.n[1] * 3], k = nearestNode(walk, p[0], p[1]), d = Math.hypot(walk.nodes[k][0] - p[0], walk.nodes[k][1] - p[1]); if (d < bd) { bd = d; best = e; } }
  return best || edges(poly)[0];
}

/**
 * Entrén som data i byggnadsposten: `entrance.towards` är ett landmärke (id) eller en punkt [x, z]. Rummets entré
 * ligger på lokala +X, alltså på den långa axelns ena ände. entranceObb väljer den ände som vetter dit, och vinkeln
 * vänds 180° om orientedBbox valde den andra. Utan `entrance` gäller orientedBbox som förut. Ett par millimeter i
 * OSM kan inte längre vända rummet.
 */
export function entranceObb(b) {
  const o = orientedBbox(b.poly), e = b.entrance; if (!e) return { ...o, entrance: null };
  const p = typeof e.towards === 'string' ? landmark(e.towards) : e.towards; if (!p) return { ...o, entrance: null };
  const dot = Math.cos(o.angle) * (p[0] - o.centre[0]) + Math.sin(o.angle) * (p[1] - o.centre[1]);
  return dot >= 0 ? { ...o, entrance: e, flipped: false } : { ...o, angle: o.angle > 0 ? o.angle - Math.PI : o.angle + Math.PI, entrance: e, flipped: true };
}

/**
 * Vår krog i rummets ram. Rummet (wineBarRoom.ts) placeras som teatern gör: gruppen i obb.centre,
 * rotation.y = −obb.angle, där obb = entranceObb(w869907975) (entrén mot torget). Köplatserna och trottoaren läses
 * ur rummet (resolveWorldPositions), så att kön står på samma ställe på byns och teaterns nivå.
 */
export function playerVenue(room) {
  const obb = entranceObb(BUILDING.get(VENUE_BUILDINGS.var)), hw = room.width / 2, hd = room.depth / 2, L = (x, z) => obbLocalToWorld(obb, x, z);
  room.group.position.set(obb.centre[0], 0, obb.centre[1]); room.group.rotation.y = -obb.angle; room.group.updateMatrixWorld(true);
  const shell = [L(-hw, -hd), L(hw, -hd), L(hw, hd), L(-hw, hd), L(-hw, -hd)];
  const door = L(hw, 0), nrm = [Math.cos(obb.angle), Math.sin(obb.angle)];
  const faceToA = (f) => { const lx = Math.sin(f), lz = Math.cos(f), c = Math.cos(obb.angle), s = Math.sin(obb.angle); return Math.atan2(s * lx + c * lz, c * lx - s * lz); };
  return {
    obb, shell, door, nrm, local: L,
    queue: room.queueSpots.map((q) => ({ id: q.id, side: q.side, order: q.order, at: L(q.local[0], q.local[1]), a: faceToA(q.facing) })).sort((a, b) => a.order - b.order),
    pavement: [L(hw, -hd - 3.2), L(hw + 3.4, -hd - 3.2), L(hw + 3.4, 2.8), L(hw, 2.8), L(hw, -hd - 3.2)],
    kerb: [L(hw + 3.4, -hd - 3.2), L(hw + 3.4, 2.8)]
  };
}
export function landmark(id) { const l = LANDMARKS.find((x) => x.id === id); return l ? l.position : null; }
