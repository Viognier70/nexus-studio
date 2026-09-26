// ORDER 264 (Nexus v1 etapp 2) — kvällen och vägen till morgonen.
// ORDER 270 — kvällens lärdom ersätter quizen efter servicen (Vision
// Owner 2026-09-26): förklaringen till de fel beslut spelaren tog i
// kvällens händelser, och till dem där personalen fick besluta själv.

import { strings } from '../../content/strings.sv';
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

const ITEM: React.CSSProperties = {
  borderTop: '1px solid rgba(168, 146, 106, 0.35)',
  paddingTop: 8,
  marginTop: 8
};

export function EveningBar() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  if (sim.day.period !== 'evening') return null;
  const l = strings.lesson;
  const lesson = sim.incidents?.lesson ?? null;

  let content: React.ReactNode = null;
  if (lesson !== null) {
    content = lesson.length === 0 ? (
      <div data-testid="evening-lesson" data-items={0}>{l.none}</div>
    ) : (
      <div data-testid="evening-lesson" data-items={lesson.length}>
        <div style={{ opacity: 0.8 }}>{l.intro}</div>
        {lesson.map((item) => (
          <div key={item.incidentId} style={ITEM} data-testid={`lesson-${item.incidentId}`}>
            <div style={{ fontWeight: 600 }}>{item.title}</div>
            <div style={{ opacity: 0.85 }}>
              {item.chosen !== null ? l.youChose(item.chosen) : l.staffDecided(item.explanation)}
            </div>
            {item.chosen !== null && <div>{item.explanation}</div>}
            <div style={{ marginTop: 4, color: '#e8d9a8' }}>{l.better(item.better)}</div>
            <div style={{ opacity: 0.85 }}>{item.betterExplanation}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={BAR} data-testid="evening-bar">
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
        {lesson !== null ? l.heading : l.eveningHeading}
      </div>
      {content}
      <div>
        <button type="button" style={BUTTON} data-testid="end-evening" onClick={() => dispatch({ type: 'END_EVENING' })}>
          {l.nextMorning}
        </button>
      </div>
    </div>
  );
}
