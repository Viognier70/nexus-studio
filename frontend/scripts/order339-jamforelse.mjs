// ORDER 339 D — spelartyperna per lokal med storleken i ekonomin. Före: reports/order337/lokaler (källaren, salongen,
// källaren med AW) och reports/order338/flygeln (Flygeln), utan storleken; Torget har ingen före-rad (faktorerna är 1
// där, men mentorns plan köper nu efter bokningen, order296Karnan.test.ts). Efter: scripts/order339-lokaler.sh
// (reports/order339/lokaler). Talen läses ur harnessens utdata; inget räknas om här utom medianen och ordningen.
// Skriver reports/order339/lokaler.json.
//
//   node scripts/order339-jamforelse.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (dir, f) => { const p0 = resolve(R, dir, f); return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null; };
const pick = (p) => p && ({ seeds: p.runs?.length ?? null, closed: p.closed, meanCashEnd: p.meanCashEnd, lowestCash: p.lowestCash, renegotiated: p.renegotiated, reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned });
const BEFORE = { torget: null, kallaren: 'order337/lokaler', 'kallaren-aw': 'order337/lokaler', salongen: 'order337/lokaler', glashornet: 'order338/flygeln' };
const rows = {};
const ranking = {};
for (const player of ['mentorn', 'rimlig']) {
  for (const [lokal, before] of Object.entries(BEFORE)) {
    const name = `${lokal}-trappa-${player}`;
    rows[name] = { before: before ? pick(load(before, `${name}.json`)) : null, after: pick(load('order339/lokaler', `${name}.json`)) };
  }
  ranking[player] = Object.keys(BEFORE).map((l) => ({ lokal: l, meanCashEnd: rows[`${l}-trappa-${player}`].after?.meanCashEnd ?? null, closed: rows[`${l}-trappa-${player}`].after?.closed ?? null }))
    .sort((a, b) => (b.meanCashEnd ?? -Infinity) - (a.meanCashEnd ?? -Infinity));
}
// Målet (ORDER 339 D): ingen lokal är bäst för båda; den stora (Flygeln, salongen) lönar sig för mentorn, inte för den rimliga.
const best = { mentorn: ranking.mentorn[0]?.lokal, rimlig: ranking.rimlig[0]?.lokal };
const rank = (player, l) => ranking[player].findIndex((r) => r.lokal === l) + 1;
const goal = {
  bestMentorn: best.mentorn,
  bestRimlig: best.rimlig,
  noPremisesAlwaysBest: best.mentorn !== best.rimlig,
  glashornetRank: { mentorn: rank('mentorn', 'glashornet'), rimlig: rank('rimlig', 'glashornet') },
  salongenRank: { mentorn: rank('mentorn', 'salongen'), rimlig: rank('rimlig', 'salongen') }
};
writeFileSync(resolve(R, 'order339/lokaler.json'), JSON.stringify({
  definition: 'ORDER 339 D. 40 frön per rad, vinbaren och bistron per lokal. before = utan storleken (reports/order337/lokaler; Flygeln reports/order338/flygeln; Torget saknas), after = med storleken (reports/order339/lokaler). closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), lowestCash = lägsta kassan, renegotiated = säsonger med omförhandlat lån, reachedBistro = säsonger som nådde bistron, bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna. ranking = lokalerna efter medelkassan per spelartyp (after); goal = bästa lokalen per spelartyp och platsen för de stora (1 = bäst av fem).',
  rows, ranking, goal
}, null, 2) + '\n');
const sh = (v) => v ? `stängda ${v.closed}/${v.seeds} kassa ${v.meanCashEnd} lägst ${v.lowestCash} omf ${v.renegotiated} bistro ${v.reachedBistro} stjärna ${v.starEarned}` : '—';
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(28), 'före', sh(v.before), '| efter', sh(v.after));
console.log(JSON.stringify(goal));
