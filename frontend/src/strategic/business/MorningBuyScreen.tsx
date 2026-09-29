// ORDER 280 — morgonens inköp enligt Designs M1 (leveransen kassan och
// kvällen; Vision Owner 2026-09-29: "Använd juice.ts och skärmarna M1–K1").
//
// Två spalter, Meny och Dryckeslista, och en högerspalt med dagens inköp,
// täckningen och knappen som öppnar dörrarna. Varje rad har [−] antal [+]
// i 56 px rutor. + köper ett parti (5 portioner eller 2 flaskor) och en
// lapp med beloppet flyger från knappen till kassan, som räknas ner först
// när lappen landat. − lämnar tillbaka ett parti till inköpspriset.
// Räcker inte kassan (med kreditramen, golvet) skakar kassarutan och
// ingenting köps; finns inget att lämna tillbaka skakar knappen.
// HUD:en (klockan, kassan, krediterna) ligger över skärmen.

import { useRef, useState } from 'react';
import { strings } from '../../content/strings';
import { creditLineSek } from '../../sim/economy';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { itemsCostSek, packageItems, packagesFor } from '../simulation/packages';
import { coverage, morningRows, spentTodaySek, stockValueSek, type DishRow, type DrinkRow } from '../simulation/morningBuy';
import { stockReadiness } from '../simulation/stockPackages';
import { NxButton, NxLabel, u } from '../ui/system/components';
import { formatSek } from '../ui/CashCounter';
import { shake } from '../ui/juice/juice';
import { flyTo, targetElement } from '../ui/juice/fx';
import '../ui/screens/screens.css';

const T = strings.morningBuy;
const BOX = u(52);

function Stepper({ id, qty, unit, name, onLess, onMore }: { id: string; qty: number; unit: string; name: string; onLess: (el: HTMLElement) => void; onMore: (el: HTMLElement) => void }) {
  const lessRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const btn: React.CSSProperties = { width: BOX, height: BOX, minWidth: 0, padding: 0, display: 'grid', placeItems: 'center', fontSize: u(28), fontWeight: 800, cursor: 'pointer' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: u(14) }}>
      <button ref={lessRef} type="button" className="nx-btn nx-btn-secondary" style={btn} aria-label={T.less(name)} data-testid={`buy-less-${id}`} onClick={() => lessRef.current && onLess(lessRef.current)}>
        <span>−</span>
      </button>
      <div style={{ textAlign: 'center', minWidth: u(52) }}>
        <div className="nx-num" style={{ fontSize: u(34), lineHeight: 1 }} data-testid={`buy-qty-${id}`}>{qty}</div>
        <div className="nx-label" style={{ fontSize: u(14) }}>{unit}</div>
      </div>
      <button ref={moreRef} type="button" className="nx-btn nx-btn-primary nxs-buy-more" style={{ ...btn, background: 'var(--nx-ink)', color: '#fff' }} aria-label={T.more(name)} data-testid={`buy-more-${id}`} onClick={() => moreRef.current && onMore(moreRef.current)}>
        <span>+</span>
      </button>
    </div>
  );
}

