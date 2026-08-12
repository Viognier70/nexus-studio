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
}

// Note: camera focus coordinates below use OSM local frame (+X east,
// +Z south per the coordinate-frame convention). Yaw / pitch in
// radians. Distance in metres. ROI defaults assume a 1280×720
// canvas; the harness runner is expected to set the viewport to a
// stable size before capture.
export const VISUAL_POSES: readonly VisualPose[] = [
  {
    id: 'roof-tegel-lunch',
    purpose: 'Tegel roof at solar noon — south face should read as warm red-brown, not black.',
    camera: {
      focus: { x: 190, z: 45 },   // approximate Vinbaren area
      distance: 60,
      yaw: 0.6,
      pitch: 0.45
    },
    period: 'lunch',
    roi: { x: 620, y: 340, w: 40, h: 40 },
    expected: {
      r: [110, 220],
      g: [60, 160],
      b: [40, 130]
    }
  },
  {
    id: 'roof-tegel-morning',
    purpose: 'Same tegel roof at morning low-sun — must not read as black; hemi ambient carries it.',
    camera: {
      focus: { x: 190, z: 45 },
      distance: 60,
      yaw: 0.6,
      pitch: 0.45
    },
    period: 'morning',
    roi: { x: 620, y: 340, w: 40, h: 40 },
    expected: {
      r: [70, 200],
      g: [40, 150],
      b: [30, 120]
    }
  },
  {
    id: 'village-strategic-lunch',
    purpose: 'Wide strategic view at lunch. Guards against whole-village black-out regression.',
    camera: {
      focus: { x: 100, z: 0 },
      distance: 380,
      yaw: 0.0,
      pitch: 0.60
    },
    period: 'lunch',
    roi: { x: 640, y: 360, w: 40, h: 40 },
    expected: {
      r: [50, 220],
      g: [50, 220],
      b: [40, 210]
    }
  },
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
    expected: {
      r: [20, 190],
      g: [15, 170],
      b: [10, 160]
    }
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
    expected: {
      r: [5, 160],
      g: [5, 150],
      b: [5, 160]
    }
  },
  {
    id: 'lit-window-dinner',
    purpose: 'Close-up of a lit-window band at dinner. Emissive should push R well above ambient.',
    camera: {
      focus: { x: 190, z: 45 },
      distance: 20,
      yaw: 0.6,
      pitch: 0.35
    },
    period: 'dinner',
    roi: { x: 620, y: 340, w: 40, h: 40 },
    expected: {
      r: [80, 255],
      g: [50, 220],
      b: [30, 180]
    }
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
    }
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
