// ORDER 275 — lagret är insatsen: köp av paket, menyn ur lagret, drycken
// per gäst och svinnet vid dagens slut. Paketen själva: packages.ts.
//
// - Kassan sjunker direkt vid köpet (applyCashDelta, kassabokens rad
//   'stock'), som ingredienserna förut (ORDER 259). Portionerna är redan
//   betalda, så en såld portion drar ingen kostnad vid betalningen.
// - Menyn är de rätter och drycker ur klassens paket som finns i lagret,
//   till katalogens pris.
// - Varje gäst tar en rätt och en dryck ur lagret.
// - Vid dagens slut blir osåld mat svinn. Drycken står sig till nästa dag.

import type { SimulationState } from '../types';
import { GLASSES_PER_BOTTLE } from './m4Catalogue';
import { strings } from '../../content/strings';
import { applyCashCost, applyCashDelta, postLedger } from './cashReading';
import { findDish, findIngredient, minIngredientCost } from './m4Catalogue';
import { ITEM_BATCH, MORNING_STAKE, SHOP, WASTE } from '../../sim/balance';
import { abilityActive } from '../../sim/shop';
import { discardUnresolvedSalvage, pickSalvage } from './salvage';
import { clockMinutes, formatClock } from '../../sim/clock';
import { findPackage, itemsCostSek, packageCostSek, packageDishIds, packageIngredients, packagesFor, scaledBaseItems } from './packages';
import { dailyGuestCap } from '../../sim/economy';
import { goodAvailable } from '../../sim/goods';
import { numberLocale } from '../../content/language';
import { addLot, expiringBy, freshAfter, noteGlasses, openBottleLastEvening, returnToday, syncLots, takeOldest } from '../../sim/shelfLife';

type Menu = SimulationState['menu'];

// Portioner kvar per rätt på menyn: det minsta av lager / receptets enheter.
// ORDER 284 — med portionsboken (state.dishPortions) räknas maten också
// högst till rättens egna köpta portioner: soppan kan inte ta rotfrukterna
// och örterna som köptes till fläsket ("maten tog slut 20.41 men 26
// portioner blev svinn", tredje provspelet).
export function computePlatesRemaining(menu: Menu, stock: Record<string, number>, portions?: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of menu) {
    const dish = findDish(entry.dishId);
    if (!dish) { out[entry.dishId] = 0; continue; }
    let minPlates = Infinity;
    for (const r of dish.recipe) {
      const plates = Math.floor((stock[r.ingredientId] ?? 0) / r.units);
      if (plates < minPlates) minPlates = plates;
    }
    if (portions && dish.kind !== 'drink') minPlates = Math.min(minPlates, Math.max(0, portions[entry.dishId] ?? 0));
    out[entry.dishId] = Number.isFinite(minPlates) ? minPlates : 0;
  }
  return out;
}

// ORDER 284 — portionsboken ändras med köpet, ångrandet och serveringen.
function addPortions(portions: Record<string, number> | undefined, items: Record<string, number>, sign: 1 | -1): Record<string, number> {
  const out = { ...(portions ?? {}) };
  for (const [id, n] of Object.entries(items)) {
    if (findDish(id)?.kind === 'drink') continue;
    out[id] = Math.max(0, (out[id] ?? 0) + sign * n);
  }
  return out;
}

// ORDER 318 — hållbarheten: en rätt håller som sin huvudråvara (den som
// kostar mest i rätten), WASTE.shelfEvenings. ORDER 318b: eller sin egen,
// WASTE.dishShelfEvenings.
export function dishShelfEvenings(dishId: string): number {
  // ORDER 318b — rättens egen hållbarhet (Anders beslut) går före.
  const own = WASTE.dishShelfEvenings[dishId];
  if (own !== undefined) return own;
  const dish = findDish(dishId);
  let main: string | null = null;
  let best = -1;
  for (const r of dish?.recipe ?? []) {
    const c = minIngredientCost(r.ingredientId) * r.units;
    if (c > best) { best = c; main = r.ingredientId; }
  }
  return main ? WASTE.shelfEvenings[main] ?? WASTE.shelfEveningsDefault : WASTE.shelfEveningsDefault;
}

// Glas per flaska för en dryck (öl och annat på glas: en).
function glassesPerBottleOf(dishId: string): number {
  const dish = findDish(dishId);
  return dish?.kind === 'drink' && dish.drink !== 'beer' ? GLASSES_PER_BOTTLE : 1;
}

