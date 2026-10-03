// ORDER 078 (M5) — prep readiness panel.
//
// Shows the five mise-en-place items with per-item readiness bars.
// Fixed at doors-open and held for the whole service (per §2 of the
// M5 report gate — no live re-scoring; the shortfall is fixed and
// carries into the causeTag chain). Visible from doors-open onward
// during a service; hidden in morning / opening / prep / evening.

import { panelOpen, useServiceDrawer } from '../ui/service/serviceDrawer';
import { useSimState } from '../simulation/SimulationProvider';
import { PREP_ITEMS } from '../simulation/miseEnPlace';
import { businessHasMiseEnPlace } from './businessClass';
import { strings } from '../../content/strings';
import { NxLabel, NxSteps, u } from '../ui/system/components';
import '../ui/screens/screens.css';

// ORDER 271 — formen efter Designs system (paket 1, 00-SYS): en panel på
// rutnätet över spelvyn, och beredskapen som tio steg utan tal
// ("Inga siffertavlor", LEVERANSNOT §3). Beredskapen är densamma
// (day.prepReadiness), bara visad som steg i stället för procent.
const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: u(160),
  left: u(72),
  width: `max(240px, ${u(420)})`,
  padding: `${u(24)} ${u(28)}`,
  zIndex: 33
};

export function PrepPanel() {
  const sim = useSimState();
  // ORDER 290 — serviceläget: mise en place visas när panelerna är öppnade.
  const drawer = useServiceDrawer();
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
  if (!inService || !panelOpen(drawer, 'stock')) return null;
  // ORDER 280 — under en egen raket stod raketen här (BackPanels, borttagen i ORDER 299).
  if (sim.incidents?.active?.backed) return null;
  const readiness = sim.day.prepReadiness;
  if (!readiness || Object.keys(readiness).length === 0) return null;

  return (
    <div className="nx nx-panel" style={PANEL_STYLE} aria-label={strings.panels.prep.heading} data-testid="prep-panel">
      <NxLabel>{strings.panels.prep.heading}</NxLabel>
      {PREP_ITEMS.map((item) => {
        const r = readiness[item.id] ?? 0;
        const name = strings.panels.prep.items[item.id] ?? item.id;
        return (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: `${u(150)} 1fr`, gap: u(16), alignItems: 'center', marginTop: u(14) }}>
            <span className="nx-small">{name}</span>
            <NxSteps value={r * 10} label={name} testId={`prep-${item.id}`} />
          </div>
        );
      })}
    </div>
  );
}
