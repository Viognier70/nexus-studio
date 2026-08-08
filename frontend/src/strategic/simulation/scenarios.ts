// ORDER 043 v3 §10 step 5 — the three scenarios, one per sustainability.
//
// Each ScenarioSpec bundles the mechanic (spawn effects, capital
// direction per choice) with its author layer (subject/situation/
// choice texts, mentor comments, outcome events, register writes).
// Everything is hand-authored — the Vision Owner's rule from
// LEARNING_AND_SCENARIO_ARCHITECTURE §5 is that register writes
// derived from scenario shape make judgement a function of structure,
// which is the opposite of what the pedagogy asks.
//
// Cycle-1 mapping:
//   social     → walk-in-of-five (arrival scenario carried from ORDER 042)
//   economic   → time-pressure (a bookable delegation on short notice)
//   ecological → moral-dilemma (a delivery of doubtful provenance)
//
// The theme is drawn via themeSelection.drawNextTheme (weakness-
// weighted); the reducer looks up the spec for the drawn theme and
// uses that spec end-to-end.

import type {
  EnablerKey,
  Register,
  ScenarioChoice,
  ScenarioDifficulty,
  SustainabilityKey
} from '../types';

// Register write for one scenario response. Applied via
// RECORD_ENABLER_EVENT at resolve time — the enabler's history is
// what the portfolio (§8) will surface, so the amount must be small
// and the composition tightly hand-authored.
export interface EnablerWrite {
  enabler: EnablerKey;
  register: Register;
  amount: number;
}

export interface ScenarioChoiceSpec {
  // Player-facing choice label (Swedish).
  label: string;
  // Register writes fired at RESOLVE_SCENARIO. Multiple writes per
  // choice are allowed — a response may exercise both cultural and
  // scientific competences.
  registerWrites: readonly EnablerWrite[];
  // Immediate visible-in-room effect (party arriving, walking away
  // etc). Zero spawns for non-arrival scenarios; they play out in
  // the stream + mentor rather than the puck layer.
  spawnedRemaining: number;
  nextSpawnAtOffset: number;   // sim-sec from resolve
  // Signed multiplier on SCENARIO_CAPITAL_DELTA for this choice.
  // Same convention as CHOICE_CAPITAL_SIGN in reducer: +1 for
  // engaging (A/B), −0.5 for refusal-shaped (C).
  capitalSign: number;
  // Outcome events fired at t+6 s and t+18 s after resolve (per
  // Addendum A). Empty = no outcome events for this choice.
  outcomes: readonly string[];
  // Mentor bank keyed by chosen difficulty. Nine lines per scenario
  // (3 choices × 3 difficulties) exists at scenario level; per-choice
  // slice lives inside each ScenarioChoiceSpec.
  mentor: Record<ScenarioDifficulty, string>;
}

export interface ScenarioSpec {
  id: string;
  sustainability: SustainabilityKey;
  // Subject phase — the one-line "who's arriving / what's calling".
  subjectBody: string;
  subjectCta: string;
  // Situation phase — the framing paragraph, revealed after difficulty.
  situationBody: string;
  choices: Record<ScenarioChoice, ScenarioChoiceSpec>;
}

// ---------- walk-in-of-five (social) --------------------------------------

