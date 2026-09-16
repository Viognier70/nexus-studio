// ORDER 221 §5 DoD 3 + 4 — noll genomträngningar + reachability.
//
// Testerna kör mot samma `getObstacles()` som scenerna använder — den
// enda källan för hindren. Blir denna testrad grön är rummet gåbart
// för det som sim faktiskt spawnar (seats + stationer nås, ingen sittande
// eller stående punkt hamnar inuti ett hinder efter path-plocka).

import { describe, expect, it } from 'vitest';
import {
  buildNav,
  computePath,
  isInsideObstacle,
  isReachable,
  type XZ,
  type ObstacleAABB
} from '../roomNav';
import * as Brewpub from '../brewpubRoom';
import * as Restaurant from '../restaurantRoom';

// -------- brewpub (primär klass per DoD 3) ------------------------------

const BREW_HALF_W = 15.6 / 2;
const BREW_HALF_D = 11.8 / 2;

function brewpubNav() {
  const obstacles = Brewpub.getObstacles();
  const room = Brewpub.createBrewpubRoom({});
  const exemptPoints: XZ[] = room.seats.map((s) => s.local as XZ);
  const exemptCircles = room.staffStations.map((s) => ({
    local: s.local as XZ, radius: 1.75
  }));
  room.dispose();
  return {
    nav: buildNav(BREW_HALF_W, BREW_HALF_D, obstacles, { exemptPoints, exemptCircles }),
    obstacles,
    seats: exemptPoints
  };
}

describe('ORDER 221 §3 — ölkrogen: seats + stationer nås från entrén', () => {
  const { nav } = brewpubNav();
  const entrance: XZ = [BREW_HALF_W - 0.6, 0];  // brewpub entrance (lokal)
  const room = Brewpub.createBrewpubRoom({});

  for (const seat of room.seats) {
    it(`nås ${seat.id} från entrén`, () => {
      expect(isReachable(nav, entrance, seat.local as XZ)).toBe(true);
    });
  }
  for (const station of room.staffStations) {
    it(`nås station ${station.id} från entrén`, () => {
      expect(isReachable(nav, entrance, station.local as XZ)).toBe(true);
    });
  }
  room.dispose();
});

describe('ORDER 221 §3 — ölkrogen: path från entrén till varje seat ger fri väg', () => {
  const { nav } = brewpubNav();
  const entrance: XZ = [BREW_HALF_W - 0.6, 0];
  const room = Brewpub.createBrewpubRoom({});

  for (const seat of room.seats) {
    it(`path till ${seat.id} innehåller inga punkter inuti hinder`, () => {
      const path = computePath(nav, entrance, seat.local as XZ);
      expect(path).not.toBeNull();
      // Undantag: sista waypoint = seat-punkten själv, som är exempt
      // (ligger vid möbelkanten). Testet gäller ALLA punkter EXKLUSIVE
      // sista — de får inte ligga inuti något hinder.
      const inner = path!.slice(0, -1);
      for (const p of inner) {
        const hit = isInsideObstacle(nav, p);
        expect(hit, `punkt ${p} inuti ${hit?.id}`).toBeNull();
      }
    });
  }
  room.dispose();
});

// -------- restaurant --------------------------------------------------

const REST_HALF_W = 15.6 / 2;
const REST_HALF_D = 11.8 / 2;

describe('ORDER 221 §3 — kvarterskrogen: seats + stationer nås från entrén', () => {
  const obstacles = Restaurant.getObstacles();
  const room = Restaurant.createRestaurantRoom({});
  const exemptPoints: XZ[] = room.seats.map((s) => s.local as XZ);
  const exemptCircles = room.staffStations.map((s) => ({
    local: s.local as XZ, radius: 1.75
  }));
  const nav = buildNav(REST_HALF_W, REST_HALF_D, obstacles, { exemptPoints, exemptCircles });
  const entrance: XZ = [REST_HALF_W - 0.6, 0];

  for (const seat of room.seats) {
    it(`nås ${seat.id} från entrén`, () => {
      expect(isReachable(nav, entrance, seat.local as XZ)).toBe(true);
    });
  }
  for (const station of room.staffStations) {
    it(`nås station ${station.id} från entrén`, () => {
      expect(isReachable(nav, entrance, station.local as XZ)).toBe(true);
    });
  }
  room.dispose();
});

