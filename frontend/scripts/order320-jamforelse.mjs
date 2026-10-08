// ORDER 320 — målen från 315c före och efter (Anders 2026-10-08: "att målen från 315c fortfarande håller"):
// samma körningar (scripts/order315c-harness.sh och scripts/order320-harness.sh, 40 frön per rad). Läser
// reports/order315c/efter40/*.json och reports/order320/efter40/*.json och skriver reports/order320/jamforelse.json:
// per rad stängda säsonger, medelkassan vid säsongens slut, säsonger som nådde vinbaren och bistron, medianveckan
// dit, och stjärnor.
//
//   node scripts/order320-jamforelse.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const read = (dir, f) => { try { return JSON.parse(readFileSync(resolve(R, dir, f), 'utf8')); } catch { return null; } };
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const pick = (j) => {
  if (!j) return null;
  const [name, p] = Object.entries(j.players)[0];
  return { player: name, closed: p.closed, meanCashEnd: p.meanCashEnd, reachedVinbar: p.ladder?.reachedVinbar ?? null, vinbarWeekMedian: median(p.ladder?.vinbarWeeks), reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned };
};
const rows = {};
for (const f of readdirSync(resolve(R, 'order320/efter40')).filter((x) => x.endsWith('.json')).sort()) {
  rows[f.replace(/\.json$/, '')] = { fore: pick(read('order315c/efter40', f)), efter: pick(read('order320/efter40', f)) };
}
writeFileSync(resolve(R, 'order320/jamforelse.json'), JSON.stringify({ definition: 'fore = reports/order315c/efter40 (315c:s sista kontroll), efter = reports/order320/efter40 (efter 319c och 320). 40 frön per rad. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), reachedVinbar/reachedBistro = säsonger som nådde steget, vinbarWeekMedian/bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna.', rows }, null, 2) + '\n');
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(26), JSON.stringify(v.fore && { c: v.fore.closed, v: v.fore.reachedVinbar, vw: v.fore.vinbarWeekMedian, b: v.fore.reachedBistro, bw: v.fore.bistroWeekMedian, s: v.fore.starEarned }), '→', JSON.stringify(v.efter && { c: v.efter.closed, v: v.efter.reachedVinbar, vw: v.efter.vinbarWeekMedian, b: v.efter.reachedBistro, bw: v.efter.bistroWeekMedian, s: v.efter.starEarned }));
