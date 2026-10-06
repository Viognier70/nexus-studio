// ORDER 312b — går folk till fots bara på ritade gångytor och trottoarer?
//
// Mätningen läser renderingens källor (CLAUDE.md, "Mätningar mot det de
// beskriver"):
//   - vägytan: content/roadSurface.ts roadRenderPieces/onWalkSurface, samma
//     bitar som OsmRoads ritar;
//   - de gåendes väg: content/villageNetwork.ts walkNetwork, routeBetween,
//     sidewalkOffsets och walkerPoint, samma funktioner som VillageLife
//     ritar sällskapen med;
//   - start och mål: content/villagePlaces.ts venuePlaces, truckSpotPlace,
//     villageSources.
// Rutterna är de VillageLife går: från varje startpunkt (bostadshusen,
// campus, hotellet, parkeringen, hållplatsen) till varje krog och vagnplats,
// och mellan krogarna. Var 0,5 m längs rutten, på båda sidor, provas
// sällskapets mitt och de två i bredd (ABREAST_M 0,62 m, ± 0,31 m).
//
// Avvikelser:
//   - Övergångarna: i korsningarna (villageNetwork.ts walkCrossings,
//     gångplatsens avstånd plus CROSSING_MARGIN_M runt punkten där vägar
//     möts) och på en annan vägs körbana än den man går längs går man över
//     gatan (villageNetwork.ts walkPlace). Prov där räknas som övergång, inte
//     som fel; gångnätet byggs med samma regel. Den egna gatans körbana,
//     gräs och gårdar är fel.
//   - Ruttens första och sista CROSSING_MARGIN_M (dörren, startpunkten) räknas
//     som övergång från gångplatsen till dörren.
//   - Toleransen är ON_ROAD_TOLERANCE_M (0,1 m) som i ORDER 312.
//   - Figurernas förstoring på håll (figureScale) räknas inte; provet görs i
//     skala 1.
//   - Vagnköerna (standAt) och samlingen vid dörren prövas inte.
//
// Meter, byns ram.

import { roadWaysAt } from '../content/roadSurface';
import { ON_ROAD_TOLERANCE_M } from './onRoadAudit';
import { CROSSING_MARGIN_M, nearestNode, routeBetween, sidewalkOffsets, walkerPoint, walkNetwork, walkPlace, type RoadGraph } from '../content/villageNetwork';
import { truckSpotPlace, venuePlaces, villageSources } from '../content/villagePlaces';

type Vec2 = [number, number];

const ABREAST_HALF_M = 0.31;
const STEP_M = 0.5;

export interface WalkConflict { from: number; to: number; at: Vec2; side: number; member: number }

export interface WalkAudit {
  routes: number;
  samples: number;
  crossings: number;
  conflicts: WalkConflict[];
  /** Avstånd från husets mitt till dörrens nod i gångnätet, per krog. */
  doors: Record<string, { node: Vec2; centre: Vec2; distanceM: number }>;
  nodes: number;
}

export interface WalkSources {
  graph: () => RoadGraph;
  route: (g: RoadGraph, a: number, b: number) => Vec2[];
  offsets: (route: Vec2[]) => number[];
}

const DEFAULT: WalkSources = { graph: walkNetwork, route: routeBetween, offsets: sidewalkOffsets };

/** Rutternas start och mål som punkter i byns ram (gångnätets noder i dag). */
export function walkRoutes(): Array<[Vec2, Vec2]> {
  const g = walkNetwork();
  const src = villageSources();
  const venues = venuePlaces();
  const doors = [...Object.values(venues).map((v) => v.door), ...(['torget', 'maltidens-hus', 'sjon'] as const).map((s) => truckSpotPlace(s).door)];
  const starts = [...src.homes, src.campus, src.hotel, src.parking, src.busStop];
  const out: Array<[Vec2, Vec2]> = [];
  for (const a of starts) for (const b of doors) if (a !== b) out.push([g.nodes[a], g.nodes[b]]);
  for (const a of doors) for (const b of doors) if (a !== b) out.push([g.nodes[a], g.nodes[b]]);
  return out;
}

// Toleransen: ett prov räknas som på gångytan om en punkt inom
// ON_ROAD_TOLERANCE_M (0,1 m, samma som ORDER 312) är det. I skarpa kurvor
// står gångplatsen vinkelrätt mot biten, trottoaren mot medelriktningen.
function walkPlaceWithin(x: number, z: number, ways: ReadonlySet<string>): 'walk' | 'crossing' | null {
  const t = ON_ROAD_TOLERANCE_M;
  let best = walkPlace(x, z, ways);
  if (best === 'walk') return best;
  for (const [dx, dz] of [[t, 0], [-t, 0], [0, t], [0, -t]]) {
    const p = walkPlace(x + dx, z + dz, ways);
    if (p === 'walk') return p;
    if (p === 'crossing') best = p;
  }
  return best;
}

export function auditWalkers(sources: WalkSources = DEFAULT, pairs: Array<[Vec2, Vec2]> = walkRoutes()): WalkAudit {
  const g = sources.graph();
  const conflicts: WalkConflict[] = [];
  let samples = 0;
  let crossings = 0;
  for (const [pa, pb] of pairs) {
    const from = nearestNode(g, pa[0], pa[1]);
    const to = nearestNode(g, pb[0], pb[1]);
    const route = sources.route(g, from, to);
    if (route.length < 2) continue;
    const off = sources.offsets(route);
    let along = 0;
    for (let i = 1; i < route.length; i++) along += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    for (let s = 0; s <= along; s += STEP_M) {
      // Vägen man går längs: vägarna vars ritade remsa täcker mittlinjen här.
      const c = walkerPoint(route, off, s, 0);
      const ways = roadWaysAt(c.x, c.z);
      for (const side of [1, -1]) {
        const p = walkerPoint(route, off, s, side);
        for (const member of [0, -1, 1]) {
          const x = p.x + Math.cos(p.heading) * ABREAST_HALF_M * member;
          const z = p.z - Math.sin(p.heading) * ABREAST_HALF_M * member;
          samples++;
          const place = walkPlaceWithin(x, z, ways);
          if (place === 'walk') continue;
          const nearEnd = s < CROSSING_MARGIN_M + (off[0] ?? 0) || s > along - CROSSING_MARGIN_M - (off[off.length - 1] ?? 0);
          if (place === 'crossing' || nearEnd) { crossings++; continue; }
          conflicts.push({ from, to, at: [Math.round(x * 100) / 100, Math.round(z * 100) / 100], side, member });
        }
      }
    }
  }
  const doors: WalkAudit['doors'] = {};
  for (const [id, v] of Object.entries(venuePlaces())) doors[id] = { node: v.doorPoint, centre: v.centre, distanceM: Math.round(Math.hypot(v.doorPoint[0] - v.centre[0], v.doorPoint[1] - v.centre[1]) * 100) / 100 };
  return { routes: pairs.length, samples, crossings, conflicts, doors, nodes: g.nodes.length };
}
