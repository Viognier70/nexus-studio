// figureProps — handrekvisita och huvudbonader för den strategiska scenen.
//
// SUPERSEDING_DIRECTIVE_004 §3 (Kroppar i rummet).
// Bygger på figureRig.ts. Monteras på riggens befintliga ankare.
//
// Kontrakt (samma som riggen):
//   • Ren three.js, primitiver, inga externa beroenden, inga loaders,
//     inga binära assets.
//   • Byggs imperativt EN gång per figur. Inget skapas i renderloopen.
//   • Ingen egen klocka, ingen simuleringslogik. Urvalet — vilken
//     arketyp som bär vad — är redan bestämt i archetypes.ts och
//     rörs inte här. Den här filen levererar formerna.
//   • Delad geometricache. Fyrtio gäster i rummet ska inte betyda
//     fyrtio uppsättningar buffertar.
//
// Nycklarna är archetypes.ts egna: HandProp = iceCream | briefcase |
// camera | thermos | null, HeadTopping = ruffled | shortCut | workCap |
// sunHat | grayHair | hoodRaised. De skrivs oförvanskade så en
// koppling kan göras med en uppslagning i stället för en översättning.
//
// ═══════════════════════════════════════════════════════════════════
// 1. SILHUETTKONTRAKTET — svaret på briefens enda verkliga designfråga
// ═══════════════════════════════════════════════════════════════════
//
// SD-004 §3.3: huvudets övre hemisfär bär garment- eller uniforms-
// färgen. Det är den enda ytan den strategiska kameran säkert ser, och
// hela skälet till att figurerna inte behöver ansikten. En bonad som
// täcker hjässan tar bort just den ytan.
//
// Briefen erbjuder tre vägar och begär ett motiverat val. Svaret är
// inte ett val för alla sex — det är TVÅ val, och gränsen går mellan
// hår och huvudbonad:
//
//   HÅR (ruffled, shortCut, grayHair) → LÄMNAR HJÄSSAN FRI.
//   Kalotten i figureRig täcker klotet ned till 1,15 rad från polen.
//   Håret byggs som en SFÄRISK SEKTOR av samma klot, från exakt den
//   vinkeln och ned förbi ekvatorn — alltså kraniets egen yta,
//   flyttad utåt med hårets tjocklek. Uppifrån syns håret som en smal
//   rand runt en oförändrad kalott. Det är också anatomiskt rätt: hår
//   växer inte ovanpå en hjässa, det ramar in den.
//   (En rak extruderad ring mot ett runt kranium glappar upp till
//   5,6 mm och visar en öppen ränna uppifrån. Se shell().)
//
//   HUVUDBONAD (workCap, sunHat, hoodRaised) → BÄR GARMENT-FÄRGEN.
//   En keps, en solhatt och en huva täcker hjässan — det är vad de ÄR.
//   Att göra dem små nog att kalotten dominerar hade gjort dem till
//   dekaler. I stället ärver bonadens ovansida garment- eller
//   uniformsfärgen, och igenkänningen flyttas till FORMEN:
//     workCap    — skärm som skjuter fram 0,15 m. Uppifrån en
//                  asymmetrisk utväxt på en annars rund hjässa.
//     sunHat     — brätte som ring, ytterradie 0,27 m mot huvudets
//                  0,12. Uppifrån en skiva med färgad mitt.
//     hoodRaised — skal med radie 0,155 plus nackmassa. Uppifrån en
//                  större, äggformad hjässa i samma färg.
//   Ingen av de tre ändrar VILKEN färg kameran ser uppifrån. Alla tre
//   ändrar formen den ser. Kontraktet håller, igenkänningen finns.
//
// checkCrownCoverage() mäter det i stället för att påstå det: den
// skjuter strålar rakt ned över hjässan och räknar hur stor andel av
// träffarna som landar på en yta i identitetsfärgen. Alla sex
// bonaderna ska ge ≥ 0,95. En bonad som faller under det har brutit
// kontraktet, och då är det ett tal och inte en åsikt.
//
// ═══════════════════════════════════════════════════════════════════
// 2. FÄRGERNA — bandet har TVÅ fönster, inte ett
// ═══════════════════════════════════════════════════════════════════
//
// silhouetteContrast.ts kräver 1,8–3,6 mot varje golv en figur kan
// stå på. Rumsleveranserna har hittills bara använt den MÖRKA
// lösningen — figurfärger under golvet. Men villkoret är ett
// intervall på ett KVOTVÄRDE, och kvoten är symmetrisk: en färg får
// lika gärna vara ljusare än golvet.
//
// Mätt mot samtliga fjorton golvzoner i de fyra klasserna
// (restaurang, ölkrog 3, vinbar 5, gästgiveri 5), som spänner
// L 0,1864 (ölkrogens bryggerigolv) till L 0,3317 (dess matsal):
//
//     MÖRKT fönster   L 0,0560 – 0,0813   (bredd 0,025)
//     LJUST fönster   L 0,6371 – 0,8009   (bredd 0,164)
//
// Det ljusa fönstret är sex gånger bredare. Det är inte en kuriositet:
// det är enda sättet rekvisitan kan fungera. Garment-färgerna ligger
// på L ≈ 0,083, alltså i det mörka fönstret. En portfölj i samma
// fönster får kontrast 1,12 mot kroppen den hänger intill — den
// klarar golvprovet och är ändå osynlig. I det ljusa fönstret blir
// samma portfölj 5,79 mot garment och 2,0–3,3 mot varje golv.
//
// Därav regeln nedan: allt som överlappar kroppen eller kalotten
// ligger i det LJUSA fönstret. Bara håret ligger i det mörka, och det
// har ett skäl — håret rör inte kalotten, det sitter i huvudets kant
// och läses mot golvet bakom, inte mot garment framför.

