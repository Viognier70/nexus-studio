import { describe, expect, it } from 'vitest';
import {
  INGREDIENT_COST_PER_MIN,
  INGREDIENT_MULT,
  PRICE_ARRIVAL_MULT,
  REVENUE_BASE,
  SERVICE_ARRIVAL_MULT,
  SERVICE_DURATION_MULT,
  STAFF_COST_PER_MIN,
  TASK_BASE_TICKS,
  costPerSimMinute,
  revenuePerGuest,
  taskDurationTicks
} from '../economics';
import { DEFAULT_POLICIES } from '../model';
import type { Policies } from '../../types';

function policies(overrides: Partial<Policies> = {}): Policies {
  return { ...DEFAULT_POLICIES, ...overrides };
}

describe('economics constants', () => {
  it('REVENUE_BASE is monotonically increasing across pricing tiers', () => {
    expect(REVENUE_BASE['låg']).toBeLessThan(REVENUE_BASE['medel']);
    expect(REVENUE_BASE['medel']).toBeLessThan(REVENUE_BASE['hög']);
  });

  it('INGREDIENT_MULT climbs with tier and INGREDIENT_COST_PER_MIN with it', () => {
    expect(INGREDIENT_MULT['grund']).toBeLessThan(INGREDIENT_MULT['utvald']);
    expect(INGREDIENT_MULT['utvald']).toBeLessThan(INGREDIENT_MULT['premium']);
    expect(INGREDIENT_COST_PER_MIN['grund']).toBeLessThan(INGREDIENT_COST_PER_MIN['utvald']);
    expect(INGREDIENT_COST_PER_MIN['utvald']).toBeLessThan(INGREDIENT_COST_PER_MIN['premium']);
  });

  it('cheaper prices attract more arrivals; formell service attracts fewer', () => {
    expect(PRICE_ARRIVAL_MULT['låg']).toBeGreaterThan(PRICE_ARRIVAL_MULT['medel']);
    expect(PRICE_ARRIVAL_MULT['medel']).toBeGreaterThan(PRICE_ARRIVAL_MULT['hög']);
    expect(SERVICE_ARRIVAL_MULT['vardaglig']).toBeGreaterThan(SERVICE_ARRIVAL_MULT['formell']);
  });

  it('formell service takes longer per task than vardaglig', () => {
    expect(SERVICE_DURATION_MULT['formell']).toBeGreaterThan(SERVICE_DURATION_MULT['vardaglig']);
  });
});

describe('revenuePerGuest', () => {
  it('multiplies price base by ingredient multiplier', () => {
    const p = policies({ pricing: 'medel', ingredientTier: 'utvald' });
    expect(revenuePerGuest(p)).toBeCloseTo(REVENUE_BASE['medel'] * INGREDIENT_MULT['utvald'], 5);
  });

  it('premium ingredients yield more than base at the same price', () => {
    const base = revenuePerGuest(policies({ pricing: 'medel', ingredientTier: 'grund' }));
    const premium = revenuePerGuest(policies({ pricing: 'medel', ingredientTier: 'premium' }));
    expect(premium).toBeGreaterThan(base);
  });

  it('high price yields more than low price at the same ingredient tier', () => {
    const low = revenuePerGuest(policies({ pricing: 'låg' }));
    const high = revenuePerGuest(policies({ pricing: 'hög' }));
    expect(high).toBeGreaterThan(low);
  });
});

describe('costPerSimMinute', () => {
  it('sums staff cost, ingredient cost, and 0.6 * waste', () => {
    const p = policies({ staffCount: 3, ingredientTier: 'utvald' });
    const waste = 4;
    const expected =
      STAFF_COST_PER_MIN * 3 + INGREDIENT_COST_PER_MIN['utvald'] + 0.6 * waste;
    expect(costPerSimMinute(p, waste)).toBeCloseTo(expected, 5);
  });

  it('scales linearly with staffCount', () => {
    const p2 = policies({ staffCount: 2 });
    const p4 = policies({ staffCount: 4 });
    const gap = costPerSimMinute(p4, 0) - costPerSimMinute(p2, 0);
    expect(gap).toBeCloseTo(2 * STAFF_COST_PER_MIN, 5);
  });

  it('waste of 0 leaves cost unaffected by the waste term', () => {
    const p = policies();
    expect(costPerSimMinute(p, 0)).toBeCloseTo(
      STAFF_COST_PER_MIN * p.staffCount + INGREDIENT_COST_PER_MIN[p.ingredientTier],
      5
    );
  });
});

describe('taskDurationTicks', () => {
  it('respects a minimum of 2 ticks even for pathologically small combinations', () => {
    // greet base = 4, training=3 → *0.7, service=vardaglig → *0.9
    // 4 * 0.7 * 0.9 = 2.52 → rounds to 3, still > 2.
    const p = policies({ trainingLevel: 3, service: 'vardaglig' });
    expect(taskDurationTicks(p, 'greet')).toBeGreaterThanOrEqual(2);
    // A hypothetical unknown task uses base 8; ensure the floor is honoured.
    expect(taskDurationTicks(p, 'nonexistent-task')).toBeGreaterThanOrEqual(2);
  });

  it('training level 3 is faster than training level 1 for the same task', () => {
    const beginner = policies({ trainingLevel: 1 });
    const expert = policies({ trainingLevel: 3 });
    expect(taskDurationTicks(beginner, 'serve')).toBeGreaterThan(
      taskDurationTicks(expert, 'serve')
    );
  });

  it('formell service is slower than vardaglig for the same task', () => {
    const casual = policies({ service: 'vardaglig' });
    const formal = policies({ service: 'formell' });
    expect(taskDurationTicks(formal, 'serve')).toBeGreaterThan(
      taskDurationTicks(casual, 'serve')
    );
  });

  it('follows base * (1.6 - 0.3*training) * concept, rounded', () => {
    // serve base = 14, training=2 → *1.0, vardaglig → *0.9 = 12.6 → 13
    const p = policies({ trainingLevel: 2, service: 'vardaglig' });
    expect(taskDurationTicks(p, 'serve')).toBe(
      Math.max(2, Math.round(TASK_BASE_TICKS['serve'] * 1.0 * SERVICE_DURATION_MULT['vardaglig']))
    );
  });

  it('unknown task types fall back to base 8', () => {
    const p = policies({ trainingLevel: 2, service: 'vardaglig' });
    // base 8 * 1.0 * 0.9 = 7.2 → 7
    expect(taskDurationTicks(p, 'made-up-task')).toBe(
      Math.max(2, Math.round(8 * 1.0 * SERVICE_DURATION_MULT['vardaglig']))
    );
  });
});
