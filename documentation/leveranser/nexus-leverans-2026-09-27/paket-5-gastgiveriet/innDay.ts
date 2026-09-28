// innDay — gästgiveriets dygn. Nexus v1 paket 5 (DESIGN_SPEC_NEXUS_V1 §2.5, §4.4).
//
// SD-004. Ligger OVANPÅ innRoom.ts och rör inte den filen, på samma sätt
// som truckPitch.ts ligger ovanpå foodTruckRoom.ts. innRoom (2026-08-30)
// har redan det specen kräver av RUMMET: hundra platser, åttio rum i två
// längor runt en gård, ett kök i linje och en frukostficka. Det specen
// lägger till är DYGNET: frukost, incheckning, middag och kvällen när
// gästerna går upp — plus receptionen, som huset saknade.
//
// Kontrakt (samma som rummen):
//   • Ren three.js. Byggs EN gång (createInnDay). Dygnets fyra lägen
//     byggs alla från början och växlas med visible.
//   • Ingen egen klocka. Lyktorna och lågorna drivs av en fas.
//   • Ingen simuleringslogik.
//
// ── Fyra beslut ───────────────────────────────────────────────────
//
// 1. DYGNET SYNS I GÅRDEN, INTE I SALEN. innRoom lade rummen i längor
//    runt en gård just för att morgonrörelsen ska korsa en yta kameran
//    läser. Det är den rörelsen dygnet består av: på morgonen går
//    gäster FRÅN trapporna över gården till salen, på eftermiddagen
//    kommer de MED VÄSKA från grinden till receptionen och sedan upp,
//    på kvällen går de TILLBAKA upp. Tre riktningar på samma grusstråk.
//
// 2. RECEPTIONEN STÅR INNANFÖR SALENS DÖRR, VÄSTER OM DEN. Huset
//    saknade reception. Den står där gästen med väska kommer in, en
//    disk med nyckelskåp bakom och en bagagehylla bredvid, ur vägen för
//    middagsgästerna som går rakt in. Nyckelskåpet är 1,6 m — högre
//    skymde receptionistens kalott norrifrån.
//
// 3. VÄSKAN ÄR EN MÖRK REKTANGEL BREDVID FIGUREN. Uppifrån syns inte en
//    hand som bär något. En resväska på 0,45 × 0,6 m i läder, i handen
//    med armen rak, gör figuren bredare på ena sidan och lutar kroppen
//    åt andra. Det är incheckningens tecken från 23 m.
//
// 4. SOIGNÉ ÄR PERSONAL SOM STÅR STILL. "Mycket personal" läses inte i
//    antal springande figurer utan i fyra servitörer som STÅR vid
//    väggarna med händerna på ryggen och vakar över salen, medan tre
//    andra bär. Stillhet i personalen är det högtidliga. Vid middag får
//    borden dessutom linne och kandelabrar — salens enda vita.
//
// ── Koordinater ───────────────────────────────────────────────────
// innRooms ram: origo i huvudbyggnadens mitt, +Z mot gården. Salen
// X ±13,3, Z ±8,8. Gården Z 9…42.

import * as THREE from 'three';

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type InnMode = 'frukost' | 'incheckning' | 'middag' | 'kvall';
export type WallSide = 'N' | 'S' | 'E' | 'W';

export const PLINTH_M = 0.11;
export const CUT_H = 0.9;

export const INN_MODES: Record<InnMode, { label: string; clock: string; hall: number; walkers: number; direction: 'ner' | 'upp' | 'in' | null; note: string }> = {
  frukost: { label: 'Frukost', clock: '07.45', hall: 42, walkers: 6, direction: 'ner',
    note: 'Gäster kommer ned från rummen över gården. Buffén dukad, fyra vid den, frukostpersonalen fyller på.' },
  incheckning: { label: 'Incheckning', clock: '15.30', hall: 0, walkers: 3, direction: 'in',
    note: 'Gäster med väska från grinden till receptionen och upp. Salen tom, servitörerna dukar.' },
  middag: { label: 'Middag', clock: '19.30', hall: 100, walkers: 0, direction: null,
    note: 'Alla hundra platser. Linne och kandelabrar, fyra servitörer vakar vid väggarna, tre bär.' },
  kvall: { label: 'Sen kväll', clock: '22.45', hall: 30, walkers: 8, direction: 'upp',
    note: 'Salen töms. Gästerna går över gården och upp till sina rum. Lyktorna längs stråket tända.' }
};

