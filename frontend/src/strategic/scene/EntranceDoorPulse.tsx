// ORDER 046 §4 — the doors-opening moment.
//
// When the prep window closes and doorsOpenedThisService flips true,
// draw a soft warm-toned quad at the entrance for ~1.5 s that
// scales from 0.9× to 1.15× and fades in-then-out. Signals "the
// doors have opened" as a room event, not just as a stream line.
//
// No new geometry beyond a single circular disc. No new materials
// beyond an additive transparent standard material. Colour matches
// the interior warm-beige so it reads as light spilling out, not
// as a UI badge.

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useSimState } from '../simulation/SimulationProvider';

const PULSE_DURATION_SEC = 1.5;
const PULSE_BASE_RADIUS_M = 1.2;
const PULSE_MIN_SCALE = 0.9;
const PULSE_MAX_SCALE = 1.15;
const PULSE_Y_OFFSET = 0.02;      // just above the floor to prevent z-fight

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function EntranceDoorPulse() {
  const layout = usePlayerBusinessInterior();
  const { actualRef } = useCamera();
  const sim = useSimState();
  const meshRef = useRef<THREE.Mesh>(null);

  // Latch the pulse-start time when doorsOpenedThisService flips to
  // true. State (not ref) so React re-mounts the mesh visibility on
  // subsequent services; latch is cleared when the flag returns to
  // false (service close). Using state means the useEffect deps
  // capture the boolean cleanly.
  const [pulseStart, setPulseStart] = useState<number | null>(null);
  const doorsOpened = sim.day.doorsOpenedThisService;

  useEffect(() => {
    if (doorsOpened && pulseStart === null) {
      setPulseStart(sim.simTime);
    } else if (!doorsOpened && pulseStart !== null) {
      setPulseStart(null);
    }
  }, [doorsOpened, pulseStart, sim.simTime]);

  useFrame(() => {
    if (!meshRef.current || !layout || pulseStart === null) return;

    const elapsed = sim.simTime - pulseStart;
    if (elapsed < 0 || elapsed > PULSE_DURATION_SEC) {
      meshRef.current.visible = false;
      return;
    }

    // Envelope: rise for the first third, fall for the last two thirds.
    const t = elapsed / PULSE_DURATION_SEC;
    const rise = smoothstep(0, 0.33, t);
    const fall = 1 - smoothstep(0.33, 1, t);
    const envelope = Math.min(rise, fall);

    // Interior-view crossfade — hide the pulse when the camera is
    // pulled out past the interior-visible range.
    const dist = actualRef.current.distance;
    const interiorVisibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );

    const scale = PULSE_MIN_SCALE + (PULSE_MAX_SCALE - PULSE_MIN_SCALE) * t;
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.visible = envelope > 0.02 && interiorVisibility > 0.05;

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (mat) {
      mat.opacity = envelope * 0.55 * interiorVisibility;
    }
  });

  if (!layout || pulseStart === null) return null;

  const [ex, ez] = layout.entrance;
  return (
    <mesh
      ref={meshRef}
      position={[ex, PULSE_Y_OFFSET, ez]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
    >
      <circleGeometry args={[PULSE_BASE_RADIUS_M, 32]} />
      <meshBasicMaterial
        color="#f0d698"
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
