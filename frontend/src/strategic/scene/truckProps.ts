// ORDER 319b — Designs D9 (documentation/leveranser/nexus-leveranser-2026-10-08-d9/
// nexus-leverans-2026-10-07-d9-livet-vid-luckan/truckProps.ts och curiousMarker.ts): platserna vid
// spelarens vagn, i vagnens ram (+X längs vagnen mot bakgaveln, +Z ut från luckan, meter).
// Oförändrade. Kontrollen mot gator, hus och rivalen står i Designs luckanPlats.json.
//
// ORDER 319c — resten av D9:s truckProps.ts, oförändrad (TRUCK_PROPS, EAT_SPOTS, EAT_FLOW), utom den milda
// senapen på hyllan vid luckan (Anders 2026-10-08, n18: "Lägg till mild senap på vagnen"): en tredje flaska
// framför de två andra (TRUCK_PROPS.condiments.mildMustard).

export type Vec2 = [number, number];

/** De nyfikna (curiousMarker.ts CURIOUS_SPOTS). */
export const CURIOUS_SPOTS = {
  /** Där guest.slowDown börjar, för den som kommer från väster och från öster. */
  trigger: { west: [-5.7, 4.75] as Vec2, east: [0.9, 4.75] as Vec2 },
  /** Framför menyskylten, vänd mot norr (−Z). */
  readSpot: [-2.2, 4.15] as Vec2,
  /** Den som går vidare tar upp farten här, åt det håll den gick. */
  walkOn: { east: [-0.9, 4.75] as Vec2, west: [-3.4, 4.75] as Vec2 },
  /** Till kön: via en punkt 0,15 m öster och 0,75 m söder om köns sista lediga plats. */
  joinVia: [0.15, 0.75] as Vec2
};

/** Menyskylten (truckProps.ts menuBoard): flyttad från D7:s [−2,8, 1,5] till framför kön, vänd mot torget. */
export const MENU_BOARD = { at: [-2.2, 3.5] as Vec2, size: [0.6, 0.95] as Vec2, footprint: [0.64, 0.46] as Vec2 };

/** Gångvägen för förbipasserande (EAT_SPOTS.path). Västra änden kommer från Prästgatan, östra går upp till gatan Torget. */
export const WALKWAY: Vec2[] = [[-10.5, 4.75], [2.5, 4.75], [7.6, 4.6], [7.6, -0.5], [7.2, -3.6]];

export const PROP_SCALE_HANDHELD = 1.5;

