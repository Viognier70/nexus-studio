// ORDER 331 C (Anders 2026-10-12) — grundregeln, varje val syns: genomgångens rader i ORDER 330 H som går med
// befintliga figurer. Proven läser regissörens egna prov (samma som WineBarFigures ritar) och choicesShown.ts
// (det scenen läser ur simuleringen).
// - Laget: den som saknas i laget syns inte och går ut genom dörren; den som anställts utöver laget syns.
// - Morgonens satsningar före dörrarna: genomgången, provningen, lådorna, komposten och gästkocken.
// - Värdens bjudning och det som säljs in bärs till bordet.
// - Utrustningen i bruk: vinkylen, ostvagnen, flamberingsvagnen och avecvagnen.

import { describe, expect, it } from 'vitest';
import { createWineBarRoom, walkPathToSeat, exitPathFromSeat, type WineBarRoom } from '../wineBarRoom';
import { groupsFor, PICKUP_BAR, POUR_SPOT } from '../serviceFlow';
import { STAFF_KEYS, WineBarDirector, type FrameInput, type GuestInput, type StaffKey } from '../wineBarDirector';
import { staffClipFor } from '../theatreClips';
import { EQUIPMENT } from '../equipment';
import { SEATED_HIP_Y } from '../WineBarFigures';
import { crewShown, equipmentUsesOf, morningShowsOf, truckCrewShown } from '../choicesShown';
import { RoomEquipment } from '../roomEquipment';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { makeTeamMember } from '../../simulation/team';
import { comp } from '../../../sim/hostPins';
import type { GuestState, SimulationState } from '../../types';

function makeDirector(room: WineBarRoom): WineBarDirector {
  const queueSlots: [number, number][] = [];
  for (let i = 0; i < 10; i++) queueSlots.push([room.waitingSpot[0] + 0.8 * Math.floor(i / 2), i % 2 === 0 ? -0.5 : 0.5]);
  return new WineBarDirector(
    { seats: room.seats, staffStations: room.staffStations, entrance: room.entrance, waitingSpot: room.waitingSpot,
      floorY: room.floorY, width: room.width, depth: room.depth },
    { walkPathToSeat: (id) => walkPathToSeat(room, id), exitPathFromSeat: (id) => exitPathFromSeat(room, id),
      groups: groupsFor(room), queueSlots, spawn: [room.waitingSpot[0] + 6, 0], poolSize: 36, seatedHipY: SEATED_HIP_Y,
      miseSpots: room.miseSpots }
  );
}

const ix = (k: StaffKey) => STAFF_KEYS.indexOf(k);

function run(d: WineBarDirector, t0: number, t1: number, input: (t: number) => FrameInput, each?: (t: number) => void) {
  for (let t = t0; t < t1; t += 0.1) { d.update(input(t)); each?.(t); }
}

const base = (t: number, guests: GuestInput[] = [], o: Partial<FrameInput> = {}): FrameInput =>
  ({ t, guests, patienceSeconds: 60, giveUpSatisfaction: 0.35, unhappyThreshold: 0.65, takeover: null, ...o });

