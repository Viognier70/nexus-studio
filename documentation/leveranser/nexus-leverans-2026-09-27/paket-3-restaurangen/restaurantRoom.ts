// restaurantRoom — restaurangen, Nexus v1 (DESIGN_SPEC_NEXUS_V1 §2.3, paket 3).
//
// SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten).
// Formmall: wineBarRoom.ts (paket 1). Samma kontrakt, samma koordinat-
// konvention, samma kapade väggar, samma kameraprov. Ersätter
// restaurantRoom.ts ur leveransen 2026-08-30 — se LEVERANS.md.
//
// Kontrakt (oförändrat):
//   • Ren three.js, primitiver. Inga loaders, inga binära assets.
//   • Byggs imperativt EN gång. Dagens tre lägen (morgon, lunch, middag)
//     byggs alla från början och växlas med `visible`.
//   • Ingen egen klocka. Ljuslågorna drivs av en fas anroparen skickar in.
//   • Ingen simuleringslogik.
//
// ── Vad specen ändrade, och vad det kostade ───────────────────────
//
// 1. SEXTIO PLATSER KRÄVER EN ANNAN BYGGNAD. Den förra restaurangen hade
//    sexton låsta platser i w869907975 (15,6 × 11,8 m). Den byggnaden är
//    vinbarens sedan paket 1 ("dagens byggda lokal görs om"). Sextio
//    platser, en bar och ett stort kök ryms inte där: matsalen behöver
//    ~150 m², köket med disk och kyl ~95. Rummet är 23,4 × 15,6 m
//    (MIN 22,0 × 14,8). Vilken byggnad i Grythyttan är öppet — FLAGS.building.
//
// 2. SERVISENS FLÖDE ÄR EN SLINGA PÅ GOLVET. Specen: "tydlig väg mellan
//    kök och matsal, så att spelaren ser servisens flöde". Ett flöde syns
//    uppifrån bara om det har en riktning. Därför två öppningar i köks-
//    väggen, inte en: PASSET (mat ut) och DISKLUCKAN (disk in), fem meter
//    isär. Servitören tar tallriken vid passet, går ut längs mittgången,
//    serverar, och går tillbaka längs norra gången till diskluckan och
//    sedan ned till passet igen. Slingan har en egen golvzon —
//    servisstråket — som är det enda i matsalen som inte är parkett.
//    SERVICE_LOOP är slingan som data; serviceLoopPoint(u) ger punkten.
//
// 3. MISE EN PLACE SYNS SOM ETT RUTNÄT AV KANTINER. Från 23 m är en
//    kantin 7 × 6 px. Ett rutnät av dem i sex färger på ett stålbord är
//    det mest otvetydiga "morgon i köket" som finns uppifrån, och det
//    kräver inget annat än vågräta ytor. På morgonen står 24 kantiner på
//    mittbänken och skärbrädor vid varje station. Under servicen är
//    mittbänken tom utom tallrikarna som läggs upp, och kantinerna finns
//    bara kvar i stationernas insatser.
//
// 4. LJUSARE ÄN VINBAREN — I GOLVET OCH I DUKARNA. Figurfönstret tillåter
//    golv upp till L 0,426 mot mörkaste figur. Vinbaren ligger på
//    0,25–0,31; restaurangen på 0,34–0,38. Resten av ljusheten kommer från
//    vita dukar, ljusa väggar med grågrön boasering och ljus björk i
//    stolarna. Dukarna är inte golv och ingår inte i bandet: en huvud-
//    kalott mot vit duk har kvot ~7, långt över 3,6, och det är avsiktligt
//    — det är bordet som ska lysa, figuren läses mot golvet runt det.
//
// ── Koordinater (identiskt med de andra rummen) ───────────────────
//   lokal +X = långa axeln, entrén i +X-änden, leveransen i −X
//   lokal +Z = korta axeln
//   origo    = polygonens centroid, golvplanet y = 0,11 (sockeln)
//   room.group.position.set(obb.centre[0], 0, obb.centre[1]);
//   room.group.rotation.y = -obb.angle;
//
// ── Planen, i ett stycke ──────────────────────────────────────────
// Köket tar västra tredjedelen (6,7 m). Varma linjen mot västra väggen
// under kåpan (grill, spis, sås och garnityr), kallskänken mot södra,
// bakverket mot disken i norr, mittbänken i mitten och passet i östra
// väggen. Disken och kylrummet ligger i NV-hörnet med leveransdörren i
// västra väggen. Matsalen har tolv fyror i tre rader och sex tvåor längs
// väggarna. Baren står längs norra väggens östra del, entrén och
// hovmästarpulten i öster.
//
// ── Fast kontra ändringsbart ──────────────────────────────────────
// FAST: köket i −X och entrén i +X; passet och diskluckan som två
//   öppningar; servisslingan; sextio bordsplatser före barstolarna i
//   seats[]; kapade väggar på kamerasidan; interna väggar 1,5 m.
// ÄNDRINGSBART: fördelningen fyror/tvåor inom sextio, barens längd,
//   stationernas ordning längs varma linjen, rummets mått inom MIN.

import * as THREE from 'three';

// #region types

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type SeatKind = 'four' | 'two' | 'bar';
export type DayMode = 'mise' | 'tidig' | 'middag';
export type WallSide = 'N' | 'S' | 'E' | 'W';

export interface SeatSpec {
  id: string;
  kind: SeatKind;
  /** 0..59 bordsplatser, 60..65 barstolar. */
  seatIndex: number;
  furnitureId: string;
  seatNodeId: string;
  local: Vec2;
  seatHeight: number;
  seatSurfaceY: number;
  facing: number;
  approach: Vec2;
}

export interface TableSpec { id: string; kind: 'four' | 'two'; local: Vec2; size: number; seats: number; }

export interface StaffStation {
  id: string;
  /** Rollen i figureActs: 'host' | 'server' | 'bartender' | 'expeditor' | 'cook' | 'dish'. */
  role: string;
  local: Vec2;
  standHeight: number;
  facing: number;
  uniform: string;
  note: string;
}

export interface RoomParts {
  roof: THREE.Object3D;
  walls: THREE.Object3D;
  wallUpper: Record<WallSide, THREE.Object3D>;
  interior: THREE.Object3D;
  kitchen: THREE.Object3D;
  bar: THREE.Object3D;
  /** Morgonens mise en place: kantinerna på mittbänken och skärbrädorna. */
  miseMorning: THREE.Object3D;
  /** Tallrikarna på passet och mittbänken under service. */
  servicePlates: THREE.Object3D;
  /** Ljusen på borden, bara middag. */
  candles: THREE.Object3D;
  flames: THREE.Object3D[];
  heatLamps: THREE.MeshStandardMaterial;
  passAnchor: THREE.Object3D;
  dishAnchor: THREE.Object3D;
  glassAnchor: THREE.Object3D;
}

export interface RestaurantOptions { width?: number; depth?: number; interiorHeight?: number; mode?: DayMode; }

