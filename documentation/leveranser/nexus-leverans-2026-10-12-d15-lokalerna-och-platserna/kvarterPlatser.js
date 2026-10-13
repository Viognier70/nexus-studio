// kvarterPlatser.js — D15 (2026-10-12): foodtruckens fem platser och de tre nya lokalerna, på spelets riktiga karta.
// Koordinaterna är spelets (grythyttan-world.json via byKarta.js): meter, +x österut, +z söderut. Inga byggnader är ändrade.
// En plats har vagnens ram från D7 (C = vagnens mitt, th = vinkeln på vagnens längdaxel): världen = C + R(th)·lokal,
// med lokal +x längs vagnen och +z ut från luckan mot kön (grillstugan.js TRUCK_FRAME).
// En lokal har en egen ram i husets riktning (C, th), och rummets mått i den ramen.
// Kvarterens gränser ritar Code efter gatorna. quarter här säger bara vilket kvarter platsen och lokalen hör till.
// Gästernas andelar (STREET_MIX) och lokalernas platser är förslag. Talen sätts i balance.ts.

import { BUILDINGS, ROADS, WATER, FOREST, GRASS, LANDMARKS } from './byKarta.js';

export const toWorld = (F, p) => { const c = Math.cos(F.th), s = Math.sin(F.th); return [F.C[0] + c * p[0] - s * p[1], F.C[1] + s * p[0] + c * p[1]]; };
export const toLocal = (F, p) => { const c = Math.cos(F.th), s = Math.sin(F.th), dx = p[0] - F.C[0], dz = p[1] - F.C[1]; return [c * dx + s * dz, -s * dx + c * dz]; };

export const QUARTERS = {
  torget: { id: 'torget', name: 'quarter.torget' },
  student: { id: 'student', name: 'quarter.student' },
  gastgivaregarden: { id: 'gastgivaregarden', name: 'quarter.gastgivaregarden' },
  campus: { id: 'campus', name: 'quarter.campus' },
  sjon: { id: 'sjon', name: 'quarter.sjon' }
};

/** Gästerna på gatan per kvarter (guestGroups). family = en vuxen med ett barn hand i hand (D12). Andelar, förslag. */
export const STREET_MIX = {
  torget: { villager: 0.4, tourist: 0.2, student: 0.2, business: 0.1, gourmet: 0.1 },
  student: { student: 0.75, villager: 0.25 },
  gastgivaregarden: { tourist: 0.55, gourmet: 0.35, villager: 0.1 },
  campus: { business: 0.6, tourist: 0.2, student: 0.2 },
  sjon: { family: 0.55, villager: 0.3, tourist: 0.15 }
};

/** Foodtruckens fem ställplatser. Torget är D7:s plats. Sjön är TRUCK_SPOT_POINTS.sjon. Campus är flyttad från
 *  TRUCK_SPOT_POINTS.maltid [546,05; −67,84], där vagnen och kön står i Måltidens hus (fasaden ligger 6,6 m bort),
 *  till fasaden 2,65 m bakom vagnen med luckan mot väster. Prästgatan och Gästgivaregården är nya.
 *  free: lådan x −6,5…6,5, z −1,6…4,5 (vagnen, dragstången, kön och ståborden) är prövad mot husen, vattnet och körbanorna. */
export const SPOTS = {
  torget: { id: 'torget', quarter: 'torget', C: [17.0, -21.9], th: -0.10984, street: 'w122157681', note: 'D7, Torget [17,00; −21,90]' },
  prastgatan: { id: 'prastgatan', quarter: 'student', C: [290.67, 38.97], th: 0.187, street: 'w122157689', note: 'södra sidan av Prästgatan, luckan mot gaveln på w193810970 (källaren) och w193810972' },
  gastgivaregarden: { id: 'gastgivaregarden', quarter: 'gastgivaregarden', C: [62.34, 76.91], th: -1.9201, street: 'w862853214', note: 'Artur Lindqvists gata norr om Gästgivaregården, luckan mot öster' },
  // Flyttad från TRUCK_SPOT_POINTS.maltid, beslut 2026-10-13.
  campus: { id: 'campus', quarter: 'campus', C: [550.3, -70.42], th: 1.7296, street: 'w122157690', note: 'mot Måltidens hus västra fasad, luckan mot väster och gångvägen', moved: { from: [546.05, -67.84], why: 'campus.moved' } },
  sjon: { id: 'sjon', quarter: 'sjon', C: [376.0, 236.0], th: 0.126, street: 'w862853236', note: 'TRUCK_SPOT_POINTS.sjon, luckan mot vattnet (r8482507)' }
};

