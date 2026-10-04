// ORDER 302 — gatans folk (Anders 2026-10-04).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sidewalkOffsets, pointAlongSeg, walkNetwork, routeBetween } from '../../strategic/content/villageNetwork';
import { venuePlaces, villageSources } from '../../strategic/content/villagePlaces';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('ORDER 302 — gatans folk', () => {
  it('trottoaren ligger vid sidan av bilgatorna, gångvägarna går man på', () => {
    const g = walkNetwork();
    const src = villageSources();
    const door = venuePlaces().torgkrogen.door;
    const route = routeBetween(g, src.homes[0], door);
    const off = sidewalkOffsets(route);
    expect(off.length).toBe(route.length);
    expect(off.some((o) => o > 2)).toBe(true);
    expect(off.every((o) => o >= 0 && o < 5)).toBe(true);
    const mid = pointAlongSeg(route, 5);
    expect(mid.seg).toBeGreaterThanOrEqual(0);
    expect(mid.t).toBeGreaterThanOrEqual(0);
  });

  it('sällskapen 1–4, få ensamma; fart, sida, pauser och samlingen vid dörren', () => {
    const src = readFileSync(resolve(SRC, 'strategic/scene/village/VillageLife.tsx'), 'utf8');
    const weights = src.match(/PARTY_WEIGHTS: Array<\[number, number\]> = (\[.*\]);/)![1];
    const w = JSON.parse(weights) as Array<[number, number]>;
    expect(w.map((x) => x[0])).toEqual([1, 2, 3, 4]);
    expect(w[0][1]).toBeLessThan(0.15);
    expect(w.reduce((a, x) => a + x[1], 0)).toBeCloseTo(1);
    for (const s of ['PACE_SPREAD', 'ABREAST_M', 'PAUSE_CHANCE', 'MENU_CHANCE', 'GATHER_MIN', 'EARLY_LEAVE_MIN', 'wordAway']) expect(src).toContain(s);
  });
});
