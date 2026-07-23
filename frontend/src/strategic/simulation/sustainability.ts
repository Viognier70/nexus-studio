import type { SimulationState, SustainabilityDirection } from '../types';
import { costPerSimMinute, revenuePerGuest } from './economics';

// Rolling window sample count. Ticks are 5 Hz, so 60 samples ≈ 12 sim-seconds.
const WINDOW = 60;

function push(list: number[], value: number) {
  list.push(value);
  if (list.length > WINDOW) list.shift();
}

function avg(list: number[]): number {
  if (list.length === 0) return 0;
  let sum = 0;
  for (const v of list) sum += v;
  return sum / list.length;
}

function delta(list: number[]): number {
  if (list.length < 4) return 0;
  const half = Math.floor(list.length / 2);
  let early = 0;
  let late = 0;
  for (let i = 0; i < half; i++) early += list[i];
  for (let i = half; i < list.length; i++) late += list[i];
  return late / (list.length - half) - early / half;
}

function direction(prevValue: number, nextValue: number, threshold = 0.02): SustainabilityDirection {
  const d = nextValue - prevValue;
  if (nextValue < 0.28) return 'kritisk';
  if (d > threshold) return 'förbättras';
  if (d < -threshold) return 'försämras';
  return 'stabil';
}

export function tickSustainability(state: SimulationState) {
  const seated = state.seatedIds.length;
  const waiting = state.waitingIds.length;
  const workload =
    state.staff.reduce((s, m) => s + m.workload, 0) / Math.max(1, state.staff.length);

  const satisfactionValues = state.guests.map((g) => g.satisfaction);
  const meanSatisfaction =
    satisfactionValues.length === 0
      ? 0.7
      : satisfactionValues.reduce((s, v) => s + v, 0) / satisfactionValues.length;

  // Update rolling series.
  push(state.rolling.satisfaction, meanSatisfaction);
  push(state.rolling.workload, workload);
  push(state.rolling.waste, state.waste);

  // Approximate per-minute revenue and cost signal.
  const revenueRate = state.completedGuests > 0 ? revenuePerGuest(state.policies) : 0;
  push(state.rolling.revenue, revenueRate);

  const costRate = costPerSimMinute(state.policies, state.waste);

  // ---- Ekonomisk ----
  const econRolling = avg(state.rolling.revenue) - costRate * 0.02;
  const econNorm = Math.max(0, Math.min(1, (econRolling + 60) / 400));
  const econDir = direction(state.eco.econ.value, econNorm);

  // ---- Social ----
  const socialRaw = meanSatisfaction * (1 - 0.6 * Math.max(0, workload - 0.65));
  const socialNorm = Math.max(0, Math.min(1, socialRaw));
  const socialDir = direction(state.eco.social.value, socialNorm);

  // ---- Ekologisk ----
  const wasteFactor = Math.max(0, state.waste / Math.max(1, state.completedGuests + 1));
  const sourcingBonus = state.policies.localSourcing ? 0.08 : -0.02;
  const tierPenalty = state.policies.ingredientTier === 'premium' ? -0.06 : 0.02;
  const ecologRaw = 0.7 - wasteFactor * 0.3 + sourcingBonus + tierPenalty;
  const ecologNorm = Math.max(0, Math.min(1, ecologRaw));
  const ecologDir = direction(state.eco.ecolog.value, ecologNorm);

  // Update conditions with textual cause and consequence hints.
  state.eco.econ = {
    value: econNorm,
    direction: econDir,
    cause: econCause(state, delta(state.rolling.revenue), workload),
    consequence: econConsequence(state, workload),
    lastChangeAt: state.simTime
  };
  state.eco.social = {
    value: socialNorm,
    direction: socialDir,
    cause: socialCause(state, waiting, workload),
    consequence: socialConsequence(state, waiting, workload),
    lastChangeAt: state.simTime
  };
  state.eco.ecolog = {
    value: ecologNorm,
    direction: ecologDir,
    cause: ecologCause(state),
    consequence: ecologConsequence(state, wasteFactor),
    lastChangeAt: state.simTime
  };
  void seated;
}

function econCause(state: SimulationState, revenueDelta: number, workload: number): string | null {
  if (state.completedGuests === 0) return 'Kväll som nyss börjat';
  if (revenueDelta > 20) return 'Fler serveringar än på länge';
  if (workload > 0.8) return 'Personalen sliter — låg omsättning per timme';
  if (state.policies.pricing === 'låg' && state.policies.ingredientTier === 'premium') {
    return 'Höga inköp i förhållande till priset';
  }
  return null;
}

function econConsequence(_state: SimulationState, workload: number): string | null {
  if (workload > 0.85) return 'Kostnadssidan pressar marginalen om ca. 2 min';
  return null;
}

function socialCause(state: SimulationState, waiting: number, workload: number): string | null {
  if (waiting >= 2 && workload > 0.6) return 'Full beläggning och hög arbetsbelastning';
  if (waiting >= 2) return 'Väntande gäster i entrén';
  if (workload > 0.8) return 'Personalen är pressad';
  if (state.policies.welcomeDrink && waiting > 0) return 'Välkomstservering till väntande grupp';
  return null;
}

function socialConsequence(_state: SimulationState, waiting: number, workload: number): string | null {
  if (waiting >= 3 && workload > 0.7) return 'Missnöje väntar om ca. 2 min';
  if (workload > 0.9) return 'Servicekvalitet kan falla snart';
  return null;
}

function ecologCause(state: SimulationState): string | null {
  if (state.policies.welcomeDrink && state.waitingIds.length > 0) {
    return 'Välkomstservering till väntande grupp';
  }
  if (state.policies.ingredientTier === 'premium') {
    return 'Premiumsortiment i inköp';
  }
  if (state.policies.localSourcing) {
    return 'Lokala leverantörer i inköp';
  }
  return null;
}

function ecologConsequence(state: SimulationState, wasteFactor: number): string | null {
  if (wasteFactor > 0.4) return 'Ökat svinn påverkar villkoret om ca. 3 min';
  if (state.policies.welcomeDrink && state.waitingIds.length > 0)
    return 'Resursanvändning ökar under väntetiden';
  return null;
}
