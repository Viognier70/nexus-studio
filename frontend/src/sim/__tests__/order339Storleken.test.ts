// ORDER 339 (Anders 2026-10-22: "storleken har följder"): A. kvällens tak växer med lokalens platser; B. hyran följer
// ytan och laget platserna (lönerna och tempot); C. ett halvtomt rum sänker stämningen och syns i kvällens resultat.
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer, emptyRoomTick } from '../../strategic/simulation/reducer';
import { firstDayOfWeek } from '../calendar';
import { EMPTY_ROOM, MARKET, PREMISES_SCALE } from '../balance';
import { premisesAreaK, premisesCapK, premisesSeatsNow, premisesTeamK, premisesWageK, seatRatio } from '../premisesScale';
import { dailyWagesSek, weeklyRentSek } from '../economy';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { makeGuest } from '../../strategic/simulation/model';
import type { PremisesId } from '../districts';
import type { SimulationState } from '../../strategic/types';

function vinbarIn(p: PremisesId, bistro = false): SimulationState {
  const s0 = startInFoodtruck(3, firstDayOfWeek(3) + 1);
  const s = { ...s0, cash: 500000, day: { ...s0.day, period: 'morning' as const }, ladder: { ...s0.ladder!, offer: { to: 'vinbar' as const, depositSek: 50000, loanSek: 0, state: 'offered' as const, offeredOnDay: s0.day.dayNumber } } };
  const t = reducer(s, { type: 'LADDER_TAKE', premises: p });
  return bistro ? { ...t, ladder: { ...t.ladder!, step: 'bistro' } } : t;
}

describe('ORDER 339 — storleken', () => {
  it('Torget räknas som förut: taket, laget och ytan 1', () => {
    for (const b of [false, true]) {
      const t = vinbarIn('torget', b);
      expect([b, premisesCapK(t), premisesTeamK(t), seatRatio(t)]).toEqual([b, 1, 1, 1]);
    }
    expect(premisesAreaK('torget')).toBe(1);
  });

  it('A. kvällens tak växer med lokalens platser mot Torgets, och efterfrågan multiplicerar fortfarande', () => {
    for (const p of ['kallaren', 'salongen', 'glashornet'] as const) {
      const s = vinbarIn(p);
      expect([p, premisesSeatsNow(s), premisesCapK(s)]).toEqual([p, premisesSeatsNow(s), Math.pow(premisesSeatsNow(s)! / PREMISES_SCALE.vinbarSeats, MARKET.premisesSeatExponent)]);
    }
  });

  it('A. samma lokal och kväll: taket med lokalens platser är taket utan dem gånger faktorn', async () => {
    const { vi } = await import('vitest');
    const states = (['kallaren', 'salongen', 'glashornet'] as const).map((p) => [p, vinbarIn(p)] as const);
    // En import med faktorn 1 och en utan, för alla lokaler (varje import av economy tar tid i hela sviten).
    vi.resetModules();
    vi.doMock('../premisesScale', async (orig) => ({ ...(await orig<typeof import('../premisesScale')>()), premisesCapK: () => 1 }));
    const plainCap = (await import('../economy')).dailyGuestCap;
    vi.doUnmock('../premisesScale');
    vi.resetModules();
    const scaledCap = (await import('../economy')).dailyGuestCap;
    for (const [p, s] of states) {
      const k = premisesCapK(s), plain = plainCap(s), scaled = scaledCap(s);
      // Taket räknas med Math.floor; de fasta bokningarna (svar, AW, stamgäster) är 0 här.
      expect([p, Math.abs(scaled - plain * k) <= Math.ceil(k)]).toEqual([p, true]);
      expect([p, scaled > plain]).toEqual([p, true]);
    }
  }, 180000);

  it('B. hyran följer ytan, lönerna laget', () => {
    for (const p of ['kallaren', 'salongen', 'glashornet'] as const) {
      // Hyran avrundas en gång (economy.ts); Torgets avrundade hyra gånger faktorn kan skilja 1 kr.
      expect([p, Math.abs(weeklyRentSek('vinbar', 6, p) - weeklyRentSek('vinbar', 6, 'torget') * premisesAreaK(p) * (p === 'kallaren' ? 0.7 : 1)) <= 1]).toEqual([p, true]);
      const s = vinbarIn(p), t = { ...s, economy: { ...s.economy, premises: 'torget' as const } };
      expect(Math.abs(dailyWagesSek(s) - dailyWagesSek(t) * premisesWageK(s))).toBeLessThan(5);
      expect(premisesTeamK(s)).toBeGreaterThan(1);
    }
    // Den större ytan kostar mer: salongen (295 m²) och Flygeln (270) över Torget (145) och källaren (144).
    expect(premisesAreaK('salongen')).toBeCloseTo(Math.pow(295 / 145, PREMISES_SCALE.areaExponent), 10);
    expect(premisesAreaK('salongen')).toBeGreaterThan(premisesAreaK('glashornet'));
    expect(premisesAreaK('glashornet')).toBeGreaterThan(1);
    expect(premisesAreaK('kallaren')).toBeLessThanOrEqual(1);
  });

  it('faktorerna per lokal och steg (reports/order339/storleken.json med WRITE_REPORTS=1)', () => {
    const rows = (['torget', 'kallaren', 'salongen', 'glashornet'] as const).flatMap((p) => [false, true].map((b) => {
      const s = vinbarIn(p, b);
      return { premises: p, step: b ? 'bistro' : 'vinbar', seats: premisesSeatsNow(s), capK: premisesCapK(s), teamK: premisesTeamK(s), wageK: premisesWageK(s), areaK: premisesAreaK(p), rentSek: weeklyRentSek('vinbar', 6, p) };
    }));
    for (const r of rows) expect(r.seats).toBeGreaterThan(0);
    if (process.env.WRITE_REPORTS === '1') {
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order339');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'storleken.json'), JSON.stringify({ definition: 'ORDER 339 A–B (sim/premisesScale.ts). seats = platserna i rummet (premisesSeatsNow), capK = kvällens tak gånger, teamK = uppgifternas tid och köket delat med, wageK = lönerna gånger, areaK = hyran gånger (alla 1 vid Torget), rentSek = veckohyran för vinbaren vecka 6 (economy.ts weeklyRentSek, källaren med sin rabatt).', rows }, null, 2) + '\n');
    }
  });

  it('C. ett halvtomt rum sänker stämningen efter fromMinute; ett fullt gör det inte', () => {
    const s = vinbarIn('salongen');
    const evening = (seated: number): SimulationState => {
      const guests = Array.from({ length: seated }, (_, i) => ({ ...makeGuest(0), id: `g${i}`, state: 'dining' as const, seatIndex: i }));
      return { ...s, guests, seatedIds: guests.map((g) => g.id), simTime: 0, day: { ...s.day, period: 'dinner', doorsOpenedThisService: true, periodStartAt: -(EMPTY_ROOM.fromMinute - 18 * 60 + 30) * 10, roomMoodLift: 0, emptyRoomMinutes: 0 } } as SimulationState;
    };
    const empty = evening(2), full = evening(30);
    for (let i = 0; i < 300; i++) { emptyRoomTick(empty, 0.5); emptyRoomTick(full, 0.5); }
    expect(empty.day.roomMoodLift).toBeCloseTo(EMPTY_ROOM.floor, 5);
    expect(empty.day.emptyRoomMinutes).toBeGreaterThanOrEqual(EMPTY_ROOM.resultMinutes);
    expect(full.day.roomMoodLift).toBe(0);
  });
});
