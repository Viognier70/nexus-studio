// @vitest-environment jsdom
// ORDER 315a (Anders 2026-10-07, BESLUT del 2) — karriärstegen: datamodellen,
// stegen och Åsas erbjudanden; vinbaren och bistron i samma hus; stjärnan bara
// i bistron; ryktet följer med oförändrat; "Inte än" kostar inget och
// erbjudandet står kvar; kravet för bistron silver i Metodköket och brons i
// Stensöta.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { LADDER, STAR } from '../balance';
import { canTakeOffer, depositSek, ladderBillFactor, ladderOf, ladderStep, missingFor, offerAtNight, purchaseLoanSek, starsPossible } from '../ladder';
import { changeClass, settleWeek, wageFactor } from '../economy';
import { firstDayOfWeek } from '../calendar';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { setLanguage } from '../../content/language';
import { TABLE, pickLang } from '../../content/nexusStrings';
import type { SimulationState } from '../../strategic/types';

const dispatched: unknown[] = [];
let simForCard: SimulationState;
vi.mock('../../strategic/simulation/SimulationProvider', () => ({
  useSimDispatch: () => (a: unknown) => dispatched.push(a),
  useSimState: () => simForCard
}));
const { LadderOfferCard } = await import('../../strategic/ui/LadderOfferCard');

afterEach(() => { cleanup(); setLanguage('en'); dispatched.length = 0; });

// Vinbaren, måndag morgon vecka 3, med det bistron kräver.
function readyForBistro(): SimulationState {
  const s = makeNewGameState(5);
  return {
    ...s,
    medals: { ...PLAYERS.baseline, metodkoket: 'silver' },
    reputation: LADDER.requirements.bistro.reputationAtLeast,
    cash: LADDER.requirements.bistro.cashSek,
    day: { ...s.day, dayNumber: firstDayOfWeek(3), period: 'morning' }
  };
}

describe('ORDER 315a — stegen', () => {
  it('stegen i ordning, spelbara foodtrucken, vinbaren och bistron; bistron i vinbarens hus', () => {
    // ORDER 315b del 2 — Designs D7 (careerPath.ts), godkänd av Anders 2026-10-07.
    expect(LADDER.order).toEqual(['foodtruck', 'vinbar', 'bistro', 'olhall', 'kvarterskrog', 'nattklubb', 'gastgiveri', 'soigne']);
    expect(LADDER.playable).toEqual(['foodtruck', 'vinbar', 'bistro']);
    expect(LADDER.steps.bistro.building).toBe(LADDER.steps.vinbar.building);
    expect(LADDER.steps.bistro.rebuildsFrom).toBe('vinbar');
    expect([LADDER.steps.foodtruck.starsPossible, LADDER.steps.vinbar.starsPossible, LADDER.steps.bistro.starsPossible]).toEqual([false, false, true]);
  });

  it('kraven: kassan och ryktet som i förslaget; bistron kräver silver i Metodköket och brons i Stensöta', () => {
    expect(LADDER.requirements.vinbar).toMatchObject({ cashSek: 30000, reputationAtLeast: 0.5 });
    expect(LADDER.requirements.bistro).toMatchObject({ cashSek: 60000, reputationAtLeast: 0.6 });
    expect(LADDER.requirements.bistro.medalsRequired).toEqual([{ pavilion: 'metodkoket', level: 'silver' }, { pavilion: 'stensota', level: 'brons' }]);
    const s = readyForBistro();
    expect(missingFor(s, 'bistro')).toEqual([]);
    expect(missingFor({ ...s, medals: { ...s.medals, metodkoket: 'brons', stensota: 'silver' } }, 'bistro')).toEqual(['medals']);
    expect(missingFor({ ...s, cash: 100, reputation: 0.1 }, 'bistro')).toEqual(['cash', 'reputation']);
  });

  it('spel från före ordern: steget läses ur klassen', () => {
    const s = makeNewGameState(5);
    expect(s.economy.businessClass).toBe('vinbar');
    expect(ladderStep(s)).toBe('vinbar');
    expect(ladderStep({ ...s, economy: { ...s.economy, businessClass: null } })).toBeNull();
  });
});

