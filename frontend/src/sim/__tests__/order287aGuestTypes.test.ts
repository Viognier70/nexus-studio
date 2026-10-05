// ORDER 287a — gästerna med kapital (Vision Owner 2026-09-29 och
// 2026-09-30). Speldesign > Servicen > Gästerna.
//
// Proven läser samma källor som spelet: bokningsboken (guestTypes.ts
// bookingFor, som morgonen visar och servicen låser), gästernas typ i
// simuleringen, plånboken (guestOrders.ts profileFor), marknadens tak
// (economy.ts dailyGuestCap), kvällens post till tidningen (recordEvening),
// tidningen (newspaper.ts) och regissörens sittklipp (wineBarDirector.ts).
//
// Med WRITE_REPORTS=1 skrivs reports/<REPORT_ORDER>/guest-types.json: vecka
// 2 i vinbaren för den rimliga spelaren, gäster och intäkt per typ och kväll,
// gästen med socialt kapital och miljardären.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek, calendarFor } from '../calendar';
import { BILLIONAIRE, GUESTS, GUEST_TYPES, SOCIAL_GUEST, SUSTAINABILITY_LEVELS, WEEK } from '../balance';
import { dailyGuestCap } from '../economy';
import { newspaperFor } from '../newspaper';
import { assignGuestTypes, billionaireTreat, bookingFor, buzzFactor, settleSocialGuest, stayFactor, typeShares } from '../../strategic/simulation/guestTypes';
import { profileFor } from '../../strategic/simulation/guestOrders';
import { makeGuest } from '../../strategic/simulation/model';
import type { Guest, GuestType, SimulationState } from '../../strategic/types';
import { stocked } from '../../strategic/testHarness/stocked';
import { createWineBarRoom, walkPathToSeat, exitPathFromSeat, type WineBarRoom } from '../../strategic/scene/wineBarRoom';
import { groupsFor } from '../../strategic/scene/serviceFlow';
import { WineBarDirector, type GuestInput } from '../../strategic/scene/wineBarDirector';
import { SEATED_HIP_Y } from '../../strategic/scene/WineBarFigures';
import { clipSeconds, SEAT_KINDS, seatKindFromRoom } from '../../strategic/scene/figureClips';

const SEED = 4242;

function week2(seed = SEED): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, medals: { ...s.medals, stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
}

function atDay(s: SimulationState, weekday: string): SimulationState {
  const first = firstDayOfWeek(2);
  const offset = WEEK.weekdays.indexOf(weekday as never);
  return { ...s, day: { ...s.day, dayNumber: first + offset } };
}

describe('ORDER 287a — bokningsboken', () => {
  it('räknas ur marknadens tak: typerna efter andelarna, gästen med socialt kapital och de utan bokning', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = atDay(week2(seed), 'fri');
      const b = bookingFor(s);
      const cap = dailyGuestCap(s);
      expect(b.total).toBe(cap);
      const booked = b.counts.student + b.counts.middle + b.counts.high + (b.social ? 1 : 0);
      expect(booked + b.walkIns).toBe(cap);
      expect(b.walkIns).toBe(cap - Math.round(cap * (1 - GUEST_TYPES.walkInShare)));
      const shares = typeShares(s);
      expect(b.counts.student).toBe(Math.round(Math.round(cap * (1 - GUEST_TYPES.walkInShare)) * shares.student));
      // Samma bok varje gång den läses (morgonen och öppningen).
      expect(bookingFor(s)).toEqual(b);
    }
  });

  it('gästen med socialt kapital har bokat ungefär varannan kväll, miljardären bara fredag och lördag', () => {
    let social = 0;
    let n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
        const b = bookingFor(atDay(week2(seed), d));
        n++;
        if (b.social) social++;
        expect(b.billionaireInTown).toBe(BILLIONAIRE.inTown.includes(d as never));
        if (!b.billionaireInTown) expect(b.billionaire).toBe(false);
      }
    }
    expect(Math.abs(social / n - SOCIAL_GUEST.chancePerEvening)).toBeLessThan(0.05);
    // Söndagen är stängd: ingen bok.
    expect(bookingFor(atDay(week2(), 'sun')).total).toBe(0);
  });

  it('miljardären väljer spelarens krog oftare med högre rykte', () => {
    const share = (rep: number) => {
      let hit = 0;
      for (let seed = 1; seed <= 400; seed++) if (bookingFor({ ...atDay(week2(seed), 'sat'), reputation: rep }).billionaire) hit++;
      return hit / 400;
    };
    const low = share(0.1);
    const high = share(0.9);
    expect(high).toBeGreaterThan(low);
    expect(Math.abs(low - (BILLIONAIRE.chooseBase + BILLIONAIRE.chooseByReputation * 0.1))).toBeLessThan(0.06);
    expect(Math.abs(high - (BILLIONAIRE.chooseBase + BILLIONAIRE.chooseByReputation * 0.9))).toBeLessThan(0.06);
  });
});

