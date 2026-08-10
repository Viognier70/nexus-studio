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
  RoleCompetence,
  ScenarioChoice,
  ScenarioDifficulty,
  StaffRole,
  SustainabilityKey,
  TeamState
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

// ORDER 048 §3 — a signed write to a specific sustainability capital,
// separate from the theme-driven `capitalSign`. Used for two-way
// trades: a choice that lifts economic while dropping ecological
// writes both in the same beat, so the player can watch the trade.
// Multiple entries allowed per choice; each fires at RESOLVE_SCENARIO.
//
// ORDER 050 §3 (2026-08-10) — restricted to non-economic axes under
// the cash refactor. Economic effects live on `cashWrites` below in
// SEK units. The type restriction is deliberate: ambiguous `delta`
// fields where the unit depends on the key would be exactly the
// two-numbers-for-one-thing drift the register documents (memory
// `feedback_citation_is_not_endorsement.md`).
export interface SustainabilityWrite {
  capital: 'social' | 'ecological';
  delta: number;   // signed [0,1] capital delta; typically ±0.02 to ±0.05
}

// ORDER 050 §3 (2026-08-10) — a signed cash delta in SEK, applied
// directly to `state.cash` at RESOLVE_SCENARIO. Replaces the previous
// `{capital: 'economic', delta: <0..1>}` shape for two-way trades.
// Scale: ±3 000 SEK ≈ half a lunch's revenue; ±6 000 SEK ≈ one lunch.
// Anchored to SCENARIO_CASH_DELTA_SEK per constants.ts.
export interface CashWrite {
  amount: number;   // signed SEK
}

// ORDER 048 §6 — depth via meter-threshold-dependent consequences.
// When a scenario choice has a `belowThreshold` clause and the
// specified capital is BELOW `min` at resolve time, the amplifier
// applies: the choice's theme delta is multiplied by
// `amplifyThemeDelta` (typically 2 or 3), and the secondaryWrites'
// deltas are multiplied by `amplifySecondary`. Reads as "you took
// the shortcut when the capital could least afford it."
//
// Example: moral-dilemma A (ta fisken) is a normal ecological hit
// when ecological ≥ 0.4; below that threshold the hit doubles.
// ORDER 048 §5 — a concrete professional question the scenario's
// sender (or a specific role) asks the player after a scenario
// choice lands. Reverses Addendum A's rejection of quiz questions:
// that rejection was aimed at quiz-as-side-panel, judged for
// points. This is knowledge tested AT THE MOMENT IT IS NEEDED,
// by the person who needs it, about a guest who is waiting.
//
// Attached to a specific ScenarioChoiceSpec — a question exists
// because that choice produced it. Three options, exactly one
// correct. Wrong choice = a room consequence (stream line + capital
// write). Right choice = an enabler tally + short positive line.
//
// The rendering is a follow-up modal on ScenarioOverlay, phase
// 'question', after 'resolving' but before 'settled'.
export interface QuestionOption {
  label: string;
  correct: boolean;
  // Optional per-option consequence line — used mainly for wrong
  // options ("the drink went out with sugar syrup; the guest
  // returned it"). Right option can use a small positive line.
  consequenceLine?: string;
}

export interface ProfessionalQuestion {
  // Optional prefix override — if the question best fits a
  // specialist different from the scenario's main sender (e.g. main
  // sender is Värden but the question is a wine-pairing question
  // that better fits Servitören or a future sommelier), specify the
  // role here. Falls back to the scenario's main sender.
  senderRole?: StaffRole;
  body: string;
  options: readonly QuestionOption[];   // exactly 3 with one correct
  // Fired when the player picks the correct option. The same
  // enabler+register field also carries the tally decayed on a wrong
  // answer per ORDER 049 §2.1 (2026-08-09) — wrong answers cost the
  // same knowledge they would have paid, not capital.
  correctEnablerWrite?: EnablerWrite;
  correctLine?: string;
}

