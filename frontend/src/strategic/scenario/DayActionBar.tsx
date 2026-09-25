// ORDER 263 (Nexus v1 etapp 1) — morgonens beslut att öppna.
//
// Ersätter tjänstelängdsväljaren (ORDER 043 v3 §10). Speldesign > Tiden:
// dagen har en service, kvällens, och spelaren väljer inte längden
// (balance.ts SERVICE). På söndagen är krogen stängd och morgonen
// avslutas i stället, med fyra schemaplatser.
//
// Visas på morgonen (och eftermiddagen, om lunchen redan passerat).
// Döljs under service och kväll.

import { strings } from '../../content/strings.sv';
import { calendarFor } from '../../sim/calendar';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  maxWidth: 'min(560px, calc(100vw - 32px))',
  width: 'max-content',
  padding: '14px 20px 16px',
  background: 'rgba(30, 22, 16, 0.86)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 40
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 4
};

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
  marginTop: 10
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: '10px 18px',
  minHeight: 44,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer'
};

export function DayActionBar() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const period = sim.day.period;
  if (period !== 'morning' && period !== 'afternoon') return null;
  const cal = calendarFor(sim.day.dayNumber);
  const used = sim.day.pickedActivityIds.length;
  return (
    <div style={OVERLAY_STYLE} data-testid="day-action-bar">
      <div style={HEADING_STYLE}>
        {strings.calendar.weekdays[cal.weekday]} · {strings.morning.heading}
      </div>
      <div>{cal.isServiceDay ? strings.morning.serviceDayBody : strings.morning.sundayBody}</div>
      <div style={ROW_STYLE}>
        <span style={{ opacity: 0.75 }}>{strings.morning.slots(used, cal.scheduleSlots)}</span>
        {cal.isServiceDay ? (
          <button
            type="button"
            style={BUTTON_STYLE}
            data-testid="start-service"
            onClick={() => dispatch({ type: 'START_SERVICE' })}
          >
            {strings.morning.startService}
          </button>
        ) : (
          <button
            type="button"
            style={BUTTON_STYLE}
            data-testid="close-day"
            onClick={() => dispatch({ type: 'CLOSE_DAY' })}
          >
            {strings.morning.closeSunday}
          </button>
        )}
      </div>
    </div>
  );
}
