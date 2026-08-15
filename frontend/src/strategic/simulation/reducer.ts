import { createRng } from '../util/rng';
import type {
  AxisTracks,
  DayPeriod,
  DayState,
  EnablerKey,
  IngredientTier,
  Policies,
  Register,
  ScenarioChoice,
  SimAction,
  SimulationState,
  StaffRole,
  StoredCapitalKey
} from '../types';
import {
  SERVICE_LENGTH_MAX_MINUTES,
  SERVICE_LENGTH_MIN_MINUTES
} from '../types';
import { strings } from '../../content/strings.sv';
import {
  ALL_PAVILION_IDS,
  type PavilionId
} from '../knowledge/pavilions';
import {
  computeExamCredits,
  selectQuestionsForExam
} from '../knowledge/examMechanic';
import { ALL_TEMPLATE_EXAMPLES, R2_SEED_QUESTIONS } from '../knowledge/questionTemplates';
import type { Question } from '../knowledge/questionFormats';

// ORDER 104 §Q3 — separat slot-mekanik för prov, inte återanvänd
// activity-slot. Aktiviteter är driftdagens val, prov är mellan-varv-
// övning ("gå och öva efter avslag"). Antal per varv default 3
// (matchar M2:s MAX_ACTIVITIES_PER_DAY-pattern); kalibreras när R3 §7
// (antal varv per spel) svaras. Konstant tills dess.
export const MAX_EXAM_SLOTS_PER_ROUND = 3;

// ORDER 104 — frågebanken för R2. Union av ORDER 107:s mall-exempel
// (4) + R2 seed-frågor (2) för de paviljonger mallen inte råkade
// träffa. Vision Owner §5-arbete tillför riktiga frågor senare;
// denna array är källan för `selectQuestionsForExam` när START_EXAM
// dispatchas.
const EXAM_QUESTION_BANK: readonly Question[] = [
  ...ALL_TEMPLATE_EXAMPLES,
  ...R2_SEED_QUESTIONS
];
import { maybeSpawnGuest, scenarioSpawnStep, walkAwayProbability } from './arrivals';
import { planScenariosForService, scheduleScenarioTriggerTimes } from './day';
import { revenuePerGuest } from './economics';
import {
  PREP_CARRYOVER_OFFSET_SEC,
  PREP_CARRYOVER_THRESHOLD,
  PREP_DURATION_SEC,
  tickEventStream
} from './eventStream';
// ORDER 048 §2.1 — carryover text switched to the plain-voice service
// report per the three-voices split. Observer voice moved out of
// during-service into the evening account only.
import { SERVICE_REPORT_PREP_CARRYOVER } from '../../content/serviceReport';
import { generateWeather, waitingAtOpeningCount } from './weather';
import {
  generateWorldFactors,
  worldFactorDeliveryMultiplier,
  worldFactorRevenueMultiplier,
  worldFactorWaitingMultiplier
} from './worldFactors';

// ORDER 045 — the opening image sits over the room for this long
// after OPEN_SERVICE, before prep begins. Ten seconds reads as an
// anticipation moment — long enough to notice the weather and the
// waiting count, short enough not to become its own act.
export const OPENING_DURATION_SEC = 10;
import {
  SENDER_PREFIX,
  pickScenarioSender,
  pickScenarioSpecFiltered,
  scenarioById
} from './scenarios';
import { pickBankQuestion } from '../../content/knowledgeBank';
import type { BankSender } from '../../content/knowledgeBank';
import { fireCollapse, tickCollapseRoll } from './collapse';
import { computeEveningAccount } from './eveningAccount';
import {
  MORALE_AGENCY_ACCEPT_BUMP,
  MORALE_AGENCY_DECLINE_HIT,
  MORALE_DAILY_REGRESSION_TARGET,
  MORALE_SCENARIO_ENGAGE_BUMP,
  MORALE_SCENARIO_REFUSE_HIT,
  bumpMorale,
  tickMoraleDrift
} from './morale';
import { tickQualityDrift } from './quality';
import { ROLLING_WINDOW } from './valuation';
import { initialDay, makeGuest, makeInitialState, makeStaff } from './model';
import {
  decayEnablersOvernight,
  phronesisSofteningGeneral,
  tickReputationCeilingDrift,
  tickReputationDrift
} from './reputation';
import { tickGuests, tickStaff } from './service';
import { tickSustainability } from './sustainability';
import {
  AGENCY_DECLINE_SOCIAL_COST,
  AGENCY_HIRE_COST,
  AGENCY_OFFER_LOAD_THRESHOLD,
  AGENCY_OFFER_SUSTAINED_SEC,
  AGENCY_OFFER_WINDOW_SEC,
  addAgencyMember,
  chargeStructuralCost,
  makeTeamMember,
  removeAgencyMembers,
  teamCapacity
} from './team';
import {
  applyCashCost,
  applyCashDelta,
  applyCashRevenue,
  capitalReadingFor,
  postLedger,
  postServiceSummaryLines
} from './cashReading';
import { drawNextTheme } from './themeSelection';
import {
  MAX_ACTIVITIES_PER_DAY,
  WEEKLY_GATE_DAYS,
  activityById
} from './activities';
import {
  findDish,
  findIngredient,
  findSupplier
} from './m4Catalogue';
import {
  afterCountdownLine,
  computePrepReadinessFromState,
  computeServiceRhythm,
  weakestPrepItem
} from './miseEnPlace';

// Capital tuning constants live in ./constants (no imports, no
// cycle). Re-exported here so callers pulling from the reducer
// barrel keep working. ORDER 050 §5 (2026-08-10) retired the WAGER_*
// constants alongside the theme-wager mechanic.
import {
  CAPITAL_MIN,
  CAPITAL_MAX,
  THEME_HISTORY_LIMIT,
  SCENARIO_CAPITAL_DELTA,
  SCENARIO_CASH_DELTA_SEK
} from './constants';
export {
  CAPITAL_MIN,
  CAPITAL_MAX,
  THEME_HISTORY_LIMIT,
  SCENARIO_CAPITAL_DELTA,
  SCENARIO_CASH_DELTA_SEK
};

// Consequence window per ORDER 042 §3.4: "over 30–45 seconds of
// compressed simulated time, the room changes in a way the player can
// watch". After this many sim-seconds from the RESOLVE_SCENARIO, the
// mentor comment surfaces in the world.
const SCENARIO_SETTLE_AFTER = 35;

// Party size for walk-in-of-five now lives on the scenario spec
// (scenarios.ts WALK_IN_OF_FIVE.choices.*.spawnedRemaining). Kept
// out of the reducer to keep authoring in one file.

// Per-choice signed multiplier on SCENARIO_CAPITAL_DELTA. Chosen so
// that A and B differ only in what they cost — both engage the
// capital, one via the demanding response and one via the generous
// response. C's magnitude is smaller (halved) because the loss is
// already carried by the reputation dip in the walk-in-of-five
// specific handler; letting C also cost a full capital would double-
// count the refusal.
const CHOICE_CAPITAL_SIGN: Record<ScenarioChoice, number> = {
  A: 1,
  B: 1,
  C: -0.5
};

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
    case 'ADVANCE_SCENARIO_TO_SITUATION':
      return advanceToSituation(state);
    case 'RECORD_ENABLER_EVENT':
      return recordEnablerEvent(
        state,
        action.enabler,
        action.register,
        action.amount,
        action.scenarioId
      );
    case 'SET_CAPITAL':
      return setCapital(state, action.capital, action.value);
    case 'SET_CASH':
      return { ...state, cash: action.valueSek };
    case 'ACCUMULATE_KNOWLEDGE': {
      // ORDER 102 — R1 kunskapskapital. amount klämmas ≥ 0 (krediter
      // dras aldrig via R1; förlust hanteras i R7 via ny profil per varv).
      // Inget tak i R1 — frågan hör till R3 kreditekonomi + svårighetskurva.
      // ORDER 105 — spårmärkning. `track` avgör vilken del av axeln som
      // ackumuleras: 'untagged' (spårlöst, default) eller 'sommellerie'/
      // 'kok' (paviljong-specifikt). Reducern håller invarianten att
      // axis-total = tracks.untagged + tracks.sommellerie + tracks.kok
      // så `readProfile` fortsätter läsa top-level axis-fältet oförändrat.
      const amount = Math.max(0, action.amount);
      if (amount === 0) return state;
      const trackKey: keyof AxisTracks = action.track ?? 'untagged';
      const currentAxisTracks = state.knowledgeTracks[action.axis];
      const nextAxisTracks: AxisTracks = {
        ...currentAxisTracks,
        [trackKey]: currentAxisTracks[trackKey] + amount
      };
      const nextAxisTotal =
        nextAxisTracks.untagged + nextAxisTracks.sommellerie + nextAxisTracks.kok;
      return {
        ...state,
        knowledgeCredits: {
          ...state.knowledgeCredits,
          [action.axis]: nextAxisTotal
        },
        knowledgeTracks: {
          ...state.knowledgeTracks,
          [action.axis]: nextAxisTracks
        }
      };
    }
    case 'OPEN_SERVICE':
      return openService(state, action.service, action.lengthMinutes);
    case 'SKIP_LUNCH':
      return skipLunch(state);
    case 'ACCEPT_AGENCY':
      return acceptAgency(state);
    case 'DECLINE_AGENCY':
      return declineAgency(state);
    case 'HIRE_TEAM_MEMBER':
      return hireTeamMember(state, action.role);
    case 'FIRE_TEAM_MEMBER':
      return fireTeamMember(state, action.memberId);
    case 'RESET':
      return makeInitialState(state.seed, state.policies);
    case 'FORCE_COLLAPSE':
      return forceCollapseAction(state);
    case 'ANSWER_QUESTION':
      return answerProfessionalQuestion(state, action.index);
    case 'START_EXAM':
      return startExam(state, action.pavilionId, action.seed);
    case 'ANSWER_EXAM_QUESTION':
      return answerExamQuestion(state, action.questionId, action.correct, action.score);
    case 'COMPLETE_EXAM':
      return completeExam(state);
    case 'PICK_ACTIVITY':
      return pickActivity(state, action.id);
    case 'UNPICK_ACTIVITY':
      return unpickActivity(state, action.id);
    case 'SHORTEN_MENU':
      return shortenMenuAction(state);
    case 'THIN_WINE_LIST':
      return thinWineListAction(state);
    case 'CLOSE_SERVICE':
      return closeServiceAction(state, action.service);
    case 'BUY_STOCK':
      return buyStock(state, action.supplierId, action.ingredientId, action.units);
    case 'COMPOSE_MENU':
      return composeMenu(state, action.dishes);
    default:
      return state;
  }
}

// ORDER 047 §8 — dev-only shortcut. Fires fireCollapse if we're in a
// running service post-prep with no collapse already latched. No-op
// otherwise (during morning/afternoon/evening/opening/prep the
// collapse mechanic doesn't apply, so this action does nothing).
// ORDER 075 (M2) — pick a morning activity. Refuses unless period
// is 'morning' AND under the per-day cap AND the activity is
// available (not repeated within the weekly-availability window).
// Cost posts immediately as a negative 'other' ledger line so the
// player sees the till move at pick time; the CapitalDelta effect
// applies at end-of-day.
function pickActivity(state: SimulationState, id: string): SimulationState {
  if (state.day.period !== 'morning') return state;
  if (state.day.pickedActivityIds.includes(id)) return state;
  if (state.day.pickedActivityIds.length >= MAX_ACTIVITIES_PER_DAY) return state;
  const activity = activityById(id);
  if (!activity) return state;
  // Weekly gate — reject if this activity was picked within the last
  // WEEKLY_GATE_DAYS days.
  if (activity.availability === 'weekly') {
    const cutoff = state.day.dayNumber - WEEKLY_GATE_DAYS;
    if (state.activityHistory.some((h) => h.id === id && h.pickedOnDay > cutoff)) {
      return state;
    }
  }
  const next: SimulationState = {
    ...state,
    day: {
      ...state.day,
      pickedActivityIds: [...state.day.pickedActivityIds, id]
    },
    activityHistory: [
      ...state.activityHistory,
      { id, pickedOnDay: state.day.dayNumber }
    ]
  };
  // Post upfront cost.
  if (activity.costSek > 0) {
    applyCashCost(next, activity.costSek);
    postLedger(next, {
      category: 'other',
      amount: -activity.costSek,
      cause: `Activity cost: ${activity.name}`,
      causeId: id
    });
  }
  return next;
}

