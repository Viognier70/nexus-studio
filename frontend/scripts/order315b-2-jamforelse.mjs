// ORDER 315b del 2 — säsongerna före och efter D7 (bistrons 31 platser, ombyggnaden, erbjudandet vid dörren).
// (scripts/order318b-harness.sh och scripts/order315b-2-harness.sh, 40 frön per
// rad). Läser reports/order318/efter40/*.json och reports/order315b-2/efter40/*.json
// och skriver reports/order315b-2/jamforelse.json: per rad stängda säsonger,
// medelkassan vid säsongens slut, säsonger som nådde vinbaren och bistron, och
// stjärnor.
//
//   node scripts/order315b-2-jamforelse.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const read = (dir, f) => { try { return JSON.parse(readFileSync(resolve(R, dir, f), 'utf8')); } catch { return null; } };
const pick = (j) => {
  if (!j) return null;
  const [name, p] = Object.entries(j.players)[0];
  return { player: name, closed: p.closed, meanCashEnd: p.meanCashEnd, reachedVinbar: p.ladder?.reachedVinbar ?? null, reachedBistro: p.ladder?.reachedBistro ?? null, starEarned: p.starEarned };
};
const rows = {};
for (const f of readdirSync(resolve(R, 'order315b-2/efter40')).filter((x) => x.endsWith('.json')).sort()) {
  rows[f.replace(/\.json$/, '')] = { fore: pick(read('order318b/efter40', f)), efter: pick(read('order315b-2/efter40', f)) };
}
writeFileSync(resolve(R, 'order315b-2/jamforelse.json'), JSON.stringify({ definition: 'fore = reports/order318b/efter40 (före D7), efter = reports/order315b-2/efter40 (D7: bistrons 31 platser, ombyggnaden 3 dagar, erbjudandet vid dörren). 40 frön per rad. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), reachedVinbar/reachedBistro = säsonger som nådde steget, starEarned = säsonger med stjärna.', rows }, null, 2) + '\n');
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(26), JSON.stringify(v.fore && { c: v.fore.closed, cash: v.fore.meanCashEnd, b: v.fore.reachedBistro, s: v.fore.starEarned }), '→', JSON.stringify(v.efter && { c: v.efter.closed, cash: v.efter.meanCashEnd, b: v.efter.reachedBistro, s: v.efter.starEarned }));
