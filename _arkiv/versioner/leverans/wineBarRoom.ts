// wineBarRoom — vinbar med lounger och DJ.
//
// SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten).
// Formmall: brewpubRoom.ts. Samma kontrakt, samma koordinatkonvention,
// samma exportmönster, samma FLAGS-disciplin.
//
// Kontrakt (oförändrat från ölkrogen):
//   • Ren three.js. Inga externa beroenden, ingen skinning, inga
//     loaders, inga binära assets.
//   • Byggs imperativt EN gång (createWineBarRoom). Inget skapas i
//     renderloopen.
//   • Ingen egen klocka. Det enda som rör sig (skivtallriken) drivs av
//     en fas anroparen skickar in.
//   • Ingen simuleringslogik. Rummet är geometri.
//
// ── Tre avvikelser från formmallen, och varför ────────────────────
//
// 1. BAKHYLLAN ÄR OBLIGATORISK HÄR. I ölkrogen var frånvaron av
//    bakhylla ett krav — den skulle skymt tankarna, som var det
//    gästen skulle se. I vinbaren är hyllan själv målet: flaskraden
//    är presentationen. Samma siktlinjeresonemang, motsatt slutsats.
//    checkSightLines() mäter därför sikten TILL hyllan, inte förbi
//    den.
//
// 2. GOLVET ÄR EN PALETTPARAMETER, INTE DEKOR. silhouetteContrast.ts
//    har EN konstant FLOOR_COLOUR ('#a89577', ur Restaurant.tsx) som
//    hela kontrastbandet vilar på. Vinbaren har fyra golvzoner, och då
//    gäller bandet per zon. ZONE_FLOORS + checkPaletteAgainstFloors()
//    hävdar det i kod. Se FLAGS.zoneFloorConstant — den behöver ett
//    beslut i silhouetteContrast.ts, inte i det här rummet.
//
// 3. LOUNGEN ÄR FYRA DYNOR, INTE EN SOFFA. Uppifrån läser en
//    genomgående sittsoffa som ett bord: en avlång platta utan
//    platsindelning. Varje loungeplats är därför en egen dyna med
//    0,08 m glapp emellan. Fyra dynor räknas som fyra platser av
//    ögat, vilket är hela poängen med en läsbar plats.
//
// ── Koordinater (identiskt med brewpubRoom.ts) ─────────────────────
// Byggs i byggnadens OBB-lokala ram, samma som interiorLayout.ts:
//   lokal +X = byggnadens långa axel, entrén ligger i +X-änden
//   lokal +Z = korta axeln
//   origo    = polygonens centroid, golvplanet y = 0
// Anroparen placerar gruppen:
//   room.group.position.set(obb.centre[0], 0, obb.centre[1]);
//   room.group.rotation.y = -obb.angle;
// Alla mått i meter, alla vinklar i radianer. Kurs (`facing`) är yaw i
// figurens ram: 0 = tittar mot lokal +Z, +PI/2 = mot +X.
//
// ── Planlösningen, i ett stycke ───────────────────────────────────
// Rummet läses tvärs mot ölkrogens logik. Där ölen gick tank → disk →
// gäst längs en axel har vinbaren ingen produktionslinje: bardisken
// är mitten, och allt annat vänder sig mot den. Flaskhyllan står i
// -X mot väggen, disken framför den, barstolarna framför disken.
//   Loungen ligger längs norra väggen i två grupper, tvåorna i södra
// bandet öster om DJ:n. DJ:n står vid södra väggen mitt för det öppna
// golvet mellan disk och tvåor — inte i ett bakre hörn, för en pult
// som ingen plats vänder sig mot är en pult ingen ser. Köket är
// instängt i NV-hörnet med två stationer och en passlucka; bakre
// SV-hörnet är vinförråd.
//
// Det öppna golvet i mitten har med flit HUVUDGOLVETS färg och ingen
// egen zon. En sjätte golvzon skulle krympa figurfönstret ytterligare
// (se paletten nedan) — dansgolvet är värt en zonmarkering först den
// dag den inte kostar silhuettläsbarhet.
//
// ── Platsfördelningen (tjugo) ─────────────────────────────────────
//   8 loungeplatser (2 × 4 dynor) — norra väggen, sitthöjd 0,38
//   6 barstolar — vända mot flaskhyllan
//   6 platser vid tre tvåor — södra bandet
// Fyra ståplatser vid diskens norra kortände finns som geometri men
// räknas INTE i de tjugo. Se FLAGS.standingAtBar.
//
// ── Fast geometri kontra ändringsbart ─────────────────────────────
// FAST: bardiskens läge som rummets mitt, flaskhyllan bakom den,
//   sommelierens runway på 1,00 m, DJ-plattans zon (platta + golvbyte
//   + fond, inte bara pulten), loungens fyra separata dynor,
//   passagerna 0,82–1,32 m, taket 3,40 m.
// ÄNDRINGSBART: antal flaskhyllplan (4), sitsfördelningen inom de
//   tjugo, ståkantens längd, kökets två stationer, rummets bredd och
//   djup — understiger de MIN_WIDTH_M / MIN_DEPTH_M returneras
//   `fits: false` med underskott i stället för en omtolkad plan.

import * as THREE from 'three';

// #region types

export type Vec2 = [number, number];

export type SeatKind = 'bar' | 'lounge' | 'twotop';

export type LaneId = 'spine' | 'barLane' | 'perimS' | 'loungeN';

export interface SeatSpec {
  /** Stabilt id, t.ex. 'bar3' eller 'loungeA2'. */
  id: string;
  kind: SeatKind;
  /** Sim-lagrets platta seatIndex, 0..19. Samma konvention som
   *  interiorLayout.ts: bordsplatser före barstolar. */
  seatIndex: number;
  /** Möbelns id platsen hör till. */
  furnitureId: string;
  /** Sitsens mittpunkt i lokal XZ. */
  local: Vec2;
  /** Sitsens höjd — lounge 0,38, stol 0,45, barstol 0,75. */
  seatHeight: number;
  /** Kurs så figuren tittar mot bord respektive disk. */
  facing: number;
  /** Gånggrafens nod platsen nås ifrån. */
  approach: Vec2;
  /** Vilken korridor `approach` sitter i. */
  lane: LaneId;
}

export interface StandSpec {
  id: string;
  local: Vec2;
  facing: number;
  approach: Vec2;
  lane: LaneId;
}

