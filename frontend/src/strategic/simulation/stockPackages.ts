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
import { strings } from '../../content/strings';
import { applyCashDelta, postLedger } from './cashReading';
import { findDish, findIngredient, minIngredientCost } from './m4Catalogue';
import { findPackage, packageCostSek, packageDishIds, packageIngredients, packagesFor } from './packages';

type Menu = SimulationState['menu'];

// Portioner kvar per rätt på menyn: det minsta av lager / receptets enheter.
export function computePlatesRemaining(menu: Menu, stock: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of menu) {
    const dish = findDish(entry.dishId);
    if (!dish) { out[entry.dishId] = 0; continue; }
    let minPlates = Infinity;
    for (const r of dish.recipe) {
      const plates = Math.floor((stock[r.ingredientId] ?? 0) / r.units);
      if (plates < minPlates) minPlates = plates;
    }
    out[entry.dishId] = Number.isFinite(minPlates) ? minPlates : 0;
  }
  return out;
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
    if ((computePlatesRemaining([entry], state.stock)[dishId] ?? 0) > 0) menu.push(entry);
  }
  return menu;
}

function withMenuFromStock(state: SimulationState): SimulationState {
  const menu = menuFromStock(state);
  return { ...state, menu, day: { ...state.day, platesRemaining: computePlatesRemaining(menu, state.stock) } };
}

// Köp ett paket på morgonen. Kassan sjunker direkt.
export function buyPackage(state: SimulationState, packageId: string): SimulationState {
  if (state.day.period !== 'morning') return state;
  const pkg = findPackage(state.economy.businessClass, packageId);
  if (!pkg) return state;
  const costSek = packageCostSek(pkg);
  const stock = { ...state.stock };
  for (const [id, units] of Object.entries(packageIngredients(pkg))) stock[id] = (stock[id] ?? 0) + units;
  const next = withMenuFromStock({
    ...state,
    stock,
    packagesBoughtToday: [...(state.packagesBoughtToday ?? []), packageId]
  });
  applyCashDelta(next, -costSek);
  postLedger(next, { category: 'stock', amount: -costSek, cause: strings.stock.packageLedger(strings.stock.packages[packageId]?.name ?? packageId), causeId: packageId });
  return next;
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
  draft.stock = stock;
  draft.day.platesRemaining = computePlatesRemaining(draft.menu, stock);
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

// Vid dagens slut: osåld mat blir svinn. Returnerar lagret efteråt och
// svinnet (portioner räknas som ingrediensenheter, i kronor till
// inköpspris).
export function wasteAtDayEnd(state: SimulationState): { stock: Record<string, number>; waste: { dayNumber: number; units: number; sek: number } | null } {
  if (!usesPackages(state)) return { stock: state.stock, waste: null };
  const keep = drinkOnlyIngredients(state);
  const stock: Record<string, number> = {};
  let units = 0;
  let sek = 0;
  for (const [id, n] of Object.entries(state.stock)) {
    if (keep.has(id) || !findIngredient(id)) { stock[id] = n; continue; }
    if (n > 0) { units += n; sek += n * minIngredientCost(id); }
  }
  return { stock, waste: units > 0 ? { dayNumber: state.day.dayNumber, units, sek: Math.round(sek) } : null };
}