// ORDER 318 — dagens inköp i partierna och raden Inköp i dag: portioner per
// rätt, glas per dryck (nyckeln är dryckens råvara, som morgonens rader).
function bookPurchase(state: SimulationState, items: Record<string, number>, sign: 1 | -1): Pick<SimulationState, 'dishLots'> & { boughtToday: Record<string, number> } {
  const day = state.day.dayNumber;
  let dishLots = state.dishLots;
  const boughtToday = { ...(state.day.boughtToday ?? {}) };
  for (const [id, n] of Object.entries(items)) {
    const dish = findDish(id);
    if (!dish || n <= 0) continue;
    if (dish.kind !== 'drink') {
      dishLots = sign > 0 ? addLot(dishLots, id, n, day, dishShelfEvenings(id)) : returnToday(dishLots, id, n, day);
      boughtToday[id] = Math.max(0, (boughtToday[id] ?? 0) + sign * n);
    } else {
      for (const r of dish.recipe) boughtToday[r.ingredientId] = Math.max(0, (boughtToday[r.ingredientId] ?? 0) + sign * n * r.units);
    }
  }
  return { dishLots, boughtToday };
}

/** Det som köpts i dag av en vara (portioner av en rätt, glas av en dryck). */
export function boughtTodayOf(state: SimulationState, id: string): number {
  return Math.max(0, state.day.boughtToday?.[id] ?? 0);
}


export function usesPackages(state: SimulationState): boolean {
  return packagesFor(state.economy.businessClass) !== null;
}

function dishCostSek(dishId: string): number {
  const dish = findDish(dishId);
  if (!dish) return 0;
  return dish.recipe.reduce((sum, r) => sum + minIngredientCost(r.ingredientId) * r.units, 0);
}

// Menyn ur lagret: klassens rätter och drycker som har minst en portion.
export function menuFromStock(state: SimulationState): Menu {
  const menu: Menu = [];
  for (const dishId of packageDishIds(state.economy.businessClass)) {
    const dish = findDish(dishId);
    if (!dish) continue;
    const entry = { dishId, price: dish.suggestedPrice, ingredientCostSek: dishCostSek(dishId) };
    if ((computePlatesRemaining([entry], state.stock, state.dishPortions)[dishId] ?? 0) > 0) menu.push(entry);
  }
  return menu;
}

function withMenuFromStock(state: SimulationState): SimulationState {
  const menu = menuFromStock(state);
  return { ...state, menu, day: { ...state.day, platesRemaining: computePlatesRemaining(menu, state.stock, state.dishPortions) } };
}

// Köp ett paket på morgonen. Kassan sjunker direkt.
export function buyPackage(state: SimulationState, packageId: string): SimulationState {
  if (state.day.period !== 'morning') return state;
  const found = findPackage(state.economy.businessClass, packageId);
  if (!found) return state;
  // ORDER 307 — varorna från en leverantör som inte är öppnad går inte att köpa.
  if (!found.items.every((i) => goodAvailable(state, i.dishId))) return state;
  // ORDER 291 — baspaketet följer kvällens bokning (morningBuy.ts baseItemsFor).
  const pkg = found.id === packagesFor(state.economy.businessClass)?.base.id
    ? { ...found, items: Object.entries(scaledBaseItems(found, dailyGuestCap(state))).map(([dishId, portions]) => ({ dishId, portions })) }
    : found;
  const costSek = packageCostSek(pkg);
  const stock = { ...state.stock };
  for (const [id, units] of Object.entries(packageIngredients(pkg))) stock[id] = (stock[id] ?? 0) + units;
  const bought = bookPurchase(state, Object.fromEntries(pkg.items.map((i) => [i.dishId, i.portions])), 1);
  const next = withMenuFromStock({
    ...state,
    stock,
    dishPortions: addPortions(state.dishPortions, Object.fromEntries(pkg.items.map((i) => [i.dishId, i.portions])), 1),
    dishLots: bought.dishLots,
    packagesBoughtToday: [...(state.packagesBoughtToday ?? []), packageId],
    day: { ...state.day, stockBoughtToday: true, boughtToday: bought.boughtToday }
  });
  applyCashDelta(next, -costSek);
  postLedger(next, { category: 'stock', amount: -costSek, cause: strings.stock.packageLedger(strings.stock.packages[packageId]?.name ?? packageId), causeId: packageId });
  return next;
}

