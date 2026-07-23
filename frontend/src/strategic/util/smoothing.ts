// Damped exponential smoothing. Used for camera transitions.
// At each frame, `current` moves a fraction of the way toward `target`,
// scaled by dt and the smoothing rate. Framerate-independent.
export function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  let diff = target - current;
  const twoPi = Math.PI * 2;
  while (diff > Math.PI) diff -= twoPi;
  while (diff < -Math.PI) diff += twoPi;
  return current + diff * (1 - Math.exp(-rate * dt));
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth 0..1 window ramp centered on `mid` with half-width `half`.
// Returns 0 outside the window, 1 at the center, smoothstep in between.
export function smoothWindow(value: number, mid: number, half: number): number {
  const t = clamp((value - (mid - half)) / (2 * half), 0, 1);
  return t * t * (3 - 2 * t);
}