export interface StaffStation {
  /** 'sommelier' | 'dj' | 'cook' | 'runner' */
  id: string;
  local: Vec2;
  /** Golvhöjd stationen står på — DJ:n står 0,25 m upp. */
  standHeight: number;
  facing: number;
  /** Uniformsfärg. Roll-distinktionen mäts mot
   *  MIN_ROLE_DISTINCTION_DELTA_E i silhouetteContrast.ts. */
  uniform: string;
  note: string;
}

export interface RoomParts {
  /** Skivtallriken på DJ-pulten. Enda rörliga delen. */
  turntable: THREE.Object3D;
  /** Taket som egen grupp — anroparen tonar den med avståndet,
   *  precis som Restaurant.tsx gör. */
  roof: THREE.Object3D;
  /** Väggarna som egen grupp, av samma skäl. */
  walls: THREE.Object3D;
  /** Inredningen — tonas in när kameran närmar sig. */
  interior: THREE.Object3D;
  /** Bargruppen (disk + hylla + stolar) — mäts som helhet. */
  bar: THREE.Object3D;
  /** Flaskhyllans hyllplan. Siktlinjens måltavlor. */
  shelfTargets: THREE.Object3D[];
  /** DJ:n själv som siktlinjemål — en punkt i brösthöjd på plattan. */
  djTarget: THREE.Object3D;
  /** Fäste på disken där ett glas kan monteras. */
  glassAnchor: THREE.Object3D;
  /** Fäste vid passluckan där en tallrik kan monteras. */
  passAnchor: THREE.Object3D;
  /** Fäste i hyllan där en flaska kan monteras (sommelierens ärende). */
  bottleAnchor: THREE.Object3D;
}

export interface WineBarOptions {
  /** Byggnadens OBB-bredd (långa axeln). Default 15,6. */
  width?: number;
  /** OBB-djup (korta axeln). Default 11,8. */
  depth?: number;
  /** Innertakets höjd. Default 3,40. */
  interiorHeight?: number;
  /** Antal hyllplan i flaskhyllan. Default 4. */
  shelfTiers?: number;
}

export interface WineBarRoom {
  group: THREE.Group;
  parts: RoomParts;
  /** Tjugo platser, i seatIndex-ordning. */
  seats: SeatSpec[];
  /** Fyra ståplatser. Ingår inte i de tjugo. */
  standing: StandSpec[];
  staffStations: StaffStation[];
  /** Innanför entrédörren, lokal XZ. */
  entrance: Vec2;
  /** Utanför dörren — samma standoff som interiorLayout (2,5 m). */
  waitingSpot: Vec2;
  width: number;
  depth: number;
  /** false om rummet är mindre än planlösningen kräver. */
  fits: boolean;
  /** Underskott i meter [x, z] när fits === false. */
  shortfall: Vec2;
  dispose: () => void;
}

// #endregion types

// ---------- Låsta mått ----------

export const TOTAL_SEATS = 20;
export const STANDING_SPOTS = 4;

/** Under detta går planlösningen inte in. */
export const MIN_WIDTH_M = 13.8;
export const MIN_DEPTH_M = 10.2;

const WALL_T = 0.2;
const BOH_EDGE_X = -4.4;        // kökets vägglinje mot rummet
const BOH_EDGE_Z = 1.5;         // kökets andra vägglinje
const SHELF_X = -3.3;           // flaskhyllans mittlinje
const SHELF_T = 0.36;
const SHELF_H = 2.4;
const SHELF_Z0 = -3.6;
const SHELF_Z1 = 1.6;
const BAR_X = -1.75;            // bardiskens mittlinje
const BAR_DEPTH = 0.75;
const BAR_HEIGHT = 1.1;
const BAR_Z0 = -3.0;
const BAR_Z1 = 1.8;
const STOOL_X = -0.95;
const STOOL_PITCH = 0.8;
const STOOL_HEIGHT = 0.75;
const LOUNGE_Z = 4.95;          // dynornas mittlinje
const LOUNGE_SEAT_H = 0.38;
const LOUNGE_PITCH = 0.8;
const LOUNGE_TABLE_Z = 3.1;
const TWOTOP_Z = -4.5;
const TABLE_TOP_Y = 0.72;       // Restaurant.tsx
const TABLE_TOP_T = 0.06;
const CHAIR_HEIGHT = 0.45;
const DJ_X = -0.2;
const DJ_Z = -4.4;
const DJ_PLATFORM = 0.25;

/**
 * Ögonhöjd är en funktion av SITSEN, inte av golvet.
 *
 * Första versionen använde en fast 1,29 m för alla sittande, och då
 * rapporterade siktlinjeprovet att NOLL av sex barstolar såg
 * flaskhyllan — för 1,29 m ligger 0,03 m under diskens egen skiva.
 * En gäst på en barstol på 0,75 m sitter självklart högre än en gäst
 * på en stol på 0,45 m. Talet 0,84 är figurRiggens sittande ögonhöjd
 * över sitsen (1,29 − 0,45), och 0,11 är sockelns tjocklek.
 */
export const EYE_ABOVE_SEAT_M = 0.84;
export const PLINTH_M = 0.11;
export const EYE_STANDING_M = 1.66;

/** Ögonhöjd för en given plats, i lokal y. */
export function eyeHeightForSeat(seat: SeatSpec): number {
  return PLINTH_M + seat.seatHeight + EYE_ABOVE_SEAT_M;
}

// ---------- Palett och kontrastband ----------
//
// silhouetteContrast.ts (ORDER 123 §5) håller bandet:
//   FLOOR_COLOUR = '#a89577', MIN 1.8, MAX 3.6 kontrastförhållande,
//   MIN_ROLE_DISTINCTION_DELTA_E = 12.
//
// Räkna igenom vad bandet faktiskt tillåter, för det är snävare än
// det ser ut. Golvet '#a89577' har relativ luminans 0,3115. Ett band
// på [1,8 · 3,6] mot DET golvet ger figurfönstret L ∈ [0,050 · 0,151].
// Men vinbaren har fem golvzoner, och fönstret krymper till
// SNITTET över alla fem: undre gränsen sätts av det ljusaste golvet,
// övre av det mörkaste. Med zonerna nedan blir fönstret
// L ∈ [0,0509 · 0,1154] och paletten siktar på mitten, L ≈ 0,083.
//
// Det är därför golvzonerna ligger tätt ihop (0,248–0,313 luminans)
// i stället för att spänna vidare: varje steg mörkare golv äter
// direkt av det utrymme figurfärgerna har. Ett mörkt loungegolv
// stänger fönstret helt — vilket är exakt vad briefen varnade för.
// Uppmätt resultat: kontrast 2,22–2,75 mot samtliga fem zoner,
// roll-ΔE minst 16,6. checkPaletteAgainstFloors() räknar om det.