export interface RestaurantRoom {
  group: THREE.Group;
  parts: RoomParts;
  seats: SeatSpec[];
  tables: TableSpec[];
  staffStations: StaffStation[];
  entrance: Vec2;
  waitingSpot: Vec2;
  waitingSlots: Vec2[];
  declinedSlots: Vec2[];
  arrivalSlots: Vec2[];
  deliveryBay: Vec2;
  deliveryApproach: Vec2;
  floorY: number;
  capacity: number;
  width: number;
  depth: number;
  fits: boolean;
  shortfall: Vec2;
  mode: DayMode;
  dispose: () => void;
}

// #endregion

export const TOTAL_SEATS = 60;
export const BAR_SEATS = 6;
export const MIN_WIDTH_M = 22.0;
export const MIN_DEPTH_M = 14.8;
export const PLINTH_M = 0.11;
export const EYE_ABOVE_SEAT_M = 0.84;
export const EYE_STANDING_M = 1.66;
export const CUT_H = 0.9;

const WALL_T = 0.2;
const TABLE_TOP_Y = 0.74;
const CHAIR_H = 0.45;
const STOOL_H = 0.75;
const INNER_WALL_H = 1.5;
const KX1 = -4.8;                   // köksväggens matsalssida
const KZ1 = 3.0;                    // köket / disken
const PASS = { z0: -3.0, z1: 1.0, x0: -5.5, x1: -4.8, top: 1.05, lampY: 1.95 };
const DISH_HATCH = { z0: 3.4, z1: 4.6 };
const STAFF_DOOR = { z0: 1.4, z1: 2.4 };
const FOUR_X = [-1.8, 1.1, 4.0, 6.9];
const FOUR_Z = [-6.1, -3.0, 1.3];
const TWO_POS: Vec2[] = [[-2.8, 4.6], [-0.7, 4.6], [1.4, 4.6], [9.9, -6.0], [9.9, -3.6], [9.9, 2.9]];
const BAR = { x0: 4.2, x1: 10.2, z0: 5.1, z1: 5.8, back0: 6.8 };
const STOOL_X = [4.7, 5.7, 6.7, 7.7, 8.7, 9.7];
const STOOL_Z = 4.6;
const SPINE_Z = -0.85;
const NORTH_AISLE_Z = 3.25;
const PICKUP_X = -4.25;
const FOUR_SIZE = 1.0;
const TWO_SIZE = 0.78;
const CHAIR_OFF = 0.72;

export function eyeHeightForSeat(seat: SeatSpec): number {
  return PLINTH_M + seat.seatHeight + EYE_ABOVE_SEAT_M;
}

/**
 * Servisslingan i lokal XZ: passet → mittgången österut → norra gången
 * västerut → diskluckan → ned till passet. Gäller en servitör som bär
 * ut och tar med disk tillbaka. Punkterna ligger i servisstråkets zon.
 */
export const SERVICE_LOOP: Vec2[] = [
  [PICKUP_X, -1.0], [-3.25, SPINE_Z], [8.35, SPINE_Z], [8.35, NORTH_AISLE_Z],
  [-3.25, NORTH_AISLE_Z], [PICKUP_X, 4.0], [PICKUP_X, -1.0]
];

const _loopLen: number[] = [];
(function () {
  let acc = 0;
  _loopLen.push(0);
  for (let i = 1; i < SERVICE_LOOP.length; i++) {
    acc += Math.hypot(SERVICE_LOOP[i][0] - SERVICE_LOOP[i - 1][0], SERVICE_LOOP[i][1] - SERVICE_LOOP[i - 1][1]);
    _loopLen.push(acc);
  }
})();
export const SERVICE_LOOP_LENGTH = _loopLen[_loopLen.length - 1];

/** Punkt och kurs på slingan för u 0..1. `leg`: 'ut' (bär mat) eller 'in' (bär disk). */
export function serviceLoopPoint(u: number): { x: number; z: number; facing: number; leg: 'ut' | 'in' } {
  const d = (((u % 1) + 1) % 1) * SERVICE_LOOP_LENGTH;
  let i = 1;
  while (i < _loopLen.length - 1 && _loopLen[i] < d) i++;
  const a = SERVICE_LOOP[i - 1], b = SERVICE_LOOP[i];
  const seg = _loopLen[i] - _loopLen[i - 1];
  const k = seg > 0 ? (d - _loopLen[i - 1]) / seg : 0;
  return {
    x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k,
    facing: Math.atan2(b[0] - a[0], b[1] - a[1]),
    leg: i <= 3 ? 'ut' : 'in'
  };
}

// ---------- Palett ----------

export const BASE_FLOOR = '#b4a488';

export const ZONE_FLOORS: { id: string; colour: string; note: string }[] = [
  { id: 'dining', colour: BASE_FLOOR, note: 'Matsalen. Ljus ekparkett. L 0,380 — ljusaste golvet hittills.' },
  { id: 'service', colour: '#a8a39a', note: 'Servisstråket: slingan pass → mittgång → norra gången → disklucka. Grå kalksten. L 0,369.' },
  { id: 'lobby', colour: '#aa9f8e', note: 'Entrén och hovmästarpulten. L 0,353.' },
  { id: 'barRunway', colour: '#ac9b84', note: 'Bakom bardisken. L 0,339.' },
  { id: 'kitchen', colour: '#a3a39f', note: 'Köket. Klinker, kallt grått. L 0,365.' },
  { id: 'dish', colour: '#9fa3a1', note: 'Disken, kylrummet, leveransen. L 0,361.' }
];

/** Samma åtta gästtoner som i alla rum — figurerna byter inte garderob. */
export const GUEST_GARMENTS = [
  '#52505d', '#5b5045', '#465452', '#5c4d58',
  '#49544a', '#555144', '#554f61', '#5b4f4d'
];

/** Samma personalpalett som vinbaren, med nya roller på samma färger. */
export const STAFF_UNIFORMS = {
  host: '#445269',       // hovmästaren — vinbarens sommelierblå
  server: '#5e4f37',
  bartender: '#455d5f',
  kitchen: '#425741',    // kockar och diskare
  expeditor: '#664958'   // köksmästaren vid passet — vinbarens DJ-färg
};
export const PLAYER_UNIFORM = '#933945';
export const MENTOR_GARMENT = '#585b31';
export const TABLECLOTH = '#efece6';

export const DAY_MODES: Record<DayMode, { label: string; guests: number; bar: number; candles: boolean; note: string; ambientScale: number }> = {
  mise: { label: 'Mise en place, före servicen', guests: 0, bar: 0, candles: false, ambientScale: 1.0,
    note: 'Klockan fem. Köket fyller kantiner, två servitörer dukar. Matsalen tom, dukarna på.' },
  tidig: { label: 'Tidig kväll', guests: 34, bar: 2, candles: false, ambientScale: 1.0,
    note: 'Halv sju. Första sittningen, halvfullt, kvällssol och inga ljus än.' },
  middag: { label: 'Middag', guests: 60, bar: 6, candles: true, ambientScale: 0.8,
    note: 'Fullt. Ljus på borden, tallrikar under värmelamporna, hela slingan i rörelse.' }
};

