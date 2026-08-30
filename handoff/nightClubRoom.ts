// nightClubRoom — nattklubben. Den sjätte och största verksamheten.
//
// SUPERSEDING_DIRECTIVE_004. Formmall: brewpubRoom.ts, normaliserad av
// businessRoom.ts. Klassen heter 'nattklubben' (bestämd form, ORDER 139).
//
// Kontrakt: ren three.js, primitiver, inga externa beroenden, ingen
// skinning, inga loaders, inga binära assets. Byggs imperativt EN gång.
// Ingen egen klocka — spegelkulan drivs av en fas anroparen skickar in.
// Ingen simuleringslogik, ingen musikmekanik.
//
// ═══════════════════════════════════════════════════════════════════
// 1. HUNDRAFEMTIO PLATSER ÄR INTE HUNDRAFEMTIO STOLAR
// ═══════════════════════════════════════════════════════════════════
//
// Det här är den första verksamheten där seats[] INTE beskriver
// kapaciteten. En nattklubb är ståplatser, barer man tränger sig fram
// till, och golvyta där folk är utan att ha en tilldelad punkt.
//
// Att hitta på 126 diskreta ståpunkter hade varit att låtsas: ett
// dansgolv har inga platser. I stället levereras YTOR:
//
//   occupancyAreas[]   rektangel, m², persondensitet, kapacitet
//   distributeStanding(area, n)   fördelar n kroppar i en yta,
//                                 deterministiskt
//   seats[]            24 verkliga sittplatser i loungebänkarna
//
// Kapaciteten är summan: 126 stående + 24 sittande = 150.
//
// Barerna är däremot DISKRETA. Man köar vid en bar, och det är en
// ordning som läses. barApproaches[] har därför punkter, inte ytor.
//
// Se FLAGS.standingState och FLAGS.capacityModel: reduceraren vill ha
// ett platsantal, och 24 är inte 150.
//
// ═══════════════════════════════════════════════════════════════════
// 2. MÖRKRET VÄNDER HELA PALETTEN — och det är räknat, inte känt
// ═══════════════════════════════════════════════════════════════════
//
// De fem andra klasserna har golv på L 0,19–0,33 och figurer på
// L 0,083: figurerna är MÖRKARE än golvet. En nattklubb kan inte ha
// ljusa golv, och då slutar den lösningen fungera — men inte på det
// sätt man först tror.
//
// Räkna villkoret baklänges. För att en delad gästton (L 0,083) ska
// klara bandet [1,8 · 3,6] mot ett golv måste golvet vara
//
//     L ≤ 0,0239   (figuren ljusare än golvet)
//   eller
//     L ≥ 0,1894   (figuren mörkare än golvet)
//
// Mellanrummet 0,024–0,189 är FÖRBJUDET. Ett mellangrått golv går inte
// att ha, oavsett hur snyggt det är — och det är exakt det spann en
// "dov klubbgrå" hamnar i om man väljer den på känsla.
//
// Alla zoner måste ligga på SAMMA sida. Blandar man en mycket mörk zon
// med en ljus stängs fönstret helt: den ljusaste zonen sätter undre
// gränsen och den mörkaste den övre, och de korsar varandra.
//
// Nattklubbens tre zoner ligger därför alla mörkt, L 0,0125–0,0188, och
// figurfönstret blir L 0,0739–0,1750 — 0,101 brett, alltså BREDARE än
// vinbarens 0,064. Mörkret är inte fienden; spridningen är.
//
// Följden för figurerna: här är de LJUSARE än golvet. De delade
// gästtonerna på L 0,083 ligger nära fönstrets nedre kant och klarar
// sig; personalen får ljusare uniformer på L 0,124, mitt i fönstret.
// Det är också sant för rummet — barpersonal i ljust mot ett svart rum.
//
// Uppmätt: kontrast 1,92–2,79 mot samtliga tre zoner, noll par utanför
// bandet, roll-ΔE 36,5 mot kravet 12.
//
// ── Ljussättningen är inte rummets ──────────────────────────────
// Rummets ljus byggs av DayLighting och kvällscykeln, inte här. Talen
// ovan är mätta mot FÄRGEN, inte mot hur scenen renderar den — samma
// disciplin som gav FLOOR_COLOUR-felet när den brast.
//
// Och en varning som hör till leveransen: en kvällscykel som sänker
// exponeringen sänker figur och golv PROPORTIONELLT, så kvoten består.
// Men ett rörligt klubbljus som lyser upp golvfläckar gör det INTE —
// då blir en upplyst fläck en ny, ljusare zon som ingen deklarerat, och
// den kan hamna i det förbjudna mellanrummet. Se FLAGS.movingLight.
//
// ═══════════════════════════════════════════════════════════════════
// 3. LÄSBARHET UPPIFRÅN: TRUSSEN RAMAR, DEN TÄCKER INTE
// ═══════════════════════════════════════════════════════════════════
//
// Ett stort mörkt rum uppifrån är en mörk rektangel. Det som gör
// nattklubben läsbar:
//
//   1. TRUSSEN. En öppen ram på 4,20 m över dansgolvet — fyra balkar
//      plus tvärstag, 0,10 m tjocka. Uppifrån är den en RAM runt
//      dansgolvet, inte ett tak över det: kropparna syns igenom.
//      En solid skiva hade varit lättare att läsa och gömt allt under.
//   2. KROPPARNA. Hundrafemtio personer ÄR rummets innehåll. Ingen
//      geometri läser som nattklubb starkare än en tät golvyta.
//   3. BARERNAS DISKAR som långa raka linjer, med bakhyllans
//      flaskrader i en ljusare ton.
//   4. SPEGELKULAN i trussens mitt — en liten ljus skiva rakt
//      ovanifrån, och det enda som rör sig.
//
// ── Koordinater (identiskt med de fem andra) ─────────────────────
//   lokal +X = byggnadens långa axel, entrén i +X-änden
//   lokal +Z = korta axeln
//   origo    = polygonens centroid, golvplanet y = 0
//   room.group.position.set(obb.centre[0], 0, obb.centre[1]);
//   room.group.rotation.y = -obb.angle;
//
// ── Planlösningen, i ett stycke ─────────────────────────────────
// Man kommer in i +X och ser DJ:n tvärs över golvet i -X-änden — den
// längsta siktlinjen i rummet, och den enda orienteringspunkt en
// nykommen gäst får. Dansgolvet ligger i mitten. Huvudbaren löper
// längs hela -Z-väggen; loungeplattformen längs +Z, upphöjd 0,35 m så
// den som sitter ser över dem som står. TRE barer i tre olika
// relationer till flödet: entrébaren man stöter på direkt, huvudbaren
// man går längs, och satellitbaren som betjänar loungen.

