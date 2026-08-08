// ORDER 043 v3 §10 step 1 — the service-length picker.
//
// Rendered during morning (pick lunch length or skip) and afternoon
// (pick dinner length). Hidden during services, evening, and any
// transition. Same overlay footprint as ScenarioOverlay: a small
// chrome strip at the bottom of the viewport, non-dominating, no
// numeric HUD.
//
// Length choices are a small set of round numbers (5, 10, 15, 30
// minutes). The player commits by clicking one; there's no scroll
// or slider — this is a decision, not a fiddle. 3-min service is
// available via the SERVICE_LENGTH_MIN_MINUTES constant but not in
// the picker default set — it's a corner case unlocked later if a
// scenario or the team model calls for a super-short window.
//
// Removed / restyled at step 2 (the team), which introduces the
// morning investment phase and will likely absorb this picker into a
// larger "open the business" UI.

import { strings } from '../../content/strings.sv';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const LENGTH_CHOICES: readonly number[] = [5, 10, 15, 30];

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  maxWidth: 720,
  minWidth: 380,
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

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 4
};

const BODY_STYLE: React.CSSProperties = {
  marginBottom: 12
};

const BUTTON_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center'
};

const BUTTON_STYLE: React.CSSProperties = {
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

const OPEN_BUTTON_STYLE: React.CSSProperties = {
  ...BUTTON_STYLE
};

const SKIP_BUTTON_STYLE: React.CSSProperties = {
  ...BUTTON_STYLE,
  background: '#2a1e14',
  fontWeight: 500,
  opacity: 0.85
};

export function ServiceLengthPicker() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const period = sim.day.period;

  if (period === 'morning') {
    return (
      <div style={OVERLAY_STYLE}>
        <div style={HEADING_STYLE}>{strings.day.morning.heading}</div>
        <div style={BODY_STYLE}>{strings.day.morning.body}</div>
        <div style={BUTTON_ROW_STYLE}>
          <span style={{ marginRight: 4, opacity: 0.72 }}>
            {strings.day.morning.openLunch}:
          </span>
          {LENGTH_CHOICES.map((mins) => (
            <button
              key={mins}
              type="button"
              style={OPEN_BUTTON_STYLE}
              onClick={() =>
                dispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: mins })
              }
            >
              {mins} {strings.day.minutesSuffix}
            </button>
          ))}
          <button
            type="button"
            style={{ ...SKIP_BUTTON_STYLE, marginLeft: 'auto' }}
            onClick={() => dispatch({ type: 'SKIP_LUNCH' })}
          >
            {strings.day.morning.skipLunch}
          </button>
        </div>
      </div>
    );
  }

  if (period === 'afternoon') {
    return (
      <div style={OVERLAY_STYLE}>
        <div style={HEADING_STYLE}>{strings.day.afternoon.heading}</div>
        <div style={BODY_STYLE}>{strings.day.afternoon.body}</div>
        <div style={BUTTON_ROW_STYLE}>
          <span style={{ marginRight: 4, opacity: 0.72 }}>
            {strings.day.afternoon.openDinner}:
          </span>
          {LENGTH_CHOICES.map((mins) => (
            <button
              key={mins}
              type="button"
              style={OPEN_BUTTON_STYLE}
              onClick={() =>
                dispatch({ type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: mins })
              }
            >
              {mins} {strings.day.minutesSuffix}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
