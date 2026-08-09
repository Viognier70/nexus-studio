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

// ORDER 043 §4 wager tuning — cycle-1 defaults, will be tuned against
// play. Report gate at §10 lands with these; scenario integration
// (Phase B+) exercises them for the first time.
export const WAGER_UNIT_STAKE = 0.10;              // fixed magnitude per wager
export const WAGER_WEAK_THRESHOLD = 0.4;           // capital ≤ this is "weak"
export const WAGER_WEAK_WIN_MULTIPLIER = 1.5;      // extra payout on wins in weak capital

// Capital value bounds — all sustainability values clamp to [0, 1].
export const CAPITAL_MIN = 0;
export const CAPITAL_MAX = 1;

// Theme-history ring buffer size for the §4 damping rule (consecutive-
// recurrence cap).
export const THEME_HISTORY_LIMIT = 6;

// ORDER 043 v3 §7 chain — magnitude of the capital movement produced
// by a scenario resolution on its drawn theme. Deliberately smaller
// than the wager stake (0.10) so a scenario outcome + wager payout
// compose without one dominating the other.
export const SCENARIO_CAPITAL_DELTA = 0.06;

// ORDER 043 Addendum A prep window duration (Vision Owner 2026-08-08:
// "Håll den kort — ett par minuter, inte fem."). Two minutes reads
// as a busy prep beat without becoming its own act. Moved here from
// eventStream.ts 2026-08-09 to break the rhythm ↔ eventStream cycle
// — rhythm.ts needed this constant to compute serviceFraction and
// was pulling the whole eventStream graph for it.
export const PREP_DURATION_SEC = 120;