export interface BelowThresholdAmplifier {
  capital: SustainabilityKey;
  min: number;                    // amplifier fires when value < min
  amplifyThemeDelta: number;      // ×N on themedDelta
  amplifySecondary: number;       // ×N on each secondaryWrites entry
  // Optional flavour line inserted into pendingOutcomes when the
  // amplifier fires. Empty/omitted → no extra stream line, only
  // the numeric amplification.
  extraOutcome?: string;
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
  // ORDER 048 §3 — extra signed writes to non-economic sustainability
  // capitals beyond the drawn-theme primary. Use this for two-way
  // trades on social/ecological. Economic effects go on `cashWrites`
  // (post-ORDER-050 §3, 2026-08-10).
  secondaryWrites?: readonly SustainabilityWrite[];
  // ORDER 050 §3 (2026-08-10) — cash effects in SEK for two-way
  // trades that touch money. E.g. walk-in-of-five choice A lifts
  // social (theme) AND the till (five extra covers) AND drops
  // ecological (crammed kitchen). The till entry lives here so its
  // unit is unambiguous.
  cashWrites?: readonly CashWrite[];
  // ORDER 048 §6 — depth via meter-threshold amplification. Optional.
  // See BelowThresholdAmplifier docs; used to make a choice's
  // consequence larger when a specific capital is already weak, so
  // the same choice reads differently depending on the state of the
  // room. This is what turns a three-choice pick into "depending on
  // where you are, one of these is much worse than the other two."
  belowThreshold?: BelowThresholdAmplifier;
  // ORDER 048 §5 — optional professional question fired AFTER the
  // player picks this choice. See ProfessionalQuestion for shape.
  // Cycle-1 attaches one per scenario, on the highest-competence
  // choice, so proving the format doesn't require a copy explosion.
  professionalQuestion?: ProfessionalQuestion;
  // ORDER 048 §2.2 — immediate plain-voice consequence line fired
  // ~0.5 s after RESOLVE_SCENARIO. Not observer voice; a plain
  // "this is what followed from the answer" statement. This is what
  // makes the connection between choice and effect visible.
  // Optional; when absent the scenario resolves silently in the
  // stream (mentor comment still fires at t+35 s).
  immediateOutcome?: string;
  // Outcome events fired at t+6 s and t+18 s after resolve. Observer
  // voice. ORDER 048 §2.3 relocated this voice to the evening account
  // only — the `outcomes` field is no longer scheduled to the service
  // stream. Retained on the spec so evening-account synthesis can
  // read from it in future work. Empty = no evening-account
  // synthesis material for this choice.
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
  // ORDER 048 §4 — ranked roles that best fit this scenario as the
  // sender. Selection uses the FIRST role in this list that has a
  // team member (70 % of the time, per pickScenarioSender), or the
  // team's weakest member on the scenario's relevant axis (30 %).
  // The winning member's role becomes the prefix on subject-body:
  // "Värden: Ett sällskap står i entrén — utan bokning."
  preferredSenderRoles: readonly StaffRole[];
  // Which competence axis the scenario is fundamentally about; used
  // by the weakness-selection path. For social scenarios it is
  // typically 'cultural'; for economic 'practical'; for ecological
  // 'scientific' (kitchen technique + supplier knowledge).
  senderWeaknessAxis: keyof RoleCompetence;
}

// ---------- walk-in-of-five (social) --------------------------------------

