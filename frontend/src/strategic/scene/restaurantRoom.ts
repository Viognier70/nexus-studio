// restaurantRoom — spelarens restaurang, den ursprungliga matsalen.
//
// SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten).
// Formmall: brewpubRoom.ts / wineBarRoom.ts / innRoom.ts.
// Ersätter Restaurant.tsx.
//
// Kontrakt (oförändrat):
//   • Ren three.js, primitiver, inga externa beroenden, inga loaders,
//     inga binära assets.
//   • Byggs imperativt EN gång. Inget skapas i renderloopen.
//   • Ingen egen klocka. Det enda som rör sig (fläkten i kåpan) drivs
//     av en fas anroparen skickar in.
//   • Ingen simuleringslogik.
//
// ═══════════════════════════════════════════════════════════════════
// LÄS DETTA FÖRST — repot har TVÅ matsalar, och de är inte samma rum
// ═══════════════════════════════════════════════════════════════════
//
// Det här är den enda av de fyra verksamhetsklasserna som redan finns
// byggd, och den finns byggd två gånger, oförenligt:
//
//   A. RESTAURANT_INTERIOR i content/grythyttan.ts
//      Landmärkesbaserad. 16 × 12 m, centrum (0, 20), axelparallell.
//      Sex bord i ett 2 × 3-raster på östsidan, bardisk längs VÄSTRA
//      väggen (löper i Z), kök i NV-hörnet, tre staffHomes.
//      Landmärket självt är märkt verificationStatus 'placeholder'.
//      Restaurant.tsx renderar DENNA.
//
//   B. interiorLayout.ts
//      OBB-baserad på den verkliga OSM-byggnaden w869907975,
//      ~15,6 × 11,8 m, roterad ~7° öster om nord. Fem bord i EN RAD
//      längs långaxeln, bardisk längs den korta -Z-väggen (löper i X),
//      fyra barstolar. TOTAL_SEATS = 16 och matar reducerarens
//      DEFAULT_POLICIES.capacity.
//      InteriorGuests och InteriorStaff placerar figurer enligt DENNA.
//
// Följden: gästerna sitter i en annan byggnad än borden står i, med
// annan rotation och annat centrum. Ingen av filerna vet om det.
//
// DEN HÄR LEVERANSEN FÖLJER B, och skälen är inte smaksak:
//   • TOTAL_SEATS i B är reducerarens kapacitet. Ändras platserna
//     ändras spelet.
//   • ORDER 042 §3.2 (APPROXIMATION_REGISTER post 5 och 6) föreskriver
//     OBB och underkänner uttryckligen AABB-layout — A är AABB.
//   • B:s byggnad är verklig; A:s landmärke är en platshållare.
//
// När det här rummet monteras blir RESTAURANT_INTERIOR.bar, .kitchen,
// .tables och .staffHomes död kod. De ska tas bort, inte lämnas kvar
// som en andra sanning. Se FLAGS.twoLayouts.
//
// ── Koordinater (identiskt med de tre andra rummen) ────────────────
// Byggnadens OBB-lokala ram:
//   lokal +X = långa axeln, entrén i +X-änden
//   lokal +Z = korta axeln, baren mot -Z-väggen
//   origo    = polygonens centroid, golvplanet y = 0
//   room.group.position.set(obb.centre[0], 0, obb.centre[1]);
//   room.group.rotation.y = -obb.angle;
//
// ── Planlösningen, i ett stycke ───────────────────────────────────
// Rummet är det minsta av de fyra och det enda vars platsblandning är
// låst i förväg. Baren löper längs den LÅNGA väggen i -Z, borden i en
// enda rad längs +Z, och mellan dem ligger servicegången — hela
// matsalen läses som tre parallella band som löper LÄNGS långaxeln och
// staplas tvärs kortaxeln. (Varje band är en remsa med konstant Z som
// sträcker sig i X; -Z-väggen spänner width = 15,6 m och är alltså den
// långa, medan de korta väggarna är de i ±X.) Köket är en smal
// pentry-linje i -X-änden, bakom bardiskens västra ände, med
// passluckan vänd in mot servicegången. Entrén i +X, leveransfickan
// i -X: gäst och varor möts aldrig.
//
// ── Det som skiljer restaurangen från de tre andra ────────────────
// Baren här är en SERVICEDISK, inte ett mål. I ölkrogen vänder sig
// åtta av tjugo mot tanken; i vinbaren sex av tjugo mot flaskhyllan.
// Här är det fyra av sexton, och de fem borden vänder sig från baren,
// inte mot den. Därför får baren ingen bakhylla och ingen skyltning —
// den ska läsa som personalens arbetsyta, och rummets tyngdpunkt ska
// ligga i bordsraden. Det är också varför golvzonen bakom disken är
// den enda avvikande ytan i rummet.
//
// ── Fast geometri kontra ändringsbart ─────────────────────────────
// FAST: de tre banden längs långaxeln; bardiskens FRAMKANT på lokal
//   Z = -3,70 (barstolarnas position härleds ur den); bordsradens
//   Z = 3,00; platsordningen i seats[]; entrén i +X och leveransen
//   i -X.
// ÄNDRINGSBART: bardiskens djup bakåt (se FLAGS.barRunway), kökets
//   två stationer, rummets bredd och djup — understiger de
//   MIN_WIDTH_M / MIN_DEPTH_M returneras `fits: false` med underskott.
// INTE ÄNDRINGSBART HÄRIFRÅN: platsblandningen. Se FLAGS.seatMix.

import * as THREE from 'three';

// #region types

export type Vec2 = [number, number];

export type SeatKind = 'table' | 'bar';
export type TableKind = 'two' | 'four';
export type LaneId = 'service' | 'tableRow' | 'barLane';

