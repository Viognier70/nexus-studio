// ORDER 332 D–G — kvarteren och foodtruckens platser (Kvarteren, konkurrensen och spellägena, etapp 1, avsnitt 7;
// Designs D15 kvarterPlatser.js). Det här är kontraktet som simuleringen och scenen läser: kvarterens id, vagnens fem
// platser med D7:s ram (C = vagnens mitt, th = längdaxelns vinkel, världen = C + R(th)·lokal) och vilken plats
// spelarens vagn står på. Talen (plånbok, kräsenhet, kalendern, avgifterna) står i balance.ts DISTRICTS.

/** Kvarteren. Sjön är i etapp 1 en plats för foodtrucken, inte ett kvarter med en krog (avsnitt 7 punkt 2), men har
 *  egna gäster på gatan (D15 STREET_MIX). */
export type DistrictId = 'torget' | 'student' | 'gastgivaregarden' | 'campus' | 'sjon';
export const DISTRICT_IDS: readonly DistrictId[] = ['torget', 'student', 'gastgivaregarden', 'campus', 'sjon'];

/** Foodtruckens platser: D15:s fem (SPOTS) och Magasinsgatan (ORDER 333 B, avsnitt 8 punkt 2). */
export type TruckSpotId = 'torget' | 'prastgatan' | 'gastgivaregarden' | 'campus' | 'sjon' | 'magasinsgatan';
export const TRUCK_SPOT_IDS: readonly TruckSpotId[] = ['torget', 'prastgatan', 'gastgivaregarden', 'campus', 'sjon', 'magasinsgatan'];

export { TRUCK_SPOTS, type TruckSpotFrame } from '../strategic/content/truckSpots';

/** ORDER 333 D — vinbarens lokaler: Torget som förut och D15:s tre (avsnitt 8 punkt 4). Spelaren väljer när vinbaren
 *  tas över; bistron byggs om i samma lokal. Lokalens kvarter styr gästerna, klassen är densamma. */
export type PremisesId = 'torget' | 'kallaren' | 'salongen' | 'glashornet';
export const PREMISES_IDS: readonly PremisesId[] = ['torget', 'kallaren', 'salongen', 'glashornet'];
/** Lokalens kvarter och hus (D15 kvarterPlatser.js VENUES; Torget: spelarens hus, world.ts PLAYER_BUSINESS_BUILDING_IDS). */
export const PREMISES: Record<PremisesId, { id: PremisesId; district: DistrictId; building: string }> = {
  torget: { id: 'torget', district: 'torget', building: 'w869907975' },
  kallaren: { id: 'kallaren', district: 'student', building: 'w193810970' },
  salongen: { id: 'salongen', district: 'gastgivaregarden', building: 'w193810957' },
  glashornet: { id: 'glashornet', district: 'campus', building: 'w193810921' }
};

/** Lokalen spelarens krog står i. Saknas i äldre sparfiler: Torget. */
export function playerPremisesOf(state: { economy?: { premises?: PremisesId } | null }): PremisesId {
  return state.economy?.premises ?? 'torget';
}
import { TRUCK_SPOTS } from '../strategic/content/truckSpots';

/** Spelarens krog ligger på Torget (avsnitt 7 punkt 7). */
export const PLAYER_DISTRICT: DistrictId = 'torget';

/** Platsen spelarens vagn står på. Saknas i äldre sparfiler: Torget, där vagnen alltid stått. */
export function playerTruckSpotOf(state: { economy?: { truckSpot?: TruckSpotId } | null }): TruckSpotId {
  return state.economy?.truckSpot ?? 'torget';
}

/** Placeringen i three: x, z och rotationY (samma form som villagePlaces.ts TruckPlacement). */
export function truckSpotPlacement(spot: TruckSpotId): { x: number; z: number; rotationY: number } {
  const f = TRUCK_SPOTS[spot];
  return { x: f.C[0], z: f.C[1], rotationY: -f.th };
}

/** En punkt i vagnens lokala ram (+x längs vagnen, +z ut från luckan) i byns meter. */
export function spotToWorld(spot: TruckSpotId, local: readonly [number, number]): [number, number] {
  const f = TRUCK_SPOTS[spot], c = Math.cos(f.th), s = Math.sin(f.th);
  return [f.C[0] + c * local[0] - s * local[1], f.C[1] + s * local[0] + c * local[1]];
}

// ---------- kvarteren i simuleringen (ORDER 332 D–G) ----------
// Talen står i balance.ts DISTRICTS. Torget har alla faktorer 1, så spelarens krog på torget räknas som förut.

import { DISTRICTS, MEDAL_LEVELS, HOLIDAYS, type DistrictSpec } from './balance';
import { calendarFor } from './calendar';
import { ALL_PAVILIONS, totalMedalSteps } from './economy';
import type { SimulationState } from '../strategic/types';

