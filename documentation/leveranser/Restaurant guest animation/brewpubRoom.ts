// brewpubRoom — ölkrog med eget bryggeri i lokalen.
//
// SUPERSEDING_DIRECTIVE_004 (3D-scen, kroppar utan ansikten).
// Verksamhetsklass som rum: tjugo platser, litet kök, bryggeriet i
// samma rum som gästerna.
//
// Kontrakt:
//   • Ren three.js. Inga externa beroenden, ingen skinning, inga
//     loaders, inga binära assets.
//   • Byggs imperativt EN gång (createBrewpubRoom). Inget skapas i
//     renderloopen.
//   • Ingen egen klocka. Det enda som rör sig (omrörararmen i
//     mäskkaret) drivs av en fas anroparen skickar in.
//   • Ingen simuleringslogik. Rummet är geometri.
//
// Formspråket är Restaurant.tsx: bordsskivor som boxar på 0,72 m,
// stolssitsar som cylindrar, väggar och sockel som boxar, entrédörr
// som plan. Samma färger (#8b8477 skiva, #4a453d ben, #6b5b47 disk,
// #8f8b7f vägg, #a49b8a golv). Nytt i den här klassen: stål och
// koppar för kärlen, och en mörkare våt betong i bryggeriets zon.
//
// ── Koordinater ───────────────────────────────────────────────────
// Byggs i byggnadens OBB-lokala ram, samma som interiorLayout.ts:
//   lokal +X = byggnadens långa axel, entrén ligger i +X-änden
//   lokal +Z = korta axeln
//   origo    = polygonens centroid, golvplanet y = 0
// Anroparen placerar gruppen:
//   room.group.position.set(obb.centre[0], 0, obb.centre[1]);
//   room.group.rotation.y = -obb.angle;      // samma som Restaurant
// Alla mått i meter. Alla vinklar i radianer. Kurs (`facing`) är
// yaw i figurens ram: 0 = tittar mot lokal +Z, +PI/2 = mot +X.
// resolveWorldPositions() ger världskoordinater efter placeringen,
// så sim-lagret aldrig gör om transformen själv.
//
// ── Planlösningen, i ett stycke ───────────────────────────────────
// Rummet läses i tre band längs den långa axeln. Bryggeriet och
// köket i -X-änden (där leveransfickan redan ligger), bardisken som
// gräns, matsalen mot entrén i +X. Ölen går tank → disk → gäst längs
// en enda axel, vilket är den enda rörelse en hög kamera kan följa.
//
// Bryggeriet ligger INTE bakom glas. Ett glasparti är ingenting från
// strategisk höjd — en grå smet eller inget alls. Zonen markeras i
// stället med en 0,35 m sockelkant och ett golvbyte, vilket är det
// enda en kamera som ser ovansidor faktiskt läser. Och det finns
// ingen bakhylla bakom baren: tapptornet står på disken och är 0,55 m,
// så siktlinjen från barstolen till tankarna är fri. Se
// SIGHT_LINE_NOTE nedan.
//
// ── Platsfördelningen (tjugo) ─────────────────────────────────────
//   8 barstolar    — vända mot disken, och därmed mot tankarna
//   8 långbordsplatser (2 × 4) — ölhallens vokabulär, längs långaxeln
//   4 platser vid två tvåor — vid entrén
// Åtta ståplatser vid två väggkanter finns som geometri men räknas
// INTE i de tjugo. Se FLAGS.standing.
//
// ── Fast geometri kontra ändringsbart ─────────────────────────────
// FAST (bär planlösningen; ändra inte utan att läsa om rummet):
//   bandindelningen längs +X, sockelkantens linje (BOH_EDGE_X),
//   bardiskens läge och att stolarna vänder mot tankarna,
//   passagerna på 1,05–1,20 m, taket i 3,40 m.
// ÄNDRINGSBART (parametrar, ändrar inte hur rummet läses):
//   antal jästankar (4), sitsfördelningen inom de tjugo, ståkanternas
//   längd, kökets tre stationer, rummets bredd/djup — understiger de
//   MIN_WIDTH_M / MIN_DEPTH_M returneras `fits: false` med underskott
//   i stället för en omtolkad plan.

import * as THREE from 'three';

// #region types

export type Vec2 = [number, number];

export type SeatKind = 'bar' | 'communal' | 'twotop';

export interface SeatSpec {
  /** Stabilt id, t.ex. 'bar3' eller 'longA_n1'. */
  id: string;
  kind: SeatKind;
  /** Sim-lagrets platta seatIndex, 0..19. Ordningen är samma
   *  konvention som interiorLayout.ts: bordsplatser före barstolar. */
  seatIndex: number;
  /** Bordets/diskens id platsen hör till. */
  furnitureId: string;
  /** Sitsens mittpunkt i lokal XZ. */
  local: Vec2;
  /** Sitsens höjd i meter — stol 0,45, barstol 0,75. */
  seatHeight: number;
  /** Kurs så figuren tittar mot bordet respektive disken. */
  facing: number;
  /** Gånggrafens nod platsen nås ifrån. */
  approach: Vec2;
  /** Vilken korridor `approach` sitter i. */
  lane: LaneId;
}

export type LaneId = 'spine' | 'barLane' | 'perimS' | 'perimN';

