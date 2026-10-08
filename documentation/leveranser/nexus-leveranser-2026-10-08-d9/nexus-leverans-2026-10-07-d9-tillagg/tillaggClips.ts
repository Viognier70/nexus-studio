// tillaggClips.ts — kroppsspråket och marschallerna. Tillägg till D9, 2026-10-07.
//
// Läggs in i figureClips.ts efter curiousClips.ts och eatingClips.ts. Samma hjälpare och kontrakt.
// guest.hesitate här ERSÄTTER guest.hesitate i curiousClips.ts.
//
// Gästerna utanför har ingen stämningssymbol (beslut 2026-10-07). Spelaren läser dem på kroppen: tvekan,
// en blick på klockan, armarna i kors när det är kallt och ett skakat huvud.
//
// Längder (s), lugn / normal / stressad:
//   guest.hesitate     3,50 / 2,80 / 1,85   loop
//   guest.checkWatch   2,00 / 1,60 / 1,05
//   guest.armsCrossed  3,00 / 2,40 / 1,60   loop, stående i kyla
//   guest.shakeHead    1,10 / 0,90 / 0,60
//   guest.turnToHatch  1,10 / 0,90 / 0,60
//   staff.walkLighter  gång, 1,3 m/s
//   staff.lightTorch   3,00 / 2,40 / 1,60

reg(def({
  id: 'guest.hesitate', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 2.8, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.95, type: 'decide' }],
  next: ['guest.joinQueue', 'guest.walkOn', 'guest.walk', 'guest.checkWatch', 'guest.shakeHead', 'guest.turnToHatch'],
  pose: function (u, c) {
    // Som i D9, och starkare: ett halvt steg mot kön och tillbaka (root), blicken mellan kön och gatan.
    // Varmt: vänster hand vid hakan. Kallt (c.cold): armarna i kors i stället.
    const shift = Math.sin(u * TAU), chin = c.cold ? 0 : win(u, 0.12, 0.92, 0.12);
    const toward = 0.5 + 0.5 * Math.sin(u * TAU - Math.PI / 2);
    const yawHead = (c.lookQueue ?? 0.6) * (1 - toward) + (c.lookPath ?? -0.6) * toward;
    let p = P(STAND, { hipDrop: 0.03 * shift, torso: { pitch: 0.03, roll: 0.05 * shift }, armL: A(0.6 + 1.3 * chin, 0.1, 0.4 + 1.9 * chin) });
    if (c.cold) p = P(p, ARMS_CROSSED);
    return withYaw(p, 0.1 * yawHead, yawHead);
  },
  // 0,24 m mot köns sista plats (c.toQueue, enhetsvektor i rummets ram) och tillbaka, plus svajet i sidled.
  root: function (u, c) { const s = 0.24 * win(u, 0.12, 0.55, 0.12), q = c.toQueue ?? [0, 1]; return { x: q[0] * s + 0.05 * Math.sin(u * TAU), z: q[1] * s }; }
}));

/** Armarna i kors: underarmarna över bröstet, händerna vid motsatt armbåge. Axlarna lite upp. */
const ARMS_CROSSED = { lift: 0.02, armL: A(0.95, 0.55, 1.95), armR: A(0.95, 0.55, 1.95) };

reg(def({
  id: 'guest.checkWatch', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.5, type: 'glance' }],
  next: ['guest.hesitate', 'queue.idle', 'guest.walkOn'],
  pose: function (u, c) {
    // Vänster underarm upp framför bröstet med handleden vriden uppåt, huvudet ned och vridet mot den. Kort.
    const w = win(u, 0.05, 0.95, 0.2);
    let p = P(STAND, { torso: { pitch: 0.04 + 0.04 * w }, head: { pitch: 0.1 + 0.35 * w }, armL: A(0.6 + 0.9 * w, 0.25 * w, 0.5 + 1.5 * w) });
    if (c.cold) p = P(p, { armR: ARMS_CROSSED.armR });
    return withYaw(p, 0, 0.35 * w);
  },
  tilt: function (u) { return { L: { roll: -1.2 * win(u, 0.05, 0.95, 0.2) } }; }
}));

