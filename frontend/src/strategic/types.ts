export type ViewLabel = 'grythyttan' | 'kvarteret' | 'vinbaren';

// ORDER 043 v3 §10 step 5 (per Addendum A §A.6 order): the team.
// Four roles, three of them permanent (värd/servitör/kock) and one
// junior (lärling) that plays a floor role but with low competence.
// StaffMember (below) is the *visual* puck on the floor; TeamMember
// (further down) is the *economic* record — cost, competence,
// contract. The two layers are kept separate so a role swap or an
// agency hire during service doesn't require re-shuffling positions.
export type StaffRole = 'värd' | 'servitör' | 'kock' | 'lärling';

// Competence axes per member. Mapped to the event stream's cause
// sources: scientific → kitchen technique (kock reads high, others
// low); cultural → hospitality + supplier relationships (värd high,
// servitör mid); practical → house-standard execution (all
// contribute). Deliberately three axes to keep the model legible
// without collapsing into a single "skill" number.
export interface RoleCompetence {
  scientific: number;
  cultural: number;
  practical: number;
}

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

// ORDER 043 team member — the economic record for hiring, cost,
// competence, and contract. Runs alongside StaffMember (visual puck
// on the floor). One TeamMember can correspond to one StaffMember,
// but the two lifecycles are independent: agency staff mid-service
// add a TeamMember without a StaffMember (no visual puck for cycle
// 1), and a future scenario could remove a StaffMember for the
// duration of a shift without cancelling the TeamMember's contract.
export interface TeamMember {
  id: string;
  role: StaffRole;
  competence: RoleCompetence;
  // Structural cost — the business pays this amount per operating
  // day (day-advance in reducer) for the duration of the contract.
  // "Locked over multiple days" per Vision Owner: a hired role
  // must be paid until contractEndsDay, even if you regret it.
  dailyCost: number;
  hiredOnDay: number;
  contractEndsDay: number;
  // Agency hires join for a single service and disappear at close.
  // isAgency=true bypasses the day-advance cost accumulation (they
  // have their own one-time cost paid at hire).
  isAgency: boolean;
}

export interface TeamState {
  members: TeamMember[];
  // Structural cost paid so far (running total in "credits").
  // Displayed nowhere for the player — the effect of cost is felt
  // via the economic capital, which absorbs the accumulation.
  paidStructuralCost: number;
  // ORDER 043 v3 §10 step 5 agency-offer strain tracker. Null when
  // load is below AGENCY_OFFER_LOAD_THRESHOLD; simTime of the
  // first tick when strain crossed threshold otherwise. When
  // (simTime − strainSinceSimTime) ≥ AGENCY_OFFER_SUSTAINED_SEC an
  // offer fires and the tracker resets to null.
  strainSinceSimTime: number | null;
}

