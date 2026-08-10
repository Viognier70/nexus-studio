// ORDER 049 §5.2 + ORDER 050 §7 step 3 — the player panel.
//
// Vision Owner gate 10 (2026-08-09): "Pillret i övre högra hörnet
// som fälls ut. En ständigt synlig panel konkurrerar med rummet, och
// EDD §11 förbjuder dominerande HUD."
//
// ORDER 050 Addendum A §6.4 (2026-08-10): "Cash always visible;
// everything else on request." The pill now shows CASH in kSEK
// (the business's pulse). Clicking it expands the panel — which
// now also carries the ORDER 050 §7 step 3 ledger as its bottom
// section (the "business account" the player opens to see where
// the money went).
//
// Collapsed when idle, expanded on click, click-outside collapses.
// No dominant HUD; the pill itself is one line of monospace.

import { useEffect, useRef, useState } from 'react';
import { useSimState } from '../simulation/SimulationProvider';
import { computeValuation, revenueReading, TIER_DATA } from '../simulation/valuation';
import {
  qualityBand,
  targetQualityDrink,
  targetQualityFood,
  targetQualityService
} from '../simulation/quality';
import type { LedgerCategory, LedgerLine } from '../types';

// ORDER 050 §7 step 3 (2026-08-10) — the number of ledger rows shown
// in the panel's transactions section. The underlying ring buffer
// holds 1000; the visible slice is a scrollable recap.
const LEDGER_VISIBLE_ROWS = 12;

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

// Same word-band pattern as the four instruments panel.
function reputationBand(v: number): string {
  if (v >= 0.85) return 'Utmärkt';
  if (v >= 0.65) return 'God';
  if (v >= 0.45) return 'Godtagbar';
  if (v >= 0.25) return 'Bristfällig';
  return 'Under acceptabel';
}

function formatKSEK(v: number): string {
  const rounded = Math.round(v);
  // Thin space between thousand groups — Swedish typography.
  return rounded.toLocaleString('sv-SE').replace(/ /g, ' ') + ' kSEK';
}

// -------- styles --------------------------------------------------------

const PILL_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  background: 'rgba(20, 14, 10, 0.62)',
  border: '1px solid rgba(168, 146, 106, 0.55)',
  borderRadius: 3,
  color: '#f0e8d4',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
  letterSpacing: 0.3,
  cursor: 'pointer',
  height: 26,
  boxSizing: 'border-box'
};

const PILL_LABEL_STYLE: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72
};

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 44,
  right: 16,
  width: 320,
  padding: '14px 16px 16px',
  background: 'rgba(30, 22, 16, 0.92)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
  pointerEvents: 'auto',
  zIndex: 45
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.62,
  marginBottom: 2
};

const VALUE_STYLE: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  letterSpacing: 0.5,
  marginBottom: 12,
  color: '#f7ecd0'
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 12,
  marginBottom: 4
};

const READING_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  padding: '4px 0'
};

const BAR_TRACK_STYLE: React.CSSProperties = {
  position: 'relative',
  width: 90,
  height: 3,
  background: 'rgba(168, 146, 106, 0.22)',
  borderRadius: 2,
  overflow: 'visible'
};

const barFill = (fraction: number): React.CSSProperties => ({
  width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
  height: '100%',
  background: 'rgba(216, 190, 130, 0.75)',
  transition: 'width 0.35s ease-out',
  borderRadius: 2
});

// A ceiling tick: a short vertical stroke sitting above the bar at
// the ceiling position, so the eye reads "here is what the house
// could be." Two pixels wide, four pixels tall, offset upward so it
// doesn't crowd the fill.
const ceilingTick = (fraction: number): React.CSSProperties => ({
  position: 'absolute',
  left: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
  top: -3,
  width: 2,
  height: 9,
  marginLeft: -1,
  background: 'rgba(216, 190, 130, 0.85)',
  transition: 'left 0.35s ease-out',
  pointerEvents: 'none'
});

const SPLIT_STYLE: React.CSSProperties = {
  display: 'flex',
  height: 4,
  width: '100%',
  borderRadius: 2,
  overflow: 'hidden',
  marginTop: 4,
  background: 'rgba(168, 146, 106, 0.22)'
};

