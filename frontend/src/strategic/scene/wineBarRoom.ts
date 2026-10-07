// wineBarRoom — vinbaren, omgjord för Nexus v1 (DESIGN_SPEC_NEXUS_V1 §2.1, paket 1).
//
// SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten).
// Formmall: brewpubRoom.ts. Samma kontrakt, samma koordinatkonvention,
// samma exportmönster, samma FLAGS-disciplin. Ersätter wineBarRoom.ts
// ur leveransen 2026-08-30 — se LEVERANS.md.
//
// Kontrakt (oförändrat):
//   • Ren three.js. Inga externa beroenden, ingen skinning, inga
//     loaders, inga binära assets.
//   • Byggs imperativt EN gång (createWineBarRoom). Inget skapas i
//     renderloopen — vinväggens två lägen och kvällens två stämningar
//     byggs båda från början och växlas med `visible`.
//   • Ingen egen klocka. Skivtallriken och ljuslågorna drivs av faser
//     anroparen skickar in.
//   • Ingen simuleringslogik. Rummet är geometri.
//
// ── Vad specen ändrade, och vad det kostade ───────────────────────
//
// 1. BAREN ÄR CENTRAL. Förra planen hade disken mot västra väggen och
//    hyllan bakom den. Specen säger "central, med synlig vinvägg", och
//    då räcker det inte att flytta disken: en vinvägg mot en vägg är en
//    lodrät yta, och en lodrät yta är det den strategiska kameran ser
//    sämst (samma lärdom som glaspartiet i ölkrogen och luckan i food
//    trucken). Vinväggen står därför MITT I baren som en dubbelsidig
//    ryggrad: en bardisk runt tre sidor, två bartenderstråk, och
//    flaskorna liggande med halsen ut mot båda stråken. Ovanifrån läser
//    krönet som ett rutnät av flaskhalsar — den vågräta ytan är
//    presentationen.
//
// 2. VINVÄGGEN VÄXER — PÅ LÄNGDEN, INTE BARA PÅ HÖJDEN. Platina i
//    Stensöta ger fler hyllplan, men höjd syns dåligt ovanifrån och
//    kostar sikt (en högre vägg skymmer bortre stråket). Tillväxten
//    läggs därför i tre led som alla syns från kamerahöjd: längre
//    (3,2 → 4,1 m), ett krön med magnumrad och en upplyst hylla på
//    toppen. Höjden går 1,60 → 2,06 m och inte längre: 2,06 m är den
//    höjd där en bartender i bortre stråket fortfarande syns från
//    axlarna och upp vid PLAYER_CAMERA.pitch. Se WINE_WALL.
//
// 3. KAMERASIDANS VÄGGAR ÄR KAPADE. Specen §1: skymmer en vägg
//    interiören är det leveransens fel. Varje vägg är två delar — sockel
//    0–0,90 m och överdel — och updateCutaway(room, camera) döljer
//    överdelen på de sidor kameran står utanför. checkCameraView() är
//    provet: raycast från kameran till varje plats och station.
//
// 4. DJ:N STÅR I ETT HÖRN, som specen säger — sydöstra, vid entrén.
//    Hörnet valdes för att DJ:n ska adressera det öppna golvet mellan
//    barens östra kortände och dörren. Det golvet är tomt på en
//    tisdag och fullt av stående gäster på en lördag: samma yta bär
//    båda stämningarna.
//
// 5. LJUSET ÄR DATA, INTE LAMPOR. DayLighting och kvällscykeln äger
//    ljuset (LEVERANSDIREKTIV §6). Rummet levererar pendlarna och
//    ljusen som geometri med självlysande material, deras positioner
//    som data (candles[], pendants[]) och en ljusstämning per kväll i
//    LIGHT_MOODS — värden att läsa, inte ljuskällor rummet skapar.
//
// ── Koordinater (identiskt med brewpubRoom.ts) ─────────────────────
//   lokal +X = byggnadens långa axel, entrén ligger i +X-änden
//   lokal +Z = korta axeln
//   origo    = polygonens centroid, golvplanet y = 0,11 (sockeln)
// Anroparen placerar gruppen:
//   room.group.position.set(obb.centre[0], 0, obb.centre[1]);
//   room.group.rotation.y = -obb.angle;
// Kurs (`facing`) är yaw i figurens ram: 0 = mot lokal +Z, +PI/2 = mot +X.
//
// ── Planen, i ett stycke ──────────────────────────────────────────
// Rummet 15,6 × 11,8 m. Baren står mitt i, 6,0 × 3,6 m, öppen mot väster
// där personalen går in från köket. Köket är instängt i NV-hörnet med
// två stationer (kallskänk, varm) och en diskplats. Loungerna står längs
// norra väggen, tvåorna längs södra, DJ:n i SO-hörnet och vinförrådet i
// SV-hörnet. Det öppna golvet mellan barens östra kortände och dörren
// har huvudgolvets färg och ingen egen zon.
//
// ── Platserna (tjugo) ─────────────────────────────────────────────
//   6 loungeplatser (2 × 3 dynor) — norra väggen, sitthöjd 0,38
//   6 platser vid tre tvåor — södra bandet, stol 0,45
//   8 barstolar (4 + 4) — vända mot vinväggen, sits 0,75
// Åtta ståplatser (fyra vid barens östra kortände, fyra vid två ståbord)
// finns som geometri men räknas INTE. Se FLAGS.standing.
//
// ── Fast kontra ändringsbart ──────────────────────────────────────
// FAST: baren mitt i rummet; vinväggen som dubbelsidig ryggrad i baren;
//   stråken 0,98 m; vinväggens höjdtak 2,06 m; DJ-hörnet med platta,
//   golvbyte och fond; loungens separata dynor; golvzonernas smala
//   luminansspann; kapade väggar på kamerasidan; taket 3,40 m.
// ÄNDRINGSBART: sitsfördelningen inom de tjugo, ståbordens läge,
//   kökets två stationer, rummets bredd och djup inom MIN_WIDTH_M /
//   MIN_DEPTH_M — under dem returneras `fits: false` med underskott.

import * as THREE from 'three';
// ORDER 317 — möbleringen i huset (Designs leverans 2026-10-07): måtten och
// placeringarna läses ur wineBarHouse.ts, så att inget står i en vägg.
import { ENTRANCE as HOUSE_ENTRANCE, LANES, LAYOUT as HOUSE, MIN_SIZE, MISE_SPOTS as HOUSE_MISE, QUEUE_SPOTS as HOUSE_QUEUE, ROOM as HOUSE_ROOM, STAFF_PATH_KITCHEN_TO_BAR, STAFF_STATIONS as HOUSE_STATIONS } from './wineBarHouse';

// #region types

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type SeatKind = 'bar' | 'lounge' | 'twotop';
export type LaneId = 'spine' | 'north' | 'south' | 'staff';
export type WineWallLevel = 'bas' | 'platina';
export type MoodId = 'tidig' | 'helg';
export type WallSide = 'N' | 'S' | 'E' | 'W';

export interface SeatSpec {
  id: string;
  kind: SeatKind;
  /** Sim-lagrets platta seatIndex, 0..19. Bordsplatser före barstolar. */
  seatIndex: number;
  /** Bordet/disken platsen hör till. Gruppering av sällskap läser detta. */
  furnitureId: string;
  /** Sittmöbelns egen nod (dynan, stolen, pallen). */
  seatNodeId: string;
  local: Vec2;
  /** Nominell sitshöjd över golvet — lounge 0,38, stol 0,45, barstol 0,75. */
  seatHeight: number;
  /** Överkant sits i rummets lokala Y = PLINTH_M + seatHeight. Läs denna. */
  seatSurfaceY: number;
  facing: number;
  approach: Vec2;
  lane: LaneId;
}

export interface StandSpec {
  id: string;
  kind: 'barEnd' | 'highTable';
  local: Vec2;
  facing: number;
  approach: Vec2;
  lane: LaneId;
}

/** Köplatserna vid dörren (vardagens koreografi). En plats är ett sällskap; medlemmarna står
 *  inom 0,6 m från punkten. 'inside' står på dörrmattan och väntar på värden, 'outside' på
 *  trottoaren längs fasaden. order = 1 är först i kön. */
export interface QueueSpot { id: string; side: 'inside' | 'outside'; order: number; local: Vec2; facing: number; }

/** Platserna för mise en place före öppning: där personalen står när de gör i ordning. */
export interface MiseSpot { id: string; role: string; local: Vec2; facing: number; note: string; }

export interface StaffStation {
  /** 'host' | 'bartender' | 'sommelier' | 'server' | 'cookHot' | 'cookCold' | 'dish' | 'dj' */
  id: string;
  /** Rollen i FigureActs — flera stationer kan dela roll (kocken har två). */
  role: string;
  local: Vec2;
  standHeight: number;
  facing: number;
  uniform: string;
  note: string;
}

export interface RoomParts {
  turntable: THREE.Object3D;
  roof: THREE.Object3D;
  /** Alla väggar. Barnen är per sida: wallN, wallS, wallE, wallW, var och en
   *  med `lower` (0–0,90 m, alltid synlig) och `upper`. */
  walls: THREE.Object3D;
  wallUpper: Record<WallSide, THREE.Object3D>;
  interior: THREE.Object3D;
  bar: THREE.Object3D;
  /** Vinväggens två lägen. Växlas med setWineWallLevel. */
  wineWall: Record<WineWallLevel, THREE.Object3D>;
  /** Hyllplanens mittpunkter per läge och sida — siktlinjens måltavlor. */
  shelfTargets: Record<WineWallLevel, THREE.Object3D[]>;
  djTarget: THREE.Object3D;
  /** Ljuslågorna. Skalas av flicker-fasen. */
  flames: THREE.Object3D[];
  /** Ljus som bara tänds i helgstämningen (bardisk, ståbord). */
  weekendCandles: THREE.Object3D[];
  /** DJ-plattans kantljus — lyser bara i helgstämningen. */
  djGlow: THREE.MeshStandardMaterial;
  glassAnchor: THREE.Object3D;
  passAnchor: THREE.Object3D;
  bottleAnchor: THREE.Object3D;
}

export interface WineBarOptions {
  width?: number;
  depth?: number;
  interiorHeight?: number;
  /** Vilket läge vinväggen startar i. Default 'bas'. */
  wineWall?: WineWallLevel;
  /** Vilken stämning rummet startar i. Default 'tidig'. */
  mood?: MoodId;
}