export function MorningBuyScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const [notice, setNotice] = useState<string | null>(null);
  if (!open || sim.day.period !== 'morning' || !packagesFor(sim.economy.businessClass)) return null;
  const { dishes, drinks } = morningRows(sim);
  const cov = coverage(sim);
  const spent = spentTodaySek(sim);
  const readiness = stockReadiness(sim);

  const buy = (items: Record<string, number>, from: HTMLElement) => {
    const cost = itemsCostSek(items);
    if (sim.cash - cost < -creditLineSek(sim)) {
      shake(targetElement('cash'), 12);
      setNotice(T.notEnough);
      return;
    }
    setNotice(null);
    dispatch({ type: 'BUY_ITEMS', items });
    flyTo('cash', from, strings.money.minus(Math.round(cost).toLocaleString('en-GB')), -cost, { bg: 'var(--nx-accent)' });
  };
  const giveBack = (items: Record<string, number>, have: number, from: HTMLElement) => {
    if (have <= 0) { shake(from, 6); return; }
    const refund = itemsCostSek(Object.fromEntries(Object.entries(items).map(([k, n]) => [k, Math.min(n, have)])));
    dispatch({ type: 'RETURN_ITEMS', items });
    flyTo('cash', from, strings.money.plus(Math.round(refund).toLocaleString('en-GB')), refund, { bg: 'var(--nx-ink)' });
  };
  const dishRow = (r: DishRow) => (
    <div key={r.dishId} className="nxs-buy-row" data-testid={`buy-row-${r.dishId}`}>
      <div style={{ minWidth: 0 }}>
        <div className="nxs-row-title">{r.name}</div>
        <div className="nxs-row-sub">{T.dishSub(formatSek(r.costSek), formatSek(r.priceSek))}</div>
      </div>
      <Stepper id={r.dishId} qty={r.portions} unit={T.unitPortion} name={r.name}
        onLess={(el) => giveBack(r.items, r.portions, el)} onMore={(el) => buy(r.items, el)} />
    </div>
  );
  const drinkRow = (r: DrinkRow) => (
    <div key={r.ingredientId} className="nxs-buy-row" data-testid={`buy-row-${r.ingredientId}`}>
      <div style={{ minWidth: 0 }}>
        <div className="nxs-row-title">{r.name}</div>
        <div className="nxs-row-sub">
          {r.beer ? T.beerSub(formatSek(r.costPerBottleSek), formatSek(r.glassPriceSek)) : T.wineSub(formatSek(r.costPerBottleSek), r.glassesPerBottle, formatSek(r.glassPriceSek))}
        </div>
      </div>
      <Stepper id={r.ingredientId} qty={r.bottles} unit={T.unitBottle} name={r.name}
        onLess={(el) => giveBack(r.items, r.bottles * r.glassesPerBottle + r.openGlasses, el)} onMore={(el) => buy(r.items, el)} />
    </div>
  );
  const portionsTotal = dishes.reduce((a, d) => a + d.portions, 0);
  const bottlesTotal = drinks.reduce((a, d) => a + d.bottles, 0);
  const base = packagesFor(sim.economy.businessClass)!.base;
  return (
    <div className="nx nx-screen nxs-buy" role="dialog" aria-label={T.phase} data-testid="screen-M1">
      <div className="nxs-buy-grid">
        <section className="nx-panel nxs-buy-col" data-testid="buy-menu">
          <header className="nxs-buy-head"><NxLabel>{T.menu}</NxLabel><span className="nxs-row-sub">{T.menuStep}</span></header>
          <div className="nxs-buy-rows">{dishes.map(dishRow)}</div>
          <footer className="nxs-buy-foot">{T.dishSum(portionsTotal, formatSek(stockValueSek(sim, 'food')))}</footer>
        </section>
        <section className="nx-panel nxs-buy-col" data-testid="buy-wine">
          <header className="nxs-buy-head"><NxLabel>{T.wine}</NxLabel><span className="nxs-row-sub">{T.wineStep}</span></header>
          <div className="nxs-buy-rows">{drinks.map(drinkRow)}</div>
          <footer className="nxs-buy-foot">{T.wineSum(bottlesTotal, formatSek(stockValueSek(sim, 'drink')))}</footer>
        </section>
        <aside className="nx-panel nxs-buy-side" data-testid="buy-side">
          <div className="nxs-buy-block">
            <NxLabel>{T.spent}</NxLabel>
            <div className="nx-num" style={{ fontSize: u(44) }} data-testid="buy-spent" data-value={spent}>{formatSek(spent)}</div>
          </div>
          <div className="nxs-buy-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <NxLabel>{T.mains}</NxLabel>
              <strong data-testid="buy-coverage" data-covers={cov.covers} data-guests={cov.guests}>{T.mainsCover(cov.covers, cov.guests)}</strong>
            </div>
            <div style={{ height: u(14), border: 'var(--nx-line) solid var(--nx-ink)', marginTop: u(10) }}>
              <div style={{ height: '100%', width: `${cov.share * 100}%`, background: cov.share < 1 ? 'var(--nx-accent)' : 'var(--nx-ink)' }} />
            </div>
            <div className="nxs-row-sub" style={{ marginTop: u(8) }}>{T.booked(cov.guests)}</div>
          </div>
          <div className="nxs-buy-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <NxLabel>{T.wineLabel}</NxLabel>
            <strong data-testid="buy-glasses">{T.wineCover(cov.glasses, cov.glassesPerGuest.toFixed(1))}</strong>
          </div>
          <div className="nxs-buy-block">
            <NxLabel>{T.potential}</NxLabel>
            <div className="nx-num" style={{ fontSize: u(30), marginTop: u(6) }}>{T.potentialIn(formatSek(cov.potentialSek))}</div>
            <div className="nxs-row-sub" style={{ marginTop: u(6) }}>{T.potentialNote}</div>
          </div>
          <div style={{ marginTop: 'auto', display: 'grid', gap: u(10) }}>
            {notice && <p className="nx-small nx-accent-text" style={{ fontWeight: 700 }} role="status" data-testid="buy-notice">{notice}</p>}
            {!readiness.ready && <p className="nx-small nx-accent-text" style={{ fontWeight: 700 }} data-testid="start-blocked-m1">{strings.stock.notReady(readiness.dishes, readiness.drinks)}</p>}
            <button type="button" className="nx-btn nx-btn-quiet" style={{ width: 'auto' }} data-testid="buy-base"
              onClick={(e) => buy(packageItems(base), e.currentTarget)}>
              <span>{T.base}</span>
            </button>
            <NxButton kind="secondary" testId="buy-back" onClick={onClose} arrow={false}>{T.back}</NxButton>
            <NxButton testId="open-doors" disabled={!readiness.ready} onClick={() => { onClose(); dispatch({ type: 'START_SERVICE' }); }}>{T.openDoors}</NxButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
