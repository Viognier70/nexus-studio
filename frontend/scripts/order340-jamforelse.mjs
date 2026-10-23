// ORDER 340 E — spelartyperna per lokal (scripts/order340-lokaler.sh; alla tar över vinbaren vecka 2). Talen läses ur
// harnessens utdata (order296Karnan.test.ts); inget räknas om här utom ordningen och målen. Skriver <DIR>/../lokaler.json
// (förvalt reports/order340/lokaler.json).
//   Målen (ORDER 340): A. Torget bäst för den slarviga, en annan lokal bäst för den som läser kvarteret, ingen lokal
//   bäst för alla; B. bistrosteget sänker inte den starka spelarens resultat (mentorn mot mentorn som stannar i vinbaren).
//
//   [DIR=order340/lokaler] [OUT=order340/lokaler.json] node scripts/order340-jamforelse.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const DIR = process.env.DIR ?? 'order340/lokaler';
const OUT = process.env.OUT ?? 'order340/lokaler.json';
const LOKALER = ['torget', 'kallaren', 'kallaren-aw', 'salongen', 'glashornet'];
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (f) => { const p0 = resolve(R, DIR, f); return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null; };
const pick = (p) => p && ({ seeds: p.runs?.length ?? null, closed: p.closed, meanCashEnd: p.meanCashEnd, lowestCash: p.lowestCash, renegotiated: p.renegotiated, reachedVinbar: p.ladder?.reachedVinbar ?? null, reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned });
const players = [...new Set(readdirSync(resolve(R, DIR)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '').split('-').at(-1)))];
const rows = {}, ranking = {}, best = {};
for (const player of players) {
  rows[player] = Object.fromEntries(LOKALER.map((l) => [l, pick(load(`${l}-${player}.json`))]));
  ranking[player] = LOKALER.filter((l) => rows[player][l]).map((l) => ({ lokal: l, meanCashEnd: rows[player][l].meanCashEnd, closed: rows[player][l].closed }))
    .sort((a, b) => b.meanCashEnd - a.meanCashEnd);
  best[player] = ranking[player][0]?.lokal ?? null;
}
const bistroStep = rows.mentorn && rows.mentornVinbar
  ? Object.fromEntries(LOKALER.filter((l) => rows.mentorn[l] && rows.mentornVinbar[l]).map((l) => [l, { mentorn: rows.mentorn[l].meanCashEnd, mentornVinbar: rows.mentornVinbar[l].meanCashEnd, bistroNotLower: rows.mentorn[l].meanCashEnd >= rows.mentornVinbar[l].meanCashEnd }]))
  : null;
const goal = {
  bestPerPlayer: best,
  slarvigBestTorget: best.slarvig ? best.slarvig === 'torget' : null,
  lasareBestNotTorget: best.lasare ? best.lasare !== 'torget' : null,
  noPremisesBestForAll: new Set(Object.values(best).filter(Boolean)).size > 1,
  bistroStep,
  bistroNeverLower: bistroStep ? Object.values(bistroStep).every((x) => x.bistroNotLower) : null
};
writeFileSync(resolve(R, OUT), JSON.stringify({
  definition: `ORDER 340 E. Rader ur reports/${DIR} (scripts/order340-lokaler.sh): alla spelartyper tar över vinbaren vecka 2 i lokalen (KARNAN_TAKEOVER_WEEK), också de som annars aldrig når den. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), lowestCash = lägsta kassan, renegotiated = säsonger med omförhandlat lån, reachedBistro = säsonger som nådde bistron, bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna. ranking = lokalerna efter medelkassan per spelartyp; goal = målen i ORDER 340 (A: slarvigBestTorget, lasareBestNotTorget, noPremisesBestForAll; B: bistroStep, mentorn mot mentornVinbar som aldrig tar bistron).`,
  rows, ranking, goal
}, null, 2) + '\n');
const sh = (v) => v ? `${String(v.meanCashEnd).padStart(7)} st ${v.closed}/${v.seeds} omf ${v.renegotiated} bistro ${v.reachedBistro}` : '—';
for (const p of players) console.log(p.padEnd(18), LOKALER.map((l) => `${l}: ${sh(rows[p][l])}`).join(' | '));
console.log(JSON.stringify(goal));
