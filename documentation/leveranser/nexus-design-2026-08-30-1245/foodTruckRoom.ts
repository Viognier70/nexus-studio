// foodTruckRoom — food truck: tre fordonsvarianter, lucka och kö.
//
// SUPERSEDING_DIRECTIVE_004 §6.1. Formmall: brewpubRoom.ts.
//
// Kontrakt: ren three.js, primitiver, inga externa beroenden, ingen
// skinning, inga loaders, inga binära assets. Byggs imperativt EN gång.
// Ingen egen klocka — både luckans öppningsgrad och hjulens rotation
// drivs av värden anroparen skickar in. Ingen simuleringslogik.
//
// ═══════════════════════════════════════════════════════════════════
// 1. TRE VARIANTER, ÅTSKILDA I PLANFORM
// ═══════════════════════════════════════════════════════════════════
//
// En food truck är en ombyggd bil. Referensbilderna ger tre familjer,
// och de skiljs åt av hur de läses UPPIFRÅN — inte av nosens rundning
// eller sidans räfflor, som kameran aldrig ser:
//
//   'hVan'   KLASSIKERN. Citroën H-typ. Kort (5,0 m), en enda volym
//            med avsmalnande nos, så planformen är ett rundat trapets.
//            Luckan är en STYV panel som fälls upp och blir markis —
//            det är samma bräda, inte två delar. Fyra hjul.
//
//   'boxVan' BOXVAGNEN. Lång (7,2 m), rätvinklig i plan, TVILLINGAXEL
//            bak — sex hjul. Skyltlådan på taket är en egen ljus
//            rektangel uppifrån och variantens starkaste kännetecken.
//            Markisen är tygduk på ram, inte en fälld lucka.
//
//   'cabBox' HYTT OCH BOX. Separat hytt framför ett högre skåp, så
//            planformen är TVÅ rektanglar med ett hopp i höjd emellan.
//            Den enda av de tre som inte läser som en enda kropp.
//
// Färgen är fri per variant (`liveryColour`), men tonsteget mellan tak
// och markis räknas ur den — se avsnitt 3.
//
// ═══════════════════════════════════════════════════════════════════
// 2. DE KÖR. TVÅ TILLSTÅND, INTE ETT
// ═══════════════════════════════════════════════════════════════════
//
// Vagnarna konkurrerar med de fasta verksamheterna genom att flytta
// sig, och då måste geometrin ha ett färdläge:
//
//   room.group är FORDONET och room.pitch är TORGPLATSEN. Två
//   grupper, två placeringar: vid parkering står de på samma punkt,
//   under färd lämnar fordonet platsen kvar.
//
//   updateFoodTruckRoom(room, open)   0 = färd, 1 = servering.
//     Fäller markisen, drar in serveringshyllan och lyfter stödbenen.
//     Vid open = 0 håller fordonet sitt transportmått.
//
//   setTruckDrive(room, distanceM, steer)
//     Snurrar hjulen ur TILLRYGGALAGD STRÄCKA, inte ur väggklockan —
//     samma disciplin som poseWalk i figureRig. Ett hjul som snurrar
//     mot en stillastående vagn är värre än ett som står still.
//     `steer` vrider framhjulen.
//
//   advanceAlongPath(path, distance)
//     Position och kurs längs en vägpolylinje. Vagnen är den enda
//     verksamhet som rör sig, så funktionen hör här och inte i
//     sim-lagret — men VILKEN väg, och när, är sim-lagrets sak.
//     Se FLAGS.routeState.
//
// ═══════════════════════════════════════════════════════════════════
// 3. LÄSBARHET UPPIFRÅN
// ═══════════════════════════════════════════════════════════════════
//
// Luckan sitter i en lodrät vägg och ger noll pixlar från strategisk
// höjd — samma problem som glaspartiet i ölkrogen och DJ-pulten i
// vinbaren, och det löses med vågräta ytor:
//
//   1. MARKISEN, i ett LJUSARE steg av liveryn än taket. Delar de
//      material smälter de två planen till ett rakt ovanifrån (mätt
//      skillnad 2/255) och signalen försvinner.
//   2. KÖN — en ordnad rad kroppar.
//   3. SERVERINGSMATTAN med kantlist, som också är vagnens enda kända
//      markyta. Se FLAGS.noFloorZone.
//
// Taket bär liveryn: samma resonemang som hjässan i figureRig.
//
// ── Koordinater ───────────────────────────────────────────────────
//   lokal +X = fordonets längdriktning, fram är +X
//   lokal +Z = ut från serveringssidan, mot kön
//   origo    = fordonets mittpunkt i planet, marknivå y = 0

import * as THREE from 'three';

// #region types

export type Vec2 = [number, number];
export type TruckVariant = 'hVan' | 'boxVan' | 'cabBox';
export type QueueKind = 'order' | 'collect' | 'stand';

export interface QueueSlot {
  id: string;
  kind: QueueKind;
  index: number;
  local: Vec2;
  facing: number;
}

export interface StaffStation {
  id: string;
  local: Vec2;
  /** Vagngolvet, inte marken. */
  standHeight: number;
  facing: number;
  uniform: string;
  note: string;
}

export interface TruckParts {
  awning: THREE.Object3D;
  body: THREE.Object3D;
  roofPanel: THREE.Object3D;
  galley: THREE.Object3D;
  apron: THREE.Object3D;
  /** Serveringshyllan — dras in i färdläge. */
  shelf: THREE.Object3D;
  /** Stödbenen — lyfts i färdläge. */
  jacks: THREE.Object3D[];
  /** Hjulens spinner-grupper. Rullningen läggs på deras rotation.y. */
  wheels: THREE.Object3D[];
  /** Framhjulen, för styrning. */
  steerWheels: THREE.Object3D[];
  handoffAnchor: THREE.Object3D;
  galleyAnchor: THREE.Object3D;
}

export interface FoodTruckOptions {
  variant?: TruckVariant;
  queueLength?: number;
  liveryColour?: string;
  /** Anvisad yta [bredd, djup]. Vagnen har ingen OBB. */
  site?: Vec2;
}

export interface FoodTruckRoom {
  /** Fordonet. Flyttas längs vägen. */
  group: THREE.Group;
  /** Torgplatsen: serveringsmattan med kantlist. Ligger KVAR när
   *  vagnen kör vidare — lägg den i scenen och placera den där
   *  platsen är, inte där fordonet är. */
  pitch: THREE.Group;
  variant: TruckVariant;
  parts: TruckParts;
  queue: QueueSlot[];
  staffStations: StaffStation[];
  orderPoint: Vec2;
  handoffPoint: Vec2;
  exitPoint: Vec2;
  crewDoor: Vec2;
  length: number;
  width: number;
  /** Vagngolvets höjd över mark. Skiljer sig mellan varianterna. */
  floorY: number;
  fits: boolean;
  shortfall: Vec2;
  dispose: () => void;
}

// #endregion types

export const TOTAL_SEATS = 0;
export const DEFAULT_QUEUE_LENGTH = 8;
export const MIN_WIDTH_M = 12.4;
export const MIN_DEPTH_M = 5.2;
export const EYE_STANDING_M = 1.66;

/**
 * Varianternas mått. Varje rad är ett verkligt fordon, och varje
 * bredd håller sig under 2,60 m så de är road-legala på Rv 244 i
 * färdläge.
 */