// ORDER 277 — morgonens inköpslista: portioner per rätt och dryck, som ett
// paket. Kassan sjunker direkt.
export function buyItems(state: SimulationState, items: Record<string, number>): SimulationState {
  if (state.day.period !== 'morning' || !usesPackages(state)) return state;
  const allowed = new Set(packageDishIds(state.economy.businessClass).filter((id) => goodAvailable(state, id)));
  const clean: Record<string, number> = {};
  for (const [id, n] of Object.entries(items)) if (allowed.has(id) && n > 0) clean[id] = Math.floor(n);
  if (Object.keys(clean).length === 0) return state;
  const costSek = itemsCostSek(clean);
  const stock = { ...state.stock };
  for (const [id, units] of Object.entries(packageIngredients({ id: 'sheet', items: Object.entries(clean).map(([dishId, portions]) => ({ dishId, portions })) }))) {
    stock[id] = (stock[id] ?? 0) + units;
  }
  const bought = bookPurchase(state, clean, 1);
  const next = withMenuFromStock({ ...state, stock, dishPortions: addPortions(state.dishPortions, clean, 1), dishLots: bought.dishLots, day: { ...state.day, stockBoughtToday: true, boughtToday: bought.boughtToday } });
  applyCashDelta(next, -costSek);
  postLedger(next, { category: 'stock', amount: -costSek, cause: strings.stock.sheetLedger, causeId: 'order-sheet' });
  return next;
}

// ORDER 280 — ångra ett inköp på morgonen (Designs M1: "− ger tillbaka
// inköpspriset"). Bara det som finns i lager går att lämna tillbaka.
// ORDER 318 — och bara det som köpts i dag.
export function returnItems(state: SimulationState, items: Record<string, number>): SimulationState {
  if (state.day.period !== 'morning' || !usesPackages(state)) return state;
  const allowed = new Set(packageDishIds(state.economy.businessClass));
  const stock = { ...state.stock };
  const back: Record<string, number> = {};
  for (const [id, n] of Object.entries(items)) {
    const dish = findDish(id);
    if (!dish || !allowed.has(id) || n <= 0) continue;
    const own = dish.kind !== 'drink' && state.dishPortions ? [Math.max(0, state.dishPortions[id] ?? 0)] : [];
    const today = dish.kind !== 'drink' ? [boughtTodayOf(state, id)] : dish.recipe.map((r) => Math.floor(boughtTodayOf(state, r.ingredientId) / r.units));
    const can = Math.min(Math.floor(n), ...own, ...today, ...dish.recipe.map((r) => Math.floor((stock[r.ingredientId] ?? 0) / r.units)));
    if (can <= 0) continue;
    for (const r of dish.recipe) stock[r.ingredientId] = (stock[r.ingredientId] ?? 0) - r.units * can;
    back[id] = can;
  }
  if (Object.keys(back).length === 0) return state;
  const refundSek = itemsCostSek(back);
  const bought = bookPurchase(state, back, -1);
  const next = withMenuFromStock({ ...state, stock, dishPortions: state.dishPortions ? addPortions(state.dishPortions, back, -1) : undefined, dishLots: bought.dishLots, day: { ...state.day, boughtToday: bought.boughtToday } });
  applyCashDelta(next, refundSek);
  postLedger(next, { category: 'stock', amount: refundSek, cause: strings.stock.returnLedger, causeId: 'order-sheet' });
  return next;
}

// ORDER 277 — "Menyn och dryckeslistan och mängder måste sättas innan
// servicen kan starta." Minst en rätt och en dryck i lager (balance.ts
// MORNING_STAKE). Klasser utan paket spärras inte.
export function stockReadiness(state: SimulationState): { ready: boolean; dishes: number; drinks: number } {
  if (!usesPackages(state)) return { ready: true, dishes: 0, drinks: 0 };
  const menu = menuFromStock(state);
  const dishes = menu.filter((m) => findDish(m.dishId)?.kind !== 'drink').length;
  const drinks = menu.length - dishes;
  return { ready: dishes >= MORNING_STAKE.minDishesToOpen && drinks >= MORNING_STAKE.minDrinksToOpen, dishes, drinks };
}

