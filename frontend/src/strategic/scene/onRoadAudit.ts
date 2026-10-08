// ORDER 312 — ligger något i spelet på vägen? Mätningen mot den riktiga kartan.
//
// Anders 2026-10-06 såg hus på vägarna i Designs prototyp av byn. Den här
// modulen prövar att spelet inte har samma fel. Den läser samma källor som
// renderingen:
//   - vägytan: content/roadSurface.ts roadRenderPieces() (OsmRoads ritar den),
//     bredden ur roadRoles.ts ROLE_SPECS[roleFor(road)], inte OSM-taggen;
//   - husen: WORLD.buildings utom BUILDINGS_ON_ROADS (OsmBuildings,
//     ProceduralFacades och de handgjorda landmärkena ritar polygonen), och
//     uthusen (OsmProceduralOutbuildings via procgen/parcel.ts);
//   - vinbaren: interiorLayout.ts playerObb + businessRoom.ts roomSizeFor
//     (WineBarScene placerar rummet så), entrén ur computePlayerBusinessInterior;
//   - rivalerna och vagnarna: content/villagePlaces.ts venuePlaces,
//     venueLampPoint, truckPlacement (VillageVenues ritar dem där), dagarna ur
//     sim/balance.ts VILLAGE.truckSchedule och openDays;
//   - bilarna: VillageLife.tsx (byns gäster och bussen) kör villageNetwork.ts
//     driveNetwork/routeBetween från villageSources; OsmTraffic.tsx kör
//     eligibleRoads(kind) med vehicleLaneOffset; DeliveryVan kör
//     interiorLayout deliveryApproach → deliveryBay.
//
// Avvikelser som mätningen inte täcker (redovisas i ORDER_312_RAPPORT.md):
//   - takets utsprång (OsmBuildings RoofCap) räknas inte, bara väggarnas fot;
//   - de handgjorda landmärkena ritar väggarna ur polygonen men kan ha
//     detaljer (trappor, skärmtak) utanför den;
//   - bilarnas läsbarhetsförstoring på håll (readabilityScale) räknas inte.
//
// Enheten är meter. Toleransen ON_ROAD_TOLERANCE_M är vad som räknas som att
// "nudda" kanten (kantstenen är 0,18 m, OsmRoads).

import { BUILDINGS_ON_ROADS } from '../content/buildingsOnRoads';
import { WORLD, type RawBuilding, type Vec2Tuple } from '../content/world';
import { boxFootprint, pointInPolygon, polygonsOverlap, ringEdges, roadOverlapsForPolygon, roadQuadsAt, type RoadOverlap } from '../content/roadSurface';
import { orientedBbox, inAnyWater } from '../procgen/geom';
import { outbuildingFootprintAt, outbuildingPlacementFor } from '../procgen/parcel';
import { computePlayerBusinessInterior, playerObb } from '../business/interiorLayout';
import { deliveryStop } from '../business/deliveryStop';
import { roomSizeFor } from './businessRoom';
import { TRUCK_BODY, VENUE_BUILDINGS, playerTruckFootprints, playerTruckPropFootprints, truckPlacement, venueLampPoint, venuePlaces, villageSources } from '../content/villagePlaces';
import { driveNetwork, routeBetween, routeLength, pointAlong } from '../content/villageNetwork';
import { eligibleRoads, KIND_CONFIG, vehicleLaneOffset, type VehicleKind } from './OsmTraffic';
import { polylineLength } from '../content/world';
import { VILLAGE, type Weekday } from '../../sim/balance';
import type { TruckSpot } from '../../sim/village';

export const ON_ROAD_TOLERANCE_M = 0.1;

