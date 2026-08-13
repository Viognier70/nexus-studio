# M4 — Menu + Kitchen + Stock (report gate under ORDER 077 §4)

**Status:** Report gate. Opens implementation when committed.
**Parent:** `ORDER_051_SUPPLIERS_MENU_AND_STOCK.md` §7 step 1 + step 3 (the two report gates ORDER 051 explicitly calls for), consolidated into one file per cohesive-block execution model (ORDER 073 precedent).
**Milestone target:** `STRATEGIC_TRACK_MILESTONES_PROPOSAL.md` §M4.

---

## 1. Purpose

Close M4 DoD 1–4:

1. Player composes the day's menu in the morning; every dish carries a price and an ingredient cost.
2. Stock draws down visibly during service; a plates-remaining reading updates as guests order.
3. At least one dish can run out mid-service on a fresh play — a written stream event fires.
4. Every ingredient purchase posts a labelled ledger line (integrates with M3).

Deferrals — wine list (ORDER 051 §7.5), package menus (§7.6), and `ingredientTier` retirement (§7.7) — are OUT of this block; they land as M4b under a subsequent order. See §7 below.

## 2. Supplier catalogue (ORDER 051 §7 step 1 report requirement)

Six named suppliers, each with four axes on `[0, 1]` where relevant and SEK where absolute. No supplier is strictly best: cheap-and-reliable is unremarkable, expensive-and-fragile is the eco-honest source, one is the tourist-menu wholesaler that never lets you down.

| id | name (English) | price index | quality | reliability | eco reading (Δ per unit ordered) |
|---|---|---:|---:|---:|---:|
| wholesaler | Bergslagen Wholesaler | 0.85× base | 0.55 | 0.95 | −0.010 |
| local-veg | Grythyttan Local Growers | 1.10× base | 0.80 | 0.75 | +0.020 |
| organic | Örebro Organic Producers | 1.35× base | 0.85 | 0.70 | +0.045 |
| meat-game | Bergslagen Meat & Game | 1.25× base | 0.85 | 0.80 | +0.025 |
| lake-fish | Hjälmaren Lake Fish | 1.40× base | 0.90 | 0.55 | +0.035 |
| brewery | Nora Brewery | 1.00× base | 0.75 | 0.90 | +0.010 |

**Price index** multiplies the ingredient's base cost per unit (§3). **Reliability** is `P(short-delivery)` complement — 0.95 means 5 % of orders arrive short one unit (rounded down, min 0). **Eco reading** is signed additive delta applied to `state.capitals.values.ecological` per unit ordered (clamped to `[0, 1]`).

## 3. Ingredient catalogue

Twelve ingredients. Base cost per unit in SEK, unit chosen so a dish's recipe reads as small integers. Each ingredient is compatible with a subset of suppliers.

| id | name | base cost (SEK/unit) | unit | suppliers |
|---|---|---:|---|---|
| root-veg | root vegetables | 4 | portion | wholesaler, local-veg, organic |
| leaf-veg | leaf vegetables | 6 | portion | wholesaler, local-veg, organic |
| herbs | fresh herbs | 3 | pinch | local-veg, organic |
| chicken | chicken | 22 | portion | wholesaler, meat-game |
| pork | pork | 28 | portion | wholesaler, meat-game |
| lamb | lamb | 55 | portion | meat-game |
| game | game (venison) | 85 | portion | meat-game |
| lake-fish | lake fish | 45 | portion | lake-fish |
| eggs | eggs | 3 | egg | wholesaler, local-veg, organic |
| dairy | dairy | 8 | portion | wholesaler, local-veg, organic |
| flour | flour | 2 | portion | wholesaler |
| beer | beer (drink) | 18 | glass | brewery |

**Suppliers** column names the ids from §2 that can source this ingredient. If the player has not ordered from any compatible supplier, the ingredient is unavailable and any dish requiring it cannot be listed.

## 4. Dish catalogue

Eight dish templates authored in code. The player picks 4–6 of these into today's menu (§5). Ingredient cost is derived from the recipe × the sourced supplier's price index; suggested price is authored (guidance the player may exceed or undercut within the ceiling from ORDER 049 §2.1).

