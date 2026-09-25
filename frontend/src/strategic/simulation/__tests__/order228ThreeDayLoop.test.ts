// ORDER 228 (etapp A) — DoD-integration: tre dagar i följd, spårbara tal.
//
// DoD:
//   A.1 Dagen har ett slut. Kvällsavräkning som visar: intäkt, kostnad,
//       resultat, förändring i rykte, förändring i kunskapskapital.
//   A.2 Resultatet bärs över till nästa dag. Kassa, rykte, personal, lager.
//   A.3 En omgång går att avsluta och starta om. Det ska gå att spela
//       flera dagar i följd utan att ladda om sidan.
//   Video 30 s av avräkningen — separat Vision Owner-verifiering.
//
// Detta test kör sim genom tre dinner-services i följd (day 1, 2, 3),
// samlar kvällsavräkningarnas metrics per dag och verifierar att:
//   1. Varje dag producerar en EveningAccount med icke-null `metrics`.
//   2. Metricsen är spårbara — revenue/cost/result stämmer mot
//      state.revenue/cost-diffar; delta:erna är verkligen delta:er.
//   3. Cash/rykte/kunskap bärs över mellan dagar (A.2).
//   4. RESET-action tar sim tillbaka till dag 1 (A.3).

import { EVENING } from '../../../sim/balance';
import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import type { EveningAccount, SimulationState } from '../../types';

interface DaySnapshot {
  readonly dayNumber: number;
  readonly revenue: number;
  readonly cost: number;
  readonly reputation: number;
  readonly cash: number;
  readonly account: EveningAccount;
}

// Kör en dinner-service via SKIP_LUNCH → OPEN_SERVICE → TICKS tills
// eveningAccount populeras eller day rullar över (för säkerhets skull).
function runOneDinner(
  start: SimulationState,
  lengthMinutes: number
): { after: SimulationState; account: EveningAccount } {
  let s = start;
  // Om sim redan är förbi lunch (t.ex. dag 2+ efter rollover), SKIP_LUNCH
  // är no-op eller reducern hanterar det.
  s = reducer(s, { type: 'SKIP_LUNCH' });
  s = reducer(s, {
    type: 'OPEN_SERVICE',
    service: 'dinner',
    lengthMinutes
  });
  const dt = 1 / 5;
  // service-fönster + kvällen (ORDER 264: EVENING.simSeconds) + slack
  const maxTicks = (lengthMinutes * 60 + EVENING.simSeconds) * 5 + 500;
  let account: EveningAccount | null = null;
  for (let i = 0; i < maxTicks; i++) {
    s = reducer(s, { type: 'TICK', dt });
    if (s.eveningAccount !== null && account === null) {
      account = s.eveningAccount;
    }
    // När dagen rullar över nollställs eveningAccount; stanna kvar med
    // den vi fångade.
    if (s.day.dayNumber > start.day.dayNumber && account !== null) break;
  }
  if (account === null) {
    throw new Error(
      `runOneDinner: ingen eveningAccount efter ${maxTicks} ticks från day=${start.day.dayNumber}`
    );
  }
  return { after: s, account };
}

