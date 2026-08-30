// innRoom — gästgiveriet: hundra platser, åttio gästrum.
//
// SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten).
// Formmall: brewpubRoom.ts → wineBarRoom.ts → den här filen.
// Ersätter värdshuset, som är beslutat i R4 men aldrig byggt.
//
// Kontrakt (oförändrat sedan ölkrogen):
//   • Ren three.js. Inga externa beroenden, ingen skinning, inga
//     loaders, inga binära assets.
//   • Byggs imperativt EN gång (createInnRoom). Inget skapas i
//     renderloopen.
//   • Ingen egen klocka. Det enda som rör sig (grillspettet i köket)
//     drivs av en fas anroparen skickar in.
//   • Ingen simuleringslogik. Rummet är geometri.
//
// ── Formen: huvudbyggnad plus två längor runt en gård ──────────────
// Valt framför huvudbyggnad med flyglar, av ett kameraskäl och inte
// ett stilskäl. Gästgiveriets signatur är rörelsen mellan gästrum och
// matsal på morgonen. Ligger rummen på ett plan över matsalen sker
// den rörelsen i ett trapphus, inomhus, och kameran ser ingenting.
// Ligger de i längor korsar den gården, och gården är den yta en hög
// lutande kamera läser bäst av allt — ett uterum med tre slutna sidor.
// Det är också hur svenska gästgiverier faktiskt ser ut.
//
// Därav: INGA rum över matsalen. Salen är en hall i full höjd, och
// alla åttio rummen ligger i längorna, tjugo per plan och länga.
// Varje länga har EN utomhustrappa mot gården vid sin mittpunkt, så
// morgonrörelsen samlas i två punkter i stället för åttio dörrar.
// wingStairs ger sim-lagret de två punkterna.
//
// ── Rummen är volym, inte scen (per brief §3) ──────────────────────
// Åttio rum får väggar, dörrar och volym. Ingen inredning. Det som
// gör dem läsbara uppifrån är kammen: elva skiljeväggar per sida och
// plan, en cell per rum, en mörk dörrplan mot korridoren. Åttio
// sängar med nattduksbord är geometri som aldrig läses.
// checkRoomCount() hävdar att kammen faktiskt gav åttio celler — en
// tidigare leverans passerade som utförd med en platshållare som
// aldrig syntes, och åttio rum är precis den sortens tal man tror på
// utan att räkna.
//
// ── Hundra platser läses som tre märken, inte hundra cylindrar ─────
// Fördelningen är ett läsbarhetsbeslut före ett möbleringsbeslut:
//   4 långbord × 12 = 48   fyra kraftiga streck längs salens djup
//   6 runda × 6     = 36   sex cirklar, ett helt annat märke
//   lilla salen     = 16   ett bord i ett eget rum bakom halvvägg
// Hundra stolar i en jämn matta blir en textur uppifrån. Streck,
// cirklar och ett slutet rum blir tre.
//
// ── Köket är en linje, inte ett kluster ───────────────────────────
// Sex stationer på en axel: kylrum och kall prep i -X-änden vid
// leveransdörren, spislinje, grill, saucier på ö, uppläggning i
// passluckan, disk i +X-änden. Arbetsflödet läses uppifrån som en
// rörelse från leveransdörr till pass, vilket ett kluster av lådor
// inte gör. Kökets gräns mot salen är en halvvägg på 1,5 m av samma
// skäl som lilla salens: en full vägg gömmer arbetsflödet för den
// enda kamera som finns.
//
// ── Koordinater ───────────────────────────────────────────────────
// Origo i huvudbyggnadens mitt, golvplanet y = 0, +Z mot gården.
//   huvudbyggnad  X ∈ [-13,5, 13,5] Z ∈ [-9, 9]    hall i full höjd
//   gården        X ∈ [-13,5, 13,5] Z ∈ [9, 42]    öppen i +Z
//   västra längan X ∈ [-25,7, -13,5] Z ∈ [8, 42]   två plan
//   östra längan  X ∈ [13,5, 25,7]  Z ∈ [8, 42]    två plan
// Anroparen placerar gruppen som Restaurant.tsx:
//   room.group.position.set(centre[0], 0, centre[1]);
//   room.group.rotation.y = -angle;
// Alla mått i meter, alla vinklar i radianer. Kurs (`facing`) är yaw
// i figurens ram: 0 = tittar mot lokal +Z, +PI/2 = mot +X.
//
// ── Fast geometri kontra ändringsbart ─────────────────────────────
// FAST (bär planlösningen):
//   U-formen och gårdens öppning i +Z. Att rummen ligger i längorna
//   och inte över salen. De två trapporna som morgonrörelsens enda
//   punkter. Kammen som rummens läsbarhet. Kökets linje. Halvväggarna
//   på 1,5 m. Tre golvzoner — inte fler.
// ÄNDRINGSBART (parametrar):
//   längornas längd och rummodulen (3,4 m) — antalet rum följer och
//   checkRoomCount() fångar om det inte längre blir åttio.
//   sitsfördelningen inom de hundra. Kökets sex stationer.
//   Huvudbyggnadens mått — understiger de MIN_* returneras
//   `fits: false` med underskottet i meter, i stället för en tyst
//   omtolkad plan.

import * as THREE from 'three';
import { ROLE_COLOUR_VALUES } from './staffColour';

// #region types

export type Vec2 = [number, number];

export type SeatKind = 'long' | 'round' | 'sal';

export type LaneId = 'spine' | 'longAisle' | 'roundAisle' | 'salLane';

// ORDER 153 — döpt om från lokal `StaffRole` till `StationRole` per
// Vision Owner-beslut 2026-08-30. En station är en plats, inte en
// anställning: en sim-kock kan stå vid `kitchen`-stationen utan att
// bli en ny rolltyp. Sim-lagrets `StaffRole` (types.ts) förblir de
// fyra `värd|servitör|kock|lärling`; kartan över den lokala listan är
// stationsindelningen för RUMMET (mappningen sim→station hör hemma i
// businessRoom-kontraktet — se ORDER 152 §2 + kommande ORDER 154).
export type StationRole = 'kitchen' | 'hallService' | 'host' | 'breakfast' | 'rooms';

export interface SeatSpec {
  /** Stabilt id, t.ex. 'longB07' eller 'sal12'. */
  id: string;
  kind: SeatKind;
  /** Sim-lagrets platta seatIndex, 0..99. Ordningen är
   *  interiorLayout.ts konvention: bordsplatser i bordsordning. */
  seatIndex: number;
  furnitureId: string;
  /** Sitsens mittpunkt i lokal XZ. */
  local: Vec2;
  seatHeight: number;
  /** Kurs så figuren tittar mot bordet. */
  facing: number;
  /** Gånggrafens nod platsen nås ifrån. */
  approach: Vec2;
  /** Korridornoderna mellan stråket och angörningsnoden. Varje plats
   *  bär sin egen väg som data — passagerna är inte underförstådda. */
  via: Vec2[];
  lane: LaneId;
}

export interface GuestRoomSpec {
  /** 'r001'..'r080'. */
  id: string;
  /** 'west' | 'east' */
  wing: string;
  /** 0 = markplan, 1 = övre plan. */
  storey: number;
  /** 'outer' = mot omgivningen, 'court' = mot gården. */
  side: string;
  /** Rummets mittpunkt i lokal XZ. */
  local: Vec2;
  /** Golvnivå i lokal y. */
  floorY: number;
  /** Dörrens mittpunkt. Mot korridoren, eller mot loftgången för
   *  övre planets gårdsrum. */
  doorLocal: Vec2;
  /** true när dörren går ut på loftgången i stället för korridoren. */
  onGallery: boolean;
  /** Trappan i gården som rummet nås via. */
  stairLocal: Vec2;
  /** Vägen från dörren ut i gården, som data. Samma princip som
   *  SeatSpec.via: rummet bär sin egen väg, ingen grenlogik. */
  exitVia: Vec2[];
  areaM2: number;
}

export interface StaffStation {
  /** 'host' | 'chef' | 'sous' | 'grill' | 'plating' | 'dish' |
   *  'hallA' | 'hallB' | 'salWaiter' | 'breakfast' | 'rooms' */
  id: string;
  /** Vilken uniformsfärg stationen bär. Tio stationer, fem
   *  uniformer — se STAFF_UNIFORMS-noten. */
  role: StationRole;
  local: Vec2;
  facing: number;
  note: string;
}

export interface RoomParts {
  /** Grillspettet. Enda rörliga delen. */
  rotisserie: THREE.Object3D;
  /** Huvudbyggnadens tak, egen grupp för avståndstoning. */
  roofMain: THREE.Object3D;
  /** Längornas tak, egen grupp. */
  roofWings: THREE.Object3D;
  /** Huvudbyggnadens väggar. */
  walls: THREE.Object3D;
  /** Salens inredning — tonas in när kameran närmar sig. */
  interior: THREE.Object3D;
  /** Längornas övre plan, så det kan döljas för att visa markplanet. */
  wingUpper: THREE.Object3D;
  /** Längornas markplan. */
  wingGround: THREE.Object3D;
  /** Gårdens yta. */
  courtyard: THREE.Object3D;
  /** Fäste vid passluckan där en tallriksindikator kan ankras. */
  passAnchor: THREE.Object3D;
  /** Fäste vid frukostbuffén. */
  buffetAnchor: THREE.Object3D;
  /** Fäste vid utomhusbarens disk. */
  outBarAnchor: THREE.Object3D;
}

