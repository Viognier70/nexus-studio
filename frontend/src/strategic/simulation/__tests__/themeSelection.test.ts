// ORDER 043 §4 — theme selection + wager payout tests.
//
// Two categories:
//   1. Invariants — pure-function correctness (weight formula, cap
//      logic, payout signs, weak-win multiplier).
//   2. Distribution — 100-draw simulations at several capital profiles,
//      to demonstrate the mechanic feels fair before any scenario
//      content is written. Reported to console during test runs; the
//      committed report in the Phase B gate summarises them.

import { describe, expect, it } from 'vitest';
import { createRng } from '../../util/rng';
import type { SustainabilityKey, WagerState } from '../../types';
import {
  CONSECUTIVE_THEME_CAP,
  THEMES,
  drawNextTheme,
  isThemeCappedOut,
  wagerPayout,
  weightForCapital,
  weightTable
} from '../themeSelection';
import { WAGER_UNIT_STAKE, WAGER_WEAK_WIN_MULTIPLIER } from '../reducer';

// -------- invariants ------------------------------------------------------

describe('weightForCapital', () => {
  it('is 1.0 at capital 0 and 0.0 at capital 1', () => {
    expect(weightForCapital(0)).toBe(1);
    expect(weightForCapital(1)).toBe(0);
  });

  it('is 0.25 at capital 0.5 — the mid-point pivot', () => {
    expect(weightForCapital(0.5)).toBe(0.25);
  });

  it('produces the promised 64:1 ratio between v=0.2 and v=0.9', () => {
    const strong = weightForCapital(0.9);
    const weak = weightForCapital(0.2);
    expect(weak / strong).toBeCloseTo(64, 0);
  });

  it('clamps out-of-range inputs into [0, 1]', () => {
    expect(weightForCapital(-1)).toBe(1); // -1 → 0 → weight 1
    expect(weightForCapital(2)).toBe(0);  //  2 → 1 → weight 0
  });

  it('is monotonically decreasing over the [0, 1] range', () => {
    let last = Infinity;
    for (let v = 0; v <= 1; v += 0.1) {
      const w = weightForCapital(v);
      expect(w).toBeLessThanOrEqual(last);
      last = w;
    }
  });
});

describe('isThemeCappedOut', () => {
  it('false when history is shorter than the cap', () => {
    expect(isThemeCappedOut([], 'social')).toBe(false);
    expect(isThemeCappedOut(['social'], 'social')).toBe(false);
  });

  it('true when the last CONSECUTIVE_THEME_CAP entries are all the target', () => {
    const tail = new Array(CONSECUTIVE_THEME_CAP).fill('social') as SustainabilityKey[];
    expect(isThemeCappedOut(tail, 'social')).toBe(true);
    expect(isThemeCappedOut(tail, 'economic')).toBe(false);
  });

  it('false when the tail is a mix', () => {
    expect(isThemeCappedOut(['social', 'social', 'economic'], 'social')).toBe(false);
    expect(isThemeCappedOut(['social', 'economic'], 'social')).toBe(false);
  });
});

describe('weightTable', () => {
  it('marks the capped-out theme with weight 0 and cappedOut true', () => {
    const capitals = { economic: 0.5, social: 0.5, ecological: 0.5 };
    const history = new Array(CONSECUTIVE_THEME_CAP).fill('social') as SustainabilityKey[];
    const rows = weightTable(capitals, history);
    const social = rows.find((r) => r.theme === 'social')!;
    expect(social.cappedOut).toBe(true);
    expect(social.weight).toBe(0);
    // Other themes still get their raw weight.
    const economic = rows.find((r) => r.theme === 'economic')!;
    expect(economic.cappedOut).toBe(false);
    expect(economic.weight).toBe(0.25);
  });
});

// -------- drawNextTheme invariants ----------------------------------------