describe('ORDER 287a — gästernas typ, plånbok och sittid', () => {
  it('varje typ har sin plånbok; studenten sitter längre; höginkomsttagaren förväntar sig mer', () => {
    const types: GuestType[] = ['student', 'middle', 'high', 'social', 'billionaire'];
    for (const t of types) {
      expect(profileFor(SEED, { id: 'g1', partyId: undefined, guestType: t }).wallet).toBe(GUEST_TYPES.wallet[t]);
      expect(stayFactor({ guestType: t })).toBe(GUEST_TYPES.stayFactor[t]);
    }
    expect(GUESTS.walletSek[GUEST_TYPES.wallet.student]).toBeLessThan(GUESTS.walletSek[GUEST_TYPES.wallet.middle]);
    expect(GUESTS.walletSek[GUEST_TYPES.wallet.middle]).toBeLessThan(GUESTS.walletSek[GUEST_TYPES.wallet.high]);
    expect(GUESTS.walletSek[GUEST_TYPES.wallet.high]).toBeLessThan(GUESTS.walletSek[GUEST_TYPES.wallet.billionaire]);
    expect(GUEST_TYPES.stayFactor.student).toBeGreaterThan(1);
    expect(GUEST_TYPES.satisfactionOffset.high).toBeLessThan(0);
    // En gäst utan typ (äldre fixturer) har plånboken ur fröet som förut.
    expect(['tight', 'normal', 'generous']).toContain(profileFor(SEED, { id: 'g1', partyId: undefined }).wallet);
  });

  it('gästerna som kommer får typ ur bokningen, från den tid typen brukar komma', () => {
    const s0 = stocked(atDay(week2(), 'fri'));
    let s = reducer(s0, { type: 'START_SERVICE' });
    expect(s.day.booking?.dayNumber).toBe(s.day.dayNumber);
    const booking = s.day.booking!;
    const firstType = new Map<string, GuestType>();
    for (let i = 0; i < 4000 && s.day.period === 'dinner'; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      for (const g of s.guests) if (g.guestType && !firstType.has(g.id)) firstType.set(g.id, g.guestType);
    }
    const arrived = s.day.guestTypeArrivals ?? {};
    const total = Object.values(arrived).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBeGreaterThan(20);
    // Typen byts aldrig för en gäst.
    for (const g of s.guests) if (g.guestType) expect(g.guestType).toBe(firstType.get(g.id));
    // Gästerna utan bokning får typ efter andelarna; de bokade följer boken.
    expect(arrived.student ?? 0).toBeGreaterThan(0);
    expect(arrived.middle ?? 0).toBeGreaterThan(0);
    // ORDER 307 — i vinbaren (koncept) kommer de betalningsstarka som gourmeter och affärsfolk.
    expect((arrived.high ?? 0) + (arrived.gourmet ?? 0) + (arrived.business ?? 0)).toBeGreaterThan(0);
    if (booking.social) expect(arrived.social ?? 0).toBeLessThanOrEqual(1);
    expect(arrived.billionaire ?? 0).toBeLessThanOrEqual(1);
    // Intäkten per typ är kvällens intäkt.
    const rev = Object.values(s.day.guestTypeRevenue ?? {}).reduce((a, b) => a + (b ?? 0), 0);
    expect(rev).toBeGreaterThan(0);
  });

  it('före 18.30 kommer bara studenter ur boken', () => {
    const s0 = stocked(atDay(week2(), 'fri'));
    let s = reducer(s0, { type: 'START_SERVICE' });
    const early: GuestType[] = [];
    for (let i = 0; i < 4000 && s.day.period === 'dinner'; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const min = (s.simTime - s.day.periodStartAt) * (5 * 60) / (10 * 60);
      if (min >= GUEST_TYPES.arrivesAfterMinutes.middle) break;
      for (const g of s.guests) if (g.guestType && !g.walkAwayOnArrival && !g.scenarioSource && !early.includes(g.guestType)) early.push(g.guestType);
    }
    expect(early.every((t) => t === 'student')).toBe(true);
  });
});

