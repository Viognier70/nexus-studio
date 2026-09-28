// truckPitch — food truckens plats, väder och kö. Nexus v1 paket 2.
//
// DESIGN_SPEC_NEXUS_V1 §2.2 och §4.4. Lyder under SD-004.
// Ligger OVANPÅ foodTruckRoom.ts och rör inte den filen: vagnen är samma
// fordon som förut, med samma tre varianter, mått och serveringsgeometri.
// Det specen lägger till är allt runt omkring — platsen, vädret, kön som
// växer och krymper, och folket som äter stående. Det hör inte till
// fordonet, för fordonet kör vidare och platsen ligger kvar (ORDER — food
// trucken §5: "mattan är platsen, inte fordonet").
//
// Kontrakt (samma som rummen):
//   • Ren three.js. Byggs EN gång per plats. Allt vädret behöver byggs från
//     början och växlas med visible; regnet och löven är InstancedMesh som
//     skrivs om utan allokering.
//   • Ingen egen klocka. Regnets, vindens och köns faser skickas in.
//   • Ingen simuleringslogik. presentationQueueLength() är en MODELLKURVA,
//     inte en efterfrågemodell — se FLAGS.demand.
//
// ── Tre beslut ────────────────────────────────────────────────────
//
// 1. VÄDRET SYNS PÅ DE VÅGRÄTA YTORNA OCH PÅ FOLKET — INTE I LUFTEN.
//    Regnstrimmor och löv finns, men från 23 m är de brus. Det kameran
//    faktiskt läser är:
//      sol    markisen helt ute, lång kö, borden och bänken fulla,
//             solhattar och glass i händerna
//      regn   marken en ton mörkare, pölar, PARAPLYER i kön, ingen vid
//             borden, kön kort
//      blåst  markisen halvvägs indragen och fladdrande, vimpeln rakt ut,
//             löv över marken, figurerna lutar sig mot vinden
//    Paraplyet är det starkaste vädertecken som finns uppifrån: en rad
//    runda skivor över kön säger regn innan något annat hunnit synas.
//
// 2. PARAPLYET ÄR EN FÖRSTORAD KALOTT. Det täcker hjässan, och hjässan är
//    identitetsytan (figureProps: bonader ska lämna ≥ 0,95 av kalotten i
//    plaggfärgen). Därför är duken i gästens EGEN plaggfärg. Uppifrån
//    ersätts hjässan av en större skiva i samma färg — identiteten flyttar
//    upp, den försvinner inte. Kontrasten mot marken är plaggfärgens och
//    redan prövad.
//
// 3. PARASOLLEN VALDES BORT. Den var första idén för solen, och den
//    skymmer precis dem som äter under den — det fel specen §1 förbjuder.
//    Solen bärs i stället av det folk gör när det är sol.
//
// ── Vagnens tak ───────────────────────────────────────────────────
// Från spelarens kamera ser man inte in genom luckan: strålen mot
// besättningens huvud passerar serveringsväggen på 2,8 m, över luckans
// överkant 2,15. Taket skymmer alltså köket, och specen §1 gör det till
// leveransens fel. setTruckCutaway(room, true) döljer takskivan och
// kupolen och lägger en list i livery runt takkanten — liveryn finns
// kvar som ram uppifrån, köket syns innanför. Samma princip som rummens
// kapade väggar. Skyltlådan (boxvagnen) står kvar: den är variantens
// kännetecken och står över baksidan, inte över besättningen.
//
// ── Koordinater ───────────────────────────────────────────────────
// Platsens ram = vagnens ram vid parkering: +X längs vagnen (fram),
// +Z ut från serveringssidan mot kön, origo i vagnens mitt, mark y = 0.
// Var platsen ligger i Grythyttan deklareras i content/grythyttan.ts
// (SVAR_TILL_DESIGN §2) — här finns bara platsens utformning.

import * as THREE from 'three';

export type Vec2 = [number, number];
export type SiteId = 'torget' | 'maltidensHus' | 'sjon';
export type Weather = 'sol' | 'regn' | 'blast';
export type EatKind = 'standTable' | 'bench';

export interface EatSpot {
  id: string;
  kind: EatKind;
  local: Vec2;
  facing: number;
  /** Bänk: sitshöjd 0,45. Ståbord: 0. */
  seatHeight: number;
  furnitureId: string;
}

export interface Obstacle {
  id: string;
  kind: 'hus' | 'hall' | 'träd' | 'kiosk';
  x: number; z: number; w: number; d: number; h: number;
  note: string;
}