// ORDER 075 (M2) — unpick a morning activity. Refunds the upfront
// cost (posts a positive 'other' line balancing the pick-cost line).
// Only allowed during morning (once the day advances past morning
// the pick is committed).
function unpickActivity(state: SimulationState, id: string): SimulationState {
  if (state.day.period !== 'morning') return state;
  if (!state.day.pickedActivityIds.includes(id)) return state;
  const activity = activityById(id);
  if (!activity) return state;
  const next: SimulationState = {
    ...state,
    day: {
      ...state.day,
      pickedActivityIds: state.day.pickedActivityIds.filter((x) => x !== id)
    },
    activityHistory: state.activityHistory.filter(
      (h) => !(h.id === id && h.pickedOnDay === state.day.dayNumber)
    )
  };
  if (activity.costSek > 0) {
    // Refund via cash-delta (not a revenue event); post the balancing
    // ledger line.
    applyCashDelta(next, activity.costSek);
    postLedger(next, {
      category: 'other',
      amount: activity.costSek,
      cause: `Activity refund: ${activity.name}`,
      causeId: id
    });
  }
  return next;
}

// ORDER 075 (M2) — apply each picked activity's end-of-day effect.
// Called at day rollover just after wages so the ledger reads
// "wage lines → activity effect lines → next morning". Capital
// deltas mutate capitals directly (not via enablers — enabler
// routing is M6/M7 scope).
function applyActivityEffectsOnDayClose(draft: SimulationState): void {
  for (const id of draft.day.pickedActivityIds) {
    const activity = activityById(id);
    if (!activity) continue;
    // Economic effect posts as a signed 'other' ledger line.
    if (activity.effect.economic !== 0) {
      applyCashDelta(draft, activity.effect.economic);
      postLedger(draft, {
        category: 'other',
        amount: activity.effect.economic,
        cause: `Activity effect: ${activity.name}`,
        causeId: id
      });
    }
    // Social and ecological effects move capitals directly, clamped.
    const s = draft.capitals.values.social + activity.effect.social;
    const e = draft.capitals.values.ecological + activity.effect.ecological;
    draft.capitals = {
      ...draft.capitals,
      values: {
        social: Math.max(0, Math.min(1, s)),
        ecological: Math.max(0, Math.min(1, e))
      }
    };
  }
}

// ---------- ORDER 077 §4 (M4) — menu + kitchen + stock ------------------

// Recompute the plates-remaining reading from current stock + menu.
// Kept as a pure derivation so tests can call it directly. min-over-
// recipe-ingredients of floor(stock / units).
function computePlatesRemaining(
  menu: SimulationState['menu'],
  stock: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of menu) {
    const dish = findDish(entry.dishId);
    if (!dish) { out[entry.dishId] = 0; continue; }
    let minPlates = Infinity;
    for (const r of dish.recipe) {
      const units = stock[r.ingredientId] ?? 0;
      const plates = Math.floor(units / r.units);
      if (plates < minPlates) minPlates = plates;
    }
    out[entry.dishId] = Number.isFinite(minPlates) ? minPlates : 0;
  }
  return out;
}

function buyStock(
  state: SimulationState,
  supplierId: string,
  ingredientId: string,
  units: number
): SimulationState {
  if (state.day.period !== 'morning') return state;
  if (units <= 0 || !Number.isFinite(units)) return state;
  const supplier = findSupplier(supplierId);
  const ingredient = findIngredient(ingredientId);
  if (!supplier || !ingredient) return state;
  if (!ingredient.suppliers.includes(supplierId)) return state;

  // Short-delivery roll — one unit off (min 0). Deterministic path
  // through state.rngState so a fixed-seed harness sees the same
  // short-delivery pattern each run.
  const rng = createRng(state.rngState);
  const roll = rng.next();
  const received = roll < (1 - supplier.reliability) ? Math.max(0, units - 1) : units;

  const costSek = ingredient.baseCostSek * supplier.priceIndex * units;
  const nextStock = { ...state.stock };
  nextStock[ingredientId] = (nextStock[ingredientId] ?? 0) + received;
  const nextEco = Math.max(0, Math.min(1, state.capitals.values.ecological + supplier.ecoDelta * units));

  const next: SimulationState = {
    ...state,
    rngState: rng.state,
    stock: nextStock,
    capitals: {
      ...state.capitals,
      values: { ...state.capitals.values, ecological: nextEco }
    },
    day: {
      ...state.day,
      platesRemaining: computePlatesRemaining(state.menu, nextStock)
    }
  };
  applyCashCost(next, costSek);
  postLedger(next, {
    category: 'stock',
    amount: -costSek,
    cause: `Buy ${units}× ${ingredient.name} from ${supplier.name}`,
    causeId: `${supplierId}:${ingredientId}`
  });
  if (received < units) {
    next.eventStream = [
      ...next.eventStream,
      {
        at: state.simTime,
        text: `Supplier short-delivery: ${supplier.name} delivered ${received}/${units} ${ingredient.name}.`,
        category: 'ambient',
        causeTag: 'stock_out',
        causeChainId: null,
        sustainability: 'economic',
        kind: 'supplier_short',
        scenarioId: null
      }
    ];
  }
  return next;
}

function composeMenu(
  state: SimulationState,
  dishes: readonly { dishId: string; price: number }[]
): SimulationState {
  if (state.day.period !== 'morning') return state;
  const entries: SimulationState['menu'] = [];
  for (const d of dishes) {
    const dish = findDish(d.dishId);
    if (!dish) continue;
    if (!(d.price > 0 && Number.isFinite(d.price))) continue;
    // Freeze ingredient cost at compose time — use the min-supplier
    // estimate as a proxy; when the player has bought from a specific
    // supplier the estimate is at least a lower bound. Guarantees
    // DoD 1's "every dish has an ingredient cost" > 0.
    const ingredientCostSek = dish.recipe.reduce((sum, r) => {
      const ing = findIngredient(r.ingredientId);
      if (!ing) return sum;
      // Pick cheapest available supplier the player has stock from,
      // else the ingredient's base cost × cheapest-supplier index.
      let unitCost = Infinity;
      for (const supId of ing.suppliers) {
        const sup = findSupplier(supId);
        if (!sup) continue;
        const c = ing.baseCostSek * sup.priceIndex;
        if (c < unitCost) unitCost = c;
      }
      if (!Number.isFinite(unitCost)) unitCost = ing.baseCostSek;
      return sum + unitCost * r.units;
    }, 0);
    entries.push({ dishId: d.dishId, price: d.price, ingredientCostSek });
  }
  return {
    ...state,
    menu: entries,
    day: {
      ...state.day,
      platesRemaining: computePlatesRemaining(entries, state.stock),
      stockOutEvents: []
    }
  };
}

// ORDER 079 §2 (M4a) — attractiveness-weighting constant. K = 2 gives
// ±50 % pricing swings producing ~⅓ / ~3× demand swings. Named so a
// future retune touches one place.
const ATTRACTIVENESS_K = 2;

// ORDER 079 §3 (M4a) — probability a guest whose target dish is out
// substitutes to the cheapest still-available dish, versus walking.
// 30/70 split; harsher than a real restaurant so DoD 2 can force both
// outcomes in a modest-length script.
const SUBSTITUTE_PROBABILITY = 0.30;

// ORDER 079 §4 (M4a) — reputation hits on the two out-of-stock outcomes.
const REP_HIT_SUBSTITUTE = 0.02;
const REP_HIT_WALKOUT    = 0.05;

// Attractiveness weight per menu entry: exp(−(Δprice / suggested) × K).
// Zero-safe if suggestedPrice is 0 (returns 1 = neutral).
function attractivenessWeight(price: number, suggestedPrice: number): number {
  if (!(suggestedPrice > 0)) return 1;
  const delta = (price - suggestedPrice) / suggestedPrice;
  return Math.exp(-delta * ATTRACTIVENESS_K);
}

// Pick a dish from the full menu, weighted by attractiveness. Returns
// the picked MenuEntry (regardless of whether stock is available for
// it — the "wanted" dish; the stock check happens in the caller).
function pickTargetDish(
  menu: SimulationState['menu'],
  rngRoll: number
): SimulationState['menu'][number] | null {
  if (menu.length === 0) return null;
  const weights: number[] = [];
  let total = 0;
  for (const m of menu) {
    const dish = findDish(m.dishId);
    const w = dish ? attractivenessWeight(m.price, dish.suggestedPrice) : 1;
    weights.push(w);
    total += w;
  }
  if (!(total > 0)) return menu[0];
  let x = rngRoll * total;
  for (let i = 0; i < menu.length; i++) {
    x -= weights[i];
    if (x <= 0) return menu[i];
  }
  return menu[menu.length - 1];
}

// The four possible outcomes at the pay tick under M4 + M4a.
export type DrawOutcome =
  | { kind: 'served';    dishId: string; price: number }
  | { kind: 'substituted'; targetDishId: string; servedDishId: string; price: number }
  | { kind: 'walked';    targetDishId: string }
  | { kind: 'no-menu'    };

// Draw one dish for a paying guest under M4 + M4a. Picks a target
// dish via attractiveness weighting over the full menu, then routes
// to serve / substitute / walk based on stock. Mutates draft.stock,
// draft.day.platesRemaining, and fires the stock_out ambient line
// exactly once per dish per service via draft.day.stockOutEvents.
//
// Two independent RNG rolls per call:
//   - `targetRoll` picks which dish the guest wants (attractiveness
//     weighting over the full menu).
//   - `substituteRoll` decides substitute-vs-walk when the target is
//     out of stock. Independent from targetRoll so the 30/70 split
//     converges to its actual probabilities over a sample.
export function drawMenuDishForGuest(
  draft: SimulationState,
  guestId: string,
  simTime: number,
  targetRoll: number,
  substituteRoll: number
): DrawOutcome {
  if (draft.menu.length === 0) return { kind: 'no-menu' };

  // ORDER 079 §2 — weighted target pick over the full menu.
  const target = pickTargetDish(draft.menu, targetRoll);
  if (!target) return { kind: 'no-menu' };
  const targetDish = findDish(target.dishId);
  if (!targetDish) return { kind: 'no-menu' };

  const targetOut = (draft.day.platesRemaining[target.dishId] ?? 0) === 0;

  // Helper: serve the dish, decrement stock, fire stock_out if the
  // draw hits zero. Shared between the target-available and
  // substitute paths.
  const serve = (entry: SimulationState['menu'][number]): void => {
    const dish = findDish(entry.dishId);
    if (!dish) return;
    const nextStock = { ...draft.stock };
    for (const r of dish.recipe) {
      nextStock[r.ingredientId] = (nextStock[r.ingredientId] ?? 0) - r.units;
    }
    draft.stock = nextStock;
    draft.day.platesRemaining = computePlatesRemaining(draft.menu, nextStock);
    // Fire stock_out (M4 DoD 3 mechanic) for any menu dish whose plate
    // count just hit 0 and hasn't fired yet this service.
    for (const m of draft.menu) {
      if ((draft.day.platesRemaining[m.dishId] ?? 0) === 0
        && !draft.day.stockOutEvents.includes(m.dishId)) {
        const runOutDish = findDish(m.dishId);
        if (!runOutDish) continue;
        draft.day.stockOutEvents = [...draft.day.stockOutEvents, m.dishId];
        draft.eventStream = [
          ...draft.eventStream,
          {
            at: simTime,
            text: `Dish '${runOutDish.name}' ran out — the kitchen is out of stock.`,
            category: 'ambient',
            causeTag: 'stock_out',
            causeChainId: null,
            sustainability: 'economic',
            kind: 'dish_ran_out',
            scenarioId: null
          }
        ];
      }
    }
  };

  if (!targetOut) {
    serve(target);
    void guestId;
    return { kind: 'served', dishId: target.dishId, price: target.price };
  }

  // Target is out. Substitute vs walk per §3.
  // Substitute candidates = available dishes (plates > 0) EXCLUDING
  // the target. Pick the cheapest.
  const candidates = draft.menu.filter(
    (m) => m.dishId !== target.dishId
      && (draft.day.platesRemaining[m.dishId] ?? 0) > 0
  );

  // No available substitute → forced walkout.
  if (candidates.length === 0) {
    draft.reputation = Math.max(0, draft.reputation - REP_HIT_WALKOUT);
    draft.day.walkedCount = (draft.day.walkedCount ?? 0) + 1;
    draft.eventStream = [
      ...draft.eventStream,
      {
        at: simTime,
        text: `Guest left — no ${targetDish.name} tonight.`,
        category: 'ambient',
        causeTag: 'stock_out',
        causeChainId: null,
        sustainability: 'social',
        kind: 'guest_walked',
        scenarioId: null
      }
    ];
    return { kind: 'walked', targetDishId: target.dishId };
  }

  // Substitute-vs-walk roll — independent RNG draw supplied by the
  // caller so the 30/70 split converges to its actual probabilities.
  if (substituteRoll < SUBSTITUTE_PROBABILITY) {
    // Substitute to cheapest available.
    const cheapest = candidates.reduce(
      (acc, m) => (m.price < acc.price ? m : acc),
      candidates[0]
    );
    const cheapestDish = findDish(cheapest.dishId);
    if (!cheapestDish) return { kind: 'walked', targetDishId: target.dishId };
    serve(cheapest);
    draft.reputation = Math.max(0, draft.reputation - REP_HIT_SUBSTITUTE);
    draft.day.substitutedCount = (draft.day.substitutedCount ?? 0) + 1;
    draft.eventStream = [
      ...draft.eventStream,
      {
        at: simTime,
        text: `Guest wanted ${targetDish.name}; kitchen substituted ${cheapestDish.name}.`,
        category: 'ambient',
        causeTag: 'stock_out',
        causeChainId: null,
        sustainability: 'social',
        kind: 'guest_substituted',
        scenarioId: null
      }
    ];
    return {
      kind: 'substituted',
      targetDishId: target.dishId,
      servedDishId: cheapest.dishId,
      price: cheapest.price
    };
  }

  // Walk.
  draft.reputation = Math.max(0, draft.reputation - REP_HIT_WALKOUT);
  draft.day.walkedCount = (draft.day.walkedCount ?? 0) + 1;
  draft.eventStream = [
    ...draft.eventStream,
    {
      at: simTime,
      text: `Guest left — no ${targetDish.name} tonight.`,
      category: 'ambient',
      causeTag: 'stock_out',
      causeChainId: null,
      sustainability: 'social',
      kind: 'guest_walked',
      scenarioId: null
    }
  ];
  return { kind: 'walked', targetDishId: target.dishId };
}

