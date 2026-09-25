// ORDER 264 (Nexus v1 etapp 2) — quizen efter servicen.
//
// Speldesign > Kunskapen > Quizen efter servicen: "Efter varje kväll
// erbjuds tre frågor från kvällens svagaste axel, den som låg bakom
// flest problem i kvällsberättelsen. Rätt svar ger en kredit, fel svar
// kostar en. Spelaren kan hoppa över quizen utan kostnad, men får då
// inget. Quizen är ett erbjudande, inte ett avbrott."
//
// Kvällens svagaste axel (F16): problemhändelserna i strömmen under
// kvällens service räknas per kunskapsaxel enligt tabellen nedan. Flest
// problem vinner. Vid lika, eller om inget gick fel, väljs axeln där
// spelaren har minst krediter.

import { POST_SERVICE_QUIZ } from '../../sim/balance';
import { createRng } from '../util/rng';
import type { KnowledgeAxis, PostServiceQuizState, SimulationState } from '../types';
import { authoredQuestions, bankQuestionById, type BankQuestion } from './questionBank';

// Händelsetyp i strömmen → kunskapsaxeln bakom problemet. Samma typer
// som `KIND_COMPETENCE_AXIS` i simulation/eventStream.ts, men mot
// kunskapsaxlarna: köket och flödet är hantverk (techne), bemötande,
// väntan och rummet är omdöme (fronesis), leveranser och råvarukunskap
// är vetande (episteme).
export const PROBLEM_KIND_AXIS: Readonly<Record<string, KnowledgeAxis>> = {
  kitchen_slip: 'techne',
  bottleneck: 'techne',
  turnover_stumble: 'techne',
  prep_kitchen: 'techne',
  service_slip: 'phronesis',
  wait_stretched: 'phronesis',
  prep_room: 'phronesis',
  delivery_short: 'episteme',
  prep_delivery: 'episteme'
};

const AXES: readonly KnowledgeAxis[] = ['episteme', 'techne', 'phronesis'];

// En problemhändelse: omgivningshändelse med en orsak (inte positiv,
// inte ett scenarioutfall).
function isProblem(e: SimulationState['eventStream'][number]): boolean {
  return e.category === 'ambient' && e.causeTag !== null && PROBLEM_KIND_AXIS[e.kind] !== undefined;
}

export function problemCountsSince(state: SimulationState, since: number): Record<KnowledgeAxis, number> {
  const counts: Record<KnowledgeAxis, number> = { episteme: 0, techne: 0, phronesis: 0 };
  for (const e of state.eventStream) {
    if (e.at < since || !isProblem(e)) continue;
    counts[PROBLEM_KIND_AXIS[e.kind]] += 1;
  }
  return counts;
}

export function weakestAxis(state: SimulationState, since: number): KnowledgeAxis {
  const counts = problemCountsSince(state, since);
  const most = Math.max(...AXES.map((a) => counts[a]));
  const candidates = AXES.filter((a) => counts[a] === most);
  if (candidates.length === 1) return candidates[0];
  return [...candidates].sort((a, b) => state.knowledgeCredits[a] - state.knowledgeCredits[b])[0];
}

// Erbjudandet när kvällen börjar.
export function offerQuiz(state: SimulationState, serviceStartedAt: number): PostServiceQuizState {
  return {
    axis: weakestAxis(state, serviceStartedAt),
    status: 'offered',
    questionIds: [],
    answers: [],
    showingExplanation: false,
    creditDelta: 0
  };
}

export function startQuiz(state: SimulationState): SimulationState {
  const quiz = state.postServiceQuiz;
  if (!quiz || quiz.status !== 'offered') return state;
  const pool = authoredQuestions().filter((q) => q.axis === quiz.axis);
  if (pool.length < POST_SERVICE_QUIZ.questions) return state;
  const rng = createRng(state.rngState);
  const picked: BankQuestion[] = [];
  const left = [...pool];
  while (picked.length < POST_SERVICE_QUIZ.questions) {
    const i = Math.floor(rng.next() * left.length);
    picked.push(left.splice(i, 1)[0]);
  }
  return {
    ...state,
    rngState: rng.state,
    postServiceQuiz: { ...quiz, status: 'active', questionIds: picked.map((q) => q.id) }
  };
}

export function answerQuiz(
  quiz: PostServiceQuizState,
  chosenIndex: number
): { quiz: PostServiceQuizState; question: BankQuestion; correct: boolean } | null {
  if (quiz.status !== 'active' || quiz.showingExplanation) return null;
  const questionId = quiz.questionIds[quiz.answers.length];
  const question = questionId ? bankQuestionById(questionId) : null;
  if (!question) return null;
  if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= question.options.length) return null;
  const correct = chosenIndex === question.correctIndex;
  const delta = correct ? POST_SERVICE_QUIZ.creditOnCorrect : POST_SERVICE_QUIZ.creditOnWrong;
  return {
    quiz: {
      ...quiz,
      answers: [...quiz.answers, { questionId, chosenIndex, correct }],
      showingExplanation: true,
      creditDelta: quiz.creditDelta + delta
    },
    question,
    correct
  };
}

export function nextQuizQuestion(state: SimulationState): SimulationState {
  const quiz = state.postServiceQuiz;
  if (!quiz || quiz.status !== 'active' || !quiz.showingExplanation) return state;
  const done = quiz.answers.length >= quiz.questionIds.length;
  return {
    ...state,
    postServiceQuizzesTaken: state.postServiceQuizzesTaken + (done ? 1 : 0),
    postServiceQuiz: { ...quiz, showingExplanation: false, status: done ? 'done' : 'active' }
  };
}

export function skipQuiz(state: SimulationState): SimulationState {
  const quiz = state.postServiceQuiz;
  if (!quiz || quiz.status !== 'offered') return state;
  return { ...state, postServiceQuiz: { ...quiz, status: 'skipped' } };
}