const WALK_IN_OF_FIVE: ScenarioSpec = {
  id: 'walk-in-of-five',
  sustainability: 'social',
  subjectBody: 'Ett sällskap står i entrén — utan bokning.',
  subjectCta: 'Fortsätt',
  situationBody:
    'Fem personer i sällskapet. Kvällens service börjar snart och rummet är delvis bokat. Vad gör du?',
  choices: {
    A: {
      label: 'Sätt alla fem — slå ihop fyran och ett tvåbord.',
      registerWrites: [{ enabler: 'cultural', register: 'techne', amount: 0.05 }],
      spawnedRemaining: 5,
      nextSpawnAtOffset: 0.4,
      capitalSign: 1,
      outcomes: [
        'Fyran och tvåan har slagits ihop — grannbordet får hasa in mot väggen för att hämta besticket. Ingen sa något men jag såg blicken; undrar om vi skulle ha lämnat en förklaring innan de fick lista ut det själva.',
        'Sällskapets ordering kom in i klump på passet — köket har fem huvudrätter samtidigt istället för spridda i tid. Kocken vid grillen ser sammanbiten ut; hm, det var vi som valde det när vi sa ja.'
      ],
      mentor: {
        1: 'Djärvt val för första kvällen. Låt köket få tempo.',
        2: 'Sammanslagning fungerar när servisen är med. Håll ett öga på tvåan bredvid.',
        3: 'Full sittning. Om servisen håller blir det en bra kväll för alla fem.'
      }
    },
    B: {
      label: 'Sätt fyra vid fyran, den femte vid baren.',
      registerWrites: [{ enabler: 'cultural', register: 'phronesis', amount: 0.05 }],
      spawnedRemaining: 5,
      nextSpawnAtOffset: 0.4,
      capitalSign: 1,
      outcomes: [
        'Fyra sitter vid fyran och en sitter vid baren — den femte hänger jackan över barstolen och försöker se avslappnad ut. Sällskapet vid bordet tittar dit lite för ofta; undrar om han vet att vi vet att vi delade honom.',
        'Bartendern hälsade sent på den femte — han hann vänta ut sin egen tystnad först. Nu står drinken framför honom men samtalet vid bordet har gått vidare utan honom. Hm, den där ensamheten är svår att ta tillbaka i efterhand.'
      ],
      mentor: {
        1: 'Bra kompromiss. Femte vid baren får en annan upplevelse — se till att någon hälsar.',
        2: 'Klok fördelning. Barsätet kräver dock att någon i personalen hinner dit.',
        3: 'Trygg linje. Håll värmen — femte gästen ska inte känna sig sekundär.'
      }
    },
    C: {
      label: 'Neka sällskapet.',
      registerWrites: [{ enabler: 'cultural', register: 'phronesis', amount: 0.03 }],
      spawnedRemaining: 2,
      nextSpawnAtOffset: 0.3,
      capitalSign: -0.5,
      outcomes: [
        'Två av sällskapet vände redan i entrén innan värden hade sagt hela meningen — de andra tre följde efter utan att fråga varför. Kvar står värden med en artighet på tungan som ingen tog emot; hm, den där ansiktet är svårare att glömma än beslutet var att fatta.',
        'En stamgäst vid fönsterbordet såg hela utbytet och höjde på ögonbrynen mot sin sällskapare. De sa inget till oss men växlade en blick. Undrar hur många kvällar det tar innan den blicken kommer tillbaka som en avbokning.'
      ],
      mentor: {
        1: 'Rätt att skydda kvällen. Nästa gång kanske servisen är redo.',
        2: 'Att neka är också ett val. Kvällens rytm bevaras — men ryktet noteras.',
        3: 'Bestämt nej. Rummet håller sin form, tipsen blir mindre.'
      }
    }
  }
};

// ---------- time-pressure (economic) --------------------------------------
//
// A late booking that promises a lift — but wants a special menu run
// tonight as a pre-taste. The choice is what to protect: the rhythm
// of the current service, the potential margin, or a middle path
// that takes the booking without disrupting the pass.
//
// Reads the economic axis because the offer is money-shaped, and
// the trade-off is money vs the team's evening. Two of three choices
// take the booking; C refuses.