// ORDER 104 §Q1 — START_EXAM. Skapar currentExam om (a) inget aktivt
// prov, (b) slot finns kvar, (c) paviljong-id är känd. Provet lever
// tills COMPLETE_EXAM dispatchas — spelaren kan lämna paviljongen
// och komma tillbaka (§Q1: "provet är rummet"). Slot förbrukas när
// provet STARTAS, inte när det slutförs — annars kunde start-avbryt-
// spam ge obegränsad övning.
function startExam(
  state: SimulationState,
  pavilionId: string,
  seed: number
): SimulationState {
  // Guards. Alla returnerar state oförändrat om något villkor bryts —
  // no-op istället för Error, så UI-lager kan dispatcha optimistiskt
  // utan try/catch.
  if (state.currentExam !== null) return state;
  if (state.examSlotsUsed >= MAX_EXAM_SLOTS_PER_ROUND) return state;
  if (!(ALL_PAVILION_IDS as readonly string[]).includes(pavilionId)) return state;

  const questions = selectQuestionsForExam(
    pavilionId as PavilionId,
    EXAM_QUESTION_BANK,
    seed
  );
  // Paviljong utan matchande frågor: coverageErrors ska ha fångat det,
  // men försvara även här — no-op så inget krasch/oanvändbart state.
  if (questions.length === 0) return state;

  return {
    ...state,
    currentExam: {
      pavilionId,
      questionIds: questions.map((q) => q.id),
      answers: [],
      startedAt: state.simTime
    },
    examSlotsUsed: state.examSlotsUsed + 1
  };
}

// ORDER 104 §Q1 — ANSWER_EXAM_QUESTION. Lägger till svar på nästa
// obesvarad fråga i provet. Refuseras om ingen currentExam eller om
// alla frågor redan besvarats. `correct` + `score` är beräknade av
// UI-lagret via scoreQuestion i questionFormats.ts.
function answerExamQuestion(
  state: SimulationState,
  questionId: string,
  correct: boolean,
  score: number
): SimulationState {
  if (state.currentExam === null) return state;
  const nextIndex = state.currentExam.answers.length;
  if (nextIndex >= state.currentExam.questionIds.length) return state;
  // Om questionId inte matchar nästa förväntade fråga (UI-lager
  // trasslat) — no-op så state förblir konsistent.
  if (state.currentExam.questionIds[nextIndex] !== questionId) return state;
  return {
    ...state,
    currentExam: {
      ...state.currentExam,
      answers: [...state.currentExam.answers, { questionId, correct, score }]
    }
  };
}

// ORDER 104 §Q1 + §Q2 — COMPLETE_EXAM. Rensar currentExam och
// dispatchar krediter för varje rätt svar via ACCUMULATE_KNOWLEDGE-
// vägen (samma reducer, återanvänder logiken). Refuseras om ingen
// currentExam eller om det finns obesvarade frågor.
//
// Kreditformeln är enkel per §Q2: 1 kredit per rätt svar på frågans
// axel + spår. Inga trösklar, ingen bonus.
function completeExam(state: SimulationState): SimulationState {
  if (state.currentExam === null) return state;
  if (state.currentExam.answers.length < state.currentExam.questionIds.length) {
    return state;
  }
  const grants = computeExamCredits(state.currentExam.answers, EXAM_QUESTION_BANK);
  // Applicera varje credit sekventiellt via reducern så invariant
  // (knowledgeCredits[axis] = tracks-summan) hålls.
  let next: SimulationState = { ...state, currentExam: null };
  for (const grant of grants) {
    next = reducer(next, {
      type: 'ACCUMULATE_KNOWLEDGE',
      axis: grant.axis,
      amount: grant.amount,
      ...(grant.track !== undefined ? { track: grant.track } : {})
    });
  }
  return next;
}

function forceCollapseAction(state: SimulationState): SimulationState {
  const period = state.day.period;
  if (period !== 'lunch' && period !== 'dinner') return state;
  if (state.day.openingEndsAt !== null) return state;
  if (state.day.prepEndsAt !== null) return state;
  if (state.day.serviceCollapsed) return state;
  // fireCollapse mutates the draft in place; give it a shallow copy
  // of everything it touches so the reducer stays pure at the outer
  // boundary. Same pattern advanceTick uses.
  const draft: SimulationState = {
    ...state,
    day: { ...state.day },
    team: { ...state.team, members: state.team.members.map((m) => ({ ...m })) },
    eventStream: [...state.eventStream],
    events: [...state.events],
    consequenceEvents: [...state.consequenceEvents]
  };
  fireCollapse(draft);
  return draft;
}

// ---------- ORDER 049 §5.3 — scale-down actions ------------------------
//
// All three are morning-only (per Vision Owner) so the player commits
// to the scale-down as a considered morning decision, not a mid-service
// panic. Reversible — dispatching the same action while active un-scales.
// Cost (quality drift down) is applied continuously via targetQuality*
// in quality.ts reading state.scaleDown flags + policies.

const INGREDIENT_STEP_DOWN: Record<IngredientTier, IngredientTier> = {
  premium: 'utvald',
  utvald:  'grund',
  grund:   'grund'   // already at floor — no-op
};

function shortenMenuAction(state: SimulationState): SimulationState {
  if (state.day.period !== 'morning') return state;
  // If already shortened, restore the pre-shorten tier.
  if (state.scaleDown.menuShortenedFrom !== null) {
    return {
      ...state,
      policies: { ...state.policies, ingredientTier: state.scaleDown.menuShortenedFrom },
      scaleDown: { ...state.scaleDown, menuShortenedFrom: null }
    };
  }
  // Not shortened yet — step down and stash the original.
  const from = state.policies.ingredientTier;
  const to = INGREDIENT_STEP_DOWN[from];
  if (to === from) return state; // already at floor
  return {
    ...state,
    policies: { ...state.policies, ingredientTier: to },
    scaleDown: { ...state.scaleDown, menuShortenedFrom: from }
  };
}

function thinWineListAction(state: SimulationState): SimulationState {
  if (state.day.period !== 'morning') return state;
  const currentlyReduced = state.scaleDown.wineListReduced;
  return {
    ...state,
    policies: {
      ...state.policies,
      // Restoring? Turn welcomeDrink back on. Reducing? Turn it off.
      welcomeDrink: currentlyReduced ? true : false
    },
    scaleDown: { ...state.scaleDown, wineListReduced: !currentlyReduced }
  };
}

function closeServiceAction(
  state: SimulationState,
  service: 'lunch' | 'dinner'
): SimulationState {
  if (state.day.period !== 'morning') return state;
  const key = service === 'lunch' ? 'closedLunch' : 'closedDinner';
  return {
    ...state,
    scaleDown: { ...state.scaleDown, [key]: !state.scaleDown[key] }
  };
}

// ---------- ORDER 043 v3 §10 step 1 — day / period transitions ---------------

function clampServiceLength(mins: number): number {
  return Math.max(
    SERVICE_LENGTH_MIN_MINUTES,
    Math.min(SERVICE_LENGTH_MAX_MINUTES, Math.round(mins))
  );
}

function openService(
  state: SimulationState,
  service: 'lunch' | 'dinner',
  lengthMinutes: number
): SimulationState {
  // Guard: lunch can only open from morning, dinner from afternoon.
  // Any other phase → no-op. Prevents the UI from opening dinner
  // during a running lunch service etc.
  const expectedPhase: DayPeriod = service === 'lunch' ? 'morning' : 'afternoon';
  if (state.day.period !== expectedPhase) return state;
  // ORDER 049 §5.3 — refuse OPEN_SERVICE when the corresponding
  // scale-down flag is set. The player must restore the service
  // (dispatch CLOSE_SERVICE again with the same key) before opening.
  if (service === 'lunch'  && state.scaleDown.closedLunch)  return state;
  if (service === 'dinner' && state.scaleDown.closedDinner) return state;
  const length = clampServiceLength(lengthMinutes);
  // Deterministic scenario count + schedule from the current rng
  // state — same seed + same open sequence yields the same rhythm.
  // The schedule is shifted by PREP_DURATION_SEC so no scenario
  // fires during the mise en place window; the head-space buffer
  // in scheduleScenarioTriggerTimes then applies on top.
  const rng = createRng(state.rngState);
  // ORDER 045 — generate the evening's weather first so subsequent
  // calculations (waiting count, scenario schedule) see a stable
  // weather record. World factors roll after weather; both feed
  // waitingAtOpening below.
  const weather = generateWeather(rng);
  const worldFactors = generateWorldFactors(rng);
  const scenariosPlanned = planScenariosForService(length, rng);
  // Opening runs first, then prep, then service. Scenario schedule
  // shifted by opening + prep so no scenario fires while the doors
  // are still closed.
  const doorsOpenAt =
    state.simTime + OPENING_DURATION_SEC + PREP_DURATION_SEC;
  const serviceWindowMinutes = Math.max(
    1,
    length - (OPENING_DURATION_SEC + PREP_DURATION_SEC) / 60
  );
  const scenarioTriggerTimes = scheduleScenarioTriggerTimes(
    scenariosPlanned,
    doorsOpenAt,
    serviceWindowMinutes,
    rng
  );
  // Waiting count stacks reputation × weather (in waitingAtOpeningCount)
  // × world-factor waiting mult (here), capped again at the same 6-guest
  // ceiling.
  const waitingCap = 6;
  const baseWaiting = waitingAtOpeningCount(state.reputation, weather);
  const waitingAtOpening = Math.min(
    waitingCap,
    Math.round(baseWaiting * worldFactorWaitingMultiplier(worldFactors))
  );
  const day: DayState = {
    ...state.day,
    period: service,
    periodStartAt: state.simTime,
    currentServiceLengthMinutes: length,
    scenariosPlanned,
    scenariosFiredThisService: 0,
    scenarioTriggerTimes,
    // Opening panel for OPENING_DURATION_SEC, then prep for
    // PREP_DURATION_SEC. Arrivals + scenarios gated until both close
    // (see advanceTick + arrivalProbability).
    openingEndsAt: state.simTime + OPENING_DURATION_SEC,
    prepEndsAt: state.simTime + OPENING_DURATION_SEC + PREP_DURATION_SEC,
    prepIgnoranceCount: 0,
    // ORDER 043 Addendum B prep floor — two guaranteed prep events
    // per service, at ~35 s and ~85 s past prep-start (~45 s and
    // ~95 s past OPEN_SERVICE, which sits before opening). Kinds
    // rotate across services via a coarse dayNumber+service mod so
    // consecutive services don't spotlight the same axis.
    prepFloorSchedule: buildPrepFloorSchedule(
      state.simTime + OPENING_DURATION_SEC,
      state.day.dayNumber,
      service
    ),
    weather,
    waitingAtOpening,
    doorsOpenedThisService: false,
    worldFactors,
    // ORDER 046 §1 — new service opens with a clean collapse slate.
    serviceCollapsed: false,
    collapseAxis: null,
    // ORDER 046 §3 — snapshot the ledger at service start so the
    // evening account can compute this service's net by subtraction
    // without needing to instrument revenue / cost accumulation.
    revenueAtServiceStart: state.revenue,
    costAtServiceStart: state.cost,
    reputationAtServiceStart: state.reputation,
    // ORDER 050 §7 step 3 (2026-08-10) — fresh accumulators for this
    // service; posted + reset at service-close transition.
    serviceIngredientAccrued: 0,
    idleCostAccrued: 0,
    serviceCovers: 0,
    // ORDER 047 §6 — preserve morningPolicyChanges through the service
    // so the evening account can read them. Cleared on evening→morning
    // transition. Passed through explicitly since {...state.day} would
    // preserve them anyway, but this is the anchor point for the note.
    morningPolicyChanges: state.day.morningPolicyChanges
  };
  // ORDER 047 §5/§4 — reset per-service tallies at service open. The
  // stream-count reading is per-evening; the fired-scenario dedup is
  // per-service. lastServiceOpenerId carries across services (set at
  // first fire in this service, read at the next service's first draw).
  //
  // ORDER 047 §6 — schedule a pendingOutcome per morningPolicyChange
  // to fire ~4 s past doors-open so the stream names the change as it
  // lands. Uses the same pendingOutcome machinery as scenario outcomes.
  const doorsOpenAtAbs = state.simTime + OPENING_DURATION_SEC + PREP_DURATION_SEC;
  const policyOutcomes = state.day.morningPolicyChanges.map((text) => ({
    dueAt: doorsOpenAtAbs + 4,
    text,
    sustainability: 'social' as const,
    scenarioId: 'morning-policy'
  }));
  return {
    ...state,
    day,
    rngState: rng.state,
    streamThemeCounts: { economic: 0, social: 0, ecological: 0 },
    firedScenarioIds: [],
    pendingOutcomes: [...state.pendingOutcomes, ...policyOutcomes]
  };
}

