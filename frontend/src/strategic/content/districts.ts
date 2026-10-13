// ORDER 332 D — kvarterens områden i spelet: polygonerna ur gatorna (districtBorders.ts) och spelets vägar
// (WORLD.roads = grythyttan-world.json:s vägar). Scenen läser kvarteret här: namnen på nivån Byn
// (scene/village/DistrictLabels.tsx) och gästerna på gatan per kvarter (scene/village/districtStreet.ts).
// Bilden för Anders (scripts/order332-kvarteren.mjs) bygger polygonerna med samma funktion ur samma vägar.

import type { DistrictId } from '../../sim/districts';
import { DISTRICT_IDS } from '../../sim/districts';
import { buildDistrictPolys, districtIn, type BuiltDistrict } from './districtBorders';
import { WORLD } from './world';

export const DISTRICT_AREAS: Record<DistrictId, BuiltDistrict> = buildDistrictPolys(WORLD.roads);

/** Kvarteret en punkt i byn ligger i (byns meter, +x österut, +z söderut), eller null utanför kvarteren. */
export function districtAt(x: number, z: number): DistrictId | null {
  return districtIn(DISTRICT_AREAS, x, z);
}

export { DISTRICT_IDS };
