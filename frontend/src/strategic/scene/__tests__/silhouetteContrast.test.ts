// ORDER 123 §5 — silhuett-kontrastmodulen: enhetstester.
//
// Testerna prövar formlerna direkt (WCAG luminans, WCAG kontrast-
// förhållande, CIE 76 ΔE) mot kända referensvärden. Paletterna
// (ROLE_COLOUR + GUEST_COLOUR) testas separat i
// `paletteContrast.test.ts`.

import { describe, expect, it } from 'vitest';
import {
  FLOOR_COLOUR,
  MIN_FLOOR_CONTRAST_RATIO,
  MAX_FLOOR_CONTRAST_RATIO,
  MIN_ROLE_DISTINCTION_DELTA_E,
  relativeLuminance,
  contrastRatio,
  isInFloorContrastBand,
  deltaE76
} from '../silhouetteContrast';

describe('ORDER 123 §5 — kontrast-modulens formler', () => {
  it('svart har luminans 0', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('vitt har luminans 1', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('mid-grå ligger runt 0,2 (perceptuellt "mitten")', () => {
    // #808080 sRGB → linear via WCAG-formeln → luminans ~0,2159.
    const L = relativeLuminance('#808080');
    expect(L).toBeGreaterThan(0.20);
    expect(L).toBeLessThan(0.24);
  });

  it('golvfärgen har luminans runt 0,3', () => {
    // Sanity — golvet #a89577 mätt i beräkningen.
    const L = relativeLuminance(FLOOR_COLOUR);
    expect(L).toBeGreaterThan(0.28);
    expect(L).toBeLessThan(0.34);
  });

  it('kontrastförhållande svart mot vitt = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('kontrastförhållande är symmetriskt', () => {
    const c1 = contrastRatio('#4a5464', FLOOR_COLOUR);
    const c2 = contrastRatio(FLOOR_COLOUR, '#4a5464');
    expect(c1).toBeCloseTo(c2, 5);
  });

  it('identiska färger ger kontrast 1', () => {
    expect(contrastRatio('#a89577', '#a89577')).toBeCloseTo(1, 5);
  });

  it('kontrast alltid ≥ 1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThanOrEqual(1);
    expect(contrastRatio('#a89577', '#a89577')).toBeGreaterThanOrEqual(1);
  });

  it('ΔE 76 svart mot vitt ≈ 100 (Lab L-skillnad dominerar)', () => {
    const d = deltaE76('#000000', '#ffffff');
    expect(d).toBeGreaterThan(99);
    expect(d).toBeLessThan(101);
  });

  it('ΔE 76 mellan identiska färger = 0', () => {
    expect(deltaE76('#a89577', '#a89577')).toBeCloseTo(0, 5);
  });

  it('ΔE 76 mellan olika hue > mellan liknande hue', () => {
    // Kontrasterande hue (varm brun vs kall blå) ska ha större ΔE
    // än två liknande varma toner.
    const differentHue = deltaE76('#4a5c74', '#6b5544');  // blå vs brun
    const similarHue = deltaE76('#4a5c74', '#55606a');    // blå vs kall grå
    expect(differentHue).toBeGreaterThan(similarHue);
  });

  it('isInFloorContrastBand accepterar färg i bandet', () => {
    // #4a5464 mot #a89577 = kontrast ~2,59, säkert inom bandet.
    expect(isInFloorContrastBand('#4a5464')).toBe(true);
  });

  it('isInFloorContrastBand avvisar för mörk färg (över MAX)', () => {
    // Pitch black mot golv har kontrast ~7,5.
    expect(contrastRatio('#000000', FLOOR_COLOUR)).toBeGreaterThan(MAX_FLOOR_CONTRAST_RATIO);
    expect(isInFloorContrastBand('#000000')).toBe(false);
  });

  it('isInFloorContrastBand avvisar färg som blandas med golvet (under MIN)', () => {
    // Golvet mot sig själv = kontrast 1, långt under MIN.
    expect(isInFloorContrastBand(FLOOR_COLOUR)).toBe(false);
  });

  it('bandkonstanter är rimliga (MIN < MAX, MIN > 1)', () => {
    expect(MIN_FLOOR_CONTRAST_RATIO).toBeGreaterThan(1);
    expect(MAX_FLOOR_CONTRAST_RATIO).toBeGreaterThan(MIN_FLOOR_CONTRAST_RATIO);
    expect(MIN_ROLE_DISTINCTION_DELTA_E).toBeGreaterThan(0);
  });

  it('felaktig hex kastar', () => {
    expect(() => relativeLuminance('abc')).toThrow();
    expect(() => relativeLuminance('#gggggg')).toThrow();
    expect(() => relativeLuminance('#12345')).toThrow();  // 5 tecken
  });
});
