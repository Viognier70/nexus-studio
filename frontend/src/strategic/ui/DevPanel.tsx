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

import { useEffect, useState } from 'react';
import { economicReadingNormalised } from '../simulation/cashReading';
import { useSimState } from '../simulation/SimulationProvider';
import { fpsMeter } from '../../lib/fpsMeter';

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
  const econReading = economicReadingNormalised(sim);
  const d = sim.day;
  // ORDER 055 Del F — pull FPS from the shared meter every 250 ms so
  // the readout ticks visibly without triggering a re-render on every
  // frame. The FpsProbe inside Canvas writes to the meter at ~2 Hz.
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFps(fpsMeter.fps), 250);
    return () => window.clearInterval(id);
  }, []);
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
  // ORDER 045 weather + world-factor line. Kept compact so the dev
  // panel stays a two-liner most of the time and grows to three
  // only on services where the outer world reports in.
  const weather = d.weather
    ? `${d.weather.tempC}°C  ${d.weather.windMS}m/s  ${d.weather.precipitation}  waiting=${d.waitingAtOpening}`
    : 'no weather (out of service)';
  const factors = d.worldFactors.length > 0
    ? '  factors=' + d.worldFactors.map((f) => f.kind).join(',')
    : '';
  // ORDER 056 Del A — label "strat" so the strategic FPS is
  // distinguishable from the first-person view's separate overlay.
  const fpsStr = fps > 0 ? `${fps.toString().padStart(3, ' ')}fps(strat)` : ' - fps(strat)';
  const line1 = `DEV  ${fpsStr}  day=${d.dayNumber} ${d.period.padEnd(9)}  service=${serviceReadout.padEnd(14)}  scenarios=${d.scenariosFiredThisService}/${d.scenariosPlanned}`;
  const cashK = Math.round(sim.cash / 1000);
  const line2 = `     cash=${cashK.toString().padStart(4, ' ')}k  econR=${econReading.toFixed(2)}  soc=${c.social.toFixed(2)}  eco=${c.ecological.toFixed(2)}  rep=${sim.reputation.toFixed(2)}  key=${lastKey || '-'}`;
  const line3 = `     ${weather}${factors}`;
  return <div style={PANEL_STYLE}>{`${line1}\n${line2}\n${line3}`}</div>;
}
