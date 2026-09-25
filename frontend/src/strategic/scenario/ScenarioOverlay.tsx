// ORDER 042 §3.3 — the scenario UI. Walks the player through:
//   subject → difficulty → situation → response
// Never a modal, never a result popup (CAMERA_AND_GAMEPLAY_BIBLE §8.1).
// The overlay is a small chrome strip at the bottom of the viewport,
// non-dominating (EXECUTIVE_DESIGN_DIRECTIVE_001 §11 "no numeric HUD
// dominating the interface"). Response choices are neutral — no
// A-is-correct highlight (LEARNING_AND_SCENARIO_ARCHITECTURE §4.2).
//
// Once the player picks a response, the overlay vanishes. The mentor
// comment that closes the loop lives in the 3D scene as MentorComment,
// not here.

import { strings } from '../../content/strings.sv';
import { ASKER_PREFIX, SENDER_PREFIX, scenarioById } from '../simulation/scenarios';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  maxWidth: 720,
  minWidth: 360,
  padding: '14px 20px 16px',
  background: 'rgba(30, 22, 16, 0.86)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 40
};

const BODY_STYLE: React.CSSProperties = {
  marginBottom: 12
};

const BUTTON_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-start'
};

const BUTTON_STYLE: React.CSSProperties = {
  flex: '1 1 auto',
  minWidth: 120,
  padding: '9px 14px',
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer'
};

const SUBJECT_CTA_STYLE: React.CSSProperties = {
  ...BUTTON_STYLE,
  flex: '0 0 auto',
  minWidth: 100,
  alignSelf: 'flex-end'
};

