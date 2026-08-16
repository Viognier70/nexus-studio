// ORDER 113 §2.3 — riggkoden för food truckens figurer.
//
// Kopierad, inte importerad, ur
// `documentation/prototypes/staff-guest-reel-extended/guest-reel.jsx`
// per SD-003 rev. 2 §3-anmärkningen. Prototypen använder window-globala
// Framer-tooling (`Easing`, `interpolate`, `animate`); här är
// pose-matematiken portad till ren TypeScript utan external deps.
//
// **Vinklar i grader.** Positiva värden svänger figuren framåt (+x).
// Skalning från pose till SVG-transform sker i `Figure.tsx` (rendrings-
// lagret); denna modul räknar bara pose-värden ur en tidsvariabel.
//
// **Kopierade prototyp-konstanter:**
// - IDLE-basen (rad 39 i prototypen)
// - idlePose(T) — subtil andning (rad 41-44)
// - walkPose(ph, amp) — gång-cykel med knä-böj (rad 46-59)
// - blend() över POSE_KEYS + LIMB_KEYS (rad 26-35)
// - lerp, clamp01 (rad 21-22)
//
// **Ej portat:** sittposer (SIT, SIT_MENU, sitHail, sitWait, sitEat) —
// food trucken har ingen sittfas per SD-003 §3. `businessHasSeats
// ('foodtruck') === false` (ORDER 110 §5) speglar det i sim-lagret.

// Pose-vokabulär. `POSE_KEYS` är skalära pose-parametrar (lutning,
// huvud, hip-drop, mun); `LIMB_KEYS` är par [hip-vinkel, knä-vinkel]
// per arm/ben. Samma struktur som prototypen så jämförelser mellan
// spelets rig och prototypens är triviala.
export const POSE_KEYS = ['lean', 'head', 'hipDrop', 'mouth'] as const;
export const LIMB_KEYS = ['armFar', 'armNear', 'legFar', 'legNear'] as const;

export type PoseKey = (typeof POSE_KEYS)[number];
export type LimbKey = (typeof LIMB_KEYS)[number];

export interface Pose {
  lean: number;
  head: number;
  hipDrop: number;
  mouth: number;
  armFar: [number, number];
  armNear: [number, number];
  legFar: [number, number];
  legNear: [number, number];
}

// Rena matematiska helpers. Från prototypen (rad 21-22).
export function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// Blenda mellan två poser med koefficient k i [0, 1]. Kopplad linjärt
// per POSE_KEY och per LIMB_KEY-komponent. Från prototypen (rad 26-35).
export function blend(a: Pose, b: Pose, k: number): Pose {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const out: Pose = {
    lean: lerp(a.lean, b.lean, k),
    head: lerp(a.head, b.head, k),
    hipDrop: lerp(a.hipDrop, b.hipDrop, k),
    mouth: lerp(a.mouth, b.mouth, k),
    armFar: [lerp(a.armFar[0], b.armFar[0], k), lerp(a.armFar[1], b.armFar[1], k)],
    armNear: [lerp(a.armNear[0], b.armNear[0], k), lerp(a.armNear[1], b.armNear[1], k)],
    legFar: [lerp(a.legFar[0], b.legFar[0], k), lerp(a.legFar[1], b.legFar[1], k)],
    legNear: [lerp(a.legNear[0], b.legNear[0], k), lerp(a.legNear[1], b.legNear[1], k)]
  };
  return out;
}

// -----------------------------------------------------------------------------
// Base-poser
// -----------------------------------------------------------------------------

// IDLE-poseringen — figuren står stilla. Prototypen rad 39.
export const IDLE: Pose = {
  lean: 1,
  head: 0,
  hipDrop: 0,
  mouth: 0,
  armFar: [5, -9],
  armNear: [-4, -11],
  legFar: [3, -4],
  legNear: [-3, -3]
};

// idlePose(T) — subtil andnings/vikt-skiftning över tid. Prototypen
// rad 41-44. Sinusar med olika frekvenser förskjuter hip-drop och
// huvud oberoende — läses som "figuren är på plats, andas".
export function idlePose(T: number): Pose {
  const b = Math.sin(T * 1.7);
  return {
    ...IDLE,
    hipDrop: 1.6 + 1.6 * b,
    head: 1.6 * Math.sin(T * 1.1),
    lean: 1 + 0.6 * b
  };
}

// walkPose(ph, amp) — gång-cykel. `ph` = fas i [0, 1] (en full cykel).
// `amp` = amplitud för lem-svängar (0 = ingen rörelse, 1 = full gång).
// Prototypen rad 46-59.
//
// Knä-böj (`kn`) triggas när benet är i "swing"-fas (positiva sinus-
// halvor); `Math.max(0, sin(...))` klipper bort stödfasen så knäet
// bara böjs när benet lyfts.
export function walkPose(ph: number, amp: number): Pose {
  const s = Math.sin(2 * Math.PI * ph);
  const kn = (offset: number): number => -10 - 30 * Math.max(0, Math.sin(2 * Math.PI * (ph + offset) + 1.15));
  return {
    lean: 5.5,
    head: -2.5 + 1.6 * s,
    hipDrop: 4 * Math.abs(s),
    mouth: 0,
    legNear: [26 * amp * s, kn(0)],
    legFar: [-26 * amp * s, kn(0.5)],
    armNear: [-26 * amp * s, -20 - 12 * Math.max(0, s)],
    armFar: [26 * amp * s, -20 - 12 * Math.max(0, -s)]
  };
}

// -----------------------------------------------------------------------------
// Färgpalett (från prototypen, rad 7-12)
// -----------------------------------------------------------------------------

export const RIG_INK = '#201e1d';
export const RIG_FAR = '#8f8a89';
export const RIG_ACCENT = '#ec3013';
export const RIG_GROUND = '#f3f2f2';
export const RIG_LINE = '#d5d2d1';

// -----------------------------------------------------------------------------
// Fig-variant (huvud-topping). Bevaras från prototypen för visuell
// mångfald i kön — utan variation läses figurerna som identiska pucks.
// -----------------------------------------------------------------------------

export type FigureVariant = 'plain' | 'Cap' | 'Bun';

// Deterministisk variant per gäst-id, så samma id alltid får samma
// hatt (viktigt för fixed-seed-harnessen). Enkel FNV-1a-hash-mod-3.
export function variantForId(id: string): FigureVariant {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % 3;
  return (['plain', 'Cap', 'Bun'] as const)[idx];
}