// ORDER 277 — en portion ur lagret: lagret och portionerna kvar räknas om,
// och raden "har tagit slut" skrivs en gång per rätt och service (samma
// text som reducerns drawMenuDishForGuest).
export function takeFromStock(draft: SimulationState, dishId: string, simTime: number): void {
  const dish = findDish(dishId);
  if (!dish) return;
  const stock = { ...draft.stock };
  for (const r of dish.recipe) stock[r.ingredientId] = (stock[r.ingredientId] ?? 0) - r.units;
  noteBottles(draft, dishId, draft.stock, stock);
  draft.stock = stock;
  if (draft.dishPortions && dish.kind !== 'drink') {
    draft.dishPortions = addPortions(draft.dishPortions, { [dishId]: 1 }, -1);
    if (draft.dishLots) draft.dishLots = takeOldest(draft.dishLots, dishId, 1);
  }
  draft.day.platesRemaining = computePlatesRemaining(draft.menu, stock, draft.dishPortions);
  // ORDER 280 — till sopbilen: serverade rätter och glas ur flaskor.
  if (dish.kind !== 'drink') draft.day.portionsServed = (draft.day.portionsServed ?? 0) + 1;
  else if (dish.drink !== 'beer') draft.day.bottleGlassesPoured = (draft.day.bottleGlassesPoured ?? 0) + dish.recipe.reduce((a, r) => a + r.units, 0);
  warnStock(draft, simTime);
}

// ORDER 318 — en flaska som öppnas får sin dag (sim/shelfLife.ts noteGlasses).
function noteBottles(draft: SimulationState, dishId: string, before: Record<string, number>, after: Record<string, number>): void {
  const dish = findDish(dishId);
  const per = glassesPerBottleOf(dishId);
  if (dish?.kind !== 'drink' || per <= 1) return;
  for (const r of dish.recipe) draft.openBottles = noteGlasses(draft.openBottles, r.ingredientId, before[r.ingredientId] ?? 0, after[r.ingredientId] ?? 0, per, draft.day.dayNumber);
}

// ORDER 280 — lagret under servicen enligt Designs L1: köket i portioner,
// baren i flaskor och glas i den öppna flaskan. Status: Slut vid noll,
// Snart slut vid högst ITEM_BATCH.lowShare av kvällens start eller högst
// lowMinPortions portioner, i baren vid högst lowGlasses glas.
export type StockStatus = 'ok' | 'low' | 'out';
export interface StockRow {
  id: string;
  kind: 'dish' | 'drink';
  name: string;
  left: number;
  start: number;
  status: StockStatus;
  // Baren: hela flaskor och glas i den öppna.
  bottles?: number;
  openGlasses?: number;
  startBottles?: number;
  beer?: boolean;
}

function statusFor(kind: 'dish' | 'drink', left: number, start: number): StockStatus {
  if (left <= 0) return 'out';
  if (kind === 'drink') return left <= ITEM_BATCH.lowGlasses ? 'low' : 'ok';
  return left <= ITEM_BATCH.lowMinPortions || left <= start * ITEM_BATCH.lowShare ? 'low' : 'ok';
}

export function stockRows(state: SimulationState): StockRow[] {
  const at = state.day.stockAtOpen ?? {};
  const rows: StockRow[] = [];
  for (const m of state.menu) {
    const d = findDish(m.dishId);
    if (!d || d.kind === 'drink') continue;
    const left = state.day.platesRemaining[m.dishId] ?? 0;
    const start = at[m.dishId] ?? left;
    rows.push({ id: m.dishId, kind: 'dish', name: d.name, left, start, status: statusFor('dish', left, start) });
  }
  const seen = new Set<string>();
  for (const m of state.menu) {
    const d = findDish(m.dishId);
    if (!d || d.kind !== 'drink' || d.recipe.length !== 1) continue;
    const ing = d.recipe[0].ingredientId;
    if (seen.has(ing)) continue;
    seen.add(ing);
    const beer = d.drink === 'beer';
    const gpb = beer ? 1 : GLASSES_PER_BOTTLE;
    const left = Math.max(0, Math.floor(state.stock[ing] ?? 0));
    const start = at[ing] ?? left;
    const name = (d.drink === 'wine-bottle' ? d.name.replace(/, (bottle|flaska)$/, '') : d.name.replace(/, (by the glass|per glas)$/, ''));
    rows.push({
      id: ing, kind: 'drink', name, left, start, status: statusFor('drink', left, start),
      bottles: Math.floor(left / gpb), openGlasses: left % gpb, startBottles: Math.ceil(start / gpb), beer
    });
  }
  return rows;
}