// ORDER 043 Addendum B — two guaranteed prep events per service.
// Slot times are fixed at 35 s and 85 s past prep-start (leaving
// 30 s of "quiet" head and tail so the floor doesn't feel metronomic).
// Kinds are rotated across services by (dayNumber + service parity)
// so consecutive services don't foreground the same axis.
const PREP_FLOOR_OFFSETS_SEC = [35, 85] as const;
const PREP_KINDS: readonly ('prep_kitchen' | 'prep_room' | 'prep_delivery')[] = [
  'prep_kitchen',
  'prep_room',
  'prep_delivery'
];
function buildPrepFloorSchedule(
  prepStartAt: number,
  dayNumber: number,
  service: 'lunch' | 'dinner'
): { dueAt: number; kind: 'prep_kitchen' | 'prep_room' | 'prep_delivery' }[] {
  const parity = service === 'lunch' ? 0 : 1;
  const baseIdx = (dayNumber - 1) * 2 + parity;
  return PREP_FLOOR_OFFSETS_SEC.map((offset, i) => ({
    dueAt: prepStartAt + offset,
    kind: PREP_KINDS[(baseIdx + i) % PREP_KINDS.length]
  }));
}

function skipLunch(state: SimulationState): SimulationState {
  if (state.day.period !== 'morning') return state;
  return {
    ...state,
    day: {
      ...state.day,
      period: 'afternoon',
      periodStartAt: state.simTime,
      currentServiceLengthMinutes: null,
      scenariosPlanned: 0,
      scenariosFiredThisService: 0,
      scenarioTriggerTimes: [],
      openingEndsAt: null,
      prepEndsAt: null,
      prepIgnoranceCount: 0,
      prepFloorSchedule: [],
      weather: null,
      waitingAtOpening: 0,
      doorsOpenedThisService: false,
      worldFactors: [],
      serviceCollapsed: false,
      collapseAxis: null,
      revenueAtServiceStart: null,
      costAtServiceStart: null,
      reputationAtServiceStart: null,
      serviceIngredientAccrued: 0,
      idleCostAccrued: 0,
      serviceCovers: 0
    }
  };
}

// Called from advanceTick — handles the automatic transitions that
// don't require a player action:
//   lunch     → afternoon (after chosen length elapses)
//   dinner    → evening   (after chosen length elapses)
//   evening   → morning of next day (after a short close pause)
// morning + afternoon stay put until the player opens a service or
// skips lunch. This satisfies v3 §2's rule that the player, not the
// clock, decides how long each service runs.
//
// ORDER 046 §3 — bumped 15 → 30 to hold the evening account panel.
// The account fades in at evening start, holds for ~25 s, fades over
// ~5 s; anything shorter would rush the reading.
const EVENING_TO_MORNING_PAUSE_SEC = 30;

// ORDER 050 §7 step 3 (2026-08-10) — post the per-service summary
// lines that aggregate mid-service per-guest revenue and per-tick
// ingredient into single readable book entries. Cash has already
// moved during the service; these lines are book recaps, not
// movers, so we do NOT call any applyCash* helper here — postLedger
// alone appends the row. `prev` is the pre-transition state, read
// for the accumulators (which the transition just reset on the
// next.day object).
// ORDER 050 §7 step 3 (2026-08-10) — self-explanatory scenario
// ledger cause. The row should read as English prose the player
// recognises from the room ("Walk-in of five: seated the party"),
// not as a code identifier ("Scenario: walk-in-of-five (A)"). The
// mapping is per (scenarioId, choice) for cycle-1's three scenarios;
// unmapped combinations fall back to a legible generic form.
const SCENARIO_LEDGER_TITLE: Record<string, string> = {
  'walk-in-of-five': 'Walk-in of five',
  'time-pressure': 'Late delegation booking',
  'moral-dilemma': 'Fish with a broken cold chain'
};

const SCENARIO_LEDGER_CHOICE: Record<string, string> = {
  'walk-in-of-five|A': 'seated the party',
  'walk-in-of-five|B': 'seated four plus a bar seat',
  'walk-in-of-five|C': 'refused at the door',
  'time-pressure|A': 'ran the menu tonight',
  'time-pressure|B': 'deferred to tomorrow',
  'time-pressure|C': 'declined the booking',
  'moral-dilemma|A': 'served the fish',
  'moral-dilemma|B': 'swapped the dish',
  'moral-dilemma|C': 'transformed the plate'
};

function scenarioLedgerCause(
  scenarioId: string | undefined,
  choice: 'A' | 'B' | 'C'
): string {
  const title = scenarioId && SCENARIO_LEDGER_TITLE[scenarioId]
    ? SCENARIO_LEDGER_TITLE[scenarioId]
    : scenarioId
      ? `Scenario: ${scenarioId}`
      : 'Scenario';
  const choiceKey = scenarioId ? `${scenarioId}|${choice}` : '';
  const choiceLabel = SCENARIO_LEDGER_CHOICE[choiceKey] ?? `choice ${choice}`;
  return `${title}: ${choiceLabel}`;
}

// postServiceSummaryLines moved to cashReading.ts under ORDER 074 so
// both the natural-close path (this file's tickDayTransitions) and
// the collapse-close path (collapse.ts:fireCollapse) can share it.
// Previously duplicated logic omission in collapse silently dropped
// revenue + ingredient ledger lines for every collapsed service.

export function tickDayTransitions(state: SimulationState): SimulationState {
  const { day, simTime } = state;
  if (day.period === 'lunch' && day.currentServiceLengthMinutes !== null) {
    const endsAt = day.periodStartAt + day.currentServiceLengthMinutes * 60;
    if (simTime >= endsAt) {
      // Clear agency hires + offer at lunch close, same as dinner.
      const next: SimulationState = {
        ...state,
        team: removeAgencyMembers(state.team),
        agencyOffer: null,
        day: {
          ...day,
          period: 'afternoon',
          periodStartAt: simTime,
          currentServiceLengthMinutes: null,
          scenariosPlanned: 0,
          scenariosFiredThisService: 0,
          scenarioTriggerTimes: [],
          openingEndsAt: null,
          prepEndsAt: null,
          prepIgnoranceCount: 0,
          prepFloorSchedule: [],
          weather: null,
          waitingAtOpening: 0,
          doorsOpenedThisService: false,
          worldFactors: [],
          serviceCollapsed: false,
          collapseAxis: null,
          revenueAtServiceStart: null,
          costAtServiceStart: null,
          reputationAtServiceStart: null,
          serviceIngredientAccrued: 0,
          idleCostAccrued: 0,
          serviceCovers: 0
        }
      };
      // ORDER 050 §7 step 3 (2026-08-10) — post per-service summary
      // lines. Revenue in raw SEK (serviceRevenueToday is in kSEK
      // for the panel; multiply back). Both cash-recap lines, not
      // cash movers (the till already moved per-guest / per-tick).
      postServiceSummaryLines(next, 'lunch', state);
      return next;
    }
  }
  if (day.period === 'dinner' && day.currentServiceLengthMinutes !== null) {
    const endsAt = day.periodStartAt + day.currentServiceLengthMinutes * 60;
    if (simTime >= endsAt) {
      // ORDER 046 §3 — snapshot the evening account BEFORE the day
      // fields are cleared. The account reads day.revenueAtServiceStart
      // and friends; if we cleared them first, every account would
      // fall to the mediocre-by-default branch.
      const eveningAccount = computeEveningAccount(state);
      // ORDER 043 v3 §10 step 5 — clear any agency hires + any
      // standing agency offer at service close. Agency members are
      // scoped to the single service; the offer is stale after
      // close and would surface next service if not cleared.
      const next: SimulationState = {
        ...state,
        team: removeAgencyMembers(state.team),
        agencyOffer: null,
        eveningAccount,
        day: {
          ...day,
          period: 'evening',
          periodStartAt: simTime,
          currentServiceLengthMinutes: null,
          scenariosPlanned: 0,
          scenariosFiredThisService: 0,
          scenarioTriggerTimes: [],
          openingEndsAt: null,
          prepEndsAt: null,
          prepIgnoranceCount: 0,
          prepFloorSchedule: [],
          weather: null,
          waitingAtOpening: 0,
          doorsOpenedThisService: false,
          worldFactors: [],
          serviceCollapsed: false,
          collapseAxis: null,
          revenueAtServiceStart: null,
          costAtServiceStart: null,
          reputationAtServiceStart: null,
          serviceIngredientAccrued: 0,
          idleCostAccrued: 0,
          serviceCovers: 0
        }
      };
      postServiceSummaryLines(next, 'dinner', state);
      return next;
    }
  }
  if (day.period === 'evening') {
    if (simTime - day.periodStartAt >= EVENING_TO_MORNING_PAUSE_SEC) {
      // Day advance — charge structural cost for the closing day
      // (every non-agency member pays their dailyCost) and roll to
      // the next morning. §10 "structural cost locked over multiple
      // days" is honoured by the per-day charge continuing for the
      // contract duration.
      // ORDER 047 §2 — half-regression toward the baseline morale.
      // A run of good evenings stays high; a bad run doesn't spiral
      // permanently. Formula: morale = baseline + (morale - baseline)
      // × 0.5. From 1.0 → 0.875; from 0.0 → 0.375; from 0.75 stays.
      const regressed =
        MORALE_DAILY_REGRESSION_TARGET +
        (state.morale - MORALE_DAILY_REGRESSION_TARGET) * 0.5;
      // ORDER 049 §5.2 — flush the day's lunch/dinner buckets into
      // the rolling arrays and reset today. Kept at ROLLING_WINDOW
      // entries so the valuation.monthlyNetRunRate reads a stable
      // 14-day (approx) window regardless of session length.
      const nextRollingLunch = [
        ...state.serviceRevenueRolling.lunch,
        state.serviceRevenueToday.lunch
      ].slice(-ROLLING_WINDOW);
      const nextRollingDinner = [
        ...state.serviceRevenueRolling.dinner,
        state.serviceRevenueToday.dinner
      ].slice(-ROLLING_WINDOW);
      // ORDER 050 §3 (2026-08-10) — daily wages paired with the till.
      // Preexisting gap: `chargeStructuralCost` only updated
      // `team.paidStructuralCost`, leaving state.cash/state.cost
      // ignorant of the wage bill. Fixed here as part of the cash
      // refactor: sum non-agency dailyCost and post via applyCashCost.
      // §7 step 3 — one ledger line per non-agency member per day so
      // the book names who was paid.
      const nonAgencyMembers = state.team.members.filter((m) => !m.isAgency);
      const wageTotal = nonAgencyMembers.reduce((s, m) => s + m.dailyCost, 0);
      const nextForDay: SimulationState = {
        ...state,
        team: chargeStructuralCost(state.team),
        // ORDER 046 §3 — evening account is scoped to a single evening;
        // clear when the new day begins so the panel doesn't linger
        // into morning where the investment panel needs the room.
        eveningAccount: null,
        morale: regressed,
        // Per-service tallies reset with the day.
        streamThemeCounts: { economic: 0, social: 0, ecological: 0 },
        firedScenarioIds: [],
        // ORDER 049 §5.2 — rolling revenue flush.
        serviceRevenueToday: { lunch: 0, dinner: 0 },
        serviceRevenueRolling: { lunch: nextRollingLunch, dinner: nextRollingDinner },
        // ORDER 049 §2.1 knowledge decay — every enabler tally drops
        // a fixed % per night. Rhythm not reaction: the player must
        // refill via questions to hold the ceiling.
        enablers: decayEnablersOvernight(state.enablers),
        // ORDER 077 §4 (M4) — menu clears at day rollover (fresh
        // morning compose). Stock persists across days per ORDER 051
        // §4 (leftover-stock persistence); ageing deferred to M4b.
        menu: [],
        day: {
          ...initialDay(),
          dayNumber: day.dayNumber + 1,
          periodStartAt: simTime
        }
      };
      if (wageTotal > 0) {
        applyCashCost(nextForDay, wageTotal);
        // §7 step 3 — one line per member per day so the book names
        // who was paid, not just the aggregate.
        for (const m of nonAgencyMembers) {
          if (m.dailyCost <= 0) continue;
          postLedger(nextForDay, {
            category: 'wage',
            amount: -m.dailyCost,
            cause: `Wage: ${m.role}`,
            causeId: m.id
          });
        }
      }
      // ORDER 073 (M3) — post the day's accumulated idle-period cost
      // (staff cost during morning / opening / prep / afternoon /
      // evening) as one 'other' line. Bookkeeping is idle-period cost
      // is the same crew getting paid; only the service-period portion
      // is in the 'ingredient' line. Without this the ledger under-
      // counts by ~100-200 SEK/day and DoD 3 reconciliation fails.
      const idleAccrued = state.day.idleCostAccrued ?? 0;
      if (idleAccrued > 0.5) {
        postLedger(nextForDay, {
          category: 'other',
          amount: -idleAccrued,
          cause: `Idle-period staff cost (day ${state.day.dayNumber})`
        });
      }
      // ORDER 075 (M2) — apply picked-activity end-of-day effects.
      // Uses state.day.pickedActivityIds (pre-rollover) since
      // initialDay() reset them on nextForDay. Effects post to
      // ledger + move capitals.
      const preRolloverDay = state.day;
      // Mutate nextForDay in place — same pattern as postLedger.
      nextForDay.day = { ...nextForDay.day, pickedActivityIds: preRolloverDay.pickedActivityIds };
      applyActivityEffectsOnDayClose(nextForDay);
      // Clear again after effect application so the new day starts
      // clean.
      nextForDay.day = { ...nextForDay.day, pickedActivityIds: [] };
      return nextForDay;
    }
  }
  return state;
}

