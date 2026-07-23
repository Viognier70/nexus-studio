import { createRng } from '../util/rng';
import type { Policies, SimAction, SimulationState } from '../types';
import { maybeSpawnGuest, scenarioSpawnStep } from './arrivals';
import { revenuePerGuest } from './economics';
import { makeInitialState, makeStaff } from './model';
import { tickGuests, tickStaff } from './service';
import { tickSustainability } from './sustainability';

const AUTO_SCENARIO_AT = 120; // sim-seconds

export function reducer(state: SimulationState, action: SimAction): SimulationState {
  switch (action.type) {
    case 'TICK': {
      const next = advanceTick(state);
      return next;
    }
    case 'SET_SPEED':
      return { ...state, speed: action.speed };
    case 'SET_POLICY':
      return applyPolicyPatch(state, action.patch);
    case 'RESOLVE_SCENARIO':
      return resolveScenario(state, action.choice);
    case 'TRIGGER_SCENARIO':
      return triggerScenario(state, /* auto */ false);
    case 'RESET':
      return makeInitialState(state.seed, state.policies);
    default:
      return state;
  }
}

function advanceTick(state: SimulationState): SimulationState {
  // We mutate a shallow-cloned draft to keep the reducer approachable.
  const draft: SimulationState = {
    ...state,
    staff: state.staff.map((s) => ({ ...s, position: { ...s.position }, targetPosition: { ...s.targetPosition } })),
    guests: state.guests.map((g) => ({ ...g, position: { ...g.position }, targetPosition: { ...g.targetPosition } })),
    waitingIds: [...state.waitingIds],
    seatedIds: [...state.seatedIds],
    rolling: {
      revenue: [...state.rolling.revenue],
      satisfaction: [...state.rolling.satisfaction],
      workload: [...state.rolling.workload],
      waste: [...state.rolling.waste]
    },
    scenario: { ...state.scenario, visibleGuestIds: [...state.scenario.visibleGuestIds] },
    events: state.events,
    village: {
      residents: state.village.residents.map((r) => ({ ...r }))
    },
    district: {
      pedestrians: state.district.pedestrians.map((p) => ({ ...p }))
    },
    delivery: { ...state.delivery },
    eco: {
      econ: { ...state.eco.econ },
      social: { ...state.eco.social },
      ecolog: { ...state.eco.ecolog }
    }
  };

  const rng = createRng(draft.rngState);
  const tickSeconds = 0.2;
  draft.simTime += tickSeconds;
  draft.tick += 1;

  // Village cosmetics.
  for (const r of draft.village.residents) {
    r.progress = (r.progress + r.speed * tickSeconds) % 1;
  }
  for (const p of draft.district.pedestrians) {
    p.progress = (p.progress + p.speed * tickSeconds) % 1;
  }
  if (draft.delivery.active) {
    draft.delivery.progress += 0.08 * tickSeconds;
    if (draft.delivery.progress >= 1) {
      draft.delivery.active = false;
      draft.delivery.progress = 0;
      draft.delivery.cooldown = 60 + rng.range(0, 30);
    }
  } else {
    draft.delivery.cooldown -= tickSeconds;
    if (draft.delivery.cooldown <= 0) {
      draft.delivery.active = true;
      draft.delivery.progress = 0;
    }
  }

  // Regular arrivals.
  if (!draft.scenario.awaitingChoice) {
    const arrival = maybeSpawnGuest(draft, rng);
    if (arrival) draft.guests.push(arrival);
  }

  // Scenario spawning.
  const scenarioGuest = scenarioSpawnStep(draft);
  if (scenarioGuest) {
    draft.guests.push(scenarioGuest);
    draft.scenario.spawnedRemaining -= 1;
    draft.scenario.nextSpawnAt = draft.simTime + 2.2;
    draft.scenario.visibleGuestIds.push(scenarioGuest.id);
  }

  // Move / advance guests and staff.
  tickGuests(draft);
  tickStaff(draft);

  // Payment triggers revenue.
  for (const guest of draft.guests) {
    if (guest.state === 'paying' && guest.stateTime === draft.simTime) {
      draft.revenue += revenuePerGuest(draft.policies);
    }
  }
  // Accumulate cost.
  draft.cost += (costPerMinuteToTick(draft) * tickSeconds) / 60;

  // Sustainability.
  tickSustainability(draft);

  // Auto-trigger scenario once.
  if (!draft.scenario.hasAutoTriggered && draft.simTime >= AUTO_SCENARIO_AT) {
    return triggerScenario(draft, /* auto */ true);
  }

  draft.rngState = rng.state;
  return draft;
}

