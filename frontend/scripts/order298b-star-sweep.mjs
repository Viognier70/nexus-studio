// ORDER 298b — stjärnans gränser prövade mot samma veckor. Läser
// reports/order298b/stjarna-data-{085,075,060}.json (stjärnspelaren med 0,85,
// 0,75 och 0,6 rätt per steg, 40 säsonger, varje avräknings rykte, klarade
// raketer, andel rätta steg, antal raketer och veckan med guld i Teatern) och
// räknar regeln i sim/economy.ts settleWeek: guld i Teatern, ryktet minst R,
// minst STAR.minRocketsInWeek raketer och omdömet minst J, tre veckor i rad.
// Avvikelse mot spelet: stjärnans tredje plats i facket påverkar inte veckorna
// här (de spelades med andra gränser); kontrollkörningen med de valda
// gränserna står i stjarna-{085,075,06}.json.
//
//   node scripts/order298b-star-sweep.mjs  → reports/order298b/stjarna-svep.json
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../reports/order298b');
const load = (k) => JSON.parse(readFileSync(resolve(DIR, `stjarna-data-${k}.json`), 'utf8')).players.stjarna.runs;
const data = { '0.85': load('085'), '0.75': load('075'), '0.6': load('060') };
const WEEKS = 3, MIN_ROCKETS = 5;
function outcome(runs, R, J, measure) {
  const weeks = [];
  for (const r of runs) {
    let q = 0;
    for (const w of r.starWeeks) {
      const gold = r.goldWeek !== null && w.week >= r.goldWeek;
      const m = measure === 'steg' ? w.stepShare : w.judgement;
      q = gold && w.reputation >= R && w.rockets >= MIN_ROCKETS && m >= J ? q + 1 : 0;
      if (q >= WEEKS) { weeks.push(w.week); break; }
    }
  }
  return { share: +(weeks.length / runs.length).toFixed(2), meanWeek: weeks.length ? +(weeks.reduce((a, b) => a + b, 0) / weeks.length).toFixed(2) : null };
}
const level = Object.fromEntries(Object.entries(data).map(([k, runs]) => {
  const all = runs.flatMap((r) => r.starWeeks);
  const avg = (f) => +(all.reduce((a, w) => a + w[f], 0) / all.length).toFixed(3);
  return [k, { reputation: avg('reputation'), judgement: avg('judgement'), stepShare: avg('stepShare'), rockets: avg('rockets') }];
}));
const rows = [];
for (const measure of ['raketer', 'steg'])
  for (const R of [0.2, 0.25, 0.28, 0.3, 0.32, 0.34, 0.36])
    for (const J of measure === 'steg' ? [0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82] : [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7]) {
      const r = { measure, reputationAtLeast: R, judgementAtLeast: J, skill085: outcome(data['0.85'], R, J, measure), skill075: outcome(data['0.75'], R, J, measure), skill06: outcome(data['0.6'], R, J, measure) };
      r.meetsGoals = r.skill085.share >= 0.7 && r.skill085.meanWeek >= 5 && r.skill085.meanWeek <= 6.5 && r.skill075.share >= 0.2 && r.skill075.share <= 0.4 && r.skill06.share === 0;
      rows.push(r);
    }
writeFileSync(resolve(DIR, 'stjarna-svep.json'), JSON.stringify({ definition: 'Stjärnans regel räknad på stjärnspelarens veckor (40 säsonger per skicklighet). Målen (Vision Owner 2026-10-03): 0,85 per steg minst 70 % i snitt vecka 5–6 (här 5–6,5), 0,75 20–40 %, 0,6 aldrig. measure: raketer = andel klarade raketer, steg = andel rätta steg.', level, meetsGoals: rows.filter((r) => r.meetsGoals), rows }, null, 2) + '\n');
console.log(JSON.stringify({ level, meetsGoals: rows.filter((r) => r.meetsGoals).map((r) => [r.measure, r.reputationAtLeast, r.judgementAtLeast, r.skill085, r.skill075, r.skill06]) }));