const SELL_BUTTON_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 14,
  padding: '9px 12px',
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.4,
  cursor: 'pointer'
};

const SELL_NOTE_STYLE: React.CSSProperties = {
  fontSize: 10,
  opacity: 0.55,
  marginTop: 6,
  fontStyle: 'italic',
  textAlign: 'center'
};

const SECTION_DIVIDER: React.CSSProperties = {
  borderTop: '1px solid rgba(168, 146, 106, 0.35)',
  margin: '10px 0 8px'
};

// -------- component ----------------------------------------------------

export function PlayerPanel() {
  const sim = useSimState();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside collapse.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  // Cycle-1 grandfather: assume T2 until §5.1 bank meeting stamps a
  // real tier on the venture. Once §5.1 lands, pass the venture's
  // tier through from state (add state.ventureTier: LoanTier | null).
  const tier = 'T2';
  const val = computeValuation(sim, tier);
  const rev = revenueReading(sim);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        style={PILL_STYLE}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Cash on hand"
        title={`Click to open the business account — cash on hand ${formatKSEK(sim.cash / 1000)}`}
      >
        <span style={PILL_LABEL_STYLE}>Cash</span>
        <span>{formatKSEK(sim.cash / 1000)}</span>
        <span aria-hidden style={{ opacity: 0.65 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={PANEL_STYLE} role="region" aria-label="Business account">
          <div style={HEADING_STYLE}>Cash on hand</div>
          <div style={VALUE_STYLE}>{formatKSEK(sim.cash / 1000)}</div>

          <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10 }}>
            {TIER_DATA[tier].label} · valuation {formatKSEK(val.value)}
          </div>

          <div style={ROW_STYLE}>
            <span style={{ opacity: 0.72 }}>Materiellt</span>
            <span>{formatKSEK(val.tangible)}</span>
          </div>
          <div style={ROW_STYLE}>
            <span style={{ opacity: 0.72 }}>Goodwill</span>
            <span>{formatKSEK(val.goodwill)}</span>
          </div>
          <div style={ROW_STYLE}>
            <span style={{ opacity: 0.72 }}>Skuld</span>
            <span>−{formatKSEK(val.debt)}</span>
          </div>

          <div style={SECTION_DIVIDER} />

          <div style={HEADING_STYLE}>Driftskapital</div>

          <Reading label="Rykte"            band={reputationBand(sim.reputation)} fraction={sim.reputation} ceiling={sim.reputationCeiling} />
          <Reading label="Mat-kvalitet"     band={qualityBand(sim.qualityFood)}    fraction={sim.qualityFood}    ceiling={targetQualityFood(sim)} />
          <Reading label="Dryck-kvalitet"   band={qualityBand(sim.qualityDrink)}   fraction={sim.qualityDrink}   ceiling={targetQualityDrink(sim)} />
          <Reading label="Service-kvalitet" band={qualityBand(sim.qualityService)} fraction={sim.qualityService} ceiling={targetQualityService(sim)} />

          <div style={SECTION_DIVIDER} />

          <div style={HEADING_STYLE}>Omsättning</div>
          <div style={ROW_STYLE}>
            <span style={{ opacity: 0.72 }}>Per stol · dag</span>
            <span>{rev.perSeatPerDay > 0 ? `${rev.perSeatPerDay.toFixed(2)} kSEK` : '—'}</span>
          </div>
          <div style={{ ...ROW_STYLE, marginBottom: 2 }}>
            <span style={{ opacity: 0.72 }}>Lunch / Kväll</span>
            <span style={{ fontSize: 11, opacity: 0.75 }}>
              {rev.lunchShare > 0 || rev.dinnerShare > 0
                ? `${Math.round(rev.lunchShare * 100)} % / ${Math.round(rev.dinnerShare * 100)} %`
                : '—'}
            </span>
          </div>
          {(rev.lunchShare > 0 || rev.dinnerShare > 0) && (
            <div style={SPLIT_STYLE} aria-label={`Lunch ${Math.round(rev.lunchShare * 100)} procent, middag ${Math.round(rev.dinnerShare * 100)} procent`}>
              <div style={{ width: `${rev.lunchShare * 100}%`, background: 'rgba(216, 190, 130, 0.55)' }} />
              <div style={{ width: `${rev.dinnerShare * 100}%`, background: 'rgba(216, 190, 130, 0.85)' }} />
            </div>
          )}

          <div style={SECTION_DIVIDER} />

          <div style={HEADING_STYLE}>Transactions</div>
          <LedgerSection lines={sim.ledger} />

          <button type="button" style={SELL_BUTTON_STYLE} onClick={() => setOpen(false)}>
            Sälj verksamheten
          </button>
          <div style={SELL_NOTE_STYLE}>
            Försäljningsflödet kopplas in när bankmötet (§5.1) landar.
          </div>
        </div>
      )}
    </div>
  );
}

