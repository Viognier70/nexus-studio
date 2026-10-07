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

/**
 * Var vagnen står på kvällens plats (VillageVenues ritar den här). `k` är
 * vagnens nummer bland vagnarna på samma plats (de står efter varandra).
 */
export function truckPlacement(spot: TruckSpot, k: number): TruckPlacement {
  const s = TRUCK_STANDS[spot];
  return {
    x: s.x - Math.sin(s.rotationY) * k * 7,
    z: s.z - Math.cos(s.rotationY) * k * 7,
    rotationY: s.rotationY
  };
}

// ORDER 315b del 2 — spelarens vagn har en egen plats på torget (Designs D7,
// playerTruck.ts TRUCK_PITCH_TORGET, truckPlats.json): mitten [17,00, −21,90],
// −6,29° i kartans ram, parallell med gatan Torget, luckan mot söder in mot
// torgytan. Designs vagn har luckan i lokala +Z (rotation.y = −vinkeln); vår
// vagn (VillageVenues makeTruck) har den i lokala +x, så rotation.y vrids ett
// kvarts varv till. Rivalerna står på sin egen plats (TRUCK_STANDS.torget),
// minst 2,55 m bort (rivalTorget.ts CHECKS.gapToPlayerTruckM).
export const PLAYER_TRUCK_PITCH = { centre: [17.0, -21.9] as Vec2, angleDeg: -6.29 };

export function playerTruckPlacement(): TruckPlacement {
  const yawDesign = -PLAYER_TRUCK_PITCH.angleDeg * Math.PI / 180;
  return { x: PLAYER_TRUCK_PITCH.centre[0], z: PLAYER_TRUCK_PITCH.centre[1], rotationY: yawDesign - Math.PI / 2 };
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