export interface SeatSpec {
  id: string;
  kind: SeatKind;
  /** Reducerarens seatIndex, 0..15. Ordningen är låst — se FLAGS.seatMix. */
  seatIndex: number;
  /** Bordets id, eller 'bar' för stolarna. */
  furnitureId: string;
  local: Vec2;
  seatHeight: number;
  facing: number;
  approach: Vec2;
  lane: LaneId;
}

export interface TableSpec {
  id: string;
  kind: TableKind;
  seats: number;
  local: Vec2;
  sizeM: number;
}

export interface StaffStation {
  /** 'host' | 'server' | 'chef' */
  id: string;
  local: Vec2;
  facing: number;
  uniform: string;
  note: string;
}

export interface RoomParts {
  /** Fläkthjulet i spiskåpan. Enda rörliga delen. */
  hoodFan: THREE.Object3D;
  roof: THREE.Object3D;
  walls: THREE.Object3D;
  interior: THREE.Object3D;
  /** Bargruppen — disk, stolar, fotlist. */
  bar: THREE.Object3D;
  /** Skylten över entrén. */
  sign: THREE.Object3D;
  /** Fäste på disken där ett glas kan monteras. */
  glassAnchor: THREE.Object3D;
  /** Fäste vid passluckan där en tallrik kan monteras. */
  passAnchor: THREE.Object3D;
}

export interface RestaurantOptions {
  /** OBB-bredd, långa axeln. Default 15,6 (w869907975). */
  width?: number;
  /** OBB-djup, korta axeln. Default 11,8. */
  depth?: number;
  /** Innertakets höjd. Default 3,0 — RESTAURANT_INTERIOR.interiorHeight. */
  interiorHeight?: number;
  /** Bardiskens djup bakåt från framkanten. Default 0,70. */
  barCounterDepth?: number;
}

export interface RestaurantRoom {
  group: THREE.Group;
  parts: RoomParts;
  /** Sexton platser i seatIndex-ordning. */
  seats: SeatSpec[];
  tables: TableSpec[];
  staffStations: StaffStation[];
  entrance: Vec2;
  waitingSpot: Vec2;
  /** Köordningens ståplatser, 2 × 4 ut från dörren. */
  waitingSlots: Vec2[];
  /** Avvisade gäster som vänder ut igen. */
  declinedSlots: Vec2[];
  /** Ankomstbågen, sex lägen. */
  arrivalSlots: Vec2[];
  deliveryBay: Vec2;
  deliveryApproach: Vec2;
  width: number;
  depth: number;
  fits: boolean;
  shortfall: Vec2;
  dispose: () => void;
}

// #endregion types

// ---------- Låsta mått ----------
//
// Varje konstant nedan finns redan i interiorLayout.ts. De är
// upprepade här med SAMMA VÄRDEN och samma namn, så att filen kan bli
// den enda källan när interiorLayout importerar härifrån i stället för
// att räkna själv. Avviker något är det ett fel, inte en variant.

export const TOTAL_SEATS = 16;

export const MIN_WIDTH_M = 13.0;
export const MIN_DEPTH_M = 9.8;

const WALL_T = 0.2;
/** interiorLayout: BAR_WIDTH_M. Strippens djup, inte diskens. */
const BAR_STRIP_M = 1.6;
/** interiorLayout: BAR_OFFSET_M. Glapp mellan strippens bakkant och vägg. */
const BAR_OFFSET_M = 0.6;
/** interiorLayout: BAR_LENGTH_FRAC. */
const BAR_LENGTH_FRAC = 0.7;
/** interiorLayout: STOOL_OFFSET_M. Stolens front mot diskens framkant. */
const STOOL_OFFSET_M = 0.5;
/** interiorLayout: TABLE_ROW_Z. */
const TABLE_ROW_Z = 3.0;
/** interiorLayout: TABLE_HALF_SPAN_X. */
const TABLE_HALF_SPAN_X = 5.0;
/** interiorLayout: TWOTOP_SIZE_M / FOURTOP_SIZE_M. Deltat är avsiktligt
 *  stort — 1,05 mot 1,7 gör fyran otvetydig från fågelperspektiv. */
const TWOTOP_SIZE_M = 1.05;
const FOURTOP_SIZE_M = 1.7;
/** interiorLayout: SEAT_STANDOFF_M. */
const SEAT_STANDOFF_M = 0.7;
/** interiorLayout: ENTRANCE_INSET_M / WAITING_STANDOFF_M. */
const ENTRANCE_INSET_M = 0.6;
const WAITING_STANDOFF_M = 2.5;
/** interiorLayout: DELIVERY_BAY_OFFSET_M / DELIVERY_APPROACH_OFFSET_M. */
const DELIVERY_BAY_OFFSET_M = 2;
const DELIVERY_APPROACH_OFFSET_M = 6;

const WAITING_SLOT_LATERALS = [-0.6, 0.6];
const WAITING_SLOT_DEPTHS = [2.5, 3.4, 4.3, 5.2];
const DECLINED_SLOT_LATERALS = [-1.8, 1.8];
const DECLINED_SLOT_DEPTHS = [2.5, 3.4, 4.3, 5.2];
const ARRIVAL_SLOT_ANGLES = [-1.2, -0.7, -0.25, 0.25, 0.7, 1.2];
const ARRIVAL_SLOT_RADIUS = 6.0;

const TABLE_TOP_Y = 0.72;
const TABLE_TOP_T = 0.06;
const CHAIR_HEIGHT = 0.45;
const STOOL_HEIGHT = 0.75;
const BAR_HEIGHT = 1.1;
const PLINTH_M = 0.11;

