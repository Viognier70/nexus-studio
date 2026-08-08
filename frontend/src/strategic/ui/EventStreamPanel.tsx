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

// Anchor inside the viewport with a right margin that survives narrow
// widths. `width` clamps to `calc(100vw - 40px)` so the panel is never
// wider than the visible area minus its own 20 px gutters. `boxSizing:
// border-box` folds padding into the width so the panel cannot spill
// past the clamp. `wordBreak: normal` + `overflowWrap: normal` +
// `hyphens: none` block the browser from splitting a Swedish word
// across a line at the right edge (Vision Owner 2026-08-08: "texten
// bryts mitt i ordet").
const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 20,
  top: 96,                                    // clear of top-right buttons
  bottom: 120,                                // clear of wager / scenario overlay
  width: 'min(320px, calc(100vw - 40px))',
  minWidth: 220,                              // still readable on the narrowest viewports
  boxSizing: 'border-box',
  padding: '10px 14px',
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
  overflow: 'hidden',
  wordBreak: 'normal',
  overflowWrap: 'normal',
  hyphens: 'none'
};

const ENTRY_BASE_STYLE: React.CSSProperties = {
  marginTop: 6,
  paddingLeft: 6,
  borderLeft: '2px solid rgba(168, 146, 106, 0.55)',
  // Belt-and-braces: same wrap rules per entry so a nested style from
  // an ancestor cannot override them at the paragraph level.
  wordBreak: 'normal',
  overflowWrap: 'normal',
  hyphens: 'none'
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
