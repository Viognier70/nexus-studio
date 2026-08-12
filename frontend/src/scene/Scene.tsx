import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useState, type CSSProperties, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { Applicant } from './Applicant';
import { BusStop } from './BusStop';
import { Environment } from './Environment';
import { Mist } from './Mist';
import { Pavilion } from './Pavilion';
import { RegistrationTable } from './RegistrationTable';
import { ScaleReference } from './ScaleReference';
import { Trees } from './Trees';
import { PlayerController } from '../controls/PlayerController';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { SunLightRig } from '../lib/lighting/SunLightRig';
import { FpsProbe } from '../lib/FpsProbe';
import { devToggles, SEASON_DATE, type SeasonKey } from '../lib/devToggles';

export interface MoveVector {
  x: number;
  y: number;
}

export interface LookDelta {
  dx: number;
  dy: number;
}

interface Props {
  isTouch: boolean;
  paused: boolean;
  hasSpokenToApplicant: boolean;
  onNearNpc: (near: boolean) => void;
  onNearTable: (near: boolean) => void;
  moveRef: MutableRefObject<MoveVector>;
  lookRef: MutableRefObject<LookDelta>;
  // ORDER 053 Del D — dev-only scale-reference overlay.
  showScaleRef?: boolean;
}

// Stable prop identities. R3F 8's <Canvas> runs its configure effect on every
// render with no dep array, so passing inline object literals causes churn that
// can reset side-effect state. Keeping these outside the component (or via
// useMemo) gives R3F stable identities across re-renders. Position is
// intentionally omitted — PlayerController owns it.
// ORDER 054 Del D — ACES filmic tone map + sRGB output. Same policy
// as strategic view; this is the standard R3F PBR pipeline setup.
const CANVAS_GL = {
  antialias: true,
  powerPreference: 'high-performance' as const,
  toneMapping: THREE.ACESFilmicToneMapping,
  // ORDER 055 Del C — see StrategicScene comment. 1.3 exposure
  // matches the new SunLightRig intensity ramp.
  toneMappingExposure: 1.3,
  outputColorSpace: THREE.SRGBColorSpace
};
const CANVAS_DPR: [number, number] = [1, 2];
// ORDER 053 Del C — first-person camera contract.
const CANVAS_CAMERA = { fov: 65, near: 0.1, far: 2000 };
const CANVAS_STYLE: CSSProperties = { position: 'absolute', inset: 0 };
// ORDER 054 Del C — soft PCF shadows.
const CANVAS_SHADOWS = { type: THREE.PCFSoftShadowMap };

export function Scene({
  isTouch,
  paused,
  hasSpokenToApplicant,
  onNearNpc,
  onNearTable,
  moveRef,
  lookRef,
  showScaleRef = false
}: Props) {
  const reduceMotion = usePrefersReducedMotion();
  // ORDER 056 Del A — subscribe to the shared season toggle so first-
  // person view flips its declination in sync with the strategic view.
  const [season, setSeason] = useState<SeasonKey>(() => devToggles.season);
  useEffect(() => devToggles.subscribe((s) => setSeason(s.season)), []);
  const seasonDate = SEASON_DATE[season];

  return (
    <Canvas
      gl={CANVAS_GL}
      dpr={CANVAS_DPR}
      camera={CANVAS_CAMERA}
      shadows={CANVAS_SHADOWS}
      style={CANVAS_STYLE}
    >
      {/* ORDER 054 Del C — SunLightRig replaces the hand-authored
          hemi + directional + ambient stack. The first-person walk
          plays in mid-morning autumn light (09:30) so the applicant
          is warmly side-lit and the pavilion casts a legible shadow
          across the gravel path.
          ORDER 055 Del D — background + fog are owned by the rig and
          track elevation. First-person scene is small: 42 → 180 m.
          ORDER 056 Del A — date threaded through the season dev-toggle. */}
      <SunLightRig hourOfDay={9.5} fogRange={[42, 180]} date={seasonDate} />
      <Suspense fallback={null}>
        <Environment />
        <Trees reduceMotion={reduceMotion} />
        <Mist />
        <BusStop />
        <Applicant
          onProximity={onNearNpc}
          reduceMotion={reduceMotion}
          disabled={hasSpokenToApplicant}
        />
        <Pavilion />
        <RegistrationTable
          onProximity={onNearTable}
          active={hasSpokenToApplicant}
        />
        <ScaleReference enabled={showScaleRef} groundY={0} />
        {import.meta.env.DEV && <FpsProbe />}
      </Suspense>
      <PlayerController
        isTouch={isTouch}
        paused={paused}
        moveRef={moveRef}
        lookRef={lookRef}
      />
    </Canvas>
  );
}