/** Receptionen, i innRooms lokala ram. */
export const RECEPTION = {
  desk: { x0: -4.3, x1: -2.5, z0: 7.3, z1: 7.9, top: 1.05 },
  keys: { x0: -4.2, x1: -2.6, z0: 8.55, z1: 8.75, h: 1.6 },
  rack: { x0: -6.2, x1: -5.2, z0: 7.95, z1: 8.55, h: 0.4 },
  staff: [-3.4, 8.3] as Vec2,
  guest: [-3.4, 6.75] as Vec2
};

/** Soignéns fyra vakande servitörer: vid väggarna, ur gångarna. */
export const ATTEND_SPOTS: { id: string; local: Vec2; facing: number }[] = [
  { id: 'attendW', local: [-12.8, 3.0], facing: Math.PI / 2 },
  { id: 'attendN', local: [-6.3, 8.4], facing: Math.PI },
  { id: 'attendE', local: [12.8, 3.5], facing: -Math.PI / 2 },
  { id: 'attendNE', local: [6.0, 8.4], facing: Math.PI }
];

export const SUITCASE_COLOURS = ['#4a3526', '#2f3d4a', '#5a2f2a', '#3b3b33'];

export const FLAGS = {
  reception:
    'Receptionen är ny. Incheckningen kräver ett gästtillstånd med rumsnummer ' +
    '(innRoom FLAGS.roomAssignment): ingen gäst bär i dag ett GuestRoomSpec-id.',
  dayCycle:
    'Dygnets fyra lägen kräver klockslaget. setInnMode() växlar dukning, buffé, ' +
    'linne, kandelabrar och lyktor. Vem som går var är sim-lagrets.',
  movement:
    'Rörelsen rum ↔ sal använder innRoom.walkPathFromRoom och walkHeightsFromRoom, ' +
    'oförändrade. walkPathToReception() ger grind → reception, och ' +
    'walkPathReceptionToRoom() ger reception → rum. Tillståndet ' +
    'som utlöser rörelsen finns inte (innRoom FLAGS.morningMovement).',
  soignee:
    'De fyra vakande servitörerna är fyra hemstationer utan uppgift. De bär ' +
    'hallService-uniformen. Antalet personal per gäst är sim-lagrets.',
  uniforms:
    'innRooms egna fem uniformer (2026-08-30) behålls — de är prövade mot husets ' +
    'golv. Receptionisten bär rooms-uniformen: husets rumssida, som städet.',
  cameraScope:
    'Kameraprovet mäter salen (platser, stationer, reception, dörr) från åtta ' +
    'vinklar, och gården (trapporna, loftgången, stråket) från de fyra vinklar ' +
    'där kameran står på gårdssidan. Bakom huvudbyggnaden skymmer salens tak ' +
    'och norra vägg gården — det är husets baksida, inte interiören.'
};

// ---------- Byggnad ----------

export interface InnDayParts {
  reception: THREE.Group;
  breakfastSpread: THREE.Group;
  linen: THREE.Group;
  candelabra: THREE.Group;
  lanterns: THREE.Group;
  flames: THREE.Object3D[];
  lanternGlow: THREE.MeshStandardMaterial;
}

export interface InnDay {
  group: THREE.Group;
  parts: InnDayParts;
  mode: InnMode;
  receptionStation: { id: string; role: string; local: Vec2; facing: number; note: string };
  receptionGuest: Vec2;
  attendSpots: typeof ATTEND_SPOTS;
  /** Grusstråkets lyktor, lokal XZ. */
  lanternSpots: Vec2[];
  dispose: () => void;
}

