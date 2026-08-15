// ORDER 050 §3 + Addendum A §11 (2026-08-10) — the derived economic
// reading and the paired-write helpers.
//
// After the cash refactor `state.cash` is the authoritative economic
// value in SEK. Everywhere the sim previously read a [0,1]
// `capitals.values.economic` — arrivals modulation, walk-away
// probability, sustainability display band, scenario amplifier
// below-threshold check — reads through `economicReadingNormalised`
// instead. The formula is intentionally simple so its behaviour is
// legible: cash divided by a weekly operating baseline, capped at
// N weeks of runway.
//
// **Paired-write invariant.** `state.cash`, `state.revenue`,
// `state.cost` are three tracked fields but they express three
// distinct things (till balance, lifetime revenue, lifetime cost).
// The invariant `cash = INITIAL_CASH_SEK + revenue − cost + Σ ad-hoc`
// is preserved by construction: every revenue write pairs with a
// cash increment, every cost write pairs with a cash decrement, and
// only scenario / activity cash writes touch cash without a
// revenue/cost twin. The helpers in this file are the ONLY sanctioned
// entry points for money mutations — anything grepping for
// `draft.cash +=` in the reducer should either be a helper call or
// a fresh review.
//
// When the ledger phase (ORDER 050 §7 step 3) lands, `state.revenue`
// and `state.cost` become derived reads over the ledger and the
// paired writes collapse into a single `postLedger()`. Until then
// the helpers below are the interface.

import type {
  LedgerCategory,
  LedgerLine,
  SimulationState,
  StoredCapitalKey,
  SustainabilityKey
} from '../types';
import {
  CAPITAL_MAX,
  CAPITAL_MIN,
  ECONOMIC_READING_RUNWAY_WEEKS,
  LEDGER_MAX_LINES,
  WEEKLY_OPERATING_BASELINE_SEK
} from './constants';

// -------- derived reading -----------------------------------------------

// [0,1] reading of the economic axis, used by every reader that used
// to consume `capitals.values.economic`. Anchored to weeks of runway
// against a weekly operating baseline; capped at
// ECONOMIC_READING_RUNWAY_WEEKS so a cash-rich venture doesn't push
// the arrivals curve into overdrive. A venture at 0 SEK reads 0; at
// four weeks of runway (default cap) reads 1.
export function economicReadingNormalised(state: SimulationState): number {
  const weekly = weeklyOperatingBaseline(state);
  const weeks = state.cash / Math.max(1, weekly);
  return clamp01(weeks / ECONOMIC_READING_RUNWAY_WEEKS);
}

// Uniform reader across all three sustainability axes so themeSelection
// + amplifier checks can be axis-agnostic. Social + ecological read
// from stored capitals; economic reads through the derived formula.
export function capitalReadingFor(
  state: SimulationState,
  key: SustainabilityKey
): number {
  if (key === 'economic') return economicReadingNormalised(state);
  return state.capitals.values[key as StoredCapitalKey];
}

// Weekly operating baseline. `max(team wages × 7, constant floor)`
// so a larger team dominates but a lean/empty team still gets a
// realistic baseline that includes the invisible drains (ingredients,
// interest, etc.) captured by the constant. The Vision Owner
// intuition (2026-08-10): starting cash 120 kSEK ≈ three weeks.
function weeklyOperatingBaseline(state: SimulationState): number {
  const dailyWages = state.team.members
    .filter((m) => !m.isAgency)
    .reduce((sum, m) => sum + m.dailyCost, 0);
  const weeklyWages = dailyWages * 7;
  return Math.max(weeklyWages, WEEKLY_OPERATING_BASELINE_SEK);
}

// -------- paired-write helpers ------------------------------------------

// Guest payment (or any revenue-shaped inflow). Writes both the
// lifetime revenue accumulator and the till.
export function applyCashRevenue(draft: SimulationState, sek: number): void {
  draft.revenue += sek;
  draft.cash += sek;
}