export interface InnOptions {
  /** Huvudbyggnadens bredd. Default 27. */
  mainWidth?: number;
  /** Huvudbyggnadens djup. Default 18. */
  mainDepth?: number;
  /** Salens takhöjd. Default 5,0 — den är en hall. */
  hallHeight?: number;
  /** Längornas längd. Default 34 (tio rummoduler à 3,4 m). */
  wingLength?: number;
  /** Längornas djup. Default 12,2 (5,0 + 2,2 korridor + 5,0). */
  wingDepth?: number;
  /** Rummodulens bredd. Default 3,4. */
  roomModule?: number;
  /** Våningshöjd i längorna. Default 2,9. */
  storeyHeight?: number;
}

export interface InnRoom {
  group: THREE.Group;
  parts: RoomParts;
  /** Hundra platser, i seatIndex-ordning. */
  seats: SeatSpec[];
  /** Åttio gästrum. Volym och dörr, ingen inredning. */
  guestRooms: GuestRoomSpec[];
  staffStations: StaffStation[];
  /** Innanför salens dörr mot gården. */
  entrance: Vec2;
  /** Utanför dörren, i gården. */
  waitingSpot: Vec2;
  /** Gårdens öppning mot vägen — dit gäster anländer. */
  courtyardGate: Vec2;
  /** De två trapporna. Morgonrörelsens enda punkter. */
  wingStairs: Vec2[];
  /** Leveransdörren i kökets -X-vägg. */
  deliveryDoor: Vec2;
  /** Hela anläggningens utbredning [bredd, djup]. */
  footprint: Vec2;
  fits: boolean;
  shortfall: Vec2;
  dispose: () => void;
}

// #endregion types

// ---------- Låsta tal ----------

export const TOTAL_SEATS = 100;
export const TOTAL_GUEST_ROOMS = 80;

/** Under detta går planlösningen inte in. */
export const MIN_MAIN_WIDTH_M = 24.0;
export const MIN_MAIN_DEPTH_M = 16.0;

const WALL_T = 0.2;
const HALF_WALL_H = 1.5;         // kök och lilla salen mot hallen
const KITCHEN_EDGE_Z = -1.4;     // kökets och salens gräns mot hallen
const KITCHEN_EDGE_X = -2.6;     // kökets gräns mot frukostfickan
const SAL_EDGE_X = 2.6;          // lilla salens gräns mot frukostfickan
const TABLE_TOP_Y = 0.72;        // Restaurant.tsx
const TABLE_TOP_T = 0.06;
const CHAIR_HEIGHT = 0.45;
const PLINTH_M = 0.11;           // sockelns tjocklek, golvet ligger här
// Möbleringen är lagd så att VARJE gång blir minst 1,0 m fri bredd mot
// en kropp på 0,46 m. Måtten nedan är därför inte fria: långbordens
// 3,0 m-delning, de rundas 4,24 m-delning (3,14 stolsring + 1,10 gång)
// och avståndet mellan de två grupperna följer alla av det villkoret.
// En första version hade 3,2 m och 3,3 m, och mätningen visade
// gångar på 0,12 m — tvärstråket låg då i stolsraden.
const LONG_TABLE_X = [-10.8, -7.8, -4.8, -1.8];
const LONG_TABLE_Z = 2.7;
const LONG_TABLE_LEN = 6.4;
const LONG_SEAT_DZ = [-2.25, -1.35, -0.45, 0.45, 1.35, 2.25];
const LONG_SEAT_DX = 0.75;
const LONG_AISLE_DX = 1.5;
const ROUND_X = [1.85, 6.09, 10.33];
const ROUND_Z = [1.4, 5.64];
const ROUND_R = 0.85;
const ROUND_SEAT_R = 1.35;
const ROUND_APPROACH_R = 2.15;
/**
 * De fyra nord–sydliga gångarna i de rundas del. Varje värde är
 * mittlinjen i luckan mellan två stolsringar (radie 1,57 m) — eller
 * mellan en stolsring och långbordets sista stolsrad respektive
 * väggen. Att sätta dem på gissning gav en gång på 0,12 m: den
 * västligaste låg 1,12 m från en ringmitt, alltså inne i stolarna.
 */
const ROUND_LANES = [-0.28, 3.97, 8.21, 12.60];
const SAL_TABLE = [7.95, -5.1];
const SAL_TABLE_LEN = 6.0;
const SAL_SEAT_DX = [-2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7];
const SAL_SEAT_DZ = 0.85;
/** Halvväggens öppning in till lilla salen, och gången bakom bordet. */
const SAL_DOOR_X = 3.97;
const SAL_DOOR_W = 1.1;
const SAL_LANE_Z = -2.6;
const SAL_BACK_LANE_Z = -6.8;
const SAL_EAST_LANE_X = 12.6;
const COURT_DEPTH = 33;          // gårdens djup
// Gårdens innehåll. Grusstråket i mitten (X ±3) hålls fritt hela
// vägen från grinden till salens dörr — allt annat ligger vid sidan.
const LAWN = { x0: -12.6, x1: -4.0, z0: 16.5, z1: 31.5 };
// Boulebanan har verkliga mått: 15 × 4 m, lagd längs gårdens djup.
// En kvadratisk grusfläck läser inte som bana — proportionen gör det.
const BOULE = { x0: 5.0, x1: 9.0, z0: 16.0, z1: 31.0 };
const OUTBAR_Z = 11.9;
const OUTBAR_X = 8.0;
const OUTBAR_LEN = 6.2;
/** Träden i gården: [x, z, krondiameter]. */
const TREES: number[][] = [
  [-9.8, 20.4, 3.4], [-6.6, 25.6, 2.8], [-10.4, 29.4, 3.0],
  [-11.6, 39.6, 3.2], [11.6, 39.6, 3.2], [11.4, 24.6, 2.9], [11.4, 30.2, 2.6]
];
/** Loftgångens djup ut i gården, övre plan. */
const LOFT_DEPTH = 1.8;

/** Ögonhöjd = sockel + sitshöjd + 0,84 m. Samma härledning som
 *  wineBarRoom.ts: figuren är 1,70 m, poseSeated sänker höften
 *  0,41 m, och 1,29 − 0,45 = 0,84 är ögat över sitsen. */
export const EYE_ABOVE_SEAT_M = 0.84;
export const EYE_STANDING_M = 1.66;

export function eyeHeightForSeat(seat: SeatSpec): number {
  return PLINTH_M + seat.seatHeight + EYE_ABOVE_SEAT_M;
}

// ---------- Paletten mot golvet ----------
//
// silhouetteContrast.ts (ORDER 123 §5, zonmedvetet i ORDER 127 §3.1):
//   MIN_FLOOR_CONTRAST_RATIO 1.8, MAX 3.6,
//   MIN_ROLE_DISTINCTION_DELTA_E 12.
//
// RÄTT REFERENS DEN HÄR GÅNGEN. ORDER 123 kalibrerade mot
// FLOOR_COLOUR '#a89577', vilket är skyltblocket ovanför entrén i
// Restaurant.tsx och inte interiörgolvet. ORDER 127 §3.1 rättade det:
// det faktiska golvet är '#a08462', och FLOOR_ZONES_BY_BUSINESS pekar
// dit för restaurant och värdshus. Skillnaden är inte kosmetisk —
// '#a89577' har relativ luminans 0,3115 och '#a08462' har 0,2486, och
// hela figurfönstret flyttar med:
//     mot '#a89577'  L ∈ [0,050, 0,151]
//     mot '#a08462'  L ∈ [0,033, 0,116]
// En palett godkänd mot det gamla värdet kan alltså falla mot det
// riktiga golvet. Vinbarens gästfärger ligger på L ≈ 0,083 och klarar
// båda; de återanvänds därför oförändrade.
//
// FEM GOLVZONER, MEN INOM ETT SPANN PÅ 0,008. Antalet zoner är inte
// problemet — spridningen är det. Vinbarens fem zoner spände 0,065 i
// luminans och krympte figurfönstret märkbart; gästgiveriets fem
// spänner 0,2409–0,2486, alltså 0,008, och fönstret är därför lika
// brett som mot huvudgolvet ensamt (L 0,033–0,112).
//
// Gräsmattan är beviset på att det går. En mättad grön yta i en
// restaurangscen är normalt det som stänger bandet; #64935b är full
// kroma men sitter på L 0,2433, mitt i spannet. Kulören är fri, det är
// bara LJUSHETEN som är låst. Samma resonemang som personalens
// uniformer: separationen hämtas ur hue, aldrig ur ljushet.

/** Huvudgolvet. Samma värde som FLOOR_ZONES_BY_BUSINESS.restaurant. */
export const BASE_FLOOR = '#a08462';

export const ZONE_FLOORS: { id: string; colour: string; note: string }[] = [
  { id: 'hall', colour: BASE_FLOOR, note: 'Salen, lilla salen, frukostfickan och längornas korridorer. Referensen i silhouetteContrast.ts.' },
  { id: 'kitchen', colour: '#9d8362', note: 'Köket. Skurad yta, en aning svalare än salens plank. L 0,2427.' },
  { id: 'courtyard', colour: '#8d8679', note: 'Gårdens grus. Avmättad hue. L 0,2409 — 0,008 från salens golv.' },
  { id: 'lawn', colour: '#64935b', note: 'Gräsmattan väster i gården. Mättad grön men L 0,2433 — inom spannet.' },
  { id: 'boule', colour: '#8f887a', note: 'Boulebanans krossgrus. L 0,2485, i praktiken salens luminans.' }
];

/** Gästernas garment-färger. Oförändrade från wineBarRoom.ts — de
 *  ligger mitt i fönstret även mot det riktiga golvet. */
export const GUEST_GARMENTS = [
  '#52505d', '#5b5045', '#465452', '#5c4d58',
  '#49544a', '#555144', '#554f61', '#5b4f4d'
];