/** Ögonhöjd räknas från sitsen, aldrig från golvet. Samma regel som
 *  wineBarRoom — en fast konstant gav 0 av 6 barstolar med sikt där. */
export const EYE_ABOVE_SEAT_M = 0.84;
export const EYE_STANDING_M = 1.66;

export function eyeHeightForSeat(seat: SeatSpec): number {
  return PLINTH_M + seat.seatHeight + EYE_ABOVE_SEAT_M;
}

/** Bordsblandningen, i seatIndex-ordning. Fem bord i en rad:
 *  tvåa | tvåa | FYRA | tvåa | tvåa. Summan är TOTAL_SEATS − 4 stolar. */
const TABLE_SPECS: TableSpec[] = [
  { id: 't0', kind: 'two', seats: 2, local: [-TABLE_HALF_SPAN_X, TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M },
  { id: 't1', kind: 'two', seats: 2, local: [-TABLE_HALF_SPAN_X / 2, TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M },
  { id: 't2', kind: 'four', seats: 4, local: [0, TABLE_ROW_Z], sizeM: FOURTOP_SIZE_M },
  { id: 't3', kind: 'two', seats: 2, local: [TABLE_HALF_SPAN_X / 2, TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M },
  { id: 't4', kind: 'two', seats: 2, local: [TABLE_HALF_SPAN_X, TABLE_ROW_Z], sizeM: TWOTOP_SIZE_M }
];

const BAR_STOOL_LOCAL_X = [-3, -1, 1, 3];

// ---------- Golvzoner och palett ----------
//
// TRE zoner, spann 0,026 i luminans. Basen är Restaurant.tsx eget
// golv #a49b8a, oförändrat — rummet ska läsa som samma plats.
//
// Spannet är bredare här än i gästgiveriet (0,008) därför att
// utgångsfärgen är given och inte vald. Figurfönstret blir
// L 0,056–0,148, alltså fortfarande brett; det är zonernas SPRIDNING
// som kostar, och tre zoner inom 0,026 kostar lite.

export const BASE_FLOOR = '#a49b8a';

export const ZONE_FLOORS: { id: string; colour: string; note: string }[] = [
  { id: 'dining', colour: BASE_FLOOR, note: 'Matsalen och servicegången. Restaurant.tsx eget golv. L 0,3317.' },
  { id: 'barRunway', colour: '#999690', note: 'Bakom disken och in i köksgången. Rummets enda avvikande yta. L 0,3060.' },
  { id: 'kitchen', colour: '#97999b', note: 'Pentryt. Kallare, gråare. L 0,3173.' }
];

/** Samma åtta gästtoner som gästgiveriet — figurerna ska inte byta
 *  garderob när de byter lokal. Prövade mot de här tre zonerna också. */
export const GUEST_GARMENTS = [
  '#52505d', '#5b5045', '#465452', '#5c4d58',
  '#49544a', '#555144', '#554f61', '#5b4f4d'
];

/** Tre roller, ur RESTAURANT_INTERIOR.staffHomes. Pairwise ΔE 17,9–26,6. */
export const STAFF_UNIFORMS: { [k: string]: string } = {
  host: '#624b52',
  server: '#435368',
  chef: '#435641'
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

export function checkPaletteAgainstFloors(
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { figure: string; floor: string; zone: string; ratio: number }[] {
  const fails = [];
  const figures = GUEST_GARMENTS.concat(
    Object.keys(STAFF_UNIFORMS).map(function (k) { return STAFF_UNIFORMS[k]; })
  );
  for (let i = 0; i < figures.length; i++) {
    for (let z = 0; z < ZONE_FLOORS.length; z++) {
      const r = contrast(figures[i], ZONE_FLOORS[z].colour);
      if (r < minRatio || r > maxRatio) {
        fails.push({
          figure: figures[i], floor: ZONE_FLOORS[z].colour,
          zone: ZONE_FLOORS[z].id, ratio: r
        });
      }
    }
  }
  return fails;
}

export function paletteContrastRange(): { min: number; max: number } {
  let lo = Infinity;
  let hi = 0;
  const figures = GUEST_GARMENTS.concat(
    Object.keys(STAFF_UNIFORMS).map(function (k) { return STAFF_UNIFORMS[k]; })
  );
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
 */
export const FLAGS = {
  twoLayouts:
    'BLOCKERANDE. Repot har två oförenliga matsalar: RESTAURANT_INTERIOR ' +
    'i content/grythyttan.ts (landmärke, 16 × 12 m, axelparallellt, sex ' +
    'bord i 2 × 3-raster, bar längs västra väggen) och interiorLayout.ts ' +
    '(OBB w869907975, 15,6 × 11,8 m roterad 7°, fem bord i en rad, bar ' +
    'längs -Z-väggen). Restaurant.tsx renderar den första; InteriorGuests ' +
    'och InteriorStaff placerar figurer enligt den andra. Gästerna sitter ' +
    'alltså i en annan byggnad än borden står i. Det här rummet följer ' +
    'interiorLayout, eftersom TOTAL_SEATS där matar reducerarens ' +
    'kapacitet och ORDER 042 §3.2 föreskriver OBB. Vid montering blir ' +
    'RESTAURANT_INTERIOR.bar/.kitchen/.tables/.staffHomes död kod och ' +
    'ska raderas — inte lämnas kvar som en andra sanning.',
  barRunway:
    'interiorLayout.BAR_WIDTH_M = 1,6 med BAR_OFFSET_M = 0,6 lämnar ' +
    '0,6 m mellan disken och väggen. Det är ingen passage: en figur är ' +
    '0,46 m bred och behöver dryga 0,8 m. Konstanten blandar ihop ' +
    'STRIPPENS djup (renderingshint) med DISKENS. Rummet löser det utan ' +
    'att röra en enda plats: framkanten ligger kvar på lokal Z = -3,70, ' +
    'som barstolarna härleds ur, och disken görs 0,70 m djup i stället ' +
    'för 1,60. Runwayen blir 1,30 m. Ändras BAR_WIDTH_M i interiorLayout ' +
    'flyttar däremot stolarna, eftersom stoolLocalZ räknas ur den — ' +
    'konstanten bör delas upp där.',
  seatMix:
    'Platsblandningen är låst i förväg: 4 × tvåa + 1 × fyra + 4 barstolar ' +
    '= 16, per Vision Owner-godkännande 2026-08-08, och TOTAL_SEATS matar ' +
    "reducerarens DEFAULT_POLICIES.capacity. Till skillnad från de tre " +
    'andra rummen kan sitsfördelningen alltså INTE justeras härifrån. ' +
    'Ordningen i seats[] är också låst — reduceraren indexerar rakt in i ' +
    'den: bordsplatser t0..t4 (0–11), sedan barstolarna (12–15).',
  staffTasks:
    'Tre roller finns som geometri och uniform — host, server, chef — men ' +
    'ingen av dem har ett uppgiftstillstånd. Samma flagga som i de tre ' +
    'andra rummen: TeamMember bär bara role. Stationerna är därför ' +
    'rollkonstanter, inte händelser. RESTAURANT_INTERIOR.staffHomes ' +
    'är dessutom räknade i den placeholder-geometri som utgår, så de ' +
    'lägena är omräknade här och ska inte hämtas därifrån.',
  landmarkId:
    "Landmärket heter 'gry-vinbar-placeholder-01' med displayName " +
    "'Restaurang (Gray Box)' och verificationStatus 'placeholder'. Id:t " +
    'säger vinbar. Nu när vinbaren finns som egen verksamhetsklass är ' +
    'det aktivt vilseledande, och en sökning på "vinbar" i repot träffar ' +
    'restaurangen. Bör döpas om i samma ändring som RESTAURANT_INTERIOR ' +
    'rensas.',
  kitchenStations:
    'Två stationer (spis, kall prep med diskho) är geometri. Vilken ' +
    'station en given rätt använder kräver en meny-/rättmodell som inte ' +
    'finns. Samma flagga som ölkrogen, vinbaren och gästgiveriet.',
  duplicatedPaletteCode:
    'WCAG-formlerna och checkPaletteAgainstFloors() finns nu i fyra ' +
    'rumsfiler som identiska kopior. silhouetteContrast.zones.ts ' +
    'levereras separat med FLOOR_ZONES_BY_BUSINESS för alla fyra ' +
    "klasserna (nyckeln 'restaurang' finns redan där) och en generisk " +
    'paletteZoneCheck(). Efter merge ska palettkoden här tas bort och ' +
    'importeras därifrån.'
};

// ---------- Geometricache ----------

const geometryCache = new Map<string, THREE.BufferGeometry>();

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = 'b' + w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3);
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geometryCache.set(key, g);
  }
  return g;
}

function cyl(r: number, h: number, seg: number): THREE.BufferGeometry {
  const key = 'c' + r.toFixed(3) + '_' + h.toFixed(3) + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, r, h, seg);
    geometryCache.set(key, g);
  }
  return g;
}

function plane(w: number, h: number): THREE.BufferGeometry {
  const key = 'p' + w.toFixed(3) + '_' + h.toFixed(3);
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.PlaneGeometry(w, h);
    geometryCache.set(key, g);
  }
  return g;
}

