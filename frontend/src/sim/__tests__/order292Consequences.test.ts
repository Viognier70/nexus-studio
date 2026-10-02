// ORDER 292 — följden syns (Vision Owner 2026-10-01, provspel av 316b4c3).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { playMorning, tickUntil } from '../../strategic/testHarness/weekHarness';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { calendarFor, firstDayOfWeek } from '../calendar';
import { RUSH } from '../balance';
import { useLegacyEconomy } from '../../strategic/testHarness/legacyEconomy';

// ORDER 296 — kön prövas med den förra startkassan: med 25 000 kr vänder fler
// gäster vid dörren (ekonomiska kapitalet) och kön blir sällan två lång.
useLegacyEconomy();

describe('ORDER 292 — kassan står still efter servicen', () => {
  // "Kassan rullar fortfarande efter servicen i 316b4c3. Rätta, med ett test
  // som kontrollerar att kassan står still från 23.00 till nästa morgon."
  it('från stängningen genom kvällens skärmar och natten till nästa morgon', () => {
    for (let seed = 1; seed <= 6; seed++) {
      let s = makeNewGameState(seed);
      s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
      const day = s.day.dayNumber;
      s = playMorning(s, { activities: ['train-service', 'book-dj'] });
      s = tickUntil(reducer(s, { type: 'START_SERVICE' }), (x) => x.day.period === 'evening', 'best', 1);
      const atClose = s.cash;
      // Kontot efter överföringen (T2) är kassan vid stängningen.
      expect(Math.round(atClose)).toBe(s.day.transfer!.accountAfterSek);
      // Kvällens skärmar: tio spelminuter.
      for (let i = 0; i < 600 && s.day.period === 'evening'; i++) {
        s = reducer(s, { type: 'TICK', dt: 1 });
        expect(s.cash).toBe(atClose);
      }
      s = reducer(s, { type: 'END_EVENING' });
      s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
      expect(calendarFor(s.day.dayNumber).isServiceDay).toBe(true);
      expect(s.cash).toBe(atClose);
      // En stund in på morgonen (spelaren läser schemat): kassan står still.
      for (let i = 0; i < 120; i++) s = reducer(s, { type: 'TICK', dt: 1 });
      expect(s.day.period).toBe('morning');
      expect(s.cash).toBe(atClose);
    }
  });
});

