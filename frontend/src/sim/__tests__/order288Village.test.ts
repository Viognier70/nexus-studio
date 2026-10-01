// ORDER 288 — byn och konkurrensen: rivalerna delar byns gäster med
// spelaren, vagnarna byter plats, bussen väljer krog efter rykte, och en
// rival kan styras av en människa genom samma gränssnitt.

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import { firstDayOfWeek, calendarFor } from '../calendar';
import { VILLAGE } from '../balance';
import { dailyGuestCap, marketShareCap, playerShareTonight } from '../economy';
import {
  busTonight, initialVillage, PLAYER_VENUE, playerChoiceShare, poolArrivals, settleVillage, starsFor,
  venuesTonight, villageEvening, villageOf, villagePool
} from '../village';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { playMorning } from '../../strategic/testHarness/weekHarness';
import type { SimulationState } from '../../strategic/types';

function at(seed: number, weekday: string, week = 2): SimulationState {
  const s = makeNewGameState(seed);
  const offset = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(weekday);
  return { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(week) + offset } };
}

describe('ORDER 288 — rivalerna', () => {
  it('fyra krogar och två vagnar med eget namn, mat, pris, rykte och stjärnor', () => {
    const v = venuesTonight(at(1, 'fri'));
    expect(v[0].id).toBe(PLAYER_VENUE);
    const ids = v.slice(1).map((x) => x.id);
    expect(ids).toEqual(['torgkrogen', 'pizzeria-grytan', 'sjoboden', 'hotellets-matsal', 'grillvagnen', 'tacovagnen']);
    for (const r of v.slice(1)) {
      expect(r.billSek).toBeGreaterThan(0);
      expect(r.stars).toBeGreaterThanOrEqual(VILLAGE.stars.min);
      expect(r.stars).toBeLessThanOrEqual(VILLAGE.stars.max);
    }
    expect(new Set(v.slice(1).map((x) => x.billSek)).size).toBeGreaterThan(3);
  });

  it('spelarens andel har kunskapens tak, och rivalerna tar gäster när ryktet är lågt', () => {
    // Två stjärnor (ryktet 0,3): rivalerna tar gäster en fredag.
    const base = at(1, 'fri');
    const s = { ...base, day: { ...base.day, reputationAtDayStart: 0.3 } };
    expect(playerShareTonight(s)).toBeLessThanOrEqual(marketShareCap(s.medals));
    expect(playerShareTonight(s)).toBeCloseTo(Math.min(marketShareCap(s.medals), playerChoiceShare(s)));
    expect(playerChoiceShare(s)).toBeLessThan(marketShareCap(s.medals));
    // Högre rykte ger större andel.
    const better = { ...s, day: { ...s.day, reputationAtDayStart: 0.9 } };
    expect(playerChoiceShare(better)).toBeGreaterThan(playerChoiceShare(s));
    // En stängd rival lämnar gäster till de andra.
    const quiet = reducer(s, { type: 'SET_RIVAL_CONTROL', rivalId: 'torgkrogen', control: 'human' });
    expect(playerChoiceShare(quiet)).toBeGreaterThan(playerChoiceShare(s));
  });

  it('vagnarna står på olika platser olika kvällar, bland paket 2:s tre platser', () => {
    const spots = ['tue', 'wed', 'thu', 'fri', 'sat'].map((d) => venuesTonight(at(1, d)).find((v) => v.id === 'grillvagnen')!.spot);
    for (const sp of spots) expect(VILLAGE.truckSpots).toContain(sp);
    expect(new Set(spots).size).toBeGreaterThan(1);
  });

  it('kvällens utfall: alla krogar, rivalerna inom sin kapacitet, poolen räcker', () => {
    const s = at(2, 'sat');
    const rows = villageEvening(s, { guests: 30, revenueSek: 7000, typeGuests: { student: 5, middle: 18, high: 7 } });
    expect(rows[0]).toMatchObject({ id: PLAYER_VENUE, guests: 30, revenueSek: 7000 });
    const total = rows.reduce((a, r) => a + r.guests - r.bus, 0);
    expect(total).toBeLessThanOrEqual(Math.ceil(villagePool(s.day.dayNumber)) + rows.length);
    for (const r of rows.slice(1)) {
      const def = VILLAGE.rivals.find((x) => x.id === r.id)!;
      const cap = def.kind === 'truck' ? VILLAGE.truckGuestsPerEvening : Math.round(def.seats * def.turns);
      expect(r.guests - r.bus).toBeLessThanOrEqual(cap);
      if (r.open) expect(r.revenueSek).toBeGreaterThanOrEqual(0);
    }
    expect(rows.find((r) => r.id === 'sjoboden')!.open).toBe(true);
    const mon = villageEvening(at(2, 'mon'), { guests: 20, revenueSek: 4000, typeGuests: { middle: 20 } });
    expect(mon.find((r) => r.id === 'sjoboden')).toMatchObject({ open: false, guests: 0 });
  });

  it('ryktet rör sig efter kvällen, och samma frö ger samma by', () => {
    const s = at(3, 'fri');
    const rows = villageEvening(s, { guests: 30, revenueSek: 7000, typeGuests: { middle: 30 } });
    const next = settleVillage(s, rows);
    expect(next.rivals.map((r) => r.reputation)).not.toEqual(initialVillage().rivals.map((r) => r.reputation));
    expect(villageEvening(s, { guests: 30, revenueSek: 7000, typeGuests: { middle: 30 } })).toEqual(rows);
  });
});