function setCapital(
  state: SimulationState,
  capital: StoredCapitalKey,
  value: number
): SimulationState {
  const clamped = Math.max(0, Math.min(1, value));
  return {
    ...state,
    capitals: {
      ...state.capitals,
      values: { ...state.capitals.values, [capital]: clamped }
    }
  };
}

// ---------- ORDER 043 v3 §10 step 5 — agency-offer machinery ------------

function activeGuestCount(state: SimulationState): number {
  return state.guests.filter(
    (g) =>
      g.state === 'arriving' ||
      g.state === 'waiting' ||
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
  ).length;
}

// Runs inside advanceTick. Mutates draft in place — sets/clears the
// strain tracker, fires an offer, or expires an unanswered offer
// into an implicit decline.
function tickAgencyStrain(draft: SimulationState): void {
  const period = draft.day.period;

  // Outside a service, reset the tracker and drop any orphaned offer.
  if (period !== 'lunch' && period !== 'dinner') {
    if (draft.team.strainSinceSimTime !== null) {
      draft.team = { ...draft.team, strainSinceSimTime: null };
    }
    return;
  }

  const now = draft.simTime;
  const load = activeGuestCount(draft) / teamCapacity(draft.team);
  const tracker = draft.team.strainSinceSimTime;

  // Expire an unanswered offer into an implicit decline. The social
  // cost applies either way — the team read the silence.
  if (draft.agencyOffer && now >= draft.agencyOffer.expiresAt) {
    draft.capitals = {
      ...draft.capitals,
      values: {
        ...draft.capitals.values,
        social: Math.max(0, draft.capitals.values.social - AGENCY_DECLINE_SOCIAL_COST)
      }
    };
    draft.agencyOffer = null;
  }

  if (load >= AGENCY_OFFER_LOAD_THRESHOLD) {
    if (tracker === null) {
      draft.team = { ...draft.team, strainSinceSimTime: now };
    } else if (
      now - tracker >= AGENCY_OFFER_SUSTAINED_SEC &&
      draft.agencyOffer === null
    ) {
      // Fire the offer. Role is the axis the strain has been loudest
      // on — cycle 1 keeps it simple and offers a lärling-shaped
      // hire (generic hand). A future order could pick the role that
      // best relieves the current bottleneck.
      draft.agencyOffer = {
        role: 'lärling',
        moneyCost: AGENCY_HIRE_COST,
        socialCostIfDeclined: AGENCY_DECLINE_SOCIAL_COST,
        offeredAt: now,
        expiresAt: now + AGENCY_OFFER_WINDOW_SEC
      };
      draft.team = { ...draft.team, strainSinceSimTime: null };
    }
  } else if (tracker !== null) {
    // Load dropped below threshold — reset the tracker so a fresh
    // sustained window is required before the next offer.
    draft.team = { ...draft.team, strainSinceSimTime: null };
  }
}

function acceptAgency(state: SimulationState): SimulationState {
  if (state.agencyOffer === null) return state;
  const team = addAgencyMember(state.team, state.day.dayNumber);
  // ORDER 047 §2 — accepting help lifts morale; the team registers
  // that management moves when they're drowning.
  // ORDER 050 §3 (2026-08-10) — single money line, paired write via
  // applyCashCost so revenue/cost/cash stay in sync. The previous
  // double-hit (state.cost += 800 AND capitals.values.economic -= 0.04)
  // collapsed here into one honest number.
  const next: SimulationState = {
    ...state,
    team,
    agencyOffer: null,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text: 'Hyrpersonal inkallad — laget växer för kvällen.'
      }
    ]
  };
  applyCashCost(next, AGENCY_HIRE_COST);
  postLedger(next, {
    category: 'agency',
    amount: -AGENCY_HIRE_COST,
    cause: `Agency: ${state.agencyOffer.role} for tonight`,
    causeId: state.agencyOffer.role
  });
  bumpMorale(next, MORALE_AGENCY_ACCEPT_BUMP);
  return next;
}

function declineAgency(state: SimulationState): SimulationState {
  if (state.agencyOffer === null) return state;
  // ORDER 047 §2 — declining help drops morale, mirroring the
  // existing social-capital cost.
  const next: SimulationState = {
    ...state,
    agencyOffer: null,
    capitals: {
      ...state.capitals,
      values: {
        ...state.capitals.values,
        social: Math.max(0, state.capitals.values.social - AGENCY_DECLINE_SOCIAL_COST)
      }
    },
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text: 'Avstod hyrpersonal — laget märker att det inte kom hjälp.'
      }
    ]
  };
  bumpMorale(next, -MORALE_AGENCY_DECLINE_HIT);
  return next;
}

// ---------- ORDER 043 v3 §10 step 5 — morning hire / fire ---------------
//
// §11 point 1's acceptance criterion — "the team decision mattered,
// and its cost was felt during service" — requires a hiring surface.
// This is it. Only fires during the morning phase; hires start with
// their role's default competence and a fresh 7-day contract. Firing
// pays out remaining contract days as a lump-sum buyout so a spam
// hire-then-fire chain isn't free.
//
// No hard team-size cap; economic capital + ongoing dailyCost are
// the natural bounds. A 6-role team is expensive; a lärling-only
// team is cheap but reads badly in the stream (kock competence
// collapses).

const TEAM_MAX_MEMBERS = 6; // guard against absurd hiring

function hireTeamMember(state: SimulationState, role: StaffRole): SimulationState {
  if (state.day.period !== 'morning') return state;
  if (state.team.members.length >= TEAM_MAX_MEMBERS) return state;
  const member = makeTeamMember(role, state.day.dayNumber);
  return {
    ...state,
    team: {
      ...state.team,
      members: [...state.team.members, member]
    },
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text: `Anställde ${role} — kontrakt till dag ${member.contractEndsDay}.`
      }
    ]
  };
}

function fireTeamMember(state: SimulationState, memberId: string): SimulationState {
  if (state.day.period !== 'morning') return state;
  const member = state.team.members.find((m) => m.id === memberId);
  if (!member) return state;
  // Buyout = remaining contract days × dailyCost. Fired the day
  // after the contract ends → buyout 0. Fired mid-contract → the
  // days you promised to pay for are paid up-front.
  const remainingDays = Math.max(0, member.contractEndsDay - state.day.dayNumber);
  const buyout = remainingDays * member.dailyCost;
  const next: SimulationState = {
    ...state,
    team: {
      ...state.team,
      members: state.team.members.filter((m) => m.id !== memberId),
      paidStructuralCost: state.team.paidStructuralCost + buyout
    },
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'system',
        text:
          buyout > 0
            ? `Sa upp ${member.role} — buyout ${buyout} kr (${remainingDays} dagar kvar av kontraktet).`
            : `Sa upp ${member.role} — kontraktet var slut.`
      }
    ]
  };
  // ORDER 050 §3 (2026-08-10) — paired cash write via applyCashCost.
  // §7 step 3 — one ledger line per buyout so the book shows what
  // was paid to whom for how many days remaining.
  if (buyout > 0) {
    applyCashCost(next, buyout);
    postLedger(next, {
      category: 'buyout',
      amount: -buyout,
      cause: `Buyout: ${member.role} (${remainingDays} days remaining)`,
      causeId: member.id
    });
  }
  return next;
}

// ---------- ORDER 043 enabler transitions ---------------------------------
// (placeWager / clearWager retired under ORDER 050 §5, 2026-08-10.)