function roomWith(guests: Partial<Guest>[], s0: SimulationState): SimulationState {
  const s: SimulationState = { ...s0, guests: guests.map((g, i) => ({ ...makeGuest(s0.simTime, false, false), id: `g${i}`, ...g }) as Guest) };
  return s;
}

describe('ORDER 287a — gästen med socialt kapital sprider ryktet', () => {
  it('nöjd: fler gäster de närmaste kvällarna; missnöjd: färre', () => {
    const base = atDay(week2(), 'tue');
    const capToday = dailyGuestCap(base);
    for (const [sat, sign] of [[0.9, 1], [0.3, -1]] as const) {
      const s = roomWith([{ state: 'paying', satisfaction: sat, guestType: 'social' }], base);
      s.day = { ...s.day, socialGuest: { guestId: 'g0', outcome: null } };
      settleSocialGuest(s, s.guests[0], false);
      expect(s.day.socialGuest?.outcome).toBe(sign > 0 ? 'good' : 'bad');
      // I dag oförändrat; de närmaste servicekvällarna ändras.
      expect(dailyGuestCap(s)).toBe(capToday);
      let d = s.day.dayNumber;
      let found = 0;
      while (found < SOCIAL_GUEST.buzzEvenings) {
        d++;
        if (!calendarFor(d).isServiceDay) continue;
        found++;
        const next = { ...s, day: { ...s.day, dayNumber: d } };
        expect(buzzFactor(next)).toBeCloseTo(1 + (sign > 0 ? SOCIAL_GUEST.buzzGood : SOCIAL_GUEST.buzzBad));
        const plain = { ...base, day: { ...base.day, dayNumber: d } };
        expect(Math.sign(dailyGuestCap(next) - dailyGuestCap(plain))).toBe(sign);
      }
      // Kvällen efter det: tillbaka.
      expect(buzzFactor({ ...s, day: { ...s.day, dayNumber: d + 1 + (calendarFor(d + 1).isServiceDay ? 0 : 1) } })).toBe(1);
    }
  });

  it('en gäst med socialt kapital som ger upp i kön räknas som missnöjd', () => {
    const s = roomWith([{ state: 'leaving', satisfaction: 0.9, guestType: 'social' }], atDay(week2(), 'tue'));
    s.day = { ...s.day, socialGuest: { guestId: 'g0', outcome: null } };
    settleSocialGuest(s, s.guests[0], true);
    expect(s.day.socialGuest?.outcome).toBe('bad');
  });
});