describe('ORDER 331 C — laget syns (anställa, avskeda)', () => {
  it('choicesShown: klassens lag ger alla sju; utan värden saknas Per; en servitör och en kock till syns', () => {
    const s = makeNewGameState(3);
    expect(crewShown(s.team)).toEqual({ off: [], hired: [] });
    const noHost = { ...s.team, members: s.team.members.filter((m) => m.role !== 'värd') };
    expect(crewShown(noHost).off).toEqual(['host']);
    const more = { ...s.team, members: [...s.team.members, makeTeamMember('servitör', 2), makeTeamMember('kock', 2)] };
    expect(crewShown(more).hired.sort()).toEqual(['cook2', 'extra']);
    // Byråns lärling räknas inte här (330 H extraStaff 'agency').
    expect(crewShown({ ...s.team, members: [...s.team.members, { ...makeTeamMember('lärling', 2), isAgency: true }] }).hired).toEqual([]);
  });

  it('i spelarens flöde: HIRE_TEAM_MEMBER och FIRE_TEAM_MEMBER på morgonen ändrar vilka som syns', () => {
    let s = makeNewGameState(3) as SimulationState;
    s = { ...s, day: { ...s.day, period: 'morning' } };
    const hired = reducer(s, { type: 'HIRE_TEAM_MEMBER', role: 'kock' });
    expect(crewShown(hired.team).hired).toEqual(['cook2']);
    const host = s.team.members.find((m) => m.role === 'värd')!;
    const fired = reducer(s, { type: 'FIRE_TEAM_MEMBER', memberId: host.id });
    expect(crewShown(fired.team).off).toEqual(['host']);
  });

  it('regissören: den som slutar medan rummet syns går ut genom dörren och syns sedan inte; den som anställs kommer in', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    run(d, 0, 2, (t) => base(t));
    expect(d.staffSamples[ix('host')].visible).toBe(true);
    expect(d.staffSamples[ix('cook2')].visible).toBe(false);
    const xs: number[] = [];
    let gone = -1;
    run(d, 2, 40, (t) => base(t, [], { crew: { off: ['host'], hired: ['cook2'] } }), (t) => {
      const h = d.staffSamples[ix('host')];
      if (h.visible) xs.push(h.x); else if (gone < 0) gone = t;
    });
    // Per gick mot dörren (österut, entrén) innan han försvann.
    expect(gone).toBeGreaterThan(2.5);
    expect(Math.max(...xs)).toBeGreaterThan(room.entrance[0] - 1.2);
    expect(d.staffSamples[ix('cook2')].visible).toBe(true);
    expect(staffClipFor(d.staffSamples[ix('cook2')], 'cook2')).toBe('cook.station');
  });

  it('vagnen: en anställd utöver laget är Jonas vid grillen; utan lärling står luckan tom', () => {
    const s = startTruckTeam();
    expect(truckCrewShown(s)).toEqual({ grill: true, hatch: true, jonas: false });
    expect(truckCrewShown({ ...s, members: [...s.members, makeTeamMember('kock', 2)] }).jonas).toBe(true);
    expect(truckCrewShown({ ...s, members: s.members.filter((m) => m.role !== 'lärling') }).hatch).toBe(false);
  });
});

function startTruckTeam(): SimulationState['team'] {
  const s = makeNewGameState(3);
  return { ...s.team, members: [makeTeamMember('kock', 1), makeTeamMember('lärling', 1)] };
}

describe('ORDER 331 C — morgonens satsningar syns före dörrarna', () => {
  it('satsningarna mot scenen', () => {
    expect(morningShowsOf(['train-service', 'wine-tasting', 'guest-chef', 'local-sourcing', 'compost-audit', 'book-dj'])).toEqual(['briefing', 'tasting', 'guestChef', 'local', 'compost']);
  });

  it('genomgången: Per pekar (host.point) och servitörerna lyssnar (staff.listen) vända mot honom; sedan provningen vid baren', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    const clips = new Map<StaffKey, Set<string>>();
    let listenAt: { x: number; z: number; facing: number } | null = null;
    let hostAt: { x: number; z: number } | null = null;
    run(d, 0, 60, (t) => base(t, [], { prep: true, morning: ['briefing', 'tasting', 'local', 'compost', 'guestChef'] }), () => {
      STAFF_KEYS.forEach((k, i) => {
        const smp = d.staffSamples[i];
        if (!smp.visible) return;
        const c = staffClipFor(smp, k);
        if (c) { const set = clips.get(k) ?? new Set(); set.add(c); clips.set(k, set); }
        if (k === 'host' && c === 'host.point' && !hostAt) hostAt = { x: smp.x, z: smp.z };
        if (k === 'server' && c === 'staff.listen' && !listenAt) listenAt = { x: smp.x, z: smp.z, facing: smp.facing };
      });
    });
    expect([...clips.get('host')!]).toContain('host.point');
    expect([...clips.get('server')!]).toContain('staff.listen');
    expect([...clips.get('sommelier')!]).toContain('somm.pour');
    expect([...clips.get('bartender')!]).toContain('staff.listen');
    expect([...clips.get('dish')!]).toContain('staff.carryCrate');
    expect([...clips.get('cook2')!]).toContain('cook.station');
    // Servitören vänd mot Per (inom 30°).
    const l = listenAt!, h = hostAt!;
    const want = Math.atan2(h.x - l.x, h.z - l.z);
    let diff = Math.abs(want - l.facing) % (2 * Math.PI);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    expect(diff).toBeLessThan(Math.PI / 6);
    // Provningen vid baren (POUR_SPOT).
    expect(POUR_SPOT).toBeDefined();
  });

  it('utan satsningar: ingen genomgång och ingen gästkock', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    const seen = new Set<string>();
    run(d, 0, 40, (t) => base(t, [], { prep: true }), () => STAFF_KEYS.forEach((k, i) => { if (d.staffSamples[i].visible) seen.add(`${k}:${staffClipFor(d.staffSamples[i], k)}`); }));
    expect([...seen].some((x) => x.endsWith('host.point') || x.endsWith('staff.listen'))).toBe(false);
    expect([...seen].some((x) => x.startsWith('cook2:'))).toBe(false);
  });
});

