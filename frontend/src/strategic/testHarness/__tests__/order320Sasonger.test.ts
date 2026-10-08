// ORDER 320 (Anders 2026-10-08, ORDER_320_FOODTRUCK_SITUATIONER.md "Harness: kör 40 säsonger och rapportera:
// antal olika situationer per kväll; hur ofta samma situation kommer två kvällar i rad; att målen från 315c
// fortfarande håller") — foodtrucken i SEASONS säsonger à WEEKS veckor, från inträdet, med spelaren som svarar
// rätt och stannar i foodtrucken (ladder 'never'). Målen från 315c mäts med order296Karnan.test.ts
// (scripts/order320-harness.sh).
//
//   SEASONS=40 WEEKS=3 WRITE_REPORTS=1 npx vitest run src/strategic/testHarness/__tests__/order320Sasonger.test.ts
// skriver reports/order320/sasonger.json.

import { describe, expect, it } from 'vitest';
import { playDay, playMorning, startInFoodtruck, tickUntil, type MorningPlan } from '../weekHarness';
import { reducer } from '../../simulation/reducer';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { PLAYERS } from '../randomness';
import { truckOf } from '../../../sim/truckLife';
import { SITUATIONS } from '../../../sim/balance';
import type { SimulationState } from '../../types';

const NEW = ['ft08-regnet', 'ft09-getingen', 'ft10-kortet', 'ft11-slut', 'ft12-hunden', 'ft13-priset'];

interface Evening { season: number; day: number; weather: string; collapsed: boolean; ids: string[]; lines: Record<string, string> }

function season(seed: number, weeks: number): Evening[] {
  const out: Evening[] = [];
  const plan: MorningPlan = { scenarioAnswer: 'best', ladder: 'never' };
  let s: SimulationState = startInFoodtruck(seed, firstDayOfWeek(1));
  s = { ...s, medals: { ...PLAYERS.baseline } };
  for (let d = 0; d < weeks * 7; d++) {
    if (calendarFor(s.day.dayNumber).isServiceDay && s.economy.businessClass === 'foodtruck') {
      const open = reducer(playMorning(s, plan), { type: 'START_SERVICE' });
      let last = open;
      const eve = tickUntil(open, (x) => { const done = x.day.period === 'evening' || x.day.period === 'morning'; if (!done) last = x; return done; });
      const log = eve.incidents?.log ?? [];
      out.push({ season: seed, day: s.day.dayNumber, weather: truckOf(last).weather, collapsed: !!(eve.day.serviceCollapsed || last.day.serviceCollapsed), ids: log.map((r) => r.id), lines: Object.fromEntries(log.filter((r) => r.line).map((r) => [r.id, r.line!])) });
    }
    s = playDay(s, plan).state;
  }
  return out;
}

const mean = (xs: number[]) => +(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(2);

describe('ORDER 320 — situationerna i foodtrucken över 40 säsonger', () => {
  it('olika situationer per kväll, och samma två kvällar i rad', async () => {
    const seasons = Number(process.env.SEASONS ?? 2);
    const weeks = Number(process.env.WEEKS ?? 1);
    const ev: Evening[] = [];
    for (let seed = 1; seed <= seasons; seed++) ev.push(...season(seed, weeks));
    expect(ev.length).toBeGreaterThan(0);
    // Inom en kväll kommer samma situation aldrig två gånger.
    for (const e of ev) expect(new Set(e.ids).size).toBe(e.ids.length);
    // Två kvällar i rad (samma säsong, nästa servicekväll): situationer som kom båda kvällarna.
    const pairs = ev.slice(1).map((e, i) => ({ prev: ev[i], e })).filter((p) => p.prev.season === p.e.season);
    const repeats = pairs.map((p) => p.e.ids.filter((id) => p.prev.ids.includes(id)).length);
    if (!process.env.WRITE_REPORTS) return;
    const whole = ev.filter((e) => !e.collapsed);
    const hist = (xs: number[]) => xs.reduce<Record<number, number>>((h, n) => ({ ...h, [n]: (h[n] ?? 0) + 1 }), {});
    const perSituation = Object.fromEntries([...new Set(ev.flatMap((e) => e.ids))].sort().map((id) => [id, ev.filter((e) => e.ids.includes(id)).length]));
    const newByWeather = Object.fromEntries(NEW.map((id) => [id, ev.filter((e) => e.ids.includes(id)).reduce<Record<string, number>>((h, e) => ({ ...h, [e.weather]: (h[e.weather] ?? 0) + 1 }), {})]));
    // Repliken: samma situation två gånger i rad i en säsong, samma variant?
    let lineRepeats = 0, linePairs = 0;
    for (let seed = 1; seed <= seasons; seed++) {
      const last: Record<string, string> = {};
      for (const e of ev.filter((x) => x.season === seed)) for (const [id, l] of Object.entries(e.lines)) { if (last[id]) { linePairs++; if (last[id] === l) lineRepeats++; } last[id] = l; }
    }
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order320');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'sasonger.json'), JSON.stringify({
      definition: 'Foodtrucken i SEASONS säsonger (frö 1..SEASONS) à WEEKS veckor från inträdet (startInFoodtruck, medaljerna PLAYERS.baseline, rätt svar, ladder never). distinctPerEvening: olika situationer en kväll (incidents.log); whole: kvällar som inte föll ihop (collapse.ts); repeats: situationer som kom också föregående servicekväll i samma säsong; perSituation: antal kvällar varje situation kom; newByWeather: de sex nya per väder vid vagnen; lines: gästens replik när samma situation kom igen i säsongen (sameAsLast = samma variant).',
      seasons, weeks, evenings: ev.length, collapsedEvenings: ev.length - whole.length,
      distinctPerEvening: { all: { mean: mean(ev.map((e) => e.ids.length)), histogram: hist(ev.map((e) => e.ids.length)) }, whole: { mean: mean(whole.map((e) => e.ids.length)), histogram: hist(whole.map((e) => e.ids.length)), target: [SITUATIONS.minPerEvening, SITUATIONS.maxPerEvening] } },
      repeats: { eveningPairs: pairs.length, pairsWithRepeat: repeats.filter((n) => n > 0).length, share: +(repeats.filter((n) => n > 0).length / Math.max(1, pairs.length)).toFixed(3), situationsRepeated: repeats.reduce((a, b) => a + b, 0), meanPerPair: mean(repeats) },
      perSituation, newByWeather,
      lines: { pairs: linePairs, sameAsLast: lineRepeats },
      rows: ev
    }, null, 2) + '\n');
  }, 7200000);
});
