// ORDER 280 — Back your knowledge (Vision Owner 2026-09-29, Designs B1):
// spelaren startar själv en raket; krediter kan aldrig köpas.
// ORDER 305b (Anders 2026-10-05) — säkerheten (Gissar / Tror det / Vet det)
// är borttagen: kvitt eller dubbelt ersätter den i både de egna och de
// planerade raketerna, och portfolion registrerar valen.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { BACK, DOUBLE_OR_NOTHING, INCIDENTS } from '../balance';
import { incidentById } from '../incidentBank';
import { canStartBack, rankedStepOption, totalCredits } from '../incidents';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import type { SimulationState } from '../../strategic/types';
import { answerAndWait } from './verdict';

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

// Svarar på stegets fråga; står valet i kvitt eller dubbelt öppet går spelaren vidare.
function answer(s: SimulationState, rank: 'best' | 'worst'): SimulationState {
  const a = s.incidents.active!;
  if (a.choosing) return reducer(s, { type: 'INCIDENT_GO' });
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  // ORDER 310b — svaret avgörs efter låset och väntan.
  return answerAndWait(s, rankedStepOption(step, rank, a.struck, a.situation));
}

function toBackable(s: SimulationState): SimulationState {
  for (let i = 0; i < 20000 && !canStartBack(s) && s.day.period === 'dinner'; i++) {
    if (s.incidents.active) s = answer(s, 'best');
    s = reducer(s, TICK);
  }
  expect(canStartBack(s)).toBe(true);
  return reducer(s, { type: 'START_BACK' });
}
const last = (s: SimulationState) => s.incidents.log[s.incidents.log.length - 1];

describe('ORDER 305b — kvitt eller dubbelt i Stå för ditt svar', () => {
  it('kvitt eller dubbelt är påslaget, och säkerheten finns inte längre', () => {
    expect(DOUBLE_OR_NOTHING.enabled).toBe(true);
    expect(DOUBLE_OR_NOTHING.potHoldsCash).toBe(false);
    expect(DOUBLE_OR_NOTHING.stopTakesStaffOutcome).toBe(false);
    expect(DOUBLE_OR_NOTHING.choiceSeconds).toBe(8);
    expect(Object.keys(BACK)).not.toContain('confidence');
  });

  it('ett rätt steg i en egen raket: potten och valet, inget svar med säkerhet', () => {
    let s = toBackable(evening(3));
    expect(s.incidents.active?.backed).toBe(true);
    const credits0 = totalCredits(s);
    s = answer(s, 'best');
    expect(s.incidents.active?.choosing).toBe(true);
    expect(totalCredits(s)).toBe(credits0);
    s = reducer(s, { type: 'INCIDENT_STOP' });
    expect(last(s)).toMatchObject({ quality: 'stopped', kind: 'backed', step: 1 });
    expect(totalCredits(s)).toBe(credits0 + INCIDENTS.bestAnswerCredit);
    // Kassan rörs aldrig av potten.
    expect(s.ledger.some((l) => (l.category as string) === 'bet')).toBe(false);
  });

  it('gå vidare och svara fel: potten förloras, och portfolion registrerar valet', () => {
    let s = toBackable(evening(3));
    s = answer(s, 'best');
    s = reducer(s, { type: 'INCIDENT_GO' });
    s = answer(s, 'worst');
    expect(s.incidents.active).toBeNull();
    expect(last(s).pot).toMatchObject({ taken: false });
    expect(s.kvittLog?.at(-1)).toMatchObject({ choice: 'goWrong', step: 1 });
    expect(s.incidents.kvittTonight?.goWrong).toBeGreaterThanOrEqual(1);
  });

  it('portfolion: gå vidare och ha rätt, och stanna med rätt', () => {
    let s = toBackable(evening(3));
    s = answer(s, 'best');
    s = reducer(s, { type: 'INCIDENT_GO' });
    s = answer(s, 'best');
    expect(s.kvittLog?.at(-1)).toMatchObject({ choice: 'goRight', step: 1 });
    s = reducer(s, { type: 'INCIDENT_STOP' });
    expect(s.kvittLog?.at(-1)).toMatchObject({ choice: 'stopRight', step: 2 });
  });

  it('tiden ute på första steget räknas som fel med raketens vanliga kostnad', () => {
    let s = toBackable(evening(3));
    const credits0 = totalCredits(s);
    for (let i = 0; i < 20000 && s.incidents.active?.backed; i++) s = reducer(s, TICK);
    expect(last(s).quality).toBe('staff');
    expect(totalCredits(s)).toBeGreaterThanOrEqual(credits0 - INCIDENTS.timeoutCreditPenalty);
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
    const s = withCredits(makeNewGameState(2), 5);
    const after = reducer(reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' }), { type: 'BUY_ITEMS', items: { 'chicken-plate': 5 } });
    expect(totalCredits(after)).toBe(totalCredits(s));
  });
});
