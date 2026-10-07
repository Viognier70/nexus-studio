// asaFigure.ts — Intendent Åsa, mentorn från Campus. D6, 2026-10-07 (ORDER 313 §1).
//
// Åsa byggs på figureRig som personalen (variant 'staff', höjdlåst 1,70 m utan hatt) och kläs med dressAsa().
// Utseendet enligt beställningen: mörkt, ganska kort hår (en page till käklinjen), en blåvit klänning och en
// matchande stor hatt med brett brätte, klassiskt och elegant. Inga varumärken eller logotyper.
//
// ── Läsbarhet ────────────────────────────────────────────────────
// Från 24 m och uppifrån är det hatten kameran ser. Brättet är 0,66 m brett (turistens solhatt är 0,46 m och
// ljust kräm), djupblått med en vit kant, och kullen är vit med ett blått band. Uppifrån blir det en blå skiva
// med vit ring och vit mitt, som ingen annan figur har. Från sidan och på nära håll läses klänningen: blått liv,
// vit krage och vitt skärp, och en klockformad kjol med vit fåll till mitt på vaden.
// Klänningens blå ligger i kontrastbandet för kroppar (L 0,0509–0,0913, guestGroups.ts): #24477a har L 0,0604.
// Inget rött och inget grönt. Det blå är ett annat än spelarens vagn (#2f4b6e, dalablå) och kockens ring (#7fa8ff).
//
// ── I spelet ─────────────────────────────────────────────────────
// Ersätter mentorn (MENTOR_GARMENT #585b31 i wineBarRoom.ts, Ingrid i öppningen). Hatten bärs alltid, också inne.
// Kjolen hänger i pelvis, så den följer kroppen men inte bålens lutning. Åsa sitter inte i några klipp. Om hon
// ska sitta senare plattas kjolen till med setAsaSeated(rig, true).
// Hatten höjer figuren till 1,81 m. headAnchor flyttas upp över kullen, så pip och nål hamnar ovanför hatten.

import * as THREE from 'three';

export const ASA = {
  id: 'asa',
  role: 'mentor',
  dress: '#24477a',
  dressShade: '#1b3760',
  white: '#eef0ec',
  hatBrim: '#2b5797',
  hatCrown: '#eef0ec',
  hatBand: '#24477a',
  hair: '#1f1814',
  skin: '#d6b08a',
  /** Mått i meter. */
  brimRadius: 0.33,
  crownRadius: 0.118,
  crownHeight: 0.105,
  skirtTop: 0.19,
  skirtBottom: 0.335,
  skirtLength: 0.6,
  /** Hjässan med hatt. */
  heightWithHat: 1.81
};

/** Riggens alternativ för Åsa. Skicka till createFigureRig och klä sedan med dressAsa. */
export const ASA_RIG_OPTIONS = { variant: 'staff' as const, garmentColour: ASA.dress, limbColour: ASA.dressShade, skinColour: ASA.skin };

export function createAsa(R: { createFigureRig: (o: any) => any }): any {
  const rig = R.createFigureRig(ASA_RIG_OPTIONS);
  dressAsa(rig);
  return rig;
}

