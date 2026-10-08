// ORDER 315b del 2 — Designs D7 (nexus-leverans-2026-10-06-din-vag/playerTruck.ts): spelarens egen
// vagn, en släpvagn med runda gavlar, dragstång och gasolflaskor, dalablå med gräddrand, hel
// markis i grädde med bågad kant, skylten på bakkanten och trädäcket med ståborden och
// ljusslingan. Måtten och färgerna står oförändrade nedanför (TRUCK_COLOURS, TRUCK_LAYOUT,
// TRUCK_PITCH_TORGET); vagnens ram: +X längs vagnen mot bakgaveln, +Z ut från luckan. Placeringen
// (rotation.y = −vinkeln) i strategic/content/villagePlaces.ts playerTruckPlacement.

import * as THREE from 'three';

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
  // ORDER 319b — Designs D9 (truckProps.ts menuBoard): skylten flyttad från [−2,8, 1,5] bakom kön till
  // framför kön, vänd mot torget, så att den går att läsa från gångvägen (truckProps.ts MENU_BOARD).
  aBoard: [-2.2, 3.5] as Vec2,
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

/** Vagnen, byggd i vagnens ram. `pips` är nivåns knappar på skylten (1–3, venueTier.ts). */
export function makePlayerTrailer(pips = 1): THREE.Group {
  const C = TRUCK_COLOURS, L = TRUCK_LAYOUT;
  const g = new THREE.Group();
  g.name = 'playerTrailer';
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const m = (c: string, e = 0) => {
    const k = c + e;
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, emissive: e ? new THREE.Color(c) : undefined, emissiveIntensity: e }));
    return mats.get(k)!;
  };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, name: string) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.name = name;
    o.castShadow = true;
    o.receiveShadow = true;
    g.add(o);
    return o;
  };
  const B = L.body;
  const W = B.z1 - B.z0, R = B.endRadius;
  const midLen = B.x1 - B.x0 - 2 * R;
  const bodyY0 = 0.5, bodyY1 = 2.6;
  const H = bodyY1 - bodyY0;
  // Karossen som skal (ORDER 315b del 3): golvet, väggarna och de runda gavlarna, öppen upptill när
  // taket kapas, så att besättningen syns. Framväggen har luckans öppning (sill 1,30 över marken).
  const WALL = 0.06;
  const shell = m(C.livery);
  shell.side = THREE.DoubleSide;
  add(new THREE.BoxGeometry(midLen + 2 * R * 0.95, 0.06, W - 0.04), m(C.interiorFloor), 0, bodyY0, 0, 'trailerFloor');
  add(new THREE.BoxGeometry(midLen, H, WALL), shell, 0, bodyY0 + H / 2, B.z0 + WALL / 2, 'trailerWallBack');
  const hx0 = L.hatch.x0, hx1 = L.hatch.x1, sill = L.hatch.sill, lintel = sill + 0.85;
  add(new THREE.BoxGeometry(midLen, sill - bodyY0, WALL), shell, 0, bodyY0 + (sill - bodyY0) / 2, B.z1 - WALL / 2, 'trailerWallFrontLow');
  add(new THREE.BoxGeometry(midLen, bodyY1 - lintel, WALL), shell, 0, lintel + (bodyY1 - lintel) / 2, B.z1 - WALL / 2, 'trailerWallFrontTop');
  for (const [x0, x1] of [[-midLen / 2, hx0], [hx1, midLen / 2]]) {
    if (x1 - x0 > 0.01) add(new THREE.BoxGeometry(x1 - x0, lintel - sill, WALL), shell, (x0 + x1) / 2, (sill + lintel) / 2, B.z1 - WALL / 2, 'trailerWallFrontSide');
  }
  for (const side of [-1, 1]) {
    const end = add(new THREE.CylinderGeometry(R, R, H, 20, 1, true, side > 0 ? 0 : Math.PI, Math.PI), shell, side * midLen / 2, bodyY0 + H / 2, 0, side > 0 ? 'trailerEndBack' : 'trailerEndFront');
    end.scale.set(1, 1, W / 2 / R);
  }
  // Gräddranden på karossens långsidor.
  for (const z of [B.z0 - 0.005, B.z1 + 0.005]) add(new THREE.BoxGeometry(midLen, 0.14, 0.012), m(C.stripe), 0, 1.05 < sill ? 1.05 : sill - 0.15, z, 'trailerStripe');
  // Taket (kapas när kameran är nära, PlayerTruckCrew.tsx).
  add(new THREE.BoxGeometry(midLen + 2 * R * 0.9, 0.08, W - 0.1), m(C.livery), 0, bodyY1 + 0.04, 0, 'trailerRoof');
  // Inne i vagnen: bänken vid luckan och grillen mot bakväggen (TRUCK_LAYOUT, höjder över golvet).
  const CT = L.counter, GR = L.grill;
  add(new THREE.BoxGeometry(CT.x1 - CT.x0, CT.top, CT.z1 - CT.z0), m(C.counter), (CT.x0 + CT.x1) / 2, bodyY0 + CT.top / 2, (CT.z0 + CT.z1) / 2, 'trailerCounter');
  add(new THREE.BoxGeometry(GR.x1 - GR.x0, GR.top, GR.z1 - GR.z0), m(C.grill), (GR.x0 + GR.x1) / 2, bodyY0 + GR.top / 2, (GR.z0 + GR.z1) / 2, 'trailerGrill');
  add(new THREE.BoxGeometry(L.counter.x1 - L.counter.x0, 0.05, 0.3), m(C.counter), 0, sill, B.z1 + 0.12, 'trailerHatchShelf');
  // Markisen: hel duk i grädde, bågad kant i karossens blå.
  const A = L.awning;
  const aw = add(new THREE.BoxGeometry(A.x1 - A.x0, 0.05, A.z1 - A.z0), m(C.awning), 0, A.height, (A.z0 + A.z1) / 2, 'trailerAwning');
  aw.rotation.x = 0.18;
  // Bågkanten har karossens färg men ett eget material: markisen tonas när kameran är nära (PlayerTruckCrew).
  const scallopMat = new THREE.MeshStandardMaterial({ color: C.scallop, roughness: 0.65 });
  const scallops = 8;
  for (let i = 0; i < scallops; i++) {
    const x = A.x0 + ((i + 0.5) * (A.x1 - A.x0)) / scallops;
    const sc = add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 14, 1, false, 0, Math.PI), scallopMat, x, A.height - 0.12, A.z1 + 0.02, 'trailerScallop' + i);
    sc.rotation.x = Math.PI / 2;
    sc.rotation.z = Math.PI;
  }
  // Dragstången med två gasolflaskor.
  add(new THREE.BoxGeometry(B.x0 - L.drawbar.hitch[0], 0.08, 0.1), m('#2a2724'), (B.x0 + L.drawbar.hitch[0]) / 2, 0.5, 0, 'trailerDrawbar');
  for (const [x, z] of L.drawbar.gasBottles) add(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12), m('#c9c4b8'), x, 0.85, z, 'trailerGas');
  // Hjulen: en axel.
  for (const z of [B.z0 - 0.05, B.z1 + 0.05]) {
    const wh = add(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14), m('#1c1a19'), 0, 0.33, z, 'trailerWheel');
    wh.rotation.x = Math.PI / 2;
  }
  // Skorstenen över grillen.
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 10), m('#3a3633'), L.chimney[0], bodyY1 + 0.35, L.chimney[1], 'trailerChimney');
  // Skylten på bakkanten med nivåns knappar i högra änden.
  const S = L.roofSign;
  add(new THREE.BoxGeometry(S.x1 - S.x0, 0.4, 0.06), m(C.sign), (S.x0 + S.x1) / 2, bodyY1 + 0.3, (S.z0 + S.z1) / 2, 'trailerSign');
  for (let i = 0; i < Math.max(1, Math.min(S.pips, pips)); i++) {
    const pip = add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10), m(C.pip), S.x1 - 0.12 - i * 0.14, bodyY1 + 0.3, S.z1 + 0.01, 'trailerPip' + i);
    pip.rotation.x = Math.PI / 2;
  }
  // Trädäcket med tre ståbord, papperskorgen, planteringslådorna och ljusslingan.
  const SA = L.servingArea;
  add(new THREE.BoxGeometry(SA.x1 - SA.x0, 0.12, SA.z1 - SA.z0), m(C.deck), (SA.x0 + SA.x1) / 2, 0.06, (SA.z0 + SA.z1) / 2, 'trailerDeck');
  for (const [k, p] of Object.entries({ A: L.standTables.A, B: L.standTables.B, C: L.standTables.C })) {
    add(new THREE.CylinderGeometry(0.05, 0.05, L.standTables.height, 8), m('#3b2a1e'), p[0], 0.12 + L.standTables.height / 2, p[1], 'standTableLeg' + k);
    add(new THREE.CylinderGeometry(L.standTables.radius, L.standTables.radius, 0.04, 16), m('#c9a46a'), p[0], 0.12 + L.standTables.height, p[1], 'standTable' + k);
  }
  add(new THREE.CylinderGeometry(0.2, 0.18, 0.75, 12), m('#4a4640'), L.bin[0], 0.5, L.bin[1], 'trailerBin');
  const lights = m('#ffd58f', 1.4);
  L.lightPosts.forEach(([x, z], i) => {
    add(new THREE.BoxGeometry(0.5, 0.35, 0.5), m(C.planter), x, 0.3, z, 'planter' + i);
    add(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), m('#3b2a1e'), x, 1.6, z, 'lightPost' + i);
  });
  for (let i = 0; i < L.lightPosts.length; i++) {
    const a = L.lightPosts[i], b = L.lightPosts[(i + 1) % L.lightPosts.length];
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      add(new THREE.SphereGeometry(0.05, 6, 4), lights, a[0] + (b[0] - a[0]) * t, 2.7 - 0.25 * Math.sin(Math.PI * t), a[1] + (b[1] - a[1]) * t, 'stringLight');
    }
  }
  // Tavlan vid kön: en gatupratare (D9 menuBoard, 0,60 × 0,95 m, fotavtryck 0,64 × 0,46 m), griffeltavla i
  // träram, vänd mot söder. Två tavlor som lutar mot varandra; texten visas i HUD:en, inte i modellen.
  const boardTilt = Math.atan2(0.46 / 2, 0.95);
  for (const side of [1, -1]) {
    const panel = add(new THREE.BoxGeometry(0.6, 0.95, 0.04), m('#5e4b3a'), L.aBoard[0], 0.95 / 2 * Math.cos(boardTilt), L.aBoard[1] + side * 0.46 / 4, side > 0 ? 'trailerABoard' : 'trailerABoardBack');
    panel.rotation.x = -side * boardTilt;
    const slate = add(new THREE.BoxGeometry(0.5, 0.8, 0.01), m('#2b2a28'), 0, 0, side * 0.025, side > 0 ? 'trailerABoardSlate' : 'trailerABoardSlateBack');
    g.remove(slate);
    panel.add(slate);
  }
  return g;
}