function chan(c: number): number { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * chan(parseInt(h.slice(0, 2), 16)) + 0.7152 * chan(parseInt(h.slice(2, 4), 16)) + 0.0722 * chan(parseInt(h.slice(4, 6), 16));
}
function contrast(a: string, b: string): number {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function figureColours(): string[] {
  return GUEST_GARMENTS.concat(Object.keys(STAFF_UNIFORMS).map(function (k) { return (STAFF_UNIFORMS as any)[k]; }), [PLAYER_UNIFORM, MENTOR_GARMENT]);
}
export function checkPaletteAgainstFloors(minRatio?: number, maxRatio?: number) {
  const lo = minRatio ?? 1.8, hi = maxRatio ?? 3.6;
  const out: { figure: string; zone: string; ratio: number }[] = [];
  figureColours().forEach(function (f) {
    ZONE_FLOORS.forEach(function (z) { const r = contrast(f, z.colour); if (r < lo || r > hi) out.push({ figure: f, zone: z.id, ratio: r }); });
  });
  return out;
}
export function paletteContrastRange() {
  let lo = 99, hi = 0;
  const figs = figureColours();
  figs.forEach(function (f) { ZONE_FLOORS.forEach(function (z) { const r = contrast(f, z.colour); lo = Math.min(lo, r); hi = Math.max(hi, r); }); });
  return { min: lo, max: hi, pairs: figs.length * ZONE_FLOORS.length };
}

// ---------- FLAGS ----------

export const FLAGS = {
  building:
    'BESLUTAT 2026-09-26: restaurangen ligger på en egen adress, i en ' +
    'byggnad på minst 22,0 × 14,8 m. En verksamhet i taget; spelaren byter ' +
    'lokal vid uppgradering. Vilken byggnad i Grythyttan är scenens val. ' +
    'Montera inte med fits: false.',
  seatLock:
    'Förra restaurangen hade 16 låsta platser som matade reducerarens ' +
    'DEFAULT_POLICIES.capacity. Specen säger 60 plus bar. Rummet publicerar ' +
    'capacity = 66 (60 + 6). Kapaciteten per klass är sim-lagrets.',
  dayMode:
    "Tre lägen: 'mise', 'tidig', 'middag'. setDayMode() växlar mise en " +
    'place, tallrikar, ljus och värmelampor. Vilket läge som gäller kräver ' +
    'klockslaget från sim-lagret.',
  serviceLoop:
    'SERVICE_LOOP är servitörens väg. Att en servitör faktiskt bär en rätt ' +
    'från passet till ett bord kräver en order med bord — sim-lagrets. ' +
    'Slingan är vägen, inte händelsen.',
  kitchenStations:
    'Fem stationer: grill, spis, sås och garnityr, kallskänk, bakverk. Plus ' +
    'köksmästaren vid passet och diskaren. Vilken station en rätt går till ' +
    'kräver en rättmodell som inte finns.',
  lighting:
    'Rummet skapar inga ljuskällor. Värmelamporna och lågorna är självlysande ' +
    'material. DAY_MODES.ambientScale är ett förslag till DayLighting.',
  tablecloth:
    'Dukarna ingår inte i kontrastbandet. En kalott mot vit duk har kvot ~7. ' +
    'Det är avsiktligt: bordet lyser, figuren läses mot golvet.',
  camera:
    'PLAYER_CAMERA läses ur wineBarRoom.ts (övertagna värden). ' +
    'checkCameraView() tar kameran som argument.'
};

// ---------- Geometri ----------

const geometryCache = new Map<string, THREE.BufferGeometry>();
function box(w: number, h: number, d: number): THREE.BufferGeometry {
  const k = 'b' + w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3);
  let g = geometryCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geometryCache.set(k, g); }
  return g;
}
function cyl(r: number, h: number, seg: number, r2?: number): THREE.BufferGeometry {
  const k = 'c' + r + '_' + h + '_' + seg + '_' + (r2 ?? r);
  let g = geometryCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(r2 ?? r, r, h, seg); geometryCache.set(k, g); }
  return g;
}
export function disposeRestaurantGeometry(): void { geometryCache.forEach(function (g) { g.dispose(); }); geometryCache.clear(); }

const COLOUR = {
  slab: '#6d6a5f', wall: '#e3ddd1', wainscot: '#9ea596', cap: '#7f8778', roof: '#5c5951',
  window: '#c7d2d5', frame: '#f2efe9', chair: '#c2ab8a', tableLeg: '#6b5a45', cloth: TABLECLOTH,
  bar: '#6b5540', barTop: '#8a7156', brass: '#9a7f45', steel: '#b7bbbc', steelDark: '#7f8487',
  hood: '#8d9295', range: '#4b4f52', grill: '#2f3133', board: '#c9a878', plate: '#f4f2ee',
  crate: '#6d5a44', mat: '#5a4a3c', host: '#5a4636', candle: '#e9e0cc', flame: '#ffb24a',
  lamp: '#ffb46a', ticket: '#f0ece2'
};
const MISE_COLOURS = ['#6d8a4a', '#c9803a', '#8a3a44', '#e3dcc6', '#d6b24a', '#7a5a3a'];

// ---------- Konstruktion ----------

