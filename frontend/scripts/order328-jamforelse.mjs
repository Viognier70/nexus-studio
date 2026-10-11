// ORDER 328 F — spelartyperna på merge-committarna för ORDER 320–325 (o320 … o325, alla 17 rader, 40 frön), och
// avsmalningen med bara 0,6-raderna: b322b3 (6124209e, 322b3 före 323), b323s4 (fbd6bac0, före 323 §5), b323s5
// (281ff99b, 323 §5) och försöket x323utanplats (0ba2c48d med fikats platsfilter, sim/fika.ts eligibleDilemmas,
// bortkopplat). Läser reports/order328/<namn>/*.json och skriver reports/order328/jamforelse.json: per körning och rad
// säsonger som nådde vinbaren, medianveckan dit, stängda säsonger, medelryktet vid avräkningen vecka för vecka, och
// fikat i foodtrucken om rapporten har det.
//
//   node scripts/order328-jamforelse.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports', 'order328');
const RUNS = { o320: '24f6485c', o321: '336ad09d', o322: '492d177f', b322b3: '6124209e', b323s4: 'fbd6bac0', b323s5: '281ff99b', o323: '0ba2c48d', x323utanplats: '0ba2c48d utan fikats platsfilter', o324: 'bff029cd', o325: '9020fa65' };
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const out = {};
for (const [run, rev] of Object.entries(RUNS)) {
  const dir = resolve(R, run);
  if (!existsSync(dir)) continue;
  const rows = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const p = Object.values(JSON.parse(readFileSync(resolve(dir, f), 'utf8')).players)[0];
    rows[f.replace(/\.json$/, '')] = { reachedVinbar: p.ladder?.reachedVinbar ?? null, vinbarWeekMedian: median(p.ladder?.vinbarWeeks), closed: p.closed, meanRepAtSettlement: p.meanRepAtSettlement, meanCashEnd: p.meanCashEnd };
  }
  out[run] = { rev, rows };
}
writeFileSync(resolve(R, 'jamforelse.json'), JSON.stringify({ definition: 'Per körning (rev) och rad: reachedVinbar = säsonger av 40 som nådde vinbaren, vinbarWeekMedian = medianveckan dit, closed = stängda säsonger, meanRepAtSettlement = medelryktet vid veckans avräkning vecka 1–8, meanCashEnd = medelkassan vid säsongens slut (kr). Vinbaren kräver ryktet 0,5 (balance.ts LADDER.requirements.vinbar).', runs: out }, null, 2) + '\n');
for (const [run, v] of Object.entries(out)) console.log(run.padEnd(15), Object.entries(v.rows).filter(([k]) => k.endsWith('0.6')).map(([k, r]) => `${k} ${r.reachedVinbar}`).join('  '));