export const VARIANTS: {
  [k: string]: {
    label: string;
    length: number;
    width: number;
    floorY: number;
    innerHeight: number;
    hatchWidth: number;
    awningReach: number;
    /** true = luckan ÄR markisen, en styv panel som fälls upp. */
    liftGate: boolean;
    axles: number[];
    wheelR: number;
    /** Skyltlåda på taket? Boxvagnens kännetecken. */
    roofSign: boolean;
    /** Separat hytt framför skåpet? */
    separateCab: boolean;
    livery: string;
    note: string;
  }
} = {
  hVan: {
    label: 'Klassikern',
    length: 5.0, width: 2.05, floorY: 0.42, innerHeight: 1.92,
    hatchWidth: 2.2, awningReach: 1.5, liftGate: true,
    axles: [-1.55, 1.55], wheelR: 0.33,
    roofSign: false, separateCab: false,
    livery: '#3f7f9c',
    note: 'Citroën H-typ. En volym med avsmalnande nos; luckan fälls upp och ÄR markisen.'
  },
  boxVan: {
    label: 'Boxvagnen',
    length: 7.2, width: 2.40, floorY: 0.62, innerHeight: 2.30,
    hatchWidth: 3.4, awningReach: 1.7, liftGate: false,
    axles: [-2.55, 1.85, 2.75], wheelR: 0.36,
    roofSign: true, separateCab: false,
    livery: '#26262b',
    note: 'Lång, rätvinklig, tvillingaxel bak. Skyltlådan på taket är variantens kännetecken uppifrån.'
  },
  cabBox: {
    label: 'Hytt och box',
    length: 6.0, width: 2.30, floorY: 0.58, innerHeight: 2.10,
    hatchWidth: 2.6, awningReach: 1.6, liftGate: false,
    axles: [-1.95, 1.95], wheelR: 0.35,
    roofSign: false, separateCab: true,
    livery: '#b8452c',
    note: 'Separat hytt framför ett högre skåp — två rektanglar i plan, den enda som inte läser som en kropp.'
  }
};

export const TRUCK_VARIANTS: TruckVariant[] = ['hVan', 'boxVan', 'cabBox'];

const HATCH_SILL = 1.30;
const HATCH_HEAD = 2.15;
const SHELF_Y = 1.15;
const SHELF_DEPTH = 0.32;
const GALLEY_COUNTER_Y = 1.50;
const AWNING_Y = 2.45;
const QUEUE_STANDOFF = 1.90;
const QUEUE_PITCH = 0.75;

/**
 * SERVERINGSGEOMETRIN. Ett fordon har ett chassi, och chassit lyfter
 * personalen: med vagngolvet på 0,42–0,62 m står en 1,70 m lång person
 * med ögonen på 2,08–2,28 m mot gästens 1,66. Personalen tittar NED.
 * Det är vad en food truck är, och det är därför luckor känns höga.
 *
 * Men en disk på bekväm arbetshöjd inuti hamnar då i gästens ögonhöjd.
 * Därför två ytor, som verkliga vagnar har: inre disk 1,50 m över mark
 * (arbetshöjd) och yttre hylla 1,15 m (gästens). Luckans underkant på
 * 1,30 ligger mellan dem.
 *
 * Raycastat mot scenen ser gästen både besättningen och pentryt — men
 * båda arbetsytorna ligger under hennes öga och ses kant-i-kant.
 * Luckan visar BESÄTTNINGEN, inte processen. Det är en annan sorts
 * öppenhet än ölkrogens tankar och vinbarens flaskhylla, som båda
 * reser sig över gästens öga.
 */
export const SERVE_NOTE =
  'Inre disk 1,50, luckans underkant 1,30, yttre hylla 1,15. Personalen står på vagngolvet.';

// ---------- Palett ----------

/** Serveringsmattan: vald ur bandet BAKLÄNGES. Garment ligger på
 *  L ≈ 0,083, och [1,8 · 3,6] mot den luminansen tillåter ett golv
 *  mellan L 0,188 och 0,432. Mattan siktar på mitten, L 0,3095. */
export const APRON_FLOOR = '#999791';

export const GUEST_GARMENTS = [
  '#52505d', '#5b5045', '#465452', '#5c4d58',
  '#49544a', '#555144', '#554f61', '#5b4f4d'
];

export const STAFF_UNIFORMS: { [k: string]: string } = {
  cook: '#425646',
  window: '#5e4d55'
};

