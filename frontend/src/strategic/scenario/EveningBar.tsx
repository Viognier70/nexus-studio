// ORDER 264 (Nexus v1 etapp 2) — kvällen: quizen och vägen till morgonen.
//
// Speldesign > Quizen efter servicen: "Quizen är ett erbjudande, inte ett
// avbrott." Raden erbjuder quizen (tre frågor från kvällens svagaste
// axel) och låter spelaren gå till nästa morgon när hen vill (F17).

import { strings } from '../../content/strings.sv';
import { POST_SERVICE_QUIZ } from '../../sim/balance';
import { bankQuestionById } from '../knowledge/questionBank';
import { QuestionCard } from '../knowledge/ui/QuestionCard';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const BAR: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(560px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 140px)',
  overflowY: 'auto',
  padding: '14px 18px 16px',
  background: 'rgba(30, 22, 16, 0.94)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 41,
  boxSizing: 'border-box'
};

const BUTTON: React.CSSProperties = {
  padding: '10px 16px',
  minHeight: 44,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  marginRight: 8,
  marginTop: 10
};

export function EveningBar() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  if (sim.day.period !== 'evening') return null;
  const quiz = sim.postServiceQuiz;
  const k = strings.knowledge;
  const q = strings.quiz;

  let content: React.ReactNode = null;
  if (quiz?.status === 'offered') {
    content = (
      <>
        <div>{q.offer(k.axes[quiz.axis], POST_SERVICE_QUIZ.questions)}</div>
        <button type="button" style={BUTTON} data-testid="start-quiz" onClick={() => dispatch({ type: 'START_QUIZ' })}>
          {q.start}
        </button>
        <button type="button" style={BUTTON} data-testid="skip-quiz" onClick={() => dispatch({ type: 'SKIP_QUIZ' })}>
          {q.skip}
        </button>
      </>
    );
  } else if (quiz?.status === 'active') {
    const i = quiz.showingExplanation ? quiz.answers.length - 1 : quiz.answers.length;
    const question = bankQuestionById(quiz.questionIds[i]);
    const last = quiz.answers.length >= quiz.questionIds.length;
    content = question ? (
      <QuestionCard
        question={question}
        index={i}
        total={quiz.questionIds.length}
        answered={quiz.showingExplanation ? quiz.answers[i] : null}
        onAnswer={(chosenIndex) => dispatch({ type: 'ANSWER_QUIZ', chosenIndex })}
        onNext={() => dispatch({ type: 'NEXT_QUIZ_QUESTION' })}
        nextLabel={last ? q.nextMorning : k.next}
      />
    ) : null;
  } else if (quiz?.status === 'done') {
    content = <div data-testid="quiz-done">{q.done(quiz.creditDelta)}</div>;
  } else if (quiz?.status === 'skipped') {
    content = <div>{q.skipped}</div>;
  }

  const canLeave = quiz?.status !== 'active';
  return (
    <div style={BAR} data-testid="evening-bar">
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
        {q.heading}
      </div>
      {content}
      {canLeave && (
        <div>
          <button type="button" style={BUTTON} data-testid="end-evening" onClick={() => dispatch({ type: 'END_EVENING' })}>
            {q.nextMorning}
          </button>
        </div>
      )}
    </div>
  );
}
