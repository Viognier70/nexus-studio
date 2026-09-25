#!/usr/bin/env node
// ORDER 169 §DoD — auditerar prep-fasgränsen för ölkrogen och
// reproducerar DevPanels `service=`-avläsning vid observationens tidpunkt.
//
// **Vad talen kommer ifrån.**
//
// 1. `derivePhase` importeras från produktionen (`deriveActions.ts`)
//    via esbuild-transpilering — samma funktion RoomCardPanel + DevPanel
//    konsumerar. Skriptet mockar en `DayState` och matar in flera
//    `simTime`-värden; utfallet är produktionsfunktionens output.
// 2. `deriveStaffAction` importeras samma väg — utfallet 'On break' vs
//    'Standing by' kommer från produktionsraderna S2/S14 (rad 132/184).
// 3. OPENING_DURATION_SEC (reducer.ts:83) och PREP_DURATION_SEC
//    (constants.ts:78) läses som författade konstanter via regex mot
//    källfilen — talen används både som skriptets input och redovisas
//    i JSON med källrad. Dessa är konstanter i produktionskoden, inte
//    replikerad logik; skulle reducer.ts flytta värdet fångas det av
//    regex:en (fil + värde) inte som "rimlig default".
// 4. `businessHasMiseEnPlace('ölkrogen')` läses från BUSINESS_CLASS_CONFIG
//    (businessClass.ts:92-98) via regex — booleanska konfig-flaggan
//    som reducer.ts:1054 grenar på för att välja PREP-tillägg. Läses
//    som "vad står i konfig-tabellen" med källrad, inte gissad.
// 5. Arrivals prep-gate: skriptet verifierar existensen av
//    `state.simTime < state.day.prepEndsAt` i arrivals.ts:126-127 via
//    grep. Rapporten citerar rad + funktion.
// 6. DevPanels `service=`-formel återges genom att skriptet reproducerar
//    exakt raderna 107-117 i DevPanel.tsx. Formeln är trivial men det
//    är RENDERINGEN vi verifierar, så JSON-fältet `devPanelServiceReadout`
//    speglar precis strängen DevPanel skulle skriva vid samma
//    (simTime, periodStartAt, currentServiceLengthMinutes)-triplet.
//    Raden i DevPanel.tsx citeras som källa.
//
// Skriptet skriver `frontend/reports/order169/prep-gate-audit.json`.
// Rapport-texten citerar filnamnet, inte inklistrade tal.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import esbuild from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO = resolve(FRONTEND, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order169');
mkdirSync(REPORT_DIR, { recursive: true });

// ---- 1. Källrad-extraktion ---------------------------------------------
// Läs konstanter via regex mot källfilen. Rapporten citerar filnamnet
// + värdet skriptet läste; om värdet flyttas fångas det här.

function readConst(fileRel, pattern) {
  const abs = resolve(FRONTEND, fileRel);
  const src = readFileSync(abs, 'utf8');
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(pattern);
    if (m) {
      return { file: fileRel, line: i + 1, value: Number(m[1]), lineText: lines[i].trim() };
    }
  }
  throw new Error(`Constant not found in ${fileRel}: ${pattern}`);
}

function readBool(fileRel, pattern) {
  const abs = resolve(FRONTEND, fileRel);
  const src = readFileSync(abs, 'utf8');
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(pattern);
    if (m) {
      return { file: fileRel, line: i + 1, value: m[1] === 'true', lineText: lines[i].trim() };
    }
  }
  throw new Error(`Boolean not found in ${fileRel}: ${pattern}`);
}

function grepFirst(fileRel, pattern) {
  const abs = resolve(FRONTEND, fileRel);
  const src = readFileSync(abs, 'utf8');
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return { file: fileRel, line: i + 1, lineText: lines[i].trim() };
    }
  }
  return null;
}

const OPENING = readConst(
  'src/strategic/simulation/reducer.ts',
  /export\s+const\s+OPENING_DURATION_SEC\s*=\s*(\d+)\s*;/
);
const PREP = readConst(
  'src/strategic/simulation/constants.ts',
  /export\s+const\s+PREP_DURATION_SEC\s*=\s*(\d+)\s*;/
);
// businessClass.ts: hitta ölkrogen-blocket och läs hasMiseEnPlace ur det.
// Vi läser efter blocketiketten så vi inte råkar plocka en annan verksamhets
// flagga.
function readMiseEnPlace(classKey) {
  const fileRel = 'src/strategic/business/businessClass.ts';
  const src = readFileSync(resolve(FRONTEND, fileRel), 'utf8');
  const idx = src.indexOf(`${classKey}: {`);
  if (idx < 0) throw new Error(`class ${classKey} not found in businessClass.ts`);
  const tail = src.slice(idx);
  const m = tail.match(/hasMiseEnPlace:\s*(true|false)/);
  if (!m) throw new Error(`hasMiseEnPlace not found for ${classKey}`);
  // Compute line number of the hasMiseEnPlace hit.
  const consumedBeforeHit = src.slice(0, idx + m.index).split(/\r?\n/).length;
  return {
    file: fileRel,
    line: consumedBeforeHit,
    value: m[1] === 'true',
    lineText: m[0]
  };
}
const OLKROGEN_MISE = readMiseEnPlace('ölkrogen');