export function ScenarioOverlay() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const { phase, scenarioId, senderRole, pendingQuestion } = sim.scenario;

  if (phase === 'idle' || phase === 'resolving' || phase === 'settled') return null;

  // Prefer the spec (post-ORDER 043 v3 §10 step 5). Falls back to the
  // legacy strings.scenario keys for pre-refactor tests / manual
  // TRIGGER_SCENARIO without a scenarioId set.
  const spec = scenarioId ? scenarioById(scenarioId) : null;
  // ORDER 048 §4 — prefix the subject-body with the sender's role
  // ("Värden: ..."). When no sender was assigned (dev trigger with
  // an empty team, defensive fallback) the plain body is used.
  const senderPrefix = senderRole ? `${SENDER_PREFIX[senderRole]}: ` : '';
  const rawSubjectBody = spec?.subjectBody ?? strings.scenario.subject.body;
  const subjectBody = senderPrefix + rawSubjectBody;
  const subjectCta = spec?.subjectCta ?? strings.scenario.subject.cta;
  const situationBody = spec?.situationBody ?? strings.scenario.situation.body;
  const labelA = spec?.choices.A.label ?? strings.scenario.situation.options.A;
  const labelB = spec?.choices.B.label ?? strings.scenario.situation.options.B;
  const labelC = spec?.choices.C.label ?? strings.scenario.situation.options.C;

  if (phase === 'subject') {
    return (
      <div style={OVERLAY_STYLE} data-testid="scenario-overlay">
        <div style={BODY_STYLE}>{subjectBody}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            style={SUBJECT_CTA_STYLE}
            onClick={() => dispatch({ type: 'ADVANCE_SCENARIO_TO_SITUATION' })}
          >
            {subjectCta}
          </button>
        </div>
      </div>
    );
  }

  // ORDER 048 §5 (2026-08-10 amendment) — the 'difficulty' phase
  // (self-reported confidence) is retired. Subject → situation
  // directly. The slot is reserved for the professional questions
  // ORDER 049 §5.1 will land here.

  // ORDER 048 §5 — professional question phase. Appears AFTER a
  // scenario choice with an attached question. Same overlay shape
  // as the situation phase, prefixed with the question's own
  // sender (typically the specialist role, e.g. Kocken for a
  // kitchen-technique question, Värden for a hospitality one).
  if (phase === 'question' && pendingQuestion) {
    // ORDER 234 — askerRole (QuestionAsker) läses först, faller
    // tillbaka till senderRole (StaffRole) för scenariofrågor.
    const qPrefix = pendingQuestion.askerRole
      ? `${ASKER_PREFIX[pendingQuestion.askerRole]}: `
      : pendingQuestion.senderRole
        ? `${SENDER_PREFIX[pendingQuestion.senderRole]}: `
        : '';
    return (
      <div style={OVERLAY_STYLE} data-testid="scenario-overlay">
        <div style={BODY_STYLE}>{qPrefix + pendingQuestion.body}</div>
        <div style={{ ...BUTTON_ROW_STYLE, flexDirection: 'column', alignItems: 'stretch' }}>
          {pendingQuestion.options.map((o, i) => (
            <button
              key={i}
              type="button"
              style={BUTTON_STYLE}
              onClick={() => dispatch({ type: 'ANSWER_QUESTION', index: i })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ORDER 234 — anchor-frågans post-answer-fas. Visar frågan i muted,
  // markerar spelarens val (rätt = grön, fel = röd), markerar det
  // rätta svaret, och renderar FÖRKLARING-texten. En "Continue"-knapp
  // dispatch:ar ACK_QUESTION_EXPLANATION. Scenariofrågor passerar
  // inte hit (deras path går resolving → settled utan explanation-fas).
  if (phase === 'question-explanation' && pendingQuestion && pendingQuestion.explanation) {
    const qPrefix = pendingQuestion.askerRole
      ? `${ASKER_PREFIX[pendingQuestion.askerRole]}: `
      : '';
    const lastIdx = pendingQuestion.lastAnswerIndex ?? -1;
    const wasCorrect = pendingQuestion.lastAnswerCorrect ?? false;
    return (
      <div style={OVERLAY_STYLE} data-testid="scenario-overlay">
        <div style={{ ...BODY_STYLE, opacity: 0.7 }}>{qPrefix + pendingQuestion.body}</div>
        <div style={{ ...BUTTON_ROW_STYLE, flexDirection: 'column', alignItems: 'stretch' }}>
          {pendingQuestion.options.map((o, i) => {
            const isPlayerChoice = i === lastIdx;
            const isCorrect = o.correct;
            let bg = 'transparent';
            let borderColor = 'rgba(168, 146, 106, 0.35)';
            if (isPlayerChoice && isCorrect) {
              bg = 'rgba(120, 168, 100, 0.22)';
              borderColor = '#a8c896';
            } else if (isPlayerChoice && !isCorrect) {
              bg = 'rgba(200, 100, 80, 0.22)';
              borderColor = '#d89078';
            } else if (isCorrect) {
              // Rätta svaret (spelaren valde annat) — markera grönt
              // så förklaringen kan pekar direkt.
              borderColor = '#a8c896';
            }
            return (
              <div
                key={i}
                style={{
                  padding: '8px 10px',
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 3,
                  fontSize: 13,
                  opacity: isPlayerChoice || isCorrect ? 1 : 0.55
                }}
              >
                {isPlayerChoice ? '▸ ' : isCorrect ? '✓ ' : '  '}
                {o.label}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
          {wasCorrect ? 'Correct. ' : ''}
          {pendingQuestion.explanation}
        </div>
        <div style={{ ...BUTTON_ROW_STYLE, marginTop: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            style={BUTTON_STYLE}
            onClick={() => dispatch({ type: 'ACK_QUESTION_EXPLANATION' })}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // phase === 'situation'
  return (
    <div style={OVERLAY_STYLE} data-testid="scenario-overlay">
      <div style={BODY_STYLE}>{situationBody}</div>
      <div style={{ ...BUTTON_ROW_STYLE, flexDirection: 'column', alignItems: 'stretch' }}>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => dispatch({ type: 'RESOLVE_SCENARIO', choice: 'A' })}
        >
          {labelA}
        </button>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => dispatch({ type: 'RESOLVE_SCENARIO', choice: 'B' })}
        >
          {labelB}
        </button>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => dispatch({ type: 'RESOLVE_SCENARIO', choice: 'C' })}
        >
          {labelC}
        </button>
      </div>
    </div>
  );
}
