// brewpubRoom — ölkrogen med bryggeriet, Nexus v1 (DESIGN_SPEC_NEXUS_V1 §2.4, paket 4).
//
// SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten).
// Formmall: wineBarRoom.ts och restaurantRoom.ts (paket 1 och 3). Samma
// kontrakt, samma kapade väggar, samma kameraprov. Ersätter brewpubRoom.ts
// ur leveransen 2026-08-30 — se LEVERANS.md.
//
// Kontrakt (oförändrat):
//   • Ren three.js, primitiver. Byggs imperativt EN gång.
//   • Kvällens två lägen och bryggdagen byggs från början, växlas med visible.
//   • Ingen egen klocka. Omröraren, ångan och lågorna drivs av faser
//     anroparen skickar in. Ingen simuleringslogik.
//
// ── Vad specen ändrade ────────────────────────────────────────────
//
// 1. BRYGGERIET ÄR ETT EGET RUM. Förra versionen hade kärlen i samma rum
//    som gästerna, markerade med en sockelkant, för att "ett glasparti är
//    ingenting från strategisk höjd". Det stämmer fortfarande — men specen
//    vill nu ha ett eget rum med egen personal. Lösningen tar båda på
//    allvar: bryggeriet har en BRÖSTNING i tegel (1,0 m) med ett glasparti
//    ovanpå till 2,1 m och en mässingslist i överkant. Kameran läser rummet
//    på tegelkanten, listen och golvbytet till våt betong; glaset finns för
//    gästerna i ögonhöjd, inte för kameran, och ingår inte i kameraprovet.
//    Egen dörr ut (malt in, drav ut) i västra väggen, egen dörr in bakom
//    baren. Egen personal: två bryggare i egen färg.
//
// 2. KOPPAREN STÅR MOT GÄSTERNA. Mäskkaret och kokkärlet står direkt bakom
//    glaset, bakom bardisken. Från en sittplats går blicken gäst → disk →
//    bartender → glas → koppar. Uppifrån är kärlen två kopparcirklar och
//    fyra stålcirklar i ett rutnät — det mest otvetydiga "här bryggs det"
//    som finns ovanifrån. Bryggaren vid kopparen står vänd MOT gästerna.
//
// 3. LÅNGBORD OCH BÄNKAR, INGET ANNAT. Specen säger tjugo platser vid
//    långbord och bänkar. Förra versionens åtta barstolar och två tvåor
//    utgår. Två långbord à tio. Bardisken är en serveringsdisk med stående
//    gäster framför på helgen — det är där ölhallens trängsel sitter.
//    Tolv ståplatser (fyra tunnor à två, fyra vid disken) finns som
//    geometri och räknas inte i kapaciteten.
//
// 4. BRYGGDAGEN SYNS SOM ÅNGA. Ånga över kokkärlet är ett vitt moln över
//    en kopparcirkel — synligt från 23 m. setBrewDay(room, true) tänder
//    ångan och omröraren; på en vanlig dag står kärlen stilla.
//
// ── Koordinater (identiskt med de andra rummen) ───────────────────
//   lokal +X = långa axeln, entrén i +X, leveransen i −X
//   origo = centroid, golvplanet y = 0,11
//
// ── Planen, i ett stycke ──────────────────────────────────────────
// 15,6 × 11,8 m — samma mått som vinbarens byggnad. Bryggeriet tar
// västra tredjedelens södra två tredjedelar (5,0 × 7,7 m), köket den
// norra tredjedelen. Bardisken står mot bryggeriets glasvägg. Två
// långbord längs långaxeln i matsalen, mittgången mellan dem leder från
// entrén rakt mot baren och kopparen.
//
// ── Fast kontra ändringsbart ──────────────────────────────────────
// FAST: bryggeriet som eget rum med bröstning; kopparen mot gästerna;
//   två långbord med bänkar; mittgången entré → bar; kapade väggar.
// ÄNDRINGSBART: antal jästankar (4) och serveringstankar (2), tunnornas
//   läge, kökets två stationer, rummets mått inom MIN.

import * as THREE from 'three';

// #region types

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type MoodId = 'vardag' | 'helg';
export type WallSide = 'N' | 'S' | 'E' | 'W';

export interface SeatSpec {
  id: string;
  kind: 'bench';
  seatIndex: number;
  furnitureId: string;
  seatNodeId: string;
  local: Vec2;
  seatHeight: number;
  seatSurfaceY: number;
  facing: number;
  approach: Vec2;
}
export interface StandSpec { id: string; kind: 'barrel' | 'barRail'; local: Vec2; facing: number; approach: Vec2; }
export interface StaffStation { id: string; role: string; local: Vec2; standHeight: number; facing: number; uniform: string; note: string; }

export interface RoomParts {
  roof: THREE.Object3D;
  walls: THREE.Object3D;
  wallUpper: Record<WallSide, THREE.Object3D>;
  interior: THREE.Object3D;
  brewery: THREE.Object3D;
  kitchen: THREE.Object3D;
  bar: THREE.Object3D;
  mashRake: THREE.Object3D;
  steam: THREE.Object3D;
  steamPuffs: THREE.Mesh[];
  /** Kärlens toppar — siktlinjens måltavlor. */
  vesselTops: THREE.Object3D[];
  candles: THREE.Object3D;
  flames: THREE.Object3D[];
  tapAnchor: THREE.Object3D;
  passAnchor: THREE.Object3D;
}

export interface BrewpubOptions { width?: number; depth?: number; interiorHeight?: number; mood?: MoodId; brewDay?: boolean; }

