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
// ORDER 317 — kockens ring #7fa8ff ur samma tabell (d6Ui ROLE_RING via staffRing.ts ROLE_COLOUR).

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

// ORDER 317 — orkens ring som rummet ritar den (staffStatus.ts ORK_RING): tre bågar,
// fyllda efter läget (pigg 3, trött 2, slut 1), de andra streckade.
function StaminaGlyph({ kind }: { kind: 'fresh' | 'tired' | 'spent' }) {
  const R = ORK_RING, n = R.segments, filled = R.count[kind];
  const arc = (i: number) => {
    const span = 360 / n - R.gapDeg;
    const a0 = ((R.startDeg + i * (360 / n) + R.gapDeg / 2) * Math.PI) / 180, a1 = a0 + (span * Math.PI) / 180;
    const p = (a: number) => `${12 + 9 * Math.cos(a)} ${12 - 9 * Math.sin(a)}`;
    return `M ${p(a0)} A 9 9 0 0 0 ${p(a1)}`;
  };
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden style={{ verticalAlign: 'middle', marginRight: 2 }}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={arc(i)} fill="none" strokeWidth={4}
          stroke={i < filled ? R.filled.edge : R.empty.edge} strokeDasharray={i < filled ? undefined : '2 2'} opacity={i < filled ? 1 : 0.7} />
      ))}
    </svg>
  );
}

// ORDER 317 — Designs D6 del 2 (d6Ui.ts LEGEND): personalen (rollen, orken,
// trivseln) och gästerna (stämningen). `withWhy` ger raden om varje grupp, som
// i menyn under Spelets regler.
export function StatusLegendBody({ withWhy }: { withWhy?: boolean } = {}) {
  const lang = useLanguage();
  const d = (k: string) => tt(lang, k as StringKey);
  const why = (k: string) => (withWhy ? <p className="nx-small nx-legend-why" data-testid={`legend-why-${k}`}>{d(`legend.${k}.why`)}</p> : null);
  return (
    <div className="nx-legend" data-testid="status-legend-body">
      <div className="nx-label">{d('legend.staff')}</div>
      <div className="nx-legend-group" data-testid="legend-group-role">
        <div className="nx-legend-head">{d('legend.role')}</div>
        {why('role')}
        <ul className="nx-legend-list">
          {ROLES.map((r) => (
            <li key={r} data-testid={`legend-role-${r}`} data-colour={ROLE_COLOUR[r]}><span className="nx-legend-ring" style={{ borderColor: ROLE_COLOUR[r] }} /> {tt(lang, `ring.role.${r}` as StringKey)}</li>
          ))}
        </ul>
      </div>
      <div className="nx-legend-group" data-testid="legend-ork">
        <div className="nx-legend-head">{d('legend.stamina')}</div>
        {why('stamina')}
        <ul className="nx-legend-list">
          {(['fresh', 'tired', 'spent'] as const).map((k) => <li key={k} data-testid={`legend-stamina-${k}`}><StaminaGlyph kind={k} /> {d(`legend.${k}`)}</li>)}
        </ul>
      </div>
      <div className="nx-legend-group" data-testid="legend-wellbeing">
        <div className="nx-legend-head">{d('legend.wellbeing')}</div>
        {why('wellbeing')}
        <ul className="nx-legend-list">
          {(['thriving', 'okay', 'low'] as const).map((k) => <li key={k} data-testid={`legend-wellbeing-${k}`}><WellbeingGlyph kind={k} /> {d(`legend.${k}`)}</li>)}
        </ul>
      </div>
      <div className="nx-label">{d('legend.guests')}</div>
      <div className="nx-legend-group" data-testid="legend-group-mood">
        <div className="nx-legend-head">{d('legend.mood')}</div>
        {why('mood')}
        <ul className="nx-legend-list">
          {MOODS.map((m) => (
            <li key={m} data-testid={`legend-mood-${m}`}><MoodSymbol mood={m} px={18} /> {tt(lang, `mood.${m}` as StringKey)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Hörnet i statusläget. */
export function StatusLegend() {
  const on = useSyncExternalStore(subscribeStatusMode, statusModeOn, statusModeOn);
  const lang = useLanguage();
  if (!on) return null;
  return (
    <aside className="nx nx-panel nx-status-legend" aria-label={strings.legend.heading} data-testid="status-legend">
      <div className="nx-label nx-accent-text">{strings.legend.heading}</div>
      <div className="nx-small nx-legend-why">{tt(lang, 'legend.hint' as StringKey)}</div>
      <StatusLegendBody />
    </aside>
  );
}
