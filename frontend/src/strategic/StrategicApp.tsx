import { useCallback, useEffect, useRef, useState } from 'react';
import { BusinessProvider } from './business/BusinessContext';
import { NameEntryOverlay } from './business/NameEntryOverlay';
import { CameraProvider, useCamera } from './camera/CameraContext';
import { useDesktopControls } from './camera/useDesktopControls';
import { useTouchControls } from './camera/useTouchControls';
import type { Landmark } from './content/world';
import { LANDMARK_BY_ID } from './content/world';
import { ScenarioOverlay } from './scenario/ScenarioOverlay';
import { ServiceLengthPicker } from './scenario/ServiceLengthPicker';
import { StrategicScene } from './scene/StrategicScene';
import { SimulationProvider, useSimDispatch } from './simulation/SimulationProvider';
import { AboutPanel } from './ui/AboutPanel';
import { ControlsHint } from './ui/ControlsHint';
import { DevPanel } from './ui/DevPanel';
import { ModeSwitchLink } from './ui/ModeSwitchLink';
import { OutwardButton } from './ui/OutwardButton';
import { SelectionChrome } from './ui/SelectionChrome';
import { VerifyBadge } from './ui/VerifyBadge';
import { ViewLabel } from './ui/ViewLabel';
import { detectWebGL, WebGLFallback } from '../webgl/WebGLFallback';
import './strategic.css';

export function StrategicApp() {
  const [webglOk] = useState<boolean>(() => detectWebGL());
  if (!webglOk) {
    return <WebGLFallback onRestart={() => window.location.reload()} />;
  }
  return (
    <BusinessProvider>
      <CameraProvider>
        <SimulationProvider>
          <StrategicShell />
          <NameEntryOverlay />
        </SimulationProvider>
      </CameraProvider>
    </BusinessProvider>
  );
}

function StrategicShell() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // ORDER 043 B.1 dev readout — the last key the shortcut handler
  // processed. Renders in DevPanel (dev-only) so the Vision Owner can
  // verify a keypress actually reached the handler without opening
  // browser dev tools.
  const [lastKey, setLastKey] = useState('');
  const { focusOn, jumpToPreset } = useCamera();
  const simDispatch = useSimDispatch();

  const getHost = useCallback(() => hostRef.current, []);
  useDesktopControls({
    enabled: true,
    targetElement: getHost,
    onJumpPreset: jumpToPreset
  });
  useTouchControls({ enabled: true, targetElement: getHost });

  // Dev shortcuts alongside the camera-preset digit keys 1–4:
  //   5 — trigger the walk-in-of-five scenario now (bypasses the 30-s
  //       auto-trigger; useful for one-and-done playtest)
  //   R — reset the simulation only (scenario, guests, tick counter,
  //       seatedIds). Explicitly scoped to simDispatch — this handler
  //       does not touch BusinessContext, and there is no other code
  //       path in the app that can null `business.name` once set (the
  //       only mutator, BusinessContext.setName, filters empty inputs).
  //       If a full reset including the business name is ever needed,
  //       browser reload (Cmd+R / Ctrl+R) is the intended path.
  //
  //   ORDER 043 B.1 gate shortcuts — no numeric HUD, no on-screen
  //   readout; the room itself is the reading. Cycle the capital
  //   through [1.0, 0.7, 0.4, 0.15, 0.0] to see the phenomenon respond.
  //   Bindings moved off letter mnemonics (s/e/c) 2026-08-08 after
  //   `e` collided with camera yaw-rotate; the punctuation triplet
  //   , . / has no overlap with camera (q/e/1-4/Esc) or sim shortcuts
  //   (5/r) and reads as an obvious dev keybind — no player would
  //   press comma expecting a game effect.
  //     , — social capital cycle (watch the queue grow / shrink)
  //     . — economic capital cycle (watch tables empty, walk-aways rise)
  //     / — ecological capital cycle (watch the delivery van cadence)
  //   These get removed at B.3 when the wager UI + scenario-driven
  //   capital movement replace them.
  //
  // Modifier keys are ignored so that Cmd+R / Ctrl+R (browser reload)
  // and any future keyboard chords aren't hijacked by the dev handler.
  // Ignored when an <input> or <textarea> has focus (name-entry etc.)
  // so typing a business name doesn't accidentally trigger scenarios.
  useEffect(() => {
    const cycleSteps = [1.0, 0.7, 0.4, 0.15, 0.0];
    const cyclePosition: Record<'economic' | 'social' | 'ecological', number> = {
      economic: 0, social: 0, ecological: 0
    };
    const cycle = (cap: 'economic' | 'social' | 'ecological') => {
      cyclePosition[cap] = (cyclePosition[cap] + 1) % cycleSteps.length;
      simDispatch({
        type: 'SET_CAPITAL',
        capital: cap,
        value: cycleSteps[cyclePosition[cap]]
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Record every reachable keypress for the DevPanel readout so
      // the Vision Owner can see whether a key even reached the
      // handler — separate from whether it hit a binding.
      setLastKey(event.key);
      if (event.key === '5') simDispatch({ type: 'TRIGGER_SCENARIO' });
      if (event.key === 'r' || event.key === 'R') simDispatch({ type: 'RESET' });
      if (event.key === ',') cycle('social');
      if (event.key === '.') cycle('economic');
      if (event.key === '/') cycle('ecological');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [simDispatch]);

  const handleSelect = useCallback(
    (landmark: Landmark) => {
      setSelectedId(landmark.id);
      focusOn({ x: landmark.position[0], z: landmark.position[1] });
    },
    [focusOn]
  );

  const selected = selectedId ? LANDMARK_BY_ID[selectedId] ?? null : null;

  return (
    <div className="gb-root">
      <div ref={hostRef} className="gb-canvas-host">
        <StrategicScene onSelect={handleSelect} selectedId={selectedId} />
      </div>
      <ViewLabel />
      <VerifyBadge />
      <div className="gb-topright">
        <ModeSwitchLink />
        <button
          type="button"
          className="gb-btn"
          onClick={() => setAboutOpen(true)}
          aria-label="Om denna prototyp"
        >
          Om
        </button>
      </div>
      <OutwardButton />
      <ControlsHint />
      <SelectionChrome
        landmark={selected}
        onClose={() => setSelectedId(null)}
      />
      <ScenarioOverlay />
      <ServiceLengthPicker />
      <DevPanel lastKey={lastKey} />
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