describe('ORDER 287a — miljardären', () => {
  it('bjuder salen på champagne ur det dyraste vinet: ett glas per gäst, notan växer och gästerna blir nöjdare', () => {
    // Leta upp ett frö där han bjuder (treatChance).
    let s: SimulationState | null = null;
    for (let seed = 1; seed < 200 && !s; seed++) {
      const c = stocked(atDay(week2(seed), 'sat'));
      const opened = reducer(c, { type: 'START_SERVICE' });
      const room = roomWith([
        { state: 'dining', guestType: 'billionaire' },
        ...Array.from({ length: 7 }, () => ({ state: 'dining' as const, satisfaction: 0.6 }))
      ], opened);
      room.day = { ...room.day, billionaireVisit: { guestId: 'g0', billSek: 0, treated: false, glasses: 0 } };
      const before = JSON.stringify(room.day.platesRemaining);
      const extra = billionaireTreat(room, room.guests[0]);
      if (extra > 0) {
        s = room;
        expect(JSON.stringify(room.day.platesRemaining)).not.toBe(before);
      }
    }
    expect(s).not.toBeNull();
    const v = s!.day.billionaireVisit!;
    expect(v.treated).toBe(true);
    expect(v.glasses).toBe(7);
    for (const g of s!.guests.slice(1)) expect(g.satisfaction).toBeCloseTo(0.6 + BILLIONAIRE.treatSatisfaction);
  });

  it('kommer på sin tid när han valt krogen, också när marknadens tak är nått', () => {
    let checked = 0;
    for (let seed = 1; seed < 400 && checked < 3; seed++) {
      const c = stocked({ ...atDay(week2(seed), 'sat'), reputation: 0.9 });
      if (!bookingFor(c).billionaire) continue;
      checked++;
      let s = reducer(c, { type: 'START_SERVICE' });
      for (let i = 0; i < 4000 && s.day.period === 'dinner'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
      expect(s.day.guestTypeArrivals?.billionaire, `frö ${seed}`).toBe(1);
      expect(s.day.billionaireVisit, `frö ${seed}`).toBeTruthy();
    }
    expect(checked).toBe(3);
  });

  it('köper det dyraste: rätten med högst pris och en flaska också ensam', async () => {
    const { orderForGuest } = await import('../../strategic/simulation/guestOrders');
    const base = reducer(stocked(atDay(week2(), 'sat')), { type: 'START_SERVICE' });
    const s = roomWith([{ state: 'dining', guestType: 'billionaire' }], base);
    const order = orderForGuest(s, s.guests[0], () => 0.5);
    expect(order.kind).toBe('served');
    if (order.kind !== 'served') return;
    const food = s.menu.filter((m) => !m.dishId.includes('wine') && !m.dishId.includes('beer') && !m.dishId.includes('alcohol'));
    const top = Math.max(...food.map((m) => m.price));
    const dish = s.menu.find((m) => m.dishId === order.dishId);
    expect(dish?.price).toBe(top);
    expect(order.drinks.some((d) => d.includes('bottle'))).toBe(true);
  });
});

describe('ORDER 287a — tidningen och kvällens post', () => {
  it('kvällens post bär gästerna per typ, och tidningen har Sett på stan', async () => {
    let s = week2();
    const { playDay } = await import('../../strategic/testHarness/weekHarness');
    for (let d = 0; d < 6; d++) s = playDay(s, {}).state;
    const evenings = s.economy.lastSettlement?.evenings ?? [];
    expect(evenings.length).toBe(6);
    for (const e of evenings) {
      const sum = Object.values(e.typeGuests ?? {}).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum).toBeGreaterThan(0);
    }
    const fri = evenings.find((e) => calendarFor(e.dayNumber).weekday === 'fri');
    expect(fri?.billionaire?.inTown).toBe(true);
    const paper = newspaperFor(s, 'Vinbaren', [], () => null)!;
    const seen = paper.sections.find((x) => x.id === 'seen');
    expect(seen).toBeDefined();
    // I ord, utan siffror (ORDER 267): vilka som kom mest.
    const market = paper.sections.find((x) => x.id === 'market')!;
    expect(market.lines.length).toBeGreaterThan(1);
    for (const x of paper.sections) for (const line of x.lines) expect(line).not.toMatch(/\d/);
  }, 120000);
});

describe('ORDER 287a — hållbarheterna som nivåer 0–10', () => {
  it('sätts när servicen stänger, inom 0–10, med förra kvällens nivå', async () => {
    const { playDay } = await import('../../strategic/testHarness/weekHarness');
    let s = week2();
    s = playDay(s, {}).state;
    // playDay går till nästa morgon; kvällens nivåer står kvar.
    const first = s.sustainabilityLevels!;
    expect(first.previous).toBeNull();
    for (const k of ['social', 'economic', 'ecological'] as const) {
      expect(first.levels[k]).toBeGreaterThanOrEqual(0);
      expect(first.levels[k]).toBeLessThanOrEqual(SUSTAINABILITY_LEVELS.max);
      expect(Number.isInteger(first.levels[k])).toBe(true);
    }
    s = playDay(s, {}).state;
    expect(s.sustainabilityLevels!.previous).toEqual(first.levels);
  }, 120000);
});

// ---------------------------------------------------------------------
// Sittklippen i sin egen längd och sällskapet sittande när den sista landat
// ---------------------------------------------------------------------

function makeDirector(room: WineBarRoom): WineBarDirector {
  const queueSlots: [number, number][] = [];
  for (let i = 0; i < 10; i++) queueSlots.push([room.waitingSpot[0] + 0.8 * Math.floor(i / 2), i % 2 === 0 ? -0.5 : 0.5]);
  return new WineBarDirector(
    { seats: room.seats, staffStations: room.staffStations, entrance: room.entrance, waitingSpot: room.waitingSpot,
      floorY: room.floorY, width: room.width, depth: room.depth },
    { walkPathToSeat: (id) => walkPathToSeat(room, id), exitPathFromSeat: (id) => exitPathFromSeat(room, id),
      groups: groupsFor(room), queueSlots, spawn: [room.waitingSpot[0] + 6, 0], poolSize: 36, seatedHipY: SEATED_HIP_Y }
  );
}