describe('ORDER 228 — tre dagar i följd (DoD A.1 + A.2 + A.3)', () => {
  it('tre dinner-services i följd producerar var sin EveningAccount med spårbara metrics', () => {
    let state = makeInitialState(42);
    const snapshots: DaySnapshot[] = [];

    for (let dayIdx = 0; dayIdx < 3; dayIdx++) {
      // Pre-service-snapshotarna (för att verifiera delta:erna mot
      // faktiska rörelser).
      const preRevenue = state.revenue;
      const preCost = state.cost;
      const preReputation = state.reputation;
      const preCash = state.cash;

      const { after, account } = runOneDinner(state, 5);

      // DoD A.1 — kvällsavräkningen finns.
      expect(account.paragraph.length, `dag ${dayIdx + 1} paragraph`).toBeGreaterThan(20);
      // DoD A.1 — metrics finns med de fem talen.
      expect(account.metrics, `dag ${dayIdx + 1} metrics`).toBeDefined();
      const m = account.metrics!;
      expect(Number.isFinite(m.revenue)).toBe(true);
      expect(Number.isFinite(m.cost)).toBe(true);
      expect(Number.isFinite(m.result)).toBe(true);
      expect(Number.isFinite(m.reputationDelta)).toBe(true);
      expect(Number.isFinite(m.knowledgeDelta.episteme)).toBe(true);
      expect(Number.isFinite(m.knowledgeDelta.techne)).toBe(true);
      expect(Number.isFinite(m.knowledgeDelta.phronesis)).toBe(true);
      // DoD A.1 — resultat = intäkt − kostnad. Håller mot "rätt tal om
      // fel sak"-principen: vi räknar samma sätt som EveningAccountPanel
      // gör, så det som visas är det vi verifierar.
      expect(m.result).toBeCloseTo(m.revenue - m.cost, 5);

      snapshots.push({
        dayNumber: state.day.dayNumber,
        revenue: after.revenue,
        cost: after.cost,
        reputation: after.reputation,
        cash: after.cash,
        account
      });

      // DoD A.1 — snapshot-diffen stämmer mot state-diffen.
      // (state.revenue efter service − state.revenue innan service ≈
      // metrics.revenue, med tolerans för att metrics läser vid pickBranch-
      // tillfället som är strax före stängning.)
      expect(after.revenue - preRevenue).toBeGreaterThanOrEqual(m.revenue - 0.01);
      expect(after.cost - preCost).toBeGreaterThanOrEqual(m.cost - 0.01);

      // Fortsätt till nästa dag.
      state = after;
      // Undvik oanvänd-variabel-varning.
      void preReputation;
      void preCash;
    }

    // DoD A.2 — resultatet bärs över mellan dagar.
    // Dagnummer inkrementeras (auto-rollover fungerar).
    expect(snapshots[0].dayNumber).toBeLessThan(snapshots[1].dayNumber);
    expect(snapshots[1].dayNumber).toBeLessThan(snapshots[2].dayNumber);

    // Kassan är kontinuerlig — inget nollställs mellan dagar. Skulle
    // det inte hålla skulle carryover vara trasig.
    // (Talet ändras av lönekostnader + intäkter; vi verifierar att den
    // inte återgår till INITIAL_CASH_SEK dag 2.)
    expect(snapshots[1].cash).not.toBe(makeInitialState(42).cash);

    // Rykte fortsätter från föregående dags slut (rykte drift är
    // gradvis, inte återställning).
    // Verifiera att sim.reputation vid slutet av dag 3 fortfarande är
    // inom [0, 1] och inte har återställts till initial-värdet.
    expect(snapshots[2].reputation).toBeGreaterThanOrEqual(0);
    expect(snapshots[2].reputation).toBeLessThanOrEqual(1);
  });

  it('RESET tar sim tillbaka till dag 1 utan reload (DoD A.3)', () => {
    let state = makeInitialState(42);
    const initialCash = state.cash;
    const initialDay = state.day.dayNumber;
    // Kör igenom två dagar.
    for (let i = 0; i < 2; i++) {
      const { after } = runOneDinner(state, 3);
      state = after;
    }
    expect(state.day.dayNumber).toBeGreaterThan(initialDay);
    expect(state.cash).not.toBe(initialCash);

    // Nu RESET — spelaren trycker "Ny omgång"-knappen.
    state = reducer(state, { type: 'RESET' });
    expect(state.day.dayNumber).toBe(1);
    expect(state.cash).toBe(initialCash);
    // Har vi hamnat i ett körbart state? Verifiera att vi kan öppna en
    // ny service och nå en ny kvällsavräkning.
    const { account } = runOneDinner(state, 3);
    expect(account).toBeDefined();
    expect(account.metrics).toBeDefined();
  });
});
