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
//
// ORDER 302c — gatans färger (Designs tillägg 2026-10-06, guestGroups.ts
// looks[].street, LEVERANSNOT §4): en gäst utanför dörren (kön på trottoaren,
// vägen till och från dörren) bär gatans variant och byter till rummets på
// dörrmattan (room.queueSpots[0]) på STREET_BLEND.blendS sekunder med inOutSine.
// Ut gäller det omvända. Kroppen, lemmarna och tecknen tonas tillsammans.

import * as THREE from 'three';
import type { GuestType } from '../types';
import { GUEST_TYPES } from '../../sim/balance';
import { dressGroup, GUEST_GROUPS, lookOf, STREET_BLEND, type GuestGroupId, type LookWhere } from './guestGroups';
import type { FigureRig } from './figureRig';
import type { StreetFloorShare } from './village/streetFigureLight';

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

/** Utseendet för en gästtyp: gruppens kropp och lemmar (D5 lookOf), och tecknet. where: rummet eller gatan (ORDER 302c). */
export function lookForGuestType(t: GuestType, variant: number, where: LookWhere = 'room'): { group: GuestGroupId; body: string; limb: string; sign: string } {
  const group = groupOfGuestType(t);
  const l = lookOf(group, variant, where);
  return { group, body: t === 'billionaire' ? BILLIONAIRE_GOLD : l.body, limb: l.limb, sign: GUEST_GROUPS[group].sign };
}

/** Hur mycket gästen förlåter, som ord (D5 kortet), ur balance.ts GUEST_TYPES.forgiveness (felets följd gånger detta). */
export function forgivesOf(t: GuestType): 'much' | 'some' | 'little' {
  const f = GUEST_TYPES.forgiveness[t];
  return f <= 0.8 ? 'much' : f <= 1.2 ? 'some' : 'little';
}

/** Tecken som sitter på huvudet (då döljs figurens egen bonad, så att två hattar inte står på varandra). */
export const HEAD_SIGNS: ReadonlySet<string> = new Set(['cap', 'sunhat']);

/** Ett teckens material med rummets och gatans färg (ORDER 302c). */
interface SignColour { mat: THREE.MeshStandardMaterial; room: THREE.Color; street: THREE.Color }

export interface DressedRig {
  signs: Record<GuestGroupId, THREE.Object3D[]>;
  /** ORDER 302c — tecknens färger i rummet och på gatan, per grupp. */
  signColours: Record<GuestGroupId, SignColour[]>;
  limbDefault: string;
  group: GuestGroupId | null;
  geometries: THREE.BufferGeometry[];
  /** ORDER 302c — kroppens och lemmarnas färg i rummet och på gatan för gästen som bärs nu. */
  body: { room: THREE.Color; street: THREE.Color };
  limb: { room: THREE.Color; street: THREE.Color };
  /** ORDER 302c — bytet vid dörren: hur långt det kommit (0 rummet, 1 gatan) och åt vilket håll. */
  blend: StreetBlendState;
  /** Gatans andel som senast sattes på materialen (−1: inte satt). */
  applied: number;
  /**
   * ORDER 302d — riggens andel av kvällens lägsta ljushet (village/streetFigureLight.ts):
   * gatans andel i bytet vid dörren, så att kön utanför har golvet och rummet inte.
   * Läggs på riggens material med withStreetFloorOnTree när riggen är klädd.
   */
  lightShare: StreetFloorShare;
}