export type ConflictKind =
  | 'house-on-road'
  | 'outbuilding-on-road'
  | 'winebar-room-outside-building'
  | 'winebar-room-on-road'
  | 'winebar-room-in-neighbour'
  | 'winebar-entrance-outside-building'
  | 'winebar-entrance-not-facing-street'
  | 'rival-building-missing'
  | 'rival-building-on-road'
  | 'rival-lamp-over-carriageway'
  | 'truck-on-road'
  | 'truck-in-building'
  | 'truck-in-water'
  | 'car-off-car-road'
  | 'car-on-footpath'
  | 'car-through-building';

export interface Conflict {
  kind: ConflictKind;
  /** Vad det gäller: husets id, vagnens id och dag, bilens rutt. */
  subject: string;
  /** Punkten i byns ram, meter (+X öster, +Z söder). */
  at: Vec2Tuple;
  /** Vägen eller huset det krockar med. */
  other?: string;
  role?: string;
  surface?: string;
  /** Hur långt in, meter (när det går att säga). */
  depthM?: number;
  /** Hur lång bit av en rutt, meter. */
  lengthM?: number;
  note?: string;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const pt = (p: readonly number[]): Vec2Tuple => [r2(p[0]), r2(p[1])];

function overlapConflict(kind: ConflictKind, subject: string, o: RoadOverlap): Conflict {
  return { kind, subject, at: pt(o.at), other: `${o.wayId}${o.name ? ` (${o.name})` : ''}`, role: o.role, surface: o.surface, depthM: r2(o.depthM) };
}

// ---------- Husen som ritas ----------

export interface RenderedFootprint { id: string; source: 'building' | 'outbuilding'; poly: Vec2Tuple[] }

let footprintCache: RenderedFootprint[] | null = null;

/** Husens fot som spelaren ser dem: OSM- och syntetiska hus (utom de dolda) och uthusen. */
export function renderedFootprints(): RenderedFootprint[] {
  if (footprintCache) return footprintCache;
  const out: RenderedFootprint[] = [];
  for (const b of WORLD.buildings) {
    if (b.poly.length < 3 || BUILDINGS_ON_ROADS.has(b.id)) continue;
    out.push({ id: b.id, source: 'building', poly: b.poly });
    const shed = outbuildingFootprint(b);
    if (shed) out.push({ id: `${b.id}:uthus`, source: 'outbuilding', poly: shed });
  }
  return (footprintCache = out);
}

/** Uthusets fot (OsmProceduralOutbuildings: 3,6 × 3,0 m eller 5,6 × 4,2 m, rotation −obb.angle). */
export function outbuildingFootprint(b: RawBuilding): Vec2Tuple[] | null {
  const placement = outbuildingPlacementFor(b);
  if (!placement) return null;
  return outbuildingFootprintAt(placement.wx, placement.wz, orientedBbox(b.poly).angle, placement.size);
}

// Rutnät över husens fot, för bilarnas prov.
const CELL = 24;
let footGrid: Map<string, number[]> | null = null;
function footprintsNear(x: number, z: number, r: number): RenderedFootprint[] {
  const all = renderedFootprints();
  if (!footGrid) {
    footGrid = new Map();
    all.forEach((f, k) => {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [px, pz] of f.poly) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz); }
      for (let ix = Math.floor(minX / CELL); ix <= Math.floor(maxX / CELL); ix++) for (let iz = Math.floor(minZ / CELL); iz <= Math.floor(maxZ / CELL); iz++) {
        const key = `${ix}:${iz}`;
        const l = footGrid!.get(key);
        if (l) l.push(k); else footGrid!.set(key, [k]);
      }
    });
  }
  const seen = new Set<number>();
  const out: RenderedFootprint[] = [];
  for (let ix = Math.floor((x - r) / CELL); ix <= Math.floor((x + r) / CELL); ix++) for (let iz = Math.floor((z - r) / CELL); iz <= Math.floor((z + r) / CELL); iz++) {
    for (const k of footGrid.get(`${ix}:${iz}`) ?? []) if (!seen.has(k)) { seen.add(k); out.push(all[k]); }
  }
  return out;
}

// ---------- 1. Husen ----------