export interface BrewpubRoom {
  group: THREE.Group;
  parts: RoomParts;
  seats: SeatSpec[];
  standing: StandSpec[];
  staffStations: StaffStation[];
  entrance: Vec2;
  waitingSpot: Vec2;
  deliveryBay: Vec2;
  floorY: number;
  capacity: number;
  width: number;
  depth: number;
  fits: boolean;
  shortfall: Vec2;
  mood: MoodId;
  brewDay: boolean;
  dispose: () => void;
}

// #endregion

export const TOTAL_SEATS = 20;
export const STANDING_SPOTS = 12;
export const MIN_WIDTH_M = 14.6;
export const MIN_DEPTH_M = 11.0;
export const PLINTH_M = 0.11;
export const EYE_ABOVE_SEAT_M = 0.84;
export const EYE_STANDING_M = 1.66;
export const CUT_H = 0.9;

const WALL_T = 0.2;
const BREW = { x1: -2.6, z1: 2.0, sill: 1.0, top: 2.1 };
const BAR = { x0: -1.6, x1: -0.95, z0: -4.8, z1: 0.8 };
const SPINE_Z = -1.2;
const LONG_TABLES = [
  { id: 'longA', x: 2.6, z: -3.4 },
  { id: 'longB', x: 2.6, z: 1.0 }
];
const LT = { len: 3.6, w: 0.9, top: 0.74, benchOff: 0.72, benchD: 0.34, pitch: 0.75 };
const BENCH_H = 0.45;

export function eyeHeightForSeat(seat: SeatSpec): number { return seat.seatSurfaceY + EYE_ABOVE_SEAT_M; }

// ---------- Palett ----------

export const BASE_FLOOR = '#a38a68';
export const ZONE_FLOORS: { id: string; colour: string; note: string }[] = [
  { id: 'hall', colour: BASE_FLOOR, note: 'Ölhallen. Varma, breda plankor. L 0,270.' },
  { id: 'barRunway', colour: '#9a8466', note: 'Bakom disken. L 0,243.' },
  { id: 'barFront', colour: '#9d8a6c', note: 'Ståytan framför disken — där trängseln står. L 0,264.' },
  { id: 'brewery', colour: '#999a95', note: 'Bryggeriet. Våt betong, kall och ljusare — rummet läses på golvbytet. L 0,321.' },
  { id: 'kitchen', colour: '#a09786', note: 'Köket. L 0,313.' }
];
export const GUEST_GARMENTS = ['#52505d', '#5b5045', '#465452', '#5c4d58', '#49544a', '#555144', '#554f61', '#5b4f4d'];
/** Samma fem personalfärger som i alla rum. Bryggarna får den blå. */
export const STAFF_UNIFORMS = {
  brewer: '#445269',
  bartender: '#455d5f',
  runner: '#5e4f37',
  kitchen: '#425741'
};
export const PLAYER_UNIFORM = '#933945';
export const MENTOR_GARMENT = '#585b31';

export const MOODS: Record<MoodId, { label: string; guests: number; standing: number; candles: boolean; note: string }> = {
  vardag: { label: 'Tisdag 18.30', guests: 8, standing: 0, candles: false, note: 'Bryggdag. Åtta gäster, ångan över kopparen, båda bryggarna i arbete.' },
  helg: { label: 'Fredag kväll', guests: 20, standing: 12, candles: true, note: 'Fullt och högljutt. Alla bänkar, tunnorna och disken fulla, skålar i hela rummet.' }
};

function chan(c: number): number { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * chan(parseInt(h.slice(0, 2), 16)) + 0.7152 * chan(parseInt(h.slice(2, 4), 16)) + 0.0722 * chan(parseInt(h.slice(4, 6), 16));
}
function contrast(a: string, b: string): number { const l1 = luminance(a), l2 = luminance(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
function figs(): string[] { return GUEST_GARMENTS.concat(Object.keys(STAFF_UNIFORMS).map(function (k) { return (STAFF_UNIFORMS as any)[k]; }), [PLAYER_UNIFORM, MENTOR_GARMENT]); }
export function checkPaletteAgainstFloors(minRatio?: number, maxRatio?: number) {
  const lo = minRatio ?? 1.8, hi = maxRatio ?? 3.6;
  const out: { figure: string; zone: string; ratio: number }[] = [];
  figs().forEach(function (f) { ZONE_FLOORS.forEach(function (z) { const r = contrast(f, z.colour); if (r < lo || r > hi) out.push({ figure: f, zone: z.id, ratio: r }); }); });
  return out;
}
export function paletteContrastRange() {
  let lo = 99, hi = 0;
  figs().forEach(function (f) { ZONE_FLOORS.forEach(function (z) { const r = contrast(f, z.colour); lo = Math.min(lo, r); hi = Math.max(hi, r); }); });
  return { min: lo, max: hi, pairs: figs().length * ZONE_FLOORS.length };
}

export const FLAGS = {
  building:
    'Rummet är 15,6 × 11,8 m, samma mått som vinbarens byggnad w869907975. ' +
    'Om ölkrogen ERSÄTTER en tidigare klass på samma adress behövs ingen ny ' +
    'byggnad. Om klasserna ligger på olika platser i Grythyttan behövs en — ' +
    'se FRAGOR §32 för restaurangen, samma fråga här.',
  seatMix:
    'Specen: 20 platser vid långbord och bänkar. Förra versionens 8 barstolar ' +
    'och 2 tvåor utgår. seatIndex 0..19 är långbord A söder, A norr, B söder, ' +
    'B norr, väster till öster.',
  brewery:
    'Bryggeriet är ett eget rum med egen personal (två bryggare). Produktionen ' +
    '— vad som bryggs, när, hur mycket — kräver en bryggmodell som inte finns. ' +
    'setBrewDay() är presentationens av/på.',
  brewDay:
    'Bryggdag tänder ångan och omröraren. Vilken dag det är kräver ett ' +
    'produktionsschema i sim-lagret.',
  standing:
    'Tolv ståplatser (fyra tunnor à två, fyra vid disken). Geometri utan ' +
    'tillstånd, räknas inte i kapaciteten (FRAGOR §7).',
  glass:
    'Bryggeriets glasparti ingår inte i kameraprovet och skymmer inte ' +
    'siktlinjerna. Det är gästernas, i ögonhöjd. Kameran läser rummet på ' +
    'bröstningen och golvbytet.',
  lighting:
    'Rummet skapar inga ljuskällor. Ljusen på borden och tunnorna är ' +
    'självlysande material. Inga pendlar över långborden: kameraprovet visade ' +
    'att en lampa över bordets mitt alltid skymmer någon kalott.'
};

// ---------- Geometri ----------

const cache = new Map<string, THREE.BufferGeometry>();
function box(w: number, h: number, d: number) {
  const k = 'b' + w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3);
  let g = cache.get(k); if (!g) { g = new THREE.BoxGeometry(w, h, d); cache.set(k, g); } return g;
}
function cyl(r: number, h: number, seg: number, r2?: number) {
  const k = 'c' + r + '_' + h + '_' + seg + '_' + (r2 ?? r);
  let g = cache.get(k); if (!g) { g = new THREE.CylinderGeometry(r2 ?? r, r, h, seg); cache.set(k, g); } return g;
}
function dome(r: number) {
  const k = 'd' + r;
  let g = cache.get(k); if (!g) { g = new THREE.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2); cache.set(k, g); } return g;
}
export function disposeBrewpubGeometry(): void { cache.forEach(function (g) { g.dispose(); }); cache.clear(); }

