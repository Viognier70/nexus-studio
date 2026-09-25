// ORDER 262 (Nexus v1 etapp 0) — alla tal i spelet på ett ställe.
//
// Källa: `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md`.
// Varje grupp bär `section`, rubriken i speldesignen där talen står
// ("Rubrik > Underrubrik"). Testet `__tests__/balance.test.ts` läser
// speldesignen och hävdar att
//   1. varje `section` finns som rubrik i speldesignen,
//   2. varje tal i speldesignen finns här (eller står i testets lista
//      över tal som inte är spelvärden, med skäl),
//   3. ingen fil under `src/sim/` utom den här innehåller talvärden.
//
// Procent lagras som andelar (5 % → 0.05). Tal som speldesignen inte
// anger men som ordern kräver bär `openQuestion` med nummer i
// `documentation/architecture/NEXUS_V1_OPPNA_FRAGOR.md`. De är valda
// närmast speldesignen och går att ändra här utan annan kodändring.

import type { PavilionId } from '../strategic/knowledge/pavilions';

// Medaljnivåer i stigande ordning. Index + 1 = antal medaljsteg
// (Ekonomin > Marknaden: "brons är ett steg och platina fyra").
export const MEDAL_LEVELS = ['brons', 'silver', 'guld', 'platina'] as const;
export type MedalLevel = (typeof MEDAL_LEVELS)[number];

// ---------------------------------------------------------------------
// Tiden
// ---------------------------------------------------------------------

export const SEASON = {
  section: 'Tiden',
  weeks: 8,                    // "En säsong är åtta veckor"
  playthroughHours: 8,         // "En genomspelning tar omkring åtta timmar"
  realHoursPerWeek: 1          // "en timme per spelvecka"
} as const;

export const DAY = {
  section: 'Tiden',
  // Tid i verkligheten per fas, i minuter [min, max].
  realMinutes: {
    morning: [2, 3],
    service: [4, 5],
    evening: [1, 2]
  },
  scheduleSlots: 2,            // Morgon: "Fyller två platser i dagens schema"
  sundayScheduleSlots: 4       // "fyra schemaplatser i stället för två"
} as const;

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEK = {
  section: 'Tiden',
  daysPerWeek: 7,              // mermaid: "Veckan 7 dagar"
  serviceDays: 6,              // "sex servicedagar och en söndag"
  closedDay: 'sun' as Weekday,
  // Gästfaktor per veckodag. Speldesignen: "Måndag är lugn, fredag och
  // lördag är tunga. Söndagen är stängd." Talen är valda.
  openQuestion: 'F1',
  guestFactor: {
    mon: 0.7,
    tue: 0.8,
    wed: 0.9,
    thu: 1.0,
    fri: 1.3,
    sat: 1.4,
    sun: 0
  } as Record<Weekday, number>
} as const;

export type HolidayId = 'midsommar' | 'grythyttedagarna' | 'vinprovning' | 'kraftskiva';

export interface Holiday {
  id: HolidayId;
  week: number;
  // Veckodagar högtiden gäller. Speldesignen anger vecka, inte dag.
  days: readonly Weekday[];
  guestFactor: number;
  // Förskjutning av efterfrågan: 'lunchAndDrink', 'tourists', 'wine',
  // 'finale'. Läses av marknaden i etapp 3.
  demand: 'lunchAndDrink' | 'tourists' | 'wine' | 'finale';
  // Speldesignen: veckorna 3 och 5 "är förslag som kan bytas mot
  // riktiga evenemang".
  fixed: boolean;
}

export const HOLIDAYS = {
  section: 'Tiden',
  openQuestion: 'F2',
  list: [
    { id: 'midsommar', week: 1, days: ['fri', 'sat'], guestFactor: 1.5, demand: 'lunchAndDrink', fixed: true },
    { id: 'grythyttedagarna', week: 3, days: ['fri', 'sat'], guestFactor: 1.6, demand: 'tourists', fixed: false },
    { id: 'vinprovning', week: 5, days: ['thu', 'fri', 'sat'], guestFactor: 1.2, demand: 'wine', fixed: false },
    { id: 'kraftskiva', week: 8, days: ['sat'], guestFactor: 1.8, demand: 'finale', fixed: true }
  ] as readonly Holiday[]
} as const;

// ---------------------------------------------------------------------
// Kunskapen
// ---------------------------------------------------------------------

