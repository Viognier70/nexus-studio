// ORDER 333 E — väggarna på byns hus inom 12 m från vagnen kapas till 1,6 m vid Z (scene/village/wallCut.ts).
// Med WRITE_REPORTS=1 skrivs reports/order333/vaggarna.json: husen som kapas på varje plats.
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRUCK_SPOT_IDS } from '../../../sim/districts';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { drawnOsmBuildings } from '../OsmBuildings';
import { LANDMARK_BUILDING_IDS, WORLD } from '../../content/world';
import { cutWallHeight, distanceToPolygon, wallCutCentre, wallCutIds, WALL_CUT } from '../village/wallCut';
import { roofAt } from '../../village/roofBlend';
import { BLEND } from '../../village/villageEvening';
import type { SimulationState } from '../../types';

const truckAt = (spot: (typeof TRUCK_SPOT_IDS)[number]) => ({ economy: { businessClass: 'foodtruck', truckSpot: spot } }) as unknown as Pick<SimulationState, 'economy'>;

describe('ORDER 333 E — väggarna nära vagnen', () => {
  it('D15:s tal: 12 m och 1,6 m', () => {
    expect(WALL_CUT).toEqual({ radiusM: 12, heightM: 1.6 });
  });

  it('väggen står hel över 40 m, är 1,6 m under 26 m, och ett lågt hus kapas inte under sin höjd', () => {
    expect(cutWallHeight(7, roofAt(BLEND.roof[1] + 1))).toBe(7);
    expect(cutWallHeight(7, roofAt(BLEND.roof[0] - 1))).toBeCloseTo(1.6, 9);
    expect(cutWallHeight(1.2, 0)).toBe(1.2);
  });

  it('mitten är vagnen på kvällens plats; krogens rum har sin egen mekanism', () => {
    for (const spot of TRUCK_SPOT_IDS) {
      const c = wallCutCentre(truckAt(spot));
      const at = playerTruckPlacement(spot);
      expect(c?.centre).toEqual([at.x, at.z]);
    }
    expect(wallCutCentre({ economy: { businessClass: 'vinbar' } } as unknown as Pick<SimulationState, 'economy'>)).toBeNull();
  });

  // Byns hus: OsmBuildings (drawnOsmBuildings) och ProceduralFacades (kartans hus utom landmärkena).
  const village = () => [...drawnOsmBuildings(), ...WORLD.buildings.filter((b) => !LANDMARK_BUILDING_IDS.has(b.id))];

  it('husen som kapas är byns hus inom 12 m, och bara de; landmärkena kapas inte', () => {
    const all = village();
    for (const spot of TRUCK_SPOT_IDS) {
      const at = playerTruckPlacement(spot);
      const ids = wallCutIds([at.x, at.z]);
      for (const b of all) expect([b.id, ids.has(b.id)]).toEqual([b.id, distanceToPolygon([at.x, at.z], b.poly) < 12]);
      for (const id of LANDMARK_BUILDING_IDS) expect(ids.has(id)).toBe(false);
    }
  });

  it.skipIf(!process.env.WRITE_REPORTS)('skriver reports/order333/vaggarna.json', () => {
    const all = village();
    const spots = Object.fromEntries(TRUCK_SPOT_IDS.map((spot) => {
      const at = playerTruckPlacement(spot);
      const ids = [...wallCutIds([at.x, at.z])];
      // Landmärkena inom radien, som inte kapas (rapporten redovisar dem).
      const landmarks = WORLD.buildings.filter((b) => LANDMARK_BUILDING_IDS.has(b.id) && distanceToPolygon([at.x, at.z], b.poly) < WALL_CUT.radiusM).map((b) => b.id);
      return [spot, { centre: [at.x, at.z], houses: ids.map((id) => ({ id, distanceM: Math.round(distanceToPolygon([at.x, at.z], all.find((b) => b.id === id)!.poly) * 100) / 100 })), landmarksNotCut: landmarks }];
    }));
    const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order333');
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, 'vaggarna.json'), JSON.stringify({
      definition: 'ORDER 333 E. Per plats: de ritade husen (drawnOsmBuildings och ProceduralFacades, utom landmärkena) vars kant ligger inom WALL_CUT.radiusM (12 m) från vagnens mitt (wallCut.ts wallCutIds). Väggarna går till 1,6 m när taket tonar ut (roofAt, 40 → 26 m).',
      radiusM: WALL_CUT.radiusM, heightM: WALL_CUT.heightM, spots
    }, null, 1) + '\n');
  });
});
