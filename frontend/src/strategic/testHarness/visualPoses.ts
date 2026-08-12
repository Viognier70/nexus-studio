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
      pitch: -0.45
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
      pitch: -0.45
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
      pitch: -0.60
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
      pitch: -0.60
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
      pitch: -0.60
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
      pitch: -0.25
    },
    period: 'dinner',
    roi: { x: 620, y: 340, w: 40, h: 40 },
    expected: {
      r: [80, 255],
      g: [50, 220],
      b: [30, 180]
    }
  },
  {
    id: 'sky-morning',
    purpose: 'Sky calibration sample — probe verification. Warm-tan atmosphere at low sun.',
    camera: {
      focus: { x: 100, z: 0 },
      distance: 100,
      yaw: 0.0,
      pitch: 0.05   // tilt slightly UP so ROI at centre lands on sky
    },
    period: 'morning',
    roi: { x: 620, y: 200, w: 40, h: 40 },
    expected: {
      r: [140, 230],
      g: [110, 200],
      b: [80, 180]
    }
  }
];

// Utility: format a pose as a URL hash string suitable for the harness
// runner to feed to Puppeteer. Preserves the CameraProvider convention
// (numeric coordinates, & separator).
export function poseToHash(pose: VisualPose): string {
  const p = pose.camera;
  const roi = pose.roi;
  return (
    `#poseId=${pose.id}` +
    `&focus=${p.focus.x},${p.focus.z}` +
    `&distance=${p.distance}` +
    `&yaw=${p.yaw}` +
    `&pitch=${p.pitch}` +
    `&period=${pose.period}` +
    `&roi=${roi.x},${roi.y},${roi.w},${roi.h}`
  );
}

export function poseById(id: string): VisualPose | undefined {
  return VISUAL_POSES.find((p) => p.id === id);
}
