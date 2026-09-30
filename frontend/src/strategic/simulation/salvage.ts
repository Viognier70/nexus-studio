// ORDER 285 — gårdagens rester (Vision Owner 2026-09-29, tredje provspelet:
// "Svinnet ska kunna användas nästa dag, med frågor om hur råvarorna tas
// tillvara").
//
// När sopbilen kommer (stockPackages.ts wasteAtDayEnd) läggs den rätt som
// hade flest osålda portioner undan i kylrummet, om de var minst
// SALVAGE.minPortions. Portionernas råvaror står kvar i lagret men går inte
// att sälja (de står inte i portionsboken). På morgonen kommer en fråga om
// hur råvaran tas tillvara:
// - rätt svar: portionerna står i portionsboken och går att sälja i kväll,
//   och den ekologiska hållbarheten stiger;
// - fel svar, eller inget svar när servicen öppnar: sopbilen tar dem (kilo
//   × taxan, utan ny hämtningsavgift) och den ekologiska sjunker.
//
// Frågornas text står i strängtabellen (strings.salvage.questions), svaren
// som räknas som rätt här (spelartext och metadata separerade).

import type { SimulationState } from '../types';
import { SALVAGE, WASTE } from '../../sim/balance';
import { strings } from '../../content/strings';
import { applyCashCost, postLedger } from './cashReading';
import { findDish, findIngredient } from './m4Catalogue';
import { numberLocale } from '../../content/language';

export type SalvageGroup = 'root-veg' | 'chicken' | 'pork' | 'lake-fish' | 'dairy' | 'lentils' | 'mushrooms' | 'berries' | 'meat';

// Rättens huvudråvara (receptets första) avgör frågan.
const GROUP_BY_INGREDIENT: Record<string, SalvageGroup> = {
  'root-veg': 'root-veg', chicken: 'chicken', pork: 'pork', 'lake-fish': 'lake-fish', dairy: 'dairy',
  lentils: 'lentils', mushrooms: 'mushrooms', berries: 'berries', lamb: 'meat', game: 'meat'
};

// Svaret som tar vara på råvaran.
export const SALVAGE_BEST: Record<SalvageGroup, string> = {
  'root-veg': 'a', chicken: 'b', pork: 'a', 'lake-fish': 'c', dairy: 'b', lentils: 'a', mushrooms: 'a', berries: 'b', meat: 'a'
};

export const SALVAGE_OPTIONS = ['a', 'b', 'c'] as const;

export function salvageGroup(dishId: string): SalvageGroup | null {
  const dish = findDish(dishId);
  if (!dish || dish.kind === 'drink') return null;
  return GROUP_BY_INGREDIENT[dish.recipe[0]?.ingredientId ?? ''] ?? null;
}

// Vilken rätt som läggs undan: flest förlorade portioner, minst
// SALVAGE.minPortions, och en rätt som har en fråga.
export function pickSalvage(lost: Record<string, number>): { dishId: string; portions: number } | null {
  let best: { dishId: string; portions: number } | null = null;
  for (const [dishId, n] of Object.entries(lost)) {
    if (n < SALVAGE.minPortions || !salvageGroup(dishId)) continue;
    if (!best || n > best.portions) best = { dishId, portions: n };
  }
  return best;
}

export function salvagePending(state: SimulationState): boolean {
  return !!state.salvage && state.salvage.resolved === null;
}

function ecological(draft: SimulationState, delta: number): void {
  const e = Math.max(0, Math.min(1, draft.capitals.values.ecological + delta));
  draft.capitals = { ...draft.capitals, values: { ...draft.capitals.values, ecological: e } };
}

function streamLine(draft: SimulationState, text: string): void {
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: 'ambient', causeTag: 'stock_out', causeChainId: null,
    sustainability: 'ecological', kind: 'stock_waste', scenarioId: null
  }];
}

// Resterna till sopbilen: råvarorna ur lagret, avgiften i kilo × taxan.
// Muterar draft. Returnerar avgiften.
function discard(draft: SimulationState, dishId: string, portions: number): number {
  const dish = findDish(dishId);
  if (!dish) return 0;
  const stock = { ...draft.stock };
  let kg = 0;
  for (const r of dish.recipe) {
    const take = Math.min(stock[r.ingredientId] ?? 0, r.units * portions);
    stock[r.ingredientId] = (stock[r.ingredientId] ?? 0) - take;
    if (stock[r.ingredientId] <= 0) delete stock[r.ingredientId];
    kg += take * (WASTE.kgPerUnit[findIngredient(r.ingredientId)?.unit ?? ''] ?? 0);
  }
  draft.stock = stock;
  const fee = Math.round(kg * WASTE.feePerKg);
  if (fee > 0) {
    applyCashCost(draft, fee);
    postLedger(draft, { category: 'waste', amount: -fee, cause: strings.salvage.ledger, causeId: 'salvage' });
  }
  ecological(draft, -SALVAGE.ecologicalWrongPerPortion * portions);
  return fee;
}

export function answerSalvage(state: SimulationState, optionId: string): SimulationState {
  const sv = state.salvage;
  if (!sv || sv.resolved !== null || !(SALVAGE_OPTIONS as readonly string[]).includes(optionId)) return state;
  const group = salvageGroup(sv.dishId);
  if (!group) return state;
  const draft: SimulationState = { ...state };
  if (optionId === SALVAGE_BEST[group]) {
    draft.dishPortions = { ...(state.dishPortions ?? {}), [sv.dishId]: (state.dishPortions?.[sv.dishId] ?? 0) + sv.portions };
    ecological(draft, SALVAGE.ecologicalPerPortion * sv.portions);
    draft.salvage = { ...sv, resolved: 'right', optionId, feeSek: 0 };
    streamLine(draft, strings.salvage.right(sv.portions));
    return draft;
  }
  const fee = discard(draft, sv.dishId, sv.portions);
  draft.salvage = { ...sv, resolved: 'wrong', optionId, feeSek: fee };
  streamLine(draft, strings.salvage.wrong(strings.service.meters.sek(fee.toLocaleString(numberLocale()))));
  return draft;
}

// Inget svar före öppning (eller före nästa sopbil): resterna går till
// sopbilen. Muterar draft.
export function discardUnresolvedSalvage(draft: SimulationState): void {
  const sv = draft.salvage;
  if (!sv || sv.resolved !== null) return;
  const fee = discard(draft, sv.dishId, sv.portions);
  draft.salvage = { ...sv, resolved: 'discarded', optionId: null, feeSek: fee };
  streamLine(draft, strings.salvage.discarded(sv.portions, strings.service.meters.sek(fee.toLocaleString(numberLocale()))));
}

export function closeSalvage(state: SimulationState): SimulationState {
  return state.salvage && state.salvage.resolved !== null ? { ...state, salvage: null } : state;
}
