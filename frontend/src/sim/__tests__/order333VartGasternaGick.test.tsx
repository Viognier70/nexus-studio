// @vitest-environment jsdom
//
// ORDER 333 F — grundregeln för kvarteren (avsnitt 8 punkt 6): kvällens resultat visar vart gästerna gick och varför.
// sim/village.ts whereGuestsWent läser samma vikter som gästens val (playerChoiceShare); ResultScreen visar raderna.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { firstDayOfWeek } from '../calendar';
import { TRUCK_SPOT_IDS } from '../districts';
import { playerChoiceShare, whereGuestsWent, PLAYER_VENUE } from '../village';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { WhereGuestsWentPanel } from '../../strategic/scenario/ResultScreen';
import type { SimulationState } from '../../strategic/types';

const at = (s: SimulationState, spot: (typeof TRUCK_SPOT_IDS)[number]): SimulationState => ({ ...s, economy: { ...s.economy, truckSpot: spot } });
// En vardag i vecka 2 (konferensdag på campus), vagnen nystartad: inga medaljer.
const base = () => startInFoodtruck(3, firstDayOfWeek(2) + 1);

describe('ORDER 333 F — vart gästerna gick', () => {
  it('andelarna är gästens val: grupperna vägda med kvarterets blandning ger spelarens andel', () => {
    for (const spot of TRUCK_SPOT_IDS) {
      const s = at(base(), spot);
      const { rows } = whereGuestsWent(s);
      expect(rows.length).toBeGreaterThan(0);
      const share = rows.reduce((a, r) => a + r.mix * r.playerShare, 0);
      expect(share).toBeCloseTo(playerChoiceShare(s), 9);
      for (const r of rows) {
        expect(r.topShare).toBeGreaterThanOrEqual(r.playerShare);
        expect(['taste', 'stars', 'price', 'quality']).toContain(r.reason);
      }
    }
  });

  it('på campus utan medaljer: gruppen som väger medaljerna går till en annan krog och skälet är medaljerna', () => {
    const { district, rows } = whereGuestsWent(at(base(), 'campus'));
    expect(district).toBe('campus');
    const medals = rows.filter((r) => r.reason === 'quality');
    expect(medals.length).toBeGreaterThan(0);
    for (const r of medals) {
      expect(r.quality).toBe('medals');
      expect(r.topId).not.toBe(PLAYER_VENUE);
    }
  });

  it('kvällens resultat skriver varje grupp med skälet, och ingen andel står utan ett', () => {
    render(<WhereGuestsWentPanel sim={at(base(), 'campus')} />);
    const panel = screen.getByTestId('result-where');
    expect(panel.getAttribute('data-district')).toBe('campus');
    expect(panel.textContent).toMatch(/asked for medals/);
    for (const p of panel.querySelectorAll('p')) {
      // Varje rad med en procentsats har ett skäl efter kommatecknet.
      expect(p.textContent).toMatch(/\d+% chose .+, .+\./);
    }
  });
});
