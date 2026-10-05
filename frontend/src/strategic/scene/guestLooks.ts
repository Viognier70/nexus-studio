// ORDER 309 — gästgrupperna ur Designs D5 (guestGroups.ts) på spelets gästtyper.
//
// Simuleringen har gästtyperna (types.ts GuestType, ORDER 287a och 307):
// studenter, bybor (middle), turister, gourmeter och affärsfolk är D5:s fem
// grupper. Tre typer har ingen egen grupp i D5 och får en närliggande:
//   - high (höginkomst, gästtypen i klasserna utan koncept): affärsfolkets
//     kavaj och vita skjorta, den betalningsstarka gruppen;
//   - social (gästen med socialt kapital, en bybo som sprider ordet): byborna;
//   - billionaire (mannen i guld): affärsfolkets tecken, kroppen i guld som förut.
// Riggarna klär sig en gång när rummet monteras (inget skapas i renderloopen):
// varje gästfigur får alla fem gruppernas tecken, och bara gästens grupp syns.

import type * as THREE from 'three';
import type { GuestType } from '../types';
import { GUEST_TYPES } from '../../sim/balance';
import { dressGroup, GUEST_GROUPS, lookOf, type GuestGroupId } from './guestGroups';
import type { FigureRig } from './figureRig';

export const GROUP_IDS: readonly GuestGroupId[] = ['student', 'villager', 'tourist', 'gourmet', 'business'];

/** Mannen i guld (ORDER 287a, WARM.guest.billionaire). */
export const BILLIONAIRE_GOLD = '#e8b93a';

const GROUP_OF: Record<GuestType, GuestGroupId> = {
  student: 'student',
  middle: 'villager',
  tourist: 'tourist',
  gourmet: 'gourmet',
  business: 'business',
  high: 'business',
  social: 'villager',
  billionaire: 'business'
};

export function groupOfGuestType(t: GuestType): GuestGroupId {
  return GROUP_OF[t];
}

/** Utseendet för en gästtyp: gruppens kropp och lemmar (D5 lookOf), och tecknet. */
export function lookForGuestType(t: GuestType, variant: number): { group: GuestGroupId; body: string; limb: string; sign: string } {
  const group = groupOfGuestType(t);
  const l = lookOf(group, variant);
  return { group, body: t === 'billionaire' ? BILLIONAIRE_GOLD : l.body, limb: l.limb, sign: GUEST_GROUPS[group].sign };
}

/** Hur mycket gästen förlåter, som ord (D5 kortet), ur balance.ts GUEST_TYPES.forgiveness (felets följd gånger detta). */
export function forgivesOf(t: GuestType): 'much' | 'some' | 'little' {
  const f = GUEST_TYPES.forgiveness[t];
  return f <= 0.8 ? 'much' : f <= 1.2 ? 'some' : 'little';
}

/** Tecken som sitter på huvudet (då döljs figurens egen bonad, så att två hattar inte står på varandra). */
export const HEAD_SIGNS: ReadonlySet<string> = new Set(['cap', 'sunhat']);

export interface DressedRig {
  signs: Record<GuestGroupId, THREE.Object3D[]>;
  limbDefault: string;
  group: GuestGroupId | null;
  geometries: THREE.BufferGeometry[];
}

/** Klär en gästrigg med alla fem gruppernas tecken (dolda). Materialen läggs i rig.materials (tonas och städas med riggen). */
export function dressAllGroups(rig: FigureRig, variant: number): DressedRig {
  const signs = {} as Record<GuestGroupId, THREE.Object3D[]>;
  const geometries: THREE.BufferGeometry[] = [];
  for (const g of GROUP_IDS) {
    const added = dressGroup(rig, g, variant);
    for (const o of added) {
      o.visible = false;
      const m = o as THREE.Mesh;
      if (m.geometry) geometries.push(m.geometry);
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (mat && !rig.materials.includes(mat)) rig.materials.push(mat);
    }
    signs[g] = added;
  }
  return { signs, limbDefault: '#' + rig.materials[1].color.getHexString(), group: null, geometries };
}

/** Visar gästtypens grupp på riggen (eller ingen), och sätter kroppens och lemmarnas färg. */
export function showGroup(rig: FigureRig, dressed: DressedRig, t: GuestType | null, variant: number, fallbackBody: string): GuestGroupId | null {
  const look = t ? lookForGuestType(t, variant) : null;
  const group = look?.group ?? null;
  if (group !== dressed.group) {
    for (const g of GROUP_IDS) for (const o of dressed.signs[g]) o.visible = g === group;
    dressed.group = group;
  }
  rig.garment.color.set(look ? look.body : fallbackBody);
  rig.materials[1].color.set(look ? look.limb : dressed.limbDefault);
  return group;
}

export function disposeDressed(d: DressedRig): void {
  d.geometries.forEach((g) => g.dispose());
}
