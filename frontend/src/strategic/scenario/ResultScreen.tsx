// ORDER 285 — kvällens resultat (R1), efter sopbilen och före lärdomen.
//
// Vision Owner 2026-09-29, tredje provspelet: "Efter kvällen visas tydligt
// vad man vann och förlorade: pengar, krediter, rykte, kunskap, erfarenhet,
// samt social, ekonomisk och ekologisk hållbarhet." Formen är Designs skärm
// 6 i leveransen 2026-09-29 (det varma designsystemet): kvällen som
// händelser i tidsordning till vänster, med de resurser varje händelse
// ändrade som polletter, och medaljongerna till höger. Uppgångar i guld,
// nedgångar streckade i grädde. Inga tabeller.
//
// Talen läses ur eveningResult.ts (eveningResult, eveningEvents).
// Hållbarheterna visas tills vidare som förändringen i poäng; nivåerna 0–10
// med förra kvällens nivå väntar på Vision Owners beslut om hur de räknas
// (ORDER_285_RAPPORT.md).

import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, BadgeCheck, BookOpen, Cake, Coins, GlassWater, GraduationCap, HeartHandshake, Leaf, Scale, Sparkles, Star, Trash2, Truck, Users, Wine } from 'lucide-react';
import { strings } from '../../content/strings';
import { useLanguage } from '../../content/language';
import { calendarFor } from '../../sim/calendar';
import { GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, SITTING, CLOCK } from '../../sim/balance';
import type { SimulationState } from '../types';
import { NxButton, NxScreen } from '../ui/system/components';
import { formatSek } from '../ui/CashCounter';
import { popIn } from '../ui/juice/juice';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { eveningEvents, eveningResult, type EveningEvent, type ResultRow } from '../simulation/eveningResult';
import '../ui/service/service.css';

const GAP_MS = 120;
const MPH = INCIDENTS.minutesPerHour;

const ICON: Record<ResultRow['key'] | 'waste', LucideIcon> = {
  money: Coins, credits: GraduationCap, reputation: Star, knowledge: BookOpen, experience: Sparkles,
  ecological: Leaf, economic: Scale, social: HeartHandshake, waste: Trash2
};

function eventIcon(e: EveningEvent): LucideIcon {
  if (e.kind === 'truck') return Truck;
  if (e.kind === 'chance') return e.id === 'chance_birthday' ? Cake : GlassWater;
  return e.steps && e.steps.cleared === e.steps.total ? BadgeCheck : Wine;
}

