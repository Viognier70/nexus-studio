export type ViewLabel = 'grythyttan' | 'kvarteret' | 'vinbaren';

export type StaffRole = 'värd' | 'servitör' | 'kock';

export type GuestState =
  | 'arriving'
  | 'waiting'
  | 'seated'
  | 'ordering'
  | 'dining'
  | 'paying'
  | 'leaving'
  | 'declined';

export type TaskType =
  | 'greet'
  | 'seat'
  | 'order'
  | 'serve'
  | 'decant'
  | 'flambe'
  | 'clear'
  | 'welcomeDrink';

export type ServiceConcept = 'vardaglig' | 'formell';
export type PricingTier = 'låg' | 'medel' | 'hög';
export type IngredientTier = 'grund' | 'utvald' | 'premium';

export interface Policies {
  staffCount: 2 | 3 | 4;
  trainingLevel: 1 | 2 | 3;
  service: ServiceConcept;
  pricing: PricingTier;
  capacity: number;
  ingredientTier: IngredientTier;
  welcomeDrink: boolean;
  localSourcing: boolean;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface StaffMember {
  id: string;
  role: StaffRole;
  workload: number;
  taskType: TaskType | null;
  taskProgress: number;
  taskDuration: number;
  targetGuestId: string | null;
  position: Vec2;
  targetPosition: Vec2;
  moveProgress: number;
}

export interface Guest {
  id: string;
  state: GuestState;
  satisfaction: number;
  seatIndex: number | null;
  arrivalTime: number;
  stateTime: number;
  scenarioSource: boolean;
  position: Vec2;
  targetPosition: Vec2;
  moveProgress: number;
  hadWelcomeDrink: boolean;
  // ORDER 043 §6 economic-phenomenon flag. When true, the guest walks
  // to the entrance and turns back without sitting — the visible
  // reading of low economic capital ("guests leaving without sitting").
  // Decided at spawn time from the current economic capital value;
  // wired in arrivals.ts via maybeSpawnGuest.
  walkAwayOnArrival: boolean;
}

export type SustainabilityDirection =
  | 'stabil'
  | 'förbättras'
  | 'försämras'
  | 'kritisk';

export interface SustainabilityCondition {
  value: number;
  direction: SustainabilityDirection;
  cause: string | null;
  consequence: string | null;
  lastChangeAt: number;
}

export type ScenarioChoice = 'A' | 'B' | 'C';

// ORDER 042 §3.3: the scenario walks through discrete phases so the
// difficulty wager (§4.3) is captured before the situation is revealed
// (§4.2). `awaitingChoice` is retained as a derived convenience for
// the arrivals suspension check in the reducer and its existing tests;
// it equals `phase === 'situation'`.
export type ScenarioPhase =
  | 'idle'
  | 'subject'
  | 'difficulty'
  | 'situation'
  | 'resolving'
  | 'settled';

export type ScenarioDifficulty = 1 | 2 | 3;

export interface ScenarioState {
  hasAutoTriggered: boolean;
  active: boolean;
  phase: ScenarioPhase;
  difficulty: ScenarioDifficulty | null;
  awaitingChoice: boolean;
  choice: ScenarioChoice | null;
  choiceAt: number | null;
  spawnedRemaining: number;
  nextSpawnAt: number;
  visibleGuestIds: string[];
  // Populated by the reducer when the scenario transitions to
  // `settled`. Rendered as an in-world text bubble by MentorComment;
  // per CAMERA_AND_GAMEPLAY_BIBLE §8.1 this must not be a modal.
  mentorComment: string | null;
  mentorCommentAt: number | null;
}

export interface Resident {
  id: string;
  splineId: number;
  progress: number;
  speed: number;
}

export interface Pedestrian {
  id: string;
  role: 'boende' | 'student' | 'besökare' | 'gäst' | 'leverantör';
  intent: string;
  destination: 'vinbar' | 'café' | 'bageri' | 'hotell' | 'campus';
  splineId: number;
  progress: number;
  speed: number;
}

export interface DeliveryVehicle {
  id: string;
  progress: number;
  active: boolean;
  cooldown: number;
}

// ----- ORDER 043 two-layer capital model ----------------------------------
//
// Outcomes vs enablers per ORDER_043_CAPITAL_WAGER_AND_CONSEQUENCE_CHAIN.md §3.
//
// **Portability contract.** All types below must round-trip through
// JSON without loss (`LEARNING_AND_SCENARIO_ARCHITECTURE.md` §11.1
// "portfolio is a portable format from the outset"). No Map, no class
// instances, no function fields, no ref cycles. Plain-object records
// only. Timestamps use `simTime` (a monotonic sim-seconds counter),
// never `Date.now()` or `performance.now()` — see §11.1 constraint 4
// (time does not depend on the player being logged in) and LQ-04.

// The three outcomes — what is earned, staked, lost, invested (§3.1).
export type SustainabilityKey = 'economic' | 'social' | 'ecological';

// The two enablers — derived from behaviour, never purchased (§3.2, §3.3).
export type EnablerKey = 'scientific' | 'cultural';

// Aristotelian registers scored on every scenario response (§5).
export type Register = 'episteme' | 'techne' | 'phronesis';

// A single write into an enabler's behavioural evidence — the primary
// unit of the portfolio (§8: "a portfolio may later show what the
// player has done — as a history to revisit, never as a dashboard").
// Running tallies are derived from this log; the log is authoritative.
export interface EnablerEvent {
  at: number;                    // simTime — see portability contract above
  register: Register;
  amount: number;                // magnitude of the exercise (small positive)
  scenarioId: string | null;     // the scenario that generated it, or null
}

export interface EnablerRecord {
  // Derived running tally per register, computed from `history`.
  // NEVER shown to the player as scores (§8). Present in state so the
  // reducer + tests can read the current level cheaply without
  // re-summing the history each frame.
  episteme: number;
  techne: number;
  phronesis: number;
  history: EnablerEvent[];
}

// Wager state. Fixed unit stake for cycle 1 (§4 numbers-to-be-tuned).
export interface WagerState {
  capital: SustainabilityKey;    // what the player pointed at
  placedAt: number;              // simTime
  amount: number;                // stake magnitude
}

// One consequence event per sustainability in cycle 1 (§6, §10).
// `staff_resigns` fires when social ≤ threshold, `supplier_drops` when
// ecological ≤ threshold, `regulars_stop` when economic ≤ threshold.
// The kind names the physical event in the room; the trigger is
// purely capital-value driven.
export type ConsequenceEventKind =
  | 'staff_resigns'
  | 'supplier_drops'
  | 'regulars_stop';

export interface ConsequenceEvent {
  kind: ConsequenceEventKind;
  capital: SustainabilityKey;    // which capital drove it (redundant with kind but explicit)
  firedAt: number;               // simTime
  active: boolean;               // still shaping the next scenario?
}

export interface CapitalState {
  // Outcome values in [0, 1]. Meaning per §3.1:
  //   economic  — margin, cash, evening's takings — normalised vs a
  //               baseline so a shared-economy future doesn't force a
  //               refactor (see §11.1 constraint 6 handling).
  //   social    — staff, guests, village regard.
  //   ecological — sourcing, waste, seasons.
  values: Record<SustainabilityKey, number>;
  // Per-capital lifetime deltas from wagers + scenario outcomes. The
  // portfolio-visible history of stakes and their results.
  wagerHistory: WagerHistoryEntry[];
  // Themes drawn by the last N scenarios — needed for the §4 damping
  // rule (consecutive-recurrence cap). Kept short (~6 entries).
  themeHistory: SustainabilityKey[];
}

export interface WagerHistoryEntry {
  at: number;                    // simTime the wager was resolved
  staked: SustainabilityKey;     // what the player pointed at
  drew: SustainabilityKey;       // what the next scenario actually was
  outcome: 'win' | 'loss' | 'no_wager';
  delta: number;                 // capital movement applied
}

export interface SimulationState {
  seed: number;
  rngState: number;
  tick: number;
  simTime: number;
  speed: 0 | 1 | 2 | 4;
  policies: Policies;
  staff: StaffMember[];
  guests: Guest[];
  completedGuests: number;
  waitingIds: string[];
  seatedIds: string[];
  revenue: number;
  cost: number;
  waste: number;
  reputation: number;
  eco: {
    econ: SustainabilityCondition;
    social: SustainabilityCondition;
    ecolog: SustainabilityCondition;
  };
  rolling: {
    revenue: number[];
    satisfaction: number[];
    workload: number[];
    waste: number[];
  };
  scenario: ScenarioState;
  // ORDER 043 outcome layer — capitals the player wagers on and
  // scenarios move (§3.1). Separate from `eco` above (§8.2's visible
  // sustainability *reading*), which stays as-is for the room-cue
  // prose and is fed by tickSustainability.
  capitals: CapitalState;
  // ORDER 043 enabler layer — competences derived from behaviour,
  // never purchased (§3.2, §3.3). Rendered growth only via §8: a
  // fourth response option, a mentor line reflecting behaviour.
  enablers: Record<EnablerKey, EnablerRecord>;
  // Current wager placed by the player between scenarios, or null if
  // none is standing (§4).
  wager: WagerState | null;
  // Consequence events fired when a capital crossed its threshold (§6).
  // History + active flag so the next scenario can be shaped by an
  // active event and mentor lines can reference recent history.
  consequenceEvents: ConsequenceEvent[];
  village: {
    residents: Resident[];
  };
  district: {
    pedestrians: Pedestrian[];
  };
  delivery: DeliveryVehicle;
  events: EventLogEntry[];
}

export interface EventLogEntry {
  at: number;
  kind: 'policy' | 'scenario' | 'guest' | 'system';
  text: string;
}

export type SimAction =
  | { type: 'TICK'; dt: number }
  | { type: 'SET_SPEED'; speed: 0 | 1 | 2 | 4 }
  | { type: 'SET_POLICY'; patch: Partial<Policies> }
  | { type: 'RESOLVE_SCENARIO'; choice: ScenarioChoice }
  | { type: 'TRIGGER_SCENARIO' }
  | { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' }
  | { type: 'SET_SCENARIO_DIFFICULTY'; difficulty: ScenarioDifficulty }
  // ORDER 043 wager actions (§4). Cycle-1 stake is fixed magnitude
  // (see reducer WAGER_UNIT_STAKE); a future order can vary it.
  | { type: 'PLACE_WAGER'; capital: SustainabilityKey }
  | { type: 'CLEAR_WAGER' }
  // ORDER 043 enabler write (§3.3, §5). Records behavioural evidence
  // against a register + enabler as a small positive amount. Only
  // scenario responses generate these; nothing else may.
  | { type: 'RECORD_ENABLER_EVENT'; enabler: EnablerKey; register: Register; amount: number; scenarioId: string | null }
  // ORDER 043 dev-only capital nudge. Not for player use — only wired
  // to the B.1 gate playtest shortcuts (StrategicApp.tsx) so the
  // Vision Owner can verify the room reads capital state without
  // waiting for scenario-driven capital movement (Phase B.2+).
  | { type: 'SET_CAPITAL'; capital: SustainabilityKey; value: number }
  | { type: 'RESET' };

export interface CameraTarget {
  focus: Vec2;
  distance: number;
  yaw: number;
  pitch: number;
}

export interface CameraState {
  target: CameraTarget;
  actual: CameraTarget;
  label: ViewLabel;
  selection: Selection | null;
}

export type Selection =
  | { kind: 'building'; id: string; label: string; sub: string }
  | { kind: 'person'; role: string; intent: string; destination: string };

export interface BuildingRef {
  id: string;
  label: string;
  sub: string;
  position: Vec2;
}
