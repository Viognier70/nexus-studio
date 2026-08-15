#!/usr/bin/env node
// ORDER 093 §§ 3–4 — cone sweep for Väg C-utökad.
//
// Extends ORDER 092's profile-measurement with the four-sector version of
// Väg C (three axis cones + a centrum sector), sweeps the cone half-width
// from 20° to 50° in 5° steps, and reports:
//
//   1. Outcome distribution per cone width across five categories:
//      restaurang / food-truck / near-episteme / centrum / inget-lån.
//      (Near-episteme is exposed as a distinct signal because §5.3 of
//      ORDER 093 leaves the episteme sector's verksamhet undecided —
//      the mätgrind needs to show the size of that zone so the decision
//      can be made against a number.)
//   2. The four gränsfall from R3 §3.3 under every swept cone width.
//   3. Analytic tipping-cone-width per gränsfall — the cone half-angle
//      at which the profile leaves 'centrum' and enters the specialist
//      sector closest to its dominant axis. Reports the exact geometric
//      transition per profile.
//   4. Share of the cube that lands in each of the five sectors per
//      cone width — the input Vision Owner needs for §5.1 (which cone
//      width) and §5.3 (what episteme's sector should become).
//
// Reuses ORDER 092's cube generator (21³ profiles at 0.05 step). No repo
// imports; standalone Node.
//
// Run:  node frontend/scripts/order093-cone-sweep.mjs
// JSON: set ORDER_093_WRITE_JSON=1 for
//       frontend/reports/order093/cone-sweep.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

// -------- cube (same as ORDER 092) -------------------------------------

const STEP = 0.05;
const STEPS_PER_AXIS = 21;

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

// -------- Väg C-utökad --------------------------------------------------
//
// Four sectors plus magnitude floor:
//   near-phronesis  → restaurang    (angle to p-axis ≤ coneDeg)
//   near-techne     → food-truck    (angle to t-axis ≤ coneDeg)
//   near-episteme   → near-episteme (angle to e-axis ≤ coneDeg — outcome
//                                    undecided, exposed for §5.3)
//   otherwise (above magnitude floor) → centrum
//   below magnitude → inget-lån
//
// Precedence when a profile falls in more than one cone (possible for
// coneDeg > 45°, where cones start to overlap along the e–t / t–p / p–e
// half-planes): phronesis (restaurang) wins first, then techne
// (food-truck), then episteme. Matches ORDER 092 §3.2 precedence.

const MAGNITUDE_FLOOR = 0.10;

function angleToAxisDeg(unitComponent) {
  // Angle between a unit vector and an axis â equals arccos(u·â) = arccos
  // of the component along that axis.
  const clamped = Math.min(1, Math.max(-1, unitComponent));
  return Math.acos(clamped) * (180 / Math.PI);
}

function classifyC(profile, coneDeg) {
  const { e, t, p } = profile;
  const norm = Math.sqrt(e * e + t * t + p * p);
  if (norm < MAGNITUDE_FLOOR) return 'inget-lån';

  const ue = e / norm;
  const ut = t / norm;
  const up = p / norm;

  const angE = angleToAxisDeg(ue);
  const angT = angleToAxisDeg(ut);
  const angP = angleToAxisDeg(up);

  if (angP <= coneDeg) return 'restaurang';
  if (angT <= coneDeg) return 'food-truck';
  if (angE <= coneDeg) return 'near-episteme';
  return 'centrum';
}

// -------- gränsfall from R3 §3.3 ---------------------------------------

const GRANSFALL = [
  { name: 'Jämnstark på låg nivå', e: 0.10, t: 0.10, p: 0.10 },
  { name: 'Jämnstark på hög nivå', e: 0.80, t: 0.80, p: 0.80 },
  { name: 'Enbart episteme', e: 0.90, t: 0.05, p: 0.05 },
  { name: 'Techne + episteme utan phronesis', e: 0.70, t: 0.70, p: 0.10 }
];

// Analytic tipping cone-width: for each profile above the magnitude floor,
// the profile leaves centrum and enters the sector closest to its dominant
// axis exactly at coneDeg = min(angE, angT, angP). Below that width the
// profile is centrum; above (or equal), specialist.
function tippingConeDeg(profile) {
  const { e, t, p } = profile;
  const norm = Math.sqrt(e * e + t * t + p * p);
  if (norm < MAGNITUDE_FLOOR) return null;
  const ue = e / norm;
  const ut = t / norm;
  const up = p / norm;
  const angE = angleToAxisDeg(ue);
  const angT = angleToAxisDeg(ut);
  const angP = angleToAxisDeg(up);
  return { min: Math.min(angE, angT, angP), angE, angT, angP };
}

// -------- sweep --------------------------------------------------------

const CONE_WIDTHS = [20, 25, 30, 35, 40, 45, 50];
const OUTCOMES = ['restaurang', 'food-truck', 'near-episteme', 'centrum', 'inget-lån'];

function measureCube(coneDeg, profiles) {
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  for (const profile of profiles) {
    counts[classifyC(profile, coneDeg)] += 1;
  }
  const total = profiles.length;
  const pct = Object.fromEntries(
    OUTCOMES.map((o) => [o, (counts[o] / total) * 100])
  );
  return { total, counts, pct };
}

function measureGransfallSweep() {
  return GRANSFALL.map((g) => {
    const tip = tippingConeDeg({ e: g.e, t: g.t, p: g.p });
    const perCone = {};
    for (const cone of CONE_WIDTHS) {
      perCone[cone] = classifyC({ e: g.e, t: g.t, p: g.p }, cone);
    }
    return {
      name: g.name,
      profile: { e: g.e, t: g.t, p: g.p },
      perCone,
      tippingConeDeg: tip
    };
  });
}

