// ORDER 077 §4 (M4) — in-room plates-remaining reading.
//
// Small panel visible during service. One row per dish on today's
// menu, with the current plates-remaining count updated live as
// guests order and stock is drawn. When a dish hits 0, its row
// dims + shows "OUT" — the reading matches the stream's stock_out
// event landing at the same moment.

import { useSimState } from '../simulation/SimulationProvider';
import { findDish } from '../simulation/m4Catalogue';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 72,
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

const ROW_STYLE = (isOut: boolean): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 6,
  padding: '3px 0',
  opacity: isOut ? 0.4 : 1,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12
});

export function PlatesRemainingPanel() {
  const sim = useSimState();
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  if (!inService) return null;
  if (sim.menu.length === 0) return null;

  return (
    <div style={PANEL_STYLE} aria-label="Plates remaining">
      <div style={HEADING_STYLE}>Plates remaining</div>
      {sim.menu.map((entry) => {
        const dish = findDish(entry.dishId);
        if (!dish) return null;
        const plates = sim.day.platesRemaining[entry.dishId] ?? 0;
        const isOut = plates === 0;
        return (
          <div key={entry.dishId} style={ROW_STYLE(isOut)}>
            <span>{dish.name}</span>
            <span>{isOut ? 'OUT' : plates}</span>
          </div>
        );
      })}
    </div>
  );
}
