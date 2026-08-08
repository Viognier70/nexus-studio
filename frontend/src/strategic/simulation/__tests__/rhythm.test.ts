// ORDER 043 Addendum A service rhythm curve — invariants.
//
// Pinned:
//   * Curve shape: opening (0-15 %) low, buildup (15-40 %) rising,
//     rush (40-70 %) peak, decline (70-100 %) falling.
//   * Values clamped in the [0, 1] fraction domain.
//   * Endpoints: mult(0) < 1, mult(1) < 1, mult(~0.55) > 1.8.
//   * serviceFraction returns null outside service, 0 during prep,
//     grows monotonically after prep.

import { describe, expect, it } from 'vitest';
import {
  serviceFraction,
  serviceRhythmMultiplier,
  currentRhythmMultiplier
} from '../rhythm';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';

describe('serviceRhythmMultiplier — shape', () => {
  it('opening is quiet (mult < 1 in the first 15 %)', () => {
    for (const f of [0, 0.05, 0.14]) {
      expect(serviceRhythmMultiplier(f)).toBeLessThan(1);
    }
  });

  it('buildup rises through 1.0 into the rush', () => {
    expect(serviceRhythmMultiplier(0.15)).toBeCloseTo(0.9, 5);
    expect(serviceRhythmMultiplier(0.40)).toBeCloseTo(1.5, 5);
  });

  it('rush peaks near f = 0.55 with mult > 1.8', () => {
    expect(serviceRhythmMultiplier(0.55)).toBeGreaterThan(1.8);
  });

  it('decline falls back below 1 by the end of service', () => {
    expect(serviceRhythmMultiplier(0.9)).toBeLessThan(1);
    expect(serviceRhythmMultiplier(1.0)).toBeCloseTo(0.4, 5);
  });

  it('clamps out-of-range fractions to [0, 1]', () => {
    expect(serviceRhythmMultiplier(-0.5)).toBe(serviceRhythmMultiplier(0));
    expect(serviceRhythmMultiplier(1.5)).toBe(serviceRhythmMultiplier(1));
  });

  it('is continuous at boundary points (no big jumps)', () => {
    // Value just below and just above each phase transition should
    // be within ~0.1 of each other.
    for (const boundary of [0.15, 0.40, 0.70]) {
      const before = serviceRhythmMultiplier(boundary - 0.001);
      const after = serviceRhythmMultiplier(boundary + 0.001);
      expect(Math.abs(after - before)).toBeLessThan(0.1);
    }
  });
});

describe('serviceFraction — outside vs inside service', () => {
  it('returns null when not in a service period', () => {
    const s = makeInitialState(1);
    expect(serviceFraction(s)).toBeNull();
  });

  it('returns 0 during the prep window (rhythm has not started)', () => {
    let s = reducer(makeInitialState(1), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 10
    });
    // Tick a little into prep (say 30 s in).
    for (let i = 0; i < 150; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(serviceFraction(s)).toBe(0);
  });

  it('grows monotonically after prep ends', () => {
    let s = reducer(makeInitialState(1), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 10
    });
    // Advance past prep (2 min = 600 ticks) plus a bit.
    for (let i = 0; i < 700; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const f1 = serviceFraction(s)!;
    for (let i = 0; i < 500; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const f2 = serviceFraction(s)!;
    expect(f1).toBeGreaterThan(0);
    expect(f2).toBeGreaterThan(f1);
  });
});

describe('currentRhythmMultiplier — integration convenience', () => {
  it('is 1.0 outside a running service (no rhythm applies)', () => {
    const s = makeInitialState(1);
    expect(currentRhythmMultiplier(s)).toBe(1.0);
  });

  it('drops below 1 during opening of a running service', () => {
    let s = reducer(makeInitialState(1), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 30
    });
    // Advance past prep + a small bit into opening.
    for (let i = 0; i < 650; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(currentRhythmMultiplier(s)).toBeLessThan(1);
  });
});