export function auditHouses(): Conflict[] {
  const out: Conflict[] = [];
  for (const f of renderedFootprints()) {
    for (const o of roadOverlapsForPolygon(f.poly)) {
      if (o.depthM <= ON_ROAD_TOLERANCE_M) continue;
      out.push(overlapConflict(f.source === 'building' ? 'house-on-road' : 'outbuilding-on-road', f.id, o));
    }
  }
  return out;
}

// ---------- 2. Bilarna ----------

const SAMPLE_M = 1;

interface CarSample { x: number; z: number; heading: number }

function checkCarPath(subject: string, samples: CarSample[], body: { w: number; l: number }): Conflict[] {
  // Sammanhängande sträckor med samma fel blir en konflikt (med längden).
  const out: Conflict[] = [];
  let open: Conflict | null = null;
  let openKind: ConflictKind | null = null;
  const flush = () => { if (open) out.push(open); open = null; openKind = null; };
  for (const s of samples) {
    const quads = roadQuadsAt(s.x, s.z).filter((q) => q.surface === 'carriageway');
    const onCar = quads.some((q) => !q.piece.ped);
    const onPed = quads.find((q) => q.piece.ped);
    let kind: ConflictKind | null = null;
    let other: string | undefined;
    let role: string | undefined;
    if (!onCar) {
      kind = onPed ? 'car-on-footpath' : 'car-off-car-road';
      if (onPed) { other = `${onPed.piece.wayId}${onPed.piece.road.name ? ` (${onPed.piece.road.name})` : ''}`; role = onPed.piece.role; }
    }
    const fp = boxFootprint(s.x, s.z, s.heading, body.w, body.l);
    const hit = footprintsNear(s.x, s.z, body.l).find((f) => polygonsOverlap(fp, f.poly));
    if (hit) { kind = 'car-through-building'; other = hit.id; role = hit.source; }
    if (kind && open && openKind === kind && open.other === other) {
      open.lengthM = r2((open.lengthM ?? 0) + SAMPLE_M);
      continue;
    }
    flush();
    if (kind) { open = { kind, subject, at: pt([s.x, s.z]), other, role, lengthM: SAMPLE_M }; openKind = kind; }
  }
  flush();
  return out;
}

/** Byns bilar och bussen (VillageLife spawnCar, spawnBus): rutterna i bilnätet. */
export function villageLifeRoutes(): Array<{ id: string; route: Vec2Tuple[]; body: { w: number; l: number } }> {
  const d = driveNetwork();
  const src = villageSources();
  const out: Array<{ id: string; route: Vec2Tuple[]; body: { w: number; l: number } }> = [];
  src.driveEntry.forEach((e, i) => out.push({ id: `byns-bil:infart-${i}→parkeringen`, route: routeBetween(d, e, src.driveParking) as Vec2Tuple[], body: { w: 1.8, l: 4.3 } }));
  out.push({ id: 'bussen:infart-0→hållplatsen', route: routeBetween(d, src.driveEntry[0], src.driveBusStop) as Vec2Tuple[], body: { w: 2.6, l: 10 } });
  return out;
}

function sampleRoute(route: Vec2Tuple[]): CarSample[] {
  const L = routeLength(route);
  const out: CarSample[] = [];
  for (let s = 0; s <= L; s += SAMPLE_M) {
    const p = pointAlong(route, s);
    // VillageLife: rotation.y = heading (atan2(dx, dz)), lådan längs lokala z.
    out.push({ x: p.x, z: p.z, heading: p.heading });
  }
  return out;
}

export function auditVillageLifeCars(): Conflict[] {
  const out: Conflict[] = [];
  for (const r of villageLifeRoutes()) out.push(...checkCarPath(r.id, sampleRoute(r.route), r.body));
  return out;
}