export function ResultScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const t = strings.result;
  const lang = useLanguage();
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB';
  const still = usePrefersReducedMotion();
  const rows = eveningResult(sim);
  const events = eveningEvents(sim);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (rootRef.current?.querySelectorAll('[data-pop]') ?? []).forEach((el, i) => popIn(el, still ? 0 : i * GAP_MS));
    // Skärmen spelas en gång per kväll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.day.dayNumber]);
  const num = (v: number, digits = 0) => Math.abs(v).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '±');
  const signedSek = (v: number) => `${sign(v)}${formatSek(Math.abs(v))}`;
  const kg = (v: number) => t.kg(v.toLocaleString(locale, { maximumFractionDigits: 1 }));
  const pct = (v: number) => v.toLocaleString(locale, { style: 'percent', maximumFractionDigits: 0 });
  const clock = (at: number) => {
    const doors = sim.day.doorsOpenAt ?? sim.day.periodStartAt;
    const min = at === Number.MAX_SAFE_INTEGER
      ? SITTING.serviceStartHour * MPH + CLOCK.cells * CLOCK.cellMinutes + CLOCK.pickupAfterCloseMinutes
      : SITTING.serviceStartHour * MPH + Math.floor(Math.max(0, at - doors) * GAME_MINUTES_PER_SIM_SECOND);
    return strings.clock.time(String(Math.floor(min / MPH)), String(min % MPH).padStart(INCIDENTS.clockDigits, '0'));
  };
  const value = (r: ResultRow): string => {
    switch (r.key) {
      case 'money': return signedSek(r.delta);
      case 'credits': case 'experience': return `${sign(r.delta)}${num(r.delta)}`;
      case 'reputation': case 'social': case 'ecological': return t.points(`${sign(r.delta)}${num(r.delta, 1)}`);
      case 'knowledge': return `${r.detail.cleared}/${r.detail.total}`;
      case 'economic': return pct(r.delta);
    }
  };
  const note = (r: ResultRow): string => {
    switch (r.key) {
      case 'money': return t.notes.money(formatSek(r.detail.revenue), formatSek(r.detail.cost));
      case 'credits': return t.notes.credits;
      case 'reputation': return t.notes.reputation;
      case 'knowledge': return t.notes.knowledge(r.detail.cleared, r.detail.total);
      case 'experience': return t.notes.experience(r.detail.served, r.detail.rockets);
      case 'social': return t.notes.social;
      case 'economic': return t.notes.economic(pct(r.detail.margin));
      case 'ecological': return t.notes.ecological(kg(r.detail.kg));
    }
  };
  // Polletterna: det en händelse ändrade.
  const chips = (e: EveningEvent) => {
    const out: { key: string; Icon: LucideIcon; text: string; down: boolean }[] = [];
    if (e.credits) out.push({ key: 'credits', Icon: GraduationCap, text: `${sign(e.credits)}${num(e.credits)}`, down: e.credits < 0 });
    if (e.reputation) out.push({ key: 'reputation', Icon: Star, text: `${sign(e.reputation)}${num(e.reputation, 1)}`, down: e.reputation < 0 });
    if (e.guestsIn) out.push({ key: 'guests', Icon: Users, text: `+${e.guestsIn}`, down: false });
    if (e.kg) out.push({ key: 'kg', Icon: Trash2, text: kg(e.kg), down: true });
    if (e.cashSek) out.push({ key: 'cash', Icon: Coins, text: signedSek(e.cashSek), down: e.cashSek < 0 });
    return out;
  };
  const line = (e: EveningEvent): string => {
    if (e.kind === 'truck') return t.truckLine(kg(e.kg ?? 0));
    if (e.kind === 'chance') return t.chance;
    return e.steps ? t.stepsOf(e.steps.cleared, e.steps.total) : '';
  };
  const wasteKg = rows.find((r) => r.key === 'ecological')!.detail.kg;
  const day = strings.calendar.weekdays[calendarFor(sim.day.dayNumber).weekday];
  return (
    <NxScreen testId="screen-R1" label={t.title} className="nx-result-screen">
      <div className="nx-result-grid" ref={rootRef}>
        <section className="nx-panel nx-result-stream" data-testid="result-events">
          <header className="nx-result-head">
            <div className="nx-label">{t.kicker(day)}</div>
            <h1 className="nx-heading" style={{ margin: 0 }}>{t.title}</h1>
            <div className="nx-small nx-muted">{t.stream}</div>
          </header>
          <ol className="nx-result-events">
            {events.length === 0 && <li className="nx-small nx-muted" style={{ padding: 'calc(20 * var(--nx-u)) calc(30 * var(--nx-u))' }}>{t.none}</li>}
            {events.map((e, i) => {
              const Icon = eventIcon(e);
              return (
                <li key={`${e.id}-${i}`} className="nx-result-event" data-testid="result-event" data-kind={e.kind} data-pop>
                  <span className="nx-result-icon" data-dim={e.kind === 'rocket' && e.steps ? e.steps.cleared < e.steps.total : false}><Icon size={22} strokeWidth={1.8} aria-hidden /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="nx-result-event-title">
                      <span className="nx-result-time">{e.clock ?? clock(e.at)}</span>
                      <span>{e.kind === 'truck' ? t.truck : e.title}</span>
                    </div>
                    <div className="nx-small nx-muted">{line(e)}</div>
                  </div>
                  <div className="nx-result-chips">
                    {chips(e).map((c) => (
                      <span key={c.key} className="nx-result-chip" data-down={c.down}><c.Icon size={14} strokeWidth={2} aria-hidden />{c.text}</span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <section className="nx-result-gains" aria-label={t.gains}>
          <div className="nx-label" style={{ marginBottom: 'calc(12 * var(--nx-u))' }}>{t.gains}</div>
          <div className="nx-result-medals">
            {rows.map((r) => {
              const Icon = ICON[r.key];
              const Arrow = r.tone === 'lost' ? ArrowDownRight : ArrowUpRight;
              return (
                <div key={r.key} className="nx-panel nx-result-medal" data-pop data-result-row data-testid={`result-${r.key}`} data-tone={r.tone} data-delta={r.delta}>
                  <div className="nx-result-medal-top">
                    <span className="nx-result-icon"><Icon size={22} strokeWidth={1.8} aria-hidden /></span>
                    {r.tone !== 'even' && <Arrow size={20} strokeWidth={2} aria-label={r.tone === 'won' ? t.won : t.lost} />}
                  </div>
                  <div className="nx-num nx-result-value">{value(r)}</div>
                  <div className="nx-result-medal-label">{t.rows[r.key]}</div>
                  <div className="nx-small nx-muted">{note(r)}</div>
                </div>
              );
            })}
            <div className="nx-panel nx-result-medal" data-pop data-testid="result-waste" data-tone={wasteKg > 0 ? 'lost' : 'even'}>
              <div className="nx-result-medal-top"><span className="nx-result-icon"><Trash2 size={22} strokeWidth={1.8} aria-hidden /></span></div>
              <div className="nx-num nx-result-value">{kg(wasteKg)}</div>
              <div className="nx-result-medal-label">{t.waste}</div>
              <div className="nx-small nx-muted">{t.wasteNote}</div>
            </div>
          </div>
          <div className="nx-result-foot">
            <NxButton testId="result-continue" onClick={onContinue}>{t.continue}</NxButton>
          </div>
        </section>
      </div>
    </NxScreen>
  );
}
