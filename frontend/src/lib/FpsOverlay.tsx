// ORDER 056 Del A — dev-only FPS DOM overlay.
//
// The strategic view surfaces FPS inside its DevPanel already; this
// component is what the first-person app uses so the two views report
// FPS separately (they don't share a Canvas or a DevPanel). Renders a
// tiny monospace strip in a corner that reads `fps=xx (label)`.
//
// Tree-shakes in production via the `import.meta.env.DEV` guard.

import { useEffect, useState } from 'react';
import { fpsMeter } from './fpsMeter';

interface Props {
  label: string;
  // Corner placement. Defaults to bottom-left to sit clear of the HUD
  // (which owns top-right).
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const CORNER_STYLES: Record<NonNullable<Props['corner']>, React.CSSProperties> = {
  'top-left':     { top: 8, left: 8 },
  'top-right':    { top: 8, right: 8 },
  'bottom-left':  { bottom: 8, left: 8 },
  'bottom-right': { bottom: 8, right: 8 }
};

const BASE_STYLE: React.CSSProperties = {
  position: 'fixed',
  padding: '4px 8px',
  background: 'rgba(20, 14, 10, 0.82)',
  color: '#f5f0e0',
  border: '1px solid #7a6a4a',
  borderRadius: 3,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  pointerEvents: 'none',
  zIndex: 50
};

export function FpsOverlay({ label, corner = 'bottom-left' }: Props) {
  if (!import.meta.env.DEV) return null;
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFps(fpsMeter.fps), 250);
    return () => window.clearInterval(id);
  }, []);
  const style: React.CSSProperties = { ...BASE_STYLE, ...CORNER_STYLES[corner] };
  return <div style={style}>{`fps=${fps.toString().padStart(3, ' ')} (${label})`}</div>;
}