function chan(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * chan(parseInt(h.substring(0, 2), 16)) +
         0.7152 * chan(parseInt(h.substring(2, 4), 16)) +
         0.0722 * chan(parseInt(h.substring(4, 6), 16));
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function checkPaletteAgainstGround(
  extraGroundColours?: string[],
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { figure: string; ground: string; ratio: number }[] {
  const grounds = [APRON_FLOOR].concat(extraGroundColours ?? []);
  const figures = GUEST_GARMENTS.concat(
    Object.keys(STAFF_UNIFORMS).map(function (k) { return STAFF_UNIFORMS[k]; })
  );
  const fails = [];
  for (let i = 0; i < figures.length; i++) {
    for (let g = 0; g < grounds.length; g++) {
      const r = contrast(figures[i], grounds[g]);
      if (r < minRatio || r > maxRatio) {
        fails.push({ figure: figures[i], ground: grounds[g], ratio: r });
      }
    }
  }
  return fails;
}

export function allowedGroundWindow(
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { min: number; max: number } {
  let lightest = 0;
  let darkest = 1;
  const figures = GUEST_GARMENTS.concat(
    Object.keys(STAFF_UNIFORMS).map(function (k) { return STAFF_UNIFORMS[k]; })
  );
  for (let i = 0; i < figures.length; i++) {
    const L = luminance(figures[i]);
    if (L > lightest) lightest = L;
    if (L < darkest) darkest = L;
  }
  return {
    min: (darkest + 0.05) * minRatio - 0.05,
    max: (lightest + 0.05) * maxRatio - 0.05
  };
}

/**
 * Kontrasten mellan tak och markis, per variant. Måste vara mätbar,
 * annars smälter de två rektanglarna till en uppifrån.
 */
export function checkAwningSeparation(liveryColour: string): {
  roof: string; awning: string; ratio: number; ok: boolean;
} {
  const roof = liveryColour;
  const awning = lightenHex(liveryColour, 0.40);
  const r = contrast(roof, awning);
  return { roof: roof, awning: awning, ratio: r, ok: r >= 1.4 };
}

export const FLAGS = {
  businessClass:
    "BusinessClass har 'foodtruck', men businessHasSeats() är falskt och " +
    'computePlayerBusinessInterior() returnerar null — korrekt, eftersom ' +
    'vagnen inte har platser. Men det betyder att ingen befintlig kod ger ' +
    'vagnen en placeringspunkt eller en kurs. De fyra rummen får en OBB; ' +
    'vagnen får ingenting. BLOCKERANDE för montering.',
  routeState:
    'Vagnarna ska köra runt i byn, och advanceAlongPath() ger position ' +
    'och kurs längs en polylinje. Men VILKEN väg, när, och varför finns ' +
    'inte: simuleringen har ingen rutt, inget schema och ingen ' +
    'platsvalslogik för en mobil verksamhet. ROADS i grythyttan.ts är ' +
    'dessutom osäkra — mätningen som fann nitton vägar rakt genom ' +
    'byggnader är beställd men inte åtgärdad, så en vagn som följer dem ' +
    'kan köra genom en husvägg. BLOCKERANDE för animationen.',
  noFloorZone:
    "FLOOR_ZONES_BY_BUSINESS har numera en post 'foodtrucken' med EN zon: " +
    "serveringsmattan (#999791). Nyckeln är bestämd form per ORDER 139 — " +
    "'foodtrucken', inte 'foodtruck'. Posten finns för att en klass som " +
    'saknas i registret inte ska kunna se ut som godkänd. ' +
    'Men mattan är fortfarande det ENDA rummet äger: vagnen står på ' +
    'gatan, och gatan är byns geometri. Leveransen sätter inget gatugolv, ' +
    'och mattans färg är vald ur bandet baklänges — garment ligger på ' +
    'L 0,083, bandet tillåter då L 0,188-0,432, och mattan siktar på ' +
    'mitten. NÄR gatan läggs till som andra zon KRYMPER figurfönstret; ' +
    "figureLuminanceWindow('foodtrucken') säger med hur mycket, och " +
    'checkPaletteAgainstGround() prövar paletten mot gatans färger. ' +
    'Polygon-guarden i OsmRoads är beställd men inte byggd, så gatan är ' +
    'osäker tills vidare.',
  counterOrder:
    'Hela verksamheten bygger på det ölkrogen flaggade som counterOrder. ' +
    'Gästens tillståndsmaskin har inget läge för "går fram till luckan, ' +
    'beställer, stiger åt sidan, hämtar, går". För ölkrogen var det en ' +
    'variant vi kunde avstå ifrån. Här finns ingen annan väg. BLOCKERANDE.',
  queueOrdering:
    'queue[] har ordnade platser med index, för en food truck-kö ÄR en ' +
    'ordning. Men sim-lagret vet bara att en gäst väntar, inte var i kön, ' +
    'och har ingen framflyttning när den främste betjänas.',
  handoffSeparate:
    'orderPoint och handoffPoint är två lägen isär. Så fungerar en vagn, ' +
    'och det är vad som gör att kön kan röra sig. Men det kräver ett ' +
    'tillstånd "väntar på sin portion" som inte finns.',
  hatchState:
    'updateFoodTruckRoom(room, open) fäller markisen, drar in hyllan och ' +
    'lyfter stödbenen. Vid 0 håller fordonet sitt transportmått. Men ' +
    'ingenting i simuleringen säger om vagnen är öppen — varken ' +
    'öppettider, kvällsfas eller väder. Skicka 1 vid parkering och 0 ' +
    'under färd; en stängd stillastående vagn läser som en trasig vagn.',
  variantChoice:
    'Tre varianter finns som geometri. Vilken en given spelarvagn ÄR — ' +
    'och om valet kostar pengar, kapacitet eller anseende — är ' +
    'spelmekanik som inte finns. Rummet väljer inte.',
  standingSpots:
    'Tre ståplatser finns som geometri. En stående gäst har inget ' +
    'tillstånd. Här väger det tyngre än i de andra klasserna: vagnen har ' +
    'NOLL sittplatser, så räknas ståplatser aldrig har verksamheten ingen ' +
    'kapacitet alls i modellen.',
  capacityModel:
    'TOTAL_SEATS = 0 är korrekt men oförenligt med reducerarens ' +
    'DEFAULT_POLICIES.capacity, som är ett platsantal. En food truck ' +
    'begränsas av GENOMSTRÖMNING, och den storheten finns inte.',
  svgCoexistence:
    'SVG-vyn rörs inte: FoodtruckScene.tsx, rig.ts och Figure.tsx lever ' +
    'tills 3D-versionen läses i vyn. archetypes.ts ligger redan i ' +
    'ui/foodtruck/ och är alltså skriven för den här publiken.'
};

// ---------- Geometricache ----------

const geometryCache = new Map<string, THREE.BufferGeometry>();

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = 'b' + w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3);
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geometryCache.set(key, g); }
  return g;
}

function cyl(r: number, h: number, seg: number): THREE.BufferGeometry {
  const key = 'c' + r.toFixed(3) + '_' + h.toFixed(3) + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.CylinderGeometry(r, r, h, seg); geometryCache.set(key, g); }
  return g;
}

function plane(w: number, h: number): THREE.BufferGeometry {
  const key = 'p' + w.toFixed(3) + '_' + h.toFixed(3);
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.PlaneGeometry(w, h); geometryCache.set(key, g); }
  return g;
}

function sph(r: number, seg: number): THREE.BufferGeometry {
  const key = 's' + r.toFixed(3) + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.SphereGeometry(r, seg, Math.max(4, seg / 2)); geometryCache.set(key, g); }
  return g;
}

export function disposeFoodTruckGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

/** Ljusare steg av samma kulör — lerp mot vitt, så hue:n håller. */
/** Luckans överkant, som konstruktionen använder på två ställen. */
function hatchTopGuess(floorY: number, innerH: number): number {
  return Math.min(HATCH_HEAD, floorY + innerH - 0.06);
}

function lightenHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), amount);
  // getHexString, inte getStyle: getStyle ger "rgb(216,176,172)", och
  // luminance() parsar hex — resultatet blev NaN och
  // checkAwningSeparation rapporterade null i stället för ett tal.
  return '#' + c.getHexString();
}

function darkenHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return '#' + c.getHexString();
}

const COLOUR = {
  trim: '#4a453d',
  tyre: '#2c2a28',
  rim: '#b4b0a8',
  shelf: '#7d6a52',
  awningUnder: '#a89577',
  galley: '#8f9296',
  steel: '#a9adb1',
  hood: '#403c36',
  kerb: '#7a746a',
  glass: '#5b6a72',
  chrome: '#c6c7c4',
  lamp: '#e6e2d6',
  signFace: '#e8e4dc'
};

// ---------- Konstruktion ----------