export interface SiteSpec {
  id: SiteId;
  label: string;
  character: string;
  /** Marken torr och våt. Båda i figurernas luminansfönster. */
  ground: string;
  groundWet: string;
  groundNote: string;
  /** Vatten, om platsen har det. Ingen står där; ingår inte i bandet. */
  water?: { z0: number; colour: string };
  tables: { id: string; x: number; z: number }[];
  benches: { id: string; x: number; z: number; len: number; facing: number }[];
  obstacles: Obstacle[];
  /** Presentationskurva: [timme, nivå 0..1]. Se FLAGS.demand. */
  demand: [number, number][];
  demandNote: string;
  /** Plats som rymmer vagn, kö och möbler. */
  site: Vec2;
}

// ---------- Platserna ----------

/**
 * Tre platser i Grythyttan, valda så att de är tre olika sorters dag.
 * Torget har lunch och kväll, Måltidens hus har bara lunch, sjön har
 * bara kväll och bara när det är fint. Samma vagn blir tre verksamheter.
 */
export const SITES: Record<SiteId, SiteSpec> = {
  torget: {
    id: 'torget',
    label: 'Torget',
    character: 'Mitt i byn. Folk direkt efter jobbet, sedan en jämn ström till stängning. Två ståbord och en bänk.',
    ground: '#9b958b',
    groundWet: '#858078',
    groundNote: 'Gatsten. L 0,303 torr, 0,218 våt.',
    tables: [{ id: 'standA', x: 4.4, z: 2.2 }, { id: 'standB', x: 4.4, z: 3.8 }],
    benches: [{ id: 'benchA', x: -1.2, z: 5.6, len: 2.4, facing: 0 }],
    obstacles: [
      { id: 'torgetNorr', kind: 'hus', x: 0, z: -12.5, w: 26, d: 7, h: 6.4, note: 'Två våningar bakom vagnen.' },
      { id: 'torgetOst', kind: 'hus', x: 17.5, z: 0, w: 7, d: 20, h: 6.4, note: 'Två våningar, 13 m från vagnens nos.' },
      { id: 'torgetSyd', kind: 'hus', x: 0, z: 16, w: 26, d: 7, h: 6.4, note: 'Två våningar på andra sidan torget.' }
    ],
    demand: [[18, 0.95], [19, 0.75], [20, 0.55], [21, 0.4], [22, 0.2], [23, 0.05]],
    demandNote: 'Efter jobbet, sedan avtagande.',
    site: [16, 9]
  },
  maltidensHus: {
    id: 'maltidensHus',
    label: 'Vid Måltidens hus',
    character: 'Studenter efter kvällens pass. En kort, hård rusning vid sex och sedan tomt. Tre ståbord, ingen bänk — man äter och går.',
    ground: '#a8a191',
    groundWet: '#908a7d',
    groundNote: 'Grus. L 0,359 torr, 0,256 våt.',
    tables: [{ id: 'standA', x: 4.2, z: 2.0 }, { id: 'standB', x: 4.2, z: 3.6 }, { id: 'standC', x: 5.8, z: 2.8 }],
    benches: [],
    obstacles: [
      { id: 'maltidensHus', kind: 'hall', x: -1, z: -13, w: 30, d: 10, h: 7.6, note: 'Måltidens hus. Två höga våningar, 8 m bakom vagnen.' },
      { id: 'cykelstall', kind: 'kiosk', x: -9.5, z: 4.5, w: 4, d: 1.6, h: 2.2, note: 'Cykeltak. Lågt.' }
    ],
    demand: [[18, 1.0], [18.75, 0.85], [19.5, 0.2], [21, 0.05], [23, 0.0]],
    demandNote: 'En rusning vid sex, sedan nästan ingenting.',
    site: [16, 9]
  },
  sjon: {
    id: 'sjon',
    label: 'Vid sjön',
    character: 'Badplatsen. Sommarkväll när det är fint, med toppen vid åtta. Ingen alls när det regnar. Två bänkar mot vattnet.',
    ground: '#9aa08a',
    groundWet: '#848a77',
    groundNote: 'Slitet gräs. L 0,338 torr, 0,244 våt.',
    water: { z0: 9.0, colour: '#56666a' },
    tables: [],
    benches: [
      { id: 'benchA', x: -1.8, z: 6.4, len: 2.4, facing: 0 },
      { id: 'benchB', x: 2.2, z: 6.4, len: 2.4, facing: 0 }
    ],
    obstacles: [
      { id: 'tallVast', kind: 'träd', x: -13, z: -5, w: 5.6, d: 5.6, h: 11, note: 'Tall. Kronan 5,6 m bred.' },
      { id: 'tallOst', kind: 'träd', x: 12, z: -7, w: 5.6, d: 5.6, h: 11, note: 'Tall.' },
      { id: 'omkladning', kind: 'kiosk', x: -9, z: 2.5, w: 3.2, d: 2.2, h: 2.6, note: 'Omklädningsbod.' }
    ],
    demand: [[18, 0.5], [19, 0.8], [20, 1.0], [21, 0.9], [22, 0.5], [23, 0.1]],
    demandNote: 'Växer till åtta, håller till nio.',
    site: [16, 10]
  }
};