import * as THREE from 'three';

// #region types

export type Vec2 = [number, number];
export type StaffRole = 'bar' | 'door' | 'floor' | 'dj';

export interface SeatSpec {
  id: string;
  kind: 'lounge';
  seatIndex: number;
  furnitureId: string;
  local: Vec2;
  seatHeight: number;
  facing: number;
  /** Plattformens höjd platsen står på. */
  standHeight: number;
}

/**
 * En yta folk är i, utan tilldelade punkter. Nattklubbens svar på att
 * seats[] inte beskriver kapaciteten.
 */
export interface OccupancyArea {
  id: string;
  kind: 'dance' | 'barFront' | 'loungeEdge' | 'entryHall';
  /** [minX, maxX, minZ, maxZ] i lokal ram. */
  bounds: [number, number, number, number];
  areaM2: number;
  /** Personer per kvadratmeter vid full beläggning. */
  densityPerM2: number;
  capacity: number;
  /** Golvhöjd ytan ligger på. */
  standHeight: number;
  note: string;
}

/** Köplats vid en bar. Diskret, för en barkö ÄR en ordning. */
export interface BarApproach {
  id: string;
  barId: string;
  index: number;
  local: Vec2;
  facing: number;
}

export interface BarSpec {
  id: string;
  /** Diskens mittpunkt och längd. */
  local: Vec2;
  lengthM: number;
  /** Kurs gästen står i när hen möter disken. */
  guestFacing: number;
  /** Personalens runway bakom disken, i meter. */
  runwayM: number;
  note: string;
}

export interface StaffStation {
  id: string;
  role: StaffRole;
  local: Vec2;
  standHeight: number;
  facing: number;
  uniform: string;
  note: string;
}

export interface RoomParts {
  /** Spegelkulan. Enda rörliga delen. */
  mirrorBall: THREE.Object3D;
  /** Ljustrussen — öppen ram, inte tak. */
  truss: THREE.Object3D;
  roof: THREE.Object3D;
  walls: THREE.Object3D;
  interior: THREE.Object3D;
  /** Barerna som egen grupp. */
  bars: THREE.Object3D;
  /** Loungeplattformen. */
  platform: THREE.Object3D;
  /** DJ-båset. */
  booth: THREE.Object3D;
  glassAnchor: THREE.Object3D;
  deckAnchor: THREE.Object3D;
}

export interface NightClubOptions {
  width?: number;
  depth?: number;
  interiorHeight?: number;
}

export interface NightClubRoom {
  group: THREE.Group;
  parts: RoomParts;
  /** 24 verkliga sittplatser. INTE kapaciteten. */
  seats: SeatSpec[];
  occupancyAreas: OccupancyArea[];
  bars: BarSpec[];
  barApproaches: BarApproach[];
  staffStations: StaffStation[];
  entrance: Vec2;
  waitingSpot: Vec2;
  /** 126 stående + 24 sittande. Se FLAGS.capacityModel. */
  capacity: number;
  width: number;
  depth: number;
  fits: boolean;
  shortfall: Vec2;
  dispose: () => void;
}

// #endregion types

// ---------- Låsta mått ----------

export const TOTAL_CAPACITY = 150;
export const SEATED_SEATS = 24;
export const MIN_WIDTH_M = 24.0;
export const MIN_DEPTH_M = 14.0;

const WALL_T = 0.25;
const PLINTH_M = 0.11;
const BAR_HEIGHT = 1.12;
const BAR_DEPTH = 0.72;
const BACKBAR_H = 1.9;
const PLATFORM_H = 0.35;
const BOOTH_H = 0.60;
const TRUSS_Y = 4.20;
const BALL_Y = 3.60;
const APPROACH_PITCH = 0.95;
const LOUNGE_SEAT_H = 0.42;

export const EYE_ABOVE_SEAT_M = 0.84;
export const EYE_STANDING_M = 1.66;

export function eyeHeightForSeat(seat: SeatSpec): number {
  return PLINTH_M + seat.standHeight + seat.seatHeight + EYE_ABOVE_SEAT_M;
}

// ---------- Palett ----------
//
// Se avsnitt 2. Tre zoner, alla mörka, alla på samma sida av det
// förbjudna mellanrummet.

export const BASE_FLOOR = '#1d1d21';

export const ZONE_FLOORS: { id: string; colour: string; note: string }[] = [
  { id: 'dance', colour: '#1d1d21', note: 'Dansgolvet. Mörkast, svalt. L 0,0125 — sätter figurfönstrets ÖVRE gräns.' },
  { id: 'barFront', colour: '#282521', note: 'Framför barerna. Varmare, en aning ljusare. L 0,0188 — sätter den NEDRE gränsen.' },
  { id: 'entryHall', colour: '#232324', note: 'Entréhallen och loungeplattformen. L 0,0169.' }
];

/** Delade gästtoner. Ligger på L 0,083, nära fönstrets nedre kant. */
export const GUEST_GARMENTS = [
  '#52505d', '#5b5045', '#465452', '#5c4d58',
  '#49544a', '#555144', '#554f61', '#5b4f4d'
];

