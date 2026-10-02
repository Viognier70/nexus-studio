// ORDER 296c (Vision Owner 2026-10-02): "Ta bort den dolda regeln om att låg
// kassa vänder bort gäster i dörren."

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../strategic/simulation/model';
import { economicArrivalMultiplier, walkAwayProbability } from '../../strategic/simulation/arrivals';
import { RISK } from '../balance';

describe('ORDER 296c — kassan styr inte gästerna', () => {
  it('ingen vänder vid dörren och lika många kommer, med tom kassa som med full', () => {
    expect(RISK.cashTurnsAwayGuests).toBe(false);
    const s = makeNewGameState(1);
    for (const cash of [-50000, 0, 25000, 500000]) {
      expect(walkAwayProbability({ ...s, cash })).toBe(0);
      expect(economicArrivalMultiplier({ ...s, cash })).toBe(1);
    }
  });
});
