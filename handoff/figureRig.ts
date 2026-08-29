// ============================================================================
// HANDOFF-KÄLLA — INTE GÄLLANDE KOD
// ============================================================================
//
// Detta är figurriggen SOM DEN LEVERERADES av Claude Design 2026-08-29
// för ORDER 121 (SUPERSEDING_DIRECTIVE_004 §3). Filen är historik: den
// version som byggs, testas och renderar i spelet är kopian på
// `frontend/src/strategic/scene/figureRig.ts`.
//
// Kopian är för närvarande **byte-identisk** med denna handoff-fil.
// Skillnaden mellan filerna är endast en fristående kompatibilitets-
// shim i scene/-mappen:
//   • `frontend/src/strategic/scene/three-augmentations.d.ts` —
//     augmenterar `THREE.Object3D` med valfria `isMesh?: boolean` och
//     `geometry?: BufferGeometry`. Behövs för att `measureFigure`
//     (i slutet av filen) ska typechecka; three.js sätter flaggorna i
//     runtime men @types/three exponerar dem inte på Object3D-nivån.
//     Shimen ligger i en egen fil så handoff-koden hålls oförändrad.
//
// Ingen produktionskod importerar från `handoff/`. Om denna fil måste
// uppdateras: kopiera in den nya versionen till scene/, verifiera att
// shimen fortfarande täcker eventuella nya `Object3D`-flaggor, och
// dokumentera bytet i registerraden.
//
// ============================================================================

// figureRig — ledad figurrigg för den strategiska scenen.
//
// SUPERSEDING_DIRECTIVE_004 §3 (Kroppar i rummet), ORDER 121.
// Ersätter cylinderpuckarna i InteriorGuests.tsx och InteriorStaff.tsx.
//
// Kontrakt:
//   • Ren three.js. Inga externa beroenden, inga inlästa modeller,
//     ingen skinning, ingen AnimationMixer, inga binära assets.
//   • Riggen byggs imperativt EN gång (createFigureRig) och muteras
//     sedan per bildruta (applyPose). Inget skapas i render-loopen.
//   • Riggen äger ingen klocka. Poserna är rena funktioner av en fas
//     eller en tid som anroparen skickar in — spelet driver klockan.
//   • Inga ansikten. Hållning och gest bär uttrycket.
//
// Arv från AnimationPrototype.tsx (pre-ORDER 053): höft 0,86 m,
// bål 0,60 m, huvudradie 0,12 m, gångcykelns amplituder och
// distansdrivna kadens. Tre skillnader:
//   1. Två led per lem (armbåge, knä) i stället för ett.
//   2. Hjässan ligger på exakt 1,700 m. Prototypens 1,2 cm
//      underskott (1,688 m) blir här en synlig nacke i stället för
//      ett avrundningsfel — anatomin behåller sina proportioner och
//      höjdkontraktet håller.
//   3. Namngivna ledreferenser + ankarpunkter (huvud, båda händer).
//
// 1,700 m är ett TAK, inte ett medelvärde: ingen pose lyfter kroppen
// över noll. Gångstuds, andning och vaggning svajar nedåt från
// hjässan, så en mätning i vyn aldrig läser mer än 1,700 m.
//
// Koordinater: rot i golvplanet, +Y uppåt, figuren tittar mot +Z.
// Alla mått i meter, samma som scenens världskoordinater.
// Alla ledvinklar i radianer. Positiv vinkel = framåt, i den
// riktning figuren tittar. Positiv `lift`/`spread` = utåt från
// kroppens mittlinje. Positiv `knee` = hälen bakåt (knät böjs bara
// åt ett håll).

import * as THREE from 'three';

// #region types

export type FigureVariant = 'guest' | 'staff';

export interface FigureRigOptions {
  variant?: FigureVariant;
  /** Axelbredd i meter. Default: 0,46 gäst / 0,40 personal. */
  shoulderWidth?: number;
  /** Hjässans färg — garment för gäst, uniform för personal. */
  garmentColour?: string;
  /** Bål/lemmar. Default: garmentColour mörknad. */
  limbColour?: string;
  skinColour?: string;
  /** Meter över hjässan där indikatorankaret ligger. Skicka
   *  PIP_OFFSET_ABOVE_PUCK_TOP_M från patternTransform.ts. */
  headAnchorOffset?: number;
}

