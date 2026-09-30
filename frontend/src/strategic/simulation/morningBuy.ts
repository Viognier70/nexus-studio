// ORDER 280 — morgonens inköp i partier (Designs M1, leveransen kassan och
// kvällen; Vision Owner 2026-09-29). Raderna, partierna och täckningen som
// skärmen visar, räknade ur samma lager och katalog som simuleringen.
//
// - Rätterna köps i partier om ITEM_BATCH.dish portioner. Antalet är hur
//   många portioner lagret räcker till (computePlatesRemaining; rätter som
//   delar råvara visar taket).
// - Drycken köps i flaskor: vin och alkoholfritt är GLASSES_PER_BOTTLE glas
//   per flaska och köps ITEM_BATCH.bottle flaskor åt gången, öl är ett glas
//   per flaska och köps ITEM_BATCH.beer åt gången. Antalet är hela flaskor
//   plus glasen i den öppna flaskan.
// - Täckningen: kuverten maten räcker till (stockForecast) mot kvällens
//   väntade gäster (marknadens tak, dailyGuestCap), glasen per gäst, och vad
//   lagret ger om allt säljs.

import { ITEM_BATCH, STOCK } from '../../sim/balance';
import { dailyGuestCap } from '../../sim/economy';
import { stockForecast } from '../../sim/stockForecast';
import type { SimulationState } from '../types';
import { findDish, GLASSES_PER_BOTTLE, minIngredientCost } from './m4Catalogue';
import { packageDishIds } from './packages';
import { computePlatesRemaining, menuFromStock } from './stockPackages';

export interface DishRow {
  kind: 'dish';
  dishId: string;
  name: string;
  costSek: number;
  priceSek: number;
  portions: number;
  step: number;
  items: Record<string, number>;
}

export interface DrinkRow {
  kind: 'drink';
  ingredientId: string;
  dishId: string;
  name: string;
  beer: boolean;
  glassesPerBottle: number;
  costPerBottleSek: number;
  glassPriceSek: number;
  bottles: number;
  openGlasses: number;
  step: number;
  items: Record<string, number>;
}

function dishCost(dishId: string): number {
  return (findDish(dishId)?.recipe ?? []).reduce((a, r) => a + minIngredientCost(r.ingredientId) * r.units, 0);
}

const BY_THE_GLASS = /, (by the glass|per glas)$/;

export function morningRows(state: SimulationState): { dishes: DishRow[]; drinks: DrinkRow[] } {
  const ids = packageDishIds(state.economy.businessClass);
  const plates = computePlatesRemaining(ids.map((dishId) => ({ dishId, price: 0, ingredientCostSek: 0 })), state.stock, state.dishPortions);
  const dishes: DishRow[] = ids
    .filter((id) => findDish(id)?.kind !== 'drink')
    .map((id) => ({
      kind: 'dish' as const,
      dishId: id,
      name: findDish(id)!.name,
      costSek: Math.round(dishCost(id)),
      priceSek: findDish(id)!.suggestedPrice,
      portions: plates[id] ?? 0,
      step: ITEM_BATCH.dish,
      items: { [id]: ITEM_BATCH.dish }
    }));
  // En rad per dryck: glaset (eller ölen) är den rätt som köps.
  const drinks: DrinkRow[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const d = findDish(id);
    if (!d || d.kind !== 'drink' || d.drink === 'wine-bottle' || d.recipe.length !== 1) continue;
    const ing = d.recipe[0].ingredientId;
    if (seen.has(ing)) continue;
    seen.add(ing);
    const beer = d.drink === 'beer';
    const gpb = beer ? 1 : GLASSES_PER_BOTTLE;
    const step = beer ? ITEM_BATCH.beer : ITEM_BATCH.bottle;
    const units = Math.max(0, Math.floor(state.stock[ing] ?? 0));
    drinks.push({
      kind: 'drink',
      ingredientId: ing,
      dishId: id,
      name: d.name.replace(BY_THE_GLASS, ''),
      beer,
      glassesPerBottle: gpb,
      costPerBottleSek: Math.round(minIngredientCost(ing) * gpb),
      glassPriceSek: d.suggestedPrice,
      bottles: Math.floor(units / gpb),
      openGlasses: units % gpb,
      step,
      items: { [id]: step * gpb }
    });
  }
  return { dishes, drinks };
}

// Dagens inköp i kronor: kassabokens lagerrader i dag (inköp minus det som
// lämnats tillbaka).
export function spentTodaySek(state: SimulationState): number {
  return Math.round(-state.ledger
    .filter((l) => l.day === state.day.dayNumber && l.category === 'stock')
    .reduce((a, l) => a + l.amount, 0));
}

export function coverage(state: SimulationState) {
  const menu = menuFromStock(state);
  const food = menu.filter((m) => findDish(m.dishId)?.kind !== 'drink');
  const f = stockForecast({ menu: food, stock: state.stock });
  const covers = f.kind === 'covers' ? f.covers : 0;
  const expected = dailyGuestCap(state);
  const guests = Number.isFinite(expected) ? expected : covers;
  const { drinks } = morningRows(state);
  const glasses = drinks.reduce((a, d) => a + d.bottles * d.glassesPerBottle + d.openGlasses, 0);
  const meanFood = food.length > 0 ? food.reduce((a, m) => a + m.price, 0) / food.length : 0;
  const potentialSek = Math.round(covers * meanFood + drinks.reduce((a, d) => a + (d.bottles * d.glassesPerBottle + d.openGlasses) * d.glassPriceSek, 0));
  // ORDER 291 — behovet och varningen när inköpet är mer än dubbelt behovet.
  const glassesNeeded = Math.ceil(guests * (1 + STOCK.secondDrinkChance));
  const overFood = guests > 0 && covers > guests * STOCK.overBuyFactor;
  const overDrink = glassesNeeded > 0 && glasses > glassesNeeded * STOCK.overBuyFactor;
  return { covers, guests, share: guests > 0 ? Math.min(1, covers / guests) : 0, glasses, glassesPerGuest: guests > 0 ? glasses / guests : 0, potentialSek, glassesNeeded, overFood, overDrink };
}

// Värdet av det som står i lagret, mat eller dryck, till inköpspris.
export function stockValueSek(state: SimulationState, part: 'food' | 'drink'): number {
  const { drinks } = morningRows(state);
  const drinkIngredients = new Set(drinks.map((d) => d.ingredientId));
  let sek = 0;
  for (const [id, n] of Object.entries(state.stock)) {
    if (n <= 0 || drinkIngredients.has(id) !== (part === 'drink')) continue;
    sek += n * minIngredientCost(id);
  }
  return Math.round(sek);
}
