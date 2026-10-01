// ORDER 292 — dygnets kostnader vid stängningen (reducer.ts och collapse.ts).

import { strings } from '../../content/strings';
import { dailyWagesSek, postDailyInterest } from '../../sim/economy';
import type { SimulationState } from '../types';
import { activityById, activityName } from './activities';
import { applyCashCost, applyCashDelta, postLedger } from './cashReading';
import { recordAnswerBookings } from '../../sim/nextDay';

function roleText(role: keyof typeof strings.team.roleLabel): string {
  return strings.team.roleLabel[role].toLowerCase();
}

// ORDER 292 (provspel av 316b4c3: "Kassan rullar fortfarande efter
// servicen") — dygnets kostnader dras när servicen stänger: lönerna, räntan
// och satsningarnas följd i kronor. Kassan efter stängningen är då kontot
// efter överföringen (T2), och den står still till nästa morgon. Dygnsskiftet
// drar dem bara för en dag utan service (day.dayEndCharged).
export function chargeDayEnd(draft: SimulationState): void {
  if (draft.day.dayEndCharged) return;
  const costBefore = draft.cost;
  chargeWages(draft, draft);
  postDailyInterest(draft);
  for (const id of draft.day.pickedActivityIds) {
    const activity = activityById(id);
    if (!activity || activity.effect.economic === 0) continue;
    applyCashDelta(draft, activity.effect.economic);
    postLedger(draft, { category: 'other', amount: activity.effect.economic, cause: strings.ledgerCause.investmentEffect(activityName(activity)), causeId: id });
  }
  draft.day = { ...draft.day, dayEndCharged: true };
  // Kvällens raketer blir bokningar (eller avbokningar) till nästa servicedag.
  recordAnswerBookings(draft);
  // Kvällens redovisning (eveningAccount) räknades före stängningens
  // kostnader; de läggs till som sopbilens avgift (stockPackages.ts settleWaste).
  const added = draft.cost - costBefore;
  const m = draft.eveningAccount?.metrics;
  if (m && added !== 0) draft.eveningAccount = { ...draft.eveningAccount!, metrics: { ...m, cost: m.cost + added, result: m.result - added } };
}

// Dagens löner: en rad per anställd i kassaboken och veckans summa.
export function chargeWages(draft: SimulationState, from: SimulationState): void {
  const wageTotal = dailyWagesSek(from);
  if (wageTotal <= 0) return;
  applyCashCost(draft, wageTotal);
  // ORDER 280 — veckans löner, en rad i avräkningen och tidningen.
  draft.economy = { ...draft.economy, weekWagesSek: (draft.economy.weekWagesSek ?? 0) + wageTotal };
  // §7 step 3 — one line per member per day so the book names who was paid.
  for (const m of from.team.members.filter((x) => !x.isAgency)) {
    if (m.dailyCost <= 0) continue;
    postLedger(draft, { category: 'wage', amount: -m.dailyCost, cause: strings.ledgerCause.wage(roleText(m.role)), causeId: m.id });
  }
}

