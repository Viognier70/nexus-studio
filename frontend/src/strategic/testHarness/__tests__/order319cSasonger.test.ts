// ORDER 319c (Anders 2026-10-08: "Kollapserna: mät det igen med 40 säsonger i 319c") — foodtrucken i 40
// säsonger (frön), från inträdet, med spelaren som svarar rätt och stannar i foodtrucken (ladder 'never'). Per
// kväll: vädret vid vagnen (sim/truckLife.ts), om servicen föll ihop (strategic/simulation/collapse.ts, axeln och
// när), situationerna, gästerna, intäkten, de som åt och de som tog maten med sig, skräpet och hur länge luckan
// stod tom (marschallerna och borden).
//
//   SEASONS=40 WEEKS=3 WRITE_REPORTS=1 npx vitest run src/strategic/testHarness/__tests__/order319cSasonger.test.ts
// skriver reports/order319c/sasonger.json. Utan SEASONS: 2 säsonger à 1 vecka, utan rapport.

import { describe, expect, it } from 'vitest';
import { playDay, playMorning, startInFoodtruck, tickUntil, type MorningPlan } from '../weekHarness';
import { reducer } from '../../simulation/reducer';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { PLAYERS } from '../randomness';
import { truckOf, TRUCK_WEATHERS, type TruckWeatherKind } from '../../../sim/truckLife';
import type { SimulationState } from '../../types';

interface Evening {
  season: number; day: number; weather: TruckWeatherKind;
  collapsed: string | null; endedAt: number; situations: number;
  arrived: number; guests: number; maxAtHatch: number; revenueSek: number; eaters: number; takeaway: number; littered: number;
  clearedByAssistant: number; hatchEmptySimSeconds: number; torchStartE: number | null; torchWaited: boolean; curious: number;
}

function season(seed: number, weeks: number): Evening[] {
  const out: Evening[] = [];
  const plan: MorningPlan = { scenarioAnswer: 'best', ladder: 'never' };
  let s: SimulationState = startInFoodtruck(seed, firstDayOfWeek(1));
  s = { ...s, medals: { ...PLAYERS.baseline } };
  for (let d = 0; d < weeks * 7; d++) {
    if (calendarFor(s.day.dayNumber).isServiceDay && s.economy.businessClass === 'foodtruck') {
      const open = reducer(playMorning(s, plan), { type: 'START_SERVICE' });
      let endedAt = 1;
      let last = open;
      let maxAtHatch = 0;
      const eve = tickUntil(open, (x) => {
        maxAtHatch = Math.max(maxAtHatch, x.guests.filter((g) => g.state === 'waiting' || g.state === 'ordering').length);
        const done = x.day.period === 'evening' || x.day.period === 'morning';
        const inc = x.incidents;
        if (done && inc?.doorsOpenAt != null && inc.serviceEndsAt != null) endedAt = (x.simTime - inc.doorsOpenAt) / Math.max(1, inc.serviceEndsAt - inc.doorsOpenAt);
        if (!done) last = x;
        return done;
      });
      const t = truckOf(last);
      out.push({
        season: seed, day: s.day.dayNumber, weather: t.weather,
        collapsed: eve.day.serviceCollapsed || last.day.serviceCollapsed ? (eve.day.collapseAxis ?? last.day.collapseAxis ?? 'okänd') : null,
        endedAt: +Math.min(1, endedAt).toFixed(2), situations: eve.incidents?.log.length ?? 0,
        arrived: last.day.arrivalsToday ?? 0, guests: last.day.billsTonight ?? 0, maxAtHatch, revenueSek: Math.round(eve.revenue - open.revenue),
        eaters: t.tonight.eaters, takeaway: t.tonight.takeaway, littered: t.tonight.littered, clearedByAssistant: t.tonight.clearedByAssistant,
        hatchEmptySimSeconds: Math.round(t.tonight.hatchEmptySimSeconds), torchStartE: t.tonight.torchStartE === null ? null : +t.tonight.torchStartE.toFixed(2), torchWaited: t.tonight.torchWaited,
        curious: last.day.curious?.tonight.passersBy ?? 0
      });
    }
    s = playDay(s, plan).state;
  }
  return out;
}

