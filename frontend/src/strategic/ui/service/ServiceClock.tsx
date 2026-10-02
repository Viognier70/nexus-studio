// ORDER 274 — tiden kvar av servicen syns hela kvällen (Vision Owner
// 2026-09-28, provspel).
// ORDER 280 — klockan enligt Designs K1 (leveransen kassan och kvällen,
// Vision Owner: "Kontrollera också att klockan för servicen syns
// tydligt"). Mitt i översta raden, 440 px bred. Klockslaget är 60 px,
// tabular-nums, med fast bredd och white-space: nowrap, så att det aldrig
// bryts (buggen i G1), också på engelska och vid 200 % textstorlek.
// Etiketten (Servicen, Rusning, Sista beställning, Stängt) och tiden kvar
// står på var sin rad till höger. Tio halvtimmesrutor från 18 till 23:
// passerade fyllda, den aktuella fylls från vänster, den sista har
// accentkant hela kvällen och fylls med accent. På morgonen står
// "Dörrarna öppnar 18.00" och rutorna är tomma; på kvällen efter
// stängning står sopbilens tid.
//
// Tiderna läses ur sim/serviceClock.ts, samma som reducern stänger på.

import { strings } from '../../../content/strings';
import { CLOCK, INCIDENTS, SITTING } from '../../../sim/balance';
import { clockCells, clockLabel, serviceClock } from '../../../sim/serviceClock';
import { beforeDoors, doorsOpenMinutes } from '../../../sim/clock';
import { useSimState } from '../../simulation/SimulationProvider';
import { u } from '../system/components';
import '../system/system.css';

const MINUTES_PER_HOUR = INCIDENTS.minutesPerHour;
const START = SITTING.serviceStartHour * MINUTES_PER_HOUR;

function hhmm(minutes: number): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR);
  const m = minutes % MINUTES_PER_HOUR;
  return strings.clock.time(String(h), String(m).padStart(INCIDENTS.clockDigits, '0'));
}

export function ServiceClock() {
  const sim = useSimState();
  const business = sim.economy.businessClass;
  const c = serviceClock(sim);
  const period = sim.day.period;
  const t = strings.clock;
  if (!c && !business) return null;

  let time: string | null;
  let label: string;
  let sub: string;
  let since: number;
  let dataLabel: string;
  let accentLabel = false;
  const endOfService = START + CLOCK.cells * CLOCK.cellMinutes;
  if (c && beforeDoors(sim)) {
    // ORDER 292b — förberedelserna: dörrarna är inte öppna än, och klockan
    // säger när de öppnar (förut stod "Servicen" och tiden kvar).
    time = hhmm(c.nowMinutes);
    label = t.label.prep;
    sub = t.doorsAtTime(hhmm(doorsOpenMinutes(sim)));
    since = c.nowMinutes - c.startMinutes;
    dataLabel = 'prep';
  } else if (c) {
    const l = clockLabel(c);
    time = hhmm(c.nowMinutes);
    label = t.label[l];
    const h = Math.floor(c.leftMinutes / MINUTES_PER_HOUR);
    const m = c.leftMinutes % MINUTES_PER_HOUR;
    sub = c.leftMinutes === 0 ? t.label.closed : h > 0 ? t.left(h, String(m).padStart(INCIDENTS.clockDigits, '0')) : t.leftMin(m);
    since = c.nowMinutes - c.startMinutes;
    dataLabel = l;
    accentLabel = l === 'lastOrders';
  } else if (period === 'evening') {
    time = hhmm(endOfService + CLOCK.pickupAfterCloseMinutes);
    label = t.label.closed;
    sub = t.pickup;
    since = CLOCK.cells * CLOCK.cellMinutes;
    dataLabel = 'closed';
  } else {
    time = null;
    label = t.label.morning;
    sub = t.doorsAtTime(hhmm(doorsOpenMinutes(sim)));
    since = 0;
    dataLabel = 'morning';
  }
  const cells = clockCells(since);
  return (
    <div
      className="nx nx-panel"
      role="timer"
      aria-label={t.aria(label, time ?? '', sub)}
      data-testid="service-clock"
      data-label={dataLabel}
      data-left-minutes={c?.leftMinutes ?? ''}
      data-last-orders={c?.lastOrders ?? false}
      style={{
        // ORDER 284 — klockan står efter dagsmärket i raden uppe till vänster
        // (.gb-topleft i strategic.css), inte på en fast x: med ett långt
        // dagsnamn täckte den märket (tredje provspelet). Designs x 740
        // krockar med kassan, krediterna, farten och menyn till höger.
        flexShrink: 0,
        width: u(440),
        padding: `${u(12)} ${u(22)} ${u(10)}`,
        pointerEvents: 'none',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: u(20) }}>
        <span
          className={`nx-num${c?.lastOrders ? ' nx-pulse' : ''}`}
          data-testid="service-clock-time"
          style={{ fontSize: u(60), lineHeight: 1, width: time ? u(176) : 'auto', minWidth: time ? u(176) : 0, whiteSpace: 'nowrap', fontWeight: 800 }}
        >
          {time ?? '—'}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="nx-label" data-testid="service-clock-label" style={{ fontSize: u(16), color: accentLabel ? 'var(--w-candle)' : undefined }}>{label}</div>
          {/* ORDER 293 — raden får bryta: "Dörrarna öppnar 19.05" kapades i rutan. */}
          <div data-testid="service-clock-left" style={{ fontSize: u(22), fontWeight: 700, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{sub}</div>
        </div>
      </div>
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: `repeat(${CLOCK.cells}, 1fr)`, gap: u(4), marginTop: u(12) }} data-testid="service-clock-cells">
        {cells.map((cell, i) => (
          // ORDER 285 — den varma formen: passerad tid i guld.
          // ORDER 290 (Designs rätt och fel, beslut 2026-09-30): rött betyder
          // bara fel svar; den sista halvtimmen är ljuslåga och pulserar.
          <div key={i} className={cell.accent && c?.lastOrders ? 'nx-pulse' : undefined} data-fill={cell.fill.toFixed(2)} style={{ height: u(12), borderRadius: 999, background: cell.accent ? 'rgba(255,213,143,.28)' : 'rgba(244,230,204,.12)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${cell.fill * 100}%`, background: cell.accent ? 'var(--w-candle)' : 'var(--w-gold)' }} />
          </div>
        ))}
      </div>
      <div aria-hidden className="nx-small nx-muted" style={{ display: 'flex', justifyContent: 'space-between', marginTop: u(6), fontWeight: 700 }}>
        {Array.from({ length: CLOCK.cells / 2 + 1 }, (_, i) => (
          <span key={i}>{Math.floor((START + i * 2 * CLOCK.cellMinutes) / MINUTES_PER_HOUR)}</span>
        ))}
      </div>
    </div>
  );
}