import * as THREE from 'three';

// #region types

/** Samma literaler som HandProp i archetypes.ts. */
export type HandPropId = 'iceCream' | 'briefcase' | 'camera' | 'thermos';

/** Samma literaler som HeadTopping i archetypes.ts. */
export type HeadToppingId =
  | 'ruffled' | 'shortCut' | 'workCap' | 'sunHat' | 'grayHair' | 'hoodRaised';

export interface PropOptions {
  /** Identitetsfärgen. Bonader som täcker hjässan ärver den. */
  garmentColour?: string;
  /** Hudton, för hårfästet. */
  skinColour?: string;
}

export interface PropHandle {
  group: THREE.Group;
  /** Material per figur; geometrin är delad. */
  materials: THREE.MeshStandardMaterial[];
  dispose: () => void;
}

// #endregion types

// ---------- Måtten ----------
//
// Allt är härlett ur figuren, inte valt fritt: 1,70 m hög, axelbredd
// 0,46, huvudradie 0,12, handen i änden av en 0,25 m underarm.
// Storleken löses aldrig genom att förstora — samma regel som riggen.

export const PROPS = {
  headRadius: 0.12,
  /** Kalottens undre gräns i huvudets ram. Hår börjar exakt här. */
  crownFloorY: 0.169,
  /** Hårets sektor slutar vid dessa phi — alla förbi ekvatorn 1,5708,
   *  så håret ramar in skallen i stället för att sitta på den. */
  hairPhiRuffled: 1.92,
  hairPhiShort: 1.74,
  hairPhiGray: 1.88,
  capShellRadius: 0.128,
  capVisorLength: 0.17,
  capVisorWidth: 0.205,
  hatBrimInner: 0.125,
  hatBrimOuter: 0.27,
  hatBrimY: 0.168,
  hoodRadius: 0.155,
  coneHeight: 0.11,
  coneRadius: 0.036,
  scoopRadius: 0.042,
  caseWidth: 0.26,
  capShellPhi: 1.66,
  caseHeight: 0.22,
  caseDepth: 0.075,
  cameraBody: 0.10,
  cameraLens: 0.028,
  thermosRadius: 0.037,
  thermosHeight: 0.20
};

// ---------- Kontrastfönstren ----------

/** Mörka lösningen: figurfärger under golvet. Garment bor här. */
export const DARK_WINDOW = { min: 0.0560, max: 0.0813 };

