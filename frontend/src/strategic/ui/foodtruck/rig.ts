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
// ('foodtrucken') === false` (ORDER 110 §5) speglar det i sim-lagret.

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

// ORDER 114 rev 6 — servePose(T) för STAFF vid counter.
//
// VO-fynd 2026-08-17: "Serveringen syns inte. Personalen står stilla
// i luckan, gästen står framför, ingen överlämning. I en food truck
// ÄR överlämningen verksamheten."
//
// VO refererar till "mönster 06 servera" med "dopp 0,12 m" i ett
// rörelsebibliotek som INTE finns i prototypen (grep verifierat).
// Följande servePose är författad från beskrivningen — cyklisk
// reach-and-retract där staff-figuren lutar fram över counter,
// sträcker ut nära-armen (räcker fram tallrik/påse), håller kort,
// drar tillbaka. Perioden är ~3 sim-sek så tempo läses som "aktiv
// men inte stressat". Motsvarar "mönster 06" beskrivningens dopp
// 0,12 m ≈ 22 SVG-units (vid RIG_PROTO_UNITS_PER_METER = 180.6).
//
// Notering: prototype `SIT`-poser har liknande "armFar/armNear når
// framåt"-kod (guest-reel.jsx:75-83). servePose bygger på samma idé
// men står upp (ingen hipDrop-sit-offset) och är tänkt för personal
// bakom counter — inte gäster.

