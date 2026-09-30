// ORDER 290 — kvällens ekonomi och svarens följd i rummet (Vision Owner
// 2026-09-30, provspel av cae53c9).
//
// Proven läser samma källor som spelet: insatsen (eveningEconomy.ts
// eveningStake, satt när dörrarna öppnar), kvällskassan (tillSek),
// överföringen (eveningTransfer, satt när servicen stänger), kassan vid
// dagsavslut (economy.ts dayEndCash), prognosen (forecastWeeks), DJ:n
// (economy.ts dailyGuestCap) och svarens följd (sim/incidents.ts).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { ANSWER_EFFECTS, EVENING_ECONOMY } from '../balance';
import { dailyGuestCap, dayEndCash } from '../economy';
import { stocked } from '../../strategic/testHarness/stocked';
import { accountAfterEvening, eveningStake, forecastWeeks, stockSpentToday, tillSek } from '../../strategic/simulation/eveningEconomy';
import type { SimulationState } from '../../strategic/types';

function week2(seed = 290): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, medals: { ...s.medals, stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 2 } };
}

function playService(s0: SimulationState): { opened: SimulationState; atDoors: SimulationState; closed: SimulationState } {
  let s = reducer(s0, { type: 'START_SERVICE' });
  const opened = s;
  let atDoors: SimulationState | null = null;
  for (let i = 0; i < 6000 && s.day.period !== 'evening'; i++) {
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    if (!atDoors && s.day.stake) atDoors = s;
  }
  return { opened, atDoors: atDoors!, closed: s };
}

describe('ORDER 290 — kvällens insats och kvällskassan', () => {
  it('insatsen sätts när dörrarna öppnar: råvaror, personal och räntan; summan är break-even', () => {
    const s0 = stocked(week2());
    const { atDoors } = playService(s0);
    const stake = atDoors.day.stake!;
    const byKey = Object.fromEntries(stake.lines.map((l) => [l.key, l.sek]));
    expect(byKey.ingredients).toBe(Math.round(stockSpentToday(atDoors)));
    expect(byKey.staff).toBeGreaterThan(0);
    expect(stake.total).toBe(stake.lines.reduce((a, l) => a + l.sek, 0));
    expect(atDoors.day.cashAtDoorsOpen).toBe(atDoors.cash);
  });

  it('kvällskassan börjar på noll och står kvar efter stängningen', () => {
    const s0 = stocked(week2());
    const { opened, closed } = playService(s0);
    expect(tillSek(opened)).toBe(0);
    expect(closed.day.tillAtClose).toBeGreaterThan(0);
    expect(tillSek(closed)).toBe(closed.day.tillAtClose);
  });

  it('DJ:n räknas i insatsen och drar fler gäster', () => {
    const s0 = week2();
    const withDj = reducer(s0, { type: 'PICK_ACTIVITY', id: 'book-dj' });
    expect(withDj.day.pickedActivityIds).toContain('book-dj');
    expect(dailyGuestCap(withDj)).toBeGreaterThan(dailyGuestCap(s0));
    const stake = eveningStake(withDj, 0);
    expect(stake.lines.find((l) => l.key === 'dj')?.sek).toBe(EVENING_ECONOMY.djCostSek);
  });

  it('en satsning som är kompetens står som kompetens', () => {
    const s = reducer(week2(), { type: 'PICK_ACTIVITY', id: 'train-service' });
    expect(eveningStake(s, 0).lines.some((l) => l.key === 'competence')).toBe(true);
  });
});