export function createFoodTruckRoom(options?: FoodTruckOptions): FoodTruckRoom {
  const opts = options ?? {};
  const variant = (opts.variant ?? 'hVan') as TruckVariant;
  const V = VARIANTS[variant];
  const length = V.length;
  const width = V.width;
  const floorY = V.floorY;
  const innerH = V.innerHeight;
  const hatchW = Math.min(V.hatchWidth, length - 1.4);
  const queueLength = Math.max(1, Math.round(opts.queueLength ?? DEFAULT_QUEUE_LENGTH));
  const livery = opts.liveryColour ?? V.livery;
  const roofT = 0.14;

  const halfL = length / 2;
  const halfW = width / 2;
  const serveZ = halfW;
  const serveWallZ = serveZ - 0.06;
  const hatchHalf = hatchW / 2;

  // Mattans bredd följer KÖN, inte karossen. Centrerades den på vagnen
  // hamnade köns bakersta platser utanför den enda markyta vars
  // kontrast leveransen känner — precis det FLAGS.noFloorZone undviker.
  const queueTailX = -(queueLength - 1) * QUEUE_PITCH;
  const standMaxX = halfL + 1.3;
  const apronMinX = queueTailX - 0.55;
  const apronMaxX = standMaxX + 0.55;
  const apronW = apronMaxX - apronMinX;
  const apronCx = (apronMinX + apronMaxX) / 2;
  const apronD = QUEUE_STANDOFF + 1.2;
  const apronZc = serveZ + apronD / 2 - 0.1;

  const site = opts.site ?? [MIN_WIDTH_M, MIN_DEPTH_M];
  const needW = apronW;
  const needD = halfW + QUEUE_STANDOFF + 1.4;
  const fits = needW <= site[0] && needD <= site[1];
  const shortfall: Vec2 = [
    Math.max(0, needW - site[0]),
    Math.max(0, needD - site[1])
  ];

  const group = new THREE.Group();
  group.name = 'foodTruckRoom';

  const materials: THREE.Material[] = [];
  function mat(colour: string, rough: number, metal: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    materials.push(m);
    return m;
  }

  const matLivery = mat(livery, 0.62, 0.08);
  // Markisen får ETT EGET material: ett ljusare steg av liveryn. Delade
  // den takets instans blev de två uppåtvända planen identiskt
  // ljussatta och smälte till en enda klump uppifrån — mätt skillnad
  // 2/255 per kanal. Då syns inte vilken långsida som är fram.
  const matAwningTop = mat(lightenHex(livery, 0.40), 0.78, 0.02);
  const matLiveryDark = mat(darkenHex(livery, 0.32), 0.7, 0.05);
  const matTrim = mat(COLOUR.trim, 0.9, 0);
  const matTyre = mat(COLOUR.tyre, 0.95, 0);
  const matRim = mat(COLOUR.rim, 0.45, 0.45);
  const matShelf = mat(COLOUR.shelf, 0.6, 0);
  const matAwningUnder = mat(COLOUR.awningUnder, 0.9, 0);
  const matGalley = mat(COLOUR.galley, 0.7, 0.15);
  const matSteel = mat(COLOUR.steel, 0.45, 0.4);
  const matHood = mat(COLOUR.hood, 0.85, 0.2);
  const matApron = mat(APRON_FLOOR, 0.95, 0);
  const matKerb = mat(COLOUR.kerb, 0.9, 0);
  const matGlass = mat(COLOUR.glass, 0.25, 0.4);
  const matSign = mat(COLOUR.signFace, 0.5, 0);
  // Nederbandet. Referensbilderna har det i grädde mot blått och i
  // krom mot svart — alltid ljusare än karossen, aldrig en egen kulör.
  // Härlett ur liveryn så det följer med när färgen byts.
  const matSkirt = mat(lightenHex(livery, 0.74), 0.7, 0.04);
  const matChrome = mat(COLOUR.chrome, 0.35, 0.7);
  const matLamp = mat(COLOUR.lamp, 0.4, 0.1);

  function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material,
               x: number, y: number, z: number, name: string): THREE.Mesh {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    o.name = name;
    parent.add(o);
    return o;
  }

  // ── Serveringsmattan ──────────────────────────────────────────
  // MATTAN LIGGER I EN EGEN GRUPP, utanför fordonet. Den låg först i
  // room.group och åkte därför med ut på vägen — en markering som
  // gled längs asfalten bredvid en vagn i rörelse. Och värre: mattan
  // är leveransens enda kontrastprövade markyta, så att låta den följa
  // fordonet ut på oprövad gata motsäger FLAGS.noFloorZone.
  //
  // Rätt begrepp: mattan är PLATSEN, inte fordonet. Torgplatsen ligger
  // kvar när vagnen kör vidare, och nästa vagn ställer sig på samma
  // matta. Anroparen placerar room.pitch där platsen är och room.group
  // där fordonet är — samma punkt vid parkering, olika under färd.
  const pitch = new THREE.Group();
  pitch.name = 'truckPitch';
  const apron = new THREE.Mesh(plane(apronW, apronD), matApron);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(apronCx, 0.012, apronZc);
  apron.receiveShadow = true;
  apron.name = 'apron';
  pitch.add(apron);
  put(pitch, box(apronW, 0.06, 0.08), matKerb, apronCx, 0.03, apronZc + apronD / 2, 'apronKerbFar');
  put(pitch, box(0.08, 0.06, apronD), matKerb, apronMinX, 0.03, apronZc, 'apronKerbW');
  put(pitch, box(0.08, 0.06, apronD), matKerb, apronMaxX, 0.03, apronZc, 'apronKerbE');

  // ── Karossen ──────────────────────────────────────────────────
  const body = new THREE.Group();
  body.name = 'body';
  group.add(body);

  const backZ = -halfW + 0.06;
  // Skåpets längd: hela fordonet, utom när hytten är separat.
  const cabLen = V.separateCab ? 1.9 : 0;
  const boxX0 = -halfL;
  const boxX1 = halfL - cabLen - (V.separateCab ? 0.12 : 0);
  const boxLen = boxX1 - boxX0;
  const boxCx = (boxX0 + boxX1) / 2;

  put(body, box(boxLen, floorY - 0.12, width - 0.14), matLiveryDark,
      boxCx, (floorY - 0.12) / 2 + 0.09, 0, 'chassis');
  put(body, box(boxLen, innerH, 0.12), matLivery, boxCx, floorY + innerH / 2, backZ, 'sideBack');
  put(body, box(0.12, innerH, width), matLivery, boxX0 + 0.06, floorY + innerH / 2, 0, 'endRear');

  if (V.separateCab) {
    // HYTTEN. Egen, lägre volym framför skåpet — två rektanglar i plan
    // med ett hopp i höjd, variantens kännetecken uppifrån.
    const cabH = innerH * 0.74;
    const cabCx = halfL - cabLen / 2;
    put(body, box(cabLen, cabH, width - 0.06), matLivery, cabCx, floorY + cabH / 2, 0, 'cabBody');
    put(body, box(cabLen + 0.12, 0.12, width), matLiveryDark, cabCx, floorY + cabH + 0.06, 0, 'cabRoof');
    put(body, box(0.06, cabH * 0.46, width - 0.3), matGlass,
        halfL - 0.03, floorY + cabH * 0.7, 0, 'windscreen');
    put(body, box(0.12, innerH, width), matLivery, boxX1 - 0.06, floorY + innerH / 2, 0, 'boxFront');
  } else {
    put(body, box(0.12, innerH, width), matLivery, boxX1 - 0.06, floorY + innerH / 2, 0, 'endFront');
    // Nosen: vindruta i främre gaveln, plus avsmalning för hVan.
    put(body, box(0.06, innerH * 0.34, width - 0.34), matGlass,
        boxX1 - 0.12, floorY + innerH * 0.74, 0, 'windscreen');
    if (variant === 'hVan') {
      // Avsmalnande nos — planformen blir ett rundat trapets, och det
      // är det enda som skiljer klassikerns silhuett uppifrån.
      put(body, box(0.5, innerH * 0.5, width - 0.5), matLivery,
          boxX1 + 0.19, floorY + innerH * 0.25, 0, 'noseTaper');
      put(body, box(0.34, 0.22, width - 0.72), matLiveryDark,
          boxX1 + 0.3, floorY + 0.16, 0, 'grille');
    }
  }

  // Serveringssidan: bröst, band, pelare — luckan är ett riktigt hål.
  put(body, box(hatchW, HATCH_SILL - floorY, 0.12), matLivery,
      0, floorY + (HATCH_SILL - floorY) / 2, serveWallZ, 'serveApronWall');
  const headH = floorY + innerH - HATCH_HEAD;
  if (headH > 0.05) {
    put(body, box(hatchW, headH, 0.12), matLivery,
        0, (HATCH_HEAD + floorY + innerH) / 2, serveWallZ, 'serveHeader');
  }
  const pierW = (boxLen - hatchW) / 2;
  if (pierW > 0.05) {
    put(body, box(pierW, innerH, 0.12), matLivery,
        boxCx - (hatchHalf + pierW / 2), floorY + innerH / 2, serveWallZ, 'pierRear');
    put(body, box(pierW, innerH, 0.12), matLivery,
        boxCx + (hatchHalf + pierW / 2), floorY + innerH / 2, serveWallZ, 'pierFront');
  }
  // SPRÖJS i den breda luckan. BOSS-vagnen delar sin öppning i tre
  // fönster, och en 3,4 m fri öppning skulle dessutom inte bära sig.
  if (hatchW > 3.0) {
    for (let i = 0; i < 2; i++) {
      put(body, box(0.06, hatchTopGuess(floorY, innerH) - HATCH_SILL, 0.1), matTrim,
          (i === 0 ? -1 : 1) * hatchW / 6, (HATCH_SILL + hatchTopGuess(floorY, innerH)) / 2,
          serveWallZ, 'mullion' + i);
    }
  }

  const jambT = 0.05;
  const hatchTop = Math.min(HATCH_HEAD, floorY + innerH - 0.06);
  put(body, box(hatchW + 0.1, jambT, 0.16), matTrim, 0, HATCH_SILL - jambT / 2, serveWallZ, 'hatchJambLower');
  put(body, box(hatchW + 0.1, jambT, 0.16), matTrim, 0, hatchTop + jambT / 2, serveWallZ, 'hatchJambUpper');
  put(body, box(jambT, hatchTop - HATCH_SILL, 0.16), matTrim,
      -hatchHalf - jambT / 2, (HATCH_SILL + hatchTop) / 2, serveWallZ, 'hatchJambRear');
  put(body, box(jambT, hatchTop - HATCH_SILL, 0.16), matTrim,
      hatchHalf + jambT / 2, (HATCH_SILL + hatchTop) / 2, serveWallZ, 'hatchJambFront');

  // Taket bär liveryn.
  const roofPanel = put(body, box(boxLen + 0.08, roofT, width + 0.08), matLivery,
                        boxCx, floorY + innerH + roofT / 2, 0, 'roofPanel');

  // KUPAT TAK. Referensbildernas H-van har ett tak som välver sig
  // över bredden — en rak skiva läser som en låda, inte som en
  // karosseri. Halvcylinder längs vagnen, tillplattad till 0,26 av
  // radien så den blir en välvning och inte ett rör.
  if (!V.roofSign) {
    const crown = put(body, cyl(halfW + 0.04, boxLen + 0.06, 18), matLivery,
                      boxCx, floorY + innerH + roofT, 0, 'roofCrown');
    crown.rotation.z = Math.PI / 2;
    crown.scale.set(0.26, 1, 1);
  }

  // NEDERBANDET, i ljusare ton. Blå vagnen har det i grädde, svarta i
  // krom. Det bryter flanken på höjden och är det som gör att en
  // 2,4 m hög sida inte läser som en enda plåt.
  const skirtH = 0.30;
  const skirtY = floorY + 0.10;
  put(body, box(boxLen, skirtH, 0.04), matSkirt, boxCx, skirtY, backZ - 0.05, 'skirtBack');
  put(body, box(boxLen, skirtH, 0.04), matSkirt, boxCx, skirtY, serveWallZ + 0.05, 'skirtServe');

  // RÄFFLORNA. Citroën H:ns signatur, och de går över HELA sidan —
  // inte bara baksidan, som första versionen hade. De syns bara i låg
  // vinkel, men det är där varianten känns igen.
  if (variant !== 'boxVan') {
    const ribTop = floorY + innerH - 0.12;
    const ribBase = skirtY + skirtH / 2 + 0.08;
    const ribN = Math.max(3, Math.floor((ribTop - ribBase) / 0.15));
    for (let i = 0; i < ribN; i++) {
      const ry = ribBase + i * 0.15;
      put(body, box(boxLen - 0.24, 0.045, 0.028), matLiveryDark, boxCx, ry, backZ - 0.065, 'ribBack' + i);
      if (ry < HATCH_SILL - 0.06) {
        put(body, box(hatchW - 0.1, 0.045, 0.028), matLiveryDark, 0, ry, serveWallZ + 0.065, 'ribServe' + i);
      }
    }
  }

  // NOSEN: stötfångare, två lyktor, grill. Tre detaljer som säger
  // fordon på en halv sekund i alla närbildsvyer.
  const noseX = V.separateCab ? halfL : boxX1;
  put(body, box(0.16, 0.13, width - 0.12), matChrome, noseX + 0.06, 0.52, 0, 'bumper');
  for (let i = 0; i < 2; i++) {
    const lz = (i === 0 ? -1 : 1) * (width / 2 - 0.34);
    const lamp = put(body, cyl(0.105, 0.09, 12), matLamp, noseX + 0.02, 0.86, lz, 'headlamp' + i);
    lamp.rotation.z = Math.PI / 2;
    const ring = put(body, cyl(0.125, 0.05, 12), matChrome, noseX - 0.01, 0.86, lz, 'lampRing' + i);
    ring.rotation.z = Math.PI / 2;
  }
  for (let i = 0; i < 4; i++) {
    put(body, box(0.03, 0.035, width - 0.62), matLiveryDark,
        noseX + 0.01, 1.06 + i * 0.075, 0, 'grilleSlat' + i);
  }

  if (V.roofSign) {
    // SKYLTLÅDAN. Boxvagnens kännetecken: en ljus rektangel på taket
    // som läser som en egen form rakt ovanifrån.
    const sy = floorY + innerH + roofT;
    put(body, box(1.9, 0.5, 0.16), matTrim, 0.4, sy + 0.34, 0.2, 'roofSignFrame');
    put(body, box(1.78, 0.4, 0.06), matSign, 0.4, sy + 0.34, 0.3, 'roofSignFace');
    // Lampraden runt skylten. BOSS-vagnen och FISH & CHIPS-skylten har
    // båda glödlampor i kanten — det är vad som gör en skylt till en
    // skylt och inte till en vit platta.
    for (let i = 0; i < 7; i++) {
      const bx = 0.4 - 0.82 + i * (1.64 / 6);
      put(body, sph(0.035, 8), matLamp, bx, sy + 0.56, 0.32, 'signBulbTop' + i);
      put(body, sph(0.035, 8), matLamp, bx, sy + 0.12, 0.32, 'signBulbBot' + i);
    }
    put(body, box(0.08, 0.34, 0.08), matTrim, -0.4, sy + 0.17, 0.2, 'roofSignLegRear');
    put(body, box(0.08, 0.34, 0.08), matTrim, 1.2, sy + 0.17, 0.2, 'roofSignLegFront');
  }

  // Räfflor på baksidan — syns bara i låg vinkel, men de kostar en box.
  if (variant !== 'boxVan') {
    for (let i = 0; i < 5; i++) {
      put(body, box(boxLen - 0.3, 0.05, 0.03), matLiveryDark,
          boxCx, floorY + 0.24 + i * 0.16, backZ - 0.07, 'rib' + i);
    }
  }

  // ── Hjulen ────────────────────────────────────────────────────
  // Rotation kring X: cylinderns axel är +Y, och rotation.x lägger den
  // längs Z — tvärs vagnen, så hjulet rullar framåt. Med rotation.z
  // hamnade axeln längs LÄNGDEN och hjulen rullade i sidled.
  const wheels: THREE.Object3D[] = [];
  const steerWheels: THREE.Object3D[] = [];
  const wheelZ = halfW - 0.10;

  /**
   * Hjulhuset. Det enskilt starkaste "bil"-tecknet i referensbilderna
   * och det min första version helt saknade: hjulen stack ut under en
   * rak plåt, vilket läser som en container på hjul.
   *
   * Bågen byggs av fem korta segment på en cirkelbåge i stället för
   * en torus — primitiver hela vägen, och en båge av fem läser lika
   * bra som en av femtio i den här skalan. Ytterkanten ligger 0,03 m
   * utanför flanken, så transportbredden växer 0,06 m totalt och
   * håller sig under 2,60.
   */
  function wheelArch(px: number, pz: number): void {
    const AR = V.wheelR + 0.10;
    const g = new THREE.Group();
    g.name = 'archGroup';
    g.position.set(px, V.wheelR, pz);
    body.add(g);
    for (let k = 0; k < 5; k++) {
      const ang = Math.PI * (0.10 + k * 0.20);
      const seg = put(g, box(0.22, 0.055, 0.26), matSkirt,
                      Math.cos(ang) * AR, Math.sin(ang) * AR, 0, 'arch' + k);
      seg.rotation.z = ang - Math.PI / 2;
    }
  }
  for (let a = 0; a < V.axles.length; a++) {
    for (let side = 0; side < 2; side++) {
      const wx = V.axles[a];
      const wz = side === 0 ? -wheelZ : wheelZ;
      // Varje hjul är en grupp: gruppen styr (kring Y), meshen rullar.
      // Tre nivåer, och de gör olika saker:
      //   hub     styr (rotation.y)
      //   spinner rullar (rotation.y, med x = PI/2 fast inbakad)
      //   meshar  sitter still i spinnern
      //
      // Rullningen MÅSTE ligga på spinnerns y, inte på meshens z.
      // Med rotation.x = PI/2 på meshen och rullning på z blir Euler
      // XYZ till R = Rx·Rz, och då flyttar sig hjulAXELN med
      // rullningen — vid ett kvarts varv pekar den längs vagnen och
      // hjulet tippar i stället för att rulla. Med x inbakad i en egen
      // grupp och rullningen på dess y blir R = Rx·Ry, alltså rotation
      // kring cylinderns egen axel, som ligger fast tvärs vagnen.
      const hub = new THREE.Group();
      hub.name = 'wheelHub' + a + '_' + side;
      hub.position.set(wx, V.wheelR, wz);
      body.add(hub);
      const spinner = new THREE.Group();
      spinner.name = 'wheelSpin' + a + '_' + side;
      spinner.rotation.x = Math.PI / 2;
      hub.add(spinner);
      put(spinner, cyl(V.wheelR, 0.20, 14), matTyre, 0, 0, 0, 'wheel' + a + '_' + side);
      put(spinner, cyl(V.wheelR * 0.5, 0.215, 12), matRim, 0, 0, 0, 'rim' + a + '_' + side);
      // Ekrar på hjulets yttre sida. En slät cylinder är
      // rotationssymmetrisk — den kan rulla hur fort som helst utan
      // att det syns. Ekrarna är det enda som gör rullningen läsbar.
      const outerY = side === 0 ? -0.108 : 0.108;
      for (let e = 0; e < 3; e++) {
        const sp = put(spinner, box(V.wheelR * 1.5, 0.014, 0.05), matRim,
                       0, outerY, 0, 'spoke' + a + '_' + side + '_' + e);
        sp.rotation.y = e * Math.PI / 3;
      }
      wheels.push(spinner);
      wheelArch(wx, wz);
      // Framaxeln är den sista i listan (störst X).
      if (a === V.axles.length - 1) steerWheels.push(hub);
    }
  }

  // ── Stödbenen ─────────────────────────────────────────────────
  const jacks: THREE.Object3D[] = [];
  for (let i = 0; i < 2; i++) {
    const jx = boxCx + (i === 0 ? -1 : 1) * (boxLen / 2 - 0.7);
    const j = new THREE.Group();
    j.name = 'jack' + i;
    j.position.set(jx, 0, serveZ - 0.3);
    body.add(j);
    put(j, box(0.1, 0.34, 0.1), matTrim, 0, 0.17, 0, 'jackLeg' + i);
    put(j, box(0.2, 0.05, 0.2), matTrim, 0, 0.02, 0, 'jackFoot' + i);
    jacks.push(j);
  }

  // ── Serveringshyllan ──────────────────────────────────────────
  const shelf = new THREE.Group();
  shelf.name = 'shelf';
  body.add(shelf);
  put(shelf, box(hatchW + 0.2, 0.06, SHELF_DEPTH), matShelf,
      0, SHELF_Y, serveZ + SHELF_DEPTH / 2 - 0.02, 'serveShelf');
  put(shelf, box(0.06, SHELF_Y - 0.06, 0.06), matTrim,
      -hatchHalf, (SHELF_Y - 0.06) / 2, serveZ + SHELF_DEPTH - 0.06, 'shelfLegRear');
  put(shelf, box(0.06, SHELF_Y - 0.06, 0.06), matTrim,
      hatchHalf, (SHELF_Y - 0.06) / 2, serveZ + SHELF_DEPTH - 0.06, 'shelfLegFront');

  const handoffAnchor = new THREE.Object3D();
  handoffAnchor.name = 'handoffAnchor';
  handoffAnchor.position.set(hatchHalf * 0.55, SHELF_Y + 0.04, serveZ + SHELF_DEPTH / 2);
  shelf.add(handoffAnchor);

  // ── Markisen ──────────────────────────────────────────────────
  // Vagnens starkaste signal uppifrån. hVan: styv panel som ÄR luckan.
  // Övriga: tygduk på ram.
  const awning = new THREE.Group();
  awning.name = 'awning';
  const awningPivotY = V.liftGate ? Math.min(hatchTop + 0.06, floorY + innerH - 0.02) : AWNING_Y;
  awning.position.set(0, Math.min(awningPivotY, floorY + innerH + roofT - 0.05), serveWallZ + 0.06);
  body.add(awning);
  const awW = V.liftGate ? hatchW + 0.12 : hatchW + 0.6;
  put(awning, box(awW, 0.05, V.awningReach), matAwningTop, 0, 0, V.awningReach / 2, 'awningTop');
  put(awning, box(awW - 0.06, 0.02, V.awningReach - 0.06), matAwningUnder,
      0, -0.035, V.awningReach / 2, 'awningUnder');
  if (!V.liftGate) {
    const ribA = put(awning, cyl(0.028, V.awningReach, 8), matTrim,
                     -awW / 2 + 0.06, -0.03, V.awningReach / 2, 'awningRibRear');
    ribA.rotation.x = Math.PI / 2;
    const ribB = put(awning, cyl(0.028, V.awningReach, 8), matTrim,
                     awW / 2 - 0.06, -0.03, V.awningReach / 2, 'awningRibFront');
    ribB.rotation.x = Math.PI / 2;
  } else {
    // Stötta: en styv lucka hålls uppe av en stång, inte av en ram.
    const stayA = put(awning, cyl(0.022, V.awningReach * 0.9, 6), matTrim,
                      -awW / 2 + 0.1, -0.28, V.awningReach * 0.45, 'gateStayRear');
    stayA.rotation.x = 1.16;
    const stayB = put(awning, cyl(0.022, V.awningReach * 0.9, 6), matTrim,
                      awW / 2 - 0.1, -0.28, V.awningReach * 0.45, 'gateStayFront');
    stayB.rotation.x = 1.16;
  }

  // FOTSTEG längs serveringssidan. Finns på båda de större
  // referensvagnarna och ger flanken en linje att läsa mot marken.
  if (variant !== 'hVan') {
    // Intucket under flanken, inte utanpå. Utstickande 0,16 m tog
    // boxvagnen till 2,65 m och bröt Rv 244-påståendet — och ett
    // fotsteg som är bredare än karossen finns inte på något av
    // referensfordonen.
    put(body, box(boxLen * 0.66, 0.06, 0.18), matChrome,
        boxCx, 0.34, serveZ - 0.02, 'runningBoard');
  }

  // ── Pentryt ───────────────────────────────────────────────────
  const galley = new THREE.Group();
  galley.name = 'galley';
  group.add(galley);
  put(galley, box(boxLen - 0.3, 0.06, width - 0.24), matLiveryDark, boxCx, floorY, 0, 'galleyFloor');
  put(galley, box(hatchW + 0.2, 0.05, 0.5), matSteel,
      0, GALLEY_COUNTER_Y, serveWallZ - 0.32, 'galleyCounter');
  put(galley, box(hatchW + 0.2, GALLEY_COUNTER_Y - floorY - 0.05, 0.46), matGalley,
      0, floorY + (GALLEY_COUNTER_Y - floorY) / 2, serveWallZ - 0.32, 'galleyUnder');
  const rangeX = boxCx - boxLen * 0.22;
  put(galley, box(1.3, 0.85, 0.55), matGalley, rangeX, floorY + 0.42, backZ + 0.38, 'stationPlancha');
  put(galley, box(1.4, 0.26, 0.62), matHood, rangeX, floorY + 1.6, backZ + 0.4, 'planchaHood');
  put(galley, box(1.0, 0.85, 0.55), matGalley, boxCx + boxLen * 0.24, floorY + 0.42, backZ + 0.38, 'stationPrep');
  put(galley, box(0.62, 0.04, 0.4), matSteel, boxCx + boxLen * 0.24, floorY + 0.88, backZ + 0.38, 'prepSink');

  const galleyAnchor = new THREE.Object3D();
  galleyAnchor.name = 'galleyAnchor';
  galleyAnchor.position.set(-0.4, GALLEY_COUNTER_Y + 0.03, serveWallZ - 0.32);
  galley.add(galleyAnchor);

  // Personalens dörr i bakre gaveln.
  const doorMat = new THREE.MeshBasicMaterial({ color: '#1a1815' });
  materials.push(doorMat);
  const crewDoorMesh = new THREE.Mesh(plane(0.74, Math.min(1.8, innerH - 0.1)), doorMat);
  crewDoorMesh.position.set(boxX0 + 0.05, floorY + 0.9, -0.42);
  crewDoorMesh.rotation.y = -Math.PI / 2;
  crewDoorMesh.name = 'crewDoor';
  group.add(crewDoorMesh);
  put(group, box(0.8, 0.06, 0.44), matKerb, boxX0 - 0.3, 0.26, -0.42, 'crewStep');

  // ── Kön ───────────────────────────────────────────────────────
  const queueZ = serveZ + QUEUE_STANDOFF;
  const queue: QueueSlot[] = [];
  for (let i = 0; i < queueLength; i++) {
    queue.push({ id: 'q' + i, kind: 'order', index: i, local: [-i * QUEUE_PITCH, queueZ], facing: 0 });
  }
  const handoffX = Math.min(hatchHalf + 0.5, halfL - 0.3);
  queue.push({ id: 'collect', kind: 'collect', index: -1, local: [handoffX, serveZ + 0.95], facing: 0 });
  for (let i = 0; i < 3; i++) {
    queue.push({
      id: 'stand' + (i + 1), kind: 'stand', index: -1,
      local: [halfL - 0.4 + i * 0.85, serveZ + 0.7], facing: -Math.PI / 2
    });
  }

  const staffStations: StaffStation[] = [
    {
      id: 'window', local: [0.3, serveWallZ - 0.72], standHeight: floorY, facing: 0,
      uniform: STAFF_UNIFORMS.window,
      note: 'Innanför luckan. Ögonhöjd ' + (floorY + EYE_STANDING_M).toFixed(2) +
            ' m mot gästens 1,66 — personalen tittar ned, och det är vad en vagn är.'
    },
    {
      id: 'cook', local: [rangeX, backZ + 0.95], standHeight: floorY, facing: Math.PI,
      uniform: STAFF_UNIFORMS.cook,
      note: 'Vid planchan mot bakväggen. Ett steg till prepbänken, två till luckan.'
    }
  ];

  const parts: TruckParts = {
    awning: awning, body: body, roofPanel: roofPanel, galley: galley,
    apron: apron, shelf: shelf, jacks: jacks,
    wheels: wheels, steerWheels: steerWheels,
    handoffAnchor: handoffAnchor, galleyAnchor: galleyAnchor
  };

  const room: FoodTruckRoom = {
    group: group,
    pitch: pitch,
    variant: variant,
    parts: parts,
    queue: queue,
    staffStations: staffStations,
    orderPoint: [0, queueZ],
    handoffPoint: [handoffX, serveZ + 0.95],
    exitPoint: [halfL + 2.2, serveZ + 1.6],
    crewDoor: [boxX0 - 0.9, -0.42],
    length: length,
    width: width,
    floorY: floorY,
    fits: fits,
    shortfall: shortfall,
    dispose: function () {
      materials.forEach(function (m) { m.dispose(); });
      group.removeFromParent();
      pitch.removeFromParent();
    }
  };
  updateFoodTruckRoom(room, 1);
  return room;
}

