// ORDER 043 §4 — theme selection tests.
// (wagerPayout suite retired under ORDER 050 §5, 2026-08-10 —
// the theme-wager mechanic is gone; stake lives in activity effects.)
//
// Two categories:
//   1. Invariants — pure-function correctness (weight formula, cap logic).
//   2. Distribution — 100-draw simulations at several capital profiles,
//      to demonstrate the mechanic feels fair before any scenario
//      content is written. Reported to console during test runs.

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../model';
import { createRng } from '../../util/rng';
import type { SimulationState, SustainabilityKey } from '../../types';
import {
  CONSECUTIVE_THEME_CAP,
  THEMES,
  WEAK_FLOOR,
  drawNextTheme,
  isThemeCappedOut,
  weightForCapital,
  weightTable
} from '../themeSelection';

// ORDER 050 §3 (2026-08-10) — themeSelection now takes SimulationState;
// economic reads via cash. Helper injects the requested [0,1] readings
// into a base state (cash back-computed from the 4-week cap × weekly ops).
function stateFromCapitals(
  capitals: Record<SustainabilityKey, number>,
  themeHistory: readonly SustainabilityKey[] = []
): SimulationState {
  const s = makeInitialState(1);
  s.capitals.values.social = capitals.social;
  s.capitals.values.ecological = capitals.ecological;
  // Weekly ops mirrors cashReading.ts: max(team wages × 7, floor).
  const dailyWages = s.team.members
    .filter((m) => !m.isAgency)
    .reduce((sum, m) => sum + m.dailyCost, 0);
  const weekly = Math.max(dailyWages * 7, 40_000);
  s.cash = capitals.economic * 4 * weekly;
  s.capitals.themeHistory = [...themeHistory];
  return s;
}

// -------- invariants ------------------------------------------------------

describe('weightForCapital', () => {
  it('is 1 + WEAK_FLOOR at capital 0 and WEAK_FLOOR at capital 1', () => {
    expect(weightForCapital(0)).toBeCloseTo(1 + WEAK_FLOOR, 10);
    expect(weightForCapital(1)).toBeCloseTo(WEAK_FLOOR, 10);
  });

  it('is 0.25 + WEAK_FLOOR at capital 0.5 — the mid-point pivot', () => {
    expect(weightForCapital(0.5)).toBeCloseTo(0.25 + WEAK_FLOOR, 10);
  });

  it('produces the post-floor ~11.5:1 ratio between v=0.2 and v=0.9', () => {
    // Pre-floor the endpoint ratio was 64:1. The 0.05 floor lifts
    // v=0.9 from 0.01 to 0.06 and v=0.2 from 0.64 to 0.69, so the
    // ratio drops to 0.69 / 0.06 = 11.5. Strong-attraction preserved,
    // strong capitals no longer starved.
    const strong = weightForCapital(0.9);
    const weak = weightForCapital(0.2);
    expect(weak / strong).toBeCloseTo(11.5, 1);
  });

  it('a maximally-strong capital still has WEAK_FLOOR draw weight', () => {
    // Vision Owner rationale: knowledge that is never tested is
    // forgotten. The floor guarantees every capital keeps returning.
    expect(weightForCapital(1)).toBe(WEAK_FLOOR);
    expect(weightForCapital(1)).toBeGreaterThan(0);
  });

  it('clamps out-of-range inputs into [0, 1] before adding the floor', () => {
    expect(weightForCapital(-1)).toBeCloseTo(1 + WEAK_FLOOR, 10);
    expect(weightForCapital(2)).toBeCloseTo(WEAK_FLOOR, 10);
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
    const rows = weightTable(stateFromCapitals(capitals, history));
    const social = rows.find((r) => r.theme === 'social')!;
    expect(social.cappedOut).toBe(true);
    expect(social.weight).toBe(0);
    // Other themes still get their raw weight (0.25 + WEAK_FLOOR at v=0.5).
    const economic = rows.find((r) => r.theme === 'economic')!;
    expect(economic.cappedOut).toBe(false);
    expect(economic.weight).toBeCloseTo(0.25 + WEAK_FLOOR, 10);
  });
});

// -------- drawNextTheme invariants ----------------------------------------