export function disposeRestaurantGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

// Restaurant.tsx egen palett, oförändrad där den finns.
const COLOUR = {
  slab: '#6d6a5f',
  wall: '#8f8b7f',
  roof: '#5c5951',
  door: '#1a1815',
  sign: '#a89577',
  tableTop: '#8b8477',
  tableLeg: '#4a453d',
  chair: '#b9b3ac',
  bar: '#6b5b47',
  barTop: '#7d6a52',
  brass: '#9a7f45',
  kitchen: '#767268',
  hood: '#403c36',
  steel: '#a9adb1'
};

// ---------- Konstruktion ----------

export function createRestaurantRoom(options?: RestaurantOptions): RestaurantRoom {
  const opts = options ?? {};
  const width = opts.width ?? 15.6;
  const depth = opts.depth ?? 11.8;
  const interiorHeight = opts.interiorHeight ?? 3.0;
  const counterDepth = opts.barCounterDepth ?? 0.70;

  const fits = width >= MIN_WIDTH_M && depth >= MIN_DEPTH_M;
  const shortfall: Vec2 = [
    Math.max(0, MIN_WIDTH_M - width),
    Math.max(0, MIN_DEPTH_M - depth)
  ];

  const halfW = width / 2;
  const halfD = depth / 2;
  const inX = halfW - WALL_T;
  const inZ = halfD - WALL_T;

  // Barens geometri, härledd precis som interiorLayout gör det.
  const barStripZ = -halfD + BAR_OFFSET_M + BAR_STRIP_M / 2;      // -4,50
  const barFrontZ = barStripZ + BAR_STRIP_M / 2;                   // -3,70
  const stoolZ = barFrontZ + STOOL_OFFSET_M;                       // -3,20
  const barLength = width * BAR_LENGTH_FRAC;                       // 10,92
  const counterZ = barFrontZ - counterDepth / 2;                   // -4,05
  const runwayBackZ = -inZ;
  const runwayWidth = (barFrontZ - counterDepth) - runwayBackZ;     // 1,30

  const group = new THREE.Group();
  group.name = 'restaurantRoom';

  const materials: THREE.Material[] = [];
  function mat(colour: string, rough: number, metal: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    materials.push(m);
    return m;
  }

  const matSlab = mat(COLOUR.slab, 0.9, 0);
  const matWall = mat(COLOUR.wall, 0.9, 0);
  const matRoof = mat(COLOUR.roof, 0.9, 0);
  const matSign = mat(COLOUR.sign, 0.85, 0);
  const matTableTop = mat(COLOUR.tableTop, 0.7, 0);
  const matTableLeg = mat(COLOUR.tableLeg, 0.9, 0);
  const matChair = mat(COLOUR.chair, 0.9, 0);
  const matBar = mat(COLOUR.bar, 0.85, 0);
  const matBarTop = mat(COLOUR.barTop, 0.6, 0);
  const matBrass = mat(COLOUR.brass, 0.4, 0.55);
  const matKitchen = mat(COLOUR.kitchen, 0.9, 0);
  const matHood = mat(COLOUR.hood, 0.85, 0.2);
  const matSteel = mat(COLOUR.steel, 0.45, 0.4);

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

  function floorPlate(parent: THREE.Object3D, m: THREE.Material,
                      w: number, d: number, x: number, z: number, y: number, name: string): THREE.Mesh {
    const o = new THREE.Mesh(plane(w, d), m);
    o.rotation.x = -Math.PI / 2;
    o.position.set(x, y, z);
    o.receiveShadow = true;
    o.name = name;
    parent.add(o);
    return o;
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
  const door = new THREE.Mesh(plane(1.4, 2.1), doorMat);
  door.position.set(halfW - 0.05, 1.05, 0);
  door.rotation.y = Math.PI / 2;
  door.name = 'entranceDoor';
  group.add(door);
  const hatch = new THREE.Mesh(plane(1.2, 2.0), doorMat);
  hatch.position.set(-halfW + 0.05, 1.0, -2.2);
  hatch.rotation.y = -Math.PI / 2;
  hatch.name = 'deliveryHatch';
  group.add(hatch);

  // Skylten över entrén. Restaurant.tsx har den i +Z-väggen; här sitter
  // den över dörren i +X, eftersom entrén ligger där i OBB-ramen.
  const sign = new THREE.Group();
  sign.name = 'sign';
  group.add(sign);
  const s = put(sign, box(0.15, 0.6, 3.2), matSign, halfW + 0.16, interiorHeight + 0.6, 0, 'signBlock');
  s.name = 'signBlock';

  // ── Inredning ─────────────────────────────────────────────────
  const interior = new THREE.Group();
  interior.name = 'interior';
  group.add(interior);

  const zoneMats: { [k: string]: THREE.MeshStandardMaterial } = {};
  ZONE_FLOORS.forEach(function (z) { zoneMats[z.id] = mat(z.colour, 0.9, 0); });

  floorPlate(interior, zoneMats.dining, inX * 2, inZ * 2, 0, 0, PLINTH_M, 'floorDining');
  // Runwayen bakom disken: den enda avvikande ytan i rummet, och den
  // som gör att kameran uppifrån ser var personalen hör hemma.
  const kitchenX0 = -inX;
  const kitchenX1 = -barLength / 2 - 0.2;
  floorPlate(interior, zoneMats.barRunway,
             barLength + 0.4, runwayWidth,
             0, runwayBackZ + runwayWidth / 2, PLINTH_M + 0.001, 'floorBarRunway');
  const kitDepth = 4.5;
  floorPlate(interior, zoneMats.kitchen,
             kitchenX1 - kitchenX0, kitDepth,
             (kitchenX0 + kitchenX1) / 2, -inZ + kitDepth / 2, PLINTH_M + 0.001, 'floorKitchen');

  // ── Köket ─────────────────────────────────────────────────────
  // Pentry-linje i -X-änden, bakom bardiskens västra ände. Två
  // stationer på en rad — smårätter i ett rum för sexton behöver inte
  // fler, och en tredje hade ätit av runwayen.
  const kitchen = new THREE.Group();
  kitchen.name = 'kitchen';
  interior.add(kitchen);
  const kitMidX = (kitchenX0 + kitchenX1) / 2;
  put(kitchen, box(0.15, 1.5, kitDepth), matWall, kitchenX1, 0.86, -inZ + kitDepth / 2, 'kitchenWall');
  put(kitchen, box(1.6, 0.9, 0.85), matKitchen, kitMidX, 0.56, -inZ + 0.5, 'stationRange');
  put(kitchen, box(1.7, 0.35, 0.95), matHood, kitMidX, 2.05, -inZ + 0.5, 'rangeHood');
  put(kitchen, box(1.6, 0.9, 0.85), matKitchen, kitMidX, 0.56, -inZ + 2.0, 'stationPrep');
  put(kitchen, box(0.9, 0.04, 0.6), matSteel, kitMidX, 1.03, -inZ + 2.0, 'prepSink');

  // Fläkthjulet — enda rörliga delen, och bara om anroparen ger en fas.
  const hoodFan = new THREE.Group();
  hoodFan.name = 'hoodFan';
  hoodFan.position.set(kitMidX, 1.85, -inZ + 0.5);
  kitchen.add(hoodFan);
  for (let i = 0; i < 4; i++) {
    const bl = put(hoodFan, box(0.34, 0.012, 0.07), matSteel, 0, 0, 0, 'fanBlade' + i);
    bl.rotation.y = (i / 4) * Math.PI;
  }

  // Passluckan: vänd in mot servicegången, inte mot matsalen.
  put(kitchen, box(0.4, 1.05, 1.5), matBar, kitchenX1 + 0.2, 0.635, -inZ + 3.4, 'passCounter');
  put(kitchen, box(0.5, 0.05, 1.6), matBarTop, kitchenX1 + 0.2, 1.185, -inZ + 3.4, 'passCounterTop');
  const passAnchor = new THREE.Object3D();
  passAnchor.name = 'passAnchor';
  passAnchor.position.set(kitchenX1 + 0.2, 1.21, -inZ + 3.4);
  kitchen.add(passAnchor);

  // ── Baren ─────────────────────────────────────────────────────
  // Servicedisk, inte destination. Ingen bakhylla, ingen skyltning —
  // tyngdpunkten ska ligga i bordsraden.
  const bar = new THREE.Group();
  bar.name = 'bar';
  interior.add(bar);
  put(bar, box(barLength, BAR_HEIGHT, counterDepth), matBar, 0, BAR_HEIGHT / 2 + PLINTH_M, counterZ, 'barCounter');
  put(bar, box(barLength + 0.12, 0.05, counterDepth + 0.12), matBarTop,
      0, BAR_HEIGHT + PLINTH_M + 0.025, counterZ, 'barCounterTop');
  put(bar, box(barLength, 0.06, 0.06), matBrass, 0, 0.24, barFrontZ + 0.03, 'barFootRail');
  const glassAnchor = new THREE.Object3D();
  glassAnchor.name = 'glassAnchor';
  glassAnchor.position.set(1.2, BAR_HEIGHT + PLINTH_M + 0.06, counterZ);
  bar.add(glassAnchor);

  // ── Möbler och platser ────────────────────────────────────────
  const seats: SeatSpec[] = [];
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  interior.add(furniture);

  function chair(x: number, z: number, facing: number, id: string): void {
    const c = new THREE.Group();
    c.name = id;
    c.position.set(x, 0, z);
    c.rotation.y = facing;
    furniture.add(c);
    put(c, cyl(0.22, 0.05, 12), matChair, 0, CHAIR_HEIGHT + PLINTH_M, 0, id + 'Seat');
    put(c, cyl(0.04, CHAIR_HEIGHT, 8), matChair, 0, CHAIR_HEIGHT / 2 + PLINTH_M, 0, id + 'Stem');
    put(c, box(0.42, 0.4, 0.04), matChair, 0, CHAIR_HEIGHT + PLINTH_M + 0.21, -0.2, id + 'Back');
  }

  /** Sitsoffsets kring ett bord — identiskt med interiorLayout. */
  function seatOffsets(kind: TableKind): Vec2[] {
    if (kind === 'two') return [[-SEAT_STANDOFF_M, 0], [SEAT_STANDOFF_M, 0]];
    return [[-SEAT_STANDOFF_M, 0], [SEAT_STANDOFF_M, 0],
            [0, -SEAT_STANDOFF_M], [0, SEAT_STANDOFF_M]];
  }

  for (let ti = 0; ti < TABLE_SPECS.length; ti++) {
    const T = TABLE_SPECS[ti];
    const tx = T.local[0];
    const tz = T.local[1];
    const t = new THREE.Group();
    t.name = T.id;
    t.position.set(tx, 0, tz);
    furniture.add(t);
    put(t, box(T.sizeM, TABLE_TOP_T, T.sizeM), matTableTop, 0, TABLE_TOP_Y + PLINTH_M, 0, T.id + 'Top');
    put(t, cyl(0.05, TABLE_TOP_Y, 8), matTableLeg, 0, TABLE_TOP_Y / 2 + PLINTH_M, 0, T.id + 'Leg');
    put(t, cyl(0.24, 0.03, 12), matTableLeg, 0, PLINTH_M + 0.015, 0, T.id + 'Base');

    const offs = seatOffsets(T.kind);
    for (let k = 0; k < offs.length; k++) {
      const sx = tx + offs[k][0];
      const sz = tz + offs[k][1];
      // Kursen pekar mot bordets mitt.
      const facing = Math.atan2(tx - sx, tz - sz);
      chair(sx, sz, facing, 'chair_' + T.id + (k + 1));
      // Angörning: från servicegången om platsen sitter på -Z-sidan
      // eller på kortsidorna, annars från norra remsan bakom raden.
      const fromNorth = offs[k][1] > 0;
      seats.push({
        id: T.id + (k + 1),
        kind: 'table',
        seatIndex: seats.length,
        furnitureId: T.id,
        local: [sx, sz],
        seatHeight: CHAIR_HEIGHT,
        facing: facing,
        approach: fromNorth ? [sx, TABLE_ROW_Z + 1.6] : [sx, TABLE_ROW_Z - 1.5],
        lane: fromNorth ? 'tableRow' : 'service'
      });
    }
  }

  // Barstolarna sist — seatIndex 12..15, precis som interiorLayout.
  for (let i = 0; i < BAR_STOOL_LOCAL_X.length; i++) {
    const sx = BAR_STOOL_LOCAL_X[i];
    const c = new THREE.Group();
    c.name = 'stool' + i;
    c.position.set(sx, 0, stoolZ);
    furniture.add(c);
    put(c, cyl(0.19, 0.05, 12), matChair, 0, STOOL_HEIGHT + PLINTH_M, 0, 'stool' + i + 'Seat');
    put(c, cyl(0.045, STOOL_HEIGHT, 8), matChair, 0, STOOL_HEIGHT / 2 + PLINTH_M, 0, 'stool' + i + 'Stem');
    put(c, cyl(0.17, 0.03, 12), matBrass, 0, 0.13 + PLINTH_M, 0, 'stool' + i + 'Foot');
    seats.push({
      id: 'bar' + (i + 1),
      kind: 'bar',
      seatIndex: seats.length,
      furnitureId: 'bar',
      local: [sx, stoolZ],
      seatHeight: STOOL_HEIGHT,
      // Vänd mot disken, alltså mot -Z.
      facing: Math.PI,
      approach: [sx, stoolZ + 1.3],
      lane: 'barLane'
    });
  }

  // ── Punkter utanför möbleringen ───────────────────────────────
  const entrance: Vec2 = [halfW - ENTRANCE_INSET_M, 0];
  const waitingSpot: Vec2 = [halfW + WAITING_STANDOFF_M, 0];
  const deliveryBay: Vec2 = [-halfW - DELIVERY_BAY_OFFSET_M, 0];
  const deliveryApproach: Vec2 = [
    -halfW - DELIVERY_BAY_OFFSET_M - DELIVERY_APPROACH_OFFSET_M, 0
  ];

  const waitingSlots: Vec2[] = [];
  for (let d = 0; d < WAITING_SLOT_DEPTHS.length; d++) {
    for (let l = 0; l < WAITING_SLOT_LATERALS.length; l++) {
      waitingSlots.push([halfW + WAITING_SLOT_DEPTHS[d], WAITING_SLOT_LATERALS[l]]);
    }
  }
  const declinedSlots: Vec2[] = [];
  for (let d = 0; d < DECLINED_SLOT_DEPTHS.length; d++) {
    for (let l = 0; l < DECLINED_SLOT_LATERALS.length; l++) {
      declinedSlots.push([halfW + DECLINED_SLOT_DEPTHS[d], DECLINED_SLOT_LATERALS[l]]);
    }
  }
  const arrivalSlots: Vec2[] = ARRIVAL_SLOT_ANGLES.map(function (theta) {
    return [
      halfW + ARRIVAL_SLOT_RADIUS * Math.cos(theta),
      ARRIVAL_SLOT_RADIUS * Math.sin(theta)
    ] as Vec2;
  });

  const staffStations: StaffStation[] = [
    {
      id: 'host',
      local: [halfW - 2.0, 1.6],
      facing: Math.PI / 2,
      uniform: STAFF_UNIFORMS.host,
      note: 'Vid entrén, innanför dörren och ur köns väg. Ser både dörren och bordsraden.'
    },
    {
      id: 'server',
      local: [0.6, barFrontZ + 1.4],
      facing: 0,
      uniform: STAFF_UNIFORMS.server,
      note: 'I servicegången mellan disken och bordsraden. Når alla fem bord och passluckan utan att korsa köordningen.'
    },
    {
      id: 'chef',
      local: [kitMidX, -inZ + 1.25],
      facing: -Math.PI / 2,
      uniform: STAFF_UNIFORMS.chef,
      note: 'I pentryt, mellan spis och prep. Två stationer inom ett steg, passluckan tre.'
    }
  ];

  const parts: RoomParts = {
    hoodFan: hoodFan,
    roof: roof,
    walls: walls,
    interior: interior,
    bar: bar,
    sign: sign,
    glassAnchor: glassAnchor,
    passAnchor: passAnchor
  };

  return {
    group: group,
    parts: parts,
    seats: seats,
    tables: TABLE_SPECS.map(function (t) { return t; }),
    staffStations: staffStations,
    entrance: entrance,
    waitingSpot: waitingSpot,
    waitingSlots: waitingSlots,
    declinedSlots: declinedSlots,
    arrivalSlots: arrivalSlots,
    deliveryBay: deliveryBay,
    deliveryApproach: deliveryApproach,
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
 * Enda rörliga delen. `phase` 0..1 från anroparen — rummet äger ingen
 * klocka. Fläkten går bara när köket lagar mat, vilket är ett
 * tillstånd som inte finns: skicka 0 tills det gör det.
 */
export function updateRestaurantRoom(room: RestaurantRoom, phase: number): void {
  room.parts.hoodFan.rotation.y = (phase ?? 0) * Math.PI * 2;
}

// ---------- Gånggrafen ----------

const LANE_SERVICE_Z = 1.4;      // gången mellan disk och bordsrad
const LANE_NORTH_Z = 4.7;        // remsan bakom bordsraden
// Entrénoden. Utan den gick vägen på diagonalen från dörren rakt mot
// korridoren och passerade 0,42 m från yttersta tvåans stol på lokal
// X = 5,7 — mätbart för trångt för en kropp på 0,46 m. Noden ligger
// öster om alla möbler, så alla sexton vägar viker av i fri luft.
const LANE_ENTRY_X = 6.8;

/**
 * Vägpunkter från entrén till en plats, lokal XZ. Rummet deklarerar
 * sina egna passager i stället för att lämna framkomligheten åt
 * gissningar.
 */
export function walkPathToSeat(room: RestaurantRoom, seatId: string): Vec2[] {
  const seat = room.seats.find(function (s) { return s.id === seatId; });
  if (!seat) return [];
  const path: Vec2[] = [[room.entrance[0], room.entrance[1]]];
  path.push([LANE_ENTRY_X, 0]);
  if (seat.lane === 'barLane') {
    const lz = stoolLaneZ(room);
    path.push([LANE_ENTRY_X, lz]);
    path.push([seat.approach[0], lz]);
  } else if (seat.lane === 'tableRow') {
    path.push([LANE_ENTRY_X, LANE_NORTH_Z]);
    path.push([seat.approach[0], LANE_NORTH_Z]);
    path.push([seat.approach[0], seat.approach[1]]);
  } else {
    path.push([LANE_ENTRY_X, LANE_SERVICE_Z]);
    path.push([seat.approach[0], LANE_SERVICE_Z]);
    path.push([seat.approach[0], seat.approach[1]]);
  }
  path.push([seat.local[0], seat.local[1]]);
  return path;
}

function stoolLaneZ(room: RestaurantRoom): number {
  const s = room.seats.find(function (x) { return x.kind === 'bar'; });
  return s ? s.approach[1] : LANE_SERVICE_Z;
}

/** Vägen ut: samma korridorer baklänges, ut till väntplatsen. */
export function exitPathFromSeat(room: RestaurantRoom, seatId: string): Vec2[] {
  const back = walkPathToSeat(room, seatId).slice().reverse();
  back.push([room.waitingSpot[0], room.waitingSpot[1]]);
  return back;
}

// ---------- Mätning ----------

export function measureRestaurantRoom(room: RestaurantRoom): {
  footprint: Vec2;
  /** Fri takhöjd, mätt ur väggarna — inte ur inredningen. */
  interiorHeight: number;
  /** Högsta inredning: spiskåpan. */
  tallestFitting: number;
  seatCount: number;
  tableSeats: number;
  barSeats: number;
  tableCount: number;
  barLengthM: number;
  runwayWidthM: number;
  floorZones: number;
} {
  room.group.updateWorldMatrix(true, true);
  const inner = new THREE.Box3().setFromObject(room.parts.interior);
  // Takhöjden läses ur en VÄGGMESH, inte ur väggruppen. Anroparen
  // skalar parts.walls i y för att kapa dem i närbild (Restaurant.tsx
  // gör motsvarande med opacitet), och en Box3 över gruppen tar med
  // den skalningen — modellen rapporterade 1,00 m fri takhöjd i ett
  // rum som är 3,00. En mätning som ändras av hur man tittar är ingen
  // mätning.
  let shellH = 0;
  const localBox = new THREE.Box3();
  room.parts.walls.traverse(function (o) {
    if (!o.isMesh || o.name !== 'wallW') return;
    // ORDER 142-avvikelse: `o.geometry` är typad som optional via
    // three-augmentations.d.ts (endast satt på Mesh), och
    // `computeBoundingBox()` sätter `boundingBox: Box3 | null`. Guarden
    // `!o.isMesh` ovan säkerställer att geometry finns; efter compute
    // finns boundingBox. Non-null-assert håller call-siten byte-nära
    // handoff-koden.
    const geo = o.geometry!;
    geo.computeBoundingBox();
    localBox.copy(geo.boundingBox!);
    shellH = (localBox.max.y - localBox.min.y) * o.scale.y;
  });
  let tableSeats = 0;
  let barSeats = 0;
  room.seats.forEach(function (s) {
    if (s.kind === 'bar') barSeats++;
    else tableSeats++;
  });
  const barBox = new THREE.Box3();
  let barLen = 0;
  let runway = 0;
  room.parts.interior.traverse(function (o) {
    if (o.name === 'barCounter') {
      barBox.setFromObject(o);
      barLen = barBox.max.x - barBox.min.x;
    }
    if (o.name === 'floorBarRunway') {
      barBox.setFromObject(o);
      runway = barBox.max.z - barBox.min.z;
    }
  });
  return {
    footprint: [inner.max.x - inner.min.x, inner.max.z - inner.min.z],
    interiorHeight: shellH,
    tallestFitting: inner.max.y,
    seatCount: room.seats.length,
    tableSeats: tableSeats,
    barSeats: barSeats,
    tableCount: room.tables.length,
    barLengthM: barLen,
    runwayWidthM: runway,
    floorZones: ZONE_FLOORS.length
  };
}

/**
 * Kontrollerar att platsordningen är den reduceraren väntar sig.
 * TOTAL_SEATS är kapacitet; ordningen är index. Båda måste stämma,
 * och båda kan gå sönder tyst.
 */
export function checkSeatContract(room: RestaurantRoom): {
  count: number;
  expected: number;
  orderOk: boolean;
  tableSeatsFirst: boolean;
  ok: boolean;
} {
  let orderOk = true;
  let seenBar = false;
  let tableAfterBar = false;
  for (let i = 0; i < room.seats.length; i++) {
    if (room.seats[i].seatIndex !== i) orderOk = false;
    if (room.seats[i].kind === 'bar') seenBar = true;
    else if (seenBar) tableAfterBar = true;
  }
  const count = room.seats.length;
  return {
    count: count,
    expected: TOTAL_SEATS,
    orderOk: orderOk,
    tableSeatsFirst: !tableAfterBar,
    ok: count === TOTAL_SEATS && orderOk && !tableAfterBar
  };
}

/**
 * Världskoordinater efter placering. Bron till interiorLayout: samma
 * fält, samma ordning, så konsumenterna inte behöver ändras.
 */
export function resolveWorldPositions(room: RestaurantRoom): {
  seats: Vec2[];
  tables: Vec2[];
  staffStations: Vec2[];
  entrance: Vec2;
  waitingSpot: Vec2;
  waitingSlots: Vec2[];
  declinedSlots: Vec2[];
  arrivalSlots: Vec2[];
  deliveryBay: Vec2;
  deliveryApproach: Vec2;
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
    tables: room.tables.map(function (t) { return toWorld(t.local); }),
    staffStations: room.staffStations.map(function (s) { return toWorld(s.local); }),
    entrance: toWorld(room.entrance),
    waitingSpot: toWorld(room.waitingSpot),
    waitingSlots: room.waitingSlots.map(toWorld),
    declinedSlots: room.declinedSlots.map(toWorld),
    arrivalSlots: room.arrivalSlots.map(toWorld),
    deliveryBay: toWorld(room.deliveryBay),
    deliveryApproach: toWorld(room.deliveryApproach)
  };
}
