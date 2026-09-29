// ORDER 280 — sopbilen enligt Designs S1 (leveransen kassan och kvällen).
//
// Första skärmen på kvällen, efter stängningen, med kvällens riktiga svinn
// (stockPackages.ts wasteAtDayEnd, satt när servicen stängde). Bilen rullar
// in från höger på 1,4 s. Fyra fraktioner läggs fram med popIn, 0,65 s
// isär. Svinnets värde räknas upp i svinnrutan (betalt redan i morse, dras
// inte igen). Miljöavgiften räknas upp i 14 steg och flyger till kassan
// 1,3 s senare; först då räknas kassan i HUD:en ner (CashCounter håller
// avgiften tills dess). Rådet visas sist på bläckgrund.

import { useEffect, useRef } from 'react';
import { strings } from '../../content/strings';
import { WASTE } from '../../sim/balance';
import { findDish } from '../simulation/m4Catalogue';
import type { SimulationState } from '../types';
import { NxButton, NxLabel, NxScreen, u } from '../ui/system/components';
import { formatSek, wasteHoldKey } from '../ui/CashCounter';
import { countTo, popIn, type Counter } from '../ui/juice/juice';
import { flyTo, release } from '../ui/juice/fx';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useLanguage } from '../../content/language';
import '../ui/service/service.css';

const FRACTION_GAP_MS = 650;
const TRUCK_MS = 1400;
const FEE_FLY_DELAY_MS = 1300;