| id | name | recipe (id × qty) | suggested price (SEK) |
|---|---|---|---:|
| root-soup | Root vegetable soup | root-veg×2, dairy×1, herbs×1 | 95 |
| chicken-plate | Chicken with roots | chicken×1, root-veg×1, herbs×1 | 175 |
| pork-plate | Pork with roots | pork×1, root-veg×1, herbs×1 | 195 |
| lamb-plate | Lamb with roots | lamb×1, root-veg×1, herbs×1 | 285 |
| game-plate | Game with roots | game×1, root-veg×1, herbs×1 | 385 |
| fish-plate | Lake fish, poached | lake-fish×1, leaf-veg×1, herbs×1 | 265 |
| dairy-dessert | Cream dessert | dairy×2, eggs×1 | 85 |
| beer-pairing | Local beer (pairing) | beer×1 | 55 |

Recipe totals give ingredient cost per plate. Example: root-soup with wholesaler-sourced root-veg + dairy → `(4×2 + 8×1 + 3×1)×0.85 = 16.15 SEK` per plate.

## 5. Menu composition (morning)

New morning surface, cohabitant with the existing MorningActivityPanel and TeamPanel:

- Displays the eight dish templates as cards.
- Player selects between 4 and 6 to compose today's menu.
- Each selected dish shows its ingredient cost (live-computed from the supplier the player has stock from) and a price field (default = suggested, editable within `[cost×1.2, ceiling]` where ceiling comes from ORDER 049 §2.1 pricing permission).
- Confirmed via `COMPOSE_MENU` action: `{ type: 'COMPOSE_MENU', dishes: Array<{ id: string; price: number }> }`.
- Blocked when service opens (menu is "set in the morning and stands" per ORDER 051 §6).

## 6. Stock (buy → hold → draw)

**Buy (morning).** New `BUY_STOCK` action: `{ type: 'BUY_STOCK', supplierId, ingredientId, units }`.
- Cost = `base × supplier.priceIndex × units` SEK, drawn from cash.
- Ledger line posted per purchase: `category='stock'`, `cause='Buy ${units}× ${ingredientId} from ${supplier.name}'`.
- Short-delivery: `Math.random() < (1 − supplier.reliability)` → units delivered = `units − 1` (min 0). Stream line: `Supplier short-delivery: ${supplierId} delivered ${received}/${units} ${ingredientId}`.
- Ecological reading: `state.capitals.values.ecological += supplier.ecoDelta × units` (clamped to `[0, 1]`).

**Hold.** `state.stock: Record<ingredientId, number>` — units currently in the pantry.

**Draw (during service).** When a guest transitions to `paying` (their revenue moment, §reducer.ts:1218), pick a dish from the current menu, weighted by price attractiveness (cheaper dishes get more orders, capped). Draw the recipe from `state.stock`. If any ingredient is short, the dish "runs out" (§7).

**Plates-remaining reading.** For each dish on the menu, compute `min over recipe ingredients of floor(stock[ingredient] / recipe.qty)`. This is `state.day.platesRemaining[dishId]`, recomputed each tick a draw fires (not every tick — no idle cost).

## 7. Running-out event

When a guest arrives at the pay tick and the pick target dish has `platesRemaining === 0`:

1. Guest either **substitutes** (30 % chance) to the cheapest still-available dish, paying its price at a small satisfaction hit; or **leaves without paying** (70 %), with a larger satisfaction + reputation hit.
2. Ambient stream line: `Dish '${dish.name}' ran out — guest ${substituted ? 'switched' : 'left without ordering'}.` (English, observer voice per ORDER 048 §2).
3. `causeTag: 'stock_out'` — extends the M6 vocabulary (12 → 13 values). Sits alongside `weather_adverse` and friends as a specific condition.
4. Reputation hit: `−0.02` (substitution) or `−0.05` (walkout). Cost: 0 SEK direct — the reputation is the cost.
5. Dish is removed from the menu for the remainder of this service (no repeated "ran out" spam).

The 30/70 split is deliberately harsher than a real restaurant so the DoD 3 test can force a walkout with modest stock starvation — no need to run 500 guests.

## 8. Data model additions

