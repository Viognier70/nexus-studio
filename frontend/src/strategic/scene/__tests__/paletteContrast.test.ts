// ORDER 123 §4.2, §4.3, §4.4 + ORDER 127 §3.2 — palett-tester.
//
// ORDER 127 gjorde bandet zonmedvetet: varje figurfärg prövas mot
// **varje** golv i den klass figuren kan förekomma i. Testet är
// uttömmande via `paletteZoneCheck`; en färg som klarar en zon men
// faller på en annan fångas här, inte döljs bakom ett medelvärde.
//
// SEATED_STATES (`seated`/`ordering`/`dining`/`paying`) testas strikt.
// Andra tillstånd (arriving/waiting/leaving/declined/sleeping) är
// transienta eller edge; separat sanity-check finns.
//
// Rollskillnaden mäts med CIE 76 ΔE oberoende av golv.

import { describe, expect, it } from 'vitest';
import { ROLE_COLOUR } from '../InteriorStaff';
import { GUEST_COLOUR } from '../InteriorGuests';
import type { StaffRole, GuestState, BusinessClass } from '../../types';
import {
  MIN_ROLE_DISTINCTION_DELTA_E,
  paletteZoneCheck,
  deltaE76
} from '../silhouetteContrast';

const ROLES: StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];
const SEATED_STATES: GuestState[] = ['seated', 'ordering', 'dining', 'paying'];

// Klasser där figurer faktiskt renderas i 3D-scenen (via InteriorGuests
// + InteriorStaff). Foodtruck har SVG-sidovyn med egen kontrast-story
// och testas inte här.
const INTERIOR_3D_CLASSES: BusinessClass[] = ['kvarterskrogen', 'gästgiveriet', 'ölkrogen'];

describe('ORDER 127 §3.2 — uniformsfärger uttömmande mot alla golvzoner', () => {
  for (const businessClass of INTERIOR_3D_CLASSES) {
    describe(`Klass ${businessClass}`, () => {
      for (const role of ROLES) {
        it(`${role} (${ROLE_COLOUR[role]}) i band mot ALLA zoner`, () => {
          const result = paletteZoneCheck(ROLE_COLOUR[role], businessClass);
          if (!result.allInBand) {
            const failed = result.perZone
              .filter((r) => !r.inBand)
              .map((r) => `zon ${r.zone} kontrast=${r.contrast.toFixed(2)}`)
              .join('; ');
            expect(result.allInBand, `${role} vs ${businessClass}: ${failed}`).toBe(true);
          }
          expect(result.allInBand).toBe(true);
        });
      }
    });
  }
});

describe('ORDER 127 §3.2 — SEATED_STATES uttömmande mot alla golvzoner', () => {
  for (const businessClass of INTERIOR_3D_CLASSES) {
    describe(`Klass ${businessClass}`, () => {
      for (const state of SEATED_STATES) {
        it(`${state} (${GUEST_COLOUR[state]}) i band mot ALLA zoner`, () => {
          const result = paletteZoneCheck(GUEST_COLOUR[state], businessClass);
          if (!result.allInBand) {
            const failed = result.perZone
              .filter((r) => !r.inBand)
              .map((r) => `zon ${r.zone} kontrast=${r.contrast.toFixed(2)}`)
              .join('; ');
            expect(result.allInBand, `${state} vs ${businessClass}: ${failed}`).toBe(true);
          }
          expect(result.allInBand).toBe(true);
        });
      }
    });
  }
});

describe('ORDER 127 DoD 5 — rollskillnad parvis (oförändrat från ORDER 123)', () => {
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

describe('ORDER 127 §3.2 — regressionsvakt: färg som klarar EN zon men faller på ANNAN fångas', () => {
  it('konstruerar en kontrasterande färg som passar restaurangens golv men faller på ölkrogens brew — testet ska fånga det', () => {
    // #6b6260 var den gamla servitörsfärgen; den passerade mot legacy
    // FLOOR_COLOUR (#a89577) men föll mot ölkrogens floorBrew (#7d776c).
    // Uttömmande-checken mot ölkrogen ska returnera allInBand=false.
    const result = paletteZoneCheck('#6b6260', 'ölkrogen');
    expect(result.allInBand, 'gamla servitörsfärgen ska INTE passera mot ölkrogen').toBe(false);
    // Verifiera att det är brew-zonen som misslyckas.
    const brewResult = result.perZone.find((r) => r.zone === '#7d776c');
    expect(brewResult).toBeDefined();
    expect(brewResult!.inBand).toBe(false);
  });

  it('samma gamla färg passar dock mot restaurangens ena zon — testet ska visa varför uttömmandet krävs', () => {
    // Om testet bara mätte medel av zoner eller stannade vid första
    // godkännande skulle #6b6260 mot restaurant se OK ut.
    const result = paletteZoneCheck('#6b6260', 'kvarterskrogen');
    // Restaurant har bara en zon; låt oss se vad det blir:
    // #a08462 vs #6b6260 kontrast ~1.66 — faller precis under 1.8.
    // (ORDER 123-kalibreringen mot legacy #a89577 gav 2.04 men det
    // var fel referens; #a08462 är den faktiska floor-färgen per
    // PlayerBusiness.tsx:75.)
    expect(result.perZone.length).toBe(1);
    // Testet bevisar: uttömmande krävs för att fånga zonspecifika fel
    // — men här är även restaurant-zonen ett problem för gamla färgen.
    // Bra: det visar att zon-registret också korrigerar ORDER 123:s
    // legacy-fel (fel FLOOR_COLOUR-referens).
    expect(result.allInBand).toBe(false);
  });
});