const COLOUR = {
  slab: '#6d6a5f', brick: '#8a5a48', panel: '#6a4f38', cap: '#9a7f45', roof: '#5c5951',
  wood: '#7d5f40', woodTop: '#8e6d49', bench: '#6f5238', brass: '#b08d4a', copper: '#b87333',
  steel: '#b7bbbc', steelDark: '#7f8487', sill: '#7a4c3c', frame: '#3a3430', glass: '#c9d6d8',
  kitchen: '#767268', hood: '#8d9295', range: '#4b4f52', sack: '#b9a27a', barrel: '#6d4f33',
  hoop: '#3f3b36', candle: '#e9e0cc', flame: '#ffb24a', shade: '#3a2f24', bulb: '#ffc27a', steam: '#f4f2ee', mat: '#5a4a3c'
};

// ---------- Konstruktion ----------

export function createBrewpubRoom(options?: BrewpubOptions): BrewpubRoom {
  const opts = options ?? {};
  const width = opts.width ?? 15.6, depth = opts.depth ?? 11.8, H = opts.interiorHeight ?? 3.4;
  const fits = width >= MIN_WIDTH_M && depth >= MIN_DEPTH_M;
  const shortfall: Vec2 = [Math.max(0, MIN_WIDTH_M - width), Math.max(0, MIN_DEPTH_M - depth)];
  const halfW = width / 2, halfD = depth / 2, inX = halfW - WALL_T, inZ = halfD - WALL_T;
  const Y = PLINTH_M;

  const group = new THREE.Group(); group.name = 'brewpubRoom';
  const materials: THREE.Material[] = [];
  function mat(c: string, r: number, m: number, em?: string, ei?: number, extra?: any) {
    const x = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra ?? {}));
    if (em) { x.emissive = new THREE.Color(em); x.emissiveIntensity = ei ?? 1; }
    materials.push(x); return x;
  }
  const M: { [k: string]: THREE.MeshStandardMaterial } = {};
  Object.keys(COLOUR).forEach(function (k) { M[k] = mat((COLOUR as any)[k], 0.85, 0); });
  M.copper.roughness = 0.32; M.copper.metalness = 0.75;
  M.brass.roughness = 0.38; M.brass.metalness = 0.65;
  M.steel.roughness = 0.3; M.steel.metalness = 0.65;
  M.glass.transparent = true; M.glass.opacity = 0.22; M.glass.depthWrite = false;
  M.steam.transparent = true; M.steam.opacity = 0.5; M.steam.depthWrite = false; M.steam.roughness = 1;
  M.flame.emissive = new THREE.Color(COLOUR.flame); M.flame.emissiveIntensity = 2.2;
  M.bulb.emissive = new THREE.Color(COLOUR.bulb); M.bulb.emissiveIntensity = 1.6;

  function put(p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, name: string, ry?: number) {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); if (ry) o.rotation.y = ry;
    o.castShadow = true; o.receiveShadow = true; o.name = name; p.add(o); return o;
  }
  function rb(p: THREE.Object3D, m: THREE.Material, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, name: string) {
    return put(p, box(x1 - x0, y1 - y0, z1 - z0), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, name);
  }
  function plate(p: THREE.Object3D, m: THREE.Material, x0: number, x1: number, z0: number, z1: number, lift: number, name: string) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m);
    o.rotation.x = -Math.PI / 2; o.position.set((x0 + x1) / 2, Y + lift, (z0 + z1) / 2); o.receiveShadow = true; o.name = name; p.add(o);
  }

  // ── Skal: tegel ovan, mörk panel nedan, mässingslist i kapkanten ──
  put(group, box(width + 0.3, 0.1, depth + 0.3), M.slab, 0, 0.05, 0, 'slab');
  const walls = new THREE.Group(); walls.name = 'walls'; group.add(walls);
  const wallUpper = {} as Record<WallSide, THREE.Object3D>;
  function wallSide(side: WallSide, segs: { x0: number; x1: number; z0: number; z1: number; bottom?: number }[]) {
    const g = new THREE.Group(); g.name = 'wall' + side; walls.add(g);
    const up = new THREE.Group(); up.name = 'wall' + side + 'Upper'; g.add(up); wallUpper[side] = up;
    segs.forEach(function (s, i) {
      const b0 = s.bottom ?? 0;
      if (b0 < CUT_H) {
        rb(g, M.panel, s.x0, s.x1, s.z0, s.z1, 0.1 + b0, 0.1 + CUT_H, 'wall' + side + 'Lower' + i);
        rb(g, M.cap, s.x0, s.x1, s.z0, s.z1, 0.1 + CUT_H, 0.1 + CUT_H + 0.03, 'wall' + side + 'Cap' + i);
      }
      rb(up, M.brick, s.x0, s.x1, s.z0, s.z1, 0.1 + Math.max(CUT_H, b0), 0.1 + H, 'wall' + side + 'Upper' + i);
    });
  }
  wallSide('W', [{ x0: -halfW, x1: -halfW + WALL_T, z0: -halfD, z1: 0.3 }, { x0: -halfW, x1: -halfW + WALL_T, z0: 1.5, z1: halfD },
                 { x0: -halfW, x1: -halfW + WALL_T, z0: 0.3, z1: 1.5, bottom: 2.3 }]);
  wallSide('N', [{ x0: -halfW, x1: halfW, z0: halfD - WALL_T, z1: halfD }]);
  wallSide('S', [{ x0: -halfW, x1: halfW, z0: -halfD, z1: -halfD + WALL_T }]);
  wallSide('E', [{ x0: halfW - WALL_T, x1: halfW, z0: -halfD, z1: SPINE_Z - 0.8 }, { x0: halfW - WALL_T, x1: halfW, z0: SPINE_Z + 0.8, z1: halfD },
                 { x0: halfW - WALL_T, x1: halfW, z0: SPINE_Z - 0.8, z1: SPINE_Z + 0.8, bottom: 2.3 }]);
  const roof = new THREE.Group(); roof.name = 'roof'; group.add(roof);
  put(roof, box(width + 0.4, 0.3, depth + 0.4), M.roof, 0, H + 0.25, 0, 'roofSlab');

  const interior = new THREE.Group(); interior.name = 'interior'; group.add(interior);
  const Z: { [k: string]: THREE.MeshStandardMaterial } = {};
  ZONE_FLOORS.forEach(function (z) { Z[z.id] = mat(z.colour, 0.9, 0); });
  plate(interior, Z.hall, -inX, inX, -inZ, inZ, 0, 'floorHall');
  plate(interior, Z.brewery, -inX, BREW.x1, -inZ, BREW.z1, 0.002, 'floorBrewery');
  plate(interior, Z.kitchen, -inX, BREW.x1, BREW.z1, inZ, 0.002, 'floorKitchen');
  plate(interior, Z.barRunway, BREW.x1, BAR.x0, -inZ, BAR.z1 + 0.6, 0.003, 'floorBarRunway');
  plate(interior, Z.barFront, BAR.x1, 0.3, BAR.z0 - 0.4, BAR.z1 + 0.4, 0.003, 'floorBarFront');
  plate(interior, M.mat, inX - 1.0, inX, SPINE_Z - 0.8, SPINE_Z + 0.8, 0.005, 'floorEntranceMat');

  // ── Bryggeriet: bröstning, glas, list; egen dörr ut och in ──────
  const brewery = new THREE.Group(); brewery.name = 'brewery'; interior.add(brewery);
  function breweryWall(x0: number, x1: number, z0: number, z1: number, name: string) {
    rb(brewery, M.sill, x0, x1, z0, z1, Y, Y + BREW.sill, name + 'Sill');
    rb(brewery, M.glass, x0 + 0.03, x1 - 0.03, z0 + 0.03, z1 - 0.03, Y + BREW.sill, Y + BREW.top, 'glass' + name);
    rb(brewery, M.brass, x0, x1, z0, z1, Y + BREW.top, Y + BREW.top + 0.05, name + 'Rail');
  }
  // Östra väggen mot baren: dörr bakom disken, Z 1,2–2,0.
  breweryWall(BREW.x1 - 0.14, BREW.x1, -inZ, 1.2, 'breweryWallE');
  // Norra väggen mot köket, dörr X −4,6…−3,8.
  breweryWall(-inX, -4.6, BREW.z1 - 0.07, BREW.z1 + 0.07, 'breweryWallNa');
  breweryWall(-3.8, BREW.x1, BREW.z1 - 0.07, BREW.z1 + 0.07, 'breweryWallNb');
  // Mullioner i glaset — det kameran ser av glaspartiet.
  for (let z = -4.7; z < 1.2; z += 1.2) rb(brewery, M.frame, BREW.x1 - 0.1, BREW.x1 - 0.04, z - 0.03, z + 0.03, Y + BREW.sill, Y + BREW.top, 'breweryMullion' + Math.round(z * 10));

  const vesselTops: THREE.Object3D[] = [];
  function vessel(id: string, x: number, z: number, r: number, h: number, m: THREE.Material, legs: boolean) {
    const g = new THREE.Group(); g.name = id; g.position.set(x, 0, z); brewery.add(g);
    const base = legs ? 0.35 : 0;
    if (legs) [0, 1, 2].forEach(function (i) { const a = i * Math.PI * 2 / 3; put(g, cyl(0.04, base, 6), M.steelDark, Math.cos(a) * r * 0.75, Y + base / 2, Math.sin(a) * r * 0.75, id + 'Leg' + i); });
    put(g, cyl(r, h, 22), m, 0, Y + base + h / 2, 0, id + 'Body');
    put(g, dome(r), m, 0, Y + base + h, 0, id + 'Dome');
    const t = new THREE.Object3D(); t.name = id + 'Top'; t.position.set(0, Y + base + h + r * 0.5, 0); g.add(t); vesselTops.push(t);
    return g;
  }
  // Bryggverket i koppar, direkt bakom glaset. Mäskkaret och kokkärlet.
  vessel('mashTun', -3.55, -3.8, 0.66, 1.1, M.copper, false);
  vessel('kettle', -3.55, -1.5, 0.66, 1.1, M.copper, false);
  rb(brewery, M.steelDark, -4.3, -2.85, -3.1, -2.2, Y, Y + 0.18, 'brewDeck');
  put(brewery, cyl(0.06, 0.9, 8), M.copper, -3.55, Y + 1.95, -2.65, 'brewPipe', 0).rotation.x = Math.PI / 2;
  const mashRake = new THREE.Group(); mashRake.name = 'mashRake'; mashRake.position.set(-3.55, Y + 1.66 + 0.33, -3.8); brewery.add(mashRake);
  put(mashRake, box(1.1, 0.04, 0.06), M.steelDark, 0, 0, 0, 'mashRakeArm');
  // Jästankar i stål, 2 × 2 i SV-hörnet, koniska på ben.
  vessel('ferm1', -7.0, -5.0, 0.5, 1.6, M.steel, true);
  vessel('ferm2', -5.9, -5.0, 0.5, 1.6, M.steel, true);
  vessel('ferm3', -7.0, -3.9, 0.5, 1.6, M.steel, true);
  vessel('ferm4', -5.9, -3.9, 0.5, 1.6, M.steel, true);
  // Serveringstankarna, närmast baren, lägre.
  vessel('bright1', -7.0, 0.9, 0.44, 1.3, M.steel, true);
  vessel('bright2', -5.95, 0.9, 0.44, 1.3, M.steel, true);
  for (let i = 0; i < 4; i++) rb(brewery, M.sack, -7.45, -6.9, -1.4 + i * 0.5, -1.0 + i * 0.5, Y, Y + 0.28 + (i % 2) * 0.22, 'maltSack' + i);
  // Ångan över kokkärlet.
  const steam = new THREE.Group(); steam.name = 'steam'; brewery.add(steam);
  const steamPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), M.steam);
    p.name = 'steamPuff' + i; p.castShadow = false; p.position.set(-3.55, Y + 2.2 + i * 0.25, -1.5); steam.add(p); steamPuffs.push(p);
  }

  // ── Köket: litet, två stationer och en passlucka mot hallen ──────
  const kitchen = new THREE.Group(); kitchen.name = 'kitchen'; interior.add(kitchen);
  rb(kitchen, M.brick, BREW.x1 - 0.14, BREW.x1, BREW.z1, 3.2, Y, Y + 1.5, 'kitchenWallEa');
  rb(kitchen, M.brick, BREW.x1 - 0.14, BREW.x1, 4.4, inZ, Y, Y + 1.5, 'kitchenWallEb');
  rb(kitchen, M.wood, BREW.x1 - 0.5, BREW.x1 + 0.05, 3.2, 4.4, Y, Y + 1.05, 'passHatch');
  rb(kitchen, M.woodTop, BREW.x1 - 0.55, BREW.x1 + 0.1, 3.15, 4.45, Y + 1.05, Y + 1.1, 'passHatchTop');
  rb(kitchen, M.range, -6.9, -4.3, inZ - 0.7, inZ, Y, Y + 0.9, 'stoveHot');
  put(kitchen, cyl(0.3, 0.42, 16), M.steelDark, -5.1, Y + 1.11, inZ - 0.35, 'stewPot');
  rb(kitchen, M.hood, -6.95, -4.25, inZ - 0.55, inZ, Y + 1.95, Y + 2.3, 'stoveHood');
  rb(kitchen, M.kitchen, -inX, -inX + 0.7, 2.4, 4.9, Y, Y + 0.88, 'prepBench');
  rb(kitchen, M.steel, -4.1, -3.1, 2.25, 2.85, Y, Y + 0.9, 'dishSink');
  const passAnchor = new THREE.Object3D(); passAnchor.name = 'passAnchor'; passAnchor.position.set(BREW.x1 - 0.2, Y + 1.12, 3.8); kitchen.add(passAnchor);

  // ── Baren: serveringsdisk mot glaset, tapptorn i mässing ────────
  const bar = new THREE.Group(); bar.name = 'bar'; interior.add(bar);
  rb(bar, M.wood, BAR.x0, BAR.x1, BAR.z0, BAR.z1, Y, Y + 1.06, 'barCounter');
  rb(bar, M.woodTop, BAR.x0 - 0.04, BAR.x1 + 0.08, BAR.z0 - 0.04, BAR.z1 + 0.04, Y + 1.06, Y + 1.1, 'barTop');
  rb(bar, M.brass, BAR.x1 + 0.04, BAR.x1 + 0.09, BAR.z0, BAR.z1, Y + 0.18, Y + 0.23, 'barFootRail');
  rb(bar, M.brass, -1.35, -1.2, -3.0, -1.2, Y + 1.1, Y + 1.62, 'tapTower');
  for (let i = 0; i < 8; i++) put(bar, cyl(0.025, 0.2, 6), M.brass, -1.1, Y + 1.5, -2.9 + i * 0.24, 'tapHandle' + i).rotation.z = 0.25;
  const tapAnchor = new THREE.Object3D(); tapAnchor.name = 'tapAnchor'; tapAnchor.position.set(-1.1, Y + 1.12, -2.1); bar.add(tapAnchor);

  // ── Långborden och bänkarna ─────────────────────────────────────
  const furniture = new THREE.Group(); furniture.name = 'furniture'; interior.add(furniture);
  const candles = new THREE.Group(); candles.name = 'candles'; interior.add(candles);
  const flames: THREE.Object3D[] = [];
  const seats: SeatSpec[] = [];
  function candle(x: number, y: number, z: number, id: string) {
    const c = new THREE.Group(); c.name = 'candle_' + id; c.position.set(x, y, z); candles.add(c);
    put(c, cyl(0.035, 0.12, 10), M.candle, 0, 0.06, 0, 'candleBody_' + id);
    const f = put(c, cyl(0.001, 0.07, 8, 0.024), M.flame, 0, 0.155, 0, 'candleFlame_' + id); f.castShadow = false; flames.push(f);
  }
  LONG_TABLES.forEach(function (t) {
    const g = new THREE.Group(); g.name = t.id; g.position.set(t.x, 0, t.z); furniture.add(g);
    put(g, box(LT.len, 0.07, LT.w), M.woodTop, 0, Y + LT.top, 0, t.id + 'Top');
    [-1, 1].forEach(function (s) { put(g, box(0.1, LT.top - 0.07, LT.w - 0.2), M.wood, s * (LT.len / 2 - 0.3), Y + (LT.top - 0.07) / 2, 0, t.id + 'Trestle' + s); });
    [-1, 1].forEach(function (s) {
      const bid = t.id + (s < 0 ? 'BenchS' : 'BenchN');
      put(g, box(LT.len, 0.06, LT.benchD), M.bench, 0, Y + BENCH_H - 0.03, s * LT.benchOff, bid);
      [-1, 1].forEach(function (e) { put(g, box(0.08, BENCH_H - 0.06, LT.benchD - 0.06), M.wood, e * (LT.len / 2 - 0.25), Y + (BENCH_H - 0.06) / 2, s * LT.benchOff, bid + 'Leg' + e); });
    });
    // Ingen pendel. En lampa över bordets mitt skymmer alltid någon sittande
    // kalott från någon vinkel: provet hittade en på 2,40, 2,67 och 2,98 m.
    // Ljuset över långborden är DayLightings; borden har två ljus var.
    candle(t.x - 0.9, Y + LT.top + 0.035, t.z, t.id + 'W');
    candle(t.x + 0.9, Y + LT.top + 0.035, t.z, t.id + 'E');
  });
  LONG_TABLES.forEach(function (t) {
    [-1, 1].forEach(function (s) {
      for (let k = 0; k < 5; k++) {
        const x = t.x - 2 * LT.pitch + k * LT.pitch;
        const z = t.z + s * LT.benchOff;
        const facing = s < 0 ? 0 : Math.PI;
        const bid = t.id + (s < 0 ? 'BenchS' : 'BenchN');
        seats.push({
          id: t.id + (s < 0 ? '_s' : '_n') + (k + 1), kind: 'bench', seatIndex: seats.length, furnitureId: t.id, seatNodeId: bid,
          local: [x, z], seatHeight: BENCH_H, seatSurfaceY: Y + BENCH_H, facing: facing, approach: [x, z + s * 0.62]
        });
      }
    });
  });

  // ── Ståplatser: fyra tunnor och fyra vid disken ─────────────────
  const standing: StandSpec[] = [];
  [[0.6, 3.7], [3.2, 4.2], [5.6, 3.7], [5.6, -5.0]].forEach(function (p, i) {
    const id = 'barrel' + (i + 1);
    put(furniture, cyl(0.3, 1.0, 16, 0.32), M.barrel, p[0], Y + 0.5, p[1], id + 'Body');
    [0.15, 0.85].forEach(function (h, j) { put(furniture, cyl(0.33, 0.04, 16), M.hoop, p[0], Y + h, p[1], id + 'Hoop' + j); });
    put(furniture, cyl(0.42, 0.04, 16), M.woodTop, p[0], Y + 1.02, p[1], id + 'Top');
    candle(p[0], Y + 1.04, p[1], id);
    standing.push({ id: id + 'a', kind: 'barrel', local: [p[0] - 0.55, p[1]], facing: Math.PI / 2, approach: [p[0] - 0.9, p[1]] });
    standing.push({ id: id + 'b', kind: 'barrel', local: [p[0] + 0.55, p[1]], facing: -Math.PI / 2, approach: [p[0] + 0.9, p[1]] });
  });
  [-3.8, -2.6, -0.6, 0.4].forEach(function (z, i) {
    standing.push({ id: 'barRail' + (i + 1), kind: 'barRail', local: [BAR.x1 + 0.45, z], facing: -Math.PI / 2, approach: [0.2, z] });
  });

  const staffStations: StaffStation[] = [
    { id: 'brewerHouse', role: 'brewer', local: [-4.75, -2.65], standHeight: 0.18, facing: Math.PI / 2, uniform: STAFF_UNIFORMS.brewer, note: 'Bryggaren på däcket mellan mäskkaret och kokkärlet, vänd mot glaset och gästerna.' },
    { id: 'brewerCellar', role: 'brewer', local: [-6.45, -2.7], standHeight: 0, facing: Math.PI, uniform: STAFF_UNIFORMS.brewer, note: 'Källarbryggaren vid jästankarna. Tar prov, läser av.' },
    { id: 'bartender', role: 'bartender', local: [-2.1, -2.1], standHeight: 0, facing: Math.PI / 2, uniform: STAFF_UNIFORMS.bartender, note: 'Vid tapptornet. Kopparen står bakom henne.' },
    { id: 'runner', role: 'runner', local: [-2.05, 3.8], standHeight: 0, facing: -Math.PI / 2, uniform: STAFF_UNIFORMS.runner, note: 'Vid passluckan, bär till långborden.' },
    { id: 'cookHot', role: 'cook', local: [-5.6, 4.35], standHeight: 0, facing: 0, uniform: STAFF_UNIFORMS.kitchen, note: 'Spisen med grytan. Få rätter, stora portioner. Kåpan 0,55 m djup — djupare skymde kockens kalott norrifrån.' },
    { id: 'cookPrep', role: 'cook', local: [-6.75, 3.65], standHeight: 0, facing: -Math.PI / 2, uniform: STAFF_UNIFORMS.kitchen, note: 'Prepbänken mot västra väggen.' }
  ];

  const parts: RoomParts = {
    roof: roof, walls: walls, wallUpper: wallUpper, interior: interior, brewery: brewery, kitchen: kitchen, bar: bar,
    mashRake: mashRake, steam: steam, steamPuffs: steamPuffs, vesselTops: vesselTops, candles: candles, flames: flames,
    tapAnchor: tapAnchor, passAnchor: passAnchor
  };
  const room: BrewpubRoom = {
    group: group, parts: parts, seats: seats, standing: standing, staffStations: staffStations,
    entrance: [inX - 0.5, SPINE_Z], waitingSpot: [halfW + 2.5, SPINE_Z], deliveryBay: [-halfW - 2, 0.9],
    floorY: Y, capacity: TOTAL_SEATS, width: width, depth: depth, fits: fits, shortfall: shortfall,
    mood: opts.mood ?? 'helg', brewDay: opts.brewDay ?? false,
    dispose: function () { materials.forEach(function (m) { m.dispose(); }); steamPuffs.forEach(function (p) { p.geometry.dispose(); }); group.removeFromParent(); }
  };
  setMood(room, room.mood);
  setBrewDay(room, room.brewDay);
  return room;
}