export const SITE_IDS: SiteId[] = ['torget', 'maltidensHus', 'sjon'];

/**
 * Vädrets verkan på kön. VAL — modellens, inte spelets.
 * Sjön faller mest i regn: ingen går till badplatsen när det regnar.
 */
export const WEATHER_DEMAND: Record<Weather, number> = { sol: 1.0, blast: 0.55, regn: 0.45 };
const SITE_RAIN: Record<SiteId, number> = { torget: 1, maltidensHus: 1.15, sjon: 0.25 };

export const WEATHER_LOOK: Record<Weather, { label: string; awningOut: number; eaters: boolean; umbrellaShare: number; note: string }> = {
  sol: { label: 'Sol', awningOut: 1, eaters: true, umbrellaShare: 0, note: 'Markisen ute, borden fulla, solhattar och glass.' },
  regn: { label: 'Regn', awningOut: 1, eaters: false, umbrellaShare: 0.75, note: 'Mörkare mark, pölar, paraplyer i kön, tomma bord.' },
  blast: { label: 'Blåst', awningOut: 0.55, eaters: true, umbrellaShare: 0, note: 'Markisen halvvägs in, vimpeln rakt ut, löv, figurerna lutar.' }
};

// ---------- Kön ----------

/**
 * Hur lång kön SER UT att vara, 0..maxSlots. Linjär interpolation i
 * platsens kurva gånger vädret. MODELLKURVA: den finns för att modellen
 * ska kunna visa tre platser vid olika tider. Spelet ska ta köns längd ur
 * sim-lagrets efterfrågan. Se FLAGS.demand.
 */
export function presentationQueueLength(site: SiteId, hour: number, weather: Weather, maxSlots: number = 8): number {
  const c = SITES[site].demand;
  let level = 0;
  if (hour <= c[0][0]) level = c[0][1];
  else if (hour >= c[c.length - 1][0]) level = c[c.length - 1][1];
  else {
    for (let i = 0; i < c.length - 1; i++) {
      if (hour >= c[i][0] && hour <= c[i + 1][0]) {
        const u = (hour - c[i][0]) / (c[i + 1][0] - c[i][0]);
        level = c[i][1] + (c[i + 1][1] - c[i][1]) * u;
        break;
      }
    }
  }
  let w = WEATHER_DEMAND[weather];
  if (weather === 'regn') w *= SITE_RAIN[site];
  return Math.max(0, Math.min(maxSlots, Math.round(level * w * maxSlots)));
}

/**
 * Köns stegning. Varje `interval` sekunder betjänas den främste och alla
 * tar ett steg fram. Returnerar stegets framdrift 0..1 (0,9 s långt, VAL)
 * Returnerar stegets framdrift 0..1 (0,9 s långt, VAL; 1 i vila) och hur
 * många betjäningar som skett. Anroparen lägger `(1 − step) · pitch`
 * bakåt på varje köplats och driver poseQueueStep med samma `step`.
 *
 * Köns LÄNGDÄNDRING sker i svansen: en ny gäst ansluter bakifrån, en som
 * ger upp går från svansen. Den främste lämnar aldrig kön utan att bli
 * betjänad — det vore att straffa den som väntat längst.
 */
export function queueStep(t: number, interval: number): { step: number; served: number } {
  const iv = Math.max(1, interval);
  const served = Math.floor(t / iv);
  const local = t - served * iv;
  const u = Math.max(0, Math.min(1, local / 0.9));
  return { step: u * u * (3 - 2 * u), served: served };
}

// ---------- Konstruktion ----------

export interface PitchParts {
  ground: THREE.Mesh;
  groundMat: THREE.MeshStandardMaterial;
  puddles: THREE.Object3D;
  rain: THREE.InstancedMesh;
  leaves: THREE.InstancedMesh;
  furniture: THREE.Object3D;
  obstacles: THREE.Object3D;
  /** Vimpeln på vagnen: hänger i sol och regn, står rakt ut i blåst. */
  pennant: THREE.Object3D;
  pennantFlag: THREE.Mesh;
  roofRim: THREE.Object3D;
}

export interface TruckPitch {
  group: THREE.Group;
  site: SiteSpec;
  weather: Weather;
  parts: PitchParts;
  eatSpots: EatSpot[];
  dispose: () => void;
}

const RAIN_N = 700;
const LEAF_N = 48;
const RAIN_BOX = { x: 26, y: 7, z: 20 };