export function WasteScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const w = sim.lastWaste!;
  const t = strings.wasteScreen;
  const still = usePrefersReducedMotion();
  const locale = useLanguage() === 'sv' ? 'sv-SE' : 'en-GB';
  const rowsRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const feeRef = useRef<HTMLSpanElement>(null);
  const feeBox = useRef<HTMLDivElement>(null);
  const key = wasteHoldKey(sim);
  useEffect(() => {
    const timers: number[] = [];
    const rows = rowsRef.current?.querySelectorAll('[data-fraction]') ?? [];
    rows.forEach((el, i) => popIn(el, still ? 0 : TRUCK_MS + i * FRACTION_GAP_MS));
    const afterRows = still ? 0 : TRUCK_MS + rows.length * FRACTION_GAP_MS;
    const value: Counter = { value: 0, shown: 0, paint: (v) => { if (valueRef.current) valueRef.current.textContent = formatSek(v); } };
    const fee: Counter = { value: 0, shown: 0, paint: (v) => { if (feeRef.current) feeRef.current.textContent = formatSek(v); } };
    value.paint(0);
    fee.paint(0);
    timers.push(window.setTimeout(() => countTo(value, w.sek, { ticks: 12, pop: valueRef.current }), afterRows));
    timers.push(window.setTimeout(() => countTo(fee, w.feeSek ?? 0, { ticks: 14, pop: feeRef.current, big: true }), afterRows + 400));
    timers.push(window.setTimeout(() => {
      if (!key) return;
      flyTo('cash', feeBox.current, strings.money.minus(Math.round(w.feeSek ?? 0).toLocaleString('en-GB')), 0, { bg: 'var(--nx-accent)' });
      // Lappen tar Designs 900 ms; kassan släpps när den landat.
      timers.push(window.setTimeout(() => release(key), still ? 0 : 900));
    }, afterRows + 400 + FEE_FLY_DELAY_MS));
    return () => timers.forEach((x) => window.clearTimeout(x));
    // Skärmen spelas en gång per kväll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.dayNumber]);
  const leave = () => { if (key) release(key); onContinue(); };
  const f = Object.fromEntries((w.fractions ?? []).map((x) => [x.key, x]));
  const detail = (k: string): string => {
    const x = f[k];
    if (!x) return '';
    if (k === 'unsold') return x.count > 0 ? t.unsoldDetail(x.count, w.kept ?? 0) : t.unsoldNone;
    if (k === 'plates') return t.platesDetail(x.count);
    if (k === 'glass') return t.glassDetail(x.count);
    return t.cardboardDetail;
  };
  const kg = (v: number) => t.kg(v.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
  const advice = w.advice;
  const perKg = strings.service.meters.sek(WASTE.feePerKg.toLocaleString(locale, { minimumFractionDigits: 2 }));
  return (
    <NxScreen testId="screen-S1" label={t.title} className="nx-waste-screen">
      <div className="nx-waste-grid">
        <section className="nx-panel nx-waste-main">
          <header className="nx-waste-head">
            <div>
              <div className="nx-label nx-accent-text">{t.kicker}</div>
              <h1 className="nx-display" style={{ margin: 0 }}>{t.title}</h1>
            </div>
          </header>
          <div className="nx-waste-truck" data-still={still}>
            <svg width={u(90)} height={u(70)} viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
              <path d="M1 2h13v11H1z" /><path d="M14 6h5l3 4v3h-8z" /><circle cx="5" cy="14.5" r="2" /><circle cx="18" cy="14.5" r="2" />
            </svg>
            <span className="nx-label">{t.hauler}</span>
          </div>
          <div className="nx-waste-table" ref={rowsRef}>
            <div className="nx-waste-row nx-label"><span>{t.colFraction}</span><span>{t.colWhat}</span><span>{t.colKg}</span><span>{t.colValue}</span></div>
            {(['unsold', 'plates', 'glass', 'cardboard'] as const).map((k) => (
              <div key={k} className="nx-waste-row" data-fraction={k} data-testid={`waste-${k}`} data-kg={f[k]?.kg ?? 0}>
                <strong>{t.fractions[k]}</strong>
                <span className="nx-muted">{detail(k)}</span>
                <strong>{kg(f[k]?.kg ?? 0)}</strong>
                <strong className={k === 'unsold' && (f[k]?.valueSek ?? 0) > 0 ? 'nx-accent-text' : undefined}>{k === 'unsold' && (f[k]?.valueSek ?? 0) > 0 ? formatSek(f[k]!.valueSek) : '—'}</strong>
              </div>
            ))}
            <div className="nx-waste-row nx-waste-total"><strong>{t.total}</strong><span /><span /><strong data-testid="waste-total-kg">{kg(w.kg ?? 0)}</strong></div>
          </div>
        </section>
        <aside className="nx-waste-side">
          <div className="nx-panel nx-waste-box">
            <NxLabel>{t.value}</NxLabel>
            <span ref={valueRef} className="nx-num" style={{ fontSize: u(64) }} data-testid="waste-value" data-value={w.sek} />
            <p className="nx-small nx-muted">{t.valueNote}</p>
          </div>
          <div ref={feeBox} className="nx-panel nx-waste-box" style={{ borderTop: 'calc(8 * var(--nx-u)) solid var(--nx-accent)' }}>
            <div className="nx-label nx-accent-text">{t.fee}</div>
            <span ref={feeRef} className="nx-num" style={{ fontSize: u(64) }} data-testid="waste-fee" data-value={w.feeSek ?? 0} />
            <p className="nx-small nx-muted">{t.feeLine((w.kg ?? 0).toLocaleString(locale, { maximumFractionDigits: 1 }), perKg, formatSek(WASTE.pickupFeeSek))}</p>
          </div>
          <div className="nx-waste-advice" data-testid="waste-advice">
            <div className="nx-label" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.adviceKicker}</div>
            <p style={{ margin: `${u(8)} 0 0`, fontSize: u(28), fontWeight: 800 }}>
              {advice ? t.advice(advice.fewer, (findDish(advice.dishId)?.name ?? advice.dishId).toLowerCase(), formatSek(advice.savesSek)) : t.adviceNone}
            </p>
          </div>
        </aside>
      </div>
      {/* ORDER 284 — knappen vidare står i en fot som syns också när skärmen
          är längre än fönstret (tredje provspelet), som på L1 och K1. */}
      <footer className="nx-evening-foot">
        <span />
        <div><NxButton testId="waste-continue" onClick={leave}>{t.continue}</NxButton></div>
      </footer>
    </NxScreen>
  );
}
