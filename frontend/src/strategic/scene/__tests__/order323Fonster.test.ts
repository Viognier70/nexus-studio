// ORDER 323 §4 (Anders 2026-10-09): "Byggnaderna: fönstren ska sitta i
// fasaden, inte sväva framför väggen eller ligga på marken."
//
// Mätningen läser fönstren ur samma funktioner som renderingen
// (OsmBuildings osmWindowsOf, VillageWindows buildWindows) och väggarna ur
// husen som OsmBuildings ritar (drawnOsmBuildings, osmBuildingVolume: samma
// polygon och höjd som ExtrudeGeometry). För varje fönster:
//   - huset: finns ett ritat hus med fönstrets id;
//   - väggen: avståndet från fönstrets mitt till närmaste ritade vägg
//     (polygonens kanter), och om mitten ligger innanför eller utanför;
//   - höjden: fönstret ska rymmas mellan sockeln och takfoten.
// Ett fönster sitter i fasaden om mitten ligger högst ON_WALL_M från en vägg
// och fönstret ryms i väggens höjd. Annars: 'svävar' (utanför huset, mer än
// ON_WALL_M från väggen), 'inne' (inne i huset, syns inte), 'utan hus',
// 'över takfoten' eller 'vid marken' (underkanten under SILL_MIN_M).
// Med ORDER323_FONSTER=<tag> skrivs utfallet till
// reports/order323/fonster/<tag>/matning.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { drawnOsmBuildings, osmBuildingVolume, osmWindowsOf, type OsmBuildingVolume } from '../OsmBuildings';
import { buildWindows } from '../village/VillageWindows';
import { inside } from '../../procgen/geom';

type Vec2 = readonly [number, number];
const ON_WALL_M = 0.12;
const SILL_MIN_M = 0.25;
// Kvällens ruta räknas som samma fönster som dagens om mitten ligger högst så här långt ifrån.
const BESIDE_M = 0.1;

const volumes = new Map<string, OsmBuildingVolume>();
for (const b of drawnOsmBuildings()) {
  const v = osmBuildingVolume(b);
  if (v) volumes.set(b.id, v);
}

function wallDistance(poly: readonly Vec2[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[i + 1];
    const dx = bx - ax, dz = bz - az;
    const L2 = dx * dx + dz * dz;
    const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return best;
}

type Verdict = 'fasaden' | 'svävar' | 'inne' | 'utan hus' | 'över takfoten' | 'vid marken';
function judge(id: string, x: number, y: number, z: number, h: number): { v: Verdict; d: number } {
  const vol = volumes.get(id);
  if (!vol) return { v: 'utan hus', d: Infinity };
  const poly = vol.building.poly as unknown as Vec2[];
  const d = wallDistance(poly, x, z);
  if (d > ON_WALL_M) return { v: inside(poly as never, x, z) ? 'inne' : 'svävar', d };
  if (y + h / 2 > vol.height + 0.01) return { v: 'över takfoten', d };
  if (y - h / 2 < SILL_MIN_M) return { v: 'vid marken', d };
  return { v: 'fasaden', d };
}

function measure() {
  const osm = osmWindowsOf([...volumes.values()]).map((w) => ({ sys: 'OsmBuildings', id: w.id, x: w.pos[0], y: w.pos[1], z: w.pos[2], ...judge(w.id, w.pos[0], w.pos[1], w.pos[2], w.h) }));
  const evening = buildWindows().map((w) => ({ sys: 'VillageWindows', id: w.bid, x: w.x, y: w.y, z: w.z, ...judge(w.bid, w.x, w.y, w.z, w.h) }));
  const all = [...osm, ...evening];
  // Kvällens ruta på ett hus som har dagens fönster: ligger den på ett av dem (inom BESIDE_M)?
  const byHouse = new Map<string, typeof osm>();
  for (const w of osm) byHouse.set(w.id, [...(byHouse.get(w.id) ?? []), w]);
  const beside = evening.filter((e) => {
    const day = byHouse.get(e.id);
    if (!day) return false;
    return Math.min(...day.map((d) => Math.hypot(d.x - e.x, d.y - e.y, d.z - e.z))) > BESIDE_M;
  });
  const count = (list: typeof all): Record<Verdict, number> => Object.fromEntries((['fasaden', 'svävar', 'inne', 'utan hus', 'över takfoten', 'vid marken'] as Verdict[]).map((v) => [v, list.filter((w) => w.v === v).length])) as Record<Verdict, number>;
  const housesWith = (list: typeof all, v: Verdict) => [...new Set(list.filter((w) => w.v === v).map((w) => w.id))];
  return {
    onWallM: ON_WALL_M,
    sillMinM: SILL_MIN_M,
    houses: volumes.size,
    OsmBuildings: { windows: osm.length, ...count(osm), housesFloating: housesWith(osm, 'svävar').length },
    VillageWindows: { windows: evening.length, ...count(evening), housesFloating: housesWith(evening, 'svävar').length, housesWithout: housesWith(evening, 'utan hus').length, besideDayWindow: beside.length, housesWithBoth: new Set(evening.filter((e) => byHouse.has(e.id)).map((e) => e.id)).size },
    examples: all.filter((w) => w.v !== 'fasaden' && w.v !== 'inne').slice(0, 40).map((w) => ({ ...w, x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2), d: Number.isFinite(w.d) ? +w.d.toFixed(2) : null })),
    all
  };
}

describe('ORDER 323 §4 — fönstren sitter i fasaden', () => {
  const m = measure();
  if (process.env.ORDER323_FONSTER) {
    const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order323/fonster', process.env.ORDER323_FONSTER);
    mkdirSync(out, { recursive: true });
    const { all: _all, ...rest } = m;
    writeFileSync(resolve(out, 'matning.json'), JSON.stringify(rest, null, 2) + '\n');
  }

  it('inget fönster svävar, står utan hus, går över takfoten eller ligger vid marken', () => {
    const bad = m.all.filter((w) => w.v !== 'fasaden' && w.v !== 'inne');
    expect(bad.slice(0, 10).map((w) => `${w.sys} ${w.id} (${w.x.toFixed(1)}, ${w.y.toFixed(1)}, ${w.z.toFixed(1)}): ${w.v}`)).toEqual([]);
  });

  it('inget fönster ligger dolt inne i ett hus', () => {
    expect(m.OsmBuildings.inne + m.VillageWindows.inne).toBe(0);
  });

  it('kvällens rutor ligger på husets fönster, inte bredvid dem', () => {
    expect(m.VillageWindows.besideDayWindow).toBe(0);
  });

  it('husen har fönster', () => {
    expect(m.OsmBuildings.fasaden).toBeGreaterThan(1000);
    expect(m.VillageWindows.fasaden).toBeGreaterThan(500);
  });
});
