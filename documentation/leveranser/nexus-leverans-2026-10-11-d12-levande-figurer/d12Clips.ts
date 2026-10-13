// d12Clips.ts — utdrag ur figureClips.ts: avsnittet D12 (2026-10-11). Samma kod som i figureClips.ts, för att läsa för sig.
// Använder figureClips egna hjälpare (def, reg, P, A, win, bell, moodK, base, blendArm, standing).

// ===== D12 levande figurer (2026-10-11) ===============================
// Anders 2026-10-11 efter provspelet: ingen ska stå still, uttrycken ska vara svar på något, och två gäster ska inte göra
// samma gest exakt likadant. Här är tre saker:
//   1. Varianter (…B) av de vanliga gesterna. Samma stämning och samma plats i kartan, men en annan kropp: gestureMap.VARIANTS
//      väljer A eller B per gäst. Stående varianter för vagnen med standing() som i D11.
//   2. Svaren: lyssna, berätta något roligt, småskratta och vända sig mot den som skrattar (leendet som sprider sig).
//      Reglerna för när och hur fort ligger i gestureMap.REACTIONS.
//   3. Möten i rörelse: personalen nickar åt en gäst i förbifarten, och en gäst i kön tittar upp och nickar tillbaka.
// Temperamentet (lugn, livlig, reserverad) gör gesterna större eller mindre (figureLife.scalePose), och intensiteten
// (svag, tydlig, stark) väljer tempot. Livet i vila (blinkningar, blickar, huvudets små rörelser) ligger i figureLife.ts.

// ----- varianterna -----

reg(def({
  id: 'guest.waveStaffB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.0, handed: true, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.order', 'guest.pay', 'guest.listen'],
  pose: function (u, c) {
    // B: handen i huvudhöjd ut åt sidan, underarmen upp, och en liten vinkning från armbågen. A har armen rakt upp.
    const up = win(u, 0.1, 0.86, 0.12), wv = Math.sin(u * TAU * 3) * win(u, 0.22, 0.74, 0.06), b = base(c, true);
    return withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) + 0.04 * up, roll: 0.04 * up },
      armR: A(0.78 + 0.7 * up, 0.1 + 0.42 * up + 0.12 * wv, 0.95 + 0.85 * up)
    }), (c.yaw ?? 0) * 0.3 * up, (c.yaw ?? 0) * 0.85 * up);
  }
}));

reg(def({
  id: 'guest.waveWaiterB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.6, handed: true, mood: 'impatient',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.armsCrossed', 'guest.waveWaiter', 'guest.listen'],
  pose: function (u, c) {
    // B: armen rakt upp och handen som pumpar upp och ned (inte svep åt sidan), bålen vriden mot personalen, ingen resning.
    const k = moodK(c), up = win(u, 0.08, 0.9, 0.1), pump = Math.max(0, Math.sin(u * TAU * 4)) * win(u, 0.2, 0.82, 0.06), b = base(c, true);
    return withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) - 0.06 * up, roll: -0.05 * k * up },
      head: { pitch: 0.02 - 0.16 * up },
      armR: A(0.78 + (1.75 + 0.3 * (k - 0.75)) * up - 0.22 * k * pump, 0.08, 0.95 - 0.8 * up + 0.35 * pump),
      armL: A(0.78, 0.1, 0.95)
    }), (c.yaw ?? 0) * 0.5 * up, (c.yaw ?? 0) * 0.95 * up);
  }
}));

reg(def({
  id: 'guest.waveStandB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.0, handed: true, mood: 'content',
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'guest.walk', 'guest.listenStand'],
  pose: function (u, c) {
    // B stående: handen i axelhöjd, handflatan fram, vinkning från armbågen. Ett halvt steg mot den man vinkar till.
    const up = win(u, 0.1, 0.86, 0.14), wv = Math.sin(u * TAU * 3) * win(u, 0.24, 0.72, 0.06);
    return withYaw(P(STAND, { torso: { pitch: 0.06 * up }, head: { pitch: 0.0 }, armR: A(0.2 + 1.2 * up, 0.12 + 0.36 * up + 0.12 * wv, 0.2 + 1.6 * up), legL: { ...LEG_FRONT, swing: 0.14 * up } }), (c.yaw ?? 0) * 0.35 * up, (c.yaw ?? 0) * 0.85 * up);
  }
}));

