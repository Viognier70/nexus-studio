// ORDER 302b (Anders 2026-10-05) — gatans folk i Designs D5-grupper.
//
// Figurerna på gatan (VillageLife.tsx) är instansade kroppar, inte riggar.
// De får här D5:s fem gästgrupper (scene/guestGroups.ts GUEST_GROUPS:
// studenter, bybor, turister, gourmeter och affärsfolk) med samma färger
// (lookOf: kroppen och lemmarna) och samma tecken (ryggsäcken, kepsen,
// solhatten, sjalen och den vita skjortan), byggda som egna geometrier i
// figurens ram så att varje tecken är en InstancedMesh (ett ritanrop per
// tecken, inget skapas i renderloopen).
//
// Gatans sorter till grupperna:
//   - student → studenter; bussens turister → turister;
//   - middle → bybor; till vår krog blir en del turister som vid dörren
//     (balance.ts CONCEPT.touristOfMiddle för kvällens koncept);
//   - high → gourmeter eller affärsfolk, deterministiskt ur sällskapets
//     nyckel: till vår krog med kvällens koncepts andel
//     (CONCEPT.gourmetOfHigh), till de andra krogarna med bistrons andel;
//   - social och billionaire som i scene/guestLooks.ts (bybor, affärsfolk;
//     miljardären i guld).
//
// Tecknens mått: D5:s mått, förstorade så att de läses på gatans nivå (42 m,
// LEVELS.street i village/villageEvening.ts) där figurerna redan ritas i
// nivåns förstoring (figureScale). Hatten och sjalen är störst, så att de
// syns först (D5 LEVERANSNOT §6: "På 14 m syns hatten och sjalen först och
// kepsen och skjortan sedan"). Måtten i pixlar räknas i testet
// (sim/__tests__/order302bGatansGrupper.test.ts → reports/order302b/signs.json).

import * as THREE from 'three';
import { CONCEPT } from '../../../sim/balance';
import type { Tier } from '../../../sim/goods';
import { GUEST_GROUPS, lookOf, type GuestGroupId } from '../guestGroups';
import { BILLIONAIRE_GOLD, groupOfGuestType } from '../guestLooks';
import { DEFAULT_SKIN } from '../figureRig';
import { hashKey } from '../../util/hash';
import type { GuestType } from '../../types';

/** Gatans sorter (VillageLife.tsx WalkerKind); rusningens bilar kan bära vilken gästtyp som helst. */
export type StreetKind = GuestType;

/** Gourmeternas andel av de betalningsstarka hos krogarna utan koncept (bistrons blandning). */
export const RIVAL_GOURMET_SHARE = CONCEPT.gourmetOfHigh.bistro;

/**
 * Gruppen för ett sällskap på gatan. Samma nyckel ger samma grupp (fröet och
 * sällskapets nyckel, util/hash.ts hashKey); hela sällskapet har samma grupp.
 */
export function streetGroupOf(kind: StreetKind, key: string, seed: number, toPlayer: boolean, concept: Tier | null): GuestGroupId {
  switch (kind) {
    case 'student': return 'student';
    case 'tourist': return 'tourist';
    case 'social': return groupOfGuestType('social');
    case 'billionaire': return groupOfGuestType('billionaire');
    case 'middle': {
      const share = toPlayer && concept ? CONCEPT.touristOfMiddle[concept] : 0;
      return share > 0 && hashKey(seed, `${key}|street`) < share ? 'tourist' : groupOfGuestType('middle');
    }
    case 'high': {
      const share = toPlayer && concept ? CONCEPT.gourmetOfHigh[concept] : RIVAL_GOURMET_SHARE;
      return hashKey(seed, `${key}|street`) < share ? 'gourmet' : 'business';
    }
    default:
      // Gourmeter och affärsfolk (rusningens typer) som i guestLooks.ts.
      return groupOfGuestType(kind) ?? 'villager';
  }
}

/** Figurens färger på gatan: D5:s kropp och lemmar (lookOf), tecknets färg (accent); miljardären i guld. */
export function streetLookOf(kind: StreetKind, group: GuestGroupId, variant: number): { body: string; limb: string; accent: string } {
  const l = lookOf(group, variant);
  return { body: kind === 'billionaire' ? BILLIONAIRE_GOLD : l.body, limb: l.limb, accent: GUEST_GROUPS[group].looks[variant % 2].accent };
}

// ----- Figuren på gatan -----
// Höjden som förut (1,57 m utan förstoring): huvudet r 0,15 vid 1,42 m.
export const STREET_FIGURE = {
  headY: 1.42,
  headR: 0.15,
  /** Överkroppen i kroppens färg, benen i lemmarnas. */
  torso: { r0: 0.2, r1: 0.24, y0: 0.53, y1: 1.19 },
  legs: { r0: 0.19, r1: 0.21, y0: 0.04, y1: 0.55 }
} as const;

