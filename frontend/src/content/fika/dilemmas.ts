// ORDER 316 — fikat efter stängning: de tolv dilemmana (Anders 2026-10-07,
// BESLUT del 1; utkastet documentation/blueprints/ORDER_316_UTKAST/DILEMMAN.md).
//
// Metadatan står här och texten (frågan, svaren, förklaringen, lagtexten) i
// strängtabellen (content/fikaStrings.ts), på svenska och engelska, som för
// frågebanken. Talen för följderna står i balance.ts FIKA.
//
// `legal` gäller dilemman märkta ⚖: lagarna som berörs (nycklar; namnen står i
// fikaStrings `laws`) och om texten om vad
// lagen säger är granskad. `legalReviewed: false` döljer lagtexten (lagarna och
// fikaStrings `legalNote`) i spelet; resten av dilemmat visas (BESLUT del 1,
// fråga 4). Anders utser granskaren.

export type DilemmaTheme = 'food-safety' | 'equality' | 'harassment' | 'service' | 'feedback' | 'communication' | 'work-environment';

// Personerna i laget (strings.fika.people). Värden, servitören och kocken är
// lagets roller i simuleringen (STAFF_ROLE_OF); sommeliern, bartendern och
// diskaren finns i rummet men inte som roller i laget.
// ORDER 323 §5 — Nils, medhjälparen i foodtrucken ('truck.assistant.name'), är
// vagnens person. Han står i luckan, och i laget är han servitören.
export type FikaPerson = 'host' | 'server' | 'sommelier' | 'bartender' | 'cook' | 'dishwasher' | 'assistant';
export const FIKA_PEOPLE: readonly FikaPerson[] = ['host', 'server', 'sommelier', 'bartender', 'cook', 'dishwasher', 'assistant'];
export const STAFF_ROLE_OF: Partial<Record<FikaPerson, 'värd' | 'servitör' | 'kock'>> = { host: 'värd', server: 'servitör', cook: 'kock', assistant: 'servitör' };

// ORDER 323 §5 (Anders 2026-10-09: "Fikat följer platsen: i foodtrucken är det
// Nils, och dilemmat ska passa vagnen (inte fullbokat sällskap). Vinbarens
// dilemman och personal bara i vinbaren och bistron.") — platsen där ett
// dilemma kan komma. Bistron är vinbarens klass ombyggd (businessClass
// 'vinbar'), så vinbarens dilemman gäller båda.
export type FikaPlace = 'wine' | 'truck';
export function fikaPlaceOf(businessClass: string | null | undefined): FikaPlace | null {
  if (businessClass === 'vinbar') return 'wine';
  if (businessClass === 'foodtruck') return 'truck';
  return null;
}

export type DilemmaGrade = 'well' | 'partly' | 'weakly';
export type DilemmaOptionId = 'A' | 'B' | 'C' | 'D';

// Vad i kvällen som utlöser dilemmat (sim/fika.ts triggerHolds).
export type DilemmaTrigger =
  | { kind: 'incident'; ids: readonly string[] }      // en situation i kväll
  | { kind: 'prepBacklog' }                           // eftersläp i köket (mise en place)
  | { kind: 'delivery' }                              // varor köpta i dag
  | { kind: 'tips' }                                  // kvällens dricks över FIKA.tipsAtLeastSek
  | { kind: 'weekend' }                               // fredag eller lördag
  | { kind: 'teamChanged' }                           // anställning eller uppsägning i dag
  | { kind: 'turnedAway' }                            // kön var full och sällskap gick vidare
  | { kind: 'longWait' }                              // gäster som gav upp eller gick
  | { kind: 'lowWellbeing' }                          // någon i personalen under FIKA.lowWellbeingBelow
  | { kind: 'lowStamina' }                            // någon i personalen under FIKA.lowStaminaBelow vid stängning
  | { kind: 'tiredTeam' };                            // lagets ork i snitt under FIKA.tiredTeamBelow

