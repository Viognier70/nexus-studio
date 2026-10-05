// guestGroups.ts — D5 (2026-10-04): gästerna i fem grupper, åtskilda på kläderna och avläsbara på 14 m.
// Varje grupp har en färgfamilj (två varianter) och ett tecken som syns i siluetten uppifrån: ryggsäcken,
// kepsen, solhatten, sjalen och den vita skjortan. Tecknet är det som läses på 14 m, färgen hjälper till.
// Alla kroppsfärger ligger inom kontrastbandet mot vinbarens fem golv (1,8–3,6, checkPaletteAgainstFloors)
// och skiljer sig från personalens uniformer. Inget rött, inget grönt som signal (grönt i kläder är dämpat oliv).
// Ersätter inte gästtyperna i leverans 4 (pengarna), utan visar ORDER 304:s grupper (vilka som kommer per klass).

import * as THREE from 'three';

export type GuestGroupId = 'student' | 'villager' | 'tourist' | 'gourmet' | 'business';

export interface GroupLook { body: string; limb: string; accent: string }
export interface GuestGroup {
  id: GuestGroupId;
  /** Det man ser på 14 m. */
  sign: 'backpack' | 'cap' | 'sunhat' | 'scarf' | 'shirt';
  looks: [GroupLook, GroupLook];
  /** Klasserna där gruppen kommer (ORDER 304 §1). */
  classes: ('simple' | 'bistro' | 'soigne')[];
  /** Kraven (ORDER 304 §2), som ord. Talen i balance.ts (GUEST_GROUP). */
  pays: 'low' | 'mid' | 'high';
  forgives: 'much' | 'some' | 'little';
}

export const GUEST_GROUPS: Record<GuestGroupId, GuestGroup> = {
  student: { id: 'student', sign: 'backpack', classes: ['simple'], pays: 'low', forgives: 'much',
    looks: [{ body: '#3f7390', limb: '#2f3a48', accent: '#c4a04a' }, { body: '#5a6f9a', limb: '#2f3448', accent: '#b8743a' }] },
  villager: { id: 'villager', sign: 'cap', classes: ['simple', 'bistro'], pays: 'mid', forgives: 'some',
    looks: [{ body: '#6b7a4e', limb: '#3a4230', accent: '#4a3c2c' }, { body: '#8a7457', limb: '#4a4034', accent: '#3a3028' }] },
  tourist: { id: 'tourist', sign: 'sunhat', classes: ['bistro', 'soigne'], pays: 'mid', forgives: 'some',
    looks: [{ body: '#b8a27c', limb: '#5a4e3c', accent: '#efe1c0' }, { body: '#8fa0a8', limb: '#4a5458', accent: '#efe1c0' }] },
  gourmet: { id: 'gourmet', sign: 'scarf', classes: ['soigne'], pays: 'high', forgives: 'little',
    looks: [{ body: '#4a2a3a', limb: '#24161e', accent: '#d9a54a' }, { body: '#2f2a35', limb: '#18151c', accent: '#c98a3e' }] },
  business: { id: 'business', sign: 'shirt', classes: ['soigne'], pays: 'high', forgives: 'little',
    looks: [{ body: '#46526a', limb: '#262c3a', accent: '#f1ece2' }, { body: '#3e4148', limb: '#22242a', accent: '#f1ece2' }] }
};

/** Lägger gruppens tecken på en figurrigg (figureRig: joints.head, joints.chest, shoulderWidth). Gäster sitter oftast,
 *  så tecknen sitter på överkroppen och huvudet, aldrig på benen. */
export function dressGroup(rig: any, group: GuestGroupId, variant = 0): THREE.Object3D[] {
  const G = GUEST_GROUPS[group], L = G.looks[variant % 2], head = rig.joints.head, chest = rig.joints.chest;
  const depth = rig.shoulderWidth * 0.44, added: THREE.Object3D[] = [];
  const m = (c: string, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const add = (parent: THREE.Object3D, o: THREE.Mesh, name: string) => { o.name = 'sign.' + name; o.castShadow = true; parent.add(o); added.push(o); return o; };
  if (G.sign === 'backpack') {
    // Ryggsäcken: 0,30 × 0,38 × 0,14 m på ryggen, i en kontrastfärg. Sitter kvar när hen sitter (på stolsryggen i spelet).
    add(chest, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), m(L.accent)), 'backpack').position.set(0, -0.05, -depth / 2 - 0.08);
    // Tillägg 2026-10-05: luvan i ryggsäckens kontrastfärg, nedfälld som en krage runt halsen, så att studenterna läses från alla håll.
    const hood = add(chest, new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.055, 8, 20), m(L.accent)), 'hood'); hood.position.set(0, 0.49, -0.03); hood.rotation.set(Math.PI / 2 + 0.25, 0, 0); hood.scale.set(1.25, 1.25, 1);
  }
  if (G.sign === 'cap') {
    // Kepsen: platt skärmmössa, kullen 0,24 m bred, skärmen 0,07 m fram.
    add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.05, 18), m(L.accent)), 'cap').position.set(0, 0.17, -0.005);
    add(head, new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.08), m(L.accent)), 'capPeak').position.set(0, 0.155, 0.12);
  }
  if (G.sign === 'sunhat') {
    // Solhatten: brätte 0,46 m, ljust. Den tydligaste siluetten uppifrån. Kameraremmen över bröstet.
    add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.012, 24), m(L.accent, 0.95)), 'brim').position.set(0, 0.15, 0);
    add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.09, 18), m(L.accent, 0.95)), 'crown').position.set(0, 0.2, 0);
    const strap = add(chest, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.012), m('#2a2420')), 'strap'); strap.position.set(0, 0.1, depth / 2 + 0.01); strap.rotation.z = 0.7;
    add(chest, new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.06), m('#1c1814')), 'camera').position.set(0.13, -0.12, depth / 2 + 0.04);
  }
  if (G.sign === 'scarf') {
    // Sjalen: tjock, i mässing eller bärnsten, lindad och med en ände ned över bröstet.
    const s = add(chest, new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 18), m(L.accent)), 'scarf'); s.position.set(0, 0.56, 0); s.rotation.x = Math.PI / 2;
    add(chest, new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.03), m(L.accent)), 'scarfEnd').position.set(0.07, 0.34, depth / 2 + 0.03);
  }
  if (G.sign === 'shirt') {
    // Den vita skjortan i kavajens V och en slips i kavajens egen ton, mörkare. Syns som en ljus kil uppifrån och framifrån.
    const v = add(chest, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.0, 0.34, 3), m(L.accent, 0.6)), 'shirt'); v.position.set(0, 0.36, depth / 2 + 0.008); v.rotation.set(Math.PI / 2, 0, Math.PI); v.scale.set(1, 1, 0.12);
    add(chest, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.012), m(L.limb, 0.5)), 'tie').position.set(0, 0.32, depth / 2 + 0.022);
    const col = add(chest, new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 16), m(L.accent, 0.6)), 'collar'); col.position.set(0, 0.6, 0.01); col.rotation.x = Math.PI / 2;
  }
  return added;
}

/** Utseendet som teaterScen.LOOKS-post (body, limb), så att samma rigg och kontrastkontroll gäller. */
export function lookOf(group: GuestGroupId, variant = 0): { body: string; limb: string } {
  const L = GUEST_GROUPS[group].looks[variant % 2]; return { body: L.body, limb: L.limb };
}
