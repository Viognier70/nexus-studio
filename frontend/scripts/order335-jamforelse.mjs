// ORDER 335 D — vad planlösningarna med D15:s antal platser gör med spelartyperna. Före: källaren ur ORDER 334
// (reports/order334/lokaler, 20 platser, samma frön och regler), salongen och Flygeln ur ORDER 333 (reports/order333/lokaler;
// ORDER 334 ändrade bara källaren och studentkvarteret). Efter: scripts/order335-lokaler.sh (reports/order335/lokaler).
// Talen läses ur harnessens utdata (order296Karnan.test.ts); inget räknas om här utom medianen.
// Skriver reports/order335/lokaler.json.
//
//   node scripts/order335-jamforelse.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (dir, f) => { const p0 = resolve(R, dir, f); return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null; };
const pick = (p) => p && ({ seeds: p.runs?.length ?? null, closed: p.closed, meanCashEnd: p.meanCashEnd, lowestCash: p.lowestCash, renegotiated: p.renegotiated, reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), meanAfterWorks: p.meanAfterWorks ?? 0 });
const BEFORE = { kallaren: 'order334/lokaler', salongen: 'order333/lokaler', glashornet: 'order333/lokaler' };
const rows = {};
for (const [premises, aw] of [['kallaren', false], ['kallaren', true], ['salongen', false], ['glashornet', false]]) {
  for (const player of ['mentorn', 'rimlig']) {
    const name = `${premises}${aw ? '-aw' : ''}-trappa-${player}`;
    rows[name] = { before: pick(load(BEFORE[premises], `${name}.json`)), after: pick(load('order335/lokaler', `${name}.json`)) };
  }
}
writeFileSync(resolve(R, 'order335/lokaler.json'), JSON.stringify({
  definition: 'ORDER 335 D. before = 20 platser (källaren: reports/order334/lokaler; salongen och Flygeln: reports/order333/lokaler), after = lokalens planlösning (källaren 44, salongen 35, Flygeln 36; reports/order335/lokaler). 40 frön. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), lowestCash = lägsta kassan, renegotiated = säsonger med omförhandlat lån, reachedBistro = säsonger som nådde bistron, bistroWeekMedian = medianveckan dit, meanAfterWorks = morgnar med AW. -aw = KARNAN_AW=1.',
  rows
}, null, 2) + '\n');
const sh = (v) => v ? `stängda ${v.closed}/${v.seeds} kassa ${v.meanCashEnd} lägst ${v.lowestCash} omf ${v.renegotiated} bistro ${v.reachedBistro}` : '—';
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(28), 'före', sh(v.before), '| efter', sh(v.after));