export function servePose(T: number): Pose {
  // Cykelfas: 0..1 vid 3 sim-sek period.
  const period = 3;
  const phase = ((T % period) / period);
  // Reach-envelope: går från 0 → 1 → 0 över cykeln.
  // Max reach vid mitten (phase=0.5), stilla vid ändarna (0 och 1).
  // Använder halva sinus-vågen: sin(π * phase).
  const reach = Math.sin(Math.PI * phase);
  // Dopp ("nedsjunkning") i höften när armen sträcker sig — 22 units
  // motsvarar VO-referensens 0,12 m.
  const DIP_UNITS = 22;
  return {
    ...IDLE,
    lean: 4 + 6 * reach,        // lutar fram över counter
    head: 2 + 4 * reach,         // huvud tilltar när räcker fram
    hipDrop: DIP_UNITS * reach,  // sjunker i knäna vid reach
    mouth: 0,
    // Nära-armen (den vi ser tydligast i luckan) sträcker sig framåt.
    // Positivt värde = svänger framåt. 90° = rakt fram horisontellt.
    armNear: [80 * reach, -15 - 20 * reach],
    // Bortre armen mindre synligt aktiv (håller tallrik / stödjer sig
    // mot counter).
    armFar: [30 + 20 * reach, -25 - 10 * reach],
    legNear: IDLE.legNear,
    legFar: IDLE.legFar
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
// FIGUR-PROPORTIONER — härledda från prototypens Guest-komponent
// -----------------------------------------------------------------------------
//
// Prototypens `Guest` (`guest-reel.jsx:87-148`) definierar figuren med
// hårdkodade SVG-enheter i sitt lokala koordinatsystem. Referens-
// punkterna nedan är avläst DIREKT ur prototypens rect-attribut, inte
// gissade. Härledda mått (spacing, safety-margin, css-omvandling) i
// FoodtruckScene.tsx MÅSTE använda dessa konstanter — inga magic
// numbers om torso-bredd/höjd på anropssidan.
//
// **Prototypens grundgeometri** (från Guest-komponentens rad-nummer):
//   * Torso: `rect x=-31 y=-112 width=62 height=112` → 62 wide, 112 tall
//   * Head-face: `rect x=-27 y=-70 width=54 height=58` (i huvud-frame
//     som är translate(0,-112)) → 54 wide, 58 tall
//   * Nacke: rect x=-11 y=-16 width=22 height=18 → 22 wide, 18 tall
//   * Ben (per ben): övre 60 + nedre 62 + fot 12 = 134 units totalt
//   * Arm (per arm): övre 48 + nedre 44 + hand 15 = 107 units totalt
//     (relevant för max-arm-swing-bredd)
//   * Head-topping: sträcker sig från y=-70 upp till y=-86 (16 units
//     ovanför face) → head-topping-topp vid y=-198 (i figure-frame:
//     -112 - 86 = -198)
//
// **Total figur-höjd** från fot (y=0) till hattens/frisyrens topp:
//   134 (ben) + 112 (torso) + 86 (head-topping ovanför torso) = 332 units
//   Utan topping (t.ex. shortCut): 134 + 112 + 70 = 316 units
//
// **Kalibrering mot verkligheten:** VO 2026-08-17 anger att prototypens
// referens-humanoid = 1,75 m vid ~304 SVG-units. Vår mätta figure-höjd
// (316-332) är i samma härad — små avvikelser beror på topping-varianter
// och prototypens stiliserade proportioner (huvudet är avsiktligt större
// än realistiskt för läsbarhet på håll — se HEAD_STYLIZATION_RATIO
// nedan).
//
// **Head:body-proportion är stiliserad — inte realistisk:**
// Prototypens head 54 units wide vs torso 62 units wide = 0.87 ratio.
// Verklig människa: skallbredd ~15 cm vs shoulder-bredd ~45 cm = 0.33.
// Prototypens huvud är alltså ~2,6× större relativt kroppen än en
// verklig människa. Detta är ett designval i prototypen (större huvud
// = mer ansiktsyta att läsa uttryck på); INTE en bug i vår rendering.
// Konsekvens: figurerna får "big-head-cartoon"-look som är avsiktlig.
// Om VO senare vill korrigera mot realistisk proportion är det egen
// order som ändrar Figure.tsx:s Head-komponent — inte något vår
// spacing- eller scale-logik ska kompensera för.

export const RIG_PROTO_TORSO_WIDTH = 62;
export const RIG_PROTO_TORSO_HEIGHT = 112;
export const RIG_PROTO_HEAD_WIDTH = 54;
export const RIG_PROTO_HEAD_HEIGHT = 58;
export const RIG_PROTO_LEG_HEIGHT = 134;              // 60 + 62 + 12
export const RIG_PROTO_ARM_LENGTH = 107;              // 48 + 44 + 15
export const RIG_PROTO_TOTAL_HEIGHT = 316;            // ben + torso + head (utan topping)
export const RIG_PROTO_REFERENCE_METERS = 1.75;       // VO 2026-08-17: 1,75 m human
export const RIG_PROTO_UNITS_PER_METER =
  RIG_PROTO_TOTAL_HEIGHT / RIG_PROTO_REFERENCE_METERS;  // ~180.6

// Max horisontell utsträckning inkl arm-swing. walkPose:s armNear[0]
// når ±26° vid amp=1.0. En arm rooted vid shoulder (translate(0,-96))
// med total arm-längd 107, roterad 26°, når horisontellt:
//   107 * sin(26°) ≈ 47 units
// Kombinerat med torso-halvbredd 31: figur-halvbredd i värsta fall =
// 31 + 47 = 78. Full bredd = 156 units vid amp=1.0.
// Idle-pose eller walkPose amp<0.5 minskar detta men vi budgeterar
// för worst-case så spacing-heuristiken alltid håller.
export const RIG_PROTO_MAX_WIDTH_AT_SCALE_1 = 156;

// Head:body-stilisering — dokumenterad ratio (se kommentar ovan).
// Exponerad som konstant så framtida test kan asserta att om vi
// någonsin ändrar figure-geometrin, förhållandet bevaras (eller
// medvetet ändras via egen order).
export const HEAD_STYLIZATION_RATIO =
  RIG_PROTO_HEAD_WIDTH / RIG_PROTO_TORSO_WIDTH;   // 0.87

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