/** Huvudgolvet. Samma värde som silhouetteContrast.FLOOR_COLOUR. */
export const BASE_FLOOR = '#a89577';

/**
 * Golvzonerna. Färgbytet är zonmarkeringen en hög kamera läser — men
 * varje zon är också ett nytt kontrastunderlag för figurerna, så
 * spannet hålls smalt med flit: 0,248–0,313 relativ luminans. Den
 * mörkaste zonen (DJ) ligger 0,064 under huvudgolvet, inte 0,20.
 */
export const ZONE_FLOORS: { id: string; colour: string; note: string }[] = [
  { id: 'main', colour: BASE_FLOOR, note: 'Mittstråk och tvåor. Referensen i silhouetteContrast.ts. L 0,3115.' },
  { id: 'lounge', colour: '#a49075', note: 'Loungen. Ett steg varmare, en aning mörkare. L 0,2912.' },
  { id: 'barRunway', colour: '#a08d74', note: 'Bakom disken. Sliten yta. L 0,2778.' },
  { id: 'dj', colour: '#97866f', note: 'DJ-zonen. Mörkast av de fem — och det som sätter figurfönstrets övre gräns. L 0,2478.' },
  { id: 'kitchen', colour: '#a09786', note: 'Köket. Kallare, gråare. L 0,3133.' }
];

/** Gästernas garment-färger. Alla på L ≈ 0,083, mitt i fönstret. */
export const GUEST_GARMENTS = [
  '#52505d', '#5b5045', '#465452', '#5c4d58',
  '#49544a', '#555144', '#554f61', '#5b4f4d'
];

/** Personalens uniformer per roll. Pairwise ΔE 16,6–31,6 (krav 12). */
export const STAFF_UNIFORMS = {
  sommelier: '#445269',
  dj: '#664958',
  cook: '#425741',
  runner: '#5e4f37'
};

