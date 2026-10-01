// ORDER 276 — raketerna styr gästflödet (Vision Owner 2026-09-28, provspel):
// "fler rätta svar ger fler gäster in i lokalen, som köper mer ur lagret."

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { INCIDENTS } from '../balance';
import { incidentById } from '../incidentBank';
import { rankedStepOption } from '../incidents';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function evening(seed: number): SimulationState {
  let s = makeNewGameState(seed);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } };
  s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
  s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-extra-covers' });
  return reducer(s, { type: 'START_SERVICE' });
}

function answer(s: SimulationState, rank: 'best' | 'worst'): SimulationState {
  const a = s.incidents.active!;
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, rank, a.struck, a.situation) });
}

function toFirstRocket(s: SimulationState): SimulationState {
  for (let i = 0; i < 20000 && !s.incidents.active && s.day.period === 'dinner'; i++) s = reducer(s, TICK);
  expect(s.incidents.active).not.toBeNull();
  return s;
}

describe('ORDER 276 — raketerna styr gästflödet', () => {
  it('ett klarat steg släpper in en gäst, och en hel raket en till', () => {
    const s = toFirstRocket(evening(3));
    const before = s.scenario.spawnedRemaining;
    const one = answer(s, 'best');
    expect(one.scenario.spawnedRemaining - before).toBe(INCIDENTS.guestsPerClearedStep);
    expect(one.incidents.active!.revealed?.guestsIn).toBe(INCIDENTS.guestsPerClearedStep);
    const done = answer(answer(one, 'best'), 'best');
    expect(done.incidents.active).toBeNull();
    expect(done.scenario.spawnedRemaining - before).toBe(3 * INCIDENTS.guestsPerClearedStep + INCIDENTS.guestsOnRocketCleared);
    expect(done.incidents.lastOutcome?.reveal?.guestsIn).toBe(INCIDENTS.guestsPerClearedStep + INCIDENTS.guestsOnRocketCleared);
  });

  it('ett fel släpper inte in någon', () => {
    const s = toFirstRocket(evening(3));
    const after = answer(s, 'worst');
    expect(after.scenario.spawnedRemaining).toBe(s.scenario.spawnedRemaining);
    expect(after.incidents.lastOutcome?.reveal?.guestsIn ?? 0).toBe(0);
  });

  it('en kväll med rätta svar har fler gäster och säljer mer ur lagret än en med fel', () => {
    const play = (rank: 'best' | 'worst', seed: number) => {
      let s = evening(seed);
      const seen = new Set<string>();
      for (let i = 0; i < 20000 && s.day.period === 'dinner'; i++) {
        if (s.incidents.active && !(s.incidents.active.revealLeft ?? 0)) s = answer(s, rank);
        s = reducer(s, TICK);
        for (const g of s.guests) seen.add(g.id);
      }
      const revenue = s.ledger.filter((l) => l.category === 'revenue' && l.causeId === 'dinner').reduce((sum, l) => sum + l.amount, 0);
      return { guests: seen.size, revenue };
    };
    // ORDER 288 — med rivalerna i byn är kvällens tak lägre och en enskild
    // kväll brusigare (frö 3 gav fler gäster men lägre intäkt med rätt
    // svar). Summan över fyra frön.
    const sum = (rank: 'best' | 'worst') => [1, 2, 3, 4].map((seed) => play(rank, seed)).reduce((a, b) => ({ guests: a.guests + b.guests, revenue: a.revenue + b.revenue }));
    const good = sum('best');
    const bad = sum('worst');
    expect(good.guests).toBeGreaterThan(bad.guests);
    expect(good.revenue).toBeGreaterThan(bad.revenue);
  });
});
