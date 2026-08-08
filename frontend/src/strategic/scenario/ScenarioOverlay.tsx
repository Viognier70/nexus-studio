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
  const { phase } = sim.scenario;

  if (phase === 'idle' || phase === 'resolving' || phase === 'settled') return null;

  if (phase === 'subject') {
    return (
      <div style={OVERLAY_STYLE}>
        <div style={BODY_STYLE}>{strings.scenario.subject.body}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            style={SUBJECT_CTA_STYLE}
            onClick={() => dispatch({ type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' })}
          >
            {strings.scenario.subject.cta}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'difficulty') {
    return (
      <div style={OVERLAY_STYLE}>
        <div style={BODY_STYLE}>{strings.scenario.difficulty.body}</div>
        <div style={BUTTON_ROW_STYLE}>
          <button
            type="button"
            style={BUTTON_STYLE}
            onClick={() => dispatch({ type: 'SET_SCENARIO_DIFFICULTY', difficulty: 1 })}
          >
            {strings.scenario.difficulty.options.low}
          </button>
          <button
            type="button"
            style={BUTTON_STYLE}
            onClick={() => dispatch({ type: 'SET_SCENARIO_DIFFICULTY', difficulty: 2 })}
          >
            {strings.scenario.difficulty.options.mid}
          </button>
          <button
            type="button"
            style={BUTTON_STYLE}
            onClick={() => dispatch({ type: 'SET_SCENARIO_DIFFICULTY', difficulty: 3 })}
          >
            {strings.scenario.difficulty.options.high}
          </button>
        </div>
      </div>
    );
  }

  // phase === 'situation'
  return (
    <div style={OVERLAY_STYLE}>
      <div style={BODY_STYLE}>{strings.scenario.situation.body}</div>
      <div style={{ ...BUTTON_ROW_STYLE, flexDirection: 'column', alignItems: 'stretch' }}>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => dispatch({ type: 'RESOLVE_SCENARIO', choice: 'A' })}
        >
          {strings.scenario.situation.options.A}
        </button>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => dispatch({ type: 'RESOLVE_SCENARIO', choice: 'B' })}
        >
          {strings.scenario.situation.options.B}
        </button>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => dispatch({ type: 'RESOLVE_SCENARIO', choice: 'C' })}
        >
          {strings.scenario.situation.options.C}
        </button>
      </div>
    </div>
  );
}
