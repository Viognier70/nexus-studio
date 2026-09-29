// ORDER 271 — Designs system (paket 1, skärm 00-SYS) som komponenter.
// Alla skärmar i paket 1 och 6 byggs av de här delarna och klasserna i
// system.css. Byggs en gång (INSTRUKTION §2).

import type { ReactNode } from 'react';
import './system.css';

// ORDER 285 — den varma formen (src/ui/theme/nexusTheme.warm.ts): trä och grädde.
export const NX = {
  ground: '#2e2016',
  ink: '#f4e6cc',
  ink2: '#cdb898',
  rule: 'rgba(215,162,76,.25)',
  accent: '#e8b93a',
  accent700: '#d7a24c'
} as const;

// Designens pixlar (1920 × 1080) i skärmens mått.
export const u = (px: number): string => `calc(${px} * var(--nx-u))`;

type ButtonKind = 'primary' | 'secondary' | 'quiet';

export function NxButton(props: {
  kind?: ButtonKind;
  children: ReactNode;
  onClick?: () => void;
  arrow?: boolean;
  disabled?: boolean;
  testId?: string;
  autoFocus?: boolean;
}) {
  const kind = props.kind ?? 'primary';
  return (
    <button
      type="button"
      className={`nx-btn nx-btn-${kind}`}
      onClick={props.onClick}
      disabled={props.disabled}
      data-testid={props.testId}
      autoFocus={props.autoFocus}
    >
      <span>{props.children}</span>
      {props.arrow !== false && kind !== 'quiet' && <span aria-hidden>→</span>}
    </button>
  );
}

export function NxLabel(props: { children: ReactNode; muted?: boolean; testId?: string }) {
  return <div className={`nx-label${props.muted ? ' nx-muted' : ''}`} data-testid={props.testId}>{props.children}</div>;
}

// Tio steg utan tal: riktning, inte belopp.
export function NxSteps(props: { value: number; of?: number; accent?: number; lost?: number; label?: string; testId?: string }) {
  const n = props.of ?? 10;
  const on = Math.max(0, Math.min(n, Math.round(props.value)));
  return (
    <div className="nx-steps" role="img" aria-label={props.label} data-testid={props.testId} data-value={on}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="nx-step"
          data-on={i < on}
          data-accent={props.accent !== undefined && i < on && i >= on - props.accent}
          data-lost={props.lost !== undefined && i >= on && i < on + props.lost}
        />
      ))}
    </div>
  );
}

// En skärm som täcker spelvyn (schema, bankmötet, tidningen, medaljerna …).
export function NxScreen(props: { children: ReactNode; testId?: string; label?: string; className?: string }) {
  return (
    <div className={`nx nx-screen ${props.className ?? ''}`} data-testid={props.testId} role="dialog" aria-label={props.label}>
      {props.children}
    </div>
  );
}
