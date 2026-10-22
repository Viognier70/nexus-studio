// @vitest-environment jsdom
// ORDER 334 A, B och D — källarens hyra och AW, stamgästerna på Magasinsgatan, och banken som frågar efter namnet
// när lokalen är vald (Anders 2026-10-22).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { reducer } from '../../strategic/simulation/reducer';
import { calendarFor, firstDayOfWeek } from '../calendar';
import { AFTER_WORK, DISTRICTS, RENT, ECONOMY } from '../balance';
import { afterWorkAvailable, afterWorkGuestsTonight, playerDoorMix, truckNightsBefore, truckRegularsTonight } from '../districts';
import { dailyGuestCap, weeklyRentSek } from '../economy';
import { applyTruckSpotAtDoors } from '../truckSpot';
import { bookingFor } from '../../strategic/simulation/guestTypes';
import { ACTIVITY_CATALOGUE, activityAvailable } from '../../strategic/simulation/activities';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { setLanguage } from '../../content/language';
import { BusinessProvider, useBusiness } from '../../strategic/business/BusinessContext';
import type { SimulationState } from '../../strategic/types';

const dispatched: unknown[] = [];
let simForCard: SimulationState;
vi.mock('../../strategic/simulation/SimulationProvider', () => ({
  useSimDispatch: () => (a: unknown) => dispatched.push(a),
  useSimState: () => simForCard
}));
const { LadderOfferCard } = await import('../../strategic/ui/LadderOfferCard');

afterEach(() => { cleanup(); setLanguage('en'); dispatched.length = 0; });

// Första dagen i vecka 3 med den veckodag som söks.
function dayOf(weekday: string): number {
  for (let d = firstDayOfWeek(3); d < firstDayOfWeek(4); d++) if (calendarFor(d).weekday === weekday) return d;
  throw new Error(weekday);
}

// Vinbaren i lokalen p en morgon (dagen d).
function vinbarIn(p: 'torget' | 'kallaren', d = dayOf('tue')): SimulationState {
  const s = startInFoodtruck(3, d);
  return { ...s, cash: 500000, businessClass: 'vinbaren', economy: { ...s.economy, businessClass: 'vinbar', premises: p }, day: { ...s.day, dayNumber: d, period: 'morning' } };
}

// Vagnen på platsen efter n kvällar där.
function truckAt(spot: 'torget' | 'magasinsgatan', nights: number, d = dayOf('tue')): SimulationState {
  const s = startInFoodtruck(3, d);
  return { ...s, economy: { ...s.economy, truckSpot: spot, truckNights: { [spot]: nights } }, day: { ...s.day, dayNumber: d, period: 'morning' } };
}

describe('ORDER 334 A — källaren', () => {
  it('hyran är klassens gånger lokalens faktor; källaren är billigare, de andra som förut', () => {
    const full = Math.round(RENT.shareOfNormalWeeklyRevenue * ECONOMY.normalWeeklyRevenueSek.vinbar);
    expect(weeklyRentSek('vinbar', 6)).toBe(full);
    expect(weeklyRentSek('vinbar', 6, 'salongen')).toBe(full);
    expect(weeklyRentSek('vinbar', 6, 'kallaren')).toBe(Math.round(full * DISTRICTS.premisesRentK.kallaren));
    expect(DISTRICTS.premisesRentK.kallaren).toBeLessThan(1);
  });

  it('sommarkurserna: studentkvarteret har studenter också utanför terminen (fler än förut, 0,45)', () => {
    expect(DISTRICTS.list.student.outOfTermK).toBeGreaterThan(0.45);
  });

  it('AW går bara i källaren och på vardagarna, och inte i vagnen', () => {
    const aw = ACTIVITY_CATALOGUE.find((a) => a.id === AFTER_WORK.activityId)!;
    expect([afterWorkAvailable(vinbarIn('kallaren')), activityAvailable(vinbarIn('kallaren'), aw)]).toEqual([true, true]);
    expect(afterWorkAvailable(vinbarIn('torget'))).toBe(false);
    expect(afterWorkAvailable(vinbarIn('kallaren', dayOf('sat')))).toBe(false);
    expect(afterWorkAvailable(truckAt('torget', 0))).toBe(false);
    // Reducern vägrar AW där den inte går.
    expect(reducer(vinbarIn('torget'), { type: 'PICK_ACTIVITY', id: AFTER_WORK.activityId }).day.pickedActivityIds).not.toContain(AFTER_WORK.activityId);
  });

  it('AW: byborna kommer, AFTER_WORK.guests fler i kvällens tak och i bokningens mellangrupp', () => {
    const s = vinbarIn('kallaren');
    const picked = reducer(s, { type: 'PICK_ACTIVITY', id: AFTER_WORK.activityId });
    expect(picked.day.pickedActivityIds).toContain(AFTER_WORK.activityId);
    expect(afterWorkGuestsTonight(picked)).toBe(AFTER_WORK.guests);
    expect(dailyGuestCap(picked) - dailyGuestCap(s)).toBe(AFTER_WORK.guests);
    const b = bookingFor(picked);
    expect(b.afterWork).toBe(AFTER_WORK.guests);
    expect(b.counts.middle).toBeGreaterThanOrEqual(AFTER_WORK.guests);
  });
});