function hash(i: number, k: number): number {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Bygger platsen runt en vagn. `room` är en FoodTruckRoom; vimpeln och
 * takets list monteras på dess grupp och följer med när den kör.
 * Platsens egen grupp ska ligga där room.pitch ligger.
 */
export function createTruckPitch(room: any, siteId: SiteId, options?: { weather?: Weather }): TruckPitch {
  const site = SITES[siteId];
  const group = new THREE.Group();
  group.name = 'truckPitch_' + siteId;
  const mats: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];
  function mat(c: string, r: number, m: number, extra?: any): THREE.MeshStandardMaterial {
    const x = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra ?? {}));
    mats.push(x);
    return x;
  }
  function geo<T extends THREE.BufferGeometry>(g: T): T { geos.push(g); return g; }
  function put(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, name: string): THREE.Mesh {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    o.name = name;
    parent.add(o);
    return o;
  }

  // Marken — platsens egen, 40 × 34 m. Under mattan, 1 mm lägre.
  const groundMat = mat(site.ground, 0.95, 0);
  const ground = new THREE.Mesh(geo(new THREE.PlaneGeometry(40, 34)), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.006, 2);
  ground.receiveShadow = true;
  ground.name = 'groundSite';
  group.add(ground);
  if (site.water) {
    const w = new THREE.Mesh(geo(new THREE.PlaneGeometry(40, 12)), mat(site.water.colour, 0.3, 0.1));
    w.rotation.x = -Math.PI / 2;
    w.position.set(0, 0.009, site.water.z0 + 6);
    w.name = 'groundWater';
    group.add(w);
    put(group, geo(new THREE.BoxGeometry(40, 0.12, 0.3)), mat('#7a7468', 0.9, 0), 0, 0.06, site.water.z0, 'groundShore');
  }

  // Pölar — bara i regn. Platta, en ton mörkare, fortfarande i bandet.
  const puddles = new THREE.Group();
  puddles.name = 'puddles';
  group.add(puddles);
  const pudMat = mat('#83827e', 0.15, 0.2);
  [[-3.2, 4.4, 0.55], [1.6, 5.4, 0.45], [5.8, 1.4, 0.5], [-6.5, 3.2, 0.4], [3.0, 7.4, 0.6]].forEach(function (p, i) {
    const m = new THREE.Mesh(geo(new THREE.CircleGeometry(p[2], 18)), pudMat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(1.6, 1, 1);
    m.position.set(p[0], 0.014, p[1]);
    m.name = 'groundPuddle' + i;
    puddles.add(m);
  });

  // Möbler och ätplatser.
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  group.add(furniture);
  const wood = mat('#7d6a52', 0.8, 0);
  const iron = mat('#3f3b36', 0.7, 0.3);
  const eatSpots: EatSpot[] = [];
  site.tables.forEach(function (t) {
    put(furniture, geo(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16)), wood, t.x, 1.08, t.z, t.id + 'Top');
    put(furniture, geo(new THREE.CylinderGeometry(0.04, 0.04, 1.06, 8)), iron, t.x, 0.53, t.z, t.id + 'Leg');
    put(furniture, geo(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 12)), iron, t.x, 0.015, t.z, t.id + 'Base');
    eatSpots.push({ id: t.id + 'a', kind: 'standTable', local: [t.x - 0.55, t.z], facing: Math.PI / 2, seatHeight: 0, furnitureId: t.id });
    eatSpots.push({ id: t.id + 'b', kind: 'standTable', local: [t.x + 0.55, t.z], facing: -Math.PI / 2, seatHeight: 0, furnitureId: t.id });
  });
  site.benches.forEach(function (b) {
    const g = new THREE.Group();
    g.name = b.id;
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.facing;
    furniture.add(g);
    put(g, geo(new THREE.BoxGeometry(b.len, 0.05, 0.42)), wood, 0, 0.45, 0, b.id + 'Seat');
    put(g, geo(new THREE.BoxGeometry(b.len, 0.34, 0.05)), wood, 0, 0.72, -0.2, b.id + 'Back');
    [-1, 1].forEach(function (s) { put(g, geo(new THREE.BoxGeometry(0.06, 0.45, 0.42)), iron, s * (b.len / 2 - 0.12), 0.225, 0, b.id + 'Leg' + s); });
    for (let k = 0; k < 3; k++) {
      const lx = (k - 1) * (b.len / 3);
      const c = Math.cos(b.facing), s = Math.sin(b.facing);
      eatSpots.push({ id: b.id + (k + 1), kind: 'bench', local: [b.x + lx * c, b.z - lx * s], facing: b.facing, seatHeight: 0.45, furnitureId: b.id });
    }
  });

  // Grannar: hus, hall, träd, bodar. De är scenens i spelet — här för provet.
  const obstacles = new THREE.Group();
  obstacles.name = 'obstacles';
  group.add(obstacles);
  const houseMat = mat('#8b857c', 0.95, 0);
  const roofMat = mat('#6a5f55', 0.9, 0);
  const trunkMat = mat('#5a4a3a', 0.9, 0);
  const crownMat = mat('#4f5c45', 0.95, 0);
  site.obstacles.forEach(function (o) {
    if (o.kind === 'träd') {
      put(obstacles, geo(new THREE.CylinderGeometry(0.22, 0.3, o.h * 0.55, 8)), trunkMat, o.x, o.h * 0.275, o.z, 'obst_' + o.id + '_trunk');
      const c = put(obstacles, geo(new THREE.ConeGeometry(o.w / 2, o.h * 0.6, 10)), crownMat, o.x, o.h * 0.7, o.z, 'obst_' + o.id + '_crown');
      c.castShadow = true;
    } else {
      put(obstacles, geo(new THREE.BoxGeometry(o.w, o.h, o.d)), houseMat, o.x, o.h / 2, o.z, 'obst_' + o.id);
      if (o.kind === 'hus') put(obstacles, geo(new THREE.BoxGeometry(o.w + 0.3, 0.3, o.d + 0.3)), roofMat, o.x, o.h + 0.15, o.z, 'obst_' + o.id + '_roof');
    }
  });

  // Regnet. Tunna strimmor, 45 % opacitet, utan skugga.
  const rainMat = new THREE.MeshBasicMaterial({ color: '#c9d2d6', transparent: true, opacity: 0.45, depthWrite: false });
  mats.push(rainMat);
  const rain = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(0.012, 0.42, 0.012)), rainMat, RAIN_N);
  rain.name = 'rain';
  rain.frustumCulled = false;
  group.add(rain);

  // Löven. Små platta rutor i höstens toner, driver i +X.
  const leafMat = mat('#8a6a3a', 0.9, 0, { side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(0.11, 0.08)), leafMat, LEAF_N);
  leaves.name = 'leaves';
  leaves.frustumCulled = false;
  group.add(leaves);

  // Vimpeln på vagnens bakre hörn, på fordonet (den åker med).
  const V = room.parts.roofPanel;
  const bb = new THREE.Box3().setFromObject(V);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  bb.applyMatrix4(inv);
  const pennant = new THREE.Group();
  pennant.name = 'pennant';
  pennant.position.set(bb.min.x + 0.2, bb.max.y, bb.min.z + 0.2);
  room.group.add(pennant);
  const pole = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.018, 0.018, 1.4, 6)), iron);
  pole.position.y = 0.7;
  pole.name = 'pennantPole';
  pennant.add(pole);
  const flagGeo = geo(new THREE.PlaneGeometry(0.9, 0.34));
  flagGeo.translate(0.45, 0, 0);
  const liveryHex = '#' + ((V as any).material.color as THREE.Color).getHexString();
  const pennantFlag = new THREE.Mesh(flagGeo, mat(liveryHex, 0.8, 0, { side: THREE.DoubleSide }));
  pennantFlag.position.y = 1.22;
  pennantFlag.name = 'pennantFlag';
  pennant.add(pennantFlag);

  // Takets list i livery — det som blir kvar av taket vid kapning.
  const roofRim = new THREE.Group();
  roofRim.name = 'roofRim';
  roofRim.visible = false;
  room.group.add(roofRim);
  const rimMat = (V as any).material;
  const rw = 0.2, ry = bb.max.y - 0.07, lx = bb.max.x - bb.min.x, lz = bb.max.z - bb.min.z;
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  put(roofRim, geo(new THREE.BoxGeometry(lx, 0.14, rw)), rimMat, cx, ry, bb.min.z + rw / 2, 'roofRimBack');
  put(roofRim, geo(new THREE.BoxGeometry(lx, 0.14, rw)), rimMat, cx, ry, bb.max.z - rw / 2, 'roofRimServe');
  put(roofRim, geo(new THREE.BoxGeometry(rw, 0.14, lz)), rimMat, bb.min.x + rw / 2, ry, cz, 'roofRimRear');
  put(roofRim, geo(new THREE.BoxGeometry(rw, 0.14, lz)), rimMat, bb.max.x - rw / 2, ry, cz, 'roofRimFront');

  const pitch: TruckPitch = {
    group: group, site: site, weather: options?.weather ?? 'sol',
    parts: { ground, groundMat, puddles, rain, leaves, furniture, obstacles, pennant, pennantFlag, roofRim },
    eatSpots: eatSpots,
    dispose: function () {
      mats.forEach(function (m) { m.dispose(); });
      geos.forEach(function (g) { g.dispose(); });
      group.removeFromParent();
      pennant.removeFromParent();
      roofRim.removeFromParent();
    }
  };
  setWeather(pitch, room, pitch.weather);
  updateTruckPitch(pitch, room, 0, 0);
  return pitch;
}

