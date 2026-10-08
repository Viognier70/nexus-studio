// ORDER 288 — var byns krogar, vagnarnas platser och gästernas startpunkter
// ligger i Grythyttan (meter, samma koordinater som scenen).
//
// Krogarna står i byggnader ur OSM-datan, valda för att passa rivalen:
//   - spelarens krog: w869907975 (torgets södra kant, PLAYER_BUSINESS_BUILDING_IDS)
//   - Torgkrogen: w869907973, på torget
//   - Pizzeria Grytan: w598989255, huset som heter Pizzans Hus i byns data
//   - Sjöboden: w241105722, närmast vattnet söder om byn (r8482507-r0)
//   - Hotellets matsal: w869907964, hotellet (Gästgivaregården)
// Vagnarnas tre platser (paket 2, Designs byTruckar.js SPOTS): torget, vid
// Måltidens hus (campus, gry-campus) och vid sjön (vattnets norra strand).
// Dörren är gatunätets nod närmast byggnaden.

import { LANDMARK_BY_ID, WORLD_RAW_BUILDINGS } from './world';
import { driveNetwork, nearestNode, walkNetwork } from './villageNetwork';
import type { TruckSpot } from '../../sim/village';
import { TRUCK_PROPS, WATER_BOWL_AT } from '../scene/truckProps';
import { PAY_LEDGE, WATER_BOWL } from '../scene/truckPropsD10';

type Vec2 = [number, number];

export const VENUE_BUILDINGS: Record<string, string> = {
  player: 'w869907975',
  torgkrogen: 'w869907973',
  'pizzeria-grytan': 'w598989255',
  sjoboden: 'w241105722',
  'hotellets-matsal': 'w869907964'
};

const TORGET: Vec2 = [12.49, -27.59];
const CAMPUS: Vec2 = [568.05, -85.84];
// Vattnets norra strand (r8482507-r0 spänner x 301–451, z 240–297).
const LAKE_SHORE: Vec2 = [376, 236];

export const TRUCK_SPOT_POINTS: Record<TruckSpot, Vec2> = {
  // ORDER 315b del 2 — Designs tillägg till D7 (rivalTorget.ts TRUCK_SPOT_TORGET): på
  // torgytans breda del, söder om spelarens vagn och väster om vinbarens hus.
  // Förut [TORGET − 6, TORGET + 6], där kön stod på Prästgatan. Gäller alla kvällar.
  torget: [21.25, -12.75],
  'maltidens-hus': [CAMPUS[0] - 22, CAMPUS[1] + 18],
  sjon: LAKE_SHORE
};

function centroid(poly: Vec2[]): Vec2 {
  let x = 0;
  let z = 0;
  for (const p of poly) { x += p[0]; z += p[1]; }
  return [x / poly.length, z / poly.length];
}

export interface VenuePlace {
  id: string;
  centre: Vec2;
  door: number;
  doorPoint: Vec2;
}

let venuesCache: Record<string, VenuePlace> | null = null;

export function venuePlaces(): Record<string, VenuePlace> {
  if (venuesCache) return venuesCache;
  const g = walkNetwork();
  const out: Record<string, VenuePlace> = {};
  for (const [id, bid] of Object.entries(VENUE_BUILDINGS)) {
    const b = WORLD_RAW_BUILDINGS.find((x) => x.id === bid);
    const centre = b ? centroid(b.poly as Vec2[]) : TORGET;
    const door = nearestNode(g, centre[0], centre[1]);
    out[id] = { id, centre, door, doorPoint: g.nodes[door] };
  }
  venuesCache = out;
  return out;
}

// Vagnens mått (VillageVenues makeTruck): lådan 2,4 m bred, från −3,2 till
// +3,6 m längs vagnen (skåpet och hytten). Meter.
export const TRUCK_BODY = { width: 2.4, zMin: -3.2, zMax: 3.6 } as const;

export interface TruckPlacement { x: number; z: number; rotationY: number }

