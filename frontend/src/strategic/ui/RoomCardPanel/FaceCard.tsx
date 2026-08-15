// ORDER 086 §6 step 3 — FaceCard component.
//
// One card = one row in the panel. Consumes a plain data shape so the
// caller doesn't branch on staff-vs-guest; both card types render
// through the same component.
//
// Colour comes from the CSS custom property --card-tone set by the
// caller — face + icon inherit via currentColor. Rhythm ring is a
// data attribute so DOM tests can assert colour without probing paint.

import type { CSSProperties } from 'react';
import type { FaceKey } from './deriveFaces';
import type { StaffIconKey, GuestIconKey } from './deriveActions';
import { Face, Icon } from './icons';

export type CardTone = 'green' | 'amber' | 'red' | 'neutral';

export interface FaceCardModel {
  key: string;                       // stable per-entity id (staff.id or guest.id)
  face: FaceKey;
  headerText: string;                // "Chef", "Seat 3", ...
  actionText: string;
  iconKey: StaffIconKey | GuestIconKey;
  tone: CardTone;                    // drives the rhythm ring
  sideBarValue?: number;             // [0, 1], optional
  sideBarLabel?: string;
}

const TONE_COLOUR: Record<CardTone, string> = {
  green: '#7fbf7f',
  amber: '#d8b664',
  red: '#c96a5a',
  neutral: 'rgba(216, 190, 130, 0.55)'
};

const CARD_STYLE: CSSProperties = {
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: 10,
  padding: '8px 10px',
  background: 'rgba(20, 14, 10, 0.62)',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 3,
  color: '#f0e8d4',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  lineHeight: 1.3,
  overflow: 'hidden'
};

const RING_STYLE = (tone: CardTone): CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 3,
  background: TONE_COLOUR[tone],
  transition: 'background 0.35s ease-out'
});

const FACE_WRAP: CSSProperties = {
  color: '#e8dcc0',
  paddingTop: 2
};

const HEADER_STYLE: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.62,
  marginBottom: 2
};

const ACTION_STYLE: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: 0.2,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: '#f0e8d4'
};

const BAR_TRACK: CSSProperties = {
  marginTop: 6,
  height: 3,
  background: 'rgba(168, 146, 106, 0.18)',
  borderRadius: 2,
  overflow: 'hidden'
};

const BAR_FILL = (value: number): CSSProperties => ({
  height: '100%',
  width: `${Math.max(0, Math.min(1, value)) * 100}%`,
  background: 'rgba(216, 190, 130, 0.75)',
  transition: 'width 0.35s ease-out'
});

export function FaceCard({ model }: { model: FaceCardModel }) {
  return (
    <div
      style={CARD_STYLE}
      data-testid={`card-${model.key}`}
      data-card-key={model.key}
    >
      <div
        style={RING_STYLE(model.tone)}
        data-testid={`ring-${model.key}`}
        data-tone={model.tone}
      />
      <div style={FACE_WRAP}>
        <Face kind={model.face} size={44} />
      </div>
      <div>
        <div style={HEADER_STYLE}>{model.headerText}</div>
        <div style={ACTION_STYLE}>
          <span style={{ color: '#d8be82' }}><Icon kind={model.iconKey} /></span>
          <span>{model.actionText}</span>
        </div>
        {model.sideBarValue !== undefined && (
          <div>
            {model.sideBarLabel !== undefined && (
              <div style={{ ...HEADER_STYLE, marginTop: 6 }}>{model.sideBarLabel}</div>
            )}
            <div style={BAR_TRACK}>
              <div style={BAR_FILL(model.sideBarValue)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
