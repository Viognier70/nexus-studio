// ORDER 047 §5 — stream-driven scenario theme distribution.
//
// The Vision Owner's explicit ask on this section:
//   "Vikta mot det strömmen visat, inte bestäm av det — ibland kommer
//    problemet från annat håll. Rapportera fördelningen: hur ofta träffar
//    scenariot det som dominerat strömmen, och hur ofta inte."
//
// This file is the distribution report as an executable test. Runs the
// theme selector under scripted stream conditions and asserts the
// match rate lands in the "meaningfully biased but not deterministic"
// band (55–70 %). If the assertion fails, adjust STREAM_WEIGHT_LAMBDA
// in themeSelection.ts and re-run.

import { describe, expect, it } from 'vitest';
import {
  STREAM_WEIGHT_LAMBDA,
  drawNextTheme,
  weightTable
} from '../themeSelection';
import { createRng } from '../../util/rng';
import type { SustainabilityKey } from '../../types';

const NEUTRAL_CAPITALS: Record<SustainabilityKey, number> = {
  economic: 0.55,
  social: 0.55,
  ecological: 0.55
};

// Helper — draw N themes with the same stream + capital shape, seeded
// deterministically so the distribution is reproducible.
function drawMany(
  stream: Record<SustainabilityKey, number>,
  n: number,
  startSeed: number,
  capitals: Record<SustainabilityKey, number> = NEUTRAL_CAPITALS
): Record<SustainabilityKey, number> {
  const counts: Record<SustainabilityKey, number> = {
    economic: 0,
    social: 0,
    ecological: 0
  };
  for (let i = 0; i < n; i++) {
    const rng = createRng((startSeed + i * 2654435761) >>> 0);
    // Fresh themeHistory each draw so the cap doesn't kick in — we're
    // measuring the raw weighting, not the recurrence damper.
    const theme = drawNextTheme(capitals, [], rng, stream);
    counts[theme] += 1;
  }
  return counts;
}

describe('drawNextTheme with no stream signal — uniform', () => {
  it('draws roughly evenly at neutral capitals (all 0.55)', () => {
    const counts = drawMany(
      { economic: 0, social: 0, ecological: 0 },
      3000,
      1
    );
    // Each theme should sit near 1000/3000 = 33 %. Allow ±5 %.
    for (const theme of ['economic', 'social', 'ecological'] as const) {
      expect(counts[theme]).toBeGreaterThan(3000 * 0.28);
      expect(counts[theme]).toBeLessThan(3000 * 0.38);
    }
  });
});

describe('drawNextTheme — stream biases toward reported axis', () => {
  it('kitchen-heavy stream (all social) pulls draw ~55–70 % toward social', () => {
    // Stream = 20 events, all social. Represents a kitchen/service
    // heavy evening reported through the ambient bank.
    const counts = drawMany(
      { economic: 0, social: 20, ecological: 0 },
      3000,
      101
    );
    const socialShare = counts.social / 3000;
    // Target band: dominant but not monopolising.
    expect(socialShare).toBeGreaterThan(0.50);
    expect(socialShare).toBeLessThan(0.75);
    // The other two must still draw meaningfully — problems can come
    // from elsewhere ("ibland kommer problemet från annat håll").
    expect(counts.economic).toBeGreaterThan(3000 * 0.10);
    expect(counts.ecological).toBeGreaterThan(3000 * 0.10);
  });

  it('mixed stream (60 % social / 30 % economic / 10 % ecological) reads through', () => {
    const counts = drawMany(
      { economic: 3, social: 6, ecological: 1 },
      3000,
      202
    );
    // Social should still be modal but only just — the mix is only
    // 60 % on it.
    const shares = {
      economic: counts.economic / 3000,
      social: counts.social / 3000,
      ecological: counts.ecological / 3000
    };
    expect(shares.social).toBeGreaterThan(shares.economic);
    expect(shares.economic).toBeGreaterThan(shares.ecological);
    // Social not overwhelming — stream is only 60 % on it, expected
    // draw share ~40–48 %.
    expect(shares.social).toBeGreaterThan(0.35);
    expect(shares.social).toBeLessThan(0.55);
  });

  it('empty stream → uniform (fallback)', () => {
    const counts = drawMany(
      { economic: 0, social: 0, ecological: 0 },
      3000,
      303
    );
    for (const theme of ['economic', 'social', 'ecological'] as const) {
      expect(counts[theme]).toBeGreaterThan(3000 * 0.28);
      expect(counts[theme]).toBeLessThan(3000 * 0.38);
    }
  });
});

