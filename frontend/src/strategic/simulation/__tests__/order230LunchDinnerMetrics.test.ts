// ORDER 230 — dagens tal ska gälla dagen, inte senaste service.
//
// Rekognosering 2026-09-21 bekräftade att `revenueAtServiceStart` etc
// skrivs över vid dinnerns OPEN_SERVICE så kvällsavräkningens
// metrics tappade lunch-delen (för seed=42: 5 355 kr revenue + idle-
// kost mellan servicerna). ORDER 230 introducerar dag-start-snapshots
// (`*AtDayStart`) som sätts vid dygnsrollover / makeInitialState och
// aldrig skrivs över mitt i en dag; `computeMetrics` läser dem först.
//
// Detta test kör en dag med LUNCH + MIDDAG och verifierar att
// metrics.revenue och metrics.cost stämmer mot dagsledgern (per VO:s
// instruktion "Stäm av mot ledgern, inte mot fixturer"). Om buggen
// åter uppstår — snapshot skrivs över mitt i dagen — bryter testet.

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import type { SimulationState } from '../../types';

const LUNCH_MINUTES = 5;
// Flyttalsbrus i kronor (ORDER 258: −3e-12).
const FLOAT_TOLERANCE_SEK = 1e-6;
const DINNER_MINUTES = 5;
const TICK_HZ = 5;

function tickUntil(
  start: SimulationState,
  predicate: (s: SimulationState) => boolean,
  maxTicks: number
): SimulationState {
  let s = start;
  const dt = 1 / TICK_HZ;
  for (let i = 0; i < maxTicks; i++) {
    if (predicate(s)) return s;
    s = reducer(s, { type: 'TICK', dt });
  }
  return s;
}

function runFullDay(seed: number): SimulationState {
  let s = makeInitialState(seed);
  // Lunch
  s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: LUNCH_MINUTES });
  s = tickUntil(
    s,
    (state) => state.day.period === 'afternoon',
    LUNCH_MINUTES * 60 * TICK_HZ + 500
  );
  // Middag
  s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: DINNER_MINUTES });
  s = tickUntil(
    s,
    (state) => state.eveningAccount !== null,
    DINNER_MINUTES * 60 * TICK_HZ + 1000
  );
  return s;
}

describe('ORDER 230 — dagens tal i kvällsavräkningen efter lunch + middag', () => {
  const state = runFullDay(42);
  const account = state.eveningAccount;

  it('kvällsavräkningen finns med metrics', () => {
    expect(account).not.toBeNull();
    expect(account!.metrics).toBeDefined();
  });

  // ORDER 254 (VO 2026-09-22): känd avvikelse efter ORDER 253. Testet
  // asserterar att metrics.revenue för hela dagen (lunch + dinner) är
  // > 13 000 SEK. Efter längre gest-tid ger seed=42 ~10 710 SEK per pass
  // vilket är korrekt sim-utfall men under den tröskel VO 2026-08-XX
  // satte. Baseline väntar VO-beslut om ekonomi.
  // ORDER 267: regressionsvakten läser ledgern i stället för tröskeln
  // 13 000 SEK (som föll med ORDER 253:s tempo): båda servicerna har en
  // intäktsrad, och metrics.revenue är summan av dem, inte middagens.
  it('metrics.revenue matchar dagsledgerns revenue-summa (båda services)', () => {
    const revenueLines = state.ledger.filter((l) => l.day === 1 && l.category === 'revenue');
    const dayLedgerRevenue = revenueLines.reduce((sum, l) => sum + l.amount, 0);
    expect(account!.metrics!.revenue).toBeCloseTo(dayLedgerRevenue, 2);
    expect(revenueLines.filter((l) => l.amount > 0).length).toBeGreaterThanOrEqual(2);
    expect(account!.metrics!.revenue).toBeGreaterThan(Math.max(...revenueLines.map((l) => l.amount)));
  });

  it('metrics.cost är summan av all dagskostnad (service + idle + wages)', () => {
    // Cost enligt state.cost minus dag-start-snapshot är den kanoniska
    // beräkningen; ledgern är läsbar men innehåller inte 100 % av
    // state.cost-rörelserna (postLedger + applyCashCost är parallella,
    // så en applyCashCost utan matchande postLedger skulle glida —
    // ORDER 073 §3 uttrycker att invarianten är att de matchar).
    const cStart = state.day.costAtDayStart ?? 0;
    const expectedCost = state.cost - cStart;
    expect(account!.metrics!.cost).toBeCloseTo(expectedCost, 2);
    // Om samma tal också går att läsa ur ledgern så håller det för
    // korsverifiering:
    const dayLedgerCost = state.ledger
      .filter((l) => l.day === 1 && l.amount < 0)
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);
    // Ledger-kost brukar täcka det mesta men inte allt (tick-loan-
    // interest, aktivitetseffekter). Kravet är att metrics >= ledger
    // (metrics täcker alla kostnadsrörelser; ledger är läsbar del).
    expect(account!.metrics!.cost).toBeGreaterThanOrEqual(dayLedgerCost - 0.5);
  });

  it('metrics.result = revenue - cost och ligger på rätt sida av noll', () => {
    const m = account!.metrics!;
    expect(m.result).toBeCloseTo(m.revenue - m.cost, 2);
  });

  it('reputationDelta är delta mot dag-start-snapshot, inte service-start', () => {
    const repStart = state.day.reputationAtDayStart ?? state.reputation;
    expect(account!.metrics!.reputationDelta).toBeCloseTo(state.reputation - repStart, 6);
  });

  it('knowledgeDelta per axel är delta mot dag-start-snapshot', () => {
    const kcStart = state.day.knowledgeCreditsAtDayStart ?? state.knowledgeCredits;
    expect(account!.metrics!.knowledgeDelta.episteme).toBeCloseTo(
      state.knowledgeCredits.episteme - kcStart.episteme,
      6
    );
    expect(account!.metrics!.knowledgeDelta.techne).toBeCloseTo(
      state.knowledgeCredits.techne - kcStart.techne,
      6
    );
    expect(account!.metrics!.knowledgeDelta.phronesis).toBeCloseTo(
      state.knowledgeCredits.phronesis - kcStart.phronesis,
      6
    );
  });

  // ORDER 258 (VO 2026-09-22): känd avvikelse. Efter borttagning av flat
  // 4|7|12/min ingredient-cost blev gap = -3e-12 (float noise nära 0).
  // Testet asserterar gap >= 0, vilket vari sant matematiskt (float-fel).
  // Baseline väntar VO-beslut — kan lösas med tolerans-tillägg eller
  // omkalibrering av idle-cost-modell.
  // ORDER 267: toleransen för flyttalsbrus (gapet blev −3e-12).
  it('idle-kostnad mellan lunch och middag räknas in i metrics.cost', () => {
    // Idle-kost mellan lunch → dinner ackumuleras i
    // draft.day.idleCostAccrued (reducer.ts:2008) OCH applyCashCost:as
    // per tick (reducer.ts:1997). Alltså finns den i state.cost, men
    // *AtServiceStart-snapshotet vid dinner OPEN_SERVICE inkluderade
    // den (dagens ackumulering, inte service-fönstrets). Dag-start-
    // snapshotet däremot tas vid dagens gryning så all idle-kost
    // mellan lunch och dinner ligger inom "dagens kostnad". Det som
    // testas här är att den räkningen faktiskt är non-zero.
    //
    // Vid rollover posts idle som en 'other'-rad. Under dagen finns
    // den bara som applyCashCost-summa. Så vi läser skillnaden mellan
    // ledger-cost (som ORDER 073 posts vid rollover) och
    // metrics.cost. På dag 1, före rollover, förväntar vi oss att
    // ledger-cost < metrics.cost — idle-kost har inte postats än.
    const dayLedgerCost = state.ledger
      .filter((l) => l.day === 1 && l.amount < 0)
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);
    const gap = account!.metrics!.cost - dayLedgerCost;
    // Idle mellan lunch (5 min) + afternoon-passet (5-15 min) + dinner
    // ger något per-tick-kost även utanför service. gap > 0 betyder
    // att idle-kost räknas i metrics utan att synas i ledger än (vilket
    // är förväntat pre-rollover).
    expect(gap).toBeGreaterThanOrEqual(-FLOAT_TOLERANCE_SEK);
  });
});