reg(def({
  id: 'guest.armsCrossed', group: 'guest', roles: ['guest', 'waiter', 'staff'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.armsCrossed', 'guest.checkWatch', 'queue.step'],
  pose: function (u) {
    // Kallt: armarna i kors, axlarna upp, ett litet guppande från fot till fot.
    const bob = Math.sin(u * TAU * 2);
    return P(STAND, { ...ARMS_CROSSED, hipDrop: 0.015 * bob, torso: { pitch: 0.05, roll: 0.03 * bob }, head: { pitch: 0.12 } });
  },
  root: function (u) { return { x: 0.012 * Math.sin(u * TAU * 2), z: 0 }; }
}));

reg(def({
  id: 'guest.shakeHead', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.9,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walkOn'],
  pose: function (u, c) {
    // Huvudet åt sidorna två och en halv gånger, mjukt. Det är ett nej tack, inte ilska.
    const k = win(u, 0.05, 0.95, 0.15);
    const p = c.cold ? P(STAND, ARMS_CROSSED) : STAND;
    return withYaw(p, 0, 0.42 * Math.sin(u * Math.PI * 5) * k);
  }
}));

reg(def({
  id: 'guest.turnToHatch', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.9,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Vänder huvudet och bålen mot luckan när medhjälparen vinkar (c.yaw = vinkeln till luckan), rätar på sig.
    const k = ramp(u, 0, 0.4);
    return withYaw(P(STAND, { torso: { pitch: -0.02 * k } }), (c.yaw ?? 0) * 0.4 * k, (c.yaw ?? 0) * k);
  }
}));

reg(def({
  id: 'staff.walkLighter', group: 'staff', roles: STAFF, loop: true, travel: true, base: 1, handed: true,
  from: 'walk', to: 'walk', needs: 'floor', holds: { R: 'lighter' }, ends: { R: 'lighter' }, events: [],
  next: ['staff.walkLighter', 'staff.lightTorch', 'staff.walk'],
  pose: function (u, c) {
    // Raskt, tändaren nedåt längs benet.
    const ph = c.phase ?? u;
    return P(walking(STAND, ph, c.stride ?? 1.05, 'L'), { armR: A(0.15, 0.1, 0.35) });
  }
}));

reg(def({
  id: 'staff.lightTorch', group: 'staff', roles: STAFF, loop: false, travel: false, base: 2.4, handed: true,
  from: 'stand', to: 'stand', needs: 'torch', holds: { R: 'lighter' }, ends: { R: 'lighter' },
  events: [{ u: 0.4, type: 'spark', hand: 'R' }, { u: 0.55, type: 'ignite', at: 'torch' }],
  next: ['staff.walkLighter'],
  pose: function (u) {
    // Böjer sig fram mot marschallen, armen ut med tändaren mot veken (0,12–0,88). Lågan på tändaren 0,4–0,72,
    // och marschallen tänds vid 0,55 och tonar upp på 0,8 s (torchLighting.ts).
    const k = win(u, 0.12, 0.88, 0.14);
    return P(STAND, { torso: { pitch: 0.06 + 0.32 * k }, head: { pitch: 0.2 + 0.25 * k }, armR: A(0.6 + 0.75 * k, 0.1, 0.6 - 0.3 * k), armL: A(0.4, 0.08, 0.6) });
  }
}));

// Typer: ClipEventType + 'glance', 'spark', 'ignite'. PropId + 'lighter' (lång gaständare, 0,30 m, grepp 'fist',
// skalas inte, lågan vid spetsen), 'watch' (armbandsur, del av figuren). Needs + 'torch' (stå 0,5–0,6 m från marschallen).
