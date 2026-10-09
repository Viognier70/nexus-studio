// ORDER 319c (Anders 2026-10-07, ORDRAR_319_D9.md "Platsen och vädret", och Designs D9 med tillägget) —
// livet vid spelarens vagn under en kväll:
//
//   1. Vädret: sol, regn, blåst eller sval kväll, ett per kväll (TRUCK_WEATHER). Byns väder slumpas när
//      servicen öppnar och syns inte på morgonen, så vagnen har en egen prognos ur säsongens frö och dagen,
//      och den syns på morgonen (truckWeatherFor). Vädret ändrar gästflödet (dailyGuestCap) och hur ofta en
//      förbipasserande blir nyfiken. En regnkväll börjar torr och regnet börjar en bit in i kvällen
//      (rainFromE), så att det syns när det börjar. Den svala kvällen ger de nyfiknas frågor om kylan.
//   2. De som äter (TRUCK_SEATING, Designs EAT_FLOW): gästen som har fått maten äter vid en ledig plats
//      (truckProps.ts EAT_SPOTS): vid ståborden och bänken, först runt värmaren en sval kväll, och vid
//      hyllan på vagnens sida när det regnar. Utan ledig plats tar gästen maten med sig.
//   3. Det som blir kvar: när det är mycket folk lämnar en del skräp och servetter på bordet. Medhjälparen
//      städar när kön är kort, eller spelaren (TRUCK_CLEAR_TABLE). Ett bord med skräp används inte, och
//      platsen ser mindre inbjudande ut: färre förbipasserande blir nyfikna.
//   4. Marschallerna (TORCH, tilläggets torchLighting.ts): medhjälparen går ut och tänder dem när kvällen
//      passerar fromE, men väntar så länge kön är queueMax eller längre, och går senast vid latestE.
//
// Medan medhjälparen är ute (marschallerna eller ett bord) står luckan tom: medhjälparen tar inga
// beställningar (service.ts tickStaff), och gästen som beställer väntar. Grillaren grillar vidare.
// Slumpen ur fröet och dagen eller simtiden (hashKey), så att servicens slumpflöde inte flyttas.

import type { Guest, SimulationState, WeatherConditions } from '../strategic/types';
import { SAUSAGE, TORCH, TRUCK_SEATING, TRUCK_WEATHER } from './balance';
import { eveningProgress } from './clock';
import { EAT_SPOTS } from '../strategic/scene/truckProps';
import { hashKey } from '../strategic/util/hash';

export type TruckWeatherKind = 'sun' | 'rain' | 'wind' | 'cool';
export const TRUCK_WEATHERS: readonly TruckWeatherKind[] = ['sun', 'rain', 'wind', 'cool'];
export type TruckTable = 'A' | 'B' | 'C';
export const TRUCK_TABLES: readonly TruckTable[] = ['A', 'B', 'C'];

/** Medhjälparen är ute: tänder marschallerna eller städar ett bord. Sekunder i spelets tid. */
export type TruckErrand =
  | { kind: 'torches'; left: number; total: number }
  | { kind: 'clear'; table: TruckTable; left: number; total: number };

export interface TruckTonight {
  eaters: number;
  takeaway: number;
  /** Gäster som lämnade skräp på bordet, och borden som städades av medhjälparen och av spelaren. */
  littered: number;
  clearedByAssistant: number;
  clearedByPlayer: number;
  /** Kvällens gång e när rundan med marschallerna började, och om medhjälparen väntade på kön. */
  torchStartE: number | null;
  torchWaited: boolean;
  /** Spelsekunder som luckan stod tom i kväll. */
  hatchEmptySimSeconds: number;
}

export interface TruckDayState {
  weather: TruckWeatherKind;
  /** Kvällens gång e när regnet börjar (en regnkväll), annars null. */
  rainFromE: number | null;
  /** Skräp och servetter på borden. */
  litter: Record<TruckTable, number>;
  errand: TruckErrand | null;
  torchesLit: boolean;
  /** ORDER 320 — korvarna kvar i kväll (SAUSAGE.perEvening från början). */
  sausagesLeft?: number;
  tonight: TruckTonight;
}

