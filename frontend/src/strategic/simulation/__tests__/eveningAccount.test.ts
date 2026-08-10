// ORDER 046 §3 — evening-account invariants.
//
// Pinned (post-ORDER-050 §5 wager retirement, 2026-08-10):
//   * pickBranch collapses take precedence over every other branch.
//   * A good night (rep held, revenue > cost × 1.15) picks 'good'.
//   * A thin night (revenue < cost × 0.90) picks 'thin'.
//   * Everything else is 'mediocre' (Vision Owner's explicit ask).
//   * Missing snapshots (defensive) → mediocre.
//   * pickParagraph returns non-empty text for every branch (unreachable
//     high_wager_* included — copy shape kept for a possible future
//     activity-anchored wager).
//   * computeEveningAccount stamps presentedAt = state.simTime.
//   * Full-loop: opening a dinner, ticking it through natural close,
//     produces a non-null state.eveningAccount at evening start.

import { describe, expect, it } from 'vitest';
import { pickParagraph } from '../../../content/eveningAccount.sv';
import { computeEveningAccount, pickBranch } from '../eveningAccount';
import { fireCollapse } from '../collapse';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import type {
  EveningAccountBranch,
  SimulationState
} from '../../types';

// -------- helpers -------------------------------------------------------

function midService(base: SimulationState): SimulationState {
  return {
    ...base,
    day: {
      ...base.day,
      period: 'dinner',
      periodStartAt: 100,
      currentServiceLengthMinutes: 15,
      revenueAtServiceStart: 0,
      costAtServiceStart: 0,
      reputationAtServiceStart: 0.60,
      openingEndsAt: null,
      prepEndsAt: null
    },
    reputation: 0.60,
    revenue: 0,
    cost: 0
  };
}

function withRevenueAndCost(
  state: SimulationState,
  netRev: number,
  netCost: number,
  rep: number = state.reputation
): SimulationState {
  return { ...state, revenue: netRev, cost: netCost, reputation: rep };
}

// -------- pickBranch — branch selection ---------------------------------

describe('pickBranch — collapsed preempts everything', () => {
  it('serviceCollapsed → collapsed regardless of revenue', () => {
    const base = midService(makeInitialState(1));
    const withRev = withRevenueAndCost(base, 400, 300, 0.60);
    const collapsed = {
      ...withRev,
      day: { ...withRev.day, serviceCollapsed: true, collapseAxis: 'cultural' as const }
    };
    expect(pickBranch(collapsed)).toBe('collapsed');
  });
});

describe('pickBranch — revenue/cost branches', () => {
  it('good night: rep held, revenue > cost × 1.15', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 400, 300, 0.60);
    expect(pickBranch(s)).toBe('good');
  });

  it('good night blocked when rep drops noticeably', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 400, 300, 0.50); // dropped 0.10
    expect(pickBranch(s)).toBe('mediocre');
  });

  it('thin night: revenue < cost × 0.90', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 200, 300, 0.60);
    expect(pickBranch(s)).toBe('thin');
  });

  it('mediocre when revenue barely covers cost', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 310, 300, 0.60);
    expect(pickBranch(s)).toBe('mediocre');
  });

  it('mediocre is the fallback when snapshots are missing', () => {
    const base = makeInitialState(1);
    // day.revenueAtServiceStart is null on a fresh initialState.
    expect(pickBranch(base)).toBe('mediocre');
  });
});

// -------- pickParagraph — every branch returns text --------------------

describe('pickParagraph — content shape', () => {
  const branches: EveningAccountBranch[] = [
    'collapsed', 'high_wager_win', 'high_wager_loss', 'good', 'thin', 'mediocre'
  ];
  for (const b of branches) {
    it(`${b} returns a non-empty paragraph ending on a sentence`, () => {
      const p = pickParagraph({
        branch: b,
        collapseAxis: 'cultural',
        wagerCapital: 'social',
        drewCapital: 'economic'
      });
      expect(p.length).toBeGreaterThan(40);
      expect(/[.!?]$/.test(p)).toBe(true);
    });
  }
});

// -------- computeEveningAccount — full snapshot -----------------------

describe('computeEveningAccount', () => {
  it('stamps presentedAt with state.simTime', () => {
    const base = midService(makeInitialState(1));
    const s = { ...base, simTime: 250 };
    const acc = computeEveningAccount(s);
    expect(acc.presentedAt).toBe(250);
  });

  it('picks a branch consistent with pickBranch', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 400, 300, 0.60);
    const acc = computeEveningAccount(s);
    expect(acc.branch).toBe(pickBranch(s));
  });
});

// -------- full loop — dinner close writes state.eveningAccount --------

describe('full loop — evening account appears at natural close', () => {
  it('dinner → evening transition populates state.eveningAccount', () => {
    let s = makeInitialState(42);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 3 });
    // Advance through opening (10 s), prep (120 s), 3-min service (180 s)
    // + slack for the day transition. 3-min service length is
    // openingEndsAt + prepEndsAt + serviceWindow = 10 + 120 + 50 = 180 s.
    const totalTicks = 5 * 200; // 200 sim-sec → past close
    for (let i = 0; i < totalTicks; i++) {
      s = reducer(s, { type: 'TICK', dt: 1 / 5 });
      if (s.eveningAccount !== null) break;
    }
    expect(s.eveningAccount).not.toBeNull();
    expect(s.eveningAccount!.paragraph.length).toBeGreaterThan(40);
  });
});

// -------- collapse fires evening account too --------------------------

describe('fireCollapse — writes state.eveningAccount as collapsed branch', () => {
  it('collapse mid-service produces a collapsed-branch account', () => {
    const base = midService(makeInitialState(7));
    const draft: SimulationState = { ...base };
    fireCollapse(draft);
    expect(draft.eveningAccount).not.toBeNull();
    expect(draft.eveningAccount!.branch).toBe('collapsed');
  });
});
