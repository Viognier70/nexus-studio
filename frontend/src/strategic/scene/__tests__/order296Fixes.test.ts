// ORDER 296 punkt 6 — felen från provspelet av 64b27c0.

import { describe, expect, it } from 'vitest';
import { createWineBarRoom, PLATE_SURFACE } from '../wineBarRoom';
import { groupsFor } from '../serviceFlow';
import { openShortfall } from '../../simulation/morningBuy';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { firstDayOfWeek } from '../../../sim/calendar';
import { PLAYERS } from '../../testHarness/randomness';
import { MORNING_STAKE } from '../../../sim/balance';
import { t } from '../../../content/nexusStrings';

describe('ORDER 296 — tallrikarna står där gästerna sitter', () => {
  it('varje bords tallriksplats ligger på bordet eller disken framför sällskapets sitsar', () => {
    const room = createWineBarRoom({ mood: 'helg' } as never);
    for (const g of groupsFor(room)) {
      expect(g.tableAt, g.id).toBeTruthy();
      const seats = g.seats.map((id) => room.seats.find((s) => s.id === id)!.local);
      const cz = seats.reduce((a, s) => a + s[1], 0) / seats.length;
      const cx = seats.reduce((a, s) => a + s[0], 0) / seats.length;
      // Närmare sitsarna än personalens serveringspunkt, och på bordet/disken.
      expect(Math.abs(g.tableAt![1] - cz), g.id).toBeLessThan(Math.abs(g.serveAt[1] - cz));
      expect(Math.abs(g.tableAt![0] - cx), g.id).toBeLessThan(0.01);
    }
    expect(PLATE_SURFACE.loungeTableZ).toBe(4.15);
  });
});

describe('ORDER 296 — ingen öppning utan råvaror utan att fråga', () => {
  it('tomt lager är kort; baspaketet räcker', () => {
    let s = makeNewGameState(1);
    s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
    const empty = openShortfall({ ...s, stock: {} });
    expect(empty.guests).toBeGreaterThan(0);
    expect(empty.short).toBe(true);
    const bought = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    const r = openShortfall(bought);
    expect(r.covers).toBeGreaterThanOrEqual(r.guests * MORNING_STAKE.askBelowCoverShare);
    expect(r.short).toBe(false);
  });
});

describe('ORDER 296 — förlust dras från kontot', () => {
  it('texterna för förlust säger "Dras från kontot", inte "För över"', () => {
    expect(t('sv', 'settle.loss.do', { n: '−500 kr' })).toBe('Dras från kontot −500 kr');
    expect(t('sv', 'settle.transfer.do', { n: '500 kr' })).toContain('För över');
    expect(t('en', 'settle.loss.do', { n: '−500 kr' })).toContain('Deduct');
  });
});