/** Byter väder. Växlar bara visible och en markfärg. */
export function setWeather(p: TruckPitch, room: any, w: Weather): void {
  p.weather = w;
  p.parts.groundMat.color.set(w === 'regn' ? p.site.groundWet : p.site.ground);
  p.parts.puddles.visible = w === 'regn';
  p.parts.rain.visible = w === 'regn';
  p.parts.leaves.visible = w === 'blast';
  room.parts.awning.scale.z = WEATHER_LOOK[w].awningOut;
  if (w !== 'blast') room.parts.awning.rotation.x = 0;
}

const _d = new THREE.Object3D();

/**
 * Regnets fall, lövens drift, vimpeln och markisens fladder.
 * `t` sekunder (realtid — väder är en gest, inte en simulering; se
 * serviceScore om gestklassen), `gust` 0..1 vindstyrka i blåst.
 * Allokerar inget.
 */
export function updateTruckPitch(p: TruckPitch, room: any, t: number, gust: number): void {
  const w = p.weather;
  if (w === 'regn') {
    for (let i = 0; i < RAIN_N; i++) {
      const x = (hash(i, 1) - 0.5) * RAIN_BOX.x;
      const z = (hash(i, 2) - 0.5) * RAIN_BOX.z + 2;
      const y = RAIN_BOX.y - ((hash(i, 3) * RAIN_BOX.y + t * 7.5) % RAIN_BOX.y);
      _d.position.set(x + (RAIN_BOX.y - y) * 0.08, y, z);
      _d.rotation.set(0, 0, 0.08);
      _d.updateMatrix();
      p.parts.rain.setMatrixAt(i, _d.matrix);
    }
    p.parts.rain.instanceMatrix.needsUpdate = true;
  }
  if (w === 'blast') {
    for (let i = 0; i < LEAF_N; i++) {
      const x = ((hash(i, 4) * 30 + t * (1.8 + hash(i, 5) * 1.6)) % 30) - 15;
      const z = (hash(i, 6) - 0.5) * 14 + 3;
      const y = 0.03 + Math.abs(Math.sin(t * 2.2 + i)) * 0.35 * hash(i, 7);
      _d.position.set(x, y, z);
      _d.rotation.set(-Math.PI / 2 + Math.sin(t * 3 + i) * 0.9, t * (1 + hash(i, 8) * 3), 0);
      _d.updateMatrix();
      p.parts.leaves.setMatrixAt(i, _d.matrix);
    }
    p.parts.leaves.instanceMatrix.needsUpdate = true;
  }
  // Vimpeln: hänger (lodrät, nästan osynlig uppifrån — rätt, stiltje syns
  // inte) eller står rakt ut och slår. Vinden blåser mot +X.
  const f = p.parts.pennantFlag;
  const g = w === 'blast' ? 0.75 + 0.25 * (gust ?? 0.5) : 0;
  f.rotation.set(Math.PI / 2 * g + (w === 'blast' ? 0.12 * Math.sin(t * 11) : 0), w === 'blast' ? 0.25 * Math.sin(t * 7.3) : 0, -Math.PI / 2 * (1 - g) * 0.92);
  // Markisens fladder i blåst.
  if (w === 'blast') room.parts.awning.rotation.x = 0.035 * Math.sin(t * 6.1) + 0.02 * Math.sin(t * 13.7);
}