export interface WineBarRoom {
  group: THREE.Group;
  parts: RoomParts;
  seats: SeatSpec[];
  standing: StandSpec[];
  staffStations: StaffStation[];
  candles: { id: string; local: Vec3; weekendOnly: boolean }[];
  pendants: { id: string; local: Vec3 }[];
  entrance: Vec2;
  waitingSpot: Vec2;
  queueSpots: QueueSpot[];
  miseSpots: MiseSpot[];
  /** Golvplanets lokala Y — en stående figurs sulor ligger här. */
  floorY: number;
  capacity: number;
  width: number;
  depth: number;
  fits: boolean;
  shortfall: Vec2;
  wineWallLevel: WineWallLevel;
  mood: MoodId;
  dispose: () => void;
}

// #endregion types

// ---------- Låsta mått ----------

export const TOTAL_SEATS = 20;
export const STANDING_SPOTS = 8;
// ORDER 317 — det minsta rum möbleringen i huset ryms i (wineBarHouse.ts MIN_SIZE; förut 14,6 × 11,0).
export const MIN_WIDTH_M = MIN_SIZE.width;
export const MIN_DEPTH_M = MIN_SIZE.depth;

export const PLINTH_M = 0.11;
export const EYE_ABOVE_SEAT_M = 0.84;
export const EYE_STANDING_M = 1.66;
/** Sockelns höjd på kapade väggar. Brösthöjd: gränsen läses, rummet syns. */
export const CUT_H = 0.9;

const WALL_T = HOUSE_ROOM.wall;
const BAR = { x0: HOUSE.bar.x0, x1: HOUSE.bar.x1, z0: HOUSE.bar.z0, z1: HOUSE.bar.z1, depth: HOUSE.bar.depth, height: 1.1 };
const RACK_T = HOUSE.rack.z[1] - HOUSE.rack.z[0];
// ORDER 317 — vinväggens mittlinje: baren står 0,4 m söder om rummets mitt.
const RACK_Z = (HOUSE.rack.z[0] + HOUSE.rack.z[1]) / 2;
const TABLE_TOP_Y = 0.72;
const CHAIR_H = 0.45;
const STOOL_H = 0.75;
// ORDER 286a (tillägget till leverans 2): fotringen, där barstolens klipp sätter
// sulan (figureClips SEAT_KINDS.stool.footrest).
const STOOL_FOOTRING = { y: 0.30, radius: 0.2, tube: 0.014 };
// ORDER 284 höjde dynan till 0,45 m, eftersom de gamla sittposerna var byggda
// för stolens 0,45 m och rotens höjd räknades ur sitsen. ORDER 286a (tillägget
// till leverans 2): loungens sittklipp är författade för 0,38 m
// (figureClips SEAT_KINDS.lounge) och sänker höften från golvet, så dynan står
// åter på 0,38 m och fötterna i golvet.
const LOUNGE_H = 0.38;
const LOUNGE_TOP_Y = 0.45;
// ORDER 286a — ytorna rekvisitan ställs på (över golvet, utan sockeln), samma
// höjder som rummet ritar borden och disken med.
export const SURFACE_HEIGHT: Record<'two' | 'lounge' | 'bar', number> = { two: TABLE_TOP_Y, lounge: LOUNGE_TOP_Y, bar: BAR.height };
const KITCHEN = HOUSE.kitchen;
const DJ = { ...HOUSE.dj, platform: 0.25 };
const STOOL_X = HOUSE.stoolX;
const STOOL_Z = HOUSE.stoolZ;
const LOUNGE_Z = HOUSE.lounge.cushionZ;
// ORDER 286a (tillägget till leverans 2, Vision Owner 2026-09-29): bordet
// 0,95 m framför dynans mitt, inom räckhåll för den som sitter (förut 1,35 m).
const LOUNGE_TABLE_Z = HOUSE.lounge.tableZ;
// ORDER 296 (punkt 6) — där tallrikarna ställs: mitt på loungebordet, mitt på
// småbordet och på bardisken framför gästen (0,18 m in från gästens kant).
// ORDER 317 — barens två diskar står inte längre symmetriskt kring z 0:
// barGuestZ gäller norra disken och barGuestZSouth den södra.
export const PLATE_SURFACE = { loungeTableZ: HOUSE.lounge.tableZ, twoTableZ: HOUSE.twoTop.z, barGuestZ: HOUSE.bar.z1 - 0.18, barGuestZSouth: HOUSE.bar.z0 + 0.18 };
const LOUNGE_CX = HOUSE.lounge.cx;
const TWO_Z = HOUSE.twoTop.z;
const TWO_X = HOUSE.twoTop.x;

/**
 * Vinväggen i två lägen. Tillväxten syns ovanifrån: längden och krönet,
 * inte bara höjden. 2,06 m är taket — se avvikelse 2 i headern.
 */
export const WINE_WALL = {
  bas: { x0: HOUSE.rack.bas[0], x1: HOUSE.rack.bas[1], tiers: 4, height: 1.60, crown: false },
  platina: { x0: HOUSE.rack.platina[0], x1: HOUSE.rack.platina[1], tiers: 6, height: 2.06, crown: true },
  tierY0: 0.62,
  tierPitch: 0.24,
  bottlePitch: 0.085
};

/** Den strategiska kamerans värden som modellerna använt sedan SD-004.
 *  ÖVERTAGET — ska läsas ur spelets scen, inte härifrån. Se FLAGS.camera. */
export const PLAYER_CAMERA = { pitch: 0.84, fov: 38, distance: 23, yaw: 0.7, target: [0.2, 0.9, 0.2] as Vec3 };

export function eyeHeightForSeat(seat: SeatSpec): number {
  return PLINTH_M + seat.seatHeight + EYE_ABOVE_SEAT_M;
}

/**
 * Högsta grannhus som inte skymmer golvet innanför en kapad vägg, på
 * avståndet `gap` meter från fasaden. FÖLJER ur kamerans lutning: strålen
 * mot golvet vid väggens insida passerar höjden gap · tan(pitch) där
 * grannen står. Vid 48° och en 6 m gata: 6,7 m — två våningar går,
 * tre gör det inte. Se FLAGS.neighbours.
 */
export function maxNeighbourHeight(gap: number, pitch?: number): number {
  return gap * Math.tan(pitch ?? PLAYER_CAMERA.pitch) + PLINTH_M;
}

// ---------- Palett och kontrastband ----------
//
// Golvzonerna är OFÖRÄNDRADE från förra leveransen — det är dem
// kontrastbandet vilar på (fönster L 0,0509–0,1154). Personalen har fått
// två nya roller (bartender, diskare) och spelaren och mentorn har fått
// egna färger. Diskaren delar köksuniform med kocken, som gästgiveriet
// gör: "Tio stationer, fem uniformer". Rollen läses av var figuren står,
// och sju parvis skilda färger på ΔE ≥ 12 i det här fönstret är den
// gräns som håller. Uppmätt: minsta par 14,6.

export const BASE_FLOOR = '#a89577';

export const ZONE_FLOORS: { id: string; colour: string; note: string }[] = [
  { id: 'main', colour: BASE_FLOOR, note: 'Huvudgolvet och det öppna golvet vid entrén. L 0,3115.' },
  { id: 'lounge', colour: '#a49075', note: 'Loungebandet längs norra väggen. L 0,2912.' },
  { id: 'barRunway', colour: '#a08d74', note: 'Barens två stråk runt vinväggen. L 0,2778.' },
  { id: 'dj', colour: '#97866f', note: 'DJ-hörnet. Mörkast — sätter fönstrets övre gräns. L 0,2478.' },
  { id: 'kitchen', colour: '#a09786', note: 'Köket. Kallare, gråare. L 0,3133.' }
];

export const GUEST_GARMENTS = [
  '#52505d', '#5b5045', '#465452', '#5c4d58',
  '#49544a', '#555144', '#554f61', '#5b4f4d'
];

export const STAFF_UNIFORMS = {
  sommelier: '#445269',
  bartender: '#455d5f',
  server: '#5e4f37',
  kitchen: '#425741',
  dj: '#664958',
  // ORDER 293 — Designs '#2e2a2b' (vardagens koreografi) låg utanför rummets
  // kontrastband mot golven (4,0–4,9, checkPaletteAgainstFloors 1,8–3,6). Den
  // mörkaste kostymen inom bandet.
  host: '#4a4243'
};

/** Spelaren. Den enda mättade figurfärgen i rummet — igenkänningen ligger i
 *  kalotten, den yta kameran säkert ser. L 0,0956, ΔE ≥ 29 mot alla gäster. */
export const PLAYER_UNIFORM = '#933945';
/** Mentorn från Campus. Oliv, ΔE ≥ 13 mot personal och ≥ 17 mot gäster. */
export const MENTOR_GARMENT = '#585b31';

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * srgbToLinear(parseInt(h.substring(0, 2), 16)) +
    0.7152 * srgbToLinear(parseInt(h.substring(2, 4), 16)) +
    0.0722 * srgbToLinear(parseInt(h.substring(4, 6), 16));
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function allFigureColours(): string[] {
  const staff = Object.keys(STAFF_UNIFORMS).map(function (k) { return (STAFF_UNIFORMS as any)[k]; });
  return GUEST_GARMENTS.concat(staff, [PLAYER_UNIFORM, MENTOR_GARMENT]);
}

/** Hela paletten mot varje golvzon. Tom lista = godkänt. */
// ORDER 309 — colours: andra figurfärger att pröva (Designs D5 gästgrupper, guestGroups.ts).
export function checkPaletteAgainstFloors(minRatio?: number, maxRatio?: number, colours?: readonly string[]) {
  const lo = minRatio ?? 1.8;
  const hi = maxRatio ?? 3.6;
  const fails: { figure: string; zone: string; ratio: number }[] = [];
  const figs = colours ? [...colours] : allFigureColours();
  for (let i = 0; i < figs.length; i++) {
    for (let z = 0; z < ZONE_FLOORS.length; z++) {
      const r = contrast(figs[i], ZONE_FLOORS[z].colour);
      if (r < lo || r > hi) fails.push({ figure: figs[i], zone: ZONE_FLOORS[z].id, ratio: r });
    }
  }
  return fails;
}