export function createRestaurantRoom(options?: RestaurantOptions): RestaurantRoom {
  const opts = options ?? {};
  const width = opts.width ?? 23.4;
  const depth = opts.depth ?? 15.6;
  const H = opts.interiorHeight ?? 3.4;
  const fits = width >= MIN_WIDTH_M && depth >= MIN_DEPTH_M;
  const shortfall: Vec2 = [Math.max(0, MIN_WIDTH_M - width), Math.max(0, MIN_DEPTH_M - depth)];
  const halfW = width / 2, halfD = depth / 2;
  const inX = halfW - WALL_T, inZ = halfD - WALL_T;
  const Y = PLINTH_M;

  const group = new THREE.Group();
  group.name = 'restaurantRoom';
  const materials: THREE.Material[] = [];
  function mat(c: string, r: number, m: number, em?: string, ei?: number): THREE.MeshStandardMaterial {
    const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (em) { x.emissive = new THREE.Color(em); x.emissiveIntensity = ei ?? 1; }
    materials.push(x);
    return x;
  }
  const M: { [k: string]: THREE.MeshStandardMaterial } = {};
  Object.keys(COLOUR).forEach(function (k) { M[k] = mat((COLOUR as any)[k], 0.85, 0); });
  M.steel.roughness = 0.35; M.steel.metalness = 0.6;
  M.steelDark.roughness = 0.4; M.steelDark.metalness = 0.5;
  M.window.emissive = new THREE.Color('#c7d2d5'); M.window.emissiveIntensity = 0.25;
  const flameMat = mat(COLOUR.flame, 0.5, 0, COLOUR.flame, 2.2);
  const heatLamps = mat('#3a3632', 0.5, 0.3, '#ff8a3c', 0);
  const miseMats = MISE_COLOURS.map(function (c) { return mat(c, 0.7, 0); });

  function put(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, name: string, ry?: number): THREE.Mesh {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    if (ry) o.rotation.y = ry;
    o.castShadow = true; o.receiveShadow = true; o.name = name;
    parent.add(o);
    return o;
  }
  function rb(parent: THREE.Object3D, m: THREE.Material, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, name: string): THREE.Mesh {
    return put(parent, box(x1 - x0, y1 - y0, z1 - z0), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, name);
  }
  function plate(parent: THREE.Object3D, m: THREE.Material, x0: number, x1: number, z0: number, z1: number, lift: number, name: string): void {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m);
    o.rotation.x = -Math.PI / 2;
    o.position.set((x0 + x1) / 2, Y + lift, (z0 + z1) / 2);
    o.receiveShadow = true; o.name = name;
    parent.add(o);
  }

  // ── Skal ─────────────────────────────────────────────────────
  put(group, box(width + 0.3, 0.1, depth + 0.3), M.slab, 0, 0.05, 0, 'slab');
  const walls = new THREE.Group(); walls.name = 'walls'; group.add(walls);
  const wallUpper = {} as Record<WallSide, THREE.Object3D>;
  function wallSide(side: WallSide, segs: { x0: number; x1: number; z0: number; z1: number; bottom?: number }[], windows: { a: number; b: number }[]) {
    const g = new THREE.Group(); g.name = 'wall' + side; walls.add(g);
    const up = new THREE.Group(); up.name = 'wall' + side + 'Upper'; g.add(up);
    wallUpper[side] = up;
    segs.forEach(function (s, i) {
      const b0 = s.bottom ?? 0;
      if (b0 < CUT_H) {
        rb(g, M.wainscot, s.x0, s.x1, s.z0, s.z1, 0.1 + b0, 0.1 + CUT_H, 'wall' + side + 'Lower' + i);
        rb(g, M.cap, s.x0, s.x1, s.z0, s.z1, 0.1 + CUT_H, 0.1 + CUT_H + 0.03, 'wall' + side + 'Cap' + i);
      }
      rb(up, M.wall, s.x0, s.x1, s.z0, s.z1, 0.1 + Math.max(CUT_H, b0), 0.1 + H, 'wall' + side + 'Upper' + i);
    });
    // Fönster på insidan av överdelen — försvinner med den.
    windows.forEach(function (w, i) {
      const alongX = side === 'N' || side === 'S';
      const inset = side === 'S' ? -inZ + 0.01 : side === 'N' ? inZ - 0.01 : side === 'E' ? inX - 0.01 : -inX + 0.01;
      const len = w.b - w.a, c = (w.a + w.b) / 2;
      const fw = alongX ? box(len + 0.12, 1.72, 0.03) : box(0.03, 1.72, len + 0.12);
      const gl = alongX ? box(len, 1.6, 0.035) : box(0.035, 1.6, len);
      const px = alongX ? c : inset, pz = alongX ? inset : c;
      put(up, fw, M.frame, px, 0.1 + 1.95, pz, 'window' + side + 'Frame' + i);
      put(up, gl, M.window, px, 0.1 + 1.95, pz, 'window' + side + 'Glass' + i);
    });
  }
  wallSide('W', [{ x0: -halfW, x1: -halfW + WALL_T, z0: -halfD, z1: 3.6 }, { x0: -halfW, x1: -halfW + WALL_T, z0: 4.8, z1: halfD },
                 { x0: -halfW, x1: -halfW + WALL_T, z0: 3.6, z1: 4.8, bottom: 2.2 }], []);
  wallSide('N', [{ x0: -halfW, x1: halfW, z0: halfD - WALL_T, z1: halfD }], [{ a: -2.9, b: -1.3 }, { a: 0.3, b: 1.9 }]);
  wallSide('S', [{ x0: -halfW, x1: halfW, z0: -halfD, z1: -halfD + WALL_T }],
           [{ a: -2.6, b: -1.0 }, { a: 0.3, b: 1.9 }, { a: 3.2, b: 4.8 }, { a: 6.1, b: 7.7 }, { a: 9.1, b: 10.7 }]);
  wallSide('E', [{ x0: halfW - WALL_T, x1: halfW, z0: -halfD, z1: -0.8 }, { x0: halfW - WALL_T, x1: halfW, z0: 0.8, z1: halfD },
                 { x0: halfW - WALL_T, x1: halfW, z0: -0.8, z1: 0.8, bottom: 2.4 }], [{ a: -6.6, b: -5.4 }, { a: 3.4, b: 4.6 }]);

  const roof = new THREE.Group(); roof.name = 'roof'; group.add(roof);
  put(roof, box(width + 0.4, 0.3, depth + 0.4), M.roof, 0, H + 0.25, 0, 'roofSlab');

  const interior = new THREE.Group(); interior.name = 'interior'; group.add(interior);
  const Z: { [k: string]: THREE.MeshStandardMaterial } = {};
  ZONE_FLOORS.forEach(function (z) { Z[z.id] = mat(z.colour, 0.9, 0); });
  plate(interior, Z.dining, -inX, inX, -inZ, inZ, 0, 'floorDining');
  plate(interior, Z.kitchen, -inX, KX1, -inZ, KZ1, 0.002, 'floorKitchen');
  plate(interior, Z.dish, -inX, KX1, KZ1, inZ, 0.002, 'floorDish');
  // Servisstråket: U-formen pass → mittgång → norra gången → disklucka.
  plate(interior, Z.service, KX1, -3.0, -3.2, 4.8, 0.003, 'floorServicePickup');
  plate(interior, Z.service, -3.0, 9.05, SPINE_Z - 0.95, SPINE_Z + 0.95, 0.003, 'floorServiceSpine');
  plate(interior, Z.service, -3.0, 9.05, NORTH_AISLE_Z - 0.8, NORTH_AISLE_Z + 0.8, 0.003, 'floorServiceNorth');
  plate(interior, Z.service, 7.45, 9.05, SPINE_Z + 0.95, NORTH_AISLE_Z - 0.8, 0.003, 'floorServiceTurn');
  plate(interior, Z.lobby, 8.9, inX, -2.3, 2.3, 0.004, 'floorLobby');
  plate(interior, Z.barRunway, BAR.x0, BAR.x1, BAR.z1, inZ, 0.004, 'floorBarRunway');
  plate(interior, M.mat, inX - 1.0, inX, -0.85, 0.85, 0.006, 'floorEntranceMat');

  // ── Köket ────────────────────────────────────────────────────
  const kitchen = new THREE.Group(); kitchen.name = 'kitchen'; interior.add(kitchen);
  const wy0 = Y, wy1 = Y + INNER_WALL_H;
  // Köksväggen mot matsalen: pass, personaldörr, disklucka.
  rb(kitchen, M.wall, KX1 - 0.15, KX1, -inZ, PASS.z0, wy0, wy1, 'kitchenWallE0');
  rb(kitchen, M.wall, KX1 - 0.15, KX1, PASS.z1, STAFF_DOOR.z0, wy0, wy1, 'kitchenWallE1');
  rb(kitchen, M.wall, KX1 - 0.15, KX1, STAFF_DOOR.z1, DISH_HATCH.z0, wy0, wy1, 'kitchenWallE2');
  rb(kitchen, M.wall, KX1 - 0.15, KX1, DISH_HATCH.z1, inZ, wy0, wy1, 'kitchenWallE3');
  rb(kitchen, M.wall, -inX, -7.6, KZ1 - 0.075, KZ1 + 0.075, wy0, wy1, 'kitchenWallDishA');
  rb(kitchen, M.wall, -6.6, KX1 - 0.15, KZ1 - 0.075, KZ1 + 0.075, wy0, wy1, 'kitchenWallDishB');
  // Kylrummet.
  rb(kitchen, M.wall, -8.7, -8.55, 5.2, inZ, wy0, wy1, 'coldRoomWallE');
  rb(kitchen, M.wall, -inX, -9.8, 5.125, 5.275, wy0, wy1, 'coldRoomWallS');
  rb(kitchen, M.crate, -inX + 0.05, -10.6, 5.5, 7.3, Y, Y + 1.6, 'coldRoomShelfW');
  rb(kitchen, M.crate, -10.3, -9.2, 6.8, 7.5, Y, Y + 1.2, 'coldRoomShelfN');

  // Passet: stålbänk, bongskena på kökssidan, värmelampor på en balk.
  rb(kitchen, M.steelDark, PASS.x0, PASS.x1, PASS.z0, PASS.z1, Y, Y + PASS.top - 0.04, 'passCounter');
  rb(kitchen, M.steel, PASS.x0 - 0.04, PASS.x1 + 0.04, PASS.z0, PASS.z1, Y + PASS.top - 0.04, Y + PASS.top, 'passTop');
  rb(kitchen, M.steelDark, -5.2, -5.1, PASS.z0 + 0.05, PASS.z0 + 0.15, Y + PASS.top, Y + PASS.lampY, 'passPostS');
  rb(kitchen, M.steelDark, -5.2, -5.1, PASS.z1 - 0.15, PASS.z1 - 0.05, Y + PASS.top, Y + PASS.lampY, 'passPostN');
  rb(kitchen, heatLamps, -5.25, -5.05, PASS.z0 + 0.05, PASS.z1 - 0.05, Y + PASS.lampY, Y + PASS.lampY + 0.08, 'passHeatLamps');
  rb(kitchen, M.ticket, PASS.x0 - 0.05, PASS.x0, PASS.z0 + 0.3, PASS.z1 - 0.3, Y + 1.32, Y + 1.4, 'passTicketRail');
  const passAnchor = new THREE.Object3D(); passAnchor.name = 'passAnchor';
  passAnchor.position.set(-5.15, Y + PASS.top + 0.02, -1.0); kitchen.add(passAnchor);

  // Varma linjen mot västra väggen: grill, spis, sås och garnityr. Kåpan
  // 0,8 m djup, överkant 2,4 — djupare skymde kockens kalott från väster.
  rb(kitchen, M.range, -inX + 0.02, -10.3, -6.4, 1.6, Y, Y + 0.9, 'hotLine');
  rb(kitchen, M.grill, -inX + 0.1, -10.4, -5.8, -4.2, Y + 0.9, Y + 0.93, 'hotLineGrill');
  [[-11.05, -2.9], [-10.65, -2.9], [-11.05, -2.1], [-10.65, -2.1]].forEach(function (p, i) {
    put(kitchen, cyl(0.16, 0.02, 12), M.grill, p[0], Y + 0.92, p[1], 'hotLineBurner' + i);
  });
  rb(kitchen, M.steel, -inX + 0.1, -10.4, -0.6, 1.2, Y + 0.9, Y + 0.93, 'hotLineBainMarie');
  rb(kitchen, M.hood, -inX, -10.5, -6.5, 1.7, Y + 2.0, Y + 2.4, 'hotLineHood');
  // Kallskänken mot södra väggen.
  rb(kitchen, M.steelDark, -9.0, -5.6, -inZ, -6.85, Y, Y + 0.86, 'coldStation');
  rb(kitchen, M.steel, -9.0, -5.6, -inZ, -6.85, Y + 0.86, Y + 0.9, 'coldStationTop');
  // Bakverket mot diskväggen.
  rb(kitchen, M.steelDark, -10.1, -7.8, 2.2, KZ1 - 0.08, Y, Y + 0.86, 'pastryStation');
  rb(kitchen, M.board, -10.1, -7.8, 2.2, KZ1 - 0.08, Y + 0.86, Y + 0.9, 'pastryStationTop');
  // Mittbänken: mise en place på morgonen, upplägg under service.
  rb(kitchen, M.steelDark, -8.6, -6.8, -4.8, 0.4, Y, Y + 0.86, 'centreBench');
  rb(kitchen, M.steel, -8.6, -6.8, -4.8, 0.4, Y + 0.86, Y + 0.9, 'centreBenchTop');

  // Stationernas insatser — kantiner som står kvar hela dagen.
  function gn(parent: THREE.Object3D, x: number, y: number, z: number, ci: number, name: string, w?: number, d?: number): void {
    put(parent, box(w ?? 0.3, 0.06, d ?? 0.24), miseMats[ci % miseMats.length], x, y + 0.03, z, name);
  }
  for (let i = 0; i < 6; i++) gn(kitchen, -10.85, Y + 0.93, -0.35 + i * 0.26, i, 'gnHot' + i, 0.3, 0.22);
  for (let i = 0; i < 8; i++) gn(kitchen, -8.7 + i * 0.4, Y + 0.9, -7.2, i + 2, 'gnCold' + i, 0.34, 0.26);

  const miseMorning = new THREE.Group(); miseMorning.name = 'miseMorning'; kitchen.add(miseMorning);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) gn(miseMorning, -8.25 + c * 0.55, Y + 0.9, -4.35 + r * 0.6, r * 3 + c, 'gnMise' + r + '_' + c, 0.44, 0.34);
  [[-9.4, -5.0], [-9.4, -2.4], [-9.4, 0.2], [-7.3, -6.55], [-8.9, 2.0]].forEach(function (p, i) {
    const vertical = i < 3;
    rb(miseMorning, M.board, p[0] - (vertical ? 0 : 0.3), p[0] + (vertical ? 0 : 0.3), p[1] - 0.2, p[1] + 0.2, Y + 0.9, Y + 0.93, 'miseBoard' + i);
  });
  // Bakverkets deg och plåtar på morgonen.
  for (let i = 0; i < 4; i++) rb(miseMorning, M.plate, -9.9 + i * 0.55, -9.5 + i * 0.55, 2.35, 2.75, Y + 0.9, Y + 0.93, 'misePastryTray' + i);

  const servicePlates = new THREE.Group(); servicePlates.name = 'servicePlates'; kitchen.add(servicePlates);
  for (let i = 0; i < 7; i++) put(servicePlates, cyl(0.13, 0.02, 16), M.plate, -5.15, Y + PASS.top + 0.01, PASS.z0 + 0.4 + i * 0.52, 'passPlate' + i);
  for (let i = 0; i < 5; i++) put(servicePlates, cyl(0.13, 0.02, 16), M.plate, -7.2, Y + 0.91, -3.9 + i * 0.7, 'benchPlate' + i);

  // ── Disken ───────────────────────────────────────────────────
  rb(kitchen, M.steelDark, KX1 - 0.7, KX1, DISH_HATCH.z0, DISH_HATCH.z1, Y, Y + 0.95, 'dishHatchCounter');
  rb(kitchen, M.steelDark, -8.0, -5.5, KZ1 + 0.1, KZ1 + 0.8, Y, Y + 0.9, 'dishSinkRun');
  rb(kitchen, M.steel, -7.3, -6.2, KZ1 + 0.1, KZ1 + 0.8, Y + 0.9, Y + 1.55, 'dishMachine');
  rb(kitchen, M.steelDark, -8.4, -5.3, inZ - 0.55, inZ, Y, Y + 1.7, 'dishRack');
  const dishAnchor = new THREE.Object3D(); dishAnchor.name = 'dishAnchor';
  dishAnchor.position.set(KX1 - 0.35, Y + 0.97, 4.0); kitchen.add(dishAnchor);

  // ── Baren ────────────────────────────────────────────────────
  const bar = new THREE.Group(); bar.name = 'bar'; interior.add(bar);
  rb(bar, M.bar, BAR.x0, BAR.x1, BAR.z0, BAR.z1, Y, Y + 1.06, 'barCounter');
  rb(bar, M.barTop, BAR.x0 - 0.04, BAR.x1 + 0.04, BAR.z0 - 0.06, BAR.z1 + 0.02, Y + 1.06, Y + 1.1, 'barTop');
  rb(bar, M.brass, BAR.x0, BAR.x1, BAR.z0 - 0.08, BAR.z0 - 0.03, Y + 0.18, Y + 0.23, 'barFootRail');
  rb(bar, M.bar, BAR.x0 + 0.3, BAR.x1 + 0.9, BAR.back0, inZ, Y, Y + 1.0, 'backBar');
  for (let i = 0; i < 24; i++) put(bar, cyl(0.035, 0.3, 8), mat(['#2f4a2c', '#4a1f26', '#6a4a22', '#d8d2c0'][i % 4], 0.3, 0.1), BAR.x0 + 0.5 + i * 0.26, Y + 1.15, 7.2, 'backBarBottle' + i);
  const glassAnchor = new THREE.Object3D(); glassAnchor.name = 'glassAnchor';
  glassAnchor.position.set(7.2, Y + 1.12, 5.45); bar.add(glassAnchor);

  // ── Entrén ───────────────────────────────────────────────────
  rb(interior, M.host, 10.2, 10.75, -1.85, -1.2, Y, Y + 1.1, 'hostStand');
  rb(interior, M.brass, inX - 0.1, inX - 0.04, 1.2, 2.2, Y + 1.7, Y + 1.74, 'coatRail');

  // ── Matsalen ─────────────────────────────────────────────────
  const furniture = new THREE.Group(); furniture.name = 'furniture'; interior.add(furniture);
  const candles = new THREE.Group(); candles.name = 'candles'; interior.add(candles);
  const flames: THREE.Object3D[] = [];
  const seats: SeatSpec[] = [];
  const tables: TableSpec[] = [];

  function clothTable(id: string, x: number, z: number, s: number): void {
    const t = new THREE.Group(); t.name = id; t.position.set(x, 0, z); furniture.add(t);
    put(t, box(s + 0.1, 0.03, s + 0.1), M.cloth, 0, Y + TABLE_TOP_Y, 0, id + 'Top');
    put(t, box(s + 0.1, 0.26, s + 0.1), M.cloth, 0, Y + TABLE_TOP_Y - 0.14, 0, id + 'Cloth');
    put(t, cyl(0.05, TABLE_TOP_Y - 0.28, 8), M.tableLeg, 0, Y + (TABLE_TOP_Y - 0.28) / 2, 0, id + 'Leg');
    const c = new THREE.Group(); c.name = 'candle_' + id; c.position.set(x, Y + TABLE_TOP_Y + 0.015, z); candles.add(c);
    put(c, cyl(0.03, 0.12, 10), M.candle, 0, 0.06, 0, 'candleBody_' + id);
    const f = put(c, cyl(0.001, 0.07, 8, 0.022), flameMat, 0, 0.155, 0, 'candleFlame_' + id);
    f.castShadow = false; flames.push(f);
  }
  function chair(id: string, x: number, z: number, facing: number): void {
    const c = new THREE.Group(); c.name = id; c.position.set(x, 0, z); c.rotation.y = facing; furniture.add(c);
    put(c, box(0.42, 0.05, 0.42), M.chair, 0, Y + CHAIR_H, 0, id + 'Seat');
    put(c, box(0.42, 0.42, 0.05), M.chair, 0, Y + CHAIR_H + 0.23, -0.2, id + 'Back');
    [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(function (p, i) {
      put(c, box(0.04, CHAIR_H, 0.04), M.chair, p[0], Y + CHAIR_H / 2, p[1], id + 'Leg' + i);
    });
  }
  function seat(kind: SeatKind, table: string, i: number, x: number, z: number, facing: number, h: number): void {
    const id = table + '_' + i;
    const nodeId = (kind === 'bar' ? 'stool_' : 'chair_') + id;
    if (kind !== 'bar') chair(nodeId, x, z, facing);
    const back = 0.55;
    seats.push({
      id: id, kind: kind, seatIndex: seats.length, furnitureId: table, seatNodeId: nodeId,
      local: [x, z], seatHeight: h, seatSurfaceY: Y + h, facing: facing,
      approach: [x - Math.sin(facing) * back, z - Math.cos(facing) * back]
    });
  }

  // Tolv fyror, rad för rad söderifrån, väster till öster.
  let fi = 0;
  FOUR_Z.forEach(function (z) {
    FOUR_X.forEach(function (x) {
      const id = 'four' + String(++fi).padStart(2, '0');
      clothTable(id, x, z, FOUR_SIZE);
      tables.push({ id: id, kind: 'four', local: [x, z], size: FOUR_SIZE, seats: 4 });
      seat('four', id, 1, x, z - CHAIR_OFF, 0, CHAIR_H);
      seat('four', id, 2, x + CHAIR_OFF, z, -Math.PI / 2, CHAIR_H);
      seat('four', id, 3, x, z + CHAIR_OFF, Math.PI, CHAIR_H);
      seat('four', id, 4, x - CHAIR_OFF, z, Math.PI / 2, CHAIR_H);
    });
  });
  TWO_POS.forEach(function (p, i) {
    const id = 'two' + String(i + 1).padStart(2, '0');
    clothTable(id, p[0], p[1], TWO_SIZE);
    tables.push({ id: id, kind: 'two', local: p, size: TWO_SIZE, seats: 2 });
    seat('two', id, 1, p[0] - 0.6, p[1], Math.PI / 2, CHAIR_H);
    seat('two', id, 2, p[0] + 0.6, p[1], -Math.PI / 2, CHAIR_H);
  });
  STOOL_X.forEach(function (x, i) {
    const id = 'stool_bar_' + (i + 1);
    put(bar, cyl(0.19, 0.05, 12), M.chair, x, Y + STOOL_H, STOOL_Z, id + 'Seat');
    put(bar, cyl(0.045, STOOL_H, 8), M.brass, x, Y + STOOL_H / 2, STOOL_Z, id + 'Stem');
    seat('bar', 'bar', i + 1, x, STOOL_Z, 0, STOOL_H);
  });

  // ── Personal ─────────────────────────────────────────────────
  const U = STAFF_UNIFORMS;
  const staffStations: StaffStation[] = [
    { id: 'host', role: 'host', local: [9.9, -1.5], standHeight: 0, facing: Math.PI / 2, uniform: U.host, note: 'Hovmästaren bakom pulten, vänd mot dörren.' },
    { id: 'serverPass', role: 'server', local: [PICKUP_X, -1.6], standHeight: 0, facing: -Math.PI / 2, uniform: U.server, note: 'Vid passet, matsalssidan. Slingans början.' },
    { id: 'serverSouth', role: 'server', local: [2.55, -4.55], standHeight: 0, facing: 0, uniform: U.server, note: 'Mellan de två södra raderna.' },
    { id: 'serverNorth', role: 'server', local: [2.55, NORTH_AISLE_Z], standHeight: 0, facing: Math.PI, uniform: U.server, note: 'Norra gången, på väg mot diskluckan.' },
    { id: 'serverEast', role: 'server', local: [8.35, SPINE_Z], standHeight: 0, facing: -Math.PI / 2, uniform: U.server, note: 'Mittgångens östra ände, når tvåorna och lobbyn.' },
    { id: 'bartender', role: 'bartender', local: [7.2, 6.3], standHeight: 0, facing: Math.PI, uniform: U.bartender, note: 'Bakom bardisken, stråk 1,0 m.' },
    { id: 'expeditor', role: 'expeditor', local: [-6.1, -1.0], standHeight: 0, facing: Math.PI / 2, uniform: U.expeditor, note: 'Köksmästaren vid passet, kökssidan. Ropar ut, lägger sista handen.' },
    { id: 'cookGrill', role: 'cook', local: [-9.75, -5.0], standHeight: 0, facing: -Math.PI / 2, uniform: U.kitchen, note: 'Grillen, varma linjen.' },
    { id: 'cookRange', role: 'cook', local: [-9.75, -2.4], standHeight: 0, facing: -Math.PI / 2, uniform: U.kitchen, note: 'Spisen, varma linjen.' },
    { id: 'cookSauce', role: 'cook', local: [-9.75, 0.2], standHeight: 0, facing: -Math.PI / 2, uniform: U.kitchen, note: 'Sås och garnityr vid bain-marien.' },
    { id: 'cookCold', role: 'cook', local: [-7.3, -6.3], standHeight: 0, facing: Math.PI, uniform: U.kitchen, note: 'Kallskänken mot södra väggen.' },
    { id: 'cookPastry', role: 'cook', local: [-8.9, 1.65], standHeight: 0, facing: 0, uniform: U.kitchen, note: 'Bakverket mot diskväggen.' },
    { id: 'dish', role: 'dish', local: [-6.8, 4.35], standHeight: 0, facing: Math.PI, uniform: U.kitchen, note: 'Disken, vid maskinen. Diskluckan två steg bort.' }
  ];

  const entrance: Vec2 = [inX - 0.5, 0];
  const waitingSpot: Vec2 = [halfW + 2.5, 0];
  const waitingSlots: Vec2[] = [];
  [2.5, 3.4, 4.3, 5.2].forEach(function (d) { [-0.6, 0.6].forEach(function (l) { waitingSlots.push([halfW + d, l]); }); });
  const declinedSlots: Vec2[] = [];
  [2.5, 3.4, 4.3, 5.2].forEach(function (d) { [-1.8, 1.8].forEach(function (l) { declinedSlots.push([halfW + d, l]); }); });
  const arrivalSlots: Vec2[] = [-1.2, -0.7, -0.25, 0.25, 0.7, 1.2].map(function (a) { return [halfW + 6 * Math.cos(a), 6 * Math.sin(a)] as Vec2; });
  const deliveryBay: Vec2 = [-halfW - 2, 4.2];
  const deliveryApproach: Vec2 = [-halfW - 8, 4.2];

  const parts: RoomParts = {
    roof: roof, walls: walls, wallUpper: wallUpper, interior: interior, kitchen: kitchen, bar: bar,
    miseMorning: miseMorning, servicePlates: servicePlates, candles: candles, flames: flames, heatLamps: heatLamps,
    passAnchor: passAnchor, dishAnchor: dishAnchor, glassAnchor: glassAnchor
  };
  const room: RestaurantRoom = {
    group: group, parts: parts, seats: seats, tables: tables, staffStations: staffStations,
    entrance: entrance, waitingSpot: waitingSpot, waitingSlots: waitingSlots, declinedSlots: declinedSlots,
    arrivalSlots: arrivalSlots, deliveryBay: deliveryBay, deliveryApproach: deliveryApproach,
    floorY: Y, capacity: TOTAL_SEATS + BAR_SEATS, width: width, depth: depth, fits: fits, shortfall: shortfall,
    mode: opts.mode ?? 'middag',
    dispose: function () { materials.forEach(function (m) { m.dispose(); }); group.removeFromParent(); }
  };
  setDayMode(room, room.mode);
  return room;
}