// Arrivals prep-gate: bevisa att arrivals.ts har `simTime < prepEndsAt`
// early-return i arrivalProbability.
const ARRIVALS_PREP_GATE = grepFirst(
  'src/strategic/simulation/arrivals.ts',
  /state\.simTime\s*<\s*state\.day\.prepEndsAt/
);
const ARRIVALS_RETURN_ZERO_AFTER_GATE = grepFirst(
  'src/strategic/simulation/arrivals.ts',
  /return\s+0;/
);

// DevPanels `service=`-formel — citera rader så rapporten kan peka på var
// remaining-vs-elapsed-tolkningen bor.
const DEVPANEL_SERVICE_FORMULA_LINE = grepFirst(
  'src/strategic/ui/DevPanel.tsx',
  /rem\s*=\s*Math\.max\(0,\s*totalSec\s*-\s*elapsed\)/
);
const DEVPANEL_WAITING_LINE = grepFirst(
  'src/strategic/ui/DevPanel.tsx',
  /waiting=\$\{d\.waitingAtOpening\}/
);

// Reducer:s prepEndsAt-tilldelning (för spårbarhet i rapporten).
const REDUCER_PREP_ENDS_AT = grepFirst(
  'src/strategic/simulation/reducer.ts',
  /prepEndsAt:\s*businessHasMiseEnPlace/
);

// Reducer:s doors-open guest spawn (för att bevisa att waitingAtOpening-
// gästerna spawnar vid prepEndsAt, inte tidigare).
const REDUCER_DOORS_OPEN_SPAWN = grepFirst(
  'src/strategic/simulation/reducer.ts',
  /!draft\.day\.doorsOpenedThisService\s*&&\s*draft\.day\.waitingAtOpening\s*>\s*0/
);

// ---- 2. Importera derivePhase + deriveStaffAction från produktionen ----

const bundlePath = resolve(REPORT_DIR, 'deriveActions.bundle.mjs');
await esbuild.build({
  entryPoints: [resolve(FRONTEND, 'src/strategic/ui/RoomCardPanel/deriveActions.ts')],
  outfile: bundlePath,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'silent'
});
const { derivePhase, deriveStaffAction } = await import(pathToFileURL(bundlePath).href);

// ---- 3. Konstruera en mock-DayState för ölkrogen ------------------------
//
// simTime origin: t=0 är OPEN_SERVICE-ögonblicket för lunchpasset. Enligt
// reducer.ts:1040 sätts `periodStartAt: state.simTime` samtidigt som
// `prepEndsAt: businessHasMiseEnPlace(...) ? simTime+OPENING+PREP : simTime+OPENING`.
// För ölkrogen (mise en place = true) blir `prepEndsAt = OPENING+PREP` sekunder
// efter service-start.

const periodStartAt = 0;
const currentServiceLengthMinutes = 15;    // observationens 15-min-pass
const prepEndsAt = OLKROGEN_MISE.value
  ? periodStartAt + OPENING.value + PREP.value
  : periodStartAt + OPENING.value;
const openingEndsAt = periodStartAt + OPENING.value;

// Minimal DayState som täcker fälten derivePhase + deriveStaffAction läser.
// Fält som inte är relevanta för prep-fas-utfallet sätts till fysikaliskt
// rimliga defaults (fyllnadsdata; inget observationsberoende).
function mockDay(atSimTime) {
  return {
    period: 'lunch',
    periodStartAt,
    currentServiceLengthMinutes,
    openingEndsAt: openingEndsAt > atSimTime ? openingEndsAt : null,
    prepEndsAt: prepEndsAt > atSimTime ? prepEndsAt : null,
    doorsOpenedThisService: prepEndsAt <= atSimTime,
    waitingAtOpening: 3,               // observationens värde
    prepReadiness: { ice: 1, napkins: 1, cutlery: 1, stations: 1, garnish: 1 },
    prepIgnoranceCount: 0,
    prepFloorSchedule: [],
    weather: { tempC: 15, windMS: 2, precipitation: 'none' },
    worldFactors: [],
    scenariosPlanned: 0,
    scenariosFiredThisService: 0,
    scenarioTriggerTimes: [],
    serviceCollapsed: false,
    collapseAxis: null,
    revenueAtServiceStart: 0,
    costAtServiceStart: 0,
    reputationAtServiceStart: 0.6,
    serviceIngredientAccrued: 0,
    idleCostAccrued: 0,
    serviceCovers: 0,
    morningPolicyChanges: [],
    serviceRhythm: 'green',
    dayNumber: 1
  };
}

