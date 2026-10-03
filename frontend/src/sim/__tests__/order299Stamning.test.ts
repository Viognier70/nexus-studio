// ORDER 299 — Raketen och rummet: stämningen, konsekvensögonblicket och
// kamerans gränser i krogen.

import { describe, expect, it } from 'vitest';
import { makeNewGameState, makeGuest } from '../../strategic/simulation/model';
import { meterFill, meterMove, moodOf, moveWitnesses, roomMoodValue, stableRoomMood, witnessesOf } from '../guestMood';
import { MOOD_BALANCE } from '../balance';
import { consequenceElapsed, effectiveSpeed } from '../../strategic/simulation/consequence';
import { CONSEQUENCE } from '../../strategic/scene/guestMood';
import { clampToRoom, roomCameraBounds, ROOM_CAMERA } from '../../strategic/camera/roomBounds';
import { framedFocus } from '../../strategic/scene/consequenceCamera';
import type { Guest, SimulationState } from '../../strategic/types';

function guest(satisfaction: number, x: number, z: number, state: Guest['state'] = 'dining', partyId?: string): Guest {
  return { ...makeGuest(0), satisfaction, position: { x, z }, state, partyId };
}

describe('ORDER 299 — stämningen', () => {
  it('lägena följer gränserna i balance.ts, och en ny gäst är nöjd', () => {
    const t = MOOD_BALANCE.threshold;
    expect(moodOf(t.delighted)).toBe('delighted');
    expect(moodOf(t.content)).toBe('content');
    expect(moodOf(t.waiting)).toBe('waiting');
    expect(moodOf(t.impatient)).toBe('impatient');
    expect(moodOf(t.impatient - 0.01)).toBe('displeased');
    expect(moodOf(makeGuest(0).satisfaction)).toBe('content');
  });

  it('rummets värde är medelvärdet per sällskap, och kön räknas', () => {
    const value = roomMoodValue({ guests: [guest(0.9, 0, 0, 'dining', 'p1'), guest(0.5, 0, 0, 'dining', 'p1'), guest(0.4, 0, 0, 'waiting')] });
    expect(value).toBeCloseTo((0.7 + 0.4) / 2, 5);
    expect(roomMoodValue({ guests: [] })).toBeNull();
  });

  it('läget fladdrar inte på en gräns (dödzonen)', () => {
    const t = MOOD_BALANCE.threshold.content;
    expect(stableRoomMood('content', t - MOOD_BALANCE.roomHysteresis / 2)).toBe('content');
    expect(stableRoomMood('content', t - MOOD_BALANCE.roomHysteresis * 2)).toBe('waiting');
    expect(stableRoomMood('waiting', t + MOOD_BALANCE.roomHysteresis / 2)).toBe('waiting');
  });

  it('mätarens fyllning stiger med värdet och står i rätt steg', () => {
    const t = MOOD_BALANCE.threshold;
    expect(meterFill(0)).toBe(0);
    expect(meterFill(1)).toBe(5);
    expect(meterFill(t.content)).toBe(3);
    expect(meterFill(0.6)).toBeGreaterThan(meterFill(0.5));
    expect(meterMove(3, 3.1)).toBeNull();
    expect(meterMove(3, 3.1, true)).toBe('up');
    expect(meterMove(3, 2.7)).toBe('down');
  });

  it('svaret flyttar dem som såg det, inte de längre bort', () => {
    const table = [guest(0.7, 0, 0)];
    const near = guest(0.7, MOOD_BALANCE.rocket.witnessRadiusM - 0.5, 0);
    const far = guest(0.7, MOOD_BALANCE.rocket.witnessRadiusM + 2, 0);
    const s = { ...makeNewGameState(1), guests: [...table, near, far] } as SimulationState;
    expect(witnessesOf(s, table).map((g) => g.id)).toEqual([near.id]);
    moveWitnesses(s, table, true);
    expect(near.satisfaction).toBeCloseTo(0.7 + MOOD_BALANCE.rocket.gain, 5);
    expect(far.satisfaction).toBe(0.7);
    moveWitnesses(s, table, false);
    expect(near.satisfaction).toBeCloseTo(0.7 + MOOD_BALANCE.rocket.gain - MOOD_BALANCE.rocket.loss, 5);
  });
});

describe('ORDER 299 — konsekvensögonblicket', () => {
  it('spelet går i normal hastighet under ögonblicket och återgången, sedan spelarens', () => {
    const base = makeNewGameState(1);
    const s = { ...base, speed: 4 as const, simTime: 100, day: { ...base.day, period: 'dinner' as const, consequence: { at: 99, kind: 'right' as const, table: 3, tableGuestIds: [], witnessIds: [] } } };
    expect(consequenceElapsed(s)).toBeCloseTo(1, 5);
    expect(effectiveSpeed(s)).toBe(1);
    expect(effectiveSpeed({ ...s, simTime: 99 + CONSEQUENCE.camera.backTo + 0.1 })).toBe(4);
    expect(effectiveSpeed({ ...s, speed: 0 as const })).toBe(0);
  });

  it('bordet ramas till höger om mitten när kortet står till vänster', () => {
    // Kameran från söder (yaw 0): skärmens höger är +x; fokus flyttas åt vänster om bordet.
    const f = framedFocus({ x: 0, z: 0 }, 7, 0, 16 / 9, CONSEQUENCE.frameX.oneTable);
    expect(f.x).toBeLessThan(0);
    expect(f.z).toBeCloseTo(0, 5);
  });
});

describe('ORDER 299 — kamerans gränser i krogen', () => {
  it('fokus hålls vid rummet och kameran står högt nog för att väggarna kapas', () => {
    roomCameraBounds.current = { cx: 0, cz: 0, radius: 8 };
    const t = clampToRoom({ focus: { x: 20, z: 0 }, distance: 20, yaw: 0, pitch: 0.2 });
    expect(Math.hypot(t.focus.x, t.focus.z)).toBeCloseTo(8 + ROOM_CAMERA.focusMarginM, 5);
    expect(t.pitch).toBeCloseTo(ROOM_CAMERA.pitchMinRad, 5);
    // Utanför krogen (byn) gäller inga gränser.
    const village = clampToRoom({ focus: { x: 200, z: 0 }, distance: 20, yaw: 0, pitch: 0.2 });
    expect(village.focus.x).toBe(200);
    const high = clampToRoom({ focus: { x: 20, z: 0 }, distance: ROOM_CAMERA.belowM + 1, yaw: 0, pitch: 0.2 });
    expect(high.focus.x).toBe(20);
    roomCameraBounds.current = null;
  });
});