describe('ORDER 288 — rivalen som gränssnitt', () => {
  it('en människas rival följer planen hon satt, och marknaden dömer den som datorns', () => {
    let s = at(1, 'thu');
    s = reducer(s, { type: 'SET_RIVAL_CONTROL', rivalId: 'sjoboden', control: 'human' });
    expect(villageOf(s).rivals.find((r) => r.id === 'sjoboden')!.control).toBe('human');
    // Utan plan: stängt.
    expect(venuesTonight(s).find((v) => v.id === 'sjoboden')!.open).toBe(false);
    s = reducer(s, { type: 'SET_RIVAL_PLAN', rivalId: 'sjoboden', plan: { open: true, billSek: 290, spot: null } });
    const v = venuesTonight(s).find((x) => x.id === 'sjoboden')!;
    expect(v).toMatchObject({ open: true, billSek: 290, control: 'human' });
    const rows = villageEvening(s, { guests: 25, revenueSek: 5000, typeGuests: { middle: 25 } });
    expect(rows.find((r) => r.id === 'sjoboden')!.guests).toBeGreaterThan(0);
    const settled = settleVillage(s, rows).rivals.find((r) => r.id === 'sjoboden')!;
    expect(settled.control).toBe('human');
    expect(settled.plan).toMatchObject({ billSek: 290 });
  });
});

describe('ORDER 288 — bussen', () => {
  it('kommer fredag och lördag, väljer en krog efter stjärnorna, aldrig en vagn', () => {
    expect(busTonight(at(1, 'mon'))).toBeNull();
    const picks = new Map<string, number>();
    for (let seed = 1; seed <= 60; seed++) {
      for (const d of ['fri', 'sat']) {
        const b = busTonight(at(seed, d))!;
        expect(b.tourists).toBe(VILLAGE.bus.tourists);
        picks.set(b.venueId, (picks.get(b.venueId) ?? 0) + 1);
      }
    }
    expect(picks.has('grillvagnen') || picks.has('tacovagnen')).toBe(false);
    // Hotellet (flest stjärnor) väljs oftare än pizzerian (en stjärna).
    expect(picks.get('hotellets-matsal') ?? 0).toBeGreaterThan(picks.get('pizzeria-grytan') ?? 0);
    expect(starsFor(VILLAGE.rivals.find((r) => r.id === 'hotellets-matsal')!.reputation)).toBe(4);
  });

  it('aviseringen kommer före bussen, och turisterna kommer utöver byns pool', () => {
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed++) {
      const s0 = at(seed, 'fri');
      const bus = busTonight(s0);
      if (!bus || bus.venueId !== PLAYER_VENUE) continue;
      found = true;
      let s = reducer(playMorning(s0, {}), { type: 'START_SERVICE' });
      let announcedAt: number | null = null;
      let choseAt: number | null = null;
      for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
        s = reducer(s, { type: 'TICK', dt: 0.2 });
        if (announcedAt === null && s.day.villageNotice?.kind === 'busAnnounce') announcedAt = s.simTime;
        if (choseAt === null && s.day.villageNotice?.kind === 'busChose') choseAt = s.simTime;
      }
      expect(announcedAt).not.toBeNull();
      expect(choseAt).not.toBeNull();
      expect(choseAt!).toBeGreaterThan(announcedAt!);
      expect(s.day.touristsToday).toBe(VILLAGE.bus.tourists);
      expect(poolArrivals(s.day)).toBeLessThanOrEqual(dailyGuestCap(s0));
      expect(s.eventStream.some((e) => e.kind === 'village_bus')).toBe(true);
    }
    expect(found).toBe(true);
  });
});

describe('ORDER 288 — kvällen i veckans lista', () => {
  it('kvällens rad bär byns utfall, och rivalernas rykte sparas', () => {
    let s = playMorning(at(4, 'wed'), {});
    s = reducer(s, { type: 'START_SERVICE' });
    for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const rec = s.economy.weekEvenings!.at(-1)!;
    expect(rec.village?.length).toBe(1 + VILLAGE.rivals.length);
    expect(rec.village![0].guests).toBe(rec.guests);
    expect(s.competition?.rivals.length).toBe(VILLAGE.rivals.length);
    expect(calendarFor(rec.dayNumber).weekday).toBe('wed');
  });
});