describe('drawNextTheme', () => {
  it('always returns one of the three THEMES', () => {
    const capitals = { economic: 0.5, social: 0.5, ecological: 0.5 };
    const rng = createRng(1);
    for (let i = 0; i < 20; i++) {
      const t = drawNextTheme(capitals, [], rng);
      expect(THEMES.includes(t)).toBe(true);
    }
  });

  it('never draws a theme capped by the recurrence rule', () => {
    // With a history of `social, social` and a subsequent draw, the
    // result must not be social — invariant regardless of capital state.
    const capitals = { economic: 0.9, social: 0.1, ecological: 0.9 };
    // Deliberately weakest = social so pure weakness would pick it;
    // damping must override.
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const history: SustainabilityKey[] = ['social', 'social'];
      const t = drawNextTheme(capitals, history, rng);
      expect(t).not.toBe('social');
    }
  });

  it('gives every theme a shot when capitals are all equal', () => {
    // 300 draws with uniform capitals should hit all three themes.
    const capitals = { economic: 0.5, social: 0.5, ecological: 0.5 };
    const rng = createRng(11);
    const count: Record<SustainabilityKey, number> = {
      economic: 0, social: 0, ecological: 0
    };
    const history: SustainabilityKey[] = [];
    for (let i = 0; i < 300; i++) {
      const t = drawNextTheme(capitals, history.slice(-CONSECUTIVE_THEME_CAP), rng);
      history.push(t);
      count[t]++;
    }
    // Each theme should draw at least ~25% of the time.
    for (const t of THEMES) {
      expect(count[t]).toBeGreaterThan(50);
    }
  });

  it('is deterministic — same rng seed + same inputs = same output', () => {
    const capitals = { economic: 0.3, social: 0.7, ecological: 0.5 };
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    for (let i = 0; i < 30; i++) {
      expect(drawNextTheme(capitals, [], rng1)).toBe(
        drawNextTheme(capitals, [], rng2)
      );
    }
  });

  it('a weak capital is preferred over an equally-uncapped strong one', () => {
    // capitals: social weak (0.2), economic strong (0.9), ecological mid (0.55).
    // Over 500 draws, social should dominate (roughly 60%+ share).
    const capitals = { economic: 0.9, social: 0.2, ecological: 0.55 };
    const rng = createRng(2026);
    const count: Record<SustainabilityKey, number> = {
      economic: 0, social: 0, ecological: 0
    };
    const history: SustainabilityKey[] = [];
    for (let i = 0; i < 500; i++) {
      const t = drawNextTheme(capitals, history.slice(-CONSECUTIVE_THEME_CAP), rng);
      history.push(t);
      count[t]++;
    }
    // Social's raw weight is 0.64 out of ~0.9525 total — expected share
    // roughly 67%, damped by the recurrence cap that fires every time
    // social hits twice in a row. Actual share should be well over 50%
    // but well under 100%.
    expect(count.social).toBeGreaterThan(250);
    expect(count.social).toBeLessThan(500);
    // Strong capital should still see draws — no capital is starved.
    expect(count.economic).toBeGreaterThan(0);
  });
});

// -------- wagerPayout invariants ------------------------------------------

describe('wagerPayout', () => {
  const social: SustainabilityKey = 'social';
  const economic: SustainabilityKey = 'economic';

  function makeWager(capital: SustainabilityKey): WagerState {
    return { capital, placedAt: 100, amount: WAGER_UNIT_STAKE };
  }

  it('no_wager when the standing wager is null', () => {
    const r = wagerPayout(social, null, 0.5);
    expect(r.outcome).toBe('no_wager');
    expect(r.delta).toBe(0);
    expect(r.targetCapital).toBeNull();
  });

  it('win at standard multiplier when capital was above the weak threshold', () => {
    const r = wagerPayout(social, makeWager(social), 0.6);
    expect(r.outcome).toBe('win');
    expect(r.multiplier).toBe(1);
    expect(r.delta).toBeCloseTo(WAGER_UNIT_STAKE, 10);
    expect(r.targetCapital).toBe(social);
  });

  it('win at weak-win multiplier when capital was at or below the weak threshold', () => {
    const r = wagerPayout(social, makeWager(social), 0.4);
    expect(r.outcome).toBe('win');
    expect(r.multiplier).toBe(WAGER_WEAK_WIN_MULTIPLIER);
    expect(r.delta).toBeCloseTo(WAGER_UNIT_STAKE * WAGER_WEAK_WIN_MULTIPLIER, 10);
  });

  it('loss loses exactly the staked amount regardless of capital value', () => {
    const r = wagerPayout(economic, makeWager(social), 0.2);
    expect(r.outcome).toBe('loss');
    expect(r.multiplier).toBe(1);
    expect(r.delta).toBe(-WAGER_UNIT_STAKE);
    expect(r.targetCapital).toBe(social); // loss deducted from what was staked
  });
});

