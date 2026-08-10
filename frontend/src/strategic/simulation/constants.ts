// ORDER 043 v3 tuning constants — kept in their own module with no
// imports so any consumer (reducer, wager math, evening-account
// branch picker) can read them without pulling the rest of the sim
// graph in. Introduced 2026-08-09 after a TDZ crash in the browser
// bundle: `eveningAccount.ts` read `WAGER_UNIT_STAKE` at module-eval
// time, but the reducer → eveningAccount → themeSelection → reducer
// cycle meant WAGER_UNIT_STAKE was still in its temporal dead zone
// when the browser evaluated eveningAccount. Tests passed because
// Vitest's import order happened to resolve the cycle safely; the
// browser's entry order did not.
//
// **Rule for this file:** no imports, ever. Anything imported here
// re-enters the cycle. Only plain literal constants.

// ORDER 050 §5 (2026-08-10) — the theme-wager retires entirely; the
// stake now lives in each activity's own three-column effects. The
// WAGER_* constants were removed under the cash refactor. Grep history
// for `WAGER_` if archaeology is needed.

// Capital value bounds — social / ecological values clamp to [0, 1].
// Economic is no longer a [0,1] scalar; see state.cash (SEK).
export const CAPITAL_MIN = 0;
export const CAPITAL_MAX = 1;

// Theme-history ring buffer size for the ORDER 043 §4 damping rule
// (consecutive-recurrence cap).
export const THEME_HISTORY_LIMIT = 6;

// Scenario capital movement — the magnitude a scenario resolution
// applies to its drawn theme. Two anchors, one per unit system:
//   * SCENARIO_CAPITAL_DELTA (0.06) — [0,1] delta for the social and
//     ecological axes. Unchanged since ORDER 043 v3.
//   * SCENARIO_CASH_DELTA_SEK (6 000) — SEK delta for the economic
//     axis after the ORDER 050 cash refactor (2026-08-10). Anchored
//     to ~one lunch's revenue at medium/utvald so a bad answer is
//     visible in the book rather than lost to rounding. Everything
//     else in `scenarios.ts` cash writes is scaled proportionally.
export const SCENARIO_CAPITAL_DELTA = 0.06;
export const SCENARIO_CASH_DELTA_SEK = 6000;

// ORDER 050 §3 — starting cash for a fresh T2 venture (grandfathered
// until ORDER 049 §5.1 bank meeting stamps the real tier on the
// venture at creation). 120 000 SEK ≈ three weeks of runway at cycle-1
// operating baseline: enough to learn on, short enough that the first
// bad decision is felt (Vision Owner 2026-08-10).
export const INITIAL_CASH_SEK = 120_000;

// ORDER 050 §11 (Addendum A) — the derived economic reading used by
// the arrivals/walk-away curves and the sustainability display caps
// runway at four weeks. Higher makes cash movement feel sluggish;
// lower makes it feel jumpy. Cycle-1 tuning per Vision Owner 2026-08-10.
export const ECONOMIC_READING_RUNWAY_WEEKS = 4;

// ORDER 050 §7 step 3 — the ledger's ring-buffer size. 1 000 lines
// ≈ 10–15 in-game days at cycle-1 tempo (per-service revenue + per-
// service ingredient + per-member per-day wages + daily interest +
// scenario cash lines). Enough for the player to trace "where did
// the money go" without unbounded memory growth (Vision Owner
// 2026-08-10). Adjustable from playtest.
export const LEDGER_MAX_LINES = 1000;

// Weekly operating baseline used by the derived economic reading.
// A mid-tier venture with a three-person team burns ~25 kSEK/week
// in wages alone, plus ~5 kSEK ingredients and ~4 kSEK interest —
// call it 40 kSEK/week rounded to include the invisible drains.
// This is the FLOOR: `cashReading` uses max(sum-of-team-wages × 7,
// this constant) so a larger team dominates but a lean team gets a
// realistic baseline. Calibrated to the Vision Owner's intuition
// (2026-08-10): starting cash 120 kSEK ≈ three weeks of runway.
export const WEEKLY_OPERATING_BASELINE_SEK = 40_000;

// ORDER 043 Addendum A prep window duration (Vision Owner 2026-08-08:
// "Håll den kort — ett par minuter, inte fem."). Two minutes reads
// as a busy prep beat without becoming its own act. Moved here from
// eventStream.ts 2026-08-09 to break the rhythm ↔ eventStream cycle
// — rhythm.ts needed this constant to compute serviceFraction and
// was pulling the whole eventStream graph for it.
export const PREP_DURATION_SEC = 120;
