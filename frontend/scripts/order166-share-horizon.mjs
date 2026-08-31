#!/usr/bin/env node
// ORDER 166 §6-utökning (2026-08-31) — mät shareFactor över en längre
// horisont, inte bara ett pass.
//
// Vision Owner-observation: konkurrenternas rykte är statiskt medan
// spelarens rör sig. Om spelaren lämnar fältet permanent efter några
// dagar är konkurrensen över, och då är taket det enda som håller
// emot. Ett engångs-tal (order166-share-factor.mjs `scenarios`) kan
// inte svara på om det bandet är levande i speltid — en horisont-
// mätning kan.
//
// **Vad skriptet gör.** Simulerar 12 speldagars rykte-drift för en
// spelare som förbättras stadigt (0,40 → 0,95 i lika steg). För varje
// dag räknar det shareFactor ur produktionsmodulen `competitors.ts`
// (samma esbuild-dynamik som `order166-share-factor.mjs` använder —
// alla tal kommer ur samma funktion `arrivals.ts` konsumerar).
//
// **Vad rapporten svarar på.**
//   1. Vid vilken speldag börjar shareFactor slå i taket
//      (CEIL = 1,4)? Från den dagen är fältet "över" — ytterligare
//      förbättring ger inte fler gäster.
//   2. Hur många dagar tillbringar spelaren vid CEIL innan slutet av
//      horisonten? Långa "plateau"-perioder är svaret att taket
//      permanent begränsar mekaniken.
//   3. Skulle en dynamisk konkurrent (som förbättras med spelaren)
//      förändra bilden? Skriptet räknar ett kontraktsalternativ där
//      AI_COMPETITORS-ryktena också stiger 0.05/dag — jämförelsen ligger
//      i JSON:en.
//
// Talen skrivs till `frontend/reports/order166/shareHorizon.json`
// per ORDER 160/161 — inte till registerraden, inte till §6-texten.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order166');
mkdirSync(REPORT_DIR, { recursive: true });

// Bundle competitors.ts så vi kan importera pure functions från Node
// utan Vite-pipelinen (samma teknik som order166-share-factor.mjs).
const bundlePath = resolve(REPORT_DIR, 'competitors.horizon.bundle.mjs');
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
  AI_COMPETITORS,
  SHARE_FACTOR_FLOOR,
  SHARE_FACTOR_CEIL,
  SHARE_FACTOR_NEUTRAL,
  shareFactorAtFloor,
  shareFactorAtCeiling
} = mod;

// ---------- horisont-parametrar ----------
const DAYS = 12;
const PLAYER_REP_START = 0.40;
const PLAYER_REP_END = 0.95;
const PLAYER_CLASS = 'kvarterskrogen';

// Räkna spelare-rykte per dag i lika steg.
const playerRepByDay = Array.from({ length: DAYS }, (_, i) => {
  const t = DAYS === 1 ? 0 : i / (DAYS - 1);
  return PLAYER_REP_START + t * (PLAYER_REP_END - PLAYER_REP_START);
});

// ---------- huvudkörning: statiska konkurrenter (som ORDER 166 bygger) ----------

const staticSeries = playerRepByDay.map((rep, i) => {
  const s = computeShareFactor(rep, PLAYER_CLASS, AI_COMPETITORS);
  return {
    day: i + 1,
    playerReputation: Number(rep.toFixed(4)),
    shareFactor: Number(s.toFixed(4)),
    atFloor: shareFactorAtFloor(s),
    atCeiling: shareFactorAtCeiling(s)
  };
});

// Första dag där taket klipper.
const firstDayAtCeiling = staticSeries.find((d) => d.atCeiling)?.day ?? null;
// Antal dagar tillbringade vid tak.
const daysAtCeiling = staticSeries.filter((d) => d.atCeiling).length;
// Antal dagar tillbringade vid golv.
const daysAtFloor = staticSeries.filter((d) => d.atFloor).length;
// Antal fria dagar (varken golv eller tak).
const daysUnclamped = DAYS - daysAtCeiling - daysAtFloor;

// ---------- kontrast: dynamiska konkurrenter ----------
//
// Vad HÄNDER om konkurrenternas rykte också stiger med spelaren?
// Enkel modell: varje konkurrent stiger DYNAMIC_RATE per dag från
// sin ORDER 166-startvärde, mjukt clamp:at till [0, 1]. Detta är
// INTE i produktion — bara en kontrastberäkning för att svara på
// om taket är levande om konkurrenterna också lär sig
// (B-014-referensen).
const DYNAMIC_RATE = 0.03; // rykte / dag