function recordEnablerEvent(
  state: SimulationState,
  enabler: EnablerKey,
  register: Register,
  amount: number,
  scenarioId: string | null
): SimulationState {
  // Amount clamped to a positive envelope so a scenario cannot silently
  // burn an enabler downward — §3.3 says enabler competence grows from
  // how the player plays; regression via the reducer is out of shape.
  const clean = Math.max(0, Math.min(1, amount));
  if (clean === 0) return state;
  const previous = state.enablers[enabler];
  const updated = {
    ...previous,
    // Derived tally kept in step with the history append (§8: growth
    // never shown as a score; the tally exists only so reads are cheap).
    [register]: previous[register] + clean,
    history: [
      ...previous.history,
      { at: state.simTime, register, amount: clean, scenarioId }
    ]
  };
  return {
    ...state,
    enablers: { ...state.enablers, [enabler]: updated }
  };
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
    eventStream: [...state.eventStream],
    pendingOutcomes: [...state.pendingOutcomes],
    team: { ...state.team, members: state.team.members.map((m) => ({ ...m })) },
    agencyOffer: state.agencyOffer ? { ...state.agencyOffer } : null,
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
      // ORDER 043 §6 ecological phenomenon: cooldown between deliveries
      // stretches when ecological capital is low. Formula chosen so
      // ecological ≈ 0.55 (initial) reproduces the pre-ORDER-043 60-sec
      // baseline, ecological = 1 halves it to ~36 sec, ecological = 0
      // extends to ~84 sec. The van's absence between arrivals IS the
      // reading; the rhythm of appearance is what the player watches.
      // ORDER 043 §6 ecological cadence + ORDER 045 world factor —
      // vägarbeten multiplies the cooldown base by 1.4× (the
      // supplier's route is disrupted).
      const ecological = draft.capitals.values.ecological;
      const cooldownBase =
        60 *
        (1.4 - 0.8 * ecological) *
        worldFactorDeliveryMultiplier(draft.day.worldFactors);
      draft.delivery.cooldown = cooldownBase + rng.range(0, 30);
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

  // ORDER 078 (M5) — service rhythm reading, refreshed each tick
  // during lunch/dinner. Read by the staff-puck colour ring in
  // the room (not a numeric panel). Null outside service so the
  // ring only appears when the room is actually serving.
  if (draft.day.period === 'lunch' || draft.day.period === 'dinner') {
    draft.day = {
      ...draft.day,
      serviceRhythm: computeServiceRhythm(draft.staff.map((s) => s.workload ?? 0))
    };
  } else if (draft.day.serviceRhythm !== null) {
    draft.day = { ...draft.day, serviceRhythm: null };
  }

  // Payment triggers revenue. ORDER 045 world-factor revenue mult
  // (betalningsvilja): konjunktur uppgång/nedgång shifts +10 / −15 %,
  // festival crowd +5 %, hockey crowd −10 % (casual + price-sensitive).
  //
  // ORDER 049 §5.2 — also accumulate the payment into the day's
  // service-type bucket (lunch or dinner) so the rolling arrays can
  // report the split for the panel + goodwill run-rate. Same event,
  // no extra tick cost.
  const revenueMult = worldFactorRevenueMultiplier(draft.day.worldFactors);
  const inLunch = draft.day.period === 'lunch';
  const inDinner = draft.day.period === 'dinner';
  for (const guest of draft.guests) {
    if (guest.state === 'paying' && guest.stateTime === draft.simTime) {
      // ORDER 077 §4 (M4) — if a menu is composed, the guest orders
      // from it and pays the dish price (drawing recipe from stock).
      // If every menu dish is out or menu is empty, fall back to the
      // legacy policies-based revenue path so pre-M4 tests still hold.
      let rev: number;
      if (draft.menu.length > 0) {
        const rng = createRng(draft.rngState);
        const targetRoll = rng.next();
        const substituteRoll = rng.next();
        draft.rngState = rng.state;
        const draw = drawMenuDishForGuest(draft, guest.id, draft.simTime, targetRoll, substituteRoll);
        // ORDER 079 §3 (M4a) — four outcomes: served / substituted /
        // walked / no-menu. Served + substituted pay a price; walked
        // + no-menu produce no revenue (and drawMenuDishForGuest
        // already fired the ambient line + rep hit).
        if (draw.kind === 'served' || draw.kind === 'substituted') {
          rev = draw.price * revenueMult;
        } else {
          continue;
        }
      } else {
        rev = revenuePerGuest(draft.policies) * revenueMult;
      }
      // ORDER 050 §3 (2026-08-10) — paired write: revenue accumulator
      // + cash till stay in sync via applyCashRevenue. serviceRevenue
      // panel arrays continue to receive the kSEK share.
      applyCashRevenue(draft, rev);
      const revKsek = rev / 1000;
      if (inLunch) draft.serviceRevenueToday.lunch += revKsek;
      else if (inDinner) draft.serviceRevenueToday.dinner += revKsek;
      // ORDER 050 §7 step 3 (2026-08-10) — cover count for the
      // per-service ledger summary. One increment per completed
      // payment during a service; enriches the revenue line's cause.
      if (inLunch || inDinner) draft.day.serviceCovers += 1;
      // ORDER 073 (M3) — post-service straggler payments. A guest
      // whose 'paying' transition lands on the very tick that
      // period flipped to evening still has applyCashRevenue fire,
      // but serviceRevenueToday no longer accumulates for them
      // (inLunch / inDinner false). Without this ledger line the
      // aggregate 'revenue' line at the next service close would
      // undercount the straggler's contribution, breaking DoD 3
      // reconciliation. Posts one 'other' line per straggler.
      if (!inLunch && !inDinner) {
        postLedger(draft, {
          category: 'other',
          amount: rev,
          cause: `Late guest payment (${draft.day.period})`,
          causeId: guest.id
        });
      }
    }
  }
  // Accumulate cost — paired write to till.
  const tickCost = (costPerMinuteToTick(draft) * tickSeconds) / 60;
  applyCashCost(draft, tickCost);
  // ORDER 050 §7 step 3 (2026-08-10) — per-service ingredient
  // accumulator; posted as one 'ingredient' ledger line at
  // service close (lunch→afternoon or dinner→evening). ORDER 073
  // (M3): cost outside service is also accumulated, posted as a
  // single 'other' line at day rollover, so state.cost is fully
  // ledger-attributable (was drifting per-day previously; test
  // caught it).
  if (draft.day.period === 'lunch' || draft.day.period === 'dinner') {
    draft.day.serviceIngredientAccrued += tickCost;
  } else {
    draft.day.idleCostAccrued = (draft.day.idleCostAccrued ?? 0) + tickCost;
  }

  // ORDER 049 §5.2 — daily loan interest. Accrues once per calendar
  // day (guarded by lastAccrualDay so the same tick can't charge it
  // twice). ORDER 050 §3 (2026-08-10) — paired write to till.
  // §7 step 3 — one ledger line per accrual day.
  if (draft.loan.principal > 0 && draft.day.dayNumber > draft.loan.lastAccrualDay) {
    const daysToCharge = draft.day.dayNumber - draft.loan.lastAccrualDay;
    // principal is in kSEK-scale; convert to raw kr for the cost
    // ledger which sits in kr.
    const interestKr =
      draft.loan.principal * draft.loan.interestRatePerDay * daysToCharge * 1000;
    applyCashCost(draft, interestKr);
    postLedger(draft, {
      category: 'interest',
      amount: -interestKr,
      cause:
        daysToCharge === 1
          ? `Loan interest (day ${draft.day.dayNumber})`
          : `Loan interest (days ${draft.loan.lastAccrualDay + 1}–${draft.day.dayNumber})`
    });
    draft.loan = { ...draft.loan, lastAccrualDay: draft.day.dayNumber };
  }

  // ORDER 049 §5.2 — quality drift. Runs every tick in every period;
  // half-life ~15 sim-min so a bad service dents but doesn't sink,
  // and a good week visibly climbs.
  tickQualityDrift(draft);

  // Sustainability.
  tickSustainability(draft);

  // ORDER 043 v3 §4 reputation loop — continuous per-tick pressure
  // from queue length + team strain. Runs after tickGuests so the
  // waiting queue reflects this tick's arrivals + departures, not the
  // previous tick's state.
  tickReputationDrift(draft);

  // ORDER 049 §2.1 knowledge-ceiling drift — recomputes reputation
  // ceiling from episteme enablers and pulls the live reading toward
  // it. Runs every period so morning study visibly lifts the ceiling
  // before the doors open.
  tickReputationCeilingDrift(draft);

  // ORDER 043 Addendum A service event stream — ambient rolls +
  // pending-outcome emission. Also runs after tickGuests so `loadOf`
  // reads the current active-guest count for the strain multiplier,
  // and after reputation drift so a large queue that just triggered
  // rep drift also feeds this tick's ambient probability.
  tickEventStream(draft, rng);

  // ORDER 045 opening-window end. When the 10-s opening panel expires
  // the day rolls into prep — no visible state change other than the
  // opening panel closing; arrivals + scenarios are still gated by
  // prepEndsAt (see arrivalProbability + the scheduled-scenario
  // check below).
  if (
    draft.day.openingEndsAt !== null &&
    draft.simTime >= draft.day.openingEndsAt
  ) {
    draft.day = { ...draft.day, openingEndsAt: null };
  }

  // ORDER 043 Addendum A prep-window end. Runs after tickEventStream
  // so this tick's prep events are already counted. If prep just
  // ended AND the team fumbled enough during it, schedule a
  // carryover bottleneck ~13 min into service — the mise en place
  // sin coming home to roost.
  //
  // ORDER 045 — doors open at prep-end. The guests who were waiting
  // outside during the opening + prep window spawn now, as arrivals.
  // They start at their arrival slots (the "waiting outside"
  // vocabulary) and the room's normal state machine takes them from
  // there.
  if (
    draft.day.prepEndsAt !== null &&
    draft.simTime >= draft.day.prepEndsAt
  ) {
    if (draft.day.prepIgnoranceCount >= PREP_CARRYOVER_THRESHOLD) {
      draft.pendingOutcomes = [
        ...draft.pendingOutcomes,
        {
          dueAt: draft.simTime + PREP_CARRYOVER_OFFSET_SEC,
          text: SERVICE_REPORT_PREP_CARRYOVER,
          sustainability: 'social',
          scenarioId: 'prep-carryover',
          flavor: 'prep-carryover'
        }
      ];
    }
    // Doors-open guest spawn — fires exactly once per service via
    // the doorsOpenedThisService flag.
    if (!draft.day.doorsOpenedThisService && draft.day.waitingAtOpening > 0) {
      const walkAwayCeil = walkAwayProbability(draft);
      for (let i = 0; i < draft.day.waitingAtOpening; i++) {
        const walkAway = rng.chance(walkAwayCeil);
        draft.guests.push(makeGuest(draft.simTime, false, walkAway));
      }
    }
    // ORDER 078 (M5) — mise en place readiness fixed at doors-open,
    // plus the after-countdown line. Fires exactly once per service
    // via the same doorsOpenedThisService flag; §2 + §4 of the
    // report gate.
    const firstDoorOpen = !draft.day.doorsOpenedThisService;
    if (firstDoorOpen) {
      const readiness = computePrepReadinessFromState(draft);
      const weakest = weakestPrepItem(readiness);
      const line = afterCountdownLine(readiness);
      draft.day = { ...draft.day, prepReadiness: readiness };
      // causeTag priority: if the prep was thin, tag 'short_prep'
      // (the door-open line names why); otherwise tag 'doors_open'
      // (the line names the transition itself). Both count as
      // specific under M6 DoD 2.
      const doorTag = weakest && weakest.readiness < 0.4 ? 'short_prep' : 'doors_open';
      draft.eventStream = [
        ...draft.eventStream,
        {
          at: draft.simTime,
          text: line,
          category: 'ambient',
          causeTag: doorTag,
          causeChainId: null,
          sustainability: 'social',
          kind: 'doors_open',
          scenarioId: null
        }
      ];
    }
    draft.day = {
      ...draft.day,
      prepEndsAt: null,
      doorsOpenedThisService: true
    };
  }

  // ORDER 043 v3 §10 step 5 — agency-offer strain tracking and
  // offer expiry. Runs after tickEventStream so this tick's load
  // reflects the current active guests. The offer itself is UI-
  // driven (ACCEPT_AGENCY / DECLINE_AGENCY); this tick fires the
  // offer and expires it into an implicit decline.
  tickAgencyStrain(draft);

  // ORDER 046 §1 — collapse roll. Runs after agency strain (so the
  // same tick that fires an offer can also fire the collapse; the
  // team asking for help mid-strain is not immune from the roll).
  // Guarded internally to post-opening + post-prep service and to
  // once-per-service; on fire, force-transitions period to evening.
  // Uses a tick-derived RNG so downstream random draws aren't shifted.
  tickCollapseRoll(draft);

  // ORDER 047 §2 — morale drift toward mean-satisfaction-derived
  // target. Guarded internally to post-opening + post-prep service
  // with active seated guests; a dead room applies no drift so an
  // empty evening doesn't reset morale to a neutral middle.
  tickMoraleDrift(draft);

  // ORDER 043 v3 step 5b — scheduled scenario firing.
  //
  // Fires when: service is running (lunch / dinner), there are still
  // fires remaining in the schedule, the head fire time is due, and
  // the previous scenario has settled (or none has ever fired). The
  // last gate means resolve → settle → next-trigger is serialised;
  // scenarios never overlap the response window.
  //
  // hasAutoTriggered is retained for backward compat with tests but
  // no longer gates: the schedule is the authority now.
  const scheduled = draft.day.scenarioTriggerTimes;
  const period = draft.day.period;
  const canFire = period === 'lunch' || period === 'dinner';
  const scenarioIdle =
    draft.scenario.phase === 'idle' || draft.scenario.phase === 'settled';
  if (
    canFire &&
    scenarioIdle &&
    scheduled.length > 0 &&
    draft.simTime >= scheduled[0]
  ) {
    const nextDraft = triggerScenario(draft, /* auto */ true);
    nextDraft.day = {
      ...nextDraft.day,
      scenarioTriggerTimes: scheduled.slice(1),
      scenariosFiredThisService: draft.day.scenariosFiredThisService + 1
    };
    return nextDraft;
  }

  // Transition scenario from 'resolving' → 'settled' after the
  // consequence window; surface the mentor comment as an event and on
  // the scenario record so MentorComment can render it in-world.
  if (
    draft.scenario.phase === 'resolving' &&
    draft.scenario.choiceAt !== null &&
    draft.simTime - draft.scenario.choiceAt >= SCENARIO_SETTLE_AFTER
  ) {
    const comment = mentorCommentFor(
      draft.scenario.scenarioId,
      draft.scenario.choice
    );
    draft.scenario = {
      ...draft.scenario,
      phase: 'settled',
      mentorComment: comment,
      mentorCommentAt: draft.simTime
    };
    draft.events = [
      ...draft.events,
      { at: draft.simTime, kind: 'scenario', text: `Mentor: ${comment}` }
    ];
  }

  draft.rngState = rng.state;
  // ORDER 043 v3 step 1 — auto-transition day periods based on
  // elapsed sim-time in a running service. Runs last so scenario /
  // sustainability side-effects for the tick have already landed.
  return tickDayTransitions(draft);
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

// ORDER 072 → M1 defence — validate patch enum fields before merging.
// Test harnesses can (and did — the M1 verification test hit this in
// its first run) accidentally pass a legal-looking-but-unrecognised
// value like `pricing: 'mellan'` instead of `'medel'`, and the whole
// cost / revenue chain silently NaN-poisons via
// `REVENUE_BASE[undefined] × INGREDIENT_MULT[…] = NaN`. Guard here
// so invalid patches throw at dispatch time.
const VALID_PRICING: readonly string[] = ['låg', 'medel', 'hög'];
const VALID_INGREDIENT: readonly string[] = ['grund', 'utvald', 'premium'];
const VALID_TRAINING: readonly number[] = [1, 2, 3];

function applyPolicyPatch(state: SimulationState, patch: Partial<Policies>): SimulationState {
  if (patch.pricing !== undefined && !VALID_PRICING.includes(patch.pricing)) {
    throw new Error(`SET_POLICY invalid pricing="${patch.pricing}"; expected one of ${VALID_PRICING.join(' | ')}`);
  }
  if (patch.ingredientTier !== undefined && !VALID_INGREDIENT.includes(patch.ingredientTier)) {
    throw new Error(`SET_POLICY invalid ingredientTier="${patch.ingredientTier}"; expected one of ${VALID_INGREDIENT.join(' | ')}`);
  }
  if (patch.trainingLevel !== undefined && !VALID_TRAINING.includes(patch.trainingLevel)) {
    throw new Error(`SET_POLICY invalid trainingLevel="${patch.trainingLevel}"; expected one of ${VALID_TRAINING.join(' | ')}`);
  }
  const policies = { ...state.policies, ...patch };
  const needsStaffRebuild = patch.staffCount && patch.staffCount !== state.policies.staffCount;
  const nextStaff = needsStaffRebuild ? makeStaff(policies.staffCount) : state.staff;
  const event = {
    at: state.simTime,
    kind: 'policy' as const,
    text: describePolicyPatch(patch)
  };
  // ORDER 047 §6 — if the change lands during morning, remember it
  // as an observer-voice sentence so tonight's stream can name it and
  // the evening account can reference it. Actual policy changes only;
  // no-op patches (setting the same value) are filtered.
  const changeLine =
    state.day.period === 'morning'
      ? observerVoiceForPolicyChange(state.policies, patch)
      : null;
  const morningPolicyChanges = changeLine
    ? [...state.day.morningPolicyChanges, changeLine]
    : state.day.morningPolicyChanges;
  return {
    ...state,
    policies,
    staff: nextStaff,
    events: [...state.events, event],
    day: { ...state.day, morningPolicyChanges }
  };
}

// ORDER 047 §6 — synthesise a one-line observer-voice sentence for a
// meaningful policy change. Returns null when the change is a no-op
// (setting the same value) or when the patch doesn't include a field
// the player recognises as an investment axis.
function observerVoiceForPolicyChange(
  before: Policies,
  patch: Partial<Policies>
): string | null {
  const lines: string[] = [];
  if (patch.trainingLevel !== undefined && patch.trainingLevel !== before.trainingLevel) {
    const direction = patch.trainingLevel > before.trainingLevel ? 'höjde' : 'sänkte';
    lines.push(`Du ${direction} utbildningsnivån inför i dag`);
  }
  if (patch.pricing && patch.pricing !== before.pricing) {
    const to = patch.pricing;
    const map: Record<typeof to, string> = {
      'låg': 'sänkte prislägen',
      'medel': 'la prislägen på medel',
      'hög': 'höjde prislägen'
    };
    lines.push(`Du ${map[to]} inför i dag`);
  }
  if (patch.ingredientTier && patch.ingredientTier !== before.ingredientTier) {
    const to = patch.ingredientTier;
    const map: Record<typeof to, string> = {
      'grund': 'gick ner till grundleverantören',
      'utvald': 'valde utvalda leverantörer',
      'premium': 'gick över till premiumleverans'
    };
    lines.push(`Du ${map[to]} inför i dag`);
  }
  if (lines.length === 0) return null;
  return lines.join(', ') + '.';
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
  // Enters phase 'subject' — the party is at the door, awaiting the
  // player's difficulty wager (§4.3) and response (§4.2). `auto` is
  // unused now; both manual and auto triggers set hasAutoTriggered
  // to true so the auto-check in advanceTick can't re-fire and reset
  // an in-progress scenario back to `subject`.
  void auto;
  // ORDER 043 v3 §7 chain — draw the theme *before* the player sees
  // the scenario. Weakness-weighted with damping (see themeSelection.ts).
  // Consumes rng state so the same seed + same open sequence yields
  // the same chain.
  const rng = createRng(state.rngState);
  // ORDER 047 §5 — pass streamThemeCounts so the theme draw is biased
  // (not forced) toward what the ambient stream has been reporting on
  // during this service. Reset at OPEN_SERVICE (in openService).
  const drawnTheme = drawNextTheme(state, rng, state.streamThemeCounts);
  // ORDER 047 §4 — dedup within service, avoid the previous service's
  // opener. pickScenarioSpecFiltered falls back to the preferred spec
  // if the pool exhausts (density > pool size), so the wager loop
  // never stalls.
  const scenarioSpec = pickScenarioSpecFiltered(
    drawnTheme,
    state.firedScenarioIds,
    state.lastServiceOpenerId
  );
  // ORDER 048 §4 — pick the sender at trigger time. Uses a DERIVED
  // rng (hashed from state.seed × state.tick × scenario spec id) so
  // downstream arrival randomness is not shifted — the queue-monotonicity
  // regression in day.test.ts is sensitive to a single extra rng draw.
  // Deterministic per (seed, tick, spec).
  const senderSeed =
    ((state.tick + 1) * 2654435761) ^ (state.seed * 2246822519);
  const specIdHash = scenarioSpec.id
    .split('')
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
  const senderRng = createRng((senderSeed ^ specIdHash) >>> 0);
  const sender = pickScenarioSender(scenarioSpec, state.team, senderRng);
  const scenario = {
    ...state.scenario,
    hasAutoTriggered: true,
    active: true,
    phase: 'subject' as const,
    difficulty: null as null,
    awaitingChoice: false,
    choice: null as null,
    choiceAt: null as null,
    spawnedRemaining: 0,
    nextSpawnAt: 0,
    visibleGuestIds: [],
    drawnTheme,
    scenarioId: scenarioSpec.id,
    senderRole: sender ? sender.role : null,
    senderMemberId: sender ? sender.memberId : null,
    mentorComment: null,
    mentorCommentAt: null
  };
  // First scenario of the service becomes next service's opener-to-avoid.
  const isFirstOfService = state.firedScenarioIds.length === 0;
  return {
    ...state,
    scenario,
    rngState: rng.state,
    firedScenarioIds: [...state.firedScenarioIds, scenarioSpec.id],
    lastServiceOpenerId: isFirstOfService
      ? scenarioSpec.id
      : state.lastServiceOpenerId,
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'scenario' as const,
        // ORDER 048 §4 — subject-body prefixed with the sender's role
        // ("Värden: ..."). Non-auto (dev-triggered) replays keep the
        // debug marker so it reads distinctly from a real fire.
        text: auto
          ? sender
            ? `${SENDER_PREFIX[sender.role]}: ${scenarioSpec.subjectBody}`
            : scenarioSpec.subjectBody
          : 'Scenariot replays (utvecklarläge)'
      }
    ]
  };
}

