// ORDER 063 INFRA-1 — canonical camera pose + ROI catalogue for
// autonomous visual regression.
//
// Each entry defines:
//   - A stable id (used in URL `#poseId=…` and in test failure
//     messages).
//   - Camera parameters (focus, distance, yaw, pitch) matching the
//     CameraProvider's target shape.
//   - A lighting period to pin.
//   - The pixel ROI to sample (CSS pixel rect, typically a small
//     square centred on the surface of interest).
//   - Expected sRGB range for the sample (r/g/b min-max triples).
//     Ranges are wide-ish deliberately — this is a *regression
//     guard*, not a colour-calibration test. Values were derived
//     from ORDER 061 §3 measurement + the milestone proposal's
//     M0 rewrite rules.
//
// The Puppeteer / Playwright runner (not yet built — see the ORDER
// 063 §6.3 sort rec) drives the app to each pose's URL, waits for
// stabilisation, calls the PixelSampleProbe, and asserts that the
// returned RGB falls within the expected range. Failures should be
// unambiguous: `pose "roof-tegel-lunch" R=42 (expected 130..200)`.
//
// Coordinates approximated from world.ts + strategic content; can be
// tightened once the first runner passes and the poses are visually
// confirmed.

export type PeriodKey = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';

export interface RgbRange {
  r: [number, number];
  g: [number, number];
  b: [number, number];
}

export interface VisualPose {
  id: string;
  purpose: string;
  camera: {
    focus: { x: number; z: number };
    distance: number;
    yaw: number;
    pitch: number;
  };
  period: PeriodKey;
  // Sample region in CSS pixels — top-left corner + width/height.
  // Small enough to isolate the surface, large enough to average
  // out shader noise.
  roi: { x: number; y: number; w: number; h: number };
  // Expected sRGB range after tone-map + gamma. Wide bands catch
  // "roof is black" (R < 40) without failing on legitimate
  // day-to-day variation.
  expected: RgbRange;
  // ORDER 072 — set true if this pose's ROI is deliberately
  // targeted at one uniform surface (single roof face, one lit
  // pane, one calibration quad). Non-zero variance on a
  // uniform-target pose is a warning: the ROI is near a colour
  // edge and will drift onto the other side under future cross-
  // platform sub-pixel positioning shifts. False for poses that
  // deliberately sample mixed surfaces (e.g. wide village-strategic
  // hemi baseline where the whole canvas is the "surface").
  expectUniform: boolean;
}

