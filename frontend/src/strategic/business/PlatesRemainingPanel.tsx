// ORDER 077 §4 (M4) — in-room plates-remaining reading.
// ORDER 278 — lagret syns under servicen (Vision Owner 2026-09-28).
// ORDER 280 — lagret enligt Designs L1 (leveransen kassan och kvällen):
// köket räknar portioner och baren flaskor plus glas i den öppna flaskan.
// Varje rad har en stapel mot kvällens start och en status: I lager, Snart
// slut (accentgrund, accentstapel, ifylld etikett) och Slut (streckad
// etikett, genomstruken siffra, 55 % opacitet). Statusbytet ger en rad i
// händelseströmmen (stockPackages.ts warnStock) och en knuff på raden
// (1,03). Inget blinkar. Samma källa som gästernas beställning
// (stockPackages.ts stockRows).
//
// Kompakt i vänsterkanten under mise en place och ovanför mätarna, så att
// rummet syns. Under en egen raket (Back your knowledge) står raketen här.

import { useEffect, useRef } from 'react';
import { useSimState } from '../simulation/SimulationProvider';
import { stockRows, type StockRow } from '../simulation/stockPackages';
import { strings } from '../../content/strings';
import { NxLabel, u } from '../ui/system/components';
import { bump } from '../ui/juice/juice';
import '../ui/system/system.css';

function Row({ r }: { r: StockRow }) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(r.status);
  useEffect(() => {
    if (prev.current !== r.status) bump(ref.current, 1.03);
    prev.current = r.status;
  }, [r.status]);
  const t = strings.stockL1;
  const share = r.start > 0 ? Math.max(0, Math.min(1, r.left / r.start)) : 0;
  const out = r.status === 'out';
  const low = r.status === 'low';
  const amount = r.kind === 'dish' ? `${r.left} ${strings.morningBuy.unitPortion}` : r.beer ? `${r.left} ${strings.morningBuy.unitBottle}` : `${r.bottles} ${strings.morningBuy.unitBottle}${r.openGlasses ? ` + ${r.openGlasses}` : ''}`;
  return (
    <div ref={ref} data-testid={`service-stock-${r.id}`} data-left={r.left} data-status={r.status}
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: u(10), alignItems: 'center', padding: `${u(3)} ${u(6)}`, background: low ? 'var(--nx-accent-100, #fde7e2)' : undefined, opacity: out ? 0.55 : 1 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: u(17) }}>{r.name}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: u(8) }}>
        <strong className="nx-num" style={{ fontSize: u(17), textDecoration: out ? 'line-through' : undefined }}>{amount}</strong>
        <span aria-hidden style={{ width: u(60), height: u(8), border: '1px solid var(--nx-ink)', display: 'inline-block', position: 'relative' }}>
          <span style={{ position: 'absolute', inset: 0, width: `${share * 100}%`, background: low || out ? 'var(--nx-accent)' : 'var(--nx-ink)' }} />
        </span>
        <span className="nx-label" style={{
          fontSize: u(12), padding: `${u(2)} ${u(6)}`, minWidth: u(84), textAlign: 'center',
          background: low ? 'var(--nx-accent)' : undefined, color: low ? '#fff' : 'var(--nx-ink-2)',
          border: out ? '1px dashed var(--nx-ink)' : low ? '1px solid var(--nx-accent)' : '1px solid var(--nx-rule)'
        }}>{out ? t.out : low ? t.low : t.ok}</span>
      </span>
    </div>
  );
}

export function PlatesRemainingPanel() {
  const sim = useSimState();
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  if (!inService || sim.menu.length === 0 || sim.incidents?.active?.backed) return null;
  const t = strings.stockL1;
  const rows = stockRows(sim);
  const kitchen = rows.filter((r) => r.kind === 'dish');
  const bar = rows.filter((r) => r.kind === 'drink');
  return (
    <div className="nx nx-panel" role="region" aria-label={t.heading} data-testid="service-stock"
      style={{ position: 'absolute', top: u(476), left: u(72), width: u(560), maxHeight: u(316), overflowY: 'auto', padding: `${u(10)} ${u(14)}`, zIndex: 33, pointerEvents: 'auto' }}>
      <NxLabel>{t.kitchen}</NxLabel>
      <div style={{ marginTop: u(4) }}>{kitchen.map((r) => <Row key={r.id} r={r} />)}</div>
      {bar.length > 0 && (
        <>
          <div style={{ marginTop: u(8) }}><NxLabel>{t.bar}</NxLabel></div>
          <div style={{ marginTop: u(4) }}>{bar.map((r) => <Row key={r.id} r={r} />)}</div>
        </>
      )}
    </div>
  );
}