function walkPolyline(poly: Vec2Tuple[]): Array<{ x: number; z: number; yaw: number }> {
  const out: Array<{ x: number; z: number; yaw: number }> = [];
  const L = polylineLength(poly);
  const n = Math.max(1, Math.ceil(L / SAMPLE_M));
  let seg = 1;
  let acc = 0;
  for (let i = 0; i <= n; i++) {
    const target = Math.min(L, (i / n) * L);
    while (seg < poly.length - 1 && acc + Math.hypot(poly[seg][0] - poly[seg - 1][0], poly[seg][1] - poly[seg - 1][1]) < target) {
      acc += Math.hypot(poly[seg][0] - poly[seg - 1][0], poly[seg][1] - poly[seg - 1][1]);
      seg++;
    }
    const a = poly[seg - 1];
    const b = poly[seg];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const f = len === 0 ? 0 : Math.max(0, Math.min(1, (target - acc) / len));
    out.push({ x: a[0] + dx * f, z: a[1] + dz * f, yaw: Math.atan2(dx, dz) });
  }
  return out;
}

/** Trafiken (OsmTraffic): varje väg i varje fordonsslags pool, åt båda hållen med körfältets förskjutning. */
export function auditTraffic(): Conflict[] {
  const out: Conflict[] = [];
  const done = new Set<string>();
  for (const kind of Object.keys(KIND_CONFIG) as VehicleKind[]) {
    const cfg = KIND_CONFIG[kind];
    for (const road of eligibleRoads(kind)) {
      const key = `${road.id}|${cfg.size[0]}|${cfg.size[2]}`;
      if (done.has(key)) continue;
      done.add(key);
      const lane = vehicleLaneOffset(road, cfg.size[0]);
      // samplePolyline (world.ts) går längs linjen: punkten och segmentets
      // riktning (yaw = atan2(dx, dz)). Samma sak här, ett segment i taget.
      const along = walkPolyline(road.poly);
      for (const dir of [1, -1] as const) {
        const samples: CarSample[] = [];
        for (const p of along) {
          const offX = -Math.cos(p.yaw) * lane * dir;
          const offZ = Math.sin(p.yaw) * lane * dir;
          samples.push({ x: p.x + offX, z: p.z + offZ, heading: p.yaw + (dir === -1 ? Math.PI : 0) });
        }
        out.push(...checkCarPath(`trafik:${kind}:${road.id}:${dir > 0 ? 'fram' : 'bak'}`, samples, { w: cfg.size[0], l: cfg.size[2] }));
      }
    }
  }
  return out;
}

/** Leveransbilen (DeliveryVan): rakt från deliveryApproach till deliveryBay, 3,0 × 1,8 m längs rummets axel. */
export function auditDeliveryVan(): Conflict[] {
  const layout = computePlayerBusinessInterior();
  if (!layout) return [];
  // DeliveryVan: på gatan bakom krogen (deliveryStop) när det finns en, annars
  // rakt från deliveryApproach till deliveryBay längs rummets axel.
  const stop = deliveryStop(layout);
  const [ax, az] = stop ? stop.approach : layout.deliveryApproach;
  const [bx, bz] = stop ? stop.bay : layout.deliveryBay;
  const rot = stop ? stop.rotationY : -layout.worldAngle;
  const L = Math.hypot(bx - ax, bz - az);
  const samples: CarSample[] = [];
  // Lådan: längden 3,0 m längs lokala x, bredden 1,8 m längs lokala z.
  for (let s = 0; s <= L + 1e-6; s += SAMPLE_M) {
    const t = L > 0 ? Math.min(1, s / L) : 1;
    samples.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, heading: rot });
  }
  return checkCarPath('leveransbilen', samples, { w: 3.0, l: 1.8 });
}

// ---------- 3. Vinbaren ----------

export interface WineBarAudit {
  buildingId: string;
  room: { centre: Vec2Tuple; width: number; depth: number; angle: number; corners: Vec2Tuple[] };
  entrance: Vec2Tuple;
  facing: { hit: string | null; role: string | null; distanceM: number | null; blockedBy: string | null };
  conflicts: Conflict[];
}