/** Klär en gästrigg med alla fem gruppernas tecken (dolda). Materialen läggs i rig.materials (tonas och städas med riggen). */
export function dressAllGroups(rig: FigureRig, variant: number): DressedRig {
  const signs = {} as Record<GuestGroupId, THREE.Object3D[]>;
  const signColours = {} as Record<GuestGroupId, SignColour[]>;
  const geometries: THREE.BufferGeometry[] = [];
  // ORDER 302c — gatans färger ur samma funktion (dressGroup(…, 'street')) på en
  // tom rigg, mesh för mesh i samma ordning; den tomma riggen städas direkt.
  const scratch = { joints: { head: new THREE.Object3D(), chest: new THREE.Object3D() }, shoulderWidth: rig.shoulderWidth };
  for (const g of GROUP_IDS) {
    const added = dressGroup(rig, g, variant);
    const street = dressGroup(scratch, g, variant, 'street');
    signColours[g] = [];
    added.forEach((o, i) => {
      o.visible = false;
      const m = o as THREE.Mesh;
      if (m.geometry) geometries.push(m.geometry);
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (mat && !rig.materials.includes(mat)) rig.materials.push(mat);
      const sm = (street[i] as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined;
      if (mat) signColours[g].push({ mat, room: mat.color.clone(), street: (sm ?? mat).color.clone() });
    });
    for (const o of street) {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    }
    signs[g] = added;
  }
  const limbDefault = '#' + rig.materials[1].color.getHexString();
  return {
    signs, signColours, limbDefault, group: null, geometries,
    body: { room: rig.garment.color.clone(), street: rig.garment.color.clone() },
    limb: { room: rig.materials[1].color.clone(), street: rig.materials[1].color.clone() },
    blend: { u: 0, target: 0 },
    applied: -1,
    lightShare: { value: 0 }
  };
}

/** Visar gästtypens grupp på riggen (eller ingen), och sätter kroppens och lemmarnas färg (rummets och gatans, ORDER 302c). */
export function showGroup(rig: FigureRig, dressed: DressedRig, t: GuestType | null, variant: number, fallbackBody: string): GuestGroupId | null {
  const look = t ? lookForGuestType(t, variant) : null;
  const street = t ? lookForGuestType(t, variant, 'street') : null;
  const group = look?.group ?? null;
  if (group !== dressed.group) {
    for (const g of GROUP_IDS) for (const o of dressed.signs[g]) o.visible = g === group;
    dressed.group = group;
  }
  // Gäster utan typ (äldre fixturer) har samma dova plagg på gatan som i rummet.
  dressed.body.room.set(look ? look.body : fallbackBody);
  dressed.body.street.set(street ? street.body : fallbackBody);
  dressed.limb.room.set(look ? look.limb : dressed.limbDefault);
  dressed.limb.street.set(street ? street.limb : dressed.limbDefault);
  dressed.applied = -1;
  applyStreetBlend(rig, dressed, streetShare(dressed.blend));
  return group;
}

/** Sätter gatans andel k (0 rummet, 1 gatan) på kroppen, lemmarna och den synliga gruppens tecken. */
export function applyStreetBlend(rig: FigureRig, dressed: DressedRig, k: number): void {
  if (k === dressed.applied) return;
  dressed.applied = k;
  dressed.lightShare.value = k;
  rig.garment.color.copy(dressed.body.room).lerp(dressed.body.street, k);
  rig.materials[1].color.copy(dressed.limb.room).lerp(dressed.limb.street, k);
  for (const g of GROUP_IDS) {
    // De dolda gruppernas tecken står i rummets färg tills de visas.
    const kk = g === dressed.group ? k : 0;
    for (const c of dressed.signColours[g]) c.mat.color.copy(c.room).lerp(c.street, kk);
  }
}

// ---------- Bytet vid dörren (ORDER 302c, D5 tillägg 2026-10-06 §4) ----------

/** u: bytets linjära del (0 rummet, 1 gatan); target: dit det går. */
export interface StreetBlendState { u: number; target: 0 | 1 }

/**
 * Hur långt utanför dörrmattan en punkt står, i meter längs riktningen från
 * mattan mot gatan (rummets ram): positivt på trottoaren, negativt inne.
 */
export function beyondDoorMat(x: number, z: number, mat: readonly [number, number], outward: readonly [number, number]): number {
  const l = Math.hypot(outward[0], outward[1]) || 1;
  return ((x - mat[0]) * outward[0] + (z - mat[1]) * outward[1]) / l;
}

/** Marginalen kring mattan där bytet inte vänder (de främsta i kön står på mattan). */
export const DOOR_MAT_MARGIN_M = 0.1;

/**
 * Ett steg i bytet: målet sätts efter vilken sida om mattan figuren står
 * (inom marginalen står det kvar), och u går mot målet på STREET_BLEND.blendS
 * sekunder. snap sätter u på målet direkt (en ny gäst i figuren). Ger gatans
 * andel efter inOutSine.
 */
export function stepStreetBlend(s: StreetBlendState, beyond: number, dt: number, snap = false): number {
  if (beyond > DOOR_MAT_MARGIN_M) s.target = 1;
  else if (beyond < -DOOR_MAT_MARGIN_M) s.target = 0;
  if (snap) s.u = s.target;
  else {
    const step = Math.max(0, dt) / STREET_BLEND.blendS;
    s.u = s.target > s.u ? Math.min(s.target, s.u + step) : Math.max(s.target, s.u - step);
  }
  return streetShare(s);
}

/** Gatans andel ur bytets linjära del, med STREET_BLEND.ease (inOutSine). */
export function streetShare(s: StreetBlendState): number {
  return (1 - Math.cos(Math.PI * s.u)) / 2;
}

export function disposeDressed(d: DressedRig): void {
  d.geometries.forEach((g) => g.dispose());
}
