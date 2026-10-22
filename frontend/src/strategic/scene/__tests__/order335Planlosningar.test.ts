// ORDER 335 D — rummen skiljer sig i planlösning (Anders 2026-10-22): baren på D15:s plats i varje lokal och D15:s antal
// platser (källaren 44, salongen 35, Flygeln 36). Rummet byggs som i spelet (BrewpubScene: createRoom med lokalens
// layout och höjd, sedan lokalens interiör). Med WRITE_REPORTS=1 skrivs reports/order335/planlosningar.json.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { setCurrentPremises } from '../../content/playerPremises';
import { createRoom, roomSizeFor } from '../businessRoom';
import { getObstacles, walkPathToSeat, type WineBarRoom } from '../wineBarRoom';
import { applyPremisesInterior, premisesToRoomLocal, PREMISES_LOOK, type VenueId } from '../premisesInterior';
import { CELLAR_PLAN, layoutForPremises, WING_PLAN } from '../tablePlans';
import { groupsFor, setFlowLayout, staffRoute } from '../serviceFlow';
import { premisesSeats } from '../../simulation/service';
import type { SimulationState } from '../../types';

type V2 = [number, number];
const VENUES: VenueId[] = ['kallaren', 'salongen', 'glashornet'];
const D15_SEATS: Record<VenueId, number> = { kallaren: 44, salongen: 35, glashornet: 36 };

function build(id: VenueId) {
  setCurrentPremises(id);
  const L = computePlayerBusinessInterior()!;
  const room = createRoom('vinbaren', { ...roomSizeFor('vinbaren', L.width, L.depth), layout: layoutForPremises(id), interiorHeight: PREMISES_LOOK[id].heightM });
  const raw = room.raw as WineBarRoom;
  applyPremisesInterior(raw, id, premisesToRoomLocal(id, L.centre, L.worldAngle));
  return raw;
}

// Möblerna en väg inte får gå genom (rummets hinder, utom golvzonerna och stolarna), med 0,15 m marginal för kroppen.
function blocked(raw: WineBarRoom, p: V2, except: (id: string) => boolean = () => false): string | null {
  for (const o of getObstacles(raw)) {
    if (except(o.id) || /^seat_|^chair|Stem|Back|Foot/.test(o.id)) continue;
    if (Math.abs(p[0] - o.local[0]) < o.halfW + 0.15 && Math.abs(p[1] - o.local[1]) < o.halfD + 0.15) return o.id;
  }
  return null;
}
function crossings(raw: WineBarRoom, path: V2[], skipLast = 0.6): string[] {
  const hits: string[] = [];
  let total = 0;
  const lens = path.slice(1).map((q, i) => Math.hypot(q[0] - path[i][0], q[1] - path[i][1]));
  const L = lens.reduce((a, b) => a + b, 0);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], n = Math.max(1, Math.ceil(lens[i - 1] / 0.1));
    for (let k = 0; k <= n; k++) {
      const d = total + (lens[i - 1] * k) / n;
      if (d < 0.5 || d > L - skipLast) continue;
      const p: V2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      const h = blocked(raw, p);
      if (h) hits.push(`${h}@${p[0].toFixed(1)},${p[1].toFixed(1)}`);
    }
    total += lens[i - 1];
  }
  return [...new Set(hits)];
}

const simState = (p: VenueId) => ({ businessClass: 'vinbaren', ladder: { step: 'vinbar' }, economy: { businessClass: 'vinbar', premises: p } }) as unknown as SimulationState;

afterEach(() => { setCurrentPremises('torget'); setFlowLayout('winebar'); });