/** Kalottens vinkel från polen, ur figureRig.ts. Hår börjar här. */
export const CROWN_PHI = 1.15;
/** Kalottens fotavtryck i XZ: sin(1,15) × huvudradien, med marginal. */
export const CROWN_DISC_R = Math.sin(CROWN_PHI) * PROPS.headRadius * 0.96;
/** Ljusa lösningen. Sex gånger bredare — och där rekvisitan bor. */
export const LIGHT_WINDOW = { min: 0.6371, max: 0.8009 };

/**
 * Rekvisitans egna toner. Åtta av tio i det ljusa fönstret; de två
 * mörka är hår, som läses mot golvet och inte mot kroppen.
 *
 * Uppmätt mot samtliga fjorton golvzoner: 1,99–3,26. Inget par utanför
 * bandet. De ljusa ger dessutom 5,76–5,79 mot garment-färgerna, vilket
 * är vad som gör dem synliga intill kroppen.
 */
export const PROP_COLOURS: { [k: string]: string } = {
  iceCream: '#dfdcd8',
  iceCreamScoop: '#eadbc1',
  briefcase: '#eadbc4',
  camera: '#d9dde5',
  cameraLens: '#494a4d',
  thermos: '#c5e1ee',
  hairRuffled: '#584738',
  hairShort: '#4c4a48',
  hairGray: '#dcdcdf',
  capVisor: '#bfe1fa',
  hatBrim: '#e9dcb9',
  hoodTrim: '#d0e2cb'
};

/** Vilken tonvariant respektive färg tillhör. För testet. */
export const PROP_WINDOW: { [k: string]: string } = {
  iceCream: 'light', iceCreamScoop: 'light', briefcase: 'light',
  camera: 'light', cameraLens: 'dark', thermos: 'light',
  hairRuffled: 'dark', hairShort: 'dark', hairGray: 'light',
  capVisor: 'light', hatBrim: 'light', hoodTrim: 'light'
};

// ---------- WCAG, samma formel som silhouetteContrast.ts ----------
//
// Duplicerad här av samma skäl som i rumsfilerna, och med samma
// invändning: se FLAGS.duplicatedPaletteCode. silhouetteContrast.zones.ts
// levererar den generiska versionen.

function chan(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * chan(parseInt(h.substring(0, 2), 16)) +
         0.7152 * chan(parseInt(h.substring(2, 4), 16)) +
         0.0722 * chan(parseInt(h.substring(4, 6), 16));
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Prövar varje rekvisitafärg mot varje golvzon som skickas in.
 * Tom lista = paletten håller.
 */
export function checkPropPalette(
  floorColours: string[],
  minRatio: number = 1.8,
  maxRatio: number = 3.6
): { prop: string; floor: string; ratio: number }[] {
  const fails = [];
  const keys = Object.keys(PROP_COLOURS);
  for (let i = 0; i < keys.length; i++) {
    for (let f = 0; f < floorColours.length; f++) {
      const r = contrast(PROP_COLOURS[keys[i]], floorColours[f]);
      if (r < minRatio || r > maxRatio) {
        fails.push({ prop: keys[i], floor: floorColours[f], ratio: r });
      }
    }
  }
  return fails;
}

/** Kontrastintervall mot golven, och mot en garment-färg. */
export function propContrastRange(
  floorColours: string[],
  garmentColour: string
): { floorMin: number; floorMax: number; garmentMin: number } {
  let fLo = Infinity;
  let fHi = 0;
  let gLo = Infinity;
  const keys = Object.keys(PROP_COLOURS);
  for (let i = 0; i < keys.length; i++) {
    for (let f = 0; f < floorColours.length; f++) {
      const r = contrast(PROP_COLOURS[keys[i]], floorColours[f]);
      if (r < fLo) fLo = r;
      if (r > fHi) fHi = r;
    }
    const g = contrast(PROP_COLOURS[keys[i]], garmentColour);
    if (g < gLo) gLo = g;
  }
  return { floorMin: fLo, floorMax: fHi, garmentMin: gLo };
}

// ---------- Geometricache ----------

const geometryCache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geometryCache.get(key);
  if (g === undefined) {
    g = build();
    geometryCache.set(key, g);
  }
  return g;
}

export function disposeFigurePropGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return cached('b' + w + '_' + h + '_' + d, function () {
    return new THREE.BoxGeometry(w, h, d);
  });
}

