#!/usr/bin/env node
// ORDER 167 §4 — trettiodagarsmätning av shareFactor med före/efter
// på ORDER 167:s rörliga konkurrenter.
//
// Ursprungligen ORDER 166 §6-utökning (12 dagar). ORDER 167 §DoD 4
// utökar till 30 dagar och byter kontrast-serien från en naiv
// DYNAMIC_RATE-drift till produktionens `evolveCompetitors` — så
// jämförelsen är mellan (a) statiska konkurrenter, som var läget
// när ORDER 166 mergades, och (b) rörliga konkurrenter, som är
// läget efter ORDER 167.
//
// **Slutsatsen (§4)** väljs automatiskt bland de tre giltiga utfall
// ordertexten namnger:
//
//   utfall_A: share= planar ut på CEIL igen — samma fynd, argumentet
//             för alternativ B.
//   utfall_B: share= rör sig över hela trettio dagar utan att fastna
//             — formen bär.
//   utfall_C: spelaren når aldrig över 1.0 — gummiväggen för stark.
//
// Klassificeringen räknas ur den evolved-serien mot samma spelare-
// bana som statiskt. Talvärdena skrivs till JSON per ORDER 160/161.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order166');
mkdirSync(REPORT_DIR, { recursive: true });

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
  evolveCompetitors,
  AI_COMPETITORS,
  SHARE_FACTOR_FLOOR,
  SHARE_FACTOR_CEIL,
  SHARE_FACTOR_NEUTRAL,
  MOTION_REP_FLOOR,
  MOTION_REP_CEIL,
  shareFactorAtFloor,
  shareFactorAtCeiling
} = mod;

// ---------- horisont-parametrar ----------
// ORDER 167 §4: samma seed, samma metod, samma spelarbana som steg
// 0,02 per dag. 30 dagar. Startvärdet 0,40 så spelaren har utrymme
// under fältet före hen passerar mitten.
const DAYS = 30;
const PLAYER_REP_START = 0.40;
const PLAYER_REP_STEP = 0.02;
const PLAYER_REP_MAX = 1.00;
const PLAYER_CLASS = 'kvarterskrogen';

const playerRepByDay = Array.from({ length: DAYS }, (_, i) =>
  Math.min(PLAYER_REP_MAX, PLAYER_REP_START + i * PLAYER_REP_STEP)
);

// ---------- före: statiska konkurrenter (ORDER 166) ----------

const staticSeries = playerRepByDay.map((rep, i) => {
  const s = computeShareFactor(rep, PLAYER_CLASS, AI_COMPETITORS);
  const field = AI_COMPETITORS.reduce((a, c) => a + c.reputation, 0) / AI_COMPETITORS.length;
  return {
    day: i + 1,
    playerReputation: Number(rep.toFixed(4)),
    fieldMeanReputation: Number(field.toFixed(4)),
    shareFactor: Number(s.toFixed(4)),
    atFloor: shareFactorAtFloor(s),
    atCeiling: shareFactorAtCeiling(s)
  };
});
const staticFirstDayAtCeiling = staticSeries.find((d) => d.atCeiling)?.day ?? null;
const staticDaysAtCeiling = staticSeries.filter((d) => d.atCeiling).length;
const staticDaysAtFloor = staticSeries.filter((d) => d.atFloor).length;
const staticDaysUnclamped = DAYS - staticDaysAtCeiling - staticDaysAtFloor;

// ---------- efter: rörliga konkurrenter (ORDER 167) ----------

let evolvingField = AI_COMPETITORS.map((c) => ({ ...c }));
const evolvedSeries = [];
const evolvedFieldPerDay = [];
for (let i = 0; i < DAYS; i++) {
  const playerRep = playerRepByDay[i];
  const s = computeShareFactor(playerRep, PLAYER_CLASS, evolvingField);
  const fieldMean = evolvingField.reduce((a, c) => a + c.reputation, 0) / evolvingField.length;
  evolvedSeries.push({
    day: i + 1,
    playerReputation: Number(playerRep.toFixed(4)),
    fieldMeanReputation: Number(fieldMean.toFixed(4)),
    shareFactor: Number(s.toFixed(4)),
    atFloor: shareFactorAtFloor(s),
    atCeiling: shareFactorAtCeiling(s)
  });
  evolvedFieldPerDay.push(
    evolvingField.map((c) => ({
      id: c.id,
      reputation: Number(c.reputation.toFixed(4))
    }))
  );
  // Rör konkurrenterna en dag framåt inför nästa dags mätning.
  evolvingField = evolveCompetitors(evolvingField, playerRep);
}
const evolvedFirstDayAtCeiling = evolvedSeries.find((d) => d.atCeiling)?.day ?? null;
const evolvedDaysAtCeiling = evolvedSeries.filter((d) => d.atCeiling).length;
const evolvedDaysAtFloor = evolvedSeries.filter((d) => d.atFloor).length;
const evolvedDaysUnclamped = DAYS - evolvedDaysAtCeiling - evolvedDaysAtFloor;
const evolvedPeakShareFactor = Math.max(...evolvedSeries.map((d) => d.shareFactor));

// ---------- §4:s tre utfall — klassificering ----------

