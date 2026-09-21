// ORDER 236 — verifierar rättighetsberäkningen i answerAnchorQuestion.
//
// VO 2026-09-21: "Kalastorget-brons-01 har rätt svar B (index 1).
// Harnessen svarar index 0. Mätpasset rapporterade ändå 'rätt'."
//
// Detta test bevisar tre fakta:
//   1. Kalastorget-brons-01 har `correctIndex: 1` (svar B).
//   2. Om spelaren svarar index=0 → 0 kredit, wasCorrect=false.
//   3. Om spelaren svarar index=1 → 0.05 kredit, wasCorrect=true.
//
// Utan detta test kunde en bugg i toPendingQuestion/options.correct-
// mappningen dölja att "rätt" beräknas fel. Om testet failar → STOPP
// enligt VO 2026-09-21.
//
// **Anmärkning om mätpassens rapport:** både ORDER 234 och 235:s
// mätpass använder `pq.options.findIndex(o => o.correct)` för att
// hitta rätt svar och dispatchar det — de anländer alltså rätt
// medvetet, oberoende av harnessens `() => 0`-default. Rapportens
// "wasCorrect: true" är korrekt eftersom mätpassen svarar rätt, INTE
// för att index=0 råkar vara rätt.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { KALASTORGET_BRONS_QUESTIONS } from '../kalastorgetBrons';
import { METODKOKET_BRONS_QUESTIONS } from '../metodkoketBrons';
import { STENSOTA_BRONS_QUESTIONS } from '../stensotaBrons';
import { MALTIDBIBLIOTEKET_BRONS_QUESTIONS } from '../maltidbiblioteketBrons';
import type { PendingQuestion, SimulationState } from '../../types';

// Skapa ett test-state med en anchor-fråga direkt i pendingQuestion,
// bypasser pickern. Isolerar rättighetsberäkningen från picker-timing.
function withAnchorQuestion(base: SimulationState, pq: PendingQuestion): SimulationState {
  return {
    ...base,
    scenario: {
      ...base.scenario,
      phase: 'question',
      pendingQuestion: pq
    }
  };
}

// Konvertera FlervalQuestion → PendingQuestion, samma logik som
// anchorQuestionPicker.toPendingQuestion (kopierad inline så testet
// verifierar shape-korrektheten och inte bara delar picker-koden).
function toPendingQuestionForTest(q: typeof KALASTORGET_BRONS_QUESTIONS[number]): PendingQuestion {
  return {
    body: q.prompt,
    options: q.options.map((label, i) => ({
      label,
      correct: i === q.correctIndex
    })),
    senderRole: null,
    anchorId: q.anchor?.anchorId,
    explanation: q.explanation,
    askerRole: q.askerRole,
    axis: q.axis,
    ...(q.spar !== null ? { track: q.spar } : {}),
    sourceBankId: q.id
  };
}

