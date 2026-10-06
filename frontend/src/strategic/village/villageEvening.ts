// villageEvening.ts — byn i kvällsljus: kvällens ljus och de fyra nivåerna (byn, kvarteret, gatan, krogen).
// Leverans 2026-10-01, underlag till 288. Presentation, inte balans.
//
// Kvällens gång är `e`, 0–1, från att byn börjar skymma till att den sista krogen har stängt.
// Klockslagen och öppettiderna kommer från balance.ts och sim-lagret och räknas om till e innan
// de når presentationen. Inga klockslag i den här filen.
//
// Byns koordinater är spelets (content/world.ts, grythyttan-world.json ur OpenStreetMap): meter, +x österut,
// +z söderut, origo vid 59.70575 N, 14.53723 E. Kamerans mål och vridning på nivåerna står i rummets ram
// (wineBarRoom.ts: lokal +X mot entrén, origo i byggnaden w869907975:s mitt, placerad med orientedBbox), så att
// krogens nivå är teaterns kamera (PLAYER_CAMERA) och kön inte hoppar när teatern tar över.

export type LevelId = 'village' | 'block' | 'street' | 'venue';

export interface LevelSpec {
  id: LevelId;
  /** Kamerans avstånd till målet i meter. */
  dist: number;
  pitch: number;
  /** Vridning i rummets ram: 0 = kameran står åt rummets lokala +Z, PI/2 = åt lokala +X (entrén). */
  yaw: number;
  /** Kamerans mål, meter. I rummets ram [lokal x, lokal z], eller i byns ram [x, z] när frame = 'world'. */
  target: [number, number];
  /** 'room' (förval): mål och vridning i rummets ram. 'world': i byns ram, yaw 0 = kameran söderut. */
  frame?: 'room' | 'world';
  /** Ljusets förstärkning på nivån, gånger VILLAGE_LIGHT.level. Längre ut behöver byn mer ljus för att hus, gator och
   *  människor ska gå att skilja åt. */
  light: number;
  /** Målets höjd i meter. */
  targetY?: number;
  /** Synfält i grader. Krogens nivå har teaterns (42°). */
  fov: number;
  /** Figurernas förstoring. 1 = verklig storlek, samma som teatern. 0 = figurerna ritas inte. */
  figureScale: number;
  /** Så här ritas en gäst. */
  guest: 'lantern' | 'figure';
  /** Så här ritas ett sällskap. */
  party: 'lantern' | 'patch' | 'members' | 'pavement';
  /** Så här ritas en food truck. */
  truck: 'glow' | 'model' | 'stringLights';
  /** Så här ritas en krog. */
  venue: 'halo' | 'windows' | 'sign' | 'facade';
  nameKey: string;
}

/** Från långt bort till nära. Mellan två nivåer interpoleras allt logaritmiskt på avståndet. */
export const LEVELS: LevelSpec[] = [
  // Hela byn: alla fem krogar och food truckarnas tre platser (torget, Måltidens hus och sjön) i bild samtidigt, i
  // 1440 × 900 och 1280 × 720, med plats för namnen i HUD:en ovanför. Kameran söderifrån. 660 m är det närmaste där allt ryms. Sällskapen är lyktor som
  // växer med avståndet, så att de syns på gatorna också här.
  { id: 'village', dist: 660, pitch: 0.95, yaw: 0.05, frame: 'world', target: [250, 130], fov: 34, light: 1.4, figureScale: 0, guest: 'lantern', party: 'lantern', truck: 'glow', venue: 'halo', nameKey: 'byk.level.village' },
  // Vår krog, torget med Grillvagnen och Torgkrogen.
  { id: 'block', dist: 90, pitch: 0.95, yaw: -0.05, frame: 'world', target: [23, -21], fov: 34, light: 1.3, figureScale: 1.6, guest: 'figure', party: 'patch', truck: 'model', venue: 'windows', nameKey: 'byk.level.block' },
  // Prästgatan framför vår dörr och trottoaren med kön.
  { id: 'street', dist: 42, pitch: 0.9, yaw: 1.0, target: [9, -2], fov: 34, light: 1.0, figureScale: 1.25, guest: 'figure', party: 'members', truck: 'stringLights', venue: 'sign', nameKey: 'byk.level.street' },
  // Teaterns kamera (wineBarRoom PLAYER_CAMERA: 24 m, 50°, fov 42°, yaw 0,7, mål [0,2, 0,9, 0,2]). Här tar teatern över.
  { id: 'venue', dist: 24, pitch: 0.873, yaw: 0.7, target: [0.2, 0.2], targetY: 0.9, fov: 42, light: 0.7, figureScale: 1, guest: 'figure', party: 'pavement', truck: 'stringLights', venue: 'facade', nameKey: 'byk.level.venue' }
];

