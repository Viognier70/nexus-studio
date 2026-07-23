// Camera-distance readability helpers for strategic-scene actors.
//
// The strategic camera ranges from ~10 m (business / interior) to ~1800 m
// (village / Google-Earth altitude). Living-village actors — walkers,
// cyclists, vehicles, boats, and street labels — are authored at their real
// physical scale. That reads correctly at close and district range but
// disappears at village altitude, where a 1.2 m walker occupies well under
// a pixel and vanishes.
//
// This module provides purely visual readability treatments: a scale
// multiplier that stays at 1.0 across close and district range and ramps up
// smoothly only once the camera has reached the strategic view, and a
// generic opacity fade helper for the same kind of distance-driven UX.
//
// It is deliberately narrow. It does not:
//  - carry movement, route, or spawn logic;
//  - hold simulation state;
//  - know anything about walkers vs. vehicles vs. boats vs. labels;
//  - modify authored world data.
//
// Reference camera ranges (see grythyttan.ts::GRAY_BOX_CAMERA):
//    close       ~10 – 65   m  (business / interior)
//    district    ~65 – 320  m  (kvarteret)
//    village    ~320 – 1800 m  (strategic overview)

/** Smoothstep from 0 to 1 across [a, b]. C¹ continuous — no visible pop. */
function smoothstep(a: number, b: number, x: number): number {
  if (b <= a) return x <= a ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Parameters for a distance-driven visual scale ramp.
 *
 * The ramp is designed so that realistic world-space scale is preserved at
 * close and district range, then grows smoothly once the camera crosses
 * into the strategic view. Callers pick their own numbers so pedestrians
 * (very small in reality) can grow more aggressively than tourist buses
 * (already large).
 */
export interface ReadabilityCurve {
  /** Camera distance (metres) at which the boost starts. Below this the
   *  returned scale is exactly 1.0 — realistic scale is preserved. */
  rampStart: number;
  /** Camera distance at which the boost saturates at `maxScale`. */
  rampEnd: number;
  /** Multiplier reached at and beyond `rampEnd`. Must be ≥ 1. */
  maxScale: number;
}

/**
 * Returns a visual scale multiplier ≥ 1 for the given camera distance.
 * Guarantees:
 *  - result === 1 when distance ≤ curve.rampStart (close and district
 *    ranges are untouched);
 *  - result === curve.maxScale when distance ≥ curve.rampEnd;
 *  - smooth C¹ interpolation between the two — no visible snapping as the
 *    camera crosses a threshold;
 *  - result never dips below 1, so zooming inward never inflates an actor.
 */
export function readabilityScale(
  distance: number,
  curve: ReadabilityCurve
): number {
  if (curve.maxScale <= 1) return 1;
  const t = smoothstep(curve.rampStart, curve.rampEnd, distance);
  return 1 + t * (curve.maxScale - 1);
}

/**
 * Parameters for a symmetric fade envelope in camera distance space.
 *
 * Typical use: an ambient element that should appear as the camera pulls
 * back from `nearIn` (fully visible by `nearOut`), and disappear again
 * when the camera pulls too far away past `farIn` (fully hidden by
 * `farOut`). Any of the four points may be `undefined` to disable that
 * side of the envelope (e.g. no far cap).
 */
export interface FadeEnvelope {
  /** Distance at which the element starts fading IN as camera pulls back. */
  nearIn?: number;
  /** Distance at which the element is fully faded IN. */
  nearOut?: number;
  /** Distance at which the element starts fading OUT as camera pulls back. */
  farIn?: number;
  /** Distance at which the element is fully faded OUT. */
  farOut?: number;
}

/**
 * Returns an opacity in [0, 1] for the given camera distance and envelope.
 * Curves are C¹ smoothstep on each side so there is no visible pop.
 * An undefined bound leaves that side open (opacity 1 on that side).
 */
export function readabilityFade(
  distance: number,
  env: FadeEnvelope
): number {
  let o = 1;
  if (env.nearIn !== undefined && env.nearOut !== undefined) {
    o = Math.min(o, smoothstep(env.nearIn, env.nearOut, distance));
  }
  if (env.farIn !== undefined && env.farOut !== undefined) {
    o = Math.min(o, 1 - smoothstep(env.farIn, env.farOut, distance));
  }
  return Math.max(0, Math.min(1, o));
}