// ORDER 048 §5 (2026-08-10 amendment) — the previous two-step
// advance (subject → difficulty → situation) was collapsed when the
// confidence question was retired. Now the CTA on the subject card
// takes the scenario straight to situation. awaitingChoice flips to
// true so the arrivals suspension takes effect while the player
// decides.
function advanceToSituation(state: SimulationState): SimulationState {
  if (state.scenario.phase !== 'subject') return state;
  return {
    ...state,
    scenario: {
      ...state.scenario,
      phase: 'situation',
      awaitingChoice: true
    }
  };
}

function resolveScenario(
  state: SimulationState,
  choice: ScenarioChoice
): SimulationState {
  const scenario = { ...state.scenario };
  scenario.awaitingChoice = false;
  // ORDER 048 §5 — phase decided AFTER we look up the choiceSpec
  // below. If a professionalQuestion is attached, the flow inserts
  // a 'question' phase between 'resolving' and 'settled'.
  scenario.phase = 'resolving';
  scenario.choice = choice;
  scenario.choiceAt = state.simTime;

  // Look up the scenario spec chosen at trigger. Falls back to
  // walk-in-of-five if for some legacy reason scenarioId wasn't
  // set — cycle-1 tests pre-dating the spec pattern rely on this.
  const spec = scenario.scenarioId
    ? scenarioById(scenario.scenarioId)
    : scenarioById('walk-in-of-five');
  const choiceSpec = spec?.choices[choice] ?? null;

  // Spawn effects from spec (party arriving, refusal partial-approach
  // etc). Zero-spawn scenarios (time-pressure, moral-dilemma) leave
  // the room's puck layer untouched.
  scenario.spawnedRemaining = choiceSpec?.spawnedRemaining ?? 0;
  scenario.nextSpawnAt = state.simTime + (choiceSpec?.nextSpawnAtOffset ?? 0);

  // Walk-in-of-five's B flips welcomeDrink on (adds staff task /
  // satisfaction lift). Kept inline as it's a scenario-specific
  // policy nudge — a future order could generalise via a
  // policyPatch field on ScenarioChoiceSpec.
  let policies = state.policies;
  if (spec?.id === 'walk-in-of-five' && choice === 'B') {
    policies = { ...policies, welcomeDrink: true };
  }

  // Reputation nudge for walk-in-of-five's C (refusal in front of
  // the entrance registers publicly). Other scenarios' refusals
  // don't have this specific rep hit — their consequence flows
  // through the capital delta + wager loop instead.
  let reputation = state.reputation;
  if (spec?.id === 'walk-in-of-five' && choice === 'C') {
    reputation = Math.max(0, reputation - 0.03);
  }

  // ORDER 048 §6 — meter-threshold amplifier. Hoisted above the
  // capital-write block so the outcome-scheduling block (below) can
  // also read amplifierFires + amp.extraOutcome. Reads as "you took
  // this shortcut when the capital could least afford it."
  const amp = choiceSpec?.belowThreshold;
  // ORDER 050 §3 (2026-08-10) — belowThreshold reads through the
  // axis-agnostic capitalReadingFor helper so an amplifier tied to
  // economic looks at the derived [0,1] view over state.cash.
  const amplifierFires =
    !!amp && capitalReadingFor(state, amp.capital) < amp.min;
  const rawThemeMult = amplifierFires ? amp!.amplifyThemeDelta : 1;
  const rawSecondaryMult = amplifierFires ? amp!.amplifySecondary : 1;
  // ORDER 049 §2.1: phronesis softens only the amplifier EXCESS
  // (the multiplier over the nominal ×1). "Att döma rätt räddar dig
  // när det brister" — the nominal consequence of the choice stands,
  // but the pressed-below-threshold penalty is what wisdom mitigates.
  const soften = amplifierFires ? phronesisSofteningGeneral(state) : 1;
  const themeMult = 1 + (rawThemeMult - 1) * soften;
  const secondaryMult = 1 + (rawSecondaryMult - 1) * soften;

  // ORDER 043 v3 §7 chain — capital movement on the drawn theme +
  // wager payout. capitalSign now comes from the spec so scenarios
  // can weight A/B/C differently (a moral-dilemma A might read as
  // -1 while walk-in-of-five A reads as +1).
  let capitals = state.capitals;
  let themeHistory = state.capitals.themeHistory;
  // Themed delta accumulator in SEK — applied via applyCashDelta on
  // the returned draft below when the drawn theme is 'economic'.
  let themedCashDelta = 0;
  const drawn = scenario.drawnTheme;
  if (drawn) {
    const capitalSign = choiceSpec?.capitalSign ?? CHOICE_CAPITAL_SIGN[choice];
    const nextValues = { ...state.capitals.values };
    if (drawn === 'economic') {
      // ORDER 050 §3 (2026-08-10) — economic-themed scenarios move
      // the till in SEK, not a [0,1] scalar. Signed by capitalSign
      // and scaled by the phronesis-softened themeMult.
      themedCashDelta += SCENARIO_CASH_DELTA_SEK * capitalSign * themeMult;
    } else {
      const themedDelta = SCENARIO_CAPITAL_DELTA * capitalSign;
      nextValues[drawn] = clampCapital(nextValues[drawn] + themedDelta * themeMult);
    }
    // ORDER 048 §3 — apply secondary sustainability writes to social/
    // ecological (economic writes moved to cashWrites under ORDER 050
    // §3, 2026-08-10). Fired AFTER the themed delta so a scenario
    // whose theme AND secondary both touch the same capital compose
    // in the right order.
    if (choiceSpec?.secondaryWrites) {
      for (const w of choiceSpec.secondaryWrites) {
        nextValues[w.capital] = clampCapital(nextValues[w.capital] + w.delta * secondaryMult);
      }
    }
    // ORDER 050 §3 — cash writes for two-way trades that touch money.
    // Amplifier (secondaryMult) applies to the excess above ×1 same
    // shape as the [0,1] axes so pressed scenarios feel expensive on
    // the till too.
    if (choiceSpec?.cashWrites) {
      for (const w of choiceSpec.cashWrites) {
        themedCashDelta += w.amount * secondaryMult;
      }
    }
    themeHistory = [...themeHistory, drawn].slice(-THEME_HISTORY_LIMIT);
    capitals = {
      ...state.capitals,
      values: nextValues,
      themeHistory
    };
  }

  // ORDER 043 v3 §10 step 5 hand-authored register writes per
  // response. Enabler-history evidence is the primary unit of the
  // portfolio (§8); it's what a future scenario will draw from,
  // never a numeric readout. Amounts clamped by the enabler write
  // logic below (mirrors recordEnablerEvent behaviour).
  let enablers = state.enablers;
  if (choiceSpec) {
    enablers = { ...enablers };
    for (const w of choiceSpec.registerWrites) {
      const amount = Math.max(0, Math.min(1, w.amount));
      if (amount === 0) continue;
      const previous = enablers[w.enabler];
      enablers[w.enabler] = {
        ...previous,
        [w.register]: previous[w.register] + amount,
        history: [
          ...previous.history,
          {
            at: state.simTime,
            register: w.register,
            amount,
            scenarioId: spec?.id ?? null
          }
        ]
      };
    }
  }

  // ORDER 048 §2.2 — immediate plain-voice outcome fired ~0.5 s
  // after the player answers. The connection between choice and
  // effect must be visible; the plain sentence names the specific
  // consequence in the room. Observer-voice `outcomes[]` array is
  // no longer scheduled during service (§2.3 relocation).
  const outcomeTheme = drawn ?? spec?.sustainability ?? 'social';
  const newOutcomes: typeof state.pendingOutcomes = [];
  if (choiceSpec?.immediateOutcome) {
    newOutcomes.push({
      dueAt: state.simTime + 0.5,
      text: choiceSpec.immediateOutcome,
      sustainability: outcomeTheme,
      scenarioId: spec?.id ?? 'unknown'
    });
  }
  // ORDER 048 §6 — when the amplifier fires and the spec provided an
  // extraOutcome line, append it at t+12 s. Amplifier lines are still
  // observer voice by design — they read as the proprietor noticing
  // "this particular choice bit harder than usual", which is
  // reflective, not a report. Marginal exception to §2's relocation.
  if (amplifierFires && amp?.extraOutcome) {
    newOutcomes.push({
      dueAt: state.simTime + 12,
      text: amp.extraOutcome,
      sustainability: outcomeTheme,
      scenarioId: spec?.id ?? 'unknown'
    });
  }

  // ORDER 047 §2 — scenario answer moves morale. A/B (engage) lifts;
  // C on a demanding scenario (refuse in a way that costs) drops.
  // capitalSign carries the intent: +1 = engage, −0.5 = refuse. A
  // future scenario spec can override via a per-choice moraleDelta.
  const capitalSign = choiceSpec?.capitalSign ?? 0;
  const moraleDelta =
    capitalSign > 0
      ? MORALE_SCENARIO_ENGAGE_BUMP
      : capitalSign < 0
        ? -MORALE_SCENARIO_REFUSE_HIT
        : 0;

  // ORDER 048 §5 — if the choice attached a professionalQuestion,
  // switch phase to 'question' and stash a PendingQuestion for the
  // overlay to render. The scenario's normal outcome pending events
  // still schedule; the mentor comment (via SCENARIO_SETTLE_AFTER)
  // still fires. The question is a beat on top, not a replacement.
  //
  // ORDER 049 §7 step 3 (2026-08-10) — the choice may carry either a
  // hand-authored ProfessionalQuestion or a BankQuestionRef. Bank
  // refs resolve here via pickBankQuestion; the deterministic index
  // is state.seed × state.tick × choice so replays of the same fire
  // pull the same bank entry.
  const pqSpec = choiceSpec?.professionalQuestion ?? null;
  if (pqSpec && spec) {
    if ('fromBank' in pqSpec) {
      const senderFilter = pqSpec.fromBank.senderRole;
      // Bank pool restricted to non-lärling senders. If the spec
      // requested lärling (rare/none in cycle 1) the pool falls back
      // to any sender — see pickBankQuestion's filter behaviour.
      const bankSender: BankSender | null =
        senderFilter && senderFilter !== 'lärling'
          ? (senderFilter as BankSender)
          : null;
      const idx =
        (state.seed | 0) ^
        (state.tick | 0) ^
        (choice.charCodeAt(0) | 0) ^
        (spec.id.length | 0);
      const bankQ = pickBankQuestion(pqSpec.fromBank.register, bankSender, idx);
      if (bankQ) {
        scenario.phase = 'question';
        scenario.pendingQuestion = {
          body: bankQ.question,
          options: bankQ.options.map((o) => ({
            label: o.label,
            // Phronesis options lack `correct` (see BankOption docs);
            // scenario slots only draw episteme/techne so this fallback
            // is defensive — if a phronesis pick slipped through, the
            // player would find all options counted as wrong.
            correct: o.correct ?? false
          })),
          senderRole: bankQ.sender,
          scenarioId: spec.id,
          choice,
          sourceBankId: bankQ.id,
          sourceArticleTitle: bankQ.articleTitle,
          sourceArticleUrl: bankQ.articleUrl,
          sourceCitation: bankQ.citation
        };
      }
    } else {
      scenario.phase = 'question';
      scenario.pendingQuestion = {
        body: pqSpec.body,
        options: pqSpec.options.map((o) => ({
          label: o.label,
          correct: o.correct,
          consequenceLine: o.consequenceLine
        })),
        senderRole: pqSpec.senderRole ?? scenario.senderRole,
        scenarioId: spec.id,
        choice
      };
    }
  }

  const nextState: SimulationState = {
    ...state,
    scenario,
    policies,
    reputation,
    capitals,
    enablers,
    pendingOutcomes: [...state.pendingOutcomes, ...newOutcomes],
    events: [
      ...state.events,
      {
        at: state.simTime,
        kind: 'scenario' as const,
        text: `Scenario: valde ${choice}`
      }
    ]
  };
  // ORDER 050 §3 (2026-08-10) — apply the accumulated economic
  // scenario movement to the till. Positive = revenue-shaped (five
  // extra covers), negative = cost-shaped (the wine that broke).
  // §7 step 3 — one ledger line per scenario resolution so the book
  // names what shifted and by how much. The cause reads as English
  // prose the player recognises rather than a code identifier.
  if (themedCashDelta !== 0) {
    applyCashDelta(nextState, themedCashDelta);
    postLedger(nextState, {
      category: 'scenario',
      amount: themedCashDelta,
      cause: scenarioLedgerCause(spec?.id, choice),
      ...(spec?.id ? { causeId: spec.id } : {})
    });
  }
  bumpMorale(nextState, moraleDelta);
  // ORDER 076 (M6) — record the drawn capital on the day so the
  // evening account paragraph can pick a capital-flavoured variant.
  // Last-scenario-wins if multiple resolve in one day; that's the
  // right reading (the last theme is the one still in the room's
  // head at close).
  if (drawn) {
    nextState.day = { ...nextState.day, drawnCapital: drawn, lastScenarioChoice: choice };
  } else {
    nextState.day = { ...nextState.day, lastScenarioChoice: choice };
  }
  return nextState;
}