// ---------- Lägen ----------

export function setMood(room: BrewpubRoom, mood: MoodId): void {
  room.mood = mood;
  room.parts.candles.visible = MOODS[mood].candles;
}
export function setBrewDay(room: BrewpubRoom, on: boolean): void {
  room.brewDay = on;
  room.parts.steam.visible = on;
}

/** Omröraren (`phase` 0..1), ångan och lågorna (`t` sekunder). Allokerar inget. */
export function updateBrewpubRoom(room: BrewpubRoom, phase: number, t?: number): void {
  room.parts.mashRake.rotation.y = room.brewDay ? (phase ?? 0) * Math.PI * 2 : 0;
  if (t === undefined) return;
  if (room.brewDay) {
    const p = room.parts.steamPuffs;
    for (let i = 0; i < p.length; i++) {
      const u = ((t * 0.28 + i / p.length) % 1);
      p[i].position.set(-3.55 + 0.25 * Math.sin(t * 0.7 + i), PLINTH_M + 1.9 + u * 1.2, -1.5 + 0.15 * u);
      const s = 0.6 + u * 1.1; p[i].scale.set(s, s * 0.8, s);
    }
    (p[0].material as THREE.MeshStandardMaterial).opacity = 0.45;
  }
  const f = room.parts.flames;
  for (let i = 0; i < f.length; i++) f[i].scale.set(1, 1 + 0.12 * Math.sin(t * 9.1 + i * 1.7) + 0.06 * Math.sin(t * 23 + i), 1);
}

