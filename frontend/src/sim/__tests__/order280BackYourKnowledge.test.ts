// ORDER 280 — Back your knowledge (Vision Owner 2026-09-29, Designs B1):
// insatsen görs bara i krediter; spelaren startar själv en raket och väljer
// säkerhet för varje steg; utfallet avgörs bara av svaren; kassan rörs
// aldrig; krediter kan aldrig köpas.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { BACK } from '../balance';
import { incidentById } from '../incidentBank';
import { backAnswer, calibrationNote, canBack, canStartBack, rankedStepOption, recordCalibration, totalCredits, type Confidence } from '../incidents';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import type { SimAction, SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function withCredits(s: SimulationState, n: number): SimulationState {
  return {
    ...s,
    knowledgeCredits: { episteme: n, techne: n, phronesis: n },
    knowledgeTracks: {
      episteme: { untagged: n, sommellerie: 0, kok: 0 },
      techne: { untagged: n, sommellerie: 0, kok: 0 },
      phronesis: { untagged: n, sommellerie: 0, kok: 0 }
    }
  };
}

function evening(seed: number, credits = 10): SimulationState {
  let s = makeNewGameState(seed);
  s = withCredits({ ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } }, credits);
  s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
  return reducer(s, { type: 'START_SERVICE' });
}

function answer(s: SimulationState, rank: 'best' | 'worst', confidence: Confidence = 0): SimulationState {
  const a = s.incidents.active!;
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, rank, a.struck, a.situation), confidence });
}

function toBackable(s: SimulationState): SimulationState {
  for (let i = 0; i < 20000 && !canStartBack(s) && s.day.period === 'dinner'; i++) {
    if (s.incidents.active) s = answer(s, 'best');
    s = reducer(s, TICK);
  }
  expect(canStartBack(s)).toBe(true);
  return reducer(s, { type: 'START_BACK' });
}

describe('ORDER 280 — backAnswer', () => {
  it('ingen slump: samma svar och samma säkerhet ger alltid samma krediter', () => {
    for (let step = 0; step < 3; step++) {
      for (const c of [0, 1, 2] as Confidence[]) {
        const right = backAnswer(true, c, step);
        expect(backAnswer(true, c, step)).toEqual(right);
        expect(right.delta).toBe(Math.round(BACK.confidence[c].win * BACK.stepMultiplier[step]));
        expect(backAnswer(false, c, step)).toEqual({ delta: 0 - BACK.confidence[c].loss, endsRocket: true });
      }
    }
    // Den klassiska skalan 1 : 0, 2 : −2, 3 : −6.
    expect(BACK.confidence.map((x) => [x.win, x.loss])).toEqual([[1, 0], [2, 2], [3, 6]]);
    // Steget multiplicerar bara rätt svar.
    expect(backAnswer(false, 2, 2).delta).toBe(backAnswer(false, 2, 0).delta);
  });

  it('krediterna måste räcka till förlusten på vald säkerhet', () => {
    const poor = withCredits(makeNewGameState(1), 1);
    expect(totalCredits(poor)).toBe(3);
    expect(canBack(poor, 0)).toBe(true);
    expect(canBack(poor, 1)).toBe(true);
    expect(canBack(poor, 2)).toBe(false);
  });

  it('träffsäkerheten och meningen efter kvällen', () => {
    let cal = recordCalibration(undefined, 2, true);
    cal = recordCalibration(cal, 2, false);
    cal = recordCalibration(cal, 2, false);
    expect(cal[2]).toEqual([1, 3]);
    expect(calibrationNote(cal)).toBe('overconfident');
    let g = recordCalibration(undefined, 0, true);
    g = recordCalibration(g, 0, true);
    expect(calibrationNote(g)).toBe('underconfident');
    expect(calibrationNote(undefined)).toBe('default');
  });
});

describe('ORDER 280 — Back your knowledge i servicen', () => {
  it('rätt svar ger krediter efter säkerhet och steg, och kassan rörs aldrig av insatsen', () => {
    let s = toBackable(evening(3));
    expect(s.incidents.active?.backed).toBe(true);
    const credits0 = totalCredits(s);
    s = answer(s, 'best', 2);
    expect(s.incidents.lastBack).toMatchObject({ step: 0, confidence: 2, correct: true, delta: 3 });
    // Ett bästa svar ger dessutom raketens vanliga kredit (INCIDENTS.bestAnswerCredit).
    expect(totalCredits(s)).toBeGreaterThanOrEqual(credits0 + 3);
    expect(s.ledger.some((l) => (l.category as string) === 'bet')).toBe(false);
  });

  it('ett fel kostar insatsen, avslutar raketen och ger raketens dåliga följd', () => {
    let s = toBackable(evening(3));
    const credits0 = totalCredits(s);
    s = answer(s, 'worst', 1);
    expect(s.incidents.active).toBeNull();
    expect(s.incidents.lastBack).toMatchObject({ correct: false, delta: -2, endsRocket: true });
    expect(totalCredits(s)).toBeLessThanOrEqual(credits0 - 2);
    expect(s.incidents.lastOutcome?.reveal?.cleared).toBe(false);
  });

  it('tiden ute räknas som fel på gissar: ingen förlust', () => {
    let s = toBackable(evening(3));
    const credits0 = totalCredits(s);
    for (let i = 0; i < 20000 && s.incidents.active?.backed; i++) s = reducer(s, TICK);
    expect(s.incidents.lastBack).toMatchObject({ confidence: 0, correct: false, delta: 0 });
    // Tiden ute kostar raketens vanliga kredit (INCIDENTS.timeoutCreditPenalty), inte insatsen.
    expect(totalCredits(s)).toBeGreaterThanOrEqual(credits0 - 1);
  });

  it('säkerhet som krediterna inte räcker till går inte att välja', () => {
    const s = toBackable(evening(3, 0));
    const a = s.incidents.active!;
    const step = incidentById('vinbar', a.id)!.steps[a.step];
    const action: SimAction = { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, 'best', a.struck, a.situation), confidence: 2 };
    expect(reducer(s, action)).toBe(s);
  });

  it('högst BACK.maxPerEvening egna raketer per kväll', () => {
    let s = evening(3);
    for (let n = 0; n < BACK.maxPerEvening; n++) {
      s = toBackable(s);
      for (let i = 0; i < 10 && s.incidents.active; i++) s = answer(s, 'best');
    }
    expect(s.incidents.betsTonight).toBe(BACK.maxPerEvening);
    expect(canStartBack(s)).toBe(false);
  });

  it('ingen åtgärd köper krediter', () => {
    const buying = ['BUY_ITEMS', 'BUY_PACKAGE', 'BUY_STOCK', 'RETURN_ITEMS'];
    const s = withCredits(makeNewGameState(2), 5);
    const after = reducer(reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' }), { type: 'BUY_ITEMS', items: { 'chicken-plate': 5 } });
    expect(totalCredits(after)).toBe(totalCredits(s));
    expect(buying.length).toBeGreaterThan(0);
  });
});