// -------- output -------------------------------------------------------

function fmtPct(x) {
  return `${x.toFixed(1)}%`.padStart(7);
}
function fmtN(n) {
  return `${n}`.padStart(5);
}

function printCubeTable(sweep) {
  const header = ['cone°', ...OUTCOMES.map((o) => o.padStart(15))].join('   ');
  console.log(`\n──── Utfallsfördelning över 9 261 profiler per konvidd ────`);
  console.log(header);
  for (const cone of CONE_WIDTHS) {
    const row = [`${cone}°`.padStart(5)];
    for (const o of OUTCOMES) {
      const m = sweep[cone];
      row.push(`${fmtN(m.counts[o])} ${fmtPct(m.pct[o])}`.padStart(15));
    }
    console.log(row.join('   '));
  }
}

function printGransfallTable(gransfall) {
  console.log(`\n──── Gränsfall (R3 §3.3) per konvidd ────`);
  const header = [
    'gränsfall'.padEnd(38),
    'profil'.padEnd(22),
    ...CONE_WIDTHS.map((c) => `${c}°`.padStart(14))
  ].join('  ');
  console.log(header);
  for (const g of gransfall) {
    const profStr = `(${g.profile.e.toFixed(2)}, ${g.profile.t.toFixed(2)}, ${g.profile.p.toFixed(2)})`;
    const cells = CONE_WIDTHS.map((c) => g.perCone[c].padStart(14));
    console.log([g.name.padEnd(38), profStr.padEnd(22), ...cells].join('  '));
  }
  console.log(`\n──── Analytisk tippunkt per gränsfall ────`);
  console.log(`(vinkel mellan profilens riktning och axeln — profilen är centrum för alla konvidder under detta)`);
  for (const g of gransfall) {
    if (g.tippingConeDeg === null) {
      console.log(`  ${g.name.padEnd(40)}  under magnitudgolv (${MAGNITUDE_FLOOR}) — alltid inget-lån`);
    } else {
      const t = g.tippingConeDeg;
      console.log(
        `  ${g.name.padEnd(40)}  min-vinkel = ${t.min.toFixed(1)}°` +
        `  (till e=${t.angE.toFixed(1)}°, t=${t.angT.toFixed(1)}°, p=${t.angP.toFixed(1)}°)`
      );
    }
  }
}

function printEpistemeShare(sweep) {
  console.log(`\n──── Episteme-sektorns andel per konvidd (R3 §4 i ORDER 093) ────`);
  for (const cone of CONE_WIDTHS) {
    const m = sweep[cone];
    console.log(`  ${`${cone}°`.padStart(5)}   near-episteme = ${fmtN(m.counts['near-episteme'])} (${fmtPct(m.pct['near-episteme'])})`);
  }
}

// -------- main ---------------------------------------------------------

function main() {
  console.log(`ORDER 093 §§ 3–4 — Väg C-utökad, konsvep`);
  const profiles = generateCube();
  console.log(`Genererade ${profiles.length} profiler över (e, t, p) i steg om ${STEP}.`);
  console.log(`Magnitudgolv: ${MAGNITUDE_FLOOR}. Konsvep: ${CONE_WIDTHS.join('°, ')}°.`);

  const sweep = {};
  for (const cone of CONE_WIDTHS) {
    sweep[cone] = measureCube(cone, profiles);
  }
  const gransfallSweep = measureGransfallSweep();

  printCubeTable(sweep);
  printGransfallTable(gransfallSweep);
  printEpistemeShare(sweep);

  // §3.4 — where does e=t=p=0.80 tip from centrum to specialist? Report
  // the analytic answer so §5.1 has a designgräns to compare against.
  const jamnStarkHog = gransfallSweep.find((g) => g.name === 'Jämnstark på hög nivå');
  console.log(`\n──── Designgräns för "bredd är en egen väg" (ORDER 093 §3.4) ────`);
  console.log(`Jämnstark hög (e=t=p=0.80) tippar från centrum till specialist vid coneDeg = ${jamnStarkHog.tippingConeDeg.min.toFixed(2)}°.`);
  console.log(`Inom svepet 20°–50° stannar profilen som "${jamnStarkHog.perCone[50]}" (senaste kolumnen).`);
  console.log(`Tröskeln 54.74° = arccos(1/√3) är den geometriska gränsen — sfärens centrum ligger lika långt`);
  console.log(`från alla tre axlar där. Varje bredd under den läser jämnstark-hög som centrum;`);
  console.log(`varje bredd över tar in profilen i den axel-sektor precedensregeln väljer först (phronesis).`);

  if (process.env.ORDER_093_WRITE_JSON === '1') {
    const out = resolve(REPO_ROOT, 'frontend/reports/order093/cone-sweep.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      JSON.stringify(
        {
          step: STEP,
          stepsPerAxis: STEPS_PER_AXIS,
          totalProfiles: profiles.length,
          magnitudeFloor: MAGNITUDE_FLOOR,
          coneWidths: CONE_WIDTHS,
          sweep,
          gransfall: gransfallSweep,
          jamnstarkHogTippingDeg: jamnStarkHog.tippingConeDeg.min
        },
        null,
        2
      )
    );
    console.log(`\nJSON skriven till ${out.replace(REPO_ROOT + '/', '')}`);
  }
}

main();
