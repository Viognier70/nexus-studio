// ORDER 315b — foodtruckens ekonomi i harness (förslaget ORDER_315_FORSLAG.md §2):
// gäster per kväll, notan per gäst, varornas andel, lönerna, platsens avgift och
// veckans resultat, för den bästa, den halva och alltid fel. Säsongen börjar som
// spelarens flöde (weekHarness.ts startInFoodtruck) och spelaren stannar i
// foodtrucken (ladder: 'never'), så att veckorna mäter foodtrucken.
//
//   ORDER315B_OUT=<namn> [FT_SEEDS=8] [FT_WEEKS=3] npx vitest run src/strategic/testHarness/__tests__/order315bFoodtruck.test.ts
//   → reports/order315b/<namn>.json

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playDay, playMorning, startInFoodtruck, type ScenarioAnswer } from '../weekHarness';
import { dailyGuestCap } from '../../../sim/economy';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import type { SimulationState } from '../../types';

const SEEDS = Array.from({ length: Number(process.env.FT_SEEDS ?? 8) }, (_, i) => i + 1);
const WEEKS = Number(process.env.FT_WEEKS ?? 3);
// Foodtrucken har ingen frågebank än (315c): spelaren svarar på scenariot vid
// dörren, bäst, varannan dag eller sämst.
const PLAYERS: Record<string, { answer: ScenarioAnswer }> = {
  basta: { answer: 'best' }, halva: { answer: 'half' }, 'alltid-fel': { answer: 'worst' }
};

interface Evening { cap: number; guests: number; revenueSek: number; billSek: number; goodsSek: number; wagesSek: number; resultSek: number }

function season(seed: number, answer: ScenarioAnswer) {
  let s: SimulationState = startInFoodtruck(seed, firstDayOfWeek(1));
  const evenings: Evening[] = [];
  const weeks: { week: number; resultSek: number; revenueSek: number; rentSek: number; cashEnd: number }[] = [];
  let weekStart = s.cash;
  let last = -1;
  for (let d = 0; d < WEEKS * 7; d++) {
    const service = calendarFor(s.day.dayNumber).isServiceDay;
    const before = s;
    const cap = service ? dailyGuestCap(playMorning(s, { scenarioAnswer: answer, ladder: 'never' })) : 0;
    const r = playDay(s, { scenarioAnswer: answer, ladder: 'never' });
    s = r.state;
    if (service) {
      const rev = Math.round(s.revenue - before.revenue);
      const tr = s.economy.eveningResults?.at(-1);
      const led = s.ledger.slice(before.ledger.length);
      const sum = (cat: string) => -Math.round(led.filter((l) => l.category === cat && l.amount < 0).reduce((a, l) => a + l.amount, 0));
      evenings.push({ cap, guests: r.guests, revenueSek: rev, billSek: r.guests > 0 ? Math.round(rev / r.guests) : 0, goodsSek: sum('ingredient'), wagesSek: sum('wage'), resultSek: tr?.resultSek ?? 0 });
    }
    const st = s.economy.lastSettlement;
    if (st && st.week !== last) {
      last = st.week;
      weeks.push({ week: st.week, resultSek: Math.round(s.cash - weekStart), revenueSek: st.revenueSek, rentSek: st.rentSek ?? 0, cashEnd: Math.round(s.cash) });
      weekStart = s.cash;
    }
  }
  return { seed, class: s.economy.businessClass, loan: s.economy.loan, evenings, weeks, team: s.team.members.map((m) => m.role) };
}

describe.skipIf(!process.env.ORDER315B_OUT)('ORDER 315b — foodtruckens ekonomi', () => {
  it('veckorna i foodtrucken', () => {
    const out: Record<string, unknown> = {};
    for (const [name, p] of Object.entries(PLAYERS)) {
      const runs = SEEDS.map((seed) => season(seed, p.answer));
      const ev = runs.flatMap((r) => r.evenings);
      const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
      const byWeek = Array.from({ length: WEEKS }, (_, i) => {
        const ws = runs.map((r) => r.weeks[i]).filter(Boolean);
        return { week: i + 1, meanResultSek: mean(ws.map((w) => w.resultSek)), meanRevenueSek: mean(ws.map((w) => w.revenueSek)), rentSek: ws[0]?.rentSek ?? 0, meanCashEnd: mean(ws.map((w) => w.cashEnd)) };
      });
      out[name] = {
        capPerEvening: mean(ev.map((e) => e.cap)),
        guestsPerEvening: { mean: mean(ev.map((e) => e.guests)), min: Math.min(...ev.map((e) => e.guests)), max: Math.max(...ev.map((e) => e.guests)) },
        billSek: mean(ev.filter((e) => e.guests > 0).map((e) => e.billSek)),
        revenuePerEveningSek: mean(ev.map((e) => e.revenueSek)),
        goodsShare: +(ev.reduce((a, e) => a + e.goodsSek, 0) / Math.max(1, ev.reduce((a, e) => a + e.revenueSek, 0))).toFixed(2),
        wagesPerEveningSek: mean(ev.map((e) => e.wagesSek)),
        byWeek, team: runs[0].team, loan: runs[0].loan, class: runs[0].class
      };
    }
    const file = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order315b', `${process.env.ORDER315B_OUT}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ definition: 'Foodtrucken från inträdet (weekHarness.ts startInFoodtruck), spelaren stannar kvar. guestsPerEvening: gäster som kom (playDay guests); billSek: kvällens intäkt per gäst; goodsShare: råvarornas rader i kassaboken (ingredient) mot intäkten; wagesPerEveningSek: lönerna (wage); byWeek: kassans förändring per vecka, veckans intäkt och platsens avgift (lastSettlement.rentSek).', seeds: SEEDS, weeks: WEEKS, players: out }, null, 2) + '\n');
    expect(Object.keys(out)).toHaveLength(3);
  }, 3600000);
});