function cyl(rt: number, rb: number, h: number, seg: number): THREE.BufferGeometry {
  return cached('c' + rt + '_' + rb + '_' + h + '_' + seg, function () {
    return new THREE.CylinderGeometry(rt, rb, h, seg);
  });
}

function sphere(r: number, seg: number): THREE.BufferGeometry {
  return cached('s' + r + '_' + seg, function () {
    return new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg / 2)));
  });
}

/** Kalott: klotsektor från polen ned till phi. */
function cap(r: number, phi: number, seg: number): THREE.BufferGeometry {
  return cached('k' + r + '_' + phi + '_' + seg, function () {
    return new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg / 2)),
                                    0, Math.PI * 2, 0, phi);
  });
}

/**
 * Sfärisk sektor — hårets rätta form.
 *
 * Första versionen extruderade en RAK annulus mot ett runt kranium.
 * Innerradien var låst till R − 0,004 medan skallens XZ-radie faller
 * till 0,110 vid y 0,167, så det öppnade sig en ringformad ränna på
 * upp till 5,6 mm mellan band och skalle — utan inneryta. Från
 * strategisk vinkel såg man rakt ned i rännan, och på den ljusa
 * gråhårstonen blev det ett svart hål i en ljus skål.
 *
 * En sektor av samma klot som kraniet kan inte glappa: den ÄR
 * kraniets yta, flyttad utåt med hårets tjocklek.
 */
function shell(r: number, phiStart: number, phiEnd: number, seg: number): THREE.BufferGeometry {
  return cached('h' + r + '_' + phiStart + '_' + phiEnd + '_' + seg, function () {
    return new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg / 2)),
                                    0, Math.PI * 2, phiStart, phiEnd - phiStart);
  });
}

/** Ring i XZ-planet — brätte, hattband. */
function ring(inner: number, outer: number, h: number, seg: number): THREE.BufferGeometry {
  return cached('r' + inner + '_' + outer + '_' + h + '_' + seg, function () {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: seg });
    g.rotateX(-Math.PI / 2);
    g.translate(0, h / 2, 0);
    return g;
  });
}

// ---------- Handrekvisita ----------
//
// Monteras som barn till joints.handAnchorL / handAnchorR. Ankaret
// sitter i grepppunkten och pekar nedåt med handen, så föremålen
// byggs hängande från origo.

function makeHandle(group: THREE.Group, mats: THREE.MeshStandardMaterial[]): PropHandle {
  return {
    group: group,
    materials: mats,
    dispose: function () {
      mats.forEach(function (m) { m.dispose(); });
      group.removeFromParent();
    }
  };
}

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry,
              m: THREE.Material, x: number, y: number, z: number, name: string): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.name = name;
  parent.add(o);
  return o;
}

function stdMat(colour: string, rough: number, metal: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal });
}

/**
 * Bygger ett handföremål. Lägg resultatet på joints.handAnchorL/R.
 * Returnerar handtaget så anroparen kan frigöra materialen.
 */