// WCAG-luminans och kontrast, samma formel som silhouetteContrast.ts.
// Duplicerad här med flit: rummet ska kunna hävda sin egen palett utan
// att importera ur scene/ — men talen är per definition identiska.

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  if (c <= 0.03928) return c / 12.92;
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = srgbToLinear(parseInt(h.substring(0, 2), 16));
  const g = srgbToLinear(parseInt(h.substring(2, 4), 16));
  const b = srgbToLinear(parseInt(h.substring(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Prövar hela paletten mot varje golvzon. Returnerar de par som
 * faller utanför bandet — tom lista betyder att paletten går igenom.
 *
 * Detta är rummets svar på §4: paletten hävdas i kod, mot samma band
 * silhouetteContrast.ts håller, per zon.
 */
export function checkPaletteAgainstFloors(
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { figure: string; floor: string; zone: string; ratio: number }[] {
  const fails = [];
  const figures = GUEST_GARMENTS.concat([
    STAFF_UNIFORMS.sommelier, STAFF_UNIFORMS.dj,
    STAFF_UNIFORMS.cook, STAFF_UNIFORMS.runner
  ]);
  for (let i = 0; i < figures.length; i++) {
    for (let z = 0; z < ZONE_FLOORS.length; z++) {
      const r = contrast(figures[i], ZONE_FLOORS[z].colour);
      if (r < minRatio || r > maxRatio) {
        fails.push({
          figure: figures[i],
          floor: ZONE_FLOORS[z].colour,
          zone: ZONE_FLOORS[z].id,
          ratio: r
        });
      }
    }
  }
  return fails;
}

/** Kontrastförhållande figur↔golvzon, för mätningen i modellen. */
export function paletteContrastRange(): { min: number; max: number } {
  let lo = 99;
  let hi = 0;
  const figures = GUEST_GARMENTS.concat([
    STAFF_UNIFORMS.sommelier, STAFF_UNIFORMS.dj,
    STAFF_UNIFORMS.cook, STAFF_UNIFORMS.runner
  ]);
  for (let i = 0; i < figures.length; i++) {
    for (let z = 0; z < ZONE_FLOORS.length; z++) {
      const r = contrast(figures[i], ZONE_FLOORS[z].colour);
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
  }
  return { min: lo, max: hi };
}

/**
 * FLAGS — det planlösningen inte kan avgöra själv.
 * Presentationslagret fattar inga simuleringsbeslut.
 */
export const FLAGS = {
  businessClass:
    "BusinessClass har ingen 'vinbar'. Rummet kan inte väljas förrän " +
    'klassen finns i businessClass.ts med capacityFor = 20. ' +
    'Förutsättning för monteringen, inte en del av leveransen. ' +
    'BLOCKERANDE.',
  djState:
    'DJ:n är det troliga fallet, precis som briefen förutsåg. ' +
    'Geometrin har pult, platta, fond och skivtallrik. Men ingenting ' +
    'i simulationen säger om det spelas nu: det finns ingen ' +
    'kvällsfas, ingen musiknivå, ingen publikrespons. ' +
    'updateWineBarRoom(room, phase) vrider tallriken när anroparen ' +
    'skickar en fas; skicka 0 tills ett sådant tillstånd finns. ' +
    'DJ-figuren står i poseWork som rollkonstant, inte som händelse.',
  sommelierErrand:
    'Sommelierens rörelse mellan gäst och hylla är rummets signatur, ' +
    'och den kan inte drivas härifrån. Det finns inget ärende-tillstånd ' +
    '— ingen "hämtar flaska till bord 3". parts.bottleAnchor och ' +
    'parts.glassAnchor finns; ärendet gör det inte. Fram till dess ' +
    'står sommelieren vid disken.',
  standingAtBar:
    'Fyra ståplatser vid diskens norra kortände finns som geometri. ' +
    'Sim-lagret känner bara seats[] och TOTAL_SEATS — en stående gäst ' +
    'har inget tillstånd. Räknas därför inte i kapaciteten.',
  loungeParty:
    'En loungegrupp är fyra dynor kring ett bord. Sim-lagret tilldelar ' +
    'platser som en platt lista och känner inte sällskap, så en ensam ' +
    'gäst kan hamna mitt i en tom lounge medan en fyra splittras över ' +
    'två grupper. Rummet exponerar furnitureId per plats så en ' +
    'gruppering blir möjlig — men urvalet är sim-lagrets.',
  kitchenStations:
    'Två stationer (plancha, kall prep) är geometri. Smårätter betyder ' +
    'färre stationer än ölkrogens tre, men vilken station en given ' +
    'rätt använder kräver en meny-/rättmodell som inte finns.',
  zoneFloorConstant:
    'silhouetteContrast.ts har EN konstant FLOOR_COLOUR ur ' +
    'Restaurant.tsx. Vinbaren har fem golvzoner, och bandet gäller per ' +
    'zon — annars godkänns en figur mot ett golv den aldrig står på. ' +
    'Värre: zonerna krymper figurfönstret till snittet över alla fem ' +
    '(L 0,0509–0,1154 här mot 0,050–0,151 för huvudgolvet ensamt), ' +
    'så en ny zon kan underkänna en palett som redan är godkänd. ' +
    'checkPaletteAgainstFloors() hävdar bandet mot alla fem här, men ' +
    'den riktiga lösningen är att FLOOR_COLOUR blir en lista eller en ' +
    'funktion av zon i silhouetteContrast.ts. Beslutet hör där, inte ' +
    'i det här rummet.'
};

// ---------- Geometricache ----------

const geometryCache = new Map<string, THREE.BufferGeometry>();

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = 'b' + w + '_' + h + '_' + d;
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geometryCache.set(key, g);
  }
  return g;
}

function cyl(r: number, h: number, seg: number): THREE.BufferGeometry {
  const key = 'c' + r + '_' + h + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, r, h, seg);
    geometryCache.set(key, g);
  }
  return g;
}

export function disposeWineBarGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

// Restaurant.tsx-paletten för fast inredning, plus mörk ek och messing
// för baren. Ingen av dessa är figurfärger — bandet gäller golv mot
// kropp, inte möbler.
const COLOUR = {
  slab: '#6d6a5f',
  wall: '#8f8b7f',
  roof: '#5c5951',
  door: '#1a1815',
  kerb: '#7a746a',
  tableTop: '#8b8477',
  tableLeg: '#4a453d',
  chair: '#b9b3ac',
  bar: '#5b4636',
  barTop: '#6f5945',
  shelf: '#4b3a2c',
  bottle: '#6f7a52',
  brass: '#9a7f45',
  lounge: '#7d6f63',
  loungeTable: '#6b6157',
  dj: '#3a3630',
  djFront: '#57503f',
  kitchen: '#767268',
  hood: '#403c36'
};

// ---------- Konstruktion ----------

/**
 * Bygger hela rummet en gång. Returnerar gruppen plus de namngivna
 * platser, stationer och fästen monteringskoden behöver — ingen
 * grävning i scengrafen.
 */
export function createWineBarRoom(options?: WineBarOptions): WineBarRoom {
  const opts = options ?? {};
  const width = opts.width ?? 15.6;
  const depth = opts.depth ?? 11.8;
  const interiorHeight = opts.interiorHeight ?? 3.4;
  const shelfTiers = opts.shelfTiers ?? 4;

  const fits = width >= MIN_WIDTH_M && depth >= MIN_DEPTH_M;
  const shortfall: Vec2 = [
    Math.max(0, MIN_WIDTH_M - width),
    Math.max(0, MIN_DEPTH_M - depth)
  ];

  const halfW = width / 2;
  const halfD = depth / 2;
  const inX = halfW - WALL_T;
  const inZ = halfD - WALL_T;

  const group = new THREE.Group();
  group.name = 'wineBarRoom';

  const materials: THREE.Material[] = [];
  function mat(colour: string, rough: number, metal: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    materials.push(m);
    return m;
  }

  const matSlab = mat(COLOUR.slab, 0.9, 0);
  const matWall = mat(COLOUR.wall, 0.9, 0);
  const matRoof = mat(COLOUR.roof, 0.9, 0);
  const matKerb = mat(COLOUR.kerb, 0.9, 0);
  const matTableTop = mat(COLOUR.tableTop, 0.7, 0);
  const matTableLeg = mat(COLOUR.tableLeg, 0.9, 0);
  const matChair = mat(COLOUR.chair, 0.9, 0);
  const matBar = mat(COLOUR.bar, 0.8, 0);
  const matBarTop = mat(COLOUR.barTop, 0.5, 0);
  const matShelf = mat(COLOUR.shelf, 0.85, 0);
  const matBottle = mat(COLOUR.bottle, 0.35, 0.1);
  const matBrass = mat(COLOUR.brass, 0.4, 0.6);
  const matLounge = mat(COLOUR.lounge, 0.95, 0);
  const matLoungeTable = mat(COLOUR.loungeTable, 0.8, 0);
  const matDj = mat(COLOUR.dj, 0.85, 0);
  const matDjFront = mat(COLOUR.djFront, 0.7, 0.1);
  const matKitchen = mat(COLOUR.kitchen, 0.9, 0);
  const matHood = mat(COLOUR.hood, 0.85, 0.2);

  function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material,
               x: number, y: number, z: number, name: string): THREE.Mesh {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = name;
    parent.add(m);
    return m;
  }

  function floorPlate(parent: THREE.Object3D, material: THREE.Material,
                      w: number, d: number, x: number, z: number, name: string): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.11, z);
    m.receiveShadow = true;
    m.name = name;
    parent.add(m);
    return m;
  }

  // ── Skal ──────────────────────────────────────────────────────
  put(group, box(width + 0.3, 0.1, depth + 0.3), matSlab, 0, 0.05, 0, 'slab');

  const walls = new THREE.Group();
  walls.name = 'walls';
  group.add(walls);
  const wy = interiorHeight / 2 + 0.1;
  put(walls, box(WALL_T, interiorHeight, depth), matWall, -halfW + WALL_T / 2, wy, 0, 'wallW');
  put(walls, box(WALL_T, interiorHeight, depth), matWall, halfW - WALL_T / 2, wy, 0, 'wallE');
  put(walls, box(width, interiorHeight, WALL_T), matWall, 0, wy, -halfD + WALL_T / 2, 'wallS');
  put(walls, box(width, interiorHeight, WALL_T), matWall, 0, wy, halfD - WALL_T / 2, 'wallN');

  const roof = new THREE.Group();
  roof.name = 'roof';
  group.add(roof);
  put(roof, box(width + 0.4, 0.3, depth + 0.4), matRoof, 0, interiorHeight + 0.25, 0, 'roofSlab');

  const doorMat = new THREE.MeshBasicMaterial({ color: COLOUR.door });
  materials.push(doorMat);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), doorMat);
  door.position.set(halfW - 0.05, 1.05, 0);
  door.rotation.y = Math.PI / 2;
  door.name = 'entranceDoor';
  group.add(door);
  const hatch = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.0), doorMat);
  hatch.position.set(-halfW + 0.05, 1.0, 3.6);
  hatch.rotation.y = -Math.PI / 2;
  hatch.name = 'deliveryHatch';
  group.add(hatch);

  // ── Inredning ─────────────────────────────────────────────────
  const interior = new THREE.Group();
  interior.name = 'interior';
  group.add(interior);

  const zoneMats: { [k: string]: THREE.MeshStandardMaterial } = {};
  ZONE_FLOORS.forEach(function (z) { zoneMats[z.id] = mat(z.colour, 0.9, 0); });

  // Golvzonerna. Huvudgolvet först, sedan zonerna ovanpå.
  floorPlate(interior, zoneMats.main, inX * 2, inZ * 2, 0, 0, 'floorMain');
  floorPlate(interior, zoneMats.lounge, 8.0, 3.4, 3.4, 4.0, 'floorLounge');
  floorPlate(interior, zoneMats.barRunway, SHELF_X - BAR_X + 0.9, BAR_Z1 - BAR_Z0 + 0.6,
             (SHELF_X + BAR_X) / 2, (BAR_Z0 + BAR_Z1) / 2, 'floorBarRunway');
  floorPlate(interior, zoneMats.dj, 3.4, 2.6, DJ_X, DJ_Z, 'floorDj');
  floorPlate(interior, zoneMats.kitchen, BOH_EDGE_X + inX, inZ - BOH_EDGE_Z,
             -inX + (BOH_EDGE_X + inX) / 2, BOH_EDGE_Z + (inZ - BOH_EDGE_Z) / 2, 'floorKitchen');

  // ── Köket ─────────────────────────────────────────────────────
  // Instängt i NV-hörnet med två halvväggar på 1,5 m — högt nog att
  // läsas som gräns uppifrån, lågt nog att inte skymma flaskhyllan.
  const kitchen = new THREE.Group();
  kitchen.name = 'kitchen';
  interior.add(kitchen);
  put(kitchen, box(0.15, 1.5, inZ - BOH_EDGE_Z), matWall,
      BOH_EDGE_X, 0.86, BOH_EDGE_Z + (inZ - BOH_EDGE_Z) / 2, 'kitchenWallX');
  put(kitchen, box(BOH_EDGE_X + inX, 1.5, 0.15), matWall,
      -inX + (BOH_EDGE_X + inX) / 2, 0.86, BOH_EDGE_Z, 'kitchenWallZ');
  put(kitchen, box(1.2, 0.9, 1.8), matKitchen, -6.7, 0.56, 2.6, 'stationPlancha');
  put(kitchen, box(1.3, 0.35, 1.9), matHood, -6.7, 2.05, 2.6, 'planchaHood');
  put(kitchen, box(2.0, 0.9, 0.8), matKitchen, -5.4, 0.56, 4.9, 'stationColdPrep');
  put(kitchen, box(0.4, 1.05, 1.8), matBar, BOH_EDGE_X - 0.2, 0.635, 3.3, 'passCounter');
  put(kitchen, box(0.5, 0.05, 1.9), matBarTop, BOH_EDGE_X - 0.2, 1.185, 3.3, 'passCounterTop');
  const passAnchor = new THREE.Object3D();
  passAnchor.name = 'passAnchor';
  passAnchor.position.set(BOH_EDGE_X - 0.2, 1.21, 3.3);
  kitchen.add(passAnchor);

  // ── Baren: hylla, disk, stolar ────────────────────────────────
  // Rummets mitt. Hyllan är målet, inte hindret — se avvikelse 1.
  const bar = new THREE.Group();
  bar.name = 'bar';
  interior.add(bar);

  const shelfLen = SHELF_Z1 - SHELF_Z0;
  const shelfZc = (SHELF_Z0 + SHELF_Z1) / 2;
  put(bar, box(SHELF_T, SHELF_H, shelfLen), matShelf, SHELF_X, SHELF_H / 2 + 0.11, shelfZc, 'bottleShelfBody');

  const shelfTargets: THREE.Object3D[] = [];
  // Visningsbandet börjar ÖVER diskens överkant (1,26 m). Första
  // versionen startade hyllplanen på 0,63 m och då rapporterade
  // siktlinjeprovet att noll av sex barstolar såg alla fyra plan —
  // helt riktigt, för det nedersta låg bakom en disk på 1,10 m.
  // Under 1,24 m är hyllan skåp, inte skyltning; hyllstommen är redan
  // en sluten box och läser som sockel.
  for (let i = 0; i < shelfTiers; i++) {
    const y = 1.24 + i * 0.26;
    const plank = put(bar, box(SHELF_T + 0.06, 0.04, shelfLen - 0.1), matBarTop,
                      SHELF_X + 0.04, y + 0.11, shelfZc, 'shelfTier' + i);
    shelfTargets.push(plank);
    // Flaskraden: en låg box per hyllplan i stället för femtio
    // cylindrar. Uppifrån och på avstånd läser den likadant.
    put(bar, box(0.12, 0.18, shelfLen - 0.3), matBottle,
        SHELF_X + 0.06, y + 0.13, shelfZc, 'bottleRow' + i);
  }
  const bottleAnchor = new THREE.Object3D();
  bottleAnchor.name = 'bottleAnchor';
  bottleAnchor.position.set(SHELF_X + 0.16, 1.61, shelfZc);
  bar.add(bottleAnchor);

  const barLen = BAR_Z1 - BAR_Z0;
  const barZc = (BAR_Z0 + BAR_Z1) / 2;
  put(bar, box(BAR_DEPTH, BAR_HEIGHT, barLen), matBar, BAR_X, BAR_HEIGHT / 2 + 0.11, barZc, 'barCounter');
  put(bar, box(BAR_DEPTH + 0.12, 0.05, barLen + 0.12), matBarTop,
      BAR_X, BAR_HEIGHT + 0.135, barZc, 'barCounterTop');
  // Fotlist i messing längs diskens framkant — den enda detalj som
  // faktiskt fångar ljus i en hög kamera.
  put(bar, box(0.06, 0.06, barLen), matBrass, BAR_X + BAR_DEPTH / 2 + 0.02, 0.24, barZc, 'barFootRail');
  const glassAnchor = new THREE.Object3D();
  glassAnchor.name = 'glassAnchor';
  glassAnchor.position.set(BAR_X + 0.22, BAR_HEIGHT + 0.16, barZc - 0.8);
  bar.add(glassAnchor);

  // ── DJ ────────────────────────────────────────────────────────
  // Platta + golvbyte + fond. Pulten själv är 1,1 m och skulle vara
  // en liten låda utan zonen omkring den.
  //
  // Läget är ett andra beslut: DJ:n står vid södra väggen mitt för
  // det öppna golvet, inte i bakre hörnet bakom disken. En pult som
  // ingen plats vänder sig mot är en pult ingen ser. Härifrån
  // adresserar den golvet mellan disken och tvåorna — och det golvet
  // får därmed en uppgift i stället för att vara ett tomrum.
  const dj = new THREE.Group();
  dj.name = 'dj';
  interior.add(dj);
  put(dj, box(3.0, DJ_PLATFORM, 2.2), matKerb, DJ_X, DJ_PLATFORM / 2 + 0.11, DJ_Z, 'djPlatform');
  put(dj, box(3.0, 1.9, 0.18), matDjFront, DJ_X, 1.06 + 0.11, DJ_Z - 1.1, 'djBackdrop');  put(dj, box(1.4, 0.95, 0.6), matDj, DJ_X, 0.475 + 0.11 + DJ_PLATFORM, DJ_Z + 0.2, 'djBooth');
  put(dj, box(1.5, 0.05, 0.7), matBarTop, DJ_X, 0.98 + 0.11 + DJ_PLATFORM, DJ_Z + 0.2, 'djBoothTop');
  // Siktlinjens mål är DJ:n, inte panelen bakom: en punkt i brösthöjd
  // där figuren står. Att mäta fonden hade gett svar på frågan "syns
  // en skiva plywood", vilket ingen ställde.
  const djTarget = new THREE.Object3D();
  djTarget.name = 'djTarget';
  djTarget.position.set(DJ_X - 0.35, 0.11 + DJ_PLATFORM + 1.45, DJ_Z - 0.55);
  dj.add(djTarget);
  const turntable = new THREE.Group();
  turntable.name = 'turntable';
  turntable.position.set(DJ_X - 0.35, 1.03 + 0.11 + DJ_PLATFORM, DJ_Z + 0.2);
  dj.add(turntable);
  put(turntable, cyl(0.16, 0.03, 16), matDj, 0, 0, 0, 'platter');
  put(turntable, box(0.03, 0.035, 0.3), matBrass, 0, 0.02, 0.08, 'platterMark');

  // ── Vinförrådet ───────────────────────────────────────────────
  // Bakre hörnet där DJ:n stod. Låga lådstaplar, 0,9 m — de läser som
  // förråd uppifrån och ger rummet ett slut i stället för ett tomrum.
  const store = new THREE.Group();
  store.name = 'wineStore';
  interior.add(store);
  put(store, box(1.1, 0.9, 0.8), matShelf, -6.7, 0.56, -1.9, 'crateStackA');
  put(store, box(1.0, 0.62, 0.75), matShelf, -6.6, 0.42, -3.1, 'crateStackB');
  put(store, box(1.15, 1.05, 0.85), matShelf, -6.75, 0.64, -4.3, 'crateStackC');
  put(store, box(0.9, 0.45, 0.7), matShelf, -5.4, 0.335, -4.6, 'crateStackD');

  // ── Möbler och platser ────────────────────────────────────────
  const seats: SeatSpec[] = [];
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  interior.add(furniture);

  function tableBox(id: string, x: number, z: number, lx: number, lz: number): void {
    const t = new THREE.Group();
    t.name = id;
    t.position.set(x, 0, z);
    furniture.add(t);
    put(t, box(lx, TABLE_TOP_T, lz), matTableTop, 0, TABLE_TOP_Y + 0.11, 0, id + 'Top');
    put(t, cyl(0.05, TABLE_TOP_Y, 8), matTableLeg, 0, TABLE_TOP_Y / 2 + 0.11, 0, id + 'Leg');
    put(t, cyl(0.22, 0.03, 12), matTableLeg, 0, 0.125, 0, id + 'Base');
  }

  function chair(x: number, z: number, facing: number, id: string): void {
    const c = new THREE.Group();
    c.name = id;
    c.position.set(x, 0, z);
    c.rotation.y = facing;
    furniture.add(c);
    put(c, cyl(0.22, 0.05, 12), matChair, 0, CHAIR_HEIGHT + 0.11, 0, id + 'Seat');
    put(c, cyl(0.04, CHAIR_HEIGHT, 8), matChair, 0, CHAIR_HEIGHT / 2 + 0.11, 0, id + 'Stem');
    put(c, box(0.42, 0.4, 0.04), matChair, 0, CHAIR_HEIGHT + 0.32, -0.2, id + 'Back');
  }

  // Loungen: två grupper om fyra separata dynor. Se avvikelse 3.
  const loungeSpec = [
    { id: 'loungeA', cx: 1.6 },
    { id: 'loungeB', cx: 5.2 }
  ];
  for (let li = 0; li < loungeSpec.length; li++) {
    const L = loungeSpec[li];
    // Ryggstödet är genomgående, dynorna är inte.
    put(furniture, box(LOUNGE_PITCH * 4, 0.62, 0.16), matLounge,
        L.cx, 0.42 + 0.11, LOUNGE_Z + 0.32, L.id + 'Back');
    put(furniture, box(LOUNGE_PITCH * 4 + 0.1, 0.2, 0.86), matLoungeTable,
        L.cx, 0.11 + 0.1, LOUNGE_Z + 0.06, L.id + 'Plinth');
    tableBox(L.id + 'Table', L.cx, LOUNGE_TABLE_Z, 1.6, 0.7);
    for (let k = 0; k < 4; k++) {
      const sx = L.cx + (k - 1.5) * LOUNGE_PITCH;
      // 0,08 m glapp mellan dynorna — det som gör fyra platser till
      // fyra platser uppifrån.
      put(furniture, box(LOUNGE_PITCH - 0.08, 0.14, 0.72), matLounge,
          sx, LOUNGE_SEAT_H + 0.04, LOUNGE_Z, L.id + 'Cushion' + k);
      seats.push({
        id: L.id + (k + 1),
        kind: 'lounge',
        seatIndex: seats.length,
        furnitureId: L.id,
        local: [sx, LOUNGE_Z],
        seatHeight: LOUNGE_SEAT_H,
        facing: Math.PI,
        approach: [sx, LOUNGE_LANE_Z],
        lane: 'loungeN'
      });
    }
  }

  // Tre tvåor i södra bandet, öster om DJ-zonen. Sitsoffset längs X,
  // som interiorLayout.
  const twoSpec = [{ id: 'twoA', x: 2.9 }, { id: 'twoB', x: 4.7 }, { id: 'twoC', x: 6.5 }];
  for (let ti = 0; ti < twoSpec.length; ti++) {
    const T = twoSpec[ti];
    tableBox(T.id, T.x, TWOTOP_Z, 0.95, 0.95);
    for (let k = 0; k < 2; k++) {
      const sx = T.x + (k === 0 ? -0.6 : 0.6);
      const facing = k === 0 ? Math.PI / 2 : -Math.PI / 2;
      chair(sx, TWOTOP_Z, facing, 'chair_' + T.id + (k + 1));
      seats.push({
        id: T.id + (k + 1),
        kind: 'twotop',
        seatIndex: seats.length,
        furnitureId: T.id,
        local: [sx, TWOTOP_Z],
        seatHeight: CHAIR_HEIGHT,
        facing: facing,
        approach: [sx, -3.4],
        lane: 'perimS'
      });
    }
  }

  // Barstolarna sist — samma ordning som interiorLayout.
  const stoolZ0 = -2.3;
  for (let i = 0; i < 6; i++) {
    const z = stoolZ0 + i * STOOL_PITCH;
    const c = new THREE.Group();
    c.name = 'stool' + i;
    c.position.set(STOOL_X, 0, z);
    furniture.add(c);
    put(c, cyl(0.19, 0.05, 12), matChair, 0, STOOL_HEIGHT + 0.11, 0, 'stool' + i + 'Seat');
    put(c, cyl(0.045, STOOL_HEIGHT, 8), matChair, 0, STOOL_HEIGHT / 2 + 0.11, 0, 'stool' + i + 'Stem');
    put(c, cyl(0.17, 0.03, 12), matBrass, 0, 0.13, 0, 'stool' + i + 'Foot');
    seats.push({
      id: 'bar' + (i + 1),
      kind: 'bar',
      seatIndex: seats.length,
      furnitureId: 'barCounter',
      local: [STOOL_X, z],
      seatHeight: STOOL_HEIGHT,
      facing: -Math.PI / 2,
      approach: [-0.1, z],
      lane: 'barLane'
    });
  }

  // ── Ståplatser vid diskens norra kortände ─────────────────────
  // Norra änden, inte södra: söder ligger DJ-plattan nu.
  const standing: StandSpec[] = [];
  for (let k = 0; k < STANDING_SPOTS; k++) {
    const sx = BAR_X - 0.65 + k * 0.55;
    standing.push({
      id: 'standBar' + (k + 1),
      local: [sx, BAR_Z1 + 0.35],
      facing: Math.PI,
      approach: [sx, 3.2],
      lane: 'spine'
    });
  }

  const entrance: Vec2 = [halfW - 0.6, 0];
  const waitingSpot: Vec2 = [halfW + 2.5, 0];

  const staffStations: StaffStation[] = [
    {
      id: 'sommelier',
      local: [-2.6, -0.6],
      standHeight: 0,
      facing: Math.PI / 2,
      uniform: STAFF_UNIFORMS.sommelier,
      note: 'Bakom disken, mitt för flaskhyllan. Runway 1,00 m, fri passage i båda ändar (Z < -3,8 och Z > 1,8).'
    },
    {
      id: 'dj',
      local: [DJ_X - 0.35, DJ_Z - 0.55],
      standHeight: DJ_PLATFORM,
      facing: 0,
      uniform: STAFF_UNIFORMS.dj,
      note: 'Mellan fonden och pulten, 0,25 m upp, vänd mot golvet. Se FLAGS.djState.'
    },
    {
      id: 'cook',
      local: [-6.0, 3.4],
      standHeight: 0,
      facing: -Math.PI / 2,
      uniform: STAFF_UNIFORMS.cook,
      note: 'Vid planchan. Två stationer inom ett steg: plancha, kall prep.'
    },
    {
      id: 'runner',
      local: [-3.9, 3.3],
      standHeight: 0,
      facing: -Math.PI / 2,
      uniform: STAFF_UNIFORMS.runner,
      note: 'Vid passluckan. Bär ut smårätter; vinet hämtas vid disken.'
    }
  ];

  const parts: RoomParts = {
    turntable: turntable,
    roof: roof,
    walls: walls,
    interior: interior,
    bar: bar,
    shelfTargets: shelfTargets,
    djTarget: djTarget,
    glassAnchor: glassAnchor,
    passAnchor: passAnchor,
    bottleAnchor: bottleAnchor
  };

  return {
    group: group,
    parts: parts,
    seats: seats,
    standing: standing,
    staffStations: staffStations,
    entrance: entrance,
    waitingSpot: waitingSpot,
    width: width,
    depth: depth,
    fits: fits,
    shortfall: shortfall,
    dispose: function () {
      materials.forEach(function (m) { m.dispose(); });
      group.removeFromParent();
    }
  };
}

