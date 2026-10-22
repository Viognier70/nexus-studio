// ORDER 336 D — spelartyperna per lokal som i ORDER 335, och vagnen på Magasinsgatan med stamgästerna som följer med.
// Före: reports/order335/lokaler (lokalerna; salongen med vinbarens 20 och 15 i västra delen) och reports/order334/lokaler
// (Magasinsgatan, +2 per kväll, ingen följer med). Efter: scripts/order336-lokaler.sh (reports/order336/lokaler).
// Talen läses ur harnessens utdata (order296Karnan.test.ts); inget räknas om här utom medianen och nettot per kväll.
// Skriver reports/order336/lokaler.json.
//
//   node scripts/order336-jamforelse.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (dir, f) => { const p0 = resolve(R, dir, f); return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null; };
const pick = (p) => p && ({ seeds: p.runs?.length ?? null, closed: p.closed, meanCashEnd: p.meanCashEnd, lowestCash: p.lowestCash, renegotiated: p.renegotiated, reachedVinbar: p.ladder?.reachedVinbar ?? null, reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), meanAfterWorks: p.meanAfterWorks ?? 0, meanFollowing: p.meanFollowing ?? 0 });
const spot = (p) => { const s = p?.truckBySpot?.magasinsgatan; return s && s.evenings ? { evenings: s.evenings, meanRevenueSek: s.meanRevenueSek, netPerEveningSek: s.meanRevenueSek - s.meanFeeSek, byNight: s.byNight ?? null } : null; };
const rows = {};
for (const [premises, aw] of [['kallaren', false], ['kallaren', true], ['salongen', false], ['glashornet', false]]) {
  for (const player of ['mentorn', 'rimlig']) {
    const name = `${premises}${aw ? '-aw' : ''}-trappa-${player}`;
    rows[name] = { before: pick(load('order335/lokaler', `${name}.json`)), after: pick(load('order336/lokaler', `${name}.json`)) };
  }
}
const magasinsgatan = {};
for (const player of ['mentorn', 'rimlig']) {
  const b = load('order334/lokaler', `magasinsgatan-trappa-${player}.json`), a = load('order336/lokaler', `magasinsgatan-trappa-${player}.json`);
  magasinsgatan[`trappa-${player}`] = { before: { ...pick(b), truck: spot(b) }, after: { ...pick(a), truck: spot(a) } };
}
writeFileSync(resolve(R, 'order336/lokaler.json'), JSON.stringify({
  definition: 'ORDER 336 D. 40 frön. before: lokalerna ur reports/order335/lokaler, Magasinsgatan ur reports/order334/lokaler; after: reports/order336/lokaler. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), lowestCash = lägsta kassan, renegotiated = säsonger med omförhandlat lån, reachedVinbar/reachedBistro = säsonger som nådde steget, meanAfterWorks = morgnar med AW, meanFollowing = stamgäster som följde med till vinbaren (medel per säsong). truck = vagnens kvällar på Magasinsgatan: intäkt per kväll, netto (intäkt minus avgift), byNight = efter kvällarna vagnen stått där förut.',
  rows, magasinsgatan
}, null, 2) + '\n');
const sh = (v) => v ? `stängda ${v.closed}/${v.seeds} kassa ${v.meanCashEnd} lägst ${v.lowestCash} omf ${v.renegotiated} bistro ${v.reachedBistro}` : '—';
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(28), 'före', sh(v.before), '| efter', sh(v.after));
for (const [k, v] of Object.entries(magasinsgatan)) console.log('magasinsgatan', k, 'före', sh(v.before), 'netto', v.before.truck?.netPerEveningSek, '| efter', sh(v.after), 'netto', v.after.truck?.netPerEveningSek, 'följer med', v.after.meanFollowing, JSON.stringify(v.after.truck?.byNight));