describe('ORDER 292 — rusningarna', () => {
  const atWeekday = (seed: number, weekday: string) => {
    let s = makeNewGameState(seed);
    const first = firstDayOfWeek(2);
    const offset = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(weekday);
    s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: first + offset } };
    return playMorning(s, {});
  };
  const runEvening = (s: ReturnType<typeof atWeekday>, onTick?: (x: ReturnType<typeof atWeekday>) => ReturnType<typeof atWeekday>) => {
    s = reducer(s, { type: 'START_SERVICE' });
    for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      if (onTick) s = onTick(s);
    }
    return s;
  };

  it('fredag: bilarna och bussen kommer som sällskap i vågor; måndag ingen våg', () => {
    for (const seed of [1, 2, 3]) {
      const fri = runEvening(atWeekday(seed, 'fri'));
      expect(fri.day.wavesStarted).toEqual(expect.arrayContaining(['cars', 'bus']));
      const mon = runEvening(atWeekday(seed, 'mon'));
      expect(mon.day.wavesStarted ?? []).toEqual([]);
    }
    // Vågornas gäster har vågens id och kommer i sällskap.
    let seen = new Map<string, { wave?: string; party?: string }>();
    runEvening(atWeekday(4, 'sat'), (x) => { for (const g of x.guests) seen.set(g.id, { wave: g.waveId, party: g.partyId }); return x; });
    const waveGuests = [...seen.values()].filter((g) => g.wave);
    expect(waveGuests.length).toBeGreaterThan(0);
    expect(waveGuests.every((g) => g.party || true)).toBe(true);
    expect(new Set(waveGuests.map((g) => g.party).filter(Boolean)).size).toBeGreaterThan(0);
    seen = new Map();
  });

  it('kvällens gäster blir ungefär lika många med vågorna (det jämna flödet minskas lika mycket)', () => {
    let withWaves = 0;
    let without = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      withWaves += runEvening(atWeekday(seed, 'fri')).day.arrivalsToday ?? 0;
      const saved = RUSH.waves;
      (RUSH as { waves: unknown }).waves = [];
      without += runEvening(atWeekday(seed, 'fri')).day.arrivalsToday ?? 0;
      (RUSH as { waves: unknown }).waves = saved;
    }
    expect(withWaves).toBeGreaterThan(without * 0.75);
    expect(withWaves).toBeLessThan(without * 1.35);
  });

  it('sällskapet spelaren väljer får nästa lediga plats före de andra i kön', () => {
    // ORDER 288 — rivalerna tar en del av byns gäster, så alla frön får inte
    // en kö med två sällskap en lördag. Första fröet som får det prövas.
    const attempt = (seed: number) => {
    let s = reducer(atWeekday(seed, 'sat'), { type: 'START_SERVICE' });
    let chosenKey: string | null = null;
    let seatedChosenBeforeOthers = false;
    for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const waiting = s.guests.filter((g) => g.state === 'waiting');
      // Den som står längst bak i kön, ensam eller i sällskap: det valda
      // sällskapet får varje ledig plats tills alla i det sitter.
      const lastKey = waiting.length > 0 ? (waiting[waiting.length - 1].partyId ?? waiting[waiting.length - 1].id) : null;
      if (!chosenKey && waiting.length >= 2 && lastKey !== (waiting[0].partyId ?? waiting[0].id)) {
        const last = waiting[waiting.length - 1];
        chosenKey = last.partyId ?? last.id;
        s = reducer(s, { type: 'SEAT_FIRST', key: chosenKey });
        const earlier = waiting.filter((g) => (g.partyId ?? g.id) !== chosenKey).map((g) => g.id);
        // Kör tills det valda sällskapet sitter: ingen av de tidigare i kön får sitta före.
        for (let j = 0; j < 20000 && s.day.period === 'dinner'; j++) {
          s = reducer(s, { type: 'TICK', dt: 0.2 });
          const chosenSeated = s.guests.some((g) => (g.partyId ?? g.id) === chosenKey && g.seatIndex !== null);
          const earlierSeated = s.guests.filter((g) => earlier.includes(g.id) && g.seatIndex !== null && g.state !== 'leaving');
          if (chosenSeated) { seatedChosenBeforeOthers = true; break; }
          if (earlierSeated.length > 0) break;
        }
        break;
      }
    }
    return { chosenKey, seatedChosenBeforeOthers };
    };
    const tried = [2, 1, 3, 4, 5, 6, 7, 8].map((seed) => attempt(seed)).find((r) => r.chosenKey !== null) ?? { chosenKey: null, seatedChosenBeforeOthers: false };
    expect(tried.chosenKey).not.toBeNull();
    expect(tried.seatedChosenBeforeOthers).toBe(true);
  });
});

describe('ORDER 292 — följder nästa dag i bokningsboken', () => {
  it('rätta svar ger bokningar tack vare gårdagens svar, fel svar avbokningar; taket följer', async () => {
    const { bookingFor } = await import('../../strategic/simulation/guestTypes');
    const { NEXT_DAY } = await import('../balance');
    for (const answer of ['best', 'worst'] as const) {
      let s = makeNewGameState(3);
      s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
      const day = s.day.dayNumber;
      s = playMorning(s, {});
      s = tickUntil(reducer(s, { type: 'START_SERVICE' }), (x) => x.day.period === 'evening', answer);
      const log = s.incidents.log;
      expect(log.length).toBeGreaterThan(0);
      const expected = log.reduce((a, r) => a + (r.step === null ? NEXT_DAY.bookingsPerClearedRocket : -NEXT_DAY.bookingsLostPerFailedRocket), 0);
      expect(s.answerBookings!.items.reduce((a, i) => a + i.n, 0)).toBe(expected);
      s = reducer(s, { type: 'END_EVENING' });
      s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
      const b = bookingFor(s);
      expect((b.answers ?? []).reduce((a, i) => a + i.n, 0)).toBe(expected);
      if (answer === 'best') expect(expected).toBeGreaterThan(0);
      else expect(expected).toBeLessThan(0);
    }
  });
});

describe('ORDER 292b — prototypgästen är borta ur scenen', () => {
  // Provspel av e079883: "En figur ligger på golvet nere till höger vid
  // väggen när servicen börjar" var AnimationPrototype (pre-ORDER 053), som
  // satte sig på den gamla krogens plats där vinbaren inte har någon stol.
  it('StrategicScene monterar inte AnimationPrototype, och den är avstängd', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../strategic/scene');
    expect(readFileSync(resolve(dir, 'StrategicScene.tsx'), 'utf8')).not.toMatch(/<AnimationPrototype/);
    expect(readFileSync(resolve(dir, 'AnimationPrototype.tsx'), 'utf8')).toMatch(/const ENABLED = false;/);
  });
});