export function paletteContrastRange(): { min: number; max: number; pairs: number } {
  let lo = 99;
  let hi = 0;
  const figs = allFigureColours();
  for (let i = 0; i < figs.length; i++) {
    for (let z = 0; z < ZONE_FLOORS.length; z++) {
      const r = contrast(figs[i], ZONE_FLOORS[z].colour);
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
  }
  return { min: lo, max: hi, pairs: figs.length * ZONE_FLOORS.length };
}

// ---------- Kvällens två stämningar ----------

/**
 * Presentationens två lägen. Rummet växlar geometri (vilka ljus som
 * brinner, DJ-kantljuset); beläggningen och ljusnivån är VÄRDEN för
 * sim-lagret respektive DayLighting att läsa. Se FLAGS.mood, FLAGS.lighting.
 */
export const LIGHT_MOODS = {
  tidig: {
    label: 'Vardag, tidig kväll',
    occupancyShare: 0.35,
    standingGuests: 0,
    candles: 'bord' as const,
    djPlaying: false,
    /** Relativt DayLightings kvällsnivå. */
    ambientScale: 0.62,
    ambientColour: '#ffd9ae',
    pendantColour: '#ffb46a',
    candleColour: '#ff9a3c',
    note: 'Intimt och lugnt. Ljus på borden, pendlarna över baren, musiken låg.'
  },
  helg: {
    label: 'Fredag och lördag, sent',
    occupancyShare: 1.0,
    standingGuests: 8,
    candles: 'alla' as const,
    djPlaying: true,
    ambientScale: 0.48,
    ambientColour: '#ffc98f',
    pendantColour: '#ffa555',
    candleColour: '#ff9a3c',
    note: 'Fyllt och livligt. Varje ljus tänt, DJ-kanten lyser, rummet mörkare runt ljuspunkterna.'
  }
};

// ---------- FLAGS ----------

export const FLAGS = {
  wineWallLevel:
    "Vinväggen har två lägen, 'bas' och 'platina'. Specen säger att den " +
    'växer när spelaren når platina i Stensöta. Rummet växlar med ' +
    'setWineWallLevel(room, level), men rummet vet inte om medaljen finns — ' +
    'medaljtillståndet är sim-lagrets. Skicka "bas" tills det finns.',
  mood:
    "Två stämningar: 'tidig' (vardag) och 'helg' (fredag–lördag sent). " +
    'setMood(room, mood) tänder bardiskens och ståbordens ljus och ' +
    'DJ-kanten. Vilken stämning som gäller kräver veckodag och klockslag ' +
    'från sim-lagret; LIGHT_MOODS.occupancyShare är ett presentationsmål, ' +
    'inte en efterfrågemodell.',
  lighting:
    'Rummet skapar inga ljuskällor. Pendlar och ljuslågor är självlysande ' +
    'material; positionerna finns i room.pendants och room.candles, ' +
    'stämningen i LIGHT_MOODS. DayLighting äger ljuset. OBS: kontrastbandet ' +
    'är mätt mot golvfärgen, inte mot det dämpade ljuset — vid ambientScale ' +
    '0,48 sjunker figurernas och golvets luminans lika mycket, så kvoten ' +
    'håller, men ljuskäglorna kring ljusen gör golvet ojämnt. Det kan ge ' +
    'lokalt lägre kontrast än 1,8 intill ett ljus. Mät i vyn.',
  camera:
    'PLAYER_CAMERA (lutning 0,84 rad, fov 38°, avstånd 23 m) är värdena ' +
    'modellerna använt sedan SD-004. De ska läsas ur spelets scen. ' +
    'checkCameraView() tar kameran som argument och räknar på den som skickas.',
  cutaway:
    'updateCutaway(room, camera) döljer överdelen på väggarna kameran står ' +
    'utanför. Anropas när kameran vridits — inte varje bildruta. Utan det ' +
    'skymmer norra och östra väggen loungerna och entrén vid standardvinkeln.',
  neighbours:
    'Grannhus är inte rummets geometri men specen §1 gör skymning till ' +
    'leveransens fel. maxNeighbourHeight(gap) ger högsta byggnad som inte ' +
    'skymmer golvet på gap meters avstånd. checkCameraView() tar extra ' +
    'hinder som tredje argument — skicka grannhusen dit.',
  standing:
    'Åtta ståplatser: fyra vid barens östra kortände, fyra vid två ståbord. ' +
    'Geometri utan tillstånd. Räknas inte i kapaciteten (FRAGOR §7).',
  loungeParty:
    'Loungerna är tre dynor kring ett bord. Sim-lagret tilldelar platser som ' +
    'en platt lista. furnitureId finns per plats; grupperingen är sim-lagrets.',
  kitchenStations:
    "Två stationer enligt specen: 'cookCold' (kallskänk) och 'cookHot' (varm). " +
    'Diskplatsen är en tredje plats i köket men ingen matstation. Vilken ' +
    'station en rätt går till kräver en rättmodell som inte finns.',
  djState:
    'Skivtallriken vrids av updateWineBarRoom(room, phase). Om det spelas ' +
    "kommer ur stämningen: LIGHT_MOODS.helg.djPlaying. Skicka 0 i 'tidig'.",
  sommelierErrand:
    'Sommelierens väg vinvägg → bord är rummets signatur. bottleAnchor ligger ' +
    'i vinväggens östra ände, mot golvet. Ärendet saknas i sim-lagret.',
  zoneFloorConstant:
    'Oförändrad: silhouetteContrast.ts har ett golv, rummet har fem zoner. ' +
    'checkPaletteAgainstFloors() hävdar bandet mot alla fem (FRAGOR §10).'
};

// ---------- Geometricache ----------

const geometryCache = new Map<string, THREE.BufferGeometry>();

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = 'b' + w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3);
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geometryCache.set(key, g); }
  return g;
}

function footring(): THREE.BufferGeometry {
  let g = geometryCache.get('footring');
  if (!g) { g = new THREE.TorusGeometry(STOOL_FOOTRING.radius, STOOL_FOOTRING.tube, 6, 20); geometryCache.set('footring', g); }
  return g;
}

function cyl(r: number, h: number, seg: number, r2?: number): THREE.BufferGeometry {
  const key = 'c' + r + '_' + h + '_' + seg + '_' + (r2 ?? r);
  let g = geometryCache.get(key);
  if (!g) { g = new THREE.CylinderGeometry(r2 ?? r, r, h, seg); geometryCache.set(key, g); }
  return g;
}

export function disposeWineBarGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

const COLOUR = {
  slab: '#6d6a5f',
  wall: '#8f8b7f',
  wallCap: '#7d796e',
  roof: '#5c5951',
  mat: '#5a4a3c',
  tableTop: '#8b8477',
  tableLeg: '#4a453d',
  chair: '#b9b3ac',
  bar: '#5b4636',
  barTop: '#6f5945',
  rack: '#3f3126',
  rackCrown: '#6f5945',
  brass: '#9a7f45',
  lounge: '#7d6f63',
  loungeTable: '#6b6157',
  dj: '#3a3630',
  djFront: '#57503f',
  kitchen: '#767268',
  cold: '#9ea3a3',
  hood: '#403c36',
  crate: '#4b3a2c',
  candle: '#e9e0cc',
  flame: '#ffb24a',
  shade: '#3a2f24',
  bulb: '#ffc27a'
};

/** Flaskornas färger. Mörk grön, burgunder, bärnsten — läser som vin på
 *  avstånd, och ingen av dem är en figurfärg. */
const BOTTLE_COLOURS = ['#2f4a2c', '#4a1f26', '#3a4a2a', '#6a4a22', '#2c3b2a', '#5a2430'];

// ---------- Konstruktion ----------

