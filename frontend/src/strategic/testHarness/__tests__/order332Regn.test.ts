// ORDER 332 C — kön vid vagnen i regnet (balance.ts RAIN_QUEUE_BALANCE): en regnkväll i spelarens flöde, med och utan
// markisen, för flera inställningar. Körs bara med REGN_SEEDS (t.ex. REGN_SEEDS=8 npx vitest run <den här filen>) och
// skriver reports/order332/regn.json. Talen i balance.ts-kommentaren och rapporten läses ur den filen.

import { describe, expect, it } from 'vitest';
import { playMorning, startInFoodtruck, tickUntil } from '../weekHarness';
import { reducer } from '../../simulation/reducer';
import { firstDayOfWeek } from '../../../sim/calendar';
import { RAIN_QUEUE_BALANCE } from '../../../sim/balance';
import { truckOf } from '../../../sim/truckLife';

const SEEDS = Number(process.env.REGN_SEEDS ?? 0);

describe.skipIf(!process.env.REGN_SEEDS)('ORDER 332 C — kön i regnet, provet (reports/order332/regn.json)', () => {
  it('notorna, de som gick ur kön i regnet och kassan efter kvällen, per inställning och markis', async () => {
    const B = RAIN_QUEUE_BALANCE as unknown as { patienceRain: number; leaveAt: number };
    const current = { patienceRain: B.patienceRain, leaveAt: B.leaveAt };
    const settings: { name: string; patienceRain: number; leaveAt: number }[] = [
      { name: 'utan verkan', patienceRain: 1, leaveAt: Number.MAX_SAFE_INTEGER },
      { name: `balance.ts ${current.patienceRain}/${current.leaveAt}`, ...current },
      { name: '0.85/8', patienceRain: 0.85, leaveAt: 8 },
      { name: '0.85/6', patienceRain: 0.85, leaveAt: 6 },
      { name: '0.8/8', patienceRain: 0.8, leaveAt: 8 },
      { name: '0.75/10', patienceRain: 0.75, leaveAt: 10 }
    ];
    const seeds = Array.from({ length: SEEDS }, (_, i) => i + 1);
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const evening = (seed: number, awning: boolean) => {
      let s = startInFoodtruck(seed, firstDayOfWeek(2) + 4);
      s = { ...s, equipment: awning ? ['queueAwning'] : [] };
      s = playMorning(s, { scenarioAnswer: 'best', ladder: 'never' });
      s = { ...s, day: { ...s.day, truck: { ...truckOf(s), weather: 'rain', rainFromE: 0 } } };
      s = reducer(s, { type: 'START_SERVICE' });
      let bills = 0, leavers = 0;
      const p0 = s.day.period;
      s = tickUntil(s, (x) => x.day.period !== p0, 'best', undefined, undefined, (x) => {
        bills = Math.max(bills, x.day.billsTonight ?? 0);
        leavers = Math.max(leavers, x.day.truckRainLeavers ?? 0);
        return x;
      });
      return { bills, leavers, endCash: Math.round(s.cash) };
    };
    const rows: Record<string, unknown>[] = [];
    try {
      for (const st of settings) {
        B.patienceRain = st.patienceRain;
        B.leaveAt = st.leaveAt;
        const per: Record<string, { bills: number[]; leavers: number[]; endCash: number[] }> = {};
        for (const awning of [false, true]) {
          const r = seeds.map((seed) => evening(seed, awning));
          per[awning ? 'medMarkis' : 'utanMarkis'] = { bills: r.map((x) => x.bills), leavers: r.map((x) => x.leavers), endCash: r.map((x) => x.endCash) };
        }
        const m = (k: 'utanMarkis' | 'medMarkis') => ({ bills: mean(per[k].bills), leavers: mean(per[k].leavers), endCash: mean(per[k].endCash), perSeed: per[k] });
        const without = m('utanMarkis'), withA = m('medMarkis');
        rows.push({
          setting: st.name, patienceRain: st.patienceRain, leaveAt: st.leaveAt === Number.MAX_SAFE_INTEGER ? null : st.leaveAt,
          utanMarkis: without, medMarkis: withA,
          markisensVinst: { bills: withA.bills - without.bills, leavers: withA.leavers - without.leavers, endCash: withA.endCash - without.endCash }
        });
      }
    } finally {
      B.patienceRain = current.patienceRain;
      B.leaveAt = current.leaveAt;
    }
    const off = rows[0] as { utanMarkis: { bills: number; endCash: number } };
    for (const r of rows as { utanMarkis: { bills: number; endCash: number }; kostnadUtanMarkis?: unknown }[]) {
      r.kostnadUtanMarkis = { bills: r.utanMarkis.bills - off.utanMarkis.bills, billsShare: r.utanMarkis.bills / off.utanMarkis.bills - 1, endCash: r.utanMarkis.endCash - off.utanMarkis.endCash };
    }
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { dirname, resolve } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order332');
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, 'regn.json'), JSON.stringify({
      definition: 'En regnkväll vid foodtrucken i spelarens flöde: startInFoodtruck(frö, vecka 2 fredag), morgonen med bästa svar (playMorning), vädret regn från kvällens början (rainFromE 0), START_SERVICE och tickUntil till kvällens slut. Fröna 1–REGN_SEEDS. Per inställning av RAIN_QUEUE_BALANCE (patienceRain/leaveAt; "utan verkan" = 1 och ingen gräns) utan och med markisen (equipment queueAwning). bills = kvällens notor (day.billsTonight), leavers = gäster som gick ur kön i regnet (day.truckRainLeavers), endCash = kassan efter kvällen (alla börjar med samma kassa). markisensVinst = med markis minus utan; kostnadUtanMarkis = utan markis minus "utan verkan" (billsShare = andel av notorna).',
      seeds, current, rows
    }, null, 2) + '\n');
    expect(rows.length).toBe(settings.length);
  });
});