const _cam = new THREE.Vector3();
export function updateCutaway(room: BrewpubRoom, camera: THREE.Object3D): WallSide[] {
  camera.getWorldPosition(_cam); room.group.worldToLocal(_cam);
  const hx = room.width / 2 + 0.5, hz = room.depth / 2 + 0.5;
  const cut: Record<WallSide, boolean> = { E: _cam.x > hx, W: _cam.x < -hx, N: _cam.z > hz, S: _cam.z < -hz };
  const out: WallSide[] = [];
  (['N', 'S', 'E', 'W'] as WallSide[]).forEach(function (s) { room.parts.wallUpper[s].visible = !cut[s]; if (cut[s]) out.push(s); });
  return out;
}

// ---------- Vägar ----------

/** Entrén → mittgången → bänkens gång. Bänkar nås från sin långsida. */
export function walkPathToSeat(room: BrewpubRoom, seatId: string): Vec2[] {
  const s = room.seats.find(function (x) { return x.id === seatId; });
  if (!s) return [];
  const p: Vec2[] = [[room.entrance[0], room.entrance[1]], [5.2, SPINE_Z]];
  const az = s.approach[1];
  if (Math.abs(az - SPINE_Z) > 0.8) p.push([5.2, az]);
  p.push([s.approach[0], az], [s.local[0], s.local[1]]);
  return p;
}
export function exitPathFromSeat(room: BrewpubRoom, seatId: string): Vec2[] {
  const b = walkPathToSeat(room, seatId).slice().reverse(); b.push([room.waitingSpot[0], room.waitingSpot[1]]); return b;
}