const TIME_PRESSURE: ScenarioSpec = {
  id: 'time-pressure',
  sustainability: 'economic',
  subjectBody:
    'En delegation ringer — vill boka i morgon, men förutsätter att specialmenyn provkörs i kväll.',
  subjectCta: 'Fortsätt',
  situationBody:
    'Bokningen kräver att köket byter menyn i kväll för att smaka igenom rätterna. Ekonomiskt lyft imorgon, men laget hinner knappt planera. Vad gör du?',
  choices: {
    A: {
      label: 'Ta bokningen och kör nya menyn direkt.',
      registerWrites: [{ enabler: 'cultural', register: 'techne', amount: 0.05 }],
      spawnedRemaining: 0,
      nextSpawnAtOffset: 0,
      capitalSign: 1,
      outcomes: [
        'Menyn byts mitt på passet — köket noterar med en nick och börjar tömma om stationerna. Två pågående beställningar får läggas ner halvfärdiga och tas om. Undrar om vi förklarade tydligt nog för dem att detta var mitt beslut, inte deras.',
        'Notan svullnar snabbt när delegationen bokas för imorgon — men resten av kvällen betalar i tempo. Två stambord får sitt bröd senare än vanligt; hm, det är räkningen för morgondagens seger, betald i kvällens andrum.'
      ],
      mentor: {
        1: 'Djärvt val. Menybytet mitt i passet är risken du sa ja till — se om laget håller.',
        2: 'Vinst i syfte, spänning i praktik. Öka planeringstiden nästa gång.',
        3: 'Fullt påslag. Om laget klarar tempot är det en kväll som räknas.'
      }
    },
    B: {
      label: 'Ta bokningen — bara imorgon, ingen provkörning i kväll.',
      registerWrites: [{ enabler: 'scientific', register: 'phronesis', amount: 0.05 }],
      spawnedRemaining: 0,
      nextSpawnAtOffset: 0,
      capitalSign: 1,
      outcomes: [
        'Bokningen skrevs för morgondagen — kvällen fick andas ut. Servitören sa till köket och båda log lätt utan att kommentera. Undrar om det är den där sortens signal som håller ett lag ihop längre än en bonus gör.',
        'Kocken började planera imorgondagens meny i huvudet mitt i pass 5 — han var redan hemma i tanken. Hm, det är den luxuösa sortens uppmärksamhet vi köpte oss med att säga nej ikväll och ja i morgon.'
      ],
      mentor: {
        1: 'Klok mellanväg. Ger köket tid att förbereda på ett kontrollerat sätt.',
        2: 'Bra bedömning. Delegationen kommer imorgon utan att kvällen tar smäll.',
        3: 'Balanserad linje. Vinst utan att förbränna passet.'
      }
    },
    C: {
      label: 'Neka — behåll kvällens rytm.',
      registerWrites: [{ enabler: 'cultural', register: 'phronesis', amount: 0.03 }],
      spawnedRemaining: 0,
      nextSpawnAtOffset: 0,
      capitalSign: -0.5,
      outcomes: [
        'Delegationen tackade artigt och la på — inom en halvtimme såg vi via en av stamgästerna att de bokat sig på hotellrestaurangen istället. Undrar om vår rytm värderas till vad vi tror den värderas till, eller om vi lagt ett golv där ingen annan skulle ha lagt det.',
        'Kvällens takt behölls — inga fler överraskningar nådde passet. Servitörerna rör sig som om de vet vad de gör i två timmar till. Hm, det är den där stillheten som är svår att räkna in i kassan men lätt att räkna in i vem som orkar komma i morgon.'
      ],
      mentor: {
        1: 'Rätt att skydda tempot när laget är osäkert. Nästa gång kanske marginalen räcker.',
        2: 'Att avstå är också ett svar. Kvällen bevaras, men intäkten går till någon annan.',
        3: 'Bestämt val att hålla rytmen. Rummet mår väl, kassan lär sig sitt tempo.'
      }
    }
  }
};

// ---------- moral-dilemma (ecological) -----------------------------------
//
// A supplier phone call: today's fish arrived via a broken cold chain.
// Probably fine but not traceable. Byte until Thursday if refused.
// The choice is what to weigh: short-term service continuity, safer
// substitution, or transforming the disruption into a menu shift
// that lifts the seasonal alternatives.
//
// Reads the ecological axis. Choice A is the shortcut (dishonest but
// invisible); B is the safe swap; C is the transformative move that
// makes ecology legible in the room.

