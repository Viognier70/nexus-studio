// ORDER 338 — spelartyperna i Flygeln med bistron i hela flygeln. Före: reports/order337/lokaler (bistron i det
// glasade hörnet, 44 platser). Efter: scripts/order338-flygeln.sh (reports/order338/flygeln). Talen läses ur
// harnessens utdata (order296Karnan.test.ts); inget räknas om här utom medianen. Skriver reports/order338/flygeln.json.
//
//   node scripts/order338-jamforelse.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (dir, f) => { const p0 = resolve(R, dir, f); return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null; };
const pick = (p) => p && ({ seeds: p.runs?.length ?? null, closed: p.closed, meanCashEnd: p.meanCashEnd, lowestCash: p.lowestCash, renegotiated: p.renegotiated, reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned });
const rows = {};
for (const player of ['mentorn', 'rimlig']) {
  const name = `glashornet-trappa-${player}`;
  rows[name] = { before: pick(load('order337/lokaler', `${name}.json`)), after: pick(load('order338/flygeln', `${name}.json`)) };
}
writeFileSync(resolve(R, 'order338/flygeln.json'), JSON.stringify({
  definition: 'ORDER 338. 40 frön, vinbaren och bistron i Flygeln. before = reports/order337/lokaler (bistron i det glasade hörnet, 44 platser), after = reports/order338/flygeln (bistron i hela flygeln, 66 platser). closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), lowestCash = lägsta kassan, renegotiated = säsonger med omförhandlat lån, reachedBistro = säsonger som nådde bistron, bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna.',
  rows
}, null, 2) + '\n');
const sh = (v) => v ? `stängda ${v.closed}/${v.seeds} kassa ${v.meanCashEnd} lägst ${v.lowestCash} omf ${v.renegotiated} bistro ${v.reachedBistro} stjärna ${v.starEarned}` : '—';
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(26), 'före', sh(v.before), '| efter', sh(v.after));
