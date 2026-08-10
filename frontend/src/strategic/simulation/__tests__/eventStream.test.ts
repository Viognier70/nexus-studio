// ORDER 043 Addendum A — service event stream invariants.
//
// Pinned properties:
//   * Multiplier shapes match the model report (ignorance floor 0.10,
//     strain floor 0.30, both clamped at their ceilings).
//   * Ambient rolls fire only during lunch / dinner. Never fire in
//     morning / afternoon / evening.
//   * Outcome events fire deterministically at t+6 and t+18 after
//     RESOLVE_SCENARIO — regardless of period (a choice made just
//     before close still gets its consequence).
//   * The stream carries no capital movement — resolving does move
//     capital, but an ambient roll does not (traceability guarantee).
//   * Sentence variety: no consecutive-identical ambient text over
//     20 fires with the same rng.

import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import {
  EVENT_DEFS,
  calmnessMultiplier,
  competenceFor,
  eventMultiplier,
  eventProbabilityPerTick,
  ignoranceMultiplier,
  loadOf,
  positiveEventProbabilityPerTick,
  strainMultiplier
} from '../eventStream';
import type { DayPeriod, SimulationState } from '../../types';

function inPeriod(seed: number, period: DayPeriod): SimulationState {
  const s = makeInitialState(seed);
  s.day = { ...s.day, period };
  return s;
}

describe('ignoranceMultiplier — approved shape', () => {
  it('is 0.10 at full competence (c = 1)', () => {
    expect(ignoranceMultiplier(1)).toBeCloseTo(0.1, 10);
  });
  it('is 1.60 at zero competence (c = 0)', () => {
    expect(ignoranceMultiplier(0)).toBeCloseTo(1.6, 10);
  });
  it('is monotonically decreasing across [0, 1]', () => {
    let last = Infinity;
    for (let c = 0; c <= 1; c += 0.05) {
      const m = ignoranceMultiplier(c);
      expect(m).toBeLessThanOrEqual(last);
      last = m;
    }
  });
  it('clamps out-of-range inputs', () => {
    expect(ignoranceMultiplier(-1)).toBeCloseTo(1.6, 10);
    expect(ignoranceMultiplier(2)).toBeCloseTo(0.1, 10);
  });
});

describe('strainMultiplier — approved shape', () => {
  it('is 0.30 at rest and just under capacity (L ≤ 1.0)', () => {
    expect(strainMultiplier(0)).toBeCloseTo(0.3, 10);
    expect(strainMultiplier(0.5)).toBeCloseTo(0.3, 10);
    expect(strainMultiplier(1.0)).toBeCloseTo(0.3, 10);
  });
  it('grows above capacity and caps at 3.0', () => {
    expect(strainMultiplier(1.2)).toBeCloseTo(0.8, 10);
    expect(strainMultiplier(1.5)).toBeCloseTo(1.55, 10);
    expect(strainMultiplier(2.0)).toBeCloseTo(2.8, 10);
    expect(strainMultiplier(5.0)).toBe(3.0);
  });
});

describe('eventMultiplier composition per cause tag', () => {
  it('ignorance-only reads competence for its source axis via teamCompetence', () => {
    const s = inPeriod(1, 'dinner');
    const def = EVENT_DEFS.find((d) => d.causeTag === 'ignorance')!;
    // Expected: ignoranceMultiplier(teamCompetence(source)) — verifies
    // the wiring from EVENT_DEFS.competenceSource through the team.
    const expected = ignoranceMultiplier(competenceFor(def.competenceSource, s));
    expect(eventMultiplier(def, s)).toBeCloseTo(expected, 10);
  });
  it('strain-only reads only strainMultiplier', () => {
    const s = inPeriod(1, 'dinner');
    // load 0.5 → strainMult 0.30
    for (let i = 0; i < 5; i++) {
      s.guests.push({
        id: `g${i}`,
        state: 'seated',
        satisfaction: 1,
        seatIndex: 0,
        arrivalTime: 0,
        stateTime: 0,
        scenarioSource: false,
        position: { x: 0, z: 0 },
        targetPosition: { x: 0, z: 0 },
        moveProgress: 1,
        hadWelcomeDrink: false,
        walkAwayOnArrival: false
      });
    }
    const def = EVENT_DEFS.find((d) => d.causeTag === 'strain')!;
    expect(eventMultiplier(def, s)).toBeCloseTo(strainMultiplier(loadOf(s)), 10);
  });
  it('both-cause is the product of both', () => {
    const s = inPeriod(1, 'dinner');
    const def = EVENT_DEFS.find((d) => d.causeTag === 'both')!;
    const expected =
      ignoranceMultiplier(competenceFor(def.competenceSource, s)) *
      strainMultiplier(loadOf(s));
    expect(eventMultiplier(def, s)).toBeCloseTo(expected, 10);
  });
});