export function createHandProp(id: HandPropId, options?: PropOptions): PropHandle {
  const g = new THREE.Group();
  g.name = 'handProp_' + id;
  const mats: THREE.MeshStandardMaterial[] = [];
  const use = function (colour: string, rough: number, metal: number) {
    const m = stdMat(colour, rough, metal);
    mats.push(m);
    return m;
  };

  if (id === 'iceCream') {
    // Struten hålls upprätt: spetsen ned mot handen, kulan över.
    const waffle = use(PROP_COLOURS.iceCream, 0.9, 0);
    const scoop = use(PROP_COLOURS.iceCreamScoop, 0.75, 0);
    const c = mesh(g, cyl(PROPS.coneRadius, 0.004, PROPS.coneHeight, 10), waffle,
                   0, PROPS.coneHeight / 2 - 0.02, 0.02, 'cone');
    c.rotation.x = 0.12;
    mesh(g, sphere(PROPS.scoopRadius, 10), scoop,
         0, PROPS.coneHeight - 0.005, 0.028, 'scoop');
  } else if (id === 'briefcase') {
    // Hänger rakt ned från greppet. 0,26 × 0,22 mot axelspannets 0,46,
    // alltså strax under 60 % — tydlig uppifrån utan att bli resväska.
    // Första versionen var 0,30 och mätte 71 % av axelspannet i vyn;
    // bounding box är alltid större än måttet man skrev.
    const leather = use(PROP_COLOURS.briefcase, 0.8, 0);
    mesh(g, box(PROPS.caseWidth, PROPS.caseHeight, PROPS.caseDepth), leather,
         0, -PROPS.caseHeight / 2 - 0.035, 0.01, 'caseBody');
    mesh(g, box(0.012, 0.07, 0.012), leather, -0.045, -0.02, 0.01, 'caseHandleA');
    mesh(g, box(0.012, 0.07, 0.012), leather, 0.045, -0.02, 0.01, 'caseHandleB');
    mesh(g, box(0.1, 0.012, 0.012), leather, 0, 0.012, 0.01, 'caseHandleTop');
  } else if (id === 'camera') {
    // Hålls upp mot ansiktshöjd när den används; här hänger den i
    // handen. Objektivet är den enda detalj som läser på håll.
    const body = use(PROP_COLOURS.camera, 0.6, 0.1);
    const lens = use(PROP_COLOURS.cameraLens, 0.4, 0.4);
    mesh(g, box(PROPS.cameraBody, 0.07, 0.055), body, 0, -0.055, 0.015, 'camBody');
    const l = mesh(g, cyl(PROPS.cameraLens, PROPS.cameraLens, 0.05, 10), lens,
                   0, -0.055, 0.055, 'camLens');
    l.rotation.x = Math.PI / 2;
  } else {
    // Termos: stående cylinder med lock. Den smalaste av de fyra,
    // och den som mest behöver sin ljusa ton för att synas alls.
    const steel = use(PROP_COLOURS.thermos, 0.45, 0.25);
    mesh(g, cyl(PROPS.thermosRadius, PROPS.thermosRadius, PROPS.thermosHeight, 12), steel,
         0, -0.04, 0.015, 'thermosBody');
    mesh(g, cyl(PROPS.thermosRadius * 1.12, PROPS.thermosRadius * 1.12, 0.03, 12), steel,
         0, 0.07, 0.015, 'thermosCap');
  }

  return makeHandle(g, mats);
}

// ---------- Huvudbonader ----------
//
// Monteras som barn till joints.head — INTE joints.headAnchor, som är
// upptagen av pip-markören. Huvudets klot har centrum i y = 0,12 och
// radie 0,12 i den ramen.

/**
 * Bygger en huvudbonad. Lägg resultatet på joints.head.
 * `garmentColour` är identitetsfärgen: keps, solhatt och huva ärver
 * den på sin ovansida, så kameran ser samma färg uppifrån som utan
 * bonad. Hårtyperna rör inte kalotten alls.
 */