const FACING_MAX_M = 30;

export function auditWineBar(): WineBarAudit | null {
  const layout = computePlayerBusinessInterior();
  if (!layout) return null;
  const b = layout.building;
  const obb = playerObb(b);
  const size = roomSizeFor('vinbaren', obb.w, obb.d);
  // WineBarScene: group.position = centre, rotation.y = −angle, bredden längs lokala x.
  const corners = boxFootprint(obb.centre[0], obb.centre[1], -obb.angle, size.width, size.depth);
  const conflicts: Conflict[] = [];
  // Rummet innanför husets fot: hörnen inne och inga kanter som går ut.
  for (const c of corners) {
    if (!pointInPolygon(b.poly, c[0], c[1])) {
      const d = Math.min(...ringEdges(b.poly).map(([p, q]) => distSeg(c, p, q)));
      conflicts.push({ kind: 'winebar-room-outside-building', subject: `vinbaren:${b.id}`, at: pt(c), depthM: r2(d), note: `rummet ${r2(size.width)} × ${r2(size.depth)} m, huset (OBB) ${r2(obb.w)} × ${r2(obb.d)} m` });
    }
  }
  for (const o of roadOverlapsForPolygon(corners)) {
    if (o.depthM <= ON_ROAD_TOLERANCE_M) continue;
    conflicts.push(overlapConflict('winebar-room-on-road', `vinbaren:${b.id}`, o));
  }
  for (const f of footprintsNear(obb.centre[0], obb.centre[1], 15)) {
    if (f.id === b.id) continue;
    if (polygonsOverlap(corners, f.poly)) conflicts.push({ kind: 'winebar-room-in-neighbour', subject: `vinbaren:${b.id}`, at: pt(obb.centre), other: f.id });
  }
  const entrance = layout.entrance as Vec2Tuple;
  if (!pointInPolygon(b.poly, entrance[0], entrance[1])) {
    conflicts.push({ kind: 'winebar-entrance-outside-building', subject: `vinbaren:${b.id}`, at: pt(entrance) });
  }
  // Entrén vetter mot lokala +X. Gå ut från entrén: den första ytan efter
  // husets egen vägg ska vara en gata eller ett torg (en ritad vägbit), inte
  // ett annat hus.
  const dir: Vec2Tuple = [Math.cos(obb.angle), Math.sin(obb.angle)];
  const facing: WineBarAudit['facing'] = { hit: null, role: null, distanceM: null, blockedBy: null };
  for (let s = 0; s <= FACING_MAX_M; s += 0.25) {
    const x = entrance[0] + dir[0] * s;
    const z = entrance[1] + dir[1] * s;
    if (pointInPolygon(b.poly, x, z)) continue;
    const other = footprintsNear(x, z, 1).find((f) => f.id !== b.id && pointInPolygon(f.poly, x, z));
    if (other) { facing.blockedBy = other.id; facing.distanceM = r2(s); break; }
    const q = roadQuadsAt(x, z)[0];
    if (q) { facing.hit = `${q.piece.wayId}${q.piece.road.name ? ` (${q.piece.road.name})` : ''}`; facing.role = q.piece.role; facing.distanceM = r2(s); break; }
  }
  if (!facing.hit) {
    conflicts.push({ kind: 'winebar-entrance-not-facing-street', subject: `vinbaren:${b.id}`, at: pt(entrance), other: facing.blockedBy ?? undefined, note: facing.blockedBy ? `ett hus står ${facing.distanceM} m framför entrén` : `ingen gata inom ${FACING_MAX_M} m` });
  }
  return {
    buildingId: b.id,
    room: { centre: pt(obb.centre), width: r2(size.width), depth: r2(size.depth), angle: r2(obb.angle), corners: corners.map(pt) },
    entrance: pt(entrance),
    facing,
    conflicts
  };
}

function distSeg(p: Vec2Tuple, a: Vec2Tuple, b: Vec2Tuple): number {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L = dx * dx + dz * dz;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}

