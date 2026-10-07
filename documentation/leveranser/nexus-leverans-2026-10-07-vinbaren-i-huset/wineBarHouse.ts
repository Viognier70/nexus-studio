// wineBarHouse.ts — vinbarens möblering inom huset w869907975. Leverans 2026-10-07, till ORDER 312b.
//
// Rummet är krympt till husets mått, 14,47 × 10,05 m (Code, ORDER 312b). Den här filen ger möbleringen som ryms i det.
// Koordinater i rummets ram som wineBarRoom.ts: lokal +X = byggnadens långa axel med dörren i +X, lokal +Z = korta axeln,
// origo i rummets mitt. world är kartans ram (grythyttan-world.json): meter, +x österut, +z söderut, räknat med
// entranceObb (vinkel −97,01°, mitten [31,60, −16,76], doorShift 0,02 m). Dörren ligger på fasaden i [30,71, −23,94].
//
// Platserna är 20, som förut: 6 i loungerna, 6 vid tre tvåor och 8 barstolar. Åtta ståplatser finns som geometri
// men räknas inte (FLAGS.standing). Ekonomin kan därför kalibreras på samma kapacitet som tidigare.
//
// Vad som ändrats mot wineBarRoom.ts (15,6 × 11,8 m):
//   • Baren 6,0 → 5,2 m lång och flyttad 0,4 m söderut. Stråken är oförändrade, 0,98 m.
//   • Vinväggen i bas 3,2 m (x −2,4 … 0,8), i platina 3,7 m (x −2,7 … 1,0). Platina var 4,1 m.
//   • Loungerna mot norra väggen med bordet 0,45 m djupt och 0,40 m benrum till dynorna (var 0,55 och 0,72).
//   • Tvåorna 0,8 → 0,7 m.
//   • Köket 3,0 × 4,1 → 2,44 × 3,43 m. Samma tre platser (varm, kall, disk) och passluckan i östra halvväggen.
//   • DJ-hörnet 3,0 × 2,3 → 2,74 × 2,08 m.
//   • Allt vid dörren (pulten, tavlan, hängaren, dörrmattan, köplatserna innanför) ligger på samma avstånd från dörrväggen.
//
// Gångarna, mätta mellan sittande gästers rygg och nästa möbel:
//   norra gången (barstolarna → loungeborden) 0,88 m · södra gången (barstolarna → tvåorna) 0,90 m ·
//   ryggen från dörren (barens kortände → ståbord 1) 0,90 m · köksdörren → barens västra öppning 1,4 m.
// Allt står innanför väggarna (inX 7,035, inZ 4,825). Hörnen ligger inom 2 cm från husgrunden i OSM.

export type Vec2 = [number, number];

export const ROOM = { width: 14.47, depth: 10.05, wall: 0.2, inX: 7.035, inZ: 4.825 };
/** Ersätter MIN_WIDTH_M 14,6 och MIN_DEPTH_M 11,0. Det minsta rum möbleringen ryms i. */
export const MIN_SIZE = { width: 14.4, depth: 10.0 };
export const TOTAL_SEATS = 20;
export const STANDING_SPOTS = 8;

export const LAYOUT = {room: {w: 14.47,d: 10.05,wall: 0.2},kitchen: {x0: -7.035,x1: -4.6,z0: 1.4,z1: 4.825},kitchenWalls: [[-4.75,-4.6,3.1,4.825],[-4.75,-4.6,1.4,2],[-7.035,-5.5,1.4,1.55],[-4.7,-4.6,1.4,1.55]],pass: [-5,-4.6,2,3.1],stations: {hot: [-7.035,-6.3,2.4,4.1],cold: [-6.1,-4.9,4.2,4.825],dish: [-6.9,-5.8,1.55,2.1]},store: [[-7.035,-6.1,-2.4,-1.4],[-6.95,-6.1,-3.6,-2.8],[-6.95,-6.15,-4.7,-3.9]],bar: {x0: -3.4,x1: 1.8,z0: -2.2,z1: 1.4,depth: 0.6},rack: {bas: [-2.4,0.8],platina: [-2.7,1],z: [-0.62,-0.18]},stoolX: [-2.6,-1.8,-1,-0.2],stoolZ: {N: 1.9,S: -2.7},lounge: {cx: [-2,1.4],cushionZ: 4.285,back: [4.645,4.825],tableZ: 3.3,tableW: 1.2,tableD: 0.45},twoTop: {x: [-4.3,-2.3,-0.3],z: -4.25,size: 0.7,chairDx: 0.55},barEnd: {x: 2.25,z: [-1.3,-0.7,-0.1,0.5]},highTables: [[4.2,3],[5.6,4]],coatRail: [6.915,6.975,1.1,2.3],hostDesk: [5.81,6.26,-0.85,-0.25],easel: [6.345,6.425,-2.08,-1.42],dj: {x0: 4.1,x1: 6.835,z0: -4.825,z1: -2.75,cx: 5.45,cz: -3.7},barFridge: [0.82,1.2,-1.55,-0.7],mat: [5.935,7.035,-0.75,0.75]} as const;