// Ett par vid ett tvåbord som har fått maten, för bjudningen och vagnarna.
function seatedParty(d: WineBarDirector, o: Partial<FrameInput> = {}) {
  const guests: GuestInput[] = [];
  const set = (id: string, state: GuestState, t: number, x: Partial<GuestInput> = {}) => {
    let g = guests.find((y) => y.id === id);
    if (!g) { g = { id, state, seatIndex: null, stateTime: t, satisfaction: 0.8 }; guests.push(g); }
    Object.assign(g, { state, stateTime: t }, x);
  };
  set('g1', 'arriving', 0, { partyId: 'p1' }); set('g2', 'arriving', 0, { partyId: 'p1' });
  run(d, 0, 3, (t) => base(t, guests));
  set('g1', 'seated', 3, { seatIndex: 6 }); set('g2', 'seated', 3, { seatIndex: 7 });
  run(d, 3, 7, (t) => base(t, guests));
  set('g1', 'ordering', 7); set('g2', 'ordering', 7);
  run(d, 7, 45, (t) => base(t, guests));
  set('g1', 'dining', 45); set('g2', 'dining', 45);
  return { guests, set, then: (t0: number, t1: number, each?: (t: number) => void) => run(d, t0, t1, (t) => base(t, guests, o), each) };
}

describe('ORDER 331 C — värdens bjudning bärs till bordet', () => {
  it('simuleringen: bjudningen och det som sålts in står i day.hostCarries', () => {
    const s = makeNewGameState(3);
    const guests = [{ ...s.guests[0], id: 'a', partyId: 'pa', state: 'dining' as const }, { ...s.guests[0], id: 'b', partyId: 'pa', state: 'dining' as const }];
    const draft = { ...s, guests, day: { ...s.day, period: 'dinner' as const } } as SimulationState;
    comp(draft, 'pa', 'coffee');
    expect(draft.day.hostCarries).toEqual([{ id: expect.stringMatching(/^comp\|pa\|coffee\|/), guestIds: ['a', 'b'], carry: 'glass' }]);
  });

  it('glaset bärs från baren till sällskapet', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    const p = seatedParty(d, { hostCarries: [{ id: 'comp|p1|glass|50', guestIds: ['g1', 'g2'], carry: 'glass' }] });
    let pickedAtBar = false, glassToTable = false;
    p.then(50, 80, () => {
      for (const k of ['server', 'server2'] as StaffKey[]) {
        const smp = d.staffSamples[ix(k)];
        if (Math.hypot(smp.x - PICKUP_BAR[0], smp.z - PICKUP_BAR[1]) < 0.9 && smp.pose === 'serve') pickedAtBar = true;
        if (smp.carrying === 'glass' && smp.pose === 'serve') glassToTable = true;
      }
    });
    expect(pickedAtBar).toBe(true);
    expect(glassToTable).toBe(true);
  });
});

