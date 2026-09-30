// ORDER 291 — rättelserna efter provspelet av 4795192: gästtypernas notor i
// klasserna utan lagerpaket, inköpens text och varning, spelarens språk i
// innehållet, scenariot som läggs undan när servicen stänger och kurserna
// som investering i veckoavräkningen.

import { afterEach, describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { changeClass, settleWeek } from '../economy';
import { firstDayOfWeek } from '../calendar';
import { GUEST_TYPES, STOCK } from '../balance';
import { stocked } from '../../strategic/testHarness/stocked';
import { coverage } from '../../strategic/simulation/morningBuy';
import { stringsFor } from '../../content/strings';
import { setLanguage } from '../../content/language';
import { incidentBankFor } from '../incidentBank';
import { activeBankLanguage, authoredQuestions } from '../../strategic/knowledge/questionBank';
import { findDish } from '../../strategic/simulation/m4Catalogue';
import { scenarioById, SENDER_PREFIX } from '../../strategic/simulation/scenarios';
import { activityById, activityName } from '../../strategic/simulation/activities';
import { formatNumber } from '../../content/language';
import type { GuestType, SimulationState } from '../../strategic/types';
import { playMorning, tickUntil } from '../../strategic/testHarness/weekHarness';
import { PLAYERS } from '../../strategic/testHarness/randomness';

afterEach(() => setLanguage('en'));

function tickToClose(s: SimulationState): SimulationState {
  for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) s = reducer(s, { type: 'TICK', dt: 1 });
  return s;
}

describe('ORDER 291 — gästtyperna betalar olika även utan lagerpaket', () => {
  it('notan per plånbok i balance.ts: studenten under, höginkomsttagaren över', () => {
    const f = GUEST_TYPES.legacyBillFactor;
    expect(f.tight).toBeLessThan(f.normal);
    expect(f.generous).toBeGreaterThan(f.normal);
    expect(f.gold).toBeGreaterThan(f.generous);
  });

  it('i food trucken blir intäkten per gäst olika per typ', () => {
    const perGuest: Partial<Record<GuestType, number[]>> = {};
    for (let seed = 1; seed <= 6; seed++) {
      let s = makeNewGameState(seed);
      s = changeClass({ ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) } }, 'foodtruck', false);
      s = tickToClose(reducer(stocked(s), { type: 'START_SERVICE' }));
      const rev = s.day.guestTypeRevenue ?? {};
      const arr = s.day.guestTypeArrivals ?? {};
      for (const t of ['student', 'middle', 'high'] as const) {
        if ((arr[t] ?? 0) > 0 && (rev[t] ?? 0) > 0) (perGuest[t] ??= []).push((rev[t] ?? 0) / (arr[t] ?? 1));
      }
    }
    const mean = (xs: number[] | undefined) => (xs && xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
    expect(mean(perGuest.student)).toBeLessThan(mean(perGuest.middle));
    expect(mean(perGuest.high)).toBeGreaterThan(mean(perGuest.middle));
  });
});

describe('ORDER 291 — inköpen', () => {
  it('"79 portioner till 15 väntade gäster", inte "79 av 15 gäster"', () => {
    expect(stringsFor('sv').morningBuy.mainsCover(79, 15)).toBe('79 portioner till 15 väntade gäster');
    expect(stringsFor('en').morningBuy.mainsCover(79, 15)).toBe('79 portions for 15 expected guests');
  });

  it('varnar när inköpet är mer än dubbelt behovet, för mat och för dryck', () => {
    let s = makeNewGameState(3);
    s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    const base = coverage(s);
    // Baspaketet, det mentorn föreslår, ger ingen varning.
    expect(base.overFood).toBe(false);
    expect(base.overDrink).toBe(false);
    const many = reducer(s, { type: 'BUY_ITEMS', items: { 'chicken-plate': base.guests * STOCK.overBuyFactor, 'house-wine-glass': base.glassesNeeded * STOCK.overBuyFactor } });
    const over = coverage(many);
    expect(over.overFood).toBe(true);
    expect(over.overDrink).toBe(true);
  });
});

