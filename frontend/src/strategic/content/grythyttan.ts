// Grythyttan Gray Box geography.
//
// The Vision Owner has directed: use real geographic references where
// available; where locations, footprints or names are not verified, mark
// VERIFICATION REQUIRED. Every landmark below is currently marked as
// APPROXIMATED or UNVERIFIED because no verified source has been ingested
// into the repository. Coordinates are relative gameplay positions, not
// geographic coordinates. Nothing here claims cartographic accuracy.
//
// Scale: 1 world unit ≈ 1 metre.
// Origin (0, 0): near the notional village square (Torget).
// +X = east, +Z = south.

import type { Vec2 } from '../types';

export type VerificationStatus =
  | 'verified'
  | 'approximated'
  | 'unverified'
  | 'placeholder';

export type LandmarkKind =
  | 'institution'
  | 'commercial'
  | 'municipal'
  | 'religious'
  | 'placeholder';

export interface Landmark {
  id: string;
  displayName: string;
  kind: LandmarkKind;
  position: Vec2;
  footprint: { width: number; depth: number };
  height: number;
  colour: string;
  verificationStatus: VerificationStatus;
  note?: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'gry-torg-01',
    displayName: 'Torget',
    kind: 'municipal',
    position: { x: 0, z: 0 },
    footprint: { width: 26, depth: 22 },
    height: 0.2,
    colour: '#a8a49a',
    verificationStatus: 'approximated',
    note: 'Läge och form är en platshållare. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-kyrkan-01',
    displayName: 'Grythyttans kyrka',
    kind: 'religious',
    position: { x: 6, z: -18 },
    footprint: { width: 14, depth: 24 },
    height: 9,
    colour: '#d0cdc4',
    verificationStatus: 'approximated',
    note: 'Läge, orientering och siluett är approximerade. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-gastgivaregard-01',
    displayName: 'Grythyttans Gästgivaregård',
    kind: 'commercial',
    position: { x: -14, z: 6 },
    footprint: { width: 28, depth: 18 },
    height: 8,
    colour: '#b7b1a5',
    verificationStatus: 'approximated',
    note: 'Autentisk verksamhet. Position approximerad. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-campus-01',
    displayName: 'Campus Grythyttan',
    kind: 'institution',
    position: { x: 14, z: -46 },
    footprint: { width: 44, depth: 24 },
    height: 7,
    colour: '#c2bfb6',
    verificationStatus: 'approximated',
    note:
      'Campusets huvudbyggnad. Position approximerad. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-maltidenshus-01',
    displayName: 'Måltidens hus',
    kind: 'institution',
    position: { x: 4, z: -52 },
    footprint: { width: 28, depth: 20 },
    height: 6,
    colour: '#b8b4a9',
    verificationStatus: 'approximated',
    note:
      'Del av campusmiljön. Relation till Sevillapaviljongen ej fastställd. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-sevillapaviljongen-01',
    displayName: 'Sevillapaviljongen',
    kind: 'institution',
    position: { x: -6, z: -46 },
    footprint: { width: 20, depth: 16 },
    height: 7,
    colour: '#c8b6a3',
    verificationStatus: 'approximated',
    note:
      'Distinktiv paviljong. Exakt läge och siluett approximerade. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-kringlan-01',
    displayName: 'Kringlan',
    kind: 'commercial',
    position: { x: 22, z: 4 },
    footprint: { width: 12, depth: 12 },
    height: 5,
    colour: '#b0aca1',
    verificationStatus: 'unverified',
    note:
      'Namn, användning och läge är ej verifierade. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-cornelis-01',
    displayName: 'Cornelis',
    kind: 'commercial',
    position: { x: -22, z: -2 },
    footprint: { width: 14, depth: 10 },
    height: 5,
    colour: '#a9a599',
    verificationStatus: 'unverified',
    note:
      'Namn, användning och läge är ej verifierade. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-pizzanshus-01',
    displayName: 'Pizzans hus',
    kind: 'commercial',
    position: { x: 18, z: 14 },
    footprint: { width: 12, depth: 10 },
    height: 5,
    colour: '#a9a596',
    verificationStatus: 'unverified',
    note:
      'Namn, användning och läge är ej verifierade. VERIFICATION REQUIRED.'
  },
  {
    id: 'gry-vinbar-placeholder-01',
    displayName: 'Restaurang (Gray Box)',
    kind: 'placeholder',
    position: { x: 0, z: 20 },
    footprint: { width: 16, depth: 12 },
    height: 5,
    colour: '#9a968c',
    verificationStatus: 'placeholder',
    note:
      'Platshållare för spelarens verksamhet — ingen anspråk på verklig etablering.'
  }
];

