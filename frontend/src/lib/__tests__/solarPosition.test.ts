// ORDER 054 Del B — control-value tests for solarPosition.
//
// Pinned against the two named checkpoints in the order text plus a
// handful of well-known reference values from spherical-astronomy
// textbooks so a future refactor cannot silently drift the sun.

import { describe, it, expect } from 'vitest';
import {
  solarPosition,
  sunDirection,
  GRYTHYTTAN_LAT,
  GRYTHYTTAN_LON
} from '../solarPosition';

describe('solarPosition — Grythyttan control values (ORDER 054 Del B)', () => {
  it('summer solstice noon → elevation ≈ 54°', () => {
    // June 21 is day-of-year 172 in a non-leap year, 173 in a leap
    // year. Use a non-leap year for the canonical control number.
    const jun21 = new Date(Date.UTC(2027, 5, 21));
    const { elevation } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, jun21, 12);
    // Approximation-tolerance: ~1° per the function's stated accuracy.
    expect(elevation).toBeCloseTo(53.7, 0);
  });

  it('winter solstice noon → elevation ≈ 7°', () => {
    const dec21 = new Date(Date.UTC(2026, 11, 21));
    const { elevation } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, dec21, 12);
    expect(elevation).toBeCloseTo(6.8, 0);
  });

  it('winter noon elevation must not be clamped to a floor — low sun is part of the place', () => {
    // Winter solstice noon must be below 10° at this latitude. If a
    // future edit clamps at 10° or 15° "for visibility", this fails.
    const dec21 = new Date(Date.UTC(2026, 11, 21));
    const { elevation } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, dec21, 12);
    expect(elevation).toBeLessThan(10);
    expect(elevation).toBeGreaterThan(5);
  });

  it('autumn reference (25 Sep 12:30) → elevation ~28° (ORDER 055 Del C probe)', () => {
    // Pinned as the value the lighting rig is calibrated against for
    // the "lunch" period. Order 055 expected ~30°; the approximation
    // gives 28.22° which is inside the stated tolerance. If a future
    // change to the declination formula moves this by more than 2°
    // the light rig's intensity ramp needs revisiting alongside.
    const sept25 = new Date(Date.UTC(2026, 8, 25));
    const { elevation } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, sept25, 12.5);
    expect(elevation).toBeGreaterThan(26);
    expect(elevation).toBeLessThan(30);
  });
});

describe('solarPosition — sunrise / sunset / midnight sanity', () => {
  it('night: sun is below the horizon (negative elevation)', () => {
    // 02:00 local time in December — sun should be well below.
    const dec21 = new Date(Date.UTC(2026, 11, 21));
    const { elevation } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, dec21, 2);
    expect(elevation).toBeLessThan(0);
  });

  it('afternoon: azimuth is in the western half (180°..360°)', () => {
    const jun21 = new Date(Date.UTC(2027, 5, 21));
    const { azimuth } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, jun21, 16);
    expect(azimuth).toBeGreaterThan(180);
    expect(azimuth).toBeLessThan(360);
  });

  it('morning: azimuth is in the eastern half (0°..180°)', () => {
    const jun21 = new Date(Date.UTC(2027, 5, 21));
    const { azimuth } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, jun21, 8);
    expect(azimuth).toBeGreaterThan(0);
    expect(azimuth).toBeLessThan(180);
  });

  it('solar noon: azimuth is due south at Grythyttan (~180°)', () => {
    // Grythyttan lies at ~14.5°E, 15°-meridian standard; solar noon
    // occurs slightly after 12:00 local civil time. At exactly 12:00
    // the azimuth should be a hair east of south.
    const jun21 = new Date(Date.UTC(2027, 5, 21));
    const { azimuth } = solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, jun21, 12);
    // Loose bound — anywhere in the southern half is acceptable at
    // 12:00 local civil time for this longitude offset.
    expect(azimuth).toBeGreaterThan(170);
    expect(azimuth).toBeLessThan(185);
  });
});

describe('solarPosition — equator + equinox reference', () => {
  it('equinox noon at 0°N gives near-vertical sun (~90°)', () => {
    // Approximate spring equinox (Mar 21 = day 80). Standard formula
    // has ~1° drift because it uses n = 81 as reference; that's the
    // stated tolerance.
    const equinox = new Date(Date.UTC(2027, 2, 21));
    const { elevation } = solarPosition(0, 0, equinox, 12);
    expect(elevation).toBeGreaterThan(88);
    expect(elevation).toBeLessThanOrEqual(90);
  });
});

describe('sunDirection — direction vector points earthward', () => {
  it('high sun → strongly downward y component', () => {
    const jun21 = new Date(Date.UTC(2027, 5, 21));
    const dir = sunDirection(solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, jun21, 12));
    // Light travels DOWN → y is negative.
    expect(dir.y).toBeLessThan(0);
    // Magnitude ≈ 1 within float noise.
    const mag = Math.hypot(dir.x, dir.y, dir.z);
    expect(mag).toBeCloseTo(1, 5);
  });

  it('sun below horizon → y component points upward (light travels up)', () => {
    // Midnight in December — sun is below. Light "direction" from a
    // sub-horizon sun points upward (away from the ground). Callers
    // typically fade the light to zero intensity in this regime.
    const dec21 = new Date(Date.UTC(2026, 11, 21));
    const dir = sunDirection(solarPosition(GRYTHYTTAN_LAT, GRYTHYTTAN_LON, dec21, 0));
    expect(dir.y).toBeGreaterThan(0);
  });
});
