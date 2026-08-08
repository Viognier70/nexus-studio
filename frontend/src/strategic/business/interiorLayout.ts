// Shared layout helper for the player business interior.
//
// PlayerBusiness renders the walls, roof and stub interior (bar strip,
// tables, entrance step). InteriorGuests renders the live simulation's
// guests inside the same volume, one puck per seat.  Both need one
// canonical layout so they cannot drift.
//
// Coordinate discipline (from ORDER 042 §3.2 APPROXIMATION_REGISTER
// entries 5 & 6): everything here derives from the polygon's oriented
// bounding box, not its axis-aligned bbox.  The player business is a
// real OSM footprint (w869907975, ~11.8 × 15.6 m, rotated ~7° east of
// world north); an AABB-based layout places the bar diagonally through
// the room and the reducer's declared capacity has no relationship to
// what the room actually holds.  Here the tables, bar and seat
// positions are computed in the OBB's local frame and mapped to world
// coords via obbLocalToWorld, so they stay parallel to the actual
// walls when the building swaps.
//
// Seat model.  The mix is compile-time fixed (Option 1: 4× 2-top +
// 1× 4-top + 4 bar stools = 16 covers) per Vision Owner approval
// 2026-08-08.  TOTAL_SEATS below is the single source of truth for
// the reducer's DEFAULT_POLICIES.capacity.

import { useMemo } from 'react';
import { PLAYER_BUSINESS_BUILDING_IDS, WORLD } from '../content/world';
import type { RawBuilding } from '../content/world';
import { obbLocalToWorld, orientedBbox } from '../procgen/geom';
import type { OBB } from '../procgen/geom';

// ---------- Compile-time layout constants ----------
// Every measurement below is metres in the OBB local frame:
//   local +X runs along the long axis of the building
//   local +Z runs across the short axis
//   local origin is the polygon centroid
// obbLocalToWorld() rotates and translates these into world XZ.

const BAR_WIDTH_M = 1.6;         // strip depth (across the room)
const BAR_OFFSET_M = 0.6;        // gap between bar's rear edge and wall
const BAR_LENGTH_FRAC = 0.7;     // fraction of the room's long axis
const STOOL_OFFSET_M = 0.5;      // stool front vs bar front edge
const TABLE_ROW_Z = 3.0;         // table row centre, opposite side from bar
const TABLE_HALF_SPAN_X = 5.0;   // outermost table centres at local ±5
// 2-top vs 4-top: the size delta reads legibly from bird's-eye. A
// smaller delta (e.g. 1.05 vs 1.35) reads as five uniform tables from
// altitude and the mix gets miscounted; 1.05 vs 1.7 makes the 4-top
// unambiguous.
const TWOTOP_SIZE_M = 1.05;
const FOURTOP_SIZE_M = 1.7;
const SEAT_STANDOFF_M = 0.7;     // chair centre offset from table centre
const ENTRANCE_INSET_M = 0.6;    // distance from the entrance-wall inward
const WAITING_STANDOFF_M = 2.5;  // waiting-spot distance outside the door

// Table mix — the seat sum is exported as TOTAL_SEATS and consumed by
// the simulation reducer.  Adding or removing a table here changes the
// reducer's default capacity automatically.
export type TableKind = 'two' | 'four';

interface TableSpec {
  id: string;
  kind: TableKind;
  seats: number;
  localCentre: [number, number];   // (localX, localZ)
  sizeM: number;                   // rendered box side
}