/**
 * Kapar vagnens tak för spelarens kamera: takskivan, kupolen och
 * luckans överstycke döljs, listen i livery visas. Skyltlådan står kvar.
 */
export function setTruckCutaway(p: TruckPitch, room: any, on: boolean): string[] {
  const hidden: string[] = [];
  room.group.traverse(function (o: any) {
    if (/^(roofPanel|roofCrown|serveHeader|cabRoof)$/.test(o.name)) {
      o.visible = !on;
      if (on) hidden.push(o.name);
    }
  });
  p.parts.roofRim.visible = on;
  return hidden;
}

const _cl = new THREE.Vector3();

/**
 * Kameraberoende kapning. Taket som setTruckCutaway, plus: står kameran
 * på vagnens BAKSIDA ligger markisen mellan kameran och köns främre
 * platser och hämtplatsen (mätt: 4 köplatser och hämtplatsen skymda
 * vid två av åtta vinklar). Då blir markisen ett spöke, 30 % opacitet:
 * formen finns kvar som tecken, kön syns igenom. Samma princip som
 * rummens väggar — det som står i vägen för kameran tunnas ut, inget
 * annat. Anropas när kameran vridits.
 */
export function updateTruckCutaway(p: TruckPitch, room: any, camera: THREE.Object3D, on: boolean = true): { roof: boolean; awningGhost: boolean } {
  setTruckCutaway(p, room, on);
  // Tunna markisen när den faktiskt står i vägen: två strålar, mot hämt-
  // platsen och köns första plats. En regel på kamerans sida missade
  // vyn längs kön bakifrån, där markisen skymde hämtplatsen snett.
  let ghost = false;
  if (on) {
    room.group.updateWorldMatrix(true, true);
    camera.getWorldPosition(_cl);
    const col = room.queue.find(function (q: any) { return q.kind === 'collect'; });
    const first = room.queue.find(function (q: any) { return q.kind === 'order'; });
    const rc = new THREE.Raycaster();
    const tgt = new THREE.Vector3();
    [col, first].forEach(function (q: any) {
      if (ghost || !q) return;
      tgt.set(q.local[0], 1.55, q.local[1]);
      room.group.localToWorld(tgt);
      const d = tgt.clone().sub(_cl);
      rc.set(_cl, d.clone().normalize());
      rc.far = d.length() - 0.2;
      if (rc.intersectObject(room.parts.awning, true).some(function (h: any) { return /^awning(Top|Under)$/.test(h.object.name); })) ghost = true;
    });
  }
  room.parts.awning.traverse(function (o: any) {
    if (!o.isMesh || !/^awning(Top|Under)$/.test(o.name)) return;
    o.material.transparent = ghost;
    o.material.opacity = ghost ? 0.3 : 1;
    o.material.depthWrite = !ghost;
  });
  return { roof: on, awningGhost: ghost };
}

