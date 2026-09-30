// ORDER 290 — kvällens ekonomi (Vision Owner 2026-09-30, provspel av
// cae53c9): "Under servicen visas kvällskassan, inte företagskontot. Den
// börjar på noll och visar kvällens intäkter. När dörrarna öppnas visas
// kvällens insats: råvaror, personal, DJ, satsningar och kompetens.
// Kvällskassan fylls mot en synlig linje för break-even. Efter servicen
// visas täckningsbidrag, täckningsgrad och kvällens resultat. Resultatet
// förs till företagskontot, eller dras från det vid förlust. Prognos: Med
// det här konceptet klarar du dig {weeks} veckor."
//
// Varje tal läser samma källa som kassan:
// - råvarorna: dagens inköp i kassaboken ('stock'), betalda på morgonen;
// - personalen: kvällens löner (economy.ts dailyWagesSek, dras vid
//   dygnsskiftet) och köksdriften under servicen (reducer.ts
//   costPerMinuteToTick, uppskattad när dörrarna öppnar);
// - DJ, satsningar och kompetens: dagens valda satsningar, med kostnaden
//   när de valdes och deras ekonomiska följd vid dygnsskiftet
//   (activities.ts);
// - räntan: lånets ränta för dagen (dailyInterestSek).
// Kvällskassan är intäkten sedan dörrarna öppnade och raketernas kassa
// (serviceView.ts tonightCashSek). Kvällens resultat är kassan vid
// dagsavslut (dayEndCash, med satsningarnas följd) mot kassan vid gryningen:
// samma tal som nästa morgon, bortsett från köksdriften mellan servicerna.

import type { EveningStake, EveningTransfer, SimulationState, StakeKey } from '../types';
import { EVENING_ECONOMY, SEASON, WEEK } from '../../sim/balance';
import { calendarFor } from '../../sim/calendar';
import { creditLineSek, dailyInterestSek, dailyWagesSek, dayEndCash, weeklyRentSek } from '../../sim/economy';
import { activityById } from './activities';

export const DJ_ACTIVITY_ID = 'book-dj';

// Dagens inköp av råvaror (kassabokens 'stock', netto efter återköp).
export function stockSpentToday(state: SimulationState): number {
  const day = state.day.dayNumber;
  const net = state.ledger.filter((l) => l.day === day && l.category === 'stock').reduce((a, l) => a + l.amount, 0);
  return Math.max(0, -net);
}

// En satsnings kostnad för kassan i dag: priset när den valdes och den
// ekonomiska följden vid dygnsskiftet (negativ följd är en kostnad).
function activityNetCost(id: string): number {
  const a = activityById(id);
  return a ? a.costSek - a.effect.economic : 0;
}

function activityKey(id: string): StakeKey {
  if (id === DJ_ACTIVITY_ID) return 'dj';
  return EVENING_ECONOMY.competenceActivities.includes(id) ? 'competence' : 'investments';
}

// Kvällens insats. `overheadSek` är köksdriften under servicen, uppskattad
// av reducern när dörrarna öppnar.
export function eveningStake(state: SimulationState, overheadSek: number): EveningStake {
  // Designs fyra rader (råvaror, personal, DJ, kompetens), och satsningarna när
  // spelaren valt någon. Räntan och köksdriften räknas till personalen.
  const sums: Record<StakeKey, number> = { ingredients: stockSpentToday(state), staff: dailyWagesSek(state) + Math.max(0, overheadSek) + dailyInterestSek(state.economy.loan), dj: 0, investments: 0, competence: 0, interest: 0 };
  for (const id of state.day.pickedActivityIds) sums[activityKey(id)] += activityNetCost(id);
  const order: StakeKey[] = ['ingredients', 'staff', 'dj', 'competence', 'investments'];
  const lines = order.filter((k) => sums[k] > 0 || k === 'ingredients' || k === 'staff').map((k) => ({ key: k, sek: Math.round(sums[k]) }));
  return { lines, total: lines.reduce((a, l) => a + l.sek, 0) };
}

// Kvällskassan: notorna sedan servicen öppnade (Designs serviceläget §2:
// "fylls när en nota betalas"). Efter stängningen står kvällens kassa kvar
// (day.tillAtClose).
export function tillSek(state: SimulationState): number {
  const start = state.day.revenueAtServiceStart;
  if (start === null || start === undefined) return state.day.tillAtClose ?? 0;
  return state.revenue - start;
}