// ---------- Prov och mätning ----------

function shown(o: THREE.Object3D | null): boolean { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

/** Siktlinjen: från varje sittande gästs ögon till kärlens toppar, genom glaset. */
export function checkSightLines(room: BrewpubRoom) {
  room.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const o = new THREE.Vector3(), t = new THREE.Vector3(), d = new THREE.Vector3();
  const per: { seatId: string; copper: boolean; vessels: number }[] = [];
  let seeCopper = 0, seeAny = 0;
  room.seats.forEach(function (s) {
    o.set(s.local[0], eyeHeightForSeat(s), s.local[1]); room.group.localToWorld(o);
    let n = 0, copper = false;
    room.parts.vesselTops.forEach(function (top) {
      top.getWorldPosition(t); d.copy(t).sub(o);
      const dist = d.length(); ray.set(o, d.normalize()); ray.far = dist - 0.3;
      const hit = ray.intersectObject(room.group, true).find(function (h) {
        const nm = h.object.name;
        return shown(h.object) && !/^(floor|glass|candle|steam)/.test(nm) && nm.indexOf(top.name.replace('Top', '')) !== 0;
      });
      if (!hit) { n++; if (/^(mashTun|kettle)/.test(top.name)) copper = true; }
    });
    if (copper) seeCopper++; if (n) seeAny++;
    per.push({ seatId: s.id, copper: copper, vessels: n });
  });
  return { perSeat: per, seatsSeeingCopper: seeCopper, seatsSeeingAnyVessel: seeAny, vessels: room.parts.vesselTops.length };
}

/** Specens kontroll: platser, ståplatser, stationer, entrén — från kameran. */
export function checkCameraView(room: BrewpubRoom, camera: THREE.Object3D, extra?: THREE.Object3D[]) {
  room.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3(), to = new THREE.Vector3(), dir = new THREE.Vector3();
  camera.getWorldPosition(from);
  const targets = [room.group as THREE.Object3D].concat(extra ?? []);
  function test(x: number, y: number, z: number): string | null {
    to.set(x, y, z); room.group.localToWorld(to); dir.copy(to).sub(from);
    const dd = dir.length(); ray.set(from, dir.normalize()); ray.far = dd - 0.25;
    const hits = ray.intersectObjects(targets, true);
    for (let h = 0; h < hits.length; h++) {
      const ob = hits[h].object;
      if (!shown(ob) || /^(floor|glass|candle|steam|.*PendantCord)/.test(ob.name)) continue;
      return ob.name || 'namnlös';
    }
    return null;
  }
  const blocked: { id: string; by: string }[] = [];
  let seats = 0, stand = 0, st = 0;
  room.seats.forEach(function (s) { const b = test(s.local[0], s.seatSurfaceY + 0.95, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else seats++; });
  room.standing.forEach(function (s) { const b = test(s.local[0], PLINTH_M + 1.55, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else stand++; });
  room.staffStations.forEach(function (s) { const b = test(s.local[0], PLINTH_M + s.standHeight + 1.55, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else st++; });
  const e = test(room.entrance[0], PLINTH_M + 1.55, room.entrance[1]); if (e) blocked.push({ id: 'entrance', by: e });
  return { seatsSeen: seats, seats: room.seats.length, standingSeen: stand, standing: room.standing.length,
           stationsSeen: st, stations: room.staffStations.length, entranceSeen: !e, blocked: blocked };
}

export function measureBrewpubRoom(room: BrewpubRoom) {
  room.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  const bb = new THREE.Box3().setFromObject(room.parts.interior).applyMatrix4(inv);
  const br = new THREE.Box3();
  room.parts.interior.traverse(function (o) { if (o.name === 'floorBrewery') br.setFromObject(o).applyMatrix4(inv); });
  let tallest = 0;
  room.parts.brewery.traverse(function (o: any) { if (o.isMesh && /Dome$/.test(o.name)) tallest = Math.max(tallest, new THREE.Box3().setFromObject(o).applyMatrix4(inv).max.y - PLINTH_M); });
  return {
    footprint: [bb.max.x - bb.min.x, bb.max.z - bb.min.z] as Vec2,
    breweryArea: (br.max.x - br.min.x) * (br.max.z - br.min.z),
    vessels: room.parts.vesselTops.length,
    tallestVessel: tallest,
    breweryWall: { sill: BREW.sill, top: BREW.top },
    seats: room.seats.length, standing: room.standing.length,
    barLength: BAR.z1 - BAR.z0,
    spine: 2 * 1.28
  };
}

export function planRects(room: BrewpubRoom) {
  room.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  const out: { name: string; x0: number; x1: number; z0: number; z1: number; top: number }[] = [];
  const b = new THREE.Box3();
  room.parts.interior.traverse(function (o: any) {
    if (!o.isMesh || !shown(o)) return;
    if (/^(candle|glass|steam|tapHandle|maltSack)|Pendant|Hoop|Leg[-\d]*$|Trestle|Mullion|Rail$|Dome$/.test(o.name)) return;
    b.setFromObject(o).applyMatrix4(inv);
    out.push({ name: o.name, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, top: b.max.y });
  });
  return out;
}

export function resolveWorldPositions(room: BrewpubRoom) {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function w(p: Vec2): Vec2 { v.set(p[0], 0, p[1]); room.group.localToWorld(v); return [v.x, v.z]; }
  return {
    seats: room.seats.map(function (s) { return w(s.local); }),
    standing: room.standing.map(function (s) { return w(s.local); }),
    staffStations: room.staffStations.map(function (s) { return w(s.local); }),
    entrance: w(room.entrance), waitingSpot: w(room.waitingSpot), deliveryBay: w(room.deliveryBay)
  };
}
