// ORDER 275 — lagret är insatsen (Vision Owner 2026-09-28, provspel).
// ORDER 277 — morgonen är insatsen (Vision Owner 2026-09-28, andra
// provspelet): "Menyn och dryckeslistan (viner på glas och flaska, öl,
// alkoholfritt) och mängder måste sättas innan servicen kan starta. Kassan
// syns hela tiden och räknas ner animerat vid varje inköp."
//
// Högerspalten i morgonens schema (S1) för klasser med paket: en
// inköpslista med menyns rätter och dryckeslistans drycker, var och en med
// kost och allergener, gästens pris, kostnaden per portion, vad som finns i
// lager och en mängd som spelaren sätter. Paketen fyller listan (de köper
// inte direkt). "Köp listan" drar kassan (BUY_ITEMS, stockPackages.ts), och
// kassan överst räknas ner (CashCounter). Leverantörerna syns inte.

import { useEffect, useState } from 'react';
import { strings } from '../../content/strings';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { dishAllergens, dishDiet, estimateDishIngredientCost, findDish } from '../simulation/m4Catalogue';
import { itemsCostSek, orderSheetDishIds, packageItems, packagesFor } from '../simulation/packages';
import { menuFromStock, computePlatesRemaining } from '../simulation/stockPackages';
import { stockForecast } from '../../sim/stockForecast';
import { NxLabel, u } from '../ui/system/components';
import { formatSek } from '../ui/CashCounter';
import type { DrinkKind } from '../types';
import '../ui/screens/screens.css';

const T = strings.stock;

// Ett klick på + lägger till så här många portioner (ett glas är en
// portion, en flaska är en flaska).
const STEP: Record<'dish' | DrinkKind, number> = { dish: 2, 'wine-glass': 6, 'wine-bottle': 1, beer: 6, 'alcohol-free': 4 };
const DRINK_ORDER: DrinkKind[] = ['wine-glass', 'wine-bottle', 'beer', 'alcohol-free'];

function stepFor(dishId: string): number {
  const d = findDish(dishId);
  return d?.kind === 'drink' ? STEP[d.drink ?? 'wine-glass'] : STEP.dish;
}

function tagsFor(dishId: string): string[] {
  const d = findDish(dishId);
  if (!d || d.kind === 'drink') return [];
  const diet = dishDiet(dishId);
  return [T.tags[diet], ...dishAllergens(dishId).map((a) => T.tags[a])];
}

function SheetRow({ dishId, qty, have, onChange, disabled }: { dishId: string; qty: number; have: number; onChange: (n: number) => void; disabled: boolean }) {
  const dish = findDish(dishId);
  if (!dish) return null;
  const tags = tagsFor(dishId);
  const step = stepFor(dishId);
  return (
    <div className="nxs-menu-row" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center', paddingTop: u(8) }} data-testid={`sheet-row-${dishId}`}>
      <div>
        <div style={{ fontWeight: 700 }}>{dish.name}</div>
        <div className="nxs-row-sub">
          {tags.length > 0 && <span data-testid={`sheet-tags-${dishId}`}>{tags.join(' · ')} · </span>}
          {T.priceAndCost(formatSek(dish.suggestedPrice), formatSek(estimateDishIngredientCost(dishId)))}
        </div>
        <div className="nxs-row-sub">
          {dish.glassesPerBottle ? `${T.bottleNote(dish.glassesPerBottle)} · ` : ''}{dish.kind === 'drink' ? T.haveNow(have) : T.portions(have)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: u(8) }}>
        <button type="button" className="nx-btn nx-btn-secondary" style={{ width: u(52), minWidth: 0, padding: 0, justifyContent: 'center' }}
          onClick={() => onChange(Math.max(0, qty - step))} disabled={disabled || qty === 0} aria-label={T.less(dish.name)} data-testid={`sheet-less-${dishId}`}>
          <span>−</span>
        </button>
        <span style={{ minWidth: u(44), textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} data-testid={`sheet-qty-${dishId}`}>{qty}</span>
        <button type="button" className="nx-btn nx-btn-secondary" style={{ width: u(52), minWidth: 0, padding: 0, justifyContent: 'center' }}
          onClick={() => onChange(qty + step)} disabled={disabled} aria-label={T.more(dish.name)} data-testid={`sheet-more-${dishId}`}>
          <span>+</span>
        </button>
      </div>
    </div>
  );
}

