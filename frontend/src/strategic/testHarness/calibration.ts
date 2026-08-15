// ORDER 066 — calibration quad support module.
//
// One authored colour, one analytic prediction of what the pixel
// sampler should read after the full render pipeline (material →
// exposure → ACES filmic tone mapping → sRGB encoding). If measured
// ≈ predicted, the pipeline is faithful end-to-end. If they diverge,
// the divergence pinpoints where the pipeline shifted from spec.
//
// Chosen colour: `#808080` — sRGB mid-gray.
//   Grayscale is important. Three.js's ACES filmic tone map
//   applies two 3×3 matrices (RGB↔ACES) around the RRTAndODTFit
//   polynomial. Both matrices are normalised (rows sum to 1), so
//   for grayscale input they reduce to identity — the only
//   non-trivial step is the polynomial + the sRGB gamma. This
//   makes the analytic prediction robust against three.js
//   version bumps that only tune matrix coefficients.
//
// Chosen renderer exposure: 1.3 — matches StrategicScene's
// `toneMappingExposure: 1.3` (ORDER 055 Del C).
//
// Analytic pipeline for CALIBRATION_HEX at EXPOSURE, matching
// three.js's ACESFilmicToneMapping shader (r155+):
//
//   Three.js applies exposure as `color *= toneMappingExposure / 0.6`
//   inside its ACES filmic tone mapper — the `/ 0.6` normalisation
//   is undocumented in the material API but visible in
//   ShaderChunk/tonemapping_pars_fragment.glsl.js. Missing this
//   factor was the ORDER 066 first-pass error (predicted 122, real
//   160). Including it now:
//
//   1. sRGB [0,1]         = 0x80 / 255                           = 0.5020
//   2. → linear (sRGB decode, three.js SRGBColorSpace)
//         ((0.5020 + 0.055) / 1.055)^2.4                          = 0.2159
//   3. × exposure / 0.6 (1.3 / 0.6 = 2.1667)                       = 0.4678
//   4. → RRTAndODTFit (grayscale identity of the two ACES matrices) = 0.3510
//   5. → sRGB encode (linear-to-sRGB gamma)
//         1.055 · 0.3510^(1/2.4) − 0.055                           = 0.6270
//   6. × 255, rounded                                               = 160
//
// Expected read: R = 160, G = 160, B = 160.
// (First measurement 2026-08-12 was R=160 G=160 B=160 — exact match.)

export const CALIBRATION_HEX = '#808080';
export const CALIBRATION_EXPOSURE = 1.3;

/** sRGB [0, 1] → linear [0, 1]. Matches WebGL SRGBColorSpace decoding. */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear [0, 1] → sRGB [0, 1]. Matches WebGL SRGBColorSpace encoding. */
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Three.js ACES filmic — RRTAndODTFit polynomial. For grayscale
 *  input the RGB↔ACES matrices around this reduce to identity, so
 *  this alone predicts the output. Coefficients lifted from
 *  three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js */
function rrtAndOdtFit(v: number): number {
  const a = v * (v + 0.0245786) - 0.000090537;
  const b = v * (0.983729 * v + 0.432951) + 0.238081;
  return Math.max(0, Math.min(1, a / b));
}

/** Hex "#RRGGBB" → [r, g, b] with each channel in [0, 1] (sRGB). */
function hexToNormRgb(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

// Three.js's ACES filmic tone mapper normalises the exposure by 0.6
// before applying RRTAndODTFit. See ShaderChunk/tonemapping_pars_
// fragment.glsl.js. Undocumented in the material API — omitting it
// mispredicts by a factor of ~1.67× (ORDER 066 first pass mispredicted
// R=122 vs measured R=160).
const THREE_ACES_EXPOSURE_NORMALISATION = 0.6;

/** Full pipeline: authored sRGB hex → post-render sRGB byte value.
 *  Applied per channel. Grayscale input assumed — the RGB↔ACES
 *  matrices are omitted because they are identity on grayscale. */
export function computeExpectedRgb(hex: string, exposure: number): { r: number; g: number; b: number } {
  const srgb = hexToNormRgb(hex);
  const out = srgb.map((c) => {
    const linear = srgbToLinear(c);
    const exposed = linear * (exposure / THREE_ACES_EXPOSURE_NORMALISATION);
    const tonemapped = rrtAndOdtFit(exposed);
    const encoded = linearToSrgb(tonemapped);
    return Math.round(encoded * 255);
  });
  return { r: out[0], g: out[1], b: out[2] };
}

export const CALIBRATION_EXPECTED_RGB = computeExpectedRgb(CALIBRATION_HEX, CALIBRATION_EXPOSURE);