export const TRUCK_PROPS = {
  standTable: { at: { A: [3.9, 1.2] as Vec2, B: [5.4, 1.2] as Vec2, C: [4.65, 2.9] as Vec2 }, top: { diameter: 0.68, height: 1.1 }, base: { diameter: 0.5 }, column: 0.06, colour: { top: '#7d6a52', base: '#26221f' }, holder: 'napkinHolder i mitten, vriden 0,3 rad' },
  bench: { centre: [5.75, 2.75] as Vec2, length: 1.4, depth: 0.42, seatHeight: 0.45, back: false, along: 'Z', facing: '−X (väster, mot borden)', seats: [[5.8, 2.42], [5.8, 3.08]] as Vec2[], colour: '#7d6a52', legs: '#3a3029' },
  torch: {
    at: [[-1.9, 3.05], [-4.7, 3.05], [2.45, 3.95], [4.6, 4.05], [6.75, 4.0], [6.6, 1.0]] as Vec2[],
    candle: { diameter: 0.1, height: 0.08, colour: '#c9b48a' }, holder: { height: 0.75, cup: 0.13, colour: '#26221f' },
    flame: { height: 0.12, colour: '#ffaa46', core: '#ffe9b8', flicker: '13 och 29 Hz, ±15 %', windLeanM: 0.09 },
    light: { radius: 1.8, colour: '#ffa850', intensity: 0.34 }, litFrom: 'truckEvening.ts TORCHES'
  },
  heater: { at: [3.55, 2.45] as Vec2, base: { diameter: 0.48 }, hood: { diameter: 0.8, height: 2.2 }, colour: { steel: '#9b968e', base: '#5b5752' }, fuel: 'gasol', onWhen: 'truckWeather.ts cool', light: { radius: 2.5, colour: '#ff8c40', intensity: 0.38 }, ring: [[4.3, 2.5], [2.95, 2.0], [2.85, 2.8], [3.75, 3.17]] as Vec2[] },
  bin: { at: [2.7, 3.2] as Vec2, approach: [2.72, 2.72] as Vec2, approachFacing: '+Z', diameter: 0.42, height: 0.85, flap: { width: 0.24, depth: 0.1, openS: 0.7 }, colour: '#3f3b36', fillShows: 'vita bitar i luckan när den slår upp' },
  napkinHolder: { size: [0.18, 0.1, 0.14], gameScale: 1.5, colour: { steel: '#a9a39a', napkins: '#f7f3ea' }, at: ['standTable.A/B/C mitten', 'shelf.napkins'], windWeight: 'en tyngd över servetterna i blåsten (truckWeather.ts wind)' },
  condiments: { ketchup: { at: [1.67, 1.28] as Vec2, colour: '#a7432c', cap: '#f2ece0' }, mustard: { at: [1.8, 1.28] as Vec2, colour: '#d8a930', cap: '#2c2a28' }, mildMustard: { at: [1.735, 1.19] as Vec2, colour: '#ead98a', cap: '#2c2a28' }, bottle: { diameter: 0.06, height: 0.2 }, gameScale: 1.5 },
  shelf: { x0: 1.55, x1: 2.2, z0: 1.15, z1: 1.4, height: 1.05, colour: '#c9c3b6', on: 'vagnens sida, öster om luckan, under markisen', napkins: [2.03, 1.28] as Vec2, rainSpots: [[1.72, 1.8], [2.18, 1.8]] as Vec2[] },
  menuBoard: { at: [-2.2, 3.5] as Vec2, facing: '+Z (söder, mot torget)', size: [0.6, 0.95], footprint: [0.64, 0.46], kind: 'gatupratare, griffeltavla i träram', colour: { frame: '#5e4b3a', board: '#2b2a28', chalk: '#ece6d6', mustard: '#e6bb34' },
    content: 'Krita: en rubrik, fem rader och en korv som tecken. Ingen text i modellen. Menyn visas i HUD:en när man pekar på skylten (menu.* i luckanStrings.ts, priserna {price} från balance.ts).', readSpot: [-2.2, 4.15] as Vec2 },
  hotdog: { size: [0.2, 0.06], gameScale: 1.5, colours: { bun: '#d6a45c', sausage: '#8c4526', mustard: '#e6bb34' }, tray: { size: [0.22, 0.09], colour: '#efe6d2' }, heldAcross: true, shrinks: 'per tugga, 0,35–1 av längden' },
  plate: { diameter: 0.23, gameScale: 1.5, colour: '#f4efe4', mash: '#eedca6', sausage: '#8c4526', fork: '#c8c2b8', emptiesWith: 'guest.eatPlate' },
  drinks: { can: { diameter: 0.066, height: 0.115, colour: '#3f6f8f', rim: '#d4cfc5' }, cup: { diameter: 0.08, height: 0.1, colour: '#f4efe4', sleeve: '#b98a3c' }, gameScale: 1.5 },
  smoke: {
    from: 'TRUCK_LAYOUT.chimney', heightM: 2.6, risesToM: 5.0, emitEveryS: 0.18,
    puff: { r0: 0.14, growthPerS: 0.28, lifeS: [3.2, 4.2], driftX: 0.45, colour: '#d6cec2', alpha: 0.3 },
    perWeather: 'truckWeather.ts smoke', onFlip: 'en pust och fem gnistor (truck.grill flip)'
  }
};

/** Var de som äter står. Ätplatser och vägarna dit, i vagnens ram. */
export const EAT_SPOTS = {
  table: { 'A-W': [3.35, 1.2], 'A-E': [4.45, 1.2], 'A-S': [3.9, 1.75], 'B-E': [5.95, 1.2], 'B-S': [5.4, 1.75], 'C-N': [4.65, 2.35], 'C-S': [4.65, 3.45], 'C-W': [4.1, 2.9] } as Record<string, Vec2>,
  bench: [[5.8, 2.42], [5.8, 3.08]] as Vec2[],
  heater: TRUCK_PROPS.heater.ring, shelf: TRUCK_PROPS.shelf.rainSpots,
  via: { 'A-E': [[4.3, 1.8]], 'B-E': [[4.6, 1.8], [6.0, 1.75]], 'C-S': [[4.05, 2.0], [4.2, 3.3]], 'C-W': [[4.05, 2.05]], 'C-N': [[4.05, 2.05]], bench0: [[4.05, 2.05], [5.25, 2.15]], bench1: [[4.05, 2.05], [5.25, 2.2], [5.3, 3.08]], heat0: [[4.1, 1.9]] },
  entry: [2.6, 2.1] as Vec2, toBin: [2.75, 2.05] as Vec2,
  leave: { step: [2.25, 3.05] as Vec2, west: [[2.2, 4.75], [-10.5, 4.75]], east: [[2.4, 4.75], [7.6, 4.6], [7.6, -0.5], [7.2, -3.6]] },
  /** Gångvägen för förbipasserande. Västra änden kommer från Prästgatan, östra går upp till gatan Torget. */
  path: [[-10.5, 4.75], [2.5, 4.75], [7.6, 4.6], [7.6, -0.5], [7.2, -3.6]] as Vec2[]
};

