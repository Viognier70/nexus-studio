// ORDER 042 §3.4 — the mentor comment surfaces in the world, not in
// a modal. When the reducer transitions the scenario to `settled`, it
// writes a Swedish line to `scenario.mentorComment` (per {choice ×
// difficulty} from strings.sv). This component reads that field and
// renders it as a small drei <Html> bubble floating just above the
// player business, so the player reads it in the same view where the
// consequence played out — no popup, no separate screen (CAMERA_AND_
// GAMEPLAY_BIBLE §8.1).
//
// The bubble fades in when the settle transition fires and fades out
// after ~15 sim-seconds, so it doesn't linger and dominate the room.

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';

const BUBBLE_HOLD_SIM_S = 15;
const BUBBLE_FADE_SIM_S = 3;
const BUBBLE_HEIGHT_M = 7.6;

// Bubble sizing: constant screen-space (see distanceFactor comment
// below). `width` fixed rather than `maxWidth` so the wrap point does
// not drift with content length — the bubble always occupies the same
// footprint over the room. 380 px + 14 px padding fits typical Swedish
// mentor lines on 2–3 rows without breaking words.
const BUBBLE_STYLE: React.CSSProperties = {
  color: '#f5f0e0',
  background: 'rgba(30, 22, 16, 0.86)',
  padding: '10px 14px',
  borderRadius: 4,
  border: '1px solid #a8926a',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.35,
  fontWeight: 500,
  letterSpacing: 0.2,
  width: 380,
  textAlign: 'center',
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'none',
  whiteSpace: 'normal',
  wordBreak: 'normal',
  overflowWrap: 'normal'
};

export function MentorComment() {
  const layout = usePlayerBusinessInterior();
  const sim = useSimState();
  const { mentorComment, mentorCommentAt } = sim.scenario;

  const opacity = useMemo(() => {
    if (mentorComment === null || mentorCommentAt === null) return 0;
    const elapsed = sim.simTime - mentorCommentAt;
    if (elapsed < 0) return 0;
    if (elapsed >= BUBBLE_HOLD_SIM_S + BUBBLE_FADE_SIM_S) return 0;
    if (elapsed <= BUBBLE_HOLD_SIM_S) return 1;
    // Fade out over BUBBLE_FADE_SIM_S seconds
    const t = (elapsed - BUBBLE_HOLD_SIM_S) / BUBBLE_FADE_SIM_S;
    return Math.max(0, 1 - t);
  }, [mentorComment, mentorCommentAt, sim.simTime]);

  if (!layout || !mentorComment || opacity <= 0) return null;

  const [cx, cz] = layout.centre;
  // No distanceFactor: keeps the bubble at constant DOM pixel size
  // regardless of camera distance. With distanceFactor the bubble was
  // scaled down at interior zoom until DOM width (~340 px) mapped to
  // ~50 visual px, forcing one-word-per-line and covering the room
  // during the consequence window — exactly when the room needs to
  // be readable (2026-08-08 Vision Owner sighting).
  return (
    <Html
      position={[cx, BUBBLE_HEIGHT_M, cz]}
      center
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ ...BUBBLE_STYLE, opacity }}>{mentorComment}</div>
    </Html>
  );
}