// När servicen öppnar: lagret att räkna andelarna mot.
export function recordStockAtOpen(state: SimulationState): SimulationState {
  if (!usesPackages(state)) return state;
  const at: Record<string, number> = {};
  for (const r of stockRows({ ...state, day: { ...state.day, stockAtOpen: {} } })) at[r.id] = r.left;
  return { ...state, day: { ...state.day, stockAtOpen: at, stockWarned: {} } };
}

// En varning i strömmen när en rad blir Snart slut eller Slut, en gång per
// nivå (Designs L1: "Statusbyte ger en stock-händelse").
function warnStock(draft: SimulationState, simTime: number): void {
  if (!usesPackages(draft)) return;
  const warned = { ...(draft.day.stockWarned ?? {}) };
  let changed = false;
  for (const r of stockRows(draft)) {
    if (r.status === 'ok' || warned[r.id] === r.status || (warned[r.id] === 'out')) continue;
    warned[r.id] = r.status;
    changed = true;
    const text = r.status === 'out'
      ? strings.stockL1.warnOut(r.name)
      : strings.stockL1.warnLow(r.name, r.left, r.kind === 'dish' ? strings.morningBuy.unitPortion : r.left === 1 ? strings.stockL1.unitGlassOne : strings.stockL1.unitGlass);
    if (r.status === 'out' && r.kind === 'dish' && !draft.day.stockOutEvents.includes(r.id)) {
      draft.day.stockOutEvents = [...draft.day.stockOutEvents, r.id];
    }
    draft.eventStream = [...draft.eventStream, {
      at: simTime, text, category: 'ambient', causeTag: 'stock_out', causeChainId: null,
      sustainability: 'economic', kind: r.status === 'out' ? 'dish_ran_out' : 'stock_low', scenarioId: null, feed: 'warn'
    }];
  }
  // ORDER 284 — "Maten tog slut" gäller en rätt i taget; när alla rätter är
  // slut säger en egen rad att köket inte har något kvar.
  const dishes = stockRows(draft).filter((r) => r.kind === 'dish');
  if (dishes.length > 0 && dishes.every((r) => r.status === 'out') && !warned.kitchen) {
    warned.kitchen = 'out';
    changed = true;
    // ORDER 289 — klockslaget till rådet efter kvällen.
    draft.day = { ...draft.day, foodOutClock: formatClock(clockMinutes(draft)) };
    draft.eventStream = [...draft.eventStream, {
      at: simTime, text: strings.stockL1.kitchenOut, category: 'ambient', causeTag: 'stock_out', causeChainId: null,
      sustainability: 'economic', kind: 'dish_ran_out', scenarioId: null, feed: 'warn'
    }];
  }
  if (changed) draft.day = { ...draft.day, stockWarned: warned };
}

// Vid servicens början: menyn är det som finns i lagret (också drycker
// som stått sig sedan i går).
export function menuAtServiceStart(state: SimulationState): SimulationState {
  if (!usesPackages(state)) return state;
  // En meny som redan är satt i dag (ett köpt paket, eller COMPOSE_MENU)
  // står kvar med sina priser; bara en tom meny hämtas ur lagret.
  if (state.menu.length > 0) return state;
  return withMenuFromStock(state);
}

// En dryck till gästen ur lagret, viktad mot det billigare som gäster
// oftast väljer. Returnerar priset, eller null när ingen dryck finns.
export function drawDrinkForGuest(draft: SimulationState, roll: number): { dishId: string; price: number } | null {
  const drinks = draft.menu.filter((m) => findDish(m.dishId)?.kind === 'drink' && (draft.day.platesRemaining[m.dishId] ?? 0) > 0);
  if (drinks.length === 0) return null;
  const weights = drinks.map((d) => 1 / d.price);
  const total = weights.reduce((a, b) => a + b, 0);
  let x = roll * total;
  let pick = drinks[drinks.length - 1];
  for (let i = 0; i < drinks.length; i++) {
    x -= weights[i];
    if (x <= 0) { pick = drinks[i]; break; }
  }
  const dish = findDish(pick.dishId)!;
  const stock = { ...draft.stock };
  for (const r of dish.recipe) stock[r.ingredientId] = (stock[r.ingredientId] ?? 0) - r.units;
  noteBottles(draft, pick.dishId, draft.stock, stock);
  draft.stock = stock;
  draft.day.platesRemaining = computePlatesRemaining(draft.menu, stock, draft.dishPortions);
  return { dishId: pick.dishId, price: pick.price };
}

