// ORDER 306b — Designs D8 decanterProps.ts, oförändrad (documentation/leveranser/nexus-leverans-2026-10-08-d8-vinbaren/, (42)).
// decanterProps.ts — karaffen i rummet (order 306b §4). Karafferingen görs vid bordet. Loungebord B i vinbaren (wineBarHouse.ts LAYOUT.lounge, cx 1,4, tableZ 3,3).
// Rummets ram som wineBarHouse.ts. Bordet: x 0,8–2,0, z 3,075–3,525. Föremålen ritas 1,5 gånger verklig storlek (PROP_SCALE).
export type Vec2 = [number, number];
export const VB40_TABLE = { table: 'loungeB', seats: ['loungeB1', 'loungeB2', 'loungeB3'], sommelier: { at: [1.4, 2.72] as Vec2, facing: 0, after: [1.95, 2.62] as Vec2 } };

export const DECANTER_PROPS = {
  decanter:  { local: [1.12, 3.24] as Vec2, prop: 'decanter', fill: { present: 0, decant: 0.55, cleared: 0.8 } },
  candle:    { local: [1.5, 3.16] as Vec2, prop: 'candle', holder: 'brass', lit: true, light: { radius: 0.75, colour: 'rgba(255,176,90)', intensity: 0.3 } },
  bottle:    { local: [1.78, 3.3] as Vec2, prop: 'wineBottle', state: 'empty', standing: true, onlyWhen: 'cleared' },
  corkDish:  { local: [1.92, 3.14] as Vec2, prop: 'corkDish', onlyWhen: 'cleared' },
  glasses:   [[0.92, 3.44], [1.4, 3.46], [1.88, 3.44]] as Vec2[]
};
/** Tillstånden. Ljuset och karaffen står på bordet så länge situationen pågår; den tomma flaskan kommer när den är klarad. */
export const DECANTER_STATES = {
  present: { clip: 'somm.presentBottle', note: 'Flaskan vågrätt i båda händerna med etiketten mot gästerna. Karaffen och det tända ljuset står redan på bordet.' },
  decant:  { clip: 'somm.decant', note: '{name} karafferar. Flaskan i höger hand, halsen över karaffens mun och ljuset under halsen. Vänster hand håller karaffen. En tunn stråle (#6e1624).' },
  cleared: { clip: 'somm.setEmptyBottle', note: 'Den tomma flaskan står till höger om ljuset med korken på ett fat. Glasen är fyllda. Karaffen och ljuset står kvar tills sällskapet går.' },
  failed:  { note: 'Vid fel och halvt grepp spelas scenen klart som förut. Om personalen tar över (tiden ute) karafferar {name} rätt. Den tomma flaskan ställs ändå på bordet; vid fällan "Gör det vid baren" står karaffen och flaskan på baren i stället (bottleAnchor).' }
};
/** Nya föremål i tableware.ts. */
export const NEW_TABLEWARE = {
  candle:   { size: [0.06, 0.06, 0.22], holder: 'mässingsstake Ø 0,09', grip: 'pinch', restsOn: ['table', 'bar'] },
  corkDish: { size: [0.08, 0.01, 0.08], note: 'Fat Ø 0,08 med korken liggande', restsOn: ['table'] }
};
/** Nya eller ändrade klipp i figureClips.ts. somm.decant finns sedan vardagens koreografi. */
export const NEW_CLIPS = {
  'somm.presentBottle': 'finns (presentBottle i serviceRituals). Etiketten mot gästerna, 1,5 s stilla.',
  'somm.lightCandle':  'Ny. Böjer sig mot bordet med tändaren, 1,8 s. Ljuset tänds vid u 0,6.',
  'somm.setEmptyBottle': 'Ny. Ställer flaskan till höger om ljuset och korken på fatet, 1,6 s. Ett halvt steg bakåt efteråt.'
};
