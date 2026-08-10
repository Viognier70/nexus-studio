// ORDER 046 §3 — the evening's account.
//
// Called at the moment a service ends (natural close or collapse) to
// snapshot what happened, pick a branch, and produce a paragraph in
// the observer's voice. Stored in state.eveningAccount so it doesn't
// shift while the player reads it — capital drift during the evening
// pause would otherwise re-pick a different branch mid-fade.
//
// Four branches after ORDER 050 §5 (2026-08-10) retired the two
// wager-driven branches (high_wager_win, high_wager_loss). Content
// bank still ships them so a future activity-anchored wager could
// re-use the copy shape; they are unreachable until then.
//
//   collapsed  — day.serviceCollapsed. Preempts everything.
//   good       — no collapse, net revenue > cost × 1.15, rep held or grew.
//   thin       — no collapse, net revenue < cost × 0.90.
//   mediocre   — everything else. Vision Owner's specific ask
//                (2026-08-08): "kvällen bara var medioker — inte varje
//                kväll ska ha en poäng." Deliberately non-committal.
//
// The service's net revenue and cost are computed as deltas from the
// snapshots captured at OPEN_SERVICE (day.revenueAtServiceStart etc).
// If the snapshots are null (defensive), the mediocre branch fires —
// nothing else can be truthfully said.

import type {
  EveningAccount,
  EveningAccountBranch,
  SimulationState
} from '../types';
import { pickParagraph } from '../../content/eveningAccount.sv';

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
  let paragraph = pickParagraph({
    branch,
    collapseAxis: state.day.collapseAxis,
    wagerCapital: null,
    drewCapital: null
  });
  // ORDER 047 §6 — if a morning policy change was made this day, name
  // it once at the head of the paragraph so the investment reads
  // through to the evening. The change lines are already
  // observer-voice per applyPolicyPatch's synthesis; we just join
  // them with the paragraph.
  const changes = state.day.morningPolicyChanges;
  if (changes.length > 0) {
    paragraph = changes.join(' ') + ' ' + paragraph;
  }
  return {
    branch,
    paragraph,
    presentedAt: state.simTime
  };
}