```ts
// types.ts additions
export interface Supplier {
  id: string;
  name: string;
  priceIndex: number;
  quality: number;         // [0,1]
  reliability: number;     // [0,1]
  ecoDelta: number;        // capital delta per unit ordered
}

export interface Ingredient {
  id: string;
  name: string;
  baseCostSek: number;
  unit: string;
  suppliers: readonly string[];
}

export interface DishRecipe {
  ingredientId: string;
  units: number;
}

export interface Dish {
  id: string;
  name: string;
  recipe: readonly DishRecipe[];
  suggestedPrice: number;
}

export interface MenuEntry {
  dishId: string;
  price: number;
  ingredientCostSek: number;   // frozen at COMPOSE_MENU time
}

// SimulationState additions
menu: MenuEntry[];               // set at COMPOSE_MENU; cleared at day rollover
stock: Record<string, number>;   // ingredientId -> units
// DayState additions
platesRemaining: Record<string, number>;   // dishId -> current plate count
stockOutEvents: string[];        // dishIds that ran out this service
```

## 9. Reducer actions

- `COMPOSE_MENU` — morning only; sets `state.menu` from a list of `{dishId, price}` pairs; freezes ingredient cost per entry from current stock's supplier mix.
- `BUY_STOCK` — morning only; adds `units` to `state.stock[ingredientId]`, posts a ledger line, applies eco delta, rolls short-delivery.
- Guest-pay tick (§6 draw): existing revenue-payment path picks a dish weighted by attractiveness, draws recipe, either succeeds (revenue = dish price) OR fires stock-out (§7).

## 10. UI additions (minimum for DoD)

- **MorningMenuPanel.tsx** — sits in the morning-panel row. Two sub-panels stacked vertically: buy-stock (dropdown supplier × ingredient + units input + confirm) and compose-menu (dish cards with checkbox + price input). Neither is a game unto itself: two dropdowns and a checkbox column.
- **PlatesRemainingPanel.tsx** — small in-room reading listing menu dishes and current plates-remaining. Updates on draw.
- Both English strings per CLAUDE.md rule 7 (Observation 6).

## 11. DoD verification

Autonomous tests in `frontend/src/strategic/simulation/__tests__/m4.test.ts` via the INFRA-2 harness:

1. **DoD 1** — dispatch morning `COMPOSE_MENU` with 5 dishes. Assert `state.menu.length === 5` and every entry has `price > 0` and `ingredientCostSek > 0`.
2. **DoD 2** — buy stock for a 5-dish menu, open dinner, tick for 15 min. Assert `state.stock[ingredientId]` decreased for at least one ingredient AND `state.day.platesRemaining[dishId]` decreased for at least one dish.
3. **DoD 3** — buy only 1 unit of a key ingredient (e.g. `game×1` for a game-plate menu of 1 dish), open dinner, tick until at least 3 guests have paid. Assert at least one stream entry has text containing "ran out" AND `causeTag === 'stock_out'`.
4. **DoD 4** — dispatch `BUY_STOCK`. Assert the last ledger entry has `category === 'stock'` and `cause` contains the supplier name.

Plus type-check + full sim test suite green (357 → 361 with the four new tests).

## 12. What "opens" this gate

Under ORDER 077 §4 cohesive-block execution the report gate opens when this file is committed. Implementation proceeds against the values above unless Vision Owner course-corrects on the supplier numbers, dish set, or the 30/70 split.

## 13. Out of scope (rolled to M4b)

- Wine list (ORDER 051 §7.5): same shape as stock+menu; adds ~1 ingredient category (`wine`) with per-bottle stock. Not needed to close DoD 1–4.
- Package menus (§7.6): fixed 3/5/7-course, drinks pairing, guaranteed spend per cover. Interacts with à la carte in ways ORDER 051 §3 says report first — that report lives in M4b.
- `ingredientTier` retirement (§7.7): the policy dial and its ~10 readers (in `economics.ts`, `quality.ts`, `sustainability.ts`, `valuation.ts`, `reducer.ts`, `eventStream.ts`) coexist with the new supplier-sourced stock through M4. Retirement is safer in a dedicated M4b pass so cash reconciliation doesn't drift under a mid-milestone rewrite.
- Menu authoring UI beyond a checkbox column + price input.
- Ageing / spoilage of leftover stock (ORDER 051 §4 mentions this — file as separate M4b line; §4 already carries "ingredients age" as a promise).