const WALK_IN_OF_FIVE: ScenarioSpec = {
  id: 'walk-in-of-five',
  sustainability: 'social',
  subjectBody: 'Ett sällskap står i entrén — utan bokning.',
  subjectCta: 'Fortsätt',
  situationBody:
    'Fem personer i sällskapet. Kvällens service börjar snart och rummet är delvis bokat. Vad gör du?',
  preferredSenderRoles: ['värd', 'servitör'],
  senderWeaknessAxis: 'cultural',
  choices: {
    A: {
      label: 'Sätt alla fem — slå ihop fyran och ett tvåbord.',
      registerWrites: [{ enabler: 'cultural', register: 'techne', amount: 0.05 }],
      spawnedRemaining: 5,
      nextSpawnAtOffset: 0.4,
      capitalSign: 1,
      // ORDER 048 §3 trade — five extra covers lifts the till (an
      // extra cover at medium/utvald yields ~360 SEK, so five is a
      // small-lunch-sized bump); crammed kitchen produces more waste,
      // drops ecological. Two-way movement the player watches happen
      // in the same beat.
      secondaryWrites: [
        { capital: 'ecological', delta: -0.02 }
      ],
      cashWrites: [
        // ORDER 050 §3 (2026-08-10) — the economic secondaryWrite
        // (delta 0.03) migrated to a cashWrite. 3 000 SEK ≈ five
        // extra covers at medium/utvald: half a lunch of found revenue.
        { amount: 3000 }
      ],
      // ORDER 048 §6 depth — cramming a strained room compounds the
      // ecological hit. The kitchen's waste gets worse under load;
      // taking the party when the team is already at the edge is a
      // bigger ecological hit than taking it in a calm evening.
      belowThreshold: {
        capital: 'social',
        min: 0.4,
        amplifyThemeDelta: 1,
        amplifySecondary: 2,
        extraOutcome:
          'Diskstationen svämmade över med tallrikar från sammanslagningen — halva restpartierna gick till spillo utan att någon hann sortera. Hm, den där sortens svinn kommer inte tillbaka.'
      },
      // ORDER 048 §5 — concrete professional question at the moment
      // it matters. Sammanslagningen är gjord; hur ducka man den
      // så grannbordet inte känner sig trängt är ett värdsansvar.
      professionalQuestion: {
        senderRole: 'värd',
        body: 'När du slår ihop fyran och tvåan — vad gör du med grannbordets bestick och glas?',
        options: [
          {
            label: 'Flyttar dem försiktigt till grannens plats i samma rörelse som jag hämtar extra bestick.',
            correct: true
          },
          {
            label: 'Ber grannbordet flytta sig så du kan ställa i ordning ostört.',
            correct: false,
            consequenceLine:
              'Grannbordet flyttades bort utan att någon frågade dem först — de reste sig försiktigt och satte sig igen med ryggen mot rummet. Blicken de växlade räknas inte i notan, men de kom inte tillbaka nästa vecka.'
          },
          {
            label: 'Rör dem inte — låter grannbordet själva stuva undan när sällskapet kommer fram.',
            correct: false,
            consequenceLine:
              'Grannbordet fick själva ordna undan sina glas — de gjorde det tyst men servitören noterade det för sent. Hm, den där lilla omtanken var det bara vi som märkte att vi hoppade över.'
          }
        ],
        correctEnablerWrite: { enabler: 'cultural', register: 'phronesis', amount: 0.05 },
        correctLine:
          'Värden gled förbi grannbordet med en gest och besticken flyttades utan att någon behövde be — bordet log utan att veta varför det var lugnare på plats efter.'
      },
      immediateOutcome: 'Sällskapet fick fyran och tvåan ihopslagna. Grannbordet flyttades.',
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
      immediateOutcome: 'Fyra vid fyran, en vid baren. Bartendern hälsar den femte.',
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
      immediateOutcome: 'Sällskapet nekades. Två stod kvar i entrén, tre vände.',
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
  preferredSenderRoles: ['servitör', 'värd'],
  senderWeaknessAxis: 'practical',
  choices: {
    A: {
      label: 'Ta bokningen och kör nya menyn direkt.',
      registerWrites: [{ enabler: 'cultural', register: 'techne', amount: 0.05 }],
      spawnedRemaining: 0,
      nextSpawnAtOffset: 0,
      capitalSign: 1,
      // ORDER 048 §3 trade — the delegation's revenue landed but the
      // team's evening tempo took the hit. Economic + , social − .
      secondaryWrites: [
        { capital: 'social', delta: -0.02 }
      ],
      // ORDER 048 §6 depth — pushing the team when social is already
      // low doubles the hit. Bad morale + tempo hit compounds.
      belowThreshold: {
        capital: 'social',
        min: 0.4,
        amplifyThemeDelta: 1,
        amplifySecondary: 2,
        extraOutcome:
          'Kocken vände sig bort utan att svara när jag nämnde bokningen — jag har sett den blicken innan. Hm, den där sortens tystnad kostar mer än en kväll.'
      },
      // ORDER 048 §5 — professional question. Menybytet är gjort;
      // hur man tempererar upp en reduktion utan att den skär sig
      // är ett köksansvar. Kocken frågar den som är på pass.
      professionalQuestion: {
        senderRole: 'kock',
        body: 'När du ska temperera upp den kalla reduktionen till serveringstemperatur — hur gör du för att den inte ska skära sig?',
        options: [
          {
            label: 'Värmer långsamt i vattenbad under omrörning tills den släpper från kanten.',
            correct: true
          },
          {
            label: 'Kokar upp den på hög värme så bakterierna dör och smaken samlar ihop sig.',
            correct: false,
            consequenceLine:
              'Reduktionen skar sig på grillen — såsen som gick ut var kornig i strukturen. Två av bordens fyra huvudrätter kom tillbaka; kocken svor tyst men bytte utan att kommentera.'
          },
          {
            label: 'Rör i lite smör direkt så emulsion håller ihop den när den värms.',
            correct: false,
            consequenceLine:
              'Smöret rördes in för tidigt och emulsionen brast under värmen — såsen skar sig och tappade sin balans. Servitören bar den ut men gjorde en grimas när hon vände.'
          }
        ],
        correctEnablerWrite: { enabler: 'scientific', register: 'episteme', amount: 0.05 },
        correctLine:
          'Kocken satte reduktionen i vattenbad och rörde varsamt tills den slappnade — såsen som gick ut satt som den ska på tallriken.'
      },
      immediateOutcome: 'Menyn byts mitt i passet. Två pågående order läggs om.',
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
      immediateOutcome: 'Bokning skriven för imorgon. Kvällen fortsätter oförändrad.',
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
      immediateOutcome: 'Bokningen nekades. Delegationen la på utan att vidare försöka.',
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
  preferredSenderRoles: ['kock', 'lärling'],
  senderWeaknessAxis: 'scientific',
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
      // ORDER 048 §3 trade — cost of the shortcut lands ecologically;
      // the immediate revenue holds (till up) but if the story reaches
      // a guest the room reads it (social −). The room seldom does —
      // this is the "invisible cost" reading.
      secondaryWrites: [
        { capital: 'social', delta: -0.01 }
      ],
      cashWrites: [
        // ORDER 050 §3 (2026-08-10) — the economic secondaryWrite
        // (delta 0.02) migrated to a cashWrite. 2 000 SEK ≈ the
        // portioned fish that would otherwise have been re-bought:
        // the shortcut's found money.
        { amount: 2000 }
      ],
      // ORDER 048 §6 depth — a shortcut on ecological when the
      // capital is already weak doubles the hit. Reads as "you took
      // the shortcut when the supplier trust could least afford it";
      // the room noticed once, this time the pattern is showing.
      belowThreshold: {
        capital: 'ecological',
        min: 0.4,
        amplifyThemeDelta: 2,
        amplifySecondary: 1.5,
        extraOutcome:
          'Två stamgäster har lagt märke till att ursprunget aldrig nämns längre — jag hörde dem prata om det vid utpasseringen. Hm, den där tystnaden är svår att hämta tillbaka.'
      },
      immediateOutcome: 'Fisken går ut. Spårbarheten nämns inte.',
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
      immediateOutcome: 'Menyn byts. Köket plockar fram kyckling istället för fisken.',
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
      immediateOutcome: 'Menyn skrivs om helt. Säsongens gröna lyfts fram.',
      outcomes: [
        'De gröna alternativen presenterades med sin egen berättelse — servitören berättade om odlaren och veckans skörd. Bordspratet steg märkbart över tre bord. Undrar om vi kommer att se det här som en punkt där menyn ändrades permanent, eller som en engångskväll.',
        'En gäst vid pass 4 noterade uttryckligen att kvällens meny hade ändrats och nickade uppskattande — hon frågade var grönsakerna kom ifrån. Servitören visste svaret. Hm, det där svaret är resultatet av morgonens beslut att inte ta genvägen.'
      ],
      mentor: {
        1: 'Djärvt val — förvandlar en risk till en möjlighet. Kräver att köket är med.',
        2: 'Ekologiskt drag. Menyn får ny riktning och säsongen blir läslig.',
        3: 'Radikal linje. Om laget klarar den blir det en kväll som räknas som skifte, inte ersättning.'
      },
      // ORDER 048 §5 — professional question. Menyn skrivs om;
      // vilken svamp håller sin form bäst under rostning vid hög
      // temperatur är ett köksansvar när sammansättningen väljs.
      professionalQuestion: {
        senderRole: 'kock',
        body: 'När du väljer svamp för rostning vid hög temperatur — vilken håller sin form bäst utan att vattna ur sig?',
        options: [
          {
            label: 'Kantarell — den släpper minst vätska och behåller strukturen.',
            correct: true
          },
          {
            label: 'Champinjon — den är kompakt och tål hög värme rakt av.',
            correct: false,
            consequenceLine:
              'Champinjonerna släppte sin vätska på pannan och kokade snarare än rostade — färgen blev grå och strukturen slaka. Två av tallrikarna gick ut med det som skulle ha varit crunch men blev sladd.'
          },
          {
            label: 'Skogschampinjon — den är mest smakintensiv och står emot hetta.',
            correct: false,
            consequenceLine:
              'Skogschampinjonerna kollapsade i pannan — de har för hög vattenhalt för torr rostning. Gästerna åt utan att kommentera; kocken noterade det utan att förklara vidare.'
          }
        ],
        correctEnablerWrite: { enabler: 'scientific', register: 'episteme', amount: 0.05 },
        correctLine:
          'Kantarellerna rostade upp med behållen form och en gyllene yta — pass 4 nämnde smaken utan att fråga vidare.'
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

// ORDER 047 §4 — filtered pick: return a spec for the drawn theme,
// avoiding any scenarioId in `firedIds` and (when possible) avoiding
// `avoidOpenerId`. Cycle-1 has only one spec per theme, so the filter
// is effectively a single-slot dedup — if this service already fired
// the drawn theme's scenario, fall back to the least-recently-used
// alternative regardless of theme. When more variants land per theme
// (see ORDER 047 out-of-scope note), this pool logic scales up.
export function pickScenarioSpecFiltered(
  theme: SustainabilityKey,
  firedIds: readonly string[],
  avoidOpenerId: string | null
): ScenarioSpec {
  const preferred = SCENARIO_BY_THEME[theme] ?? WALK_IN_OF_FIVE;
  const isFired = (id: string) => firedIds.includes(id);
  // First choice: the drawn-theme spec if it hasn't fired this service
  // and isn't the previous service's opener.
  if (!isFired(preferred.id) && preferred.id !== avoidOpenerId) {
    return preferred;
  }
  // Second: any spec that hasn't fired this service, biased away from
  // avoidOpenerId if possible.
  const unfired = ALL_SCENARIOS.filter((s) => !isFired(s.id));
  if (unfired.length > 0) {
    const nonOpener = unfired.filter((s) => s.id !== avoidOpenerId);
    if (nonOpener.length > 0) return nonOpener[0];
    return unfired[0];
  }
  // Third: everything has fired this service — the pool is exhausted.
  // Fall back to the preferred spec anyway (a repeat is better than
  // no fire; the wager loop must not stall). This only happens when
  // the density × service length exceeds ALL_SCENARIOS.length, which
  // at 0.22/min × 15 min ≈ 3.3 scenarios and ALL_SCENARIOS.length = 3
  // is exactly on the boundary.
  return preferred;
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

// ORDER 048 §4 — pick which team member "sends" the scenario. The
// question the player is asked comes from a specific person on
// staff, and their role appears as a prefix on the subject-body:
//   "Värden: Ett sällskap står i entrén — utan bokning."
//
// Two paths:
//   - Role-fit (70 %): pick the first role in spec.preferredSenderRoles
//     that has a team member. The most natural sender for the theme.
//   - Weakness (30 %): pick the team member with the LOWEST competence
//     on the scenario's sender-weakness axis. Reads as "they need you
//     because no-one else knows." A thin team is audible here — a
//     lärling ends up sending the culturally-loaded question when no
//     värd is on the roster.
//
// Selection uses the passed Rng so a fresh (state.seed × state.tick)
// derivation stays deterministic per (scenario fire, team roster).
// Returns null when the team is empty (defensive; no scenario should
// fire with zero members, but the caller must handle it).
//
// The Vision Owner's B-004 expansion (eight roles including bartender
// and sous-chef) will slot in naturally — extend StaffRole and the
// preferredSenderRoles lists per scenario. Cycle-1 uses the existing
// four (värd, servitör, kock, lärling).

const WEAKNESS_PATH_PROBABILITY = 0.3;

export interface ScenarioSender {
  role: StaffRole;
  memberId: string;
}

export function pickScenarioSender(
  spec: ScenarioSpec,
  team: TeamState,
  rng: { next(): number }
): ScenarioSender | null {
  if (team.members.length === 0) return null;
  const roll = rng.next();
  if (roll < WEAKNESS_PATH_PROBABILITY) {
    // Weakness path — pick the LOWEST competence on the axis. Reads
    // as the team member who most needs help hearing the question.
    let weakest = team.members[0];
    for (const m of team.members) {
      if (m.competence[spec.senderWeaknessAxis] < weakest.competence[spec.senderWeaknessAxis]) {
        weakest = m;
      }
    }
    return { role: weakest.role, memberId: weakest.id };
  }
  // Role-fit path — first preferred role that has a member.
  for (const preferred of spec.preferredSenderRoles) {
    const found = team.members.find((m) => m.role === preferred);
    if (found) return { role: found.role, memberId: found.id };
  }
  // Nothing preferred — fall back to the first member on staff.
  const fallback = team.members[0];
  return { role: fallback.role, memberId: fallback.id };
}

// Role → sender prefix (Swedish, capitalised, colon-suffix). Kept
// as a small map here rather than in strings.sv.ts so the scenario
// spec stays authorable in one place.
export const SENDER_PREFIX: Record<StaffRole, string> = {
  'värd':     'Värden',
  'servitör': 'Servitören',
  'kock':     'Kocken',
  'lärling':  'Lärlingen'
};