// Operating cost (wages, ingredients, interest, agency, buyout —
// anything a bookkeeper would put on the expense side). Writes both
// the lifetime cost accumulator and the till.
export function applyCashCost(draft: SimulationState, sek: number): void {
  draft.cost += sek;
  draft.cash -= sek;
}

// Ad-hoc capital movement — scenario economic writes, activity SEK
// effects (ORDER 050 §2 pending), any mutation that is neither
// revenue nor cost in the bookkeeping sense. Touches ONLY the till.
// Categorically these become their own ledger category in the ORDER
// 050 §7 step 3 wiring.
export function applyCashDelta(draft: SimulationState, sek: number): void {
  draft.cash += sek;
}

function clamp01(v: number): number {
  return Math.max(CAPITAL_MIN, Math.min(CAPITAL_MAX, v));
}

// -------- ledger --------------------------------------------------------

// ORDER 050 §7 step 3 (2026-08-10) — append a book entry for the
// business account (§3.1). Does NOT move cash — call sites are
// expected to have already moved cash via applyCash* (for immediate
// events) or accumulated it silently (for per-guest revenue /
// per-tick ingredient), and postLedger records the book entry
// separately. The runningCash field stamps the till balance AFTER
// the associated cash movement so each row is readable out of
// context (Vision Owner 2026-08-10).
//
// Ring-trimmed to LEDGER_MAX_LINES so a long session doesn't grow
// state without bound; the ledger is a rolling reading, not an
// audit archive. The .slice() rewrites the array (still O(N) but
// N ≤ 1000 — negligible per tick).
export function postLedger(
  draft: SimulationState,
  entry: {
    category: LedgerCategory;
    amount: number;
    cause: string;
    causeId?: string;
  }
): void {
  const line: LedgerLine = {
    at: draft.simTime,
    day: draft.day.dayNumber,
    period: draft.day.period,
    category: entry.category,
    amount: entry.amount,
    cause: entry.cause,
    ...(entry.causeId !== undefined ? { causeId: entry.causeId } : {}),
    runningCash: draft.cash
  };
  draft.ledger = [...draft.ledger, line].slice(-LEDGER_MAX_LINES);
}

// ORDER 073 (M3) / ORDER 074 (fix) — service-close summary lines.
// Reads the accumulated per-service revenue and ingredient totals
// from `prev` (which may equal `draft` in the collapse path) and
// posts one 'revenue' + one 'ingredient' ledger line. Called at
// BOTH natural service close (tickDayTransitions in reducer.ts)
// AND collapse close (fireCollapse in collapse.ts). Previously
// lived in reducer.ts only, which meant the collapse path silently
// skipped it and every service that collapsed produced no ledger
// lines. Moved here to give both callers access without a circular
// import between reducer and collapse.
export function postServiceSummaryLines(
  draft: SimulationState,
  service: 'lunch' | 'dinner',
  prev: SimulationState
): void {
  const serviceLabel = service === 'lunch' ? 'Lunch' : 'Dinner';
  const revenueKsek = prev.serviceRevenueToday[service];
  const covers = prev.day.serviceCovers;
  if (revenueKsek > 0) {
    const coverSuffix = covers > 0
      ? ` (${covers} cover${covers === 1 ? '' : 's'})`
      : '';
    postLedger(draft, {
      category: 'revenue',
      amount: revenueKsek * 1000,
      cause: `${serviceLabel} revenue${coverSuffix}`,
      causeId: service
    });
  }
  const ingredientSek = prev.day.serviceIngredientAccrued;
  if (ingredientSek > 0) {
    const coverSuffix = covers > 0 ? ` — ${covers} cover${covers === 1 ? '' : 's'}` : '';
    postLedger(draft, {
      category: 'ingredient',
      amount: -ingredientSek,
      cause: `Ingredients — ${serviceLabel.toLowerCase()}${coverSuffix}`,
      causeId: service
    });
  }
}
