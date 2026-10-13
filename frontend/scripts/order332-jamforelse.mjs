// ORDER 332 H — spelartyperna före och efter (scripts/order327-harness.sh, 40 frön per rad), och vagnens intäkt per
// plats och kvarter (scripts/order332-platser.sh, KARNAN_TRUCK_SPOT).
//   fore        = reports/order332/fore        (main 32d19013, före ordern)
//   efter       = reports/order332/efter       (order-332, allt)
//   utanRegn    = reports/order332/efter-utan-regn (order-332 med kön i regn som förut, KARNAN_VARIANT; visar att
//                 kvarteren inte ändrar Torget)
//   platser     = reports/order332/platser/<plats>-<rad>.json
// Skriver reports/order332/jamforelse.json och reports/order332/platser.json. Talen läses ur harnessens utdata
// (order296Karnan.test.ts: closed, meanCashEnd, ladder, starEarned, truckBySpot), inget räknas om här utom medianen.
//
//   node scripts/order332-jamforelse.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const median = (xs) => { if (!xs?.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const load = (dir, f) => {
  const p0 = resolve(R, dir, f);
  return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null;
};
const pick = (dir, f) => {
  const p = load(dir, f);
  if (!p) return null;
  return { closed: p.closed, meanCashEnd: p.meanCashEnd, reachedVinbar: p.ladder?.reachedVinbar ?? null, vinbarWeekMedian: median(p.ladder?.vinbarWeeks), reachedBistro: p.ladder?.reachedBistro ?? null, bistroWeekMedian: median(p.ladder?.bistroWeeks), starEarned: p.starEarned };
};
const rows = {};
for (const f of readdirSync(resolve(R, 'order332/fore')).filter((x) => x.endsWith('.json')).sort()) {
  const name = f.replace(/\.json$/, '');
  const fore = pick('order332/fore', f), efter = pick('order332/efter', f), utanRegn = pick('order332/efter-utan-regn', f);
  rows[name] = { fore, efter, utanRegn, closedMore: fore && efter ? efter.closed - fore.closed : null, utanRegnSameAsFore: fore && utanRegn ? JSON.stringify(fore) === JSON.stringify(utanRegn) : null };
}
const worse = Object.entries(rows).filter(([, v]) => (v.closedMore ?? 0) > 0).map(([k]) => k);
writeFileSync(resolve(R, 'order332/jamforelse.json'), JSON.stringify({
  definition: 'fore = reports/order332/fore (main 32d19013), efter = reports/order332/efter (order-332), utanRegn = order-332 med RAIN_QUEUE_BALANCE neutral (kön i regn som förut). 40 frön per rad. closed = stängda säsonger, meanCashEnd = medelkassan vid säsongens slut (kr), reachedVinbar/reachedBistro = säsonger som nådde steget, vinbarWeekMedian/bistroWeekMedian = medianveckan dit, starEarned = säsonger med stjärna. closedMore = efter − före. utanRegnSameAsFore = alla fält lika.',
  rowsClosingMore: worse, rows
}, null, 2) + '\n');
const sh = (v) => v && `c${v.closed} v${v.reachedVinbar}/${v.vinbarWeekMedian} b${v.reachedBistro}/${v.bistroWeekMedian} s${v.starEarned} kr${v.meanCashEnd}`;
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(26), 'före', sh(v.fore), '| efter', sh(v.efter), '| utan regn', sh(v.utanRegn), v.utanRegnSameAsFore === null ? '' : v.utanRegnSameAsFore ? '(= före)' : '(≠ före)');
console.log('rader som stänger fler säsonger:', worse.length ? worse.join(', ') : 'inga');

// Platserna: vagnens kvällar per plats (truckBySpot), för raderna som kördes med KARNAN_TRUCK_SPOT.
const P = resolve(R, 'order332/platser');
if (existsSync(P)) {
  const spots = {};
  for (const f of readdirSync(P).filter((x) => x.endsWith('.json')).sort()) {
    const [spot, ...rest] = f.replace(/\.json$/, '').split('-');
    const row = rest.join('-');
    const p = load('order332/platser', f);
    const s = p.truckBySpot?.[spot];
    const torget = p.truckBySpot?.torget;
    (spots[spot] ??= {})[row] = {
      district: s?.district ?? null, evenings: s?.evenings ?? 0, meanRevenueSek: s?.meanRevenueSek ?? null, feeSek: s?.meanFeeSek ?? null,
      netPerEveningSek: s ? s.meanRevenueSek - s.meanFeeSek : null,
      // Kvällarna då platsen var stängd (sjön efter vecka 6) stod vagnen på Torget.
      fallbackTorgetEvenings: spot === 'torget' ? 0 : torget?.evenings ?? 0,
      closed: p.closed, meanCashEnd: p.meanCashEnd, reachedVinbar: p.ladder?.reachedVinbar ?? null
    };
  }
  writeFileSync(resolve(R, 'order332/platser.json'), JSON.stringify({
    definition: 'Vagnen på en plats hela foodtruck-perioden (KARNAN_TRUCK_SPOT, order296Karnan.test.ts truckBySpot), 40 frön per rad. meanRevenueSek = intäkt per kväll vagnen stod där (state.revenue före och efter dagen), feeSek = platsavgift per kväll (balance.ts DISTRICTS.truckSpotFeeSek), netPerEveningSek = intäkt − avgift. fallbackTorgetEvenings = kvällar på Torget när platsen var stängd. closed/meanCashEnd/reachedVinbar = säsongen.',
    spots
  }, null, 2) + '\n');
  for (const [spot, rs] of Object.entries(spots)) for (const [row, v] of Object.entries(rs)) console.log(spot.padEnd(18), row.padEnd(22), `${v.district} kvällar ${v.evenings} intäkt/kväll ${v.meanRevenueSek} avgift ${v.feeSek} netto ${v.netPerEveningSek} | c${v.closed} v${v.reachedVinbar} kr${v.meanCashEnd}`);
}