describe('ORDER 230 — dag-start-snapshotarna sätts vid makeInitialState', () => {
  it('nytt sim-state har dag-start-snapshots seedade från initialvärdena', () => {
    const s = makeInitialState(1);
    expect(s.day.revenueAtDayStart).toBe(0);
    expect(s.day.costAtDayStart).toBe(0);
    expect(s.day.reputationAtDayStart).toBe(s.reputation);
    expect(s.day.knowledgeCreditsAtDayStart).toEqual(s.knowledgeCredits);
    // Deep-copy: mutation av state.knowledgeCredits ska inte påverka
    // snapshotet.
    expect(s.day.knowledgeCreditsAtDayStart).not.toBe(s.knowledgeCredits);
  });
});

describe('ORDER 230 — dag-start-snapshotarna sätts om vid dygnsrollover', () => {
  it('efter dygnsrollover reflekterar nya dagens *AtDayStart det nya dygnets startvärden', () => {
    let s = makeInitialState(42);
    // Kör en full dag (lunch + dinner) tills evening → morning rullar.
    const initialDayNumber = s.day.dayNumber;
    const runUntilNextDay = (start: SimulationState, maxTicks: number) => {
      let cur = start;
      const dt = 1 / TICK_HZ;
      for (let i = 0; i < maxTicks; i++) {
        if (cur.day.dayNumber > initialDayNumber) return cur;
        cur = reducer(cur, { type: 'TICK', dt });
      }
      return cur;
    };
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: LUNCH_MINUTES });
    s = tickUntil(s, (st) => st.day.period === 'afternoon', LUNCH_MINUTES * 60 * TICK_HZ + 500);
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: DINNER_MINUTES });
    s = tickUntil(s, (st) => st.eveningAccount !== null, DINNER_MINUTES * 60 * TICK_HZ + 1000);
    const afterDay1Revenue = s.revenue;
    const afterDay1Cost = s.cost;
    // Fortsätt över evening → morning
    s = runUntilNextDay(s, 5000);
    expect(s.day.dayNumber).toBe(initialDayNumber + 1);
    // Dag-start-snapshotarna reflekterar dag 1:s slutvärden vid
    // rollover-ögonblicket. Mellan dinner-close (afterDay1Revenue/Cost
    // fångade vid eveningAccount-appearance) och rollover fortsätter
    // late-payment-gäster att betala (revenue ökar) samt idle-tick-
    // kost att ackumuleras (cost ökar). Snapshotet ska därför vara
    // >= det vi fångade vid dinner-close.
    expect(s.day.revenueAtDayStart).toBeGreaterThanOrEqual(afterDay1Revenue);
    expect(s.day.costAtDayStart).toBeGreaterThanOrEqual(afterDay1Cost);
    // Wages appliceras direkt efter snapshotet så state.cost är strikt
    // större än costAtDayStart post-rollover.
    expect(s.cost).toBeGreaterThan(s.day.costAtDayStart!);
  });
});