export const LANDMARK_BY_ID: Record<string, Landmark> = Object.fromEntries(
  LANDMARKS.map((l) => [l.id, l])
);

// Restaurant (the one landmark with a playable interior in this sprint).
export const RESTAURANT_ID = 'gry-vinbar-placeholder-01';
export const RESTAURANT = LANDMARK_BY_ID[RESTAURANT_ID];

// Water body approximation: a broad polygon south / south-west of the
// village. Real reference is likely Torrvarpen, but exact shape and name
// are VERIFICATION REQUIRED.
export const WATER_POLYGON: Vec2[] = [
  { x: -110, z: 46 },
  { x: -60, z: 34 },
  { x: -18, z: 40 },
  { x: 14, z: 46 },
  { x: 70, z: 58 },
  { x: 110, z: 90 },
  { x: 110, z: 200 },
  { x: -110, z: 200 }
];

// Road network approximation. Each road is a polyline of centre-line
// points. Widths are visual only. VERIFICATION REQUIRED for real
// alignment.
export interface RoadSegment {
  id: string;
  name: string;
  points: Vec2[];
  width: number;
  verificationStatus: VerificationStatus;
}

export const ROADS: RoadSegment[] = [
  {
    id: 'road-main-ew',
    name: 'Genomfart (öst–väst)',
    points: [
      { x: -110, z: 2 },
      { x: -60, z: 3 },
      { x: -22, z: 4 },
      { x: 0, z: 3 },
      { x: 22, z: 4 },
      { x: 60, z: 6 },
      { x: 110, z: 8 }
    ],
    width: 5,
    verificationStatus: 'approximated'
  },
  {
    id: 'road-campus',
    name: 'Väg mot campus',
    points: [
      { x: 0, z: -2 },
      { x: 4, z: -12 },
      { x: 6, z: -28 },
      { x: 8, z: -42 },
      { x: 14, z: -56 }
    ],
    width: 4,
    verificationStatus: 'approximated'
  },
  {
    id: 'road-water',
    name: 'Väg mot vattnet',
    points: [
      { x: 0, z: 6 },
      { x: 0, z: 22 },
      { x: -8, z: 38 }
    ],
    width: 4,
    verificationStatus: 'approximated'
  },
  {
    id: 'road-diag-west',
    name: 'Byväg (väst)',
    points: [
      { x: -22, z: -6 },
      { x: -14, z: 4 },
      { x: -6, z: 12 }
    ],
    width: 3,
    verificationStatus: 'approximated'
  },
  {
    id: 'road-diag-east',
    name: 'Byväg (öst)',
    points: [
      { x: 22, z: -6 },
      { x: 18, z: 6 },
      { x: 10, z: 18 }
    ],
    width: 3,
    verificationStatus: 'approximated'
  }
];

// Rough village footprint bounds (for terrain and forest ring).
export const VILLAGE_BOUNDS = {
  minX: -110,
  maxX: 110,
  minZ: -80,
  maxZ: 60
};

// Camera thresholds — continuous zoom over a real-scale village.
// Distances are in metres (world units). Damping tuned for a
// Google-Earth-like float.
export const GRAY_BOX_CAMERA = {
  minDistance: 10,
  maxDistance: 1800,
  districtDistance: 200,
  labelVillageOver: 320,
  labelBusinessUnder: 65,
  restaurantRoofFadeMid: 40,
  restaurantRoofFadeHalf: 12,
  restaurantInteriorFadeMid: 55,
  restaurantInteriorFadeHalf: 20,
  villageDetailFadeMid: 320,
  villageDetailFadeHalf: 100,
  pitchMin: (18 * Math.PI) / 180,
  pitchMax: (78 * Math.PI) / 180,
  // Google-Earth feel: slower damping on distance so long zooms breathe;
  // slightly quicker on focus/yaw/pitch so panning still feels responsive.
  // dampRate is retained for backward compat; the controller reads
  // dampDistance / dampFocus / dampRotation individually.
  dampRate: 2.0,
  dampDistance: 1.6,
  dampFocus: 2.4,
  dampRotation: 3.2,
  wheelZoomScale: 0.0009
};