// -------- Distribution report --------------------------------------------
//
// Runs the "100 draws at several capital profiles" scenario the Vision
// Owner asked for as the Phase B gate. Results log to console during
// the test run so the exact numbers are captured for reporting.

interface Profile {
  name: string;
  capitals: Record<SustainabilityKey, number>;
}

const PROFILES: readonly Profile[] = [
  {
    name: 'A — balanced (0.5 / 0.5 / 0.5)',
    capitals: { economic: 0.5, social: 0.5, ecological: 0.5 }
  },
  {
    name: 'B — economic weak (0.2 / 0.55 / 0.55)',
    capitals: { economic: 0.2, social: 0.55, ecological: 0.55 }
  },
  {
    name: 'C — economic strong (0.9 / 0.55 / 0.55)',
    capitals: { economic: 0.9, social: 0.55, ecological: 0.55 }
  },
  {
    name: 'D — two weak one strong (0.2 / 0.2 / 0.9)',
    capitals: { economic: 0.2, social: 0.2, ecological: 0.9 }
  },
  {
    name: 'E — all critical (0.15 / 0.15 / 0.15)',
    capitals: { economic: 0.15, social: 0.15, ecological: 0.15 }
  },
  {
    name: 'F — all strong (0.9 / 0.9 / 0.9)',
    capitals: { economic: 0.9, social: 0.9, ecological: 0.9 }
  },
  {
    name: 'G — after the weak spirals into recovery (0.35 / 0.55 / 0.55)',
    capitals: { economic: 0.35, social: 0.55, ecological: 0.55 }
  }
];

interface Distribution {
  count: Record<SustainabilityKey, number>;
  maxRun: number; // longest consecutive-same run observed
}

function simulate(profile: Profile, seed: number, draws: number): Distribution {
  const rng = createRng(seed);
  const count: Record<SustainabilityKey, number> = {
    economic: 0, social: 0, ecological: 0
  };
  const history: SustainabilityKey[] = [];
  let maxRun = 0;
  let currentRun = 0;
  let currentTheme: SustainabilityKey | null = null;
  for (let i = 0; i < draws; i++) {
    const t = drawNextTheme(
      profile.capitals,
      history.slice(-CONSECUTIVE_THEME_CAP),
      rng
    );
    history.push(t);
    count[t]++;
    if (t === currentTheme) {
      currentRun++;
    } else {
      currentTheme = t;
      currentRun = 1;
    }
    if (currentRun > maxRun) maxRun = currentRun;
  }
  return { count, maxRun };
}

describe('DISTRIBUTION REPORT — 100 draws per profile, deterministic seed', () => {
  it('logs the distribution table for the Phase B gate', () => {
    const rows: string[] = [];
    rows.push('');
    rows.push('╔════════════════════════════════════════════════════════════════╗');
    rows.push('║  ORDER 043 §4 theme-selection distribution (100 draws, seed=1) ║');
    rows.push('╚════════════════════════════════════════════════════════════════╝');
    for (const p of PROFILES) {
      const d = simulate(p, 1, 100);
      const line = `${p.name.padEnd(48)}  econ=${String(d.count.economic).padStart(3)}  soc=${String(d.count.social).padStart(3)}  eco=${String(d.count.ecological).padStart(3)}  maxRun=${d.maxRun}`;
      rows.push(line);
    }
    rows.push('');
    // eslint-disable-next-line no-console
    console.log(rows.join('\n'));

    // Pin the invariant that matters most: max consecutive run never
    // exceeds the cap, at any profile, at any seed.
    for (const seed of [1, 2, 3, 42, 2026]) {
      for (const p of PROFILES) {
        const d = simulate(p, seed, 200);
        expect(
          d.maxRun,
          `profile=${p.name} seed=${seed} exceeded consecutive-recurrence cap`
        ).toBeLessThanOrEqual(CONSECUTIVE_THEME_CAP);
      }
    }
  });
});
