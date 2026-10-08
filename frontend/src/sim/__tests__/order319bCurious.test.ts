// ORDER 319b — de nyfikna vid foodtruckens lucka (sim/curious.ts). Anders 2026-10-07 (ORDRAR_319_D9.md)
// och 2026-10-08: klicket öppnar frågekortet med en fråga ur foodtruckens bank; rätt ställer sig i kön
// (ibland med en vän), nästan tvekar och köper kanske, fel går vidare; utan svar går gästen vidare efter
// 20 s; högst en nyfiken åt gången; små krediter och svaret i portfolion.

import { describe, expect, it } from 'vitest';
import { playMorning, startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { reducer } from '../../strategic/simulation/reducer';
import { effectiveSpeed } from '../../strategic/simulation/consequence';
import { firstDayOfWeek } from '../calendar';
import { CURIOUS } from '../balance';
import { curiousOf, curiousTalkable } from '../curious';
import { FOODTRUCK_ALL, incidentBankFor, legallyCleared } from '../incidentBank';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function open(seed = 1): SimulationState {
  const s = startInFoodtruck(seed, firstDayOfWeek(1));
  return reducer(playMorning(s, { scenarioAnswer: 'best', ladder: 'never' }), { type: 'START_SERVICE' });
}

/** Tickar tills villkoret gäller (eller kvällen är slut). Situationerna svaras inte: de avgörs av tiden. */
function until(s: SimulationState, done: (s: SimulationState) => boolean, max = 20000): SimulationState {
  for (let i = 0; i < max && !done(s); i++) {
    s = reducer(s, TICK);
    if (s.day.period !== 'dinner') break;
  }
  return s;
}

const talkable = (s: SimulationState) => curiousTalkable(s);

function cardStep(s: SimulationState) {
  const card = curiousOf(s).current!.card!;
  return incidentBankFor('foodtruck').find((i) => i.id === card.incidentId)!.steps[card.step];
}

describe('ORDER 319b — de nyfikna vid luckan', () => {
  it('en förbipasserande blir nyfiken under servicen, en åt gången, och fönstret är 20 s', () => {
    let s = until(open(), talkable);
    expect(talkable(s)).toBe(true);
    const seq = curiousOf(s).current!.seq;
    // Utan svar: gästen går vidare när fönstret är slut, och ingen ny kommer medan hen står där.
    let maxCurrent = 0;
    for (let i = 0; i < 2000 && curiousOf(s).current?.seq === seq; i++) {
      s = reducer(s, TICK);
      maxCurrent = Math.max(maxCurrent, curiousOf(s).current ? 1 : 0);
    }
    expect(CURIOUS.windowSeconds).toBe(20);
    expect(curiousOf(s).last?.seq).toBe(seq);
    expect(curiousOf(s).last?.outcome).toBe('walkOn');
    expect(curiousOf(s).tonight.unanswered).toBe(1);
    expect(maxCurrent).toBe(1);
  });

  it('klicket öppnar kortet med en granskad fråga ur foodtruckens bank, och kvällen går i 1× medan det är öppet', () => {
    let s = until(open(), talkable);
    s = { ...s, speed: 2 };
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const card = curiousOf(s).current!.card!;
    expect(card.total).toBe(CURIOUS.card.seconds);
    const incident = FOODTRUCK_ALL.find((i) => i.id === card.incidentId)!;
    expect(legallyCleared(incident)).toBe(true);
    expect(incident.steps[card.step].question).toBe(card.question);
    expect(effectiveSpeed(s)).toBe(1);
    // Ingen situation öppnas medan kortet är öppet.
    for (let i = 0; i < 20; i++) s = reducer(s, TICK);
    expect(s.incidents?.active ?? null).toBe(null);
  });

  it('rätt svar: en gäst ställer sig i kön, en liten kredit på frågans axel, och svaret i portfolion', () => {
    let s = until(open(), talkable);
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const card = curiousOf(s).current!.card!;
    const best = cardStep(s).options.find((o) => o.quality === 'best')!;
    const before = s.knowledgeCredits[card.axis];
    const guests = s.guests.length;
    s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: best.id });
    const last = curiousOf(s).last!;
    expect(last.outcome).toBe('join');
    expect(last.grade).toBe('right');
    const g = s.guests.find((x) => x.id === last.guestId)!;
    expect(g.fromCurious).toBe(true);
    expect(g.state).toBe('arriving');
    expect(s.guests.length).toBe(guests + 1 + (last.friendId ? 1 : 0));
    expect(s.knowledgeCredits[card.axis]).toBeCloseTo(before + CURIOUS.creditRight);
    expect(CURIOUS.creditRight).toBeLessThan(1);
    expect(s.curiousLog?.at(-1)).toMatchObject({ question: card.question, incidentId: card.incidentId, optionId: best.id, grade: 'right', outcome: 'join' });
  });

  it('fel svar: gästen går vidare, ingen kredit; nästan: gästen tvekar och bestämmer sig sedan', () => {
    let s = until(open(), talkable);
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const credits = { ...s.knowledgeCredits };
    const wrong = cardStep(s).options.find((o) => o.quality === 'wrong')!;
    s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: wrong.id });
    expect(curiousOf(s).last).toMatchObject({ outcome: 'walkOn', grade: 'wrong', guestId: null });
    expect(s.knowledgeCredits).toEqual(credits);
    // Nästa nyfikna med ett nästan-svar (en fråga som har ett sådant).
    let ok = null;
    for (let k = 0; k < 12 && !ok; k++) {
      s = until(s, talkable);
      if (s.day.period !== 'dinner') break;
      s = reducer(s, { type: 'CURIOUS_OPEN' });
      const o = cardStep(s).options.find((x) => x.quality === 'ok');
      if (o) ok = o; else s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: cardStep(s).options.find((x) => x.quality === 'wrong')!.id });
    }
    expect(ok).not.toBe(null);
    const seq = curiousOf(s).current!.seq;
    s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: ok!.id });
    expect(curiousOf(s).current?.okLeft).toBe(CURIOUS.okHoldSeconds);
    s = until(s, (x) => curiousOf(x).current?.seq !== seq);
    expect(curiousOf(s).last?.seq).toBe(seq);
    expect(curiousOf(s).last?.grade).toBe('ok');
  });

  it('samma fråga kommer inte två gånger samma kväll', () => {
    let s = open(3);
    const asked: number[] = [];
    for (let k = 0; k < 8; k++) {
      s = until(s, talkable);
      if (s.day.period !== 'dinner') break;
      s = reducer(s, { type: 'CURIOUS_OPEN' });
      asked.push(curiousOf(s).current!.card!.question);
      s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: cardStep(s).options[0].id });
    }
    expect(asked.length).toBeGreaterThan(4);
    expect(new Set(asked).size).toBe(asked.length);
  });

  it('inga nyfikna utanför foodtrucken', () => {
    let s = open();
    s = { ...s, economy: { ...s.economy, businessClass: 'vinbar' } };
    for (let i = 0; i < 1500; i++) s = reducer(s, TICK);
    expect(curiousOf(s).tonight.passersBy).toBe(0);
  });
});
