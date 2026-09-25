// ORDER 264 (Nexus v1 etapp 2) — paviljongsbesök, prov och medaljer.
//
// Speldesign > Kunskapen:
//   - Ett besök kostar en schemaplats och är Öva eller Prov.
//   - Öva: fem frågor med förklaring efter varje svar; ger krediter.
//   - Prov: åtta av nivåns tio frågor i slumpvis ordning; sex rätt ger
//     medaljen; omprov drar på nytt; nivån under krävs.
//   - Medaljer kan aldrig förloras. Platina är taket.
//   - Teatern är låst tills spelaren har silver i två paviljonger.
// Alla tal kommer från `src/sim/balance.ts`. Varje rätt svar ger en
// kredit på frågans axel (och spår), i både Öva och Prov.
//
// Medaljer skrivs bara av `awardMedal` (och `carryKnowledge` i
// src/sim/save.ts), som tar högsta av gammal och ny. Testet
// `__tests__/medals.test.ts` hävdar att ingen annan väg skriver dem.

import { EXAM, MEDAL_LEVELS, PAVILIONS, PRACTICE, type MedalLevel } from '../../sim/balance';
import { calendarFor } from '../../sim/calendar';
import { createRng } from '../util/rng';
import type {
  MedalLevelId,
  PavilionKey,
  PavilionVisitState,
  SimulationState
} from '../types';
import { bankQuestionById, questionsFor, type BankQuestion } from './questionBank';

export const THEATRE: PavilionKey = 'gastronomiskateatern';

// Placeholder för Teatern tills Vision Owner skrivit dess frågor (F6):
// "Teaterns frågor kombinerar två områden, till exempel en rätt och dess
// vin" — köket och sommellerien.
const THEATRE_PLACEHOLDER_SOURCES: readonly PavilionKey[] = ['metodkoket', 'stensota'];

export function medalRank(level: MedalLevelId | undefined): number {
  return level ? MEDAL_LEVELS.indexOf(level as MedalLevel) + 1 : 0;
}

// Nästa nivå att pröva, eller null om spelaren har platina.
export function nextExamLevel(held: MedalLevelId | undefined): MedalLevelId | null {
  const rank = medalRank(held);
  return rank < MEDAL_LEVELS.length ? MEDAL_LEVELS[rank] : null;
}

// Öva på den nivå spelaren arbetar mot; platina om den redan är tagen.
export function practiceLevel(held: MedalLevelId | undefined): MedalLevelId {
  return nextExamLevel(held) ?? MEDAL_LEVELS[MEDAL_LEVELS.length - 1];
}

export function awardMedal(
  medals: SimulationState['medals'],
  pavilion: PavilionKey,
  level: MedalLevelId
): SimulationState['medals'] {
  if (medalRank(level) <= medalRank(medals[pavilion])) return medals;
  return { ...medals, [pavilion]: level };
}

export function countPavilionsAtLeast(medals: SimulationState['medals'], level: MedalLevelId): number {
  const need = medalRank(level);
  return Object.values(medals).filter((m) => medalRank(m) >= need).length;
}

export function isPavilionUnlocked(state: SimulationState, pavilion: PavilionKey): boolean {
  if (pavilion !== THEATRE) return true;
  const others = { ...state.medals };
  delete others[THEATRE];
  return countPavilionsAtLeast(others, PAVILIONS.theatreUnlock.level) >= PAVILIONS.theatreUnlock.pavilions;
}

export function hasPlatinumReward(state: SimulationState, pavilion: PavilionKey): boolean {
  return state.medals[pavilion] === MEDAL_LEVELS[MEDAL_LEVELS.length - 1];
}

// Frågorna en paviljong har på en nivå.
export function visitPool(pavilion: PavilionKey, level: MedalLevelId): BankQuestion[] {
  if (pavilion !== THEATRE) return questionsFor(pavilion, level);
  return THEATRE_PLACEHOLDER_SOURCES.flatMap((p) =>
    questionsFor(p, level).map((q) => ({ ...q, id: `${q.sourceId}@${level}`, level, placeholder: true }))
  );
}

