// curiousClips.ts — de nyfikna vid luckan. D9, 2026-10-07.
//
// Läggs in i figureClips.ts efter guest.walk. Samma hjälpare och kontrakt: reg, def, keys, P, A, STAND, walking,
// withYaw, win, ramp, bell, TAU. Längd per tempo via def() (base / rate, lugn 0,8 · stressad 1,5).
//
// Längder (s), lugn / normal / stressad:
//   guest.slowDown   1,75 / 1,40 / 0,95   gång, farten 1,25 → 0,55 m/s
//   guest.readSign   3,25 / 2,60 / 1,75
//   guest.smellPoint 2,75 / 2,20 / 1,45
//   guest.hesitate   3,50 / 2,80 / 1,85   holdUntil = beslutet (curiousMarker.ts)
//   guest.joinQueue  2,00 / 1,60 / 1,05
//   guest.walkOn     2,00 / 1,60 / 1,05   gång, farten 0,9 → 1,25 m/s
//   truck.beckon     2,25 / 1,80 / 1,20   vid luckan
//
// ── Läsbarhet från 10–24 m ────────────────────────────────────────
// Det kameran läser uppifrån: farten som sjunker och huvudet som vrids mot vagnen (sakta in), huvudet framåt och
// handen vid hakan framför skylten (läsa), huvudet bakåt och armen rakt ut mot röken (lukta och peka), och
// tyngden som flyttas fram och tillbaka medan blicken går mellan kön och gatan (tveka). Gesterna är förstorade som
// i resten av filen: armen som pekar når 0,62 m framåt.
//
// ── Ordningen (curiousMarker.ts CURIOUS_FLOW) ─────────────────────
// guest.walk → guest.slowDown ('notice': markeringen tänds) → guest.walk till readSpot → guest.readSign
// → guest.smellPoint → guest.hesitate ('decide') → guest.walk till köns sista plats → guest.joinQueue ('queued')
//                                                  eller guest.walkOn → guest.walk
//
// Typer: ClipEventType + 'notice', 'read', 'sniff', 'point', 'decide', 'queued'. Needs + 'sign' (stå framför skylten).
// ClipCtx + lookAt (punkt i rummets ram), lookQueue, lookPath (punkter), speedFrom, speedTo.

reg(def({
  id: 'guest.slowDown', group: 'guest', roles: ['guest'], loop: false, travel: true, base: 1.4,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.2, type: 'notice' }],
  next: ['guest.walk', 'guest.readSign'],
  pose: function (u, c) {
    // Steget kortas från 0,95 till 0,55 och huvudet vrids mot vagnen (c.yaw = vinkeln till röken).
    const ph = c.phase ?? u, stride = 0.95 - 0.4 * ramp(u, 0, 0.8);
    const p = walking(STAND, ph, stride, 'both');
    return withYaw(p, (c.yaw ?? 0) * 0.15 * ramp(u, 0.1, 0.6), (c.yaw ?? 0) * 0.8 * ramp(u, 0.05, 0.5));
  }
}));

reg(def({
  id: 'guest.readSign', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'stand', to: 'stand', needs: 'sign', holds: {}, ends: {}, events: [{ u: 0.5, type: 'read' }],
  next: ['guest.smellPoint', 'guest.hesitate', 'guest.walkOn'],
  pose: function (u, c) {
    // Huvudet framåt och ned mot tavlan, blicken går rad för rad (två svep), handen till hakan mitt i.
    const chin = win(u, 0.2, 0.85, 0.12);
    return withYaw(P(STAND, {
      torso: { pitch: 0.08 }, head: { pitch: 0.22 },
      armR: A(0.6 + 1.4 * chin, 0.1, 0.4 + 1.9 * chin)
    }), 0, 0.2 * Math.sin(u * TAU * 2));
  }
}));

