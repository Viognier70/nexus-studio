// eatingClips.ts — de som äter vid vagnen, och vädrets klipp. D9, 2026-10-07.
//
// Läggs in i figureClips.ts efter curiousClips.ts. Samma hjälpare och kontrakt som där.
//
// Längder (s), lugn / normal / stressad:
//   guest.eatBun      4,00 / 3,20 / 2,15   en tugga per varv, loop (3 varv i prototypen)
//   guest.eatPlate    4,25 / 3,40 / 2,25   en gaffel per varv, loop
//   guest.drink       3,00 / 2,40 / 1,60
//   guest.wipeNapkin  3,25 / 2,60 / 1,75
//   guest.binNapkin   1,75 / 1,40 / 0,95
//   guest.leaveTable  1,50 / 1,20 / 0,80   gång, 0,48 m/s, sedan guest.walk
//   guest.warmHands   3,00 / 2,40 / 1,60   vid värmaren, loop
//   guest.shelter     2,50 / 2,00 / 1,35   under markisen i regn, loop
//   guest.grabNapkin  1,10 / 0,90 / 0,60   i blåsten
//
// ── Läsbarhet från 7–12 m ─────────────────────────────────────────
// Korven hålls tvärs framför bröstet och går till munnen med huvudet framåt. Tallriken står på bordet och
// gaffeln går från tallriken till munnen. Servetten är det vitaste i bilden: den dras ur hållaren, går i små
// cirklar vid munnen och sedan mellan händerna, och blir en skrynklig boll. Vid sopkorgen sträcks båda händerna
// över luckan och släpper. All rekvisita på borden och i händerna är 1,5 gånger verklig storlek (truckProps.ts).
//
// ── Ordningen (truckProps.ts EAT_FLOW) ────────────────────────────
// guest.walk (med maten) → guest.eatBun eller guest.eatPlate ×3 → guest.drink → guest.wipeNapkin
// → guest.walk till bin.approach → guest.binNapkin → guest.leaveTable → guest.walk bort
// Sval kväll vid värmaren: eat ×2 → guest.warmHands → eat ×1 → …  Regn: vid hyllan på vagnens sida, under markisen.
//
// Typer:
//   PropId        + 'hotdog' (grepp 'pinch', tvärs), 'paperTray' ('flat'), 'paperPlate' ('flat'), 'fork' ('pinch'),
//                   'drinkCan' ('wrap'), 'paperCup' ('wrap'), 'napkin' ('pinch'), 'napkinUsed' ('fist'), 'umbrella' ('fist')
//   Surface       + 'holder' (servetthållaren), 'bin', 'shelf' (hyllan vid luckan), 'heater'
//   Needs         + 'standTable', 'bin', 'heater'
//   ClipEventType + 'bite', 'wipe', 'toss'

reg(def({
  id: 'guest.eatBun', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3.2, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: { R: 'hotdog' }, ends: { R: 'hotdog' },
  events: [{ u: 0.42, type: 'bite' }], next: ['guest.eatBun', 'guest.drink', 'guest.wipeNapkin', 'guest.warmHands'],
  pose: function (u, c) {
    // Korven upp till munnen och huvudet möter den (0,22–0,58), tuggar med huvudet lite ned. Vänster hand på bordskanten.
    const bite = win(u, 0.22, 0.58, 0.1), chew = 0.04 * Math.sin(u * TAU * 4) * ramp(u, 0.5, 0.6) * (1 - ramp(u, 0.85, 1));
    return P(base(c, false), {
      torso: { pitch: 0.06 + 0.06 * bite }, head: { pitch: 0.12 + 0.12 * bite + chew },
      armR: A(0.75 + 0.9 * bite, 0.12, 1.2 + 0.8 * bite), armL: A(0.75, 0.1, 0.9)
    });
  },
  // Korven blir kortare för varje tugga: c.left = 1 − (varv + u) / varv totalt, propScale längs korven 0,35 + 0,65 · left.
  propScale: function (u, c) { return { R: 0.35 + 0.65 * (c.left ?? 1) }; }
}));

reg(def({
  id: 'guest.eatPlate', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3.4, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: { R: 'fork' }, ends: { R: 'fork' },
  events: [{ u: 0.3, type: 'grab', hand: 'R', at: 'plate' }, { u: 0.48, type: 'bite' }],
  next: ['guest.eatPlate', 'guest.drink', 'guest.wipeNapkin'],
  pose: function (u, c) {
    // Gaffeln ned i tallriken (0,1–0,3), upp till munnen (0,3–0,62). Vänster hand håller tallrikens kant.
    const up = win(u, 0.3, 0.62, 0.1), down = win(u, 0.08, 0.3, 0.06);
    return P(base(c, false), {
      torso: { pitch: 0.1 + 0.05 * down }, head: { pitch: 0.25 - 0.08 * up },
      armR: A(0.85 + 0.8 * up - 0.1 * down, 0.12, 1.0 + 1.0 * up), armL: A(0.85, 0.1, 0.8)
    });
  }
}));