// ---------- 4. Rivalerna och vagnarna ----------

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function auditRivals(): Conflict[] {
  const out: Conflict[] = [];
  const places = venuePlaces();
  for (const [id, bid] of Object.entries(VENUE_BUILDINGS)) {
    const b = WORLD.buildings.find((x) => x.id === bid);
    if (!b || BUILDINGS_ON_ROADS.has(bid)) {
      out.push({ kind: 'rival-building-missing', subject: id, at: pt(places[id]?.centre ?? [0, 0]), other: bid, note: b ? 'huset döljs (BUILDINGS_ON_ROADS)' : 'huset finns inte i WORLD' });
      continue;
    }
    for (const o of roadOverlapsForPolygon(b.poly)) {
      if (o.depthM <= ON_ROAD_TOLERANCE_M) continue;
      out.push(overlapConflict('rival-building-on-road', `${id}:${bid}`, o));
    }
    const lamp = venueLampPoint(places[id]);
    const over = roadQuadsAt(lamp[0], lamp[1]).find((q) => q.surface === 'carriageway');
    if (over) out.push({ kind: 'rival-lamp-over-carriageway', subject: id, at: pt(lamp), other: `${over.piece.wayId}${over.piece.road.name ? ` (${over.piece.road.name})` : ''}`, role: over.piece.role, note: 'lyktan och skenet vid dörren (VillageVenues) hänger över körbanan' });
  }
  return out;
}

export interface TruckStand { truck: string; day: Weekday; spot: string; k: number; footprint: Vec2Tuple[]; centre: Vec2Tuple }

/** Varje kväll en vagn har öppet: platsen ur truckSchedule, ordningen som VillageVenues (venuesTonight-ordningen). */
export function truckStands(): TruckStand[] {
  const out: TruckStand[] = [];
  const trucks = VILLAGE.rivals.filter((r) => r.kind === 'truck');
  for (const day of WEEKDAYS) {
    const open = trucks.filter((t) => t.openDays.includes(day));
    for (const t of open) {
      const spot = VILLAGE.truckSchedule[day]?.[t.id];
      if (!spot) continue;
      const same = open.filter((o) => VILLAGE.truckSchedule[day]?.[o.id] === spot);
      const k = same.findIndex((o) => o.id === t.id);
      const { footprint, centre } = truckFootprint(spot, k);
      out.push({ truck: t.id, day, spot, k, footprint, centre });
    }
  }
  return out;
}

function truckFootprint(spot: TruckSpot, k: number): { footprint: Vec2Tuple[]; centre: Vec2Tuple } {
  const at = truckPlacement(spot, k);
  // Lådan: bredd TRUCK_BODY.width, längs lokala z från zMin till zMax.
  const len = TRUCK_BODY.zMax - TRUCK_BODY.zMin;
  return { footprint: boxFootprint(at.x, at.z, at.rotationY, TRUCK_BODY.width, len, (TRUCK_BODY.zMax + TRUCK_BODY.zMin) / 2), centre: pt([at.x, at.z]) };
}

/**
 * Vagnarna på varje plats: den första och den andra (k = 0 och 1). Schemat
 * ställer aldrig två vagnar på samma plats, men en människas rival väljer
 * platsen själv (RivalPlan.spot), så båda prövas.
 */