export interface StandSpec {
  id: string;
  local: Vec2;
  facing: number;
  approach: Vec2;
  lane: LaneId;
}

export interface StaffStation {
  /** 'barkeep' | 'brewer' | 'cook' | 'runner' */
  id: string;
  local: Vec2;
  facing: number;
  /** Kort not om vad stationen är, för monteringskoden. */
  note: string;
}

export interface RoomParts {
  /** Omrörararmen i mäskkaret. Enda rörliga delen. */
  mashRake: THREE.Object3D;
  /** Taket som egen grupp — anroparen tonar den med avståndet,
   *  precis som Restaurant.tsx gör. */
  roof: THREE.Object3D;
  /** Väggarna som egen grupp, av samma skäl. */
  walls: THREE.Object3D;
  /** Inredningen — tonas in när kameran närmar sig. */
  interior: THREE.Object3D;
  /** Bryggeriets grupp — mäts som helhet i measureBrewpubRoom. */
  brewery: THREE.Object3D;
  /** Jästankarnas kupoltoppar. Siktlinjens måltavlor. */
  fermenterTops: THREE.Object3D[];
  /** Fäste på tapptornet där en tappningsindikator kan ankras. */
  tapAnchor: THREE.Object3D;
  /** Fäste vid passluckan där en tallrik kan monteras. */
  passAnchor: THREE.Object3D;
}

export interface BrewpubOptions {
  /** Byggnadens OBB-bredd (långa axeln). Default 15,6 (w869907975). */
  width?: number;
  /** OBB-djup (korta axeln). Default 11,8. */
  depth?: number;
  /** Innertakets höjd. Default 3,40 — jästankarna är 2,73 m. */
  interiorHeight?: number;
  /** Antal jästankar. Default 4. */
  fermenters?: number;
}

export interface BrewpubRoom {
  group: THREE.Group;
  parts: RoomParts;
  /** Tjugo platser, i seatIndex-ordning. */
  seats: SeatSpec[];
  /** Åtta ståplatser. Ingår inte i de tjugo. */
  standing: StandSpec[];
  staffStations: StaffStation[];
  /** Innanför entrédörren, lokal XZ. */
  entrance: Vec2;
  /** Utanför dörren — samma standoff som interiorLayout (2,5 m). */
  waitingSpot: Vec2;
  width: number;
  depth: number;
  /** false om rummet är mindre än planlösningen kräver. */
  fits: boolean;
  /** Underskott i meter [x, z] när fits === false. */
  shortfall: Vec2;
  dispose: () => void;
}

// #endregion types

// ---------- Låsta mått ----------

export const TOTAL_SEATS = 20;
export const STANDING_SPOTS = 8;

/** Under detta går planlösningen inte in. */
export const MIN_WIDTH_M = 13.4;
export const MIN_DEPTH_M = 9.6;

const WALL_T = 0.2;              // vägglivets tjocklek
const BOH_EDGE_X = -3.6;         // sockelkanten: bryggeri/kök mot rummet
const BREW_KITCHEN_Z = 1.0;      // skiljeväggen bryggeri/kök
const BAR_X = -2.2;              // bardiskens mittlinje
const BAR_DEPTH = 0.7;
const BAR_HEIGHT = 1.1;
const BAR_Z0 = -4.5;
const BAR_Z1 = 1.9;
const STOOL_X = -1.4;            // barstol, 0,45 m från diskens framkant
const STOOL_PITCH = 0.76;
const STOOL_HEIGHT = 0.75;
const TABLE_TOP_Y = 0.72;        // Restaurant.tsx
const TABLE_TOP_T = 0.06;
const CHAIR_HEIGHT = 0.45;
const LEDGE_HEIGHT = 1.05;
const STAND_PITCH = 0.9;

/** Ögonhöjd sittande respektive stående, för siktlinjeprovet.
 *  Figuren är 1,70 m; poseSeated sänker höften 0,41 m. */
export const EYE_SEATED_M = 1.29;
export const EYE_STANDING_M = 1.55;

/**
 * SIGHT_LINE_NOTE — varför bardisken ser ut som den gör.
 *
 * Kravet "en gäst som sitter i lokalen ska se att ölen görs där" är
 * geometriskt, inte dekorativt. Barstolen står på lokal X = -1,4 med
 * ögonhöjd 1,29 m. Disken är 1,10 m hög och slutar på X = -1,85.
 * En stråle från ögat över diskens framkant sjunker 0,42 m per meter
 * bakåt — den träffar golvplanet efter drygt två meter. Allt bortom
 * det, tankarna på X ≈ -6,9 med toppar på 2,73 m, ligger ovanför
 * strålen och är alltså fritt synligt. Det som DÄREMOT skulle skymma
 * är en bakhylla i normal höjd (1,6-1,8 m) mellan disk och tankar.
 * Därför finns ingen. Tapptornet är 0,55 m och står i diskens
 * norra ände (Z ≈ 1,7), bortom sista stolen — där baren ändå
 * arbetar. Stod det mitt på disken skymde det alla fyra tankarna
 * för stolen rakt bakom; checkSightLines() hittade det, och tornet
 * flyttades i stället för att talet skrevs om.
 * checkSightLines() mäter det i den scen som faktiskt renderas.
 */
