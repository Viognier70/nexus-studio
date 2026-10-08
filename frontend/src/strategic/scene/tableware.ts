// tableware — rekvisitan för teaterns grund: tallrikar, glas, flaskor, bricka, bestick,
// servett, karaff och tårta med ljus. Plus det som rummet behöver för att raketerna ska synas:
// menykort, beställningsblock och notamapp.
//
// Leverans 2 efter tredje provspelet (teaterns grund), 2026-09-29.
// Bygger på figureRig.ts. Läses av figureClips.ts (vad klippen håller) och av rummen.
//
// Kontrakt (samma som riggen):
//   • Ren three.js, primitiver och svarvade profiler (LatheGeometry). Inga loaders, inga
//     texturer, inga binära assets. Delad geometri; material delas per färg.
//   • Allt i meter, samma som scenens världskoordinater.
//   • NOLLPUNKT = mitten av undersidan. y = 0 är ytan föremålet står på, så ett glas som
//     ställs på bordet får y = SURFACE.table och inget annat.
//   • FÄSTPUNKT = punkten som ligger i handens grepp när föremålet hålls. Den finns som en
//     namngiven nod 'attach' i gruppen och som spec.attach (i föremålets ram).
//   • Ett hållet föremål hänger INTE i handen i scengrafen. updateHeld() lägger det i
//     världen efter handankaret varje bildruta. Två skäl:
//       1. Gästens heightMult är en skala på riggens 'body'. En tallrik som hängde under
//          handen skulle krympa med gästen. Rekvisitan har rummets mått, inte kroppens.
//       2. En tallrik och en bricka ska vara vågräta oavsett underarmens vinkel. Lutningen
//          kommer från klippet (tilt), inte från armen.

import * as THREE from 'three';
import type { FigureRig } from './figureRig';

// #region types

export type PropId =
  | 'plate' | 'sidePlate' | 'soupBowl'
  | 'wineGlass' | 'waterGlass'
  | 'wineBottle' | 'waterBottle' | 'carafe'
  | 'tray' | 'fork' | 'knife' | 'spoon' | 'napkin'
  | 'cake' | 'menu' | 'pad' | 'billFolder'
  // Leverans 3, händelserna
  | 'hostDesk' | 'wheelchair' | 'vase' | 'broom' | 'dustpan'
  | 'councilId' | 'policeId' | 'licenceFolder' | 'apron' | 'lighter'
  // Vardagens koreografi (efter leverans 3): brödkorgen, karaffen att dekantera i, fördrinksglaset och backen
  | 'breadBasket' | 'decanter' | 'flute' | 'crate'
  // ORDER 315b del 2 — Designs D7 (truckClips.ts): tången vid grillen, lådan genom luckan, koppen till fikat
  | 'tongs' | 'foodBox' | 'coffeeCup'
  // ORDER 319c — Designs D9 (eatingClips.ts, truckProps.ts): korven i bröd, tråget, papperstallriken, burken,
  // pappmuggen, den använda servetten och paraplyet.
  | 'hotdog' | 'paperTray' | 'paperPlate' | 'drinkCan' | 'paperCup' | 'napkinUsed' | 'umbrella';

export type HandSide = 'L' | 'R';

/** Handpunkterna. Varje föremål har ett grepp; greppet bestämmer var i handen det ligger. */
export type GripId = 'flat' | 'palm' | 'stem' | 'tumbler' | 'body' | 'neck' | 'handle' | 'pinch' | 'book' | 'twoHands' | 'pole' | 'card' | 'push' | 'none';

export type Surface = 'table' | 'bar' | 'pass' | 'station' | 'sink' | 'tray' | 'plate' | 'desk' | 'floor'
  // ORDER 319c — D9: servetthållaren, sopkorgen, hyllan vid luckan, värmaren, luften (servetten i blåsten) och marschallen.
  | 'holder' | 'bin' | 'shelf' | 'heater' | 'air' | 'torch';

export interface PropSpec {
  id: PropId;
  /** Yttermått i meter: bredd (x), höjd (y), djup (z). measureProp() ska ge samma tal. */
  size: [number, number, number];
  /** Fästpunkten i föremålets ram (meter från nollpunkten). */
  attach: [number, number, number];
  grip: GripId;
  /** Ytor föremålet kan ställas på. */
  restsOn: Surface[];
  /** Har en fyllning som kan slås av och på: mat, soppa, vin, vatten, ljusens lågor. */
  fill?: 'food' | 'soup' | 'dessert' | 'wine' | 'water' | 'flames' | 'flowers';
}

export interface Handpoint {
  /** Förskjutning från riggens handankare, i figurens ram (x höger, y upp, z framåt).
   *  Speglas i x för vänster hand. */
  offset: [number, number, number];
  /** Grundlutning framåt (radianer). 0 = föremålet står upprätt. Klippets tilt läggs till. */
  pitch: number;
  /** Vad greppet är, för den som läser. */
  note: string;
}

export interface Tilt { pitch?: number; roll?: number; yaw?: number }

export interface PropHandle {
  id: PropId;
  spec: PropSpec;
  group: THREE.Group;
  attach: THREE.Object3D;
  held: null | { rig: FigureRig; side: HandSide };
  setFill: (on: boolean) => void;
}

// #endregion types

// ---------- ytorna ----------------------------------------------------
//
// Höjderna över golvet som rummen redan använder. Ett föremål som släpps läggs på ytans höjd.

export const SURFACE = { table: 0.75, bar: 1.05, pass: 0.95, station: 0.90, sink: 0.88, desk: 1.10, floor: 0 };