// ORDER 312 — var vagnarna står, som data. Förut räknades platsen ur
// gatunätets nod närmast TRUCK_SPOT_POINTS, 4,2 m åt sidan. På torget
// hamnade grillvagnen då i Torgkrogens hus (w869907973) och på Torgets
// trottoar, (0,74, −30,70). Nu står varje plats här: vagnens mitt i byns ram
// (meter) och rotation.y. Luckan (lokala +x) vetter mot gatan; vagn nummer
// två står 7 m bakom (lokala −z). Testet order312PaVagen.test.ts prövar att
// båda vagnarna på varje plats står på land, inte på en väg och inte i ett hus.
//   - torget: ORDER 315b del 2, Designs plats (rivalTorget.ts), luckan mot torget;
//   - maltidens-hus: 4 m norr om den gamla platsen, där vagn nummer två inte
//     står på gångvägen w983402520;
//   - sjon: där den gamla regeln ställde den (den stod fritt).
export const TRUCK_STANDS: Record<TruckSpot, TruckPlacement> = {
  // ORDER 315b del 2 — rivalTorget.ts: mitten [21,25, −12,75], parallell med
  // Prästgatan, luckan mot nordost (hatchFaces [0,539, −0,843]). Vår vagn har
  // luckan i lokala +x, så rotation.y = atan2(0,843, 0,539) (Designs vagn har
  // luckan i lokala +Z och yawForThree −3,7103; samma riktning).
  torget: { x: 21.25, z: -12.75, rotationY: Math.atan2(0.843, 0.539) },
  'maltidens-hus': { x: 547, z: -60.87, rotationY: Math.PI },
  sjon: { x: 376.16, z: 230.32, rotationY: 1.485 }
};

/** Den andra vagnen på samma plats står 7 m efter den första ([längs vagnen, i sidled mot luckan], meter).
 *  ORDER 319c: på torget stod den då i spelarens kö, vid skylten och marschallen vid kön (layoutkontrollen,
 *  onRoadAudit.ts auditTrucks). Där står den i stället 7 m åt andra hållet och 2 m bakåt: åt det hållet utan
 *  steget bakåt står den i vinbarens hus. Avståndet till spelarens föremål, däck och vägar: reports/order319c/
 *  platsen.json rivalTwoGapM (scene/__tests__/order319cPlatsen.test.ts). */
const SECOND_TRUCK_DEFAULT_M: [number, number] = [7, 0];
const SECOND_TRUCK_OFFSET_M: Partial<Record<TruckSpot, [number, number]>> = { torget: [-7, -2] };

/**
 * Var vagnen står på kvällens plats (VillageVenues ritar den här). `k` är
 * vagnens nummer bland vagnarna på samma plats (de står efter varandra).
 */
export function truckPlacement(spot: TruckSpot, k: number): TruckPlacement {
  const s = TRUCK_STANDS[spot];
  const [along, side] = SECOND_TRUCK_OFFSET_M[spot] ?? SECOND_TRUCK_DEFAULT_M;
  return {
    x: s.x - Math.sin(s.rotationY) * k * along + Math.cos(s.rotationY) * k * side,
    z: s.z - Math.cos(s.rotationY) * k * along - Math.sin(s.rotationY) * k * side,
    rotationY: s.rotationY
  };
}

// ORDER 315b del 2 — spelarens vagn har en egen plats på torget (Designs D7,
// playerTruck.ts TRUCK_PITCH_TORGET, truckPlats.json): mitten [17,00, −21,90],
// −6,29° i kartans ram, parallell med gatan Torget, luckan mot söder in mot
// torgytan. Rivalerna står på sin egen plats (TRUCK_STANDS.torget), minst
// 2,55 m bort (rivalTorget.ts CHECKS.gapToPlayerTruckM).
export const PLAYER_TRUCK_PITCH = { centre: [17.0, -21.9] as Vec2, angleDeg: -6.29 };

/** Spelarens släpvagn (scene/playerTruck.ts makePlayerTrailer): rotation.y = −vinkeln, som Designs regel. */
export function playerTruckPlacement(): TruckPlacement {
  return { x: PLAYER_TRUCK_PITCH.centre[0], z: PLAYER_TRUCK_PITCH.centre[1], rotationY: -PLAYER_TRUCK_PITCH.angleDeg * Math.PI / 180 };
}

