// fikaClips.ts — två klipp till fikat efter stängning. Tillägg till D7, 2026-10-07.
//
// Läggs in i figureClips.ts efter guest.waveStaff. Samma hjälpare och kontrakt: reg, def, keys, P, A, base, win, bell,
// withYaw, TAU. Längd per tempo via def() (base / rate). PropId 'coffeeCup' (grepp 'handle') kom med truckClips.ts.
//
// Längder (s): gesture.raiseHand 2,25 / 1,80 / 1,20, fika.sipCup 3,75 / 3,00 / 2,00.
//
// ── Läsbarhet från 8 m (fikats kamera) ────────────────────────────
// Att räcka upp handen ska skilja sig från guest.waveStaff: armen går rakt upp över huvudet och står stilla med
// öppen hand, utan vinkning. Bålen rätar upp sig och huvudet lyfts. Handen hålls uppe tills kortet öppnas (holdUntil),
// och sänks sedan. Att dricka ur koppen: koppen lyfts med handtaget, vänster hand under fatet, en klunk med huvudet
// bakåt, koppen ned. Långsammare än guest.sip med glaset.

reg(def({
  id: 'gesture.raiseHand', group: 'guest', roles: ['guest', 'waiter', 'staff', 'cook', 'host', 'bartender', 'sommelier'], loop: false, travel: false, handed: true, base: 1.8,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [{ u: 0.4, type: 'signal' }],
  next: ['guest.seatedIdle', 'fika.sipCup'],
  pose: function (u, c) {
    // 0–0,4 armen upp, 0,4–0,75 stilla (förlängs med c.holdUntil), 0,75–1 ned. c.seated = false ger samma klipp stående.
    const b = base(c, true);
    const up = win(u, 0.04, 0.96, 0.32);
    return withYaw(P(b, {
      torso: { pitch: 0.02 - 0.06 * up, roll: -0.05 * up }, head: { pitch: 0.04 - 0.12 * up },
      armR: A(0.6 + 2.35 * up, 0.12 + 0.06 * up, 0.9 - 0.75 * up)
    }), (c.yaw ?? 0) * 0.2 * up, (c.yaw ?? 0) * 0.7 * up);
  },
  tilt: function (u) { return { R: { pitch: 0.35 * win(u, 0.04, 0.96, 0.32) } }; } // handflatan framåt
}));

reg(def({
  id: 'fika.sipCup', group: 'guest', roles: ['guest', 'waiter', 'staff', 'cook', 'host', 'bartender', 'sommelier'], loop: false, travel: false, handed: true, base: 3,
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.12, type: 'grab', hand: 'R', at: 'table', prop: 'coffeeCup' }, { u: 0.88, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.seatedIdle', 'fika.sipCup', 'gesture.raiseHand'],
  pose: function (u, c) {
    const b = base(c, true);
    const cup = A(0.9, 0.1, 1.95), saucer = A(0.75, 0.06, 1.2);
    return keys(u, [
      [0, b],
      [0.12, P(b, { armR: A(0.8, 0.1, 0.95) })],
      [0.32, P(b, { torso: { pitch: 0.1 }, head: { pitch: 0.05 }, armR: cup, armL: saucer })],
      [0.5, P(b, { torso: { pitch: 0.04 }, head: { pitch: -0.18 }, armR: A(0.8, 0.1, 2.15), armL: saucer })],
      [0.66, P(b, { torso: { pitch: 0.08 }, head: { pitch: 0.02 }, armR: cup, armL: saucer })],
      [0.88, P(b, { armR: A(0.8, 0.1, 0.95) })],
      [1, b]
    ]);
  },
  tilt: function (u) { return { R: { pitch: -0.5 * win(u, 0.4, 0.6, 0.06) } }; }
}));

// Typer: ClipEventType + 'signal' (den som räcker upp handen syns för kameran och kortet kan öppnas).
// Fikat: den som frågar spelar gesture.raiseHand med holdUntil = kortet öppnas, de andra fika.sipCup med
// förskjutning 0 / 2,5 / 4,0 s så att inte alla dricker samtidigt (FIKA_SCENE.clips i afterHoursFika.ts).
