// ORDER 076 (M6) — cause-aware texture DoD verification.
//
// Per STRATEGIC_TRACK_MILESTONES_PROPOSAL.md §2 and the M6 report
// gate (M6_CAUSE_AWARE_TEXTURE_REPORT_ORDER_076.md), every stream
// event should name its condition (via `causeTag`) and there
// should exist chains of ≥ 3 events sharing one `causeChainId`.
// Plus the pickParagraph divergence baseline should move from
// 0.000 toward the 0.30 M6 target.

import { describe, expect, it } from 'vitest';
import { jaccardTokenDistance, runHarness } from './harness';
import type { EventStreamEntry, ScenarioChoice } from '../../types';


// Script designed to trigger multiple named conditions so
// detectCause has real signals to attach:
//   - SET_POLICY morning changes → 'morning_change' on early-service events
//   - SET_POLICY ingredientTier: 'grund' → 'ingredient_tier_grund' on
//     kitchen_slip / delivery_short / prep_delivery
//   - Longer 15-min services so more ambient events actually fire
// Additional per-day SET_POLICY toggles keep 'morning_change' fresh.
function threeDayScript() {
  return [
    { atSec: 1, action: { type: 'SET_POLICY', patch: { pricing: 'medel', ingredientTier: 'grund' } } },
    { atSec: 3, action: { type: 'SKIP_LUNCH' } },
    { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 } },
    { atSec: 500, action: { type: 'TRIGGER_SCENARIO' } },
    { atSec: 510, action: { type: 'ADVANCE_SCENARIO_TO_SITUATION' } },
    // Day 2 morning: change policy again to keep the morning_change
    // condition alive; keep ingredientTier 'grund' so kitchen-slip
    // lines detect it.
    { atSec: 1300, action: { type: 'SET_POLICY', patch: { pricing: 'hög' } } },
    { atSec: 1400, action: { type: 'SKIP_LUNCH' } },
    { atSec: 1450, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 } },
    { atSec: 1900, action: { type: 'TRIGGER_SCENARIO' } },
    { atSec: 1910, action: { type: 'ADVANCE_SCENARIO_TO_SITUATION' } },
    // Day 3
    { atSec: 2700, action: { type: 'SET_POLICY', patch: { trainingLevel: 1 } } },
    { atSec: 2750, action: { type: 'SKIP_LUNCH' } },
    { atSec: 2800, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 } },
    { atSec: 3250, action: { type: 'TRIGGER_SCENARIO' } },
    { atSec: 3260, action: { type: 'ADVANCE_SCENARIO_TO_SITUATION' } }
  ] as { atSec: number; action: import('../../types').SimAction }[];
}
const RUN_UNTIL_LOCAL = 4000;

describe('M6 DoD — cause-aware texture', () => {
  it('DoD 2 — every ambient consequence line names a specific condition (not just legacy fallback)', () => {
    const r = runHarness({
      seed: 42,
      script: threeDayScript(),
      runUntilSec: RUN_UNTIL_LOCAL
    });
    // Ambient events with a specific-condition causeTag. Legacy
    // fallbacks ('ignorance', 'strain', 'both') are permitted at
    // ≤ 20 % — the report gate said 80 % specific-tag coverage.
    const ambientEntries: EventStreamEntry[] = r.finalState.eventStream.filter(
      (e) => e.category === 'ambient'
    );
    expect(ambientEntries.length, 'no ambient events emitted in 3-day run').toBeGreaterThan(3);
    const LEGACY = new Set(['ignorance', 'strain', 'both']);
    const specific = ambientEntries.filter(
      (e) => e.causeTag !== null && !LEGACY.has(e.causeTag)
    );
    const ratio = specific.length / ambientEntries.length;
    console.log(
      `[M6] specific-tag coverage: ${specific.length}/${ambientEntries.length} = ${(ratio * 100).toFixed(1)}%`
    );
    expect(
      ratio,
      `only ${(ratio * 100).toFixed(1)}% of ambient events carry a specific cause tag (target ≥ 80% per M6 §5.2)`
    ).toBeGreaterThanOrEqual(0.8);
  });

  it('DoD 3 — a chain of ≥ 3 events shares one causeChainId', () => {
    const r = runHarness({
      seed: 42,
      script: threeDayScript(),
      runUntilSec: RUN_UNTIL_LOCAL
    });
    const chains = new Map<string, number>();
    for (const e of r.finalState.eventStream) {
      if (e.causeChainId) {
        chains.set(e.causeChainId, (chains.get(e.causeChainId) ?? 0) + 1);
      }
    }
    const longestChain = Math.max(0, ...chains.values());
    console.log(
      `[M6] longest cause chain: ${longestChain} events (${chains.size} distinct chains across ${r.finalState.eventStream.length} stream entries)`
    );
    expect(
      longestChain,
      `longest cause chain is ${longestChain}; M6 DoD 3 requires ≥ 3`
    ).toBeGreaterThanOrEqual(3);
  });

  it('pickParagraph divergence — evening account text diverges by scenario choice', () => {
    // Baseline (recorded in ACES_MODEL_FINDINGS §M6) was 0.000
    // pre-M6 because pickParagraph passed drewCapital: null and
    // read it in only the retired high_wager branches. Under M6
    // computeEveningAccount propagates state.day.drawnCapital
    // (set at RESOLVE_SCENARIO) into pickParagraph, and the
    // good / thin / mediocre branches now each carry three
    // capital-flavoured lead sentences. First-landing target
    // is ≥ 0.15 (proposal §6.2 M6-first-cut floor); 0.30
    // remains the eventual target when the whole paragraph is
    // cause-woven.
    const strategyA: (state: unknown) => ScenarioChoice = () => 'A';
    const strategyB: (state: unknown) => ScenarioChoice = () => 'B';
    const strategyC: (state: unknown) => ScenarioChoice = () => 'C';
    const runA = runHarness({
      seed: 42, script: threeDayScript(), runUntilSec: RUN_UNTIL_LOCAL, scenarioStrategy: strategyA
    });
    const runB = runHarness({
      seed: 42, script: threeDayScript(), runUntilSec: RUN_UNTIL_LOCAL, scenarioStrategy: strategyB
    });
    const runC = runHarness({
      seed: 42, script: threeDayScript(), runUntilSec: RUN_UNTIL_LOCAL, scenarioStrategy: strategyC
    });
    expect(runA.eveningAccounts.length).toBeGreaterThan(0);
    expect(runB.eveningAccounts.length).toBeGreaterThan(0);
    expect(runC.eveningAccounts.length).toBeGreaterThan(0);
    const textA = runA.eveningAccounts.join(' ');
    const textB = runB.eveningAccounts.join(' ');
    const textC = runC.eveningAccounts.join(' ');
    const dAB = jaccardTokenDistance(textA, textB);
    const dAC = jaccardTokenDistance(textA, textC);
    const dBC = jaccardTokenDistance(textB, textC);
    const maxD = Math.max(dAB, dAC, dBC);
    console.log(
      `[M6] evening-account divergence — dAB=${dAB.toFixed(3)} dAC=${dAC.toFixed(3)} dBC=${dBC.toFixed(3)} max=${maxD.toFixed(3)} (target 0.30 eventual)`
    );
    expect(
      maxD,
      `evening-account divergence still at ${maxD.toFixed(3)} — M6 first-cut floor 0.15 not cleared. ` +
      `Verify state.day.drawnCapital wiring at RESOLVE_SCENARIO and pickParagraph capital-branch text.`
    ).toBeGreaterThanOrEqual(0.15);
  });
});
