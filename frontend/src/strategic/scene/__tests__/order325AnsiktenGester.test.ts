// ORDER 325 (Anders 2026-10-10) — ansikten och gester (Designs D11): ansiktena nära och på avstånd med gränserna i
// balance.ts, de nya klippen, kartan (gestureMap.ts) som gesterna följer, och gatans gångsätt.

import { describe, expect, it } from 'vitest';
import { CLIPS, sampleClip } from '../figureClips';
import { FACE_D11, faceLodOpacity } from '../figureFace';
import { GESTURE_BALANCE as MAP_BALANCE, MOOD_MAP, SITUATIONS, pickGesture } from '../gestureMap';
import { MoodGestures } from '../moodGestures';
import { staffClipFor } from '../theatreClips';
import { FACE_LOD, GESTURE_BALANCE, MOOD_BALANCE } from '../../../sim/balance';
import { GAIT_CLIP, streetGaitFor, streetGaitSpeed } from '../village/streetGaits';
import { D11_STRINGS } from '../../../content/design/d11Strings';
import type { FigureSample } from '../wineBarDirector';

const D11_NEW = [
  'guest.leanTalk', 'guest.shrug', 'guest.nodFirstBite', 'guest.smellWine', 'guest.pointMenu',
  'guest.laughStand', 'guest.leanTalkStand', 'guest.shrugStand', 'guest.nodApproveStand', 'guest.waveWaiterStand',
  'guest.nodFirstBiteStand', 'guest.waveStand', 'staff.listenTilt', 'waiter.wipeTable',
  'street.walkCalm', 'street.walkHurried', 'street.walkWithChild', 'street.childWalk', 'street.walkWithDog', 'street.stopLook', 'street.greet'
];

describe('ORDER 325 — ansiktena', () => {
  it('gränserna står i balance.ts och figureFace läser dem', () => {
    expect(FACE_D11.near).toBe(FACE_LOD.near);
    expect(FACE_D11.far).toBe(FACE_LOD.far);
  });

  it('vid Krogen (Z) i vinbaren och bistron (huvudena 20–28 m bort) syns det långa ansiktet helt, inte det nära', () => {
    for (const d of [20.4, 24, 26.4, 28.1]) expect(faceLodOpacity(d)).toEqual({ near: 0, far: 1 });
  });

  it('vid vagnen (12 m) och på 10 m tonar skalen över i varandra; under 9 m bara det nära, från 42 m inget', () => {
    expect(faceLodOpacity(7)).toEqual({ near: 1, far: 0 });
    const mid = faceLodOpacity(10.5);
    expect(mid.near).toBeGreaterThan(0);
    expect(mid.far).toBeGreaterThan(0);
    expect(faceLodOpacity(13)).toEqual({ near: 0, far: 1 });
    expect(faceLodOpacity(42)).toEqual({ near: 0, far: 0 });
  });
});

describe('ORDER 325 — klippen', () => {
  it('D11:s 21 nya klipp finns; de två stående i kön är D9:s som förut', () => {
    for (const id of D11_NEW) expect(CLIPS[id], id).toBeTruthy();
    expect(CLIPS['guest.checkWatchStand'].base).toBe(1.6);
  });

  it('huvudets lutning (PoseHead.roll): axelryckningen och det lyssnande huvudet lutar', () => {
    expect(Math.abs(sampleClip('guest.shrug', 0.5 * CLIPS['guest.shrug'].seconds.stressed, 'stressed', { seated: true }).pose.head?.roll ?? 0)).toBeGreaterThan(0.1);
    expect(Math.abs(sampleClip('staff.listenTilt', 1, 'normal', { yaw: 0.5 }).pose.head?.roll ?? 0)).toBeGreaterThan(0.2);
  });

  it('personalen: den som tar över en situation lyssnar med lutat huvud, avtorkningen är Designs nya', () => {
    const s = { pose: 'handle' } as FigureSample;
    expect(staffClipFor(s, 'server')).toBe('staff.listenTilt');
    expect(staffClipFor({ pose: 'wipeTable' } as FigureSample, 'server')).toBe('waiter.wipeTable');
  });
});

describe('ORDER 325 — kartan', () => {
  it('talen i balance.ts, inga tomma nycklar', () => {
    expect(MAP_BALANCE).toBe(GESTURE_BALANCE);
    for (const [k, v] of Object.entries(GESTURE_BALANCE)) if (k !== 'section') expect(v, k).not.toBeNull();
  });

  it('varje gest i kartan är ett klipp, och varje situation har sin text på båda språken', () => {
    for (const m of Object.values(MOOD_MAP)) for (const c of [...m.seated, ...m.standing]) expect(CLIPS[c], c).toBeTruthy();
    for (const s of SITUATIONS) {
      expect(CLIPS[s.clip], s.clip).toBeTruthy();
      if (s.standing) expect(CLIPS[s.standing], s.standing).toBeTruthy();
      expect(D11_STRINGS[`gm.sit.${s.id}`]?.sv, s.id).toBeTruthy();
      expect(D11_STRINGS[`gm.sit.${s.id}`]?.en, s.id).toBeTruthy();
    }
  });

  it('pickGesture: situationen med högst prioritet går före stämningen, stående vid vagnen', () => {
    expect(pickGesture({ mood: 'content', posture: 'seated', active: ['talking', 'wrongWitnessed'], index: 0, sinceLastS: 99, cooldownS: 6 })).toBe('guest.armsCrossed');
    expect(pickGesture({ mood: 'content', posture: 'standing', active: ['halfGrip'], index: 0, sinceLastS: 99, cooldownS: 6 })).toBe('guest.shrugStand');
    expect(pickGesture({ mood: 'waiting', posture: 'seated', active: [], index: 1, sinceLastS: 99, cooldownS: 6 })).toBe('guest.shrug');
  });
});

