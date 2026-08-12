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
  cy: 0
};

export const pixelSampler = {
  get r(): number { return state.r; },
  get g(): number { return state.g; },
  get b(): number { return state.b; },
  get samples(): number { return state.samples; },
  get cx(): number { return state.cx; },
  get cy(): number { return state.cy; }
};

export function pixelSamplerWrite(r: number, g: number, b: number, samples: number, cx: number, cy: number): void {
  state.r = r;
  state.g = g;
  state.b = b;
  state.samples = samples;
  state.cx = cx;
  state.cy = cy;
}