/**
 * Enda rörliga delen. `phase` är 0..1 och kommer från anroparen —
 * rummet äger ingen klocka. Se FLAGS.djState: om tallriken ska vrida
 * sig alls är ett kvällstillstånd som inte finns ännu.
 */
export function updateWineBarRoom(room: WineBarRoom, phase: number): void {
  room.parts.turntable.rotation.y = (phase ?? 0) * Math.PI * 2;
}

// ---------- Gånggrafen ----------

const LANE_ENTRY_X = 6.9;
const BAR_LANE_X = -0.1;
const PERIM_S_Z = -3.4;
const PERIM_N_Z = 2.0;
const LOUNGE_LANE_Z = 4.02;
const LOUNGE_GAP_X = 3.4;   // slitsen mellan loungegruppernas bord

/**
 * Vägpunkter från entrén till en plats, i lokal XZ. Rummet deklarerar
 * sina egna passager i stället för att lämna framkomligheten åt
 * gissningar — playwright-provet går den här listan.
 */
export function walkPathToSeat(room: WineBarRoom, seatId: string): Vec2[] {
  const seat = room.seats.find(function (s) { return s.id === seatId; });
  if (!seat) return [];
  const path: Vec2[] = [[room.entrance[0], room.entrance[1]]];
  if (seat.lane === 'barLane') {
    path.push([BAR_LANE_X, 0]);
    path.push([BAR_LANE_X, seat.approach[1]]);
  } else if (seat.lane === 'perimS') {
    path.push([LANE_ENTRY_X, 0]);
    path.push([LANE_ENTRY_X, PERIM_S_Z]);
    path.push([seat.approach[0], PERIM_S_Z]);
    if (seat.approach[1] !== PERIM_S_Z) path.push([seat.approach[0], seat.approach[1]]);
  } else if (seat.lane === 'loungeN') {
    path.push([LANE_ENTRY_X, 0]);
    path.push([LANE_ENTRY_X, PERIM_N_Z]);
    path.push([LOUNGE_GAP_X, PERIM_N_Z]);
    path.push([LOUNGE_GAP_X, LOUNGE_LANE_Z]);
    path.push([seat.approach[0], LOUNGE_LANE_Z]);
  } else {
    path.push([seat.approach[0], 0]);
  }
  path.push([seat.local[0], seat.local[1]]);
  return path;
}