// Ingredienser som bara används i drycker står sig; allt annat är mat.
function drinkOnlyIngredients(state: SimulationState): Set<string> {
  const drink = new Set<string>();
  const food = new Set<string>();
  for (const id of packageDishIds(state.economy.businessClass)) {
    const dish = findDish(id);
    for (const r of dish?.recipe ?? []) (dish?.kind === 'drink' ? drink : food).add(r.ingredientId);
  }
  return new Set([...drink].filter((i) => !food.has(i)));
}

// ORDER 280 — sopbilen (Designs S1): efter kvällen. En del av den osålda
// maten sparas till nästa dag (ORDER 278, WASTE.carryShare; ORDER 318: med
// portionsboken efter hållbarheten, WASTE.shelfEvenings), resten blir
// svinn. Miljöavgiften räknas i kilo i fyra fraktioner — osåld mat,
// tallrikssvinn, glas och kartong — gånger taxan, plus hämtningen.
// Svinnets värde är redan betalt vid inköpet och visas bara; bara avgiften
// dras från kassan.
export interface WasteFraction {
  key: 'unsold' | 'plates' | 'glass' | 'cardboard';
  kg: number;
  valueSek: number;
  // Osålt: portioner (med portionsboken, ORDER 284; annars råvaruenheter);
  // tallrikar: serverade; glas: flaskor.
  count: number;
}

export interface WasteSettlement {
  dayNumber: number;
  units: number;
  sek: number;
  kept: number;
  feeSek: number;
  kg: number;
  fractions: WasteFraction[];
  // Rådet: rätten vars råvara kostade mest i svinn, med antalet att köpa
  // färre av (avrundat nedåt till ett parti) och vad det sparar.
  advice: { dishId: string; fewer: number; savesSek: number } | null;
  // ORDER 289 — maten tog slut före stängning.
  shortage?: { clock: string | null; guests: number; more: number } | null;
  // ORDER 285 — portionerna som lagts undan till morgonens fråga.
  aside?: { dishId: string; portions: number } | null;
  // ORDER 318 — glas i öppnade flaskor som blev svinn (värdet ingår i sek).
  openGlasses?: number;
}

