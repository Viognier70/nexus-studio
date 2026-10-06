import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import type { RawBuilding, Vec2Tuple } from '../content/world';
import { boxFootprint, polygonNearMapRoad, polygonsOverlap, roadOverlapsForPolygon } from '../content/roadSurface';
import {
  idHash,
  inAnyWater,
  nearAnyBuilding,
  obbLocalToWorld,
  orientedBbox,
  polygonArea,
  polygonBounds
} from './geom';

// Parcel-composition helpers layered on top of the geom primitives.
// Consumers use these to reason about "where does the outbuilding go
// for this parent" without duplicating the placement algorithm across
// four scene modules.

export const HOST_KINDS = new Set(['house', 'detached', 'residential']);

// Which OBB side the outbuilding ended up on for a given parent, or
// null if no outbuilding was placed. Matches the algorithm in
// OsmProceduralOutbuildings — kept in sync there.
export type OutbuildingSide = 'rear' | 'right' | 'left' | 'front';

interface Placement {
  side: OutbuildingSide;
  wx: number;
  wz: number;
  size: 'small' | 'medium';
}

// Uthusens mått (OsmProceduralOutbuildings ritar väggarna i de här måtten):
// bredd längs OBB:ns lokala x, djup längs lokala z, meter.
export const OUTBUILDING_SIZE: Record<Placement['size'], { w: number; d: number }> = {
  small: { w: 3.6, d: 3.0 },
  medium: { w: 5.6, d: 4.2 }
};

// ORDER 312 — ett uthus får inte stå på en väg eller i ett annat hus. Vägytan
// är den som OsmRoads ritar (content/roadSurface.ts: körbanan i ROLE_SPECS-
// bredd och trottoaren). Uthuset ska stå minst ROAD_GAP_M från vägytans kant,
// så att en bil i körfältet inte når det i en kurva.
const ROAD_GAP_M = 0.5;

/** Uthusets fot i byns ram: lådan i OUTBUILDING_SIZE, vriden som OBB:n (rotation.y = −angle). */
export function outbuildingFootprintAt(wx: number, wz: number, angle: number, size: Placement['size']): Vec2Tuple[] {
  const s = OUTBUILDING_SIZE[size];
  return boxFootprint(wx, wz, -angle, s.w, s.d);
}

function blocked(wx: number, wz: number, angle: number, size: Placement['size'], hostId: string): boolean {
  const s = OUTBUILDING_SIZE[size];
  const grown = boxFootprint(wx, wz, -angle, s.w + 2 * ROAD_GAP_M, s.d + 2 * ROAD_GAP_M);
  if (roadOverlapsForPolygon(grown).length > 0) return true;
  const foot = outbuildingFootprintAt(wx, wz, angle, size);
  // Inte heller i vägens lucka, där OsmRoads klippt bort remsan nära ett hus.
  if (polygonNearMapRoad(foot, ROAD_GAP_M)) return true;
  const fb = polygonBounds(foot);
  for (const other of WORLD.buildings) {
    if (other.id === hostId || other.poly.length < 3) continue;
    const ob = polygonBounds(other.poly);
    if (ob.maxX < fb.minX || ob.minX > fb.maxX || ob.maxZ < fb.minZ || ob.minZ > fb.maxZ) continue;
    if (polygonsOverlap(foot, other.poly)) return true;
  }
  return false;
}

// Cached per building id. Same value is used by
// OsmProceduralOutbuildings (as authoritative placement) and by
// OsmPropertyDetail / OsmYards (as an occupancy hint) so all three
// modules agree on where the shed sits.
const CACHE = new Map<string, Placement | null>();

export function outbuildingPlacementFor(b: RawBuilding): Placement | null {
  if (CACHE.has(b.id)) return CACHE.get(b.id) ?? null;
  const kind = b.kind ?? 'yes';
  if (LANDMARK_BUILDING_IDS.has(b.id) || !HOST_KINDS.has(kind)) {
    CACHE.set(b.id, null);
    return null;
  }
  const area = polygonArea(b.poly);
  if (area < 90) {
    CACHE.set(b.id, null);
    return null;
  }
  const hash = idHash(b.id + ':outbuilding');
  if (hash > 0.55) {
    CACHE.set(b.id, null);
    return null;
  }
  const obb = orientedBbox(b.poly);
  const size: Placement['size'] = hash < 0.15 ? 'medium' : 'small';
  const halfW = obb.w / 2;
  const halfD = obb.d / 2;
  const clearance = size === 'medium' ? 6.5 : 5.0;
  const candidates: Array<{ side: OutbuildingSide; lx: number; lz: number }> = [
    { side: 'rear',  lx: 0,                   lz: -halfD - clearance },
    { side: 'right', lx: halfW + clearance,   lz: 0 },
    { side: 'left',  lx: -halfW - clearance,  lz: 0 },
    { side: 'front', lx: 0,                   lz: halfD + clearance }
  ];
  for (const c of candidates) {
    const [wx, wz] = obbLocalToWorld(obb, c.lx, c.lz);
    if (nearAnyBuilding(wx, wz, b.id, 1.5)) continue;
    if (inAnyWater(wx, wz)) continue;
    if (blocked(wx, wz, obb.angle, size, b.id)) continue;
    const placement: Placement = { side: c.side, wx, wz, size };
    CACHE.set(b.id, placement);
    return placement;
  }
  CACHE.set(b.id, null);
  return null;
}

// Convenience: returns just the side, or null.
export function outbuildingSideFor(b: RawBuilding): OutbuildingSide | null {
  return outbuildingPlacementFor(b)?.side ?? null;
}

// Reset the cache — used only in unit tests / hot-reload scenarios
// where WORLD may have changed between renders. Not used in runtime.
export function _resetParcelCache(): void {
  CACHE.clear();
}

// Kept re-exported so consumers can import HOST_KINDS from one place
// instead of re-declaring the set in every file.
export { WORLD };
