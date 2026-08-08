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

// ---------- (economic + ecological scenarios added in following commits) --

export const SCENARIO_BY_THEME: Record<SustainabilityKey, ScenarioSpec> = {
  social: WALK_IN_OF_FIVE,
  // Placeholders for economic + ecological until their commits land.
  // The reducer never picks these paths during cycle-1 without a real
  // spec — falls back to WALK_IN_OF_FIVE if the theme's spec is
  // missing (see pickScenarioSpec).
  economic: WALK_IN_OF_FIVE,
  ecological: WALK_IN_OF_FIVE
};

export function pickScenarioSpec(theme: SustainabilityKey): ScenarioSpec {
  return SCENARIO_BY_THEME[theme] ?? WALK_IN_OF_FIVE;
}

// Convenience export: array form for iteration / spec-lookup by id.
export const ALL_SCENARIOS: readonly ScenarioSpec[] = [WALK_IN_OF_FIVE];

export function scenarioById(id: string): ScenarioSpec | null {
  return ALL_SCENARIOS.find((s) => s.id === id) ?? null;
}