// Mockad idle staff (taskType=null) för deriveStaffAction — S2-raden
// gate:ar på (phase='prep' && taskType===null).
function mockStaff(role) {
  return {
    id: `staff-${role}`,
    role,
    taskType: null,
    targetGuestId: null,
    workload: 0.3,
    // Fält som deriveStaffAction inte läser för S2/S14 men som måste finnas
    // för TypeScript-shape-kompatibilitet:
    competence: { scientific: 0.6, cultural: 0.6, practical: 0.6, trainingLevel: 0.6 },
    morale: 0.7
  };
}

// DevPanels `service=`-avläsning, reproducerad från DevPanel.tsx:107-117.
// Formeln är trivial (rem = totalSec - elapsed → "m:ss / N min") men
// citeras här så det syns att skriptet visar precis vad panelen skulle skriva.
function devPanelServiceReadout(simTime) {
  const elapsed = simTime - periodStartAt;
  const totalSec = currentServiceLengthMinutes * 60;
  const rem = Math.max(0, totalSec - elapsed);
  const m = Math.floor(rem / 60);
  const s = Math.floor(rem % 60);
  return `${m}:${s.toString().padStart(2, '0')} / ${currentServiceLengthMinutes}min`;
}

// ---- 4. Probe:a derivePhase + deriveStaffAction vid olika elapsed ------
//
// Elapsed-värden valda för att pin:na fasgränserna: opening-slut,
// mitten av prep, sista sekunden i prep, första sekunden i service,
// samt observationens 771s = 15*60 - 129 (som ger `service=12:51/15min`
// remaining).

const OBSERVATION_ELAPSED = currentServiceLengthMinutes * 60
  - (12 * 60 + 51);    // 900 - 771 = 129 s
// Observationens `service=12:51/15min` → remaining=771s → elapsed=129s.

const probeSimTimes = [
  0,
  OPENING.value,                        // opening-slut
  OPENING.value + Math.floor(PREP.value / 2),  // mitten av prep
  prepEndsAt - 1,                       // sista sekunden i prep
  OBSERVATION_ELAPSED,                  // observationens elapsed 129s
  prepEndsAt,                           // exakt prep-slut
  prepEndsAt + 1,                       // första sekunden i service
  300,                                  // mitten av 15-min-passet
  currentServiceLengthMinutes * 60 - 1  // sista sekunden i passet
];

const probes = probeSimTimes.map((t) => {
  const day = mockDay(t);
  const phase = derivePhase(day, t);
  const kockAction = deriveStaffAction(mockStaff('kock'), [], day, t, []);
  const servitorAction = deriveStaffAction(mockStaff('servitör'), [], day, t, []);
  const värdAction = deriveStaffAction(mockStaff('värd'), [], day, t, []);
  return {
    simTime: t,
    elapsedSinceServiceStart: t - periodStartAt,
    remainingSec: Math.max(0, currentServiceLengthMinutes * 60 - (t - periodStartAt)),
    devPanelServiceReadout: devPanelServiceReadout(t),
    derivePhase: phase,
    kockAction: kockAction.text,
    servitorAction: servitorAction.text,
    värdAction: värdAction.text,
    // Alla tre 'On break' <=> phase === 'prep' + taskType null
    allThreeOnBreak: kockAction.text === 'On break'
      && servitorAction.text === 'On break'
      && värdAction.text === 'On break'
  };
});

// ---- 5. Bygg rapport-JSON ----------------------------------------------