export function createWineBarRoom(options?: WineBarOptions): WineBarRoom {
  const opts = options ?? {};
  const width = opts.width ?? HOUSE_ROOM.width;
  const depth = opts.depth ?? HOUSE_ROOM.depth;
  const H = opts.interiorHeight ?? 3.4;
  const fits = width >= MIN_WIDTH_M && depth >= MIN_DEPTH_M;
  const shortfall: Vec2 = [Math.max(0, MIN_WIDTH_M - width), Math.max(0, MIN_DEPTH_M - depth)];
  const halfW = width / 2;
  const halfD = depth / 2;
  const inX = halfW - WALL_T;
  const inZ = halfD - WALL_T;
  const Y = PLINTH_M;

  const group = new THREE.Group();
  group.name = 'wineBarRoom';
  const materials: THREE.Material[] = [];
  function mat(colour: string, rough: number, metal: number, emissive?: string, ei?: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei ?? 1; }
    materials.push(m);
    return m;
  }

  const M = {
    slab: mat(COLOUR.slab, 0.9, 0), wall: mat(COLOUR.wall, 0.9, 0), wallCap: mat(COLOUR.wallCap, 0.9, 0),
    roof: mat(COLOUR.roof, 0.9, 0), mat: mat(COLOUR.mat, 0.95, 0),
    tableTop: mat(COLOUR.tableTop, 0.7, 0), tableLeg: mat(COLOUR.tableLeg, 0.9, 0), chair: mat(COLOUR.chair, 0.9, 0),
    bar: mat(COLOUR.bar, 0.8, 0), barTop: mat(COLOUR.barTop, 0.5, 0), rack: mat(COLOUR.rack, 0.85, 0),
    rackCrown: mat(COLOUR.rackCrown, 0.6, 0), brass: mat(COLOUR.brass, 0.4, 0.6),
    lounge: mat(COLOUR.lounge, 0.95, 0), loungeTable: mat(COLOUR.loungeTable, 0.8, 0),
    dj: mat(COLOUR.dj, 0.85, 0), djFront: mat(COLOUR.djFront, 0.7, 0.1),
    kitchen: mat(COLOUR.kitchen, 0.9, 0), cold: mat(COLOUR.cold, 0.5, 0.2), hood: mat(COLOUR.hood, 0.85, 0.2),
    crate: mat(COLOUR.crate, 0.9, 0), candle: mat(COLOUR.candle, 0.8, 0),
    flame: mat(COLOUR.flame, 0.5, 0, COLOUR.flame, 2.2), shade: mat(COLOUR.shade, 0.7, 0.2),
    bulb: mat(COLOUR.bulb, 0.4, 0, COLOUR.bulb, 1.6), crownGlow: mat('#e8c89a', 0.5, 0, '#ffb46a', 0.9),
    djGlow: mat('#57503f', 0.6, 0, '#ff8a3c', 0)
  };
  const bottleMats = BOTTLE_COLOURS.map(function (c) { return mat(c, 0.3, 0.1); });

  function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material,
               x: number, y: number, z: number, name: string, ry?: number): THREE.Mesh {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = name;
    parent.add(m);
    return m;
  }
  function rectBox(parent: THREE.Object3D, material: THREE.Material, x0: number, x1: number, z0: number, z1: number,
                   y0: number, y1: number, name: string): THREE.Mesh {
    return put(parent, box(x1 - x0, y1 - y0, z1 - z0), material, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, name);
  }
  function floorPlate(parent: THREE.Object3D, material: THREE.Material, x0: number, x1: number,
                      z0: number, z1: number, lift: number, name: string): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, Y + lift, (z0 + z1) / 2);
    m.receiveShadow = true;
    m.name = name;
    parent.add(m);
    return m;
  }

  // ── Skal ──────────────────────────────────────────────────────
  put(group, box(width + 0.3, 0.1, depth + 0.3), M.slab, 0, 0.05, 0, 'slab');

  const walls = new THREE.Group();
  walls.name = 'walls';
  group.add(walls);
  const wallUpper = {} as Record<WallSide, THREE.Object3D>;
  // Varje sida: sockel (alltid) + överdel (döljs när kameran står utanför).
  function wallSide(side: WallSide, segs: { x0: number; x1: number; z0: number; z1: number; top?: number; bottom?: number }[]) {
    const g = new THREE.Group();
    g.name = 'wall' + side;
    walls.add(g);
    const up = new THREE.Group();
    up.name = 'wall' + side + 'Upper';
    g.add(up);
    wallUpper[side] = up;
    segs.forEach(function (s, i) {
      const b0 = s.bottom ?? 0;
      if (b0 < CUT_H) rectBox(g, M.wall, s.x0, s.x1, s.z0, s.z1, 0.1 + b0, 0.1 + CUT_H, 'wall' + side + 'Lower' + i);
      // Kapkanten får en mörkare list, så sockeln läser som vägg och inte som bänk.
      if (b0 < CUT_H) rectBox(g, M.wallCap, s.x0, s.x1, s.z0, s.z1, 0.1 + CUT_H, 0.1 + CUT_H + 0.03, 'wall' + side + 'Cap' + i);
      rectBox(up, M.wall, s.x0, s.x1, s.z0, s.z1, 0.1 + Math.max(CUT_H, b0), 0.1 + (s.top ?? H), 'wall' + side + 'Upper' + i);
    });
  }
  wallSide('W', [{ x0: -halfW, x1: -halfW + WALL_T, z0: -halfD, z1: halfD }]);
  wallSide('N', [{ x0: -halfW, x1: halfW, z0: halfD - WALL_T, z1: halfD }]);
  wallSide('S', [{ x0: -halfW, x1: halfW, z0: -halfD, z1: -halfD + WALL_T }]);
  // Östra väggen bär dörren: två segment och en överstycke från 2,2 m.
  wallSide('E', [
    { x0: halfW - WALL_T, x1: halfW, z0: -halfD, z1: -0.7 },
    { x0: halfW - WALL_T, x1: halfW, z0: 0.7, z1: halfD },
    { x0: halfW - WALL_T, x1: halfW, z0: -0.7, z1: 0.7, bottom: 2.2 }
  ]);

  const roof = new THREE.Group();
  roof.name = 'roof';
  group.add(roof);
  put(roof, box(width + 0.4, 0.3, depth + 0.4), M.roof, 0, H + 0.25, 0, 'roofSlab');

  // ── Inredning ─────────────────────────────────────────────────
  const interior = new THREE.Group();
  interior.name = 'interior';
  group.add(interior);

  const zoneMats: { [k: string]: THREE.MeshStandardMaterial } = {};
  ZONE_FLOORS.forEach(function (z) { zoneMats[z.id] = mat(z.colour, 0.9, 0); });
  floorPlate(interior, zoneMats.main, -inX, inX, -inZ, inZ, 0, 'floorMain');
  floorPlate(interior, zoneMats.lounge, LOUNGE_CX[0] - 1.44, LOUNGE_CX[1] + 1.44, HOUSE.lounge.tableZ - 0.4, inZ, 0.002, 'floorLounge');
  floorPlate(interior, zoneMats.barRunway, BAR.x0, BAR.x1 - BAR.depth, BAR.z0 + BAR.depth, BAR.z1 - BAR.depth, 0.002, 'floorBarRunway');
  floorPlate(interior, zoneMats.dj, DJ.x0 - 0.2, inX, -inZ, DJ.z1 + 0.2, 0.002, 'floorDj');
  floorPlate(interior, zoneMats.kitchen, KITCHEN.x0, KITCHEN.x1, KITCHEN.z0, KITCHEN.z1, 0.002, 'floorKitchen');
  // Dörrmattan — entrén läst som vågrät yta, eftersom dörren försvinner med väggen.
  floorPlate(interior, M.mat, HOUSE.mat[0], HOUSE.mat[1], HOUSE.mat[2], HOUSE.mat[3], 0.004, 'floorEntranceMat');

  // ── Köket (NV) ────────────────────────────────────────────────
  const kitchen = new THREE.Group();
  kitchen.name = 'kitchen';
  interior.add(kitchen);
  // ORDER 317 — halvväggarna 1,5 m, passluckan och de tre platserna ur wineBarHouse.ts.
  HOUSE.kitchenWalls.forEach(function (w, i) { rectBox(kitchen, M.wall, w[0], w[1], w[2], w[3], Y, Y + 1.5, 'kitchenWall' + i); });
  const PASS = HOUSE.pass;
  rectBox(kitchen, M.bar, PASS[0] + 0.2, PASS[1], PASS[2], PASS[3], Y, Y + 1.05, 'passCounter');
  rectBox(kitchen, M.barTop, PASS[0] + 0.12, PASS[1] + 0.08, PASS[2] - 0.05, PASS[3] + 0.05, Y + 1.05, Y + 1.1, 'passCounterTop');
  const HOT = HOUSE.stations.hot, COLD = HOUSE.stations.cold, DISH = HOUSE.stations.dish;
  // Varm station: plancha längs västra väggen med kåpa (kåpan 0,05 m smalare, så kockens kalott syns).
  rectBox(kitchen, M.kitchen, HOT[0], HOT[1], HOT[2], HOT[3], Y, Y + 0.9, 'stationHot');
  // ORDER 317 — kåpan börjar 0,6 m in på stationen, så att diskarens kalott (z 2,45)
  // syns från nordväst, och är 0,55 m djup (kockens kalott syns från väster).
  rectBox(kitchen, M.hood, HOT[0], HOT[0] + 0.55, HOT[2] + 0.6, HOT[3] + 0.05, Y + 1.95, Y + 2.3, 'stationHotHood');
  // Kallskänk: längs norra väggen, ljusare skiva så den läser kall uppifrån.
  rectBox(kitchen, M.kitchen, COLD[0], COLD[1], COLD[2], COLD[3], Y, Y + 0.86, 'stationCold');
  rectBox(kitchen, M.cold, COLD[0], COLD[1], COLD[2], COLD[3], Y + 0.86, Y + 0.9, 'stationColdTop');
  // Diskplatsen — ingen matstation. Se FLAGS.kitchenStations.
  rectBox(kitchen, M.cold, DISH[0], DISH[1], DISH[2], DISH[3], Y, Y + 0.9, 'dishSink');
  const passAnchor = new THREE.Object3D();
  passAnchor.name = 'passAnchor';
  passAnchor.position.set(KITCHEN.x1 - 0.2, Y + 1.12, (HOUSE.pass[2] + HOUSE.pass[3]) / 2);
  kitchen.add(passAnchor);

  // ── Baren ─────────────────────────────────────────────────────
  const bar = new THREE.Group();
  bar.name = 'bar';
  interior.add(bar);
  const bh = BAR.height;
  // Disken runt tre sidor, öppen mot väster.
  rectBox(bar, M.bar, BAR.x0, BAR.x1, BAR.z1 - BAR.depth, BAR.z1, Y, Y + bh, 'barCounterN');
  rectBox(bar, M.bar, BAR.x0, BAR.x1, BAR.z0, BAR.z0 + BAR.depth, Y, Y + bh, 'barCounterS');
  rectBox(bar, M.bar, BAR.x1 - BAR.depth, BAR.x1, BAR.z0 + BAR.depth, BAR.z1 - BAR.depth, Y, Y + bh, 'barCounterE');
  rectBox(bar, M.barTop, BAR.x0 - 0.04, BAR.x1 + 0.06, BAR.z1 - BAR.depth - 0.02, BAR.z1 + 0.06, Y + bh, Y + bh + 0.05, 'barTopN');
  rectBox(bar, M.barTop, BAR.x0 - 0.04, BAR.x1 + 0.06, BAR.z0 - 0.06, BAR.z0 + BAR.depth + 0.02, Y + bh, Y + bh + 0.05, 'barTopS');
  rectBox(bar, M.barTop, BAR.x1 - BAR.depth - 0.02, BAR.x1 + 0.06, BAR.z0 + BAR.depth, BAR.z1 - BAR.depth, Y + bh, Y + bh + 0.05, 'barTopE');
  // Messingfotlisten — den enda detalj som fångar ljus ovanifrån.
  rectBox(bar, M.brass, BAR.x0, BAR.x1, BAR.z1 + 0.02, BAR.z1 + 0.07, Y + 0.18, Y + 0.23, 'barFootRailN');
  rectBox(bar, M.brass, BAR.x0, BAR.x1, BAR.z0 - 0.07, BAR.z0 - 0.02, Y + 0.18, Y + 0.23, 'barFootRailS');
  rectBox(bar, M.brass, BAR.x1 + 0.02, BAR.x1 + 0.07, BAR.z0, BAR.z1, Y + 0.18, Y + 0.23, 'barFootRailE');

  // Vinväggen, två lägen. Flaskorna ligger med halsen ut mot båda stråken;
  // en InstancedMesh per färg och läge, byggd en gång.
  const wineWall = {} as Record<WineWallLevel, THREE.Object3D>;
  const shelfTargets = {} as Record<WineWallLevel, THREE.Object3D[]>;
  const bottleGeo = cyl(0.036, 0.11, 8);
  const bottleSlots: Record<WineWallLevel, number> = { bas: 0, platina: 0 };
  (['bas', 'platina'] as WineWallLevel[]).forEach(function (level) {
    const spec = WINE_WALL[level];
    const g = new THREE.Group();
    g.name = 'wineWall_' + level;
    bar.add(g);
    wineWall[level] = g;
    shelfTargets[level] = [];
    const len = spec.x1 - spec.x0;
    const cx = (spec.x0 + spec.x1) / 2;
    rectBox(g, M.rack, spec.x0, spec.x1, RACK_Z - RACK_T / 2 + 0.06, RACK_Z + RACK_T / 2 - 0.06, Y, Y + spec.height, 'wineWallCore_' + level);
    // Gavlar i ek, så väggens ändar läser som möbel och inte som låda.
    rectBox(g, M.rackCrown, spec.x0 - 0.04, spec.x0, RACK_Z - RACK_T / 2, RACK_Z + RACK_T / 2, Y, Y + spec.height + 0.02, 'wineWallEndW_' + level);
    rectBox(g, M.rackCrown, spec.x1, spec.x1 + 0.04, RACK_Z - RACK_T / 2, RACK_Z + RACK_T / 2, Y, Y + spec.height + 0.02, 'wineWallEndE_' + level);
    const perRow = Math.floor((len - 0.1) / WINE_WALL.bottlePitch);
    const counts = bottleMats.map(function () { return 0; });
    const plan: { i: number; x: number; y: number; z: number; rx: number }[] = [];
    let n = 0;
    for (let t = 0; t < spec.tiers; t++) {
      const y = Y + WINE_WALL.tierY0 + t * WINE_WALL.tierPitch;
      for (let side = -1; side <= 1; side += 2) {
        const zFace = RACK_Z + side * (RACK_T / 2 - 0.05);
        rectBox(g, M.rackCrown, spec.x0, spec.x1, Math.min(zFace, zFace + side * 0.06), Math.max(zFace, zFace + side * 0.06),
                y - 0.075, y - 0.055, 'shelfTier_' + level + '_' + t + (side < 0 ? 'S' : 'N'));
        const tgt = new THREE.Object3D();
        tgt.name = 'shelfTarget_' + level + '_' + t + (side < 0 ? 'S' : 'N');
        tgt.position.set(cx, y, zFace + side * 0.02);
        g.add(tgt);
        shelfTargets[level].push(tgt);
        for (let b = 0; b < perRow; b++) {
          const ci = (b * 7 + t * 3 + (side > 0 ? 1 : 0)) % bottleMats.length;
          counts[ci]++;
          plan.push({ i: ci, x: spec.x0 + 0.09 + b * WINE_WALL.bottlePitch, y: y, z: zFace + side * 0.02, rx: Math.PI / 2 });
          n++;
        }
      }
    }
    // Krönet: magnumrad liggande längs toppen + en upplyst list. Bara platina.
    if (spec.crown) {
      const topY = Y + spec.height + 0.06;
      for (let b = 0; b < Math.floor(len / 0.12); b++) {
        for (let r = -1; r <= 1; r += 2) {
          const ci = (b + (r > 0 ? 2 : 0)) % bottleMats.length;
          counts[ci]++;
          plan.push({ i: ci, x: spec.x0 + 0.1 + b * 0.12, y: topY, z: RACK_Z + r * 0.1, rx: Math.PI / 2 });
          n++;
        }
      }
      rectBox(g, M.crownGlow, spec.x0 + 0.05, spec.x1 - 0.05, RACK_Z - 0.03, RACK_Z + 0.03, Y + spec.height, Y + spec.height + 0.02, 'wineWallCrownGlow');
    }
    bottleSlots[level] = n;
    const meshes = bottleMats.map(function (m, ci) {
      const im = new THREE.InstancedMesh(bottleGeo, m, Math.max(1, counts[ci]));
      im.name = 'bottles_' + level + '_' + ci;
      im.castShadow = false;
      im.receiveShadow = true;
      g.add(im);
      return im;
    });
    const k = counts.map(function () { return 0; });
    const dummy = new THREE.Object3D();
    plan.forEach(function (p) {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, 0, 0);
      dummy.updateMatrix();
      meshes[p.i].setMatrixAt(k[p.i]++, dummy.matrix);
    });
    meshes.forEach(function (im) { im.instanceMatrix.needsUpdate = true; });
  });
  const startLevel: WineWallLevel = opts.wineWall ?? 'bas';
  wineWall.bas.visible = startLevel === 'bas';
  wineWall.platina.visible = startLevel === 'platina';

  const bottleAnchor = new THREE.Object3D();
  bottleAnchor.name = 'bottleAnchor';
  bottleAnchor.position.set(WINE_WALL.bas.x1 - 0.1, Y + 1.34, RACK_Z + RACK_T / 2 + 0.05);
  bar.add(bottleAnchor);
  const glassAnchor = new THREE.Object3D();
  glassAnchor.name = 'glassAnchor';
  glassAnchor.position.set(BAR.x1 - 0.3, Y + bh + 0.06, BAR.z1 - 0.3);
  bar.add(glassAnchor);

  // Pendlarna över baren: fyra skärmar längs vinväggen, 2,55 m.
  const pendants: { id: string; local: Vec3 }[] = [];
  // ORDER 317 — fyra skärmar på samma avstånd från barens mitt som förut
  // (−1,8, −0,5, 0,8 och 2,1 m), över vinväggens mittlinje.
  [-1.8, -0.5, 0.8, 2.1].map(function (d) { return (BAR.x0 + BAR.x1) / 2 + d; }).forEach(function (x, i) {
    const py = Y + 2.55;
    put(bar, cyl(0.008, H - 2.55, 4), M.shade, x, py + (H - 2.55) / 2, RACK_Z, 'pendantCord' + i);
    put(bar, cyl(0.17, 0.16, 16, 0.05), M.shade, x, py + 0.08, RACK_Z, 'pendantShade' + i);
    put(bar, cyl(0.07, 0.04, 12), M.bulb, x, py - 0.01, RACK_Z, 'pendantBulb' + i);
    pendants.push({ id: 'pendant' + (i + 1), local: [x, py, RACK_Z] });
  });

  // ── DJ-hörnet (SO) ────────────────────────────────────────────
  const dj = new THREE.Group();
  dj.name = 'dj';
  interior.add(dj);
  const pY = Y + DJ.platform;
  rectBox(dj, M.djFront, DJ.x0, DJ.x1, DJ.z0, DJ.z1, Y, pY, 'djPlatform');
  // Kantljuset — lyser i helgstämningen. Vågrätt, så det syns uppifrån.
  rectBox(dj, M.djGlow, DJ.x0, DJ.x1, DJ.z1 - 0.06, DJ.z1, pY, pY + 0.02, 'djGlowN');
  rectBox(dj, M.djGlow, DJ.x0, DJ.x0 + 0.06, DJ.z0, DJ.z1, pY, pY + 0.02, 'djGlowW');
  // Fonden mot södra väggen — den enda sidan som aldrig kapas vid standardvinkeln.
  rectBox(dj, M.dj, DJ.x0, DJ.x1, -inZ, -inZ + 0.14, Y, Y + 2.2, 'djBackdrop');
  const faceNW = -Math.PI / 4;
  put(dj, box(1.4, 0.95, 0.6), M.dj, DJ.cx, pY + 0.475, DJ.cz, 'djBooth', faceNW);
  put(dj, box(1.5, 0.05, 0.7), M.barTop, DJ.cx, pY + 0.975, DJ.cz, 'djBoothTop', faceNW);
  const djTarget = new THREE.Object3D();
  djTarget.name = 'djTarget';
  djTarget.position.set(DJ.cx + 0.45, pY + 1.45, DJ.cz - 0.45);
  dj.add(djTarget);
  const turntable = new THREE.Group();
  turntable.name = 'turntable';
  turntable.position.set(DJ.cx - 0.25, pY + 1.02, DJ.cz - 0.25);
  dj.add(turntable);
  put(turntable, cyl(0.16, 0.03, 16), M.dj, 0, 0, 0, 'platter');
  put(turntable, box(0.03, 0.035, 0.3), M.brass, 0, 0.02, 0.08, 'platterMark');

  // ── Vinförrådet (SV) ──────────────────────────────────────────
  const store = new THREE.Group();
  store.name = 'wineStore';
  interior.add(store);
  // ORDER 317 — vinkylen och två backstaplar ur wineBarHouse.ts (den tredje stapeln ryms inte).
  const STORE = HOUSE.store;
  rectBox(store, M.crate, STORE[0][0], STORE[0][1], STORE[0][2], STORE[0][3], Y, Y + 1.9, 'wineFridge');
  rectBox(store, M.crate, STORE[1][0], STORE[1][1], STORE[1][2], STORE[1][3], Y, Y + 0.9, 'crateStackA');
  rectBox(store, M.crate, STORE[2][0], STORE[2][1], STORE[2][2], STORE[2][3], Y, Y + 0.62, 'crateStackB');

  // ── Möbler och platser ────────────────────────────────────────
  const seats: SeatSpec[] = [];
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  interior.add(furniture);
  const candles: { id: string; local: Vec3; weekendOnly: boolean }[] = [];
  const flames: THREE.Object3D[] = [];
  const weekendCandles: THREE.Object3D[] = [];

  function candle(x: number, topY: number, z: number, id: string, weekendOnly: boolean): void {
    const c = new THREE.Group();
    c.name = 'candle_' + id;
    c.position.set(x, topY, z);
    furniture.add(c);
    put(c, cyl(0.035, 0.1, 10), M.candle, 0, 0.05, 0, 'candleBody_' + id);
    const f = put(c, cyl(0.001, 0.07, 8, 0.024), M.flame, 0, 0.135, 0, 'candleFlame_' + id);
    f.castShadow = false;
    flames.push(f);
    if (weekendOnly) weekendCandles.push(c);
    candles.push({ id: id, local: [x, topY + 0.14, z], weekendOnly: weekendOnly });
  }

  function table(id: string, x: number, z: number, lx: number, lz: number, topY: number, legMat: THREE.Material): void {
    const t = new THREE.Group();
    t.name = id;
    t.position.set(x, 0, z);
    furniture.add(t);
    put(t, box(lx, 0.05, lz), M.tableTop, 0, Y + topY, 0, id + 'Top');
    put(t, cyl(0.05, topY, 8), legMat, 0, Y + topY / 2, 0, id + 'Leg');
    put(t, cyl(0.22, 0.03, 12), legMat, 0, Y + 0.015, 0, id + 'Base');
  }

  // Loungerna: två grupper om tre separata dynor, 0,08 m glapp.
  LOUNGE_CX.forEach(function (cx, li) {
    const id = li === 0 ? 'loungeA' : 'loungeB';
    rectBox(furniture, M.lounge, cx - 1.24, cx + 1.24, HOUSE.lounge.back[0], HOUSE.lounge.back[1], Y, Y + 0.95, id + 'Back');
    rectBox(furniture, M.loungeTable, cx - 1.26, cx + 1.26, LOUNGE_Z - 0.36, HOUSE.lounge.back[0], Y, Y + 0.2, id + 'Plinth');
    table(id + 'Table', cx, LOUNGE_TABLE_Z, HOUSE.lounge.tableW, HOUSE.lounge.tableD, LOUNGE_TOP_Y, M.tableLeg);
    candle(cx, Y + LOUNGE_TOP_Y + 0.025, LOUNGE_TABLE_Z, id, false);
    for (let k = 0; k < 3; k++) {
      const sx = cx + (k - 1) * 0.8;
      put(furniture, box(0.72, 0.16, 0.72), M.lounge, sx, Y + LOUNGE_H - 0.06, LOUNGE_Z, id + 'Cushion' + k);
      seats.push({
        id: id + (k + 1), kind: 'lounge', seatIndex: seats.length, furnitureId: id + 'Table',
        seatNodeId: id + 'Cushion' + k, local: [sx, LOUNGE_Z], seatHeight: LOUNGE_H,
        seatSurfaceY: Y + LOUNGE_H, facing: Math.PI, approach: [sx, LANES.loungeInnerZ], lane: 'north'
      });
    }
  });

  // Tvåorna längs södra väggen.
  TWO_X.forEach(function (x, ti) {
    const id = 'two' + String.fromCharCode(65 + ti);
    table(id, x, TWO_Z, HOUSE.twoTop.size, HOUSE.twoTop.size, TABLE_TOP_Y, M.tableLeg);
    candle(x, Y + TABLE_TOP_Y + 0.025, TWO_Z, id, false);
    for (let k = 0; k < 2; k++) {
      const sx = x + (k === 0 ? -HOUSE.twoTop.chairDx : HOUSE.twoTop.chairDx);
      const facing = k === 0 ? Math.PI / 2 : -Math.PI / 2;
      const cid = 'chair_' + id + (k + 1);
      const c = new THREE.Group();
      c.name = cid;
      c.position.set(sx, 0, TWO_Z);
      c.rotation.y = facing;
      furniture.add(c);
      put(c, cyl(0.22, 0.05, 12), M.chair, 0, Y + CHAIR_H, 0, cid + 'Seat');
      put(c, cyl(0.04, CHAIR_H, 8), M.chair, 0, Y + CHAIR_H / 2, 0, cid + 'Stem');
      put(c, box(0.42, 0.4, 0.04), M.chair, 0, Y + CHAIR_H + 0.22, -0.2, cid + 'Back');
      seats.push({
        id: id + (k + 1), kind: 'twotop', seatIndex: seats.length, furnitureId: id,
        seatNodeId: cid, local: [sx, TWO_Z], seatHeight: CHAIR_H, seatSurfaceY: Y + CHAIR_H,
        facing: facing, approach: [sx, LANES.southZ], lane: 'south'
      });
    }
  });

  // Barstolarna sist, norr först.
  [1, -1].forEach(function (side) {
    STOOL_X.forEach(function (x) {
      const n = seats.length - 11;
      const sid = 'stool' + n;
      const z = side > 0 ? STOOL_Z.N : STOOL_Z.S;
      const c = new THREE.Group();
      c.name = sid;
      c.position.set(x, 0, z);
      furniture.add(c);
      put(c, cyl(0.19, 0.05, 12), M.chair, 0, Y + STOOL_H, 0, sid + 'Seat');
      put(c, cyl(0.045, STOOL_H, 8), M.chair, 0, Y + STOOL_H / 2, 0, sid + 'Stem');
      put(c, cyl(0.17, 0.03, 12), M.brass, 0, Y + 0.02, 0, sid + 'Foot');
      const ring = put(c, footring(), M.brass, 0, Y + STOOL_FOOTRING.y, 0, sid + 'Footring');
      ring.rotation.x = Math.PI / 2;
      seats.push({
        id: 'bar' + n, kind: 'bar', seatIndex: seats.length, furnitureId: side > 0 ? 'barCounterN' : 'barCounterS',
        seatNodeId: sid, local: [x, z], seatHeight: STOOL_H, seatSurfaceY: Y + STOOL_H,
        facing: side > 0 ? Math.PI : 0, approach: [x, side > 0 ? LANES.northZ : LANES.southZ], lane: side > 0 ? 'north' : 'south'
      });
    });
  });
  // Diskens ljus — bara helg.
  candle(-1.35, Y + bh + 0.05, BAR.z1 - 0.3, 'barN1', true);
  candle(0.9, Y + bh + 0.05, BAR.z1 - 0.3, 'barN2', true);
  candle(-1.35, Y + bh + 0.05, BAR.z0 + 0.3, 'barS1', true);
  candle(0.9, Y + bh + 0.05, BAR.z0 + 0.3, 'barS2', true);

  // ── Ståplatser: barens östra kortände + två ståbord ───────────
  const standing: StandSpec[] = [];
  HOUSE.barEnd.z.forEach(function (z, k) {
    standing.push({ id: 'standBar' + (k + 1), kind: 'barEnd', local: [HOUSE.barEnd.x, z], facing: -Math.PI / 2, approach: [LANES.spineX, z], lane: 'spine' });
  });
  HOUSE.highTables.forEach(function (p, k) {
    const id = 'highTable' + (k + 1);
    table(id, p[0], p[1], 0.62, 0.62, 1.08, M.brass);
    candle(p[0], Y + 1.08 + 0.025, p[1], id, true);
    standing.push({ id: id + 'a', kind: 'highTable', local: [p[0] - 0.55, p[1]], facing: Math.PI / 2, approach: [p[0] - 0.9, p[1]], lane: 'spine' });
    standing.push({ id: id + 'b', kind: 'highTable', local: [p[0] + 0.55, p[1]], facing: -Math.PI / 2, approach: [p[0] + 0.9, p[1]], lane: 'spine' });
  });
  // Klädhängaren vid dörren — dit "på väg att gå" tittar.
  rectBox(furniture, M.brass, inX - 0.12, inX - 0.06, 1.1, 2.3, Y + 1.7, Y + 1.74, 'coatRail');
  rectBox(furniture, M.brass, inX - 0.12, inX - 0.06, 1.1, 1.14, Y, Y + 1.74, 'coatRailPostA');
  rectBox(furniture, M.brass, inX - 0.12, inX - 0.06, 2.26, 2.3, Y, Y + 1.74, 'coatRailPostB');
  // Värdpulten söder om dörrmattan (leverans 3, godkänd 2026-09-30). Framsidan mot dörren (+x).
  // 0,60 bred längs z, 0,45 djup längs x, 1,10 hög. Samma mått som tableware 'hostDesk'. Vasen står på den.
  // ORDER 317 — pulten ur wineBarHouse.ts (samma mått, 0,565 m längre in).
  const HD = HOUSE.hostDesk;
  rectBox(furniture, M.bar, HD[0], HD[1], HD[2], HD[3], Y, Y + 0.06, 'hostDeskPlinth');
  rectBox(furniture, M.bar, HD[0] + 0.02, HD[1] - 0.02, HD[2] + 0.02, HD[3] - 0.02, Y + 0.06, Y + 1.06, 'hostDesk');
  rectBox(furniture, M.barTop, HD[0], HD[1], HD[2], HD[3], Y + 1.06, Y + 1.10, 'hostDeskTop');
  rectBox(furniture, M.brass, HD[1] - 0.02, HD[1] - 0.014, HD[2] + 0.02, HD[3] - 0.02, Y + 0.91, Y + 0.93, 'hostDeskBrass');
  // ── Vardagens koreografi (efter leverans 3) ──────────────────────
  // Trottoaren utanför dörren, där kön står. Samma höjd som golvet, en kantsten mot gatan.
  const paveM = mat('#4b433c', 0.95, 0), boardM = mat('#23221f', 0.9, 0), steelM = mat('#9a978f', 0.35, 0.6);
  floorPlate(furniture, paveM, halfW, halfW + 3.4, -halfD - 3.2, 2.8, 0, 'pavement');
  rectBox(furniture, M.wallCap, halfW + 3.4, halfW + 3.55, -halfD - 3.2, 2.8, Y - 0.02, Y + 0.1, 'kerb');
  // Tavlan på staffli söder om pulten, framsidan mot dörren (+x). Per skriver kvällens viner på den.
  const EA = HOUSE.easel;
  rectBox(furniture, M.bar, EA[0], EA[0] + 0.04, EA[2], EA[2] + 0.04, Y, Y + 1.55, 'easelLegS');
  rectBox(furniture, M.bar, EA[0], EA[0] + 0.04, EA[3] - 0.04, EA[3], Y, Y + 1.55, 'easelLegN');
  rectBox(furniture, boardM, EA[0] + 0.04, EA[0] + 0.08, EA[2] + 0.03, EA[3] - 0.03, Y + 0.72, Y + 1.48, 'menuBoard');
  rectBox(furniture, M.brass, EA[0] + 0.04, EA[1], EA[2] + 0.01, EA[3] - 0.01, Y + 1.48, Y + 1.51, 'menuBoardTop');
  // Vinkylen i södra stråkets östra ände, glasdörren mot väster. Elin fyller den före öppning.
  // Stående och 1,45 m hög, så att den som fyller syns över norra disken från spelets kamera.
  const BF = HOUSE.barFridge;
  rectBox(furniture, steelM, BF[0], BF[1], BF[2], BF[3], Y, Y + 1.45, 'barFridge');
  rectBox(furniture, mat('#3a4a4c', 0.15, 0.3, '#9fd0d0', 0.25), BF[0] - 0.015, BF[0], BF[2] + 0.05, BF[3] - 0.05, Y + 0.12, Y + 1.38, 'barFridgeGlass');
  rectBox(furniture, M.brass, BF[0] - 0.03, BF[0] - 0.015, BF[3] - 0.1, BF[3] - 0.07, Y + 0.6, Y + 1.0, 'barFridgeHandle');
  // ORDER 317 — entrén, väntplatsen, köplatserna, mise en place och personalens
  // platser ur wineBarHouse.ts (rummets ram).
  const entrance: Vec2 = [HOUSE_ENTRANCE.local[0], HOUSE_ENTRANCE.local[1]];
  const waitingSpot: Vec2 = [HOUSE_ENTRANCE.waitingSpot.local[0], HOUSE_ENTRANCE.waitingSpot.local[1]];
  const door: Vec2 = [halfW, 0];
  const faceDoor = function (p: Vec2) { return Math.atan2(door[0] - p[0], door[1] - p[1]); };
  const queueSpots: QueueSpot[] = HOUSE_QUEUE.map(function (q) {
    const local: Vec2 = [q.local[0], q.local[1]];
    return { id: q.id, side: q.side as QueueSpot['side'], order: q.order, local: local, facing: q.side === 'inside' ? -Math.PI / 2 : faceDoor(local) };
  });
  const miseSpots: MiseSpot[] = HOUSE_MISE.map(function (m) {
    return { id: m.id, role: m.role, local: [m.local[0], m.local[1]] as Vec2, facing: m.facing, note: m.note };
  });

  // ORDER 271 (montering) flyttade tre stationer efter kameraprovet; ORDER 317
  // tar platserna ur husets möblering (bartendern och sommelieren mitt i sina
  // stråk, diskaren mot kökets södra vägg).
  const UNIFORM_OF: Record<string, string> = {
    bartender: STAFF_UNIFORMS.bartender, sommelier: STAFF_UNIFORMS.sommelier, server: STAFF_UNIFORMS.server,
    cookHot: STAFF_UNIFORMS.kitchen, cookCold: STAFF_UNIFORMS.kitchen, dish: STAFF_UNIFORMS.kitchen,
    host: STAFF_UNIFORMS.host, dj: STAFF_UNIFORMS.dj
  };
  // Bartendern och sommelieren 0,74 m från vinväggens mittlinje, som kameraprovet
  // i ORDER 271 krävde (husets möblering har stråkets mitt, 0,71 m: platinaväggens
  // krön skymde bartenderns kalott från norr).
  const LANE_FROM_RACK = 0.74;
  // Bartendern 0,80 m: platinakrönet skymde kalotten från norr också vid 0,74 m
  // (0,4 m kvar till disken, figurens halva bredd 0,20 m).
  const BARTENDER_FROM_RACK = 0.8;
  const stationLocal = function (st: (typeof HOUSE_STATIONS)[number]): Vec2 {
    if (st.id === 'bartender') return [st.local[0], RACK_Z - BARTENDER_FROM_RACK];
    if (st.id === 'sommelier') return [st.local[0], RACK_Z + LANE_FROM_RACK];
    return [st.local[0], st.local[1]];
  };
  const staffStations: StaffStation[] = HOUSE_STATIONS.map(function (st) {
    return {
      id: st.id, role: st.role, local: stationLocal(st),
      standHeight: st.id === 'dj' ? DJ.platform : 0, facing: st.id === 'dj' ? faceNW : st.facing,
      uniform: UNIFORM_OF[st.id], note: st.note
    };
  });

  const parts: RoomParts = {
    turntable: turntable, roof: roof, walls: walls, wallUpper: wallUpper, interior: interior, bar: bar,
    wineWall: wineWall, shelfTargets: shelfTargets, djTarget: djTarget, flames: flames,
    weekendCandles: weekendCandles, djGlow: M.djGlow,
    glassAnchor: glassAnchor, passAnchor: passAnchor, bottleAnchor: bottleAnchor
  };

  const room: WineBarRoom = {
    group: group, parts: parts, seats: seats, standing: standing, staffStations: staffStations,
    candles: candles, pendants: pendants, entrance: entrance, waitingSpot: waitingSpot,
    queueSpots: queueSpots, miseSpots: miseSpots,
    floorY: Y, capacity: TOTAL_SEATS, width: width, depth: depth, fits: fits, shortfall: shortfall,
    wineWallLevel: startLevel, mood: opts.mood ?? 'tidig',
    dispose: function () {
      materials.forEach(function (m) { m.dispose(); });
      group.removeFromParent();
    }
  };
  (room as any).bottleSlots = bottleSlots;
  setMood(room, room.mood);
  return room;
}

