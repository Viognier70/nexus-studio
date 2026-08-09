// ORDER 047 §7 — sim speed toggle.
//
// Default speed is 2×; player can dial to 1× (leisurely reading) or
// 4× (compressed observation). 0× (pause) is available in state but
// intentionally not exposed here — pause on demand blurs the reading
// of "how the evening is going." The buttons sit in the top-right
// chrome next to ModeSwitchLink + Om.
//
// State model: state.speed is a plain number, mutated via SET_SPEED.
// No new state is added; this is a thin UI surface over the existing
// action.

import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const OPTIONS: readonly (1 | 2 | 4)[] = [1, 2, 4];

const CONTAINER_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  gap: 2,
  background: 'rgba(20, 14, 10, 0.62)',
  border: '1px solid rgba(168, 146, 106, 0.55)',
  borderRadius: 3,
  padding: 2
};

const BUTTON_BASE: React.CSSProperties = {
  minWidth: 30,
  padding: '4px 8px',
  background: 'transparent',
  color: '#f0e8d4',
  border: 'none',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 12,
  letterSpacing: 0.3,
  cursor: 'pointer',
  borderRadius: 2
};

const BUTTON_ACTIVE: React.CSSProperties = {
  ...BUTTON_BASE,
  background: '#5a4126',
  color: '#f7ecd0',
  fontWeight: 700
};

export function SpeedToggle() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  return (
    <div style={CONTAINER_STYLE} role="group" aria-label="Simuleringshastighet">
      {OPTIONS.map((speed) => {
        const active = sim.speed === speed;
        return (
          <button
            key={speed}
            type="button"
            style={active ? BUTTON_ACTIVE : BUTTON_BASE}
            onClick={() => dispatch({ type: 'SET_SPEED', speed })}
            aria-pressed={active}
            title={`Simulering ${speed}× hastighet`}
          >
            {speed}×
          </button>
        );
      })}
    </div>
  );
}