/** Ordningen för den som har fått maten. Klippen finns i eatingClips.ts. */
export const EAT_FLOW = {
  table: ['guest.walk', 'guest.eatBun|guest.eatPlate ×3', 'guest.drink', 'guest.wipeNapkin', 'guest.walk → bin.approach', 'guest.binNapkin', 'guest.leaveTable', 'guest.walk'],
  heater: ['guest.walk', 'guest.eatBun ×2', 'guest.warmHands', 'guest.eatBun ×1', 'guest.drink (muggen)', 'guest.wipeNapkin', '…'],
  bench: 'som table, sittande (c.seated), med brickan i vänster hand och muggen',
  noSpot: 'tar maten med sig: guest.walk med brickan ut på gångvägen',
  kind: 'korv i bröd eller korv med mos, andelen från balance.ts (TRUCK.menuMix). Bänken och värmaren: bara korv i bröd.',
  onTable: 'brickan eller tallriken och burken ställs vid 42 % från bordets mitt mot gästen, burken 0,15 m åt sidan'
};

/** ORDER 319c — vägen från däckets ingång till borden österut går mellan ståbord A och värmaren: Designs raka
 *  linje från EAT_SPOTS.entry till den första via-punkten gick 0,14 m från värmarens fot, mindre än en halv
 *  figurbredd (scene/__tests__/order319cPlatsen.test.ts). Ett steg här först, mitt i passagen. */
export const EAT_DECK_STEP: Vec2 = [3.2, 1.88];

/** ORDER 319c — från sopkorgen ut på gångvägen: Designs linje från EAT_SPOTS.leave.step till gångvägen gick
 *  0,06 m (österut) och 0,16 m (västerut) från marschallen vid däckets sydvästra hörn. Ett steg väster om den först. */
export const EAT_LEAVE_STEP: Vec2 = [2.1, 4.0];

/** ORDER 319c — vägen bort från sopkorgen, åt väster eller öster (Designs EAT_SPOTS.leave). */
export function leavePath(east: boolean): Vec2[] {
  const L = EAT_SPOTS.leave;
  return [L.step, EAT_LEAVE_STEP, ...((east ? L.east : L.west) as Vec2[])];
}

/** ORDER 319c — vägen till en ätplats (vagnens ram), från hämtplatsen: upp på däcket vid ingången, mellan bordet
 *  och värmaren och runt borden (EAT_SPOTS.via). Till hyllan i regnet raka vägen. Tillbaka samma väg. */
export function eatPath(key: string, collect: Vec2, spot: Vec2): Vec2[] {
  if (key.startsWith('shelf')) return [collect, spot];
  const via = ((EAT_SPOTS.via as Record<string, number[][]>)[key] ?? []) as Vec2[];
  return [collect, EAT_SPOTS.entry, ...(via.length > 0 ? [EAT_DECK_STEP] : []), ...via, spot];
}

/** ORDER 319c — från ätplatsen till sopkorgen: tillbaka runt borden till däckets ingång och fram till sopkorgen
 *  (Designs EAT_SPOTS.toBin och bin.approach). */
export function binPath(key: string, spot: Vec2): Vec2[] {
  if (key.startsWith('shelf')) return [spot, EAT_SPOTS.toBin, TRUCK_PROPS.bin.approach];
  const back = eatPath(key, EAT_SPOTS.entry, spot).slice(1, -1).reverse();
  return [spot, ...back, EAT_SPOTS.toBin, TRUCK_PROPS.bin.approach];
}