export const SIGHT_LINE_NOTE = 'Ingen bakhylla mellan disk och tank. Tapptorn 0,55 m i diskens norra ände.';

/**
 * FLAGS — det planlösningen inte kan avgöra själv.
 * Presentationslagret fattar inga simuleringsbeslut (§4).
 */
export const FLAGS = {
  businessClass:
    "BusinessClass har ingen 'ölkrog'. Rummet kan inte väljas förrän " +
    'klassen finns i businessClass.ts med capacityFor = 20. ' +
    'Förutsättning för monteringen, inte en del av den här leveransen.',
  counterOrder:
    'Geometrin stöder beställning vid disk — stolarna vänder mot ' +
    'tanken och disken har en fri passage i båda ändar. Men gästens ' +
    'tillståndsmaskin går arriving → waiting → seated → ordered; det ' +
    'finns inget tillstånd för "går till disken, beställer, bär ' +
    'tillbaka". Serveringsflödet är därför bordsservering tills ett ' +
    'sådant tillstånd finns. Uppfinner det inte här.',
  standing:
    'Åtta ståplatser finns som geometri. Sim-lagret känner bara ' +
    'seats[] och TOTAL_SEATS — en stående gäst har inget tillstånd. ' +
    'Ståplatserna räknas därför inte i kapaciteten.',
  brewPhase:
    'updateBrewpubRoom(room, phase) vrider omrörararmen. Om den ska ' +
    'vrida sig alls — vilket kärl som är varmt, om det bryggs i dag — ' +
    'är produktionstillstånd som inte finns i simulationen. ' +
    'Anroparen skickar phase = 0 tills det gör det.',
  kitchenStations:
    'Tre stationer (spis, kall prep, disk) är geometri. Vilken ' +
    'station en given rätt använder kräver en meny-/rättmodell som ' +
    'inte finns.'
};

// ---------- Geometri- och materialcache ----------

const geometryCache = new Map<string, THREE.BufferGeometry>();

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = 'b' + w + '_' + h + '_' + d;
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geometryCache.set(key, g);
  }
  return g;
}

function cyl(r: number, h: number, seg: number): THREE.BufferGeometry {
  const key = 'c' + r + '_' + h + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r, r, h, seg);
    geometryCache.set(key, g);
  }
  return g;
}

function dome(r: number, seg: number): THREE.BufferGeometry {
  const key = 'd' + r + '_' + seg;
  let g = geometryCache.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(r, seg, Math.max(4, seg / 3), 0, Math.PI * 2, 0, Math.PI / 2);
    geometryCache.set(key, g);
  }
  return g;
}

export function disposeBrewpubGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

// Restaurant.tsx-paletten, plus stål/koppar/våt betong för bryggeriet.
const COLOUR = {
  slab: '#6d6a5f',
  wall: '#8f8b7f',
  roof: '#5c5951',
  door: '#1a1815',
  floorDining: '#a49b8a',
  floorBrew: '#7d776c',
  floorKitchen: '#948f84',
  kerb: '#7a746a',
  tableTop: '#8b8477',
  tableLeg: '#4a453d',
  chair: '#b9b3ac',
  bar: '#6b5b47',
  barTop: '#7d6a52',
  steel: '#b9bcc0',
  steelTop: '#d3d6d9',
  copper: '#9c6b44',
  pipe: '#8e9296',
  kitchen: '#767268',
  hood: '#403c36'
};

// ---------- Konstruktion ----------

/**
 * Bygger hela rummet en gång. Returnerar gruppen plus de namngivna
 * platser, stationer och fästen monteringskoden behöver — ingen
 * grävning i scengrafen.
 */
