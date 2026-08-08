// ORDER 046 §3 — the evening's account, in the observer's voice.
//
// Renders state.eveningAccount as a centred paragraph over the room,
// visible from the moment the service closes (natural or collapse)
// until the day advances to the next morning. Fade-in over ~1.5 s,
// hold for ~23 s, fade-out over ~5 s — the last fraction of the
// evening pause bleeds into morning silence.
//
// Layout: centre viewport, ~640 px wide, warm-beige paper against a
// dark overlay. Non-modal — the sim continues to tick (village
// residents, delivery cycle, day advance) behind it. No dismiss
// button; the panel goes with the transition.

import { useSimState } from '../simulation/SimulationProvider';

const PANEL_WRAPPER_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 40
};

const PANEL_STYLE: React.CSSProperties = {
  maxWidth: 640,
  padding: '32px 40px',
  margin: '0 24px',
  background: 'rgba(24, 18, 12, 0.92)',
  color: '#f5efdb',
  border: '1px solid #a8926a',
  borderRadius: 4,
  fontFamily: '"Times New Roman", "Georgia", serif',
  fontSize: 17,
  lineHeight: 1.6,
  letterSpacing: 0.25,
  textAlign: 'left',
  boxShadow: '0 12px 40px rgba(0,0,0,0.55)'
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  opacity: 0.65,
  marginBottom: 12,
  fontFamily: 'system-ui, sans-serif'
};

// Timing constants (in seconds). Matches EVENING_TO_MORNING_PAUSE_SEC
// (30) with a 2-s fade-in, 23-s hold, 5-s fade-out. Anything shorter
// rushes the reading.
const FADE_IN_SEC = 2;
const HOLD_SEC = 23;
const FADE_OUT_SEC = 5;
const TOTAL_SEC = FADE_IN_SEC + HOLD_SEC + FADE_OUT_SEC;

function envelope(elapsed: number): number {
  if (elapsed < 0) return 0;
  if (elapsed < FADE_IN_SEC) return elapsed / FADE_IN_SEC;
  if (elapsed < FADE_IN_SEC + HOLD_SEC) return 1;
  if (elapsed < TOTAL_SEC) {
    const t = (elapsed - FADE_IN_SEC - HOLD_SEC) / FADE_OUT_SEC;
    return 1 - t;
  }
  return 0;
}

export function EveningAccountPanel() {
  const sim = useSimState();
  const account = sim.eveningAccount;
  if (!account) return null;

  const elapsed = sim.simTime - account.presentedAt;
  const opacity = envelope(elapsed);
  if (opacity <= 0) return null;

  return (
    <div style={{ ...PANEL_WRAPPER_STYLE, opacity }}>
      <div style={PANEL_STYLE}>
        <div style={HEADING_STYLE}>Kvällens redovisning</div>
        <div>{account.paragraph}</div>
      </div>
    </div>
  );
}
