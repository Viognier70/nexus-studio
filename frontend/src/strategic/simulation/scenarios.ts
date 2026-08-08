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
        'Fyran och tvåan slås ihop — grannbordet tappar armbågsrymden.',
        'Sällskapets ordering kommer i klump — passet får en spik.'
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
        'Fyra vid fyran, en vid baren — den femte försöker verka nöjd.',
        'Bartendern hälsar sent — den femte har hunnit vänta ut sin egen tystnad.'
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
        'Två av sällskapet vänder redan i entrén — de andra följer efter.',
        'En stamgäst vid fönsterbordet höjer på ögonbrynen — noterar.'
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
        'Menyn byts på passet — köket noterar men följer med.',
        'Notan svullnar snabbt — resten av kvällen betalar i tempo.'
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
        'Bokningen skrivs för morgondagen — kvällen får en paus att andas ut.',
        'Kocken börjar planera i huvudet — nästa mise en place är i morgon.'
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
        'Delegationen tackar men går vidare — värden noterar att någon annan tog dem.',
        'Kvällens takt behålls — passet håller inte fler överraskningar.'
      ],
      mentor: {
        1: 'Rätt att skydda tempot när laget är osäkert. Nästa gång kanske marginalen räcker.',
        2: 'Att avstå är också ett svar. Kvällen bevaras, men intäkten går till någon annan.',
        3: 'Bestämt val att hålla rytmen. Rummet mår väl, kassan lär sig sitt tempo.'
      }
    }
  }
};

// ---------- (ecological scenario added in following commit) --------------

export const SCENARIO_BY_THEME: Record<SustainabilityKey, ScenarioSpec> = {
  social: WALK_IN_OF_FIVE,
  economic: TIME_PRESSURE,
  // Placeholder for ecological until the commit lands. Falls back
  // to walk-in-of-five so a themed draw doesn't crash mid-play.
  ecological: WALK_IN_OF_FIVE
};

export function pickScenarioSpec(theme: SustainabilityKey): ScenarioSpec {
  return SCENARIO_BY_THEME[theme] ?? WALK_IN_OF_FIVE;
}

// Convenience export: array form for iteration / spec-lookup by id.
export const ALL_SCENARIOS: readonly ScenarioSpec[] = [WALK_IN_OF_FIVE, TIME_PRESSURE];

export function scenarioById(id: string): ScenarioSpec | null {
  return ALL_SCENARIOS.find((s) => s.id === id) ?? null;
}
