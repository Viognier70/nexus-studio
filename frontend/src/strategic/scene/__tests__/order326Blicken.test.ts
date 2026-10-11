// ORDER 326 B (Anders 2026-10-11, Designs D11 (46)) — "bygg in guest.seekEye och guest.seekEyeStand enligt
// gestureMap.ts. Stegen blick → hand (guest.waveStaff) → vinkning. Tiderna sätts i balance.ts." och "Ingen gäst
// tittar mot kameran."

import { describe, expect, it } from 'vitest';
import { CLIPS, sampleClip } from '../figureClips';
import { GESTURE_RULES, MOOD_MAP, SITUATIONS } from '../gestureMap';
import { MoodGestures } from '../moodGestures';
import { wantStep } from '../wantSignals';
import { GESTURE_BALANCE, MOOD_BALANCE } from '../../../sim/balance';
import { D11_STRINGS } from '../../../content/design/d11Strings';

const B = GESTURE_BALANCE;
const content = (MOOD_BALANCE.threshold.content + MOOD_BALANCE.threshold.delighted) / 2;
// ORDER 327 B — stegen läser regissörens signal (wantSignals.ts): beställningen från waitWatchS efter att sällskapet satt sig.
const want = (since: number) => ({ kind: 'order' as const, since: B.waitWatchS, step: wantStep({ kind: 'order', since: B.waitWatchS, ackAt: null, ackBy: null, nodded: [], restarts: 0 }, since) });
const info = (since: number, seekYaw = 0.9) => ({ state: 'seated' as const, stateSinceS: since, partyId: 'p', partySize: 2, seekYaw, want: want(since) });

describe('ORDER 326 B — söka personalens blick', () => {
  it('klippen finns, sittande och stående, och kartan har stegen och regeln om kameran', () => {
    expect(CLIPS['guest.seekEye'].base).toBe(3.2);
    expect(CLIPS['guest.seekEyeStand']).toBeTruthy();
    expect(GESTURE_RULES.wantLadder).toEqual(['guest.seekEye', 'guest.waveStaff', 'guest.waveWaiter']);
    expect(GESTURE_RULES.noCameraGaze).toBe(true);
    expect(MOOD_MAP.waiting.seated[0]).toBe('guest.seekEye');
    expect(MOOD_MAP.waiting.standing[0]).toBe('guest.seekEyeStand');
    for (const id of ['wantsOrder', 'wantsRefill', 'wantsBill', 'wantsHatch']) {
      expect(SITUATIONS.some((s) => s.id === id), id).toBe(true);
      expect(D11_STRINGS[`gm.sit.${id}`]?.en, id).toBeTruthy();
    }
  });

  it('tiderna står i balance.ts', () => {
    expect(B.seekEyeS).toBeGreaterThan(0);
    expect(B.waitWatchS + B.seekEyeS).toBeLessThan(B.waitWaveS);
  });

  it('huvudet vänds mot den gästen söker (ctx.yaw), händerna ligger stilla', () => {
    const at = (u: number, yaw: number) => sampleClip('guest.seekEye', u * 3.2, 'normal', { seated: true, yaw }).pose;
    const still = at(0.001, 0.9), mid = at(0.5, 0.9);
    expect(mid.head?.yaw ?? 0).toBeGreaterThan(0.5);
    expect(at(0.5, -0.9).head?.yaw ?? 0).toBeLessThan(-0.5);
    expect(mid.armR).toEqual(still.armR);
    expect(mid.armL).toEqual(still.armL);
  });

  it('stegen: blicken från waitWatchS, handen efter seekEyeS till, den stora vinkningen från waitWaveS', () => {
    const run = (t: number, g: MoodGestures) => g.sample(0, 'a', 'guest.seatedIdle', content, t, 'chair', null, 1, info(t))?.id ?? null;
    const g = new MoodGestures(1);
    run(0, g);
    expect(run(B.waitWatchS - 1, g)).toBeNull();
    expect(run(B.waitWatchS, g)).toBe('guest.seekEye');
    expect(g.situationOf(0)).toBe('wantsOrder');
    expect(g.faceFor(0)).toBe('waiting');
    const seen = new Set<string>();
    for (let t = B.waitWatchS; t <= B.waitWaveS + 3 * B.gestureCooldownS; t += 0.25) { const id = run(t, g); if (id) seen.add(`${id}@${t >= B.waitWatchS + B.seekEyeS ? (t >= B.waitWaveS ? 'wave' : 'hand') : 'eye'}`); }
    expect(seen.has('guest.seekEye@eye')).toBe(true);
    expect(seen.has('guest.waveStaff@hand')).toBe(true);
    expect(seen.has('guest.waveWaiter@wave')).toBe(true);
    expect(seen.has('guest.waveStaff@eye')).toBe(false);
  });

  it('blicken söks mot personalen i rummet, inte mot kameran: vinkeln går in i klippet', () => {
    const g = new MoodGestures(1);
    g.sample(0, 'a', 'guest.seatedIdle', content, 0, 'chair', null, 1, info(0, -1.1));
    g.sample(0, 'a', 'guest.seatedIdle', content, B.waitWatchS, 'chair', null, 1, info(B.waitWatchS, -1.1));
    const x = g.sample(0, 'a', 'guest.seatedIdle', content, B.waitWatchS + 1.6, 'chair', null, 1, info(B.waitWatchS, -1.1));
    expect(x?.id).toBe('guest.seekEye');
    expect(x!.clip.pose.head?.yaw ?? 0).toBeLessThan(-0.5);
  });
});