/** Vagnens och trädäckets fot i byns ram (scene/playerTruck.ts TRUCK_LAYOUT, vagnens ram +X längs, +Z ut från luckan). */
export function playerTruckFootprints(): { body: Vec2[]; deck: Vec2[] } {
  const at = playerTruckPlacement();
  const c = Math.cos(at.rotationY), s = Math.sin(at.rotationY);
  // three.js: lokal (x, z) roterad kring +Y med θ → (x cos θ + z sin θ, −x sin θ + z cos θ).
  const w = (x: number, z: number): Vec2 => [at.x + x * c + z * s, at.z - x * s + z * c];
  const rect = (x0: number, x1: number, z0: number, z1: number): Vec2[] => [w(x0, z0), w(x1, z0), w(x1, z1), w(x0, z1)];
  // Karossen från dragstångens krok till bakgaveln, och markisen ut över luckan.
  return { body: rect(-3.4, 2.3, -1.15, 1.85), deck: rect(3.0, 6.2, 0.2, 3.8) };
}

/** ORDER 319c — föremålen på uteserveringen och vid luckan (Designs D9 truckProps.ts TRUCK_PROPS), deras fot i
 *  vagnens ram: ståborden, bänken, värmaren, sopkorgen, marschallerna, hyllan och skylten. Runda föremål som
 *  åttahörningar. Layoutkontrollen (onRoadAudit.ts) och gångvägarnas test läser samma lista. */
