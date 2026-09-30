// staffRing.ts — ringen under personalen. Provspel 2026-09-30, beställning 2.
// Ren beskrivning: mått i meter, färger som hex, tider i sekunder. Code bygger meshen.

export type StaffRole = 'host' | 'waiter' | 'sommelier' | 'bartender' | 'cook' | 'dishwasher' | 'dj';

/** Rollens färg. Guld och ljuslåga (handling, raketen) och grönt och rött (rätt och fel) används inte här. */
export const ROLE_COLOUR: Record<StaffRole, string> = {
  host: '#f4e6cc',       // grädde
  waiter: '#4fc3c8',     // turkos
  sommelier: '#b98ae0',  // plommon
  bartender: '#f2994a',  // bärnsten
  cook: '#7fa8ff',       // blå
  dishwasher: '#a9b3bb', // stål
  dj: '#ee6fb5'          // magenta
};

export const RING = {
  innerM: 0.42, outerM: 0.56,         // 0,14 m streck. 52 px bred och 6 px streck vid 24 m, 1440 × 900.
  yM: 0.036,                           // över golvet, under fötterna
  glowRadiusM: 0.8,                    // mjuk pöl i rollens färg, additiv
  material: { toneMapped: false, depthWrite: false },
  /** En svag kopia utan djuptest syns genom disk, bar och halvväggar. */
  xrayOpacity: 0.3,
  hoverScale: 1.12,
  states: {
    free:  { ring: 0.9,  arc: false, glow: 0.16 },   // ledig eller på väg
    busy:  { ring: 0.45, arc: true,  glow: 0.34 },   // uppgift pågår: bågen fylls medurs från klockan 12
    plain: { ring: 1.0,  arc: false, glow: 0.34 }    // om uppgiften inte ska visas
  },
  arcSteps: 48,                        // förbyggda geometrier, ingen ny per bildruta
  /** Ringen ligger kvar under en raket. Strålkastaren (leverans 3) läggs ovanpå och dämpar de andra till 45 %. */
  dimOthersInRocket: 0.45
} as const;

/** Klippets id → uppgiften i etiketten. Första träffen gäller. */
export const TASK_OF_CLIP: [prefix: string, task: string][] = [
  ['waiter.takeOrder', 'order'], ['waiter.carry', 'carry'], ['waiter.serve', 'serve'], ['waiter.clear', 'clear'],
  ['waiter.presentBill', 'bill'], ['waiter.pickUp', 'pickUp'], ['somm.pour', 'pour'], ['somm.', 'wine'],
  ['cook.plate', 'plate'], ['cook.', 'cook'], ['dish.', 'wash'], ['bar.setDown', 'setDown'],
  ['staff.walk', 'walk'], ['staff.dodge', 'dodge'], ['staff.idle', 'idle']
];
/** Uppgifter som räknas som lediga: tunn ring, ingen båge. */
export const FREE_TASKS = ['idle', 'walk'] as const;

/** Beslut 2026-09-30. Tallrikar, glas och mat förstoras för att synas från 24 m. Bara det synliga: handpunkter och bordsplacering står kvar i meter. */
export const PROP_VISUAL_SCALE = {
  game: 1.5,      // 24 m
  rocket: 1.5,    // 10–14 m: samma, så att inget byter storlek när kameran glider in
  /** Id ur CATALOGUE i tableware.ts. Maten och vinet följer med som fyllning. */
  appliesTo: ['plate', 'sidePlate', 'soupBowl', 'wineGlass', 'waterGlass', 'wineBottle', 'waterBottle', 'carafe', 'fork', 'knife', 'spoon', 'napkin'],
  /** Redan stora nog, eller bärs med två händer och skulle krocka med kroppen: står kvar i 1,0. */
  keep: ['tray', 'cake', 'menu', 'pad', 'billFolder'],
  /** Skalan sätts kring föremålets nollpunkt. Barn på en bricka eller tallrik skalas inte en gång till. */
  pivot: 'origin'
} as const;
