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
import type { KnowledgeAxis, StaffRole } from '../strategic/types';

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

// ORDER 280 — klockan (Designs K1, leveransen kassan och kvällen): tio
// halvtimmesrutor från 18 till 23, rusningen 19.30–21.00 och sopbilen
// 23.40. Minuter efter servicens start.
export const CLOCK = {
  section: 'Tiden',
  cells: 10,
  cellMinutes: 30,
  rushFromMinutes: 90,
  rushToMinutes: 180,
  pickupAfterCloseMinutes: 40
} as const;

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
  correctToPass: 6,            // "Sex rätt ger medaljen"
  // ORDER 270 (provspel 2026-09-27): "Proven på tid: 30 sekunder per
  // fråga. Hinner spelaren inte svara räknas det som fel. Övningen är
  // utan tid och visar förklaringen." Verklig tid.
  secondsPerQuestion: 30
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

// ORDER 280 — hyran och lönerna (Vision Owner 2026-09-29): "Inför en
// veckohyra per klass, dragen vid veckoavräkningen och synlig i
// tidningen, och visa lönerna som en veckorad i avräkningen. Kalibrera
// hyran så att den rimliga spelaren går plus med ungefär 5–10 % av
// veckointäkten, och den svaga spelaren nedgraderas inom två till tre
// veckor." Hyran per klass i kronor i veckan; vinbaren är kalibrerad
// (reports/order280/rent-calibration.json), de andra klasserna har samma
// andel av sin normala veckointäkt tills deras paket är skrivna (F53).
// ORDER 285 — gårdagens rester (Vision Owner 2026-09-29, tredje
// provspelet: "Svinnet ska kunna användas nästa dag, med frågor om hur
// råvarorna tas tillvara"). Den rätt som hade flest osålda portioner läggs
// undan i kylrummet, om de var minst minPortions; en fråga på morgonen
// avgör. Rätt svar: portionerna går att sälja och den ekologiska
// hållbarheten stiger per portion. Fel svar eller inget svar före
// öppning: sopbilen tar dem (kilo × taxan, utan ny hämtningsavgift) och
// den ekologiska sjunker. Talen är valda (F55).
export const SALVAGE = {
  section: 'Servicen > Kvällens resultat',
  openQuestion: 'F55',
  minPortions: 3,
  ecologicalPerPortion: 0.004,
  ecologicalWrongPerPortion: 0.002
} as const;

// ORDER 287a — de tre hållbarheterna som nivåer 0–10 med förra kvällens
// nivå (documentation/game-design/FORSLAG_HALLBARHETERNA_0_10.md, godkänt
// av Vision Owner 2026-09-29 med villkoret att den ekonomiska marginalen
// räknar med morgonens inköp). Nivån räknas ur kvällen:
// - social: 10 × (andelen av kvällens gäster som gick nöjda × socialHappy
//   + personalens ork vid stängning × socialMorale);
// - ekonomisk: dagens marginal (kassans förändring över dagen mot kvällens
//   intäkt), där economicFloor är nivå 0 och economicCeil nivå 10;
// - ekologisk: 10 × (1 − osålda portioner till sopbilen / portionerna vid
//   öppning), minus ecologicalLeftoverPenalty om gårdagens rester gick till
//   sopbilen.
export const SUSTAINABILITY_LEVELS = {
  section: 'Servicen > Kvällens resultat',
  max: 10,
  socialHappy: 0.7,
  socialMorale: 0.3,
  economicFloor: -0.25,
  economicCeil: 0.35,
  ecologicalLeftoverPenalty: 1
} as const;

// ORDER 284 — 0,15 → 0,17 efter portionsboken (stockPackages.ts
// dishPortions): mindre svinn gav den rimliga spelaren 11,8 % vid 0,15
// (reports/order284/rent-check.json vid 0,17: 9,9 %; week-players.json: 5,0 %).
// ORDER 288 (F59, Vision Owner 2026-10-01: "kalibrera vinsten mot målet
// 5–10 % när rivalerna delar gästerna") — 0,17 → 0,32 med rivalerna och
// bussen i byn: 0,30 gav den rimliga spelaren 9,8 % och 0,35 5,8 %
// (reports/order288/rent-calibration.json, 20 frön); 0,32 ligger i målet.
export const RENT = {
  section: 'Ekonomin > Hyran och lönerna',
  openQuestion: 'F59',
  shareOfNormalWeeklyRevenue: 0.32,
  // ORDER 294 (Vision Owner 2026-10-02): "första och andra veckan ligger på den
  // gamla nivån (17 %), därefter full hyra (32 %)". Säsongens veckor 1–2.
  // ORDER 303c (Anders 2026-10-05: "Halva ska stänga 30–50 % av
  // säsongerna … välj spak själv, till exempel … de fasta kostnaderna") —
  // ingen hyra säsongens fyra första veckor (förut 17 % veckorna 1–2). En
  // spelare som har hälften rätt hinner då längre innan kassan går under
  // noll, utan att startkassan höjs (Vision Owner 2026-10-02: "Startkassan
  // sänks kraftigt"). reports/order303c/kalib/H3.
  introShareOfNormalWeeklyRevenue: 0,
  introWeeks: 4,
  reasonableResultShare: [0.05, 0.1] as readonly number[],
  weakDowngradeWeeks: [2, 3] as readonly number[]
} as const;

export const LOAN = {
  section: 'Ekonomin > Lånet',
  amortisationWeeks: 8,        // "amorteras lika under säsongens åtta veckor"
  // "med fem procents ränta". Tolkning: 5 % av lånebeloppet över
  // säsongen, fördelat lika per vecka.
  interestRate: 0.05,
  openQuestion: 'F3'
} as const;

// ORDER 288 — byn och konkurrensen (Vision Owner 2026-10-01: "Rivaler som
// styrs av datorn: Torgkrogen, Pizzeria Grytan, Sjöboden och Hotellets
// matsal, med eget namn, egen mat, egna priser, eget rykte och egna
// stjärnor, plus food trucks som parkerar på olika platser varje kväll. De
// drar gäster från samma gemensamma flöde som du."). Logiken ur Designs
// nexus-leverans-2026-10-01-byn-och-gasterna (Byn och gasterna.html PREF,
// choose; byTruckar.js SPOTS, TRUCKS, EVENINGS), talen omräknade till
// spelets notor (GUESTS.walletSek) och valda (F63). sim/village.ts läser dem.
// ORDER 313 §9 — Byn just nu: pilen jämför de senaste trendWindowMin
// spelminuterna med lika många dessförinnan (sim/villageNow.ts).
export const VILLAGE_NOW = { trendWindowMin: 10 } as const;

