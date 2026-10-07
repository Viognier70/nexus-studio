// ORDER 315b (Anders 2026-10-07, BESLUT del 2; förslaget ORDER_315_FORSLAG.md
// §2) — foodtrucken som första steg: inträdet, foodtruckens ekonomi (notan,
// varorna, medhjälparen, platsens avgift, inget lån), kön och vagnen vid Torget.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../../strategic/simulation/reducer';
import { startInFoodtruck, tickUntil, playMorning } from '../../strategic/testHarness/weekHarness';
import { dailyGuestCap, dailyWagesSek, paidMembers, weeklyRentSek } from '../economy';
import { ECONOMY, FOODTRUCK, RISK } from '../balance';
import { PLAYER_TRUCK_SPOT, PLAYER_VENUE, venuesTonight } from '../village';
import { BUSINESS_CLASS_CONFIG } from '../../strategic/business/businessClass';
import { firstDayOfWeek } from '../calendar';
import { ROLE_DEFAULTS } from '../../strategic/simulation/team';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('ORDER 315b — foodtrucken', () => {
  it('startar från inträdet med spelets startkassa, utan lån, med spelaren vid grillen och en medhjälpare', () => {
    const s = startInFoodtruck(3, firstDayOfWeek(1));
    expect(s.economy.businessClass).toBe('foodtruck');
    expect(s.economy.loan).toBeNull();
    expect(s.cash).toBe(RISK.startCashSek);
    expect(s.team.members.map((m) => m.role).sort()).toEqual(['kock', 'lärling']);
    // Kocken är spelaren: ingen lön. Medhjälparen har lärlingens dagslön.
    expect(paidMembers(s).map((m) => m.role)).toEqual(['lärling']);
    expect(dailyWagesSek(s)).toBe(ROLE_DEFAULTS.lärling.dailyCost);
  });

  it('platsen vid Torget kostar avgiften i veckan i stället för hyra, också de första veckorna', () => {
    expect(weeklyRentSek('foodtruck', 1)).toBe(FOODTRUCK.pitchFeeWeeklySek);
    expect(weeklyRentSek('foodtruck', 6)).toBe(FOODTRUCK.pitchFeeWeeklySek);
    expect(ECONOMY.normalWeeklyRevenueSek.foodtruck).toBe(40000);
  });

  it('dagens tak gånger guestCapFactor (förbipasserande), och kön vid luckan', () => {
    const s = playMorning(startInFoodtruck(3, firstDayOfWeek(2)), {});
    const asVinbar = { ...s, economy: { ...s.economy, businessClass: 'vinbar' as const } };
    expect(dailyGuestCap(s)).toBeGreaterThanOrEqual(Math.floor(dailyGuestCap(asVinbar) * FOODTRUCK.guestCapFactor) - FOODTRUCK.guestCapFactor);
    expect(BUSINESS_CLASS_CONFIG.foodtrucken.capacityFor(2)).toBe(2 * FOODTRUCK.queuePerStaff);
  });

  it('en kväll: notan är foodtruckens och varorna en andel av den', () => {
    let s = playMorning(startInFoodtruck(4, firstDayOfWeek(2)), {});
    s = reducer(s, { type: 'START_SERVICE' });
    const before = s;
    s = tickUntil(s, (x) => x.day.period === 'evening');
    const revenue = s.revenue - before.revenue;
    const bills = s.day.billsTonight ?? 0;
    expect(bills).toBeGreaterThan(10);
    // Plånboken ger notan gånger 0,8–3 (GUEST_TYPES.legacyBillFactor), i snitt nära 1.
    expect(revenue / bills).toBeGreaterThan(FOODTRUCK.billSek * 0.8);
    expect(revenue / bills).toBeLessThan(FOODTRUCK.billSek * 1.6);
    const goods = s.ledger.slice(before.ledger.length).filter((l) => l.category === 'ingredient').reduce((a, l) => a - l.amount, 0);
    expect(goods / revenue).toBeGreaterThan(FOODTRUCK.goodsShare - 0.03);
    expect(goods / revenue).toBeLessThan(FOODTRUCK.goodsShare + 0.08);
    // Gästerna vid luckan räknas som kvällens gäster (byn och bandet).
    expect(s.day.seatedTonight ?? 0).toBeGreaterThanOrEqual(bills);
    expect(s.day.contentTonight ?? 0).toBeGreaterThan(0);
  });

  it('vagnen står vid Torget; vinbarens hus är inte spelarens', () => {
    const s = startInFoodtruck(3, firstDayOfWeek(2));
    const player = venuesTonight(s).find((v) => v.id === PLAYER_VENUE)!;
    expect(player.spot).toBe(PLAYER_TRUCK_SPOT);
    expect(PLAYER_TRUCK_SPOT).toBe('torget');
    const venues = readFileSync(resolve(SRC, 'strategic/scene/village/VillageVenues.tsx'), 'utf8');
    expect(venues).toContain("o.kind === 'player' && !!o.spot");
    expect(venues).toContain('!!v?.open && !v?.spot');
  });

  // ORDER 315b del 3 (Anders 2026-10-07) — krogens nivå är 3D nära den egna vagnen, inte 2D-scenen.
  it('krogens nivå: kameran går nära den egna vagnen i 3D, inte den gamla 2D-scenen', () => {
    const app = readFileSync(resolve(SRC, 'strategic/StrategicApp.tsx'), 'utf8');
    expect(app).not.toContain('data-testid="truck-room"');
    const crew = readFileSync(resolve(SRC, 'strategic/scene/village/PlayerTruckCrew.tsx'), 'utf8');
    // ORDER 319a.1 — kameran räknas i truckCamera.ts (samma tal i testet av gästerna).
    expect(crew).toContain('setMyBusinessOverride(truckCameraState(at))');
    const cam = readFileSync(resolve(SRC, 'strategic/scene/village/truckCamera.ts'), 'utf8');
    expect(cam).toMatch(/distanceM: 12/);
    expect(crew).toContain("'truck.grill'");
    expect(crew).toContain("'truck.hatchServe'");
    expect(crew).toContain("'truck.wipeCounter'");
  });
});
