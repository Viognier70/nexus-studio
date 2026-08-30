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
  // TEMPORÄR växel (SD-003 rev. 2 rekognosering, Vision Owner-begäran
  // 2026-08-15) — bara för att se DollhouseFrame utan att ha byggt
  // riktig montering. Aktiveras med `#playtest=1&dollhouse=1`. Ingen
  // permanent koppling; den riktiga inflätningen hör till food truck-
  // ordern (SD-003 §8 följdorder 3). Kräver playtest=1 för att fungera
  // — annars ignoreras flaggan, så vanliga URL:er inte kan snubbla in
  // i dockskåpsvyn av misstag.
  dollhouse: boolean;
  // TEMPORÄR dev-shortcut (Vision Owner-begäran 2026-08-16): sätter
  // `state.businessClass` direkt vid init i stället för att kräva att
  // spelaren övar krediter i Metodköket och går via bankmötet. Läses
  // av SimulationProvider och applyDevBusinessOverride. Aktiveras med
  // `#playtest=1&business=foodtruck` (eller `restaurant`/`värdshus`).
  // Kräver playtest=1 — utan den flaggan ignoreras business= så vanliga
  // URL:er inte kan flippa verksamheten av misstag. `null` = ingen
  // override, initial-state:t behåller sin default ('kvarterskrogen'). Ingen
  // permanent koppling; hör till dev-verktygsraden tills en riktig
  // ny-spel-flow bygg (senare order).
  business: 'kvarterskrogen' | 'foodtrucken' | 'gästgiveriet' | 'ölkrogen' | null;
  // ORDER 113 DoD 7/8 — dev-only seed för food truck-benchmark. När satt
  // och business=foodtruck, injicerar SimulationProvider N fake "waiting"-
  // gäster i initial-state:t så skärmdumpen och fps-mätningen har en
  // fylld kö att arbeta med utan att simulera fram organiska arrivals.
  // `null` = ingen seed. Kräver playtest=1.
  foodtruckSeed: number | null;
  // ORDER 115 §4 — dev-only flagga för att aktivera uteplats-fasen
  // (paying → eating → leaving). Aktiveras med `#playtest=1&uteplats=1`.
  // Riktig upplåsning väntar på VO-beslut om tröskelvärde (§4.3).
  // Sätts på policies.hasUteplats i applyDevFoodtruckSeed.
  uteplats: boolean;
}

function parseHash(): ParsedParams {
  if (typeof window === 'undefined') {
    return {
      period: DEFAULT_PERIOD_OVERRIDE,
      camera: DEFAULT_CAMERA_OVERRIDE,
      roi: DEFAULT_ROI,
      poseId: DEFAULT_POSE_ID,
      calibrationQuad: false,
      playtest: false,
      dollhouse: false,
      business: null,
      foodtruckSeed: null,
      uteplats: false
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
  // dollhouse-växeln kräver playtest=1 — annars ignoreras den.
  const dollhouse = playtest && params.get('dollhouse') === '1';
  // business= dev-shortcut kräver också playtest=1 — vanliga URL:er
  // ska inte kunna flippa verksamhetsklassen av misstag.
  const business = parseBusiness(playtest ? params.get('business') ?? null : null);
  const foodtruckSeed = playtest ? parseFoodtruckSeed(params.get('foodtruckSeed') ?? null) : null;
  const uteplats = playtest && params.get('uteplats') === '1';
  return { period, camera, roi, poseId, calibrationQuad, playtest, dollhouse, business, foodtruckSeed, uteplats };
}

function parseFoodtruckSeed(s: string | null): number | null {
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Cap at capacity ceiling so a runaway URL doesn't spawn thousands.
  return Math.min(n, 30);
}

function parseBusiness(s: string | null): 'kvarterskrogen' | 'foodtrucken' | 'gästgiveriet' | 'ölkrogen' | null {
  if (!s) return null;
  const v = s.toLowerCase();
  // ORDER 140 — nya bestämd-form-nycklarna är primära; gamla namnen
  // (restaurant / foodtruck / värdshus) accepteras som aliaser så
  // äldre playtest-URL:er inte tystas.
  if (v === 'kvarterskrogen' || v === 'restaurang' || v === 'restaurant') return 'kvarterskrogen';
  if (v === 'foodtrucken' || v === 'foodtruck' || v === 'food-truck' || v === 'food_truck') return 'foodtrucken';
  if (v === 'gästgiveriet' || v === 'värdshus' || v === 'vardshus' || v === 'varshus') return 'gästgiveriet';
  // ORDER 125 §3 — ölkrogen valbar via URL för dev-verifikation.
  if (v === 'ölkrogen' || v === 'olkrogen' || v === 'brewpub') return 'ölkrogen';
  return null;
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
