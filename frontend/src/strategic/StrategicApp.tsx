import { useCallback, useRef, useState } from 'react';
import { BusinessProvider } from './business/BusinessContext';
import { NameEntryOverlay } from './business/NameEntryOverlay';
import { CameraProvider, useCamera } from './camera/CameraContext';
import { useDesktopControls } from './camera/useDesktopControls';
import { useTouchControls } from './camera/useTouchControls';
import type { Landmark } from './content/world';
import { LANDMARK_BY_ID } from './content/world';
import { StrategicScene } from './scene/StrategicScene';
import { SimulationProvider } from './simulation/SimulationProvider';
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

  const getHost = useCallback(() => hostRef.current, []);
  useDesktopControls({
    enabled: true,
    targetElement: getHost,
    onJumpPreset: jumpToPreset
  });
  useTouchControls({ enabled: true, targetElement: getHost });

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
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
