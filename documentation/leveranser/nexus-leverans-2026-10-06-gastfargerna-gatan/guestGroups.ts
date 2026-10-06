// guestGroups.ts — D5 (2026-10-04): gästerna i fem grupper, åtskilda på kläderna och avläsbara på 14 m.
// Varje grupp har en färgfamilj (två varianter) och ett tecken som syns i siluetten uppifrån: ryggsäcken,
// kepsen, solhatten, sjalen och den vita skjortan. Tecknet är det som läses på 14 m, färgen hjälper till.
// Alla kroppsfärger ligger inom kontrastbandet mot vinbarens fem golv (1,8–3,6), i dagsljus (ambientScale 1,0)
// och i båda kvällsljusen (0,62 och 0,48): checkGroupsAgainstFloors() nedan. Tillägg 2026-10-05 (Code 309): åtta av tio
// låg för ljust och två för mörkt. Fönstret är kroppens luminans L 0,0509–0,0913 (det övre ur 0,48 mot DJ-golvet).
// Kroppsfärgerna skiljer sig från personalens uniformer. Inget rött, inget grönt som signal (grönt i kläder är dämpat oliv).
// Ersätter inte gästtyperna i leverans 4 (pengarna), utan visar ORDER 304:s grupper (vilka som kommer per klass).

import * as THREE from 'three';

export type GuestGroupId = 'student' | 'villager' | 'tourist' | 'gourmet' | 'business';

export interface GroupLook { body: string; limb: string; accent: string; /** Gatan och byn (tillägg 2026-10-06, Code 302b). */ street: { body: string; limb: string; accent: string } }
/** Var figuren står. 'room' = inne i vinbaren (golven i ZONE_FLOORS), 'street' = gatan, trottoaren, torget och byn. */
export type LookWhere = 'room' | 'street';
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
    looks: [{ body: '#074e7d', limb: '#093351', accent: '#c4a04a', street: { body: '#529bd8', limb: '#4376a1', accent: '#3a2412' } }, { body: '#2d447d', limb: '#1c2c51', accent: '#b8743a', street: { body: '#7494de', limb: '#5a71a6', accent: '#3d2614' } }] },
  villager: { id: 'villager', sign: 'cap', classes: ['simple', 'bistro'], pays: 'mid', forgives: 'some',
    looks: [{ body: '#6b4624', limb: '#472f1a', accent: '#3a2c20', street: { body: '#bb8b62', limb: '#8d6b4e', accent: '#3a2c20' } }, { body: '#3f5830', limb: '#2a3b21', accent: '#3a3028', street: { body: '#7f9e6c', limb: '#617754', accent: '#3a3028' } }] },
  tourist: { id: 'tourist', sign: 'sunhat', classes: ['bistro', 'soigne'], pays: 'mid', forgives: 'some',
    looks: [{ body: '#63510d', limb: '#43370e', accent: '#efe1c0', street: { body: '#aa934a', limb: '#80703d', accent: '#efe1c0' } }, { body: '#22584f', limb: '#183a34', accent: '#efe1c0', street: { body: '#61a095', limb: '#4c7971', accent: '#efe1c0' } }] },
  gourmet: { id: 'gourmet', sign: 'scarf', classes: ['soigne'], pays: 'high', forgives: 'little',
    looks: [{ body: '#63335c', limb: '#40203b', accent: '#d9a54a', street: { body: '#bf81b5', limb: '#916489', accent: '#f6d98e' } }, { body: '#4d3b61', limb: '#30253d', accent: '#c98a3e', street: { body: '#a28cbe', limb: '#7b6c8f', accent: '#f2cf86' } }] },
  business: { id: 'business', sign: 'shirt', classes: ['soigne'], pays: 'high', forgives: 'little',
    looks: [{ body: '#46526a', limb: '#262c3a', accent: '#f1ece2', street: { body: '#7e98b4', limb: '#617488', accent: '#f1ece2' } }, { body: '#3e4148', limb: '#22242a', accent: '#f1ece2', street: { body: '#9a948d', limb: '#75716c', accent: '#f1ece2' } }] }
};

/** Lägger gruppens tecken på en figurrigg (figureRig: joints.head, joints.chest, shoulderWidth). Gäster sitter oftast,
 *  så tecknen sitter på överkroppen och huvudet, aldrig på benen. */
