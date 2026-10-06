// @vitest-environment jsdom
// ORDER 308c — Anders 2026-10-06: under öppningen följer byns mark Designs
// grönare ton (skarmar/1280x720/); spelets mark efteråt är oförändrad.
//   1. useOpeningGround är sann bara medan öppningen spelas.
//   2. Blandningen gör marken grönare, och utan öppningen är färgen spelets.
//   3. Markens tre komponenter (terrängen, landytorna, gårdarnas mjuka ytor)
//      byter färg bara i öppningens gren och lägger tillbaka spelets färg.

import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { setOpeningStage } from '../../strategic/opening/openingStage';
import {
  OPENING_GROUND,
  openingGroundActive,
  openingGroundColour,
  openingGroundRgb,
  useOpeningGround
} from '../../strategic/opening/openingGround';

const SRC = resolve(__dirname, '../../strategic');
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const green = ([r, g, b]: number[]) => g - (r + b) / 2;

describe('ORDER 308c — 1. markens färg bara under öppningen', () => {
  afterEach(() => { cleanup(); setOpeningStage({ active: false, t: 0, e: 0 }); });

  it('openingGroundActive följer öppningens läge', () => {
    setOpeningStage({ active: false, t: 0, e: 0 });
    expect(openingGroundActive()).toBe(false);
    setOpeningStage({ active: true, t: 9, e: 0.12 });
    expect(openingGroundActive()).toBe(true);
    setOpeningStage({ active: false, t: 42, e: 0.34 });
    expect(openingGroundActive()).toBe(false);
  });

  it('useOpeningGround ritar om när öppningen börjar och slutar', () => {
    const seen: boolean[] = [];
    function Probe() { seen.push(useOpeningGround()); return null; }
    render(createElement(Probe));
    expect(seen.at(-1)).toBe(false);
    act(() => setOpeningStage({ active: true, t: 0.5, e: 0.1 }));
    expect(seen.at(-1)).toBe(true);
    act(() => setOpeningStage({ active: false, t: 41, e: 0.3 }));
    expect(seen.at(-1)).toBe(false);
  });
});

describe('ORDER 308c — 2. blandningen', () => {
  it('marken blir grönare (sand, gräs, skog, gårdarnas grus)', () => {
    for (const c of ['#a89e85', '#8a9575', '#5a6152', '#a89a80', '#79806b']) {
      const after = hex(openingGroundColour(c));
      expect(green(after), c).toBeGreaterThan(green(hex(c)));
    }
    expect(OPENING_GROUND.mix).toBeGreaterThan(0);
    expect(OPENING_GROUND.mix).toBeLessThan(1);
  });

  it('terrängens färger per hörn blandas på samma sätt (linjära värden)', () => {
    const base = new THREE.Color('#79806b');
    const arr = new Float32Array([base.r, base.g, base.b]);
    openingGroundRgb(arr);
    const t = new THREE.Color(OPENING_GROUND.colour);
    const k = OPENING_GROUND.mix;
    expect(arr[0]).toBeCloseTo(base.r * (1 - k) + t.r * k, 6);
    expect(arr[1]).toBeCloseTo(base.g * (1 - k) + t.g * k, 6);
    expect(arr[2]).toBeCloseTo(base.b * (1 - k) + t.b * k, 6);
  });
});

describe('ORDER 308c — 3. markens komponenter', () => {
  const read = (f: string) => readFileSync(resolve(SRC, f), 'utf8');

  it('terrängen: spelets färger läggs alltid tillbaka, öppningens bara när den spelas', () => {
    const src = read('scene/OsmTerrain.tsx');
    expect(src).toMatch(/const opening = useOpeningGround\(\);/);
    expect(src).toMatch(/arr\.set\(gameColours\);\s*if \(opening\) openingGroundRgb\(arr\);\s*attr\.needsUpdate = true;/);
  });

  it('landytorna: öppningens färg bara när öppningen spelas', () => {
    const src = read('scene/OsmDistricts.tsx');
    expect(src).toMatch(/const opening = useOpeningGround\(\);/);
    expect(src).toContain('color={opening ? openingGroundColour(p.game) : p.game}');
  });

  it('gårdarna: bara de mjuka ytorna, bara när öppningen spelas', () => {
    const src = read('scene/OsmYardSurfaces.tsx');
    expect(src).toMatch(/const opening = useOpeningGround\(\);/);
    expect(src).toContain('color={opening && SOFT_SURFACES.has(style) ? openingGroundColour(appearance.colour) : appearance.colour}');
    expect(src).toContain("new Set<SurfaceStyle>(['grass', 'gravel', 'worn-dirt', 'mixed'])");
  });

  it('ingen annan del av scenen läser öppningens mark', () => {
    const users = ['scene/OsmTerrain.tsx', 'scene/OsmDistricts.tsx', 'scene/OsmYardSurfaces.tsx'];
    for (const f of ['scene/OsmRoads.tsx', 'scene/OsmBuildings.tsx', 'scene/DayLighting.tsx', 'village/EveningLighting.tsx']) {
      expect(read(f), f).not.toContain('openingGround');
    }
    for (const f of users) expect(read(f), f).toContain("from '../opening/openingGround'");
  });
});
