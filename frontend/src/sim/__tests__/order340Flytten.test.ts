// ORDER 340 (Anders 2026-10-23: "flytten är ett omdöme"): A. flytten kostar inredning och Torget har förbipasserande;
// B. bistron i källaren har 40 platser vid långborden; C. fler platser ger fler servitörer i rummet; D. det tomma rummet
// sänker mätaren tydligt och gästerna tittar ut över de tomma borden.
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer, emptyRoomTick } from '../../strategic/simulation/reducer';
import { firstDayOfWeek } from '../calendar';
import { EMPTY_ROOM, MOOD_BALANCE, PREMISES_MOVE, PREMISES_SCALE } from '../balance';
import { premisesCapK, premisesExtraServers, premisesSeatsNow } from '../premisesScale';
import { torgetWalkInsTonight } from '../economy';
import { fitOutSek } from '../ladder';
import { isMarketDay } from '../districts';
import { meterFill, roomMoodValue } from '../guestMood';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { makeGuest } from '../../strategic/simulation/model';
import { BISTRO_CELLAR_PLAN, CELLAR_PLAN } from '../../strategic/scene/tablePlans';
import { FLOOR_KEYS, STAFF_KEYS } from '../../strategic/scene/wineBarDirector';
import { EMPTY_LOOK } from '../../strategic/scene/figureLife';
import { morningRows } from '../../strategic/simulation/morningBuy';
import { billAboveVinbarPct } from '../../strategic/business/bistroPrices';
import { LADDER } from '../balance';
import type { PremisesId } from '../districts';
import type { SimulationState } from '../../strategic/types';

function offered(): SimulationState {
  const s0 = startInFoodtruck(3, firstDayOfWeek(3) + 1);
  return { ...s0, cash: 500000, day: { ...s0.day, period: 'morning' as const }, ladder: { ...s0.ladder!, offer: { to: 'vinbar' as const, depositSek: 50000, loanSek: 0, state: 'offered' as const, offeredOnDay: s0.day.dayNumber } } };
}
function vinbarIn(p: PremisesId, bistro = false): SimulationState {
  const t = reducer(offered(), { type: 'LADDER_TAKE', premises: p });
  return bistro ? { ...t, ladder: { ...t.ladder!, step: 'bistro' } } : t;
}