function frame(t: number, guests: GuestInput[]) {
  return { t, guests, patienceSeconds: 60, giveUpSatisfaction: 0.35, unhappyThreshold: 0.65, takeover: null };
}

describe('ORDER 287a — sittklippen (Vision Owner 2026-09-30)', () => {
  it('på stol, barstol och lounge spelas sittklippet i sin egen längd', () => {
    const room = createWineBarRoom();
    for (const kind of ['twotop', 'bar', 'lounge']) {
      const seat = room.seats.find((x) => x.kind === kind)!;
      const director = makeDirector(room);
      const g: GuestInput = { id: 'a', state: 'arriving', seatIndex: null, stateTime: 0, satisfaction: 0.8 };
      director.update(frame(0, [g]));
      g.state = 'seated'; g.seatIndex = seat.seatIndex; g.stateTime = 0.2;
      let sitStart = -1;
      let sitEnd = -1;
      for (let t = 0.2; t < 60; t += 0.05) {
        director.update(frame(t, [g]));
        const sample = director.guestSamples.find((x) => x.guestId === 'a')!;
        if (sample.pose === 'sitDown' && sitStart < 0) sitStart = t;
        if (sitStart >= 0 && sample.seated) { sitEnd = t; break; }
      }
      const want = clipSeconds(SEAT_KINDS[seatKindFromRoom(kind)].sit, 'normal');
      expect(sitEnd - sitStart, kind).toBeGreaterThan(want - 0.1);
      expect(sitEnd - sitStart, kind).toBeLessThan(want + 0.15);
    }
  });

  it('sällskapet räknas som sittande när den sista gästen har landat', () => {
    const room = createWineBarRoom();
    // Två platser vid samma bord.
    const groups = groupsFor(room);
    const group = groups.find((gr) => gr.kind === 'two')!;
    const seats = group.seats.map((id: string) => room.seats.find((x) => x.id === id)!);
    const director = makeDirector(room);
    const a: GuestInput = { id: 'a', state: 'arriving', seatIndex: null, stateTime: 0, satisfaction: 0.8, partyId: 'p' };
    const b: GuestInput = { id: 'b', state: 'arriving', seatIndex: null, stateTime: 0, satisfaction: 0.8, partyId: 'p' };
    director.update(frame(0, [a, b]));
    a.state = 'seated'; a.seatIndex = seats[0].seatIndex;
    director.update(frame(0.2, [a, b]));
    // Den andra går till bordet fem sekunder senare.
    let t = 0.2;
    for (; t < 5.2; t += 0.1) director.update(frame(t, [a, b]));
    b.state = 'seated'; b.seatIndex = seats[1].seatIndex;
    director.update(frame(t, [a, b]));
    const parties = (director as unknown as { parties: Map<string, { seatedAt: number; menuDoneAt: number }> }).parties;
    const p = parties.get('p')!;
    let landedA = -1;
    let landedB = -1;
    for (; t < 80; t += 0.05) {
      director.update(frame(t, [a, b]));
      const sa = director.guestSamples.find((x) => x.guestId === 'a')!;
      const sb = director.guestSamples.find((x) => x.guestId === 'b')!;
      if (sa.seated && landedA < 0) landedA = t;
      if (sb.seated && landedB < 0) landedB = t;
    }
    expect(landedA).toBeGreaterThan(0);
    expect(landedB).toBeGreaterThan(0);
    // Sällskapets tid är den sista gästens landning, inte den första.
    const last = Math.max(landedA, landedB);
    expect(Math.abs(p.seatedAt - last)).toBeLessThan(0.15);
    expect(p.menuDoneAt).toBeGreaterThan(last);
  });
});

// ---------------------------------------------------------------------
// Rapporten: en vecka för den rimliga spelaren, 20 frön
// ---------------------------------------------------------------------

