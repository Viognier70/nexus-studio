// ORDER 330 G (Anders 2026-10-11) — Jonas vid vagnen: när den extra handen tas in (HIRE_PREP_HAND) står Jonas vid
// grillen och Nils går längs kön och tar beställningarna (fika-vagn-kon svar A). Kön ska synbart gå fortare de
// kvällarna: beställningen vid luckan tar FOODTRUCK.extraHandOrderTime av tiden (service.ts). Mätningen i spelarens
// flöde (startInFoodtruck, playDay, samma morgon med och utan den extra handen) skriver reports/order330/kon.json
// (WRITE_REPORTS=1).

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { FOODTRUCK, MISE_EN_PLACE } from '../balance';
import { playDay, startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import { newQueueWalk, stepQueueWalk } from '../../strategic/scene/village/queueWalk';
import type { SimulationState } from '../../strategic/types';

function evening(seed: number, hand: boolean) {
  let s = startInFoodtruck(seed);
  // Till den första kvällen med service (måndag).
  const waitFrom = new Map<string, number>();
  const waits: number[] = [];
  let bills = 0, walked = 0, maxQueue = 0;
  const onTick = (x: SimulationState) => {
    for (const g of x.guests) {
      if (g.state === 'waiting' && !waitFrom.has(g.id)) waitFrom.set(g.id, x.simTime);
      if ((g.state === 'serving' || g.state === 'paying') && waitFrom.has(g.id)) { waits.push(x.simTime - waitFrom.get(g.id)!); waitFrom.delete(g.id); }
    }
    bills = Math.max(bills, x.day.billsTonight ?? 0);
    walked = Math.max(walked, x.day.walkedCount ?? 0);
    maxQueue = Math.max(maxQueue, x.waitingIds.length);
    return x;
  };
  const out = playDay(s, { ladder: 'never', actions: hand ? [{ type: 'HIRE_PREP_HAND' }] : [], onTick });
  s = out.state;
  const mean = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
  return { seed, hand, guests: out.guests, bills, walked, maxQueue, meanWaitS: +mean.toFixed(1), served: waits.length };
}

describe('ORDER 330 G — Jonas vid grillen, Nils längs kön', () => {
  it('Nils rundan: från gäst till gäst i kön, en stund vid var och en; kön tom: hem till luckans sida', () => {
    const home: [number, number] = [-1.4, 2.65];
    const s = newQueueWalk(home);
    const spots: [number, number][] = [[-1.4, 2.3], [-2.3, 2.3]];
    const acts: string[] = [];
    for (let i = 0; i < 200; i++) acts.push(stepQueueWalk(s, 0.1, spots, home, 0).act);
    expect(acts).toContain('walk');
    expect(acts).toContain('take');
    for (let i = 0; i < 100; i++) stepQueueWalk(s, 0.1, [], home, 0);
    expect(s.at).toEqual(home);
  });

  it('kön går fortare de kvällar Jonas är inne (spelarens flöde, 10 frön)', () => {
    expect(FOODTRUCK.extraHandOrderTime).toBeLessThan(1);
    const rows: ReturnType<typeof evening>[] = [];
    for (let seed = 1; seed <= 10; seed++) rows.push(evening(seed, false), evening(seed, true));
    const sum = (hand: boolean, k: 'bills' | 'walked' | 'meanWaitS') => rows.filter((r) => r.hand === hand).reduce((a, r) => a + r[k], 0);
    const summary = {
      utan: { bills: sum(false, 'bills'), walked: sum(false, 'walked'), meanWaitS: +(sum(false, 'meanWaitS') / 10).toFixed(1) },
      med: { bills: sum(true, 'bills'), walked: sum(true, 'walked'), meanWaitS: +(sum(true, 'meanWaitS') / 10).toFixed(1) }
    };
    expect(summary.med.meanWaitS).toBeLessThan(summary.utan.meanWaitS);
    expect(summary.med.bills).toBeGreaterThanOrEqual(summary.utan.bills);
    if (process.env.WRITE_REPORTS) {
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../reports/order330');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'kon.json'), JSON.stringify({
        definition: 'Första kvällen i foodtrucken (startInFoodtruck, playDay, ladder never), frö 1–10, utan och med den extra handen (HIRE_PREP_HAND på morgonen, ' + MISE_EN_PLACE.extraHandCostSek + ' kr). bills = kvällens notor, walked = gäster som gick ur kön, meanWaitS = medeltiden från att gästen ställde sig i kön till att maten räcktes ut (simsekunder), maxQueue = den längsta kön.',
        extraHandOrderTime: FOODTRUCK.extraHandOrderTime, summary, rows
      }, null, 2));
    }
  }, 600000);
});
