// ORDER 319c (ORDRAR_319_D9.md "Platsen och vädret", Designs D9 och tillägget) — livet vid vagnen i
// simuleringen (sim/truckLife.ts): vädret per kväll som syns på morgonen, de som äter vid en ledig plats
// eller tar maten med sig, skräpet på borden och vem som städar, och medhjälparens runda med marschallerna.

import { describe, expect, it } from 'vitest';
import { playMorning, startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { reducer } from '../../strategic/simulation/reducer';
import { makeGuest } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { eveningProgress } from '../clock';
import { dailyGuestCap } from '../economy';
import { arrivalAttraction } from '../../strategic/simulation/arrivals';
import { CURIOUS, TORCH, TRUCK_SEATING, TRUCK_WEATHER } from '../balance';
import { curiousOf, curiousTalkable } from '../curious';
import { curiousQuestion } from '../curiousBank';
import { clearTruckTable, finishTruckEating, freeSeats, startTruckEating, truckAssistantAway, truckOf, truckRaining, truckSeating, truckWeatherFor, TRUCK_WEATHERS, type TruckDayState, type TruckWeatherKind } from '../truckLife';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;
/** Kön fylls på med så många extra, så att den är lång också när luckan tar emot någon under ticket. */
const QUEUE_MARGIN = 3;

function morning(seed = 1, day = firstDayOfWeek(1)): SimulationState {
  return playMorning(startInFoodtruck(seed, day), { scenarioAnswer: 'best', ladder: 'never' });
}

function withWeather(s: SimulationState, weather: TruckWeatherKind, extra: Partial<TruckDayState> = {}): SimulationState {
  const t = truckOf(s);
  return { ...s, day: { ...s.day, truck: { ...t, weather, rainFromE: weather === 'rain' ? TRUCK_WEATHER.rainFromE[0] : null, ...extra } } };
}

function open(s: SimulationState): SimulationState {
  return reducer(s, { type: 'START_SERVICE' });
}

function until(s: SimulationState, done: (s: SimulationState) => boolean, max = 20000): SimulationState {
  for (let i = 0; i < max && !done(s); i++) {
    s = reducer(s, TICK);
    if (s.day.period !== 'dinner') break;
  }
  return s;
}

describe('ORDER 319c — vädret vid vagnen', () => {
  it('ett väder per kväll ur fröet och dagen, samma på morgonen som på kvällen, och alla fyra förekommer', () => {
    const s = morning(4);
    const forecast = truckOf(s).weather;
    expect(s.day.period).toBe('morning');
    const evening = until(open(s), (x) => (eveningProgress(x) ?? 0) > 0.3);
    expect(truckOf(evening).weather).toBe(forecast);
    const seen = new Map<TruckWeatherKind, number>();
    for (let seed = 1; seed <= 20; seed++) for (let d = 1; d <= 30; d++) {
      const w = truckWeatherFor(seed, d).weather;
      seen.set(w, (seen.get(w) ?? 0) + 1);
    }
    for (const k of TRUCK_WEATHERS) expect(seen.get(k) ?? 0).toBeGreaterThan(0);
    // Andelarna ligger nära vikterna (600 kvällar).
    for (const k of TRUCK_WEATHERS) expect(Math.abs((seen.get(k) ?? 0) / 600 - TRUCK_WEATHER.weights[k])).toBeLessThan(0.08);
  });

  it('vädret ändrar gästflödet: ankomsterna gånger footfall, och byns väder vid vagnen stämmer med vagnens', () => {
    const s = open(morning(1));
    const base = arrivalAttraction(withWeather(s, 'sun'));
    for (const k of TRUCK_WEATHERS) expect(arrivalAttraction(withWeather(s, k)) / base).toBeCloseTo(TRUCK_WEATHER.footfall[k] / TRUCK_WEATHER.footfall.sun, 5);
    // Byns väder när servicen öppnar: regn när det regnar vid vagnen, uppehåll och värme i solen.
    expect(open(withWeather(morning(1), 'rain')).day.weather?.precipitation).toBe('rain');
    const sun = open(withWeather(morning(1), 'sun')).day.weather!;
    expect(sun.precipitation).toBe('none');
    expect(sun.tempC).toBeGreaterThanOrEqual(TRUCK_WEATHER.village.sunMinTempC);
    expect(open(withWeather(morning(1), 'cool')).day.weather!.tempC).toBeLessThanOrEqual(TRUCK_WEATHER.village.coolMaxTempC);
    expect(dailyGuestCap(withWeather(s, 'rain'))).toBe(dailyGuestCap(withWeather(s, 'sun')));
  });

  it('en regnkväll börjar torr; när regnet kommer äter man vid hyllan under markisen', () => {
    let s = open(withWeather(morning(1), 'rain', { rainFromE: 0.3 }));
    s = until(s, (x) => (eveningProgress(x) ?? 0) > 0.1);
    expect(truckRaining(s)).toBe(false);
    expect(truckSeating(s).some((k) => k.includes('-'))).toBe(true);
    s = until(s, (x) => truckRaining(x));
    expect(eveningProgress(s)!).toBeGreaterThanOrEqual(0.3);
    expect(truckSeating(s)).toEqual(['shelf0', 'shelf1']);
  });

  it('en sval kväll: först platserna runt värmaren, och de nyfikna fryser (frågorna om kylan)', () => {
    let s = open(withWeather(morning(1), 'cool'));
    expect(truckSeating(s).slice(0, 4)).toEqual(['heat0', 'heat1', 'heat2', 'heat3']);
    expect(truckSeating(s)).not.toContain('C-W');
    s = until(s, curiousTalkable);
    s = reducer(s, { type: 'CURIOUS_OPEN' });
    const card = curiousOf(s).current!.card!;
    expect(card.moment).toBe('cold');
    expect(curiousQuestion(card.questionId)!.trigger).toBe('cold');
  });

  it('solen ger fler nyfikna än regnet (CURIOUS.gapSimSeconds gånger curiousGap)', () => {
    const count = (w: TruckWeatherKind) => [1, 2, 3, 4].reduce((a, seed) => {
      const s = until(open(withWeather(morning(seed), w, { rainFromE: 1 })), () => false);
      return a + curiousOf(s).tonight.passersBy;
    }, 0);
    expect(TRUCK_WEATHER.curiousGap.sun).toBeLessThan(TRUCK_WEATHER.curiousGap.rain);
    expect(count('sun')).toBeGreaterThan(count('rain'));
    expect(CURIOUS.gapSimSeconds).toBeGreaterThan(0);
  });
});

describe('ORDER 319c — de som äter, och skräpet på borden', () => {
  it('gästen som har fått maten äter vid en ledig plats; utan ledig plats tar gästen maten med sig', () => {
    let s = until(open(withWeather(morning(1), 'sun')), (x) => x.guests.some((g) => g.state === 'eating'));
    const g = s.guests.find((x) => x.state === 'eating')!;
    expect(truckSeating(s)).toContain(g.truckSpot);
    // Alla platser tagna: nästa gäst tar maten med sig.
    const draft: SimulationState = { ...s, day: { ...s.day }, guests: [...s.guests] };
    for (const k of freeSeats(draft)) { const x = makeGuest(draft.simTime, false, false); x.state = 'eating'; x.truckSpot = k; draft.guests.push(x); }
    expect(freeSeats(draft)).toEqual([]);
    const late = makeGuest(draft.simTime, false, false);
    const before = truckOf(draft).tonight.takeaway;
    expect(startTruckEating(draft, late)).toBe(false);
    expect(truckOf(draft).tonight.takeaway).toBe(before + 1);
    // Och de äter i TRUCK_SEATING.eatSimSeconds.
    s = until(s, (x) => x.guests.find((y) => y.id === g.id)?.state !== 'eating');
    expect(s.simTime - g.stateTime).toBeGreaterThanOrEqual(TRUCK_SEATING.eatSimSeconds);
  });

  it('mycket folk: en del lämnar skräpet på bordet; bordet används inte förrän det är städat, och spelaren kan städa det', () => {
    const s = open(withWeather(morning(1), 'sun'));
    const draft: SimulationState = { ...s, day: { ...s.day }, guests: [...s.guests] };
    // Fullt vid borden.
    const eaters = ['A-W', 'A-E', 'A-S', 'B-E', 'B-S', 'C-N', 'C-S', 'C-W'].map((k) => { const x = makeGuest(draft.simTime, false, false); x.state = 'eating'; x.truckSpot = k; draft.guests.push(x); return x; });
    let littered = 0;
    for (const e of eaters) { finishTruckEating(draft, e); if (e.truckLitter) littered++; }
    expect(littered).toBeGreaterThan(0);
    const t = truckOf(draft);
    const dirty = (['A', 'B', 'C'] as const).find((k) => t.litter[k] > 0)!;
    draft.guests = draft.guests.filter((g) => !eaters.includes(g));
    expect(freeSeats(draft).some((k) => k.startsWith(dirty + '-'))).toBe(false);
    clearTruckTable(draft, dirty);
    expect(truckOf(draft).litter[dirty]).toBe(0);
    expect(truckOf(draft).tonight.clearedByPlayer).toBe(1);
    expect(freeSeats(draft).some((k) => k.startsWith(dirty + '-'))).toBe(true);
    // Lugnt: ingen lämnar skräp.
    const calm = makeGuest(draft.simTime, false, false);
    calm.state = 'eating'; calm.truckSpot = 'bench0';
    draft.guests.push(calm);
    finishTruckEating(draft, calm);
    expect(calm.truckLitter).toBeUndefined();
  });

  it('medhjälparen städar ett bord när kön är tom och ingen äter där; luckan står tom så länge', () => {
    let s = open(withWeather(morning(1), 'sun', { litter: { A: 2, B: 0, C: 0 }, torchesLit: true }));
    s = until(s, (x) => truckAssistantAway(x));
    expect(truckOf(s).errand).toMatchObject({ kind: 'clear', table: 'A', total: TRUCK_SEATING.clearSimSeconds });
    expect(s.waitingIds.length).toBeLessThanOrEqual(TRUCK_SEATING.clearQueueMax);
    s = until(s, (x) => !truckAssistantAway(x));
    expect(truckOf(s).litter.A).toBe(0);
    expect(truckOf(s).tonight.clearedByAssistant).toBe(1);
    expect(truckOf(s).tonight.hatchEmptySimSeconds).toBeGreaterThanOrEqual(TRUCK_SEATING.clearSimSeconds - TICK.dt);
  });
});

describe('ORDER 319c — medhjälparen tänder marschallerna', () => {
  it('rundan börjar när kvällen passerar fromE med kort kö, tar roundSimSeconds, och marschallerna är tända efteråt', () => {
    let s = until(open(withWeather(morning(1), 'sun')), (x) => truckOf(x).errand?.kind === 'torches');
    const e = truckOf(s).tonight.torchStartE!;
    expect(e).toBeGreaterThanOrEqual(TORCH.fromE);
    expect(e).toBeLessThan(TORCH.latestE);
    const start = s.simTime;
    s = until(s, (x) => truckOf(x).torchesLit);
    expect(s.simTime - start).toBeCloseTo(TORCH.roundSimSeconds, 0);
  });

  it('lång kö (queueMax eller fler): medhjälparen väntar, men går senast vid latestE', () => {
    let s = open(withWeather(morning(1), 'sun'));
    s = until(s, (x) => (eveningProgress(x) ?? 0) >= TORCH.fromE - 0.01);
    // En lång kö hela tiden: gäster som väntar.
    const keepQueue = (x: SimulationState): SimulationState => {
      const guests = [...x.guests];
      const ids = [...x.waitingIds];
      while (ids.length < TORCH.queueMax + QUEUE_MARGIN) { const g = makeGuest(x.simTime, false, false); g.state = 'waiting'; guests.push(g); ids.push(g.id); }
      return { ...x, guests, waitingIds: ids };
    };
    for (let i = 0; i < 20000 && s.day.period === 'dinner' && !truckOf(s).errand; i++) s = reducer(keepQueue(s), TICK);
    expect(truckOf(s).tonight.torchWaited).toBe(true);
    expect(truckOf(s).tonight.torchStartE!).toBeGreaterThanOrEqual(TORCH.latestE);
  });

  it('medan medhjälparen är ute tas inga beställningar vid luckan; grillaren arbetar vidare', () => {
    let s = until(open(withWeather(morning(1), 'sun')), (x) => truckOf(x).errand?.kind === 'torches');
    const hatch = () => s.staff.filter((m) => m.role !== 'kock').map((m) => [m.taskType, m.taskProgress]);
    const before = hatch();
    const ordering = s.guests.filter((g) => g.state === 'ordering').map((g) => g.id);
    for (let i = 0; i < 20; i++) s = reducer(s, TICK);
    expect(truckAssistantAway(s)).toBe(true);
    expect(hatch()).toEqual(before);
    for (const id of ordering) expect(s.guests.find((g) => g.id === id)?.state).toBe('ordering');
  });
});
