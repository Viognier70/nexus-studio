// ORDER 315b del 2 — Designs D7 (nexus-leverans-2026-10-06-din-vag/playerTruck.ts): spelarens egen
// vagn, en släpvagn med runda gavlar, dragstång och gasolflaskor, dalablå med gräddrand, hel
// markis i grädde med bågad kant, skylten på bakkanten och trädäcket med ståborden och
// ljusslingan. Måtten och färgerna står oförändrade nedanför (TRUCK_COLOURS, TRUCK_LAYOUT,
// TRUCK_PITCH_TORGET); vagnens ram: +X längs vagnen mot bakgaveln, +Z ut från luckan. Placeringen
// (rotation.y = −vinkeln) i strategic/content/villagePlaces.ts playerTruckPlacement.

import * as THREE from 'three';
import { PROP_SCALE_HANDHELD, TRUCK_PROPS } from './truckProps';

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
  // Anders 2026-10-08 (n04): vegokorven grillas på en egen del av grillen, med egen tång. Delen är
  // grillens östra fjärdedel, avskild med en kant; varje del har sin tång (grön för vegokorven).
  veggieGrill: { x0: 1.68, divider: 1.66, tongs: { meat: [1.2, -0.42] as Vec2, veggie: [1.82, -0.42] as Vec2 } },
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
  // ORDER 319c — ståborden, ätplatserna och sopkorgen står i Designs D9 (truckProps.ts TRUCK_PROPS och EAT_SPOTS):
  // sopkorgen flyttad från [3,3, 3,5] (delvis i planteringslådan) till utanför däckets sydvästra hörn.
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

type AddFn = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, name: string) => THREE.Mesh;
type MatFn = (c: string, e?: number) => THREE.MeshStandardMaterial;

/** Däckets ovansida (trädäcket är 0,12 m högt). */
export const DECK_TOP_M = 0.12;

/** Står punkten på trädäcket (då står föremålet på däckets ovansida)? */
export function onDeck(x: number, z: number): boolean {
  const SA = TRUCK_LAYOUT.servingArea;
  return x >= SA.x0 && x <= SA.x1 && z >= SA.z0 && z <= SA.z1;
}

/** Servetthållaren (D9 napkinHolder 0,18 × 0,10 × 0,14 m, gånger 1,5): stålfot, två gavlar och servetterna. */
function napkinHolder(add: AddFn, m: MatFn, x: number, y: number, z: number, yaw: number, name: string): void {
  const k = PROP_SCALE_HANDHELD, H = TRUCK_PROPS.napkinHolder;
  const [w, d, h] = [H.size[0] * k, H.size[1] * k, H.size[2] * k];
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  const parts: [number, number, number, number, number, number, string][] = [
    [w, 0.012, d, 0, 0, 0.006, H.colour.steel],
    [0.01, h, d, -w / 2 + 0.005, 0, h / 2, H.colour.steel],
    [0.01, h, d, w / 2 - 0.005, 0, h / 2, H.colour.steel],
    [w - 0.03, h * 0.8, d * 0.7, 0, 0, 0.012 + h * 0.4, H.colour.napkins]
  ];
  parts.forEach(([bw, bh, bd, lx, lz, ly, col], i) => {
    const [px, pz] = at(lx, lz);
    const o = add(new THREE.BoxGeometry(bw, bh, bd), m(col), px, y + ly, pz, i === 3 ? name + 'Napkins' : name);
    o.rotation.y = yaw;
  });
}

