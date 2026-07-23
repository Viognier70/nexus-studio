import type { BuildingRef, Vec2 } from '../types';

export const WINE_BAR: Vec2 = { x: 0, z: 0 };

export const BUILDINGS: BuildingRef[] = [
  {
    id: 'wineBar',
    label: 'Vinbaren',
    sub: 'Din verksamhet',
    position: { x: 0, z: 0 }
  },
  { id: 'cafe', label: 'Bergslagsbönor', sub: 'Café', position: { x: -14, z: -2 } },
  { id: 'bakery', label: 'Sockerlaven', sub: 'Bageri', position: { x: 14, z: -2 } },
  {
    id: 'hotel',
    label: 'Måltidens hotell',
    sub: 'Hotell och konferens',
    position: { x: -6, z: -14 }
  },
  {
    id: 'campus',
    label: 'Grythyttans campus',
    sub: 'Utbildning och forskning',
    position: { x: 14, z: -20 }
  },
  {
    id: 'church',
    label: 'Grythyttans kyrka',
    sub: 'Landmärke',
    position: { x: 0, z: -12 }
  },
  { id: 'plot', label: 'Ledig lokal', sub: 'Tillgänglig etablering', position: { x: -16, z: -8 } }
];

export const BUILDING_BY_ID: Record<string, BuildingRef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
);

// Wine-bar interior anchor points (world coordinates, y omitted for XZ).
export const INTERIOR = {
  bounds: { minX: -4, maxX: 4, minZ: -3, maxZ: 3 },
  height: 3,
  entrance: { x: 0, z: 3 },
  exit: { x: 0, z: 5.6 },
  approach: { x: 0, z: 5.2 },
  bar: { x: -3.1, z: 0 },
  prep: { x: -3.4, z: -2.2 },
  storage: { x: -3.6, z: 2.6 },
  waitingSpots: [
    { x: 0, z: 3.7 },
    { x: -0.7, z: 3.9 },
    { x: 0.7, z: 3.9 },
    { x: 0, z: 4.4 }
  ] as Vec2[],
  seatOrder: [
    { x: 2, z: -1.8 },
    { x: 2, z: -0.6 },
    { x: 2, z: 0.6 },
    { x: 2, z: 1.8 },
    { x: 0.5, z: -1.8 },
    { x: 0.5, z: -0.6 },
    { x: 0.5, z: 0.6 },
    { x: 0.5, z: 1.8 },
    { x: 2, z: -2.6 },
    { x: 0.5, z: -2.6 },
    { x: 2, z: 2.6 },
    { x: 0.5, z: 2.6 }
  ] as Vec2[],
  staffHomes: {
    värd: { x: 0.8, z: 2.4 },
    servitör: { x: -2.4, z: 0.2 },
    kock: { x: -3.4, z: -1.6 }
  } as Record<string, Vec2>
};

// Ambient village splines. Each spline is a polyline the ambient residents walk.
export const RESIDENT_SPLINES: Vec2[][] = [
  // south road running east–west past the wine bar
  [
    { x: -22, z: 6 },
    { x: -14, z: 5.5 },
    { x: -6, z: 5 },
    { x: 4, z: 5 },
    { x: 14, z: 5 },
    { x: 22, z: 5.5 }
  ],
  // road north toward campus
  [
    { x: 0, z: 5 },
    { x: 3, z: 0 },
    { x: 7, z: -6 },
    { x: 12, z: -14 },
    { x: 14, z: -20 }
  ],
  // road toward church and hotel
  [
    { x: 0, z: 5 },
    { x: -2, z: 0 },
    { x: -3, z: -6 },
    { x: -5, z: -12 },
    { x: -6, z: -14 }
  ],
  // church square loop
  [
    { x: -4, z: -12 },
    { x: 0, z: -13 },
    { x: 4, z: -12 },
    { x: 4, z: -10 },
    { x: 0, z: -9 },
    { x: -4, z: -10 },
    { x: -4, z: -12 }
  ]
];

// Delivery route: from the north-east into the wine bar service point.
export const DELIVERY_SPLINE: Vec2[] = [
  { x: 22, z: -6 },
  { x: 12, z: -6 },
  { x: 4, z: -4 },
  { x: -0.6, z: -3.4 }, // service drop-off behind bar
  { x: 4, z: -4 },
  { x: 12, z: -6 },
  { x: 22, z: -6 }
];

// Camera thresholds (world-space distance from focus).
export const CAMERA = {
  minDistance: 3.2,
  maxDistance: 220,
  villageDistance: 90,
  districtDistance: 32,
  businessDistance: 8,
  // soft threshold centres and half-widths for crossfades:
  roofFadeMid: 18,
  roofFadeHalf: 6,
  interiorFadeMid: 22,
  interiorFadeHalf: 8,
  villageDetailMid: 60,
  villageDetailHalf: 16,
  districtDetailMid: 40,
  districtDetailHalf: 12,
  pitchMin: (20 * Math.PI) / 180,
  pitchMax: (78 * Math.PI) / 180
};