/** Sjöns två lägen. Kön, gästerna och ljuset. */
export const LAKE_MODES = {
  autumnWeekday: { queue: 1, tables: 0, walkers: 2, light: 'autumn' },
  summerWeekend: { queue: 6, tables: 5, walkers: 9, light: 'summer' }
};

// ---------- lokalerna ----------
// Ett hus ur kartan per kvarter. Torget har spelarens vinbar (wineBarHouse.ts). Rummet anges i lokalens ram: x längs
// husets långa sida, z tvärs. floorY = golvet mot gatan (källaren ligger 2,7 m under). ceilingM = rumshöjden.
// door = dörren i lokal ram och vilken vägg den sitter i. seats räknas ur möbleringen i d15Manus (VENUE_LAYOUT).
export const VENUES = {
  kallaren: {
    id: 'kallaren', quarter: 'student', building: 'w193810970', kind: 'cellar',
    C: [279.81, 50.42], th: 0.20957,
    // Huvudkroppen 15,6 × 10,7 m. Utbyggnaden mot söder (x −3,95…4,54, z 5,3…7,6) är husets trapphus och hör inte till källaren.
    // Murarna ligger innanför husets mått (beslut 2026-10-13): rummet 14,72 × 9,79 m.
    room: { x0: -7.36, x1: 7.36, z0: -4.87, z1: 4.92, wall: 0.45 }, floorY: -2.7, ceilingM: 2.35, aboveM: 6.6,
    // Trappan går ned längs norra fasaden mot öster, utanför huset, och slutar i ett vilplan framför dörren.
    door: { wall: 'north', x: 5.2, w: 1.1 }, stair: { x0: -0.6, x1: 3.8, xEnd: 6.5, z0: -6.55, z1: -5.32, fromY: 0, toY: -2.7, along: '+x' },
    windows: { wall: 'north', xs: [-6.4, -4.0, -1.6], w: 1.0, h: 0.5, y: 1.75 },
    character: 'venue.kallaren.character'
  },
  salongen: {
    id: 'salongen', quarter: 'gastgivaregarden', building: 'w193810957', kind: 'salon',
    C: [116.72, 58.39], th: -1.61659,
    // Väggarna innanför husets mått (beslut 2026-10-13): rummet 28,89 × 10,24 m.
    room: { x0: -14.44, x1: 14.45, z0: -5.12, z1: 5.12, wall: 0.3 }, floorY: 0.45, ceilingM: 4.2, eaveM: 5.2, ridgeM: 8.6,
    door: { wall: 'west', x: 2.4, w: 1.6 }, steps: { x: 2.4, w: 2.2, n: 3 },
    windows: { wall: 'both', xs: [-12.6, -10.0, -5.2, -0.4, 5.2, 7.8, 10.4, 13.0], w: 1.1, h: 2.6, y: 0.75 },
    kitchen: { x0: -14.44, x1: -8.6 },
    character: 'venue.salongen.character'
  },
  glashornet: {
    id: 'glashornet', quarter: 'campus', building: 'w193810921', part: 'east wing', kind: 'glass',
    C: [427.75, -87.7], th: 0.90619,
    // Kärnhusets östra flygel: A–B–C–D–E. E–A är väggen mot resten av Kärnhuset. Hörnet C (sydost) är glasat.
    // poly = rummets insida, 0,15 m innanför husets kant (väggarna 0,3 m ligger innanför husets mått, beslut 2026-10-13).
    poly: [[-8.1, 9.26], [-8.09, -8.52], [8.1, -8.52], [8.09, 7.76], [2.57, 7.76]], outline: [[-8.25, 9.43], [-8.24, -8.67], [8.25, -8.67], [8.24, 7.91], [2.59, 7.91]], wing: { A: [415.24, -88.37], B: [429.49, -99.53], C: [439.66, -86.55], D: [426.6, -76.33], E: [423.12, -80.78] },
    room: { x0: -8.09, x1: 8.1, z0: -8.52, z1: 9.26, wall: 0.3 }, floorY: 0, ceilingM: 3.6, eaveM: 4.4,
    name: 'venue.glashornet.name',
    glass: { edges: [1, 2], fromCorner: 'C', mullionM: 1.5 },
    door: { wall: 'south', x: 6.6, w: 1.8 },
    character: 'venue.glashornet.character'
  }
};