// Hyn som riggarnas (figureRig.ts DEFAULT_SKIN).
export const STREET_SKIN = DEFAULT_SKIN;

function cyl(rTop: number, rBottom: number, y0: number, y1: number, seg = 8): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBottom, y1 - y0, seg);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

/** Slår ihop geometrier till en icke-indexerad med position (MeshBasicMaterial behöver inga normaler). */
export function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const arrays = parts.map((p) => (p.index ? p.toNonIndexed() : p).attributes.position.array as Float32Array);
  const pos = new Float32Array(arrays.reduce((a, x) => a + x.length, 0));
  let o = 0;
  for (const a of arrays) { pos.set(a, o); o += a.length; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.computeBoundingBox();
  parts.forEach((p) => p.dispose());
  return g;
}

export function streetTorsoGeometry(): THREE.BufferGeometry {
  const t = STREET_FIGURE.torso;
  return mergeGeometries([cyl(t.r0, t.r1, t.y0, t.y1)]);
}
export function streetLegsGeometry(): THREE.BufferGeometry {
  const l = STREET_FIGURE.legs;
  return mergeGeometries([cyl(l.r0, l.r1, l.y0, l.y1)]);
}
export function streetHeadGeometry(): THREE.BufferGeometry {
  const h = new THREE.SphereGeometry(STREET_FIGURE.headR, 10, 8);
  h.translate(0, STREET_FIGURE.headY, 0);
  return mergeGeometries([h]);
}

/** Figurens ram för tecknen: huvudet, halsen och bröstets och ryggens yta (meter, fötterna vid 0, +z framåt). */
export interface SignFrame { headY: number; headR: number; neckY: number; frontZ: number; backZ: number }

/** Gatans figur (STREET_FIGURE). */
export const STREET_FRAME: SignFrame = {
  headY: STREET_FIGURE.headY,
  headR: STREET_FIGURE.headR,
  neckY: STREET_FIGURE.torso.y1,
  frontZ: STREET_FIGURE.torso.r0 + 0.02,
  backZ: STREET_FIGURE.torso.r1
};

/** Tecknets geometri i figurens ram (+z framåt, y uppåt, fötterna vid 0). */
export function streetSignGeometry(group: GuestGroupId, F: SignFrame = STREET_FRAME): THREE.BufferGeometry {
  const top = F.headY + F.headR; // hjässan
  const neck = F.neckY;
  const parts: THREE.BufferGeometry[] = [];
  switch (GUEST_GROUPS[group].sign) {
    case 'backpack': {
      // Ryggsäcken (D5 0,30 × 0,38 × 0,14 m) på ryggen. Luvan är i kroppens
      // färg i D5 och syns inte mot den på gatan; den ritas inte här.
      const b = new THREE.BoxGeometry(0.36, 0.44, 0.2);
      b.translate(0, neck - 0.27, -(F.backZ + 0.1));
      parts.push(b);
      break;
    }
    case 'cap': {
      // Kepsen: platt kulle (D5 0,24 m) över hjässan och skärmen fram.
      const c = new THREE.CylinderGeometry(F.headR + 0.01, F.headR + 0.015, 0.06, 14);
      c.translate(0, top - 0.02, -0.005);
      const peak = new THREE.BoxGeometry(0.22, 0.02, 0.12);
      peak.translate(0, top - 0.04, F.headR + 0.01);
      parts.push(c, peak);
      break;
    }
    case 'sunhat': {
      // Solhatten: brättet (D5 0,46 m) och kullen, ljus.
      const brim = new THREE.CylinderGeometry(F.headR + 0.16, F.headR + 0.16, 0.02, 20);
      brim.translate(0, top - 0.06, 0);
      const crown = new THREE.CylinderGeometry(F.headR - 0.02, F.headR, 0.13, 14);
      crown.translate(0, top, 0);
      parts.push(brim, crown);
      break;
    }
    case 'scarf': {
      // Sjalen: tjock runt halsen och en ände ned över bröstet, i mässing eller bärnsten.
      const s = new THREE.TorusGeometry(0.17, 0.075, 6, 14);
      s.rotateX(Math.PI / 2);
      s.translate(0, neck + 0.02, 0);
      const end = new THREE.BoxGeometry(0.12, 0.4, 0.05);
      end.translate(0.08, neck - 0.2, F.frontZ + 0.03);
      parts.push(s, end);
      break;
    }
    case 'shirt': {
      // Den vita skjortan i kavajens V och kragen runt halsen (syns uppifrån).
      const v = new THREE.CylinderGeometry(0.15, 0.0, 0.42, 3);
      v.rotateY(Math.PI);
      v.scale(1, 1, 0.15);
      v.translate(0, neck - 0.2, F.frontZ);
      const col = new THREE.TorusGeometry(0.12, 0.04, 6, 14);
      col.rotateX(Math.PI / 2);
      col.translate(0, neck + 0.01, 0);
      parts.push(v, col);
      break;
    }
  }
  return mergeGeometries(parts);
}
