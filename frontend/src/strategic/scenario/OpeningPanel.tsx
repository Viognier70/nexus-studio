// ORDER 045 — the opening image before mise en place.
//
// Visible for OPENING_DURATION_SEC (10 s) after OPEN_SERVICE, then
// closes as prep begins. Names the evening's weather, outdoor
// viability, active outer-world factors (if any — rare per §A.7),
// and the standing queue outside. A countdown at the bottom ticks
// the seconds until doors open.
//
// Sits over the room's centre — this is the deliberate moment where
// the player reads the evening before the doors open. Non-modal
// (no interaction blocked) but visually dominant during its brief
// window, per Vision Owner's brief.

import { strings } from '../../content/strings.sv';
import { useSimState } from '../simulation/SimulationProvider';
import { FACTOR_BODY, FACTOR_LABEL } from '../simulation/worldFactors';

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(480px, calc(100vw - 40px))',
  boxSizing: 'border-box',
  padding: '20px 24px 22px',
  background: 'rgba(20, 14, 10, 0.90)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.5,
  letterSpacing: 0.2,
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
  pointerEvents: 'none',
  zIndex: 45,
  wordBreak: 'normal',
  overflowWrap: 'normal',
  hyphens: 'none'
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 10
};

const WEATHER_LINE_STYLE: React.CSSProperties = {
  fontSize: 15,
  marginBottom: 4,
  fontWeight: 500
};

const OUTDOOR_LINE_STYLE: React.CSSProperties = {
  opacity: 0.85,
  marginBottom: 12
};

const FACTOR_BLOCK_STYLE: React.CSSProperties = {
  marginBottom: 10,
  paddingLeft: 8,
  borderLeft: '2px solid rgba(168, 146, 106, 0.55)'
};

const FACTOR_LABEL_STYLE: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13
};

const FACTOR_BODY_STYLE: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.82,
  marginTop: 2
};

const WAITING_STYLE: React.CSSProperties = {
  marginTop: 14,
  marginBottom: 12,
  fontStyle: 'italic',
  opacity: 0.88
};

// ORDER 048 §7 — the countdown must be unmissable. Bumped from a
// subtle uppercase 12 px caption to a large centred digit with a
// small label. The player should never wonder whether something is
// about to happen; the number is the whole story.
const COUNTDOWN_LABEL_STYLE: React.CSSProperties = {
  marginTop: 14,
  paddingTop: 12,
  borderTop: '1px solid rgba(168, 146, 106, 0.45)',
  textAlign: 'center',
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.72
};
const COUNTDOWN_DIGIT_STYLE: React.CSSProperties = {
  marginTop: 4,
  textAlign: 'center',
  fontSize: 42,
  fontWeight: 700,
  letterSpacing: 1,
  color: '#f7ecd0',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  lineHeight: 1
};

export function OpeningPanel() {
  const sim = useSimState();
  const { openingEndsAt, weather, waitingAtOpening, worldFactors } = sim.day;
  if (openingEndsAt === null || weather === null) return null;
  if (sim.simTime >= openingEndsAt) return null;

  const remainingSec = Math.max(0, Math.ceil(openingEndsAt - sim.simTime));

  const precipText = strings.opening.precipitation[weather.precipitation];
  const cloudText = strings.opening.clouds[weather.cloudCover];
  const weatherLine = `${weather.tempC}${strings.opening.tempSuffix}, vind ${weather.windMS} ${strings.opening.windSuffix}, ${precipText}, ${cloudText}.`;

  const waitingLine: string =
    waitingAtOpening === 0
      ? strings.opening.waitingNone
      : waitingAtOpening === 1
      ? strings.opening.waitingSingular
      : strings.opening.waitingPlural(waitingAtOpening);

  return (
    <div style={OVERLAY_STYLE}>
      <div style={HEADING_STYLE}>{strings.opening.heading}</div>
      <div style={WEATHER_LINE_STYLE}>{weatherLine}</div>
      <div style={OUTDOOR_LINE_STYLE}>
        {weather.outdoorViable ? strings.opening.outdoorViable : strings.opening.outdoorClosed}
      </div>
      {worldFactors.map((f) => (
        <div key={f.kind} style={FACTOR_BLOCK_STYLE}>
          <div style={FACTOR_LABEL_STYLE}>{FACTOR_LABEL[f.kind]}</div>
          <div style={FACTOR_BODY_STYLE}>{FACTOR_BODY[f.kind]}</div>
        </div>
      ))}
      <div style={WAITING_STYLE}>{waitingLine}</div>
      <div style={COUNTDOWN_LABEL_STYLE}>
        {strings.opening.countdownPrefix}
      </div>
      <div style={COUNTDOWN_DIGIT_STYLE} aria-live="polite">
        {remainingSec}
        <span style={{ fontSize: 18, marginLeft: 2, fontWeight: 500 }}>
          {strings.opening.countdownSecondsSuffix}
        </span>
      </div>
    </div>
  );
}
