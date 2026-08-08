import { useCallback, useEffect, useRef, useState } from 'react';
import { BusinessProvider } from './business/BusinessContext';
import { NameEntryOverlay } from './business/NameEntryOverlay';
import { CameraProvider, useCamera } from './camera/CameraContext';
import { useDesktopControls } from './camera/useDesktopControls';
import { useTouchControls } from './camera/useTouchControls';
import type { Landmark } from './content/world';
import { LANDMARK_BY_ID } from './content/world';
import { ScenarioOverlay } from './scenario/ScenarioOverlay';
import { StrategicScene } from './scene/StrategicScene';
import { SimulationProvider, useSimDispatch } from './simulation/SimulationProvider';
import { AboutPanel } from './ui/AboutPanel';
import { ControlsHint } from './ui/ControlsHint';
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
  //   R — reset the simulation to the initial state
  // Ignored when an <input> or <textarea> has focus (name-entry etc.)
  // so typing a business name doesn't accidentally trigger scenarios.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key === '5') simDispatch({ type: 'TRIGGER_SCENARIO' });
      if (event.key === 'r' || event.key === 'R') simDispatch({ type: 'RESET' });
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
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