const report = {
  order: 169,
  title: 'On break-spåret — prep-fasgränsen i ölkrogen',
  observation: {
    date: '2026-09-01',
    business: 'ölkrogen',
    devPanelService: '12:51/15min',
    devPanelWaiting: 3,
    rolesOnBreak: 3,
    interpretationInOrderText: 'Preppen ska vara över 12 min in i ett 15-min-pass'
  },
  constants: {
    OPENING_DURATION_SEC: OPENING,
    PREP_DURATION_SEC: PREP,
    'businessHasMiseEnPlace(ölkrogen)': OLKROGEN_MISE
  },
  derivedTimeline: {
    periodStartAt,
    openingEndsAt,
    prepEndsAt,
    prepEndsAtMinutesInService: prepEndsAt / 60,
    serviceLengthSec: currentServiceLengthMinutes * 60
  },
  sourceCitations: {
    reducerPrepEndsAtAssign: REDUCER_PREP_ENDS_AT,
    reducerDoorsOpenSpawn: REDUCER_DOORS_OPEN_SPAWN,
    arrivalsPrepGate: ARRIVALS_PREP_GATE,
    arrivalsReturnZeroAfterGate: ARRIVALS_RETURN_ZERO_AFTER_GATE,
    devPanelServiceFormulaLine: DEVPANEL_SERVICE_FORMULA_LINE,
    devPanelWaitingLine: DEVPANEL_WAITING_LINE
  },
  probes,
  observationInterpretation: (() => {
    const remSec = 12 * 60 + 51;
    const elapsedSec = currentServiceLengthMinutes * 60 - remSec;
    const inPrep = elapsedSec < prepEndsAt;
    return {
      devPanelIsRemaining: true,          // per DevPanel.tsx:113 `rem = ...`
      elapsedSecondsFromObservation: elapsedSec,
      elapsedMinutes: elapsedSec / 60,
      prepEndsAtSec: prepEndsAt,
      elapsedIsLessThanPrepEndsAt: inPrep,
      secondsUntilPrepEnds: prepEndsAt - elapsedSec,
      onBreakIsExpected: inPrep,
      arrivalsCanHappenNow: !inPrep,
      waitingFieldSemantics:
        'DevPanel `waiting=` är d.waitingAtOpening — forecast som sätts vid OPEN_SERVICE och är stabil hela passet. Live-kön är `queue=` på samma rad.'
    };
  })(),
  source: {
    scriptFile: 'frontend/scripts/order169-prep-gate-audit.mjs',
    derivePhaseFrom: 'frontend/src/strategic/ui/RoomCardPanel/deriveActions.ts (esbuild-transpilerad kopia; samma referens som RoomCardPanel + DevPanel konsumerar)',
    deriveStaffActionFrom: 'frontend/src/strategic/ui/RoomCardPanel/deriveActions.ts (samma bundle)',
    constantsFrom: 'regex mot källfilerna; värden + rader speglade i constants-fältet ovan',
    note: 'Ingen replikering av derivePhase-logik. Konstanter läses som författade tal, inte replikerade beräkningar.'
  }
};

const outFile = resolve(REPORT_DIR, 'prep-gate-audit.json');
writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log('=== ORDER 169 — prep-gate-audit ===\n');
console.log(`OPENING_DURATION_SEC   = ${OPENING.value}   (${OPENING.file}:${OPENING.line})`);
console.log(`PREP_DURATION_SEC      = ${PREP.value}  (${PREP.file}:${PREP.line})`);
console.log(`ölkrogen.hasMiseEnPlace= ${OLKROGEN_MISE.value}  (${OLKROGEN_MISE.file}:${OLKROGEN_MISE.line})`);
console.log(`prepEndsAt (för lunch) = ${prepEndsAt}s efter service-start`);
console.log('');
console.log('Probes:');
console.log('  elapsed  remaining  devPanel        phase   allThreeOnBreak');
for (const p of probes) {
  console.log(
    `  ${String(p.elapsedSinceServiceStart).padStart(5)}s  ${String(p.remainingSec).padStart(6)}s     ${p.devPanelServiceReadout.padEnd(15)} ${p.derivePhase.padEnd(8)} ${p.allThreeOnBreak}`
  );
}
console.log('');
console.log('Observation-tolkning:');
console.log(`  remaining=12:51 → elapsed=${report.observationInterpretation.elapsedSecondsFromObservation}s = ${report.observationInterpretation.elapsedMinutes.toFixed(2)} min`);
console.log(`  prep slutar vid ${prepEndsAt}s → elapsed < prep? ${report.observationInterpretation.elapsedIsLessThanPrepEndsAt}`);
console.log(`  På-rast är väntat: ${report.observationInterpretation.onBreakIsExpected}`);
console.log(`  Arrivals kan hända nu: ${report.observationInterpretation.arrivalsCanHappenNow}`);
console.log('');
console.log(`Rapport: ${outFile}`);