describe('ORDER 290 — överföringen efter servicen', () => {
  it('täckningsbidrag, täckningsgrad och resultat går ihop, och kontot efter är kassan vid dagsavslut', () => {
    const s0 = stocked(week2());
    const { closed } = playService(s0);
    const tr = closed.day.transfer!;
    expect(tr.dayNumber).toBe(closed.day.dayNumber);
    expect(tr.contributionSek).toBe(tr.revenueSek - tr.variableSek);
    expect(tr.contributionRatio).toBeCloseTo(tr.contributionSek / tr.revenueSek, 6);
    expect(tr.resultSek).toBe(tr.contributionSek - tr.fixedSek);
    expect(tr.accountAfterSek).toBe(Math.round(accountAfterEvening(closed)));
    expect(tr.transferSek).toBe(tr.accountAfterSek - tr.accountBeforeSek);
    // Resultatet (Designs serviceläget §4) är kontot efter mot kontot i morse,
    // utan sopbilens avgift (den dras på sopbilens skärm, inte i insatsen).
    expect(tr.resultSek).toBe(tr.accountAfterSek - tr.accountMorningSek + tr.wasteFeeSek);
    expect(Math.abs(tr.accountAfterSek - dayEndCash(closed))).toBeLessThanOrEqual(1);
    expect(tr.rest.staff + tr.rest.dj + tr.rest.competence + tr.rest.investments + tr.rest.incidents).toBe(tr.fixedSek);
    expect(tr.accountBeforeSek).toBe(tr.accountMorningSek - tr.variableSek - tr.wasteFeeSek);
    // Kvällen börjar med sopbilen eller överföringen, och går sedan till resultatet.
    expect(['waste', 'transfer']).toContain(closed.day.eveningStep);
    let e = closed;
    if (e.day.eveningStep === 'waste') e = reducer(e, { type: 'EVENING_STEP', to: 'transfer' });
    expect(e.day.eveningStep).toBe('transfer');
    e = reducer(e, { type: 'EVENING_STEP', to: 'result' });
    expect(e.day.eveningStep).toBe('result');
  });

  it('nästa morgon är kassan kontot efter överföringen (utom köksdriften mellan servicerna)', () => {
    const s0 = stocked(week2());
    const { closed } = playService(s0);
    const after = closed.day.transfer!.accountAfterSek;
    const next = reducer(closed, { type: 'END_EVENING' });
    let s = next;
    for (let i = 0; i < 50 && s.day.period === 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('morning');
    expect(Math.abs(s.cash - after)).toBeLessThan(500);
  });

  it('prognosen: resten av säsongen när kvällarna går plus, annars ett antal veckor', () => {
    const base = week2();
    const plus = { ...base, economy: { ...base.economy, eveningResults: [{ dayNumber: 1, resultSek: 20000 }] } };
    expect(forecastWeeks(plus)).toBeNull();
    const minus = { ...base, economy: { ...base.economy, eveningResults: [{ dayNumber: 1, resultSek: -40000 }] } };
    const w = forecastWeeks(minus);
    expect(w).not.toBeNull();
    expect(w!).toBeGreaterThanOrEqual(0);
  });
});

describe('ORDER 290 — svarens följd i rummet', () => {
  it('rätt svar höjer notan vid bordet, fel svar sänker den, gör bordet missnöjt och en gäst i kön går', async () => {
    const { resolveIncident } = await import('../incidents');
    const s0 = stocked(week2());
    let s = reducer(s0, { type: 'START_SERVICE' });
    for (let i = 0; i < 6000 && !s.incidents?.active; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const active = s.incidents!.active!;
    expect(active).toBeTruthy();
    const { incidentById, optionQuality } = await import('../incidentBank');
    const inc = incidentById(s.economy.businessClass, active.id)!;
    const step = inc.steps[active.step ?? 0];
    const best = step.options.find((o) => optionQuality(o, active.situation) === 'best')!;
    const worst = step.options.find((o) => optionQuality(o, active.situation) === 'wrong') ?? step.options.find((o) => o.id !== best.id)!;

    const right: SimulationState = structuredClone(s);
    resolveIncident(right, best.id);
    const table = right.guests.filter((g) => active.context.guestIds.includes(g.id));
    for (const g of table) expect(g.billBonus ?? 0).toBeGreaterThan(0);
    expect(right.day.roomReactions?.at(-1)?.kind).toBe('up');

    const wrong: SimulationState = structuredClone(s);
    // En gäst i kön, så att följden syns.
    const queued = wrong.guests.find((g) => g.state === 'waiting') ?? null;
    resolveIncident(wrong, worst.id);
    expect(wrong.day.roomReactions?.at(-1)?.kind).toBe('down');
    const tableW = wrong.guests.filter((g) => active.context.guestIds.includes(g.id) && g.state !== 'leaving');
    for (const g of tableW) expect(g.billBonus ?? 0).toBeLessThan(0);
    if (queued) expect(wrong.guests.find((g) => g.id === queued.id)?.state).toBe('leaving');
    expect(ANSWER_EFFECTS.wrongBillShare).toBeLessThan(0);
  });
});