reg(def({
  id: 'guest.smellPoint', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {},
  events: [{ u: 0.2, type: 'sniff' }, { u: 0.55, type: 'point', at: 'smoke' }],
  next: ['guest.hesitate', 'guest.joinQueue', 'guest.walkOn'],
  pose: function (u, c) {
    // 0–0,42 näsan upp: huvudet bakåt och bröstet lyfts i två små andetag. 0,45–0,92 armen rakt ut mot röken.
    const sniff = win(u, 0.05, 0.42, 0.08), point = win(u, 0.45, 0.92, 0.1), breath = 0.04 * Math.sin(u * 46) * sniff;
    return withYaw(P(STAND, {
      torso: { pitch: -0.05 * sniff + breath }, head: { pitch: -0.32 * sniff },
      armR: A(0.6 + 0.95 * point, 0.08, 0.6 - 0.5 * point)
    }), 0, (c.yaw ?? 0) * 0.3 * point);
  }
}));

reg(def({
  id: 'guest.hesitate', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 2.8, handed: true,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.95, type: 'decide' }],
  next: ['guest.joinQueue', 'guest.walkOn', 'guest.walk'],
  pose: function (u, c) {
    // Tyngden flyttas mellan fötterna (en gång per varv), blicken mellan kön och gatan, vänster hand vid hakan.
    // Hålls med holdUntil så länge spelaren kan hinna prata (curiousMarker.ts CURIOUS_TALK.window).
    const shift = Math.sin(u * TAU), chin = win(u, 0.12, 0.92, 0.12);
    const toward = 0.5 + 0.5 * Math.sin(u * TAU - Math.PI / 2);
    const yawHead = (c.lookQueue ?? 0.6) * (1 - toward) + (c.lookPath ?? -0.6) * toward;
    return withYaw(P(STAND, {
      hipDrop: 0.03 * shift, torso: { pitch: 0.03, roll: 0.05 * shift },
      armL: A(0.6 + 1.3 * chin, 0.1, 0.4 + 1.9 * chin)
    }), 0.1 * yawHead, yawHead);
  },
  root: function (u) { return { x: 0.05 * Math.sin(u * TAU), z: 0 }; }
}));

reg(def({
  id: 'guest.joinQueue', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6,
  from: 'walk', to: 'stand', needs: 'queueSpot', holds: {}, ends: {}, events: [{ u: 1, type: 'queued' }],
  next: ['queue.idle', 'queue.step'],
  pose: function (u, c) {
    // Två sista korta steg in på köplatsen, en blick tillbaka mot skylten, sedan händerna ihop framför sig.
    const step = 1 - ramp(u, 0, 0.45), clasp = ramp(u, 0.5, 0.8);
    let p = walking(STAND, u * 2, 0.45 * step, 'both');
    p = P(p, { armL: A(0.35 + 0.35 * clasp, 0.25 * clasp, 0.4 + 0.9 * clasp), armR: A(0.35 + 0.35 * clasp, 0.25 * clasp, 0.4 + 0.9 * clasp) });
    return withYaw(p, 0, (c.yaw ?? 0) * win(u, 0, 0.55, 0.15));
  }
}));

reg(def({
  id: 'guest.walkOn', group: 'guest', roles: ['guest'], loop: false, travel: true, base: 1.6,
  from: 'stand', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['guest.walk'],
  pose: function (u, c) {
    // Tar upp farten igen, en sista blick mot vagnen som släpps. Ingen axelryckning: det är inget misslyckande.
    const ph = c.phase ?? u, p = walking(STAND, ph, 0.6 + 0.35 * ramp(u, 0, 0.7), 'both');
    return withYaw(p, 0, (c.yaw ?? 0) * (1 - ramp(u, 0, 0.6)));
  }
}));

reg(def({
  id: 'truck.beckon', group: 'waiter', roles: ['waiter', 'staff', 'cook'], loop: false, travel: false, base: 1.8, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {}, events: [{ u: 0.3, type: 'signal' }],
  next: ['truck.wipeCounter', 'truck.hatchServe', 'staff.idle'],
  pose: function (u, c) {
    // Lutar sig ut över luckans hylla och vänder sig mot gästen (c.yaw), armen ut och handen vinkar in tre gånger.
    const out = win(u, 0.04, 0.96, 0.14), wave = 0.35 * Math.sin(u * TAU * 3.5) * out;
    return withYaw(P(STAND, {
      torso: { pitch: 0.06 + 0.12 * out }, head: { pitch: 0.05 },
      armR: A(0.5 + 1.0 * out, 0.15 + 0.1 * out, 0.9 - 0.5 * out + wave)
    }), (c.yaw ?? 0) * 0.6 * out, (c.yaw ?? 0) * out);
  }
}));
