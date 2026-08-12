// ORDER 056 Del E — determinism + distribution invariants.

import { describe, it, expect } from 'vitest';
import { paramsFor, paramsKey } from '../paramsFor';

describe('paramsFor — determinism (ORDER 056 Del E)', () => {
  it('same OSM id → identical params across calls', () => {
    const a = paramsFor('w869907963');
    const b = paramsFor('w869907963');
    expect(a).toEqual(b);
  });

  it('different OSM ids → different params (in expectation)', () => {
    // Not a strict guarantee — two hashes can collide — but over a
    // small sample the space should show diversity.
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) seen.add(paramsKey(paramsFor(`w${i}`)));
    // 20 draws over the schema's ~10k product space should give many
    // distinct params — accept ≥ 6.
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it('takvinkel is inside 22..45 degrees', () => {
    for (let i = 0; i < 100; i++) {
      const p = paramsFor(`b${i}`);
      expect(p.takvinkel).toBeGreaterThanOrEqual(22);
      expect(p.takvinkel).toBeLessThanOrEqual(45);
    }
  });

  it('fonsterrytm is inside 0.20..0.35', () => {
    for (let i = 0; i < 100; i++) {
      const p = paramsFor(`b${i}`);
      expect(p.fonsterrytm).toBeGreaterThanOrEqual(0.19);
      expect(p.fonsterrytm).toBeLessThanOrEqual(0.36);
    }
  });
});

describe('paramsFor — distribution weighted toward Grythyttan reality', () => {
  it('majority of buildings are falurod (dominant, > 55%)', () => {
    let falurod = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      if (paramsFor(`w${i}`).kulor === 'falurod') falurod += 1;
    }
    // Weight is 0.68; a 500-sample proportion should land inside
    // ±0.05 of that. Bound loosely so a re-seed doesn't flake.
    expect(falurod / N).toBeGreaterThan(0.55);
    expect(falurod / N).toBeLessThan(0.80);
  });

  it('tegel dominates roof cladding (> 60%)', () => {
    let tegel = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      if (paramsFor(`w${i}`).taktackning === 'tegel') tegel += 1;
    }
    expect(tegel / N).toBeGreaterThan(0.60);
    expect(tegel / N).toBeLessThan(0.82);
  });

  it('tjärpapp is rare (< 12%)', () => {
    let tj = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      if (paramsFor(`w${i}`).taktackning === 'tjarpapp') tj += 1;
    }
    expect(tj / N).toBeLessThan(0.12);
  });

  it('white corner-boards are the norm (> 70%)', () => {
    let vit = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      if (paramsFor(`w${i}`).knutar === 'vit') vit += 1;
    }
    expect(vit / N).toBeGreaterThan(0.70);
  });
});
