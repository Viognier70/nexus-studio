// ORDER 046 §3 + ORDER 050 §7 step 6 — the evening's account, in the
// observer's voice, with the day's ledger below.
//
// Renders state.eveningAccount as a centred paragraph over the room,
// visible from the moment the service closes (natural or collapse)
// until the day advances to the next morning. Fade-in over ~2 s,
// hold for ~23 s, fade-out over ~5 s — the last fraction of the
// evening pause bleeds into morning silence.
//
// ORDER 050 §7 step 6 (2026-08-10): the ledger moved here from
// PlayerPanel per Addendum A §6.3 ("evening tells you what
// happened"). The observer's paragraph is the same event told in
// prose; the ledger below is the same event told in kronor. Filtered
// to the day whose evening this is so the panel reads as one book
// spread rather than a rolling log.
//
// ORDER 047 §7 — the fade envelope uses **wall-clock time**, not
// sim time. Sim speed defaults to 2× and can be toggled to 4×;
// tying the fade to simTime would shrink the reading window as
// the player speeds up, which is exactly backwards ("faster clock,
// not shorter service"). The panel's arrival is triggered by
// state.eveningAccount becoming non-null; from that moment forward
// the countdown is real seconds.
//
// Layout: centre viewport, ~640 px wide, warm-beige paper against a
// dark overlay. Non-modal — the sim continues to tick (village
// residents, delivery cycle, day advance) behind it. No dismiss
// button; the panel goes with the transition.

import { useEffect, useRef, useState } from 'react';
import { useSimState } from '../simulation/SimulationProvider';
import type { LedgerCategory, LedgerLine } from '../types';

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

const LEDGER_SECTION_STYLE: React.CSSProperties = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: '1px solid rgba(168, 146, 106, 0.35)',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
  lineHeight: 1.55
};

const LEDGER_SUBHEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  opacity: 0.55,
  marginBottom: 8,
  fontFamily: 'system-ui, sans-serif'
};

const LEDGER_ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '38px 1fr 90px 90px',
  gap: 8,
  alignItems: 'baseline',
  padding: '2px 0',
  borderBottom: '1px dashed rgba(168, 146, 106, 0.14)'
};

const LEDGER_EMPTY_STYLE: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.55,
  fontStyle: 'italic',
  padding: '4px 0'
};

const LEDGER_CATEGORY_LABEL: Record<LedgerCategory, string> = {
  revenue:    'Rev.',
  wage:       'Wage',
  agency:     'Agcy',
  ingredient: 'Ingr.',
  interest:   'Int.',
  scenario:   'Scen.',
  buyout:     'Buy.',
  other:      '—'
};

function formatLedgerAmount(sek: number): string {
  const abs = Math.abs(sek);
  if (abs < 10_000) {
    return `${sek >= 0 ? '+' : '−'}${Math.round(abs).toLocaleString('en-GB')}`;
  }
  return `${sek >= 0 ? '+' : '−'}${(abs / 1000).toFixed(1)}k`;
}

function formatRunningCash(sek: number): string {
  const abs = Math.abs(sek);
  if (abs < 10_000) {
    return `${Math.round(sek).toLocaleString('en-GB')}`;
  }
  return `${(sek / 1000).toFixed(1)}k`;
}

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

  // Latch the wall-clock start when the account arrives; clear on
  // disappearance. Using wall-clock (performance.now) rather than
  // sim time so the fade takes real seconds regardless of speed.
  const startAtRef = useRef<number | null>(null);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!account) {
      startAtRef.current = null;
      setOpacity(0);
      return;
    }
    startAtRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      if (startAtRef.current === null) return;
      const elapsedMs = performance.now() - startAtRef.current;
      const o = envelope(elapsedMs / 1000);
      setOpacity(o);
      if (o > 0) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [account]);

  if (!account || opacity <= 0) return null;

  // ORDER 050 §7 step 6 (2026-08-10) — filter the ledger to the
  // current day (the day whose evening this is). The evening account
  // is a snapshot of one day's shape; the book below is the same
  // day counted in kronor.
  const todaysLedger = sim.ledger.filter((l) => l.day === sim.day.dayNumber);

  return (
    <div style={{ ...PANEL_WRAPPER_STYLE, opacity }}>
      <div style={PANEL_STYLE}>
        <div style={HEADING_STYLE}>Kvällens redovisning</div>
        <div>{account.paragraph}</div>

        <div style={LEDGER_SECTION_STYLE}>
          <div style={LEDGER_SUBHEADING_STYLE}>Räkenskaperna för dagen</div>
          <TodaysLedger lines={todaysLedger} />
        </div>
      </div>
    </div>
  );
}

interface TodaysLedgerProps {
  lines: readonly LedgerLine[];
}

function TodaysLedger({ lines }: TodaysLedgerProps) {
  if (lines.length === 0) {
    return <div style={LEDGER_EMPTY_STYLE}>Inga rörelser att bokföra idag.</div>;
  }
  return (
    <div role="log" aria-label="Dagens rörelser">
      {lines.map((line, i) => (
        <div
          key={`${line.at}-${line.category}-${i}`}
          style={LEDGER_ROW_STYLE}
          aria-label={`${line.cause}: ${formatLedgerAmount(line.amount)} SEK, running cash ${formatRunningCash(line.runningCash)} SEK`}
        >
          <span style={{ opacity: 0.55, fontSize: 10, letterSpacing: 0.5 }}>
            {LEDGER_CATEGORY_LABEL[line.category]}
          </span>
          <span
            style={{
              opacity: 0.85,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {line.cause}
          </span>
          <span
            style={{
              textAlign: 'right',
              color: line.amount >= 0 ? '#d8be82' : '#e8b498'
            }}
          >
            {formatLedgerAmount(line.amount)}
          </span>
          <span
            style={{
              textAlign: 'right',
              opacity: 0.5,
              fontSize: 11
            }}
            aria-hidden
          >
            {formatRunningCash(line.runningCash)}
          </span>
        </div>
      ))}
    </div>
  );
}