/**
 * Bygger dygnets geometri runt ett färdigt innRoom. `inn` är InnRoom.
 * Gruppen läggs i inn.group, så den följer husets placering.
 */
export function createInnDay(inn: any, options?: { mode?: InnMode }): InnDay {
  const group = new THREE.Group();
  group.name = 'innDay';
  inn.group.add(group);
  const mats: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];
  function mat(c: string, r: number, m: number, em?: string, ei?: number) {
    const x = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (em) { x.emissive = new THREE.Color(em); x.emissiveIntensity = ei ?? 1; }
    mats.push(x); return x;
  }
  function g<T extends THREE.BufferGeometry>(x: T): T { geos.push(x); return x; }
  function put(p: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, name: string) {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.name = name; p.add(o); return o;
  }
  function rb(p: THREE.Object3D, m: THREE.Material, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, name: string) {
    return put(p, g(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, name);
  }
  const Y = PLINTH_M;
  const wood = mat('#5b4231', 0.7, 0), top = mat('#7a5b3f', 0.5, 0), brass = mat('#b08d4a', 0.38, 0.65);
  const linenM = mat('#efece6', 0.9, 0), steel = mat('#b7bbbc', 0.3, 0.65), candleM = mat('#e9e0cc', 0.8, 0);
  const flameM = mat('#ffb24a', 0.5, 0, '#ffb24a', 2.2);
  const lanternGlow = mat('#ffd9a0', 0.5, 0, '#ffb46a', 1.4);

  // ── Receptionen ──────────────────────────────────────────────
  const reception = new THREE.Group(); reception.name = 'reception'; group.add(reception);
  const D = RECEPTION.desk, K = RECEPTION.keys, R = RECEPTION.rack;
  rb(reception, wood, D.x0, D.x1, D.z0, D.z1, Y, Y + D.top - 0.05, 'receptionDesk');
  rb(reception, top, D.x0 - 0.04, D.x1 + 0.04, D.z0 - 0.04, D.z1 + 0.04, Y + D.top - 0.05, Y + D.top, 'receptionDeskTop');
  put(reception, g(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 12)), brass, D.x1 - 0.3, Y + D.top + 0.025, (D.z0 + D.z1) / 2, 'receptionBell');
  rb(reception, wood, K.x0, K.x1, K.z0, K.z1, Y, Y + K.h, 'receptionKeyCabinet');
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    put(reception, g(new THREE.BoxGeometry(0.03, 0.08, 0.02)), brass, K.x0 + 0.12 + c * 0.19, Y + 0.95 + r * 0.16, K.z0 - 0.01, 'receptionKey' + r + c);
  }
  rb(reception, wood, R.x0, R.x1, R.z0, R.z1, Y, Y + R.h, 'luggageRack');
  [0, 1].forEach(function (i) {
    rb(reception, mat(SUITCASE_COLOURS[i], 0.6, 0.05), R.x0 + 0.08 + i * 0.46, R.x0 + 0.5 + i * 0.46, R.z0 + 0.05, R.z1 - 0.05, Y + R.h, Y + R.h + 0.22, 'rackSuitcase' + i);
  });

  // ── Frukostbuffén dukad ──────────────────────────────────────
  // På innRooms buffé: varm linje Z −7,2, kall Z −4,2, X ±2.
  const breakfastSpread = new THREE.Group(); breakfastSpread.name = 'breakfastSpread'; group.add(breakfastSpread);
  for (let i = 0; i < 4; i++) {
    const x = -1.5 + i;
    rb(breakfastSpread, steel, x - 0.36, x + 0.36, -7.45, -6.95, Y + 0.95, Y + 1.05, 'chafingBase' + i);
    put(breakfastSpread, g(new THREE.SphereGeometry(0.28, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), steel, x, Y + 1.05, -7.2, 'chafingLid' + i).scale.set(1.25, 0.5, 0.9);
  }
  const cold = ['#e8dcc0', '#c9803a', '#6d8a4a', '#8a3a44', '#d6b24a', '#e3dcc6', '#b98a4e'];
  cold.forEach(function (c, i) {
    const x = -1.8 + i * 0.6;
    put(breakfastSpread, g(new THREE.CylinderGeometry(0.2, 0.14, 0.12, 14)), mat(c, 0.7, 0), x, Y + 1.0, -4.2 + (i % 2 ? 0.18 : -0.18), 'breakfastBowl' + i);
  });
  for (let i = 0; i < 3; i++) put(breakfastSpread, g(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10)), mat(['#e89a2c', '#f0e6c8', '#b3453a'][i], 0.4, 0), 2.2, Y + 1.08, -4.5 + i * 0.3, 'breakfastJug' + i);

  // ── Middagens linne och kandelabrar ──────────────────────────
  const linen = new THREE.Group(); linen.name = 'linen'; group.add(linen);
  const candelabra = new THREE.Group(); candelabra.name = 'candelabra'; group.add(candelabra);
  const flames: THREE.Object3D[] = [];
  function candle(parent: THREE.Object3D, x: number, y: number, z: number, id: string) {
    put(parent, g(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8)), candleM, x, y + 0.08, z, 'candleBody_' + id);
    const f = put(parent, g(new THREE.CylinderGeometry(0.001, 0.02, 0.06, 8)), flameM, x, y + 0.19, z, 'candleFlame_' + id);
    f.castShadow = false; flames.push(f);
  }
  const tableTopY = Y + 0.72 + 0.06;
  [-10.8, -7.8, -4.8, -1.8].forEach(function (x, i) {
    rb(linen, linenM, x - 0.3, x + 0.3, 2.7 - 3.2, 2.7 + 3.2, tableTopY, tableTopY + 0.012, 'linenRunner' + i);
    [-1.6, 1.6].forEach(function (dz, j) {
      const z = 2.7 + dz;
      put(candelabra, g(new THREE.CylinderGeometry(0.02, 0.09, 0.3, 8)), brass, x, tableTopY + 0.15, z, 'candelabraStem' + i + j);
      rb(candelabra, brass, x - 0.02, x + 0.02, z - 0.2, z + 0.2, tableTopY + 0.3, tableTopY + 0.32, 'candelabraArm' + i + j);
      [-0.18, 0, 0.18].forEach(function (o, k) { candle(candelabra, x, tableTopY + 0.32, z + o, 'c' + i + j + k); });
    });
  });
  [1.85, 6.09, 10.33].forEach(function (x, i) {
    [1.4, 5.64].forEach(function (z, j) {
      put(linen, g(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 28)), linenM, x, tableTopY - 0.1, z, 'linenRound' + i + j);
      candle(candelabra, x, tableTopY + 0.012, z, 'r' + i + j);
    });
  });
  rb(linen, linenM, 7.95 - 3.1, 7.95 + 3.1, -5.1 - 0.6, -5.1 + 0.6, tableTopY, tableTopY + 0.012, 'linenSal');
  [5.95, 7.95, 9.95].forEach(function (x, i) { candle(candelabra, x, tableTopY + 0.012, -5.1, 's' + i); });

  // ── Lyktorna längs gårdens grusstråk ─────────────────────────
  const lanterns = new THREE.Group(); lanterns.name = 'lanterns'; group.add(lanterns);
  const lanternSpots: Vec2[] = [];
  for (let z = 13; z <= 40; z += 6.75) {
    [-3.4, 3.4].forEach(function (x, i) {
      put(lanterns, g(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6)), mat('#2c2a28', 0.6, 0.3), x, 0.8, z, 'lanternPost' + z + i);
      put(lanterns, g(new THREE.BoxGeometry(0.22, 0.3, 0.22)), lanternGlow, x, 1.75, z, 'lanternGlass' + z + i);
      lanternSpots.push([x, z]);
    });
  }

  const day: InnDay = {
    group: group,
    parts: { reception, breakfastSpread, linen, candelabra, lanterns, flames, lanternGlow },
    mode: options?.mode ?? 'middag',
    receptionStation: { id: 'reception', role: 'rooms', local: RECEPTION.staff, facing: Math.PI,
      note: 'Receptionisten bakom disken innanför salens dörr, vänd mot dörren och gästen.' },
    receptionGuest: RECEPTION.guest,
    attendSpots: ATTEND_SPOTS,
    lanternSpots: lanternSpots,
    dispose: function () { mats.forEach(function (m) { m.dispose(); }); geos.forEach(function (x) { x.dispose(); }); group.removeFromParent(); }
  };
  setInnMode(day, inn, day.mode);
  return day;
}

