// ORDER 264 (Nexus v1 etapp 2) — quizen efter servicen och kvällen.
//
// Speldesign > Quizen efter servicen: tre frågor från kvällens svagaste
// axel, rätt +1 kredit, fel −1, kan hoppas över utan kostnad.
// F17: kvällen varar EVENING.simSeconds, väntar medan quizen pågår och
// kan avslutas av spelaren.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { EVENING, POST_SERVICE_QUIZ } from '../../../sim/balance';
import { problemCountsSince, weakestAxis } from '../postServiceQuiz';
import { bankQuestionById } from '../questionBank';
import type { EventStreamEntry, SimulationState } from '../../types';

function tick(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
  return s;
}

function toEvening(seed = 4): SimulationState {
  let s = makeInitialState(seed);
  s = reducer(s, { type: 'START_SERVICE' });
  for (let i = 0; i < 20000 && s.day.period !== 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
  expect(s.day.period).toBe('evening');
  return s;
}

function problem(kind: string, at: number): EventStreamEntry {
  return { at, text: '', category: 'ambient', causeTag: 'low_competence', causeChainId: null, sustainability: 'social', kind, scenarioId: null };
}

describe('ORDER 264 — kvällens svagaste axel (F16)', () => {
  it('axeln med flest problemhändelser under servicen', () => {
    const s = { ...makeInitialState(1), eventStream: [problem('kitchen_slip', 10), problem('bottleneck', 20), problem('wait_stretched', 30)] };
    expect(problemCountsSince(s, 0)).toEqual({ episteme: 0, techne: 2, phronesis: 1 });
    expect(weakestAxis(s, 0)).toBe('techne');
    // Händelser före servicen räknas inte.
    expect(weakestAxis(s, 25)).toBe('phronesis');
  });

  it('vid lika eller inga problem: axeln med minst krediter', () => {
    const s = { ...makeInitialState(1), knowledgeCredits: { episteme: 5, techne: 1, phronesis: 3 } };
    expect(weakestAxis(s, 0)).toBe('techne');
  });
});

describe('ORDER 264 — quizen efter servicen', () => {
  it('erbjuds när kvällen börjar, med kvällens svagaste axel', () => {
    const s = toEvening();
    expect(s.postServiceQuiz).toMatchObject({ status: 'offered', creditDelta: 0 });
  });

  it('tre frågor från axeln; rätt ger +1, fel kostar 1', () => {
    let s = toEvening();
    s = { ...s, knowledgeCredits: { episteme: 5, techne: 5, phronesis: 5 }, knowledgeTracks: {
      episteme: { untagged: 5, sommellerie: 0, kok: 0 },
      techne: { untagged: 5, sommellerie: 0, kok: 0 },
      phronesis: { untagged: 5, sommellerie: 0, kok: 0 }
    } };
    s = reducer(s, { type: 'START_QUIZ' });
    const quiz = s.postServiceQuiz!;
    expect(quiz.status).toBe('active');
    expect(quiz.questionIds).toHaveLength(POST_SERVICE_QUIZ.questions);
    const axis = quiz.axis;
    for (const id of quiz.questionIds) expect(bankQuestionById(id)!.axis).toBe(axis);
    const start = s.knowledgeCredits[axis];
    const pattern = [true, false, true];
    for (let i = 0; i < pattern.length; i++) {
      const q = bankQuestionById(s.postServiceQuiz!.questionIds[i])!;
      s = reducer(s, { type: 'ANSWER_QUIZ', chosenIndex: pattern[i] ? q.correctIndex : (q.correctIndex + 1) % 4 });
      expect(s.postServiceQuiz!.showingExplanation).toBe(true);
      s = reducer(s, { type: 'NEXT_QUIZ_QUESTION' });
    }
    expect(s.knowledgeCredits[axis] - start).toBe(1);
    expect(s.postServiceQuiz).toMatchObject({ status: 'done', creditDelta: 1 });
    expect(s.postServiceQuizzesTaken).toBe(1);
  });

  it('krediterna går aldrig under noll', () => {
    let s = toEvening();
    s = reducer(s, { type: 'START_QUIZ' });
    const axis = s.postServiceQuiz!.axis;
    for (let i = 0; i < POST_SERVICE_QUIZ.questions; i++) {
      const q = bankQuestionById(s.postServiceQuiz!.questionIds[i])!;
      s = reducer(s, { type: 'ANSWER_QUIZ', chosenIndex: (q.correctIndex + 1) % 4 });
      s = reducer(s, { type: 'NEXT_QUIZ_QUESTION' });
    }
    expect(s.knowledgeCredits[axis]).toBe(0);
  });

  it('att hoppa över kostar inget', () => {
    let s = toEvening();
    const before = s.knowledgeCredits;
    s = reducer(s, { type: 'SKIP_QUIZ' });
    expect(s.postServiceQuiz!.status).toBe('skipped');
    expect(s.knowledgeCredits).toEqual(before);
  });

  it('kvällen väntar medan quizen pågår, och går vidare när den är klar', () => {
    let s = toEvening();
    const day = s.day.dayNumber;
    s = reducer(s, { type: 'START_QUIZ' });
    s = tick(s, EVENING.simSeconds * 5 + 50);
    expect(s.day.dayNumber).toBe(day);
    expect(reducer(s, { type: 'END_EVENING' })).toBe(s);
    for (let i = 0; i < POST_SERVICE_QUIZ.questions; i++) {
      s = reducer(s, { type: 'ANSWER_QUIZ', chosenIndex: 0 });
      s = reducer(s, { type: 'NEXT_QUIZ_QUESTION' });
    }
    s = tick(s, 2);
    expect(s.day.dayNumber).toBe(day + 1);
    expect(s.postServiceQuiz).toBeNull();
  });

  it('utan quiz: nästa morgon efter EVENING.simSeconds, eller direkt med END_EVENING', () => {
    let s = toEvening();
    const day = s.day.dayNumber;
    s = tick(s, EVENING.simSeconds * 5 - 10);
    expect(s.day.dayNumber).toBe(day);
    s = tick(s, 20);
    expect(s.day.dayNumber).toBe(day + 1);
    let t = toEvening();
    t = reducer(t, { type: 'END_EVENING' });
    t = tick(t, 1);
    expect(t.day.dayNumber).toBe(day + 1);
  });
});