// ---------- handpunkterna ---------------------------------------------
//
// Riggen har ett handankare per hand (handAnchorL/R): i handens spets, 3 cm framför
// handflatan. Handpunkterna är förskjutningar från det ankaret. De ligger i figurens ram,
// inte i handens, så att en tallrik hamnar framför handen även när underarmen lutar.
//
// Mätt med waiter.carryPlate vid normalt tempo: handankaret på 1,12 m och 0,44 m framför
// roten. Brickans handankare (waiter.carryTray) ligger på 1,33 m.
// Storlekarna i CATALOGUE är uppmätta med measureProp() och omfattar fyllningen (maten,
// soppan, ljusens lågor).

export const HANDPOINTS: Record<GripId, Handpoint> = {
  flat:     { offset: [0, 0.010, 0.02], pitch: 0, note: 'Handflatan under tallrikens bakre del. Tallriken sticker ut framåt.' },
  palm:     { offset: [0, 0.012, -0.03], pitch: 0, note: 'Brickan balanseras mitt på handflatan, i axelhöjd.' },
  stem:     { offset: [0, -0.004, 0.012], pitch: 0, note: 'Tumme och pekfinger om foten av kupan.' },
  tumbler:  { offset: [0, 0, 0.03], pitch: 0, note: 'Handen runt glaset, en tredjedel upp.' },
  body:     { offset: [0, 0, 0.035], pitch: 0, note: 'Handen runt flaskans kropp, under etiketten.' },
  neck:     { offset: [0, 0, 0.022], pitch: 0, note: 'Handen om karaffens hals.' },
  handle:   { offset: [0, 0.004, 0.01], pitch: 0.45, note: 'Skaftet i handen, spetsen framåt och nedåt.' },
  pinch:    { offset: [0, -0.008, 0.02], pitch: 0, note: 'Servetten mellan fingrarna.' },
  book:     { offset: [0, 0.01, 0.035], pitch: -1.05, note: 'Kortet lutat upp mot den som läser.' },
  twoHands: { offset: [0.16, 0.012, 0.04], pitch: 0, note: 'Tårtan bärs med båda händer. Fästet i höger hand, mitten mellan händerna.' },
  pole:     { offset: [0, 0, 0.02], pitch: 0.35, note: 'Handen runt skaftet, borsten framåt mot golvet.' },
  card:     { offset: [0, 0.006, 0.03], pitch: -1.2, note: 'Legitimationen hålls upp mot den som ska läsa den.' },
  push:     { offset: [0.22, 0, 0.02], pitch: 0, note: 'Båda händerna på handtagen. Fästet i höger hand, mitten mellan handtagen.' },
  none:     { offset: [0, 0, 0], pitch: 0, note: 'Står på golvet och hålls inte.' }
};

// ---------- katalogen -------------------------------------------------

