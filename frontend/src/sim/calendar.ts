// ORDER 263 (Nexus v1 etapp 1) — kalendern.
//
// Speldesign > Tiden: dagen har tre faser, veckan sex servicedagar och
// en stängd söndag, säsongen åtta veckor med högtider i vecka 1, 3, 5
// och 8. Allt här härleds ur `day.dayNumber` (1 = måndag vecka 1 i
// säsong 1), så kalendern har inget eget tillstånd som kan glida isär
// från simuleringen och inget extra att spara.
//
// Alla tal kommer från `balance.ts`. Filen får inte innehålla andra
// talvärden än 0 och 1 (`__tests__/balance.test.ts`).

import {
  DAY,
  HOLIDAYS,
  INTRODUCTION,
  SEASON,
  WEEK,
  type Holiday,
  type Weekday
} from './balance';

export type DayPhase = 'morning' | 'service' | 'evening';

export interface CalendarDay {
  dayNumber: number;
  // 1-indexerad säsong; säsong 2 börjar efter vecka 8.
  season: number;
  // Vecka i säsongen, 1..SEASON.weeks.
  week: number;
  // Vecka räknad från spelets början, 1.. (för sparkopior).
  absoluteWeek: number;
  weekday: Weekday;
  isServiceDay: boolean;
  // Högtiden som gäller just den här dagen, annars null.
  holiday: Holiday | null;
  // Högtiden som infaller någon gång den här veckan, annars null.
  holidayThisWeek: Holiday | null;
  scheduleSlots: number;
  guestFactor: number;
  isLastDayOfWeek: boolean;
  isLastDayOfSeason: boolean;
}

export function calendarFor(dayNumber: number): CalendarDay {
  const dayIndex = Math.max(0, dayNumber - 1);
  const weekIndex = Math.floor(dayIndex / WEEK.daysPerWeek);
  const weekday = WEEK.weekdays[dayIndex % WEEK.daysPerWeek];
  const week = (weekIndex % SEASON.weeks) + 1;
  const season = Math.floor(weekIndex / SEASON.weeks) + 1;
  const isServiceDay = weekday !== WEEK.closedDay;
  const holidayThisWeek = HOLIDAYS.list.find((h) => h.week === week) ?? null;
  const holiday = holidayThisWeek && holidayThisWeek.days.includes(weekday) ? holidayThisWeek : null;
  const isFirstWeekOfGame = season === 1 && week === 1;
  const guestFactor = isServiceDay
    ? WEEK.guestFactor[weekday] *
      (holiday ? holiday.guestFactor : 1) *
      (isFirstWeekOfGame ? INTRODUCTION.firstWeekGuestFactor : 1)
    : 0;
  const lastWeekday = WEEK.weekdays[WEEK.weekdays.length - 1];
  return {
    dayNumber,
    season,
    week,
    absoluteWeek: weekIndex + 1,
    weekday,
    isServiceDay,
    holiday,
    holidayThisWeek,
    scheduleSlots: isServiceDay ? DAY.scheduleSlots : DAY.sundayScheduleSlots,
    guestFactor,
    isLastDayOfWeek: weekday === lastWeekday,
    isLastDayOfSeason: weekday === lastWeekday && week === SEASON.weeks
  };
}

// Den första dagen i en given vecka (1-indexerad, räknad från spelets början).
export function firstDayOfWeek(absoluteWeek: number): number {
  return (absoluteWeek - 1) * WEEK.daysPerWeek + 1;
}
