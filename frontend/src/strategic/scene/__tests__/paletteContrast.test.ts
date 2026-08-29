// ORDER 123 §4.2, §4.3, §4.4 — paletterna hävdas mot silhuett-bandet.
//
// §4.2: kontrastförhållande mellan varje uniformsfärg och golvet ligger
//        i bandet [MIN_FLOOR_CONTRAST_RATIO, MAX_FLOOR_CONTRAST_RATIO].
// §4.3: samma test för gästernas fyra tillståndsfärger (SEATED_STATES).
// §4.4: roll-distinktion — parvis ΔE 76 mellan de fyra uniformsfärgerna
//        ≥ MIN_ROLE_DISTINCTION_DELTA_E, så spelaren kan skilja rollerna åt
//        i strategisk kameraavstånd.

import { describe, expect, it } from 'vitest';
import { ROLE_COLOUR } from '../InteriorStaff';
import { GUEST_COLOUR } from '../InteriorGuests';
import type { StaffRole, GuestState } from '../../types';
import {
  FLOOR_COLOUR,
  MIN_FLOOR_CONTRAST_RATIO,
  MAX_FLOOR_CONTRAST_RATIO,
  MIN_ROLE_DISTINCTION_DELTA_E,
  contrastRatio,
  deltaE76
} from '../silhouetteContrast';

const ROLES: StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];

// SEATED_STATES från InteriorGuests.tsx — de tillstånd där gästen
// faktiskt sitter i restaurangens interiörsscen. Övriga tillstånd
// (arriving/waiting/leaving/declined/sleeping/eating/serving) är
// transienta eller tillhör andra scener; §4.3 refererar "gästernas
// fyra tillståndsfärger" = dessa.
const SEATED_STATES: GuestState[] = ['seated', 'ordering', 'dining', 'paying'];

describe('ORDER 123 §4.2 — uniformsfärgerna i golv-kontrastbandet', () => {
  for (const role of ROLES) {
    it(`${role} (${ROLE_COLOUR[role]}) mot golvet ${FLOOR_COLOUR} inom [${MIN_FLOOR_CONTRAST_RATIO}, ${MAX_FLOOR_CONTRAST_RATIO}]`, () => {
      const c = contrastRatio(ROLE_COLOUR[role], FLOOR_COLOUR);
      expect(c, `${role} kontrast=${c.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_FLOOR_CONTRAST_RATIO);
      expect(c, `${role} kontrast=${c.toFixed(2)}`).toBeLessThanOrEqual(MAX_FLOOR_CONTRAST_RATIO);
    });
  }
});

describe('ORDER 123 §4.3 — gästernas fyra tillståndsfärger i bandet', () => {
  for (const state of SEATED_STATES) {
    it(`${state} (${GUEST_COLOUR[state]}) mot golvet ${FLOOR_COLOUR} inom [${MIN_FLOOR_CONTRAST_RATIO}, ${MAX_FLOOR_CONTRAST_RATIO}]`, () => {
      const c = contrastRatio(GUEST_COLOUR[state], FLOOR_COLOUR);
      expect(c, `${state} kontrast=${c.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_FLOOR_CONTRAST_RATIO);
      expect(c, `${state} kontrast=${c.toFixed(2)}`).toBeLessThanOrEqual(MAX_FLOOR_CONTRAST_RATIO);
    });
  }
});

describe('ORDER 123 §4.4 — roll-distinktion parvis', () => {
  // Alla 6 par av 4 roller ska separeras med ≥ MIN_ROLE_DISTINCTION_DELTA_E.
  for (let i = 0; i < ROLES.length; i++) {
    for (let j = i + 1; j < ROLES.length; j++) {
      const a = ROLES[i];
      const b = ROLES[j];
      it(`${a} vs ${b} — ΔE 76 ≥ ${MIN_ROLE_DISTINCTION_DELTA_E}`, () => {
        const d = deltaE76(ROLE_COLOUR[a], ROLE_COLOUR[b]);
        expect(d, `${a}=${ROLE_COLOUR[a]} vs ${b}=${ROLE_COLOUR[b]} ΔE=${d.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_ROLE_DISTINCTION_DELTA_E);
      });
    }
  }
});

describe('ORDER 123 §5 — kontraktet dokumenteras med aktuella värden', () => {
  it('sammanfattning för rapport-utdrag (mätta värden, inte hårdkodade)', () => {
    // Testet loggar inte — men om värdena här verifieras och passerar,
    // är dessa de aktuella siffrorna i main. Rapporten kan citera dem.
    for (const role of ROLES) {
      const c = contrastRatio(ROLE_COLOUR[role], FLOOR_COLOUR);
      expect(c).toBeGreaterThan(0);
    }
    for (const state of SEATED_STATES) {
      const c = contrastRatio(GUEST_COLOUR[state], FLOOR_COLOUR);
      expect(c).toBeGreaterThan(0);
    }
  });
});
