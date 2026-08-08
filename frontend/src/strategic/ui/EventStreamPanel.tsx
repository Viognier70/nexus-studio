// ORDER 043 Addendum A — the service event stream panel.
//
// Player-facing text strip on the right of the viewport. Shows the
// last N events in chronological order (newest at the bottom, so new
// entries appear at the reading eye's endpoint rather than pushing
// older lines down like a scrolling log).
//
// Per §A.3, no colour-coding, no severity badges — vocabulary and
// cadence carry the reading, not styling. Older entries fade to keep
// the recent ones legible without a hard cutoff.
//
// Visible only during service (lunch / dinner) — outside service the
// stream is either empty or stale, and rendering it would compete
// with the ServiceLengthPicker / WagerPanel for the player's
// attention. Fade-out on transition rather than pop; the closing
// scene of an evening should carry a moment of its own text.

import { useSimState } from '../simulation/SimulationProvider';

// Show at most this many recent entries. Anything older is still in
// state.eventStream (bounded by STREAM_KEEP = 40) but off-screen.
const VISIBLE_ENTRIES = 8;

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 16,
  top: 96,               // clear of the top-right buttons (Om, ModeSwitchLink)
  bottom: 120,           // clear of the wager panel / scenario overlay
  width: 320,
  padding: '10px 12px',
  background: 'rgba(20, 14, 10, 0.62)',
  color: '#f0e8d4',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 3,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.42,
  letterSpacing: 0.15,
  pointerEvents: 'none',
  zIndex: 30,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  overflow: 'hidden'
};

const ENTRY_BASE_STYLE: React.CSSProperties = {
  marginTop: 6,
  paddingLeft: 4,
  borderLeft: '2px solid rgba(168, 146, 106, 0.55)'
};

export function EventStreamPanel() {
  const sim = useSimState();
  const period = sim.day.period;
  if (period !== 'lunch' && period !== 'dinner') return null;

  const entries = sim.eventStream.slice(-VISIBLE_ENTRIES);
  if (entries.length === 0) return null;

  return (
    <div style={PANEL_STYLE}>
      {entries.map((e, i) => {
        // Fade older entries. Newest (bottom, last in array) at full
        // opacity; each step back drops by ~9 %. The oldest of eight
        // sits at ~0.38 — legible but clearly receding.
        const stepsFromNewest = entries.length - 1 - i;
        const opacity = Math.max(0.35, 1 - stepsFromNewest * 0.09);
        return (
          <div
            key={`${e.at}-${i}`}
            style={{ ...ENTRY_BASE_STYLE, opacity }}
          >
            {e.text}
          </div>
        );
      })}
    </div>
  );
}