/** Övergångarna mellan sätten att rita, på kamerans avstånd i meter. */
export const BLEND = {
  /** Lyktorna för sällskapen tonar in mellan de här avstånden. */
  lantern: [100, 150] as [number, number],
  /** Figurerna ritas närmare än så här. */
  figuresUntil: 135,
  /** Fläcken under sällskapet: full mellan de två mittvärdena, borta utanför de yttre. */
  patch: [42, 58, 120, 140] as [number, number, number, number],
  /** Ljusslingan under vagnens markis syns närmare än så här, och tonar ut över 20 m. */
  truckLights: 78,
  /** Glorian över krogarnas tak tonar in mellan de här avstånden. */
  halo: [85, 160] as [number, number],
  /**
   * Taket på vår krog. Fullt på längre ut än roof[1], borta närmare än roof[0]. Däremellan lyfts det och tonar ut,
   * väggarna på kamerans sida kapas (updateCutaway, som i teatern) och rummet lyses upp inifrån. På roof[0] har
   * teatern tagit över. Kamerans mål och vridning är redan teaterns, se LEVELS.venue.
   */
  roof: [26, 40] as [number, number],
  /** Hjulets gränser. */
  zoom: [20, 760] as [number, number]
};

/**
 * Ljusnivån i byn, inställbar. level multiplicerar himlens ljus (hemi och måne) och nivåns förstärkning (LEVELS.light),
 * och höjer exponeringen lite. 1 = förval. range = reglagets gränser. Ljusreglerna (LIGHTS) ändras inte: lyktor,
 * fönster och krogar tänds och släcks som förut, bara mörkret mellan dem är ljusare.
 */
export const VILLAGE_LIGHT = { level: 1, range: [0.5, 2] as [number, number], exposurePerLevel: 0.25 };

export type PhaseId = 'dusk' | 'blue' | 'evening' | 'night';
export const PHASES: { id: PhaseId; from: number; nameKey: string }[] = [
  { id: 'dusk', from: 0, nameKey: 'byk.phase.dusk' },
  { id: 'blue', from: 0.14, nameKey: 'byk.phase.blue' },
  { id: 'evening', from: 0.32, nameKey: 'byk.phase.evening' },
  { id: 'night', from: 0.8, nameKey: 'byk.phase.night' }
];

/** Himlen och ljuset utomhus, interpolerat mellan nycklarna. */
export interface SkyKey { e: number; bg: string; hemiSky: string; hemiGround: string; hemi: number; moon: string; moonI: number; lake: string; exposure: number }
export const SKY: SkyKey[] = [
  { e: 0, bg: '#7482a8', hemiSky: '#c8c4e2', hemiGround: '#6a5844', hemi: 4.4, moon: '#f0c090', moonI: 1.8, lake: '#5a7090', exposure: 1.35 },
  { e: 0.14, bg: '#3a4870', hemiSky: '#94a4dc', hemiGround: '#4a3e32', hemi: 3.6, moon: '#b8c4f2', moonI: 2.0, lake: '#33507a', exposure: 1.4 },
  { e: 0.32, bg: '#26304c', hemiSky: '#8494d2', hemiGround: '#3e3428', hemi: 3.1, moon: '#aebcf0', moonI: 2.0, lake: '#25395e', exposure: 1.45 },
  { e: 1, bg: '#161d2e', hemiSky: '#6c7cb4', hemiGround: '#2e281e', hemi: 2.3, moon: '#9aa8e0', moonI: 1.6, lake: '#1a2840', exposure: 1.45 }
];

