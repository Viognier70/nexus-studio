// ORDER 286a — servicen som teater: Designs leverans 2 (teaterns grund).
// Leveransens egna kontroller körs i spelets kodbas: klippkatalogen,
// samspelens tider och rekvisitans mått (LEVERANSNOT §4–§6).

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CLIPS, SEAT_KINDS, TEMPO, canSit, sampleClip, seatKindFromRoom, soleHeight, validateClips } from '../figureClips';
import { createWineBarRoom } from '../wineBarRoom';
import { checkInteractions } from '../figureInteractions';
import { CATALOGUE, createProp, measureProp } from '../tableware';

describe('ORDER 286a — leveransens kontroller', () => {
  // ORDER 293 — leverans 3 (38 klipp och guest.showIdSeated) och vardagens
  // koreografi (21 klipp, guest.wheelRoll m.fl.): 107 klipp. ORDER 299 —
  // Designs D1 (stämningen) lägger till åtta gester: 115. ORDER 309 — Designs
  // D5 lägger till sju (vagnarna, flamberingen, ostvagnen, tiredIdle, hesitate): 122.
  it('122 klipp (till och med D5:s sju), och varje efterföljare finns och passar', () => {
    expect(Object.keys(CLIPS)).toHaveLength(122);
    expect(validateClips()).toEqual([]);
  });

  it('samspelen: ingen synkpunkt utanför toleransen i något tempo', () => {
    const rows = checkInteractions();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => !r.ok)).toEqual([]);
  });

  // ORDER 293 — leverans 3 (tio föremål) och vardagens koreografi (fyra): 31.
  it('rekvisitan: 31 föremål, mått inom 2 mm och undersidan på y = 0', () => {
    const ids = Object.keys(CATALOGUE) as (keyof typeof CATALOGUE)[];
    expect(ids).toHaveLength(31);
    for (const id of ids) expect(measureProp(createProp(id)).ok).toBe(true);
  });

  it('sittregeln för alla sitsar: stol 0,45, barstol 0,75, lounge 0,38', () => {
    expect(canSit({ x: 0, z: 0, yaw: 0, seatHeight: 0.45 })).toBe(true);
    expect(canSit({ x: 0, z: 0, yaw: 0, seatHeight: 0.75, kind: 'stool' })).toBe(true);
    expect(canSit({ x: 0, z: 0, yaw: 0, seatHeight: 0.38, kind: 'lounge' })).toBe(true);
    expect(canSit({ x: 0, z: 0, yaw: 0, seatHeight: 0.75 })).toBe(false);
    expect(canSit(null)).toBe(false);
  });

  it('samma indata ger samma bildruta, i alla tre tempon', () => {
    for (const tempo of Object.keys(TEMPO) as (keyof typeof TEMPO)[]) {
      const a = sampleClip('waiter.serve', 0.7, tempo);
      const b = sampleClip('waiter.serve', 0.7, tempo);
      expect(a).toEqual(b);
    }
  });
});

