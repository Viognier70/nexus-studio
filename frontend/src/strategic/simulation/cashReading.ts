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

import type { SimulationState, StoredCapitalKey, SustainabilityKey } from '../types';
import {
  CAPITAL_MAX,
  CAPITAL_MIN,
  ECONOMIC_READING_RUNWAY_WEEKS,
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