// Five tables in a row along the long axis, opposite the bar:
// two-top | two-top | four-top (centre) | two-top | two-top
const TABLE_SPECS: readonly TableSpec[] = [
  { id: 't0', kind: 'two',  seats: 2, localCentre: [-TABLE_HALF_SPAN_X,       TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M },
  { id: 't1', kind: 'two',  seats: 2, localCentre: [-TABLE_HALF_SPAN_X / 2,   TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M },
  { id: 't2', kind: 'four', seats: 4, localCentre: [ 0,                        TABLE_ROW_Z], sizeM: FOURTOP_SIZE_M },
  { id: 't3', kind: 'two',  seats: 2, localCentre: [ TABLE_HALF_SPAN_X / 2,    TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M },
  { id: 't4', kind: 'two',  seats: 2, localCentre: [ TABLE_HALF_SPAN_X,        TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M }
] as const;

const BAR_STOOL_LOCAL_X: readonly number[] = [-3, -1, 1, 3];
const BAR_STOOL_COUNT = BAR_STOOL_LOCAL_X.length;

// ORDER 043 §6 ecological anchor placement. Bay sits 2 m outside the
// -X wall (opposite the entrance); approach 15 m beyond the bay, so
// the van has room to drive up and reverse. Local Z = 0 keeps the
// approach along the OBB centre line — the van comes straight in.
const DELIVERY_BAY_OFFSET_M = 2;
const DELIVERY_APPROACH_OFFSET_M = 15;

// Compile-time seat count — single source of truth for reducer capacity.
export const TOTAL_SEATS: number =
  TABLE_SPECS.reduce((n, t) => n + t.seats, 0) + BAR_STOOL_COUNT;

// ---------- Runtime layout (derived from the OSM polygon) ----------

export interface TableLayout {
  id: string;
  kind: TableKind;
  seats: number;
  worldPosition: [number, number];       // XZ centre
  worldAngle: number;                    // OBB rotation (radians); mesh rotation-Y = -angle
  sizeM: number;                         // rendered box side
  seatWorldPositions: [number, number][];// one entry per seat
}

export interface BarStrip {
  worldPosition: [number, number];
  worldAngle: number;
  lengthM: number;                       // along OBB local +X
  widthM: number;                        // along OBB local +Z
}

export interface InteriorLayout {
  building: RawBuilding;
  obb: OBB;
  centre: [number, number];              // world XZ (= obb.centre)
  width: number;                         // OBB w (long axis)
  depth: number;                         // OBB d (short axis)
  worldAngle: number;                    // OBB angle
  tables: TableLayout[];
  bar: BarStrip;
  barStoolPositions: [number, number][]; // world XZ per bar stool
  entrance: [number, number];            // world XZ, inside the entrance wall
  waitingSpot: [number, number];         // world XZ, outside the entrance
  // ORDER 043 §6 ecological anchor. Delivery bay sits at the opposite
  // end of the OBB long axis from the entrance — physically at the
  // "back" of the building where suppliers arrive, thematically the
  // far side of the room from the guest queue.
  deliveryBay: [number, number];         // world XZ where the van parks
  deliveryApproach: [number, number];    // world XZ ~15 m off the bay, where the van enters/exits
  // Flat list of every seat in the room, indexed by the reducer's
  // seatIndex.  Order: table 0 seats, table 1 seats, ..., bar stools.
  seats: [number, number][];
  totalSeats: number;                    // = TOTAL_SEATS (runtime echo)
}

function findPlayerBuilding(): RawBuilding | null {
  const targetId = [...PLAYER_BUSINESS_BUILDING_IDS][0];
  if (!targetId) return null;
  return WORLD.buildings.find((b) => b.id === targetId) ?? null;
}

// Seat positions around a table, in local frame.
// 2-tops seat guests facing each other along the local X axis (parallel
// to the long wall of the room).  4-tops seat one on each side of the
// square.
function localSeatOffsets(kind: TableKind): [number, number][] {
  if (kind === 'two') {
    return [
      [-SEAT_STANDOFF_M, 0],
      [ SEAT_STANDOFF_M, 0]
    ];
  }
  return [
    [-SEAT_STANDOFF_M,  0],
    [ SEAT_STANDOFF_M,  0],
    [ 0, -SEAT_STANDOFF_M],
    [ 0,  SEAT_STANDOFF_M]
  ];
}

export function computePlayerBusinessInterior(): InteriorLayout | null {
  const building = findPlayerBuilding();
  if (!building) return null;

  const obb = orientedBbox(building.poly);
  const halfW = obb.w / 2;
  const halfD = obb.d / 2;

  // Bar strip — along the -Z wall (one of the two long walls), running
  // the length of the room's long axis.
  const barLocalZ = -halfD + BAR_OFFSET_M + BAR_WIDTH_M / 2;
  const barLength = obb.w * BAR_LENGTH_FRAC;
  const barCentreWorld = obbLocalToWorld(obb, 0, barLocalZ);
  const bar: BarStrip = {
    worldPosition: barCentreWorld,
    worldAngle: obb.angle,
    lengthM: barLength,
    widthM: BAR_WIDTH_M
  };

  // Bar stools sit on the +Z side of the bar (facing the tables),
  // offset by STOOL_OFFSET_M from the bar's front edge.
  const stoolLocalZ = barLocalZ + BAR_WIDTH_M / 2 + STOOL_OFFSET_M;
  const barStoolPositions: [number, number][] = BAR_STOOL_LOCAL_X.map((lx) =>
    obbLocalToWorld(obb, lx, stoolLocalZ)
  );

  // Tables — for each spec, compute world position + per-seat world
  // positions in one pass so the flat seat array stays in step.
  const tables: TableLayout[] = TABLE_SPECS.map((spec) => {
    const [tlx, tlz] = spec.localCentre;
    const worldPosition = obbLocalToWorld(obb, tlx, tlz);
    const seatWorldPositions = localSeatOffsets(spec.kind).map(([dx, dz]) =>
      obbLocalToWorld(obb, tlx + dx, tlz + dz)
    );
    return {
      id: spec.id,
      kind: spec.kind,
      seats: spec.seats,
      worldPosition,
      worldAngle: obb.angle,
      sizeM: spec.sizeM,
      seatWorldPositions
    };
  });

  // Flat seat list — reducer's seatIndex maps here directly.
  const seats: [number, number][] = [
    ...tables.flatMap((t) => t.seatWorldPositions),
    ...barStoolPositions
  ];

  // Entrance at the +X end of the OBB — for w869907975 this is the
  // Torget-facing north side (verified 2026-08-08).  For a building
  // swap this heuristic may need re-verification; a future order can
  // encode the entrance side in the building record itself.
  const entrance = obbLocalToWorld(obb, halfW - ENTRANCE_INSET_M, 0);
  const waitingSpot = obbLocalToWorld(obb, halfW + WAITING_STANDOFF_M, 0);
  // Delivery bay at the -X end (opposite the entrance).  For w869907975
  // this is the "back" of the building.  Approach 15 m further out.
  const deliveryBay = obbLocalToWorld(obb, -halfW - DELIVERY_BAY_OFFSET_M, 0);
  const deliveryApproach = obbLocalToWorld(
    obb,
    -halfW - DELIVERY_BAY_OFFSET_M - DELIVERY_APPROACH_OFFSET_M,
    0
  );

  return {
    building,
    obb,
    centre: obb.centre,
    width: obb.w,
    depth: obb.d,
    worldAngle: obb.angle,
    tables,
    bar,
    barStoolPositions,
    entrance,
    waitingSpot,
    deliveryBay,
    deliveryApproach,
    seats,
    totalSeats: TOTAL_SEATS
  };
}

export function usePlayerBusinessInterior(): InteriorLayout | null {
  return useMemo(() => computePlayerBusinessInterior(), []);
}