// ORDER 043 v3 §10 step 5 agency staff offer. Fires when strain
// (activeGuests / teamCapacity) exceeds AGENCY_OFFER_THRESHOLD for
// AGENCY_OFFER_SUSTAINED_SEC continuous seconds. Player can accept
// (costs money, adds a temporary TeamMember) or decline (costs
// social capital — the team suffers under strain without help,
// which is a legible cost even in the same evening).
export interface AgencyOffer {
  role: StaffRole;              // which role the strain read as needing
  moneyCost: number;            // one-time hire cost
  socialCostIfDeclined: number; // capital delta if player declines
  offeredAt: number;            // simTime
  expiresAt: number;            // simTime — offer window
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
  // ORDER 043 v3 §7 chain — theme drawn at trigger time (before the
  // player sees the scenario), consumed at resolve to move the themed
  // capital and pay out any standing wager. Null between scenarios
  // and during the resting phases.
  drawnTheme: SustainabilityKey | null;
  // ORDER 043 v3 §10 step 5 — id of the scenario spec chosen at
  // trigger from the drawn theme (see scenarios.ts). The overlay
  // reads strings, choice labels, mentor lines, etc. from the spec.
  // Null between scenarios; set at triggerScenario.
  scenarioId: string | null;
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

// ORDER 043 v3 §2 — the day as the unit of play. Cycle-1 scope
// (v3 §10 step 1): morning / lunch / dinner only; night deferred.
//
// Five phases so each service has its own bracket:
//   morning   — pre-lunch, player picks lunch length (or skips)
//   lunch     — service running
//   afternoon — pre-dinner, player picks dinner length
//   dinner    — service running
//   evening   — brief close, auto-advances to next day's morning
export type DayPeriod =
  | 'morning'
  | 'lunch'
  | 'afternoon'
  | 'dinner'
  | 'evening';

// Player-chosen service length range per v3 §2 ("between roughly 3
// and 30 minutes"). Kept as a min/max pair here rather than a fixed
// step set so a future order can loosen or step the picker without
// touching the reducer's clamping.
export const SERVICE_LENGTH_MIN_MINUTES = 3;
export const SERVICE_LENGTH_MAX_MINUTES = 30;

// ORDER 045 — weather conditions for a service window. Deterministic
// per (rngState + dayNumber + service) so the same seed yields the
// same evening. Affects arrivals (warm & still lifts demand, cold &
// windy drops it), the derivation of guests already-waiting at the
// doors, and the outdoor-terrace viability call.
export type PrecipitationKind = 'none' | 'drizzle' | 'rain' | 'snow';
export type CloudCover = 'clear' | 'partly' | 'overcast';

export interface WeatherConditions {
  tempC: number;                  // rounded to whole degrees
  windMS: number;                 // rounded to 1 decimal
  precipitation: PrecipitationKind;
  cloudCover: CloudCover;
  // Derived: outdoor terrace viable if warm-ish + not too windy + no rain.
  outdoorViable: boolean;
}

// ORDER 045 outer-world factors. Rare per-service events that
// modulate arrivals, waiting count, revenue, or delivery cadence.
// Each factor has a fire rate (Bernoulli per service) and one or
// two realisations picked when it fires. Kind alone is stored on
// state; labels + multipliers live in worldFactors.ts so state
// stays portable (§11.1).
export type WorldFactorKind =
  | 'konjunktur_uppgang'
  | 'konjunktur_nedgang'
  | 'vagarbeten'
  | 'sasong_turism'
  | 'sasong_semester'
  | 'evenemang_festival'
  | 'evenemang_hockey';

export interface ActiveWorldFactor {
  kind: WorldFactorKind;
}

// ORDER 043 Addendum B — one guaranteed prep event slot. Two of
// these are scheduled per service at fixed offsets into the prep
// window. `kind` is chosen at OPEN_SERVICE (round-robin across the
// three prep kinds); polarity is decided at fire time from team
// competence for that kind's axis.
export interface PrepFloorSlot {
  dueAt: number;
  kind: 'prep_kitchen' | 'prep_room' | 'prep_delivery';
}

export interface DayState {
  dayNumber: number;               // 1-indexed
  period: DayPeriod;
  periodStartAt: number;           // simTime when this period began
  // Set at OPEN_SERVICE; cleared at close. Null between services and
  // during morning/afternoon/evening.
  currentServiceLengthMinutes: number | null;
  // Random count computed at OPEN_SERVICE, weighted by service length
  // (v3 §2 "scenario count is random, weighted by service length —
  // never a fixed cadence"). Consumed by scenarioTriggerTimes below.
  scenariosPlanned: number;
  scenariosFiredThisService: number;
  // ORDER 043 v3 step 5b — scheduled scenario firing times (absolute
  // simTime), spread across the service window with jitter so cadence
  // is felt as rhythm rather than metronome. Populated at OPEN_SERVICE
  // from scenariosPlanned; consumed head-first as advanceTick fires
  // each scenario. Cleared on any period transition + on SKIP_LUNCH.
  scenarioTriggerTimes: number[];
  // ORDER 045 opening image — set at OPEN_SERVICE to simTime +
  // OPENING_DURATION_SEC. Weather + waiting-count briefing sits
  // over the room during this window. When simTime crosses this
  // timestamp, the opening ends and prep begins.
  openingEndsAt: number | null;
  // ORDER 043 Addendum A prep window — set when opening ends, to
  // simTime + PREP_DURATION_SEC. While non-null the service is
  // "in mise en place": no arrivals, no scenarios, prep events fire
  // on the stream instead. Cleared (set to null) when the prep
  // window expires; the carryover check runs at that moment.
  prepEndsAt: number | null;
  // Number of ignorance-tagged prep events fired during the current
  // prep window. Read at prep-end to decide whether to schedule a
  // carryover bottleneck event ~13 min into service.
  prepIgnoranceCount: number;
  // ORDER 043 Addendum B — the prep floor. Two guaranteed prep
  // events per service, scheduled at fixed offsets into the prep
  // window. Polarity picked at fire time from team competence for
  // the kind's axis: > 0.5 → positive (prep going well), else →
  // ignorance (prep going wrong). Ensures a strong team's mise en
  // place doesn't read as silent. Consumed head-first.
  prepFloorSchedule: PrepFloorSlot[];
  // ORDER 045 — the evening's weather. Generated at OPEN_SERVICE.
  weather: WeatherConditions | null;
  // Number of guests already outside when the opening panel appears,
  // derived from reputation × weather × world factors. They spawn as
  // arrivals the moment the prep window closes ("doors open").
  waitingAtOpening: number;
  // Set once at prep-end so the door-opening waiting-spawn only fires
  // once, not every tick after prep closes.
  doorsOpenedThisService: boolean;
  // ORDER 045 outer-world factors — 0-N per service, rolled at
  // OPEN_SERVICE. Empty on most evenings; the outer world reports
  // in ~37 % of services (any factor firing). Cleared on close.
  worldFactors: ActiveWorldFactor[];
  // ORDER 046 §1 — set true when a collapse roll fires during this
  // service. Blocks the collapse tick from firing twice in the same
  // service; read by the evening-account panel to pick the collapsed
  // branch. Cleared on service open.
  serviceCollapsed: boolean;
  // Which competence axis was weakest at the moment of collapse
  // (scientific / cultural / practical). Null when no collapse has
  // fired this service. Consumed by the evening-account panel and
  // future scenarios that want to reference the specific failure.
  collapseAxis: 'scientific' | 'cultural' | 'practical' | null;
  // ORDER 046 §3 — snapshots of state.revenue and state.cost at
  // OPEN_SERVICE, so the evening-account panel can compute this
  // service's net take by subtraction. Null between services.
  revenueAtServiceStart: number | null;
  costAtServiceStart: number | null;
  // Reputation at the moment OPEN_SERVICE was dispatched — the
  // evening account uses this to say "kvällen bevarade ryktet" vs
  // "ryktet gick tillbaka" without surfacing the number itself.
  reputationAtServiceStart: number | null;
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

// ORDER 043 Addendum A — the service event stream.
//
// Short written notices that appear as things happen in the room:
// weighted by team competence (ignorance-events) and team load
// (strain-events). See eventStream.ts for the mechanics and
// eventStream.sv.ts for the sentence banks.
//
// Three categories:
//   ambient  — rolled per tick from base rates × ignorance × strain
//   outcome  — hand-authored per (scenario, choice), fires
//              deterministically 6 s and 18 s after RESOLVE_SCENARIO
//              to fill the space between choice and mentor comment.
//   positive — verksamhet som går bra. Fills calm periods, absence
//              during a lull is itself a signal (Vision Owner
//              2026-08-08: "frånvaro betyder att något är fel").
//              Fires only during service, gated by calmness × team
//              competence — a weak or strained team gets no positives.
export type EventStreamCategory = 'ambient' | 'outcome' | 'positive';
export type EventStreamCauseTag = 'ignorance' | 'strain' | 'both';

export interface EventStreamEntry {
  at: number;                 // simTime
  text: string;               // hand-authored Swedish
  category: EventStreamCategory;
  causeTag: EventStreamCauseTag | null;   // null for outcome
  sustainability: SustainabilityKey;
  kind: string;               // ambient event kind name, or 'outcome'
  scenarioId: string | null;  // set for outcome events
}

// ORDER 046 §3 — evening account, captured at evening period start.
export type EveningAccountBranch =
  | 'collapsed'
  | 'high_wager_win'
  | 'high_wager_loss'
  | 'good'
  | 'thin'
  | 'mediocre';

export interface EveningAccount {
  branch: EveningAccountBranch;
  // 3–5 sentences, plain-authored Swedish in observer voice. Rendered
  // in EveningAccountPanel as a block; no per-sentence styling.
  paragraph: string;
  presentedAt: number;   // simTime — start of fade-in
}

export interface PendingOutcome {
  dueAt: number;              // simTime when this outcome should emit
  text: string;
  sustainability: SustainabilityKey;
  scenarioId: string;
  // ORDER 043 Addendum A prep-carryover — emit as ambient bottleneck
  // rather than as a scenario outcome. Defaults to 'outcome' (the
  // scenario-response case). 'prep-carryover' is used when a weak
  // mise en place scheduled a bottleneck event ~13 min into service.
  flavor?: 'outcome' | 'prep-carryover';
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
  // ORDER 043 v3 §2 day model. Rounds gate services, service length
  // gates scenario cadence, periods gate what the player can do.
  day: DayState;
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
  // ORDER 043 Addendum A service event stream. `eventStream` is a
  // ring-buffered recent-events list (bounded); `pendingOutcomes`
  // holds scheduled outcome events waiting to fire at their dueAt.
  eventStream: EventStreamEntry[];
  pendingOutcomes: PendingOutcome[];
  // ORDER 046 §3 — the evening account. Non-null between the moment
  // dinner/lunch ends (natural or collapse) and the moment morning
  // begins. Captured once so the paragraph doesn't shift while the
  // player reads it. `presentedAt` drives the fade-in / fade-out
  // timing in EveningAccountPanel.
  eveningAccount: EveningAccount | null;
  // ORDER 047 §2 — staff morale scalar in [0, 1]. Live feedback layer
  // that couples the room's satisfaction back into the sim's
  // competence: effectiveCompetence(axis) = teamCompetence(axis) ×
  // (0.65 + 0.35 × morale), consumed by event-stream ignorance rates
  // and the collapse formula's `weakest`. Written by scenario
  // resolution, agency accept/decline, stream events, departures,
  // collapse, and a per-tick drift toward `0.5 + 0.5 × meanSat`.
  morale: number;
  // ORDER 047 §5 — per-service running tally of which theme axis the
  // ambient stream has been reporting on. Feeds a stream-weight term
  // into drawNextTheme so the next scenario tends (but is not forced)
  // to match what the room has been showing. Reset at OPEN_SERVICE.
  streamThemeCounts: Record<SustainabilityKey, number>;
  // ORDER 047 §4 — scenario ids fired during the current service, and
  // the opener id from the previous service. Consumed by the scenario
  // selector to avoid repeating within a service and to avoid opening
  // two services in a row on the same content. Cleared at OPEN_SERVICE.
  firedScenarioIds: string[];
  lastServiceOpenerId: string | null;
  // ORDER 043 v3 §10 team layer — economic record for hiring, cost,
  // competence. Runs alongside `staff` (visual pucks). Cost
  // accumulates on day-advance; competence is read by the event
  // stream weighting and the reputation loop's capacity denominator.
  team: TeamState;
  // ORDER 043 v3 §10 agency-staff mid-service offer. Set when
  // sustained strain triggers an offer; cleared on accept / decline
  // / service close. Player-facing UI reads this to show the offer
  // panel and dispatch ACCEPT_AGENCY / DECLINE_AGENCY.
  agencyOffer: AgencyOffer | null;
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
  // ORDER 043 v3 §10 step 1 — the round.
  // OPEN_SERVICE is dispatched from the morning/afternoon UI when the
  // player commits to a service length. lengthMinutes clamped to
  // [SERVICE_LENGTH_MIN_MINUTES, SERVICE_LENGTH_MAX_MINUTES].
  | { type: 'OPEN_SERVICE'; service: 'lunch' | 'dinner'; lengthMinutes: number }
  // SKIP_LUNCH advances morning → afternoon without a lunch service.
  // Legitimate play — v3 §2: "not all businesses run lunch".
  | { type: 'SKIP_LUNCH' }
  // ORDER 043 v3 §10 step 5 agency-staff mid-service offer response.
  | { type: 'ACCEPT_AGENCY' }
  | { type: 'DECLINE_AGENCY' }
  // ORDER 043 v3 §10 step 5 morning hiring — the decision surface
  // §11 point 1 requires. HIRE_TEAM_MEMBER adds a role at the
  // current day's default competence + cost + a fresh 7-day
  // contract. FIRE_TEAM_MEMBER pays out the remaining contract as
  // a buyout so quitting is not free while the contract runs.
  | { type: 'HIRE_TEAM_MEMBER'; role: StaffRole }
  | { type: 'FIRE_TEAM_MEMBER'; memberId: string }
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
