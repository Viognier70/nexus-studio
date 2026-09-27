// ORDER 264 (Nexus v1 etapp 2) — en fråga som en replik, med förklaring.
//
// Speldesign > Öva och pröva: "Förklaringen efter varje svar är det
// viktigaste i hela kunskapssystemet. Den gör ett fel svar till något
// spelaren lär sig av." Frågan ställs av någon i rummet (FRÅGESTÄLLARE),
// inte som en tentamensfråga. Används av paviljongsbesöken och av
// quizen efter servicen.

import { useEffect, useState } from 'react';
import { strings } from '../../../content/strings.sv';
import type { BankQuestion } from '../questionBank';
import { TIMED_OUT } from '../pavilionVisit';
import { ReferenceLine } from './ReferenceLine';

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
}

const LETTERS = ['A', 'B', 'C', 'D'];

const OPTION_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  minHeight: 44,
  marginTop: 8,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  font: 'inherit',
  fontSize: 14,
  lineHeight: 1.35,
  cursor: 'pointer'
};

const NEXT_STYLE: React.CSSProperties = {
  ...OPTION_STYLE,
  width: 'auto',
  display: 'inline-block',
  fontWeight: 600,
  marginTop: 12
};

function optionStyle(i: number, props: Props): React.CSSProperties {
  const a = props.answered;
  if (!a) return OPTION_STYLE;
  if (i === props.question.correctIndex) return { ...OPTION_STYLE, background: '#2f4a2c', borderColor: '#8fc27f', cursor: 'default' };
  if (i === a.chosenIndex) return { ...OPTION_STYLE, background: '#4a2a24', borderColor: '#c9806f', cursor: 'default' };
  return { ...OPTION_STYLE, opacity: 0.55, cursor: 'default' };
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
  return (
    <div data-testid="question-card">
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.7 }}>
        {strings.knowledge.questionOf(props.index + 1, props.total)}
        {left !== null && !answered && (
          <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: left <= 5 ? '#d0694e' : undefined }} data-testid="question-countdown">
            {strings.knowledge.secondsLeft(String(Math.ceil(left)))}
          </span>
        )}
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.45 }} data-testid="question-prompt">
        <strong>{strings.knowledge.askers[question.asker]}:</strong> {question.prompt}
      </p>
      {question.options.map((opt, i) => (
        <button
          key={i}
          type="button"
          style={optionStyle(i, props)}
          disabled={answered !== null}
          data-testid={`option-${i}`}
          onClick={() => props.onAnswer(i)}
        >
          <strong style={{ marginRight: 8 }}>{LETTERS[i]}</strong>
          {opt}
        </button>
      ))}
      {answered && (
        <div style={{ marginTop: 12 }} data-testid="explanation">
          <strong>
            {answered.correct ? strings.knowledge.right : answered.chosenIndex === TIMED_OUT ? strings.knowledge.timedOut : strings.knowledge.wrong}
          </strong>{' '}
          {question.explanation}
          <ReferenceLine reference={question.reference} />
          <div>
            <button type="button" style={NEXT_STYLE} data-testid="next-question" onClick={props.onNext}>
              {props.nextLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
