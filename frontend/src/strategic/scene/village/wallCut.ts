// ORDER 333 E — väggarna på byns hus nära vagnen kapas vid krogens nivå (Z), så att vagnen och kön syns (avsnitt 8
// punkt 5; Designs D15 LEVERANSNOT "Väggarna inom 12 m från vagnen kapas vid Z", kvarterRita.js buildSurroundings
// cutR/cutTo och updateSurroundings). Samma princip som taken: husets väggar går från sin höjd ned till 1,6 m medan
// taket tonar ut (village/roofBlend.ts roofAt, 40 → 26 m), och taket, listerna och fönstren på huset döljs när
// väggarna är kapade (roofAt under CUT_BELOW). Över 40 m står husen som förut.
// Mitten är vagnens på kvällens plats; lokalerna (ORDER 333 D) använder samma mekanism med lokalens hus som mitt.
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD, type Vec2Tuple } from '../../content/world';
import { drawnOsmBuildings } from '../OsmBuildings';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { playerPremisesOf, playerTruckSpotOf } from '../../../sim/districts';
import { premisesBuilding } from '../../content/playerPremises';
import { useSimState } from '../../simulation/SimulationProvider';
import type { SimulationState } from '../../types';

/** D15: radien från vagnens mitt (12 m, LEVERANSNOT; prototypen 13 m) och höjden väggarna kapas till. */
export const WALL_CUT = { radiusM: 12, heightM: 1.6 } as const;

function segDist(p: readonly number[], a: readonly number[], b: readonly number[]): number {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
}

/** Avståndet från en punkt till en polygons kant (0 inuti räknas inte: huset runt mitten kapas också). */
export function distanceToPolygon(p: readonly number[], poly: readonly Vec2Tuple[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(p, poly[i], poly[(i + 1) % poly.length]));
  return d;
}

/** Byns hus inom radien från mitten: de som OsmBuildings ritar (drawnOsmBuildings, delarna av ett hus med flera flyglar
 *  var för sig, id med '#') och de som ProceduralFacades ritar (kartans id). Landmärkena i CraftedLandmarks och
 *  spelarens eget hus (LANDMARK_BUILDING_IDS) är handbyggda och kapas inte. */
export function wallCutIds(centre: readonly number[], radiusM: number = WALL_CUT.radiusM, exclude: ReadonlySet<string> = new Set()): Set<string> {
  const out = new Set<string>();
  for (const b of [...drawnOsmBuildings(), ...WORLD.buildings.filter((x) => !LANDMARK_BUILDING_IDS.has(x.id))]) {
    if (exclude.has(b.id) || exclude.has(b.id.split('#')[0])) continue;
    if (distanceToPolygon(centre, b.poly) < radiusM) out.add(b.id);
  }
  return out;
}

/** Mitten för kvällen: vagnens på platsen när verksamheten är foodtrucken, annars ingen (krogens rum har sitt eget). */
export function wallCutCentre(state: Pick<SimulationState, 'economy'>): { key: string; centre: Vec2Tuple; exclude: ReadonlySet<string> } | null {
  if (state.economy?.businessClass === 'foodtruck') {
    const spot = playerTruckSpotOf(state);
    const at = playerTruckPlacement(spot);
    return { key: `truck:${spot}`, centre: [at.x, at.z], exclude: new Set() };
  }
  // ORDER 333 D — vinbaren i en lokal: husen runt lokalen (lokalens eget hus är vinbarens skal och kapas av rummet).
  const premises = playerPremisesOf(state);
  const b = premises !== 'torget' && state.economy?.businessClass ? premisesBuilding(premises) : null;
  if (b) {
    const c = b.poly.reduce((a, p) => [a[0] + p[0] / b.poly.length, a[1] + p[1] / b.poly.length], [0, 0]) as unknown as Vec2Tuple;
    return { key: `premises:${premises}`, centre: c, exclude: new Set([b.id]) };
  }
  return null;
}

const NONE: ReadonlySet<string> = new Set();

/** Husen som kapas i kväll. Ändras när vagnen byter plats (eller verksamheten byts), inte med kameran. */
export function useWallCutIds(): ReadonlySet<string> {
  const sim = useSimState();
  const c = wallCutCentre(sim);
  const key = c?.key ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (c ? wallCutIds(c.centre, WALL_CUT.radiusM, c.exclude) : NONE), [key]);
}

/** Väggens höjd vid takets värde rk (1 = taket på, 0 = borta): som D15 updateSurroundings. */
export function cutWallHeight(fullM: number, rk: number): number {
  const to = Math.min(WALL_CUT.heightM, fullM);
  return to + (fullM - to) * rk;
}
