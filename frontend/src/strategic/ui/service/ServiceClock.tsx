// ORDER 274 — tiden kvar av servicen syns hela kvällen (Vision Owner
// 2026-09-28, provspel). Klockslaget, tiden kvar och en stapel som töms
// mot stängning, i designsystemets form (paket 1, 00-SYS). Läser
// sim/serviceClock.ts, samma tider som reducern stänger servicen på.
// Visas under hela servicen, i alla klasser, och ligger överst i mitten
// så att den inte krockar med raketkortet (höger) och mätarna (vänster).

import { strings } from '../../../content/strings';
import { INCIDENTS } from '../../../sim/balance';
import { formatClock } from '../../../sim/incidents';
import { serviceClock } from '../../../sim/serviceClock';
import { useSimState } from '../../simulation/SimulationProvider';
import { NxLabel, u } from '../system/components';
import '../system/system.css';

const MINUTES_PER_HOUR = INCIDENTS.minutesPerHour;

export function ServiceClock() {
  const sim = useSimState();
  const c = serviceClock(sim);
  if (!c) return null;
  const t = strings.service.clock;
  const h = Math.floor(c.leftMinutes / MINUTES_PER_HOUR);
  const m = c.leftMinutes % MINUTES_PER_HOUR;
  const left = c.leftMinutes > 0 ? t.left(h, m) : t.closed;
  const closes = t.closes(formatClock(c.endMinutes));
  return (
    <div
      className="nx nx-panel"
      role="timer"
      aria-label={t.aria(left, closes)}
      data-testid="service-clock"
      data-left-minutes={c.leftMinutes}
      style={{
        position: 'fixed',
        top: u(92),
        left: '50%',
        transform: 'translateX(-50%)',
        width: u(420),
        padding: `${u(12)} ${u(20)}`,
        zIndex: 40,
        pointerEvents: 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: u(12) }}>
        <NxLabel>{t.label} · {t.now(formatClock(c.nowMinutes))}</NxLabel>
        <span className="nx-small" style={{ fontWeight: 700 }} data-testid="service-clock-left">{left}</span>
      </div>
      <div aria-hidden style={{ height: u(8), marginTop: u(8), border: 'var(--nx-line) solid var(--nx-ink)' }}>
        <div style={{ height: '100%', width: `${(1 - c.elapsedShare) * 100}%`, background: 'var(--nx-ink)' }} />
      </div>
      <div className="nx-small nx-muted" style={{ marginTop: u(4) }}>{closes}</div>
    </div>
  );
}