describe('ambient rolls are gated by period', () => {
  it('produces zero events over 60 s of morning', () => {
    let s = makeInitialState(3);
    for (let i = 0; i < 300; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('morning');
    expect(s.eventStream.filter((e) => e.category === 'ambient')).toHaveLength(0);
  });
  it('produces at least one ambient event during a 10-min dinner with a weak team', () => {
    let s = reducer(makeInitialState(3), { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'SET_POLICY', patch: { trainingLevel: 1, staffCount: 2 } });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    for (let i = 0; i < 3000; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const ambient = s.eventStream.filter((e) => e.category === 'ambient');
    expect(ambient.length).toBeGreaterThan(0);
  });
});

describe('outcome events fire deterministically after RESOLVE', () => {
  it('schedules an immediate plain-voice outcome at ~0.5 s and emits it', () => {
    // ORDER 048 §2.2 rewired scenario outcomes: only ONE immediate
    // plain-voice line fires at t+0.5 s per resolve. The two observer-
    // voice outcomes at +6 s and +18 s were relocated out of during-
    // service (§2.3 observer voice → evening account only). See
    // reducer.ts resolveScenario for the current wiring.
    let s = reducer(makeInitialState(9), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 10
    });
    for (let i = 0; i < 3000 && s.scenario.phase !== 'subject'; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
    }
    expect(s.scenario.phase).toBe('subject');
    s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
    const resolveAt = s.simTime;
    s = reducer(s, { type: 'RESOLVE_SCENARIO', choice: 'A' });
    // Filter to scenario outcomes — a prep-carryover from mise en
    // place can also sit in pendingOutcomes (with flavor set).
    const scenarioOutcomes = s.pendingOutcomes.filter(
      (p) => p.flavor !== 'prep-carryover'
    );
    expect(scenarioOutcomes.length).toBeGreaterThanOrEqual(1);
    expect(scenarioOutcomes[0].dueAt).toBeCloseTo(resolveAt + 0.5, 5);

    // Advance ~1 s — the immediate outcome should have emitted.
    for (let i = 0; i < 6; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const outcomes1 = s.eventStream.filter((e) => e.category === 'outcome');
    expect(outcomes1.length).toBeGreaterThanOrEqual(1);
    // Zero remaining scenario outcomes; prep-carryover may still
    // be pending (fires 13 min after prep-end).
    const stillPendingScenarioAfter = s.pendingOutcomes.filter(
      (p) => p.flavor !== 'prep-carryover'
    );
    expect(stillPendingScenarioAfter).toHaveLength(0);
  });
});

describe('stream does not move capital', () => {
  it('capital values are untouched by ambient rolls over a full dinner', () => {
    // Well-staffed team so load stays below the agency-offer threshold.
    // Without this, a 10-min dinner accumulates enough strain to fire
    // an offer that expires unanswered and drops social capital by
    // AGENCY_DECLINE_SOCIAL_COST — a legitimate mechanic, but it
    // obscures the invariant this test is meant to pin (streams are
    // read-only against capitals).
    let s = makeInitialState(3);
    for (let i = 0; i < 3; i++) {
      s = reducer(s, { type: 'HIRE_TEAM_MEMBER', role: 'lärling' });
    }
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    const before = { ...s.capitals.values };
    // Tick through the whole service WITHOUT resolving any scenarios,
    // so only ambient rolls (+ their side effects) touch state. The
    // scenario auto-triggers but sits in 'subject' (no advance
    // dispatched), blocking further scenario fires.
    for (let i = 0; i < 3000; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const ambient = s.eventStream.filter((e) => e.category === 'ambient');
    expect(ambient.length).toBeGreaterThan(0);
    // Ambient events did not touch capitals directly (social/ecological).
    // Economic moved to state.cash under ORDER 050 §3 — checked
    // separately by the cash tests.
    for (const key of ['social', 'ecological'] as const) {
      expect(s.capitals.values[key]).toBe(before[key]);
    }
  });
});

describe('positive category — verksamhet som går bra', () => {
  it('calmnessMultiplier peaks near load 0 and decays as load rises', () => {
    expect(calmnessMultiplier(0)).toBeCloseTo(1.5, 5);
    expect(calmnessMultiplier(0.7)).toBeCloseTo(0.8, 5);
    expect(calmnessMultiplier(1.4)).toBeGreaterThan(0);
    expect(calmnessMultiplier(2)).toBe(0.05); // clamped floor
  });

  it('positiveEventProbabilityPerTick > 0 with a competent team at low load', () => {
    const s = inPeriod(1, 'dinner');
    // Fresh default team (competence ~0.55) + zero guests → high calmness.
    expect(positiveEventProbabilityPerTick(s)).toBeGreaterThan(0);
  });

  it('positiveEventProbabilityPerTick collapses under high load', () => {
    const s = inPeriod(1, 'dinner');
    // Fabricate a saturated room (load well above 1.5).
    for (let i = 0; i < 40; i++) {
      s.guests.push({
        id: `g${i}`,
        state: 'dining',
        satisfaction: 0.5,
        seatIndex: 0,
        arrivalTime: 0,
        stateTime: 0,
        scenarioSource: false,
        position: { x: 0, z: 0 },
        targetPosition: { x: 0, z: 0 },
        moveProgress: 1,
        hadWelcomeDrink: false,
        walkAwayOnArrival: false
      });
    }
    const rate = positiveEventProbabilityPerTick(s);
    // Should be dominated by the 0.05 calmness floor — very low.
    expect(rate).toBeLessThan(0.001);
  });

  it('a well-staffed calm dinner produces at least one positive event across seeds', () => {
    // Positive rolls are seed-sensitive (probability ~0.15/min at
    // baseline). Rather than pinning a specific seed and re-tuning
    // it whenever the rng path shifts, sweep a handful of seeds and
    // assert that at least one produces a positive event under a
    // clearly-calm-and-competent team.
    let anySawPositive = false;
    for (const seed of [11, 22, 33, 44, 55, 66, 77, 88]) {
      let s = makeInitialState(seed);
      for (let i = 0; i < 3; i++) {
        s = reducer(s, { type: 'HIRE_TEAM_MEMBER', role: 'lärling' });
      }
      s = reducer(s, { type: 'SKIP_LUNCH' });
      s = reducer(s, {
        type: 'OPEN_SERVICE',
        service: 'dinner',
        lengthMinutes: 15
      });
      for (let i = 0; i < 4500; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
      const positives = s.eventStream.filter((e) => e.category === 'positive');
      if (positives.length > 0) {
        anySawPositive = true;
        break;
      }
    }
    expect(anySawPositive).toBe(true);
  });
});

describe('repeat guard — no ambient sentence repeats within 4 min', () => {
  it('a full weak-team dinner produces no near-repeats inside REPEAT_GUARD_SEC', () => {
    let s = reducer(makeInitialState(3), { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'SET_POLICY', patch: { trainingLevel: 1, staffCount: 2 } });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 15
    });
    // Auto-resolve scenarios so outcomes fire too.
    for (let i = 0; i < 4500; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      if (s.scenario.phase === 'subject') {
        s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
        s = reducer(s, { type: 'RESOLVE_SCENARIO', choice: 'A' });
      }
    }
    // Walk the ambient stream in order; for each entry, ensure no
    // earlier entry with the SAME text sits within the guard window.
    // The guard falls back to the full bank when exhausted, so this
    // asserts the fall-back never triggered during this seeded run —
    // stronger than "the guard is present" and lets a future test
    // failure catch bank-shrinkage regressions.
    const ambient = s.eventStream.filter((e) => e.category === 'ambient');
    for (let i = 0; i < ambient.length; i++) {
      for (let j = 0; j < i; j++) {
        if (ambient[i].text === ambient[j].text) {
          const gap = ambient[i].at - ambient[j].at;
          expect(
            gap,
            `sentence "${ambient[i].text}" repeats at ${gap.toFixed(1)} s (< 240 s)`
          ).toBeGreaterThan(240);
        }
      }
    }
  });
});

describe('eventProbabilityPerTick stays inside [0, 1]', () => {
  it('handles extreme states without producing p > 1', () => {
    const s = inPeriod(1, 'dinner');
    s.policies.trainingLevel = 1;
    // Overload: 50 active guests.
    for (let i = 0; i < 50; i++) {
      s.guests.push({
        id: `g${i}`,
        state: 'dining',
        satisfaction: 1,
        seatIndex: 0,
        arrivalTime: 0,
        stateTime: 0,
        scenarioSource: false,
        position: { x: 0, z: 0 },
        targetPosition: { x: 0, z: 0 },
        moveProgress: 1,
        hadWelcomeDrink: false,
        walkAwayOnArrival: false
      });
    }
    for (const def of EVENT_DEFS) {
      const p = eventProbabilityPerTick(def, s);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