/**
 * Ljusens regler. Varje lykta och varje hus får ett eget e inom intervallet (ett frö per föremål),
 * så att byn inte tänds eller släcks på en gång.
 */
export const LIGHTS = {
  /** Gatlyktorna tänds en i taget, med ett kort fladder (sekunder i realtid). */
  lamps: { on: [0.03, 0.15] as [number, number], flickerS: 0.5, poolRadiusM: 5 },
  /**
   * Bostadshusen. Tänds i skymningen. En del av husen går ut och äter: då släcks huset i samma
   * stund som sällskapet kommer ut på gatan, och tänds igen när sällskapet är hemma. I spelet är det
   * sim-lagret som väljer vilka hus som går ut. Presentationen följer bara sällskapet.
   */
  homes: { on: [0.0, 0.1] as [number, number], out: [0.12, 0.42] as [number, number], back: [0.7, 0.86] as [number, number], bed: [0.84, 1.0] as [number, number], goesOutShare: 0.45, tvShare: 0.12 },
  /** Måltidens hus släcks medan studenterna går ut. */
  school: { off: [0.16, 0.42] as [number, number], lateKitchen: 0.6 },
  /** Hotellets rum ovanför matsalen tänds när gästerna går upp. */
  hotelRooms: { on: [0.3, 0.7] as [number, number], off: [0.86, 1.0] as [number, number] },
  /** Krogarna. Köket lyser innan krogen öppnar (mise en place) och en stund efter stängning (städning). */
  venue: { cleaningS: 20, haloPerGuest: 5, rampS: 1.2 },
  /** Kyrktornet är belyst från marken när lyktorna är tända. */
  church: { on: [0.04, 0.12] as [number, number] }
};

export const COLOURS = {
  lamp: '#ffb468',
  lampHead: '#ffe0a0',
  home: ['#ffbf6a', '#ffd29a', '#ffb058'],
  tv: '#c8d4f0',
  venue: '#ffcf86',
  /** Vår krog lyser med ljuslågans färg (WARM.color.candle), de andra med lyktornas. */
  ourVenue: '#ffd58f',
  windowOff: '#17120e',
  headlight: '#ffe8b0',
  /** Gästtyperna, samma som WARM.guest. */
  guest: { student: '#6fa3c0', medel: '#c9a878', hog: '#a3a8bd', social: '#e07a8f', miljardar: '#e8b93a' }
};

/**
 * ORDER 302d (Anders 2026-10-06) — gatans figurer tar scenens ljus och har en lägsta ljushet på kvällen
 * (scene/village/streetFigureLight.ts). minLight är andelen av figurens egen färg som kroppen minst lyser
 * med, före exponeringen och tonmappningen. Golvet gäller medan byns kvällsljus är tänt (EveningLighting.tsx).
 *
 * PLATSHÅLLARE: värdet levereras av Design. Startvärdet 0,55 är ur 302c:s lyktmätning
 * (scripts/order302d-startvarde.mjs → reports/order302d/startvarde.json): det värde som ger flest mätningar
 * inom bandet 1,8–3,6 mot bakgrunden som 302c mätte.
 */
export const STREET_FIGURE_LIGHT = { minLight: 0.55 };

/**
 * Kön vid vår dörr har inga egna platser här: den står på rummets köplatser (wineBarRoom.ts room.queueSpots,
 * dörrmattan och trottoaren), omräknade till byn med rummets placering. Medlemmarna står inom
 * memberRadiusM från platsen, bredvid varandra. Köns gränser står i balance (VILLAGE_QUEUE).
 */
export const QUEUE = { memberRadiusM: 0.6 };
