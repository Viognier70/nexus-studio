// ORDER 319b.4 (Anders 2026-10-07) — "Harness: mät hur mycket de nyfikna gästerna lägger till i intäkt
// för spelartyperna. De ska ge en tydlig skillnad mellan den som kan och den som inte kan, men inte bli
// den största inkomstkällan."
//
// Tre spelartyper i foodtrucken, samma kvällar (fast fröslump, vecka 1, alla servicedagar):
//   - kan: klickar på den nyfikna efter reactionSeconds och svarar rätt;
//   - gissar: klickar lika fort och väljer ett av svaren på måfå (fast slump per fråga);
//   - klickar inte: låter de nyfikna gå förbi.
// Situationerna svaras rätt för alla tre. Intäkten från de nyfikna är notorna från gästerna som kom via
// en nyfiken (day.curiousRevenueSek, sim/curious.ts recordCuriousRevenue); kvällens intäkt är
// serviceRevenueToday.dinner. Resten är de andra gästernas notor och situationernas merbeställningar.
//
//   WRITE_REPORTS=1 CURIOUS_SEEDS=6 npx vitest run src/strategic/testHarness/__tests__/order319bNyfikna.test.ts
// skriver reports/order319b/nyfikna.json.

import { describe, expect, it } from 'vitest';
import { answerScenario, playMorning, startInFoodtruck } from '../weekHarness';
import { reducer } from '../../simulation/reducer';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { WEEK } from '../../../sim/balance';
import { curiousOf, curiousTalkable } from '../../../sim/curious';
import { incidentBankFor } from '../../../sim/incidentBank';
import { hashKey } from '../../util/hash';
import type { SimulationState } from '../../types';

type Player = 'kan' | 'gissar' | 'klickar inte';
const PLAYERS: Player[] = ['kan', 'gissar', 'klickar inte'];
/** Spelaren hinner se gästen och klicka (verkliga sekunder efter att gästen saktat in). */
const REACTION_S = 3;
const TICK_S = 0.2;
const MAX_TICKS = 40000;

interface Evening { seed: number; day: number; revenueSek: number; curiousSek: number; situationsSek: number; bills: number; collapsed: boolean; t: ReturnType<typeof curiousOf>['tonight'] }

function evening(seed: number, day: number, p: Player): Evening {
  let s: SimulationState = reducer(playMorning(startInFoodtruck(seed, day), { scenarioAnswer: 'best', ladder: 'never' }), { type: 'START_SERVICE' });
  // Kvällens intäkt läses medan servicen pågår: en kollaps för över den till kvällens räkning och nollar
  // serviceRevenueToday (strategic/simulation/collapse.ts).
  let revenue = 0;
  for (let i = 0; i < MAX_TICKS && s.day.period === 'dinner'; i++) {
    revenue = Math.max(revenue, s.serviceRevenueToday.dinner);
    s = answerScenario(reducer(s, { type: 'TICK', dt: TICK_S }), 'best');
    if (s.day.period === 'dinner') revenue = Math.max(revenue, s.serviceRevenueToday.dinner);
    const c = curiousOf(s).current;
    if (p !== 'klickar inte' && c && curiousTalkable(s) && c.real >= REACTION_S) s = reducer(s, { type: 'CURIOUS_OPEN' });
    const card = curiousOf(s).current?.card;
    if (card) {
      const step = incidentBankFor('foodtruck').find((x) => x.id === card.incidentId)!.steps[card.step];
      const pick = p === 'kan' ? step.options.find((o) => o.quality === 'best')! : step.options[Math.floor(hashKey(seed, `${day}|${card.question}|${curiousOf(s).current!.seq}`) * step.options.length)];
      s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: pick.id });
    }
  }
  const situationsSek = (s.incidents?.log ?? []).reduce((a, r) => a + Math.max(0, r.deltas?.cashSek ?? 0), 0);
  return { seed, day, revenueSek: Math.round(revenue * 1000), bills: s.day.billsTonight ?? 0, collapsed: !!s.day.serviceCollapsed, curiousSek: Math.round(s.day.curiousRevenueSek ?? 0), situationsSek: Math.round(situationsSek), t: curiousOf(s).tonight };
}

function sum(xs: Evening[], f: (e: Evening) => number): number { return xs.reduce((a, e) => a + f(e), 0); }

