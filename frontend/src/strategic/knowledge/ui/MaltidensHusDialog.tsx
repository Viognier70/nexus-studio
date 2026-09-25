// ORDER 264 (Nexus v1 etapp 2) — Måltidens hus: välj paviljong, öva
// eller gör prov, svara, se resultatet.
//
// Speldesign > Kunskapen. Paviljongerna som platser på kartan byggs i
// etapp 11; tills dess nås de härifrån, från morgonens rad. Dialogen är
// öppen så länge ett besök pågår, också efter en omladdning mitt i ett
// besök (besöket ligger i simuleringens tillstånd).

import { strings } from '../../../content/strings.sv';
import { EXAM } from '../../../sim/balance';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import type { PavilionKey } from '../../types';
import {
  canVisit,
  isPavilionUnlocked,
  nextExamLevel,
  scheduleSlotsLeft,
  THEATRE
} from '../pavilionVisit';
import { bankQuestionById } from '../questionBank';
import { QuestionCard } from './QuestionCard';

const ORDER: readonly PavilionKey[] = ['maltidbiblioteket', 'metodkoket', 'stensota', 'kalastorget', THEATRE];

const BACKDROP: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 150
};

const PANEL: React.CSSProperties = {
  width: 'min(560px, 100%)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  padding: '16px 18px',
  background: 'rgba(30, 22, 16, 0.97)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  boxShadow: '0 8px 28px rgba(0,0,0,0.5)'
};

const ROW: React.CSSProperties = {
  border: '1px solid rgba(168,146,106,0.45)',
  borderRadius: 3,
  padding: '10px 12px',
  marginTop: 10
};

const BUTTON: React.CSSProperties = {
  padding: '8px 14px',
  minHeight: 40,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
  marginRight: 8,
  marginTop: 8
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MaltidensHusDialog({ open, onClose }: Props) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const visit = sim.pavilionVisit;
  if (!open && !visit) return null;
  const k = strings.knowledge;

  let body: React.ReactNode;
  if (visit && visit.result) {
    const r = visit.result;
    const pavilionName = k.pavilions[visit.pavilion];
    const text =
      visit.mode === 'practice'
        ? k.practiceResult(r.correct, r.total)
        : r.passed
          ? k.examPassed(k.medals[visit.level], pavilionName, r.correct, r.total)
          : k.examFailed(r.correct, r.total, EXAM.correctToPass);
    body = (
      <div data-testid="visit-result">
        <p style={{ fontSize: 15 }}>{text}</p>
        <button
          type="button"
          style={BUTTON}
          data-testid="close-visit"
          onClick={() => {
            dispatch({ type: 'CLOSE_VISIT' });
            onClose();
          }}
        >
          {k.back}
        </button>
      </div>
    );
  } else if (visit) {
    const i = visit.showingExplanation ? visit.answers.length - 1 : visit.answers.length;
    const question = bankQuestionById(visit.questionIds[i]);
    const answer = visit.showingExplanation ? visit.answers[i] : null;
    const last = visit.answers.length >= visit.questionIds.length;
    body = question ? (
      <>
        <div style={{ opacity: 0.75, marginBottom: 8 }}>
          {k.pavilions[visit.pavilion]} · {visit.mode === 'practice' ? k.practice : k.exam(k.medals[visit.level])}
        </div>
        {question.placeholder && <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>{k.placeholderNote}</div>}
        <QuestionCard
          question={question}
          index={i}
          total={visit.questionIds.length}
          answered={answer}
          onAnswer={(chosenIndex) => dispatch({ type: 'ANSWER_VISIT', chosenIndex })}
          onNext={() => dispatch({ type: 'NEXT_VISIT_QUESTION' })}
          nextLabel={last ? k.seeResult : k.next}
        />
      </>
    ) : null;
  } else {
    const slotsLeft = scheduleSlotsLeft(sim);
    body = (
      <>
        <p style={{ margin: '6px 0 0', opacity: 0.85 }}>{k.houseBody}</p>
        {slotsLeft <= 0 && <p style={{ color: '#e8c98a' }}>{k.noSlotsLeft}</p>}
        {ORDER.map((p) => {
          const held = sim.medals[p];
          const next = nextExamLevel(held);
          const unlocked = isPavilionUnlocked(sim, p);
          return (
            <div key={p} style={ROW} data-testid={`pavilion-${p}`}>
              <strong>{k.pavilions[p]}</strong>
              <div style={{ opacity: 0.8 }} data-testid={`medal-${p}`}>
                {held ? k.medalLine(k.medals[held]) : k.noMedal}
              </div>
              {!unlocked ? (
                <div style={{ opacity: 0.7, marginTop: 6 }}>{k.theatreLocked}</div>
              ) : (
                <div>
                  <button
                    type="button"
                    style={BUTTON}
                    data-testid={`practice-${p}`}
                    disabled={!canVisit(sim, p, 'practice')}
                    onClick={() => dispatch({ type: 'VISIT_PAVILION', pavilion: p, mode: 'practice' })}
                  >
                    {k.practice}
                  </button>
                  <button
                    type="button"
                    style={BUTTON}
                    data-testid={`exam-${p}`}
                    disabled={!canVisit(sim, p, 'exam')}
                    onClick={() => dispatch({ type: 'VISIT_PAVILION', pavilion: p, mode: 'exam' })}
                  >
                    {next ? k.exam(k.medals[next]) : k.examDone}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div style={BACKDROP} role="dialog" aria-modal="true" aria-label={k.houseHeading}>
      <div style={PANEL} data-testid="maltidens-hus">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{k.houseHeading}</strong>
          {!visit && (
            <button type="button" style={{ ...BUTTON, marginTop: 0, marginRight: 0 }} data-testid="close-house" onClick={onClose}>
              {k.close}
            </button>
          )}
        </div>
        {body}
      </div>
    </div>
  );
}
