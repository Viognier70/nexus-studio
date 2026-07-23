import type { Vec2 } from '../types';

// Sample a polyline at parameter t in [0, 1). Wraps.
export function sampleLoop(points: Vec2[], t: number): Vec2 {
  if (points.length === 0) return { x: 0, z: 0 };
  if (points.length === 1) return { ...points[0] };
  const wrapped = ((t % 1) + 1) % 1;
  const segments = points.length; // closed loop uses (points[i], points[(i+1)%points.length])
  const scaled = wrapped * segments;
  const i = Math.floor(scaled) % segments;
  const f = scaled - Math.floor(scaled);
  const a = points[i];
  const b = points[(i + 1) % points.length];
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
}

// Direction (yaw radians) at parameter t.
export function loopHeading(points: Vec2[], t: number): number {
  if (points.length < 2) return 0;
  const wrapped = ((t % 1) + 1) % 1;
  const segments = points.length;
  const scaled = wrapped * segments;
  const i = Math.floor(scaled) % segments;
  const a = points[i];
  const b = points[(i + 1) % points.length];
  return Math.atan2(b.x - a.x, b.z - a.z);
}
