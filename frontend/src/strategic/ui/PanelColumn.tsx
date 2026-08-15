// ORDER 090 §6 — shared layout primitive for stacked overlay panels.
//
// Before this file existed, every overlay panel positioned itself
// with hardcoded pixels: TeamPanel picked top:72, InvestmentPanel
// picked top:500 (on the assumption that TeamPanel stayed ≤ 428 px),
// ScaleDownPanel echoed top:500, MorningActivityPanel picked top:72
// on the right, RoomCardPanel picked top:680 on the right, and so
// on. When any panel's content grew past the neighbour's picked
// offset it just drew over the neighbour — the M1 Defect B failure
// mode generalised to the whole left+right column.
//
// This primitive owns the corner-anchor and vertical flow so each
// child panel drops its own `position: absolute` + hardcoded `top`
// and simply renders its box. The column stacks children with a
// measured gap; anchor + max-height keep the whole stack pinned
// inside the viewport at 1280×720 up to 2560×1440.
//
// Contract:
// - `side='left'` anchors at `top: topPx, left: gutterPx`
// - `side='right'` anchors at `top: topPx, right: gutterPx`
// - `align-items` matches the anchor side (flex-start / flex-end)
//   so panels of different widths all hug the same edge
// - Column is `pointer-events: none`; each child panel opts in with
//   its own `pointer-events: auto` so canvas clicks still reach R3F
// - Column `overflow-y: auto` clips only if the summed panel heights
//   exceed the viewport — panels are never pushed off-canvas

import type { CSSProperties, ReactNode } from 'react';

export interface PanelColumnProps {
  side: 'left' | 'right';
  /** Distance from top edge in px. Default 72 — clears PlayerPanel/TopRightMenu. */
  topPx?: number;
  /** Distance from the anchor edge in px. Default 16 for left, 20 for right. */
  gutterPx?: number;
  /** Reserve at the bottom so the last panel doesn't touch the viewport edge. Default 20. */
  bottomGapPx?: number;
  /** Vertical gap between children. Default 12. */
  gapPx?: number;
  children: ReactNode;
}

export function PanelColumn({
  side,
  topPx = 72,
  gutterPx,
  bottomGapPx = 20,
  gapPx = 12,
  children
}: PanelColumnProps) {
  const gutter = gutterPx ?? (side === 'left' ? 16 : 20);
  const style: CSSProperties = {
    position: 'absolute',
    top: topPx,
    [side]: gutter,
    maxHeight: `calc(100vh - ${topPx + bottomGapPx}px)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: side === 'left' ? 'flex-start' : 'flex-end',
    gap: gapPx,
    overflowY: 'auto',
    pointerEvents: 'none'
  };
  return <div style={style} data-panel-column={side}>{children}</div>;
}

// Row wrapper used inside a PanelColumn when two panels should sit
// side-by-side and shift together (e.g. InvestmentPanel + ScaleDownPanel
// keep the "grow-forward / retreat" pairing intact even when TeamPanel
// grows above them). Right-anchored columns rarely need this — pass
// `align='end'` if you want the row to hug the right edge.
export interface PanelRowProps {
  align?: 'start' | 'end';
  gapPx?: number;
  children: ReactNode;
}

export function PanelRow({ align = 'start', gapPx = 12, children }: PanelRowProps) {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
    gap: gapPx,
    pointerEvents: 'none'
  };
  return <div style={style}>{children}</div>;
}
