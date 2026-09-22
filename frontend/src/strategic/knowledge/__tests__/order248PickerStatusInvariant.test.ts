// ORDER 248 (uppföljning ORDER 246) — invariant-test för att skydda
// den refaktor som gjordes samtidigt.
//
// ORDER 246 införde `getAnchorPickerStatus`. ORDER 248 refaktorerade
// reducer:s gate till att kalla helper:n direkt (`reducer.ts:2308` —
// `if (getAnchorPickerStatus(draft).open)`), vilket eliminerar risken
// för glidning mellan helper och gate genom konstruktion — samma
// funktion evalueras.
//
// Detta test kompletterar refaktorn med runtime-verifiering: driver
// samma sim som ORDER 238-mätpasset (seed=42, 15-min dinner, samma
// svar-loop) och kontrollerar att vid varje anchor-fyra som observeras
// var pickerns status öppen i det tillstånd som pickern själv läser
// (state DIREKT EFTER TICK-incrementet men FÖRE fyrans applicering).
//
// Skulle någon framtida ändring bryta invarianten — t.ex. via en
// helper som får en ny gate reducer inte känner till, eller vice
// versa — fångas det som första fyra där invariant inte håller.

// **Timing-detalj:** pickern körs INUTI advanceTick, som redan har
// avancerat draft.simTime med dt. `beforeTick`-tillståndet i vår
// loop har gammal simTime. För att simulera vad pickern läser
// bygger vi en syntetisk snapshot med `simTime: beforeTick.simTime
// + dt`. Detta är samma tillstånd som getAnchorPickerStatus konsulteras
// på i reducer:s produktionskod, så jämförelsen är strikt.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { getAnchorPickerStatus } from '../anchorQuestionPicker';
import type { SimulationState } from '../../types';

const DINNER_MINUTES = 15;
const TICK_HZ = 5;

describe('ORDER 248 — anchor-picker-invariant: fyrning ⇒ status var open', () => {
  it('samma tick som en anchor-fråga fyras, getAnchorPickerStatus(före) === open', () => {
    let s: SimulationState = makeInitialState(42);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: DINNER_MINUTES
    });

    const dt = 1 / TICK_HZ;
    const maxTicks = DINNER_MINUTES * 60 * TICK_HZ + 3000;
    let fires = 0;

    for (let i = 0; i < maxTicks; i++) {
      // Kör scenariofasernas standardsvar (samma pattern som ORDER 238-
      // mätpasset — så helper-utfallet mäts i samma driftsmiljö som
      // 238:s mätpass, inte i en avvikande harness).
      if (s.scenario.phase === 'subject' && s.scenario.pendingQuestion === null) {
        s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
        s = reducer(s, { type: 'RESOLVE_SCENARIO', choice: 'A' });
      }
      if (
        s.scenario.phase === 'question' &&
        s.scenario.pendingQuestion !== null
      ) {
        const pq = s.scenario.pendingQuestion;
        if (pq.anchorId !== undefined || pq.axis !== undefined) {
          const idx = pq.options.findIndex((o) => o.correct);
          s = reducer(s, { type: 'ANSWER_QUESTION', index: idx });
        } else {
          s = reducer(s, { type: 'ANSWER_QUESTION', index: 0 });
        }
      }
      if (s.scenario.phase === 'question-explanation') {
        s = reducer(s, { type: 'ACK_QUESTION_EXPLANATION' });
      }

      // Simulera exakt vad pickern läser: samma state som beforeTick men
      // med simTime bumped med dt (pickern körs inuti advanceTick, som
      // redan har inkrementerat simTime innan gaten evalueras).
      const beforeTick = s;
      const pickerView: SimulationState = { ...beforeTick, simTime: beforeTick.simTime + dt };
      const statusAtPicker = getAnchorPickerStatus(pickerView);

      s = reducer(s, { type: 'TICK', dt });

      // En anchor-fråga fyras om phase gick från icke-'question' (eller
      // pq === null) till 'question' med en anchorId ELLER axis satt.
      const fired =
        s.scenario.phase === 'question' &&
        s.scenario.pendingQuestion !== null &&
        (s.scenario.pendingQuestion.anchorId !== undefined ||
          s.scenario.pendingQuestion.axis !== undefined) &&
        (beforeTick.scenario.phase !== 'question' ||
          beforeTick.scenario.pendingQuestion === null);

      if (fired) {
        fires += 1;
        const reason = statusAtPicker.open ? '(n/a)' : statusAtPicker.reason;
        expect(
          statusAtPicker.open,
          `Invariantbrott: anchor-fråga fyrades vid simTime=${s.simTime.toFixed(1)}s men getAnchorPickerStatus(picker-view) sa closed:${reason}. ` +
            `Reducer:s gate och helper:n är inte i synk — endera i reducer.ts eller anchorQuestionPicker.ts har ändrats utan att den andra följde med.`
        ).toBe(true);
      }
    }

    // Bevisar att testet faktiskt observerade fyrningar — annars är
    // asserten trivially sann utan att någon invariant kontrollerats.
    // ORDER 238-mätpasset gav 3 fyrningar för seed=42; vi kräver ≥1
    // så en ändring i seed eller banking inte tystar hela testet.
    expect(fires, 'inga anchor-fyrningar observerade — testet kontrollerar inget').toBeGreaterThanOrEqual(1);
  });
});