// ---------- Lägen ----------

export function setWineWallLevel(room: WineBarRoom, level: WineWallLevel): void {
  room.wineWallLevel = level;
  room.parts.wineWall.bas.visible = level === 'bas';
  room.parts.wineWall.platina.visible = level === 'platina';
  // Flaskfästet följer väggens östra ände.
  room.parts.bottleAnchor.position.x = WINE_WALL[level].x1 - 0.1;
}

export function setMood(room: WineBarRoom, mood: MoodId): void {
  room.mood = mood;
  const weekend = mood === 'helg';
  room.parts.weekendCandles.forEach(function (c) { c.visible = weekend; });
  room.parts.djGlow.emissiveIntensity = weekend ? 1.4 : 0;
}

/**
 * Tallriken och lågorna. `phase` 0..1 vrider tallriken (skicka 0 när det
 * inte spelas); `flicker` är valfri sekundräkning för lågorna. Allokerar inget.
 */
export function updateWineBarRoom(room: WineBarRoom, phase: number, flicker?: number): void {
  room.parts.turntable.rotation.y = (phase ?? 0) * Math.PI * 2;
  if (flicker === undefined) return;
  const f = room.parts.flames;
  for (let i = 0; i < f.length; i++) {
    const s = 1 + 0.12 * Math.sin(flicker * 9.1 + i * 1.7) + 0.06 * Math.sin(flicker * 23 + i);
    f[i].scale.set(1, s, 1);
  }
}