export function createHeadTopping(id: HeadToppingId, options?: PropOptions): PropHandle {
  const o = options ?? {};
  const garment = o.garmentColour ?? '#52505d';
  const g = new THREE.Group();
  g.name = 'headTopping_' + id;
  const mats: THREE.MeshStandardMaterial[] = [];
  const use = function (colour: string, rough: number, metal: number) {
    const m = stdMat(colour, rough, metal);
    mats.push(m);
    return m;
  };
  const R = PROPS.headRadius;
  const cy = R;   // huvudets centrum

  // Hårbandet som sfärisk sektor på radien R + tjocklek. phiStart är
  // låst till kalottgränsen 1,15 rad, så håret börjar exakt där
  // kalotten slutar — ingen ränna, ingen överlappning.
  // phiEnd går alltid FÖRBI ekvatorn (1,5708) så håret ramar in
  // skallen i stället för att sitta på den som en kopp.
  function hairBand(colour: string, thickness: number, phiEnd: number, name: string) {
    const m = use(colour, 0.95, 0);
    const sh = mesh(g, shell(R + thickness, CROWN_PHI, phiEnd, 22), m, 0, cy, 0, name);
    sh.material.side = THREE.DoubleSide;
    return m;
  }
  /** Punkt på hårets yta vid vinkel a runt Y och phi ned från polen. */
  function onSkull(a: number, phi: number, thickness: number): number[] {
    const rr = (R + thickness) * Math.sin(phi);
    return [Math.sin(a) * rr, cy + (R + thickness) * Math.cos(phi), Math.cos(a) * rr];
  }

  if (id === 'ruffled') {
    const th = 0.020;
    const m = hairBand(PROP_COLOURS.hairRuffled, th, 1.92, 'hairBand');
    // Tovorna sitter PÅ sektorn, alltid under kalottgränsen. Sex i
    // ojämn ring — det är oordningen som läser som "rufsigt", inte
    // volymen ovanpå. Deras phi ligger mellan 1,26 och 1,58, alltså
    // aldrig över y = 0,167.
    const tuft = [[0.5, 0.026, 1.30], [1.4, 0.021, 1.46], [2.5, 0.028, 1.27],
                  [3.6, 0.019, 1.55], [4.4, 0.024, 1.34], [5.6, 0.022, 1.50]];
    for (let i = 0; i < tuft.length; i++) {
      const p = onSkull(tuft[i][0], tuft[i][2], th);
      const t = mesh(g, sphere(tuft[i][1], 8), m, p[0], p[1], p[2], 'tuft' + i);
      t.scale.set(1, 0.72, 1);
    }
  } else if (id === 'shortCut') {
    hairBand(PROP_COLOURS.hairShort, 0.008, 1.74, 'hairBand');
  } else if (id === 'grayHair') {
    // Grått hår ligger i det LJUSA fönstret. Det är den enda hårtyp
    // som gör det, och skälet är att den ska läsa som grå — inte som
    // en mörk lugg. Den vinner dessutom kontrast mot hudtonen.
    const th = 0.014;
    const m = hairBand(PROP_COLOURS.hairGray, th, 1.88, 'hairBand');
    // Tjockare i nacken, som verkligt grått hår: en sektor till,
    // bara på baksidan.
    const back = mesh(g, shell(R + th + 0.008, 1.34, 1.90, 16), m, 0, cy, 0, 'hairBack');
    back.material.side = THREE.DoubleSide;
    back.scale.set(0.82, 1, 1.04);
  } else if (id === 'workCap') {
    // Kepsen BÄR garment-färgen på kullen — men kullen ensam är
    // omöjlig att skilja från ett bart huvud, så den räcker inte som
    // form. Två tillägg gör den till en keps:
    //   • skalet dras ned till 1,66 rad, alltså FÖRBI ekvatorn, så
    //     kepsen får en synlig kant runt skallen i stället för att
    //     sluta uppe på hjässan;
    //   • skärmen utgår från den kanten och inte ur brynhöjd. Första
    //     versionen svävade 0,10 m framför kraniet och läste som en
    //     haklapp under hakan.
    const capShell = use(garment, 0.85, 0);
    const visor = use(PROP_COLOURS.capVisor, 0.7, 0);
    const capPhi = 1.66;
    mesh(g, cap(PROPS.capShellRadius, capPhi, 18), capShell, 0, cy, 0, 'capShell');
    const rimR = PROPS.capShellRadius * Math.sin(capPhi);
    const rimY = cy + PROPS.capShellRadius * Math.cos(capPhi);
    // INGEN heltäckande kantlist. En sådan provades och läste som ett
    // pannband — den konkurrerade med hårtyperna i stället för att
    // skilja sig från dem. Skärmen ensam är signalen, och den är
    // asymmetrisk, vilket ingen hårtyp är.
    const v = mesh(g, box(PROPS.capVisorWidth, 0.012, PROPS.capVisorLength), visor,
                   0, rimY + 0.014, rimR * 0.80 + PROPS.capVisorLength / 2 - 0.010, 'capVisor');
    v.rotation.x = -0.22;
    // Skärmens rot: en kil som binder den till skalets kant, så den
    // inte svävar. Första versionen satt 0,10 m fritt framför kraniet
    // och läste som en haklapp under hakan.
    const w = mesh(g, box(PROPS.capVisorWidth * 0.86, 0.030, 0.045), visor,
                   0, rimY + 0.020, rimR * 0.66, 'capVisorRoot');
    w.rotation.x = -0.22;
    mesh(g, sphere(0.016, 8), capShell, 0, cy + PROPS.capShellRadius - 0.005, 0, 'capButton');
  } else if (id === 'sunHat') {
    // Solhatten bär också garment-färgen på kullen. Brättet är
    // signalen: ytterradie 0,27 mot huvudets 0,12, alltså mer än
    // dubbla huvudets bredd — den läser omedelbart uppifrån, och det
    // är just det som gör att kullens färg fortfarande syns i mitten.
    const crown = use(garment, 0.9, 0);
    const brim = use(PROP_COLOURS.hatBrim, 0.95, 0);
    mesh(g, cap(0.132, 1.20, 18), crown, 0, cy + 0.004, 0, 'hatCrown');
    const b = mesh(g, ring(PROPS.hatBrimInner, PROPS.hatBrimOuter, 0.012, 24), brim,
                   0, cy + PROPS.hatBrimY - R, 0, 'hatBrim');
    b.rotation.x = 0.06;
    mesh(g, ring(0.128, 0.142, 0.022, 20), brim, 0, cy + 0.052, 0, 'hatBand');
  } else {
    // Huvan bär garment-färgen och ändrar formen: större skal plus
    // en nackmassa bakåt. Uppifrån en äggform i stället för ett klot.
    const hoodMat = use(garment, 0.92, 0);
    const trim = use(PROP_COLOURS.hoodTrim, 0.9, 0);
    const hs = mesh(g, cap(PROPS.hoodRadius, 1.75, 18), hoodMat, 0, cy - 0.012, -0.012, 'hoodShell');
    hs.scale.set(1, 1.05, 1.18);
    mesh(g, sphere(0.088, 10), hoodMat, 0, cy - 0.055, -0.105, 'hoodNeck');
    // Öppningens kant framåt — det enda ljusa i bonaden, och det som
    // säger åt vilket håll figuren tittar när ansiktet saknas.
    const t = mesh(g, ring(0.085, 0.108, 0.016, 18), trim, 0, cy + 0.012, 0.052, 'hoodRim');
    t.rotation.x = 1.28;
  }

  return makeHandle(g, mats);
}

