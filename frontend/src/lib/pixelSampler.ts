// ORDER 061 point 3 — pixel-sampling probe.
//
// Reads a small square of framebuffer pixels around the screen centre
// once per throttled tick and publishes the average sRGB (post-tone-
// map) value to a module singleton. Vision Owner points the crosshair
// at a roof face; the readout reveals whether the perceived darkness
// is real ("pixel is at R80 G50 B40 → definitely dark") or a
// perceptual illusion ("pixel is at R170 G120 B100 → math is right,
// look for fog / atmosphere / saturation causes").
//
// Dev-only. Consumers gate on `import.meta.env.DEV` so this module
// tree-shakes cleanly in prod bundles.

const state = {
  // 0–255 sRGB. Zeroed when no sample has been taken yet.
  r: 0,
  g: 0,
  b: 0,
  // Number of pixels averaged in the last sample.
  samples: 0,
  // Screen-space centre of the sample region (for the on-screen
  // crosshair — probe reads it as a hint but centres by default).
  cx: 0,
  cy: 0,
  // ORDER 072 — per-channel variance within the ROI, computed as
  // max − min. Zero variance = the sample sits entirely on one
  // uniform surface (correct for a well-authored pose). Non-zero
  // variance on a supposedly-uniform pose is a warning even if
  // the mean is inside the threshold — it means the ROI is close
  // to a colour edge and will drift onto the other side of that
  // edge under future cross-platform sub-pixel differences.
  varR: 0,
  varG: 0,
  varB: 0
};

export const pixelSampler = {
  get r(): number { return state.r; },
  get g(): number { return state.g; },
  get b(): number { return state.b; },
  get samples(): number { return state.samples; },
  get cx(): number { return state.cx; },
  get cy(): number { return state.cy; },
  get varR(): number { return state.varR; },
  get varG(): number { return state.varG; },
  get varB(): number { return state.varB; }
};

// ORDER 064 — expose a monotonic tick counter for the visual-regression
// runner. Playwright waits for `window.__nxHarness.ticks >= N` before
// reading pixels, which is a deterministic frame-stability condition
// (each tick is a completed sample; N=3 ≈ 3 × 8 frames = ~24 rendered
// frames after navigation). Dev-only in effect: the pixel sampler
// itself only runs when import.meta.env.DEV — but the module lives
// under `src/lib/` and the runtime hook is unconditional so the
// runner's `waitForFunction` doesn't need env awareness.
let ticks = 0;

export function pixelSamplerWrite(
  r: number, g: number, b: number,
  samples: number, cx: number, cy: number,
  varR: number, varG: number, varB: number
): void {
  state.r = r;
  state.g = g;
  state.b = b;
  state.samples = samples;
  state.cx = cx;
  state.cy = cy;
  state.varR = varR;
  state.varG = varG;
  state.varB = varB;
  ticks += 1;
  if (typeof window !== 'undefined') {
    (window as unknown as { __nxHarness?: unknown }).__nxHarness = {
      r, g, b, samples, cx, cy, ticks,
      varR, varG, varB
    };
  }
}
