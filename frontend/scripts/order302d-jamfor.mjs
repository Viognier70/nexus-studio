// ORDER 302d — lyktmätningen före och efter, sida vid sida.
//
// Läser reports/order302d/fore-lyktor-1440x900.json (main 7dd7939f) och
// efter-lyktor-1440x900.json (order-302d), båda skrivna av
// scripts/order302c-lyktor.mjs, och räknar per källa och zon, per grupp
// (D5:s fem, båda varianterna) och zon, och per zon för alla figurer:
// n, under bandet (< 1,8), över bandet (> 3,6), medianen av kvoten och
// medianen av kroppens och bakgrundens luminans. Bara mätningar där kameran
// stod på gatans nivå (stops[].camDistance = 42) räknas; de andra stoppen
// listas i skipped.
//
// Utdata: reports/order302d/jamforelse.json.
//
//   node scripts/order302d-jamfor.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '..', 'reports', 'order302d');
const BAND = [1.8, 3.6];
const STREET_M = '42';
const median = (a) => { if (!a.length) return null; const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(4); };

function summarise(file) {
  const r = JSON.parse(readFileSync(resolve(DIR, file), 'utf8'));
  const street = new Set(r.stops.filter((s) => s.camDistance === STREET_M).map((s) => s.stop));
  const rows = r.rows.filter((x) => street.has(x.stop));
  const out = {};
  const add = (key, x) => ((out[key] ??= []).push(x));
  for (const x of rows) {
    add(`alla|${x.zone}`, x);
    add(`${x.src}|${x.zone}`, x);
    add(`${x.group ?? '-'}|${x.zone}`, x);
  }
  const sum = Object.fromEntries(Object.entries(out).sort().map(([k, xs]) => [k, {
    n: xs.length,
    below: xs.filter((x) => x.ratio < BAND[0]).length,
    above: xs.filter((x) => x.ratio > BAND[1]).length,
    ratioMedian: median(xs.map((x) => x.ratio)),
    bodyLMedian: median(xs.map((x) => x.bodyL)),
    backLMedian: median(xs.map((x) => x.backL))
  }]));
  return {
    file, dist: r.dist, load1: r.load1,
    stops: r.stops.map((s) => ({ stop: s.stop, clock: s.clock, camDistance: s.camDistance, rows: r.rows.filter((x) => x.stop === s.stop).length })),
    skipped: r.stops.filter((s) => s.camDistance !== STREET_M).map((s) => s.stop),
    n: rows.length,
    summary: sum
  };
}

const report = { band: BAND, fore: summarise('fore-lyktor-1440x900.json'), efter: summarise('efter-lyktor-1440x900.json') };
writeFileSync(resolve(DIR, 'jamforelse.json'), JSON.stringify(report, null, 2) + '\n');
for (const k of new Set([...Object.keys(report.fore.summary), ...Object.keys(report.efter.summary)])) {
  const a = report.fore.summary[k], b = report.efter.summary[k];
  const f = (s) => (s ? `${s.below}/${s.above} av ${s.n} (med ${s.ratioMedian})` : '-');
  console.log(k.padEnd(18), 'före', f(a).padEnd(30), 'efter', f(b));
}
console.log('överhoppade stopp: före', report.fore.skipped.join(','), 'efter', report.efter.skipped.join(','));