describe('ORDER 291 — innehållet på spelarens språk', () => {
  it('talen skrivs med svenskt format på svenska', () => {
    expect(formatNumber(6069, 'sv')).toBe('6 069');
    expect(formatNumber(6069, 'en')).toBe('6,069');
  });

  it('raketerna, frågorna, rätterna, satsningarna och scenarierna byter språk', () => {
    setLanguage('en');
    const rocketEn = incidentBankFor('vinbar')[0].text.title;
    const questionEn = authoredQuestions()[0].prompt;
    const dishEn = findDish('root-soup')!.name;
    const activityEn = activityName(activityById('train-service')!);
    const scenarioEn = scenarioById('moral-dilemma')!.subjectBody;
    expect(activeBankLanguage()).toBe('en');
    setLanguage('sv');
    expect(activeBankLanguage()).toBe('sv');
    expect(incidentBankFor('vinbar')[0].text.title).not.toBe(rocketEn);
    expect(authoredQuestions()[0].prompt).not.toBe(questionEn);
    expect(findDish('root-soup')!.name).toBe('Rotfruktssoppa');
    expect(dishEn).toBe('Root vegetable soup');
    expect(activityName(activityById('train-service')!)).toBe('Utbilda salen');
    expect(activityEn).toBe('Train the floor staff');
    expect(scenarioById('moral-dilemma')!.subjectBody).not.toBe(scenarioEn);
    expect(scenarioById('moral-dilemma')!.choices.A.outcomes[0]).toMatch(/förrätterna/);
    expect(SENDER_PREFIX['värd']).toBe('Värden');
  });
});

describe('ORDER 291 — scenariot läggs undan när servicen stänger', () => {
  it('en ruta som väntar på svar står inte kvar efter servicen', () => {
    let s = makeNewGameState(7);
    s = changeClass({ ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) } }, 'foodtruck', false);
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    s = reducer(s, { type: 'TRIGGER_SCENARIO' });
    expect(s.scenario.phase).toBe('subject');
    s = tickToClose(s);
    expect(s.day.period).toBe('evening');
    expect(s.scenario.phase).toBe('idle');
  });
});

describe('ORDER 291 — kurserna är investeringar', () => {
  it('veckoavräkningen redovisar veckans kurser', () => {
    let s = makeNewGameState(5);
    s = { ...s, economy: { ...s.economy, weekCoursesSek: 5000 } };
    const settled = settleWeek(s);
    expect(settled.economy.lastSettlement?.coursesSek).toBe(5000);
    expect(settled.economy.weekCoursesSek).toBe(0);
  });
});

describe('ORDER 291 — ett resultat: kontot efter överföringen är kassan nästa morgon', () => {
  // Provspelet: "Pengar räknar ned medan R1 är öppen" och kassan föll mer än
  // resultatet. Efter överföringen dras bara lönerna och räntan, som redan
  // står i kontot efter; sopbilen och gästerna som satt kvar räknas vid
  // stängningen, också när kvällen faller ihop.
  it('för åtta frön, med utbildningen och DJ:n', () => {
    for (let seed = 1; seed <= 8; seed++) {
      let s = makeNewGameState(seed);
      s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
      const day = s.day.dayNumber;
      s = playMorning(s, { activities: ['train-service', 'book-dj'] });
      const morning = s.day.cashAtDayStart!;
      s = tickUntil(reducer(s, { type: 'START_SERVICE' }), (x) => x.day.period === 'evening', 'best', 1);
      const tr = s.day.transfer!;
      // Resultatet är kontot efter mot kontot i morse, utom kursen (utbildningen).
      expect(tr.resultSek).toBe(Math.round(tr.accountAfterSek) - Math.round(morning) + activityById('train-service')!.costSek);
      s = reducer(s, { type: 'END_EVENING' });
      s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
      expect(Math.round(s.cash)).toBe(tr.accountAfterSek);
    }
  });
});