describe('ORDER 319b.4 — vad de nyfikna lägger till i intäkt', () => {
  it('den som kan får fler gäster av de nyfikna än den som gissar, och den som inte klickar inga; de nyfikna är inte den största källan', async () => {
    const seeds = Number(process.env.CURIOUS_SEEDS ?? 1);
    const days: number[] = [];
    for (let d = firstDayOfWeek(1); d < firstDayOfWeek(1) + WEEK.daysPerWeek; d++) if (calendarFor(d).isServiceDay) days.push(d);
    const runs: Record<Player, Evening[]> = { kan: [], gissar: [], 'klickar inte': [] };
    for (let seed = 1; seed <= seeds; seed++) for (const d of days.slice(0, seeds > 1 ? days.length : 2)) for (const p of PLAYERS) runs[p].push(evening(seed, d, p));
    const summary = Object.fromEntries(PLAYERS.map((p) => {
      const xs = runs[p], n = xs.length;
      const revenue = sum(xs, (e) => e.revenueSek), curious = sum(xs, (e) => e.curiousSek), situations = sum(xs, (e) => e.situationsSek);
      const count = (k: keyof Evening['t']) => +(sum(xs, (e) => e.t[k]) / n).toFixed(2);
      return [p, {
        evenings: n,
        revenuePerEveningSek: Math.round(revenue / n),
        curiousPerEveningSek: Math.round(curious / n),
        curiousShare: +(curious / Math.max(1, revenue)).toFixed(3),
        otherGuestsPerEveningSek: Math.round((revenue - curious - situations) / n),
        situationsPerEveningSek: Math.round(situations / n),
        billsPerEvening: +(sum(xs, (e) => e.bills) / n).toFixed(2),
        collapsedEvenings: xs.filter((e) => e.collapsed).length,
        perEvening: { passersBy: count('passersBy'), talked: count('talked'), right: count('right'), ok: count('ok'), wrong: count('wrong'), unanswered: count('unanswered'), joined: count('joined'), friends: count('friends'), queueFull: count('queueFull') }
      }];
    })) as unknown as Record<Player, { curiousPerEveningSek: number; otherGuestsPerEveningSek: number; situationsPerEveningSek: number; revenuePerEveningSek: number; curiousShare: number }>;
    // Nettot kväll för kväll mot den som inte klickar (samma frö och dag), för kvällar där ingen av de två
    // föll ihop: kollapsens slump följer simuleringens slumpflöde, som skiljer sig när fler gäster kommer.
    const paired = (p: Player) => runs[p].map((e, i) => ({ e, o: runs['klickar inte'][i] })).filter(({ e, o }) => !e.collapsed && !o.collapsed);
    const net = (p: Player) => { const xs = paired(p); return { evenings: xs.length, netGainPerEveningSek: Math.round(xs.reduce((a, { e, o }) => a + e.revenueSek - o.revenueSek, 0) / Math.max(1, xs.length)), curiousPerEveningSek: Math.round(xs.reduce((a, { e }) => a + e.curiousSek, 0) / Math.max(1, xs.length)), extraBillsPerEvening: +(xs.reduce((a, { e, o }) => a + e.bills - o.bills, 0) / Math.max(1, xs.length)).toFixed(2) }; };
    const pairedNet = { kan: net('kan'), gissar: net('gissar') };
    if (process.env.WRITE_REPORTS) {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order319b');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'nyfikna.json'), JSON.stringify({
        definition: 'Foodtruckens kvällar vecka 1 (startInFoodtruck, ladder never, situationerna rätt), samma frön för alla tre spelartyperna. kan: klickar efter 3 s och svarar rätt; gissar: klickar efter 3 s och väljer på måfå; klickar inte: låter dem gå. curiousPerEveningSek = day.curiousRevenueSek (notorna från gästerna som kom via en nyfiken); revenuePerEveningSek = serviceRevenueToday.dinner medan servicen pågår (en kollaps nollar den); collapsedEvenings = kvällar som föll ihop (day.serviceCollapsed); situationsPerEveningSek = summan av incidents.log deltas.cashSek; otherGuestsPerEveningSek = resten.',
        pairedNetDefinition: 'Kvällens intäkt minus samma kväll (frö och dag) för den som inte klickar, bara kvällar där ingen av de två föll ihop. curiousPerEveningSek: notorna från gästerna via de nyfikna samma kvällar; skillnaden mot nettot är gästerna som de nyfikna tog platsen för i kön.',
        seeds, reactionSeconds: REACTION_S, summary, pairedNet, evenings: runs
      }, null, 2) + '\n');
    }
    const k = summary.kan, g = summary.gissar, n = summary['klickar inte'];
    expect(n.curiousPerEveningSek).toBe(0);
    expect(k.curiousPerEveningSek).toBeGreaterThan(g.curiousPerEveningSek);
    expect(g.curiousPerEveningSek).toBeGreaterThan(0);
    // En tydlig skillnad: med fler kvällar får den som kan minst dubbelt så mycket av de nyfikna som den som gissar.
    if (seeds >= 4) expect(k.curiousPerEveningSek).toBeGreaterThan(2 * g.curiousPerEveningSek);
    // Inte den största källan: de andra gästernas notor är större.
    expect(k.curiousPerEveningSek).toBeLessThan(k.otherGuestsPerEveningSek);
    // Med fler kvällar (CURIOUS_SEEDS ≥ 4): kvällens netto är större för den som kan än för den som gissar.
    if (seeds >= 4) expect(pairedNet.kan.netGainPerEveningSek).toBeGreaterThan(pairedNet.gissar.netGainPerEveningSek);
  }, 600000);
});