describe('ORDER 340 — flytten är ett omdöme', () => {
  it('A. inredningen läggs på lånet i en annan lokal än Torget; Torget är inrett', () => {
    const base = reducer(offered(), { type: 'LADDER_TAKE', premises: 'torget' });
    expect(fitOutSek('torget')).toBe(0);
    for (const p of ['kallaren', 'salongen', 'glashornet'] as const) {
      const s = vinbarIn(p);
      expect(fitOutSek(p)).toBe(PREMISES_MOVE.fitOutSek[p]);
      expect(fitOutSek(p)).toBeGreaterThan(0);
      if (PREMISES_MOVE.fitOutPayment === 'loan') {
        expect([p, s.economy.loan!.principalSek - base.economy.loan!.principalSek]).toEqual([p, fitOutSek(p)]);
        expect(s.economy.fitOutSek).toBe(fitOutSek(p));
      } else {
        expect([p, base.cash - s.cash]).toEqual([p, fitOutSek(p)]);
      }
    }
  });

  it('A. förbipasserande går in bara vid Torget, och fler på marknadsdagarna', () => {
    const t = vinbarIn('torget');
    expect(torgetWalkInsTonight(t)).toBeGreaterThan(0);
    for (const p of ['kallaren', 'salongen', 'glashornet'] as const) expect([p, torgetWalkInsTonight(vinbarIn(p))]).toEqual([p, 0]);
    expect(torgetWalkInsTonight(startInFoodtruck(3, firstDayOfWeek(3) + 1))).toBe(0);
    // En marknadsdag i säsongen: dubbelt så många som en vanlig dag med samma gästfaktor.
    const market = Array.from({ length: 8 * 7 }, (_, i) => firstDayOfWeek(1) + i).find((d) => isMarketDay(d));
    expect(market).toBeDefined();
    const m = torgetWalkInsTonight({ ...t, day: { ...t.day, dayNumber: market! } });
    expect(m).toBeGreaterThanOrEqual(PREMISES_MOVE.walkIns * PREMISES_MOVE.marketDayK);
  });

  it('B. bistron i källaren: 40 platser vid de fyra långborden, och taket krymper inte under vinbarens', () => {
    expect(BISTRO_CELLAR_PLAN.seats.length).toBe(40);
    expect(BISTRO_CELLAR_PLAN.seats.every((x) => x.furnitureId.startsWith('long'))).toBe(true);
    expect(BISTRO_CELLAR_PLAN.tables.map((t) => t.id)).toEqual(CELLAR_PLAN.tables.map((t) => t.id));
    const vin = vinbarIn('kallaren'), bis = vinbarIn('kallaren', true);
    expect(premisesSeatsNow(bis)).toBe(40);
    expect(premisesCapK(bis)).toBeGreaterThanOrEqual(premisesCapK(vin));
  });

  it('B. bistrons högre nota syns: menyns priser om morgonen och procenten', () => {
    for (const p of ['torget', 'kallaren'] as const) {
      const vin = vinbarIn(p), bis = vinbarIn(p, true);
      expect(billAboveVinbarPct(vin)).toBe(0);
      expect(billAboveVinbarPct(bis)).toBe(Math.round((LADDER.steps.bistro.billFactor / LADDER.steps.vinbar.billFactor - 1) * 100));
      const a = morningRows(vin), b = morningRows(bis);
      expect(a.dishes.length).toBeGreaterThan(0);
      for (const d of a.dishes) {
        const x = b.dishes.find((y) => y.dishId === d.dishId)!;
        expect([p, d.dishId, x.priceSek]).toEqual([p, d.dishId, Math.round(d.priceSek * LADDER.steps.bistro.billFactor)]);
      }
      for (const d of a.drinks) {
        const x = b.drinks.find((y) => y.dishId === d.dishId)!;
        expect([p, d.dishId, x.glassPriceSek]).toEqual([p, d.dishId, Math.round(d.glassPriceSek * LADDER.steps.bistro.billFactor)]);
      }
    }
  });

  it('C. fler platser ger fler servitörer i rummet; Torget som förut', () => {
    expect(premisesExtraServers(vinbarIn('torget'))).toBe(0);
    expect(premisesExtraServers(vinbarIn('torget', true))).toBe(0);
    for (const p of ['kallaren', 'salongen', 'glashornet'] as const) {
      for (const b of [false, true]) {
        const s = vinbarIn(p, b);
        const want = Math.min(PREMISES_SCALE.maxExtraServers, Math.max(0, Math.round((premisesSeatsNow(s)! - (b ? 31 : PREMISES_SCALE.vinbarSeats)) / PREMISES_SCALE.seatsPerExtraServer)));
        expect([p, b, premisesExtraServers(s)]).toEqual([p, b, want]);
      }
    }
    expect(premisesExtraServers(vinbarIn('glashornet', true))).toBe(PREMISES_SCALE.maxExtraServers);
    if (process.env.WRITE_REPORTS === '1') {
      const rows = (['torget', 'kallaren', 'salongen', 'glashornet'] as const).flatMap((p) => [false, true].map((b) => {
        const s = vinbarIn(p, b);
        return { premises: p, step: b ? 'bistro' : 'vinbar', seats: premisesSeatsNow(s), extraServers: premisesExtraServers(s), capK: +premisesCapK(s).toFixed(2) };
      }));
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order340');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'laget.json'), JSON.stringify({ definition: 'ORDER 340 B–C (sim/premisesScale.ts). seats = platserna i rummet, extraServers = servitörerna utöver Torgets i rummet (premisesExtraServers), capK = kvällens tak gånger (bistron aldrig under vinbaren i samma lokal).', rows }, null, 2) + '\n');
    }
    expect(FLOOR_KEYS.length).toBe(PREMISES_SCALE.maxExtraServers);
    for (const k of FLOOR_KEYS) expect(STAFF_KEYS).toContain(k);
  });

  it('D. under 30 % beläggning sjunker mätaren minst ett steg, och stämningen kommer tillbaka när rummet fylls', () => {
    const s = vinbarIn('salongen');
    const guestsOf = (n: number) => Array.from({ length: n }, (_, i) => ({ ...makeGuest(0), id: `g${i}`, partyId: `p${i}`, state: 'dining' as const, seatIndex: i, satisfaction: 0.8 }));
    const evening = (n: number): SimulationState => {
      const guests = guestsOf(n);
      return { ...s, guests, seatedIds: guests.map((g) => g.id), simTime: 0, day: { ...s.day, period: 'dinner', doorsOpenedThisService: true, periodStartAt: -(EMPTY_ROOM.fromMinute - 18 * 60 + 30) * 10, roomMoodLift: 0, emptyRoomLift: 0, emptyRoomMinutes: 0 } } as SimulationState;
    };
    const empty = evening(3);
    const before = meterFill(roomMoodValue(empty));
    for (let i = 0; i < 120; i++) emptyRoomTick(empty, 0.5);
    expect(empty.day.emptyRoomLift).toBeCloseTo(EMPTY_ROOM.floor, 5);
    expect(empty.day.roomMoodLift).toBeCloseTo(EMPTY_ROOM.floor, 5);
    expect(before - meterFill(roomMoodValue(empty))).toBeGreaterThanOrEqual(1);
    expect(EMPTY_ROOM.floor).toBeGreaterThanOrEqual(-MOOD_BALANCE.liftMax);
    // Rummet fylls: det tomma rummets del går tillbaka till 0.
    const refilled = { ...empty, guests: guestsOf(30), seatedIds: guestsOf(30).map((g) => g.id) } as SimulationState;
    for (let i = 0; i < 120; i++) emptyRoomTick(refilled, 0.5);
    expect(refilled.day.emptyRoomLift).toBe(0);
    expect(refilled.day.roomMoodLift).toBeCloseTo(0, 5);
    // Gästerna tittar ut när det tomma rummets del är under lookBelow.
    expect(EMPTY_ROOM.floor).toBeLessThan(EMPTY_ROOM.lookBelow);
    expect(EMPTY_LOOK.lookS).toBeLessThan(EMPTY_LOOK.cycleS);
  });
});
