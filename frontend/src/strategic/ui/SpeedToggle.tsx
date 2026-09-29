// ORDER 047 §7 — sim speed toggle.
//
// Default speed is 2×; player can dial to 1× (leisurely reading) or
// 4× (compressed observation). 0× (pause) is available in state but
// intentionally not exposed here — pause on demand blurs the reading
// of "how the evening is going." The buttons sit in the top-right
// chrome next to the cash pill + utility (⋯) menu.
//
// State model: state.speed is a plain number, mutated via SET_SPEED.
// No new state is added; this is a thin UI surface over the existing
// action.

import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { strings } from '../../content/strings';

const OPTIONS: readonly (1 | 2 | 4)[] = [1, 2, 4];

// ORDER 280 — Designs K1: tre rutor i designsystemets form, den valda i
// bläck. Farten styr också tempot i händelseströmmen.
const CONTAINER_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  gap: 0,
  background: 'var(--w-hud)',
  border: 'var(--w-hud-border)',
  borderRadius: 999,
  overflow: 'hidden',
  boxShadow: 'var(--w-shadow-hud)'
};

const BUTTON_BASE: React.CSSProperties = {
  minWidth: 'calc(54 * var(--nx-u))',
  padding: '0 calc(10 * var(--nx-u))',
  background: 'transparent',
  color: 'var(--w-cream)',
  border: 'none',
  fontFamily: 'inherit',
  fontSize: 'max(12px, calc(22 * var(--nx-u)))',
  fontWeight: 800,
  cursor: 'pointer'
};

const BUTTON_ACTIVE: React.CSSProperties = {
  ...BUTTON_BASE,
  background: 'var(--w-gold)',
  color: 'var(--w-ink)'
};

export function SpeedToggle() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  return (
    <div style={CONTAINER_STYLE} className="nx" role="group" aria-label={strings.hud.speed} data-testid="speed-toggle">
      {OPTIONS.map((speed) => {
        const active = sim.speed === speed;
        return (
          <button
            key={speed}
            type="button"
            style={active ? BUTTON_ACTIVE : BUTTON_BASE}
            onClick={() => dispatch({ type: 'SET_SPEED', speed })}
            aria-pressed={active}
            title={strings.hud.speedOption(speed)}
          >
            {speed}×
          </button>
        );
      })}
    </div>
  );
}
