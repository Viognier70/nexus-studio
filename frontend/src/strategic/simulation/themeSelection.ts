// ORDER 043 §4 — theme selection and wager payout.
//
// Two mandatory damping mechanisms, per the order:
//   1. Cap on consecutive recurrence: the same theme cannot draw
//      three times in a row. Applied here in `drawNextTheme`.
//   2. Larger return on a win in a weak capital, so a downward spiral
//      can break by skill rather than luck. Applied in `wagerPayout`.
//
// Weakness weighting formula: weight(c) = (1 - v_c)^2.
// At v = 0.9 the weight is 0.01; at v = 0.5 it is 0.25; at v = 0.2 it is 0.64.
// The squaring makes weak capitals attract questions strongly without
// starving strong ones — the ratio at v = 0.9 vs v = 0.2 is 64:1, but
// no capital ever falls below its own square-of-slack.
//
// Numbers land here as tunable constants (WAGER_UNIT_STAKE et al. in
// reducer.ts, TWICE_IN_A_ROW_CAP here) so a future order can revise
// them from play evidence without touching the shape of the code.

import type { Rng } from '../util/rng';
import type { SustainabilityKey, WagerState } from '../types';
import {
  WAGER_UNIT_STAKE,
  WAGER_WEAK_THRESHOLD,
  WAGER_WEAK_WIN_MULTIPLIER
} from './reducer';

export const THEMES: readonly SustainabilityKey[] = [
  'economic',
  'social',
  'ecological'
];

// §4 damping — no theme may draw more than this many times in a row.
// 2 is the strictest reading of the order ("cap on how often the same
// theme may recur consecutively"). Setting to 3 would allow one repeat.
export const CONSECUTIVE_THEME_CAP = 2;

// Weakness weight per capital. Squaring is the design choice: linear
// weighting doesn't punish weakness enough (ratio 4.5:1 at the range
// endpoints); cubing punishes too much (ratio 512:1). The square gives
// a 64:1 endpoint ratio, which is strong-attraction to weakness without
// making a strong capital effectively invisible.
export function weightForCapital(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return (1 - clamped) ** 2;
}

// Returns true if the same theme has drawn `CONSECUTIVE_THEME_CAP`
// times in a row at the tail of the history — that theme is capped
// out and cannot draw again on the next turn.
export function isThemeCappedOut(
  themeHistory: readonly SustainabilityKey[],
  theme: SustainabilityKey
): boolean {
  if (themeHistory.length < CONSECUTIVE_THEME_CAP) return false;
  const recent = themeHistory.slice(-CONSECUTIVE_THEME_CAP);
  return recent.every((t) => t === theme);
}

export interface ThemeWeightRow {
  theme: SustainabilityKey;
  capital: number;      // capital value that produced the weight
  weight: number;       // final weight after damping
  cappedOut: boolean;   // consecutive-recurrence cap fired?
}

// Exposes the intermediate weighting so tests + diagnostics can inspect
// what the selector is doing without re-computing.
export function weightTable(
  capitals: Record<SustainabilityKey, number>,
  themeHistory: readonly SustainabilityKey[]
): ThemeWeightRow[] {
  return THEMES.map((theme) => {
    const cappedOut = isThemeCappedOut(themeHistory, theme);
    const raw = weightForCapital(capitals[theme]);
    return {
      theme,
      capital: capitals[theme],
      weight: cappedOut ? 0 : raw,
      cappedOut
    };
  });
}

// Draw a next theme, weighted by weakness and damped by the recurrence
// cap. Deterministic in the rng — same rng state + same inputs → same
// draw, so distribution tests can be seeded.
//
// Falls back to a uniform draw over uncapped themes when every capital
// has zero weight (e.g. all capitals at 1.0). Preserves the invariant
// that a theme is always drawable — the wager loop never stalls.
export function drawNextTheme(
  capitals: Record<SustainabilityKey, number>,
  themeHistory: readonly SustainabilityKey[],
  rng: Rng
): SustainabilityKey {
  const rows = weightTable(capitals, themeHistory);
  const total = rows.reduce((n, r) => n + r.weight, 0);
  if (total > 0) {
    const roll = rng.next() * total;
    let cumulative = 0;
    for (const row of rows) {
      cumulative += row.weight;
      if (roll < cumulative) return row.theme;
    }
    // Floating-point safety — the last theme catches the tail.
    return rows[rows.length - 1].theme;
  }
  // All weights zero. Uniform over uncapped themes.
  const uncapped = rows.filter((r) => !r.cappedOut).map((r) => r.theme);
  if (uncapped.length === 0) {
    // Extreme corner case (all three capped simultaneously) — cannot
    // occur with THEMES.length === 3 and CONSECUTIVE_THEME_CAP === 2,
    // but guard against future scope changes.
    return THEMES[Math.floor(rng.next() * THEMES.length)];
  }
  return uncapped[Math.floor(rng.next() * uncapped.length)];
}

// -------- wager payout ----------------------------------------------------

export type WagerOutcome = 'win' | 'loss' | 'no_wager';

export interface WagerPayout {
  outcome: WagerOutcome;
  targetCapital: SustainabilityKey | null;
  delta: number;   // signed value to add to the target capital
  multiplier: number; // 1.0 for standard, WAGER_WEAK_WIN_MULTIPLIER for weak-win
}

// §4 mandatory damping: "a larger return on a win in a weak capital,
// so the spiral can be broken by skill rather than luck."
//
// `capitalAtPlacement` is the capital value at the moment the wager
// was placed, not at scoring — a player who staked when a capital was
// weak and then correctly read the theme deserves the weak-win bonus
// even if the capital has since moved.
export function wagerPayout(
  drewTheme: SustainabilityKey,
  wager: WagerState | null,
  capitalAtPlacement: number
): WagerPayout {
  if (!wager) {
    return { outcome: 'no_wager', targetCapital: null, delta: 0, multiplier: 1 };
  }
  if (wager.capital === drewTheme) {
    const multiplier =
      capitalAtPlacement <= WAGER_WEAK_THRESHOLD ? WAGER_WEAK_WIN_MULTIPLIER : 1;
    return {
      outcome: 'win',
      targetCapital: wager.capital,
      delta: wager.amount * multiplier,
      multiplier
    };
  }
  return {
    outcome: 'loss',
    targetCapital: wager.capital,
    delta: -wager.amount,
    multiplier: 1
  };
}

// Re-exported for callers that want the constants in one import.
export { WAGER_UNIT_STAKE, WAGER_WEAK_THRESHOLD, WAGER_WEAK_WIN_MULTIPLIER };