/**
 * TIO STATIONER, FEM UNIFORMER — och det är ett mätbart beslut.
 *
 * "Mycket personal" i briefen är tio hemstationer. Tio uniformsfärger
 * går inte: MIN_ROLE_DISTINCTION_DELTA_E är 12, figurfönstret är
 * L ∈ [0,033, 0,116], och tio färger som alla ska ligga i det fönstret
 * och samtidigt hålla ΔE 12 parvis tvingar minst ett par under bandet.
 * Rollerna kollapsar då till samma silhuett i strategisk kamera —
 * vilket är exakt vad bandet finns för att förhindra.
 *
 * Alltså fem uniformer, och stationerna pekar på dem via
 * StaffStation.role. Spelaren skiljer kök från salsservering från
 * värdfolk från frukost från städ. Att skilja saucier från grillen är
 * inte något den strategiska kameran kan bära, och då ska den inte
 * låtsas göra det.
 *
 * SEPARATIONEN LIGGER I HUE, INTE I LJUSHET. Första uppsättningen var
 * fem avmättade grågröna och gråblå toner; minsta parvisa ΔE blev 8,3
 * mot kravet 12, och det gick inte att rätta genom att ljusa upp eller
 * mörka ner något — figurfönstret är bara 0,079 luminansenheter brett,
 * så all separation måste hämtas ur kroma. Dessa fem har samma
 * luminans som förut men mättad, tydligt skild hue: grön, blå, vinrött,
 * ockra, blågrönt. Bieffekt värd att nämna: de skiljer sig nu också
 * klart från gästernas avmättade gråtoner, vilket gör att personal och
 * gäst inte byter plats i silhuett.
 */
// ORDER 155 — `STAFF_UNIFORMS` borttagen. Personalens färg läses ur
// `ROLE_COLOUR` (staffColour.ts) — den palett riggen faktiskt ritar.
// Silhuett-kontrast- och roll-distinktionscheckarna nedan itererar
// `ROLE_COLOUR_VALUES` (fyra sim-roller, inte fem stations-uniformer).

// ---------- WCAG-mått, samma formel som silhouetteContrast.ts ----------