// ORDER 048 §5 — answer to the current professional question. Right
// answer: enabler write (+ optional correctLine at t+4 s). Wrong
// answer: per-option consequenceLine at t+4 s, plus a decay to the
// same enabler tally the correct answer would have paid (ORDER 049
// §2.1, 2026-08-09: knowledge that failed is the knowledge that
// regresses; capital falls indirectly via the ceiling chain).
function answerProfessionalQuestion(
  state: SimulationState,
  index: number
): SimulationState {
  const pq = state.scenario.pendingQuestion;
  if (state.scenario.phase !== 'question' || !pq) return state;
  const opt = pq.options[index];
  if (!opt) return state;

  const spec = scenarioById(pq.scenarioId);
  const questionSpec = spec?.choices[pq.choice]?.professionalQuestion ?? null;
  // ORDER 049 §7 step 3 (2026-08-10) — hand-authored questions carry
  // a correctLine on the spec; bank picks do not (the citation stream
  // line does the equivalent work). Detect by shape.
  const authoredCorrectLine =
    questionSpec && !('fromBank' in questionSpec)
      ? questionSpec.correctLine
      : undefined;
  const enablerWrite = questionSpec?.correctEnablerWrite ?? null;
  // ORDER 049 §7 step 3 (2026-08-10) — citation stream line for bank
  // picks. Fires regardless of right/wrong so the player sees where
  // the answer comes from and can follow the link. Skipped for
  // hand-authored questions (no citation to show).
  const citationLine =
    pq.sourceArticleTitle && pq.sourceArticleUrl
      ? `Source: ${pq.sourceArticleTitle} — ${pq.sourceArticleUrl}`
      : null;

  let capitals = state.capitals;
  let enablers = state.enablers;
  const newOutcomes: typeof state.pendingOutcomes = [];

  if (opt.correct) {
    // Enabler write for the correct answer.
    if (enablerWrite) {
      const w = enablerWrite;
      const amount = Math.max(0, Math.min(1, w.amount));
      if (amount > 0) {
        const prev = enablers[w.enabler];
        enablers = {
          ...enablers,
          [w.enabler]: {
            ...prev,
            [w.register]: prev[w.register] + amount,
            history: [
              ...prev.history,
              { at: state.simTime, register: w.register, amount, scenarioId: pq.scenarioId }
            ]
          }
        };
      }
    }
    // Positive outcome line for the room, if the spec provided one.
    if (authoredCorrectLine) {
      newOutcomes.push({
        dueAt: state.simTime + 4,
        text: authoredCorrectLine,
        sustainability: spec?.sustainability ?? 'social',
        scenarioId: pq.scenarioId
      });
    }
  } else {
    // Wrong. Per-option consequence line first (specific room
    // consequence of the exact wrong answer), then the choice-level
    // capital hit.
    if (opt.consequenceLine) {
      newOutcomes.push({
        dueAt: state.simTime + 4,
        text: opt.consequenceLine,
        sustainability: spec?.sustainability ?? 'social',
        scenarioId: pq.scenarioId
      });
    }
    // ORDER 049 §2.1 (Vision Owner 2026-08-09): wrong answers now
    // decay the same enabler tally the question was probing, not
    // capital. Capital falls indirectly — the ceiling drops, drift
    // pulls quality and reputation with it, revenue follows. This
    // makes "brister kan inte kompenseras mellan områden" mechanical:
    // knowledge that failed is precisely the knowledge that regresses.
    if (enablerWrite) {
      const w = enablerWrite;
      // Symmetric magnitude: a wrong answer costs the same tally the
      // right answer would have paid. Kept simple; §5 tuning may
      // later scale wrong-costs to be steeper than right-gains once
      // playtest shows the shape.
      const cost = Math.max(0, Math.min(1, w.amount));
      if (cost > 0) {
        const prev = enablers[w.enabler];
        enablers = {
          ...enablers,
          [w.enabler]: {
            ...prev,
            [w.register]: Math.max(0, prev[w.register] - cost),
            history: [
              ...prev.history,
              { at: state.simTime, register: w.register, amount: -cost, scenarioId: pq.scenarioId }
            ]
          }
        };
      }
    }
  }

  // Citation follow-up, right or wrong. Sits ~2 s after the outcome
  // line so the player reads the answer before the source.
  if (citationLine) {
    newOutcomes.push({
      dueAt: state.simTime + 6,
      text: citationLine,
      sustainability: spec?.sustainability ?? 'social',
      scenarioId: pq.scenarioId
    });
  }

  // Phase back to 'resolving' so the standard settle → 'settled'
  // continues. Clear pendingQuestion. `choiceAt` is unchanged so the
  // SCENARIO_SETTLE_AFTER window continues from the original choice
  // — the question is part of the resolve, not a reset.
  const scenario = {
    ...state.scenario,
    phase: 'resolving' as const,
    pendingQuestion: null
  };
  return {
    ...state,
    scenario,
    capitals,
    enablers,
    pendingOutcomes: [...state.pendingOutcomes, ...newOutcomes]
  };
}

function clampCapital(v: number): number {
  return Math.max(CAPITAL_MIN, Math.min(CAPITAL_MAX, v));
}

// ORDER 048 §5 (2026-08-10 amendment) — mentor comment simplified
// after the confidence question retired. One line per choice, no
// difficulty-keyed variants. Fallback holds a legacy per-choice
// string for tests that trigger without a scenarioId.
function mentorCommentFor(
  scenarioId: string | null,
  choice: ScenarioChoice | null
): string {
  if (!choice) {
    return 'The evening moved on — we\'ll look at how it played out next time.';
  }
  const spec = scenarioId ? scenarioById(scenarioId) : null;
  if (spec) {
    return spec.choices[choice].mentor;
  }
  return strings.scenario.mentor[choice];
}