// ---------- Lägen ----------

export function setDayMode(room: RestaurantRoom, mode: DayMode): void {
  room.mode = mode;
  const p = room.parts;
  p.miseMorning.visible = mode === 'mise';
  p.servicePlates.visible = mode !== 'mise';
  p.candles.visible = DAY_MODES[mode].candles;
  p.heatLamps.emissiveIntensity = mode === 'mise' ? 0 : 1.6;
}

/** Ljuslågorna. `flicker` sekunder. Allokerar inget. */
export function updateRestaurantRoom(room: RestaurantRoom, flicker: number): void {
  const f = room.parts.flames;
  for (let i = 0; i < f.length; i++) f[i].scale.set(1, 1 + 0.12 * Math.sin(flicker * 9.1 + i * 1.7) + 0.06 * Math.sin(flicker * 23 + i), 1);
}

const _cam = new THREE.Vector3();
/** Kapar väggarna på kamerasidan. Anropas när kameran vridits. */
export function updateCutaway(room: RestaurantRoom, camera: THREE.Object3D): WallSide[] {
  camera.getWorldPosition(_cam);
  room.group.worldToLocal(_cam);
  const hx = room.width / 2 + 0.5, hz = room.depth / 2 + 0.5;
  const cut: Record<WallSide, boolean> = { E: _cam.x > hx, W: _cam.x < -hx, N: _cam.z > hz, S: _cam.z < -hz };
  const out: WallSide[] = [];
  (['N', 'S', 'E', 'W'] as WallSide[]).forEach(function (s) { room.parts.wallUpper[s].visible = !cut[s]; if (cut[s]) out.push(s); });
  return out;
}