export function setInnMode(day: InnDay, inn: any, mode: InnMode): void {
  day.mode = mode;
  const p = day.parts;
  p.breakfastSpread.visible = mode === 'frukost';
  p.linen.visible = mode === 'middag' || mode === 'kvall';
  p.candelabra.visible = mode === 'middag' || mode === 'kvall';
  p.lanterns.visible = true;
  p.lanternGlow.emissiveIntensity = mode === 'kvall' || mode === 'middag' ? 1.6 : 0;
}

/** Lågorna. `t` sekunder. Allokerar inget. */
export function updateInnDay(day: InnDay, t: number): void {
  const f = day.parts.flames;
  for (let i = 0; i < f.length; i++) f[i].scale.set(1, 1 + 0.12 * Math.sin(t * 9.1 + i * 1.7) + 0.06 * Math.sin(t * 23 + i), 1);
}

// ---------- Väskan ----------

/** Resväska i handen: 0,45 × 0,6 × 0,2 m, handtaget i handAnchorR. */
export function createSuitcase(colour: string): { group: THREE.Group; dispose: () => void } {
  const grp = new THREE.Group(); grp.name = 'suitcase';
  const m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, metalness: 0.05 });
  const h = new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.5, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.6), m);
  body.position.set(0, -0.3, 0); body.castShadow = true; body.name = 'suitcaseBody';
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.16), h);
  handle.position.set(0, -0.05, 0); handle.name = 'suitcaseHandle';
  grp.add(body, handle);
  return { group: grp, dispose: function () { body.geometry.dispose(); handle.geometry.dispose(); m.dispose(); h.dispose(); grp.removeFromParent(); } };
}