// Raketernas kassa i kväll (kassabokens 'scenario'), som egen rad efter servicen.
export function incidentCashToday(state: SimulationState): number {
  const day = state.day.dayNumber;
  return state.ledger.filter((l) => l.day === day && l.category === 'scenario').reduce((a, l) => a + l.amount, 0);
}

// Satsningarnas följd som dras eller läggs till vid dygnsskiftet.
function pendingActivityEffects(state: SimulationState): number {
  return state.day.pickedActivityIds.reduce((a, id) => a + (activityById(id)?.effect.economic ?? 0), 0);
}

// Kassan när dagen är slut: efter löner, ränta och satsningarnas följd.
export function accountAfterEvening(state: SimulationState): number {
  return dayEndCash(state) + pendingActivityEffects(state);
}

// Efter stängningen (reducern, när sopbilen avräknats). Designs serviceläget
// §4: försäljning − råvaror = täckningsbidrag; − personal, DJ och kompetens =
// kvällens resultat. Kontot efter överföringen är kassan vid dagsavslut
// (accountAfterEvening), och resultatet räknas så att det går ihop med den:
// resultat = kontot efter − kontot i morse + sopbilens avgift (som dras på
// sopbilens skärm och inte hör till insatsen). Personalens rad är det som
// återstår av resten när DJ, kompetens och satsningar är räknade: lönerna,
// köksdriften och räntan.
export function eveningTransfer(state: SimulationState): EveningTransfer {
  const d = state.day;
  const revenueSek = Math.round(tillSek(state));
  const wasteFeeSek = Math.round(state.lastWaste && state.lastWaste.dayNumber === d.dayNumber ? state.lastWaste.feeSek ?? 0 : 0);
  const variableSek = Math.round(stockSpentToday(state));
  const contributionSek = revenueSek - variableSek;
  const morning = Math.round(d.cashAtDayStart ?? state.cash);
  const after = Math.round(accountAfterEvening(state));
  const resultSek = after - morning + wasteFeeSek;
  const fixedSek = contributionSek - resultSek;
  const byKey = (k: StakeKey) => Math.round(d.pickedActivityIds.filter((id) => activityKey(id) === k).reduce((a, id) => a + activityNetCost(id), 0));
  const dj = byKey('dj');
  const competence = byKey('competence');
  const investments = byKey('investments');
  // Raketernas kassa (positiv eller negativ) står som egen rad i resten.
  const incidents = -Math.round(incidentCashToday(state));
  const before = after - revenueSek + fixedSek;
  return {
    dayNumber: d.dayNumber,
    revenueSek,
    bills: d.billsTonight ?? 0,
    variableSek,
    contributionSek,
    contributionRatio: revenueSek > 0 ? contributionSek / revenueSek : 0,
    fixedSek,
    rest: { staff: fixedSek - dj - competence - investments - incidents, dj, competence, investments, incidents },
    staffOnShift: state.team.members.filter((m) => !m.isAgency).length,
    resultSek,
    wasteFeeSek,
    breakEvenSek: d.stake?.total ?? 0,
    passedAt: d.tillPassedAt ?? null,
    accountMorningSek: morning,
    accountBeforeSek: before,
    accountAfterSek: after,
    transferSek: after - before
  };
}

// Kvällskassan passerar insatsen (reducern, efter kvällens betalningar):
// klockslaget sparas en gång per kväll.
export function passedStake(state: SimulationState): boolean {
  const stake = state.day.stake?.total ?? 0;
  return stake > 0 && !state.day.tillPassedAt && tillSek(state) >= stake;
}

// Prognosen: hur många veckor kassan och kreditramen räcker med kvällarnas
// resultat, hyran och amorteringen. null = konceptet bär sig resten av
// säsongen.
export function forecastWeeks(state: SimulationState): number | null {
  const recent = (state.economy.eveningResults ?? []).slice(-EVENING_ECONOMY.forecastEvenings);
  if (recent.length === 0) return null;
  const perEvening = recent.reduce((a, r) => a + r.resultSek, 0) / recent.length;
  const loan = state.economy.loan;
  const amortisation = loan && loan.weeksLeft > 0 ? loan.principalSek / loan.weeksLeft : 0;
  const weeklyNet = perEvening * WEEK.serviceDays - weeklyRentSek(state.economy.businessClass) - amortisation;
  if (weeklyNet >= 0) return null;
  const weeksLeft = Math.max(0, SEASON.weeks - calendarFor(state.day.dayNumber).week);
  const room = accountAfterEvening(state) + creditLineSek(state);
  const weeks = Math.max(0, Math.floor(room / -weeklyNet));
  return weeks >= weeksLeft ? null : weeks;
}
