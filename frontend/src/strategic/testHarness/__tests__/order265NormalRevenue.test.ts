// ORDER 265 (Nexus v1 etapp 3) — mätning: normal veckointäkt per klass.
//
// Speldesign > Golvet: "Veckogolvet är G procent av klassens normala
// veckointäkt." Speldesignen anger inte intäkten (F8). Den mäts här med
// veckoharnessen: en spelare utan satsningar och utan paviljongsbesök
// spelar vecka 1–3; intäkten i vecka 2 och 3 (utan första veckans
// lägre gästfaktor) tas som normal veckointäkt. Medianen över frön.
// Mätningen görs utan marknadstak och utan v1-lån (före etapp 3:s
// ekonomi), så att den mäter vad rummet drar av sig självt.
// Utdata: reports/order265/normal-weekly-revenue.json. Talen förs in i
// balance.ts ECONOMY.normalWeeklyRevenueSek med hänvisning hit.

import { it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWeeks } from '../weekHarness';
import type { SimulationState } from '../../types';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order265');
const CLASSES: SimulationState['businessClass'][] = ['vinbaren', 'kvarterskrogen', 'ölkrogen', 'foodtrucken', 'gästgiveriet'];
const SEEDS = [11, 22, 33];
const RUN = process.env.ORDER265_MEASURE === '1';

it.runIf(RUN)('mäter normal veckointäkt per klass', () => {
  const result: Record<string, { weeklyRevenue: number[]; median: number; guestsPerWeek: number[] }> = {};
  for (const cls of CLASSES) {
    const weekly: number[] = [];
    const guests: number[] = [];
    for (const seed of SEEDS) {
      // Utan marknadens tak: mätningen gäller vad rummet drar av sig självt.
      const run = runWeeks({ seed, weeks: 3, plan: () => ({}), setup: (s) => ({ ...s, businessClass: cls, policies: { ...s.policies, marketCapEnabled: false } }) });
      for (const w of [2, 3]) {
        const days = run.days.filter((d) => d.week === w);
        weekly.push(days.reduce((a, d) => a + d.revenue, 0));
        guests.push(days.reduce((a, d) => a + d.guests, 0));
      }
    }
    const sorted = [...weekly].sort((a, b) => a - b);
    const median = (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2;
    result[cls] = { weeklyRevenue: weekly, median: Math.round(median), guestsPerWeek: guests };
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, 'normal-weekly-revenue.json'), JSON.stringify({ seeds: SEEDS, weeks: [2, 3], result }, null, 2) + '\n');
}, 3_600_000);