describe('ORDER 315a — Åsas erbjudande', () => {
  it('kommer vid dagens slut när kraven är uppfyllda, inte annars', () => {
    const s = readyForBistro();
    expect(ladderOf(offerAtNight({ ...s, cash: 100 }))!.offer).toBeNull();
    const offered = offerAtNight(s);
    expect(offered.ladder!.offer).toMatchObject({ to: 'bistro', state: 'offered', offeredOnDay: s.day.dayNumber, depositSek: depositSek('bistro', s.medals), loanSek: purchaseLoanSek('bistro') });
  });

  it('"Inte än" kostar inget och erbjudandet står kvar; det kan tas senare', () => {
    let s = offerAtNight(readyForBistro());
    const before = s;
    s = reducer(s, { type: 'LADDER_DECLINE' });
    expect(s.cash).toBe(before.cash);
    expect(s.ladder!.offer!.state).toBe('declined');
    // En ny natt: erbjudandet står kvar (inget nytt).
    expect(offerAtNight(s).ladder!.offer).toEqual(s.ladder!.offer);
    expect(canTakeOffer({ ...s, day: { ...s.day, period: 'dinner' } })).toBe('notMorning');
    expect(canTakeOffer({ ...s, cash: 10 })).toBe('cash');
    const taken = reducer(s, { type: 'LADDER_TAKE' });
    expect(taken.ladder!.step).toBe('bistro');
  });

  it('Ta över bistron: insatsen ur kassan, ombyggnaden till lånet, samma hus och samma rykte', () => {
    const s = offerAtNight(readyForBistro());
    const offer = s.ladder!.offer!;
    const t = reducer(s, { type: 'LADDER_TAKE' });
    expect(t.cash).toBe(s.cash - offer.depositSek);
    expect(t.economy.loan!.principalSek).toBe(s.economy.loan!.principalSek + offer.loanSek);
    expect(t.economy.businessClass).toBe('vinbar');
    expect(t.businessClass).toBe(s.businessClass);
    expect(t.reputation).toBe(s.reputation);
    // ORDER 315b del 2 — ombyggnaden: stängt LADDER.refitDays dagar från i dag (på morgonen).
    expect(t.ladder).toEqual({ step: 'bistro', reachedOnDay: { bistro: s.day.dayNumber }, offer: null, refit: { fromDay: s.day.dayNumber, untilDay: s.day.dayNumber + LADDER.refitDays - 1 } });
    expect(starsPossible(t)).toBe(true);
    expect(ladderBillFactor(t)).toBe(LADDER.steps.bistro.billFactor);
    expect(wageFactor(t)).toBeCloseTo(LADDER.steps.bistro.wageFactor, 6);
  });

  it('Ta över vinbaren från foodtrucken: ryktet följer med oförändrat', () => {
    const base = makeNewGameState(6);
    let s = changeClass({ ...base, cash: 100000 }, 'foodtruck', false);
    s = { ...s, medals: { stensota: 'brons' }, reputation: LADDER.requirements.vinbar.reputationAtLeast + 0.05, cash: 40000, day: { ...s.day, period: 'morning' } };
    expect(ladderStep(s)).toBe('foodtruck');
    s = offerAtNight(s);
    expect(s.ladder!.offer!.to).toBe('vinbar');
    const t = reducer(s, { type: 'LADDER_TAKE' });
    expect(t.economy.businessClass).toBe('vinbar');
    expect(t.reputation).toBe(s.reputation);
    expect(t.cash).toBe(s.cash - s.ladder!.offer!.depositSek);
    expect(t.ladder!.step).toBe('vinbar');
  });
});