/**
 * Fyra roller på L ≈ 0,124 — mitt i fönstret, och LJUSARE än
 * gästerna. Hueseparationen är räknad i Lab: vid låst ljushet kan
 * skillnaden bara komma ur kroma, så de fyra ligger på fyra hues 90°
 * isär med kroma 26. Pairwise ΔE 36,5 mot kravet 12.
 *
 * Att gissa riktningar gav 7,7 — under kravet. Talen nedan är lösta,
 * inte valda.
 */
export const STAFF_UNIFORMS: { [k: string]: string } = {
  bar: '#8a5263',
  door: '#706137',
  floor: '#226e62',
  dj: '#43658d'
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
 * Det FÖRBJUDNA mellanrummet för en given figurton: intervallet av
 * golvluminanser som inte går att ha.
 *
 * Det här är avsnitt 2 som funktion. Ett golv valt på känsla landar
 * nästan alltid i mellanrummet, och då syns felet först när någon
 * mäter.
 */
export function forbiddenFloorBand(
  figureHex: string,
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { darkMax: number; lightMin: number } {
  const L = luminance(figureHex);
  return {
    darkMax: (L + 0.05) / minRatio - 0.05,
    lightMin: minRatio * (L + 0.05) - 0.05
  };
}

/** Figurfönstret för rummets tre zoner. Se silhouetteContrast.zones.ts
 *  för den generiska versionen. */
export function figureWindow(
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { min: number; max: number; width: number } {
  let lightest = 0;
  let darkest = 1;
  for (let z = 0; z < ZONE_FLOORS.length; z++) {
    const L = luminance(ZONE_FLOORS[z].colour);
    if (L > lightest) lightest = L;
    if (L < darkest) darkest = L;
  }
  const min = minRatio * (lightest + 0.05) - 0.05;
  const max = maxRatio * (darkest + 0.05) - 0.05;
  return { min: min, max: max, width: max - min };
}

export const FLAGS = {
  businessClass:
    "BusinessClass saknar 'nattklubben'. Rummet kan inte väljas förrän " +
    'klassen finns, och den kan inte få capacityFor = 150 förrän ' +
    'kapaciteten är klassberoende. BLOCKERANDE.',
  standingState:
    "'standing' finns inte som gästtillstånd. Beslutat att det ska bli " +
    'ett, men inte byggt — och för nattklubben är det inte en detalj ' +
    'utan HELA verksamheten: 126 av 150 platser är ståplatser. Utan ' +
    'tillståndet är rummet tomt utom loungebänkarna. BLOCKERANDE.',
  capacityModel:
    'seats[] har 24 poster, kapaciteten är 150. Reduceraren läser ett ' +
    'platsantal, så den skulle se en nattklubb för 24 personer. ' +
    'occupancyAreas[] bär de övriga 126 som YTOR med densitet, vilket ' +
    'är sant för rummet men inte något modellen kan konsumera. ' +
    'Klassberoende kapacitet är beställd men inte byggd. BLOCKERANDE.',
  counterOrder:
    'Nattklubben är byggd på barbeställning, och gästens tillståndsmaskin ' +
    'saknar "går fram, beställer, hämtar, går" — samma flagga som ' +
    'ölkrogen och foodtrucken. Här finns tre barer och ingen ' +
    'bordsservering att falla tillbaka på.',
  eveningCurve:
    'En nattklubb har en kurva över kvällen: tom klockan nio, full ' +
    'klockan ett, tömd klockan tre. Simuleringen har ingen kvällsfas, ' +
    'ingen musiknivå och ingen publikkurva. updateNightClubRoom(room, ' +
    'phase) vrider spegelkulan när anroparen skickar en fas — skicka 0 ' +
    'tills något driver den. Vinbaren flaggade djState av samma skäl; ' +
    'här är det inte en pult utan hela dygnsrytmen.',
  movingLight:
    'Rummets ljus byggs av DayLighting, inte här, och palettens tal är ' +
    'mätta mot FÄRGEN. En kvällscykel som sänker exponeringen sänker ' +
    'figur och golv proportionellt, så kvoten består. Men ett RÖRLIGT ' +
    'klubbljus som lyser upp golvfläckar gör det inte: en upplyst ' +
    'fläck blir en ny, ljusare zon som ingen deklarerat, och den kan ' +
    'hamna i det förbjudna mellanrummet 0,024-0,189. Läggs rörligt ' +
    'ljus till måste dess ljusaste fläck deklareras som zon och prövas.',
  crowdDensity:
    'occupancyAreas[] bär densiteter (0,50-0,85 personer per m²) valda ' +
    'för att summan blir 150. Verklig trängsel varierar över kvällen ' +
    'och mellan ytor — dansgolvet packas, entréhallen töms. Ingen ' +
    'sådan variation finns i modellen, så densiteterna är ett tak, ' +
    'inte en prognos.',
  barChoice:
    'Tre barer finns med var sin relation till flödet. Vilken en gäst ' +
    'går till — närmast, kortast kö, eller den hen redan står vid — ' +
    'kräver ett val simuleringen inte kan göra. barApproaches[] är ' +
    'ordnade per bar så att en kö kan byggas när valet finns.',
  noKitchen:
    '"Enklare mat" är byggt som en liten mat-lucka vid entrébaren, inte ' +
    'som ett kök. Vilken mat, och om den ens serveras, kräver en ' +
    'menymodell som inte finns — samma flagga som i de fem andra.',
  duplicatedPaletteCode:
    'WCAG-formlerna finns nu i sju filer. silhouetteContrast.zones.ts ' +
    "behöver posten 'nattklubben' med de tre zonerna nedan, och då kan " +
    'palettkoden här tas bort. Notera att nattklubben är den FÖRSTA ' +
    'klassen där figurerna är ljusare än golvet — figureLuminanceWindow ' +
    'räknar rätt oavsett, men en läsare som antar mörka figurer mot ' +
    'ljusa golv läser fönstret bakvänt.'
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

function sph(r: number, seg: number): THREE.BufferGeometry {
  const key = 's' + r.toFixed(3) + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.SphereGeometry(r, seg, Math.max(4, seg / 2)); geometryCache.set(key, g); }
  return g;
}

function plane(w: number, h: number): THREE.BufferGeometry {
  const key = 'p' + w.toFixed(3) + '_' + h.toFixed(3);
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.PlaneGeometry(w, h); geometryCache.set(key, g); }
  return g;
}

export function disposeNightClubGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

// Mörk palett för fast inredning. Ljusare toner bara där de bär
// information: flaskraderna, trussen, spegelkulan.
const COLOUR = {
  slab: '#232323',
  wall: '#2b2b2e',
  roof: '#1a1a1c',
  door: '#0e0e10',
  bar: '#2f2b28',
  barTop: '#4a423a',
  backBar: '#262428',
  bottles: '#6d7a6a',
  platform: '#2a2a2d',
  banquette: '#3a343a',
  booth: '#242428',
  truss: '#8f9296',
  ball: '#c9ccd0',
  brass: '#6f5d38',
  steel: '#7d8186'
};

// ---------- Konstruktion ----------

export function createNightClubRoom(options?: NightClubOptions): NightClubRoom {
  const opts = options ?? {};
  const width = opts.width ?? 28.0;
  const depth = opts.depth ?? 16.0;
  const interiorHeight = opts.interiorHeight ?? 5.2;

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
  group.name = 'nightClubRoom';

  const materials: THREE.Material[] = [];
  function mat(colour: string, rough: number, metal: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    materials.push(m);
    return m;
  }

  const matSlab = mat(COLOUR.slab, 0.95, 0);
  const matWall = mat(COLOUR.wall, 0.92, 0);
  const matRoof = mat(COLOUR.roof, 0.95, 0);
  const matBar = mat(COLOUR.bar, 0.85, 0.05);
  const matBarTop = mat(COLOUR.barTop, 0.5, 0.1);
  const matBackBar = mat(COLOUR.backBar, 0.9, 0);
  const matBottles = mat(COLOUR.bottles, 0.35, 0.15);
  const matPlatform = mat(COLOUR.platform, 0.9, 0);
  const matBanquette = mat(COLOUR.banquette, 0.95, 0);
  const matBooth = mat(COLOUR.booth, 0.85, 0.05);
  const matTruss = mat(COLOUR.truss, 0.4, 0.55);
  const matBall = mat(COLOUR.ball, 0.15, 0.85);
  const matBrass = mat(COLOUR.brass, 0.4, 0.5);
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
  put(group, box(width + 0.4, 0.1, depth + 0.4), matSlab, 0, 0.05, 0, 'slab');

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
  put(roof, box(width + 0.5, 0.35, depth + 0.5), matRoof, 0, interiorHeight + 0.28, 0, 'roofSlab');

  const doorMat = new THREE.MeshBasicMaterial({ color: COLOUR.door });
  materials.push(doorMat);
  const door = new THREE.Mesh(plane(2.0, 2.3), doorMat);
  door.position.set(halfW - 0.05, 1.15, 0);
  door.rotation.y = Math.PI / 2;
  door.name = 'entranceDoor';
  group.add(door);

  // ── Inredning ─────────────────────────────────────────────────
  const interior = new THREE.Group();
  interior.name = 'interior';
  group.add(interior);

  const zoneMats: { [k: string]: THREE.MeshStandardMaterial } = {};
  ZONE_FLOORS.forEach(function (z) { zoneMats[z.id] = mat(z.colour, 0.9, 0.05); });

  // Dansgolvet i mitten, barremsan mot -Z, entréhall och lounge.
  const danceX0 = -5.5;
  const danceX1 = 5.5;
  const danceZ0 = -3.6;
  const danceZ1 = 5.4;
  floorPlate(interior, zoneMats.entryHall, inX * 2, inZ * 2, 0, 0, PLINTH_M, 'floorEntryHall');
  floorPlate(interior, zoneMats.dance, danceX1 - danceX0, danceZ1 - danceZ0,
             (danceX0 + danceX1) / 2, (danceZ0 + danceZ1) / 2, PLINTH_M + 0.002, 'floorDance');
  floorPlate(interior, zoneMats.barFront, inX * 2 - 2.0, 2.4, 0, -inZ + 1.9, PLINTH_M + 0.002, 'floorBarFront');

  // ── Barerna ───────────────────────────────────────────────────
  // Tre, i tre olika relationer till flödet. Placeringen ÄR
  // flödesbeslutet: entrébaren möter man direkt, huvudbaren går man
  // längs, satellitbaren betjänar loungen.
  const bars = new THREE.Group();
  bars.name = 'bars';
  interior.add(bars);

  function barCounter(id: string, cx: number, cz: number, len: number,
                      alongX: boolean, faceZ: number): void {
    const w = alongX ? len : BAR_DEPTH;
    const d = alongX ? BAR_DEPTH : len;
    put(bars, box(w, BAR_HEIGHT, d), matBar, cx, BAR_HEIGHT / 2 + PLINTH_M, cz, id + 'Counter');
    put(bars, box(w + 0.12, 0.05, d + 0.12), matBarTop,
        cx, BAR_HEIGHT + PLINTH_M + 0.025, cz, id + 'Top');
    // Messingfotlist på gästsidan.
    const railZ = alongX ? cz + faceZ * (BAR_DEPTH / 2 + 0.03) : cz;
    const railX = alongX ? cx : cx + faceZ * (BAR_DEPTH / 2 + 0.03);
    put(bars, box(alongX ? w : 0.06, 0.06, alongX ? 0.06 : d), matBrass,
        railX, 0.26, railZ, id + 'Rail');
    // Bakhyllan med flaskrader — den ljusaste ytan i rummet, och det
    // enda som säger "bar" på håll i ett mörkt rum.
    const backZ = alongX ? cz - faceZ * (BAR_DEPTH / 2 + 0.85) : cz;
    const backX = alongX ? cx : cx - faceZ * (BAR_DEPTH / 2 + 0.85);
    put(bars, box(alongX ? w : 0.3, BACKBAR_H, alongX ? 0.3 : d), matBackBar,
        backX, BACKBAR_H / 2 + PLINTH_M, backZ, id + 'BackBar');
    for (let t = 0; t < 3; t++) {
      const y = 0.72 + t * 0.34;
      put(bars, box(alongX ? w - 0.3 : 0.16, 0.2, alongX ? 0.16 : d - 0.3), matBottles,
          alongX ? cx : backX + faceZ * 0.1, y + PLINTH_M,
          alongX ? backZ + faceZ * 0.1 : cz, id + 'Bottles' + t);
    }
  }

  const barSpecs: BarSpec[] = [
    {
      id: 'main', local: [-1.0, -inZ + 0.6], lengthM: 12.0,
      guestFacing: Math.PI, runwayM: 0.95,
      note: 'Huvudbaren, hela -Z-väggen. Den man går längs — tolv meter disk och tio köplatser.'
    },
    {
      id: 'entry', local: [inX - 1.4, 3.2], lengthM: 4.2,
      guestFacing: -Math.PI / 2, runwayM: 0.9,
      note: 'Entrébaren, innanför dörren. Den man stöter på direkt, med matluckan i änden.'
    },
    {
      id: 'satellite', local: [-7.5, inZ - 0.7], lengthM: 4.6,
      guestFacing: 0, runwayM: 0.9,
      note: 'Satellitbaren vid loungens bortre ände. Betjänar dem som sitter, så de inte behöver korsa dansgolvet.'
    }
  ];

  barCounter('main', barSpecs[0].local[0], barSpecs[0].local[1], barSpecs[0].lengthM, true, 1);
  barCounter('entry', barSpecs[1].local[0], barSpecs[1].local[1], barSpecs[1].lengthM, false, -1);
  barCounter('satellite', barSpecs[2].local[0], barSpecs[2].local[1], barSpecs[2].lengthM, true, -1);

  // Matluckan. "Enklare mat" är en lucka, inte ett kök.
  put(bars, box(1.1, 1.05, 0.6), matBar, inX - 1.4, 0.635, 0.4, 'foodHatch');
  put(bars, box(1.2, 0.05, 0.7), matBarTop, inX - 1.4, 1.185, 0.4, 'foodHatchTop');

  const glassAnchor = new THREE.Object3D();
  glassAnchor.name = 'glassAnchor';
  glassAnchor.position.set(-1.0, BAR_HEIGHT + PLINTH_M + 0.06, -inZ + 0.6 + BAR_DEPTH / 2);
  bars.add(glassAnchor);

  // ── Loungeplattformen ─────────────────────────────────────────
  // Upphöjd 0,35 m så den som sitter ser över dem som står. Det är
  // hela skälet att den finns: annars är en sittplats i en nattklubb
  // en plats med utsikt över ryggar.
  const platform = new THREE.Group();
  platform.name = 'platform';
  interior.add(platform);
  const platX0 = -3.0;
  const platX1 = 10.0;
  const platLen = platX1 - platX0;
  const platCx = (platX0 + platX1) / 2;
  const platZ = inZ - 1.9;
  put(platform, box(platLen, PLATFORM_H, 3.6), matPlatform,
      platCx, PLATFORM_H / 2 + PLINTH_M, platZ, 'platformDeck');
  put(platform, box(platLen, 0.06, 0.1), matBrass,
      platCx, PLATFORM_H + PLINTH_M, platZ - 1.8, 'platformNosing');

  const seats: SeatSpec[] = [];
  // Fyra bänkar om sex. Det är de ENDA verkliga sittplatserna.
  for (let b = 0; b < 4; b++) {
    const bx = platX0 + 1.7 + b * 3.2;
    const id = 'banq' + b;
    put(platform, box(2.6, 0.42, 0.7), matBanquette,
        bx, PLINTH_M + PLATFORM_H + 0.21, platZ + 1.1, id + 'Seat');
    put(platform, box(2.6, 0.55, 0.12), matBanquette,
        bx, PLINTH_M + PLATFORM_H + 0.62, platZ + 1.5, id + 'Back');
    put(platform, cyl(0.42, 0.06, 12), matBarTop,
        bx, PLINTH_M + PLATFORM_H + 0.62, platZ + 0.1, id + 'Table');
    put(platform, cyl(0.06, 0.6, 8), matSteel,
        bx, PLINTH_M + PLATFORM_H + 0.3, platZ + 0.1, id + 'TableStem');
    for (let s = 0; s < 6; s++) {
      const sx = bx - 1.05 + s * 0.42;
      seats.push({
        id: id + '_' + (s + 1),
        kind: 'lounge',
        seatIndex: seats.length,
        furnitureId: id,
        local: [sx, platZ + 1.1],
        seatHeight: LOUNGE_SEAT_H,
        facing: Math.PI,
        standHeight: PLATFORM_H
      });
    }
  }

  // ── DJ-båset ──────────────────────────────────────────────────
  // I -X-änden, mitt för entrén. Den längsta siktlinjen i rummet och
  // den enda orienteringspunkt en nykommen gäst får.
  const booth = new THREE.Group();
  booth.name = 'booth';
  interior.add(booth);
  const boothX = -inX + 1.6;
  put(booth, box(3.4, BOOTH_H, 4.2), matBooth, boothX, BOOTH_H / 2 + PLINTH_M, 0.6, 'boothRiser');
  put(booth, box(2.4, 1.05, 0.7), matBar, boothX + 0.3, BOOTH_H + PLINTH_M + 0.525, -0.4, 'boothDesk');
  put(booth, box(2.5, 0.05, 0.8), matBarTop, boothX + 0.3, BOOTH_H + PLINTH_M + 1.075, -0.4, 'boothDeskTop');
  put(booth, box(0.35, 2.6, 1.0), matBooth, boothX - 1.4, PLINTH_M + 1.3, 2.0, 'boothStackRear');
  put(booth, box(0.35, 2.6, 1.0), matBooth, boothX - 1.4, PLINTH_M + 1.3, -0.8, 'boothStackFront');
  const deckAnchor = new THREE.Object3D();
  deckAnchor.name = 'deckAnchor';
  deckAnchor.position.set(boothX + 0.3, BOOTH_H + PLINTH_M + 1.12, -0.4);
  booth.add(deckAnchor);

  // ── Trussen ───────────────────────────────────────────────────
  // ÖPPEN RAM, inte tak. Uppifrån ramar den in dansgolvet och
  // kropparna syns igenom. En solid skiva hade varit lättare att läsa
  // och gömt allt under sig — och det som ska läsas är folket.
  const truss = new THREE.Group();
  truss.name = 'truss';
  interior.add(truss);
  const tX0 = danceX0 + 0.4;
  const tX1 = danceX1 - 0.4;
  const tZ0 = danceZ0 + 0.4;
  const tZ1 = danceZ1 - 0.4;
  const tLen = tX1 - tX0;
  const tDep = tZ1 - tZ0;
  put(truss, box(tLen, 0.1, 0.1), matTruss, (tX0 + tX1) / 2, TRUSS_Y, tZ0, 'trussS');
  put(truss, box(tLen, 0.1, 0.1), matTruss, (tX0 + tX1) / 2, TRUSS_Y, tZ1, 'trussN');
  put(truss, box(0.1, 0.1, tDep), matTruss, tX0, TRUSS_Y, (tZ0 + tZ1) / 2, 'trussW');
  put(truss, box(0.1, 0.1, tDep), matTruss, tX1, TRUSS_Y, (tZ0 + tZ1) / 2, 'trussE');
  for (let i = 1; i < 4; i++) {
    const cx = tX0 + (tLen * i) / 4;
    put(truss, box(0.08, 0.08, tDep), matTruss, cx, TRUSS_Y, (tZ0 + tZ1) / 2, 'trussCross' + i);
  }
  // Hängande strålkastare — små lådor, inga ljuskällor. Ljuset är
  // scenens, inte rummets.
  for (let i = 0; i < 6; i++) {
    const lx = tX0 + 0.7 + i * ((tLen - 1.4) / 5);
    put(truss, box(0.14, 0.22, 0.14), matSteel, lx, TRUSS_Y - 0.2, tZ0, 'lampS' + i);
    put(truss, box(0.14, 0.22, 0.14), matSteel, lx, TRUSS_Y - 0.2, tZ1, 'lampN' + i);
  }

  const mirrorBall = new THREE.Group();
  mirrorBall.name = 'mirrorBall';
  mirrorBall.position.set((danceX0 + danceX1) / 2, BALL_Y, (danceZ0 + danceZ1) / 2);
  interior.add(mirrorBall);
  put(mirrorBall, cyl(0.02, TRUSS_Y - BALL_Y, 6), matSteel, 0, (TRUSS_Y - BALL_Y) / 2, 0, 'ballRod');
  put(mirrorBall, sph(0.36, 14), matBall, 0, 0, 0, 'ballBody');
  // Facetter: fyra band så rotationen syns. En slät sfär är
  // rotationssymmetrisk och kan snurra hur fort som helst osynligt —
  // samma fälla som food truckens hjul utan ekrar.
  for (let i = 0; i < 4; i++) {
    const f = put(mirrorBall, box(0.74, 0.05, 0.05), matSteel, 0, 0, 0, 'ballFacet' + i);
    f.rotation.y = (i * Math.PI) / 4;
  }

  // ── Beläggningsytorna ─────────────────────────────────────────
  // Nattklubbens svar på att seats[] inte beskriver kapaciteten.
  function areaOf(b: [number, number, number, number]): number {
    return (b[1] - b[0]) * (b[3] - b[2]);
  }
  const areaDefs: { id: string; kind: any; bounds: [number, number, number, number];
                    density: number; standHeight: number; note: string }[] = [
    {
      id: 'dance', kind: 'dance', bounds: [danceX0, danceX1, danceZ0, danceZ1],
      density: 0.85, standHeight: 0,
      note: 'Dansgolvet. Tätast, och den enda ytan där trängsel är poängen.'
    },
    {
      id: 'barFront', kind: 'barFront', bounds: [-inX + 1.0, inX - 1.0, -inZ + 0.7, -inZ + 3.1],
      density: 0.70, standHeight: 0,
      note: 'Remsan framför huvudbaren. Rör sig långsamt, kö och genomgång i samma yta.'
    },
    {
      id: 'loungeEdge', kind: 'loungeEdge', bounds: [platX0, platX1, platZ - 1.8, platZ - 0.4],
      density: 0.50, standHeight: PLATFORM_H,
      note: 'Plattformens framkant. Man står vid bordet snarare än sitter.'
    },
    {
      id: 'entryHall', kind: 'entryHall', bounds: [6.5, inX - 0.6, -3.0, inZ - 4.2],
      density: 0.62, standHeight: 0,
      note: 'Entréhallen. Kappa av, orientera sig, se DJ:n tvärs över golvet.'
    }
  ];
  const occupancyAreas: OccupancyArea[] = areaDefs.map(function (d) {
    const a = areaOf(d.bounds);
    return {
      id: d.id, kind: d.kind, bounds: d.bounds,
      areaM2: a, densityPerM2: d.density,
      capacity: Math.round(a * d.density),
      standHeight: d.standHeight, note: d.note
    };
  });

  // ── Barköerna ─────────────────────────────────────────────────
  const barApproaches: BarApproach[] = [];
  function approachesFor(spec: BarSpec, n: number, alongX: boolean, faceZ: number): void {
    const standoff = BAR_DEPTH / 2 + 0.55;
    for (let i = 0; i < n; i++) {
      const t = -((n - 1) / 2) * APPROACH_PITCH + i * APPROACH_PITCH;
      const lx = alongX ? spec.local[0] + t : spec.local[0] + faceZ * standoff;
      const lz = alongX ? spec.local[1] + faceZ * standoff : spec.local[1] + t;
      barApproaches.push({
        id: spec.id + '_a' + i, barId: spec.id, index: i,
        local: [lx, lz], facing: spec.guestFacing
      });
    }
  }
  approachesFor(barSpecs[0], 10, true, 1);
  approachesFor(barSpecs[1], 4, false, -1);
  approachesFor(barSpecs[2], 5, true, -1);

  const entrance: Vec2 = [inX - 0.8, 0];
  const waitingSpot: Vec2 = [halfW + 2.5, 0];

  const staffStations: StaffStation[] = [
    {
      id: 'barMain', role: 'bar', local: [-1.0, -inZ + 0.6 - BAR_DEPTH / 2 - 0.5],
      standHeight: 0, facing: 0, uniform: STAFF_UNIFORMS.bar,
      note: 'Bakom huvudbaren. Runway 0,95 m mellan disk och bakhylla.'
    },
    {
      id: 'barEntry', role: 'bar', local: [inX - 1.4 + BAR_DEPTH / 2 + 0.5, 3.2],
      standHeight: 0, facing: -Math.PI / 2, uniform: STAFF_UNIFORMS.bar,
      note: 'Entrébaren, med matluckan inom två steg.'
    },
    {
      id: 'door', role: 'door', local: [inX - 0.8, -2.2],
      standHeight: 0, facing: Math.PI / 2, uniform: STAFF_UNIFORMS.door,
      note: 'Vid dörren, innanför och åt sidan så kön inte blockeras. Ser hela entréhallen.'
    },
    {
      id: 'floor', role: 'floor', local: [4.0, 2.6],
      standHeight: 0, facing: Math.PI, uniform: STAFF_UNIFORMS.floor,
      note: 'Golvpersonal mellan dansgolv och lounge. Plockar glas, den enda som rör sig fritt.'
    },
    {
      id: 'dj', role: 'dj', local: [boothX + 0.3, 0.4],
      standHeight: BOOTH_H, facing: Math.PI / 2, uniform: STAFF_UNIFORMS.dj,
      note: 'I båset, 0,60 m upp, vänd mot dansgolvet och entrén bortom det.'
    }
  ];

  const standingCapacity = occupancyAreas.reduce(function (n, a) { return n + a.capacity; }, 0);

  const parts: RoomParts = {
    mirrorBall: mirrorBall, truss: truss, roof: roof, walls: walls,
    interior: interior, bars: bars, platform: platform, booth: booth,
    glassAnchor: glassAnchor, deckAnchor: deckAnchor
  };

  return {
    group: group,
    parts: parts,
    seats: seats,
    occupancyAreas: occupancyAreas,
    bars: barSpecs,
    barApproaches: barApproaches,
    staffStations: staffStations,
    entrance: entrance,
    waitingSpot: waitingSpot,
    capacity: standingCapacity + seats.length,
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
 * Enda rörliga delen. `phase` 0..1 vrider spegelkulan ett varv.
 * Rummet äger ingen klocka, och simuleringen har ingen kvällskurva —
 * se FLAGS.eveningCurve. Skicka 0 tills något driver den.
 */
export function updateNightClubRoom(room: NightClubRoom, phase: number): void {
  room.parts.mirrorBall.rotation.y = (phase ?? 0) * Math.PI * 2;
}

/**
 * Fördelar n kroppar i en beläggningsyta. Deterministiskt: samma yta
 * och samma n ger alltid samma punkter, så två klienter renderar samma
 * bildruta likadant.
 *
 * Gyllene vinkel över en jitterad rutnätsindex — ett rent rutnät läser
 * som en skolkör, och slump kan inte återskapas.
 */
export function distributeStanding(area: OccupancyArea, n: number): Vec2[] {
  const out: Vec2[] = [];
  const count = Math.max(0, Math.min(n, area.capacity));
  if (count === 0) return out;
  const x0 = area.bounds[0];
  const x1 = area.bounds[1];
  const z0 = area.bounds[2];
  const z1 = area.bounds[3];
  const w = x1 - x0;
  const d = z1 - z0;
  const cols = Math.max(1, Math.round(Math.sqrt(count * (w / d))));
  const rows = Math.max(1, Math.ceil(count / cols));
  const golden = 2.399963;
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    // Jitter ur en deterministisk vinkel, ±0,32 av cellen.
    const jx = Math.cos(i * golden) * 0.32;
    const jz = Math.sin(i * golden) * 0.32;
    const u = (c + 0.5 + jx) / cols;
    const v = (r + 0.5 + jz) / rows;
    out.push([
      x0 + Math.min(0.98, Math.max(0.02, u)) * w,
      z0 + Math.min(0.98, Math.max(0.02, v)) * d
    ]);
  }
  return out;
}

// ---------- Gånggrafen ----------

const LANE_ENTRY_X = 8.6;
const LANE_BAR_Z = -3.1;
const LANE_PLAT_Z = 3.4;

/**
 * Vägpunkter från entrén till en barköplats. Rummet deklarerar sina
 * egna passager: med 150 personer i rummet är trängsel poängen, men en
 * gäst ska kunna nå baren.
 */
export function walkPathToBar(room: NightClubRoom, approachId: string): Vec2[] {
  const a = room.barApproaches.find(function (p) { return p.id === approachId; });
  if (!a) return [];
  const path: Vec2[] = [[room.entrance[0], room.entrance[1]]];
  if (a.barId === 'entry') {
    path.push([LANE_ENTRY_X, a.local[1]]);
  } else if (a.barId === 'main') {
    path.push([LANE_ENTRY_X, LANE_BAR_Z]);
    path.push([a.local[0], LANE_BAR_Z]);
  } else {
    path.push([LANE_ENTRY_X, LANE_PLAT_Z]);
    path.push([a.local[0], LANE_PLAT_Z]);
  }
  path.push([a.local[0], a.local[1]]);
  return path;
}

/** Vägpunkter till en loungeplats. */
export function walkPathToSeat(room: NightClubRoom, seatId: string): Vec2[] {
  const s = room.seats.find(function (x) { return x.id === seatId; });
  if (!s) return [];
  return [
    [room.entrance[0], room.entrance[1]],
    [LANE_ENTRY_X, LANE_PLAT_Z],
    [s.local[0], LANE_PLAT_Z],
    [s.local[0], s.local[1]]
  ];
}

export function exitPathFromSeat(room: NightClubRoom, seatId: string): Vec2[] {
  const back = walkPathToSeat(room, seatId).slice().reverse();
  back.push([room.waitingSpot[0], room.waitingSpot[1]]);
  return back;
}

// ---------- Mätning ----------

export function measureNightClubRoom(room: NightClubRoom): {
  footprint: Vec2;
  /** Fri takhöjd, mätt ur VÄGGARNA. */
  interiorHeight: number;
  /** Högsta inredning: trussen. Inte samma sak som taket. */
  tallestFitting: number;
  capacity: number;
  seatedSeats: number;
  standingCapacity: number;
  danceFloorM2: number;
  occupiableM2: number;
  barCount: number;
  barMetres: number;
  barApproaches: number;
  floorZones: number;
  trussClearance: number;
} {
  room.group.updateWorldMatrix(true, true);
  const inner = new THREE.Box3().setFromObject(room.parts.interior);
  let shellH = 0;
  const localBox = new THREE.Box3();
  room.parts.walls.traverse(function (o) {
    if (!o.isMesh || o.name !== 'wallW') return;
    o.geometry.computeBoundingBox();
    localBox.copy(o.geometry.boundingBox);
    shellH = (localBox.max.y - localBox.min.y) * o.scale.y;
  });
  const dance = room.occupancyAreas.find(function (a) { return a.id === 'dance'; });
  const standing = room.occupancyAreas.reduce(function (n, a) { return n + a.capacity; }, 0);
  const occupiable = room.occupancyAreas.reduce(function (n, a) { return n + a.areaM2; }, 0);
  const barMetres = room.bars.reduce(function (n, b) { return n + b.lengthM; }, 0);
  const trussBox = new THREE.Box3().setFromObject(room.parts.truss);
  return {
    footprint: [inner.max.x - inner.min.x, inner.max.z - inner.min.z],
    interiorHeight: shellH,
    tallestFitting: inner.max.y,
    capacity: room.capacity,
    seatedSeats: room.seats.length,
    standingCapacity: standing,
    danceFloorM2: dance ? dance.areaM2 : 0,
    occupiableM2: occupiable,
    barCount: room.bars.length,
    barMetres: barMetres,
    barApproaches: room.barApproaches.length,
    floorZones: ZONE_FLOORS.length,
    trussClearance: trussBox.min.y
  };
}

/**
 * Kapacitetskontraktet. 150 är summan av ytor och bänkar, och den
 * summan går sönder tyst om en densitet eller en bänk ändras.
 */
export function checkCapacity(room: NightClubRoom): {
  expected: number;
  standing: number;
  seated: number;
  total: number;
  ok: boolean;
  /** Reducerarens vy: den läser bara seats[]. */
  reducerWouldSee: number;
} {
  const standing = room.occupancyAreas.reduce(function (n, a) { return n + a.capacity; }, 0);
  return {
    expected: TOTAL_CAPACITY,
    standing: standing,
    seated: room.seats.length,
    total: standing + room.seats.length,
    ok: standing + room.seats.length === TOTAL_CAPACITY,
    reducerWouldSee: room.seats.length
  };
}

/**
 * Siktlinjen entré → DJ. Rummets enda orienteringspunkt, och den
 * längsta siktlinjen i huset — raycastat, inte antaget.
 */
export function checkSightToBooth(room: NightClubRoom): {
  distanceM: number;
  clear: boolean;
} {
  room.group.updateWorldMatrix(true, true);
  const dj = room.staffStations.find(function (s) { return s.id === 'dj'; });
  if (!dj) return { distanceM: 0, clear: false };
  const origin = new THREE.Vector3(room.entrance[0], EYE_STANDING_M, room.entrance[1]);
  const target = new THREE.Vector3(dj.local[0], dj.standHeight + 1.35, dj.local[1]);
  room.group.localToWorld(origin);
  room.group.localToWorld(target);
  const dir = new THREE.Vector3().copy(target).sub(origin);
  const dist = dir.length();
  const ray = new THREE.Raycaster(origin, dir.normalize());
  ray.far = dist - 0.4;
  const hits = ray.intersectObject(room.group, true);
  let clear = true;
  for (let h = 0; h < hits.length; h++) {
    const n = hits[h].object.name;
    if (n.indexOf('floor') === 0) continue;
    clear = false;
    break;
  }
  return { distanceM: dist, clear: clear };
}

export function resolveWorldPositions(room: NightClubRoom): {
  seats: Vec2[];
  barApproaches: Vec2[];
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
    barApproaches: room.barApproaches.map(function (a) { return toWorld(a.local); }),
    staffStations: room.staffStations.map(function (s) { return toWorld(s.local); }),
    entrance: toWorld(room.entrance),
    waitingSpot: toWorld(room.waitingSpot)
  };
}
