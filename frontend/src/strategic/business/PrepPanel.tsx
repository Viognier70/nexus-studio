// ORDER 078 (M5) — prep readiness panel.
//
// Shows the five mise-en-place items with per-item readiness bars.
// Fixed at doors-open and held for the whole service (per §2 of the
// M5 report gate — no live re-scoring; the shortfall is fixed and
// carries into the causeTag chain). Visible from doors-open onward
// during a service; hidden in morning / opening / prep / evening.

import { useSimState } from '../simulation/SimulationProvider';
import { PREP_ITEMS } from '../simulation/miseEnPlace';
import { businessHasMiseEnPlace } from './businessClass';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 260,
  left: 20,
  width: 220,
  padding: '10px 14px',
  background: 'rgba(20, 14, 10, 0.62)',
  color: '#f0e8d4',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 3,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  zIndex: 33,
  pointerEvents: 'auto'
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.62,
  marginBottom: 6
};

const ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 40px',
  gap: 6,
  alignItems: 'center',
  padding: '3px 0',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12
};

const BAR_TRACK_STYLE: React.CSSProperties = {
  gridColumn: '1 / -1',
  height: 4,
  background: 'rgba(30, 20, 15, 0.55)',
  borderRadius: 2,
  overflow: 'hidden',
  marginTop: 2,
  marginBottom: 4
};

function readinessColour(r: number): string {
  if (r >= 0.7) return '#7bce8f';   // green
  if (r >= 0.4) return '#e8c169';   // amber
  return '#d97070';                  // red
}

export function PrepPanel() {
  const sim = useSimState();
  // ORDER 114 Steg 1 DoD 1 — verksamheter utan mise-en-place
  // (foodtruck) ska inte visa MISE EN PLACE-panelen. Flaggan
  // hasMiseEnPlace finns sedan ORDER 111 men konsumerades bara i
  // simuleringens prep-fas (reducer.ts:openService); UI-panelen
  // renderades oavsett verksamhet och visade 0% på alla items
  // (readiness beräknas aldrig när prep-fasen hoppas över). Guarden
  // här stänger den luckan — panelen försvinner för foodtruck och
  // frigör scenbredden till gäst-figurerna.
  if (!businessHasMiseEnPlace(sim.businessClass)) return null;
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  if (!inService) return null;
  const readiness = sim.day.prepReadiness;
  if (!readiness || Object.keys(readiness).length === 0) return null;

  return (
    <div style={PANEL_STYLE} aria-label="Mise en place">
      <div style={HEADING_STYLE}>Mise en place</div>
      {PREP_ITEMS.map((item) => {
        const r = readiness[item.id] ?? 0;
        return (
          <div key={item.id}>
            <div style={ROW_STYLE}>
              <span>{item.id}</span>
              <span style={{ color: readinessColour(r), textAlign: 'right' }}>
                {(r * 100).toFixed(0)}%
              </span>
            </div>
            <div style={BAR_TRACK_STYLE}>
              <div style={{
                width: `${(r * 100).toFixed(0)}%`,
                height: '100%',
                background: readinessColour(r)
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
