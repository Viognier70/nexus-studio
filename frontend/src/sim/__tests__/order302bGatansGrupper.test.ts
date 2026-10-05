// ORDER 302b (Anders 2026-10-05) — gatans folk i Designs D5-grupper
// (scene/guestGroups.ts, scene/guestLooks.ts), på gatans figurer
// (scene/village/VillageLife.tsx med village/streetLooks.ts).
//
// Tecknens storlek i bild räknas ur samma geometri som renderingen
// (streetSignGeometry) och samma nivåer (village/villageEvening.ts LEVELS:
// avstånd, synfält och figureScale), och skrivs till reports/order302b/signs.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONCEPT } from '../balance';
import { GUEST_GROUPS, type GuestGroupId } from '../../strategic/scene/guestGroups';
import { BILLIONAIRE_GOLD, GROUP_IDS } from '../../strategic/scene/guestLooks';
import { RIVAL_GOURMET_SHARE, STREET_FIGURE, streetGroupOf, streetLookOf, streetSignGeometry } from '../../strategic/scene/village/streetLooks';
import { LEVELS } from '../../strategic/village/villageEvening';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../..');
const OUT = resolve(HERE, '../../../reports/order302b');

const keys = (n: number) => Array.from({ length: n }, (_, i) => `torgkrogen:high:${i}`);
const share = (gs: GuestGroupId[], g: GuestGroupId) => gs.filter((x) => x === g).length / gs.length;

describe('ORDER 302b — gatans sorter i D5:s grupper', () => {
  it('studenter, turister, bybor och de betalningsstarka', () => {
    expect(streetGroupOf('student', 'k', 1, false, null)).toBe('student');
    expect(streetGroupOf('tourist', 'bus:0', 1, false, null)).toBe('tourist');
    expect(streetGroupOf('middle', 'k', 1, false, null)).toBe('villager');
    expect(streetGroupOf('social', 'social', 1, true, 'bistro')).toBe('villager');
    expect(streetGroupOf('billionaire', 'billionaire', 1, true, 'bistro')).toBe('business');
    // Rusningens typer som i guestLooks.ts.
    expect(streetGroupOf('gourmet', 'w:0', 1, true, 'bistro')).toBe('gourmet');
    expect(streetGroupOf('business', 'w:1', 1, true, 'bistro')).toBe('business');
    expect(['gourmet', 'business']).toContain(streetGroupOf('high', 'k', 1, false, null));
  });

  it('de betalningsstarka delas deterministiskt, med konceptets andel till vår krog', () => {
    const a = keys(2000).map((k) => streetGroupOf('high', k, 7, false, null));
    const b = keys(2000).map((k) => streetGroupOf('high', k, 7, false, null));
    expect(a).toEqual(b);
    expect(Math.abs(share(a, 'gourmet') - RIVAL_GOURMET_SHARE)).toBeLessThan(0.05);
    const soigne = keys(2000).map((k) => streetGroupOf('high', k, 7, true, 'soigne'));
    expect(Math.abs(share(soigne, 'gourmet') - CONCEPT.gourmetOfHigh.soigne)).toBeLessThan(0.05);
    // Medelgruppen till vår krog: turister med konceptets andel (ORDER 307b: bistro 0,3).
    const mid = keys(2000).map((k) => streetGroupOf('middle', k, 7, true, 'soigne'));
    expect(Math.abs(share(mid, 'tourist') - CONCEPT.touristOfMiddle.soigne)).toBeLessThan(0.05);
    const midBistro = keys(2000).map((k) => streetGroupOf('middle', k, 7, true, 'bistro'));
    expect(Math.abs(share(midBistro, 'tourist') - CONCEPT.touristOfMiddle.bistro)).toBeLessThan(0.05);
  });

  it('kroppen och lemmarna ur D5:s utseende, två varianter; miljardären i guld', () => {
    for (const g of GROUP_IDS) {
      for (const v of [0, 1]) {
        const l = streetLookOf('middle', g, v);
        expect(l.body).toBe(GUEST_GROUPS[g].looks[v].body);
        expect(l.limb).toBe(GUEST_GROUPS[g].looks[v].limb);
        expect(l.accent).toBe(GUEST_GROUPS[g].looks[v].accent);
      }
    }
    expect(streetLookOf('billionaire', 'business', 0).body).toBe(BILLIONAIRE_GOLD);
  });

  it('tecknen läses på gatans nivå: hatten och sjalen störst (D5 §6)', () => {
    // Bildpunkter per meter vid nivåns avstånd och synfält, gånger nivåns förstoring av figurerna.
    const pxPerM = (level: string, height: number) => {
      const L = LEVELS.find((l) => l.id === level)!;
      return (height / (2 * L.dist * Math.tan((L.fov * Math.PI) / 360))) * L.figureScale;
    };
    const rows = GROUP_IDS.map((g) => {
      const geo = streetSignGeometry(g);
      const b = geo.boundingBox!;
      // Uppifrån (bredden i x och z) och framifrån (höjden).
      const top = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      const tall = b.max.y - b.min.y;
      geo.dispose();
      const row: Record<string, number | string> = { group: g, sign: GUEST_GROUPS[g].sign, topM: +top.toFixed(3), tallM: +tall.toFixed(3) };
      for (const [level, h] of [['street', 900], ['street', 720], ['block', 900], ['block', 720]] as const) {
        row[`${level}${h}px`] = +(top * pxPerM(level, h)).toFixed(1);
      }
      return row;
    });
    const figurePx = { street900: +((STREET_FIGURE.headY + STREET_FIGURE.headR) * pxPerM('street', 900)).toFixed(1), block720: +((STREET_FIGURE.headY + STREET_FIGURE.headR) * pxPerM('block', 720)).toFixed(1) };
    mkdirSync(OUT, { recursive: true });
    writeFileSync(resolve(OUT, 'signs.json'), JSON.stringify({ source: 'streetLooks.ts streetSignGeometry; villageEvening.ts LEVELS (dist, fov, figureScale)', figurePx, rows }, null, 2) + '\n');
    const by = Object.fromEntries(rows.map((r) => [r.group, r])) as Record<GuestGroupId, Record<string, number>>;
    // Hatten och sjalen är störst uppifrån, kepsen och skjortan sedan.
    for (const first of ['tourist', 'gourmet'] as GuestGroupId[]) {
      for (const then of ['villager', 'business', 'student'] as GuestGroupId[]) expect(by[first].topM).toBeGreaterThan(by[then].topM);
    }
    // Minst 10 bildpunkter på gatans nivå i den minsta storleken.
    for (const r of rows) expect(r.street720px as number).toBeGreaterThanOrEqual(10);
  });

  it('VillageLife ritar grupperna: tecknen som egna instanser, gruppen ur streetGroupOf', () => {
    const src = readFileSync(resolve(SRC, 'strategic/scene/village/VillageLife.tsx'), 'utf8');
    expect(src).toMatch(/streetGroupOf\(/);
    expect(src).toMatch(/makeInstanced\(streetSignGeometry\(g\)\)/);
    expect(src).toMatch(/streetLookOf\(/);
    // Byns övriga folk (OsmPedestrians.tsx) i samma grupper och med samma tecken.
    const peds = readFileSync(resolve(SRC, 'strategic/scene/OsmPedestrians.tsx'), 'utf8');
    expect(peds).toMatch(/streetSignGeometry\(g, OSM_FRAME\)/);
    expect(peds).toMatch(/resident: 'villager'/);
    expect(peds).not.toMatch(/#c9482f', '#e08c66'/);
  });
});
