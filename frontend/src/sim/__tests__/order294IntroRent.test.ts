// ORDER 294 — introduktionshyran (Vision Owner 2026-10-02): "första och andra
// veckan ligger på den gamla nivån (17 %), därefter full hyra (32 %)".
// ORDER 303c (Anders 2026-10-05) — ingen hyra de fyra första veckorna.

import { describe, expect, it } from 'vitest';
import { ECONOMY, RENT } from '../balance';
import { isIntroRentWeek, weeklyRentSek } from '../economy';

describe('ORDER 294 — introduktionshyran', () => {
  it('veckorna 1–4 har introduktionshyra (ingen hyra), från vecka 5 full hyra', () => {
    const normal = ECONOMY.normalWeeklyRevenueSek.vinbar;
    expect(RENT.introWeeks).toBe(4);
    expect(RENT.introShareOfNormalWeeklyRevenue).toBe(0);
    for (const w of [1, 2, 3, 4]) expect(weeklyRentSek('vinbar', w)).toBe(0);
    expect(weeklyRentSek('vinbar', 5)).toBe(Math.round(RENT.shareOfNormalWeeklyRevenue * normal));
    expect(weeklyRentSek('vinbar')).toBe(Math.round(RENT.shareOfNormalWeeklyRevenue * normal));
    expect([1, 4, 5, 8].map(isIntroRentWeek)).toEqual([true, true, false, false]);
  });
});