const MORAL_DILEMMA: ScenarioSpec = {
  id: 'moral-dilemma',
  sustainability: 'ecological',
  subjectBody:
    'Leverantören ringer — dagens fisk finns bara som osäkerhet.',
  subjectCta: 'Fortsätt',
  situationBody:
    'Fisken kom via en bruten kylkedja — troligen ok men inte spårbar. Byte till torsdag om du säger nej. Vad gör du?',
  choices: {
    A: {
      label: 'Ta fisken — laget märker den ordentligt och hoppas.',
      registerWrites: [{ enabler: 'scientific', register: 'techne', amount: 0.05 }],
      spawnedRemaining: 0,
      nextSpawnAtOffset: 0,
      // Negative sign — the drawn theme (ecological) moves DOWN.
      // Taking the shortcut is the ecological hit, even if the room
      // never learns it.
      capitalSign: -1,
      outcomes: [
        'Två av förrätterna gick ut utan att någon nämnde att spårbarheten fattades — värden viker undan frågor från stamgäster på bord tre. Han svarar utan att svara. Undrar om han vet att den där ovilligheten själv säger något som gästen läser utan att formulera det.',
        'En gäst frågade rakt ut om fiskens ursprung — servitören blev tyst en sekund för länge innan hon svarade "från vår vanliga leverantör". Bordet nöjde sig med det men växlade en blick. Hm, den där sekunden är den enda tid vi kommer att kunna ta tillbaka det på.'
      ],
      mentor: {
        1: 'Ett risktagande utan säkerhet. Servisen hoppas att inget märks — som ofta är fallet, men inte alltid.',
        2: 'Väljer tempot över spårbarheten. Det märks först om något går fel.',
        3: 'Bestämt att köra vidare. Rummet vet inget — laget vet.'
      }
    },
    B: {
      label: 'Byt menyn i kväll — ta annat protein.',
      registerWrites: [{ enabler: 'cultural', register: 'phronesis', amount: 0.05 }],
      spawnedRemaining: 0,
      nextSpawnAtOffset: 0,
      // Small positive — safe reroute, ecological unaffected in a
      // way that reads a shade favourable (the supplier chain took a
      // hit but the room stayed honest).
      capitalSign: 0.5,
      outcomes: [
        'Menytavlan skrevs om i sista stund — köket bytte till kyckling utan gnäll och började plocka fram vad som fanns. Ingen kommenterade förändringen. Undrar om det där lugnet är en effekt av att beslutet var mitt att fatta och deras att verkställa.',
        'Alternativet presenterades utan ursäkter — servitören sa "vi har justerat menyn efter dagens leverans" och bordet nickade utan att fråga vidare. Hm, det är det där språket som gör en substitution till ett val istället för ett problem.'
      ],
      mentor: {
        1: 'Trygg justering. Bytet stör men skyddar.',
        2: 'Klok kompromiss. Menyn ger vika för säkerheten utan att brytas.',
        3: 'Kalibrerad reaktion. Kvällen fortsätter med annan protein.'
      }
    },
    C: {
      label: 'Skriv om menyn helt — passa på att lyfta säsongens gröna.',
      registerWrites: [{ enabler: 'cultural', register: 'episteme', amount: 0.06 }],
      spawnedRemaining: 0,
      nextSpawnAtOffset: 0,
      // Full positive — transformative choice that makes ecology
      // legible to the room. Largest ecological lift of the three.
      capitalSign: 1,
      outcomes: [
        'De gröna alternativen presenterades med sin egen berättelse — servitören berättade om odlaren och veckans skörd. Bordspratet steg märkbart över tre bord. Undrar om vi kommer att se det här som en punkt där menyn ändrades permanent, eller som en engångskväll.',
        'En gäst vid pass 4 noterade uttryckligen att kvällens meny hade ändrats och nickade uppskattande — hon frågade var grönsakerna kom ifrån. Servitören visste svaret. Hm, det där svaret är resultatet av morgonens beslut att inte ta genvägen.'
      ],
      mentor: {
        1: 'Djärvt val — förvandlar en risk till en möjlighet. Kräver att köket är med.',
        2: 'Ekologiskt drag. Menyn får ny riktning och säsongen blir läslig.',
        3: 'Radikal linje. Om laget klarar den blir det en kväll som räknas som skifte, inte ersättning.'
      }
    }
  }
};

export const SCENARIO_BY_THEME: Record<SustainabilityKey, ScenarioSpec> = {
  social: WALK_IN_OF_FIVE,
  economic: TIME_PRESSURE,
  ecological: MORAL_DILEMMA
};

export function pickScenarioSpec(theme: SustainabilityKey): ScenarioSpec {
  return SCENARIO_BY_THEME[theme] ?? WALK_IN_OF_FIVE;
}

// Convenience export: array form for iteration / spec-lookup by id.
export const ALL_SCENARIOS: readonly ScenarioSpec[] = [
  WALK_IN_OF_FIVE,
  TIME_PRESSURE,
  MORAL_DILEMMA
];

export function scenarioById(id: string): ScenarioSpec | null {
  return ALL_SCENARIOS.find((s) => s.id === id) ?? null;
}