export function createBrewpubRoom(options?: BrewpubOptions): BrewpubRoom {
  const opts = options ?? {};
  const width = opts.width ?? 15.6;
  const depth = opts.depth ?? 11.8;
  const interiorHeight = opts.interiorHeight ?? 3.4;
  const fermenterCount = opts.fermenters ?? 4;

  const fits = width >= MIN_WIDTH_M && depth >= MIN_DEPTH_M;
  const shortfall: Vec2 = [
    Math.max(0, MIN_WIDTH_M - width),
    Math.max(0, MIN_DEPTH_M - depth)
  ];

  const halfW = width / 2;
  const halfD = depth / 2;
  const inX = halfW - WALL_T;   // vägglivets insida
  const inZ = halfD - WALL_T;

  const group = new THREE.Group();
  group.name = 'brewpubRoom';

  const materials: THREE.Material[] = [];
  function mat(colour: string, rough: number, metal: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color: colour,
      roughness: rough,
      metalness: metal
    });
    materials.push(m);
    return m;
  }

  const matSlab = mat(COLOUR.slab, 0.9, 0);
  const matWall = mat(COLOUR.wall, 0.9, 0);
  const matRoof = mat(COLOUR.roof, 0.9, 0);
  const matKerb = mat(COLOUR.kerb, 0.9, 0);
  const matTableTop = mat(COLOUR.tableTop, 0.7, 0);
  const matTableLeg = mat(COLOUR.tableLeg, 0.9, 0);
  const matChair = mat(COLOUR.chair, 0.9, 0);
  const matBar = mat(COLOUR.bar, 0.85, 0);
  const matBarTop = mat(COLOUR.barTop, 0.6, 0);
  const matSteel = mat(COLOUR.steel, 0.35, 0.65);
  const matSteelTop = mat(COLOUR.steelTop, 0.25, 0.7);
  const matCopper = mat(COLOUR.copper, 0.4, 0.6);
  const matPipe = mat(COLOUR.pipe, 0.4, 0.55);
  const matKitchen = mat(COLOUR.kitchen, 0.9, 0);
  const matHood = mat(COLOUR.hood, 0.85, 0.2);

  function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material,
               x: number, y: number, z: number, name: string): THREE.Mesh {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = name;
    parent.add(m);
    return m;
  }

  function slabPlate(parent: THREE.Object3D, material: THREE.Material,
                     w: number, d: number, x: number, z: number, name: string): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.11, z);
    m.receiveShadow = true;
    m.name = name;
    parent.add(m);
    return m;
  }

  // ── Skal ──────────────────────────────────────────────────────
  put(group, box(width + 0.3, 0.1, depth + 0.3), matSlab, 0, 0.05, 0, 'slab');

  const walls = new THREE.Group();
  walls.name = 'walls';
  group.add(walls);
  const wy = interiorHeight / 2 + 0.1;
  put(walls, box(WALL_T, interiorHeight, depth), matWall, -halfW + WALL_T / 2, wy, 0, 'wallW');
  put(walls, box(WALL_T, interiorHeight, depth), matWall, halfW - WALL_T / 2, wy, 0, 'wallE');
  put(walls, box(width, interiorHeight, WALL_T), matWall, 0, wy, -halfD + WALL_T / 2, 'wallS');
  put(walls, box(width, interiorHeight, WALL_T), matWall, 0, wy, halfD - WALL_T / 2, 'wallN');

  const roof = new THREE.Group();
  roof.name = 'roof';
  group.add(roof);
  put(roof, box(width + 0.4, 0.3, depth + 0.4), matRoof, 0, interiorHeight + 0.25, 0, 'roofSlab');

  // Entrédörren som plan i +X-väggen, samma primitiv som Restaurant.
  const doorMat = new THREE.MeshBasicMaterial({ color: COLOUR.door });
  materials.push(doorMat);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), doorMat);
  door.position.set(halfW - 0.05, 1.05, 0);
  door.rotation.y = Math.PI / 2;
  door.name = 'entranceDoor';
  group.add(door);
  // Leveranslucka i -X-väggen — maltsäckarna kommer från leveransfickan.
  const hatch = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.0), doorMat);
  hatch.position.set(-halfW + 0.05, 1.0, -1.6);
  hatch.rotation.y = -Math.PI / 2;
  hatch.name = 'deliveryHatch';
  group.add(hatch);

  // ── Inredning ─────────────────────────────────────────────────
  const interior = new THREE.Group();
  interior.name = 'interior';
  group.add(interior);

  // Golvzonerna. Färgbytet är zonmarkeringen en hög kamera läser.
  const matFloorDining = mat(COLOUR.floorDining, 0.9, 0);
  const matFloorBrew = mat(COLOUR.floorBrew, 0.75, 0);
  const matFloorKitchen = mat(COLOUR.floorKitchen, 0.85, 0);
  const diningW = inX - BOH_EDGE_X;
  slabPlate(interior, matFloorDining, diningW, inZ * 2,
            BOH_EDGE_X + diningW / 2, 0, 'floorDining');
  const brewD = BREW_KITCHEN_Z + inZ;
  slabPlate(interior, matFloorBrew, BOH_EDGE_X + inX, brewD,
            -inX + (BOH_EDGE_X + inX) / 2, -inZ + brewD / 2, 'floorBrew');
  const kitD = inZ - BREW_KITCHEN_Z;
  slabPlate(interior, matFloorKitchen, BOH_EDGE_X + inX, kitD,
            -inX + (BOH_EDGE_X + inX) / 2, BREW_KITCHEN_Z + kitD / 2, 'floorKitchen');

  // Sockelkanten. 0,35 m — inget glas. Zonen läses från ovansidan.
  put(interior, box(0.16, 0.35, brewD), matKerb,
      BOH_EDGE_X, 0.285, -inZ + brewD / 2, 'breweryKerb');
  // Skiljevägg bryggeri/kök. 1,5 m: hög nog att läsas som en gräns
  // uppifrån, låg nog att inte skymma tanktopparna från barstolarna.
  put(interior, box(BOH_EDGE_X + inX, 1.5, 0.15), matWall,
      -inX + (BOH_EDGE_X + inX) / 2, 0.86, BREW_KITCHEN_Z, 'brewKitchenWall');

  // ── Bryggeriet ────────────────────────────────────────────────
  // L: jästankarna längs baksidesväggen, bryggverket längs -Z-änden,
  // arbetsytan i hörnet mellan dem.
  const brewery = new THREE.Group();
  brewery.name = 'brewery';
  interior.add(brewery);

  const fermenterTops: THREE.Object3D[] = [];
  const fermX = -6.9;
  const fermZ0 = -3.4;
  const fermPitch = 1.25;
  for (let i = 0; i < fermenterCount; i++) {
    const z = fermZ0 + i * fermPitch;
    put(brewery, cyl(0.55, 2.4, 20), matSteel, fermX, 1.31, z, 'fermenter' + i);
    const top = put(brewery, dome(0.55, 20), matSteelTop, fermX, 2.51, z, 'fermenterTop' + i);
    top.scale.y = 0.4;   // flack tankhjässa: 2,73 m under ett tak på 3,40
    // Ringen på hjässan: det kameran uppifrån faktiskt läser som tank.
    put(brewery, cyl(0.6, 0.07, 20), matSteelTop, fermX, 2.47, z, 'fermenterRing' + i);
    fermenterTops.push(top);
  }

  // Bryggverket: mäskkar, kokkärl, hetvattentank.
  put(brewery, box(3.6, 0.25, 1.7), matKerb, -5.6, 0.235, -4.9, 'brewhousePlinth');
  put(brewery, cyl(0.72, 1.5, 20), matCopper, -6.7, 1.1, -4.9, 'mashTun');
  put(brewery, cyl(0.76, 0.08, 20), matCopper, -6.7, 1.89, -4.9, 'mashTunRim');
  put(brewery, cyl(0.72, 1.7, 20), matCopper, -5.1, 1.2, -4.9, 'brewKettle');
  put(brewery, cyl(0.76, 0.08, 20), matCopper, -5.1, 2.09, -4.9, 'brewKettleRim');
  put(brewery, cyl(0.42, 1.9, 16), matSteel, -4.2, 1.06, -4.9, 'hotLiquorTank');
  // Maltsäckar på pall. En hög silo stod först här och skymde den
  // fjärde jästanken från halva baren — pallen är 0,5 m och ligger
  // under siktlinjen. Säckarna kommer in genom leveransluckan.
  put(brewery, box(1.2, 0.12, 1.0), matKerb, -4.6, 0.17, 0.3, 'grainPallet');
  put(brewery, box(1.05, 0.2, 0.85), matKitchen, -4.6, 0.33, 0.3, 'grainSacksA');
  put(brewery, box(0.9, 0.18, 0.7), matKitchen, -4.62, 0.52, 0.32, 'grainSacksB');
  // Rörgata längs tankraden, 0,35 m — syns som en linje uppifrån.
  put(brewery, box(0.12, 0.12, 5.0), matPipe, -6.2, 0.41, -1.7, 'brewPipe');
  put(brewery, box(2.3, 0.12, 0.12), matPipe, -5.4, 0.41, -4.2, 'brewPipeCross');

  // Omrörararmen i mäskkaret — enda rörliga delen, driven av fas.
  const mashRake = new THREE.Group();
  mashRake.name = 'mashRake';
  mashRake.position.set(-6.7, 1.93, -4.9);
  brewery.add(mashRake);
  put(mashRake, box(1.3, 0.06, 0.09), matSteel, 0, 0, 0, 'rakeArmA');
  put(mashRake, box(0.09, 0.06, 1.3), matSteel, 0, 0, 0, 'rakeArmB');
  put(mashRake, cyl(0.07, 0.34, 10), matSteel, 0, 0.17, 0, 'rakeShaft');

  // ── Köket ─────────────────────────────────────────────────────
  const kitchen = new THREE.Group();
  kitchen.name = 'kitchen';
  interior.add(kitchen);
  put(kitchen, box(1.2, 0.9, 2.0), matKitchen, -6.9, 0.56, 2.4, 'stationRange');
  put(kitchen, box(1.3, 0.35, 2.1), matHood, -6.9, 2.05, 2.4, 'rangeHood');
  put(kitchen, box(1.2, 0.9, 1.0), matKitchen, -6.9, 0.56, 4.4, 'stationWash');
  put(kitchen, box(2.2, 0.9, 0.8), matKitchen, -4.9, 0.56, 5.1, 'stationPrep');
  // Passluckan: disk utan vägg ovanför. Rätten går över kanten.
  put(kitchen, box(0.4, 1.05, 2.0), matBar, BOH_EDGE_X - 0.2, 0.635, 3.2, 'passCounter');
  put(kitchen, box(0.5, 0.05, 2.1), matBarTop, BOH_EDGE_X - 0.2, 1.185, 3.2, 'passCounterTop');
  const passAnchor = new THREE.Object3D();
  passAnchor.name = 'passAnchor';
  passAnchor.position.set(BOH_EDGE_X - 0.2, 1.21, 3.2);
  kitchen.add(passAnchor);

  // ── Bardisken ─────────────────────────────────────────────────
  const barGroup = new THREE.Group();
  barGroup.name = 'bar';
  interior.add(barGroup);
  const barLen = BAR_Z1 - BAR_Z0;
  const barZc = (BAR_Z0 + BAR_Z1) / 2;
  put(barGroup, box(BAR_DEPTH, BAR_HEIGHT, barLen), matBar, BAR_X, BAR_HEIGHT / 2 + 0.11, barZc, 'barCounter');
  put(barGroup, box(BAR_DEPTH + 0.1, 0.05, barLen + 0.1), matBarTop, BAR_X, BAR_HEIGHT + 0.135, barZc, 'barCounterTop');
  // Tapptornet: 0,55 m, i diskens norra ände bortom sista stolen.
  // Se SIGHT_LINE_NOTE — placeringen är ett siktlinjebeslut.
  put(barGroup, box(0.34, 0.55, 0.6), matSteel, BAR_X, BAR_HEIGHT + 0.435, 1.72, 'tapBank');
  const tapAnchor = new THREE.Object3D();
  tapAnchor.name = 'tapAnchor';
  tapAnchor.position.set(BAR_X + 0.2, BAR_HEIGHT + 0.55, 1.72);
  barGroup.add(tapAnchor);

  // ── Möbler och platser ────────────────────────────────────────
  const seats: SeatSpec[] = [];
  const furniture = new THREE.Group();
  furniture.name = 'furniture';
  interior.add(furniture);

  function tableBox(id: string, x: number, z: number, lx: number, lz: number): void {
    const t = new THREE.Group();
    t.name = id;
    t.position.set(x, 0, z);
    furniture.add(t);
    put(t, box(lx, TABLE_TOP_T, lz), matTableTop, 0, TABLE_TOP_Y + 0.11, 0, id + 'Top');
    const legX = lx / 2 - 0.18;
    const legZ = lz / 2 - 0.18;
    const corners: Vec2[] = lx > 1.6
      ? [[-legX, -legZ], [legX, -legZ], [-legX, legZ], [legX, legZ]]
      : [[0, 0]];
    for (let i = 0; i < corners.length; i++) {
      put(t, cyl(0.05, TABLE_TOP_Y, 8), matTableLeg,
          corners[i][0], TABLE_TOP_Y / 2 + 0.11, corners[i][1], id + 'Leg' + i);
    }
  }

  function chair(x: number, z: number, facing: number, id: string): void {
    const c = new THREE.Group();
    c.name = id;
    c.position.set(x, 0, z);
    c.rotation.y = facing;
    furniture.add(c);
    put(c, cyl(0.22, 0.05, 12), matChair, 0, CHAIR_HEIGHT + 0.11, 0, id + 'Seat');
    put(c, cyl(0.04, CHAIR_HEIGHT, 8), matChair, 0, CHAIR_HEIGHT / 2 + 0.11, 0, id + 'Stem');
    put(c, box(0.42, 0.4, 0.04), matChair, 0, CHAIR_HEIGHT + 0.32, -0.2, id + 'Back');
  }

  function stool(x: number, z: number, facing: number, id: string): void {
    const c = new THREE.Group();
    c.name = id;
    c.position.set(x, 0, z);
    c.rotation.y = facing;
    furniture.add(c);
    put(c, cyl(0.19, 0.05, 12), matChair, 0, STOOL_HEIGHT + 0.11, 0, id + 'Seat');
    put(c, cyl(0.045, STOOL_HEIGHT, 8), matChair, 0, STOOL_HEIGHT / 2 + 0.11, 0, id + 'Stem');
    put(c, cyl(0.17, 0.03, 12), matChair, 0, 0.13, 0, id + 'Foot');
  }

  // Långborden — ölhallens vokabulär, längs långaxeln.
  const longSpec = [
    { id: 'longA', z: -2.9, seatZ: [-3.65, -2.15] },
    { id: 'longB', z: 2.9, seatZ: [2.15, 3.65] }
  ];
  for (let li = 0; li < longSpec.length; li++) {
    const L = longSpec[li];
    tableBox(L.id, 1.9, L.z, 2.4, 0.95);
    for (let side = 0; side < 2; side++) {
      const sz = L.seatZ[side];
      const facing = sz < L.z ? 0 : Math.PI;
      for (let k = 0; k < 2; k++) {
        const sx = 1.9 + (k === 0 ? -0.6 : 0.6);
        const id = L.id + (side === 0 ? '_s' : '_n') + (k + 1);
        chair(sx, sz, facing, 'chair_' + id);
        const perimLane: LaneId = L.z < 0 ? 'perimS' : 'perimN';
        const outer = (L.z < 0 && side === 0) || (L.z > 0 && side === 1);
        seats.push({
          id: id,
          kind: 'communal',
          seatIndex: seats.length,
          furnitureId: L.id,
          local: [sx, sz],
          seatHeight: CHAIR_HEIGHT,
          facing: facing,
          approach: outer ? [sx, L.z < 0 ? -4.6 : 4.6] : [sx, 0],
          lane: outer ? perimLane : 'spine'
        });
      }
    }
  }

  // Två tvåor vid entrén. Seat-offset längs X, som interiorLayout.
  const twoSpec = [
    { id: 'twoC', x: 5.2, z: -3.4, lane: 'perimS' },
    { id: 'twoD', x: 5.2, z: 3.4, lane: 'perimN' }
  ];
  for (let ti = 0; ti < twoSpec.length; ti++) {
    const T = twoSpec[ti];
    tableBox(T.id, T.x, T.z, 1.05, 1.05);
    for (let k = 0; k < 2; k++) {
      const sx = T.x + (k === 0 ? -0.7 : 0.7);
      const facing = k === 0 ? Math.PI / 2 : -Math.PI / 2;
      chair(sx, T.z, facing, 'chair_' + T.id + (k + 1));
      seats.push({
        id: T.id + (k + 1),
        kind: 'twotop',
        seatIndex: seats.length,
        furnitureId: T.id,
        local: [sx, T.z],
        seatHeight: CHAIR_HEIGHT,
        facing: facing,
        approach: [sx, T.z < 0 ? -4.6 : 4.6],
        lane: T.lane === 'perimS' ? 'perimS' : 'perimN'
      });
    }
  }

  // Barstolarna sist — samma ordning som interiorLayout (bord, sedan bar).
  const stoolZ0 = -3.95;
  for (let i = 0; i < 8; i++) {
    const z = stoolZ0 + i * STOOL_PITCH;
    stool(STOOL_X, z, -Math.PI / 2, 'stool' + i);
    seats.push({
      id: 'bar' + (i + 1),
      kind: 'bar',
      seatIndex: seats.length,
      furnitureId: 'barCounter',
      local: [STOOL_X, z],
      seatHeight: STOOL_HEIGHT,
      facing: -Math.PI / 2,
      approach: [-0.6, z],
      lane: 'barLane'
    });
  }

  // ── Ståkanter ─────────────────────────────────────────────────
  const standing: StandSpec[] = [];
  const ledgeSpec = [
    { id: 'ledgeS', z: -inZ + 0.25, facing: 0 },
    { id: 'ledgeN', z: inZ - 0.25, facing: Math.PI }
  ];
  for (let gi = 0; gi < ledgeSpec.length; gi++) {
    const G = ledgeSpec[gi];
    put(interior, box(3.6, 0.06, 0.35), matBarTop, 1.3, LEDGE_HEIGHT + 0.11, G.z, G.id + 'Top');
    put(interior, box(3.6, LEDGE_HEIGHT, 0.1), matBar, 1.3, LEDGE_HEIGHT / 2 + 0.11, G.z - (G.facing === 0 ? 0.14 : -0.14), G.id + 'Skirt');
    for (let k = 0; k < 4; k++) {
      const sx = 1.3 - 1.35 + k * STAND_PITCH;
      const sz = G.z + (G.facing === 0 ? 0.62 : -0.62);
      standing.push({
        id: G.id + (k + 1),
        local: [sx, sz],
        facing: G.facing,
        approach: [sx, G.facing === 0 ? -4.6 : 4.6],
        lane: G.facing === 0 ? 'perimS' : 'perimN'
      });
    }
  }

  const entrance: Vec2 = [halfW - 0.6, 0];
  const waitingSpot: Vec2 = [halfW + 2.5, 0];

  const staffStations: StaffStation[] = [
    {
      id: 'barkeep',
      local: [-3.0, -1.3],
      facing: Math.PI / 2,
      note: 'Bakom disken, mitt för tapptornet. Runway 1,05 m, fri passage i båda ändar (Z < -4,5 och Z > 1,9).'
    },
    {
      id: 'brewer',
      local: [-5.5, -3.3],
      facing: Math.PI,
      note: 'I L-hörnet mellan tankraden och bryggverket. Vänd mot mäskkar och kokkärl.'
    },
    {
      id: 'cook',
      local: [-5.9, 2.4],
      facing: -Math.PI / 2,
      note: 'Vid spisen. Tre stationer inom två steg: spis, disk, kall prep.'
    },
    {
      id: 'runner',
      local: [-3.05, 3.2],
      facing: -Math.PI / 2,
      note: 'Vid passluckan. Bär ut till bord; ölen hämtas vid disken.'
    }
  ];

  const parts: RoomParts = {
    mashRake: mashRake,
    roof: roof,
    walls: walls,
    interior: interior,
    brewery: brewery,
    fermenterTops: fermenterTops,
    tapAnchor: tapAnchor,
    passAnchor: passAnchor
  };

  return {
    group: group,
    parts: parts,
    seats: seats,
    standing: standing,
    staffStations: staffStations,
    entrance: entrance,
    waitingSpot: waitingSpot,
    width: width,
    depth: depth,
    fits: fits,
    shortfall: shortfall,
    dispose: function () {
      materials.forEach(function (m) { m.dispose(); });
      group.removeFromParent();
    }
  };
}