export function wasteAtDayEnd(state: SimulationState): { stock: Record<string, number>; waste: WasteSettlement | null; dishPortions?: Record<string, number>; dishLots?: SimulationState['dishLots']; openBottles?: SimulationState['openBottles'] } {
  if (!usesPackages(state)) return { stock: state.stock, waste: null };
  const day = state.day.dayNumber;
  // ORDER 318 — partierna efter portionsboken; det som går ut i kväll blir svinn.
  const lots = state.dishPortions ? syncLots(state.dishLots, state.dishPortions, day, dishShelfEvenings) : undefined;
  let dishLots: SimulationState['dishLots'];
  const openBottles = { ...(state.openBottles ?? {}) };
  let openGlassesLost = 0;
  const keep = drinkOnlyIngredients(state);
  const stock: Record<string, number> = {};
  let units = 0;
  let sek = 0;
  let kept = 0;
  let unsoldKg = 0;
  const wastedValue: Record<string, number> = {};
  const wastedUnits: Record<string, number> = {};
  let dishPortions: Record<string, number> | undefined;
  let aside: { dishId: string; portions: number } | null = null;
  if (state.dishPortions) {
    // ORDER 284 — svinnet i portioner per rätt, samma enhet som lagret under
    // servicen (L1) och morgonens inköp (M1). Sparade portioner får sina
    // råvaror med sig; resten av matens råvaror går till sopbilen.
    dishPortions = {};
    const need: Record<string, number> = {};
    // ORDER 285 — den rätt med flest förlorade portioner läggs undan till
    // morgonens fråga (salvage.ts); dess råvaror står kvar i lagret.
    const lostBy: Record<string, number> = {};
    for (const [dishId, p] of Object.entries(state.dishPortions)) {
      const dish = findDish(dishId);
      if (!dish || dish.kind === 'drink' || p <= 0) continue;
      lostBy[dishId] = Math.min(p, expiringBy(lots, dishId, day));
    }
    aside = pickSalvage(lostBy);
    for (const [dishId, p] of Object.entries(state.dishPortions)) {
      const dish = findDish(dishId);
      if (!dish || dish.kind === 'drink' || p <= 0) continue;
      const saved = p - Math.min(p, expiringBy(lots, dishId, day));
      const setAside = aside?.dishId === dishId ? aside.portions : 0;
      for (const r of dish.recipe) need[r.ingredientId] = (need[r.ingredientId] ?? 0) + setAside * r.units;
      const lost = p - saved - setAside;
      if (saved > 0) dishPortions[dishId] = saved;
      for (const r of dish.recipe) need[r.ingredientId] = (need[r.ingredientId] ?? 0) + saved * r.units;
      kept += saved;
      units += lost;
      if (lost > 0) {
        wastedValue[dishId] = lost * dishCostSek(dishId);
        wastedUnits[dishId] = lost;
      }
    }
    dishLots = freshAfter(lots, day);
    for (const [id, n] of Object.entries(state.stock)) {
      const ing = findIngredient(id);
      if (keep.has(id) || !ing) {
        // ORDER 318 — oöppnade flaskor står kvar; glasen i en öppnad flaska
        // blir svinn efter WASTE.openBottleEvenings kvällar.
        const last = openBottleLastEvening(state.openBottles, id);
        if (last !== null && last <= day && n > 0) {
          const open = n % GLASSES_PER_BOTTLE;
          stock[id] = n - open;
          openGlassesLost += open;
          sek += open * minIngredientCost(id);
          if (open > 0) { wastedValue[id] = (wastedValue[id] ?? 0) + open * minIngredientCost(id); wastedUnits[id] = (wastedUnits[id] ?? 0) + open; }
          delete openBottles[id];
        } else stock[id] = n;
        continue;
      }
      if (n <= 0) continue;
      const left = Math.min(n, need[id] ?? 0);
      if (left > 0) stock[id] = left;
      const lost = n - left;
      sek += lost * minIngredientCost(id);
      unsoldKg += lost * (WASTE.kgPerUnit[ing.unit] ?? 0);
    }
  } else {
    for (const [id, n] of Object.entries(state.stock)) {
      const ing = findIngredient(id);
      if (keep.has(id) || !ing) { stock[id] = n; continue; }
      if (n <= 0) continue;
      const saved = Math.floor(n * (WASTE.carryShare[id] ?? 0));
      if (saved > 0) stock[id] = saved;
      kept += saved;
      const lost = n - saved;
      units += lost;
      sek += lost * minIngredientCost(id);
      unsoldKg += lost * (WASTE.kgPerUnit[ing.unit] ?? 0);
      wastedValue[id] = lost * minIngredientCost(id);
      wastedUnits[id] = lost;
    }
  }
  const served = state.day.portionsServed ?? 0;
  const bottles = Math.ceil((state.day.bottleGlassesPoured ?? 0) / GLASSES_PER_BOTTLE);
  const fractions: WasteFraction[] = [
    { key: 'unsold', kg: unsoldKg, valueSek: Math.round(sek), count: units },
    { key: 'plates', kg: served > 0 ? Math.max(WASTE.plateKgMin, served * WASTE.plateKgPerServed) : 0, valueSek: 0, count: served },
    { key: 'glass', kg: bottles * WASTE.kgPerBottle, valueSek: 0, count: bottles },
    { key: 'cardboard', kg: state.day.stockBoughtToday ? WASTE.cardboardKg : 0, valueSek: 0, count: 0 }
  ];
  const kg = fractions.reduce((a, f) => a + f.kg, 0);
  if (kg <= 0 && kept === 0 && !aside && openGlassesLost === 0) return { stock, waste: null, dishPortions, dishLots, openBottles };
  const feeSek = kg > 0 ? Math.round(kg * WASTE.feePerKg + WASTE.pickupFeeSek) : 0;
  // Rådet: den dyraste råvaran i svinnet och den rätt på menyn som bär den.
  let advice: WasteSettlement['advice'] = null;
  const worst = Object.keys(wastedValue).filter((k) => findDish(k)?.kind !== 'drink' && !keep.has(k)).sort((a, b) => wastedValue[b] - wastedValue[a])[0];
  if (worst && wastedUnits[worst] >= WASTE.adviceMinPortions) {
    // Med portionsboken är nyckeln redan rätten.
    const dishId = dishPortions ? worst : packageDishIds(state.economy.businessClass).find((d) => findDish(d)?.kind !== 'drink' && findDish(d)?.recipe[0]?.ingredientId === worst)
      ?? packageDishIds(state.economy.businessClass).find((d) => findDish(d)?.recipe.some((r) => r.ingredientId === worst));
    if (dishId) {
      const step = ITEM_BATCH.dish;
      const fewer = Math.max(step, Math.floor(wastedUnits[worst] / step) * step);
      advice = { dishId, fewer, savesSek: Math.round(fewer * dishCostSek(dishId)) };
    }
  }
  // ORDER 289 — tog maten slut före stängning och gick gäster utan mat är
  // rådet att köpa mer: gästerna som blev utan, avrundat uppåt till parti.
  const without = state.day.soldOutGuests ?? 0;
  const shortage = without > 0 || state.day.foodOutClock
    ? { clock: state.day.foodOutClock ?? null, guests: without, more: without > 0 ? Math.ceil(without / ITEM_BATCH.dish) * ITEM_BATCH.dish : 0 }
    : null;
  return { stock, dishPortions, dishLots, openBottles, waste: { dayNumber: state.day.dayNumber, units, sek: Math.round(sek), kept, feeSek, kg: Math.round(kg * 10) / 10, fractions, advice: shortage ? null : advice, aside, shortage, openGlasses: openGlassesLost } };
}

