// ORDER 334 A och B — före och efter. Före: ORDER 333:s körning (reports/order333/lokaler, samma harness och frön,
// källaren utan sommarkurser och AW och med full hyra; Magasinsgatan med Torgets gäster). Efter: scripts/order334-lokaler.sh
// (reports/order334/lokaler). Talen läses ur harnessens utdata (order296Karnan.test.ts: closed, meanCashEnd, ladder,
// meanAfterWorks, truckBySpot med byNight); inget räknas om här utom medianen och nettot per kväll.
// Skriver reports/order334/lokaler.json.
//
//   node scripts/order334-jamforelse.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const AFTER = process.env.AFTER ?? 'order334/lokaler';
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (dir, f) => { const p0 = resolve(R, dir, f); return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null; };
const pick = (p) => p && ({ seeds: p.runs?.length ?? null, closed: p.closed, meanCashEnd: p.meanCashEnd, lowestCash: p.lowestCash, renegotiated: p.renegotiated, reachedVinbar: p.ladder?.reachedVinbar ?? null, reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), meanAfterWorks: p.meanAfterWorks ?? 0 });
const rows = {};
for (const [name, before] of [
  ['kallaren-trappa-mentorn', 'kallaren-trappa-mentorn'], ['kallaren-trappa-rimlig', 'kallaren-trappa-rimlig'],
  ['kallaren-aw-trappa-mentorn', null], ['kallaren-aw-trappa-rimlig', null],
  ['torget-trappa-mentorn', 'torget-trappa-mentorn'], ['torget-trappa-rimlig', 'torget-trappa-rimlig']
]) rows[name] = { before: before ? pick(load('order333/lokaler', `${before}.json`)) : null, after: pick(load(AFTER, `${name}.json`)) };
const spot = (p, id) => { const s = p?.truckBySpot?.[id]; return s && s.evenings ? { evenings: s.evenings, meanRevenueSek: s.meanRevenueSek, feeSek: s.meanFeeSek, netPerEveningSek: s.meanRevenueSek - s.meanFeeSek, byNight: s.byNight ?? null } : null; };
const magasinsgatan = {};
for (const row of ['trappa-mentorn', 'trappa-rimlig']) {
  magasinsgatan[row] = { before: spot(load('order333/lokaler', `magasinsgatan-${row}.json`), 'magasinsgatan'), after: spot(load(AFTER, `magasinsgatan-${row}.json`), 'magasinsgatan'), torget333: spot(load('order333/lokaler', `magasinsgatan-${row}.json`), 'torget') };
}
const prastgatan = { before: spot(load('order332/platser', 'prastgatan-trappa-rimlig.json'), 'prastgatan'), after: spot(load(AFTER, 'prastgatan-trappa-rimlig.json'), 'prastgatan') };
writeFileSync(resolve(R, 'order334/lokaler.json'), JSON.stringify({
  definition: `ORDER 334. before = reports/order333/lokaler (ORDER 333, samma frön), after = reports/${AFTER}. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), lowestCash = lägsta kassan, renegotiated = säsonger med omförhandlat lån, reachedVinbar/reachedBistro = säsonger som nådde steget, meanAfterWorks = morgnar med AW per säsong. kallaren-aw = KARNAN_AW=1 (AW de morgnar det går). magasinsgatan: vagnens kvällar där, intäkt och avgift per kväll, netPerEveningSek = intäkt minus avgift, byNight = intäkten och stamgästerna efter kvällarna vagnen stått där förut (0–4, 5–9, 10–19, 20+). torget333 = vagnens kvällar på Torget i samma körning före. prastgatan = vagnen på Prästgatan, before ur reports/order332/platser (ORDER 332:s körning, 40 frön), after efter sommarkurserna.`,
  rows, magasinsgatan, prastgatan
}, null, 2) + '\n');
const sh = (v) => v ? `stängda ${v.closed}/${v.seeds} kassa ${v.meanCashEnd} lägst ${v.lowestCash} omf ${v.renegotiated} bistro ${v.reachedBistro} AW ${v.meanAfterWorks}` : '—';
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(28), 'före', sh(v.before), '| efter', sh(v.after));
for (const [k, v] of Object.entries(magasinsgatan)) console.log('magasinsgatan', k, 'före netto', v.before?.netPerEveningSek, 'efter netto', v.after?.netPerEveningSek, JSON.stringify(v.after?.byNight));
console.log('prastgatan före', prastgatan.before?.netPerEveningSek, 'efter', prastgatan.after?.netPerEveningSek);
