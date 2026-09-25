// ORDER 263 (Nexus v1 etapp 1) — var i veckan spelaren är.
//
// Speldesign > Tiden: dagen (morgon, service, kväll), veckan och
// säsongens högtider. Visar veckodag, vecka, fas och högtid i ord —
// inga siffertavlor (princip 6). Läser kalendern ur `src/sim/calendar.ts`,
// samma källa som simuleringen använder.

import { strings } from '../../content/strings.sv';
import { calendarFor, type DayPhase } from '../../sim/calendar';
import { SEASON } from '../../sim/balance';
import { useSimState } from '../simulation/SimulationProvider';
import type { DayPeriod } from '../types';

export function phaseOf(period: DayPeriod): DayPhase {
  if (period === 'lunch' || period === 'dinner') return 'service';
  if (period === 'evening') return 'evening';
  return 'morning';
}

const BADGE_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '4px 10px',
  background: 'rgba(20, 14, 10, 0.62)',
  border: '1px solid rgba(168, 146, 106, 0.55)',
  borderRadius: 3,
  color: '#f0e8d4',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  lineHeight: 1.3,
  letterSpacing: 0.2,
  minHeight: 26,
  boxSizing: 'border-box',
  flexShrink: 0,
  whiteSpace: 'nowrap'
};

const HOLIDAY_STYLE: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.8,
  color: '#e8c98a'
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
    <div style={BADGE_STYLE} className="gb-daybadge" data-testid="day-badge" aria-live="polite">
      {/* Full form; på smala skärmar visas den korta formen (strategic.css). */}
      <span className="gb-daybadge-full">
        <strong data-testid="day-badge-weekday">{strings.calendar.weekdays[cal.weekday]}</strong>
        {' · '}
        <span data-testid="day-badge-week">{strings.calendar.week(cal.week, SEASON.weeks)}</span>
        {' · '}
        <span data-testid="day-badge-phase">{phase}</span>
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
