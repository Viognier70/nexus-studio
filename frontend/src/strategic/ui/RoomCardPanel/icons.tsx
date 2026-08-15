// ORDER 086 §6 step 2 — icon kit.
//
// One inline SVG per iconKey from deriveActions.ts. Uniform 24×24
// viewBox, single-colour glyphs so the card layer can style them via
// currentColor. Kept minimal and readable at panel scale (~20 px on
// the card). The kit is intentionally boxy — glyphs, not illustrations.
// The card panel is a data surface; icons cue category, they do not
// carry mood (that's the face's job).

import type { StaffIconKey, GuestIconKey } from './deriveActions';
import type { FaceKey } from './deriveFaces';
import type { CSSProperties, ReactNode } from 'react';

type AnyIconKey = StaffIconKey | GuestIconKey;

const svgBase: CSSProperties = {
  width: 20,
  height: 20,
  display: 'inline-block',
  verticalAlign: 'middle',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

function Svg({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={svgBase}
      data-testid={testId}
      role="img"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// -------- glyph library -------------------------------------------------
//
// Every iconKey maps here. If a new iconKey is added to StaffIconKey or
// GuestIconKey, TypeScript's Record<K, V> exhaustiveness catches the
// gap at compile time.

const STAFF_ICONS: Record<StaffIconKey, ReactNode> = {
  plan: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M8 9 h8 M8 13 h6 M8 17 h4" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </>
  ),
  chase: (
    <>
      <circle cx="9" cy="8" r="2.5" />
      <path d="M9 10.5 v5 M6 13 l3 -2.5 3 2.5 M7 20 l2 -4.5 M11 20 l-1.5 -4.5" />
      <path d="M15 6 h4 M15 9 h4 M15 12 h3" />
    </>
  ),
  prep: (
    <>
      <path d="M4 18 h16 M6 18 v-3 h12 v3" />
      <path d="M9 15 v-4 M12 15 v-6 M15 15 v-5" />
    </>
  ),
  'hail-response': (
    <>
      <circle cx="9" cy="8" r="2.5" />
      <path d="M9 10.5 v6 M6 14 l3 -3 M12 20 l-3 -6.5" />
      <path d="M16 4 v6 M14 6 l2 -2 2 2" />
    </>
  ),
  seat: (
    <>
      <path d="M6 20 v-8 h4 v-6 h4 v14" />
      <path d="M4 20 h16" />
    </>
  ),
  order: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="1" />
      <path d="M9 8 h6 M9 12 h6 M9 16 h4" />
    </>
  ),
  drink: (
    <>
      <path d="M8 4 h8 l-1 14 h-6 z" />
      <path d="M8 8 h8" />
    </>
  ),
  serve: (
    <>
      <ellipse cx="12" cy="14" rx="8" ry="2" />
      <path d="M4 14 c0 3 4 4 8 4 s8 -1 8 -4" />
      <circle cx="12" cy="11" r="1" />
    </>
  ),
  decant: (
    <>
      <path d="M9 5 h6 v3 l3 6 c0 3 -2 5 -6 5 s-6 -2 -6 -5 l3 -6 z" />
      <path d="M10 10 h4" />
    </>
  ),
  flambe: (
    <>
      <path d="M12 4 c-2 3 -4 4 -4 8 a4 4 0 0 0 8 0 c0 -4 -2 -5 -4 -8 z" />
      <path d="M10 12 c1 1 3 1 4 0" />
    </>
  ),
  clear: (
    <>
      <ellipse cx="12" cy="10" rx="8" ry="2" />
      <path d="M4 10 v6 c0 2 4 3 8 3 s8 -1 8 -3 v-6" />
      <path d="M9 20 l-1 2 M15 20 l1 2" />
    </>
  ),
  'standby-strain': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 6 v6 l4 3" />
      <path d="M2 2 l4 4 M22 2 l-4 4" />
    </>
  ),
  standby: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8 v4 l3 2" />
    </>
  ),
  close: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="1" />
      <path d="M4 8 l8 -5 8 5" />
      <path d="M10 14 h4" />
    </>
  )
};

