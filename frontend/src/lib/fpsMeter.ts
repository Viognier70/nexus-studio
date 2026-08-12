// ORDER 055 Del F — shared FPS reading between the R3F frame loop
// (which owns the timing) and the React DevPanel (which does not
// render inside Canvas).
//
// Dev-only. Consumers should gate reads on `import.meta.env.DEV` so
// tree-shaking removes the module from production bundles.

const state = {
  fps: 0,
  // Rolling window used by the probe. Kept module-level so the probe
  // can be unmounted and remounted without losing history.
  frames: 0,
  windowStart: 0
};

export const fpsMeter = {
  /** Current FPS averaged over the last measurement window. */
  get fps(): number {
    return state.fps;
  }
};

/**
 * Called from the R3F frame loop by <FpsProbe/>. Accumulates frames
 * over a ~500 ms window and publishes the average. Zero cost outside
 * the accumulator maths (no allocation per frame).
 */
export function fpsMeterTick(now: number): void {
  if (state.windowStart === 0) {
    state.windowStart = now;
    return;
  }
  state.frames += 1;
  const elapsed = now - state.windowStart;
  if (elapsed >= 500) {
    state.fps = Math.round((state.frames * 1000) / elapsed);
    state.frames = 0;
    state.windowStart = now;
  }
}