/** Gånggrafens linjer (ersätter SPINE_X, NORTH_Z, SOUTH_Z, LOUNGE_INNER_Z). */
export const LANES = { spineX: 3.0, northZ: 2.65, southZ: -3.45, loungeInnerZ: 3.72 };
export const STAFF_PATH_KITCHEN_TO_BAR: Vec2[] = [[-5.1, 2.4], [-5.1, 0.9], [-4.0, 0.31], [-3.2, 0.31]];

export const SEATS = [
  { id: 'loungeA1', kind: 'lounge', local: [-2.8, 4.285], world: [36.19, -14.5], facing: Math.PI, approach: [-2.8, 3.72], lane: 'north' },
  { id: 'loungeA2', kind: 'lounge', local: [-2, 4.285], world: [36.1, -15.3], facing: Math.PI, approach: [-2, 3.72], lane: 'north' },
  { id: 'loungeA3', kind: 'lounge', local: [-1.2, 4.285], world: [36, -16.09], facing: Math.PI, approach: [-1.2, 3.72], lane: 'north' },
  { id: 'loungeB1', kind: 'lounge', local: [0.6, 4.285], world: [35.78, -17.88], facing: Math.PI, approach: [0.6, 3.72], lane: 'north' },
  { id: 'loungeB2', kind: 'lounge', local: [1.4, 4.285], world: [35.68, -18.67], facing: Math.PI, approach: [1.4, 3.72], lane: 'north' },
  { id: 'loungeB3', kind: 'lounge', local: [2.2, 4.285], world: [35.58, -19.47], facing: Math.PI, approach: [2.2, 3.72], lane: 'north' },
  { id: 'twoA1', kind: 'twotop', local: [-4.85, -4.25], world: [27.97, -11.43], facing: Math.PI / 2, approach: [-4.85, -3.45], lane: 'south' },
  { id: 'twoA2', kind: 'twotop', local: [-3.75, -4.25], world: [27.84, -12.52], facing: -Math.PI / 2, approach: [-3.75, -3.45], lane: 'south' },
  { id: 'twoB1', kind: 'twotop', local: [-2.85, -4.25], world: [27.73, -13.41], facing: Math.PI / 2, approach: [-2.85, -3.45], lane: 'south' },
  { id: 'twoB2', kind: 'twotop', local: [-1.75, -4.25], world: [27.6, -14.5], facing: -Math.PI / 2, approach: [-1.75, -3.45], lane: 'south' },
  { id: 'twoC1', kind: 'twotop', local: [-0.85, -4.25], world: [27.49, -15.4], facing: Math.PI / 2, approach: [-0.85, -3.45], lane: 'south' },
  { id: 'twoC2', kind: 'twotop', local: [0.25, -4.25], world: [27.35, -16.49], facing: -Math.PI / 2, approach: [0.25, -3.45], lane: 'south' },
  { id: 'bar1', kind: 'bar', local: [-2.6, 1.9], world: [33.8, -14.41], facing: Math.PI, approach: [-2.6, 2.65], lane: 'north' },
  { id: 'bar2', kind: 'bar', local: [-1.8, 1.9], world: [33.71, -15.21], facing: Math.PI, approach: [-1.8, 2.65], lane: 'north' },
  { id: 'bar3', kind: 'bar', local: [-1, 1.9], world: [33.61, -16], facing: Math.PI, approach: [-1, 2.65], lane: 'north' },
  { id: 'bar4', kind: 'bar', local: [-0.2, 1.9], world: [33.51, -16.79], facing: Math.PI, approach: [-0.2, 2.65], lane: 'north' },
  { id: 'bar5', kind: 'bar', local: [-2.6, -2.7], world: [29.24, -13.85], facing: 0, approach: [-2.6, -3.45], lane: 'south' },
  { id: 'bar6', kind: 'bar', local: [-1.8, -2.7], world: [29.14, -14.64], facing: 0, approach: [-1.8, -3.45], lane: 'south' },
  { id: 'bar7', kind: 'bar', local: [-1, -2.7], world: [29.04, -15.44], facing: 0, approach: [-1, -3.45], lane: 'south' },
  { id: 'bar8', kind: 'bar', local: [-0.2, -2.7], world: [28.94, -16.23], facing: 0, approach: [-0.2, -3.45], lane: 'south' },
];