const dynamicSeries = playerRepByDay.map((playerRep, i) => {
  const day = i + 1;
  // Klona konkurrenterna med uppdaterade rykten.
  const evolved = AI_COMPETITORS.map((c) => ({
    ...c,
    reputation: Math.min(1.0, c.reputation + DYNAMIC_RATE * i)
  }));
  const s = computeShareFactor(playerRep, PLAYER_CLASS, evolved);
  return {
    day,
    playerReputation: Number(playerRep.toFixed(4)),
    fieldMeanReputation: Number(
      (evolved.reduce((a, c) => a + c.reputation, 0) / evolved.length).toFixed(4)
    ),
    shareFactor: Number(s.toFixed(4)),
    atFloor: shareFactorAtFloor(s),
    atCeiling: shareFactorAtCeiling(s)
  };
});

const dynFirstDayAtCeiling = dynamicSeries.find((d) => d.atCeiling)?.day ?? null;
const dynDaysAtCeiling = dynamicSeries.filter((d) => d.atCeiling).length;

// ---------- rapport ----------

const report = {
  horizon: {
    days: DAYS,
    playerReputationStart: PLAYER_REP_START,
    playerReputationEnd: PLAYER_REP_END,
    playerClass: PLAYER_CLASS
  },
  band: {
    floor: SHARE_FACTOR_FLOOR,
    neutral: SHARE_FACTOR_NEUTRAL,
    ceil: SHARE_FACTOR_CEIL
  },
  competitorsStartField: AI_COMPETITORS.map((c) => ({
    id: c.id,
    businessClass: c.businessClass,
    reputation: c.reputation
  })),
  static: {
    note: 'ORDER 166:s produktions-mönster: konkurrenternas rykte statiskt.',
    series: staticSeries,
    firstDayAtCeiling,
    daysAtFloor,
    daysAtCeiling,
    daysUnclamped
  },
  dynamic: {
    note: `Kontrastberäkning (INTE i produktion): varje konkurrents rykte stiger ${DYNAMIC_RATE}/dag från sin startvärde, mjukt clamp:at till [0,1]. Svarar på om taket är levande om konkurrenterna också lär sig (B-014-referensen).`,
    dynamicRatePerDay: DYNAMIC_RATE,
    series: dynamicSeries,
    firstDayAtCeiling: dynFirstDayAtCeiling,
    daysAtCeiling: dynDaysAtCeiling
  },
  source: {
    module: 'frontend/src/strategic/simulation/competitors.ts',
    function: 'computeShareFactor',
    note: 'Alla shareFactor-tal beräknade av produktionsmodulen (esbuild-transpilerad kopia); ingen replikering i detta skript.'
  }
};

writeFileSync(
  resolve(REPORT_DIR, 'shareHorizon.json'),
  JSON.stringify(report, null, 2)
);

console.log('=== ORDER 166 §6-utökning — shareFactor över horisont ===\n');
console.log(`Horisont: ${DAYS} dagar, playerRep ${PLAYER_REP_START} → ${PLAYER_REP_END}`);
console.log(`Band: floor=${SHARE_FACTOR_FLOOR}  neutral=${SHARE_FACTOR_NEUTRAL}  ceil=${SHARE_FACTOR_CEIL}\n`);
console.log('Statiska konkurrenter (ORDER 166 produktion):');
console.log('  day  playerRep  shareFactor  band');
for (const d of staticSeries) {
  const flag = d.atCeiling ? '!ceiling' : d.atFloor ? '!floor' : '';
  console.log(`  ${String(d.day).padStart(3)}  ${d.playerReputation.toFixed(3)}      ${d.shareFactor.toFixed(3)}        ${flag}`);
}
console.log(`\n  firstDayAtCeiling = ${firstDayAtCeiling}`);
console.log(`  daysAtFloor       = ${daysAtFloor}`);
console.log(`  daysAtCeiling     = ${daysAtCeiling}`);
console.log(`  daysUnclamped     = ${daysUnclamped}\n`);
console.log('Dynamiska konkurrenter (kontrast, INTE i produktion):');
console.log('  day  playerRep  fieldMean  shareFactor  band');
for (const d of dynamicSeries) {
  const flag = d.atCeiling ? '!ceiling' : d.atFloor ? '!floor' : '';
  console.log(`  ${String(d.day).padStart(3)}  ${d.playerReputation.toFixed(3)}      ${d.fieldMeanReputation.toFixed(3)}      ${d.shareFactor.toFixed(3)}        ${flag}`);
}
console.log(`\n  firstDayAtCeiling = ${dynFirstDayAtCeiling}`);
console.log(`  daysAtCeiling     = ${dynDaysAtCeiling}\n`);
console.log(`Rapport: ${resolve(REPORT_DIR, 'shareHorizon.json')}`);
