// ORDER 266 (Nexus v1 etapp 4) — lagret: prognos i ord före öppning.
//
// Speldesign > Lagret: "Spelaren får öppna med för lite råvaror. Före
// öppning visas en prognos i ord, till exempel 'råvaror till ungefär
// elva kuvert'. Ett medvetet dåligt beslut är både roligt och lärorikt.
// Att bli stoppad är det inte." Öppning blockeras aldrig.
//
// Kuverten räknas genom att fördela lagret mellan menyns rätter i tur
// och ordning tills ingen rätt längre går att laga. Rätterna delar
// råvaror, så en summa per rätt (som tallrikspanelen visar) skulle
// överskatta.

import { findDish } from '../strategic/simulation/m4Catalogue';
import type { SimulationState } from '../strategic/types';

export type StockForecast =
  | { kind: 'noMenu' }
  | { kind: 'covers'; covers: number };

export function stockForecast(state: Pick<SimulationState, 'menu' | 'stock'>): StockForecast {
  if (state.menu.length === 0) return { kind: 'noMenu' };
  const stock: Record<string, number> = { ...state.stock };
  const recipes = state.menu.map((m) => findDish(m.dishId)?.recipe ?? []).filter((r) => r.length > 0);
  let covers = 0;
  let madeSomething = true;
  while (madeSomething) {
    madeSomething = false;
    for (const recipe of recipes) {
      if (recipe.every((r) => (stock[r.ingredientId] ?? 0) >= r.units)) {
        for (const r of recipe) stock[r.ingredientId] -= r.units;
        covers += 1;
        madeSomething = true;
      }
    }
  }
  return { kind: 'covers', covers };
}
