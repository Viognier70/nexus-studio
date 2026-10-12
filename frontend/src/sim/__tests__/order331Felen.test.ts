// ORDER 331 (Anders 2026-10-12) — felen som genomgången i ORDER 330 H hittade:
// A. att återställa vinlistan (THIN_WINE_LIST två gånger) slår inte på välkomstdrinken om den var avstängd;
// B. fikasvaret som kostar för en extra hand (FIKA.economy.extraHandSek) ger den extra handen de närmaste kvällarna
//    med service (day.prepHand, samma väg som HIRE_PREP_HAND), utan att dra kostnaden en gång till.

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import { FIKA, MISE_EN_PLACE } from '../balance';
import { answerFika, applyFikaHand } from '../fika';
import { calendarFor, firstDayOfWeek } from '../calendar';
import { dilemmaById } from '../../content/fika/dilemmas';
import { playDay, startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import type { SimulationState } from '../../strategic/types';

const morning = (s: SimulationState) => ({ ...s, day: { ...s.day, period: 'morning' as const } });

describe('ORDER 331 A — vinlistan och välkomstdrinken', () => {
  it('avstängd från början: tunna och återställa lämnar den avstängd', () => {
    const s = morning(makeNewGameState(3));
    expect(s.policies.welcomeDrink).toBe(false);
    const thin = reducer(s, { type: 'THIN_WINE_LIST' });
    expect([thin.scaleDown.wineListReduced, thin.policies.welcomeDrink]).toEqual([true, false]);
    const back = reducer(thin, { type: 'THIN_WINE_LIST' });
    expect([back.scaleDown.wineListReduced, back.policies.welcomeDrink]).toEqual([false, false]);
  });
  it('påslagen: tunna slår av den, återställa slår på den igen', () => {
    const s = morning(makeNewGameState(3));
    const on = { ...s, policies: { ...s.policies, welcomeDrink: true } };
    const thin = reducer(on, { type: 'THIN_WINE_LIST' });
    expect(thin.policies.welcomeDrink).toBe(false);
    expect(reducer(thin, { type: 'THIN_WINE_LIST' }).policies.welcomeDrink).toBe(true);
  });
});

describe('ORDER 331 B — fikats extra hand', () => {
  for (const id of ['fika-vagn-nyanstalld', 'fika-passen']) {
    it(`${id} A: svaret ger ${FIKA.economy.extraHandEvenings} kvällar med en extra hand`, () => {
      expect(dilemmaById(id)!.options.find((o) => o.id === 'A')!.economy).toEqual([{ kind: 'cost', key: 'extraHandSek' }]);
      const s = makeNewGameState(4);
      const draft = { ...s, fika: { tonight: { day: s.day.dayNumber, dilemmaId: id, answer: null, previous: null }, log: [], loyalty: {} } } as SimulationState;
      const out = answerFika(draft, 'A')!;
      expect(out.costSek).toBe(FIKA.economy.extraHandSek);
      expect(out.extraHandEvenings).toBe(FIKA.economy.extraHandEvenings);
      expect(draft.fika!.extraHandEveningsLeft).toBe(FIKA.economy.extraHandEvenings);
      // B och C ger ingen.
      const other = { ...s, fika: { tonight: { day: s.day.dayNumber, dilemmaId: id, answer: null, previous: null }, log: [], loyalty: {} } } as SimulationState;
      expect(answerFika(other, 'B')!.extraHandEvenings ?? 0).toBe(0);
      expect(other.fika!.extraHandEveningsLeft ?? 0).toBe(0);
    });
  }

  it('morgonen: bara dagar med service räknas, och kostnaden dras inte igen', () => {
    const s = makeNewGameState(4);
    const sunday = firstDayOfWeek(2) - 1;
    expect(calendarFor(sunday).isServiceDay).toBe(false);
    const d = { ...s, day: { ...s.day, dayNumber: sunday, prepHand: false }, fika: { tonight: null, log: [], loyalty: {}, extraHandEveningsLeft: 2 } } as SimulationState;
    applyFikaHand(d);
    expect([d.day.prepHand, d.fika!.extraHandEveningsLeft]).toEqual([false, 2]);
    const monday = { ...d, day: { ...d.day, dayNumber: sunday + 1 } } as SimulationState;
    const cash = monday.cash;
    applyFikaHand(monday);
    expect([monday.day.prepHand, monday.day.prepHandFromFika, monday.fika!.extraHandEveningsLeft, monday.cash]).toEqual([true, true, 1, cash]);
  });

  it('i spelarens flöde vid vagnen: de två kvällarna efter svaret står Jonas vid grillen, den tredje inte', () => {
    let s = startInFoodtruck(2);
    while (!calendarFor(s.day.dayNumber).isServiceDay) s = playDay(s, { ladder: 'never' }).state;
    // Kvällens fika blir den nyanställda; harnessen svarar som spelaren (FIKA_ANSWER, det väl grundade svaret A).
    const asked = (x: SimulationState) => x.day.period === 'evening' && x.fika?.tonight?.answer === null
      ? { ...x, fika: { ...x.fika!, tonight: { ...x.fika!.tonight!, dilemmaId: 'fika-vagn-nyanstalld' } } } as SimulationState
      : x.day.period === 'evening' && !x.fika?.tonight
        ? { ...x, fika: { ...(x.fika ?? { log: [], loyalty: {} }), tonight: { day: x.day.dayNumber, dilemmaId: 'fika-vagn-nyanstalld', answer: null, previous: null } } } as SimulationState
        : x;
    s = playDay(s, { ladder: 'never', onTick: asked }).state;
    expect(s.fika!.log.at(-1)).toMatchObject({ dilemmaId: 'fika-vagn-nyanstalld', optionId: 'A' });
    const hands: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      while (!calendarFor(s.day.dayNumber).isServiceDay) s = playDay(s, { ladder: 'never' }).state;
      let during = false;
      s = playDay(s, { ladder: 'never', onTick: (x) => { if (x.day.period === 'dinner' && x.day.prepHand) during = true; return x; } }).state;
      hands.push(during);
    }
    expect(hands).toEqual([true, true, false]);
    // Den extra handen från fikat drar inte morgonens kostnad (strings.economy.ledger.prepHand).
    expect(s.ledger.filter((l) => l.amount === -MISE_EN_PLACE.extraHandCostSek).length).toBe(0);
  }, 600000);
});