/** Lägger håret, hatten och klänningen på en figurrigg (figureRig: joints.head, joints.chest, joints.pelvis). */
export function dressAsa(rig: any): THREE.Object3D[] {
  const J = rig.joints, head = J.head, chest = J.chest, pelvis = J.pelvis;
  const sw = rig.shoulderWidth, depth = sw * 0.44, waist = sw * 0.78, added: THREE.Object3D[] = [];
  const m = (c: string, r = 0.8, side: THREE.Side = THREE.FrontSide) => { const k = new THREE.MeshStandardMaterial({ color: c, roughness: r, side }); rig.materials.push(k); return k; };
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, name: string) => {
    const o = new THREE.Mesh(geo, mat); o.name = 'asa.' + name; o.castShadow = true; o.receiveShadow = true; parent.add(o); added.push(o); return o;
  };

  // Håret: en page. Toppen täcker hela hjässan, sidorna och nacken går ned till käklinjen och lämnar ansiktet fritt.
  const hair = m(ASA.hair, 0.6);
  add(head, new THREE.SphereGeometry(0.128, 20, 10, 0, Math.PI * 2, 0, 0.95), hair, 'hairTop').position.y = 0.118;
  const bob = add(head, new THREE.SphereGeometry(0.132, 20, 12, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0.6, 1.25), hair, 'hairBob');
  bob.position.y = 0.112;

  // Hatten: brett brätte i djupblått med vit kant, vit kulle med blått band. Lätt lutad framåt, som en klassisk hatt bärs.
  const hat = new THREE.Group(); hat.name = 'asa.hat'; hat.position.set(0, 0.205, 0.004); hat.rotation.x = 0.07; head.add(hat); added.push(hat);
  // Brättet sluttar svagt nedåt mot kanten (en flack kon), som en klassisk damhatt, och kullen är rundad.
  add(hat, new THREE.CylinderGeometry(ASA.crownRadius + 0.01, ASA.brimRadius, 0.04, 40, 1, true), m(ASA.hatBrim, 0.75, THREE.DoubleSide), 'brim').position.y = -0.008;
  const edge = add(hat, new THREE.TorusGeometry(ASA.brimRadius - 0.004, 0.011, 6, 48), m(ASA.white, 0.7), 'brimEdge'); edge.rotation.x = Math.PI / 2; edge.position.y = -0.028;
  add(hat, new THREE.CylinderGeometry(ASA.crownRadius * 0.9, ASA.crownRadius, ASA.crownHeight * 0.75, 28), m(ASA.hatCrown, 0.75), 'crown').position.y = ASA.crownHeight * 0.375 + 0.006;
  const dome = add(hat, new THREE.SphereGeometry(ASA.crownRadius * 0.9, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), m(ASA.hatCrown, 0.75), 'dome'); dome.position.y = ASA.crownHeight * 0.75 + 0.004; dome.scale.y = 0.35;
  add(hat, new THREE.CylinderGeometry(ASA.crownRadius + 0.004, ASA.crownRadius + 0.004, 0.03, 28), m(ASA.hatBand, 0.6), 'band').position.y = 0.024;
  // Rosetten på bandet, vänster sida. Ingen logotyp.
  add(hat, new THREE.SphereGeometry(0.026, 10, 8), m(ASA.hatBand, 0.6), 'bow').position.set(-ASA.crownRadius - 0.01, 0.026, 0.02);

  // Klänningen: vit krage, vitt skärp i midjan, vita manschetter, och kjolen.
  const white = m(ASA.white, 0.7);
  const collar = add(chest, new THREE.TorusGeometry(0.085, 0.022, 8, 22), white, 'collar'); collar.rotation.x = Math.PI / 2; collar.position.y = 0.575;
  add(chest, new THREE.BoxGeometry(waist + 0.012, 0.05, depth * 0.92 + 0.012), white, 'belt').position.y = 0.235;
  ['L', 'R'].forEach((s) => { const e = J['elbow' + s]; if (!e) return; add(e, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), white, 'cuff' + s).position.y = -0.22; });
  const skirt = new THREE.Group(); skirt.name = 'asa.skirt'; pelvis.add(skirt); added.push(skirt);
  add(skirt, new THREE.CylinderGeometry(ASA.skirtTop, ASA.skirtBottom, ASA.skirtLength, 28, 1, true), m(ASA.dress, 0.85, THREE.DoubleSide), 'skirt').position.y = 0.02 - ASA.skirtLength / 2;
  add(skirt, new THREE.CylinderGeometry(ASA.skirtBottom + 0.003, ASA.skirtBottom + 0.006, 0.07, 28, 1, true), m(ASA.white, 0.75, THREE.DoubleSide), 'hem').position.y = 0.02 - ASA.skirtLength + 0.035;
  rig.asaSkirt = skirt;

  // Pip och nål ovanför hatten.
  if (J.headAnchor) J.headAnchor.position.y += 0.11;
  return added;
}

/** Kjolen när Åsa sitter: kortare och vidare, så den inte går genom stolen. Inget klipp använder det än. */
export function setAsaSeated(rig: any, seated: boolean): void {
  const s = rig.asaSkirt; if (!s) return;
  s.scale.set(seated ? 1.25 : 1, seated ? 0.45 : 1, seated ? 1.25 : 1);
}
