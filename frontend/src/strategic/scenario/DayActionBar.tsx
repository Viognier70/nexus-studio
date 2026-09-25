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
import { scheduleSlotsUsed } from '../knowledge/pavilionVisit';
import { MedalShelf } from '../knowledge/ui/MedalShelf';
import { settlementInWords } from '../economy/BankDialog';
import { stockForecast } from '../../sim/stockForecast';
import { eventsSince } from '../../sim/serviceEvents';
import { numberWord } from '../simulation/eveningAccount';

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

interface Props {
  // ORDER 264 — öppnar Måltidens hus (paviljongerna).
  onOpenHouse: () => void;
  // ORDER 265 — öppnar banken (söndag, eller utan verksamhet).
  onOpenBank: () => void;
  // ORDER 267 — söndagstidningen (bara söndag morgon efter en avräkning).
  onOpenNewspaper?: () => void;
}

export function DayActionBar({ onOpenHouse, onOpenBank, onOpenNewspaper }: Props) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const period = sim.day.period;
  if (period !== 'morning' && period !== 'afternoon') return null;
  const cal = calendarFor(sim.day.dayNumber);
  const used = scheduleSlotsUsed(sim);
  const business = sim.economy.businessClass;
  const settlement = !cal.isServiceDay ? settlementInWords(sim) : [];
  const showBank = business === null || !cal.isServiceDay;
  // ORDER 266 — morgonens händelser (inspektion, banken, självläkning).
  const morningEvents = eventsSince(sim, sim.day.periodStartAt);
  // ORDER 266 — lagret i ord före öppning (speldesign > Lagret).
  const forecast = stockForecast(sim);
  const forecastText = forecast.kind === 'noMenu'
    ? strings.service.stock.noMenu
    : forecast.covers === 0
      ? strings.service.stock.none
      : strings.service.stock.forecast(numberWord(forecast.covers));
  return (
    <div style={OVERLAY_STYLE} data-testid="day-action-bar">
      <div style={HEADING_STYLE}>
        {strings.calendar.weekdays[cal.weekday]} · {strings.morning.heading}
        {business && <> · {strings.economy.classes[business]}</>}
      </div>
      <div>
        {business === null
          ? strings.economy.noBusinessBody
          : cal.isServiceDay ? strings.morning.serviceDayBody : strings.morning.sundayBody}
      </div>
      {morningEvents.length > 0 && (
        <div style={{ marginTop: 6 }} data-testid="morning-events">
          <strong>{strings.service.morningEvents}:</strong> {morningEvents.map((e) => e.text).join(' ')}
        </div>
      )}
      {cal.isServiceDay && business !== null && (
        <div style={{ marginTop: 6, opacity: 0.85 }} data-testid="stock-forecast">{forecastText}</div>
      )}
      {settlement.length > 0 && !onOpenNewspaper && (
        <div style={{ marginTop: 6 }} data-testid="settlement">
          <strong>{strings.economy.settlement.heading}.</strong> {settlement.join(' ')}
        </div>
      )}
      <div style={ROW_STYLE}>
        <span style={{ opacity: 0.75 }}>{strings.morning.slots(used, cal.scheduleSlots)}</span>
        {period === 'morning' && (
          <button type="button" style={BUTTON_STYLE} data-testid="open-house" onClick={onOpenHouse}>
            {strings.knowledge.houseButton}
          </button>
        )}
        {period === 'morning' && onOpenNewspaper && (
          <button type="button" style={BUTTON_STYLE} data-testid="open-newspaper" onClick={onOpenNewspaper}>
            {strings.newspaper.open}
          </button>
        )}
        {period === 'morning' && showBank && (
          <button type="button" style={BUTTON_STYLE} data-testid="open-bank" onClick={onOpenBank}>
            {strings.economy.bankButton}
          </button>
        )}
        {cal.isServiceDay && !sim.scaleDown.closedDinner && sim.economy.businessClass !== null ? (
          <button
            type="button"
            style={BUTTON_STYLE}
            data-testid="start-service"
            onClick={() => dispatch({ type: 'START_SERVICE' })}
          >
            {strings.morning.startService}
          </button>
        ) : sim.introduction ? null : (
          <button
            type="button"
            style={BUTTON_STYLE}
            data-testid="close-day"
            onClick={() => dispatch({ type: 'CLOSE_DAY' })}
          >
            {cal.isServiceDay ? strings.morning.closeDay : strings.morning.closeSunday}
          </button>
        )}
      </div>
      <MedalShelf />
    </div>
  );
}