describe('ORDER 334 B — Magasinsgatan', () => {
  it('stamgästerna blir fler för varje kväll vagnen stått där, upp till taket', () => {
    const m = DISTRICTS.magasinsgatan;
    expect(truckRegularsTonight(truckAt('magasinsgatan', 0))).toBe(0);
    expect(truckRegularsTonight(truckAt('magasinsgatan', 5))).toBe(Math.floor(5 * m.regularsPerEvening));
    expect(truckRegularsTonight(truckAt('magasinsgatan', 999))).toBe(m.regularsMax);
    // Räknas per plats: kvällarna på Torget ger inga stamgäster på Magasinsgatan.
    expect(truckRegularsTonight(truckAt('torget', 20))).toBe(0);
    expect(dailyGuestCap(truckAt('magasinsgatan', 10))).toBeGreaterThan(dailyGuestCap(truckAt('magasinsgatan', 0)));
  });

  it('bybornas gata: gästerna vid dörren är mest bybor, och stamgästerna är bokade bybor', () => {
    expect(playerDoorMix(truckAt('magasinsgatan', 0))).toEqual(DISTRICTS.magasinsgatan.doorMix);
    const b = bookingFor(truckAt('magasinsgatan', 6));
    expect(b.regulars).toBe(truckRegularsTonight(truckAt('magasinsgatan', 6)));
    expect(b.counts.middle).toBeGreaterThanOrEqual(b.regulars!);
  });

  it('kvällen räknas på platsen när dörrarna öppnar, en gång per dag; avgiften står kvar', () => {
    const s = truckAt('magasinsgatan', 3);
    const draft = { ...s, ledger: [...s.ledger] };
    applyTruckSpotAtDoors(draft);
    expect(draft.economy.truckNights?.magasinsgatan).toBe(4);
    expect(truckNightsBefore(draft, 'magasinsgatan')).toBe(3);
    expect(draft.cash).toBe(s.cash - DISTRICTS.truckSpotFeeSek.magasinsgatan);
    applyTruckSpotAtDoors(draft);
    expect(draft.economy.truckNights?.magasinsgatan).toBe(4);
  });
});

describe('ORDER 334 D — banken frågar efter namnet när lokalen är vald', () => {
  function offered(): SimulationState {
    const s = startInFoodtruck(3, firstDayOfWeek(3) + 1);
    return {
      ...s, cash: 500000, day: { ...s.day, period: 'morning' },
      ladder: { ...s.ladder!, offer: { to: 'vinbar', depositSek: 50000, loanSek: 0, state: 'offered', offeredOnDay: s.day.dayNumber } }
    };
  }
  let seenName: string | null = null;
  function NameProbe() { seenName = useBusiness().business.name; return null; }

  for (const lang of ['sv', 'en'] as const) {
    it(`först lokalen, sedan banken med lokalen i frågan; namnet blir verksamhetens (${lang})`, () => {
      setLanguage(lang);
      simForCard = offered();
      const view = render(createElement(BusinessProvider, { initialName: 'Vagnen', children: [createElement(LadderOfferCard, { key: 'c' }), createElement(NameProbe, { key: 'p' })] }));
      // Steg 1: lokalen, med hyran vid varje lokal. Ingen namnruta än, och Ta över finns inte.
      expect(view.getByTestId('premises-picker')).toBeTruthy();
      expect(view.queryByTestId('premises-name')).toBeNull();
      expect(view.queryByTestId('ladder-take')).toBeNull();
      expect(Number(view.getByTestId('premises-rent-kallaren').getAttribute('data-rent'))).toBeLessThan(Number(view.getByTestId('premises-rent-torget').getAttribute('data-rent')));
      fireEvent.click(view.getByTestId('premises-kallaren'));
      fireEvent.click(view.getByTestId('premises-to-bank'));
      // Steg 2: banken säger var krogen ligger.
      expect(view.getByTestId('premises-bank').getAttribute('data-premises')).toBe('kallaren');
      expect(view.getByTestId('premises-bank-ask').textContent).toContain(lang === 'sv' ? 'i källaren på Prästgatan' : 'in the cellar on Prästgatan');
      expect((view.getByTestId('ladder-take') as HTMLButtonElement).disabled).toBe(true);
      fireEvent.change(view.getByTestId('premises-name'), { target: { value: 'Valvet' } });
      fireEvent.click(view.getByTestId('ladder-take'));
      expect(dispatched.at(-1)).toEqual({ type: 'LADDER_TAKE', premises: 'kallaren' });
      expect(seenName).toBe('Valvet');
    });
  }

  // Sparfilen för scripts/order334-banken.mjs: vagnen på morgonen med Åsas erbjudande om vinbaren (WRITE_REPORTS=1).
  it.runIf(process.env.WRITE_REPORTS === '1')('sparfilen med erbjudandet', async () => {
    const { makeSaveFile } = await import('../save');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const s = offered();
    const sim = { ...s, day: { ...s.day, morningReview: null } } as SimulationState;
    mkdirSync('reports/order334', { recursive: true });
    writeFileSync('reports/order334/save-erbjudande-vinbar.json', JSON.stringify(makeSaveFile(sim, 'Vagnen', 'auto', new Date('2026-10-22T08:00:00Z'))) + '\n');
  });

  it('tillbaka från banken till lokalen', () => {
    simForCard = offered();
    const view = render(createElement(BusinessProvider, { children: createElement(LadderOfferCard, {}) }));
    fireEvent.click(view.getByTestId('premises-salongen'));
    fireEvent.click(view.getByTestId('premises-to-bank'));
    fireEvent.click(view.getByTestId('premises-back'));
    expect(view.getByTestId('premises-picker').getAttribute('data-premises')).toBe('salongen');
  });
});
