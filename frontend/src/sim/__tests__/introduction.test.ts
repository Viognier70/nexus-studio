// ORDER 267 (Nexus v1 etapp 5) — introduktionen i simuleringen:
// övningsbesök, prov och bankmötet som öppnar den första verksamheten
// (sim/introduction.ts, F33).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { bankQuestionById } from '../../strategic/knowledge/questionBank';
import { introductionStep } from '../introduction';
import { classOptions, startLoanSek, V1_CLASS_TO_ROOM } from '../economy';
import { DAY, EXAM } from '../balance';
import type { SimulationState } from '../../strategic/types';

function visit(s: SimulationState, pavilion: 'stensota' | 'metodkoket', mode: 'practice' | 'exam', correct: number): SimulationState {
  s = reducer(s, { type: 'VISIT_PAVILION', pavilion, mode });
  const v = s.pavilionVisit;
  if (!v) throw new Error('besöket startade inte');
  for (let i = 0; i < v.questionIds.length; i++) {
    const q = bankQuestionById(s.pavilionVisit!.questionIds[i])!;
    s = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: i < correct ? q.correctIndex : (q.correctIndex + 1) % q.options.length });
    s = reducer(s, { type: 'NEXT_VISIT_QUESTION' });
  }
  return reducer(s, { type: 'CLOSE_VISIT' });
}

function newPlayer(): SimulationState {
  return reducer(makeNewGameState(7), { type: 'BEGIN_INTRODUCTION' });
}

describe('ORDER 267 — introduktionen', () => {
  it('börjar utan verksamhet och utan lån, med övningsbesöket', () => {
    const s = newPlayer();
    expect(s.economy.businessClass).toBeNull();
    expect(s.economy.loan).toBeNull();
    expect(introductionStep(s)).toBe('practice');
  });

  it('övning → prov → bank; besöken tar ingen schemaplats, ett underkänt prov kan göras om', () => {
    let s = newPlayer();
    s = visit(s, 'stensota', 'practice', 0);
    expect(introductionStep(s)).toBe('exam');
    // Fler besök än morgonens schemaplatser, samma morgon.
    for (let i = 0; i < DAY.scheduleSlots; i++) {
      s = visit(s, 'stensota', 'exam', 0);
      expect(s.medals.stensota).toBeUndefined();
    }
    s = visit(s, 'stensota', 'exam', EXAM.questionsDrawn);
    expect(s.medals.stensota).toBe('brons');
    expect(introductionStep(s)).toBe('bank');
    expect(s.day.pavilionVisitsToday ?? []).toEqual([]);
  });

  it('bankmötet: brons i Stensöta öppnar vinbaren, inte ölkrogen; startlån, rummet, ryktet orört', () => {
    let s = newPlayer();
    s = visit(s, 'stensota', 'practice', 0);
    s = visit(s, 'stensota', 'exam', EXAM.questionsDrawn);
    const status = Object.fromEntries(classOptions(s).map((o) => [o.id, o.status]));
    expect(status.vinbar).toBe('available');
    expect(status.olkrog).toBe('requirements');
    const reputation = s.reputation;
    s = reducer(s, { type: 'CHOOSE_CLASS', to: 'vinbar' });
    expect(s.economy.businessClass).toBe('vinbar');
    expect(s.economy.loan?.principalSek).toBe(startLoanSek('vinbar'));
    expect(s.businessClass).toBe(V1_CLASS_TO_ROOM.vinbar);
    expect(s.reputation).toBe(reputation);
    expect(s.introduction).toBeNull();
    expect(introductionStep(s)).toBeNull();
  });

  it('brons i Metodköket öppnar ölkrogen', () => {
    let s = newPlayer();
    s = visit(s, 'metodkoket', 'practice', 0);
    s = visit(s, 'metodkoket', 'exam', EXAM.questionsDrawn);
    const status = Object.fromEntries(classOptions(s).map((o) => [o.id, o.status]));
    expect(status.olkrog).toBe('available');
    expect(status.vinbar).toBe('requirements');
  });

  it('utanför introduktionen gäller klasstabellens krav (brons i tre för vinbaren)', () => {
    let s = makeNewGameState(7);
    s = { ...s, economy: { ...s.economy, businessClass: null, loan: null } };
    s = visit(s, 'stensota', 'exam', EXAM.questionsDrawn);
    expect(classOptions(s).find((o) => o.id === 'vinbar')?.status).toBe('requirements');
  });
});
