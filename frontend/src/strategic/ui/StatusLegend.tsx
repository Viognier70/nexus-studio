// ORDER 313 §7 (Anders 2026-10-06) — teckenförklaringen för symbolerna:
// personalens ringar (roll, ork och trivsel) och gästernas stämning. Står i
// hörnet i statusläget (S) och i menyn under "Spelets regler" (RulesPanel).
// Färgerna läses ur samma källor som renderingen: ROLE_COLOUR
// (scene/staffRing.ts) och MoodSymbol (ui/host/MoodSymbol.tsx, MOODS).
// Formen kommer från Design (D6).

import { useSyncExternalStore } from 'react';
import { strings } from '../../content/strings';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { MOODS } from '../../sim/guestMood';
import { ROLE_COLOUR } from '../scene/staffRing';
import { MoodSymbol } from './host/MoodSymbol';
import { statusModeOn, subscribeStatusMode } from './statusMode';
import './screens/screens.css';
import type { StaffRole } from '../scene/staffRing';
import { ORK_RING, WELLBEING_SYMBOL } from '../scene/staffStatus';

const ROLES: readonly StaffRole[] = ['host', 'waiter', 'sommelier', 'bartender', 'cook', 'dishwasher', 'dj'];

// Trivselns platta som WellbeingLayer ritar den (staffStatus.ts WELLBEING_SYMBOL).
function WellbeingGlyph({ kind }: { kind: 'thriving' | 'okay' | 'low' }) {
  const w = WELLBEING_SYMBOL;
  return (
    <svg width={w.sizePx} height={w.sizePx} viewBox="0 0 24 24" aria-hidden style={{ verticalAlign: 'middle', marginRight: 2 }}>
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx={w.radiusPx} fill={w.plate} stroke={w.rim} strokeWidth="1.5" />
      {w.glyphs[kind].map((g, i) => g.mode === 'fill'
        ? <path key={i} d={g.d} fill={w.glyph} />
        : <path key={i} d={g.d} fill="none" stroke={w.glyph} strokeWidth={(g as { w?: number }).w ?? 1.6} strokeLinecap="round" />)}
    </svg>
  );
}

export function StatusLegendBody() {
  const lang = useLanguage();
  const l = strings.legend;
  return (
    <div className="nx-legend" data-testid="status-legend-body">
      <div className="nx-label">{l.staff}</div>
      <ul className="nx-legend-list">
        {ROLES.map((r) => (
          <li key={r} data-testid={`legend-role-${r}`}><span className="nx-legend-ring" style={{ borderColor: ROLE_COLOUR[r] }} /> {tt(lang, `ring.role.${r}` as StringKey)}</li>
        ))}
        <li data-testid="legend-ork">
          <span className="nx-legend-ring" style={{ background: ORK_RING.filled.fill, borderColor: ORK_RING.filled.edge }} />
          <span className="nx-legend-ring" style={{ background: ORK_RING.empty.fill, borderColor: ORK_RING.empty.edge, borderStyle: 'dashed' }} /> {l.ork}
        </li>
        <li data-testid="legend-wellbeing">
          {(['thriving', 'okay', 'low'] as const).map((k) => <WellbeingGlyph key={k} kind={k} />)} {l.wellbeing}
        </li>
      </ul>
      <div className="nx-label">{l.guests}</div>
      <ul className="nx-legend-list">
        {MOODS.map((m) => (
          <li key={m} data-testid={`legend-mood-${m}`}><MoodSymbol mood={m} px={18} /> {tt(lang, `mood.${m}` as StringKey)}</li>
        ))}
      </ul>
    </div>
  );
}

/** Hörnet i statusläget. */
export function StatusLegend() {
  const on = useSyncExternalStore(subscribeStatusMode, statusModeOn, statusModeOn);
  if (!on) return null;
  return (
    <aside className="nx nx-panel nx-status-legend" aria-label={strings.legend.heading} data-testid="status-legend">
      <div className="nx-label nx-accent-text">{strings.legend.heading}</div>
      <StatusLegendBody />
    </aside>
  );
}