function costPerMinuteToTick(state: SimulationState): number {
  const base = 9 * state.policies.staffCount;
  const ingredients =
    state.policies.ingredientTier === 'premium'
      ? 12
      : state.policies.ingredientTier === 'utvald'
        ? 7
        : 4;
  const wastePenalty = state.waste * 0.4;
  return base + ingredients + wastePenalty;
}

function applyPolicyPatch(state: SimulationState, patch: Partial<Policies>): SimulationState {
  const policies = { ...state.policies, ...patch };
  const needsStaffRebuild = patch.staffCount && patch.staffCount !== state.policies.staffCount;
  const nextStaff = needsStaffRebuild ? makeStaff(policies.staffCount) : state.staff;
  const event = {
    at: state.simTime,
    kind: 'policy' as const,
    text: describePolicyPatch(patch)
  };
  return {
    ...state,
    policies,
    staff: nextStaff,
    events: [...state.events, event]
  };
}

function describePolicyPatch(patch: Partial<Policies>): string {
  const parts: string[] = [];
  if (patch.staffCount !== undefined) parts.push(`personal ${patch.staffCount}`);
  if (patch.trainingLevel !== undefined) parts.push(`utbildning ${patch.trainingLevel}`);
  if (patch.service) parts.push(`koncept ${patch.service}`);
  if (patch.pricing) parts.push(`pris ${patch.pricing}`);
  if (patch.capacity !== undefined) parts.push(`platser ${patch.capacity}`);
  if (patch.ingredientTier) parts.push(`inköp ${patch.ingredientTier}`);
  if (patch.welcomeDrink !== undefined)
    parts.push(`välkomstdryck ${patch.welcomeDrink ? 'på' : 'av'}`);
  if (patch.localSourcing !== undefined)
    parts.push(`lokala leverantörer ${patch.localSourcing ? 'på' : 'av'}`);
  return `Policy: ${parts.join(', ')}`;
}

function triggerScenario(state: SimulationState, auto: boolean): SimulationState {
  const scenario = {
    ...state.scenario,
    hasAutoTriggered: state.scenario.hasAutoTriggered || auto,
    active: true,
    awaitingChoice: true,
    choice: null as null,
    choiceAt: null as null,
    spawnedRemaining: 0,
    nextSpawnAt: 0,
    visibleGuestIds: []
  };
  return {
    ...state,
    scenario,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'scenario' as const,
        text: auto ? 'Sällskapet står i entrén' : 'Scenariot replays (utvecklarläge)'
      }
    ]
  };
}

function resolveScenario(
  state: SimulationState,
  choice: SimulationState['scenario']['choice'] extends infer T ? T : never
): SimulationState {
  const scenario = { ...state.scenario };
  scenario.awaitingChoice = false;
  scenario.choice = choice;
  scenario.choiceAt = state.simTime;

  if (choice === 'A') {
    scenario.spawnedRemaining = 8;
    scenario.nextSpawnAt = state.simTime + 0.4;
  } else if (choice === 'B') {
    scenario.spawnedRemaining = 8;
    scenario.nextSpawnAt = state.simTime + 0.4;
  } else if (choice === 'C') {
    scenario.spawnedRemaining = 3; // A few walk to entrance and turn back.
    scenario.nextSpawnAt = state.simTime + 0.3;
  }

  // Immediate policy nudge for choice B (welcome drink flips on for wave).
  let policies = state.policies;
  if (choice === 'B') {
    policies = { ...policies, welcomeDrink: true };
  }

  // For choice C, existing guests get a small dip; reputation dips gently.
  let reputation = state.reputation;
  if (choice === 'C') reputation = Math.max(0, reputation - 0.03);

  return {
    ...state,
    scenario,
    policies,
    reputation,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'scenario' as const,
        text: `Scenario: valde ${choice}`
      }
    ]
  };
}
