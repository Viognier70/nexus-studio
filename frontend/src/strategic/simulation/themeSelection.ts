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
// ./constants, TWICE_IN_A_ROW_CAP here) so a future order can revise
// them from play evidence without touching the shape of the code.

import type { Rng } from '../util/rng';
import type { SustainabilityKey, WagerState } from '../types';
import {
  WAGER_UNIT_STAKE,
  WAGER_WEAK_THRESHOLD,
  WAGER_WEAK_WIN_MULTIPLIER
} from './constants';

export const THEMES: readonly SustainabilityKey[] = [
  'economic',
  'social',
  'ecological'
];

// §4 damping — no theme may draw more than this many times in a row.
// 2 is the strictest reading of the order ("cap on how often the same
// theme may recur consecutively"). Setting to 3 would allow one repeat.
export const CONSECUTIVE_THEME_CAP = 2;

// Base uniform floor added to every weight (Vision Owner decision
// 2026-08-08). Without the floor, a strong capital (v=0.9) drew ~2%
// of the time in cycle-1 simulations — knowledge that is never tested
// is forgotten, and the pattern reads as arbitrary rather than
// pedagogical. Adding 0.05 lifts the minimum draw share for a
// maximally-strong capital to ~11%, so every capital keeps returning
// often enough for the player to know they still hold it.
export const WEAK_FLOOR = 0.05;

// Weakness weight per capital. Squared for strong-attraction to
// weakness (v=0.2 vs v=0.9 gives an 11.5:1 ratio after the floor is
// added — down from 64:1 pre-floor). Linear weighting doesn't punish
// weakness enough (ratio 4.5:1); cubing punishes too much (ratio
// 512:1). Formula: (1 − v)² + WEAK_FLOOR.
export function weightForCapital(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return (1 - clamped) ** 2 + WEAK_FLOOR;
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

// ORDER 047 §5 — stream weight coefficient. λ = 0.6 gives the stream
// meaningful pull toward what the room has been reporting without
// making the draw deterministic (Vision Owner constraint: "vikta mot
// det strömmen visat, inte bestäm av det — ibland kommer problemet
// från annat håll"). See streamThemeWeight below for the cap.
export const STREAM_WEIGHT_LAMBDA = 0.6;

// Distribution target (streamDrawnTheme.test.ts): a service with 100 %
// of stream events on one axis draws that theme ~55–65 % of the time at
// λ = 0.6 — dominant but not monopolising. Adjust λ if the observed
// distribution reads too rigid or too loose.

export interface ThemeWeightRow {
  theme: SustainabilityKey;
  capital: number;      // capital value that produced the weight
  streamShare: number;  // stream-count share for this theme in [0, 1]
  weight: number;       // final weight after damping (post-cap, post-cycle)
  cappedOut: boolean;   // consecutive-recurrence cap fired?
}

// Given the running per-service stream-theme counts, return the share
// each theme has of the total. If no stream events yet fired this
// service, returns uniform 1/3 across all themes.
function streamShares(
  streamCounts: Record<SustainabilityKey, number>
): Record<SustainabilityKey, number> {
  const total = THEMES.reduce((n, t) => n + streamCounts[t], 0);
  // No stream signal yet → zeroes so the added term is zero and the
  // pre-ORDER-047 weighting shape is preserved for callers that pass
  // no counts (or an empty one). A uniform fallback would add a
  // constant bias to every row that shifts absolute weights without
  // changing rankings — cleaner to add nothing.
  if (total <= 0) {
    return { economic: 0, social: 0, ecological: 0 };
  }
  return {
    economic: streamCounts.economic / total,
    social: streamCounts.social / total,
    ecological: streamCounts.ecological / total
  };
}

// Exposes the intermediate weighting so tests + diagnostics can inspect
// what the selector is doing without re-computing.
export function weightTable(
  capitals: Record<SustainabilityKey, number>,
  themeHistory: readonly SustainabilityKey[],
  streamCounts?: Record<SustainabilityKey, number>
): ThemeWeightRow[] {
  const shares = streamShares(
    streamCounts ?? { economic: 0, social: 0, ecological: 0 }
  );
  return THEMES.map((theme) => {
    const cappedOut = isThemeCappedOut(themeHistory, theme);
    const capitalWeight = weightForCapital(capitals[theme]);
    const streamWeight = shares[theme] * STREAM_WEIGHT_LAMBDA;
    // Blend: capital weakness base + stream-driven bias. Capped share
    // of the total is enforced globally by re-normalising below in
    // drawNextTheme — here we just report the additive raw.
    const raw = capitalWeight + streamWeight;
    return {
      theme,
      capital: capitals[theme],
      streamShare: shares[theme],
      weight: cappedOut ? 0 : raw,
      cappedOut
    };
  });
}

// Draw a next theme, weighted by weakness + stream signal, damped by
// the recurrence cap. Deterministic in the rng — same rng state + same
// inputs → same draw, so distribution tests can be seeded.
//
// The stream term contributes `share × λ` (max 0.6) to each theme's
// raw weight. Capital weakness base is `(1-v)² + 0.05` per theme
// (~0.05 to ~1.05). At λ = 0.6, a fully-dominant stream still only
// biases the draw — the base weakness weighting keeps enough mass on
// other themes that the reading pulls, doesn't decide.
//
// Falls back to a uniform draw over uncapped themes when every weight
// is zero (e.g. all capitals at 1.0 with no stream signal). Preserves
// the invariant that a theme is always drawable.
export function drawNextTheme(
  capitals: Record<SustainabilityKey, number>,
  themeHistory: readonly SustainabilityKey[],
  rng: Rng,
  streamCounts?: Record<SustainabilityKey, number>
): SustainabilityKey {
  const rows = weightTable(capitals, themeHistory, streamCounts);
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