export function dressGroup(rig: any, group: GuestGroupId, variant = 0, where: LookWhere = 'room'): THREE.Object3D[] {
  const G = GUEST_GROUPS[group], L0 = G.looks[variant % 2], L = where === 'street' ? L0.street : L0, head = rig.joints.head, chest = rig.joints.chest;
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
export function lookOf(group: GuestGroupId, variant = 0, where: LookWhere = 'room'): { body: string; limb: string } {
  const L0 = GUEST_GROUPS[group].looks[variant % 2], L = where === 'street' ? L0.street : L0; return { body: L.body, limb: L.limb };
}

// ---------- Kontrastbandet i dagsljus och kvällsljus (tillägg 2026-10-05, Code 309) ----------
// Samma kvot som wineBarRoom.contrast(), men med golvets och kroppens luminans skalade med ljuset. Flaren (+0,05) skalas
// inte, så kvoten sjunker i kvällsljus. Det är därför det övre fönstret är 0,0913 och inte 0,1154.
export const LIGHT_SCALES = { day: 1.0, evening: 0.62, lateEvening: 0.48 };
const WINE_BAR_FLOORS = ['#a89577', '#a49075', '#a08d74', '#97866f', '#a09786'];
function lum(hex: string): number {
  const ch = (i: number) => { const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(0) + 0.7152 * ch(1) + 0.0722 * ch(2);
}
/** Alla tio kroppsfärger mot de fem golven i de tre ljusen. Tom lista = godkänt. */
export function checkGroupsAgainstFloors(floors = WINE_BAR_FLOORS, lo = 1.8, hi = 3.6) {
  const fails: { group: GuestGroupId; variant: number; floor: string; light: string; ratio: number }[] = [];
  (Object.keys(GUEST_GROUPS) as GuestGroupId[]).forEach((g) => GUEST_GROUPS[g].looks.forEach((L, v) => floors.forEach((f) =>
    Object.entries(LIGHT_SCALES).forEach(([light, k]) => {
      const a = k * lum(f), b = k * lum(L.body), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (r < lo || r > hi) fails.push({ group: g, variant: v, floor: f, light, ratio: r });
    }))));
  return fails;
}

// ---------- Gatan och byn (tillägg 2026-10-06, Code 302b) ----------
// Inne i vinbaren är kropparna mörkare än golvet. På gatan är markytorna mörkare än vinbarens golv (L 0,051–0,115), så där
// flöt kropparna ihop med marken och bara tecknen bar läsningen. Gatans kroppar är därför ljusare än marken, med samma kulör
// som i rummet. Fönstret är L 0,2904–0,3145: det undre ur 0,48 mot venuePavement, det övre ur dagsljus mot greens.
// Tecknen vänds där de annars försvinner: studenternas ryggsäck och luva blir mörka, gourmeternas sjal ljusare guld.
/** Gatans markytor, ur byKvall.js. Kantstenen (#7d796e, 0,15 m bred) ingår inte: ingen står på den. */
export const STREET_SURFACES: { id: string; colour: string }[] = [
  { id: 'road', colour: '#4f4030' }, { id: 'path', colour: '#5e4c38' }, { id: 'torget', colour: '#6b5842' },
  { id: 'ourPavement', colour: '#4b433c' }, { id: 'venuePavement', colour: '#6b5d4e' },
  { id: 'grass', colour: '#3a4434' }, { id: 'residential', colour: '#3d4536' }, { id: 'greens', colour: '#36442f' }
];
/** Bytet vid dörren: figuren byter från gatans färger till rummets när den passerar dörrmattan, på blendS sekunder. */
export const STREET_BLEND = { at: 'room.queueSpots[0] (dörrmattan)', blendS: 0.6, ease: 'inOutSine' };
/** Kropparna (gatans variant) mot gatans markytor i de tre ljusen. Tom lista = godkänt. */
export function checkGroupsAgainstStreet(surfaces = STREET_SURFACES.map((x) => x.colour), lo = 1.8, hi = 3.6) {
  const fails: { group: GuestGroupId; variant: number; surface: string; light: string; ratio: number }[] = [];
  (Object.keys(GUEST_GROUPS) as GuestGroupId[]).forEach((g) => GUEST_GROUPS[g].looks.forEach((L, v) => surfaces.forEach((f) =>
    Object.entries(LIGHT_SCALES).forEach(([light, k]) => {
      const a = k * lum(f), b = k * lum(L.street.body), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (r < lo || r > hi) fails.push({ group: g, variant: v, surface: f, light, ratio: r });
    }))));
  return fails;
}
/** Tecknet mot kroppen på gatan, i dagsljus. Under 1,8 försvinner tecknet. */
export function checkStreetSigns(min = 1.8) {
  const fails: { group: GuestGroupId; variant: number; ratio: number }[] = [];
  (Object.keys(GUEST_GROUPS) as GuestGroupId[]).forEach((g) => GUEST_GROUPS[g].looks.forEach((L, v) => {
    const a = lum(L.street.accent), b = lum(L.street.body), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (r < min) fails.push({ group: g, variant: v, ratio: r });
  }));
  return fails;
}
