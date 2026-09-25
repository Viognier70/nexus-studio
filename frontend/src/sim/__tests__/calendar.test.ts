// ORDER 263 (Nexus v1 etapp 1) — kalendern mot speldesignen > Tiden.

import { describe, expect, it } from 'vitest';
import { calendarFor, firstDayOfWeek } from '../calendar';
import { DAY, HOLIDAYS, INTRODUCTION, SEASON, WEEK } from '../balance';

describe('ORDER 263 — kalendern', () => {
  it('dag 1 är måndag vecka 1 i säsong 1, dag 7 är söndag', () => {
    expect(calendarFor(1)).toMatchObject({ weekday: 'mon', week: 1, season: 1, isServiceDay: true });
    expect(calendarFor(7)).toMatchObject({ weekday: 'sun', week: 1, isServiceDay: false, isLastDayOfWeek: true });
    expect(calendarFor(8)).toMatchObject({ weekday: 'mon', week: 2, absoluteWeek: 2 });
  });

  it('veckan har sex servicedagar och en stängd söndag', () => {
    const week = [1, 2, 3, 4, 5, 6, 7].map(calendarFor);
    expect(week.filter((d) => d.isServiceDay)).toHaveLength(WEEK.serviceDays);
    expect(week.find((d) => !d.isServiceDay)?.weekday).toBe('sun');
  });

  it('två schemaplatser på vardagar, fyra på söndag', () => {
    expect(calendarFor(3).scheduleSlots).toBe(DAY.scheduleSlots);
    expect(calendarFor(7).scheduleSlots).toBe(DAY.sundayScheduleSlots);
  });

  it('säsongen är åtta veckor; dag 57 är måndag vecka 1 i säsong 2', () => {
    const last = SEASON.weeks * WEEK.daysPerWeek;
    expect(calendarFor(last)).toMatchObject({ week: SEASON.weeks, isLastDayOfSeason: true });
    expect(calendarFor(last + 1)).toMatchObject({ week: 1, season: 2, weekday: 'mon' });
  });

  it('högtiderna ligger i vecka 1, 3, 5 och 8 på sina dagar', () => {
    for (const h of HOLIDAYS.list) {
      const monday = firstDayOfWeek(h.week);
      const days = [0, 1, 2, 3, 4, 5, 6].map((i) => calendarFor(monday + i));
      expect(days.every((d) => d.holidayThisWeek?.id === h.id)).toBe(true);
      expect(days.filter((d) => d.holiday?.id === h.id).map((d) => d.weekday)).toEqual([...h.days]);
    }
    expect(calendarFor(firstDayOfWeek(2)).holidayThisWeek).toBeNull();
  });

  it('gästfaktorn: fredag tyngre än måndag, söndag noll, första veckan lägre', () => {
    const w2 = firstDayOfWeek(2);
    expect(calendarFor(w2 + 4).guestFactor).toBeGreaterThan(calendarFor(w2).guestFactor);
    expect(calendarFor(w2 + 6).guestFactor).toBe(0);
    expect(calendarFor(1).guestFactor).toBeCloseTo(WEEK.guestFactor.mon * INTRODUCTION.firstWeekGuestFactor);
    // Första veckan gäller bara säsong 1.
    const s2 = SEASON.weeks * WEEK.daysPerWeek + 1;
    expect(calendarFor(s2).guestFactor).toBeCloseTo(WEEK.guestFactor.mon);
  });

  it('högtidens faktor multipliceras in på högtidens dagar', () => {
    const w3fri = firstDayOfWeek(3) + 4;
    const h = HOLIDAYS.list.find((x) => x.week === 3)!;
    expect(calendarFor(w3fri).guestFactor).toBeCloseTo(WEEK.guestFactor.fri * h.guestFactor);
  });
});
