// ORDER 302d — startvärdet för gatans figurers lägsta ljushet på kvällen
// (STREET_FIGURE_LIGHT.minLight i src/strategic/village/villageEvening.ts),
// tills Design levererar värdet.
//
// Underlaget är ORDER 302c:s lyktmätning i spelets bild
// (reports/order302c/lyktor-1440x900.json): bakgrundens luminans bakom varje
// figur (rows[].backL) och kroppens luminans (rows[].bodyL).
//
// Golvet (src/strategic/scene/village/streetFigureLight.ts) sätter kroppens ljus
// till minst albedot gånger minLight före exponeringen och tonmappningen. Vad
// det blir i bilden räknas här med three.js ACES Filmic
// (node_modules/three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js,
// ACESFilmicToneMapping och RRTAndODTFit), replikerad i JS eftersom
// skuggaren inte kan köras här. Exponeringen är SKY[].exposure (1,35–1,45) i
// villageEvening.ts på ljusnivån 1; skriptet läser värdena ur källan.
//
// Verifiering av repliken: med minLight = 1 ska den ge samma luminans som de
// oupplysta gästerna i 302c (MeshBasicMaterial, kroppen lika med albedot), dvs.
// medianen av rows[].bodyL för src = life (fältet replicaCheck).
//
// Svepet: för varje minLight blir kroppen max(uppmätt kropp, golvet) för de
// upplysta (fotgängarna, folket vid landmärkena) och golvet för gatans gäster
// (som nu tar ljus som de andra). Kvoten mot den uppmätta bakgrunden räknas
// som i lampProbe.ts; antalet under och över bandet 1,8–3,6 per zon.
// Startvärdet är det minLight i svepet som ger minst utanför bandet.
// Antagande: kroppens upplysta ljus och bakgrunden ändras inte av golvet.
//
// Utdata: reports/order302d/startvarde.json.
//
//   node scripts/order302d-startvarde.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order302d');
mkdirSync(OUT, { recursive: true });
const BAND = [1.8, 3.6];

const src = readFileSync(resolve(FRONTEND, 'src/strategic/village/villageEvening.ts'), 'utf8');
const exposures = [...src.matchAll(/exposure:\s*([\d.]+)\s*\}/g)].map((m) => Number(m[1]));
if (exposures.length !== 4) throw new Error('SKY[].exposure hittades inte i villageEvening.ts');
const current = Number(/STREET_FIGURE_LIGHT = \{ minLight: ([\d.]+) \}/.exec(src)?.[1]);

// three.js ACES Filmic (r169), kolumnvisa matriser som i GLSL.
const IN = [[0.59719, 0.076, 0.0284], [0.35458, 0.90834, 0.13383], [0.04823, 0.01566, 0.83777]];
const OUTM = [[1.60475, -0.10208, -0.00327], [-0.53108, 1.10813, -0.07276], [-0.07367, -0.00605, 1.07602]];
const mul = (M, v) => [0, 1, 2].map((i) => M[0][i] * v[0] + M[1][i] * v[1] + M[2][i] * v[2]);
const fit = (v) => v.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.432951) + 0.238081));
const aces = (c, exp) => mul(OUTM, fit(mul(IN, c.map((x) => (x * exp) / 0.6)))).map((x) => Math.min(1, Math.max(0, x)));
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const hexLin = (h) => [1, 3, 5].map((i) => s2l(parseInt(h.slice(i, i + 2), 16) / 255));
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const median = (a) => { const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const probe = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order302c/lyktor-1440x900.json'), 'utf8'));
const rows = probe.rows;
const floorL = (colour, F, exp) => lum(aces(hexLin(colour).map((x) => x * F), exp));

// Repliken mot de oupplysta gästerna (minLight = 1).
const life = rows.filter((r) => r.src === 'life');
const replicaCheck = Object.fromEntries(exposures.map((e) => [e, +median(life.map((r) => floorL(r.colour, 1, e))).toFixed(4)]));
replicaCheck.measuredLifeBodyLMedian = median(life.map((r) => r.bodyL));

const EXP = Math.max(...exposures);
const sweep = [];
for (let F = 0.3; F <= 1.0001; F += 0.05) {
  const f = +F.toFixed(2);
  const zones = {};
  for (const r of rows) {
    const fl = floorL(r.colour, f, EXP);
    const body = r.src === 'life' ? fl : Math.max(r.bodyL, fl);
    const q = ratio(body, r.backL);
    const z = (zones[r.zone] ??= { n: 0, below: 0, above: 0 });
    z.n++;
    if (q < BAND[0]) z.below++;
    if (q > BAND[1]) z.above++;
  }
  const outside = Object.values(zones).reduce((a, z) => a + z.below + z.above, 0);
  sweep.push({ minLight: f, floorLMedian: +median(rows.map((r) => floorL(r.colour, f, EXP))).toFixed(4), outside, n: rows.length, zones });
}
const best = sweep.reduce((a, b) => (b.outside < a.outside ? b : a));
const report = {
  source: 'reports/order302c/lyktor-1440x900.json',
  band: BAND,
  exposures,
  exposureUsed: EXP,
  replicaCheck,
  backLMedian: { all: median(rows.map((r) => r.backL)), offLamp: median(rows.filter((r) => r.zone !== 'under').map((r) => r.backL)) },
  sweep,
  best: best.minLight,
  inVillageEvening: current,
  matches: current === best.minLight
};
writeFileSync(resolve(OUT, 'startvarde.json'), JSON.stringify(report, null, 2) + '\n');
console.log('replik', JSON.stringify(replicaCheck));
for (const s of sweep) console.log(s.minLight, 'utanför', s.outside, '/', s.n, JSON.stringify(s.zones));
console.log('bäst', best.minLight, 'i villageEvening.ts', current, report.matches ? 'stämmer' : 'STÄMMER INTE');