function chan(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbOf(hex: string): number[] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

export function luminance(hex: string): number {
  const c = rgbOf(hex);
  return 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2]);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function labOf(hex: string): number[] {
  const c = rgbOf(hex);
  const r = chan(c[0]);
  const g = chan(c[1]);
  const b = chan(c[2]);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
  const f = function (t: number): number {
    return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
  };
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE 76 ΔE, samma som silhouetteContrast.deltaE76. */
export function deltaE(a: string, b: string): number {
  const la = labOf(a);
  const lb = labOf(b);
  const dl = la[0] - lb[0];
  const da = la[1] - lb[1];
  const db = la[2] - lb[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

function allFigureColours(): string[] {
  return GUEST_GARMENTS.concat(ROLE_COLOUR_VALUES);
}

/**
 * Prövar varje figurfärg mot varje golvzon. Returnerar de par som
 * faller utanför bandet — tom lista betyder att paletten håller.
 * Samma logik som silhouetteContrast.paletteZoneCheck, men mot den
 * här klassens zoner, som ännu inte finns i FLOOR_ZONES_BY_BUSINESS.
 */
export function checkPaletteAgainstFloors(
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { figure: string; floor: string; zone: string; ratio: number }[] {
  const fails = [];
  const figures = allFigureColours();
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

/** Kontrastintervallet figur↔golvzon, för mätningen i modellen. */
export function paletteContrastRange(): { min: number; max: number } {
  let lo = 99;
  let hi = 0;
  const figures = allFigureColours();
  for (let i = 0; i < figures.length; i++) {
    for (let z = 0; z < ZONE_FLOORS.length; z++) {
      const r = contrast(figures[i], ZONE_FLOORS[z].colour);
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
  }
  return { min: lo, max: hi };
}

/** Minsta parvisa roll-ΔE. Krav 12 (MIN_ROLE_DISTINCTION_DELTA_E).
 *  Post-ORDER 155: mätt över `ROLE_COLOUR` (fyra sim-roller), inte
 *  över fem stations-uniformer — spelaren skiljer sim-roller åt, inte
 *  stations-ids. */
export function minRoleDeltaE(): number {
  let lo = 999;
  for (let i = 0; i < ROLE_COLOUR_VALUES.length; i++) {
    for (let j = i + 1; j < ROLE_COLOUR_VALUES.length; j++) {
      const d = deltaE(ROLE_COLOUR_VALUES[i], ROLE_COLOUR_VALUES[j]);
      if (d < lo) lo = d;
    }
  }
  return lo;
}

/**
 * FLAGS — det planlösningen inte kan avgöra själv.
 * Presentationslagret fattar inga simuleringsbeslut.
 */
export const FLAGS = {
  businessClass:
    "BusinessClass har 'värdshus' men ingen 'gästgiveri'. Beslutet " +
    'att gästgiveriet ersätter värdshuset togs 2026-08-29; koden vet ' +
    'det inte. capacityFor måste bli 100 (i dag TOTAL_SEATS + 6 = 22) ' +
    'och hasOvernight finns redan men bär ingen rumsmodell. ' +
    'Förutsättning för monteringen, inte en del av leveransen.',
  overnight:
    'Åttio rum utan tillstånd för vem som bor i dem är geometri. ' +
    'Simuleringen har hasOvernight och stayingOvernight-vägen, men ' +
    'ingen gäst bär rumsnummer, ingen vet hur många nätter, och ' +
    'ingenting kopplar en gäst till en GuestRoomSpec. guestRooms[] ' +
    'är alltså en tilldelningsbar lista som ingen ännu tilldelar. ' +
    'Det sägs här i stället för att uppfinnas.',
  breakfastPass:
    'Frukostfickan är byggd som egen yta i salens -Z-del, med den ' +
    'uttryckliga tanken att den är stängd vid middagen. Men om ' +
    'frukosten är ett eget pass är oklart i koden: dygnsstrukturen ' +
    'är beslutad i R4 och reducern läser hasOvernight vid ' +
    'day-rollover, men det finns ingen servicefas som heter frukost ' +
    'och ingen kapacitet skild från middagens. Geometrin bär båda ' +
    'tolkningarna; valet hör i sim-lagret.',
  morningMovement:
    'walkPathFromRoom() ger vägen rum → korridor → trappa → gård → ' +
    'salens dörr. Rörelsen är verksamhetens signatur och därför ' +
    'levererad som funktion. Men vad som utlöser den — en gäst som ' +
    'vaknar, ett klockslag, ett frukostpass — finns inte. Anroparen ' +
    'har vägen; tillståndet som säger när den går saknas.',
  housekeeping:
    'Rumsstädning och personal mellan planen kräver tillstånd som ' +
    'inte finns: inget rum har ett smutsigt/rent-tillstånd, och ' +
    'staffTasks känner inte till våningsplan. Stationen rooms finns ' +
    'som hemstation vid västra trappan; uppgiften finns inte.',
  duplicatedPaletteCode:
    'checkPaletteAgainstFloors() och WCAG-formlerna finns nu i tre ' +
    'rumsfiler — ölkrogen, vinbaren, gästgiveriet — som identiska ' +
    'kopior. Ändras MIN/MAX i silhouetteContrast.ts följer kopiorna ' +
    'inte med, och tre rum passerar tyst mot ett band som inte längre ' +
    'gäller. silhouetteContrast.zones.ts levereras separat med ' +
    'FLOOR_ZONES_BY_BUSINESS-poster för alla tre klasserna och en ' +
    'generisk paletteZoneCheck(business, colours). Efter merge ska ' +
    'palettkoden här nedan tas bort och importeras därifrån.',
  floorZoneRegistry:
    "FLOOR_ZONES_BY_BUSINESS har ingen 'gästgiveri'-nyckel. De fem " +
    'zonerna här måste in där innan paletten kan hävdas i test. checkPaletteAgainstFloors() ' +
    'räknar bandet lokalt så leveransen kan mätas nu, men registret ' +
    'är den riktiga hemvisten. Notera också att värdshus-nyckeln i ' +
    'dag pekar på restaurangens stub-golv; ersätts värdshuset av ' +
    'gästgiveriet ska den nyckeln repekas eller tas bort.',
  site:
    'Anläggningen mäter 51,9 × 51,5 m i vyn. Spelarens byggnad är en ' +
    'OSM-polygon ' +
    'på 11,8 × 15,6 m (w869907975) och rymmer den inte. Gästgiveriet ' +
    'behöver en egen tomt i world-datan — vilken polygon, och var i ' +
    'byn — och det är ett världsdatabeslut, inte ett geometribeslut. ' +
    'Rummet byggs därför i sin egen lokala ram och kan placeras var ' +
    'som helst; det säger inte var.',
  outdoorBarSeason:
    'Utomhusbaren är byggd men vet inte när den är öppen. Simuleringen ' +
    'har varken årstid, väder eller utomhustemperatur, och en utebar i ' +
    'februari är inte samma sak som en i juli. Geometrin står kvar året ' +
    'om; om den ska bemannas eller inte kräver ett tillstånd som inte ' +
    'finns. Samma sak för dess kapacitet: den har ingen. Gäster kan ' +
    'stå vid disken, men en stående gäst har inget tillstånd — precis ' +
    'som ståplatserna i ölkrogen och vinbaren.',
  boulePlay:
    'Boulebanan är en inramad grusrektangel, 8,0 × 5,5 m. Att någon ' +
    'SPELAR på den kräver en aktivitet gästen kan befinna sig i, och ' +
    'GuestState har bara bordsvägen (arriving → waiting → seated → ...). ' +
    'Banan finns som yta och som plats att stå på; spelet finns inte. ' +
    'Uppfinner det inte här.',
  kitchenStations:
    'Sex stationer är geometri. Vilken station en given rätt använder ' +
    'kräver en meny-/rättmodell som inte finns — samma flagga som ' +
    'ölkrogen och vinbaren, nu med fler lådor att inte veta något om.'
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

function dome(r: number, seg: number): THREE.BufferGeometry {
  const key = 'd' + r.toFixed(3) + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg / 2)), 0, Math.PI * 2, 0, Math.PI * 0.62);
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

export function disposeInnGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

// Restaurant.tsx-paletten. Ingen av dessa är figurfärger — bandet
// gäller golv mot kropp, inte möbler.
const COLOUR = {
  slab: '#6d6a5f',
  wall: '#8f8b7f',
  wingWall: '#8a8578',
  roof: '#5c5951',
  wingRoof: '#544f47',
  door: '#1a1815',
  window: '#3a3833',
  tableTop: '#8b8477',
  tableLeg: '#4a453d',
  chair: '#b9b3ac',
  counter: '#6b5b47',
  counterTop: '#7d6a52',
  steel: '#b9bcc0',
  kitchen: '#767268',
  hood: '#403c36',
  stair: '#7a746a',
  leaf: '#5c7350',
  rail: '#6f6a60'
};

// ---------- Konstruktion ----------

/**
 * Bygger hela anläggningen en gång. Returnerar gruppen plus de
 * namngivna platser, rum, stationer och fästen monteringskoden
 * behöver — ingen grävning i scengrafen.
 */
export function createInnRoom(options?: InnOptions): InnRoom {
  const opts = options ?? {};
  const mainW = opts.mainWidth ?? 27;
  const mainD = opts.mainDepth ?? 18;
  const hallH = opts.hallHeight ?? 5.0;
  const wingLen = opts.wingLength ?? 34;
  const wingDep = opts.wingDepth ?? 12.2;
  const module = opts.roomModule ?? 3.4;
  const storeyH = opts.storeyHeight ?? 2.9;

  const fits = mainW >= MIN_MAIN_WIDTH_M && mainD >= MIN_MAIN_DEPTH_M;
  const shortfall: Vec2 = [
    Math.max(0, MIN_MAIN_WIDTH_M - mainW),
    Math.max(0, MIN_MAIN_DEPTH_M - mainD)
  ];

  const halfW = mainW / 2;
  const halfD = mainD / 2;
  const inX = halfW - WALL_T;
  const inZ = halfD - WALL_T;
  const courtZ0 = halfD;
  const courtZ1 = halfD + COURT_DEPTH;
  const wingZ0 = halfD - 1;
  const wingZ1 = wingZ0 + wingLen;

  const group = new THREE.Group();
  group.name = 'innRoom';

  const materials: THREE.Material[] = [];
  function mat(colour: string, rough: number, metal: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
    materials.push(m);
    return m;
  }
  function basicMat(colour: string): THREE.MeshBasicMaterial {
    const m = new THREE.MeshBasicMaterial({ color: colour });
    materials.push(m);
    return m;
  }

  const matSlab = mat(COLOUR.slab, 0.9, 0);
  const matWall = mat(COLOUR.wall, 0.9, 0);
  const matWingWall = mat(COLOUR.wingWall, 0.9, 0);
  const matRoof = mat(COLOUR.roof, 0.9, 0);
  const matWingRoof = mat(COLOUR.wingRoof, 0.9, 0);
  const matTableTop = mat(COLOUR.tableTop, 0.7, 0);
  const matTableLeg = mat(COLOUR.tableLeg, 0.9, 0);
  const matChair = mat(COLOUR.chair, 0.9, 0);
  const matCounter = mat(COLOUR.counter, 0.85, 0);
  const matCounterTop = mat(COLOUR.counterTop, 0.6, 0);
  const matSteel = mat(COLOUR.steel, 0.35, 0.6);
  const matKitchen = mat(COLOUR.kitchen, 0.9, 0);
  const matHood = mat(COLOUR.hood, 0.85, 0.2);
  const matStair = mat(COLOUR.stair, 0.9, 0);
  const matLeaf = mat(COLOUR.leaf, 0.95, 0);
  const matRail = mat(COLOUR.rail, 0.9, 0);
  const matDoor = basicMat(COLOUR.door);
  const matWindow = basicMat(COLOUR.window);

  const zoneMats: { [k: string]: THREE.MeshStandardMaterial } = {};
  ZONE_FLOORS.forEach(function (z) { zoneMats[z.id] = mat(z.colour, 0.92, 0); });

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
                      w: number, d: number, x: number, z: number, y: number,
                      name: string): THREE.Mesh {
    const m = new THREE.Mesh(plane(w, d), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.name = name;
    parent.add(m);
    return m;
  }

  // ── Huvudbyggnadens skal ──────────────────────────────────────
  put(group, box(mainW + 0.3, 0.1, mainD + 0.3), matSlab, 0, 0.05, 0, 'mainSlab');

  const walls = new THREE.Group();
  walls.name = 'walls';
  group.add(walls);
  const wy = hallH / 2 + PLINTH_M;
  put(walls, box(WALL_T, hallH, mainD), matWall, -halfW + WALL_T / 2, wy, 0, 'wallW');
  // Leveransdörren är ett mörkt plan i väggen, som i Restaurant.tsx.
  put(walls, box(WALL_T, hallH, mainD), matWall, halfW - WALL_T / 2, wy, 0, 'wallE');
  put(walls, box(mainW, hallH, WALL_T), matWall, 0, wy, -halfD + WALL_T / 2, 'wallS');
  // Gårdsväggen: två segment med entrédörren emellan.
  const doorGap = 2.0;
  const segW = (mainW - doorGap) / 2;
  put(walls, box(segW, hallH, WALL_T), matWall, -(doorGap + segW) / 2, wy, halfD - WALL_T / 2, 'wallNa');
  put(walls, box(segW, hallH, WALL_T), matWall, (doorGap + segW) / 2, wy, halfD - WALL_T / 2, 'wallNb');
  // Fönsterband i gårdsväggen — läses som fasadrytm på avstånd.
  put(walls, box(segW - 1.2, 1.1, 0.08), matWindow, -(doorGap + segW) / 2, 2.3, halfD - 0.02, 'windowNa');
  put(walls, box(segW - 1.2, 1.1, 0.08), matWindow, (doorGap + segW) / 2, 2.3, halfD - 0.02, 'windowNb');

  const roofMain = new THREE.Group();
  roofMain.name = 'roofMain';
  group.add(roofMain);
  put(roofMain, box(mainW + 0.5, 0.35, mainD + 0.5), matRoof, 0, hallH + 0.3, 0, 'roofMainSlab');
  put(roofMain, box(4.0, 0.7, 0.25), matCounterTop, 0, hallH + 0.85, halfD + 0.2, 'signBlock');

  const entrance: Vec2 = [0, inZ - 0.6];
  const waitingSpot: Vec2 = [0, courtZ0 + 2.5];
  const courtyardGate: Vec2 = [0, courtZ1 + 0.5];
  const deliveryDoor: Vec2 = [-halfW - 0.6, -6.5];

  const door = new THREE.Mesh(plane(doorGap - 0.2, 2.4), matDoor);
  door.position.set(0, 1.2 + PLINTH_M, halfD - 0.05);
  door.name = 'hallDoor';
  group.add(door);
  const dDoor = new THREE.Mesh(plane(1.4, 2.3), matDoor);
  dDoor.position.set(-halfW + 0.05, 1.15 + PLINTH_M, -6.5);
  dDoor.rotation.y = -Math.PI / 2;
  dDoor.name = 'deliveryDoor';
  group.add(dDoor);

  // ── Gården ────────────────────────────────────────────────────
  const courtyard = new THREE.Group();
  courtyard.name = 'courtyard';
  group.add(courtyard);
  floorPlate(courtyard, zoneMats.courtyard, mainW, COURT_DEPTH,
             0, (courtZ0 + courtZ1) / 2, 0.02, 'floorCourtyard');
  // Gräsmattan väster, boulebanan öster. Båda ligger utanför
  // grusstråket i mitten, som är den enda väg som måste vara fri.
  floorPlate(courtyard, zoneMats.lawn, LAWN.x1 - LAWN.x0, LAWN.z1 - LAWN.z0,
             (LAWN.x0 + LAWN.x1) / 2, (LAWN.z0 + LAWN.z1) / 2, 0.03, 'floorLawn');
  floorPlate(courtyard, zoneMats.boule, BOULE.x1 - BOULE.x0, BOULE.z1 - BOULE.z0,
             (BOULE.x0 + BOULE.x1) / 2, (BOULE.z0 + BOULE.z1) / 2, 0.03, 'floorBoule');
  // Boulebanans sarg: 0,12 m. Läses som en tunn ram uppifrån, vilket
  // är exakt vad en boulebana ÄR i en hög kamera — en inramad rektangel.
  const bcx = (BOULE.x0 + BOULE.x1) / 2;
  const bcz = (BOULE.z0 + BOULE.z1) / 2;
  const bw = BOULE.x1 - BOULE.x0;
  const bd = BOULE.z1 - BOULE.z0;
  put(courtyard, box(bw + 0.24, 0.12, 0.12), matStair, bcx, 0.06, BOULE.z0, 'bouleKerbS');
  put(courtyard, box(bw + 0.24, 0.12, 0.12), matStair, bcx, 0.06, BOULE.z1, 'bouleKerbN');
  put(courtyard, box(0.12, 0.12, bd), matStair, BOULE.x0, 0.06, bcz, 'bouleKerbW');
  put(courtyard, box(0.12, 0.12, bd), matStair, BOULE.x1, 0.06, bcz, 'bouleKerbE');

  // Utomhusbaren, öster om salens dörr. Disken är 1,10 m som inne;
  // taket är en fristående pergola på 2,4 m så kameran ser under den.
  const outbar = new THREE.Group();
  outbar.name = 'outdoorBar';
  courtyard.add(outbar);
  put(outbar, box(OUTBAR_LEN, 1.1, 0.7), matCounter, OUTBAR_X, 0.55, OUTBAR_Z, 'outBarCounter');
  put(outbar, box(OUTBAR_LEN + 0.14, 0.05, 0.84), matCounterTop, OUTBAR_X, 1.125, OUTBAR_Z, 'outBarTop');
  put(outbar, box(OUTBAR_LEN + 0.6, 0.12, 2.6), matWingRoof, OUTBAR_X, 2.4, OUTBAR_Z + 0.5, 'outBarPergola');
  for (let i = 0; i < 4; i++) {
    const px = OUTBAR_X - OUTBAR_LEN / 2 - 0.2 + i * ((OUTBAR_LEN + 0.4) / 3);
    put(outbar, cyl(0.07, 2.34, 6), matWingRoof, px, 1.17, OUTBAR_Z + 1.7, 'outBarPost' + i);
  }
  const outBarAnchor = new THREE.Object3D();
  outBarAnchor.name = 'outBarAnchor';
  outBarAnchor.position.set(OUTBAR_X, 1.18, OUTBAR_Z);
  outbar.add(outBarAnchor);

  // Träden. Stam plus två tillplattade klot — kronan är det enda en
  // hög kamera ser av ett träd, så den bär hela formen.
  for (let i = 0; i < TREES.length; i++) {
    const T = TREES[i];
    const r = T[2] / 2;
    put(courtyard, cyl(0.16, 2.2, 7), matTableLeg, T[0], 1.1, T[1], 'treeTrunk' + i);
    const c1 = put(courtyard, dome(r, 12), matLeaf, T[0], 2.15, T[1], 'treeCanopy' + i);
    c1.scale.y = 0.72;
    const c2 = put(courtyard, dome(r * 0.72, 10), matLeaf, T[0] + r * 0.18, 2.75, T[1] - r * 0.14, 'treeCanopyTop' + i);
    c2.scale.y = 0.62;
  }

  // Grindstolpar i gårdens öppning — märker mynningen uppifrån.
  put(courtyard, box(0.5, 2.6, 0.5), matStair, -halfW + 0.6, 1.3, courtZ1, 'gatePostW');
  put(courtyard, box(0.5, 2.6, 0.5), matStair, halfW - 0.6, 1.3, courtZ1, 'gatePostE');

  // ── Salens inredning ──────────────────────────────────────────
  const interior = new THREE.Group();
  interior.name = 'interior';
  group.add(interior);

  floorPlate(interior, zoneMats.hall, inX * 2, inZ * 2, 0, 0, PLINTH_M, 'floorHall');
  floorPlate(interior, zoneMats.kitchen, KITCHEN_EDGE_X + inX, inZ + KITCHEN_EDGE_Z,
             -inX + (KITCHEN_EDGE_X + inX) / 2, -inZ + (inZ + KITCHEN_EDGE_Z) / 2,
             PLINTH_M + 0.002, 'floorKitchen');

  // Halvväggar: kök och lilla salen mot hallen. 1,5 m — kameran ser
  // över dem, spelaren läser gränsen.
  const kw = KITCHEN_EDGE_X + inX;
  put(interior, box(kw, HALF_WALL_H, 0.15), matWall,
      -inX + kw / 2, HALF_WALL_H / 2 + PLINTH_M, KITCHEN_EDGE_Z, 'kitchenHalfWall');
  // Två segment med öppningen mitt för salsgången (SAL_DOOR_X).
  const openA = SAL_DOOR_X - SAL_DOOR_W / 2;
  const openB = SAL_DOOR_X + SAL_DOOR_W / 2;
  put(interior, box(openA - SAL_EDGE_X, HALF_WALL_H, 0.15), matWall,
      (SAL_EDGE_X + openA) / 2, HALF_WALL_H / 2 + PLINTH_M, KITCHEN_EDGE_Z, 'salHalfWallA');
  put(interior, box(inX - openB, HALF_WALL_H, 0.15), matWall,
      (openB + inX) / 2, HALF_WALL_H / 2 + PLINTH_M, KITCHEN_EDGE_Z, 'salHalfWallB');
  put(interior, box(0.15, HALF_WALL_H, inZ + KITCHEN_EDGE_Z), matWall,
      SAL_EDGE_X, HALF_WALL_H / 2 + PLINTH_M, -inZ + (inZ + KITCHEN_EDGE_Z) / 2, 'salSideWall');

  // ── Köket som linje ───────────────────────────────────────────
  const kitchen = new THREE.Group();
  kitchen.name = 'kitchen';
  interior.add(kitchen);
  const ky = 0.45 + PLINTH_M;
  put(kitchen, box(2.2, 0.9, 1.0), matKitchen, -11.6, ky, -7.9, 'stationColdPrep');
  put(kitchen, box(2.6, 0.9, 1.1), matKitchen, -8.4, ky, -7.85, 'stationRange');
  put(kitchen, box(2.7, 0.35, 1.3), matHood, -8.4, 2.15, -7.85, 'rangeHood');
  put(kitchen, box(1.6, 0.9, 1.1), matKitchen, -5.6, ky, -7.85, 'stationGrill');
  put(kitchen, box(1.7, 0.35, 1.3), matHood, -5.6, 2.15, -7.85, 'grillHood');
  put(kitchen, box(1.8, 0.9, 1.0), matKitchen, -10.0, ky, -5.0, 'stationSaucier');
  put(kitchen, box(1.4, 0.9, 2.0), matKitchen, -3.6, ky, -6.0, 'stationDish');
  // Passluckan sitter i halvväggen. Rätten går över kanten.
  put(kitchen, box(4.8, 1.05, 0.5), matCounter, -7.0, 0.525 + PLINTH_M, KITCHEN_EDGE_Z - 0.6, 'passCounter');
  put(kitchen, box(4.9, 0.05, 0.6), matCounterTop, -7.0, 1.075 + PLINTH_M, KITCHEN_EDGE_Z - 0.6, 'passCounterTop');
  const passAnchor = new THREE.Object3D();
  passAnchor.name = 'passAnchor';
  passAnchor.position.set(-7.0, 1.1 + PLINTH_M, KITCHEN_EDGE_Z - 0.6);
  kitchen.add(passAnchor);

  // Grillspettet — enda rörliga delen, driven av anroparens fas.
  const rotisserie = new THREE.Group();
  rotisserie.name = 'rotisserie';
  rotisserie.position.set(-5.6, 1.15 + PLINTH_M, -7.85);
  kitchen.add(rotisserie);
  const spit = put(rotisserie, cyl(0.035, 1.4, 8), matSteel, 0, 0, 0, 'spitShaft');
  spit.rotation.z = Math.PI / 2;
  put(rotisserie, box(0.34, 0.2, 0.2), matKitchen, -0.35, 0, 0, 'spitLoadA');
  put(rotisserie, box(0.34, 0.2, 0.2), matKitchen, 0.35, 0, 0, 'spitLoadB');

  // ── Frukostfickan ─────────────────────────────────────────────
  const buffet = new THREE.Group();
  buffet.name = 'buffet';
  interior.add(buffet);
  put(buffet, box(4.0, 0.9, 0.8), matCounter, 0, ky, -7.2, 'buffetHot');
  put(buffet, box(4.1, 0.05, 0.9), matCounterTop, 0, 0.925 + PLINTH_M, -7.2, 'buffetHotTop');
  put(buffet, box(4.0, 0.9, 0.8), matCounter, 0, ky, -4.2, 'buffetCold');
  put(buffet, box(4.1, 0.05, 0.9), matCounterTop, 0, 0.925 + PLINTH_M, -4.2, 'buffetColdTop');
  const buffetAnchor = new THREE.Object3D();
  buffetAnchor.name = 'buffetAnchor';
  buffetAnchor.position.set(0, 0.95 + PLINTH_M, -5.7);
  buffet.add(buffetAnchor);

  // ── Möbler och platser ────────────────────────────────────────
  const seats: SeatSpec[] = [];
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  interior.add(furniture);

  function rectTable(id: string, x: number, z: number, lx: number, lz: number): void {
    const t = new THREE.Group();
    t.name = id;
    t.position.set(x, 0, z);
    furniture.add(t);
    put(t, box(lx, TABLE_TOP_T, lz), matTableTop, 0, TABLE_TOP_Y + PLINTH_M, 0, id + 'Top');
    const legX = lx / 2 - 0.25;
    const legZ = lz / 2 - 0.25;
    const corners: Vec2[] = [[-legX, -legZ], [legX, -legZ], [-legX, legZ], [legX, legZ]];
    for (let i = 0; i < corners.length; i++) {
      put(t, cyl(0.055, TABLE_TOP_Y, 8), matTableLeg,
          corners[i][0], TABLE_TOP_Y / 2 + PLINTH_M, corners[i][1], id + 'Leg' + i);
    }
  }

  function roundTable(id: string, x: number, z: number, r: number): void {
    const t = new THREE.Group();
    t.name = id;
    t.position.set(x, 0, z);
    furniture.add(t);
    put(t, cyl(r, TABLE_TOP_T, 24), matTableTop, 0, TABLE_TOP_Y + PLINTH_M, 0, id + 'Top');
    put(t, cyl(0.09, TABLE_TOP_Y, 10), matTableLeg, 0, TABLE_TOP_Y / 2 + PLINTH_M, 0, id + 'Stem');
    put(t, cyl(0.4, 0.05, 14), matTableLeg, 0, PLINTH_M + 0.025, 0, id + 'Foot');
  }

  function chair(x: number, z: number, facing: number, id: string): void {
    const c = new THREE.Group();
    c.name = id;
    c.position.set(x, 0, z);
    c.rotation.y = facing;
    furniture.add(c);
    put(c, cyl(0.22, 0.05, 12), matChair, 0, CHAIR_HEIGHT + PLINTH_M, 0, id + 'Seat');
    put(c, cyl(0.04, CHAIR_HEIGHT, 8), matChair, 0, CHAIR_HEIGHT / 2 + PLINTH_M, 0, id + 'Stem');
    put(c, box(0.42, 0.42, 0.04), matChair, 0, CHAIR_HEIGHT + 0.32 + PLINTH_M, -0.2, id + 'Back');
  }

  // Fyra långbord längs salens djup. Fyra streck uppifrån.
  const longNames = ['longA', 'longB', 'longC', 'longD'];
  for (let ti = 0; ti < LONG_TABLE_X.length; ti++) {
    const tx = LONG_TABLE_X[ti];
    const id = longNames[ti];
    rectTable(id, tx, LONG_TABLE_Z, 1.0, LONG_TABLE_LEN);
    for (let side = 0; side < 2; side++) {
      const sx = tx + (side === 0 ? -LONG_SEAT_DX : LONG_SEAT_DX);
      const aisleX = tx + (side === 0 ? -LONG_AISLE_DX : LONG_AISLE_DX);
      const facing = side === 0 ? Math.PI / 2 : -Math.PI / 2;
      for (let k = 0; k < LONG_SEAT_DZ.length; k++) {
        const sz = LONG_TABLE_Z + LONG_SEAT_DZ[k];
        const sid = id + (side === 0 ? 'w' : 'e') + (k + 1);
        chair(sx, sz, facing, 'chair_' + sid);
        seats.push({
          id: sid,
          kind: 'long',
          seatIndex: seats.length,
          furnitureId: id,
          local: [sx, sz],
          seatHeight: CHAIR_HEIGHT,
          facing: facing,
          approach: [aisleX, sz],
          via: [[aisleX, SPINE_Z]],
          lane: 'longAisle'
        });
      }
    }
  }

  // Sex runda om sex. Sex cirklar uppifrån.
  let roundNo = 0;
  for (let rz = 0; rz < ROUND_Z.length; rz++) {
    for (let rx = 0; rx < ROUND_X.length; rx++) {
      roundNo++;
      const id = 'round' + roundNo;
      const cx = ROUND_X[rx];
      const cz = ROUND_Z[rz];
      roundTable(id, cx, cz, ROUND_R);
      for (let k = 0; k < 6; k++) {
        const th = (k / 6) * Math.PI * 2;
        const sx = cx + ROUND_SEAT_R * Math.sin(th);
        const sz = cz + ROUND_SEAT_R * Math.cos(th);
        const facing = th + Math.PI;
        chair(sx, sz, facing, 'chair_' + id + '_' + (k + 1));
        // Angörning radiellt utanför stolsringen, och sedan närmaste
        // nord–sydliga gång. Radien 2,15 är vald så punkten hamnar
        // 0,58 m från både egen och grannes stolsring.
        const ax = cx + ROUND_APPROACH_R * Math.sin(th);
        const az = cz + ROUND_APPROACH_R * Math.cos(th);
        let laneX = ROUND_LANES[0];
        for (let li = 1; li < ROUND_LANES.length; li++) {
          if (Math.abs(ROUND_LANES[li] - ax) < Math.abs(laneX - ax)) laneX = ROUND_LANES[li];
        }
        seats.push({
          id: id + '_' + (k + 1),
          kind: 'round',
          seatIndex: seats.length,
          furnitureId: id,
          local: [sx, sz],
          seatHeight: CHAIR_HEIGHT,
          facing: facing,
          approach: [ax, az],
          via: [[laneX, SPINE_Z], [laneX, az]],
          lane: 'roundAisle'
        });
      }
    }
  }

  // Lilla salen: ett bord om sexton bakom halvvägg.
  rectTable('salTable', SAL_TABLE[0], SAL_TABLE[1], SAL_TABLE_LEN, 1.1);
  let salNo = 0;
  // Salsgången: in genom halvväggens öppning, sedan framför bordet.
  // Platserna på bortre långsidan nås runt bordets östra gavel — en
  // rak väg dit skulle gå genom bordet.
  const salIn: Vec2[] = [[SAL_DOOR_X, SPINE_Z], [SAL_DOOR_X, SAL_LANE_Z]];
  for (let side = 0; side < 2; side++) {
    const sz = SAL_TABLE[1] + (side === 0 ? SAL_SEAT_DZ : -SAL_SEAT_DZ);
    const facing = side === 0 ? Math.PI : 0;
    for (let k = 0; k < SAL_SEAT_DX.length; k++) {
      salNo++;
      const sx = SAL_TABLE[0] + SAL_SEAT_DX[k];
      chair(sx, sz, facing, 'chair_sal' + salNo);
      const near = side === 0;
      const approach: Vec2 = near ? [sx, sz + 0.85] : [sx, sz - 0.85];
      const via: Vec2[] = near
        ? salIn.concat([[sx, SAL_LANE_Z]])
        : salIn.concat([[SAL_EAST_LANE_X, SAL_LANE_Z],
                        [SAL_EAST_LANE_X, SAL_BACK_LANE_Z],
                        [sx, SAL_BACK_LANE_Z]]);
      seats.push({
        id: 'sal' + salNo,
        kind: 'sal',
        seatIndex: seats.length,
        furnitureId: 'salTable',
        local: [sx, sz],
        seatHeight: CHAIR_HEIGHT,
        facing: facing,
        approach: approach,
        via: via,
        lane: 'salLane'
      });
    }
  }
  for (let e = 0; e < 2; e++) {
    salNo++;
    const sx = SAL_TABLE[0] + (e === 0 ? -1 : 1) * (SAL_TABLE_LEN / 2 + 0.55);
    const facing = e === 0 ? Math.PI / 2 : -Math.PI / 2;
    chair(sx, SAL_TABLE[1], facing, 'chair_sal' + salNo);
    const ax = sx + (e === 0 ? -0.8 : 0.8);
    const via: Vec2[] = e === 0
      ? salIn.concat([[ax, SAL_LANE_Z]])
      : salIn.concat([[SAL_EAST_LANE_X, SAL_LANE_Z], [SAL_EAST_LANE_X, SAL_TABLE[1]]]);
    seats.push({
      id: 'sal' + salNo,
      kind: 'sal',
      seatIndex: seats.length,
      furnitureId: 'salTable',
      local: [sx, SAL_TABLE[1]],
      seatHeight: CHAIR_HEIGHT,
      facing: facing,
      approach: [ax, SAL_TABLE[1]],
      via: via,
      lane: 'salLane'
    });
  }

  // ── Längorna: åttio rum som volym ─────────────────────────────
  const wingGround = new THREE.Group();
  wingGround.name = 'wingGround';
  group.add(wingGround);
  const wingUpper = new THREE.Group();
  wingUpper.name = 'wingUpper';
  group.add(wingUpper);
  const roofWings = new THREE.Group();
  roofWings.name = 'roofWings';
  group.add(roofWings);

  const guestRooms: GuestRoomSpec[] = [];
  const wingStairs: Vec2[] = [];
  const cells = Math.max(1, Math.round(wingLen / module));
  const roomDepth = (wingDep - 2.2) / 2;
  const corridorHalf = 1.1;
  let roomNo = 0;

  const wingSpecs = [
    { name: 'west', sign: -1 },
    { name: 'east', sign: 1 }
  ];

  for (let wi = 0; wi < wingSpecs.length; wi++) {
    const W = wingSpecs[wi];
    const s = W.sign;
    const innerX = s * halfW;                  // mot gården
    const outerX = s * (halfW + wingDep);      // mot omgivningen
    const midX = s * (halfW + wingDep / 2);    // korridorens mitt
    const corrIn = midX - s * corridorHalf;
    const corrOut = midX + s * corridorHalf;
    const zc = (wingZ0 + wingZ1) / 2;

    // Sockel + tak, en gång per länga.
    put(group, box(wingDep + 0.3, 0.1, wingLen + 0.3), matSlab,
        midX, 0.05, zc, W.name + 'Slab');
    put(roofWings, box(wingDep + 0.45, 0.35, wingLen + 0.45), matWingRoof,
        midX, 2 * storeyH + 0.35, zc, W.name + 'Roof');

    // Utomhustrappan vid längans SÖDRA gavel, närmast hallen — inte
    // vid mittpunkten. Två skäl: gången från trappan till salens dörr
    // blir kort och läslig i stället för att korsa halva gården, och
    // korridoren kan mynna i gaveln utan att en rumscell offras för
    // passagen. Trappan landar på loftgången.
    const stairZ = wingZ0 + 1.7;
    const stairX = innerX - s * (LOFT_DEPTH / 2 + 0.4);
    put(group, box(2.6, 0.25, 2.2), matStair, stairX, 0.14, stairZ, W.name + 'StairLanding');
    const rise = (storeyH + PLINTH_M) / 14;
    for (let st = 0; st < 14; st++) {
      put(group, box(2.2, 0.16, 0.3), matStair,
          stairX, 0.26 + st * rise, stairZ + 1.15 + st * 0.3, W.name + 'StairStep' + st);
    }
    put(group, box(0.1, 1.0, 5.4), matRail, stairX - s * 1.15, storeyH * 0.5, stairZ + 2.5, W.name + 'StairRail');
    wingStairs.push([stairX, stairZ]);

    // Loftgången: öppen svalgång längs gårdsfasaden, övre plan. Det är
    // den som gör morgonrörelsen läsbar hela vägen — utan den sker den
    // i en korridor kameran aldrig ser, och då är U-formen bortkastad.
    const loftX = innerX - s * (LOFT_DEPTH / 2);
    const stairTopZ = stairZ + 5.2;
    const gableLandZ = wingZ0 - 0.9;
    put(wingUpper, box(LOFT_DEPTH, 0.16, wingLen), matStair,
        loftX, storeyH + PLINTH_M - 0.08, zc, W.name + 'LoftDeck');
    put(wingUpper, box(0.1, 0.95, wingLen), matRail,
        innerX - s * LOFT_DEPTH, storeyH + PLINTH_M + 0.48, zc, W.name + 'LoftRail');
    for (let i = 0; i <= cells; i++) {
      put(wingUpper, cyl(0.08, storeyH, 6), matRail,
          innerX - s * LOFT_DEPTH, storeyH / 2 + PLINTH_M, wingZ0 + i * module, W.name + 'LoftPost' + i);
    }
    // Gavellandning: binder korridorens mynning till loftgången, så
    // övre planets ytterrum når trappan utan att gå genom ett rum.
    put(wingUpper, box(wingDep + LOFT_DEPTH, 0.16, 1.6),
        matStair, midX - s * (LOFT_DEPTH / 2), storeyH + PLINTH_M - 0.08,
        wingZ0 - 0.8, W.name + 'GableLanding');
    put(wingUpper, box(wingDep + LOFT_DEPTH, 0.95, 0.1), matRail,
        midX - s * (LOFT_DEPTH / 2), storeyH + PLINTH_M + 0.48,
        wingZ0 - 1.6, W.name + 'GableRail');

    for (let storey = 0; storey < 2; storey++) {
      const parent = storey === 0 ? wingGround : wingUpper;
      const y0 = storey * storeyH;
      const wyy = y0 + storeyH / 2 + PLINTH_M;

      // Korridorgolv + rummens golv i en platta per plan.
      floorPlate(parent, zoneMats.hall, wingDep - 0.2, wingLen - 0.2,
                 midX, zc, y0 + PLINTH_M, W.name + 'Floor' + storey);

      // Skal: yttervägg, gårdsvägg, gavlar.
      put(parent, box(WALL_T, storeyH, wingLen), matWingWall,
          outerX - s * WALL_T / 2, wyy, zc, W.name + 'OuterWall' + storey);
      put(parent, box(WALL_T, storeyH, wingLen), matWingWall,
          innerX + s * WALL_T / 2, wyy, zc, W.name + 'CourtWall' + storey);
      put(parent, box(wingDep, storeyH, WALL_T), matWingWall,
          midX, wyy, wingZ0 + WALL_T / 2, W.name + 'EndWallS' + storey);
      put(parent, box(wingDep, storeyH, WALL_T), matWingWall,
          midX, wyy, wingZ1 - WALL_T / 2, W.name + 'EndWallN' + storey);
      // Korridorväggar — kammens ryggrad.
      put(parent, box(0.12, storeyH, wingLen), matWingWall,
          corrIn, wyy, zc, W.name + 'CorrWallIn' + storey);
      put(parent, box(0.12, storeyH, wingLen), matWingWall,
          corrOut, wyy, zc, W.name + 'CorrWallOut' + storey);

      // Kammen: en skiljevägg per rumsgräns, per sida.
      for (let i = 0; i <= cells; i++) {
        const pz = wingZ0 + i * module;
        put(parent, box(roomDepth, storeyH, 0.1), matWingWall,
            innerX + s * (roomDepth / 2), wyy, pz, W.name + 'PartC' + storey + '_' + i);
        put(parent, box(roomDepth, storeyH, 0.1), matWingWall,
            outerX - s * (roomDepth / 2), wyy, pz, W.name + 'PartO' + storey + '_' + i);
      }

      // Rummen: volym, dörr, ingen inredning.
      // Korridoren mynnar i södra gaveln, vid trappan. Ground: rakt ut
      // i gården. Övre: ut på loftgången. Ingen rumscell offras.
      const gableDoor = new THREE.Mesh(plane(1.1, 2.1), matDoor);
      gableDoor.position.set(midX, y0 + 1.05 + PLINTH_M, wingZ0 + 0.06);
      gableDoor.rotation.y = Math.PI;
      gableDoor.name = W.name + 'GableExit' + storey;
      parent.add(gableDoor);

      for (let i = 0; i < cells; i++) {
        const rz = wingZ0 + (i + 0.5) * module;
        // Övre planets gårdsrum går direkt ut på loftgången; allt annat
        // via korridoren. Det är hela poängen med svalgången.
        const courtDoorX = storey === 1 ? innerX - s * 0.05 : corrIn - s * 0.06;
        const sides = [
          { key: 'court', cx: innerX + s * (roomDepth / 2), dx: courtDoorX },
          { key: 'outer', cx: outerX - s * (roomDepth / 2), dx: corrOut + s * 0.06 }
        ];
        for (let sd = 0; sd < sides.length; sd++) {
          const S = sides[sd];
          roomNo++;
          const rid = 'r' + String(roomNo).padStart(3, '0');
          const dp = new THREE.Mesh(plane(0.95, 2.1), matDoor);
          dp.position.set(S.dx, y0 + 1.05 + PLINTH_M, rz);
          dp.rotation.y = s * Math.PI / 2 * (S.key === 'court' ? -1 : 1);
          dp.name = rid + 'Door';
          parent.add(dp);
          // Ett fönster per gårdsrum. Utan dem läser längorna som två
          // långa lådor uppifrån; med dem syns åttio rum som åttio.
          if (S.key === 'court') {
            const win = new THREE.Mesh(plane(0.9, 1.0), matWindow);
            const wOff = storey === 1 ? 1.15 : 0;
            win.position.set(innerX - s * 0.04, y0 + 1.55 + PLINTH_M, rz + (wOff === 0 ? 0 : wOff));
            win.rotation.y = -s * Math.PI / 2;
            win.name = rid + 'Win';
            parent.add(win);
          } else {
            const win = new THREE.Mesh(plane(0.9, 1.0), matWindow);
            win.position.set(outerX - s * 0.04, y0 + 1.55 + PLINTH_M, rz);
            win.rotation.y = s * Math.PI / 2;
            win.name = rid + 'Win';
            parent.add(win);
          }
          const gallery = storey === 1 && S.key === 'court';
          let exitVia: Vec2[];
          if (gallery) {
            exitVia = [[loftX, rz], [loftX, stairTopZ],
                       [stairX, stairTopZ], [stairX, stairZ]];
          } else if (storey === 1) {
            exitVia = [[midX, rz], [midX, wingZ0 + 0.8], [midX, gableLandZ],
                       [loftX, gableLandZ], [loftX, stairTopZ],
                       [stairX, stairTopZ], [stairX, stairZ]];
          } else {
            exitVia = [[midX, rz], [midX, wingZ0 + 0.8], [midX, wingZ0 - 1.4]];
          }
          guestRooms.push({
            id: rid,
            wing: W.name,
            storey: storey,
            side: S.key,
            local: [S.cx, rz],
            floorY: y0 + PLINTH_M,
            doorLocal: [S.dx, rz],
            onGallery: gallery,
            stairLocal: [stairX, stairZ],
            exitVia: exitVia,
            areaM2: roomDepth * module
          });
        }
      }
    }
  }

  const staffStations: StaffStation[] = [
    { id: 'host', role: 'host', local: [1.6, 8.3], facing: Math.PI,
      note: 'Värdfolket, innanför salens dörr mot gården. Tar emot både gäster utifrån och gäster som kommer ner från rummen.' },
    { id: 'chef', role: 'kitchen', local: [-8.4, -6.6], facing: Math.PI,
      note: 'Vid spislinjen, mitt i kökets axel.' },
    { id: 'sous', role: 'kitchen', local: [-11.6, -6.6], facing: Math.PI,
      note: 'Kall prep i -X-änden, närmast leveransdörren.' },
    { id: 'grill', role: 'kitchen', local: [-5.6, -6.6], facing: Math.PI,
      note: 'Grillen. Grillspettet är enda rörliga geometrin i rummet.' },
    { id: 'plating', role: 'kitchen', local: [-7.0, -3.0], facing: 0,
      note: 'Uppläggning vid passluckan. passAnchor sitter här.' },
    { id: 'dish', role: 'kitchen', local: [-4.9, -6.0], facing: -Math.PI / 2,
      note: 'Disk i kökets +X-ände, dit smutsen går tillbaka.' },
    { id: 'hallA', role: 'hallService', local: [-9.3, 2.7], facing: Math.PI / 2,
      note: 'Salsservering, långbordens gång. Fyra bord om tolv.' },
    { id: 'hallB', role: 'hallService', local: [3.97, 3.5], facing: -Math.PI / 2,
      note: 'Salsservering, de runda bordens sida.' },
    { id: 'salWaiter', role: 'hallService', local: [4.8, -2.6], facing: Math.PI,
      note: 'Lilla salen, innanför halvväggens öppning.' },
    { id: 'outdoorBar', role: 'hallService', local: [OUTBAR_X, OUTBAR_Z - 0.75], facing: 0,
      note: 'Bakom utomhusbarens disk i gården, öster om salens dörr. Bär hallService-uniformen — en sjätte uniform skulle spränga ΔE-bandet. Se FLAGS.outdoorBarSeason.' },
    { id: 'breakfast', role: 'breakfast', local: [0, -5.7], facing: Math.PI / 2,
      note: 'Frukostbuffén mellan de två borden. Stängd vid middag — se FLAGS.breakfastPass.' },
    { id: 'rooms', role: 'rooms', local: [-halfW + 1.3, (wingZ0 + wingZ1) / 2 - 2.2], facing: 0,
      note: 'Städ, vid västra längans trappa. Uppgiften finns inte i staffTasks — se FLAGS.housekeeping.' }
  ];

  const parts: RoomParts = {
    rotisserie: rotisserie,
    roofMain: roofMain,
    roofWings: roofWings,
    walls: walls,
    interior: interior,
    wingUpper: wingUpper,
    wingGround: wingGround,
    courtyard: courtyard,
    passAnchor: passAnchor,
    buffetAnchor: buffetAnchor,
    outBarAnchor: outBarAnchor
  };

  return {
    group: group,
    parts: parts,
    seats: seats,
    guestRooms: guestRooms,
    staffStations: staffStations,
    entrance: entrance,
    waitingSpot: waitingSpot,
    courtyardGate: courtyardGate,
    wingStairs: wingStairs,
    deliveryDoor: deliveryDoor,
    footprint: [mainW + 2 * wingDep, mainD + COURT_DEPTH],
    fits: fits,
    shortfall: shortfall,
    dispose: function () {
      materials.forEach(function (m) { m.dispose(); });
      group.removeFromParent();
    }
  };
}

/**
 * Enda rörliga delen: grillspettet. `phase` är 0..1 och kommer från
 * anroparen — rummet äger ingen klocka.
 */
export function updateInnRoom(room: InnRoom, phase: number): void {
  room.parts.rotisserie.rotation.x = (phase ?? 0) * Math.PI * 2;
}

// ---------- Gånggrafen ----------

/**
 * Stråket innanför entrédörren, längs gårdsväggen. Ligger norr om
 * både långbordens sista stolsrad (5,17) och de rundas norra
 * stolsring (7,21), med 0,69 m marginal till den senare.
 */
const SPINE_Z = 7.9;

/**
 * Vägpunkter från salens dörr till en plats, i lokal XZ.
 * Vägen är data: varje plats bär sina egna korridornoder i via[], och
 * funktionen gör bara entré → stråk → via → angöring → sits. Första
 * versionen hade grenlogik per platsslag med tre hårdkodade
 * korridorer, och två av dem låg i stolsraderna. Att lägga vägen på
 * platsen i stället gör felet mätbart per plats.
 */
export function walkPathToSeat(room: InnRoom, seatId: string): Vec2[] {
  const seat = room.seats.find(function (s) { return s.id === seatId; });
  if (!seat) return [];
  const path: Vec2[] = [[room.entrance[0], room.entrance[1]]];
  path.push([room.entrance[0], SPINE_Z]);
  for (let i = 0; i < seat.via.length; i++) {
    path.push([seat.via[i][0], seat.via[i][1]]);
  }
  path.push([seat.approach[0], seat.approach[1]]);
  path.push([seat.local[0], seat.local[1]]);
  return path;
}

/** Vägen ut: samma korridorer baklänges, ut genom gården till grinden. */
export function exitPathFromSeat(room: InnRoom, seatId: string): Vec2[] {
  const back = walkPathToSeat(room, seatId).slice().reverse();
  back.push([room.waitingSpot[0], room.waitingSpot[1]]);
  back.push([room.courtyardGate[0], room.courtyardGate[1]]);
  return back;
}

/**
 * Morgonrörelsen: rum → korridor → trappa → gård → salens dörr.
 * Verksamhetens signatur, och den enda vägen som lämnar husets plan.
 * Y ignoreras här; anroparen läser GuestRoomSpec.floorY och
 * interpolerar nedför trappan längs de tre gårdspunkterna.
 * Se FLAGS.morningMovement — vägen finns, tillståndet som utlöser
 * den gör inte det.
 */
export function walkPathFromRoom(room: InnRoom, roomId: string): Vec2[] {
  const gr = room.guestRooms.find(function (r) { return r.id === roomId; });
  if (!gr) return [];
  const path: Vec2[] = [[gr.local[0], gr.local[1]],
                        [gr.doorLocal[0], gr.doorLocal[1]]];
  for (let i = 0; i < gr.exitVia.length; i++) {
    path.push([gr.exitVia[i][0], gr.exitVia[i][1]]);
  }
  path.push([room.waitingSpot[0], room.waitingSpot[1]]);
  path.push([room.entrance[0], room.entrance[1]]);
  return path;
}

/**
 * Höjdprofilen för samma väg, i lokal y. Anroparen behöver den för
 * att kunna interpolera nedför trappan i stället för att låta figuren
 * sväva. Samma längd som walkPathFromRoom().
 */
export function walkHeightsFromRoom(room: InnRoom, roomId: string): number[] {
  const gr = room.guestRooms.find(function (r) { return r.id === roomId; });
  if (!gr) return [];
  const n = gr.exitVia.length;
  const ys = [gr.floorY, gr.floorY];
  for (let i = 0; i < n; i++) {
    // Sista steget i exitVia är trappfoten; näst sista är trappkrönet.
    if (gr.storey === 1 && i === n - 1) ys.push(0.14);
    else ys.push(gr.floorY);
  }
  ys.push(0.02);
  ys.push(PLINTH_M);
  return ys;
}

// ---------- Mätning (§7) ----------

/**
 * Mäter anläggningen i den scen som faktiskt renderas — samma tal
 * playwright ska hitta efter montering. Ett rum som finns i grafen
 * men inte har utbredning ger nollor här.
 */
export function measureInnRoom(room: InnRoom): {
  footprint: Vec2;
  hallFootprint: Vec2;
  /** Fri takhöjd i salen, mätt ur väggarnas utbredning. */
  hallHeight: number;
  /** Högsta inredning i salen — spiskåpan. Inte samma sak som taket. */
  tallestFitting: number;
  wingHeight: number;
  seatCount: number;
  guestRoomCount: number;
  roomAreaM2: number;
  courtyardM2: number;
  lawnM2: number;
  bouleM2: number;
  treeCount: number;
  galleryLengthM: number;
  floorZones: number;
} {
  room.group.updateWorldMatrix(true, true);
  const all = new THREE.Box3().setFromObject(room.group);
  const hall = new THREE.Box3().setFromObject(room.parts.interior);
  const wings = new THREE.Box3().setFromObject(room.parts.wingUpper);
  const court = new THREE.Box3().setFromObject(room.parts.courtyard);
  // Takhöjden mäts ur VÄGGARNA, inte ur inredningen. parts.interior
  // innehåller golv och möbler; dess högsta punkt är spiskåpan på
  // 2,33 m, vilket inte är ett tak en figur på 1,70 m står under.
  // Första versionen mätte fel och rapporterade salen som 2,22 m hög.
  const shell = new THREE.Box3().setFromObject(room.parts.walls);
  return {
    footprint: [all.max.x - all.min.x, all.max.z - all.min.z],
    hallFootprint: [hall.max.x - hall.min.x, hall.max.z - hall.min.z],
    hallHeight: shell.max.y - shell.min.y,
    tallestFitting: hall.max.y,
    wingHeight: wings.max.y,
    seatCount: room.seats.length,
    guestRoomCount: room.guestRooms.length,
    roomAreaM2: room.guestRooms.length ? room.guestRooms[0].areaM2 : 0,
    courtyardM2: (court.max.x - court.min.x) * (court.max.z - court.min.z),
    lawnM2: (LAWN.x1 - LAWN.x0) * (LAWN.z1 - LAWN.z0),
    bouleM2: (BOULE.x1 - BOULE.x0) * (BOULE.z1 - BOULE.z0),
    treeCount: TREES.length,
    galleryLengthM: galleryLength(room),
    floorZones: ZONE_FLOORS.length
  };
}

/** Loftgångens sammanlagda längd, mätt ur scengrafen. */
function galleryLength(room: InnRoom): number {
  let total = 0;
  const bb = new THREE.Box3();
  room.parts.wingUpper.traverse(function (o) {
    if (o.name.indexOf('LoftDeck') < 0) return;
    bb.setFromObject(o);
    total += bb.max.z - bb.min.z;
  });
  return total;
}

/**
 * Hävdar att kammen faktiskt gav åttio celler, och att varje cell
 * har en dörrplan i scengrafen. Åttio rum är precis den sortens tal
 * man tror på utan att räkna; en tidigare leverans passerade som
 * utförd med en platshållare som aldrig syntes.
 */
export function checkRoomCount(room: InnRoom): {
  expected: number;
  found: number;
  doorsInGraph: number;
  perWing: { [k: string]: number };
  ok: boolean;
} {
  const perWing: { [k: string]: number } = {};
  for (let i = 0; i < room.guestRooms.length; i++) {
    const w = room.guestRooms[i].wing + '-' + room.guestRooms[i].storey;
    perWing[w] = (perWing[w] ?? 0) + 1;
  }
  let doors = 0;
  room.group.traverse(function (o) {
    if (o.name.length === 8 && o.name.indexOf('Door') === 4 && o.name.charAt(0) === 'r') doors++;
  });
  return {
    expected: TOTAL_GUEST_ROOMS,
    found: room.guestRooms.length,
    doorsInGraph: doors,
    perWing: perWing,
    ok: room.guestRooms.length === TOTAL_GUEST_ROOMS && doors === TOTAL_GUEST_ROOMS
  };
}

/**
 * Världskoordinater för platser, rum, stationer och vägpunkter efter
 * att gruppen placerats. Bron till interiorLayout: sim-lagret får en
 * platt seats-lista i seatIndex-ordning, precis som i dag, plus en
 * rumslista i id-ordning.
 */
export function resolveWorldPositions(room: InnRoom): {
  seats: Vec2[];
  guestRooms: Vec2[];
  staffStations: Vec2[];
  entrance: Vec2;
  waitingSpot: Vec2;
  courtyardGate: Vec2;
  wingStairs: Vec2[];
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
    guestRooms: room.guestRooms.map(function (r) { return toWorld(r.local); }),
    staffStations: room.staffStations.map(function (s) { return toWorld(s.local); }),
    entrance: toWorld(room.entrance),
    waitingSpot: toWorld(room.waitingSpot),
    courtyardGate: toWorld(room.courtyardGate),
    wingStairs: room.wingStairs.map(function (s) { return toWorld(s); })
  };
}
