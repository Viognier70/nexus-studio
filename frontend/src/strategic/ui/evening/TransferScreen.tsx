// ORDER 290 — skärmen efter servicen (Designs leverans serviceläget
// 2026-09-30 §4, skärm 5 och 6; Vision Owner: "Efter servicen visas
// täckningsbidrag, täckningsgrad och kvällens resultat. Resultatet förs till
// företagskontot, eller dras från det vid förlust. Det ska synas som en
// överföring. Prognos: Med det här konceptet klarar du dig {weeks} veckor").
//
// Pappret till vänster räknar uppifrån: försäljning, råvaror,
// täckningsbidrag, täckningsgrad, resten av insatsen och kvällens resultat.
// Panelen till höger är överföringen: stapeln en sista gång, kvällskassan och
// företagskontot. Knappen flyttar kvällskassan till kontot, och personal, DJ
// och kompetens dras i samma steg; kontot räknas upp (eller ned) och knappen
// byter till Till kvällens resultat. Förlust är aldrig rött.
//
// Talen läses ur day.transfer (eveningEconomy.ts eveningTransfer, satt när
// servicen stängde) och prognosen ur forecastWeeks.

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowRightLeft } from 'lucide-react';
import { t as tt } from '../../../content/nexusStrings';
import { strings } from '../../../content/strings';
import { useLanguage } from '../../../content/language';
import type { SimulationState } from '../../types';
import { NxButton, NxScreen } from '../system/components';
import { formatSek } from '../CashCounter';
import { countTo, popIn, type Counter } from '../juice/juice';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { forecastWeeks } from '../../simulation/eveningEconomy';
import { formatClock, clockMinutes } from '../../../sim/incidents';
import { play } from '../sound/sound';
import '../service/service.css';

const OVERSHOOT = 1.3;