export const STANDING = [
  { id: 'standBar1', kind: 'barEnd', local: [2.25, -1.3], world: [30.04, -18.83], facing: -Math.PI / 2 },
  { id: 'standBar2', kind: 'barEnd', local: [2.25, -0.7], world: [30.63, -18.91], facing: -Math.PI / 2 },
  { id: 'standBar3', kind: 'barEnd', local: [2.25, -0.1], world: [31.23, -18.98], facing: -Math.PI / 2 },
  { id: 'standBar4', kind: 'barEnd', local: [2.25, 0.5], world: [31.82, -19.05], facing: -Math.PI / 2 },
  { id: 'highTable1a', kind: 'highTable', local: [3.65, 3], world: [34.13, -20.75], facing: Math.PI / 2 },
  { id: 'highTable1b', kind: 'highTable', local: [4.75, 3], world: [34, -21.84], facing: -Math.PI / 2 },
  { id: 'highTable2a', kind: 'highTable', local: [5.05, 4], world: [34.95, -22.26], facing: Math.PI / 2 },
  { id: 'highTable2b', kind: 'highTable', local: [6.15, 4], world: [34.82, -23.35], facing: -Math.PI / 2 },
];

export const STAFF_STATIONS = [
  { id: 'bartender', role: 'bartender', local: [-0.9, -1.11], world: [30.61, -15.73], facing: 0, note: 'Södra stråket, vänd mot vinväggen.' },
  { id: 'sommelier', role: 'sommelier', local: [0.9, 0.31], world: [31.8, -17.69], facing: Math.PI / 2, note: 'Norra stråkets östra ände, vid bottleAnchor.' },
  { id: 'server', role: 'server', local: [-4.1, 2.55], world: [34.63, -13], facing: -Math.PI / 2, note: 'Utanför passluckan.' },
  { id: 'cookHot', role: 'cook', local: [-5.95, 3.25], world: [35.55, -11.25], facing: -Math.PI / 2, note: 'Varm station mot västra väggen, plancha under kåpa.' },
  { id: 'cookCold', role: 'cook', local: [-5.5, 3.85], world: [36.09, -11.77], facing: 0, note: 'Kallskänk mot norra väggen. Ett steg från varm station.' },
  { id: 'dish', role: 'dish', local: [-6.35, 2.45], world: [34.81, -10.76], facing: Math.PI, note: 'Diskplatsen mot kökets södra vägg.' },
  { id: 'host', role: 'host', local: [5.535, -0.55], world: [30.38, -22.19], facing: Math.PI / 2, note: 'Per bakom värdpulten, vänd mot dörren.' },
  { id: 'dj', role: 'dj', local: [5.9, -4.15], world: [26.76, -22.11], facing: -Math.PI / 4, note: 'Bakom pulten i SO-hörnet, 0,25 m upp.' },
];

export const MISE_SPOTS = [
  { id: 'board', role: 'host', local: [6.835, -1.75], facing: -Math.PI / 2, note: 'Framför tavlan.' },
  { id: 'fridge', role: 'sommelier', local: [0.4, -1.12], facing: Math.PI / 2, note: 'Framför vinkylen i södra stråkets östra ände.' },
  { id: 'store', role: 'sommelier', local: [-5.75, -1.9], facing: -Math.PI / 2, note: 'Vid vinkylen i förrådet.' },
  { id: 'polish', role: 'bartender', local: [-0.9, -1.11], facing: Math.PI, note: 'Södra stråket, glasen på rad.' },
  { id: 'setTables', role: 'server', local: [-2.3, -3.6], facing: Math.PI, note: 'Norr om småborden.' },
];

/** Köplatserna. Innanför på dörrmattan, utanför på trottoaren (VENUE_OUTSIDE: 2,2 m trottoar, väntplatsen 1,9 m ut).
 *  Utanför står de på samma punkter i kartan som i kartkontrollen 2026-10-06. Marginalen till körbanan är minst 2,27 m. */
export const QUEUE_SPOTS = [
  { id: 'queueIn1', side: 'inside', order: 1, local: [6.635, 0.3], world: [31.09, -23.38] },
  { id: 'queueIn2', side: 'inside', order: 2, local: [6.735, 0.85], world: [31.62, -23.55] },
  { id: 'queueOut1', side: 'outside', order: 3, local: [7.785, 0.1], world: [30.75, -24.5] },
  { id: 'queueOut2', side: 'outside', order: 4, local: [7.935, -1.8], world: [28.85, -24.42] },
  { id: 'queueOut3', side: 'outside', order: 5, local: [8.035, -3.7], world: [26.95, -24.28] },
  { id: 'queueOut4', side: 'outside', order: 6, local: [8.135, -5.6], world: [25.05, -24.15] },
  { id: 'queueOut5', side: 'outside', order: 7, local: [8.185, -7.5], world: [23.16, -23.97] },
];
export const ENTRANCE = { local: [6.485, 0] as Vec2, door: [30.71, -23.94] as Vec2, waitingSpot: { local: [9.135, 0] as Vec2, world: [30.49, -25.83] } };