/**
 * Färd- eller serveringsläge. `open` 0..1: 0 fäller markisen mot
 * väggen, drar in hyllan och lyfter stödbenen — då håller fordonet sitt
 * transportmått. 1 är helt utfällt.
 *
 * Rummet äger ingen klocka. Se FLAGS.hatchState.
 */
export function updateFoodTruckRoom(room: FoodTruckRoom, open: number): void {
  const k = Math.max(0, Math.min(1, open ?? 1));
  // POSITIV rotation. Negativ svepte +Z-panelen uppåt, så vagnen blev
  // 1,1-1,2 m HÖGRE i färdläge och luckan stod öppen med markisen rakt
  // upp i luften — tvärtemot vad "0 = färd" ska betyda. Positiv för
  // panelen ned mot serveringsväggen och täcker öppningen, vilket är
  // precis vad en styv uppfällbar lucka gör när den stängs.
  room.parts.awning.rotation.x = (1 - k) * (Math.PI / 2 - 0.10);
  // Hyllan glider in i karossen och sjunker undan.
  room.parts.shelf.position.z = -(1 - k) * 0.34;
  room.parts.shelf.visible = k > 0.04;
  // Stödbenen lyfts från marken.
  for (let i = 0; i < room.parts.jacks.length; i++) {
    room.parts.jacks[i].position.y = (1 - k) * 0.36;
    room.parts.jacks[i].visible = k > 0.15;
  }
}