reg(def({
  id: 'guest.laughB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, mood: 'delighted', handed: true,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.listen', 'guest.cheers', 'guest.leanTalk'],
  pose: function (u, c) {
    // B: framåt mot bordet i stället för bakåt, handen för munnen och axlarna som skakar. A kastar huvudet bakåt.
    const k = moodK(c), b = base(c, true), a = win(u, 0.06, 0.92, 0.14), sh = Math.sin(u * TAU * 7) * a;
    return withYaw(P(b, {
      lift: 0.01 * k * sh,
      torso: { pitch: (b.torso?.pitch ?? 0) + 0.26 * k * a + 0.03 * sh },
      head: { pitch: 0.06 + 0.22 * a, roll: 0.12 * a },
      armR: blendArm(b.armR ?? A(0.78, 0.1, 0.95), A(0.95, 0.16, 2.35), a),
      armL: A(0.78 + 0.1 * a, 0.12, 0.95)
    }), (c.yaw ?? 0) * 0.2 * a, (c.yaw ?? 0) * 0.5 * a);
  }
}));

reg(def({
  id: 'guest.leanTalkB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.4, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.laugh', 'guest.listen', 'guest.leanTalk'],
  pose: function (u, c) {
    // B: armbågarna på bordet och båda händerna uppe, underarmarna som rör sig om vartannat. Huvudet på sned mot den andra.
    const k = moodK(c), b = base(c, true), lean = win(u, 0.08, 0.92, 0.15), s = Math.sin(u * TAU * 3.5) * win(u, 0.18, 0.86, 0.08);
    return breathe(withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) + 0.2 * k * lean },
      head: { pitch: 0.04 - 0.12 * lean, roll: -0.12 * lean },
      armL: blendArm(b.armL ?? A(0, 0, 0), A(0.95 - 0.12 * s, 0.18, 2.1), lean),
      armR: blendArm(b.armR ?? A(0, 0, 0), A(0.95 + 0.12 * s, 0.18, 2.1), lean)
    }), (c.yaw ?? 0) * 0.4 * lean, (c.yaw ?? 0) * 0.85 * lean), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.nodApproveB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.2, mood: 'content', handed: true,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.listen', 'guest.leanTalk'],
  pose: function (u, c) {
    // B: en enda djup, långsam nick med handen mot bröstet. A har två nickar och en öppen hand.
    const k = moodK(c), b = base(c, true), nod = 0.42 * k * bell(u, 0.45, 0.12), hand = win(u, 0.1, 0.86, 0.14);
    return breathe(withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) + 0.1 * bell(u, 0.45, 0.14) }, head: { pitch: 0.04 + nod },
      armR: blendArm(b.armR ?? A(0.78, 0.1, 0.95), A(0.62, 0.02, 2.2), hand)
    }), (c.yaw ?? 0) * 0.25 * hand, (c.yaw ?? 0) * 0.85), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.checkWatchB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.8, mood: 'waiting',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.armsCrossed', 'guest.waveWaiter', 'guest.seekEye'],
  pose: function (u, c) {
    // B: lutar sig bakåt och tittar upp mot taket med en suck, sedan en kort blick på klockan med höger hand och ut i rummet.
    const k = moodK(c), b = base(c, true), sigh = win(u, 0.04, 0.42, 0.12), watch = win(u, 0.4, 0.66, 0.06), look = win(u, 0.64, 0.98, 0.1);
    return withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) - 0.12 * k * sigh + 0.04 * watch },
      head: { pitch: 0.06 - 0.36 * sigh + 0.4 * watch - 0.04 * look },
      armR: blendArm(A(0.78, 0.1, 0.95), A(0.6, -0.02, 1.95), watch)
    }), (c.yaw ?? 0) * 0.3 * look, (c.yaw ?? 0) * 0.85 * look);
  }
}));

reg(def({
  id: 'guest.armsCrossedB', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 4.4, mood: 'displeased',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.armsCrossedB', 'guest.armsCrossed', 'guest.checkWatch', 'guest.waveWaiter', 'guest.seatedIdle'],
  pose: function (u, c) {
    // B: lutad bakåt, vänster arm över bröstet och höger hand mot hakan. Skeptisk snarare än stängd. Huvudet bort en gång per varv.
    const k = moodK(c), b = base(c, true), away = bell(u, 0.55, 0.12), s = Math.sin(u * TAU);
    return withYaw(P(b, {
      torso: { pitch: 0.0 - 0.16 * k + 0.02 * s },
      head: { pitch: 0.08 - 0.04 * away, roll: 0.08 },
      armL: ARMS_X, armR: A(0.6, -0.12, 2.35)
    }), -(c.yaw ?? 0) * 0.12, -(c.yaw ?? 0) * 0.55 * away * k);
  }
}));

reg(def({
  id: 'guest.shrugB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 2.0, mood: 'waiting', handed: true,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.checkWatch', 'guest.listen'],
  pose: function (u, c) {
    // B: en axel och en hand. Höger handflata upp, axeln lyfts, huvudet på sned åt andra hållet och lite bakåt.
    const k = moodK(c), b = base(c, true), s = win(u, 0.12, 0.8, 0.16);
    return withYaw(P(b, {
      lift: 0.012 * k * s,
      torso: { pitch: (b.torso?.pitch ?? 0) - 0.08 * s, roll: 0.1 * k * s },
      head: { pitch: 0.02 - 0.1 * s, roll: -0.22 * k * s },
      armR: blendArm(b.armR ?? A(0.78, 0.1, 0.95), A(0.6, 0.55 * k, 1.5), s)
    }), (c.yaw ?? 0) * 0.3 * s, (c.yaw ?? 0) * 0.6 * s);
  }
}));

