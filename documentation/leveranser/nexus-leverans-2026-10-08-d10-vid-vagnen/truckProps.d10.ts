// truckProps.d10.ts — D10: nya föremål vid vagnen. Vagnens ram som i truckProps.ts (+X mot bakgaveln, +Z ut från luckan), i meter.
// Föremål på bord och i händer ritas × PROP_SCALE (1,5). Getingarna ritas × WASP_SCALE.
export const WASP_SCALE = 7; // förslag: under 7 syns de inte på 6 m

// Hyllan öster om luckan har nu tre såser. Ersätter shelf.ketchup / shelf.mustard / shelf.napkins i truckProps.ts.
export const SHELF_D10 = { ketchup: [1.63, 1.28], mustard: [1.75, 1.28], mildMustard: [1.87, 1.28], napkins: [2.06, 1.28] } as const;
export const SAUCE_LID = { r: 0.034, colour: '#efe1bf', rim: '#b98a3c' }; // locket, × 1,5 i spelet

// Grillens vegodel: västra delen bakom en list, med egen tång (mässingshandtag).
export const GRILL_VEG = { x0: 0.85, x1: 1.2, divider: { x: 1.2, w: 0.03 }, items: [0.95, 1.1], tongsRest: [1.03, -0.36], tongsColour: '#b98a3c' };
export const GRILL_REGULAR = { items: [1.33, 1.57, 1.81], tongsRest: [1.88, -0.28] }; // ersätter 1,1 / 1,4 / 1,7

// Lådan med korv bredvid grillen. Fylls från grillsidan. "Få kvar" = SAUSAGE.lowAt i balance.ts.
export const SAUSAGE_BOX = { x0: 0.2, x1: 0.7, z0: -0.88, z1: -0.45, cols: 10, rows: 2, lidUp: true };

// Betalhyllan under luckan: kortläsaren och Swish-skylten.
export const PAY_LEDGE = { x0: -0.95, x1: -0.25, z0: 1.16, z1: 1.48, height: 1.05 };
export const TERMINAL = { p: [-0.47, 1.33], size: [0.08, 0.17], states: ['idle', 'wait', 'error'] as const, errorBlinkHz: 1.2 };
export const SWISH_SIGN = { p: [-0.78, 1.33], size: [0.15, 0.21] };

// Vattenskålen vid bord B, längst bort från luckan. Står där alla kvällar.
export const WATER_BOWL = { p: [5.82, 1.62], r: 0.11 };

// Regnet: ståbord A flyttas in under markisen, och kön står tätt.
export const RAIN_TABLE = { from: 'A', to: [1.85, 2.0], spots: [[1.36, 2.06], [2.32, 2.04], [1.85, 1.53]] };
export const QUEUE_TIGHT = { order: [-0.5, 1.95], collect: [0.75, 1.9], line: [[-1.08, 2.0], [-1.63, 2.0], [-2.18, 2.02], [-2.73, 2.1], [-3.28, 2.15], [-3.83, 2.2]], spacing: 0.55 }; // ersätter queueRain, över personalSpace RAD 0,5

// Grillvagnen: ny skylt. I Grillvagnens ram (rivalTorget.ts), +Z ut från luckan.
export const RIVAL_SIGN = { p: [-3.1, 2.6], size: [0.6, 0.95], notice: '#e9c46a', text: 'pin.rival.text' };
export const RIVAL_QUEUE_D10 = [[-1.0, 3.0], [0.2, 3.05], [1.3, 3.3]];

// Stamgästen står vid VÅR vagn (beslut 2026-10-08), i vagnens ram. Kaffet är bjudet av spelaren.
// Står söder om markisen, öster om kön och utanför gästernas väg till sopkorgen. Vänd mot Grillvagnens skylt,
// som i vagnens ram ligger på [7,27, 9,49] (kartan [25,26, −13,27]), cirka 8,5 m bort på andra sidan torget.
export const TRUCK_REGULAR = { p: [1.3, 3.5], faces: 'RIVAL_SIGN', look: { body: '#465452', hair: '#8a6a44', cap: '#d7a24c' }, prop: 'cupLid', clips: ['fika.sipCup', 'guest.toastCup'], cycleS: 6 };