// Definitioner för utfallsvalet:
// utfall_A ("plateau"): shareFactor når CEIL i evolved OCH tillbringar
//   ≥ 5 dagar där. Formen bär inte — samma fynd som ORDER 166 §7.
// utfall_C ("gummivägg"): evolvedPeakShareFactor < 1.0. Konkurrenterna
//   släpar men följer så nära att spelaren aldrig kommer över mitten.
// utfall_B ("formen bär"): övrigt — shareFactor rör sig utan att
//   fastna vid taket, och spelaren kommer över mitten.
let utfall;
let utfallDescription;
if (evolvedPeakShareFactor < 1.0) {
  utfall = 'C_gummivägg_för_stark';
  utfallDescription =
    'Spelaren når aldrig över shareFactor=1.0 över trettio dagar. Konkurrenterna följer så tätt att förbättring inte belönas — motion-parametrarna behöver dämpas.';
} else if (evolvedDaysAtCeiling >= 5) {
  utfall = 'A_plateau_kvarstår_alternativ_B_krävs';
  utfallDescription =
    'shareFactor planar ut på CEIL under horisonten. Samma fynd som ORDER 166 §7 — det rörliga ryktet räckte inte, argumentet för alternativ B (global efterfrågansfördelning) står kvar.';
} else {
  utfall = 'B_formen_bär';
  utfallDescription =
    'shareFactor rör sig över hela trettio dagar utan att fastna vid taket; spelaren belönas för att bli bättre utan att vinna för alltid. Formen bär.';
}

// ---------- rapport ----------

const report = {
  horizon: {
    days: DAYS,
    playerReputationStart: PLAYER_REP_START,
    playerReputationStepPerDay: PLAYER_REP_STEP,
    playerReputationCap: PLAYER_REP_MAX,
    playerClass: PLAYER_CLASS
  },
  band: {
    floor: SHARE_FACTOR_FLOOR,
    neutral: SHARE_FACTOR_NEUTRAL,
    ceil: SHARE_FACTOR_CEIL
  },
  motionBand: {
    floor: MOTION_REP_FLOOR,
    ceil: MOTION_REP_CEIL
  },
  competitorsStartField: AI_COMPETITORS.map((c) => ({
    id: c.id,
    businessClass: c.businessClass,
    reputation: c.reputation,
    motion: c.motion
  })),
  before: {
    note: 'ORDER 166:s produktionsmönster (statiska konkurrenter). Kvar i JSON som referens; produktionen kör efter ORDER 167 evolved-serien.',
    series: staticSeries,
    firstDayAtCeiling: staticFirstDayAtCeiling,
    daysAtCeiling: staticDaysAtCeiling,
    daysAtFloor: staticDaysAtFloor,
    daysUnclamped: staticDaysUnclamped
  },
  after: {
    note: 'ORDER 167 produktionsmönster: `evolveCompetitors` körs en dag åt gången mellan mätningarna. Konkurrenternas rykte per dag i `fieldEvolution`.',
    series: evolvedSeries,
    firstDayAtCeiling: evolvedFirstDayAtCeiling,
    daysAtCeiling: evolvedDaysAtCeiling,
    daysAtFloor: evolvedDaysAtFloor,
    daysUnclamped: evolvedDaysUnclamped,
    peakShareFactor: Number(evolvedPeakShareFactor.toFixed(4)),
    fieldEvolution: evolvedFieldPerDay
  },
  section4Verdict: {
    utfall,
    description: utfallDescription
  },
  source: {
    module: 'frontend/src/strategic/simulation/competitors.ts',
    functions: ['computeShareFactor', 'evolveCompetitors'],
    note: 'Alla shareFactor- och rörelse-tal beräknade av produktionsmodulen (esbuild-transpilerad kopia); ingen replikering i detta skript.'
  }
};

writeFileSync(
  resolve(REPORT_DIR, 'shareHorizon.json'),
  JSON.stringify(report, null, 2)
);

console.log('=== ORDER 167 §4 — trettiodagarsmätning ===\n');
console.log(`Horisont: ${DAYS} dagar, playerRep +${PLAYER_REP_STEP}/dag från ${PLAYER_REP_START}`);
console.log(`Band: floor=${SHARE_FACTOR_FLOOR}  neutral=${SHARE_FACTOR_NEUTRAL}  ceil=${SHARE_FACTOR_CEIL}\n`);

console.log('FÖRE (statiska konkurrenter, ORDER 166):');
console.log('  day  playerRep  fieldMean  shareFactor  band');
for (const d of staticSeries) {
  const flag = d.atCeiling ? '!ceiling' : d.atFloor ? '!floor' : '';
  console.log(`  ${String(d.day).padStart(3)}  ${d.playerReputation.toFixed(3)}      ${d.fieldMeanReputation.toFixed(3)}      ${d.shareFactor.toFixed(3)}        ${flag}`);
}
console.log(`  firstDayAtCeiling = ${staticFirstDayAtCeiling}, daysAtCeiling = ${staticDaysAtCeiling}\n`);

console.log('EFTER (rörliga konkurrenter, ORDER 167):');
console.log('  day  playerRep  fieldMean  shareFactor  band');
for (const d of evolvedSeries) {
  const flag = d.atCeiling ? '!ceiling' : d.atFloor ? '!floor' : '';
  console.log(`  ${String(d.day).padStart(3)}  ${d.playerReputation.toFixed(3)}      ${d.fieldMeanReputation.toFixed(3)}      ${d.shareFactor.toFixed(3)}        ${flag}`);
}
console.log(`  firstDayAtCeiling = ${evolvedFirstDayAtCeiling}, daysAtCeiling = ${evolvedDaysAtCeiling}`);
console.log(`  peakShareFactor   = ${evolvedPeakShareFactor.toFixed(3)}\n`);

console.log(`§4-utfall: ${utfall}`);
console.log(`  ${utfallDescription}\n`);
console.log(`Rapport: ${resolve(REPORT_DIR, 'shareHorizon.json')}`);