describe('ORDER 315a — stjärnan bara i bistron', () => {
  // En vecka där allt annat räcker för stjärnan.
  function starWeek(step: 'vinbar' | 'bistro'): SimulationState {
    const s = readyForBistro();
    const ev = { dayNumber: s.day.dayNumber, revenueSek: 1, rockets: { fired: STAR.minRocketsInWeek, cleared: STAR.minRocketsInWeek, steps: 15, stepsRight: 15 } };
    return {
      ...s,
      ladder: { step, reachedOnDay: {}, offer: null },
      medals: { ...s.medals, [STAR.pavilion]: STAR.medal },
      reputation: 1,
      star: { held: false, weeksQualified: STAR.weeksToEarn - 1, earnedWeek: null, lostWeek: null },
      economy: { ...s.economy, weekEvenings: [ev as never] }
    };
  }
  it('vinbaren får aldrig stjärnan; bistron får den med samma vecka', () => {
    expect(settleWeek(starWeek('vinbar')).star!.held).toBe(false);
    expect(settleWeek(starWeek('bistro')).star!.held).toBe(true);
  });
});

describe('ORDER 315a — kortet', () => {
  for (const lang of ['sv', 'en'] as const) {
    it(`Åsa, steget, priset och knapparna Ta över och Inte än (${lang})`, () => {
      setLanguage(lang);
      const l = pickLang(TABLE, lang).ladder;
      simForCard = offerAtNight(readyForBistro());
      const view = render(createElement(LadderOfferCard, {}));
      expect(view.getByTestId('sender').getAttribute('data-sender')).toBe('asa');
      expect(view.getByTestId('ladder-offer').textContent).toContain(l.title.bistro);
      expect(view.getByTestId('ladder-line').textContent).toBe(l.line.bistro);
      view.getByTestId('ladder-take').click();
      expect(dispatched.at(-1)).toEqual({ type: 'LADDER_TAKE' });
      view.getByTestId('ladder-not-yet').click();
      expect(dispatched.at(-1)).toEqual({ type: 'LADDER_DECLINE' });
    });
  }

  it('avböjt: en rad att öppna kortet igen', () => {
    simForCard = reducer(offerAtNight(readyForBistro()), { type: 'LADDER_DECLINE' });
    const view = render(createElement(LadderOfferCard, {}));
    expect(view.queryByTestId('ladder-offer')).toBeNull();
    fireEvent.click(view.getByTestId('ladder-standing'));
    expect(view.getByTestId('ladder-offer')).toBeTruthy();
  });
});

describe('ORDER 315a — Din väg och Åsas repliker', () => {
  it('hela stegen från början: åtta steg, var spelaren står, de låsta med Kommer senare och kraven för nästa steg', async () => {
    const { DinVag } = await import('../../strategic/ui/DinVag');
    setLanguage('sv');
    const l = pickLang(TABLE, 'sv').ladder;
    const s = { ...readyForBistro(), cash: 100 };
    const view = render(createElement(DinVag, { sim: s }));
    expect(view.container.querySelectorAll('[data-step]')).toHaveLength(8);
    expect(view.getByTestId('din-vag-vinbar').getAttribute('data-state')).toBe('here');
    expect(view.getByTestId('din-vag-foodtruck').getAttribute('data-state')).toBe('done');
    // ORDER 315b del 2 — D7: nästa steg heter 'next'.
    expect(view.getByTestId('din-vag-bistro').getAttribute('data-state')).toBe('next');
    for (const id of ['kvarterskrog', 'olhall', 'nattklubb', 'soigne', 'gastgiveri']) {
      expect(view.getByTestId(`din-vag-${id}`).getAttribute('data-state')).toBe('later');
      expect(view.getByTestId(`din-vag-${id}`).textContent).toContain(l.comingLater);
    }
    const req = view.getByTestId('din-vag-req');
    expect(req.getAttribute('data-next')).toBe('bistro');
    expect(req.textContent).toContain('Metodköket');
    expect(req.querySelector('[data-ok="false"]')!.textContent).toContain('60');
  });

  it('Åsas replik om vinbaren står ordagrant som i ordern', () => {
    expect(pickLang(TABLE, 'sv').ladder.line.vinbar).toBe('Grattis! Du har ett gott rykte i byn, och jag har hört att du fått in pengar. Nu kan du, helt frivilligt, ta över vinbaren.');
  });
});
