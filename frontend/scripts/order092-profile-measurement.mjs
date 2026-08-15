#!/usr/bin/env node
// ORDER 092 §3.4 — profile measurement over (e, t, p) cube.
//
// Standalone Node script (no repo imports; no runtime dependencies) that
// generates 21³ = 9261 synthetic knowledge-credit profiles at 0.05 spacing
// in [0, 1]³, applies the three candidate profile-reading paths from
// R3_KUNSKAPSKAPITAL_REPORT_ORDER_092.md §3.2, and reports:
//
//   1. Overall outcome distribution per path (food truck / restaurang /
//      inget lån), in absolute counts and percent.
//   2. The four gränsfall from R3 §3.3 under each path, with the numeric
//      inputs used.
//
// This is the mätgrind — no thresholds are set from calculation here.
// The script exposes the thresholds each path uses as top-level constants
// so Vision Owner can see (and later revise) what "techne-tyngd" and
// "phronesis närvarande" numerically mean under each candidate path.
//
// Run: `node frontend/scripts/order092-profile-measurement.mjs`
// Output: stdout (human-readable) + optional JSON file at
//   `frontend/reports/order092/profile-measurement.json` when the env var
//   `ORDER_092_WRITE_JSON=1` is set.
//
// The three axes are ORDER 092 §1: episteme (e), techne (t), phronesis (p).
// Each ranges [0, 1]. Outcomes are the three verksamhetsklasser from
// SPELSLINGAN_SCHEMAT.md §3: 'restaurang' | 'food-truck' | 'inget-lån'.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

// -------- cube generation ----------------------------------------------

// ORDER 092 §3.4 stipulates 21³ = 9261 profiles at 0.05 steps in [0, 1].
const STEP = 0.05;
const STEPS_PER_AXIS = 21; // 0.00, 0.05, ..., 1.00

function generateCube() {
  const profiles = [];
  for (let i = 0; i < STEPS_PER_AXIS; i += 1) {
    for (let j = 0; j < STEPS_PER_AXIS; j += 1) {
      for (let k = 0; k < STEPS_PER_AXIS; k += 1) {
        profiles.push({
          e: +(i * STEP).toFixed(2),
          t: +(j * STEP).toFixed(2),
          p: +(k * STEP).toFixed(2)
        });
      }
    }
  }
  return profiles;
}

// -------- Path A — trösklar per axel -----------------------------------
//
// Väg A från R3 §3.2. Thresholds are explicit-and-tunable; the numbers
// below are the mätgrind starting values chosen to (a) keep "inget lån"
// non-empty at the low corner, (b) make phronesis > techne the tie-break
// for restaurang. These are NOT decisions — they are the reading Väg A
// would have if Vision Owner chose it with roughly-balanced tröskelvärden.

const A_THRESHOLDS = {
  // "Inget kunnande alls" — every axis below this floor.
  noneOfAll: 0.20,
  // "Phronesis närvarande" — this is the restaurang gate.
  phronesisPresent: 0.50,
  // "Techne-tyngd" — this is the food-truck gate.
  techneWeight: 0.40
};

function pathA(profile) {
  const { e, t, p } = profile;
  // Order of precedence: (1) all-low → inget lån; (2) phronesis present
  // → restaurang; (3) techne heavy → food truck; (4) neither strong
  // → inget lån.
  if (e < A_THRESHOLDS.noneOfAll && t < A_THRESHOLDS.noneOfAll && p < A_THRESHOLDS.noneOfAll) {
    return 'inget-lån';
  }
  if (p >= A_THRESHOLDS.phronesisPresent) {
    return 'restaurang';
  }
  if (t >= A_THRESHOLDS.techneWeight) {
    return 'food-truck';
  }
  return 'inget-lån';
}

// -------- Path B — kvoter mellan axlar ---------------------------------
//
// Väg B från R3 §3.2. Reads shape via ratios. Division by (e + p) is
// guarded by adding EPS to prevent NaN at the origin — a profile of all
// zeros gets classified as inget lån via the epsilon rule.

const B_THRESHOLDS = {
  // Techne-share threshold — techne/(episteme+phronesis+epsilon) above this
  // reads as techne-tyngd.
  techneRatio: 0.90,
  // Phronesis-share threshold — phronesis/(episteme+techne+epsilon) above
  // this reads as phronesis-närvarande.
  phronesisRatio: 0.50,
  // Absolute magnitude gate — a profile whose max axis is below this
  // has too little to be classified regardless of shape.
  magnitudeFloor: 0.10
};

const EPS = 1e-9;

function pathB(profile) {
  const { e, t, p } = profile;
  const maxAxis = Math.max(e, t, p);
  if (maxAxis < B_THRESHOLDS.magnitudeFloor) return 'inget-lån';

  const phroRatio = p / (e + t + EPS);
  const techneRatio = t / (e + p + EPS);

  if (phroRatio >= B_THRESHOLDS.phronesisRatio) return 'restaurang';
  if (techneRatio >= B_THRESHOLDS.techneRatio) return 'food-truck';
  return 'inget-lån';
}

// -------- Path C — vinkel över sfären ----------------------------------
//
// Väg C från R3 §3.2. Normalises the profile to a unit vector on the
// non-negative octant of the unit sphere and reads which axis it sits
// closest to.
//
// Angle to an axis a for unit vector u is arccos(u · â). The sector each
// verksamhetsklass gets is defined below as an angular cone:
//   - Techne-tyngd  = sector within 25° of the techne axis
//   - Phronesis-nära = sector within 25° of the phronesis axis
//   - Anything else in the positive octant that isn't near either axis
//     is under-committed → inget lån
//
// Sector width is a mätgrind starting value; angular geometry lets Vision
// Owner adjust "wideness" as a single parameter per axis.
// Magnitude floor also applies here — a very short vector (any axis
// summed below MAGNITUDE_FLOOR) reads as too little regardless of angle.