// ---------- Vägar ----------

/** Incheckningen: grind → gårdens stråk → salens dörr → receptionen. */
export function walkPathToReception(inn: any): Vec2[] {
  return [[inn.courtyardGate[0], inn.courtyardGate[1]], [0, 20], [inn.waitingSpot[0], inn.waitingSpot[1]],
          [inn.entrance[0], inn.entrance[1]], [RECEPTION.guest[0], RECEPTION.guest[1]]];
}

/** Receptionen → dörren → gården → trappan → rummet. Höjder från innRoom. */
export function walkPathReceptionToRoom(inn: any, roomId: string, walkPathFromRoom: Function, walkHeightsFromRoom: Function): { path: Vec2[]; heights: number[] } {
  const p = (walkPathFromRoom(inn, roomId) as Vec2[]).slice().reverse();
  const h = (walkHeightsFromRoom(inn, roomId) as number[]).slice().reverse();
  return { path: ([[RECEPTION.guest[0], RECEPTION.guest[1]]] as Vec2[]).concat(p), heights: [0].concat(h) };
}

// ---------- Kapade väggar ----------

const _c = new THREE.Vector3();
const _b = new THREE.Box3();

/**
 * Kapar huvudbyggnadens väggar på kamerasidan till 0,9 m. innRoom har
 * väggarna som EN grupp med hela höjden, så kapningen skalar varje
 * väggmesh på den sidan i Y och flyttar ned den — på GRUPPENS barn, inte
 * gruppen (innRoom-ordern §3.3: measureInnRoom läser takhöjden ur en
 * väggmesh). Originalen sparas i userData och återställs.
 */