/**
 * Hjulens rotation ur TILLRYGGALAGD STRÄCKA, inte ur väggklockan —
 * samma disciplin som poseWalk i figureRig. Ett hjul som snurrar mot en
 * stillastående vagn är värre än ett som står still.
 *
 * `steer` i radianer, positivt svänger mot +Z.
 */
export function setTruckDrive(room: FoodTruckRoom, distanceM: number, steer: number): void {
  const r = VARIANTS[room.variant].wheelR;
  const spin = (distanceM ?? 0) / r;
  for (let i = 0; i < room.parts.wheels.length; i++) {
    // wheels[] håller SPINNER-grupperna, som redan bär x = PI/2.
    // Rullningen på deras y är rotation kring cylinderaxeln, och den
    // ligger fast tvärs vagnen. Negativt tecken: positiv rotation
    // kring +Z lyfter framkanten, alltså backar hjulet.
    room.parts.wheels[i].rotation.y = -spin;
  }
  const s = Math.max(-0.55, Math.min(0.55, steer ?? 0));
  for (let i = 0; i < room.parts.steerWheels.length; i++) {
    room.parts.steerWheels[i].rotation.y = s;
  }
}

/**
 * Position och kurs längs en vägpolylinje, `distance` meter från
 * början. Vagnen är den enda verksamhet som rör sig, så funktionen hör
 * här — men vilken väg, och när, är sim-lagrets sak.
 * Se FLAGS.routeState.
 */
