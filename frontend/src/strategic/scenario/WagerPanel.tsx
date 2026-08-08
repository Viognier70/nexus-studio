// ORDER 043 v3 §7 — the wager panel.
//
// Placed between scenarios during a running service. Player stakes on
// which sustainability the *next* scenario will concern. Optional —
// declining is legitimate and just progresses the loop more slowly.
//
// Visibility rules (must be all true):
//   - period is 'lunch' or 'dinner' (service running)
//   - scenario.phase is 'idle' or 'settled' (between scenarios)
//   - scenariosFiredThisService < scenariosPlanned (another scenario
//     is scheduled — no point wagering when the service will close
//     before the next fire)
//
// Layout mirrors ScenarioOverlay: bottom-centre chrome strip, non-
// modal, never dominates the room. Sits alongside — the two overlays
// don't ever appear together because scenario.phase='situation' means
// the overlay is up and the wager window is closed.

import { strings } from '../../content/strings.sv';
import type { SustainabilityKey } from '../types';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const CAPITAL_ORDER: readonly SustainabilityKey[] = [
  'economic',
  'social',
  'ecological'
];

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  maxWidth: 720,
  minWidth: 380,
  padding: '14px 20px 16px',
  background: 'rgba(30, 22, 16, 0.86)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 40
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 4
};

const BODY_STYLE: React.CSSProperties = {
  marginBottom: 12
};

const BUTTON_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center'
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: '9px 14px',
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: 'pointer'
};

const SELECTED_BUTTON_STYLE: React.CSSProperties = {
  ...BUTTON_STYLE,
  background: '#a8926a',
  color: '#1a1409'
};

const DECLINE_BUTTON_STYLE: React.CSSProperties = {
  ...BUTTON_STYLE,
  background: '#2a1e14',
  fontWeight: 500,
  opacity: 0.85
};

export function WagerPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  const period = sim.day.period;
  const scenarioIdle =
    sim.scenario.phase === 'idle' || sim.scenario.phase === 'settled';
  const hasMoreScenarios =
    sim.day.scenariosFiredThisService < sim.day.scenariosPlanned;

  if (period !== 'lunch' && period !== 'dinner') return null;
  if (!scenarioIdle) return null;
  if (!hasMoreScenarios) return null;

  const wager = sim.wager;

  return (
    <div style={OVERLAY_STYLE}>
      <div style={HEADING_STYLE}>{strings.wager.heading}</div>
      <div style={BODY_STYLE}>
        {wager ? strings.wager.placed : strings.wager.body}
      </div>
      <div style={BUTTON_ROW_STYLE}>
        {CAPITAL_ORDER.map((cap) => {
          const isSelected = wager?.capital === cap;
          return (
            <button
              key={cap}
              type="button"
              style={isSelected ? SELECTED_BUTTON_STYLE : BUTTON_STYLE}
              onClick={() => dispatch({ type: 'PLACE_WAGER', capital: cap })}
            >
              {strings.wager.capitals[cap]}
            </button>
          );
        })}
        {wager ? (
          <button
            type="button"
            style={{ ...DECLINE_BUTTON_STYLE, marginLeft: 'auto' }}
            onClick={() => dispatch({ type: 'CLEAR_WAGER' })}
          >
            {strings.wager.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}