const mean = (xs: number[]) => +(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(2);

describe('ORDER 319c — 40 säsonger i foodtrucken: kollapserna och vädret', () => {
  it('kvällarna per väder, och kollapserna', async () => {
    const seasons = Number(process.env.SEASONS ?? 2);
    const weeks = Number(process.env.WEEKS ?? 1);
    const ev: Evening[] = [];
    for (let seed = 1; seed <= seasons; seed++) ev.push(...season(seed, weeks));
    expect(ev.length).toBeGreaterThan(0);
    if (!process.env.WRITE_REPORTS) return;
    const collapsed = ev.filter((e) => e.collapsed);
    const byWeather = Object.fromEntries(TRUCK_WEATHERS.map((w) => {
      const xs = ev.filter((e) => e.weather === w);
      return [w, {
        evenings: xs.length, share: +(xs.length / ev.length).toFixed(3),
        arrived: mean(xs.map((e) => e.arrived)), guests: mean(xs.map((e) => e.guests)), unserved: mean(xs.map((e) => e.arrived - e.guests)), maxAtHatch: mean(xs.map((e) => e.maxAtHatch)), revenueSek: mean(xs.map((e) => e.revenueSek)),
        eaters: mean(xs.map((e) => e.eaters)), takeaway: mean(xs.map((e) => e.takeaway)), littered: mean(xs.map((e) => e.littered)),
        hatchEmptySimSeconds: mean(xs.map((e) => e.hatchEmptySimSeconds)), curious: mean(xs.map((e) => e.curious)),
        collapsed: xs.filter((e) => e.collapsed).length
      }];
    }));
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order319c');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'sasonger.json'), JSON.stringify({
      definition: 'Foodtrucken i SEASONS säsonger (frö 1..SEASONS) à WEEKS veckor från inträdet (startInFoodtruck, medaljerna PLAYERS.baseline, rätt svar, ladder never). collapsed = day.collapseAxis när servicen föll ihop (collapse.ts), endedAt = andelen av fönstret doorsOpenAt–serviceEndsAt när servicen slutade, situations = incidents.log.length, arrived = day.arrivalsToday (gästerna som kom), guests = day.billsTonight (som betalade), unserved = arrived − guests, maxAtHatch = flest som väntade eller beställde vid luckan samtidigt, revenueSek = intäkten under kvällen, eaters/takeaway/littered/clearedByAssistant/hatchEmptySimSeconds/torchStartE/torchWaited = day.truck.tonight (sim/truckLife.ts), curious = de nyfikna (day.curious.tonight.passersBy).',
      seasons, weeks, evenings: ev.length,
      collapsed: {
        evenings: collapsed.length, share: +(collapsed.length / ev.length).toFixed(3),
        seasonsWithCollapse: new Set(collapsed.map((e) => e.season)).size,
        axes: collapsed.reduce<Record<string, number>>((h, e) => ({ ...h, [e.collapsed!]: (h[e.collapsed!] ?? 0) + 1 }), {}),
        endedAt: { mean: mean(collapsed.map((e) => e.endedAt)), min: collapsed.length ? Math.min(...collapsed.map((e) => e.endedAt)) : null },
        situationsMean: mean(collapsed.map((e) => e.situations))
      },
      whole: { evenings: ev.length - collapsed.length, situationsMean: mean(ev.filter((e) => !e.collapsed).map((e) => e.situations)) },
      torches: { startE: mean(ev.filter((e) => e.torchStartE !== null).map((e) => e.torchStartE!)), waitedEvenings: ev.filter((e) => e.torchWaited).length },
      byWeather,
      rows: ev
    }, null, 2) + '\n');
  }, 7200000);
});
