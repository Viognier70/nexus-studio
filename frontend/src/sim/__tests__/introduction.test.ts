// ORDER 267 (Nexus v1 etapp 5) — introduktionen i simuleringen:
// övningsbesök, prov och bankmötet som öppnar den första verksamheten
// (sim/introduction.ts, F33).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { bankQuestionById } from '../../strategic/knowledge/questionBank';
import { introductionStep } from '../introduction';
import { classOptions, V1_CLASS_TO_ROOM } from '../economy';
import { currentOffer } from '../ladder';
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

  // ORDER 315b (Anders 2026-10-07, BESLUT del 2) — inträdesprovet: Åsa
  // erbjuder foodtrucken vid Torget (ersätter bankens val av första verksamhet).
  it('inträdet: Åsa erbjuder foodtrucken; Ta över ger foodtrucken utan lån, rummet, ryktet orört', () => {
    let s = newPlayer();
    s = visit(s, 'stensota', 'practice', 0);
    s = visit(s, 'stensota', 'exam', EXAM.questionsDrawn);
    expect(introductionStep(s)).toBe('bank');
    expect(currentOffer(s)).toMatchObject({ to: 'foodtruck', depositSek: 0, loanSek: 0, state: 'offered' });
    // Bankens val av första verksamhet finns inte i introduktionen.
    expect(reducer(s, { type: 'CHOOSE_CLASS', to: 'vinbar' })).toBe(s);
    const reputation = s.reputation;
    s = reducer(s, { type: 'LADDER_TAKE' });
    expect(s.economy.businessClass).toBe('foodtruck');
    expect(s.economy.loan).toBeNull();
    expect(s.businessClass).toBe(V1_CLASS_TO_ROOM.foodtruck);
    expect(s.team.members.map((m) => m.role).sort()).toEqual(['kock', 'lärling']);
    expect(s.reputation).toBe(reputation);
    expect(s.ladder).toMatchObject({ step: 'foodtruck', reachedOnDay: { foodtruck: s.day.dayNumber } });
    expect(s.introduction).toBeNull();
    expect(introductionStep(s)).toBeNull();
  });

  it('inträdet: Inte än står kvar, och erbjudandet kan tas senare', () => {
    let s = visit(visit(newPlayer(), 'stensota', 'practice', 0), 'stensota', 'exam', EXAM.questionsDrawn);
    s = reducer(s, { type: 'LADDER_DECLINE' });
    expect(currentOffer(s)!.state).toBe('declined');
    expect(s.economy.businessClass).toBeNull();
    expect(reducer(s, { type: 'LADDER_TAKE' }).economy.businessClass).toBe('foodtruck');
  });

  // ORDER 291 (provspel av 4795192) — brons i Metodköket öppnade förut
  // ölkrogen som första verksamhet. Den första verksamheten är vinbar eller
  // food truck; ölkrogen byggs i etapp 8.
  it('brons i Metodköket öppnar inte ölkrogen; banken erbjuder food trucken', () => {
    let s = newPlayer();
    s = visit(s, 'metodkoket', 'practice', 0);
    s = visit(s, 'metodkoket', 'exam', EXAM.questionsDrawn);
    const status = Object.fromEntries(classOptions(s).map((o) => [o.id, o.status]));
    expect(status.olkrog).toBe('notBuilt');
    expect(status.restaurang).toBe('notFirst');
    expect(status.vinbar).toBe('requirements');
    expect(status.foodtruck).toBe('available');
    expect(reducer(s, { type: 'CHOOSE_CLASS', to: 'olkrog' }).economy.businessClass).toBeNull();
  });

  it('utanför introduktionen gäller klasstabellens krav (brons i tre för vinbaren)', () => {
    let s = makeNewGameState(7);
    s = { ...s, economy: { ...s.economy, businessClass: null, loan: null } };
    s = visit(s, 'stensota', 'exam', EXAM.questionsDrawn);
    expect(classOptions(s).find((o) => o.id === 'vinbar')?.status).toBe('requirements');
  });
});
