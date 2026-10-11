// ORDER 329 C — spelartyperna före och efter fikat vid vagnen (scripts/order327-harness.sh, 40 frön per rad):
// fore = main 853dc23f, efter = order-329 a6155c4e (de sju dilemmana och det vanliga fikat). Jämförs också med
// reports/order328/b323s4 (före ORDER 323 §5, bara 0,6-raderna). Läser reports/order329/{fore,efter}/*.json och skriver
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
for (const f of readdirSync(resolve(R, 'order329/efter')).filter((x) => x.endsWith('.json') && x !== 'fika.json').sort()) {
  rows[f.replace(/\.json$/, '')] = { fore: pick('order329/fore', f), efter: pick('order329/efter', f), fore323s5: pick('order328/b323s4', f) };
}
writeFileSync(resolve(R, 'order329/jamforelse.json'), JSON.stringify({ definition: 'fore = main 853dc23f, efter = order-329 a6155c4e, fore323s5 = reports/order328/b323s4 (fbd6bac0, före ORDER 323 §5; bara 0,6-raderna). 40 frön per rad. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), reachedVinbar/reachedBistro = säsonger som nådde steget, vinbarWeekMedian/bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna.', rows }, null, 2) + '\n');
const sh = (v) => v && `c${v.closed} v${v.reachedVinbar}/${v.vinbarWeekMedian} b${v.reachedBistro}/${v.bistroWeekMedian} s${v.starEarned} kr${v.meanCashEnd}`;
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(24), 'före', sh(v.fore), '| efter', sh(v.efter), v.fore323s5 ? `| före §5 v${v.fore323s5.reachedVinbar}` : '');