export interface FigureJoints {
  /** Världsplacering + kurs (rotation.y = yaw). */
  root: THREE.Group;
  /** Vertikal förskjutning: gångstuds, sitthöjd. */
  body: THREE.Group;
  /** Höftlinjen. Bär benen. */
  pelvis: THREE.Group;
  /** Ryggraden. Bär bål, armar, huvud. Roteras för lutning. */
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  /** Tom Object3D över hjässan — ankare för indikator. */
  headAnchor: THREE.Object3D;
  shoulderL: THREE.Group;
  elbowL: THREE.Group;
  handL: THREE.Group;
  /** Tom Object3D i grepppunkten — fäste för föremål (poseCarry). */
  handAnchorL: THREE.Object3D;
  shoulderR: THREE.Group;
  elbowR: THREE.Group;
  handR: THREE.Group;
  handAnchorR: THREE.Object3D;
  hipL: THREE.Group;
  kneeL: THREE.Group;
  ankleL: THREE.Group;
  hipR: THREE.Group;
  kneeR: THREE.Group;
  ankleR: THREE.Group;
}

export interface FigureRig {
  /** Lägg denna i scengrafen. */
  root: THREE.Group;
  joints: FigureJoints;
  variant: FigureVariant;
  shoulderWidth: number;
  /** Material, för opacitet i interiörens fade-band. */
  materials: THREE.MeshStandardMaterial[];
  garment: THREE.MeshStandardMaterial;
}

export interface PoseArm {
  /** Axeln framåt/bakåt. */
  swing?: number;
  /** Axeln utåt från kroppen. */
  lift?: number;
  /** Armbågsböj. Alltid ≥ 0. */
  elbow?: number;
}

export interface PoseLeg {
  swing?: number;
  spread?: number;
  knee?: number;
  ankle?: number;
}

export interface PoseTorso {
  pitch?: number;
  yaw?: number;
  roll?: number;
}

export interface PoseHead {
  pitch?: number;
  yaw?: number;
}

export interface FigurePose {
  /** Höjer hela kroppen (gångstuds, andning). */
  lift?: number;
  /** Sänker höftlinjen (sittande). */
  hipDrop?: number;
  torso?: PoseTorso;
  head?: PoseHead;
  armL?: PoseArm;
  armR?: PoseArm;
  legL?: PoseLeg;
  legR?: PoseLeg;
}

export interface PoseOptions {
  /** Skalar gångens amplituder: 0,6 = släpig, 1,4 = snabb. */
  intensity?: number;
  /** Vilken sida som gestikulerar. 1 = höger, -1 = vänster. */
  side?: number;
  /** Huvudets/bålens vridning mot den man vänder sig till (radianer,
   *  relativt figurens kurs). Anroparen räknar ut den. */
  targetYaw?: number;
  /** Gångfas i cykler, om posen ska kombineras med gång
   *  (poseCarry under förflyttning). null = stillastående. */
  phase?: number | null;
}

export type PoseName =
  | 'poseWalk' | 'poseIdle' | 'poseSeated'
  | 'poseGreet' | 'poseWork' | 'poseCarry';

// #endregion types

// ---------- mått ------------------------------------------------------
//
// Hjässan: hipY + torsoHeight + neckLength + 2 × headRadius
//        = 0,860 + 0,588 + 0,012 + 0,240 = 1,700 m exakt.
// Benet: thigh + shin + ankleY = 0,44 + 0,36 + 0,06 = 0,86 = hipY.
// Foten står i golvplanet (y = 0).

export const FIGURE = {
  totalHeight: 1.70,
  hipY: 0.86,
  torsoHeight: 0.588,
  neckLength: 0.012,
  headRadius: 0.12,
  shoulderY: 1.37,
  upperArm: 0.29,
  foreArm: 0.25,
  handLength: 0.09,
  thigh: 0.44,
  shin: 0.36,
  ankleY: 0.06,
  footLength: 0.22,
  footWidth: 0.10,
  footHeight: 0.06,
  hipHalfWidth: 0.09,
  armRadius: 0.045,
  legRadius: 0.062,
  neckRadius: 0.045,
  guestShoulderWidth: 0.46,
  staffShoulderWidth: 0.40,
  /** Bålens djup som andel av axelbredden. */
  torsoDepthRatio: 0.44,
  /** Höftpartiets bredd som andel av axelbredden. */
  waistRatio: 0.78,
  headAnchorOffset: 0.18
};

// Delade geometrier. Skapas vid första riggen och återanvänds av alla
// figurer med samma variant — 40 figurer i rummet ska inte betyda 40
// uppsättningar buffertar. Frigörs med disposeFigureGeometry().
const geometryCache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geometryCache.get(key);
  if (g === undefined) {
    g = build();
    geometryCache.set(key, g);
  }
  return g;
}

export function disposeFigureGeometry(): void {
  geometryCache.forEach(function (g) { g.dispose(); });
  geometryCache.clear();
}

function darken(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return c.getStyle();
}