// ORDER 280 — sopbilen kommer när servicen stänger (Designs S1): lagret
// efteråt, avgiften ur kassan, raden i kassaboken och strömmen. Muterar
// draft. Görs en gång per dag (day.wasteSettled); en dag utan service
// avräknas vid dygnsskiftet.
export function settleWaste(draft: SimulationState): void {
  if (draft.day.wasteSettled || !usesPackages(draft)) return;
  // ORDER 285 — gårdagens rester som aldrig fick svar går till sopbilen
  // innan kvällens svinn räknas.
  discardUnresolvedSalvage(draft);
  if (draft.salvage) draft.salvage = null;
  const { stock, waste: raw, dishPortions, dishLots, openBottles } = wasteAtDayEnd(draft);
  // ORDER 296 — dagens rätt av gårdagens rester (butiken): mindre till sopbilen.
  const waste = raw && abilityActive(draft, 'leftovers') ? { ...raw, feeSek: Math.round(raw.feeSek * SHOP.effects.leftoversWasteShare) } : raw;
  draft.stock = stock;
  if (draft.dishPortions) draft.dishPortions = dishPortions ?? {};
  if (dishLots) draft.dishLots = dishLots;
  if (openBottles) draft.openBottles = openBottles;
  draft.lastWaste = waste;
  draft.day = { ...draft.day, wasteSettled: true };
  if (!waste) return;
  if (waste.aside) draft.salvage = { fromDay: waste.dayNumber, dishId: waste.aside.dishId, portions: waste.aside.portions, resolved: null };
  if (waste.feeSek > 0) {
    // Miljöavgiften är en kostnad (state.cost), som i ORDER 278, och den
    // hör till kvällens avräkning när sopbilen kommer efter servicen.
    applyCashCost(draft, waste.feeSek);
    postLedger(draft, { category: 'waste', amount: -waste.feeSek, cause: strings.waste.ledger, causeId: 'waste' });
    const m = draft.eveningAccount?.metrics;
    if (m) draft.eveningAccount = { ...draft.eveningAccount!, metrics: { ...m, cost: m.cost + waste.feeSek, result: m.result - waste.feeSek } };
  }
  const fee = strings.service.meters.sek(waste.feeSek.toLocaleString(numberLocale()));
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime,
    text: waste.units > 0 ? strings.waste.event(waste.kept, waste.units, fee) : strings.waste.keptOnly(waste.kept),
    category: 'ambient', causeTag: 'stock_out', causeChainId: null, sustainability: 'ecological', kind: 'stock_waste', scenarioId: null
  }];
}
