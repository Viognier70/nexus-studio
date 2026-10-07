// playerTruck.ts — spelarens egen vagn: svensk grill på Torget. D7, 2026-10-06.
//
// Ligger bredvid foodTruckRoom.ts och truckPitch.ts och ersätter inget. Vagnen är en FJÄRDE planform,
// 'trailer', som inte finns bland de tre fordonen i foodTruckRoom (hVan, boxVan, cabBox). Rivalerna
// (Grillvagnen, Tacovagnen i byTruckar.js) är skåpbilar med hytt. Spelarens vagn är en släpvagn utan hytt.
//
// ── Fyra tecken som skiljer den från rivalerna, uppifrån på 24 m ─────────────
//   1. Planformen: runda gavlar och dragstång med två gasolflaskor. Rivalerna är raka rektanglar med hytt.
//   2. Färgen: dalablå kaross med en gräddrand. Rivalerna är rödbrun och grön.
//   3. Markisen: hel duk i grädde med bågad kant i karossens blå. Rivalerna har randiga markiser.
//   4. Livet runt den: rök från skorstenen (grillen) och ett tillfälligt trädäck med ståbord och ljusslinga.
//      Rivalerna har ingen servering. Där äter man i kön.
//
// ── Taket ─────────────────────────────────────────────────────────────────
// Som truckPitch.setTruckCutaway: taket kapas för spelarens kamera och listen i livery blir kvar (0,26 m,
// bredare än skåpbilarnas, så att blått syns uppifrån). Skylten står kvar på bakkanten.
//
// ── Koordinater ───────────────────────────────────────────────────────────
// Vagnens ram: +X längs vagnen mot bakgaveln (grillen), +Z ut från luckan mot kön. Origo i karossens mitt.
// Kartans ram (grythyttan-world.json): meter, +x österut, +z söderut. Placeringen och alla mätningar mot
// vägar och hus finns i truckPlats.json.

export type Vec2 = [number, number];

export const TRUCK_COLOURS = {
  livery: '#2f4b6e',      // dalablå
  stripe: '#efe1bf',      // gräddrand och markis
  awning: '#efe1bf',
  scallop: '#2f4b6e',     // markisens bågkant
  interiorFloor: '#958f84',
  counter: '#cbc7be',     // bänken (inre disken vid luckan)
  grill: '#262220',
  sign: '#f3e6c8',
  pip: '#b98a3c',         // nivåns knappar på skylten
  deck: '#8b7558',
  planter: '#4f5c45'
};

/** Måtten i vagnens ram, meter. Bredden 2,30 håller sig under 2,60 (Rv 244). */
export const TRUCK_LAYOUT = {
  body: { x0: -2.3, x1: 2.3, z0: -1.15, z1: 1.15, endRadius: 1.0 },
  drawbar: { hitch: [-3.4, 0] as Vec2, gasBottles: [[-2.72, -0.32], [-2.72, 0.32]] as Vec2[] },
  hatch: { x0: -1.2, x1: 1.2, sill: 1.3 },
  awning: { x0: -1.5, x1: 1.5, z0: 1.15, z1: 1.85, height: 2.25 },
  counter: { x0: -1.35, x1: 1.35, z0: 0.7, z1: 1.0, top: 0.95 },
  grill: { x0: 0.85, x1: 1.95, z0: -0.95, z1: -0.35, top: 0.92, items: 3 },
  chimney: [1.75, -0.85] as Vec2,
  roofSign: { x0: -1.3, x1: 1.3, z0: -1.3, z1: -1.05, pips: 3 },
  stations: { grill: [1.4, -0.1] as Vec2, hatch: [0, 0.45] as Vec2 },
  /** Där grillaren ställer brickan och den vid luckan tar den (Surface 'pass'). */
  pass: [0.9, 0.85] as Vec2,
  queue: {
    order: [-0.5, 2.15] as Vec2,
    collect: [0.9, 2.15] as Vec2,
    line: [[-1.4, 2.3], [-2.3, 2.3], [-3.2, 2.3], [-4.1, 2.3], [-5.0, 2.3], [-5.9, 2.3]] as Vec2[]
  },
  aBoard: [-2.8, 1.5] as Vec2,
  /** Det tillfälliga serveringsområdet: pallar som trädäck, fyra planteringslådor med stolpar för ljusslingan. */
  servingArea: { x0: 3.0, x1: 6.2, z0: 0.2, z1: 3.8 },
  standTables: { A: [3.9, 1.2] as Vec2, B: [5.4, 1.2] as Vec2, C: [4.65, 2.9] as Vec2, radius: 0.34, height: 1.1 },
  /** Ätplatser vid ståborden: väster, öster och söder om varje bord, 0,55 m ut. */
  eatOffsets: [[-0.55, 0], [0.55, 0], [0, 0.55]] as Vec2[],
  bin: [3.3, 3.5] as Vec2,
  lightPosts: [[3.0, 0.2], [6.2, 0.2], [6.2, 3.8], [3.0, 3.8]] as Vec2[]
};

/** Placeringen på Torget. Se truckPlats.json för alla punkter i kartans ram och marginalerna. */
export const TRUCK_PITCH_TORGET = {
  centre: [17.0, -21.9] as Vec2,
  /** Vinkel i kartans ram (x→z), grader. Parallell med w122157681 Torget. I three.js: group.rotation.y = −angle. */
  angleDeg: -6.29,
  street: 'w122157681',
  facing: 'Luckan mot söder, in mot torgytan. Kön västerut under markisen, trädäcket österut.',
  checks: {
    minRoadMargin5m: 2.68,
    minRoadMargin6_5m: 1.93,
    insideAnyBuilding: false,
    gapToRivalTorgetSpotM: 5.56,
    gapServingAreaToWineBarQueueM: 1.59
  }
};

/** Besättning: en vid grillen, en vid luckan. Med en person går hon mellan stationerna (poseHatchServe). */
export const TRUCK_CREW = {
  grill: { station: 'grill', uniform: '#425646', apron: '#e6e0d0', clips: ['truck.grill', 'cook.toPass'] },
  hatch: { station: 'hatch', uniform: '#5e4d55', clips: ['truck.hatchServe', 'truck.wipeCounter'] }
};

/** Nivån visas med knappar på skylten (venueTier.ts). Vagnen börjar på Enkel. */
export const TRUCK_DEFAULT_TIER = 'simple';

export const FLAGS = {
  variant:
    "Planformen 'trailer' finns inte i foodTruckRoom.ts. Bygg den som en fjärde variant (rundade gavlar " +
    'radie 1,0, dragstång, ingen hytt, en axel) eller som egen fil. Serveringsgeometrin (luckans underkant ' +
    '1,30, inre disk 0,95 i vagnen) är densamma som de andra.',
  rivalPitch:
    'Rivalernas plats på torget (TRUCK_SPOT_POINTS.torget, [6,49, −21,59]) ger en kö som står på Prästgatan, ' +
    'som är gångfartsområde i OSM. Det är tillåtet, men Code kan vilja vända rivalens lucka.',
  wineBarQueue:
    'Trädäckets nordöstra hörn ligger 1,59 m från vinbarens kö (queueOut5). Vinbaren är tom så länge spelaren ' +
    'har vagnen, så det krockar inte. Om en rival tar vinbarens hus måste däcket krympa.',
  name: 'Namnet på skylten är företagets namn ur liggaren (banken). Hyttgrillen är ett exempel.'
};
