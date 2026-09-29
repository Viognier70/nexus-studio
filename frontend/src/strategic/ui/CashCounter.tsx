// ORDER 277 — kassan syns hela tiden och räknas ner animerat vid varje
// inköp (Vision Owner 2026-09-28, andra provspelet).
// ORDER 280 — Designs leverans kassan och kvällen (K1, B1): kassan och
// krediterna står som två rutor i HUD:ens högra del, bredvid fartknapparna.
// Siffrorna räknas i steg med Designs juice.ts (countTo: bump per steg,
// slam på sista), inte mjukt, och skrivs med textContent i en span som
// React inte äger, så att HUD:en inte renderas om vid varje steg. En lapp
// som flyger hit (ui/juice/fx.ts) räknas först när den har landat.
// Krediterna har accentkant upptill. Lugn och reduced motion skalar
// utslagen och stänger av skaket (juice.ts).

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { strings } from '../../content/strings';
import { useSimState } from '../simulation/SimulationProvider';
import { isStrandedWithoutBusiness } from '../../sim/economy';
import { totalCredits } from '../../sim/incidents';
import { countTo, type Counter } from './juice/juice';
import { isReleased, pendingFor, registerTarget, subscribeFx, type FxTarget } from './juice/fx';
import './juice/juice.css';
import './system/system.css';

export const formatSek = (v: number): string => strings.service.meters.sek(Math.round(v).toLocaleString('en-GB'));

// Små steg (kvällens kostnad per tick) målas direkt; större förändringar
// räknas i steg.
const STEP_FROM: Record<FxTarget, number> = { cash: 20, credits: 1 };

function useCountedNumber(id: FxTarget, value: number, format: (v: number) => string, ticks: { up: number; down: number }, held = 0) {
  const pend = useSyncExternalStore(subscribeFx, () => pendingFor(id), () => 0);
  const target = Math.round(value - pend + held);
  const numRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const counter = useRef<Counter | null>(null);
  useEffect(() => {
    registerTarget(id, boxRef.current);
    return () => registerTarget(id, null);
  }, [id]);
  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    if (!counter.current) {
      counter.current = { value: target, shown: target, paint: (v) => { el.textContent = format(v); el.dataset.shown = String(v); } };
      counter.current.paint(target);
      return;
    }
    const c = counter.current;
    const change = target - c.value;
    if (change === 0) return;
    if (Math.abs(change) < STEP_FROM[id]) {
      c.value = target;
      c.shown = target;
      c.paint(target);
      return;
    }
    const down = change < 0;
    countTo(c, target, {
      ticks: down ? ticks.down : ticks.up,
      pop: el,
      box: boxRef.current,
      flashColor: down ? 'rgba(244,230,204,.18)' : 'rgba(232,185,58,.28)'
    });
  }, [target, format, id, ticks.up, ticks.down]);
  return { numRef, boxRef };
}

const CASH_TICKS = { up: 8, down: 9 };
const CREDIT_TICKS = { up: 12, down: 8 };
const plain = (v: number) => String(v);

export function CashCounter() {
  const sim = useSimState();
  // Sopbilens avgift hålls utanför rutan tills lappen i S1 landat.
  const wasteKey = wasteHoldKey(sim);
  const releasedNow = useSyncExternalStore(subscribeFx, () => (wasteKey ? isReleased(wasteKey) : true), () => true);
  const heldFee = wasteKey && !releasedNow ? sim.lastWaste?.feeSek ?? 0 : 0;
  const cash = useCountedNumber('cash', sim.cash, formatSek, CASH_TICKS, heldFee);
  const creditsValue = totalCredits(sim);
  const credits = useCountedNumber('credits', creditsValue, plain, CREDIT_TICKS);
  const hidden = isStrandedWithoutBusiness(sim);
  const t = strings.cashCounter;
  return (
    <div className="nx nx-hud-money" data-hidden={hidden} style={{ display: hidden ? 'none' : 'flex', gap: 'calc(12 * var(--nx-u))', alignItems: 'stretch' }}>
      <div
        ref={cash.boxRef}
        className="nx-panel"
        role="status"
        aria-label={t.aria(formatSek(sim.cash))}
        data-testid="cash-counter"
        data-value={Math.round(sim.cash)}
        style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(14 * var(--nx-u))', padding: 'calc(14 * var(--nx-u)) calc(18 * var(--nx-u))', whiteSpace: 'nowrap' }}
      >
        <span className="nx-label">{t.label}</span>
        <span ref={cash.numRef} className="nx-num" data-testid="cash-counter-num" style={{ fontSize: 'calc(30 * var(--nx-u))', color: sim.cash < 0 ? 'var(--nx-accent-700)' : 'var(--nx-ink)' }} />
      </div>
      <div
        ref={credits.boxRef}
        className="nx-panel"
        role="status"
        aria-label={strings.back.creditsAria(creditsValue)}
        data-testid="credits-counter"
        data-value={creditsValue}
        style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(12 * var(--nx-u))', padding: 'calc(14 * var(--nx-u)) calc(18 * var(--nx-u))', borderTop: 'calc(6 * var(--nx-u)) solid var(--nx-accent)', whiteSpace: 'nowrap' }}
      >
        <span className="nx-label">{strings.back.credits}</span>
        <span ref={credits.numRef} className="nx-num" data-testid="credits-counter-num" style={{ fontSize: 'calc(30 * var(--nx-u))' }} />
      </div>
    </div>
  );
}

// ORDER 280 — nyckeln för kvällens sopbil: bara på kvällen samma dag som
// avräkningen, med en avgift.
export function wasteHoldKey(sim: { day: { period: string; dayNumber: number }; lastWaste?: { dayNumber: number; feeSek?: number } | null }): string | null {
  const w = sim.lastWaste;
  if (sim.day.period !== 'evening' || !w || w.dayNumber !== sim.day.dayNumber || !(w.feeSek && w.feeSek > 0)) return null;
  return `waste-${w.dayNumber}`;
}
