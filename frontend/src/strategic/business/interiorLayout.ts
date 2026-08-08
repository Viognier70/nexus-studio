// Shared layout helper for the player business interior.
//
// PlayerBusiness renders the walls, roof and stub interior. InteriorGuests
// renders the live simulation's guests inside the same volume. Both need
// the same centroid, table anchors and entrance marker; deriving them from
// the OSM polygon in one place keeps the two visuals aligned when the
// building swap in world.ts changes footprint.

import { useMemo } from 'react';
import { PLAYER_BUSINESS_BUILDING_IDS, WORLD } from '../content/world';
import type { RawBuilding } from '../content/world';

export interface InteriorLayout {
  building: RawBuilding;
  centre: [number, number];       // world XZ centroid
  bbox: { minX: number; maxX: number; minZ: number; maxZ: number };
  width: number;
  depth: number;
  tables: Array<[number, number]>;  // world XZ per-table anchor
  entrance: [number, number];       // world XZ at the south wall
  waitingSpot: [number, number];    // just outside the entrance
}

// Layout constants. The 2×3 = 6-table grid and 2.0 m X-spacing were
// inherited from PlayerBusiness.tsx's pre-refactor interior stub,
// which was authored for Candidate C (w869907963, 252 m² sit-down
// restaurant). The current player business is Candidate A
// (w869907975, ~146 m² café-scale, ~11.8 × 15.6 m outer envelope
// per Vision Owner measurement). These constants have not been
// re-verified for the smaller room; a future order should decide
// whether six 2-tops still read as a café floor plan at that
// footprint, or whether a smaller table count (a mix of 2-tops and
// 4-tops seating ~12–16 covers) would be more legible.
const BAR_WIDTH_M = 1.6;
const BAR_OFFSET_M = 0.6;
const TABLE_ROWS = 2;
const TABLE_COLS = 3;
const TABLE_SPACING_X = 2.0;
const ENTRANCE_INSET_M = 0.6;
const WAITING_STANDOFF_M = 2.5;

function findPlayerBuilding(): RawBuilding | null {
  const targetId = [...PLAYER_BUSINESS_BUILDING_IDS][0];
  if (!targetId) return null;
  return WORLD.buildings.find((b) => b.id === targetId) ?? null;
}

export function computePlayerBusinessInterior(): InteriorLayout | null {
  const building = findPlayerBuilding();
  if (!building) return null;

  const xs = building.poly.map((p) => p[0]);
  const zs = building.poly.map((p) => p[1]);
  const centreX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const centreZ = zs.reduce((a, b) => a + b, 0) / zs.length;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const width = maxX - minX;
  const depth = maxZ - minZ;

  const tableSpacingZ = depth / (TABLE_COLS + 1);
  const tables: Array<[number, number]> = [];
  for (let r = 0; r < TABLE_ROWS; r++) {
    for (let c = 0; c < TABLE_COLS; c++) {
      const x = minX + BAR_WIDTH_M + 1.6 + r * TABLE_SPACING_X;
      const z = minZ + (c + 1) * tableSpacingZ;
      tables.push([x, z]);
    }
  }

  const entrance: [number, number] = [centreX, maxZ - ENTRANCE_INSET_M];
  const waitingSpot: [number, number] = [centreX, maxZ + WAITING_STANDOFF_M];

  return {
    building,
    centre: [centreX, centreZ],
    bbox: { minX, maxX, minZ, maxZ },
    width,
    depth,
    tables,
    entrance,
    waitingSpot
  };
}

export function usePlayerBusinessInterior(): InteriorLayout | null {
  return useMemo(() => computePlayerBusinessInterior(), []);
}

export const BAR_STRIP = {
  widthM: BAR_WIDTH_M,
  offsetM: BAR_OFFSET_M
};
