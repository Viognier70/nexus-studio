// asaClips.ts — Åsas tre klipp: hälsar, pekar mot en plats och nickar gillande. D6, 2026-10-07 (ORDER 313 §1).
//
// Läggs in i figureClips.ts efter staff.idle. Använder filens egna hjälpare (reg, def, keys, P, A, STAND, win, bell,
// withYaw) och samma kontrakt: rena funktioner, inga nya led, längd per tempo via def() (base / rate).
// Typer: Role + 'mentor'. ClipGroup + 'mentor'.
//
// Längder (s): asa.greet 3,00 / 2,40 / 1,60, asa.point 3,25 / 2,60 / 1,75, asa.nodApprove 2,75 / 2,20 / 1,45.
// Åsa spelas nästan alltid lugnt. Hon har bråttom bara om scenen har det.
//
// ── Läsbarhet ────────────────────────────────────────────────────
// Hatten är det kameran ser från 24 m, så alla tre klippen rör hatten: handen till brättet när hon hälsar,
// brättet vrids mot platsen när hon pekar, och brättet gungar två gånger när hon nickar.
//   asa.greet       Höger hand upp till brättet, en liten bugning, handen ned. Läses som ett hej på avstånd.
//   asa.point       Bålen och huvudet vrids mot platsen (ctx.yaw), armen rak ut i axelhöjd, stilla, tillbaka.
//                   Pekar mot Måltidens hus, bankens dörr eller vinbarens skylt. Vänster arm om platsen ligger till
//                   vänster (ctx.hand = 'L', handed).
//   asa.nodApprove  Händerna knäppta framför sig, två långsamma nickar och en lätt lutning bakåt. Gillande, aldrig
//                   rätt eller fel: ingen färg, ingen puls.

reg(def({
  id: 'asa.greet', group: 'mentor', roles: ['mentor'], loop: false, travel: false, handed: true, base: 2.4,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.3, type: 'signal' }],
  next: ['staff.idle', 'asa.point', 'asa.nodApprove'],
  pose: function (u, c) {
    const touch = P(STAND, { torso: { roll: -0.03 }, armR: A(1.72, 0.16, 2.2), armL: A(0.08, 0.04, 0.2) });
    const bow = P(touch, { torso: { pitch: 0.12 }, head: { pitch: 0.26 } });
    const p = keys(u, [
      [0, STAND],
      [0.26, touch],
      [0.44, bow],
      [0.6, bow],
      [0.74, touch],
      [0.94, STAND],
      [1, STAND]
    ]);
    const toward = (c.yaw ?? 0) * win(u, 0.1, 0.9, 0.15);
    return withYaw(p, toward * 0.3, toward * 0.7);
  }
}));

reg(def({
  id: 'asa.point', group: 'mentor', roles: ['mentor'], loop: false, travel: false, handed: true, base: 2.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [{ u: 0.4, type: 'signal' }],
  next: ['staff.idle', 'asa.nodApprove', 'asa.greet'],
  pose: function (u, c) {
    // 0–0,3 vrider sig och lyfter armen, 0,3–0,72 stilla (förlängs med c.holdUntil), 0,72–1 tillbaka.
    const k = win(u, 0.04, 0.96, 0.28), yaw = (c.yaw ?? 0) * k;
    const p = P(STAND, {
      torso: { pitch: 0.03 - 0.03 * k, roll: -0.04 * k }, head: { pitch: 0.04 - 0.06 * k },
      armR: A(0.1 + 1.42 * k, 0.12 + 0.1 * k, 0.15 - 0.1 * k),
      armL: A(0.1 + 0.12 * k, 0.05, 0.35 + 0.5 * k)
    });
    return withYaw(p, yaw * 0.55, yaw * 0.9);
  },
  tilt: function (u) { return { R: { pitch: 0.1 * win(u, 0.04, 0.96, 0.28) } }; } // pekfingret i armens linje
}));

reg(def({
  id: 'asa.nodApprove', group: 'mentor', roles: ['mentor'], loop: false, travel: false, base: 2.2,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'asa.point', 'asa.greet'],
  pose: function (u, c) {
    const clasp = win(u, 0.02, 0.98, 0.18);
    const nod = 0.24 * bell(u, 0.36, 0.07) + 0.24 * bell(u, 0.62, 0.07);
    const back = 0.05 * win(u, 0.7, 0.98, 0.12);
    const p = P(STAND, {
      torso: { pitch: 0.03 - back }, head: { pitch: 0.04 + nod - back },
      armR: A(0.08 + 0.34 * clasp, -0.02 - 0.06 * clasp, 0.2 + 0.95 * clasp),
      armL: A(0.08 + 0.34 * clasp, -0.02 - 0.06 * clasp, 0.2 + 0.95 * clasp)
    });
    const toward = (c.yaw ?? 0) * clasp;
    return withYaw(p, toward * 0.25, toward * 0.7);
  }
}));
