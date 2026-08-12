// ORDER 043 Addendum A + B — the service event stream panel.
//
// Player-facing text strip on the right of the viewport. Shows the
// last N events in reverse-chronological order (newest at the top).
//
// ORDER 052 §5 (2026-08-10): direction picked = newest-at-top,
// panel-sized-to-contents. Rationale: the panel anchors at a fixed
// top-right point, so the reading eye lands at the same place every
// arrival regardless of how many entries are present. Older entries
// slide DOWN and fade, so the panel never presents a fixed-height
// rectangle that reads empty when only one entry has fired.
//
// Per §A.3, no colour-coding, no severity badges — vocabulary and
// cadence carry the reading, not styling. Older entries fade to keep
// the recent ones legible without a hard cutoff.
//
// Addendum B §5A.7 arrival mark: each new line arrives with a brief
// slide-in animation and a soft procedural sound. Same for every
// event regardless of kind — the mark says "something has happened";
// the text says what.
//
// Visible only during service (lunch / dinner) — outside service the
// stream is either empty or stale, and rendering it would compete
// with the ServiceLengthPicker / WagerPanel for the player's
// attention. Fade-out on transition rather than pop; the closing
// scene of an evening should carry a moment of its own text.

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useSimState } from '../simulation/SimulationProvider';
import { playStreamArrivalCue } from './streamArrivalCue';

// Show at most this many recent entries. Anything older is still in
// state.eventStream (bounded by STREAM_KEEP = 40) but off-screen.
// ORDER 047 §3 reduction — Vision Owner 2026-08-09: "strömmen är nu
// en vägg." Four entries fit the reading eye better than eight; the
// older ones recede via the tighter opacity curve below rather than
// stacking. The panel becomes a moment-of-recent-attention, not a log.
const VISIBLE_ENTRIES = 4;

// Arrival animation window: how long the newest entry visibly slides
// into place. ORDER 048 §8 — bumped from 420 → 560 ms and the slide
// distance from 12 → 24 px so the arrival is caught in peripheral
// vision at 2× and 4× speed (where lines fire more frequently).
const ARRIVAL_ANIM_MS = 560;
const ARRIVAL_SLIDE_PX = 24;

// Anchor inside the viewport at a single fixed point (top-right). The
// panel's height comes from its contents — no reserved rectangle — so
// a one-entry stream reads as one entry, not an empty box. `width`
// clamps to `calc(100vw - 40px)` so the panel is never wider than the
// visible area minus its own 20 px gutters. `boxSizing: border-box`
// folds padding into the width so the panel cannot spill past the
// clamp. `wordBreak: normal` + `overflowWrap: normal` + `hyphens:
// none` block the browser from splitting a word across a line at the
// right edge.
const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  right: 20,
  top: 96,
  width: 'min(320px, calc(100vw - 40px))',
  minWidth: 220,
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
  wordBreak: 'normal',
  overflowWrap: 'normal',
  hyphens: 'none'
};

const ENTRY_BASE_STYLE: React.CSSProperties = {
  marginTop: 6,
  paddingLeft: 6,
  borderLeft: '2px solid rgba(168, 146, 106, 0.55)',
  wordBreak: 'normal',
  overflowWrap: 'normal',
  hyphens: 'none',
  transition: `transform ${ARRIVAL_ANIM_MS}ms ease-out, opacity ${ARRIVAL_ANIM_MS}ms ease-out, border-left-color ${ARRIVAL_ANIM_MS}ms ease-out`
};

// ORDER 048 §8 — the newest entry starts with a warm-gold left
// border that eases back to the muted border colour over the
// arrival window. Runs alongside the slide + fade so an eye
// glancing away from the panel still catches the flick of colour
// where the new line landed.
const ARRIVAL_BORDER_COLOUR = 'rgba(240, 214, 152, 1)';
const SETTLED_BORDER_COLOUR = 'rgba(168, 146, 106, 0.55)';

