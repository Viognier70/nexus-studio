// ORDER 275 — lagret är insatsen (Vision Owner 2026-09-28, provspel).
//
// "Före servicen köper spelaren ett baspaket av rätter och drycker och kan
// köpa till fler viner och rätter. Kassan sjunker direkt. Under servicen
// säljs portioner ur lagret. Osålt blir svinn." Och: "Paketen ersätter
// inköpen i morgonens gränssnitt, och leverantörerna tas bort därifrån.
// Behåll ingredienserna under ytan: ett paket är en samling ingredienser,
// så att recept, lager och svinn fungerar som i dag."
//
// Ett paket är portioner av rätter och drycker ur katalogen
// (m4Catalogue.ts). Portionerna räknas om till ingredienser via recepten;
// priset är ingrediensernas kostnad hos den billigaste leverantören
// (`minIngredientCost`), samma som menyns frusna kostnad. Talen här är
// innehåll (som katalogens priser), valda i ORDER 275 (F48).

import { STOCK, type BusinessClassId } from '../../sim/balance';
import { DISHES, findDish, minIngredientCost } from './m4Catalogue';

export interface StockPackage {
  id: string;
  // Spelartexten står i strängfilen (strings.stock.packages[id]).
  items: readonly { dishId: string; portions: number }[];
}

export interface ClassPackages {
  base: StockPackage;
  addOns: readonly StockPackage[];
}

// Vinbaren: baspaketet räcker till ungefär en vanlig vardagskväll
// (harnessen: 19–34 gäster en vardag i vecka 1–2). Tillköpen är vin och
// rätter till fler gäster eller en dyrare kväll.
const VINBAR: ClassPackages = {
  // ORDER 277 — baspaketet har något för varje gäst: en vegansk rätt och
  // en vegansk dessert, vin på glas och flaska, öl och alkoholfritt.
  base: {
    id: 'vinbar-base',
    items: [
      { dishId: 'root-soup', portions: 6 },
      { dishId: 'chicken-plate', portions: 10 },
      { dishId: 'pork-plate', portions: 8 },
      { dishId: 'lentil-plate', portions: 4 },
      { dishId: 'dairy-dessert', portions: 4 },
      { dishId: 'lingon-sorbet', portions: 2 },
      { dishId: 'house-wine-glass', portions: 24 },
      { dishId: 'house-wine-bottle', portions: 2 },
      { dishId: 'beer-pairing', portions: 8 },
      { dishId: 'alcohol-free-glass', portions: 6 }
    ]
  },
  addOns: [
    { id: 'vinbar-extra-covers', items: [{ dishId: 'chicken-plate', portions: 6 }, { dishId: 'pork-plate', portions: 6 }, { dishId: 'house-wine-glass', portions: 12 }] },
    { id: 'vinbar-green', items: [{ dishId: 'lentil-plate', portions: 4 }, { dishId: 'chanterelle-toast', portions: 4 }] },
    { id: 'vinbar-fish', items: [{ dishId: 'fish-plate', portions: 6 }] },
    { id: 'vinbar-lamb', items: [{ dishId: 'lamb-plate', portions: 6 }] },
    { id: 'vinbar-game', items: [{ dishId: 'game-plate', portions: 4 }] },
    { id: 'vinbar-fine-wine', items: [{ dishId: 'fine-wine-glass', portions: 12 }, { dishId: 'fine-wine-bottle', portions: 2 }] },
    { id: 'vinbar-house-wine', items: [{ dishId: 'house-wine-glass', portions: 18 }, { dishId: 'house-wine-bottle', portions: 2 }] },
    { id: 'vinbar-alcohol-free', items: [{ dishId: 'alcohol-free-glass', portions: 8 }] }
  ]
};

// Klasser utan paket behåller inköpen per ingrediens tills deras paket är
// skrivna (som händelsebanken, ORDER 270).
const PACKAGES: Partial<Record<BusinessClassId, ClassPackages>> = { vinbar: VINBAR };

export function packagesFor(cls: BusinessClassId | null | undefined): ClassPackages | null {
  return (cls && PACKAGES[cls]) || null;
}

export function findPackage(cls: BusinessClassId | null | undefined, id: string): StockPackage | undefined {
  const p = packagesFor(cls);
  if (!p) return undefined;
  return [p.base, ...p.addOns].find((x) => x.id === id);
}

// Ingredienserna i ett paket (id → enheter), via recepten.
export function packageIngredients(pkg: StockPackage): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of pkg.items) {
    const dish = findDish(item.dishId);
    if (!dish) continue;
    for (const r of dish.recipe) out[r.ingredientId] = (out[r.ingredientId] ?? 0) + r.units * item.portions;
  }
  return out;
}

// Paketets pris i kronor: ingrediensernas kostnad, avrundad.
export function packageCostSek(pkg: StockPackage): number {
  const ing = packageIngredients(pkg);
  return Math.round(Object.entries(ing).reduce((sum, [id, units]) => sum + minIngredientCost(id) * units, 0));
}

// Rätterna och dryckerna som klassens paket kan innehålla (menyns
// universum). Menyn är de av dem som finns i lagret.
export function packageDishIds(cls: BusinessClassId | null | undefined): string[] {
  const p = packagesFor(cls);
  if (!p) return [];
  const ids = new Set<string>();
  for (const pkg of [p.base, ...p.addOns]) for (const item of pkg.items) ids.add(item.dishId);
  return [...ids];
}

// ORDER 277 — morgonens inköpslista: det som klassen kan sätta på menyn och
// dryckeslistan, i katalogens ordning (rätter först, sedan drycker).
export function orderSheetDishIds(cls: BusinessClassId | null | undefined): string[] {
  const ids = new Set(packageDishIds(cls));
  const all = DISHES.filter((d) => ids.has(d.id));
  return [...all.filter((d) => d.kind !== 'drink'), ...all.filter((d) => d.kind === 'drink')].map((d) => d.id);
}

// Portionerna av en rätt eller dryck i kronor, som paketen.
export function itemsCostSek(items: Record<string, number>): number {
  return packageCostSek({ id: 'sheet', items: Object.entries(items).filter(([, n]) => n > 0).map(([dishId, portions]) => ({ dishId, portions })) });
}

// ORDER 291 — baspaketet efter kvällens bokning (STOCK.baseCoversPerGuest):
// alla rader i samma andel, minst en av varje, aldrig mer än paketet.
export function scaledBaseItems(pkg: StockPackage, expectedGuests: number): Record<string, number> {
  const foodPortions = pkg.items.filter((i) => findDish(i.dishId)?.kind !== 'drink').reduce((a, i) => a + i.portions, 0);
  const factor = Number.isFinite(expectedGuests) && foodPortions > 0 ? Math.min(1, (expectedGuests * STOCK.baseCoversPerGuest) / foodPortions) : 1;
  const out: Record<string, number> = {};
  for (const i of pkg.items) out[i.dishId] = (out[i.dishId] ?? 0) + Math.max(1, Math.round(i.portions * factor));
  return out;
}

export function packageItems(pkg: StockPackage): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of pkg.items) out[i.dishId] = (out[i.dishId] ?? 0) + i.portions;
  return out;
}