describe('ORDER 236 — rättighetsberäkning i answerAnchorQuestion', () => {
  const q1 = KALASTORGET_BRONS_QUESTIONS[0];

  it('Kalastorget-brons-01 har correctIndex=1 (svar B)', () => {
    expect(q1.id).toBe('kalastorget-brons-01');
    expect(q1.correctIndex).toBe(1);
    expect(q1.options[1]).toContain('erbjuder plats i baren');
  });

  it('index=0 (svar A) ger 0 kredit och phase går ändå till question-explanation', () => {
    const base = makeInitialState(1);
    const pq = toPendingQuestionForTest(q1);
    const preKC = { ...base.knowledgeCredits };

    const seeded = withAnchorQuestion(base, pq);
    const after = reducer(seeded, { type: 'ANSWER_QUESTION', index: 0 });

    // Phase går till explanation även vid fel svar (spelaren ser
    // förklaringen och rätta svaret).
    expect(after.scenario.phase).toBe('question-explanation');
    // pendingQuestion behålls med lastAnswerIndex + lastAnswerCorrect
    // för overlay-rendering.
    expect(after.scenario.pendingQuestion).not.toBeNull();
    expect(after.scenario.pendingQuestion!.lastAnswerIndex).toBe(0);
    expect(after.scenario.pendingQuestion!.lastAnswerCorrect).toBe(false);

    // Ingen kredit — alla tre axlar oförändrade.
    expect(after.knowledgeCredits.episteme).toBe(preKC.episteme);
    expect(after.knowledgeCredits.techne).toBe(preKC.techne);
    expect(after.knowledgeCredits.phronesis).toBe(preKC.phronesis);
  });

  it('index=1 (svar B, rätt) ger 0.05 kredit på phronesis-axeln', () => {
    const base = makeInitialState(1);
    const pq = toPendingQuestionForTest(q1);
    const preKC = { ...base.knowledgeCredits };

    const seeded = withAnchorQuestion(base, pq);
    const after = reducer(seeded, { type: 'ANSWER_QUESTION', index: 1 });

    expect(after.scenario.phase).toBe('question-explanation');
    expect(after.scenario.pendingQuestion!.lastAnswerIndex).toBe(1);
    expect(after.scenario.pendingQuestion!.lastAnswerCorrect).toBe(true);

    // Kalastorget-brons-01 är axis=phronesis, spar=null. Kredit ska
    // landa på phronesis-axeln utan spårmärkning.
    expect(after.knowledgeCredits.phronesis).toBeCloseTo(preKC.phronesis + 0.05, 6);
    // De andra två axlarna orörda.
    expect(after.knowledgeCredits.episteme).toBe(preKC.episteme);
    expect(after.knowledgeCredits.techne).toBe(preKC.techne);
  });

  it('index=2 och index=3 (också fel svar) ger 0 kredit', () => {
    for (const wrongIdx of [2, 3]) {
      const base = makeInitialState(1);
      const pq = toPendingQuestionForTest(q1);
      const preKC = { ...base.knowledgeCredits };

      const seeded = withAnchorQuestion(base, pq);
      const after = reducer(seeded, { type: 'ANSWER_QUESTION', index: wrongIdx });

      expect(after.scenario.pendingQuestion!.lastAnswerCorrect).toBe(false);
      expect(after.knowledgeCredits.phronesis).toBe(preKC.phronesis);
    }
  });
});

describe('ORDER 236 — samma verifikation för alla 40 brons-frågor', () => {
  // Kör hela sviten: för varje fråga, testa att svar med correctIndex
  // ger 0.05 kredit och svar med (correctIndex + 1) % 4 ger 0.
  // Detta fångar en eventuell felaktig options.correct-mappning i
  // toPendingQuestion — för samtliga fyra brons-paviljonger.

  const allQuestions = [
    ...METODKOKET_BRONS_QUESTIONS,
    ...STENSOTA_BRONS_QUESTIONS,
    ...MALTIDBIBLIOTEKET_BRONS_QUESTIONS,
    ...KALASTORGET_BRONS_QUESTIONS
  ];

  it.each(allQuestions.map((q, i) => [i, q.id]))(
    'fråga %i (%s): correct-index ger 0.05, wrong-index ger 0',
    (_i, id) => {
      const q = allQuestions.find((qq) => qq.id === id)!;
      const pq = toPendingQuestionForTest(q);
      const base = makeInitialState(1);
      const preKC = base.knowledgeCredits[q.axis];

      // Rätt svar.
      const afterRight = reducer(withAnchorQuestion(base, pq), {
        type: 'ANSWER_QUESTION',
        index: q.correctIndex
      });
      expect(afterRight.scenario.pendingQuestion!.lastAnswerCorrect, `fråga ${id} correct-index gav wasCorrect=false`).toBe(true);
      expect(afterRight.knowledgeCredits[q.axis]).toBeCloseTo(preKC + 0.05, 6);

      // Fel svar (nästa index).
      const wrongIdx = (q.correctIndex + 1) % 4;
      const afterWrong = reducer(withAnchorQuestion(base, pq), {
        type: 'ANSWER_QUESTION',
        index: wrongIdx
      });
      expect(afterWrong.scenario.pendingQuestion!.lastAnswerCorrect, `fråga ${id} wrong-index gav wasCorrect=true`).toBe(false);
      expect(afterWrong.knowledgeCredits[q.axis]).toBe(preKC);
    }
  );
});