// ---------- Paraplyet ----------

/**
 * Paraply i gästens plaggfärg — se beslut 2 i headern. Monteras på
 * rig.root, inte i handen: duken ska ligga still över huvudet medan
 * armen rör sig, och handen hamnar vid skaftet med withUmbrella().
 * Duken är 0,92 m bred och sitter på 2,02 m.
 */
export function createUmbrella(garmentColour: string): { group: THREE.Group; dispose: () => void } {
  const g = new THREE.Group();
  g.name = 'umbrella';
  const m = new THREE.MeshStandardMaterial({ color: garmentColour, roughness: 0.7, metalness: 0 });
  const s = new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.6, metalness: 0.3 });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.2, 10, 1, true), m);
  canopy.position.set(0.1, 2.02, 0.14);
  canopy.castShadow = true;
  canopy.name = 'umbrellaCanopy';
  const cap2 = new THREE.Mesh(new THREE.CircleGeometry(0.46, 10), m);
  cap2.rotation.x = Math.PI / 2;
  cap2.position.set(0.1, 1.921, 0.14);
  cap2.name = 'umbrellaUnder';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 5), s);
  shaft.position.set(0.1, 1.62, 0.14);
  shaft.name = 'umbrellaShaft';
  g.add(canopy, cap2, shaft);
  return {
    group: g,
    dispose: function () {
      [canopy, cap2, shaft].forEach(function (x) { x.geometry.dispose(); });
      m.dispose(); s.dispose(); g.removeFromParent();
    }
  };
}

// ---------- Prov och mätning ----------

function shown(o: THREE.Object3D | null): boolean {
  while (o) { if (!o.visible) return false; o = o.parent; }
  return true;
}

/**
 * Specens kontroll, som kod: från den kamera som skickas, syns varje
 * köplats, hämtplatsen, varje ätplats och besättningen? Mäter mot
 * kalotthöjd (stående 1,55 m, bänk 0,45 + 0,95, personal vagngolv +
 * 1,55). Grannarna ingår. Kör updateTruckCutaway först.
 */
