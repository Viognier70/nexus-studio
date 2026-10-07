// truckClips.ts — tre nya klipp för vagnen. D7, 2026-10-06.
//
// Läggs in i figureClips.ts efter bar.wipe. Använder filens egna hjälpare (reg, def, keys, P, A, STAND, TAU,
// win, withYaw) och samma kontrakt: rena funktioner, inga nya led, längd per tempo via def() (base / rate).
//
// Tillägg i typerna:
//   Needs          + 'hatch'   (luckan: stå på vagngolvet med bänken framför)
//   PropId         + 'tongs' (grepp 'pinch'), 'foodBox' (grepp 'flat'), 'coffeeCup' (grepp 'handle', till fikat)
//   ClipEventType  + 'flip'    (det som ligger på grillen vänds)
//
// Längder (s): truck.grill 2,50 / 2,00 / 1,35, truck.hatchServe 3,25 / 2,60 / 1,75, truck.wipeCounter 3,00 / 2,40 / 1,60.
//
// ── Läsbarhet från 24 m ───────────────────────────────────────────
// Taket är kapat. Det kameran läser är armen över grillen och röken vid vändningen (grilla), armen ut genom
// luckan med brickan (servera) och handen som går i cirklar längs bänken (torka). Gesterna är förstorade
// som i resten av filen: armen ut genom luckan når 0,95 m framåt, och bålen lutar 0,12.
//
// ── Ordningen vid vagnen ──────────────────────────────────────────
// grillaren:  truck.grill (loop) → cook.toPass (vänder sig 180°, ställer brickan på bänken, 'release' at 'pass') → truck.grill
// vid luckan: truck.wipeCounter (loop) → truck.hatchServe när en bricka står på bänken och en gäst väntar vid hämtplatsen
//             → truck.wipeCounter. Tag brickan med vänster hand: hämtplatsen ligger åt vänster från luckan (ctx.hand = 'L').

reg(def({
  id: 'truck.grill', group: 'cook', roles: ['cook'], loop: true, travel: false, base: 2.0,
  from: 'stand', to: 'stand', needs: 'station', holds: { R: 'tongs' }, ends: { R: 'tongs' },
  events: [{ u: 0.42, type: 'flip', hand: 'R', at: 'station' }],
  next: ['truck.grill', 'cook.toPass', 'staff.idle'],
  pose: function (u, c) {
    // Armen ut över gallret, ett snabbt vrid med tången, tillbaka. Vänster hand vilar på gallrets kant.
    const s = c.stress ?? 0;
    const reach = win(u, 0.1, 0.62, 0.12), flip = win(u, 0.36, 0.5, 0.05);
    return withYaw(P(STAND, {
      torso: { pitch: 0.14 + 0.1 * reach + 0.06 * s }, head: { pitch: 0.42 + 0.1 * reach },
      armR: A(0.6 + 0.55 * reach, 0.12 + 0.18 * flip, 1.1 - 0.6 * reach),
      armL: A(0.55, 0.05, 1.0)
    }), 0.12 * Math.sin(u * TAU) * (0.5 + s), 0);
  }
}));

reg(def({
  id: 'truck.hatchServe', group: 'waiter', roles: ['waiter', 'staff'], loop: false, travel: false, base: 2.6, handed: true,
  from: 'stand', to: 'stand', needs: 'hatch', holds: {}, ends: {},
  events: [{ u: 0.28, type: 'grab', hand: 'R', at: 'pass' }, { u: 0.6, type: 'give', hand: 'R', at: 'partner' }],
  next: ['truck.wipeCounter', 'truck.hatchServe', 'staff.idle'],
  pose: function (u, c) {
    // Vrider sig mot bänken och tar brickan, vänder tillbaka och sträcker armen ut genom luckan,
    // lutar sig fram över hyllan, släpper, rätar upp sig och nickar.
    const yaw = keys(u, [[0, P(STAND, { torso: { yaw: 0 } })], [0.28, P(STAND, { torso: { yaw: 0.55 } })], [0.58, P(STAND, { torso: { yaw: 0.2 } })], [0.9, P(STAND, { torso: { yaw: 0 } })]]).torso.yaw;
    const out = win(u, 0.34, 0.66, 0.1), lean = win(u, 0.38, 0.66, 0.08), nod = win(u, 0.72, 0.9, 0.06);
    return withYaw(P(STAND, {
      torso: { pitch: 0.06 + 0.12 * lean }, head: { pitch: 0.1 + 0.25 * nod },
      armR: A(0.5 + 0.9 * out, 0.15 + 0.2 * out, 0.9 - 0.75 * out),
      armL: A(0.35, 0.05, 1.0)
    }), yaw, yaw * 0.6);
  }
}));

reg(def({
  id: 'truck.wipeCounter', group: 'waiter', roles: ['waiter', 'staff', 'cook'], loop: true, travel: false, base: 2.4,
  from: 'stand', to: 'stand', needs: 'hatch', holds: { R: 'napkin' }, ends: { R: 'napkin' }, events: [],
  next: ['truck.wipeCounter', 'truck.hatchServe', 'staff.idle'],
  pose: function (u, c) {
    // Tre cirklar per svep, svepet fram och tillbaka längs bänken. Bålen följer handen. Stressad: blicken upp mot kön.
    const s = c.stress ?? 0, sweep = -Math.cos(TAU * u), w = 3 * TAU * u;
    return withYaw(P(STAND, {
      torso: { pitch: 0.2 }, head: { pitch: 0.35 - 0.3 * s * win(u, 0.4, 0.7, 0.08) },
      armR: A(0.85 + 0.1 * Math.sin(w), 0.16 + 0.1 * Math.cos(w), 0.7),
      armL: A(0.7, 0.08, 0.85)
    }), 0.3 * sweep, 0.2 * sweep);
  }
}));
