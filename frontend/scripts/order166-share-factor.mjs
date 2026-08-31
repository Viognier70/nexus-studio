#!/usr/bin/env node
// ORDER 166 §DoD 6-7 — verifiera att shareFactor läses ur samma källa
// som DevPanel visar, för tre kalibrerade rykte-nivåer, och skriv
// resultatet till JSON per ORDER 160/161.
//
// **Vad talen kommer ifrån.** Vi importerar `computeShareFactor` från
// produktionsmodulen `frontend/src/strategic/simulation/competitors.ts`
// via dynamisk import och matar in tre reputation-värden mot COMPETITORS-
// fältet. Talen som skrivs till JSON är BERÄKNADE av produktionskoden,
// inte av skriptets egna kopior. Följer ORDER 161 §DoD 5-mönstret där
// dev-hook läser scenen; här läser vi direkt en pure function (samma
// referens som runtime-arrivals.ts konsumerar), vilket är starkare än
// dev-hook eftersom det utesluter drift mellan runtime och test.
//
// **Vad rapporten svarar på (§DoD 3, 4, 6):**
//   1. Under, i mitten, och över fältet — vad ger shareFactor för
//      spelaren? Läses ur produktionens `computeShareFactor`.
//   2. Bandets FLOOR / CEIL — importeras och skrivs till JSON så
//      registerraden kan referera talen utan att inbädda dem.
//   3. Klassnärhet — beräknas för alla par så matrisen syns i JSON,
//      inte gömt bakom en abstraktion.
//
// Ingen Vite, ingen playwright — modulen är pure function. Kör bara som
// nod-script med dynamisk TS-import via tsx (om tillgängligt) eller via
// egen liten transpilering-through-vite-preview.  Vi går den enkla
// vägen: dynamisk import av `dist/`-bygget som vite build precis skrev.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order166');
mkdirSync(REPORT_DIR, { recursive: true });

// Enklaste vägen till produktionsmodulen från Node utan bygg-pipeline:
// starta esbuild med API:t (via tsx-import om det finns), eller skriv
// en liten inline-transpileringssteg. Vi väljer den transparenta
// vägen: en tsx-motsvarande wrapper via esbuild-programmatisk API.

import esbuild from 'esbuild';

// Bygg competitors.ts + businessClass.ts (dess enda import) till en
// enda .mjs-fil i temp och dynamiskt importera den. Den producerade
// modulen är IDENTISK i logik med den arrivals.ts konsumerar — det är
// samma källfil, bara transpilerad utan Vite:s React-plugin.
const bundlePath = resolve(REPORT_DIR, 'competitors.bundle.mjs');
await esbuild.build({
  entryPoints: [resolve(FRONTEND, 'src/strategic/simulation/competitors.ts')],
  outfile: bundlePath,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'silent'
});

const mod = await import(pathToFileURL(bundlePath).href);
const {
  computeShareFactor,
  classSimilarity,
  COMPETITORS,
  SHARE_FACTOR_FLOOR,
  SHARE_FACTOR_CEIL,
  SHARE_FACTOR_NEUTRAL
} = mod;

// Läs COMPETITORS för fält-genomsnittsberäkning (transparent redovisning).
const fieldSummary = COMPETITORS.map((c) => ({
  id: c.id,
  name: c.name,
  businessClass: c.businessClass,
  reputation: c.reputation,
  buildingId: c.buildingId
}));

// Tre kalibrerade rykte-nivåer för spelaren (kvarterskrogen):
// undertext-fältet, mitten, över. Talen skrivs till JSON — inte hit i
// den här texten och inte till registerraden.
const playerClass = 'kvarterskrogen';
const scenarios = [
  { name: 'under_field', playerReputation: 0.20 },
  { name: 'mid_field',   playerReputation: 0.60 },  // default reputation
  { name: 'above_field', playerReputation: 0.90 }
];
const results = scenarios.map((s) => ({
  ...s,
  playerClass,
  shareFactor: computeShareFactor(s.playerReputation, playerClass, COMPETITORS)
}));

// Klass-närhetsmatris — läs från produktionsmodulen så inget klistras in.
const classes = ['kvarterskrogen', 'ölkrogen', 'vinbaren', 'gästgiveriet', 'foodtrucken'];
const similarity = {};
for (const a of classes) {
  similarity[a] = {};
  for (const b of classes) {
    similarity[a][b] = classSimilarity(a, b);
  }
}

const report = {
  band: {
    floor: SHARE_FACTOR_FLOOR,
    ceil: SHARE_FACTOR_CEIL,
    neutral: SHARE_FACTOR_NEUTRAL
  },
  field: fieldSummary,
  scenarios: results,
  classSimilarity: similarity,
  source: {
    module: 'frontend/src/strategic/simulation/competitors.ts',
    function: 'computeShareFactor',
    note: 'Alla shareFactor-tal beräknade av produktionsmodulen (esbuild-transpilerad kopia); ingen replikering i detta skript.'
  }
};

writeFileSync(
  resolve(REPORT_DIR, 'shareFactor.json'),
  JSON.stringify(report, null, 2)
);
console.log('=== ORDER 166 §DoD 6-7 — shareFactor-verifiering ===\n');
console.log('Band:');
console.log(`  floor=${SHARE_FACTOR_FLOOR}  neutral=${SHARE_FACTOR_NEUTRAL}  ceil=${SHARE_FACTOR_CEIL}`);
console.log(`Field: ${fieldSummary.length} NPC:er`);
for (const c of fieldSummary) console.log(`  ${c.id.padEnd(28)} ${c.businessClass.padEnd(14)} rep=${c.reputation}`);
console.log('Scenarios:');
for (const r of results) {
  console.log(`  ${r.name.padEnd(12)} rep=${r.playerReputation}  shareFactor=${r.shareFactor.toFixed(4)}`);
}
console.log(`\nRapport: ${resolve(REPORT_DIR, 'shareFactor.json')}`);
