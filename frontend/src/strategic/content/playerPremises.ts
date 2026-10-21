// ORDER 333 D — var vinbaren står i världen (Anders 2026-10-21: rummet flyttas till lokalens hus). Simuleringen bär
// valet (economy.premises, sim/districts.ts); scenen läser det här. StrategicApp sätter lokalen ur simuleringen och
// monterar om scenen när den byts (sällan: vid övertagandet av vinbaren och vid en ny säsong).
//
// - Torget: huset w869907975 som förut (interiorLayout.ts findPlayerBuilding, venueEntrance.ts).
// - Lokalerna: ett tänkt hus i lokalens ram (content/premises.ts) med vinbarens yttermått (wineBarHouse.ts ROOM och
//   väggarna), med entrén mot husets +x-ände. Vinbarens möblering har entrén på rummets kortsida, så rummet står längs
//   husets långa sida och entrén i den ände som ligger närmast D15:s dörr (avvikelse från D15:s dörrar, som sitter
//   på långsidan i källaren och salongen).
// - Husmängderna i world.ts (PLAYER_BUSINESS_BUILDING_IDS, LANDMARK_BUILDING_IDS) följer lokalen, så att det verkliga
//   huset inte ritas av byns vanliga hus när vinbaren står där, och huset vid torget ritas som ett vanligt hus när den
//   inte gör det. Moduler med konstanter ur rummets läge registrerar en återställning (onPremisesChange).
import type { PremisesId } from '../../sim/districts';
import { LANDMARK_BUILDING_IDS, PLAYER_BUSINESS_BUILDING_IDS, WORLD, type RawBuilding, type Vec2Tuple } from './world';
import { PREMISES_FRAMES, premisesToWorld } from './premises';
import { ROOM as WINE_BAR_ROOM } from '../scene/wineBarHouse';

const TORGET_BUILDING = 'w869907975';
let current: PremisesId = 'torget';
// Id som lokalen lagt till i LANDMARK_BUILDING_IDS (inte de som redan stod där, som Kärnhuset).
const added = new Set<string>();
const resets = new Set<() => void>();

export function currentPremises(): PremisesId {
  return current;
}

/** En modul med ett värde ur rummets läge räknar om det när lokalen byts. */
export function onPremisesChange(reset: () => void): void {
  resets.add(reset);
}

export function setCurrentPremises(p: PremisesId): void {
  if (p === current) return;
  current = p;
  const id = p === 'torget' ? TORGET_BUILDING : PREMISES_FRAMES[p].building;
  for (const a of added) LANDMARK_BUILDING_IDS.delete(a);
  added.clear();
  PLAYER_BUSINESS_BUILDING_IDS.clear();
  PLAYER_BUSINESS_BUILDING_IDS.add(id);
  if (!LANDMARK_BUILDING_IDS.has(id)) { LANDMARK_BUILDING_IDS.add(id); added.add(id); }
  if (p !== 'torget') LANDMARK_BUILDING_IDS.delete(TORGET_BUILDING);
  else LANDMARK_BUILDING_IDS.add(TORGET_BUILDING);
  for (const r of resets) r();
}

/** Vinbarens yttermått: rummet och väggarna (wineBarHouse.ts ROOM). */
export const PREMISES_ROOM_OUTER = { w: WINE_BAR_ROOM.width + 2 * WINE_BAR_ROOM.wall, d: WINE_BAR_ROOM.depth + 2 * WINE_BAR_ROOM.wall } as const;

/** Det tänkta huset för lokalen: rektangeln i lokalens ram, med entrén mot +x. null för Torget. */
export function premisesBuilding(p: PremisesId = current): (RawBuilding & { entrance: { towards: Vec2Tuple } }) | null {
  if (p === 'torget') return null;
  const f = PREMISES_FRAMES[p];
  const real = WORLD.buildings.find((b) => b.id === f.building);
  if (!real) return null;
  const hx = PREMISES_ROOM_OUTER.w / 2, hz = PREMISES_ROOM_OUTER.d / 2, ox = f.offsetX;
  // Sluten som kartans hus (första punkten sist): orientedBbox och polygonCentroid räknar så.
  const poly = ([[ox - hx, -hz], [ox + hx, -hz], [ox + hx, hz], [ox - hx, hz], [ox - hx, -hz]] as const).map((q) => premisesToWorld(f, q) as Vec2Tuple);
  return { ...real, poly, entrance: { towards: premisesToWorld(f, [ox + hx + 20, 0]) as Vec2Tuple } };
}