/** Ett lemsegment: mesh som hänger nedåt från ledens origo. */
function limb(
  key: string, material: THREE.Material,
  radius: number, length: number, taper: number
): THREE.Mesh {
  const geo = cached(key, function () {
    return new THREE.CylinderGeometry(radius * taper, radius, length, 8);
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -length / 2;
  return mesh;
}

function joint(name: string, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

// ---------- konstruktion ----------------------------------------------
//
// Byggs imperativt, en gång per figur. Ingen allokering sker sedan i
// applyPose — den skriver bara rotation/position på befintliga noder.

export function createFigureRig(options?: Partial<FigureRigOptions>): FigureRig {
  const opts = options ?? {};
  const variant = opts.variant ?? 'guest';
  let defaultWidth = FIGURE.guestShoulderWidth;
  if (variant === 'staff') defaultWidth = FIGURE.staffShoulderWidth;
  const shoulderWidth = opts.shoulderWidth ?? defaultWidth;
  const garmentColour = opts.garmentColour ?? '#c9c0a4';
  const limbColour = opts.limbColour ?? darken(garmentColour, 0.28);
  const skinColour = opts.skinColour ?? '#d8b48a';
  const anchorOffset = opts.headAnchorOffset ?? FIGURE.headAnchorOffset;

  const garment = new THREE.MeshStandardMaterial({ color: garmentColour, roughness: 0.85 });
  const limbs = new THREE.MeshStandardMaterial({ color: limbColour, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: skinColour, roughness: 0.9 });
  const materials = [garment, limbs, skin];

  const depth = shoulderWidth * FIGURE.torsoDepthRatio;
  const waist = shoulderWidth * FIGURE.waistRatio;
  const shoulderHalf = shoulderWidth / 2 - FIGURE.armRadius;
  const key = variant + ':' + shoulderWidth.toFixed(3);

  const root = joint('figureRoot', 0, 0, 0);
  const body = joint('body', 0, 0, 0);
  const pelvis = joint('pelvis', 0, FIGURE.hipY, 0);
  const chest = joint('chest', 0, 0, 0);
  root.add(body);
  body.add(pelvis);
  pelvis.add(chest);

  // Bålen i två block: höftparti och bröstkorg. Båda hänger i chest,
  // så lutningen pivoterar i höftlinjen.
  const waistH = 0.24;
  const waistMesh = new THREE.Mesh(
    cached(key + ':waist', function () {
      return new THREE.BoxGeometry(waist, waistH, depth * 0.92);
    }),
    limbs
  );
  waistMesh.position.y = waistH / 2;
  chest.add(waistMesh);

  const chestH = FIGURE.torsoHeight - waistH;
  const chestMesh = new THREE.Mesh(
    cached(key + ':chest', function () {
      return new THREE.BoxGeometry(shoulderWidth, chestH, depth);
    }),
    garment
  );
  chestMesh.position.y = waistH + chestH / 2;
  chest.add(chestMesh);

  // Nacke → huvud. Inget ansikte: en sfär i hudton och en kalott i
  // garment-/uniformsfärg. Silhuettkontraktet — kameran ser hjässan
  // uppifrån, så färgen sitter där och inte på bröstet.
  const neck = joint('neck', 0, FIGURE.torsoHeight, 0);
  chest.add(neck);
  const neckMesh = new THREE.Mesh(
    cached(key + ':neck', function () {
      return new THREE.CylinderGeometry(
        FIGURE.neckRadius, FIGURE.neckRadius, FIGURE.neckLength, 8
      );
    }),
    skin
  );
  neckMesh.position.y = FIGURE.neckLength / 2;
  neck.add(neckMesh);

  const head = joint('head', 0, FIGURE.neckLength, 0);
  neck.add(head);
  const headMesh = new THREE.Mesh(
    cached('head:sphere', function () {
      return new THREE.SphereGeometry(FIGURE.headRadius, 16, 12);
    }),
    skin
  );
  headMesh.position.y = FIGURE.headRadius;
  head.add(headMesh);

  const crown = new THREE.Mesh(
    cached('head:crown', function () {
      return new THREE.SphereGeometry(
        FIGURE.headRadius * 1.03, 16, 8, 0, Math.PI * 2, 0, 1.15
      );
    }),
    garment
  );
  // Kalotten är 3 % större än huvudet för att undvika z-fighting, så
  // centret sänks med samma 3 % — skalet toppar då på exakt 2 × radien
  // och hjässan ligger kvar på 1,700 m i bounding box.
  crown.position.y = FIGURE.headRadius - FIGURE.headRadius * 0.03;
  head.add(crown);

  const headAnchor = new THREE.Object3D();
  headAnchor.name = 'headAnchor';
  headAnchor.position.y = FIGURE.headRadius * 2 + anchorOffset;
  head.add(headAnchor);

  // Armar. Två led: axel (framåt/bakåt + utåt) och armbåge.
  function buildArm(side: number, suffix: string) {
    const shoulder = joint(
      'shoulder' + suffix,
      side * shoulderHalf,
      FIGURE.shoulderY - FIGURE.hipY,
      0
    );
    shoulder.add(limb(key + ':upperArm', limbs, FIGURE.armRadius, FIGURE.upperArm, 0.92));
    const elbow = joint('elbow' + suffix, 0, -FIGURE.upperArm, 0);
    shoulder.add(elbow);
    elbow.add(limb(key + ':foreArm', limbs, FIGURE.armRadius * 0.88, FIGURE.foreArm, 0.9));
    const hand = joint('hand' + suffix, 0, -FIGURE.foreArm, 0);
    elbow.add(hand);
    const handMesh = new THREE.Mesh(
      cached('hand:box', function () {
        return new THREE.BoxGeometry(0.062, FIGURE.handLength, 0.05);
      }),
      skin
    );
    handMesh.position.y = -FIGURE.handLength / 2;
    hand.add(handMesh);
    // Fästet: grepppunkten i handen. Ett föremål monteras som barn
    // här (senare order) — riggen levererar bara ankaret.
    const anchor = new THREE.Object3D();
    anchor.name = 'handAnchor' + suffix;
    anchor.position.set(0, -FIGURE.handLength, 0.03);
    hand.add(anchor);
    chest.add(shoulder);
    return { shoulder: shoulder, elbow: elbow, hand: hand, anchor: anchor };
  }

  const armL = buildArm(-1, 'L');
  const armR = buildArm(1, 'R');

  // Ben. Två led: höft och knä, plus en fotled så steget kan rullas av.
  // Hänger i pelvis, inte i chest — bålens lutning flyttar inte benen.
  function buildLeg(side: number, suffix: string) {
    const hip = joint('hip' + suffix, side * FIGURE.hipHalfWidth, 0, 0);
    hip.add(limb(key + ':thigh', limbs, FIGURE.legRadius, FIGURE.thigh, 0.88));
    const knee = joint('knee' + suffix, 0, -FIGURE.thigh, 0);
    hip.add(knee);
    knee.add(limb(key + ':shin', limbs, FIGURE.legRadius * 0.86, FIGURE.shin, 0.82));
    const ankle = joint('ankle' + suffix, 0, -FIGURE.shin, 0);
    knee.add(ankle);
    const foot = new THREE.Mesh(
      cached('foot:box', function () {
        return new THREE.BoxGeometry(FIGURE.footWidth, FIGURE.footHeight, FIGURE.footLength);
      }),
      limbs
    );
    foot.position.set(0, -FIGURE.footHeight / 2, FIGURE.footLength / 2 - 0.055);
    ankle.add(foot);
    pelvis.add(hip);
    return { hip: hip, knee: knee, ankle: ankle };
  }

  const legL = buildLeg(-1, 'L');
  const legR = buildLeg(1, 'R');

  const joints: FigureJoints = {
    root: root, body: body, pelvis: pelvis, chest: chest,
    neck: neck, head: head, headAnchor: headAnchor,
    shoulderL: armL.shoulder, elbowL: armL.elbow, handL: armL.hand, handAnchorL: armL.anchor,
    shoulderR: armR.shoulder, elbowR: armR.elbow, handR: armR.hand, handAnchorR: armR.anchor,
    hipL: legL.hip, kneeL: legL.knee, ankleL: legL.ankle,
    hipR: legR.hip, kneeR: legR.knee, ankleR: legR.ankle
  };

  const rig: FigureRig = {
    root: root,
    joints: joints,
    variant: variant,
    shoulderWidth: shoulderWidth,
    materials: materials,
    garment: garment
  };
  applyPose(rig, poseIdle(0));
  return rig;
}

/** Materialen är per figur; geometrin är delad. */
export function disposeFigureRig(rig: FigureRig): void {
  rig.materials.forEach(function (m) { m.dispose(); });
  rig.root.removeFromParent();
}

// ---------- applicering -----------------------------------------------

function applyArm(
  shoulder: THREE.Group, elbow: THREE.Group,
  arm: PoseArm | undefined, side: number
): void {
  const a = arm ?? {};
  shoulder.rotation.set(-(a.swing ?? 0), 0, side * (a.lift ?? 0));
  elbow.rotation.x = -(a.elbow ?? 0);
}

function applyLeg(
  hip: THREE.Group, knee: THREE.Group, ankle: THREE.Group,
  leg: PoseLeg | undefined, side: number
): void {
  const l = leg ?? {};
  hip.rotation.set(-(l.swing ?? 0), 0, side * (l.spread ?? 0));
  knee.rotation.x = l.knee ?? 0;
  ankle.rotation.x = -(l.ankle ?? 0);
}

/**
 * Skriver en pose på riggen. Allokerar inget — säker att anropa varje
 * bildruta för varje figur i rummet.
 */
export function applyPose(rig: FigureRig, pose: FigurePose): void {
  const j = rig.joints;
  j.body.position.y = (pose.lift ?? 0) - (pose.hipDrop ?? 0);
  const t = pose.torso ?? {};
  j.chest.rotation.set(-(t.pitch ?? 0), t.yaw ?? 0, t.roll ?? 0);
  const h = pose.head ?? {};
  j.head.rotation.set(-(h.pitch ?? 0), h.yaw ?? 0, 0);
  applyArm(j.shoulderL, j.elbowL, pose.armL, -1);
  applyArm(j.shoulderR, j.elbowR, pose.armR, 1);
  applyLeg(j.hipL, j.kneeL, j.ankleL, pose.legL, -1);
  applyLeg(j.hipR, j.kneeR, j.ankleR, pose.legR, 1);
}

/** Linjär blandning mellan två poser. k = 0 ger a, k = 1 ger b.
 *  Används för att gå in i och ur sittande (SIT_STAND_DURATION_SEC)
 *  och för att växla gest utan hopp. */
export function blendPose(a: FigurePose, b: FigurePose, k: number): FigurePose {
  const m = Math.max(0, Math.min(1, k));
  function n(x?: number, y?: number): number { return (x ?? 0) + ((y ?? 0) - (x ?? 0)) * m; }
  function arm(x?: PoseArm, y?: PoseArm): PoseArm {
    const p = x ?? {};
    const q = y ?? {};
    return { swing: n(p.swing, q.swing), lift: n(p.lift, q.lift), elbow: n(p.elbow, q.elbow) };
  }
  function leg(x?: PoseLeg, y?: PoseLeg): PoseLeg {
    const p = x ?? {};
    const q = y ?? {};
    return {
      swing: n(p.swing, q.swing), spread: n(p.spread, q.spread),
      knee: n(p.knee, q.knee), ankle: n(p.ankle, q.ankle)
    };
  }
  const ta = a.torso ?? {};
  const tb = b.torso ?? {};
  const ha = a.head ?? {};
  const hb = b.head ?? {};
  return {
    lift: n(a.lift, b.lift),
    hipDrop: n(a.hipDrop, b.hipDrop),
    torso: { pitch: n(ta.pitch, tb.pitch), yaw: n(ta.yaw, tb.yaw), roll: n(ta.roll, tb.roll) },
    head: { pitch: n(ha.pitch, hb.pitch), yaw: n(ha.yaw, hb.yaw) },
    armL: arm(a.armL, b.armL), armR: arm(a.armR, b.armR),
    legL: leg(a.legL, b.legL), legR: leg(a.legR, b.legR)
  };
}

// ---------- poser -----------------------------------------------------
//
// Rena funktioner. Ingen av dem håller tid, tillstånd eller
// slumptal — anroparen skickar in fas eller sekunder och sätter
// resultatet med applyPose. Samma indata ger alltid samma pose, så
// två klienter kan rendera samma bildruta likadant.

/**
 * Gång. `phase` i CYKLER, inte sekunder — driv den från tillryggalagd
 * sträcka (phase += steg / stridLength) precis som AnimationPrototype
 * gjorde, så kadensen hänger ihop med förflyttningen och inte med
 * väggklockan. En cykel = två fotisättningar.
 */
export function poseWalk(phase: number, options?: Partial<PoseOptions>): FigurePose {
  const o = options ?? {};
  const k = o.intensity ?? 1;
  const w = (phase ?? 0) * Math.PI * 2;
  const s = Math.sin(w);
  const c = Math.cos(w);
  const legAmp = 0.55 * k;
  const armAmp = 0.42 * k;
  return {
    lift: -(1 - Math.abs(s)) * 0.028 * k,
    hipDrop: 0,
    torso: { pitch: 0.06, yaw: -0.07 * s, roll: 0.03 * c },
    head: { pitch: 0.02, yaw: 0.05 * s },
    armL: { swing: -armAmp * s, lift: 0.06, elbow: 0.26 + 0.22 * Math.max(0, -s) },
    armR: { swing: armAmp * s, lift: 0.06, elbow: 0.26 + 0.22 * Math.max(0, s) },
    legL: { swing: legAmp * s, spread: 0.02, knee: kneeSwing(w, k), ankle: -0.12 * c },
    legR: { swing: -legAmp * s, spread: 0.02, knee: kneeSwing(w + Math.PI, k), ankle: 0.12 * c }
  };
}

function kneeIdle(shift: number): number {
  return 0.06 + 0.05 * Math.max(0, shift);
}

function kneeSwing(w: number, k: number): number {
  return 0.12 + 0.80 * k * Math.max(0, Math.sin(w + 1.15));
}

/**
 * Stillastående. `t` i sekunder. Andning, tyngdöverföring och en
 * långsam huvudvridning — nog för att en stillastående figur inte
 * ska läsa som död, inte nog för att bli en manér.
 */
export function poseIdle(t: number, options?: Partial<PoseOptions>): FigurePose {
  const o = options ?? {};
  const k = o.intensity ?? 1;
  const time = t ?? 0;
  const shift = Math.sin(time * 0.35) * k;
  const breathe = Math.sin(time * 2 * Math.PI * 0.22);
  return {
    lift: (breathe - 1) * 0.003,
    hipDrop: 0,
    torso: { pitch: 0.015, yaw: 0.02 * shift, roll: 0.025 * shift },
    head: { pitch: 0.03, yaw: 0.16 * Math.sin(time * 0.18) },
    armL: { swing: 0.03, lift: 0.055 + 0.012 * shift, elbow: 0.16 + 0.03 * breathe },
    armR: { swing: 0.03, lift: 0.055 - 0.012 * shift, elbow: 0.16 - 0.03 * breathe },
    // Fotleden håller foten plan mot golvet: ankle = knä − höft, annars
    // dyker tåspetsen under golvplanet så fort knät böjs.
    legL: { swing: 0.02, spread: 0.035, knee: kneeIdle(shift), ankle: kneeIdle(shift) - 0.02 },
    legR: { swing: 0.02, spread: 0.035, knee: kneeIdle(-shift), ankle: kneeIdle(-shift) - 0.02 }
  };
}

/**
 * Sittande. Höften sänks 0,41 m till stolshöjd (sits 0,45 m), låret
 * går ut vågrätt och underbenet lätt bakåt, så sulan står plan i
 * golvplanet. Ersätter InteriorGuests SIT_DIP_M-tricket, där hela
 * pucken sjönk 0,27 m utan att kroppen ändrade form.
 */
export function poseSeated(t: number, options?: Partial<PoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const breathe = Math.sin(time * 2 * Math.PI * 0.2);
  const nod = Math.sin(time * 2 * Math.PI * 0.35);
  return {
    lift: (breathe - 1) * 0.005,
    hipDrop: 0.41,
    torso: { pitch: 0.06 + 0.012 * breathe, yaw: (o.targetYaw ?? 0) * 0.3, roll: 0 },
    head: { pitch: 0.05 + 0.05 * nod, yaw: (o.targetYaw ?? 0) * 0.7 },
    armL: { swing: 0.52, lift: 0.06, elbow: 1.14 + 0.02 * breathe },
    armR: { swing: 0.52, lift: 0.06, elbow: 1.14 - 0.02 * breathe },
    // knä 1,77 och fotled 0,31 ger ankle_y = 0,060 och plan fot: sulan
    // står i golvplanet i stället för tre centimeter ner i det.
    legL: { swing: 1.46, spread: 0.06, knee: 1.77, ankle: 0.31 },
    legR: { swing: 1.46, spread: 0.06, knee: 1.77, ankle: 0.31 }
  };
}

/**
 * Hälsning. En arm upp och en vinkning på ~1,6 Hz, bålen vänd mot
 * den man hälsar på. `options.side`: 1 = höger arm, -1 = vänster.
 * `options.targetYaw` = vridningen mot mottagaren, relativt kursen.
 */
export function poseGreet(t: number, options?: Partial<PoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const yaw = o.targetYaw ?? 0;
  const wave = Math.sin(time * 2 * Math.PI * 1.6);
  const raised: PoseArm = { swing: 1.12, lift: 0.52 + 0.20 * wave, elbow: 0.82 - 0.16 * wave };
  const resting: PoseArm = { swing: 0.06, lift: 0.06, elbow: 0.22 };
  let armL: PoseArm = resting;
  let armR: PoseArm = raised;
  if ((o.side ?? 1) < 0) { armL = raised; armR = resting; }
  return {
    lift: (wave - 1) * 0.004,
    hipDrop: 0,
    torso: { pitch: 0.09, yaw: yaw * 0.4, roll: 0 },
    head: { pitch: 0.04, yaw: yaw * 0.6 },
    armL: armL,
    armR: armR,
    legL: { swing: 0.05, spread: 0.05, knee: 0.08, ankle: 0.03 },
    legR: { swing: -0.03, spread: 0.05, knee: 0.12, ankle: 0.15 }
  };
}

/**
 * Arbete vid en yta — passet, baren, ett bord. Bålen fram, huvudet
 * ner mot händerna, armarna växelvis i arbete på ~1,3 Hz.
 */
export function poseWork(t: number, options?: Partial<PoseOptions>): FigurePose {
  const o = options ?? {};
  const k = o.intensity ?? 1;
  const time = t ?? 0;
  const beat = Math.sin(time * 2 * Math.PI * 1.3) * k;
  const off = Math.cos(time * 2 * Math.PI * 1.3) * k;
  return {
    lift: 0.012 * Math.abs(beat),
    hipDrop: 0,
    torso: { pitch: 0.22, yaw: 0.05 * off, roll: 0.02 * beat },
    head: { pitch: 0.30, yaw: 0.05 * off },
    armL: { swing: 0.84 + 0.14 * beat, lift: 0.14, elbow: 0.96 - 0.18 * beat },
    armR: { swing: 0.84 - 0.14 * beat, lift: 0.14, elbow: 0.96 + 0.18 * beat },
    legL: { swing: 0.04, spread: 0.07, knee: 0.10, ankle: 0.06 },
    legR: { swing: -0.06, spread: 0.07, knee: 0.14, ankle: 0.20 }
  };
}

/**
 * Bär något. Båda armar fram, underarmarna vågräta, händerna möts
 * ~0,40 m framför bålen på ~1,15 m höjd — där en bricka ligger.
 * Föremålet ingår inte i leveransen; montera det som barn till
 * joints.handAnchorL / handAnchorR.
 *
 * `options.phase` (cykler) blandar in gångbenen, så bärande under
 * förflyttning är samma pose och inte en fjärde variant.
 */
export function poseCarry(t: number, options?: Partial<PoseOptions>): FigurePose {
  const o = options ?? {};
  const time = t ?? 0;
  const settle = Math.sin(time * 2 * Math.PI * 0.9) * 0.02;
  let base = poseIdle(time, o);
  if (o.phase !== null && o.phase !== undefined) base = poseWalk(o.phase, o);
  const bt = base.torso ?? {};
  const bh = base.head ?? {};
  return {
    lift: base.lift,
    hipDrop: 0,
    torso: { pitch: -0.02, yaw: (bt.yaw ?? 0) * 0.5, roll: (bt.roll ?? 0) * 0.5 },
    head: { pitch: 0.10, yaw: (bh.yaw ?? 0) * 0.5 },
    armL: { swing: 0.55 + settle, lift: 0.16, elbow: 1.05 - settle },
    armR: { swing: 0.55 - settle, lift: 0.16, elbow: 1.05 + settle },
    legL: base.legL,
    legR: base.legR
  };
}

// ---------- not: vilka ledvinklar varje pose sätter -------------------
//
// Alla sex sätter bål, huvud, båda armar och båda ben — applyPose
// skriver alltid hela riggen, så ingen pose kan lämna ett led kvar i
// en tidigare poses vinkel. Det som skiljer dem är vilka led som
// faktiskt bär gesten:

export const POSE_JOINT_NOTES: Record<PoseName, string> = {
  poseWalk:
    'Höft ±0,55 rad ur fas, knä 0,12–0,92 rad på svingbenet, fotled ±0,12. ' +
    'Axel ±0,42 rad motfas mot benen, armbåge 0,26–0,48. Bål 0,06 fram, ' +
    'vrid ±0,07 och rull ±0,03 per cykel. Kroppen dippar 0,028 m mot ' +
    'dubbelstöd — hjässan är taket, inte medelvärdet. ' +
    'Fasen kommer från sträcka, inte klocka.',
  poseIdle:
    'Nära noll överallt. Tyngdöverföring 0,35 Hz på bålens rull ±0,025 och ' +
    'knäna 0,06–0,11, fotled = knä − höft så sulan står plan. Andning ' +
    '0,22 Hz på kroppens y, 0–0,006 m nedåt. Huvudvridning ' +
    '±0,16 rad på 0,18 Hz. Armbåge 0,16 så armarna inte hänger som brädor.',
  poseSeated:
    'hipDrop 0,41 m (sits 0,45). Höft 1,46 rad fram, knä 1,77 rad, fotled 0,31 ' +
    '— låret vågrätt, underbenet lätt bakåt, sulan plan i golvplanet. Axel 0,52 / armbåge 1,14 ' +
    'lägger händerna på låren. Bål 0,06 fram, nick 0,35 Hz. targetYaw vrider ' +
    'huvud 0,7 och bål 0,3 mot bordet.',
  poseGreet:
    'En axel 1,12 rad fram och 0,52 rad ut, armbåge 0,82 — handen i huvudhöjd. ' +
    'Vinkning 1,6 Hz på axelns lift ±0,20 och armbågen ∓0,16. Andra armen 0,06/0,22. ' +
    'Bål 0,09 fram, targetYaw vrider bål 0,4 och huvud 0,6. Benen står isär 0,05.',
  poseWork:
    'Bål 0,22 fram, huvud 0,30 ner mot händerna. Båda axlar 0,84 rad fram, ' +
    'armbåge 0,96, växelvis ±0,14/∓0,18 på 1,3 Hz så händerna arbetar i motfas. ' +
    'Benen isär 0,07, bakre knä 0,14, fotled 0,06/0,20 så fötterna står plana.',
  poseCarry:
    'Båda axlar 0,55 rad fram och 0,16 ut, armbåge 1,05 — handankarna möts ' +
    '0,40 m fram på 1,15 m höjd. Bål 0,02 bakåt som motvikt, huvud 0,10 ner. ' +
    'Vaggning 0,9 Hz ±0,02 på axel och armbåge. options.phase byter ut benen ' +
    'mot poseWalk, så bärande under gång är samma pose.'
};

// ---------- mätning ---------------------------------------------------

/**
 * Faktisk utbredning i världsmått. ORDER 121 §7 mäter figuren i vyn,
 * inte i scengrafen — den här funktionen ger samma tal som
 * playwright-mätningen ska bekräfta (höjd 1,70 m i stående pose,
 * bredd = axelbredden).
 */
export function measureFigure(rig: FigureRig) {
  rig.root.updateWorldMatrix(true, true);
  // Exakta hörn, inte transformerade AABB:er. Box3.setFromObject roterar
  // varje geometris AABB, och en lutad sfärs AABB blåser upp höjden med
  // ~6 mm — då skulle kontraktet läsa 1,706 m fast silhuetten toppar på
  // 1,700. Här samlas verkliga världskoordinater i stället.
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  rig.root.traverse(function (o) {
    if (!o.isMesh || !o.geometry) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      box.expandByPoint(v);
    }
  });
  const size = new THREE.Vector3();
  box.getSize(size);
  return {
    height: size.y,
    width: size.x,
    depth: size.z,
    crownY: box.max.y,
    anchorY: rig.joints.headAnchor.getWorldPosition(new THREE.Vector3()).y
  };
}

// ---------- ÖPPNA FRÅGOR TILL SIMULERINGEN ----------------------------
//
// ORDER 121 §4: en pose som kräver information spelet inte har ska
// flaggas, inte uppfinnas. Tre poser saknar indata i dag. Riggen
// exponerar dem ändå — de fungerar så snart någon skickar in ett
// tillstånd — men presentationslagret väljer dem inte självt.
//
// 1. poseWork  — TeamMember bär bara `role`. Det finns ingen uppgift
//    på den entitet InteriorStaff.tsx renderar, så "arbetar just nu"
//    går inte att läsa av. `staffTasks` i strings.sv.ts är text utan
//    koppling till en tillståndsmaskin. Fram till dess är poseWork
//    korrekt bara som roll-konstant (kock vid passet), inte som
//    händelse. FLAGGAT.
//
// 2. poseCarry — samma sak, plus: ingenting säger VAD som bärs eller
//    mellan vilka två punkter. Handankaret finns; valet av pose
//    kräver ett bär-tillstånd som inte existerar. FLAGGAT.
//
// 3. Golvkontakt vid studs — inte en saknad indata, men ett val som hör
//    hit. 1,700 m är ett tak, så gångstuds och andning sänker kroppen i
//    stället för att lyfta den. Mätt lägsta punkt över hela cykeln, per
//    pose: poseWalk och poseCarry −0,029 m (gångstudsen), poseSeated
//    −0,012 m, poseGreet −0,009 m, poseIdle −0,007 m, poseWork
//    −0,000 m. De stillastående poserna håller sulan i golvplanet med
//    plan fotled (ankle = knä − höft); det som återstår är studsen.
//    Osynligt i strategisk kamera. Ska kontakten vara exakt även under
//    studs hör den i knäböjen, och det kräver en enkel ben-IK som inte
//    ingår i den här ordern.
//
// 4. poseGreet — riktningen (targetYaw) kräver vem figuren vänder sig
//    mot. För personal finns kanten redan: StaffMember.targetGuestId
//    plus bryggan i teamStaffBridge.ts (samma som pip-en använder).
//    För gäst mot gäst finns ingen sådan kant. Om värden ska hälsa på
//    en ankommande gäst behöver simuleringen säga vilken gäst.
//    HÄRLEDBAR FÖR PERSONAL, FLAGGAT FÖR GÄST.
//
// poseWalk, poseIdle och poseSeated behöver ingen ny information:
// GuestState och den befintliga positionsinterpolationen räcker
// (arriving/waiting/leaving/declined → poseWalk med fas ur sträckan,
// stillastående → poseIdle, seated/ordering/dining/paying/sleeping →
// poseSeated).