// -------- ledger section ------------------------------------------------

const LEDGER_LIST_STYLE: React.CSSProperties = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  lineHeight: 1.5,
  maxHeight: 200,
  overflowY: 'auto',
  paddingRight: 4,
  marginTop: 4
};

const LEDGER_ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '32px 1fr 68px',
  gap: 6,
  alignItems: 'baseline',
  padding: '2px 0',
  borderBottom: '1px dashed rgba(168, 146, 106, 0.14)'
};

const LEDGER_EMPTY_STYLE: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.55,
  fontStyle: 'italic',
  padding: '6px 0'
};

function formatLedgerAmount(sek: number): string {
  const abs = Math.abs(sek);
  // Under 10 000 SEK: SEK; above: kSEK. Keeps small entries readable.
  if (abs < 10_000) {
    return `${sek >= 0 ? '+' : '−'}${Math.round(abs).toLocaleString('en-GB')}`;
  }
  return `${sek >= 0 ? '+' : '−'}${(abs / 1000).toFixed(1)}k`;
}

interface LedgerSectionProps {
  lines: readonly LedgerLine[];
}

function LedgerSection({ lines }: LedgerSectionProps) {
  if (lines.length === 0) {
    return <div style={LEDGER_EMPTY_STYLE}>No transactions yet.</div>;
  }
  // Most recent first, up to LEDGER_VISIBLE_ROWS. Ring buffer already
  // caps upstream at LEDGER_MAX_LINES; here we render the tail.
  const visible = lines.slice(-LEDGER_VISIBLE_ROWS).reverse();
  return (
    <div style={LEDGER_LIST_STYLE} role="log" aria-label="Recent transactions">
      {visible.map((line, i) => (
        <div
          key={`${line.at}-${line.category}-${i}`}
          style={LEDGER_ROW_STYLE}
          aria-label={`${line.cause}: ${formatLedgerAmount(line.amount)} SEK, running cash ${Math.round(line.runningCash).toLocaleString('en-GB')} SEK on day ${line.day}`}
        >
          <span style={{ opacity: 0.55, fontSize: 9, letterSpacing: 0.5 }}>
            {LEDGER_CATEGORY_LABEL[line.category]}
          </span>
          <span style={{ opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
        </div>
      ))}
    </div>
  );
}

interface ReadingProps {
  label: string;
  band: string;
  fraction: number;
  // ORDER 049 §2.1: the ceiling knowledge sets. Rendered as a small
  // tick above the bar so the eye reads value vs. possible without
  // extra text. Aria-label carries both numbers for screen readers.
  ceiling?: number;
}

function Reading({ label, band, fraction, ceiling }: ReadingProps) {
  const ariaLabel = ceiling !== undefined
    ? `${label}: ${band}. Möjligt tak vid ${Math.round(ceiling * 100)} procent, aktuellt ${Math.round(fraction * 100)} procent.`
    : `${label}: ${band}.`;
  return (
    <div style={READING_STYLE} aria-label={ariaLabel}>
      <span style={{ opacity: 0.72, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, opacity: 0.85 }}>{band}</span>
      <div style={BAR_TRACK_STYLE}>
        <div style={barFill(fraction)} />
        {ceiling !== undefined && ceiling > fraction && (
          <div style={ceilingTick(ceiling)} aria-hidden />
        )}
      </div>
    </div>
  );
}
