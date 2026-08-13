// ORDER 075 (M2) — morning activity picker panel.
//
// Renders one card per activity in ACTIVITY_CATALOGUE. Each card
// shows the three-column effect (economic / social / ecological)
// as three labelled numeric fields — the numbers ARE the teaching
// per ORDER 050 §4, no card labels itself as "serving" any one
// sustainability. Click to pick/unpick; cap enforced by reducer.
// Visible only during morning; hidden during service and later
// periods.

import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import {
  ACTIVITY_CATALOGUE,
  MAX_ACTIVITIES_PER_DAY,
  WEEKLY_GATE_DAYS
} from '../simulation/activities';
import type { Activity } from '../simulation/activities';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 72,
  right: 20,
  width: 340,
  padding: '10px 14px',
  background: 'rgba(20, 14, 10, 0.62)',
  color: '#f0e8d4',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 3,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  zIndex: 33,
  pointerEvents: 'auto'
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.62,
  marginBottom: 8
};

const SUB_STYLE: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.55,
  marginBottom: 10
};

const CARD_STYLE = (picked: boolean, disabled: boolean): React.CSSProperties => ({
  padding: '8px 10px',
  marginBottom: 6,
  background: picked ? 'rgba(216, 190, 130, 0.18)' : 'rgba(30, 20, 15, 0.55)',
  border: `1px solid ${picked ? 'rgba(216, 190, 130, 0.55)' : 'rgba(168, 146, 106, 0.28)'}`,
  borderRadius: 3,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.45 : 1
});

const CARD_NAME_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 2
};

const CARD_DESC_STYLE: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.75,
  marginBottom: 6,
  lineHeight: 1.35
};

const EFFECT_ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 6,
  fontSize: 11,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'
};

const EFFECT_CELL_STYLE = (v: number): React.CSSProperties => ({
  padding: '2px 4px',
  background: 'rgba(0,0,0,0.25)',
  borderRadius: 2,
  color: v > 0 ? '#c6dfa8' : v < 0 ? '#e8b498' : 'rgba(240, 232, 212, 0.55)'
});

function formatSek(v: number): string {
  if (v === 0) return '0';
  const sign = v >= 0 ? '+' : '−';
  const abs = Math.abs(v);
  if (abs < 1000) return `${sign}${abs}`;
  return `${sign}${(abs / 1000).toFixed(1)}k`;
}

function formatCapital(v: number): string {
  if (v === 0) return '0';
  const sign = v >= 0 ? '+' : '−';
  return `${sign}${Math.abs(v).toFixed(2)}`;
}

export function MorningActivityPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  if (sim.day.period !== 'morning') return null;

  const pickedCount = sim.day.pickedActivityIds.length;
  const atCap = pickedCount >= MAX_ACTIVITIES_PER_DAY;

  const isWeeklyGated = (a: Activity): boolean => {
    if (a.availability !== 'weekly') return false;
    const cutoff = sim.day.dayNumber - WEEKLY_GATE_DAYS;
    return sim.activityHistory.some((h) => h.id === a.id && h.pickedOnDay > cutoff);
  };

  return (
    <div style={PANEL_STYLE} aria-label="Morning activities">
      <div style={HEADING_STYLE}>Aktiviteter i dag</div>
      <div style={SUB_STYLE}>
        Välj upp till {MAX_ACTIVITIES_PER_DAY} — {pickedCount}/{MAX_ACTIVITIES_PER_DAY} valda
      </div>
      {ACTIVITY_CATALOGUE.map((a) => {
        const picked = sim.day.pickedActivityIds.includes(a.id);
        const gated = isWeeklyGated(a);
        const disabled = !picked && (atCap || gated);
        return (
          <div
            key={a.id}
            style={CARD_STYLE(picked, disabled)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-pressed={picked}
            aria-disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (picked) dispatch({ type: 'UNPICK_ACTIVITY', id: a.id });
              else dispatch({ type: 'PICK_ACTIVITY', id: a.id });
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (picked) dispatch({ type: 'UNPICK_ACTIVITY', id: a.id });
                else dispatch({ type: 'PICK_ACTIVITY', id: a.id });
              }
            }}
          >
            <div style={CARD_NAME_STYLE}>
              {a.name}
              {a.availability === 'weekly' && (
                <span style={{ opacity: 0.55, fontWeight: 400, marginLeft: 6, fontSize: 10 }}>
                  · weekly
                </span>
              )}
            </div>
            <div style={CARD_DESC_STYLE}>{a.description}</div>
            <div style={EFFECT_ROW_STYLE} aria-label="Three-column effect">
              <span style={EFFECT_CELL_STYLE(a.effect.economic)}>
                <span style={{ opacity: 0.55, fontSize: 9, marginRight: 3 }}>ECON</span>
                {formatSek(a.effect.economic)}
              </span>
              <span style={EFFECT_CELL_STYLE(a.effect.social)}>
                <span style={{ opacity: 0.55, fontSize: 9, marginRight: 3 }}>SOC</span>
                {formatCapital(a.effect.social)}
              </span>
              <span style={EFFECT_CELL_STYLE(a.effect.ecological)}>
                <span style={{ opacity: 0.55, fontSize: 9, marginRight: 3 }}>ECO</span>
                {formatCapital(a.effect.ecological)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