// Ambient population splines. Each spline is a closed loop that residents
// walk around. Positions are stylised — the goal is visible motion, not
// simulated pedestrian flow.
export const RESIDENT_LOOPS: Vec2[][] = [
  // South road → torget → east
  [
    { x: -90, z: 6 },
    { x: -40, z: 4 },
    { x: -10, z: 3 },
    { x: 6, z: 4 },
    { x: 30, z: 5 },
    { x: 70, z: 7 },
    { x: 96, z: 9 },
    { x: 96, z: 12 },
    { x: 60, z: 10 },
    { x: 20, z: 7 },
    { x: -10, z: 6 },
    { x: -40, z: 7 },
    { x: -90, z: 9 }
  ],
  // Torget → church → back
  [
    { x: 0, z: 4 },
    { x: 4, z: -4 },
    { x: 6, z: -12 },
    { x: 8, z: -20 },
    { x: 12, z: -22 },
    { x: 12, z: -14 },
    { x: 10, z: -6 },
    { x: 4, z: 2 }
  ],
  // Torget → campus → back
  [
    { x: 4, z: -2 },
    { x: 6, z: -18 },
    { x: 8, z: -36 },
    { x: 12, z: -50 },
    { x: 18, z: -54 },
    { x: 24, z: -50 },
    { x: 20, z: -36 },
    { x: 12, z: -22 },
    { x: 6, z: -6 }
  ],
  // Gästgivaregård → torget → Kringlan
  [
    { x: -14, z: 10 },
    { x: -8, z: 6 },
    { x: 0, z: 4 },
    { x: 12, z: 4 },
    { x: 22, z: 6 },
    { x: 22, z: 12 },
    { x: 10, z: 12 },
    { x: -6, z: 12 },
    { x: -14, z: 12 }
  ]
];

// Delivery route: from off-map east into the restaurant service side.
export const DELIVERY_LOOP: Vec2[] = [
  { x: 110, z: -2 },
  { x: 60, z: 4 },
  { x: 22, z: 6 },
  { x: 2, z: 20 }, // service side of the restaurant
  { x: 22, z: 8 },
  { x: 60, z: 8 },
  { x: 110, z: 2 }
];

// Car loops for the main road (background traffic).
export const CAR_LOOPS: Vec2[][] = [
  [
    { x: -108, z: 4 },
    { x: -40, z: 4 },
    { x: 40, z: 6 },
    { x: 108, z: 8 },
    { x: 108, z: 12 },
    { x: 40, z: 10 },
    { x: -40, z: 8 },
    { x: -108, z: 8 }
  ]
];

// Restaurant interior (relative to restaurant landmark position).
export const RESTAURANT_INTERIOR = {
  // World-space corners for the restaurant footprint.
  centre: RESTAURANT.position,
  width: RESTAURANT.footprint.width,
  depth: RESTAURANT.footprint.depth,
  interiorHeight: 3,
  entrance: { x: RESTAURANT.position.x, z: RESTAURANT.position.z + RESTAURANT.footprint.depth / 2 },
  // Local layout: bar strip on west, kitchen at NW corner, tables east.
  bar: { x: RESTAURANT.position.x - RESTAURANT.footprint.width / 2 + 1.6, z: RESTAURANT.position.z },
  kitchen: {
    x: RESTAURANT.position.x - RESTAURANT.footprint.width / 2 + 1.6,
    z: RESTAURANT.position.z - RESTAURANT.footprint.depth / 2 + 2
  },
  tables: [
    { x: RESTAURANT.position.x + 2.6, z: RESTAURANT.position.z - 3.4 },
    { x: RESTAURANT.position.x + 2.6, z: RESTAURANT.position.z - 1 },
    { x: RESTAURANT.position.x + 2.6, z: RESTAURANT.position.z + 1.4 },
    { x: RESTAURANT.position.x + 5.4, z: RESTAURANT.position.z - 3.4 },
    { x: RESTAURANT.position.x + 5.4, z: RESTAURANT.position.z - 1 },
    { x: RESTAURANT.position.x + 5.4, z: RESTAURANT.position.z + 1.4 }
  ] as Vec2[],
  staffHomes: [
    // Host near entrance
    { x: RESTAURANT.position.x + 1.2, z: RESTAURANT.position.z + RESTAURANT.footprint.depth / 2 - 2 },
    // Server near bar
    { x: RESTAURANT.position.x - 1.4, z: RESTAURANT.position.z + 0.4 },
    // Chef at kitchen
    { x: RESTAURANT.position.x - RESTAURANT.footprint.width / 2 + 2.2, z: RESTAURANT.position.z - RESTAURANT.footprint.depth / 2 + 2.8 }
  ] as Vec2[]
};