const _cam = new THREE.Vector3();

/**
 * Kapar väggarna på kamerasidan. Anropas när kameran vridits. En sida kapas
 * när kameran står utanför den med mer än 0,5 m marginal — vid rakt
 * ovanifrån kapas ingen, vid standardvinkeln kapas N och E.
 */
export function updateCutaway(room: WineBarRoom, camera: THREE.Object3D): WallSide[] {
  camera.getWorldPosition(_cam);
  room.group.worldToLocal(_cam);
  const hx = room.width / 2 + 0.5;
  const hz = room.depth / 2 + 0.5;
  const cut: Record<WallSide, boolean> = { E: _cam.x > hx, W: _cam.x < -hx, N: _cam.z > hz, S: _cam.z < -hz };
  const out: WallSide[] = [];
  (['N', 'S', 'E', 'W'] as WallSide[]).forEach(function (s) {
    room.parts.wallUpper[s].visible = !cut[s];
    if (cut[s]) out.push(s);
  });
  return out;
}

// ---------- ORDER 317 — planen för andra moduler ----------

/**
 * Rummets plan i lokal XZ för serviceflödet, regissören och rekvisitan, så
 * att de läser samma mått som rummet ritas med (CLAUDE.md "Mätningar mot det
 * de beskriver") i stället för egna kopior. Baren står inte symmetriskt kring
 * z 0: vinväggens mittlinje är rackZ, och stråkens mitt ligger 0,74 m från den.
 */