export function TransferScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const tr = sim.day.transfer!;
  const lang = useLanguage();
  const still = usePrefersReducedMotion();
  const locale = lang === 'sv' ? 'sv-SE' : 'en-GB';
  const rootRef = useRef<HTMLDivElement>(null);
  const tillRef = useRef<HTMLSpanElement>(null);
  const accountRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState<string | null>(null);
  const weeks = forecastWeeks(sim);
  const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${formatSek(Math.abs(v))}`;
  const pct = (v: number) => `${(v * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const loss = tr.resultSek < 0;
  useEffect(() => {
    (rootRef.current?.querySelectorAll('[data-pop]') ?? []).forEach((el, i) => popIn(el, still ? 0 : i * 110));
    if (tillRef.current) tillRef.current.textContent = formatSek(tr.revenueSek);
    if (accountRef.current) accountRef.current.textContent = formatSek(tr.accountBeforeSek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tr.dayNumber]);
  const transfer = () => {
    if (done) return;
    setDone(formatClock(clockMinutes(sim)));
    const till: Counter = { value: tr.revenueSek, shown: tr.revenueSek, paint: (v) => { if (tillRef.current) tillRef.current.textContent = formatSek(v); } };
    const acc: Counter = { value: tr.accountBeforeSek, shown: tr.accountBeforeSek, paint: (v) => { if (accountRef.current) accountRef.current.textContent = formatSek(v); } };
    countTo(till, 0, { ticks: 10, pop: tillRef.current });
    countTo(acc, tr.accountAfterSek, { ticks: 12, pop: accountRef.current, big: true });
    play('pay');
  };
  const fill = tr.breakEvenSek > 0 ? Math.min(1, tr.revenueSek / (tr.breakEvenSek * OVERSHOOT)) : 0;
  const over = tr.breakEvenSek > 0 && tr.revenueSek >= tr.breakEvenSek;
  const restRows: { key: string; label: string; sub: string; sek: number }[] = [
    { key: 'staff', label: tt(lang, 'cost.staff'), sub: tt(lang, 'cost.staff.sub', { n: tr.staffOnShift }), sek: tr.rest.staff },
    { key: 'dj', label: tt(lang, 'cost.dj'), sub: tt(lang, 'cost.dj.sub'), sek: tr.rest.dj },
    { key: 'competence', label: tt(lang, 'cost.skills'), sub: tt(lang, 'cost.skills.sub'), sek: tr.rest.competence },
    { key: 'investments', label: strings.stake.lines.investments, sub: '', sek: tr.rest.investments }
  ].filter((r) => r.key === 'staff' || r.sek !== 0);
  return (
    <NxScreen testId="screen-T2" label={tt(lang, 'settle.title')} className="nx-transfer-screen">
      <div className="nx-settle" ref={rootRef}>
        <section className="nx-paper nx-settle-paper" data-testid="transfer-rows">
          <div className="nx-label">{tt(lang, 'settle.kicker')}</div>
          <h1 className="nx-heading nx-settle-title">{tt(lang, 'settle.title')}</h1>
          <div className="nx-settle-row" data-pop>
            <span className="nx-settle-sign" />
            <span><strong>{tt(lang, 'settle.sales')}</strong><span className="nx-small">{tt(lang, 'settle.sales.sub', { n: tr.bills })}</span></span>
            <span className="nx-num nx-settle-sek" data-testid="transfer-revenue" data-value={tr.revenueSek}>{formatSek(tr.revenueSek)}</span>
          </div>
          <div className="nx-settle-row" data-pop>
            <span className="nx-settle-sign">−</span>
            <span><strong>{tt(lang, 'settle.food')}</strong><span className="nx-small">{tt(lang, 'settle.food.sub')}</span></span>
            <span className="nx-num nx-settle-sek">{formatSek(tr.variableSek)}</span>
          </div>
          <div className="nx-settle-cm" data-pop>
            <div>
              <div className="nx-label">{tt(lang, 'settle.cm')}</div>
              <div className="nx-num nx-settle-big" data-testid="transfer-contribution" data-value={tr.contributionSek}>{formatSek(tr.contributionSek)}</div>
              <div className="nx-small">{tt(lang, 'settle.cm.sub')}</div>
            </div>
            <div>
              <div className="nx-label">{tt(lang, 'settle.cmr')}</div>
              <div className="nx-num nx-settle-big" data-testid="transfer-ratio" data-value={tr.contributionRatio}>{pct(tr.contributionRatio)}</div>
              <span className="nx-settle-ratio"><span style={{ width: `${Math.max(0, Math.min(1, tr.contributionRatio)) * 100}%` }} /></span>
              <div className="nx-small">{tt(lang, 'settle.cmr.sub', { n: Math.round(Math.max(0, tr.contributionRatio) * 100) })}</div>
            </div>
          </div>
          <div className="nx-label nx-settle-rest">{tt(lang, 'settle.rest')}</div>
          {restRows.map((r) => (
            <div key={r.key} className="nx-settle-row nx-settle-row-small" data-pop data-testid={`transfer-rest-${r.key}`} data-value={r.sek}>
              <span className="nx-settle-sign">−</span>
              <span><strong>{r.label}</strong> <span className="nx-small">{r.sub}</span></span>
              <span className="nx-num nx-settle-sek">{formatSek(r.sek)}</span>
            </div>
          ))}
          <div className="nx-settle-result" data-pop data-tone={loss ? 'lost' : 'won'}>
            <span><strong className="nx-heading">{tt(lang, 'settle.result')}</strong><span className="nx-small">{tt(lang, 'settle.result.sub')}</span></span>
            <span className="nx-num nx-settle-result-sek" data-testid="transfer-result" data-value={tr.resultSek}>{signed(tr.resultSek)}</span>
          </div>
        </section>
        <section className="nx-panel nx-settle-transfer" data-testid="transfer-move" data-value={tr.transferSek} data-done={!!done}>
          <div className="nx-label">{tt(lang, 'settle.transfer.kicker')}</div>
          <h2 className="nx-heading" style={{ margin: 0 }}>{tt(lang, 'settle.transfer.title')}</h2>
          <span className="nx-till-bar" data-over={over}>
            <span className="nx-till-fill" style={{ width: `${fill * 100}%` }} />
            {tr.breakEvenSek > 0 && <span className="nx-till-line" style={{ left: `${100 / OVERSHOOT}%` }} />}
          </span>
          {tr.passedAt && <div className="nx-small" style={{ fontWeight: 700 }} data-testid="transfer-passed">{tt(lang, 'serviceMode.passedAt', { time: tr.passedAt })}</div>}
          <div className="nx-settle-boxes">
            <div className="nx-settle-box">
              <div className="nx-label">{tt(lang, 'serviceMode.till')}</div>
              <span ref={tillRef} className="nx-num nx-settle-box-sek" data-testid="transfer-till" />
            </div>
            <ArrowRight size={22} aria-hidden className="nx-settle-arrow" />
            <div className="nx-settle-box" data-glow={!!done}>
              <div className="nx-label">{tt(lang, 'settle.account')}</div>
              <span ref={accountRef} className="nx-num nx-settle-box-sek" data-testid="transfer-account" data-value={tr.accountAfterSek} />
              {done && <span className="nx-small" style={{ fontWeight: 700 }} data-testid="transfer-vs-morning">{tt(lang, 'settle.vsMorning', { n: signed(tr.accountAfterSek - tr.accountMorningSek) })}</span>}
            </div>
          </div>
          <dl className="nx-settle-flow" data-done={!!done}>
            <div><dt>{tt(lang, 'settle.flow.in')}</dt><dd className="nx-num">{signed(tr.revenueSek)}</dd></div>
            <div><dt>{tt(lang, 'settle.flow.out')}</dt><dd className="nx-num">{signed(-tr.fixedSek)}</dd></div>
            <div><dt>{tt(lang, 'settle.flow.morning')}</dt><dd className="nx-num">{signed(-tr.variableSek)}</dd></div>
            <div className="nx-settle-flow-net"><dt>{tt(lang, 'settle.flow.net')}</dt><dd className="nx-num">{signed(tr.resultSek)}</dd></div>
          </dl>
          <p className="nx-small" style={{ margin: 0 }}>{loss ? tt(lang, 'settle.loss.note') : tt(lang, 'settle.transfer.note')}</p>
          <div className="nx-settle-mentor">
            <span className="nx-settle-avatar" aria-hidden>IM</span>
            <p style={{ margin: 0 }}>{tt(lang, 'settle.mentor')}</p>
          </div>
          <p className="nx-body nx-transfer-forecast" data-testid="transfer-forecast" data-weeks={weeks ?? 'season'}>{weeks === null ? strings.transfer.forecastSeason : strings.transfer.forecastWeeks(weeks)}</p>
          {done && <div className="nx-small" data-testid="transfer-done">{tt(lang, 'settle.transfer.done', { time: done })}</div>}
          {done ? (
            <NxButton testId="transfer-continue" onClick={onContinue}>{tt(lang, 'settle.next')}</NxButton>
          ) : (
            <button type="button" className="nx-btn nx-btn-primary nx-settle-do" data-testid="transfer-do" onClick={transfer}>
              <span>{tt(lang, 'settle.transfer.do', { n: formatSek(tr.revenueSek) })}</span>
              <ArrowRightLeft size={20} aria-hidden />
            </button>
          )}
        </section>
      </div>
    </NxScreen>
  );
}
