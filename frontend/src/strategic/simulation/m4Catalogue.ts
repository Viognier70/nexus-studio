// ORDER 077 §4 (M4) — supplier / ingredient / dish catalogues.
//
// Authored per M4_MENU_KITCHEN_STOCK_REPORT_ORDER_077.md §2–§4.
// Kept in one file so a Vision Owner sight-read of the numbers
// happens in one place; if the set grows past the point where one
// file is legible, split by role. Names are Swedish player text per
// CLAUDE.md rule 7 (Vision Owner 2026-09: "inga engelska paneler").

import type { Dish, Ingredient, Supplier } from '../types';

export const SUPPLIERS: readonly Supplier[] = [
  { id: 'wholesaler', name: 'Bergslagen wholesaler',  priceIndex: 0.85, quality: 0.55, reliability: 0.95, ecoDelta: -0.010 },
  { id: 'local-veg',  name: 'Grythyttan growers',     priceIndex: 1.10, quality: 0.80, reliability: 0.75, ecoDelta: +0.020 },
  { id: 'organic',    name: 'Örebro organic farms',   priceIndex: 1.35, quality: 0.85, reliability: 0.70, ecoDelta: +0.045 },
  { id: 'meat-game',  name: 'Bergslagen meat & game', priceIndex: 1.25, quality: 0.85, reliability: 0.80, ecoDelta: +0.025 },
  { id: 'lake-fish',  name: 'Hjälmaren lake fish',    priceIndex: 1.40, quality: 0.90, reliability: 0.55, ecoDelta: +0.035 },
  { id: 'brewery',    name: 'Nora brewery',           priceIndex: 1.00, quality: 0.75, reliability: 0.90, ecoDelta: +0.010 }
] as const;

export const INGREDIENTS: readonly Ingredient[] = [
  { id: 'root-veg',  name: 'root vegetables', baseCostSek:  4, unit: 'portion', suppliers: ['wholesaler', 'local-veg', 'organic'] },
  { id: 'leaf-veg',  name: 'leafy greens',  baseCostSek:  6, unit: 'portion', suppliers: ['wholesaler', 'local-veg', 'organic'] },
  { id: 'herbs',     name: 'fresh herbs',  baseCostSek:  3, unit: 'pinch',   suppliers: ['local-veg', 'organic'] },
  { id: 'chicken',   name: 'chicken',      baseCostSek: 22, unit: 'portion', suppliers: ['wholesaler', 'meat-game'] },
  { id: 'pork',      name: 'pork',         baseCostSek: 28, unit: 'portion', suppliers: ['wholesaler', 'meat-game'] },
  { id: 'lamb',      name: 'lamb',         baseCostSek: 55, unit: 'portion', suppliers: ['meat-game'] },
  { id: 'game',      name: 'game (deer)',  baseCostSek: 85, unit: 'portion', suppliers: ['meat-game'] },
  { id: 'lake-fish', name: 'lake fish',    baseCostSek: 45, unit: 'portion', suppliers: ['lake-fish'] },
  { id: 'eggs',      name: 'eggs',         baseCostSek:  3, unit: 'egg',     suppliers: ['wholesaler', 'local-veg', 'organic'] },
  { id: 'dairy',     name: 'dairy',        baseCostSek:  8, unit: 'portion', suppliers: ['wholesaler', 'local-veg', 'organic'] },
  { id: 'flour',     name: 'flour',        baseCostSek:  2, unit: 'portion', suppliers: ['wholesaler'] },
  { id: 'beer',      name: 'beer (drink)',  baseCostSek: 18, unit: 'glass',   suppliers: ['brewery'] }
] as const;

export const DISHES: readonly Dish[] = [
  { id: 'root-soup',     name: 'Root vegetable soup',      suggestedPrice:  95,
    recipe: [{ ingredientId: 'root-veg', units: 2 }, { ingredientId: 'dairy', units: 1 }, { ingredientId: 'herbs', units: 1 }] },
  { id: 'chicken-plate', name: 'Chicken with root veg',    suggestedPrice: 175,
    recipe: [{ ingredientId: 'chicken', units: 1 }, { ingredientId: 'root-veg', units: 1 }, { ingredientId: 'herbs', units: 1 }] },
  { id: 'pork-plate',    name: 'Pork with root veg',       suggestedPrice: 195,
    recipe: [{ ingredientId: 'pork', units: 1 }, { ingredientId: 'root-veg', units: 1 }, { ingredientId: 'herbs', units: 1 }] },
  { id: 'lamb-plate',    name: 'Lamb with root veg',       suggestedPrice: 285,
    recipe: [{ ingredientId: 'lamb', units: 1 }, { ingredientId: 'root-veg', units: 1 }, { ingredientId: 'herbs', units: 1 }] },
  { id: 'game-plate',    name: 'Game with root veg',       suggestedPrice: 385,
    recipe: [{ ingredientId: 'game', units: 1 }, { ingredientId: 'root-veg', units: 1 }, { ingredientId: 'herbs', units: 1 }] },
  { id: 'fish-plate',    name: 'Poached lake fish',        suggestedPrice: 265,
    recipe: [{ ingredientId: 'lake-fish', units: 1 }, { ingredientId: 'leaf-veg', units: 1 }, { ingredientId: 'herbs', units: 1 }] },
  { id: 'dairy-dessert', name: 'Cream dessert',            suggestedPrice:  85,
    recipe: [{ ingredientId: 'dairy', units: 2 }, { ingredientId: 'eggs', units: 1 }] },
  { id: 'beer-pairing',  name: 'Local beer with the meal', suggestedPrice: 55,
    recipe: [{ ingredientId: 'beer', units: 1 }] }
] as const;

export function findSupplier(id: string): Supplier | undefined {
  return SUPPLIERS.find((s) => s.id === id);
}

export function findIngredient(id: string): Ingredient | undefined {
  return INGREDIENTS.find((i) => i.id === id);
}

export function findDish(id: string): Dish | undefined {
  return DISHES.find((d) => d.id === id);
}

// Cheapest-supplier ingredient cost estimator used at COMPOSE_MENU
// time to freeze `ingredientCostSek` on each MenuEntry. If the
// player has already bought stock from a specific supplier, the
// freeze uses the average price index of the current stock buys
// weighted by units — but the caller passes that in; this base
// function just computes a per-ingredient min-cost estimate.
export function minIngredientCost(ingredientId: string): number {
  const ing = findIngredient(ingredientId);
  if (!ing) return 0;
  let minCost = Infinity;
  for (const supId of ing.suppliers) {
    const sup = findSupplier(supId);
    if (!sup) continue;
    const cost = ing.baseCostSek * sup.priceIndex;
    if (cost < minCost) minCost = cost;
  }
  return Number.isFinite(minCost) ? minCost : ing.baseCostSek;
}

// Sum recipe × min-supplier cost. Used as the DoD-1 `ingredientCostSek`
// value when the player has not (yet) bought stock — the panel can
// display a live cost estimate even before purchase.
export function estimateDishIngredientCost(dishId: string): number {
  const d = findDish(dishId);
  if (!d) return 0;
  return d.recipe.reduce((sum, r) => sum + minIngredientCost(r.ingredientId) * r.units, 0);
}