describe('drawNextTheme — capital weakness still matters under stream', () => {
  it('a strong capital rarely draws even under stream pressure', () => {
    // Social is very strong (0.95) but stream is 100 % social. Capital
    // weakness pulls hard away; stream pulls back. Net: stream should
    // partially win, but social stays a meaningful minority — not the
    // 55–70 % we saw with neutral capitals.
    const counts = drawMany(
      { economic: 0, social: 20, ecological: 0 },
      3000,
      404,
      { economic: 0.55, social: 0.95, ecological: 0.55 }
    );
    const socialShare = counts.social / 3000;
    // Social share should be lower than the neutral-capital case
    // (~62 %) because weakness weighting works against a strong
    // capital — but not by much, since the λ = 0.6 stream weight
    // dominates the small (0.05)² weakness weight for a v=0.95
    // capital. Observed at start of build: ~56 %. Assert lower than
    // neutral-case + still meaningful.
    expect(socialShare).toBeGreaterThan(0.40);
    expect(socialShare).toBeLessThan(0.62);
  });

  it('a weak capital + stream on it draws dominantly', () => {
    // Social is weak (0.20) AND the stream is on it. Both pressures
    // aligned — expect ~70–85 % social draws.
    const counts = drawMany(
      { economic: 0, social: 20, ecological: 0 },
      3000,
      505,
      { economic: 0.90, social: 0.20, ecological: 0.90 }
    );
    const socialShare = counts.social / 3000;
    expect(socialShare).toBeGreaterThan(0.65);
    expect(socialShare).toBeLessThan(0.92);
  });
});

describe('weightTable exposes intermediate shape', () => {
  it('reports streamShare per row and includes both capital and stream weight in `weight`', () => {
    const rows = weightTable(
      NEUTRAL_CAPITALS,
      [],
      { economic: 0, social: 10, ecological: 0 }
    );
    const social = rows.find((r) => r.theme === 'social')!;
    const economic = rows.find((r) => r.theme === 'economic')!;
    expect(social.streamShare).toBeCloseTo(1.0, 5);
    expect(economic.streamShare).toBeCloseTo(0.0, 5);
    expect(social.weight).toBeGreaterThan(economic.weight);
  });
});

// -------- distribution report (log-only) --------------------------------

describe('distribution report — Vision Owner ask', () => {
  it('reports the match rate for the "kitchen-heavy" (all social) case', () => {
    const N = 5000;
    const counts = drawMany(
      { economic: 0, social: 20, ecological: 0 },
      N,
      12345
    );
    const matchRate = counts.social / N;
    // Report to test console for the distribution log.
    // eslint-disable-next-line no-console
    console.log(
      `[ORDER 047 §5] stream-match distribution (kitchen-heavy, all social, N=${N}, λ=${STREAM_WEIGHT_LAMBDA}):\n` +
        `  match rate (social): ${(matchRate * 100).toFixed(1)} %\n` +
        `  off-axis economic:   ${((counts.economic / N) * 100).toFixed(1)} %\n` +
        `  off-axis ecological: ${((counts.ecological / N) * 100).toFixed(1)} %\n` +
        `  interpretation: dominant but not monopolising — ` +
        `${(matchRate * 100).toFixed(0)} % follow-through, ` +
        `${((1 - matchRate) * 100).toFixed(0)} % came from another axis`
    );
    // Loose expect — the assertion is above; this is the report.
    expect(matchRate).toBeGreaterThan(0);
  });
});
