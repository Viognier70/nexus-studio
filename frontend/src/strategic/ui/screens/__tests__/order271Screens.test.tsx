// ORDER 271 — skärmarna i paket 1: att rätt skärm visas för tillståndet
// och att formen följer Designs regler (fel svar aldrig rött, rutor i
// stället för poängsiffra, första bankmötets två utfall efter F33).

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SimDispatchCtx, SimStateCtx } from '../../../simulation/SimulationProvider';
import { reducer } from '../../../simulation/reducer';
import { makeNewGameState } from '../../../simulation/model';
import { BusinessProvider } from '../../../business/BusinessContext';
import { BankDialog } from '../../../economy/BankDialog';
import { MaltidensHusDialog } from '../../../knowledge/ui/MaltidensHusDialog';
import { QuestionCard } from '../../../knowledge/ui/QuestionCard';
import { DayActionBar } from '../../../scenario/DayActionBar';
import { bankQuestionById } from '../../../knowledge/questionBank';
import { EXAM, RENT } from '../../../../sim/balance';
import type { SimAction, SimulationState } from '../../../types';
import { stocked } from '../../../testHarness/stocked';
import { firstDayOfWeek } from '../../../../sim/calendar';

afterEach(() => cleanup());
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false
    })
  });
});

function withSim(state: SimulationState, node: ReactNode, onAction: (a: SimAction) => void = () => {}) {
  return (
    <BusinessProvider>
      <SimStateCtx.Provider value={state}>
        <SimDispatchCtx.Provider value={onAction}>{node}</SimDispatchCtx.Provider>
      </SimStateCtx.Provider>
    </BusinessProvider>
  );
}

function answerAll(s: SimulationState, correct: number): SimulationState {
  const v = s.pavilionVisit!;
  for (let i = 0; i < v.questionIds.length; i++) {
    const q = bankQuestionById(s.pavilionVisit!.questionIds[i])!;
    s = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: i < correct ? q.correctIndex : (q.correctIndex + 1) % q.options.length });
    s = reducer(s, { type: 'NEXT_VISIT_QUESTION' });
  }
  return s;
}

function exam(s: SimulationState, pavilion: 'stensota' | 'kalastorget', correct: number): SimulationState {
  s = reducer(s, { type: 'VISIT_PAVILION', pavilion, mode: 'exam' });
  return answerAll(s, correct);
}

function newPlayer(): SimulationState {
  return reducer(makeNewGameState(7), { type: 'BEGIN_INTRODUCTION' });
}

describe('ORDER 271 — första bankmötet (B0a, B0b)', () => {
  // ORDER 315b — i introduktionen erbjuder Åsa foodtrucken; banken pekar dit
  // och erbjuder ingen första verksamhet (B0a och B0b finns inte längre).
  it('introduktionen: banken pekar på Åsas foodtruck och har inget val', () => {
    const s = reducer(exam(newPlayer(), 'stensota', EXAM.questionsDrawn), { type: 'CLOSE_VISIT' });
    const { getByTestId, queryByTestId } = render(withSim(s, <BankDialog open onClose={() => {}} />));
    expect(getByTestId('screen-B0-truck')).toBeTruthy();
    expect(queryByTestId('choose-vinbar')).toBeNull();
    expect(queryByTestId('choose-foodtruck')).toBeNull();
  });

  it('med verksamhet: B1', () => {
    const { getByTestId } = render(withSim(makeNewGameState(7), <BankDialog open onClose={() => {}} />));
    expect(getByTestId('screen-B1')).toBeTruthy();
  });

  // ORDER 303c — introduktionshyran gäller veckorna 1–RENT.introWeeks.
  it('ORDER 294 — introduktionshyran i B1 de första veckorna, inte efter dem', () => {
    const base = makeNewGameState(7);
    const w1 = render(withSim(base, <BankDialog open onClose={() => {}} />));
    expect(w1.getByTestId('bank-intro-rent')).toBeTruthy();
    w1.unmount();
    const w3 = render(withSim({ ...base, day: { ...base.day, dayNumber: firstDayOfWeek(RENT.introWeeks + 1) } }, <BankDialog open onClose={() => {}} />));
    expect(w3.queryByTestId('bank-intro-rent')).toBeNull();
  });
});