const GUEST_ICONS: Record<GuestIconKey, ReactNode> = {
  'walk-away': (
    <>
      <circle cx="9" cy="7" r="2" />
      <path d="M9 9 v5 M6 11 l3 -1 M12 20 l-3 -6" />
      <path d="M15 12 l6 -6 M17 6 h4 v4" />
    </>
  ),
  arriving: (
    <>
      <rect x="10" y="4" width="10" height="16" />
      <path d="M14 4 v16" />
      <circle cx="6" cy="10" r="2" />
      <path d="M6 12 v4 M4 15 l2 -2 M8 20 l-2 -4" />
    </>
  ),
  waiting: (
    <>
      <circle cx="12" cy="8" r="2.5" />
      <path d="M12 10.5 v6 M9 14 l3 -3 3 3 M10 20 l2 -4 2 4" />
    </>
  ),
  'waiting-impatient': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8 v4 l3 2" />
      <path d="M6 20 l1 2 M18 20 l-1 2" />
    </>
  ),
  hail: (
    <>
      <circle cx="10" cy="8" r="2.5" />
      <path d="M10 10.5 v6 M7 14 l3 -3 M13 20 l-3 -6.5" />
      <path d="M17 4 v6 M14 6 l3 -2 3 2" />
    </>
  ),
  seated: (
    <>
      <circle cx="12" cy="7" r="2" />
      <path d="M12 9 v5 M9 14 h6 M10 20 v-6 M14 20 v-6" />
      <path d="M8 20 h8" />
    </>
  ),
  drink: STAFF_ICONS.drink,
  'read-menu': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M8 8 h8 M8 12 h8 M8 16 h5" />
    </>
  ),
  'ready-to-order': (
    <>
      <circle cx="12" cy="8" r="2.5" />
      <path d="M12 10.5 v4" />
      <path d="M8 16 l4 -2 4 2 M8 20 l4 -4 4 4" />
    </>
  ),
  'eat-good': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 14 c1 1 5 1 6 0" />
      <path d="M8 10 h2 M14 10 h2" />
    </>
  ),
  'eat-neutral': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 15 h6" />
      <path d="M8 10 h2 M14 10 h2" />
    </>
  ),
  'pay-good': (
    <>
      <circle cx="10" cy="12" r="4" />
      <path d="M10 10 v4 M8 11 h4 M8 13 h4" />
      <path d="M17 20 l3 -3 -3 -3" />
    </>
  ),
  'pay-neutral': (
    <>
      <circle cx="10" cy="12" r="4" />
      <path d="M10 10 v4 M8 11 h4 M8 13 h4" />
    </>
  ),
  exit: (
    <>
      <rect x="4" y="4" width="10" height="16" />
      <path d="M14 12 h7 M18 9 l3 3 -3 3" />
    </>
  ),
  declined: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 8 l8 8 M16 8 l-8 8" />
    </>
  )
};

export function Icon({ kind }: { kind: AnyIconKey }) {
  const glyph = (STAFF_ICONS as Record<string, ReactNode>)[kind]
    ?? (GUEST_ICONS as Record<string, ReactNode>)[kind]
    ?? null;
  return <Svg testId={`icon-${kind}`}>{glyph}</Svg>;
}

// -------- face SVGs -----------------------------------------------------
//
// Ten expressions, one glyph each. Author intent: at 96×96 (staff card
// portrait), the eye + mouth carry the read. Palette is left to the
// FaceCard component (uses currentColor for stroke) — no colour is
// hard-coded here so role/guest palettes can layer later without a
// re-author (per ORDER 085 §2.1 asset budget note).

const FACES: Record<FaceKey, ReactNode> = {
  neutral: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" />
      <path d="M9 16 h6" />
    </>
  ),
  focused: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10 h2 M14 10 h2" />
      <path d="M10 16 h4" />
    </>
  ),
  smiling: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" />
      <path d="M8 14 c1 3 7 3 8 0" />
    </>
  ),
  attentive: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 9 l3 2 -3 1 M17 9 l-3 2 3 1" />
      <path d="M10 16 h4" />
    </>
  ),
  tense: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 9 l3 1 M17 9 l-3 1" />
      <path d="M9 16 h6" />
    </>
  ),
  strained: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 10 l3 0 M14 10 l3 0" />
      <path d="M8 17 c1 -2 7 -2 8 0" />
    </>
  ),
  hurried: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" />
      <path d="M8 15 l1 1 M10 16 l1 -1 M12 16 l1 1 M14 15 l1 1" />
    </>
  ),
  exhausted: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 11 l3 -1 M14 10 l3 1" />
      <path d="M9 17 c1 -1 5 -1 6 0" />
    </>
  ),
  proud: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10 l2 -1 M14 9 l2 1" />
      <path d="M8 14 c1 3 7 3 8 0" />
      <path d="M11 6 l1 -2 1 2" />
    </>
  ),
  irritated: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 8 l3 2 M17 8 l-3 2" />
      <path d="M9 17 c1 -1 5 -1 6 0" />
    </>
  )
};

export function Face({ kind, size = 48 }: { kind: FaceKey; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{
        width: size,
        height: size,
        display: 'block',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }}
      data-testid={`face-${kind}`}
      role="img"
      aria-hidden="true"
    >
      {FACES[kind]}
    </svg>
  );
}
