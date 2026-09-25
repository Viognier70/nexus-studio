// ORDER 263 (Nexus v1 etapp 1) — en hel vecka i simuleringen.
//
// Speldesign > Tiden: dagen har tre faser (morgon, service, kväll),
// veckan sex servicedagar och en stängd söndag med fyra schemaplatser.
// Testet spelar från måndag morgon vecka 1 till måndag morgon vecka 2
// med samma åtgärder som gränssnittet skickar (START_SERVICE,
// CLOSE_DAY) och hävdar fasordningen dag för dag.

import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import { calendarFor, type DayPhase } from '../../../sim/calendar';
import { SERVICE, WEEK } from '../../../sim/balance';
import { arrivalProbability } from '../arrivals';
import type { DayPeriod, SimulationState } from '../../types';

// Samma avbildning som gränssnittet använder (ui/DayBadge).
function phaseOf(period: DayPeriod): DayPhase {
  if (period === 'lunch' || period === 'dinner') return 'service';
  if (period === 'evening') return 'evening';
  return 'morning';
}

function tickUntil(s: SimulationState, done: (s: SimulationState) => boolean, maxTicks = 20000): SimulationState {
  for (let i = 0; i < maxTicks && !done(s); i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
  return s;
}

function playDay(s: SimulationState): { s: SimulationState; phases: DayPhase[] } {
  const day = s.day.dayNumber;
  const phases: DayPhase[] = [phaseOf(s.day.period)];
  const note = (x: SimulationState) => {
    const p = phaseOf(x.day.period);
    if (phases[phases.length - 1] !== p) phases.push(p);
  };
  if (calendarFor(day).isServiceDay) {
    s = reducer(s, { type: 'START_SERVICE' });
    note(s);
    expect(s.day.period).toBe('dinner');
    expect(s.day.currentServiceLengthMinutes).toBe(SERVICE.simMinutes);
    s = tickUntil(s, (x) => x.day.period === 'evening');
  } else {
    s = reducer(s, { type: 'CLOSE_DAY' });
  }
  note(s);
  s = tickUntil(s, (x) => x.day.dayNumber === day + 1);
  s = tickUntil(s, (x) => x.day.period === 'morning');
  note(s);
  return { s, phases };
}

describe('ORDER 263 — en hel vecka', () => {
  it('måndag morgon vecka 1 → söndag → måndag morgon vecka 2', () => {
    let s = makeInitialState(42);
    expect(calendarFor(s.day.dayNumber)).toMatchObject({ weekday: 'mon', week: 1 });
    const seen: string[] = [];
    for (let i = 0; i < 7; i++) {
      const cal = calendarFor(s.day.dayNumber);
      const r = playDay(s);
      s = r.s;
      seen.push(`${cal.weekday}:${r.phases.join('>')}`);
    }
    expect(seen).toEqual([
      'mon:morning>service>evening>morning',
      'tue:morning>service>evening>morning',
      'wed:morning>service>evening>morning',
      'thu:morning>service>evening>morning',
      'fri:morning>service>evening>morning',
      'sat:morning>service>evening>morning',
      'sun:morning>evening>morning'
    ]);
    expect(calendarFor(s.day.dayNumber)).toMatchObject({ weekday: 'mon', week: 2, absoluteWeek: 2 });
  });

  it('söndagen öppnar ingen service, och CLOSE_DAY gör inget på en servicedag', () => {
    let s = makeInitialState(1);
    expect(reducer(s, { type: 'CLOSE_DAY' })).toBe(s);
    s = { ...s, day: { ...s.day, dayNumber: 7 } };
    expect(reducer(s, { type: 'START_SERVICE' })).toBe(s);
    expect(reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 10 })).toBe(s);
  });

  it('ankomsttakten följer veckodagen: fredag / måndag = 1,3 / 0,7', () => {
    // Samma tillstånd med dörrarna öppna; bara dagen byts.
    let open = makeInitialState(7);
    open = { ...open, day: { ...open.day, dayNumber: 8 } };
    open = reducer(open, { type: 'START_SERVICE' });
    open = tickUntil(open, (x) => x.day.doorsOpenAt === null || x.simTime >= x.day.doorsOpenAt);
    const rateOn = (dayNumber: number) => arrivalProbability({ ...open, day: { ...open.day, dayNumber } });
    // Vecka 2 (ingen första-veckan-faktor, ingen högtid): dag 8 = måndag, 12 = fredag.
    const ratio = rateOn(12) / rateOn(8);
    expect(ratio).toBeCloseTo(WEEK.guestFactor.fri / WEEK.guestFactor.mon, 6);
  });
});
