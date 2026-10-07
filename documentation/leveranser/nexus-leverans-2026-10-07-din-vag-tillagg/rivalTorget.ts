// rivalTorget.ts — rivalernas plats på torget, flyttad så att kön står på torget. Tillägg till D7, 2026-10-07.
//
// Kartans ram (grythyttan-world.json, content/world.ts): meter, +x österut, +z söderut. Vagnens ram som i
// playerTruck.ts: +X längs vagnen mot hytten, +Z ut från luckan. yaw är vinkeln i kartans ram (som truckPlats.json
// pitch.angle), yawForThree = −yaw (rotation.y), samma regel som spelarens vagn.
//
// Före: TRUCK_SPOT_POINTS.torget = [6,49, −21,59], luckan söderut. Kön stod 0,41 m inne på Prästgatan
// (w122157691, gångfartsområde), och väster om spelarens vagn finns inte plats för kön mellan gatan Torget och Prästgatan.
// Efter: platsen ligger på torgytans breda del, söder om spelarens vagn och väster om vinbarens hus (w869907975).
// Vagnen står parallellt med Prästgatan och luckan vetter mot torget (nordost). Kön står på torgytan.

export type Vec2 = [number, number];

/** Ersätter TRUCK_SPOT_POINTS.torget i content/villagePlaces.ts. TORGET = [12,49, −27,59]. */
export const TRUCK_SPOT_TORGET: Vec2 = [21.25, -12.75]; // = [TORGET[0] + 8.76, TORGET[1] + 14.84]

/** Ny: vinkeln på platsen. Behövs eftersom installTrucks() annars vrider vagnen efter närmaste gångnod. */
export const TRUCK_SPOT_PITCH = {
  torget: {
    centre: TRUCK_SPOT_TORGET,
    yaw: 3.7103, yawDeg: 212.58, yawForThree: -3.7103,
    alignedWith: 'w122157691 Prästgatan, segmentet [−15,55, −25,28] → [25,91, 1,22] (vänd 180°)',
    hatchFaces: [0.539, -0.843] as Vec2, // nordost, mot torget och spelarens trädäck
    /** Köns platser i vagnens ram, som rivalens kö i prototypen. Hämtplatsen är den första. */
    queueLocal: [[0.0, 3.0], [1.1, 3.25], [-1.2, 3.1], [-2.1, 3.7]] as Vec2[]
  }
};

/** Kontrollen mot byKarta.js (gatorna med sin bredd, husen som polygoner). Avstånd i meter. */
export const CHECKS = {
  body: {
    'cab.back': { world: [17.32, -13.84], roadEdge: 2.06, building: 9.48 },
    'cab.hatch': { world: [18.61, -15.86], roadEdge: 4.46, building: 7.96 },
    'tail.back': { world: [23.30, -10.02], roadEdge: 2.07, building: 4.01 },
    'tail.hatch': { world: [24.59, -12.04], roadEdge: 4.46, building: 2.49 }
  },
  queue: [
    { local: [0.0, 3.0], world: [22.87, -15.28], roadEdge: 6.27, building: 3.80 },
    { local: [1.1, 3.25], world: [22.07, -16.08], roadEdge: 6.51, building: 4.50 },
    { local: [-1.2, 3.1], world: [23.93, -14.72], roadEdge: 6.36, building: 2.82 },
    { local: [-2.1, 3.7], world: [25.01, -14.74], roadEdge: 6.96, building: 1.74 }
  ],
  nearestRoad: 'w122157691 Prästgatan (12 m)',
  nearestBuilding: 'w869907975 (vinbarens hus, västra gaveln, utan dörr)',
  minRoadEdge: 2.06, minBuilding: 1.74, allOnSquare: true,
  /** Minsta avstånd till spelarens vagn: dragstång, kö och trädäck (truckPlats.json). Gången mellan köerna. */
  gapToPlayerTruckM: 2.55,
  oldQueueIntoPrastgatanM: 0.41
};