export function playerTruckPropShapes(): { name: string; poly: Vec2[] }[] {
  const P = TRUCK_PROPS;
  const circle = (c: readonly number[], r: number): Vec2[] => Array.from({ length: 8 }, (_, i) => [c[0] + r * Math.cos((i * Math.PI) / 4), c[1] + r * Math.sin((i * Math.PI) / 4)] as Vec2);
  const rect = (x0: number, x1: number, z0: number, z1: number): Vec2[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const out: { name: string; poly: Vec2[] }[] = [];
  for (const [k, c] of Object.entries(P.standTable.at)) out.push({ name: 'stand table ' + k, poly: circle(c, P.standTable.top.diameter / 2) });
  out.push({ name: 'bench', poly: rect(P.bench.centre[0] - P.bench.depth / 2, P.bench.centre[0] + P.bench.depth / 2, P.bench.centre[1] - P.bench.length / 2, P.bench.centre[1] + P.bench.length / 2) });
  out.push({ name: 'heater', poly: circle(P.heater.at, P.heater.base.diameter / 2) });
  out.push({ name: 'bin', poly: circle(P.bin.at, P.bin.diameter / 2) });
  P.torch.at.forEach((c, i) => out.push({ name: 'torch ' + (i + 1), poly: circle(c, P.torch.holder.cup / 2) }));
  out.push({ name: 'shelf', poly: rect(P.shelf.x0, P.shelf.x1, P.shelf.z0, P.shelf.z1) });
  // ORDER 320 — D10: betalhyllan under luckan och vattenskålen vid bord B.
  out.push({ name: 'pay ledge', poly: rect(PAY_LEDGE.x0, PAY_LEDGE.x1, PAY_LEDGE.z0, PAY_LEDGE.z1) });
  out.push({ name: 'water bowl', poly: circle(WATER_BOWL_AT, WATER_BOWL.r) });
  const B = P.menuBoard;
  out.push({ name: 'menu board', poly: rect(B.at[0] - B.footprint[0] / 2, B.at[0] + B.footprint[0] / 2, B.at[1] - B.footprint[1] / 2, B.at[1] + B.footprint[1] / 2) });
  return out;
}

/** ORDER 319c — föremålens fot i byns ram. */
export function playerTruckPropFootprints(): { name: string; poly: Vec2[] }[] {
  const at = playerTruckPlacement();
  const c = Math.cos(at.rotationY), s = Math.sin(at.rotationY);
  return playerTruckPropShapes().map((p) => ({ name: p.name, poly: p.poly.map(([x, z]) => [at.x + x * c + z * s, at.z - x * s + z * c] as Vec2) }));
}

/** ORDER 312 — lyktan och skenet vid en krogs dörr (VillageVenues): 60 % mot dörrnoden från husets mitt. */
export function venueLampPoint(p: VenuePlace): Vec2 {
  return [p.doorPoint[0] * 0.6 + p.centre[0] * 0.4, p.doorPoint[1] * 0.6 + p.centre[1] * 0.4];
}

export function truckSpotPlace(spot: TruckSpot): VenuePlace {
  const g = walkNetwork();
  const p = TRUCK_SPOT_POINTS[spot];
  const door = nearestNode(g, p[0], p[1]);
  return { id: spot, centre: g.nodes[door], door, doorPoint: g.nodes[door] };
}

// Där gästtyperna kommer ifrån: studenterna från Måltidens hus, par och
// familjer från bostadshusen, höginkomsttagarna från hotellet eller bilarna.
export interface HomeBuilding { id: string; centre: Vec2; node: number }

export interface Sources {
  campus: number;
  hotel: number;
  homes: number[];
  // ORDER 297 — alla bostadshus inom byn, med byggnadens id (fönstren släcks
  // när sällskapet går ut; Designs leverans Byn i kvällsljus, LIGHTS.homes).
  homeBuildings: HomeBuilding[];
  parking: number;
  // Bilarnas och bussens väg in: noden i bilnätet där de kommer in, och
  // parkeringen och hållplatsen i bilnätet.
  driveEntry: number[];
  driveParking: number;
  driveBusStop: number;
  busStop: number;
}

let sourcesCache: Sources | null = null;

export function villageSources(): Sources {
  if (sourcesCache) return sourcesCache;
  const g = walkNetwork();
  const d = driveNetwork();
  const homesKinds = new Set(['house', 'residential', 'apartments', 'detached', 'terrace']);
  const homeBuildings: HomeBuilding[] = WORLD_RAW_BUILDINGS
    .filter((b) => homesKinds.has(b.kind ?? ''))
    .map((b) => ({ id: b.id, centre: centroid(b.poly as Vec2[]) }))
    .filter((h) => Math.hypot(h.centre[0] - TORGET[0], h.centre[1] - TORGET[1]) < 700)
    .map((h) => ({ ...h, node: nearestNode(g, h.centre[0], h.centre[1]) }));
  const homes = WORLD_RAW_BUILDINGS
    .filter((b) => homesKinds.has(b.kind ?? ''))
    .map((b) => centroid(b.poly as Vec2[]))
    .filter((c) => Math.hypot(c[0] - TORGET[0], c[1] - TORGET[1]) < 700)
    .filter((_, i) => i % 3 === 0)
    .map((c) => nearestNode(g, c[0], c[1]));
  const hotel = venuePlaces()['hotellets-matsal'].door;
  // Bilarna kommer in där bilnätet slutar längst bort från torget åt två håll.
  const ends = d.nodes
    .map((p, i) => ({ i, r: Math.hypot(p[0] - TORGET[0], p[1] - TORGET[1]), deg: d.adj[i].length }))
    .filter((n) => d.main[n.i] && n.r > 500 && n.r < 1400);
  ends.sort((a, b) => b.r - a.r);
  const driveEntry: number[] = [];
  for (const e of ends) {
    const p = d.nodes[e.i];
    if (driveEntry.every((k) => Math.hypot(d.nodes[k][0] - p[0], d.nodes[k][1] - p[1]) > 600)) driveEntry.push(e.i);
    if (driveEntry.length >= 3) break;
  }
  const parkingPoint: Vec2 = [TORGET[0] + 58, TORGET[1] - 22];
  const driveParking = nearestNode(d, parkingPoint[0], parkingPoint[1]);
  const driveBusStop = nearestNode(d, TORGET[0] + 30, TORGET[1] + 30);
  sourcesCache = {
    campus: nearestNode(g, CAMPUS[0], CAMPUS[1]),
    hotel,
    homes: homes.length > 0 ? homes : [nearestNode(g, TORGET[0], TORGET[1])],
    homeBuildings,
    parking: nearestNode(g, d.nodes[driveParking][0], d.nodes[driveParking][1]),
    driveEntry: driveEntry.length > 0 ? driveEntry : [driveParking],
    driveParking,
    driveBusStop,
    busStop: nearestNode(g, d.nodes[driveBusStop][0], d.nodes[driveBusStop][1])
  };
  return sourcesCache;
}

/** ORDER 297 — campus (Måltidens hus) i byns ram. */
export const CAMPUS_POINT: Vec2 = CAMPUS;

export function landmarkPoint(id: string): Vec2 | null {
  const l = LANDMARK_BY_ID[id];
  return l ? [l.position[0], l.position[1]] : null;
}
