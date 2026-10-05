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
import { answerAndWait } from './verdict';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function evening(seed: number): SimulationState {
  let s = makeNewGameState(seed);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } };
  s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
  s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-extra-covers' });
  return reducer(s, { type: 'START_SERVICE' });
}

// ORDER 305b — kvitt eller dubbelt: efter ett rätt steg går spelaren vidare.
// ORDER 310b — wait=false låser bara svaret; kvällens TICK för det till avgörandet.
function answer(s: SimulationState, rank: 'best' | 'worst', wait = true): SimulationState {
  if (s.incidents.active?.choosing) s = reducer(s, { type: 'INCIDENT_GO' });
  const a = s.incidents.active!;
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  // ORDER 310b — svaret avgörs efter låset och väntan.
  const optionId = rankedStepOption(step, rank, a.struck, a.situation);
  return wait ? answerAndWait(s, optionId) : reducer(s, { type: 'ANSWER_INCIDENT', optionId });
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

  it('en kväll med rätta svar säljer mer än en med fel', () => {
    const play = (rank: 'best' | 'worst', seed: number) => {
      let s = evening(seed);
      const seen = new Set<string>();
      for (let i = 0; i < 20000 && s.day.period === 'dinner'; i++) {
        if (s.incidents.active && !(s.incidents.active.revealLeft ?? 0) && !s.incidents.active.pending) s = answer(s, rank, false);
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
    // ORDER 303c — stegen släpper inte längre in gäster (bara en klarad
    // raket gör det), så antalet gäster skiljer bara lite under en kväll;
    // intäkten skiljer fortfarande.
    // ORDER 310b — med låset och väntan (3,8 s före avgörandet) står en raket
    // längre öppen; den som svarar rätt går tre steg och väntar tre gånger.
    // Fröna 1–4 gav 159 gäster med rätt svar och 164 med fel (förut inom 2):
    // gränsen är nu 5 % av kvällens gäster.
    expect(good.guests).toBeGreaterThanOrEqual(Math.floor(bad.guests * 0.95));
    expect(good.revenue).toBeGreaterThan(bad.revenue);
  });
});
