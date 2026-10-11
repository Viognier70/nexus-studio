// ORDER 330 G — spelartyperna före och efter Jonas vid vagnen (scripts/order327-harness.sh, 40 frön per rad):
// fore = reports/order329/efter (a6155c4e), efter = order-330 5cc612d3 (extraHandOrderTime 0,9, reports/order330/efter09), och
// e07 = a7478f6a med 0,7 (reports/order330/efter). Skriver reports/order330/jamforelse.json.
// reports/order329/jamforelse.json: per rad stängda säsonger, medelkassan vid slutet, säsonger som nådde vinbaren och
// bistron, medianveckan dit, stjärnor.
//
//   node scripts/order329-jamforelse.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const pick = (dir, f) => {
  const p0 = resolve(R, dir, f);
  if (!existsSync(p0)) return null;
  const p = Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0];
  return { closed: p.closed, meanCashEnd: p.meanCashEnd, reachedVinbar: p.ladder?.reachedVinbar ?? null, vinbarWeekMedian: median(p.ladder?.vinbarWeeks), reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned };
};
const rows = {};
for (const f of readdirSync(resolve(R, 'order330/efter09')).filter((x) => x.endsWith('.json') && x !== 'fika.json').sort()) {
  rows[f.replace(/\.json$/, '')] = { fore: pick('order329/efter', f), efter: pick('order330/efter09', f), e07: pick('order330/efter', f) };
}
writeFileSync(resolve(R, 'order330/jamforelse.json'), JSON.stringify({ definition: 'fore = reports/order329/efter (a6155c4e), efter = 5cc612d3 med FOODTRUCK.extraHandOrderTime 0,9 (reports/order330/efter09), e07 = a7478f6a med 0,7 (reports/order330/efter). 40 frön per rad. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), reachedVinbar/reachedBistro = säsonger som nådde steget, vinbarWeekMedian/bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna.', rows }, null, 2) + '\n');
const sh = (v) => v && `c${v.closed} v${v.reachedVinbar}/${v.vinbarWeekMedian} b${v.reachedBistro}/${v.bistroWeekMedian} s${v.starEarned} kr${v.meanCashEnd}`;
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(24), 'före', sh(v.fore), '| efter', sh(v.efter), '| 0,7', sh(v.e07));
