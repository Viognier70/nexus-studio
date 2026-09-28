// ORDER 270 (provspel 2026-09-27) — utan verksamhet och utan pengar.
//
// Vision Owner: "en tydlig ruta mitt på skärmen. Den enda vägen vidare är
// till Måltidens hus för att öva och göra prov, så att banken kan ge lån.
// Inga andra knappar." Rutan har en knapp: till Måltidens hus, eller till
// banken när bankens krav är uppfyllt (en hel vecka i Måltidens hus med
// minst ett prov, ORDER 268). Dagen slutar av sig själv när dagens
// schemaplatser är använda (reducer.ts CLOSE_VISIT).

import { strings } from '../../content/strings.sv';
import { NEW_START } from '../../sim/balance';
import { bankReadyAfterNoBusiness, isStrandedWithoutBusiness } from '../../sim/economy';
import { useSimState } from '../simulation/SimulationProvider';

const BACKDROP: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 120
};

const BOX: React.CSSProperties = {
  width: 'min(460px, 100%)',
  padding: '20px 22px',
  background: 'rgba(30, 22, 16, 0.97)',
  color: '#f5f0e0',
  border: '1px solid #d8b56a',
  borderRadius: 6,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  lineHeight: 1.45,
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  boxSizing: 'border-box',
  textAlign: 'center'
};

const BUTTON: React.CSSProperties = {
  marginTop: 16,
  padding: '12px 20px',
  minHeight: 48,
  background: '#5a4128',
  color: '#f5f0e0',
  border: '1px solid #d8b56a',
  borderRadius: 4,
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer'
};

export function useStrandedWithoutBusiness(): boolean {
  const sim = useSimState();
  return isStrandedWithoutBusiness(sim) && (sim.day.period === 'morning' || sim.day.period === 'afternoon');
}

export function NoBusinessBox({ onOpenHouse, onOpenBank, hidden }: { onOpenHouse: () => void; onOpenBank: () => void; hidden: boolean }) {
  const sim = useSimState();
  const stranded = useStrandedWithoutBusiness();
  if (!stranded || hidden) return null;
  const t = strings.economy.stranded;
  const w = sim.economy.withoutBusiness!;
  const days = Math.min(NEW_START.daysWithoutBusiness, sim.day.dayNumber - w.sinceDay);
  const ready = bankReadyAfterNoBusiness(sim);
  return (
    <div style={BACKDROP}>
      <div style={BOX} role="dialog" aria-modal="true" aria-labelledby="stranded-heading" data-testid="no-business-box" data-ready={ready}>
        <div id="stranded-heading" style={{ fontSize: 18, fontWeight: 600 }}>{t.heading}</div>
        <p style={{ margin: '10px 0 0' }}>{ready ? t.readyBody : t.body}</p>
        {!ready && (
          <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: 13 }} data-testid="no-business-progress">
            {t.progress(days, NEW_START.daysWithoutBusiness, w.examsTaken, NEW_START.examsRequired)}
          </p>
        )}
        {ready ? (
          <button type="button" style={BUTTON} data-testid="stranded-open-bank" onClick={onOpenBank} autoFocus>
            {t.toBank}
          </button>
        ) : (
          <button type="button" style={BUTTON} data-testid="stranded-open-house" onClick={onOpenHouse} autoFocus>
            {t.toHouse}
          </button>
        )}
      </div>
    </div>
  );
}