export function auditTrucks(): Conflict[] {
  const out: Conflict[] = [];
  for (const spot of VILLAGE.truckSpots) {
    for (const k of [0, 1]) {
      const { footprint, centre } = truckFootprint(spot, k);
      const subject = `vagn@${spot}${k ? '#2' : ''}`;
      for (const o of roadOverlapsForPolygon(footprint)) {
        if (o.depthM <= ON_ROAD_TOLERANCE_M) continue;
        out.push(overlapConflict('truck-on-road', subject, o));
      }
      const hit = footprintsNear(centre[0], centre[1], 8).find((f) => polygonsOverlap(footprint, f.poly));
      if (hit) out.push({ kind: 'truck-in-building', subject, at: centre, other: hit.id });
      if (footprint.some((p) => inAnyWater(p[0], p[1]))) out.push({ kind: 'truck-in-water', subject, at: centre });
    }
  }
  // ORDER 315b del 2 — spelarens släpvagn och trädäcket (playerTruckFootprints):
  // inte på vägen, inte i ett hus, och inte i rivalernas vagnar på torget (båda
  // står där samma kväll).
  const mineFeet = playerTruckFootprints();
  // ORDER 319c — och föremålen på uteserveringen och vid luckan (Designs D9 truckProps.ts).
  const parts: (readonly [string, (readonly number[])[]])[] = [['spelarens vagn', mineFeet.body], ['spelarens trädäck', mineFeet.deck], ...playerTruckPropFootprints().map((p) => ['spelarens ' + p.name, p.poly] as const)];
  for (const [part, poly] of parts) {
    const footprint = poly.map((p) => pt(p));
    const centre = pt([poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length]);
    for (const o of roadOverlapsForPolygon(footprint)) if (o.depthM > ON_ROAD_TOLERANCE_M) out.push(overlapConflict('truck-on-road', part, o));
    const inHouse = footprintsNear(centre[0], centre[1], 8).find((f) => polygonsOverlap(footprint, f.poly));
    if (inHouse) out.push({ kind: 'truck-in-building', subject: part, at: centre, other: inHouse.id });
    for (const k of [0, 1]) {
      if (polygonsOverlap(footprint, truckFootprint('torget', k).footprint)) out.push({ kind: 'truck-in-building', subject: part, at: centre, other: `vagn@torget${k ? '#2' : ''}` });
    }
  }
  return out;
}

// ---------- Allt ----------

export interface OnRoadReport {
  toleranceM: number;
  counts: Record<string, number>;
  conflicts: Conflict[];
  wineBar: WineBarAudit | null;
  truckStands: Array<Omit<TruckStand, 'footprint'>>;
  /** ORDER 312b: leveransbilens stopp (business/deliveryStop.ts) och gatan det står på. */
  deliveryStop: { bay: Vec2Tuple; approach: Vec2Tuple; street: string | null } | null;
  checked: { renderedFootprints: number; outbuildings: number; trafficRoads: number; villageLifeRoutes: number };
}

export function auditOnRoad(): OnRoadReport {
  const wineBar = auditWineBar();
  const conflicts = [
    ...auditHouses(),
    ...(wineBar?.conflicts ?? []),
    ...auditRivals(),
    ...auditTrucks(),
    ...auditVillageLifeCars(),
    ...auditTraffic(),
    ...auditDeliveryVan()
  ];
  const counts: Record<string, number> = {};
  for (const c of conflicts) counts[c.kind] = (counts[c.kind] ?? 0) + 1;
  const fps = renderedFootprints();
  return {
    toleranceM: ON_ROAD_TOLERANCE_M,
    counts,
    conflicts,
    wineBar,
    truckStands: truckStands().map(({ footprint: _f, ...rest }) => rest),
    deliveryStop: (() => {
      const layout = computePlayerBusinessInterior();
      const stop = layout ? deliveryStop(layout) : null;
      if (!stop) return null;
      const q = roadQuadsAt(stop.bay[0], stop.bay[1]).find((x) => x.surface === 'carriageway');
      return { bay: pt(stop.bay), approach: pt(stop.approach), street: q?.piece.road.name ?? null };
    })(),
    checked: {
      renderedFootprints: fps.filter((f) => f.source === 'building').length,
      outbuildings: fps.filter((f) => f.source === 'outbuilding').length,
      trafficRoads: new Set((Object.keys(KIND_CONFIG) as VehicleKind[]).flatMap((k) => eligibleRoads(k).map((r) => r.id))).size,
      villageLifeRoutes: villageLifeRoutes().length
    }
  };
}
