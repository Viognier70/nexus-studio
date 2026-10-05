// ORDER 303 C — "Recensioner i morse": gårdagens kväll som byn såg den, hur
// ryktet ändrades och varför (sim/morningReview.ts).
//
// ORDER 309 — Designs D5 (morningReviews.ts REVIEW_CARD) ersätter raden:
// ett kort i tidningspapper över morgonens rum, före inköpen. Överst ryktet
// före och efter med en stapel som visar båda lägena; sedan högst fyra rader,
// den största ändringen först, var och en med en bricka (Ryktet −4 i valnöt
// med pil ned, Ryktet +3 i papper med pil upp), citatet i Young Serif och vem
// som säger det och varför. Inget grönt eller rött. Kortet kommer 600 ms
// efter morgonen och raderna en i taget med 180 ms emellan (stilla med
// reducerad rörelse). Till inköpen, Enter eller ett klick utanför går vidare;
// i morgonens högerspalt står sedan en liten rad som öppnar kortet igen.

import { useEffect, useState, useSyncExternalStore } from 'react';
import './foljder.css';
import { ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import { strings } from '../../content/strings';
import type { MorningReview, ReviewEntry } from '../../sim/morningReview';
import { REVIEW_CARD } from './morningReviews';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useSimState } from '../simulation/SimulationProvider';
import { SIM_ROLE_TO_STAFF } from '../scene/wineBarDirector';
import { ROLE_OF } from '../scene/staffMarks';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import type { StaffRole } from '../types';
import { packagesFor } from '../simulation/packages';

export function morningReviewText(r: MorningReview): string {
  const t = strings.reviews;
  const parts: string[] = [];
  if (r.wrongTables > 0) parts.push(t.wrong(r.wrongTables, r.wrongTitles.join(', ')));
  if (r.rightTables > 0) parts.push(t.right(r.rightTables, r.rightTitles.join(', ')));
  const rest = r.change - r.fromAnswers;
  if (rest !== 0) parts.push(t.guests(rest));
  if (parts.length === 0) parts.push(t.quiet);
  const body = parts.join(', ');
  return `${t.change(r.change)}: ${body.charAt(0).toLowerCase()}${body.slice(1)}.`;
}

