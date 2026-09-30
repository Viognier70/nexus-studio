// ORDER 290 — knappen som öppnar och fäller ihop servicens paneler.
import { strings } from '../../../content/strings';
import { useSimState } from '../../simulation/SimulationProvider';
import { setServiceDrawerOpen, useServiceDrawer } from './serviceDrawer';

export function ServiceDrawerButton() {
  const sim = useSimState();
  const { open } = useServiceDrawer();
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  if (!inService) return null;
  return (
    <button type="button" className="nx nx-btn nx-btn-quiet nx-drawer-btn" data-testid="service-drawer" aria-expanded={open} onClick={() => setServiceDrawerOpen(!open)}>
      {open ? strings.drawer.hide : strings.drawer.show}
    </button>
  );
}