const EMPTY_TONIGHT: TruckTonight = { eaters: 0, takeaway: 0, littered: 0, clearedByAssistant: 0, clearedByPlayer: 0, torchStartE: null, torchWaited: false, hatchEmptySimSeconds: 0 };

/** Prognosen för en kväll: vädret och när regnet börjar. Samma frö och dag ger samma väder. ORDER 321 — i
 *  provspelet kan vädret vara valt (forced); regnet börjar då som i en prognos med regn. */
export function truckWeatherFor(seed: number, dayNumber: number, forced: TruckWeatherKind | null = null): { weather: TruckWeatherKind; rainFromE: number | null } {
  const w = TRUCK_WEATHER.weights;
  const total = TRUCK_WEATHERS.reduce((a, k) => a + w[k], 0);
  let r = hashKey(seed, `${dayNumber}|truckWeather|forecast of the evening at the truck`) * total;
  let weather: TruckWeatherKind = TRUCK_WEATHERS[TRUCK_WEATHERS.length - 1];
  for (const k of TRUCK_WEATHERS) { if (r < w[k]) { weather = k; break; } r -= w[k]; }
  if (forced) weather = forced;
  const [a, b] = TRUCK_WEATHER.rainFromE;
  const rainFromE = weather === 'rain' ? a + (b - a) * hashKey(seed, `${dayNumber}|truckRain|when the rain starts at the truck`) : null;
  return { weather, rainFromE };
}

export function truckOf(state: Pick<SimulationState, 'day' | 'seed' | 'prov'>): TruckDayState {
  if (state.day.truck) return state.day.truck;
  return { ...truckWeatherFor(state.seed ?? 0, state.day.dayNumber, state.prov?.weather ?? null), litter: { A: 0, B: 0, C: 0 }, errand: null, torchesLit: false, sausagesLeft: SAUSAGE.perEvening, tonight: EMPTY_TONIGHT };
}

function isTruck(state: Pick<SimulationState, 'economy'>): boolean {
  return state.economy.businessClass === 'foodtruck';
}

/** Kvällens väder vid vagnen (prognosen på morgonen), eller null utanför foodtrucken. */
export function truckWeatherOf(state: SimulationState): TruckWeatherKind | null {
  return isTruck(state) ? truckOf(state).weather : null;
}

/** Byns väder vid vagnen samma kväll, så att det stämmer med vagnens (TRUCK_WEATHER.village). Slumpen för byns
 *  väder dras som förut (reducer.ts openService), och det som inte stämmer rättas. */
export function truckVillageWeather(state: SimulationState, w: WeatherConditions): WeatherConditions {
  // ORDER 321 — i provspelet gäller det valda vädret också i vinbaren och bistron.
  const kind = isTruck(state) ? truckOf(state).weather : state.prov?.weather ?? null;
  if (!kind) return w;
  const V = TRUCK_WEATHER.village;
  switch (kind) {
    case 'sun': return { ...w, tempC: Math.max(w.tempC, V.sunMinTempC), precipitation: 'none', cloudCover: 'clear' };
    case 'rain': return { ...w, precipitation: 'rain', cloudCover: 'overcast', outdoorViable: false };
    case 'wind': return { ...w, windMS: Math.max(w.windMS, V.windMinMS), precipitation: 'none', outdoorViable: false };
    case 'cool': return { ...w, tempC: Math.min(w.tempC, V.coolMaxTempC), precipitation: 'none', outdoorViable: false };
  }
}

/** Regnar det nu vid vagnen? En regnkväll börjar torr. */
export function truckRaining(state: SimulationState): boolean {
  if (!isTruck(state)) return false;
  const t = truckOf(state);
  const e = eveningProgress(state);
  return t.weather === 'rain' && t.rainFromE !== null && e !== null && e >= t.rainFromE;
}