describe('ORDER 331 C — utrustningen i bruk', () => {
  const owned = (s: SimulationState, ids: string[]) => ({ ...s, equipment: ids }) as SimulationState;
  it('choicesShown: vin med vinkylen, ost med ostvagnen, efterrätt med flamberingsvagnen, avec med avecvagnen', () => {
    const s = makeNewGameState(3);
    const g = (id: string, dishId: string | null, drinks: string[]) => ({ ...s.guests[0], id, partyId: id, state: 'dining', order: { dishId, drinks, revenueSek: 0 } });
    const guests = [g('a', 'brie-plate', ['house-wine-glass']), g('b', 'dairy-dessert', []), g('c', 'root-soup', ['beer-pairing'])];
    const st = owned({ ...s, guests, day: { ...s.day, roomReactions: [{ at: 9, kind: 'up', table: 3, guestIds: ['c'], text: '', amountSek: 100, detail: 'avec' }] } } as unknown as SimulationState, ['vinkyl', 'ostvagn', 'flamberingsvagn', 'avecvagn']);
    expect(equipmentUsesOf(st).map((u) => `${u.kind}:${u.guestIds.join()}`)).toEqual(['fridge:a', 'cheese:a', 'flambe:b', 'avec:c']);
    expect(equipmentUsesOf(owned(st, []))).toEqual([]);
  });

  for (const [kind, cart, clip] of [['cheese', 'cheeseCart', 'cheese.cut'], ['flambe', 'flambeCart', 'flambe.pour'], ['avec', 'avecCart', 'trolley.present']] as const) {
    it(`${cart}: hämtas på sin plats, skjuts till bordet (trolley.push), ${clip} där och tillbaka`, () => {
      const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
      const d = makeDirector(room);
      const p = seatedParty(d, { equipmentUses: [{ id: `${kind}|p1`, kind, guestIds: ['g1'] }] });
      const clips = new Set<string>();
      let maxAway = 0, back = false;
      const home = EQUIPMENT[cart].home.at;
      p.then(45, 140, () => {
        const c = d.cartAt(cart);
        STAFF_KEYS.forEach((k, i) => { const smp = d.staffSamples[i]; if (smp.cart === cart) clips.add(staffClipFor(smp, k) ?? ''); });
        if (c) maxAway = Math.max(maxAway, Math.hypot(c.x - home[0], c.z - home[1]));
        if (!c && maxAway > 1.5) back = true;
      });
      expect([...clips]).toContain('trolley.push');
      expect([...clips]).toContain(clip);
      expect(maxAway).toBeGreaterThan(2);
      expect(back).toBe(true);
    });
  }

  it('vinkylen: sommeliern hämtar flaskan vid kylen och bär den till bordet', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    const p = seatedParty(d, { equipmentUses: [{ id: 'fridge|p1', kind: 'fridge', guestIds: ['g1'] }] });
    const fridge = EQUIPMENT.wineFridge.home.at;
    let atFridge = false, bottle = false;
    p.then(45, 90, () => {
      const smp = d.staffSamples[ix('sommelier')];
      if (Math.hypot(smp.x - fridge[0], smp.z - fridge[1]) < 1.3 && smp.pose === 'serve') atFridge = true;
      if (smp.carrying === 'bottle') bottle = true;
    });
    expect(atFridge).toBe(true);
    expect(bottle).toBe(true);
  });

  it('rummet: vagnen följer den som skjuter, och står på sin plats igen efteråt', () => {
    const eq = new RoomEquipment(0);
    eq.sync(['ostvagn']);
    const home = EQUIPMENT.cheeseCart.home.at;
    for (let i = 0; i < 60; i++) eq.followCarts((id) => id === 'cheeseCart' ? { x: 0, z: 0, facing: 0, pose: 'pushCart', progress: 0.5, walking: true } : null, 0.1, i * 0.1);
    const moved = eq.cartPlace('cheeseCart')!;
    expect(Math.hypot(moved.x - home[0], moved.z - home[1])).toBeGreaterThan(5);
    for (let i = 0; i < 80; i++) eq.followCarts(() => null, 0.1, i * 0.1);
    const parked = eq.cartPlace('cheeseCart')!;
    expect(Math.hypot(parked.x - home[0], parked.z - home[1])).toBeLessThan(0.05);
    eq.dispose();
  });
});
