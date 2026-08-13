// ORDER 075 (M2) — Morning legibility DoD verification.
//
// Per STRATEGIC_TRACK_MILESTONES_PROPOSAL.md §2 and the M2 report
// gate (M2_ACTIVITY_MODEL_REPORT_ORDER_075.md), a player must be
// able to pick 1–3 activities in the morning; each activity's
// three-column effect must be readable on the card; the evening
// account must name at least one picked activity; and no activity
// may label itself as "serving" a specific sustainability.
//
// DoD 2 (card visual rendering) is verified by DOM assertion via
// testing-library; here we cover the state + reducer + evening-
// account paths that back the UI.

import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import { runHarness } from './harness';
import { ACTIVITY_CATALOGUE, MAX_ACTIVITIES_PER_DAY } from '../activities';
import { INITIAL_CASH_SEK } from '../constants';

describe('M2 DoD — morning activity model', () => {
  it('DoD 1 — player can pick 1–3 activities in the morning', () => {
    let s = makeInitialState(1);
    expect(s.day.period).toBe('morning');
    // Pick one activity — should succeed
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'train-service' });
    expect(s.day.pickedActivityIds).toEqual(['train-service']);
    // Cash deducted immediately by the activity's cost
    expect(s.cash).toBe(INITIAL_CASH_SEK - 3000);
    // Ledger has one 'other' line for the cost
    expect(s.ledger.length).toBe(1);
    expect(s.ledger[0].category).toBe('other');
    expect(s.ledger[0].amount).toBe(-3000);
    // Pick two more — cap at 3
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'runner-shift' });
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'wine-tasting' });
    expect(s.day.pickedActivityIds).toHaveLength(3);
    // Fourth pick rejected
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'local-sourcing' });
    expect(s.day.pickedActivityIds).toHaveLength(MAX_ACTIVITIES_PER_DAY);
    // Cash reflects three costs
    expect(s.cash).toBe(INITIAL_CASH_SEK - 3000 - 1800 - 2000);
  });

  it('DoD 1 — unpick refunds cost and clears history', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'train-service' });
    s = reducer(s, { type: 'UNPICK_ACTIVITY', id: 'train-service' });
    expect(s.day.pickedActivityIds).toEqual([]);
    expect(s.cash).toBe(INITIAL_CASH_SEK);
    expect(s.activityHistory).toEqual([]);
    // Ledger records both pick + refund
    expect(s.ledger.length).toBe(2);
    expect(s.ledger[0].amount + s.ledger[1].amount).toBe(0);
  });

  it('DoD 1 — pick rejected outside morning', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    expect(s.day.period).toBe('afternoon');
    const before = s;
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'train-service' });
    // Reducer returns the SAME state reference when rejecting.
    expect(s).toBe(before);
  });

  it('DoD 1 — weekly-gated activity refused within 7 days', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'guest-chef' });
    expect(s.day.pickedActivityIds).toContain('guest-chef');
    // Force day 2 by mutating history to simulate a later day
    // pick attempt. Simpler than tick-through: just test the
    // gate condition directly.
    const s2: typeof s = {
      ...s,
      day: { ...s.day, dayNumber: 3, pickedActivityIds: [] },
      cash: INITIAL_CASH_SEK
    };
    const after = reducer(s2, { type: 'PICK_ACTIVITY', id: 'guest-chef' });
    // Weekly gate rejects (picked day 1, today day 3, within 7-day window)
    expect(after.day.pickedActivityIds).toEqual([]);
    // Now advance past the window
    const s10: typeof s = { ...s2, day: { ...s2.day, dayNumber: 10 } };
    const afterLater = reducer(s10, { type: 'PICK_ACTIVITY', id: 'guest-chef' });
    expect(afterLater.day.pickedActivityIds).toContain('guest-chef');
  });

  it('DoD 3 — evening account paragraph names at least one picked activity', () => {
    // Full 1-day run via INFRA-2: pick activities morning, run
    // day, capture evening account paragraph.
    const script = [
      { atSec: 1, action: { type: 'SET_POLICY', patch: { pricing: 'medel' } } },
      { atSec: 2, action: { type: 'PICK_ACTIVITY', id: 'local-sourcing' } },
      { atSec: 3, action: { type: 'PICK_ACTIVITY', id: 'wine-tasting' } },
      { atSec: 4, action: { type: 'SKIP_LUNCH' } },
      { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 5 } }
    ] as { atSec: number; action: import('../../types').SimAction }[];
    const r = runHarness({ seed: 42, script, runUntilSec: 1200 });
    expect(r.eveningAccounts.length).toBeGreaterThan(0);
    const paragraph = r.eveningAccounts[0];
    // Both picked activities named by name
    expect(paragraph).toContain("Switch tonight's produce to local");
    expect(paragraph).toContain('Team wine tasting hour');
    // Prepended, not appended
    expect(paragraph.startsWith('Today you picked:')).toBe(true);
  });

  it('DoD 4 — no activity name/description labels a sustainability capital', () => {
    // ORDER 050 §4 constraint: the numbers are the teaching; no
    // card may label itself as "serving" any one capital.
    // Concrete check: activity name + description strings do not
    // contain the sustainability tokens (matches Swedish + English).
    const forbiddenTokens = [
      'social',       // Swedish + English
      'ekolog',       // Swedish ecological
      'ecolog',       // English ecological
      'ekonom',       // Swedish economic
      'econom',       // English economic
      'hållbarhet',   // Swedish sustainability
      'sustainab',    // English sustainability
      'capital'       // English capital
    ];
    for (const a of ACTIVITY_CATALOGUE) {
      const text = (a.name + ' ' + a.description).toLowerCase();
      for (const tok of forbiddenTokens) {
        expect(
          text.includes(tok),
          `activity '${a.id}' text "${a.name} — ${a.description}" includes forbidden token '${tok}' (ORDER 050 §4)`
        ).toBe(false);
      }
    }
  });

  it('activity effect applies at day rollover (capitals move, ledger records)', () => {
    const script = [
      { atSec: 1, action: { type: 'PICK_ACTIVITY', id: 'local-sourcing' } },
      { atSec: 2, action: { type: 'SKIP_LUNCH' } },
      { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 5 } }
    ] as { atSec: number; action: import('../../types').SimAction }[];
    const r = runHarness({ seed: 42, script, runUntilSec: 1200 });
    // Should have crossed at least one day rollover
    expect(r.finalState.day.dayNumber).toBeGreaterThanOrEqual(2);
    // Ledger has an 'Activity effect' line naming the activity
    const effectLine = r.finalState.ledger.find((l) =>
      l.cause.startsWith('Activity effect')
    );
    expect(effectLine, 'no Activity effect ledger line found').toBeDefined();
    expect(effectLine!.cause).toContain("Switch tonight's produce to local");
    expect(effectLine!.amount).toBe(-2500);
  });
});