/**
 * Enda rörliga delen. `phase` är 0..1 och kommer från anroparen —
 * rummet äger ingen klocka. Se FLAGS.brewPhase: om armen ska vrida
 * sig alls är ett produktionstillstånd som inte finns ännu.
 */
export function updateBrewpubRoom(room: BrewpubRoom, phase: number): void {
  room.parts.mashRake.rotation.y = (phase ?? 0) * Math.PI * 2;
}

// ---------- Gånggrafen ----------

const LANE_Z = { spine: 0, barLane: 0, perimS: -4.6, perimN: 4.6 };
const LANE_ENTRY_X = 6.9;   // där entréstråket viker av till perimetern
const BAR_LANE_X = -0.6;    // korridoren framför barstolarna

/**
 * Vägpunkter från entrén till en plats, i lokal XZ. Rummet deklarerar
 * sina egna passager i stället för att lämna framkomligheten åt
 * gissningar — playwright-provet i §7 går den här listan.
 */
export function walkPathToSeat(room: BrewpubRoom, seatId: string): Vec2[] {
  const seat = room.seats.find(function (s) { return s.id === seatId; });
  if (!seat) return [];
  const path: Vec2[] = [[room.entrance[0], room.entrance[1]]];
  if (seat.lane === 'spine') {
    path.push([seat.approach[0], 0]);
  } else if (seat.lane === 'barLane') {
    path.push([BAR_LANE_X, 0]);
    path.push([BAR_LANE_X, seat.approach[1]]);
  } else {
    const lz = seat.lane === 'perimS' ? LANE_Z.perimS : LANE_Z.perimN;
    path.push([LANE_ENTRY_X, 0]);
    path.push([LANE_ENTRY_X, lz]);
    path.push([seat.approach[0], lz]);
  }
  path.push([seat.local[0], seat.local[1]]);
  return path;
}