describe('drawNextTheme', () => {
  it('always returns one of the three THEMES', () => {
    const state = stateFromCapitals({ economic: 0.5, social: 0.5, ecological: 0.5 });
    const rng = createRng(1);
    for (let i = 0; i < 20; i++) {
      const t = drawNextTheme(state, rng);
      expect(THEMES.includes(t)).toBe(true);
    }
  });

  it('never draws a theme capped by the recurrence rule', () => {
    // With a history of `social, social` and a subsequent draw, the
    // result must not be social — invariant regardless of capital state.
    // Deliberately weakest = social so pure weakness would pick it;
    // damping must override.
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const state = stateFromCapitals(
        { economic: 0.9, social: 0.1, ecological: 0.9 },
        ['social', 'social']
      );
      const t = drawNextTheme(state, rng);
      expect(t).not.toBe('social');
    }
  });

  it('gives every theme a shot when capitals are all equal', () => {
    // 300 draws with uniform capitals should hit all three themes.
    const rng = createRng(11);
    const count: Record<SustainabilityKey, number> = {
      economic: 0, social: 0, ecological: 0
    };
    const history: SustainabilityKey[] = [];
    for (let i = 0; i < 300; i++) {
      const state = stateFromCapitals(
        { economic: 0.5, social: 0.5, ecological: 0.5 },
        history.slice(-CONSECUTIVE_THEME_CAP)
      );
      const t = drawNextTheme(state, rng);
      history.push(t);
      count[t]++;
    }
    for (const t of THEMES) {
      expect(count[t]).toBeGreaterThan(50);
    }
  });

  it('is deterministic — same rng seed + same inputs = same output', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    for (let i = 0; i < 30; i++) {
      const s1 = stateFromCapitals({ economic: 0.3, social: 0.7, ecological: 0.5 });
      const s2 = stateFromCapitals({ economic: 0.3, social: 0.7, ecological: 0.5 });
      expect(drawNextTheme(s1, rng1)).toBe(drawNextTheme(s2, rng2));
    }
  });

  it('a weak capital is preferred over an equally-uncapped strong one', () => {
    // capitals: social weak (0.2), economic strong (0.9), ecological mid (0.55).
    const rng = createRng(2026);
    const count: Record<SustainabilityKey, number> = {
      economic: 0, social: 0, ecological: 0
    };
    const history: SustainabilityKey[] = [];
    for (let i = 0; i < 500; i++) {
      const state = stateFromCapitals(
        { economic: 0.9, social: 0.2, ecological: 0.55 },
        history.slice(-CONSECUTIVE_THEME_CAP)
      );
      const t = drawNextTheme(state, rng);
      history.push(t);
      count[t]++;
    }
    expect(count.social).toBeGreaterThan(250);
    expect(count.social).toBeLessThan(500);
    expect(count.economic).toBeGreaterThan(0);
  });
});

// -------- Distribution report --------------------------------------------
//
// Runs 100 draws per profile, averaged across 100 seeds — 10 000 total
// draws per profile. The reported numbers are the expected distribution
// (per 100 draws) plus the ±σ across seeds, so the table shows what
// the mechanic will typically feel like rather than a seed-artifact.

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
    const state = stateFromCapitals(
      profile.capitals,
      history.slice(-CONSECUTIVE_THEME_CAP)
    );
    const t = drawNextTheme(state, rng);
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

interface AveragedDistribution {
  mean: Record<SustainabilityKey, number>;
  stdev: Record<SustainabilityKey, number>;
  maxRunObserved: number;
}

function averageOverSeeds(
  profile: Profile,
  drawsPerSession: number,
  seeds: number
): AveragedDistribution {
  const perSeed: Distribution[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    perSeed.push(simulate(profile, seed, drawsPerSession));
  }
  const mean: Record<SustainabilityKey, number> = {
    economic: 0, social: 0, ecological: 0
  };
  const stdev: Record<SustainabilityKey, number> = {
    economic: 0, social: 0, ecological: 0
  };
  for (const theme of THEMES) {
    const vals = perSeed.map((d) => d.count[theme]);
    const m = vals.reduce((s, v) => s + v, 0) / vals.length;
    mean[theme] = m;
    const variance = vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
    stdev[theme] = Math.sqrt(variance);
  }
  const maxRunObserved = perSeed.reduce((m, d) => Math.max(m, d.maxRun), 0);
  return { mean, stdev, maxRunObserved };
}

describe('DISTRIBUTION REPORT — 100 draws × 100 seeds per profile', () => {
  it('logs the averaged distribution table for the Phase B gate', () => {
    const drawsPerSession = 100;
    const seeds = 100;
    const rows: string[] = [];
    rows.push('');
    rows.push('╔════════════════════════════════════════════════════════════════════════════╗');
    rows.push(`║  ORDER 043 §4 theme-selection distribution — ${drawsPerSession} draws × ${seeds} seeds       ║`);
    rows.push('║  Reported: mean count per 100 draws ± σ across seeds                       ║');
    rows.push(`║  Post-Vision-Owner floor: weight = (1 − v)² + ${WEAK_FLOOR}                             ║`);
    rows.push('╚════════════════════════════════════════════════════════════════════════════╝');
    for (const p of PROFILES) {
      const d = averageOverSeeds(p, drawsPerSession, seeds);
      const cell = (k: SustainabilityKey) =>
        `${d.mean[k].toFixed(1).padStart(5)}±${d.stdev[k].toFixed(1).padStart(3)}`;
      const line = `${p.name.padEnd(48)}  econ=${cell('economic')}  soc=${cell('social')}  eco=${cell('ecological')}  maxRun=${d.maxRunObserved}`;
      rows.push(line);
    }
    rows.push('');
    // eslint-disable-next-line no-console
    console.log(rows.join('\n'));

    // Pin the invariant that matters most: max consecutive run never
    // exceeds the cap, at any profile, across all 100 seeds.
    for (const p of PROFILES) {
      const d = averageOverSeeds(p, drawsPerSession, seeds);
      expect(
        d.maxRunObserved,
        `profile=${p.name}: some seed exceeded consecutive-recurrence cap`
      ).toBeLessThanOrEqual(CONSECUTIVE_THEME_CAP);
    }

    // Pin the invariant that motivates the floor: even a maximally-strong
    // capital (v=0.9 or 1.0) draws non-trivially often — no starvation.
    // At profile C (economic=0.9 with two mid capitals) the mean count
    // should be well above the pre-floor ~2 draws per 100 baseline.
    const c = averageOverSeeds(
      PROFILES.find((p) => p.name.startsWith('C'))!,
      drawsPerSession,
      seeds
    );
    expect(
      c.mean.economic,
      'floor failed: strong capital in profile C still starved'
    ).toBeGreaterThan(7);
  });
});
