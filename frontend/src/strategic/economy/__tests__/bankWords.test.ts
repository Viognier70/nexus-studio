// ORDER 265 — bankens besked är en diagnos i ord, aldrig siffror
// (speldesign > Lånet).
import { describe, expect, it } from 'vitest';
import { missingInWords, shownInWords, settlementInWords } from '../BankDialog';
import { BUSINESS_CLASSES } from '../../../sim/balance';
import { makeInitialState } from '../../simulation/model';
import type { SimulationState } from '../../types';

const cases: SimulationState['medals'][] = [
  {},
  { stensota: 'brons' },
  { stensota: 'silver', metodkoket: 'brons', kalastorget: 'guld' },
  { maltidbiblioteket: 'platina', kalastorget: 'guld', stensota: 'silver', metodkoket: 'silver', gastronomiskateatern: 'brons' }
];

describe('ORDER 265 — bankens diagnos i ord', () => {
  it('inga siffror i det spelaren visat eller i det som saknas', () => {
    for (const medals of cases) {
      const text = [shownInWords(medals), ...BUSINESS_CLASSES.list.map((c) => missingInWords(c.id, medals) ?? '')].join(' ');
      expect(text, text).not.toMatch(/[0-9]/);
    }
  });

  it('det som saknas nämner nivå och paviljonger i ord', () => {
    expect(missingInWords('vinbar', { kalastorget: 'brons' })).toBe('För vinbaren saknas brons i tre paviljonger, varav Stensöta.');
    expect(missingInWords('nattklubb', { kalastorget: 'guld' })).toBe('För nattklubben saknas silver i Stensöta.');
    expect(missingInWords('foodtruck', { kalastorget: 'brons' })).toBeNull();
  });

  it('avräkningen i ord, utan siffror', () => {
    const s = makeInitialState(1);
    const withSettlement = { ...s, economy: { ...s.economy, lastSettlement: { week: 1, revenueSek: 3000, floorSek: 5000, topUpSek: 2000, amortisationSek: 10000, downgradedFrom: 'vinbar' as const, downgradedTo: 'foodtruck' as const } } };
    const lines = settlementInWords(withSettlement).join(' ');
    expect(lines).not.toMatch(/[0-9]/);
    expect(lines).toContain('golvet fyllde på');
  });
});
