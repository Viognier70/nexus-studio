// ORDER 340 B (Anders 2026-10-23: "Bistrons nota 1,15 → 1,35 gäller alla lokaler, också Torget. Visa Torget före och
// efter") — alla spelartyper vid Torget, 20 frön, alla tar över vinbaren vecka 2. Före: bistrons nota 1,15
// (reports/order340/torget-nota115, KARNAN_VARIANT med LADDER.steps.bistro.billFactor 1,15, resten som balance.ts). Efter:
// 1,35 (reports/order340/lokaler, torget-raderna). Talen läses ur harnessens utdata. Skriver reports/order340/torget.json.
//
//   node scripts/order340-torget.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const load = (dir, f) => { const p0 = resolve(R, dir, f); return existsSync(p0) ? Object.values(JSON.parse(readFileSync(p0, 'utf8')).players)[0] : null; };
const pick = (p) => p && ({ seeds: p.runs?.length ?? null, closed: p.closed, meanCashEnd: p.meanCashEnd, lowestCash: p.lowestCash, renegotiated: p.renegotiated, reachedBistro: p.ladder?.reachedBistro ?? null });
const PLAYERS = ['mentorn', 'klok', 'per', 'stjarna', 'rimlig', 'halva', 'halvbra', 'slarvig', 'enkel', 'bistro', 'soigne', 'ignorerar', 'ignorerarUtbildad', 'forsiktig', 'lasare', 'mentornVinbar'];
const rows = Object.fromEntries(PLAYERS.map((p) => {
  const before = pick(load('order340/torget-nota115', `torget-${p}.json`)), after = pick(load('order340/lokaler', `torget-${p}.json`));
  return [p, { before, after, diffSek: before && after ? after.meanCashEnd - before.meanCashEnd : null }];
}));
writeFileSync(resolve(R, 'order340/torget.json'), JSON.stringify({
  definition: 'ORDER 340 B. Torget, 20 frön, alla tar över vinbaren vecka 2. before = bistrons nota 1,15 (reports/order340/torget-nota115), after = 1,35 (reports/order340/lokaler). meanCashEnd = medelkassan vid säsongens slut (kr), diffSek = efter minus före, closed = stängda säsonger, reachedBistro = säsonger som nådde bistron. Spelartyper som aldrig når bistron ska vara lika.',
  rows
}, null, 2) + '\n');
for (const [p, r] of Object.entries(rows)) console.log(p.padEnd(18), 'före', r.before?.meanCashEnd, 'efter', r.after?.meanCashEnd, 'diff', r.diffSek, 'bistro', r.after?.reachedBistro, 'stängda', r.before?.closed, '→', r.after?.closed);
