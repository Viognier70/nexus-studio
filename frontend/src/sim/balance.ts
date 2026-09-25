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
  // Veckan börjar på måndag; spelets dag 1 är måndag vecka 1.
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as readonly Weekday[],
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

// ORDER 263 — kvällens service i v1. Speldesignen anger 4–5 minuter i
// verkligheten; simuleringen går i standardfarten 2× (`ui/SpeedToggle.tsx`),
// så servicen är 5 × 2 = 10 simulerade minuter, räknat från att
// servicen öppnas (opening och mise en place ingår). Spelaren väljer
// inte längden. Talet är valt.
const DEFAULT_SIM_SPEED = 2;
export const SERVICE = {
  section: 'Tiden',
  openQuestion: 'F11',
  defaultSimSpeed: DEFAULT_SIM_SPEED,
  simMinutes: DAY.realMinutes.service[1] * DEFAULT_SIM_SPEED
} as const;

// ORDER 264 — kvällen. Speldesignen anger 1–2 minuter i verkligheten
// för kvällsberättelsen och quizen; i standardfarten blir det 2 × 60 × 2
// = 240 simulerade sekunder innan nästa morgon börjar av sig själv.
// Spelaren kan gå vidare tidigare, och kvällen väntar medan quizen pågår.
const SECONDS_PER_MINUTE = 60;
export const EVENING = {
  section: 'Tiden',
  openQuestion: 'F17',
  simSeconds: DAY.realMinutes.evening[1] * SECONDS_PER_MINUTE * DEFAULT_SIM_SPEED
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
  maxPercent: 90,
  // Golvet anges i procent; andel = procent / 100.
  percentBase: 100
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
  openQuestion: 'F4',
  // ORDER 265 (F21) — Grythyttans gästpool en vanlig dag (gästfaktor 1),
  // före veckodag, högtid och första veckan (kalenderns gästfaktor).
  // Härlett ur reports/order265/normal-weekly-revenue.json: vinbaren
  // spelas i kvarterskrogens rum (F20), som drar 259,5 gäster per vecka
  // (median, result.kvarterskrogen.guestsPerWeek) = 43,25 per servicedag.
  // Taket ska bita vid klassens ingångsnivå (brons i tre = tre steg =
  // 29 %) vid 90 % av det rummet drar: 43,25 × 0,9 / 0,29 ≈ 134. Med fler
  // medaljer släpper taket; utan medaljer har spelaren ingen verksamhet.
  basePoolPerDay: 134
} as const;

// ORDER 265 (F8) — klassernas normala veckointäkt och startlån.
// Speldesignen anger inte beloppen. Intäkten är mätt med veckoharnessen:
// reports/order265/normal-weekly-revenue.json, fältet result.<klass>.median
// (vecka 2–3, frön 11/22/33, utan satsningar). Restaurang och nattklubb
// har ännu inget eget rum (etapp 7 och 10) och mäts i kvarterskrogen.
export const ECONOMY = {
  section: 'Ekonomin > Golvet',
  openQuestion: 'F8',
  normalWeeklyRevenueSek: {
    vinbar: 42090,        // kvarterskrogen — vinbaren spelas i dagens byggda rum tills etapp 5 (F20)
    foodtruck: 60744,     // foodtrucken
    restaurang: 42090,    // kvarterskrogen (platshållare till etapp 7)
    olkrog: 47044,        // ölkrogen
    gastgiveri: 42626,    // gästgiveriet
    nattklubb: 42090      // kvarterskrogen (platshållare till etapp 10)
  },
  // Startlånet = två veckors normal intäkt; amorteringen blir då ungefär
  // en fjärdedel av veckans intäkt under åtta veckor. Talet är valt.
  startLoanWeeksOfRevenue: 2
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
  // Storlek i nedgraderingskedjan (speldesign > Nedgradering): food truck
  // 1, vinbar och ölkrog 2, restaurang 3, gästgiveri och nattklubb 4. Ett
  // byte till större storlek är en uppgradering.
  sizeRank: number;
  // ORDER 267 (F33) — kravet för spelarens första verksamhet i
  // introduktionen: "Startvalet mellan vinbar och ölkrog styrs av vad
  // spelaren har valt att lära sig." Introduktionen har ett prov; brons
  // i klassens huvudpaviljong räcker för start. Utelämnat = samma krav
  // som annars.
  startRequirements?: readonly MedalRequirement[];
}

