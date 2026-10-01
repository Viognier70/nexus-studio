// ORDER 280 — händelserna enligt Designs H1 (leveransen kassan och kvällen).
//
// I högerkanten under servicen, när ingen raket står öppen (raketkortet tar
// samma plats). Nyaste raden överst, tretton rader. Varje rad har
// klockslaget, en ikon, texten och beloppet till höger: beställt i
// neutral-600 (pengar på väg), betalt i bläck, dricks i accent, varningar om
// lagret i accent. En ny rad glider in 28 px från vänster på accent-100 i
// 900 ms. En betalning flyger som en lapp till kassan (ui/juice/fx.ts),
// som räknas upp först när lappen landat.
//
// Under strömmen: I kväll — betalt, dricks till personalen (går aldrig
// till kassan) och öppna notor. Och knappen till Back your knowledge.
//
// Läser strömmen (state.eventStream) med fälten feed, table och amountSek,
// som simuleringen sätter (reducer.ts, guestOrders.ts, stockPackages.ts).

import { panelOpen, setServiceAmounts, useServiceDrawer } from './serviceDrawer';
import { useEffect, useRef } from 'react';
import { strings } from '../../../content/strings';
import { GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, SERVICE_STREAM, SITTING } from '../../../sim/balance';
import { beforeDoors, doorsOpenMinutes, formatClock as clockText } from '../../../sim/clock';
import { canStartBack, totalCredits, whyNotBack } from '../../../sim/incidents';
import { BACK } from '../../../sim/balance';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import type { EventStreamEntry } from '../../types';
import { NxButton, NxLabel } from '../system/components';
import { formatSek } from '../CashCounter';
import { flyTo } from '../juice/fx';
import { countTo, type Counter } from '../juice/juice';
import '../system/system.css';
import './service.css';
import { numberLocale } from '../../../content/language';

const ROWS = 13;
const MPH = INCIDENTS.minutesPerHour;

function clockAt(at: number, periodStartAt: number): string {
  const min = SITTING.serviceStartHour * MPH + Math.floor(Math.max(0, at - periodStartAt) * GAME_MINUTES_PER_SIM_SECOND);
  return strings.clock.time(String(Math.floor(min / MPH)), String(min % MPH).padStart(INCIDENTS.clockDigits, '0'));
}

function Icon({ feed }: { feed: EventStreamEntry['feed'] | undefined }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (feed) {
    case 'ordered': return <svg {...p}><path d="M6 3h9l3 3v15H6z" /><path d="M9 9h6M9 13h6M9 17h4" /></svg>;
    case 'paid': return <svg {...p}><rect x="3" y="7" width="18" height="10" rx="1" /><circle cx="12" cy="12" r="2.2" /></svg>;
    case 'tip': return <svg {...p}><path d="M4 14c3 0 4-2 7-2h4a2 2 0 0 1 0 4h-4" /><path d="M4 18h9l6-4" /><circle cx="16" cy="6" r="2.5" /></svg>;
    case 'miss': return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M6.5 6.5l11 11" /></svg>;
    case 'warn': return <svg {...p}><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17.5v.5" /></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="1.5" /></svg>;
  }
}

function amountText(e: EventStreamEntry): string | null {
  if (e.amountSek === undefined) return null;
  const v = Math.round(e.amountSek).toLocaleString(numberLocale());
  return e.feed === 'ordered' ? formatSek(e.amountSek) : strings.money.plus(v);
}

function Row({ e, fresh, periodStartAt, amounts }: { e: EventStreamEntry; fresh: boolean; periodStartAt: number; amounts: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const flown = useRef(false);
  useEffect(() => {
    if (!fresh || flown.current) return;
    flown.current = true;
    if (e.feed === 'paid' && e.amountSek) flyTo('cash', ref.current, strings.money.plus(Math.round(e.amountSek).toLocaleString(numberLocale())), e.amountSek, { bg: 'var(--nx-ink)' });
  }, [fresh, e.feed, e.amountSek]);
  const warn = e.feed === 'warn';
  const color = e.feed === 'tip' ? 'var(--nx-accent-700)' : e.feed === 'ordered' ? 'var(--nx-ink-2)' : 'var(--nx-ink)';
  return (
    <div ref={ref} className="nx-feed-row" data-fresh={fresh} data-feed={e.feed ?? 'text'} data-testid="feed-row">
      <span className="nx-feed-time">{e.at >= periodStartAt ? clockAt(e.at, periodStartAt) : ''}</span>
      <span className="nx-feed-icon" style={{ color: warn ? 'var(--nx-accent-700)' : 'var(--nx-ink-2)' }}><Icon feed={e.feed} /></span>
      <span className="nx-feed-text" style={{ color: warn ? 'var(--nx-accent-700)' : undefined, fontWeight: warn ? 700 : undefined }}>{e.text}</span>
      {amounts && <span className="nx-feed-amount" style={{ color, fontWeight: e.feed === 'ordered' ? 400 : 800 }}>{amountText(e)}</span>}
    </div>
  );
}

function CountedSek({ value, testId }: { value: number; testId: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const c = useRef<Counter | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!c.current) { c.current = { value, shown: value, paint: (v) => { el.textContent = formatSek(v); } }; c.current.paint(value); return; }
    if (value !== c.current.value) countTo(c.current, value, { ticks: 6, pop: el });
  }, [value]);
  return <span ref={ref} className="nx-num" data-testid={testId} data-value={Math.round(value)} />;
}

