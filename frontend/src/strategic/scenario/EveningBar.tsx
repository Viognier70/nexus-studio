// ORDER 264 (Nexus v1 etapp 2) — kvällen och vägen till morgonen.
// ORDER 270 — kvällens lärdom ersätter quizen efter servicen (Vision
// Owner 2026-09-26): förklaringen till de fel beslut spelaren tog i
// kvällens händelser, och till dem där personalen fick besluta själv.
// ORDER 271 — Designs paket 6 (L1 kvällens lärdom, LEVERANSNOT §5) och
// paket 1 (K1 kvällsberättelsen), som två skärmar i följd:
//
// L1: rutnätet raketerna × stegen (✓ klarat, ✗ fel och personalen tog
// över, — nåddes inte). Lärdomen hämtas ur det tidigaste fallet, eftersom
// ett missat episteme väger tyngre än ett missat phronesis (Designs
// `pickLesson`, här `pickLessonIndex`). Skärmen visar stegets fråga, ditt
// svar, det rätta och följden; principen (förklaringen till det rätta
// svaret) står stort med accentkant, och övriga fel står under. Skärmen
// ställer ingen fråga: den leder till paviljongen där steget övas, i
// morgon, och vidare till kvällsberättelsen.
//
// K1: kvällens berättelse (`eveningAccount.paragraph`), det som gick bra
// och det som gick fel med orsaken, och vägen till nästa morgon. Quizen
// ("Kvällens tre frågor", Q1) byggs inte (ORDER 271).

import { TransferScreen } from '../ui/evening/TransferScreen';
import { useRef } from 'react';
import { WasteScreen } from './WasteScreen';
import { ResultScreen } from './ResultScreen';
import { strings } from '../../content/strings';
import { SITTING } from '../../sim/balance';
import { calendarFor } from '../../sim/calendar';
import { incidentById, type Incident } from '../../sim/incidentBank';
import { formatIncidentText, type IncidentRecord, type LessonItem } from '../../sim/incidents';
import type { SimulationState } from '../types';
import { ReferenceLine } from '../knowledge/ui/ReferenceLine';
import { NxButton, NxLabel, NxScreen } from '../ui/system/components';
import { eveningGrid, pickLessonIndex, stepsCleared, type CellState, type GridRow } from '../ui/service/serviceView';
import '../ui/service/service.css';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { CompareScreen, eveningVillage } from './CompareScreen';

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </svg>
  );
}

// Steget där raketen föll, med texten för följden och orsaken.
function failureOf(sim: SimulationState, rec: IncidentRecord): { incident: Incident; stepIndex: number; outcome: string; cause: string | null } | null {
  const cls = sim.economy.businessClass;
  const incident = cls ? incidentById(cls, rec.id) : undefined;
  if (!incident || rec.step === null) return null;
  const step = incident.steps[rec.step];
  if (!step) return null;
  const f = (t: string) => formatIncidentText(t, rec.context);
  const chosen = rec.optionId ? step.text.options[rec.optionId] : null;
  const outcome = f((chosen?.fail?.outcome) || step.text.fail.outcome);
  const cause = chosen ? f((rec.situation && chosen.explanationIn?.[rec.situation]) || chosen.explanation) : null;
  return { incident, stepIndex: rec.step, outcome, cause };
}

const CELL_MARK: Record<CellState, string> = { cleared: '✓', failed: '✗', unreached: '—' };