/** Gästflödet vid vagnen i kväll, gånger ankomsterna (arrivals.ts arrivalAttraction). */
export function truckFootfall(state: SimulationState): number {
  return isTruck(state) ? TRUCK_WEATHER.footfall[truckOf(state).weather] : 1;
}

function litteredTables(t: TruckDayState): number {
  return TRUCK_TABLES.filter((k) => t.litter[k] > 0).length;
}

/** Tiden mellan två nyfikna gånger vädret och skräpet på borden (sim/curious.ts). */
export function curiousGapFactor(state: SimulationState): number {
  if (!isTruck(state)) return 1;
  const t = truckOf(state);
  return TRUCK_WEATHER.curiousGap[t.weather] * (1 + TRUCK_SEATING.litter.curiousGapPerTable * litteredTables(t));
}

/** Står luckan tom (medhjälparen är ute)? Då tas inga beställningar vid luckan (service.ts tickStaff: alla utom
 *  kocken vid grillen väntar). */
export function truckAssistantAway(state: SimulationState): boolean {
  return isTruck(state) && !!state.day.truck?.errand;
}

/** Bordet en ätplats hör till ('A-W' → A), eller null för bänken, värmaren och hyllan. */
export function tableOfSpot(spot: string): TruckTable | null {
  const k = spot.split('-')[0];
  return (TRUCK_TABLES as readonly string[]).includes(k) && spot in EAT_SPOTS.table ? k as TruckTable : null;
}

/** Platserna att äta på nu, i den ordning gästerna väljer dem (Designs truckWeather.ts seating). */
export function truckSeating(state: SimulationState): string[] {
  const t = truckOf(state);
  if (truckRaining(state)) return EAT_SPOTS.shelf.map((_, i) => `shelf${i}`);
  const tables = Object.keys(EAT_SPOTS.table);
  const bench = EAT_SPOTS.bench.map((_, i) => `bench${i}`);
  // En sval kväll går de som äter först till platserna runt värmaren; C-W står vid värmaren.
  if (t.weather === 'cool') return [...EAT_SPOTS.heater.map((_, i) => `heat${i}`), ...tables.filter((k) => k !== 'C-W')];
  return [...tables, ...bench];
}

/** Lediga platser: inte tagna och inte vid ett bord med skräp. */
export function freeSeats(state: SimulationState): string[] {
  const t = truckOf(state);
  const taken = new Set(state.guests.filter((g) => g.state === 'eating' && g.truckSpot).map((g) => g.truckSpot!));
  return truckSeating(state).filter((k) => !taken.has(k) && !(tableOfSpot(k) && t.litter[tableOfSpot(k)!] > 0));
}

function write(draft: SimulationState, t: TruckDayState): void {
  draft.day = { ...draft.day, truck: t };
}

function bump(t: TruckDayState, k: Exclude<keyof TruckTonight, 'torchStartE' | 'torchWaited'>, n = 1): TruckDayState {
  return { ...t, tonight: { ...t.tonight, [k]: t.tonight[k] + n } };
}

/** ORDER 320 — gästen som betalar tar en korv, eller två (hel special). Lådan tar inte slut under noll: då blir
 *  det vegokorv. */
export function useTruckSausages(draft: SimulationState, guest: Guest): void {
  if (!isTruck(draft)) return;
  const t = truckOf(draft);
  const full = hashKey(draft.seed ?? 0, `${guest.id}|full special|at the truck`) < SAUSAGE.fullSpecialShare;
  const left = t.sausagesLeft ?? SAUSAGE.perEvening;
  write(draft, { ...t, sausagesLeft: Math.max(0, left - (full ? SAUSAGE.perFullSpecial : 1)) });
}

/** Gästen har betalat vid luckan: äter vid en ledig plats, eller tar maten med sig. Sant om gästen äter. */
export function startTruckEating(draft: SimulationState, guest: Guest): boolean {
  if (!isTruck(draft)) return false;
  const t = truckOf(draft);
  const free = freeSeats(draft);
  if (free.length === 0) { write(draft, bump(t, 'takeaway')); return false; }
  guest.truckSpot = free[0];
  write(draft, bump(t, 'eaters'));
  return true;
}

