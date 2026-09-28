// ORDER 077 §4 (M4) — morning menu + stock picker.
//
// Two sub-panels stacked vertically:
//   1. Compose menu — click dish cards to toggle inclusion, set
//      per-dish price via inline input.
//   2. Buy stock — supplier + ingredient dropdown + units input +
//      confirm button; posts a labelled stock ledger line per buy.
//
// ORDER 271 — formen efter Designs S1 (paket 1): högerspalten i
// morgonens schema (scenario/DayActionBar.tsx). Menyn som en lista med
// rutor, inköpen under. Samma utkast, samma COMPOSE_MENU och BUY_STOCK.
//
// Morning-only per §5 of the report gate: "menu is set in the
// morning and stands". Once service opens, the reducer refuses
// further COMPOSE_MENU / BUY_STOCK dispatches (period check).

import { useMemo, useState } from 'react';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import {
  DISHES,
  INGREDIENTS,
  SUPPLIERS,
  estimateDishIngredientCost,
  findIngredient,
  findSupplier
} from '../simulation/m4Catalogue';
import { strings } from '../../content/strings';
import { NxLabel } from '../ui/system/components';
import '../ui/screens/screens.css';

const T = strings.panels.menu;

interface DraftEntry {
  dishId: string;
  price: number;
  included: boolean;
}

export function MorningMenuPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  // Draft menu state — the reducer only commits on the "Confirm menu"
  // button so the player can toggle freely without spamming actions.
  const initialDrafts = useMemo<DraftEntry[]>(
    () => DISHES.map((d) => {
      const existing = sim.menu.find((m) => m.dishId === d.id);
      return {
        dishId: d.id,
        price: existing ? existing.price : d.suggestedPrice,
        included: !!existing
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim.day.dayNumber]
  );
  const [drafts, setDrafts] = useState<DraftEntry[]>(initialDrafts);

  const [supplierId, setSupplierId] = useState(SUPPLIERS[0].id);
  const [ingredientId, setIngredientId] = useState(INGREDIENTS[0].id);
  const [units, setUnits] = useState(5);

  if (sim.day.period !== 'morning') return null;

  const validIngredients = INGREDIENTS.filter((i) => i.suppliers.includes(supplierId));
  // Keep ingredientId consistent with the selected supplier.
  const currentIngredient = validIngredients.some((i) => i.id === ingredientId)
    ? ingredientId
    : (validIngredients[0]?.id ?? '');

  const commitMenu = () => {
    const chosen = drafts
      .filter((d) => d.included && d.price > 0)
      .map((d) => ({ dishId: d.dishId, price: d.price }));
    dispatch({ type: 'COMPOSE_MENU', dishes: chosen });
  };

  const buyStock = () => {
    if (units <= 0) return;
    dispatch({ type: 'BUY_STOCK', supplierId, ingredientId: currentIngredient, units });
  };

  return (
    <div className="nx" aria-label={T.aria} data-testid="morning-menu">
      <div className="nxs-list-head"><NxLabel>{T.menuHeading}</NxLabel></div>
      <div className="nxs-mt-8">
        {DISHES.map((d, idx) => {
          const draft = drafts[idx];
          const ingredientCost = estimateDishIngredientCost(d.id);
          return (
            <div key={d.id} className="nxs-menu-row" data-testid={`menu-dish-${d.id}`}>
              <label>
                <input
                  type="checkbox"
                  className="nxs-check"
                  checked={draft.included}
                  onChange={(e) => {
                    const copy = drafts.slice();
                    copy[idx] = { ...draft, included: e.target.checked };
                    setDrafts(copy);
                  }}
                />
                <span>
                  <span className="nxs-menu-name" data-off={!draft.included} style={{ display: 'block' }}>{d.name}</span>
                  <span className="nxs-row-sub" style={{ display: 'block' }}>{T.ingredientCost(ingredientCost.toFixed(0))}</span>
                </span>
              </label>
              <input
                type="number"
                className="nxs-input"
                value={draft.price}
                min={0}
                step={5}
                onChange={(e) => {
                  const copy = drafts.slice();
                  copy[idx] = { ...draft, price: Number(e.target.value) || 0 };
                  setDrafts(copy);
                }}
                aria-label={T.priceAria(d.name)}
              />
            </div>
          );
        })}
      </div>
      <div className="nxs-mt-8">
        <button type="button" className="nx-btn nx-btn-quiet" onClick={commitMenu} aria-label={T.confirmAria} data-testid="confirm-menu">
          <span>{T.confirm(drafts.filter((d) => d.included).length)}</span>
        </button>
      </div>

      <div className="nxs-list-head nxs-mt-24"><NxLabel>{T.stockHeading}</NxLabel></div>
      <div className="nxs-mt-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'calc(12 * var(--nx-u))' }}>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="nxs-input nxs-select"
          aria-label={T.supplierAria}
        >
          {SUPPLIERS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={currentIngredient}
          onChange={(e) => setIngredientId(e.target.value)}
          className="nxs-input nxs-select"
          aria-label={T.ingredientAria}
        >
          {validIngredients.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>
      <div className="nxs-mt-16" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'calc(12 * var(--nx-u))', alignItems: 'center' }}>
        <div className="nxs-row-sub">
          {(() => {
            const sup = findSupplier(supplierId);
            const ing = findIngredient(currentIngredient);
            if (!sup || !ing) return '';
            const perUnit = ing.baseCostSek * sup.priceIndex;
            return T.offer((perUnit * units).toFixed(0), (sup.reliability * 100).toFixed(0));
          })()}
        </div>
        <input
          type="number"
          className="nxs-input"
          value={units}
          min={1}
          step={1}
          onChange={(e) => setUnits(Number(e.target.value) || 0)}
          aria-label={T.unitsAria}
        />
        <div style={{ minWidth: 'calc(140 * var(--nx-u))' }}>
          <button type="button" className="nx-btn nx-btn-secondary" onClick={buyStock} aria-label={T.buyAria} data-testid="buy-stock">
            <span>{T.buy}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
