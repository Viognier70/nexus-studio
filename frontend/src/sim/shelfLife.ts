// ORDER 318 (Anders 2026-10-07, provspelet: "Lagret syns: visa 'I lager'
// separat för varje vara, med hur många kvällar det räcker och när det går
// ut. … Färsk mat blir svinn efter sin hållbarhet. Oöppnade flaskor blir
// aldrig svinn, bara öppnade flaskor efter ett par dagar.")
//
// Maten: portionerna per rätt (portionsboken, state.dishPortions) står i
// partier med inköpsdagen och den sista kväll de går att sälja
// (balance.ts WASTE.shelfEvenings, inköpskvällen medräknad). Gästerna tar
// ur det äldsta partiet först. Efter kvällen blir partier vars sista kväll
// har varit svinn; resten står kvar.
//
// Drycken: en oöppnad flaska blir aldrig svinn. När en flaska öppnas sparas
// dagen; glasen som är kvar i den blir svinn efter
// WASTE.openBottleEvenings kvällar.
//
// Partierna följer portionsboken: står boken på fler portioner än partierna
// (ett sparat spel från före ORDER 318, gårdagens rester som tagits
// tillvara) läggs skillnaden till som ett parti från i dag; på färre tas
// det äldsta bort först.

import { WASTE } from './balance';

export interface PortionLot {
  portions: number;
  /** Spelets dag då partiet köptes. */
  bought: number;
  /** Den sista kvällen partiet går att sälja. */
  lastEvening: number;
}

export type DishLots = Record<string, PortionLot[]>;
export type OpenBottles = Record<string, { openedDay: number }>;

const sum = (lots: PortionLot[] | undefined) => (lots ?? []).reduce((a, l) => a + l.portions, 0);

/** Den sista kvällen för ett parti köpt `day` som håller `shelf` kvällar. */
export function lastEveningFor(day: number, shelf: number): number {
  return day + Math.max(1, shelf) - 1;
}

/** Lägg till ett parti (samma inköpsdag och sista kväll slås ihop). */
export function addLot(lots: DishLots | undefined, dishId: string, portions: number, day: number, shelf: number): DishLots {
  const out: DishLots = { ...(lots ?? {}) };
  if (portions <= 0) return out;
  const last = lastEveningFor(day, shelf);
  const list = (out[dishId] ?? []).map((l) => ({ ...l }));
  const same = list.find((l) => l.bought === day && l.lastEvening === last);
  if (same) same.portions += portions;
  else list.push({ portions, bought: day, lastEvening: last });
  list.sort((a, b) => a.lastEvening - b.lastEvening || a.bought - b.bought);
  out[dishId] = list;
  return out;
}

/** Ta `portions` ur partierna, det som går ut först tas först. */
export function takeOldest(lots: DishLots | undefined, dishId: string, portions: number): DishLots {
  const out: DishLots = { ...(lots ?? {}) };
  let left = portions;
  const list: PortionLot[] = [];
  for (const l of out[dishId] ?? []) {
    const take = Math.min(left, l.portions);
    left -= take;
    if (l.portions - take > 0) list.push({ ...l, portions: l.portions - take });
  }
  out[dishId] = list;
  return out;
}

/** Lämna tillbaka ur dagens partier (bara det som köpts i dag går att lämna tillbaka). */
export function returnToday(lots: DishLots | undefined, dishId: string, portions: number, day: number): DishLots {
  const out: DishLots = { ...(lots ?? {}) };
  let left = portions;
  const list = [...(out[dishId] ?? [])].reverse().map((l) => {
    if (l.bought !== day || left <= 0) return l;
    const take = Math.min(left, l.portions);
    left -= take;
    return { ...l, portions: l.portions - take };
  }).reverse().filter((l) => l.portions > 0);
  out[dishId] = list;
  return out;
}

/** Portioner köpta i dag. */
export function boughtOn(lots: DishLots | undefined, dishId: string, day: number): number {
  return (lots?.[dishId] ?? []).filter((l) => l.bought === day).reduce((a, l) => a + l.portions, 0);
}

/** Partierna efter portionsboken (se rubriken). */
export function syncLots(lots: DishLots | undefined, portions: Record<string, number> | undefined, day: number, shelfOf: (dishId: string) => number): DishLots {
  let out: DishLots = {};
  for (const [dishId, p] of Object.entries(portions ?? {})) {
    if (p <= 0) continue;
    const have = sum(lots?.[dishId]);
    out[dishId] = (lots?.[dishId] ?? []).map((l) => ({ ...l }));
    if (have > p) out = takeOldest(out, dishId, have - p);
    else if (have < p) out = addLot(out, dishId, p - have, day, shelfOf(dishId));
  }
  return out;
}

/** Portioner av rätten vars sista kväll är `day` eller tidigare. */
export function expiringBy(lots: DishLots | undefined, dishId: string, day: number): number {
  return (lots?.[dishId] ?? []).filter((l) => l.lastEvening <= day).reduce((a, l) => a + l.portions, 0);
}

/** Partierna som står kvar efter kvällen `day`. */
export function freshAfter(lots: DishLots | undefined, day: number): DishLots {
  const out: DishLots = {};
  for (const [dishId, list] of Object.entries(lots ?? {})) {
    const keep = list.filter((l) => l.lastEvening > day && l.portions > 0);
    if (keep.length > 0) out[dishId] = keep;
  }
  return out;
}

/** Den första sista kvällen bland rättens partier, eller null. */
export function firstLastEvening(lots: DishLots | undefined, dishId: string): number | null {
  const list = (lots?.[dishId] ?? []).filter((l) => l.portions > 0);
  return list.length === 0 ? null : Math.min(...list.map((l) => l.lastEvening));
}

/**
 * Glas ur en dryck i flaska: `before` och `after` är glasen i lagret före och
 * efter. En ny flaska öppnas när den öppna tar slut eller när ingen var
 * öppen; när glasen går jämnt upp i flaskor är ingen öppen.
 */
export function noteGlasses(open: OpenBottles | undefined, ingredientId: string, before: number, after: number, perBottle: number, day: number): OpenBottles {
  const out: OpenBottles = { ...(open ?? {}) };
  if (perBottle <= 1) return out;
  if (after <= 0 || after % perBottle === 0) {
    delete out[ingredientId];
    return out;
  }
  const newBottle = before % perBottle === 0 || Math.floor(before / perBottle) !== Math.floor(after / perBottle);
  if (newBottle || !out[ingredientId]) out[ingredientId] = { openedDay: day };
  return out;
}

/** Den sista kvällen för den öppna flaskan, eller null om ingen är öppen. */
export function openBottleLastEvening(open: OpenBottles | undefined, ingredientId: string): number | null {
  const o = open?.[ingredientId];
  return o ? lastEveningFor(o.openedDay, WASTE.openBottleEvenings) : null;
}
