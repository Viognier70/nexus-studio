// ORDER 125 §6 DoD 9 — silhuettbandet hålls mot ölkrogens golv.
//
// Brewpub-rummet har tre golvzoner (per Design-leverans):
//   floorDining  #a49b8a — matsalens golv (närmast restaurangens ton)
//   floorBrew    #7d776c — bryggeriets zon, medvetet mörkare
//   floorKitchen #948f84 — kökets zon, mellanton
//
// Kontrastkontrakt (silhouetteContrast.ts §5): figurer måste ligga i
// bandet [MIN_FLOOR_CONTRAST_RATIO, MAX_FLOOR_CONTRAST_RATIO] mot
// golvet de står på. Nya golvzoner får inte bryta bandet mot de
// palett-tester som ORDER 123 kalibrerade.

import { describe, expect, it } from 'vitest';
import { ROLE_COLOUR } from '../InteriorStaff';
import { GUEST_COLOUR } from '../InteriorGuests';
import type { StaffRole, GuestState } from '../../types';
import {
  MIN_FLOOR_CONTRAST_RATIO,
  MAX_FLOOR_CONTRAST_RATIO,
  contrastRatio
} from '../silhouetteContrast';

// Golvzoner från handoff/brewpubRoom.ts COLOR-tabellen (rad 296-298).
// Om Design levererar en ny palett ska denna tabell följa med och
// testen räknas om.
const BREWPUB_FLOORS = {
  floorDining: '#a49b8a',
  floorBrew: '#7d776c',
  floorKitchen: '#948f84'
};

const ROLES: StaffRole[] = ['värd', 'servitör', 'kock', 'lärling'];
const SEATED_STATES: GuestState[] = ['seated', 'ordering', 'dining', 'paying'];

// ORDER 125 §7 fynd — två kombinationer bryter bandet mot brewpub-golvet.
// Redovisade som kända avvikelser (inte tuning-fix per §7 "stanna").
// Följdorder krävs för att avgöra fixet (justera brewpub-golvton, ändra
// dessa specifika palett-nycklar, eller acceptera zon-specifik läsning).
const KNOWN_CONTRAST_GAPS: Array<{ colour: string; floor: string; measured: number; note: string }> = [
  {
    colour: '#e8c99e',   // GUEST_COLOUR.paying
    floor: '#a49b8a',    // floorDining
    measured: 1.74,
    note: '§7 fynd — paying-tillståndet är den mörkaste av gästpaletten och landar 0.06 under MIN mot floorDining (som är något ljusare än silhouetteContrast:s referens-#a89577).'
  },
  {
    colour: '#6b6260',   // ROLE_COLOUR.servitör
    floor: '#7d776c',    // floorBrew
    measured: 1.33,
    note: '§7 fynd — servitörens warm-neutral kollapsar mot bryggeriets warm-mid-tone. Kroppen "blir en skugga" precis som SD-004 §3.3-preciseringen varnar för, men i motsatt riktning: för LITE kontrast här, inte för mycket.'
  }
];

function isKnownGap(colour: string, floor: string): typeof KNOWN_CONTRAST_GAPS[number] | undefined {
  return KNOWN_CONTRAST_GAPS.find((g) => g.colour === colour && g.floor === floor);
}

describe('ORDER 125 DoD 9 — palett håller bandet mot alla tre golvzoner', () => {
  for (const [zoneName, floorHex] of Object.entries(BREWPUB_FLOORS)) {
    describe(`Golvzon ${zoneName} (${floorHex})`, () => {
      for (const role of ROLES) {
        it(`uniform ${role} (${ROLE_COLOUR[role]}) mot ${zoneName}`, () => {
          const c = contrastRatio(ROLE_COLOUR[role], floorHex);
          const gap = isKnownGap(ROLE_COLOUR[role], floorHex);
          if (gap) {
            // Kända fynd: verifiera att uppmätt värde stämmer med rapporten,
            // så en oavsiktlig palett-tuning inte gömmer fyndet.
            expect(c, `känd avvikelse: ${gap.note}`).toBeCloseTo(gap.measured, 1);
            return;
          }
          expect(c, `${role} vs ${zoneName} kontrast=${c.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_FLOOR_CONTRAST_RATIO);
          expect(c, `${role} vs ${zoneName} kontrast=${c.toFixed(2)}`).toBeLessThanOrEqual(MAX_FLOOR_CONTRAST_RATIO);
        });
      }
      for (const state of SEATED_STATES) {
        it(`gästtillstånd ${state} (${GUEST_COLOUR[state]}) mot ${zoneName}`, () => {
          const c = contrastRatio(GUEST_COLOUR[state], floorHex);
          const gap = isKnownGap(GUEST_COLOUR[state], floorHex);
          if (gap) {
            expect(c, `känd avvikelse: ${gap.note}`).toBeCloseTo(gap.measured, 1);
            return;
          }
          expect(c, `${state} vs ${zoneName} kontrast=${c.toFixed(2)}`).toBeGreaterThanOrEqual(MIN_FLOOR_CONTRAST_RATIO);
          expect(c, `${state} vs ${zoneName} kontrast=${c.toFixed(2)}`).toBeLessThanOrEqual(MAX_FLOOR_CONTRAST_RATIO);
        });
      }
    });
  }
});

describe('ORDER 125 DoD 9 — kända kontrast-avvikelser dokumenterade', () => {
  it('två kända fynd, exakt värde per rapport', () => {
    // Om fler avvikelser dyker upp: uppdatera KNOWN_CONTRAST_GAPS + §11.
    expect(KNOWN_CONTRAST_GAPS.length).toBe(2);
    for (const gap of KNOWN_CONTRAST_GAPS) {
      const c = contrastRatio(gap.colour, gap.floor);
      expect(c).toBeCloseTo(gap.measured, 1);
      // Alla kända fynd är UNDER bandet (för lite kontrast).
      expect(c).toBeLessThan(MIN_FLOOR_CONTRAST_RATIO);
    }
  });
});