export const CATALOGUE: Record<PropId, PropSpec> = {
  plate:       { id: 'plate', size: [0.27, 0.055, 0.27], attach: [0, 0, -0.08], grip: 'flat', restsOn: ['table', 'pass', 'station', 'sink', 'tray'], fill: 'food' },
  sidePlate:   { id: 'sidePlate', size: [0.17, 0.041, 0.17], attach: [0, 0, -0.05], grip: 'flat', restsOn: ['table', 'tray', 'sink'], fill: 'dessert' },
  soupBowl:    { id: 'soupBowl', size: [0.23, 0.052, 0.23], attach: [0, 0, -0.07], grip: 'flat', restsOn: ['table', 'pass', 'sink', 'tray'], fill: 'soup' },
  wineGlass:   { id: 'wineGlass', size: [0.086, 0.21, 0.086], attach: [0, 0.09, 0], grip: 'stem', restsOn: ['table', 'bar', 'tray'], fill: 'wine' },
  waterGlass:  { id: 'waterGlass', size: [0.074, 0.11, 0.074], attach: [0, 0.04, 0], grip: 'tumbler', restsOn: ['table', 'bar', 'tray'], fill: 'water' },
  wineBottle:  { id: 'wineBottle', size: [0.077, 0.30, 0.077], attach: [0, 0.11, 0], grip: 'body', restsOn: ['table', 'bar', 'tray'] },
  waterBottle: { id: 'waterBottle', size: [0.07, 0.267, 0.07], attach: [0, 0.10, 0], grip: 'body', restsOn: ['table', 'bar', 'tray'] },
  carafe:      { id: 'carafe', size: [0.13, 0.26, 0.13], attach: [0, 0.19, 0], grip: 'neck', restsOn: ['table', 'bar', 'tray'], fill: 'water' },
  tray:        { id: 'tray', size: [0.40, 0.02, 0.40], attach: [0, 0, 0], grip: 'palm', restsOn: ['table', 'bar', 'pass'] },
  fork:        { id: 'fork', size: [0.024, 0.005, 0.188], attach: [0, 0, -0.07], grip: 'handle', restsOn: ['table', 'plate', 'tray'] },
  knife:       { id: 'knife', size: [0.018, 0.008, 0.22], attach: [0, 0, -0.08], grip: 'handle', restsOn: ['table', 'plate', 'tray'] },
  spoon:       { id: 'spoon', size: [0.04, 0.008, 0.18], attach: [0, 0, -0.06], grip: 'handle', restsOn: ['table', 'plate', 'tray'] },
  napkin:      { id: 'napkin', size: [0.12, 0.014, 0.12], attach: [0, 0.007, -0.05], grip: 'pinch', restsOn: ['table', 'bar', 'plate'] },
  cake:        { id: 'cake', size: [0.30, 0.213, 0.30], attach: [0, 0, 0], grip: 'twoHands', restsOn: ['table', 'pass', 'tray'], fill: 'flames' },
  menu:        { id: 'menu', size: [0.22, 0.008, 0.31], attach: [0, 0, -0.12], grip: 'book', restsOn: ['table'] },
  pad:         { id: 'pad', size: [0.08, 0.012, 0.11], attach: [0, 0, -0.04], grip: 'book', restsOn: ['table'] },
  billFolder:  { id: 'billFolder', size: [0.11, 0.012, 0.21], attach: [0, 0, -0.08], grip: 'book', restsOn: ['table'] },
  // Leverans 3. Värdpulten och rullstolen står på golvet. Vasen står på pulten.
  hostDesk:    { id: 'hostDesk', size: [0.60, 1.10, 0.45], attach: [0, 1.10, 0], grip: 'none', restsOn: ['floor'] },
  wheelchair:  { id: 'wheelchair', size: [0.62, 0.92, 1.05], attach: [0, 0.905, -0.30], grip: 'push', restsOn: ['floor'] },
  vase:        { id: 'vase', size: [0.12, 0.42, 0.12], attach: [0, 0.12, 0], grip: 'body', restsOn: ['desk', 'table', 'bar', 'floor'], fill: 'flowers' },
  broom:       { id: 'broom', size: [0.30, 1.30, 0.06], attach: [0, 0.95, 0], grip: 'pole', restsOn: ['floor'] },
  dustpan:     { id: 'dustpan', size: [0.24, 0.10, 0.34], attach: [0, 0.09, -0.14], grip: 'handle', restsOn: ['floor'] },
  councilId:   { id: 'councilId', size: [0.086, 0.004, 0.054], attach: [0, 0.002, -0.02], grip: 'card', restsOn: ['table', 'bar', 'desk'] },
  policeId:    { id: 'policeId', size: [0.075, 0.014, 0.105], attach: [0, 0.006, -0.04], grip: 'card', restsOn: ['table', 'bar', 'desk'] },
  licenceFolder: { id: 'licenceFolder', size: [0.24, 0.03, 0.32], attach: [0, 0.015, -0.12], grip: 'book', restsOn: ['table', 'bar', 'desk'] },
  apron:       { id: 'apron', size: [0.30, 0.02, 0.25], attach: [0, 0.01, -0.1], grip: 'pinch', restsOn: ['table', 'bar', 'station'] },
  lighter:     { id: 'lighter', size: [0.025, 0.025, 0.24], attach: [0, 0.0125, -0.08], grip: 'handle', restsOn: ['table', 'bar', 'pass', 'tray'] },
  // Vardagens koreografi. Brödkorgen bärs på handflatan, karaffen i halsen, glaset i foten, backen med båda händerna.
  // ORDER 293 — höjden uppmätt (measureProp 0,0856 m); leveransen angav 0,09.
  breadBasket: { id: 'breadBasket', size: [0.24, 0.086, 0.16], attach: [0, 0, -0.05], grip: 'flat', restsOn: ['table', 'tray', 'pass'], fill: 'food' },
  decanter:    { id: 'decanter', size: [0.20, 0.30, 0.20], attach: [0, 0.24, 0], grip: 'neck', restsOn: ['table', 'bar', 'tray'], fill: 'wine' },
  flute:       { id: 'flute', size: [0.064, 0.22, 0.064], attach: [0, 0.1, 0], grip: 'stem', restsOn: ['table', 'bar', 'tray'], fill: 'wine' },
  crate:       { id: 'crate', size: [0.42, 0.33, 0.30], attach: [0, 0.2, 0], grip: 'twoHands', restsOn: ['floor', 'bar'] },
  // ORDER 315b del 2 — D7: tången i nypgrepp, lådan på handflatan, koppen i handtaget.
  tongs:       { id: 'tongs', size: [0.03, 0.02, 0.28], attach: [0, 0.01, -0.1], grip: 'pinch', restsOn: ['station', 'pass'] },
  foodBox:     { id: 'foodBox', size: [0.18, 0.06, 0.12], attach: [0, 0, -0.04], grip: 'flat', restsOn: ['pass', 'table', 'tray'], fill: 'food' },
  coffeeCup:   { id: 'coffeeCup', size: [0.1, 0.075, 0.08], attach: [0.05, 0.04, 0], grip: 'handle', restsOn: ['table', 'tray'] },
  // ORDER 319c — Designs D9 (truckProps.ts hotdog, plate, drinks, napkinHolder; eatingClips.ts PropId), i 1,5 gånger
  // verklig storlek (gameScale): korven i bröd hålls tvärs framför bröstet, tråget och papperstallriken står på
  // bordet, burken och muggen hålls runt om, den använda servetten är en boll och paraplyet hålls i skaftet.
  hotdog:      { id: 'hotdog', size: [0.3, 0.075, 0.09], attach: [0, 0.03, 0], grip: 'pinch', restsOn: ['table', 'tray'] },
  paperTray:   { id: 'paperTray', size: [0.33, 0.03, 0.135], attach: [0, 0, 0], grip: 'flat', restsOn: ['table', 'shelf', 'bin'] },
  paperPlate:  { id: 'paperPlate', size: [0.345, 0.045, 0.345], attach: [0, 0, -0.1], grip: 'flat', restsOn: ['table', 'shelf'], fill: 'food' },
  drinkCan:    { id: 'drinkCan', size: [0.099, 0.1725, 0.099], attach: [0, 0.07, 0], grip: 'tumbler', restsOn: ['table', 'shelf'] },
  paperCup:    { id: 'paperCup', size: [0.122, 0.15, 0.122], attach: [0, 0.06, 0], grip: 'tumbler', restsOn: ['table', 'shelf'] },
  napkinUsed:  { id: 'napkinUsed', size: [0.075, 0.075, 0.075], attach: [0, 0.0375, 0], grip: 'pinch', restsOn: ['table', 'bin'] },
  umbrella:    { id: 'umbrella', size: [1.04, 0.95, 1.04], attach: [0, 0.12, 0], grip: 'tumbler', restsOn: ['floor'] }
};

// ---------- färgerna --------------------------------------------------
//
// Samma regel som figureProps.ts §2: det som ligger mot kroppen hör till det LJUSA
// kontrastfönstret (L 0,64–0,80), annars försvinner det mot garment-färgerna från 24 m.
// Porslin, servett, papper, bricka och tårta ligger där. Flaskan är mörk, som en flaska är,
// men bär en ljus etikett och en mässingskapsyl, så att den läses i handen.