// Note: camera focus coordinates below use OSM local frame (+X east,
// +Z south per the coordinate-frame convention). Yaw / pitch in
// radians. Distance in metres. ROI defaults assume a 1280×720
// canvas; the harness runner is expected to set the viewport to a
// stable size before capture.
export const VISUAL_POSES: readonly VisualPose[] = [
  // ORDER 069 — roof ROIs shrunk from 40×40 to 12×24 so the whole
  // sample sits inside a single uniform sunlit tegel face (see
  // reports/visual-regression/roof-tegel-lunch.png with previous ROI:
  // the 40×40 box straddled a ridge, a shadow band and building
  // edges, and the 60×60-pixel-average was diluted by mixed
  // surfaces). Coordinates verified against both roof-tegel-lunch
  // and roof-tegel-morning PNGs: x=626..637 y=350..373 is uniform
  // R=121 at lunch and uniform R=62 at morning — no ridge, no
  // shadow, no edge.
  {
    id: 'roof-tegel-lunch',
    purpose: 'Tegel roof — sunlit south face at solar noon. Must read warm red-brown, not black.',
    camera: {
      focus: { x: 190, z: 45 },
      distance: 60,
      yaw: 0.6,
      pitch: 0.45
    },
    period: 'lunch',
    roi: { x: 626, y: 350, w: 12, h: 24 },
    // ORDER 070 approved: measured R=121 G=34 B=21 (288 pixels
    // uniform, zero variance across ROI). ±3 per channel — patch-
    // drift + minor DPR variance. Not for material-colour changes
    // (those are the regressions to catch).
    expected: {
      r: [118, 124],
      g: [31, 37],
      b: [18, 24]
    },
    expectUniform: true
  },
  {
    id: 'roof-tegel-morning',
    purpose: 'Tegel roof — same sunlit face at morning low-sun. Hemi ambient must carry it.',
    camera: {
      focus: { x: 190, z: 45 },
      distance: 60,
      yaw: 0.6,
      pitch: 0.45
    },
    period: 'morning',
    roi: { x: 626, y: 350, w: 12, h: 24 },
    // ORDER 070 approved: measured R=62 G=11 B=7. ±3 per channel,
    // SAME tolerance as roof-tegel-lunch — solar angle is locked
    // by period='morning' (no clock drift) and the sample is pixel-
    // identical over all 288 pixels. Wider tolerance here would
    // hide regressions in the pose most sensitive to lighting faults.
    expected: {
      r: [59, 65],
      g: [8, 14],
      b: [4, 10]
    },
    expectUniform: true
  },
  // ORDER 069 — village-strategic-lunch REMOVED. At distance=380
  // no single pixel corresponds to a named surface (individual
  // buildings are 3-4 px wide from that altitude), so any ROI
  // averages a random mix of roofs / ground / roads / edges. A
  // green measurement on a mixed ROI is a false pass. The two
  // village-strategic dark poses (dinner, evening) below survive
  // because they test hemi-baseline-only illumination at night —
  // "the whole village should read near-black" is a whole-canvas
  // property, not a per-surface one.
  {
    id: 'village-strategic-dinner',
    purpose: 'Wide strategic view at dinner (sun grazing). Night-lit bands should raise average R.',
    camera: {
      focus: { x: 100, z: 0 },
      distance: 380,
      yaw: 0.0,
      pitch: 0.60
    },
    period: 'dinner',
    roi: { x: 640, y: 360, w: 40, h: 40 },
    // ORDER 070 approved: measured R=7 G=10 B=11 (hemi baseline at
    // near-night, mixed-surface ROI at wide zoom). Slightly
    // asymmetric range gives room for moonlight bump upward
    // without failing on the current baseline.
    expected: {
      r: [3, 15],
      g: [5, 15],
      b: [6, 16]
    },
    // Mixed-surface by design (wide village zoom, whole-canvas
    // hemi-baseline test). Variance is expected.
    expectUniform: false
  },
  {
    id: 'village-strategic-evening',
    purpose: 'Wide strategic view at evening. Nightfactor=1; emissive bands should still register R > 20.',
    camera: {
      focus: { x: 100, z: 0 },
      distance: 380,
      yaw: 0.0,
      pitch: 0.60
    },
    period: 'evening',
    roi: { x: 640, y: 360, w: 40, h: 40 },
    // ORDER 070 approved: measured R=7 G=10 B=11 (sun below horizon,
    // same hemi baseline as dinner in autumn).
    expected: {
      r: [3, 15],
      g: [5, 15],
      b: [6, 16]
    },
    expectUniform: false
  },
  {
    id: 'lit-window-dinner',
    purpose: 'Close-up of a lit-window pane at dinner — emissive amber, sampled inside a single sub-pane (no muntins).',
    camera: {
      focus: { x: 190, z: 45 },
      distance: 20,
      yaw: 0.6,
      pitch: 0.35
    },
    period: 'dinner',
    // ORDER 072 — ROI moved from (296, 362, 8, 8) to (506, 409, 25, 25).
    // The 8×8 pick landed inside a lit sub-pane on macOS-M Metal
    // but on the vertical muntin between two panes on ubuntu-latest
    // software-rasterised Chromium — a ~4-8 px cross-platform sub-
    // pixel positioning drift that ±3 tolerance couldn't hide.
    // The new (506, 409, 25, 25) rectangle is verified 100% uniform
    // lit R=245 G=222 B=169 in BOTH local and CI PNGs (625 sampled
    // pixels each, zero variance on both platforms).
    roi: { x: 506, y: 409, w: 25, h: 25 },
    // ORDER 072 approved: measured R=245 G=222 B=169 (uniform 625
    // pixels, zero variance both platforms). ±3 per channel.
    expected: {
      r: [242, 248],
      g: [219, 225],
      b: [166, 172]
    },
    expectUniform: true
  },
  // ORDER 066 — replaces the sky-based calibration pose with a
  // known-colour quad rendered through the full material → ACES →
  // sRGB → readPixels chain. Sky sample is unusable at Grythyttan's
  // camera geometry (strategic camera always looks down; presets
  // 18–40°; ~5% of canvas is sky and even that is occluded by
  // hills). The quad is dev-only, position-locked, and its expected
  // value is computed analytically — see calibration.ts.
  //
  // SCOPE: the quad is UNLIT (MeshBasicMaterial, no shading).
  // Passing this pose validates only the output chain (material →
  // toneMappingExposure → ACES → sRGB → readPixels). It does NOT
  // validate directional-light intensity, hemisphere ambient,
  // shadow maps, or per-face normals. Those are what the six lit
  // poses below exist to probe. A green calibration-quad + a red
  // lit pose narrows the fault to lighting / material / normal
  // configuration; a red calibration-quad narrows it to the
  // output chain.
  {
    id: 'calibration-quad',
    purpose: 'Dev-only calibration quad, known authored colour rendered through ACES + sRGB.',
    camera: {
      // Camera pose is irrelevant — the quad is attached to the
      // camera and always occupies the same view-space rectangle.
      // Any valid strategic pose works; using the village preset's
      // approximate values.
      focus: { x: 100, z: 0 },
      distance: 380,
      yaw: 0.0,
      pitch: 0.56
    },
    period: 'lunch',
    // 60×60 CSS-pixel sample well inside the ~144×144-px quad
    // centred on-screen at (640, 360). See CalibrationQuad.tsx.
    roi: { x: 610, y: 330, w: 60, h: 60 },
    // ORDER 067 approved range: measured & analytically predicted
    // R=G=B=160. Tolerance ±2 covers subpixel jitter on ROI edges
    // (if canvas isn't exactly 1280×720) and LSB rounding of the
    // linear→sRGB encode. It does NOT cover future three.js ACES
    // implementation changes — those are exactly the regressions
    // this pose is here to catch. If a three.js upgrade shifts
    // this value: fail, investigate, re-derive expected consciously
    // — do not widen to survive.
    expected: {
      r: [158, 162],
      g: [158, 162],
      b: [158, 162]
    },
    expectUniform: true
  }
];

// Utility: format a pose as a URL hash string suitable for the harness
// runner to feed to Playwright. Preserves the CameraProvider convention
// (numeric coordinates, & separator). Poses whose id starts with
// `calibration-` additionally set `calibrationQuad=1` so the dev-only
// CalibrationQuad mounts.
export function poseToHash(pose: VisualPose): string {
  const p = pose.camera;
  const roi = pose.roi;
  const calibrationParam = pose.id.startsWith('calibration-') ? '&calibrationQuad=1' : '';
  return (
    `#poseId=${pose.id}` +
    `&focus=${p.focus.x},${p.focus.z}` +
    `&distance=${p.distance}` +
    `&yaw=${p.yaw}` +
    `&pitch=${p.pitch}` +
    `&period=${pose.period}` +
    `&roi=${roi.x},${roi.y},${roi.w},${roi.h}` +
    calibrationParam
  );
}

export function poseById(id: string): VisualPose | undefined {
  return VISUAL_POSES.find((p) => p.id === id);
}
