// ORDER 327 C — spelartyperna på main 272327c9 utan och med 306c (scripts/order327-harness.sh, 40 frön per rad).
// Läser reports/order327/utan306c/*.json och reports/order327/med306c/*.json, och reports/order326/efter40/*.json och
// reports/order320/efter40/*.json för jämförelsen med ORDER 326. Skriver reports/order327/jamforelse.json: per rad
// stängda säsonger, medelkassan vid säsongens slut, säsonger som nådde vinbaren och bistron, medianveckan dit, stjärnor,
// och frön där säsongens sista steg (ladder.finalSteps) skiljer mellan utan och med 306c.
//
//   node scripts/order327-jamforelse.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const read = (dir, f) => { try { return JSON.parse(readFileSync(resolve(R, dir, f), 'utf8')); } catch { return null; } };
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const player = (j) => (j ? Object.values(j.players)[0] : null);
const pick = (j) => {
  const p = player(j);
  if (!p) return null;
  return { closed: p.closed, meanCashEnd: p.meanCashEnd, reachedVinbar: p.ladder?.reachedVinbar ?? null, vinbarWeekMedian: median(p.ladder?.vinbarWeeks), reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned };
};
const rows = {};
for (const f of readdirSync(resolve(R, 'order327/med306c')).filter((x) => x.endsWith('.json')).sort()) {
  const utan = read('order327/utan306c', f), med = read('order327/med306c', f);
  const a = player(utan)?.ladder?.finalSteps ?? [], b = player(med)?.ladder?.finalSteps ?? [];
  const seeds = med?.seeds ?? [];
  rows[f.replace(/\.json$/, '')] = {
    order320: pick(read('order320/efter40', f)), order326: pick(read('order326/efter40', f)),
    utan306c: pick(utan), med306c: pick(med),
    finalStepDiffers: seeds.filter((_, i) => a[i] !== b[i])
  };
}
writeFileSync(resolve(R, 'order327/jamforelse.json'), JSON.stringify({ definition: 'utan306c = main 272327c9 med vinbar.meta.json och vinbar.text.*.json från 9020fa65 (före ORDER 326); med306c = main 272327c9. order320/order326 = reports/order320/efter40 och reports/order326/efter40. 40 frön per rad. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), reachedVinbar/reachedBistro = säsonger som nådde steget, vinbarWeekMedian/bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna, finalStepDiffers = frön där säsongens sista steg skiljer mellan utan306c och med306c.', rows }, null, 2) + '\n');
const short = (v) => v && `c${v.closed} v${v.reachedVinbar}/${v.vinbarWeekMedian} b${v.reachedBistro}/${v.bistroWeekMedian} s${v.starEarned} kr${v.meanCashEnd}`;
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(24), '320', short(v.order320), '| 326', short(v.order326), '| utan', short(v.utan306c), '| med', short(v.med306c), '| diff', v.finalStepDiffers.length);