export function updateInnCutaway(inn: any, camera: THREE.Object3D, on: boolean = true): WallSide[] {
  inn.group.updateWorldMatrix(true, true);
  camera.getWorldPosition(_c);
  inn.group.worldToLocal(_c);
  const inv = new THREE.Matrix4().copy(inn.group.matrixWorld).invert();
  const all = new THREE.Box3();
  inn.parts.walls.traverse(function (o: any) {
    if (!o.isMesh) return;
    if (!o.userData.innCut) { o.userData.innCut = { sy: o.scale.y, py: o.position.y }; }
    o.scale.y = o.userData.innCut.sy; o.position.y = o.userData.innCut.py;
  });
  inn.parts.walls.updateWorldMatrix(true, true);
  all.setFromObject(inn.parts.walls).applyMatrix4(inv);
  const hx = (all.max.x - all.min.x) / 2, hz = (all.max.z - all.min.z) / 2;
  const cx = (all.max.x + all.min.x) / 2, cz = (all.max.z + all.min.z) / 2;
  const cut: Record<WallSide, boolean> = {
    E: on && _c.x > cx + hx + 0.5, W: on && _c.x < cx - hx - 0.5, N: on && _c.z > cz + hz + 0.5, S: on && _c.z < cz - hz - 0.5
  };
  inn.parts.walls.traverse(function (o: any) {
    if (!o.isMesh) return;
    _b.setFromObject(o).applyMatrix4(inv);
    const mx = (_b.min.x + _b.max.x) / 2, mz = (_b.min.z + _b.max.z) / 2;
    const side: WallSide = Math.abs(mx - cx) / hx > Math.abs(mz - cz) / hz ? (mx > cx ? 'E' : 'W') : (mz > cz ? 'N' : 'S');
    const h = _b.max.y - _b.min.y;
    if (cut[side] && h > CUT_H + 0.2) {
      const k = (CUT_H + 0.1 - _b.min.y) / h;
      o.scale.y = o.userData.innCut.sy * k;
      o.position.y = o.userData.innCut.py - (h * (1 - k)) / 2;
    }
  });
  // Utebarens pergola på 2,4 m skymmer bartendern under den från 23 m, och
  // loftgångens däck, räcke och stolpar ligger RAKT ÖVER trapporna — båda
  // trapporna står under däcket (X ±12,2 mot däckets 11,7–13,5), så den
  // gäst som går upp syns inte. De tunnas till 30 % när kapningen är på,
  // som food truckens markis. Gäster PÅ loftgången syns fortfarande.
  inn.group.traverse(function (o: any) {
    if (o.isMesh && (o.name === 'outBarPergola' || /Loft(Deck|Rail|Post)/.test(o.name))) {
      if (!o.userData.innOwnMat) { o.material = o.material.clone(); o.userData.innOwnMat = true; }
      o.material.transparent = on; o.material.opacity = on ? 0.3 : 1; o.material.depthWrite = !on;
    }
  });
  // Dörrplanen står kvar i full höjd när väggen kapas och blir en svart
  // skiva mitt i bilden. Salens dörr följer norra väggen, leveransdörren västra.
  inn.group.traverse(function (o: any) {
    if (o.name === 'hallDoor') o.visible = !cut.N;
    if (o.name === 'deliveryDoor') o.visible = !cut.W;
  });
  const out: WallSide[] = [];
  (['N', 'S', 'E', 'W'] as WallSide[]).forEach(function (s) { if (cut[s]) out.push(s); });
  return out;
}

// ---------- Prov ----------