// ---------- kartan runt en ram ----------
const signedArea = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; };
export function pointInPoly(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
export function segDist(p, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); }
const ROAD_W = { secondary: 8, tertiary: 6.5, unclassified: 5, residential: 5, living_street: 5, service: 3.5, track: 2.6, footway: 1.8, path: 1.8, pedestrian: 4, cycleway: 2 };
export const roadWidth = (r) => r.width || ROAD_W[r.kind] || 4;
/** Höjden på ett hus ur kartan: takfoten och nocken, efter sort och yta. Kartan har inga höjder; det här är prototypens. */
export function houseHeight(b) {
  const A = Math.abs(signedArea(b.poly));
  if (b.kind === 'church') return { eave: 8, ridge: 13, flat: false };
  if (b.kind === 'university') return { eave: 8.5, ridge: 8.5, flat: true };
  if (b.kind === 'industrial' || b.kind === 'roof') return { eave: 5, ridge: 5, flat: true };
  if (b.kind === 'apartments' || b.kind === 'residential') return { eave: 6.6, ridge: 9.6, flat: false };
  if (b.kind === 'hotel') return { eave: 7, ridge: 11, flat: false };
  if (b.kind === 'shed' || b.kind === 'outbuilding') return { eave: 2.6, ridge: 4, flat: false };
  return A > 260 ? { eave: 6.2, ridge: 9.6, flat: false } : A > 110 ? { eave: 4.6, ridge: 7.6, flat: false } : { eave: 3.4, ridge: 5.6, flat: false };
}
/** Det som ligger inom R m från ramen, i lokal ram. skip = byggnader som ritas för sig (lokalen). */
export function localMap(F, R, skip) {
  const L = (p) => toLocal(F, p), d = (p) => Math.hypot(p[0] - F.C[0], p[1] - F.C[1]);
  const buildings = BUILDINGS.filter((b) => !(skip || []).includes(b.id) && b.poly.some((p) => d(p) < R)).map((b) => ({ id: b.id, kind: b.kind, name: b.name || null, poly: b.poly.map(L), h: houseHeight(b) }));
  const roads = [];
  ROADS.forEach((r) => {
    let cur = [];
    const flush = () => { if (cur.length > 1) roads.push({ id: r.id, kind: r.kind, name: r.name || null, car: r.car, w: roadWidth(r), poly: cur }); cur = []; };
    for (let i = 0; i < r.poly.length - 1; i++) {
      const a = r.poly[i], b = r.poly[i + 1];
      if (segDist(F.C, a, b) < R + 30) { if (!cur.length) cur.push(L(a)); cur.push(L(b)); } else flush();
    }
    flush();
  });
  const water = WATER.filter((w) => w.poly.some((p) => d(p) < R + 200)).map((w) => ({ id: w.id, name: w.name, poly: w.poly.map(L) }));
  const green = [...FOREST, ...GRASS].filter((w) => w.poly.some((p) => d(p) < R + 60)).map((w) => ({ id: w.id, poly: w.poly.map(L) }));
  const landmarks = LANDMARKS.filter((l) => d(l.position) < R).map((l) => ({ id: l.id, name: l.name, p: L(l.position) }));
  return { buildings, roads, water, green, landmarks };
}
/** Gatan närmast ramen som gående kan gå på, i lokal ram, och sidan som vänder mot ramens mitt. */
export function nearestStreet(map, at) {
  let best = null; map.roads.forEach((r) => { for (let i = 0; i < r.poly.length - 1; i++) { const dd = segDist(at || [0, 0], r.poly[i], r.poly[i + 1]); if (!best || dd < best.d) best = { d: dd, r }; } });
  return best && best.r;
}
export const free = (map, p, pad) => !map.buildings.some((b) => pointInPoly(p, b.poly)) && !map.water.some((w) => pointInPoly(p, w.poly)) && !map.roads.some((r) => r.poly.some((q, i) => r.poly[i + 1] && segDist(p, q, r.poly[i + 1]) < r.w / 2 + (pad || 0)));