export const PAVILIONS = {
  section: 'Kunskapen > Paviljongerna',
  // Teatern öppnas "när spelaren har silver i två paviljonger".
  theatreUnlock: { level: 'silver' as MedalLevel, pavilions: 2 },
  // Teaterns frågor "kombinerar två områden".
  theatreAreasPerQuestion: 2
} as const;

export const PRACTICE = {
  section: 'Kunskapen > Öva och pröva',
  questions: 5,                // "Fem frågor med förklaring efter varje svar"
  scheduleSlotsPerVisit: 1      // "Ett besök i en paviljong kostar en schemaplats"
} as const;

export const EXAM = {
  section: 'Kunskapen > Öva och pröva',
  questionsDrawn: 8,           // "Åtta frågor dras ur nivåns tio"
  questionsPerLevel: 10,
  correctToPass: 6             // "Sex rätt ger medaljen"
} as const;

// Frågebanken: "fyra alternativ".
export const OPTIONS_PER_QUESTION = 4;
export const QUESTION_BANK = {
  section: 'Kunskapen > Frågebanken',
  optionsPerQuestion: OPTIONS_PER_QUESTION,
  bronzePlaceholderQuestions: 40   // "bronsbankens 40 frågor"
} as const;

export const MEDALS = {
  section: 'Kunskapen > Medaljerna',
  levels: MEDAL_LEVELS          // brons, silver, guld, platina
} as const;

export const POST_SERVICE_QUIZ = {
  section: 'Kunskapen > Quizen efter servicen',
  questions: 3,                // "tre frågor från kvällens svagaste axel"
  creditOnCorrect: 1,
  creditOnWrong: -1,
  creditOnSkip: 0
} as const;

// ---------------------------------------------------------------------
// Ekonomin
// ---------------------------------------------------------------------

export const FLOOR = {
  section: 'Ekonomin > Golvet',
  // Värde per medaljnivå: "ingen 0, brons 15, silver 30, guld 55, platina 90".
  medalValue: { none: 0, brons: 15, silver: 30, guld: 55, platina: 90 } as Record<MedalLevel | 'none', number>,
  // G = 0,6 × huvudpaviljongens värde + 0,4 × snittet av övriga
  mainPavilionWeight: 0.6,
  otherPavilionsWeight: 0.4,
  // "G kan aldrig bli högre än 90." Procent av klassens normala veckointäkt.
  maxPercent: 90
} as const;

export const LOAN = {
  section: 'Ekonomin > Lånet',
  amortisationWeeks: 8,        // "amorteras lika under säsongens åtta veckor"
  // "med fem procents ränta". Tolkning: 5 % av lånebeloppet över
  // säsongen, fördelat lika per vecka.
  interestRate: 0.05,
  openQuestion: 'F3'
} as const;

export const MARKET = {
  section: 'Ekonomin > Marknaden',
  baseShareCap: 0.20,          // "20 %"
  shareCapPerMedalStep: 0.03,  // "plus 3 procentenheter per medaljsteg"
  // Tolkning: medaljsteg summeras över alla paviljonger.
  openQuestion: 'F4'
} as const;

export const RANDOMNESS = {
  section: 'Ekonomin > Slumpen',
  // "den bättre förberedda spelaren vinna ungefär tre veckor av fyra"
  betterPreparedWinShare: 3 / 4,
  simulatedWeeks: 1000         // "mäts med 1 000 simulerade veckor"
} as const;

export const DOWNGRADE = {
  section: 'Ekonomin > Nedgradering',
  consecutiveNegativeDayEnds: 3, // "under noll vid tre dagsavslut i rad"
  warningDays: 2                 // "två dagars varning i kvällsberättelsen"
} as const;

// ---------------------------------------------------------------------
// Verksamhetsklasserna
// ---------------------------------------------------------------------

export type BusinessClassId = 'vinbar' | 'foodtruck' | 'restaurang' | 'olkrog' | 'gastgiveri' | 'nattklubb';

// Ett krav: medaljnivå i ett antal paviljonger, varav vissa namngivna.
export interface MedalRequirement {
  level: MedalLevel;
  count: number;
  including: readonly PavilionId[];
}

export interface BusinessClassSpec {
  id: BusinessClassId;
  // Antal platser; `null` = kö (food truck).
  seats: number | null;
  // Huvudpaviljong; 'best' = spelarens bästa (food truck).
  mainPavilion: PavilionId | 'best';
  // Alla krav ska vara uppfyllda.
  requirements: readonly MedalRequirement[];
  upgradeOnly: boolean;
  buildOrder: number;
}