function shown(o: THREE.Object3D | null): boolean { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

/**
 * Specens kontroll. `hall`: alla platser, stationer, receptionen och
 * dörren. `court` (om kameran står på gårdssidan): trapporna och en
 * loftgångsdörr per länga, plus stråkets mitt. Kör updateInnCutaway först.
 */
export function checkInnCameraView(inn: any, day: InnDay, camera: THREE.Object3D, walkPathFromRoom?: Function, opts?: { court?: boolean }) {
  inn.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3(), to = new THREE.Vector3(), dir = new THREE.Vector3();
  camera.getWorldPosition(from);
  const local = from.clone(); inn.group.worldToLocal(local);
  function test(x: number, y: number, z: number): string | null {
    to.set(x, y, z); inn.group.localToWorld(to); dir.copy(to).sub(from);
    const d = dir.length(); ray.set(from, dir.normalize()); ray.far = d - 0.25;
    const hits = ray.intersectObject(inn.group, true);
    for (let i = 0; i < hits.length; i++) {
      const o = hits[i].object;
      if (!shown(o) || /^(floor|candle|lanternGlass|linen|breakfast|chafing|court|lawn|boule|gravel)/i.test(o.name)) continue;
      if ((o as any).material && (o as any).material.transparent && (o as any).material.opacity < 0.5) continue;
      if (o.name === '') continue;
      return o.name;
    }
    return null;
  }
  const blocked: { id: string; by: string }[] = [];
  let seats = 0, st = 0;
  inn.seats.forEach(function (s: any) { const b = test(s.local[0], PLINTH_M + s.seatHeight + 0.95, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else seats++; });
  // Salens stationer ligger innanför väggarna; gårdens (utebaren, städet vid trappan) mäts med gården.
  const allSt = inn.staffStations.concat([day.receptionStation], day.attendSpots.map(function (a) { return { id: a.id, local: a.local }; }));
  const stations = allSt.filter(function (s: any) { return Math.abs(s.local[1]) < 8.8; });
  const courtStations = allSt.filter(function (s: any) { return Math.abs(s.local[1]) >= 8.8; });
  stations.forEach(function (s: any) { const b = test(s.local[0], PLINTH_M + 1.55, s.local[1]); if (b) blocked.push({ id: s.id, by: b }); else st++; });
  const rg = test(RECEPTION.guest[0], PLINTH_M + 1.55, RECEPTION.guest[1]); if (rg) blocked.push({ id: 'receptionGuest', by: rg });
  const courtSide = opts && opts.court !== undefined ? opts.court : local.z > 9;
  let court = 0, courtN = 0;
  if (courtSide) {
    const pts: { id: string; p: Vec3 }[] = [];
    inn.wingStairs.forEach(function (s: Vec2, i: number) { pts.push({ id: 'stair' + i, p: [s[0], 1.55, s[1]] }); });
    pts.push({ id: 'courtMid', p: [0, 1.55, 25] });
    courtStations.forEach(function (s: any) { pts.push({ id: s.id, p: [s.local[0], 1.55, s.local[1]] }); });
    if (walkPathFromRoom) {
      const up = inn.guestRooms.filter(function (r: any) { return r.storey === 1 && r.side === 'court'; });
      ['west', 'east'].forEach(function (w) {
        const r = up.find(function (x: any) { return x.wing === w; });
        if (r) { const path = walkPathFromRoom(inn, r.id) as Vec2[]; const q = path[Math.min(2, path.length - 1)]; pts.push({ id: 'loft_' + w, p: [q[0], (r.floorY ?? 3) + 1.55, q[1]] }); }
      });
    }
    pts.forEach(function (q) { courtN++; const b = test(q.p[0], q.p[1], q.p[2]); if (b) blocked.push({ id: q.id, by: b }); else court++; });
  }
  return { seatsSeen: seats, seats: inn.seats.length, stationsSeen: st, stations: stations.length,
           receptionSeen: !rg, courtSide: courtSide, courtSeen: court, court: courtN, blocked: blocked };
}

/** Planritningens underlag: husets och dygnets meshar i lokal XZ. */
export function planRectsInn(inn: any) {
  inn.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(inn.group.matrixWorld).invert();
  const out: { name: string; x0: number; x1: number; z0: number; z1: number; top: number }[] = [];
  const b = new THREE.Box3();
  inn.group.traverse(function (o: any) {
    if (!o.isMesh || !o.visible) return;
    if (/roof|Roof|candle|Flame|flame|Key\d|lantern|linen|breakfast|chafing|candelabra|Rail$|Post\d|Leg\d?$|rackSuitcase|Bell/.test(o.name)) return;
    b.setFromObject(o).applyMatrix4(inv);
    if (b.max.y - b.min.y > 4.5 && !/^wall/i.test(o.name)) return;
    out.push({ name: o.name, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, top: b.max.y });
  });
  return out;
}