// ----- vilken morgon kortet är stängt för (delas av kortet och raden) -----
let closedDay: number | null = null;
const subs = new Set<() => void>();
const getClosed = () => closedDay;
function setClosed(day: number | null): void {
  closedDay = day;
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Citatet för raden (stabilt för samma kväll och rad). */
export function reviewQuote(e: ReviewEntry): string {
  const pool = strings.foljder.review.quote;
  const key = e.kind === 'rest' ? (e.delta >= 0 ? 'restUp' : 'restDown') : e.kind;
  const list = pool[key] ?? pool.quiet;
  return list[e.seed % list.length];
}

/** Skälet för raden. */
export function reviewReason(e: ReviewEntry, staffName: (role: string) => string): string {
  const r = strings.foljder.review.reason;
  const titles = e.titles.join(', ');
  switch (e.kind) {
    case 'wrong': return r.wrong(e.tables, titles);
    case 'grave': return r.grave(e.tables, titles);
    case 'cleared': return r.cleared(e.tables, titles);
    case 'staff': {
      const names = (e.staff ?? []).map(staffName);
      const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} ${strings.foljder.review.and} ${names[names.length - 1]}` : names[0] ?? '';
      return r.staff(joined);
    }
    case 'quiet': return r.quiet;
    default: return r.rest;
  }
}

function useStaffName(): (role: string) => string {
  const lang = useLanguage();
  return (role: string) => {
    const key = SIM_ROLE_TO_STAFF[role as StaffRole];
    return (key && strings.foljder.staffName[key]) || tt(lang, `ring.role.${key ? ROLE_OF[key] : 'waiter'}` as StringKey);
  };
}

function Delta({ n }: { n: number }) {
  const r = strings.foljder.review;
  const up = n >= 0;
  const st = up ? REVIEW_CARD.up : REVIEW_CARD.down;
  return (
    <span className="nx-review-badge" data-dir={n > 0 ? 'up' : n < 0 ? 'down' : 'even'} style={{ background: st.bg, color: st.fg, border: st.border }}>
      {n > 0 ? <ArrowUp size={14} aria-hidden /> : n < 0 ? <ArrowDown size={14} aria-hidden /> : null}
      {n > 0 ? r.up(n) : n < 0 ? r.down(-n) : r.even}
    </span>
  );
}

/** Kortet i tidningspapper. Monteras i StrategicApp (över morgonens rum). */
export function MorningReviewCard({ onOpenBuy }: { onOpenBuy?: () => void }) {
  const sim = useSimState();
  const review = sim.day.period === 'morning' ? sim.day.morningReview ?? null : null;
  const closed = useSyncExternalStore(subscribe, getClosed, getClosed);
  const reduced = usePrefersReducedMotion();
  const staffName = useStaffName();
  const day = review?.dayNumber ?? null;
  const open = !!review && closed !== day;
  // Kortet kommer REVIEW_CARD.motion.inMs efter morgonen.
  const [shownDay, setShownDay] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    if (reduced) { setShownDay(day); return; }
    const id = window.setTimeout(() => setShownDay(day), REVIEW_CARD.motion.inMs);
    return () => window.clearTimeout(id);
  }, [open, day, reduced]);
  const visible = open && shownDay === day;
  const canBuy = !!packagesFor(sim.economy.businessClass);
  const close = (toBuy: boolean) => { setClosed(day); if (toBuy && canBuy) onOpenBuy?.(); };
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); close(true); }
      else if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, day]);
  if (!visible || !review) return null;
  const r = strings.foljder.review;
  const lines = review.lines ?? [];
  const from = review.from ?? null;
  const to = review.to ?? null;
  const tier = review.tier ? strings.shopTabs.tier[review.tier] ?? null : null;
  return (
    <div className="nx-review-backdrop" data-testid="morning-review-backdrop" onClick={() => close(false)}>
      <section
        className="nx-review-card"
        data-testid="morning-review"
        data-change={review.change}
        data-lines={lines.length}
        data-reduced={reduced}
        aria-label={r.kicker}
        style={{ background: REVIEW_CARD.paper, color: REVIEW_CARD.ink }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nx-review-head">
          <div>
            <div className="nx-review-kicker" style={{ color: REVIEW_CARD.kicker }}>{r.kicker}</div>
            <h2 className="nx-review-title">{r.title}</h2>
          </div>
          {from !== null && to !== null && (
            <div className="nx-review-rep" data-testid="morning-review-rep" data-from={from} data-to={to}>
              <div className="nx-review-kicker" style={{ color: REVIEW_CARD.kicker }}>{tier ? r.classLine(tier) : r.rep}</div>
              <div className="nx-review-nums"><span className="nx-review-from">{from}</span><ArrowRight size={16} aria-hidden /><span className="nx-review-to">{to}</span></div>
              <div className="nx-review-bar" style={{ background: REVIEW_CARD.summary.bar }} aria-hidden>
                <span style={{ width: `${Math.max(from, to)}%`, background: from > to ? REVIEW_CARD.summary.before : REVIEW_CARD.summary.after }} />
                <span style={{ width: `${Math.min(from, to)}%`, background: REVIEW_CARD.summary.after }} />
              </div>
            </div>
          )}
        </header>
        <ol className="nx-review-lines">
          {lines.map((l, i) => (
            <li
              key={`${l.kind}:${i}`}
              className="nx-review-line"
              data-testid="morning-review-line"
              data-kind={l.kind}
              data-delta={l.delta}
              data-voice={l.voice}
              style={reduced ? undefined : { animationDelay: `${i * REVIEW_CARD.motion.perLineMs}ms` }}
            >
              <Delta n={l.delta} />
              <div>
                <p className="nx-review-quote">{reviewQuote(l)}</p>
                <p className="nx-review-who" style={{ color: REVIEW_CARD.muted }}><strong style={{ color: REVIEW_CARD.ink }}>{r.voice[l.voice]}</strong> · {reviewReason(l, staffName)}</p>
              </div>
            </li>
          ))}
        </ol>
        <footer className="nx-review-foot">
          <button type="button" className="nx-review-next" data-testid="morning-review-next" onClick={() => close(true)}>
            <span>{r.next}</span><ArrowRight size={18} aria-hidden />
          </button>
        </footer>
      </section>
    </div>
  );
}

/** Raden i morgonens högerspalt när kortet är stängt: öppnar det igen. */
export function MorningReviewLine({ review }: { review: MorningReview | null | undefined }) {
  const closed = useSyncExternalStore(subscribe, getClosed, getClosed);
  if (!review || closed !== review.dayNumber) return null;
  const r = strings.foljder.review;
  return (
    <button type="button" className="nx-review-reopen" data-testid="morning-review-reopen" data-change={review.change} onClick={() => setClosed(null)} title={morningReviewText(review)}>
      <span className="nx-review-kicker">{r.kicker}</span>
      <Delta n={review.change} />
    </button>
  );
}
