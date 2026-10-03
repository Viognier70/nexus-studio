// ORDER 298 — gästerna och kvällskassan (Vision Owner, provspel: "kl. 19.37
// med status Rusning var krogen tom och kvällskassan stod på 0 kr, 32 minuter
// efter öppning").

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import { playMorning, tickUntil } from '../../strategic/testHarness/weekHarness';
import { mountRoomLikeScene } from '../../strategic/testHarness/roomParity';
import { firstDayOfWeek } from '../calendar';
import { clockMinutes, doorsOpenMinutes } from '../clock';
import { tillForecast, tillSek } from '../../strategic/simulation/eveningEconomy';
import { villageRank } from '../villageLive';
import { serviceClock, serviceLabel } from '../serviceClock';
import { OPENING } from '../balance';
import type { SimulationState } from '../../strategic/types';

function opened(seed: number, offset: number, reputation?: number): SimulationState {
  let s = makeNewGameState(seed);
  s = { ...s, ...(reputation !== undefined ? { reputation } : {}), day: { ...s.day, dayNumber: firstDayOfWeek(1) + offset } };
  s = playMorning(s, {});
  mountRoomLikeScene(s.businessClass);
  return reducer(s, { type: 'START_SERVICE' });
}

describe('ORDER 298 — första sällskapet', () => {
  // Frö 10 med ryktet 0,2: ingen stod vid dörren (6 × rykte × väder avrundat
  // till 0), och första gästen satt 19 minuter efter öppning före rättelsen.
  it('sitter vid ett bord senast 10 minuter efter öppning med normalt inköp, också med lågt rykte', () => {
    for (const reputation of [undefined, 0.2]) {
      for (const seed of [1, 2, 3, 10]) {
        for (const offset of [0, 4]) {
          let s = opened(seed, offset, reputation);
          let seatedAt: number | null = null;
          s = tickUntil(s, (x) => {
            if (seatedAt === null && x.seatedIds.length > 0) seatedAt = clockMinutes(x);
            return seatedAt !== null || x.day.period !== 'dinner';
          });
          expect(seatedAt, `frö ${seed}, dag ${offset}, rykte ${reputation}`).not.toBeNull();
          expect(seatedAt! - doorsOpenMinutes(s)).toBeLessThanOrEqual(10);
        }
      }
    }
  });
});

describe('ORDER 298 — det som räknas ska synas', () => {
  it('kvällens gäster i ekonomin och byn är de som satt vid ett bord', () => {
    let s = opened(3, 4);
    const seated = new Set<string>();
    s = tickUntil(s, (x) => {
      for (const g of x.guests) if (g.seatIndex !== null && g.seatIndex !== undefined) seated.add(g.id);
      return x.day.period === 'evening' || x.day.period === 'morning';
    });
    const rec = s.economy.weekEvenings?.at(-1);
    expect(rec?.guests).toBe(seated.size);
    expect(rec?.village?.find((v) => v.id === 'player')?.guests).toBe(seated.size);
  });

  it('kvällskassan stiger medan gästerna betalar, före stängningen', () => {
    let s = opened(2, 4);
    const values = new Set<number>();
    s = tickUntil(s, (x) => {
      if (x.day.period === 'dinner' && !x.day.eveningEndRequested) values.add(Math.round(tillSek(x)));
      return x.day.period !== 'dinner';
    });
    expect([...values].filter((v) => v > 0).length).toBeGreaterThan(3);
  });
});

describe('ORDER 298 — Byn i kväll och etiketten', () => {
  it('det går inte att vara 1:a med 0 gäster och 0 kr', () => {
    expect(villageRank([{ id: 'player', kind: 'player', guests: 0 }, { id: 'torgkrogen', kind: 'restaurant', guests: 0 }])).toBeNull();
    expect(villageRank([{ id: 'player', kind: 'player', guests: 0 }, { id: 'torgkrogen', kind: 'restaurant', guests: 4 }])).toBeNull();
    expect(villageRank([{ id: 'player', kind: 'player', guests: 3 }, { id: 'torgkrogen', kind: 'restaurant', guests: 3 }])).toBe(2);
    expect(villageRank([{ id: 'player', kind: 'player', guests: 5 }, { id: 'torgkrogen', kind: 'restaurant', guests: 3 }])).toBe(1);
  });

  it('Rusning bara när rummet är fullt; annars Lugnt eller Väntar på gäster', () => {
    let s = opened(1, 0);
    s = tickUntil(s, (x) => !!x.day.doorsOpenedThisService);
    const c = serviceClock(s)!;
    expect(serviceLabel({ ...s, seatedIds: [], waitingIds: [] }, c)).toBe('waiting');
    expect(serviceLabel({ ...s, seatedIds: s.guests.slice(0, 1).map((g) => g.id), waitingIds: [] }, c)).toBe('calm');
    const many = Array.from({ length: 40 }, (_, i) => `x${i}`);
    expect(serviceLabel({ ...s, waitingIds: many }, c)).toBe('rush');
  });

  it('prognosen i kvällskassan visas först efter 30 minuters service', () => {
    let s = opened(4, 4);
    s = tickUntil(s, (x) => !!x.day.doorsOpenedThisService);
    expect(tillForecast(s)).toBeNull();
    s = tickUntil(s, (x) => clockMinutes(x) - doorsOpenMinutes(x) >= OPENING.forecastAfterMinutes + 1 || x.day.period !== 'dinner');
    expect(tillForecast(s)).not.toBeNull();
    expect(tillForecast(s)!).toBeGreaterThan(0);
  });
});