describe('ORDER 271 — Måltidens hus (O1, O2, MD1, MD2)', () => {
  it('MD1 utan besök; O2 med en ruta per fråga och ingen poängsiffra', () => {
    // ORDER 283 — första besöket visar introduktionen till kunskapsformerna;
    // efter den MD1.
    const first = render(withSim(makeNewGameState(7), <MaltidensHusDialog open onClose={() => {}} />));
    expect(first.getByTestId('house-intro')).toBeTruthy();
    cleanup();
    const base = { ...makeNewGameState(7), houseIntroSeen: true };
    const md1 = render(withSim(base, <MaltidensHusDialog open onClose={() => {}} />));
    expect(md1.getByTestId('screen-MD1')).toBeTruthy();
    cleanup();
    let s = reducer(base, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'exam' });
    s = answerAll(s, EXAM.correctToPass - 1);
    const o2 = render(withSim(s, <MaltidensHusDialog open onClose={() => {}} />));
    const boxes = o2.getByTestId('result-boxes');
    expect(boxes.children.length).toBe(EXAM.questionsDrawn);
    expect(boxes.getAttribute('data-correct')).toBe(String(EXAM.correctToPass - 1));
    expect(o2.getByTestId('result-headline').textContent).not.toMatch(/\d/);
  });

  it('ett godkänt prov visar först ögonblicket (MD2), sedan resultatet', () => {
    const s = exam(makeNewGameState(7), 'stensota', EXAM.questionsDrawn);
    const { getByTestId, queryByTestId } = render(withSim(s, <MaltidensHusDialog open onClose={() => {}} />));
    expect(getByTestId('screen-MD2')).toBeTruthy();
    expect(queryByTestId('visit-result')).toBeNull();
    fireEvent.click(getByTestId('medal-continue'));
    expect(getByTestId('screen-O2')).toBeTruthy();
  });

  // ORDER 290 — rätt och fel syns tydligt (grönt och rött); regeln att fel
  // aldrig är rött gäller inte längre. Tillstånden är desamma.
  it('ett fel svar och det rätta svaret har var sitt tillstånd', () => {
    const s = reducer(makeNewGameState(7), { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'practice' });
    const q = bankQuestionById(s.pavilionVisit!.questionIds[0])!;
    const wrong = (q.correctIndex + 1) % q.options.length;
    const { getByTestId } = render(
      <QuestionCard question={q} index={0} total={5} answered={{ chosenIndex: wrong, correct: false }} onAnswer={() => {}} onNext={() => {}} nextLabel="Nästa" />
    );
    expect(getByTestId(`option-${wrong}`).getAttribute('data-state')).toBe('wrong');
    expect(getByTestId(`option-${q.correctIndex}`).getAttribute('data-state')).toBe('correct');
    expect(getByTestId('explanation').textContent).toContain(q.explanation);
  });
});

describe('ORDER 271 — morgonens schema (S1, S2)', () => {
  it('vardag: S1 med schemaplatserna; knappen öppnar för kvällen som förut', () => {
    // ORDER 277 — knappen är avstängd tills menyn och dryckeslistan har en
    // rätt och en dryck i lager; efter köpet öppnar den som förut.
    const empty = makeNewGameState(7);
    const blocked = render(withSim(empty, <DayActionBar onOpenHouse={() => {}} onOpenBank={() => {}} />, () => {}));
    expect((blocked.getByTestId('start-service') as HTMLButtonElement).disabled).toBe(true);
    expect(blocked.getByTestId('start-blocked')).toBeTruthy();
    blocked.unmount();
    const s = stocked(makeNewGameState(7));
    const actions: SimAction[] = [];
    const { getByTestId } = render(withSim(s, <DayActionBar onOpenHouse={() => {}} onOpenBank={() => {}} />, (a) => actions.push(a)));
    expect(getByTestId('screen-S1')).toBeTruthy();
    expect(getByTestId('schedule-cards').children.length).toBe(2);
    fireEvent.click(getByTestId('start-service'));
    expect(actions).toEqual([{ type: 'START_SERVICE' }]);
  });

  // ORDER 284 — vägen från morgonen till inköpen: utan lager är huvudknappen
  // inköpen (tredje provspelet).
  it('utan lager är huvudknappen Buy in for tonight, med lager Open for the evening', () => {
    let opened = 0;
    const empty = render(withSim(makeNewGameState(7), <DayActionBar onOpenHouse={() => {}} onOpenBank={() => {}} onOpenBuy={() => { opened++; }} />, () => {}));
    expect(empty.queryByTestId('start-service')).toBeNull();
    fireEvent.click(empty.getByTestId('open-buy-foot'));
    expect(opened).toBe(1);
    empty.unmount();
    const full = render(withSim(stocked(makeNewGameState(7)), <DayActionBar onOpenHouse={() => {}} onOpenBank={() => {}} onOpenBuy={() => {}} />, () => {}));
    expect(full.queryByTestId('open-buy-foot')).toBeNull();
    expect(full.getByTestId('start-service')).toBeTruthy();
  });
});
