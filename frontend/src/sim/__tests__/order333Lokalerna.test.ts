// ORDER 333 D — vinbarens lokal (avsnitt 8 punkt 4): spelaren väljer lokal när vinbaren tas över, lokalens kvarter
// styr gästerna och klassen är densamma.
import { PREMISES_MOVE } from '../balance';
import { fitOutSek } from '../ladder';
import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { firstDayOfWeek } from '../calendar';
import { PREMISES, PREMISES_IDS, playerDistrictOf, playerPremisesOf, type PremisesId } from '../districts';
import { dailyGuestCap } from '../economy';
import { playerChoiceShare } from '../village';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import type { SimulationState } from '../../strategic/types';

// Vagnen med ett erbjudande om vinbaren på morgonen och pengar till insatsen.
function offered(): SimulationState {
  const s = startInFoodtruck(3, firstDayOfWeek(3) + 1);
  return {
    ...s, cash: 500000, day: { ...s.day, period: 'morning' },
    ladder: { ...s.ladder!, offer: { to: 'vinbar', depositSek: 50000, loanSek: 0, state: 'offered', offeredOnDay: s.day.dayNumber } }
  };
}

describe('ORDER 333 D — lokalerna', () => {
  it('fyra lokaler: Torget och D15:s tre, var och en i sitt kvarter och sitt hus', () => {
    expect(PREMISES_IDS).toEqual(['torget', 'kallaren', 'salongen', 'glashornet']);
    expect(Object.values(PREMISES).map((p) => [p.id, p.district, p.building])).toEqual([
      ['torget', 'torget', 'w869907975'],
      ['kallaren', 'student', 'w193810970'],
      ['salongen', 'gastgivaregarden', 'w193810957'],
      ['glashornet', 'campus', 'w193810921']
    ]);
  });

  it('lokalen väljs när vinbaren tas över; utan val Torget, som förut', () => {
    const s = offered();
    const plain = reducer(s, { type: 'LADDER_TAKE' });
    expect(plain.economy.businessClass).toBe('vinbar');
    expect(playerPremisesOf(plain)).toBe('torget');
    for (const p of PREMISES_IDS) {
      const t = reducer(s, { type: 'LADDER_TAKE', premises: p });
      expect([p, t.economy.businessClass, playerPremisesOf(t), playerDistrictOf(t)]).toEqual([p, 'vinbar', p, PREMISES[p].district]);
    }
  });

  it('klassen är densamma: samma klass, lån och insats i alla lokaler (ORDER 340 A: lånet med inredningen)', () => {
    const s = offered();
    const takes = PREMISES_IDS.map((p) => reducer(s, { type: 'LADDER_TAKE', premises: p }));
    takes.forEach((t, i) => {
      expect(t.economy.businessClass).toBe(takes[0].economy.businessClass);
      // ORDER 340 A — inredningen i en annan lokal än Torget läggs på lånet (balance.ts PREMISES_MOVE).
      const fit = PREMISES_MOVE.fitOutPayment === 'loan' ? fitOutSek(PREMISES_IDS[i]) : 0;
      expect(t.economy.loan).toEqual({ ...takes[0].economy.loan, originalSek: takes[0].economy.loan!.originalSek + fit, principalSek: takes[0].economy.loan!.principalSek + fit });
      expect(t.cash).toBe(takes[0].cash - (PREMISES_MOVE.fitOutPayment === 'cash' ? fitOutSek(PREMISES_IDS[i]) : 0));
    });
  });

  it('lokalens kvarter styr gästerna: Torget är dagens, de andra skiljer sig', () => {
    const s = offered();
    const at = (p: PremisesId) => reducer(s, { type: 'LADDER_TAKE', premises: p });
    const torget = at('torget');
    expect(playerChoiceShare(torget)).toBe(playerChoiceShare({ ...torget, economy: { ...torget.economy, premises: undefined } }));
    for (const p of ['kallaren', 'salongen', 'glashornet'] as const) {
      const t = at(p);
      expect([p, playerChoiceShare(t) !== playerChoiceShare(torget) || dailyGuestCap(t) !== dailyGuestCap(torget)]).toEqual([p, true]);
    }
  });
});
