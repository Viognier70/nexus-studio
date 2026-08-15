// ORDER 063 INFRA-1 — URL hash parameters for the visual-regression
// harness.
//
// The harness works by driving Puppeteer / Playwright to a
// pre-authored URL that pins the camera, the sun elevation, and the
// pixel-sample ROI to known values, then reading the framebuffer.
// This module parses those parameters from `window.location.hash`
// once at import time and exposes typed getters. Nothing in this
// module runs a browser; it's just the read-side of the contract.
//
// Existing convention (CameraContext): `#preset=village|district|business`.
// This module preserves that convention and adds:
//
//   #period=morning|lunch|afternoon|dinner|evening
//       Force the lighting period regardless of sim state. Read by
//       DayLighting when set. Dev-only.
//
//   #focus=X,Z                     — camera focus (world units)
//   #distance=D                    — camera distance
//   #yaw=A                         — camera yaw (radians)
//   #pitch=A                       — camera pitch (radians)
//       Explicit camera state override, applied at CameraProvider
//       mount if all four are present. Overrides #preset.
//
//   #roi=X,Y,W,H
//       Region of interest for the pixel sampler, in CSS pixels.
//       X/Y = top-left corner; W/H = width/height. Read by
//       PixelSampleProbe; defaults to the screen centre 7×7 region.
//
//   #poseId=ID
//       Identifier of a canonical pose from visualPoses.ts. Passed
//       through to the pixel-sampler readout so a harness runner can
//       correlate the pixel read with the intended pose without
//       parsing the coordinate params separately.
//
// All params are dev-only. In a prod build the URL is expected to
// carry none of them; the module returns the defaults.

const DEFAULT_PERIOD_OVERRIDE = null;
const DEFAULT_CAMERA_OVERRIDE = null;
const DEFAULT_ROI = null;
const DEFAULT_POSE_ID = null;

export interface CameraOverride {
  focus: { x: number; z: number };
  distance: number;
  yaw: number;
  pitch: number;
}

export interface RoiRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PeriodOverride = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | null;

interface ParsedParams {
  period: PeriodOverride;
  camera: CameraOverride | null;
  roi: RoiRect | null;
  poseId: string | null;
  // ORDER 066 — dev-only visible calibration quad. When true, a
  // known-colour mesh renders through the full pipeline and covers
  // the screen centre so the pixel sampler has a deterministic
  // ground-truth target that doesn't depend on scene lighting.
  calibrationQuad: boolean;
  // ORDER 081 — playtest mode. When true, hides diagnostic overlays
  // (crosshair + pixel-sample probe line) so the Vision Owner can
  // judge whether the game feels good without dev noise on top.
  // CalibrationQuad is already default-off (requires its own param).
  // DevPanel's day/period/cash lines stay — those are useful in a
  // debrief. Only the aiming reticle + pixel readout drop.
  playtest: boolean;
}

function parseHash(): ParsedParams {
  if (typeof window === 'undefined') {
    return {
      period: DEFAULT_PERIOD_OVERRIDE,
      camera: DEFAULT_CAMERA_OVERRIDE,
      roi: DEFAULT_ROI,
      poseId: DEFAULT_POSE_ID,
      calibrationQuad: false,
      playtest: false
    };
  }
  const hash = window.location.hash.replace('#', '');
  const params = new Map<string, string>();
  for (const pair of hash.split('&')) {
    const [k, v] = pair.split('=');
    if (k && v !== undefined) params.set(k, v);
  }
  const period = parsePeriod(params.get('period') ?? null);
  const camera = parseCamera(
    params.get('focus') ?? null,
    params.get('distance') ?? null,
    params.get('yaw') ?? null,
    params.get('pitch') ?? null
  );
  const roi = parseRoi(params.get('roi') ?? null);
  const poseId = params.get('poseId') ?? null;
  const calibrationQuad = params.get('calibrationQuad') === '1';
  const playtest = params.get('playtest') === '1';
  return { period, camera, roi, poseId, calibrationQuad, playtest };
}

function parsePeriod(s: string | null): PeriodOverride {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === 'morning' || v === 'lunch' || v === 'afternoon' || v === 'dinner' || v === 'evening') {
    return v;
  }
  return null;
}

function parseCamera(
  focus: string | null,
  distance: string | null,
  yaw: string | null,
  pitch: string | null
): CameraOverride | null {
  if (!focus || !distance || !yaw || !pitch) return null;
  const focusParts = focus.split(',').map((s) => Number.parseFloat(s));
  if (focusParts.length !== 2 || focusParts.some((n) => !Number.isFinite(n))) return null;
  const d = Number.parseFloat(distance);
  const y = Number.parseFloat(yaw);
  const p = Number.parseFloat(pitch);
  if (!Number.isFinite(d) || !Number.isFinite(y) || !Number.isFinite(p)) return null;
  return {
    focus: { x: focusParts[0], z: focusParts[1] },
    distance: d,
    yaw: y,
    pitch: p
  };
}

function parseRoi(s: string | null): RoiRect | null {
  if (!s) return null;
  const parts = s.split(',').map((v) => Number.parseFloat(v));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

// Parse once at module load. Callers get consistent values across the
// session; a re-parse would require a full page reload anyway because
// CameraProvider and DayLighting read at mount.
const cached = parseHash();

export const harnessParams: Readonly<ParsedParams> = cached;