export function EventsPanel({ mode = 'both' }: { mode?: 'both' | 'feed' | 'back' } = {}) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const seen = useRef<EventStreamEntry | null>(null);
  const inService = sim.day.period === 'dinner' || sim.day.period === 'lunch';
  const entries = inService ? sim.eventStream.filter((e) => e.at >= sim.day.periodStartAt).slice(-ROWS).reverse() : [];
  const newest = entries[0] ?? null;
  // Rader som kommit sedan förra renderingen glider in.
  const lastSeen = seen.current;
  useEffect(() => { seen.current = newest; }, [newest]);
  const drawer = useServiceDrawer();
  if (!inService || sim.incidents?.active) return null;
  const t = strings.feed;
  // Första renderingen och rader som redan glidit ur listan är inte nya.
  const freshUntil = lastSeen ? Math.max(0, entries.indexOf(lastSeen)) : 0;
  const paid = Math.round(sim.serviceRevenueToday.dinner * SERVICE_STREAM.sekPerKsek);
  const tabs = sim.guests.filter((g) => g.order && g.order.revenueSek > 0 && (g.state === 'dining' || g.state === 'serving'));
  const tabTables = new Set(tabs.map((g) => g.seatIndex === null ? g.id : Math.floor(g.seatIndex / INCIDENTS.seatsPerTable)));
  const tabSek = tabs.reduce((a, g) => a + (g.order?.revenueSek ?? 0), 0);
  const backsLeft = BACK.maxPerEvening - (sim.incidents?.betsTonight ?? 0);
  // ORDER 290 — serviceläget: ihopfällt visas bara Back your knowledge.
  // ORDER 290 — Kvällen (fliken) visar strömmen; Back your knowledge står
  // kvar nere till höger när panelen är stängd.
  const open = mode === 'feed' || (mode === 'both' && panelOpen(drawer, 'stream'));
  const showBack = mode !== 'feed';
  return (
    <section className="nx nx-panel nx-feed" data-testid={mode === "feed" ? "service-feed" : "event-stream"} data-open={open} data-mode={mode} aria-label={t.title}>
      {open && <header className="nx-feed-head">
        <NxLabel>{t.title}</NxLabel>
        <button type="button" className="nx-btn nx-btn-quiet nx-feed-amounts" data-testid="feed-amounts" aria-pressed={drawer.amounts} onClick={() => setServiceAmounts(!drawer.amounts)}>
          {drawer.amounts ? strings.drawer.amountsOff : strings.drawer.amountsOn}
        </button>
      </header>}
      {open && <div className="nx-feed-rows" aria-live="polite">
        {entries.map((e, i) => (
          <Row key={`${e.at.toFixed(3)}-${e.kind}-${e.text}`} e={e} fresh={i < freshUntil} periodStartAt={sim.day.periodStartAt} amounts={drawer.amounts} />
        ))}
      </div>}
      {open && drawer.amounts && <div className="nx-feed-tonight" data-testid="feed-tonight">
        <div className="nx-label">{t.tonight}</div>
        <div className="nx-feed-tonight-row"><span>{t.tonightPaid}</span><CountedSek value={paid} testId="tonight-paid" /></div>
        <div className="nx-feed-tonight-row" style={{ color: 'var(--nx-accent-700)' }}><span>{t.tonightTips}</span><CountedSek value={sim.day.tipsSek ?? 0} testId="tonight-tips" /></div>
        <div className="nx-feed-tonight-row"><span>{t.tonightTabs}</span><strong data-testid="tonight-tabs">{tabs.length > 0 ? t.tonightTabsValue(tabTables.size, formatSek(tabSek)) : t.tonightTabsNone}</strong></div>
      </div>}
      {showBack && <div className="nx-feed-back">
        <div style={{ minWidth: 0 }}>
          <div className="nx-label nx-accent-text">{strings.back.title}</div>
          {/* ORDER 289 — när knappen är grå står skälet här, bredvid den. */}
          <div className="nx-small nx-muted" data-testid="back-why" id="back-why">{whyNotBack(sim) === 'notOpen' && beforeDoors(sim) ? strings.back.why.notOpenAt(clockText(doorsOpenMinutes(sim))) : whyNotBack(sim) ? strings.back.why[whyNotBack(sim)!] : backsLeft > 0 ? strings.back.left(backsLeft) : strings.back.none}</div>
          {/* ORDER 284 — introduktionen före kvällens första raket (flyttad från kortet). */}
          {open && (sim.incidents?.betsTonight ?? 0) === 0 && (
            <p className="nx-small" data-testid="incident-back-intro" style={{ margin: 'calc(6 * var(--nx-u)) 0 0' }}>
              <strong>{strings.back.introTitle}</strong> {strings.back.introBody}
            </p>
          )}
          {/* ORDER 284 — räcker krediterna bara till en gissning: hur man tjänar nya. */}
          {open && totalCredits(sim) < BACK.confidence[1].loss && <div className="nx-small" data-testid="back-earn" style={{ marginTop: 'calc(6 * var(--nx-u))' }}>{strings.back.earn}</div>}
        </div>
        {/* Provspel av 285: en grå knapp säger varför. */}
        <NxButton testId="back-start" disabled={!canStartBack(sim)} onClick={() => dispatch({ type: 'START_BACK' })}>{strings.back.start}</NxButton>
      </div>}
    </section>
  );
}