export const VILLAGE = {
  section: 'Ekonomin > Byn',
  openQuestion: 'F63',
  // ORDER 296 — byns gäster kommer mellan de här klockslagen (minuter),
  // flest mitt i kvällen (triangelfördelning). Byns figurer (VillageLife) och
  // bandet i HUD:en (sim/villageLive.ts) läser samma fönster.
  arriveFromMinute: 19 * 60 + 5,
  arriveUntilMinute: 22 * 60 + 30,
  // Triangelns topp, som andel av fönstret (mitt i kvällen).
  arrivePeakShare: 0.5,
  // Byns gäster per typ: andelen av dagens pool (MARKET.basePoolPerDay).
  poolMix: { student: 0.3, middle: 0.5, high: 0.2 },
  // Stjärnorna ur ryktet (0–1): 1 + ryktet × 4, avrundat, 1–5.
  stars: { min: 1, max: 5 },
  // Prototypens choose(): smaken gånger (bas + per stjärna × stjärnor).
  // Studenten bryr sig inte om stjärnorna (prototypen: "Stjärnorna spelar
  // minst roll").
  starWeight: { base: 0.4, perStar: 0.35, ignoredBy: ['student'] as readonly string[] },
  // Priset: en nota per gäst över vad typen helst betalar i byn väger
  // (gränsen / notan) upphöjt till priceExponent. Gränserna är på spelets
  // skala: vinbarens nota per gäst är omkring 110–220 kr (veckans intäkt per
  // gäst i reports/order288/village.json), inte plånboken i GUESTS.walletSek
  // som är vad gästen högst kan lägga.
  priceComfortSek: { student: 130, middle: 260, high: 520 },
  priceExponent: 2,
  // Spelarens krog: smaken per rum (prototypens "Vår krog", var, gånger
  // 1,75), och notan när veckan ännu saknar kvällar (sedan veckans intäkt
  // per gäst). Med prototypens tal tog rivalerna en tredjedel av spelarens
  // gäster onsdag–lördag, och fredagens kö försvann (ORDER 267). Gånger 1,75
  // når den rimliga spelaren (brons i tre, ryktet 0,6) kunskapens tak också
  // en lördag; rivalerna tar gäster när ryktet faller eller en rival stiger.
  playerTaste: {
    default: { student: 2.1, middle: 4.2, high: 3.5 },
    vinbaren: { student: 2.1, middle: 4.2, high: 4.2 },
    ölkrogen: { student: 5.25, middle: 4.2, high: 1.05 }
  } as Record<string, { student: number; middle: number; high: number }>,
  playerBillSek: 160,
  // Krogarna. reputation är startryktet (0–1); stjärnorna följer ryktet.
  // seats och turns sätter hur många de kan ta en kväll; billSek är notan
  // per gäst. openDays: kvällarna de har öppet.
  rivals: [
    { id: 'torgkrogen', kind: 'restaurant', reputation: 0.5, billSek: 210, seats: 44, turns: 1.6, taste: { student: 1, middle: 3, high: 1.5 }, openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { id: 'pizzeria-grytan', kind: 'restaurant', reputation: 0.1, billSek: 120, seats: 34, turns: 2, taste: { student: 5, middle: 1, high: 0 }, openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { id: 'sjoboden', kind: 'restaurant', reputation: 0.3, billSek: 250, seats: 30, turns: 1.4, taste: { student: 2, middle: 2.6, high: 1 }, openDays: ['wed', 'thu', 'fri', 'sat'] },
    { id: 'hotellets-matsal', kind: 'restaurant', reputation: 0.75, billSek: 430, seats: 56, turns: 1.2, taste: { student: 0, middle: 0.6, high: 3 }, openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
    { id: 'grillvagnen', kind: 'truck', reputation: 0.3, billSek: 95, seats: 0, turns: 0, taste: { student: 4, middle: 2, high: 0.2 }, openDays: ['tue', 'wed', 'thu', 'fri', 'sat'] },
    { id: 'tacovagnen', kind: 'truck', reputation: 0.1, billSek: 85, seats: 0, turns: 0, taste: { student: 4.5, middle: 1.5, high: 0.1 }, openDays: ['wed', 'thu', 'fri', 'sat'] }
  ] as ReadonlyArray<{ id: string; kind: 'restaurant' | 'truck'; reputation: number; billSek: number; seats: number; turns: number; taste: { student: number; middle: number; high: number }; openDays: readonly Weekday[] }>,
  // Vagnarna tar så här många gäster en kväll (de äter stående vid luckan).
  truckGuestsPerEvening: 40,
  // Paket 2:s tre platser (byTruckar.js SPOTS), och var vagnarna står varje
  // veckodag (EVENINGS, utökat till hela veckan): olika platser varje kväll.
  truckSpots: ['torget', 'maltidens-hus', 'sjon'] as const,
  truckSchedule: {
    mon: { grillvagnen: 'torget', tacovagnen: 'sjon' },
    tue: { grillvagnen: 'maltidens-hus', tacovagnen: 'torget' },
    wed: { grillvagnen: 'sjon', tacovagnen: 'maltidens-hus' },
    thu: { grillvagnen: 'torget', tacovagnen: 'maltidens-hus' },
    fri: { grillvagnen: 'torget', tacovagnen: 'sjon' },
    sat: { grillvagnen: 'sjon', tacovagnen: 'maltidens-hus' },
    sun: { grillvagnen: 'torget', tacovagnen: 'sjon' }
  } as Record<Weekday, Record<string, 'torget' | 'maltidens-hus' | 'sjon'>>,
  // Rivalens pris en kväll: notan gånger 1 ± detta (fröets slump).
  priceSpread: 0.08,
  // Kvällens intäkt per gäst: notan gånger 1 ± detta.
  billSpread: 0.12,
  // Rivalens rykte efter kvällen: + step × (fullhet − målet) ± brus,
  // inom min–max. Fullheten är gästerna mot platserna gånger sittningarna.
  reputationStep: 0.02,
  reputationTargetFullness: 0.6,
  reputationNoise: 0.015,
  reputationRange: [0.05, 0.95] as readonly number[],
  // Bussen med turister (Vision Owner: "En buss med 30 turister anländer
  // 20.15. De väljer krog efter rykte."). Aviseringen kommer en halvtimme
  // före. De väljer en krog (inte vagnarna) med vikten stjärnor upphöjt
  // till starsExponent, och kommer utöver dagens pool. Sällskapen i bussen.
  bus: { tourists: 30, announceMinute: 1185, arriveMinute: 1215, weekdays: ['fri', 'sat'] as readonly Weekday[], starsExponent: 2, partySizes: [3, 5] as readonly [number, number], type: 'middle' as const },
  // Hur länge aviseringen syns, i spelsekunder.
  noticeSimSeconds: 24
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

// ORDER 296 (Vision Owner 2026-10-02, kärnan punkt 2): risken. ORDER 296c:
// talen är låsta. Startkassan kalibrerad så att den som har hälften rätt
// stänger i 30–50 % av säsongerna (7 av 20 med 15 000 kr, mentorns och den
// rimliga spelaren aldrig, reports/order296c/kal-*.json och karnan-slut.json).
//   - startkassan sänks kraftigt; banklånet finansierar lokalen som förut;
//   - bara ränta under säsongen, ingen amortering;
//   - banken sätter ett veckomål på intäkten (andel av klassens normala
//     veckointäkt); två missade mål i rad omförhandlar lånet, och räntan
//     blir dubbel resten av säsongen;
//   - kassan under noll vid tre veckoavräkningar i rad: krogen stänger och
//     säsongen är slut. Det ersätter nedgraderingen (DOWNGRADE) och golvets
//     påfyllnad, som harnessen räknade utan (reports/order296b/karnan-*.json).
export const RISK = {
  section: 'Ekonomin',
  startCashSek: 15000,
  amortiseDuringSeason: false,
  weeklyTargetShareOfNormalRevenue: 0.95,
  renegotiateAfterMissedWeeks: 2,
  renegotiatedInterestFactor: 2,
  closeAfterWeeksBelowZero: 3,
  // ORDER 311 (Anders 2026-10-06): står kassan under noll i säsongens sista
  // bokslut (vecka SEASON.weeks) räknas det som konkurs, och krogen stänger.
  closeBelowZeroAtSeasonEnd: true,
  floorTopUp: false,
  downgrade: false,
  // ORDER 296c (Vision Owner 2026-10-02): "Ta bort den dolda regeln om att
  // låg kassa vänder bort gäster i dörren." Kassan (det ekonomiska kapitalet,
  // cashReading.ts) styr inte längre vilka som vänder vid dörren eller hur
  // många som kommer (arrivals.ts walkAwayProbability, economicArrivalMultiplier).
  cashTurnsAwayGuests: false
} as const;

// ORDER 296 (kärnan punkt 5, Vision Owner 2026-10-02): mise en place efter
// inköpen. "Förberedelsen växer med inköpen och bokningarna, personalen hinner
// en viss mängd före öppning, resten görs under servicen och fördröjer
// gästerna, och spelaren kan ta in en extra hand på morgonen." Spelminuter.
//   behovet = portionerna som förbereds (lagret, högst kvällens bokning)
//             × perPortionMin + bokade gäster × perBookedGuestMin
//   hinns   = personalen × minutesPerStaff (+ den extra handen)
// Det som inte hinns står kvar som eftersläp när dörrarna öppnar: mise en
// place räcker då mindre (readiness gånger hinns / behovet), och personalens
// uppgifter vid borden tar backlogTaskTime så länge eftersläpet finns kvar.
export const MISE_EN_PLACE = {
  section: 'Servicen',
  // Kalibrerat (reports/order296b/karnan-spel.json): vardagarna hinns med
  // laget, fredag och lördag behöver den extra handen. Bokningen ligger över
  // gästerna som kommer, därför halv vikt per bokad gäst.
  perPortionMin: 1,
  perBookedGuestMin: 0.5,
  minutesPerStaff: 25,
  extraHandMin: 40,
  extraHandCostSek: 800,
  backlogTaskTime: 1.3
} as const;

// ORDER 296 — butiken mellan kvällarna (Designs leverans hovmästaren och
// butiken §6, hostShop.ts SHOP och ABILITIES). Medaljen öppnar och förbrukas
// inte; krediterna betalar. Köpta förmågor behålls; bara det som ligger i
// facket gäller nästa kväll. Kraven är Designs förslag (proposedRequires);
// priserna är satta så att en rimlig spelare (omkring 53 krediter i veckan,
// reports/order296b/karnan-spel.json) köper fyra till sex förmågor under
// säsongen. Stjärnan står i STAR (ORDER 296c).
export const SHOP = {
  section: 'Kunskapen',
  slots: 2,
  slotsAtStar: 3,
  abilities: {
    sommBottle: { requires: 'brons', price: 40 },
    wineTasting: { requires: 'guld', price: 110 },
    fastPass: { requires: 'brons', price: 40 },
    leftovers: { requires: 'silver', price: 70 },
    mise: { requires: 'guld', price: 110 },
    menuStory: { requires: 'brons', price: 40 },
    allergen: { requires: 'silver', price: 70 },
    critic: { requires: 'guld', price: 110 },
    regulars: { requires: 'brons', price: 40 },
    birthday: { requires: 'silver', price: 70 },
    lova: { requires: 'guld', price: 110 },
    chefsTable: { requires: 'brons', price: 90 },
    signature: { requires: 'guld', price: 150 }
  } as Record<string, { requires: 'brons' | 'silver' | 'guld' | 'platina'; price: number }>,
  // Förmågornas verkan när de ligger i facket (texterna ab.*.fx).
  effects: {
    sommBottleChance: 0.25,        // sällskapets chans att ta en flaska, utöver GUESTS.bottleChance
    wineTastingSecondDrink: 0.15,  // chansen till ett glas till, utöver STOCK.secondDrinkChance
    fastPassOrderTime: 0.8,        // tiden för köket att få ut maten (uppgiften order)
    leftoversWasteShare: 0.5,      // sopbilens avgift
    miseExtraMin: 25,              // förberedelsen hinner fler minuter före öppning
    menuStoryBill: 0.05,           // notan för den som äter
    regulersPatience: 0.8,         // nöjdheten sjunker långsammare i kön
    regularsArrivals: 0.03,        // fler gäster (marknadens tak)
    birthdayPackageSek: 600,       // tårta och bubbel när födelsedagen kommer
    lovaSocialChance: 0.25,        // chansen att gästen med socialt kapital har bokat, utöver SOCIAL_GUEST
    chefsTableBill: 0.5,           // notan för sällskapet vid kockens bord (ett per kväll, från 20.00)
    chefsTableSatisfaction: 0.1,
    chefsTableFromMinute: 20 * 60,
    signatureBill: 0.05            // notan för den som äter
  }
} as const;

// ORDER 296 (kärnan punkt 1, Vision Owner 2026-10-02): hovmästarens beslut
// under hela servicen, med Designs nålar och handgrepp (leveransen
// hovmästaren och butiken §2–3, hostShop.ts PIN och HANDS). Tiden på en nål
// går i verkliga sekunder och står still under en raket; när den gått ut
// väljer Per det säkra svaret (aldrig förlust, sällan mest).
export const HOST = {
  section: 'Servicen',
  pinSeconds: 12,
  maxOpen: 3,
  // Verkliga sekunder mellan två nya nålar när rummet är fullt (andelen
  // upptagna platser minst fullShare): ett beslut med några sekunders
  // mellanrum. En lugnare kväll gånger quietGapFactor.
  spawnGapSeconds: 6,
  fullShare: 0.8,
  quietGapFactor: 2.5,
  // Mognaden: så många sällskap i kön (dörren); så många vid baren som väntar
  // på sin beställning, igen efter barRepeatSimSeconds; en gäst vid ett bord
  // som inte har beställt (vinlistan); en gäst i kön under otålighetens
  // gräns (QUEUE_MOOD.impatientBelow).
  doorMinQueue: 2,
  barRepeatSimSeconds: 60,
  barMinWaiting: 3,
  // Utfallen.
  seatSatisfaction: 0.05,
  barDrinkSatisfaction: 0.05,
  bottleChance: 0.6,
  bottleDishId: 'house-wine-bottle',
  glassDishId: 'house-wine-glass',
  dessertDishIds: ['dairy-dessert', 'lingon-sorbet'] as readonly string[],
  wineSatisfaction: 0.03,
  helpSimSeconds: 60,
  helpZoneTaskTime: 0.7,
  helpOtherTaskTime: 1.15,
  compGlassSatisfaction: 0.2,
  compCoffeeSatisfaction: 0.12,
  compCoffeeCostSek: 25,
  apologySatisfaction: 0.08,
  upsellChance: 0.5,
  upsellDeclineSatisfaction: -0.02
} as const;

// ORDER 296c (Vision Owner 2026-10-02): stjärnan. "Kräver guld i
// Gastronomiska Teatern och högt rykte och gott serviceomdöme två veckor i
// rad. Den delas ut i söndagstidningen och kan förloras om nivån sjunker under
// en vecka. Stjärnan ger facket en tredje plats." Gränserna är föreslagna:
//   - högt rykte: minst reputationAtLeast vid veckoavräkningen. ORDER 296e
//     (Vision Owner 2026-10-03): 36 av 100 och tre veckor i rad, "stjärnan
//     ska belöna en jämn nivå" (förut 60 och två veckor, därefter 40 och två
//     veckor, ORDER 296d);
//   - gott serviceomdöme: minst judgementAtLeast av veckans raketer klarade
//     (omdömet i servicen), av minst minRocketsInWeek raketer;
//   - tre veckor i rad (weeksToEarn) ger stjärnan, en vecka under någon
//     gräns tar den.
// ORDER 298b (Vision Owner 2026-10-03): gränserna kalibreras mot målen, inte
// fasta tal. Med 0,85 rätt per steg nås stjärnan i minst 70 % av säsongerna,
// i snitt vecka 5–6; med 0,75 i 20–40 %; med 0,6 eller sämre aldrig. Ryktet
// ligger omkring 0,33 också för den skickliga spelaren, så 0,36 höll sällan
// tre veckor; gränsen är 0,20. Omdömet räknas på klarade raketer (0,45), som
// sprider spelarna mer än andelen rätta steg (reports/order298b/stjarna-svep.json;
// kontrollen med gränserna i stjarna-085.json, stjarna-075.json, stjarna-06.json).
export const STAR = {
  section: 'Kunskapen',
  pavilion: 'gastronomiskateatern' as const,
  medal: 'guld' as const,
  reputationAtLeast: 0.2,
  // ORDER 303b — 0,45 före. Med den lägre uppsidan nådde 0,75 rätt per steg
  // stjärnan i 12–20 % av säsongerna; med 0,42 i 25 % (298b:s mål 20–40 %).
  // ORDER 307b — 0,40 (turisterna i bistro): 0,85 når stjärnan i 78 %, 0,75 i 32 %.
  judgementAtLeast: 0.40,
  minRocketsInWeek: 5,
  weeksToEarn: 3
} as const;

// ORDER 298 (Vision Owner, provspel: "kl. 19.37 med status Rusning var
// krogen tom och kvällskassan stod på 0 kr"). Gästerna fördelas över hela
// kvällen (marknadens tak delat på minuterna med öppna dörrar), och bara de
// som väntar vid dörren när den öppnar (reputation × väder) kommer direkt.
// Med lågt rykte eller dåligt väder stod ingen där, och första gästen kom
// efter en halvtimme (reports/order298/kvallen-fore.json). Minst så här
// många sällskap har bokat till öppningen och står vid dörren.
//   - Klockans etikett: Rusning när trycket i rummet (de som sitter och kön
//     mot platserna, sim/incidents.ts roomPressure) är minst rushPressure;
//     Väntar på gäster när ingen är i rummet; annars Lugnt.
//   - Kvällskassans prognos visas efter forecastAfterMinutes minuters service.
export const OPENING = {
  section: 'Servicen',
  minPartiesAtDoor: 2,
  rushPressure: 0.8,
  forecastAfterMinutes: 30
} as const;

// ORDER 298b (Vision Owner 2026-10-03): "Lågt rykte ska fortfarande ge färre
// gäster, men golvet blir 10 sällskap per kväll." Marknaden ger sina gäster
// som förut; när de inte räcker för att nå golvet i tid kommer fler, så att
// partiesPerEvening sällskap har kommit senast reachBeforeCloseMinutes
// spelminuter före stängningen (strategic/simulation/arrivals.ts
// pacedArrivals). Provsmakningens sällskap räknas inte mot golvet.
//   - Lugn kväll: raden "Lugn kväll: ryktet är ännu lågt i byn" står när
//     ryktet drar ner gästerna (dess del av dragningskraften, rykteskurvan
//     gånger andelen mot byns krogar, är under calmReputationFactorBelow) och
//     kvällen blir tunn: dagens tak gånger ryktets del ger färre gäster än
//     calmSeatsShare av rummets platser. Vinbarens rum tar omkring 30 notor en kväll; en
//     kväll med fler än 15 väntade gäster fylls rummet ändå, och
//     provsmakningen gav där ingenting (reports/order298b/kvallarna.json).
export const GUEST_FLOOR = {
  section: 'Ekonomin > Marknaden',
  partiesPerEvening: 10,
  reachBeforeCloseMinutes: 90,
  calmReputationFactorBelow: 1,
  calmSeatsShare: 0.75
} as const;

// ORDER 298b (Vision Owner 2026-10-03): satsningen "Provsmakning på torget".
// "Den kostar pengar … ger fler sällskap samma kväll. Effekten växer med
// spelarens medaljer i Stensöta och Kalastorget." Sällskapen kommer utöver
// marknaden, jämnt över kvällen fram till samma tid som golvet: baseParties
// och partiesPerMedalStep för varje medaljsteg (brons 1 … platina 4) i
// paviljongerna.
// Priset: en lugn kväll ger provsmakningen omkring 820 kr mer i kvällskassan
// med brons i Stensöta och 1 070 kr med silver; en kväll som fylls ändå
// omkring 240–370 kr (reports/order298b/kvallarna.json summary). Med 600 kr lönar den
// sig lite en lugn kväll, mer med medaljerna, och inte när rummet fylls ändå.
export const TASTING = {
  section: 'Ekonomin > Marknaden',
  activityId: 'square-tasting',
  costSek: 600,
  baseParties: 2,
  partiesPerMedalStep: 1,
  pavilions: ['stensota', 'kalastorget'] as readonly ('stensota' | 'kalastorget')[]
} as const;

// ORDER 299 (Vision Owner 2026-10-03, Designs leverans D1 §5 och §7):
// gästernas stämning. Läget kommer ur gränserna nedan (under gränsen gäller
// nästa läge, sämst missnöjd). Gränserna är satta mot en vanlig kväll (vecka 2,
// mån/ons/fre): gästernas nöjdhet ligger i median på 0,72 (startvärdet), 10 %
// under 0,48 och 10 % över 0,87. En ny gäst är därför nöjd; glad är samma gräns
// som rummets glada gäster (reputation.ts HAPPY_THRESHOLD).
//
// ORDER 299b (Vision Owner 2026-10-04): "Stämningen ska kunna lyftas av
// kunskap", utan att ekonomins trappa ändras. Stämningen är gästens nöjdhet
// plus ett lyft av raketsvaren (Guest.moodLift), som ekonomin inte läser.
//   - rocket.table: bordet där svaret gällde, rätt och fel;
//   - rocket.witness: de som såg svaret, inom witnessRadiusM från bordet;
//   - rocket.room: spridningen till rummet, ett lyft för rummet självt (alla i
//     rummet, också de som kommer senare; klingar av roomLiftDecayPerGameMinute);
//   - liftDecayPerGameMinute: lyftet klingar av mot noll;
//   - departure: en gäst som går missnöjd (utan mat eller ur kön) sänker de
//     nära (witness) och rummet (room);
//   - liftMax: lyftet stannar inom ±liftMax.
// Kalibrerat i harness (reports/order299b/stamning-*.json): med 0,85 rätt per
// steg stiger rummets läge minst lika ofta som det sjunker, med 0,6 sjunker det
// oftare, och den slarviga får ett otåligt eller missnöjt rum de flesta kvällar.
//   - decayPerGameMinute: väntan i kön (förut service.ts WAITING_SAT_DROP_PER_SEC
//     = 0,007 per simsekund, oförändrad).
//   - Rummets mätare är medelvärdet per sällskap.
export const MOOD_BALANCE = {
  section: 'Servicen > Gästerna',
  threshold: { delighted: 0.85, content: 0.68, waiting: 0.55, impatient: 0.4 },
  // Fel väger omkring dubbelt så tungt som rätt: då lyfter 0,85 rätt per steg
  // rummet och 0,6 sänker det (0,6 × 0,17 − 0,4 × 0,3 < 0).
  rocket: {
    table: { right: 0.15, wrong: -0.3 },
    witness: { right: 0.1, wrong: -0.2 },
    witnessRadiusM: 3.5,
    room: { right: 0.17, wrong: -0.3 }
  },
  // En gäst som går missnöjd (utan mat, eller som ger upp i kön) syns i
  // rummet: de nära sänks witness, rummet room.
  departure: { witness: -0.1, room: -0.02 },
  liftDecayPerGameMinute: 0.0005,
  // Rummets lyft (rocket.room och departure.room) gäller alla i rummet, också de
  // som kommer senare, och står kvar kvällen ut (det börjar på noll varje kväll).
  roomLiftDecayPerGameMinute: 0,
  liftMax: 0.4,
  decayPerGameMinute: 0.014,
  roomWeighting: 'perParty' as 'perParty' | 'perGuest',
  // Rummets läge byter först när medelvärdet gått så här långt förbi gränsen,
  // så att mätaren inte fladdrar när rummet ligger på en gräns.
  roomHysteresis: 0.02,
  // Mätarens fyllning läggs på de fem stegen mellan gränserna (Designs
  // skärmar: fyllningen står mitt i ett steg). Den syns stiga eller sjunka
  // när den flyttat minst så här många steg sedan sist.
  meterVisibleSteps: 0.2,
  // Efter ett raketsvar visar mätaren svarets följd också när den är liten
  // (Designs konsekvensögonblick: mätaren stiger eller sjunker vid 1,25 s).
  meterVisibleStepsAfterAnswer: 0.02
};

export const DOWNGRADE = {
  section: 'Ekonomin > Nedgradering',
  consecutiveNegativeDayEnds: 3, // "under minus veckogolvet vid tre dagsavslut i rad"
  warningDays: 2,                // "två dagars varning i kvällsberättelsen"
  // Vision Owner 2026-09-26 (ORDER 268): "Nedgradering räknas först när
  // kassan är under minus veckogolvet" — golvet är kreditram. Gränsen är
  // så många veckors golv under noll.
  creditLineInWeeksOfFloor: 1,
  // "Vid tvingad nedgradering säljs lokalen för 50 % av inventarievärdet,
  // som blir startkassa i den nya klassen."
  salePriceShareOfInventory: 0.5,
  // Inventarievärdet: speldesignen anger det inte. Startlånet "täcker
  // lokal och inventarier"; inventarierna är hälften av det (F40).
  inventoryShareOfStartLoan: 0.5,
  openQuestion: 'F40'
} as const;

// Vision Owner 2026-09-26 (ORDER 268): "Löner dras bara på servicedagar,
// efter kvällens intäkt. Söndag ingen lön." Speldesign > Ekonomin >
// Nedgradering. Flaggan finns för att regeln ska stå här och inte i logiken.
export const WAGES = {
  section: 'Ekonomin > Nedgradering',
  onlyOnServiceDays: true
} as const;

// Vision Owner 2026-09-26 (ORDER 268): "Efter inget lån ger banken nytt
// lån först efter en hel vecka i Måltidens hus med minst ett prov."
export const NEW_START = {
  section: 'Ekonomin > Lånet',
  daysWithoutBusiness: 7,      // "en hel vecka"
  examsRequired: 1             // "med minst ett prov"
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
  // ORDER 291 (provspel av 4795192) — den första verksamheten är vinbar eller
  // food truck (speldesign > Verksamhetsklasserna, beslut 2026-09-30).
  // Ölkrogen byggs i etapp 8 och erbjuds inte förrän den finns.
  firstChoices: ['vinbar', 'foodtruck'] as readonly BusinessClassId[],
  notYetBuilt: ['olkrog'] as readonly BusinessClassId[],
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
  // Vision Owner 2026-09-26 (ORDER 268): "Uppgradering kräver
  // kontantinsats 25 % av en veckas golv i nya klassen, resten lånas."
  // Insatsen dras ur kassan; lokalen i övrigt täcks av startlånet.
  depositShareOfWeekFloor: 0.25,
  // "ryktet halveras"
  reputationFactor: 0.5
} as const;

// ORDER 271 (Vision Owner, FRAGOR §50): rutan utan verksamhet och pengar
// (Design paket 6, X1) visas när spelaren saknar verksamhet och kassan är
// under minsta insats: en fjärdedel av en veckas golv, som kontantinsatsen
// i ORDER 268. Golvet räknas i den billigaste klass spelaren kan starta,
// med minst de medaljer klassens krav begär (utan medaljer är golvet noll).
export const NO_BUSINESS = {
  section: 'Ekonomin > Lånet',
  minimumStakeShareOfWeekFloor: UPGRADE.depositShareOfWeekFloor
} as const;

// ORDER 268 (F37) — personalen följer verksamheten. Speldesignen säger
// att "personalen får följa med" vid uppgradering, men inte hur många
// en mindre klass bär. Vid nedgradering behåller spelaren de roller
// klassen har plats för och resten slutar; utan verksamhet finns ingen
// personal och inga löner. Vid uppgradering följer alla med och de
// roller som saknas anställs. Food trucken är en lucka mot gatan: en
// kock och en lärling. Restaurang och större har samma lag som vinbaren
// tills deras egna spel byggs (etapp 7–10).
export const TEAM_BY_CLASS = {
  section: 'Verksamhetsklasserna > Uppgradering',
  openQuestion: 'F37',
  roles: {
    vinbar: ['värd', 'servitör', 'kock'],
    foodtruck: ['kock', 'lärling'],
    restaurang: ['värd', 'servitör', 'kock'],
    olkrog: ['värd', 'servitör', 'kock'],
    gastgiveri: ['värd', 'servitör', 'kock'],
    nattklubb: ['värd', 'servitör', 'kock']
  } as Record<BusinessClassId, readonly StaffRole[]>
} as const;

// ---------------------------------------------------------------------
// Servicen
// ---------------------------------------------------------------------

// ORDER 270 — Vision Owners beslut 2026-09-26 efter provspelet: servicen
// görs om till en följd av händelser, och action-knappen tas bort.
// Händelserna står som data i `src/content/incidents/` (händelsebanken).
// ORDER 314 (Anders 2026-10-06, beslut A) — allt sker i situationer:
// "Spelaren väljer inte när hon vill prövas. Situationerna uppstår i rummet."
// Inga egna raketer (Stå för ditt svar är borttagen); kvitt eller dubbelt
// finns kvar inne i varje situation (DOUBLE_OR_NOTHING).
export const SITUATIONS = {
  section: 'Servicen > Händelserna i servicen',
  // "4–6 situationer per kväll, aldrig två samtidigt, och minst 8
  // spelminuter mellan dem." Kvällens antal dras i [min, max] per kväll
  // (sim/incidents.ts planIncidents); kedjade följder räknas in.
  minPerEvening: 4,
  maxPerEvening: 6,
  minGapGameMinutes: 8,
  // De första minPerEvening kommer senast på jämnt fördelade tider i
  // kvällens fönster (sim/incidents.ts maybeOpenIncident); resten upp till
  // kvällens antal mognar ur rummets tryck.
  // "Om spelaren inte svarar tar personalen över med sin egen kompetens,
  // alltså kunskapsområdena från 303": personal utan utbildning inom
  // området klarar det sällan (ungefär 0,4), med utbildning oftare. Klarar
  // de det blir följden successShare av det bästa utfallet, utan krediter,
  // utan potten och utan gästerna som ett rätt svar släpper in: "alltid
  // sämre än vad en kunnig spelare åstadkommer". Klarar de det inte blir
  // det som förut: stegets fel och personalens utfall.
  staffSuccessUntrained: 0.4,
  staffSuccessTrained: 0.65,
  staffSuccessShare: 0.5,
  // Situationens andel av sina följder: kassan (utfallen, bordets
  // merbeställning och mindre nota, avec, dricksen), stämningen och
  // nöjdheten, ryktet, orken och ordet på gatan. Med takten ovan får en
  // vecka omkring 2,5 gånger fler situationer än före ordern
  // (reports/order314/kalib/), och kvällens summa hålls ungefär där den var.
  // Krediterna (potten 1 → 3 → 7) och gästerna som går skalas inte; en
  // skala på krediterna ändrade kassan mindre än 3 % (reports/order314/kalib/). Kalibrerad mot tabellen i
  // ORDER_314_RAPPORT.md.
  effectShare: 0.45
} as const;

export const INCIDENTS = {
  section: 'Servicen > Händelserna i servicen',
  // ORDER 293 — gästen som vinglar (Designs manus 3); nekas han i kväll blir
  // tillsynens steg 3 variant A (sim/incidents.ts inspectionVariant).
  drunkIncidentId: 'vb34-vinglar',
  // ORDER 296 — födelsedagen (vb32), som födelsedagspaketet i butiken gäller.
  birthdayIncidentId: 'vb32-fodelsedagen',
  // ORDER 270 (Vision Owner 2026-09-27): "2–4 raketer per kväll, fler
  // fredag och lördag."
  minPerEvening: 2,
  maxPerEvening: 4,
  optionsMin: 3,               // "3–4 svar"
  optionsMax: 4,
  // Varje händelse är en raket med tre steg i samma sammanhang: "Episteme
  // (vad, 15 s), Techne (hur, 20 s), Phronesis (när och varför, 30 s)."
  // Nedräkningen går i verklig tid.
  stepAxes: ['episteme', 'techne', 'phronesis'] as readonly KnowledgeAxis[],
  // Vision Owner 2026-09-29 (efter rapporterna om felen och kvällens
  // resultat): "episteme 20 sekunder, techne 20 sekunder och phronesis 30
  // sekunder. Omdömet ska ha mest tid." Byggs med ORDER 287a (registret).
  stepSeconds: { episteme: 20, techne: 20, phronesis: 30 } as Record<KnowledgeAxis, number>,
  timeoutCreditPenalty: 1,     // "−1 kredit" när personalen beslutar själv
  // "Fel svar på ett steg ger stegets konsekvens och personalen tar över
  // resten, med sämre utfall." Personalens utfall skalas efter stegen som
  // återstod: fel på episteme ger hela, på techne två tredjedelar, på
  // phronesis en tredjedel. Talen är valda (F43).
  staffShareByFailedStep: [1, 2 / 3, 1 / 3] as readonly number[],
  // ORDER 296b (Vision Owner 2026-10-02: "felsvar ska kosta mindre") — ett
  // fel svars förlust i kassan (stegets följd och personalens utfall) gånger
  // den här andelen. Vinsten av ett rätt svar är oförändrad.
  // ORDER 303 (Anders 2026-10-04: "Följderna är för svaga") — tillbaka till
  // hela förlusten (reports/order303/kalib/V5-*.json).
  wrongCashShare: 1,
  // ORDER 270 (F43) — valda tal.
  openQuestion: 'F43',
  // "fler fredag och lördag": antalet per veckodag, en till under en högtid
  // (inom 2–4).
  perWeekday: { mon: 2, tue: 2, wed: 3, thu: 3, fri: 4, sat: 4, sun: 0 } as Record<Weekday, number>,
  holidayExtra: 1,
  // Kedjade händelser får komma utöver kvällens antal, högst så här många.
  chainExtraMax: 2,
  // En kedjad händelse kommer så här långt efter valet som utlöste den.
  chainDelaySimSeconds: 40,
  // Händelserna läggs jämnt mellan dessa andelar av tiden med öppna
  // dörrar, med lite slump, i bågen öppning → rusning → kris → avslut.
  windowStart: 0.08,
  windowEnd: 0.92,
  jitter: 0.03,
  // ORDER 296c (Vision Owner 2026-10-02): "Raketerna utlöses av det som händer
  // i rummet (de fem händelserna, incidenterna, gästernas situationer), oftare
  // när det är fullt och utan tak på tre per kväll." Ingen plan med ett antal
  // per kväll: i fönstret windowStart–windowEnd mognar en raket med chansen
  // (triggerBase + triggerFull × rummets fullhet) per simsekund, när bankens
  // villkor stämmer (kön, de som sitter, kvällens tid, händelserna), med en
  // paus på minGapSimSeconds efter förra raketen. Rummets tryck = (de som
  // sitter + kön) / platserna, högst pressureMax; chansen växer med trycket i
  // kvadrat, så att ett fullt rum med kö ger klart fler raketer än ett lugnt.
  // Fasen i bågen följer kvällens andel: öppning, rusning från arcRushFrom,
  // kris från arcCrisisFrom, avslut från arcClosingFrom.
  triggerBasePerSimSecond: 0.001,
  triggerFullPerSimSecond: 0.012,
  pressureMax: 1.5,
  minGapSimSeconds: 25,
  arcRushFrom: 0.2,
  arcCrisisFrom: 0.65,
  arcClosingFrom: 0.85,
  // Rummets platser när inget rum är monterat (fullheten).
  fallbackSeats: 20,
  // "Medaljer i den paviljong som hör till stegets axel ger mer tid på
  // just det steget": så här många sekunder per medaljsteg. Från silver
  // stryks dessutom ett fel alternativ i steget (beslutet 2026-09-26).
  extraSecondsPerMedalStep: 5,
  strikeWrongFromMedalSteps: 2,
  // Det bästa svaret i ett steg ger en kredit på stegets axel (quizen efter
  // servicen, som gav krediterna förut, är borttagen).
  bestAnswerCredit: 1,
  // Kvällens bord: platserna i rummet i par; utan sittande gäst ett av
  // så här många bord.
  seatsPerTable: 2,
  fallbackTables: 10,
  // ORDER 271 (Design paket 6, R2/R3): efter ett svar visas rätt och fel i
  // kortet så här många sekunder (verklig tid) innan nästa steg öppnas på
  // full tid, eller kortet stängs.
  revealSeconds: 2.4,
  // ORDER 310b (Anders 2026-10-05: "Det ska dröja, för det är där spänningen
  // finns"; Designs kvitt eller dubbelt, pyramidStake.ts STAKE_MOMENT) —
  // låset och väntan. Ett svar avgörs inte när spelaren trycker: det låses
  // (svaret kan inte ändras, mässingslåset slår igen vid lockSeconds) och
  // avgörs efter verdictSeconds, när gästens reaktion syns. Under väntan står
  // stegets klocka still, och ingenting av svarets följd (rummet, kassan,
  // krediterna, bandet) syns förrän avgörandet kommer. Verkliga sekunder
  // från trycket, som choiceSeconds. Tiden ute avgörs direkt, som förut.
  lockSeconds: 0.9,
  verdictSeconds: 3.8,
  // ORDER 276 (Vision Owner 2026-09-28, provspel): "Raketerna styr
  // gästflödet: fler rätta svar ger fler gäster in i lokalen, som köper
  // mer ur lagret." Varje klarat steg släpper in så här många gäster, och
  // en hel klarad raket så här många till. Ett fel släpper inte in någon.
  // Valda tal (F49).
  // ORDER 303c — 0: bara en klarad raket släpper in en gäst. Stegens gäster
  // vidgade avståndet mellan den som har rätt och den som har hälften rätt
  // (reports/order303c/kalib/G1–G2, S2–S6).
  guestsPerClearedStep: 0,
  guestsOnRocketCleared: 1,
  // ORDER 271 (Vision Owner, FRAGOR §49): vid fel tar den ordinarie
  // personalen i rollen över och lämnar sin uppgift, så att andra bord
  // får vänta synligt. Rollen per steg: kunskapen och hantverket följer
  // spåret (kök → kocken, sommellerie → servitören), omdömet i rummet
  // hör till värden. Så här länge (spelsekunder) är den personen borta
  // från sin uppgift.
  takeoverRole: { kok: 'kock', sommellerie: 'servitör', phronesis: 'värd' } as Record<string, StaffRole>,
  takeoverSimSeconds: 30,
  // Gäster som går efter ett svar går mot samma utgång som i service.ts.
  exitZ: 8,
  // Klockan i händelsernas text och lägen ("20.30").
  minutesPerHour: 60,
  clockDigits: 2,
  // Följden av ett fel val räknas per simulerad minut.
  simSecondsPerMinute: 60
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
  cleanEveningBonus: 3         // "en kväll utan returer": ingen gav upp
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
  // ORDER 273 (Designs leverans 2026-09-28 §3): de sista minuterna före
  // stängning visar klockan "Last orders" och en accentfärgad stapel.
  lastOrdersMinutes: 30,
  stayGameMinutes: { vardaglig: 75, formell: 90 },
  minDiningGameMinutes: 10
} as const;

// ORDER 297 (Designs leverans Byn i kvällsljus): kvällens gång e, 0–1, från
// att byn börjar skymma (servicen börjar) till att den sista krogen har stängt
// och de sista har gått (stängningen plus CLOCK.pickupAfterCloseMinutes).
// Byns krogar stänger när servicen slutar. Presentationen (village/
// villageEvening.ts) läser bara e.
export const VILLAGE_EVENING = {
  section: 'Tiden',
  fromMinute: SITTING.serviceStartHour * 60,
  toMinute: SITTING.serviceEndHour * 60 + CLOCK.pickupAfterCloseMinutes
} as const;

// ORDER 300 §6 (Anders 2026-10-04): "Förberedelsetiden mellan 18.00 och
// dörröppning visar en tydlig rad om vad spelaren kan göra nu […] Om det inte
// finns något att göra kan klockan gå fortare fram till öppning." Under
// förberedelserna gör personalen mise en place; spelaren kan titta på byn.
// Klockan går minst i speedAtLeast (simulation/consequence.ts effectiveSpeed).
export const PREP_TIME = {
  section: 'Tiden',
  speedAtLeast: 4
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
// ORDER 269 — kunskapen i servicen (Vision Owner 2026-09-26): "Låt
// medaljerna verka: Metodköket sänker köksmisstag och kollapsrisk,
// Stensöta höjer intäkt per gäst via dryck, Kalastorget gör att klagande
// gäster oftare stannar, huvudpaviljongen styr personalens tempo." Och:
// "med medaljer i Kalastorget ger det bästa svaret mer". Talen gäller
// per medaljsteg (brons ett, platina fyra) och är kalibrerade mot
// slumpmålet (reports/order269/randomness.json). Speldesign > Servicen.
export const KNOWLEDGE_IN_SERVICE = {
  section: 'Servicen',
  metodkoket: {
    kitchenMistakeCutPerStep: 0.1,   // köksmissar i strömmen (kitchen_slip)
    collapseCutPerStep: 0.1,         // kollapsrisken per tick
    minFactor: 0.4
  },
  stensota: {
    drinkRevenuePerStep: 0.1         // intäkt per betalande gäst
  },
  kalastorget: {
    giveUpSatisfactionCutPerStep: 0.03, // tröskeln för att ge upp i kön sänks
    patienceSecondsPerStep: 10,         // och tålamodet växer
    bestAnswerBonusPerStep: 0.25        // scenariots bästa svar ger mer
  },
  mainPavilion: {
    tempoCutPerStep: 0.05,           // uppgifternas tid för personalen
    minFactor: 0.7
  },
  // Speldesignen: krediterna samlas av varje rätt svar (F15: inga frågor
  // under servicen i v1; F27: ingen avklingning). De fyller rummets
  // `enablers` (ryktets tak, kvalitetens takt) i samma register, på
  // båda axlarna, och sänker dem aldrig.
  credits: {
    enablerPerCredit: 0.02,
    enablerMax: 1
  },
  openQuestion: 'F42'
} as const;

// ORDER 269 — kollapsen, flyttad från strategic/simulation/collapse.ts
// (ordern: "Flytta först kollapsens och vädrets konstanter till
// balance.ts"). Värdena är oförändrade. Sannolikhet per tick (5 Hz):
// golv + (1 − svagaste axeln) × belastning × förstärkning.
// ORDER 296b — en femtedel av talen från ORDER 046. Kvällen i v1 föll ihop
// 22 % av kvällarna för mentorns spelare (reports/order296b/diag-steg2.json),
// mot ORDER 046:s "ett starkt lag i vila ~1 %, ett svagt under tryck ~9 %".
// Förhållandet mellan golvet och trycket är detsamma.
export const COLLAPSE = {
  section: 'Servicen',
  floorPerTick: 0.000006,
  strainGainPerTick: 0.00005,
  reputationDrop: 0.15
} as const;

// ORDER 269 — vädret, flyttat från strategic/simulation/weather.ts.
// Värdena är oförändrade. Band med vikter (en höstkväll), och hur vädret
// påverkar ankomsterna: temperatur 0,75× vid 6 °C till 1,20× vid 21 °C,
// vind 1,0× vid 0,5 m/s till 0,75× vid 10 m/s, nederbörd enligt tabell.
export const WEATHER = {
  section: 'Servicen',
  tempBands: [
    { min: 6, max: 9, weight: 1 },
    { min: 10, max: 13, weight: 3 },
    { min: 14, max: 17, weight: 4 },
    { min: 18, max: 21, weight: 2 }
  ],
  windBands: [
    { min: 0.5, max: 2.0, weight: 4 },
    { min: 2.0, max: 5.5, weight: 4 },
    { min: 5.5, max: 10.0, weight: 2 }
  ],
  precipWeights: [
    { kind: 'none', weight: 7 },
    { kind: 'drizzle', weight: 2 },
    { kind: 'rain', weight: 1 }
  ],
  cloudWeights: [
    { kind: 'clear', weight: 3 },
    { kind: 'partly', weight: 4 },
    { kind: 'overcast', weight: 3 }
  ],
  outdoorMinTempC: 14,
  outdoorMaxWindMS: 5.5,
  arrival: {
    tempColdC: 6,
    tempWarmC: 21,
    tempMultCold: 0.75,
    tempMultSpan: 0.45,
    windStillMS: 0.5,
    windBlusteryMS: 10,
    windMultSpan: 0.25,
    precipMult: { none: 1.0, drizzle: 0.9, rain: 0.75, other: 0.65 }
  }
} as const;

// Vision Owner 2026-09-26 (ORDER 268): "Scenarierna sammanlagt ger
// högst cirka 20 % av en normal veckointäkt i klassen, åt båda hållen.
// Scenarierna ska krydda veckan, inte bära den." Speldesign > Servicen >
// Händelser. Beloppen var förut fasta kronor i strategic/simulation/
// constants.ts (SCENARIO_CASH_DELTA_SEK 6 000) och scenarios.ts
// (cashWrites 3 000 och 2 000), och gav 21 000–36 000 SEK i veckan.
// En enhet = unitShareOfWeeklyRevenue × klassens normala veckointäkt.
// Kvällens tema (ekonomiskt) ger en enhet × valets tecken; valens egna
// kassaskrivningar står i enheter nedan. Med omkring nio svar i veckan
// ger 0,02 per enhet en rimlig vecka nära taket; taket håller summan.
export const SCENARIO_CASH = {
  section: 'Servicen > Händelser',
  weeklyCapShareOfNormalRevenue: 0.2,
  unitShareOfWeeklyRevenue: 0.02,
  choiceUnits: {
    'walk-in-of-five': { A: 0.5 },
    'moral-dilemma': { A: 1 / 3 }
  } as Record<string, Partial<Record<'A' | 'B' | 'C', number>>>
} as const;

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
  reviewerReputationChange: 5,
  // ORDER 296 (kärnan punkt 3, "recensenten skriver i tidningen") — under
  // gränsen kommer recensenten ändå ibland: chansen en kväll är bas + ryktet
  // gånger perReputation (omkring en gång i veckan vid ryktet 0,45).
  reviewerChanceBase: 0.06,
  reviewerChancePerReputation: 0.2
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
      evidence: { eveningLessonEvenings: 10, weakestAxisImproved: true } },
    { id: 'professionell', medals: [{ level: 'guld', count: 3, including: [] }],
      evidence: { consecutiveWeeksAboveFloorWithoutTopUp: 2, eveningsTurnedByIncidents: 5 } },
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

// ORDER 275 — lagret är insatsen (Vision Owner 2026-09-28, provspel).
// Paketen och deras innehåll står i strategic/simulation/packages.ts.
// Valda tal (F48).
export const STOCK = {
  section: 'Servicen > Lagret',
  openQuestion: 'F48',
  // Varje gäst tar en dryck till rätten, och ett andra glas med den här
  // sannolikheten.
  secondDrinkChance: 0.5,
  // ORDER 291 (Vision Owner 2026-09-30: "Varna när spelaren köper mer än
  // dubbelt så mycket som behövs, både mat och dryck"). Behovet är en
  // varmrätt per väntad gäst och 1 + secondDrinkChance glas per gäst.
  overBuyFactor: 2,
  // ORDER 291 — baspaketet följer kvällens bokning: portioner per väntad
  // gäst (rätter och efterrätter), högst paketets storlek och minst en av
  // varje. Utan det gav baspaketet en lugn måndag mer än dubbelt behovet.
  baseCoversPerGuest: 1.3
} as const;

// ORDER 277 — morgonen är insatsen (Vision Owner 2026-09-28, andra
// provspelet): "Menyn och dryckeslistan (viner på glas och flaska, öl,
// alkoholfritt) och mängder måste sättas innan servicen kan starta."
// ORDER 296b — mise en place under kvällen. Förbrukningen per gäst
// (mepConsumption.ts) var kalibrerad för en lunch med omkring 15 gäster
// (ORDER 117); kvällen i v1 har fler, och servetterna, besticken och
// garnityret tog slut efter en tredjedel av gästerna (reports/order296b/
// nojdhet.json, diag-ready.json). Förbrukningen skalas nu med kvällens
// bokning, så att ett förberett kök räcker kvällen.
export const MEP_EVENING = {
  section: 'Servicen',
  calibratedGuests: 15
} as const;

// Servicen startar när minst så här många rätter och drycker finns i
// lager (speldesignen, att bekräfta: mängden är spelarens sak).
export const MORNING_STAKE = {
  section: 'Servicen > Lagret',
  openQuestion: 'F50',
  minDishesToOpen: 1,
  minDrinksToOpen: 1,
  // Kassan räknas ner (och upp) så här länge i gränssnittet, i ms, och
  // förändringar från så här många kronor visas bredvid beloppet.
  cashTickMs: 700,
  cashDeltaMinSek: 20,
  // ORDER 296 (punkt 6, "spelet får inte öppna utan råvaror utan att stoppa
  // och fråga"): räcker lagret till färre än den här andelen av de bokade
  // gästerna stannar spelet och frågar innan dörrarna öppnas.
  askBelowCoverShare: 0.5
} as const;

// ORDER 279 — frågorna och insatsen (Vision Owner 2026-09-28, andra
// provspelet). Speldesign > Servicen > Händelserna i servicen och
// > Insatsen. Valda tal (F52). Insatsen ersattes i ORDER 280 (BACK nedan).
// ORDER 286a — servicen som teater (Designs leverans 2, teaterns grund;
// Vision Owner 2026-09-29). Raketen börjar i rummet: figuren spelar sitt
// raketklipp först, och raketkortet öppnas efter det. Längderna är klippens
// vid normalt tempo (figureClips.ts; ett test kräver att de är lika). Gången
// mot köket spelas lika länge som frågan. Kameran glider in mot figuren till
// distanceM och tillbaka efter svaret. Tempot per anställd följer trycket
// (regissörens stress 0..1): lugnt under calmBelow, stressat från
// stressedFrom.
export const THEATRE = {
  section: 'Servicen > Servicen som teater',
  rocketIntroSeconds: { cutHand: 3.4, smellWine: 4, askPointMenu: 4, walkToKitchen: 4 } as Record<'cutHand' | 'smellWine' | 'askPointMenu' | 'walkToKitchen', number>,
  // ORDER 293 — händelserna som teater (Designs handelserManus.js, takterna
  // `card`): när manuset ställer varje fråga, i sekunder från raketens start.
  // Kortet väntar på uppbyggnaden (introt) och på scenen mellan stegen
  // (svarets visning), så att frågan kommer när scenen har kommit dit.
  eventAskSeconds: {
    'vb32-fodelsedagen': [9.5, 16, 32.5],
    'vb33-vasen': [7, 15, 31],
    'vb34-vinglar': [7, 14.5, 26],
    'vb35-tillsynen-a': [14.5, 22, 38.5],
    'vb35-tillsynen-b': [14.5, 22, 38.5],
    'vb35-tillsynen-c': [14.5, 22, 38.5],
    'vb35-tillsynen-d': [14.5, 22, 38.5],
    'vb36-passet': [7.2, 14.5, 27.5]
  } as Record<string, readonly number[]>,
  camera: { distanceM: 12, glideInSeconds: 1.2, glideOutSeconds: 1.0 },
  /** Bildtexten står så högt över figurens fötter (ovanför huvudet). */
  captionHeightM: 2.1,
  /** Gästen som går mot köket hinner så stor del av vägen till passet under introt. */
  kitchenWalkShare: 0.6,
  tempo: { calmBelow: 0.34, stressedFrom: 0.67 },
  // ORDER 290 — linjen från ringen till uppgiften (ringens mått och färger
  // står i Designs scene/staffRing.ts): streck och mellanrum i meter.
  staffLine: { dashM: 0.18, opacity: 0.55 }
} as const;

export const MENU_ROCKETS = {
  section: 'Servicen > Händelserna i servicen',
  openQuestion: 'F52',
  // "Raketer där gäster frågar om kvällens rätter och drycker, utifrån
  // menyn och dryckeslistan." När en sådan raket kan komma väljs den med
  // den här sannolikheten framför bankens övriga. Menyraketerna är lugnare
  // än bankens övriga (inga gäster som går eller kommer); med 0,5 gav
  // ingen upp i kön en fredag i vecka 2 (order267Pressure), med 0,35 två.
  share: 0.35,
  // "Rätt svar ger högre dricks": varje klarat steg höjer dricksen hos
  // bordets gäster med så här stor andel av notan, och en hel raket med
  // så här mycket till. Gäller alla raketer.
  // ORDER 303b (Anders 2026-10-05: "sänk belöningen för rätt svar") —
  // hälften av förut (0,03 och 0,04; reports/order303b/kalib/V3).
  tipBonusPerClearedStep: 0.015,
  tipBonusOnRocketCleared: 0.02
} as const;

// ORDER 280 — Back your knowledge (Vision Owner 2026-09-29, Designs B1):
// spelaren startar själv en raket, högst så här många per kväll.
// ORDER 305b (Anders 2026-10-05) — säkerheten (Gissar / Tror det / Vet det)
// med sin skala och stegens multiplikator är borttagen: kvitt eller dubbelt
// (DOUBLE_OR_NOTHING) ersätter den i både de egna och de planerade
// raketerna. Valet att gå vidare är säkerheten.
export const BACK = {
  section: 'Servicen > Insatsen',
  openQuestion: 'F53',
  maxPerEvening: 3
} as const;

// ORDER 305 — kvitt eller dubbelt (förslag för beslut, Designs tillägg till
// D5; beslutat 2026-10-05, ORDER 305b). Efter ett rätt steg som inte är det sista
// väljer spelaren: stanna och ta potten, eller satsa den på nästa steg.
// Potten är raketens krediter för bästa svar (med potHoldsCash också bordets
// merbeställning i kronor). Ett rätt steg efter att spelaren gått vidare ger
// potten gånger growth plus stegets egen vinst; ett fel tar hela potten. Den
// som stannar behåller potten, och händelsen slutar där (med
// stopTakesStaffOutcome tar personalen resten med sitt utfall för stegen som
// återstod). Ryktet, gästerna som kommer in, dricksen och stämningen följer
// varje svar som förut: de är rummets reaktion och går inte att ta tillbaka.
// Valet har choiceSeconds verkliga sekunder; när tiden går ut stannar
// spelaren. Förvalen är förslag B (reports/order305: A gav de bästa spelarna
// 133 000–147 000 kr, och den som stannade stängde krogen).
export const DOUBLE_OR_NOTHING = {
  section: 'Servicen > Händelserna i servicen',
  // ORDER 305b (Anders 2026-10-05): förslag B påslaget.
  enabled: true,
  growth: 2,
  potHoldsCash: false,
  // Den som stannar: personalen tar resten med sitt utfall för stegen som
  // återstod (true), eller händelsen slutar där utan mer följd (false).
  stopTakesStaffOutcome: false,
  choiceSeconds: 8,
  // ORDER 305b (Anders 2026-10-05): en raket där spelaren stannar efter
  // steg 2 räknas som klarad i stjärnans andel; efter steg 1 räknas den inte.
  stopCountsAsClearedFrom: 2
};

// ORDER 278 — servicen syns (Vision Owner 2026-09-28, andra provspelet).
// Speldesign > Servicen > Händelseströmmen och > Lagret. Valda tal (F51).
export const SERVICE_STREAM = {
  section: 'Servicen > Händelseströmmen',
  openQuestion: 'F51',
  // Dricksen: andel av notan efter gästens nöjdhet när hen betalar.
  // Nöjdheten på 0–1; under lägsta gränsen ingen dricks.
  tipBands: [
    { minSatisfaction: 0.8, share: 0.12 },
    { minSatisfaction: 0.6, share: 0.06 },
    { minSatisfaction: 0.45, share: 0.02 }
  ] as readonly { minSatisfaction: number; share: number }[],
  // Gästen som ville ha en rätt som tagit slut och fick en annan: så här
  // mycket sjunker nöjdheten (0–1).
  soldOutSatisfaction: -0.15,
  // Slumpens händelser: mellan så här många per kväll, utspridda över
  // tiden med öppna dörrar.
  chanceMin: 2,
  chanceMax: 6,
  // Kvällens intäkt per service förs i tusental kronor (serviceRevenueToday).
  sekPerKsek: 1000,
  // Händelsernas vikt (hur ofta var och en kommer) och verkan.
  chance: {
    glassBroken: { weight: 3, glasses: 1 },
    regularRound: { weight: 2, glasses: 3 },
    birthday: { weight: 1, bottles: 1 },
    walkIns: { weight: 2, guests: 2 },
    neighbour: { weight: 1, satisfaction: -0.04 },
    goodWord: { weight: 1, satisfaction: 0.05 }
  }
} as const;

// ORDER 278 — svinnet kostar (Vision Owner 2026-09-28, andra
// provspelet): "Svinn räknas efter kvällen, en del kan användas nästa
// dag, resten hämtas av sopbilen mot en miljöavgift som växer med
// råvarans pris och mängd." Valda tal (F51).
export const WASTE = {
  section: 'Servicen > Lagret',
  openQuestion: 'F51',
  // Andel av den osålda maten som går att använda nästa dag, per råvara.
  // Det som inte står här blir svinn helt (färsk fisk, örter, sallad).
  carryShare: { 'root-veg': 0.75, lentils: 1, flour: 1, eggs: 0.75, dairy: 0.5, chicken: 0.5, pork: 0.5, lamb: 0.5, game: 0.5, mushrooms: 0.5, berries: 0.5 } as Record<string, number>,
  // ORDER 280 (Designs leverans kassan och kvällen, S1, Vision Owner
  // 2026-09-29): sopbilen tar betalt per kilo plus en hämtningsavgift, och
  // kilona räknas i fyra fraktioner. Talen är Designs (economy.ts WASTE).
  feePerKg: 2.9,
  pickupFeeSek: 420,
  // Osåld mat: kilo per ingrediensenhet, efter enhet (en portion, en nypa
  // örter, ett ägg).
  kgPerUnit: { portion: 0.22, pinch: 0.005, egg: 0.06 } as Record<string, number>,
  // Tallrikssvinn per serverad rätt, och minst så här mycket en kväll.
  plateKgPerServed: 0.06,
  plateKgMin: 3,
  // Glas: tomma flaskor (vin och alkoholfritt i flaska).
  kgPerBottle: 0.55,
  // Kartong och papper från morgonens leveranser, när något köpts.
  cardboardKg: 11,
  // Rådet efter kvällen: minst så här många osålda portioner, avrundat
  // nedåt till ett parti.
  adviceMinPortions: 3
} as const;

// ORDER 280 — morgonens inköp i partier (Designs leverans kassan och
// kvällen, M1, Vision Owner 2026-09-29): ett klick köper ett parti. Rätter
// i portioner, vin och alkoholfritt i flaskor (fem glas), öl i flaskor
// (ett glas). En hel flaska kostar gästen glasen gånger bottleDiscount.
export const ITEM_BATCH = {
  section: 'Servicen > Lagret',
  openQuestion: 'F53',
  dish: 5,
  bottle: 2,
  beer: 6,
  bottleDiscount: 0.9,
  // Lagret under servicen (Designs L1): Snart slut vid högst så stor andel
  // av kvällens start eller högst så många portioner, och i baren vid högst
  // en flaska kvar (glas).
  lowShare: 0.2,
  lowMinPortions: 3,
  lowGlasses: 5
} as const;

// ORDER 277 — gästerna har kost och plånbok (Vision Owner 2026-09-28,
// andra provspelet): "Gästerna får kost (till exempel vegetarian, vegan,
// allergi) och plånbok. Saknas ett alternativ tappar man försäljning och
// rykte, och ett sällskap kan lämna." Valda tal (F50).
export const GUESTS = {
  section: 'Servicen > Gästerna',
  openQuestion: 'F50',
  // Andel av gästerna med varje kost; resten äter allt.
  dietShare: { vegetarian: 0.12, vegan: 0.05 },
  // Andel med en allergi (oberoende av kosten).
  allergyShare: { lactose: 0.08, gluten: 0.05 },
  // Andel som inte dricker alkohol.
  noAlcoholShare: 0.12,
  // Plånboken per sällskap: andel och vad en gäst högst betalar för rätt
  // och dryck, i kronor.
  walletShare: { tight: 0.3, normal: 0.5, generous: 0.2 },
  // ORDER 287a — miljardärens plånbok (gold) och smak: det dyraste.
  walletSek: { tight: 300, normal: 520, generous: 1100, gold: 8000 },
  // Så mycket av plånboken går högst till rätten; resten till drycken.
  dishShareOfWallet: 0.7,
  // Smaken för pris: vikten för en rätt är pris upphöjt till detta.
  // Den snåla väljer billigt, den generösa dyrt.
  priceTaste: { tight: -1, normal: 0, generous: 1, gold: 4 },
  // Ett generöst sällskap med minst två gäster beställer en flaska med
  // den här sannolikheten, när flaskan finns. Flaskan räcker till bordet.
  bottleChance: 0.6,
  minPartyForBottle: 2,
  // Saknas ett alternativ för gästen (kost, allergi, alkoholfritt eller
  // plånbok): ryktet sjunker så här mycket (skala 0–1), och sällskapet
  // går med den här sannolikheten.
  missingOptionReputation: 0.02,
  missingDrinkReputation: 0.01,
  partyLeavesChance: 0.5,
  // Nöjdheten hos gästen som bara fick en dryck (plånboken räckte inte).
  drinkOnlySatisfaction: -0.2
} as const;

// ORDER 287a — gästerna med kapital (speldesign > Servicen > Gästerna,
// Vision Owner 2026-09-29 och 2026-09-30). Varje gäst har en typ med eget
// ekonomiskt och socialt kapital. Typen ger plånboken (GUESTS.walletSek),
// hur länge gästen sitter och vad hen förväntar sig. Färgerna står i
// Designs WARM.guest. Talen är valda (F57) och prövade mot hyrans mål för
// den rimliga spelaren (RENT.reasonableResultShare, ORDER_287a_RAPPORT.md):
// med sittiden 1,4 och förväntan −0,08 föll andelen från 8,2 % till 3,7 %.
export const GUEST_TYPES = {
  section: 'Servicen > Gästerna',
  openQuestion: 'F57',
  // Plånboken per typ (nycklar i GUESTS.walletSek).
  // ORDER 307 — turisterna, gourmeterna och affärsfolket (konceptet och varukorgen).
  wallet: { student: 'tight', middle: 'normal', high: 'generous', social: 'normal', billionaire: 'gold', tourist: 'normal', gourmet: 'generous', business: 'generous' },
  // ORDER 291 (provspel av 4795192: "Gästtyperna betalar lika") — i klasserna
  // utan lagerpaket (food truck, ölkrogen) väljer gästen ur menyn utan
  // plånbok; notan gånger detta per plånbok. Med andelarna 0,2/0,55/0,25
  // blir snittet 1,05.
  legacyBillFactor: { tight: 0.8, normal: 1, generous: 1.35, gold: 3 },
  // Sittiden gånger detta: studenten tar platsen en lång stund.
  stayFactor: { student: 1.25, middle: 1, high: 1, social: 1, billionaire: 1, tourist: 1, gourmet: 1, business: 1 },
  // Nöjdheten vid ankomst plus detta: höginkomsttagaren förväntar sig mer.
  satisfactionOffset: { student: 0, middle: 0, high: -0.05, social: 0, billionaire: -0.05, tourist: 0, gourmet: -0.05, business: -0.05 },
  // Bokningsboken: andelen av kvällens väntade gäster per typ (studenter,
  // medelinkomst, höginkomst) efter rummet. Resten av klasserna läser
  // `default`. Andelen utan bokning står i walkInShare.
  share: {
    default: { student: 0.2, middle: 0.55, high: 0.25 },
    ölkrogen: { student: 0.4, middle: 0.45, high: 0.15 }
  } as Record<string, { student: number; middle: number; high: number }>,
  walkInShare: 0.15,
  // När typen brukar komma, i spelminuter efter att servicen börjat
  // (18.00). Före den tiden kommer inga bokade gäster av typen.
  arrivesAfterMinutes: { student: 0, middle: 30, high: 60, social: 90, billionaire: 120, tourist: 30, gourmet: 60, business: 60 },
  // ORDER 307 (ORDER 304 §4, Anders 2026-10-05) — betalningsviljan ovanpå
  // plånboken (notan gånger detta när gästen betalar; gourmeterna och
  // affärsfolket har den generösa plånboken), och förlåtelsen: ett fel svars
  // rykte inom kvällens koncept gånger detta, efter bordets gästtyp.
  payFactor: { student: 1, middle: 1, high: 1, social: 1, billionaire: 1, tourist: 1.1, gourmet: 1, business: 1 },
  forgiveness: { student: 0.6, middle: 1, high: 1, social: 1, billionaire: 1, tourist: 1, gourmet: 1.8, business: 1.4 }
} as const;

// ORDER 307 (ORDER 304, Anders 2026-10-05: förslaget godkänt i sin helhet) —
// konceptet ur varukorgen. Konceptet (enkel, bistro, soigné) räknas när
// dörrarna öppnar ur det som står på menyn i kväll: varornas nivå, vägd med
// värdet (portioner kvar × pris), och utrustningen i rummet som lyfter mot
// sin nivå (equipmentWeight per sak). Gränserna på skalan 0–2.
//   - Gästblandningen per koncept: byns tre grupper (studenter, medel och de
//     betalningsstarka), och vid vår dörr blir en del av medelgruppen turister
//     och de betalningsstarka gourmeter eller affärsfolk.
//   - Ryktet per koncept (state.reputationByTier) flyttas av varje svar i
//     kvällens koncept (felen gånger gästernas förlåtelse) och drar mot
//     krogens rykte varje dag. De betalningsstarka kommer fullt när konceptets
//     rykte är minst highFullAt; under det i proportion, och platsen går till
//     studenter och bybor.
//   - Bistro har dagens blandning, så att baspaketet (bistro) spelar som förut.
export const CONCEPT = {
  section: 'Verksamhetsklasserna',
  tierValue: { enkel: 0, bistro: 1, soigne: 2 },
  bistroFrom: 0.6,
  soigneFrom: 1.4,
  equipmentWeight: 0.15,
  share: {
    enkel: { student: 0.4, middle: 0.5, high: 0.1 },
    bistro: { student: 0.2, middle: 0.55, high: 0.25 },
    soigne: { student: 0.05, middle: 0.35, high: 0.6 }
  },
  // ORDER 307b (Anders 2026-10-05: "Låt turisterna komma till bistron") — 0,3.
  touristOfMiddle: { enkel: 0.1, bistro: 0.3, soigne: 0.3 },
  gourmetOfHigh: { enkel: 0.3, bistro: 0.5, soigne: 0.55 },
  // Per koncept: krogarnas rykte ligger omkring 0,3 för den som svarar väl
  // (reports/order303c); soigné kräver mest.
  // Bistro 0: med 0,2 kom färre krävande gäster till den som alltid svarar
  // fel, och den blev 1:a en kväll vecka 3. Konceptets rykte styr soigné.
  // ORDER 307b — soigné 1,0: de betalningsstarka kommer i proportion till
  // soigné-ryktet, så att den som svarar fel i soigné tappar dem.
  highFullAt: { enkel: 0, bistro: 0, soigne: 1 },
  // ORDER 307b (Anders 2026-10-05: "varje koncept ska gå att driva för den
  // som kan"; spakar: lägre personalkostnad och billigare varor i enkel,
  // högre pris och betalningsvilja i soigné). Personalens dagslön gånger
  // wageFactor efter kvällens koncept; varornas inköpspris gånger
  // goodsCostFactor efter varans nivå; notan gånger billFactor efter kvällens
  // koncept (reports/order307b/kalib).
  // Kalibrerat mot Anders mål (reports/order307b/kalib/B0–V11b, slutkörningen i efter/).
  // Soigné har dyrare råvaror och mer personal (fler händer vid borden) men
  // högre notor; notan skalar med intäkten och gynnar den som kan.
  // ORDER 311 (säsongens sista bokslut räknas) — kalibrerat igen (reports/order311/kalib/W1–Z2).
  // ORDER 311b (Anders 2026-10-06): bistrons personal tillbaka mot 1,0 (0,96), så att
  // den som har 0,85 rätt slutar på 90 000–100 000 kr (reports/order311b/kalib).
  // ORDER 314 — med situationernas takt (4–6 per kväll) tjänar bistron och
  // soigné mer: bistro 0,96 → 1,04 och soigné 1,4 → 2,1, så att bistro med
  // 0,85 och soigné med 0,85 åter ligger i sina mål (reports/order314/kalib/,
  // ORDER_314_RAPPORT.md).
  wageFactor: { enkel: 0.71, bistro: 1.04, soigne: 2.1 },
  goodsCostFactor: { enkel: 0.81, bistro: 1, soigne: 1.8 },
  // Soigné 1,68: soigné med 0,85 tjänar minst 10 % mer än den kloka i bistron.
  billFactor: { enkel: 0.94, bistro: 1.005, soigne: 1.68 },
  // Ett fel svars förlust i kassan gånger detta (304: hårdare följder av fel i högre klass).
  wrongFactor: { enkel: 0.75, bistro: 1, soigne: 1.5 },
  // ORDER 311 — rummets mindre beställningar efter fel svar (CONSEQUENCES.moodBillPerLift)
  // gånger detta efter kvällens koncept.
  // ORDER 314 — enkel 0,4 → 0,15: med situationernas takt stängde enkel med
  // 0,6 rätt nästan alla säsonger (målet 30–55 %, reports/order314/kalib/).
  moodDownFactor: { enkel: 0.15, bistro: 1, soigne: 1.25 },
  // ORDER 307b — 0,05 (förut 0,1): konceptets rykte minns längre.
  reputationDriftPerDay: 0.05
} as const;

// ORDER 307 (ORDER 304 §6) — krogens leverantörer. Grossisten är öppen från
// start; de andra öppnas med en medalj och krediter i butiken. Varorna är
// rätter och drycker i morgonens inköp (frågorna per vara väntar på ORDER 306).
// Cigarrerna står i vinhandlarens lista men säljs först med humidorn och
// dess händelse.
export const GOODS_SUPPLIERS = {
  section: 'Verksamhetsklasserna',
  fiskaren: { pavilion: 'metodkoket', medal: 'brons', credits: 20 },
  vinhandlaren: { pavilion: 'stensota', medal: 'silver', credits: 40 },
  ostaffinoren: { pavilion: 'kalastorget', medal: 'brons', credits: 30 },
  charkuteristen: { pavilion: 'metodkoket', medal: 'silver', credits: 40 }
} as const;

// ORDER 307 (ORDER 304 §6) — utrustningen köps för kassan när medaljen öppnat
// den, står i rummet och lyfter konceptet mot sin nivå. Avecvagnen öppnar avec
// (Anders 2026-10-05: "Avec kommer tillbaka som något man investerar i"):
// när raketen klaras stannar bordet för avec, avecShare av notan. Händelserna
// som utrustningen öppnar (flambering, ostvagnen …) kommer med frågorna i ORDER 306.
export const EQUIPMENT = {
  section: 'Verksamhetsklasserna',
  // ORDER 304 §6: "Krediterna köper tillgången, och kassan köper saken" —
  // credits öppnar (en gång), priceSek köper.
  // ORDER 307b — förmågan Vinkylen är borttagen; utrustningen ger dess verkan:
  // nöjdheten hos den som dricker vin (satisfaction).
  vinkyl: { tier: 'soigne', priceSek: 15000, pavilion: 'stensota', medal: 'brons', credits: 20, satisfaction: 0.04 },
  flamberingsvagn: { tier: 'soigne', priceSek: 12000, pavilion: 'metodkoket', medal: 'silver', credits: 40 },
  ostvagn: { tier: 'bistro', priceSek: 9000, pavilion: 'kalastorget', medal: 'silver', credits: 30 },
  avecvagn: { tier: 'bistro', priceSek: 8000, pavilion: 'stensota', medal: 'silver', credits: 30, avecShare: 0.2 },
  humidor: { tier: 'soigne', priceSek: 14000, pavilion: 'stensota', medal: 'guld', credits: 60 }
} as const;

// ORDER 290 — kvällens ekonomi (Vision Owner 2026-09-30, provspel):
// kvällskassan från noll, kvällens insats när dörrarna öppnas (råvaror,
// personal, DJ, satsningar, kompetens) och linjen för break-even; efter
// servicen täckningsbidrag, täckningsgrad och resultat som överförs till
// företagskontot, och prognosen i veckor. Valda tal (F58).
export const EVENING_ECONOMY = {
  section: 'Ekonomin > Hyran och lönerna',
  openQuestion: 'F58',
  // DJ som satsning: kostnaden, och fler gäster i kväll (marknadens tak
  // gånger 1 + djGuestShare). Lönar sig en fullsatt kväll, inte en lugn.
  djCostSek: 1500,
  // ORDER 296b — DJ:n drar inte längre fler gäster: en full kväll vänder dem
  // vid kön, och en lugn kväll betalade de DJ:n (reports/order296b/steg4.json).
  djGuestShare: 0,
  // ORDER 296b (Vision Owner 2026-10-02: "DJ och springare ska löna sig när
  // de används klokt … men inte när de används varje kväll"). DJ:n börjar
  // spela 21.00, och då beställer varje gäst som sitter ett glas till (den
  // sena rundan): det lönar sig när rummet är fullt, inte en lugn kväll.
  djFromMinute: 21 * 60,
  // Varje gäst tar den första drycken i listan som finns i lagret; vinet
  // för DJ-kvällen köps till på morgonen (tillägget med husets vin).
  djRoundDishIds: ['house-wine-glass', 'beer-pairing', 'fine-wine-glass', 'alcohol-free-glass'] as readonly string[],
  djRoundGlassesPerGuest: 1,
  // Musiken drar mest när den är något särskilt: de första DJ-kvällarna i
  // veckan ger hela rundan, därefter beställer den här andelen av gästerna.
  djFullRoundsPerWeek: 2,
  djLaterRoundShare: 0.4,
  djWinePackageId: 'vinbar-house-wine',
  // Springaren: personalens uppgifter vid borden (ta upp beställningen,
  // bära ut och duka av) tar den här andelen av tiden. Borden blir lediga
  // tidigare och kön kortare; det lönar sig vid stor bokning.
  runnerActivityId: 'runner-shift',
  runnerTableTaskTime: 0.6,
  // Springarens pris för en kväll: lönar sig vid stor bokning (torsdag–
  // lördag), inte en lugn kväll (reports/order296b/steg5.json).
  runnerCostSek: 1200,
  // Satsningar som räknas som kompetens i kvällens insats.
  competenceActivities: ['train-service', 'wine-tasting'] as readonly string[],
  // Kortet med kvällens insats står så här länge (verkliga sekunder).
  stakeCardSeconds: 9,
  // Prognosen räknas på så här många av de senaste kvällarna.
  forecastEvenings: 6
} as const;

// ORDER 290 — svarens följd i rummet (Vision Owner 2026-09-30): rätt svar
// ger fler gäster (INCIDENTS.guestsPerClearedStep) och högre nota vid
// bordet; fel svar ger lägre nota, missnöjda gäster och gäster som går.
// Valda tal (F58).
export const ANSWER_EFFECTS = {
  section: 'Servicen > Händelserna i servicen',
  openQuestion: 'F58',
  rightBillShare: 0.06,
  wrongBillShare: -0.06,
  wrongSatisfaction: -0.08,
  wrongGuestsLeave: 1,
  // Hur länge händelsen står över bordet i rummet (spelsekunder).
  reactionSimSeconds: 6,
  // ORDER 292 (Vision Owner 2026-10-01: "raketkortet visar vad som står på
  // spel i kronor och gäster") — en gäst som inte har beställt än räknas
  // med kvällens snittnota, och utan notor i kväll med det här beloppet.
  stakeDefaultBillSek: 350,
  // ORDER 292 (provspel av 316b4c3: "gästen beställer mer, beloppet flyger
  // till kvällskassan") — ett rätt svar: bordet beställer ett glas till av
  // den här drycken, ur lagret och till listans pris. Finns den inte i lagret
  // gäller rightBillShare av bordets nota.
  rightExtraDishId: 'house-wine-glass'
} as const;

// ORDER 303 D (Anders 2026-10-04, provspel: "Fel svar slutar nästan alltid
// med att gästen går utan att betala … borde få fler och mer varierade
// följder") — följden av ett svar efter hur allvarligt felet är. Graden läses
// ur raketens egen data: felets nöjdhetseffekt (fail.effects.satisfaction),
// eller grovt om felet skickar ut gäster (fail.room.leave) eller kostar
// ryktet (fail.effects.reputation ≤ graveReputationAtMost).
//   - lätt: mindre dricks;
//   - medel: bordet beställer mindre (ingen flaska till, ingen dessert), gästen
//     klagar och personalen lägger tid på att lugna (orken sjunker);
//   - grovt: gästen går utan att betala (som ORDER 292 gjorde vid varje fel).
// Rätt svar har skalan uppåt: mer dricks per klarat steg, en flaska till, och
// när raketen klaras med säkerheten "vet det" stannar bordet för avec.
// reputation är poäng på skalan 0–100 och går till morgonens recension.
// ORDER 303 C — samma kväll sprids ordet till gatan: varje fel svar sänker
// krogens dragningskraft för sällskapen som inte valt än (street), varje
// klarad raket höjer den; ordet klingar av under kvällen.
export const CONSEQUENCES = {
  section: 'Servicen > Händelserna i servicen',
  graveSatisfactionAtMost: -0.2,
  mediumSatisfactionAtMost: -0.1,
  graveReputationAtMost: -2,
  wrong: {
    mild: { tipShare: -0.1, billShare: 0, satisfaction: -0.04, reputation: -1.5, staffMorale: 0 },
    medium: { tipShare: -0.1, billShare: -0.5, satisfaction: -0.08, reputation: -3, staffMorale: -0.03 },
    // tableShareLeaving: andelen av bordet som går utan att betala (minst en gäst).
    grave: { tipShare: 0, billShare: 0, satisfaction: -0.08, reputation: -6, staffMorale: -0.05, tableShareLeaving: 1 }
  },
  right: {
    stepReputation: 0.3,
    clearedReputation: 1,
    // ORDER 303b — 0,2 före (reports/order303b/kalib/V3). ORDER 303c — 0.
    avecShare: 0
  },
  street: { perWrong: -0.08, perCleared: 0.04, min: -0.4, max: 0.2, decayPerGameMinute: 0.004 },
  // ORDER 303 B — notan följer kunskapens lyft i stämningen (MOOD_BALANCE:
  // gästens moodLift och rummets roomMoodLift, inom ±liftMax): notan gånger
  // 1 + moodBillPerLift × lyftet när lyftet är negativt, och
  // 1 + moodBillPerLiftUp × lyftet när det är positivt (uppåt mindre, så att
  // den skickliga spelarens kassa inte skenar; reports/order303/kalib).
  moodBillPerLift: 1.4,
  // ORDER 303b (Anders 2026-10-05) — uppsidan sänkt från 0,9: de bästa
  // spelarna slutar säsongen på 70 000–90 000 kr (reports/order303b/kalib/V1–V4).
  // ORDER 303c — 0: de hyresfria veckorna lyfter alla, och uppsidan tas bort
  // så att de bästa stannar inom 70 000–90 000 kr (reports/order303c/kalib/H3).
  moodBillPerLiftUp: 0,
  // ORDER 303 B — placeringen i byn räknas på kvällens nöjda gäster vid bord:
  // hos oss gästerna vars stämning var minst nöjd när de betalade
  // (MOOD_BALANCE.threshold.content); hos konkurrenterna gästerna gånger en
  // nöjd andel efter deras rykte (rivalContentBase + rivalContentPerReputation × ryktet).
  rivalContentBase: 0.4,
  rivalContentPerReputation: 0.6
} as const;

// ORDER 303 E (Anders 2026-10-04) — personalens ork och trivsel, och
// kunskapen i personalen (sim/staffCondition.ts).
//   - Orken (0–1) sjunker under kvällen (per spelminut med öppna dörrar) och
//     när en gäst klagar, och stiger med god dricks; natten ger vilan.
//   - Trivseln (0–1) följer dricksen, satsningarna på personalen (kurserna på
//     morgonen) och hur ofta de står i en händelse de inte har kunskap för;
//     den drar långsamt mot sitt vilovärde.
//   - Låg ork eller trivsel: personalen går saktare (uppgifternas tid gånger
//     1 + slowAtZero × bristen under slowBelow), och ett rätt svar ger mindre
//     (effekten gånger effectAtZero + (1 − effectAtZero) × min(ork, trivsel)).
//   - Kunskapsområdena: vin (raketernas spår sommellerie), mat (kök) och
//     service. Saknar personalen området tvekar de: ett fel svar blir ett
//     steg allvarligare (CONSEQUENCES).
export const STAFF_CONDITION = {
  section: 'Servicen > Personalen',
  stamina: { start: 1, drainPerGameMinute: 0.0008, complaint: -0.06, perTipSek: 0.0002, afterNight: 1 },
  wellbeing: { start: 0.75, restingValue: 0.75, driftPerDay: 0.1, perTipSekEvening: 0.00003, perTraining: 0.06, perHesitation: -0.03 },
  slowBelow: 0.5,
  slowAtZero: 0.6,
  // Tvekan gör ett lätt fel till medel; med hesitationToGrave också medel till grovt.
  hesitationToGrave: 0,
  effectAtZero: 0.4,
  skillsByRole: { värd: ['service'], servitör: ['service'], kock: ['mat'], lärling: [] } as Record<string, readonly string[]>,
  // Morgonens satsningar som lär personalen ett område och lyfter trivseln.
  trainingActivities: { 'train-service': 'service', 'wine-tasting': 'vin', 'guest-chef': 'mat' } as Record<string, string>,
  areaByTrack: { sommellerie: 'vin', kok: 'mat' } as Record<string, string>
} as const;

// ORDER 287a — gästen med socialt kapital sprider ryktet (speldesign >
// Servicen > Gästerna: "drar fler gäster om de behandlas väl"). Nöjd när
// hen går: fler gäster de närmaste kvällarna (marknadens tak gånger
// 1 + buzzGood); missnöjd eller om hen ger upp: färre. Valda tal (F57).
export const SOCIAL_GUEST = {
  section: 'Servicen > Gästerna',
  openQuestion: 'F57',
  // Sannolikheten att en gäst med socialt kapital har bokat en servicedag.
  chancePerEvening: 0.5,
  goodFrom: 0.7,
  badBelow: 0.5,
  buzzGood: 0.15,
  buzzBad: -0.12,
  buzzEvenings: 3
} as const;

// ORDER 287a — miljardären i enkel form (Vision Owner 2026-09-30: "klädd
// i guld. Syns i söndagstidningen under Sett på stan, väljer ibland en
// krog, köper det dyraste och kan bjuda hela salen på champagne").
// Han är i byn fredag och lördag. Chansen att han väljer spelarens krog
// en av de kvällarna växer med ryktet. Champagnen hälls ur det dyraste
// vinet i lagret, ett glas per gäst i rummet. Valda tal (F57).
export const BILLIONAIRE = {
  section: 'Servicen > Gästerna',
  openQuestion: 'F57',
  inTown: ['fri', 'sat'] as readonly Weekday[],
  chooseBase: 0.1,
  chooseByReputation: 0.4,
  treatChance: 0.5,
  treatSatisfaction: 0.1
} as const;

export const SAVING = {
  section: 'Ramar för version 1 > Sparande',
  slots: 3,                    // "Tre sparplatser per spelare"
  // ORDER 263 — sparfilens formatversion. Höjs när sparfilens form
  // ändras; äldre filer visas då som "sparat i en äldre version" (F12),
  // utom de som står i migratableVersions och går att föra över.
  // ORDER 267 — version 2: vinbaren spelas i vinbarens rum. En fil i
  // version 1 laddas med rummet satt efter klassen (save.ts migrate).
  // ORDER 270 — version 3: händelserna i servicen ersätter action-knappen
  // och quizen. Filer i version 1 och 2 förs över (save.ts migrate).
  formatVersion: 3,
  migratableVersions: [1, 2]
} as const;

// ORDER 292 — rusningarna (Vision Owner 2026-10-01: "gäster i sällskap kommer
// i vågor (bilarna 19.30, bussen), en kö bildas vid dörren med tålamod som
// sjunker, och spelaren väljer vem som får bord först"). En våg tar sin andel
// av kvällens gäster (marknadens tak gånger rummets dragningskraft), och det
// jämna flödet minskas lika mycket. Måndag och tisdag är lugna (speldesign >
// Tiden), så vågorna kommer från onsdag. Klockslaget i minuter efter midnatt.
// Valda tal (F61).
// ORDER 293 — kön vid dörren (Designs vardagens koreografi, LEVERANSNOT §6:
// "tålamodet väljer klippet: queueCalm över ett gränsvärde, queueImpatient
// under det och queueLeaving när gästen går. Gränserna hör hemma i
// balance.ts."). Tålamodet är 0–1 (wineBarDirector.ts guestPatience). Talen är
// de som rummet använt sedan ORDER 286a (figureActs WAIT_THRESHOLDS). När
// värden pratar med ett sällskap i kön är det lugnt så här många sekunder.
export const QUEUE_MOOD = {
  section: 'Servicen',
  openQuestion: 'F65',
  impatientBelow: 0.55,
  leavingBelow: 0.2,
  hostCalmSeconds: 6
} as const;

// ORDER 296b — kön har ett tak (Designs Byn i kvällsljus: "Kön är högst sju
// sällskap; den som kommer när det är fullt väljer en annan krog"). Utan
// taket stod fredagens kö med bussens turister långt över rummets platser,
// och de som gav upp i kön sänkte ryktet för den rimliga spelaren
// (reports/order296b/nojdhet-efter-mep.json, diag-ready-efter.json).
export const QUEUE_CAP = {
  section: 'Servicen',
  maxParties: 7
} as const;

// ORDER 297 (Designs leverans Byn i kvällsljus, villageQueue.balance.ts): kön
// vid spelarens dörr i byn. Platserna är rummets köplatser (wineBarRoom.ts
// queueSpots, sju: dörrmattan och trottoaren), och kön är aldrig längre än
// platserna (QUEUE_CAP). Ett sällskap som kommer när kön är full väljer en
// annan krog i byn (scene/village/VillageLife.tsx). Leveransen lät Code sätta
// talen; de är desamma som servicens, så att byn och rummet är lika:
//   - seats: när ett sällskap ställer sig i kö, rummets platser (vinbaren 20);
//   - patienceSimSeconds: servicens tålamod (QUEUE; kunskapens tillägg läggs
//     på i knowledgeInService.ts queuePatienceSeconds);
//   - impatientBelow: när kön blir otålig (QUEUE_MOOD).
export const VILLAGE_QUEUE = {
  section: 'Servicen',
  openQuestion: 'F29',
  seats: BUSINESS_CLASSES.list.find((c) => c.id === 'vinbar')?.seats ?? 0,
  patienceSimSeconds: QUEUE.patienceSimSeconds,
  impatientBelow: QUEUE_MOOD.impatientBelow,
  maxParties: QUEUE_CAP.maxParties
} as const;

export const RUSH = {
  section: 'Servicen',
  openQuestion: 'F61',
  waves: [
    { id: 'cars', atMinute: 1170, share: 0.2, type: 'high', partySizes: [2, 4], weekdays: ['wed', 'thu', 'fri', 'sat'] },
    // ORDER 288 — bussen är byns: turisterna väljer krog efter rykte
    // (VILLAGE.bus, sim/village.ts busTonight) och kommer utöver poolen.
    // Andelen 0: det jämna flödet minskas inte.
    { id: 'bus', atMinute: 1215, share: 0, type: 'middle', partySizes: [3, 5], weekdays: ['fri', 'sat'], village: true }
  ] as ReadonlyArray<{ id: string; atMinute: number; share: number; type: 'student' | 'middle' | 'high'; partySizes: readonly [number, number]; weekdays: readonly Weekday[]; village?: boolean }>,
  // Sällskapen i en våg kommer inom så här många spelsekunder.
  spreadSimSeconds: 8,
  // Klasser med matsal och bokningsbok har rusningar (vinbaren).
  classes: ['vinbaren'] as readonly string[]
} as const;

// ORDER 292 — följder nästa dag (Vision Owner 2026-10-01: "Bokningsboken visar
// vad gårdagens svar gav, till exempel '3 bokningar tack vare gårdagens
// vin'"). En raket som klaras helt ger bokningar till nästa servicedag, en
// fälld raket kostar. Raderna i bokningsboken efter raketens spår. Valda tal (F61).
export const NEXT_DAY = {
  section: 'Servicen',
  openQuestion: 'F61',
  bookingsPerClearedRocket: 2,
  bookingsLostPerFailedRocket: 1
} as const;