/** Vägen ut: samma korridorer baklänges, ut till väntplatsen. */
export function exitPathFromSeat(room: BrewpubRoom, seatId: string): Vec2[] {
  const back = walkPathToSeat(room, seatId).slice().reverse();
  back.push([room.waitingSpot[0], room.waitingSpot[1]]);
  return back;
}

// ---------- Mätning (§7) ----------

/**
 * Mäter rummet i den scen som faktiskt renderas — samma tal
 * playwright ska hitta efter montering. Ett rum som finns i grafen
 * men inte har utbredning ger nollor här.
 */
export function measureBrewpubRoom(room: BrewpubRoom): {
  footprint: Vec2;
  interiorHeight: number;
  seatCount: number;
  standingCount: number;
  vesselCount: number;
  tallestVessel: number;
} {
  room.group.updateWorldMatrix(true, true);
  const bb = new THREE.Box3().setFromObject(room.parts.interior);
  let vessels = 0;
  room.parts.interior.traverse(function (o) {
    const n = o.name;
    if (n.indexOf('fermenter') === 0 || n === 'mashTun' || n === 'brewKettle' ||
        n === 'hotLiquorTank') {
      if (n.indexOf('Top') < 0 && n.indexOf('Ring') < 0 && n.indexOf('Rim') < 0) {
        vessels++;
      }
    }
  });
  const brewBox = new THREE.Box3().setFromObject(room.parts.brewery);
  return {
    footprint: [bb.max.x - bb.min.x, bb.max.z - bb.min.z],
    interiorHeight: bb.max.y - bb.min.y,
    seatCount: room.seats.length,
    standingCount: room.standing.length,
    vesselCount: vessels,
    tallestVessel: brewBox.max.y
  };
}