export const WINE_BAR_PLAN = {
  bar: BAR,
  rackZ: RACK_Z,
  rackHalf: RACK_T / 2,
  /** Stråkens mitt: mellan vinväggen och diskens insida. */
  runwayNorthZ: (RACK_Z + RACK_T / 2 + BAR.z1 - BAR.depth) / 2,
  runwaySouthZ: (RACK_Z - RACK_T / 2 + BAR.z0 + BAR.depth) / 2,
  lanes: LANES,
  kitchen: KITCHEN,
  pass: { x0: HOUSE.pass[0], x1: HOUSE.pass[1], z: (HOUSE.pass[2] + HOUSE.pass[3]) / 2 },
  /** Korridoren väster om baren: servitörens plats utanför passet. */
  corrX: HOUSE_STATIONS.find(function (s) { return s.id === 'server'; })!.local[0],
  /** Köksdörren i kökets södra halvvägg (wineBarHouse.ts STAFF_PATH_KITCHEN_TO_BAR). */
  kitchenDoor: STAFF_PATH_KITCHEN_TO_BAR.slice(0, 2).map(function (p) { return [p[0], p[1]] as Vec2; }),
  twoTopServeZ: (LANES.southZ + HOUSE.twoTop.z + HOUSE.twoTop.size / 2) / 2,
  wineWallEastX: WINE_WALL.bas.x1,
  dj: DJ
};

/** ORDER 317 — dörren i östra väggen: öppningens halva bredd, och hur långt in och
 *  ut en väg genom dörren går innan den svänger (provspelet: figurerna gick rakt
 *  genom väggen bredvid dörren mellan köplatserna innanför och utanför). */
export const DOOR = { halfGap: 0.7, clear: 0.35, wall: WALL_T };

/**
 * En väg mellan rummet, dörröppningen och trottoaren går längs dörrens axel
 * (z 0): in genom en punkt en bit innanför väggen, ut genom en punkt en bit
 * utanför. `width` är rummets bredd.
 */
export function doorPath(path: Vec2[], width: number): Vec2[] {
  if (path.length < 2) return path;
  const halfW = width / 2;
  const inner = halfW - DOOR.wall;
  const IN: Vec2 = [inner - DOOR.clear, 0], OUT: Vec2 = [halfW + DOOR.clear, 0];
  // Innanför väggen, i dörröppningen (väggens tjocklek) eller utanför.
  const where = (p: Vec2) => (p[0] < inner - 0.05 ? 0 : p[0] > halfW + 0.05 ? 2 : 1);
  const out: Vec2[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const a = where(path[i - 1]), b = where(path[i]);
    if (a === 0 && b >= 1) out.push(IN);
    if (a <= 1 && b === 2) out.push(OUT);
    if (a === 2 && b <= 1) out.push(OUT);
    if (a >= 1 && b === 0) out.push(IN);
    out.push(path[i]);
  }
  return out;
}

