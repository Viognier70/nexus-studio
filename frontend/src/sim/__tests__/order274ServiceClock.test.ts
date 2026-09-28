// ORDER 274 — tiden kvar av servicen syns hela kvällen.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { SITTING } from '../balance';
import { serviceClock } from '../serviceClock';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function opened() {
  let s = makeNewGameState(4);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  return reducer(s, { type: 'START_SERVICE' });
}

describe('ORDER 274 — tiden kvar av servicen', () => {
  it('ingen klocka utanför servicen', () => {
    expect(serviceClock(makeNewGameState(4))).toBeNull();
  });

  it('servicen börjar 18.00 och stänger 23.00, med fem timmar kvar', () => {
    const c = serviceClock(opened())!;
    expect(c.nowMinutes).toBe(SITTING.serviceStartHour * 60);
    expect(c.endMinutes).toBe(SITTING.serviceEndHour * 60);
    expect(c.leftMinutes).toBe((SITTING.serviceEndHour - SITTING.serviceStartHour) * 60);
    expect(c.elapsedShare).toBe(0);
  });

  it('tiden kvar sjunker hela kvällen och når noll när reducern stänger servicen', () => {
    let s = opened();
    let last = serviceClock(s)!.leftMinutes;
    let seen = 0;
    for (let i = 0; i < 20000 && s.day.period === 'dinner'; i++) {
      s = reducer(s, TICK);
      const c = serviceClock(s);
      if (!c) break;
      expect(c.leftMinutes).toBeLessThanOrEqual(last);
      last = c.leftMinutes;
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
    expect(s.day.period).toBe('evening');
    expect(last).toBeLessThanOrEqual(1);
  });
});
