// ORDER 333 D och B — spelartyperna med lokalen fast per rad och med vagnen på Magasinsgatan
// (scripts/order333-lokaler.sh, 40 frön per rad), mot ORDER 332:s efter-körning (reports/order332/efter, samma rader
// med Torget). Talen läses ur harnessens utdata (order296Karnan.test.ts: closed, meanCashEnd, ladder, starEarned,
// truckBySpot); inget räknas om här utom medianen.
// Skriver reports/order333/lokaler.json.
//
//   node scripts/order333-jamforelse.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (dir, f) => {
  const p0 = resolve(R, dir, f);
  return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null;
};
const pick = (p) => p && ({ closed: p.closed, meanCashEnd: p.meanCashEnd, reachedVinbar: p.ladder?.reachedVinbar ?? null, vinbarWeekMedian: median(p.ladder?.vinbarWeeks), reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned });
const ROWS = ['trappa-mentorn', 'trappa-rimlig', 'trappa-slarvig'];
const premises = {};
for (const at of ['torget', 'kallaren', 'salongen', 'glashornet']) {
  for (const row of ROWS) {
    const v = pick(load('order333/lokaler', `${at}-${row}.json`));
    const base = pick(load('order332/efter', `${row}.json`));
    (premises[at] ??= {})[row] = { ...v, closedMoreThanTorget332: v && base ? v.closed - base.closed : null };
  }
}
const torgetSameAs332 = ROWS.every((row) => JSON.stringify(pick(load('order333/lokaler', `torget-${row}.json`))) === JSON.stringify(pick(load('order332/efter', `${row}.json`))));
const magasinsgatan = {};
for (const row of ROWS) {
  const p = load('order333/lokaler', `magasinsgatan-${row}.json`);
  const s = p?.truckBySpot?.magasinsgatan;
  magasinsgatan[row] = p && { ...pick(p), evenings: s?.evenings ?? 0, meanRevenueSek: s?.meanRevenueSek ?? null, feeSek: s?.meanFeeSek ?? null, netPerEveningSek: s ? s.meanRevenueSek - s.meanFeeSek : null, torgetEvenings: p.truckBySpot?.torget?.evenings ?? 0, torgetMeanRevenueSek: p.truckBySpot?.torget?.meanRevenueSek ?? null };
}
writeFileSync(resolve(R, 'order333/lokaler.json'), JSON.stringify({
  definition: 'ORDER 333. premises = vinbaren och bistron i lokalen från övertagandet (KARNAN_PREMISES), magasinsgatan = vagnen på Magasinsgatan varje kväll (KARNAN_TRUCK_SPOT). 40 frön per rad. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), reachedVinbar/reachedBistro = säsonger som nådde steget, vinbarWeekMedian/bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna. closedMoreThanTorget332 = stängda här minus i reports/order332/efter (samma rad, Torget). torgetSameAs332 = Torgets rader lika med ORDER 332 efter i alla fält. Magasinsgatan: evenings, meanRevenueSek, feeSek, netPerEveningSek = intäkt minus avgift per kväll vid vagnen (truckBySpot).',
  torgetSameAs332, premises, magasinsgatan
}, null, 2) + '\n');
const sh = (v) => v && `stängda ${v.closed} vinbar ${v.reachedVinbar}/v${v.vinbarWeekMedian} bistro ${v.reachedBistro}/v${v.bistroWeekMedian} stjärna ${v.starEarned} kassa ${v.meanCashEnd}`;
for (const [at, rows] of Object.entries(premises)) for (const [row, v] of Object.entries(rows)) console.log(at.padEnd(11), row.padEnd(16), sh(v), `(${v.closedMoreThanTorget332 >= 0 ? '+' : ''}${v.closedMoreThanTorget332} mot Torget 332)`);
console.log('Torget = ORDER 332 efter:', torgetSameAs332);
for (const [row, v] of Object.entries(magasinsgatan)) console.log('magasinsgatan', row.padEnd(16), sh(v), v && `netto/kväll ${v.netPerEveningSek} (${v.evenings} kvällar)`);