const C_THRESHOLDS = {
  techneConeDeg: 25, // half-angle of the techne sector
  phronesisConeDeg: 25, // half-angle of the phronesis sector
  magnitudeFloor: 0.10 // L² norm floor
};

function pathC(profile) {
  const { e, t, p } = profile;
  const norm = Math.sqrt(e * e + t * t + p * p);
  if (norm < C_THRESHOLDS.magnitudeFloor) return 'inget-lån';

  // Unit vector
  const ue = e / norm;
  const ut = t / norm;
  const up = p / norm;

  // arccos of dot product with each axis unit vector = angle to that axis
  const angleToTechne = Math.acos(Math.min(1, Math.max(-1, ut))) * (180 / Math.PI);
  const angleToPhronesis = Math.acos(Math.min(1, Math.max(-1, up))) * (180 / Math.PI);

  // Phronesis takes precedence when both cones fire (restaurang is the
  // "richer" outcome — same precedence rule as Path A).
  if (angleToPhronesis <= C_THRESHOLDS.phronesisConeDeg) return 'restaurang';
  if (angleToTechne <= C_THRESHOLDS.techneConeDeg) return 'food-truck';
  return 'inget-lån';
}

// -------- gränsfall from R3 §3.3 ---------------------------------------

const GRANSFALL = [
  { name: 'Jämnstark på låg nivå', e: 0.10, t: 0.10, p: 0.10 },
  { name: 'Jämnstark på hög nivå', e: 0.80, t: 0.80, p: 0.80 },
  { name: 'Enbart episteme', e: 0.90, t: 0.05, p: 0.05 },
  { name: 'Techne + episteme utan phronesis', e: 0.70, t: 0.70, p: 0.10 }
];

// -------- measurement --------------------------------------------------

function measure(path, profiles) {
  const counts = { restaurang: 0, 'food-truck': 0, 'inget-lån': 0 };
  for (const profile of profiles) {
    counts[path(profile)] += 1;
  }
  const total = profiles.length;
  return {
    total,
    counts,
    pct: {
      restaurang: (counts.restaurang / total) * 100,
      'food-truck': (counts['food-truck'] / total) * 100,
      'inget-lån': (counts['inget-lån'] / total) * 100
    }
  };
}

function measureGransfall(path) {
  return GRANSFALL.map((g) => ({
    name: g.name,
    profile: `(e=${g.e.toFixed(2)}, t=${g.t.toFixed(2)}, p=${g.p.toFixed(2)})`,
    outcome: path({ e: g.e, t: g.t, p: g.p })
  }));
}

// -------- output helpers -----------------------------------------------

function formatPct(x) {
  return `${x.toFixed(1)}%`.padStart(6);
}

function formatCount(n) {
  return `${n}`.padStart(5);
}

function printSummary(name, thresholds, m, gransfall) {
  console.log(`\n──── ${name} ────`);
  console.log('  Trösklar/parametrar:');
  for (const [k, v] of Object.entries(thresholds)) {
    console.log(`    ${k.padEnd(20)} = ${v}`);
  }
  console.log(`  Utfall över ${m.total} profiler:`);
  console.log(
    `    restaurang     ${formatCount(m.counts.restaurang)}   ${formatPct(m.pct.restaurang)}`
  );
  console.log(
    `    food truck     ${formatCount(m.counts['food-truck'])}   ${formatPct(m.pct['food-truck'])}`
  );
  console.log(
    `    inget lån      ${formatCount(m.counts['inget-lån'])}   ${formatPct(m.pct['inget-lån'])}`
  );
  console.log('  Gränsfall (R3 §3.3):');
  for (const g of gransfall) {
    console.log(`    ${g.name.padEnd(38)} ${g.profile.padEnd(30)} → ${g.outcome}`);
  }
}

// -------- main ----------------------------------------------------------

function main() {
  const profiles = generateCube();
  console.log(`ORDER 092 §3.4 — profilavläsningsmätning`);
  console.log(`Genererade ${profiles.length} syntetiska profiler över (e, t, p) i steg om ${STEP}.`);

  const results = {
    step: STEP,
    stepsPerAxis: STEPS_PER_AXIS,
    totalProfiles: profiles.length,
    generatedAt: 'ORDER 092 §3.4 run',
    paths: {}
  };

  const mA = measure(pathA, profiles);
  const gA = measureGransfall(pathA);
  printSummary('Väg A — trösklar per axel', A_THRESHOLDS, mA, gA);
  results.paths.A = { thresholds: A_THRESHOLDS, distribution: mA, gransfall: gA };

  const mB = measure(pathB, profiles);
  const gB = measureGransfall(pathB);
  printSummary('Väg B — kvoter mellan axlar', B_THRESHOLDS, mB, gB);
  results.paths.B = { thresholds: B_THRESHOLDS, distribution: mB, gransfall: gB };

  const mC = measure(pathC, profiles);
  const gC = measureGransfall(pathC);
  printSummary('Väg C — vinkel över sfären', C_THRESHOLDS, mC, gC);
  results.paths.C = { thresholds: C_THRESHOLDS, distribution: mC, gransfall: gC };

  if (process.env.ORDER_092_WRITE_JSON === '1') {
    const out = resolve(REPO_ROOT, 'frontend/reports/order092/profile-measurement.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(results, null, 2));
    console.log(`\nJSON skriven till ${out.replace(REPO_ROOT + '/', '')}`);
  }
}

main();