export function advanceAlongPath(
  path: Vec2[],
  distance: number,
  loop: boolean = true
): { position: Vec2; heading: number; curvature: number } {
  if (!path || path.length < 2) {
    return { position: [0, 0], heading: 0, curvature: 0 };
  }
  const segs = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    segs.push(d);
    total += d;
  }
  if (loop) {
    const d = Math.hypot(path[0][0] - path[path.length - 1][0], path[0][1] - path[path.length - 1][1]);
    segs.push(d);
    total += d;
  }
  let t = distance ?? 0;
  if (loop && total > 0) { t = t % total; if (t < 0) t += total; }
  t = Math.max(0, Math.min(total, t));

  let i = 0;
  while (i < segs.length - 1 && t > segs[i]) { t -= segs[i]; i++; }
  const a = path[i];
  const b = path[(i + 1) % path.length];
  const u = segs[i] > 0 ? t / segs[i] : 0;
  const heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
  // Krökning: skillnaden mot nästa segments kurs, för styrvinkeln.
  const c = path[(i + 2) % path.length];
  const nextHeading = Math.atan2(c[0] - b[0], c[1] - b[1]);
  let dh = nextHeading - heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return {
    position: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
    heading: heading,
    curvature: dh
  };
}

// ---------- Mätning ----------