describe('ORDER 287a — gästtyperna över veckan (rapport)', () => {
  it('gäster och intäkt per typ, gästen med socialt kapital och miljardären', async () => {
    const { playDay } = await import('../../strategic/testHarness/weekHarness');
    // ORDER 296b/296c — åtta frön i sviten: ordningen per gäst är ett snitt;
    // med fyra låg studenten och medelinkomsttagaren en krona isär (159 mot 158).
    const seeds = Array.from({ length: Number(process.env.WEEK_SEEDS ?? (process.env.WRITE_REPORTS === '1' ? 20 : 8)) }, (_, i) => i + 1);
    const rows: unknown[] = [];
    const perType: Record<string, { guests: number; revenueSek: number }> = {};
    let socialGood = 0, socialBad = 0, socialNeutral = 0, socialBooked = 0, billionaireOurs = 0, treated = 0;
    const eveningRevenue: number[] = [];
    for (const seed of seeds) {
      let s = week2(seed);
      for (let d = 0; d < 6; d++) s = playDay(s, {}).state;
      for (const e of s.economy.lastSettlement?.evenings ?? []) {
        eveningRevenue.push(e.revenueSek);
        for (const [k, n] of Object.entries(e.typeGuests ?? {})) {
          perType[k] = perType[k] ?? { guests: 0, revenueSek: 0 };
          perType[k].guests += n ?? 0;
          perType[k].revenueSek += Math.round(e.typeRevenue?.[k as GuestType] ?? 0);
        }
        if (e.social) {
          socialBooked++;
          if (e.social.outcome === 'good') socialGood++;
          if (e.social.outcome === 'bad') socialBad++;
          if (e.social.outcome === 'neutral') socialNeutral++;
        }
        if (e.billionaire?.ours) billionaireOurs++;
        if (e.billionaire?.treated) treated++;
        rows.push({ seed, dayNumber: e.dayNumber, weekday: calendarFor(e.dayNumber).weekday, revenueSek: e.revenueSek, guests: e.guests, typeGuests: e.typeGuests, typeRevenue: e.typeRevenue, social: e.social, billionaire: e.billionaire });
      }
    }
    const report = {
      definition: 'Vecka 2, vinbaren, brons i Stensöta, Metodköket och Kalastorget, den rimliga spelaren (weekHarness playDay med {}). Per typ: gäster som kom (day.guestTypeArrivals) och intäkt när de betalade (day.guestTypeRevenue), ur kvällens post i veckan (economy.ts recordEvening). perGuestSek = intäkt / gäster.',
      weeks: seeds.length,
      meanEveningRevenueSek: Math.round(eveningRevenue.reduce((a, b) => a + b, 0) / Math.max(1, eveningRevenue.length)),
      perType: Object.fromEntries(Object.entries(perType).map(([k, v]) => [k, { ...v, perGuestSek: Math.round(v.revenueSek / Math.max(1, v.guests)) }])),
      social: { booked: socialBooked, good: socialGood, bad: socialBad, neutral: socialNeutral },
      billionaire: { eveningsHere: billionaireOurs, treated },
      rows
    };
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports', process.env.REPORT_ORDER ?? 'order287a');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'guest-types.json'), JSON.stringify(report, null, 2) + '\n');
    }
    // Studenten ger minst per gäst, höginkomsttagaren mer än medelinkomsttagaren.
    const pg = report.perType;
    expect(pg.student.perGuestSek).toBeLessThan(pg.middle.perGuestSek);
    // ORDER 307 — de betalningsstarka heter gourmeter och affärsfolk i vinbaren.
    const highPer = Math.max(pg.high?.perGuestSek ?? 0, pg.gourmet?.perGuestSek ?? 0, pg.business?.perGuestSek ?? 0);
    expect(pg.middle.perGuestSek).toBeLessThan(highPer);
  }, 1200000);
});

// Gäster utan typ i en tick får typ (assignGuestTypes är idempotent).
describe('ORDER 287a — typen sätts en gång', () => {
  it('assignGuestTypes rör inte en gäst som redan har typ', () => {
    const base = reducer(stocked(atDay(week2(), 'wed')), { type: 'START_SERVICE' });
    const s = roomWith([{ state: 'arriving', guestType: 'high', satisfaction: 0.5 }, { state: 'arriving' }], base);
    assignGuestTypes(s);
    expect(s.guests[0].guestType).toBe('high');
    expect(s.guests[0].satisfaction).toBe(0.5);
    expect(s.guests[1].guestType).toBeDefined();
    const again = JSON.stringify(s.guests);
    assignGuestTypes(s);
    expect(JSON.stringify(s.guests)).toBe(again);
  });
});
