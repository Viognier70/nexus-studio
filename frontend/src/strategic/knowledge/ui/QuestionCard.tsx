// ORDER 264 (Nexus v1 etapp 2) — en fråga som en replik, med förklaring.
//
// Speldesign > Öva och pröva: "Förklaringen efter varje svar är det
// viktigaste i hela kunskapssystemet. Den gör ett fel svar till något
// spelaren lär sig av." Frågan ställs av någon i rummet (FRÅGESTÄLLARE),
// inte som en tentamensfråga. Används av paviljongsbesöken och av
// quizen efter servicen.

import { strings } from '../../../content/strings.sv';
import type { BankQuestion } from '../questionBank';

interface Props {
  question: BankQuestion;
  index: number;
  total: number;
  answered: { chosenIndex: number; correct: boolean } | null;
  onAnswer: (chosenIndex: number) => void;
  onNext: () => void;
  nextLabel: string;
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

export function QuestionCard(props: Props) {
  const { question, answered } = props;
  return (
    <div data-testid="question-card">
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.7 }}>
        {strings.knowledge.questionOf(props.index + 1, props.total)}
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
          <strong>{answered.correct ? strings.knowledge.right : strings.knowledge.wrong}</strong>{' '}
          {question.explanation}
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
