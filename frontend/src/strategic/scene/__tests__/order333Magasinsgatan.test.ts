// ORDER 333 B — Magasinsgatan, vagnens sjätte plats (avsnitt 8 punkt 2). Platsen ska klara samma prov som D15:s fem
// (Designs D15 §1, villagePlaces.ts TRUCK_SPOT_BOX): lådan runt vagnen utan hus, vatten och körbana, Grillstugan, däcket
// och föremålen utan väg och trottoar (onRoadAudit.ts, toleransen 0,1 m). Därtill står skylten vid trottoaren, så att
// kön går rakt ut på den.
// Med WRITE_REPORTS=1 söks gatan igen och reports/order333/magasinsgatan.json skrivs: alla lägen som klarar provet,
// och det valda. Rapporten läser talen ur den filen.
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD, type Vec2Tuple } from '../../content/world';
import { TRUCK_SPOTS } from '../../content/truckSpots';
import { TRUCK_SPOT_BOX, playerTruckFootprints, playerTruckPropFootprints } from '../../content/villagePlaces';
import { roadOverlapsForPolygon, polygonsOverlap, onCarCarriageway, onWalkSurface } from '../../content/roadSurface';
import { inAnyWater } from '../../procgen/geom';
import { TRUCK_LAYOUT } from '../playerTruck';
import { spotToWorld } from '../../../sim/districts';
import { districtAt } from '../../content/districts';

const SPOT = 'magasinsgatan' as const;
const houses = WORLD.buildings.map((b) => b.poly);

function check() {
  const B = TRUCK_SPOT_BOX;
  const box = ([[B.x0, B.z0], [B.x1, B.z0], [B.x1, B.z1], [B.x0, B.z1]] as const).map((q) => spotToWorld(SPOT, q) as Vec2Tuple);
  const feet = playerTruckFootprints(SPOT);
  const parts = [feet.body, feet.deck, ...playerTruckPropFootprints(SPOT).map((x) => x.poly)];
  const Q = TRUCK_LAYOUT.queue;
  const queue = [Q.order, Q.collect, ...Q.line, TRUCK_LAYOUT.aBoard].map((q) => spotToWorld(SPOT, q));
  // Från skylten rakt ut från luckan: metrarna till gångytan (trottoaren).
  let signToWalkM: number | null = null;
  for (let g = 0; g <= 4.001; g += 0.1) {
    const w = spotToWorld(SPOT, [TRUCK_LAYOUT.aBoard[0], TRUCK_LAYOUT.aBoard[1] + g]);
    if (onWalkSurface(w[0], w[1])) { signToWalkM = Math.round(g * 10) / 10; break; }
  }
  return {
    boxInWater: box.some((q) => inAnyWater(q[0], q[1])),
    boxInHouse: houses.some((h) => polygonsOverlap(box, h)),
    boxOnCarriageway: roadOverlapsForPolygon(box, { surfaces: ['carriageway'] }).some((o) => o.depthM > 0.1),
    partsOnRoad: parts.some((poly) => roadOverlapsForPolygon(poly).some((o) => o.depthM > 0.1)),
    queueOnCarriageway: queue.filter((q) => onCarCarriageway(q[0], q[1])).length,
    signToWalkM,
    toTorgetM: Math.round(Math.hypot(TRUCK_SPOTS[SPOT].C[0] - TRUCK_SPOTS.torget.C[0], TRUCK_SPOTS[SPOT].C[1] - TRUCK_SPOTS.torget.C[1]))
  };
}

describe('ORDER 333 B — Magasinsgatan', () => {
  it('står vid Magasinsgatan, utanför kvarteren, med Torgets gäster', () => {
    const f = TRUCK_SPOTS[SPOT];
    const road = WORLD.roads.find((r) => r.id === f.street);
    expect(road?.name).toBe('Magasinsgatan');
    expect(f.district).toBe('torget');
    expect(districtAt(f.C[0], f.C[1])).toBeNull();
  });

  it('klarar D15:s prov, och skylten står vid trottoaren', () => {
    const c = check();
    expect(c).toMatchObject({ boxInWater: false, boxInHouse: false, boxOnCarriageway: false, partsOnRoad: false, queueOnCarriageway: 0 });
    expect(c.signToWalkM).not.toBeNull();
    expect(c.signToWalkM!).toBeLessThanOrEqual(1);
  });

  it.skipIf(!process.env.WRITE_REPORTS)('söker gatan och skriver reports/order333/magasinsgatan.json', () => {
    const f = TRUCK_SPOTS[SPOT] as unknown as { C: [number, number]; th: number };
    const chosen = { C: [...f.C] as [number, number], th: f.th };
    const candidates: unknown[] = [];
    try {
      for (const r of WORLD.roads.filter((r) => r.name === 'Magasinsgatan')) {
        const P = r.poly;
        for (let i = 0; i + 1 < P.length; i++) {
          const [a, b] = [P[i], P[i + 1]];
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const th0 = Math.atan2(b[1] - a[1], b[0] - a[0]);
          for (let t = 4; t < L - 4; t += 2) {
            const p = [a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L];
            for (const th of [th0, th0 + Math.PI]) {
              // Luckan (+z) mot gatan: mitten d m bakom gatans mittlinje.
              for (let d = 6; d <= 12; d += 0.25) {
                f.C = [p[0] + Math.sin(th) * d, p[1] - Math.cos(th) * d];
                f.th = th;
                const c = check();
                if (c.boxInWater || c.boxInHouse || c.boxOnCarriageway || c.partsOnRoad || c.queueOnCarriageway > 0 || c.signToWalkM === null) continue;
                candidates.push({ road: r.id, C: f.C.map((v) => Math.round(v * 100) / 100), th: Math.round(th * 10000) / 10000, signToWalkM: c.signToWalkM, toTorgetM: c.toTorgetM });
              }
            }
          }
        }
      }
    } finally {
      f.C = chosen.C;
      f.th = chosen.th;
    }
    const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order333');
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, 'magasinsgatan.json'), JSON.stringify({
      definition: 'ORDER 333 B. Lägen längs Magasinsgatans gatubitar (var 2 m, båda riktningarna, luckan mot gatan, 6–12 m från mittlinjen) som klarar D15:s prov: TRUCK_SPOT_BOX utan hus, vatten och körbana; Grillstugan, däcket och föremålen utan väg och trottoar (> 0,1 m); ingen köplats på körbanan. signToWalkM = metrarna från skylten rakt ut till gångytan. Valet: minsta signToWalkM, sedan närmast Torget.',
      chosen: { ...chosen, ...check() },
      count: candidates.length,
      candidates
    }, null, 1) + '\n');
    expect(candidates.length).toBeGreaterThan(0);
  }, 600000);
});
