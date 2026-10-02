// ORDER 294 — introduktionshyran (Vision Owner 2026-10-02): "första och andra
// veckan ligger på den gamla nivån (17 %), därefter full hyra (32 %)".

import { describe, expect, it } from 'vitest';
import { ECONOMY, RENT } from '../balance';
import { isIntroRentWeek, weeklyRentSek } from '../economy';

describe('ORDER 294 — introduktionshyran', () => {
  it('vecka 1 och 2 har introduktionshyra, från vecka 3 full hyra', () => {
    const normal = ECONOMY.normalWeeklyRevenueSek.vinbar;
    expect(RENT.introWeeks).toBe(2);
    expect(weeklyRentSek('vinbar', 1)).toBe(Math.round(RENT.introShareOfNormalWeeklyRevenue * normal));
    expect(weeklyRentSek('vinbar', 2)).toBe(Math.round(RENT.introShareOfNormalWeeklyRevenue * normal));
    expect(weeklyRentSek('vinbar', 3)).toBe(Math.round(RENT.shareOfNormalWeeklyRevenue * normal));
    expect(weeklyRentSek('vinbar')).toBe(Math.round(RENT.shareOfNormalWeeklyRevenue * normal));
    expect([1, 2, 3, 8].map(isIntroRentWeek)).toEqual([true, true, false, false]);
  });
});