describe('ORDER 325 — gesterna i vinbaren följer kartan', () => {
  const info = (state: 'seated' | 'dining', since: number, party = 2) => ({ state, stateSinceS: since, partyId: 'p1', partySize: party });
  const content = (MOOD_BALANCE.threshold.content + MOOD_BALANCE.threshold.delighted) / 2;

  it('väntat waitWatchS utan att ha beställt: klockan; efter waitWaveS: vinkar', () => {
    const g = new MoodGestures(1);
    g.sample(0, 'a', 'guest.seatedIdle', content, 0, 'chair', null, 1, info('seated', 0));
    const w = g.sample(0, 'a', 'guest.seatedIdle', content, GESTURE_BALANCE.waitWatchS, 'chair', null, 1, info('seated', GESTURE_BALANCE.waitWatchS));
    expect(w?.id).toBe('guest.checkWatch');
    expect(g.faceFor(0)).toBe('waiting');
    const h = new MoodGestures(1);
    h.sample(0, 'a', 'guest.seatedIdle', content, 0, 'chair', null, 1, info('seated', 0));
    expect(h.sample(0, 'a', 'guest.seatedIdle', content, GESTURE_BALANCE.waitWaveS, 'chair', null, 1, info('seated', GESTURE_BALANCE.waitWaveS))?.id).toBe('guest.waveWaiter');
  });

  it('första tuggan: nick som nöjd, tallriken undan under pushPlateBelow', () => {
    const g = new MoodGestures(1);
    g.sample(0, 'a', 'guest.eat', content, 100, 'chair', null, 1, info('dining', 0));
    expect(g.sample(0, 'a', 'guest.eat', content, 100.1, 'chair', null, 1, info('dining', 0.1))?.id).toBe('guest.nodFirstBite');
    const low = GESTURE_BALANCE.pushPlateBelow - 0.05;
    const h = new MoodGestures(1);
    h.sample(0, 'b', 'guest.eat', low, 100, 'chair', null, 1, info('dining', 0));
    expect(h.sample(0, 'b', 'guest.eat', low, 100.1, 'chair', null, 1, info('dining', 0.1))?.id).toBe('guest.pushPlate');
  });

  it('ensam vid bordet lutar sig ingen fram och pratar; i sällskap gör man det', () => {
    const solo = new MoodGestures(1);
    const party = new MoodGestures(1);
    const ids = (g: MoodGestures, size: number) => {
      const out = new Set<string>();
      for (let t = 0; t < 2000; t += 0.5) { const x = g.sample(0, 'a', 'guest.seatedIdle', content, t, 'chair', null, 1, { state: 'dining', stateSinceS: 999, partyId: size > 1 ? 'p' : null, partySize: size }); if (x) out.add(x.id); }
      return out;
    };
    expect(ids(solo, 1).has('guest.leanTalk')).toBe(false);
    expect(ids(party, 2).has('guest.leanTalk')).toBe(true);
  });

  it('en gäst som såg ett fel svar korsar armarna', () => {
    const g = new MoodGestures(1);
    const good = MOOD_BALANCE.threshold.content + 0.01;
    g.sample(0, 'a', 'guest.seatedIdle', good, 10, 'chair', null, 1, info('dining', 50));
    const moment = { at: 10, kind: 'wrong' as const, table: 1, tableGuestIds: [], witnessIds: ['a'] };
    const after = MOOD_BALANCE.threshold.impatient - 0.05;
    g.sample(0, 'a', 'guest.seatedIdle', after, 10.2, 'chair', moment, 1, info('dining', 50));
    expect(g.sample(0, 'a', 'guest.seatedIdle', after, 11.5, 'chair', moment, 1, info('dining', 51))?.id).toBe('guest.armsCrossed');
  });
});

describe('ORDER 325 — gatan', () => {
  it('sex gångsätt, farten ur balance.ts', () => {
    expect(Object.values(GAIT_CLIP)).toEqual(['street.walkCalm', 'street.walkHurried', 'street.walkWithChild', 'street.walkWithDog']);
    expect(streetGaitSpeed('hurried')).toBe(GESTURE_BALANCE.streetSpeed.hurried);
  });

  it('samma sällskap går likadant samma kväll; i regnet och sent brådskar alla', () => {
    expect(streetGaitFor('k1', 'middle', 2, 7, 0.3, false)).toBe(streetGaitFor('k1', 'middle', 2, 7, 0.3, false));
    expect(streetGaitFor('k1', 'middle', 2, 7, 0.3, true)).toBe('hurried');
    expect(streetGaitFor('k1', 'middle', 2, 7, GESTURE_BALANCE.hurryFromE + 0.05, false)).toBe('hurried');
  });

  it('andelarna med barn och med hund ligger nära balance.ts', () => {
    const n = 4000;
    let child = 0, dog = 0;
    for (let i = 0; i < n; i++) {
      const k = streetGaitFor(`p${i}`, 'middle', 2, 3, 0.2, false);
      if (k === 'child') child++;
      if (k === 'dog') dog++;
    }
    expect(Math.abs(child / n - GESTURE_BALANCE.childShare.day)).toBeLessThan(0.02);
    expect(Math.abs(dog / n - GESTURE_BALANCE.dogShare)).toBeLessThan(0.02);
  });
});