/** Vägen ut: samma korridorer baklänges, ut till väntplatsen. */
export function exitPathFromSeat(room: WineBarRoom, seatId: string): Vec2[] {
  const back = walkPathToSeat(room, seatId).slice().reverse();
  back.push([room.waitingSpot[0], room.waitingSpot[1]]);
  return back;
}

// ---------- Mätning ----------

/**
 * Mäter rummet i den scen som faktiskt renderas — samma tal
 * playwright ska hitta efter montering. Ett rum som finns i grafen men
 * inte har utbredning ger nollor här.
 */
export function measureWineBarRoom(room: WineBarRoom): {
  footprint: Vec2;
  interiorHeight: number;
  seatCount: number;
  standingCount: number;
  loungeSeats: number;
  barSeats: number;
  tableSeats: number;
  shelfHeight: number;
  djZoneArea: number;
} {
  room.group.updateWorldMatrix(true, true);
  const bb = new THREE.Box3().setFromObject(room.parts.interior);
  const barBox = new THREE.Box3().setFromObject(room.parts.bar);
  let lounge = 0;
  let barSeats = 0;
  let table = 0;
  room.seats.forEach(function (s) {
    if (s.kind === 'lounge') lounge++;
    else if (s.kind === 'bar') barSeats++;
    else table++;
  });
  let djArea = 0;
  const tmp = new THREE.Box3();
  room.parts.interior.traverse(function (o) {
    if (o.name === 'djPlatform') {
      tmp.setFromObject(o);
      djArea = (tmp.max.x - tmp.min.x) * (tmp.max.z - tmp.min.z);
    }
  });
  return {
    footprint: [bb.max.x - bb.min.x, bb.max.z - bb.min.z],
    interiorHeight: bb.max.y - bb.min.y,
    seatCount: room.seats.length,
    standingCount: room.standing.length,
    loungeSeats: lounge,
    barSeats: barSeats,
    tableSeats: table,
    shelfHeight: barBox.max.y,
    djZoneArea: djArea
  };
}

