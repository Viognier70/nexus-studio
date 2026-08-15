// ORDER 056 Del E — deterministic facade params from an OSM id.
//
// A building's params come from a hash of its OSM id, so the same
// house looks the same between sessions but the neighbours differ.
// Distributions are weighted toward the reference photos of
// Grythyttan: majority Falu red with white corner-boards, tegel roof
// most common, tjärpapp on outbuildings only. Even distributions
// across the space read wrong — a village where every colour is
// equally likely is not a Bergslag village.

import type {
  FacadeParams,
  Kulör,
  Panel,
  Vaningar,
  Takvinkel,
  Taktackning,
  Knutar,
  Sockel,
  Fonstertyp
} from './schema';

// FNV-1a 32-bit hash of the OSM id string. Cheap, well-distributed
// for short strings, and stable across engines. Not cryptographic
// (we do not need it to be).
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// A tiny stream of pseudo-random floats from a seed. Each `next()`
// re-hashes the seed with an incrementing counter so calls are
// deterministic and order-sensitive (same call sequence, same
// results). Range [0, 1).
function stream(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n ^ (n >>> 15), 0x2c1b3c6d) >>> 0) ^ (n >>> 12);
    n = (Math.imul(n ^ (n << 3), 0x297a2d39) >>> 0) ^ (n >>> 7);
    return (n >>> 0) / 4294967296;
  };
}

// Weighted-choice picker. Weights need not sum to 1; the sum defines
// the denominator. Empty entries fall through to the last option
// (defensive; upstream lists are exhaustive).
function pick<T>(rng: () => number, entries: readonly [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// Interpolate between a and b using a uniform draw.
function pickRange(rng: () => number, a: number, b: number): number {
  return a + rng() * (b - a);
}

// Distribution weights — anchored to reference photos of Grythyttan.
// Order matters (readability + determinism when tuning).
const KULOR_WEIGHTS: readonly [Kulör, number][] = [
  ['falurod',  0.68],   // dominant — Bergslag baseline
  ['ockragul', 0.14],   // occasional — ochre farms + inns
  ['vit',      0.13],   // painted / plastered (Kärnhuset kind)
  ['ljusgra',  0.05]    // rare — grey outbuildings
];

const PANEL_WEIGHTS: readonly [Panel, number][] = [
  ['locklist',          0.55],  // most common on Bergslag houses
  ['staende_lockpanel', 0.30],
  ['liggande_fasspont', 0.15]   // less common; barns + newer builds
];

const VANINGAR_WEIGHTS: readonly [Vaningar, number][] = [
  [1,   0.30],
  [1.5, 0.35],  // very common — knee-wall + gable rooms
  [2,   0.35]
];

const TAKTACKNING_WEIGHTS: readonly [Taktackning, number][] = [
  ['tegel',    0.72],   // dominant
  ['plat',     0.22],   // secondary — industrial + modern
  ['tjarpapp', 0.06]    // outbuildings only
];

const KNUTAR_WEIGHTS: readonly [Knutar, number][] = [
  ['vit',    0.82],
  ['omalad', 0.18]
];

const SOCKEL_WEIGHTS: readonly [Sockel, number][] = [
  ['grasten', 0.62],
  ['puts',    0.28],
  ['ingen',   0.10]
];

const FONSTERTYP_WEIGHTS: readonly [Fonstertyp, number][] = [
  ['korspost', 0.55],   // classic Bergslag two-over-two
  ['tvaluft',  0.30],
  ['enluft',   0.15]
];

/**
 * Derive facade params for a building deterministically from its OSM
 * id. Same id → identical params on every load.
 *
 * @param osmId  OSM way / relation id as a string (e.g. "w869907963").
 * @returns  A fully-populated FacadeParams object.
 */
export function paramsFor(osmId: string): FacadeParams {
  const rng = stream(hash32(osmId));
  const kulor: Kulör = pick(rng, KULOR_WEIGHTS);
  const panel: Panel = pick(rng, PANEL_WEIGHTS);
  const vaningar: Vaningar = pick(rng, VANINGAR_WEIGHTS);
  // Takvinkel — pitched roof range 22°–45°. Draw + snap to whole
  // degrees so nearby-but-not-identical numbers still hash the same
  // way when we group by params for InstancedMesh sharing (ORDER 056
  // Del F). Snap step 3°.
  const raw: Takvinkel = pickRange(rng, 22, 45);
  // Snap to 3° for InstancedMesh sharing; clamp back into range so
  // rounding down at the low end can't leave the domain.
  const takvinkel: Takvinkel = Math.max(22, Math.min(45, Math.round(raw / 3) * 3));
  const taktackning: Taktackning = pick(rng, TAKTACKNING_WEIGHTS);
  const knutar: Knutar = pick(rng, KNUTAR_WEIGHTS);
  const sockel: Sockel = pick(rng, SOCKEL_WEIGHTS);
  // Fönsterrytm 0.20–0.35 wpm covers the observed cluster. Snap to
  // 0.05 for the same sharing reason as takvinkel.
  const fonsterrytmRaw = pickRange(rng, 0.20, 0.35);
  const fonsterrytm = Math.round(fonsterrytmRaw / 0.05) * 0.05;
  const fonstertyp: Fonstertyp = pick(rng, FONSTERTYP_WEIGHTS);
  return {
    kulor,
    panel,
    vaningar,
    takvinkel,
    taktackning,
    knutar,
    sockel,
    fonsterrytm,
    fonstertyp
  };
}

/**
 * A short stable key that groups buildings with identical rendering
 * parameters, for InstancedMesh sharing (ORDER 056 Del F). Two
 * buildings with the same key can share the same generated geometry
 * transformed by a per-instance matrix.
 *
 * Note: this only accounts for stylistic params, not footprint. Two
 * buildings with matching params but different footprints CANNOT
 * share geometry directly — the generator's output is footprint-
 * shaped. The key is therefore an input to a second bucket step in
 * the wiring layer (see ProceduralFacades).
 */
export function paramsKey(p: FacadeParams): string {
  return [
    p.kulor,
    p.panel,
    p.vaningar,
    p.takvinkel,
    p.taktackning,
    p.knutar,
    p.sockel,
    p.fonsterrytm.toFixed(2),
    p.fonstertyp
  ].join('|');
}