export const BUSINESS_CLASSES = {
  section: 'Verksamhetsklasserna',
  list: [
    { id: 'vinbar', seats: 20, mainPavilion: 'stensota', upgradeOnly: false, buildOrder: 1, sizeRank: 2,
      requirements: [{ level: 'brons', count: 3, including: ['stensota'] }],
      startRequirements: [{ level: 'brons', count: 1, including: ['stensota'] }] },
    { id: 'foodtruck', seats: null, mainPavilion: 'best', upgradeOnly: false, buildOrder: 2, sizeRank: 1,
      requirements: [{ level: 'brons', count: 1, including: [] }] },
    { id: 'restaurang', seats: 60, mainPavilion: 'metodkoket', upgradeOnly: false, buildOrder: 3, sizeRank: 3,
      requirements: [{ level: 'silver', count: 3, including: [] }] },
    { id: 'olkrog', seats: 20, mainPavilion: 'metodkoket', upgradeOnly: false, buildOrder: 4, sizeRank: 2,
      requirements: [{ level: 'brons', count: 3, including: ['metodkoket'] }],
      startRequirements: [{ level: 'brons', count: 1, including: ['metodkoket'] }] },
    { id: 'gastgiveri', seats: 100, mainPavilion: 'kalastorget', upgradeOnly: true, buildOrder: 5, sizeRank: 4,
      requirements: [{ level: 'guld', count: 3, including: ['kalastorget'] }] },
    { id: 'nattklubb', seats: 150, mainPavilion: 'kalastorget', upgradeOnly: true, buildOrder: 6, sizeRank: 4,
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
  techneCreditOnSuccess: 1,    // "ger en techne-kredit"
  // ORDER 266 (F25) — valda tal. Insatsen tar baseSimSeconds / (1 +
  // techneSpeedPerCredit × techne-krediter), dock minst minSimSeconds
  // ("Insatsen går snabbare ju fler techne-krediter hon har").
  openQuestion: 'F25',
  baseSimSeconds: 14,
  techneSpeedPerCredit: 0.05,
  minSimSeconds: 5,
  // Att lugna en gäst i kön: nöjdheten höjs och väntan börjar om.
  calmSatisfactionBoost: 0.4,
  // En gäst i kön visas som "på väg att gå" under denna nöjdhet (före
  // gränsen för att ge upp, QUEUE.giveUpSatisfaction, så att spelaren
  // hinner rycka in).
  atRiskSatisfaction: 0.6
} as const;

export const REPUTATION = {
  section: 'Servicen > Ryktet',
  scale: 100,
  floor: 10,                   // "Ryktet kan inte gå under 10 av 100"
  // ORDER 266 (F26) — återhämtningen. "Det återhämtar sig långsamt av sig
  // självt och snabbare genom händelser." Valda tal, på skalan 0–100.
  openQuestion: 'F26',
  recoveryTarget: 50,          // självläkningen drar mot 50 av 100
  dailyRecovery: 2,            // per dag under målet
  cleanEveningBonus: 3,        // "en kväll utan returer": ingen gav upp
  actionSuccessBonus: 1        // en gäst som stannade tack vare insatsen
} as const;

// ORDER 266 (F29) — kön. Speldesign > Action-knappen: "lugna en gäst som
// väntat länge … en gäst som stannar i stället för att gå". Regeln för
// att ge upp (90 s och nöjdhet under 0,2, ORDER 043) var gjord för pass
// på 15–30 minuter; v1:s dörrar står öppna i knappt åtta, och ingen gav
// upp (mätt 2026-09-25: längsta väntan en vanlig lördag 23 s, en
// högtidslördag 37 s). Mätt en vanlig fredag (53 gäster, brons i tre):
// tålamod 30 s → ryktet 0,60 → 0,47, 45 s → 0,50, 60 s → 0,53, 90 s →
// 0,62. Med 60 s blir det omkring tre gäster på väg att gå en tung kväll,
// lika många som spelarens tre insatser. Valda tal.
export const QUEUE = {
  section: 'Servicen',
  openQuestion: 'F29',
  patienceSimSeconds: 60,
  giveUpSatisfaction: 0.35
} as const;

// ORDER 267 (F31) — sittiden. Speldesignen anger ingen klocka för
// kvällen; servicen räknas som 18–23 i speltid (fem timmar över
// SERVICE.simMinutes), alltså en halv spelminut per simsekund. En gäst
// stannar en bestämd tid från att hon satt sig tills hon betalat; går
// beställningen långsamt blir sittningen längre, aldrig kortare än
// minDiningGameMinutes efter maten (gånger 2 − socialt kapital, ORDER
// 043). Före ORDER 267 fanns ingen sittid: den blev vad personalen
// hann med, 84–174 s beroende på fröet. Vision Owner 2026-09-25:
// 60–90 min för en vinbar. Valda tal.
export const SITTING = {
  section: 'Servicen',
  openQuestion: 'F31',
  serviceStartHour: 18,
  serviceEndHour: 23,
  stayGameMinutes: { vardaglig: 75, formell: 90 },
  minDiningGameMinutes: 10
} as const;

// Spelminuter per simsekund under servicen (F31).
export const GAME_MINUTES_PER_SIM_SECOND =
  ((SITTING.serviceEndHour - SITTING.serviceStartHour) * 60) / (SERVICE.simMinutes * 60);

// ORDER 267 (F34) — söndagstidningen (speldesign > Ramar för version 1 >
// Veckoavräkningen): "en recension av veckans bästa eller sämsta kväll,
// hur det gick på marknaden, vad banken säger och vilken högtid som
// kommer." Marknaden i ord efter andelen av veckans tak som kom (gäster
// / summan av dagarnas tak). En kväll räknas som full vid samma andel.
// Valda tal.
export const NEWSPAPER = {
  section: 'Ramar för version 1 > Veckoavräkningen',
  openQuestion: 'F34',
  marketShareWords: { full: 0.95, most: 0.7, half: 0.4 }
} as const;

// ORDER 266 (F28) — händelser ur simuleringen, var och en med en orsak
// (speldesign > Händelser). Valda tal.
export const EVENTS = {
  section: 'Servicen > Händelser',
  openQuestion: 'F28',
  // Inspektion: stationernas mise en place under denna nivå när
  // servicen stänger ("Dålig hygien leder till inspektion").
  inspectionStationsBelow: 0.4,
  inspectionReputationHit: 5,  // av 100
  inspectionFineSek: 2000,
  // Recensent: ryktet minst detta när servicen öppnar ("gott rykte
  // till en recensent"). Utfallet följer kvällen.
  reviewerReputationAtLeast: 70,
  reviewerReputationChange: 5
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
  slots: 3,                    // "Tre sparplatser per spelare"
  // ORDER 263 — sparfilens formatversion. Höjs när sparfilens form
  // ändras; äldre filer visas då som "sparat i en äldre version" (F12),
  // utom de som står i migratableVersions och går att föra över.
  // ORDER 267 — version 2: vinbaren spelas i vinbarens rum. En fil i
  // version 1 laddas med rummet satt efter klassen (save.ts migrate).
  formatVersion: 2,
  migratableVersions: [1]
} as const;