// Ekonomin i ett svar (balance.ts FIKA.economy).
export type DilemmaEconomy =
  | { kind: 'cost'; key: 'discardGoodsSek' | 'discardSomeGoodsSek' | 'extraHandSek' }
  | { kind: 'inspectionRisk' }
  | { kind: 'quitRisk' }
  | { kind: 'suggestAbility'; id: string };

export interface DilemmaOption {
  id: DilemmaOptionId;
  grade: DilemmaGrade;
  economy?: readonly DilemmaEconomy[];
}

export interface Dilemma {
  id: string;
  theme: DilemmaTheme;
  triggers: readonly DilemmaTrigger[];
  asker: FikaPerson;
  places: readonly FikaPlace[];
  legal: { laws: readonly string[]; legalReviewed: boolean } | null;
  options: readonly DilemmaOption[];
}

const unreviewed = (...laws: string[]) => ({ laws, legalReviewed: false });
const WINE: readonly FikaPlace[] = ['wine'];
const TRUCK: readonly FikaPlace[] = ['truck'];

export const DILEMMAS: readonly Dilemma[] = [
  {
    id: 'fika-kylen', theme: 'food-safety', asker: 'cook', places: WINE,
    triggers: [{ kind: 'incident', ids: ['vb06-kylen', 'vb28-kylen-stannar'] }, { kind: 'prepBacklog' }, { kind: 'delivery' }],
    legal: unreviewed('SFS 2006:804', 'EG 852/2004'),
    options: [
      { id: 'A', grade: 'well', economy: [{ kind: 'cost', key: 'discardGoodsSek' }] },
      { id: 'B', grade: 'weakly', economy: [{ kind: 'inspectionRisk' }] },
      { id: 'C', grade: 'partly', economy: [{ kind: 'cost', key: 'discardSomeGoodsSek' }] },
      { id: 'D', grade: 'weakly', economy: [{ kind: 'inspectionRisk' }] }
    ]
  },
  {
    id: 'fika-allergin', theme: 'food-safety', asker: 'server', places: WINE,
    triggers: [{ kind: 'incident', ids: ['vb03-notallergi', 'vb27-allergireaktion'] }],
    legal: unreviewed('EU 1169/2011'),
    options: [
      { id: 'A', grade: 'well', economy: [{ kind: 'suggestAbility', id: 'allergen' }] },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-dricksen', theme: 'equality', asker: 'bartender', places: WINE,
    triggers: [{ kind: 'tips' }],
    legal: null,
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-baren', theme: 'equality', asker: 'server', places: WINE,
    triggers: [{ kind: 'weekend' }, { kind: 'teamChanged' }],
    legal: unreviewed('SFS 2008:567'),
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-gransen', theme: 'harassment', asker: 'sommelier', places: WINE,
    triggers: [{ kind: 'incident', ids: ['vb10-berusad', 'vb34-vinglar', 'vb29-brak'] }],
    legal: unreviewed('SFS 1977:1160', 'AFS 2023:2'),
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly', economy: [{ kind: 'quitRisk' }] },
      { id: 'C', grade: 'partly' },
      { id: 'D', grade: 'partly' }
    ]
  },
  {
    id: 'fika-skamten', theme: 'harassment', asker: 'bartender', places: WINE,
    triggers: [{ kind: 'lowWellbeing' }],
    legal: unreviewed('SFS 2008:567', 'AFS 2023:2'),
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-bordet', theme: 'service', asker: 'host', places: WINE,
    triggers: [{ kind: 'turnedAway' }],
    legal: null,
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'weakly' },
      { id: 'D', grade: 'partly' }
    ]
  },
  {
    id: 'fika-aldre', theme: 'service', asker: 'server', places: WINE,
    triggers: [{ kind: 'longWait' }, { kind: 'incident', ids: ['vb33-vasen'] }],
    legal: null,
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-diskaren', theme: 'feedback', asker: 'bartender', places: WINE,
    triggers: [{ kind: 'lowStamina' }],
    legal: null,
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'partly' },
      { id: 'C', grade: 'weakly' }
    ]
  },
  {
    // BESLUT del 1: märkt ⚖ (färre pass kan kräva förhandling eller
    // information enligt MBL och ett eventuellt kollektivavtal).
    id: 'fika-schemat', theme: 'communication', asker: 'host', places: WINE,
    triggers: [{ kind: 'teamChanged' }],
    legal: unreviewed('SFS 1976:580', 'kollektivavtal'),
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'partly' },
      { id: 'C', grade: 'weakly' }
    ]
  },
  {
    id: 'fika-passen', theme: 'work-environment', asker: 'cook', places: WINE,
    triggers: [{ kind: 'tiredTeam' }],
    legal: unreviewed('SFS 1977:1160', 'SFS 1982:673'),
    options: [
      { id: 'A', grade: 'well', economy: [{ kind: 'cost', key: 'extraHandSek' }] },
      { id: 'B', grade: 'weakly', economy: [{ kind: 'quitRisk' }] },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-golvet', theme: 'work-environment', asker: 'server', places: WINE,
    triggers: [{ kind: 'tiredTeam' }, { kind: 'lowStamina' }],
    legal: unreviewed('SFS 2006:804', 'SFS 1977:1160'),
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly', economy: [{ kind: 'inspectionRisk' }] },
      { id: 'C', grade: 'partly', economy: [{ kind: 'inspectionRisk' }] }
    ]
  },
  // ---------- ORDER 323 §5 — vagnens dilemman: Nils frågar, utlösta av det som händer vid luckan ----------
  {
    id: 'fika-vagn-kylboxen', theme: 'food-safety', asker: 'assistant', places: TRUCK,
    triggers: [{ kind: 'incident', ids: ['ft04-leveransen', 'ft11-slut'] }, { kind: 'delivery' }],
    // BESLUT_GRANSKNING_323: lagrummen stämmer; Anders läser lagtexten själv och sätter legalReviewed.
    legal: unreviewed('SFS 2006:804', 'EG 852/2004'),
    options: [
      { id: 'A', grade: 'well', economy: [{ kind: 'cost', key: 'discardGoodsSek' }] },
      { id: 'B', grade: 'weakly', economy: [{ kind: 'inspectionRisk' }] },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-vagn-kon', theme: 'service', asker: 'assistant', places: TRUCK,
    triggers: [{ kind: 'longWait' }, { kind: 'turnedAway' }, { kind: 'incident', ids: ['ft01-rusningen'] }],
    legal: null,
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-vagn-dricksen', theme: 'equality', asker: 'assistant', places: TRUCK,
    triggers: [{ kind: 'tips' }],
    legal: null,
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-vagn-benen', theme: 'work-environment', asker: 'assistant', places: TRUCK,
    triggers: [{ kind: 'lowStamina' }, { kind: 'tiredTeam' }, { kind: 'lowWellbeing' }],
    // BESLUT_GRANSKNING_323: rasten efter fem timmar stämmer (ATL 15 §). Vilken AFS som gäller stående arbete
    // och kyla anger juristen; legalReviewed står kvar som false tills dess.
    legal: unreviewed('SFS 1977:1160', 'AFS 2023:2', 'SFS 1982:673'),
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly', economy: [{ kind: 'quitRisk' }] },
      { id: 'C', grade: 'partly' }
    ]
  },
  {
    id: 'fika-vagn-kortet', theme: 'communication', asker: 'assistant', places: TRUCK,
    triggers: [{ kind: 'incident', ids: ['ft10-kortet', 'ft13-priset'] }, { kind: 'weekend' }],
    legal: null,
    options: [
      { id: 'A', grade: 'well' },
      { id: 'B', grade: 'weakly' },
      { id: 'C', grade: 'partly' }
    ]
  }
];

export function dilemmaById(id: string): Dilemma | undefined {
  return DILEMMAS.find((d) => d.id === id);
}
