// ORDER 263 (Nexus v1 etapp 1) — var i veckan spelaren är.
//
// Speldesign > Tiden: dagen (morgon, service, kväll), veckan och
// säsongens högtider. Visar veckodag, vecka, fas och högtid i ord —
// inga siffertavlor (princip 6). Läser kalendern ur `src/sim/calendar.ts`,
// samma källa som simuleringen använder.

import { strings } from '../../content/strings';
import { calendarFor, type DayPhase } from '../../sim/calendar';
import { SEASON } from '../../sim/balance';
import { useSimState } from '../simulation/SimulationProvider';
import type { DayPeriod } from '../types';

export function phaseOf(period: DayPeriod): DayPhase {
  if (period === 'lunch' || period === 'dinner') return 'service';
  if (period === 'evening') return 'evening';
  return 'morning';
}

// ORDER 280 — Designs K1: dagen i en ruta överst till vänster, i
// designsystemets form ("LÖRDAG · VECKA 1 AV 8   Servicen").
// ORDER 284 — märket står först i raden uppe till vänster (.gb-topleft i
// strategic.css), med klockan efter sig, så att klockan aldrig täcker dagens
// namn (tredje provspelet).
const BADGE_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: 'calc(16 * var(--nx-u)) calc(22 * var(--nx-u))',
  background: 'var(--nx-ground, #f3f2f2)',
  color: 'var(--nx-ink, #201e1d)',
  fontSize: 'max(12px, calc(20 * var(--nx-u)))',
  lineHeight: 1.3,
  boxSizing: 'border-box',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  zIndex: 46
};

const HOLIDAY_STYLE: React.CSSProperties = {
  fontSize: 'max(11px, calc(16 * var(--nx-u)))',
  color: 'var(--nx-ink-2, #6f6b69)'
};

export function DayBadge() {
  const sim = useSimState();
  const cal = calendarFor(sim.day.dayNumber);
  const dayPhase = phaseOf(sim.day.period);
  // Stängd dag: morgonen visas som "Stängt", kvällen som vanligt.
  const phase = !cal.isServiceDay && dayPhase === 'morning'
    ? strings.calendar.closed
    : strings.calendar.phases[dayPhase];
  const holiday = cal.holiday
    ? strings.calendar.holidayToday(strings.calendar.holidays[cal.holiday.id])
    : cal.holidayThisWeek
      ? strings.calendar.holidayThisWeek(strings.calendar.holidays[cal.holidayThisWeek.id])
      : null;
  return (
    <div style={BADGE_STYLE} className="nx gb-daybadge" data-testid="day-badge" aria-live="polite">
      {/* Full form; på smala skärmar visas den korta formen (strategic.css). */}
      <span className="gb-daybadge-full">
        <span className="nx-label" style={{ fontSize: 'inherit' }}>
          <span data-testid="day-badge-weekday">{strings.calendar.weekdays[cal.weekday]}</span>
          {' · '}
          <span data-testid="day-badge-week">{strings.calendar.week(cal.week, SEASON.weeks)}</span>
        </span>
        <span style={{ marginLeft: 'calc(20 * var(--nx-u))', color: 'var(--nx-ink-2, #6f6b69)' }} data-testid="day-badge-phase">{phase}</span>
      </span>
      <span className="gb-daybadge-short" aria-hidden="true">
        <strong>{strings.calendar.weekdaysShort[cal.weekday]}</strong>
        {' · '}
        {strings.calendar.weekShort(cal.week)}
        {' · '}
        {phase}
      </span>
      {holiday && <span style={HOLIDAY_STYLE} className="gb-daybadge-holiday">{holiday}</span>}
    </div>
  );
}