// ---------- Vägar ----------

const GAPS_X = [-3.25, -0.35, 2.55, 5.45, 8.35];

/** Entrén → plats. Mittgången är gästernas väg också; de går ut ur den i
 *  närmaste mellanrum mellan borden. */
export function walkPathToSeat(room: RestaurantRoom, seatId: string): Vec2[] {
  const s = room.seats.find(function (x) { return x.id === seatId; });
  if (!s) return [];
  const p: Vec2[] = [[room.entrance[0], room.entrance[1]], [8.35, SPINE_Z]];
  const ax = s.approach[0], az = s.approach[1];
  let gx = GAPS_X[0];
  GAPS_X.forEach(function (g) { if (Math.abs(g - ax) < Math.abs(gx - ax)) gx = g; });
  if (s.kind === 'bar' || (s.kind === 'two' && s.local[0] > 8)) gx = 8.35;
  if (s.kind === 'two' && s.local[1] > 4) { p.push([2.55, SPINE_Z], [2.55, NORTH_AISLE_Z], [ax, NORTH_AISLE_Z]); }
  else if (s.kind === 'bar') { p.push([8.35, 3.9], [ax, 3.9]); }
  else { p.push([gx, SPINE_Z], [gx, az], [ax, az]); }
  p.push([ax, az], [s.local[0], s.local[1]]);
  return p;
}