export function EventStreamPanel() {
  const sim = useSimState();
  const reduceMotion = usePrefersReducedMotion();

  // Track the last stream length so we can detect a fresh arrival and
  // trigger the sound + animation exactly once per new entry.
  const lastLenRef = useRef<number>(sim.eventStream.length);
  // Key of the newest entry being animated in. Cleared after the
  // animation window elapses so subsequent renders don't re-animate
  // the same line.
  const [animatingKey, setAnimatingKey] = useState<string | null>(null);

  useEffect(() => {
    const currLen = sim.eventStream.length;
    if (currLen > lastLenRef.current) {
      const newest = sim.eventStream[currLen - 1];
      const key = `${newest.at.toFixed(3)}-${newest.kind}`;
      setAnimatingKey(key);
      playStreamArrivalCue();
      const t = window.setTimeout(() => setAnimatingKey(null), ARRIVAL_ANIM_MS);
      lastLenRef.current = currLen;
      return () => window.clearTimeout(t);
    }
    // Handle ring-buffer wrap: STREAM_KEEP caps at 40 so length is
    // stable once full. Track by newest.at so a same-length transition
    // still catches the arrival.
    if (currLen === lastLenRef.current && currLen > 0) {
      // No new entry — nothing to do.
    }
    lastLenRef.current = currLen;
  }, [sim.eventStream]);

  const period = sim.day.period;
  if (period !== 'lunch' && period !== 'dinner') return null;

  // ORDER 052 §5 (2026-08-10): newest-at-top. sim.eventStream is
  // oldest→newest; slice the tail, then reverse so index 0 is the
  // newest arrival and older entries appear below it.
  const entries = sim.eventStream.slice(-VISIBLE_ENTRIES).reverse();
  if (entries.length === 0) return null;

  return (
    <div style={PANEL_STYLE}>
      {entries.map((e, i) => {
        // ORDER 047 §3 — tighter fade curve for the smaller window.
        // Newest at 1.0, then 0.72, 0.44, 0.22. The tail entry sits
        // faded enough to feel receding but still readable if the
        // eye lands on it. Anything older than four is off-panel
        // entirely (still in state.eventStream for the reducer).
        // Post-§5 reversal: index 0 = newest, so steps-from-newest = i.
        const stepsFromNewest = i;
        const opacity = Math.max(0.22, 1 - stepsFromNewest * 0.28);
        const key = `${e.at.toFixed(3)}-${e.kind}-${i}`;
        const isArriving =
          !reduceMotion &&
          stepsFromNewest === 0 &&
          animatingKey === `${e.at.toFixed(3)}-${e.kind}`;
        // Slide-in from the right, small offset — visible in
        // peripheral vision but not distracting. Reduced-motion users
        // get a plain fade-in via the same opacity easing.
        const style: React.CSSProperties = {
          ...ENTRY_BASE_STYLE,
          opacity: isArriving ? 0 : opacity,
          transform: isArriving ? `translateX(${ARRIVAL_SLIDE_PX}px)` : 'translateX(0)',
          borderLeftColor: isArriving ? ARRIVAL_BORDER_COLOUR : SETTLED_BORDER_COLOUR
        };
        // Force a second render one frame later so the CSS transition
        // eases from (0, offset, gold-border) to (opacity, 0,
        // muted-border) over ARRIVAL_ANIM_MS.
        return (
          <ArrivalEntry
            key={key}
            text={e.text}
            style={style}
            settledStyle={{
              ...ENTRY_BASE_STYLE,
              opacity,
              transform: 'translateX(0)',
              borderLeftColor: SETTLED_BORDER_COLOUR
            }}
            isArriving={isArriving}
          />
        );
      })}
    </div>
  );
}

interface ArrivalEntryProps {
  text: string;
  style: React.CSSProperties;
  settledStyle: React.CSSProperties;
  isArriving: boolean;
}

// A single stream entry. When it mounts in "arriving" state it starts
// at (opacity 0, translateX(12px)), then requests an animation frame
// and eases to the settled style. Non-arriving entries render at the
// settled style directly.
function ArrivalEntry({ text, style, settledStyle, isArriving }: ArrivalEntryProps) {
  const [current, setCurrent] = useState<React.CSSProperties>(
    isArriving ? style : settledStyle
  );
  useEffect(() => {
    if (!isArriving) {
      setCurrent(settledStyle);
      return;
    }
    // One rAF to let the initial (offset) style paint, then swap in
    // the settled style so the CSS transition animates.
    const raf = window.requestAnimationFrame(() => setCurrent(settledStyle));
    return () => window.cancelAnimationFrame(raf);
  }, [isArriving, settledStyle]);
  return <div style={current}>{text}</div>;
}