function Grid({ grid, lessonIndex }: { grid: GridRow[]; lessonIndex: number | null }) {
  const l = strings.rocket.lesson;
  const s = strings.service.incident;
  const axes = ['episteme', 'techne', 'phronesis'];
  const cellWord: Record<CellState, string> = { cleared: l.cellCleared, failed: l.cellFailed, unreached: l.cellUnreached };
  const { cleared, total } = stepsCleared(grid);
  return (
    <div data-testid="evening-grid">
      <table className="nx-grid">
        <thead>
          <tr>
            <th scope="col">{l.gridRocket}</th>
            {axes.map((a) => <th key={a} scope="col">{s.stepName[a]}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={row.record.id} data-lesson={i === lessonIndex} data-testid={`grid-${row.record.id}`}>
              <td className="nx-grid-title">{formatIncidentText(row.title, row.record.context)}</td>
              {row.cells.map((c, j) => (
                <td key={j} className="nx-grid-cell">
                  <div className="nx-cell" data-cell={c} aria-label={`${s.stepName[axes[j]]}: ${cellWord[c]}`}>
                    <span aria-hidden>{CELL_MARK[c]}</span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="nx-grid-legend">
        <span>{l.legendCleared}</span>
        <span>{l.legendFailed}</span>
        <span>{l.legendUnreached}</span>
      </div>
      <div className="nx-grid-summary" data-testid="evening-summary">{l.summary(String(cleared), String(total))}</div>
    </div>
  );
}

function LessonScreen({ sim, lesson, onStory, onEnd }: { sim: SimulationState; lesson: LessonItem[]; onStory: () => void; onEnd: () => void }) {
  const l = strings.rocket.lesson;
  const s = strings.service.incident;
  const weekday = strings.calendar.weekdays[calendarFor(sim.day.dayNumber).weekday];
  const grid = eveningGrid(sim);
  const lessonIndex = pickLessonIndex(grid.map((r) => r.record));
  const main = lessonIndex === null ? null : grid[lessonIndex].record;
  const mainItem = main ? lesson.find((i) => i.incidentId === main.id) ?? null : null;
  const mainFail = main ? failureOf(sim, main) : null;
  const others = grid
    .map((r) => r.record)
    .filter((r) => r.step !== null && r !== main)
    .sort((a, b) => (a.step as number) - (b.step as number) || a.at - b.at);
  const pavilion = mainFail ? strings.knowledge.pavilions[mainFail.incident.steps[mainFail.stepIndex].pavilion] : null;

  return (
    <NxScreen testId="evening-bar" label={strings.lesson.heading}>
      <div className="nx-evening" data-testid="screen-L1">
        <header className="nx-evening-head">
          <div>
            <NxLabel>{l.label(weekday, String(SITTING.serviceEndHour))}</NxLabel>
            <h1 className="nx-display">{mainItem ? mainItem.title : l.noneTitle}</h1>
          </div>
          <span className="nx-mid" aria-hidden><BookIcon /></span>
        </header>
        <div className="nx-evening-body">
          {/* ORDER 285 — lärdomen på papper, raketerna på trä (Designs lärdomen). */}
          <div className="nx-paper nx-lesson-paper" data-testid="evening-lesson" data-items={lesson.length}>
            {main && mainItem && mainFail ? (
              <div data-testid={`lesson-${mainItem.incidentId}`}>
                <div data-testid={`lesson-step-${mainItem.incidentId}`} data-step-axis={mainItem.stepAxis}>
                  <NxLabel>{l.wentWrong(main.context.clock, s.stepName[mainItem.stepAxis], s.stepAsks[mainItem.stepAxis])}</NxLabel>
                </div>
                <p className="nx-lesson-text">
                  {l.question(mainItem.question)}{' '}
                  {mainItem.chosen !== null ? l.youChose(mainItem.chosen) : l.staffDecided}{' '}
                  {l.right(mainItem.better)} {mainFail.outcome}
                </p>
                <p className="nx-lesson-principle" data-testid="lesson-principle">{mainItem.betterExplanation}</p>
                <ReferenceLine reference={mainItem.reference} />
              </div>
            ) : (
              <p className="nx-lesson-text">{strings.lesson.none}</p>
            )}
            {others.map((rec) => {
              const item = lesson.find((i) => i.incidentId === rec.id);
              if (!item) return null;
              return (
                <div key={rec.id} className="nx-lesson-also" data-testid={`lesson-${item.incidentId}`}>
                  <div data-testid={`lesson-step-${item.incidentId}`} data-step-axis={item.stepAxis}>
                    <NxLabel muted>{l.also(rec.context.clock, s.stepName[item.stepAxis], s.stepAsks[item.stepAxis])}</NxLabel>
                  </div>
                  <p>{/[?!.]$/.test(item.title) ? item.title : `${item.title}:`} {item.betterExplanation}</p>
                </div>
              );
            })}
          </div>
          <Grid grid={grid} lessonIndex={lessonIndex} />
        </div>
        <footer className="nx-evening-foot">
          <button
            type="button"
            className="nx-btn nx-btn-quiet"
            data-testid="end-evening"
            onClick={onEnd}
          >
            <span aria-hidden style={{ marginRight: '0.4em' }}><BookIcon /></span>
            {pavilion ? l.practice(pavilion) : strings.lesson.nextMorning}
          </button>
          <div>
            <NxButton testId="to-evening-story" onClick={onStory} autoFocus>{l.toStory}</NxButton>
          </div>
        </footer>
      </div>
    </NxScreen>
  );
}

function StoryScreen({ sim, onBack, onEnd }: { sim: SimulationState; onBack: (() => void) | null; onEnd: () => void }) {
  const k = strings.rocket.story;
  const cal = calendarFor(sim.day.dayNumber);
  const cls = sim.economy.businessClass;
  const grid = eveningGrid(sim);
  const well = grid.filter((r) => r.record.step === null).map((r) => {
    const incident = cls ? incidentById(cls, r.record.id) : undefined;
    return { id: r.record.id, text: incident ? formatIncidentText(incident.text.success.outcome, r.record.context) : '' };
  });
  const wrong = grid.filter((r) => r.record.step !== null).flatMap((r) => {
    const fail = failureOf(sim, r.record);
    return fail ? [{ id: r.record.id, text: fail.outcome, cause: fail.cause }] : [];
  });
  const title = cls
    ? k.title(k.weekdayDefinite[cal.weekday], strings.economy.classesDefinite[cls])
    : k.evening;
  return (
    <NxScreen testId="evening-bar" label={title}>
      <div className="nx-evening" data-testid="screen-K1">
        <header className="nx-evening-head">
          <div>
            <NxLabel>{k.label(strings.calendar.weekdays[cal.weekday], String(SITTING.serviceEndHour))}</NxLabel>
            <h1 className="nx-display">{title}</h1>
          </div>
        </header>
        {sim.eveningAccount?.paragraph && (
          <p className="nx-story-lead" data-testid="evening-story">{sim.eveningAccount.paragraph}</p>
        )}
        <div className="nx-evening-body" data-cols="even">
          <div className="nx-story-col">
            <NxLabel>{k.wentWell}</NxLabel>
            <ul className="nx-story-list" data-testid="story-well">
              {well.length === 0 && <li><span aria-hidden /> <span className="nx-muted">{k.nothingWell}</span></li>}
              {well.map((w) => (
                <li key={w.id}><span aria-hidden>✓</span><span>{w.text}</span></li>
              ))}
            </ul>
          </div>
          <div className="nx-story-col">
            <NxLabel>{k.wentWrong}</NxLabel>
            <ul className="nx-story-list" data-testid="story-wrong">
              {wrong.length === 0 && <li><span aria-hidden /> <span className="nx-muted">{k.nothingWrong}</span></li>}
              {wrong.map((w) => (
                <li key={w.id}>
                  <span aria-hidden>✗</span>
                  <span>
                    {w.text}
                    <div className="nx-story-cause">{w.cause ? k.cause(w.cause) : k.noCause}</div>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <footer className="nx-evening-foot">
          {onBack ? (
            <button type="button" className="nx-btn nx-btn-quiet" data-testid="back-to-lesson" onClick={onBack}>{k.back}</button>
          ) : <span />}
          <div>
            <NxButton testId="end-evening" onClick={onEnd} autoFocus>
              {strings.lesson.nextMorning}
            </NxButton>
          </div>
        </footer>
      </div>
    </NxScreen>
  );
}

// ORDER 289 — en skärm tar inte emot klick de första stunderna efter att den
// visats. Knapparna vidare ligger på samma plats på kvällens skärmar, och ett
// dubbelklick eller ett klick som landar när skärmen byts hoppade över nästa
// skärm (provspel av 285: kvällens resultat syntes aldrig).
const ARRIVAL_GUARD_MS = 700;

function useArrivalGuard(key: string): (fn: () => void) => () => void {
  const arrived = useRef(0);
  const last = useRef<string | null>(null);
  if (last.current !== key) { last.current = key; arrived.current = performance.now(); }
  return (fn) => () => { if (performance.now() - arrived.current >= ARRIVAL_GUARD_MS) fn(); };
}

export function EveningBar() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lesson = sim.incidents?.lesson ?? null;
  // ORDER 280 — sopbilen först (Designs S1), när kvällen gav ett svinn.
  const hasWaste = !!sim.lastWaste && sim.lastWaste.dayNumber === sim.day.dayNumber && !!sim.lastWaste.fractions;
  // ORDER 285 — kvällens resultat (R1) efter sopbilen, före lärdomen.
  // ORDER 289 — ordningen står i simuleringen (day.eveningStep) och går bara
  // framåt; äldre sparfiler utan steget börjar som förut.
  const step = sim.day.eveningStep ?? (hasWaste ? 'waste' : 'result');
  const guard = useArrivalGuard(`${sim.day.dayNumber}:${step}`);
  if (sim.day.period !== 'evening' || sim.day.eveningEndRequested) return null;
  const afterResult = lesson !== null ? 'lesson' : 'story';
  const go = (to: 'transfer' | 'result' | 'compare' | 'lesson' | 'story') => dispatch({ type: 'EVENING_STEP', to });
  // ORDER 290 — överföringen till företagskontot efter sopbilen.
  const hasTransfer = !!sim.day.transfer && sim.day.transfer.dayNumber === sim.day.dayNumber;
  const end = guard(() => dispatch({ type: 'END_EVENING' }));
  if (step === 'waste' && hasWaste) {
    return <WasteScreen sim={sim} onContinue={guard(() => go(hasTransfer ? 'transfer' : 'result'))} />;
  }
  if ((step === 'transfer' || step === 'waste') && hasTransfer) {
    return <TransferScreen sim={sim} onContinue={guard(() => go('result'))} />;
  }
  // ORDER 288 — kvällen i byn (J1) efter kvällens resultat, när byns rader finns.
  const hasCompare = eveningVillage(sim) !== null;
  if (step === 'waste' || step === 'transfer' || step === 'result') {
    return <ResultScreen sim={sim} onContinue={guard(() => go(hasCompare ? 'compare' : afterResult))} />;
  }
  if (step === 'compare') {
    return <CompareScreen sim={sim} onContinue={guard(() => go(afterResult))} />;
  }
  // En kväll utan raketer har ingen lärdom: bara berättelsen.
  if (lesson === null || step === 'story') {
    return <StoryScreen sim={sim} onBack={lesson !== null ? guard(() => go('lesson')) : null} onEnd={end} />;
  }
  return <LessonScreen sim={sim} lesson={lesson} onStory={guard(() => go('story'))} onEnd={end} />;
}