export function scheduleSlotsUsed(state: SimulationState): number {
  return state.day.pickedActivityIds.length + (state.day.pavilionVisitsToday?.length ?? 0);
}

export function scheduleSlotsLeft(state: SimulationState): number {
  return calendarFor(state.day.dayNumber).scheduleSlots - scheduleSlotsUsed(state);
}

function shuffle<T>(items: readonly T[], state: SimulationState): { out: T[]; rngState: number } {
  const rng = createRng(state.rngState);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { out, rngState: rng.state };
}

export function canVisit(state: SimulationState, pavilion: PavilionKey, mode: 'practice' | 'exam'): boolean {
  if (state.day.period !== 'morning') return false;
  if (state.pavilionVisit !== null) return false;
  if (scheduleSlotsLeft(state) <= 0) return false;
  if (!isPavilionUnlocked(state, pavilion)) return false;
  if (mode === 'exam' && nextExamLevel(state.medals[pavilion]) === null) return false;
  const level = mode === 'exam' ? nextExamLevel(state.medals[pavilion])! : practiceLevel(state.medals[pavilion]);
  const need = mode === 'exam' ? EXAM.questionsDrawn : PRACTICE.questions;
  return visitPool(pavilion, level).length >= need;
}

export function startVisit(state: SimulationState, pavilion: PavilionKey, mode: 'practice' | 'exam'): SimulationState {
  if (!canVisit(state, pavilion, mode)) return state;
  const held = state.medals[pavilion];
  const level = mode === 'exam' ? nextExamLevel(held)! : practiceLevel(held);
  const count = mode === 'exam' ? EXAM.questionsDrawn : PRACTICE.questions;
  const { out, rngState } = shuffle(visitPool(pavilion, level), state);
  const visit: PavilionVisitState = {
    pavilion,
    mode,
    level,
    questionIds: out.slice(0, count).map((q) => q.id),
    answers: [],
    showingExplanation: false,
    result: null
  };
  return {
    ...state,
    rngState,
    pavilionVisit: visit,
    day: { ...state.day, pavilionVisitsToday: [...(state.day.pavilionVisitsToday ?? []), pavilion] }
  };
}

// Svaret på aktuell fråga. Returnerar besöket med svaret och frågan
// (för kreditering i reducern), eller null om inget svar kan tas emot.
export function answerVisit(
  visit: PavilionVisitState,
  chosenIndex: number
): { visit: PavilionVisitState; question: BankQuestion; correct: boolean } | null {
  if (visit.showingExplanation || visit.result) return null;
  const questionId = visit.questionIds[visit.answers.length];
  const question = questionId ? bankQuestionById(questionId) : null;
  if (!question) return null;
  if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= question.options.length) return null;
  const correct = chosenIndex === question.correctIndex;
  return {
    visit: {
      ...visit,
      answers: [...visit.answers, { questionId, chosenIndex, correct }],
      showingExplanation: true
    },
    question,
    correct
  };
}

// Vidare efter förklaringen. När alla frågor är besvarade sätts
// resultatet, och ett godkänt prov ger medaljen.
export function nextVisitQuestion(state: SimulationState): SimulationState {
  const visit = state.pavilionVisit;
  if (!visit || !visit.showingExplanation) return state;
  const done = visit.answers.length >= visit.questionIds.length;
  if (!done) return { ...state, pavilionVisit: { ...visit, showingExplanation: false } };
  const correct = visit.answers.filter((a) => a.correct).length;
  const passed = visit.mode === 'exam' ? correct >= EXAM.correctToPass : null;
  const medals = passed ? awardMedal(state.medals, visit.pavilion, visit.level) : state.medals;
  return {
    ...state,
    medals,
    pavilionVisit: {
      ...visit,
      showingExplanation: false,
      result: {
        correct,
        total: visit.questionIds.length,
        passed,
        medalAwarded: passed ? visit.level : null
      }
    }
  };
}

export function closeVisit(state: SimulationState): SimulationState {
  if (!state.pavilionVisit || !state.pavilionVisit.result) return state;
  return { ...state, pavilionVisit: null };
}