/**
 * Siktlinjeprovet, inverterat mot ölkrogen: här mäts sikten TILL
 * flaskhyllan, inte förbi den. Plus DJ-fonden som andra måltavla.
 * Kroppar och annotationer ska ligga utanför `room.group` när provet
 * körs.
 */
export function checkSightLines(room: WineBarRoom): {
  perSeat: { seatId: string; shelf: number; dj: boolean }[];
  seatsSeeingShelf: number;
  seatsSeeingDj: number;
  barSeatsSeeingAllTiers: number;
  blindSeats: string[];
} {
  room.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tiers = room.parts.shelfTargets;
  const perSeat = [];
  const blindSeats = [];
  let seeingShelf = 0;
  let seeingDj = 0;
  let barAll = 0;

  function clearTo(node: THREE.Object3D, from: THREE.Vector3, allow: string[]): boolean {
    node.getWorldPosition(target);
    dir.copy(target).sub(from);
    const dist = dir.length();
    ray.set(from, dir.normalize());
    ray.far = dist - 0.15;
    const hits = ray.intersectObject(room.group, true);
    for (let h = 0; h < hits.length; h++) {
      const n = hits[h].object.name;
      if (n.indexOf('floor') === 0) continue;
      let ok = false;
      for (let a = 0; a < allow.length; a++) {
        if (n.indexOf(allow[a]) === 0) { ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
  }

  for (let i = 0; i < room.seats.length; i++) {
    const s = room.seats[i];
    let eye = eyeHeightForSeat(s);
    origin.set(s.local[0], eye, s.local[1]);
    room.group.localToWorld(origin);
    let visible = 0;
    for (let t = 0; t < tiers.length; t++) {
      if (clearTo(tiers[t], origin, ['shelfTier', 'bottleRow', 'bottleShelf'])) visible++;
    }
    const djVisible = clearTo(room.parts.djTarget, origin, []);
    if (visible > 0) seeingShelf++;
    else blindSeats.push(s.id);
    if (djVisible) seeingDj++;
    if (s.kind === 'bar' && visible === tiers.length) barAll++;
    perSeat.push({ seatId: s.id, shelf: visible, dj: djVisible });
  }
  return {
    perSeat: perSeat,
    seatsSeeingShelf: seeingShelf,
    seatsSeeingDj: seeingDj,
    barSeatsSeeingAllTiers: barAll,
    blindSeats: blindSeats
  };
}

/**
 * Världskoordinater för platser, ståplatser, stationer och entré efter
 * att gruppen placerats. Bron till interiorLayout: sim-lagret får en
 * platt seats-lista i seatIndex-ordning, precis som i dag.
 */
export function resolveWorldPositions(room: WineBarRoom): {
  seats: Vec2[];
  standing: Vec2[];
  staffStations: Vec2[];
  entrance: Vec2;
  waitingSpot: Vec2;
} {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function toWorld(p: Vec2): Vec2 {
    v.set(p[0], 0, p[1]);
    room.group.localToWorld(v);
    return [v.x, v.z];
  }
  return {
    seats: room.seats.map(function (s) { return toWorld(s.local); }),
    standing: room.standing.map(function (s) { return toWorld(s.local); }),
    staffStations: room.staffStations.map(function (s) { return toWorld(s.local); }),
    entrance: toWorld(room.entrance),
    waitingSpot: toWorld(room.waitingSpot)
  };
}
