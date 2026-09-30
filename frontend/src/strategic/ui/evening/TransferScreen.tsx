// ORDER 290 — överföringen efter servicen (Vision Owner 2026-09-30): "Efter
// servicen visas täckningsbidrag, täckningsgrad och kvällens resultat.
// Resultatet förs till företagskontot, eller dras från det vid förlust. Det
// ska synas som en överföring. Prognos: Med det här konceptet klarar du dig
// {weeks} veckor."
//
// Talen läses ur day.transfer (eveningEconomy.ts eveningTransfer, satt när
// servicen stängde) och prognosen ur forecastWeeks. Kvällskassan står till
// vänster, företagskontot till höger; beloppet flyger mellan dem och kontot
// räknas från läget när dörrarna öppnade till läget efter kvällen.

import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { strings } from '../../../content/strings';
import { useLanguage } from '../../../content/language';
import type { SimulationState } from '../../types';
import { NxButton, NxLabel, NxScreen } from '../system/components';
import { formatSek } from '../CashCounter';
import { countTo, popIn, type Counter } from '../juice/juice';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { forecastWeeks } from '../../simulation/eveningEconomy';
import '../service/service.css';

const COUNT_DELAY_MS = 900;

export function TransferScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const tr = sim.day.transfer!;
  const t = strings.transfer;
  const still = usePrefersReducedMotion();
  const locale = useLanguage() === 'sv' ? 'sv-SE' : 'en-GB';
  const accountRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const weeks = forecastWeeks(sim);
  const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${formatSek(Math.abs(v))}`;
  const pct = (v: number) => v.toLocaleString(locale, { style: 'percent', maximumFractionDigits: 0 });
  useEffect(() => {
    (rootRef.current?.querySelectorAll('[data-pop]') ?? []).forEach((el, i) => popIn(el, still ? 0 : i * 140));
    const acc: Counter = { value: tr.accountBeforeSek, shown: tr.accountBeforeSek, paint: (v) => { if (accountRef.current) accountRef.current.textContent = formatSek(v); } };
    acc.paint(tr.accountBeforeSek);
    const timer = window.setTimeout(() => {
      noteRef.current?.setAttribute('data-flying', 'true');
      countTo(acc, tr.accountAfterSek, { ticks: 12, pop: accountRef.current, big: true });
    }, still ? 0 : COUNT_DELAY_MS);
    return () => window.clearTimeout(timer);
    // Skärmen spelas en gång per kväll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tr.dayNumber]);
  const up = tr.transferSek >= 0;
  return (
    <NxScreen testId="screen-T2" label={t.title} className="nx-transfer-screen">
      <div className="nx-panel nx-transfer" ref={rootRef}>
        <header className="nx-result-head">
          <NxLabel>{t.kicker}</NxLabel>
          <h1 className="nx-heading" style={{ margin: 0 }}>{t.title}</h1>
        </header>
        <div className="nx-transfer-body">
          <dl className="nx-transfer-rows" data-testid="transfer-rows">
            <div data-pop><dt>{t.revenue}</dt><dd className="nx-num" data-testid="transfer-revenue" data-value={tr.revenueSek}>{formatSek(tr.revenueSek)}</dd></div>
            <div data-pop><dt>{t.variable}</dt><dd className="nx-num">{signed(-tr.variableSek)}</dd></div>
            <div data-pop className="nx-transfer-sum"><dt>{t.contribution}</dt><dd className="nx-num" data-testid="transfer-contribution" data-value={tr.contributionSek}>{signed(tr.contributionSek)}</dd></div>
            <div data-pop><dt>{t.ratio}</dt><dd className="nx-num" data-testid="transfer-ratio" data-value={tr.contributionRatio}>{pct(tr.contributionRatio)}</dd></div>
            <div data-pop><dt>{t.fixed}</dt><dd className="nx-num">{signed(-tr.fixedSek)}</dd></div>
            <div data-pop className="nx-transfer-sum" data-tone={tr.resultSek >= 0 ? 'won' : 'lost'}><dt>{t.result}</dt><dd className="nx-num" data-testid="transfer-result" data-value={tr.resultSek}>{signed(tr.resultSek)}</dd></div>
          </dl>
          <div className="nx-transfer-move" data-testid="transfer-move" data-value={tr.transferSek}>
            <div className="nx-transfer-box">
              <NxLabel>{t.till}</NxLabel>
              <span className="nx-num nx-transfer-big">{formatSek(tr.revenueSek)}</span>
              <span className="nx-small nx-muted">{t.breakEven(formatSek(tr.breakEvenSek))}</span>
            </div>
            <div className="nx-transfer-note" ref={noteRef} data-up={up}>
              <span className="nx-num">{signed(tr.transferSek)}</span>
              <ArrowRight size={22} aria-hidden />
            </div>
            <div className="nx-transfer-box">
              <NxLabel>{t.account}</NxLabel>
              <span ref={accountRef} className="nx-num nx-transfer-big" data-testid="transfer-account" data-value={tr.accountAfterSek} />
              <span className="nx-small nx-muted">{up ? t.toAccount : t.fromAccount}</span>
            </div>
          </div>
          <p className="nx-small nx-muted" style={{ margin: 0 }}>{t.morningNote}</p>
          <p className="nx-body nx-transfer-forecast" data-testid="transfer-forecast" data-weeks={weeks ?? 'season'}>{weeks === null ? t.forecastSeason : t.forecastWeeks(weeks)}</p>
        </div>
        <div className="nx-result-foot">
          <NxButton testId="transfer-continue" onClick={onContinue}>{t.continue}</NxButton>
        </div>
      </div>
    </NxScreen>
  );
}