// ---------- Montering ----------

/**
 * Bekvämlighetsfunktion: monterar en uppsättning på en färdig rigg.
 * `rig` är en FigureRig från figureRig.ts — typen importeras inte,
 * så filen förblir självständig.
 *
 * `hand` får vara null: archetypes.ts har två arketyper utan föremål
 * (efter-skiftet, stamgästen), och null är deras riktiga värde.
 */
export function attachProps(
  rig: any,
  spec: {
    hand?: HandPropId | null;
    headTopping?: HeadToppingId | null;
    /** 1 = höger hand, -1 = vänster. Default höger. */
    side?: number;
    garmentColour?: string;
    skinColour?: string;
  }
): PropHandle[] {
  const out: PropHandle[] = [];
  const opts: PropOptions = {
    garmentColour: spec.garmentColour ?? (rig.garment ? '#' + rig.garment.color.getHexString() : undefined),
    skinColour: spec.skinColour
  };
  if (spec.hand) {
    const h = createHandProp(spec.hand, opts);
    const anchor = (spec.side ?? 1) < 0 ? rig.joints.handAnchorL : rig.joints.handAnchorR;
    anchor.add(h.group);
    out.push(h);
  }
  if (spec.headTopping) {
    const t = createHeadTopping(spec.headTopping, opts);
    rig.joints.head.add(t.group);
    out.push(t);
  }
  return out;
}

// ---------- Mätning ----------

/**
 * SILHUETTKONTRAKTETS PROV.
 *
 * Skjuter strålar rakt nedåt över hjässan och räknar hur stor andel av
 * träffarna som landar på en yta i identitetsfärgen. Det är den
 * mätbara formen av briefens fråga: "tar bonaden bort just den ytan?"
 *
 * Provet körs på huvudet ensamt, inte på hela figuren — annars mäter
 * man axlarna. Ett solhattsbrätte som sticker utanför diskens kant
 * varken räknas som täckning eller som brott.
 *
 * DISKENS RADIE ÄR KALOTTENS, INTE HUVUDETS. Kalotten i figureRig
 * slutar vid 1,15 rad från polen och når därför bara sin(1,15) ≈ 0,913
 * av huvudradien i XZ. Första versionen samplade hela 0,96 R och gav
 * 0,92 för ett BART huvud — provet underkände alltså kalotten själv.
 * Ett prov vars nollpunkt inte är 1,00 kan inte säga något om vad en
 * bonad kostar. Radien är nu CROWN_DISC_R.
 *
 * Alla sex bonaderna ska ge ≥ 0,95. Under det är kontraktet brutet.
 */
