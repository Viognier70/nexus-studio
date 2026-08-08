// ORDER 043 B.1 dev-only visible readout.
//
// Renders capital values and the last key the sim-shortcut handler
// processed, so the Vision Owner can verify (a) the value the S/E/C
// keys actually set and (b) that the keypress reached the handler at
// all — without opening the browser dev tools.
//
// Wrapped in `import.meta.env.DEV` so Vite strips this at production
// build time; no numeric HUD ships to a player build.
//
// Layout: bottom-left corner, small monospace strip. Opposite the
// ScenarioOverlay (bottom-centre) so they never overlap.
//
// Removed at ORDER 043 B.3 alongside the S/E/C dev shortcuts, when
// the wager UI + scenario-driven capital movement replace the manual
// cycle keys.

import { useSimState } from '../simulation/SimulationProvider';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 8,
  left: 8,
  padding: '6px 10px',
  background: 'rgba(20, 14, 10, 0.82)',
  color: '#f5f0e0',
  border: '1px solid #7a6a4a',
  borderRadius: 3,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  lineHeight: 1.5,
  letterSpacing: 0.2,
  pointerEvents: 'none',
  zIndex: 45,
  whiteSpace: 'pre'
};

interface Props {
  lastKey: string;
}

export function DevPanel({ lastKey }: Props) {
  if (!import.meta.env.DEV) return null;
  const sim = useSimState();
  const c = sim.capitals.values;
  const wager = sim.wager ? `${sim.wager.capital[0].toUpperCase()}` : '-';
  const d = sim.day;
  // Service progress readout: "5:23 / 10 min" when a service is
  // running, "-" otherwise. Player-facing text never shows numbers
  // (§9), but the dev strip does — it's the only surface where a
  // countdown belongs.
  const serviceReadout =
    d.currentServiceLengthMinutes === null
      ? '-'
      : (() => {
          const elapsed = sim.simTime - d.periodStartAt;
          const totalSec = d.currentServiceLengthMinutes * 60;
          const rem = Math.max(0, totalSec - elapsed);
          const m = Math.floor(rem / 60);
          const s = Math.floor(rem % 60);
          return `${m}:${s.toString().padStart(2, '0')} / ${d.currentServiceLengthMinutes}min`;
        })();
  const line1 = `DEV  day=${d.dayNumber} ${d.period.padEnd(9)}  service=${serviceReadout.padEnd(14)}  scenarios=${d.scenariosFiredThisService}/${d.scenariosPlanned}`;
  const line2 = `     econ=${c.economic.toFixed(2)}  soc=${c.social.toFixed(2)}  eco=${c.ecological.toFixed(2)}  rep=${sim.reputation.toFixed(2)}  wager=${wager}  key=${lastKey || '-'}`;
  return <div style={PANEL_STYLE}>{`${line1}\n${line2}`}</div>;
}
