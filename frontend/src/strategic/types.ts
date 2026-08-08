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

export interface ScenarioState {
  hasAutoTriggered: boolean;
  active: boolean;
  awaitingChoice: boolean;
  choice: ScenarioChoice | null;
  choiceAt: number | null;
  spawnedRemaining: number;
  nextSpawnAt: number;
  visibleGuestIds: string[];
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
