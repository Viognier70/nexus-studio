// ORDER 277 — kassan syns hela tiden och räknas ner animerat vid varje
// inköp (Vision Owner 2026-09-28, andra provspelet). Speldesign > Servicen >
// Lagret, och undantaget från princip 6 (kassan i kronor hela tiden).
//
// Överst i mitten, över morgonens schema och ovanför servicens klocka.
// Beloppet läses ur `state.cash`, samma källa som kassaboken. När kassan
// ändras räknas talet mot det nya beloppet under MORNING_STAKE.cashTickMs,
// och förändringen visas bredvid (röd nedåt, mörk uppåt). Med
// prefers-reduced-motion byts talet direkt.
//
// ORDER 279 — krediterna står bredvid kassan och tickar på samma sätt
// (insatsen: "Kassa och krediter tickar upp och ner med tydlig animation").

import { useEffect, useRef, useState } from 'react';
import { strings } from '../../content/strings';
import { MORNING_STAKE } from '../../sim/balance';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useSimState } from '../simulation/SimulationProvider';
import { isStrandedWithoutBusiness } from '../../sim/economy';
import { u } from './system/components';
import './system/system.css';

const DELTA_VISIBLE_MS = 1800;

// Ett tal som räknas mot sitt mål. Returnerar talet som visas och den
// senaste förändringen (null när den har visats klart).
export function useTickingNumber(target: number, ms: number = MORNING_STAKE.cashTickMs, deltaMin: number = MORNING_STAKE.cashDeltaMinSek): { shown: number; delta: number | null } {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(target);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  const shownRef = useRef(target);
  const prev = useRef(target);
  // Förändringen som visas: ett inköp, en betalning, en insats. Små steg
  // (dagens kostnad per tick) visas inte.
  useEffect(() => {
    const change = target - prev.current;
    prev.current = target;
    if (Math.abs(change) < deltaMin) return;
    setDelta((d) => ({ value: change, key: (d?.key ?? 0) + 1 }));
  }, [target, deltaMin]);
  useEffect(() => {
    if (!delta) return;
    const hide = window.setTimeout(() => setDelta(null), DELTA_VISIBLE_MS);
    return () => window.clearTimeout(hide);
  }, [delta]);
  useEffect(() => {
    const from = shownRef.current;
    if (reduced || from === target) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = from + (target - from) * eased;
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);
  return { shown, delta: delta?.value ?? null };
}

export const formatSek = (v: number): string => strings.service.meters.sek(Math.round(v).toLocaleString('en-GB'));

export function CashCounter() {
  const sim = useSimState();
  // Kassan ändras i små steg varje tick under servicen (kostnaden per
  // minut); talet följer i hela kronor.
  const target = Math.round(sim.cash);
  const { shown, delta } = useTickingNumber(target);
  // ORDER 279 — krediterna tickar bredvid kassan (insatsen).
  const creditsTarget = sim.knowledgeCredits.episteme + sim.knowledgeCredits.techne + sim.knowledgeCredits.phronesis;
  const credits = useTickingNumber(creditsTarget, MORNING_STAKE.cashTickMs, 1);
  if (isStrandedWithoutBusiness(sim)) return null;
  const t = strings.cashCounter;
  const signed = delta === null ? null : `${delta < 0 ? '−' : '+'}${formatSek(Math.abs(delta))}`;
  return (
    <div
      className="nx nx-panel"
      role="status"
      aria-label={t.aria(formatSek(target))}
      data-testid="cash-counter"
      data-value={target}
      data-shown={Math.round(shown)}
      style={{
        position: 'fixed',
        top: u(12),
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'baseline',
        gap: u(14),
        padding: `${u(8)} ${u(20)}`,
        zIndex: 45,
        pointerEvents: 'none',
        whiteSpace: 'nowrap'
      }}
    >
      <span className="nx-label">{t.label}</span>
      <span style={{ fontSize: u(34), fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: shown < 0 ? 'var(--nx-accent-700)' : 'var(--nx-ink)' }}>
        {formatSek(shown)}
      </span>
      {signed && (
        <span
          data-testid="cash-counter-delta"
          data-delta={delta ?? 0}
          style={{ fontSize: u(22), fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: (delta ?? 0) < 0 ? 'var(--nx-accent-700)' : 'var(--nx-ink)' }}
        >
          {signed}
        </span>
      )}
      <span className="nx-label" style={{ marginLeft: u(10) }}>{strings.bet.credits}</span>
      <span data-testid="credits-counter" data-value={creditsTarget} data-shown={Math.round(credits.shown)} aria-label={strings.bet.creditsAria(creditsTarget)}
        style={{ fontSize: u(34), fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(credits.shown)}
      </span>
      {credits.delta !== null && (
        <span data-testid="credits-counter-delta" data-delta={credits.delta}
          style={{ fontSize: u(22), fontWeight: 800, color: credits.delta < 0 ? 'var(--nx-accent-700)' : 'var(--nx-ink)' }}>
          {credits.delta < 0 ? '−' : '+'}{Math.abs(credits.delta)}
        </span>
      )}
    </div>
  );
}
