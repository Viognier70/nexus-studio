// ORDER 264 (Nexus v1 etapp 2) — en fråga som en replik, med förklaring.
// ORDER 271 — formen efter Designs skärm O1 (paket 1, "Öva: frågeställaren
// förklarar efter fel svar"): frågan som rubrik, fyra svar i ett rutnät,
// förklaringen störst efter svaret. Fel svar streckat och grått, aldrig
// rött (LEVERANSNOT §3). Frågeställarens porträtt och namn står i
// vänsterspalten (MaltidensHusDialog).
//
// Speldesign > Öva och pröva: "Förklaringen efter varje svar är det
// viktigaste i hela kunskapssystemet. Den gör ett fel svar till något
// spelaren lär sig av." Frågan ställs av någon i rummet (FRÅGESTÄLLARE),
// inte som en tentamensfråga. Används av paviljongsbesöken.

import { useEffect, useState } from 'react';
import { strings } from '../../../content/strings';
import type { BankQuestion } from '../questionBank';
import { TIMED_OUT } from '../pavilionVisit';
import { ReferenceLine } from './ReferenceLine';
import { NxButton } from '../../ui/system/components';
import { NxIcon } from '../../ui/screens/icons';
import '../../ui/screens/screens.css';

interface Props {
  question: BankQuestion;
  index: number;
  total: number;
  answered: { chosenIndex: number; correct: boolean } | null;
  onAnswer: (chosenIndex: number) => void;
  onNext: () => void;
  nextLabel: string;
  // ORDER 270 — provet är på tid (EXAM.secondsPerQuestion, verklig tid).
  // Övningen har ingen tid.
  secondsPerQuestion?: number;
  // ORDER 271 — raden överst (O1: "Övning · ingen medalj står på spel").
  label?: string;
  // En rad till vänster om knappen längst ned.
  note?: string;
}

const LETTERS = ['A', 'B', 'C', 'D'];

type OptionState = 'open' | 'correct' | 'wrong' | 'other';

function optionState(i: number, props: Props): OptionState {
  const a = props.answered;
  if (!a) return 'open';
  if (i === props.question.correctIndex) return 'correct';
  if (i === a.chosenIndex) return 'wrong';
  return 'other';
}

// Nedräkningen startar om för varje fråga; när den når noll skickas
// TIMED_OUT, som räknas som fel.
function useQuestionTimer(props: Props): number | null {
  const { secondsPerQuestion, answered, question, onAnswer } = props;
  const [left, setLeft] = useState<number | null>(secondsPerQuestion ?? null);
  useEffect(() => {
    if (!secondsPerQuestion || answered) return;
    const started = performance.now();
    setLeft(secondsPerQuestion);
    const id = window.setInterval(() => {
      const remaining = secondsPerQuestion - (performance.now() - started) / 1000;
      if (remaining <= 0) {
        window.clearInterval(id);
        setLeft(0);
        onAnswer(TIMED_OUT);
      } else {
        setLeft(remaining);
      }
    }, 200);
    return () => window.clearInterval(id);
    // En ny fråga (id) eller ett svar startar om eller stoppar klockan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, answered, secondsPerQuestion]);
  return secondsPerQuestion ? left : null;
}

export function QuestionCard(props: Props) {
  const { question, answered } = props;
  const left = useQuestionTimer(props);
  const k = strings.knowledge;
  const asker = k.askers[question.asker];
  return (
    <div className="nx" data-testid="question-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="nxs-row-between" style={{ alignItems: 'center', paddingBottom: 'calc(24 * var(--nx-u))', borderBottom: '1px solid var(--nx-rule)' }}>
        <div className="nx-label nx-accent-text">
          {props.label ? <>{props.label} · </> : null}
          <span data-testid="question-of">{k.questionOf(props.index + 1, props.total)}</span>
        </div>
        <div className="nxs-row" style={{ gap: 'calc(24 * var(--nx-u))' }}>
          {left !== null && !answered && (
            <span className="nxs-countdown" data-low={left <= 5} data-testid="question-countdown">
              {k.secondsLeft(String(Math.ceil(left)))}
            </span>
          )}
          <div className="nxs-progress" aria-hidden>
            {Array.from({ length: props.total }, (_, i) => (
              <span key={i} data-state={i < props.index || (i === props.index && answered) ? 'done' : i === props.index ? 'now' : 'later'} />
            ))}
          </div>
        </div>
      </div>
      <h2 className="nx-mid nxs-mt-40" data-testid="question-prompt">
        <span className="nxs-sr">{asker}: </span>
        <span className="nxs-quote-mark">{question.prompt}</span>
      </h2>
      <div className="nxs-options">
        {question.options.map((opt, i) => {
          const state = optionState(i, props);
          return (
            <button
              key={i}
              type="button"
              className="nxs-option"
              data-state={state}
              disabled={answered !== null}
              data-testid={`option-${i}`}
              onClick={() => props.onAnswer(i)}
            >
              <span className="nxs-option-letter">{LETTERS[i]}</span>
              <span style={{ flex: 1 }}>{opt}</span>
              {answered && i === answered.chosenIndex && state !== 'correct' && (
                <span className="nx-label nxs-tag">{strings.screens.house.yourAnswer}</span>
              )}
              {state === 'correct' && <NxIcon name="check" size={32} />}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="nxs-explain" data-testid="explanation">
          <div className="nx-label nx-accent-text">{asker}</div>
          <p className="nx-body nxs-mt-8" style={{ fontSize: 'calc(30 * var(--nx-u))' }}>
            <strong>
              {answered.correct ? k.right : answered.chosenIndex === TIMED_OUT ? k.timedOut : k.wrong}
            </strong>{' '}
            {question.explanation}
          </p>
          <ReferenceLine reference={question.reference} />
        </div>
      )}
      <div className="nxs-foot" style={{ marginTop: 'auto', paddingTop: 'calc(24 * var(--nx-u))' }}>
        <p className="nx-small nx-muted">{props.note ?? ''}</p>
        {answered && (
          <div className="nxs-btn-primary-w">
            <NxButton testId="next-question" onClick={props.onNext} autoFocus>{props.nextLabel}</NxButton>
          </div>
        )}
      </div>
    </div>
  );
}