describe('ORDER 335 D — planlösningarna', () => {
  it('D15:s antal platser i rummet och i simuleringen; grupperna täcker varje plats en gång', () => {
    const out: Record<string, unknown> = {};
    for (const id of VENUES) {
      const raw = build(id);
      const sim = premisesSeats('vinbaren', simState(id))!;
      expect([id, raw.seats.length, raw.capacity, sim.capacity]).toEqual([id, D15_SEATS[id], D15_SEATS[id], D15_SEATS[id]]);
      expect([id, sim.groups.flat().sort((a, b) => a - b)]).toEqual([id, Array.from({ length: D15_SEATS[id] }, (_, i) => i)]);
      expect([id, [...sim.preference].sort((a, b) => a - b)]).toEqual([id, Array.from({ length: D15_SEATS[id] }, (_, i) => i)]);
      const kinds = raw.seats.reduce((m, s) => ({ ...m, [s.kind]: (m[s.kind] ?? 0) + 1 }), {} as Record<string, number>);
      const bar = getObstacles(raw).find((o) => /^barCounter/.test(o.id))!;
      out[id] = { seats: raw.seats.length, kinds, bar: { id: bar.id, at: bar.local.map((v) => +v.toFixed(2)), halfW: +bar.halfW.toFixed(2), halfD: +bar.halfD.toFixed(2) }, groups: sim.groups.length };
    }
    if (process.env.WRITE_REPORTS === '1') {
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order335');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'planlosningar.json'), JSON.stringify({ definition: 'ORDER 335 D. seats = rummets platser (wineBarRoom.ts createWineBarRoom med lokalens layout), kinds = platsernas sort (twotop = stol, bar = pall, lounge = soffa), bar = disken (getObstacles, rummets lokala ram: +x mot dörren, −z söder), groups = simuleringens grupper (service.ts premisesSeats).', ...out }, null, 2) + '\n');
    }
  });

  it('baren på D15:s plats: källaren längs östra väggen, Flygeln mot norra väggen bort från glaset, salongen i östra änden som nu', () => {
    const k = build('kallaren');
    const kb = getObstacles(k).find((o) => o.id === 'barCounterPlan')!;
    expect(k.width / 2 - 0.2 - (kb.local[0] + kb.halfW)).toBeLessThan(1.3);
    expect(kb.halfD).toBeGreaterThan(kb.halfW);
    const f = build('glashornet');
    const fb = getObstacles(f).find((o) => o.id === 'barCounterPlan')!;
    // Glaset är rummets södra (−z) och östra vägg; baren står i norr, mer än 7 m från södra glaset och 4 m från östra.
    expect(fb.local[1] - fb.halfD - (-f.depth / 2)).toBeGreaterThan(7);
    expect(f.width / 2 - (fb.local[0] + fb.halfW)).toBeGreaterThan(4);
    const s = build('salongen');
    expect(getObstacles(s).some((o) => o.id === 'barCounterN')).toBe(true);
    // Långborden i källaren, pallarna längs glaset i Flygeln.
    expect(CELLAR_PLAN.tables.filter((t) => t.w >= 3.5).length).toBe(4);
    expect(WING_PLAN.seats.filter((x) => x.kind === 'stool').every((x) => x.local[1] < -3.9)).toBe(true);
  });

  it('platserna står fria från möblerna, och gästernas väg från dörren går inte genom någon möbel', () => {
    for (const id of VENUES) {
      const raw = build(id);
      for (const seat of raw.seats) {
        // Platsens mitt utanför disken, borden och väggarna (den egna stolen räknas inte).
        expect([id, seat.id, blocked(raw, seat.local as V2, (o) => /Top$|Base$|Leg$|Cloth$/.test(o) && false)]).toEqual([id, seat.id, null]);
        expect([id, seat.id, crossings(raw, walkPathToSeat(raw, seat.id) as V2[])]).toEqual([id, seat.id, []]);
      }
    }
  });

  it('personalen når varje sällskap från bartenderns plats utan att gå genom möbler', () => {
    for (const id of VENUES) {
      const raw = build(id);
      setFlowLayout(raw.layout);
      const from = raw.staffStations.find((s) => s.id === 'bartender')!.local as V2;
      const server = raw.staffStations.find((s) => s.id === 'server')!.local as V2;
      for (const g of groupsFor(raw)) {
        expect([id, g.id, crossings(raw, staffRoute(server, g.serveAt) as V2[], 0.3)]).toEqual([id, g.id, []]);
        expect([id, g.id, crossings(raw, staffRoute(from, g.serveAt) as V2[], 0.3)]).toEqual([id, g.id, []]);
      }
    }
  });
});