export type TruckWeather = 'sun' | 'rain' | 'wind' | 'cool';

export function districtSpec(d: DistrictId): DistrictSpec {
  return DISTRICTS.list[d];
}

/** Kvarteret spelarens verksamhet står i i kväll: vagnens plats, annars lokalens (ORDER 333 D; Torget som förut). */
export function playerDistrictOf(state: { economy?: { businessClass?: string | null; truckSpot?: TruckSpotId; premises?: PremisesId } | null }): DistrictId {
  return state.economy?.businessClass === 'foodtruck' ? TRUCK_SPOTS[playerTruckSpotOf(state)].district : PREMISES[playerPremisesOf(state)].district;
}

/** Terminstid en viss dag (DISTRICTS.termWeeks). */
export function isTermTime(dayNumber: number): boolean {
  return DISTRICTS.termWeeks.includes(calendarFor(dayNumber).week);
}

/** Konferensdag på campus (DISTRICTS.conference). */
export function isConferenceDay(dayNumber: number): boolean {
  const cal = calendarFor(dayNumber);
  return DISTRICTS.conference.weeks.includes(cal.week) && DISTRICTS.conference.days.includes(cal.weekday);
}

/** Marknadsdag på torget: en högtid med turister (Grythyttedagarna). */
export function isMarketDay(dayNumber: number): boolean {
  const h = calendarFor(dayNumber).holiday;
  return !!h && DISTRICTS.marketDemand.includes(h.demand);
}

/** Är platsen öppen den veckan? Sjön är säsongsbunden (DISTRICTS.list.sjon.openWeeks). */
export function truckSpotOpen(spot: TruckSpotId, dayNumber: number): boolean {
  const weeks = districtSpec(TRUCK_SPOTS[spot].district).openWeeks;
  return !weeks || weeks.includes(calendarFor(dayNumber).week);
}

export interface DistrictTonight {
  term: boolean;
  conference: boolean;
  market: boolean;
  /** Kvarterets gäster mot Torgets samma kväll (efter veckodagen, terminen, säsongen, marknaden, konferensen, vädret). */
  poolFactor: number;
}

/** Kvarterets kväll: vad som gäller och hur många gäster det har mot Torget. Torget: 1. */
export function districtTonight(d: DistrictId, dayNumber: number, weather: TruckWeather | null = null): DistrictTonight {
  const s = districtSpec(d);
  const cal = calendarFor(dayNumber);
  const term = isTermTime(dayNumber), conference = isConferenceDay(dayNumber), market = isMarketDay(dayNumber);
  let f = s.pool;
  if (s.weekday) f *= s.weekday[cal.weekday];
  f *= term ? s.termK : s.outOfTermK;
  if (s.seasonByWeek) f *= s.seasonByWeek[cal.week - 1] ?? 1;
  if (market) f *= s.marketK;
  if (conference) f *= s.conferenceK;
  if (weather && s.weatherK) f *= s.weatherK[weather];
  if (s.openWeeks && !s.openWeeks.includes(cal.week)) f = 0;
  return { term, conference, market, poolFactor: f };
}

/** Spelarens kvalitet som kvarterets gäster läser den (0–1). 'whole': rätten, vinet och servicen, och den svagaste
 *  avgör (den som förlåter minst ser det sämsta). 'medals': medaljstegen från Måltidens hus mot alla möjliga. */
export function playerQuality(state: Pick<SimulationState, 'qualityFood' | 'qualityDrink' | 'qualityService' | 'medals'>, d: DistrictId): number {
  if (districtSpec(d).quality === 'medals') {
    // economy.ts importerar bara typer härifrån, så kretsen gäller bara när funktionen körs.
    return totalMedalSteps(state.medals ?? {}) / (ALL_PAVILIONS.length * MEDAL_LEVELS.length);
  }
  return Math.min(state.qualityFood ?? 0, state.qualityDrink ?? 0, state.qualityService ?? 0);
}

/** Kräsenhetens vikt för en krog med kvaliteten q. Torget (kräsenhet 0): 1. */
export function qualityWeight(d: DistrictId, q: number): number {
  const k = districtSpec(d).pickiness;
  return k === 0 ? 1 : Math.exp(k * (q - DISTRICTS.qualityRef));
}

/** Avgiften för platsen en kväll (Torget ingår i veckans tillstånd). */
export function truckSpotFeeSek(spot: TruckSpotId): number {
  return DISTRICTS.truckSpotFeeSek[spot];
}

/** Holidays som räknas som marknad, för texten på morgonen. */
export function marketHolidays() {
  return HOLIDAYS.list.filter((h) => DISTRICTS.marketDemand.includes(h.demand));
}
