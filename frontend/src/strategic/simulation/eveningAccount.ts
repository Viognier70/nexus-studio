// ORDER 046 §3 — the evening's account.
//
// Called at the moment a service ends (natural close or collapse) to
// snapshot what happened, pick a branch, and produce a paragraph in
// the observer's voice. Stored in state.eveningAccount so it doesn't
// shift while the player reads it — capital drift during the evening
// pause would otherwise re-pick a different branch mid-fade.
//
// Six branches per DESIGN_BACKLOG B-003 + Vision Owner 2026-08-08:
//
//   collapsed        — day.serviceCollapsed. Preempts wager branches.
//   high_wager_win   — the last wager was won on a weak capital (weak-
//                      win multiplier fired, delta ≥ 0.09).
//   high_wager_loss  — the last wager was placed and lost.
//   good             — no collapse, net revenue > cost × 1.15, rep held or grew.
//   thin             — no collapse, net revenue < cost × 0.90.
//   mediocre         — everything else. The Vision Owner's specific ask:
//                      "kvällen bara var medioker — inte varje kväll
//                      ska ha en poäng." Deliberately non-committal.
//
// The service's net revenue and cost are computed as deltas from the
// snapshots captured at OPEN_SERVICE (day.revenueAtServiceStart etc).
// If the snapshots are null (defensive), the mediocre branch fires —
// nothing else can be truthfully said.

import type {
  EveningAccount,
  EveningAccountBranch,
  SimulationState,
  SustainabilityKey,
  WagerHistoryEntry
} from '../types';
import { pickParagraph } from '../../content/eveningAccount.sv';
// Import from ./constants (no imports there) to keep this module
// out of the reducer ↔ themeSelection cycle. Previously imported
// from ./themeSelection, which pulled in reducer.ts and triggered
// a TDZ crash when the browser bundle evaluated this line before
// reducer.ts finished defining WAGER_UNIT_STAKE.
import { WAGER_UNIT_STAKE } from './constants';

// Threshold for "the wager was resolved this service" — the last
// wagerHistory entry must have landed after the current service
// opened. Uses reputationAtServiceStart's timestamp indirectly via
// day.periodStartAt (the current service's start).
function lastWagerThisService(
  state: SimulationState
): WagerHistoryEntry | null {
  const hist = state.capitals.wagerHistory;
  if (hist.length === 0) return null;
  // periodStartAt at the moment of close is either the service's
  // start (natural close: periodStartAt updates on transition) or,
  // for collapse mid-service, still the service start. The caller
  // must pass state BEFORE the day transition writes a new
  // periodStartAt, so periodStartAt here is the service open time.
  const serviceStart = state.day.periodStartAt;
  const last = hist[hist.length - 1];
  return last.at >= serviceStart ? last : null;
}

// Weak-win threshold — a payout with the weak-multiplier multiplier
// yields delta ≥ WAGER_UNIT_STAKE × WAGER_WEAK_WIN_MULTIPLIER (0.15)
// on a win. We check ≥ WAGER_UNIT_STAKE × 1.4 to catch it while
// staying tolerant of small future multiplier tuning.
const HIGH_WAGER_WIN_DELTA = WAGER_UNIT_STAKE * 1.4;

// "Good night" thresholds. Net revenue = (current revenue − snapshot).
// Rep "held or grew" = current reputation ≥ snapshot − 0.02 (allowing
// tiny drift so a stable evening still qualifies).
const GOOD_MARGIN_RATIO = 1.15;
const THIN_MARGIN_RATIO = 0.90;
const REPUTATION_HELD_TOLERANCE = 0.02;

// -------- branch selection --------------------------------------------

export function pickBranch(state: SimulationState): EveningAccountBranch {
  // Collapsed preempts everything.
  if (state.day.serviceCollapsed) return 'collapsed';

  const wager = lastWagerThisService(state);
  if (wager) {
    if (wager.outcome === 'win' && wager.delta >= HIGH_WAGER_WIN_DELTA) {
      return 'high_wager_win';
    }
    if (wager.outcome === 'loss') {
      return 'high_wager_loss';
    }
  }

  const rStart = state.day.revenueAtServiceStart;
  const cStart = state.day.costAtServiceStart;
  const repStart = state.day.reputationAtServiceStart;
  if (rStart === null || cStart === null || repStart === null) return 'mediocre';

  const netRev = state.revenue - rStart;
  const netCost = state.cost - cStart;
  const repHeld = state.reputation >= repStart - REPUTATION_HELD_TOLERANCE;

  // Cost baseline: if the service was so short cost barely moved,
  // we compare against a floor to avoid inflating the ratio for a
  // trivial denominator. 30 credits ≈ 3 min at the min-team cost floor.
  const costFloor = Math.max(30, netCost);

  if (repHeld && netRev > costFloor * GOOD_MARGIN_RATIO) return 'good';
  if (netRev < costFloor * THIN_MARGIN_RATIO) return 'thin';
  return 'mediocre';
}

// -------- compose ------------------------------------------------------

export function computeEveningAccount(state: SimulationState): EveningAccount {
  const branch = pickBranch(state);
  const wager = lastWagerThisService(state);
  const wagerCapital: SustainabilityKey | null = wager ? wager.staked : null;
  const drewCapital: SustainabilityKey | null = wager ? wager.drew : null;
  const paragraph = pickParagraph({
    branch,
    collapseAxis: state.day.collapseAxis,
    wagerCapital,
    drewCapital
  });
  return {
    branch,
    paragraph,
    presentedAt: state.simTime
  };
}