export const PROP_COLOURS = {
  porcelain: '#efe6d6',
  glass: '#e6eee8',
  wine: '#6d1822',
  water: '#cfe3e6',
  bottle: '#1f3526',
  label: '#eadbc1',
  capsule: '#d7a24c',
  trayTop: '#cdb48a',
  steel: '#d6d2ca',
  linen: '#f2e8d8',
  cake: '#f5ecdc',
  berry: '#b3485a',
  candle: '#f7efd9',
  flame: '#ffc46b',
  menu: '#e9d9bc',
  menuSpine: '#9a6a2a',
  pad: '#f5ead5',
  folder: '#c9942a',
  food: '#b5673a',
  greens: '#7c8a48',
  soup: '#d9a441',
  dessert: '#e9c9a0',
  // Leverans 3
  desk: '#4a3122', deskTop: '#6a4630', brass: '#b88a3e',
  chairFrame: '#3a3836', tyre: '#1c1a19', seatCloth: '#3d4450',
  vase: '#2f5d62', blossom: '#e8c24a', blossom2: '#efe4d0',
  pole: '#6b4a2e', bristle: '#c9a15a', pan: '#3c4a3f',
  card: '#f4f1ea', cardBand: '#2f6db5', wallet: '#1e2b4a', badge: '#d7a24c',
  licence: '#35506b', apron: '#efe4d0', lighter: '#2a2826',
  // Vardagens koreografi
  basket: '#b98a52', bread: '#d9a066', aperitif: '#e9c46a', crate: '#7a5a3a',
  // ORDER 315b del 2 — D7
  kraft: '#c8a46e', coffee: '#4a2e1c',
  // ORDER 319c — D9 (truckProps.ts): brödet, korven, senapen, tråget och tallriken, moset, burken med kanten, muggens
  // hylsa och servetten.
  bun: '#d6a45c', sausage: '#8c4526', mustard: '#e6bb34', paperTray: '#efe6d2', paperPlate: '#f4efe4', mash: '#eedca6',
  can: '#3f6f8f', canRim: '#d4cfc5', cupSleeve: '#b98a3c', napkinWhite: '#f7f3ea'
};

// ---------- bygget ----------------------------------------------------

