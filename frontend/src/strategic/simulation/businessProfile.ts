// ORDER 102 — R1 kunskapskapital. Läser vektorn state.knowledgeCredits
// och avgör (a) vilken verksamhetsklass profilen ligger i (readProfile)
// och (b) vilket lån bankmötet kan erbjuda (resolveLoanOutcome).
//
// Rena funktioner. Ingen sim-state-läsning utanför den vektor som
// skickas in. Ingen strings.sv.ts-referens — meddelandena är inline
// test-fixturer per Vision Owner 2026-08-15 (M7b bär spelar-UI-
// författningen när scenen byggs).
//
// Geometri: fyra-sektor-läsare på sfären. Tre axelkoner (techne,
// phronesis, episteme) plus en centrumsektor för profiler utanför alla
// koner men över centrumgolvet. Val av parametrar per ORDER 093 §5:
// konvidd 45° halva vinkeln, magnitudgolv 0.10 specialister, 0.40
// centrum. Precedens vid överlapp: phronesis > techne > episteme >
// balanced > noLoan (R3 §3.6 tabell).

import type { KnowledgeCredits } from '../types';

// ORDER 093 §5 punkt 1 — Vision Owner-beslut, symmetriskt tydligaste
// punkten från konsvepet (26 % var per axel, precedens inaktiv).
const CONE_HALF_ANGLE_DEG = 45;

// ORDER 093 §3.6.5 — separata magnitudgolv för specialister och
// centrum. Under specialistgolvet händer ingenting (ingen klass läses);
// mellan specialistgolvet och centrumgolvet kan bara en axel-cone
// träffa; över centrumgolvet är bredd en egen väg.
const SPECIALIST_MAGNITUDE_FLOOR = 0.10;
const CENTRE_MAGNITUDE_FLOOR = 0.40;

// Förberäknad tröskelvärde. En axel matchar sin cone om
// (axel-värdet / magnitud) >= COS_HALF_ANGLE. Eftersom axel-värdet är
// samma som prickprodukten med axel-enhetsvektorn (t.ex. dot(v, ê_x) = v.x),
// blir cos(θ_axis) = axelvärde / ‖v‖. cos(45°) = √2/2 ≈ 0.7071.
const COS_HALF_ANGLE = Math.cos((CONE_HALF_ANGLE_DEG * Math.PI) / 180);

export type KnowledgeClass =
  | 'restaurant'      // phronesis dominant
  | 'foodtruck'       // techne dominant
  | 'nearEpisteme'    // episteme dominant → loanTier 'none' (Vision Owner 2026-08-15)
  | 'balanced'        // bredd — utanför alla axelkoner, över centrumgolv;
                      // player-visible namn för fjärde klassen beslutas i R4 §3.7 p2
  | 'noLoan';         // under magnitudgolv eller mellan golven utan cone-match

export type LoanTier =
  | 'none'
  | 'foodtruck'
  | 'restaurant-small'
  | 'restaurant-full';

export interface LoanOutcome {
  klass: KnowledgeClass;
  loanTier: LoanTier;
  message: string;   // test-fixtur — M7b bär spelar-UI-författningen
}

// Magnitud av kunskapsvektorn. Ren Euclidean norm i tre axlar.
function magnitude(c: KnowledgeCredits): number {
  return Math.sqrt(c.episteme * c.episteme + c.techne * c.techne + c.phronesis * c.phronesis);
}

// ORDER 102 §2.3 — läs profilens klass ur vektorn. Precedens vid
// överlappande koner: phronesis > techne > episteme > balanced > noLoan.
export function readProfile(credits: KnowledgeCredits): KnowledgeClass {
  const mag = magnitude(credits);
  if (mag < SPECIALIST_MAGNITUDE_FLOOR) return 'noLoan';

  // cos(θ_axis) = axelvärde / magnitud (se COS_HALF_ANGLE-kommentaren).
  const cosEpisteme = credits.episteme / mag;
  const cosTechne = credits.techne / mag;
  const cosPhronesis = credits.phronesis / mag;

  // Precedens: phronesis > techne > episteme. En profil "i mitten" mellan
  // två koner tilldelas den tyngre klassen — restaurang är rikare än
  // food-truck, food-truck rikare än near-episteme.
  if (cosPhronesis >= COS_HALF_ANGLE) return 'restaurant';
  if (cosTechne >= COS_HALF_ANGLE) return 'foodtruck';
  if (cosEpisteme >= COS_HALF_ANGLE) return 'nearEpisteme';

  // Utanför alla axelkoner — bredd. Kräver centrumgolvet för att räknas
  // som "bred profil"; annars är profilen för svag för någon klass.
  if (mag >= CENTRE_MAGNITUDE_FLOOR) return 'balanced';
  return 'noLoan';
}

// ORDER 102 §2.4 — avgör bankmötets erbjudande. Klass → loanTier +
// diagnostisk röst. Meddelanden är inline test-fixturer per Vision
// Owner 2026-08-15; slutlig författning för spelar-UI görs i M7b.
export function resolveLoanOutcome(credits: KnowledgeCredits): LoanOutcome {
  const klass = readProfile(credits);
  switch (klass) {
    case 'restaurant':
      return {
        klass,
        loanTier: 'restaurant-full',
        message: 'Du har omdömet för matsalen. Vi ger dig fulla medel.'
      };
    case 'foodtruck':
      return {
        klass,
        loanTier: 'foodtruck',
        message: 'Du har händerna. Börja mindre, växla upp.'
      };
    case 'nearEpisteme':
      // Vision Owner 2026-08-15: avsiktligt utan lån. ~26 % av kuben
      // vid ORDER 093:s konvidder. Ändras om R4 §3.7 p3 senare beslutar
      // egen klass eller sammanslagning.
      return {
        klass,
        loanTier: 'none',
        message: 'Du vet men har inte gjort. Vi kan inte finansiera.'
      };
    case 'balanced':
      // Placeholder-tier tills R4 §3.7 p2 namnger fjärde klassen och
      // beslutar mekaniken. `'restaurant-small'` är rimlig placeholder;
      // R4-ordern uppdaterar när den landar.
      return {
        klass,
        loanTier: 'restaurant-small',
        message: 'Ett brett kunnande. Vi ger dig en start.'
      };
    case 'noLoan':
      return {
        klass,
        loanTier: 'none',
        message: 'Vi ser inget bärande kunnande. Kom tillbaka när du kan mer.'
      };
  }
}
