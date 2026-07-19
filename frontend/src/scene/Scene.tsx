import { Canvas } from '@react-three/fiber';
import { Suspense, type CSSProperties, type MutableRefObject } from 'react';
import { Applicant } from './Applicant';
import { BusStop } from './BusStop';
import { Environment } from './Environment';
import { Mist } from './Mist';
import { Pavilion } from './Pavilion';
import { RegistrationTable } from './RegistrationTable';
import { Trees } from './Trees';
import { PlayerController } from '../controls/PlayerController';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

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
}

// Stable prop identities. R3F 8's <Canvas> runs its configure effect on every
// render with no dep array, so passing inline object literals causes churn that
// can reset side-effect state. Keeping these outside the component (or via
// useMemo) gives R3F stable identities across re-renders. Position is
// intentionally omitted — PlayerController owns it.
const CANVAS_GL = { antialias: true, powerPreference: 'high-performance' as const };
const CANVAS_DPR: [number, number] = [1, 2];
const CANVAS_CAMERA = { fov: 70, near: 0.1, far: 400 };
const CANVAS_STYLE: CSSProperties = { position: 'absolute', inset: 0 };

export function Scene({
  isTouch,
  paused,
  hasSpokenToApplicant,
  onNearNpc,
  onNearTable,
  moveRef,
  lookRef
}: Props) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <Canvas
      gl={CANVAS_GL}
      dpr={CANVAS_DPR}
      camera={CANVAS_CAMERA}
      shadows={false}
      style={CANVAS_STYLE}
    >
      <color attach="background" args={['#c9d7db']} />
      <fog attach="fog" args={['#c9d7db', 42, 180]} />
      <hemisphereLight args={['#f6ead9', '#3a4a4b', 0.9]} />
      <directionalLight position={[30, 40, 20]} intensity={1.35} color="#ffe6c2" />
      <ambientLight intensity={0.35} />
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