/** Gästen har ätit klart: lämnar skräp på bordet när det är mycket folk, annars i sopkorgen. */
export function finishTruckEating(draft: SimulationState, guest: Guest): void {
  if (!isTruck(draft) || !guest.truckSpot) return;
  const table = tableOfSpot(guest.truckSpot);
  if (!table) return;
  const L = TRUCK_SEATING.litter;
  const eaters = draft.guests.filter((g) => g.state === 'eating').length;
  const crowded = eaters >= L.crowdEaters || draft.waitingIds.length >= L.crowdQueue;
  if (!crowded || hashKey(draft.seed ?? 0, `${guest.id}|litter|left on the table at the truck`) >= L.share) return;
  guest.truckLitter = true;
  const t = truckOf(draft);
  write(draft, bump({ ...t, litter: { ...t.litter, [table]: t.litter[table] + 1 } }, 'littered'));
}

/** Spelaren städar ett bord (när medhjälparen inte hinner). */
export function clearTruckTable(draft: SimulationState, table: string): void {
  if (!isTruck(draft) || !(TRUCK_TABLES as readonly string[]).includes(table)) return;
  const t = truckOf(draft);
  const k = table as TruckTable;
  if (t.litter[k] <= 0 || (t.errand?.kind === 'clear' && t.errand.table === k)) return;
  write(draft, bump({ ...t, litter: { ...t.litter, [k]: 0 } }, 'clearedByPlayer'));
}

function inService(state: SimulationState): boolean {
  return isTruck(state) && state.day.period === 'dinner' && !!state.day.doorsOpenedThisService && !state.day.serviceCollapsed;
}

/** Ett tick: medhjälparens rundor (marschallerna, borden). */
export function tickTruck(draft: SimulationState, dt: number): void {
  if (!isTruck(draft) || draft.day.period !== 'dinner') return;
  let t = truckOf(draft);
  if (!draft.day.truck) write(draft, t);
  if (!inService(draft)) {
    if (t.errand) write(draft, { ...t, errand: null, torchesLit: t.torchesLit || t.errand.kind === 'torches' });
    return;
  }
  const e = eveningProgress(draft);
  const errand = t.errand;
  if (errand) {
    const left = errand.left - dt;
    t = bump(t, 'hatchEmptySimSeconds', dt);
    if (left > 0) { write(draft, { ...t, errand: { ...errand, left } }); return; }
    if (errand.kind === 'torches') { write(draft, { ...t, errand: null, torchesLit: true }); return; }
    const table = errand.table;
    write(draft, bump({ ...t, errand: null, litter: { ...t.litter, [table]: 0 } }, 'clearedByAssistant'));
    return;
  }
  const queue = draft.waitingIds.length;
  // Marschallerna: när kvällen passerar fromE och kön är kortare än queueMax, senast vid latestE.
  if (!t.torchesLit && e !== null && e >= TORCH.fromE) {
    if (queue < TORCH.queueMax || e >= TORCH.latestE) {
      write(draft, { ...t, errand: { kind: 'torches', left: TORCH.roundSimSeconds, total: TORCH.roundSimSeconds }, tonight: { ...t.tonight, torchStartE: e } });
      return;
    }
    if (!t.tonight.torchWaited) { write(draft, { ...t, tonight: { ...t.tonight, torchWaited: true } }); return; }
  }
  // Ett bord med skräp städas när kön är kort och ingen äter vid det.
  const busy = new Set(draft.guests.filter((g) => g.state === 'eating' && g.truckSpot).map((g) => tableOfSpot(g.truckSpot!)));
  const dirty = TRUCK_TABLES.find((k) => t.litter[k] > 0 && !busy.has(k));
  if (dirty && queue <= TRUCK_SEATING.clearQueueMax) {
    write(draft, { ...t, errand: { kind: 'clear', table: dirty, left: TRUCK_SEATING.clearSimSeconds, total: TRUCK_SEATING.clearSimSeconds } });
  }
}