export const BUSINESS_CLASSES = {
  section: 'Verksamhetsklasserna',
  list: [
    { id: 'vinbar', seats: 20, mainPavilion: 'stensota', upgradeOnly: false, buildOrder: 1,
      requirements: [{ level: 'brons', count: 3, including: ['stensota'] }] },
    { id: 'foodtruck', seats: null, mainPavilion: 'best', upgradeOnly: false, buildOrder: 2,
      requirements: [{ level: 'brons', count: 1, including: [] }] },
    { id: 'restaurang', seats: 60, mainPavilion: 'metodkoket', upgradeOnly: false, buildOrder: 3,
      requirements: [{ level: 'silver', count: 3, including: [] }] },
    { id: 'olkrog', seats: 20, mainPavilion: 'metodkoket', upgradeOnly: false, buildOrder: 4,
      requirements: [{ level: 'brons', count: 3, including: ['metodkoket'] }] },
    { id: 'gastgiveri', seats: 100, mainPavilion: 'kalastorget', upgradeOnly: true, buildOrder: 5,
      requirements: [{ level: 'guld', count: 3, including: ['kalastorget'] }] },
    { id: 'nattklubb', seats: 150, mainPavilion: 'kalastorget', upgradeOnly: true, buildOrder: 6,
      requirements: [
        { level: 'guld', count: 1, including: ['kalastorget'] },
        { level: 'silver', count: 1, including: ['stensota'] }
      ] }
  ] as readonly BusinessClassSpec[]
} as const;

export const UPGRADE = {
  section: 'Verksamhetsklasserna > Uppgradering',
  // "om kassan räcker till en veckas golv i den nya klassen"
  cashRequiredInWeeksOfFloor: 1,
  // "ryktet halveras"
  reputationFactor: 0.5
} as const;

// ---------------------------------------------------------------------
// Servicen
// ---------------------------------------------------------------------

export const ACTION_BUTTON = {
  section: 'Servicen > Action-knappen',
  blindSimSeconds: 20,         // "resten av rummet i tjugo spelsekunder"
  maxPerEvening: 3,            // "Högst tre insatser per kväll"
  techneCreditOnSuccess: 1     // "ger en techne-kredit"
} as const;

export const REPUTATION = {
  section: 'Servicen > Ryktet',
  scale: 100,
  floor: 10                    // "Ryktet kan inte gå under 10 av 100"
} as const;

// ---------------------------------------------------------------------
// Professionell mognad och portfolio
// ---------------------------------------------------------------------

export type MaturityStep = 'novis' | 'praktiker' | 'reflekterande' | 'professionell' | 'expert';

export const MATURITY = {
  section: 'Professionell mognad och portfolio',
  steps: [
    { id: 'novis', medals: [] },
    { id: 'praktiker', medals: [{ level: 'brons', count: 3, including: [] }],
      evidence: { fullWeeksWithoutNegativeCash: 1 } },
    { id: 'reflekterande', medals: [{ level: 'silver', count: 3, including: [] }],
      evidence: { postServiceQuizEvenings: 10, weakestAxisImproved: true } },
    { id: 'professionell', medals: [{ level: 'guld', count: 3, including: [] }],
      evidence: { consecutiveWeeksAboveFloorWithoutTopUp: 2, eveningsTurnedWithActionButton: 5 } },
    { id: 'expert', medals: [
        { level: 'platina', count: 2, including: [] },
        { level: 'guld', count: 1, including: ['kalastorget'] }
      ],
      evidence: { weeksWithAllThreeCapitalsRising: 1 } }
  ] as readonly {
    id: MaturityStep;
    medals: readonly MedalRequirement[];
    evidence?: Record<string, number | boolean>;
  }[]
} as const;

// ---------------------------------------------------------------------
// Ramar för version 1
// ---------------------------------------------------------------------

export const INTRODUCTION = {
  section: 'Ramar för version 1 > Introduktionen',
  // "står i sin första verksamhet inom 20 minuter"
  minutesToFirstBusiness: 20,
  // "Första veckan har färre gäster". Talet är valt.
  firstWeekGuestFactor: 0.7,
  openQuestion: 'F5'
} as const;

export const SAVING = {
  section: 'Ramar för version 1 > Sparande',
  slots: 3                     // "Tre sparplatser per spelare"
} as const;