reg(def({
  id: 'guest.drink', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.4, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: {}, ends: {},
  events: [{ u: 0.15, type: 'grab', hand: 'L', at: 'table', prop: 'drinkCan' }, { u: 0.88, type: 'release', hand: 'L', at: 'table' }],
  next: ['guest.eatBun', 'guest.eatPlate', 'guest.wipeNapkin'],
  pose: function (u, c) {
    // Burken (eller muggen, c.prop) lyfts med vänster hand, en klunk med huvudet bakåt, ned igen.
    const lift = win(u, 0.2, 0.85, 0.12), sip = win(u, 0.4, 0.7, 0.06);
    return P(base(c, false), {
      torso: { pitch: 0.04 - 0.04 * sip }, head: { pitch: 0.1 - 0.4 * sip },
      armL: A(0.8 + 0.9 * lift, 0.1, 0.9 + 1.2 * lift)
    });
  }
}));

reg(def({
  id: 'guest.wipeNapkin', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'stand', to: 'stand', needs: 'standTable', holds: {}, ends: { R: 'napkinUsed' },
  events: [{ u: 0.12, type: 'grab', hand: 'R', at: 'holder', prop: 'napkin' }, { u: 0.35, type: 'wipe' }, { u: 0.6, type: 'swap', prop: 'napkinUsed' }],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Drar en servett ur hållaren (0–0,17), små cirklar vid munnen (0,17–0,58), torkar händerna mot varandra (0,58–1).
    const reach = win(u, 0, 0.2, 0.07), mouth = win(u, 0.17, 0.6, 0.06), hands = ramp(u, 0.58, 0.66);
    const w = u * 30;
    return P(base(c, false), {
      torso: { pitch: 0.08 + 0.1 * reach }, head: { pitch: 0.12 },
      armR: A(0.8 + 0.4 * reach + 0.9 * mouth + 0.05 * Math.sin(w) * mouth, 0.12 + 0.04 * Math.cos(w) * mouth, 0.7 + 1.5 * mouth + 0.5 * hands),
      armL: A(0.6 + 0.4 * hands, 0.1 + 0.15 * hands, 0.6 + 0.9 * hands)
    });
  }
}));

reg(def({
  id: 'guest.binNapkin', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.4,
  from: 'stand', to: 'stand', needs: 'bin', holds: { R: 'napkinUsed', L: 'paperTray' }, ends: {},
  events: [{ u: 0.55, type: 'toss', hand: 'R', at: 'bin' }, { u: 0.56, type: 'release', hand: 'L', at: 'bin' }],
  next: ['guest.leaveTable'],
  pose: function (u) {
    // Båda händerna fram över sopkorgens lucka och släpper. Luckan slår upp (truckProps.ts BIN.flap) vid 'toss'.
    const k = win(u, 0.18, 0.75, 0.12);
    return P(STAND, { torso: { pitch: 0.06 + 0.2 * k }, head: { pitch: 0.3 * k }, armR: A(0.6 + 0.9 * k, 0.1, 0.8 - 0.4 * k), armL: A(0.6 + 0.85 * k, 0.1, 0.8 - 0.4 * k) });
  }
}));

reg(def({
  id: 'guest.leaveTable', group: 'guest', roles: ['guest'], loop: false, travel: true, base: 1.2,
  from: 'stand', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Vänder bort från sopkorgen och tar två korta steg. Blicken går ut mot torget.
    const ph = c.phase ?? u;
    return withYaw(walking(STAND, ph, 0.4 + 0.5 * ramp(u, 0.2, 1), 'both'), 0, 0.3 * (1 - ramp(u, 0, 0.8)));
  }
}));

reg(def({
  id: 'guest.warmHands', group: 'guest', roles: ['guest', 'waiter', 'staff', 'cook'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'heater', holds: {}, ends: {}, events: [],
  next: ['guest.warmHands', 'guest.eatBun', 'guest.drink'],
  pose: function (u) {
    // Båda händerna fram mot värmaren med handflatorna ut, gnids mot varandra tre gånger, axlarna upp.
    const rub = 0.12 * Math.sin(u * TAU * 3);
    return P(STAND, { lift: 0.02, torso: { pitch: 0.06 }, head: { pitch: 0.08 }, armL: A(1.15, 0.12 + rub, 0.7), armR: A(1.15, 0.12 - rub, 0.7) });
  },
  tilt: function () { return { L: { pitch: -0.6 }, R: { pitch: -0.6 } }; }
}));

reg(def({
  id: 'guest.shelter', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 2.0,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.shelter', 'queue.step', 'guest.walk'],
  pose: function (u) {
    // Under markisen i regn: axlarna upp, huvudet ned, ena handen håller ihop kragen. En blick upp mot markisens kant.
    const look = win(u, 0.55, 0.8, 0.08);
    return P(STAND, { lift: 0.03, torso: { pitch: 0.06 }, head: { pitch: 0.2 - 0.45 * look }, armR: A(0.9, 0.3, 2.2), armL: A(0.3, 0.05, 1.3) });
  }
}));

reg(def({
  id: 'guest.grabNapkin', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 0.9, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.4, type: 'grab', at: 'air' }],
  next: ['guest.eatBun', 'guest.eatPlate', 'guest.drink', 'guest.wipeNapkin'],
  pose: function (u, c) {
    // Blåsten tar servetten: en snabb sträckning åt sidan efter den (c.yaw mot servetten), oftast för sent.
    const k = win(u, 0.1, 0.85, 0.15);
    return withYaw(P(base(c, false), { torso: { pitch: 0.08 * k }, armR: A(0.6 + 1.0 * k, 0.15 + 0.5 * k, 0.4) }), (c.yaw ?? 0.7) * 0.4 * k, (c.yaw ?? 0.7) * 0.9 * k);
  }
}));
