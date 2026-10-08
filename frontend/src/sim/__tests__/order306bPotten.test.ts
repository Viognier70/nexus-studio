// ORDER 306b A2 (Anders 2026-10-07, rättelse) — stegen är analys → upplevelse → handling:
// episteme, phronesis, techne. Potten 1 → 3 → 7 bokförs 1 på episteme, +2 på phronesis och +4
// på techne; ett ok-svar lämnar potten, och halvt grepp i steg 3 halverar den (uppåt).

import { describe, expect, it } from 'vitest';
import { growPot, potCredits } from '../incidents';
import { CONSEQUENCES, INCIDENTS } from '../balance';

describe('ORDER 306b — potten i formen analys → upplevelse → handling', () => {
  const [e, p, t] = INCIDENTS.stepAxesTriad;

  it('stegen är episteme, phronesis och techne', () => {
    expect(INCIDENTS.stepAxesTriad).toEqual(['episteme', 'phronesis', 'techne']);
  });

  it('steg 2 bokförs på phronesis och steg 3 på techne: 1, +2, +4', () => {
    const s1 = growPot(null, e, 'full', 0, null);
    const s2 = growPot(s1, p, 'full', 0, null);
    const s3 = growPot(s2, t, 'full', 0, null);
    expect(s1.credits).toEqual({ episteme: 1 });
    expect(s2.credits).toEqual({ episteme: 1, phronesis: 2 });
    expect(s3.credits).toEqual({ episteme: 1, phronesis: 2, techne: 4 });
    expect([potCredits(s1), potCredits(s2), potCredits(s3)]).toEqual([1, 3, 7]);
  });

  it('ok lämnar potten; halvt grepp i steg 3 ger 3 × halfGrip, uppåt, alltså 2', () => {
    const s2 = growPot(growPot(null, e, 'full', 0, null), p, 'full', 0, null);
    expect(potCredits(growPot(s2, t, 'ok', 0, null))).toBe(3);
    expect(CONSEQUENCES.halfGrip).toBe(0.5);
    expect(potCredits(growPot(s2, t, 'half', 0, null))).toBe(2);
  });
});