// ---------- Gånggrafen ----------

// ORDER 317 — gånggrafens linjer ur wineBarHouse.ts LANES.
const SPINE_X = LANES.spineX;
const NORTH_Z = LANES.northZ;
const SOUTH_Z = LANES.southZ;
// Gången mellan loungebordet och dynorna.
const LOUNGE_INNER_Z = LANES.loungeInnerZ;

export function walkPathToSeat(room: WineBarRoom, seatId: string): Vec2[] {
  const seat = room.seats.find(function (s) { return s.id === seatId; });
  if (!seat) return [];
  const p: Vec2[] = [[room.entrance[0], room.entrance[1]], [SPINE_X, 0]];
  if (seat.kind === 'lounge') {
    const cx = LOUNGE_CX[seat.furnitureId === 'loungeATable' ? 0 : 1];
    const endX = seat.local[0] <= cx ? cx - 0.85 : cx + 0.85;
    p.push([SPINE_X, NORTH_Z], [endX, NORTH_Z], [endX, LOUNGE_INNER_Z], [seat.local[0], LOUNGE_INNER_Z]);
  } else if (seat.lane === 'north') {
    p.push([SPINE_X, NORTH_Z], [seat.local[0], NORTH_Z]);
  } else {
    p.push([SPINE_X, SOUTH_Z], [seat.local[0], SOUTH_Z]);
  }
  p.push([seat.local[0], seat.local[1]]);
  return p;
}

export function exitPathFromSeat(room: WineBarRoom, seatId: string): Vec2[] {
  const back = walkPathToSeat(room, seatId).slice().reverse();
  back.push([room.waitingSpot[0], room.waitingSpot[1]]);
  return back;
}

/** Personalens väg kök → bar: köksdörren, sedan barens öppna västra ände. */
export function staffPathKitchenToBar(): Vec2[] {
  return STAFF_PATH_KITCHEN_TO_BAR.map(function (p) { return [p[0], p[1]] as Vec2; });
}

// ---------- Mätning ----------

export function measureWineBarRoom(room: WineBarRoom) {
  room.group.updateWorldMatrix(true, true);
  const bb = new THREE.Box3().setFromObject(room.parts.interior);
  const wall = new THREE.Box3().setFromObject(room.parts.walls);
  const split = { lounge: 0, bar: 0, twotop: 0 };
  room.seats.forEach(function (s) { (split as any)[s.kind]++; });
  const wwSpec = WINE_WALL[room.wineWallLevel];
  let djArea = 0;
  room.parts.interior.traverse(function (o) {
    if (o.name === 'djPlatform') {
      const t = new THREE.Box3().setFromObject(o);
      djArea = (t.max.x - t.min.x) * (t.max.z - t.min.z);
    }
  });
  return {
    footprint: [bb.max.x - bb.min.x, bb.max.z - bb.min.z] as Vec2,
    height: wall.max.y - wall.min.y,
    seatCount: room.seats.length,
    standingCount: room.standing.length,
    split: split,
    floorZones: ZONE_FLOORS.length,
    wineWall: {
      level: room.wineWallLevel,
      length: wwSpec.x1 - wwSpec.x0,
      height: wwSpec.height,
      tiers: wwSpec.tiers,
      bottles: (room as any).bottleSlots[room.wineWallLevel]
    },
    runway: (BAR.z1 - BAR.depth) - (RACK_Z + RACK_T / 2),
    djZoneArea: djArea,
    candles: room.candles.length,
    candlesLit: room.candles.filter(function (c) { return room.mood === 'helg' || !c.weekendOnly; }).length
  };
}

function isShown(o: THREE.Object3D | null): boolean {
  while (o) { if (!o.visible) return false; o = o.parent; }
  return true;
}

/**
 * Siktlinjen: barstolarna till vinväggens hyllplan på sin sida, och alla
 * platser till DJ:n. Kroppar ska ligga utanför room.group när provet körs.
 */
export function checkSightLines(room: WineBarRoom) {
  room.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tiers = room.parts.shelfTargets[room.wineWallLevel];
  function clear(node: THREE.Object3D, from: THREE.Vector3, allow: string[]): boolean {
    node.getWorldPosition(target);
    dir.copy(target).sub(from);
    const dist = dir.length();
    ray.set(from, dir.normalize());
    ray.far = dist - 0.12;
    const hits = ray.intersectObject(room.group, true);
    for (let h = 0; h < hits.length; h++) {
      const o = hits[h].object;
      if (!isShown(o) || o.name.indexOf('floor') === 0) continue;
      if (allow.some(function (a) { return o.name.indexOf(a) === 0; })) continue;
      return false;
    }
    return true;
  }
  const perSeat: { seatId: string; tiers: number; of: number; dj: boolean }[] = [];
  let barAll = 0;
  let seeDj = 0;
  let seeWall = 0;
  room.seats.forEach(function (s) {
    origin.set(s.local[0], eyeHeightForSeat(s), s.local[1]);
    room.group.localToWorld(origin);
    const side = s.local[1] > RACK_Z ? 'N' : 'S';
    const mine = tiers.filter(function (t) { return t.name.slice(-1) === side; });
    let vis = 0;
    mine.forEach(function (t) { if (clear(t, origin, ['bottles_', 'shelfTier_', 'wineWall'])) vis++; });
    const d = clear(room.parts.djTarget, origin, ['candle']);
    if (s.kind === 'bar' && vis === mine.length) barAll++;
    if (vis > 0) seeWall++;
    if (d) seeDj++;
    perSeat.push({ seatId: s.id, tiers: vis, of: mine.length, dj: d });
  });
  return { perSeat: perSeat, barSeatsSeeingAllTiers: barAll, seatsSeeingWineWall: seeWall, seatsSeeingDj: seeDj };
}

/**
 * Specens kontroll före leverans, som kod: från den kamera som skickas, syns
 * varje plats och varje station? Mäter mot huvudhöjd (sittande: sitsen +
 * 0,95 m, stående: 1,55 m) — det är kalotten kameran läser. `extra` är
 * hinder utanför rummet, t.ex. grannhusen. Kör updateCutaway först.
 */
export function checkCameraView(room: WineBarRoom, camera: THREE.Object3D, extra?: THREE.Object3D[]) {
  room.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const dir = new THREE.Vector3();
  camera.getWorldPosition(from);
  const targets = [room.group as THREE.Object3D].concat(extra ?? []);
  function test(local: Vec3): string | null {
    to.set(local[0], local[1], local[2]);
    room.group.localToWorld(to);
    dir.copy(to).sub(from);
    const dist = dir.length();
    ray.set(from, dir.normalize());
    ray.far = dist - 0.25;
    const hits = ray.intersectObjects(targets, true);
    for (let h = 0; h < hits.length; h++) {
      const o = hits[h].object;
      if (!isShown(o)) continue;
      if (/^(floor|candle|pendantCord)/.test(o.name)) continue;
      return o.name || 'namnlös';
    }
    return null;
  }
  const blocked: { id: string; by: string }[] = [];
  let seatsSeen = 0;
  room.seats.forEach(function (s) {
    const by = test([s.local[0], s.seatSurfaceY + 0.95, s.local[1]]);
    if (by) blocked.push({ id: s.id, by: by }); else seatsSeen++;
  });
  let stationsSeen = 0;
  room.staffStations.forEach(function (s) {
    const by = test([s.local[0], PLINTH_M + s.standHeight + 1.55, s.local[1]]);
    if (by) blocked.push({ id: s.id, by: by }); else stationsSeen++;
  });
  const e = test([room.entrance[0], PLINTH_M + 1.55, room.entrance[1]]);
  if (e) blocked.push({ id: 'entrance', by: e });
  return { seatsSeen: seatsSeen, seats: room.seats.length, stationsSeen: stationsSeen,
           stations: room.staffStations.length, entranceSeen: !e, blocked: blocked };
}

/**
 * Planritningens underlag: varje namngiven möbel och zon som rektangel i
 * lokal XZ, läst ur samma meshar som renderas. Rektanglar är AABB — DJ-pulten
 * står 45° vriden och ritas därför större än den är.
 */
export function planRects(room: WineBarRoom): { name: string; x0: number; x1: number; z0: number; z1: number; top: number }[] {
  room.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  const out: { name: string; x0: number; x1: number; z0: number; z1: number; top: number }[] = [];
  const b = new THREE.Box3();
  room.parts.interior.traverse(function (o: any) {
    if (!o.isMesh || o.isInstancedMesh || !isShown(o)) return;
    if (/^(candle|pendant|platter|bottle)/.test(o.name)) return;
    b.setFromObject(o).applyMatrix4(inv);
    out.push({ name: o.name, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, top: b.max.y });
  });
  return out;
}

export function resolveWorldPositions(room: WineBarRoom) {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function w(p: Vec2): Vec2 { v.set(p[0], 0, p[1]); room.group.localToWorld(v); return [v.x, v.z]; }
  return {
    seats: room.seats.map(function (s) { return w(s.local); }),
    standing: room.standing.map(function (s) { return w(s.local); }),
    staffStations: room.staffStations.map(function (s) { return w(s.local); }),
    entrance: w(room.entrance),
    waitingSpot: w(room.waitingSpot),
    queueSpots: room.queueSpots.map(function (s) { return w(s.local); }),
    miseSpots: room.miseSpots.map(function (s) { return w(s.local); })
  };
}

// ---------- ORDER 271 — tillägg vid montering ----------

/**
 * Hinder för navigeringen (businessRoom.ts läser `getObstacles(raw)`, ORDER
 * 221 §2.1). Läst ur samma meshar som renderas, via planRects(): allt i
 * interiören som når över 0,30 m, utom golvzonerna och sittmöblerna (platserna
 * undantas ändå av nav-grafen). Förra filen hade en handskriven lista; den
 * här följer geometrin om Design flyttar en möbel.
 */
export function getObstacles(room: WineBarRoom): { id: string; local: Vec2; halfW: number; halfD: number }[] {
  return planRects(room)
    .filter(function (r) { return r.top > PLINTH_M + 0.3 && !/^(floor|stool|rug|mat)|Cushion/.test(r.name); })
    .map(function (r) {
      return { id: r.name, local: [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2] as Vec2, halfW: (r.x1 - r.x0) / 2, halfD: (r.z1 - r.z0) / 2 };
    });
}
