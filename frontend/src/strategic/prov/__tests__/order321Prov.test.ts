// ORDER 321 (Anders 2026-10-09) — provspelsläget. "Test: att ?prov inte påverkar det vanliga spelet."
//
// 1. Utan ?prov: adressen ger det vanliga spelet, ett nytt spel har inget prov, vädret är prognosen, och
//    sparandet är som förut. main.tsx väljer provspelet bara med ?prov.
// 2. Med ?prov: steget, veckan, kassan, medaljerna och kraven, vädret, situationen i kväll, och att inget sparas.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { calendarFor } from '../../../sim/calendar';
import { LADDER, RISK } from '../../../sim/balance';
import { missingFor } from '../../../sim/ladder';
import { savesForDayChange } from '../../../sim/save';
import { truckOf, truckVillageWeather, truckWeatherFor } from '../../../sim/truckLife';
import { startInFoodtruck } from '../../testHarness/weekHarness';
import { buildProvState, defaultCashSek, defaultSetup, isProvSearch, PROV_PLACES, PROV_WEEKS, provIncidents } from '../provState';
import type { WeatherConditions } from '../../types';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SEED = 321;
const MILD: WeatherConditions = { tempC: 18, windMS: 2, precipitation: 'none', cloudCover: 'clear', outdoorViable: true } as WeatherConditions;

describe('ORDER 321 — ?prov påverkar inte det vanliga spelet', () => {
  it('bara ?prov öppnar provspelet', () => {
    for (const s of ['', '?', '?prova', '?provspel', '?playtest=1', '?a=prov']) expect([s, isProvSearch(s)]).toEqual([s, false]);
    for (const s of ['?prov', '?prov=1', '?a=1&prov', '?prov&lang=sv']) expect([s, isProvSearch(s)]).toEqual([s, true]);
  });

  it('main.tsx väljer provspelet bara med ?prov, och det vanliga flödet står kvar', () => {
    const main = readFileSync(resolve(SRC, 'main.tsx'), 'utf8');
    expect(main).toMatch(/isProvSearch\(window\.location\.search\) \? <ProvRoot \/> : <Root \/>/);
    expect(main).toMatch(/useReducer\(newGameFlow, NEW_GAME_FLOW_START\)/);
  });

  it('ett nytt spel har inget prov, och vädret och sparandet är som förut', () => {
    const s = startInFoodtruck(SEED);
    expect(s.prov).toBeUndefined();
    expect(makeNewGameState(SEED).prov).toBeUndefined();
    for (let d = 1; d <= 20; d++) {
      const x = { ...s, day: { ...s.day, dayNumber: d, truck: undefined } };
      expect(truckOf(x).weather).toBe(truckWeatherFor(SEED, d).weather);
      expect(truckOf(x).rainFromE).toBe(truckWeatherFor(SEED, d).rainFromE);
    }
    const next = { ...s, day: { ...s.day, dayNumber: s.day.dayNumber + 1 } };
    expect(savesForDayChange(s.day.dayNumber, next).length).toBeGreaterThan(0);
  });

  it('i vinbaren utan prov rättas inte byns väder', () => {
    const s = buildProvState({ ...defaultSetup('vinbar'), weather: 'auto' }, SEED);
    const { prov: _p, ...plain } = s;
    expect(truckVillageWeather(plain, MILD)).toBe(MILD);
    expect(truckVillageWeather(s, MILD)).toBe(MILD);
  });
});

describe('ORDER 321 — provspelet', () => {
  it('börjar i det valda steget, veckans måndag på morgonen, med den valda kassan', () => {
    for (const place of PROV_PLACES) for (const week of [1, PROV_WEEKS[PROV_WEEKS.length - 1]]) {
      const s = buildProvState({ ...defaultSetup(place), week, cashSek: 12345 }, SEED);
      expect(s.ladder?.step).toBe(place);
      expect(s.economy.businessClass).toBe(LADDER.steps[place].businessClass);
      expect(calendarFor(s.day.dayNumber).absoluteWeek).toBe(week);
      expect(s.day.period).toBe('morning');
      expect(s.cash).toBe(12345);
      expect(s.introduction).toBeNull();
      expect(s.ladder?.refit ?? null).toBeNull();
      expect(s.prov).toBeDefined();
    }
  });

  it('medaljerna och kraven för steget räknas som uppfyllda', () => {
    for (const place of PROV_PLACES.slice(1)) {
      const s = buildProvState(defaultSetup(place), SEED);
      expect([place, missingFor({ ...s, cash: LADDER.requirements[place]!.cashSek }, place)]).toEqual([place, []]);
    }
  });

  it('kassan är förifylld för steget', () => {
    expect(defaultCashSek('foodtruck')).toBe(RISK.startCashSek);
    expect(defaultCashSek('vinbar')).toBe(LADDER.requirements.vinbar.cashSek);
    expect(defaultCashSek('bistro')).toBe(LADDER.requirements.bistro.cashSek);
  });

  it('vädret: det valda varje kväll vid vagnen, och i vinbaren rättas byns väder', () => {
    const t = buildProvState({ ...defaultSetup('foodtruck'), weather: 'rain' }, SEED);
    for (let d = 0; d < 5; d++) {
      const x = { ...t, day: { ...t.day, dayNumber: t.day.dayNumber + d, truck: undefined } };
      expect(truckOf(x).weather).toBe('rain');
      expect(truckOf(x).rainFromE).not.toBeNull();
    }
    const v = buildProvState({ ...defaultSetup('vinbar'), weather: 'rain' }, SEED);
    expect(truckVillageWeather(v, MILD).precipitation).toBe('rain');
    const auto = buildProvState(defaultSetup('foodtruck'), SEED);
    expect(truckOf({ ...auto, day: { ...auto.day, truck: undefined } }).weather).toBe(truckWeatherFor(SEED, auto.day.dayNumber).weather);
  });

  it('listan har platsens situationer, och den valda kan köas i kväll', () => {
    const ft = provIncidents('foodtruck').map((i) => i.id);
    const vb = provIncidents('vinbar').map((i) => i.id);
    expect(ft).toContain('ft08-regnet');
    expect(vb).toContain('vb40-karaffen');
    expect(provIncidents('bistro').map((i) => i.id)).toEqual(vb);
    const s = buildProvState({ ...defaultSetup('vinbar'), incidentId: 'vb40-karaffen' }, SEED);
    expect(s.prov).toEqual({ weather: null, incidentId: 'vb40-karaffen', incidentDay: s.day.dayNumber });
    // Situationerna slås på när dörrarna öppnar; då köas den (StrategicApp.tsx, som #playtest=1&rocket=).
    const open = { ...s, incidents: { ...s.incidents!, enabled: true } };
    expect(reducer(open, { type: 'QUEUE_INCIDENT', incidentId: 'vb40-karaffen' }).incidents?.queued[0]).toBe('vb40-karaffen');
    // En situation från en annan plats tvingas inte fram.
    expect(buildProvState({ ...defaultSetup('vinbar'), incidentId: 'ft08-regnet' }, SEED).prov?.incidentId).toBeNull();
  });

  it('ett provspel sparas inte', () => {
    const s = buildProvState(defaultSetup('vinbar'), SEED);
    const next = { ...s, day: { ...s.day, dayNumber: s.day.dayNumber + 7 } };
    expect(savesForDayChange(s.day.dayNumber, next)).toEqual([]);
  });
});