const GEO = new Map<string, THREE.BufferGeometry>();
function geo(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = GEO.get(key);
  if (g === undefined) { g = build(); GEO.set(key, g); }
  return g;
}
const MAT = new Map<string, THREE.Material>();
function mat(colour: string, o?: { rough?: number; metal?: number; glass?: boolean; glow?: boolean }): THREE.Material {
  const k = colour + JSON.stringify(o ?? {});
  let m = MAT.get(k);
  if (m === undefined) {
    const p = o ?? {};
    const s = new THREE.MeshStandardMaterial({ color: colour, roughness: p.rough ?? 0.6, metalness: p.metal ?? 0 });
    if (p.glass) { s.transparent = true; s.opacity = 0.42; s.side = THREE.DoubleSide; s.depthWrite = false; s.roughness = 0.08; }
    if (p.glow) { s.emissive = new THREE.Color(colour); s.emissiveIntensity = 2.2; }
    m = s;
    MAT.set(k, m);
  }
  return m;
}
function lathe(key: string, pts: number[][], seg?: number): THREE.BufferGeometry {
  return geo('lathe:' + key, function () {
    return new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg ?? 24);
  });
}
function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return geo('box:' + w + ',' + h + ',' + d, function () { return new THREE.BoxGeometry(w, h, d); });
}
function cyl(r: number, h: number, seg?: number): THREE.BufferGeometry {
  return geo('cyl:' + r + ',' + h + ',' + (seg ?? 20), function () { return new THREE.CylinderGeometry(r, r, h, seg ?? 20); });
}
function sph(r: number): THREE.BufferGeometry {
  return geo('sph:' + r, function () { return new THREE.SphereGeometry(r, 12, 8); });
}
function add(g: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const C = PROP_COLOURS;

// Profilerna är (radie, höjd) i meter, nedifrån och upp. Undersidan ligger på y = 0.
const PROFILE = {
  plate: [[0, 0], [0.085, 0], [0.095, 0.004], [0.1, 0.011], [0.135, 0.02], [0.135, 0.022], [0.098, 0.014], [0, 0.013]],
  sidePlate: [[0, 0], [0.055, 0], [0.062, 0.004], [0.066, 0.009], [0.085, 0.016], [0.085, 0.018], [0.064, 0.012], [0, 0.011]],
  soupBowl: [[0, 0], [0.05, 0], [0.056, 0.006], [0.09, 0.038], [0.115, 0.05], [0.114, 0.052], [0.087, 0.042], [0.05, 0.013], [0, 0.011]],
  wineGlass: [[0, 0], [0.036, 0], [0.036, 0.003], [0.005, 0.009], [0.004, 0.09], [0.02, 0.1], [0.04, 0.13], [0.043, 0.16], [0.036, 0.21]],
  waterGlass: [[0, 0], [0.032, 0], [0.037, 0.11]],
  wineBottle: [[0, 0], [0.0385, 0], [0.0385, 0.19], [0.034, 0.21], [0.016, 0.235], [0.014, 0.285], [0.0155, 0.3], [0, 0.3]],
  waterBottle: [[0, 0], [0.035, 0], [0.035, 0.18], [0.02, 0.225], [0.014, 0.26], [0, 0.26]],
  carafe: [[0, 0], [0.062, 0], [0.065, 0.05], [0.058, 0.12], [0.03, 0.17], [0.022, 0.23], [0.028, 0.26]],
  tray: [[0, 0], [0.19, 0], [0.2, 0.02], [0.194, 0.02], [0.188, 0.006], [0, 0.006]],
  cakePlate: [[0, 0], [0.11, 0], [0.13, 0.008], [0.15, 0.013], [0.15, 0.015], [0, 0.012]],
  flute: [[0, 0], [0.032, 0], [0.032, 0.003], [0.004, 0.008], [0.0035, 0.1], [0.018, 0.12], [0.025, 0.17], [0.026, 0.22]],
  decanter: [[0, 0], [0.1, 0], [0.1, 0.01], [0.095, 0.05], [0.06, 0.11], [0.025, 0.18], [0.02, 0.28], [0.024, 0.3]],
  vase: [[0, 0], [0.04, 0], [0.055, 0.06], [0.06, 0.13], [0.045, 0.21], [0.028, 0.25], [0.034, 0.26], [0.03, 0.26], [0.024, 0.25]]
};

function buildInto(g: THREE.Group, id: PropId): THREE.Object3D | null {
  switch (id) {
    case 'plate': {
      add(g, lathe('plate', PROFILE.plate), mat(C.porcelain, { rough: 0.35 }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      const mound = add(f, geo('mound', function () { return new THREE.SphereGeometry(0.055, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); }), mat(C.food, { rough: 0.8 }), 0.01, 0.013, 0.005);
      mound.scale.set(1, 0.55, 0.8);
      add(f, geo('greens', function () { return new THREE.SphereGeometry(0.025, 10, 6); }), mat(C.greens, { rough: 0.9 }), -0.045, 0.03, -0.02);
      g.add(f); return f;
    }
    case 'sidePlate': {
      add(g, lathe('sidePlate', PROFILE.sidePlate), mat(C.porcelain, { rough: 0.35 }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, cyl(0.035, 0.03, 16), mat(C.dessert, { rough: 0.7 }), 0, 0.026, 0);
      g.add(f); return f;
    }
    case 'soupBowl': {
      add(g, lathe('soupBowl', PROFILE.soupBowl), mat(C.porcelain, { rough: 0.35 }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, geo('soupDisc', function () { return new THREE.CircleGeometry(0.083, 24).rotateX(-Math.PI / 2); }), mat(C.soup, { rough: 0.3 }), 0, 0.036, 0);
      g.add(f); return f;
    }
    case 'wineGlass': {
      add(g, lathe('wineGlass', PROFILE.wineGlass, 20), mat(C.glass, { glass: true }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, geo('wineFill', function () { return new THREE.CylinderGeometry(0.039, 0.03, 0.035, 16); }), mat(C.wine, { rough: 0.2 }), 0, 0.128, 0);
      g.add(f); return f;
    }
    case 'waterGlass': {
      add(g, lathe('waterGlass', PROFILE.waterGlass, 18), mat(C.glass, { glass: true }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, geo('waterFill', function () { return new THREE.CylinderGeometry(0.0345, 0.032, 0.07, 16); }), mat(C.water, { rough: 0.1, glass: true }), 0, 0.037, 0);
      g.add(f); return f;
    }
    case 'wineBottle': {
      add(g, lathe('wineBottle', PROFILE.wineBottle, 18), mat(C.bottle, { rough: 0.2, metal: 0.1 }), 0, 0, 0);
      add(g, cyl(0.0392, 0.085, 18), mat(C.label, { rough: 0.8 }), 0, 0.11, 0);
      add(g, cyl(0.0165, 0.05, 12), mat(C.capsule, { rough: 0.35, metal: 0.7 }), 0, 0.275, 0);
      return null;
    }
    case 'waterBottle': {
      add(g, lathe('waterBottle', PROFILE.waterBottle, 18), mat(C.glass, { glass: true }), 0, 0, 0);
      add(g, geo('waterBottleFill', function () { return new THREE.CylinderGeometry(0.033, 0.033, 0.16, 16); }), mat(C.water, { glass: true }), 0, 0.085, 0);
      add(g, cyl(0.015, 0.015, 12), mat(C.steel, { metal: 0.8, rough: 0.3 }), 0, 0.2595, 0);
      return null;
    }
    case 'carafe': {
      add(g, lathe('carafe', PROFILE.carafe, 20), mat(C.glass, { glass: true }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, geo('carafeFill', function () { return new THREE.CylinderGeometry(0.058, 0.06, 0.1, 18); }), mat(C.water, { glass: true }), 0, 0.055, 0);
      g.add(f); return f;
    }
    case 'tray': {
      add(g, lathe('tray', PROFILE.tray, 32), mat(C.trayTop, { rough: 0.4, metal: 0.45 }), 0, 0, 0);
      return null;
    }
    case 'fork': {
      add(g, box(0.011, 0.004, 0.115), mat(C.steel, { metal: 0.85, rough: 0.3 }), 0, 0.002, -0.035);
      add(g, box(0.024, 0.003, 0.07), mat(C.steel, { metal: 0.85, rough: 0.3 }), 0, 0.0035, 0.06);
      return null;
    }
    case 'knife': {
      add(g, box(0.015, 0.008, 0.11), mat(C.steel, { metal: 0.85, rough: 0.3 }), 0, 0.004, -0.055);
      add(g, box(0.018, 0.003, 0.11), mat(C.steel, { metal: 0.9, rough: 0.2 }), 0, 0.0025, 0.055);
      return null;
    }
    case 'spoon': {
      add(g, box(0.011, 0.004, 0.12), mat(C.steel, { metal: 0.85, rough: 0.3 }), 0, 0.002, -0.03);
      const b = add(g, geo('spoonBowl', function () { return new THREE.SphereGeometry(0.02, 12, 6); }), mat(C.steel, { metal: 0.85, rough: 0.3 }), 0, 0.004, 0.06);
      b.scale.set(1, 0.2, 1.5);
      return null;
    }
    case 'napkin': {
      add(g, box(0.12, 0.014, 0.12), mat(C.linen, { rough: 0.95 }), 0, 0.007, 0);
      return null;
    }
    case 'cake': {
      add(g, lathe('cakePlate', PROFILE.cakePlate, 32), mat(C.porcelain, { rough: 0.35 }), 0, 0, 0);
      add(g, cyl(0.12, 0.1, 32), mat(C.cake, { rough: 0.7 }), 0, 0.063, 0);
      add(g, cyl(0.1205, 0.025, 32), mat(C.berry, { rough: 0.6 }), 0, 0.1, 0);
      const f = new THREE.Group(); f.name = 'fill';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * 0.075, z = Math.sin(a) * 0.075;
        add(g, cyl(0.005, 0.07, 8), mat(C.candle, { rough: 0.6 }), x, 0.148, z);
        const fl = add(f, geo('flame', function () { return new THREE.ConeGeometry(0.008, 0.025, 8); }), mat(C.flame, { glow: true }), x, 0.2, z);
        fl.castShadow = false;
      }
      g.add(f); return f;
    }
    case 'menu': {
      add(g, box(0.22, 0.008, 0.31), mat(C.menu, { rough: 0.9 }), 0, 0.004, 0);
      add(g, box(0.012, 0.0085, 0.31), mat(C.menuSpine, { rough: 0.8 }), -0.104, 0.004, 0);
      return null;
    }
    case 'pad': {
      add(g, box(0.08, 0.012, 0.11), mat(C.pad, { rough: 0.9 }), 0, 0.006, 0);
      return null;
    }
    case 'billFolder': {
      add(g, box(0.11, 0.012, 0.21), mat(C.folder, { rough: 0.5, metal: 0.3 }), 0, 0.006, 0);
      return null;
    }
    case 'hostDesk': {
      add(g, box(0.60, 0.06, 0.45), mat(C.desk, { rough: 0.7 }), 0, 0.03, 0);
      add(g, box(0.56, 0.98, 0.41), mat(C.desk, { rough: 0.7 }), 0, 0.55, 0);
      add(g, box(0.60, 0.04, 0.45), mat(C.deskTop, { rough: 0.5 }), 0, 1.08, 0);
      add(g, box(0.56, 0.02, 0.006), mat(C.brass, { rough: 0.35, metal: 0.7 }), 0, 0.92, 0.208);
      return null;
    }
    case 'wheelchair': {
      const fr = mat(C.chairFrame, { rough: 0.4, metal: 0.6 }), ty = mat(C.tyre, { rough: 0.9 }), cl = mat(C.seatCloth, { rough: 0.9 });
      [-1, 1].forEach(function (s) {
        const w = add(g, cyl(0.30, 0.03, 28), ty, s * 0.295, 0.30, -0.20); w.rotation.z = Math.PI / 2;
        const c = add(g, cyl(0.08, 0.03, 14), ty, s * 0.22, 0.08, 0.42); c.rotation.z = Math.PI / 2;
        add(g, box(0.03, 0.44, 0.03), fr, s * 0.22, 0.70, -0.24);
        add(g, box(0.03, 0.03, 0.14), fr, s * 0.22, 0.905, -0.30);
        add(g, box(0.03, 0.36, 0.03), fr, s * 0.20, 0.30, 0.40);
      });
      add(g, box(0.46, 0.05, 0.44), cl, 0, 0.48, 0.02);
      add(g, box(0.46, 0.42, 0.04), cl, 0, 0.70, -0.22);
      add(g, box(0.40, 0.02, 0.14), fr, 0, 0.12, 0.48);
      return null;
    }
    case 'vase': {
      add(g, lathe('vase', PROFILE.vase, 20), mat(C.vase, { rough: 0.3 }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      [[-0.025, 0.38, 0.005], [0.025, 0.39, 0.01], [0.0, 0.37, -0.03]].forEach(function (p, i) {
        add(f, cyl(0.004, 0.16, 6), mat(C.greens, { rough: 0.8 }), p[0] * 0.5, 0.33, p[2] * 0.5);
        add(f, sph(0.03), mat(i === 1 ? C.blossom2 : C.blossom, { rough: 0.7 }), p[0], p[1], p[2]);
      });
      g.add(f); return f;
    }
    case 'broom': {
      add(g, cyl(0.013, 1.10, 10), mat(C.pole, { rough: 0.6 }), 0, 0.75, 0);
      add(g, box(0.30, 0.05, 0.06), mat(C.pole, { rough: 0.6 }), 0, 0.175, 0);
      add(g, box(0.28, 0.15, 0.05), mat(C.bristle, { rough: 0.95 }), 0, 0.075, 0);
      return null;
    }
    case 'dustpan': {
      const m = mat(C.pan, { rough: 0.5 });
      add(g, box(0.24, 0.004, 0.22), m, 0, 0.002, 0.06);
      add(g, box(0.24, 0.08, 0.01), m, 0, 0.04, -0.045);
      add(g, box(0.03, 0.02, 0.12), m, 0, 0.09, -0.11);
      return null;
    }
    case 'councilId': {
      add(g, box(0.086, 0.003, 0.054), mat(C.card, { rough: 0.5 }), 0, 0.0015, 0);
      add(g, box(0.084, 0.001, 0.012), mat(C.cardBand, { rough: 0.5 }), 0, 0.0035, -0.018);
      return null;
    }
    case 'policeId': {
      add(g, box(0.075, 0.012, 0.105), mat(C.wallet, { rough: 0.6 }), 0, 0.006, 0);
      add(g, cyl(0.022, 0.002, 18), mat(C.badge, { rough: 0.3, metal: 0.8 }), 0, 0.013, 0.02);
      return null;
    }
    case 'licenceFolder': {
      add(g, box(0.24, 0.028, 0.32), mat(C.licence, { rough: 0.6 }), 0, 0.014, 0);
      add(g, box(0.10, 0.002, 0.06), mat(C.label, { rough: 0.8 }), 0, 0.029, -0.06);
      return null;
    }
    case 'apron': {
      add(g, box(0.30, 0.02, 0.25), mat(C.apron, { rough: 0.95 }), 0, 0.01, 0);
      return null;
    }
    case 'breadBasket': {
      add(g, box(0.24, 0.05, 0.16), mat(C.basket, { rough: 0.9 }), 0, 0.025, 0);
      const f = new THREE.Group(); f.name = 'fill';
      [[-0.06, 0], [0.01, 0.02], [0.07, -0.02]].forEach(function (p) { const b = add(f, sph(0.032), mat(C.bread, { rough: 0.8 }), p[0], 0.06, p[1]); b.scale.set(1.2, 0.8, 1); });
      g.add(f); return f;
    }
    case 'decanter': {
      add(g, lathe('decanter', PROFILE.decanter, 24), mat(C.glass, { glass: true }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, geo('decanterFill', function () { return new THREE.CylinderGeometry(0.09, 0.096, 0.04, 20); }), mat(C.wine, { rough: 0.2 }), 0, 0.026, 0);
      g.add(f); return f;
    }
    case 'flute': {
      add(g, lathe('flute', PROFILE.flute, 18), mat(C.glass, { glass: true }), 0, 0, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, geo('fluteFill', function () { return new THREE.CylinderGeometry(0.022, 0.017, 0.06, 14); }), mat(C.aperitif, { rough: 0.2 }), 0, 0.15, 0);
      g.add(f); return f;
    }
    case 'crate': {
      const m = mat(C.crate, { rough: 0.85 });
      add(g, box(0.42, 0.02, 0.30), m, 0, 0.01, 0);
      add(g, box(0.42, 0.2, 0.02), m, 0, 0.1, 0.14); add(g, box(0.42, 0.2, 0.02), m, 0, 0.1, -0.14);
      add(g, box(0.02, 0.2, 0.30), m, 0.2, 0.1, 0); add(g, box(0.02, 0.2, 0.30), m, -0.2, 0.1, 0);
      for (let i = 0; i < 6; i++) add(g, cyl(0.03, 0.12, 10), mat(C.bottle, { rough: 0.2, metal: 0.1 }), -0.13 + (i % 3) * 0.13, 0.27, i < 3 ? -0.065 : 0.065);
      return null;
    }
    case 'tongs': {
      add(g, box(0.03, 0.02, 0.28), mat(C.steel, { metal: 0.85, rough: 0.3 }), 0, 0.01, 0);
      return null;
    }
    case 'foodBox': {
      add(g, box(0.18, 0.05, 0.12), mat(C.kraft, { rough: 0.9 }), 0, 0.025, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, box(0.14, 0.01, 0.08), mat(C.food, { rough: 0.8 }), 0, 0.055, 0);
      g.add(f); return f;
    }
    case 'coffeeCup': {
      add(g, cyl(0.04, 0.075, 16), mat(C.porcelain, { rough: 0.4 }), 0, 0.0375, 0);
      add(g, box(0.02, 0.04, 0.012), mat(C.porcelain, { rough: 0.4 }), 0.05, 0.04, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, cyl(0.036, 0.004, 16), mat(C.coffee, { rough: 0.3 }), 0, 0.068, 0);
      g.add(f); return f;
    }
    case 'hotdog': {
      // Tvärs (längs x): brödet, korven som sticker ut i ändarna och ett streck senap ovanpå.
      add(g, box(0.27, 0.05, 0.09), mat(C.bun, { rough: 0.8 }), 0, 0.025, 0);
      add(g, box(0.3, 0.035, 0.04), mat(C.sausage, { rough: 0.5 }), 0, 0.0475, 0);
      add(g, box(0.22, 0.01, 0.014), mat(C.mustard, { rough: 0.5 }), 0, 0.07, 0);
      return null;
    }
    case 'paperTray': {
      add(g, box(0.33, 0.006, 0.135), mat(C.paperTray, { rough: 0.9 }), 0, 0.003, 0);
      for (const z of [-0.0645, 0.0645]) add(g, box(0.33, 0.03, 0.006), mat(C.paperTray, { rough: 0.9 }), 0, 0.015, z);
      return null;
    }
    case 'paperPlate': {
      add(g, cyl(0.1725, 0.012, 24), mat(C.paperPlate, { rough: 0.9 }), 0, 0.006, 0);
      const f = new THREE.Group(); f.name = 'fill';
      add(f, cyl(0.07, 0.033, 16), mat(C.mash, { rough: 0.9 }), -0.04, 0.0285, 0);
      add(f, box(0.16, 0.03, 0.035), mat(C.sausage, { rough: 0.5 }), 0.06, 0.027, 0.03);
      g.add(f); return f;
    }
    case 'drinkCan': {
      add(g, cyl(0.0495, 0.16, 16), mat(C.can, { rough: 0.35, metal: 0.4 }), 0, 0.08, 0);
      add(g, cyl(0.044, 0.0125, 16), mat(C.canRim, { rough: 0.3, metal: 0.7 }), 0, 0.16625, 0);
      return null;
    }
    case 'paperCup': {
      add(g, cyl(0.06, 0.15, 16), mat(C.paperPlate, { rough: 0.9 }), 0, 0.075, 0);
      add(g, cyl(0.061, 0.05, 16), mat(C.cupSleeve, { rough: 0.9 }), 0, 0.07, 0);
      return null;
    }
    case 'napkinUsed': {
      add(g, box(0.075, 0.075, 0.075), mat(C.napkinWhite, { rough: 0.95 }), 0, 0.0375, 0);
      return null;
    }
    case 'umbrella': {
      // Skaftet och en åttadelad duk (Designs umbrellas, Ø 1,04 m). Färgen sätts av scenen.
      add(g, cyl(0.012, 0.85, 8), mat(C.lighter, { rough: 0.5 }), 0, 0.425, 0);
      const canopy = add(g, geo('umbrellaCanopy', function () { return new THREE.ConeGeometry(0.52, 0.22, 8, 1, true); }), mat(C.can, { rough: 0.7 }), 0, 0.84, 0);
      canopy.name = 'canopy';
      (canopy.material as THREE.Material).side = THREE.DoubleSide;
      return null;
    }
    case 'lighter': {
      add(g, box(0.025, 0.025, 0.12), mat(C.lighter, { rough: 0.5 }), 0, 0.0125, -0.06);
      add(g, box(0.008, 0.008, 0.12), mat(C.steel, { metal: 0.85, rough: 0.3 }), 0, 0.0125, 0.06);
      return null;
    }
  }
  return null;
}

/** Bygger ett föremål. Gruppen står på nollpunkten; lägg den i rummets rekvisitagrupp. */
export function createProp(id: PropId): PropHandle {
  const spec = CATALOGUE[id];
  const group = new THREE.Group();
  group.name = 'prop:' + id;
  group.rotation.order = 'YXZ';
  const fill = buildInto(group, id);
  const attach = new THREE.Object3D();
  attach.name = 'attach';
  attach.position.set(spec.attach[0], spec.attach[1], spec.attach[2]);
  group.add(attach);
  const handle: PropHandle = {
    id: id, spec: spec, group: group, attach: attach, held: null,
    setFill: function (on: boolean) { if (fill) fill.visible = on; }
  };
  return handle;
}

// ---------- hålla, släppa, ställa ------------------------------------

const _anchor = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _off = new THREE.Vector3();
const _att = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _up = new THREE.Vector3(0, 1, 0);

/** Lägger föremålet i en hand. Gruppen flyttas till `world` (rummets rekvisitagrupp) om den
 *  låg på en bricka eller tallrik. */
export function holdProp(prop: PropHandle, rig: FigureRig, side: HandSide, world: THREE.Object3D): void {
  if (prop.group.parent !== world) world.attach(prop.group);
  prop.held = { rig: rig, side: side };
}

/** Anropas varje bildruta efter applyPose, för varje hållet föremål. Allokerar inget. */
export function updateHeld(prop: PropHandle, tilt?: Tilt): void {
  const h = prop.held;
  if (!h) return;
  const j = h.rig.joints;
  const anchor = h.side === 'L' ? j.handAnchorL : j.handAnchorR;
  anchor.updateWorldMatrix(true, false);
  anchor.getWorldPosition(_anchor);
  j.chest.getWorldDirection(_dir);
  const yaw = Math.atan2(_dir.x, _dir.z);
  const hp = HANDPOINTS[prop.spec.grip];
  const mirror = h.side === 'L' ? -1 : 1;
  _off.set(hp.offset[0] * mirror, hp.offset[1], hp.offset[2]).applyAxisAngle(_up, yaw);
  const t = tilt ?? {};
  _euler.set(hp.pitch + (t.pitch ?? 0), yaw + (t.yaw ?? 0), (t.roll ?? 0) * mirror, 'YXZ');
  prop.group.quaternion.setFromEuler(_euler);
  _att.set(prop.spec.attach[0], prop.spec.attach[1], prop.spec.attach[2]).applyQuaternion(prop.group.quaternion);
  prop.group.position.copy(_anchor).add(_off).sub(_att);
}

/** Ställer föremålet på en yta i världen. `y` är ytans höjd; nollpunkten landar där. */
export function placeProp(prop: PropHandle, world: THREE.Object3D, x: number, y: number, z: number, yaw?: number): void {
  if (prop.group.parent !== world) world.attach(prop.group);
  prop.held = null;
  prop.group.position.set(x, y, z);
  prop.group.rotation.set(0, yaw ?? 0, 0, 'YXZ');
}

/** Släpper föremålet där handen är, rakt ned på ytan. Så hamnar tallriken där servitören
 *  faktiskt lade den, och inte på en förbestämd punkt. */
export function releaseToSurface(prop: PropHandle, world: THREE.Object3D, surfaceY: number): void {
  const p = prop.group.position;
  const yaw = prop.group.rotation.y;
  placeProp(prop, world, p.x, surfaceY, p.z, yaw);
}

/** Ställer ett föremål på ett annat (glas på bricka, bestick på tallrik). Barnet följer
 *  bäraren utan egen uppdatering. `lx, lz` i bärarens ram. */
export function setOnProp(prop: PropHandle, carrier: PropHandle, lx: number, lz: number, yaw?: number): void {
  carrier.group.add(prop.group);
  prop.held = null;
  const top = carrier.spec.id === 'tray' ? 0.006 : carrier.spec.size[1] * 0.6;
  prop.group.position.set(lx, top, lz);
  prop.group.rotation.set(0, yaw ?? 0, 0, 'YXZ');
}

// ---------- mätning ---------------------------------------------------

/** Verkliga yttermått och nollpunktens läge. min.y ska vara 0 och storleken ska stämma med
 *  spec.size inom 2 mm. Kör på ett oroterat föremål i origo. */
export function measureProp(prop: PropHandle) {
  const g = prop.group;
  const saved = { p: g.position.clone(), q: g.quaternion.clone(), parent: g.parent };
  if (saved.parent) saved.parent.remove(g);
  g.position.set(0, 0, 0);
  g.quaternion.identity();
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g, true);
  const size = new THREE.Vector3();
  box.getSize(size);
  g.position.copy(saved.p);
  g.quaternion.copy(saved.q);
  if (saved.parent) saved.parent.add(g);
  const s = prop.spec.size;
  return {
    id: prop.id,
    size: [size.x, size.y, size.z],
    minY: box.min.y,
    ok: Math.abs(size.x - s[0]) < 0.002 && Math.abs(size.y - s[1]) < 0.002 && Math.abs(size.z - s[2]) < 0.002 && Math.abs(box.min.y) < 0.001
  };
}

export function disposeTableware(): void {
  GEO.forEach(function (g) { g.dispose(); });
  GEO.clear();
  MAT.forEach(function (m) { m.dispose(); });
  MAT.clear();
}