export function checkPitchView(p: TruckPitch, room: any, camera: THREE.Object3D, queueCount?: number) {
  room.group.updateWorldMatrix(true, true);
  p.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const dir = new THREE.Vector3();
  camera.getWorldPosition(from);
  const targets = [room.group, room.pitch, p.group];
  function test(x: number, y: number, z: number): string | null {
    to.set(x, y, z);
    p.group.localToWorld(to);
    dir.copy(to).sub(from);
    const dist = dir.length();
    ray.set(from, dir.normalize());
    ray.far = dist - 0.25;
    const hits = ray.intersectObjects(targets, true);
    for (let h = 0; h < hits.length; h++) {
      const o = hits[h].object;
      if (!shown(o)) continue;
      if (/^(ground|apron|rain|leaves|pennant|umbrella)/.test(o.name)) continue;
      if ((o as any).material && (o as any).material.transparent && (o as any).material.opacity < 0.5) continue;
      return o.name || 'namnlös';
    }
    return null;
  }
  const blocked: { id: string; by: string }[] = [];
  const order = room.queue.filter(function (q: any) { return q.kind === 'order'; }).slice(0, queueCount ?? 8);
  let q = 0;
  order.forEach(function (s: any) { const b = test(s.local[0], 1.55, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else q++; });
  const col = room.queue.find(function (s: any) { return s.kind === 'collect'; });
  const cb = test(col.local[0], 1.55, col.local[1]);
  if (cb) blocked.push({ id: 'collect', by: cb });
  let e = 0;
  p.eatSpots.forEach(function (s) { const b = test(s.local[0], s.seatHeight + (s.seatHeight ? 0.95 : 1.55), s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else e++; });
  let c = 0;
  room.staffStations.forEach(function (s: any) { const b = test(s.local[0], s.standHeight + 1.55, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else c++; });
  return { queueSeen: q, queue: order.length, collectSeen: !cb, eatSeen: e, eat: p.eatSpots.length, crewSeen: c, crew: room.staffStations.length, blocked: blocked };
}

/** Marken, torr och våt, mot figurernas fönster (foodTruckRoom.allowedGroundWindow). */
export function checkSiteGrounds(windowL: { min: number; max: number }, luminance: (h: string) => number) {
  return SITE_IDS.map(function (id) {
    const s = SITES[id];
    const dry = luminance(s.ground), wet = luminance(s.groundWet), pud = luminance('#83827e');
    return { site: id, dry, wet, puddle: pud, ok: [dry, wet, pud].every(function (l) { return l >= windowL.min && l <= windowL.max; }) };
  });
}

/** Planritningens underlag: platsens möbler, grannar, vagnen, markis, matta. */
export function planRects(p: TruckPitch, room: any) {
  const out: { name: string; kind: string; x0: number; x1: number; z0: number; z1: number }[] = [];
  const b = new THREE.Box3();
  const inv = new THREE.Matrix4().copy(p.group.matrixWorld).invert();
  function add(o: THREE.Object3D, name: string, kind: string) {
    b.setFromObject(o).applyMatrix4(inv);
    if (!isFinite(b.min.x)) return;
    out.push({ name, kind, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
  }
  room.group.updateWorldMatrix(true, true);
  const body = new THREE.Box3();
  room.parts.body.children.forEach(function (o: any) {
    if (/^(awning|shelf|wheelHub|jack|archGroup|pennant|roofRim)/.test(o.name)) return;
    body.union(new THREE.Box3().setFromObject(o));
  });
  body.applyMatrix4(inv);
  out.push({ name: 'vagnen', kind: 'truck', x0: body.min.x, x1: body.max.x, z0: body.min.z, z1: body.max.z });
  add(room.parts.awning, 'markisen', 'awning');
  add(room.parts.apron, 'serveringsmattan', 'apron');
  p.parts.furniture.traverse(function (o: any) { if (o.isMesh && /(Top|Seat)$/.test(o.name)) add(o, o.name, 'furniture'); });
  p.parts.obstacles.traverse(function (o: any) { if (o.isMesh && !/_roof$|_trunk$/.test(o.name)) add(o, o.name.replace('obst_', ''), 'obstacle'); });
  return out;
}

export const FLAGS = {
  demand:
    'presentationQueueLength() är en modellkurva per plats och väder. Spelet ' +
    'ska ta köns längd ur sim-lagrets efterfrågan, som inte finns för en ' +
    'mobil verksamhet. Kurvorna är VAL och kan användas som målbild.',
  weatherState:
    'Vädret sol/regn/blåst kräver ett vädertillstånd per dag (eller per ' +
    'timme) i sim-lagret. Finns inte. DayLighting äger ljuset; vädret här ' +
    'är mark, pölar, regn, löv, markis, vimpel och vad figurerna gör.',
  siteRegistry:
    'Tre platser. Var de ligger i Grythyttan deklareras i content/grythyttan.ts ' +
    'bredvid TorgetPlaza (SVAR_TILL_DESIGN §2). Här finns utformningen, inte ' +
    'koordinaterna. Grannarna i SITES är modellens; de riktiga husen ska prövas ' +
    'med checkPitchView() när platsen är deklarerad.',
  standing:
    'Ätplatserna är geometri. Att äta stående eller på bänk kräver ett ' +
    'gästtillstånd efter awaitingCollection. Food trucken monteras utan gäster ' +
    'tills orderingAtCounter och awaitingCollection finns (SVAR §5).',
  crew:
    'Specen: en till två personer. Två stationer finns (luckan, grillen). Med ' +
    'en person står hon vid grillen och går till luckan vid varje betjäning — ' +
    'det är poseHatchServe. Hur många som arbetar är sim-lagrets.',
  cutaway:
    'setTruckCutaway() döljer taket så att besättningen syns. Taket bär ' +
    'liveryn uppifrån; listen tar över. Anropa vid spelarens kamera och stäng ' +
    'av vid närbild i låg vinkel.',
  umbrella:
    'Paraplyet täcker kalotten. Duken är i plaggfärgen, så identiteten flyttar ' +
    'upp. Det bryter checkCrownCoverage() bokstavligt men inte kontraktets ' +
    'syfte. Om ni vill hålla provet bokstavligt: rör inte provet, montera ' +
    'paraplyet efter det.'
};
