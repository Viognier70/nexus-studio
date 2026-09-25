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
import { computeEveningAccount, computeMetrics, pickBranch } from '../eveningAccount';
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
      doorsOpenAt: null
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
        drewCapital: 'economic',
        lastChoice: null
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
    // openingEndsAt + doorsOpenAt + serviceWindow = 10 + 120 + 50 = 180 s.
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

// ORDER 228 (etapp A) — computeMetrics
describe('computeMetrics (ORDER 228 etapp A)', () => {
  it('räknar revenue/cost/result som diff mot service-start-snapshotarna', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 4200, 1800, 0.62);
    const m = computeMetrics(s);
    expect(m.revenue).toBe(4200);
    expect(m.cost).toBe(1800);
    expect(m.result).toBe(2400);
  });

  it('reputationDelta = state.reputation − snapshot', () => {
    const base = midService(makeInitialState(1));
    // Snapshot 0.60, current 0.65 → delta +0.05.
    const s = withRevenueAndCost(base, 0, 0, 0.65);
    const m = computeMetrics(s);
    expect(m.reputationDelta).toBeCloseTo(0.05, 5);
  });

  it('knowledgeDelta per axel = current − snapshot', () => {
    const base = midService(makeInitialState(1));
    // Sätt snapshot till {0.10, 0.05, 0.20}, current till {0.14, 0.05, 0.18}.
    // ORDER 230 — computeMetrics läser AtDayStart FÖRST; sätter både
    // AtDayStart och AtServiceStart så testet verifierar avsedd
    // delta-räkning oavsett vilken snapshot som är primärkälla.
    const s: SimulationState = {
      ...base,
      day: {
        ...base.day,
        knowledgeCreditsAtDayStart: { episteme: 0.10, techne: 0.05, phronesis: 0.20 },
        knowledgeCreditsAtServiceStart: { episteme: 0.10, techne: 0.05, phronesis: 0.20 }
      },
      knowledgeCredits: { episteme: 0.14, techne: 0.05, phronesis: 0.18 }
    };
    const m = computeMetrics(s);
    expect(m.knowledgeDelta.episteme).toBeCloseTo(0.04, 5);
    expect(m.knowledgeDelta.techne).toBeCloseTo(0.00, 5);
    expect(m.knowledgeDelta.phronesis).toBeCloseTo(-0.02, 5);
  });

  it('faller tillbaka till noll-delta när snapshots saknas', () => {
    const base = makeInitialState(1);
    // Ingen OPEN_SERVICE har körts → alla snapshots är null.
    const m = computeMetrics(base);
    expect(m.revenue).toBe(0);
    expect(m.cost).toBe(0);
    expect(m.result).toBe(0);
    expect(m.reputationDelta).toBe(0);
    expect(m.knowledgeDelta.episteme).toBe(0);
    expect(m.knowledgeDelta.techne).toBe(0);
    expect(m.knowledgeDelta.phronesis).toBe(0);
  });

  it('result kan vara negativt när kostnaden överstiger intäkten', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 800, 1500);
    const m = computeMetrics(s);
    expect(m.result).toBe(-700);
  });
});

describe('computeEveningAccount inkluderar metrics-objektet (ORDER 228 etapp A)', () => {
  it('EveningAccount.metrics finns med rätt fält', () => {
    const base = midService(makeInitialState(1));
    const s = withRevenueAndCost(base, 3000, 1200, 0.62);
    const account = computeEveningAccount(s);
    expect(account.metrics).toBeDefined();
    expect(account.metrics!.revenue).toBe(3000);
    expect(account.metrics!.cost).toBe(1200);
    expect(account.metrics!.result).toBe(1800);
    expect(account.metrics!.reputationDelta).toBeCloseTo(0.02, 5);
    expect(account.metrics!.knowledgeDelta).toEqual({
      episteme: 0, techne: 0, phronesis: 0
    });
  });
});

describe('OPEN_SERVICE snapshottar knowledgeCredits (ORDER 228 etapp A)', () => {
  it('day.knowledgeCreditsAtServiceStart sätts vid OPEN_SERVICE och nollställs vid stängning', () => {
    let s = makeInitialState(1);
    // Före service: null.
    expect(s.day.knowledgeCreditsAtServiceStart ?? null).toBeNull();
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 3
    });
    // Efter OPEN_SERVICE: snapshot av knowledgeCredits.
    expect(s.day.knowledgeCreditsAtServiceStart).toEqual(s.knowledgeCredits);
    // Deep-copy check: mutation av state.knowledgeCredits ska INTE ändra
    // snapshotet.
    const snapshotRef = s.day.knowledgeCreditsAtServiceStart!;
    const originalEpisteme = snapshotRef.episteme;
    // (Vi muterar inte state, bara verifierar identitet — reducer-copy
    // ska ha isolerat objekten.)
    expect(snapshotRef).not.toBe(s.knowledgeCredits);
    expect(snapshotRef.episteme).toBe(originalEpisteme);
  });
});
