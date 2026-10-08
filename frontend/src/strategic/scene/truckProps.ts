// ORDER 319b — Designs D9 (documentation/leveranser/nexus-leveranser-2026-10-08-d9/
// nexus-leverans-2026-10-07-d9-livet-vid-luckan/truckProps.ts och curiousMarker.ts): platserna vid
// spelarens vagn, i vagnens ram (+X längs vagnen mot bakgaveln, +Z ut från luckan, meter).
// Oförändrade. Kontrollen mot gator, hus och rivalen står i Designs luckanPlats.json.

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
