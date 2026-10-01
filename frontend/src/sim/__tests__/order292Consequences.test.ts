// ORDER 292 — följden syns (Vision Owner 2026-10-01, provspel av 316b4c3).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { playMorning, tickUntil } from '../../strategic/testHarness/weekHarness';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { calendarFor, firstDayOfWeek } from '../calendar';

describe('ORDER 292 — kassan står still efter servicen', () => {
  // "Kassan rullar fortfarande efter servicen i 316b4c3. Rätta, med ett test
  // som kontrollerar att kassan står still från 23.00 till nästa morgon."
  it('från stängningen genom kvällens skärmar och natten till nästa morgon', () => {
    for (let seed = 1; seed <= 6; seed++) {
      let s = makeNewGameState(seed);
      s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
      const day = s.day.dayNumber;
      s = playMorning(s, { activities: ['train-service', 'book-dj'] });
      s = tickUntil(reducer(s, { type: 'START_SERVICE' }), (x) => x.day.period === 'evening', 'best', 1);
      const atClose = s.cash;
      // Kontot efter överföringen (T2) är kassan vid stängningen.
      expect(Math.round(atClose)).toBe(s.day.transfer!.accountAfterSek);
      // Kvällens skärmar: tio spelminuter.
      for (let i = 0; i < 600 && s.day.period === 'evening'; i++) {
        s = reducer(s, { type: 'TICK', dt: 1 });
        expect(s.cash).toBe(atClose);
      }
      s = reducer(s, { type: 'END_EVENING' });
      s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
      expect(calendarFor(s.day.dayNumber).isServiceDay).toBe(true);
      expect(s.cash).toBe(atClose);
      // En stund in på morgonen (spelaren läser schemat): kassan står still.
      for (let i = 0; i < 120; i++) s = reducer(s, { type: 'TICK', dt: 1 });
      expect(s.day.period).toBe('morning');
      expect(s.cash).toBe(atClose);
    }
  });
});