export function measureFoodTruckRoom(room: FoodTruckRoom): {
  variant: string;
  /** Karossen i TRANSPORTLÄGE. Det mått Rv 244 gäller. */
  bodyFootprint: Vec2;
  /** Hela djupet utfällt, markis och hylla inräknade. */
  deployedDepth: number;
  totalHeight: number;
  roofArea: number;
  awningArea: number;
  apronM2: number;
  queueSlots: number;
  standingSpots: number;
  seatCount: number;
  wheelCount: number;
  queueLengthM: number;
} {
  room.group.updateWorldMatrix(true, true);
  const bodyBox = new THREE.Box3();
  const deployBox = new THREE.Box3();
  const partBox = new THREE.Box3();
  room.parts.body.children.forEach(function (o) {
    const n = o.name;
    if (n.indexOf('wheelHub') === 0 || n.indexOf('jack') === 0) return;
    partBox.setFromObject(o);
    deployBox.union(partBox);
    if (n === 'awning' || n === 'shelf') return;
    bodyBox.union(partBox);
  });
  const roofBox = new THREE.Box3().setFromObject(room.parts.roofPanel);
  const apronBox = new THREE.Box3().setFromObject(room.parts.apron);
  const awnBox = new THREE.Box3().setFromObject(room.parts.awning);
  const order = room.queue.filter(function (q) { return q.kind === 'order'; });
  const stand = room.queue.filter(function (q) { return q.kind === 'stand'; });
  let qLen = 0;
  if (order.length > 1) {
    const a = order[0].local;
    const b = order[order.length - 1].local;
    qLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return {
    variant: room.variant,
    bodyFootprint: [bodyBox.max.x - bodyBox.min.x, bodyBox.max.z - bodyBox.min.z],
    deployedDepth: deployBox.max.z - deployBox.min.z,
    totalHeight: bodyBox.max.y - bodyBox.min.y,
    roofArea: (roofBox.max.x - roofBox.min.x) * (roofBox.max.z - roofBox.min.z),
    awningArea: (awnBox.max.x - awnBox.min.x) * (awnBox.max.z - awnBox.min.z),
    apronM2: (apronBox.max.x - apronBox.min.x) * (apronBox.max.z - apronBox.min.z),
    queueSlots: order.length,
    standingSpots: stand.length,
    seatCount: TOTAL_SEATS,
    wheelCount: room.parts.wheels.length,
    queueLengthM: qLen
  };
}

/**
 * Serveringsgeometrins prov. Siktlinjerna RAYCASTAS mot den byggda
 * scenen. Första versionen räknade på konstanter och kunde därför inte
 * upptäcka att öppningen var igenmurad av ett ogenomskinligt plan — en
 * mätning som inte rör geometrin mäter avsikten, inte resultatet.
 */
export function checkServeGeometry(room: FoodTruckRoom): {
  floorY: number;
  staffEyeY: number;
  guestEyeY: number;
  eyeGap: number;
  innerCounterY: number;
  outerShelfY: number;
  shelfBelowCounter: number;
  guestSeesTorso: boolean;
  guestSeesRange: boolean;
  counterBelowEye: boolean;
} {
  room.group.updateWorldMatrix(true, true);
  const bb = new THREE.Box3();
  let inner = 0;
  let outer = 0;
  room.group.traverse(function (o) {
    if (o.name === 'galleyCounter') { bb.setFromObject(o); inner = bb.max.y; }
    if (o.name === 'serveShelf') { bb.setFromObject(o); outer = bb.max.y; }
  });
  const floorY = room.floorY;
  const staffEye = floorY + EYE_STANDING_M;

  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  origin.set(room.orderPoint[0], EYE_STANDING_M, room.orderPoint[1]);
  room.group.localToWorld(origin);

  function seen(lx: number, ly: number, lz: number): boolean {
    target.set(lx, ly, lz);
    room.group.localToWorld(target);
    dir.copy(target).sub(origin);
    const dist = dir.length();
    ray.set(origin, dir.normalize());
    ray.far = dist - 0.10;
    const hits = ray.intersectObject(room.group, true);
    for (let h = 0; h < hits.length; h++) {
      if (hits[h].object.name.indexOf('apron') === 0) continue;
      return false;
    }
    return true;
  }

  const win = room.staffStations.find(function (st) { return st.id === 'window'; });
  let torsoOk = false;
  if (win) torsoOk = seen(win.local[0], win.standHeight + 1.35, win.local[1]);
  const cook = room.staffStations.find(function (st) { return st.id === 'cook'; });
  let rangeOk = false;
  if (cook) rangeOk = seen(cook.local[0], floorY + 0.9, cook.local[1] - 0.5);

  return {
    floorY: floorY,
    staffEyeY: staffEye,
    guestEyeY: EYE_STANDING_M,
    eyeGap: staffEye - EYE_STANDING_M,
    innerCounterY: inner,
    outerShelfY: outer,
    shelfBelowCounter: inner - outer,
    guestSeesTorso: torsoOk,
    guestSeesRange: rangeOk,
    counterBelowEye: inner < EYE_STANDING_M
  };
}

export function resolveWorldPositions(room: FoodTruckRoom): {
  queue: Vec2[];
  staffStations: Vec2[];
  orderPoint: Vec2;
  handoffPoint: Vec2;
  exitPoint: Vec2;
  crewDoor: Vec2;
} {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function toWorld(p: Vec2): Vec2 {
    v.set(p[0], 0, p[1]);
    room.group.localToWorld(v);
    return [v.x, v.z];
  }
  return {
    queue: room.queue.map(function (q) { return toWorld(q.local); }),
    staffStations: room.staffStations.map(function (s) { return toWorld(s.local); }),
    orderPoint: toWorld(room.orderPoint),
    handoffPoint: toWorld(room.handoffPoint),
    exitPoint: toWorld(room.exitPoint),
    crewDoor: toWorld(room.crewDoor)
  };
}