reg(def({
  id: 'guest.seekEyeB', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.2, mood: 'waiting',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.seekEye', 'guest.waveStaff', 'guest.waveWaiter'],
  pose: function (u, c) {
    // B: halvt upp i sätet och bålen vriden mot den hen söker, halsen sträckt. Händerna stilla som i A (D11-omtaget).
    const k = moodK(c), b = base(c, true), look = win(u, 0.04, 0.92, 0.16), up = win(u, 0.14, 0.88, 0.12);
    return breathe(withYaw(P(b, {
      lift: 0.035 * k * up,
      torso: { pitch: (b.torso?.pitch ?? 0) - 0.04 * up },
      head: { pitch: 0.04 - 0.2 * k * up }
    }), (c.yaw ?? 0) * 0.55 * look, (c.yaw ?? 0) * 0.9 * look), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.cheersB', group: 'guest', roles: ['guest'], loop: false, travel: false, handed: true, base: 2.8, mood: 'delighted',
  from: 'seated', to: 'seated', needs: 'table', holds: {}, ends: {},
  events: [{ u: 0.12, type: 'grab', hand: 'R', at: 'table' }, { u: 0.5, type: 'clink' }, { u: 0.88, type: 'release', hand: 'R', at: 'table' }],
  next: ['guest.seatedIdle', 'guest.laugh', 'guest.listen'],
  pose: function (u, c) {
    // B: skålen mot grannen, glaset i bröstets höjd och en nick. A lyfter glaset över huvudet mot bordets mitt.
    const b = base(c, true), toward = (c.yaw ?? 0) * win(u, 0.15, 0.85, 0.12), nod = 0.16 * bell(u, 0.52, 0.06);
    const out = P(b, { torso: { pitch: 0.12 }, head: { pitch: 0.06 + nod }, armR: A(1.2, 0.12, 0.6), armL: A(0.78, 0.1, 0.95) });
    return withYaw(keys(u, [[0, b], [0.14, P(b, { armR: A(0.85, 0.1, 0.9) })], [0.4, out], [0.62, out], [0.86, P(b, { armR: A(0.8, 0.1, 0.92) })], [1, b]]), toward * 0.45, toward * 0.8);
  }
}));

// ----- svaren -----

reg(def({
  id: 'guest.listen', group: 'guest', roles: ['guest'], loop: true, travel: false, base: 3.2,
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.listen', 'guest.seatedIdle', 'guest.smileTurn', 'guest.chuckle', 'guest.laugh', 'guest.leanTalk', 'guest.nodApprove'],
  pose: function (u, c) {
    // Lyssnar på den som pratar (ctx.yaw mot hen): huvudet vänt, lite framåt, en liten nick per varv. Händerna vilar.
    const nod = 0.1 * bell(u, 0.4, 0.07) + 0.06 * bell(u, 0.82, 0.06), b = base(c, true);
    return breathe(withYaw(P(b, { torso: { pitch: (b.torso?.pitch ?? 0) + 0.06 }, head: { pitch: 0.08 + nod, roll: 0.06 * Math.sign(c.yaw ?? 1) } }), (c.yaw ?? 0) * 0.3, (c.yaw ?? 0) * 0.9), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.tellJoke', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 3.8, mood: 'content',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.laugh', 'guest.chuckle', 'guest.listen'],
  pose: function (u, c) {
    // Berättar något roligt: fram mot de andra med händer som ritar, och vid poängen (u 0,64, REACTIONS.punchU) tillbaka i
    // stolen med öppna handflator. Det är poängen de andra svarar på.
    const k = moodK(c), b = base(c, true), lean = win(u, 0.06, 0.62, 0.12), back = win(u, 0.6, 0.96, 0.08), talk = Math.sin(u * TAU * 5) * win(u, 0.12, 0.58, 0.06);
    return breathe(withYaw(P(b, {
      torso: { pitch: (b.torso?.pitch ?? 0) + 0.28 * k * lean - 0.14 * k * back },
      head: { pitch: 0.04 - 0.14 * lean - 0.12 * back + 0.05 * talk },
      armL: blendArm(blendArm(b.armL ?? A(0, 0, 0), A(0.9, 0.14, 1.3), lean), A(0.6, 0.45, 1.5), back),
      armR: blendArm(blendArm(b.armR ?? A(0, 0, 0), A(1.0 + 0.16 * talk, 0.18, 1.3 - 0.2 * talk), lean), A(0.6, 0.45, 1.5), back)
    }), (c.yaw ?? 0) * 0.4 * (lean + back * 0.5), (c.yaw ?? 0) * 0.85), c.t ?? 0);
  }
}));

reg(def({
  id: 'guest.chuckle', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.8, mood: 'delighted',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.listen', 'guest.laugh', 'guest.leanTalk'],
  pose: function (u, c) {
    // Småskrattet: axlarna som studsar tre gånger, huvudet lite bakåt och mot den som sa det. Mindre än guest.laugh.
    const b = base(c, true), a = win(u, 0.06, 0.9, 0.14), bo = Math.max(0, Math.sin(u * TAU * 3)) * a;
    return withYaw(P(b, { lift: 0.012 * bo, torso: { pitch: (b.torso?.pitch ?? 0) - 0.06 * a + 0.03 * bo }, head: { pitch: 0.04 - 0.16 * a } }), (c.yaw ?? 0) * 0.3, (c.yaw ?? 0) * 0.85);
  }
}));

reg(def({
  id: 'guest.smileTurn', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6, mood: 'delighted',
  from: 'seated', to: 'seated', needs: 'chair', holds: {}, ends: {}, events: [],
  next: ['guest.seatedIdle', 'guest.listen', 'guest.chuckle', 'guest.laugh'],
  pose: function (u, c) {
    // Leendet som sprider sig: vänder sig mot den som skrattar, hakan lite upp och ett litet lyft i bålen. Ansiktet gör resten.
    const b = base(c, true), turn = win(u, 0.04, 1.2, 0.2), up = bell(u, 0.5, 0.18);
    return breathe(withYaw(P(b, { lift: 0.008 * up, torso: { pitch: (b.torso?.pitch ?? 0) - 0.04 * up }, head: { pitch: 0.06 - 0.1 * up, roll: 0.05 * Math.sign(c.yaw ?? 1) * turn } }), (c.yaw ?? 0) * 0.35 * turn, (c.yaw ?? 0) * 0.9 * turn), c.t ?? 0);
  }
}));

// ----- möten i rörelse -----

reg(def({
  id: 'staff.walkNod', group: 'staff', roles: STAFF, loop: true, travel: true, base: 1,
  from: 'walk', to: 'walk', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.walk', 'staff.walkNod', 'staff.idle', 'staff.listenTilt'],
  pose: function (u, c) {
    // Går förbi en gäst och nickar åt hen (ctx.yaw mot gästen): huvudet vänds, en nick per cykel, armarna svänger som vanligt.
    const ph = c.phase ?? u, p = walking(STAND, ph, c.stride ?? 1, 'both'), nod = 0.16 * Math.max(0, Math.sin(ph * Math.PI)) ** 4;
    return withYaw({ ...p, head: { ...(p.head ?? {}), pitch: 0.06 + nod } }, (c.yaw ?? 0) * 0.15, (c.yaw ?? 0) * 0.8);
  }
}));

reg(def({
  id: 'guest.glanceNodStand', group: 'guest', roles: ['guest'], loop: false, travel: false, base: 1.6,
  from: 'stand', to: 'stand', needs: 'floor', holds: {}, ends: {}, events: [],
  next: ['staff.idle', 'guest.checkWatchStand', 'guest.listenStand', 'guest.walk'],
  pose: function (u, c) {
    // I kön: tittar upp när någon går förbi (ctx.yaw), en nick tillbaka, och åter framåt.
    const look = win(u, 0.04, 0.92, 0.18), nod = 0.14 * bell(u, 0.5, 0.08);
    return withYaw(P(STAND, { head: { pitch: 0.04 - 0.06 * look + nod } }), (c.yaw ?? 0) * 0.2 * look, (c.yaw ?? 0) * 0.85 * look);
  }
}));

standing('guest.laughB', 'guest.laughStandB');
standing('guest.leanTalkB', 'guest.leanTalkStandB');
standing('guest.shrugB', 'guest.shrugStandB');
standing('guest.checkWatchB', 'guest.checkWatchStandB');
standing('guest.armsCrossedB', 'guest.armsCrossedStandB');
standing('guest.nodApproveB', 'guest.nodApproveStandB');
standing('guest.seekEyeB', 'guest.seekEyeStandB');
standing('guest.waveWaiterB', 'guest.waveWaiterStandB');
standing('guest.listen', 'guest.listenStand', { next: ['guest.listenStand', 'staff.idle', 'guest.chuckleStand', 'guest.laughStand', 'guest.walk'] });
standing('guest.tellJoke', 'guest.tellJokeStand');
standing('guest.chuckle', 'guest.chuckleStand');
standing('guest.smileTurn', 'guest.smileTurnStand');
CLIPS['guest.listenStand'].loop = true;