export function checkCrownCoverage(
  rig: any,
  garmentColour: string,
  samples: number = 240
): { hits: number; identity: number; coverage: number; ok: boolean } {
  const head = rig.joints.head;
  head.updateWorldMatrix(true, true);
  const centre = new THREE.Vector3();
  head.getWorldPosition(centre);
  const target = new THREE.Color(garmentColour);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const origin = new THREE.Vector3();
  let hits = 0;
  let identity = 0;
  // Gyllene vinkel ger en jämn disk utan ring-artefakter.
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const t = Math.sqrt((i + 0.5) / samples) * CROWN_DISC_R;
    const a = i * golden;
    origin.set(centre.x + Math.cos(a) * t, centre.y + 2.0, centre.z + Math.sin(a) * t);
    ray.set(origin, down);
    const found = ray.intersectObject(head, true);
    if (!found.length) continue;
    hits++;
    const mat = found[0].object.material;
    const col = mat && mat.color ? mat.color : null;
    if (col && Math.abs(col.r - target.r) < 0.02 &&
        Math.abs(col.g - target.g) < 0.02 &&
        Math.abs(col.b - target.b) < 0.02) identity++;
  }
  const coverage = hits ? identity / hits : 0;
  return { hits: hits, identity: identity, coverage: coverage, ok: coverage >= 0.95 };
}

/** Föremålets faktiska utbredning i världsmått, för §5-provet. */
export function measureProp(handle: PropHandle): { width: number; height: number; depth: number } {
  handle.group.updateWorldMatrix(true, true);
  const bb = new THREE.Box3().setFromObject(handle.group);
  return {
    width: bb.max.x - bb.min.x,
    height: bb.max.y - bb.min.y,
    depth: bb.max.z - bb.min.z
  };
}

// ---------- ÖPPNA FRÅGOR ----------
//
// 1. Kopplingen arketyp → 3D-figur finns inte. archetypes.ts delar ut
//    HandProp och HeadTopping per gäst-id via assignArchetype(), men
//    den funktionen bor i ui/foodtruck/ och 3D-scenens gäster har
//    ingen arketyp. Briefen säger uttryckligen att kopplingen byggs i
//    ordern, inte här — men den saknas alltså, och attachProps() tar
//    därför nycklarna som argument i stället för att slå upp dem.
//
// 2. Kroppsbyggnad porteras inte. archetypes.ts har ArchetypeBody med
//    heightMult 0,72 för barnet. figureRig.ts har ETT mått: 1,70 m,
//    låst av SD-004 §3 för både gäst och personal. Ett barn på 1,70 m
//    med glass är inte ett barn. Antingen lyfts höjdlåset för gäster,
//    eller så kan barnet inte porteras — och det är ett direktiv-
//    beslut, inte ett geometribeslut. FLAGGAT.
//
// 3. Hudtonerna i SKIN_TONES är inte kontrastprövade. De sex tonerna
//    spänner L 0,057 till 0,690, alltså tvärs över BÅDA fönstren och
//    genom det otillåtna spannet mellan dem. En figur med hudton 2
//    eller 3 har alltså ansikte och händer i toner som skulle falla
//    om de mättes. Riggen har inga ansikten, så ytan är liten — men
//    om händer eller nacke någonsin blir stora nog att mätas är det
//    en riktig konflikt mellan archetypes.ts och silhouetteContrast.ts.
//    FLAGGAT, inte löst här.
//
// 4. Två arketyper bär ingenting i händerna (efter-skiftet:
//    "händerna i fickorna", stamgästen: ingen). Riggen har ingen
//    fickpose — poseIdle håller armarna hängande. Skillnaden mellan
//    "inget föremål" och "händerna i fickorna" går alltså inte att se.
//    Det kräver en sjunde pose i figureRig.ts, inte en form här.
