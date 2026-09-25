// ORDER 267 (Nexus v1 etapp 5) — söndagstidningen.
//
// Veckoavräkningen som söndagsnumret av en lokaltidning i Grythyttan
// (sim/newspaper.ts). Öppnas av sig själv söndag morgon efter varje
// avräkning och kan läsas igen från morgonraden.
//
// PLACEHOLDER_DESIGN — tidningens utseende (designspecifikationen,
// "Söndagstidningen") finns inte i Designs leveranser. Tills dess är det
// en enkel spalt med rubriker.

import { useEffect, useState } from 'react';
import { strings } from '../../content/strings.sv';
import { calendarFor } from '../../sim/calendar';
import { newspaperFor } from '../../sim/newspaper';
import { requirementsFor } from '../../sim/economy';
import { useBusiness } from '../business/BusinessContext';
import { useSimState } from '../simulation/SimulationProvider';
import { missingInWords, settlementInWords } from './BankDialog';

const t = strings.newspaper;

const BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 150
};
const PAPER: React.CSSProperties = {
  width: 'min(560px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '18px 22px',
  background: '#f3eddc', color: '#2c241c', border: '1px solid #a8926a', borderRadius: 3,
  fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, lineHeight: 1.5, boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
  boxSizing: 'border-box'
};
const BUTTON: React.CSSProperties = {
  marginTop: 14, padding: '8px 14px', minHeight: 40, background: '#3c2c1e', color: '#f5f0e0',
  border: '1px solid #a8926a', borderRadius: 3, fontFamily: 'system-ui, sans-serif', fontSize: 13, cursor: 'pointer'
};

// Öppen söndag morgon för veckan som just avräknats, tills spelaren
// lägger ifrån sig tidningen; `openAgain` öppnar den igen.
export function useNewspaper() {
  const sim = useSimState();
  const week = sim.economy.lastSettlement?.week ?? null;
  const cal = calendarFor(sim.day.dayNumber);
  const sundayMorning = !cal.isServiceDay && sim.day.period === 'morning' && week !== null;
  const [readWeek, setReadWeek] = useState<number | null>(null);
  const [again, setAgain] = useState(false);
  useEffect(() => {
    if (!sundayMorning) setAgain(false);
  }, [sundayMorning]);
  const open = sundayMorning && (readWeek !== sim.day.dayNumber || again);
  return {
    available: sundayMorning,
    open,
    close: () => {
      setReadWeek(sim.day.dayNumber);
      setAgain(false);
    },
    openAgain: () => setAgain(true)
  };
}

export function NewspaperDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sim = useSimState();
  const { business } = useBusiness();
  if (!open) return null;
  const paper = newspaperFor(sim, business.name ?? '', settlementInWords(sim), (id) =>
    missingInWords(id, sim.medals, requirementsFor(sim, id))
  );
  if (!paper) return null;
  return (
    <div style={BACKDROP} role="dialog" aria-modal="true" aria-label={paper.masthead}>
      <article style={PAPER} data-testid="newspaper">
        <header style={{ borderBottom: '2px solid #2c241c', paddingBottom: 6, marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>{paper.masthead}</div>
          <div style={{ fontSize: 12, fontFamily: 'system-ui, sans-serif', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.75 }}>
            {paper.subhead}
          </div>
        </header>
        {paper.sections.map((section) => (
          <section key={section.id} style={{ marginTop: 12 }} data-testid={`newspaper-${section.id}`}>
            <div style={{ fontSize: 11, fontFamily: 'system-ui, sans-serif', letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.7 }}>
              {section.heading}
            </div>
            {section.title && <h3 style={{ margin: '2px 0 4px', fontSize: 19 }}>{section.title}</h3>}
            <p style={{ margin: 0 }}>{section.lines.join(' ')}</p>
          </section>
        ))}
        <button type="button" style={BUTTON} data-testid="close-newspaper" onClick={onClose}>
          {t.close}
        </button>
      </article>
    </div>
  );
}
