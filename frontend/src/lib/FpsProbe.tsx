// ORDER 055 Del F — R3F-side FPS accumulator. Runs a single useFrame
// call that forwards the current wall-clock time to `fpsMeterTick`.
// Renders nothing. Dev-only.

import { useFrame } from '@react-three/fiber';
import { fpsMeterTick } from './fpsMeter';

export function FpsProbe() {
  useFrame(() => {
    fpsMeterTick(performance.now());
  });
  return null;
}
