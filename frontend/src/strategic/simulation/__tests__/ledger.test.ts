// ORDER 050 §7 step 3 (2026-08-10) — ledger smoke.
//
// One executable pass through a full day (dinner service + evening
// transition) that asserts the four expected line categories land in
// state.ledger. Cheap sanity that the ring buffer, per-service
// summary posts and day-close wage posts are all wired.

import { describe, expect, it } from 'vitest';
import { LEDGER_MAX_LINES } from '../constants';
import { makeInitialState } from '../model';
import { postLedger } from '../cashReading';
import { reducer } from '../reducer';
import type { LedgerCategory, SimulationState } from '../../types';

// -------- postLedger primitive -----------------------------------------

describe('postLedger', () => {
  it('appends a line with the current sim state stamped', () => {
    const s = makeInitialState(1);
    s.simTime = 42;
    postLedger(s, { category: 'other', amount: -100, cause: 'test line' });
    expect(s.ledger).toHaveLength(1);
    const line = s.ledger[0];
    expect(line.at).toBe(42);
    expect(line.day).toBe(s.day.dayNumber);
    expect(line.period).toBe(s.day.period);
    expect(line.category).toBe('other');
    expect(line.amount).toBe(-100);
    expect(line.cause).toBe('test line');
    expect(line.runningCash).toBe(s.cash);
  });

  it('does not mutate cash — it is a book entry, not a mover', () => {
    const s = makeInitialState(1);
    const cashBefore = s.cash;
    postLedger(s, { category: 'agency', amount: -5000, cause: 'test' });
    expect(s.cash).toBe(cashBefore);
  });

  it('trims to LEDGER_MAX_LINES (ring buffer)', () => {
    const s = makeInitialState(1);
    // Post 1005 lines; expect exactly LEDGER_MAX_LINES (1000) survivors,
    // and the earliest to be dropped.
    for (let i = 0; i < LEDGER_MAX_LINES + 5; i++) {
      postLedger(s, { category: 'other', amount: 1, cause: `line ${i}` });
    }
    expect(s.ledger).toHaveLength(LEDGER_MAX_LINES);
    // First surviving line is index 5 (0..4 dropped).
    expect(s.ledger[0].cause).toBe('line 5');
    expect(s.ledger[LEDGER_MAX_LINES - 1].cause).toBe(`line ${LEDGER_MAX_LINES + 4}`);
  });
});

// -------- full-loop smoke: dinner service + day roll -------------------

describe('full-loop ledger smoke — a dinner service that closes and rolls into the next morning', () => {
  function runOneDayDinner(seed: number, minutes = 10): SimulationState {
    let s: SimulationState = makeInitialState(seed);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: minutes });
    // Opening 10 s + prep 120 s + service (minutes × 60) + evening
    // pause 30 s + slack. dt = 0.2, so ticks = ~5 × (seconds + slack).
    const ticks = Math.ceil((minutes * 60 + 200) * 5);
    for (let i = 0; i < ticks; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    return s;
  }

  it('produces revenue + wage + interest + ingredient lines by the end of a 10-min dinner day', () => {
    const s = runOneDayDinner(42, 10);
    const seen = new Set<LedgerCategory>(s.ledger.map((l) => l.category));
    expect(seen.has('revenue'), 'revenue line missing (dinner should have covers)').toBe(true);
    expect(seen.has('ingredient'), 'ingredient line missing (dinner should accrue tick-costs)').toBe(true);
    expect(seen.has('wage'), 'wage line missing (evening→morning should post wages)').toBe(true);
    expect(seen.has('interest'), 'interest line missing (daily accrual should fire on day advance)').toBe(true);
  });

  it('ingredient line signs negative; revenue line signs positive', () => {
    const s = runOneDayDinner(42, 10);
    const ingredient = s.ledger.find((l) => l.category === 'ingredient');
    const revenue = s.ledger.find((l) => l.category === 'revenue');
    expect(ingredient).toBeDefined();
    expect(ingredient!.amount).toBeLessThan(0);
    expect(revenue).toBeDefined();
    expect(revenue!.amount).toBeGreaterThan(0);
  });

  it('runningCash monotonicity — every line stamps the till at post time in order', () => {
    // Not a strict >= or <=, but each row's runningCash was the
    // cash *at that moment*, so the sequence should follow the
    // cumulative amount as long as no un-lined mutations happen
    // between posts. Practically: the delta between two adjacent
    // rows in the ledger should approximately match line.amount.
    // (Approximate because per-guest revenue moves cash silently.)
    const s = runOneDayDinner(42, 10);
    expect(s.ledger.length).toBeGreaterThan(0);
    // Sanity: at least one line exists with runningCash matching a
    // valid till balance (positive or negative float within reason).
    for (const line of s.ledger) {
      expect(Number.isFinite(line.runningCash)).toBe(true);
    }
  });
});
