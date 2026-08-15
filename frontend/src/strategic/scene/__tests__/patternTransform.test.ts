// ORDER 088 §7 — pattern-transform DoD tests.
//
// §7.4 same pattern → same transform (pure function)
// §7.5 IMPATIENT is the only pattern with negative lean
// §7.6 13/14/20 share code path with 01/02/03 under profile 'guest'
//      — no duplicated pattern function

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GUEST_ONLY_KINDS,
  SHARED_KINDS,
  STAFF_TO_GUEST_KIND,
  computePatternTransform
} from '../patternTransform';
import { ALL_GUEST_PATTERN_LABELS } from '../../ui/RoomCardPanel/guestPatterns';

// -------- §7.4 determinism ---------------------------------------------

describe('ORDER 088 §7.4 — computePatternTransform is a pure function', () => {
  it('same (label, profile, simTime, seed) tuple returns same transform', () => {
    for (const label of ALL_GUEST_PATTERN_LABELS) {
      const a = computePatternTransform(label, 'guest', 12.34, 1.5);
      for (let i = 0; i < 5; i += 1) {
        const b = computePatternTransform(label, 'guest', 12.34, 1.5);
        expect(b).toEqual(a);
      }
    }
  });

  it('different simTime for oscillating patterns yields different bob', () => {
    // EAT has bobAmpM > 0; two distinct times inside one period should
    // give distinct bobY. Guarantees the function is actually reading
    // simTime, not constant.
    const t1 = computePatternTransform('EAT', 'guest', 0.5, 0);
    const t2 = computePatternTransform('EAT', 'guest', 1.5, 0);
    expect(t1.bobY).not.toBe(t2.bobY);
  });

  it('no Math.random / Date.now / performance.now in patternTransform.ts', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(thisDir, '..', 'patternTransform.ts'), 'utf8');
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(/Math\.random\s*\(/.test(stripped)).toBe(false);
    expect(/Date\.now\s*\(/.test(stripped)).toBe(false);
    expect(/performance\.now\s*\(/.test(stripped)).toBe(false);
  });
});

// -------- §7.5 IMPATIENT is the only pattern with negative lean --------

describe('ORDER 088 §7.5 — IMPATIENT is the only backwards-leaning pattern', () => {
  it('IMPATIENT leans backwards; every other pattern leans forwards or zero', () => {
    for (const label of ALL_GUEST_PATTERN_LABELS) {
      const t = computePatternTransform(label, 'guest', 0, 0);
      if (label === 'IMPATIENT') {
        expect(t.leanRad).toBeLessThan(0);
      } else {
        expect(t.leanRad).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// -------- §7.6 shared code path (no duplicate pattern function) --------

describe('ORDER 088 §7.6 — 13/14/20 share code path with 01/02/03 under profile guest', () => {
  it('STAFF_TO_GUEST_KIND maps each staff pattern label to a shared kind', () => {
    for (const k of Object.keys(STAFF_TO_GUEST_KIND)) {
      const kind = STAFF_TO_GUEST_KIND[k as keyof typeof STAFF_TO_GUEST_KIND];
      expect(SHARED_KINDS.includes(kind)).toBe(true);
    }
  });

  it('SHARED_KINDS is exactly IDLE/WALK/EXIT — no duplicated pattern function elsewhere', () => {
    expect(new Set(SHARED_KINDS)).toEqual(new Set(['IDLE', 'WALK', 'EXIT']));
  });

  it('GUEST_ONLY_KINDS excludes the shared kinds — no overlap', () => {
    for (const g of GUEST_ONLY_KINDS) {
      expect(SHARED_KINDS.includes(g as unknown as typeof SHARED_KINDS[number])).toBe(false);
    }
    expect(new Set(GUEST_ONLY_KINDS)).toEqual(
      new Set(['SIT DOWN', 'READ MENU', 'HAIL', 'IMPATIENT', 'EAT'])
    );
  });

  it('grep audit — no second computePatternTransform function anywhere else', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    // Search the whole strategic scene folder for another function
    // matching the same signature. Only one owner allowed (this file).
    // (This is a "no duplicated pattern function" grep for §7.6.)
    const sceneDir = resolve(thisDir, '..');
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    let ownerCount = 0;
    function walk(dir: string): void {
      for (const entry of readdirSync(dir)) {
        if (entry === '__tests__') continue;
        const full = `${dir}/${entry}`;
        try {
          const st = require('node:fs').statSync(full);
          if (st.isDirectory()) { walk(full); continue; }
          if (!/\.(ts|tsx)$/.test(entry)) continue;
          const txt = readFileSync(full, 'utf8');
          if (/export\s+function\s+computePatternTransform\s*\(/.test(txt)) ownerCount += 1;
        } catch { /* ignore */ }
      }
    }
    walk(sceneDir);
    expect(ownerCount).toBe(1);
  });

  it('bob amplitudes differ between guest and staff profiles for shared kinds', () => {
    // Same primitive function, different profile → different amplitude
    // (guest 0.9 cm vs staff 5 cm on IDLE). Proves the profile param
    // actually branches the amplitude table.
    const g = computePatternTransform('IDLE', 'guest', 1.5, 0);
    const s = computePatternTransform('IDLE', 'staff', 1.5, 0);
    expect(Math.abs(g.bobY)).not.toBe(Math.abs(s.bobY));
  });
});

// -------- §7.7 pip presence check (function-level) ---------------------

describe('ORDER 088 §7.7 — pip constants exist and are shared', () => {
  it('pip module exports PIP_SIZE_M, PIP_OFFSET_ABOVE_PUCK_TOP_M, PIP_COLOUR', async () => {
    const mod = await import('../patternTransform');
    expect(typeof mod.PIP_SIZE_M).toBe('number');
    expect(typeof mod.PIP_OFFSET_ABOVE_PUCK_TOP_M).toBe('number');
    expect(typeof mod.PIP_COLOUR).toBe('string');
    // Sanity — a pip shouldn't be bigger than the puck it sits on.
    expect(mod.PIP_SIZE_M).toBeLessThan(0.5);
  });
});
