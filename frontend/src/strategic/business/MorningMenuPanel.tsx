// ORDER 077 §4 (M4) — morning menu + stock picker.
//
// Two sub-panels stacked vertically:
//   1. Compose menu — click dish cards to toggle inclusion, set
//      per-dish price via inline input.
//   2. Buy stock — supplier + ingredient dropdown + units input +
//      confirm button; posts a labelled stock ledger line per buy.
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

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 72,
  right: 380,
  width: 340,
  padding: '10px 14px',
  background: 'rgba(20, 14, 10, 0.62)',
  color: '#f0e8d4',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 3,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  zIndex: 33,
  pointerEvents: 'auto',
  maxHeight: 'calc(100vh - 120px)',
  overflowY: 'auto'
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.62,
  marginBottom: 8
};

const SECTION_STYLE: React.CSSProperties = {
  marginBottom: 14,
  paddingBottom: 10,
  borderBottom: '1px solid rgba(168, 146, 106, 0.18)'
};

const CARD_STYLE = (picked: boolean): React.CSSProperties => ({
  padding: '6px 8px',
  marginBottom: 4,
  background: picked ? 'rgba(216, 190, 130, 0.18)' : 'rgba(30, 20, 15, 0.55)',
  border: `1px solid ${picked ? 'rgba(216, 190, 130, 0.55)' : 'rgba(168, 146, 106, 0.28)'}`,
  borderRadius: 3,
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  alignItems: 'center',
  gap: 6
});

const INPUT_STYLE: React.CSSProperties = {
  width: 60,
  padding: '2px 4px',
  background: 'rgba(0,0,0,0.35)',
  color: '#f0e8d4',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 2,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  width: 130
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(216, 190, 130, 0.25)',
  color: '#f0e8d4',
  border: '1px solid rgba(216, 190, 130, 0.55)',
  borderRadius: 2,
  cursor: 'pointer',
  fontSize: 12
};

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
    <div style={PANEL_STYLE} aria-label="Menu and stock">
      <div style={SECTION_STYLE}>
        <div style={HEADING_STYLE}>Menu today</div>
        {DISHES.map((d, idx) => {
          const draft = drafts[idx];
          const ingredientCost = estimateDishIngredientCost(d.id);
          return (
            <div key={d.id} style={CARD_STYLE(draft.included)}>
              <div>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draft.included}
                    onChange={(e) => {
                      const copy = drafts.slice();
                      copy[idx] = { ...draft, included: e.target.checked };
                      setDrafts(copy);
                    }}
                    style={{ marginRight: 6 }}
                  />
                  {d.name}
                </label>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                  ingr. cost ≈ {ingredientCost.toFixed(0)} SEK
                </div>
              </div>
              <input
                type="number"
                value={draft.price}
                min={0}
                step={5}
                onChange={(e) => {
                  const copy = drafts.slice();
                  copy[idx] = { ...draft, price: Number(e.target.value) || 0 };
                  setDrafts(copy);
                }}
                style={INPUT_STYLE}
                aria-label={`Price for ${d.name} in SEK`}
              />
            </div>
          );
        })}
        <button
          type="button"
          onClick={commitMenu}
          style={{ ...BUTTON_STYLE, marginTop: 6 }}
          aria-label="Confirm today's menu"
        >
          Confirm menu ({drafts.filter((d) => d.included).length} dishes)
        </button>
      </div>

      <div>
        <div style={HEADING_STYLE}>Buy stock</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            style={SELECT_STYLE}
            aria-label="Supplier"
          >
            {SUPPLIERS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={currentIngredient}
            onChange={(e) => setIngredientId(e.target.value)}
            style={SELECT_STYLE}
            aria-label="Ingredient"
          >
            {validIngredients.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            {(() => {
              const sup = findSupplier(supplierId);
              const ing = findIngredient(currentIngredient);
              if (!sup || !ing) return '';
              const perUnit = ing.baseCostSek * sup.priceIndex;
              return `${(perUnit * units).toFixed(0)} SEK · rel ${(sup.reliability * 100).toFixed(0)}%`;
            })()}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="number"
              value={units}
              min={1}
              step={1}
              onChange={(e) => setUnits(Number(e.target.value) || 0)}
              style={INPUT_STYLE}
              aria-label="Units to buy"
            />
            <button
              type="button"
              onClick={buyStock}
              style={BUTTON_STYLE}
              aria-label="Confirm stock purchase"
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