function buildServing(add: AddFn, m: MatFn): void {
  const P = TRUCK_PROPS, k = PROP_SCALE_HANDHELD;
  const yAt = (x: number, z: number) => (onDeck(x, z) ? DECK_TOP_M : 0);
  // Ståborden: fot, pelare och skiva; servetthållaren i mitten, vriden 0,3 rad.
  const T = P.standTable;
  for (const [key, [x, z]] of Object.entries(T.at)) {
    const y = yAt(x, z);
    add(new THREE.CylinderGeometry(T.base.diameter / 2, T.base.diameter / 2, 0.03, 18), m(T.colour.base), x, y + 0.015, z, 'standTableBase' + key);
    add(new THREE.CylinderGeometry(T.column / 2, T.column / 2, T.top.height - 0.05, 8), m(T.colour.base), x, y + (T.top.height - 0.05) / 2 + 0.03, z, 'standTableLeg' + key);
    add(new THREE.CylinderGeometry(T.top.diameter / 2, T.top.diameter / 2, 0.04, 24), m(T.colour.top), x, y + T.top.height - 0.02, z, 'standTable' + key);
    napkinHolder(add, m, x, y + T.top.height, z, TABLE_HOLDER_YAW, 'napkinHolder' + key);
  }
  // Bänken längs däckets östra kant, utan rygg.
  const B = P.bench, by = yAt(B.centre[0], B.centre[1]);
  add(new THREE.BoxGeometry(B.depth, 0.05, B.length), m(B.colour), B.centre[0], by + B.seatHeight - 0.025, B.centre[1], 'bench');
  for (const dz of [-1, 1]) add(new THREE.BoxGeometry(B.depth * 0.8, B.seatHeight - 0.05, 0.06), m(B.legs), B.centre[0], by + (B.seatHeight - 0.05) / 2, B.centre[1] + dz * (B.length / 2 - 0.12), 'benchLeg');
  // Terrassvärmaren: fot, pelare och huv; brännaren under huven lyser en sval kväll (TruckLife.tsx).
  const Hh = P.heater, hy = yAt(Hh.at[0], Hh.at[1]);
  add(new THREE.CylinderGeometry(Hh.base.diameter / 2, Hh.base.diameter / 2, 0.06, 18), m(Hh.colour.base), Hh.at[0], hy + 0.03, Hh.at[1], 'heaterBase');
  add(new THREE.CylinderGeometry(0.035, 0.035, Hh.hood.height - 0.1, 8), m(Hh.colour.steel), Hh.at[0], hy + (Hh.hood.height - 0.1) / 2, Hh.at[1], 'heaterPole');
  add(new THREE.ConeGeometry(Hh.hood.diameter / 2, 0.12, 20, 1, true), m(Hh.colour.steel), Hh.at[0], hy + Hh.hood.height - 0.06, Hh.at[1], 'heaterHood');
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 12), m('#4a3a30'), Hh.at[0], hy + Hh.hood.height - 0.22, Hh.at[1], 'heaterBurner');
  // Sopkorgen med luckan (BIN.flap) åt norr, där den som slänger står.
  const Bn = P.bin;
  add(new THREE.CylinderGeometry(Bn.diameter / 2, Bn.diameter / 2 * 0.92, Bn.height, 16), m(Bn.colour), Bn.at[0], Bn.height / 2, Bn.at[1], 'trailerBin');
  const flap = add(new THREE.BoxGeometry(Bn.flap.width, 0.015, Bn.flap.depth), m('#2f2c28'), Bn.at[0], Bn.height + 0.008, Bn.at[1] - Bn.diameter / 2 + Bn.flap.depth / 2 + 0.02, 'trailerBinFlap');
  flap.userData.closedY = flap.position.y;
  // Marschallerna: hållaren, koppen och ljuset; lågan tänds av medhjälparen (TruckLife.tsx).
  const To = P.torch;
  To.at.forEach(([x, z], i) => {
    const y = yAt(x, z);
    add(new THREE.CylinderGeometry(0.015, 0.02, To.holder.height, 6), m(To.holder.colour), x, y + To.holder.height / 2, z, 'torchHolder' + i);
    add(new THREE.CylinderGeometry(To.holder.cup / 2, To.holder.cup / 2 * 0.8, 0.05, 10), m(To.holder.colour), x, y + To.holder.height, z, 'torchCup' + i);
    add(new THREE.CylinderGeometry(To.candle.diameter / 2, To.candle.diameter / 2, To.candle.height, 10), m(To.candle.colour), x, y + To.holder.height + 0.025 + To.candle.height / 2, z, 'torchCandle' + i);
  });
  // Hyllan på vagnens sida öster om luckan, med senap, mild senap, ketchup och servetter.
  const S = P.shelf;
  add(new THREE.BoxGeometry(S.x1 - S.x0, 0.04, S.z1 - S.z0), m(S.colour), (S.x0 + S.x1) / 2, S.height - 0.02, (S.z0 + S.z1) / 2, 'shelf');
  add(new THREE.BoxGeometry(0.04, S.height - 0.04, 0.04), m('#7a756c'), (S.x0 + S.x1) / 2, (S.height - 0.04) / 2, S.z1 - 0.04, 'shelfLeg');
  const Cd = P.condiments, bh = Cd.bottle.height * k, br = Cd.bottle.diameter * k / 2;
  for (const [name, b] of [['Ketchup', Cd.ketchup], ['Mustard', Cd.mustard], ['MildMustard', Cd.mildMustard]] as const) {
    add(new THREE.CylinderGeometry(br, br, bh, 10), m(b.colour), b.at[0], S.height + bh / 2, b.at[1], 'bottle' + name);
    add(new THREE.CylinderGeometry(br * 0.45, br * 0.6, 0.04, 8), m(b.cap), b.at[0], S.height + bh + 0.02, b.at[1], 'bottleCap' + name);
  }
  napkinHolder(add, m, S.napkins[0], S.height, S.napkins[1], 0, 'napkinHolderShelf');
}

/** Servetthållaren på ståborden är vriden 0,3 rad (D9 standTable.holder). */
const TABLE_HOLDER_YAW = 0.3;

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
  // Vegokorvens egen del: en kant över grillen och en tång per del, liggande på grillens framkant.
  const VG = L.veggieGrill, grillTop = bodyY0 + GR.top;
  add(new THREE.BoxGeometry(0.02, 0.05, GR.z1 - GR.z0), m('#9a9894'), VG.divider, grillTop + 0.025, (GR.z0 + GR.z1) / 2, 'trailerGrillDivider');
  for (const [k, [x, z], col] of [['Meat', VG.tongs.meat, '#9a9894'], ['Veggie', VG.tongs.veggie, '#4f7a3f']] as [string, Vec2, string][]) {
    const tongs = add(new THREE.BoxGeometry(0.03, 0.015, 0.26), m(col), x, grillTop + 0.01, z, 'trailerTongs' + k);
    tongs.rotation.y = 0.35;
  }
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
  // ORDER 319c — uteserveringen ur Designs D9 (truckProps.ts TRUCK_PROPS): tre ståbord med servetthållare, bänken,
  // terrassvärmaren, sopkorgen med luckan, sex marschaller och hyllan vid luckan med senap (skånsk och mild) och
  // ketchup. Det som står på borden och hyllan är 1,5 gånger verklig storlek (PROP_SCALE_HANDHELD). Lågorna,
  // värmarens sken, skräpet och vädret ritas av TruckLife.tsx.
  buildServing(add, m);
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