/**
 * Siktlinjeprovet: från varje plats, hur många jästankar syns?
 * Strålen går från ögonhöjd till tankens kupoltopp och räknas som
 * skymd om något annat i rummet ligger i vägen. Kroppar och
 * annotationer ska ligga utanför `room.group` när provet körs.
 */
export function checkSightLines(room: BrewpubRoom): {
  perSeat: { seatId: string; visible: number }[];
  seatsSeeingBrewery: number;
  barSeatsSeeingAll: number;
  /** Platser utan fri sikt till någon tank. */
  blindSeats: string[];
} {
  room.group.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tops = room.parts.fermenterTops;
  const perSeat = [];
  const blindSeats = [];
  let seeing = 0;
  let barAll = 0;
  for (let i = 0; i < room.seats.length; i++) {
    const s = room.seats[i];
    origin.set(s.local[0], EYE_SEATED_M, s.local[1]);
    room.group.localToWorld(origin);
    let visible = 0;
    for (let t = 0; t < tops.length; t++) {
      tops[t].getWorldPosition(target);
      dir.copy(target).sub(origin);
      const dist = dir.length();
      ray.set(origin, dir.normalize());
      ray.far = dist - 0.62;   // tankens radie: träffa inte måltavlan
      const hits = ray.intersectObject(room.group, true);
      let blocked = false;
      for (let h = 0; h < hits.length; h++) {
        const n = hits[h].object.name;
        if (n.indexOf('fermenter') === 0) continue;
        if (n === 'floorDining' || n === 'floorBrew' || n === 'floorKitchen') continue;
        blocked = true;
        break;
      }
      if (!blocked) visible++;
    }
    if (visible > 0) seeing++;
    else blindSeats.push(s.id);
    if (s.kind === 'bar' && visible === tops.length) barAll++;
    perSeat.push({ seatId: s.id, visible: visible });
  }
  return {
    perSeat: perSeat,
    seatsSeeingBrewery: seeing,
    barSeatsSeeingAll: barAll,
    blindSeats: blindSeats
  };
}

/**
 * Världskoordinater för platser, ståplatser, stationer och entré
 * efter att gruppen placerats. Bron till interiorLayout: sim-lagret
 * får en platt seats-lista i seatIndex-ordning, precis som i dag.
 */
export function resolveWorldPositions(room: BrewpubRoom): {
  seats: Vec2[];
  standing: Vec2[];
  staffStations: Vec2[];
  entrance: Vec2;
  waitingSpot: Vec2;
} {
  room.group.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  function toWorld(p: Vec2): Vec2 {
    v.set(p[0], 0, p[1]);
    room.group.localToWorld(v);
    return [v.x, v.z];
  }
  return {
    seats: room.seats.map(function (s) { return toWorld(s.local); }),
    standing: room.standing.map(function (s) { return toWorld(s.local); }),
    staffStations: room.staffStations.map(function (s) { return toWorld(s.local); }),
    entrance: toWorld(room.entrance),
    waitingSpot: toWorld(room.waitingSpot)
  };
}
