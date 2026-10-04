// ORDER 297 — byn i kvällsljus: kvällens gång, nivåerna, entrén, lyktorna,
// krogarnas lägen och kön vid vår dörr (Designs leverans Byn i kvällsljus).

import { describe, expect, it } from 'vitest';
import { makeNewGameState, makeGuest } from '../../strategic/simulation/model';
import { eveningProgress } from '../clock';
import { CLOCK, SITTING, VILLAGE, VILLAGE_EVENING, VILLAGE_QUEUE, QUEUE, QUEUE_MOOD } from '../balance';
import { computePlayerBusinessInterior } from '../../strategic/business/interiorLayout';
import { WORLD } from '../../strategic/content/world';
import { fovForDistance, levelById, levelTarget, nearestLevel } from '../../strategic/camera/eveningLevels';
import { lampPositions } from '../../strategic/scene/village/StreetLamps';
import { venueLightTargets } from '../../strategic/scene/village/venueLight';
import { nearestOpenRival, queueFull } from '../../strategic/scene/village/VillageLife';
import { venuesTonight, PLAYER_VENUE } from '../village';
import type { SimulationState } from '../../strategic/types';

const at = (s: SimulationState, minute: number, period: SimulationState['day']['period'] = 'dinner'): SimulationState => {
  // clockMinutes = serviceStartHour·60 + (simTime − periodStartAt) · spelminuter per simsekund.
  const since = (minute - SITTING.serviceStartHour * 60) * 2;
  return { ...s, simTime: since, day: { ...s.day, period, periodStartAt: 0 } };
};

describe('ORDER 297 — kvällens gång och nivåerna', () => {
  it('e går från servicens början till att de sista har gått, natt efter servicen', () => {
    const s = makeNewGameState(1);
    expect(eveningProgress(at(s, VILLAGE_EVENING.fromMinute))).toBe(0);
    expect(eveningProgress(at(s, VILLAGE_EVENING.toMinute))).toBe(1);
    expect(eveningProgress({ ...s, day: { ...s.day, period: 'evening' } })).toBe(1);
    expect(eveningProgress({ ...s, day: { ...s.day, period: 'morning' } })).toBeNull();
  });

  it('nivåerna står på Designs avstånd, och synfältet går från 34° till 42°', () => {
    expect(levelTarget(levelById('village')).distance).toBe(660);
    expect(levelTarget(levelById('venue')).distance).toBe(24);
    expect(fovForDistance(660)).toBe(34);
    expect(fovForDistance(24)).toBe(42);
    expect(fovForDistance(30)).toBeGreaterThan(34);
    expect(nearestLevel(45)).toBe('street');
    expect(nearestLevel(400)).toBe('village');
  });
});

describe('ORDER 297 — entrén vetter mot torget', () => {
  it('rummets entré ligger på torgets sida av huset', () => {
    const room = computePlayerBusinessInterior()!;
    const torget = WORLD.landmarks.find((l) => l.id === 'gry-torget')!.position;
    const toTorget = Math.hypot(room.centre[0] - torget[0], room.centre[1] - torget[1]);
    expect(Math.hypot(room.entrance[0] - torget[0], room.entrance[1] - torget[1])).toBeLessThan(toTorget);
  });
});

describe('ORDER 297 — gatlyktorna', () => {
  it('står längs gatorna, ingen i vårt rum eller på dess trottoar', () => {
    const pos = lampPositions();
    const room = computePlayerBusinessInterior()!;
    expect(pos.length).toBeGreaterThan(100);
    const c = Math.cos(room.worldAngle);
    const sn = Math.sin(room.worldAngle);
    for (const [x, z] of pos) {
      const dx = x - room.centre[0];
      const dz = z - room.centre[1];
      const inside = Math.abs(c * dx + sn * dz) < 12.4 && Math.abs(-sn * dx + c * dz) < 7.3;
      expect(inside).toBe(false);
    }
  });
});

describe('ORDER 297 — krogarnas fyra lägen', () => {
  it('köket före öppning, allt när den har öppet, köket under städningen, sedan släckt', () => {
    const s = makeNewGameState(1);
    expect(venueLightTargets(at(s, VILLAGE.arriveFromMinute - 10), 'torgkrogen', true)).toEqual({ open: 0, busy: 1 });
    expect(venueLightTargets(at(s, VILLAGE.arriveFromMinute + 10), 'torgkrogen', true)).toEqual({ open: 1, busy: 1 });
    const close = SITTING.serviceEndHour * 60;
    expect(venueLightTargets(at(s, close + 1), 'torgkrogen', true)).toEqual({ open: 0, busy: 1 });
    expect(venueLightTargets(at(s, close + CLOCK.pickupAfterCloseMinutes + 1), 'torgkrogen', true)).toEqual({ open: 0, busy: 0 });
    expect(venueLightTargets(at(s, VILLAGE.arriveFromMinute + 10), 'torgkrogen', false)).toEqual({ open: 0, busy: 0 });
  });
});

describe('ORDER 297 — kön vid vår dörr i byn', () => {
  it('har servicens tal, och är full vid sju sällskap; då väljer sällskapet en annan krog', () => {
    expect(VILLAGE_QUEUE.patienceSimSeconds).toBe(QUEUE.patienceSimSeconds);
    expect(VILLAGE_QUEUE.impatientBelow).toBe(QUEUE_MOOD.impatientBelow);
    expect(VILLAGE_QUEUE.seats).toBe(20);
    const base = at(makeNewGameState(1), VILLAGE.arriveFromMinute + 30);
    const guests = Array.from({ length: VILLAGE_QUEUE.maxParties }, () => ({ ...makeGuest(0), state: 'waiting' as const }));
    expect(queueFull({ ...base, guests, waitingIds: guests.slice(0, -1).map((g) => g.id) })).toBe(false);
    expect(queueFull({ ...base, guests, waitingIds: guests.map((g) => g.id) })).toBe(true);
    const venues = venuesTonight(base);
    const other = nearestOpenRival(computePlayerBusinessInterior()!.entrance, venues);
    expect(other).not.toBeNull();
    expect(other).not.toBe(PLAYER_VENUE);
    expect(venues.find((v) => v.id === other)?.kind).toBe('restaurant');
  });
});
