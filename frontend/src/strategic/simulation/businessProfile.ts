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

import type { KnowledgeCredits, KnowledgeTracks } from '../types';

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
  | 'kvarterskrogen'      // phronesis dominant
  | 'foodtrucken'       // techne dominant
  | 'nearEpisteme'    // episteme dominant → loanTier 'none' (Vision Owner 2026-08-15)
  | 'balanced'        // bredd — utanför alla axelkoner, över centrumgolv;
                      // player-visible namn för fjärde klassen beslutas i R4 §3.7 p2
  | 'noLoan';         // under magnitudgolv eller mellan golven utan cone-match

export type LoanTier =
  | 'none'
  | 'foodtrucken'
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
  if (cosPhronesis >= COS_HALF_ANGLE) return 'kvarterskrogen';
  if (cosTechne >= COS_HALF_ANGLE) return 'foodtrucken';
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
    case 'kvarterskrogen':
      return {
        klass,
        loanTier: 'restaurant-full',
        message: 'Du har omdömet för matsalen. Vi ger dig fulla medel.'
      };
    case 'foodtrucken':
      return {
        klass,
        loanTier: 'foodtrucken',
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

// ORDER 105 — spårläsare. Aggregerar spårnedbrytningen över alla tre
// axlar och avgör vilket yrkesspår dominerar. Ren funktion, samma form
// som `readProfile`. Används av R4 för att skilja verksamheter med
// identisk axelprofil (t.ex. vinbar vs restaurang) — inte av
// `resolveLoanOutcome` som fortsätter läsa axel-profilen ensam.
//
// `noLoan` här har annan betydelse än i `readProfile`: här = "spelaren
// har inte satsat något yrkesspår alls, alla krediter är spårlösa";
// spelare kan alltså ha en dominant axel (t.ex. techne) via
// Gastronomiska Teatern (som ger båda spåren) och ändå få 'both' eller
// 'neither' från readSpar. Klasserna:
//
//   'kok'         — kok dominerar
//   'sommellerie' — sommellerie dominerar
//   'both'        — jämn fördelning mellan de två spåren över golv
//   'neither'     — spårat totalt under golv (spelaren har bara
//                   ackumulerat spårlöst via Bibliotek + Kalastorget,
//                   eller inte alls)

export type SparClass = 'kok' | 'sommellerie' | 'both' | 'neither';

// Trösklar för spårläsningen. Speglar `SPECIALIST_MAGNITUDE_FLOOR`
// i sin storlek — 0.10 är samma "under detta är signalen brus"-nivå
// som axel-läsningen använder.
const TRACK_MAGNITUDE_FLOOR = 0.10;

// En sida "dominerar" när den är minst DOUBLE gånger den andra.
// Motiv: symmetriskt (om båda är ~lika, ingen dominerar), och tydlig
// tröskel — en spelare som övat 2/3 i ett spår och 1/3 i det andra
// klassificeras entydigt.
const DOMINANCE_RATIO = 2;

// Summera respektive spår över alla tre axlar. Aggregeringen är
// summering (inte sfärgeometri) — spår är inte ortogonala dimensioner,
// bara märkningar av samma krediter.
function aggregateTracks(tracks: KnowledgeTracks): {
  sommellerie: number;
  kok: number;
} {
  return {
    sommellerie:
      tracks.episteme.sommellerie +
      tracks.techne.sommellerie +
      tracks.phronesis.sommellerie,
    kok:
      tracks.episteme.kok +
      tracks.techne.kok +
      tracks.phronesis.kok
  };
}

export function readSpar(tracks: KnowledgeTracks): SparClass {
  const agg = aggregateTracks(tracks);
  const total = agg.sommellerie + agg.kok;
  if (total < TRACK_MAGNITUDE_FLOOR) return 'neither';
  if (agg.sommellerie >= DOMINANCE_RATIO * agg.kok) return 'sommellerie';
  if (agg.kok >= DOMINANCE_RATIO * agg.sommellerie) return 'kok';
  return 'both';
}