export function StockPackagesPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const [sheet, setSheet] = useState<Record<string, number>>({});
  // En ny morgon börjar med en tom lista.
  useEffect(() => setSheet({}), [sim.day.dayNumber]);
  const pkgs = packagesFor(sim.economy.businessClass);
  if (!pkgs) return null;
  const morning = sim.day.period === 'morning';
  const ids = orderSheetDishIds(sim.economy.businessClass);
  const menu = menuFromStock(sim);
  const plates = computePlatesRemaining(ids.map((dishId) => ({ dishId, price: 0, ingredientCostSek: 0 })), sim.stock);
  const set = (id: string, n: number) => setSheet((s) => ({ ...s, [id]: n }));
  const fill = (items: Record<string, number>) => setSheet((s) => {
    const next = { ...s };
    for (const [id, n] of Object.entries(items)) next[id] = (next[id] ?? 0) + n;
    return next;
  });
  const total = itemsCostSek(sheet);
  const buy = () => {
    dispatch({ type: 'BUY_ITEMS', items: sheet });
    setSheet({});
  };
  const dishes = ids.filter((id) => findDish(id)?.kind !== 'drink');
  const drinksBy = DRINK_ORDER.map((k) => ({ kind: k, ids: ids.filter((id) => findDish(id)?.drink === k) })).filter((g) => g.ids.length > 0);
  // Kuverten räknas på maten; drycken följer med varje gäst.
  const forecast = stockForecast({ menu: menu.filter((m) => findDish(m.dishId)?.kind !== 'drink'), stock: sim.stock });
  const covers = forecast.kind === 'covers' ? forecast.covers : null;
  const row = (id: string) => (
    <SheetRow key={id} dishId={id} qty={sheet[id] ?? 0} have={plates[id] ?? 0} onChange={(n) => set(id, n)} disabled={!morning} />
  );
  return (
    <div className="nx" data-testid="stock-packages">
      <div className="nxs-list-head"><NxLabel>{T.sheetHeading}</NxLabel></div>
      <p className="nxs-row-sub nxs-mt-8">{T.sheetIntro}</p>
      {sim.lastWaste && sim.lastWaste.dayNumber === sim.day.dayNumber - 1 && (
        <p className="nxs-row-sub" data-testid="stock-last-waste">{T.lastWaste(formatSek(sim.lastWaste.sek))}</p>
      )}

      <div className="nxs-list-head nxs-mt-8"><NxLabel>{T.fillHeading}</NxLabel></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: u(8), marginTop: u(8) }}>
        {[pkgs.base, ...pkgs.addOns].map((p) => (
          <button key={p.id} type="button" className="nx-btn nx-btn-quiet" style={{ width: 'auto' }}
            onClick={() => fill(packageItems(p))} disabled={!morning} title={T.packages[p.id]?.description}
            data-testid={`fill-${p.id}`}>
            <span>{T.fillWith(T.packages[p.id]?.name ?? p.id)}</span>
          </button>
        ))}
      </div>

      <div className="nxs-list-head nxs-mt-8"><NxLabel>{T.sheetDishes}</NxLabel></div>
      {dishes.map(row)}
      <div className="nxs-list-head nxs-mt-8"><NxLabel>{T.sheetDrinks}</NxLabel></div>
      {drinksBy.map((g) => (
        <div key={g.kind} data-testid={`sheet-group-${g.kind}`}>
          <div className="nx-label nxs-mt-8" style={{ color: 'var(--nx-ink-2)' }}>{T.drinkGroups[g.kind]}</div>
          {g.ids.map(row)}
        </div>
      ))}

      <div className="nxs-mt-8" style={{ display: 'flex', gap: u(12), alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button type="button" className="nx-btn nx-btn-quiet" style={{ width: 'auto' }} onClick={() => setSheet({})} disabled={total === 0} data-testid="sheet-clear">
          <span>{T.clear}</span>
        </button>
        <button type="button" className="nx-btn nx-btn-secondary" style={{ width: 'auto', minWidth: u(260) }}
          onClick={buy} disabled={!morning || total === 0} data-testid="buy-sheet" data-total={total}>
          <span>{total === 0 ? T.sheetEmpty : T.buySheet(formatSek(total))}</span>
        </button>
      </div>

      <div className="nxs-list-head nxs-mt-8"><NxLabel>{T.inStock}</NxLabel></div>
      <div data-testid="stock-in-stock" data-covers={covers ?? 0} data-items={menu.length}>
        {menu.length === 0 ? (
          <p className="nxs-row-sub nxs-mt-8">{T.empty}</p>
        ) : (
          <>
            {covers !== null && <p className="nxs-row-sub nxs-mt-8">{T.covers(covers)}</p>}
            <p className="nxs-row-sub">{T.drinksKeep}</p>
          </>
        )}
      </div>
    </div>
  );
}
