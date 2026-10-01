// ORDER 287a — bokningsboken på morgonen (Designs skärm 1, brief.book.*):
// kvällens gäster efter typ, med typens färg ur WARM.guest, när typen
// brukar komma och hur många. Gästen med socialt kapital står med sitt
// namn, och gästerna utan bokning sist. Talen är samma som simuleringen
// låser när dörrarna öppnar (guestTypes.ts bookingFor).

import type { SimulationState } from '../types';
import { strings } from '../../content/strings';
import { calendarFor } from '../../sim/calendar';
import { GUEST_TYPES, SITTING, INCIDENTS } from '../../sim/balance';
import { formatClock } from '../../sim/incidents';
import { doorsOpenMinutes } from '../../sim/clock';
import { WARM } from '../../ui/theme/nexusTheme.warm';
import { buzzFactor, currentBooking, socialName } from '../simulation/guestTypes';

interface Row {
  key: string;
  time: string;
  colour: string;
  who: string;
  note: string;
  n: number;
}

const START = SITTING.serviceStartHour * INCIDENTS.minutesPerHour;

export function BookingBook({ sim }: { sim: SimulationState }) {
  const cal = calendarFor(sim.day.dayNumber);
  const b = currentBooking(sim);
  const g = strings.guestTypes;
  const at = GUEST_TYPES.arrivesAfterMinutes;
  // ORDER 292b — ingen kommer före dörrarna (sim/clock.ts doorsOpenMinutes).
  const doors = doorsOpenMinutes(sim);
  const when = (afterStart: number) => formatClock(Math.max(doors, START + afterStart));
  const rows: Row[] = [];
  const typed = [
    { key: 'student', n: b.counts.student },
    { key: 'middle', n: b.counts.middle },
    { key: 'high', n: b.counts.high }
  ] as const;
  for (const r of typed) {
    if (r.n <= 0) continue;
    rows.push({ key: r.key, time: when(at[r.key]), colour: WARM.guest[r.key], who: g.book[r.key], note: g.bookNote[r.key], n: r.n });
  }
  if (b.social) {
    rows.push({ key: 'social', time: when(at.social), colour: WARM.guest.social, who: g.book.social(socialName(b.social.nameIndex)), note: g.bookNote.social, n: 1 });
  }
  // ORDER 292 — gårdagens svar: bokningar tack vare och avbokningar.
  for (const a of b.answers ?? []) {
    const what = strings.nextDay.what[a.track];
    rows.unshift({ key: `answer-${a.track}`, time: '—', colour: a.n > 0 ? 'var(--w-gold)' : 'var(--w-candle)', who: a.n > 0 ? strings.nextDay.thanks(a.n, what) : strings.nextDay.lost(-a.n, what), note: strings.nextDay.note, n: a.n });
  }
  if (b.walkIns > 0) rows.push({ key: 'walkIns', time: '—', colour: 'rgba(42,28,19,.3)', who: g.book.walkIns, note: g.bookNote.walkIns, n: b.walkIns });
  // Ryktet från en gäst med socialt kapital som gäller i kväll.
  const buzz = (sim.guestBuzz ?? []).find((x) => x.fromDay <= sim.day.dayNumber && sim.day.dayNumber <= x.untilDay);
  const f = buzzFactor(sim);
  return (
    <div className="nx-paper nxs-book" data-testid="booking-book">
      <div className="nx-label">{strings.morningBuy.bookKicker}</div>
      <div className="nxs-book-row">
        <span className="nx-mid">{strings.morningBuy.bookTitle(strings.calendar.weekdays[cal.weekday])}</span>
        <span className="nx-num nxs-book-n" data-testid="booking-guests">{b.total}</span>
      </div>
      <div className="nxs-book-list" data-testid="booking-rows">
        {rows.map((r) => (
          <div key={r.key} className="nxs-book-line" data-testid={`booking-row-${r.key}`}>
            <span className="nxs-book-time nx-num">{r.time}</span>
            <span className="nxs-book-dot" style={{ background: r.colour }} aria-hidden />
            <span className="nxs-book-who">
              <span className="nxs-book-name">{r.who}</span>
              <span className="nx-small nx-muted">{r.note}</span>
            </span>
            <span className="nx-num nxs-book-count" data-testid={`booking-n-${r.key}`}>{r.n}</span>
          </div>
        ))}
      </div>
      {buzz && f !== 1 && (
        <p className="nx-small" data-testid="booking-buzz" style={{ margin: 0 }}>{g.bookNoteBuzz(socialName(buzz.nameIndex), f > 1)}</p>
      )}
      {b.billionaireInTown && (
        <p className="nx-small nx-muted" data-testid="booking-billionaire" style={{ margin: 0, fontStyle: 'italic' }}>{g.billionaireAside}</p>
      )}
      <p className="nx-small nx-muted" style={{ margin: 0 }}>{strings.morningBuy.bookNote}</p>
    </div>
  );
}