export function exitPathFromSeat(room: RestaurantRoom, seatId: string): Vec2[] {
  const b = walkPathToSeat(room, seatId).slice().reverse();
  b.push([room.waitingSpot[0], room.waitingSpot[1]]);
  return b;
}

// ---------- Prov och mätning ----------

function isShown(o: THREE.Object3D | null): boolean { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

export function checkSeatContract(room: RestaurantRoom) {
  const n = room.seats.length;
  let order = true, tablesFirst = true, seenBar = false;
  room.seats.forEach(function (s, i) {
    if (s.seatIndex !== i) order = false;
    if (s.kind === 'bar') seenBar = true; else if (seenBar) tablesFirst = false;
  });
  const dining = room.seats.filter(function (s) { return s.kind !== 'bar'; }).length;
  return { ok: dining === TOTAL_SEATS && n === TOTAL_SEATS + BAR_SEATS && order && tablesFirst, dining: dining, bar: n - dining, order: order, tablesFirst: tablesFirst };
}

/**
 * Specens kontroll, som kod: från kameran, syns varje plats, varje station
 * och entrén? Kalotthöjd: sittande sitsen + 0,95, stående 1,55. Kör
 * updateCutaway först. `extra` = hinder utanför rummet.
 */
export function checkCameraView(room: RestaurantRoom, camera: THREE.Object3D, extra?: THREE.Object3D[]) {
  room.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3(), to = new THREE.Vector3(), dir = new THREE.Vector3();
  camera.getWorldPosition(from);
  const targets = [room.group as THREE.Object3D].concat(extra ?? []);
  function test(x: number, y: number, z: number): string | null {
    to.set(x, y, z); room.group.localToWorld(to);
    dir.copy(to).sub(from);
    const d = dir.length();
    ray.set(from, dir.normalize()); ray.far = d - 0.25;
    const hits = ray.intersectObjects(targets, true);
    for (let h = 0; h < hits.length; h++) {
      const o = hits[h].object;
      if (!isShown(o) || /^(floor|candle|gn|mise|passPlate|benchPlate)/.test(o.name)) continue;
      return o.name || 'namnlös';
    }
    return null;
  }
  const blocked: { id: string; by: string }[] = [];
  let seatsSeen = 0, stationsSeen = 0;
  room.seats.forEach(function (s) { const b = test(s.local[0], s.seatSurfaceY + 0.95, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else seatsSeen++; });
  room.staffStations.forEach(function (s) { const b = test(s.local[0], PLINTH_M + s.standHeight + 1.55, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else stationsSeen++; });
  const e = test(room.entrance[0], PLINTH_M + 1.55, room.entrance[1]);
  if (e) blocked.push({ id: 'entrance', by: e });
  // Slingan: åtta punkter längs servitörens väg.
  let loopSeen = 0;
  for (let k = 0; k < 8; k++) { const q = serviceLoopPoint(k / 8); const b = test(q.x, PLINTH_M + 1.55, q.z); if (b) blocked.push({ id: 'loop' + k, by: b }); else loopSeen++; }
  return { seatsSeen: seatsSeen, seats: room.seats.length, stationsSeen: stationsSeen, stations: room.staffStations.length,
           entranceSeen: !e, loopSeen: loopSeen, loop: 8, blocked: blocked };
}

export function measureRestaurantRoom(room: RestaurantRoom) {
  room.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  const bb = new THREE.Box3().setFromObject(room.parts.interior).applyMatrix4(inv);
  const kit = new THREE.Box3();
  room.parts.interior.traverse(function (o) { if (o.name === 'floorKitchen' || o.name === 'floorDish') kit.union(new THREE.Box3().setFromObject(o)); });
  kit.applyMatrix4(inv);
  let hood = 0;
  room.parts.kitchen.traverse(function (o) { if (o.name === 'hotLineHood') hood = new THREE.Box3().setFromObject(o).applyMatrix4(inv).max.y - PLINTH_M; });
  const split = { four: 0, two: 0, bar: 0 };
  room.seats.forEach(function (s) { (split as any)[s.kind]++; });
  const diningArea = (room.width / 2 - WALL_T - KX1) * (room.depth - 2 * WALL_T);
  return {
    footprint: [bb.max.x - bb.min.x, bb.max.z - bb.min.z] as Vec2,
    kitchenArea: (kit.max.x - kit.min.x) * (kit.max.z - kit.min.z),
    diningArea: diningArea,
    m2PerSeat: diningArea / TOTAL_SEATS,
    split: split, tables: room.tables.length,
    stations: room.staffStations.length,
    loopLength: SERVICE_LOOP_LENGTH,
    passToHatch: (DISH_HATCH.z0 + DISH_HATCH.z1) / 2 - (PASS.z0 + PASS.z1) / 2,
    hoodTop: hood,
    miseContainers: room.parts.miseMorning.children.filter(function (o) { return o.name.indexOf('gnMise') === 0; }).length
  };
}

/** Planritningens underlag ur samma meshar som renderas. */
export function planRects(room: RestaurantRoom) {
  room.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  const out: { name: string; x0: number; x1: number; z0: number; z1: number; top: number }[] = [];
  const b = new THREE.Box3();
  room.parts.interior.traverse(function (o: any) {
    if (!o.isMesh || !isShown(o)) return;
    if (/^(candle|window|backBarBottle|hotLineBurner|gn|mise|passPlate|benchPlate)/.test(o.name)) return;
    if (/(Leg\d?|Back|Stem|Cap\d|Cloth|Rail|Post[SN]|HeatLamps|TicketRail)$/.test(o.name)) return;
    if (/Top$/.test(o.name) && !/^(four|two)\d+Top$/.test(o.name)) return;
    b.setFromObject(o).applyMatrix4(inv);
    out.push({ name: o.name, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, top: b.max.y });
  });
  return out;
}

export function resolveWorldPositions(room: RestaurantRoom) {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function w(p: Vec2): Vec2 { v.set(p[0], 0, p[1]); room.group.localToWorld(v); return [v.x, v.z]; }
  return {
    seats: room.seats.map(function (s) { return w(s.local); }),
    staffStations: room.staffStations.map(function (s) { return w(s.local); }),
    serviceLoop: SERVICE_LOOP.map(w),
    entrance: w(room.entrance), waitingSpot: w(room.waitingSpot),
    waitingSlots: room.waitingSlots.map(w), declinedSlots: room.declinedSlots.map(w), arrivalSlots: room.arrivalSlots.map(w),
    deliveryBay: w(room.deliveryBay), deliveryApproach: w(room.deliveryApproach)
  };
}
