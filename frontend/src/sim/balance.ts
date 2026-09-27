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
  stepSeconds: { episteme: 15, techne: 20, phronesis: 30 } as Record<KnowledgeAxis, number>,
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