describe('ORDER 286a — vinbarens rum följer sittregeln (tillägget till leverans 2)', () => {
  const room = createWineBarRoom();
  room.group.updateMatrixWorld(true);
  const node = (name: string) => room.group.getObjectByName(name)!;

  it('varje plats i vinbaren klarar sittregeln för sin sort', () => {
    for (const seat of room.seats) {
      const kind = seatKindFromRoom(seat.kind);
      expect(canSit({ x: seat.local[0], z: seat.local[1], yaw: seat.facing, seatHeight: seat.seatHeight, kind }), seat.id).toBe(true);
    }
  });

  it('loungebordet står 0,95 m framför dynans mitt', () => {
    const lounge = room.seats.find((s) => s.kind === 'lounge')!;
    const table = new THREE.Vector3();
    node(lounge.furnitureId).getWorldPosition(table);
    room.group.worldToLocal(table);
    expect(Math.abs(lounge.local[1] - table.z)).toBeCloseTo(0.95, 3);
  });

  it('barstolarna har en fotring där klippet sätter sulan', () => {
    const stools = room.seats.filter((s) => s.kind === 'bar');
    expect(stools.length).toBeGreaterThan(0);
    for (const s of stools) {
      const ring = node(s.seatNodeId + 'Footring');
      expect(ring, s.id).toBeTruthy();
      expect(ring.position.y - room.floorY).toBeCloseTo(SEAT_KINDS.stool.footrest!, 3);
    }
  });

  it('sittande på barstol: sulan på ringen; i loungen: sulan i golvet', () => {
    const stool = sampleClip('guest.seatedIdle', 1, 'normal', { seatKind: 'stool', heightMult: 1 });
    expect(Math.abs(soleHeight(stool.pose, 1) - SEAT_KINDS.stool.footrest!)).toBeLessThan(0.01);
    const lounge = sampleClip('guest.seatedIdle', 1, 'normal', { seatKind: 'lounge', heightMult: 1 });
    expect(Math.abs(soleHeight(lounge.pose, 1))).toBeLessThan(0.01);
  });
});

describe('ORDER 286a — raketen börjar i rummet', () => {
  it('introts längder i balance.ts är klippens vid normalt tempo', async () => {
    const { THEATRE } = await import('../../../sim/balance');
    const { clipSeconds } = await import('../figureClips');
    expect(THEATRE.rocketIntroSeconds.cutHand).toBe(clipSeconds('rocket.cutHand', 'normal'));
    expect(THEATRE.rocketIntroSeconds.smellWine).toBe(clipSeconds('rocket.smellWine', 'normal'));
    expect(THEATRE.rocketIntroSeconds.askPointMenu).toBe(clipSeconds('rocket.askPointMenu', 'normal'));
  });

  it('raketen pekar på en figur och ett klipp; stegets klocka står tills klippet har spelats', async () => {
    const { reducer } = await import('../../simulation/reducer');
    const { makeNewGameState } = await import('../../simulation/model');
    const { firstDayOfWeek } = await import('../../../sim/calendar');
    const { PLAYERS } = await import('../../testHarness/randomness');
    const { THEATRE } = await import('../../../sim/balance');
    let s = makeNewGameState(5);
    s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } };
    s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    s = reducer(s, { type: 'START_SERVICE' });
    const TICK = { type: 'TICK', dt: 0.2 } as const;
    let checked = 0;
    for (let i = 0; i < 40000 && s.day.period === 'dinner' && checked < 3; i++) {
      const a = s.incidents.active;
      // Händelserna som teater (ORDER 293) väntar på manuset, utan figur.
      if (a && a.introLeft && a.introLeft > 0 && a.step === 0 && !a.backed && !THEATRE.eventAskSeconds[a.id]) {
        const fig = a.context.figure!;
        expect(fig).toBeTruthy();
        expect(a.introLeft).toBeLessThanOrEqual(THEATRE.rocketIntroSeconds[fig.clip]);
        if (fig.kind === 'guest') expect(a.context.guestIds).toContain(fig.guestId);
        const left = a.secondsLeft;
        const id = a.id;
        while (s.incidents.active?.id === id && (s.incidents.active.introLeft ?? 0) > 0) s = reducer(s, TICK);
        expect(s.incidents.active?.secondsLeft).toBe(left);
        checked++;
      }
      if (s.incidents.active && (s.incidents.active.introLeft ?? 0) === 0) {
        const { rankedStepOption } = await import('../../../sim/incidents');
        const { incidentById } = await import('../../../sim/incidentBank');
        const x = s.incidents.active;
        s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(incidentById('vinbar', x.id)!.steps[x.step], 'best', x.struck, x.situation) });
      }
      s = reducer(s, TICK);
    }
    expect(checked).toBeGreaterThan(0);
  });
});