describe('ORDER 221 §5 DoD 3 — ölkrogen: noll genomträngningar mellan alla figur-mål', () => {
  const { nav } = brewpubNav();
  const room = Brewpub.createBrewpubRoom({});
  const entrance: XZ = [15.6 / 2 - 0.6, 0];
  const nodes: { id: string; xz: XZ }[] = [
    { id: 'entrance', xz: entrance },
    ...room.seats.map((s) => ({ id: 'seat:' + s.id, xz: s.local as XZ })),
    ...room.staffStations.map((s) => ({ id: 'station:' + s.id, xz: s.local as XZ }))
  ];
  // Alla figur-flöden är par av (från, till) mellan dessa noder — en
  // servitör går station↔seat, en gäst går entrance↔seat. Testet
  // sveper alla par och kontrollerar att INGEN mellan-waypoint ligger
  // inuti ett hinder. Sista waypoint är alltid själva node-XZ (som
  // per §2.2 är exempt). Före-sista räknas: hade Nav lagt en waypoint
  // inuti bardisken hade vi hittat den här.
  for (const from of nodes) {
    for (const to of nodes) {
      if (from.id === to.id) continue;
      it(`path ${from.id} → ${to.id} har inga inre punkter i hinder`, () => {
        const path = computePath(nav, from.xz, to.xz);
        expect(path, `${from.id} → ${to.id} oåtkomligt`).not.toBeNull();
        // Exkludera första + sista: de är själva node-punkterna (exempt).
        for (let i = 1; i < path!.length - 1; i++) {
          const hit = isInsideObstacle(nav, path![i]);
          expect(hit, `waypoint ${path![i]} inuti ${hit?.id} på path ${from.id} → ${to.id}`)
            .toBeNull();
        }
      });
    }
  }
  room.dispose();
});

// -------- nav-modul unit-tests ---------------------------------------

describe('ORDER 221 §2 — buildNav + computePath', () => {
  it('rak linje mellan två fria punkter ger [from, to]', () => {
    const nav = buildNav(5, 5, [], {});
    const p = computePath(nav, [-2, -2], [2, 2]);
    expect(p).toEqual([[-2, -2], [2, 2]]);
  });

  it('går runt ett centralt hinder i st f rakt igenom', () => {
    // Ett 2×2 hinder i mitten. Rak linje från (-3,0) till (3,0) skär det.
    const obs: ObstacleAABB[] = [{ id: 'x', local: [0, 0], halfW: 1, halfD: 1 }];
    const nav = buildNav(4, 4, obs, {});
    const p = computePath(nav, [-3, 0], [3, 0]);
    expect(p).not.toBeNull();
    // Ingen mellan-waypoint får ligga innanför hindret (inflaterat).
    for (const pt of p!) {
      const hit = isInsideObstacle(nav, pt);
      expect(hit).toBeNull();
    }
    // Vi ska ha minst en mellan-waypoint eftersom rak linje INTE fungerar.
    expect(p!.length).toBeGreaterThan(2);
  });

  it('exempt-punkt (seat på möbelkant) förblir nåbar', () => {
    // Hinder från x=[-1,1], seat-punkten på x=1.2 (0.2 m utanför kanten +
    // obstacle-inflate 0.25 → ligger blockerad utan exempt).
    const obs: ObstacleAABB[] = [{ id: 't', local: [0, 0], halfW: 1, halfD: 1 }];
    const seat: XZ = [1.2, 0];
    const nav = buildNav(4, 4, obs, { exemptPoints: [seat] });
    expect(isReachable(nav, [-2, 0], seat)).toBe(true);
  });

  it('genomträngningstestet svarar ja för punkt inuti hinder', () => {
    const obs: ObstacleAABB[] = [{ id: 'z', local: [0, 0], halfW: 1, halfD: 1 }];
    const nav = buildNav(4, 4, obs, {});
    expect(isInsideObstacle(nav, [0, 0])?.id).toBe('z');
    expect(isInsideObstacle(nav, [1.5, 0])).toBeNull();
  });

  it('oåtkomligt mål ger null path + isReachable=false', () => {
    // Ett hinder som stänger av rummet i två öar.
    const obs: ObstacleAABB[] = [
      { id: 'wall', local: [0, 0], halfW: 5, halfD: 0.1 }
    ];
    const nav = buildNav(5, 5, obs, {});
    // Från södra halvan till norra halvan — inflaterat är väggen 0.6 m
    // tjock och sträcker sig hela bredden, så inga passage-celler.
    const p = computePath(nav, [0, -3], [0, 3]);
    expect(p).toBeNull();
    expect(isReachable(nav, [0, -3], [0, 3])).toBe(false);
  });
});
