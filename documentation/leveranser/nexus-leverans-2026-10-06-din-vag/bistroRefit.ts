// bistroRefit.ts — ombyggnaden från vinbar till bistro. D7, 2026-10-06.
//
// Samma rum som wineBarRoom.ts (15,6 × 11,8 m, dörren i östra väggen). Koordinater i rummets ram: x österut,
// z norrut (som wineBarRoom). Prototypen ritar planen med y = −z.
//
// Fyra steg, vart och ett ett tillstånd som spelas upp i ordning (1,7 s per steg i prototypen):
//   0 Vinbaren   som den är
//   1 Tömt       loungerna, DJ:n och tvåorna ut. Virke, stege och skyddsdukar in. Arbetsljus, svalare.
//   2 Byggt      väggen mot köket öppnas till ett pass, baren blir kortare och flyttar söderut, bänken byggs,
//                borden ställs in med stolarna uppställda
//   3 Dukat      stolarna ned, linne och papper, tallrik, bestick, glas och karaff
//   4 Tänt       en pendel över varje bord, lampetter längs bänken, vitt ljus i passet
//
// Golvzonerna lounge och dj utgår. Salen får ett varmare ekgolv. Figurernas kontrastband ska prövas mot det
// nya golvet (BISTRO_FLOOR) med checkPaletteAgainstFloors() innan rummet byggs.

export type Vec2 = [number, number];

export const BISTRO_FLOOR = { hall: '#ad9673', kitchen: '#a09786', barRunway: '#a08d74' };

export const BISTRO = {
  shelf: { x0: -2.85, x1: -2.45, z0: -5.4, z1: -2.4 },
  bar: { x0: -2.125, x1: -1.375, z0: -5.2, z1: -2.4 },
  stools: [-2.4, -3.2, -4.0, -4.8].map((z) => [-0.95, z] as Vec2),
  pass: { x0: -4.85, x1: -4.35, z0: -0.6, z1: 3.0, heatLamps: [2.4, 1.2, 0.0] },
  banquette: { x0: -1.6, x1: 7.2, z0: 5.25, z1: 5.7 },
  banquetteTables: [-0.6, 1.0, 2.6, 4.2, 5.8].map((x) => ({ at: [x, 4.65] as Vec2, w: 0.7, d: 0.6, seats: 2 })),
  fourTops: [[0.6, 1.6], [3.4, 1.6], [2.0, -1.6], [5.2, -3.6]].map((p) => ({ at: p as Vec2, w: 1.0, d: 1.0, seats: 4 })),
  twoTops: [[0.6, -4.9], [2.2, -4.9]].map((p) => ({ at: p as Vec2, w: 0.7, d: 0.7, seats: 2 })),
  hostDesk: [6.8, -1.4] as Vec2
};

export function bistroSeats(): number {
  return BISTRO.banquetteTables.length * 2 + BISTRO.fourTops.length * 4 + BISTRO.twoTops.length * 2 + BISTRO.stools.length; // 34
}

export const REMOVED_FROM_WINEBAR = ['lounges (2 × 4 dynor)', 'loungeTables', 'djBooth', 'twoTops (3)', 'stools (2 av 6)', 'zone lounge', 'zone dj'];

export const LAYING = {
  cloth: { linen: '#f1ece2', paper: '#e5ddcd', overhang: 0.06 },
  perCover: ['plate', 'knife', 'fork', 'waterGlass'],
  perTable: ['carafe'],
  breadComesWith: 'water'
};

export const LIGHTING = {
  before: { djSpots: ['#ffaa5a', '#aa82ff'], candles: 'loungeTables + twoTops', barStrip: true, level: 0.58 },
  after: { pendantPerTable: { colour: '#ffc480', radiusM: 1.5 }, sconces: { wall: 'north', pitchM: 1.6 }, pass: { colour: '#fff0d7' }, level: 0.7 },
  note: 'Ljusare men lika varmt. Rött och grönt används inte.'
};

export const REFIT_PHASES = [
  { id: 'winebar', key: 'refit.p0' }, { id: 'cleared', key: 'refit.p1' }, { id: 'built', key: 'refit.p2' },
  { id: 'laid', key: 'refit.p3' }, { id: 'lit', key: 'refit.p4' }
];
export const REFIT_PLAY = { secPerPhase: 1.7, blendSec: 1.1 };

export const FLAGS = {
  room: 'bistroRoom finns inte. Bygg den som wineBarRoom med BISTRO i stället för loungerna och DJ:n, eller som ett läge i wineBarRoom.',
  footprint: 'Rummet är fortfarande större än huset w869907975 (kartkontrollen 2026-10-06 §1.3). Ombyggnaden ändrar inte det.',
  closedDays: 'Hur många dagar bistron är stängd är CAREER.bistro.refitDays i balance.ts. Prototypen visar 3.'
};
