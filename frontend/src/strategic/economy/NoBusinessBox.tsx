// ORDER 270 (provspel 2026-09-27) — utan verksamhet och utan pengar.
//
// Vision Owner: "en tydlig ruta mitt på skärmen. Den enda vägen vidare är
// till Måltidens hus för att öva och göra prov, så att banken kan ge lån.
// Inga andra knappar." Rutan har en knapp: till Måltidens hus, eller till
// banken när bankens krav är uppfyllt (en hel vecka i Måltidens hus med
// minst ett prov, ORDER 268). Dagen slutar av sig själv när dagens
// schemaplatser är använda (reducer.ts CLOSE_VISIT).
//
// ORDER 271 — Designs paket 6, X1 (LEVERANSNOT §6): 760 px mitt på
// skärmen, rummet bakom svartvitt och dämpat (CSS-filter på canvasen så
// länge rutan står), en enda knapp, ingen stängningsruta, och Esc gör
// ingenting. Medaljerna sägs först ("tas aldrig ifrån dig"). Inget rött
// fält och inget "game over". Rutan gäller när kassan är under minsta
// insats (sim/economy.ts `isStrandedWithoutBusiness`, FRAGOR §50) och
// visas på morgonen och eftermiddagen, aldrig mitt i en kväll.

import { useEffect } from 'react';
import { strings } from '../../content/strings';
import { NEW_START } from '../../sim/balance';
import { bankReadyAfterNoBusiness, isStrandedWithoutBusiness } from '../../sim/economy';
import { NxButton, NxLabel } from '../ui/system/components';
import '../ui/service/service.css';
import { useSimState } from '../simulation/SimulationProvider';

// Rummet bakom rutan: svartvitt och dämpat.
const ROOM_FILTER = 'canvas { filter: grayscale(1) brightness(0.55); }';

export function useStrandedWithoutBusiness(): boolean {
  const sim = useSimState();
  return isStrandedWithoutBusiness(sim) && (sim.day.period === 'morning' || sim.day.period === 'afternoon');
}

function MedalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M7 3h10l-3 7h-4zM9.5 10 7 3M14.5 10 17 3" />
      <circle cx="12" cy="16" r="5" />
      <circle cx="12" cy="16" r="1.6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function NoBusinessBox({ onOpenHouse, onOpenBank, hidden }: { onOpenHouse: () => void; onOpenBank: () => void; hidden: boolean }) {
  const sim = useSimState();
  const stranded = useStrandedWithoutBusiness();
  const shown = stranded && !hidden;

  // Esc gör ingenting medan rutan står (ingen stängning, ingen kamerazoom).
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [shown]);

  if (!shown) return null;
  const t = strings.economy.stranded;
  const x = strings.rocket.stranded;
  const w = sim.economy.withoutBusiness!;
  const days = Math.min(NEW_START.daysWithoutBusiness, sim.day.dayNumber - w.sinceDay);
  const ready = bankReadyAfterNoBusiness(sim);
  return (
    <div className="nx nx-stranded-backdrop">
      <style>{ROOM_FILTER}</style>
      <div
        className="nx-stranded"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stranded-heading"
        data-testid="no-business-box"
        data-ready={ready}
      >
        <div data-testid="screen-X1">
          <NxLabel>{x.label}</NxLabel>
          <h2 id="stranded-heading" className="nx-heading">{t.heading}</h2>
          <ul className="nx-stranded-rows">
            <li data-testid="no-business-medals"><MedalIcon /><span>{x.medals}</span></li>
            {!ready && (
              <li data-testid="no-business-progress">
                <CalendarIcon />
                <span>{t.progress(days, NEW_START.daysWithoutBusiness, w.examsTaken, NEW_START.examsRequired)}</span>
              </li>
            )}
          </ul>
          <p className="nx-stranded-body">{ready ? t.readyBody : `${x.cashShort} ${t.body}`}</p>
          <div style={{ marginTop: 'calc(32 * var(--nx-u))' }}>
            {ready ? (
              <NxButton testId="stranded-open-bank" onClick={onOpenBank} autoFocus>{t.toBank}</NxButton>
            ) : (
              <NxButton testId="stranded-open-house" onClick={onOpenHouse} autoFocus>{x.toHouse}</NxButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
