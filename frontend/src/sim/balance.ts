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

// ORDER 284 — 0,15 → 0,17 efter portionsboken (stockPackages.ts
// dishPortions): mindre svinn gav den rimliga spelaren 11,8 % vid 0,15
// (reports/order284/rent-check.json vid 0,17: 9,9 %; week-players.json: 5,0 %).
export const RENT = {
  section: 'Ekonomin > Hyran och lönerna',
  openQuestion: 'F54',
  shareOfNormalWeeklyRevenue: 0.17,
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
export const INCIDENTS = {
  section: 'Servicen > Händelserna i servicen',
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
  // Vision Owner 2026-09-29 (tredje provspelet): "Raketens tid blir 20
  // sekunder" i varje steg (var 15, 20 och 30).
  stepSeconds: { episteme: 20, techne: 20, phronesis: 20 } as Record<KnowledgeAxis, number>,
  timeoutCreditPenalty: 1,     // "−1 kredit" när personalen beslutar själv
  // "Fel svar på ett steg ger stegets konsekvens och personalen tar över
  // resten, med sämre utfall." Personalens utfall skalas efter stegen som
  // återstod: fel på episteme ger hela, på techne två tredjedelar, på
  // phronesis en tredjedel. Talen är valda (F43).
  staffShareByFailedStep: [1, 2 / 3, 1 / 3] as readonly number[],
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
  // Svarets rad i rummet syns så här länge (spelsekunder).
  outcomeBubbleSimSeconds: 14,
  // ORDER 271 (Design paket 6, R2/R3): efter ett svar visas rätt och fel i
  // kortet så här många sekunder (verklig tid) innan nästa steg öppnas på
  // full tid, eller kortet stängs.
  revealSeconds: 2.4,
  // ORDER 276 (Vision Owner 2026-09-28, provspel): "Raketerna styr
  // gästflödet: fler rätta svar ger fler gäster in i lokalen, som köper
  // mer ur lagret." Varje klarat steg släpper in så här många gäster, och
  // en hel klarad raket så här många till. Ett fel släpper inte in någon.
  // Valda tal (F49).
  guestsPerClearedStep: 1,
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
export const COLLAPSE = {
  section: 'Servicen',
  floorPerTick: 0.00003,
  strainGainPerTick: 0.00025,
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
  secondDrinkChance: 0.5
} as const;

// ORDER 277 — morgonen är insatsen (Vision Owner 2026-09-28, andra
// provspelet): "Menyn och dryckeslistan (viner på glas och flaska, öl,
// alkoholfritt) och mängder måste sättas innan servicen kan starta."
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
  cashDeltaMinSek: 20
} as const;

// ORDER 279 — frågorna och insatsen (Vision Owner 2026-09-28, andra
// provspelet). Speldesign > Servicen > Händelserna i servicen och
// > Insatsen. Valda tal (F52). Insatsen ersattes i ORDER 280 (BACK nedan).
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
  tipBonusPerClearedStep: 0.03,
  tipBonusOnRocketCleared: 0.04
} as const;

// ORDER 280 — Back your knowledge (Vision Owner 2026-09-29, Designs B1):
// insatsen görs bara i krediter och rör aldrig kassan. Spelaren startar
// själv en raket och väljer för varje steg hur säker hen är. Skalan är den
// klassiska för säkerhetsbaserad bedömning, 1 : 0, 2 : −2, 3 : −6 (Designs
// economy.ts), i spelets krediter (en per bästa svar). Steget multiplicerar
// bara rätt svar: episteme ×1, techne ×1,5, phronesis ×2. Ett fel kostar
// insatsen och avslutar raketen; tiden ute räknas som fel på lägsta
// säkerheten. Valda tal i spelets skala (F53).
// ORDER 280 — säkerheten spelaren väljer: 0 gissar, 1 tror det, 2 vet det.
export type Confidence = 0 | 1 | 2;

export const BACK = {
  section: 'Servicen > Insatsen',
  openQuestion: 'F53',
  confidence: [
    { win: 1, loss: 0 },
    { win: 2, loss: 2 },
    { win: 3, loss: 6 }
  ] as readonly { win: number; loss: number }[],
  stepMultiplier: [1, 1.5, 2] as readonly number[],
  maxPerEvening: 3,
  // Vision Owner 2026-09-29 (provspel av 285): "Think so" är förvald i varje
  // steg, och efter att svaret är låst finns en andra tidsgräns; när den går
  // ut satsas "Guessing" automatiskt.
  defaultConfidence: 1 as Confidence,
  lockSeconds: 10,
  // Resultatet syns i gränssnittet så här länge (ms).
  resultVisibleMs: 5000,
  // "Hur säker du var": Vet det räknas som för säkert under den här
  // träffsäkerheten efter minst så här många svar, och gissningarna som
  // för försiktiga över den (Designs calibrationNote).
  calibrationShare: 0.75,
  calibrationMinAnswers: 2
} as const;

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
  walletSek: { tight: 300, normal: 520, generous: 1100 },
  // Så mycket av plånboken går högst till rätten; resten till drycken.
  dishShareOfWallet: 0.7,
  // Smaken för pris: vikten för en rätt är pris upphöjt till detta.
  // Den snåla väljer billigt, den generösa dyrt.
  priceTaste: { tight: -1, normal: 0, generous: 1 },
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
